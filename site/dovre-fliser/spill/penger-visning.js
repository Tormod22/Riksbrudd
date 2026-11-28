/* PENGER INN (runde 6, 19. nov – kritikken: «økonomien knekker en ny spiller: 40 mill., spillets eget råd og 500 l diesel, og kassa var
 * på 1,7 mill. dag 2 og 674 000 kr dag 3, uten inntekt i sikte» og «én på Hogst i to døgn, Tre: 0 m³»).
 * Inntektene fantes (oppdrag, salg av materialer, skatt fra tettsteder, røverbytte), men en ny spiller så dem ikke, og hogsten gjorde
 * ingenting før noen hadde valgt et hogstfelt i kartet. Denne fila:
 *  - «Penger inn» øverst i fanen Lager i Leir-menyen: kassa, hva som kom inn og gikk ut siste døgn, og hver inntekt med tall og knapp
 *    (oppdragene, salg, hogst, tettsteder, røvere);
 *  - én beskjed i loggen når et nytt spill starter, og en varselbrikke når kassa blir lav, som sier hvor pengene kommer fra;
 *  - HOGSTLAGET VELGER SELV: står noen på «Hogst» og det ikke finnes noe hogstfelt, finner de nærmeste skog innen 1,5 km fra leiren og
 *    begynner der (spilleren kan fortsatt velge selv med Leir → Lager → «Hogst …»).
 * Reglene øverst er uten DOM (Node: require('./penger-visning'); nettleser: globalThis.Penger), visningen nederst (window.PengerSpill).
 * Alle tallene er Claudes forslag. I testene (navigator.webdriver) skjer ingenting av seg selv: PengerSpill.test = true slår det på.
 */
(function (rot) {
  'use strict';
  // Claudes forslag
  const REGLER = {
    hogst: { radius: 35, ringer: [70, 140, 220, 320, 450, 600, 800, 1050, 1500], vinkler: 12, godSkog: .45, minSkog: .2, hverSek: 20 },
    lavKassa: .25,        // varselbrikken «Kassa er lav» når kassa er under denne delen av det spillet startet med …
    lavKassaKr: 6e6,      // … eller under dette beløpet
  };
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retning = (dx, dy) => RETN[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  // Stedene hogstlaget prøver, nærmest leiren først: ringer rundt leiren, `vinkler` punkter i hver (forskjøvet litt per ring)
  function kandidater(leir, R = REGLER.hogst) {
    const ut = [];
    R.ringer.forEach((r, i) => { for (let k = 0; k < R.vinkler; k++) { const v = (k + (i % 2) * .5) / R.vinkler * 2 * Math.PI; ut.push({ x: Math.round(leir.x + Math.cos(v) * r), y: Math.round(leir.y + Math.sin(v) * r), r, ring: i }); } });
    return ut;
  }
  // Velg feltet: den første ringen med et punkt over godSkog gir det beste punktet der; ellers det beste over minSkog i alle ringene.
  // prøvd: [{ x, y, ring, skog }] i rekkefølgen fra kandidater(). Gir et av punktene eller null.
  function velgFelt(prøvd, R = REGLER.hogst) {
    const ringer = [...new Set(prøvd.map(p => p.ring))].sort((a, b) => a - b);
    for (const i of ringer) { const iRing = prøvd.filter(p => p.ring === i && p.skog >= R.godSkog).sort((a, b) => b.skog - a.skog); if (iRing.length) return iRing[0]; }
    const ok = prøvd.filter(p => p.skog >= R.minSkog).sort((a, b) => a.ring - b.ring || b.skog - a.skog); return ok[0] || null;
  }
  // KONTOEN: hva som kom inn og gikk ut, per spilldøgn. K = { dag, inn, ut, før: { inn, ut } | null, kassa }. Gir K.
  function konto(K, kassa, dag) {
    if (!K || typeof K !== 'object') K = { dag, inn: 0, ut: 0, før: null, kassa };
    if (dag !== K.dag) { K.før = dag === K.dag + 1 ? { inn: K.inn, ut: K.ut } : null; K.dag = dag; K.inn = 0; K.ut = 0; }
    const d = kassa - (K.kassa === undefined || K.kassa === null ? kassa : K.kassa);
    if (d > 0) K.inn += d; else if (d < 0) K.ut -= d;
    K.kassa = kassa; return K;
  }
  // Linjene i «Penger inn». T = { oppdrag: [{ navn, meter, retning, kr, tatt }], hogst: { folk, felt: { fram, tre, avst } | null, trePris },
  //   tettsteder: { antall, kr }, lager: { tre, betong, stål } }. kr(v) skriver beløp. Gir [{ id, tekst }].
  function linjer(T, kr) {
    const ut = [], O = T.oppdrag || [];
    if (O.length) { const best = O.slice().sort((a, b) => b.kr - a.kr)[0], nær = O.slice().sort((a, b) => a.meter - b.meter)[0];
      ut.push({ id: 'oppdrag', tekst: `Oppdrag: ${O.length} venter (fanen Mål). Nærmeste: ${nær.navn.toLowerCase()} ${km(nær.meter)} mot ${nær.retning}, gir ${kr(nær.kr)}` + (best !== nær ? `; best betalt: ${kr(best.kr)}` : '') + '. Send et lag dit.' }); }
    else ut.push({ id: 'oppdrag', tekst: 'Oppdrag: ingen akkurat nå – nye kommer snart (fanen Mål).' });
    const H = T.hogst || {};
    if (H.felt) ut.push({ id: 'hogst', tekst: `Hogst: ${H.folk || 0} på hogst, feltet ${km(H.felt.avst)} fra leiren er ${Math.round(H.felt.fram * 100)} % hogd (${tall(H.felt.tre)} m³ tre i alt). Tre trengs til byggene, og det du ikke trenger, kan selges for ca. ${kr(H.trePris)} per m³.` });
    else ut.push({ id: 'hogst', tekst: H.folk ? `Hogst: ${H.folk} på hogst leter etter skog nær leiren.` : 'Hogst: ingen på hogst. Sett noen på «Hogst» under Folk – da hogger de skog nær leiren, gratis tre til byggene eller for salg.' });
    const L = T.lager || {}, har = ['tre', 'betong', 'stål'].filter(k => (L[k] || 0) >= 10);
    const K = T.kjøper, tak = K ? ` Markedet kjøper høyst ${K.tre} m³ tre, ${K.betong} m³ betong og ${K.stål} t stål per døgn.` : '';
    ut.push({ id: 'salg', tekst: (har.length ? `Salg: dere har ${har.map(k => `${tall(L[k])} ${k === 'stål' ? 't stål' : 'm³ ' + k}`).join(' og ')} – «Selg 10» under Materialer gir penger straks.` : 'Salg: tre, betong og stål dere hogger og river selv, kan selges under Materialer («Selg 10»).') + tak });
    const G = T.tettsteder || {};
    // (R3-løkka, kritikken: «‹Regionen ga det siste døgnet: 770 000 kr›, Lager ‹ca. 1,6 mill.›, Krig ‹1,5 mill.›») to tall med navn: anslaget
    // nå (det samme som Region og Krig viser) og det som faktisk kom inn siste døgn (dagboka, kl. 06–06 – det samme som morgenrapporten)
    const rund = v => (rot.Region && Region.krRund ? Region.krRund(v || 0) : v || 0);
    ut.push({ id: 'region', tekst: G.antall ? `Tettsteder: ${G.antall} er deres. Anslag nå: ca. ${kr(rund(G.kr))} i skatt per døgn` + (Number.isFinite(G.siste) ? `; siste døgn kom det inn ${kr(rund(G.siste))}` : '') + ' (Mer → Region).' : 'Tettsteder: flytt et lag inn i et tettsted og hold det – det betaler skatt hver dag (Mer → Region, Krig).' });
    ut.push({ id: 'røvere', tekst: 'Røvere: slår dere tilbake et angrep, tar dere byttet deres.' });
    return ut;
  }
  // ---------- DAGBOKA OVER INN OG UT (R2-løkka 26. nov) ----------
  // Kritikken: «Lager → Penger inn sa ‹I går: 0 kr inn, 8 394 kr ut›, mens morgenmøtet sa ‹+3,9 mill. kr siste døgn› og to kontrakter
  // betalte 6,3 mill.» – to regnestykker (kassa målt hvert halve sekund, og kassa nå mot kassa i går). Nå ÉN kilde: hver krone inn og ut
  // føres i dagboka med hva den gjaldt, per døgn fra kl. 06 til kl. 06 (døgn = Math.floor(tid / 1440) + 1, som morgenmøtet). Penger inn,
  // morgenmøtet og dagboka i Leir viser de samme tallene. B = { d: { [døgn]: { inn, ut, p: { [hva]: kr (+ inn, − ut) } } } }.
  const DØGN_HUSK = 8;
  function før(B, døgn, kr, hva) {
    if (!B || typeof B !== 'object' || !B.d) B = { d: {} }; kr = Math.round(+kr || 0); if (!kr || !Number.isFinite(døgn)) return B;
    const D = B.d[døgn] || (B.d[døgn] = { inn: 0, ut: 0, p: {} }); if (kr > 0) D.inn += kr; else D.ut -= kr;
    const h = String(hva || 'annet'); D.p[h] = (D.p[h] || 0) + kr;
    const nøkler = Object.keys(B.d).map(Number).sort((a, b) => b - a); for (const n of nøkler.slice(DØGN_HUSK)) delete B.d[n];
    return B;
  }
  const døgnSum = (B, døgn) => (B && B.d && B.d[døgn]) || { inn: 0, ut: 0, p: {} };
  // «kontrakter 6,3 mill. kr» … for postene på én side (inn > 0, ut < 0), største først, høyst n.
  // (R3-løkka 26. nov, kritikken: «Penger inn har to linjer som heter ‹annet›») resten slås sammen under REST – aldri samme navn som en post.
  const REST = 'andre poster';
  function poster(D, inn, kr, n = 3) {
    const L = Object.entries((D && D.p) || {}).filter(([, v]) => (inn ? v > 0 : v < 0)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    // færre enn to i resten: vis dem som de er
    const vis = L.length > n + 1 ? L.slice(0, n) : L, rest = L.slice(vis.length);
    const v = vis.map(([k, x]) => `${k} ${kr(Math.abs(x))}`); if (rest.length) v.push(`${REST} ${kr(rest.reduce((s, [, x]) => s + Math.abs(x), 0))}`); return v.join(', ');
  }
  // én setning: «6,3 mill. kr inn (kontrakter 6,3 mill. kr), 1,1 mill. kr ut (lønn …)»
  const døgnTekst = (D, kr) => `${kr(D.inn)} inn` + (D.inn ? ` (${poster(D, true, kr)})` : '') + `, ${kr(D.ut)} ut` + (D.ut ? ` (${poster(D, false, kr)})` : '');
  // HVA PENGENE GJALDT, ut fra fila (og funksjonen) som kalte OppstartSpill.gi/betal. Claudes forslag; ukjent = «annet».
  // (R3-løkka 26. nov, kritikken: «byggingen står under ‹annet›») Årsaken: navnet fra stakken er uten «.js» («leir»), men regelen krevde
  // «leir\.js» – alle kjøp gjennom spill/leir.js (bygg, diesel, materialer, reparasjon) ble «annet». Nå sammenlignes navnet uten «.js», og
  // funksjonsnavnet skiller kjøpene i leir.js. Kategoriene: bygg, materialer, diesel, reparasjoner, salg, lønn, mat, rekruttering,
  // vedlikehold, kontrakter, bøter, skatt, støtte til tettsteder, svartebørs, avtaler, krig og forsvar, kjøretøy og utstyr, morgenmøtet,
  // funn og belønninger, samfunnet, marked og røvere.
  // HVA: [fil (navnet uten .js), inn, ut, [[funksjon, inn, ut], …]] – første fil som passer, så første funksjon som passer
  const HVA = [
    [/^selskap/, 'kontrakter', 'bøter'],
    [/^folk(-visning)?$/, 'folk', 'folk', [[/lønn/i, 'lønn', 'lønn'], [/mat/i, 'mat', 'mat'], [/rekrutt/i, 'rekruttering', 'rekruttering']]],
    [/^penger-visning$/, 'vedlikehold', 'vedlikehold'],
    [/^(leir|leir-visning|lager-visning|leirvirkning|kommando|kommando-visning|anleggsarbeid-visning|anleggsarbeid|taster|byggesett|byggesett-visning|strom-visning)$/, 'bygg', 'bygg',
      [[/drivstoff|diesel/i, 'diesel', 'diesel'], [/materiale/i, 'salg', 'materialer'], [/^selg/i, 'salg', 'salg'], [/reparer/i, 'reparasjoner', 'reparasjoner']]],
    [/^bors/, 'børs og investorer', 'børs og investorer'],
    [/^region/, 'skatt', 'støtte til tettsteder', [[/^kjøp$/, 'svartebørs', 'svartebørs']]],
    [/^krig/, 'krig og forsvar', 'krig og forsvar', [[/avtale|^fred$|vern/i, 'avtaler', 'avtaler']]],
    [/^(spillet-visning|spillet|marked)/, 'marked og røvere'],
    [/^morgen/, 'morgenmøtet'],
    [/^(leting|eventyr|lut|funn)/, 'funn og belønninger'],
    [/^samfunn/, 'samfunnet'],
    [/^(kjoretoy|forsyning|okonomi|enheter|tropper|utstyr|karakter|kjor)/, 'kjøretøy og utstyr'],
    [/^(scenario|strategi|garnison|forsvar|strid|bakkekamp|kontrollrom|eskalering)/, 'krig og forsvar']];
  // stakken -> [{ fil, fn }] for filene i spill/ (Chrome: «at api.vernAvtale (…/spill/krig-visning.js?v=…:425:9)», Firefox: «fred@…/spill/…»)
  function rammer(stakk) {
    return String(stakk || '').split('\n').map(l => { const f = (l.match(/spill\/([\wæøå-]+)\.js/) || [])[1]; if (!f) return null;
      const m = l.match(/at (?:new )?([^\s(]+) \(/) || l.match(/^\s*([^@\s]+)@/); const fn = m ? m[1].split('.').pop().replace(/[<>]/g, '') : '';
      return { fil: f, fn }; }).filter(r => r && !/^(penger-visning|oppstart-visning|flerspiller-visning)$/.test(r.fil) || (r && r.fil === 'penger-visning' && r.fn === 'driftSteg'));
  }
  function hvaFra(stakk, inn) {
    const R = rammer(stakk), først = R[0]; if (!først) return 'annet';
    for (const [re, a, b, fns] of HVA) { if (!re.test(først.fil)) continue;
      // funksjonsnavnene i de første rammene fra samme fil (en bekreftelse kan ligge mellom knappen og kjøpet)
      if (fns) for (const r of R.slice(0, 4)) { if (r.fil !== først.fil) continue; for (const [fre, fa, fb] of fns) if (fre.test(r.fn)) return inn || !fb ? fa : fb; }
      return inn || !b ? a : b; }
    return 'annet';
  }
  const tall = v => (Math.round((v || 0) * 10) / 10).toLocaleString('nb-NO');
  const km = m => (m >= 1000 ? (Math.round(m / 100) / 10).toLocaleString('nb-NO') + ' km' : Math.round(m / 10) * 10 + ' m');
  const api = { REGLER, kandidater, velgFelt, konto, linjer, retning, km, før, døgnSum, poster, døgnTekst, hvaFra, rammer, HVA, REST, DØGN_HUSK };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Penger = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ================= visningen =================
  const P = api, NØKKEL = 'riksbrudd-penger';
  const auto = () => !navigator.webdriver || PS.test === true;
  const Sp = () => (rot.OppstartSpill ? OppstartSpill.tilstand() : null);
  const leirId = () => { const s = Sp(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  const kr = v => (rot.Leir ? Leir.kroner(v) : Math.round(v) + ' kr');
  let S = null, klar = false, leter = false, sistLet = -1e9, sistKonto = 0;
  function lagre() { if (!S) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ ...S, leir: leirId() })); } catch (e) { /* fullt eller sperret */ } }
  function start() {
    const s = Sp(); if (!s || !s.leir) return; let d = null;
    try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    S = d && d.leir === leirId() ? d : { start: s.penger, K: null, meldt: false, lavMeldt: false, hogstMeldt: 0 };
    if (!(S.start > 0)) S.start = s.penger;
    // dagboka: kassa nå er utgangspunktet (det som skjedde før en omlasting, er alt ført)
    S.sist = s.penger; if (!S.B || !S.B.d) S.B = { d: {} }; S.vAkk = +S.vAkk || 0; S.vTid = Number.isFinite(S.vTid) ? S.vTid : tid;
    kobleKasse();
    klar = true;
    // én beskjed når et nytt spill starter (ikke i testene)
    // (bare i et nytt spill – et lagret spill med tettsteder og oppdrag i gang skal ikke høre «ingen fast inntekt»)
    if (!S.meldt && auto() && tid < 180) { S.meldt = true; setTimeout(() => logg(`Pengene: dere har ${kr(s.penger)} og ingen fast inntekt. Penger kommer fra oppdrag (Leir → Mål), salg av tre og materialer dere hogger og river, skatt fra tettsteder dere tar og byttet fra røvere. Leir → Lager → «Penger inn» viser alt.`), 4000); }
    lagre();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- dagboka over inn og ut: hver betaling føres med hva den gjaldt ----------
  const døgnNå = () => Math.floor((typeof tid === 'number' && isFinite(tid) ? tid : 0) / 1440) + 1;
  let hvaNå = null;
  // før(kr, hva): fører en endring i kassa som alt har skjedd (kr > 0 inn, < 0 ut)
  function føring(kr, hva) { if (!S) return; S.B = P.før(S.B, døgnNå(), kr, hva); const s = Sp(); if (s) S.sist = s.penger; lagreSnart(); }
  let lagreT = 0; const lagreSnart = () => { if (!lagreT) lagreT = setTimeout(() => { lagreT = 0; lagre(); }, 1500); };
  // OppstartSpill.gi/betal pakkes inn én gang: beløpet føres når det faktisk går gjennom
  function kobleKasse() {
    const O = rot.OppstartSpill; if (!O || O.gi.dagbok) return;
    const gi0 = O.gi, betal0 = O.betal;
    const gi = function (b) { const før0 = Sp() ? Sp().penger : 0, r = gi0.apply(this, arguments), d = (Sp() ? Sp().penger : 0) - før0; if (d > 0) føring(d, hvaNå || P.hvaFra(new Error().stack, true)); return r; };
    const betal = function (b) { const før0 = Sp() ? Sp().penger : 0, r = betal0.apply(this, arguments), d = (Sp() ? Sp().penger : 0) - før0; if (d < 0) føring(d, hvaNå || P.hvaFra(new Error().stack, false)); return r; };
    gi.dagbok = betal.dagbok = true; O.gi = gi; O.betal = betal;
  }
  // endringer i kassa som ikke gikk gjennom gi/betal (røverbytte, scenarioer …), føres som «annet» når de oppdages
  function avstem() { const s = Sp(); if (!S || !s || !Number.isFinite(s.penger)) return; if (!Number.isFinite(S.sist)) { S.sist = s.penger; return; }
    const d = s.penger - S.sist; if (Math.abs(d) >= 1) føring(d, 'annet'); S.sist = s.penger; }
  // ---------- LØPENDE DRIFT: vedlikehold av byggene (Leir.vedlikehold, Claudes forslag) – trekkes hver spilltime ----------
  const driftAuto = () => !navigator.webdriver || PS.driftTest === true;
  function vedlikehold() {
    const L = rot.LeirSpill && LeirSpill.tilstand(); return L && rot.Leir && Leir.vedlikehold ? Leir.vedlikehold(L) : { perDøgn: 0, antall: 0, bygg: [] };
  }
  function driftSteg() {
    if (!S || !Number.isFinite(tid)) return; if (!Number.isFinite(S.vTid) || tid < S.vTid) S.vTid = tid;
    const dt = tid - S.vTid; if (dt < 60) return; S.vTid = tid; if (!driftAuto()) return;
    const v = vedlikehold(); S.vAkk = (+S.vAkk || 0) + v.perDøgn * Math.min(dt, 3 * 1440) / 1440;
    const beløp = Math.round(S.vAkk); if (beløp < 1) return; hvaNå = 'vedlikehold'; let ok = false; try { ok = rot.OppstartSpill && OppstartSpill.betal(beløp); } finally { hvaNå = null; }
    if (ok) { S.vAkk -= beløp; if (S.vSkyld) { S.vSkyld = 0; logg('Vedlikeholdet av byggene er betalt igjen.'); } }
    else { S.vAkk = 0; S.vSkyld = (S.vSkyld || 0) + beløp; if (!S.vMeldt || tid - S.vMeldt > 1440) { S.vMeldt = tid; logg(`Kassa rekker ikke til vedlikeholdet av byggene (${kr(v.perDøgn)} i døgnet). Byggene slites – skaff penger med en kontrakt.`); } }
    lagreSnart();
  }

  // hva som er tilgjengelig nå (til linjene og vakta)
  function bilde() {
    const SS = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill : null, O = SS && SS.O() ? SS.O().liste : [];
    const oppdrag = O.filter(o => !o.tatt).map(o => ({ id: o.id, navn: rot.Spillet ? Spillet.Oppdrag.TYPER[o.type].navn : o.type, meter: o.meter, retning: o.retning, kr: (o.gir && o.gir.penger) || 0, tatt: o.tatt }));
    const F = rot.FolkSpill && FolkSpill.tilstand(), folk = F && rot.FolkRegler ? FolkRegler.arbeidere(F, 'hogst') : 0;
    const R = rot.RessursSpill && RessursSpill.tilstand(), s = Sp(), j = R && R.jobber ? R.jobber.find(q => q.type === 'hogst' && !q.stoppet && q.gjort < q.arbeid) : null;
    const felt = j && s && s.leir ? { fram: Ressurser.fram(j), tre: j.mat.tre, avst: Math.hypot(j.x - s.leir.x, j.y - s.leir.y) } : null;
    const trePris = rot.Leir ? Leir.MATERIALER.tre.pris * Leir.REGLER.salg : 0;
    let tettsteder = { antall: 0, kr: 0 }; try { if (rot.RegionSpill && RegionSpill.status) { const st = RegionSpill.status(); tettsteder = { antall: st.size, kr: st.size ? (RegionSpill.sum().penger || 0) : 0, siste: døgnNå() > 1 ? (P.døgnSum(S && S.B, døgnNå() - 1).p.skatt || 0) : null }; } } catch (e) { /* regionen er ikke klar */ }
    const L = rot.LeirSpill && LeirSpill.tilstand();
    const kjøper = rot.SpilletSpill && SpilletSpill.knapt && SpilletSpill.knapt() && rot.Spillet ? Spillet.Marked.KJØPER : null;
    return { oppdrag, hogst: { folk, felt, trePris }, tettsteder, lager: L ? L.lager : {}, kjøper };
  }

  // ---------- «Penger inn» i fanen Lager ----------
  const css = document.createElement('style');
  css.textContent = `#leirmeny .penger{ font-size:13.5px; line-height:1.35; padding:4px 0 5px; border-bottom:1px solid #3a3226; color:var(--ink,#e7dcc3); } #leirmeny .penger.sum{ color:var(--ink-dim,#a99); }
#leirmeny .penger button{ margin:4px 6px 0 0; }`;
  document.head.appendChild(css);
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el, knapp }) => {
    if (!klar || !Sp()) return; const s = Sp(), K = S.K, ny = [];
    ny.push(el('h3', { 'data-fane': 'lager', id: 'pengerinn' }, 'Penger inn'));
    // (R2-løkka) dagboka over inn og ut – de samme tallene som morgenmøtet
    ny.push(el('div', { klasse: 'penger sum', 'data-fane': 'lager', 'data-penger': 'sum' }, sumTekst()));
    { const dt = detaljTekst(); if (dt) ny.push(el('div', { klasse: 'penger sum', 'data-fane': 'lager', 'data-penger': 'detalj' }, dt)); }
    ny.push(el('div', { klasse: 'penger', 'data-fane': 'lager', 'data-penger': 'faste' }, fasteTekst()));
    for (const l of P.linjer(bilde(), kr)) { const d = el('div', { klasse: 'penger', 'data-fane': 'lager', 'data-penger': l.id }, l.tekst);
      if (l.id === 'oppdrag' && rot.LeirSpill) d.appendChild(knapp('Vis oppdragene', () => LeirSpill.fane('mål')));
      if (l.id === 'region' && rot.RegionSpill && RegionSpill.åpne) d.appendChild(knapp('Åpne Region', () => RegionSpill.åpne()));
      if (l.id === 'hogst' && rot.FolkSpill && FolkSpill.åpne) d.appendChild(knapp('Folk og oppgaver', () => FolkSpill.åpne(true)));
      ny.push(d); }
    // øverst i fanen Lager: rett under dieselen, foran «Materialer (lager …)» – der kritikeren lette etter penger
    const mat = [...hode.children].find(n => n.tagName === 'H3' && /^Materialer \(lager/.test(n.textContent));
    for (const n of ny) if (mat) hode.insertBefore(n, mat); else hode.appendChild(n);
  });

  // «Kassa 20,9 mill. kr. Siste døgn (dag 2, kl. 06–06): … Siden kl. 06 i dag: …»
  // beløpene rundes til nærmeste tusen (som morgenmøtet)
  const krT = v => kr(Math.round((v || 0) / 1000) * 1000);
  function sumTekst() {
    const s = Sp(), d = døgnNå(), I = P.døgnSum(S && S.B, d - 1), N = P.døgnSum(S && S.B, d);
    return `Kassa ${kr(s ? s.penger : 0)}. ` + (d > 1 ? `Siste døgn (dag ${d - 1} kl. 06 – dag ${d} kl. 06): ${krT(I.inn)} inn, ${krT(I.ut)} ut. ` : '') + `Så langt i dag: ${krT(N.inn)} inn, ${krT(N.ut)} ut.`;
  }
  // hva pengene gikk til og kom fra: siste hele døgn (eller i dag på dag 1)
  function detaljTekst() {
    const d = døgnNå(), D = P.døgnSum(S && S.B, d > 1 ? d - 1 : d), del = []; if (!D.inn && !D.ut) return '';
    if (D.inn) del.push('inn: ' + P.poster(D, true, krT, 4)); if (D.ut) del.push('ut: ' + P.poster(D, false, krT, 4));
    return `${d > 1 ? 'Siste døgn' : 'I dag'} – ${del.join('; ')}.`;
  }
  // de faste utgiftene per døgn: lønn (FolkSpill) og vedlikehold (Leir.vedlikehold)
  function faste() { let lønn = 0; try { lønn = rot.FolkSpill && FolkSpill.lønnNå ? FolkSpill.lønnNå() : 0; } catch (e) { lønn = 0; } const v = vedlikehold(); return { lønn, vedlikehold: v.perDøgn, bygg: v.antall, sum: lønn + v.perDøgn }; }
  function fasteTekst() { const f = faste(); return `Faste utgifter: ca. ${krT(f.sum)} i døgnet – lønn ${krT(f.lønn)} og vedlikehold av ${f.bygg} bygg ${krT(f.vedlikehold)} (${Math.round((rot.Leir ? Leir.REGLER.vedlikehold : .01) * 100)} % av byggeprisen per døgn). Jo større leiren er, jo mer koster den å holde.`; }

  // ---------- varselbrikken når kassa er lav ----------
  (rot.VARSEL_TILLEGG = rot.VARSEL_TILLEGG || []).push(() => {
    const s = Sp(); if (!klar || !s || !s.leir || !auto()) return [];
    const lav = s.penger < Math.max(P.REGLER.lavKassaKr, (S.start || 0) * P.REGLER.lavKassa); if (!lav) return [];
    return [{ i: 'kasse', k: '', t: `Kassa: ${kr(s.penger)}`, s: 'se hvor pengene kommer fra', f: () => { const m = document.getElementById('leirmeny'), k = document.getElementById('leirknapp'); if (m && k && !m.classList.contains('på')) k.click(); if (rot.LeirSpill) LeirSpill.fane('lager'); setTimeout(() => { const h = document.getElementById('pengerinn'); if (h) h.scrollIntoView({ block: 'start' }); }, 50); } }];
  });

  // ---------- kontoen og hogstlaget ----------
  KROKER.sim.push(() => {
    if (!klar || !S) return; const s = Sp(); if (!s || !s.leir) return; const nå = performance.now();
    if (nå - sistKonto > 500) { sistKonto = nå; S.K = P.konto(S.K, s.penger, Math.floor(tid / 1440) + 1); avstem(); }
    driftSteg();
    if (s.penger < Math.max(P.REGLER.lavKassaKr, (S.start || 0) * P.REGLER.lavKassa)) { if (!S.lavMeldt && auto()) { S.lavMeldt = true; lagre(); logg(`Kassa er nede i ${kr(s.penger)}. Penger inn: oppdrag (Leir → Mål), salg av tre og materialer (Leir → Lager), skatt fra tettsteder (Mer → Region) og røverbytte.`); } }
    else if (S.lavMeldt && s.penger > 2 * P.REGLER.lavKassaKr) { S.lavMeldt = false; lagre(); }
    // uten skog i nærheten letes det sjeldnere (hvert femte minutt)
    if (auto() && !leter && nå - sistLet > (S.ingenSkog ? 300 : P.REGLER.hogst.hverSek) * 1000) { sistLet = nå; finnHogst().catch(e => console.error(e)); }
  });
  setInterval(lagre, 15000); rot.addEventListener('pagehide', lagre);

  // HOGSTLAGET VELGER SELV: noen på «Hogst», ingen hogstfelt i gang → nærmeste skog innen 1,5 km. Gir jobben eller null.
  async function finnHogst(tvang) {
    const s = Sp(), R = rot.RessursSpill && RessursSpill.tilstand(), F = rot.FolkSpill && FolkSpill.tilstand();
    if (!s || !s.leir || !R || !rot.Ressurser || !RessursSpill.skogAndel) return null;
    if (!tvang && !(F && rot.FolkRegler && FolkRegler.arbeidere(F, 'hogst') > 0)) return null;
    if (R.jobber.some(j => j.type === 'hogst' && !j.stoppet && j.gjort < j.arbeid)) return null;
    // et felt spilleren har stoppet selv, venter fortsatt på frakt: da starter ikke hogstlaget et nytt på egen hånd
    if (!tvang && R.jobber.some(j => j.type === 'hogst' && j.stoppet)) return null;
    // spilleren holder på å velge et felt selv
    if (RessursSpill.velg && RessursSpill.velg()) return null;
    leter = true;
    try {
      const prøvd = [], H = P.REGLER.hogst, t0 = performance.now(); let funnet = null;
      for (const k of P.kandidater(s.leir)) {
        // høyst 15 s leting om gangen (kartdataene hentes underveis); neste forsøk kommer om hverSek sekunder
        if ((funnet && k.ring > funnet.ring) || performance.now() - t0 > 15000) break;
        let skog = 0; try { skog = await RessursSpill.skogAndel(k.x, k.y, H.radius); } catch (e) { skog = 0; }
        prøvd.push({ ...k, skog }); if (!funnet && skog >= H.godSkog) funnet = k;
      }
      const v = P.velgFelt(prøvd); if (!v) { if (!S.ingenSkog) { S.ingenSkog = true; logg('Hogstlaget finner ingen skog innen 1,5 km fra leiren. Sett dem på en annen oppgave under Folk, eller velg et felt selv (Leir → Lager → «Hogst …»).'); lagre(); } return null; }
      if (S.ingenSkog) { S.ingenSkog = false; lagre(); }
      const R2 = RessursSpill.tilstand(); if (R2.jobber.some(j => j.type === 'hogst' && !j.stoppet && j.gjort < j.arbeid)) return null;
      const r = Ressurser.startHogst(R2, { x: v.x, y: v.y, r: H.radius, skog: v.skog }, { x: s.leir.x, y: s.leir.y }); if (r.feil) return null;
      RessursSpill.lagre(); if (RessursSpill.ryddHogst) try { RessursSpill.ryddHogst(); } catch (e) { /* 3D er ikke åpent */ }
      const d = Math.hypot(v.x - s.leir.x, v.y - s.leir.y);
      logg(`Hogstlaget fant skog ${P.km(d)} ${P.retning(v.x - s.leir.x, v.y - s.leir.y)} for leiren og har begynt å hogge (gir ca. ${(Math.round(r.jobb.mat.tre * 10) / 10).toLocaleString('nb-NO')} m³ tre). ` + (d > Ressurser.REGLER.nær ? 'Folk på «Frakt» bærer treet til leiren. ' : '') + 'Vil du velge stedet selv: Leir → Lager → «Hogst …».');
      S.hogstMeldt = (S.hogstMeldt || 0) + 1; lagre(); skitten = true;
      return r.jobb;
    } finally { leter = false; }
  }
  const PS = rot.PengerSpill = { test: false, driftTest: false, start, bilde, finnHogst, tilstand: () => S, lagre, føring, døgn: n => P.døgnSum(S && S.B, n), døgnNå, sumTekst, detaljTekst, faste, fasteTekst, vedlikehold, driftSteg, avstem };
})(typeof globalThis !== 'undefined' ? globalThis : this);
