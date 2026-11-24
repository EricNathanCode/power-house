/* 10e My trade-ins: progress at a glance (UI idea 2), accept or decline the offer */
(async () => {
  const { $, esc, money, ico, steps, statusBadge, date, when, dialog, toast, qs, errorText } = PH.ui;
  if (!PH.ui.requireLogin()) return;
  await PH.ui.storeHeader("Sell to Us");
  const FLOW = ["Submitted", "Under review", "Offer sent", "Accepted", "Received", "In stock"];
  const fresh = qs("new");
  if (fresh) toast(qs("missing") ? `${fresh} submitted, but ${qs("missing")} photo(s) didn't upload. Bring the item in and we'll check it there.` : `${fresh} submitted. We'll review it soon.`, !!qs("missing"));

  async function draw() {
    const list = await PH.api.myTradeIns();
    if (!list.length) {
      $("#app").innerHTML = `${PH.ui.hudHead({ eyebrow: "Sell to Us // status", title: "My trade-ins", ghost: "TRADE" })}<div class="card" style="text-align:center;padding:44px;max-width:640px;margin:22px auto"><div class="circ lg" style="margin:0 auto">${ico("swap", 28)}</div><h3 style="margin-top:16px">Nothing here yet</h3><p class="muted">Sell us the PC parts you don't use any more. We'll make you an offer.</p><a class="btn p" href="sell.html">Sell an item</a></div>`;
      return;
    }
    $("#app").innerHTML = `${PH.ui.hudHead({ eyebrow: "Sell to Us // status", title: "My trade-ins", ghost: "TRADE", sub: "Follow each item from submit to stock.", right: `<a class="btn p sm" href="sell.html">${ico("plus", 18, "currentColor")}Sell another item</a>` })}
      ${list.map((t) => {
        const ended = ["Declined", "Rejected"].includes(t.status);
        const cur = ended ? FLOW.indexOf(t.status === "Declined" ? "Offer sent" : "Under review") : Math.max(FLOW.indexOf(t.status), 0);
        const isNew = t.id === fresh;
        return `<article class="card hud-frame" style="margin-top:22px;padding:26px;${isNew ? "outline:3px solid var(--action);outline-offset:4px" : ""}">
          <div class="row between center wrapflex"><div><b class="bracket" style="font-size:22px">${esc(t.id)} · ${esc(t.model)}</b><div class="small muted">${esc(t.type)} · ${esc(t.condition)} · submitted ${date(t.createdAt)} · asking ${money(t.askingPrice)}${t.photos ? ` · ${t.photos} photo${t.photos > 1 ? "s" : ""}` : ""}</div>
            ${t.photoSrc.length ? `<div class="tthumbs">${t.photoSrc.map((u, i) => `<button type="button" class="tthumb" data-tphoto="${esc(t.id)}" data-i="${i}" aria-label="Open photo ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</div>${statusBadge(t.status, "trade")}</div>
          ${ended ? `<div class="note ${ended ? "bad" : ""}" style="margin-top:18px">${t.status === "Declined" ? `You declined our ${money(t.offer)} offer. You can submit the item again any time.` : `Declined by staff: ${esc(t.note || "we couldn't make an offer for this item this time.")}`}</div>`
            : `<div class="steps-wrap">${steps(FLOW, t.status === "In stock" ? FLOW.length : cur).replace(/width:96px/g, "width:110px")}</div>`}
          ${t.status === "Offer sent" ? `<div class="inset row" style="padding:22px;margin-top:22px;gap:20px;align-items:center"><div class="grow"><div class="small muted">Our offer, after review</div><div style="font:700 44px var(--font-head)">${money(t.offer)}</div><div class="small muted">${t.suggestedOffer ? `Suggested by condition: ${money(t.suggestedOffer)} · ` : ""}paid in cash when you bring it in (sample)</div></div>
            <button class="btn dg" data-decline="${t.id}">${ico("x", 18)}Decline offer</button><button class="btn p" data-accept="${t.id}">${ico("check", 18, "currentColor")}Accept ${money(t.offer)} offer</button></div>` : ""}
          ${t.status === "Accepted" ? `<div class="note" style="margin-top:18px">${ico("pin", 16)} Bring the item to the Power House counter (sample). Staff will inspect it and pay ${money(t.offer)}.</div>` : ""}
          ${t.status === "In stock" ? `<div class="note" style="margin-top:18px">${ico("check", 16)} Done: paid ${money(t.offer)}. Your item is now in our shop as a used item.</div>` : ""}
          <div class="small muted" style="margin-top:12px">Last update: ${esc(t.history[t.history.length - 1].status)} · ${when(t.history[t.history.length - 1].at)}</div>
        </article>`;
      }).join("")}`;
  }
  $("#app").addEventListener("click", async (e) => {
    const ph = e.target.closest("[data-tphoto]");
    if (ph) { const t = (await PH.api.myTradeIns()).find((x) => x.id === ph.dataset.tphoto); if (t) PH.ui.photoViewer(t.photoSrc, Number(ph.dataset.i) || 0, `${t.id} · ${t.brand} ${t.model}`); return; }
    const a = e.target.closest("[data-accept],[data-decline]"); if (!a) return;
    const accept = !!a.dataset.accept, id = a.dataset.accept || a.dataset.decline;
    const t = (await PH.api.myTradeIns()).find((x) => x.id === id);
    const ok = await dialog(accept
      ? { title: `Accept ${money(t.offer)}?`, body: `You agree to sell ${t.brand} ${t.model} to Power House for ${money(t.offer)}. Then bring it in for inspection.`, confirm: `Accept ${money(t.offer)} offer`, cancel: "Not yet", icon: "check" }
      : { title: "Decline this offer?", body: "We'll close this trade-in. You can submit the item again later.", confirm: "Decline offer", cancel: "Keep the offer", danger: true, icon: "alert" });
    if (!ok) return;
    try { await PH.api.answerOffer(id, accept); toast(accept ? "Offer accepted. See you at the counter!" : "Offer declined."); draw(); }
    catch (err) { toast(errorText(err), true); }
  });
  await draw();
  PH.ui.storeFooter();
})();
