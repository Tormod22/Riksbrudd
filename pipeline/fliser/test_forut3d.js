// Test av spill/forut3d.js (hvor og når neste 3D-utsnitt bestilles, ut fra farten). Kjør: node pipeline/fliser/test_forut3d.js
const F3 = require('../../site/dovre-fliser/spill/forut3d.js'), assert = require('assert');
let n = 0; const ok = (b, t) => { assert(b, t); n++; };
// jevn flyging østover i 45 m/s, ett bilde hvert 0,1 s
const F = F3.ny(); let x = 1000, y = 0; for (let k = 0; k < 60; k++) { F3.steg(F, x, y, .1, 2000); x += 4.5; }
ok(Math.abs(F3.fart(F) - 45) < 1, 'farten ' + F3.fart(F)); ok(Math.abs(F.vy) < .01, 'ingen fart nordover');
// byggetiden: første måling tas som den er, så glidende snitt
F3.byggTid(F, 30); ok(F.tid === 30, 'første byggetid'); F3.byggTid(F, 10); ok(F.tid === 20, 'snitt ' + F.tid); F3.byggTid(F, 999); ok(F.tid <= F3.REGLER.tidMax, 'tak');
F.tid = 20;
// utsnittet rundt 0,0 med halvside 2000: du er 1270 m øst – om 20 s er du 2170 m unna (> 45 %) => bestill nå, foran deg
const p = F3.plan(F, { cx: 0, cy: 0, S: 2000 }, 2000);
ok(p && p.cx > x, 'nytt utsnitt foran deg: ' + JSON.stringify(p)); ok(p.cx - x <= .85 * 2000 + 1, 'høyst 85 % av halvsida foran');
ok(Math.abs(p.cy) < 5, 'i fartsretningen');
// den gamle regelen ville ventet til 900 m fra midten; den nye bestiller tidligere (allerede ved 100 m)
const G = F3.ny(); G.tid = 20; for (let k = 0, xx = 0; k < 40; k++, xx += 4.5) F3.steg(G, xx + 100, 0, .1, 2000);
ok(F3.plan(G, { cx: 0, cy: 0, S: 2000 }, 2000), 'bestilt lenge før 45 %');
// sakte (gange 3 m/s): ingen plan, den gamle regelen gjelder
const H = F3.ny(); for (let k = 0; k < 40; k++) F3.steg(H, k * .3, 0, .1, 2000); ok(!F3.plan(H, { cx: 0, cy: 0, S: 2000 }, 2000), 'ingen plan når du går');
// står ved midten og flyr sakte nok til at du er inne når det er ferdig: ingen plan
const I = F3.ny(); I.tid = 5; for (let k = 0; k < 40; k++) F3.steg(I, k * 1, 0, .1, 2000); ok(!F3.plan(I, { cx: 0, cy: 0, S: 2000 }, 2000), 'ingen plan når du er inne om byggetiden');
// hopp (teleport): farten nullstilles
F3.steg(F, x + 50000, 0, .1, 2000); ok(F3.fart(F) === 0, 'hopp nullstiller');
// forhenting: punktet foran deg, ikke to ganger rett etter hverandre
const J = F3.ny(); J.tid = 10; for (let k = 0; k < 40; k++) F3.steg(J, k * 3, 0, .1, 2000);
const f1 = F3.forhentPunkt(J, 2000, 100); ok(f1 && f1[0] > 117, 'forhent foran: ' + f1); ok(!F3.forhentPunkt(J, 2000, 100.5), 'ikke igjen straks');
ok(f1[0] - 117 <= 2.2 * 2000 + 1, 'høyst 2,2 × S foran');
// ledd: fjernkartets forskyvning i fartsretningen
const l = F3.ledd(J, 2000); ok(l[0] > 0 && Math.abs(l[1]) < 1e-6, 'ledd ' + l);
console.log(`test_forut3d: ${n} sjekker OK`);
