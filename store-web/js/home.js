/* 01 Home */
(async () => {
  const { $, esc, money, ico, art, stockBadge, productRow } = PH.ui;
  await PH.ui.storeHeader();
  const all = await PH.api.listProducts();
  const pc = all.find((p) => p.sku === "PC-PH-STARTER");
  const count = (c) => all.filter((p) => p.category === c).length;
  const popular = ["RAM-DDR4-16GB", "SSD-NVME-1TB", "KB-MECH-001", "HDD-2TB-72"].map((s) => all.find((p) => p.sku === s)).filter(Boolean);
  const cats = [
    ["part", "PC Parts", "../shared/img/motherboard.jpg", "items"],
    ["accessory", "Accessories", "../shared/img/keyboard.jpg", "items"],
    ["prebuilt", "Prebuilt PCs", "../shared/img/desktop-inside.jpg", "builds"]
  ];

  $("#app").innerHTML = `
  <section class="row start stack-md" style="gap:40px">
    <div class="grow" style="padding-top:10px">
      <h1>Power up<br>your build.</h1>
      <p style="font-size:19px;max-width:520px;margin:16px 0 22px">PC parts, accessories and prebuilt desktops, with stock counted live in our warehouse and every order tracked from packing to your door.</p>
      <div class="row keep wrapflex" style="gap:16px"><a class="btn p" href="products.html?category=part">Shop PC parts</a><a class="btn" href="sell.html">Sell your parts</a></div>
      <div class="g3" style="margin-top:26px;gap:16px">${cats.map(([c, label, img, unit]) => `
        <a href="products.html?category=${c}" style="color:var(--ink)"><div class="photo" style="height:110px;background-image:url('${img}')" role="img" aria-label="${label} photo"></div>
        <b style="display:block;margin-top:8px;font:700 19px var(--font-head)">${label}</b><span class="small muted">${count(c)} ${unit}</span></a>`).join("")}</div>
    </div>
    ${pc ? `<aside class="card" style="width:min(520px,100%);padding:26px">
      <div class="row keep between center"><span class="small muted"><b>Build sheet · ${esc(pc.sku)}</b></span>${stockBadge(pc)}</div>
      <h2 style="margin-top:10px">${esc(pc.name)}</h2>
      <div class="row keep center" style="gap:18px;margin:12px 0"><div class="art" style="width:100px;height:100px">${art(pc.art, pc.name)}</div><div><div class="price" style="font-size:40px">${money(pc.price)}</div><div class="small muted">Built and tested by Power House</div></div></div>
      ${Object.entries(pc.specs).map(([k, v]) => `<div class="leader"><b>${esc(k)}</b><span class="fill"></span><span>${esc(v)}</span></div>`).join("")}
      <div class="row keep" style="gap:14px;margin-top:20px">${pc.stock > 0 ? `<button class="btn p grow" data-add="${pc.sku}">${ico("cart", 18, "#fff")}Add build to cart</button>` : `<button class="btn grow" disabled>Out of stock</button>`}<a class="btn" href="products.html?category=prebuilt">See all builds</a></div>
    </aside>` : ""}
  </section>

  <h3 style="margin:36px 0 14px">Popular right now</h3>
  <div class="g4" style="gap:20px">${popular.map(productRow).join("")}</div>

  <div class="inset row wrapflex" style="margin-top:30px;padding:16px 22px;gap:20px;justify-content:space-between">
    ${[["bolt", "Stock counted live by our warehouse"], ["truck", "Every order tracked to your door"], ["cash", "Cash on Delivery"], ["shield", "1-year shop warranty"]].map(([i, t]) => `<span class="row keep center" style="gap:10px;font-weight:700">${ico(i, 20, "#0249E1")}${t}</span>`).join("")}
  </div>`;
  PH.ui.storeFooter();
})();
