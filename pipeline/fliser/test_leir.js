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
process.exit(feil ? 1 : 0);
