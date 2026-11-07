/* 08 Sign up + 09 Log in (sample accounts only; the real API will hash passwords, D9) */
(async () => {
  const { $, esc, ico, qs, errorText, busy, toast } = PH.ui;
  const isSignup = location.pathname.endsWith("signup.html");
  const next = qs("next") || "account.html";
  const safeNext = /^[a-z-]+\.html(\?.*)?$/i.test(next) ? next : "account.html"; // only our own pages
  await PH.ui.storeHeader(isSignup ? "" : "");
  if (PH.session.customerId() && !isSignup) { location.href = safeNext; return; }

  const side = `<div class="photo grow" style="min-height:420px;background-image:linear-gradient(rgba(17,17,17,.15),rgba(17,17,17,.55)),url('../shared/img/keyboard.jpg');display:flex;flex-direction:column;justify-content:flex-end;padding:32px;color:#fff">
      <div class="hud-eyebrow" style="color:#FFE500">Power House // ${isSignup ? "new account" : "log in"}</div><h1 class="hud-title" style="color:#fff">Your PC<br>hardware store.</h1><p style="max-width:420px">Shop parts, accessories and prebuilt PCs. Track every order from packing to received.</p>
      <div class="small">Photo: backlit keyboard by Colin, CC BY-SA 4.0</div></div>`;
  const f = (id, label, type, extra = "", help = "") => `<div class="field" id="f-${id}"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${extra}>${help ? `<div class="help">${help}</div>` : ""}<div class="err hidden"></div></div>`;

  $("#app").innerHTML = `<div class="row start" style="gap:40px">${side}
    <form class="card hud-frame" style="width:min(480px,100%);padding:36px" novalidate id="form">
      ${isSignup ? `<div class="hud-eyebrow">Account // sign up</div><h2 class="bracket" style="margin-top:8px">Create your account</h2><p class="muted">Sign up to place orders, track them and sell us your parts.</p>
        <div style="margin-top:24px">${f("name", "Full name", "text", 'autocomplete="name"')}${f("email", "Email", "email", 'autocomplete="email" placeholder="name@example.com"')}${f("phone", "Mobile number (optional)", "tel", 'inputmode="numeric" placeholder="09__ ___ ____"')}
        ${f("pw", "Password", "password", 'autocomplete="new-password"', "At least 8 characters, with one number")}${f("pw2", "Confirm password", "password", 'autocomplete="new-password"')}
        <label class="check"><input type="checkbox" id="agree"> I understand this is a student demo with sample data only</label><div class="err hidden" id="agree-err"></div></div>
        <button class="btn p block" style="margin-top:32px" id="go">Create account</button>
        <p style="text-align:center" class="muted">Already have an account? <a href="login.html${qs("next") ? "?next=" + encodeURIComponent(next) : ""}">Log in</a></p>`
      : `<div class="hud-eyebrow">Account // log in</div><h2 class="bracket" style="margin-top:8px">Welcome back</h2><p class="muted">${/^(cart|checkout)/.test(next) ? "Log in to see your cart and check out." : "Log in to your Power House account."}</p>
        <div class="note" style="margin:18px 0 22px">Sample account: <b>test1@example.com</b> / <b>sample123</b></div>
        ${f("email", "Email", "email", 'autocomplete="email" placeholder="name@example.com"')}${f("pw", "Password", "password", 'autocomplete="current-password"')}
        <div class="err hidden" id="login-err" style="margin-top:-10px;margin-bottom:12px"></div>
        <button class="btn p block" style="margin-top:20px" id="go">Log in</button>
        <p style="text-align:center" class="muted">New here? <a href="signup.html${qs("next") ? "?next=" + encodeURIComponent(next) : ""}">Create an account</a></p>
        <p style="text-align:center" class="small muted">Staff member? <a href="../staff-dashboard/login.html">Go to the Staff Portal</a></p>`}
    </form></div>`;

  if (isSignup) PH.ui.digitBoxes($("#phone"), [4, 3, 4], "Mobile number");
  const setErr = (id, msg) => { const box = $("#f-" + id); if (!box) return; box.classList.toggle("bad", !!msg); const e = box.querySelector(".err"); e.textContent = msg || ""; e.classList.toggle("hidden", !msg); };

  $("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#go");
    const email = $("#email").value.trim(), pw = $("#pw").value;
    if (isSignup) {
      const name = $("#name").value.trim(), pw2 = $("#pw2").value, phone = $("#phone").value.trim();
      const errs = {
        name: name.length < 2 ? "Enter your name." : "",
        email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter an email like name@example.com." : "",
        phone: phone && !/^09\d{9}$/.test(phone.replace(/\D/g, "")) ? "Use 11 digits starting with 09, or leave it empty." : "",
        pw: pw.length < 8 || !/\d/.test(pw) ? "Use at least 8 characters with one number." : "",
        pw2: pw2 !== pw ? "The passwords don't match." : ""
      };
      Object.entries(errs).forEach(([k, v]) => setErr(k, v));
      const agree = $("#agree").checked; $("#agree-err").textContent = agree ? "" : "Please tick this box to continue."; $("#agree-err").classList.toggle("hidden", agree);
      const bad = Object.keys(errs).find((k) => errs[k]);
      if (bad) { $("#" + bad).focus(); return; }
      if (!agree) return;
      busy(btn, true, "Creating account…");
      try { await PH.api.signup({ name, email, password: pw, phone }); toast("Account created. Welcome!"); location.href = safeNext; }
      catch (err) { busy(btn, false); setErr("email", errorText(err)); }
    } else {
      if (!email || !pw) { $("#login-err").textContent = "Enter your email and password."; $("#login-err").classList.remove("hidden"); return; }
      busy(btn, true, "Logging in…");
      try { await PH.api.login(email, pw); location.href = safeNext; }
      catch (err) { busy(btn, false); $("#login-err").textContent = errorText(err); $("#login-err").classList.remove("hidden"); $("#pw").select(); }
    }
  });
  PH.ui.storeFooter();
})();
