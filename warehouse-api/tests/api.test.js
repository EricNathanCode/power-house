/* End-to-end tests: starts the real API on a free port against the database in .env,
   loads the sample data first and again at the end. Run: npm test
   ⚠️ It resets the data, so don't run it during a live demo. */
require("dotenv").config({ quiet: true });
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { prisma } = require("../src/db");
const { seed } = require("../prisma/seed");

let server, base;

/* a tiny browser: remembers its own login cookie */
function client() {
  let cookie = "";
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: body === undefined || method === "GET" ? undefined : JSON.stringify(body)
    });
    const set = res.headers.getSetCookie();
    if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
}
const stockOf = async (sku) => (await prisma.product.findUnique({ where: { sku } })).stock;

before(async () => {
  await seed(prisma);
  process.env.LOGIN_RATE_LIMIT = "1000"; // the tests log in many times; the real limit is tested below
  server = createApp().listen(0);
  process.env.LOGIN_RATE_LIMIT = "";
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await seed(prisma); // leave the sample data as it was
  await new Promise((r) => server.close(r));
  await prisma.$disconnect();
});

test("health + public catalog", async () => {
  const api = client();
  assert.equal((await api("GET", "/api/health")).body.ok, true);
  const all = await api("GET", "/api/products");
  assert.equal(all.body.length, 16);
  const parts = await api("GET", "/api/products?category=part");
  assert.ok(parts.body.every((p) => p.category === "part"));
  const search = await api("GET", "/api/products?q=ram");
  assert.ok(search.body.length >= 3 && search.body.every((p) => /ram/i.test(p.name + p.type + p.sku)));
  const gpu = await api("GET", "/api/products/GPU-8GB");
  assert.equal(gpu.body.price, 20000);
  assert.equal((await api("GET", "/api/products/NOPE")).status, 404);
  const q = await api("POST", "/api/quote", { lines: [{ sku: "GPU-8GB", qty: 1 }, { sku: "MS-WL-01", qty: 2 }] });
  assert.deepEqual([q.body.subtotal, q.body.shipping, q.body.total], [21380, 150, 21530]);
  const big = await api("POST", "/api/quote", { lines: [{ sku: "PC-PH-STARTER", qty: 1 }] });
  assert.equal(big.body.shipping, 0, "free shipping from ₱30,000");
  const s = await api("GET", "/api/trade-ins/suggest?type=Graphics%20card%20(GPU)&condition=Good");
  assert.equal(s.body.offer, 9000); // 45% of ₱20,000
});

test("unknown endpoint and bad JSON give clear errors", async () => {
  const api = client();
  assert.equal((await api("GET", "/api/nope")).body.error.code, "NO_ENDPOINT");
  const res = await fetch(base + "/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: "{bad" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "BAD_JSON");
});

test("customer login, me, wrong password, logout", async () => {
  const api = client();
  assert.equal((await api("GET", "/api/me")).body, null);
  assert.equal((await api("POST", "/api/auth/login", { email: "test1@example.com", password: "wrong999" })).status, 401);
  assert.equal((await api("POST", "/api/auth/login", { email: "nobody@example.com", password: "sample123" })).status, 401);
  const ok = await api("POST", "/api/auth/login", { email: "TEST1@example.com", password: "sample123" });
  assert.equal(ok.body.id, "CUST-001");
  const me = await api("GET", "/api/me");
  assert.equal(me.body.email, "test1@example.com");
  assert.equal(me.body.address.city, "Indang, Cavite");
  assert.equal(me.body.passwordHash, undefined, "never send the password hash");
  await api("POST", "/api/auth/logout");
  assert.equal((await api("GET", "/api/me")).body, null);
});

test("signup checks input and blocks duplicate emails", async () => {
  const api = client();
  assert.equal((await api("POST", "/api/auth/signup", { name: "A", email: "x@example.com", password: "abc12345" })).status, 400);
  assert.equal((await api("POST", "/api/auth/signup", { name: "New Person", email: "bad-email", password: "abc12345" })).status, 400);
  assert.equal((await api("POST", "/api/auth/signup", { name: "New Person", email: "n@example.com", password: "short1" })).status, 400);
  assert.equal((await api("POST", "/api/auth/signup", { name: "New Person", email: "n@example.com", password: "abc12345", phone: "12345" })).status, 400);
  assert.equal((await api("POST", "/api/auth/signup", { name: "New Person", email: "test1@example.com", password: "abc12345" })).body.error.code, "EMAIL_TAKEN");
  const ok = await api("POST", "/api/auth/signup", { name: "New Person", email: "new.person@example.com", password: "abc12345", phone: "09171234567" });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.id, "CUST-005");
  const me = await api("GET", "/api/me");
  assert.equal(me.body.phone, "0917 123 4567");
  const row = await prisma.customer.findUnique({ where: { id: "CUST-005" } });
  assert.ok(row.passwordHash.startsWith("$2") && !row.passwordHash.includes("abc12345"), "stored as a bcrypt hash");
});

test("account editing: profile, address, password", async () => {
  const api = client();
  await api("POST", "/api/auth/login", { email: "test3@example.com", password: "sample123" });
  assert.equal((await api("PUT", "/api/me", { name: "Test Customer 3", email: "test1@example.com", phone: "" })).body.error.code, "EMAIL_TAKEN");
  assert.equal((await api("PUT", "/api/me", { name: "Customer Three", email: "test3@example.com", phone: "09190000033" })).status, 200);
  assert.equal((await api("PUT", "/api/me/address", { street: "7 Demo Rd.", city: "Imus, Cavite", zip: "41" })).status, 400);
  assert.equal((await api("PUT", "/api/me/address", { street: "8 Demo Rd.", city: "Imus, Cavite", zip: "4103" })).status, 200);
  assert.equal((await api("PUT", "/api/me/password", { current: "nope", next: "newpass123" })).body.error.code, "BAD_PASSWORD");
  assert.equal((await api("PUT", "/api/me/password", { current: "sample123", next: "newpass123" })).status, 200);
  const again = client();
  assert.equal((await again("POST", "/api/auth/login", { email: "test3@example.com", password: "newpass123" })).status, 200);
});

test("D6: an order takes the stock in one step, with prices from the database", async () => {
  const api = client();
  await api("POST", "/api/auth/login", { email: "test1@example.com", password: "sample123" });
  const before = await stockOf("MS-WL-01");
  const res = await api("POST", "/api/orders", { lines: [{ sku: "MS-WL-01", qty: 2, price: 1 }], paymentMethod: "COD", address: "123 Sample St., Indang, Cavite 4122" });
  assert.equal(res.status, 201);
  assert.equal(res.body.id, "ORD-0008");
  assert.equal(res.body.total, 690 * 2 + 150, "ignores the price the browser sent");
  assert.equal(await stockOf("MS-WL-01"), before - 2);
  const o = await api("GET", "/api/orders/ORD-0008");
  assert.equal(o.body.status, "Placed");
  assert.equal(o.body.history[0].by, "CUST-001");
  const mov = await prisma.stockMovement.findFirst({ where: { refId: "ORD-0008" } });
  assert.deepEqual([mov.change, mov.reason], [-2, "sale"]);
});

test("D6: if one line is short, nothing is taken (all or nothing)", async () => {
  const api = client();
  await api("POST", "/api/auth/login", { email: "test1@example.com", password: "sample123" });
  const [mouse, ssd] = [await stockOf("MS-WL-01"), await stockOf("SSD-NVME-512")];
  const res = await api("POST", "/api/orders", { lines: [{ sku: "MS-WL-01", qty: 1 }, { sku: "SSD-NVME-512", qty: 1 }], paymentMethod: "COD", address: "123 Sample St., Indang, Cavite 4122" });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "OUT_OF_STOCK");
  assert.equal(res.body.error.sku, "SSD-NVME-512");
  assert.equal(await stockOf("MS-WL-01"), mouse, "the mouse was given back");
  assert.equal(await stockOf("SSD-NVME-512"), ssd);
  assert.equal((await api("POST", "/api/orders", { lines: [], paymentMethod: "COD", address: "123 Sample St., Indang" })).body.error.code, "EMPTY_CART");
  assert.equal((await api("POST", "/api/orders", { lines: [{ sku: "MS-WL-01", qty: 0 }], paymentMethod: "COD", address: "123 Sample St., Indang" })).status, 400);
  assert.equal((await api("POST", "/api/orders", { lines: [{ sku: "NOPE", qty: 1 }], paymentMethod: "COD", address: "123 Sample St., Indang" })).status, 404);
});

test("D6: two customers buying the last unit at the same moment: only one gets it", async () => {
  await prisma.product.update({ where: { sku: "MON-24-144" }, data: { stock: 1 } });
  const a = client(), b = client();
  await a("POST", "/api/auth/login", { email: "test1@example.com", password: "sample123" });
  await b("POST", "/api/auth/login", { email: "test2@example.com", password: "sample123" });
  const order = { lines: [{ sku: "MON-24-144", qty: 1 }], paymentMethod: "COD", address: "45 Example Ave., Dasmariñas, Cavite 4114" };
  const results = await Promise.all([a("POST", "/api/orders", order), b("POST", "/api/orders", order)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await stockOf("MON-24-144"), 0, "never below zero");
});

test("GCash (SIMULATED): fail places nothing, pay gives a one-time reference", async () => {
  const api = client();
  assert.equal((await api("POST", "/api/payments/gcash-sim", { amount: 840, outcome: "pay" })).status, 401);
  await api("POST", "/api/auth/login", { email: "test1@example.com", password: "sample123" });
  assert.equal((await api("POST", "/api/payments/gcash-sim", { amount: 840, outcome: "fail" })).body.error.code, "PAYMENT_FAILED");
  const order = { lines: [{ sku: "HDD-2TB-72", qty: 1 }], paymentMethod: "GCASH_SIM", address: "123 Sample St., Indang, Cavite 4122" };
  assert.equal((await api("POST", "/api/orders", order)).body.error.code, "PAYMENT_REQUIRED");
  const pay = await api("POST", "/api/payments/gcash-sim", { amount: 3040, outcome: "pay" });
  assert.match(pay.body.ref, /^SIM-GC-\d{4}$/);
  assert.equal((await api("POST", "/api/orders", { ...order, paymentRef: pay.body.ref })).status, 201);
  assert.equal((await api("POST", "/api/orders", { ...order, paymentRef: pay.body.ref })).body.error.code, "PAYMENT_REQUIRED", "a reference can't be used twice");
});

test("customers only see their own orders", async () => {
  const two = client();
  await two("POST", "/api/auth/login", { email: "test2@example.com", password: "sample123" });
  assert.equal((await two("GET", "/api/orders/ORD-0001")).status, 403);
  assert.equal((await two("PUT", "/api/orders/ORD-0001/cancel")).status, 403);
  const mine = await two("GET", "/api/me/orders");
  assert.ok(mine.body.length > 0 && mine.body.every((o) => o.customerId === "CUST-002"));
  assert.equal((await client()("GET", "/api/orders/ORD-0001")).status, 401);
});

test("D5: cancel only before Shipping, and the stock comes back", async () => {
  const api = client();
  await api("POST", "/api/auth/login", { email: "test1@example.com", password: "sample123" });
  const ram = await stockOf("RAM-DDR4-16GB");
  const c = await api("PUT", "/api/orders/ORD-0002/cancel"); // Packing, 2 × RAM
  assert.equal(c.body.status, "Cancelled");
  assert.equal(c.body.history.at(-1).by, "CUST-001");
  assert.equal(await stockOf("RAM-DDR4-16GB"), ram + 2);
  assert.equal((await api("PUT", "/api/orders/ORD-0002/cancel")).body.error.code, "TOO_LATE");
  assert.equal((await api("PUT", "/api/orders/ORD-0004/cancel")).body.error.code, "TOO_LATE"); // Out for Delivery
});

test("D9: staff endpoints refuse without a staff login", async () => {
  const cust = client();
  await cust("POST", "/api/auth/login", { email: "test1@example.com", password: "sample123" });
  for (const [m, u] of [["GET", "/api/staff/orders"], ["GET", "/api/staff/products"], ["GET", "/api/staff/low-stock"], ["POST", "/api/staff/products/GPU-8GB/restock"], ["PUT", "/api/staff/orders/ORD-0001/status"]]) {
    const r = await cust(m, u, {});
    assert.equal(r.status, 401, `${m} ${u}`);
    assert.equal(r.body.error.code, "STAFF_ONLY");
  }
  assert.equal((await client()("POST", "/api/staff/login", { username: "staff01", password: "nope" })).status, 401);
});

test("staff: status moves one step at a time; staff can cancel", async () => {
  const staff = client();
  assert.equal((await staff("POST", "/api/staff/login", { username: "staff01", password: "staff123" })).status, 200);
  assert.equal((await staff("PUT", "/api/staff/orders/ORD-0001/status", { status: "Shipping" })).body.error.code, "BAD_STEP");
  const p = await staff("PUT", "/api/staff/orders/ORD-0001/status", { status: "Packing" });
  assert.equal(p.body.status, "Packing");
  assert.equal(p.body.history.at(-1).by, "staff01");
  assert.equal((await staff("PUT", "/api/staff/orders/ORD-0005/status", { status: "Received" })).body.error.code, "BAD_STEP");
  assert.equal((await staff("PUT", "/api/staff/orders/ORD-0006/status", { status: "Packing" })).body.error.code, "CLOSED");
  const c = await staff("PUT", "/api/staff/orders/ORD-0001/cancel");
  assert.equal(c.body.history.at(-1).by, "staff01");
  const all = await staff("GET", "/api/staff/orders");
  assert.ok(all.body.length >= 7);
  const byCust = await staff("GET", "/api/staff/orders?customerId=CUST-002");
  assert.ok(byCust.body.every((o) => o.customerId === "CUST-002"));
  assert.equal((await staff("GET", "/api/orders/ORD-0003")).status, 200, "staff can open any order");
});

test("staff: inventory, add product, edit, restock, stock log", async () => {
  const staff = client();
  await staff("POST", "/api/staff/login", { username: "staff01", password: "staff123" });
  const inv = await staff("GET", "/api/staff/products");
  assert.ok(inv.body.find((p) => p.sku === "HS-GAME-01").low);
  assert.equal((await staff("POST", "/api/staff/products", { sku: "GPU-8GB", name: "Dup", category: "part", type: "GPU", price: 1 })).body.error.code, "SKU_TAKEN");
  assert.equal((await staff("POST", "/api/staff/products", { sku: "x", name: "Bad", category: "part", type: "GPU", price: 1 })).status, 400);
  assert.equal((await staff("POST", "/api/staff/products", { sku: "RAM-DDR5-32GB", name: "DDR5 32GB RAM", category: "part", type: "RAM", price: 6500, lowStockLevel: 3, stock: 5 })).status, 201);
  assert.equal(await stockOf("RAM-DDR5-32GB"), 5);
  assert.equal((await staff("PUT", "/api/staff/products/RAM-DDR5-32GB", { price: 6200, stock: 9999 })).status, 200);
  assert.equal(await stockOf("RAM-DDR5-32GB"), 5, "editing can't change stock directly");
  assert.equal((await staff("POST", "/api/staff/products/RAM-DDR5-32GB/restock", { qty: 0 })).status, 400);
  assert.equal((await staff("POST", "/api/staff/products/RAM-DDR5-32GB/restock", { qty: 3 })).status, 200);
  assert.equal(await stockOf("RAM-DDR5-32GB"), 8);
  const log = await staff("GET", "/api/staff/stock-movements");
  assert.equal(log.body[0].sku, "RAM-DDR5-32GB");
  assert.equal(log.body[0].reason, "restock");
});

test("D7/D10 + SIMULATED supplier: low stock, reorder, ship, receive", async () => {
  const staff = client();
  await staff("POST", "/api/staff/login", { username: "staff01", password: "staff123" });
  const low = await staff("GET", "/api/staff/low-stock");
  const ssd = low.body.find((p) => p.sku === "SSD-NVME-1TB");
  assert.ok(ssd && ssd.suggestedQty >= 10 && ssd.openPo === null);
  assert.equal(low.body.find((p) => p.sku === "HS-GAME-01").openPo, "PO-0003");
  assert.equal((await staff("POST", "/api/staff/purchase-orders", { sku: "SSD-NVME-1TB", qty: 2 })).body.error.code, "BELOW_MIN");
  await staff("PUT", "/api/staff/settings/supplier", { online: false });
  assert.equal((await staff("POST", "/api/staff/purchase-orders", { sku: "SSD-NVME-1TB", qty: 11 })).body.error.code, "SUPPLIER_DOWN");
  assert.equal((await client()("GET", "/api/settings")).body.supplierOnline, false);
  await staff("PUT", "/api/staff/settings/supplier", { online: true });
  const po = await staff("POST", "/api/staff/purchase-orders", { sku: "SSD-NVME-1TB", qty: ssd.suggestedQty });
  assert.equal(po.body.poNumber, "PO-0004");
  assert.equal((await staff("PUT", "/api/staff/purchase-orders/PO-0004/ship")).status, 200);
  assert.equal((await staff("PUT", "/api/staff/purchase-orders/PO-0004/ship")).body.error.code, "BAD_STEP");
  const before = await stockOf("SSD-NVME-1TB");
  assert.equal((await staff("PUT", "/api/staff/purchase-orders/PO-0004/receive")).status, 200);
  assert.equal(await stockOf("SSD-NVME-1TB"), before + ssd.suggestedQty);
  assert.equal((await staff("PUT", "/api/staff/purchase-orders/PO-0004/receive")).body.error.code, "BAD_STEP", "can't receive twice");
  const list = await staff("GET", "/api/staff/purchase-orders");
  assert.equal(list.body[0].poNumber, "PO-0004");
  assert.equal(list.body[0].status, "DELIVERED");
});

test("Sell to Us: submit, offer, accept / decline, receive, add to stock", async () => {
  const cust = client(), staff = client();
  await cust("POST", "/api/auth/login", { email: "test1@example.com", password: "sample123" });
  await staff("POST", "/api/staff/login", { username: "staff01", password: "staff123" });
  assert.equal((await cust("POST", "/api/trade-ins", { category: "PC Parts", type: "RAM", brand: "B", model: "M", condition: "Good", askingPrice: 1000 })).status, 400);
  const sub = await cust("POST", "/api/trade-ins", { category: "PC Parts", type: "RAM", brand: "Sample Brand", model: "DDR4 8GB Kit", condition: "Good", askingPrice: 700, photos: 2 });
  assert.equal(sub.body.id, "TRD-0009");
  const mine = await cust("GET", "/api/me/trade-ins");
  const t = mine.body.find((x) => x.id === "TRD-0009");
  assert.deepEqual([t.status, t.condition, t.category, t.suggestedOffer], ["Under review", "Good", "PC Parts", Math.round(2450 * 0.45)]);
  assert.equal((await cust("PUT", "/api/trade-ins/TRD-0009/answer", { accept: true })).body.error.code, "BAD_STEP", "no offer yet");
  assert.equal((await staff("PUT", "/api/staff/trade-ins/TRD-0009/offer", { amount: 0 })).status, 400);
  assert.equal((await staff("PUT", "/api/staff/trade-ins/TRD-0009/offer", { amount: 650 })).status, 200);
  const two = client();
  await two("POST", "/api/auth/login", { email: "test2@example.com", password: "sample123" });
  assert.equal((await two("PUT", "/api/trade-ins/TRD-0009/answer", { accept: true })).status, 404, "not your trade-in");
  assert.equal((await cust("PUT", "/api/trade-ins/TRD-0009/answer", { accept: true })).body.status, "Accepted");
  assert.equal((await staff("PUT", "/api/staff/trade-ins/TRD-0009/to-stock", { price: 900 })).body.error.code, "BAD_STEP");
  assert.equal((await staff("PUT", "/api/staff/trade-ins/TRD-0009/receive")).status, 200);
  const st = await staff("PUT", "/api/staff/trade-ins/TRD-0009/to-stock", { price: 900 });
  assert.equal(st.body.sku, "DDR4-8GB-KIT-USED");
  const used = await prisma.product.findUnique({ where: { sku: "DDR4-8GB-KIT-USED" } });
  assert.deepEqual([used.stock, used.condition, used.price], [1, "used", 900]);
  // decline paths
  assert.equal((await cust("PUT", "/api/trade-ins/TRD-0003/answer", { accept: false })).body.status, "Declined");
  assert.equal((await staff("PUT", "/api/staff/trade-ins/TRD-0002/reject", {})).status, 200);
  const all = await staff("GET", "/api/staff/trade-ins");
  assert.equal(all.body.find((x) => x.id === "TRD-0002").status, "Rejected");
  assert.ok(all.body.find((x) => x.id === "TRD-0002").note);
});

test("too many login tries get blocked for a while", async () => {
  process.env.LOGIN_RATE_LIMIT = "3";
  const small = createApp().listen(0);
  await new Promise((r) => small.once("listening", r));
  const url = `http://127.0.0.1:${small.address().port}/api/auth/login`;
  const statuses = [];
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "test1@example.com", password: "guess" + i }) });
    statuses.push(res.status);
  }
  process.env.LOGIN_RATE_LIMIT = "";
  await new Promise((r) => small.close(r));
  assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
});

test("demo reset puts the sample data back", async () => {
  const api = client();
  const r = await api("POST", "/api/demo/reset");
  assert.equal(r.status, process.env.ALLOW_DEMO_RESET === "true" ? 200 : 403);
  if (r.status === 200) {
    assert.equal(await prisma.order.count(), 7);
    assert.equal(await stockOf("MON-24-144"), 6);
  }
});
