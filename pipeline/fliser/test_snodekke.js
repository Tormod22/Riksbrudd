// Test for spill/snodekke.js (førstesnøen som ligger flekkvis): node pipeline/fliser/test_snodekke.js
const S = require('../../site/dovre-fliser/spill/snodekke.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const V = { snøgrense: 1350, pudder: .35, pudderGrense: 250 };
ok(S.dekke(V, 100) < .01 && Math.abs(S.dekke(V, 650) - .35) < 1e-6 && S.dekke(V, 1600) > .99, 'dekket: ingenting under førstesnøen, tynt lag i dalen, fullt over snøgrensen');
ok(S.dekke({ snøgrense: 1900, pudder: 0, pudderGrense: null }, 800) === 0 && S.dekke(null, 800) === 0, 'uten snø: 0');
const d = .35, F = o => S.flekk(d, Object.assign({ nord: 0, flat: .5, skog: 0, stein: 0, støy: .5, fin: .5 }, o)).dekning;
// snitt over mønsteret (støy 0–1), så testen ikke henger på ett punkt
const snitt = o => { let s = 0, n = 0; for (let a = 0; a <= 1; a += .05) for (let b = 0; b <= 1; b += .25) { s += F(Object.assign({ støy: a, fin: b }, o)); n++; } return s / n; };
const skygge = snitt({ nord: .5 }), sol = snitt({ nord: -.5 }), jorde = snitt({ flat: 1 }), skog = snitt({ skog: 1 }), stein = snitt({ stein: 1 }), vanlig = snitt({});
ok(skygge > vanlig + .1 && sol < vanlig - .1, `skyggesiden (mot nord) har mer snø enn solsiden: ${skygge.toFixed(2)} mot ${sol.toFixed(2)}`);
ok(jorde > vanlig && stein > vanlig, `flate åpne jorder (${jorde.toFixed(2)}) og stein (${stein.toFixed(2)}) har mer snø enn vanlig mark (${vanlig.toFixed(2)})`);
ok(skog < .08, `lite snø i tett skog: ${skog.toFixed(2)}`);
// flekkvis: på samme sted veksler det mellom snø og bart etter mønsteret
{ const v = []; for (let a = 0; a <= 1; a += .1) v.push(F({ støy: a })); ok(Math.min(...v) < .05 && Math.max(...v) > .4, 'flekkvis: mønsteret gir både bart og snø på vanlig mark (' + Math.min(...v).toFixed(2) + '–' + Math.max(...v).toFixed(2) + ')'); }
// gress og lyng kikker opp: det tynne laget dekker aldri helt, det tykke gjør det
ok(S.flekk(.35, { nord: 1, flat: 1, støy: 1, fin: .2 }).dekning < .8, 'tynt lag: strå stikker opp (dekker ' + S.flekk(.35, { nord: 1, flat: 1, støy: 1, fin: .2 }).dekning.toFixed(2) + ')');
ok(S.flekk(1, { skog: 1, nord: -1, støy: 0, fin: 0 }).dekning > .999, 'vinter (fullt lag): alt dekket, også skog og solside – som før');
ok(S.flekk(0, {}).dekning === 0, 'uten lag: ingen snø');
// GLSL: bare ASCII, og funksjonene finnes
{ const g = S.glsl(); ok(/^[\x00-\x7f]*$/.test(g) && /float snoFlekk\(/.test(g) && /float snoDekke\(/.test(g), 'skyggekoden er ren ASCII med snoDekke og snoFlekk'); }
// skyggekoden regner det samme som JavaScript (en enkel GLSL-tolk: smoothstep, max og tall)
{ const g = S.glsl().replace(/float (\w+)\(([^)]*)\) \{/g, (m, n, a) => `function ${n}(${a.replace(/float /g, '')}) {`).replace(/float /g, 'let ').replace(/(\d)\.0\b/g, '$1');
  const f = new Function('smoothstep', 'max', g + '; return { snoFlekk, snoDekke };')((a, b, x) => S.trinn(a, b, x), Math.max);
  let maks = 0; for (const dd of [.1, .35, .6, .9, 1]) for (const n of [-.6, 0, .6]) for (const s of [0, .3, .8]) { const a = f.snoFlekk(dd, n, .5, .2, .3, s, .4), b = S.flekk(dd, { nord: n, flat: .5, skog: .2, stein: .3, støy: s, fin: .4 }).dekning; maks = Math.max(maks, Math.abs(a - b)); }
  const h = Math.abs(f.snoDekke(700, .3, 1350, .35, 250) - S.dekke(V, 700, .3));
  ok(maks < 1e-9 && h < 1e-9, 'skyggekoden og JavaScript gir samme svar (avvik ' + maks + ')'); }
ok(S.støy(1000, 2000, 40) >= 0 && S.støy(1000, 2000, 40) <= 1 && S.støy(1000, 2000, 40) === S.støy(1000, 2000, 40), 'støyen er fast og mellom 0 og 1');
process.exit(feil ? 1 : 0);
