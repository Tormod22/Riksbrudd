/* Riksbrudd – BYENE PÅ LAGET (fase Ø3, 28. nov; docs/plan-selskap-okonomi.md kapittel 3). Regler uten DOM
 * (Node: require('./byavtale'); nettleser: globalThis.Byavtale). Visningen: spill/byavtale-visning.js (window.ByavtaleSpill).
 *
 * Hvert tettsted får tre tall (0–100): TILLIT (har du holdt det du lovet), FRYKT (hvor hardhendt du er) og BEHOV (hva byen mangler nå:
 * trygghet, strøm, mat, ved – regnet av det som finnes i spillet). Byrådet har en leder med navn og en fast holdning per tettsted
 * (forsiktig, grådig, patriot, redd). Trinnene: nøytral -> kunde -> beskyttelse -> handel -> medlem (tabellen i 3.2).
 *  - kunde: dere har levert minst én kontrakt for byen (selskap.js, oppdragsgiver «by» med giver.by).
 *  - beskyttelse: byen betaler fast hvert døgn; du lover mann i byen eller innen 3 km og å svare på angrep innen svartiden.
 *  - handel: byen betaler en handelsgevinst hvert døgn og sender varene sine (Region.grunn) langs handelsruta.
 *  - medlem: byen blir din (eier blå i Garnison) og betaler skatt (region.js) uten opprør; folket teller fullt i krigsstillingen.
 * Forhandlingen: pris, løfte (mann og svartid) og varighet (7/14/30 døgn) -> ja, nei eller motbud etter behov og holdning.
 * Avtalen holdes eller brytes: hver time telles om nok egne mann står i byen eller innen 3 km; hvert døgn går tilliten opp eller ned.
 * Byen sier opp med et døgns varsel og forteller nabobyene. Tatt med makt: frykt 80 og tillit 10 (kapittel 18, spørsmål 2: forslaget).
 * TILLIT OG LOJALITET (valget): for et tettsted du holder (eier blå – tatt med makt eller medlem) er tilliten det samme tallet som
 * lojaliteten i region.js (visningen leser og skriver Region-lojaliteten). For de andre står tilliten her.
 * ALLE TALL ER CLAUDES FORSLAG (spillverdier, ikke fasit) – justert med økonomitesten (pipeline/fliser/okosim-byer.js).
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  // fast hash av en tekst (samme tettsted gir samme leder og holdning)
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // Claudes forslag – samlet her
  const REGLER = {
    start: { tillit: 30, frykt: 5 },                 // et nøytralt tettsted
    makt: { tillit: 10, frykt: 80 },                 // tatt med våpen
    lydig: 50,                                       // frykt fra 50 og en garnison: byen gjør ikke opprør (den er redd)
    fryktFall: 3,                                    // frykten glir ned så mange poeng per døgn
    trinn: {
      kunde: { tillit: 0 },
      beskyttelse: { tillit: 40 },
      handel: { tillit: 55, krever: 'beskyttelse' },
      medlem: { tillit: 70, fryktUnder: 50, krever: 'handel' },
    },
    // kr per innbygger per døgn (planen: ca. 15 for beskyttelse). Justert med økonomitesten (okosim-byer.js): små bygder betaler minst
    // minstePerDøgn, så en beskyttelsesavtale med en bygd på 800 dekker lønna til to mann (15 000 kr per person per døgn).
    pris: { beskyttelse: 15, handel: 12, minst: { beskyttelse: 30000, handel: 25000 }, tak: { beskyttelse: 600000, handel: 450000 } },
    // løftene: [mann, svartid i timer]; et større løfte er verdt mer for byen
    løfter: [{ id: 'lite', mann: 2, svartid: 4, verdi: .85 }, { id: 'vanlig', mann: 4, svartid: 2, verdi: 1 }, { id: 'stort', mann: 6, svartid: 1, verdi: 1.2 }],
    varigheter: [7, 14, 30],
    radius: 3000,                                    // lag innen 3 km fra midten av byen holder løftet
    holdtAndel: .7,                                  // så stor del av døgnets timer må løftet være holdt
    tillit: { kontrakt: 6, holdt: 2, brutt: -8, hjelp: 5, ikkeHjelp: -10, oppsagt: -15, nabo: -5, ferdig: 3, rival: -4 },
    oppsigelse: { tillit: 25, brudd: 3, varsel: 1440 },   // byen sier opp under tillit 25 eller etter tre brudd; varsel i spillminutter
    nabo: 15000,                                     // nabobyene som får høre om det (meter)
    hjelp: { radius: 4000, framme: 1500, pause: 240 },  // fiender innen 4 km ber om hjelp; egne innen 1,5 km = hjelpen er framme
    // forhandlingen: tilbud under verdien = ja, opptil «motbud» × verdien = motbud, over = nei
    motbud: 1.35,
    // rivalene: hvor langt fra egne tettsteder de frir, og hvor lenge de forhandler (spillminutter)
    rival: { radius: 20000, tid: 1440, sjanse: .35, overby: .85 },
  };
  const TRINN = ['nøytral', 'kunde', 'beskyttelse', 'handel', 'medlem'];
  const TRINNORD = { nøytral: 'Nøytral', kunde: 'Kunde', beskyttelse: 'Beskyttelse', handel: 'Handel', medlem: 'Medlem' };
  const HOLDNING = {
    forsiktig: { navn: 'forsiktig', tekst: 'vil ha mange mann og rask hjelp, og liker korte avtaler', pris: 1, løfte: 1.3, kort: true },
    grådig: { navn: 'grådig', tekst: 'presser prisen og bryr seg lite om løftene', pris: .8, løfte: .6 },
    patriot: { navn: 'patriot', tekst: 'stoler sakte på leiesoldater, og lar seg ikke true', pris: .95, løfte: 1, lang: true, fryktNei: 40, tillit: .7 },
    redd: { navn: 'redd', tekst: 'betaler godt for trygghet, og frykt gjør den medgjørlig', pris: 1.15, løfte: 1.1, fryktJa: 50 },
  };
  const HOLDNINGER = Object.keys(HOLDNING);
  const FORNAVN = ['Kari', 'Ola', 'Ingrid', 'Per', 'Solveig', 'Arne', 'Randi', 'Bjørn', 'Tone', 'Svein', 'Marit', 'Geir', 'Liv', 'Odd', 'Hilde', 'Tor', 'Berit', 'Knut', 'Gunn', 'Rolf'];
  const ETTERNAVN = ['Bakken', 'Haugen', 'Lie', 'Dahl', 'Moen', 'Brekke', 'Sletten', 'Nygård', 'Lunde', 'Berg', 'Strand', 'Vik', 'Myhre', 'Aas', 'Løken', 'Rønning', 'Holm', 'Eide'];

  // Byrådet: små bygder har en ordfører, store byer et krisestyre. Fast per tettsted (hash av id).
  function leder(id, folk) {
    const h = hash('by:' + id), h2 = hash('leder:' + id);
    return { navn: FORNAVN[h % FORNAVN.length] + ' ' + ETTERNAVN[h2 % ETTERNAVN.length], holdning: HOLDNINGER[(h >>> 7) % HOLDNINGER.length],
      tittel: (folk || 0) >= 5000 ? 'leder for krisestyret' : 'ordfører' };
  }

  // BEHOV: hva byen mangler nå. om: { fiendeKm (nærmeste fiende), strøm (bool), type (Region.type), vinter (bool), garnison (bool), rivalNær }
  // Gir { trygghet, strøm, mat, ved, hoved, verdi (0–100 = hvor mye byen trenger deg) }
  function behov(om = {}) {
    const km = Number.isFinite(om.fiendeKm) ? om.fiendeKm : Infinity;
    const trygghet = klem((km < 2 ? 90 : km < 5 ? 70 : km < 12 ? 45 : 25) - (om.garnison ? 30 : 0) + (om.rivalNær ? 10 : 0), 0, 100);
    const strøm = om.strøm === false ? 80 : 10;
    const mat = om.type === 'by' || om.type === 'industri' || om.type === 'oljeby' ? 55 : om.type === 'havn' ? 25 : 10;
    const ved = om.vinter ? (om.strøm === false ? 75 : 40) : 5;
    const D = { trygghet, strøm, mat, ved }; let hoved = 'trygghet';
    for (const k of Object.keys(D)) if (D[k] > D[hoved]) hoved = k;
    const verdi = klem(Math.round(Math.max(trygghet, strøm, mat, ved) * .7 + (trygghet + strøm + mat + ved) / 4 * .3), 0, 100);
    return { ...D, hoved, verdi };
  }
  const BEHOVORD = { trygghet: 'trygghet', strøm: 'strøm', mat: 'mat', ved: 'ved' };

  // Tilstanden per tettsted
  const ny = () => ({ versjon: 1, byer: {}, logg: [] });
  function by(S, id, start) {
    return S.byer[id] || (S.byer[id] = { tillit: start ? start.tillit : REGLER.start.tillit, frykt: start ? start.frykt : REGLER.start.frykt, kontrakter: 0,
      avtale: null, rival: null, forhandler: null, hjelp: null, brudd: 0 });
  }
  // Trinnet byen står på for siden «blå» (spilleren)
  function trinn(b) { if (!b) return 'nøytral'; if (b.avtale && b.avtale.trinn) return b.avtale.trinn; return b.kontrakter > 0 ? 'kunde' : 'nøytral'; }
  const rang = t => TRINN.indexOf(t);

  // Grunnprisen per døgn for et trinn (det byen vil betale ved behov 50, vanlig løfte, nøytral holdning)
  function grunnpris(t, folk) {
    const P = REGLER.pris; if (!P[t]) return 0;
    return klem(Math.round((folk || 0) * P[t] / 1000) * 1000, P.minst[t], P.tak[t]);
  }
  // Hva byen mener tilbudet er verdt per døgn
  function verdi(t, folk, { behov: bh = 50, holdning = 'forsiktig', løfte = 'vanlig', varighet = 14, tillit = 50 } = {}) {
    const H = HOLDNING[holdning] || HOLDNING.forsiktig, L = REGLER.løfter.find(l => l.id === løfte) || REGLER.løfter[1];
    const lf = 1 + (L.verdi - 1) * H.løfte, bf = .7 + .6 * klem(bh, 0, 100) / 100, tf = .85 + klem(tillit, 0, 100) / 400;
    const vf = H.kort ? (varighet >= 30 ? .9 : varighet <= 7 ? 1.05 : 1) : H.lang ? (varighet >= 30 ? 1.1 : varighet <= 7 ? .92 : 1) : 1;
    return Math.round(grunnpris(t, folk) * H.pris * lf * bf * tf * vf / 1000) * 1000;
  }
  // Kan byen gå til dette trinnet nå? Gir null eller en grunn (norsk tekst)
  // eid = byen er alt din (tatt med makt): da kan den bli medlem uten beskyttelse og handel først
  function kanTrinn(b, t, side = 'blå', eid = false) {
    const K = REGLER.trinn[t]; if (!K || t === 'kunde') return 'Ukjent avtale.';
    const nå = trinn(b);
    if (b.avtale && b.avtale.oppsagt) return 'Byen har sagt opp avtalen og vil ikke forhandle nå.';
    if (rang(nå) >= rang(t)) return { beskyttelse: 'Dere har alt en beskyttelsesavtale.', handel: 'Dere har alt en handelsavtale.', medlem: 'Byen er alt medlem.' }[nå] || 'Dere har alt en avtale.';
    if (K.krever && rang(nå) < rang(K.krever) && !(eid && t === 'medlem')) return `Krever en ${K.krever === 'beskyttelse' ? 'beskyttelsesavtale' : 'handelsavtale'} først.`;
    if ((b.tillit || 0) < K.tillit) return `Byen stoler ikke nok på dere: tillit ${Math.round(b.tillit)} av ${K.tillit}.`;
    if (K.fryktUnder !== undefined && (b.frykt || 0) >= K.fryktUnder) return `Byen er redd dere: frykt ${Math.round(b.frykt)} (må under ${K.fryktUnder}).`;
    return null;
  }
  // FORHANDLINGEN. tilbud: { trinn, pris (kr per døgn byen betaler; ikke for medlem), løfte, varighet }, om: { folk, behov, holdning, rivalPris }
  // Gir { svar: 'ja'|'nei'|'motbud', grunn, motbud: { pris } | null, verdi }
  function forhandle(b, tilbud, om = {}) {
    const t = tilbud.trinn, feil = kanTrinn(b, t, 'blå', !!om.eid); if (feil) return { svar: 'nei', grunn: feil, motbud: null, verdi: 0 };
    const H = HOLDNING[om.holdning] || HOLDNING.forsiktig, frykt = b.frykt || 0;
    if (H.fryktNei !== undefined && frykt > H.fryktNei) return { svar: 'nei', grunn: 'Byrådet lar seg ikke true. Frykten må ned først.', motbud: null, verdi: 0 };
    if (!REGLER.varigheter.includes(+tilbud.varighet)) return { svar: 'nei', grunn: 'Varigheten må være 7, 14 eller 30 døgn.', motbud: null, verdi: 0 };
    if (t === 'medlem') return { svar: 'ja', grunn: 'Byrådet vil bli med. Byen betaler skatt til dere og teller med i krigen.', motbud: null, verdi: 0 };
    let v = verdi(t, om.folk, { behov: om.behov, holdning: om.holdning, løfte: tilbud.løfte, varighet: +tilbud.varighet, tillit: b.tillit });
    if (H.fryktJa !== undefined && frykt >= H.fryktJa) v = Math.round(v * 1.15 / 1000) * 1000;
    // en rival forhandler eller har avtale: dere må by under det rivalen tar (byen sparer)
    const grense = om.rivalPris ? Math.min(v, Math.round(om.rivalPris * REGLER.rival.overby / 1000) * 1000) : v;
    const pris = +tilbud.pris;
    if (!(pris > 0)) return { svar: 'nei', grunn: 'Prisen mangler.', motbud: null, verdi: grense };
    if (pris <= grense) return { svar: 'ja', grunn: om.rivalPris ? 'Byrådet tar tilbudet deres framfor rivalens.' : 'Byrådet sier ja.', motbud: null, verdi: grense };
    if (pris <= grense * REGLER.motbud) return { svar: 'motbud', grunn: om.rivalPris ? 'Rivalen er billigere. Byrådet kommer med et motbud.' : 'For dyrt, men byrådet kommer med et motbud.', motbud: { pris: grense }, verdi: grense };
    return { svar: 'nei', grunn: 'Altfor dyrt for byen.', motbud: null, verdi: grense };
  }
  // En avtale som er godtatt. nå = spillminutter.
  function inngå(b, tilbud, nå) {
    const L = REGLER.løfter.find(l => l.id === tilbud.løfte) || REGLER.løfter[1];
    b.avtale = { trinn: tilbud.trinn, pris: tilbud.trinn === 'medlem' ? (b.avtale ? b.avtale.pris : 0) : Math.round(+tilbud.pris), løfte: L.id, mann: L.mann, svartid: L.svartid,
      varighet: +tilbud.varighet, start: nå, slutt: nå + (+tilbud.varighet) * 1440, timer: 0, okTimer: 0, brudd: 0, oppsagt: null, forrige: b.avtale ? b.avtale.trinn : null };
    b.forhandler = null; b.rival = null; b.brudd = 0;
    return b.avtale;
  }
  // Én time med avtalen: mann = egne friske mann innen radius av byen. Gir true når løftet er holdt denne timen.
  function time(b, mann) { const A = b.avtale; if (!A) return null; A.timer++; const ok = mann >= A.mann; if (ok) A.okTimer++; return ok; }
  // Døgnet er over: tillit opp eller ned, kanskje oppsigelse. Gir { holdt, endring, sierOpp, grunn }
  function døgn(b, om = {}) {
    const A = b.avtale, T = REGLER.tillit, H = HOLDNING[om.holdning] || HOLDNING.forsiktig; let endring = 0, holdt = null, sierOpp = false, grunn = '';
    b.frykt = Math.max(0, (b.frykt || 0) - REGLER.fryktFall);
    if (A && !A.oppsagt && A.timer > 0) {
      holdt = A.okTimer / A.timer >= REGLER.holdtAndel;
      endring = holdt ? T.holdt * (H.tillit || 1) : T.brutt; if (!holdt) { A.brudd++; b.brudd++; }
      A.timer = 0; A.okTimer = 0;
      if (b.tillit + endring < REGLER.oppsigelse.tillit) { sierOpp = true; grunn = 'tilliten er borte'; }
      else if (A.brudd >= REGLER.oppsigelse.brudd) { sierOpp = true; grunn = `løftet er brutt ${A.brudd} døgn`; }
    }
    b.tillit = klem(b.tillit + endring, 0, 100);
    return { holdt, endring, sierOpp, grunn };
  }
  // Byen sier opp: avtalen gjelder et døgn til, så faller byen tilbake til kunde/nøytral
  function siOpp(b, nå, grunn) { if (!b.avtale || b.avtale.oppsagt) return false; b.avtale.oppsagt = { tid: nå, slutt: nå + REGLER.oppsigelse.varsel, grunn: grunn || '' }; b.tillit = klem(b.tillit + REGLER.tillit.oppsagt, 0, 100); return true; }
  // Er avtalen slutt nå (oppsagt og varselet er ute, eller varigheten er ute)? Gir 'oppsagt' | 'ute' | null
  function slutt(b, nå) { const A = b.avtale; if (!A) return null; if (A.oppsagt && nå >= A.oppsagt.slutt) return 'oppsagt'; if (nå >= A.slutt) return 'ute'; return null; }
  function avslutt(b, hvorfor) { const A = b.avtale; if (!A) return; b.avtale = null; if (hvorfor === 'ute' && A.brudd === 0) b.tillit = klem(b.tillit + REGLER.tillit.ferdig, 0, 100); }
  // Nabobyene hører at en by sa opp: [{ id, x, y }] innen REGLER.nabo
  function naboer(by, alle) { return alle.filter(o => o.id !== by.id && Math.hypot(o.x - by.x, o.y - by.y) <= REGLER.nabo); }
  // Penger per døgn fra avtalen (kr; medlem betaler skatt via region.js, ikke her)
  const betaling = b => (b && b.avtale && (b.avtale.trinn === 'beskyttelse' || b.avtale.trinn === 'handel') ? b.avtale.pris : 0);

  // BYEN BER OM HJELP: fiende innen hjelp.radius. Gir et hjelp-objekt eller null.
  function berOmHjelp(b, { nå, fiender = 1, km = 2, retning = '' } = {}) {
    if (!b.avtale || b.hjelp || b.avtale.oppsagt) return null;
    if (b.sistHjelp !== undefined && nå - b.sistHjelp < REGLER.hjelp.pause) return null;
    b.hjelp = { fra: nå, frist: nå + b.avtale.svartid * 60, fiender, km, retning }; b.sistHjelp = nå; return b.hjelp;
  }
  // Under en bønn om hjelp: egne nær byen (framme = true) eller fienden borte. Gir 'hjulpet' | 'for sent' | 'borte' | null
  function hjelpSteg(b, { nå, framme, fiendeBorte }) {
    const h = b.hjelp; if (!h) return null;
    if (framme) { b.hjelp = null; b.tillit = klem(b.tillit + REGLER.tillit.hjelp, 0, 100); return 'hjulpet'; }
    if (nå > h.frist) { b.hjelp = null; b.tillit = klem(b.tillit + REGLER.tillit.ikkeHjelp, 0, 100); if (b.avtale) { b.avtale.brudd++; b.brudd++; } return 'for sent'; }
    if (fiendeBorte) { b.hjelp = null; return 'borte'; }
    return null;
  }

  // RIVALENE frir: kandidater = tettsteder uten blå avtale over kunde og uten rivalavtale, innen rival.radius fra rivalens egne.
  // byer: [{ id, x, y, folk, eier }], side: 'rød'|'grønn'. Gir id-en til den beste kandidaten eller null.
  function rivalMål(S, byer, side) {
    const egne = byer.filter(o => o.eier === side); if (!egne.length) return null; let best = null, bp = -Infinity;
    for (const o of byer) { if (o.eier) continue; const b = S.byer[o.id]; if (b && (b.rival || b.forhandler || rang(trinn(b)) >= rang('beskyttelse'))) continue;
      let d = Infinity; for (const e of egne) d = Math.min(d, Math.hypot(o.x - e.x, o.y - e.y)); if (d > REGLER.rival.radius) continue;
      const p = Math.sqrt(1 + o.folk) / (1 + d / 1000); if (p > bp) { bp = p; best = o.id; } }
    return best;
  }
  // En rival begynner å forhandle; pris = det rivalen tar per døgn (litt under det byen er villig til)
  function rivalFrir(b, side, folk, nå, holdning) { b.forhandler = { side, fra: nå, ferdig: nå + REGLER.rival.tid, pris: Math.round(verdi('beskyttelse', folk, { holdning }) * .9 / 1000) * 1000 }; return b.forhandler; }
  // Når rivalens forhandling er ferdig: byen inngår med rivalen hvis spilleren ikke har en avtale. Gir 'rival' | 'spiller' | null
  function rivalSteg(b, nå) {
    const f = b.forhandler; if (!f || nå < f.ferdig) return null; b.forhandler = null;
    if (b.avtale && rang(b.avtale.trinn) >= rang('beskyttelse')) return 'spiller';
    b.rival = { side: f.side, trinn: 'beskyttelse', pris: f.pris, start: nå }; b.tillit = klem(b.tillit + REGLER.tillit.rival, 0, 100); return 'rival';
  }
  // Rivalen går videre fra beskyttelse til handel etter 7 døgn (enkel AI)
  function rivalVokser(b, nå) { if (b.rival && b.rival.trinn === 'beskyttelse' && nå - b.rival.start >= 7 * 1440) { b.rival.trinn = 'handel'; return true; } return false; }

  // KRIGSSTILLINGEN (strategi.js, kapittel 3.3): medlemmer teller fullt (de er eid, eier blå), partnere (handel) halvt.
  // Gir { side, vekt } for et tettsted som ikke er eid, ellers null.
  function stillingVekt(b) {
    if (!b) return null;
    if (b.avtale && b.avtale.trinn === 'handel' && !b.avtale.oppsagt) return { side: 'blå', vekt: .5 };
    if (b.rival && b.rival.trinn === 'handel') return { side: b.rival.side, vekt: .5 };
    return null;
  }

  function fraJSON(d) {
    const S = ny(); if (!d || typeof d !== 'object' || !d.byer) return S;
    for (const [id, b] of Object.entries(d.byer)) { if (!b || typeof b !== 'object') continue;
      S.byer[id] = { tillit: klem(+b.tillit || 0, 0, 100), frykt: klem(+b.frykt || 0, 0, 100), kontrakter: Math.max(0, +b.kontrakter || 0), brudd: +b.brudd || 0,
        avtale: b.avtale && TRINN.includes(b.avtale.trinn) ? b.avtale : null, rival: b.rival && (b.rival.side === 'rød' || b.rival.side === 'grønn') ? b.rival : null,
        forhandler: b.forhandler || null, hjelp: b.hjelp || null, sistHjelp: b.sistHjelp, makt: !!b.makt }; }
    return S;
  }

  const api = { REGLER, TRINN, TRINNORD, HOLDNING, HOLDNINGER, BEHOVORD, hash, leder, behov, ny, by, trinn, rang, grunnpris, verdi, kanTrinn, forhandle, inngå, time, døgn,
    siOpp, slutt, avslutt, naboer, betaling, berOmHjelp, hjelpSteg, rivalMål, rivalFrir, rivalSteg, rivalVokser, stillingVekt, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Byavtale = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
