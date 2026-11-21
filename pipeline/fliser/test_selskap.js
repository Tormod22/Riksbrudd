// Test av spill/selskap.js (W1 – selskapet ditt): rykte, tilbud, godta, levere, bryte, konkurrenter og lagring.
'use strict';
const assert = require('assert');
const S0 = require('../../site/dovre-fliser/spill/selskap.js');
let n = 0; const ok = (v, t) => { assert.ok(v, t); n++; };
const leir = { x: 200000, y: 6900000 };
const steder = [{ navn: 'Dombås', x: 205000, y: 6900000, slag: 'tettsted', id: 1 }, { navn: 'Dovre', x: 200000, y: 6890000, slag: 'tettsted', id: 2 },
  { navn: 'Jora bru', x: 197000, y: 6904000, slag: 'bru', id: 'b1' }, { navn: 'For langt', x: 300000, y: 6900000, slag: 'tettsted', id: 3 }];

// ny tilstand: tre sider med rykte 50/25/50
let S = S0.ny(leir, { blå: 'Ulvane AS', rød: 'Ravnsund Sikkerhet' });
ok(S.sider.blå.navn === 'Ulvane AS' && S.sider.rød.navn === 'Ravnsund Sikkerhet' && S.sider.grønn, 'tre sider');
ok(S.sider.blå.rykte.pålitelig === 50 && S.sider.blå.rykte.hardhendt === 25, 'startryktet');
ok(/holder ord|nokså stødig/.test(S0.rykteTekst(S.sider.blå.rykte)), 'rykteteksten: ' + S0.rykteTekst(S.sider.blå.rykte));

// tilbud: tre, innenfor avstanden, med tittel og betaling
const nye = S0.lagTilbud(S, 'blå', 600, steder, S0.lagRand(42));
ok(nye.length === 3 && S.tilbud.length === 3, 'tre tilbud ved rykte 50');
ok(nye.every(k => k.sted.navn !== 'For langt' && k.betaling > 100000 && k.bot === Math.round(k.betaling * .35 / 10000) * 10000 && k.tittel && S0.kravTekst(k)), 'tilbudene har sted, betaling, bot og tekst');
ok(S0.lagTilbud(S0.ny(leir), 'blå', 0, [], S0.lagRand(1)).length === 0, 'ingen steder = ingen tilbud');

// ryktet styrer tilbudene: pålitelig gir flere, hardhendt gir flere ryddejobber og færre hentejobber
ok(S0.antallTilbud({ pålitelig: 80, hardhendt: 20, billig: 50 }) === 4 && S0.antallTilbud({ pålitelig: 10, hardhendt: 20, billig: 50 }) === 2, 'antall etter pålitelighet');
const v1 = S0.typeVekter({ pålitelig: 50, hardhendt: 10, billig: 50 }), v2 = S0.typeVekter({ pålitelig: 50, hardhendt: 90, billig: 50 });
ok(v2.rydd > v1.rydd * 2 && v2.hent < v1.hent / 2, 'hardhendt: flere rydd, færre hent');
const tell = (r, typ) => { const T = S0.ny(leir); T.sider.blå.rykte = r; let k = 0; for (let i = 0; i < 40; i++) k += S0.lagTilbud(T, 'blå', i * 1440, steder, S0.lagRand(i + 1)).filter(q => q.type === typ).length; return k; };
ok(tell({ pålitelig: 50, hardhendt: 95, billig: 50 }, 'rydd') > tell({ pålitelig: 50, hardhendt: 5, billig: 50 }, 'rydd'), 'hardhendte får flere ryddekontrakter');
ok(S0.betaling('rydd', { pålitelig: 90, hardhendt: 0, billig: 0 }, 'vanlig', 5000) > S0.betaling('rydd', { pålitelig: 20, hardhendt: 0, billig: 0 }, 'vanlig', 5000), 'pålitelige får bedre betalt');
ok(S0.betaling('hent', S.sider.blå.rykte, 'høy', 5000) > S0.betaling('hent', S.sider.blå.rykte, 'lav', 5000), 'høy pris gir mer');
ok(S.tilbud.length <= S0.REGLER.maksTilbud, 'høyst maksTilbud');

// godta og levere
const hold = { id: 'x1', type: 'hold', status: 'tilbud', timer: 14, hold: 4, betaling: 800000, bot: 280000, sted: { navn: 'Dombås', x: 205000, y: 6900000 }, utløper: 9999 };
S.tilbud.push(hold);
let g = S0.godta(S, 'blå', 'x1', 1000, () => .9);
ok(g.ok && S.sider.blå.aktive.length === 1 && hold.frist === 1000 + 14 * 60 && hold.side === 'blå' && !S.tilbud.includes(hold), 'godta gir frist og side');
ok(!S0.godta(S, 'blå', 'x1', 1000).ok, 'samme tilbud to ganger');
let h = S0.steg(S, 'blå', 1100, 100, { x1: { i: true } });
ok(!h.length && hold.framdrift === 100, 'hold teller minutter');
h = S0.steg(S, 'blå', 1200, 30, { x1: { i: false } });
ok(!h.length && hold.framdrift === 100, 'uten lag der teller det ikke');
h = S0.steg(S, 'blå', 1400, 140, { x1: { i: true } });
ok(h.length === 1 && h[0].type === 'levert' && h[0].kr === 800000 && S.sider.blå.rykte.pålitelig === 56 && S.sider.blå.rykte.hardhendt === 26, 'levert: betaling og rykte');
ok(S.sider.blå.aktive.length === 0 && S.sider.blå.ferdige[0].status === 'levert' && S.sider.blå.sum.tjent === 800000, 'levert ligger i ferdige');

// frist og tap: bot og dårligere rykte
const esk = { id: 'x2', type: 'eskorte', status: 'tilbud', timer: 10, betaling: 600000, bot: 210000, sted: { navn: 'Dovre', x: 0, y: 0 }, fra: { navn: 'Dombås', x: 0, y: 0 }, utløper: 9999 };
S.tilbud.push(esk); S0.godta(S, 'blå', 'x2', 2000, () => .99);
h = S0.steg(S, 'blå', 2000 + 601, 1, {});
ok(h.length === 1 && h[0].type === 'brutt' && h[0].grunn === 'frist' && h[0].kr === 210000 && S.sider.blå.rykte.pålitelig === 46, 'fristen gikk ut: bot og rykte');
const esk2 = { ...esk, id: 'x3', status: 'tilbud' }; S.tilbud.push(esk2); S0.godta(S, 'blå', 'x3', 3000, () => .99);
h = S0.steg(S, 'blå', 3010, 1, { x3: { tapt: true } });
ok(h[0].type === 'brutt' && h[0].grunn === 'tapt', 'bilen tapt');
// avbryt
const esk3 = { ...esk, id: 'x4', status: 'tilbud' }; S.tilbud.push(esk3); S0.godta(S, 'blå', 'x4', 3000, () => .99);
const a = S0.avbryt(S, 'blå', 'x4', 3001); ok(a && a.kr === 210000 && S.sider.blå.sum.brutt === 3, 'avbrutt gir bot');

// konkurrenten kommer først
const hent = { id: 'x5', type: 'hent', status: 'tilbud', timer: 10, betaling: 500000, bot: 180000, sted: { navn: 'Dovre', x: 0, y: 0 }, person: 'legen Per Moe', konkurrent: 'rød', utløper: 9999 };
S.tilbud.push(hent); S0.godta(S, 'blå', 'x5', 5000); const pr0 = S.sider.rød.rykte.pålitelig, pb0 = S.sider.blå.rykte.pålitelig;
ok(!S0.steg(S, 'blå', 5000 + 300, 1, {}).length, 'konkurrenten er ikke ferdig ennå');
h = S0.steg(S, 'blå', 5000 + 340, 1, {});
ok(h.length === 1 && h[0].type === 'rivalFørst' && h[0].rival === 'rød' && h[0].kr === 0 && S.sider.rød.rykte.pålitelig > pr0 && S.sider.blå.rykte.pålitelig === pb0 - 2, 'konkurrenten kom først: ingen bot, litt rykte');
// har du hentet personen, kommer ikke konkurrenten først
const hent2 = { ...hent, id: 'x6', status: 'tilbud' }; S.tilbud.push(hent2); S0.godta(S, 'blå', 'x6', 6000);
ok(!S0.steg(S, 'blå', 6000 + 400, 1, { x6: { hentet: true } }).length && hent2.hentet, 'hentet: konkurrenten er for sen');
ok(S0.steg(S, 'blå', 6000 + 401, 1, { x6: { i: true } })[0].type === 'levert', 'personen i leiren = levert');

// konkurrenten angriper eskorten når bilen har kommet et stykke
const esk4 = { ...esk, id: 'x7', status: 'tilbud' }; S.tilbud.push(esk4); S0.godta(S, 'blå', 'x7', 7000, () => .1);
ok(esk4.angrep === 'rød' || esk4.angrep === 'grønn', 'angrep bestemt ved godta');
ok(!S0.steg(S, 'blå', 7010, 1, { x7: { andel: .2 } }).length, 'ikke ennå');
h = S0.steg(S, 'blå', 7020, 1, { x7: { andel: .5 } }); ok(h.length === 1 && h[0].type === 'angrep' && esk4.angrepet, 'angrep');
ok(!S0.steg(S, 'blå', 7030, 1, { x7: { andel: .6 } }).length, 'bare én gang');
// maks aktive
const T2 = S0.ny(leir); for (let i = 0; i < 4; i++) T2.tilbud.push({ ...esk, id: 'm' + i, status: 'tilbud' });
for (let i = 0; i < 3; i++) S0.godta(T2, 'blå', 'm' + i, 0); ok(!S0.godta(T2, 'blå', 'm3', 0).ok, 'høyst tre aktive');

// dagSteg: utløpte forsvinner, rivalene tar noen, hardhendt synker
const T3 = S0.ny(leir); S0.lagTilbud(T3, 'blå', 0, steder, S0.lagRand(3)); T3.tilbud[0].utløper = 10;
const d = S0.dagSteg(T3, 100, () => .1);
ok(d.some(e => e.type === 'utløpt') && d.some(e => e.type === 'rivalTok' && ['rød', 'grønn'].includes(e.rival)) && T3.tilbud.length === 0, 'dagSteg: utløpt og tatt av rivaler');
ok(T3.sider.blå.rykte.hardhendt === 24, 'hardhendt synker');
// flere sider: rød kan også ta kontrakter selv (ingen regel antar én spiller)
const T4 = S0.ny(leir); S0.lagTilbud(T4, 'rød', 0, steder, S0.lagRand(5)); ok(T4.tilbud.every(k => k.for === 'rød') && S0.godta(T4, 'rød', T4.tilbud[0].id, 0).ok && T4.sider.rød.aktive.length === 1, 'rød tar en kontrakt');
ok(T4.tilbud.every(k => k.konkurrent !== 'rød'), 'rød konkurrerer ikke med seg selv');

// prisprofil
ok(S0.settPris(S, 'blå', 'lav') && S.sider.blå.pris === 'lav' && !S0.settPris(S, 'blå', 'gratis'), 'prisprofil');
// lagring: ren JSON, per leir
const J = S0.tilJSON(S), L2 = S0.fraJSON(J, leir);
ok(L2 && JSON.stringify(L2.sider.blå.rykte) === JSON.stringify(S.sider.blå.rykte) && L2.sider.blå.ferdige.length === S.sider.blå.ferdige.length && L2.nr === S.nr && L2.sider.blå.pris === 'lav', 'lagring tilbake');
ok(S0.fraJSON(J, { x: 1, y: 2 }) === null && S0.fraJSON('tull') === null && S0.fraJSON('{"versjon":9}') === null, 'annen leir / ødelagt gir null');
ok(JSON.parse(J) && typeof JSON.parse(J).sider.blå.aktive === 'object', 'ren JSON');
// rykte holder seg innen 0–100
S0.endreRykte(S, 'blå', { pålitelig: 500, hardhendt: -500 }); ok(S.sider.blå.rykte.pålitelig === 100 && S.sider.blå.rykte.hardhendt === 0, 'rykte 0–100');
console.log(`Alle ${n} testene for selskap.js er ok`);
