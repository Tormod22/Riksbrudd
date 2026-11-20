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
// ---------- runde 8 ----------
// styrespaken: bare rundt spaken og helt nede til venstre (kritikerens drag fra (150, 450) på 390 × 844 skal være «se rundt»)
ok(!G.erSpak(150, 450, 390, 844) && !G.erSpak(300, 450, 390, 844), 'telefon: drag midt på skjermen (150, 450) er å se rundt, ikke styrespak');
ok(G.erSpak(90, 724, 390, 844) && G.erSpak(40, 800, 390, 844), 'telefon: på spaken (90, 724) og helt nede til venstre er styrespak');
ok(!G.erSpak(300, 760, 390, 844), 'telefon: nede til høyre (Skyt/Huk/Hopp) er ikke styrespak');
// inngangen: normalen peker ut av huset
{ const P = [[0, 0], [10, 0], [10, 8], [0, 8]], In = G.inngang(P, { x: 5, y: 0, ux: 1, uy: 0, w: 1 }); ok(In.nx === 0 && In.ny === -1, 'inngang: døra i sørveggen peker mot sør (ut av huset)');
  const In2 = G.inngang(P, { x: 10, y: 4, ux: 0, uy: 1, w: 1 }); ok(In2.nx === 1 && Math.abs(In2.ny) < 1e-9, 'inngang: døra i østveggen peker mot øst');
  // pila: du ser sør, døra er nord for deg – peker bakover, vises
  const q = G.pekerMot(In, 5, -20, Math.PI); ok(q.vis && Math.abs(Math.abs(q.rel) - Math.PI) < .05 && q.vender, `pila: døra 19 m rett bak deg peker bakover (rel ${q.rel.toFixed(2)})`);
  // døra rett foran og vender mot deg innen 28 m: ingen pil («Inngang»-merket står over døra)
  const q2 = G.pekerMot(In, 5, -12, 0); ok(!q2.vis, 'pila: døra rett foran deg og synlig – ingen pil');
  // på andre siden av huset: «rundt huset»
  const q3 = G.pekerMot(In, 5, 20, Math.PI); ok(q3.vis && !q3.vender && /rundt huset/.test(G.pekerTekst(q3)), 'pila: døra på andre siden – «' + G.pekerTekst(q3) + '»');
  const q4 = G.pekerMot(In, 25, -1, 0); ok(q4.vis && q4.rel < 0, `pila: døra til venstre for deg (rel ${q4.rel.toFixed(2)} < 0)`);
  ok(!G.pekerMot(In, 5, -3, 0).vis && !G.pekerMot(In, 5, -200, 0).vis, 'pila: ikke nærmere enn ' + R.peker.min + ' m eller lenger enn ' + R.peker.maks + ' m');
  // punktet utenfor huset nærmest karakteren
  const [ux, uy] = G.utenfor(P, 5, -100, 5); ok(Math.abs(ux - 5) < 1e-9 && Math.abs(uy + 5) < 1e-9, `utenfor: 5 m sør for sørveggen (${ux}, ${uy})`);
  const [vx, vy] = G.utenfor(P, 30, 30, 5); ok(Math.hypot(vx - 10, vy - 8) > 4.9 && Math.hypot(vx - 10, vy - 8) < 5.1, 'utenfor: 5 m ut fra hjørnet mot nordøst'); }
ok(G.reiseSteg(.25, 600) === 2.5 && G.reiseSteg(10, 600) === R.reise.maksPerBilde && G.reiseSteg(-1, 600) === 0, 'reisesteg: sanntid × fart, høyst ' + R.reise.maksPerBilde + ' spillminutter per bilde');
process.exit(feil ? 1 : 0);
