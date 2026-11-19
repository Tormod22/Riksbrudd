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
console.log(feil ? `${feil} FEIL` : 'Alle testene for lagring.js er ok'); process.exit(feil ? 1 : 0);
