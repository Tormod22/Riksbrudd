// Test av formasjoner og erfaring (spill/formasjon.js). Kjør: node pipeline/fliser/test_formasjon.js
const assert = require('assert'), F = require('../../site/dovre-fliser/spill/formasjon.js');
let n = 0; const ok = (b, t) => { assert.ok(b, t); n++; };
ok(F.neste('kile') === 'linje' && F.neste('kolonne') === 'kile' && F.neste('tull') === 'linje', 'blar'); ok(F.type('tull') === F.TYPER.kile, 'ukjent = kile');
// plassene: ingen to menn på samme sted, føreren først
for (const id of F.REKKE) for (const marsj of [false, true]) { const P = Array.from({ length: 12 }, (_, i) => F.plass(id, i, marsj)); ok(new Set(P.map(p => p.join())).size === 12, `${id}${marsj ? ' på marsj' : ''}: tolv plasser`); ok(P[0][0] === 0, 'føreren fremst'); }
const bredde = id => { const P = Array.from({ length: 12 }, (_, i) => F.plass(id, i, false)); return Math.max(...P.map(p => p[1])) - Math.min(...P.map(p => p[1])); }, dybde = id => { const P = Array.from({ length: 12 }, (_, i) => F.plass(id, i, false)); return Math.max(...P.map(p => -p[0])); };
ok(bredde('linje') > 30 && dybde('linje') < 2, 'linja er bred og grunn'); ok(bredde('kolonne') < 4 && dybde('kolonne') > 40, 'kolonnen er smal og lang'); ok(bredde('spredt') > bredde('kile') * 1.5, 'spredt er bredest');
ok(F.plass('linje', 5, true)[0] === -20, 'på marsj går alle i kolonne');
// ildkamp
ok(F.ild({ id: 'kile' }, { id: 'kile' }) === 1, 'kile mot kile'); ok(Math.abs(F.ild({ id: 'linje' }, { id: 'spredt' }) - 1.15 * .75) < 1e-9, 'linje mot spredt'); ok(F.ild({ id: 'linje', marsj: true }, { id: 'kile' }) === .8, 'på marsj = kolonne'); ok(F.ild({}, null) === 1, 'tåler tomt');
// erfaring
ok(F.nivå(0) === 0 && F.nivå(30) === 1 && F.nivå(120) === 2 && F.nivå(1000) === 3, 'nivåer');
const menn = [{ navn: 'A', hp: 1, erf: 29 }, { navn: 'B', hp: .5, erf: 29 }, { navn: 'C', hp: 0, erf: 29 }, { navn: 'D', hp: 1 }];
const opp = F.lær(menn, 1); ok(opp.length === 1 && opp[0].navn === 'A' && opp[0].nivå === 'Erfaren', 'A ble erfaren'); ok(menn[1].erf === 29.5 && menn[2].erf === 29 && menn[3].erf === 1, 'sårede lærer halvparten, falne ingenting');
ok(Math.abs(F.erfFaktor(menn) - (1.08 + 1) / 2) < 1e-9, 'snittet av de friske'); ok(F.erfFaktor([]) === 1 && F.erfFaktor([{ hp: 1, erf: 400 }]) === 1.28, 'ytterpunktene');
ok(F.erfTekst(menn) === '1 erfaren' && F.erfTekst([{ hp: 1 }]) === 'rekrutter' && F.erfTekst([{ hp: 1, erf: 400 }, { hp: 1, erf: 130 }]) === '1 elite, 1 veteran', 'tekst'); ok(F.ferdighet(130) === .12 && F.ferdighet(0) === 0, 'ferdighet hjem');
console.log(`ok   formasjoner og erfaring: ${n} sjekker`);
