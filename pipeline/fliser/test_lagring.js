// Test for spill/lagring.js (klokka, været, egne lag og kjøretøy lagres og leses inn igjen): node pipeline/fliser/test_lagring.js
'use strict';
const LG = require('../../site/dovre-fliser/spill/lagring.js'), K = require('../../site/dovre-fliser/spill/kjoretoy.js'), V = require('../../site/dovre-fliser/spill/vaer.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const nyttLag = (navn, x, y, speider) => ({ navn, x, y, side: 'blå', speider, leder: 0, sti: null, steg: null, seg: 0, prog: 0, timerIgjen: 0, retning: 0,
  menn: ['lagfører', 'rifle', 'rifle', 'sanitet'].map((rolle, i) => ({ navn: 'Mann ' + i, rolle, hp: 1, loy: .8 })), sikt: null, siktSkitten: false });
const leir = { x: 196400, y: 6898900 };

// et spill som har gått en stund: laget har marsjert og tatt tap, kolonnen har kjørt, det er vinter og snøvær
const lag = [nyttLag('1. lag', 100, 200), nyttLag('Speiderlag', 300, 400, true), nyttLag('1. nye lag', 500, 600)];
lag[0].x = 1234.56; lag[0].y = 987.6; lag[0].menn[1].hp = .4; lag[0].menn[2].hp = 0; lag[0].leder = 3; lag[0].ammo = .35; lag[0].sti = [[0, 0], [9, 9]]; lag[0].radio = 'felt'; lag[2].ingeniør = true; lag[2].nedgravd = true;
const kj = [K.ny({ navn: '1. lastebilkolonne', type: 'lastebil', antall: 4, x: 10, y: 20 }), K.ny({ navn: 'Lastebil 1', type: 'lastebil', antall: 1, x: 30, y: 40, retning: -1.2 })];
kj[0].x = 5000; kj[0].y = 6000; kj[0].antall = 3; kj[0].drivstoff = .42; kj[0].forsyning = 7.5; kj[0].sti = { noe: 1 }; kj[0].oppdrag = { type: 'forsyning' };
const vær = V.ny('vinter'); V.låsVær(vær, 'snø');
const tekst = JSON.stringify(LG.pakk({ tid: 4321.5, vær, lag, kjøretøy: kj, leir }));
ok(tekst.length < 4000 && !/"sti"|"oppdrag"|"sikt"/.test(tekst), `lagringen er liten (${tekst.length} tegn) og har ikke med ruter, oppdrag eller sikt`);

// en ny side: lagene og kjøretøyene står på startplassene, de som ble bygget senere finnes ikke
const d = LG.fraJSON(tekst, leir);
ok(d && d.tid === 4321.5 && d.vær.årstid === 'vinter' && d.vær.låst === 'snø' && d.lag.length === 3 && d.kjøretøy.length === 2, 'klokka, årstida, været, lagene og kjøretøyene leses inn');
const nyeLag = [nyttLag('1. lag', 100, 200), nyttLag('Speiderlag', 300, 400, true)], laget = [];
const n = LG.settTilbake(d.lag, nyeLag, LG.brukLag, q => { const s = nyttLag(q.navn, q.x, q.y, q.speider); if (q.ingeniør) s.ingeniør = true; nyeLag.push(s); laget.push(s.navn); return s; });
const a = nyeLag[0];
ok(n === 3 && a.x === 1234.6 && a.y === 987.6 && a.menn[1].hp === .4 && a.menn[2].hp === 0 && a.leder === 3 && a.ammo === .35 && a.radio === 'felt', '1. lag står der det sto, med de samme sårede og falne, lagfører, ammunisjon og radio');
ok(a.sti === null && a.siktSkitten === true, 'laget står stille (ordren lagres ikke), og sikten regnes på nytt');
ok(laget.join() === '1. nye lag' && nyeLag[2].ingeniør && nyeLag[2].nedgravd && nyeLag[2].x === 500, 'et lag bygget etter spillstart lages på nytt (ingeniørlag, nedgravd)');
const nyeKj = [K.ny({ navn: '1. lastebilkolonne', type: 'lastebil', antall: 4, x: 10, y: 20 })];
LG.settTilbake(d.kjøretøy, nyeKj, LG.brukKj, q => { const k = K.ny({ navn: q.navn, type: q.type, antall: q.antall, x: q.x, y: q.y, retning: q.retning }); nyeKj.push(k); return k; });
ok(nyeKj[0].x === 5000 && nyeKj[0].antall === 3 && nyeKj[0].drivstoff === .42 && nyeKj[0].forsyning === 7.5 && nyeKj[0].sti === null && !nyeKj[0].oppdrag, 'kolonnen står der den sto: 3 biler, drivstoff og last, uten rute og oppdrag');
ok(nyeKj.length === 2 && nyeKj[1].navn === 'Lastebil 1' && nyeKj[1].retning === -1.2, 'en lastebil bygget etter spillstart lages på nytt');

// to like navn (basen teller fra 1 igjen etter omlasting) brukes én gang hver
{ const L2 = [nyttLag('1. nye lag', 0, 0)], D2 = [{ navn: '1. nye lag', x: 1, y: 1 }, { navn: '1. nye lag', x: 2, y: 2 }];
  LG.settTilbake(D2, L2, LG.brukLag, q => { const s = nyttLag(q.navn, q.x, q.y); L2.push(s); return s; }); ok(L2.length === 2 && L2[0].x === 1 && L2[1].x === 2, 'to lag med samme navn: ett sted hver'); }
// det som ikke skal leses: en annen leir (nytt spill), ukjent versjon, ødelagt tekst og ødelagte linjer
// tettsteder, infrastruktur og olje (16. nov)
{ const T = new Map([[101, { eier: 'blå', inntar: null }], [102, { eier: null, inntar: { side: 'rød', tid: 3 } }], ['x7', { eier: 'rød' }]]), IN = new Map([['bru:55', { tilstand: 'sprengt' }], ['tunnel:9', { tilstand: 'reparasjon' }], ['kraft:3', { tilstand: 'hel' }]]);
  const t2 = JSON.stringify(LG.pakk({ tid: 1, lag: [], kjøretøy: [], leir, tettsteder: T, infra: IN, olje: 1234.56 })), d2 = LG.fraJSON(t2, leir);
  ok(JSON.stringify(d2.tettsteder) === '[[101,"blå"],["x7","rød"]]', 'tettstedene med eier lagres (ikke de som bare er under inntak): ' + JSON.stringify(d2.tettsteder));
  ok(d2.infra.join() === 'bru:55,tunnel:9' && d2.olje === 1234.6, 'sprengt og påbegynt reparert infrastruktur lagres som nøkler, oljen som tonn');
  const gammel = LG.fraJSON(tekst, leir); ok(gammel.tettsteder.length === 0 && gammel.infra.length === 0 && gammel.olje === null, 'en eldre lagring uten disse feltene leses som før');
  ok(LG.fraJSON(JSON.stringify({ versjon: 1, leir, tid: 1, tettsteder: [[1], 'x', [2, 5], [3, 'blå']], infra: [5, 'bru', 'bru:1'], olje: -4 }), leir).tettsteder.length === 1, 'ødelagte felt siles bort'); }
ok(LG.fraJSON(tekst, { x: 1, y: 2 }) === null, 'lagring for en annen leir (et annet spill) brukes ikke');
ok(LG.fraJSON('{"versjon":99}', leir) === null && LG.fraJSON('ødelagt', leir) === null && LG.fraJSON(null, leir) === null, 'ukjent versjon og ødelagt tekst gir null');
{ const d3 = LG.fraJSON(JSON.stringify({ versjon: 1, leir: { x: 196400, y: 6898900 }, tid: -5, lag: [{ navn: 'x' }, null, { navn: 'ok', x: 1, y: 2, menn: [{ navn: 'A', hp: 7 }] }], kjøretøy: 'tull' }), leir);
  const s = LG.brukLag(nyttLag('ok', 0, 0), d3.lag[0]); ok(d3.tid === 0 && d3.lag.length === 1 && d3.kjøretøy.length === 0 && s.menn.length === 1 && s.menn[0].hp === 1 && s.leder === 0, 'ødelagte linjer hoppes over, og tallene holdes innenfor (hp 0–1, tid ≥ 0)'); }

// (kritikerløkka r2) NaN lagres aldri: siste gyldige plass, ellers kjøretøyets; en eldre lagring med null settes ved leiren
{ const s = nyttLag('Speidertropp 1', NaN, NaN); s.sistGyldig = [190300, 6898000]; const k = { navn: 'Speiderbil 1', type: 'speiderbil', antall: 1, x: NaN, y: NaN, retning: 0 };
  const d = LG.pakkLag(s), dk = LG.pakkKj(k); ok(d.x === 190300 && d.y === 6898000 && dk.x === null && !JSON.stringify(d).includes('NaN'), 'laget lagres på siste gyldige plass, ikke NaN');
  const s2 = nyttLag('B', NaN, NaN); s2.ombord = { x: 5, y: 6 }; ok(LG.pakkLag(s2).x === 5, 'uten sistGyldig: kjøretøyets plass');
  const d4 = LG.fraJSON(JSON.stringify({ versjon: 1, leir: { x: 196400, y: 6898900 }, tid: 1, lag: [{ navn: 'Speidertropp 1', x: null, y: null, menn: [{ navn: 'Åse', hp: 1 }] }], kjøretøy: [{ navn: 'Speiderbil 1', type: 'speiderbil', antall: 1, x: null, y: null }] }), leir);
  ok(d4.lag.length === 1 && Math.hypot(d4.lag[0].x - 196400, d4.lag[0].y - 6898900) < 30 && d4.kjøretøy.length === 1 && Number.isFinite(d4.kjøretøy[0].x), 'en lagring med null (NaN) leses med plass ved leiren, ikke slettet'); }

// ---------- lagringsplasser og filer (runde 7) ----------
{ const P = LG.Plass, k1 = JSON.stringify({ versjon: 1, ferdig: true, leir, penger: 12345678, karakter: { navn: 'Kari' }, fraksjon: { navn: 'Hær <b>' } });
  const nøkler = { 'riksbrudd-k1': k1, 'riksbrudd-k2': '{"bygg":[1,2]}', 'riksbrudd-verden': tekst, 'riksbrudd-filter': 'vhs', 'riksbrudd-maler': '[1]', 'riksbrudd-plass-1': '{}' };
  const pl = P.pakk(nøkler, { side: 'dovre', nå: Date.UTC(2026, 10, 20, 1, 4) });
  ok(Object.keys(pl.nøkler).join() === 'riksbrudd-k1,riksbrudd-k2,riksbrudd-verden', 'plassen tar med spillnøklene – ikke innstillinger, maler eller andre plasser');
  ok(pl.info.fraksjon === 'Hær b' && pl.info.karakter === 'Kari' && pl.info.penger === 12345678 && pl.info.leir.x === 196400, 'info: fraksjon (renset), karakter, kassa og leir');
  // tid 4321,5 spillminutter: 6 + 72,0 t = dag 4 kl. 06:01
  ok(pl.info.dag === 4 && pl.info.klokke === '06:01' && pl.navn === 'Hær b, dag 4', 'dag og klokke som klokka i spillet, navn foreslås');
  ok(P.pakk(nøkler, { navn: '  Før slaget\n ' }).navn === 'Før slaget', 'eget navn renses');
  const fil = P.tilFil(pl), les = P.les(fil, 'dovre');
  ok(les.d && JSON.stringify(les.d.nøkler) === JSON.stringify(pl.nøkler) && les.d.navn === pl.navn && les.d.laget === pl.laget, 'fila leses tilbake likt');
  ok(/^riksbrudd-haer-b-dag-4-2026-11-20\.json$/.test(P.filnavn(pl)), 'filnavnet: ' + P.filnavn(pl));
  ok(P.les(fil, 'norge').feil && P.les(fil, 'norge').side === 'dovre', 'en fil fra Dovre-siden lastes ikke på /norge (sier hvor den hører til)');
  ok(P.les('tull', 'dovre').feil && P.les('{"spill":"Annet"}', 'dovre').feil && P.les(JSON.stringify({ ...pl, versjon: 9 }), 'dovre').feil, 'ødelagt fil, feil spill og ukjent utgave avvises');
  ok(P.les(JSON.stringify({ ...pl, nøkler: { ...pl.nøkler, 'riksbrudd-filter': 'vhs' } }), 'dovre').feil, 'en fil med innstillinger eller fremmede nøkler avvises');
  ok(P.les(JSON.stringify({ ...pl, nøkler: { 'riksbrudd-k2': '{}' } }), 'dovre').feil, 'en fil uten ferdig leir avvises');
  ok(P.les('x'.repeat(P.REGLER.maksTegn + 1), 'dovre').feil, 'for stor fil avvises');
  const plan = P.byttPlan({ 'riksbrudd-k1': 'a', 'riksbrudd-lut': '{}', 'riksbrudd-k2': 'b' }, pl);
  ok(plan.fjern.join() === 'riksbrudd-lut' && plan.sett.length === 3, 'bytte: det plassen ikke har, tas bort; resten settes');
}
// RUNDE 13: en ordre der ruta fortsatt planlegges (ordreMål), lagres som mål og leses inn igjen
{ const s = nyttLag('Vaktlaget', 100, 200); s.ordreMål = [1500, 2500]; const d = LG.pakkLag(s); ok(d.mål && d.mål[0] === 1500 && d.mål[1] === 2500, 'ordre under planlegging lagres (mål)');
  const t = nyttLag('Vaktlaget', 0, 0); LG.brukLag(t, JSON.parse(JSON.stringify(d))); ok(t.målLagret && t.målLagret[0] === 1500 && t.x === 100, 'og leses inn som målLagret (laget går videre)');
  s.sti = [[100, 200], [900, 900]]; ok(LG.pakkLag(s).mål[0] === 900, 'en ferdig rute går foran ordreMål'); }
// R16-E (22. nov): kjøreordre, køen på basen, minefelt og droner – pakk -> JSON -> les gir det samme, gamle lagringer virker
{ const leir = { x: 5, y: 6 };
  const kj = { navn: 'Kolonne 1', type: 'lastebil', antall: 3, x: 10, y: 20, retning: 1, drivstoff: .5, sti: { P: [10, 20, 400, 500, 812.34, 901.26], V: [1, 1] } };
  const kjOpp = { navn: 'Kolonne 2', type: 'lastebil', antall: 1, x: 0, y: 0, retning: 0, sti: { P: [0, 0, 9, 9] }, oppdrag: { type: 'olje' } };
  const base = { navn: 'Basen', x: 0, y: 0, beholdning: 3, bygget: 2, kø: [{ type: 'lag', igjen: 1200.5, total: 3600 }, { type: 'stridsvogn', igjen: 7200, total: 7200 }] };
  const tom = { navn: 'Tom base', kø: [], bygget: 0 };
  const mine = { navn: 'Minefelt 1', x: 300.04, y: 400, side: 'blå', ladninger: 4 }, bruktMine = { navn: 'Minefelt 2', x: 1, y: 1, side: 'blå', ladninger: 0 };
  const drone = { navn: 'Drone 1', x: 50, y: 60, mål: [900, 1000], igjen: 1500, retning: .5, fase: 'flyr' }, tomDrone = { navn: 'Drone 2', x: 0, y: 0, mål: [0, 0], igjen: 0, fase: 'tom' };
  const d = LG.fraJSON(JSON.stringify(LG.pakk({ tid: 5, leir, kjøretøy: [kj, kjOpp], baser: [base, tom], minefelt: [mine, bruktMine], droner: [drone, tomDrone] })), leir);
  ok(d && d.kjøretøy[0].mål && d.kjøretøy[0].mål[0] === 812.3 && d.kjøretøy[0].mål[1] === 901.3, 'kjøreordren lagres som målet (siste punkt på ruta)');
  ok(d && !d.kjøretøy[1].mål, 'en kolonne med oppdrag lagrer ikke kjøreordren (oppdraget styrer den)');
  const k2 = { navn: 'Kolonne 1', type: 'lastebil', antall: 1, x: 0, y: 0 }; LG.brukKj(k2, d.kjøretøy[0]);
  ok(k2.målLagret && k2.målLagret[0] === 812.3 && k2.sti === null && k2.x === 10, 'kjøreordren leses inn som målLagret (kolonnen planlegger på nytt)');
  ok(d.baser.length === 1 && d.baser[0].navn === 'Basen' && d.baser[0].kø.length === 2 && d.baser[0].kø[0].igjen === 1200.5 && d.baser[0].kø[1].type === 'stridsvogn' && d.baser[0].bygget === 2, 'køen på basen lagres (bare baser med noe i køen)');
  const b2 = { navn: 'Basen', kø: [], bygget: 0 }; ok(LG.brukBaser([b2], d.baser) === 1 && b2.kø.length === 2 && b2.kø[0].total === 3600 && b2.bygget === 2, 'køen legges tilbake på basen med samme navn');
  ok(d.minefelt.length === 1 && JSON.stringify(d.minefelt[0]) === JSON.stringify({ navn: 'Minefelt 1', x: 300, y: 400, side: 'blå', ladninger: 4 }), 'minefeltet lagres (brukte felt tas ikke med)');
  ok(d.droner.length === 1 && d.droner[0].navn === 'Drone 1' && d.droner[0].mål[0] === 900 && d.droner[0].igjen === 1500 && d.droner[0].fase === 'flyr', 'dronen lagres (tomme droner tas ikke med)');
  const gammel = LG.pakk({ tid: 5, leir, kjøretøy: [kj] }); delete gammel.baser; delete gammel.minefelt; delete gammel.droner; delete gammel.kjøretøy[0].mål;
  const g = LG.fraJSON(JSON.stringify(gammel), leir);
  ok(g && g.baser.length === 0 && g.minefelt.length === 0 && g.droner.length === 0 && !g.kjøretøy[0].mål, 'gammel lagring uten feltene virker (tomme lister)');
  const k3 = { navn: 'Kolonne 1', type: 'lastebil', antall: 1, x: 0, y: 0, målLagret: [1, 1] }; LG.brukKj(k3, g.kjøretøy[0]); ok(!k3.målLagret, 'og kolonnen står da stille som før');
  const rar = LG.fraJSON(JSON.stringify({ ...LG.pakk({ tid: 1, leir }), minefelt: [{ navn: 'x', x: 'a' }, null, 7], droner: 'tull', baser: [{ navn: 'B', kø: [{ type: '<script>', igjen: 5 }] }] }), leir);
  ok(rar && rar.minefelt.length === 0 && rar.droner.length === 0 && rar.baser[0].kø.length === 0, 'ødelagte felt i lagringen hoppes over'); }
console.log(feil ? `${feil} FEIL` : 'Alle testene for lagring.js er ok'); process.exit(feil ? 1 : 0);
