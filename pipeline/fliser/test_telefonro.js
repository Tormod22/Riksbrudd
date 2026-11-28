// Test for spill/telefonro.js (Vis i kartet og Marsjer på telefon): node pipeline/fliser/test_telefonro.js
const T = require('../../site/dovre-fliser/spill/telefonro.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
// Selskapet på telefon (Jonas, bilde 13): panelet fra y 190 til 780 av 844, statuslinja slutter på 98 – feltet over er for lite
{ const F = T.friFelt(844, 98, { top: 190, bottom: 780 }); ok(F && F.y0 === 98 && F.y1 === 190, 'friFelt: feltet over panelet (' + JSON.stringify(F) + ')');
  ok(F.y1 - F.y0 < T.REGLER.minFri, 'friFelt: for lite til å vise målet – panelet lukkes'); }
// et lavt panel nede: god plass over
{ const F = T.friFelt(844, 98, { top: 560, bottom: 790 }); ok(F && F.y1 - F.y0 >= T.REGLER.minFri, 'friFelt: lavt panel nede gir plass over (' + (F.y1 - F.y0) + ' px)'); }
// panel øverst: feltet under
{ const F = T.friFelt(844, 98, { top: 98, bottom: 400 }); ok(F && F.y0 === 400, 'friFelt: panel øverst gir feltet under'); }
ok(T.friFelt(844, 98, null) === null && T.friFelt(844, 98, { top: 900, bottom: 1000 }) === null, 'friFelt: uten panel på skjermen: null');
// Marsjer: troppen ved leiren, målet 1,3 km vest – begge i feltet
{ const a = { x: 0, y: 0 }, b = { x: -1300, y: 200 }, F = { y0: 130, y1: 690 }, k = T.passInn(a, b, 390, F, 1.5);
  const sx = X => (X - k.x) / k.m + 195, sy = Y => (k.y - Y) / k.m + 422 + (k.midtY - 422);
  const inne = p => sx(p.x) >= 0 && sx(p.x) <= 390 && sy(p.y) >= F.y0 && sy(p.y) <= F.y1;
  ok(inne(a) && inne(b), 'passInn: troppen og målet står begge i feltet (m ' + k.m.toFixed(2) + ')');
  ok(k.m >= 1.5, 'passInn: zoomer aldri inn'); }
{ const k = T.passInn({ x: 0, y: 0 }, { x: 50, y: 0 }, 390, { y0: 130, y1: 690 }, 2); ok(k.m === 2, 'passInn: nære mål – målestokken står'); }
{ const k = T.passInn({ x: 0, y: 0 }, { x: 900000, y: 0 }, 390, { y0: 130, y1: 690 }, 2); ok(k.m === T.REGLER.maksM, 'passInn: aldri lenger ut enn ' + T.REGLER.maksM + ' m per punkt'); }
console.log(feil ? `${feil} FEIL` : 'Alle tester ok'); process.exit(feil ? 1 : 0);
