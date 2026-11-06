/* 10 Sell to Us: 4 steps (Item → Condition & photos → Price → Review), offer by condition (D11, D13) */
(async () => {
  const { $, $$, esc, money, ico, steps, donut, typeahead, maskMoney, moneyValue, toast, errorText, busy } = PH.ui;
  if (!PH.ui.requireLogin()) return;
  await PH.ui.storeHeader("Sell to Us");

  const STEPS = ["Item", "Condition", "Price", "Review"];
  const DRAFT = "ph_sell_draft";
  let st = { step: 0, category: "PC Parts", type: "", brand: "", model: "", condition: "Good", files: [], askingPrice: 0, confirm: false };
  try { const d = JSON.parse(localStorage.getItem(DRAFT)); if (d) { st = { ...st, ...d, files: d.files || [] }; toast("We brought back your saved draft."); } } catch (e) {}
  const saveDraft = () => localStorage.setItem(DRAFT, JSON.stringify({ ...st, files: st.files.map((f) => ({ name: f.name, size: f.size, done: true })) }));

  const offer = () => PH.api.suggestOffer(st.type, st.condition);
  const conds = [["Like new", "No marks, original box, works perfectly"], ["Good", "Light wear, works perfectly"], ["Fair", "Visible wear or missing box, still works"]];
  const field = (id, label, value, extra = "", help = "") => `<div class="field" id="f-${id}" style="position:relative"><label for="${id}">${label}</label><input id="${id}" value="${esc(value)}" ${extra}>${help ? `<div class="help">${help}</div>` : ""}<div class="err hidden"></div></div>`;

  function side() {
    const o = offer();
    if (st.step === 0) return `<aside class="card" style="width:min(420px,100%)"><h3>How it works</h3>${PH.ui.vsteps([
      { label: "Tell us about the item", sub: "Type, brand, model, condition, photos", state: "cur" }, { label: "Staff review it", sub: "Usually within 1 working day", state: "todo" },
      { label: "Get an offer", sub: "60 / 45 / 30% of our price by condition", state: "todo" }, { label: "Bring it in, get paid", sub: "Cash on handover (sample)", state: "todo" }])}</aside>`;
    if (st.step === 1) return `<aside class="card" style="width:min(420px,100%)"><h3>Good photos get better offers</h3>
      ${["Use daylight or a bright room", "Show the serial sticker and the ports", "Include the box and cables if you have them"].map((t) => `<div class="row keep" style="gap:12px;margin-top:14px">${ico("check", 20, "#0249E1")}<span class="small">${t}</span></div>`).join("")}
      <div class="inset" style="padding:16px;margin-top:20px"><div class="small muted">So far</div><b>${esc(st.brand)} ${esc(st.model)}</b><div class="small muted">${esc(st.type)} · ${esc(st.category)}</div></div></aside>`;
    if (st.step === 2) return `<aside class="card" style="width:min(420px,100%)"><h3>How we price</h3>${conds.map(([c]) => `<div class="leader"><span>${c}</span><span class="fill"></span><span>${PH.api.OFFER_PCT[c] * 100}%</span></div>`).join("")}<p class="small muted">Percent of our current retail price for the same kind of item. Staff can adjust after they inspect it.</p>${o ? `<p class="small muted">Compared with: ${esc(o.refName)} (${money(o.retail)})</p>` : ""}</aside>`;
    return `<aside class="card" style="width:min(420px,100%)"><h3>What happens next</h3>${PH.ui.vsteps([
      { label: "Staff review it", sub: "Usually within 1 working day", state: "cur" }, { label: "You get an offer", sub: "Accept or decline in My trade-ins", state: "todo" },
      { label: "Bring it in", sub: "We inspect it at the counter", state: "todo" }, { label: "Get paid", sub: "Cash on handover (sample)", state: "todo" }])}</aside>`;
  }

  function body() {
    if (st.step === 0) return `<h3>Step 1 of 4 · What are you selling?</h3><div style="margin-top:20px">
      <div class="row" style="gap:20px"><div class="field grow"><label for="category">Category</label><select id="category">${Object.keys(PH.PART_TYPES).map((c) => `<option ${c === st.category ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="grow">${field("type", "Type of item", st.type, 'placeholder="Type to search, e.g. gra"', "Type to search, or scroll the list")}</div></div>
      <div class="row" style="gap:20px"><div class="grow">${field("brand", "Brand", st.brand, 'placeholder="e.g. Sample Brand"')}</div><div class="grow">${field("model", "Model", st.model, 'placeholder="e.g. Sample GPU 8GB"')}</div></div></div>
      <div class="actions"><button class="btn" data-save>Save draft</button><button class="btn p grow" data-next>Continue to condition</button></div>`;
    if (st.step === 1) return `<h3>Step 2 of 4 · What condition is it in?</h3>
      <div class="row" style="gap:16px;margin-top:18px">${conds.map(([c, d]) => `<label class="choice"><input type="radio" name="cond" value="${c}" ${st.condition === c ? "checked" : ""}><span><b>${c}</b> <span class="small" style="color:var(--action-ink);font-weight:700">· ${PH.api.OFFER_PCT[c] * 100}% offer</span><span class="small muted" style="display:block;margin-top:4px">${d}</span></span></label>`).join("")}</div>
      <span class="lab" style="margin-top:28px">Photos <span class="small muted" style="font-weight:600">· up to 5, JPG or PNG</span></span>
      <label class="drop" id="drop" for="photos"><span class="circ lg" style="margin:0 auto">${ico("upload", 28)}</span><b style="display:block;margin-top:12px">Drop photos here, or browse</b><span class="small muted">Show the front, the back and the ports. Demo: photos stay on your computer.</span>
        <input type="file" id="photos" accept="image/png,image/jpeg" multiple class="sr-only"></label>
      <div id="files">${fileRows()}</div>
      <div class="actions"><button class="btn" data-back>Back</button><button class="btn" data-save>Save draft</button><button class="btn p grow" data-next>Continue to price</button></div>`;
    if (st.step === 2) {
      const o = offer();
      const pct = Math.round(PH.api.OFFER_PCT[st.condition] * 100);
      return `<h3>Step 3 of 4 · Set your price</h3>
        ${o ? `<div class="inset row" style="padding:24px;margin-top:18px;gap:30px;align-items:center"><div class="grow"><div class="small muted">Our suggested offer for ${esc(st.brand)} ${esc(st.model)} (${esc(st.condition)})</div><div style="font:700 52px var(--font-head)">${money(o.offer)}</div>
          <div class="row keep center wrapflex" style="gap:10px"><span class="small muted">Our retail price ${money(o.retail)}</span><span class="badge ok">${pct}% of retail</span></div></div>${donut([[pct, "#0249E1"], [100 - pct, "transparent"]], 160, 18, pct + "%", "of retail")}</div>
          <div class="row" style="gap:14px;margin-top:18px">${conds.map(([c]) => { const p = Math.round(PH.api.OFFER_PCT[c] * 100); return `<button type="button" class="${c === st.condition ? "inset" : "card"} row keep center" data-cond="${c}" style="flex:1;padding:12px 16px;border-radius:999px;gap:12px;border:0;cursor:pointer;font-family:inherit;color:inherit;${c === st.condition ? "background:var(--sel-tint)" : ""}">${donut([[p, "#0249E1"], [100 - p, "transparent"]], 44, 6)}<span style="text-align:left"><b class="small">${c} · ${money(Math.round(o.retail * PH.api.OFFER_PCT[c]))}</b><span class="small muted" style="display:block">${p}% of retail</span></span></button>`; }).join("")}</div>`
        : `<div class="note" style="margin-top:18px">We don't sell this kind of item yet, so there's no automatic offer. Staff will price it by hand.</div>`}
        <div class="row" style="margin-top:26px;gap:20px;align-items:flex-end"><div class="grow">${field("ask", "Your asking price", st.askingPrice ? st.askingPrice.toLocaleString("en-PH") : "", 'inputmode="numeric" placeholder="₱ 0.00"')}</div><div class="note grow" id="cmp" style="margin-bottom:24px"></div></div>
        <div class="actions" style="margin-top:8px"><button class="btn" data-back>Back</button><button class="btn p grow" data-next>Continue to review</button></div>`;
    }
    const o = offer();
    const L = (k, v, b) => `<div class="leader"><span>${k}</span><span class="fill"></span><span>${b ? `<b>${v}</b>` : v}</span></div>`;
    return `<h3>Step 4 of 4 · Check and submit</h3><div style="margin-top:18px">
      ${L("Category", esc(st.category))}${L("Type", esc(st.type))}${L("Brand and model", `${esc(st.brand)} · ${esc(st.model)}`)}${L("Condition", esc(st.condition))}${L("Photos", st.files.length ? `${st.files.length} added` : "None")}
      ${L("Suggested offer", o ? money(o.offer) : "Staff will price it")}${L("Your asking price", money(st.askingPrice), true)}</div>
      <label class="check" style="margin-top:22px"><input type="checkbox" id="confirm" ${st.confirm ? "checked" : ""}> I confirm this item is mine and works as described (sample data)</label><div class="err hidden" id="confirm-err"></div>
      <div class="actions"><button class="btn" data-back>Back to price</button><button class="btn p grow" id="submit">Submit for review</button></div>`;
  }

  function fileRows() {
    return st.files.map((f, i) => `<div class="card row keep center" style="padding:12px 16px;margin-top:12px;gap:14px"><div class="inset" style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center">${ico("image", 20, "#0249E1")}</div>
      <div class="grow"><b class="small">${esc(f.name)}</b> <span class="small muted">· ${(f.size / 1048576).toFixed(1)} MB · ${f.done ? "added" : "adding…"}</span><div class="pbar" style="margin-top:8px"><i style="width:${f.done ? 100 : f.pct || 5}%"></i></div></div>
      <button type="button" class="btn xs icon" data-rmfile="${i}" aria-label="Remove ${esc(f.name)}">${ico("x", 16)}</button></div>`).join("");
  }
  function addFiles(list) {
    const imgs = Array.from(list).filter((f) => /image\/(png|jpe?g)/.test(f.type));
    if (imgs.length < list.length) toast("Only JPG or PNG photos, please.", true);
    for (const f of imgs) {
      if (st.files.length >= 5) { toast("Up to 5 photos.", true); break; }
      const item = { name: f.name, size: f.size, pct: 5, done: false };
      st.files.push(item);
      const tick = setInterval(() => { item.pct += 20; if (item.pct >= 100) { item.done = true; clearInterval(tick); } if ($("#files")) $("#files").innerHTML = fileRows(); }, 160); // simulated upload progress
    }
    $("#files").innerHTML = fileRows();
  }

  function draw() {
    $("#app").innerHTML = `<div class="row between center wrapflex"><div><h2 style="font-size:40px">Sell to Us</h2><div class="muted">Sell your used PC parts, accessories or prebuilt PC to Power House.</div></div><a class="btn sm" href="trade-ins.html">${ico("swap", 18)}My trade-ins</a></div>
      <div class="row start stack-md" style="margin-top:22px"><section class="card grow">${steps(STEPS, st.step)}<div style="margin-top:22px">${body()}</div></section>${side()}</div>`;
    if (st.step === 0) {
      typeahead($("#type"), () => PH.PART_TYPES[$("#category").value] || [], () => {});
      $("#category").addEventListener("change", (e) => { st.category = e.target.value; $("#type").value = ""; });
    }
    if (st.step === 1) {
      const drop = $("#drop");
      $("#photos").addEventListener("change", (e) => addFiles(e.target.files));
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
      drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
      $$('input[name="cond"]').forEach((r) => r.addEventListener("change", () => (st.condition = r.value)));
    }
    if (st.step === 2) { const a = $("#ask"); maskMoney(a); a.addEventListener("input", compare); compare(); }
  }
  function compare() {
    const o = offer(), v = moneyValue($("#ask")); st.askingPrice = v;
    const box = $("#cmp");
    if (!v) { box.textContent = "Enter the price you'd like. You'll see how it compares with our offer."; return; }
    if (!o) { box.textContent = "Staff will compare your price with the market."; return; }
    const d = v - o.offer;
    box.textContent = d > 0 ? `Your price is ${money(d)} above our offer. That's fine: staff will review it and reply with a final offer.` : d < 0 ? `Your price is ${money(-d)} below our offer. Nice: staff will likely accept it.` : "Your price matches our offer.";
  }
  function setErr(id, msg) { const f = $("#f-" + id); if (!f) return; f.classList.toggle("bad", !!msg); const e = f.querySelector(".err"); e.textContent = msg || ""; e.classList.toggle("hidden", !msg); }
  function validate() {
    if (st.step === 0) {
      st.category = $("#category").value; st.type = $("#type").value.trim(); st.brand = $("#brand").value.trim(); st.model = $("#model").value.trim();
      const errs = { type: !(PH.PART_TYPES[st.category] || []).includes(st.type) ? "Pick a type from the list." : "", brand: st.brand.length < 2 ? "Enter the brand." : "", model: st.model.length < 2 ? "Enter the model." : "" };
      Object.entries(errs).forEach(([k, v]) => setErr(k, v));
      const bad = Object.keys(errs).find((k) => errs[k]); if (bad) { $("#" + bad).focus(); return false; }
    }
    if (st.step === 1) { if (st.files.some((f) => !f.done)) { toast("Wait for the photos to finish adding.", true); return false; } }
    if (st.step === 2) { if (!(st.askingPrice >= 50)) { setErr("ask", "Enter an asking price of at least ₱50."); $("#ask").focus(); return false; } }
    return true;
  }

  $("#app").addEventListener("click", async (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.hasAttribute("data-next")) { if (!validate()) return; st.step++; draw(); window.scrollTo(0, 0); }
    if (t.hasAttribute("data-back")) { st.step--; draw(); }
    if (t.hasAttribute("data-save")) { if (st.step === 0) { st.category = $("#category").value; st.type = $("#type").value.trim(); st.brand = $("#brand").value.trim(); st.model = $("#model").value.trim(); } saveDraft(); toast("Draft saved on this device."); }
    if (t.dataset.cond) { st.condition = t.dataset.cond; draw(); }
    if (t.dataset.rmfile) { st.files.splice(Number(t.dataset.rmfile), 1); $("#files").innerHTML = fileRows(); }
    if (t.id === "submit") {
      st.confirm = $("#confirm").checked;
      $("#confirm-err").textContent = st.confirm ? "" : "Please tick this box to submit."; $("#confirm-err").classList.toggle("hidden", st.confirm);
      if (!st.confirm) return;
      busy(t, true, "Submitting…");
      try {
        const r = await PH.api.submitTradeIn({ category: st.category, type: st.type, brand: st.brand, model: st.model, condition: st.condition, askingPrice: st.askingPrice, photos: st.files.length });
        localStorage.removeItem(DRAFT);
        location.href = "trade-ins.html?new=" + encodeURIComponent(r.id);
      } catch (err) { busy(t, false); toast(errorText(err), true); }
    }
  });
  draw();
  PH.ui.storeFooter();
})();
