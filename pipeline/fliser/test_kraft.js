// Test av kraftledningsreglene (site/dovre-fliser/spill/kraft.js) og dataene (data/kraft.json): node pipeline/fliser/test_kraft.js
const path = require('path'), fs = require('fs');
const K = require(path.join(__dirname, '../../site/dovre-fliser/spill/kraft.js'));
let feil = 0;
const sjekk = (navn, ok, info = '') => { if (!ok) feil++; console.log(`${ok ? 'ok  ' : 'FEIL'} ${navn} ${info}`); };

sjekk('masttype etter spenning', K.type(420) === 'portal' && K.type(300) === 'portal' && K.type(132) === 'stål' && K.type(66) === 'h66' && K.type(22) === 'h22');
// nedheng: 350 m spenn på 300 kV ca. 8–14 m, 90 m på 22 kV ca. 1–3 m
const d300 = K.nedheng(350, 'portal'), d22 = K.nedheng(90, 'h22');
sjekk('nedheng', d300 > 8 && d300 < 14 && d22 > 1 && d22 < 3, `${d300.toFixed(1)} m / ${d22.toFixed(1)} m`);
const A = [0, 0, 20], B = [300, 0, 30], d = 8, midt = K.linPunkt(A, B, .5, d);
sjekk('lina henger lavest i midten (lik høyde)', Math.abs(K.linPunkt([0, 0, 20], [300, 0, 20], .5, d)[2] - 12) < 1e-9 && K.linPunkt(A, B, 0, d)[2] === 20 && K.linPunkt(A, B, 1, d)[2] === 30, midt.map(v => v.toFixed(1)).join(','));
// retning: rett linje mot øst = 0, i hjørnet 90° -> 45°
sjekk('retning i masta', Math.abs(K.retning([0, 0, 100, 0, 200, 0], 1)) < 1e-9 && Math.abs(K.retning([0, 0, 100, 0, 100, 100], 1) - Math.PI / 4) < 1e-9);
// feste: fasen 11 m til venstre for en linje mot øst ligger på +y
const f = K.feste({ x: 0, y: 0, z: 5, a: 0 }, [-11, 21.5]);
sjekk('festepunkt tverrs', Math.abs(f[1] + 11) < 1e-9 && Math.abs(f[0]) < 1e-9 && f[2] === 26.5, f.join(','));
// ryddebeltet
const iB = K.belte([{ ax: 0, ay: 0, bx: 400, by: 0, b: 15 }]);
sjekk('ryddebelte ±15 m', iB(200, 14) && iB(200, -14) && !iB(200, 16) && !iB(-20, 0) && iB(399, 3));
// utsnitt: master utenfor kuttes, spenn bare mellom master som begge er inne
const u = K.utsnitt([{ kv: 300, m: [-2000, 0, -500, 0, 0, 0, 500, 0, 2000, 0], e: '11111' }], 0, 0, 1000, () => 100);
sjekk('utsnitt', u.master.length === 3 && u.spenn.length === 2 && u.master.every(m => m.z === 100 && m.t === 'portal'), `${u.master.length} master, ${u.spenn.length} spenn`);

// dataene
const fil = path.join(__dirname, '../../site/dovre-fliser/data/kraft.json');
const D = JSON.parse(fs.readFileSync(fil, 'utf8'));
const typer = new Set(D.linjer.map(l => K.type(l.kv)));
sjekk('kraft.json: alle fire masttyper', ['portal', 'stål', 'h66', 'h22'].every(t => typer.has(t)), [...typer].join(','));
sjekk('kraft.json: under 1 MB', fs.statSync(fil).size < 1 << 20, `${(fs.statSync(fil).size / 1024).toFixed(0)} KB`);
let lengst = 0; for (const l of D.linjer) for (let i = 2; i < l.m.length; i += 2) lengst = Math.max(lengst, Math.hypot(l.m[i] - l.m[i - 2], l.m[i + 1] - l.m[i - 1]));
sjekk('kraft.json: ingen urimelig lange spenn', lengst < 900, `lengste ${lengst.toFixed(0)} m`);
console.log(feil ? `${feil} FEIL` : 'alt ok'); process.exit(feil ? 1 : 0);
