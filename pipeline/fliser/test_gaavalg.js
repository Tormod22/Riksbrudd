// Test: node pipeline/fliser/test_gaavalg.js – «Gå hit» og døra (spill/gaavalg.js, runde 6)
const G = require('../../site/dovre-fliser/spill/gaavalg.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const R = G.REGLER;
ok(G.valg(20).type === 'her' && G.valg(R.nær).type === 'her', 'nær karakteren: start der uten å spørre');
const v = G.valg(800); ok(v.type === 'spør' && v.min >= 12 && v.min <= 20, `800 m: spør, ca. ${v.min} min til fots`);
ok(G.valg(R.maks + 10).type === 'forLangt', 'over ' + R.maks + ' m: for langt i ett strekk');
ok(G.reiseMin(1) === 1 && G.reiseMin(4000) > G.reiseMin(2000), 'reisetiden øker med avstanden, minst 1 min');
ok(G.tidTekst(15) === 'ca. 15 min' && G.tidTekst(80) === 'ca. 1 t 20 min' && G.tidTekst(120) === 'ca. 2 t', 'tidteksten: ' + G.tidTekst(80));
// døra: vegg langs x-aksen ved y = 0, huset under (y < 0), døra midt på i x = 0, 1,1 m bred
const I = { x: 0, y: 0, nx: 0, ny: 1, ux: 1, uy: 0, w: 1.1 };
const ute = G.iDøra(I, .3, 1); ok(ute.ut === 1 && ute.langs === .3, 'iDøra: 1 m ute, 0,3 m til siden');
const m = G.dørTrekk(I, .4, .6, 0, -1, .05); ok(m < 0 && m > -.4, `går inn mot døra 0,4 m til siden: trekkes mot midten (${m.toFixed(3)} m)`);
ok(G.dørTrekk(I, .4, .6, 0, 1, .05) === 0, 'går bort fra døra: ingen trekk');
ok(G.dørTrekk(I, .4, 3, 0, -1, .05) === 0, 'langt fra døra (3 m): ingen trekk');
ok(G.dørTrekk(I, 2, .6, 0, -1, .05) === 0, 'langt til siden (2 m): ingen trekk');
ok(G.dørTrekk(I, -.4, -.5, 0, 1, .05) > 0, 'inne, går ut: trekkes mot midten');
ok(G.dørTrekk(I, .4, -.5, 0, -1, .05) === 0, 'inne, går innover: ingen trekk');
// simulert: går rett mot veggen 0,45 m til siden av midten – etter et sekund står du innenfor åpningen (|langs| < 0,13 m)
{ let x = .45, y = 1.5; for (let t = 0; t < 1; t += .05) { x += G.dørTrekk(I, x, y, 0, -1, .05) * 1; y = Math.max(.42, y - 1.7 * .05); }
  ok(Math.abs(x) < .13, `går mot døra 0,45 m til siden: ${x.toFixed(3)} m fra midten etter 1 s (åpningen slipper deg gjennom innen 0,13 m)`); }
const [a, b] = G.dørVei(I, true); ok(a[1] > 0 && b[1] < 0 && a[0] === 0 && b[0] === 0, '«Gå inn»: først midt foran døra, så innenfor');
const [c, d] = G.dørVei(I, false); ok(c[1] < 0 && d[1] > 0, '«Gå ut»: motsatt');
const k = G.kurs(0, 0, 0, 5), k2 = G.kurs(0, 0, -5, 0); ok(Math.abs(k) < 1e-9 && Math.abs(k2 - Math.PI / 2) < 1e-9, 'kursen: nord = 0, vest = π/2 (som Gange: ser mot (−sin a, cos a))');
process.exit(feil ? 1 : 0);
