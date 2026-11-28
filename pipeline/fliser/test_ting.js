// Test av hverdagstingene (site/dovre-fliser/spill/ting.js). Kjør: node pipeline/fliser/test_ting.js
const T = require('../../site/dovre-fliser/spill/ting.js');
let feil = 0; const ok = (v, t) => { if (!v) { feil++; console.log('FEIL: ' + t); } };
// katalogen: 150–250 ting i alle ti kategorier, alle med fornuftige tall
ok(T.IDER.length >= 150 && T.IDER.length <= 250, 'antall ting ' + T.IDER.length);
for (const k of T.KAT_REKKE) ok(T.IDER.filter(i => T.TING[i].kat === k).length >= 10, 'minst ti i ' + k);
for (const id of T.IDER) { const g = T.TING[id];
  ok(g.navn && g.vekt > 0 && g.vol > 0 && g.hold >= 0 && g.pris >= 0 && T.LAG.includes(g.lag) && g.s > 0 && g.s <= 1, 'tall for ' + id);
  if (g.t) ok(T.OPPGAVE_NAVN[g.t.oppgave] && g.t.andel > 0 && g.t.andel <= .2, 'tempo for ' + id);
  if (g.krever) ok(!!T.TING[g.krever.ting], 'krever finnes for ' + id);
  if (g.kat === 'mat' && !g.m && id !== 'salt' && id !== 'krydder') ok(g.r > 0, 'mat har rasjoner: ' + id); }
// nøkkeltingene fra brukeren finnes
for (const id of ['peanøttsmør', 'hermbønner', 'knekkebrød', 'havregryn', 'kaffe', 'sukker', 'salt', 'tørrfisk', 'syltetøy', 'flaskevann', 'såpe', 'tannkrem', 'dopapir', 'bind',
  'smertestillende', 'plaster', 'bandasje', 'antibiotika', 'jod', 'hammer', 'skrutrekker', 'sag', 'tang', 'tape', 'spiker', 'skruer', 'batterier', 'lommelykt', 'ledning', 'radio', 'lyspære',
  'ullsokker', 'regnjakke', 'hansker', 'kjele', 'primus', 'fyrstikker', 'aluminiumsfolie', 'kortstokk', 'bok', 'gitar', 'sjokolade', 'tobakk', 'kart', 'kompass', 'notatbok', 'penner'])
  ok(!!T.TING[id], 'finnes: ' + id);
ok(T.TING.melk.lag === 'kjøl' && T.TING.frossen_fisk.lag === 'frys' && T.TING.flaskevann.lag === 'vann' && T.TING.hammer.lag === 'verktøy', 'lagring');
ok(T.TING.sukker.hold === 0 && T.TING.melk.hold < 14, 'holdbarhet');
// tekstene
ok(T.antall('peanøttsmør', 2) === '2 glass peanøttsmør' && T.antall('tape', 1) === '1 rull tape' && T.antall('hammer', 3) === '3 hammere', 'antall: ' + T.antall('hammer', 3));
ok(/^Fant: 2 glass peanøttsmør og 1 rull tape\.$/.test(T.fantTekst([{ id: 'tape', n: 1 }, { id: 'peanøttsmør', n: 2 }])), T.fantTekst([{ id: 'tape', n: 1 }, { id: 'peanøttsmør', n: 2 }]));
ok(/og 2 andre ting\.$/.test(T.fantTekst([1, 2, 3, 4, 5, 6].map((n, k) => ({ id: T.IDER[k * 7], n })))), 'resten samles');
ok(T.lesBruk('h=.3/10 t=bygg/.05/2').h.doser === 10, 'lesBruk'); { let kastet = false; try { T.lesBruk('x=1'); } catch (e) { kastet = true; } ok(kastet, 'ukjent bruk kaster'); }
// funn: fast per bygg, kjøkken gir mat, bad hygiene/medisin, garasje verktøy, soverom klær
ok(JSON.stringify(T.funnIBygg('hus', 120, 9)) === JSON.stringify(T.funnIBygg('hus', 120, 9)), 'samme bygg gir samme funn');
const andel = (rom, kat) => { let a = 0, n = 0; for (let i = 0; i < 300; i++) for (const q of T.funnIRom(rom, i * 31 + 7)) { n += q.n; if ([].concat(kat).includes(T.TING[q.id].kat)) a += q.n; } return a / Math.max(1, n); };
ok(andel('kjøkken', ['mat', 'drikke']) > .5, 'kjøkken: mat ' + andel('kjøkken', ['mat', 'drikke']));
ok(andel('bad', ['hygiene', 'medisin']) > .9, 'bad: hygiene');
ok(andel('garasje', 'verktøy') > .6, 'garasje: verktøy');
ok(andel('soverom', 'klær') > .5, 'soverom: klær');
const matI = kl => { let s = 0; for (let i = 0; i < 200; i++) for (const q of T.funnIBygg(kl, 300, i)) s += (T.TING[q.id].r || 0) * q.n; return s / 200; };
ok(matI('butikk') > 2 * matI('hus') && matI('butikk') > 5, 'butikken har mer mat: ' + matI('butikk').toFixed(1) + ' mot ' + matI('hus').toFixed(1));
ok(T.funnIBygg('hus', 100, 3, { etasje: 'kjeller' }).some(q => ['mat', 'drikke'].includes(T.TING[q.id].kat)) || T.funnIBygg('hus', 100, 4, { etasje: 'kjeller' }).length > 0, 'kjeller');
ok(T.funnIBygg('hus', 100, 5, { rom: ['dagligstue', 'bad'] }).length > 0 && T.rolle('behandlingsrom') === 'sykerom', 'roller fra interiøret');
ok(T.funnIBygg('lager', 1e6, 2).length <= T.REGLER.maksSlag, 'høyst maksSlag slag');
ok(T.snart('melk', 5) && !T.snart('melk', 0) && !T.snart('sukker', 1e5) && T.igjen('sukker', 1e5) === Infinity, 'snart ut');
ok(T.salgsverdi('hammer', 2) === Math.round(6000 * T.REGLER.salg), 'salgsverdi');
console.log(feil ? feil + ' FEIL' : `alle tingtestene ok (${T.IDER.length} ting)`); process.exit(feil ? 1 : 0);
