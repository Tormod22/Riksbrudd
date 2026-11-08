// Tester spillreglene i site/dovre-fliser/terreng.js på små oppdiktede terreng med kjent svar.
// Bruk (fra repo-roten): node pipeline/fliser/test_terreng.js
const { Terreng: T } = require('../../site/dovre-fliser/terreng.js');
let feil = 0;
const sjekk = (navn, ok, info = '') => { console.log((ok ? 'ok   ' : 'FEIL ') + navn + (info ? ' – ' + info : '')); if (!ok) feil++; };

// 100 x 100 ruter à 32 m, flat hei på 1000 moh.
function flatt() { const v = T.nyttVindu(0, 3200, 32, 100, 100); v.H.fill(1000); v.K.fill(2); return v; }
const S = (v, i, j) => T.senter(v, i, j);

{ // 1. Rett fram på flat hei: 2,24 km i 3 km/t
  const v = flatt(), r = T.ruteTil(v, ...S(v, 10, 50), ...S(v, 80, 50));
  sjekk('flat hei: tid stemmer med 3 km/t', r && Math.abs(r.timer - 70 * 32 / 1000 / 3) < 0.01, r && r.timer.toFixed(3) + ' t');
}
{ // 2. Innsjø på tvers: må gå rundt; uten åpning finnes ingen rute
  const v = flatt(); for (let j = 0; j < 100; j++) for (let i = 45; i < 55; i++) if (j > 5) v.K[j * 100 + i] = 3;
  const r = T.ruteTil(v, ...S(v, 10, 50), ...S(v, 80, 50));
  sjekk('innsjø: går rundt nordenden', r && r.sti.some(([, y]) => y > 3200 - 6 * 32), r && r.timer.toFixed(2) + ' t');
  for (let i = 45; i < 55; i++) for (let j = 0; j <= 5; j++) v.K[j * 100 + i] = 3;
  sjekk('innsjø uten åpning: ingen rute', T.ruteTil(v, ...S(v, 10, 50), ...S(v, 80, 50)) === null);
  T.leggInnVeger(v, [{ k: 'F', p: [S(v, 5, 50), S(v, 95, 50)] }]);
  const rv = T.ruteTil(v, ...S(v, 10, 50), ...S(v, 80, 50));
  sjekk('veg over vannet: kan gå, og fort (5 km/t)', rv && Math.abs(rv.timer - 70 * 32 / 1000 / 5) < 0.01, rv && rv.timer.toFixed(3) + ' t');
}
{ // 3. Bratt fjell midt i: ruten går rundt, og over er tregere enn rundt
  const v = flatt();
  for (let j = 0; j < 100; j++) for (let i = 0; i < 100; i++) { const d = Math.hypot(i - 45, j - 50); if (d < 20) v.H[j * 100 + i] = 1000 + (20 - d) * 40; }
  const r = T.ruteTil(v, ...S(v, 10, 50), ...S(v, 80, 50));
  const maksH = Math.max(...r.sti.map(([x, y]) => T.verdi(v, v.H, x, y)));
  sjekk('fjell: ruten unngår toppen', maksH < 1400, 'høyeste punkt ' + Math.round(maksH) + ' moh.');
  sjekk('fjell: tregere enn flatt', r.timer > 70 * 32 / 1000 / 3 + 0.01, r.timer.toFixed(2) + ' t');
}
{ // 4. Siktvidde: skog, bevegelse, speider og høyde over omgivelsene
  const v = flatt(), [x, y] = S(v, 50, 50);
  sjekk('sikt: lag på hei 4 km', T.siktvidde(v, x, y, false, false) === 4000);
  sjekk('sikt: speider 8 km', T.siktvidde(v, x, y, true, false) === 8000);
  sjekk('sikt: i bevegelse ×0,55', Math.abs(T.siktvidde(v, x, y, false, true) - 2200) < 1);
  v.K[50 * 100 + 50] = 1; sjekk('sikt: i skog ×0,35', Math.abs(T.siktvidde(v, x, y, false, false) - 1400) < 1); v.K[50 * 100 + 50] = 2;
  v.K[50 * 100 + 50] = 7; sjekk('sikt: i tettbebyggelse ×0,4', Math.abs(T.siktvidde(v, x, y, false, false) - 1600) < 1); v.K[50 * 100 + 50] = 2;
  v.H[50 * 100 + 50] = 1150; sjekk('sikt: på en topp lenger', T.siktvidde(v, x, y, false, false) > 4000, Math.round(T.siktvidde(v, x, y, false, false)) + ' m');
}
{ // 5. Siktfelt: en rygg skjuler dalen bak; skog skjuler det bak trærne
  const v = flatt();
  for (let j = 0; j < 100; j++) for (let i = 60; i < 63; i++) v.H[j * 100 + i] = 1060;   // 60 m høy rygg
  const sf = T.siktfelt(v, ...S(v, 30, 50), 3000);
  sjekk('siktfelt: ser fram til ryggen', sf[50 * 100 + 55] === 1 && sf[50 * 100 + 60] === 1);
  sjekk('siktfelt: ser ikke bak ryggen', sf[50 * 100 + 70] === 0 && sf[50 * 100 + 85] === 0);
  const v2 = flatt(); for (let j = 0; j < 100; j++) for (let i = 40; i < 44; i++) v2.K[j * 100 + i] = 1;
  const sf2 = T.siktfelt(v2, ...S(v2, 30, 50), 3000);
  sjekk('siktfelt: skogkanten synes', sf2[50 * 100 + 40] === 1);
  sjekk('siktfelt: ikke bak skogen', sf2[50 * 100 + 60] === 0);
  const v3 = flatt(); for (let j = 0; j < 100; j++) for (let i = 40; i < 44; i++) v3.K[j * 100 + i] = 7;
  sjekk('siktfelt: ikke bak husene', T.siktfelt(v3, ...S(v3, 30, 50), 3000)[50 * 100 + 60] === 0);
  sjekk('fart: tettbebyggelse 3,5 km/t, veg gjennom 4–5', T.fart(7, 0) === 3.5 && T.fart(7, 1) === 4);
  sjekk('siktfelt: ikke lenger enn radius', T.siktfelt(flatt(), ...S(v, 50, 50), 640)[50 * 100 + 75] === 0);
}
{ // 6. Ildkamp
  const lag = () => ['lagfører', 'nestlagfører', 'skarpskytter', 'sanitet', 'radio', 'maskingevær', 'maskingevær', 'rifle', 'rifle', 'rifle', 'rifle', 'rifle'].map(rolle => ({ rolle, hp: 1 }));
  const snitt = (d, f) => { const r = T.frø(42); let s = 0; for (let i = 0; i < 4000; i++) s += T.ildrunde(lag(), d, f, r); return s / 4000; };
  sjekk('kamp: ingen treff utenfor rekkevidde (1000 m)', snitt(1000, {}) === 0);
  sjekk('kamp: bare MG og skarpskytter når 800 m', T.treffsjanse('rifle', 800, {}) === 0 && T.treffsjanse('maskingevær', 800, {}) > 0);
  const nær = snitt(150, {}), langt = snitt(500, {});
  sjekk('kamp: flere treff nær enn langt', nær > langt * 2, nær.toFixed(2) + ' mot ' + langt.toFixed(2) + ' per runde');
  const skog = snitt(150, { målISkog: true });
  sjekk('kamp: skog halverer treffene', Math.abs(skog / nær - .5) < .08, (skog / nær).toFixed(2));
  sjekk('kamp: på marsj er lettere å treffe', snitt(150, { målPåMarsj: true }) > nær);
  const a = T.frø(7), b = T.frø(7); sjekk('kamp: samme frø gir samme kamp', T.ildrunde(lag(), 200, {}, a) === T.ildrunde(lag(), 200, {}, b));
  const m = lag(), r = T.frø(3); T.fordelTreff(m, 6, r);
  sjekk('kamp: 6 treff gir 6 ute av kamp (eller flere falt)', T.uteAvKamp(m) === 6 && T.slattUt(m));
  const m2 = lag(); m2.forEach((x, i) => { if (i < 5) x.hp = 0; });
  sjekk('kamp: 5 ute er ikke slått ut', !T.slattUt(m2));
  const m3 = lag(); m3.forEach(x => x.hp = .5);
  sjekk('kamp: sårede skyter ikke', T.ildrunde(m3, 100, {}, () => 0) === 0);
}
console.log(feil ? feil + ' feil' : 'Alle terrengtester ok'); process.exit(feil ? 1 : 0);
