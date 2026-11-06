/* 04 Cart, with a clear empty state (UI idea 4) */
(async () => {
  const { $, esc, money, ico, art, productRow, dialog } = PH.ui;
  await PH.ui.storeHeader();
  const popular = (await PH.api.listProducts()).filter((p) => ["RAM-DDR4-16GB", "SSD-NVME-1TB", "KB-MECH-001", "HDD-2TB-72"].includes(p.sku));

  function draw() {
    const q = PH.api.quote(PH.cart.get());
    if (!q.items.length) {
      $("#app").innerHTML = `<h2>Your cart</h2>
        <div class="card" style="max-width:760px;margin:22px auto 0;padding:44px;text-align:center">
          <div class="inset" style="width:120px;height:120px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center"><div class="circ lg" style="width:76px;height:76px">${ico("cart", 32)}</div></div>
          <h2 style="margin-top:22px">Your cart is empty</h2>
          <p class="muted" style="max-width:520px;margin:8px auto 0">Add PC parts, accessories or a prebuilt PC. Stock is counted live in our warehouse, so what you see is what's on the shelf.</p>
          <div class="row keep wrapflex" style="gap:14px;justify-content:center;margin-top:28px"><a class="btn p" href="products.html?category=part">${ico("search", 18, "#fff")}Browse PC parts</a><a class="btn" href="sell.html">${ico("swap", 18)}Sell your parts instead</a></div>
        </div>
        <h3 style="margin:34px 0 14px">Popular right now</h3><div class="g4">${popular.map(productRow).join("")}</div>`;
      return;
    }
    const over = q.items.filter((i) => i.qty > i.stock);
    $("#app").innerHTML = `<h2>Your cart</h2><div class="muted">${PH.cart.count()} item${PH.cart.count() === 1 ? "" : "s"} · stock is checked again when you place the order</div>
      ${over.length ? `<div class="note bad" style="margin-top:16px">${ico("alert", 16)} Stock changed: ${over.map((i) => `${esc(i.name)} has only ${i.stock} left`).join(", ")}. <button class="btn xs" id="fix">Use what's available</button></div>` : ""}
      <div class="row start stack-md" style="margin-top:22px">
        <div class="card table-card grow"><div class="table-wrap"><table>
          <thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody>
          ${q.items.map((i) => `<tr><td><div class="row keep center" style="gap:14px"><a class="art" href="product.html?sku=${encodeURIComponent(i.sku)}" style="width:90px;height:62px;flex-shrink:0">${art(i.art, i.name)}</a><div><b>${esc(i.name)}</b><div class="small muted">${esc(i.sku)} · ${i.stock} in stock</div></div></div></td>
            <td>${money(i.price)}</td>
            <td><div class="row keep center" style="gap:8px"><button class="btn xs icon" data-dec="${i.sku}" aria-label="Less" ${i.qty <= 1 ? "disabled" : ""}>${ico("minus", 16)}</button><b style="min-width:22px;text-align:center">${i.qty}</b><button class="btn xs icon" data-inc="${i.sku}" aria-label="More" ${i.qty >= i.stock ? "disabled" : ""}>${ico("plus", 16)}</button></div></td>
            <td><b>${money(i.price * i.qty)}</b></td>
            <td><button class="btn xs dg" data-rm="${i.sku}">${ico("trash", 16)}Remove</button></td></tr>`).join("")}
          </tbody></table></div></div>
        <aside class="card" style="width:min(400px,100%)"><h3>Order summary</h3>
          <div class="leader"><span>Subtotal</span><span class="fill"></span><span>${money(q.subtotal)}</span></div>
          <div class="leader"><span>Shipping</span><span class="fill"></span><span>${q.shipping ? money(q.shipping) : "Free"}</span></div>
          <div class="small muted">Free shipping from ${money(PH.api.FREE_SHIPPING_FROM)}</div>
          <div class="leader" style="font-size:20px"><b>Total</b><span class="fill"></span><b>${money(q.total)}</b></div>
          <a class="btn p block" style="margin-top:22px" href="${PH.session.customerId() ? "checkout.html" : "login.html?next=checkout.html"}" ${over.length ? 'aria-disabled="true" onclick="return false"' : ""}>Proceed to checkout</a>
          <a class="btn block" style="margin-top:14px" href="products.html">Continue shopping</a>
          ${PH.session.customerId() ? "" : '<p class="small muted">You will log in or create an account before checkout.</p>'}
        </aside></div>`;
  }
  $("#app").addEventListener("click", async (e) => {
    const t = e.target.closest("button"); if (!t) return;
    const c = PH.cart.get(), find = (s) => c.find((x) => x.sku === s);
    if (t.dataset.inc) PH.cart.update(t.dataset.inc, find(t.dataset.inc).qty + 1);
    if (t.dataset.dec) PH.cart.update(t.dataset.dec, find(t.dataset.dec).qty - 1);
    if (t.dataset.rm) {
      const p = PH.api.quote([{ sku: t.dataset.rm, qty: 1 }]).items[0];
      if (await dialog({ title: "Remove this item?", body: `${p.name} will be taken out of your cart.`, confirm: "Remove item", cancel: "Keep it", danger: true, icon: "trash" })) PH.cart.remove(t.dataset.rm);
    }
    if (t.id === "fix") PH.api.quote(c).items.forEach((i) => { if (i.qty > i.stock) PH.cart.update(i.sku, i.stock); });
  });
  document.addEventListener("cart:change", draw);
  draw();
  PH.ui.storeFooter();
})();
