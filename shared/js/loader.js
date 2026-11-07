/* Power House start-up loader (D32).
   Shows once per browser session when the store first opens:
   dark screen + house logo → yellow bar fills down the left edge with a % counter → yellow panel sweeps in → fades to the page.
   The progress waits for the page to finish loading. Click, Esc or Enter skips it. Never shown with reduced motion.
   The <head> of each store page adds html.ph-loading early (so nothing flashes) and removes it after 6 s as a safety net. */
(function () {
  const html = document.documentElement;
  if (!html.classList.contains("ph-loading")) return;
  const MIN = 1700;          // shortest time the loader stays, so it reads
  const start = performance.now();
  let loaded = document.readyState === "complete", done = false;
  addEventListener("load", () => (loaded = true));

  const el = document.createElement("div");
  el.id = "ph-loader";
  el.setAttribute("role", "status");
  el.setAttribute("aria-label", "Loading Power House");
  el.innerHTML = `
    <div class="pl-grid" aria-hidden="true"></div>
    <div class="pl-bar" aria-hidden="true"><i></i></div>
    <div class="pl-pct" aria-hidden="true"><span>0</span>%</div>
    <div class="pl-center">
      <div class="pl-logo">
        <span class="pl-house"><svg viewBox="0 0 24 24" width="64" height="64" fill="none" aria-hidden="true"><path d="M2.5 11 12 3l9.5 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/><path class="bolt" d="M13.2 9 8.8 15.4h3.1L10.9 21.6l4.6-7.2h-3.1L13.2 9Z"/></svg></span>
        <span class="pl-word">POWER<em>HOUSE</em></span>
      </div>
      <div class="pl-tag"><i></i>STOCK COUNTED LIVE // ORDERS TRACKED TO YOUR DOOR</div>
    </div>
    <div class="pl-meta" aria-hidden="true">PC HARDWARE STORE · SAMPLE DATA · ITEC 116</div>
    <button type="button" class="pl-skip">Skip</button>
    <div class="pl-wipe" aria-hidden="true"></div>`;
  document.body.appendChild(el);

  const bar = el.querySelector(".pl-bar i"), pct = el.querySelector(".pl-pct"), num = pct.querySelector("span");
  let shown = 0;
  function tick() {
    if (done) return;
    const k = Math.min((performance.now() - start) / MIN, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    const target = loaded ? eased * 100 : Math.min(eased * 100, 90); // time-based; holds at 90% until the page has loaded
    shown = Math.max(shown, target);
    if (loaded && k >= 1) shown = 100;
    const p = Math.round(shown);
    bar.style.transform = `scaleY(${shown / 100})`;
    pct.style.transform = `translateY(${(shown / 100) * (innerHeight - 56)}px)`;
    num.textContent = p;
    if (p >= 100) finish();
  }
  function finish() {
    if (done) return; done = true; clearInterval(loop);
    num.textContent = 100;
    bar.style.transform = "scaleY(1)";
    el.classList.add("wipe-in");                       // yellow panel sweeps in from the left
    setTimeout(() => {
      html.classList.remove("ph-loading");             // page is ready underneath
      el.classList.add("wipe-out");                    // loader content gone, yellow fades away
      document.dispatchEvent(new CustomEvent("ph:ready"));
      try { sessionStorage.setItem("ph_loaded", "1"); } catch (e) {}
      setTimeout(() => el.remove(), 700);
    }, 620);
  }
  const skip = () => { if (!done) { shown = 100; finish(); } };
  el.querySelector(".pl-skip").addEventListener("click", skip);
  addEventListener("keydown", (e) => { if (["Escape", "Enter", " "].includes(e.key) && html.classList.contains("ph-loading")) skip(); });
  const loop = setInterval(tick, 16);                  // a timer (not frame callbacks), so it also runs in background tabs
  setTimeout(skip, 4000);                              // never block the store for long
})();
