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
// FEILJAKT 12. nov: gjerdet sjekkes langs hele linja, og drivstoffet forsvinner ikke når en tank rives
{ const G = L0.ny(), full = () => { for (const k of ['tre', 'betong', 'stål']) G.lager[k] = 60; };
  const land = { klasse: () => 2 }, sjø = { klasse: (x, y) => (x > 10 && x < 190 ? 3 : 2) }, hus = { klasse: () => 2, iHus: (x, y) => x > 50 && x < 60 };
  ok(L0.gjerdePunkter([[0, 0], [20, 0]], false).length === 4 && L0.gjerdePunkter([[0, 0], [20, 0], [20, 20]], true).length === 11, 'gjerdePunkter: et punkt hver 8. m, også i det siste leddet i en ring');
  ok(/vann/.test(L0.kanBygge(G, { type: 'gjerde', punkter: [[0, 0], [200, 0]] }, sjø) || ''), 'gjerde fra land til land tvers over et vann avvises');
  ok(/hus/.test(L0.kanBygge(G, { type: 'gjerde', punkter: [[0, 0], [200, 0]] }, hus) || ''), 'gjerde gjennom et hus i kartet avvises');
  full(); const br = L0.bygg(G, { type: 'brakke', x: 100, y: 0 }, betal, {}, land).bygg; br.igjen = 0;
  ok(/gjennom brakke/.test(L0.kanBygge(G, { type: 'gjerde', punkter: [[0, 0], [200, 0]] }, land) || ''), 'gjerde tvers gjennom en brakke avvises');
  ok(L0.kanBygge(G, { type: 'gjerde', punkter: [[0, 20], [200, 20]] }, land) === null && L0.kanBygge(G, { type: 'gjerde', punkter: [[0, -30], [200, -30], [200, 30], [0, 30]], lukket: true }, land) === null, 'gjerde forbi og i ring rundt brakka er lov');
  full(); const gj = L0.bygg(G, { type: 'gjerde', punkter: [[0, 20], [200, 20]] }, betal, {}, land).bygg, f = L0.festTilGjerde(G, 50, 21); full(); const port = L0.bygg(G, { type: 'port', x: f.x, y: f.y, ret: f.ret }, betal, {}, land);
  ok(port.bygg && L0.kanBygge(G, { type: 'gjerde', punkter: [[0, 20], [200, 20]] }, land) === null, 'porten står i gjerdet: den stopper ikke et gjerde');
  // riving av tank med drivstoff
  const T = L0.ny(); for (const k of ['tre', 'betong', 'stål']) T.lager[k] = 60;
  const t1 = L0.bygg(T, { type: 'drivstofftank', x: 0, y: 0 }, betal).bygg, t2 = L0.bygg(T, { type: 'drivstofftank', x: 30, y: 0 }, betal).bygg; t1.igjen = t2.igjen = 0;
  L0.kjøpDrivstoff(T, 8000, betal); const r1 = L0.riv(T, t1.id);
  ok(T.drivstoff === 5000 && r1.drivstoff === 3000 && r1.drivstoffPenger === 3000 * L0.DRIVSTOFF.prisPerLiter && r1.penger === r1.bygg + r1.drivstoffPenger && r1.bygg === Math.round(3e6 * L0.REGLER.rivFerdig),
    'riv en av to tanker: 5000 l blir i den andre, 3000 l selges tilbake til innkjøpspris');
  const r2 = L0.riv(T, t2.id); L0.steg(T, 1); ok(T.drivstoff === 0 && r2.drivstoff === 5000 && r2.drivstoffPenger === 40e6, 'riv den siste tanken: alt drivstoffet selges tilbake (ikke borte uten varsel)');
  full(); const br2 = L0.bygg(G, { type: 'container', x: 100, y: 100 }, betal, {}, land).bygg; br2.igjen = 0; const r3 = L0.riv(G, br2.id); ok(r3.drivstoff === 0 && r3.penger === r3.bygg, 'riv et annet bygg: ingen drivstoffpenger'); }
// BRUKERENS VALG 12. nov (etter feiljakten): utposter med reisetid, byggeplasser kan skades, radiomastens nivåer, diesel
{ const full = U => { for (const k of ['tre', 'betong', 'stål']) U.lager[k] = 60; }, nær = (a, b) => Math.abs(a - b) < 1e-9;
  // ---- utposter: du kan bygge hvor som helst, men byggelaget må reise dit (300 m fritt, så 10 km/t fra leirens midte)
  const U = L0.ny(); full(U);
  ok(L0.reise(U, 17600, 0).min === 0 && !L0.bygg(U, { type: 'sandsekkvoll', x: 9000, y: 0 }, betal).bygg.reise, 'uten leirens midte (gamle regler, testene): ingen reisetid');
  U.bygg = []; U.midt = { x: 0, y: 0 };
  ok(L0.REGLER.reise.fri === 300 && L0.REGLER.reise.kmt === 10, 'regelen: 300 m uten reisetid, så 10 km/t');
  ok(L0.reise(U, 250, 0).min === 0 && L0.reise(U, 0, -300).min === 0 && L0.reise(U, 250, 0).full === 0, 'innen 300 m fra leirens midte: ingen reisetid');
  ok(nær(L0.reise(U, 1300, 0).min, 6) && nær(L0.reise(U, 0, 5300).min, 30) && nær(L0.reise(U, 17600, 0).min, 103.8), 'reisetid: 1,3 km = 6 min, 5,3 km = 30 min, 17,6 km = 1 t 44 min');
  ok(L0.reise(U, 3000, 4000).meter === 5000 && L0.reise(U, 20000, 0).min > L0.reise(U, 10000, 0).min, 'luftlinje fra leiren, og lengre tid jo lenger unna');
  ok(L0.kanBygge(U, { type: 'brakke', x: 17600, y: 0 }, { klasse: () => 2 }) === null, 'utposter er lov: en brakke 17,6 km fra leiren godtas');
  const u1 = L0.bygg(U, { type: 'brakke', x: 5300, y: 0 }, betal);
  ok(u1.bygg && nær(u1.bygg.reise, 30) && nær(u1.reise.min, 30) && u1.bygg.igjen === 120, 'brakke 5,3 km unna: 30 min reise legges foran 2 t bygging');
  ok(/Utpost 5,3 km fra leiren: byggelaget reiser 30 min/.test(L0.reiseTekst(u1.reise)) && L0.reiseTekst(L0.reise(U, 100, 0)) === '', 'teksten til banneret: «' + L0.reiseTekst(u1.reise) + '»');
  let st = L0.steg(U, 20); ok(nær(u1.bygg.reise, 10) && u1.bygg.igjen === 120 && !st.framme.length && L0.jobber(U)[0].reise === 10, 'etter 20 min: byggelaget er på vei (10 min igjen), ingenting bygget');
  // et bygg til i samme utpost, bestilt mens laget er på vei: får reisetid nå, men den faller bort når laget kommer fram
  const u2 = L0.bygg(U, { type: 'container', x: 5330, y: 40 }, betal);
  ok(nær(u2.bygg.reise, L0.reise(U, 5330, 40).full) && !u2.reise.påStedet, 'nabobygg i utposten mens laget er på vei: egen reisetid inntil videre');
  st = L0.steg(U, 10); ok(st.framme.length === 1 && st.framme[0] === u1.bygg && u1.bygg.reise === undefined && u2.bygg.reise === undefined && u1.bygg.igjen === 120,
    'framme etter 30 min: meldt én gang, og nabojobben i utposten trenger ingen ny reise');
  st = L0.steg(U, 60); ok(u1.bygg.igjen === 60 && u2.bygg.igjen === 30 && st.kø === 1, 'så bygges det (ett lag: containeren venter i kø)');
  const u3 = L0.reise(U, 5250, -60); ok(u3.min === 0 && u3.påStedet && u3.full > 0 && /arbeider alt her/.test(L0.reiseTekst(u3)), 'nytt bygg der et byggelag alt arbeider (innen 300 m): ingen ny reise');
  ok(nær(L0.reise(U, 5300, 2000).min, L0.reise(U, 5300, 2000).full) && !L0.reise(U, 5300, 2000).påStedet, 'en annen utpost 2 km derfra: full reise fra leiren');
  for (let i = 0; i < 100; i++) L0.steg(U, 1);
  ok(L0.ferdig(u1.bygg) && L0.ferdig(u2.bygg) && nær(L0.reise(U, 5250, -60).min, L0.reise(U, 5250, -60).full), 'utposten ferdig: laget er hjemme igjen, neste bygg der ute krever ny reise');
  // oppgradering, reparasjon og flytting i en utpost krever også reise; reisen går like fort uansett hvor flinke byggerne er
  full(U); const op = L0.oppgrader(U, u1.bygg.id, betal);
  ok(nær(op.reise.min, 30) && nær(u1.bygg.arbeid.reise, 30) && op.til === 2, 'oppgradering i utposten: 30 min reise først');
  L0.folkTempo = () => 2; L0.steg(U, 10); ok(nær(u1.bygg.arbeid.reise, 20) && u1.bygg.arbeid.igjen === u1.bygg.arbeid.totalt, 'dobbelt så flinke byggere reiser ikke fortere');
  L0.steg(U, 20); L0.steg(U, 10); ok(u1.bygg.arbeid && nær(u1.bygg.arbeid.igjen, u1.bygg.arbeid.totalt - 20), '… men de bygger dobbelt så fort når de er framme'); delete L0.folkTempo;
  for (let i = 0; i < 100; i++) L0.steg(U, 1); ok(u1.bygg.nivå === 2 && !u1.bygg.arbeid, 'oppgraderingen ble ferdig');
  u2.bygg.hp = .5; const rp = L0.reparer(U, u2.bygg.id, betal); ok(nær(u2.bygg.arbeid.reise, rp.reise.min) && rp.reise.min > 29, 'reparasjon i utposten: reise først');
  for (let i = 0; i < 100; i++) L0.steg(U, 1);
  const fl2 = L0.flytt(U, u2.bygg.id, { x: 100, y: 100, ret: 0 }, betal); ok(fl2.reise.min === 0 && !u2.bygg.arbeid.reise, 'flytting hjem til leiren: ingen reise');
  for (let i = 0; i < 100; i++) L0.steg(U, 1);
  const fl3 = L0.flytt(U, u2.bygg.id, { x: 0, y: 12300, ret: 0 }, betal); ok(nær(fl3.reise.min, 72) && nær(u2.bygg.arbeid.reise, 72), 'flytting til en utpost 12,3 km unna: 72 min reise');
  // køen: en jobb som venter, reiser ikke
  full(U); const u4 = L0.bygg(U, { type: 'sandsekkvoll', x: -9300, y: 0 }, betal).bygg, u5 = L0.bygg(U, { type: 'sandsekkvoll', x: 0, y: -7300 }, betal).bygg; st = L0.steg(U, 30);
  ok(L0.byggelag(U) === 2 && st.kø === 1 && nær(u2.bygg.arbeid.reise, 42) && nær(u4.reise, 24) && nær(u5.reise, 42), 'to byggelag (brakka i utposten): to lag reiser samtidig, den tredje jobben venter i kø og reiser ikke ennå');
  // lagring: reisen og leirens midte følger med; gamle lagrede leirer uten midte lastes som før
  const J3 = L0.fraJSON(L0.tilJSON(U)), j4 = J3.bygg.find(b => b.id === u4.id);
  ok(J3.midt.x === 0 && nær(j4.reise, 24) && nær(L0.jobber(J3).find(j => j.b.id === u2.bygg.id).reise, 42), 'reisen og leirens midte lagres og leses inn igjen');
  const gammel = L0.fraJSON(JSON.stringify({ versjon: 2, bygg: [{ id: 1, type: 'brakke', x: 9000, y: 0, ret: 0, igjen: 60, totalt: 120, pris: 4e6, nivå: 1, hp: 1, nr: 1, arbeid: null, mat: { tre: 25, betong: 5 } }], neste: 2, nesteJobb: 2, drivstoff: 0, lager: { tre: 1, betong: 1, stål: 1 } }));
  L0.steg(gammel, 30); ok(gammel && gammel.bygg[0].igjen === 30 && L0.reise(gammel, 9000, 0).min === 0, 'gammel lagret leir (uten midte og reise): bygges videre som før');
  ok(require('../../site/dovre-fliser/spill/ressurser.js').REGLER.maksAvstand === 3000, 'hogst og riving har fortsatt grensen på 3 km');

  // ---- byggeplasser kan skades; en ødelagt byggeplass gir de ubrukte materialene tilbake
  const S = L0.ny(); full(S);
  const k1 = L0.bygg(S, { type: 'kontrollrom', x: 0, y: 0 }, betal).bygg, k2 = L0.bygg(S, { type: 'brakke', x: 40, y: 0 }, betal).bygg;
  ok(S.lager.betong === 15 && S.lager.tre === 25 && S.lager.stål === 52, 'kontrollrom og brakke bestilt: materialene er tatt fra lageret');
  let sk = L0.skad(S, k2.id, .3); ok(!sk.ødelagt && sk.byggeplass && nær(sk.hp, .7) && nær(k2.hp, .7) && L0.finn(S, k2.id), 'en byggeplass i kø tar skade (70 % hel)');
  sk = L0.skad(S, k2.id, .8); ok(sk.ødelagt && sk.byggeplass && sk.mat.tre === 25 && sk.mat.betong === 5 && S.lager.tre === 50 && S.lager.betong === 20 && !L0.finn(S, k2.id),
    'byggeplass i kø ødelagt: alle materialene (25 m³ tre, 5 m³ betong) er tilbake på lageret');
  for (let i = 0; i < 180; i++) L0.steg(S, 1); ok(nær(k1.igjen, 180), 'kontrollrommet er halvferdig');
  S.lager.betong = 60; sk = L0.skad(S, k1.id, 1);
  ok(sk.ødelagt && sk.byggeplass && sk.mat.betong === 20 && sk.mat.tre === 5 && sk.mat.stål === 4 && S.lager.betong === 80 && S.lager.tre === 55,
    'halvferdig byggeplass ødelagt: halvparten av materialene tilbake (20 m³ betong, 5 m³ tre, 4 t stål) – også når lageret er fullt');
  full(S); const k3 = L0.bygg(S, { type: 'lagertelt', x: 0, y: 0 }, betal).bygg; k3.igjen = 0;
  sk = L0.skad(S, k3.id, 1); ok(sk.ødelagt && !sk.byggeplass && !Object.keys(sk.mat).length, 'ferdig bygg ødelagt: ingen materialer tilbake');
  full(S); const k4 = L0.bygg(S, { type: 'aggregat', x: 0, y: 0 }, betal).bygg; k4.igjen = 0; const stål0 = S.lager.stål; L0.oppgrader(S, k4.id, betal);
  ok(nær(stål0 - S.lager.stål, 2.4) && k4.arbeid.mat.stål === 2.4, 'oppgraderingen husker materialene sine (2,4 t stål)');
  sk = L0.skad(S, k4.id, 1); ok(sk.ødelagt && !sk.byggeplass && sk.mat.stål === 2.4 && nær(S.lager.stål, stål0), 'bygg ødelagt mens det oppgraderes: de ubrukte materialene til oppgraderingen tilbake');
  full(S); const k5 = L0.bygg(S, { type: 'container', x: 0, y: 0 }, betal).bygg;
  ok(L0.skade(S, k5.id, .25) === .75 && L0.skade(S, k5.id, 1) === 'ødelagt' && L0.skade(S, 999, 1) === null && L0.skad(S, 999, 1) === null, 'skade() svarer som før (tall, «ødelagt», null)');
  // riving av et uferdig bygg kutter ikke et overfullt lager (før: Math.min(lagerplass, …))
  full(S); const k6 = L0.bygg(S, { type: 'container', x: 0, y: 0 }, betal).bygg; S.lager.stål = 156; S.lager.tre = 156; L0.riv(S, k6.id);
  ok(S.lager.stål === 156 && S.lager.tre === 156, 'riving av uferdig bygg: et overfullt lager blir ikke kuttet ned');

  // ---- radiomasten: nivå 1, 2 og 3 gir 15, 25 og 40 km (reglene for kontakten: test_kontrollrom.js)
  const M = L0.ny(); full(M); const mast = L0.bygg(M, { type: 'radiomast', x: 0, y: 0 }, betal).bygg;
  ok(L0.mastRekkevidde(M) === 0, 'radiomast under bygging: gir ingenting');
  mast.igjen = 0; ok(L0.BYGG.radiomast.nivå.rekkevidde.join() === '15000,25000,40000' && L0.mastRekkevidde(M) === 15000, 'radiomast nivå 1: 15 km');
  mast.nivå = 2; ok(L0.effekt(mast).rekkevidde === 25000, 'radiomast nivå 2: 25 km'); mast.nivå = 3; ok(L0.effekt(mast).rekkevidde === 40000 && L0.maksNivå('radiomast') === 3, 'radiomast nivå 3: 40 km');
  mast.hp = .4; ok(L0.effekt(mast).rekkevidde === 20000, 'hardt skadet mast: halv rekkevidde');
  // ---- diesel: tekstene i leiren sier «diesel» (kjøretøyene bruker olje fra basen)
  ok(L0.BYGG.drivstofftank.navn === 'Dieseltank' && /diesel/.test(L0.BYGG.drivstofftank.tekst) && /kjøretøy/.test(L0.BYGG.drivstofftank.tekst) && /diesel/.test(L0.BYGG.aggregat.tekst),
    'dieseltanken og aggregatet sier «diesel», og at den ikke er til kjøretøyene'); }
process.exit(feil ? 1 : 0);
