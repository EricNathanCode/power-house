/* Power House API client (website side).
   ---------------------------------------------------------------
   Every function here calls the real Warehouse REST API (warehouse-api/, Node + Express + Neon)
   with fetch(). The names and data shapes are the same as the old browser-only mock, so the pages
   did not have to change. The rules (stock check, cancel before Shipping, staff-only actions...)
   live on the SERVER; the browser can't skip them.

   Where is the API?
   - page opened from the API server itself (npm start → http://localhost:4000): same address, /api
   - page opened from another local server (e.g. port 5500): the API on port 4000 of the same host
   - override for testing: localStorage.ph_api = "http://other-host:4000/api"

   Two small things stay in the browser on purpose:
   - the cart (per account), like most stores
   - a copy of "who is logged in" so pages can decide instantly (the server checks on every call
     and on every page load, and clears the copy if the login has ended)
*/
(function () {
  const STATUSES = ["Placed", "Packing", "Shipping", "Out for Delivery", "Received"];
  const OFFER_PCT = { "Like new": 0.6, "Good": 0.45, "Fair": 0.3 }; // D11 (the server uses the same numbers)
  const SHIPPING_FEE = 150;
  const FREE_SHIPPING_FROM = 30000;

  const API = (() => {
    try { const o = localStorage.getItem("ph_api"); if (o) return o.replace(/\/$/, ""); } catch (e) { /* ignore */ }
    if (location.protocol === "file:") return "http://localhost:4000/api";
    return location.port === "4000" ? "/api" : `${location.protocol}//${location.hostname}:4000/api`;
  })();

  class ApiError extends Error {
    constructor(code, message, extra) { super(message); this.code = code; Object.assign(this, extra || {}); }
  }

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* one place that talks to the server */
  async function request(method, path, body) {
    let res;
    try {
      res = await fetch(API + path, {
        method, credentials: "include",
        headers: body === undefined ? {} : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      document.dispatchEvent(new CustomEvent("ph:offline")); // the page shows a banner (ui.js)
      throw new ApiError("NETWORK", "Can't reach the Power House server. Start it (npm start in the warehouse-api folder), then try again.");
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      const er = (data && data.error) || { code: "HTTP_" + res.status, message: "Something went wrong. Please try again." };
      if (er.code === "LOGIN_REQUIRED") store.del("ph_customer");
      if (er.code === "STAFF_ONLY") store.del("ph_staff");
      const { code, message, ...extra } = er;
      throw new ApiError(code, message, extra);
    }
    return data;
  }
  const enc = encodeURIComponent;

  /* ---------- product list kept in memory, so the cart can be priced instantly ---------- */
  let catalog = [];
  const bySku = () => new Map(catalog.map((p) => [p.sku, p]));
  function remember(list) {
    const m = bySku();
    list.forEach((p) => m.set(p.sku, p));
    catalog = [...m.values()];
    return list;
  }
  let catalogReady = null;
  const loadCatalog = () => (catalogReady = request("GET", "/products").then((l) => { catalog = l; return l; }).catch(() => catalog));
  loadCatalog();

  /* trade-in reference product: same choice as the server (warehouse-api/src/services/tradeIns.js) */
  function pickRef(list, type) {
    const t = String(type || "").toLowerCase();
    if (!t) return null;
    const hint = (t.match(/\(([^)]+)\)/) || [])[1];
    const cands = list.filter((p) => p.condition === "new" && (t.includes(p.type.toLowerCase()) || p.type.toLowerCase().includes(t.split(" ")[0])))
      .sort((a, b) => a.sku.localeCompare(b.sku));
    return (hint && cands.find((p) => (p.name + " " + p.sku).toLowerCase().includes(hint))) || cands[0] || null;
  }

  /* ---------- who is logged in (copy of the server's answer) ---------- */
  PH.session = {
    customerId: () => store.get("ph_customer"),
    staff: () => store.get("ph_staff"),
    logout: () => { store.del("ph_customer"); fetch(API + "/auth/logout", { method: "POST", credentials: "include", keepalive: true }).catch(() => {}); },
    staffLogout: () => { store.del("ph_staff"); fetch(API + "/staff/logout", { method: "POST", credentials: "include", keepalive: true }).catch(() => {}); }
  };

  /* ---------- cart (kept in the browser, one per account) ---------- */
  PH.cart = {
    key() { const id = PH.session.customerId(); return id ? "ph_cart:" + id : null; },
    get() { const k = this.key(); if (!k) return []; try { return JSON.parse(store.get(k)) || []; } catch (e) { return []; } },
    set(items) { const k = this.key(); if (!k) return; store.set(k, JSON.stringify(items)); document.dispatchEvent(new CustomEvent("cart:change")); },
    add(sku, qty = 1) { const c = this.get(); const it = c.find((x) => x.sku === sku); if (it) it.qty += qty; else c.push({ sku, qty }); this.set(c); },
    update(sku, qty) { this.set(this.get().map((x) => (x.sku === sku ? { ...x, qty } : x)).filter((x) => x.qty > 0)); },
    remove(sku) { this.set(this.get().filter((x) => x.sku !== sku)); },
    clear() { this.set([]); },
    count() { return this.get().reduce((s, x) => s + x.qty, 0); }
  };

  PH.api = {
    ApiError, STATUSES, OFFER_PCT, SHIPPING_FEE, FREE_SHIPPING_FROM, BASE: API,

    /* ---------- catalog (public) ---------- */
    async listProducts({ category, q } = {}) {
      const qs = new URLSearchParams();
      if (category) qs.set("category", category);
      if (q) qs.set("q", q);
      return remember(await request("GET", "/products" + (qs.toString() ? "?" + qs : "")));
    },
    async getProduct(sku) { const p = await request("GET", "/products/" + enc(sku)); remember([p]); return p; },

    /* price a cart right away from the product list (the server prices it again when the order is placed) */
    quote(lines) {
      const m = bySku();
      const items = lines.map((l) => { const p = m.get(l.sku); return p ? { sku: p.sku, name: p.name, price: p.price, qty: l.qty, stock: p.stock, art: p.art, condition: p.condition } : null; }).filter(Boolean);
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
      return { items, subtotal, shipping, total: subtotal + shipping };
    },

    /* ---------- customer account ---------- */
    async signup({ name, email, password, phone }) {
      const r = await request("POST", "/auth/signup", { name, email, password, phone });
      store.set("ph_customer", r.id); return r;
    },
    async login(email, password) {
      const r = await request("POST", "/auth/login", { email, password });
      store.set("ph_customer", r.id); return r;
    },
    /* the logged-in customer, or null. Every page calls this first (header), so it also waits for the product list. */
    async me() {
      let c = null, offline = false;
      try { c = await request("GET", "/me"); } catch (e) { offline = e.code === "NETWORK"; }
      await catalogReady;
      if (!offline) { if (c) store.set("ph_customer", c.id); else store.del("ph_customer"); } // server down: keep the copy
      return c;
    },
    async saveAddress(address) { return request("PUT", "/me/address", address); },
    async updateProfile({ name, email, phone }) { return request("PUT", "/me", { name, email, phone }); },
    async changePassword(current, next) { return request("PUT", "/me/password", { current, next }); },

    /* ---------- orders ---------- */
    /* SIMULATED GCash: no real money, no real GCash account */
    async simulateGcash(amount, outcome) { return request("POST", "/payments/gcash-sim", { amount, outcome }); },
    /* D6: the server checks stock, saves the order and takes the stock in one transaction */
    async placeOrder({ lines, paymentMethod, paymentRef, address }) {
      const r = await request("POST", "/orders", { lines, paymentMethod, paymentRef, address });
      loadCatalog(); // stock changed
      return r;
    },
    async getOrder(id) { return request("GET", "/orders/" + enc(id)); },
    async myOrders() { return request("GET", "/me/orders"); },
    /* D5: only before Shipping; stock goes back */
    async cancelOrder(id, { asStaff = false } = {}) {
      return request("PUT", (asStaff ? "/staff/orders/" : "/orders/") + enc(id) + "/cancel");
    },

    /* ---------- staff (every call needs the staff login, D9) ---------- */
    async staffLogin(username, password) {
      const r = await request("POST", "/staff/login", { username, password });
      store.set("ph_staff", r.username); return r;
    },
    async allOrders() { return request("GET", "/staff/orders"); },
    async setOrderStatus(id, status) { return request("PUT", "/staff/orders/" + enc(id) + "/status", { status }); },
    async inventory() { return request("GET", "/staff/products"); },
    async createProduct(p) { return request("POST", "/staff/products", p); },
    async updateProduct(sku, patch) { return request("PUT", "/staff/products/" + enc(sku), patch); },
    async restock(sku, qty) { return request("POST", "/staff/products/" + enc(sku) + "/restock", { qty }); },
    async lowStock() { return request("GET", "/staff/low-stock"); },
    /* reorders go to the SIMULATED supplier */
    async approveReorder(sku, qty) { return request("POST", "/staff/purchase-orders", { sku, qty }); },
    async purchaseOrders() { return request("GET", "/staff/purchase-orders"); },
    async markShipped(poNumber) { return request("PUT", "/staff/purchase-orders/" + enc(poNumber) + "/ship"); },
    async receiveDelivery(poNumber) { return request("PUT", "/staff/purchase-orders/" + enc(poNumber) + "/receive"); },
    async settings() { return request("GET", "/settings"); },
    async setSupplierOnline(on) { return request("PUT", "/staff/settings/supplier", { online: !!on }); },
    async stockMovements() { return request("GET", "/staff/stock-movements"); },

    /* ---------- Sell to Us (D11, D13) ---------- */
    /* instant estimate for the form; the server works out the same number when the item is submitted */
    suggestOffer(type, condition) {
      const ref = pickRef(catalog, type);
      if (!ref || !OFFER_PCT[condition]) return null;
      return { retail: ref.price, pct: OFFER_PCT[condition], offer: Math.round(ref.price * OFFER_PCT[condition]), refName: ref.name };
    },
    async submitTradeIn(t) { return request("POST", "/trade-ins", t); },
    async myTradeIns() { return request("GET", "/me/trade-ins"); },
    async answerOffer(id, accept) { return request("PUT", "/trade-ins/" + enc(id) + "/answer", { accept: !!accept }); },
    async allTradeIns() { return request("GET", "/staff/trade-ins"); },
    async sendOffer(id, amount) { return request("PUT", "/staff/trade-ins/" + enc(id) + "/offer", { amount }); },
    async rejectTradeIn(id) { return request("PUT", "/staff/trade-ins/" + enc(id) + "/reject", {}); },
    async markTradeInReceived(id) { return request("PUT", "/staff/trade-ins/" + enc(id) + "/receive"); },
    async addTradeInToStock(id, price) { return request("PUT", "/staff/trade-ins/" + enc(id) + "/to-stock", { price }); },

    /* demo helper: sample data back on the server (only if the server allows it) + empty carts */
    async resetDemo() {
      await request("POST", "/demo/reset");
      try { Object.keys(localStorage).filter((k) => k.startsWith("ph_cart")).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      await loadCatalog();
    }
  };
})();
