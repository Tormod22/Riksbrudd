/* Riksbrudd – REGIONEN: regler uten DOM (Node: require('./region'); nettleser: globalThis.Region). Natt til 18. nov.
 * Gjennomgangen sa: spilleren kan kjøpe seg ut av alt, og tettstedene gir lite. Her får tettstedene en mening:
 *  - hvert tettsted gir noe eget etter hva som ligger der (type): mat, tre, stål, betong, diesel, folk – og skatt i kroner;
 *  - varene må fram til leiren langs en handelsrute (rett linje, gjerne via et annet tettsted du holder). Fiender nær ruta
 *    truer eller stenger den, egne lag nær ruta vokter den;
 *  - du velger skatt per tettsted: hardere skatt gir mer nå, men lojaliteten synker, og et tettsted uten lojalitet gjør opprør;
 *  - uten strøm (ingen hele kraftverk i nærheten, se garnison.js) gir tettstedet mindre og blir misfornøyd;
 *  - svartebørsen dukker opp av og til med sjeldne ting;
 *  - reparerer du en bru eller et kraftverk, blir tettstedene rundt mer lojale, og et nøytralt tettsted kan gå over til deg;
 *  - olje (tonn, basen) og diesel (liter, leiren) kan veksles.
 * «Døgn» er et handelsdøgn: et spilldøgn eller ti minutter ekte spilling (som markedet), det som kommer først.
 * ALLE TALL ER CLAUDES FORSLAG (spillverdier, ikke fasit).
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;

  // Claudes forslag – samlet her
  const REGLER = {
    døgnEkteSek: 600,                       // et handelsdøgn er høyst ti minutter ekte spilling
    // hva som gjør et tettsted til hva (meter til nærmeste)
    nær: { olje: 8000, kai: 1500, kraft: 6000 },
    byFolk: 5000,                            // fra så mange innbyggere er det en by
    industriFolk: 1000,                      // et industristed har minst så mange innbyggere (og et kraftverk innen nær.kraft)
    // skatt i kroner per innbygger per døgn (ved «vanlig»), og taket per tettsted
    // (Runde 3: 300 kr ga 2,6 mill. kr per ti minutter med sju tettsteder i Ryfylke – for mye mot 40 mill. i startkasse. Med 100 kr gir de
    // samme sju ca. 0,9 mill., så et kontrollrom til 15 mill. tar rundt tre timer: inntekten merkes, men pengene er fortsatt knappe.)
    skattKr: 100, skattMaks: 1.5e6,
    // lojalitet 0–100
    lojStart: 50, lojEtterOpprør: 30, opprørVed: 10,
    lojGarnison: 10,                         // en garnison i tettstedet løfter målet
    lojUtenStrøm: -15,                       // uten strøm synker målet
    lojFaktor: [.6, 1.4],                    // varene ganges med dette fra lojalitet 0 til 100
    uro: .5,                                 // tettsted i opprør som holdes av en garnison, gir halvparten
    // handelsruter
    rute: { stengt: 1500, truet: 4000, vakt: 1500, hopp: 30000, kortere: 1000, truetGir: .5 },
    // gjenoppbygging
    bygg: { lojal: 20, radius: 15000, vinn: 10000 },
    // veksling mellom olje (tonn på basen) og diesel (liter i leiren): det meste går tapt i et enkelt feltraffineri
    veksle: { literPerTonn: 10, literForTonn: 15, parti: 10 },
    // svartebørsen: sjanse per døgn for at en selger dukker opp, og hvor mange ting han har
    børs: { sjanse: .4, antall: 2 },
  };

  // Typene: hva tettstedet lever av, og hva det gir per 1000 innbyggere per døgn [per 1000, minst, høyst]
  const TYPER = {
    oljeby: { navn: 'Oljeby', tekst: 'oljeanlegg i nærheten', gir: { diesel: [150, 60, 900] } },
    havn: { navn: 'Havn', tekst: 'havn eller ferjekai: fiske og varer sjøvegen', gir: { mat: [20, 8, 120], diesel: [60, 20, 400] } },
    industri: { navn: 'Industristed', tekst: 'kraftverk like ved: verksteder og smelteverk', gir: { stål: [1.5, .5, 10], betong: [2, 1, 12] } },
    by: { navn: 'By', tekst: 'mange folk: rekrutter og verksteder', gir: { folk: [.1, .3, 2], stål: [.4, .5, 5] } },
    bygd: { navn: 'Bygd', tekst: 'jordbruk og skog', gir: { mat: [30, 10, 150], tre: [5, 2, 25] } },
  };
  const VARER = ['mat', 'tre', 'betong', 'stål', 'diesel', 'folk', 'penger'];
  const ENHET = { mat: 'rasjoner', tre: 'm³ tre', betong: 'm³ betong', stål: 't stål', diesel: 'l diesel', folk: 'rekrutter', penger: 'kr' };

  // Skattenivåene: f = faktor på varer og skatt, mål = lojaliteten den går mot, fart = poeng per døgn.
  // «Støtte» koster deg penger (koster kr per innbygger per døgn) og gir ingen varer.
  const SKATT = {
    støtte: { navn: 'Støtte', f: 0, mål: 100, fart: 15, koster: 50, tekst: 'Du gir i stedet for å ta: koster penger, lojaliteten stiger fort.' },
    lett: { navn: 'Lett', f: .6, mål: 80, fart: 6, tekst: 'Litt mindre varer, lojaliteten stiger.' },
    vanlig: { navn: 'Vanlig', f: 1, mål: 55, fart: 4, tekst: 'Vanlig skatt, lojaliteten holder seg midt på treet.' },
    hard: { navn: 'Hard', f: 1.7, mål: 0, fart: 10, tekst: 'Mye mer nå, men lojaliteten faller – til slutt blir det opprør (uro hvis du har garnison).' },
  };
  const SKATTER = Object.keys(SKATT);

  // ---------- typen ----------
  // om: { olje, kai, kraft } = meter til nærmeste oljeanlegg på land, kai og kraftverk (Infinity når ingen)
  function type(folk, om = {}) {
    const N = REGLER.nær, inf = v => (v === undefined || v === null ? Infinity : v);
    if (inf(om.olje) <= N.olje) return 'oljeby';
    if (inf(om.kraft) <= N.kraft && folk >= REGLER.industriFolk && folk < REGLER.byFolk) return 'industri';
    if (folk >= REGLER.byFolk) return 'by';
    if (inf(om.kai) <= N.kai) return 'havn';
    return 'bygd';
  }
  // Det tettstedet gir per døgn ved vanlig skatt, full rute, strøm og lojalitet midt på (faktor 1)
  function grunn(folk, t) {
    const ut = {}, G = (TYPER[t] || TYPER.bygd).gir;
    for (const [k, [per, min, maks]] of Object.entries(G)) ut[k] = klem(folk / 1000 * per, min, maks);
    ut.penger = Math.min(REGLER.skattMaks, folk * REGLER.skattKr);
    return ut;
  }
  const lojFaktor = loj => REGLER.lojFaktor[0] + (REGLER.lojFaktor[1] - REGLER.lojFaktor[0]) * klem(loj, 0, 100) / 100;
  const ruteFaktor = s => (s === 'stengt' ? 0 : s === 'truet' ? REGLER.rute.truetGir : 1);
  // Samlet faktor på varene. st: { loj, skatt, strøm, rute: 'åpen'|'truet'|'stengt', uro, utenStrøm = faktoren uten strøm }
  function faktor(st) {
    const S = SKATT[st.skatt] || SKATT.vanlig;
    return S.f * lojFaktor(st.loj) * (st.strøm === false ? (st.utenStrøm || .4) : 1) * ruteFaktor(st.rute) * (st.uro ? REGLER.uro : 1);
  }
  // Det tettstedet faktisk gir per døgn nå. «Støtte» gir ingen varer og koster penger (negativt tall).
  function gir(folk, t, st) {
    const g = grunn(folk, t), f = faktor(st), ut = {}, S = SKATT[st.skatt] || SKATT.vanlig;
    for (const k of Object.keys(g)) ut[k] = g[k] * f;
    if (S.koster) ut.penger = -folk * S.koster;
    return ut;
  }
  // «36 rasjoner, 6 m³ tre og 360 000 kr»
  function girTekst(g, kroner) {
    const d = [];
    for (const k of VARER) { const v = g[k]; if (!v) continue;
      if (k === 'penger') d.push(kroner ? kroner(Math.round(v / 1000) * 1000) : Math.round(v) + ' kr');
      else if (k === 'folk') d.push(String(r1(v)).replace('.', ',') + (r1(v) === 1 ? ' rekrutt' : ' rekrutter'));
      else d.push((v >= 20 ? Math.round(v) : String(r1(v)).replace('.', ',')) + ' ' + ENHET[k]); }
    return d.length ? d.join(', ') : 'ingenting';
  }

  // ---------- lojalitet ----------
  function lojMål(st) {
    const S = SKATT[st.skatt] || SKATT.vanlig;
    return klem(S.mål + (st.garnison ? REGLER.lojGarnison : 0) + (st.strøm === false ? REGLER.lojUtenStrøm : 0), 0, 100);
  }
  // Lojaliteten går mot målet med skattens fart (poeng per døgn). døgn = hvor stor del av et døgn som er gått.
  function lojSteg(loj, st, døgn) {
    const mål = lojMål(st), fart = (SKATT[st.skatt] || SKATT.vanlig).fart * døgn;
    return loj < mål ? Math.min(mål, loj + fart) : Math.max(mål, loj - fart);
  }
  // Opprør: lojaliteten er i bunnen. Uten garnison blir tettstedet nøytralt; med garnison holdes det, men gir lite ('uro').
  const opprør = (loj, garnison) => (loj > REGLER.opprørVed ? null : garnison ? 'uro' : 'tapt');
  const lojOrd = loj => (loj >= 75 ? 'trofast' : loj >= 50 ? 'rolig' : loj >= 30 ? 'misfornøyd' : loj > REGLER.opprørVed ? 'på kanten av opprør' : 'opprør');

  // ---------- handelsruter ----------
  // Avstanden fra punktet p til linjestykket a–b
  function tilLinje(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 ? klem(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1) : 0;
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
  }
  // Ett ledd: åpen, truet eller stengt etter nærmeste fiende. Et eget lag nær leddet (vakt) gjør det ett hakk tryggere.
  function ledd(a, b, fiender, egne) {
    const Q = REGLER.rute; let nær = Infinity, fi = null;
    for (const f of fiender) { const d = tilLinje(f, a, b); if (d < nær) { nær = d; fi = f; } }
    const vakt = egne.some(e => tilLinje(e, a, b) <= Q.vakt);
    let status = nær <= Q.stengt ? 'stengt' : nær <= Q.truet ? 'truet' : 'åpen';
    if (vakt && status !== 'åpen') status = status === 'stengt' ? 'truet' : 'åpen';
    return { status, meter: nær, fiende: fi, vakt };
  }
  // Ruta fra et tettsted til leiren: via nærmeste tettsted du holder som ligger nærmere leiren (høyst Q.hopp unna), ellers rett hjem.
  // byer: de du holder [{ id, x, y, navn }]. Gir punktene [by, …, leir].
  function kjede(by, byer, leir) {
    const Q = REGLER.rute, ut = [by], sett = new Set([by.id]); let her = by;
    for (let n = 0; n < 12; n++) {
      const hjem = Math.hypot(her.x - leir.x, her.y - leir.y); let best = null, bd = Math.min(Q.hopp, hjem);
      for (const o of byer) { if (sett.has(o.id)) continue; const d = Math.hypot(o.x - her.x, o.y - her.y);
        if (d < bd && Math.hypot(o.x - leir.x, o.y - leir.y) < hjem - Q.kortere) { bd = d; best = o; } }
      if (!best) break; ut.push(best); sett.add(best.id); her = best;
    }
    ut.push({ id: 'leir', navn: 'leiren', x: leir.x, y: leir.y });
    return ut;
  }
  const RANG = { åpen: 0, truet: 1, stengt: 2 };
  // Hele ruta: det verste leddet gjelder. Gir { status, punkter, ledd: [{ status, meter, fiende, vakt }], via: [navn], lengde }
  function rute(by, byer, leir, fiender, egne) {
    const P = kjede(by, byer, leir), L = []; let status = 'åpen', lengde = 0;
    for (let i = 0; i + 1 < P.length; i++) { const l = ledd(P[i], P[i + 1], fiender, egne); L.push(l); lengde += Math.hypot(P[i + 1].x - P[i].x, P[i + 1].y - P[i].y);
      if (RANG[l.status] > RANG[status]) status = l.status; }
    return { status, punkter: P, ledd: L, via: P.slice(1, -1).map(p => p.navn), lengde };
  }
  const ruteOrd = s => (s === 'stengt' ? 'stengt' : s === 'truet' ? 'truet' : 'åpen');

  // ---------- gjenoppbygging ----------
  // Du har reparert noe ved (x, y). byer: [{ id, x, y, eier, fiendeI }]. Gir hvilke av dine som blir mer lojale, og det nøytrale
  // tettstedet (nærmest, uten fiender i) som går over til deg.
  function gjenoppbygg(x, y, byer) {
    const B = REGLER.bygg, lojale = []; let vunnet = null, bd = B.vinn;
    for (const b of byer) { const d = Math.hypot(b.x - x, b.y - y);
      if (b.eier === 'blå' && d <= B.radius) lojale.push(b.id);
      if (!b.eier && !b.fiendeI && d <= bd) { bd = d; vunnet = b.id; } }
    return { lojale, vunnet, pluss: B.lojal };
  }

  // ---------- motstandernes tettsteder ----------
  // Også motstanderne har nytte av det de holder (Claudes forslag): industristeder, byer og oljebyer gir bedre våpen (treff +5 % hver,
  // høyst +20 %), bygder og havner gir mat og folk (garnisonene forsterkes 25 % raskere for hver, høyst dobbelt så fort).
  // typer: lista over typene til tettstedene siden holder. Gir { treff, forsterk } (faktorer, 1 = ingen fordel).
  const FORDEL = { treff: .05, treffMaks: .2, forsterk: .25, forsterkMaks: 1 };
  function fordel(typer) {
    let v = 0, m = 0; for (const t of typer || []) { if (t === 'industri' || t === 'by' || t === 'oljeby') v++; else m++; }
    return { treff: 1 + Math.min(FORDEL.treffMaks, FORDEL.treff * v), forsterk: 1 + Math.min(FORDEL.forsterkMaks, FORDEL.forsterk * m), antall: v + m };
  }

  // ---------- veksling olje ↔ diesel ----------
  const Veksle = {
    // tonn olje -> liter diesel (så mye som får plass); gir { tonn, liter } eller { feil }
    tilDiesel(tonn, harTonn, plassLiter) {
      const t = Math.min(tonn, Math.floor(harTonn), Math.floor(plassLiter / REGLER.veksle.literPerTonn));
      if (harTonn < 1) return { feil: 'Det er ingen olje på basen.' };
      if (t < 1) return { feil: 'Ingen plass til mer diesel: bygg en dieseltank.' };
      return { tonn: t, liter: t * REGLER.veksle.literPerTonn };
    },
    // liter diesel -> tonn olje; gir { liter, tonn } eller { feil }
    tilOlje(tonn, harLiter) {
      const t = Math.min(tonn, Math.floor(harLiter / REGLER.veksle.literForTonn));
      if (t < 1) return { feil: `For lite diesel: ${REGLER.veksle.literForTonn} liter gir ett tonn.` };
      return { tonn: t, liter: t * REGLER.veksle.literForTonn };
    },
    tekst: () => `Olje (tonn) står på basen og går til nye enheter, kjøretøy og ammunisjon. Diesel (liter) står i leiren og driver aggregatene. De er samme råvare: ${REGLER.veksle.literPerTonn} liter diesel per tonn olje i feltraffineriet, og ${REGLER.veksle.literForTonn} liter diesel blandes til ett tonn fyringsolje.`,
  };

  // ---------- svartebørsen ----------
  // en: kan bare kjøpes så mange ganger. Virkningen står i visningen (region-visning.js).
  const BØRS = {
    medisin: { navn: 'Medisiner', pris: 2.5e6, tekst: 'Antibiotika og smertestillende: seks sårede soldater blir kampklare, og de syke i leiren blir friske.', sårede: 6 },
    nattsikt: { navn: 'Nattsikt', pris: 6e6, en: 1, tekst: 'Nattbriller til lagene: de ser 40 % lenger mellom kl. 22 og 05.', sikt: 1.4, fra: 22, til: 5 },
    våpen: { navn: 'Kasse med tunge våpen', pris: 5e6, en: 2, tekst: 'Maskingevær og panservåpen: lagene dine treffer 15 % bedre (kan kjøpes to ganger).', treff: .15 },
    smugler: { navn: 'Smuglerdiesel', pris: 5e6, tekst: '800 liter diesel utenom markedet – dyrt, men den finnes når hyllene er tomme.', liter: 800 },
  };
  const Bors = {
    VARER: BØRS,
    // et nytt døgn: kanskje en selger. har: { id: antall kjøpt }. Gir lista over id-er (kan være tom).
    tilbud(rng, har = {}) {
      if (rng() >= REGLER.børs.sjanse) return [];
      const kan = Object.keys(BØRS).filter(id => !BØRS[id].en || (har[id] || 0) < BØRS[id].en), ut = [];
      while (ut.length < REGLER.børs.antall && kan.length) ut.push(kan.splice(Math.floor(rng() * kan.length), 1)[0]);
      return ut;
    },
    kan: (id, har = {}) => !!BØRS[id] && (!BØRS[id].en || (har[id] || 0) < BØRS[id].en),
    // er det natt for nattsikten? time = klokkeslettet 0–24
    natt: time => time >= BØRS.nattsikt.fra || time < BØRS.nattsikt.til,
    treff: har => 1 + BØRS.våpen.treff * Math.min(BØRS.våpen.en, (har && har.våpen) || 0),
  };

  // ---------- tilstanden ----------
  // byer: id -> { loj, skatt, uro }, pott: varer på vei som ikke er hele ennå, har: kjøpt på svartebørsen
  const ny = () => ({ versjon: 1, byer: {}, pott: {}, døgn: 0, time: 0, børs: { tilbud: [], dag: -1 }, har: {}, sist: {}, medisin: 0 });
  function by(S, id, start) { return S.byer[id] || (S.byer[id] = { loj: start === undefined ? REGLER.lojStart : start, skatt: 'vanlig', uro: false }); }
  function settSkatt(S, id, skatt) { if (!SKATT[skatt]) return false; by(S, id).skatt = skatt; return true; }
  function fraJSON(d) { const S = ny(); if (!d || typeof d !== 'object') return S;
    for (const [id, b] of Object.entries(d.byer || {})) S.byer[id] = { loj: klem(+b.loj || 0, 0, 100), skatt: SKATT[b.skatt] ? b.skatt : 'vanlig', uro: !!b.uro };
    for (const k of VARER) if (d.pott && d.pott[k] > 0) S.pott[k] = +d.pott[k];
    S.døgn = +d.døgn || 0; S.time = +d.time || 0; S.medisin = +d.medisin || 0;
    if (d.børs && Array.isArray(d.børs.tilbud)) S.børs = { tilbud: d.børs.tilbud.filter(id => BØRS[id]), dag: +d.børs.dag || 0 };
    for (const id of Object.keys(BØRS)) if (d.har && d.har[id] > 0) S.har[id] = Math.floor(d.har[id]);
    return S; }

  const api = { REGLER, TYPER, VARER, ENHET, SKATT, SKATTER, type, grunn, faktor, lojFaktor, ruteFaktor, gir, girTekst, lojMål, lojSteg, opprør, lojOrd,
    tilLinje, ledd, kjede, rute, ruteOrd, gjenoppbygg, FORDEL, fordel, Veksle, Bors, ny, by, settSkatt, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Region = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
