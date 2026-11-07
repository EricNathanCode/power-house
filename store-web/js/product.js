/* 03 Product detail: quantity limited to what's in stock */
(async () => {
  const { $, esc, qs, money, ico, art, stockBadge, productRow, toast } = PH.ui;
  await PH.ui.storeHeader();
  let p;
  try { p = await PH.api.getProduct(qs("sku")); }
  catch (e) { $("#app").innerHTML = `<div class="card" style="text-align:center;padding:40px"><h2>Product not found</h2><p class="muted">It may have been removed.</p><a class="btn p" href="products.html">Browse products</a></div>`; PH.ui.storeFooter(); return; }
  document.title = p.name + " · Power House";
  const catName = { part: "PC Parts", accessory: "Accessories", prebuilt: "Prebuilt PCs" }[p.category];
  const related = (await PH.api.listProducts({ category: p.category })).filter((x) => x.sku !== p.sku).sort((a, b) => (b.type === p.type) - (a.type === p.type)).slice(0, 8);
  const inCart = () => (PH.cart.get().find((x) => x.sku === p.sku) || {}).qty || 0;
  const maxQty = () => Math.max(0, p.stock - inCart());
  let qty = Math.min(1, maxQty());

  $("#app").innerHTML = `
    <div class="small muted mono"><a href="index.html">Home</a> / <a href="products.html?category=${p.category}">${catName}</a> / ${esc(p.type)}</div>
    <div class="row start stack-md" style="margin-top:18px;gap:40px">
      <div class="grow"><div class="hud-frame stage-box hud-grid"><div class="hud-ghost" aria-hidden="true" style="left:16px;bottom:-10px;font-size:clamp(70px,10vw,150px)">${esc(p.type)}</div><div class="hud-cross" style="left:14px;top:14px"></div><div class="hud-cross" style="right:14px;bottom:14px"></div><div class="art" style="height:clamp(220px,32vw,420px);background:transparent">${art(p.art, p.name)}</div></div><p class="small muted mono">FILE · ${esc(p.sku)} · drawing for the demo, sample product</p></div>
      <div style="width:min(520px,100%)">
        <div>${stockBadge(p)} ${p.stock > 0 ? `<span class="small muted" style="margin-left:6px">${p.stock} available</span>` : ""}</div>
        <div class="hud-eyebrow" style="margin-top:14px">${esc(catName)} // ${esc(p.type)}</div>
        <h1 class="bracket" style="font-size:clamp(30px,3.6vw,46px);margin-top:8px">${esc(p.name)}</h1>
        <div class="row keep wrapflex" style="gap:8px;margin-top:10px"><span class="tag"><b>SKU</b><span>${esc(p.sku)}</span></span><span class="tag"><b>Condition</b><span>${p.condition === "used" ? "Used, inspected" : "Brand new"}</span></span></div>
        <div class="price" style="font-size:40px;margin:14px 0">${money(p.price)}</div>
        <div class="field" style="margin-bottom:0"><span class="lab">Quantity</span>
          <div class="row keep center" style="gap:12px"><button class="btn icon" id="minus" aria-label="Less">${ico("minus")}</button><b id="qty" style="min-width:28px;text-align:center;font-size:20px">${qty}</b><button class="btn icon" id="plus" aria-label="More">${ico("plus")}</button><span class="small muted" id="qtyhelp"></span></div></div>
        <div class="actions"><button class="btn p grow" id="add" data-hold title="Press and hold to add">${ico("cart", 18, "currentColor")}Add to cart</button><button class="btn" id="buy">Buy now</button></div>
        <div class="card" style="margin-top:28px"><h3>Specs</h3>${Object.entries(p.specs || {}).map(([k, v]) => `<div class="leader"><b>${esc(k)}</b><span class="fill"></span><span>${esc(v)}</span></div>`).join("") || '<p class="muted">No specs yet.</p>'}</div>
        <div class="small muted" style="margin-top:14px">${ico("bolt", 16)} Stock is checked again when you place the order, so two people can't buy the last one.</div>
      </div>
    </div>
    ${related.length ? `<section class="carousel" aria-label="You may also need"><div class="head"><h3>You may also need</h3><div class="arrows"><button class="btn icon sm" data-prev aria-label="Previous products">${ico("chev", 18).replace("<svg", '<svg style="transform:rotate(180deg)"')}</button><button class="btn icon sm" data-next aria-label="More products">${ico("chev", 18)}</button></div></div><div class="track">${related.map(PH.ui.productCard).join("")}</div></section>` : ""}`;

  function sync() {
    const m = maxQty();
    if (qty > m) qty = m;
    if (qty < 1 && m > 0) qty = 1;
    $("#qty").textContent = qty;
    $("#minus").disabled = qty <= 1;
    $("#plus").disabled = qty >= m;
    $("#add").disabled = $("#buy").disabled = m <= 0;
    $("#qtyhelp").textContent = p.stock <= 0 ? "Out of stock" : m <= 0 ? "All available units are in your cart" : `Up to ${m}${inCart() ? ` more (you have ${inCart()} in your cart)` : ""}`;
  }
  $("#minus").onclick = () => { qty--; sync(); };
  $("#plus").onclick = () => { qty++; sync(); };
  // press and hold (D36); a plain click while logged out opens the log-in dialog (shared handler in ui.js)
  $("#add").addEventListener("hold:done", () => { PH.cart.add(p.sku, qty); PH.ui.holdResult($("#add"), true); toast(`Added ${qty} × ${p.name} to your cart`); qty = 1; sync(); });
  $("#buy").onclick = async () => { if (await PH.ui.needLogin()) return; PH.cart.add(p.sku, qty); location.href = "cart.html"; };
  document.addEventListener("cart:change", sync);
  sync();
  PH.ui.storeFooter();
})();
