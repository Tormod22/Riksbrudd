// Test for G0 i spill/lagringsside.js (nettleserens database, versjon og omgjøringer, LagringStor): node pipeline/fliser/test_lagring_stor.js
// Reglene uten DOM. Selve databasen (IndexedDB) prøves i nettleseren av vakta pipeline/fliser/vakter/ut2-lagring.js.
'use strict';
const LS = require('../../site/dovre-fliser/spill/lagringsside.js');
const LG = require('../../site/dovre-fliser/spill/lagring.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// versjonsmerket
ok(LS.VERSJON >= 1 && LS.VERSJON_NØKKEL === 'riksbrudd-versjon', 'versjonen og nøkkelen');
ok(LS.versjonAv(null) === 0 && LS.versjonAv('ødelagt') === 0 && LS.versjonAv('{"v":-1}') === 0 && LS.versjonAv(LS.versjonTekst(3)) === 3, 'merket leses (0 uten merke eller ødelagt)');
ok(LS.erSpill(LS.VERSJON_NØKKEL, LS.versjonTekst(1)), 'merket følger med i lagringsplassene og fila (er en spillnøkkel)');

// hvilke nøkler som bor i databasen
ok(LS.iDatabase('riksbrudd-plass-1') && LS.iDatabase('riksbrudd-plass-auto@norge') && LS.iDatabase('riksbrudd-stor-hus') && LS.iDatabase('riksbrudd-stor-folk@rogaland'), 'lagringsplassene og de store dataene ligger i databasen');
ok(!LS.iDatabase('riksbrudd-k1') && !LS.iDatabase('riksbrudd-verden@norge') && !LS.iDatabase('riksbrudd-plasser') && !LS.iDatabase('annet-plass-1'), 'de vanlige nøklene ligger i localStorage som før');
ok(!LS.erSpill('riksbrudd-ovl', '{"a":1}') && LS.erSpill('riksbrudd-stor-hus', LS.pakkStor({ a: 1 }, { x: 1, y: 2 })), 'merket for flyttede nøkler er internt, de store dataene er en del av spillet');
ok(LS.kanFlyttes('riksbrudd-verden') && LS.kanFlyttes('riksbrudd-k2@norge') && !LS.kanFlyttes('riksbrudd-ovl') && !LS.kanFlyttes('riksbrudd-sider') && !LS.kanFlyttes('annet'), 'hva som kan flyttes til databasen når localStorage er full');

// LagringStor: navn, per leir og felles
ok(LS.storNavn('hus') === 'riksbrudd-stor-hus' && LS.storNavn('riksbrudd-hus') === 'riksbrudd-stor-hus' && LS.storNavn('riksbrudd-stor-hus') === 'riksbrudd-stor-hus', 'navnet blir riksbrudd-stor-…');
const leir = { x: 196400.4, y: 6898900.6 }, annen = { x: 15607, y: 6622779 };
const t = LS.pakkStor({ hus: [1, 2, 3] }, leir);
ok(JSON.parse(t).leir === '196400,6898901', 'leiren lagres som «x,y» (avrundet, som de andre modulene)');
ok(JSON.stringify(LS.lesStor(t, leir)) === '{"hus":[1,2,3]}', 'les gir verdien for samme leir');
ok(LS.lesStor(t, annen) === undefined && LS.lesStor(t, null) === undefined && LS.lesStor(t, {}) === undefined, 'en annen leir (eller ingen) får ingenting');
const f = LS.pakkStor([7], null);
ok(JSON.stringify(LS.lesStor(f, null)) === '[7]' && LS.lesStor(f, leir) === undefined, 'felles verdier (leir null) leses bare som felles');
ok(LS.lesStor('ikke json', leir) === undefined && LS.lesStor('{"leir":"1,2"}', { x: 1, y: 2 }) === undefined && LS.lesStor(LS.pakkStor(0, leir), leir) === 0, 'ødelagt eller uten verdi gir ingenting; 0 er en verdi');

// størrelse og to kopier
ok(LS.størrelse({ ab: 'cde' }) === 5 && LS.størrelse({}) === 0, 'plassen regnes i tegn (nøkkel og verdi), som grensen for localStorage');
ok(LS.kb(0) === '0 kB' && LS.kb(100) === '1 kB' && LS.kb(51200) === '50 kB' && LS.kb(1.5 * 1024 * 1024) === '1,5 MB', 'kB og MB');
ok(LS.nyest('{"laget":5}', '{"laget":9}') === '{"laget":9}' && LS.nyest('{"laget":9}', '{"laget":5}') === '{"laget":9}' && LS.nyest(undefined, 'x') === 'x' && LS.nyest('a', 'b') === 'a', 'den nyeste kopien vinner (ellers den første)');

// omgjøringene
{
  const R = LS.lagOmgjøringer(3), logg = [];
  R.omgjør(1, l => { const k2 = l.json('riksbrudd-k2'); k2.nivå = (k2.nivå || 0) + 1; l.skriv('riksbrudd-k2', k2); logg.push('1a'); }, 'k2 får nivå');
  R.omgjør(0, l => { l.skriv('riksbrudd-ny', { fra: 0 }); logg.push('0'); });
  R.omgjør(1, l => { l.fjern('riksbrudd-gammel'); logg.push('1b'); l.senere(s => s.skriv('riksbrudd-stor-hus', '{"v":1}')); });
  R.omgjør(2, l => { logg.push('2'); });
  const base = { 'riksbrudd-k1': '{"ferdig":true}', 'riksbrudd-k2': '{"bygg":[]}', 'riksbrudd-gammel': '{"x":1}' };
  const r = R.kjør(base, 0);
  ok(r.feil === null && r.fra === 0 && r.til === 3 && logg.join(',') === '0,1a,1b,2', 'kjøres i rekkefølge etter versjon, og i den rekkefølgen de ble lagt inn for samme versjon');
  ok(JSON.parse(r.endringer['riksbrudd-k2']).nivå === 1 && r.endringer['riksbrudd-gammel'] === null && JSON.parse(r.endringer['riksbrudd-ny']).fra === 0, 'endringene samles (null = slett)');
  ok(base['riksbrudd-k2'] === '{"bygg":[]}' && base['riksbrudd-gammel'] === '{"x":1}', 'grunnlaget røres ikke (kjøres på en kopi)');
  ok(r.senere.length === 1, 'omgjøringer av de store dataene venter til databasen er lest');
  logg.length = 0; const r1 = R.kjør(base, 2);
  ok(logg.join(',') === '2' && r1.til === 3, 'fra versjon 2: bare den siste');
  logg.length = 0; const r3 = R.kjør(base, 3);
  ok(!logg.length && r3.til === 3 && !r3.kjørt.length && !r3.nyere, 'samme versjon: ingenting');
  const r4 = R.kjør(base, 5);
  ok(r4.nyere && r4.til === 5 && !Object.keys(r4.endringer).length, 'et spill fra en nyere utgave røres ikke');
  const R2 = LS.lagOmgjøringer(2);
  R2.omgjør(0, l => l.skriv('riksbrudd-k2', 'endret'));
  R2.omgjør(1, () => { throw new Error('bom'); }, 'feiler');
  const r5 = R2.kjør(base, 0);
  ok(r5.feil && /feiler: bom/.test(r5.feil) && r5.til === 0 && !Object.keys(r5.endringer).length, 'feiler én, endres ingenting');
  let kastet = false; try { R2.omgjør(-1, () => {}); } catch (e) { kastet = true; }
  ok(kastet, 'fraVersjon må være et heltall ≥ 0');
  const R3 = LS.lagOmgjøringer(2); R3.omgjør(0, l => l.skriv(LS.VERSJON_NØKKEL, '{"v":9}'));
  ok(R3.kjør(base, 0).feil, 'en omgjøring kan ikke sette versjonsmerket selv');
  // PRØVEOMGJØRING (oppdraget): et «gammelt» spill i versjon 1 der k2 hadde «bygg» som tall, gjøres om til en liste
  const R4 = LS.lagOmgjøringer(2);
  R4.omgjør(1, l => { const k2 = l.json('riksbrudd-k2'); if (k2 && typeof k2.bygg === 'number') { k2.bygg = Array.from({ length: k2.bygg }, (_, i) => ({ id: i + 1 })); l.skriv('riksbrudd-k2', k2); } }, 'bygg som tall → liste');
  const r6 = R4.kjør({ 'riksbrudd-k2': '{"bygg":2}' }, 1);
  ok(r6.til === 2 && JSON.parse(r6.endringer['riksbrudd-k2']).bygg.length === 2, 'prøveomgjøringen: bygg som tall blir en liste');
  ok(!Object.keys(R4.kjør({ 'riksbrudd-k2': '{"bygg":[]}' }, 1).endringer).length, 'prøveomgjøringen: et spill som alt har formen, røres ikke');
  // selvtest (årsak H): en omgjøring som feilaktig ikke kjøres, skal fanges av sjekken over
  const R5 = LS.lagOmgjøringer(2); R5.omgjør(5, l => l.skriv('riksbrudd-k2', 'x'));
  ok(!Object.keys(R5.kjør(base, 0).endringer).length, 'selvtest: en omgjøring utenfor versjonene kjøres ikke');
}

// fila: et spill lagret med en nyere utgave avvises med en forståelig melding; et gammelt (uten merke) leses
{
  const k1 = JSON.stringify({ ferdig: true, leir: { x: 196400, y: 6898900 }, fraksjon: { navn: 'Har' }, karakter: { navn: 'Kari' }, penger: 5 });
  const pl = LG.Plass.pakk({ 'riksbrudd-k1': k1, 'riksbrudd-versjon': LS.versjonTekst(LS.VERSJON + 1) }, { side: 'dovre', nå: 1 });
  const r = LG.Plass.les(LG.Plass.tilFil(pl), 'dovre');
  ok(r.feil && /nyere utgave/.test(r.feil), 'fil fra en nyere utgave avvises');
  const gml = LG.Plass.les(LG.Plass.tilFil(LG.Plass.pakk({ 'riksbrudd-k1': k1 }, { side: 'dovre', nå: 1 })), 'dovre');
  ok(gml.d && !gml.d.nøkler['riksbrudd-versjon'], 'fil fra før versjonsmerket (versjon 0) leses');
  const st = LG.Plass.pakk({ 'riksbrudd-k1': k1, 'riksbrudd-stor-hus': LS.pakkStor({ a: 1 }, { x: 196400, y: 6898900 }), 'riksbrudd-plass-1': '{"x":1}' }, { side: 'dovre', nå: 1 });
  ok(st.nøkler['riksbrudd-stor-hus'] && !st.nøkler['riksbrudd-plass-1'], 'de store dataene følger med i plassen, de andre plassene gjør ikke');
}

console.log(feil ? `${feil} FEIL` : 'alle ok'); process.exit(feil ? 1 : 0);
