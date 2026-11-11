/* Leirens folk: regler uten DOM (Node: require('./folk'); nettleser: globalThis.Folk og FolkRegler).
 * Brukeren 12. nov (bedre byggesystem): «å dele inn folk til å bygge» og «bygg som betyr noe». Se docs/plan-kollaps.md og plan-gjeng.md.
 *  - Gjengen har medlemmer med norske navn, alder, yrke fra før kollapsen og ferdigheter per oppgave (0,7–1,45).
 *  - Hver person har én oppgave: bygg, hogst, riving, frakt, vakt, kjøkken, stell, verksted eller fri.
 *  - Behov: søvn (senger i brakkene), mat (rasjoner: drivhus, kjøkken, kjøpt mat), varme om vinteren (ved fra lageret eller
 *    drivstoff), helse (sykestue og stell) og moral (ett tall 0–100 for hvordan folk har det).
 *  - Behovene gir arbeidstempo og moral; er moralen lav et døgn, forlater noen gjengen. Rekruttering koster penger og en ledig seng.
 *  - Byggelagene i leir.js kommer fra folk på «bygg»: to personer = ett lag (et lag med én person går halvt så fort).
 *  - Vakttårn bemannes av vaktene, verkstedet reparerer byggene og lager stål av skrap, kjøkkenet (nytt bygg) gir varm mat.
 * Tallene er Claudes forslag (ikke brukerens fasit). Vinteren straffer lite (plan-kollaps.md): litt mer mat og ved, litt lavere moral.
 * Alt lagres i leiren (L.folk i «riksbrudd-k2»).
 */
(function (rot) {
  'use strict';
  const LB = typeof module !== 'undefined' && module.exports ? require('./leir.js') : rot.Leir;
  const OPPGAVER = ['bygg', 'hogst', 'riving', 'frakt', 'vakt', 'kjøkken', 'stell', 'verksted', 'fri'];
  const OPPGAVE = {
    bygg: { navn: 'Bygg', tekst: 'Byggelag: to personer = ett lag' },
    hogst: { navn: 'Hogst', tekst: 'Feller trær og gir tre' },
    riving: { navn: 'Riving', tekst: 'River forlatte hus for materialer' },
    frakt: { navn: 'Frakt', tekst: 'Bærer materialer til leiren' },
    vakt: { navn: 'Vakt', tekst: 'Bemanner vakttårnene og melder fiender' },
    kjøkken: { navn: 'Kjøkken', tekst: 'Lager mat: mindre svinn, bedre moral' },
    stell: { navn: 'Stell', tekst: 'Pleier syke og sårede (best med sykestue)' },
    verksted: { navn: 'Verksted', tekst: 'Reparerer bygg og lager stål (trenger verksted)' },
    fri: { navn: 'Fri', tekst: 'Hviler: bedre moral' },
  };
  // Yrket før kollapsen gir en sterk ferdighet (og litt i en annen)
  const YRKER = [
    { navn: 'snekker', f: { bygg: 1.4, riving: 1.1 } }, { navn: 'tømrer', f: { bygg: 1.35, hogst: 1.1 } }, { navn: 'skogsarbeider', f: { hogst: 1.45, frakt: 1.1 } },
    { navn: 'anleggsarbeider', f: { riving: 1.4, bygg: 1.15 } }, { navn: 'sjåfør', f: { frakt: 1.4, verksted: 1.05 } }, { navn: 'tidligere soldat', f: { vakt: 1.45, frakt: 1.05 } },
    { navn: 'vekter', f: { vakt: 1.3 } }, { navn: 'kokk', f: { kjøkken: 1.45 } }, { navn: 'sykepleier', f: { stell: 1.45, kjøkken: 1.05 } },
    { navn: 'helsefagarbeider', f: { stell: 1.3 } }, { navn: 'bilmekaniker', f: { verksted: 1.45, frakt: 1.1 } }, { navn: 'sveiser', f: { verksted: 1.35, bygg: 1.1 } },
    { navn: 'bonde', f: { hogst: 1.2, kjøkken: 1.15, bygg: 1.05 } }, { navn: 'elektriker', f: { verksted: 1.25, bygg: 1.1 } }, { navn: 'lærer', f: { stell: 1.1, kjøkken: 1.05 } },
    { navn: 'student', f: {} },
  ];
  const FORNAVN = ['Ola', 'Kari', 'Per', 'Ingrid', 'Lars', 'Silje', 'Knut', 'Marte', 'Erik', 'Hanne', 'Jon', 'Tone', 'Arne', 'Siri', 'Trond', 'Mari', 'Geir', 'Linn',
    'Bjørn', 'Ragnhild', 'Odd', 'Astrid', 'Even', 'Guro', 'Håkon', 'Liv', 'Sindre', 'Kristin', 'Tor', 'Randi', 'Magnus', 'Sigrid', 'Vegard', 'Eli', 'Øystein', 'Åse'];
  const ETTERNAVN = ['Haugen', 'Bakken', 'Lien', 'Moen', 'Dahl', 'Berg', 'Brekke', 'Sletten', 'Rønning', 'Holm', 'Nygård', 'Solberg', 'Strand', 'Vik', 'Løkken',
    'Aas', 'Myhre', 'Tangen', 'Hagen', 'Kvam', 'Røste', 'Bøe', 'Sæther', 'Grønli', 'Fossum', 'Lund', 'Furuseth', 'Hovde', 'Ødegård', 'Stølen'];
  // Startfordelingen for ti personer: de små oppgavene først (den beste får dem), så bygg, resten fri
  const START = { kjøkken: 1, vakt: 1, hogst: 1, frakt: 1, bygg: 4, fri: 2 };
  const R = {
    døgn: 1440,                 // spillminutter
    rasjon: 1, rasjonVinter: 1.2, // per person per døgn
    kjøkkenSvinn: .85,          // med bemannet kjøkken spises det mindre (mindre svinn)
    perKokk: 8,                 // én på kjøkkenet holder til åtte personer
    drivhus: 3,                 // rasjoner per døgn per drivhus med strøm (sommer; vår/høst 60 %, vinter 30 %)
    matPris: 3000,              // kr per rasjon (kjøpt)
    rekruttPris: 5e5,
    varmeEnhet: 8,              // ett fyringssted per åtte personer
    ved: .5, drivstoff: 50,     // per fyringssted per døgn om vinteren (m³ tre eller liter); halvparten vår og høst
    helseSult: .15, helseKulde: .04, helseNatur: .05, helseStell: .6, perStell: 3,
    verkstedHp: .25, verkstedStål: .5, perVerksted: 4,
    moralFart: 4,               // poeng per spilltime mot målet
    lavMoral: 25, gåTid: 1440,  // under 25 i et døgn: én forlater gjengen
    arbeidsfør: .4,
  };
  // Enkel, fast tilfeldighet (samme frø gir samme folk)
  function rng(frø) { let a = frø >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function nyPerson(F, r, oppgave = 'fri', yrke = null) {
    // helst ingen like fornavn eller etternavn i gjengen
    const fb = new Set(F.personer.map(p => p.navn.split(' ')[0])), eb = new Set(F.personer.map(p => p.navn.split(' ').slice(1).join(' '))); let navn;
    for (let i = 0; i < 60; i++) { const a = FORNAVN[Math.floor(r() * FORNAVN.length)], e = ETTERNAVN[Math.floor(r() * ETTERNAVN.length)]; navn = a + ' ' + e; if (!fb.has(a) && !eb.has(e)) break; }
    const y = YRKER.find(q => q.navn === yrke) || YRKER[Math.floor(r() * YRKER.length)], ferd = {};
    for (const o of OPPGAVER) if (o !== 'fri') ferd[o] = Math.round((y.f[o] || (.75 + r() * .3)) * 100) / 100;
    const p = { id: F.neste++, navn, alder: 19 + Math.floor(r() * 44), yrke: y.navn, ferd, oppgave, helse: 1, lojal: Math.round((.3 + r() * .7) * 100) / 100, seng: false };
    F.personer.push(p); return p;
  }
  // Ny gjeng: ti personer, fordelt etter START (den som er best på en oppgave får den først)
  function ny(frø = 1987) {
    const F = { versjon: 1, personer: [], neste: 1, mat: 30, moral: 60, mål: 60, misnøye: 0, frø: frø >>> 0, borte: 0, sist: {} }, r = rng(F.frø);
    // startgjengen har ett av hvert viktig yrke og én tilfeldig, i tilfeldig rekkefølge
    const yrker = ['snekker', 'tømrer', 'anleggsarbeider', 'skogsarbeider', 'sjåfør', 'tidligere soldat', 'kokk', 'sykepleier', 'bilmekaniker', null];
    for (let i = yrker.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [yrker[i], yrker[j]] = [yrker[j], yrker[i]]; }
    for (const y of yrker) nyPerson(F, r, 'fri', y);
    F.frø = Math.floor(r() * 4294967296);
    const ledige = F.personer.slice();
    for (const [o, n] of Object.entries(START)) for (let i = 0; i < n && ledige.length; i++) {
      ledige.sort((a, b) => (o === 'fri' ? 0 : b.ferd[o] - a.ferd[o])); ledige.shift().oppgave = o; }
    return F;
  }
  const arbeidsfør = p => p.helse >= R.arbeidsfør;
  const på = (F, o) => F.personer.filter(p => p.oppgave === o);
  const arbeidere = (F, o) => på(F, o).filter(arbeidsfør).length;
  const moralFaktor = m => .55 + .6 * Math.max(0, Math.min(100, m)) / 100;
  // Tempo for én person på oppgaven: ferdighet × moral × søvn × helse
  const personTempo = (F, p, o) => (o === 'fri' ? 1 : p.ferd[o] || 1) * moralFaktor(F.moral) * (p.seng || F.sist.alleSeng ? 1 : .85) * (.5 + .5 * Math.min(1, p.helse));
  // Snittet for dem som er i arbeid på oppgaven (0 når ingen er der), 0–1,5
  function tempo(F, o) { const A = på(F, o).filter(arbeidsfør); if (!A.length) return 0; return Math.min(1.5, Math.max(0, A.reduce((s, p) => s + personTempo(F, p, o), 0) / A.length)); }
  // Byggelagene: to personer = ett lag; et lag med én person går halvt så fort (byggTempo)
  const byggelag = F => Math.ceil(arbeidere(F, 'bygg') / 2);
  function byggTempo(F) { const n = arbeidere(F, 'bygg'), l = byggelag(F); return l ? tempo(F, 'bygg') * n / (2 * l) : 0; }
  // ---------- fordele oppgaver ----------
  function sett(F, id, o) { const p = F.personer.find(q => q.id === id); if (!p || !OPPGAVER.includes(o)) return false; p.oppgave = o; return true; }
  // +: den beste av de frie (helst arbeidsføre); er ingen fri, tas en fra oppgaven med flest folk (ikke fra o)
  function pluss(F, o) {
    if (!OPPGAVER.includes(o) || o === 'fri') return pluss2(F, o);
    let kilde = på(F, 'fri');
    if (!kilde.length) { const tall = OPPGAVER.filter(q => q !== o && q !== 'fri').map(q => [q, på(F, q).length]).sort((a, b) => b[1] - a[1]); if (!tall.length || !tall[0][1]) return null; kilde = på(F, tall[0][0]); }
    const p = kilde.slice().sort((a, b) => (arbeidsfør(b) - arbeidsfør(a)) || (b.ferd[o] - a.ferd[o]))[0]; p.oppgave = o; return p;
  }
  // + på «fri»: den svakeste fra oppgaven med flest folk får fri
  function pluss2(F, o) { if (o !== 'fri') return null; const tall = OPPGAVER.filter(q => q !== 'fri').map(q => [q, på(F, q).length]).sort((a, b) => b[1] - a[1]); if (!tall[0][1]) return null; return minus(F, tall[0][0]); }
  // −: den svakeste på oppgaven får fri (på «fri»: den beste av de frie går til bygg)
  function minus(F, o) {
    if (o === 'fri') { const p = på(F, 'fri').sort((a, b) => b.ferd.bygg - a.ferd.bygg)[0]; if (!p) return null; p.oppgave = 'bygg'; return p; }
    const p = på(F, o).sort((a, b) => (arbeidsfør(a) - arbeidsfør(b)) || (a.ferd[o] - b.ferd[o]))[0]; if (!p) return null; p.oppgave = 'fri'; return p;
  }
  // ---------- byggene i leiren ----------
  // Ferdige bygg som virker og har strøm (mangler: Set av id-er uten strøm fra Leir.steg)
  const iDrift = (L, type, mangler) => L.bygg.filter(b => b.type === type && LB.virker(b) && !(mangler && mangler.has(b.id)));
  const årstidF = (å, v) => ({ vinter: v[0], vår: v[1], høst: v[1], sommer: v[2] }[å] ?? v[2]);
  // Hva leiren har for behovene nå. o: { årstid, mangler, ekstraSenger }
  function behov(F, L, o = {}) {
    const n = F.personer.length, senger = LB.plasser(L) + (o.ekstraSenger || 0), kjøkken = iDrift(L, 'kjøkken', o.mangler).length;
    const kokker = på(F, 'kjøkken').filter(arbeidsfør).reduce((s, p) => s + personTempo(F, p, 'kjøkken'), 0);
    const bemannet = n ? Math.min(1, kokker * R.perKokk / n) : 0, vinter = o.årstid === 'vinter';
    const sesong = årstidF(o.årstid, [1, .5, 0]), fyring = sesong ? Math.ceil(n / R.varmeEnhet) * sesong : 0;
    const drivhus = iDrift(L, 'drivhus', o.mangler).length * R.drivhus * årstidF(o.årstid, [.3, .6, 1]);
    const spiser = n * (vinter ? R.rasjonVinter : R.rasjon) * (bemannet > 0 ? 1 - (1 - R.kjøkkenSvinn) * bemannet : 1);
    const tårn = iDrift(L, 'vakttårn').length, vakter = arbeidere(F, 'vakt');
    return { n, senger, utenSeng: Math.max(0, n - senger), kjøkken, bemannet, varmMat: kjøkken > 0 && bemannet > 0, fyring, ved: fyring * R.ved, drivstoff: fyring * R.drivstoff,
      drivhus, spiser, netto: drivhus - spiser, dager: spiser > drivhus ? F.mat / (spiser - drivhus) : Infinity, sykestue: iDrift(L, 'sykestue', o.mangler).length,
      verksted: iDrift(L, 'verksted', o.mangler).length, tårn, ferdige: t => L.bygg.filter(b => b.type === t && LB.ferdig(b)).length, bemannedeTårn: Math.min(tårn, vakter), vakter, syke: F.personer.filter(p => p.helse < 1).length };
  }
  // ---------- ett steg ----------
  // dt i spillminutter. o: { årstid, mangler, ekstraSenger }. Gir { hendelser: [tekst], ... } og endrer F (og L: ved, drivstoff, stål, hp).
  function steg(F, L, dt, o = {}) {
    const H = [], d = dt / R.døgn, B = behov(F, L, o), n = B.n;
    if (!n) { F.sist = { ...B, alleSeng: true }; return { hendelser: H, behov: B }; }
    // senger: de som har vært lengst i gjengen får seng først
    F.personer.forEach((p, i) => { p.seng = i < B.senger; });
    // mat
    F.mat = Math.max(0, F.mat + (B.drivhus - B.spiser) * d); const sult = F.mat <= 0 && B.drivhus < B.spiser;
    // varme: ved fra lageret først, så drivstoff
    let kald = 0;
    if (B.fyring > 0) { const vb = B.ved * d, har = Math.min(L.lager.tre || 0, vb); L.lager.tre = (L.lager.tre || 0) - har; let mangel = vb > 0 ? 1 - har / vb : 0;
      if (mangel > 1e-9) { const lb = B.drivstoff * d * mangel, l = Math.min(L.drivstoff || 0, lb); L.drivstoff = (L.drivstoff || 0) - l; mangel *= lb > 0 ? 1 - l / lb : 0; }
      // i telt (uten seng) holder fyringen bare halvveis om vinteren
      kald = Math.min(1, mangel + (o.årstid === 'vinter' ? .5 * B.utenSeng / n : 0)); }
    // helse: sult og kulde tærer; hvile, stell og sykestue leger
    const stellere = på(F, 'stell').filter(arbeidsfør), stellKraft = stellere.reduce((s, p) => s + personTempo(F, p, 'stell'), 0) * (B.sykestue ? 1 : .3);
    const syke = F.personer.filter(p => p.helse < 1).sort((a, b) => a.helse - b.helse);
    let plasser = Math.round(stellere.length * R.perStell);
    for (const p of F.personer) {
      let dh = -(sult ? R.helseSult : 0) - kald * R.helseKulde;
      if (!sult && kald < .5) dh += R.helseNatur * (p.oppgave === 'fri' ? 2 : 1);
      if (p.helse < 1 && plasser > 0 && syke.includes(p) && stellere.length && !stellere.includes(p)) { dh += R.helseStell * stellKraft / stellere.length; plasser--; }
      const før = p.helse; p.helse = Math.max(0, Math.min(1, p.helse + dh * d));
      if (før >= R.arbeidsfør && p.helse < R.arbeidsfør) H.push(`${p.navn} er syk og kan ikke arbeide.`);
      if (før < R.arbeidsfør && p.helse >= R.arbeidsfør) H.push(`${p.navn} er frisk igjen.`);
    }
    for (const p of F.personer.filter(q => q.helse <= 0)) { H.push(`${p.navn} er død.`); F.personer = F.personer.filter(q => q !== p); }
    // verkstedet: reparerer skadde bygg (de mest skadde først), ellers stål av skrap
    const vk = på(F, 'verksted').filter(arbeidsfør).slice(0, B.verksted * R.perVerksted).reduce((s, p) => s + personTempo(F, p, 'verksted'), 0);
    if (vk > 0) { const skadd = L.bygg.filter(b => LB.ferdig(b) && !b.arbeid && b.hp < 1).sort((a, b) => a.hp - b.hp)[0];
      if (skadd) { skadd.hp = Math.min(1, skadd.hp + R.verkstedHp * vk * d); if (skadd.hp >= 1) H.push(`Verkstedet har reparert ${LB.BYGG[skadd.type].navn.toLowerCase()}.`); }
      else { const m = R.verkstedStål * vk * d; if (LB.leggInn) LB.leggInn(L, 'stål', m); else L.lager.stål = Math.min(LB.lagerplass(L), (L.lager.stål || 0) + m); } }
    // moral: målet etter behovene, og moralen glir mot det
    const fri = på(F, 'fri').length / n, mål = 60
      + (B.utenSeng ? -20 * B.utenSeng / n : 8)
      + (sult ? -45 : F.mat < n ? -5 : 0)
      + (B.varmMat ? 8 * B.bemannet : 3 * B.bemannet)
      - 12 * kald
      + Math.min(10, 40 * fri) - (fri < .1 ? 5 : 0)
      + (B.sykestue ? 3 : 0)
      - (F.personer.reduce((s, p) => s + p.helse, 0) / Math.max(1, F.personer.length) < .6 ? 10 : 0);
    F.mål = Math.max(5, Math.min(95, mål));
    const steg1 = R.moralFart * dt / 60; F.moral += Math.max(-steg1, Math.min(steg1, F.mål - F.moral));
    // lav moral et helt døgn: den minst lojale forlater gjengen
    if (F.moral < R.lavMoral) { F.misnøye += dt;
      if (F.misnøye >= R.gåTid && F.personer.length) { const p = F.personer.slice().sort((a, b) => a.lojal - b.lojal)[0]; F.personer = F.personer.filter(q => q !== p); F.misnøye = 0; F.borte++;
        H.push(`${p.navn} har forlatt gjengen (moralen er for lav).`); } }
    else F.misnøye = Math.max(0, F.misnøye - dt);
    if (sult && !F.sist.sult) H.push('Leiren er tom for mat! Kjøp mat eller bygg drivhus.');
    if (kald > .5 && !(F.sist.kald > .5)) H.push('Folk fryser: legg inn ved (tre) eller drivstoff, og bygg brakker.');
    F.sist = { ...B, sult, kald, alleSeng: !B.utenSeng };
    return { hendelser: H, behov: B, sult, kald };
  }
  // ---------- mat og rekruttering ----------
  function kjøpMat(F, rasjoner, betal) {
    const pris = rasjoner * R.matPris; if (!betal(pris)) return { feil: `Ikke nok penger (${LB.kroner(pris)}).` };
    F.mat += rasjoner; return { rasjoner, pris };
  }
  function rekrutter(F, L, betal, o = {}) {
    const B = behov(F, L, o); if (B.senger <= B.n) return { feil: 'Ingen ledig seng: bygg en brakke først.' };
    if (F.moral < 40) return { feil: 'Moralen er for lav til at noen vil bli med.' };
    if (!betal(R.rekruttPris)) return { feil: `Ikke nok penger (${LB.kroner(R.rekruttPris)}).` };
    const r = rng(F.frø); const p = nyPerson(F, r); F.frø = Math.floor(r() * 4294967296); return { person: p, pris: R.rekruttPris };
  }
  // ---------- forsvar ----------
  // Bemannede vakttårn (de første tårnene får vaktene) og sandsekkvollene som virker
  function forsvar(F, L) {
    const tårn = iDrift(L, 'vakttårn'), v = arbeidere(F, 'vakt');
    return { tårn: tårn.slice(0, v), vakter: v, varsling: v ? (tårn.length ? 800 : 400) * Math.max(.5, tempo(F, 'vakt')) : 0, sekker: iDrift(L, 'sandsekkvoll') };
  }
  // Lagring: legger til det som mangler fra eldre versjoner
  function fraJSON(o) {
    if (!o || !Array.isArray(o.personer)) return null; const F = { ...ny(o.frø || 1987), ...o };
    F.personer = o.personer.filter(p => p && p.navn).map(p => ({ helse: 1, lojal: .6, seng: false, ferd: {}, yrke: 'student', alder: 30, ...p, oppgave: OPPGAVER.includes(p.oppgave) ? p.oppgave : 'fri' }));
    for (const p of F.personer) for (const q of OPPGAVER) if (q !== 'fri' && !p.ferd[q]) p.ferd[q] = .9;
    F.neste = Math.max(F.neste || 1, ...F.personer.map(p => p.id + 1)); F.sist = F.sist || {}; return F;
  }
  // Leir.BYGG får et kjøkken, og byggelagene i leir.js hentes fra folket (når leiren har folk)
  if (LB) {
    if (!LB.BYGG.kjøkken) LB.BYGG.kjøkken = { navn: 'Kjøkken', pris: 3e6, tid: 2, kw: -2, modell: 'kjøkken', fot: [-3.6, 3.6, -4.6, 4.6], mat: { tre: 12, betong: 4, stål: 2 }, tekst: 'Varm mat: mindre svinn og bedre moral (folk på «kjøkken»)' };
    if (!LB.PRIORITET.includes('kjøkken')) LB.PRIORITET.push('kjøkken');
    // tekstene i byggemenyen sier hva byggene gjør for folket
    const T = { brakke: 'Senger til folket (8, 14, 20 per nivå)', vakttårn: 'Bemannet av en vakt: lag i nærheten ser lenger og treffer bedre, og vakta melder fiender',
      verksted: 'Folk på «verksted» reparerer byggene og lager stål av skrap', sykestue: 'Folk på «stell» leger syke og sårede raskere', drivhus: 'Dyrker mat (3 rasjoner per døgn om sommeren)',
      sandsekkvoll: 'Dekning: egne lag bak vollen får færre treff' };
    for (const [k, t] of Object.entries(T)) if (LB.BYGG[k]) LB.BYGG[k].tekst = t;
    LB.folkLag = L => (L.folk && Array.isArray(L.folk.personer) ? byggelag(L.folk) : null);
    LB.folkTempo = L => (L.folk && Array.isArray(L.folk.personer) ? byggTempo(L.folk) : 1);
  }
  const api = { OPPGAVER, OPPGAVE, YRKER, R, ny, nyPerson, rng, arbeidsfør, arbeidere, tempo, personTempo, byggelag, byggTempo, sett, pluss, minus, behov, steg, kjøpMat, rekrutter, forsvar, fraJSON, moralFaktor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.FolkRegler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
