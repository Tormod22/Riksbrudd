/* PLANTEGNINGEN I 2D – visningen (fase B1, 28. nov). Reglene: spill/plantegning.js. Modellen: spill/bygning.js.
 * - Zoomer du helt inn (kam.m ≤ Plantegning.REGLER.zoom), eller trykker «Se inn» i huspanelet, tegnes 1. etasje (eller etasjen du
 *   velger) for høyst noen få hus nær midten av skjermen, oppå kartet (KROKER.tegn). Modellene lages i biter (Bygning.fraKartG med
 *   pauser) og huskes (samme hus = samme modell).
 * - Etasjevelgeren #plan2d øverst: Kjeller, 1, 2 … Loft (bare tegning; gange og leting er fortsatt bare i 1. etasje).
 * - Trykk på et vindu eller en dør: «Barrikader» – planker fra leirens lager. Endringen går gjennom kommandolaget (kommandoen
 *   «husEndre», window.KOMMANDO) og lagres i endringsloggen per leir: localStorage «riksbrudd-bygninger» = { v, leir, hus: { nr: [endring] } }.
 *   Modellen er alltid Bygning.medEndringer(kartmodellen, loggen) – B3 trenger bare å legge til flere handlinger.
 * API: window.Plantegning2D (hus, modell, prøvehus, seInn, endre, logg, lagre, lesInn, aktiv, S).
 */
(function () {
  'use strict';
  const PT = window.Plantegning; if (!PT || typeof document === 'undefined') return;
  const R = PT.REGLER, NØKKEL = 'riksbrudd-bygninger';
  const BG = () => window.Bygning || null;
  // hjelperne fra kartflis.js (samme tak som husomriss og hus3d)
  const hjelp = () => (typeof form === 'function' && typeof rund === 'function' && typeof harFall === 'function' && typeof takDeler === 'function'
    ? { form, rund, harFall, takDeler, Byhus: window.Byhus || null } : null);
  const HUS = new Map();
  const S = { fokus: null, etasje: 1, valgt: null, nær: [], sist: null, skanner: false, prøve: new Map(), nr: 0 };
  let LOGG = PT.nyLogg(''), leir = '';
  const tegnPå = () => { if (typeof skitten !== 'undefined') skitten = true; };

  // ---------- endringsloggen per leir ----------
  const leirId = () => { const s = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  function lesInn() {
    leir = leirId(); let t = null; try { t = localStorage.getItem(NØKKEL); } catch (e) { /* sperret */ }
    LOGG = PT.lesLogg(t, leir); for (const h of HUS.values()) oppdater(h); tegnPå(); return LOGG;
  }
  function lagre() { LOGG.leir = leirId(); try { localStorage.setItem(NØKKEL, JSON.stringify(LOGG)); } catch (e) { /* sperret */ } }
  window.addEventListener('riksbrudd-spill', () => setTimeout(lesInn, 0));
  lesInn();

  // ---------- husene og modellene ----------
  // h = { i, e, Pv (omrisset i verdensmeter), o (nullpunkt), P (lokalt), info, tak, m0 (fra kartet), m (med endringene), klar, feil, brukt }
  function nyttHus(Pv, e, tett) {
    const i = e.i; let h = HUS.get(i); if (h) { h.brukt = ++S.nr; return h; }
    let moh; try { const v = typeof hoydeVed === 'function' ? hoydeVed(Pv[0][0], Pv[0][1]) : null; if (Number.isFinite(v)) moh = v; } catch (er) { moh = undefined; }
    const H = hjelp(); let inf;
    if (H) inf = PT.info(Pv, e, tett, moh, H);
    else { const o = PT.ramme(Pv); inf = { o, P: PT.lokal(Pv, o), info: { i, t: e.t, h: e.h || 6, tett: tett || 0, k: e.k, moh }, tak: { rund: false } }; }
    let A = 0; for (let k = 0; k < Pv.length; k++) { const a = Pv[k], b = Pv[(k + 1) % Pv.length]; A += a[0] * b[1] - b[0] * a[1]; }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of Pv) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    h = { i, e, Pv, o: inf.o, P: inf.P, info: inf.info, tak: inf.tak, m0: null, m: null, klar: false, feil: null, brukt: ++S.nr, A: Math.abs(A) / 2, bb: [x0, y0, x1, y1], tett: tett || 0 };
    HUS.set(i, h); rydd(); return h;
  }
  // høyst R.huskes modeller (de eldste som ikke vises, går ut)
  function rydd() {
    if (HUS.size <= R.huskes) return; const vises = new Set(S.nær.map(h => h.i)); if (S.fokus) vises.add(S.fokus.i);
    const liste = [...HUS.values()].filter(h => !vises.has(h.i)).sort((a, b) => a.brukt - b.brukt);
    while (HUS.size > R.huskes && liste.length) HUS.delete(liste.shift().i);
  }
  function oppdater(h) { if (!h.m0 || !BG()) return; const L = PT.endringer(LOGG, h.i); h.m = L.length ? BG().medEndringer(h.m0, L) : h.m0; }
  const kø = []; let bygger = false;
  const pause = () => new Promise(r => setTimeout(r, 0));
  async function byggKø() {
    if (bygger) return; bygger = true;
    try { while (kø.length) { const h = kø.shift(); if (h.klar || h.feil) continue; await bygg(h); tegnPå(); visVelger(); } } finally { bygger = false; }
  }
  // modellen i biter: Bygning.fraKartG gir fra seg tråden mellom etasjene og trappene; pause når det har gått over 10 ms
  async function bygg(h) {
    const B = BG(); if (!B) { h.feil = 'Byggemodellen mangler.'; return; }
    try { const it = B.fraKartG(h.P, h.info); let r, t0 = performance.now();
      while (!(r = it.next()).done) if (performance.now() - t0 > 10) { await pause(); t0 = performance.now(); }
      h.m0 = r.value; h.klar = true; oppdater(h);
    } catch (e) { h.feil = String(e && e.message || e); console.warn('plantegning:', e); }
  }
  function sørg(h) { if (!h.klar && !h.feil && !kø.includes(h)) { kø.push(h); byggKø(); } return h; }
  // ferdig modell med en gang (vakta og andre moduler): bygges i ett strekk når den mangler
  function modell(h) { if (!h) return null; if (!h.klar && !h.feil && BG()) { try { h.m0 = BG().fraKart(h.P, h.info); h.klar = true; oppdater(h); } catch (e) { h.feil = String(e); } } return h.m; }

  // ---------- hvilke hus som vises ----------
  // aktiv: zoomet helt inn, eller «Se inn» på et hus (da også litt lenger ute)
  const aktiv = () => !(typeof VIS !== 'undefined' && VIS.bygg === false) && typeof kam !== 'undefined' && (kam.m <= R.zoom || (!!S.fokus && kam.m <= 4));
  async function skann(cx, cy, rx, ry) {
    const kand = [], sentre = [];
    if (typeof hentFlis === 'function' && typeof LAGFILER !== 'undefined' && LAGFILER && LAGFILER.hus && typeof span === 'function') {
      const z = 13, sp = span(z), mg = 110;
      const x0 = Math.floor((cx - rx - mg - G.x0) / sp), x1 = Math.floor((cx + rx + mg - G.x0) / sp), y0 = Math.floor((G.y0 - (cy + ry + mg)) / sp), y1 = Math.floor((G.y0 - (cy - ry - mg)) / sp);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) <= 12) {
        const fl = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(hentFlis('hus', z, x, y).then(t => [x, y, t]).catch(() => [x, y, null]));
        const sett = new Set();
        for (const [x, y, t] of await Promise.all(fl)) { if (!t || !t.hus) continue; const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096;
          for (const o of t.hus.obj) { const d = o.deler[0]; if (!d || sett.has(o.e.i)) continue; sett.add(o.e.i); const c0 = PT.senter(d), c = [minx + c0[0] * k, maxy - c0[1] * k]; sentre.push(c);
            if (d.length < 4 || (window.HUS_BORT && HUS_BORT.has(o.e.i))) continue;
            if (Math.abs(c[0] - cx) > rx + 30 || Math.abs(c[1] - cy) > ry + 30) continue;
            kand.push({ e: o.e, c, ring: d, minx, maxy, k }); } }
      }
    }
    for (const p of S.prøve.values()) { const c = PT.ramme(p.Pv); sentre.push(c); if (Math.abs(c[0] - cx) <= rx + 30 && Math.abs(c[1] - cy) <= ry + 30) kand.push({ e: p.e, c, Pv: p.Pv }); }
    kand.sort((a, b) => Math.hypot(a.c[0] - cx, a.c[1] - cy) - Math.hypot(b.c[0] - cx, b.c[1] - cy));
    const ut = [];
    if (S.fokus) ut.push(nyttHus(S.fokus.Pv, S.fokus.e, S.fokus.tett || 0));
    for (const q of kand) {
      if (ut.length >= R.maksHus) break; if (ut.some(h => h.i === q.e.i)) continue;
      const Pv = q.Pv || PT.åpent(q.ring.map(([a, b]) => [q.minx + a * q.k, q.maxy - b * q.k]));
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of Pv) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (Math.max(x1 - x0, y1 - y0) / kam.m < R.minPunkter && !(S.fokus && S.fokus.i === q.e.i)) continue;
      const h = nyttHus(Pv, q.e, PT.tetthet(q.c, sentre));
      if (h.tak && h.tak.rund) continue;
      ut.push(h);
    }
    for (const h of ut) sørg(h);
    return ut;
  }
  function vurderSkann() {
    const cx = kam.x, cy = kam.y, rx = VW * kam.m / 2, ry = VH * kam.m / 2, s = S.sist, nå = performance.now();
    if (S.skanner) return;
    if (s && Math.hypot(cx - s.x, cy - s.y) < Math.max(rx, ry) * .2 && Math.abs(kam.m - s.m) < s.m * .25 && nå - s.t < 5000) return;
    S.sist = { x: cx, y: cy, m: kam.m, t: nå }; S.skanner = true;
    skann(cx, cy, rx, ry).then(l => { S.nær = l; tegnPå(); visVelger(); }).catch(e => console.warn('plantegning:', e)).finally(() => { S.skanner = false; });
  }
  const etasjeFor = h => (h.m && h.m.etasjer.some(e => e.n === S.etasje) ? S.etasje : 1);
  const hoved = () => { const l = S.nær.filter(h => h.klar && h.m); if (S.fokus) { const f = l.find(h => h.i === S.fokus.i); if (f) return f; }
    return l.sort((a, b) => Math.hypot((a.bb[0] + a.bb[2]) / 2 - kam.x, (a.bb[1] + a.bb[3]) / 2 - kam.y) - Math.hypot((b.bb[0] + b.bb[2]) / 2 - kam.x, (b.bb[1] + b.bb[3]) / 2 - kam.y))[0] || null; };

  // ---------- tegningen ----------
  // fargene fra 2D-kartet (--ink, --ink-dim, panelet, gullet i knappene)
  const F = { gulv: 'rgba(20,17,11,.94)', kant: 'rgba(231,220,195,.25)', bærende: '#e7dcc3', skille: '#b3a789', revet: 'rgba(166,155,130,.85)', dør: '#c9b26a', vindu: '#9db4ba',
    planke: '#a8773d', plankeKant: '#4a3216', møbel: 'rgba(231,220,195,.09)', møbelKant: 'rgba(231,220,195,.38)', trapp: 'rgba(231,220,195,.55)', navn: '#c4b694', valgt: '#f0d79a',
    våt: 'rgba(120,150,165,.13)', kjøkken: 'rgba(200,168,110,.09)', rom: 'rgba(231,220,195,.035)', ødelagt: '#b5543c' };
  function tegn(g, vx0, vy1) {
    if (!aktiv()) { if (S.nær.length || velger.classList.contains('på')) { S.nær = []; S.valgt = null; visVelger(); } return; }
    vurderSkann();
    const m = kam.m, sx = x => (x - vx0) / m, sy = y => (vy1 - y) / m;
    for (const h of S.nær) {
      if (!h.klar || !h.m) continue; const md = h.m, [ox, oy] = h.o, X = p => sx(ox + p[0]), Y = p => sy(oy + p[1]);
      const str = Math.max(h.bb[2] - h.bb[0], h.bb[3] - h.bb[1]) / m; if (str < R.minPunkter * .8) continue;
      const detalj = str >= R.detaljPunkter, n = etasjeFor(h), Fg = PT.figur(md, n);
      const sti = P => { g.beginPath(); P.forEach((p, k) => (k ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p)))); g.closePath(); };
      g.save(); g.lineCap = 'butt'; g.lineJoin = 'miter';
      sti(md.P); g.fillStyle = F.gulv; g.fill(); g.strokeStyle = F.kant; g.lineWidth = 1; g.stroke();
      for (const r of Fg.rom) { sti(r.P); g.fillStyle = /bad|vask|dusj|toalett/.test(r.rolle || '') ? F.våt : /kjøkken/.test(r.rolle || '') ? F.kjøkken : F.rom; g.fill(); }
      if (detalj) for (const q of Fg.møbler) { sti(q.P); g.fillStyle = F.møbel; g.fill(); g.strokeStyle = q.ødelagt ? F.ødelagt : F.møbelKant; g.lineWidth = 1; g.stroke(); }
      for (const t of Fg.trapper) {
        sti(t.P); g.fillStyle = 'rgba(231,220,195,.07)'; g.fill(); g.strokeStyle = F.trapp; g.lineWidth = 1; g.stroke();
        const vx = -t.uy, vy = t.ux, hl = t.l / 2, hb = t.b / 2; g.beginPath();
        for (let k = 1; k < t.trinn; k++) { const u = -hl + t.l * k / t.trinn; g.moveTo(X([t.x + t.ux * u - vx * hb, t.y + t.uy * u - vy * hb]), Y([t.x + t.ux * u - vx * hb, t.y + t.uy * u - vy * hb])); g.lineTo(X([t.x + t.ux * u + vx * hb, t.y + t.uy * u + vy * hb]), Y([t.x + t.ux * u + vx * hb, t.y + t.uy * u + vy * hb])); }
        g.stroke();
        // pila peker opp trappa
        const a = [t.x - t.ux * hl * .8, t.y - t.uy * hl * .8], b = [t.x + t.ux * hl * .8, t.y + t.uy * hl * .8]; g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b));
        const pa = [b[0] - t.ux * .35 - vx * .2, b[1] - t.uy * .35 - vy * .2], pb = [b[0] - t.ux * .35 + vx * .2, b[1] - t.uy * .35 + vy * .2]; g.moveTo(X(pa), Y(pa)); g.lineTo(X(b), Y(b)); g.lineTo(X(pb), Y(pb));
        g.strokeStyle = F.valgt; g.lineWidth = 1.2; g.stroke();
        if (detalj) { g.fillStyle = F.navn; g.font = '11px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.opp ? 'opp' : 'ned', X([t.x, t.y]), Y([t.x, t.y]) - 9); }
      }
      for (const q of Fg.søyler) { const s = Math.max(3, .3 / m); g.fillStyle = F.bærende; g.fillRect(X([q.x, q.y]) - s / 2, Y([q.x, q.y]) - s / 2, s, s); }
      if (Fg.bjelker.length) { g.setLineDash([6, 4]); g.strokeStyle = F.dør; g.lineWidth = 1; g.beginPath(); for (const q of Fg.bjelker) { g.moveTo(X(q.a), Y(q.a)); g.lineTo(X(q.b), Y(q.b)); } g.stroke(); g.setLineDash([]); }
      // veggene: bærende tykkere og lysere; revne stiplet
      for (const w of Fg.vegger) {
        if (w.revet) { g.setLineDash([5, 5]); g.strokeStyle = F.revet; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(w.a), Y(w.a)); g.lineTo(X(w.b), Y(w.b)); g.stroke(); g.setLineDash([]); continue; }
        g.strokeStyle = w.bærende ? F.bærende : F.skille; g.lineWidth = Math.max(w.bærende ? 2.6 : 1.3, w.tykk / m); g.beginPath();
        for (const [a, b] of w.biter) { g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); } g.stroke();
      }
      for (const o of Fg.åpninger) tegnÅpning(g, o, X, Y, m, S.valgt && S.valgt.i === h.i && S.valgt.e === n && S.valgt.id === o.id);
      if (detalj) { g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const r of Fg.rom) { const bx = Math.sqrt(Math.max(1, r.areal)) / m; if (bx < 46) continue; const fs = Math.max(11, Math.min(15, bx / 6));
          g.font = `${fs}px "Cormorant Garamond", Georgia, serif`; g.fillStyle = F.navn; g.fillText(r.navn, X([r.x, r.y]), Y([r.x, r.y]));
          if (bx > 80) { g.font = `${Math.max(10, fs - 3)}px "Cormorant Garamond", Georgia, serif`; g.fillStyle = 'rgba(196,182,148,.7)'; g.fillText(String(Math.round(r.areal)).replace('.', ',') + ' m²', X([r.x, r.y]), Y([r.x, r.y]) + fs); } } }
      g.restore();
    }
  }
  function tegnÅpning(g, o, X, Y, m, valgt) {
    const hb = o.b / 2, c = [o.x, o.y], u = [o.ux, o.uy], n = [o.nx, o.ny], t2 = o.tykk / 2, p = (a, b) => [c[0] + u[0] * a + n[0] * b, c[1] + u[1] * a + n[1] * b];
    const linje = (a, b) => { g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); };
    if (o.tilstand === 'ødelagt') { g.setLineDash([2, 3]); g.strokeStyle = F.ødelagt; g.lineWidth = 1.5; g.beginPath(); linje(p(-hb, 0), p(hb, 0)); g.stroke(); g.setLineDash([]); }
    else if (o.type === 'vindu') { g.strokeStyle = F.vindu; g.lineWidth = 1; g.beginPath(); linje(p(-hb, -t2), p(hb, -t2)); linje(p(-hb, t2), p(hb, t2)); linje(p(-hb, 0), p(hb, 0)); linje(p(-hb, -t2), p(-hb, t2)); linje(p(hb, -t2), p(hb, t2)); g.stroke(); }
    else if (o.type === 'port') { g.strokeStyle = F.dør; g.lineWidth = 1.2; g.setLineDash([4, 3]); g.beginPath(); linje(p(-hb, 0), p(hb, 0)); g.stroke(); g.setLineDash([]); }
    else {
      // dørbladet står åpent innover, og buen viser hvor det slår
      const hn = p(-hb, 0), blad = p(-hb, o.b), lukket = p(hb, 0), Hx = X(hn), Hy = Y(hn), r = o.b / m;
      const a1 = Math.atan2(Y(blad) - Hy, X(blad) - Hx), a2 = Math.atan2(Y(lukket) - Hy, X(lukket) - Hx); let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      g.strokeStyle = F.dør; g.lineWidth = o.inngang ? 1.6 : 1.1; g.beginPath(); linje(hn, blad); g.stroke();
      g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.arc(Hx, Hy, r, a1, a2, d < 0); g.stroke(); g.setLineDash([]);
    }
    if (o.sperre) {
      // planker (eller tettet) over åpningen
      g.strokeStyle = o.sperre === 'planker' ? F.planke : F.revet; g.lineWidth = Math.max(2.5, .1 / m); g.lineCap = 'round'; g.beginPath();
      const kant = t2 + .1; for (const k of [-1, 0, 1]) { const a = k * o.b / 3.2; linje(p(a - o.b / 6, kant), p(a + o.b / 6, -kant)); } g.stroke();
      g.strokeStyle = F.plankeKant; g.lineWidth = 1; g.beginPath(); linje(p(-hb, kant), p(hb, kant)); linje(p(-hb, -kant), p(hb, -kant)); g.stroke(); g.lineCap = 'butt';
    }
    if (valgt) { g.strokeStyle = F.valgt; g.lineWidth = 2; g.beginPath(); g.arc(X(c), Y(c), Math.max(9, (hb + .3) / m), 0, 2 * Math.PI); g.stroke(); }
  }
  if (typeof KROKER !== 'undefined' && KROKER.tegn) KROKER.tegn.push(tegn);

  // ---------- etasjevelgeren og valgt åpning ----------
  const css = document.createElement('style');
  css.textContent = `#plan2d{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 8px); z-index:7; display:none; box-sizing:border-box; max-width:min(600px,calc(100vw - 32px));
  background:var(--panel,rgba(22,18,12,.94)); border:1px solid var(--rule,#5b5140); color:var(--ink,#e7dcc3); padding:6px 10px; font-size:14px; line-height:1.35; }
#plan2d.på{ display:block; } #plan2d .rad{ display:flex; flex-wrap:wrap; align-items:center; gap:4px; } #plan2d b{ font-weight:600; margin-right:6px; }
#plan2d button{ min-height:32px; min-width:34px; padding:2px 10px; background:#2a2318; border:1px solid var(--rule,#5b5140); color:var(--ink,#e7dcc3); font:inherit; font-size:14px; cursor:pointer; }
#plan2d button.valgt{ border-color:#c9b26a; color:#f0d79a; } #plan2d button.grå{ opacity:.55; } #plan2d small{ color:var(--ink-dim,#a69b82); }
#plan2d .valg{ margin-top:5px; padding-top:5px; border-top:1px solid var(--rule,#5b5140); }
@media (max-width:700px){ #plan2d{ left:16px; right:16px; transform:none; max-width:none; font-size:13px; } #plan2d button{ font-size:13px; padding:2px 8px; } }`;
  document.head.appendChild(css);
  const velger = document.createElement('div'); velger.id = 'plan2d'; velger.setAttribute('role', 'group'); velger.setAttribute('aria-label', 'Plantegning');
  (document.body || document.documentElement).appendChild(velger);
  const NAVN = { hus: 'Bolig', hytte: 'Hytte', leil: 'Leilighetsbygg', uthus: 'Uthus', låve: 'Låve', kirke: 'Kirke', butikk: 'Butikk', industri: 'Industribygg', lager: 'Lager',
    kontor: 'Kontorbygg', skole: 'Skole', sykehus: 'Sykehus', sykehjem: 'Sykehjem', legevakt: 'Legevakt', hangar: 'Hangar', terminal: 'Terminal' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tall = v => String(v).replace('.', ',');
  let sistHtml = '';
  function visVelger() {
    const h = aktiv() ? hoved() : null;
    if (!h) { if (velger.classList.contains('på')) { velger.classList.remove('på'); sistHtml = ''; } return; }
    const n = etasjeFor(h), et = PT.etasje(h.m, n), valg = PT.etasjeValg(h.m);
    let html = `<div class="rad"><b>${esc(NAVN[h.info.kl] || 'Bygg')}</b>` + valg.map(v => `<button type="button" data-n="${v.n}" class="${v.n === n ? 'valgt' : ''}${v.stengt ? ' grå' : ''}" title="${esc(v.navn)}${v.stengt ? ' (stengt)' : ''}">${esc(v.kort)}</button>`).join('')
      + (S.fokus ? '<button type="button" data-h="lukk" title="Tilbake til kartet">Lukk</button>' : '') + '</div>';
    const o = S.valgt && S.valgt.i === h.i ? PT.figur(h.m, S.valgt.e).åpninger.find(q => q.id === S.valgt.id) : null;
    if (o) {
      const tre = PT.planker(o), navn = PT.åpNavn(o) + (et ? ' i ' + et.navn.toLowerCase() : '');
      html += `<div class="rad valg"><span>${esc(navn)} · ${tall(o.b.toFixed(1))} m${o.sperre === 'planker' ? ' · barrikadert' : o.sperre ? ' · tettet' : ''}</span>`
        + (o.sperre ? '<button type="button" data-h="åpne" id="plan2dåpne">Fjern plankene</button>' : `<button type="button" data-h="barrikader" id="plan2dbarr">Barrikader (${tall(tre)} m³ tre)</button>`)
        + '<button type="button" data-h="avbryt">Avbryt</button></div>';
    } else html += `<div class="rad"><small>${esc(et ? et.navn : '')}${et && et.stengt ? ' (stengt)' : ''} · trykk på et vindu eller en dør for å barrikadere</small></div>`;
    velger.classList.add('på');
    if (html === sistHtml || (typeof pekerNede === 'function' && pekerNede(velger))) return;
    sistHtml = html; velger.innerHTML = html;
  }
  velger.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return; ev.preventDefault(); ev.stopPropagation();
    if (b.dataset.n !== undefined) { S.etasje = +b.dataset.n; S.valgt = null; }
    else if (b.dataset.h === 'lukk') { S.fokus = null; S.valgt = null; S.sist = null; }
    else if (b.dataset.h === 'avbryt') S.valgt = null;
    else if (b.dataset.h === 'barrikader' || b.dataset.h === 'åpne') { const v = S.valgt; if (v) handling({ hus: v.i, e: v.e, del: 'åpning', id: v.id, gjør: b.dataset.h }); }
    sistHtml = ''; visVelger(); tegnPå();
  });

  // ---------- trykk i plantegningen ----------
  if (typeof KROKER !== 'undefined' && KROKER.trykk) KROKER.trykk.push((X, Y) => {
    if (!aktiv() || !BG()) return false;
    for (const h of S.nær) {
      if (!h.klar || !h.m) continue; const x = X - h.o[0], y = Y - h.o[1];
      if (X < h.bb[0] - 2 || X > h.bb[2] + 2 || Y < h.bb[1] - 2 || Y > h.bb[3] + 2) continue;
      const n = etasjeFor(h), q = PT.finnÅpning(PT.figur(h.m, n), x, y, Math.max(R.treff.meter, R.treff.punkter * kam.m));
      if (q) { S.valgt = { i: h.i, e: n, id: q.id }; sistHtml = ''; visVelger(); tegnPå(); return true; }
    }
    if (S.valgt) { S.valgt = null; sistHtml = ''; visVelger(); tegnPå(); }
    return false;
  });

  // ---------- handlingen: kommandoen «husEndre» ----------
  const leiren = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  function åpningAv(h, d) { return h && h.m ? PT.figur(h.m, d.e).åpninger.find(q => q.id === d.id) || null : null; }
  function sjekk(k) {
    if (!k || !Number.isFinite(k.hus) || !Number.isFinite(k.e) || !Number.isInteger(k.id)) return 'Ugyldig endring.';
    if (k.del !== 'åpning' || (k.gjør !== 'barrikader' && k.gjør !== 'åpne')) return 'Det kan ikke gjøres ennå.';
    const h = HUS.get(k.hus); if (!h || !h.klar || !h.m) return 'Huset er ikke lastet.';
    const o = åpningAv(h, k); if (!o || o.tilstand === 'revet') return 'Åpningen finnes ikke.';
    if (k.gjør === 'barrikader') { if (o.sperre) return 'Den er alt sperret.'; const L = leiren(); if (!L || !L.lager) return 'Ingen leir ennå.';
      const tre = PT.planker(o); if ((L.lager.tre || 0) < tre) return `Ikke nok tre i lageret (trenger ${tall(tre)} m³ planker).`; }
    else if (o.sperre !== 'planker') return 'Det er ingen planker der.';
    const s = BG().vurder(h.m, { e: k.e, del: k.del, id: k.id, gjør: k.gjør }); return s.ok ? null : s.feil;
  }
  function utfør(k) {
    const h = HUS.get(k.hus), o = åpningAv(h, k), L = leiren(), d = { e: k.e, del: k.del, id: k.id, gjør: k.gjør }, svar = BG().vurder(h.m, d);
    let tre = 0;
    if (k.gjør === 'barrikader') { tre = PT.planker(o); L.lager.tre = Math.round((L.lager.tre - tre) * 100) / 100; }
    else { tre = PT.planker(o) * .5; if (L && L.lager) { if (window.Leir && Leir.leggInn) Leir.leggInn(L, 'tre', tre); else L.lager.tre = Math.round(((L.lager.tre || 0) + tre) * 100) / 100; } }
    PT.leggTil(LOGG, h.i, d); oppdater(h); lagre(); tegnPå();
    const navn = PT.åpNavn(o).toLowerCase();
    return { ok: true, tekst: k.gjør === 'barrikader' ? `Planker over ${navn === 'vindu' ? 'vinduet' : 'døra'} (${tall(tre)} m³ tre fra lageret).` : `Plankene er tatt ned (${tall(Math.round(tre * 100) / 100)} m³ tre tilbake).`, tre, svar };
  }
  function registrer() {
    const K = window.Kommando; if (!K) return false; if (K.finnes('husEndre')) return true;
    K.registrer('husEndre', { leir: true, meld: true, sjekk: k => sjekk(k), utfør: k => utfør(k), beskriv: k => (k.gjør === 'barrikader' ? 'barrikaderer en åpning i et hus' : 'tar ned planker i et hus') });
    return true;
  }
  // gjør endringen nå (gjennom kommandolaget). k = { hus, e, del, id, gjør }
  function endre(k) {
    registrer(); const ut = Object.assign({ type: 'husEndre' }, k);
    const r = window.KOMMANDO ? KOMMANDO(ut) : window.Kommando ? Kommando.utfør(ut, {}) : { ok: false, feil: 'Kommandolaget mangler.' };
    if (r.ok && r.svar && r.svar.tekst && typeof logg === 'function') logg(r.svar.tekst);
    else if (!r.ok && !window.KOMMANDO && typeof logg === 'function') logg(r.feil);
    if (r.ok) S.valgt = null; sistHtml = ''; visVelger(); return r;
  }
  // knappen: karakteren går til huset (som «Sikre huset»), så gjøres det; uten karakter gjøres det straks
  function handling(k) {
    const f = sjekk(k); if (f) { if (typeof logg === 'function') logg(f); return false; }
    const h = HUS.get(k.hus), S2 = window.Spill2D, kar = S2 && S2.karakter ? S2.karakter() : null;
    if (kar && S2.gåTil) { const c = PT.ramme(h.Pv); return S2.gåTil({ P: h.Pv, X: c[0], Y: c[1], i: h.i, A: h.A, kl: h.info.kl }, () => endre(k), k.gjør === 'barrikader' ? 'Du går til huset med plankene …' : 'Du går til huset …'); }
    return endre(k).ok;
  }

  // ---------- «Se inn» i huspanelet ----------
  function seInn(b) {
    const Pv = b.Pv, e = b.e; S.fokus = { i: e.i, Pv, e, tett: b.tett || 0 }; S.etasje = 1; S.valgt = null; S.sist = null;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of Pv) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (typeof kam !== 'undefined') { kam.x = (x0 + x1) / 2; kam.y = (y0 + y1) / 2; const pl = Math.max(120, Math.min(VW, VH - 180)) * R.seInn; kam.m = Math.max(R.minZoom, Math.min(R.zoom, Math.max(x1 - x0, y1 - y0) / pl)); }
    if (typeof på3d !== 'undefined' && på3d && typeof window.slå3d === 'function') window.slå3d(false);
    if (window.lukkPanel) try { lukkPanel(); } catch (er) { /* uten panel */ }
    tegnPå(); return true;
  }
  async function seInnKnapp(X, Y) {
    const H = document.getElementById('handl'); if (!H || typeof finnBygg !== 'function') return; const b = await finnBygg(X, Y); if (!b || !b.o || !b.o.e || b.o.e.i == null) return;
    const Pv = PT.åpent(b.P); const gl = document.getElementById('plan2dhus'); if (gl) gl.remove();
    const Hh = hjelp(); if (Hh) { const f = Hh.form(Pv); if (Hh.rund(Pv, f)) return; }
    const rad = document.createElement('div'); rad.id = 'plan2dhus'; rad.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;flex:1 0 100%;margin:4px 0 0';
    const kn = document.createElement('button'); kn.type = 'button'; kn.id = 'seinnknapp'; kn.textContent = 'Se inn (plantegning)'; kn.title = 'Vegger, dører, vinduer og møbler – etasje for etasje';
    kn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); seInn({ Pv, e: b.o.e }); };
    rad.append(kn); H.append(rad);
  }
  const vb0 = typeof window.visByggVed === 'function' ? window.visByggVed : null;
  if (vb0) window.visByggVed = async function (X, Y) { const ok = await vb0.apply(this, arguments); if (ok) { try { await seInnKnapp(X, Y); } catch (e) { console.warn('se inn:', e); } } return ok; };

  // ---------- prøvehus (vakta; testsiden har ingen husdata) ----------
  function prøvehus(Pv, e) { const P = PT.arealS(Pv) < 0 ? Pv.slice().reverse() : Pv.slice(); S.prøve.set(e.i, { Pv: P, e }); S.sist = null; return e.i; }
  function fjernPrøve(i) { S.prøve.delete(i); HUS.delete(i); if (S.fokus && S.fokus.i === i) S.fokus = null; S.nær = S.nær.filter(h => h.i !== i); S.sist = null; tegnPå(); }

  // nærmere zoom når en plantegning vises (zoom() i index.html leser window.MIN_ZOOM_M)
  try { Object.defineProperty(window, 'MIN_ZOOM_M', { configurable: true, get: () => (aktiv() && (S.fokus || S.nær.some(h => h.klar)) ? R.minZoom : .1) }); } catch (e) { /* finnes */ }

  window.Plantegning2D = { S, HUS, hus: i => HUS.get(i) || null, modell: i => modell(HUS.get(i)), prøvehus, fjernPrøve, seInn, endre, handling, sjekk, registrer,
    logg: () => LOGG, lagre, lesInn, aktiv, visVelger, nyttHus, NØKKEL, skannNå: () => { S.sist = null; tegnPå(); } };
})();
