/* PRODUKSJON (28. nov, fase Ø1 i docs/plan-selskap-okonomi.md, kapittel 4): maskinene i leiren. Regler uten DOM
 * (Node: require('./produksjon'); nettleser: globalThis.Produksjon). Visningen: spill/produksjon-visning.js.
 *
 * Maskinene er vanlige bygg i Leir.BYGG (sagbruk, vedkløyver, fyrkjele – leir.js, «maskin: true»). Hver time gjør de om råvarer i
 * lageret til nye varer:
 *   sagbruk     2 m³ tømmer  -> 1,1 m³ planker + 0,7 m³ flis   (3 folk, 15 kW)
 *   vedkløyver  0,6 m³ flis  -> 0,5 m³ ved                     (1 folk, 3 kW)
 *   fyrkjele    0,6 m³ flis (eller 0,45 m³ ved) -> 30 kW strøm og varme til leiren (1 folk, ingen strøm)
 * En maskin går bare når alt er på plass, og ellers står den med EN grunn (sjekket i denne rekkefølgen):
 *   «slått av», «ødelagt», «lageret fullt», «tom for tømmer/flis/brensel», «ingen folk», «uten strøm».
 * Timene hver maskin står, telles per grunn (til grafen «hvorfor saga sto»), og det som er laget, telles per vare.
 * Folk: personene på oppgaven «maskin» (folk.js) fordeles på maskinene i rekkefølgen fyrkjele, sagbruk, vedkløyver. Arbeidskraften er
 * antall × tempo (ferdighet, moral, helse og døgnplanen fra jobbtavla); med færre folk enn maskinen trenger, går den saktere.
 * Slitasje: maskinene mister litt hp per driftstime (verkstedet reparerer som andre bygg).
 * Alle tallene er Claudes forslag (fra planens tabell der den har dem). Tilstanden P lagres av visningen i «riksbrudd-produksjon» (per leir).
 */
(function (rot) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const LB = NODE ? require('./leir.js') : rot.Leir;

  // REGLER – Claudes forslag. inn/ut per time ved full drift (nivå 1). Sagbruket er fra planens tabell (kapittel 4.2), resten anslag.
  const REGLER = {
    maskiner: {
      sagbruk: { folk: 3, kw: 15, inn: [{ tømmer: 2 }], ut: { tre: 1.1, flis: .7 } },
      vedkløyver: { folk: 1, kw: 3, inn: [{ flis: .6 }], ut: { ved: .5 } },
      // fyrkjelen brenner flis først, så ved; gir 30 kW og varme til så mange fyringssteder (folk.js: ett per åtte personer)
      // (ut4-balanse2, Claudes forslag) 0,5 -> 0,6 m³ flis og 0,35 -> 0,45 m³ ved i timen – saga gir 0,7 m³ flis, så den holder fortsatt kjelen i gang
      fyrkjele: { folk: 1, kw: 0, inn: [{ flis: .6 }, { ved: .45 }], ut: {}, gir: 30, varme: 3 },
    },
    rekkefølge: ['fyrkjele', 'sagbruk', 'vedkløyver'],
    slitasje: .0015,          // hp per driftstime (en maskin i full drift er halvslitt etter ca. 14 døgn: da går den med halv fart til den er reparert)
    // KVALITET (planen 4.3): dyktige folk (snittferdighet på «maskin» over 1,2) gir 10 % mer ut av sagbruket og vedkløyveren
    kvalitet: { grense: 1.2, bonus: .1 },
    tømmerbil: { pris: 2.5e6 },   // kjøpes i fanen Produksjon; 20 m³ per tur (Ressurser.REGLER.tømmerbil)
    // (ut4-balanse2 28. nov, Claudes forslag) VARSEL FØR KJØPET: saga med kjele koster ca. 12 mill. og betaler seg først etter flere uker
    // (ca. 0,2–0,3 mill. i døgnet når den går). Har kassa etter kjøpet mindre enn «døgn» (15) døgn med leirens faste utgifter + maskinens drift,
    // sier byggelista fra før du kjøper (driftVarsel). Økonomitesten (okosim-sagbruk.js) lar den fornuftige spilleren vente til varselet er borte.
    varsel: { døgn: 15, lønn: 15000 },
  };
  const GRUNNER = ['av', 'ødelagt', 'fullt', 'tom', 'folk', 'strøm', 'slitt'];
  const GRUNNTEKST = { av: 'slått av', ødelagt: 'ødelagt', fullt: 'lageret fullt', folk: 'ingen folk', strøm: 'uten strøm', slitt: 'slitt – må repareres' };
  const VARENAVN = { tre: 'planker', tømmer: 'tømmer', flis: 'flis', ved: 'ved', betong: 'betong', stål: 'stål' };
  const erMaskin = t => !!REGLER.maskiner[t];

  // ---------- tilstanden ----------
  const ny = () => ({ versjon: 1, laget: {}, brukt: {}, sto: {}, gikk: 0, status: {} });
  function fraJSON(o) {
    const P = ny(); if (!o || typeof o !== 'object' || o.versjon !== 1) return P;
    for (const k of ['laget', 'brukt', 'sto']) if (o[k] && typeof o[k] === 'object') for (const [v, n] of Object.entries(o[k])) if (Number.isFinite(+n) && +n >= 0) P[k][v] = +n;
    P.gikk = Number.isFinite(+o.gikk) ? +o.gikk : 0; return P;
  }

  // ---------- hjelpere ----------
  const plass = (L, v) => Math.max(0, (LB ? LB.lagerplass(L) : 60) - ((L.lager && L.lager[v]) || 0));
  const har = (L, v) => (L.lager && L.lager[v]) || 0;
  const maskinene = L => (L && Array.isArray(L.bygg) ? L.bygg : []).filter(b => erMaskin(b.type) && (LB ? LB.ferdig(b) : b.igjen <= 0))
    .sort((a, b) => REGLER.rekkefølge.indexOf(a.type) - REGLER.rekkefølge.indexOf(b.type) || a.id - b.id);
  // hvilken råvare maskinen kan bruke nå (første i lista som finnes i lageret), eller null
  function råvare(L, M, andel = 1) { for (const r of M.inn) if (Object.entries(r).every(([v, m]) => har(L, v) >= m * andel * .05 + 1e-9)) return r; return null; }
  const tomTekst = (t) => (t === 'sagbruk' ? 'tom for tømmer' : t === 'vedkløyver' ? 'tom for flis' : 'tom for brensel');
  const grunnTekst = (g, t) => (g === 'tom' ? tomTekst(t) : GRUNNTEKST[g] || g);

  // Vil maskinen gå nå (alt unntatt strøm og folk er på plass)? Brukes av leir.js (api.hviler) så en maskin som står, ikke tar strøm.
  // Folk telles også: uten folk på «maskin» tar den ingen strøm.
  function vil(L, b, folkIgjen) {
    const M = REGLER.maskiner[b.type]; if (!M) return { grunn: 'ukjent' };
    if (b.av) return { grunn: 'av' };
    if (LB && !LB.virker(b)) return { grunn: 'ødelagt' };
    if (Object.keys(M.ut).some(v => plass(L, v) < .05)) return { grunn: 'fullt' };
    const r = råvare(L, M); if (!r) return { grunn: 'tom' };
    if (folkIgjen !== undefined && !(folkIgjen > 1e-6)) return { grunn: 'folk' };
    return { r };
  }

  // Ett steg på dt spillminutter. ctx: { kraft (folk × tempo på «maskin»), mangler (Set av bygg-id uten strøm fra Leir.steg),
  // ferdighet (snittferdigheten til dem på «maskin», for kvaliteten) }.
  // Gir { status: { id: { type, går, drift (0–1), grunn, tekst, inn, ut, folk, kw } }, kw (strøm fra kjelene nå), varme (fyringssteder) }
  // og endrer L.lager, b.hp og P (tellingene).
  function steg(P, L, dt, ctx = {}) {
    const t = dt / 60, mangler = ctx.mangler || new Set(), K = REGLER.kvalitet, kval = ctx.ferdighet > K.grense ? 1 + K.bonus : 1; let kraft = Math.max(0, ctx.kraft || 0), kw = 0, varme = 0;
    const status = {};
    for (const b of maskinene(L)) {
      const M = REGLER.maskiner[b.type], v = vil(L, b, kraft), s = { type: b.type, går: false, drift: 0, grunn: null, tekst: '', inn: {}, ut: {}, folk: 0, kw: 0 };
      status[b.id] = s;
      if (v.grunn) { s.grunn = v.grunn; }
      else if (M.kw > 0 && mangler.has(b.id)) { s.grunn = 'strøm'; s.folk = Math.min(M.folk, kraft); }
      else {
        // arbeidskraften: maskinen tar så mange den trenger; med færre går den saktere
        const tatt = Math.min(M.folk, kraft); kraft -= tatt; s.folk = tatt;
        // slitt (hp under halvparten, som andre bygg i leir.js): halv fart til verkstedet eller byggelaget har reparert den
        const fFolk = Math.min(1, tatt / M.folk), fSlitt = b.hp < ((LB && LB.REGLER.halvSkade) || .5) ? .5 : 1;
        // råvaren og plassen i lageret begrenser også
        let fRå = 1, fPlass = 1;
        for (const [vare, m] of Object.entries(v.r)) fRå = Math.min(fRå, har(L, vare) / (m * t));
        for (const [vare, m] of Object.entries(M.ut)) fPlass = Math.min(fPlass, plass(L, vare) / (m * t));
        const drift = Math.max(0, Math.min(fFolk * fSlitt, fRå, fPlass));
        // grunnen når den ikke går fullt: det som begrenser mest
        if (drift < 1 - 1e-6) s.grunn = fRå <= drift + 1e-9 && fRå < fFolk * fSlitt ? 'tom' : fPlass <= drift + 1e-9 && fPlass < fFolk * fSlitt ? 'fullt' : fSlitt < 1 && fSlitt <= fFolk ? 'slitt' : 'folk';
        if (drift > 1e-6) {
          s.går = true; s.drift = drift;
          for (const [vare, m] of Object.entries(v.r)) { const q = m * t * drift; L.lager[vare] = Math.max(0, har(L, vare) - q); s.inn[vare] = m * drift; P.brukt[vare] = (P.brukt[vare] || 0) + q; }
          for (const [vare, m] of Object.entries(M.ut)) { const q = Math.min(m * t * drift * kval, plass(L, vare)); L.lager[vare] = har(L, vare) + q; s.ut[vare] = q / t; P.laget[vare] = (P.laget[vare] || 0) + q; }
          s.kvalitet = kval > 1;
          if (M.gir) { s.kw = M.gir * drift; kw += s.kw; varme += M.varme * drift; }
          s.kwBruk = M.kw * drift;
          if (b.hp > 0 && REGLER.slitasje > 0) b.hp = Math.max(.05, b.hp - REGLER.slitasje * t * drift);
          P.gikk += t * drift;
        }
      }
      // tida maskinen sto (helt eller delvis), per grunn
      const stod = (1 - s.drift) * t; if (stod > 1e-9) { const g = s.grunn || (s.folk < M.folk - 1e-6 ? 'folk' : 'tom'); if (!s.grunn && s.drift < 1 - 1e-6) s.grunn = g; P.sto[g] = (P.sto[g] || 0) + stod; }
      // delvis drift: «går 50 % – for få folk» / «– lite tømmer»
      const delvis = g => (g === 'slitt' ? 'slitt, halv fart' : g === 'folk' ? 'for få folk' : g === 'tom' ? tomTekst(b.type).replace('tom for', 'lite') : grunnTekst(g, b.type));
      s.tekst = s.går ? (s.drift < .98 ? `går ${Math.round(s.drift * 100)} %` + (s.grunn ? ' – ' + delvis(s.grunn) : '') : 'går') : grunnTekst(s.grunn, b.type);
    }
    P.status = status;
    return { status, kw, varme };
  }
  // Står maskinen (så den ikke skal ha strøm)? Regnes uten folk/strøm-sjekk når kraft mangler: da spør vi bare om råvare og plass.
  function hviler(L, b, kraft) { if (!erMaskin(b.type)) return false; const v = vil(L, b, kraft); return !!v.grunn; }

  // Hva maskinen gjør ved full drift, som tekst: «2 m³ tømmer → 1,1 m³ planker + 0,7 m³ flis»
  const nf = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
  function oppskrift(t) {
    const M = REGLER.maskiner[t]; if (!M) return '';
    const inn = M.inn.map(r => Object.entries(r).map(([v, m]) => `${nf(m, 2)} m³ ${VARENAVN[v] || v}`).join(' + ')).join(' eller ');
    const ut = Object.entries(M.ut).map(([v, m]) => `${nf(m, 2)} m³ ${VARENAVN[v] || v}`);
    if (M.gir) ut.push(`${M.gir} kW og varme`);
    return `${inn} → ${ut.join(' + ')} per time`;
  }
  // Det lille tallet over maskinen i kartet: «1,1 m³/t» (planker), «0,5 m³/t» (ved), «30 kW»
  function merke(t, s) {
    const M = REGLER.maskiner[t]; if (!M) return '';
    const d = s && s.går ? s.drift : 0;
    if (M.gir) return `${nf(M.gir * d, 0)} kW`;
    const [v, m] = Object.entries(M.ut)[0]; return `${nf(m * d, 1)} m³/t`;
  }
  // Andelen av varmebehovet kjelene dekker: varme (fyringssteder fra steg) mot behovet (FolkRegler.behov: fyring)
  const varmeAndel = (varme, fyring) => (fyring > 0 ? Math.max(0, Math.min(1, varme / fyring)) : 0);
  // Verdien av det som er laget (kr), med prisene i MATERIALER: planker + flis + ved − tømmer
  function verdi(P, MAT) { const p = v => (MAT && MAT[v] ? MAT[v].pris : 0); let s = 0; for (const [v, m] of Object.entries(P.laget)) s += m * p(v); for (const [v, m] of Object.entries(P.brukt)) s -= m * p(v); return Math.round(s); }

  // VARSEL FØR KJØPET (ut4-balanse2): o = { kasse, kost (det maskinen koster nå, med materialene som mangler), kjeleKost (det en fyrkjele
  // koster, hvis strømmen ikke rekker), perDøgn (leirens faste utgifter i døgnet: lønn, vedlikehold, diesel), inntekt (kr inn siste døgn),
  // infl }. Gir { varsel, kost, drift, trengs, etter, døgn, tekst } – varsel = true når kassa etter kjøpet ikke rekker «døgn» døgn.
  function driftVarsel(type, o = {}) {
    const M = REGLER.maskiner[type], B = LB && LB.BYGG[type], V = REGLER.varsel; if (!M || !B) return null;
    const lønn = V.lønn * (o.infl > 0 ? o.infl : 1), vm = LB && Number.isFinite(LB.REGLER.vedlikeholdMaskin) ? LB.REGLER.vedlikeholdMaskin : .01;
    const K = REGLER.maskiner.fyrkjele, kjele = o.kjeleKost > 0 && type === 'sagbruk';
    const drift = Math.round(M.folk * lønn + B.pris * vm + (kjele ? K.folk * lønn + LB.BYGG.fyrkjele.pris * vm : 0));
    const kost = Math.round((+o.kost || 0) + (kjele ? o.kjeleKost : 0)), etter = Math.round((+o.kasse || 0) - kost), perDøgn = Math.max(0, +o.perDøgn || 0);
    const trengs = Math.round(V.døgn * (perDøgn + drift)), varsel = etter < trengs, rekker = perDøgn + drift > 0 ? Math.max(0, Math.floor(etter / (perDøgn + drift))) : Infinity;
    const kr = v => (LB && LB.kroner ? LB.kroner(v) : Math.round(v) + ' kr'), navn = B.navn;
    let tekst = `${navn} koster ${kr(o.kost || 0)}` + (kjele ? ` – og ${kr(o.kjeleKost)} for en fyrkjele, for strømmen rekker ikke` : '') + `. I drift: ca. ${kr(drift)} i døgnet (folk og vedlikehold).`;
    if (varsel) tekst += ` Etter kjøpet har dere ${kr(Math.max(0, etter))}, og leiren bruker ca. ${kr(perDøgn + drift)} i døgnet – det rekker ${rekker < 1 ? 'ikke ett døgn' : `ca. ${rekker} døgn`} (vent til dere har ${kr(kost + trengs)}).`
      + (o.inntekt > 0 ? '' : ` ${navn === 'Sagbruk' ? 'Saga' : navn} alene bærer ikke leiren: den dekker lønna til ca. ti, men ikke diesel, røvere og bygg. Ta kontrakter først.`);
    return { varsel, kost, drift, trengs, etter, døgn: V.døgn, rekker, tekst };
  }

  // Leirens faste utgifter i døgnet til varselet (ut4-balanse2): lønn for «personer» (med tropper), vedlikehold av ALLE byggene (også de
  // som bygges nå – de koster snart) og dieselen strømmen trekker (byggene som bruker strøm, unntatt maskinene, minus halvparten av
  // solcellene: sol om dagen). o = { personer, infl, dieselpris }.
  function leirDøgn(L, o = {}) {
    if (!L || !Array.isArray(L.bygg) || !LB) return 0; const V = REGLER.varsel, infl = o.infl > 0 ? o.infl : 1;
    let vedl = 0, bruk = 0, sol = 0;
    for (const b of L.bygg) { const B = LB.BYGG[b.type]; if (!B) continue; const g = Number.isFinite(b.pris) && b.pris > 0 ? b.pris : (B.pris || 0);
      vedl += g * (B.maskin && Number.isFinite(LB.REGLER.vedlikeholdMaskin) ? LB.REGLER.vedlikeholdMaskin : LB.REGLER.vedlikehold) * (b.av ? LB.REGLER.vedlikeholdAv : 1);
      if (!B.maskin && B.kw < 0 && !b.av) bruk -= B.kw; if (B.sol && B.kw > 0) sol += B.kw; }
    const kw = Math.max(0, bruk - sol / 2), diesel = kw * LB.DRIVSTOFF.literPerKWt * 24 * (o.dieselpris > 0 ? o.dieselpris : LB.DRIVSTOFF.prisPerLiter);
    return Math.round((+o.personer || 0) * V.lønn * infl + vedl + diesel);
  }

  const api = { driftVarsel, leirDøgn, REGLER, GRUNNER, GRUNNTEKST, VARENAVN, erMaskin, ny, fraJSON, maskinene, råvare, vil, steg, hviler, oppskrift, merke, grunnTekst, varmeAndel, verdi, nf };
  if (NODE) module.exports = api; else rot.Produksjon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
