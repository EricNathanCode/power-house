/* 01 Home: industrial HUD layout (D31). Full-screen sections that snap, a left section rail,
   a product "file" showcase, a dark live-warehouse section with a moving data field, and a yellow Sell to Us band.
   Our own content and drawings; style inspired by sci-fi HUD sites. */
(async () => {
  const { $, $$, esc, money, ico, art, stockBadge, productCard } = PH.ui;
  await PH.ui.storeHeader();
  document.body.classList.add("hud-home");
  document.documentElement.classList.add("hud-snap");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const all = await PH.api.listProducts();
  const pc = all.find((p) => p.sku === "PC-PH-STARTER") || all[0];
  const units = all.reduce((s, p) => s + Math.max(p.stock, 0), 0);
  const inStock = all.filter((p) => p.stock > 0).length;
  const low = all.filter((p) => p.lowStockLevel > 0 && p.stock > 0 && p.stock <= p.lowStockLevel);
  const used = all.filter((p) => p.condition === "used" && p.stock > 0);
  const count = (c) => all.filter((p) => p.category === c).length;
  const popular = ["RAM-DDR4-16GB", "SSD-NVME-1TB", "KB-MECH-001", "GPU-8GB", "HDD-2TB-72", "MON-24-144", "CPU-6C-12T", "HS-GAME-01", "PC-PH-OFFICE"].map((s) => all.find((p) => p.sku === s)).filter(Boolean);
  const showList = all.filter((p) => p.condition === "new");
  const CAT = { part: "PC Parts", accessory: "Accessories", prebuilt: "Prebuilt PC" };
  const pad = (n) => String(n).padStart(2, "0");
  const news = [
    `${ico("bolt", 15)} Live from the warehouse: <b>${units} units</b>`,
    ...low.map((p) => `▲ Only <b>${p.stock} left</b> · ${esc(p.name)}`),
    ...used.map((p) => `◆ Used, tested · ${esc(p.name)} <b>${money(p.price)}</b>`),
    `${ico("truck", 15)} Free shipping from <b>${money(PH.api.FREE_SHIPPING_FROM)}</b>`,
    `${ico("cash", 15)} COD or GCash <b>(SIMULATED)</b>`,
    `${ico("swap", 15)} Sell us your parts · up to <b>60%</b>`
  ];
  const sections = [["home", "home", "Home"], ["builds", "grid", "Product files"], ["parts", "box", "Shop"], ["warehouse", "chart", "Warehouse"], ["sell", "swap", "Sell to Us"]];
  const specs = (p, n = 6) => Object.entries(p.specs || {}).slice(0, n).map(([k, v]) => `<div class="leader"><span class="mono small">${esc(k)}</span><span class="fill"></span><span>${esc(v)}</span></div>`).join("");
  const arrow = (dir, label) => `<button class="btn icon sm" data-show="${dir}" aria-label="${label}">${ico("chev", 18).replace("<svg", `<svg style="transform:rotate(${dir < 0 ? 180 : 0}deg)"`)}</button>`;

  $("#app").innerHTML = `
  <nav class="hud-rail" aria-label="Page sections">
    ${sections.map(([id, i, l], k) => `<a href="#${id}" data-rail="${id}" class="${k === 0 ? "on" : ""}">${ico(i, 20)}<span>${pad(k + 1)} · ${l}</span></a>`).join("")}
    <div class="vert" aria-hidden="true">POWER HOUSE · SAMPLE STORE</div>
  </nav>
  <div class="hud-main">

    <section id="home" class="hud-sec hud-grid" aria-label="Welcome">
      <div class="hud-ghost" id="ghost-hero" aria-hidden="true" style="right:-40px;top:40px">POWER</div>
      <div class="hud-scan" aria-hidden="true"></div>
      <div class="hud-cross" style="left:24px;top:24px"></div><div class="hud-cross" style="right:24px;bottom:120px"></div>
      <div class="row center" style="gap:48px;position:relative;padding-bottom:40px">
        <div class="grow reveal">
          <div class="hud-eyebrow">Power House // live warehouse store</div>
          <h1 class="hud-title">Power up<br>your build.</h1>
          <p style="font-size:19px;max-width:520px;margin:18px 0 22px">PC parts, accessories and prebuilt desktops. Stock is counted live in our warehouse, and every order is tracked from packing to your door.</p>
          <div class="row keep wrapflex" style="gap:10px;margin-bottom:26px">
            <span class="tag"><b>On shelf</b><span>${units} units</span></span><span class="tag"><b>SKUs</b><span>${all.length}</span></span><span class="tag"><b>Pay</b><span>COD · GCash SIM</span></span>
          </div>
          <div class="row keep wrapflex" style="gap:14px"><a class="btn p" href="products.html?category=part">Shop PC parts</a><a class="btn" href="#sell">Sell your parts</a></div>
        </div>
        <div class="reveal" style="width:min(560px,100%)">
          <div class="hud-frame card" style="padding:26px" id="tilt">
            <div class="row keep between center"><span class="mono small">FILE · ${esc(pc.sku)}</span>${stockBadge(pc)}</div>
            <div class="art" style="height:230px;background:transparent;margin:6px 0">${art(pc.art, pc.name)}</div>
            <div class="row keep between" style="align-items:flex-end;gap:12px"><h2 class="bracket" style="margin:0">${esc(pc.name)}</h2><div class="price" style="font-size:32px">${money(pc.price)}</div></div>
            ${specs(pc, 4)}
            <div class="actions" style="margin-top:18px">${pc.stock > 0 ? `<button class="btn p grow" data-add="${pc.sku}" title="Press and hold to add">${ico("cart", 18)}Add build to cart</button>` : `<button class="btn grow" disabled>Out of stock</button>`}<a class="btn" href="product.html?sku=${encodeURIComponent(pc.sku)}">Details</a></div>
          </div>
        </div>
      </div>
      <div class="marquee" role="region" aria-label="Warehouse news" style="position:absolute;left:0;right:0;bottom:0;margin:0"><div class="marquee-track">${news.map((n) => `<span>${n}</span>`).join("")}</div></div>
    </section>

    <section id="builds" class="hud-sec" aria-label="Product files">
      <div class="hud-ghost" id="ghost-show" aria-hidden="true" style="left:120px;bottom:10px">${esc(showList[0].type)}</div>
      <div class="row between center wrapflex reveal" style="margin-bottom:26px;gap:12px;position:relative">
        <div><div class="hud-eyebrow">Product files</div><h2 class="hud-title" style="font-size:clamp(36px,4.5vw,64px)">Pick a part.</h2></div>
        <div class="row keep center" style="gap:10px"><span class="show-count" id="show-count">01 / ${pad(showList.length)}</span>${arrow(-1, "Previous product")}${arrow(1, "Next product")}</div>
      </div>
      <div class="show reveal" style="position:relative">
        <div class="show-list" role="listbox" aria-label="Products">${showList.map((p, i) => `<button role="option" aria-selected="${i === 0}" class="${i === 0 ? "on" : ""}" data-i="${i}" aria-label="${esc(p.name)}">${art(p.art, p.name)}</button>`).join("")}</div>
        <div class="show-stage hud-frame"><div class="art show-swap" id="show-art"></div></div>
        <div class="show-swap" id="show-info" aria-live="polite"></div>
      </div>
    </section>

    <section id="parts" class="hud-sec hud-grid" aria-label="Shop">
      <div class="reveal"><div class="hud-eyebrow">Shop by category</div><h2 class="hud-title" style="font-size:clamp(36px,4.5vw,64px)">Everything for the build.</h2></div>
      <div class="g4 reveal" style="margin-top:26px">
        ${[["products.html?category=part", "PC Parts", "../shared/img/motherboard.jpg", `${count("part")} items`],
           ["products.html?category=accessory", "Accessories", "../shared/img/keyboard.jpg", `${count("accessory")} items`],
           ["products.html?category=prebuilt", "Prebuilt PCs", "../shared/img/desktop-inside.jpg", `${count("prebuilt")} builds`],
           ["sell.html", "Sell to Us", "../shared/img/graphics-card.jpg", "Trade in your parts"]].map(([h, t, img, sub], i) => `
          <a class="card tile" href="${h}" style="padding:0;overflow:hidden"><div class="photo cat-photo" style="height:150px;border-radius:0;background-image:url('${img}')" role="img" aria-label="${t} photo"></div>
          <div style="padding:14px 16px"><span class="mono small muted">${pad(i + 1)} //</span><div style="font:700 21px var(--font-head)">${t}</div><span class="small muted">${sub}</span></div></a>`).join("")}
      </div>
      <section class="carousel" aria-label="Popular right now">
        <div class="head"><h3 class="bracket">Popular right now</h3><div class="arrows"><button class="btn icon sm" data-prev aria-label="Previous products">${ico("chev", 18).replace("<svg", '<svg style="transform:rotate(180deg)"')}</button><button class="btn icon sm" data-next aria-label="More products">${ico("chev", 18)}</button></div></div>
        <div class="track">${popular.map(productCard).join("")}</div>
      </section>
    </section>

    <section id="warehouse" class="hud-sec hud-dark" aria-label="Live warehouse">
      <canvas id="field" aria-hidden="true"></canvas>
      <div class="hud-ring" style="width:620px;height:620px;right:-160px;top:-120px"></div><div class="hud-ring r2" style="width:880px;height:880px;right:-290px;top:-250px"></div>
      <div class="reveal" style="position:relative"><div class="hud-eyebrow">Warehouse // live count</div><h2 class="hud-title" style="color:#fff">Counted live.</h2>
        <p class="muted" style="max-width:560px">Every order takes stock off the shelf the moment you place it, and every delivery puts it back. These numbers come straight from the warehouse data.</p></div>
      <div class="g4 reveal" style="margin-top:30px;position:relative">
        ${[[units, "units on the shelf"], [inStock, "products in stock"], [low.length, "running low"], [used.length, "used, tested items"]].map(([n, l]) => `<div class="card"><div class="hud-num" data-count="${n}">${n}</div><div class="mono small muted" style="margin-top:6px;text-transform:uppercase">${l}</div></div>`).join("")}
      </div>
      <div class="card reveal" style="margin-top:20px;position:relative;max-width:820px">
        <div class="row keep between center"><span class="bracket">Running low</span><span class="mono small muted">bar = stock · line = low level</span></div>
        ${low.map((p) => { const t = Math.max(p.lowStockLevel * 3, 1); return `<div class="row keep center between wrapflex" style="margin-top:14px;gap:10px 16px"><span style="min-width:160px;flex:1">${esc(p.name)}</span><div class="stockbar"><div class="track"><div class="fillbar" style="width:${Math.min(100, (p.stock / t) * 100)}%;background:#FFE500"></div><div class="mark" style="left:${(p.lowStockLevel / t) * 100}%;background:#fff"></div></div><span class="small"><b>${p.stock}</b> left</span></div></div>`; }).join("") || '<p class="muted">Nothing is low right now.</p>'}
        <div class="actions" style="margin-top:22px"><a class="btn p" href="orders.html">Track my order</a><a class="btn" style="background:transparent;color:#fff;border-color:#3A404A" href="products.html">Browse all stock</a></div>
      </div>
    </section>

    <section id="sell" class="hud-sec hud-band" aria-label="Sell to Us">
      <div class="hud-ribbon" aria-hidden="true"><div class="hud-ribbon-track">${(`<span>We buy</span>` + [...new Set(all.map((p) => p.type))].map((t) => `<i>/</i><span>${esc(t)}</span>`).join("") + "<i>//</i>").repeat(2)}</div></div>
      <div class="hud-ghost" aria-hidden="true" style="right:-30px;bottom:-20px;-webkit-text-stroke-color:rgba(17,17,17,.12)">TRADE</div>
      <div class="reveal" style="position:relative"><div class="hud-eyebrow" style="color:#111">Sell to Us // trade-in</div><h2 class="hud-title">Old parts?<br>Sell them to us.</h2></div>
      <div class="g4 reveal" style="margin-top:28px;position:relative">
        ${[["Tell us the item", "Type, brand, model, condition and photos."], ["Staff review it", "Usually within one working day."], ["Get an offer", "Like new 60% · Good 45% · Fair 30% of our price."], ["Bring it in, get paid", "Cash when you hand it over (sample)."]].map(([t, d], i) => `<div style="border-top:3px solid #111;padding-top:14px"><div class="mono" style="font-weight:600">${pad(i + 1)} //</div><div style="font:700 22px var(--font-head);margin:6px 0">${t}</div><div>${d}</div></div>`).join("")}
      </div>
      <div class="actions reveal" style="position:relative"><a class="btn d" href="sell.html">Start selling</a><a class="btn" href="trade-ins.html">My trade-ins</a></div>
    </section>
  </div>`;
  PH.ui.storeFooter();

  /* ---------- product showcase ---------- */
  let cur = 0;
  function renderShow(i, animate) {
    const p = showList[i];
    const fill = () => {
      $("#show-art").innerHTML = art(p.art, p.name);
      $("#show-info").innerHTML = `<div class="mono small muted">FILE ${pad(i + 1)} · ${esc(p.sku)}</div>
        <h2 class="bracket" style="font-size:clamp(28px,3vw,40px);margin:8px 0 12px">${esc(p.name)}</h2>
        <div class="row keep wrapflex" style="gap:8px"><span class="tag"><b>Category</b><span>${CAT[p.category]}</span></span><span class="tag"><b>Type</b><span>${esc(p.type)}</span></span></div>
        <div class="row keep center" style="gap:14px;margin:16px 0 6px"><div class="price" style="font-size:36px">${money(p.price)}</div>${stockBadge(p)}</div>
        ${specs(p, 4)}
        <div class="actions" style="margin-top:20px">${p.stock > 0 ? `<button class="btn p grow" data-add="${p.sku}" title="Press and hold to add">${ico("cart", 18)}Add to cart</button>` : `<button class="btn grow" disabled>Out of stock</button>`}<a class="btn" href="product.html?sku=${encodeURIComponent(p.sku)}">Details</a></div>`;
      $("#show-count").textContent = `${pad(i + 1)} / ${pad(showList.length)}`;
      $("#ghost-show").textContent = p.type;
    };
    $$(".show-list button").forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-selected", k === i); });
    const list = $(".show-list"), sel = $$(".show-list button")[i];
    if (sel && animate) { // keep the picked thumbnail visible without scrolling the whole page
      const vertical = getComputedStyle(list).flexDirection === "column";
      if (vertical) list.scrollTo({ top: sel.offsetTop - list.clientHeight / 2 + sel.clientHeight / 2, behavior: calm ? "auto" : "smooth" });
      else list.scrollTo({ left: sel.offsetLeft - list.clientWidth / 2 + sel.clientWidth / 2, behavior: calm ? "auto" : "smooth" });
    }
    if (!animate || calm) { fill(); return; }
    const parts = [$("#show-art"), $("#show-info")];
    parts.forEach((el) => el.classList.add("out"));
    setTimeout(() => {
      fill();
      parts.forEach((el) => { el.classList.remove("out"); el.classList.add("pre"); });
      requestAnimationFrame(() => requestAnimationFrame(() => parts.forEach((el) => el.classList.remove("pre"))));
    }, 220);
  }
  const go = (i) => { cur = (i + showList.length) % showList.length; renderShow(cur, true); };
  $(".show-list").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) go(Number(b.dataset.i)); });
  $(".show-list").addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowRight"].includes(e.key)) { e.preventDefault(); go(cur + 1); $$(".show-list button")[cur].focus({ preventScroll: true }); }
    if (["ArrowUp", "ArrowLeft"].includes(e.key)) { e.preventDefault(); go(cur - 1); $$(".show-list button")[cur].focus({ preventScroll: true }); }
  });
  $$("[data-show]").forEach((b) => b.addEventListener("click", () => go(cur + Number(b.dataset.show))));
  renderShow(0, false);

  /* ---------- left rail follows the section on screen ---------- */
  const rail = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) $$("[data-rail]").forEach((a) => a.classList.toggle("on", a.dataset.rail === e.target.id)); }), { threshold: 0.45 });
  sections.forEach(([id]) => rail.observe(document.getElementById(id)));

  if (calm) return;
  /* ---------- hero: outline text drifts left as you scroll; the build card tilts toward the mouse ---------- */
  const ghost = $("#ghost-hero"), tilt = $("#tilt");
  let ticking = false;
  addEventListener("scroll", () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ghost.style.transform = `translateX(${-scrollY * 0.25}px)`; ticking = false; }); }, { passive: true });
  if (matchMedia("(hover: hover)").matches) {
    tilt.style.transition = "transform .3s cubic-bezier(.22,1,.36,1)";
    tilt.addEventListener("pointermove", (e) => { const r = tilt.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; tilt.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`; });
    tilt.addEventListener("pointerleave", () => { tilt.style.transform = ""; });
  }

  /* ---------- warehouse: a slow data field of dots and links (runs only while the section is on screen) ---------- */
  const cv = $("#field"), ctx = cv.getContext("2d"), sec = $("#warehouse");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let dots = [], raf = 0, running = false, W = 0, H = 0;
  function size() {
    const r = sec.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, (W * H) / 16000));
    dots = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 }));
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of dots) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      ctx.fillStyle = "rgba(255,229,0,.55)"; ctx.fillRect(a.x - 1, a.y - 1, 2, 2);
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j], dx = a.x - b.x, dy = a.y - b.y, dist = dx * dx + dy * dy;
        if (dist < 12000) { ctx.strokeStyle = `rgba(255,229,0,${0.12 * (1 - dist / 12000)})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
    }
    if (running) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) { if (!dots.length) size(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }, { threshold: 0.05 }).observe(sec);
  addEventListener("resize", () => { if (dots.length) size(); });
})();
