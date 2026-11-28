// Test av de nye møbeltypene i spill/interior.js (ut9-mobler). Kjør: node pipeline/fliser/test_moblertyper.js
// (at alle rom fortsatt kan nås, og at ingen møbler står i vegger/døråpninger, prøver test_interior.js)
const I = require('../../site/dovre-fliser/spill/interior.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL:', t); } };
const NYE = ['hjørnesofa', 'peis', 'vitrineskap', 'gyngestol', 'piano', 'skjenk', 'overskap', 'kjøkkenøy', 'vifte', 'oppvaskmaskin', 'krydderhylle', 'barneseng', 'kommode',
  'garderobe', 'sminkebord', 'badekar', 'vaskemaskin', 'speilskap', 'skoskap', 'permreol', 'vannkjøler', 'safe', 'gondol', 'frysedisk', 'drikkekjøler', 'vognrekke', 'stålreol',
  'verktøyvegg', 'verkstedbenk', 'luftkompressor', 'dekkstativ'];
for (const n of NYE) ok(I.MØBLER[n] && I.MØBLER[n].length === 4, 'mangler mål: ' + n);
const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], teller = {}, rom = {};
let bygg = 0;
for (const kl of ['hus', 'leil', 'hytte', 'kontor', 'butikk', 'lager', 'industri', 'uthus', 'sykehus', 'skole']) for (let k = 0; k < 30; k++) {
  const stor = /butikk|lager|industri|sykehus|skole/.test(kl), w = (stor ? 14 : 6) + (k * 2.9) % (stor ? 30 : 9), h = (stor ? 10 : 5) + (k * 1.7) % (stor ? 16 : 6), P = rekt(w, h);
  const pl = I.plan(P, { i: 3000 + k * 37 + kl.length * 1001, kl, h: 6, dør: { x: w * .4, y: 0, ux: 1, uy: 0, w: kl === 'uthus' ? 2.6 : 1.1 } }); bygg++;
  for (const m of pl.møbler) { teller[m.type] = (teller[m.type] || 0) + 1; (rom[m.type] = rom[m.type] || new Set()).add(pl.rom.find(r => { const a = pl.akse, u = m.x * a.ux + m.y * a.uy, v = m.x * a.vx + m.y * a.vy; return u >= r.u0 - .01 && u <= r.u1 + .01 && v >= r.v0 - .01 && v <= r.v1 + .01; })?.rolle);
    // veggskapene sperrer aldri (de henger over gulvet)
    if (I.VEGGHENGT[m.type]) ok(!m.sperrer, m.type + ' sperrer');
  }
}
const brukt = NYE.filter(n => teller[n] > 0);
ok(brukt.length >= 25, 'nye møbeltyper i bruk: ' + brukt.length + ' av ' + NYE.length + ' (mangler: ' + NYE.filter(n => !teller[n]).join(', ') + ')');
// riktig rom: overskapet og vifta på kjøkkenet, badekaret på badet, gondolene i butikken
ok([...(rom.overskap || [])].every(r => /kjøkken|allrom|pauserom|storkjøkken/.test(r)), 'overskap utenfor kjøkkenet: ' + [...(rom.overskap || [])]);
ok([...(rom.badekar || [])].every(r => r === 'bad'), 'badekar utenfor badet');
ok([...(rom.gondol || [])].every(r => r === 'butikk'), 'gondol utenfor butikken');
// samme bygg gir samme plan (også med de nye møblene)
{ const P = rekt(11, 8), a = I.plan(P, { i: 77, kl: 'hus', h: 6, dør: { x: 4, y: 0, ux: 1, uy: 0, w: 1.1 } }), b = I.plan(P, { i: 77, kl: 'hus', h: 6, dør: { x: 4, y: 0, ux: 1, uy: 0, w: 1.1 } });
  ok(JSON.stringify(a.møbler) === JSON.stringify(b.møbler), 'samme bygg, samme møbler'); }
if (feil) { console.log(feil + ' feil'); process.exit(1); } else console.log('alle møbeltypetestene ok (' + bygg + ' bygg, ' + brukt.length + ' nye typer i bruk)');
