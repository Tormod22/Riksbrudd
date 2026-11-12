// Test av reglene for vegene i 3D (site/dovre-fliser/spill/veg.js). Kjør: node pipeline/fliser/test_veg.js
const V = require('../../site/dovre-fliser/spill/veg.js');
const fs = require('fs'), path = require('path');
let feil = 0; const sjekk = (ok, tekst) => { console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); if (!ok) feil++; };

// klipp: en veg over to fliser gir én bit i hver, og de møtes i flisgrensen
const veg = [[-30, 5], [40, 5], [40, 80]];
const a = V.klipp(veg, -100, 0, 0, 100), b = V.klipp(veg, 0, 0, 100, 100);
sjekk(a.length === 1 && b.length === 1 && Math.abs(a[0][a[0].length - 1][0]) < 1e-9 && Math.abs(b[0][0][0]) < 1e-9, 'klipp: vegen deles i flisgrensen');
sjekk(V.klipp([[-50, -50], [-10, -50]], 0, 0, 100, 100).length === 0, 'klipp: en veg utenfor flisen gir ingenting');

// skjøt: to biter av samme veg blir én; et kryss (tre ender) skjøtes ikke; gangveg og bilveg holdes fra hverandre
const s1 = V.skjøt([{ k: 'E', g: 0, t: 0, P: a[0] }, { k: 'E', g: 0, t: 0, P: b[0].slice().reverse() }]);
sjekk(s1.length === 1 && Math.abs(V.lengde(s1[0].P) - V.lengde(veg)) < 1e-6, `skjøt: to biter blir én hel veg (${V.lengde(s1[0].P).toFixed(1)} m)`);
const s2 = V.skjøt([{ k: 'E', g: 0, t: 0, P: [[0, 0], [50, 0]] }, { k: 'E', g: 0, t: 0, P: [[50, 0], [100, 0]] }, { k: 'K', g: 0, t: 0, P: [[50, 0], [50, 60]] }]);
sjekk(s2.length === 3, 'skjøt: tre ender i ett punkt er et kryss og skjøtes ikke');
const s3 = V.skjøt([{ k: 'E', g: 0, t: 0, P: [[0, 0], [50, 0]] }, { k: 'E', g: 0, t: 0, P: [[50, 0], [100, 0]] }, { k: 'E', g: 1, t: 0, P: [[50, 0], [50, 60]] }]);
sjekk(s3.length === 2 && s3.some(v => !v.g && Math.abs(V.lengde(v.P) - 100) < 1e-6), 'skjøt: en gangveg som ender i vegen deler ikke bilvegen');

// bredder
sjekk(V.halv({ k: 'E' }) === 4 && V.halv({ k: 'E', g: 1 }) === 1.5 && V.halv({ k: 'E', t: 1 }) < 4 && !V.vanlig({ k: 'E', g: 1 }) && V.vanlig({ k: 'K' }), 'gang- og sykkelveg er 3 m bred og ikke en vanlig veg');

// tunnel: biten av vegen som følger tunnelløpet tas bort, vegen som krysser over står
const rett = V.jevn([[0, 0], [400, 0]]), tun = [V.tunnel([[100, 2], [300, 2]])];
const ut = V.utenTunnel(rett, tun);
sjekk(ut.length === 2 && ut[0].kutt[1] && ut[1].kutt[0] && Math.abs(ut[0].P[ut[0].P.length - 1][0] - 100) < 4 && Math.abs(ut[1].P[0][0] - 300) < 4, `tunnel: vegen kuttes ved portalene (${ut.map(t => t.P[0][0].toFixed(0) + '–' + t.P[t.P.length - 1][0].toFixed(0)).join(', ')})`);
const tvers = V.utenTunnel(V.jevn([[200, -100], [200, 100]]), tun);
sjekk(tvers.length === 1 && !tvers[0].kutt[0] && !tvers[0].kutt[1], 'tunnel: en veg som krysser over tunnelen står');
sjekk(V.utenTunnel(rett, []).length === 1, 'uten tunneler: hele vegen');

// høyder: flat på tvers og aldri under bakken (skråning på tvers av vegen)
const skrå = (x, y) => y * .3, h = V.høyder(rett, 4, skrå);
sjekk(h.every(z => z >= 4 * .3 - 1e-9), `høyder: vegbanen ligger i høyden til overkanten av skråningen (${h[10].toFixed(2)} m)`);

// kryss: T-kryss gir ett kryss; flaten holder seg innenfor armene (før: konvekst skall = store flak)
const z0 = P => P.map(([x, y]) => [x, y, 0]);
const veger = [{ k: 'E', P: z0(V.jevn([[-100, 0], [0, 0]])) }, { k: 'E', P: z0(V.jevn([[0, 0], [100, 0]])) }, { k: 'K', P: z0(V.jevn([[0, 0], [60, 60]])) }];
const kryss = V.finnKryss(veger);
sjekk(kryss.length === 1 && kryss[0].armer.length === 3, 'kryss: tre armer i ett punkt');
const fl = { pos: [], uv: [], idx: [] }; V.kryssFlate(kryss[0], veger, fl);
let maks = 0, utenfor = 0; for (let q = 0; q < fl.pos.length; q += 3) { const x = fl.pos[q], y = fl.pos[q + 1]; maks = Math.max(maks, Math.hypot(x, y));
  const dE = Math.abs(y), dK = Math.abs(x - y) / Math.SQRT2; if (Math.min(dE, dK) > 4.2 + 2.6) utenfor++; }
sjekk(fl.idx.length > 0 && maks < kryss[0].d + 6 && utenfor === 0, `kryssflaten følger armene (lengst ${maks.toFixed(1)} m fra midten, ${utenfor} punkter utenfor vegene)`);
// selvtest: det gamle konvekse skallet hadde punkter langt fra begge vegene – kontrollen over ville slått ut på (20, 12)
sjekk(Math.min(Math.abs(12), Math.abs(20 - 12) / Math.SQRT2) > 4.2, 'selvtest: et punkt i det gamle skallet ligger utenfor vegene');

// fotgjengerfelt: striper, og aldri to felt nærmere hverandre enn 30 m
const st = { pos: [], idx: [] }; V.striper(0, 0, 1, 0, 8, 3, 0, st);
sjekk(st.idx.length === 8 * 6, 'fotgjengerfelt over 8 m veg: åtte striper');
const tett = [{ k: 'K', by: true, P: z0(V.jevn([[-60, 0], [0, 0]])) }, { k: 'K', by: true, P: z0(V.jevn([[0, 0], [12, 0]])) }, { k: 'K', by: true, P: z0(V.jevn([[0, 0], [0, 60]])) },
  { k: 'K', by: true, P: z0(V.jevn([[12, 0], [60, 0]])) }, { k: 'K', by: true, P: z0(V.jevn([[12, 0], [12, 60]])) }];
const gf = V.gangfelt(V.finnKryss(tett));
sjekk(gf.length >= 1 && gf.every((f, i) => gf.every((g, j) => i === j || Math.hypot(f.x - g.x, f.y - g.y) >= 30)), `fotgjengerfelt: ${gf.length} felt ved to kryss tett i tett, ingen nærmere enn 30 m`);

// gatelys: aldri i en annen vegbane eller på gangvegen ved siden av
const hoved = { k: 'E', by: true, w: 4, P: z0(V.jevn([[0, 0], [300, 0]])) }, gs = { k: 'E', g: 1, by: true, w: 1.5, P: z0(V.jevn([[0, 6.2], [300, 6.2]])) };
const alle = [hoved, gs], ru = V.rute(alle), L = V.lykter([hoved], { ru, nr: v => alle.indexOf(v), kryss: null });
let iVeg = 0; for (let q = 0; q < L.length; q += 3) if (ru.klaring(L[q], L[q + 1], -1) < .5) iVeg++;
sjekk(L.length / 3 >= 6 && iVeg === 0 && L[1] < 0, `gatelys: ${L.length / 3} lykter, ingen i vegbanen eller på gangvegen (flyttet til den andre siden)`);

// gjetning uten vegtype: gangvegen langs en lang veg (overlappende baner) blir gang- og sykkelveg, den lange vegen står
const lang = { k: 'E', g: 0, t: 0, P: V.jevn([[-500, 0], [500, 0]]) }, kort = { k: 'E', g: 0, t: 0, P: V.jevn([[-100, 6], [120, 6]]) };
V.gjett([lang, kort]);
sjekk(kort.g === 2 && !lang.g, 'gjetning: den korte linjen 6 m fra riksvegen er gang- og sykkelveg');

// Dovre-dataene: vegtypen finnes, og gangvegene ved Dombås er merket
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'fliser', 'veger.json'), 'utf8'));
const g = D.filter(v => v.g), km = l => l.reduce((s, v) => s + V.lengde(v.p), 0) / 1000;
sjekk(g.length > 200 && D.some(v => v.t === 1) && km(g) > 20, `veger.json: ${g.length} gang- og sykkelveger (${km(g).toFixed(1)} km) og ${D.filter(v => v.t).length} lenker med vegtype`);
const e6 = D.find(v => v.g && v.c === 'E' && V.lengde(v.p) > 900 && Math.hypot(v.p[0][0] - 193224, v.p[0][1] - 6894708) < 5);
sjekk(!!e6, 'veger.json: den 909 m lange linjen langs E6 sør for Dombås er gang- og sykkelveg');

console.log(feil ? `${feil} feil` : 'Alle testene gikk bra'); process.exit(feil ? 1 : 0);
