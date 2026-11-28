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
{ // 5b. (18. nov) Sikten er lik begge veger: brekken fra Dovre (1118 -> 1127 moh. på 250 m, funnet med to lag 250 m fra hverandre –
  // laget på flata så laget nedenfor, men ikke omvendt). Målet er en person 1,8 m over bakken; med bakken som mål (mål = 0) var det skjevt.
  const P = [[0, 1118], [25, 1118], [50, 1119], [75, 1119], [100, 1120], [125, 1120], [150, 1122], [175, 1125], [200, 1127], [225, 1127], [250, 1127], [300, 1127]];
  const hAt = d => { for (let q = 1; q < P.length; q++) if (d <= P[q][0]) { const [a, ha] = P[q - 1], [b, hb] = P[q]; return ha + (hb - ha) * (d - a) / (b - a); } return 1127; };
  const brekk = i0 => { const v = flatt(); for (let j = 0; j < 100; j++) for (let i = 0; i < 100; i++) v.H[j * 100 + i] = i < i0 ? 1118 : hAt((i - i0) * 32); return v; };
  let skjev = 0, skjevFør = 0, n = 0;
  for (const i0 of [20, 25, 30]) for (let db = 5; db <= 10; db++) { const v = brekk(i0), A = S(v, i0, 50), B = S(v, i0 + db, 50), kA = 50 * 100 + i0, kB = 50 * 100 + i0 + db; n++;
    if (T.siktfelt(v, ...A, 3000)[kB] !== T.siktfelt(v, ...B, 3000)[kA]) skjev++;
    if (T.siktfelt(v, ...A, 3000, 2, 0)[kB] !== T.siktfelt(v, ...B, 3000, 2, 0)[kA]) skjevFør++; }
  sjekk('siktfelt: over en brekk ser begge hverandre, eller ingen', skjev === 0, `${n} plasseringer, skjeve nå ${skjev}, med bakken som mål ${skjevFør}`);
  sjekk('siktfelt: brekken ga skjev sikt med bakken som mål (testen finner feilen)', skjevFør > 0);
  const v = flatt(); for (let j = 0; j < 100; j++) for (let i = 60; i < 63; i++) v.H[j * 100 + i] = 1060;
  sjekk('siktfelt: en person bak ryggen synes fortsatt ikke', T.siktfelt(v, ...S(v, 30, 50), 3000)[50 * 100 + 70] === 0);
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
// (ut6-fiksd) et lag utenfor kartet ga negativ vindusstørrelse og RangeError fra oppdaterSikt
{
  const v = T.nyttVindu(0, 0, 32, -256, 256), v2 = T.nyttVindu(0, 0, 32, NaN, 3);
  sjekk('vindu: negativ eller ugyldig størrelse gir tomt vindu', v.w === 0 && v.H.length === 0 && v2.w === 0 && v2.K.length === 0);
  sjekk('vindu: sikt i tomt vindu krasjer ikke', T.siktfelt(v, 5, 5, 400).length === 0 && Number.isFinite(T.siktvidde(v, 5, 5, false, false)));
}
console.log(feil ? feil + ' feil' : 'Alle terrengtester ok'); process.exit(feil ? 1 : 0);
