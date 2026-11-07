/* Database rows -> the JSON the website already understands (same shapes as the mock in shared/js/api.js).
   The database uses fixed codes (OUT_FOR_DELIVERY); people see labels ("Out for Delivery"). */

const ORDER_LABEL = { PLACED: "Placed", PACKING: "Packing", SHIPPING: "Shipping", OUT_FOR_DELIVERY: "Out for Delivery", RECEIVED: "Received", CANCELLED: "Cancelled" };
const ORDER_CODE = Object.fromEntries(Object.entries(ORDER_LABEL).map(([k, v]) => [v, k]));
const ORDER_STEPS = ["PLACED", "PACKING", "SHIPPING", "OUT_FOR_DELIVERY", "RECEIVED"]; // forward one step at a time

const TRADE_LABEL = { UNDER_REVIEW: "Under review", OFFER_SENT: "Offer sent", ACCEPTED: "Accepted", DECLINED: "Declined", REJECTED: "Rejected", RECEIVED: "Received", IN_STOCK: "In stock" };
const CONDITION_LABEL = { LIKE_NEW: "Like new", GOOD: "Good", FAIR: "Fair" };
const CONDITION_CODE = Object.fromEntries(Object.entries(CONDITION_LABEL).map(([k, v]) => [v, k]));
const OFFER_PCT = { LIKE_NEW: 0.6, GOOD: 0.45, FAIR: 0.3 }; // D11
const TRADE_CATEGORY_LABEL = { part: "PC Parts", accessory: "Accessories", prebuilt: "Prebuilt PC" };
const TRADE_CATEGORY_CODE = Object.fromEntries(Object.entries(TRADE_CATEGORY_LABEL).map(([k, v]) => [v, k]));

/* times go out as Philippine time with the offset, e.g. "2026-11-06T08:30:00+08:00" */
function phTime(d) {
  if (!d) return null;
  return new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 19) + "+08:00";
}

const targetStock = (p) => Math.max(p.lowStockLevel * 3, p.lowStockLevel + 1);
const isLow = (p) => p.lowStockLevel > 0 && p.stock <= p.lowStockLevel;

const product = (p) => ({
  sku: p.sku, name: p.name, category: p.category, type: p.type, price: p.price, stock: p.stock,
  lowStockLevel: p.lowStockLevel, condition: p.condition, art: p.art, specs: p.specs
});

const customer = (c) => ({
  id: c.id, name: c.name, email: c.email, phone: c.phone,
  address: c.street ? { street: c.street, city: c.city, zip: c.zip } : null,
  since: phTime(c.createdAt).slice(0, 10)
});

const order = (o) => ({
  id: o.id, customerId: o.customerId,
  items: (o.items || []).map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, price: i.price })),
  shipping: o.shipping, total: o.total, paymentMethod: o.paymentMethod, paymentRef: o.paymentRef,
  status: ORDER_LABEL[o.status], address: o.address, createdAt: phTime(o.createdAt),
  history: (o.history || []).map((h) => ({ status: ORDER_LABEL[h.status], at: phTime(h.at), by: h.by }))
});

const tradeIn = (t) => ({
  id: t.id, customerId: t.customerId, category: TRADE_CATEGORY_LABEL[t.category], type: t.type, brand: t.brand, model: t.model,
  condition: CONDITION_LABEL[t.condition], askingPrice: t.askingPrice, suggestedOffer: t.suggestedOffer, offer: t.offer,
  photos: t.photos, status: TRADE_LABEL[t.status], ...(t.note ? { note: t.note } : {}), ...(t.stockSku ? { stockSku: t.stockSku } : {}),
  createdAt: phTime(t.createdAt), history: (t.history || []).map((h) => ({ status: h.status, at: phTime(h.at) }))
});

const purchaseOrder = (p) => ({
  poNumber: p.poNumber, sku: p.sku, supplierSku: p.supplierSku, qty: p.qty, unitPrice: p.unitPrice, status: p.status,
  approvedBy: p.approvedBy, createdAt: phTime(p.createdAt), shippedAt: phTime(p.shippedAt), deliveredAt: phTime(p.deliveredAt)
});

const movement = (m) => ({ id: m.id, sku: m.sku, change: m.change, reason: m.reason, refId: m.refId, at: phTime(m.at) });

// how related rows are loaded with an order / trade-in
const ORDER_INCLUDE = { items: { orderBy: { id: "asc" } }, history: { orderBy: [{ at: "asc" }, { id: "asc" }] } };
const TRADE_INCLUDE = { history: { orderBy: [{ at: "asc" }, { id: "asc" }] } };

module.exports = {
  ORDER_LABEL, ORDER_CODE, ORDER_STEPS, TRADE_LABEL, CONDITION_CODE, OFFER_PCT, TRADE_CATEGORY_CODE,
  ORDER_INCLUDE, TRADE_INCLUDE, phTime, targetStock, isLow,
  product, customer, order, tradeIn, purchaseOrder, movement
};
