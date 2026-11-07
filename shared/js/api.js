/* Power House MOCK warehouse API (frontend only).
   ---------------------------------------------------------------
   There is no backend yet, so this file plays the part of the Warehouse REST API and its database.
   Data lives in the browser's localStorage. Every function returns a Promise, like fetch() would,
   so when the real Node + Express API is ready, each function can be replaced by a fetch() call
   to the endpoint written above it, and the pages do not need to change.

   Rules from the brain (Decisions Log):
   D5  Cancel only before Shipping; cancelling returns the stock
   D6  Placing an order checks stock + saves the order + deducts stock in ONE step (all or nothing)
   D7  Each product has its own lowStockLevel
   D8  COD + GCash (SIMULATED)
   D9  Staff actions need a staff login
   D10 Suggested reorder qty, staff approve
   D11 Trade-in offers: Like new 60%, Good 45%, Fair 30% of our retail price
*/
(function () {
  const KEY = "ph_db";
  const STATUSES = ["Placed", "Packing", "Shipping", "Out for Delivery", "Received"];
  const OFFER_PCT = { "Like new": 0.6, "Good": 0.45, "Fair": 0.3 };
  const SHIPPING_FEE = 150;
  const FREE_SHIPPING_FROM = 30000;

  class ApiError extends Error {
    constructor(code, message, extra) { super(message); this.code = code; Object.assign(this, extra || {}); }
  }

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const now = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); }; // local time, no "Z"
  const wait = (ms = 180) => new Promise((r) => setTimeout(r, ms)); // feels like a network call

  function load() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || db.version !== PH.SEED.version) { db = clone(PH.SEED); save(db); }
    return db;
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn("Could not save demo data", e); }
  }
  function nextId(list, prefix, field = "id") {
    const n = list.reduce((m, x) => Math.max(m, parseInt(String(x[field]).split("-").pop(), 10) || 0), 0) + 1;
    return `${prefix}-${String(n).padStart(4, "0")}`;
  }
  function move(db, sku, change, reason, refId) {
    db.stockMovements.push({ id: nextId(db.stockMovements, "MOV"), sku, change, reason, refId, at: now() });
  }
  function product(db, sku) {
    const p = db.products.find((x) => x.sku === sku);
    if (!p) throw new ApiError("NOT_FOUND", `Product ${sku} not found`);
    return p;
  }
  function needStaff() {
    const s = PH.session.staff();
    if (!s) throw new ApiError("STAFF_ONLY", "Please log in to the Staff Portal first.");
    return s;
  }
  function needCustomer() {
    const c = PH.session.customerId();
    if (!c) throw new ApiError("LOGIN_REQUIRED", "Please log in first.");
    return c;
  }
  const targetStock = (p) => Math.max(p.lowStockLevel * 3, p.lowStockLevel + 1);
  const isLow = (p) => p.lowStockLevel > 0 && p.stock <= p.lowStockLevel;

  /* ---------- sessions (sample logins only; the real API will use bcrypt + express-session, D9) ---------- */
  PH.session = {
    customerId: () => localStorage.getItem("ph_customer"),
    staff: () => localStorage.getItem("ph_staff"),
    logout: () => localStorage.removeItem("ph_customer"),
    staffLogout: () => localStorage.removeItem("ph_staff")
  };

  /* ---------- cart (kept in the browser, like a real store would) ---------- */
  PH.cart = {
    key() { const id = PH.session.customerId(); return id ? "ph_cart:" + id : null; },
    get() { const k = this.key(); if (!k) return []; try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
    set(items) { const k = this.key(); if (!k) return; localStorage.setItem(k, JSON.stringify(items)); document.dispatchEvent(new CustomEvent("cart:change")); },
    add(sku, qty = 1) { const c = this.get(); const it = c.find((x) => x.sku === sku); if (it) it.qty += qty; else c.push({ sku, qty }); this.set(c); },
    update(sku, qty) { this.set(this.get().map((x) => (x.sku === sku ? { ...x, qty } : x)).filter((x) => x.qty > 0)); },
    remove(sku) { this.set(this.get().filter((x) => x.sku !== sku)); },
    clear() { this.set([]); },
    count() { return this.get().reduce((s, x) => s + x.qty, 0); }
  };

  PH.api = {
    ApiError, STATUSES, OFFER_PCT, SHIPPING_FEE, FREE_SHIPPING_FROM,

    /* GET /products?category=&q= */
    async listProducts({ category, q } = {}) {
      await wait();
      const db = load();
      let list = db.products;
      if (category) list = list.filter((p) => p.category === category);
      if (q) { const t = q.toLowerCase(); list = list.filter((p) => (p.name + " " + p.type + " " + p.sku).toLowerCase().includes(t)); }
      return clone(list);
    },
    /* GET /products/:sku */
    async getProduct(sku) { await wait(); return clone(product(load(), sku)); },

    /* POST /auth/signup */
    async signup({ name, email, password, phone }) {
      await wait();
      const db = load();
      if (db.customers.some((c) => c.email.toLowerCase() === email.toLowerCase())) throw new ApiError("EMAIL_TAKEN", "That email already has an account. Log in instead.");
      const id = nextId(db.customers, "CUST");
      db.customers.push({ id, name, email, password, phone: phone || "", address: null, since: now().slice(0, 10) });
      save(db);
      localStorage.setItem("ph_customer", id);
      return { id, name };
    },
    /* POST /auth/login */
    async login(email, password) {
      await wait();
      const c = load().customers.find((x) => x.email.toLowerCase() === String(email).toLowerCase() && x.password === password);
      if (!c) throw new ApiError("BAD_LOGIN", "Wrong email or password. Try again.");
      localStorage.setItem("ph_customer", c.id);
      return { id: c.id, name: c.name };
    },
    /* GET /me */
    async me() {
      const id = PH.session.customerId();
      if (!id) return null;
      const c = load().customers.find((x) => x.id === id);
      if (!c) { PH.session.logout(); return null; }
      const { password, ...safe } = c;
      return clone(safe);
    },
    /* PUT /me/address */
    async saveAddress(address) {
      const id = needCustomer(); const db = load();
      const c = db.customers.find((x) => x.id === id); c.address = address; save(db); return true;
    },

    quote(lines) {
      const db = load();
      const items = lines.map((l) => { const p = db.products.find((x) => x.sku === l.sku); return p ? { sku: p.sku, name: p.name, price: p.price, qty: l.qty, stock: p.stock, art: p.art, condition: p.condition } : null; }).filter(Boolean);
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
      return { items, subtotal, shipping, total: subtotal + shipping };
    },

    /* SIMULATED GCash: no real money, no real GCash account. Returns a fake reference. */
    async simulateGcash(amount, outcome) {
      await wait(700);
      if (outcome !== "pay") throw new ApiError("PAYMENT_FAILED", "GCash payment failed (simulated). Your order was not placed and no stock was taken.");
      const db = load();
      const n = db.orders.filter((o) => o.paymentRef).length + 1;
      return { ref: `SIM-GC-${String(n).padStart(4, "0")}`, amount };
    },

    /* POST /orders  (D6: check stock → save order → deduct stock, all or nothing) */
    async placeOrder({ lines, paymentMethod, paymentRef, address }) {
      await wait(300);
      const customerId = needCustomer();
      const db = load();
      if (!lines.length) throw new ApiError("EMPTY_CART", "Your cart is empty.");
      // 1. check every line first; if one fails, nothing changes
      for (const l of lines) {
        const p = product(db, l.sku);
        if (!Number.isInteger(l.qty) || l.qty < 1) throw new ApiError("BAD_QTY", "Quantity must be at least 1.");
        if (p.stock < l.qty) throw new ApiError("OUT_OF_STOCK", `Only ${p.stock} left of ${p.name}. Please change the quantity.`, { sku: p.sku, available: p.stock });
      }
      if (paymentMethod === "GCASH_SIM" && !paymentRef) throw new ApiError("PAYMENT_REQUIRED", "GCash (SIMULATED) payment was not completed.");
      // 2. save + deduct together
      const q = PH.api.quote(lines);
      const id = nextId(db.orders, "ORD");
      const at = now();
      for (const l of lines) { product(db, l.sku).stock -= l.qty; move(db, l.sku, -l.qty, "sale", id); }
      db.orders.push({ id, customerId, items: q.items.map(({ sku, name, qty, price }) => ({ sku, name, qty, price })), shipping: q.shipping, total: q.total,
        paymentMethod, paymentRef: paymentRef || null, status: "Placed", address, createdAt: at, history: [{ status: "Placed", at, by: customerId }] });
      save(db);
      return { id, total: q.total };
    },
    /* GET /orders/:id */
    async getOrder(id) {
      await wait();
      const o = load().orders.find((x) => x.id === id);
      if (!o) throw new ApiError("NOT_FOUND", "Order not found.");
      const me = PH.session.customerId();
      if (o.customerId !== me && !PH.session.staff()) throw new ApiError("FORBIDDEN", "This order belongs to another account.");
      return clone(o);
    },
    /* GET /me/orders */
    async myOrders() {
      await wait();
      const id = needCustomer();
      return clone(load().orders.filter((o) => o.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    /* PUT /orders/:id/cancel  (D5) */
    async cancelOrder(id, { asStaff = false } = {}) {
      await wait(250);
      const who = asStaff ? needStaff() : needCustomer();
      const db = load();
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ApiError("NOT_FOUND", "Order not found.");
      if (!asStaff && o.customerId !== who) throw new ApiError("FORBIDDEN", "This order belongs to another account.");
      if (!["Placed", "Packing"].includes(o.status)) throw new ApiError("TOO_LATE", "This order has already shipped, so it can't be cancelled.");
      o.status = "Cancelled"; o.history.push({ status: "Cancelled", at: now(), by: who });
      for (const it of o.items) { const p = db.products.find((x) => x.sku === it.sku); if (p) { p.stock += it.qty; move(db, it.sku, it.qty, "cancel", id); } }
      save(db);
      return clone(o);
    },

    /* ---------- staff ---------- */
    async staffLogin(username, password) {
      await wait();
      const s = load().staff.find((x) => x.username === username && x.password === password);
      if (!s) throw new ApiError("BAD_LOGIN", "Wrong username or password.");
      localStorage.setItem("ph_staff", s.username);
      return { username: s.username };
    },
    /* GET /staff/orders */
    async allOrders() { await wait(); needStaff(); return clone(load().orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); },
    /* PUT /staff/orders/:id/status  (forward one step at a time) */
    async setOrderStatus(id, status) {
      await wait(250);
      const staff = needStaff(); const db = load();
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ApiError("NOT_FOUND", "Order not found.");
      const from = STATUSES.indexOf(o.status), to = STATUSES.indexOf(status);
      if (from < 0) throw new ApiError("CLOSED", `Order is ${o.status}; it can't change.`);
      if (to !== from + 1) throw new ApiError("BAD_STEP", `Next step for ${o.id} is ${STATUSES[from + 1] || "none"}.`);
      o.status = status; o.history.push({ status, at: now(), by: staff });
      save(db); return clone(o);
    },
    /* GET /staff/products */
    async inventory() { await wait(); needStaff(); return clone(load().products.map((p) => ({ ...p, targetStock: targetStock(p), low: isLow(p) }))); },
    /* POST /staff/products */
    async createProduct(p) {
      await wait(); needStaff(); const db = load();
      if (db.products.some((x) => x.sku === p.sku)) throw new ApiError("SKU_TAKEN", "That SKU already exists.");
      db.products.push({ specs: {}, condition: "new", art: "box", ...p }); save(db); return true;
    },
    /* PUT /staff/products/:sku */
    async updateProduct(sku, patch) {
      await wait(); needStaff(); const db = load(); Object.assign(product(db, sku), patch); save(db); return true;
    },
    /* POST /staff/products/:sku/restock  (manual count fix or local purchase) */
    async restock(sku, qty) {
      await wait(); needStaff();
      if (!Number.isInteger(qty) || qty < 1) throw new ApiError("BAD_QTY", "Enter a quantity of 1 or more.");
      const db = load(); product(db, sku).stock += qty; move(db, sku, qty, "restock", "manual"); save(db); return true;
    },
    /* GET /staff/low-stock  (D7, D10) */
    async lowStock() {
      await wait(); needStaff(); const db = load();
      return clone(db.products.filter(isLow).map((p) => {
        const sup = db.supplierCatalog.find((s) => s.sku === p.sku);
        const open = db.purchaseOrders.find((po) => po.sku === p.sku && po.status !== "DELIVERED");
        const suggested = sup ? Math.max(sup.minOrderQty, targetStock(p) - p.stock) : null;
        return { ...p, targetStock: targetStock(p), supplier: sup || null, suggestedQty: suggested, openPo: open ? open.poNumber : null };
      }));
    },
    /* POST /staff/purchase-orders  → sent to the fictional supplier (SIMULATED) */
    async approveReorder(sku, qty) {
      await wait(400);
      const staff = needStaff(); const db = load();
      if (!db.settings.supplierOnline) throw new ApiError("SUPPLIER_DOWN", "Supplier unavailable (simulated). Try again later.");
      const sup = db.supplierCatalog.find((s) => s.sku === sku);
      if (!sup) throw new ApiError("NO_SUPPLIER", "The supplier doesn't sell this item.");
      if (!Number.isInteger(qty) || qty < sup.minOrderQty) throw new ApiError("BELOW_MIN", `The supplier minimum is ${sup.minOrderQty}.`);
      const poNumber = nextId(db.purchaseOrders, "PO", "poNumber");
      db.purchaseOrders.push({ poNumber, sku, supplierSku: sup.supplierSku, qty, unitPrice: sup.unitPrice, status: "CONFIRMED", approvedBy: staff, createdAt: now() });
      save(db); return { poNumber };
    },
    async purchaseOrders() { await wait(); needStaff(); return clone(load().purchaseOrders.sort((a, b) => b.poNumber.localeCompare(a.poNumber))); },
    /* SIMULATED supplier steps (demo buttons) */
    async markShipped(poNumber) {
      await wait(); needStaff(); const db = load();
      const po = db.purchaseOrders.find((x) => x.poNumber === poNumber);
      if (!po || po.status !== "CONFIRMED") throw new ApiError("BAD_STEP", "Only confirmed orders can be marked shipped.");
      po.status = "SHIPPED"; po.shippedAt = now(); save(db); return true;
    },
    async receiveDelivery(poNumber) {
      await wait(400); needStaff(); const db = load();
      const po = db.purchaseOrders.find((x) => x.poNumber === poNumber);
      if (!po || po.status === "DELIVERED") throw new ApiError("BAD_STEP", "This delivery was already received.");
      po.status = "DELIVERED"; po.deliveredAt = now();
      product(db, po.sku).stock += po.qty; move(db, po.sku, po.qty, "supplier", po.poNumber);
      save(db); return true;
    },
    async settings() { await wait(50); return clone(load().settings); },
    async setSupplierOnline(on) { const db = load(); db.settings.supplierOnline = !!on; save(db); return true; },
    async stockMovements() { await wait(); needStaff(); return clone(load().stockMovements.slice().sort((a, b) => b.at.localeCompare(a.at))); },

    /* ---------- Sell to Us (D11, D13) ---------- */
    suggestOffer(type, condition) {
      const db = load();
      const t = String(type || "").toLowerCase();
      const ref = db.products.find((p) => p.condition === "new" && t && (t.includes(p.type.toLowerCase()) || p.type.toLowerCase().includes(t.split(" ")[0])));
      if (!ref || !OFFER_PCT[condition]) return null;
      return { retail: ref.price, pct: OFFER_PCT[condition], offer: Math.round(ref.price * OFFER_PCT[condition]), refName: ref.name };
    },
    /* POST /trade-ins */
    async submitTradeIn(t) {
      await wait(350);
      const customerId = needCustomer(); const db = load();
      const s = PH.api.suggestOffer(t.type, t.condition);
      const id = nextId(db.tradeIns, "TRD"); const at = now();
      db.tradeIns.push({ id, customerId, category: t.category, type: t.type, brand: t.brand, model: t.model, condition: t.condition, askingPrice: t.askingPrice,
        suggestedOffer: s ? s.offer : null, offer: null, photos: t.photos || 0, status: "Under review", createdAt: at, history: [{ status: "Submitted", at }] });
      save(db); return { id };
    },
    async myTradeIns() { await wait(); const id = needCustomer(); return clone(load().tradeIns.filter((t) => t.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); },
    /* customer: PUT /trade-ins/:id/answer */
    async answerOffer(id, accept) {
      await wait(250); const me = needCustomer(); const db = load();
      const t = db.tradeIns.find((x) => x.id === id);
      if (!t || t.customerId !== me) throw new ApiError("NOT_FOUND", "Trade-in not found.");
      if (t.status !== "Offer sent") throw new ApiError("BAD_STEP", "There's no offer to answer.");
      t.status = accept ? "Accepted" : "Declined"; t.history.push({ status: t.status, at: now() }); save(db); return clone(t);
    },
    /* staff */
    async allTradeIns() { await wait(); needStaff(); return clone(load().tradeIns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); },
    async sendOffer(id, amount) {
      await wait(); needStaff(); const db = load(); const t = db.tradeIns.find((x) => x.id === id);
      if (!t || t.status !== "Under review") throw new ApiError("BAD_STEP", "Only items under review can get an offer.");
      if (!(amount > 0)) throw new ApiError("BAD_OFFER", "Enter an offer above ₱0.");
      t.offer = Math.round(amount); t.status = "Offer sent"; t.history.push({ status: "Offer sent", at: now() }); save(db); return true;
    },
    async rejectTradeIn(id) {
      await wait(); needStaff(); const db = load(); const t = db.tradeIns.find((x) => x.id === id);
      if (!t || t.status !== "Under review") throw new ApiError("BAD_STEP", "Only items under review can be declined.");
      t.status = "Rejected"; t.note = t.note || "We couldn't make an offer for this item this time."; t.history.push({ status: "Rejected", at: now() }); save(db); return true;
    },
    async markTradeInReceived(id) {
      await wait(); needStaff(); const db = load(); const t = db.tradeIns.find((x) => x.id === id);
      if (!t || t.status !== "Accepted") throw new ApiError("BAD_STEP", "Only accepted trade-ins can be received.");
      t.status = "Received"; t.history.push({ status: "Received", at: now() }); save(db); return true;
    },
    /* inspected → added to stock as a USED item with its own SKU */
    async addTradeInToStock(id, price) {
      await wait(); needStaff(); const db = load(); const t = db.tradeIns.find((x) => x.id === id);
      if (!t || t.status !== "Received") throw new ApiError("BAD_STEP", "Receive the item first.");
      const base = String(t.model).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);
      const sku = base + "-USED";
      let p = db.products.find((x) => x.sku === sku);
      if (!p) {
        const cat = t.category === "Accessories" ? "accessory" : t.category === "Prebuilt PC" ? "prebuilt" : "part";
        const ref = db.products.find((x) => String(t.type).toLowerCase().includes(x.type.toLowerCase()));
        p = { sku, name: `${t.brand} ${t.model} (Used, ${t.condition})`, category: cat, type: ref ? ref.type : t.type, price: Math.round(price || t.offer * 1.3), stock: 0, lowStockLevel: 0, condition: "used", art: ref ? ref.art : "box", specs: { Condition: `${t.condition}, inspected by staff`, Source: `Trade-in ${t.id}`, Warranty: "30 days" } };
        db.products.push(p);
      }
      p.stock += 1; move(db, sku, 1, "tradeIn", t.id);
      t.status = "In stock"; t.history.push({ status: "In stock", at: now() }); save(db); return { sku };
    },

    /* demo helper */
    resetDemo() { localStorage.removeItem(KEY); Object.keys(localStorage).filter((k) => k.startsWith("ph_cart")).forEach((k) => localStorage.removeItem(k)); load(); }
  };
})();
