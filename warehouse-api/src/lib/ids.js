/* Readable IDs (ORD-0008, TRD-0009, PO-0004, MOV-0012, CUST-005, SIM-GC-0002).
   The counter row is bumped with one UPDATE inside the caller's transaction, so two people placing
   orders at the same moment can never get the same number (the row stays locked until commit). */
const WIDTH = { CUST: 3 };

async function nextId(tx, prefix) {
  // Prisma turns this into one INSERT ... ON CONFLICT DO UPDATE (atomic), and it always uses the right schema
  // (a hand-written SQL query would always hit the "public" schema, even when the tests run in "test")
  const row = await tx.idCounter.upsert({ where: { prefix }, create: { prefix, last: 1 }, update: { last: { increment: 1 } } });
  const n = row.last;
  return `${prefix}-${String(n).padStart(WIDTH[prefix] || 4, "0")}`;
}

/* log one stock change (sale, cancel, supplier, tradeIn, restock) */
async function logMovement(tx, sku, change, reason, refId) {
  const id = await nextId(tx, "MOV");
  await tx.stockMovement.create({ data: { id, sku, change, reason, refId } });
  return id;
}

module.exports = { nextId, logMovement };
