// S5 del 3: dam og flom. Kjør fra repo-roten: node pipeline/fliser/test_flom.js
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const Fl = require('../../site/dovre-fliser/spill/flom'), R = Fl.REGLER;
// en dal som faller mot sør (2 m per celle à 32 m), V-formet på tvers, med et magasin (høyt platå) nord for dammen og et søkk i dalbunnen
const w = 400, h = 700, r = 32, v = { x0: 0, y0: h * r, r, w, h, H: new Float32Array(w * h) };
for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) v.H[j * w + i] = 1200 - j * 2 + Math.abs(i - 200) * 1.5 + (j < 100 ? 60 : 0) + (j >= 300 && j < 303 && Math.abs(i - 200) < 3 ? -4 : 0);
// en annen dal øst for en rygg (lavere, men ikke sammenhengende med flomvannet)
for (let j = 0; j < h; j++) for (let i = 320; i < w; i++) v.H[j * w + i] = 1100 - j * 2 + Math.abs(i - 360) * 1.5 + (i < 330 ? 400 : 0);
const damX = 200 * r + 16, damY = (h - 100) * r;
const sti = Fl.flomvei(v, damX, damY);
assert(sti.length > 200, 'flomveien går langt nedover: ' + sti.length);
assert(sti.every(([i]) => Math.abs(i - 200) <= 2), 'følger dalbunnen');
assert(sti[sti.length - 1][1] > 100 + (R.lengde / r) * .8, 'over søkket og nesten 15 km nedover');
const { maske, antall } = Fl.flomfelt(v, sti); const felt = { ...v, maske };
assert(antall > 1000, 'antall celler: ' + antall);
const y = j => v.y0 - (j + .5) * r, x = i => (i + .5) * r;
assert(Fl.iFlom(felt, x(200), y(150)) && Fl.iFlom(felt, x(205), y(150)), 'dalbunnen nedenfor dammen');
assert(!Fl.iFlom(felt, x(200), y(50)), 'ikke magasinet ovenfor'); assert(!Fl.iFlom(felt, x(240), y(150)), 'ikke dalsiden 40 m opp');
assert(!Fl.iFlom(felt, x(360), y(150)), 'ikke dalen bak ryggen'); assert(!Fl.iFlom(felt, x(200), y(690)), 'ikke lenger enn 15 km');
// bredere nær dammen (15 m) enn nederst (3 m)
const bredde = j => { let n = 0; for (let i = 0; i < w; i++) n += maske[j * w + i]; return n; };
assert(bredde(120) > bredde(100 + Math.floor(R.lengde / r) - 10), `bredde øverst ${bredde(120)} > nederst ${bredde(100 + Math.floor(R.lengde / r) - 10)}`);
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/flom.js'), 'utf8'), k); assert.equal(typeof k.Flom.flomvei, 'function'); }
console.log(`ok – flomveien følger dalen ${Math.round((sti[sti.length - 1][1] - sti[0][1]) * r / 1000)} km over et søkk, flomfeltet ${antall} celler, ikke magasinet, dalsidene eller dalen bak ryggen`);
