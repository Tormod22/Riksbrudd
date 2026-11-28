/* ØKONOMITESTEN (G1, docs/plan-selskap-okonomi.md kapittel 13.4): et spill som spiller 30 spilldøgn av seg selv i Node, uten nettleser.
 *
 * Modellen er forenklet, men ærlig: ALLE TALL FRA SPILLET HENTES FRA DE EKTE REGELMODULENE (leir.js, folk.js, spillet.js, selskap.js,
 * region.js, garnison.js, krig.js, strategi.js, tropper.js, terreng.js …). Det som står i REGLER her, er bare det modellen selv trenger
 * fordi visningen (kartet, ENHETER, rutene) ikke finnes i Node – og det er Claudes forslag (står ved hvert tall).
 *
 * Hva som regnes, time for time (60 spillminutter per steg, 1440 per døgn som i spillet):
 *  - leiren (Leir.steg: byggelag, strøm, diesel), folket (FolkRegler.steg: mat, moral, sult, folk som drar), lønna (FolkRegler.lønnSteg,
 *    15 000 kr per person i døgnet med inflasjonen, også for mennene i troppene), vedlikeholdet (Leir.vedlikehold), diesel og mat kjøpt i
 *    markedet (Marked: priser, hyller, inflasjon 1 % per døgn);
 *  - kontraktene (Selskap: tilbud hver morgen, godta med kravene, steg med frister og konkurrenter, lever/bryt, nivåer, bøter): en tropp
 *    marsjerer dit (Terreng.fart, Selskap.REGLER.marsj.slakk), slåss med vegsperra eller angrepslaget (Terreng.ildrunde/fordelTreff), holder
 *    stedet i timene kontrakten krever, henter personen og går hjem;
 *  - tettstedene (Region.gir/lojSteg/opprør, Garnison.tidMed/minstFor, Krig.vernMenn/vernRunde): en tropp går dit, slåss med bygdevernet,
 *    tar stedet, lar en garnison stå igjen, og stedet gir skatt (med innkjøring og forvaltning), mat, materialer, diesel og rekrutter;
 *  - røverne (Trussel: bølger, størrelse, bytte, belønning) angriper leiren, og vaktlaget + troppene hjemme forsvarer den;
 *  - byggene (Leir.bygg med materialer kjøpt i markedet med påslaget) som strategiene bygger.
 *
 * UTVIDE (sagbruk, byavtaler, børs …): se docs/natt/ut1-okotest.md. Kort: leggTilDel({ id, start(sim), time(sim), døgn(sim) }) for en ny
 * økonomidel, leggTilStrategi({ id, navn, fornuftig, start(sim), time(sim), døgn(sim) }) for nye strategier, og leggTilKrav({ navn,
 * sjekk(res) }) for nye krav. Pengene går alltid gjennom sim.betal(kr, post) og sim.gi(kr, post), så dagboka får posten.
 */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'), FolkR = require(SP + '/folk.js'), Spillet = require(SP + '/spillet.js'), Selskap = require(SP + '/selskap.js');
const Region = require(SP + '/region.js'), Garnison = require(SP + '/garnison.js'), Krig = require(SP + '/krig.js'), Strategi = require(SP + '/strategi.js');
const Tropper = require(SP + '/tropper.js'), Kjoretoy = require(SP + '/kjoretoy.js'), Scenario = require(SP + '/scenario.js');
const { Terreng } = require('../../site/dovre-fliser/terreng.js');
const { Marked, Trussel } = Spillet;

// Startkassa i et EKTE spill. oppstart.js gir 100 mill. i Node og under navigator.webdriver (testverdien), og 40 mill. ellers – derfor
// leses fila i en egen sandkasse uten «module» og «navigator», så tallet kommer fra spillet og ikke skrives inn her.
function ekteStartpenger() {
  const ctx = { console, require: n => require(path.join(SP, n)) }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SP + '/oppstart.js', 'utf8'), ctx, { filename: 'oppstart.js' });
  const v = ctx.Oppstart && ctx.Oppstart.STARTPENGER; if (!(v > 0)) throw new Error('fant ikke STARTPENGER i oppstart.js'); return v;
}

// ---------- det modellen trenger (alle tallene er Claudes forslag) ----------
const REGLER = {
  døgn: 30,                       // spilldøgn per kjøring (planen 13.4)
  stegMin: 60,                    // ett steg = én spilltime
  årstid: 'sommer',               // spillet begynner om sommeren; test_okonomitest.js kan kjøre andre årstider
  // startleiren: det test_balanse.js og spillets råd regner som minimum (oppstart.js: kontrollrom, aggregat, brakke, dieseltank) + diesel
  grunnbygg: ['kontrollrom', 'brakke', 'aggregat', 'drivstofftank'], startDiesel: 500,
  // innkjøp som i test_balanse.js: mat når det er under «matDøgn» døgn igjen (kjøper for «matKjøp» døgn), diesel opp til «diesel» liter
  matDøgn: 3, matKjøp: 5, dieselUnder: 150, diesel: 500,
  // en lastebil fra start (eskortene krever et eget kjøretøy, Selskap.kanTa) – usikkert om alle nye spill har den; Claudes valg
  kjøretøy: 1,
  // marsjen: andel av ruta på veg (resten i terrenget, Terreng.fart klasse 1 skog / 5 dyrket mark i snitt), og hvor mye lenger ruta er
  // enn luftlinja. Bilen kjører i snitt «bilAndel» av toppfarten (Kjoretoy.TYPER.lastebil.maks).
  marsj: { vegAndel: .6, omveg: 1.3, bilAndel: .5 },
  // kampen: avstanden de skyter på, lengste kamp (runder à Terreng.KAMPRUNDE_MIN), og når en egen tropp trekker seg (andel ute)
  kamp: { avstand: 250, maksRunder: 48, trekk: .5 },
  // som i spill/selskap-visning.js (lagSperre, angrepslaget): seks mann ved sperra og i angrepslaget mot eskorten
  sperreMenn: 6, angrepMenn: 6,
  // et sted et annet selskap holder (k.fare): så mange i garnisonen der (Claudes anslag – i spillet er det AI-ens lag)
  fareMenn: 8,
  // som i spill/spillet-visning.js (FØRSTE): første røverbølge har høyst fire mann
  førsteBølge: 4,
  // sårede blir friske etter så mange timer hjemme i leiren (sanitet og sykestue er ikke regnet ut i detalj)
  leges: 24,
  // tettstedene rundt leiren: antall, avstand (km) og størrelse (andel små/mellomstore/store og innbyggere i hver gruppe)
  region: { antall: [6, 10], km: [3, 30], størrelse: [[.6, 200, 1500], [.3, 1500, 6000], [.1, 6000, 25000]], kai: .3, kraft: .3, olje: .04, strøm: .85,
    // andelen tettsteder som Ravnsund eller Mosevakt holder fra start, og bruer i kontraktene
    rival: .2, bruer: 3 },
  // motstanderne: sjansen per døgn for at de prøver å ta et av dine tettsteder igjen (med «angrep» mann), og at de tar et nøytralt
  byAngrep: { sjanse: .04, menn: 8 }, rivalTar: .03,
  // så mange mann blir igjen som garnison i et tettsted strategiene tar (Garnison/Region: garnisonen løfter lojaliteten og hindrer opprør)
  garnison: 3,
  // timer fra en tropp er hjemme til spilleren har sett det og gitt neste ordre (lese tilbudene, velge, sende)
  reaksjon: 1,
  // når en kjøring regnes som blakk: kassa klarer ikke lønna (F.ubetalt > 0)
};

// ---------- tilfeldighet (fast frø: samme frø gir samme kjøring) ----------
const rngFra = n => Terreng.frø(n);

// ---------- delene og strategiene (kan utvides) ----------
const DELER = [], STRATEGIER = {}, KRAV = [];
const leggTilDel = d => { DELER.push(d); return d; };
const leggTilStrategi = s => { STRATEGIER[s.id] = s; return s; };
const leggTilKrav = k => { KRAV.push(k); return k; };

// ---------- hjelpere ----------
const mill = v => (v / 1e6).toFixed(1).replace('.', ',') + ' mill.';
const friske = menn => menn.filter(m => m.hp >= 1).length;
const levende = menn => menn.filter(m => m.hp > 0);
// marsjfart til fots i km/t: veg og terreng etter REGLER.marsj (harmonisk snitt, så den langsomme delen teller mest)
const gåKmt = () => { const M = REGLER.marsj, veg = Terreng.fart(1, 2), terr = (Terreng.fart(1, 0) + Terreng.fart(5, 0)) / 2; return 1 / (M.vegAndel / veg + (1 - M.vegAndel) / terr); };
const marsjTimer = meter => meter * REGLER.marsj.omveg / 1000 / gåKmt() * Selskap.REGLER.marsj.slakk;
const bilTimer = meter => meter * REGLER.marsj.omveg / 1000 / (Kjoretoy.TYPER.lastebil.maks * REGLER.marsj.bilAndel);

// Kamp mellom to grupper menn (Terreng.ildrunde og fordelTreff, én runde per KAMPRUNDE_MIN). o.fA/o.fB: forholdene når A/B skyter
// (Terreng.treffsjanse). stoppA/stoppB(menn) -> true når den siden gir opp. Gir { vinner: 'A' | 'B' | null, runder }.
function kamp(A, B, rng, o = {}) {
  const d = o.avstand || REGLER.kamp.avstand, fA = o.fA || {}, fB = o.fB || {};
  const stoppA = o.stoppA || (m => Terreng.slattUt(m) || friske(m) === 0), stoppB = o.stoppB || (m => Terreng.slattUt(m) || friske(m) === 0);
  for (let r = 1; r <= (o.runder || REGLER.kamp.maksRunder); r++) {
    const tA = Terreng.ildrunde(A, d, fA, rng), tB = Terreng.ildrunde(B, d, fB, rng);
    Terreng.fordelTreff(B, tA, rng); Terreng.fordelTreff(A, tB, rng);
    if (stoppB(B)) return { vinner: 'A', runder: r }; if (stoppA(A)) return { vinner: 'B', runder: r };
  }
  return { vinner: null, runder: o.runder || REGLER.kamp.maksRunder };
}
const fiendeLag = (n, rolle = 'rifle') => Array.from({ length: n }, (_, i) => ({ navn: 'fiende ' + (i + 1), rolle, hp: 1 }));
// egen tropp trekker seg når så stor del er ute (eller den er slått ut etter spillets regel)
const troppGirOpp = menn => Terreng.slattUt(menn) || (menn.length - friske(menn)) >= Math.ceil(menn.length * REGLER.kamp.trekk);

// ---------- regionen (tettstedene rundt leiren) ----------
function lagRegion(rng) {
  const R = REGLER.region, n = R.antall[0] + Math.floor(rng() * (R.antall[1] - R.antall[0] + 1)), byer = [];
  for (let i = 0; i < n; i++) {
    let x = rng(), gr = R.størrelse[0]; for (const g of R.størrelse) { if (x < g[0]) { gr = g; break; } x -= g[0]; }
    const folk = Math.round(gr[1] * Math.pow(gr[2] / gr[1], rng())), km = R.km[0] + rng() * (R.km[1] - R.km[0]), v = rng() * Math.PI * 2;
    const om = { kai: rng() < R.kai ? 800 : Infinity, kraft: rng() < R.kraft ? 3000 : Infinity, olje: rng() < R.olje ? 4000 : Infinity };
    const eier = rng() < R.rival ? (rng() < .5 ? 'rød' : 'grønn') : null;
    byer.push({ id: 'by' + i, navn: 'Sted ' + (i + 1), folk, x: Math.round(Math.cos(v) * km * 1000), y: Math.round(Math.sin(v) * km * 1000), type: Region.type(folk, om), strøm: rng() < R.strøm, eier, vern: Krig.vernMenn(folk), garnison: null, inntak: 0 });
  }
  const bruer = Array.from({ length: R.bruer }, (_, i) => { const km = 3 + rng() * 15, v = rng() * Math.PI * 2; return { id: 'bru' + i, navn: 'Bru ' + (i + 1), slag: 'bru', x: Math.round(Math.cos(v) * km * 1000), y: Math.round(Math.sin(v) * km * 1000) }; });
  return { byer, bruer };
}

// ---------- én kjøring ----------
function nySim(strategiId, frø, o = {}) {
  const st = STRATEGIER[strategiId]; if (!st) throw new Error('ukjent strategi ' + strategiId);
  const rng = rngFra(frø * 7919 + 13), rngMarked = rngFra(frø * 104729 + 7), rngKamp = rngFra(frø * 15485863 + 3);
  const sim = { strategi: st, frø, t: 0, kasse: o.startpenger || ekteStartpengerHurtig(), M: Marked.ny(), L: Leir.ny(), F: FolkR.ny(1987 + frø), rng, rngMarked, rngKamp,
    årstid: o.årstid || REGLER.årstid, tropper: [], vakt: null, bok: { inn: {}, ut: {} }, sum: { inn: {}, ut: {} }, dager: [], hendelser: [], blakkDag: null, blakkTimer: 0,
    region: lagRegion(rngFra(frø * 31 + 5)), RG: Region.ny(), SK: Selskap.ny({ x: 0, y: 0 }), o, nrBygg: 0, døde: 0, faktor: o.faktor || {} };
  sim.L.folk = sim.F;
  sim.betal = (kr, post) => { kr = Math.round(kr); if (!(kr > 0)) return true; if (kr > sim.kasse) return false; sim.kasse -= kr; sim.bok.ut[post] = (sim.bok.ut[post] || 0) + kr; return true; };
  sim.gi = (kr, post) => { kr = Math.round(kr); if (!(kr > 0)) return; sim.kasse += kr; sim.bok.inn[post] = (sim.bok.inn[post] || 0) + kr; };
  sim.logg = t => { if (o.logg) sim.hendelser.push(`dag ${Math.floor(sim.t / 1440) + 1} kl. ${String((Math.floor(sim.t % 1440 / 60) + 6) % 24).padStart(2, '0')}: ${t}`); };
  // vaktlaget fra oppstarten (Scenario.REGLER.vaktlag) – startlagene får ikke lønn i spillet (bare troppene laget av folket, s.fraFolk)
  sim.vakt = { navn: 'Vaktlaget', menn: fiendeLag(Scenario.REGLER.vaktlag).map((m, i) => ({ ...m, navn: 'vakt ' + (i + 1) })), hjemme: true, betalt: false };
  sim.F.mat += Scenario.REGLER.startmat;
  // startleiren
  for (const t of REGLER.grunnbygg) { const r = bygg(sim, t, 'startleir'); if (r.feil) throw new Error('startleiren: ' + r.feil); }
  kjøpDiesel(sim, REGLER.startDiesel, 'startleir', true);
  for (const d of DELER) if (d.start) d.start(sim);
  if (st.start) st.start(sim);
  return sim;
}
let _start = null; const ekteStartpengerHurtig = () => (_start === null ? (_start = ekteStartpenger()) : _start);

// ---------- felles handlinger (brukes av delene og strategiene) ----------
// materialer kjøpes i markedet med påslaget (Marked.kjøpspris «dyrt»), så langt hyllene rekker
function kjøpMat(sim, mat, post) {
  const L = sim.L, M = sim.M; let kr = 0; const kjøp = {};
  for (const [v, trengs] of Object.entries(mat || {})) { const m = Math.max(0, Math.ceil((trengs - (L.lager[v] || 0)) * 10 - 1e-6) / 10); if (!m) continue;
    if (Marked.kan(M, v, m) < m) return { feil: 'tomt i markedet: ' + v }; kjøp[v] = m; kr += m * Marked.kjøpspris(M, v, Leir.MATERIALER[v].pris, true); }
  if (!sim.betal(kr, post)) return { feil: 'for lite penger' };
  for (const [v, m] of Object.entries(kjøp)) { Marked.ta(sim.M, v, m); L.lager[v] = (L.lager[v] || 0) + m; }
  return { kr };
}
function plassFor(sim) { const i = sim.nrBygg++; return { x: (i % 6) * 40, y: Math.floor(i / 6) * 40 }; }
function bygg(sim, type, post = 'bygg') {
  const k = Leir.kostnad(type); if (!k) return { feil: 'ukjent bygg ' + type };
  const pris = k.pris + Object.entries(k.mat).reduce((s, [v, m]) => s + Math.max(0, m - (sim.L.lager[v] || 0)) * Marked.kjøpspris(sim.M, v, Leir.MATERIALER[v].pris, true), 0);
  if (pris > sim.kasse) return { feil: 'for lite penger' };
  const m = kjøpMat(sim, k.mat, post); if (m.feil) return m;
  const p = plassFor(sim), r = Leir.bygg(sim.L, { type, x: p.x, y: p.y, ret: 0 }, kr => sim.betal(kr, post));
  if (r.feil) return r; sim.logg(`bygger ${Leir.BYGG[type].navn.toLowerCase()} (${mill(pris)})`); return r;
}
function kjøpDiesel(sim, liter, post = 'diesel', utenTank = false) {
  const plass = utenTank ? liter : Math.max(0, Leir.kapasitet(sim.L) - sim.L.drivstoff), l = Marked.kan(sim.M, 'diesel', Math.min(liter, plass)); if (!(l > 0)) return 0;
  const kr = l * Marked.pris(sim.M, 'diesel', Leir.DRIVSTOFF.prisPerLiter); if (!sim.betal(kr, post)) return 0;
  Marked.ta(sim.M, 'diesel', l); sim.L.drivstoff += l; return l;
}
// en tropp av n personer fra folket (Tropper.opprett: den beste på vakt leder, sanitet fra fire); de går ut av leirens folk
function lagTropp(sim, n, navn) {
  const P = sim.F.personer.filter(FolkR.arbeidsfør).sort((a, b) => (b.ferd.vakt || 0) - (a.ferd.vakt || 0)).slice(0, n);
  if (P.length < Tropper.R.min) return null;
  const t = Tropper.opprett(P, navn || 'Tropp ' + (sim.tropper.length + 1)); if (t.feil) return null;
  const ider = new Set(P.map(p => p.id)); sim.F.personer = sim.F.personer.filter(p => !ider.has(p.id));
  const tr = { ...t, hjemme: true, jobb: null, hjemmeTimer: 0, betalt: true }; sim.tropper.push(tr); sim.logg(`lager ${tr.navn} (${tr.menn.length} mann)`); return tr;
}
// rekrutter én person (FolkRegler.rekrutter: seng, moral, pris) og sett vedkommende rett i troppen
function rekrutterTil(sim, tr) {
  const r = FolkR.rekrutter(sim.F, sim.L, kr => sim.betal(kr, 'rekruttering'), { årstid: sim.årstid }); if (!r || r.feil || !r.person) return false;
  sim.F.personer = sim.F.personer.filter(p => p !== r.person); tr.menn.push({ navn: r.person.navn, rolle: 'rifle', hp: 1, person: r.person }); return true;
}
const iTropper = sim => sim.tropper.reduce((a, t) => a + (t.betalt ? t.menn.filter(m => m.hp > 0).length : 0), 0);
const døgnUt = sim => FolkR.lønnPerDøgn(sim.F.personer.length + iTropper(sim), sim.M.infl) + Leir.vedlikehold(sim.L).perDøgn;
const API = { bygg, kjøpDiesel, kjøpMat, lagTropp, rekrutterTil };

// ================= DELENE =================
// DRIFT: leiren, folket, lønna, vedlikeholdet, mat og diesel
leggTilDel({ id: 'drift',
  time(sim) {
    const L = sim.L, F = sim.F, kl = (6 + sim.t / 60) % 24, sol = kl >= 6 && kl < 20 ? 1 : 0;
    Leir.steg(L, REGLER.stegMin, sol);
    const r = FolkR.steg(F, L, REGLER.stegMin, { årstid: sim.årstid }); if (r && r.døde) sim.døde += Array.isArray(r.døde) ? r.døde.length : +r.døde || 0;
    FolkR.lønnSteg(F, REGLER.stegMin, kr => sim.betal(kr, 'lønn'), { ekstra: iTropper(sim), infl: sim.M.infl });
    // vedlikeholdet trekkes hver spilltime (spill/penger-visning.js); er kassa tom, tas det som er der
    const v = Leir.vedlikehold(L).perDøgn * REGLER.stegMin / 1440; sim.betal(Math.min(v, sim.kasse), 'vedlikehold');
    if (L.drivstoff < REGLER.dieselUnder) kjøpDiesel(sim, REGLER.diesel - L.drivstoff);
    const B = FolkR.behov(F, L, { årstid: sim.årstid });
    if (F.personer.length && B.dager < REGLER.matDøgn) { const n = Marked.kan(sim.M, 'mat', Math.ceil(B.spiser * REGLER.matKjøp)); const kr = n * Marked.pris(sim.M, 'mat', FolkR.R.matPris); if (n > 0 && sim.betal(kr, 'mat')) { F.mat += n; Marked.ta(sim.M, 'mat', n); } }
    // sårede i troppene som er hjemme, blir friske
    for (const t of [sim.vakt, ...sim.tropper]) { if (!t.hjemme) { t.hjemmeTimer = 0; continue; } t.hjemmeTimer = (t.hjemmeTimer || 0) + 1; if (t.hjemmeTimer >= REGLER.leges) for (const m of t.menn) if (m.hp > 0 && m.hp < 1) m.hp = 1; }
    // de falne går ut av troppene (de får ikke lønn: FolkRegler teller bare de levende, som iTropper i folk-visning.js)
    for (const t of sim.tropper) { const n = t.menn.length; t.menn = t.menn.filter(m => m.hp > 0); sim.døde += n - t.menn.length; }
  },
  døgn(sim) { Marked.steg(sim.M, sim.rngMarked); },
});

// KONTRAKTENE (Selskap): tilbud hver morgen, troppene utfører dem
const ID = 'blå';
function steder(sim) {
  return [...sim.region.byer.map(b => ({ navn: b.navn, x: b.x, y: b.y, slag: 'tettsted', id: b.id, folk: b.folk, eier: b.eier })), ...sim.region.bruer];
}
// det leiren har til kravene i Selskap.kanTa
function har(sim, k) {
  const ledige = sim.tropper.filter(t => t.hjemme && !t.jobb && !t.garnisonI);
  return { størsteLag: Math.max(0, ...ledige.map(t => friske(t.menn))), kjøretøy: REGLER.kjøretøy - sim.tropper.filter(t => t.jobb && t.jobb.k && t.jobb.k.type === 'eskorte').length, forsvar: k && k.fare ? REGLER.fareMenn : 0 };
}
// timene en kontrakt tar fra leiren og hjem igjen (anslaget strategiene velger etter)
function kontraktTimer(k) {
  const d = Math.hypot(k.sted.x, k.sted.y);
  if (k.type === 'eskorte') return bilTimer(Math.hypot(k.fra.x, k.fra.y) + Math.hypot(k.sted.x - k.fra.x, k.sted.y - k.fra.y) + d);
  const ut = marsjTimer(d);
  if (k.type === 'hold') return 2 * ut + k.hold;
  if (k.type === 'rydd') return 2 * ut + Selskap.REGLER.marsj.kamp;
  return 2 * ut;
}
// holder fristen? (samme regel som Selskap.marsjVurdering, men med modellens marsjtid)
function rekkerFristen(k) { const d = Math.hypot(k.sted.x, k.sted.y), t = marsjTimer(d) / Selskap.REGLER.marsj.slakk; return !Selskap.marsjVurdering(k, { km: d / 1000, timer: t }).advarsel; }
// sett en tropp på en kontrakt: lista over faser (timer igjen i hver)
function startKontrakt(sim, tr, k) {
  const F = []; const d = Math.hypot(k.sted.x, k.sted.y);
  if (k.type === 'eskorte') { const fra = Math.hypot(k.fra.x, k.fra.y), strekk = Math.hypot(k.sted.x - k.fra.x, k.sted.y - k.fra.y);
    F.push({ hva: 'kjør', timer: bilTimer(fra) }, { hva: 'eskorte', timer: bilTimer(strekk), hele: bilTimer(strekk) }, { hva: 'levert' }, { hva: 'hjem', timer: bilTimer(d) }); }
  else { F.push({ hva: 'marsj', timer: marsjTimer(d) });
    if (k.fare) F.push({ hva: 'kamp', menn: REGLER.fareMenn });
    if (k.type === 'hold') F.push({ hva: 'hold', timer: k.hold });
    if (k.type === 'rydd') F.push({ hva: 'kamp', menn: REGLER.sperreMenn, sperre: true }, { hva: 'levert' });
    if (k.type === 'hent' || k.type === 'forsyning') F.push({ hva: 'hentet' });
    F.push({ hva: 'hjem', timer: marsjTimer(d) });
    if (k.type === 'hent' || k.type === 'forsyning') F.push({ hva: 'levert' }); }
  tr.jobb = { k, faser: F, i: 0, mål: {} }; tr.hjemme = false;
}
// én time for en tropp med jobb: går gjennom fasene; mål til Selskap.steg
function jobbTime(sim, tr) {
  const J = tr.jobb, m = J.mål = { andel: J.mål.andel }; let igjen = 1;
  while (igjen > 1e-9 && J.i < J.faser.length) {
    const f = J.faser[J.i];
    if (f.hva === 'kamp') {
      if (J.tapt) { J.i++; continue; }
      const fi = fiendeLag(f.menn), r = kamp(tr.menn, fi, sim.rngKamp, { stoppA: troppGirOpp, stoppB: f.sperre ? (q => Terreng.slattUt(q) || friske(q) === 0) : Trussel.brutt, fB: { målPåMarsj: false } });
      igjen -= r.runder * Terreng.KAMPRUNDE_MIN / 60; sim.logg(`${tr.navn} i kamp (${f.menn} mot ${tr.menn.length}): ${r.vinner === 'A' ? 'vant' : 'måtte trekke seg'}`);
      if (r.vinner !== 'A') { J.tapt = true; J.i = J.faser.findIndex(q => q.hva === 'hjem'); continue; } J.i++; continue; }
    if (f.hva === 'levert') { if (!J.tapt) m.i = true; J.i++; continue; }
    if (f.hva === 'hentet') { if (!J.tapt) { m.hentet = true; J.k.hentet = true; } J.i++; continue; }
    const t = Math.min(igjen, f.timer); f.timer -= t; igjen -= t;
    if (f.hva === 'hold') m.i = !J.tapt;
    if (f.hva === 'eskorte') m.andel = Math.max(0, Math.min(1, 1 - f.timer / (f.hele || 1)));
    if (f.timer <= 1e-9) J.i++;
  }
  if (J.tapt && J.k.type === 'eskorte') m.tapt = true;
  if (J.i >= J.faser.length) { tr.jobb = null; tr.hjemme = true; tr.ledigFra = sim.t + REGLER.reaksjon * 60; }
  return m;
}
leggTilDel({ id: 'kontrakter',
  start(sim) { sim.kontrakter = { levert: 0, brutt: 0, tatt: 0, tjent: 0, type: {} }; },
  time(sim) {
    const S = sim.SK, nå = sim.t, mål = {};
    for (const tr of sim.tropper) if (tr.jobb && tr.jobb.k) { const id = tr.jobb.k.id; mål[id] = jobbTime(sim, tr); }
    for (const h of Selskap.steg(S, ID, nå, REGLER.stegMin, mål)) {
      const tr = sim.tropper.find(t => t.jobb && t.jobb.k && t.jobb.k.id === h.k.id);
      if (h.type === 'levert') { let kr = h.kr; const by = h.k.sted && sim.region.byer.find(b => b.id === h.k.sted.id); if (by && by.eier === ID) kr += Math.round(h.k.betaling * Selskap.REGLER.egetSted / 1e4) * 1e4;
        kr = Math.round(kr * (sim.faktor.kontrakt || 1));
        sim.gi(kr, 'kontrakt'); sim.kontrakter.levert++; sim.kontrakter.tjent += kr;
        { const T = sim.kontrakter.type[h.k.type] || (sim.kontrakter.type[h.k.type] = { n: 0, kr: 0, timer: 0 }); T.n++; T.kr += kr; T.timer += (sim.t - h.k.godtatt) / 60; } sim.logg(`levert «${h.k.tittel}»: ${mill(kr)}`);
        if (h.rekrutt) FolkR.rekrutter(sim.F, sim.L, () => true, { årstid: sim.årstid });
        if (h.motangrep) sim.røverAngrep = true;
        if (tr && tr.jobb) tr.jobb.faser = tr.jobb.faser.filter((f, i) => i < tr.jobb.i || f.hva === 'hjem'); }
      else if (h.type === 'brutt') { const bot = Math.min(h.kr || 0, sim.kasse); sim.betal(bot, 'bøter'); sim.kontrakter.brutt++; sim.logg(`brutt «${h.k.tittel}» (${h.grunn})`); if (tr && tr.jobb) { tr.jobb.tapt = true; tr.jobb.faser = tr.jobb.faser.filter((f, i) => i < tr.jobb.i || f.hva === 'hjem'); } }
      else if (h.type === 'rivalFørst') { sim.logg(`konkurrenten kom først: «${h.k.tittel}»`); if (tr && tr.jobb) { tr.jobb.tapt = true; tr.jobb.faser = tr.jobb.faser.filter((f, i) => i < tr.jobb.i || f.hva === 'hjem'); } }
      else if (h.type === 'angrep' && tr && tr.jobb) {
        // konkurrenten angriper eskorten (spill/selskap-visning.js: et angrepslag på seks)
        const r = kamp(tr.menn, fiendeLag(REGLER.angrepMenn), sim.rngKamp, { stoppA: troppGirOpp, stoppB: q => Terreng.slattUt(q) || friske(q) === 0, fA: { målPåMarsj: true }, fB: { målPåMarsj: true, skytterPåMarsj: false } });
        if (r.vinner !== 'A') { tr.jobb.tapt = true; tr.jobb.faser = tr.jobb.faser.filter((f, i) => i < tr.jobb.i || f.hva === 'hjem'); }
        sim.logg(`eskorten angrepet: ${r.vinner === 'A' ? 'slått tilbake' : 'bilen er tapt'}`); }
    }
  },
  døgn(sim) { const S = sim.SK, nå = sim.t;
    Selskap.dagSteg(S, nå, Selskap.lagRand(sim.frø * 977 + nå));
    Selskap.lagTilbud(S, ID, nå, steder(sim), Selskap.lagRand(sim.frø * 613 + nå + 1), { infl: sim.M.infl }); },
});
// taper en kontrakt: godta den med kravene og send troppen
function taKontrakt(sim, tr, k) {
  const r = Selskap.godta(sim.SK, ID, k.id, sim.t, Selskap.lagRand(sim.frø * 389 + sim.t), har(sim, k)); if (!r.ok) return false;
  startKontrakt(sim, tr, r.k); sim.kontrakter.tatt++; sim.logg(`tar «${r.k.tittel}» (${mill(r.k.betaling)}, ca. ${Math.round(kontraktTimer(r.k))} t)`); return true;
}
// den beste kontrakten for en ledig tropp: mest betaling per time, kravene og fristen holder
function besteKontrakt(sim, tr) {
  const sd = Selskap.side(sim.SK, ID), h = { ...har(sim, null), størsteLag: friske(tr.menn) }; let best = null, bv = 0;
  if (sd.aktive.length >= Selskap.REGLER.maksAktive) return null;
  for (const k of sim.SK.tilbud) { const hk = { ...h, forsvar: k.fare ? REGLER.fareMenn : 0 }, kt = Selskap.kanTa(k, hk, sd);
    if (!kt.ok || kt.advarsel.length || !rekkerFristen(k)) continue; const v = k.betaling / Math.max(1, kontraktTimer(k)); if (v > bv) { bv = v; best = k; } }
  return best;
}

// TETTSTEDENE (Region, Garnison, Krig): skatt og varer fra stedene du holder; motstanderne prøver å ta dem
function byStatus(sim, by) { const b = sim.RG.byer[by.id]; return { loj: b.loj, skatt: b.skatt, strøm: by.strøm, rute: 'åpen', uro: b.uro, garnison: !!by.garnison, utenStrøm: Garnison.REGLER.strøm.uten, holdt: b.holdt }; }
leggTilDel({ id: 'byer',
  start(sim) { sim.pott = {}; sim.byerTatt = 0; sim.byerMistet = 0; },
  time(sim) {
    const d = REGLER.stegMin / 1440, P = sim.pott;
    for (const by of sim.region.byer) { if (by.eier !== ID) continue; const b = sim.RG.byer[by.id], st = byStatus(sim, by);
      b.loj = Region.lojSteg(b.loj, st, d); b.holdt = (+b.holdt || 0) + d;
      const o = Region.opprør(b.loj, !!by.garnison); if (o === 'tapt') { by.eier = null; b.loj = Region.REGLER.lojEtterOpprør; b.uro = false; sim.logg(`opprør i ${by.navn}`); continue; } b.uro = o === 'uro';
      const g = Region.gir(by.folk, by.type, st), f = sim.faktor.skatt || 1; for (const k of Region.VARER) if (g[k]) P[k] = (P[k] || 0) + g[k] * d * (k === 'penger' ? f : 1); }
    // det som har kommet fram, legges i leiren (som lever() i spill/region-visning.js)
    if (P.mat >= 1) { const n = Math.floor(P.mat); sim.F.mat += n; P.mat -= n; }
    for (const k of ['tre', 'betong', 'stål']) if (P[k] >= .1) { const m = Leir.leggInn(sim.L, k, Math.floor(P[k] * 10) / 10); P[k] = Math.min(30, P[k] - m); }
    if (P.diesel >= 1) { const n = Math.max(0, Math.min(Math.floor(P.diesel), Math.floor(Leir.kapasitet(sim.L) - sim.L.drivstoff))); sim.L.drivstoff += n; P.diesel = Math.min(600, P.diesel - n); }
    if (P.folk >= 1) { if (!FolkR.kanRekruttere(sim.F, sim.L, { årstid: sim.årstid })) { const r = FolkR.rekrutter(sim.F, sim.L, () => true, { årstid: sim.årstid }); if (r && !r.feil) P.folk -= 1; } P.folk = Math.min(P.folk, 2); }
    if (P.penger >= 1000) { sim.gi(P.penger, 'skatt'); P.penger = 0; }
    // troppene på vei til et tettsted
    for (const tr of sim.tropper) if (tr.jobb && tr.jobb.by) byJobbTime(sim, tr);
  },
  døgn(sim) {
    for (const by of sim.region.byer) {
      // motstanderne prøver å ta et av dine tettsteder (med garnison: kamp; uten: det er tapt)
      if (by.eier === ID && sim.rng() < REGLER.byAngrep.sjanse) {
        const g = by.garnison, ok = g && kamp(g.menn, fiendeLag(REGLER.byAngrep.menn), sim.rngKamp, { stoppA: troppGirOpp, stoppB: Trussel.brutt, fA: { målPåMarsj: true } }).vinner === 'A';
        if (!ok) { by.eier = sim.rng() < .5 ? 'rød' : 'grønn'; Region.mistet(sim.RG, by.id); sim.byerMistet++; if (g) { g.menn = g.menn.filter(m => m.hp > 0 && sim.rng() < .3); g.garnisonI = null; g.hjemme = true; by.garnison = null; } sim.logg(`mistet ${by.navn}`); }
        else sim.logg(`garnisonen i ${by.navn} slo tilbake et angrep`);
      } else if (!by.eier && sim.rng() < REGLER.rivalTar) by.eier = sim.rng() < .5 ? 'rød' : 'grønn';
    }
  },
});
// send en tropp for å ta et tettsted med makt: marsj, kamp mot bygdevernet (Krig.vernRunde), inntak (Garnison.tidMed), garnison
function sendTilBy(sim, tr, by, garnison) {
  tr.jobb = { by, fase: 'marsj', timer: marsjTimer(Math.hypot(by.x, by.y)), garnison }; tr.hjemme = false; sim.logg(`${tr.navn} (${tr.menn.length}) går mot ${by.navn} (${by.folk} innb., vern ${by.vern})`);
}
function byJobbTime(sim, tr) {
  const J = tr.jobb, by = J.by; let igjen = 1;
  while (igjen > 1e-9 && tr.jobb) {
    if (J.fase === 'marsj' || J.fase === 'hjem') { const t = Math.min(igjen, J.timer); J.timer -= t; igjen -= t; if (J.timer > 1e-9) break;
      if (J.fase === 'hjem') { tr.jobb = null; tr.hjemme = true; tr.ledigFra = sim.t + REGLER.reaksjon * 60; break; }
      J.fase = by.eier && by.eier !== ID ? 'snu' : by.vern > 0 ? 'vern' : 'inntak'; J.sek = 0; continue; }
    if (J.fase === 'snu') { J.fase = 'hjem'; J.timer = marsjTimer(Math.hypot(by.x, by.y)); continue; }
    if (J.fase === 'vern') {
      // én runde per KAMPRUNDE_MIN (som vern() i spill/krig-visning.js)
      const r = Krig.vernRunde(by.vern, friske(tr.menn), sim.rngKamp); Terreng.fordelTreff(tr.menn, r.motLaget, sim.rngKamp); by.vern -= r.motVernet; igjen -= Terreng.KAMPRUNDE_MIN / 60;
      if (by.vern <= 0) { by.vern = 0; sim.F.moral = Math.max(0, sim.F.moral - Krig.REGLER.vern.moral); J.fase = 'inntak'; J.sek = 0; sim.logg(`bygdevernet i ${by.navn} ga opp`); }
      else if (troppGirOpp(tr.menn)) { J.fase = 'hjem'; J.timer = marsjTimer(Math.hypot(by.x, by.y)); sim.logg(`${tr.navn} trekker seg fra ${by.navn}`); }
      continue; }
    if (J.fase === 'inntak') {
      const s = Garnison.tidMed(friske(tr.menn), by.folk); if (!Number.isFinite(s)) { J.fase = 'hjem'; J.timer = marsjTimer(Math.hypot(by.x, by.y)); continue; }
      const t = Math.min(igjen, (s - J.sek) / 3600); J.sek += t * 3600; igjen -= t; if (J.sek + 1e-6 < s) break;
      by.eier = ID; Region.by(sim.RG, by.id); sim.byerTatt++; sim.logg(`tok ${by.navn}`);
      // garnisonen: «garnison» mann blir igjen som et eget lag (de får lønn), resten går hjem
      if (J.garnison) { const n = Math.min(J.garnison, tr.menn.length), g = { navn: 'Garnison ' + by.navn, menn: tr.menn.splice(0, n), hjemme: false, jobb: null, betalt: true, garnisonI: by };
        by.garnison = g; sim.tropper.push(g); if (!tr.menn.length) { tr.jobb = null; sim.tropper.splice(sim.tropper.indexOf(tr), 1); break; } }
      J.fase = 'hjem'; J.timer = marsjTimer(Math.hypot(by.x, by.y)); continue; }
    break;
  }
}

// RØVERNE (Trussel): bølger mot leiren; vaktlaget og troppene hjemme forsvarer
leggTilDel({ id: 'røvere',
  start(sim) { sim.bølge = 0; sim.nesteBølge = Trussel.BALANSE.først.spill; sim.røverInn = 0; sim.røverUt = 0; },
  time(sim) {
    if (sim.faktor.ingenRøvere) return;
    if (!(sim.t >= sim.nesteBølge || sim.røverAngrep)) return; sim.røverAngrep = false;
    const nr = ++sim.bølge, forsvar = [sim.vakt, ...sim.tropper.filter(t => t.hjemme && !t.jobb)], soldater = forsvar.reduce((a, t) => a + friske(t.menn), 0);
    const n = Trussel.lagFor(nr, { soldater, dag: Math.floor(sim.t / 1440) }), mann = Math.min(Trussel.menn(nr, soldater, n), nr === 1 ? REGLER.førsteBølge : 99);
    // LEIRVAKTA (spill/forsvar-visning.js): folk på «vakt» kjemper med; de som faller, er borte, sårede får lav helse etterpå
    const vakter = sim.F.personer.filter(p => p.oppgave === 'vakt' && FolkR.arbeidsfør(p)).map(p => ({ navn: p.navn, rolle: 'rifle', hp: 1, p }));
    const røvere = fiendeLag(n * mann), egne = [...forsvar.flatMap(t => t.menn), ...vakter];
    // forsvarerne står i dekning i leiren (Terreng: «målISkog» halverer treffsjansen), røverne kommer over åpent lende
    const r = egne.length ? kamp(egne, røvere, sim.rngKamp, { stoppA: m => friske(m) === 0 || Terreng.slattUt(m) && friske(m) < 3, stoppB: Trussel.brutt, fA: { målPåMarsj: true }, fB: { målISkog: true } }) : { vinner: 'B' };
    for (const v of vakter) { if (v.hp <= 0) { sim.F.personer = sim.F.personer.filter(p => p !== v.p); sim.døde++; } else if (v.hp < 1) v.p.helse = Math.min(v.p.helse, .35); }
    if (r.vinner === 'A') { sim.gi(Trussel.belønning(nr), 'røvere'); sim.røverInn++; sim.logg(`bølge ${nr} (${n} × ${mann}) slått tilbake`); }
    else { for (let i = 0; i < n; i++) { const b = Trussel.bytte({ penger: sim.kasse, lager: sim.L.lager, diesel: sim.L.drivstoff, mat: sim.F.mat });
        sim.betal(Math.min(b.penger, sim.kasse), 'røvere tok'); for (const [k, v] of Object.entries(b.lager)) sim.L.lager[k] = Math.max(0, sim.L.lager[k] - v); sim.L.drivstoff -= b.diesel; sim.F.mat -= b.mat; }
      sim.F.moral = Math.max(0, sim.F.moral - Trussel.HERJ.moral); sim.røverUt++; sim.logg(`bølge ${nr} (${n} × ${mann}) herjet i leiren`); }
    sim.nesteBølge = sim.t + Trussel.vent(nr + 1).spill;
  },
});

// ================= STRATEGIENE =================
// Felles: hold troppen fylt opp (rekrutter når kassa tåler det), bygg en brakke til når sengene er fulle
function fyllTropp(sim, tr, mål, reserve) {
  while (friske(tr.menn) + tr.menn.filter(m => m.hp > 0 && m.hp < 1).length < mål && sim.kasse > reserve + FolkR.R.rekruttPris) {
    if (!rekrutterTil(sim, tr)) { const B = FolkR.behov(sim.F, sim.L, { årstid: sim.årstid }); if (B.senger <= B.n + B.avh && sim.kasse > reserve + 8e6 && !Leir.jobber(sim.L).some(j => j.b.type === 'brakke')) bygg(sim, 'brakke'); break; }
  }
}
// reserven: så mange døgn med lønn og vedlikehold strategien vil ha i kassa før den bruker penger på folk og bygg
const reserve = (sim, døgn) => døgnUt(sim) * døgn;
const førsteK = sim => sim.SK.tilbud.find(k => k.første);
function kontraktTime(sim, tr) {
  if (!tr || tr.jobb || !tr.hjemme || tr.garnisonI || friske(tr.menn) < 2 || sim.t < (tr.ledigFra || 0)) return;
  const k = førsteK(sim) || besteKontrakt(sim, tr); if (k) taKontrakt(sim, tr, k);
}
leggTilStrategi({ id: 'ingenting', navn: 'gjør ingenting', fornuftig: false, tekst: 'startleiren og ti personer; kjøper bare mat og diesel' });
leggTilStrategi({ id: 'kontrakter', navn: 'bare kontrakter', fornuftig: true, tekst: 'én tropp på seks tar den beste kontrakten den rekker; fylles opp med rekrutter og vokser med nivået',
  start(sim) { Selskap.førsteKontrakt(sim.SK, ID, 0, steder(sim), { x: 600, y: 700, navn: 'nødlageret' }); lagTropp(sim, 6).rolle = 'kontrakt'; },
  time(sim) { const tr = sim.tropper.find(t => t.rolle === 'kontrakt'); if (!tr) return; const nv = Selskap.nivå(Selskap.side(sim.SK, ID)); if (tr.hjemme && !tr.jobb) fyllTropp(sim, tr, Math.max(6, nv.menn + 2), reserve(sim, 3)); kontraktTime(sim, tr); } });
leggTilStrategi({ id: 'byer', navn: 'byer med makt', fornuftig: true, tekst: 'en tropp tar de nærmeste nøytrale tettstedene med makt, lar en garnison på tre stå igjen og fylles opp med rekrutter',
  start(sim) { lagTropp(sim, 7).rolle = 'by'; },
  time(sim) { byTime(sim, sim.tropper.find(t => t.rolle === 'by'), 3); } });
// én angrepstropp tar tettsteder: de med mest folk per km først; fylles opp til det krigskartet anbefaler (Strategi.anbefalt)
function byTime(sim, tr, reserveDøgn, garnison = REGLER.garnison) {
  const mål = sim.region.byer.filter(b => !b.eier && !sim.tropper.some(t => t.jobb && t.jobb.by === b)).sort((a, b) => (Math.hypot(a.x, a.y) / Math.sqrt(a.folk)) - (Math.hypot(b.x, b.y) / Math.sqrt(b.folk)))[0];
  if (!mål) return; const trengs = Math.min(Tropper.R.maks, Strategi.anbefalt(Garnison.minstFor(mål.folk), mål.vern) + 1 + garnison);
  if (!tr) {
    // ingen angrepstropp: rekrutter til leiren til det er nok folk til en ny (minst to blir igjen i leiren)
    if (sim.F.personer.length >= Math.min(trengs, 6) + 2) { const t = lagTropp(sim, Math.min(trengs, sim.F.personer.length - 2)); if (t) t.rolle = 'by'; }
    else if (sim.kasse > reserve(sim, reserveDøgn) + FolkR.R.rekruttPris) { const r = FolkR.rekrutter(sim.F, sim.L, kr => sim.betal(kr, 'rekruttering'), { årstid: sim.årstid });
      if (r && r.feil && /seng/.test(r.feil) && sim.kasse > reserve(sim, reserveDøgn) + 8e6 && !Leir.jobber(sim.L).some(j => j.b.type === 'brakke')) bygg(sim, 'brakke'); }
    return; }
  if (tr.jobb || !tr.hjemme || sim.t < (tr.ledigFra || 0)) return;
  fyllTropp(sim, tr, trengs, reserve(sim, reserveDøgn)); if (friske(tr.menn) >= trengs) sendTilBy(sim, tr, mål, garnison);
}
// Brakke 2, drivhus, solceller, verksted, sykestue, vakttårn og lagertelt – i den rekkefølgen, når kassa har råd og en reserve
const BYGGELISTE = ['drivhus', 'solcelle', 'vakttårn', 'brakke', 'lagertelt', 'sykestue', 'verksted', 'drivhus', 'solcelle', 'radiomast'];
function byggTime(sim, reserveDøgn) {
  if (Leir.jobber(sim.L).length) return; sim.byggNr = sim.byggNr || 0; const t = BYGGELISTE[sim.byggNr]; if (!t) return;
  const k = Leir.kostnad(t); if (sim.kasse < k.pris * 1.6 + reserve(sim, reserveDøgn)) return;
  if (!bygg(sim, t).feil) sim.byggNr++;
}
leggTilStrategi({ id: 'bygger', navn: 'bygger og venter', fornuftig: false, tekst: 'bygger ut leiren (drivhus, solceller, vakttårn …) og venter; ingen inntekt',
  time(sim) { byggTime(sim, 5); } });
leggTilStrategi({ id: 'forsvar', navn: 'forsvarer leiren', fornuftig: false, tekst: 'en tropp på åtte blir hjemme og slår tilbake røverne (belønningen er eneste inntekt)',
  start(sim) { lagTropp(sim, 8).rolle = 'vakt'; },
  time(sim) { const tr = sim.tropper.find(t => t.rolle === 'vakt'); if (tr) fyllTropp(sim, tr, 8, reserve(sim, 4)); } });
leggTilStrategi({ id: 'blandet', navn: 'kontrakter, bygg og byer', fornuftig: true, tekst: 'som en vanlig spiller: kontrakter med én tropp, bygger når kassa tåler det, og fra dag 5 tar en tropp nummer to tettsteder',
  start(sim) { Selskap.førsteKontrakt(sim.SK, ID, 0, steder(sim), { x: 600, y: 700, navn: 'nødlageret' }); lagTropp(sim, 6).rolle = 'kontrakt'; },
  time(sim) { const tr = sim.tropper.find(t => t.rolle === 'kontrakt');
    if (tr) { const nv = Selskap.nivå(Selskap.side(sim.SK, ID)); if (tr.hjemme && !tr.jobb) fyllTropp(sim, tr, Math.max(6, nv.menn + 2), reserve(sim, 3)); kontraktTime(sim, tr); }
    byggTime(sim, 8);
    if (sim.t >= 4 * 1440) byTime(sim, sim.tropper.find(t => t.rolle === 'by'), 6);
  } });

// ---------- selve løkka ----------
function kjør(strategiId, frø, o = {}) {
  const sim = nySim(strategiId, frø, o), st = sim.strategi, timer = (o.døgn || REGLER.døgn) * 24;
  let maks = sim.kasse, maksDag = 0;
  for (let h = 0; h < timer; h++) {
    // morgen (kl. 06): nytt døgn for markedet, kontraktene og byene
    if (h % 24 === 0) { for (const d of DELER) if (d.døgn && (h > 0 || d.id === 'kontrakter')) d.døgn(sim); if (st.døgn) st.døgn(sim); }
    for (const d of DELER) if (d.time) d.time(sim);
    if (st.time) st.time(sim);
    sim.t += REGLER.stegMin;
    if (sim.F.ubetalt > 0) { sim.blakkTimer++; if (sim.blakkDag === null) sim.blakkDag = Math.floor(sim.t / 1440) + 1; } else sim.blakkTimer = 0;
    if (sim.kasse > maks) { maks = sim.kasse; maksDag = Math.ceil(sim.t / 1440); }
    if ((h + 1) % 24 === 0) {
      const sd = Selskap.side(sim.SK, ID);
      sim.dager.push({ dag: (h + 1) / 24, kasse: sim.kasse, folk: sim.F.personer.length, soldater: iTropper(sim), moral: Math.round(sim.F.moral), byer: sim.region.byer.filter(b => b.eier === ID).length,
        nivå: Selskap.nivå(sd).nr, faste: døgnUt(sim), inn: sim.bok.inn, ut: sim.bok.ut, ubetalt: sim.F.ubetalt || 0, infl: sim.M.infl });
      for (const [k, v] of Object.entries(sim.bok.inn)) sim.sum.inn[k] = (sim.sum.inn[k] || 0) + v; for (const [k, v] of Object.entries(sim.bok.ut)) sim.sum.ut[k] = (sim.sum.ut[k] || 0) + v;
      sim.bok = { inn: {}, ut: {} };
    }
  }
  for (const [k, v] of Object.entries(sim.bok.inn)) sim.sum.inn[k] = (sim.sum.inn[k] || 0) + v; for (const [k, v] of Object.entries(sim.bok.ut)) sim.sum.ut[k] = (sim.sum.ut[k] || 0) + v;
  const slutt = sim.dager[sim.dager.length - 1];
  return { strategi: strategiId, frø, dager: sim.dager, slutt: sim.kasse, maks, maksDag, blakkDag: sim.blakkDag, sluttBlakk: (sim.F.ubetalt || 0) > 0, blakkTimer: sim.blakkTimer,
    sum: sim.sum, kontrakter: sim.kontrakter, byerTatt: sim.byerTatt, byerMistet: sim.byerMistet, byer: slutt ? slutt.byer : 0, nivå: slutt ? slutt.nivå : 1, folk: sim.F.personer.length + iTropper(sim),
    døde: sim.døde, bølger: sim.bølge, røverInn: sim.røverInn, røverUt: sim.røverUt, bygg: sim.L.bygg.length, hendelser: sim.hendelser, døgnUt: døgnUt(sim) };
}

module.exports = { REGLER, DELER, STRATEGIER, KRAV, leggTilDel, leggTilStrategi, leggTilKrav, kjør, nySim, kamp, marsjTimer, bilTimer, gåKmt, kontraktTimer, ekteStartpenger, mill, API, taKontrakt, besteKontrakt, sendTilBy, lagRegion };
