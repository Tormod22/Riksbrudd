/* Riksbrudd – FORMENN OG LEDERE (28. nov, pakke «ledere», fase G5 i docs/plan-selskap-okonomi.md, kapittel 13.1).
 * Regler uten DOM (Node: require('./ledere'); nettleser: globalThis.Ledere). Visningen: spill/ledere-visning.js (window.LedereSpill).
 *
 * Fem roller. En person utnevnes til leder; lederen tar beslutningene du ellers måtte ta, etter REGLENE DU SETTER (enkle valg per rolle)
 * og sin egen DYKTIGHET (ferdigheten «ledelse», FolkRegler.ledelse(p), 0,7–1,45):
 *  - LEIRSJEF: maten («hold alltid N døgn mat» – kjøper rasjoner), dieselen til strømmen («hold N døgn diesel»), byggingen («bygg ferdig
 *    planen før noe nytt» – bestiller skissene i planen én om gangen) og sengene (brakker i planen først når noen sover i telt).
 *  - FORMANN (én per maskinbygg): «hold saga i gang, men vakta først» – flytter en person til maskinen når den står for «venter på folk».
 *  - FORHANDLER: byene (byr på beskyttelse/handel og svarer på motbud: ja over grensen i kr per innbygger) og firmaene (sier ja til
 *    fast kunde / vern når firmaet tilbyr det).
 *  - TROPPSJEF (én per tropp): stridsreglene (en av holdningene i strid.js) og «kom hjem når ammunisjonen er under X».
 *  - KASSERER: «hold minst X mill. i kassa» – stopper kjøp som ville tatt kassa under; utbytte bare når uka gikk i pluss.
 * Kapittel 18, spørsmål 19: forslaget er brukt – lederne følger reglene dine og egen dyktighet, og kan av og til feile.
 * Lederne krever høyere lønn (1,5–2 ×), kan bli lokket bort av rivalene, og gode ledere gjør selskapet mer verdt (verdi()).
 * ALLE TALL HER ER CLAUDES FORSLAG (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const FR = NODE ? require('./folk.js') : rot.FolkRegler;
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const rund = (v, s) => Math.round(v / s) * s;

  // ---------- TALLENE (alle er Claudes forslag) ----------
  const REGLER = {
    døgn: 1440,
    // lønna som leder: grunnlønna × fra 1,5 (ledelse 0,7) til 2 (ledelse 1,45), avrundet til 500 kr
    lønn: { min: 1.5, maks: 2, steg: 500, standard: 15000 },
    // sjansen for et dårlig valg når lederen tar en beslutning: «sjanse» ved ledelse 0,7, null fra «trygg» og oppover
    feil: { sjanse: .3, trygg: 1.2 },
    // lederne ser over sakene sine hvert «hvert» spillminutt
    hvert: 20,
    // leirsjefen: kjøper når maten (dieselen) rekker under målet, for målet + «buffer» døgn; en dyktig leirsjef kjøper når det rekker
    // under målet, en lite dyktig først ved «sen» × målet. Et dårlig valg: kjøper bare «lite» av det som trengs. Rasjoner i hele 5.
    mat: { buffer: .5, sen: .6, lite: .5, steg: 5 },
    diesel: { buffer: .5, sen: .6, lite: .5, steg: 50 },
    // byggingen: neste skisse bestilles når det står færre enn «kø» jobber i byggekøen
    bygg: { kø: 1 },
    // forhandleren: åpningsbudet = grunnprisen × (1 + «åpning» × dyktighet over 0,7 / 0,75); prøver hver by høyst hvert «hvert» spillminutt.
    // Et dårlig valg: godtar et motbud under grensen (ned til «under» × grensen) eller sier nei til et godt.
    forhandler: { åpning: .3, hvert: 1440, under: .8, løfte: 'vanlig', varighet: 14 },
    // troppsjefen: en lite dyktig troppsjef reagerer først når ammunisjonen er under «sen» × grensen
    tropp: { sen: .6, hjemRadius: 400 },
    // lokking av ledere (bare i ekte spill, om morgenen): sjanse per morgen = «sjanse» × (ledelse − 0,9) / 0,55 for en leder med
    // lojalitet under «lojal»; budet = lønna × «påslag»
    lokk: { sjanse: .08, lojal: .8, påslag: 1.2 },
    // VERDIEN (for børsen, Ø7): per leder «per» kr × (ledelse − «fra») / 0,45 (en middels leder ~0, en dyktig ~3 mill.), og et selskap med
    // alle fem rollene fylt får «hel» i tillegg
    verdi: { per: 3e6, fra: 1, hel: 2e6 },
    // så mange beslutninger huskes (siste først i panelet)
    huskes: 40,
  };

  // ---------- ROLLENE OG REGLENE DU SETTER ----------
  // Hver regel: valg = [[verdi, tekst]], standard = verdien en ny leder starter med
  const ROLLER = {
    leirsjef: { navn: 'Leirsjef', flere: false, tekst: 'Leiren: bygging i kø, mat, senger og strøm', regler: {
      mat: { navn: 'Mat', standard: 2, valg: [[0, 'kjøper ikke mat'], [1, 'hold 1 døgn mat'], [2, 'hold 2 døgn mat'], [3, 'hold 3 døgn mat'], [5, 'hold 5 døgn mat']] },
      diesel: { navn: 'Strøm', standard: 1, valg: [[0, 'kjøper ikke diesel'], [1, 'hold 1 døgn diesel'], [2, 'hold 2 døgn diesel'], [3, 'hold 3 døgn diesel']] },
      bygg: { navn: 'Bygging', standard: 'plan', valg: [['av', 'bygger ikke selv'], ['plan', 'bygg ferdig planen før noe nytt']] },
      senger: { navn: 'Senger', standard: 'ja', valg: [['ja', 'brakker i planen først når noen sover i telt'], ['nei', 'planen i rekkefølge']] },
    } },
    formann: { navn: 'Formann', flere: true, tekst: 'Én maskin: skift, operatører og bærere', regler: {
      folk: { navn: 'Folk', standard: 'vakt', valg: [['vakt', 'hold maskinen i gang, men vakta først'], ['alltid', 'hold maskinen i gang for enhver pris'], ['fri', 'bare folk som har fri']] },
    } },
    forhandler: { navn: 'Forhandler', flere: false, tekst: 'Byene og firmaene: tilbud og motbud', regler: {
      by: { navn: 'Byene', standard: 20, valg: [[0, 'forhandler ikke med byene'], [15, 'ja over 15 kr per innbygger'], [20, 'ja over 20 kr per innbygger'], [25, 'ja over 25 kr per innbygger'], [30, 'ja over 30 kr per innbygger']] },
      trinn: { navn: 'Avtaler', standard: 'beskyttelse', valg: [['beskyttelse', 'bare beskyttelse'], ['begge', 'beskyttelse og handel']] },
      firma: { navn: 'Firmaene', standard: 'fast', valg: [['nei', 'svarer ikke firmaene'], ['fast', 'ja til fast kunde'], ['fastVern', 'ja til fast kunde og vern']] },
    } },
    troppsjef: { navn: 'Troppsjef', flere: true, tekst: 'Én tropp ute: stridsreglene og når den kommer hjem', regler: {
      ammo: { navn: 'Ammunisjon', standard: .25, valg: [[0, 'kommer ikke hjem av seg selv'], [.15, 'hjem under 15 % ammunisjon'], [.25, 'hjem under 25 % ammunisjon'], [.4, 'hjem under 40 % ammunisjon']] },
      holdning: { navn: 'Strid', standard: 'egen', valg: [['egen', 'stridsreglene du har satt'], ['balansert', 'balansert'], ['forsiktig', 'forsiktig'], ['aggressiv', 'aggressiv'], ['bakhold', 'bakhold']] },
    } },
    kasserer: { navn: 'Kasserer', flere: false, tekst: 'Kassa: minimum og utbytte', regler: {
      minimum: { navn: 'Kassa', standard: 5e6, valg: [[0, 'ingen grense'], [2e6, 'hold minst 2 mill.'], [5e6, 'hold minst 5 mill.'], [10e6, 'hold minst 10 mill.'], [20e6, 'hold minst 20 mill.']] },
      utbytte: { navn: 'Utbytte', standard: 'pluss', valg: [['pluss', 'bare når uka gikk i pluss'], ['aldri', 'aldri utbytte']] },
    } },
  };
  const RO = ['leirsjef', 'formann', 'forhandler', 'troppsjef', 'kasserer'];

  // ---------- dyktighet, lønn og tilfeldighet ----------
  const ledelse = p => (FR && FR.ledelse ? FR.ledelse(p) : .9);
  const dyk = l => klem((l - .7) / .75, 0, 1);
  const feilSjanse = l => REGLER.feil.sjanse * klem((REGLER.feil.trygg - l) / (REGLER.feil.trygg - .7), 0, 1);
  const lønnFaktor = l => REGLER.lønn.min + (REGLER.lønn.maks - REGLER.lønn.min) * dyk(l);
  const lederLønn = (grunn, l) => rund((grunn > 0 ? grunn : REGLER.lønn.standard) * lønnFaktor(l), REGLER.lønn.steg);
  const dyktighetOrd = l => (l >= 1.3 ? 'svært dyktig' : l >= 1.1 ? 'dyktig' : l >= .9 ? 'middels' : 'lite dyktig');
  function rng(S) { let x = (S.frø >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; S.frø = x || 1; return (x >>> 0) / 4294967296; }; }

  // ---------- tilstanden ----------
  // S.ledere: { [nøkkel]: { rolle, person (id i folket) | mann (navnet i troppen), navn, regler, selvTil, fra, lønnFør } }
  // nøkkel: 'leirsjef', 'forhandler', 'kasserer', 'formann:<byggets id>', 'troppsjef:<lagets navn>'
  function ny(frø = 7) { return { versjon: 1, ledere: {}, logg: [], frø: frø >>> 0 || 7, selvTil: null, sist: {}, uke: null }; }
  function fraJSON(o) {
    const S = ny(); if (!o || typeof o !== 'object') return S;
    S.frø = o.frø >>> 0 || 7; S.selvTil = Number.isFinite(o.selvTil) ? o.selvTil : null; S.sist = o.sist && typeof o.sist === 'object' ? o.sist : {};
    S.logg = Array.isArray(o.logg) ? o.logg.filter(q => q && q.tekst).slice(0, REGLER.huskes) : [];
    S.uke = o.uke && typeof o.uke === 'object' ? o.uke : null;
    for (const [k, v] of Object.entries(o.ledere || {})) { const r = nøkkelRolle(k); if (!r || !v || (v.person == null && !v.mann)) continue; S.ledere[k] = { ...v, rolle: r, regler: renRegler(r, v.regler) }; }
    return S;
  }
  const nøkkelRolle = k => { const r = String(k).split(':')[0]; return ROLLER[r] && (ROLLER[r].flere ? String(k).includes(':') : k === r) ? r : null; };
  const nøkkel = (rolle, del) => (ROLLER[rolle] && ROLLER[rolle].flere ? `${rolle}:${del}` : rolle);
  function renRegler(rolle, r) { const R = ROLLER[rolle].regler, u = {}; for (const [k, d] of Object.entries(R)) { const v = r && r[k]; u[k] = d.valg.some(q => String(q[0]) === String(v)) ? d.valg.find(q => String(q[0]) === String(v))[0] : d.standard; } return u; }
  const standardRegler = rolle => renRegler(rolle, null);
  const regelTekst = (rolle, k, v) => { const d = ROLLER[rolle].regler[k]; const q = d && d.valg.find(q => String(q[0]) === String(v)); return q ? q[1] : ''; };

  // Er lederen i arbeid nå? (ikke «jeg styrer selv i dag», verken for alle eller for denne)
  const iArbeid = (S, A, tid) => !!A && !(S.selvTil != null && tid < S.selvTil) && !(A.selvTil != null && tid < A.selvTil);
  // «Jeg styrer selv i dag»: til neste morgen kl. 06 (tid 0 er kl. 06, som klokke() i index.html)
  const nesteMorgen = tid => (Math.floor(tid / REGLER.døgn) + 1) * REGLER.døgn;
  // Er personen alt leder et sted?
  const lederFor = (S, pid) => Object.entries(S.ledere).find(([, A]) => A.person === pid) || null;

  // UTNEVN. p: personen (fra folket eller troppens mannsliste med m.person). Gir { nøkkel, A } eller { feil }.
  function utnevn(S, rolle, del, p, tid = 0, o = {}) {
    if (!ROLLER[rolle]) return { feil: 'Ukjent rolle.' }; if (ROLLER[rolle].flere && (del == null || del === '')) return { feil: 'Mangler maskin eller tropp.' };
    if (!p || !p.navn) return { feil: 'Fant ikke personen.' };
    const k = nøkkel(rolle, del), pid = p.id != null ? p.id : null;
    if (pid != null) { const f = lederFor(S, pid); if (f && f[0] !== k) return { feil: `${p.navn} er alt ${ROLLER[f[1].rolle].navn.toLowerCase()}.` }; }
    const gml = S.ledere[k], regler = gml ? gml.regler : renRegler(rolle, o.regler);
    if (gml && gml.person !== pid) av(S, k, null);
    const l = ledelse(p);
    S.ledere[k] = { rolle, person: pid, mann: rolle === 'troppsjef' ? p.navn : null, navn: p.navn, regler, selvTil: null, fra: tid, lønnFør: p.lønn > 0 ? p.lønn : null, ledelse: l };
    // lønna: lederlønn etter dyktigheten (gjelder personposten; i en tropp: m.person)
    p.lønn = lederLønn(p.lønn > 0 ? p.lønn : REGLER.lønn.standard, l);
    notér(S, tid, rolle, `${p.navn} er ${ROLLER[rolle].navn.toLowerCase()} (${dyktighetOrd(l)}, ledelse ${String(l).replace('.', ',')}; lønn ${kr(p.lønn)} i døgnet).`);
    return { nøkkel: k, A: S.ledere[k] };
  }
  // Ta lederen av rollen. p (valgfri): personposten – lønna settes tilbake
  function av(S, k, p, tid = 0, grunn) {
    const A = S.ledere[k]; if (!A) return null; delete S.ledere[k];
    if (p) { if (A.lønnFør > 0) p.lønn = A.lønnFør; else delete p.lønn; }
    notér(S, tid, A.rolle, grunn || `${A.navn} er ikke lenger ${ROLLER[A.rolle].navn.toLowerCase()}.`);
    return A;
  }
  function settRegel(S, k, regel, verdi) {
    const A = S.ledere[k]; if (!A) return { feil: 'Ingen leder der.' }; const d = ROLLER[A.rolle].regler[regel]; if (!d) return { feil: 'Ukjent regel.' };
    const q = d.valg.find(v => String(v[0]) === String(verdi)); if (!q) return { feil: 'Ukjent valg.' };
    A.regler[regel] = q[0]; return { ok: true, tekst: q[1] };
  }
  function notér(S, tid, rolle, tekst, viktig = false) { S.logg.unshift({ t: Math.round(tid), rolle, tekst, viktig: !!viktig }); if (S.logg.length > REGLER.huskes) S.logg.length = REGLER.huskes; return tekst; }
  const kr = n => (rot.Leir && rot.Leir.kroner ? rot.Leir.kroner(n) : NODE ? require('./leir.js').kroner(n) : Math.round(n) + ' kr');
  const fornavn = A => String(A.navn || '').split(' ')[0];
  // hvem lederen er for M.person: mannens navn i en tropp, ellers personens id i folket
  const ref = A => (A.rolle === 'troppsjef' ? A.mann : A.person);
  const tittel = A => `${ROLLER[A.rolle].navn} ${fornavn(A)}`;
  const des = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

  // ---------- BESLUTNINGENE (rene funksjoner: tall inn, valg ut) ----------
  // LEIRSJEFEN, MATEN. m: { mat (rasjoner), forbruk (rasjoner per døgn: spiser − drivhus) }. Gir { rasjoner, dagerFør, tekst, dårlig } eller null.
  function matValg(m, regler, l, r) {
    const mål = +regler.mat || 0; if (!(mål > 0) || !(m.forbruk > 0)) return null;
    const dager = m.mat / m.forbruk, M = REGLER.mat, utløs = mål * (l >= 1 ? 1 : M.sen + (1 - M.sen) * dyk(l) / dyk(1));
    if (dager >= utløs) return null;
    let n = Math.ceil(((mål + M.buffer) * m.forbruk - m.mat) / M.steg) * M.steg; const dårlig = r() < feilSjanse(l);
    if (dårlig) n = Math.max(M.steg, Math.ceil(n * M.lite / M.steg) * M.steg);
    return n > 0 ? { rasjoner: n, dagerFør: dager, dårlig } : null;
  }
  // LEIRSJEFEN, DIESELEN. d: { liter, perDøgn, plass }. Gir { liter, dagerFør, dårlig } eller null.
  function dieselValg(d, regler, l, r) {
    const mål = +regler.diesel || 0; if (!(mål > 0) || !(d.perDøgn > 0)) return null;
    const dager = d.liter / d.perDøgn, M = REGLER.diesel, utløs = mål * (l >= 1 ? 1 : M.sen + (1 - M.sen) * dyk(l) / dyk(1));
    if (dager >= utløs) return null;
    let n = Math.ceil(((mål + M.buffer) * d.perDøgn - d.liter) / M.steg) * M.steg; const dårlig = r() < feilSjanse(l);
    if (dårlig) n = Math.max(M.steg, Math.ceil(n * M.lite / M.steg) * M.steg);
    n = Math.min(n, Math.floor((d.plass || 0) / M.steg) * M.steg);
    return n > 0 ? { liter: n, dagerFør: dager, dårlig } : null;
  }
  // LEIRSJEFEN, BYGGINGEN. b: { plan: [{ pid, type, pris }], kø (jobber i køen), utenSeng }. Gir { pid, type, dårlig } eller null.
  function byggValg(b, regler, l, r) {
    if (regler.bygg !== 'plan' || !b.plan || !b.plan.length || (b.kø || 0) >= REGLER.bygg.kø) return null;
    let liste = b.plan.slice(); const dårlig = r() < feilSjanse(l);
    // sengene først: brakkene i planen når noen sover i telt (et dårlig valg glemmer det)
    if (regler.senger === 'ja' && b.utenSeng > 0 && !dårlig) { const br = liste.filter(q => q.type === 'brakke'); if (br.length) liste = br.concat(liste.filter(q => q.type !== 'brakke')); }
    // et dårlig valg: det dyreste i planen først
    if (dårlig) liste.sort((a, c) => (c.pris || 0) - (a.pris || 0));
    return { pid: liste[0].pid, type: liste[0].type, dårlig };
  }
  // FORMANNEN. st: maskinens status { grunn }; folk: [{ id, navn, oppgave, maskin (ferdigheten), arbeidsfør, prio (jobbens prioritet, 1 = først), låst }]
  // Gir { person, fra, dårlig } eller null. Regelen «vakt»: aldri fra vakt, overvåking, stell eller kjøkken; «fri»: bare de som har fri.
  const VERN = ['vakt', 'overvåking', 'stell', 'kjøkken'];
  function formannValg(st, folk, regler, l, r) {
    if (!st || st.grunn !== 'folk') return null;
    const regel = regler.folk || 'vakt';
    let K = (folk || []).filter(p => p.arbeidsfør && p.oppgave !== 'maskin' && !p.låst);
    if (regel === 'fri') K = K.filter(p => p.oppgave === 'fri');
    else if (regel === 'vakt') K = K.filter(p => !VERN.includes(p.oppgave));
    if (!K.length) return null;
    const dårlig = r() < feilSjanse(l);
    // det gode valget: de med fri først, så fra jobben med lavest prioritet (høyest tall), og den som er best ved maskinen
    const rang = p => (p.oppgave === 'fri' ? 0 : VERN.includes(p.oppgave) ? 20 - (p.prio || 3) : 10 - (p.prio || 3));
    if (!dårlig) K.sort((a, b) => rang(a) - rang(b) || (b.maskin || 1) - (a.maskin || 1));
    else K.sort((a, b) => (a.maskin || 1) - (b.maskin || 1));
    return { person: K[0].id, fra: K[0].oppgave, dårlig };
  }
  // FORHANDLEREN, BYENE. by: { folk, kan (trinnet som kan forhandles nå, eller null) , grunnpris }. Gir tilbudet eller null.
  function byTilbud(by, regler, l) {
    const grense = +regler.by || 0; if (!(grense > 0) || !by || !by.kan) return null;
    if (by.kan === 'handel' && regler.trinn !== 'begge') return null;
    const min = grense * (by.folk || 0), åpning = Math.round(Math.max(min, (by.grunnpris || min) * (1 + REGLER.forhandler.åpning * dyk(l))) / 1000) * 1000;
    // budene i rekkefølge: åpningsbudet, grunnprisen og til slutt grensen din (sier byen nei, går forhandleren ned til neste)
    const bud = [...new Set([åpning, Math.round(Math.max(min, by.grunnpris || min) / 1000) * 1000, Math.ceil(min / 1000) * 1000].map(v => Math.max(1000, v)))].sort((a, b) => b - a);
    return { trinn: by.kan, pris: bud[0], bud, løfte: REGLER.forhandler.løfte, varighet: REGLER.forhandler.varighet, min };
  }
  // Svaret på et motbud: ja når prisen er over grensen. Et dårlig valg: ja litt under grensen, eller nei til et godt motbud.
  function svarMotbud(motPris, min, l, r) {
    const dårlig = r() < feilSjanse(l);
    if (motPris >= min) { const nei = dårlig && r() < .5; return { ja: !nei, dårlig: nei }; }
    if (dårlig && motPris >= min * REGLER.forhandler.under) return { ja: true, dårlig: true };
    return { ja: false, dårlig: false };
  }
  // FORHANDLEREN, FIRMAENE. Hvilke samarbeid sier regelen ja til?
  const firmaTyper = regler => (regler.firma === 'fast' ? ['fast'] : regler.firma === 'fastVern' ? ['fast', 'vern'] : []);
  // TROPPSJEFEN. t: { ammo (0–1), hjemme, påVei }. Gir 'hjem' eller null.
  function troppValg(t, regler, l) {
    const g = +regler.ammo || 0; if (!(g > 0) || t.hjemme || t.påVei) return null;
    const grense = l >= 1 ? g : g * (REGLER.tropp.sen + (1 - REGLER.tropp.sen) * dyk(l) / dyk(1));
    return (Number.isFinite(t.ammo) ? t.ammo : 1) < grense ? 'hjem' : null;
  }
  // KASSEREREN. Får kjøpet gå? penger nå, pris. Gir { ok, dårlig }. Et dårlig valg: slipper kjøpet gjennom.
  function kassaValg(penger, pris, regler, l, r) {
    const min = +regler.minimum || 0; if (!(min > 0) || !(pris > 0) || penger - pris >= min) return { ok: true, dårlig: false };
    const dårlig = r() < feilSjanse(l); return { ok: dårlig, dårlig };
  }
  // Kan det betales utbytte? uke: { resultat (kr siste 7 døgn) }, penger, kr
  function utbytteLov(regler, uke, penger, kr) {
    if (regler.utbytte === 'aldri') return { ok: false, grunn: 'Kassereren betaler aldri utbytte (din regel).' };
    if (!uke || !(uke.resultat > 0)) return { ok: false, grunn: 'Uka gikk ikke i pluss.' };
    if (penger - kr < (+regler.minimum || 0)) return { ok: false, grunn: `Kassa skal ha minst ${kr2(regler.minimum)}.` };
    return { ok: true, grunn: '' };
  }
  const kr2 = v => des(v / 1e6, 1) + ' mill. kr';
  // LOKKING: får en leder et bud fra en rival i dag? Gir budet (kr per døgn) eller null
  function lokkBud(A, p, r) {
    const K = REGLER.lokk, l = ledelse(p); if (!(l > .9) || (p.lojal ?? .6) >= K.lojal) return null;
    if (r() >= K.sjanse * klem((l - .9) / .55, 0, 1)) return null;
    return rund((p.lønn > 0 ? p.lønn : REGLER.lønn.standard) * K.påslag, REGLER.lønn.steg);
  }
  // VERDIEN for børsen: { kr, antall, snitt, roller } – ledere = liste med { rolle, ledelse }
  function verdi(ledere) {
    const V = REGLER.verdi, L = ledere || []; let kr = 0; for (const A of L) kr += V.per * (A.ledelse - V.fra) / .45;
    const roller = new Set(L.map(A => A.rolle)); if (RO.every(r => roller.has(r))) kr += V.hel;
    return { kr: Math.round(kr / 1e5) * 1e5, antall: L.length, snitt: L.length ? Math.round(L.reduce((s, A) => s + A.ledelse, 0) / L.length * 100) / 100 : 0, roller: [...roller] };
  }

  // ---------- KOMMANDOENE ----------
  // M: { tilstand(side) -> S, person(side, rolle, del, id) -> personposten, tid() -> spillminutter, endret(side, hva, svar) }
  function registrerKommandoer(K, M = {}) {
    const side = c => (c && c.side) || 'blå', S = c => (M.tilstand ? M.tilstand(side(c)) : null), t = () => (M.tid ? M.tid() : 0);
    const uten = c => (!S(c) ? 'Ingen leir ennå.' : null), ferdig = (c, hva, svar) => { if (M.endret) M.endret(side(c), hva, svar); return svar; };
    const finnP = (c, k) => (M.person ? M.person(side(c), k.rolle, k.del, k.person) : null);
    K.registrer('lederUtnevn', { leir: true,
      sjekk: (k, c) => uten(c) || (!ROLLER[k.rolle] ? 'Ukjent rolle.' : !finnP(c, k) ? 'Fant ikke personen.' : null),
      utfør: (k, c) => ferdig(c, 'utnevn', utnevn(S(c), k.rolle, k.del, finnP(c, k), t())), beskriv: k => `gjør en til ${ROLLER[k.rolle] ? ROLLER[k.rolle].navn.toLowerCase() : 'leder'}` });
    K.registrer('lederAv', { leir: true, sjekk: (k, c) => uten(c) || (!S(c).ledere[k.nøkkel] ? 'Ingen leder der.' : null),
      utfør: (k, c) => { const A = S(c).ledere[k.nøkkel]; const p = M.person ? M.person(side(c), A.rolle, String(k.nøkkel).split(':').slice(1).join(':'), ref(A)) : null; return ferdig(c, 'av', av(S(c), k.nøkkel, p, t())); },
      beskriv: () => 'tar en leder av rollen' });
    K.registrer('lederRegel', { leir: true, sjekk: (k, c) => uten(c) || (!S(c).ledere[k.nøkkel] ? 'Ingen leder der.' : null),
      utfør: (k, c) => ferdig(c, 'regel', settRegel(S(c), k.nøkkel, k.regel, k.verdi)), beskriv: () => 'endrer en regel for en leder' });
    // lederSelv { nøkkel: null = alle, på: true = du styrer selv til i morgen kl. 06 (false = lederen tar over igjen) }
    K.registrer('lederSelv', { leir: true, sjekk: (k, c) => uten(c) || (k.nøkkel != null && !S(c).ledere[k.nøkkel] ? 'Ingen leder der.' : null),
      utfør: (k, c) => { const s = S(c), til = k.på === false ? null : nesteMorgen(t()); if (k.nøkkel == null) s.selvTil = til; else s.ledere[k.nøkkel].selvTil = til; return ferdig(c, 'selv', { ok: true, til }); },
      beskriv: k => (k.på === false ? 'lar lederne styre igjen' : 'styrer selv i dag') });
  }

  const api = { REGLER, ROLLER, RO, VERN, ledelse, dyk, feilSjanse, lønnFaktor, lederLønn, dyktighetOrd, rng, ny, fraJSON, nøkkel, nøkkelRolle, renRegler, standardRegler,
    regelTekst, ref, iArbeid, nesteMorgen, lederFor, utnevn, av, settRegel, notér, tittel, fornavn, des, matValg, dieselValg, byggValg, formannValg, byTilbud, svarMotbud,
    firmaTyper, troppValg, kassaValg, utbytteLov, lokkBud, verdi, registrerKommandoer };
  if (NODE) module.exports = api; else rot.Ledere = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
