/* Checks that the sample data in the database is right. Read-only except test 6 (which must fail).
   Run: npm run db:verify */
require("dotenv").config({ quiet: true });
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const fmt = (d) => d.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });

(async () => {
  const c = await db.customer.findUnique({ where: { email: "test1@example.com" } });
  console.log("1. password stored as a hash:", c.passwordHash.startsWith("$2"),
    "| sample123 matches:", bcrypt.compareSync("sample123", c.passwordHash),
    "| a wrong password matches:", bcrypt.compareSync("nope", c.passwordHash));
  const s = await db.staff.findUnique({ where: { username: "staff01" } });
  console.log("   staff01 / staff123 matches:", bcrypt.compareSync("staff123", s.passwordHash));

  const o = await db.order.findUnique({ where: { id: "ORD-0002" }, include: { items: true, history: { orderBy: { at: "asc" } } } });
  console.log("2. ORD-0002:", o.status, o.paymentMethod, o.paymentRef, "| items:", o.items.map((i) => `${i.sku} x${i.qty}`).join(", "), "| placed", fmt(o.createdAt), "(PH time)");
  console.log("   history:", o.history.map((h) => `${h.status} by ${h.by}`).join(" -> "));

  const low = await db.$queryRaw`select sku, stock, "lowStockLevel" from products where "lowStockLevel" > 0 and stock <= "lowStockLevel" order by sku`;
  console.log("3. low stock (stock <= its own level):", low.map((r) => `${r.sku} ${r.stock}/${r.lowStockLevel}`).join(", "));

  const t = await db.tradeIn.findUnique({ where: { id: "TRD-0008" }, include: { stockProduct: true } });
  console.log("4. TRD-0008", t.status, "-> became product", t.stockSku, `(stock ${t.stockProduct.stock})`);
  const r = await db.tradeIn.findUnique({ where: { id: "TRD-0007" } });
  console.log("   TRD-0007", r.status, "| note:", r.note);

  const ids = await db.idCounter.findMany({ orderBy: { prefix: "asc" } });
  console.log("5. next IDs:", ids.map((i) => `${i.prefix}-${String(i.last + 1).padStart(i.prefix === "CUST" ? 3 : 4, "0")}`).join(", "));

  try {
    await db.orderItem.create({ data: { orderId: "ORD-0001", sku: "NO-SUCH-SKU", name: "x", qty: 1, price: 1 } });
    console.log("6. foreign keys: NOT enforced (bad)"); process.exitCode = 1;
  } catch {
    console.log("6. foreign keys: an unknown SKU is rejected by the database (good)");
  }
})()
  .catch((e) => { console.error("Check failed:", e.message); process.exitCode = 1; })
  .finally(() => db.$disconnect());
