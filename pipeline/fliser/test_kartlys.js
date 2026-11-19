// Test for spill/kartlys.js (natt og regn i 2D-kartet): node pipeline/fliser/test_kartlys.js
const K = require('../../site/dovre-fliser/spill/kartlys.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const dag = K.tone({ e: 40 }), natt = K.tone({ e: -20 }), sommernatt = K.tone({ e: -8 }), skumring = K.tone({ e: 0 });
ok(dag.natt === 0 && dag.grå === 0 && dag.mørk === 0, 'midt på dagen i klarvær: kartet som før');
ok(natt.natt > .5 && natt.natt <= K.REGLER.nattMaks, `full natt: mørkt og blått (${natt.natt.toFixed(2)})`);
ok(sommernatt.natt > 0 && sommernatt.natt < natt.natt, `lys sommernatt er lysere enn full natt (${sommernatt.natt.toFixed(2)})`);
ok(skumring.natt > 0 && skumring.natt < sommernatt.natt, `skumring: litt mørkere (${skumring.natt.toFixed(2)})`);
let fall = true, f0 = -1; for (let e = 30; e >= -30; e -= 1) { const n = K.tone({ e }).natt; if (n < f0 - 1e-9) fall = false; f0 = n; }
ok(fall, 'mørket øker jevnt når sola går ned (ingen hopp tilbake)');
let hopp = 0; for (let e = 30; e > -30; e -= .5) hopp = Math.max(hopp, Math.abs(K.tone({ e }).natt - K.tone({ e: e - .5 }).natt)); ok(hopp < .05, `mykt: største steg per halve grad ${hopp.toFixed(3)}`);
const regn = K.tone({ e: 40, regn: 1, sky: 1 }), litt = K.tone({ e: 40, regn: .3, sky: .5 }), snø = K.tone({ e: 40, snø: .8 });
ok(regn.grå > .3 && regn.mørk > 0 && regn.natt === 0, `kraftig regn: gråere og litt mørkere (grå ${regn.grå.toFixed(2)}, mørk ${regn.mørk.toFixed(2)})`);
ok(litt.grå > 0 && litt.grå < regn.grå, 'lett regn: mindre grått');
ok(snø.grå > 0, 'snø gjør også kartet gråere');
{ const T = K.tone({ e: -20, regn: 1, sky: 1 }), snitt = T.farge.reduce((a, b) => a + b, 0) / 3 / 255, lys = (1 - T.natt * (1 - snitt)) * (1 - T.mørk);
  ok(lys > .4, `natt og regn sammen: kartet har ${Math.round(lys * 100)} % av lyset igjen (kan leses, ikke svart)`); }
process.exit(feil ? 1 : 0);
