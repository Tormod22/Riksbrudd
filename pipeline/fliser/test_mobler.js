// Flyttbare møbler: nøkler, flytting mellom bygg, vekt og plass (site/dovre-fliser/spill/mobler.js)
const I = require('../../site/dovre-fliser/spill/interior.js'), M = require('../../site/dovre-fliser/spill/mobler.js'), Lut = require('../../site/dovre-fliser/spill/lut.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekt = (x0, y0, w, h) => [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
const dør = (P, k, f, w) => { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L, w }; };
const P1 = rekt(0, 0, 10, 8), P2 = rekt(30, 0, 9, 7), ny1 = () => I.plan(P1, { i: 42, kl: 'hus', h: 6, dør: dør(P1, 0, .5, 1) }), ny2 = () => I.plan(P2, { i: 43, kl: 'hus', h: 6, dør: dør(P2, 0, .5, 1) });

// nøklene er de samme som beholderne i lut.js
{ const pl = M.merk(ny1(), 42), lb = Lut.beholdere(pl);
  ok(pl.møbler.every(m => /^42:/.test(m.nk)) && new Set(pl.møbler.map(m => m.nk)).size === pl.møbler.length, 'hvert møbel har en egen nøkkel (' + pl.møbler.length + ')');
  ok(lb.length > 0 && lb.every(b => b.nk === Lut.nøkkel(42, b.type, b.k)), 'nøkkelen er den samme som beholderens i lut.js (' + lb.length + ' beholdere)'); }

// flytt et nattbord fra hus 42 til hus 43 (kartets meter = planens meter her, cx = cy = 0)
{ const a = M.merk(ny1(), 42), m = a.møbler.find(q => q.type === 'nattbord') || a.møbler.find(q => !M.FLAT[q.type] && M.vekt(q) <= M.REGLER.maksKg);
  const n0 = a.møbler.length, F = {};
  F[m.nk] = { i: 'bæres', type: m.type, b: m.b, d: m.d, h: m.h, f: m.f, sperrer: m.sperrer };
  const a2 = ny1(); M.bruk(a2, 42, F); ok(a2.møbler.length === n0 - 1 && !a2.møbler.some(q => q.nk === m.nk), 'møbelet du bærer, er borte fra huset (' + m.type + ')');
  // finn en ledig plass i hus 43
  const b = M.merk(ny2(), 43); let sted = null;
  for (let x = 31; x < 38.5 && !sted; x += .25) for (let y = 1; y < 6.5 && !sted; y += .25) for (const a0 of [0, Math.PI / 2]) { const q = { type: m.type, x, y, a: a0, b: m.b, d: m.d }; if (M.kanSettes(b, q, I).ok) { sted = q; break; } }
  ok(!!sted, 'det finnes en ledig plass i det andre huset');
  F[m.nk] = { ...F[m.nk], i: 43, X: sted.x, Y: sted.y, a: sted.a };
  const b2 = ny2(), nb = b2.møbler.length; M.bruk(b2, 43, F); const satt = b2.møbler.find(q => q.nk === m.nk);
  ok(!!satt && Math.abs(satt.x - sted.x) < 1e-9 && b2.møbler.length === nb + 1, 'møbelet står i det andre huset der det ble satt');
  const a3 = ny1(); M.bruk(a3, 42, F); ok(!a3.møbler.some(q => q.nk === m.nk) && a3.møbler.length === n0 - 1, 'og er fortsatt borte fra det første');
  const lb = Lut.beholdere(b2).find(q => q.m === satt); ok(!lb || lb.nk === m.nk, 'en beholder beholder nøkkelen sin (innholdet følger med)');
  // kollisjonen følger med: der møbelet står nå, sperrer det (når det sperrer)
  if (satt.sperrer) ok(I.blokkert(b2, satt.x, satt.y), 'det nye stedet sperrer når du går');
  // med en forskjøvet utsnittsmidte (cx, cy) blir plassen den samme i kartet
  const b3 = I.plan(rekt(30 - 100, 0 - 50, 9, 7), { i: 43, kl: 'hus', h: 6, dør: dør(rekt(30 - 100, -50, 9, 7), 0, .5, 1) }); M.bruk(b3, 43, F, 100, 50);
  const s3 = b3.møbler.find(q => q.nk === m.nk); ok(!!s3 && Math.abs(s3.x - (sted.x - 100)) < 1e-9 && Math.abs(s3.y - (sted.y - 50)) < 1e-9, 'kartets meter: samme plass når utsnittet er flyttet'); }

// flytt innen samme hus: nøkkelen gjelder fortsatt, ingen dobbel
{ const a = M.merk(ny1(), 42), m = a.møbler.find(q => q.type === 'stol') || a.møbler[0], F = {};
  F[m.nk] = { i: 42, X: m.x, Y: m.y, a: m.a + Math.PI / 2, type: m.type, b: m.b, d: m.d, h: m.h, f: m.f, sperrer: m.sperrer };
  const a2 = ny1(); M.bruk(a2, 42, F); ok(a2.møbler.filter(q => q.nk === m.nk).length === 1 && a2.møbler.length === a.møbler.length, 'flyttet i samme hus: ett møbel, samme antall'); }

// plass: ikke gjennom ytterveggen, ikke oppå en sofa, ikke i inngangen, ikke i en døråpning
{ const pl = M.merk(ny1(), 42), sofa = pl.møbler.find(q => q.type === 'sofa'), q = (x, y, a = 0) => ({ type: 'nattbord', x, y, a, b: .45, d: .4 });
  ok(!M.kanSettes(pl, q(-.1, 4), I).ok, 'ikke gjennom ytterveggen');
  if (sofa) ok(!M.kanSettes(pl, q(sofa.x, sofa.y), I).ok, 'ikke oppå sofaen');
  ok(!M.kanSettes(pl, q(pl.inngang.inn[0], pl.inngang.inn[1]), I).ok, 'ikke foran inngangen');
  if (pl.dører.length) ok(!M.kanSettes(pl, q(pl.dører[0][0], pl.dører[0][1]), I).ok, 'ikke i en døråpning');
  if (pl.vegger.length) { const v = pl.vegger[0]; ok(!M.kanSettes(pl, q((v.ax + v.bx) / 2, (v.ay + v.by) / 2), I).ok, 'ikke gjennom en skillevegg'); }
}
  // selvtest (vakten skal finne en feil): uten sjekken mot møblene ville sofaplassen vært «ledig»

// vekt og bæring
ok(M.kanBære({ type: 'nattbord', b: .45, d: .4, h: .5 }).ok && !M.stor({ type: 'nattbord', b: .45, d: .4, h: .5 }), 'nattbord: lett og lite');
ok(M.kanBære({ type: 'sofa', b: 2, d: .9, h: .8 }).ok && M.stor({ type: 'sofa', b: 2, d: .9, h: .8 }), 'sofa: kan bæres, men i armene (stor)');
ok(!M.kanBære({ type: 'traktor', b: 2, d: 3.6, h: 2.4 }).ok && !M.kanBære({ type: 'fly', b: 9, d: 7, h: 2.6 }).ok, 'traktor og fly: for tunge');
ok(!M.kanBære({ type: 'kjøleskap', b: .62, d: .62, h: 1.85 }, 30).ok && M.kanBære({ type: 'kjøleskap', b: .62, d: .62, h: 1.85 }, 5).ok, 'kjøleskap med 30 kg i må tømmes, med 5 kg følger det med');
ok(M.vekt({ type: 'nyttMøbel', b: 1, d: 1, h: 1 }) > 0, 'nye møbeltyper får vekt fra målene');
// ute: fri og høyde avgjør
ok(M.kanSettesUte({ type: 'kasse', x: 0, y: 0, a: 0, b: 1.6, d: .8 }, () => true, () => 0).ok && !M.kanSettesUte({ type: 'kasse', x: 0, y: 0, a: 0, b: 1.6, d: .8 }, (x) => x < .5, () => 0).ok
  && !M.kanSettesUte({ type: 'kasse', x: 0, y: 0, a: 0, b: 1.6, d: .8 }, () => true, x => x).ok, 'ute: ledig, opptatt og for bratt');
// spøkelset foran deg: du ser mot (−sin a, cos a)
{ const g = M.foran(0, 0, 0, { b: 1, d: .4 }, 0); ok(Math.abs(g.x) < 1e-9 && g.y > .6 && g.y < .9, 'spøkelset står foran deg (' + g.y.toFixed(2) + ' m)'); }
ok(M.overlapp({ x: 0, y: 0, a: 0, b: 1, d: 1 }, { x: .9, y: 0, a: .3, b: 1, d: 1 }) && !M.overlapp({ x: 0, y: 0, a: 0, b: 1, d: 1 }, { x: 1.6, y: 0, a: .3, b: 1, d: 1 }), 'overlapp med skrå rektangler');

console.log(feil ? `\n${feil} FEIL` : '\nAlt ok'); process.exit(feil ? 1 : 0);
