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
      <div class="small muted" style="margin-top:4px">${esc(me.email)}${me.phone ? " · " + esc(me.phone) : ""}</div>
      <button class="btn sm" id="edit-profile" style="margin-top:16px">${ico("edit", 16)}Edit profile</button>
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
      <section class="card"><div class="row keep between center"><h3>Trade-in</h3>${trade ? statusBadge(trade.status, "trade") : ""}</div>
        ${trade ? `<div class="row keep center" style="gap:16px;margin-top:14px"><div class="circ">${ico("swap")}</div><div class="grow"><b>${esc(trade.id)} · ${esc(trade.brand)} ${esc(trade.model)}</b><div class="small muted">${trade.offer ? `We offer ${money(trade.offer)}` : `Asking ${money(trade.askingPrice)}`} · ${esc(trade.condition)}</div></div><a class="btn ${trade.status === "Offer sent" ? "p" : ""} sm" href="trade-ins.html">${trade.status === "Offer sent" ? "Review offer" : "View"}</a></div>`
        : `<p class="muted">Have parts you don't use? <a href="sell.html">Sell them to us</a></p>`}</section>
      <div class="row" style="gap:20px">
        <section class="card grow"><div class="row keep between center"><h3>Saved address</h3><button class="btn xs" id="edit-address">${ico("edit", 14)}Edit</button></div><p class="muted">${me.address ? `${esc(me.address.street)}<br>${esc(me.address.city)} ${esc(me.address.zip)}` : "No address yet. It's saved when you check out."}<br>${esc(me.phone || "")}</p></section>
        <section class="card grow"><h3>Settings</h3>
          <label class="row keep between center" style="margin-top:12px;cursor:pointer"><span>${ico("moon", 18)} Dark mode</span><span class="toggle"><input type="checkbox" id="dark" ${theme.get() === "dark" ? "checked" : ""}><span></span></span></label>
          <label class="row keep between center" style="margin-top:12px;cursor:pointer"><span>Order updates by SMS</span><span class="toggle"><input type="checkbox" id="sms" ${sms ? "checked" : ""}><span></span></span></label>
          <p class="small muted">SMS is a setting only in this demo; no messages are sent.</p><button class="btn xs" id="change-pw" style="margin-top:6px">${ico("shield", 14)}Change password</button></section>
      </div>
    </div></div>`;

  $("#dark").addEventListener("change", (e) => { theme.set(e.target.checked ? "dark" : "light"); toast(e.target.checked ? "Dark mode on" : "Dark mode off"); });
  $("#sms").addEventListener("change", (e) => localStorage.setItem("ph_sms", e.target.checked ? "on" : "off"));
  $("#logout").addEventListener("click", () => { PH.session.logout(); location.href = "index.html"; });

  /* ---------- edit forms (profile, address, password) ---------- */
  const F = (id, label, value = "", attrs = "", help = "") => `<div class="field" id="f-${id}"><label for="${id}">${label}</label><input id="${id}" value="${esc(value)}" ${attrs}>${help ? `<div class="help">${help}</div>` : ""}<div class="err hidden"></div></div>`;
  const setErr = (o, id, msg) => { const f = o.querySelector("#f-" + id); if (!f) return; f.classList.toggle("bad", !!msg); const e = f.querySelector(".err"); e.textContent = msg || ""; e.classList.toggle("hidden", !msg); };
  const form = (title, body, saveLabel, onSave, onMount) => PH.ui.modal(`<div class="hud-eyebrow">Account // edit</div><h2 class="bracket" style="margin:8px 0 18px">${title}</h2><form novalidate>${body}<div class="actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn p grow">${saveLabel}</button></div></form>`, (o, close) => {
    if (onMount) onMount(o);
    o.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault(); const btn = o.querySelector(".btn.p");
      PH.ui.busy(btn, true, "Saving…");
      try { if (await onSave(o) === false) { PH.ui.busy(btn, false); return; } close(); toast("Saved"); setTimeout(() => location.reload(), 500); }
      catch (err) { PH.ui.busy(btn, false); toast(PH.ui.errorText(err), true); }
    });
  });

  $("#edit-profile").addEventListener("click", () => form("Edit profile",
    F("p-name", "Full name", me.name, 'autocomplete="name"') + F("p-email", "Email", me.email, 'type="email" autocomplete="email"') + F("p-phone", "Mobile number (optional)", me.phone || "", 'type="tel"', "11 digits, starts with 09"),
    "Save changes",
    async (o) => {
      const v = (id) => o.querySelector("#" + id).value.trim();
      const name = v("p-name"), email = v("p-email"), phone = v("p-phone"), digits = phone.replace(/\D/g, "");
      const errs = { "p-name": name.length < 2 ? "Enter your name." : "", "p-email": !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter an email like name@example.com." : "", "p-phone": digits && !/^09\d{9}$/.test(digits) ? "Use 11 digits starting with 09, or leave it empty." : "" };
      Object.entries(errs).forEach(([k, m]) => setErr(o, k, m));
      if (Object.values(errs).some(Boolean)) return false;
      await PH.api.updateProfile({ name, email, phone });
    },
    (o) => PH.ui.digitBoxes(o.querySelector("#p-phone"), [4, 3, 4], "Mobile number")));

  $("#edit-address").addEventListener("click", () => { const a = me.address || {}; form("Saved address",
    F("a-street", "House no. and street", a.street || "", 'autocomplete="address-line1"') + `<div class="field" id="f-a-city" style="position:relative"><label for="a-city">City or municipality <span class="small muted" style="font-weight:600">· type to search or scroll</span></label><input id="a-city" value="${esc(a.city || "")}" placeholder="Start typing, e.g. Ind"><div class="err hidden"></div></div>` + F("a-zip", "ZIP code", a.zip || "", "", "4 digits"),
    "Save address",
    async (o) => {
      const v = (id) => o.querySelector("#" + id).value.trim();
      const street = v("a-street"), city = v("a-city"), zip = v("a-zip").replace(/\D/g, "");
      const errs = { "a-street": street.length < 4 ? "Enter the house number and street." : "", "a-city": !PH.CITIES.includes(city) ? "Pick a city from the list." : "", "a-zip": !/^\d{4}$/.test(zip) ? "ZIP codes have 4 digits." : "" };
      Object.entries(errs).forEach(([k, m]) => setErr(o, k, m));
      if (Object.values(errs).some(Boolean)) return false;
      await PH.api.saveAddress({ street, city, zip });
    },
    (o) => { PH.ui.typeahead(o.querySelector("#a-city"), () => PH.CITIES, () => {}); PH.ui.digitBoxes(o.querySelector("#a-zip"), [4], "ZIP code"); }); });

  $("#change-pw").addEventListener("click", () => form("Change password",
    F("c-old", "Current password", "", 'type="password" autocomplete="current-password"') + F("c-new", "New password", "", 'type="password" autocomplete="new-password"', "At least 8 characters, with one number") + F("c-new2", "Confirm new password", "", 'type="password" autocomplete="new-password"'),
    "Change password",
    async (o) => {
      const v = (id) => o.querySelector("#" + id).value;
      const errs = { "c-old": !v("c-old") ? "Enter your current password." : "", "c-new": v("c-new").length < 8 || !/\d/.test(v("c-new")) ? "Use at least 8 characters with one number." : "", "c-new2": v("c-new2") !== v("c-new") ? "The passwords don't match." : "" };
      Object.entries(errs).forEach(([k, m]) => setErr(o, k, m));
      if (Object.values(errs).some(Boolean)) return false;
      await PH.api.changePassword(v("c-old"), v("c-new"));
    }));
  PH.ui.storeFooter();
})();
