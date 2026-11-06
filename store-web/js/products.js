/* 02 Category / search results, with chips instead of long menus (UI idea 10) */
(async () => {
  const { $, $$, esc, qs, badge, productCard } = PH.ui;
  const category = qs("category") || "";
  const q = qs("q") || "";
  const titles = { part: ["PC Parts", "CPU, motherboard, RAM, storage, GPU and power supplies."], accessory: ["Accessories", "Keyboards, mice, headsets and monitors."], prebuilt: ["Prebuilt PCs", "Built and tested by Power House."] };
  const active = { part: "PC Parts", accessory: "Accessories", prebuilt: "Prebuilt PCs" }[category] || "";
  await PH.ui.storeHeader(active);
  const list = await PH.api.listProducts({ category, q });
  const state = { type: "All", cond: "all", inStock: false, sort: "featured" };

  const [title, sub] = q ? [`Results for “${q}”`, `${list.length} product${list.length === 1 ? "" : "s"} found`] : titles[category] || ["All products", "Everything in our warehouse."];
  const n = (f) => list.filter(f).length;
  const types = ["All", ...new Set(list.map((p) => p.type))];

  $("#app").innerHTML = `
    <form class="search only-sm" action="products.html" role="search" style="width:100%;margin-bottom:16px"><label class="sr-only" for="q2">Search</label>${PH.ui.ico("search", 18)}<input id="q2" name="q" type="search" placeholder="Search parts and PCs…" value="${esc(q)}"></form>
    <div class="small muted"><a href="index.html">Home</a> / ${esc(q ? "Search" : title)}</div>
    <div class="row between center wrapflex" style="margin-top:8px;gap:16px">
      <div><h2>${esc(title)}</h2><div class="muted">${esc(sub)}</div></div>
      <div class="inset row keep wrapflex center" style="padding:12px 16px;gap:10px">${badge("ok", n((p) => p.stock > 0 && p.condition === "new") + " in stock")}${badge("low", n((p) => p.lowStockLevel > 0 && p.stock > 0 && p.stock <= p.lowStockLevel) + " low")}${badge("out", n((p) => p.stock <= 0) + " sold out")}${badge("used", n((p) => p.condition === "used") + " used")}</div>
    </div>
    <div class="row between center wrapflex" style="margin-top:22px;gap:14px">
      <div class="chips" role="group" aria-label="Filter by type" id="types">${types.map((t) => `<button class="chip ${t === "All" ? "on" : ""}" data-type="${esc(t)}">${esc(t)} · ${t === "All" ? list.length : n((p) => p.type === t)}</button>`).join("")}</div>
      <div class="row keep center wrapflex" style="gap:12px">
        <div class="chips" role="group" aria-label="Condition">${[["all", "New + used"], ["new", "New"], ["used", "Used"]].map(([v, l]) => `<button class="chip ${v === "all" ? "on" : ""}" data-cond="${v}">${l}</button>`).join("")}</div>
        <label class="check" style="margin:0"><input type="checkbox" id="instock"> In stock only</label>
        <label class="sr-only" for="sort">Sort</label>
        <select id="sort" style="width:200px"><option value="featured">Sort: Featured</option><option value="low">Price, low to high</option><option value="high">Price, high to low</option><option value="stock">Most in stock</option></select>
      </div>
    </div>
    <div class="g4" id="grid" style="margin-top:22px"></div>`;

  function draw() {
    let out = list.filter((p) => (state.type === "All" || p.type === state.type) && (state.cond === "all" || p.condition === state.cond) && (!state.inStock || p.stock > 0));
    const s = { low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, stock: (a, b) => b.stock - a.stock }[state.sort];
    if (s) out = out.slice().sort(s);
    $("#grid").innerHTML = out.length ? out.map(productCard).join("") :
      `<div class="card" style="grid-column:1/-1;text-align:center;padding:40px"><h3>No products match</h3><p class="muted">Try another type, or turn off “In stock only”.</p><a class="btn" href="products.html">See all products</a></div>`;
  }
  $("#types").addEventListener("click", (e) => { const b = e.target.closest("[data-type]"); if (!b) return; state.type = b.dataset.type; $$("#types .chip").forEach((c) => c.classList.toggle("on", c === b)); draw(); });
  $$("[data-cond]").forEach((b) => b.addEventListener("click", () => { state.cond = b.dataset.cond; $$("[data-cond]").forEach((c) => c.classList.toggle("on", c === b)); draw(); }));
  $("#instock").addEventListener("change", (e) => { state.inStock = e.target.checked; draw(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; draw(); });
  draw();
  PH.ui.storeFooter();
})();
