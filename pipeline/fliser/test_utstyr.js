// Test av reglene i spill/utstyr.js: våpen, sekk med vekt, lading, sikting og funn.
const U = require('../../site/dovre-fliser/spill/utstyr.js'); let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
{ const I = U.ny(), A = U.aktivt(I); ok(I.våpen.length === 2 && A.def.navn === 'Automatgevær' && A.reserve === 60 && A.v.mag === 30 && U.vekt(I) > 5 && U.vekt(I) < 9.5, `start: gevær og pistol, ${U.vekt(I)} kg`); }
{ const I = U.ny(); I.våpen[0].mag = 4; ok(U.lad(I, I.våpen[0]) === 26 && I.våpen[0].mag === 30 && I.ting.a556 === 34, 'lading tar skuddene fra sekken'); I.ting.a556 = 3; I.våpen[0].mag = 0; ok(U.lad(I, I.våpen[0]) === 3 && !I.ting.a556, 'ikke mer enn du har'); }
{ const I = U.ny(), n = U.leggTil(I, 'a762', 5000); ok(n < 5000 && n > 500 && U.vekt(I) <= U.MAKS_VEKT + 1e-6 && U.leggTil(I, 'forbinding', 1) === 0 && U.nyttVåpen(I, 'rifle') !== null, `sekken har vektgrense (${n} skudd fikk plass, så var den full)`); }
{ const I = U.ny(); ok(U.nyttVåpen(I, 'hagle') === null && U.nyttVåpen(I, 'rifle') === null && I.våpen.length === 4 && /4 våpen/.test(U.nyttVåpen(I, 'mp')), 'høyst fire våpen');
  I.aktiv = 3; ok(U.kastVåpen(I, 0) && I.våpen.length === 3 && I.aktiv === 2 && I.ting.a556 === 90, 'kastet våpen: skuddene i magasinet går i sekken, og det du har framme er det samme');
  U.kastVåpen(I, 0); U.kastVåpen(I, 0); ok(!U.kastVåpen(I, 0) && I.våpen.length === 1, 'du beholder alltid ett våpen'); }
{ const V = U.VÅPEN; ok(U.sikter(V.rifle, 600, .003) && !U.sikter(V.gevær, 600, 0) && !U.sikter(V.hagle, 100, 0) && U.sikter(V.hagle, 30, .15) && !U.sikter(V.gevær, 30, .15), 'rekkevidde og bredde: rifla når langt, hagla er lett å sikte med nær');
  ok(U.sjanse(V.pistol, 60) < U.sjanse(V.gevær, 60) && U.sjanse(V.rifle, 600) >= .15 && V.hagle.hagl === 6 && V.rifle.skade === 1, 'sjansen følger våpenets rekkevidde'); }
{ const I = U.ny(); ok(U.bruk(I, 'forbinding') === 45 && U.bruk(I, 'forbinding') === 0 && U.bruk(I, 'a9') === 0, 'førstehjelp gir helse én gang per pakke'); }
{ let noe = 0, våpen = 0, like = true; for (let i = 1; i <= 3000; i++) { const f = U.funn('hus', i), g = U.funn('hus', i); if (JSON.stringify(f) !== JSON.stringify(g)) like = false; if (f) { noe++; if (f.våpen) { våpen++; if (!U.VÅPEN[f.våpen]) like = false; } else if (!U.TING[f.ting] || !(f.n > 0)) like = false; } }
  ok(like && noe > 600 && noe < 1200 && våpen > 20 && våpen < 150, `funn: ${noe} av 3000 hus har noe, ${våpen} av dem et våpen, og samme hus gir samme funn`); }
{ const I = U.fra({ våpen: [{ id: 'tull', mag: 3 }, { id: 'hagle', mag: 99 }], aktiv: 7, ting: { a9: 12.7, x: 4, forbinding: -1 } }); ok(I.våpen.length === 1 && I.våpen[0].mag === 6 && I.aktiv === 0 && I.ting.a9 === 12 && !I.ting.x && !I.ting.forbinding && U.fra(null).våpen.length === 2, 'lagret sekk renses når den leses'); }
console.log(feil ? feil + ' feil' : 'alle utstyrstestene ok'); process.exit(feil ? 1 : 0);
