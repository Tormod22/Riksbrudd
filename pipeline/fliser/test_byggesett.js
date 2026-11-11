// Test for spill/byggesett.js (fritt byggesett): node pipeline/fliser/test_byggesett.js
const LB = require('../../site/dovre-fliser/spill/leir.js'), BS = require('../../site/dovre-fliser/spill/byggesett.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const O = { ox: 1000, oy: 2000 }, G = BS.G;
let neste = 1; const legg = (deler, liste) => { for (const r of liste) { if (r.feil) continue; if (r.bytt) { const k = deler.findIndex(d => d.id === r.bytt); if (k >= 0) deler.splice(k, 1); } deler.push({ ...r.d, id: neste++ }); } return deler; };

// delene finnes i Leir.BYGG som vanlige bygg (kroner, materialer, tid) og står inntil hverandre uten «for nær»
ok(LB.BYGG.bs_vegg_tre && LB.BYGG.bs_vegg_tre.del && LB.BYGG.bs_tak_sal.mat.tre > 0 && Object.keys(BS.DELER).length >= 18, `${Object.keys(BS.DELER).length} deler i Leir.BYGG`);
let penger = 1e9; const betal = p => (p <= penger ? (penger -= p, true) : false); const L = LB.ny(); for (const k of ['tre', 'betong', 'stål']) LB.kjøpMateriale(L, k, 60, betal);
const m1 = BS.midt(O, { type: 'bs_fundament', i: 0, j: 0 }), m2 = BS.midt(O, { type: 'bs_vegg_tre', a: 'x', i: 0, j: 0 });
const b1 = LB.bygg(L, { type: 'bs_fundament', ...m1 }, betal), b2 = LB.bygg(L, { type: 'bs_vegg_tre', ...m2 }, betal);
ok(b1.bygg && b2.bygg && b2.bygg.igjen === .3 * 60, 'fundament og vegg på kanten bygges som jobber (vegg 18 spillminutter)');
ok(/nær/.test(LB.bygg(L, { type: 'brakke', x: m1.x, y: m1.y }, betal).feil || ''), 'en vanlig brakke oppå delene avvises');

// rutenettet: nærmeste kant, rad og ring
const k = BS.kantVed(O, O.ox + 1.2, O.oy + .2); ok(k.a === 'x' && k.i === 0 && k.j === 0, 'nærmeste kant til et punkt nede i ruta: kanten langs x');
const linje = BS.rad(O, 'bs_vegg_tre', [O.ox + .1, O.oy + .1], [O.ox + 4 * G + .2, O.oy + .3]); ok(linje.length === 4 && linje.every(s => s.a === 'x' && s.j === 0), 'to trykk på en linje: fire vegger på rad');
const ring = BS.rad(O, 'bs_vegg_tre', [O.ox, O.oy], [O.ox + 2 * G, O.oy + 3 * G]); ok(ring.length === 10, 'to hjørner: vegger rundt 2 × 3 ruter (10)');
ok(BS.rad(O, 'bs_fundament', [O.ox + 1, O.oy + 1], [O.ox + 2 * G + 1, O.oy + 1 * G + 1]).length === 6, 'gulv i rektangelet: 3 × 2 ruter');

// støtte: tak og 2. etasje kan ikke sveve
let D = [];
ok(/vegger/.test(BS.plassering(D, 'bs_tak_flatt', { i: 0, j: 0 }).feil || ''), 'tak uten vegger avvises');
ok(/vegg/.test(BS.plassering(D, 'bs_tregulv', { i: 0, j: 0 }, { nivå: 1 }).feil || ''), 'gulv i 2. etasje uten vegger avvises');
legg(D, BS.forslag(D, 'bs_fundament', BS.rad(O, 'bs_fundament', [O.ox + 1, O.oy + 1], [O.ox + 1 + G, O.oy + 1 + 2 * G])));
legg(D, BS.forslag(D, 'bs_vegg_tre', BS.rad(O, 'bs_vegg_tre', [O.ox, O.oy], [O.ox + 2 * G, O.oy + 3 * G])));
ok(D.length === 16 && D.filter(d => d.a).every(d => d.n === 0), '2 × 3 gulv og en ring med vegger i 1. etasje');
ok(BS.rom(D).length === 0, 'uten tak: ikke noe rom');
let r = BS.forslag(D, 'bs_tak_sal', BS.rad(O, 'bs_tak_sal', [O.ox + 1, O.oy + 1], [O.ox + 1 + G, O.oy + 1 + 2 * G]));
ok(r.every(q => !q.feil && q.d.n === 1), 'saltaket legger seg oppå veggene (dekke 1) – også rutene midt i, inntil et nabotak');
legg(D, r); let R = BS.rom(D); ok(R.length === 1 && R[0].ruter === 6 && !R[0].brukbart && R[0].senger === 0, 'lukket rom uten dør: ikke brukbart');
// dør: erstatter veggen i 1. etasje (ikke en ny etasje)
r = BS.forslag(D, 'bs_vegg_tre_dør', [BS.kantVed(O, O.ox + 1.2, O.oy + .1)]); ok(r[0].bytt && r[0].d.n === 0, 'døra erstatter veggen i 1. etasje');
legg(D, r); R = BS.rom(D); ok(R.length === 1 && R[0].brukbart && R[0].dører === 1 && R[0].senger === Math.floor(6 * G * G / 8) && R[0].navn === 'Egenbygd brakke', `rom med dør: ${R[0] && R[0].navn}, ${R[0] && R[0].areal} m², ${R[0] && R[0].senger} senger`);
r = BS.forslag(D, 'bs_vegg_tre_vindu', [BS.kantVed(O, O.ox + .05, O.oy + 1.2)]); ok(r[0].bytt && r[0].d.n === 0, 'vindu erstatter en hel vegg');
// en vegg til: 2. etasje
r = BS.forslag(D, 'bs_vegg_betong', [BS.kantVed(O, O.ox + 2 * G - .05, O.oy + 1.2)]); ok(!r[0].feil && r[0].d.n === 1, 'ny vegg på en kant med vegg: 2. etasje');
ok(/to etasjer/.test(BS.forslag(legg(D.slice(), r), 'bs_vegg_tre', [BS.kantVed(O, O.ox + 2 * G - .05, O.oy + 1.2)])[0].feil || ''), 'tredje vegg oppå hverandre: høyst to etasjer');
// uferdige deler teller ikke i rommet; sengene kommer med i Leir.plasser
ok(BS.rom(D.map(d => ({ ...d, ferdig: d.type !== 'bs_tak_sal' }))).length === 0, 'tak som ikke er ferdig: ikke rom ennå');
// ferdige hus (maler)
const hus = BS.husForslag([], 'hytte', 10, 10, 0); ok(hus.length === 4 + 8 + 4 && hus.every(q => !q.feil), `hytte 2 × 2: ${hus.length} deler, alle får plass`);
const H2 = legg([], hus), Rh = BS.rom(H2); ok(Rh.length === 1 && Rh[0].dører === 1 && Rh[0].vinduer >= 3, `hytta er et rom med ${Rh[0] && Rh[0].dører} dør og ${Rh[0] && Rh[0].vinduer} vinduer`);
ok(BS.husForslag(H2, 'hytte', 10, 10, 0).every(q => q.feil), 'hytte oppå hytta: ingenting får plass');
const brakke = legg([], BS.husForslag([], 'brakke', -5, -5, 1)); ok(BS.rom(brakke)[0].senger === 8, 'brakke 3 × 4 (dreid): 8 senger');
const L2 = LB.ny(); L2.bygg = brakke.map((d, q) => ({ id: q + 1, type: d.type, x: 0, y: 0, ret: 0, igjen: 0, totalt: 1, hp: 1, nivå: 1, bs: { i: d.i, j: d.j, a: d.a, n: d.n, r: d.r } }));
ok(LB.plasser(L2) === 8, 'Leir.plasser teller sengene i de egenbygde brakkene');
// lagring: delene og plassene leses inn igjen
const L3 = LB.fraJSON(LB.tilJSON(L2)); ok(L3 && L3.bygg.length === brakke.length && L3.bygg[0].bs && BS.rom(BS.fraLeir(L3, LB)).length === 1, 'lagret leir med delene leses inn igjen (rommet finnes)');
ok(LB.fraJSON(JSON.stringify({ versjon: 1, bygg: [{ id: 1, type: 'brakke', x: 0, y: 0, igjen: 0 }] })).bygg.length === 1, 'gamle leirer (versjon 1) lastes fortsatt');

// høyder: alt i huset på samme grunnhøyde (høyeste terreng + sokkel), sokkelen ned til laveste terreng, ingen del svever
const h = (x, y) => (x - O.ox) * .2;   // skrått: 20 % stigning mot øst
const Hz = BS.høyder(O, D, h), z0 = [...Hz.values()].map(v => v.z0), maksT = 2 * G * .2;
ok(Math.max(...z0) - Math.min(...z0) < 1e-9 && Math.abs(z0[0] - (maksT + BS.SOKKEL)) < 1e-9, `samme grunnhøyde for hele huset (${z0[0].toFixed(2)} m, terrenget 0–${maksT.toFixed(2)} m)`);
const nede = D.filter(d => d.n === 0), flyter = nede.filter(d => { const v = Hz.get(d.id); const pkt = BS.KANT(d) ? BS.kantEnder(O, d) : [[O.ox + d.i * G, 0], [O.ox + (d.i + 1) * G, 0]]; return pkt.some(([x]) => v.ned > h(x, 0)); });
ok(flyter.length === 0, 'sokkelen går ned under terrenget for alle deler på bakken');
const flate = [{ id: 'a', type: 'bs_fundament', i: 0, j: 0, n: 0 }, { id: 'b', type: 'bs_fundament', i: 1, j: 0, n: 0 }, { id: 'c', type: 'bs_tak_flatt', i: 5, j: 0, n: 1 }], Hf = BS.høyder(O, flate, h);
ok(Hf.get('a').z0 === Hf.get('b').z0, 'to gulv inntil hverandre (uten vegger) får samme høyde');
const pal = [{ id: 'p', type: 'bs_palisade', a: 'x', i: 3, j: 0, n: 0 }], Hp = BS.høyder(O, pal, h).get('p'); ok(Math.abs(Hp.ender[1] - Hp.ender[0] - G * .2) < 1e-9, 'palisaden følger terrenget');
// forsvar: på bakken, en vegg kan ikke stå i samme kant
ok(/vegg/.test(BS.plassering(D, 'bs_palisade', BS.kantVed(O, O.ox + 1.2, O.oy + .1)).feil || ''), 'palisade der det står en vegg avvises');
console.log(feil ? `${feil} FEIL` : 'alt ok'); process.exit(feil ? 1 : 0);
