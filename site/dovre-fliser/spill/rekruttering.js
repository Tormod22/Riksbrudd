/* Riksbrudd – REKRUTTERING SOM ET MARKED og OPPLÆRING (28. nov, pakke «rekruttering», kapittel 14.1 og 14.2 i
 * docs/plan-selskap-okonomi.md). Regler uten DOM (Node: require('./rekruttering'); nettleser: globalThis.Rekruttering).
 *  - SØKERE: hver morgen kommer 0–3 søkere (flere med godt rykte, byer du holder og avtaler du har) med navn, alder, yrke,
 *    ferdigheter, 0–2 egenskaper og et LØNNSKRAV (dyktige krever mer). De står i noen døgn og går så et annet sted.
 *  - ANDRE TILBUD: de dyktigste kan ha bud fra Ravnsund eller Mosevakt. «By over» ansetter dem for budet + litt; venter du, kan de gå dit.
 *  - RIVALENE LOKKER: en misfornøyd person (lav lojalitet, og lav moral eller lav lønn mot ferdigheten) kan få et tilbud. Svarer du
 *    ikke innen fristen, går hen («Gi lønnstillegg» / «La gå»).
 *  - Hver person kan ha egen lønn (p.lønn; FolkRegler.lønnSum bruker den, standard 15 000 kr/døgn).
 *  - OPPLÆRING: nytt bygg «Øvingsfelt» (lagt inn i Leir.BYGG herfra, som kjøkkenet i folk.js). En person på opplæring (p.skole = oppgave)
 *    arbeider ikke, men ferdigheten stiger hvert døgn opp til taket. MESTER OG LÆRLING: på en oppgave med en dyktig person lærer de andre
 *    litt av seg selv (sakte, gratis).
 * ALLE TALL HER ER CLAUDES FORSLAG (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const FR = NODE ? require('./folk.js') : rot.FolkRegler;
  const LB = NODE ? require('./leir.js') : rot.Leir;
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const rund = (v, s) => Math.round(v / s) * s;

  // ---------- TALLENE (alle er Claudes forslag) ----------
  const REGLER = {
    døgn: 1440,
    // antall søkere om morgenen: grunn + rykte (pålitelig over/under 50, per poeng) + byer du holder + aktive avtaler; 0–3
    antall: { grunn: 1, rykte: 1 / 40, perBy: .35, byMaks: 1, perAvtale: .25, avtaleMaks: .75, maks: 3, spredning: 1.6 },
    // så mange døgn en søker står på lista (tilfeldig mellom), og høyst så mange søkere samtidig
    varighet: [2, 4], maksListe: 6,
    // lønnskravet: fra min til maks etter den beste ferdigheten (0,9 → min, 1,45 → min + spenn), + per egenskap; avrundet til steg
    lønn: { min: 12000, spenn: 10000, maks: 25000, perEgenskap: 1000, steg: 500, standard: 15000 },
    // engangssum ved ansettelse (utstyr, klær, våpenkort) – lønna kommer i tillegg
    utstyr: 150000,
    // de dyktigste (beste ferdighet ≥ ferdighet) har bud fra en rival med denne sjansen; budet er kravet × påslag. «By over» = budet + overbud.
    // Hver morgen går en søker med bud til rivalen med sjansen gårSjanse.
    bud: { ferdighet: 1.3, sjanse: .55, påslag: [1.1, 1.25], overbud: 1000, gårSjanse: .35 },
    // en misfornøyd person: lojalitet under lojal, og moral under moral ELLER lønn under kravet − underbetalt. Sjanse per morgen for ett
    // tilbud fra en rival; fristen for å svare (spillminutter); tillegget hever lojaliteten.
    lokk: { lojal: .55, moral: 45, underbetalt: 2500, sjanse: .1, frist: 720, påslag: 2000, lojalPluss: .1 },
    // egenskapene (bare tekst og små tall): sjansen for minst én og for to
    egenskapSjanse: [.45, .12],
    // øvingsfeltet: elever per nivå, ferdighet per døgn, taket, lærenem lærer raskere
    skole: { elever: [4, 6, 8], fart: .05, maks: 1.45, lærenem: 1.5 },
    // mester og lærling: på samme oppgave lærer de andre av den beste når den er minst min; per døgn, og høyst til mesteren − avstand
    mester: { min: 1.3, fart: .01, avstand: .1, maks: 1.45 },
    // rivalene som byr (selskapene i selskap.js)
    rivaler: [{ id: 'ravnsund', navn: 'Ravnsund' }, { id: 'mosevakt', navn: 'Mosevakt' }],
  };
  const EGENSKAPER = {
    flittig: { navn: 'flittig', tekst: '+10 % arbeidstempo', tempo: 1.1 },
    nattmenneske: { navn: 'nattmenneske', tekst: 'liker kveld og natt: +15 % fra 18 til 06', natt: 1.15 },
    modig: { navn: 'modig', tekst: '+15 % på vakt', vakt: 1.15 },
    lærenem: { navn: 'lærenem', tekst: 'lærer 50 % raskere på øvingsfeltet' },
  };
  const EGEN_LISTE = Object.keys(EGENSKAPER);

  // ---------- tilstand ----------
  function ny(frø = 4242) { return { versjon: 1, dag: null, søkere: [], neste: 1, frø: frø >>> 0 || 1, lokk: null, ansatt: 0, tapt: 0 }; }
  function fraJSON(o) {
    if (!o || typeof o !== 'object') return null; const S = { ...ny(o.frø), ...o };
    S.søkere = Array.isArray(o.søkere) ? o.søkere.filter(s => s && s.navn && s.ferd) : [];
    if (S.lokk && !(S.lokk.id != null)) S.lokk = null; return S;
  }
  const rng = S => { const r = FR.rng(S.frø); return () => { const v = r(); S.frø = (Math.floor(v * 4294967296) ^ 0x5bd1e995) >>> 0 || 1; return v; }; };

  // ---------- lønn ----------
  const beste = p => Math.max(0, ...Object.entries(p.ferd || {}).filter(([o]) => o !== 'fri').map(([, v]) => v || 0));
  // lønnskravet for en person (eller søker): etter den beste ferdigheten og egenskapene
  function krav(p) {
    const R = REGLER.lønn, b = beste(p), n = Array.isArray(p.egen) ? p.egen.length : 0;
    return klem(rund(R.min + klem((b - .9) / .55, 0, 1) * R.spenn + n * R.perEgenskap, R.steg), R.min, R.maks);
  }
  const lønn = p => (p && p.lønn > 0 ? p.lønn : REGLER.lønn.standard);

  // ---------- søkere ----------
  // forventet antall søkere: ctx = { rykte (0–100, pålitelig), byer, avtaler }
  function forventet(ctx = {}) {
    const A = REGLER.antall, rk = Number.isFinite(ctx.rykte) ? ctx.rykte : 50;
    return klem(A.grunn + (rk - 50) * A.rykte + Math.min(A.byMaks, (ctx.byer || 0) * A.perBy) + Math.min(A.avtaleMaks, (ctx.avtaler || 0) * A.perAvtale), 0, A.maks);
  }
  function antall(ctx, r) { const A = REGLER.antall; return klem(Math.round(forventet(ctx) + (r() - .5) * A.spredning), 0, A.maks); }
  function egenskaper(r) {
    const [a, b] = REGLER.egenskapSjanse, ut = []; if (r() >= a) return ut;
    ut.push(EGEN_LISTE[Math.floor(r() * EGEN_LISTE.length)]);
    if (r() < b / a) { const e = EGEN_LISTE[Math.floor(r() * EGEN_LISTE.length)]; if (!ut.includes(e)) ut.push(e); }
    return ut;
  }
  // én søker: personen lages med FolkRegler.nyPerson (navnet reserveres i F.navnBrukt, så det aldri brukes to ganger) og tas ut igjen
  function lagSøker(S, F, tid, r) {
    const p = FR.nyPerson(F, r, 'fri'); F.personer.splice(F.personer.indexOf(p), 1);
    const egen = egenskaper(r), s = { id: S.neste++, navn: p.navn, alder: p.alder, yrke: p.yrke, ferd: p.ferd, lojal: p.lojal, egen, kom: tid };
    const [d0, d1] = REGLER.varighet; s.går = tid + Math.round((d0 + r() * (d1 - d0)) * REGLER.døgn);
    s.lønn = krav(s);
    const B = REGLER.bud; if (beste(s) >= B.ferdighet && r() < B.sjanse) { const rv = REGLER.rivaler[Math.floor(r() * REGLER.rivaler.length)];
      s.bud = { rival: rv.id, navn: rv.navn, lønn: rund(s.lønn * (B.påslag[0] + r() * (B.påslag[1] - B.påslag[0])), REGLER.lønn.steg) }; }
    return s;
  }
  // MORGEN: søkere med bud kan gå til rivalen, nye søkere kommer, og en misfornøyd kan bli lokket. Gir { nye, tilRival, lokk, hendelser }.
  function morgen(S, F, tid, ctx = {}, r = rng(S), o = {}) {
    const H = [], ut = { nye: [], tilRival: [], lokk: null, hendelser: H };
    S.dag = Math.floor(tid / REGLER.døgn) + 1;
    for (const s of S.søkere.slice()) if (s.bud && r() < REGLER.bud.gårSjanse) { S.søkere.splice(S.søkere.indexOf(s), 1); S.tapt++; ut.tilRival.push(s);
      H.push(`${s.navn} (${s.yrke}) tok jobben hos ${s.bud.navn}.`); }
    const n = Math.min(antall(ctx, r), Math.max(0, REGLER.maksListe - S.søkere.length));
    for (let i = 0; i < n; i++) { const s = lagSøker(S, F, tid, r); S.søkere.push(s); ut.nye.push(s); }
    if (o.lokk !== false) { const l = lokkSjekk(S, F, tid, r); if (l) { ut.lokk = l; H.push(l.tekst); } }
    return ut;
  }
  // utløpte søkere går (stille, med én samlet linje)
  function steg(S, F, tid) {
    const H = [], borte = S.søkere.filter(s => s.går <= tid); if (borte.length) { S.søkere = S.søkere.filter(s => s.går > tid);
      H.push(borte.length === 1 ? `${borte[0].navn} ventet ikke lenger og tok jobb et annet sted.` : `${borte.length} søkere ventet ikke lenger og tok jobb et annet sted.`); }
    if (S.lokk && tid >= S.lokk.frist) { const l = S.lokk, p = F.personer.find(q => q.id === l.id); S.lokk = null;
      if (p) { FR.fjern(F, p.id); F.borte = (F.borte || 0) + 1; H.push(`${p.navn} har gått over til ${l.navn} (du svarte ikke på tilbudet).`); } }
    return H;
  }
  // ---------- ansette ----------
  // o: { byOver, valg (FolkRegler.behov-valg), tid }. Gir { person, pris, lønn } eller { feil }.
  function kanAnsette(S, F, L, id, o = {}) {
    const s = S.søkere.find(q => q.id === id); if (!s) return 'Søkeren er ikke lenger på lista.';
    if (s.bud && !o.byOver) return `${s.navn.split(' ')[0]} har et bedre bud fra ${s.bud.navn} – by over.`;
    if (!s.bud && o.byOver) return 'Det er ikke noe bud å by over.';
    return FR.kanRekruttere(F, L, o.valg || {});
  }
  const ansettLønn = (s, byOver) => (byOver && s.bud ? s.bud.lønn + REGLER.bud.overbud : s.lønn);
  function ansett(S, F, L, id, betal, o = {}) {
    const f = kanAnsette(S, F, L, id, o); if (f) return { feil: f };
    const s = S.søkere.find(q => q.id === id), pris = REGLER.utstyr; if (!betal(pris)) return { feil: `Ikke nok penger (${LB.kroner(pris)} for utstyret).` };
    const iNød = FR.nød(F), tom = !F.personer.length, l = ansettLønn(s, o.byOver);
    const p = { id: F.neste++, navn: s.navn, alder: s.alder, yrke: s.yrke, ferd: { ...s.ferd }, oppgave: 'fri', helse: 1, lojal: s.lojal, seng: false, lønn: l, egen: (s.egen || []).slice() };
    if (o.byOver) p.lojal = Math.min(1, p.lojal + .05);
    F.personer.push(p); S.søkere.splice(S.søkere.indexOf(s), 1); S.ansatt++;
    if (iNød) { if (FR.arbeidere(F, 'bygg') < FR.R.nødBygg) p.oppgave = 'bygg'; F.moral = Math.max(F.moral, FR.R.nødMoral); F.misnøye = 0; }
    if (tom) F.sist = { ...F.sist, tom: false };
    return { person: p, pris, lønn: l, byOver: !!o.byOver };
  }
  // ---------- rivalene lokker ----------
  const misfornøyd = (F, p) => { const K = REGLER.lokk; return (p.lojal ?? .6) < K.lojal && (F.moral < K.moral || lønn(p) < krav(p) - K.underbetalt); };
  function lokkSjekk(S, F, tid, r) {
    if (S.lokk) return null; const K = REGLER.lokk, M = F.personer.filter(p => misfornøyd(F, p) && !p.karakter);
    if (!M.length || r() >= K.sjanse) return null;
    const p = M.slice().sort((a, b) => (a.lojal ?? .6) - (b.lojal ?? .6))[0], rv = REGLER.rivaler[Math.floor(r() * REGLER.rivaler.length)];
    const bud = Math.max(krav(p), rund(lønn(p) + K.påslag, REGLER.lønn.steg));
    S.lokk = { id: p.id, navn: rv.navn, rival: rv.id, lønn: bud, frist: tid + K.frist, person: p.navn };
    return { ...S.lokk, tekst: `${rv.navn} har tilbudt ${p.navn} ${LB.kroner(bud)} i døgnet. Svar i Folk-panelet innen ${Math.round(K.frist / 60)} timer, ellers går hen.` };
  }
  // valg: 'tillegg' (lønna opp til budet) eller 'gå'
  function svarLokk(S, F, valg) {
    const l = S.lokk; if (!l) return { feil: 'Ingen tilbud å svare på.' }; const p = F.personer.find(q => q.id === l.id); S.lokk = null;
    if (!p) return { tekst: 'Personen er ikke lenger i leiren.' };
    if (valg === 'tillegg') { p.lønn = l.lønn; p.lojal = Math.min(1, (p.lojal ?? .6) + REGLER.lokk.lojalPluss); return { tekst: `${p.navn} blir: lønna er nå ${LB.kroner(l.lønn)} i døgnet.`, person: p }; }
    FR.fjern(F, p.id); F.borte = (F.borte || 0) + 1; return { tekst: `${p.navn} har gått over til ${l.navn}.`, borte: p };
  }
  // ---------- egenskapene i arbeidet ----------
  // faktor på tempoet for personen på oppgaven o; time = klokka (0–24) i spillet
  function personF(p, o, time) {
    if (!p || !Array.isArray(p.egen) || !p.egen.length || o === 'fri') return 1; let f = 1;
    if (p.egen.includes('flittig')) f *= EGENSKAPER.flittig.tempo;
    if (p.egen.includes('nattmenneske') && Number.isFinite(time) && (time >= 18 || time < 6)) f *= EGENSKAPER.nattmenneske.natt;
    if (p.egen.includes('modig') && o === 'vakt') f *= EGENSKAPER.modig.vakt;
    return f;
  }
  // ---------- opplæring ----------
  if (LB && !LB.BYGG.øvingsfelt) {
    LB.BYGG.øvingsfelt = { navn: 'Øvingsfelt', pris: 2.5e6, tid: 2, kw: 0, modell: 'lagertelt', fot: [-4.3, 4.3, -3.8, 3.8], mat: { tre: 10, betong: 4, stål: 1 },
      nivå: { elever: REGLER.skole.elever.slice() }, tekst: 'Skole og øvingsfelt: folk på opplæring lærer en ferdighet (4, 6, 8 elever per nivå)' };
  }
  // elevplasser i leiren: ferdige øvingsfelt som virker (og har strøm: mangler = Set av bygg uten strøm)
  function plasser(L, mangler) {
    if (!L || !Array.isArray(L.bygg)) return 0; const E = REGLER.skole.elever;
    return L.bygg.filter(b => b.type === 'øvingsfelt' && LB.virker(b) && !b.av && !(mangler && mangler.has(b.id))).reduce((s, b) => s + (E[Math.min(E.length, b.nivå || 1) - 1] || E[0]), 0);
  }
  const elever = F => F.personer.filter(p => p.skole);
  const kanLære = o => FR.OPPGAVER.includes(o) && o !== 'fri';
  function startOpplæring(F, L, id, o, mangler) {
    const p = F.personer.find(q => q.id === id); if (!p) return { feil: 'Fant ikke personen.' };
    if (!kanLære(o)) return { feil: 'Velg en ferdighet.' };
    if (p.trener) return { feil: `${p.navn} er alt i opplæring hos en lærer (Samfunn).` };
    if ((p.ferd[o] || 0) >= REGLER.skole.maks - 1e-6) return { feil: `${p.navn} kan ikke bli bedre i ${FR.OPPGAVE[o].navn.toLowerCase()}.` };
    const n = plasser(L, mangler); if (!n) return { feil: 'Bygg et øvingsfelt først (med strøm).' };
    if (!p.skole && elever(F).length >= n) return { feil: `Øvingsfeltet er fullt (${n} elever).` };
    p.skole = o; return { tekst: `${p.navn} går på opplæring i ${FR.OPPGAVE[o].navn.toLowerCase()} og arbeider ikke imens.`, person: p };
  }
  function stoppOpplæring(F, id) { const p = F.personer.find(q => q.id === id); if (!p || !p.skole) return { feil: 'Personen er ikke på opplæring.' }; delete p.skole; return { tekst: `${p.navn} er tilbake i arbeid.`, person: p }; }
  // dt i spillminutter; elevene ut over plassene (og de syke) lærer ikke
  function skoleSteg(F, L, dt, mangler) {
    const H = [], K = REGLER.skole, d = dt / REGLER.døgn; let n = plasser(L, mangler);
    for (const p of elever(F)) {
      if (!kanLære(p.skole)) { delete p.skole; continue; }
      if (n <= 0 || p.helse < FR.R.arbeidsfør || p.karantene || p.borte) continue; n--;
      const før = p.ferd[p.skole] || .9, f = Array.isArray(p.egen) && p.egen.includes('lærenem') ? K.lærenem : 1;
      p.ferd[p.skole] = Math.min(K.maks, Math.round((før + K.fart * f * d) * 1e4) / 1e4);
      if (p.ferd[p.skole] >= K.maks - 1e-6) { H.push(`${p.navn} er ferdig utlært i ${FR.OPPGAVE[p.skole].navn.toLowerCase()} (${des(K.maks)}) og går tilbake i arbeid.`); delete p.skole; }
    }
    return H;
  }
  // mester og lærling: på hver oppgave lærer de andre litt av den dyktigste (ikke de på opplæring eller hos en lærer)
  function mesterSteg(F, dt) {
    const M = REGLER.mester, d = dt / REGLER.døgn, ut = [];
    for (const o of FR.OPPGAVER) { if (o === 'fri') continue; const A = F.personer.filter(p => p.oppgave === o && FR.arbeidsfør(p) && !p.trener);
      if (A.length < 2) continue; const m = A.slice().sort((a, b) => (b.ferd[o] || 0) - (a.ferd[o] || 0))[0], mv = m.ferd[o] || 0; if (mv < M.min) continue;
      const tak = Math.min(M.maks, mv - M.avstand);
      for (const p of A) { if (p === m || (p.ferd[o] || 0) >= tak) continue; p.ferd[o] = Math.min(tak, Math.round(((p.ferd[o] || .9) + M.fart * d) * 1e5) / 1e5); ut.push({ mester: m.id, lærling: p.id, o }); } }
    return ut;
  }
  const des = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  // ---------- kommandoene (registreres av visningen, testes i test_rekruttering.js) ----------
  // M: { tilstand(side), folk(side), leir(side), betal(side), penger(side), valg(side), mangler(side), tid(), endret(side, hva) }
  function registrerKommandoer(K, M = {}) {
    const side = c => (c && c.side) || 'blå', S = c => (M.tilstand ? M.tilstand(side(c)) : null), F = c => (M.folk ? M.folk(side(c)) : null), L = c => (M.leir ? M.leir(side(c)) : null);
    const uten = c => (!S(c) || !F(c) ? 'Ingen folk i leiren.' : null);
    const ferdig = (c, hva, svar) => { if (M.endret) M.endret(side(c), hva); return svar; };
    K.registrer('ansett', { leir: true,
      sjekk: (k, c) => uten(c) || kanAnsette(S(c), F(c), L(c), k.søker, { byOver: !!k.byOver, valg: M.valg ? M.valg(side(c)) : {} })
        || ((M.penger ? M.penger(side(c)) : 0) < REGLER.utstyr ? `Ikke nok penger (${LB.kroner(REGLER.utstyr)} for utstyret).` : null),
      utfør: (k, c) => ferdig(c, 'ansett', ansett(S(c), F(c), L(c), k.søker, M.betal ? M.betal(side(c)) : () => false, { byOver: !!k.byOver, valg: M.valg ? M.valg(side(c)) : {} })),
      beskriv: k => (k.byOver ? 'byr over og ansetter en søker' : 'ansetter en søker') });
    K.registrer('lokkSvar', { leir: true, sjekk: (k, c) => uten(c) || (!S(c).lokk ? 'Ingen tilbud å svare på.' : k.valg !== 'tillegg' && k.valg !== 'gå' ? 'Ugyldig svar.' : null),
      utfør: (k, c) => ferdig(c, 'lokk', svarLokk(S(c), F(c), k.valg)), beskriv: k => (k.valg === 'tillegg' ? 'gir lønnstillegg' : 'lar en gå til rivalen') });
    K.registrer('opplæring', { leir: true, sjekk: (k, c) => uten(c) || (!F(c).personer.some(p => p.id === k.person) ? 'Fant ikke personen.' : null),
      utfør: (k, c) => ferdig(c, 'opplæring', k.ferdighet ? startOpplæring(F(c), L(c), k.person, k.ferdighet, M.mangler ? M.mangler(side(c)) : null) : stoppOpplæring(F(c), k.person)),
      beskriv: k => (k.ferdighet ? 'sender en på opplæring' : 'tar en ut av opplæringen') });
  }
  const api = { REGLER, EGENSKAPER, ny, fraJSON, rng, beste, krav, lønn, forventet, antall, egenskaper, lagSøker, morgen, steg, kanAnsette, ansettLønn, ansett,
    misfornøyd, lokkSjekk, svarLokk, personF, plasser, elever, startOpplæring, stoppOpplæring, skoleSteg, mesterSteg, registrerKommandoer };
  if (NODE) module.exports = api; else rot.Rekruttering = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
