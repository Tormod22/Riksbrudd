// Test for spill/industri.js (industritypen og innredningen): node pipeline/fliser/test_industri.js
const path = require('path');
const S = path.join(__dirname, '..', '..', 'site', 'dovre-fliser', 'spill');
const Interior = require(path.join(S, 'interior.js'));
const Industri = require(path.join(S, 'industri.js'));
let feil = 0; const ok = (v, t) => { if (!v) feil++; console.log((v ? 'ok   ' : 'FEIL ') + t); };

// 1) typen fra dataene (ind) går foran alt
for (const t of Industri.ALLE) ok(Industri.type({ i: 5, ind: t }, { kai: 10, fiskevær: true }) === t, `ind ${t} fra dataene -> ${Industri.navn(t)}`);
ok(Industri.kjent({ ind: 6 }) && !Industri.kjent({ i: 3 }) && Industri.kjent({ navn: 'Dovre Sag' }), 'kjent(): fra dataene/navnet, ellers anslag');
// 2) navnet
for (const [n, t] of [['Nergård Fiskemottak', 6], ['Dovre Sag', 1], ['Otta Mek. Verksted', 8], ['Lesja Pukkverk', 5], ['Ulvik Bryggeri', 13], ['Moen Trelast', 1], ['Sagavoll skole', 0]])
  ok(Industri.fraNavn(n) === t, `navnet «${n}» -> ${t}`);
// 3) anslag fra omgivelsene: samme bygg gir alltid samme svar, og typen følger stedet
const telle = (omg, n = 400, ekstra = {}) => { const c = {}; for (let i = 0; i < n; i++) { const t = Industri.type(Object.assign({ i: 1000 + i }, ekstra), omg); c[t] = (c[t] || 0) + 1; } return c; };
const flest = c => +Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
const fiskevær = telle({ kai: 120, fiskevær: true, moh: 4, tett: 20 }), olje = telle({ olje: 900, kai: 2500, moh: 10, tett: 30 }), kraft = telle({ kraft: 300, moh: 300, tett: 12 });
const fjell = telle({ bratt: .5, moh: 700, tett: 3, kai: 50000 }), skog = telle({ skog: .7, moh: 350, tett: 4, kai: 40000 }), by = telle({ moh: 80, tett: 60, kai: 5000 });
ok(flest(fiskevær) === 6 && fiskevær[6] > 200, 'nær kai i et fiskevær -> fisk (' + JSON.stringify(fiskevær) + ')');
ok((olje[3] || 0) + (olje[4] || 0) > 200 && olje[3] > olje[4], 'nær oljeterminal -> olje/gass (' + JSON.stringify(olje) + ')');
ok(flest(kraft) === 10, 'nær kraftverk -> kraft (' + JSON.stringify(kraft) + ')');
ok(flest(fjell) === 5, 'bratt fjell -> stein (' + JSON.stringify(fjell) + ')');
ok(flest(skog) === 1 && (skog[2] || 0) > 0, 'skogbygd -> tømmer, noen snekkerier (' + JSON.stringify(skog) + ')');
ok(flest(by) === 8 && !by[6] && !by[3], 'by uten noe spesielt -> verksted/lager, ingen fisk eller olje (' + JSON.stringify(by) + ')');
const nabo = telle({ moh: 80, tett: 60, kai: 5000, nabo: { 1: 3 } }); ok(nabo[1] > (by[1] || 0) + 50, 'naboer med sagbruk trekker mot tømmer (' + (nabo[1] || 0) + ')');
{ let likt = true; for (let i = 0; i < 200; i++) { const o = { kai: 300 + i, olje: 4000, moh: 9 }; if (Industri.type({ i }, o) !== Industri.type({ i }, Object.assign({}, o))) likt = false; } ok(likt, 'samme bygg og omgivelser gir samme svar'); }
ok([1, 3, 8].includes(Industri.type({ i: 7, moh: 400, tett: 2 }, null)), 'uten omgivelser: som den gamle regelen (tre/olje/metall)');
ok(Industri.tekst(6) === 'Industri – fiskeforedling' && Industri.tekst(0) === 'Industri' && Industri.tekst(1, 'Lager') === 'Lager – sagbruk og tømmer', 'tekst(): «Industri – fiskeforedling»');

// 4) innredningen per type
const har = (t, ...navn) => { const l = Industri.innredning(t).map(x => x.type); return navn.every(n => l.includes(n)); };
ok(har(1, 'sagbenk', 'kantverk', 'tømmerstabel', 'tørkestativ'), 'tømmer: sagbenk, kantverk, tømmerstabler, tørkestativ');
ok(har(6, 'sløyebenk', 'filetmaskin', 'frysetunnel', 'iskar'), 'fisk: sløyebenk, filetmaskin, frysetunnel, kar med is');
ok(har(3, 'tank', 'rørgate', 'pumpe', 'ventil', 'tavlepanel') && har(4, 'gasstank', 'kompressor', 'rørgate'), 'olje/gass: tanker, rørgater, pumper, ventiltavle');
ok(har(5, 'knuser', 'sikt', 'transportbånd', 'grushaug') && har(8, 'dreiebenk', 'sveisebås', 'platesaks', 'esse') && har(7, 'kokekar', 'pakkemaskin', 'kjølereol'), 'stein, metall og mat');
{ let alle = true; for (const t of Industri.ALLE) { const l = Industri.innredning(t); if (!l.length || l.some(x => !(x.b > 0 && x.d > 0 && x.h >= 0 && x.navn && x.plass && x.rom))) { alle = false; console.log('  type', t, JSON.stringify(l)); } } ok(alle, 'alle typene har en liste med navn, mål, plass og rom'); }
{ const mangler = Object.keys(Industri.MASKINER).filter(k => !Industri.MODELLER[k]); ok(!mangler.length, 'alle nye maskiner har en kasse-modell' + (mangler.length ? ': mangler ' + mangler : '')); }
{ const K = []; const m = { type: 'filetmaskin', b: 3.5, d: 1.4, h: 1.5, f: .3 }; ok(Industri.deler(m, (...a) => K.push(a)) && K.length >= 3 && K.every(k => k.length >= 7 && k.slice(0, 6).every(Number.isFinite)), 'deler(): kassene for filetmaskinen (' + K.length + ')'); }

// 5) koblingen til interiøret: et industribygg av type fisk får fiskeinnredning
ok(Industri.koble(Interior), 'koble(Interior)');
const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const dør = (P, k, t, w) => { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; return { x: a[0] + ux * L * t, y: a[1] + uy * L * t, ux, uy, w }; };
const plan = (info, P = rekt(32, 18)) => { const pl = Interior.plan(P, Object.assign({ i: 77, kl: 'industri', h: 8, dør: dør(P, 0, .5, 4) }, info)); return { pl, t: new Set(pl.møbler.map(m => m.type)), r: new Set(pl.rom.map(r => r.rolle)) }; };
{ const { pl, t, r } = plan({ ind: 6 }); ok(pl.variant === 'ind6' && Industri.fraPlan(pl) === 6 && r.has('fiskehall') && r.has('fryselager') && t.has('sløyebenk') && t.has('filetmaskin') && t.has('iskar') && !t.has('maskin'),
  'industribygg med ind 6 får fiskeinnredning (' + [...r].join(', ') + ': ' + [...t].join(', ') + ')'); }
for (const [ind, rom, ting] of [[1, 'sagbrukshall', 'sagbenk'], [3, 'oljehall', 'tank'], [4, 'gasshall', 'gasstank'], [5, 'knuserhall', 'knuser'], [7, 'mathall', 'kokekar'], [8, 'metallverksted', 'dreiebenk'],
  [9, 'verftshall', 'båtbukk'], [10, 'turbinhall', 'generator'], [11, 'lagerhall', 'pall'], [12, 'sorteringshall', 'avfallscontainer'], [13, 'bryggerhall', 'gjæringstank'], [14, 'kjemihall', 'reaktor'], [2, 'snekkerverksted', 'høvelbenk']]) {
  const { pl, t, r } = plan({ ind }, rekt(36, 22)); ok(r.has(rom) && (t.has(ting) || [...t].some(x => x === 'pallereol')), `ind ${ind}: ${rom} med ${ting} (${[...t].slice(0, 8).join(', ')})`);
}
// som vakta «interiør» (vakter/inne.js): de gamle variantnavnene tre/metall/olje og innholdet står seg når Industri er koblet til
{ const v = navn => plan({ navn }, rekt(32, 20)); const a = v('sagbruk'), b = v('mek. verksted'), c = v('olje og gass');
  ok(a.pl.variant === 'tre' && a.t.has('sagbenk') && b.pl.variant === 'metall' && b.t.has('traverskran') && c.pl.variant === 'olje' && c.t.has('tank'), 'gamle variantnavn: tre, metall, olje (' + [a, b, c].map(q => q.pl.variant).join(', ') + ')');
  ok(Industri.fraPlan(a.pl) === 1 && Industri.fraPlan(c.pl) === 3, 'fraPlan() kjenner de gamle navnene'); }
// uten ind: anslaget fra omgivelsene (Industri.omgivelser) – fiskevær gir fisk
Industri.omgivelser = () => ({ kai: 100, fiskevær: true, moh: 3 });
{ let n = 0; for (let i = 0; i < 40; i++) if (Interior.plan(rekt(30, 18), { i, kl: 'industri', h: 8, dør: dør(rekt(30, 18), 0, .5, 4) }).variant === 'ind6') n++; ok(n >= 25, 'uten ind, i et fiskevær: ' + n + ' av 40 blir fiskeforedling'); }
Industri.omgivelser = null;
// lager: industrilokale bare når dataene sier det
{ const a = Interior.plan(rekt(30, 18), { i: 3, kl: 'lager', h: 8, dør: dør(rekt(30, 18), 0, .5, 4) }), b = Interior.plan(rekt(30, 18), { i: 3, kl: 'lager', h: 8, ind: 6, dør: dør(rekt(30, 18), 0, .5, 4) });
  ok(a.rom.some(r => r.rolle === 'lagerhall') && b.rom.some(r => r.rolle === 'fiskehall'), 'lager: vanlig lagerhall, eller fiskehall med ind 6'); }
// alle møblene står inne i bygget og ikke i ytterveggen (samme krav som test_interior)
{ let ute = 0, n = 0; for (const ind of Industri.ALLE) for (let k = 0; k < 3; k++) { const P = rekt(20 + k * 9, 14 + k * 5), pl = Interior.plan(P, { i: 900 + ind * 7 + k, kl: 'industri', h: 8, ind, dør: dør(P, k % 4, .5, 4) });
    for (const m of pl.møbler) { n++; if (!Interior.inni(P, m.x, m.y)) ute++; } } ok(ute === 0 && n > 200, `møblene står inne i bygget (${n} møbler, ${ute} ute)`); }
// romstil for hallene
ok(Object.values(Industri.IND).every(I => !I.hall || Industri.romStil(I.hall) || ['lagerhall'].includes(I.hall)), 'alle hallene har gulv og vegg i 3D');
console.log(feil ? feil + ' FEIL' : 'alle industritestene ok'); process.exit(feil ? 1 : 0);
