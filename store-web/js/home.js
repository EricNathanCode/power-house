/* 01 Home */
(async () => {
  const { $, esc, money, ico, art, stockBadge, productRow } = PH.ui;
  await PH.ui.storeHeader();
  const all = await PH.api.listProducts();
  const pc = all.find((p) => p.sku === "PC-PH-STARTER");
  const count = (c) => all.filter((p) => p.category === c).length;
  const popular = ["RAM-DDR4-16GB", "SSD-NVME-1TB", "KB-MECH-001", "GPU-8GB", "HDD-2TB-72", "MON-24-144", "CPU-6C-12T", "HS-GAME-01", "PC-PH-OFFICE"].map((s) => all.find((p) => p.sku === s)).filter(Boolean);
  const low = all.filter((p) => p.lowStockLevel > 0 && p.stock > 0 && p.stock <= p.lowStockLevel);
  const used = all.filter((p) => p.condition === "used" && p.stock > 0);
  const units = all.reduce((s, p) => s + Math.max(p.stock, 0), 0);
  const news = [
    `${PH.ui.ico("bolt", 16)} Live from the warehouse: <b>${units} units</b> on the shelf`,
    ...low.map((p) => `▲ Only <b>${p.stock} left</b>: ${esc(p.name)}`),
    ...used.map((p) => `◆ Used, tested: ${esc(p.name)} <b>${money(p.price)}</b>`),
    `${PH.ui.ico("truck", 16)} Free shipping from <b>${money(PH.api.FREE_SHIPPING_FROM)}</b>`,
    `${PH.ui.ico("cash", 16)} Cash on Delivery or GCash <b>(SIMULATED)</b>`,
    `${PH.ui.ico("swap", 16)} Sell us your old parts: <b>up to 60%</b> of our price`
  ];
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
      <div class="cats" style="margin-top:26px">${cats.map(([c, label, img, unit]) => `
        <a href="products.html?category=${c}" style="color:var(--ink)"><div class="photo cat-photo" style="background-image:url('${img}')" role="img" aria-label="${label} photo"></div>
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

  <div class="marquee" role="region" aria-label="Warehouse news"><div class="marquee-track">${news.map((n) => `<span>${n}</span>`).join("")}</div><button type="button" class="marquee-toggle" aria-pressed="false">Pause</button></div>

  <section class="carousel" aria-label="Popular right now">
    <div class="head"><h3>Popular right now</h3><div class="arrows"><button class="btn icon sm" data-prev aria-label="Previous products">${PH.ui.ico("chev", 18).replace("<svg", '<svg style="transform:rotate(180deg)"')}</button><button class="btn icon sm" data-next aria-label="More products">${PH.ui.ico("chev", 18)}</button></div></div>
    <div class="track">${popular.map(PH.ui.productCard).join("")}</div>
  </section>

  <div class="inset row wrapflex" style="margin-top:30px;padding:16px 22px;gap:20px;justify-content:space-between">
    ${[["bolt", "Stock counted live by our warehouse"], ["truck", "Every order tracked to your door"], ["cash", "Cash on Delivery"], ["shield", "1-year shop warranty"]].map(([i, t]) => `<span class="row keep center" style="gap:10px;font-weight:700">${ico(i, 20, "#0249E1")}${t}</span>`).join("")}
  </div>`;
  PH.ui.storeFooter();
})();
