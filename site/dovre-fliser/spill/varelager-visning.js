'use strict';
/* Riksbrudd – VARER MED PLASS i spillet (28. nov, G4 – docs/plan-selskap-okonomi.md 13.2). Reglene: spill/varelager.js.
 *  - Enhetene (hauger, paller, sekker, fat) lagres per leir i «riksbrudd-varer» og avstemmes mot L.lager hvert sekund og ved hver
 *    endring gjennom leir.js (Varelager.koble). Et gammelt spill uten lagrede enheter får dem fordelt første gang.
 *  - KARTET (KROKER.tegn): zoomet inn på leiren tegnes enhetene som små, rolige former – ute på lagerplassen fullt, inne i lagerbyggene
 *    svakt (sett gjennom taket), reserverte med en gul prikk.
 *  - LEIR-MENYEN, fanen Lager: «Lagerplasser» – hva som ligger hvor, sone per lagerbygg (kommandoen «lagersone»), hva som ligger ute.
 *  - Folkene bærer inn det som ligger ute (Varelager.rydd), regn sliter det som ligger ute, brann tar det som ligger der det brenner,
 *    og røverne (Spillet.Trussel.bytte) kan bare ta det som ligger ute.
 *  - Ting som skjer av seg selv (slitasje i regn) skjer ikke i testene (navigator.webdriver) uten VarelagerSpill.test = true.
 * window.VarelagerSpill.
 */
(function () {
  const VL = window.Varelager, LB = window.Leir; if (!VL || !LB) return;
  const NØKKEL = 'riksbrudd-varer', R = VL.REGLER;
  const ut = { test: false }, auto = () => !navigator.webdriver || ut.test;
  let V = null, Lnå = null, leirId = '', sistLagret = '', sistAvstem = 0, ryddAkk = 0, sistUteSjekk = 0, sistBrann = 0, sistLogg = {}, slitAkk = 0;
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const leir = () => window.LeirSpill && LeirSpill.tilstand();
  const midt = () => { const S = spill(); return S && S.leir ? S.leir : null; };
  const tall = v => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString('nb-NO');
  const navn = k => (k === 'diesel' ? 'diesel' : (LB.MATERIALER[k] ? LB.MATERIALER[k].navn.toLowerCase() : k));
  const enhetTekst = k => (k === 'diesel' ? 'l' : (LB.MATERIALER[k] || {}).enhet || '');
  const mengdeTekst = o => Object.entries(o || {}).filter(([, m]) => m > .05).map(([k, m]) => `${tall(m)} ${enhetTekst(k)} ${navn(k)}`).join(', ');

  // ---------- lasting og lagring (per leir, som spill/karakter.js) ----------
  function last() {
    const L = leir(), m = midt(); if (!L || !m) { V = null; Lnå = null; return; }
    leirId = Math.round(m.x) + ',' + Math.round(m.y); Lnå = L; V = null;
    try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d && d.leir === leirId) V = VL.fraJSON(d.v); } catch (e) { V = null; }
    // gammelt spill (eller ny leir): det som står i L.lager, fordeles på plassene nå (omgjøringen)
    if (!V) V = VL.ny();
    velgUte(true); VL.avstem(LB, L, V, { grunn: 'brukt' }); sistLagret = ''; lagre();
  }
  function lagre() { if (!V || !leirId) return; try { const t = JSON.stringify({ leir: leirId, v: VL.tilJSON(V) }); if (t !== sistLagret) { localStorage.setItem(NØKKEL, t); sistLagret = t; } } catch (e) { /* privat vindu */ } }
  // V for leiren som vises nå; byttes leiren ut (nytt spill, lasting), lastes varelageret på nytt
  function hentV(L) { if (L && L !== Lnå && L === leir()) last(); return L && L === Lnå ? V : null; }
  VL.koble(LB, hentV);

  // ---------- lagerplassen ute: et fritt sted nær leirens midte ----------
  // rektangelet lagerplassen tar (alle radene), med litt luft
  const uteRamme = p => ({ x0: p.x - 2, x1: p.x + R.ute.bredde + 2, y0: p.y - VL.VARER.reduce((s, k) => s + R.ute.blokk[k].h, 0) - 2, y1: p.y + 2 });
  function fri(p, L) { const r = uteRamme(p);
    for (const b of L.bygg) { const H = LB.hjørner(b); if (!H || !H.length) continue; const xs = H.map(q => q[0]), ys = H.map(q => q[1]);
      if (Math.max(...xs) > r.x0 && Math.min(...xs) < r.x1 && Math.max(...ys) > r.y0 && Math.min(...ys) < r.y1) return false; }
    if (L.plan) for (const a of L.plan) { if (a.x > r.x0 - 6 && a.x < r.x1 + 6 && a.y > r.y0 - 6 && a.y < r.y1 + 6) return false; }
    return true; }
  function velgUte(tving) {
    const L = leir(), m = midt(); if (!V || !L || !m) return;
    if (!tving && V.ute && fri(V.ute, L)) return;
    if (V.ute && fri(V.ute, L)) return;
    for (let d = R.ute.avstand; d <= 160; d += 12) for (let a = 0; a < 16; a++) { const v = -Math.PI / 4 + a * Math.PI / 8, p = { x: Math.round(m.x + Math.cos(v) * d), y: Math.round(m.y + Math.sin(v) * d) };
      if (fri(p, L)) { V.ute = p; if (typeof skitten !== 'undefined') skitten = true; return; } }
    if (!V.ute) V.ute = { x: Math.round(m.x + R.ute.avstand), y: Math.round(m.y - R.ute.avstand) };
  }
  const punkt = u => VL.punkt(LB, leir(), V, u, midt());

  // ---------- simuleringen ----------
  function steg(dt) {
    const L = leir(); if (!L || !midt()) return; if (L !== Lnå || !V) last(); if (!V) return;
    const nu = performance.now();
    slitAkk += dt; if (nu - sistAvstem > 1000) { sistAvstem = nu; VL.avstem(LB, L, V); slit(L, slitAkk); slitAkk = 0; }
    if (nu - sistUteSjekk > 15000) { sistUteSjekk = nu; velgUte(false); lagre(); }
    // folkene bærer inn det som ligger ute (REGLER.ryddPerTime i timen)
    ryddAkk += R.ryddPerTime * dt / 60; if (ryddAkk >= 1) { const n = Math.floor(ryddAkk); ryddAkk -= n; if (VL.rydd(LB, L, V, n) > 0 && typeof skitten !== 'undefined') skitten = true; }
    if (ryddAkk > 3) ryddAkk = 3;
    brannSteg(L, nu);
  }
  // regn sliter det som ligger ute (bare når ting får skje av seg selv); dt = spillminutter siden sist (samlet opp, én gang i sekundet)
  function slit(L, dt) {
    const W = window.VAER, regn = W ? ((W.regel && W.regel.regn) || W.regn || 0) : 0;
    if (auto() && regn > R.regnFra && dt > 0) { const t = VL.slitasje(LB, L, V, regn, dt); for (const [k, m] of Object.entries(t)) { sistLogg[k] = (sistLogg[k] || 0) + m;
      if (sistLogg[k] >= 1) { if (typeof logg === 'function') logg(`Regnet har ødelagt ${tall(sistLogg[k])} ${enhetTekst(k)} ${navn(k)} som lå ute. Bygg lagertelt, så ligger det under tak.`); sistLogg[k] = 0; } } }
  }
  function brannSteg(L, nu) {
    const B = window.BRANNER; if (B && B.length && nu - sistBrann > 500) { sistBrann = nu;
      const brenner = (x, y) => B.some(c => Math.abs(x - c.x) <= (c.r || 32) && Math.abs(y - c.y) <= (c.r || 32));
      const r = VL.brann(LB, L, V, brenner, punkt);
      for (const [p, o] of Object.entries(r.per)) { const t = mengdeTekst(o); if (!t || typeof logg !== 'function') continue;
        const b = p[0] === 'b' ? LB.finn(L, +p.slice(1)) : null; logg(`Brannen tok ${t} ${b ? 'i ' + ((LB.BYGG[b.type] || {}).navn || 'lageret').toLowerCase() : 'på lagerplassen'}.`); }
      if (Object.keys(r.tapt).length) { if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); lagre(); if (typeof skitten !== 'undefined') skitten = true; } }
  }
  if (typeof KROKER !== 'undefined') KROKER.sim.push(dt => { try { steg(dt); } catch (e) { console.error(e); } });
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { if (leir()) last(); }, 300));
  window.addEventListener('pagehide', lagre);
  setInterval(lagre, 5000);

  // ---------- røverne tar bare det som ligger ute ----------
  // Spillet.Trussel.bytte(h) får det som ligger ute i stedet for hele lageret; det som tas, fjernes fra enhetene ute (grunn «stjålet»),
  // og leir.js-tallene trekkes av spillet-visning.js som før.
  let sistTyveri = null;
  function pakkInnBytte() {
    const T = window.Spillet && Spillet.Trussel; if (!T || T.bytte.varelager) return !!T;
    const før = T.bytte.bind(T);
    T.bytte = function (h) { const L = leir(); if (!h || !V || !L || h.lager !== L.lager) return før(h);
      VL.avstem(LB, L, V); const uteNå = VL.ute(LB, L, V), lager = {};
      for (const k of Object.keys(h.lager || {})) lager[k] = Math.min(h.lager[k] || 0, uteNå[k] || 0);
      const b = før({ ...h, lager, diesel: Math.min(h.diesel || 0, uteNå.diesel || 0) });
      VL.stjel(LB, L, V, { ...b.lager, diesel: b.diesel }, false);
      const inne = {}; for (const k of Object.keys(h.lager || {})) { const m = (h.lager[k] || 0) - (uteNå[k] || 0); if (m > .05) inne[k] = m; }
      sistTyveri = { tid: typeof tid !== 'undefined' ? tid : 0, tatt: { ...b.lager }, inne };
      if (Object.keys(inne).length && typeof logg === 'function') logg(`Røverne fant ikke det som lå inne i lagerbyggene (${mengdeTekst(inne)}).`);
      return b; };
    T.bytte.varelager = true; return true;
  }
  if (!pakkInnBytte()) window.addEventListener('riksbrudd-spill', pakkInnBytte); document.addEventListener('DOMContentLoaded', pakkInnBytte);

  // ---------- kommandoen «lagersone» (fanen Lager) ----------
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    Kommando.registrer('lagersone', { leir: true,
      sjekk: k => { const L = leir(); if (!L || !V) return 'Ingen leir ennå.'; if (!Number.isInteger(k.bygg) || !LB.finn(L, k.bygg)) return 'Fant ikke bygget.';
        if (k.vare != null && (!R.enhet[k.vare] || k.vare === 'diesel')) return 'Ukjent vare.'; return null; },
      utfør: k => { const L = leir(), r = VL.settSone(LB, L, V, k.bygg, k.vare || null); if (r.ok) { VL.avstem(LB, L, V); lagre(); if (typeof skitten !== 'undefined') skitten = true; } return r; },
      beskriv: k => `merker lageret for ${k.vare ? navn(k.vare) : 'alle varer'}` });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; if (!r.ok && r.feil && typeof logg === 'function') logg(r.feil); return r; };

  // ---------- 2D: hauger, paller og fat ----------
  const FARGE = { tre: ['#9c7a4c', '#c8a46e'], betong: ['#8f8a80', '#b4afa4'], stål: ['#6d7880', '#9aa6ad'], tømmer: ['#6a4e32', '#c9a66b'], flis: ['#d6d0bf', '#a8915e'], ved: ['#6e5034', '#a27a4c'], diesel: ['#34536b', '#6f8ea6'] };
  // mål i meter (langs, tvers) per form
  const MÅL = { pall: [1.2, 1.0], sekk: [1.2, 1.0], bunt: [1.5, .6], haug: [4.0, 1.4], storsekk: [1.1, 1.1], vedpall: [1.2, 1.2], fat: [.6, .6] };
  function tegnEnhet(g, u, q, sx, sy, m) {
    const E = R.enhet[u.v], [a, b] = MÅL[E.form] || [1, 1], f = FARGE[u.v] || ['#888', '#aaa'], X = sx(q.x), Y = sy(q.y), s = 1 / m;
    // halve enheter er mindre (haugen er kortere, sekken lavere)
    const fyll = Math.max(.35, Math.min(1, u.m / E.str));
    g.save(); g.translate(X, Y); g.rotate(-(q.ret || 0));
    if (E.form === 'fat') { g.fillStyle = f[0]; g.beginPath(); g.arc(0, 0, Math.max(1, .3 * s), 0, 6.283); g.fill(); if (s > 6) { g.strokeStyle = f[1]; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, .2 * s, 0, 6.283); g.stroke(); } }
    else { const w = a * s * (E.form === 'haug' ? fyll : 1), h = b * s;
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-w / 2 + .12 * s, -h / 2 + .12 * s, w, h);
      g.fillStyle = f[0]; g.fillRect(-w / 2, -h / 2, w, h);
      if (s > 5) { g.strokeStyle = f[1]; g.lineWidth = Math.max(1, .05 * s);
        if (E.form === 'haug' || E.form === 'vedpall') { const n = E.form === 'haug' ? 4 : 3, r = h / (2 * n); g.fillStyle = f[1]; for (let i = 0; i < n; i++) for (let j = 0; j < (E.form === 'haug' ? 1 : n); j++) { g.beginPath(); g.arc(E.form === 'haug' ? w / 2 - r : -w / 2 + r + j * 2 * r * (w / h), -h / 2 + r + i * 2 * r, r * .8, 0, 6.283); g.fill(); } }
        else if (E.form === 'storsekk') { g.fillStyle = f[1]; g.fillRect(-w / 4, -h / 4, w / 2, h / 2); }
        else { g.beginPath(); for (let i = 1; i < 4; i++) { const y = -h / 2 + i * h / 4; g.moveTo(-w / 2, y); g.lineTo(w / 2, y); } g.stroke(); } } }
    if (u.r) { g.fillStyle = '#e8c46a'; g.beginPath(); g.arc(a * s * .5, -b * s * .5, Math.max(2, .22 * s), 0, 6.283); g.fill(); }
    g.restore();
  }
  // vises når kartet er zoomet inn (meter per punkt) og leiren er i nærheten av bildet
  const VIS_UTE = .6, VIS_INNE = .3;
  if (typeof KROKER !== 'undefined') KROKER.tegn.push((g, vx0, vy1) => {
    if (!V || !leir() || typeof kam === 'undefined' || kam.m > VIS_UTE) return; const m = kam.m, c = midt(); if (!c) return;
    const sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, W = g.canvas.width, H = g.canvas.height;
    // lagerplassen ute: et svakt tråkket felt under det som ligger der
    const ute = V.e.filter(u => u.p === 'ute'); if (ute.length) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const u of ute) { const q = punkt(u); if (!q) continue; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      if (x0 < Infinity) { g.save(); g.fillStyle = 'rgba(48,40,28,.38)'; g.fillRect(sx(x0 - 3), sy(y1 + 2), (x1 - x0 + 6) / m, (y1 - y0 + 4) / m); g.restore(); } }
    let n = 0;
    for (const u of V.e) { if (u.p === 'bæres') continue; const q = punkt(u); if (!q || q.lag > 0) continue; const X = sx(q.x), Y = sy(q.y); if (X < -40 || Y < -40 || X > W + 40 || Y > H + 40) continue;
      if (q.inne && m > VIS_INNE) continue; n++; if (q.inne) { g.save(); g.globalAlpha = .55; tegnEnhet(g, u, q, sx, sy, m); g.restore(); } else tegnEnhet(g, u, q, sx, sy, m); }
    // (for vakta) så mange enheter ble tegnet sist, og når
    ut.tegnet = n; ut.tegnetNår = performance.now();
  });
  // tegnes etter leirens bygg (som også tegnes «over» og i byggevisningen), ellers ligger taket oppå
  if (typeof KROKER !== 'undefined') { const f = KROKER.tegn[KROKER.tegn.length - 1]; f.over = true; f.bygg = true; }

  // ---------- Leir-menyen, fanen Lager ----------
  const SONER = [null, 'tre', 'betong', 'stål', 'tømmer', 'flis', 'ved'];
  const css = document.createElement('style');
  css.textContent = `#leirmeny .varelager .plass{ padding:5px 0 6px; border-bottom:1px solid #3a3226; font-size:13.5px; }
#leirmeny .varelager .plass b{ font-weight:600; } #leirmeny .varelager .plass small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; line-height:1.35; }
#leirmeny .varelager .soner{ display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; } #leirmeny .varelager .soner button{ min-height:30px; padding:1px 8px; font-size:12.5px; }
#leirmeny .varelager .soner button.på{ border-color:#c9b26a; color:#f0dc9a; } #leirmeny .varelager .ute small.fare{ color:#e8c46a; }
#leirmeny .varelager .forklar{ font-size:12.5px; color:var(--ink-dim,#a99); line-height:1.35; margin:2px 0 4px; }`;
  document.head.appendChild(css);
  const innhold = o => { const d = Object.entries(o.varer).map(([k, w]) => `${VL.antallTekst(k, w.n)} (${tall(w.m)} ${enhetTekst(k)})` + (w.r ? `, ${w.r} reservert` : '')); return d.length ? d.join(', ') : 'tomt'; };
  // (unshift: lager-visning.js lastes senere og legger oversikten sin først, så står «Lagerplasser» rett under den)
  (window.LEIR_MENY = window.LEIR_MENY || []).unshift((hode, { el, knapp }) => {
    const L = leir(); if (!L || !V) return; VL.avstem(LB, L, V);
    const boks = el('div', { klasse: 'varelager', id: 'varelager' });
    hode.append(el('h3', { 'data-fane': 'lager' }, 'Lagerplasser: hvor varene ligger'));
    boks.append(el('div', { klasse: 'forklar' }, 'Varene ligger i hauger, paller, sekker og fat. Under tak er de trygge for regn og røvere; det som ligger ute, slites i regn og kan bli stjålet. Folkene bærer det inn når det blir plass.'));
    const O = VL.oversikt(LB, L, V);
    for (const o of O) { if (o.id === 'ute' || o.tank) continue;
      const tittel = o.bygg ? `${(LB.BYGG[o.bygg.type] || {}).navn || 'Lager'}${(o.bygg.nivå || 1) > 1 ? ' (nivå ' + o.bygg.nivå + ')' : ''}` : 'Egne rom (byggesettet)';
      const r = el('div', { klasse: 'plass', 'data-plass': o.id }, el('b', {}, tittel), el('small', {}, innhold(o) + (o.sone ? ` · bare ${navn(o.sone)}` : '')));
      if (o.bygg) { const s = el('div', { klasse: 'soner' }); for (const v of SONER) s.append(knapp(v ? LB.MATERIALER[v].navn : 'Alle varer', () => { kom({ type: 'lagersone', bygg: o.bygg.id, vare: v }); if (window.LeirSpill) LeirSpill.visMeny(); }, { klasse: (o.sone || null) === v ? 'på' : '', 'data-sone': v || 'alle' }));
        r.append(s); }
      boks.append(r); }
    const T = O.filter(o => o.tank); for (const o of T) if (Object.keys(o.varer).length) boks.append(el('div', { klasse: 'plass', 'data-plass': o.id }, el('b', {}, `Ved ${((LB.BYGG[o.bygg.type] || {}).navn || 'tanken').toLowerCase()}`), el('small', {}, innhold(o))));
    const U = O.find(o => o.id === 'ute'), harUte = U && Object.keys(U.varer).length;
    boks.append(el('div', { klasse: 'plass ute', 'data-plass': 'ute' }, el('b', {}, 'Ute på lagerplassen'), el('small', { klasse: harUte ? 'fare' : '' }, harUte ? innhold(U) + '. Slites i regn – røvere kan ta det.' : 'Ingenting ligger ute.')));
    if (!O.some(o => o.bygg && !o.tank)) boks.append(el('div', { klasse: 'forklar' }, 'Bygg et lagertelt eller en container for å få varene under tak.'));
    const tapt = Object.entries(V.tapt || {}).map(([g, o]) => { const t = mengdeTekst(o); return t ? `${g}: ${t}` : ''; }).filter(Boolean);
    if (tapt.length) boks.append(el('div', { klasse: 'forklar' }, 'Tapt så langt – ' + tapt.join(' · ') + '.'));
    hode.append(boks);
  });

  window.VarelagerSpill = Object.assign(ut, {
    V: () => V, last, lagre, punkt, avstem: () => { const L = leir(); return L && V ? VL.avstem(LB, L, V) : null; },
    avvik: () => { const L = leir(); return L && V ? VL.avvik(L, V) : null; }, ute: () => { const L = leir(); return L && V ? VL.ute(LB, L, V) : null; },
    reserver: (id, hvem) => (V ? VL.reserver(V, id, hvem) : { feil: 'Ingen leir.' }), slipp: (id, hvem) => !!V && VL.slipp(V, id, hvem),
    hent: (id, hvem) => (V ? VL.hent(V, id, hvem) : { feil: 'Ingen leir.' }), lever: (id, plass) => (V ? VL.lever(LB, leir(), V, id, plass) : { feil: 'Ingen leir.' }),
    bruk: (id, mengde, grunn) => (V ? VL.bruk(leir(), V, id, mengde, grunn) : 0), beskjeder: hvem => (V ? VL.beskjeder(V, hvem) : []),
    finnNy: (vare, hvem, x, y) => (V ? VL.finnNy(V, vare, hvem, punkt, x, y) : null), sone: (bygg, vare) => kom({ type: 'lagersone', bygg, vare }),
    rydd: n => (V ? VL.rydd(LB, leir(), V, n == null ? 1e9 : n) : 0), sistTyveri: () => sistTyveri, synlig: () => !!V && typeof kam !== 'undefined' && kam.m <= VIS_UTE,
    VIS_UTE, VIS_INNE, tegnEnhet,
  });
})();
