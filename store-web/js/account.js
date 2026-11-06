/* 11 My Account: personal greeting, compact rows, settings incl. dark mode (UI ideas 1, 5, 6) */
(async () => {
  const { $, esc, money, ico, art, statusBadge, date, theme, toast } = PH.ui;
  if (!PH.ui.requireLogin()) return;
  const me = await PH.ui.storeHeader();
  const [orders, trades] = await Promise.all([PH.api.myOrders(), PH.api.myTradeIns()]);
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
  const initials = me.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const latest = orders.find((o) => o.status !== "Cancelled") || orders[0];
  const trade = trades.find((t) => t.status === "Offer sent") || trades[0];
  const step = latest ? PH.api.STATUSES.indexOf(latest.status) : -1;
  const sms = localStorage.getItem("ph_sms") !== "off";
  const firstArt = (o) => { const p = PH.api.quote([{ sku: o.items[0].sku, qty: 1 }]).items[0]; return p ? p.art : "box"; };

  $("#app").innerHTML = `${PH.ui.hudHead({ eyebrow: `Account // ${esc(me.id)}`, title: "My account", ghost: "PROFILE" })}<div class="row start stack-md" style="gap:32px">
    <section class="card hud-frame" style="width:min(500px,100%);padding:32px;text-align:center">
      <div class="avatar" aria-hidden="true">${esc(initials)}</div>
      <div class="small muted" style="margin-top:18px">${hello}</div><h2 class="bracket" style="margin:2px 0 0">${esc(me.name)}</h2>
      <div class="small muted" style="margin-top:6px">${esc(me.id)} · member since ${date(me.since)} · sample account</div>
      <div class="row keep" style="gap:16px;justify-content:center;margin-top:26px;flex-wrap:wrap">
        ${[["orders.html", "box", "My Orders"], ["sell.html", "swap", "Sell to Us"], ["trade-ins.html", "cash", "Trade-ins"]].map(([href, i, t]) => `<a class="qa" href="${href}"><span class="circ lg">${ico(i, 26)}</span>${t}</a>`).join("")}
        <button class="qa" id="logout"><span class="circ lg">${ico("logout", 26)}</span>Log out</button>
      </div>
    </section>
    <div class="grow stack">
      <section class="card"><div class="row keep between center"><h3>Latest order</h3><a class="small" href="orders.html">See all orders →</a></div>
        ${latest ? `<div class="row keep center" style="gap:16px;margin-top:14px"><div class="art" style="width:84px;height:60px">${art(firstArt(latest))}</div>
          <div class="grow"><b>${esc(latest.id)}</b> <span class="small muted">· ${latest.items.map((i) => `${esc(i.name)} × ${i.qty}`).join(", ")} · ${money(latest.total)}</span>
          ${step >= 0 ? `<div class="pbar" style="margin-top:10px"><i style="width:${((step + 1) / 5) * 100}%"></i></div><div class="small muted" style="margin-top:6px">Step ${step + 1} of 5 · ${esc(latest.status)}</div>` : `<div class="small muted">${esc(latest.status)}</div>`}</div>${statusBadge(latest.status)}</div>`
        : `<p class="muted">No orders yet. <a href="products.html">Start shopping</a></p>`}</section>
      <section class="card"><div class="row keep between center"><h3>Trade-in</h3>${trade ? statusBadge(trade.status) : ""}</div>
        ${trade ? `<div class="row keep center" style="gap:16px;margin-top:14px"><div class="circ">${ico("swap")}</div><div class="grow"><b>${esc(trade.id)} · ${esc(trade.brand)} ${esc(trade.model)}</b><div class="small muted">${trade.offer ? `We offer ${money(trade.offer)}` : `Asking ${money(trade.askingPrice)}`} · ${esc(trade.condition)}</div></div><a class="btn ${trade.status === "Offer sent" ? "p" : ""} sm" href="trade-ins.html">${trade.status === "Offer sent" ? "Review offer" : "View"}</a></div>`
        : `<p class="muted">Have parts you don't use? <a href="sell.html">Sell them to us</a></p>`}</section>
      <div class="row" style="gap:20px">
        <section class="card grow"><h3>Saved address</h3><p class="muted">${me.address ? `${esc(me.address.street)}<br>${esc(me.address.city)} ${esc(me.address.zip)}` : "No address yet. It's saved when you check out."}<br>${esc(me.phone || "")}</p></section>
        <section class="card grow"><h3>Settings</h3>
          <label class="row keep between center" style="margin-top:12px;cursor:pointer"><span>${ico("moon", 18)} Dark mode</span><span class="toggle"><input type="checkbox" id="dark" ${theme.get() === "dark" ? "checked" : ""}><span></span></span></label>
          <label class="row keep between center" style="margin-top:12px;cursor:pointer"><span>Order updates by SMS</span><span class="toggle"><input type="checkbox" id="sms" ${sms ? "checked" : ""}><span></span></span></label>
          <p class="small muted">SMS is a setting only in this demo; no messages are sent.</p></section>
      </div>
    </div></div>`;

  $("#dark").addEventListener("change", (e) => { theme.set(e.target.checked ? "dark" : "light"); toast(e.target.checked ? "Dark mode on" : "Dark mode off"); });
  $("#sms").addEventListener("change", (e) => localStorage.setItem("ph_sms", e.target.checked ? "on" : "off"));
  $("#logout").addEventListener("click", () => { PH.session.logout(); location.href = "index.html"; });
  PH.ui.storeFooter();
})();
