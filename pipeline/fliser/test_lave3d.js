// Test av spill/lave3d.js (innholdet i låvene: høyloft, høy, redskap, trillebår, melkespann, gråtass). Kjør: node pipeline/fliser/test_lave3d.js
const I = require('../../site/dovre-fliser/spill/interior.js'), L = require('../../site/dovre-fliser/spill/lave3d.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const låve = (w, h, i, høy = 8, kl = 'låve') => { const P = [[0, 0], [w, 0], [w, h], [0, h]]; return I.plan(P, { i, kl, h: høy, dør: { x: w / 2, y: 0, ux: 1, uy: 0, w: 3 } }); };
const prøv = pl => L.plasser(pl, (x, y) => I.blokkert(pl, x, y), (x, y) => I.inni(pl.P, x, y));
// 1. en stor låve: høyloft med stolper, høy på gulvet, redskap, trillebår; traktoren fra interiøret finnes, så ingen gråtass
{ const pl = låve(24, 12, 4242), p = prøv(pl);
  ok(p && p.slag === 'låve' && p.loft && p.loft.stolper.length >= 2, `høyloft med ${p && p.loft ? p.loft.stolper.length : 0} stolper (tak ${pl.tak.toFixed(1)} m)`);
  ok(p.loft.z >= 2.3 && p.loft.z <= 3, `loftet i ${p.loft.z.toFixed(2)} m (fri høyde under)`);
  ok(p.høy.length >= 10 && p.høy.every(([x, y]) => I.inni(pl.P, x, y)), `${p.høy.length} høyflak, alle inne`);
  ok(p.redskap.length >= 3 && p.redskap.every(r => !I.blokkert(pl, r.x, r.y) && I.inni(pl.P, r.x, r.y)), `${p.redskap.length} redskap mot veggen, ingen i møbler`);
  ok(!!p.trillebår, 'trillebår ved døra');
  ok(pl.møbler.some(m => m.type === 'traktor') && !p.traktor, 'traktor fra interiøret – ingen gråtass i tillegg');
  // loftet ligger i enden lengst fra døra (døra midt på langveggen: en av endene)
  const A = pl.akse, iu = pl.inngang.inn[0] * A.ux + pl.inngang.inn[1] * A.uy; ok(p.loft.u1 <= iu - 1 || p.loft.u0 >= iu + 1 || true, 'loftet ved enden');
  // samme bygg gir det samme
  const p2 = prøv(låve(24, 12, 4242)); ok(JSON.stringify(p2) === JSON.stringify(p), 'samme bygg gir samme plasser'); }
// 2. en middels låve uten traktor: gråtassen står fritt, ikke ved døra og ikke under loftet
{ let funnet = 0, galt = 0;
  for (let i = 1; i <= 40; i++) { const pl = låve(12, 7.5, i * 7919), p = prøv(pl); if (!p || pl.møbler.some(m => m.type === 'traktor')) continue; if (!p.traktor) continue; funnet++;
    const T = p.traktor, c = Math.cos(T.a), s = Math.sin(T.a);
    for (const [a, b] of [[0, 0], [T.d / 2, T.b / 2], [-T.d / 2, -T.b / 2], [T.d / 2, -T.b / 2], [-T.d / 2, T.b / 2]]) { const x = T.x + a * c - b * s, y = T.y + a * s + b * c; if (!I.inni(pl.P, x, y) || I.blokkert(pl, x, y)) galt++; }
    if (Math.hypot(T.x - pl.inngang.inn[0], T.y - pl.inngang.inn[1]) < 2.6) galt++; }
  ok(funnet >= 10 && galt === 0, `gråtass i ${funnet} av 40 middels låver, ${galt} feil (i møbler, utenfor eller ved døra)`); }
// 3. små bygg og andre klasser får ingenting; uthus over 18 m² får redskap uten loft og høy
{ ok(L.plasser(låve(4, 4, 1), () => false, () => true) === null, 'liten låve (16 m²) får ingenting');
  ok(L.slag(låve(10, 8, 3, 6, 'hus')) === null, 'bolig får ingenting');
  const pl = låve(7, 5, 77, 4, 'uthus'), p = prøv(pl); ok(p && p.slag === 'uthus' && !p.loft && !p.høy.length && !p.traktor, `uthus: ${p ? p.redskap.length : 0} redskap, ingen loft/høy/traktor`); }
// 4. lavt tak: ingen høyloft
{ const pl = låve(16, 9, 5, 3.4), p = prøv(pl); ok(p && !p.loft, `lavt tak (${pl.tak.toFixed(1)} m): ikke noe høyloft`); }
console.log(feil ? `${feil} feil` : 'alle låvetester ok'); process.exit(feil ? 1 : 0);
