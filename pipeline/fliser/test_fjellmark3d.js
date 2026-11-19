// Test: node pipeline/fliser/test_fjellmark3d.js – fjellmark nær deg i 3D (spill/fjellmark3d.js, runde 6)
const F = require('../../site/dovre-fliser/spill/fjellmark3d.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const grå = [150, 150, 145], grønn = [90, 130, 70], brun = [140, 120, 95];
ok(F.fjell(1500, 1100, grønn) > .9, 'høyt over tregrensen: fjellmark (også med grønn kartfarge)');
ok(F.fjell(700, 1100, grønn) === 0, 'grønt i dalen: ikke fjellmark');
ok(F.fjell(1060, 1100, grønn) > 0 && F.fjell(1060, 1100, grønn) < F.fjell(1300, 1100, grønn), 'like under tregrensen: glir inn');
ok(F.fjell(700, 1100, grå) === 0 && F.fjell(700, 1100, brun) > 0 && F.fjell(700, 1100, brun) < .5, 'langt under tregrensen: ikke på grått (asfalt), litt på brun hei (Rogaland)');
ok(F.fjell(1300, 1100, brun) > .5, 'brun mark over tregrensen: fjellmark');
let n = { stein: 0, lav: 0, lyng: 0, snø: 0, null: 0 }; for (let i = 0; i < 1000; i++) n[F.slag(i / 1000, 1, true)]++;
ok(n.stein > 100 && n.lav > 100 && n.lyng > 100 && n.snø > 10 && n.snø < 60, 'alle slagene forekommer: ' + JSON.stringify(n));
let m = { stein: 0, lav: 0, lyng: 0, snø: 0, null: 0 }; for (let i = 0; i < 1000; i++) m[F.slag(i / 1000, .2, false)]++;
ok(m.snø === 0 && m.null > n.null, 'ingen snøflekker der det ikke er høyt nok, glisnere der det er mindre fjell');
process.exit(feil ? 1 : 0);
