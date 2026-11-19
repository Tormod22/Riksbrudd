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
    ut.push({ id: 'salg', tekst: har.length ? `Salg: dere har ${har.map(k => `${tall(L[k])} ${k === 'stål' ? 't stål' : 'm³ ' + k}`).join(' og ')} – «Selg 10» under Materialer gir penger straks.` : 'Salg: tre, betong og stål dere hogger og river selv, kan selges under Materialer («Selg 10»).' });
    const G = T.tettsteder || {};
    ut.push({ id: 'region', tekst: G.antall ? `Tettsteder: ${G.antall} er deres og betaler ca. ${kr(G.kr || 0)} i skatt per døgn (Mer → Region).` : 'Tettsteder: flytt et lag inn i et tettsted og hold det – det betaler skatt hver dag (Mer → Region, Krig).' });
    ut.push({ id: 'røvere', tekst: 'Røvere: slår dere tilbake et angrep, tar dere byttet deres.' });
    return ut;
  }
  const tall = v => (Math.round((v || 0) * 10) / 10).toLocaleString('nb-NO');
  const km = m => (m >= 1000 ? (Math.round(m / 100) / 10).toLocaleString('nb-NO') + ' km' : Math.round(m / 10) * 10 + ' m');
  const api = { REGLER, kandidater, velgFelt, konto, linjer, retning, km };
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
    klar = true;
    // én beskjed når et nytt spill starter (ikke i testene)
    // (bare i et nytt spill – et lagret spill med tettsteder og oppdrag i gang skal ikke høre «ingen fast inntekt»)
    if (!S.meldt && auto() && tid < 180) { S.meldt = true; setTimeout(() => logg(`Pengene: dere har ${kr(s.penger)} og ingen fast inntekt. Penger kommer fra oppdrag (Leir → Mål), salg av tre og materialer dere hogger og river, skatt fra tettsteder dere tar og byttet fra røvere. Leir → Lager → «Penger inn» viser alt.`), 4000); }
    lagre();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // hva som er tilgjengelig nå (til linjene og vakta)
  function bilde() {
    const SS = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill : null, O = SS && SS.O() ? SS.O().liste : [];
    const oppdrag = O.filter(o => !o.tatt).map(o => ({ id: o.id, navn: rot.Spillet ? Spillet.Oppdrag.TYPER[o.type].navn : o.type, meter: o.meter, retning: o.retning, kr: (o.gir && o.gir.penger) || 0, tatt: o.tatt }));
    const F = rot.FolkSpill && FolkSpill.tilstand(), folk = F && rot.FolkRegler ? FolkRegler.arbeidere(F, 'hogst') : 0;
    const R = rot.RessursSpill && RessursSpill.tilstand(), s = Sp(), j = R && R.jobber ? R.jobber.find(q => q.type === 'hogst' && !q.stoppet && q.gjort < q.arbeid) : null;
    const felt = j && s && s.leir ? { fram: Ressurser.fram(j), tre: j.mat.tre, avst: Math.hypot(j.x - s.leir.x, j.y - s.leir.y) } : null;
    const trePris = rot.Leir ? Leir.MATERIALER.tre.pris * Leir.REGLER.salg : 0;
    let tettsteder = { antall: 0, kr: 0 }; try { if (rot.RegionSpill && RegionSpill.status) { const st = RegionSpill.status(); tettsteder = { antall: st.size, kr: st.size ? (RegionSpill.sum().penger || 0) : 0 }; } } catch (e) { /* regionen er ikke klar */ }
    const L = rot.LeirSpill && LeirSpill.tilstand();
    return { oppdrag, hogst: { folk, felt, trePris }, tettsteder, lager: L ? L.lager : {} };
  }

  // ---------- «Penger inn» i fanen Lager ----------
  const css = document.createElement('style');
  css.textContent = `#leirmeny .penger{ font-size:13.5px; line-height:1.35; padding:4px 0 5px; border-bottom:1px solid #3a3226; color:var(--ink,#e7dcc3); } #leirmeny .penger.sum{ color:var(--ink-dim,#a99); }
#leirmeny .penger button{ margin:4px 6px 0 0; }`;
  document.head.appendChild(css);
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el, knapp }) => {
    if (!klar || !Sp()) return; const s = Sp(), K = S.K, ny = [];
    ny.push(el('h3', { 'data-fane': 'lager', id: 'pengerinn' }, 'Penger inn'));
    const inn = K ? (K.før ? K.før.inn : K.inn) : 0, ut = K ? (K.før ? K.før.ut : K.ut) : 0;
    ny.push(el('div', { klasse: 'penger sum', 'data-fane': 'lager' }, `Kassa ${kr(s.penger)}. ${K && K.før ? 'I går' : 'I dag'}: ${kr(inn)} inn, ${kr(ut)} ut.`));
    for (const l of P.linjer(bilde(), kr)) { const d = el('div', { klasse: 'penger', 'data-fane': 'lager', 'data-penger': l.id }, l.tekst);
      if (l.id === 'oppdrag' && rot.LeirSpill) d.appendChild(knapp('Vis oppdragene', () => LeirSpill.fane('mål')));
      if (l.id === 'region' && rot.RegionSpill && RegionSpill.åpne) d.appendChild(knapp('Åpne Region', () => RegionSpill.åpne()));
      if (l.id === 'hogst' && rot.FolkSpill && FolkSpill.åpne) d.appendChild(knapp('Folk og oppgaver', () => FolkSpill.åpne(true)));
      ny.push(d); }
    // øverst i fanen Lager: rett under dieselen, foran «Materialer (lager …)» – der kritikeren lette etter penger
    const mat = [...hode.children].find(n => n.tagName === 'H3' && /^Materialer \(lager/.test(n.textContent));
    for (const n of ny) if (mat) hode.insertBefore(n, mat); else hode.appendChild(n);
  });

  // ---------- varselbrikken når kassa er lav ----------
  (rot.VARSEL_TILLEGG = rot.VARSEL_TILLEGG || []).push(() => {
    const s = Sp(); if (!klar || !s || !s.leir || !auto()) return [];
    const lav = s.penger < Math.max(P.REGLER.lavKassaKr, (S.start || 0) * P.REGLER.lavKassa); if (!lav) return [];
    return [{ i: 'kasse', k: '', t: `Kassa: ${kr(s.penger)}`, s: 'se hvor pengene kommer fra', f: () => { const m = document.getElementById('leirmeny'), k = document.getElementById('leirknapp'); if (m && k && !m.classList.contains('på')) k.click(); if (rot.LeirSpill) LeirSpill.fane('lager'); setTimeout(() => { const h = document.getElementById('pengerinn'); if (h) h.scrollIntoView({ block: 'start' }); }, 50); } }];
  });

  // ---------- kontoen og hogstlaget ----------
  KROKER.sim.push(() => {
    if (!klar || !S) return; const s = Sp(); if (!s || !s.leir) return; const nå = performance.now();
    if (nå - sistKonto > 500) { sistKonto = nå; S.K = P.konto(S.K, s.penger, Math.floor(tid / 1440) + 1); }
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
  const PS = rot.PengerSpill = { test: false, start, bilde, finnHogst, tilstand: () => S, lagre };
})(typeof globalThis !== 'undefined' ? globalThis : this);
