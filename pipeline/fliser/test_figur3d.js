// Test for spill/figur3d.js (reglene for figurene i 3D: fargepakking, armene på geværet, stillingen): node pipeline/fliser/test_figur3d.js
const F = require('../../site/dovre-fliser/spill/figur3d.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const avst = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), R = F.REGLER;

// fargene pakkes i ett tall og kommer ut igjen likt (8 bit per farge)
for (const c of [[0, 0, 0], [1, 1, 1], [.2, .5, 1], [.79, .63, .5], [.33, .01, .99]]) { const u = F.pakkUt(F.pakk(c)); ok(c.every((v, i) => Math.abs(v - u[i]) < 1 / 255), 'pakk/pakkUt ' + c.join(',') + ' -> ' + u.map(v => v.toFixed(3)).join(',')); }
ok(F.pakk([1, 1, 1]) < 2 ** 24, 'en pakket farge er under 2^24 (nøyaktig i et 32-bits flyttall i skyggeleggeren)');
ok(F.pakk([2, -1, .5]) === F.pakk([1, 0, .5]), 'farger utenfor 0–1 klippes');

// to ledd: hånda havner der den skal når målet er innen rekkevidde, og strekkes mot målet ellers
const S = [0, R.skulderY, R.skulderZ];
for (const T of [[.3, 0, 1.2], [.2, .3, 1.0], [.4, -.1, 1.4], [0, R.skulderY, R.skulderZ - .5]]) { const v = F.ik(S, T); ok(avst(F.hånd(S, v), T) < 1e-6, 'ik når ' + T.join(',') + ' (feil ' + avst(F.hånd(S, v), T).toExponential(1) + ')'); }
{ const T = [1.5, 0, 1.42], v = F.ik(S, T), h = F.hånd(S, v); ok(avst(h, S) > .55 && h[0] > .5, 'for langt unna: armen strekkes rett mot målet'); }

// geværet: begge hendene på våpenet både lavt og ved skulderen
for (const navn of ['lav', 'opp']) { const st = R[navn], [v, h] = F.armer(st), sv = [0, R.skulderY, R.skulderZ], sh = [0, -R.skulderY, R.skulderZ];
  ok(avst(F.hånd(sh, h), st.G) < .01, navn + ': høyre hånd på grepet');
  ok(avst(F.hånd(sv, v), F.påVåpen(R.forskjefte, st)) < .01, navn + ': venstre hånd på forskjeftet');
  ok(v.concat(h).every(Number.isFinite), navn + ': vinklene er tall'); }
// løpet peker framover når laget sikter, og ned/til venstre på marsj
{ const a = F.påVåpen([0, 0, 0], R.opp), b = F.påVåpen([.5, 0, 0], R.opp); ok(b[0] - a[0] > .49 && Math.abs(b[2] - a[2]) < .01, 'sikter: løpet vannrett framover'); }
{ const a = F.påVåpen([0, 0, 0], R.lav), b = F.påVåpen([.5, 0, 0], R.lav); ok(b[2] < a[2] && b[1] > a[1], 'på marsj: løpet ned og over kroppen'); }

// stillingen for soldatene
ok(JSON.stringify(F.holdning(true, false, false)) === JSON.stringify({ sving: 1, sikte: 0, kne: 0 }), 'på marsj: går, våpenet lavt');
ok(F.holdning(false, true, false).sikte === 1 && F.holdning(true, true, false).sikte === 1, 'i ildkamp: sikter');
ok(F.holdning(false, false, false).sikte === .45 && F.holdning(false, false, false).sving === 0, 'står klar');
ok(F.holdning(true, false, true).kne === 1 && F.holdning(true, false, true).sving === 0, 'såret: kneler og går ikke');

// delene er hver sin bit, og leddene og kanalene er forskjellige tall
const bits = Object.values(F.DEL); ok(bits.every(b => (b & (b - 1)) === 0) && new Set(bits).size === bits.length, 'delene er egne biter: ' + bits.join(','));
ok(new Set(Object.values(F.LEDD)).size === Object.keys(F.LEDD).length && new Set(Object.values(F.KANAL)).size === Object.keys(F.KANAL).length, 'ledd og kanaler er unike');

console.log(feil ? `\n${feil} FEIL` : '\nAlt ok'); process.exit(feil ? 1 : 0);
