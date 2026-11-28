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
  const S = { fokus: null, etasje: 1, valgt: null, nær: [], sist: null, skanner: false, prøve: new Map(), nr: 0, lukket: null, mer: false, merHus: null };
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
  // (ut8-kr-hus, kritikeren Jonas: «husvinduet viste huset selv når kartet sto på leiren») Husvinduet gjelder bare et hus som er på
  // skjermen: midten av huset innenfor bildet og huset minst så stort som når plantegningen kommer. Et hus i fokus («Se inn») som er
  // flyttet ut av bildet eller blitt for lite, slippes.
  // (Statuslinja øverst og bunnmenyen/kommandolinja nederst dekker kanten av kartet: midten av huset må være i den delen du ser, SKJERM.topp/bunn
  // punkter fra kanten og SKJERM.kant av bredden fra sidene – et hus helt ute i kanten av bildet får ikke vinduet. Claudes forslag.)
  const SKJERM = { topp: 70, bunn: 100, bunnTelefon: 150, kant: .1 };
  function påSkjerm(h) {
    if (typeof kam === 'undefined' || typeof VW === 'undefined') return true;
    const cx = (h.bb[0] + h.bb[2]) / 2, cy = (h.bb[1] + h.bb[3]) / 2, sx = (cx - kam.x) / kam.m + VW / 2, sy = VH / 2 - (cy - kam.y) / kam.m;
    const bunn = VH - (VW <= 700 ? SKJERM.bunnTelefon : SKJERM.bunn);
    return sx >= VW * SKJERM.kant && sx <= VW * (1 - SKJERM.kant) && sy >= SKJERM.topp && sy <= bunn && Math.max(h.bb[2] - h.bb[0], h.bb[3] - h.bb[1]) / kam.m >= R.minPunkter * .8;
  }
  const hoved = () => { const l = S.nær.filter(h => h.klar && h.m);
    if (S.fokus) { const f = l.find(h => h.i === S.fokus.i); if (f && påSkjerm(f)) return f; if (f) { S.fokus = null; S.sist = null; } }
    return l.filter(påSkjerm).sort((a, b) => Math.hypot((a.bb[0] + a.bb[2]) / 2 - kam.x, (a.bb[1] + a.bb[3]) / 2 - kam.y) - Math.hypot((b.bb[0] + b.bb[2]) / 2 - kam.x, (b.bb[1] + b.bb[3]) / 2 - kam.y))[0] || null; };

  // ---------- tegningen ----------
  // fargene fra 2D-kartet (--ink, --ink-dim, panelet, gullet i knappene)
  const F = { gulv: 'rgba(20,17,11,.94)', kant: 'rgba(231,220,195,.25)', bærende: '#e7dcc3', skille: '#b3a789', revet: 'rgba(166,155,130,.85)', dør: '#c9b26a', vindu: '#9db4ba',
    planke: '#a8773d', plankeKant: '#4a3216', møbel: 'rgba(231,220,195,.09)', møbelKant: 'rgba(231,220,195,.38)', trapp: 'rgba(231,220,195,.55)', navn: '#c4b694', valgt: '#f0d79a',
    våt: 'rgba(120,150,165,.13)', kjøkken: 'rgba(200,168,110,.09)', rom: 'rgba(231,220,195,.035)', ødelagt: '#b5543c',
    // loftet (ut8-kr-hus): gulvbord i tre, mørkere der taket er lavt, mønet og knelinjene i gull, takvinduene blå
    loftGulv: 'rgba(92,70,42,.96)', loftBord: 'rgba(40,28,14,.55)', loftLavt: 'rgba(14,11,7,.55)', møne: '#c9b26a', kne: 'rgba(201,178,106,.75)', takvindu: '#9db4ba',
    loftTing: 'rgba(168,126,72,.75)', loftTingKant: 'rgba(240,215,154,.8)', loftNavn: '#ead9ac' };
  // romnavnene (Claudes forslag): rommet minst så stort (punkter, kvadratroten av arealet) og høyt (punkter) på skjermen; minste skrift
  const ROMNAVN = { min: 24, høyde: 13, minSkrift: 10 };
  const KORT = { Kjøkken: 'Kjøk.', Soverom: 'Sov.', Vaskerom: 'Vask', Vindfang: 'Vindf.', Korridor: 'Korr.', Trapperom: 'Trapp', Tilfluktsrom: 'Tilfl.', Dagligstue: 'Stue', Resepsjon: 'Resep.', Venterom: 'Vent' };
  const TING = { flyttekasse: 'kasse', kiste: 'kiste', skrot: 'skrot', hylle: 'hylle', fyrkjele: 'kjele', tønne: 'tønne', køyeseng: 'køye', benk: 'benk' };
  // takhøyden (Claudes forslag): under så mange meter er loftet «lavt» (du må bøye deg) – knelinjene står der
  const LOFT = { lav: 1.5, bord: .6 };
  function tegn(g, vx0, vy1) {
    if (!aktiv()) { if (S.nær.length || velger.classList.contains('på')) { S.nær = []; S.valgt = null; visVelger(); } return; }
    vurderSkann();
    const m = kam.m, sx = x => (x - vx0) / m, sy = y => (vy1 - y) / m;
    // hva som ble tegnet i dette bildet (vakta leser det)
    S.tegnet = [];
    for (const h of S.nær) {
      if (!h.klar || !h.m) continue; const md = h.m, [ox, oy] = h.o, X = p => sx(ox + p[0]), Y = p => sy(oy + p[1]);
      const str = Math.max(h.bb[2] - h.bb[0], h.bb[3] - h.bb[1]) / m; if (str < R.minPunkter * .8) continue;
      const detalj = str >= R.detaljPunkter, n = etasjeFor(h), Fg = PT.figur(md, n);
      S.tegnet.push({ i: h.i, n, vegger: Fg.vegger.length, dører: Fg.åpninger.filter(o => o.type !== 'vindu').length, vinduer: Fg.åpninger.filter(o => o.type === 'vindu').length,
        sperret: Fg.åpninger.filter(o => o.sperre).length, møbler: detalj ? Fg.møbler.length : 0, rom: Fg.rom.length, trapper: Fg.trapper.length, punkter: Math.round(str) });
      const sti = P => { g.beginPath(); P.forEach((p, k) => (k ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p)))); g.closePath(); };
      g.save(); g.lineCap = 'butt'; g.lineJoin = 'miter';
      const etg = PT.etasje(md, n), loft = !!(etg && etg.loft);
      sti(md.P); g.fillStyle = F.gulv; g.fill(); g.strokeStyle = F.kant; g.lineWidth = 1; g.stroke();
      // (ut8-kr-hus) loftet: gulvbord, skråtaket (mønet og der det blir lavt) og takvinduene – før var det en mørk flate
      if (loft) tegnLoft(g, md, X, Y, m, sti);
      else for (const r of Fg.rom) { sti(r.P); g.fillStyle = /bad|vask|dusj|toalett/.test(r.rolle || '') ? F.våt : /kjøkken/.test(r.rolle || '') ? F.kjøkken : F.rom; g.fill(); }
      if (detalj || loft) for (const q of Fg.møbler) { sti(q.P); g.fillStyle = loft ? F.loftTing : F.møbel; g.fill(); g.strokeStyle = q.ødelagt ? F.ødelagt : loft ? F.loftTingKant : F.møbelKant; g.lineWidth = 1; g.stroke();
        // (ut9-maskiner) symbolet for maskintypen (spill/maskiner-visning.js)
        if (window.PLAN2D_MØBEL && !q.ødelagt && !loft) for (const f of PLAN2D_MØBEL) f(g, q, X, Y); }
      for (const t of Fg.trapper) {
        sti(t.P); g.fillStyle = 'rgba(231,220,195,.07)'; g.fill(); g.strokeStyle = F.trapp; g.lineWidth = 1; g.stroke();
        const vx = -t.uy, vy = t.ux, hl = t.l / 2, hb = t.b / 2; g.beginPath();
        for (let k = 1; k < t.trinn; k++) { const u = -hl + t.l * k / t.trinn; g.moveTo(X([t.x + t.ux * u - vx * hb, t.y + t.uy * u - vy * hb]), Y([t.x + t.ux * u - vx * hb, t.y + t.uy * u - vy * hb])); g.lineTo(X([t.x + t.ux * u + vx * hb, t.y + t.uy * u + vy * hb]), Y([t.x + t.ux * u + vx * hb, t.y + t.uy * u + vy * hb])); }
        g.stroke();
        // pila peker opp trappa
        const a = [t.x - t.ux * hl * .8, t.y - t.uy * hl * .8], b = [t.x + t.ux * hl * .8, t.y + t.uy * hl * .8]; g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b));
        const pa = [b[0] - t.ux * .35 - vx * .2, b[1] - t.uy * .35 - vy * .2], pb = [b[0] - t.ux * .35 + vx * .2, b[1] - t.uy * .35 + vy * .2]; g.moveTo(X(pa), Y(pa)); g.lineTo(X(b), Y(b)); g.lineTo(X(pb), Y(pb));
        g.strokeStyle = F.valgt; g.lineWidth = 1.2; g.stroke();
        // «opp»/«ned» ved foten av pila (der du går på)
        if (detalj) { const f = [a[0] - t.ux * .45, a[1] - t.uy * .45]; g.fillStyle = F.navn; g.font = '11px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.opp ? 'opp' : 'ned', X(f), Y(f)); }
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
        // (ut8-kr-hus, kritikeren: «plantegningen har ingen romnavn») navnet settes når det får plass i rommet på skjermen – med kortere
        // navn (KORT) når det fulle ikke får plass; før krevde vi minst 46 punkter (kvadratroten av arealet), og på telefon kom nesten ingen
        for (const r of Fg.rom) { const bx = Math.sqrt(Math.max(1, r.areal)) / m; if (bx < ROMNAVN.min) continue;
          const xs = r.P.map(X), ys = r.P.map(Y), plass = (Math.max(...xs) - Math.min(...xs)) * .9, høy = Math.max(...ys) - Math.min(...ys); if (høy < ROMNAVN.høyde) continue;
          let navn = loft ? 'Loft' : r.navn, fs = Math.max(ROMNAVN.minSkrift, Math.min(15, bx / 6)); g.font = `${fs}px "Cormorant Garamond", Georgia, serif`;
          while (fs > ROMNAVN.minSkrift && g.measureText(navn).width > plass) { fs--; g.font = `${fs}px "Cormorant Garamond", Georgia, serif`; }
          if (g.measureText(navn).width > plass && KORT[navn]) navn = KORT[navn];
          if (g.measureText(navn).width > plass) continue;
          const c = loft ? loftMidt(md) || [r.x, r.y] : [r.x, r.y], tx = X(c), ty = Y(c);
          g.fillStyle = loft ? F.loftNavn : F.navn; g.fillText(navn, tx, ty); S.tegnet[S.tegnet.length - 1].navn = (S.tegnet[S.tegnet.length - 1].navn || 0) + 1;
          const under = loft ? loftTekst(h, md, n) : bx > 80 && høy > fs * 2.4 ? String(Math.round(r.areal)).replace('.', ',') + ' m²' : '';
          if (under) { g.font = `${Math.max(10, fs - 3)}px "Cormorant Garamond", Georgia, serif`; g.fillStyle = 'rgba(196,182,148,.75)'; if (g.measureText(under).width <= plass) g.fillText(under, tx, ty + fs); } }
        // tingene på loftet (kasser, kiste, skrot, hylle) får navn når de er store nok på skjermen
        if (loft) { g.font = '10px "Cormorant Garamond", Georgia, serif'; g.fillStyle = F.loftNavn;
          for (const q of Fg.møbler) { const xs = q.P.map(X), w = Math.max(...xs) - Math.min(...xs), t = TING[q.type] || ''; if (!t || g.measureText(t).width > w + 4) continue;
            let cx = 0, cy = 0; for (const p of q.P) { cx += X(p); cy += Y(p); } g.fillText(t, cx / q.P.length, cy / q.P.length); } } }
      g.restore();
    }
  }
  // Loftet sett ovenfra: gulvbord langs huset, mørkere der taket er lavere enn LOFT.lav (utenfor knelinjene), mønet som en gull strek
  // (valmtak: mønet er kortere, og gratene går ut i hjørnene), knelinjene stiplet og takvinduene (m.tak.vinduer) som blå ruter.
  // Aksene: u langs huset, v på tvers (m.akse fra Bygning); et punkt (u, v) er u·(ux, uy) + v·(vx, vy) i husets meter.
  function tegnLoft(g, md, X, Y, m, sti) {
    const A = md.akse, tak = md.tak || {}; if (!A) return;
    const P = (u, v) => [u * A.ux + v * A.vx, u * A.uy + v * A.vy], lin = (a, b) => { g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); };
    const lu = A.u1 - A.u0, lv = A.v1 - A.v0, um = (A.u0 + A.u1) / 2, vm = (A.v0 + A.v1) / 2, møne = Math.max(tak.møne || 0, .1);
    const valm = tak.form === 'valm', rl = valm ? Math.max(0, lu / 2 - lv / 2) : lu / 2, d = Math.max(0, lv / 2 * (1 - LOFT.lav / møne));
    g.save(); sti(md.P); g.clip();
    g.fillStyle = F.loftLavt; g.fill();
    // der du kan stå oppreist: gulvbordene
    const ru = valm ? rl + d : lu / 2 + 1; g.beginPath(); [P(um - ru, vm - d), P(um + ru, vm - d), P(um + ru, vm + d), P(um - ru, vm + d)].forEach((p, k) => (k ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p)))); g.closePath();
    g.fillStyle = F.loftGulv; g.fill();
    if (LOFT.bord / m >= 4) { g.strokeStyle = F.loftBord; g.lineWidth = 1; g.beginPath(); for (let v = A.v0 + LOFT.bord; v < A.v1; v += LOFT.bord) lin(P(A.u0 - 1, v), P(A.u1 + 1, v)); g.stroke(); }
    // knelinjene (stiplet) og mønet
    g.setLineDash([5, 4]); g.strokeStyle = F.kne; g.lineWidth = 1; g.beginPath(); lin(P(um - ru, vm - d), P(um + ru, vm - d)); lin(P(um - ru, vm + d), P(um + ru, vm + d));
    if (valm) { lin(P(um - ru, vm - d), P(um - ru, vm + d)); lin(P(um + ru, vm - d), P(um + ru, vm + d)); } g.stroke(); g.setLineDash([]);
    g.strokeStyle = F.møne; g.lineWidth = 2; g.beginPath(); lin(P(um - rl, vm), P(um + rl, vm));
    if (valm) { g.lineWidth = 1.2; for (const [su, sv] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) lin(P(um + su * rl, vm), P(um + su * lu / 2, vm + sv * lv / 2)); } g.stroke();
    // sperrene (takbjelkene) på tvers, hver 1,2 m – svakt
    if (1.2 / m >= 10) { g.strokeStyle = 'rgba(201,178,106,.18)'; g.lineWidth = 1; g.beginPath(); for (let u = A.u0 + .6; u < A.u1; u += 1.2) lin(P(u, A.v0), P(u, A.v1)); g.stroke(); }
    for (const w of tak.vinduer || []) { if (w.tilstand === 'revet') continue; const hb = (w.b || .8) / 2, hl = (w.l || 1) / 2;
      g.beginPath(); [P(w.u - hl, w.v - hb), P(w.u + hl, w.v - hb), P(w.u + hl, w.v + hb), P(w.u - hl, w.v + hb)].forEach((p, k) => (k ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p)))); g.closePath();
      g.fillStyle = 'rgba(157,180,186,.25)'; g.fill(); g.strokeStyle = F.takvindu; g.lineWidth = 1.2; g.stroke(); }
    g.restore();
  }
  // der «Loft» står: midt i loftet, litt til siden for mønet (inne der du kan stå oppreist)
  function loftMidt(md) { const A = md.akse; if (!A) return null; const um = (A.u0 + A.u1) / 2, lv = A.v1 - A.v0, møne = Math.max((md.tak && md.tak.møne) || 0, .1),
    d = Math.max(0, lv / 2 * (1 - LOFT.lav / møne)), v = (A.v0 + A.v1) / 2 - Math.min(d * .55, lv * .2); return [um * A.ux + v * A.vx, um * A.uy + v * A.vy]; }
  // linja under «Loft»: gjennomsøkt eller hva som ligger der
  function loftTekst(h, md, n) {
    const E2 = window.Etasjer2D; if (E2 && E2.erLett && E2.erLett(h, n)) return E2.rest && E2.rest(h, n) ? 'noe ligger igjen' : 'gjennomsøkt';
    const et = PT.etasje(md, n), k = et ? et.møbler.filter(q => q.tilstand !== 'revet').length : 0; return k ? `${k} ting · ikke gjennomsøkt` : 'ikke gjennomsøkt';
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
#plan2d.på{ display:block; max-height:calc(100% - var(--topp,58px) - 40px); overflow-y:auto; } #plan2d .rad{ display:flex; flex-wrap:wrap; align-items:center; gap:4px; } #plan2d b{ font-weight:600; margin-right:6px; }
#plan2d .hode .fyll{ flex:1 1 0; min-width:0; } #plan2d button.x{ min-width:34px; padding:0; font-size:19px; line-height:1; } #plan2d button.mer{ display:none; }
#plan2d button{ min-height:32px; min-width:34px; padding:2px 10px; background:#2a2318; border:1px solid var(--rule,#5b5140); color:var(--ink,#e7dcc3); font:inherit; font-size:14px; cursor:pointer; }
#plan2d button.valgt{ border-color:#c9b26a; color:#f0d79a; } #plan2d button.grå{ opacity:.55; } #plan2d small{ color:var(--ink-dim,#a69b82); }
#plan2d .valg{ margin-top:5px; padding-top:5px; border-top:1px solid var(--rule,#5b5140); }
@media (max-width:700px){ #plan2d{ left:12px; right:76px; top:auto; bottom:calc(150px + env(safe-area-inset-bottom,0px)); transform:none; max-width:none; font-size:13px; padding:5px 8px; }
  #plan2d button{ font-size:13px; padding:2px 8px; } #plan2d .rad small{ display:none; }
  /* (ut8-kr-hus) telefon: én rad med knapper; resten bak «Mer» (det du har valgt, og det karakteren gjør nå, vises alltid) */
  #plan2d.på{ max-height:46vh; } #plan2d button.mer{ display:inline-block; } #plan2d.ingenmer button.mer{ display:none; } #plan2d:not(.mer) > .rad:not(.hode):not(.viktig){ display:none; } }`;
  document.head.appendChild(css);
  const velger = document.createElement('div'); velger.id = 'plan2d'; velger.setAttribute('role', 'group'); velger.setAttribute('aria-label', 'Plantegning');
  (document.body || document.documentElement).appendChild(velger);
  const NAVN = { hus: 'Bolig', hytte: 'Hytte', leil: 'Leilighetsbygg', uthus: 'Uthus', låve: 'Låve', kirke: 'Kirke', butikk: 'Butikk', industri: 'Industribygg', lager: 'Lager',
    kontor: 'Kontorbygg', skole: 'Skole', sykehus: 'Sykehus', sykehjem: 'Sykehjem', legevakt: 'Legevakt', hangar: 'Hangar', terminal: 'Terminal' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tall = v => String(v).replace('.', ',');
  let sistHtml = '';
  // ---------- (ut8-kr-hus) husvinduet: lukkeknapp, «Mer» på telefon og ett overlegg om gangen ----------
  // Kritikeren Jonas (telefon): «Husvinduet blir stående over halve skjermen så lenge karakteren er i huset – i to spilldøgn, under
  // morgenmøtet, angrepspanelet og Folk – uten ×.» Nå:
  //  - × lukker vinduet for huset (S.lukket = husets nummer). Det kommer tilbake når du trykker på huset i plantegningen, trykker «Se inn»,
  //    eller zoomer ut og inn igjen. Et annet hus på skjermen får vinduet som før.
  //  - Vinduet gjelder bare et hus som er på skjermen (påSkjerm over); flytter du kartet bort eller zoomer ut, forsvinner det.
  //  - Åpner du et panel selv (Leir, Folk, Tropper, Selskap, Deg …), lukkes vinduet. Kort som venter på svar (morgenmøtet, hendelser),
  //    angrepsbanneret og – på telefon – lagpanelet skjuler det så lenge de står oppe.
  //  - På telefon: én rad med knapper (navnet, etasjene, «Mer», ×); resten bak «Mer». Det du har valgt (en dør, en vegg) og det
  //    karakteren gjør nå (går, leter, «Gå til loftet»), vises alltid.
  // Panelregelen gjelder spilleren; i testene (navigator.webdriver) som før til Plantegning2D.test = true. Tallene er Claudes forslag.
  const VINDU = { ekte: 1500, sjekk: 250 };
  // panelene som lukker vinduet når du åpner dem, og de som bare skjuler det mens de står oppe
  const LUKKER = ['leirmeny', 'folkmeny', 'samfunnmeny', 'region', 'krig', 'karakterark', 'verdenpanel', 'sjopanel', 'krigpanel', 'sekk', 'tropppanel', 'stridpanel',
    'forklaring', 'evpanel', 'lagmeny', 'degmeny', 'kommer', 'mkommer', 'flismerliste', 'marsjvalg', 'selskap', 'funnpanel', 'lapppanel', 'logghel', 'hjelp'];
  const SKJULER = ['alarm', 'morgenkort', 'hendelse', 'samfunnkort', 'formkort', 'krigkort', 'kontrollrom', 'oppstart', 'personkort', 'gaavalg'];
  const SKJULER_TELEFON = ['panel', 'flytgruppe'];
  const telefon = () => (window.matchMedia ? matchMedia('(max-width:700px)').matches : (typeof VW !== 'undefined' && VW <= 700));
  const regel = () => !navigator.webdriver || (window.Plantegning2D && Plantegning2D.test === true);
  const vises = id => { const e = document.getElementById(id); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  let sistEkte = 0; for (const t of ['pointerdown', 'keydown', 'click']) window.addEventListener(t, e => { if (e.isTrusted) sistEkte = performance.now(); }, true);
  let åpneFør = new Set(), andreSist = { t: -1e9, lukker: [], skjuler: [] };
  // de andre overleggene som står oppe nå (målt høyst hvert VINDU.sjekk ms)
  function andre() { const nå = performance.now(); if (nå - andreSist.t < VINDU.sjekk) return andreSist;
    const SL = window.Skjermlag, skj = SKJULER.concat(SL ? SL.KORT.concat(SL.ØVERST) : []).concat(telefon() ? SKJULER_TELEFON : []);
    andreSist = { t: nå, lukker: LUKKER.filter(vises), skjuler: skj.filter(vises) }; return andreSist; }
  // radene på telefon: de som alltid vises (valgt dør/vegg/rom, karakteren går eller leter, en knapp i etasjeraden)
  function merk() {
    let skjult = 0;
    for (const r of velger.children) { if (!r.classList.contains('rad') || r.classList.contains('hode')) continue;
      const t = r.textContent.trim(), viktig = !!r.querySelector('[data-h="avbryt"], [data-he="avbryt"], [data-he="likevel"]') || (r.id === 'etasjerad' && (/^(Går|Leter)/.test(t) || (/^Du er/.test(t) && !!r.querySelector('button'))));
      r.classList.toggle('viktig', viktig); if (!viktig) skjult++; }
    velger.classList.toggle('ingenmer', !skjult);
  }
  function skjul() { if (velger.classList.contains('på')) { velger.classList.remove('på'); sistHtml = ''; } }
  function visVelger() {
    const h0 = aktiv() && !(typeof på3d !== 'undefined' && på3d) ? hoved() : null;
    if (!aktiv()) { S.lukket = null; S.mer = false; }
    if (!h0) { åpneFør = new Set(); return skjul(); }
    if (S.merHus !== h0.i) { S.merHus = h0.i; S.mer = false; }
    if (S.lukket === h0.i) return skjul();
    if (regel()) { const A = andre(), nye = A.lukker.filter(id => !åpneFør.has(id)); åpneFør = new Set(A.lukker);
      // et panel du åpnet selv (trykk eller tast siste VINDU.ekte ms): vinduet lukkes for dette huset
      if (nye.length && velger.classList.contains('på') && performance.now() - sistEkte < VINDU.ekte) { lukk(h0); return skjul(); }
      if (A.lukker.length || A.skjuler.length) return skjul(); }
    const h = h0, n = etasjeFor(h), et = PT.etasje(h.m, n), valg = PT.etasjeValg(h.m);
    let html = `<div class="rad hode"><b>${esc(NAVN[h.info.kl] || 'Bygg')}</b>` + valg.map(v => `<button type="button" data-n="${v.n}" class="${v.n === n ? 'valgt' : ''}${v.stengt ? ' grå' : ''}" title="${esc(v.navn)}${v.stengt ? ' (stengt)' : ''}">${esc(v.kort)}</button>`).join('')
      + `<span class="fyll"></span><button type="button" data-h="mer" class="mer" aria-expanded="${S.mer ? 'true' : 'false'}" title="Flere valg for huset">${S.mer ? 'Mindre' : 'Mer'}</button>`
      + '<button type="button" data-h="lukk" class="x" id="plan2dlukk" title="Lukk husvinduet (trykk på huset for å åpne det igjen)" aria-label="Lukk husvinduet">×</button></div>';
    const o = S.valgt && S.valgt.i === h.i ? PT.figur(h.m, S.valgt.e).åpninger.find(q => q.id === S.valgt.id) : null;
    if (o) {
      const tre = PT.planker(o), navn = PT.åpNavn(o) + (et ? ' i ' + et.navn.toLowerCase() : '');
      html += `<div class="rad valg"><span>${esc(navn)} · ${tall(o.b.toFixed(1))} m${o.sperre === 'planker' ? ' · barrikadert' : o.sperre ? ' · tettet' : ''}</span>`
        + (o.sperre === 'planker' ? '<button type="button" data-h="åpne" id="plan2dåpne">Fjern plankene</button>' : o.sperre ? '' : `<button type="button" data-h="barrikader" id="plan2dbarr">Barrikader (${tall(tre)} m³ tre)</button>`)
        + (window.HusEndring ? HusEndring.knapper(h, n, o) : '') + '<button type="button" data-h="avbryt">Avbryt</button></div>';
    } else html += (window.HusEndring && HusEndring.rad(h, n, et)) || `<div class="rad"><small>${esc(et ? et.navn : '')}${et && et.stengt ? ' (stengt)' : ''} · trykk på et vindu eller en dør for å barrikadere</small></div>`;
    // (B2, ut3-etasjer) flere linjer fra andre moduler: window.PLAN2D_RAD = [(h, n) => html], knapper med data-et går til PLAN2D_KLIKK
    for (const f of window.PLAN2D_RAD || []) { try { html += f(h, n) || ''; } catch (e) { console.warn('plantegning:', e); } }
    velger.classList.add('på'); velger.classList.toggle('mer', !!S.mer); velger.dataset.hus = h.i;
    if (html === sistHtml || (typeof pekerNede === 'function' && pekerNede(velger))) return;
    sistHtml = html; velger.innerHTML = html; merk();
  }
  // lukk vinduet for huset h (×, eller et panel du åpnet)
  function lukk(h) { if (h) S.lukket = h.i; S.fokus = null; S.valgt = null; S.sist = null; S.mer = false;
    if (window.HusEndring && HusEndring.velg) try { HusEndring.velg(null); } catch (e) { /* uten valg */ } skjul(); tegnPå(); }
  // åpne det igjen (trykk på huset, «Se inn»)
  function åpneIgjen() { S.lukket = null; sistHtml = ''; }
  setInterval(() => { if (S.nær.length || velger.classList.contains('på')) visVelger(); }, VINDU.sjekk * 2);
  velger.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return; ev.preventDefault(); ev.stopPropagation();
    if (b.dataset.et !== undefined) { for (const f of window.PLAN2D_KLIKK || []) try { f(b.dataset.et); } catch (e) { console.warn('plantegning:', e); } }
    else if (b.dataset.n !== undefined) { S.etasje = +b.dataset.n; S.valgt = null; }
    else if (b.dataset.h === 'lukk') { lukk(hoved()); return; }
    else if (b.dataset.h === 'mer') S.mer = !S.mer;
    else if (b.dataset.h === 'avbryt') S.valgt = null;
    else if (b.dataset.h === 'barrikader' || b.dataset.h === 'åpne') { const v = S.valgt; if (v) handling({ hus: v.i, e: v.e, del: 'åpning', id: v.id, gjør: b.dataset.h }); }
    sistHtml = ''; visVelger(); tegnPå();
  });

  // ---------- trykk i plantegningen ----------
  if (typeof KROKER !== 'undefined' && KROKER.trykk) KROKER.trykk.push((X, Y) => {
    if (!aktiv() || !BG()) return false;
    // (ut8-kr-hus) et trykk på huset du lukket vinduet for, åpner det igjen
    if (S.lukket !== null && S.lukket !== undefined) { const h = S.nær.find(q => q.i === S.lukket && q.klar);
      if (h && X >= h.bb[0] - 1 && X <= h.bb[2] + 1 && Y >= h.bb[1] - 1 && Y <= h.bb[3] + 1) { åpneIgjen(); visVelger(); tegnPå(); return true; } }
    for (const h of S.nær) {
      if (!h.klar || !h.m) continue; const x = X - h.o[0], y = Y - h.o[1];
      if (X < h.bb[0] - 2 || X > h.bb[2] + 2 || Y < h.bb[1] - 2 || Y > h.bb[3] + 2) continue;
      // åpningene kan velges når huset er stort nok på skjermen (ellers går trykket til huspanelet som før)
      if (Math.max(h.bb[2] - h.bb[0], h.bb[3] - h.bb[1]) / kam.m < R.detaljPunkter * .8) continue;
      const n = etasjeFor(h), q = PT.finnÅpning(PT.figur(h.m, n), x, y, Math.min(R.treff.maks, Math.max(R.treff.meter, R.treff.punkter * kam.m)));
      if (q) { S.valgt = { i: h.i, e: n, id: q.id }; sistHtml = ''; visVelger(); tegnPå(); return true; }
    }
    if (S.valgt) { S.valgt = null; sistHtml = ''; visVelger(); tegnPå(); }
    return false;
  });

  // ---------- handlingen: kommandoen «husEndre» ----------
  const leiren = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  function åpningAv(h, d) { return h && h.m ? PT.figur(h.m, d.e).åpninger.find(q => q.id === d.id) || null : null; }
  function sjekk(k) {
    // (B3) riving, nye åpninger, bjelker, søyler, tetting og «Riv hele huset»: spill/husendring-visning.js
    if (window.HusEndring && HusEndring.eier(k)) return HusEndring.sjekk(k);
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
    if (window.HusEndring && HusEndring.eier(k)) return HusEndring.utfør(k);
    const h = HUS.get(k.hus), o = åpningAv(h, k), L = leiren(), d = { e: k.e, del: k.del, id: k.id, gjør: k.gjør }, svar = BG().vurder(h.m, d);
    let tre = 0;
    if (k.gjør === 'barrikader') { tre = PT.planker(o); L.lager.tre = Math.round((L.lager.tre - tre) * 100) / 100; }
    else { tre = PT.planker(o) * .5; if (L && L.lager) { if (window.Leir && Leir.leggInn) Leir.leggInn(L, 'tre', tre); else L.lager.tre = Math.round(((L.lager.tre || 0) + tre) * 100) / 100; } }
    PT.leggTil(LOGG, h.i, d); PT.husKart(LOGG, h.i, h.e, h.tett, h.Pv); oppdater(h); lagre(); tegnPå(); try { planker3d(); } catch (e) { console.warn('planker i 3D:', e); }
    const navn = PT.åpNavn(o).toLowerCase();
    return { ok: true, tekst: k.gjør === 'barrikader' ? `Planker over ${navn === 'vindu' ? 'vinduet' : 'døra'} (${tall(tre)} m³ tre fra lageret).` : `Plankene er tatt ned (${tall(Math.round(tre * 100) / 100)} m³ tre tilbake).`, tre, svar };
  }
  function registrer() {
    const K = window.Kommando; if (!K) return false; if (K.finnes('husEndre')) return true;
    K.registrer('husEndre', { leir: true, meld: true, sjekk: k => sjekk(k), utfør: k => utfør(k), beskriv: k => (window.HusEndring && HusEndring.eier(k) ? HusEndring.beskriv(k) : k.gjør === 'barrikader' ? 'barrikaderer en åpning i et hus' : 'tar ned planker i et hus') });
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
    const Pv = b.Pv, e = b.e; S.fokus = { i: e.i, Pv, e, tett: b.tett || 0 }; S.etasje = 1; S.valgt = null; S.sist = null; åpneIgjen();
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
    rad.append(kn);
    // hvor mange av ytterdørene og vinduene i 1. etasje som er barrikadert (når modellen finnes)
    const hh = HUS.get(b.o.e.i), F1 = hh && hh.m ? PT.figur(hh.m, 1) : null;
    if (F1) { const ute = F1.åpninger.filter(o => o.ytter && o.tilstand !== 'revet'), sp = ute.filter(o => o.sperre).length;
      if (sp) { const sm = document.createElement('small'); sm.style.cssText = 'flex:1 0 100%;color:#b9ab8a'; sm.textContent = `Barrikadert: ${sp} av ${ute.length} vinduer og ytterdører i 1. etasje.`; rad.append(sm); } }
    H.append(rad);
  }
  const vb0 = typeof window.visByggVed === 'function' ? window.visByggVed : null;
  if (vb0) window.visByggVed = async function (X, Y) { const ok = await vb0.apply(this, arguments); if (ok) { try { await seInnKnapp(X, Y); } catch (e) { console.warn('se inn:', e); } } return ok; };

  // ---------- prøvehus (vakta; testsiden har ingen husdata) ----------
  function prøvehus(Pv, e) { const P = PT.arealS(Pv) < 0 ? Pv.slice().reverse() : Pv.slice(); S.prøve.set(e.i, { Pv: P, e }); S.sist = null; return e.i; }
  function fjernPrøve(i) { S.prøve.delete(i); HUS.delete(i); if (S.fokus && S.fokus.i === i) S.fokus = null; S.nær = S.nær.filter(h => h.i !== i); S.sist = null; tegnPå(); }

  // ---------- planker i 3D ----------
  // Barrikaderte vinduer og dører i husene i 3D-utsnittet (hus3d legger P.bygg og P.dør på omrisset): tre planker på skrå utenpå
  // åpningen, ett instansnett for alle. Bare hus med endringer i loggen, så 3D blir ikke tregere ellers. Gulvet i 1. etasje = døras
  // underkant fra hus3d (interior3d legger gulvet like over).
  let PLANK = null;
  function fjernPlanker() { if (!PLANK) return; if (PLANK.parent) PLANK.parent.remove(PLANK); PLANK.geometry.dispose(); PLANK.material.dispose(); PLANK = null; }
  function planker3d(u0, R0) {
    const R3x = R0 || (typeof R3 !== 'undefined' ? R3 : null), u = u0 || (R3x && R3x.ut); fjernPlanker();
    if (!R3x || !R3x.scene || !u || !u.hus || !u.hus.omriss || typeof THREE === 'undefined' || !BG()) return 0;
    const stk = [];
    for (const P of u.hus.omriss) {
      if (!P.bygg || !P.dør || !PT.endringer(LOGG, P.bygg.i).length) continue; const i = P.bygg.i;
      let h = HUS.get(i); if (!h) { const k = LOGG.kart && LOGG.kart[i]; if (!k) continue; h = nyttHus(k.P, k.e, k.tett); }
      const m = modell(h); if (!m) continue; const z0 = P.dør.z0 + .05;
      for (const e of m.etasjer) for (const o of e.åpninger) {
        if (o.sperre !== 'planker' || o.tilstand === 'revet') continue; const w = e.vegger[o.vegg]; if (!w) continue;
        const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, nx = uy, ny = -ux, t = (w.tykk || .2) / 2 + .05;
        const x = h.o[0] + w.a[0] + ux * o.t + nx * t - u.cx, y = h.o[1] + w.a[1] + uy * o.t + ny * t - u.cy, zc = z0 + e.z + (o.ned || 0) + o.h / 2;
        for (const [dz, a] of [[-o.h / 3.4, .12], [0, -.16], [o.h / 3.4, .1]]) stk.push({ x, y, z: zc + dz, ux, uy, nx, ny, len: o.b + .3, a });
      }
    }
    if (!stk.length) return 0;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x8a6438 }), stk.length);
    const M = new THREE.Matrix4(), A = new THREE.Vector3(), N = new THREE.Vector3(), H = new THREE.Vector3();
    stk.forEach((q, k) => { const c = Math.cos(q.a), s = Math.sin(q.a); A.set(q.ux * c * q.len, q.uy * c * q.len, s * q.len); N.set(q.nx * .035, q.ny * .035, 0); H.set(-q.ux * s * .17, -q.uy * s * .17, c * .17);
      M.makeBasis(A, N, H); M.setPosition(q.x, q.y, q.z); mesh.setMatrixAt(k, M); });
    mesh.instanceMatrix.needsUpdate = true; mesh.userData.kilde = 'plantegning-visning.js'; R3x.scene.add(mesh); PLANK = mesh; return stk.length;
  }
  if (typeof KROKER !== 'undefined' && KROKER.sett3d) KROKER.sett3d.push((u, R) => { try { planker3d(u, R); } catch (e) { console.warn('planker i 3D:', e); } });
  // etasjevelgeren hører til kartet: skjult i 3D (tegnekroken kjøres ikke der)
  setInterval(() => { if (velger.classList.contains('på') && typeof på3d !== 'undefined' && på3d) visVelger(); }, 1000);

  // nærmere zoom når en plantegning vises (zoom() i index.html leser window.MIN_ZOOM_M)
  try { Object.defineProperty(window, 'MIN_ZOOM_M', { configurable: true, get: () => (aktiv() && (S.fokus || S.nær.some(h => h.klar)) ? R.minZoom : .1) }); } catch (e) { /* finnes */ }

  window.Plantegning2D = { test: false, S, HUS, lukk: () => lukk(hoved()), åpneIgjen, påSkjerm, VINDU, hus: i => HUS.get(i) || null, modell: i => modell(HUS.get(i)), prøvehus, fjernPrøve, seInn, endre, handling, sjekk, registrer,
    logg: () => LOGG, lagre, lesInn, oppdater, planker3d, planker: () => (PLANK ? PLANK.count : 0), aktiv, visVelger, nyttHus, NØKKEL, skannNå: () => { S.sist = null; tegnPå(); } };
})();
