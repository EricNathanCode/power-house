/* 06 Order confirmed, shown as a receipt */
(async () => {
  const { $, esc, money, qs, date, time, statusBadge } = PH.ui;
  if (!PH.ui.requireLogin()) return;
  const me = await PH.ui.storeHeader();
  let o;
  try { o = await PH.api.getOrder(qs("id")); }
  catch (e) { $("#app").innerHTML = `<div class="card" style="text-align:center;padding:40px"><h2>Order not found</h2><a class="btn p" href="orders.html">Go to My Orders</a></div>`; PH.ui.storeFooter(); return; }
  const sub = o.items.reduce((s, i) => s + i.qty * i.price, 0);
  const bars = o.id.split("").map((c, i) => `<i style="display:block;background:var(--ink);width:${(c.charCodeAt(0) % 3) + 1}px"></i><i style="display:block;width:${(i % 2) + 1}px"></i>`).join("");
  $("#app").innerHTML = `<div class="card" style="max-width:560px;margin:10px auto;padding:34px">
    <div class="row keep between center"><span class="logo"><span class="mark">PH</span>POWER HOUSE</span>${statusBadge(o.status)}</div>
    <h1 style="font-size:44px;margin-top:22px">Order placed.</h1>
    <p class="muted">Thank you, ${esc(me.name)}. Your items are reserved: we took them off the shelf the moment you ordered.</p>
    <div style="border-top:4px dotted var(--sh-dark);margin:18px 0 6px"></div>
    ${o.items.map((i) => `<div class="leader"><span>${esc(i.name)} × ${i.qty}</span><span class="fill"></span><span>${money(i.qty * i.price)}</span></div>`).join("")}
    <div class="leader"><span>Subtotal</span><span class="fill"></span><span>${money(sub)}</span></div>
    <div class="leader"><span>Shipping</span><span class="fill"></span><span>${o.shipping ? money(o.shipping) : "Free"}</span></div>
    <div class="leader" style="font-size:20px"><b>Total · ${o.paymentMethod === "COD" ? "Cash on Delivery" : "GCash (SIMULATED)"}</b><span class="fill"></span><b>${money(o.total)}</b></div>
    ${o.paymentRef ? `<div class="small muted">Simulated payment reference: ${esc(o.paymentRef)}</div>` : ""}
    <div class="row keep between" style="margin-top:22px;align-items:flex-end"><div><div class="small muted">Order ID</div><b style="font:700 24px var(--font-head)">${esc(o.id)}</b><div class="small muted">${date(o.createdAt)} · ${time(o.createdAt)} · ${esc(o.address)}</div></div><div style="display:flex;gap:2px;height:44px" aria-hidden="true">${bars}</div></div>
    <div class="actions"><a class="btn p grow" href="orders.html">Track my order</a><a class="btn" href="products.html">Continue shopping</a></div>
  </div>`;
  PH.ui.storeFooter();
})();
