/* Sell to Us (D11, D13). Flow: Under review -> Offer sent -> Accepted / Declined (customer)
   or Rejected (staff) -> Received -> In stock (as a used product with its own SKU).
   Suggested offer: Like new 60%, Good 45%, Fair 30% of our price for that kind of item. */
const { prisma } = require("../db");
const { ApiError, bad, notFound, conflict } = require("../lib/errors");
const { nextId, logMovement } = require("../lib/ids");
const check = require("../lib/check");
const fmt = require("../lib/format");

const TX = { timeout: 20000, maxWait: 10000 };
const LABEL = fmt.TRADE_LABEL;

/* our product to compare with. Same choice as the website (shared/js/api.js pickRef):
   matching type, SKU order, and a hint in brackets wins, e.g. "Storage (SSD)" -> an SSD, not the HDD */
function pickRef(list, type) {
  const t = String(type || "").toLowerCase();
  if (!t) return null;
  const hint = (t.match(/\(([^)]+)\)/) || [])[1];
  const cands = list.filter((p) => p.condition === "new" && (t.includes(p.type.toLowerCase()) || p.type.toLowerCase().includes(t.split(" ")[0])))
    .sort((a, b) => a.sku.localeCompare(b.sku));
  return (hint && cands.find((p) => (p.name + " " + p.sku).toLowerCase().includes(hint))) || cands[0] || null;
}

async function suggestOffer(type, conditionLabel) {
  const cond = fmt.CONDITION_CODE[conditionLabel];
  if (!cond || !String(type || "").trim()) return null;
  const ref = pickRef(await prisma.product.findMany({ where: { condition: "new" } }), type);
  if (!ref) return null;
  const pct = fmt.OFFER_PCT[cond];
  return { retail: ref.price, pct, offer: Math.round(ref.price * pct), refName: ref.name };
}

const load = async (id, db = prisma) => {
  const t = await db.tradeIn.findUnique({ where: { id }, include: fmt.TRADE_INCLUDE });
  if (!t) throw notFound("Trade-in not found.");
  return t;
};

/* move a trade-in from one status to the next; the status check is part of the update */
async function step(tx, id, from, to, data = {}, historyLabel = LABEL[to]) {
  const r = await tx.tradeIn.updateMany({ where: { id, status: from }, data: { status: to, ...data } });
  if (r.count === 0) return false;
  await tx.tradeInHistory.create({ data: { tradeInId: id, status: historyLabel } });
  return true;
}

async function submit(customerId, b) {
  const category = fmt.TRADE_CATEGORY_CODE[b.category];
  if (!category) throw bad("Pick a category: PC Parts, Accessories or Prebuilt PC.", { field: "Category" });
  const condition = fmt.CONDITION_CODE[b.condition];
  if (!condition) throw bad("Pick a condition: Like new, Good or Fair.", { field: "Condition" });
  const data = {
    customerId, category, condition,
    type: check.text(b.type, "Type of item", { min: 2, max: 60 }),
    brand: check.text(b.brand, "Brand", { min: 2, max: 60 }),
    model: check.text(b.model, "Model", { min: 2, max: 80 }),
    askingPrice: check.int(b.askingPrice, "Asking price", { min: 1, max: 1_000_000 }),
    photos: check.int(b.photos === undefined ? 0 : b.photos, "Photos", { min: 0, max: 5 })
  };
  const s = await suggestOffer(data.type, b.condition);
  return prisma.$transaction(async (tx) => {
    const id = await nextId(tx, "TRD");
    await tx.tradeIn.create({ data: { id, ...data, suggestedOffer: s ? s.offer : null, history: { create: [{ status: "Submitted" }] } } });
    return { id };
  }, TX);
}

async function answer(customerId, id, accept) {
  const t = await load(id);
  if (t.customerId !== customerId) throw notFound("Trade-in not found.");
  const ok = await prisma.$transaction((tx) => step(tx, id, "OFFER_SENT", accept ? "ACCEPTED" : "DECLINED"), TX);
  if (!ok) throw conflict("BAD_STEP", "There's no offer to answer.");
  return fmt.tradeIn(await load(id));
}

async function sendOffer(id, amount) {
  const offer = check.int(Math.round(Number(amount)), "Offer", { min: 1, max: 1_000_000 });
  await load(id);
  const ok = await prisma.$transaction((tx) => step(tx, id, "UNDER_REVIEW", "OFFER_SENT", { offer }), TX);
  if (!ok) throw conflict("BAD_STEP", "Only items under review can get an offer.");
  return true;
}

async function reject(id, note) {
  const t = await load(id);
  const n = typeof note === "string" && note.trim() ? check.text(note, "Note", { max: 300 }) : t.note || "We couldn't make an offer for this item this time.";
  const ok = await prisma.$transaction((tx) => step(tx, id, "UNDER_REVIEW", "REJECTED", { note: n }), TX);
  if (!ok) throw conflict("BAD_STEP", "Only items under review can be declined.");
  return true;
}

async function markReceived(id) {
  await load(id);
  const ok = await prisma.$transaction((tx) => step(tx, id, "ACCEPTED", "RECEIVED"), TX);
  if (!ok) throw conflict("BAD_STEP", "Only accepted trade-ins can be received.");
  return true;
}

/* inspected -> added to stock as a USED item with its own SKU (model + "-USED") */
async function addToStock(id, price) {
  const t = await load(id);
  if (t.status !== "RECEIVED") throw conflict("BAD_STEP", "Receive the item first.");
  const sellPrice = price === undefined || price === null || price === "" ? Math.round((t.offer || 0) * 1.3) : check.int(Number(price), "Selling price", { min: 1, max: 1_000_000 });
  if (!(sellPrice > 0)) throw bad("Enter a selling price above ₱0.");
  const base = String(t.model).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);
  const sku = base + "-USED";

  await prisma.$transaction(async (tx) => {
    let p = await tx.product.findUnique({ where: { sku } });
    if (!p) {
      const all = await tx.product.findMany({ orderBy: { sku: "asc" } });
      const ref = all.find((x) => String(t.type).toLowerCase().includes(x.type.toLowerCase()));
      const cond = { LIKE_NEW: "Like new", GOOD: "Good", FAIR: "Fair" }[t.condition];
      p = await tx.product.create({
        data: {
          sku, name: `${t.brand} ${t.model} (Used, ${cond})`, category: t.category, type: ref ? ref.type : t.type, price: sellPrice,
          stock: 0, lowStockLevel: 0, condition: "used", art: ref ? ref.art : "box",
          specs: { Condition: `${cond}, inspected by staff`, Source: `Trade-in ${t.id}`, Warranty: "30 days" }
        }
      });
    }
    await tx.product.update({ where: { sku }, data: { stock: { increment: 1 } } });
    await logMovement(tx, sku, 1, "tradeIn", t.id);
    const ok = await step(tx, id, "RECEIVED", "IN_STOCK", { stockSku: sku });
    if (!ok) throw new ApiError(409, "BAD_STEP", "Someone else changed this trade-in just now. Refresh and try again.");
  }, TX);
  return { sku };
}

module.exports = { suggestOffer, load, submit, answer, sendOffer, reject, markReceived, addToStock };
