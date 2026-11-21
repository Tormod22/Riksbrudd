// Test av regelen i spill/folk3d.js (uten DOM): folk i leiren går unna når du står inntil dem (runde 13).
const F = require('../../site/dovre-fliser/spill/folk3d.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const U = F.UNNA;
ok(F.unna(0, 0, 0, U.avst + .1) === null, `lenger unna enn ${U.avst} m: står i fred`);
{ const r = F.unna(0, 0, 0, 2); ok(!!r && r.flytt === null, '2 m foran: går unna, men flyttes ikke straks');
  ok(Math.abs(Math.hypot(r.tx, r.ty) - U.til) < 1e-9 && r.ty > 0, `målet er ${U.til} m fra deg, på samme side som figuren`); }
{ const r = F.unna(0, 0, .3, .2); ok(!!r.flytt && Math.abs(Math.hypot(r.flytt[0], r.flytt[1]) - U.inntil) < 1e-9, `inntil deg (0,4 m): skyves ut til ${U.inntil} m`); }
{ const a = F.unna(0, 0, 0, 1.5, 1), b = F.unna(0, 0, 0, 1.5, -1); ok(Math.sign(a.tx) !== Math.sign(b.tx), 'side 1 og −1 går til hver sin side'); }
{ const r = F.unna(5, 5, 5, 5); ok(!!r && !!r.flytt && Number.isFinite(r.tx), 'figuren akkurat der du står: flyttes ut, ingen NaN'); }
{ const r = F.unna(0, 0, 0, 1.6, 1, F.STARTREGEL); ok(!!r && !!r.flytt && Math.hypot(r.flytt[0], r.flytt[1]) >= 2, 'gåmodus starter: figur 1,6 m foran flyttes straks minst 2 m unna (runde 14)'); }
ok(F.STARTREGEL.inntil >= 2 && F.UNNA.startTid > 0, 'startregelen gir minst 2 m fri sikt');
ok(F.dtFra(2000, 1000) === F.DT_MAKS && Math.abs(F.dtFra(1100, 1000) - .1) < 1e-9 && F.dtFra(5, 0) === .016, `tiden per bilde: ekte tid, høyst ${F.DT_MAKS} s`);
console.log(feil ? feil + ' feil' : 'alle folk3d-testene ok'); process.exit(feil ? 1 : 0);
