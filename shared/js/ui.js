/* Power House shared UI helpers: icons, product drawings, header/footer, badges, toasts, dialogs. */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });
  const date = (iso) => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  const time = (iso) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  const when = (iso) => {
    const d = new Date(iso), t = new Date();
    const same = d.toDateString() === t.toDateString();
    const y = new Date(t); y.setDate(t.getDate() - 1);
    return same ? time(iso) : d.toDateString() === y.toDateString() ? "Yesterday" : date(iso);
  };
  const qs = (k) => new URLSearchParams(location.search).get(k);

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12h11L21 7H6"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    truck: '<path d="M2 6h11v10H2zM13 10h5l3 3v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    swap: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    home: '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    power: '<path d="M12 3v8"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>'
  };
  const ico = (name, size = 20, color = "currentColor") =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0">${ICONS[name] || ICONS.box}</svg>`;

  /* Simple drawn product pictures (no photos of real products, no brands). viewBox 240×140. */
  const pins = (n, x0, step, y, fill) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * step}" y="${y}" width="4" height="10" fill="${fill}"/>`).join("");
  const ART = {
    ram: `<rect x="10" y="40" width="220" height="56" rx="4" fill="#047857"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${22 + i * 34}" y="50" width="24" height="30" rx="2" fill="#111"/>`).join("")}${pins(30, 14, 7, 90, "#D69E2E")}`,
    ram8: `<rect x="10" y="40" width="220" height="56" rx="4" fill="#2B6CB0"/>${Array.from({ length: 4 }, (_, i) => `<rect x="${22 + i * 34}" y="50" width="24" height="30" rx="2" fill="#111"/>`).join("")}${pins(30, 14, 7, 90, "#D69E2E")}`,
    ssd: `<rect x="20" y="52" width="200" height="38" rx="4" fill="#111"/><rect x="40" y="60" width="60" height="22" rx="2" fill="#4A5568"/><rect x="110" y="60" width="40" height="22" rx="2" fill="#4A5568"/><rect x="160" y="64" width="40" height="14" rx="2" fill="#F5C800"/><circle cx="210" cy="71" r="5" fill="#E0E5EC"/>`,
    hdd: `<rect x="50" y="16" width="140" height="110" rx="8" fill="#A0AEC0"/><circle cx="120" cy="66" r="38" fill="#CBD5E0"/><circle cx="120" cy="66" r="8" fill="#4A5568"/><rect x="132" y="80" width="44" height="8" rx="4" fill="#4A5568" transform="rotate(-35 132 80)"/>`,
    gpu: `<rect x="12" y="30" width="216" height="80" rx="10" fill="#111"/><circle cx="78" cy="70" r="30" fill="#4A5568"/><circle cx="162" cy="70" r="30" fill="#4A5568"/><circle cx="78" cy="70" r="8" fill="#F5C800"/><circle cx="162" cy="70" r="8" fill="#F5C800"/><rect x="40" y="110" width="120" height="8" fill="#D69E2E"/>`,
    kb: `<rect x="14" y="30" width="212" height="84" rx="10" fill="#111"/>${Array.from({ length: 4 }, (_, r) => Array.from({ length: 10 }, (_, c) => `<rect x="${24 + c * 19}" y="${40 + r * 18}" width="15" height="13" rx="2" fill="${r === 0 && c === 0 ? "#F5C800" : "#4A5568"}"/>`).join("")).join("")}`,
    pc: `<rect x="80" y="8" width="80" height="124" rx="8" fill="#111"/><rect x="80" y="8" width="8" height="124" fill="#F5C800"/><circle cx="124" cy="52" r="20" fill="#4A5568"/><circle cx="124" cy="52" r="6" fill="#9CA3AF"/><circle cx="124" cy="98" r="14" fill="#4A5568"/>`,
    cpu: `<rect x="70" y="20" width="100" height="100" rx="8" fill="#A0AEC0"/><rect x="86" y="36" width="68" height="68" rx="4" fill="#CBD5E0"/><text x="120" y="76" font-size="16" font-family="Arial" font-weight="700" text-anchor="middle" fill="#4A5568">CPU</text>${pins(9, 76, 10, 10, "#D69E2E")}${pins(9, 76, 10, 120, "#D69E2E")}`,
    mb: `<rect x="30" y="10" width="180" height="120" rx="6" fill="#1F3A2E"/><rect x="50" y="26" width="46" height="46" rx="4" fill="#A0AEC0"/><rect x="112" y="24" width="8" height="60" fill="#111"/><rect x="126" y="24" width="8" height="60" fill="#111"/><rect x="50" y="92" width="130" height="10" rx="2" fill="#111"/><rect x="50" y="110" width="90" height="8" rx="2" fill="#4A5568"/><circle cx="180" cy="40" r="10" fill="#F5C800"/>`,
    psu: `<rect x="40" y="24" width="160" height="96" rx="8" fill="#111"/><circle cx="110" cy="72" r="36" fill="#4A5568"/><path d="M80 72h60M110 42v60M89 51l42 42M131 51 89 93" stroke="#111" stroke-width="4"/><rect x="168" y="40" width="20" height="14" rx="2" fill="#F5C800"/>`,
    mouse: `<rect x="86" y="14" width="68" height="112" rx="34" fill="#111"/><path d="M120 14v40" stroke="#4A5568" stroke-width="4"/><rect x="115" y="28" width="10" height="18" rx="5" fill="#F5C800"/>`,
    headset: `<path d="M60 90V70a60 60 0 0 1 120 0v20" fill="none" stroke="#111" stroke-width="12"/><rect x="44" y="80" width="34" height="50" rx="12" fill="#111"/><rect x="162" y="80" width="34" height="50" rx="12" fill="#111"/><rect x="52" y="92" width="18" height="26" rx="6" fill="#F5C800"/>`,
    monitor: `<rect x="30" y="10" width="180" height="100" rx="8" fill="#111"/><rect x="40" y="20" width="160" height="80" rx="4" fill="#2B6CB0"/><rect x="110" y="110" width="20" height="16" fill="#4A5568"/><rect x="80" y="124" width="80" height="8" rx="4" fill="#4A5568"/>`,
    box: `<path d="M60 40l60-24 60 24v64l-60 24-60-24z" fill="#A0AEC0"/><path d="M60 40l60 24 60-24M120 64v64" stroke="#4A5568" stroke-width="4" fill="none"/>`
  };
  const art = (kind, label = "") => `<svg viewBox="0 0 240 140" role="img" aria-label="${esc(label || "product drawing")}" xmlns="http://www.w3.org/2000/svg">${ART[kind] || ART.box}</svg>`;

  /* badges: symbol + text (never color alone) */
  const badge = (kind, text) => `<span class="badge ${kind}">${{ ok: "●", low: "▲", out: "✕", used: "◆", blue: "●", gray: "●" }[kind] || ""} ${esc(text)}</span>`;
  function stockBadge(p) {
    if (p.stock <= 0) return badge("out", "Out of stock");
    if (p.condition === "used") return badge("used", `Used · ${p.stock} left`);
    if (p.lowStockLevel > 0 && p.stock <= p.lowStockLevel) return badge("low", `Only ${p.stock} left`);
    return badge("ok", "In stock");
  }
  /* every status has its own colour + symbol (never colour alone). ctx "trade" = Sell to Us statuses */
  const SICON = {
    placed: '<path d="M4 1.8h8v12.4l-2-1.3-2 1.3-2-1.3-2 1.3Z"/><path d="M6.2 5.6h3.6M6.2 8.6h3.6"/>',
    packing: '<path d="M2.4 4.9 8 2.2l5.6 2.7v6.2L8 13.8l-5.6-2.7Z"/><path d="M2.4 4.9 8 7.6l5.6-2.7M8 7.6v6.2"/>',
    shipping: '<path d="M1.4 3.8h8.2v7.4H1.4Z"/><path d="M9.6 6.2h2.9l2.1 2.6v2.4H9.6"/><circle cx="4.3" cy="12.2" r="1.3"/><circle cx="11.6" cy="12.2" r="1.3"/>',
    out: '<path d="M8 14.2s4.6-4.1 4.6-7.6a4.6 4.6 0 0 0-9.2 0c0 3.5 4.6 7.6 4.6 7.6Z"/><circle cx="8" cy="6.5" r="1.6"/>',
    done: '<path d="M2.8 8.6 6.4 12 13.2 4.4"/>',
    cancel: '<path d="M4 4l8 8M12 4l-8 8"/>',
    review: '<circle cx="8" cy="8" r="5.8"/><path d="M8 4.8v3.4l2.2 1.4"/>',
    offer: '<path d="M2.2 2.2h5.6l6 6-5.6 5.6-6-6Z"/><circle cx="5.3" cy="5.3" r="1"/>',
    accepted: '<circle cx="8" cy="8" r="5.8"/><path d="M5.4 8.2 7.2 10l3.4-3.8"/>',
    recv: '<path d="M8 1.8v7M5 6l3 3 3-3"/><path d="M2.2 9.4v4.2h11.6V9.4"/>',
    stock: '<path d="M8 2.2 13.8 5.2 8 8.2 2.2 5.2Z"/><path d="M2.2 8.2 8 11.2l5.8-3M2.2 10.9 8 13.9l5.8-3"/>',
    decl_c: '<circle cx="6" cy="5" r="2.4"/><path d="M1.6 13.8c0-2.6 1.9-4.3 4.4-4.3s4.4 1.7 4.4 4.3"/><path d="M11.2 5.4l3.2 3.2M14.4 5.4l-3.2 3.2"/>',
    decl_s: '<path d="M5.5 1.8h5l3.7 3.7v5l-3.7 3.7h-5l-3.7-3.7v-5Z"/><path d="M5.3 8h5.4"/>'
  };
  const STATUS = {
    Placed: ["st-placed", "placed", "Placed"], Packing: ["st-packing", "packing", "Packing"], Shipping: ["st-shipping", "shipping", "Shipping"],
    "Out for Delivery": ["st-out", "out", "Out for delivery"], Received: ["st-done", "done", "Received"], Cancelled: ["st-bad", "cancel", "Cancelled"],
    "Under review": ["st-review", "review", "Under review"], "Offer sent": ["st-offer", "offer", "Offer sent"], Accepted: ["st-accepted", "accepted", "Offer accepted"],
    Declined: ["st-decl-c", "decl_c", "Declined by customer"], Rejected: ["st-bad", "decl_s", "Declined by staff"], "In stock": ["st-stock", "stock", "In stock"],
    CONFIRMED: ["st-placed", "placed", "Confirmed"], SHIPPED: ["st-shipping", "shipping", "Shipped"], DELIVERED: ["st-done", "done", "Delivered"]
  };
  const statusBadge = (s, ctx) => {
    const [cls, ic, label] = ctx === "trade" && s === "Received" ? ["st-recv", "recv", "Item received"] : STATUS[s] || ["st-review", "review", s];
    return `<span class="badge sb ${cls}"><svg viewBox="0 0 16 16" aria-hidden="true">${SICON[ic]}</svg>${esc(label)}</span>`;
  };

  /* who cancelled an order: the last history entry says it */
  const cancelledBy = (o) => { const h = o.history[o.history.length - 1]; return h && String(h.by).startsWith("CUST") ? "by the customer" : "by staff"; };

  /* step bar (UX rule 2) */
  function steps(names, cur) {
    return `<div class="steps" role="list" aria-label="Progress: step ${cur + 1} of ${names.length}">${names.map((n, i) => {
      const cls = i < cur ? "done" : i === cur ? "cur" : "todo";
      return `<div class="step ${cls}" role="listitem"><div class="dot ${cls}">${i < cur ? "✓" : i + 1}</div><b>${esc(n)}</b></div>${i < names.length - 1 ? `<div class="bar ${i < cur ? "done" : ""}"></div>` : ""}`;
    }).join("")}</div>`;
  }
  function vsteps(list) { // [{label, sub, state:'done'|'cur'|'todo'}]
    return `<div class="vsteps">${list.map((s, i) => `<div class="vstep"><div class="rail"><div class="dot ${s.state}">${s.state === "done" ? "✓" : ""}</div>${i < list.length - 1 ? `<div class="line ${s.state === "done" ? "done" : ""}"></div>` : ""}</div><div><b style="${s.state === "todo" ? "color:var(--faint)" : ""}">${esc(s.label)}</b><div class="small muted">${esc(s.sub || "")}</div></div></div>`).join("")}</div>`;
  }
  function donut(parts, size = 170, sw = 20, center = "", sub = "") {
    const r = (size - sw) / 2, c = 2 * Math.PI * r, total = parts.reduce((s, p) => s + p[0], 0) || 1;
    let off = 0;
    const segs = parts.map(([v, col]) => { const len = (c * v) / total; const g = v > 0 && v < total ? 3 : 0; const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${Math.max(len - g, 0)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`; off += len; return s; }).join("");
    return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0"><svg class="donut-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${sw}"/>${segs}</svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b style="font:700 ${Math.round(size / 6)}px var(--font-head)">${center}</b><span class="small muted">${sub}</span></div></div>`;
  }

  /* toasts + confirm dialog (UX rule 1: buttons say the action) */
  function toast(msg, bad = false) {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }
  function dialog({ title, body = "", confirm = "Confirm", cancel = "Go back", danger = false, icon = null, html = false }) {
    return new Promise((resolve) => {
      const o = document.createElement("div"); o.className = "overlay";
      o.innerHTML = `<div class="card modal" role="dialog" aria-modal="true" aria-labelledby="dlg-t" style="text-align:center;padding:32px">
        ${icon ? `<div class="inset" style="width:72px;height:72px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">${ico(icon, 32, danger ? "#B4173A" : "#111111")}</div>` : ""}
        <h2 id="dlg-t">${esc(title)}</h2><div class="muted" style="margin-top:8px">${html ? body : esc(body)}</div>
        <button class="btn ${danger ? "dgf" : "p"} block" data-ok style="margin-top:28px">${danger ? ico("x", 18, "currentColor") : ""}${esc(confirm)}</button>
        <button class="btn block" data-no style="margin-top:14px">${esc(cancel)}</button></div>`;
      const done = (v) => { o.remove(); document.removeEventListener("keydown", key); resolve(v); };
      const key = (e) => { if (e.key === "Escape") done(false); };
      o.addEventListener("click", (e) => { if (e.target === o) done(false); });
      $("[data-ok]", o).onclick = () => done(true); $("[data-no]", o).onclick = () => done(false);
      document.addEventListener("keydown", key); document.body.appendChild(o); $("[data-ok]", o).focus();
    });
  }
  function modal(innerHtml, onMount, onClose) {
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="card modal" role="dialog" aria-modal="true" style="padding:30px">${innerHtml}</div>`;
    let closed = false;
    const close = () => { if (closed) return; closed = true; o.remove(); document.removeEventListener("keydown", key); if (onClose) onClose(); };
    const key = (e) => { if (e.key === "Escape") close(); };
    o.addEventListener("click", (e) => { if (e.target === o || e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", key); document.body.appendChild(o);
    if (onMount) onMount(o, close);
    const f = o.querySelector("input,select,button"); if (f) f.focus();
    return close;
  }

  /* type-to-search list (UX rule 3): attach to an input, give it a list of strings */
  function typeahead(input, getList, onPick, opts = {}) {
    const enterPicksFirst = opts.enterPicksFirst !== false;
    const box = document.createElement("div"); box.className = "dd hidden"; box.setAttribute("role", "listbox");
    input.after(box); input.setAttribute("autocomplete", "off"); input.setAttribute("aria-autocomplete", "list");
    let hl = 0, items = [], moved = false;
    const render = () => {
      const t = input.value.trim().toLowerCase();
      items = getList().filter((x) => x.toLowerCase().includes(t)).slice(0, 8);
      box.innerHTML = items.length ? items.map((x, i) => `<button type="button" role="option" class="${i === hl && (moved || enterPicksFirst) ? "hl" : ""}">${esc(x)}</button>`).join("") + `<div class="empty">Type to search, or scroll the list</div>` : `<div class="empty">No match. Check the spelling.</div>`;
      $$("button", box).forEach((b, i) => b.addEventListener("mousedown", (e) => { e.preventDefault(); pick(i); }));
      box.classList.remove("hidden");
    };
    const pick = (i) => { if (!items[i]) return; input.value = items[i]; box.classList.add("hidden"); onPick && onPick(items[i]); input.dispatchEvent(new Event("change")); };
    input.addEventListener("focus", () => { hl = 0; moved = false; render(); });
    input.addEventListener("input", () => { hl = 0; moved = false; render(); });
    input.addEventListener("blur", () => setTimeout(() => box.classList.add("hidden"), 120));
    input.addEventListener("keydown", (e) => {
      if (box.classList.contains("hidden")) return;
      if (e.key === "ArrowDown") { hl = moved ? Math.min(hl + 1, items.length - 1) : 0; moved = true; render(); e.preventDefault(); }
      if (e.key === "ArrowUp") { hl = Math.max(hl - 1, 0); moved = true; render(); e.preventDefault(); }
      if (e.key === "Enter" && items.length && (moved || enterPicksFirst)) { pick(hl); e.preventDefault(); }
      else if (e.key === "Enter") box.classList.add("hidden");
      if (e.key === "Escape") box.classList.add("hidden");
    });
  }

  /* input masks (UX rule 8) */
  function maskPhone(input) {
    input.addEventListener("input", () => {
      const d = input.value.replace(/\D/g, "").slice(0, 11);
      input.value = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(" ");
    });
  }
  function maskDigits(input, max) { input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, max); }); }
  function maskMoney(input) {
    input.addEventListener("input", () => { const d = input.value.replace(/\D/g, "").slice(0, 7); input.value = d ? Number(d).toLocaleString("en-PH") : ""; });
  }

  /* digit boxes (2026-11-07): one box per digit, grouped like 0917 · 000 · 0012. The real value lives in the original (now hidden) input */
  function digitBoxes(input, groups = [4, 3, 4], label = "Mobile number") {
    if (!input || input.dataset.boxes) return;
    input.dataset.boxes = "1";
    const total = groups.reduce((a, b) => a + b, 0);
    input.type = "hidden";
    const wrap = document.createElement("div");
    wrap.className = "digits"; wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", label);
    let n = 0;
    wrap.innerHTML = groups.map((g, gi) => `<span class="dgroup" style="flex:${g} 1 0">${Array.from({ length: g }, () => { n++; return `<input class="dbox" inputmode="numeric" autocomplete="off" aria-label="${label}, digit ${n} of ${total}">`; }).join("")}</span>${gi < groups.length - 1 ? '<span class="dsep" aria-hidden="true">·</span>' : ""}`).join("");
    input.after(wrap);
    const boxes = Array.from(wrap.querySelectorAll(".dbox"));
    const sync = () => {
      const d = boxes.map((b) => b.value).join("");
      let k = 0; const parts = [];
      groups.forEach((g) => { const part = d.slice(k, k + g); k += g; if (part) parts.push(part); });
      input.value = parts.join(" ");
      wrap.classList.toggle("full", d.length === total);
      boxes.forEach((b) => b.classList.toggle("on", !!b.value));
    };
    const fill = (str, from) => {
      let i = from;
      for (const c of String(str).replace(/\D/g, "")) { if (i >= total) break; boxes[i].value = c; i++; }
      sync(); boxes[Math.min(i, total - 1)].focus();
    };
    boxes.forEach((b, i) => {
      b.addEventListener("input", () => {
        const v = b.value.replace(/\D/g, "");
        if (v.length > 1) { b.value = ""; fill(v, i); return; }
        b.value = v; sync();
        if (v && i < total - 1) boxes[i + 1].focus();
      });
      b.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !b.value && i > 0) { e.preventDefault(); boxes[i - 1].value = ""; boxes[i - 1].focus(); sync(); }
        if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); boxes[i - 1].focus(); }
        if (e.key === "ArrowRight" && i < total - 1) { e.preventDefault(); boxes[i + 1].focus(); }
      });
      b.addEventListener("paste", (e) => { e.preventDefault(); fill((e.clipboardData || window.clipboardData).getData("text"), i); });
      b.addEventListener("focus", () => b.select());
    });
    String(input.value || "").replace(/\D/g, "").slice(0, total).split("").forEach((c, i) => (boxes[i].value = c));
    sync();
    input.focus = () => (boxes.find((b) => !b.value) || boxes[total - 1]).focus(); // "focus the field" goes to the first empty box
    const lab = document.querySelector(`label[for="${input.id}"]`);
    if (lab) { boxes[0].id = input.id + "-box1"; lab.htmlFor = boxes[0].id; }
    return wrap;
  }

  const moneyValue = (input) => Number(String(input.value).replace(/\D/g, "")) || 0;

  /* theme (dark mode, UI idea 1) */
  const theme = {
    get: () => localStorage.getItem("ph_theme") || "dark",
    set: (t) => { localStorage.setItem("ph_theme", t); document.documentElement.dataset.theme = t; }
  };
  document.documentElement.dataset.theme = theme.get();

  /* ---------- store header / footer ---------- */
  const CRED = 'Photos: Jacek Halicki, Colin, Bubba73, Sgroey (CC BY-SA 4.0, Wikimedia Commons). Sample data only.';
  async function storeHeader(active = "") {
    const me = await PH.api.me();
    const a = (href, label) => `<a href="${href}" class="${active === label ? "on" : ""}">${label}</a>`;
    const html = `<header class="nav">
      <a class="logo" href="index.html" aria-label="Power House home">${logo()}</a>
      <nav class="links" aria-label="Main">${a("products.html?category=part", "PC Parts")}${a("products.html?category=accessory", "Accessories")}${a("products.html?category=prebuilt", "Prebuilt PCs")}${a("sell.html", "Sell to Us")}</nav>
      <form class="search" role="search" action="products.html"><label class="sr-only" for="q">Search</label>${ico("search", 18)}<input id="q" name="q" type="search" placeholder="Search parts // PCs"><kbd class="key" aria-hidden="true">/</kbd></form>
      <div class="nav-right">
        <a href="${me ? "account.html" : "login.html"}" class="hide-sm">${ico("user")}${me ? "Hi, " + esc(me.name.split(" ")[0] + " " + (me.name.split(" ")[1] || "")) : "Log in"}</a>
        <a href="orders.html" class="hide-sm">${ico("box")}My Orders</a>
        <a href="cart.html" class="cart-btn" aria-label="Cart">${ico("cart", 18, "currentColor")}<span data-cart-count>${PH.cart.count()}</span></a>
      </div></header>`;
    document.body.insertAdjacentHTML("afterbegin", html);
    const tabs = [["index.html", "home", "Home"], ["products.html", "search", "Search"], ["cart.html", "cart", "Cart"], ["orders.html", "box", "Orders"], [me ? "account.html" : "login.html", "user", "Account"]];
    const page = location.pathname.split("/").pop() || "index.html";
    document.body.insertAdjacentHTML("beforeend", `<nav class="tabbar" aria-label="Phone menu">${tabs.map(([h, i, l]) => `<a href="${h}" class="${page === h ? "on" : ""}">${ico(i, 24)}${l}</a>`).join("")}</nav>`);
    document.addEventListener("cart:change", () => $$("[data-cart-count]").forEach((x) => (x.textContent = PH.cart.count())));
    // header search suggestions (type to search)
    const q = $("#q");
    if (q) addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
    if (q) {
      const names = (await PH.api.listProducts()).map((p) => p.name);
      typeahead(q, () => names, (v) => { location.href = "products.html?q=" + encodeURIComponent(v); }, { enterPicksFirst: false });
      q.value = qs("q") || "";
    }
    return me;
  }
  function storeFooter() {
    document.body.insertAdjacentHTML("beforeend", `<footer class="foot"><b>Power House</b><span>${CRED}</span><span>COD · GCash (SIMULATED) · <a href="../staff-dashboard/login.html">Staff Portal</a> · <button type="button" data-reset>Reset demo data</button></span></footer>`);
    $("[data-reset]").onclick = async () => { if (await dialog({ title: "Reset demo data?", body: "Orders, stock, trade-ins and your cart go back to the sample data. Logins stay.", confirm: "Reset demo data", cancel: "Keep my data", icon: "refresh" })) { PH.api.resetDemo(); location.reload(); } };
  }
  function requireLogin() {
    if (!PH.session.customerId()) { location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return false; }
    return true;
  }
  function errorText(e) { return e && e.message ? e.message : "Something went wrong. Try again."; }
  function busy(btn, on, label) {
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = label || "Working…"; }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }

  /* Power House logo (D33): a roof line with a lightning bolt under it + POWER + yellow HOUSE tag */
  const LOGO_MARK = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true"><path d="M2.5 11 12 3l9.5 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/><path class="bolt" d="M13.2 9 8.8 15.4h3.1L10.9 21.6l4.6-7.2h-3.1L13.2 9Z"/></svg>';
  const logo = (word = true) => `<span class="mark">${LOGO_MARK}</span>${word ? '<span class="logo-word">POWER<em>HOUSE</em></span>' : ''}`;

  /* HUD page header (D31): grid band, eyebrow, big title, outline ghost word, optional right side */
  function hudHead({ eyebrow, title, sub = "", ghost = "", right = "", crumb = "" }) {
    return `<header class="page-head hud-grid"><div class="hud-ghost page-ghost" aria-hidden="true">${esc(ghost || title)}</div>
      <div class="hud-cross" style="right:18px;top:14px"></div>
      <div class="row between wrapflex" style="position:relative;gap:16px;align-items:flex-end"><div>${crumb ? `<div class="small muted mono" style="margin-bottom:10px">${crumb}</div>` : ""}<div class="hud-eyebrow">${esc(eyebrow)}</div>
      <h1 class="hud-title page-title">${esc(title)}</h1>${sub ? `<div class="muted" style="margin-top:10px;max-width:640px">${sub}</div>` : ""}</div>${right}</div></header>`;
  }

  /* product card / row */
  function productCard(p) {
    const out = p.stock <= 0;
    return `<article class="card pcard"><a href="product.html?sku=${encodeURIComponent(p.sku)}" class="art" aria-label="${esc(p.name)}">${art(p.art, p.name)}</a>
      <div class="body"><div>${stockBadge(p)}</div><a class="name" href="product.html?sku=${encodeURIComponent(p.sku)}">${esc(p.name)}</a>
      <div class="price">${money(p.price)}</div><div class="small muted" style="margin-bottom:12px">${out ? "0 in stock" : `${p.stock} in stock`}</div>
      ${out ? `<button class="btn sm block" disabled>Out of stock</button>` : `<button class="btn p sm block" data-add="${esc(p.sku)}">${ico("cart", 18, "currentColor")}Add to cart</button>`}</div></article>`;
  }
  function productRow(p) {
    return `<div class="card prow"><a class="art" href="product.html?sku=${encodeURIComponent(p.sku)}" aria-label="${esc(p.name)}">${art(p.art, p.name)}</a>
      <div class="grow">${stockBadge(p)}<div style="font-weight:700;margin-top:6px;line-height:1.25">${esc(p.name)}</div><div class="price" style="font-size:19px">${money(p.price)}</div>
      ${p.stock > 0 ? `<button class="btn xs o" data-add="${esc(p.sku)}" style="margin-top:4px">${ico("plus", 16)}Add to cart</button>` : `<span class="small muted">Out of stock</span>`}</div></div>`;
  }
  // one listener for every "Add to cart" button on the page
  /* the cart needs an account: ask to log in, then come back to this page */
  async function needLogin(next) {
    if (PH.session.customerId()) return false;
    const back = next || (location.pathname.split("/").pop() + location.search);
    const ok = await dialog({ title: "Log in to use your cart", body: `Your cart is saved to your account, so you need to log in first. New here? <a href="signup.html?next=${encodeURIComponent(back)}">Create an account</a>.`, html: true, confirm: "Log in", cancel: "Keep browsing", icon: "cart" });
    if (ok) location.href = "login.html?next=" + encodeURIComponent(back);
    return true;
  }
  document.addEventListener("click", async (e) => {
    const c = e.target.closest("a.cart-btn, .tabbar a[href='cart.html']");
    if (c && !PH.session.customerId()) { e.preventDefault(); needLogin("cart.html"); return; }
    const b = e.target.closest("[data-add]"); if (!b) return;
    if (await needLogin()) return;
    const sku = b.dataset.add;
    const p = await PH.api.getProduct(sku);
    const inCart = (PH.cart.get().find((x) => x.sku === sku) || {}).qty || 0;
    if (inCart + 1 > p.stock) { toast(`Only ${p.stock} in stock, and they're all in your cart.`, true); return; }
    PH.cart.add(sku, 1); toast(`Added ${p.name} to your cart`);
  });

  PH.ui = { digitBoxes, logo, needLogin, hudHead, $, $$, esc, money, date, time, when, qs, ico, art, badge, stockBadge, statusBadge, cancelledBy, steps, vsteps, donut, toast, dialog, modal, typeahead,
    maskPhone, maskDigits, maskMoney, moneyValue, theme, storeHeader, storeFooter, requireLogin, errorText, busy, productCard, productRow, CRED };
})();
