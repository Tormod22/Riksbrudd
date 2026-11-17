// Test av reglene for kameravakta (spill/kameravakt.js). Kjør: node pipeline/fliser/test_kameravakt.js
const assert = require('assert'), K = require('../../site/dovre-fliser/spill/kameravakt.js');
let n = 0; const ok = (b, t) => { assert.ok(b, t); n++; };
const kam = nivå => [{ id: 7, x: 0, y: 0, r: 300, nivå }], fi = [{ id: 'f1', x: 0, y: 200, antall: 4, side: 'rød' }], null0 = () => .99;

// nivå 1 uten folk i kontrollrommet: klippet blir liggende, og fienden vises ikke
{ const S = K.ny(), u = K.steg(S, kam(1), fi, 100, 1, { tempo: 0, rng: null0 });
  ok(u.nye.length === 1 && u.nye[0].hva === 'folk' && u.nye[0].status === 'venter', 'klipp av folk');
  ok(!K.ser(S, kam(1)[0], 100) && K.venter(S) === 1 && u.varsler.length === 0, 'ingen har sett det');
  ok(u.nye[0].retning === 'nord' && u.nye[0].meter === 200 && u.nye[0].antall === 4, 'retning og avstand');
  for (let t = 101; t < 160; t++) K.steg(S, kam(1), fi, t, 1, { tempo: 0, rng: null0 });
  ok(!K.ser(S, kam(1)[0], 160) && K.venter(S) === 6, 'nytt klipp hvert tiende minutt, fortsatt usett');
  ok(S.hist.length === 0, 'bevegelseskameraet lagrer ikke spor'); }

// nivå 1 med én som ser gjennom: seks minutter per klipp, så varsel og synlig
{ const S = K.ny(); let varslet = -1; for (let t = 0; t < 12; t++) { const u = K.steg(S, kam(1), fi, t, 1, { tempo: 1, rng: null0 }); if (u.varsler.length && varslet < 0) varslet = t; }
  ok(varslet === 5, 'bekreftet etter seks minutter (var ' + varslet + ')'); ok(K.ser(S, kam(1)[0], 11), 'fienden vises'); ok(S.hist.length === 2, 'ett punkt i historikken per bekreftet klipp');
  // fienden går ut av bildet: vises 20 minutter til, så ikke
  for (let t = 12; t < 40; t++) K.steg(S, kam(1), [], t, 1, { tempo: 1, rng: null0 });
  ok(!K.ser(S, kam(1)[0], 40), 'ikke lenger synlig'); }

// dyr og vær: falske klipp avvises av den som ser gjennom, og gir ikke varsel
{ const S = K.ny(); let nye = 0, varsler = 0, avvist = 0, i = 0; const rng = () => ((i++ * 7919) % 1000) / 1000;
  for (let t = 0; t < 2880; t++) { const u = K.steg(S, kam(1), [], t, 1, { tempo: 1, vind: 3, rng }); nye += u.nye.length; varsler += u.varsler.length; avvist += u.avvist; }
  ok(nye >= 4 && nye <= 30, 'noen falske klipp på to døgn (' + nye + ')'); ok(varsler === 0 && avvist === nye, 'alle avvist'); ok(K.venter(S) === 0, 'køen er tom'); }

// mye vind gir flere klipp av vær
{ const tell = vind => { const S = K.ny(); let v = 0, i = 0; const rng = () => ((i++ * 104729) % 10007) / 10007; for (let t = 0; t < 14400; t++) for (const k of K.steg(S, kam(1), [], t, 1, { tempo: 5, vind, rng }).nye) if (k.hva === 'vær') v++; return v; };
  ok(tell(20) > tell(2) * 2, 'storm gir flere falske klipp'); }

// nivå 2: spor av hvor fienden går, også før noen har sett klippet
{ const S = K.ny(); for (let t = 0; t < 20; t++) K.steg(S, kam(2), [{ id: 'f1', x: t * 10, y: 100, antall: 2, side: 'rød' }], t, 1, { tempo: 0, rng: null0 });
  const sp = K.spor(S); ok(sp.length === 1 && sp[0].punkter.length === 10 && sp[0].side === 'rød', 'spor hvert annet minutt'); ok(sp[0].punkter[9].x > sp[0].punkter[0].x, 'i rekkefølge'); ok(!K.ser(S, kam(2)[0], 20), 'men ikke varslet'); }

// nivå 3: varsler straks, uten folk, og lager ikke klipp av dyr og vær
{ const S = K.ny(), u = K.steg(S, kam(3), fi, 0, 1, { tempo: 0, rng: () => 0 });
  ok(u.varsler.length === 1 && u.nye.length === 1 && u.nye[0].status === 'folk', 'smart kamera varsler selv'); ok(K.ser(S, kam(3)[0], 0), 'synlig'); ok(K.venter(S) === 0, 'ingenting venter'); }

// lagring og rydding
{ const S = K.ny(); for (let t = 0; t < 4000; t += 10) K.steg(S, kam(2), fi, t, 10, { tempo: 0, rng: null0 });
  ok(S.klipp.length <= K.REGLER.klippMaks, 'klippene har et tak'); ok(S.hist.every(h => h.t >= 4000 - 10 - K.REGLER.historikkTimer * 60), 'gammel historikk ryddes');
  const T = K.fra(JSON.parse(JSON.stringify(S))); ok(T.klipp.length === S.klipp.length && T.hist.length === S.hist.length && T.nr === S.nr, 'tåler lagring'); ok(K.fra(null).klipp.length === 0 && K.fra({ klipp: [{ hva: 'tull', t: 1 }] }).klipp.length === 0, 'tåler søppel'); }
ok(K.type(0) === K.TYPER[0] && K.type(9) === K.TYPER[2], 'typen følger nivået'); ok(/bare et dyr/.test(K.tekst({ hva: 'dyr' })), 'tekst');
console.log(`ok   kameravakta: ${n} sjekker`);
