/* Open to everyone: browse products, price a cart, read settings, get a trade-in estimate. */
const express = require("express");
const { prisma } = require("../db");
const { route, notFound } = require("../lib/errors");
const fmt = require("../lib/format");
const orders = require("../services/orders");
const tradeIns = require("../services/tradeIns");

const r = express.Router();

/* GET /api/products?category=part&q=ram */
r.get("/products", route(async (req, res) => {
  const where = { archived: false }; // hidden products are not sold any more
  if (["part", "accessory", "prebuilt"].includes(req.query.category)) where.category = req.query.category;
  let list = await prisma.product.findMany({ where, orderBy: { createdAt: "asc" } });
  const q = String(req.query.q || "").trim().toLowerCase();
  if (q) list = list.filter((p) => `${p.name} ${p.type} ${p.sku}`.toLowerCase().includes(q));
  res.json(list.map(fmt.product));
}));

/* GET /api/products/:sku */
r.get("/products/:sku", route(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { sku: req.params.sku } });
  if (!p || p.archived) throw notFound(`Product ${req.params.sku} not found`);
  res.json(fmt.product(p));
}));

/* GET /api/products/:sku/image  -> the uploaded photo (the URL has ?v=, so it can be cached for a long time) */
r.get("/products/:sku/image", route(async (req, res) => {
  const img = await prisma.productImage.findUnique({ where: { sku: req.params.sku } });
  if (!img) throw notFound("This product has no photo.");
  res.set({ "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
  res.send(Buffer.from(img.data));
}));

/* POST /api/quote  { lines: [{ sku, qty }] } -> prices from the database, shipping, total */
r.post("/quote", route(async (req, res) => res.json(await orders.quote(req.body.lines || []))));

/* GET /api/settings  (shipping rules + whether the SIMULATED supplier is online) */
r.get("/settings", route(async (req, res) => {
  const rows = await prisma.setting.findMany();
  res.json({ ...Object.fromEntries(rows.map((s) => [s.key, s.value])), shippingFee: orders.SHIPPING_FEE, freeShippingFrom: orders.FREE_SHIPPING_FROM });
}));

/* GET /api/trade-ins/suggest?type=Graphics card (GPU)&condition=Good */
r.get("/trade-ins/suggest", route(async (req, res) => res.json(await tradeIns.suggestOffer(req.query.type, req.query.condition))));

module.exports = r;
