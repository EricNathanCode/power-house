/* 03 Product detail: quantity limited to what's in stock */
(async () => {
  const { $, esc, qs, money, ico, art, stockBadge, productRow, toast } = PH.ui;
  await PH.ui.storeHeader();
  let p;
  try { p = await PH.api.getProduct(qs("sku")); }
  catch (e) { $("#app").innerHTML = `<div class="card" style="text-align:center;padding:40px"><h2>Product not found</h2><p class="muted">It may have been removed.</p><a class="btn p" href="products.html">Browse products</a></div>`; PH.ui.storeFooter(); return; }
  document.title = p.name + " · Power House";
  const catName = { part: "PC Parts", accessory: "Accessories", prebuilt: "Prebuilt PCs" }[p.category];
  const related = (await PH.api.listProducts({ category: p.category })).filter((x) => x.sku !== p.sku).sort((a, b) => (b.type === p.type) - (a.type === p.type)).slice(0, 4);
  const inCart = () => (PH.cart.get().find((x) => x.sku === p.sku) || {}).qty || 0;
  const maxQty = () => Math.max(0, p.stock - inCart());
  let qty = Math.min(1, maxQty());

  $("#app").innerHTML = `
    <div class="small muted"><a href="index.html">Home</a> / <a href="products.html?category=${p.category}">${catName}</a> / ${esc(p.type)}</div>
    <div class="row start stack-md" style="margin-top:18px;gap:36px">
      <div class="grow"><div class="art" style="height:clamp(220px,32vw,400px)">${art(p.art, p.name)}</div><p class="small muted">Drawing for the demo. Sample product, not a real brand.</p></div>
      <div style="width:min(520px,100%)">
        <div>${stockBadge(p)} ${p.stock > 0 ? `<span class="small muted" style="margin-left:6px">${p.stock} available</span>` : ""}</div>
        <h1 style="font-size:40px;margin-top:12px">${esc(p.name)}</h1>
        <div class="small muted" style="margin-top:6px">SKU ${esc(p.sku)} · ${p.condition === "used" ? "Used, inspected by staff" : "Brand new"}</div>
        <div class="price" style="font-size:40px;margin:14px 0">${money(p.price)}</div>
        <div class="field" style="margin-bottom:0"><span class="lab">Quantity</span>
          <div class="row keep center" style="gap:12px"><button class="btn icon" id="minus" aria-label="Less">${ico("minus")}</button><b id="qty" style="min-width:28px;text-align:center;font-size:20px">${qty}</b><button class="btn icon" id="plus" aria-label="More">${ico("plus")}</button><span class="small muted" id="qtyhelp"></span></div></div>
        <div class="actions"><button class="btn p grow" id="add">${ico("cart", 18, "#fff")}Add to cart</button><button class="btn" id="buy">Buy now</button></div>
        <div class="card" style="margin-top:28px"><h3>Specs</h3>${Object.entries(p.specs || {}).map(([k, v]) => `<div class="leader"><b>${esc(k)}</b><span class="fill"></span><span>${esc(v)}</span></div>`).join("") || '<p class="muted">No specs yet.</p>'}</div>
        <div class="small muted" style="margin-top:14px">${ico("bolt", 16)} Stock is checked again when you place the order, so two people can't buy the last one.</div>
      </div>
    </div>
    ${related.length ? `<h3 style="margin:36px 0 14px">You may also need</h3><div class="g4">${related.map(productRow).join("")}</div>` : ""}`;

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
  $("#add").onclick = () => { PH.cart.add(p.sku, qty); toast(`Added ${qty} × ${p.name} to your cart`); qty = 1; sync(); };
  $("#buy").onclick = () => { PH.cart.add(p.sku, qty); location.href = "cart.html"; };
  document.addEventListener("cart:change", sync);
  sync();
  PH.ui.storeFooter();
})();
