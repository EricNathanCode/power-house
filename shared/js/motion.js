/* Power House motion (D30).
   Weighting: Jakub (polish) for the store, Emil (restraint) for the staff dashboard, a little Jhey for the product showcase.
   - Scroll reveal: opacity + translateY + blur, once, staggered. Elements already on screen after an action appear instantly
     (staff tables redraw after every click, so they must not re-animate).
   - Ticker: "live from the warehouse" strip moving right to left, never stops (only the reduce-motion setting turns it off).
   - Carousels: native swipe/scroll-snap + arrow buttons + mouse drag.
   - Scroll progress bar + header shadow once you scroll.
   - Big titles decode in (letters scramble, then lock in), once. More HUD motion in style.css "Moving parts (D35)".
   Everything turns off with prefers-reduced-motion. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const calm = () => reduce.matches;
  const SEL = [".wrap > .card", ".wrap > section", ".wrap > .row > *", ".wrap > .row > section > *", ".pcard", ".prow", ".tiles > *", ".cats > *",
    ".kpis > *", ".wrap > h3", ".table-card", ".stack > *", "article.card", ".wrap > .marquee", ".wrap > .carousel", ".hud-sec .reveal", ".hud-sec > .carousel"].join(",");
  const SKIP = ".overlay, .toasts, .dd, .nav, .tabbar, .foot, .track .pcard, .hud-rail, .show-list";
  const bootAt = performance.now();
  const seen = new WeakSet();

  /* ---------- scroll reveal ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { play(e.target); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;

  const waiting = [];
  document.addEventListener("ph:ready", () => waiting.splice(0).forEach((el, i) => setTimeout(() => play(el), 120 + i * 20)));
  function play(el) {
    if (document.documentElement.classList.contains("ph-loading")) { waiting.push(el); return; }
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
    setTimeout(() => (el.textContent = fmt(to)), dur + 150); // always end on the real number, even if frames were paused
  }

  /* ---------- title decode: letters scramble, then lock in left to right (HUD feel), once per title ---------- */
  const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/_";
  const sio = "IntersectionObserver" in window ? new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return; sio.unobserve(e.target);
    if (document.documentElement.classList.contains("ph-loading")) document.addEventListener("ph:ready", () => setTimeout(() => decode(e.target), 150), { once: true });
    else decode(e.target);
  }), { threshold: 0.3 }) : null;
  function decode(el) {
    const nodes = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) nodes.push([w.currentNode, w.currentNode.nodeValue]);
    const total = nodes.reduce((s, [, t]) => s + t.length, 0); if (!total) return;
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", nodes.map(([, t]) => t).join(" ").replace(/\s+/g, " ").trim()); // screen readers get the real words
    const dur = Math.min(1000, 360 + total * 26), start = performance.now();
    const frame = (t) => {
      const k = Math.min((t - start) / dur, 1), lock = Math.floor(k * total); let i = 0;
      nodes.forEach(([n, orig]) => { n.nodeValue = [...orig].map((c) => (i++ < lock || /[\s.,!?]/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(""); });
      if (k < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setTimeout(() => nodes.forEach(([n, o]) => (n.nodeValue = o)), dur + 120); // always end on the real text
  }
  function titles(root) {
    if (calm() || !sio) return;
    root.querySelectorAll(".hud-title, .page-title").forEach((el) => { if (el.dataset.dec) return; el.dataset.dec = "1"; sio.observe(el); });
  }

  /* ---------- ticker (left ← right) ---------- */
  function ticker(el) {
    if (el.dataset.ready) return; el.dataset.ready = "1";
    const track = el.querySelector(".marquee-track");
    track.innerHTML += track.innerHTML.replace(/<span /g, '<span aria-hidden="true" '); // second copy for a seamless loop
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
    titles(root);
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
