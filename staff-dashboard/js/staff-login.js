/* S1 Staff login: staff-only; customers use the store login (D9) */
(() => {
  const { $, errorText, busy } = PH.ui;
  if (PH.session.staff()) { location.href = "index.html"; return; }
  document.body.querySelector("#app").outerHTML = `<main id="app" class="row" style="min-height:100vh;gap:0">
    <div class="photo grow" style="min-height:300px;border-radius:0;background-image:url('../shared/img/motherboard.jpg')" role="img" aria-label="Motherboard photo"></div>
    <div class="grow" style="display:flex;align-items:center;justify-content:center;padding:24px">
      <form class="card" style="width:min(480px,100%);padding:40px" id="form" novalidate>
        <span class="logo"><span class="mark">PH</span>POWER HOUSE</span>
        <h2 style="margin-top:26px;font-size:36px">Staff Portal</h2>
        <p class="muted">Warehouse staff only. Customers, please use the <a href="../store-web/login.html">store login</a>.</p>
        <div class="note" style="margin:18px 0 22px">Sample staff login: <b>staff01</b> / <b>staff123</b></div>
        <div class="field"><label for="u">Username</label><input id="u" type="text" autocomplete="username"></div>
        <div class="field"><label for="p">Password</label><input id="p" type="password" autocomplete="current-password"></div>
        <div class="err hidden" id="err"></div>
        <button class="btn d block" style="margin-top:24px" id="go">Log in to dashboard</button>
        <p class="small muted" style="margin-top:18px">Restock, order status, reorders and trade-in reviews need a staff login.</p>
        <p class="small muted">Photo: motherboard by Jacek Halicki, CC BY-SA 4.0 · <a href="../store-web/index.html">Back to the store</a></p>
      </form></div></main>`;
  $("#u").focus();
  $("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#go");
    busy(btn, true, "Logging in…");
    try { await PH.api.staffLogin($("#u").value.trim(), $("#p").value); location.href = "index.html"; }
    catch (err) { busy(btn, false); $("#err").textContent = errorText(err); $("#err").classList.remove("hidden"); $("#p").select(); }
  });
})();
