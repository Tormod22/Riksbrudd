// Test av spill/anleggsarbeid.js (regler uten DOM): kostnad, krav til terrenget, terrenginngrep, vern, tunnel som lenke, lagring.
const A = require('../../site/dovre-fliser/spill/anleggsarbeid.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL:', t); } else console.log('ok  ', t); };

// tabellen: alle anlegg har det visningen trenger
for (const [id, a] of Object.entries(A.ANLEGG)) ok(a.navn && ['linje', 'punkt', 'topunkt'].includes(a.form) && ['tørt', 'strand', 'fjellside'].includes(a.krav) && a.modell && typeof a.pris === 'function' && typeof a.tid === 'function' && typeof a.mat === 'function' && a.vern > 0 && a.vern <= 1, `tabellraden ${id} er hel`);

// kostnad etter lengden
const k1 = A.kostnad('skyttergrav', [[0, 0], [20, 0]]), k2 = A.kostnad('skyttergrav', [[0, 0], [40, 0]]);
ok(k2.kr > k1.kr && k2.timer === 2 * k1.timer && k1.lengde === 20, 'lengre grav koster mer og tar dobbelt så lang tid');
const t1 = A.kostnad('tunnel', [[0, 0], [200, 0]]), t2 = A.kostnad('tunnel', [[0, 0], [1000, 0]]);
ok(t2.kr > t1.kr * 2.5 && t2.timer > t1.timer * 3, 'tunnelen: pris og tid etter lengden');
const opp = A.kostnad('kai', [[0, 0]], 2, 1); ok(opp.kr === 4000000 && opp.timer === 550, 'oppgradering av kaia koster forskjellen');

// terreng: et fjell midt i (x 100–300), vann for x < -10, land ellers
const høyde = (x, y) => (x < -10 ? 0 : 10 + Math.max(0, 80 - Math.abs(x - 200) * .8));
const T = { høyde, vann: (x, y) => x < -10, iHus: (x, y) => x > 500 && x < 510 };
ok(A.kanPlassere('skyttergrav', [[0, 0], [30, 0]], T).ok, 'skyttergrav på tørt land');
ok(A.kanPlassere('skyttergrav', [[-30, 0], [30, 0]], T).feil, 'skyttergrav i vann avvises');
ok(A.kanPlassere('skyttergrav', [[495, 0], [520, 0]], T).feil, 'skyttergrav gjennom et hus avvises');
ok(A.kanPlassere('skyttergrav', [[0, 0], [2, 0]], T).feil, 'for kort grav avvises');
ok(A.kanPlassere('bunker', [[30, 0]], T).ok, 'bunker på tørt land');
ok(A.kanPlassere('bunker', [[-8, 0]], T).feil, 'bunker i strandkanten (hjørne i vann) avvises');
const kai = A.kanPlassere('kai', [[0, 0]], T);
ok(kai.ok && Math.abs(Math.abs(kai.ret) - Math.PI) < .3, 'kai i strandkanten, retning mot sjøen (vest)');
ok(A.kanPlassere('kai', [[60, 0]], T).feil, 'kai langt fra vann avvises');
const tun = A.kanPlassere('tunnel', [[120, 0], [280, 0]], T);
ok(tun.ok, 'tunnel gjennom fjellet godtas ' + JSON.stringify(tun));
ok(A.kanPlassere('tunnel', [[0, 0], [90, 0]], T).feil, 'tunnel på flatmark avvises');
ok(A.kanPlassere('tunnel', [[150, 0], [170, 0]], T).feil, 'for kort tunnel avvises');

// terrenginngrep: halvferdig grav er halvt så dyp, ferdig grav gir hele dybden, skråning ut
const g = A.nytt('skyttergrav', [[0, 0], [30, 0]]);
ok(A.inngrep(g).length === 0, 'ingen inngrep før arbeidet starter');
A.steg(g, g.behov / 2, 1); let I = A.inngrep(g);
ok(Math.abs(A.endringVed(I, 10, 0) + .75) < 1e-6, 'halvferdig grav er 0,75 m dyp');
ok(A.steg(g, 1000, 10) === 'ferdig' && g.ferdig, 'graven blir ferdig');
I = A.inngrep(g);
ok(Math.abs(A.endringVed(I, 10, 0) + 1.5) < 1e-6 && Math.abs(A.endringVed(I, 10, .5) + 1.5) < 1e-6, 'ferdig grav 1,5 m dyp i hele bredden');
const s1 = A.endringVed(I, 10, 1.35); ok(s1 < 0 && s1 > -1.5, 'skråningen ut fra kanten');
ok(A.endringVed(I, 10, 3) === 0 && A.endringVed(I, 60, 0) === 0, 'bakken er urørt utenfor');
const b = A.nytt('bunker', [[50, 50]], { ret: Math.PI / 4 }); b.ferdig = true;
const Ib = A.inngrep(b); ok(Math.abs(A.endringVed(Ib, 50, 50) + 1.3) < 1e-6 && A.endringVed(Ib, 60, 60) === 0, 'bunkergropa');
const krav = A.terrengKrav(I, (x, y) => 100, 1); ok(krav.length % 3 === 0 && krav.length / 3 >= 31 * 5 && krav.every((v, i) => i % 3 !== 2 || v === 98.5), 'kravene til 3D-terrenget: bunnen 1,5 m under bakken');
ok(A.inngrep(A.nytt('tunnel', [[0, 0], [100, 0]])).length === 0, 'tunnelen graver ikke i terrenget ennå');

// vern og plass
ok(A.iAnlegg([g], 10, 1) === g && A.iAnlegg([g], 10, 9) === null, 'laget er i graven bare nær linja');
const lag = [{ x: 5, y: 0 }, { x: 15, y: 0 }, { x: 25, y: 0 }];
const f = A.fordel([g], lag); ok(f.size === A.plasser(g) && A.plasser(g) === 1, 'graven på 30 m har plass til ett lag');
ok(A.vern(f.get(lag[0])) === A.ANLEGG.skyttergrav.vern, 'vernet fra graven');
const fb = A.fordel([b], [{ x: 51, y: 51 }, { x: 52, y: 50 }]); ok(fb.size === 1, 'bunkeren har plass til ett lag');
const uf = A.nytt('bunker', [[0, 0]]); ok(A.iAnlegg([uf], 0, 0) === null, 'uferdig bunker gir ikke vern');

// arbeidskraft: folk + ingeniører nær nok
ok(A.arbeidskraft(g, 4, [{ x: 10, y: 0, menn: 6 }, { x: 5000, y: 0, menn: 6 }]) === 4 + 18, 'arbeidskraft: folk og ingeniørlag nær nok');
ok(A.igjen(A.nytt('bunker', [[0, 0]]), 0) === Infinity, 'uten arbeidere blir det aldri ferdig');

// tunnelen som lenke i ruta
const tu = A.nytt('tunnel', [[100, 0], [300, 0]]); tu.ferdig = true;
const v = A.viaTunnel([tu], 0, 0, 400, 0); ok(!v, 'rett vei langs tunnelen: ingen omvei');
const v2 = A.viaTunnel([tu], 100, -300, 300, -300); ok(!v2, 'tunnelen lønner seg ikke når rett vei er kort');
const tu2 = A.nytt('tunnel', [[0, 0], [0, 1000]]); tu2.ferdig = true;
const v3 = A.viaTunnel([tu2], 20, -50, 20, 1050); ok(!v3, 'rett vei er kortest i luftlinje');
// over fjellet (høyde() over: 90 m opp og ned mellom x 100 og 300) er tunnelen kortere
const tu3 = A.nytt('tunnel', [[110, 0], [290, 0]]); tu3.ferdig = true;
ok(A.marsjKost(høyde, 50, 0, 350, 0) > 300 + 70 * 8, 'marsjen over fjellet koster stigningen');
const v4 = A.viaTunnel([tu3], 50, 0, 350, 0, høyde); ok(v4 && v4.a === tu3 && v4.inn === 0, 'gjennom tunnelen når fjellet er i veien');
ok(!A.viaTunnel([tu3], 50, 0, 350, 0), 'uten høyder: rett vei');
ok(!A.viaTunnel([tu3], 50, 0, 60, 0, høyde), 'kort tur på samme side: ingen tunnel');
ok(Math.abs(A.reiseMin(tu2, false) - 1000 / 1.3 / 60) < 1e-9 && A.reiseMin(tu2, true) < A.reiseMin(tu2, false), 'reisetiden gjennom tunnelen');

// lagring
const J = A.tilJSON([g, b, tu]), L2 = A.fraJSON(JSON.parse(JSON.stringify(J)));
ok(L2.length === 3 && L2[0].ferdig && L2[1].type === 'bunker' && Math.abs(L2[1].ret - Math.PI / 4) < 1e-3, 'lagres og leses');
ok(A.fraJSON([{ type: 'ukjent', P: [[0, 0]] }, null, { type: 'bunker', P: 'x' }]).length === 0, 'ødelagte rader hoppes over');
const ny = A.nytt('bunker', [[0, 0]]); ok(!L2.some(a => a.id === ny.id), 'nye id-er kolliderer ikke med de lagrede');

console.log(feil ? `${feil} FEIL` : 'alle testene gikk');
process.exit(feil ? 1 : 0);
