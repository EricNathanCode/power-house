/* Customer side of the store: sign up / log in, my account, orders, GCash (SIMULATED), Sell to Us.
   Everything after login only ever touches the logged-in customer's own data. */
const express = require("express");
const bcrypt = require("bcryptjs");
const { prisma } = require("../db");
const { ApiError, route, conflict } = require("../lib/errors");
const { requireCustomer, regenerate } = require("../lib/auth");
const { nextId } = require("../lib/ids");
const check = require("../lib/check");
const fmt = require("../lib/format");
const orders = require("../services/orders");
const tradeIns = require("../services/tradeIns");

const r = express.Router();
// compared against when the email doesn't exist, so a wrong email takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", 10);

/* ---------- sign up / log in ---------- */

/* POST /api/auth/signup  { name, email, password, phone } */
r.post("/auth/signup", route(async (req, res) => {
  const name = check.text(req.body.name, "Name", { min: 2, max: 80 });
  const email = check.email(req.body.email);
  const password = check.password(req.body.password);
  const phone = check.phone(req.body.phone);
  if (await prisma.customer.findUnique({ where: { email } })) throw conflict("EMAIL_TAKEN", "That email already has an account. Log in instead.");
  const passwordHash = await bcrypt.hash(password, 10);
  let id;
  try {
    id = await prisma.$transaction(async (tx) => {
      const newId = await nextId(tx, "CUST");
      await tx.customer.create({ data: { id: newId, name, email, passwordHash, phone } });
      return newId;
    });
  } catch (e) {
    if (e.code === "P2002") throw conflict("EMAIL_TAKEN", "That email already has an account. Log in instead.");
    throw e;
  }
  req.session.customerId = id;
  await regenerate(req);
  res.status(201).json({ id, name });
}));

/* POST /api/auth/login  { email, password } */
r.post("/auth/login", route(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const c = email ? await prisma.customer.findUnique({ where: { email } }) : null;
  const ok = await bcrypt.compare(String(req.body.password || ""), c ? c.passwordHash : DUMMY_HASH);
  if (!c || !ok) throw new ApiError(401, "BAD_LOGIN", "Wrong email or password. Try again.");
  req.session.customerId = c.id;
  await regenerate(req);
  res.json({ id: c.id, name: c.name });
}));

/* POST /api/auth/logout */
r.post("/auth/logout", (req, res) => { delete req.session.customerId; res.json({ ok: true }); });

/* ---------- my account ---------- */

/* GET /api/me  -> the customer, or null when logged out */
r.get("/me", route(async (req, res) => {
  if (!req.session.customerId) return res.json(null);
  const c = await prisma.customer.findUnique({ where: { id: req.session.customerId } });
  if (!c) { delete req.session.customerId; return res.json(null); }
  res.json(fmt.customer(c));
}));

/* PUT /api/me  { name, email, phone } */
r.put("/me", requireCustomer, route(async (req, res) => {
  const id = req.session.customerId;
  const data = { name: check.text(req.body.name, "Name", { min: 2, max: 80 }), email: check.email(req.body.email), phone: check.phone(req.body.phone) };
  const other = await prisma.customer.findUnique({ where: { email: data.email } });
  if (other && other.id !== id) throw conflict("EMAIL_TAKEN", "Another account already uses that email.");
  await prisma.customer.update({ where: { id }, data });
  res.json(true);
}));

/* PUT /api/me/address  { street, city, zip } */
r.put("/me/address", requireCustomer, route(async (req, res) => {
  await prisma.customer.update({
    where: { id: req.session.customerId },
    data: { street: check.text(req.body.street, "House no. and street", { min: 4, max: 120 }), city: check.text(req.body.city, "City", { min: 3, max: 60 }), zip: check.zip(req.body.zip) }
  });
  res.json(true);
}));

/* PUT /api/me/password  { current, next } */
r.put("/me/password", requireCustomer, route(async (req, res) => {
  const c = await prisma.customer.findUnique({ where: { id: req.session.customerId } });
  if (!(await bcrypt.compare(String(req.body.current || ""), c.passwordHash))) throw new ApiError(400, "BAD_PASSWORD", "Your current password is wrong.");
  const next = check.password(req.body.next, "New password");
  await prisma.customer.update({ where: { id: c.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  res.json(true);
}));

/* ---------- orders ---------- */

/* POST /api/payments/gcash-sim  { amount, outcome: "pay" | "fail" }   SIMULATED: no real money, no real GCash */
r.post("/payments/gcash-sim", requireCustomer, route(async (req, res) => {
  const amount = check.int(req.body.amount, "Amount", { min: 1, max: 10_000_000 });
  if (req.body.outcome !== "pay") throw new ApiError(402, "PAYMENT_FAILED", "GCash payment failed (simulated). Your order was not placed and no stock was taken.");
  const ref = "SIM-" + (await prisma.$transaction((tx) => nextId(tx, "GC")));
  res.json({ ref, amount, simulated: true });
}));

/* POST /api/orders  { lines: [{ sku, qty }], paymentMethod: "COD" | "GCASH_SIM", paymentRef, address } */
r.post("/orders", requireCustomer, route(async (req, res) => {
  res.status(201).json(await orders.placeOrder(req.session.customerId, req.body));
}));

/* GET /api/me/orders  (newest first) */
r.get("/me/orders", requireCustomer, route(async (req, res) => {
  const list = await prisma.order.findMany({ where: { customerId: req.session.customerId }, include: fmt.ORDER_INCLUDE, orderBy: { createdAt: "desc" } });
  res.json(list.map(fmt.order));
}));

/* GET /api/orders/:id  (your own order; staff can see any) */
r.get("/orders/:id", route(async (req, res) => {
  if (!req.session.customerId && !req.session.staff) throw new ApiError(401, "LOGIN_REQUIRED", "Please log in first.");
  const o = await orders.getOrder(req.params.id);
  if (o.customerId !== req.session.customerId && !req.session.staff) throw new ApiError(403, "FORBIDDEN", "This order belongs to another account.");
  res.json(fmt.order(o));
}));

/* PUT /api/orders/:id/cancel  (only before Shipping; stock goes back) */
r.put("/orders/:id/cancel", requireCustomer, route(async (req, res) => {
  res.json(await orders.cancelOrder(req.params.id, req.session.customerId));
}));

/* ---------- Sell to Us ---------- */

/* POST /api/trade-ins  { category, type, brand, model, condition, askingPrice, photos } */
r.post("/trade-ins", requireCustomer, route(async (req, res) => res.status(201).json(await tradeIns.submit(req.session.customerId, req.body))));

/* GET /api/me/trade-ins  (newest first) */
r.get("/me/trade-ins", requireCustomer, route(async (req, res) => {
  const list = await prisma.tradeIn.findMany({ where: { customerId: req.session.customerId }, include: fmt.TRADE_INCLUDE, orderBy: { createdAt: "desc" } });
  res.json(list.map(fmt.tradeIn));
}));

/* PUT /api/trade-ins/:id/answer  { accept: true | false } */
r.put("/trade-ins/:id/answer", requireCustomer, route(async (req, res) => {
  if (typeof req.body.accept !== "boolean") throw new ApiError(400, "BAD_INPUT", "accept must be true or false.");
  res.json(await tradeIns.answer(req.session.customerId, req.params.id, req.body.accept));
}));

module.exports = r;
