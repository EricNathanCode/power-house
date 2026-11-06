/* Power House motion (D30).
   Weighting: Jakub (polish) for the store, Emil (restraint) for the staff dashboard, a little Jhey for the product showcase.
   - Scroll reveal: opacity + translateY + blur, once, staggered. Elements already on screen after an action appear instantly
     (staff tables redraw after every click, so they must not re-animate).
   - Ticker: "live from the warehouse" strip moving right to left, pauses on hover/focus, has a Pause button.
   - Carousels: native swipe/scroll-snap + arrow buttons + mouse drag.
   - Scroll progress bar + header shadow once you scroll.
   Everything turns off with prefers-reduced-motion. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const calm = () => reduce.matches;
  const SEL = [".wrap > .card", ".wrap > section", ".wrap > .row > *", ".wrap > .row > section > *", ".pcard", ".prow", ".tiles > *", ".cats > *",
    ".kpis > *", ".wrap > h3", ".table-card", ".stack > *", "article.card", ".marquee", ".carousel"].join(",");
  const SKIP = ".overlay, .toasts, .dd, .nav, .tabbar, .foot, .track .pcard";
  const bootAt = performance.now();
  const seen = new WeakSet();

  /* ---------- scroll reveal ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { play(e.target); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;

  function play(el) {
    el.classList.add("in");
    el.querySelectorAll("[data-count]").forEach(countUp);
    setTimeout(() => el.classList.remove("rv"), 1800); // clean up so hover/press transforms work normally
  }
  function onScreen(el) { const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.92 && r.bottom > 0; }

  function scan(root) {
    if (calm() || !io) return;
    const initial = performance.now() - bootAt < 1500; // first paint of the page
    const groups = new Map();
    root.querySelectorAll(SEL).forEach((el) => {
      if (seen.has(el) || el.closest(SKIP)) return;
      seen.add(el);
      if (!initial && onScreen(el)) return; // redraw after a click: show instantly
      el.classList.add("rv");
      const p = el.parentElement; const i = groups.get(p) || 0; groups.set(p, i + 1);
      el.style.setProperty("--d", Math.min(i, 6) * 60 + "ms"); // stagger siblings, capped
      io.observe(el);
    });
  }

  /* ---------- count-up numbers (rare: first view only) ---------- */
  function countUp(el) {
    const to = Number(el.dataset.count); if (!isFinite(to)) return;
    const money = el.hasAttribute("data-money"), start = performance.now(), dur = 900;
    const fmt = (n) => (money ? "₱" : "") + Math.round(n).toLocaleString("en-PH");
    const step = (t) => { const k = Math.min((t - start) / dur, 1); const e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- ticker (left ← right) ---------- */
  function ticker(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    const track = el.querySelector(".marquee-track");
    track.innerHTML += track.innerHTML.replace(/<span /g, '<span aria-hidden="true" '); // second copy for a seamless loop
    const btn = el.querySelector(".marquee-toggle");
    if (btn) btn.addEventListener("click", () => { const p = el.classList.toggle("paused"); btn.textContent = p ? "Play" : "Pause"; btn.setAttribute("aria-pressed", p); });
  }

  /* ---------- carousel (swipe, arrows, drag) ---------- */
  function carousel(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    const track = el.querySelector(".track"), prev = el.querySelector("[data-prev]"), next = el.querySelector("[data-next]");
    const update = () => {
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    const go = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: calm() ? "auto" : "smooth" });
    if (prev) prev.addEventListener("click", () => go(-1));
    if (next) next.addEventListener("click", () => go(1));
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    // mouse drag (touch already scrolls natively)
    let down = false, x0 = 0, s0 = 0, moved = false;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft; track.classList.add("dragging"); });
    window.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) moved = true; track.scrollLeft = s0 - dx; });
    window.addEventListener("pointerup", () => { if (!down) return; down = false; track.classList.remove("dragging"); });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    update();
  }

  /* ---------- scroll progress + header shadow ---------- */
  function chrome() {
    const bar = document.createElement("div"); bar.className = "scroll-progress"; bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    let ticking = false;
    const tick = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
      const nav = document.querySelector(".nav"); if (nav) nav.classList.toggle("scrolled", scrollY > 8);
      ticking = false;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
    tick();
  }

  /* ---------- cart count bump (feedback when you add something) ---------- */
  document.addEventListener("cart:change", () => {
    if (calm()) return;
    document.querySelectorAll(".cart-btn").forEach((b) => { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); });
  });

  function enhance(root) {
    root.querySelectorAll(".marquee").forEach(ticker);
    root.querySelectorAll(".carousel").forEach(carousel);
    scan(root);
  }
  const mo = new MutationObserver((list) => {
    const roots = new Set();
    for (const m of list) m.addedNodes.forEach((n) => { if (n.nodeType === 1) roots.add(n.parentElement || n); });
    roots.forEach(enhance);
  });
  document.addEventListener("DOMContentLoaded", () => {
    chrome();
    enhance(document.body);
    mo.observe(document.body, { childList: true, subtree: true });
  });
  PH.motion = { scan, countUp };
})();
