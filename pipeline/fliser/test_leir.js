// Test for spill/leir.js (K2 og det forbedrede byggesystemet): node pipeline/fliser/test_leir.js
const L0 = require('../../site/dovre-fliser/spill/leir.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let penger = 300e6; const betal = p => (p <= penger ? (penger -= p, true) : false);
const L = L0.ny(), kart = { klasse: (x, y) => (x < -500 ? 3 : 2), iHus: (x, y) => x > 900 && x < 920 };
const fyll = () => { for (const k of ['tre', 'betong', 'stål']) L0.kjøpMateriale(L, k, 1000, betal); };
// materialer: uten dem kan du ikke bygge; grunnlageret tar 60 av hvert
let r = L0.bygg(L, { type: 'kontrollrom', x: 0, y: 0 }, betal, {}, kart);
ok(/Mangler materialer/.test(r.feil) && penger === 300e6, 'uten materialer: «' + r.feil + '», ingen penger trukket');
fyll(); ok(L.lager.betong === 60 && L.lager.tre === 60, 'grunnlageret: 60 av hvert (kjøpt ' + L0.kroner(300e6 - penger) + ')');
r = L0.bygg(L, { type: 'kontrollrom', x: 0, y: 0, ret: 0 }, betal, {}, kart);
ok(r.bygg && r.bygg.igjen === 360 && L.lager.betong === 20, 'kontrollrom: 6 spilltimer, 40 m³ betong trukket');
ok(/nær kontrollrom/.test(L0.bygg(L, { type: 'brakke', x: 3, y: 2, ret: .3 }, betal, {}, kart).feil), 'brakke oppå kontrollrommet avvises');
ok(/vann/.test(L0.bygg(L, { type: 'brakke', x: -800, y: 0 }, betal, {}, kart).feil) && /hus/.test(L0.bygg(L, { type: 'lagertelt', x: 910, y: 0 }, betal, {}, kart).feil), 'ikke i vann, ikke oppå et hus');
// byggelag: bare én jobb om gangen før brakka står
const brakke = L0.bygg(L, { type: 'brakke', x: 20, y: 0, ret: 1.57 }, betal, {}, kart).bygg;
let s = L0.steg(L, 60); ok(s.aktive === 1 && s.kø === 1 && brakke.igjen === brakke.totalt, 'ett byggelag: brakka venter i kø mens kontrollrommet bygges');
for (let i = 0; i < 5 * 60; i++) L0.steg(L, 1); s = L0.steg(L, 1); ok(L0.ferdig(L.bygg[0]) && !L0.ferdig(brakke), 'kontrollrommet ferdig etter 6 t, så begynner brakka');
for (let i = 0; i < 2 * 60; i++) L0.steg(L, 1); ok(L0.ferdig(brakke) && L0.byggelag(L) === 2, 'brakka ferdig: to byggelag');
// gjerde i flere ledd, lukket ring, og port i gjerdet
fyll(); const ring = [[-40, -40], [60, -40], [60, 40], [-40, 40]];
const g = L0.bygg(L, { type: 'gjerde', punkter: ring, lukket: true }, betal, { bygg: 1.2 }, kart).bygg;
ok(g && g.pris === 360 * 50000 && Math.abs(g.totalt - 360 * .02 * 60 / 1.2) < 1e-9 && g.mat.stål === 7.2, 'lukket gjerde rundt 100 × 80 m (360 m): 18 mill. kr, 7,2 t stål, raskere med ingeniør');
const fest = L0.festTilGjerde(L, 10, -36); ok(fest && Math.abs(fest.y + 40) < 1e-9 && Math.abs(fest.ret + Math.PI / 2) < 1e-9, 'porten festes på gjerdet (4 m unna) og snus langs det');
L0.bygg(L, { type: 'port', x: fest.x, y: fest.y, ret: fest.ret }, betal, {}, kart);
const ledd = L0.gjerdeLedd(L, g); ok(ledd.length === 5 && ledd.some(([a, b]) => Math.abs(b[0] - 2.9) < 1e-6), 'gjerdet får en åpning der porten står (5 ledd)');
// nivåer: aggregat 20 -> 35 kW
for (let i = 0; i < 20 * 60; i++) L0.steg(L, 1);
const agg = L0.bygg(L, { type: 'aggregat', x: 0, y: 30 }, betal, {}, kart).bygg; for (let i = 0; i < 61; i++) L0.steg(L, 1);
ok(L0.effekt(agg).kw === 20, 'aggregat nivå 1: 20 kW');
const ok2 = L0.oppgrader(L, agg.id, betal); for (let i = 0; i < 31; i++) L0.steg(L, 1);
ok(ok2.pris === 4.8e6 && agg.nivå === 2 && L0.effekt(agg).kw === 35, 'oppgradert til nivå 2 for 4,8 mill. kr: 35 kW');
ok(L0.oppgrader(L, L.bygg[0].id, betal).feil === 'Høyeste nivå.', 'kontrollrommet har bare ett nivå');
// strøm og drivstoff
L0.kjøpDrivstoff(L, 1000, betal); s = L0.steg(L, 1); ok(s.behov === 9 && s.mangler.size === 0 && L.drivstoff > 0, 'kontrollrom + brakke (9 kW) får strøm fra aggregatet');
// skade og reparasjon: under halvt helt gir halv effekt
L0.skade(L, agg.id, .6); ok(Math.abs(L0.effekt(agg).kw - 17.5) < 1e-9, 'aggregatet 40 % helt: halv effekt (17,5 kW)');
const rep = L0.reparer(L, agg.id, betal); for (let i = 0; i < 60; i++) L0.steg(L, 1); ok(agg.hp === 1 && rep.pris === Math.round(8e6 * .25 * .6), 'reparert for ' + L0.kroner(rep.pris));
// flytt: virker ikke mens det flyttes
const fl = L0.flytt(L, agg.id, { x: 80, y: 80, ret: 0 }, betal, {}, kart); s = L0.steg(L, 1);
ok(fl.pris === 2e6 && agg.x === 80 && s.mangler.size === 2, 'flyttes for 2 mill. kr: ingen strøm mens aggregatet flyttes');
for (let i = 0; i < 20; i++) L0.steg(L, 1); s = L0.steg(L, 1); ok(!agg.arbeid && s.mangler.size === 0, 'flyttet: strømmen er tilbake');
ok(/nær/.test(L0.flytt(L, agg.id, { x: 0, y: 0 }, betal, {}, kart).feil), 'kan ikke flyttes oppå kontrollrommet');
// riv: ferdig gir 30 %, uferdig 90 % og materialene tilbake
const før = penger, rv = L0.riv(L, brakke.id); ok(rv.penger === 1.2e6 && !L0.finn(L, brakke.id), 'rive en ferdig brakke: 1,2 mill. kr tilbake');
const tre0 = L.lager.tre, ny = L0.bygg(L, { type: 'brakke', x: 200, y: 200 }, betal, {}, kart).bygg, rv2 = L0.riv(L, ny.id);
ok(rv2.penger === 3.6e6 && Math.abs(L.lager.tre - tre0) < 1e-9, 'rive en brakke under bygging: 3,6 mill. kr og materialene tilbake');
ok(L0.skade(L, L.bygg[0].id, 1) === 'ødelagt' && !L.bygg.some(b => b.type === 'kontrollrom'), 'helt ødelagt bygg forsvinner');
// lagring, også fra versjon 1 (K2)
const J = L0.fraJSON(L0.tilJSON(L)); ok(J && J.bygg.length === L.bygg.length && J.versjon === 2, 'lagret og lest inn igjen');
const v1 = L0.fraJSON(JSON.stringify({ versjon: 1, bygg: [{ id: 1, type: 'brakke', x: 0, y: 0, ret: 0, igjen: 0, totalt: 120, pris: 4e6 }], neste: 2, drivstoff: 10 }));
ok(v1 && v1.bygg[0].nivå === 1 && v1.bygg[0].hp === 1 && v1.lager.tre === 0 && v1.nesteJobb >= 2, 'gammel lagring (K2) gjøres om');
ok(L0.fraJSON('tull') === null, 'ødelagt lagring gir null');
// plassering og planlegging (12. nov): snapping, bratt grunn, planen, maler
{
  const P = L0.ny(); let kr = 500e6; const bet = x => (x <= kr ? (kr -= x, true) : false);
  for (const k of ['tre', 'betong', 'stål']) L0.kjøpMateriale(P, k, 60, bet);
  const a = L0.bygg(P, { type: 'brakke', x: 0, y: 0, ret: 0 }, bet).bygg;   // fot x -3,4..4,2, y -6,4..6,4
  // en brakke satt 1 m for nær på høyre side: legges 2 m fra kanten (x 4,2 + 2 + 3,4 = 9,6), og y-ene på linje
  const s1 = L0.snapp(P, { type: 'brakke', x: 8.6, y: .7, ret: 0 });
  ok(Math.abs(s1.x - 9.6) < 1e-6 && Math.abs(s1.y) < 1e-6 && s1.linjer.length === 2 && s1.nabo === a, `snapp: 2 m fra naboen og på linje (x ${s1.x.toFixed(2)}, y ${s1.y.toFixed(2)}, ${s1.linjer.length} hjelpelinjer)`);
  ok(Math.abs(s1.avstand - 2) < 1e-6, 'snapp: avstanden til naboen etter snapping (2 m)');
  const s2 = L0.snapp(P, { type: 'brakke', x: 30, y: 0, ret: 0 }); ok(Math.abs(s2.x - 30) < 1e-9 && Math.abs(s2.avstand - 22.4) < 1e-6 && s2.linjer.length === 1, 'snapp: langt unna på x – bare linja for y (på linje med naboen)');
  const s3 = L0.snapp(P, { type: 'brakke', x: 9, y: 0, ret: .4 }); ok(s3.x === 9 && !s3.linjer.length, 'snapp: skrå i forhold til naboen – ingen endring');
  const s4 = L0.snapp(P, { type: 'brakke', x: 10, y: 1, ret: Math.PI / 2 }); ok(s4.linjer.length > 0, 'snapp: 90° på tvers virker også');
  // dreid nabo: snappingen skjer i naboens retning
  const Q = L0.ny(); Q.bygg.push({ id: 1, type: 'brakke', x: 100, y: 100, ret: .5, igjen: 0, hp: 1 });
  const s5 = L0.snapp(Q, { type: 'brakke', x: 100 + 9 * Math.cos(.5), y: 100 + 9 * Math.sin(.5), ret: .5 });
  ok(Math.abs(Math.hypot(s5.x - 100, s5.y - 100) - 9.6) < 1e-6, 'snapp: dreid nabo gir 9,6 m mellom midtpunktene');
  // bratt grunn
  const h = { høyde: (x, y) => x * .5 }; ok(/bratt/.test(L0.kanBygge(P, { type: 'kontrollrom', x: 50, y: 0, ret: 0 }, h)), 'for bratt: 5,5 m høydeforskjell avvises');
  ok(L0.kanBygge(P, { type: 'kameramast', x: 50, y: 0, ret: 0 }, h) === null, 'liten mast i samme skråning er ok (0,5 m)');
  // planen: gratis, holder plassen, flyttes, fjernes, bygges
  const k0 = kr, p1 = L0.planLegg(P, { type: 'lagertelt', x: 40, y: 0, ret: 0 }).plan, p2 = L0.planLegg(P, { type: 'container', x: 60, y: 0, ret: 0 }).plan;
  ok(p1 && p2 && kr === k0 && P.plan.length === 2, 'planen: to skisser, ingen penger trukket');
  ok(/planlagt lagertelt/.test(L0.kanBygge(P, { type: 'container', x: 40, y: 0, ret: 0 })), 'planen holder plassen: et bygg oppå skissen avvises');
  ok(/planlagt/.test(L0.planLegg(P, { type: 'brakke', x: 41, y: 1, ret: 0 }).feil || ''), 'to skisser kan ikke ligge oppå hverandre');
  ok(!L0.planFlytt(P, p1.pid, { x: 42, y: 0, ret: 0 }).feil && p1.x === 42, 'en skisse kan flyttes litt (oppå sin egen gamle plass)');
  const pk = L0.planKostnad(P); ok(pk.antall === 2 && pk.pris === 2.5e6 && pk.mat.stål === 3, `planKostnad: ${pk.antall} bygg, ${L0.kroner(pk.pris)}, stål ${pk.mat.stål} t`);
  const n0 = P.bygg.length, bp = L0.byggPlan(P, bet); ok(bp.bygget.length === 2 && !bp.feil.length && !P.plan.length && P.bygg.length === n0 + 2 && kr === k0 - 2.5e6, 'byggPlan: begge bygget, planen tom, 2,5 mill. trukket');
  L0.planLegg(P, { type: 'helikopterplass', x: 200, y: 0, ret: 0 }); let lite = 1e6; const bp2 = L0.byggPlan(P, x => (x <= lite ? (lite -= x, true) : false));
  ok(!bp2.bygget.length && bp2.feil.length === 1 && P.plan.length === 1, 'byggPlan uten nok penger: blir liggende i planen med feilen');
  ok(L0.planFjern(P, P.plan[0].pid) && !P.plan.length, 'planFjern');
  // maler: lagre rundt et midtpunkt, sette inn et annet sted dreid 90°
  L0.planLegg(P, { type: 'gjerde', punkter: [[-20, -20], [20, -20], [20, 20]], lukket: false });
  const mal = L0.tilMal(P, 0, 0, 'Test'), ut = L0.fraMal(mal, 1000, 0, Math.PI / 2);
  const br = ut.find(b => b.type === 'brakke'), gj = ut.find(b => b.type === 'gjerde');
  ok(mal.bygg.length === P.bygg.length + 1 && Math.abs(br.x - 1000) < 1e-6 && Math.abs(br.ret - Math.PI / 2) < 1e-6 && Math.abs(gj.punkter[0][0] - 1020) < 1e-6 && Math.abs(gj.punkter[0][1] + 20) < 1e-6,
    'mal: bygg og plan med, flyttet og dreid 90°');
  const pm = L0.planMal(P, mal, 1000, 0, Math.PI / 2); ok(pm.lagt.length === mal.bygg.length && !pm.feil.length, `planMal: ${pm.lagt.length} skisser lagt inn`);
  const pm2 = L0.planMal(P, mal, 1000, 0, 0); ok(pm2.feil.length > 0, 'samme mal oppå seg selv: det som ikke får plass hoppes over');
  const J2 = L0.fraJSON(L0.tilJSON(P)); ok(J2.plan.length === P.plan.length && J2.nestePlan === P.nestePlan, 'planen lagres og leses inn igjen');
}
process.exit(feil ? 1 : 0);
