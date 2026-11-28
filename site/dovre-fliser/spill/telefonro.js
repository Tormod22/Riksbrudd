'use strict';
/* Riksbrudd – RO PÅ TELEFONSKJERMEN (28. nov, pakke «ut8-kr-telefon»; kritikken fra Jonas Bakke, telefon 390 × 844):
 *  1. «Vis i kartet» (Selskapet, Leir → Mål, byene …) flyttet kartet bak panelet: målet havnet midt på skjermen, under panelet. Nå: etter
 *     trykket legges målet midt i det frie feltet over (eller under) panelet; er det feltet for lite (telefon), lukkes panelet.
 *  2. «Marsjer» med et oppdrag eller en kontrakt langt unna: kartet viste bare troppen, og merket lå utenfor skjermen. Nå zoomer kartet ut
 *     så både troppen og det nærmeste målet (oppdrag du har tatt, aktive kontrakter) står i bildet når du skal velge hvor de skal gå.
 *  3. Kort med valg (fest, flyktninger …) kom midt under angrepet. Kortkøen (spill/samfunn-visning.js) holder nå kortene tilbake mens
 *     leiren angripes (alarmen står) – de kommer når angrepet er over. Kort som haster, går som før.
 * Reglene (friFelt, passInn) er rene funksjoner (test: pipeline/fliser/test_telefonro.js). I testene (navigator.webdriver) gjør 1–3
 * ingenting før Telefonro.test = true.
 */
(function (rot) {
  // Claudes forslag: minste høyde (px) på det frie feltet før panelet heller lukkes, luft rundt målet (px), og hvor langt unna (m) et mål
  // kan være for at Marsjer zoomer ut til det
  const REGLER = { minFri: 170, luft: 46, maksMål: 15000, maksM: 60 };

  // friFelt(H, topp, r): skjermen er H høy, statuslinja og knappene slutter på topp, panelet dekker r = { top, bottom } (px).
  // Gir det største frie feltet { y0, y1 } (over eller under panelet), eller null når panelet ikke dekker noe av høyden.
  function friFelt(H, topp, r) {
    if (!r || r.bottom <= topp || r.top >= H) return null;
    const over = { y0: topp, y1: Math.max(topp, r.top) }, under = { y0: Math.min(H, r.bottom), y1: H - 60 };
    return over.y1 - over.y0 >= under.y1 - under.y0 ? over : under;
  }
  // passInn(a, b, W, F, m0, R): kameraet { x, y, m } som viser punktene a og b (kartets meter, y oppover) innenfor feltet F = { y0, y1 }
  // av en skjerm W bred med luft rundt; aldri nærmere enn m0 (meter per punkt nå).
  function passInn(a, b, W, F, m0, R = REGLER) {
    const bredde = Math.max(40, W - 2 * R.luft), høyde = Math.max(40, F.y1 - F.y0 - 2 * R.luft);
    const m = Math.min(R.maksM, Math.max(m0, Math.abs(a.x - b.x) / bredde, Math.abs(a.y - b.y) / høyde));
    // midtpunktet skal stå midt i feltet: skjerm-y s = (kam.y - Y) / m + H/2 -> kam.y = Y + (s - H/2) · m (H/2 legges på av den som kaller)
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, m, midtY: (F.y0 + F.y1) / 2 };
  }
  const api = { REGLER, friFelt, passInn, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Telefonro = api;
  if (typeof document === 'undefined') return;
  const på = () => !navigator.webdriver || api.test === true;
  const toppPx = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topp')) || 58) + 40;

  // ---------- 1: «Vis i kartet» ----------
  // panelet knappen står i: det ytterste elementet under body som er fast plassert og dekker en del av skjermen
  function panelFor(n) { let p = n, best = null; while (p && p !== document.body) { const st = getComputedStyle(p); if ((st.position === 'fixed' || st.position === 'absolute') && p.offsetHeight > 120) best = p; p = p.parentElement; } return best; }
  function lukkPanelEl(P) {
    const k = [...P.querySelectorAll('button')].find(b => b.getClientRects().length && (b.getAttribute('aria-label') === 'Lukk' || b.classList.contains('lukk') || /^\s*[×✕]\s*$/.test(b.textContent)));
    if (k) { k.click(); return true; } P.classList.remove('på'); return true;
  }
  document.addEventListener('click', e => {
    if (!på() || typeof kam === 'undefined') return; const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!b || !/^\s*Vis i kartet\s*$/.test(b.textContent)) return; const P = panelFor(b), før = { x: kam.x, y: kam.y, m: kam.m };
    setTimeout(() => { try {
      if (typeof på3d !== 'undefined' && på3d) return; if (kam.x === før.x && kam.y === før.y) return; if (!P || !P.isConnected || !P.getClientRects().length) return;
      const r = P.getBoundingClientRect(), mx = VW / 2, my = VH / 2;
      // målet står ikke under panelet: ingenting å gjøre
      if (!(mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom)) return;
      const F = friFelt(VH, toppPx(), r);
      if (F && F.y1 - F.y0 >= REGLER.minFri && r.left < 40 && r.right > VW - 40) { kam.y += ((F.y0 + F.y1) / 2 - VH / 2) * kam.m; api.sist = { flyttet: true }; }
      else { lukkPanelEl(P); api.sist = { lukket: P.id || P.className }; }
      skitten = true; } catch (x) { /* panelet er borte */ } }, 0);
  }, true);

  // ---------- 2: Marsjer – troppen og målet i samme bilde ----------
  function mål(s) { const ut = [];
    try { const O = window.SpilletSpill && SpilletSpill.O && SpilletSpill.O(); if (O && O.liste) for (const o of O.liste) if (o.tatt && Number.isFinite(o.x)) ut.push({ x: o.x, y: o.y, navn: o.type }); } catch (x) { /* uten oppdrag */ }
    try { const S = window.SelskapSpill && SelskapSpill.tilstand && SelskapSpill.tilstand(); const A = S && S.sider && S.sider.blå ? S.sider.blå.aktive : [];
      for (const k of A || []) { const p = k.type === 'rydd' && k.sperre ? k.sperre : k.sted; if (p && Number.isFinite(p.x)) ut.push({ x: p.x, y: p.y, navn: k.navn || k.type }); } } catch (x) { /* uten selskap */ }
    return ut.map(q => ({ ...q, d: Math.hypot(q.x - s.x, q.y - s.y) })).filter(q => q.d > 30 && q.d <= REGLER.maksMål).sort((a, b) => a.d - b.d)[0] || null; }
  const påSkjerm = (p, F) => { const x = (p.x - kam.x) / kam.m + VW / 2, y = (kam.y - p.y) / kam.m + VH / 2; return x >= 20 && x <= VW - 20 && y >= F.y0 + 10 && y <= F.y1 - 10; };
  let forrige = null;
  api.visMarsj = function (s) { const q = mål(s); if (!q) return null; const F = { y0: toppPx() + 30, y1: VH - (document.body.classList.contains('kort') ? 150 : 90) };
    if (påSkjerm(q, F) && påSkjerm(s, F)) return null;
    const k = passInn(s, q, VW, F, kam.m); kam.x = k.x; kam.m = k.m; kam.y = k.y + (k.midtY - VH / 2) * k.m; skitten = true; api.sist = { marsj: q }; return q; };
  setInterval(() => { try {
    const m = typeof modus !== 'undefined' ? modus : null, v = typeof valgt !== 'undefined' ? valgt : null, n = m === 'marsj' && v ? v : null;
    if (n && n !== forrige && på() && n.side === 'blå' && !(typeof på3d !== 'undefined' && på3d)) api.visMarsj(n);
    forrige = n; } catch (x) { /* neste runde */ } }, 150);

  // ---------- 3: kortene venter til angrepet er over ----------
  const angrepNå = () => { try { return !!(window.ForsvarSpill && ForsvarSpill.angrep && ForsvarSpill.angrep()); } catch (x) { return false; } };
  api.angrepNå = angrepNå;
  function koblKø() { const K = window.Kortkø; if (!K || K.__alarm) return !!K; const ta = K.ta, ledig = K.ledig, nå = K.nå; let straks = false;
    // et kort som ikke haster, får ikke plassen mens leiren angripes (det står i køen og kommer når angrepet er over)
    K.ta = function (id, haster, vis) { if (!haster && !straks && id !== 'loggvelkommen' && K.eier() !== id && på() && angrepNå()) { if (vis) K.be(id, vis); return false; } return ta.apply(this, arguments); };
    K.ledig = function (haster) { if (!haster && på() && angrepNå()) return false; return ledig.apply(this, arguments); };
    // trykk på «Et kort venter» viser kortet med en gang, også under angrepet
    K.nå = function () { straks = true; try { return nå.apply(this, arguments); } finally { straks = false; } };
    K.__alarm = true; return true; }
  if (!koblKø()) { const t = setInterval(() => { if (koblKø()) clearInterval(t); }, 300); setTimeout(() => clearInterval(t), 20000); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
