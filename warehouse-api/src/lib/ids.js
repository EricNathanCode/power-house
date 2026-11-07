/* Readable IDs (ORD-0008, TRD-0009, PO-0004, MOV-0012, CUST-005, SIM-GC-0002).
   The counter row is bumped with one UPDATE inside the caller's transaction, so two people placing
   orders at the same moment can never get the same number (the row stays locked until commit). */
const WIDTH = { CUST: 3 };

async function nextId(tx, prefix) {
  const rows = await tx.$queryRaw`
    INSERT INTO id_counters (prefix, last) VALUES (${prefix}, 1)
    ON CONFLICT (prefix) DO UPDATE SET last = id_counters.last + 1
    RETURNING last`;
  const n = Number(rows[0].last);
  return `${prefix}-${String(n).padStart(WIDTH[prefix] || 4, "0")}`;
}

/* log one stock change (sale, cancel, supplier, tradeIn, restock) */
async function logMovement(tx, sku, change, reason, refId) {
  const id = await nextId(tx, "MOV");
  await tx.stockMovement.create({ data: { id, sku, change, reason, refId } });
  return id;
}

module.exports = { nextId, logMovement };
