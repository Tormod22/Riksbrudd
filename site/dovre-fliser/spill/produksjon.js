/* PRODUKSJON (28. nov, fase Ø1 i docs/plan-selskap-okonomi.md, kapittel 4): maskinene i leiren. Regler uten DOM
 * (Node: require('./produksjon'); nettleser: globalThis.Produksjon). Visningen: spill/produksjon-visning.js.
 *
 * Maskinene er vanlige bygg i Leir.BYGG (sagbruk, vedkløyver, fyrkjele – leir.js, «maskin: true»). Hver time gjør de om råvarer i
 * lageret til nye varer:
 *   sagbruk     2 m³ tømmer  -> 1,1 m³ planker + 0,7 m³ flis   (3 folk, 15 kW)
 *   vedkløyver  0,6 m³ flis  -> 0,5 m³ ved                     (1 folk, 3 kW)
 *   fyrkjele    0,5 m³ flis (eller 0,35 m³ ved) -> 30 kW strøm og varme til leiren (1 folk, ingen strøm)
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
      fyrkjele: { folk: 1, kw: 0, inn: [{ flis: .5 }, { ved: .35 }], ut: {}, gir: 30, varme: 3 },
    },
    rekkefølge: ['fyrkjele', 'sagbruk', 'vedkløyver'],
    slitasje: .0015,          // hp per driftstime (en maskin i full drift er halvslitt etter ca. 14 døgn: da går den med halv fart til den er reparert)
    // KVALITET (planen 4.3): dyktige folk (snittferdighet på «maskin» over 1,2) gir 10 % mer ut av sagbruket og vedkløyveren
    kvalitet: { grense: 1.2, bonus: .1 },
    tømmerbil: { pris: 2.5e6 },   // kjøpes i fanen Produksjon; 20 m³ per tur (Ressurser.REGLER.tømmerbil)
    // (F3) MATING – Claudes forslag: innmatingen tar høyst 4 m³ av hver råvare, utmatingen høyst 4 m³ til sammen (spill/baering.js bærer)
    buffer: { inn: 4, ut: 4 },
  };
  const GRUNNER = ['av', 'ødelagt', 'fullt', 'tom', 'folk', 'strøm', 'slitt'];
  const GRUNNTEKST = { av: 'slått av', ødelagt: 'ødelagt', fullt: 'lageret fullt', folk: 'ingen folk', strøm: 'uten strøm', slitt: 'slitt – må repareres' };
  // (F3) med innmating og utmating (folk går og bærer, spill/baering.js): grunnene som planen 6.6 sier dem
  const MATETEKST = { av: 'slått av', ødelagt: 'i stykker', fullt: 'utmatingen full', folk: 'venter på folk', strøm: 'uten strøm', slitt: 'slitt – må repareres' };
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
  // (F3) Bf = maskinens mating { inn: { vare: m³ }, ut: { vare: m³ } } (spill/baering.js) – da leses råvaren fra innmatingen og plassen
  // fra utmatingen i stedet for lageret. Uten Bf (døgnplanen av, gamle spill, testene) er alt som før.
  const hentFra = (L, Bf) => (Bf ? v => Bf.inn[v] || 0 : v => har(L, v));
  const utSum = Bf => Object.values(Bf.ut).reduce((s, m) => s + (m || 0), 0);
  const plassFor = (L, Bf) => (Bf ? () => Math.max(0, REGLER.buffer.ut - utSum(Bf)) : v => plass(L, v));
  function råvare(L, M, andel = 1, Bf) { const h = hentFra(L, Bf); for (const r of M.inn) if (Object.entries(r).every(([v, m]) => h(v) >= m * andel * .05 + 1e-9)) return r; return null; }
  const tomTekst = (t) => (t === 'sagbruk' ? 'tom for tømmer' : t === 'vedkløyver' ? 'tom for flis' : 'tom for brensel');
  const venterTekst = (t) => (t === 'sagbruk' ? 'venter på tømmer' : t === 'vedkløyver' ? 'venter på flis' : 'venter på brensel');
  const grunnTekst = (g, t, mating) => (g === 'tom' ? (mating ? venterTekst(t) : tomTekst(t)) : (mating ? MATETEKST : GRUNNTEKST)[g] || g);

  // Vil maskinen gå nå (alt unntatt strøm og folk er på plass)? Brukes av leir.js (api.hviler) så en maskin som står, ikke tar strøm.
  // Folk telles også: uten folk på «maskin» tar den ingen strøm.
  function vil(L, b, folkIgjen, Bf) {
    const M = REGLER.maskiner[b.type]; if (!M) return { grunn: 'ukjent' };
    if (b.av) return { grunn: 'av' };
    if (LB && !LB.virker(b)) return { grunn: 'ødelagt' };
    const pl = plassFor(L, Bf); if (Object.keys(M.ut).some(v => pl(v) < .05)) return { grunn: 'fullt' };
    const r = råvare(L, M, 1, Bf); if (!r) return { grunn: 'tom' };
    if (folkIgjen !== undefined && !(folkIgjen > 1e-6)) return { grunn: 'folk' };
    return { r };
  }

  // Ett steg på dt spillminutter. ctx: { kraft (folk × tempo på «maskin»), mangler (Set av bygg-id uten strøm fra Leir.steg),
  // ferdighet (snittferdigheten til dem på «maskin», for kvaliteten) }.
  // (F3) ctx.mating = { byggId: { inn, ut } } (spill/baering.js): råvaren tas fra innmatingen og det som lages, legges i utmatingen;
  // ctx.kraftPer = { byggId: arbeidskraft } – bare operatørene som STÅR på bruksplassene ved maskinen (ingen felles pott).
  // Gir { status: { id: { type, går, drift (0–1), grunn, tekst, inn, ut, folk, kw } }, kw (strøm fra kjelene nå), varme (fyringssteder) }
  // og endrer L.lager, b.hp og P (tellingene).
  function steg(P, L, dt, ctx = {}) {
    const t = dt / 60, mangler = ctx.mangler || new Set(), K = REGLER.kvalitet, kval = ctx.ferdighet > K.grense ? 1 + K.bonus : 1; let kraft = Math.max(0, ctx.kraft || 0), kw = 0, varme = 0;
    const status = {}, MT = ctx.mating || null, KP = ctx.kraftPer || null;
    for (const b of maskinene(L)) {
      const Bf = MT ? (MT[b.id] || (MT[b.id] = { inn: {}, ut: {} })) : null; if (KP) kraft = Math.max(0, KP[b.id] || 0);
      const h = hentFra(L, Bf), pl = plassFor(L, Bf);
      const M = REGLER.maskiner[b.type], v = vil(L, b, kraft, Bf), s = { type: b.type, går: false, drift: 0, grunn: null, tekst: '', inn: {}, ut: {}, folk: 0, kw: 0, mating: !!Bf };
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
        for (const [vare, m] of Object.entries(v.r)) fRå = Math.min(fRå, h(vare) / (m * t));
        // (utmatingen er felles for alle varene maskinen lager: plassen deles på summen)
        const utPerT = Object.values(M.ut).reduce((a, m) => a + m, 0);
        if (Bf) { if (utPerT > 0) fPlass = pl() / (utPerT * t * kval); } else for (const [vare, m] of Object.entries(M.ut)) fPlass = Math.min(fPlass, plass(L, vare) / (m * t));
        const drift = Math.max(0, Math.min(fFolk * fSlitt, fRå, fPlass));
        // grunnen når den ikke går fullt: det som begrenser mest
        if (drift < 1 - 1e-6) s.grunn = fRå <= drift + 1e-9 && fRå < fFolk * fSlitt ? 'tom' : fPlass <= drift + 1e-9 && fPlass < fFolk * fSlitt ? 'fullt' : fSlitt < 1 && fSlitt <= fFolk ? 'slitt' : 'folk';
        if (drift > 1e-6) {
          s.går = true; s.drift = drift;
          for (const [vare, m] of Object.entries(v.r)) { const q = m * t * drift; if (Bf) Bf.inn[vare] = Math.max(0, h(vare) - q); else L.lager[vare] = Math.max(0, har(L, vare) - q); s.inn[vare] = m * drift; P.brukt[vare] = (P.brukt[vare] || 0) + q; }
          for (const [vare, m] of Object.entries(M.ut)) { const q = Bf ? m * t * drift * kval : Math.min(m * t * drift * kval, plass(L, vare));
            if (Bf) Bf.ut[vare] = (Bf.ut[vare] || 0) + q; else L.lager[vare] = har(L, vare) + q; s.ut[vare] = q / t; P.laget[vare] = (P.laget[vare] || 0) + q; }
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
      const delvis = g => (g === 'slitt' ? 'slitt, halv fart' : g === 'folk' ? (Bf ? 'for få på plass' : 'for få folk') : g === 'tom' ? tomTekst(b.type).replace('tom for', 'lite') : g === 'fullt' && Bf ? 'utmatingen nesten full' : grunnTekst(g, b.type, !!Bf));
      s.tekst = s.går ? (s.drift < .98 ? `går ${Math.round(s.drift * 100)} %` + (s.grunn ? ' – ' + delvis(s.grunn) : '') : 'går') : grunnTekst(s.grunn, b.type, !!Bf);
    }
    P.status = status;
    return { status, kw, varme };
  }
  // Står maskinen (så den ikke skal ha strøm)? Regnes uten folk/strøm-sjekk når kraft mangler: da spør vi bare om råvare og plass.
  function hviler(L, b, kraft, Bf) { if (!erMaskin(b.type)) return false; const v = vil(L, b, kraft, Bf); return !!v.grunn; }

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

  const api = { REGLER, GRUNNER, GRUNNTEKST, MATETEKST, VARENAVN, utSum, erMaskin, ny, fraJSON, maskinene, råvare, vil, steg, hviler, oppskrift, merke, grunnTekst, varmeAndel, verdi, nf };
  if (NODE) module.exports = api; else rot.Produksjon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
