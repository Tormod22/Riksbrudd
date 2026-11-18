// Test av spill/merker.js og spill/tegninger.js (uten DOM): node pipeline/fliser/test_merker.js
const M = require('../../site/dovre-fliser/spill/merker.js'), T = require('../../site/dovre-fliser/spill/tegninger.js'); let feil = 0;
const ok = (b, t) => { if (!b) { feil++; console.log('FEIL ' + t); } else console.log('ok   ' + t); };
ok(M.form('eget') === 'rektangel' && M.form('fiende') === 'rute' && M.form('nøytral') === 'kvadrat', 'tre ulike former for eget, fiende og nøytralt');
ok(M.forhold('blå') === 'eget' && M.forhold('rød') === 'fiende' && M.forhold('grønn') === 'fiende' && M.forhold(null) === 'nøytral', 'siden gir forholdet');
ok(M.treff('eget', 10, 0, 11) && !M.treff('eget', 0, 9, 11), 'rektangelet er bredere enn høyt');
ok(M.treff('fiende', 0, 12, 11) && !M.treff('fiende', 9, 9, 11), 'ruta har spisser opp og ned, ikke hjørner');
const areal = f => { let n = 0; for (let x = -20; x <= 20; x += .5) for (let y = -20; y <= 20; y += .5) if (M.treff(f, x, y, 11)) n++; return n / 4; };
const A = M.FORHOLD.map(areal); ok(Math.max(...A) / Math.min(...A) < 1.25, `formene er omtrent like store (${A.map(Math.round).join(', ')})`);
// tegner uten feil på et falskt lerret
const kall = []; const g = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { kall.push(k); }), set: (o, k, v) => { o[k] = v; return true; } });
for (const f of M.FORHOLD) for (const s of M.SLAG) M.tegn(g, 50, 50, { forhold: f, slag: s, farge: '#345' }); M.tegn(g, 1, 1, { forhold: 'fiende', stiplet: true });
ok(kall.filter(k => k === 'save').length === kall.filter(k => k === 'restore').length && kall.includes('clip'), 'alle merkene tegnes, og lerretets tilstand settes tilbake');
// tegningene: gyldig SVG uten doble egenskaper
const dobbel = s => [...s.matchAll(/<\w+([^>]*)>/g)].some(m => { const n = [...m[1].matchAll(/([\w-]+)=/g)].map(x => x[1]); return new Set(n).size !== n.length; });
const alle = [...T.BYGG.map(t => T.bygg(t)), ...T.VÅPEN.map(t => T.våpen(t)), T.person('Kari'), T.person(7)];
ok(alle.every(s => /^<svg [^>]*viewBox/.test(s) && s.endsWith('</svg>') && !/NaN|undefined/.test(s) && !dobbel(s)), `${alle.length} tegninger er gyldig SVG uten doble egenskaper`);
ok(T.bygg('finnesikke') === T.bygg('hus') && T.våpen('maskinpistol') === T.våpen('mp') && T.person('Kari') === T.person('Kari') && T.person('Kari') !== T.person('Ola'), 'ukjent bygg gir et hus, våpen har alias, samme person tegnes likt');
let Leir = null; try { Leir = require('../../site/dovre-fliser/spill/leir.js'); } catch (e) { Leir = null; }
if (Leir && Leir.BYGG) { const uten = Object.keys(Leir.BYGG).filter(t => !Leir.BYGG[t].del && !T.har(t)); ok(uten.length === 0, 'alle byggene i leir.js har en tegning' + (uten.length ? ' – mangler: ' + uten.join() : '')); }
console.log(feil ? `${feil} FEIL` : 'Alt ok'); process.exit(feil ? 1 : 0);
