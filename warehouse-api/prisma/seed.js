/* Sample data for the warehouse database (SAMPLE DATA ONLY: no real people).
   Reads the SAME file the website uses (../shared/js/data.js), so the website and the database
   always start from identical data. Running it again wipes the tables and puts the sample data back
   (like the website's "Reset demo data" button).
   Run: npm run db:seed */
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// ---- load PH.SEED from the website's data file ----
const dataFile = path.join(__dirname, "..", "..", "shared", "js", "data.js");
const sandbox = {};
sandbox.window = sandbox; // in a browser, "window" is the global object
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataFile, "utf8"), sandbox);
const SEED = sandbox.PH && sandbox.PH.SEED;
if (!SEED) throw new Error("Could not read PH.SEED from " + dataFile);

// ---- labels on the website -> values in the database ----
const ORDER_STATUS = { Placed: "PLACED", Packing: "PACKING", Shipping: "SHIPPING", "Out for Delivery": "OUT_FOR_DELIVERY", Received: "RECEIVED", Cancelled: "CANCELLED" };
const TRADE_STATUS = { "Under review": "UNDER_REVIEW", "Offer sent": "OFFER_SENT", Accepted: "ACCEPTED", Declined: "DECLINED", Rejected: "REJECTED", Received: "RECEIVED", "In stock": "IN_STOCK" };
const TRADE_CONDITION = { "Like new": "LIKE_NEW", Good: "GOOD", Fair: "FAIR" };
const TRADE_CATEGORY = { "PC Parts": "part", Accessories: "accessory", "Prebuilt PC": "prebuilt" };
const must = (map, key, what) => { if (!(key in map)) throw new Error(`Unknown ${what}: ${key}`); return map[key]; };

// sample times have no time zone: they are Philippine time (UTC+8)
const ph = (s) => (s ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : s + "+08:00") : undefined);
const num = (id) => Number(String(id).split("-").pop());

/* Wipes the tables and loads the sample data. Used by `npm run db:seed` and by the API's demo reset. */
async function seed(prisma) {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  await prisma.$transaction(async (tx) => {
    // wipe, children first
    for (const m of ["tradeInHistory", "tradeIn", "orderHistory", "orderItem", "order", "purchaseOrder", "supplierProduct", "stockMovement", "product", "customer", "staff", "setting", "idCounter"]) {
      await tx[m].deleteMany();
    }

    await tx.product.createMany({
      data: SEED.products.map((p) => ({ sku: p.sku, name: p.name, category: p.category, type: p.type, price: p.price, stock: p.stock,
        lowStockLevel: p.lowStockLevel, condition: p.condition, art: p.art || "box", specs: p.specs || {} }))
    });

    await tx.customer.createMany({
      data: SEED.customers.map((c) => ({ id: c.id, name: c.name, email: c.email.toLowerCase(), passwordHash: hash(c.password), phone: c.phone || "",
        street: c.address ? c.address.street : null, city: c.address ? c.address.city : null, zip: c.address ? c.address.zip : null, createdAt: ph(c.since + "T00:00:00") }))
    });

    await tx.staff.createMany({ data: SEED.staff.map((s) => ({ username: s.username, name: s.name || s.username, passwordHash: hash(s.password) })) });

    for (const o of SEED.orders) {
      await tx.order.create({
        data: {
          id: o.id, customerId: o.customerId, shipping: o.shipping, total: o.total, paymentMethod: o.paymentMethod, paymentRef: o.paymentRef,
          status: must(ORDER_STATUS, o.status, "order status"), address: o.address, createdAt: ph(o.createdAt),
          items: { create: o.items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, price: i.price })) },
          history: { create: o.history.map((h) => ({ status: must(ORDER_STATUS, h.status, "order status"), at: ph(h.at), by: h.by })) }
        }
      });
    }

    await tx.supplierProduct.createMany({ data: SEED.supplierCatalog.map((s) => ({ supplierSku: s.supplierSku, sku: s.sku, unitPrice: s.unitPrice, minOrderQty: s.minOrderQty })) });

    await tx.purchaseOrder.createMany({
      data: SEED.purchaseOrders.map((p) => ({ poNumber: p.poNumber, sku: p.sku, supplierSku: p.supplierSku, qty: p.qty, unitPrice: p.unitPrice, status: p.status,
        approvedBy: p.approvedBy, createdAt: ph(p.createdAt), shippedAt: ph(p.shippedAt), deliveredAt: ph(p.deliveredAt) }))
    });

    for (const t of SEED.tradeIns) {
      const inStock = t.status === "In stock";
      await tx.tradeIn.create({
        data: {
          id: t.id, customerId: t.customerId, category: must(TRADE_CATEGORY, t.category, "trade-in category"), type: t.type, brand: t.brand, model: t.model,
          condition: must(TRADE_CONDITION, t.condition, "trade-in condition"), askingPrice: t.askingPrice, suggestedOffer: t.suggestedOffer, offer: t.offer,
          photos: t.photos || 0, status: must(TRADE_STATUS, t.status, "trade-in status"), note: t.note || null, createdAt: ph(t.createdAt),
          // the sample "In stock" trade-in became the used RAM product
          stockSku: inStock ? (SEED.stockMovements.find((m) => m.refId === t.id) || {}).sku || null : null,
          history: { create: t.history.map((h) => ({ status: h.status, at: ph(h.at) })) }
        }
      });
    }

    await tx.stockMovement.createMany({ data: SEED.stockMovements.map((m) => ({ id: m.id, sku: m.sku, change: m.change, reason: m.reason, refId: m.refId, at: ph(m.at) })) });

    await tx.setting.createMany({ data: Object.entries(SEED.settings).map(([key, value]) => ({ key, value })) });

    // ID counters start after the highest sample ID
    const last = (list, key) => Math.max(0, ...list.map((x) => num(x[key])));
    await tx.idCounter.createMany({
      data: [
        { prefix: "CUST", last: last(SEED.customers, "id") },
        { prefix: "ORD", last: last(SEED.orders, "id") },
        { prefix: "TRD", last: last(SEED.tradeIns, "id") },
        { prefix: "PO", last: last(SEED.purchaseOrders, "poNumber") },
        { prefix: "MOV", last: last(SEED.stockMovements, "id") },
        // SIMULATED GCash references (SIM-GC-0001 ...)
        { prefix: "GC", last: last(SEED.orders.filter((o) => o.paymentRef), "paymentRef") }
      ]
    });
  }, { timeout: 60000, maxWait: 20000 });
  return SEED.version;
}

module.exports = { seed };

// run from the command line: npm run db:seed
if (require.main === module) {
  const prisma = new PrismaClient();
  const t0 = Date.now();
  seed(prisma)
    .then(async (version) => {
      const counts = {};
      for (const m of ["product", "customer", "staff", "order", "orderItem", "orderHistory", "supplierProduct", "purchaseOrder", "tradeIn", "tradeInHistory", "stockMovement", "setting", "idCounter"]) {
        counts[m] = await prisma[m].count();
      }
      console.log(`Sample data loaded in ${Date.now() - t0} ms (data version ${version}):`);
      console.table(counts);
    })
    .catch((e) => { console.error("Seed failed:", e.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
