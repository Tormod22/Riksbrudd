// Test for spill/jobber.js (jobbtavla og døgnplanen, fase F0): node pipeline/fliser/test_jobber.js
// Skriver også tallene for byggetiden før og etter døgnplanen (står i docs/natt/ut1-jobber.md). TALL=1 skriver flere.
const LB = require('../../site/dovre-fliser/spill/leir.js');
const FR = require('../../site/dovre-fliser/spill/folk.js');
const J0 = require('../../site/dovre-fliser/spill/jobber.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let penger = 1e10; const betal = p => (p <= penger ? (penger -= p, true) : false);
const fyll = L => { for (const k of ['tre', 'betong', 'stål']) LB.kjøpMateriale(L, k, 2000, betal); };
const bestill = (L, type, x, y = 0) => { fyll(L); const r = LB.bygg(L, { type, x, y }, betal); if (!r.bygg) throw new Error(type + ': ' + r.feil); return r.bygg; };
const ferdig = (L, type, x, y = 0) => { const b = bestill(L, type, x, y); b.igjen = 0; return b; };
const kopi = o => JSON.parse(JSON.stringify(o));
const telle = F => { const t = {}; for (const p of F.personer) t[p.oppgave] = (t[p.oppgave] || 0) + 1; return t; };

// ---------- tilstanden ----------
const J = J0.ny();
ok(J.auto === false && J.døgn === true && !Object.keys(J.prio).length, 'ny tavle: spilleren fordeler selv, døgnplanen på, standardprioriteter');
const Jj = J0.fraJSON({ auto: 1, døgn: false, prio: { bygg: 9, vakt: 2, tull: 1 }, skift: { bygg: 'døgn', vakt: 'to', hogst: 'x' }, lås: { 3: 'bygg', 4: 'tull' }, ute: { 5: ['frakt', 'frakt', 'x'] } });
ok(Jj.auto && !Jj.døgn && Jj.prio.vakt === 2 && !Jj.prio.bygg && !Jj.prio.tull && Jj.skift.bygg === 'døgn' && !Jj.skift.vakt && !Jj.skift.hogst, 'fraJSON: ugyldige prioriteter og skift blir standard (vakt har turnus)');
ok(Jj.lås[3] === 'bygg' && !Jj.lås[4] && Jj.ute[5].join() === 'frakt', 'fraJSON: lås og utelukking renses');
ok(JSON.stringify(J0.fraJSON(null)) === JSON.stringify(J0.ny()) && JSON.stringify(J0.fraJSON(JSON.parse(JSON.stringify(Jj)))) === JSON.stringify(Jj), 'fraJSON tåler null og gir det samme tilbake');

// ---------- jobbene leiren lager ----------
const F = FR.ny(), L = LB.ny(); L.folk = F;
let jobber = J0.lag(F, L, {});
const jb = t => jobber.find(j => j.type === t);
ok(jobber.length === J0.TYPER.length && jb('bygg').plasser === 0 && jb('bygg').ingen === 'ingenting å bygge', 'uten bestillinger: ingenting å bygge');
ok(jb('vakt').plasser === 1 && jb('kjøkken').plasser === 1 && jb('stell').plasser === 0 && jb('hogst').plasser === 0 && /hogstfelt/.test(jb('hogst').ingen), 'vakt 1, kjøkken 1 (ti personer), ingen syke, ingen hogstfelt');
ok(jb('verksted').ingen === 'trenger et verksted' && jb('overvåking').ingen === 'trenger et kontrollrom', 'verksted og overvåking trenger bygg');
bestill(L, 'brakke', 0); bestill(L, 'vakttårn', 40);
const R = { jobber: [{ type: 'hogst', r: 35, gjort: 1, arbeid: 10, avst: 400, frakt: 'fots', haug: { tre: 2 } }] };
jobber = J0.lag(F, L, { R });
ok(jb('bygg').plasser === 4 && jb('bygg').hva.join() === 'Bygg brakke,Bygg vakttårn', 'to bestillinger: fire plasser på bygg (to byggelag)');
ok(jb('hogst').plasser === 3 && /Hogstfelt 35 m \(10 %\)/.test(jb('hogst').hva[0]) && jb('frakt').plasser === 2, 'hogstfelt: tre plasser; haug 400 m unna: to bærere');
const vk = ferdig(L, 'verksted', 80); jobber = J0.lag(F, L, { R, mangler: new Set([vk.id]) });
ok(jb('verksted').plasser === 2 && jb('verksted').blokk === 'uten strøm', 'verksted uten strøm: står fast med grunnen «uten strøm»');

// ---------- fordelingen ----------
const Fs = kopi(F); const før = telle(Fs);
jobber = J0.lag(Fs, L, { R, mangler: new Set([vk.id]) });
let f = J0.fordel(Fs, J0.ny(), jobber);
J0.bruk(Fs, f); const etter = telle(Fs);
ok(etter.vakt === 1 && etter.kjøkken === 1 && etter.bygg === 4 && etter.hogst === 1 && etter.frakt === 1 && etter.fri === 2,
  `standardprioriteter gir samme fordeling som startgjengen (4 bygg, 1 kjøkken, 1 vakt, 1 hogst, 1 frakt, 2 fri): ${JSON.stringify(etter)}`);
ok(JSON.stringify(Object.entries(før).sort()) === JSON.stringify(Object.entries(etter).sort()), 'startgjengen beholder antallet per oppgave');
ok(Fs.personer.find(p => p.oppgave === 'kjøkken').yrke === 'kokk' && Fs.personer.find(p => p.oppgave === 'vakt').yrke === 'tidligere soldat', 'kokken på kjøkkenet, soldaten på vakt');
ok(f.fast.some(q => q.type === 'hogst' && q.grunn === 'ingen ledige') && f.fast.some(q => q.type === 'verksted' && q.grunn === 'uten strøm'), 'hogst mangler folk: «ingen ledige»; verkstedet: «uten strøm»');
// stabil: en ny runde endrer ingenting
ok(J0.bruk(Fs, J0.fordel(Fs, J0.ny(), jobber)).length === 0, 'ny fordeling med det samme: ingen bytter jobb');
// prioritet: hogst først tar folk fra bygg
const J2 = J0.ny(); J2.prio.hogst = 1; J0.bruk(Fs, J0.fordel(Fs, J2, jobber));
ok(telle(Fs).hogst === 3 && telle(Fs).bygg === 3 && telle(Fs).fri === 2 && !telle(Fs).frakt, `hogst prioritet 1: tre på hogst, bygg får det som er igjen, to har hvile: ${JSON.stringify(telle(Fs))}`);
// lås og utelukking
const kokk = Fs.personer.find(p => p.yrke === 'kokk'), soldat = Fs.personer.find(p => p.yrke === 'tidligere soldat');
const J3 = J0.ny(); J3.lås[kokk.id] = 'bygg'; J3.ute[soldat.id] = ['vakt'];
J0.bruk(Fs, J0.fordel(Fs, J3, jobber));
ok(kokk.oppgave === 'bygg' && soldat.oppgave !== 'vakt' && telle(Fs).kjøkken === 1 && telle(Fs).vakt === 1, 'låst kokk står på bygg, utelukket soldat tar ikke vakt – andre tar dem');
// ingen med ferdighet / alle utelukket
const J4 = J0.ny(); for (const p of Fs.personer) J4.ute[p.id] = ['kjøkken'];
const f4 = J0.fordel(Fs, J4, jobber);
ok(f4.fast.some(q => q.type === 'kjøkken' && q.grunn === 'alle er utelukket') && ![...f4.til.values()].includes('kjøkken'), 'alle utelukket fra kjøkken: kjøkkenet står fast med grunn');
const Fl = kopi(Fs); for (const p of Fl.personer) p.ferd.vakt = .5;
ok(J0.fordel(Fl, J0.ny(), jobber).fast.some(q => q.type === 'vakt' && q.grunn === 'ingen med ferdighet'), 'ingen kan vakt (ferdighet 0,5): «ingen med ferdighet»');
// syke og de i opplæring beholder oppgaven
const Fsy = kopi(Fs); Fsy.personer[0].helse = .2; Fsy.personer[0].oppgave = 'riving'; Fsy.personer[1].trener = true; Fsy.personer[1].oppgave = 'stell';
const fsy = J0.fordel(Fsy, J0.ny(), J0.lag(Fsy, L, { R }));
ok(fsy.til.get(Fsy.personer[0].id) === 'riving' && fsy.til.get(Fsy.personer[1].id) === 'stell', 'syke og de i opplæring flyttes ikke');
ok(J0.lag(Fsy, L, { R }).find(j => j.type === 'stell').plasser === 1, 'en syk: én plass på stell');
// manuelt (uten tavla): hvilke jobber står fast
const Fm = kopi(F); for (const p of Fm.personer) if (p.oppgave === 'kjøkken') p.oppgave = 'fri';
ok(J0.fastManuelt(Fm, J0.lag(Fm, L, { R })).some(q => q.type === 'kjøkken' && q.grunn === 'ingen satt på jobben'), 'uten tavla: kjøkkenet uten folk står fast («ingen satt på jobben»)');
// mange folk: fordelingen tåler 200 personer og er rask
const Fstor = FR.ny(7); const r = FR.rng(3); while (Fstor.personer.length < 200) FR.nyPerson(Fstor, r);
const t0 = Date.now(); const fst = J0.fordel(Fstor, J0.ny(), J0.lag(Fstor, L, { R })); const ms = Date.now() - t0;
ok(fst.til.size === 200 && ms < 200, `200 personer fordeles på ${ms} ms`);

// ---------- døgnplanen ----------
const kl = (h, m = 0) => (h - 6) * 60 + m + (h < 6 ? 1440 : 0);
ok(J0.klokke(0) === 6 && J0.klokke(kl(23, 30)) === 23.5, 'klokka: spillet starter 06:00');
for (const [n, pl] of Object.entries(J0.PLANER)) {
  let dekket = 0; for (let m = 0; m < 1440; m += 5) { const h = m / 60; if (pl.filter(q => (q[0] <= q[1] ? h >= q[0] && h < q[1] : h >= q[0] || h < q[1])).length === 1) dekket++; }
  ok(dekket === 288 && J0.timer(pl, 'søvn') >= 8, `plan ${n}: hele døgnet dekket én gang, ${J0.timer(pl)} t arbeid, ${J0.timer(pl, 'søvn')} t søvn`);
}
ok(J0.timer(J0.PLANER.dag) === 9 && J0.PLANER.dag.some(q => q[0] === 17 && q[2] === 'mat') && J0.PLANER.dag.some(q => q[0] === 22 && q[1] === 6 && q[2] === 'søvn'), 'dagplanen: arbeid 07–11 og 12–17, middag 17, søvn 22–06');
const Fd = kopi(F), Jd = J0.ny(); Jd.skift.bygg = 'dag';
const bygger = Fd.personer.find(p => p.oppgave === 'bygg'), fri = Fd.personer.find(p => p.oppgave === 'fri'), vakt = Fd.personer.find(p => p.oppgave === 'vakt');
ok(J0.nå(Jd, Fd, bygger, kl(9)).tekst === 'arbeider – bygg' && J0.nå(Jd, Fd, bygger, kl(17, 30)).tekst === 'spiser middag' && J0.nå(Jd, Fd, bygger, kl(2)).tekst === 'sover' && J0.nå(Jd, Fd, bygger, kl(20)).tekst === 'fri', 'byggeren: arbeider 09, spiser middag 17:30, fri 20, sover 02');
ok(J0.nå(Jd, Fd, fri, kl(9)).hva === 'fri' && J0.nå(Jd, Fd, vakt, kl(9)).hva === 'arbeid' && J0.nå(Jd, Fd, vakt, kl(3)).hva === 'arbeid', 'den som har fri, har fri på dagen; én vakt: døgnvakt');
ok(J0.faktor(Jd, Fd, 'bygg', kl(2)) === 0 && Math.abs(J0.faktor(Jd, Fd, 'bygg', kl(9)) - 24 / 9) < 1e-9 && J0.faktor(Jd, Fd, 'vakt', kl(2)) === 1 && J0.faktor(Jd, Fd, 'kjøkken', kl(2)) === 1, 'dagskift: tempo 0 om natta, 24/9 om dagen; vakt og kjøkken regnes som før');
for (const s of ['dag', 'to', 'døgn']) { const Js = J0.ny(); Js.skift.bygg = s; const snitt = J0.døgnSnitt(Js, Fd, 'bygg', 1);
  ok(Math.abs(snitt - J0.REGLER.dagsverk[s]) < .02, `skift «${J0.SKIFTNAVN[s]}»: et helt døgn gir ${snitt.toFixed(3)} × arbeidet før (mål ${J0.REGLER.dagsverk[s]})`); }
// vaktturnus: aldri uten vakt, uansett hvor mange
for (const n of [1, 2, 3, 4, 5]) { const Fv = kopi(F); Fv.personer.forEach((p, i) => { p.oppgave = i < n ? 'vakt' : 'fri'; });
  let tom = 0; for (let m = 0; m < 1440; m += 10) if (!Fv.personer.some(p => J0.nå(J0.ny(), Fv, p, m).hva === 'arbeid' && p.oppgave === 'vakt')) tom++;
  ok(!tom, `${n} på vakt: alltid noen på post (turnus ${J0.planFor(J0.ny(), Fv, Fv.personer[0]).navn})`); }
// nattskift senker moralen litt
const Jn = J0.ny(); Jn.skift.bygg = 'døgn'; const mt = J0.moralTillegg(Jn, Fd);
ok(mt < 0 && mt > -5 && J0.moralTillegg(J0.ny(), Fd) === 0, `døgnet rundt på bygg: moral ${mt.toFixed(1)} (nattskift); standard: 0`);
const Jav = J0.ny(); Jav.døgn = false;
ok(J0.faktor(Jav, Fd, 'bygg', kl(2)) === 1 && J0.nå(Jav, Fd, bygger, kl(2)).hva === 'arbeid' && J0.moralTillegg(Jn, Fd) !== 0 && J0.moralTillegg(Jav, Fd) === 0, 'døgnplanen av: alt som før');

// ---------- folk.js og leir.js med døgnplanen ----------
// FolkRegler.døgnF: tempoet i folk.js ganges med faktoren (byggTempo og leir.js følger med)
const Fx = kopi(F), tØ = FR.tempo(Fx, 'bygg'), btØ = FR.byggTempo(Fx), kjØ = FR.tempo(Fx, 'kjøkken');
FR.døgnF = (F2, o) => J0.faktor(Jd, F2, o, kl(2)); const tN = FR.tempo(Fx, 'bygg'), btN = FR.byggTempo(Fx), kjN = FR.tempo(Fx, 'kjøkken'), arbN = FR.arbeidere(Fx, 'bygg');
FR.døgnF = (F2, o) => J0.faktor(Jd, F2, o, kl(9)); const tD = FR.tempo(Fx, 'bygg');
FR.døgnF = null;
ok(tN === 0 && btN === 0 && kjN === kjØ && arbN === 4 && Math.abs(tD - tØ * 24 / 9) < 1e-9 && FR.tempo(Fx, 'bygg') === tØ, 'folk.js: bygg står om natta (arbeiderne teller fortsatt), 24/9 om dagen, kjøkkenet som før, uten krok som før');
ok(btØ > 0, 'byggetempo uten døgnplan > 0');

// Byggetiden før og etter (et vanlig døgn): (1) mye i kø – hvor mye blir bygget på et døgn, (2) én brakke bestilt hver hele time
function simKø(Jx) {
  const Lq = LB.ny(), Fq = FR.ny(); Lq.folk = Fq; const B = []; for (let i = 0; i < 40; i++) B.push(bestill(Lq, 'kontrollrom', (i % 8) * 40, 200 + Math.floor(i / 8) * 40));
  const sum0 = B.reduce((s, b) => s + b.igjen, 0); FR.døgnF = Jx ? (F2, o) => J0.faktor(Jx, F2, o, tidQ) : null; let tidQ = 0;
  for (; tidQ < 1440; tidQ++) LB.steg(Lq, 1); FR.døgnF = null; return (sum0 - B.reduce((s, b) => s + b.igjen, 0)) / 60;
}
function simÉn(Jx, start, type = 'brakke') {
  const Lq = LB.ny(), Fq = FR.ny(); Lq.folk = Fq; const b = bestill(Lq, type, 0, 0); let t = start;
  FR.døgnF = Jx ? (F2, o) => J0.faktor(Jx, F2, o, t) : null;
  while (b.igjen > 0 && t - start < 3000) { LB.steg(Lq, 1); t++; } FR.døgnF = null; return (t - start) / 60;
}
const Jdag = J0.ny(); Jdag.skift.bygg = 'dag'; const Jto = J0.ny(), Jdøgn = J0.ny(); Jdøgn.skift.bygg = 'døgn';
const kø = { før: simKø(null), dag: simKø(Jdag), to: simKø(Jto), døgn: simKø(Jdøgn) };
ok(Math.abs(kø.dag / kø.før - 1) < .03 && Math.abs(kø.to / kø.før - 1.05) < .03 && Math.abs(kø.døgn / kø.før - 1.1) < .03,
  `et døgn med mye i kø: ${kø.før.toFixed(1)} arbeidstimer før, dagskift ${kø.dag.toFixed(1)}, to skift ${kø.to.toFixed(1)}, døgnet rundt ${kø.døgn.toFixed(1)}`);
const snitt = (Jx, type) => { let s = 0, mx = 0; for (let h = 0; h < 24; h++) { const v = simÉn(Jx, h * 60, type); s += v; mx = Math.max(mx, v); } return [s / 24, mx]; };
for (const type of ['brakke', 'kontrollrom', 'container']) {
  const [fs, fm] = snitt(null, type), [ds, dm] = snitt(Jdag, type), [ts, tm] = snitt(Jto, type), [øs, øm] = snitt(Jdøgn, type);
  console.log(`     ${type} (${LB.BYGG[type].tid} t): snitt/lengst før ${fs.toFixed(2)}/${fm.toFixed(2)} t · dag ${ds.toFixed(2)}/${dm.toFixed(2)} · to skift (standard) ${ts.toFixed(2)}/${tm.toFixed(2)} · døgnet rundt ${øs.toFixed(2)}/${øm.toFixed(2)}`);
  if (type === 'brakke') ok(ts < fs * 2.2 && ds > ts, `brakke bestilt en tilfeldig time: to skift (standard) ${ts.toFixed(1)} t i snitt mot ${fs.toFixed(1)} t før – dagskift alene ville gitt ${ds.toFixed(1)} t`);
}

// ---------- kommandoene ----------
const K = require('../../site/dovre-fliser/spill/kommando.js'); K._tøm();
const Jk = J0.ny(), Fk = kopi(F); let endret = 0;
J0.registrerKommandoer(K, { jobber: () => Jk, folk: () => Fk, endret: () => endret++ });
const kj = k => K.utfør(k, { lag: [], kjøretøy: [], side: 'blå', spiller: null, erVert: true });
ok(!kj({ type: 'jobbPrio', jobb: 'bygg', prio: 7 }).ok && !kj({ type: 'jobbPrio', jobb: 'tull', prio: 2 }).ok, 'jobbPrio avviser prioritet 7 og ukjent jobb');
const rp = kj({ type: 'jobbPrio', jobb: 'bygg', prio: 1 });
ok(rp.ok && rp.svar.slåttPå && Jk.auto && Jk.prio.bygg === 1 && endret === 1, 'jobbPrio setter prioriteten og slår på tavla');
ok(kj({ type: 'jobbAuto', på: false }).ok && !Jk.auto, 'jobbAuto slår av');
ok(!kj({ type: 'jobbSkift', jobb: 'vakt', skift: 'to' }).ok && kj({ type: 'jobbSkift', jobb: 'bygg', skift: 'døgn' }).ok && Jk.skift.bygg === 'døgn', 'jobbSkift: vakt går i turnus, bygg kan gå døgnet rundt');
const p0 = Fk.personer[0].id;
ok(kj({ type: 'jobbLås', person: p0, jobb: 'hogst' }).ok && Jk.lås[p0] === 'hogst' && kj({ type: 'jobbUte', person: p0, jobb: 'hogst', ute: true }).ok && !Jk.lås[p0] && Jk.ute[p0][0] === 'hogst', 'jobbLås og jobbUte (utelukking tar bort låsen)');
ok(!kj({ type: 'jobbLås', person: p0, jobb: 'hogst' }).ok && !kj({ type: 'jobbLås', person: 9999, jobb: 'bygg' }).ok, 'kan ikke låses til en jobb personen er utelukket fra, eller en som ikke finnes');
ok(kj({ type: 'jobbUte', person: p0, jobb: 'hogst', ute: false }).ok && !Jk.ute[p0] && kj({ type: 'jobbLås', person: p0, jobb: null }).ok, 'utelukkingen kan tas bort, låsen løses');
ok(kj({ type: 'jobbDøgn', på: false }).ok && Jk.døgn === false && K.kanSendes({ type: 'jobbPrio', jobb: 'bygg', prio: 2 }), 'jobbDøgn, og kommandoene kan sendes som JSON');

console.log(feil ? `${feil} FEIL` : 'Alle testene for jobber.js er ok');
process.exit(feil ? 1 : 0);
