/* KAMP MED VEGGER OG TA OVER HUS – visningen (fase B6 og B7, 28. nov, ut5-kampvegger). Reglene: spill/husvern.js og spill/overtak.js.
 * Bygger på byggemodellen (spill/bygning.js), plantegningen (spill/plantegning-visning.js) og endringsloggen (spill/husendring-visning.js).
 *  - HVILKET HUS: hvert sekund ses det etter om et lag står stille inne i et hus (husene plantegningen kjenner, husene i endringsloggen,
 *    leirens egne bygg fra byggesettet, ellers slås huset opp i kartet med finnBygg). s.hus = { k, i, n } (n = etasjen, s.husEtasje).
 *  - VERN (KROKER.ild): treffene mot et lag i et hus ganges med vernet fra veggene MELLOM laget og skytteren (HusVern.vernSnitt) – bare når
 *    huset har en modell; ellers som før. Fra en høyere etasje teller høyden (Strid.høydeRett), og sikten blir lengre (KROKER.sikt og øynene).
 *  - SKUDD OG SMELL LAGER HULL: vedvarende ild mot en trevegg skader den (og knuser vinduer), granatene i lagkampen (KROKER.salve) og
 *    eksplosjonene i 3D (Effekter3d.eksplosjon) river lette vegger og slår hull, og ingeniørlag kan sprenge hull i et hus (lagpanelet).
 *    Alt føres i endringsloggen («riksbrudd-bygninger») gjennom HusEndring.føre, så plantegningen og 3D viser det.
 *  - INNGANG: fiender innen 60 m av et forsvart hus stormer det; barrikadene holder dem ute i HusVern.inngang().forsinkelse minutter,
 *    så er de inne, og veggene verner ikke lenger mot dem.
 *  - TA OVER HUSET (B7): i huspanelet og plantegningen for hus innen 3 km av leiren – utpost, lager, verksted eller kaserne. Sengene
 *    teller i Leir.plasser, lagerrommene i Leir.lagerplass. Kartet viser huset i leirens farge med «Vårt». Lagres i «riksbrudd-overtak».
 *  - VISNING: plantegningen farger veggene etter vernet (sterk/middels/svak), knuste åpninger og hull får et rødt kryss; lagpanelet sier
 *    «i huset: veggene tar 60 %» og har etasjeknapper.
 * I testene (navigator.webdriver) skjer ingenting av seg selv: HusvernSpill.test = true slår det på (vakta gjør det og slår det av igjen).
 * «Sikre huset» (OverlevSpill) er IKKE erstattet: det er hvile/tilflukt for karakteren din; barrikadene her er det som virker i kampen.
 */
(function () {
  'use strict';
  const HV = window.HusVern, OT = window.Overtak; if (!HV || !OT || typeof document === 'undefined') return;
  const P2 = () => window.Plantegning2D || null, PT = window.Plantegning || null, BG = () => window.Bygning || null, HE = () => window.HusEndring || null;
  const S = { slit: new Map(), inntak: new Map(), sett: new Map(), oppslag: new Set(), gFør: new Map(), visVern: false, velgBruk: null, siste: null, bs: null };
  const api = { test: false, S };
  const aktiv = () => !navigator.webdriver || api.test === true;
  const tegnPå = () => { if (typeof skitten !== 'undefined') skitten = true; };
  const si = t => { if (typeof logg === 'function') logg(t); };
  const nå = () => (typeof tid !== 'undefined' ? tid : 0);
  const alle = () => (typeof ENHETER !== 'undefined' ? ENHETER : []);
  const lever = s => (typeof levende === 'function' ? levende(s) : true);
  const leirXY = () => { const s = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return s && s.leir ? { x: s.leir.x, y: s.leir.y } : null; };
  const leirId = () => { const l = leirXY(); return l ? Math.round(l.x) + ',' + Math.round(l.y) : ''; };
  const NAVN = { hus: 'Bolig', hytte: 'Hytte', leil: 'Leilighetsbygg', uthus: 'Uthus', låve: 'Låve', kirke: 'Kirke', butikk: 'Butikk', industri: 'Industribygg', lager: 'Lager',
    kontor: 'Kontorbygg', skole: 'Skole', sykehus: 'Sykehus', sykehjem: 'Sykehjem', legevakt: 'Legevakt', hangar: 'Hangar', terminal: 'Terminal' };
  const etgNavn = n => (n === -1 ? 'kjelleren' : n + '. etasje');
  const inni = HV.inni;

  // ---------- overtatte hus (B7): lagring per leir ----------
  const NØKKEL = 'riksbrudd-overtak';
  let OL = OT.nyLogg('');
  function lesInn() { let t = null; try { t = localStorage.getItem(NØKKEL); } catch (e) { /* sperret */ } OL = OT.lesLogg(t, leirId()); oppdaterKap(); tegnPå(); return OL; }
  function lagre() { OL.leir = leirId(); try { localStorage.setItem(NØKKEL, JSON.stringify(OL)); } catch (e) { /* sperret */ } }
  window.addEventListener('riksbrudd-spill', () => setTimeout(lesInn, 0));

  // ---------- husene ----------
  // H = { k (nøkkel), i, h (plantegningens hus, eller null), m (modellen), o (nullpunkt), Pv (omrisset i kartets meter), navn }
  function fraKart(h) { if (!h) return null; const m = h.m || (P2() && P2().modell(h.i)); if (!m) return null; return { k: 'h' + h.i, i: h.i, h, m, o: h.o, Pv: h.Pv, navn: NAVN[h.info && h.info.kl] || 'Bygg' }; }
  function husFor(i) { const he = HE(); if (he && he.husFor) { const h = he.husFor(i); if (h) return fraKart(h); } const p = P2(); return p ? fraKart(p.hus(i)) : null; }
  // leirens egne bygg (byggesettet): modellen i kartets meter, regnet på nytt når delene endres
  function egne() {
    const B = window.Byggesett; if (!B || !B.deler || !B.opphav || !BG()) return null; let dl; try { dl = B.deler(); } catch (e) { return null; } if (!dl || !dl.length) return null;
    const n = dl.length + ':' + dl.filter(d => d.ferdig !== false).length + ':' + (dl[dl.length - 1].id || '');
    if (!S.bs || S.bs.n !== n) { let m = null; try { m = BG().fraByggesett(dl, B.opphav()); } catch (e) { m = null; } S.bs = { n, H: m ? { k: 'bs', i: 'bs', h: null, m, o: [0, 0], Pv: m.P, navn: 'Leirens bygg' } : null }; }
    return S.bs.H;
  }
  // huset i punktet (x, y) blant husene som alt er kjent
  function husVed(x, y) {
    const p = P2();
    if (p) { for (const h of p.HUS.values()) if (h.Pv && x >= h.bb[0] && x <= h.bb[2] && y >= h.bb[1] && y <= h.bb[3] && inni(h.Pv, x, y)) { const H = fraKart(h); if (H) return H; }
      const L = p.logg(); if (L && L.kart) for (const i of Object.keys(L.kart)) { const k = L.kart[i]; if (k && k.P && inni(k.P, x, y)) { const H = husFor(+i); if (H) return H; } } }
    const E = egne(); if (E && inni(E.m.P, x, y)) return E;
    return null;
  }
  // slå opp huset i kartet (finnBygg) og lag modellen – én om gangen
  let slår = false;
  async function slåOpp(x, y) {
    if (slår || typeof finnBygg !== 'function' || !P2() || !PT) return null; slår = true;
    try {
      const b = await finnBygg(x, y); if (!b || !b.o || !b.o.e || b.o.e.i == null || !b.P || !inni(b.P, x, y)) return null;
      const Pv = PT.åpent(b.P); if (Pv.length < 3) return null;
      if (typeof form === 'function' && typeof rund === 'function') { const f = form(Pv); if (rund(Pv, f)) return null; }
      const c = PT.ramme(Pv), h = P2().hus(b.o.e.i) || P2().nyttHus(Pv, b.o.e, PT.tetthet(c, await sentre(c)));
      return fraKart(h);
    } catch (e) { console.warn('husvern:', e); return null; } finally { slår = false; }
  }
  // sentrene til husene rundt (samme regel som plantegningen: hus-flisene z13 innen 110 m) – for tettheten
  async function sentre(c) {
    const ut = []; if (typeof hentFlis !== 'function' || typeof span !== 'function' || typeof G === 'undefined' || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.hus) return ut;
    const z = 13, sp = span(z), mg = 110, x0 = Math.floor((c[0] - mg - G.x0) / sp), x1 = Math.floor((c[0] + mg - G.x0) / sp), y0 = Math.floor((G.y0 - (c[1] + mg)) / sp), y1 = Math.floor((G.y0 - (c[1] - mg)) / sp);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { let t = null; try { t = await hentFlis('hus', z, x, y); } catch (e) { t = null; } if (!t || !t.hus) continue;
      const minx = G.x0 + x * sp, maxy = G.y0 - y * sp, k = sp / 4096, sett = new Set();
      for (const o of t.hus.obj) { const d = o.deler[0]; if (!d || sett.has(o.e.i)) continue; sett.add(o.e.i); const q = PT.senter(d); ut.push([minx + q[0] * k, maxy - q[1] * k]); } }
    return ut;
  }
  const lokal = (H, x, y) => [x - H.o[0], y - H.o[1]];
  const modellAv = s => (s && s.hus ? (s.hus.k === 'bs' ? egne() : husFor(s.hus.i)) : null);

  // ---------- hvert sekund: hvilke lag står i et hus ----------
  function plasser() {
    if (!aktiv()) return;
    for (const s of alle()) {
      if (!s || !Array.isArray(s.menn) || !lever(s)) { if (s && s.hus) settHus(s, null); continue; }
      if (s.sti || s.ombord) { if (s.hus) settHus(s, null); continue; }
      const nøk = Math.round(s.x) + ',' + Math.round(s.y);
      if (s.hus && S.sett.get(s) === nøk) continue;
      const H = husVed(s.x, s.y);
      if (H) { settHus(s, H); S.sett.set(s, nøk); continue; }
      if (s.hus) settHus(s, null);
      S.sett.set(s, nøk);
      // ikke slått opp på dette stedet før: spør kartet (svaret kommer senere)
      if (!S.oppslag.has(nøk)) { S.oppslag.add(nøk); if (S.oppslag.size > 400) S.oppslag.clear(); slåOpp(s.x, s.y).then(H2 => { if (H2 && !s.sti && Math.abs(s.x - +nøk.split(',')[0]) < 1.5) { settHus(s, H2); S.sett.set(s, nøk); if (valgtEr(s)) visPanelNå(); } }); }
    }
  }
  function settHus(s, H) {
    const før = s.hus ? s.hus.k : null;
    if (!H) { delete s.hus; delete s.husVern; if (s.øyneEkstra) { delete s.øyneEkstra; s.siktSkitten = true; } if (før) delete s.husEtasje; return; }
    const ets = HV.etasjer(H.m), n = ets.some(e => e.n === s.husEtasje) ? s.husEtasje : 1;
    s.hus = { k: H.k, i: H.i, n, navn: H.navn };
    const øy = HV.etasjeHøyde(H.m, n); if ((s.øyneEkstra || 0) !== øy) { if (øy) s.øyneEkstra = øy; else delete s.øyneEkstra; s.siktSkitten = true; }
    if (før !== H.k) { s.siktSkitten = true; if (s.side === 'blå' && !s.karakter) si(`${s.navn} har tatt stilling i huset (${H.navn.toLowerCase()}).`); }
  }
  const valgtEr = s => typeof valgt !== 'undefined' && valgt === s;
  const visPanelNå = () => { if (typeof visPanel === 'function') try { visPanel(); } catch (e) { /* uten panel */ } };

  // ---------- vernet i kampen ----------
  function vernFor(a, b) {
    const H = modellAv(b); if (!H) return null;
    const T = lokal(H, b.x, b.y), Sk = lokal(H, a.x, a.y);
    // skytteren står i samme hus: ingen vegg å regne med
    if (inni(H.m.P, Sk[0], Sk[1])) return { faktor: 1, andel: 0, vegger: [] };
    return Object.assign(HV.vernSnitt(H.m, b.hus.n, HV.punkterRundt(H.m, T[0], T[1]), Sk), { H, T, Sk });
  }
  // høyden fra etasjene (som terrenget: Strid.høydeRett av forskjellen) – bare den delen etasjene legger til
  function høydeF(a, b) {
    const za = a.hus ? (a.øyneEkstra || 0) : 0, zb = b.hus ? (b.øyneEkstra || 0) : 0; if (!(za || zb) || !window.Strid || !Strid.høydeRett) return 1;
    const dh0 = a.her && b.her && isFinite(a.her.h) && isFinite(b.her.h) ? a.her.h - b.her.h : 0;
    return Strid.høydeRett(dh0 + za - zb) / Strid.høydeRett(dh0);
  }
  if (typeof KROKER !== 'undefined' && KROKER.ild) KROKER.ild.push((a, b) => {
    if (!aktiv() || !a || !b || !Array.isArray(a.menn) || !Array.isArray(b.menn)) return 1;
    let f = høydeF(a, b);
    // lagkampens granater: hvor mange a har før salven (KROKER.salve sammenligner etterpå)
    if (Number.isFinite(a.granater)) S.gFør.set(a, a.granater);
    if (!b.hus) return f;
    const inn = S.inntak.get(b.hus.k + '>' + a.navn); if (inn && inn.inne) return f * HV.REGLER.inntak.inne;
    const v = vernFor(a, b); if (!v) return f;
    b.husVern = { andel: v.andel, kjeller: !!v.kjeller, t: nå() };
    // skuddene sliter på veggen (føres litt etterpå, utenfor kamprunden)
    if (v.H && v.H.h && v.vegger.length) { const n = a.menn.filter(m => m.hp >= 1).length, d = Math.hypot(a.x - b.x, a.y - b.y);
      if (n && d <= HV.REGLER.slit.maksAvstand) { const H = v.H, T = v.T, Sk = v.Sk, et = b.hus.n; setTimeout(() => { try { slitNå(H, et, T, Sk, n); } catch (e) { console.warn('husvern:', e); } }, 0); } }
    return f * v.faktor;
  });
  function slitNå(H, n, T, Sk, menn) {
    const H2 = husFor(H.i); if (!H2) return; const ny = HV.slit(H2.m, n, T, Sk, menn, S.slit, H.k); if (ny.length) føre(H2, ny, 'skudd');
  }
  // fører endringene i husets logg (én om gangen, bare de modellen godtar)
  function føre(H, endringer, hvorfor) {
    const he = HE(), B = BG(); if (!he || !he.føre || !B || !H.h) return 0; let n = 0, ras = 0; const gjort = [];
    for (const d of endringer) { const H2 = husFor(H.i) || H; const v = B.vurder(H2.m, d); if (!v.ok) continue; he.føre(H2.h, [d]); n++; ras += v.ras.length; gjort.push(d); }
    if (n) { tegnPå(); S.siste = { hus: H.i, endringer: gjort, hvorfor, ras };
      const t = gjort.map(d => (d.del === 'vegg' ? (d.gjør === 'skad' ? 'en vegg er skadet' : 'en vegg er revet') : d.type === 'hull' ? 'hull i en vegg' : d.gjør === 'riv' ? 'et vindu er knust' : 'plankene er revet ned'));
      si(`${H.navn}: ${[...new Set(t)].join(', ')}${hvorfor === 'skudd' ? ' av skuddene' : ''}${ras ? ' – deler av huset raste sammen' : ''}.`); }
    return n;
  }
  // et smell ved (X, Y) i kartets meter: det nærmeste huset innen radiusen rammes
  function smellVed(X, Y, slag, n) {
    const R = (HV.REGLER.smell[slag] || HV.REGLER.smell.granat).radius;
    let H = husVed(X, Y); if (!H) { const p = P2(); if (p) for (const h of p.HUS.values()) { if (!h.Pv || X < h.bb[0] - R || X > h.bb[2] + R || Y < h.bb[1] - R || Y > h.bb[3] + R) continue; H = fraKart(h); if (H) break; } }
    if (!H || !H.h) return null; const q = lokal(H, X, Y), r = HV.smell(H.m, n || 1, q[0], q[1], slag); if (!r.endringer.length) return r;
    r.ført = føre(H, r.endringer, slag); return r;
  }
  // lagkampens granater mot et lag i et hus: veggen mellom tar smellet
  function koblSmell() {
    if (typeof KROKER === 'undefined') return;
    (KROKER.salve = KROKER.salve || []).push((a, b) => { if (!aktiv() || !a || !b) return 0; const g0 = S.gFør.get(a); S.gFør.delete(a);
      if (!b.hus || !Number.isFinite(g0) || !Number.isFinite(a.granater) || a.granater >= g0) return 0;
      const v = vernFor(a, b); if (!v || !v.H || !v.vegger.length) return 0;
      // treffpunktet: der skuddlinja går inn i huset (den ytterste veggen mot kasteren)
      const w = v.vegger[0], P = [v.T[0] + (v.Sk[0] - v.T[0]) * w.u, v.T[1] + (v.Sk[1] - v.T[1]) * w.u];
      setTimeout(() => { try { smellVed(P[0] + v.H.o[0], P[1] + v.H.o[1], 'granat', b.hus ? b.hus.n : 1); } catch (e) { console.warn('husvern:', e); } }, 0); return 0; });
    // granatene og sprengningene i 3D (spill/bakkekamp-visning.js og andre): Effekter3d.eksplosjon(X, Y, r) – r ≥ 6 regnes som sprengstoff
    const E = window.Effekter3d; if (E && E.eksplosjon && !E.eksplosjon.husvern) { const f0 = E.eksplosjon;
      E.eksplosjon = function (X, Y, r) { try { if (aktiv() && !S.egetSmell && Number.isFinite(X)) smellVed(X, Y, r >= 6 ? 'sprengstoff' : 'granat', 1); } catch (e) { console.warn('husvern:', e); } return f0.apply(this, arguments); };
      E.eksplosjon.husvern = true; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', koblSmell); else setTimeout(koblSmell, 0);

  // ---------- sikt fra etasjene ----------
  if (typeof KROKER !== 'undefined' && KROKER.sikt) KROKER.sikt.push(s => { if (!aktiv() || !s || !s.hus) return 1; const H = modellAv(s); return H ? HV.sikt(H.m, s.hus.n) : 1; });

  // ---------- inngangen: fiender som stormer et forsvart hus ----------
  function inntakSteg() {
    if (!aktiv()) return; const t = nå(), R = HV.REGLER.inntak, L = alle();
    for (const b of L) {
      if (!b || !b.hus || !lever(b) || !Array.isArray(b.menn)) continue; const H = modellAv(b); if (!H) continue;
      for (const a of L) {
        if (!a || a === b || a.side === b.side || !Array.isArray(a.menn) || !lever(a) || a.karakter) continue;
        const k = b.hus.k + '>' + a.navn, q = lokal(H, a.x, a.y), d = Math.hypot(a.x - b.x, a.y - b.y); let I = S.inntak.get(k);
        if (d > R.nær + 30) { if (I) S.inntak.delete(k); continue; }
        if (!I && d <= R.nær) { const ing = HV.inngang(H.m), vei = HV.veiInn(H.m, q[0], q[1]); I = { start: t, f: inni(H.m.P, q[0], q[1]) ? 0 : ing.forsinkelse, vei, inne: false, hus: H.i, a: a.navn, b: b.navn }; S.inntak.set(k, I);
          if (b.side === 'blå' || a.side === 'blå') si(`${b.side === 'blå' ? (typeof synlig === 'function' && !synlig(a) ? 'Fienden' : a.navn) : a.navn} stormer huset der ${b.navn} står – ${vei ? 'mot ' + HV.VEINAVN[vei.type] + (vei.sperre ? ' (barrikadert)' : '') : 'rundt huset'}${I.f > R.åpen ? `; barrikadene holder dem ute ca. ${Math.round(I.f)} min` : ''}.`); }
        if (I && !I.inne && t - I.start >= I.f) { I.inne = true; if (b.side === 'blå' || a.side === 'blå') si(`${b.side === 'blå' ? 'Fienden' : a.navn} er inne i huset der ${b.navn} står – veggene verner ikke lenger.`); }
      }
    }
  }
  let sistMin = -1;
  if (typeof KROKER !== 'undefined' && KROKER.sim) KROKER.sim.push(() => { const m = Math.floor(nå()); if (m === sistMin) return; sistMin = m; try { inntakSteg(); } catch (e) { console.warn('husvern:', e); } });
  setInterval(() => { try { plasser(); oppdaterKap(); } catch (e) { console.warn('husvern:', e); } }, 1000);

  // ---------- kommandoene ----------
  function registrer() {
    const K = window.Kommando; if (!K) return false;
    if (!K.finnes('husEtasje')) K.registrer('husEtasje', { lag: true,
      sjekk: (k, c, s) => { if (!s.hus) return `${s.navn} står ikke i et hus.`; const H = modellAv(s); if (!H) return 'Huset er ikke lastet.'; return HV.etasjer(H.m).some(e => e.n === k.n) ? null : 'Den etasjen finnes ikke.'; },
      utfør: (k, c, s) => { s.husEtasje = k.n; const H = modellAv(s); if (H) settHus(s, H); s.siktSkitten = true; tegnPå(); return `${s.navn} går til ${etgNavn(k.n)}.`; },
      beskriv: (k, s) => `flytter ${s.navn} til ${etgNavn(k.n)}` });
    if (!K.finnes('husSpreng')) K.registrer('husSpreng', { lag: true,
      sjekk: (k, c, s) => { if (!s.ingeniør) return 'Bare ingeniørlag har sprengstoff.'; const H = husFor(k.hus); if (!H) return 'Huset er ikke lastet.'; return nærKant(H, s.x, s.y).d <= SPRENG ? null : `${s.navn} må stå inntil huset (innen ${SPRENG} m).`; },
      utfør: (k, c, s) => { const H = husFor(k.hus), q = nærKant(H, s.x, s.y); S.egetSmell = true; try { if (window.Effekter3d && Effekter3d.eksplosjon) Effekter3d.eksplosjon(q.x, q.y, 6); } catch (e) { /* effekten er ikke viktig */ } finally { S.egetSmell = false; }
        const r = smellVed(q.x, q.y, 'sprengstoff', 1); return r && r.ført ? `${s.navn} sprengte: ${r.tekst}.` : 'Sprengladningen gjorde ingen skade.'; },
      beskriv: (k, s) => `${s.navn} sprenger et hull i et hus` });
    if (!K.finnes('husOvertak')) K.registrer('husOvertak', { leir: true,
      sjekk: k => { if (k.slipp) return OL.hus[k.hus] ? null : 'Huset er ikke vårt.'; if (!OT.BRUK[k.bruk]) return 'Ukjent bruk.'; const H = husFor(k.hus); if (!H) return 'Huset er ikke lastet.';
        if (OL.hus[k.hus] && OL.hus[k.hus].bruk === k.bruk) return 'Huset brukes alt slik.'; const l = leirXY(); if (!l) return 'Ingen leir ennå.';
        const c = PT.ramme(H.Pv), v = OT.kanTaOver(Math.hypot(c[0] - l.x, c[1] - l.y), { revet: !!(window.HUS_BORT && HUS_BORT.has(k.hus)) }); return v.ok ? null : v.feil; },
      utfør: k => taOver(k), beskriv: k => (k.slipp ? 'gir opp et hus' : 'tar over et hus') });
    return true;
  }
  const kjør = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : window.Kommando ? Kommando.utfør(k, { lag: alle() }) : { ok: false, feil: 'Kommandolaget mangler.' };
    if (!window.KOMMANDO && typeof logg === 'function') logg(r.ok ? (typeof r.svar === 'string' ? r.svar : r.svar && r.svar.tekst) || 'OK.' : r.feil); return r; };
  const SPRENG = 12;
  const nid = s => (window.KOMMANDO && KOMMANDO.nid ? KOMMANDO.nid(s) : window.Kommando && Kommando.nid ? Kommando.nid(s, alle()) : s.nid);
  // nærmeste punkt på husets omriss (kartets meter)
  function nærKant(H, x, y) { const P = H.Pv; let best = { d: Infinity, x, y }; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), px = a[0] + dx * t, py = a[1] + dy * t, d = Math.hypot(px - x, py - y); if (d < best.d) best = { d, x: px, y: py }; } return best; }

  // ---------- ta over et hus (B7) ----------
  function kap(H, bruk) { return { senger: OT.senger(H.m, bruk), lager: OT.lager(H.m, bruk) }; }
  function taOver(k) {
    if (k.slipp) { const o = OL.hus[k.hus]; delete OL.hus[k.hus]; lagre(); oppdaterKap(); tegnPå(); visRad(); return `Huset er ikke lenger en del av leiren${o ? ' (' + OT.BRUK[o.bruk].navn.toLowerCase() + ')' : ''}.`; }
    const H = husFor(k.hus), c = PT.ramme(H.Pv), K = kap(H, k.bruk), før = OL.hus[k.hus];
    OL.hus[k.hus] = { bruk: k.bruk, tid: nå(), navn: H.navn, c: [Math.round(c[0]), Math.round(c[1])], senger: K.senger, lager: K.lager, n: H.m.endringer ? H.m.endringer.length : 0 };
    // det kartet vet om huset lagres i endringsloggen (som for riving), så huset finnes etter ny lasting uten kartflisene
    const p = P2(); if (p && PT && H.h) { PT.husKart(p.logg(), H.i, H.h.e, H.h.tett, H.h.Pv); p.lagre(); }
    lagre(); oppdaterKap(); tegnPå(); visRad(); S.velgBruk = null;
    return `${før ? 'Huset brukes nå som' : 'Huset er tatt over som'} ${OT.BRUK[k.bruk].navn.toLowerCase()}: ${K.senger} ${K.senger === 1 ? 'seng' : 'senger'}, ${String(K.lager).replace('.', ',')} m³ lagerplass.`;
  }
  // sengene og lageret følger endringene i husene (riving, ras) – og revne hus faller bort
  function oppdaterKap() {
    let endret = false;
    for (const i of Object.keys(OL.hus)) { const o = OL.hus[i];
      if (window.HUS_BORT && HUS_BORT.has(+i)) { delete OL.hus[i]; endret = true; si(`${o.navn || 'Huset'} er revet og ikke lenger en del av leiren.`); continue; }
      const H = (P2() && (P2().hus(+i) || (P2().logg().kart && P2().logg().kart[i]))) ? husFor(+i) : null; if (!H) continue;
      const n = H.m.endringer ? H.m.endringer.length : 0; if (n === o.n && o.senger !== undefined) continue;
      const K = kap(H, o.bruk); o.senger = K.senger; o.lager = K.lager; o.n = n; endret = true; }
    if (endret) lagre();
  }
  const sum = () => OT.sum(OL.hus);
  // Leir.plasser og lagerplassen får med de overtatte husene (byggesettets flagg beholdes, så Folk ikke teller to ganger)
  if (window.Leir && Leir.plasser && !Leir.plasser.overtak) { const før = Leir.plasser; Leir.plasser = L => før(L) + sum().senger; Object.assign(Leir.plasser, før, { overtak: true }); if (før.byggesett) Leir.plasser.byggesett = true; }
  if (window.Leir && Leir.lagerplass) { const ek = Leir.lagerplass.ekstra; Leir.lagerplass.ekstra = L => (ek ? ek(L) || 0 : 0) + sum().lager; }

  // ---------- 2D: overtatte hus i leirens farge, og vernet i plantegningen ----------
  const FV = { sterk: '#6fbf9a', middels: '#e08a3c', svak: '#d0563c' };
  const nivå = st => (st >= .6 ? 'sterk' : st >= .3 ? 'middels' : 'svak');
  const harLag = i => alle().some(s => s && s.hus && s.hus.i === i);
  function tegn(g, vx0, vy1) {
    const m = typeof kam !== 'undefined' ? kam.m : 1, sx = x => (x - vx0) / m, sy = y => (vy1 - y) / m, p = P2();
    // overtatte hus
    if (m < 40 && p) { const L = p.logg(), farge = typeof sidefarge === 'function' ? sidefarge('blå', 'farge') : '#5f87c7';
      for (const i of Object.keys(OL.hus)) { const k = L.kart && L.kart[i], h = p.hus(+i), Pv = (h && h.Pv) || (k && k.P); if (!Pv) continue; const o = OL.hus[i];
        g.save(); g.beginPath(); Pv.forEach((q, n) => (n ? g.lineTo(sx(q[0]), sy(q[1])) : g.moveTo(sx(q[0]), sy(q[1])))); g.closePath();
        g.globalAlpha = .28; g.fillStyle = farge; g.fill(); g.globalAlpha = .95; g.strokeStyle = farge; g.lineWidth = 2; g.stroke();
        if (m < 3) { const c = PT.ramme(Pv); g.globalAlpha = 1; g.font = '13px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillStyle = '#e7dcc3';
          g.fillText('Vårt · ' + OT.BRUK[o.bruk].navn, sx(c[0]), sy(Math.max(...Pv.map(q => q[1]))) - 3); }
        g.restore(); } }
    // vernet i plantegningen
    if (!p || !p.aktiv() || !PT) return;
    for (const h of p.S.nær) {
      if (!h.klar || !h.m) continue; if (!(S.visVern || harLag(h.i) || OL.hus[h.i])) continue;
      const n = h.m.etasjer.some(e => e.n === p.S.etasje) ? p.S.etasje : 1, e = HV.etasje(h.m, n); if (!e) continue; const X = q => sx(h.o[0] + q[0]), Y = q => sy(h.o[1] + q[1]);
      const Fg = PT.figur(h.m, n); g.save(); g.lineCap = 'butt';
      for (const w of Fg.vegger) { if (w.revet) continue; const st = HV.veggStopp(e.vegger[w.id] || w); g.strokeStyle = FV[nivå(st)]; g.globalAlpha = .9; g.lineWidth = Math.max(1.5, Math.min(4, (w.tykk || .2) / m * .45));
        if (w.tilstand === 'skadet') g.setLineDash([4, 3]); g.beginPath(); for (const [a, b] of w.biter) { g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); } g.stroke(); g.setLineDash([]); }
      // knuste åpninger og hull: rødt kryss
      g.strokeStyle = '#d0563c'; g.lineWidth = 1.6; g.globalAlpha = 1;
      for (const o of Fg.åpninger) { if (o.tilstand !== 'ødelagt' && o.type !== 'hull') continue; const r = Math.max(4, Math.min(9, o.b / 2 / m)), cx = X([o.x, o.y]), cy = Y([o.x, o.y]);
        g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy + r); g.moveTo(cx + r, cy - r); g.lineTo(cx - r, cy + r); g.stroke(); }
      g.restore();
    }
  }
  if (typeof KROKER !== 'undefined' && KROKER.tegn) KROKER.tegn.push(tegn);

  // ---------- raden i plantegningen og knappen i huspanelet ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let radHus = null;
  function rad(h, n) {
    radHus = h; if (!h || !h.m) return ''; const I = HV.inngang(h.m), o = OL.hus[h.i], l = leirXY(), c = PT.ramme(h.Pv), avst = l ? Math.hypot(c[0] - l.x, c[1] - l.y) : Infinity;
    const vis = S.visVern || harLag(h.i) || !!o;
    let html = `<div class="rad valg"><small>${vis ? `Vern: <span style="color:${FV.sterk}">■</span> sterk <span style="color:${FV.middels}">■</span> middels <span style="color:${FV.svak}">■</span> svak · ` : ''}`
      + `inngang: ${I.åpne ? I.åpne + ' åpen' + (I.åpne > 1 ? 'e' : '') : I.svake ? 'vinduer uten planker' : `alt sperret – holder fienden ute ca. ${Math.round(I.forsinkelse)} min`}</small>`
      + `<button type="button" data-et="hv:vis" id="hvvis">${S.visVern ? 'Skjul vern' : 'Vis vern'}</button></div>`;
    if (o) html += `<div class="rad"><b>Vårt: ${esc(OT.BRUK[o.bruk].navn)}</b><small>${o.senger || 0} senger · ${String(o.lager || 0).replace('.', ',')} m³ lager</small>`
      + Object.keys(OT.BRUK).filter(b => b !== o.bruk).map(b => `<button type="button" data-et="ot:${b}">${esc(OT.BRUK[b].navn)}</button>`).join('') + '<button type="button" data-et="ot:slipp">Gi opp huset</button></div>';
    else if (avst <= OT.REGLER.maksAvstand) html += `<div class="rad"><small>Ta over huset som:</small>` + Object.keys(OT.BRUK).map(b => `<button type="button" data-et="ot:${b}" id="ot${b}" title="${esc(OT.BRUK[b].tekst)}">${esc(OT.BRUK[b].navn)}</button>`).join('') + '</div>';
    return html;
  }
  function klikk(hva) {
    if (hva === 'hv:vis') { S.visVern = !S.visVern; tegnPå(); visRad(); return; }
    const m = /^ot:(\w+)$/.exec(hva || ''); if (!m || !radHus) return;
    kjør(m[1] === 'slipp' ? { type: 'husOvertak', hus: radHus.i, slipp: true } : { type: 'husOvertak', hus: radHus.i, bruk: m[1] }); visRad();
  }
  const visRad = () => { const p = P2(); if (p && p.visVelger) try { p.visVelger(); } catch (e) { /* uten velger */ } };
  (window.PLAN2D_RAD = window.PLAN2D_RAD || []).push((h, n) => rad(h, n));
  (window.PLAN2D_KLIKK = window.PLAN2D_KLIKK || []).push(hva => klikk(hva));
  // huspanelet: «Ta over huset» åpner plantegningen med valgene (eller sier at huset er vårt)
  const vb0 = typeof window.visByggVed === 'function' ? window.visByggVed : null;
  if (vb0) window.visByggVed = async function (X, Y) { const ok = await vb0.apply(this, arguments); if (ok) { try { await husKnapp(X, Y); } catch (e) { console.warn('ta over:', e); } } return ok; };
  async function husKnapp(X, Y) {
    const H0 = document.getElementById('handl'); if (!H0 || typeof finnBygg !== 'function' || !PT) return; const b = await finnBygg(X, Y); if (!b || !b.o || !b.o.e || b.o.e.i == null) return;
    const i = b.o.e.i, o = OL.hus[i], l = leirXY(), Pv = PT.åpent(b.P), c = PT.ramme(Pv), d = l ? Math.hypot(c[0] - l.x, c[1] - l.y) : Infinity; const gl = document.getElementById('otrad'); if (gl) gl.remove();
    if (!o && d > OT.REGLER.maksAvstand) return;
    const r = document.createElement('div'); r.id = 'otrad'; r.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;flex:1 0 100%;margin:4px 0 0';
    if (o) { const sm = document.createElement('small'); sm.style.cssText = 'flex:1 0 100%;color:#b9ab8a'; sm.textContent = `Vårt: ${OT.BRUK[o.bruk].navn} · ${o.senger || 0} senger · ${String(o.lager || 0).replace('.', ',')} m³ lager`; r.append(sm); }
    else { const kn = document.createElement('button'); kn.type = 'button'; kn.id = 'taoverknapp'; kn.textContent = 'Ta over huset'; kn.title = 'Bli en del av leiren: utpost, lager, verksted eller kaserne';
      kn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); if (P2()) P2().seInn({ Pv, e: b.o.e }); }; r.append(kn); }
    H0.append(r);
  }

  // ---------- lagpanelet ----------
  if (typeof KROKER !== 'undefined' && KROKER.lagTekst) KROKER.lagTekst.push(s => { if (!s || !s.hus) return null; const v = s.husVern && nå() - s.husVern.t < 30 ? s.husVern : null;
    return `${s.hus.navn}, ${etgNavn(s.hus.n)}${v ? ' – ' + HV.vernTekst(v) : ''}`; });
  if (typeof KROKER !== 'undefined' && KROKER.lagKnapper) KROKER.lagKnapper.push((s, Hd) => {
    if (!s || s.side !== 'blå' || s.karakter || typeof knapp !== 'function') return;
    if (s.hus) { const H = modellAv(s); const ets = H ? HV.etasjer(H.m) : [];
      if (ets.length > 1) for (const e of ets) { const b = knapp(e.n === -1 ? 'Kjeller' : e.navn && /loft/i.test(e.navn) ? 'Loft' : e.n + '. etg.', e.n === s.hus.n, () => kjør({ type: 'husEtasje', lag: nid(s), n: e.n })); b.dataset.etg = e.n; b.title = 'Flytt laget til ' + (e.navn || etgNavn(e.n)).toLowerCase(); Hd.appendChild(b); } }
    if (s.ingeniør && !s.sti) { let beste = null; const p = P2(); if (p) for (const h of p.HUS.values()) { if (!h.Pv) continue; const H = fraKart(h); if (!H) continue; const q = nærKant(H, s.x, s.y); if (q.d <= SPRENG && (!beste || q.d < beste.d)) beste = { H, d: q.d }; }
      if (beste) { const b = knapp('Spreng hull i huset', false, () => kjør({ type: 'husSpreng', lag: nid(s), hus: beste.H.i })); b.id = 'sprenghus'; b.title = 'Sprengstoff: river en lett vegg eller slår et stort hull i en bærende'; Hd.appendChild(b); } }
  });

  lesInn();
  Object.assign(api, { aktiv, husVed, slåOpp, settHus, vernFor, smellVed, plasser, inntakSteg, taOver, kjør, registrer, sum, overtatt: () => OL, lesInn, lagre, NØKKEL, modellAv, egne, rad, klikk, føre, tegn });
  window.HusvernSpill = api;
})();
