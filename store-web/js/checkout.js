/* 05 Checkout in 4 steps (UX rule 2), masks (rule 8), type-to-search city (rule 3), GCash SIMULATED (D8) */
(async () => {
  const { $, esc, money, ico, art, steps, toast, typeahead, maskPhone, maskDigits, modal, errorText, busy } = PH.ui;
  if (!PH.ui.requireLogin()) return;
  const me = await PH.ui.storeHeader();
  if (!PH.cart.count()) { location.href = "cart.html"; return; }

  const STEPS = ["Cart", "Delivery", "Payment", "Review"];
  const a = me.address || {};
  const st = { step: 1, name: me.name, phone: me.phone || "", street: a.street || "", zip: a.zip || "", city: a.city || "", save: true, pay: "COD" };

  const summary = () => {
    const q = PH.api.quote(PH.cart.get());
    return `<aside class="card" style="width:min(400px,100%)"><h3>Order summary</h3>
      ${q.items.map((i) => `<div class="leader"><span>${esc(i.name)} × ${i.qty}</span><span class="fill"></span><span>${money(i.price * i.qty)}</span></div>`).join("")}
      <div class="leader"><span>Shipping</span><span class="fill"></span><span>${q.shipping ? money(q.shipping) : "Free"}</span></div>
      <div class="leader" style="font-size:20px;border-top:4px dotted var(--sh-dark);padding-top:10px"><b>Total</b><span class="fill" style="border:0"></span><b>${money(q.total)}</b></div>
      <p class="small muted">${st.step < 3 ? "You'll choose Cash on Delivery or GCash (SIMULATED), then review everything before placing the order." : "Stock is checked one last time when you place the order."}</p></aside>`;
  };

  const field = (id, label, value, attrs = "", help = "") => `<div class="field" id="f-${id}"><label for="${id}">${label}</label><input id="${id}" value="${esc(value)}" ${attrs}>${help ? `<div class="help">${help}</div>` : ""}<div class="err hidden"></div></div>`;

  function body() {
    if (st.step === 0) {
      const q = PH.api.quote(PH.cart.get());
      return `<h3>Step 1 of 4 · Check your cart</h3>${q.items.map((i) => `<div class="row keep center" style="gap:14px;margin-top:16px"><div class="art" style="width:80px;height:56px">${art(i.art, i.name)}</div><div class="grow"><b>${esc(i.name)}</b><div class="small muted">${i.qty} × ${money(i.price)}</div></div><b>${money(i.price * i.qty)}</b></div>`).join("")}
        <div class="actions"><a class="btn" href="cart.html">Edit cart</a><button class="btn p grow" data-next>Continue to delivery</button></div>`;
    }
    if (st.step === 1) return `<h3>Step 2 of 4 · Where should we deliver?</h3><div style="margin-top:20px">
        <div class="row" style="gap:20px">${field("name", "Full name", st.name, 'autocomplete="name"')}${field("phone", "Mobile number", st.phone, 'type="tel" inputmode="numeric" placeholder="09__ ___ ____" autocomplete="tel"', "11 digits, starts with 09")}</div>
        <div class="row" style="gap:20px"><div class="grow">${field("street", "House no. and street", st.street, 'autocomplete="address-line1"')}</div><div style="width:200px">${field("zip", "ZIP code", st.zip, 'inputmode="numeric" placeholder="____"', "4 digits")}</div></div>
        <div class="field" id="f-city" style="position:relative"><label for="city">City or municipality <span class="small muted" style="font-weight:600">· type to search or scroll</span></label><input id="city" value="${esc(st.city)}" placeholder="Start typing, e.g. Ind"><div class="err hidden"></div></div>
        <label class="check"><input type="checkbox" id="save" ${st.save ? "checked" : ""}> Save this address to my account</label>
        <div class="note" style="margin-top:12px">Demo uses sample data only. Don't enter real personal information.</div></div>
        <div class="actions"><button class="btn" data-back>Back to cart</button><button class="btn p grow" data-next>Continue to payment</button></div>`;
    if (st.step === 2) return `<h3>Step 3 of 4 · How will you pay?</h3>
        <div class="row" style="gap:16px;margin-top:20px">
          <label class="choice"><input type="radio" name="pay" value="COD" ${st.pay === "COD" ? "checked" : ""}><span><b>Cash on Delivery</b><span class="small muted" style="display:block">Pay the rider when your order arrives</span></span></label>
          <label class="choice"><input type="radio" name="pay" value="GCASH_SIM" ${st.pay === "GCASH_SIM" ? "checked" : ""}><span><b>GCash</b> <span class="badge sim">SIMULATED</span><span class="small muted" style="display:block">Mock payment for the demo. No real money, no real GCash account.</span></span></label>
        </div>
        <div class="actions"><button class="btn" data-back>Back to delivery</button><button class="btn p grow" data-next>Continue to review</button></div>`;
    const q = PH.api.quote(PH.cart.get());
    return `<h3>Step 4 of 4 · Check and place your order</h3>
      <div class="g2" style="margin-top:18px">
        <div class="inset" style="padding:18px"><div class="small muted">Deliver to</div><b>${esc(st.name)}</b><div>${esc(st.street)}, ${esc(st.city)} ${esc(st.zip)}</div><div class="small muted">${esc(st.phone)}</div><button class="btn xs" style="margin-top:10px" data-go="1">${ico("edit", 14)}Change</button></div>
        <div class="inset" style="padding:18px"><div class="small muted">Payment</div><b>${st.pay === "COD" ? "Cash on Delivery" : "GCash (SIMULATED)"}</b><div class="small muted">${st.pay === "COD" ? `Prepare ${money(q.total)} for the rider` : "You'll confirm the mock payment next"}</div><button class="btn xs" style="margin-top:10px" data-go="2">${ico("edit", 14)}Change</button></div>
      </div>
      <div class="actions"><button class="btn" data-back>Back to payment</button><button class="btn p grow" id="place">${st.pay === "COD" ? "Place order" : "Pay with GCash (SIMULATED)"} · ${money(q.total)}</button></div>`;
  }

  function draw() {
    $("#app").innerHTML = `<div class="row between center wrapflex"><h2>Checkout</h2><a href="cart.html" class="small">← Back to cart</a></div>
      <div style="max-width:760px;margin-top:14px">${steps(STEPS, st.step)}</div>
      <div class="row start stack-md" style="margin-top:22px"><section class="card grow">${body()}</section>${summary()}</div>`;
    if (st.step === 1) {
      maskPhone($("#phone")); maskDigits($("#zip"), 4);
      typeahead($("#city"), () => PH.CITIES, () => {});
    }
  }

  function setErr(id, msg) { const f = $("#f-" + id); f.classList.toggle("bad", !!msg); const e = f.querySelector(".err"); e.textContent = msg || ""; e.classList.toggle("hidden", !msg); }
  function readDelivery() {
    st.name = $("#name").value.trim(); st.phone = $("#phone").value.trim(); st.street = $("#street").value.trim(); st.zip = $("#zip").value.trim(); st.city = $("#city").value.trim(); st.save = $("#save").checked;
    const digits = st.phone.replace(/\D/g, "");
    const errs = {
      name: st.name.length < 2 ? "Enter the name of the person receiving the order." : "",
      phone: !/^09\d{9}$/.test(digits) ? "Enter 11 digits starting with 09, like 0917 123 4567." : "",
      street: st.street.length < 4 ? "Enter the house number and street." : "",
      zip: !/^\d{4}$/.test(st.zip) ? "ZIP codes have 4 digits." : "",
      city: !PH.CITIES.includes(st.city) ? "Pick a city from the list." : ""
    };
    Object.entries(errs).forEach(([k, v]) => setErr(k, v));
    const bad = Object.keys(errs).find((k) => errs[k]);
    if (bad) $("#" + bad).focus();
    return !bad;
  }

  async function place(btn) {
    const lines = PH.cart.get();
    const total = PH.api.quote(lines).total;
    const address = `${st.street}, ${st.city} ${st.zip}`;
    let paymentRef = null;
    try {
      if (st.pay === "GCASH_SIM") {
        paymentRef = await new Promise((resolve, reject) => {
          modal(`<div class="row keep between center"><h2>GCash</h2><span class="badge sim">SIMULATED</span></div>
            <p class="muted">This is a pretend payment screen for the demo. No money moves and nothing connects to the real GCash.</p>
            <div class="inset" style="padding:20px;text-align:center;margin:18px 0"><div class="small muted">Amount to pay</div><div class="disp" style="font:700 40px var(--font-head)">${money(total)}</div><div class="small muted">Merchant: Power House (sample)</div></div>
            <button class="btn p block" data-pay>${ico("check", 18, "#fff")}Pay ${money(total)} (simulated)</button>
            <button class="btn dg block" data-fail style="margin-top:12px">Make the payment fail (test)</button>
            <button class="btn block" data-close style="margin-top:12px">Cancel and go back</button>`, (o, close) => {
            o.querySelector("[data-pay]").onclick = async (e) => { busy(e.currentTarget, true, "Paying…"); try { const r = await PH.api.simulateGcash(total, "pay"); close(); resolve(r.ref); } catch (err) { close(); reject(err); } };
            o.querySelector("[data-fail]").onclick = async (e) => { busy(e.currentTarget, true, "Paying…"); try { await PH.api.simulateGcash(total, "fail"); } catch (err) { close(); reject(err); } };
            o.addEventListener("click", (e) => { if (e.target === o || e.target.closest("[data-close]")) reject(null); });
          });
        });
      }
      busy(btn, true, "Placing your order…");
      if (st.save) await PH.api.saveAddress({ street: st.street, city: st.city, zip: st.zip });
      const r = await PH.api.placeOrder({ lines, paymentMethod: st.pay, paymentRef, address });
      PH.cart.clear();
      location.href = "order.html?id=" + encodeURIComponent(r.id);
    } catch (e) {
      busy(btn, false);
      if (!e) return; // closed the GCash window
      toast(errorText(e), true);
      if (e.code === "OUT_OF_STOCK") setTimeout(() => (location.href = "cart.html"), 1600);
    }
  }

  $("#app").addEventListener("click", (e) => {
    const t = e.target.closest("button,[data-go]"); if (!t) return;
    if (t.hasAttribute("data-next")) {
      if (st.step === 1 && !readDelivery()) return;
      if (st.step === 2) st.pay = (document.querySelector('input[name="pay"]:checked') || {}).value || "COD";
      st.step++; draw(); window.scrollTo(0, 0);
    }
    if (t.hasAttribute("data-back")) { if (st.step === 1) { location.href = "cart.html"; return; } if (st.step === 2) st.pay = (document.querySelector('input[name="pay"]:checked') || {}).value || st.pay; st.step--; draw(); }
    if (t.dataset.go) { st.step = Number(t.dataset.go); draw(); }
    if (t.id === "place") place(t);
  });
  draw();
  PH.ui.storeFooter();
})();
