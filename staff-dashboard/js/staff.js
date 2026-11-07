/* Staff Portal: one dashboard with tabs (D12).
   Overview · Orders · Inventory · Low stock · Reorders · Trade-ins · Stock log  */
(async () => {
  const { $, $$, esc, money, ico, art, badge, statusBadge, donut, when, date, toast, dialog, modal, errorText, busy, theme } = PH.ui;
  if (!PH.session.staff()) { location.href = "login.html"; return; }
  const staff = PH.session.staff();
  const TABS = [["overview", "Overview"], ["orders", "Orders"], ["inventory", "Inventory"], ["low-stock", "Low stock"], ["reorders", "Reorders"], ["trade-ins", "Trade-ins"], ["stock-log", "Stock log"]];
  const S = PH.api.STATUSES;
  const CAT = { part: "PC Parts", accessory: "Accessories", prebuilt: "Prebuilt" };
  const REASON = { sale: "Sale", cancel: "Cancel", supplier: "Supplier", tradeIn: "Trade-in", restock: "Restock" };
  const st = { orderFilter: "Open", orderQ: "", invCat: "All", invQ: "", logReason: "all", tradeFilter: "All" };
  const TRADE_FILTERS = { All: () => true, "To review": (t) => t.status === "Under review", "Waiting for customer": (t) => t.status === "Offer sent",
    "To receive": (t) => t.status === "Accepted", "To add to stock": (t) => t.status === "Received", Done: (t) => t.status === "In stock", Declined: (t) => ["Declined", "Rejected"].includes(t.status) };

  document.body.insertAdjacentHTML("afterbegin", `<header class="nav"><a class="logo" href="index.html">${PH.ui.logo(false)}<span class="logo-word hide-xs">POWER<em>HOUSE</em></span> <span class="staff-tag">Staff</span></a>
    <div class="nav-right"><span class="hide-sm">${badge("gray", "Warehouse Staff")}</span><b class="hide-sm">${esc(staff)}</b>
      <button class="btn xs icon" id="theme" aria-label="Switch dark mode">${ico("moon", 16)}</button>
      <a href="../store-web/index.html" class="hide-sm small">View store</a><button class="btn xs" id="logout" aria-label="Log out">${ico("logout", 16)}<span class="hide-xs">Log out</span></button></div></header>`);
  $("#theme").onclick = () => theme.set(theme.get() === "dark" ? "light" : "dark");
  $("#logout").onclick = () => { PH.session.staffLogout(); location.href = "login.html"; };

  const tabsHtml = (on) => `<nav class="tabs" aria-label="Dashboard sections">${TABS.map(([id, l]) => `<a class="tab ${id === on ? "on" : ""}" href="#${id}" ${id === on ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
  async function kpis() {
    const [orders, inv, trades] = await Promise.all([PH.api.allOrders(), PH.api.inventory(), PH.api.allTradeIns()]);
    const today = new Date().toDateString();
    return `<div class="kpis">
      <div class="card kpi"><div class="muted">New orders today</div><div class="n">${orders.filter((o) => new Date(o.createdAt).toDateString() === today).length}</div></div>
      <div class="card kpi"><div class="muted">To pack</div><div class="n">${orders.filter((o) => ["Placed", "Packing"].includes(o.status)).length}</div></div>
      <div class="card kpi"><div class="muted">Low-stock items</div><div class="n" style="color:var(--low)">▲ ${inv.filter((p) => p.low).length}</div></div>
      <div class="card kpi"><div class="muted">Trade-ins to review</div><div class="n">${trades.filter((t) => t.status === "Under review").length}</div></div></div>`;
  }
  const page = (title, tab, inner, withKpis = false) => `<h2>${title}</h2>${tabsHtml(tab)}${withKpis ? "<div id='kpis'></div>" : ""}${inner}`;
  const stockBar = (p) => {
    const target = p.targetStock || Math.max(p.lowStockLevel * 3, p.stock, 1);
    const pct = Math.min(100, (p.stock / target) * 100), mark = Math.min(100, (p.lowStockLevel / target) * 100);
    const col = p.stock <= 0 ? "#B4173A" : p.low ? "#D97706" : "#F5C800";
    return `<div class="stockbar" title="Stock ${p.stock}, low level ${p.lowStockLevel}, target ${target}"><div class="track"><div class="fillbar" style="width:${pct}%;background:${col}"></div>${p.lowStockLevel ? `<div class="mark" style="left:${mark}%"></div>` : ""}</div><span class="small"><b>${p.stock}</b> / ${target}</span></div>`;
  };
  const invBadge = (p) => p.stock <= 0 ? badge("out", "Sold out") : p.low ? badge("low", p.stock === p.lowStockLevel ? "At low level" : "Low") : p.condition === "used" ? badge("used", "Used") : badge("ok", "In stock");
  const moveRow = (m, products) => {
    const p = products.find((x) => x.sku === m.sku);
    return `<div class="row keep center" style="gap:14px;padding:11px 0;border-bottom:1px solid var(--line)"><b style="width:52px;font:700 18px var(--font-head);color:${m.change > 0 ? "var(--action-ink)" : "var(--danger)"}">${m.change > 0 ? "+" : "−"}${Math.abs(m.change)}</b>
      <div class="grow"><b class="small">${esc(m.sku)}</b> <span class="small muted">${p ? "· " + esc(p.name) : ""}</span><div class="small muted">${REASON[m.reason] || esc(m.reason)} · ${esc(m.refId)}</div></div><span class="small muted">${when(m.at)}</span></div>`;
  };

  /* ---------- tabs ---------- */
  const views = {
    async overview() {
      const [orders, inv, trades, pos, moves] = await Promise.all([PH.api.allOrders(), PH.api.inventory(), PH.api.allTradeIns(), PH.api.purchaseOrders(), PH.api.stockMovements()]);
      const value = inv.reduce((s, p) => s + p.price * Math.max(p.stock, 0), 0);
      const units = inv.reduce((s, p) => s + Math.max(p.stock, 0), 0);
      const c = { ok: inv.filter((p) => p.stock > 0 && !p.low && p.condition === "new").length, low: inv.filter((p) => p.low && p.stock > 0).length, out: inv.filter((p) => p.stock <= 0).length, used: inv.filter((p) => p.condition === "used" && p.stock > 0).length };
      const toPack = orders.filter((o) => ["Placed", "Packing"].includes(o.status));
      const oldest = toPack.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      const lowList = inv.filter((p) => p.low);
      const ship = pos.filter((p) => p.status === "SHIPPED");
      const review = trades.filter((t) => t.status === "Under review");
      const weekIn = moves.filter((m) => m.change > 0 && m.reason !== "cancel" && Date.now() - new Date(m.at) < 7 * 864e5).reduce((s, m) => s + m.change, 0);
      const h = new Date().getHours();
      const tiles = [
        ["#orders", "box", toPack.length, "orders to pack", oldest ? `oldest ${when(oldest.createdAt)}` : "all packed"],
        ["#low-stock", "alert", lowList.length, "low on stock", [...new Set(lowList.map((p) => p.type))].slice(0, 3).join(", ") || "all good"],
        ["#stock-log", "truck", ship.length, ship.length === 1 ? "delivery on the way" : "deliveries on the way", ship[0] ? ship[0].poNumber : "none right now"],
        ["#trade-ins", "swap", review.length, "trade-ins to review", review.slice(0, 2).map((t) => t.type).join(", ") || "none waiting"],
        ["#inventory", "plus", "+", "add a product", "new SKU"],
        ["#inventory", "chart", units, "units in stock", `${inv.length} SKUs`]
      ];
      return `<div class="small muted">${new Date().toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric", year: "numeric" })} · Power House Warehouse (sample)</div>
        <h2 style="font-size:36px">${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${esc(staff)}</h2>${tabsHtml("overview")}
        <div class="row stack-md" style="margin-top:22px;align-items:stretch">
          <section class="card row keep center" style="width:min(560px,100%);gap:24px;flex-wrap:wrap">
            <div class="grow" style="min-width:230px"><div class="muted">Stock value (retail)</div><div style="font:700 42px var(--font-head)" data-count="${value}" data-money>${money(value)}</div>
              <div class="row keep center" style="gap:10px"><span class="small muted">+${weekIn} units received this week</span></div>
              <div class="g2" style="gap:8px 16px;margin-top:18px">${[["#111111", c.ok + " in stock"], ["#D97706", c.low + " low"], ["#B4173A", c.out + " sold out"], ["#9CA3AF", c.used + " used"]].map(([col, t]) => `<span class="small row keep center" style="gap:8px"><i style="width:12px;height:12px;border-radius:3px;background:${col};display:inline-block"></i>${t}</span>`).join("")}</div></div>
            ${donut([[c.ok, "#111111"], [c.low, "#D97706"], [c.out, "#B4173A"], [c.used, "#9CA3AF"]], 170, 22, inv.length, "SKUs")}
          </section>
          <section class="grow tiles">${tiles.map(([href, i, n, t, d]) => `<a class="card tile" href="${href}" ${t === "add a product" ? 'data-newproduct' : ""} style="padding:18px"><div class="row keep between center"><span class="circ">${ico(i, 20)}</span><b style="font:700 30px var(--font-head)" ${typeof n === "number" ? `data-count="${n}"` : ""}>${n}</b></div><b style="display:block;margin-top:12px">${t}</b><span class="small muted">${esc(d)}</span></a>`).join("")}</section>
        </div>
        <div class="row stack-md" style="margin-top:22px;align-items:stretch">
          <section class="card" style="width:min(560px,100%)"><h3>Quick actions</h3><div class="row keep between wrapflex" style="gap:16px;margin-top:16px">
            ${[["#stock-log", "truck", "Receive delivery"], ["#inventory", "plus", "Restock"], ["#low-stock", "bolt", "Reorder"], ["#orders", "box", "Pack orders"]].map(([h2, i, t]) => `<a class="qa" href="${h2}" style="width:100px"><span class="circ lg">${ico(i, 26)}</span>${t}</a>`).join("")}
            <button class="qa" id="reset" style="width:100px"><span class="circ lg">${ico("refresh", 26)}</span>Reset demo data</button></div></section>
          <section class="card grow"><div class="row keep between center"><h3>Latest stock movements</h3><a class="small" href="#stock-log">Open stock log →</a></div>${moves.slice(0, 4).map((m) => moveRow(m, inv)).join("")}</section>
        </div>`;
    },

    async orders() {
      const orders = await PH.api.allOrders();
      const filters = ["Open", "All", ...S, "Cancelled"];
      const count = (f) => orders.filter((o) => f === "All" || (f === "Open" ? !["Received", "Cancelled"].includes(o.status) : o.status === f)).length;
      const q = st.orderQ.toLowerCase();
      const list = orders.filter((o) => (st.orderFilter === "All" || (st.orderFilter === "Open" ? !["Received", "Cancelled"].includes(o.status) : o.status === st.orderFilter)) && (!q || (o.id + " " + o.customerId).toLowerCase().includes(q)));
      return page("Orders", "orders", `
        <div class="row between center wrapflex" style="margin-top:20px;gap:14px"><div class="chips">${filters.map((f) => `<button class="chip ${f === st.orderFilter ? "on" : ""}" data-ofilter="${f}">${f} · ${count(f)}</button>`).join("")}</div>
        <div style="width:280px" class="search"><label class="sr-only" for="oq">Search orders</label>${ico("search", 18)}<input id="oq" type="search" placeholder="Order or customer ID" value="${esc(st.orderQ)}"></div></div>
        <div class="card table-card" style="margin-top:18px"><div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Updated</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${list.map((o) => {
          const i = S.indexOf(o.status), next = i >= 0 ? S[i + 1] : null, last = o.history[o.history.length - 1];
          return `<tr><td class="nowrap"><b>${esc(o.id)}</b></td><td class="nowrap">${esc(o.customerId)}</td><td class="small">${o.items.map((x) => `${esc(x.name)} ×${x.qty}`).join("<br>")}</td><td>${money(o.total)}</td>
            <td>${o.paymentMethod === "COD" ? "COD" : `GCash <span class="badge sim">SIM</span>`}</td><td>${statusBadge(o.status)}${o.status === "Cancelled" ? `<div class="small muted">${PH.ui.cancelledBy(o)}</div>` : ""}</td><td class="small">${when(last.at)}</td>
            <td><div class="row keep" style="gap:8px;justify-content:flex-end">${next ? `<button class="btn p xs" data-next="${o.id}" data-to="${next}">Mark as ${next}</button>` : ""}${["Placed", "Packing"].includes(o.status) ? `<button class="btn dg xs" data-ocancel="${o.id}">Cancel</button>` : ""}${!next && !["Placed", "Packing"].includes(o.status) ? '<span class="small muted">Closed</span>' : ""}</div></td></tr>`;
        }).join("") || `<tr><td colspan="8" class="muted" style="text-align:center;padding:28px">No orders match.</td></tr>`}
        </tbody></table></div></div>
        <p class="small muted">Status moves one step at a time: ${S.join(" → ")}. Cancel is only possible before Shipping, and it puts the stock back.</p>`, true);
    },

    async inventory() {
      const inv = await PH.api.inventory();
      const cats = ["All", "part", "accessory", "prebuilt", "used"];
      const label = (c) => (c === "All" ? "All" : c === "used" ? "Used" : CAT[c]);
      const n = (c) => inv.filter((p) => c === "All" || (c === "used" ? p.condition === "used" : p.category === c)).length;
      const q = st.invQ.toLowerCase();
      const urgency = (p) => (p.stock <= 0 ? 0 : p.low ? 1 : 2);
      const list = inv.filter((p) => (st.invCat === "All" || (st.invCat === "used" ? p.condition === "used" : p.category === st.invCat)) && (!q || (p.sku + " " + p.name).toLowerCase().includes(q))).sort((a, b) => urgency(a) - urgency(b) || a.name.localeCompare(b.name));
      return `<h2>Warehouse</h2>${tabsHtml("inventory")}
        <div class="row between center wrapflex" style="margin-top:20px;gap:14px"><div class="row keep center wrapflex" style="gap:12px">
          <div class="search" style="width:260px"><label class="sr-only" for="iq">Search stock</label>${ico("search", 18)}<input id="iq" type="search" placeholder="Search SKU or name" value="${esc(st.invQ)}"></div>
          <div class="chips">${cats.map((c) => `<button class="chip ${c === st.invCat ? "on" : ""}" data-icat="${c}">${label(c)} · ${n(c)}</button>`).join("")}</div></div>
          <button class="btn p sm" id="newp">${ico("plus", 18, "currentColor")}New product</button></div>
        <div class="card table-card" style="margin-top:18px"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Stock (bar = target, line = low level)</th><th>Low level</th><th>Price</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${list.map((p) => `<tr><td><div class="row keep center" style="gap:12px"><div class="art" style="width:64px;height:44px;flex-shrink:0">${art(p.art, p.name)}</div><div><b>${esc(p.name)}</b><div class="small muted">${esc(p.sku)}</div></div></div></td>
          <td>${esc(CAT[p.category] || p.category)}<div class="small muted">${esc(p.type)}</div></td><td>${stockBar(p)}</td><td>${p.lowStockLevel}</td><td>${money(p.price)}</td><td>${invBadge(p)}</td>
          <td><div class="row keep" style="gap:8px;justify-content:flex-end">${p.low ? `<a class="btn p xs" href="#low-stock">Reorder</a>` : ""}<button class="btn xs" data-restock="${esc(p.sku)}">Restock</button><button class="btn xs icon" data-edit="${esc(p.sku)}" aria-label="Edit ${esc(p.name)}">${ico("edit", 16)}</button></div></td></tr>`).join("") || `<tr><td colspan="7" class="muted" style="text-align:center;padding:28px">No products match.</td></tr>`}
        </tbody></table></div></div>
        <p class="small muted">Showing ${list.length} of ${inv.length} SKUs · most urgent first · target stock = 3 × low level</p>`;
    },

    async "low-stock"() {
      const [low, set] = await Promise.all([PH.api.lowStock(), PH.api.settings()]);
      return page("Low stock", "low-stock", `
        ${set.supplierOnline ? "" : `<div class="note warn" style="margin-top:18px">${ico("alert", 16)} The supplier is switched off (simulated outage). Reorders will fail until you turn it back on in <a href="#reorders">Reorders</a>.</div>`}
        <div class="card table-card" style="margin-top:18px"><div class="table-wrap"><table><thead><tr><th>SKU</th><th>Product</th><th>Stock</th><th>Low level</th><th>Target</th><th>Supplier min.</th><th>Order qty</th><th>Est. cost</th><th><span class="sr-only">Action</span></th></tr></thead><tbody>
        ${low.map((p) => `<tr><td class="small nowrap">${esc(p.sku)}</td><td><b>${esc(p.name)}</b></td><td>${badge(p.stock <= 0 ? "out" : "low", String(p.stock))}</td><td>${p.lowStockLevel}</td><td>${p.targetStock}</td>
          <td>${p.supplier ? p.supplier.minOrderQty : "—"}</td>
          <td>${p.supplier ? `<label class="sr-only" for="q-${esc(p.sku)}">Order quantity</label><input type="number" id="q-${esc(p.sku)}" min="${p.supplier.minOrderQty}" value="${p.suggestedQty}" style="width:90px;height:40px" data-qty="${esc(p.sku)}" data-unit="${p.supplier.unitPrice}">` : "—"}</td>
          <td data-cost="${esc(p.sku)}">${p.supplier ? money(p.suggestedQty * p.supplier.unitPrice) : "—"}</td>
          <td>${p.supplier ? `<button class="btn p xs" data-approve="${esc(p.sku)}">Approve reorder</button>${p.openPo ? `<div class="small muted" style="margin-top:4px">${esc(p.openPo)} already open</div>` : ""}` : '<span class="small muted">Built in-house</span>'}</td></tr>`).join("") || `<tr><td colspan="9" style="text-align:center;padding:28px"><b>Nothing is low.</b> <span class="muted">Every product is above its own low-stock level.</span></td></tr>`}
        </tbody></table></div></div>
        <div class="note" style="margin-top:18px">Suggested order = the larger of the supplier minimum and (target stock − current stock). Staff can change it before approving. The order goes to the fictional supplier (SIMULATED).</div>`);
    },

    async reorders() {
      const [pos, set, inv] = await Promise.all([PH.api.purchaseOrders(), PH.api.settings(), PH.api.inventory()]);
      return page("Reorders", "reorders", `
        <div class="note row keep between center wrapflex" style="margin-top:18px;gap:14px"><span>Supplier: <b>${esc(set.supplierName)} (Fictional company: simulated supplier)</b>. Mock API, not a real company.</span>
          <label class="row keep center" style="gap:10px;margin:0;color:var(--ink)">Supplier online <span class="toggle"><input type="checkbox" id="sup" ${set.supplierOnline ? "checked" : ""}><span></span></span></label></div>
        <div class="card table-card" style="margin-top:18px"><div class="table-wrap"><table><thead><tr><th>PO</th><th>Our SKU</th><th>Supplier SKU</th><th>Qty</th><th>Unit price</th><th>Total</th><th>Status</th><th>Approved</th><th><span class="sr-only">Action</span></th></tr></thead><tbody>
        ${pos.map((po) => `<tr><td class="nowrap"><b>${esc(po.poNumber)}</b></td><td class="small nowrap">${esc(po.sku)}<div class="muted">${esc((inv.find((p) => p.sku === po.sku) || {}).name || "")}</div></td><td class="small">${esc(po.supplierSku)}</td><td>${po.qty}</td><td>${money(po.unitPrice)}</td><td>${money(po.qty * po.unitPrice)}</td>
          <td>${statusBadge(po.status)}${po.status === "DELIVERED" ? ` <span class="small muted">+${po.qty} stock</span>` : ""}</td><td class="small">${date(po.createdAt)} · ${esc(po.approvedBy)}</td>
          <td>${po.status === "CONFIRMED" ? `<button class="btn o xs" data-ship="${po.poNumber}">Mark shipped (simulated)</button>` : po.status === "SHIPPED" ? `<button class="btn p xs" data-receive="${po.poNumber}">Simulate delivery</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="9" class="muted" style="text-align:center;padding:28px">No purchase orders yet. Approve one in Low stock.</td></tr>`}
        </tbody></table></div></div>
        <p class="small muted">Supplier status flow: Confirmed → Shipped → Delivered. Delivery adds the quantity to our stock and logs it in the Stock log. Turn the supplier off to test the "supplier unavailable" case.</p>`);
    },

    async "trade-ins"() {
      const all = await PH.api.allTradeIns();
      const list = all.filter(TRADE_FILTERS[st.tradeFilter]);
      return page("Trade-ins", "trade-ins", `
        <div class="chips" style="margin-top:20px">${Object.keys(TRADE_FILTERS).map((f) => `<button class="chip ${f === st.tradeFilter ? "on" : ""}" data-tfilter="${f}">${f} · ${all.filter(TRADE_FILTERS[f]).length}</button>`).join("")}</div>
        <div class="card table-card" style="margin-top:18px"><div class="table-wrap"><table><thead><tr><th>Trade-in</th><th>Customer</th><th>Item</th><th>Condition</th><th>Asking</th><th>Suggested</th><th>Offer</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${list.map((t) => {
          let act = "", offer = t.offer ? money(t.offer) : "—";
          if (t.status === "Under review") { offer = `<label class="sr-only" for="o-${t.id}">Offer</label><input type="number" id="o-${t.id}" value="${t.suggestedOffer || ""}" placeholder="₱" style="width:92px;height:38px">`; act = `<button class="btn p xs" data-offer="${t.id}">Send offer</button><button class="btn dg xs" data-reject="${t.id}">Decline</button>`; }
          if (t.status === "Offer sent") act = '<span class="small muted">Waiting for customer</span>';
          if (t.status === "Accepted") act = `<button class="btn p xs" data-recv="${t.id}">Mark received</button>`;
          if (t.status === "Received") act = `<label class="sr-only" for="r-${t.id}">Resale price</label><input type="number" id="r-${t.id}" value="${Math.round((t.offer || 0) * 1.3)}" style="width:100%;height:36px" title="Resale price"><button class="btn p xs" data-tostock="${t.id}">Add to stock (used)</button>`;
          if (t.status === "Declined") act = '<span class="small muted">Customer said no</span>';
          if (t.status === "Rejected") act = `<span class="small muted">${esc(t.note || "Declined")}</span>`;
          if (t.status === "In stock") act = '<span class="small muted">Done</span>';
          const pct = PH.api.OFFER_PCT[t.condition];
          return `<tr><td class="nowrap"><b>${esc(t.id)}</b><div class="small muted">${date(t.createdAt)}</div></td><td class="nowrap">${esc(t.customerId)}</td><td><b class="nowrap">${esc(t.model)}</b><div class="small muted nowrap">${esc(t.type)} · ${t.photos || 0} ${t.photos === 1 ? "photo" : "photos"}</div></td>
            <td>${esc(t.condition)}</td><td>${money(t.askingPrice)}</td><td>${t.suggestedOffer ? `${money(t.suggestedOffer)} <span class="small muted">(${Math.round(pct * 100)}%)</span>` : '<span class="small muted">price by hand</span>'}</td>
            <td>${offer}</td><td>${statusBadge(t.status, "trade")}</td><td><div class="acts">${act}</div></td></tr>`;
        }).join("") || `<tr><td colspan="9" class="muted" style="text-align:center;padding:28px">No trade-ins in “${esc(st.tradeFilter)}”.</td></tr>`}
        </tbody></table></div></div>
        <p class="small muted">Flow: Under review → Offer sent → Accepted (customer) → Received → In stock (as a used item with its own SKU). Suggested offer: Like new 60%, Good 45%, Fair 30% of our retail price.</p>`);
    },

    async "stock-log"() {
      const [moves, pos, inv, set] = await Promise.all([PH.api.stockMovements(), PH.api.purchaseOrders(), PH.api.inventory(), PH.api.settings()]);
      const incoming = pos.filter((p) => p.status !== "DELIVERED");
      const list = moves.filter((m) => st.logReason === "all" || m.reason === st.logReason);
      const routeCard = (po) => {
        const p = inv.find((x) => x.sku === po.sku) || { name: po.sku, stock: 0 };
        const shipped = po.status === "SHIPPED";
        return `<div style="border-radius:20px;background:#111111;color:#fff;padding:22px;margin-top:16px">
          <div class="row keep between"><div><div class="small" style="color:#A9B4C8">From</div><b style="font:700 18px var(--font-head)">${esc(set.supplierName)}</b><div class="small" style="color:#A9B4C8">Fictional company · SIMULATED</div></div>
          <div style="text-align:right"><div class="small" style="color:#A9B4C8">To</div><b style="font:700 18px var(--font-head)">Power House Warehouse</b><div class="small" style="color:#A9B4C8">${esc(po.poNumber)}</div></div></div>
          <div style="position:relative;height:40px;margin:20px 0 6px"><div style="position:absolute;top:18px;left:0;right:0;height:4px;border-radius:2px;background:#3A445C"></div><div style="position:absolute;top:18px;left:0;width:${shipped ? 70 : 15}%;height:4px;border-radius:2px;background:#F5C800"></div>
            <div style="position:absolute;left:calc(${shipped ? 70 : 15}% - 22px);top:0;width:44px;height:40px;border-radius:6px;background:#FFE500;color:#111111;display:flex;align-items:center;justify-content:center">${ico("truck", 22, "currentColor")}</div></div>
          <div class="row keep between"><span class="small" style="color:#A9B4C8">${shipped ? "Shipped " + date(po.shippedAt) : "Confirmed " + date(po.createdAt)}</span><b style="color:#DAFB71">${shipped ? "On the way" : "Being prepared"}</b></div></div>
          <div style="margin-top:14px"><div class="leader"><span>Items</span><span class="fill"></span><span>${esc(p.name)} × ${po.qty}</span></div><div class="leader"><span>Supplier SKU → our SKU</span><span class="fill"></span><span>${esc(po.supplierSku)} → ${esc(po.sku)}</span></div>
          <div class="leader"><span>Stock after receiving</span><span class="fill"></span><b>${p.stock} → ${p.stock + po.qty}</b></div></div>
          <div class="actions" style="margin-top:18px">${shipped ? `<button class="btn p grow" data-receive="${po.poNumber}">${ico("check", 18, "currentColor")}Receive and add ${po.qty} to stock</button>` : `<button class="btn o grow" data-ship="${po.poNumber}">Mark shipped (simulated)</button>`}</div>`;
      };
      return `<h2>Warehouse</h2>${tabsHtml("stock-log")}
        <div class="row stack-md" style="margin-top:22px;align-items:flex-start">
          <section class="card" style="width:min(620px,100%)"><div class="row keep between center"><h3>Incoming deliveries</h3>${badge(incoming.length ? "low" : "gray", incoming.length + " open")}</div>
            ${incoming.length ? incoming.map(routeCard).join('<div style="border-top:1px solid var(--line);margin:22px 0 0"></div>') : `<div style="text-align:center;padding:30px 10px"><span class="circ lg" style="margin:0 auto">${ico("truck", 26)}</span><b style="display:block;margin-top:12px">No deliveries on the way</b><p class="small muted">Approve a reorder in Low stock to order from the supplier.</p><a class="btn sm" href="#low-stock">Go to Low stock</a></div>`}</section>
          <section class="card grow"><div class="row keep between center wrapflex" style="gap:10px"><h3>Stock log</h3><div class="chips">${[["all", "All"], ...Object.entries(REASON)].map(([v, l]) => `<button class="chip ${st.logReason === v ? "on" : ""}" data-reason="${v}" style="padding:7px 12px;font-size:13px">${l}</button>`).join("")}</div></div>
            <div style="margin-top:8px">${list.slice(0, 40).map((m) => moveRow(m, inv)).join("") || '<p class="muted">No movements for this reason.</p>'}</div>
            <p class="small muted" style="margin-top:12px">Every stock change is logged with a reason, so the count can always be traced.</p></section></div>`;
    }
  };

  async function route() {
    const tab = (location.hash.slice(1) || "overview").split("?")[0];
    const view = views[tab] || views.overview;
    try {
      $("#app").innerHTML = await view();
      if ($("#kpis")) $("#kpis").innerHTML = await kpis();
    } catch (e) {
      if (e.code === "STAFF_ONLY") { location.href = "login.html"; return; }
      $("#app").innerHTML = `<div class="note bad">${esc(errorText(e))}</div>`;
    }
    document.title = (TABS.find((t) => t[0] === tab) || TABS[0])[1] + " · Power House Staff Portal";
  }
  const refresh = () => route();

  /* ---------- modals ---------- */
  function productForm(p) {
    const isNew = !p;
    p = p || { sku: "", name: "", category: "part", type: "", price: "", stock: 0, lowStockLevel: 5 };
    modal(`<h2>${isNew ? "New product" : "Edit product"}</h2><form id="pf" novalidate style="margin-top:18px">
      ${isNew ? `<div class="field"><label for="f-sku">SKU</label><input id="f-sku" placeholder="e.g. RAM-DDR5-32GB"><div class="help">Capital letters, numbers and dashes</div></div>` : `<p class="small muted">SKU ${esc(p.sku)}</p>`}
      <div class="field"><label for="f-name">Name</label><input id="f-name" value="${esc(p.name)}"></div>
      <div class="row" style="gap:16px"><div class="field grow"><label for="f-cat">Category</label><select id="f-cat" ${isNew ? "" : "disabled"}>${Object.entries(CAT).map(([v, l]) => `<option value="${v}" ${p.category === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field grow"><label for="f-type">Type</label><input id="f-type" value="${esc(p.type)}" placeholder="e.g. RAM"></div></div>
      <div class="row" style="gap:16px"><div class="field grow"><label for="f-price">Price (₱)</label><input id="f-price" type="number" min="1" value="${p.price}"></div>
      ${isNew ? `<div class="field grow"><label for="f-stock">Starting stock</label><input id="f-stock" type="number" min="0" value="0"></div>` : ""}
      <div class="field grow"><label for="f-low">Low-stock level</label><input id="f-low" type="number" min="0" value="${p.lowStockLevel}"></div></div>
      <div class="err hidden" id="f-err"></div>
      <div class="actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn p grow">${isNew ? "Add product" : "Save changes"}</button></div></form>`, (o, close) => {
      o.querySelector("#pf").addEventListener("submit", async (e) => {
        e.preventDefault();
        const v = (id) => o.querySelector(id) && o.querySelector(id).value.trim();
        const data = { name: v("#f-name"), type: v("#f-type"), price: Number(v("#f-price")), lowStockLevel: Number(v("#f-low")) };
        let err = !data.name ? "Enter a name." : !data.type ? "Enter a type." : !(data.price > 0) ? "Price must be above ₱0." : !(data.lowStockLevel >= 0) ? "Low-stock level can't be negative." : "";
        if (isNew) { data.sku = v("#f-sku").toUpperCase(); data.category = v("#f-cat"); data.stock = Number(v("#f-stock")) || 0; if (!err && !/^[A-Z0-9-]{4,}$/.test(data.sku)) err = "SKU: at least 4 capital letters, numbers or dashes."; }
        const box = o.querySelector("#f-err"); box.textContent = err; box.classList.toggle("hidden", !err); if (err) return;
        try { isNew ? await PH.api.createProduct(data) : await PH.api.updateProduct(p.sku, data); close(); toast(isNew ? `${data.name} added` : "Changes saved"); refresh(); }
        catch (x) { box.textContent = errorText(x); box.classList.remove("hidden"); }
      });
    });
  }
  function restockForm(p) {
    modal(`<h2>Restock</h2><p class="muted">${esc(p.name)} · now ${p.stock} in stock</p><form id="rf" novalidate>
      <div class="field" style="margin-top:18px"><label for="r-qty">Units to add</label><input id="r-qty" type="number" min="1" value="1"><div class="help">For a count fix or a local purchase. Supplier orders go through Low stock.</div></div>
      <div class="err hidden" id="r-err"></div><div class="actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn p grow">Add to stock</button></div></form>`, (o, close) => {
      o.querySelector("#rf").addEventListener("submit", async (e) => {
        e.preventDefault(); const q = Number(o.querySelector("#r-qty").value);
        try { await PH.api.restock(p.sku, q); close(); toast(`+${q} ${p.name}`); refresh(); }
        catch (x) { const b = o.querySelector("#r-err"); b.textContent = errorText(x); b.classList.remove("hidden"); }
      });
    });
  }

  /* ---------- actions ---------- */
  $("#app").addEventListener("click", async (e) => {
    const t = e.target.closest("button,[data-newproduct]"); if (!t) return;
    const d = t.dataset;
    const run = async (fn, ok) => { busy(t, true, "…"); try { await fn(); if (ok) toast(ok); await refresh(); } catch (x) { busy(t, false); toast(errorText(x), true); } };
    if (d.newproduct !== undefined) { e.preventDefault(); location.hash = "inventory"; setTimeout(() => productForm(null), 300); return; }
    if (d.ofilter) { st.orderFilter = d.ofilter; refresh(); }
    if (d.next) { if (await dialog({ title: `Mark ${d.next} as ${d.to}?`, body: "The customer sees this update in My Orders.", confirm: `Mark as ${d.to}`, cancel: "Not yet", icon: "box" })) run(() => PH.api.setOrderStatus(d.next, d.to), `${d.next} is now ${d.to}`); }
    if (d.ocancel) { if (await dialog({ title: `Cancel ${d.ocancel}?`, body: "The items go back into stock. You can't undo this.", confirm: "Cancel order", cancel: "Keep the order", danger: true, icon: "alert" })) run(() => PH.api.cancelOrder(d.ocancel, { asStaff: true }), `${d.ocancel} cancelled, stock returned`); }
    if (d.icat) { st.invCat = d.icat; refresh(); }
    if (t.id === "newp") productForm(null);
    if (d.edit) productForm((await PH.api.inventory()).find((p) => p.sku === d.edit));
    if (d.restock) restockForm((await PH.api.inventory()).find((p) => p.sku === d.restock));
    if (d.approve) { const q = Number($(`[data-qty="${d.approve}"]`).value); run(async () => { const r = await PH.api.approveReorder(d.approve, q); toast(`${r.poNumber} sent to the supplier (simulated)`); }); }
    if (d.ship) run(() => PH.api.markShipped(d.ship), `${d.ship} marked shipped`);
    if (d.receive) run(() => PH.api.receiveDelivery(d.receive), `${d.receive} received, stock added`);
    if (d.offer) { const v = Number($(`#o-${d.offer}`).value); run(() => PH.api.sendOffer(d.offer, v), `Offer sent for ${d.offer}`); }
    if (d.reject) { if (await dialog({ title: `Decline ${d.reject}?`, body: "The customer is told we can't make an offer this time.", confirm: "Decline trade-in", cancel: "Keep reviewing", danger: true, icon: "alert" })) run(() => PH.api.rejectTradeIn(d.reject), `${d.reject} declined`); }
    if (d.recv) run(() => PH.api.markTradeInReceived(d.recv), `${d.recv} received`);
    if (d.tostock) { const v = Number($(`#r-${d.tostock}`).value); run(async () => { const r = await PH.api.addTradeInToStock(d.tostock, v); toast(`Added to stock as ${r.sku}`); }); }
    if (d.reason) { st.logReason = d.reason; refresh(); }
    if (d.tfilter) { st.tradeFilter = d.tfilter; refresh(); }
    if (t.id === "reset") { if (await dialog({ title: "Reset demo data?", body: "Orders, stock, trade-ins and purchase orders go back to the sample data.", confirm: "Reset demo data", cancel: "Keep my data", icon: "refresh" })) { PH.api.resetDemo(); toast("Demo data reset"); refresh(); } }
  });
  $("#app").addEventListener("input", (e) => {
    if (e.target.id === "oq") { st.orderQ = e.target.value; clearTimeout(e.target._t); e.target._t = setTimeout(async () => { await refresh(); const i = $("#oq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); }
    if (e.target.id === "iq") { st.invQ = e.target.value; clearTimeout(e.target._t); e.target._t = setTimeout(async () => { await refresh(); const i = $("#iq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); }
    if (e.target.dataset.qty) { const c = $(`[data-cost="${e.target.dataset.qty}"]`); if (c) c.textContent = money((Number(e.target.value) || 0) * Number(e.target.dataset.unit)); }
  });
  $("#app").addEventListener("change", async (e) => { if (e.target.id === "sup") { await PH.api.setSupplierOnline(e.target.checked); toast(e.target.checked ? "Supplier back online (simulated)" : "Supplier switched off (simulated outage)"); refresh(); } });
  window.addEventListener("hashchange", route);
  route();
})();
