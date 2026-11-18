/* SPILLFORMER (natt 18. nov): regler uten DOM (Node: require('./scenario'); nettleser: globalThis.Scenario).
 * Vanskelighetsgrad, utfordringer som endrer reglene, scenarier med mål og tidsfrist, tap av leiren (start i en utpost),
 * etterspill (øyeblikksbilder av krigen som kan spoles etterpå) og ukas oppdrag (samme oppdrag for alle den uka).
 * Valgene til et spill er SPILLREGLER = { vanskelighet, utfordringer: [...], scenario, faktor: { penger, fiende, røvere }, har(id) }
 * (se docs/natt/spillform.md). Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Claudes forslag
  const REGLER = {
    // penger = faktor på startkassa, fiende = faktor på fiendens treff, røvere = faktor på størrelsen på røverbølgene
    vanskelighet: {
      lett: { navn: 'Lett', tekst: '50 % mer penger, fienden treffer dårligere, små røverbølger', penger: 1.5, fiende: .75, røvere: .6 },
      vanlig: { navn: 'Vanlig', tekst: 'Slik spillet er ment', penger: 1, fiende: 1, røvere: 1 },
      hard: { navn: 'Hard', tekst: '40 % mindre penger, fienden treffer bedre, store røverbølger', penger: .6, fiende: 1.3, røvere: 1.5 },
    },
    utfordringer: {
      ingenKjøp: { navn: 'Ingen kjøp', tekst: 'Materialer, diesel og mat kan ikke kjøpes – hogg, riv, let i hus og dyrk selv.' },
      evigVinter: { navn: 'Evig vinter', tekst: 'Det er alltid vinter: mer mat og ved går med, og snøen blir liggende.' },
      ingenRadio: { navn: 'Ingen radio', tekst: 'Lagene tar bare imot ordre innen 3 km fra leiren.' },
      tåkeland: { navn: 'Tåkeland', tekst: 'Lagene dine ser bare 60 % så langt.' },
      tomKasse: { navn: 'Tom kasse', tekst: 'Du starter med en tidel av pengene.' },
    },
    radioKm: 3, siktFaktor: .6, tomKasse: .1,
    // hvert seiersvalg «sterkere motstander» legger dette til fiendens faktor
    styrkeTrinn: .25,
    // større region etter seier: radien ganges med dette per trinn, og minste antall tettsteder øker med så mange
    regionFaktor: 1.6, regionMinst: 6,
    // start uten ferdige lag: så mange mann i vaktlaget, og så mange ekstra rasjoner
    vaktlag: 4, startmat: 20,
    // tap av leiren: fiende innen «nær» meter uten egne lag innen «vern» meter i «minutter» spillminutter
    // (fred: de to første døgnene kan ikke leiren tapes – en ny spiller uten lag skal rekke å lage tropper)
    tap: { fred: 2880, nær: 150, vern: 400, minutter: 90, penger: .5, lager: .5, folk: .7, minstFolk: 3, avstand: 4000 },
    // etterspill: et bilde hvert «hver» spillminutt, høyst «maks» bilder (eldre tynnes ut)
    etterspill: { hver: 180, maks: 240, lagMaks: 40 },
  };
  const DØGN = 1440;
  const dag = tid => Math.floor(tid / DØGN) + 1;

  // ---------- valgene til et spill ----------
  // regler(valg): rensede valg med faktorene regnet ut. valg = { vanskelighet, utfordringer, scenario, styrke (trinn etter seire) }
  function regler(valg) {
    const v = valg || {}, id = REGLER.vanskelighet[v.vanskelighet] ? v.vanskelighet : 'vanlig', V = REGLER.vanskelighet[id];
    const utf = (Array.isArray(v.utfordringer) ? v.utfordringer : []).filter((u, i, a) => REGLER.utfordringer[u] && a.indexOf(u) === i);
    const sc = SCENARIER[v.scenario] ? v.scenario : null, styrke = Math.max(0, Math.min(8, Math.round(v.styrke || 0)));
    const ut = { vanskelighet: id, utfordringer: utf, scenario: sc, styrke,
      faktor: { penger: V.penger * (utf.includes('tomKasse') ? REGLER.tomKasse : 1), fiende: V.fiende + styrke * REGLER.styrkeTrinn, røvere: V.røvere + styrke * REGLER.styrkeTrinn } };
    ut.har = u => utf.includes(u);
    return ut;
  }
  // kort tekst om valgene: «Hard · Ingen radio, Evig vinter · Hold byen»
  function beskriv(r) { return [REGLER.vanskelighet[r.vanskelighet].navn, r.utfordringer.map(u => REGLER.utfordringer[u].navn).join(', '), r.scenario ? SCENARIER[r.scenario].navn : ''].filter(Boolean).join(' · '); }

  // ---------- scenarier ----------
  // T = { tid (spillminutter), egne (antall tettsteder du holder), holder(id) (holder du tettstedet?), mål (id-en til nærmeste tettsted,
  //       eller null når kartet ikke har noe), folk, andel (0–1 av folket i området), leirTapt }
  // st = det scenariet husker: { holdtFra }
  const SCENARIER = {
    hold: { navn: 'Hold byen', dager: 8, tekst: 'Ta det nærmeste tettstedet og hold det i tre døgn i strekk. Frist: dag 8.',
      vurder(T, st) {
        if (!T.mål) return { status: 'pågår', tekst: 'Det er ikke noe tettsted i nærheten ennå.' };
        if (T.holder(T.mål)) { if (st.holdtFra == null) st.holdtFra = T.tid; const d = (T.tid - st.holdtFra) / DØGN; if (d >= 3) return { status: 'vunnet', tekst: 'Du holdt byen i tre døgn.' };
          return { status: 'pågår', tekst: `Du holder byen: ${des(d)} av 3 døgn.`, andel: d / 3 }; }
        st.holdtFra = null; return { status: 'pågår', tekst: 'Ta tettstedet: flytt et lag inn og hold det.', andel: 0 }; } },
    tre: { navn: 'Tre på fem døgn', dager: 5, tekst: 'Hold tre tettsteder samtidig før fem døgn er gått.',
      vurder(T) { return T.egne >= 3 ? { status: 'vunnet', tekst: 'Du holder tre tettsteder.' } : { status: 'pågår', tekst: `Du holder ${T.egne} av 3 tettsteder.`, andel: T.egne / 3 }; } },
    overlev: { navn: 'Sju døgn', dager: 7, seierVedFrist: true, tekst: 'Overlev i sju døgn uten å miste leiren, og ha minst fem personer igjen.',
      vurder(T) { if (T.leirTapt) return { status: 'tapt', tekst: 'Leiren gikk tapt.' }; if (T.folk < 5) return { status: 'tapt', tekst: 'Dere er færre enn fem.' };
        return { status: 'pågår', tekst: `Dag ${dag(T.tid)} av 7. ${T.folk} personer.`, andel: Math.min(1, T.tid / (7 * DØGN)) }; } },
    lyn: { navn: 'Lynkrig', dager: 10, tekst: 'Vinn regionen (60 % av folket i området) før ti døgn er gått.',
      vurder(T) { return T.andel >= .6 ? { status: 'vunnet', tekst: 'Regionen er din.' } : { status: 'pågår', tekst: `Du holder ${Math.round(T.andel * 100)} % – målet er 60 %.`, andel: T.andel / .6 }; } },
  };
  const des = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  // vurder(id, T, st): { status: 'pågår' | 'vunnet' | 'tapt', tekst, andel, igjen (spillminutter til fristen) }
  function vurder(id, T, st) {
    const S = SCENARIER[id]; if (!S) return null; if (st.ferdig) return { status: st.ferdig, tekst: st.tekst || '', igjen: 0 };
    const frist = S.dager * DØGN, r = S.vurder(T, st); r.igjen = Math.max(0, frist - T.tid);
    if (r.status === 'pågår' && T.tid >= frist) { r.status = S.seierVedFrist ? 'vunnet' : 'tapt'; r.tekst = S.seierVedFrist ? 'Dere klarte det.' : 'Fristen gikk ut. ' + r.tekst; }
    if (r.status !== 'pågår') { st.ferdig = r.status; st.tekst = r.tekst; }
    return r;
  }
  function fristTekst(min) { const d = Math.floor(min / DØGN), t = Math.floor((min - d * DØGN) / 60); return d ? `${d} døgn ${t} t igjen` : `${t} t ${Math.floor(min % 60)} min igjen`; }

  // ---------- tap av leiren ----------
  // truet(leir, fiender, egne): står en fiende inne i leiren uten at noen av dine er der?
  function truet(leir, fiender, egne, R = REGLER.tap) {
    const d = (a) => Math.hypot(a.x - leir.x, a.y - leir.y);
    return fiender.some(f => d(f) <= R.nær) && !egne.some(e => d(e) <= R.vern);
  }
  // tapSteg(st, truetNå, tid): teller minuttene leiren har vært tatt; gir true når den er tapt. st = { fra }
  function tapSteg(st, truetNå, tid, R = REGLER.tap) { if (!truetNå || tid < (R.fred || 0)) { st.fra = null; return false; } if (st.fra == null) st.fra = tid; return tid - st.fra >= R.minutter; }
  // utpost(leir, fiender, egneByer): der du begynner på nytt – det nærmeste tettstedet du holder (minst 1 km unna), ellers 4 km bort fra fienden
  function utpost(leir, fiender, egneByer, R = REGLER.tap) {
    let best = null, bd = Infinity; for (const b of egneByer || []) { const d = Math.hypot(b.x - leir.x, b.y - leir.y); if (d > 1000 && d < bd) { bd = d; best = b; } }
    if (best) return { x: Math.round(best.x), y: Math.round(best.y), navn: best.navn || null };
    let fx = 0, fy = 0; for (const f of fiender || []) { fx += f.x - leir.x; fy += f.y - leir.y; }
    const l = Math.hypot(fx, fy), ux = l > 1 ? -fx / l : 0, uy = l > 1 ? -fy / l : -1;
    return { x: Math.round(leir.x + ux * R.avstand), y: Math.round(leir.y + uy * R.avstand), navn: null };
  }
  // det som er igjen: { penger, folk (antall som blir med), lager-faktor }
  function etterTap(penger, folk, R = REGLER.tap) { return { penger: Math.round(penger * R.penger), folk: Math.min(folk, Math.max(R.minstFolk, Math.round(folk * R.folk))), lager: R.lager }; }

  // ---------- etterspill ----------
  const SIDE = { blå: 'b', rød: 'r', grønn: 'g' }, SIDE_UT = { b: 'blå', r: 'rød', g: 'grønn' };
  // bilde(tid, byer: [{ id, eier }], lag: [{ x, y, side }]) -> { t, e: { id: 'b' }, l: [[x, y, 'b']] } (bare tettsteder med eier)
  function bilde(tid, byer, lag, R = REGLER.etterspill) {
    const e = {}; for (const b of byer || []) if (SIDE[b.eier]) e[b.id] = SIDE[b.eier];
    return { t: Math.round(tid), e, l: (lag || []).slice(0, R.lagMaks).map(s => [Math.round(s.x), Math.round(s.y), SIDE[s.side] || 'r']) };
  }
  // leggTil(liste, b): nytt bilde når det er lenge nok siden det forrige; over taket tas annethvert av de eldste bort
  function leggTil(liste, b, R = REGLER.etterspill) {
    const sist = liste[liste.length - 1]; if (sist && b.t - sist.t < R.hver) return false;
    liste.push(b); if (liste.length > R.maks) { const halv = Math.floor(liste.length / 2), ny = liste.filter((q, i) => i >= halv || i % 2 === 0); liste.length = 0; liste.push(...ny); }
    return true;
  }
  // stillingVed(b): { blå: n, rød: n, grønn: n } tettsteder i et bilde
  function stillingVed(b) { const ut = { blå: 0, rød: 0, grønn: 0 }; for (const s of Object.values(b.e || {})) if (SIDE_UT[s]) ut[SIDE_UT[s]]++; return ut; }
  const eierI = (b, id) => SIDE_UT[(b.e || {})[id]] || null;

  // ---------- ukas oppdrag ----------
  // ukenummer etter ISO 8601: { år, uke }
  function uke(dato) {
    const d = new Date(Date.UTC(dato.getFullYear(), dato.getMonth(), dato.getDate())), ukedag = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - ukedag);
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return { år: d.getUTCFullYear(), uke: Math.ceil(((d - start) / 86400000 + 1) / 7) };
  }
  const rng = frø => { let a = frø >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // typene: verdi(T0, T) er det som telles fra oppdraget startet (T = { tid, penger, tettsteder, bygg, folk })
  const UKETYPER = [
    { id: 'tettsteder', lag: r => ({ mål: 1 + Math.floor(r() * 3), dager: 3 + Math.floor(r() * 3) }), tekst: o => `Ta ${o.mål} ${o.mål === 1 ? 'tettsted' : 'tettsteder'} på ${o.dager} døgn`, enhet: 'tettsteder', verdi: (a, b) => b.tettsteder - a.tettsteder },
    { id: 'bygg', lag: r => ({ mål: 4 + Math.floor(r() * 5), dager: 2 + Math.floor(r() * 3) }), tekst: o => `Bygg ${o.mål} bygg ferdig på ${o.dager} døgn`, enhet: 'bygg', verdi: (a, b) => b.bygg - a.bygg },
    { id: 'folk', lag: r => ({ mål: 2 + Math.floor(r() * 4), dager: 3 + Math.floor(r() * 3) }), tekst: o => `Bli ${o.mål} flere i leiren på ${o.dager} døgn`, enhet: 'nye folk', verdi: (a, b) => b.folk - a.folk },
    { id: 'spar', lag: r => ({ mål: 5 + Math.floor(r() * 4) * 5, dager: 2 + Math.floor(r() * 2) }), tekst: o => `Bruk høyst ${o.mål} mill. kr på ${o.dager} døgn – og ha ingen færre folk`, enhet: 'mill. kr brukt', lavest: true, verdi: (a, b) => Math.max(0, Math.round((a.penger - b.penger) / 1e5) / 10) },
  ];
  // ukasOppdrag({ år, uke }): samme for alle den uka
  function ukasOppdrag(u) {
    const r = rng(u.år * 100 + u.uke), T = UKETYPER[Math.floor(r() * UKETYPER.length)], o = { år: u.år, uke: u.uke, type: T.id, ...T.lag(r) };
    o.tekst = T.tekst(o) + '.'; o.enhet = T.enhet; o.lavest = !!T.lavest; return o;
  }
  // ukeStatus(o, T0, T): { verdi, ferdig, klart, igjen (spillminutter), tekst }
  function ukeStatus(o, T0, T) {
    const U = UKETYPER.find(q => q.id === o.type), verdi = U.verdi(T0, T), brukt = T.tid - T0.tid, frist = o.dager * DØGN, ute = brukt >= frist;
    const klart = o.lavest ? ute && verdi <= o.mål && T.folk >= T0.folk : verdi >= o.mål;
    return { verdi, klart, ferdig: klart || ute, igjen: Math.max(0, frist - brukt), dager: Math.min(o.dager, Math.round(brukt / DØGN * 10) / 10),
      tekst: `${String(verdi).replace('.', ',')} ${o.enhet}` + (o.lavest ? ` (høyst ${o.mål})` : ` av ${o.mål}`) };
  }
  // resultatet som en kort kode som kan deles: «RB-2026U47-K-3-4.5-NAVN-x7» (K = klart, I = ikke klart; siste ledd er en kontrollsum)
  const sum = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1296).toString(36).padStart(2, '0'); };
  function ukeKode(o, navn, st) {
    const n = String(navn || 'Ukjent').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 16) || 'Ukjent', kropp = ['RB', o.år + 'U' + o.uke, st.klart ? 'K' : 'I', st.verdi, st.dager, n].join('-');
    return kropp + '-' + sum(kropp);
  }
  function lesUkeKode(t) {
    const m = /^(RB-(\d{4})U(\d{1,2})-([KI])-([\d.]+)-([\d.]+)-([\p{L}\p{N}]{1,16}))-([0-9a-z]{2})$/u.exec(String(t || '').trim()); if (!m || sum(m[1]) !== m[8]) return null;
    return { år: +m[2], uke: +m[3], klart: m[4] === 'K', verdi: +m[5], dager: +m[6], navn: m[7] };
  }
  // hvem er best av to resultater i samme uke: klart foran ikke klart, så verdien (høyest, eller lavest for sparing), så færrest døgn
  function ukeBedre(o, a, b) { if (a.klart !== b.klart) return a.klart; if (a.verdi !== b.verdi) return o.lavest ? a.verdi < b.verdi : a.verdi > b.verdi; return a.dager < b.dager; }
  function ukeTekst(o, navn, st) { return `Riksbrudd, ukas oppdrag (uke ${o.uke}): ${o.tekst} ${navn}: ${st.tekst} på ${String(st.dager).replace('.', ',')} døgn – ${st.klart ? 'klart' : 'ikke klart'}. Kode: ${ukeKode(o, navn, st)}`; }

  const api = { REGLER, SCENARIER, DØGN, dag, regler, beskriv, vurder, fristTekst, truet, tapSteg, utpost, etterTap, bilde, leggTil, stillingVed, eierI, uke, ukasOppdrag, ukeStatus, ukeKode, lesUkeKode, ukeBedre, ukeTekst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Scenario = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
