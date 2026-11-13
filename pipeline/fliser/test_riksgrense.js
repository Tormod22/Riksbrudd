// Test av riksgrensa (site/dovre-fliser/spill/riksgrense.js) og datafila (site/dovre-fliser/data/riksgrense.json).
// Bruk: node pipeline/fliser/test_riksgrense.js
const fs = require('fs'), path = require('path');
const RG = require('../../site/dovre-fliser/spill/riksgrense.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// en liten grense: fra sør til nord langs x = 0, med en bukt mot øst (Norge ligger til venstre = vest)
const liten = RG.les({ x0: 0, y0: 0, linje: [0, 10000, 5000, 0, 0, 10000, -5000, 0, 0, 10000] });
ok(RG.avstand(liten, -2000, 5000) > 0 && Math.abs(RG.avstand(liten, -2000, 5000) - 2000) < 1e-6, 'vest for linjen: i Norge, 2000 m fra grensa');
ok(RG.avstand(liten, 3000, 5000) < 0 && Math.abs(RG.avstand(liten, 3000, 5000) + 3000) < 1e-6, 'øst for linjen: utenfor, −3000 m');
ok(RG.iNorge(liten, 2000, 15000) && !RG.iNorge(liten, 7000, 15000), 'bukta mot øst hører til Norge, øst for den er utlandet');
ok(!RG.iNorge(liten, 2000, 8000) && !RG.iNorge(liten, 6000, 9000), 'sør for bukta: utenfor (nærmeste punkt er et hjørne)');
ok(RG.iNorge(liten, -100000, 5000) && !RG.iNorge(liten, 100000, 5000), 'langt unna: fortegnet fra den grove linjen');
ok(RG.iNorge(liten, -3000, -200000) && !RG.iNorge(liten, 3000, -200000) && RG.iNorge(liten, -3000, 250000) && !RG.iNorge(liten, 3000, 250000), 'utenfor endene: linjen er forlenget rett ut');

// datafila
const fil = path.join(__dirname, '..', '..', 'site', 'dovre-fliser', 'data', 'riksgrense.json');
ok(fs.statSync(fil).size < 60000, 'datafila under 60 KB (' + (fs.statSync(fil).size / 1000).toFixed(0) + ' KB)');
const d = JSON.parse(fs.readFileSync(fil)), R = RG.les(d);
ok(d.land_km > 2500 && d.land_km < 2620, `landegrensa er ${d.land_km} km (Kartverket: 2562 km)`);
ok(/Kartverket/.test(d.kilde) && /CC BY/.test(d.kilde), 'kilden er kreditert');
// kjente steder (EPSG:25833): 1 = i Norge, 0 = utlandet
const STEDER = [['Oslo', 261873, 6649387, 1], ['Halden', 293384, 6559003, 1], ['Strömstad', 279652, 6539683, 0], ['Nord-Koster', 269612, 6535807, 0], ['Skjærhalden på Hvaler', 272132, 6549051, 1],
  ['Stockholm', 674648, 6580825, 0], ['Göteborg', 319490, 6400461, 0], ['Storlien', 354755, 7024529, 0], ['Meråker', 337801, 7036501, 1], ['Kiruna', 719741, 7536554, 0], ['Narvik', 599632, 7593887, 1],
  ['Riksgränsen', 628370, 7594069, 0], ['Karasjok', 909993, 7742143, 1], ['Karigasniemi', 924508, 7736765, 0], ['Kilpisjärvi', 731145, 7670875, 0], ['Skibotn', 706811, 7706760, 1],
  ['Kirkenes', 1076794, 7807337, 1], ['Nikel', 1092045, 7774236, 0], ['Vardø', 1097833, 7886942, 1], ['Liinakhamari', 1128663, 7810589, 0], ['Longyearbyen', 514358, 8682999, 1],
  ['Bergen', -32254, 6734075, 1], ['Stavanger', -31950, 6573710, 1], ['Tromsø', 653597, 7731822, 1], ['Røros', 314531, 6942870, 1], ['Idre', 380050, 6860689, 0], ['Trysil', 353281, 6800396, 1],
  ['Sälen', 406372, 6781855, 0], ['Kongsvinger', 333666, 6676351, 1], ['Charlottenberg', 348883, 6641128, 0], ['Magnor', 343618, 6649151, 1], ['Utsjoki', 958207, 7801181, 0],
  ['Tana bru', 995246, 7842105, 1], ['Nuorgam', 986211, 7826402, 0], ['Skagen', 237408, 6406088, 0], ['Lindesnes', 30483, 6454171, 1], ['Murmansk', 1215091, 7757437, 0], ['Jan Mayen', -328096, 8039302, 1],
  ['5 km inn i Sverige ved Svinesund (leirvalget 12. nov)', 292000, 6551000, 0], ['Svinesund, norsk side', 285500, 6557500, 1], ['Dombås', 193300, 6896300, 1]];
const galt = STEDER.filter(([, x, y, i]) => RG.iNorge(R, x, y) !== !!i).map(s => s[0]);
ok(galt.length === 0, `${STEDER.length} kjente steder ligger på riktig side av grensa${galt.length ? ' – FEIL: ' + galt.join(', ') : ''}`);
// avstanden nær grensa er nøyaktig: 300 m til hver side for midten av den lengste rette grensestrekningen gir ±300 m
{ const P = R.P; let i = 1, bl = 0; for (let k = 1; k < R.N - 2; k++) { const l = Math.hypot(P[2 * k + 2] - P[2 * k], P[2 * k + 3] - P[2 * k + 1]); if (l > bl) { bl = l; i = k; } }
  const mx = (P[2 * i] + P[2 * i + 2]) / 2, my = (P[2 * i + 1] + P[2 * i + 3]) / 2, dx = P[2 * i + 2] - P[2 * i], dy = P[2 * i + 3] - P[2 * i + 1], l = Math.hypot(dx, dy);
  const v = RG.avstand(R, mx - dy / l * 300, my + dx / l * 300), h = RG.avstand(R, mx + dy / l * 300, my - dx / l * 300);
  ok(Math.abs(v - 300) < .01 && Math.abs(h + 300) < .01, `300 m til venstre/høyre for grensa: ${v.toFixed(0)} / ${h.toFixed(0)} m`); }
// farten: 20 000 oppslag (et rutenett over en kartflis er 33 × 33)
{ const t0 = Date.now(); let n = 0; for (let k = 0; k < 20000; k++) if (RG.iNorge(R, 250000 + (k % 200) * 4000, 6500000 + Math.floor(k / 200) * 13000)) n++;
  ok(Date.now() - t0 < 1500 && n > 2000 && n < 18000, `20 000 oppslag på ${Date.now() - t0} ms (${n} i Norge)`); }
console.log(feil ? feil + ' feil' : 'alle grensetester ok'); process.exit(feil ? 1 : 0);
