/* Order rules (System Design · Decisions Log)
   D6  Placing an order = check stock + save order + deduct stock in ONE transaction (all or nothing)
   D5  Cancel only before Shipping (Placed or Packing); cancelling returns the stock
       Staff move the status forward one step at a time */
const { prisma } = require("../db");
const { ApiError, bad, notFound, conflict } = require("../lib/errors");
const { nextId, logMovement } = require("../lib/ids");
const check = require("../lib/check");
const fmt = require("../lib/format");

const SHIPPING_FEE = 150;
const FREE_SHIPPING_FROM = 30000;
const TX = { timeout: 20000, maxWait: 10000 };

/* [{sku, qty}] from the browser -> cleaned list; the same SKU twice is merged */
function cleanLines(lines, { allowEmpty = false } = {}) {
  if (!Array.isArray(lines)) throw bad("lines must be a list of { sku, qty }.");
  if (!lines.length && !allowEmpty) throw new ApiError(400, "EMPTY_CART", "Your cart is empty.");
  if (lines.length > 50) throw bad("Too many different items in one order (50 max).");
  const merged = new Map();
  for (const l of lines) {
    const sku = String((l && l.sku) || "").trim();
    if (!sku) throw bad("Every line needs a sku.");
    const qty = check.int(l.qty, "Quantity", { min: 1, max: 99 });
    merged.set(sku, (merged.get(sku) || 0) + qty);
  }
  return [...merged].map(([sku, qty]) => ({ sku, qty }));
}

const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

/* prices always come from the database, never from the browser */
async function quote(rawLines, db = prisma) {
  const lines = cleanLines(rawLines, { allowEmpty: true });
  const products = await db.product.findMany({ where: { sku: { in: lines.map((l) => l.sku) } } });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const items = lines.filter((l) => bySku.has(l.sku)).map((l) => {
    const p = bySku.get(l.sku);
    return { sku: p.sku, name: p.name, price: p.price, qty: l.qty, stock: p.stock, art: p.art, condition: p.condition };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = shippingFor(subtotal);
  return { items, subtotal, shipping, total: subtotal + shipping };
}

async function placeOrder(customerId, body) {
  const lines = cleanLines(body.lines);
  const paymentMethod = check.oneOf(body.paymentMethod, "Payment method", ["COD", "GCASH_SIM"]);
  const address = check.text(body.address, "Delivery address", { min: 10, max: 300 });
  let paymentRef = null;
  if (paymentMethod === "GCASH_SIM") {
    paymentRef = String(body.paymentRef || "");
    if (!/^SIM-GC-\d{4,}$/.test(paymentRef)) throw new ApiError(402, "PAYMENT_REQUIRED", "GCash (SIMULATED) payment was not completed.");
    if (await prisma.order.findFirst({ where: { paymentRef } })) throw new ApiError(402, "PAYMENT_REQUIRED", "That GCash (SIMULATED) payment was already used. Please pay again.");
  }

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { sku: { in: lines.map((l) => l.sku) } } });
    const bySku = new Map(products.map((p) => [p.sku, p]));
    for (const l of lines) if (!bySku.has(l.sku)) throw notFound(`Product ${l.sku} not found.`);

    // 1 + 3. check and deduct in the same statement: only succeeds if enough is on the shelf.
    //        If any line fails, the error rolls back every deduction before it (all or nothing).
    for (const l of lines) {
      const r = await tx.product.updateMany({ where: { sku: l.sku, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
      if (r.count === 0) {
        const p = await tx.product.findUnique({ where: { sku: l.sku } });
        throw conflict("OUT_OF_STOCK", `Only ${p.stock} left of ${p.name}. Please change the quantity.`, { sku: p.sku, available: p.stock });
      }
    }

    // 2. save the order with the prices and names from the database
    const subtotal = lines.reduce((s, l) => s + bySku.get(l.sku).price * l.qty, 0);
    const shipping = shippingFor(subtotal);
    const id = await nextId(tx, "ORD");
    await tx.order.create({
      data: {
        id, customerId, shipping, total: subtotal + shipping, paymentMethod, paymentRef, status: "PLACED", address,
        items: { create: lines.map((l) => ({ sku: l.sku, name: bySku.get(l.sku).name, qty: l.qty, price: bySku.get(l.sku).price })) },
        history: { create: [{ status: "PLACED", by: customerId }] }
      }
    });
    for (const l of lines) await logMovement(tx, l.sku, -l.qty, "sale", id);
    return { id, total: subtotal + shipping };
  }, TX);
}

async function getOrder(id) {
  const o = await prisma.order.findUnique({ where: { id }, include: fmt.ORDER_INCLUDE });
  if (!o) throw notFound("Order not found.");
  return o;
}

/* who = customer id or staff username */
async function cancelOrder(id, who, { asStaff = false } = {}) {
  await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!o) throw notFound("Order not found.");
    if (!asStaff && o.customerId !== who) throw new ApiError(403, "FORBIDDEN", "This order belongs to another account.");
    // the status check is part of the update, so a cancel and a "ship" at the same moment can't both win
    const r = await tx.order.updateMany({ where: { id, status: { in: ["PLACED", "PACKING"] } }, data: { status: "CANCELLED" } });
    if (r.count === 0) {
      throw conflict("TOO_LATE", o.status === "CANCELLED" ? "This order is already cancelled." : "This order has already shipped, so it can't be cancelled.");
    }
    await tx.orderHistory.create({ data: { orderId: id, status: "CANCELLED", by: who } });
    for (const it of o.items) {
      await tx.product.update({ where: { sku: it.sku }, data: { stock: { increment: it.qty } } });
      await logMovement(tx, it.sku, it.qty, "cancel", id);
    }
  }, TX);
  return fmt.order(await getOrder(id));
}

async function setStatus(id, label, staff) {
  const to = fmt.ORDER_CODE[label];
  if (!to) throw bad(`Unknown status "${label}".`);
  const o = await getOrder(id);
  const from = fmt.ORDER_STEPS.indexOf(o.status);
  if (from < 0) throw conflict("CLOSED", `Order is ${fmt.ORDER_LABEL[o.status]}; it can't change.`);
  const next = fmt.ORDER_STEPS[from + 1];
  if (to !== next) throw conflict("BAD_STEP", `Next step for ${o.id} is ${next ? fmt.ORDER_LABEL[next] : "none"}.`);
  await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id, status: o.status }, data: { status: to } });
    if (r.count === 0) throw conflict("BAD_STEP", "Someone else changed this order just now. Refresh and try again.");
    await tx.orderHistory.create({ data: { orderId: id, status: to, by: staff } });
  }, TX);
  return fmt.order(await getOrder(id));
}

module.exports = { SHIPPING_FEE, FREE_SHIPPING_FROM, quote, placeOrder, getOrder, cancelOrder, setStatus };
