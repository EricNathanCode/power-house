/* Staff Portal API. Every route except login needs a staff login (D9): hiding buttons is not enough.
   Orders · Inventory · Low stock · Supplier reorders (SIMULATED supplier) · Trade-ins · Stock log */
const express = require("express");
const bcrypt = require("bcryptjs");
const { prisma } = require("../db");
const { ApiError, route, notFound, conflict } = require("../lib/errors");
const { requireStaff, regenerate } = require("../lib/auth");
const { nextId, logMovement } = require("../lib/ids");
const check = require("../lib/check");
const fmt = require("../lib/format");
const orders = require("../services/orders");
const tradeIns = require("../services/tradeIns");

const r = express.Router();
const TX = { timeout: 20000, maxWait: 10000 };
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", 10);

/* ---------- login ---------- */

/* POST /api/staff/login  { username, password } */
r.post("/login", route(async (req, res) => {
  const username = String(req.body.username || "").trim();
  const s = username ? await prisma.staff.findUnique({ where: { username } }) : null;
  const ok = await bcrypt.compare(String(req.body.password || ""), s ? s.passwordHash : DUMMY_HASH);
  if (!s || !ok) throw new ApiError(401, "BAD_LOGIN", "Wrong username or password.");
  req.session.staff = s.username;
  await regenerate(req);
  res.json({ username: s.username });
}));

r.post("/logout", (req, res) => { delete req.session.staff; res.json({ ok: true }); });

/* GET /api/staff/me -> { username } or null */
r.get("/me", (req, res) => res.json(req.session.staff ? { username: req.session.staff } : null));

r.use(requireStaff); // ---- everything below needs a staff login ----

/* ---------- orders ---------- */

/* GET /api/staff/orders?customerId=CUST-001  (newest first) */
r.get("/orders", route(async (req, res) => {
  const where = req.query.customerId ? { customerId: String(req.query.customerId) } : {};
  const list = await prisma.order.findMany({ where, include: fmt.ORDER_INCLUDE, orderBy: { createdAt: "desc" } });
  res.json(list.map(fmt.order));
}));

/* PUT /api/staff/orders/:id/status  { status: "Packing" }  (forward one step at a time) */
r.put("/orders/:id/status", route(async (req, res) => res.json(await orders.setStatus(req.params.id, req.body.status, req.session.staff))));

/* PUT /api/staff/orders/:id/cancel  (only before Shipping; stock goes back) */
r.put("/orders/:id/cancel", route(async (req, res) => res.json(await orders.cancelOrder(req.params.id, req.session.staff, { asStaff: true }))));

/* ---------- inventory ---------- */

/* GET /api/staff/products  (with target stock + low flag) */
r.get("/products", route(async (req, res) => {
  const list = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  res.json(list.map((p) => ({ ...fmt.product(p), targetStock: fmt.targetStock(p), low: fmt.isLow(p) })));
}));

/* POST /api/staff/products  { sku, name, category, type, price, lowStockLevel, stock } */
r.post("/products", route(async (req, res) => {
  const b = req.body;
  const data = {
    sku: check.sku(b.sku), name: check.text(b.name, "Name", { min: 2, max: 120 }),
    category: check.oneOf(b.category, "Category", ["part", "accessory", "prebuilt"]), type: check.text(b.type, "Type", { min: 2, max: 60 }),
    price: check.int(b.price, "Price", { min: 1, max: 10_000_000 }), lowStockLevel: check.int(b.lowStockLevel ?? 0, "Low-stock level", { min: 0, max: 100_000 }),
    stock: check.int(b.stock ?? 0, "Starting stock", { min: 0, max: 100_000 }), condition: "new", art: "box", specs: {}
  };
  if (await prisma.product.findUnique({ where: { sku: data.sku } })) throw conflict("SKU_TAKEN", "That SKU already exists.");
  await prisma.$transaction(async (tx) => {
    await tx.product.create({ data });
    if (data.stock > 0) await logMovement(tx, data.sku, data.stock, "restock", "new product");
  }, TX);
  res.status(201).json(true);
}));

/* PUT /api/staff/products/:sku  { name, type, price, lowStockLevel }  (stock only changes through restock, orders, deliveries) */
r.put("/products/:sku", route(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { sku: req.params.sku } });
  if (!p) throw notFound(`Product ${req.params.sku} not found`);
  const b = req.body, data = {};
  if (b.name !== undefined) data.name = check.text(b.name, "Name", { min: 2, max: 120 });
  if (b.type !== undefined) data.type = check.text(b.type, "Type", { min: 2, max: 60 });
  if (b.price !== undefined) data.price = check.int(b.price, "Price", { min: 1, max: 10_000_000 });
  if (b.lowStockLevel !== undefined) data.lowStockLevel = check.int(b.lowStockLevel, "Low-stock level", { min: 0, max: 100_000 });
  await prisma.product.update({ where: { sku: p.sku }, data });
  res.json(true);
}));

/* POST /api/staff/products/:sku/restock  { qty }  (count fix or local purchase) */
r.post("/products/:sku/restock", route(async (req, res) => {
  const qty = check.int(req.body.qty, "Quantity", { min: 1, max: 100_000 });
  await prisma.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { sku: req.params.sku } });
    if (!p) throw notFound(`Product ${req.params.sku} not found`);
    await tx.product.update({ where: { sku: p.sku }, data: { stock: { increment: qty } } });
    await logMovement(tx, p.sku, qty, "restock", "manual");
  }, TX);
  res.json(true);
}));

/* GET /api/staff/low-stock  (D7 own level per product, D10 suggested reorder qty) */
r.get("/low-stock", route(async (req, res) => {
  const [list, open] = await Promise.all([
    prisma.product.findMany({ include: { supplierProduct: true }, orderBy: { createdAt: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "DELIVERED" } }, orderBy: { poNumber: "asc" } })
  ]);
  res.json(list.filter(fmt.isLow).map((p) => {
    const sup = p.supplierProduct;
    const po = open.find((x) => x.sku === p.sku);
    return {
      ...fmt.product(p), targetStock: fmt.targetStock(p),
      supplier: sup ? { supplierSku: sup.supplierSku, sku: sup.sku, unitPrice: sup.unitPrice, minOrderQty: sup.minOrderQty } : null,
      suggestedQty: sup ? Math.max(sup.minOrderQty, fmt.targetStock(p) - p.stock) : null,
      openPo: po ? po.poNumber : null
    };
  }));
}));

/* GET /api/staff/stock-movements  (newest first) */
r.get("/stock-movements", route(async (req, res) => {
  const list = await prisma.stockMovement.findMany({ orderBy: [{ at: "desc" }, { id: "desc" }], take: 500 });
  res.json(list.map(fmt.movement));
}));

/* ---------- supplier reorders (the supplier is SIMULATED / fictional) ---------- */

async function supplierOnline() {
  const s = await prisma.setting.findUnique({ where: { key: "supplierOnline" } });
  return !s || s.value !== false;
}

/* GET /api/staff/purchase-orders  (newest first) */
r.get("/purchase-orders", route(async (req, res) => {
  const list = await prisma.purchaseOrder.findMany({ orderBy: { poNumber: "desc" } });
  res.json(list.map(fmt.purchaseOrder));
}));

/* POST /api/staff/purchase-orders  { sku, qty }  -> sent to the SIMULATED supplier */
r.post("/purchase-orders", route(async (req, res) => {
  if (!(await supplierOnline())) throw new ApiError(503, "SUPPLIER_DOWN", "Supplier unavailable (simulated). Try again later.");
  const sup = await prisma.supplierProduct.findUnique({ where: { sku: String(req.body.sku || "") } });
  if (!sup) throw new ApiError(400, "NO_SUPPLIER", "The supplier doesn't sell this item.");
  if (!Number.isInteger(req.body.qty) || req.body.qty < sup.minOrderQty) throw new ApiError(400, "BELOW_MIN", `The supplier minimum is ${sup.minOrderQty}.`);
  const qty = check.int(req.body.qty, "Quantity", { min: sup.minOrderQty, max: 100_000 });
  const poNumber = await prisma.$transaction(async (tx) => {
    const id = await nextId(tx, "PO");
    await tx.purchaseOrder.create({ data: { poNumber: id, sku: sup.sku, supplierSku: sup.supplierSku, qty, unitPrice: sup.unitPrice, status: "CONFIRMED", approvedBy: req.session.staff } });
    return id;
  }, TX);
  res.status(201).json({ poNumber });
}));

/* PUT /api/staff/purchase-orders/:po/ship  (SIMULATED supplier step) */
r.put("/purchase-orders/:po/ship", route(async (req, res) => {
  const u = await prisma.purchaseOrder.updateMany({ where: { poNumber: req.params.po, status: "CONFIRMED" }, data: { status: "SHIPPED", shippedAt: new Date() } });
  if (u.count === 0) throw conflict("BAD_STEP", "Only confirmed orders can be marked shipped.");
  res.json(true);
}));

/* PUT /api/staff/purchase-orders/:po/receive  -> stock goes up */
r.put("/purchase-orders/:po/receive", route(async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { poNumber: req.params.po } });
    if (!po) throw notFound("Purchase order not found.");
    const u = await tx.purchaseOrder.updateMany({ where: { poNumber: po.poNumber, status: { not: "DELIVERED" } }, data: { status: "DELIVERED", deliveredAt: new Date() } });
    if (u.count === 0) throw conflict("BAD_STEP", "This delivery was already received.");
    await tx.product.update({ where: { sku: po.sku }, data: { stock: { increment: po.qty } } });
    await logMovement(tx, po.sku, po.qty, "supplier", po.poNumber);
  }, TX);
  res.json(true);
}));

/* PUT /api/staff/settings/supplier  { online: true | false }  (demo switch for the SIMULATED supplier) */
r.put("/settings/supplier", route(async (req, res) => {
  const online = !!req.body.online;
  await prisma.setting.upsert({ where: { key: "supplierOnline" }, update: { value: online }, create: { key: "supplierOnline", value: online } });
  res.json(true);
}));

/* ---------- trade-ins ---------- */

r.get("/trade-ins", route(async (req, res) => {
  const list = await prisma.tradeIn.findMany({ include: fmt.TRADE_INCLUDE, orderBy: { createdAt: "desc" } });
  res.json(list.map(fmt.tradeIn));
}));
r.put("/trade-ins/:id/offer", route(async (req, res) => res.json(await tradeIns.sendOffer(req.params.id, req.body.amount))));
r.put("/trade-ins/:id/reject", route(async (req, res) => res.json(await tradeIns.reject(req.params.id, req.body.note))));
r.put("/trade-ins/:id/receive", route(async (req, res) => res.json(await tradeIns.markReceived(req.params.id))));
r.put("/trade-ins/:id/to-stock", route(async (req, res) => res.json(await tradeIns.addToStock(req.params.id, req.body.price))));

module.exports = r;
