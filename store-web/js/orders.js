/* 07 My Orders: status tracker, cancel only before Shipping (D5) */
(async () => {
  const { $, esc, money, ico, steps, statusBadge, date, time, when, dialog, toast, errorText } = PH.ui;
  if (!PH.ui.requireLogin()) return;
  await PH.ui.storeHeader();
  const S = PH.api.STATUSES;

  async function draw() {
    const orders = await PH.api.myOrders();
    const open = orders.filter((o) => !["Received", "Cancelled"].includes(o.status));
    const past = orders.filter((o) => ["Received", "Cancelled"].includes(o.status));
    if (!orders.length) {
      $("#app").innerHTML = `<h2>My Orders</h2><div class="card" style="text-align:center;padding:44px;max-width:640px;margin:22px auto"><div class="circ lg" style="margin:0 auto">${ico("box", 28)}</div><h3 style="margin-top:16px">No orders yet</h3><p class="muted">When you order, you can follow it here from packing to your door.</p><a class="btn p" href="products.html">Start shopping</a></div>`;
      return;
    }
    $("#app").innerHTML = `<h2>My Orders</h2><div class="muted">Placed → Packing → Shipping → Out for Delivery → Received</div>
      ${open.length ? open.map((o) => {
        const cur = S.indexOf(o.status);
        const can = ["Placed", "Packing"].includes(o.status);
        const last = o.history[o.history.length - 1];
        return `<article class="card" style="margin-top:22px;padding:26px">
          <div class="row between center wrapflex"><div><div class="small muted">Ship to · ${esc(o.address)}</div><b style="font:700 26px var(--font-head)">${esc(o.id)}</b> ${statusBadge(o.status)}
          <div class="small muted" style="margin-top:4px">${date(o.createdAt)} · ${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join(", ")} · ${money(o.total)} · ${o.paymentMethod === "COD" ? "Cash on Delivery" : "GCash (SIMULATED)"}</div></div>
          <div style="text-align:center">${can ? `<button class="btn dg sm" data-cancel="${o.id}">${ico("x", 18)}Cancel order</button><div class="small muted" style="margin-top:6px">Allowed before Shipping</div>` : `<button class="btn sm" disabled>Cancel order</button><div class="small muted" style="margin-top:6px">Already shipped</div>`}</div></div>
          <div style="margin-top:22px;overflow-x:auto">${steps(S, cur).replace(/width:96px/g, "width:120px")}</div>
          <div class="small muted" style="margin-top:12px">Last update: ${esc(last.status)} · ${when(last.at)}${last.by && last.by.startsWith("staff") ? " · by warehouse staff" : ""}</div>
        </article>`;
      }).join("") : `<div class="note" style="margin-top:20px">No open orders right now.</div>`}
      ${past.length ? `<h3 style="margin:30px 0 12px">Past orders</h3><div class="card table-card"><div class="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${past.map((o) => `<tr><td><a href="order.html?id=${o.id}">${esc(o.id)}</a></td><td>${date(o.createdAt)}</td><td>${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join(", ")}</td><td>${money(o.total)}</td><td>${statusBadge(o.status)}${o.status === "Cancelled" ? ' <span class="small muted">stock returned</span>' : ""}</td></tr>`).join("")}
      </tbody></table></div></div>` : ""}`;
  }

  $("#app").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-cancel]"); if (!b) return;
    const id = b.dataset.cancel;
    const o = (await PH.api.myOrders()).find((x) => x.id === id);
    const ok = await dialog({ title: `Cancel order ${id}?`, body: `${o.items.map((i) => `${i.name} × ${i.qty}`).join(" and ")} go back on our shelf. You can't undo this.`, confirm: "Cancel order", cancel: "Keep my order", danger: true, icon: "alert" });
    if (!ok) return;
    try { await PH.api.cancelOrder(id); toast(`${id} cancelled. The items are back in stock.`); draw(); }
    catch (err) { toast(errorText(err), true); draw(); }
  });
  await draw();
  PH.ui.storeFooter();
})();
