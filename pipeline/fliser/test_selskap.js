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
// fristen som tekst (R16-D: «13 t 60 min» kom før)
ok(S0.fristTekst({ frist: 839.6 }, 0) === '14 t 0 min igjen' && S0.fristTekst({ frist: 90 }, 0) === '1 t 30 min igjen' && S0.fristTekst({ frist: 30.2 }, 0) === '31 min igjen', 'fristTekst: ' + S0.fristTekst({ frist: 839.6 }, 0));
// ---------- R18-A: den første kontrakten, tråden, nivåene og kravene ----------
{
  const L0 = { x: 200000, y: 6900000 }, T = S0.ny(L0);
  const st = [{ navn: 'Langt unna', x: L0.x + 20000, y: L0.y, slag: 'tettsted' }, { navn: 'Nabobygda', x: L0.x + 2100, y: L0.y, slag: 'tettsted', id: 7 }, { navn: 'Nær bru', x: L0.x + 300, y: L0.y, slag: 'bru' }];
  const k = S0.førsteKontrakt(T, 'blå', 0, st);
  ok(k && k.type === 'forsyning' && k.første && k.sted.navn === 'Nabobygda' && T.tilbud[0] === k && T.tråd && T.tråd.k === k.id, 'første kontrakt: nærmeste sted rundt 2 km, øverst');
  ok(S0.førsteKontrakt(T, 'blå', 0, st) === null, 'første kontrakt lages bare én gang');
  const T2 = S0.ny(L0); ok(S0.førsteKontrakt(T2, 'blå', 0, [], { x: L0.x + 1600, y: L0.y, navn: 'forsyningslageret' }).sted.slag === 'lager', 'reserve uten steder');
  ok(S0.trådSteg(T).id === 'ta', 'tråden starter med «ta»');
  const b = { tatt: false, tropper: 0, framme: false, levert: false, bygg: 3, nyKontrakt: false };
  ok(!S0.oppdaterTråd(T, b).length && S0.trådSteg(T).id === 'ta', 'ingenting gjort');
  b.tatt = true; ok(S0.oppdaterTråd(T, b).join() === 'ta' && S0.trådSteg(T).id === 'tropp', 'tatt -> lag en tropp');
  b.tropper = 1; S0.oppdaterTråd(T, b); ok(S0.trådSteg(T).id === 'send', 'tropp -> send');
  b.framme = true; S0.oppdaterTråd(T, b); ok(S0.trådSteg(T).id === 'hjem', 'framme -> hjem');
  b.levert = true; S0.oppdaterTråd(T, b); ok(S0.trådSteg(T).id === 'bygg' && T.tråd.byggVed === 3, 'levert -> bygg (husker antall bygg)');
  S0.oppdaterTråd(T, b); ok(S0.trådSteg(T).id === 'bygg', 'samme antall bygg: ikke ferdig');
  b.bygg = 4; S0.oppdaterTråd(T, b); ok(S0.trådSteg(T).id === 'neste', 'nytt bygg -> neste kontrakt');
  b.nyKontrakt = true; S0.oppdaterTråd(T, b); ok(S0.trådSteg(T) === null && T.tråd.slutt, 'tråden er ferdig');
  // brudd: hopper fram til «neste»
  const T3 = S0.ny(L0); S0.førsteKontrakt(T3, 'blå', 0, st); S0.oppdaterTråd(T3, { brutt: true }); ok(S0.trådSteg(T3).id === 'neste', 'brutt første kontrakt -> neste');
  // lagring av tråden
  const T4 = S0.fraJSON(S0.tilJSON(T), L0); ok(T4.tråd && T4.tråd.slutt && T4.tilbud.some(q => q.type === 'forsyning') === T.tilbud.some(q => q.type === 'forsyning'), 'tråden lagres');
  // forsyning: godta, hentet, levert i leiren
  const T5 = S0.ny(L0), f = S0.førsteKontrakt(T5, 'blå', 0, st); ok(S0.godta(T5, 'blå', f.id, 10).ok, 'første kontrakt kan tas uten krav');
  S0.steg(T5, 'blå', 20, 1, { [f.id]: { hentet: true } }); ok(f.hentet && f.status === 'aktiv', 'forsyningene hentet');
  const lv = S0.steg(T5, 'blå', 30, 1, { [f.id]: { i: true, hentet: true } }); ok(lv[0].type === 'levert' && lv[0].kr === S0.REGLER.første.betaling && !lv[0].motangrep && !lv[0].rekrutt, 'levert: hele betalingen, ingen motangrep for den første');
  ok(/nødlageret/.test(S0.lappFor(f, {}, 0)), 'lapp for forsyning');
  // (R1-løkka 26. nov) den første kontrakten er trygg: nødlageret ligger der visningen la det (nær leiren, utenfor tettstedene),
  // tittelen har aldri «i nødlageret», bygda som gir jobben er den nærmeste, og giver.by sier hvilket bygdevern som vet om jobben
  const T8b = S0.ny(L0), lag8 = { x: L0.x, y: L0.y + 900 }, f8 = S0.førsteKontrakt(T8b, 'blå', 0, st, lag8);
  ok(f8.sted.slag === 'lager' && f8.sted.x === lag8.x && f8.sted.y === lag8.y && f8.sted.retning === 'nord', 'første kontrakt: lageret ligger der visningen la det');
  ok(f8.tittel === 'Hent nødlageret nord for leiren' && !/i nødlageret/.test(f8.tittel), 'tittel med retning: ' + f8.tittel);
  ok(f8.giver.navn === 'Bygdelaget i Nabobygda' && f8.giver.by === 7 && f8.sted.by === 7, 'giveren er den nærmeste bygda, med id');
  ok(/låven nord for leiren/.test(S0.kravTekst(f8)) && /bygdevernet vet om jobben/.test(S0.kravTekst(f8)), 'kravteksten forklarer lageret');
  const T9b = S0.ny(L0), f9 = S0.førsteKontrakt(T9b, 'blå', 0, [], { x: L0.x - 900, y: L0.y }); ok(f9.tittel === 'Hent nødlageret vest for leiren' && f9.giver.navn === 'Bygdelaget i nærheten', 'uten steder: ' + f9.tittel);
  // gamle lagrede kontrakter med «Hent nødlageret i nødlageret» får ny tittel
  { const g = S0.ny(L0); g.tilbud.push({ id: 'k1', type: 'forsyning', første: true, tittel: 'Hent nødlageret i nødlageret', sted: { navn: 'nødlageret', x: 1, y: 1, slag: 'lager' }, giver: { navn: 'x' } });
    ok(S0.fraJSON(S0.tilJSON(g)).tilbud[0].tittel === 'Hent nødlageret', 'gammel tittel rettes ved lesing'); }
  // et brudd på den første kontrakten: ingen ros, men hva som skjedde og hva du gjør nå
  { const B = S0.ny(L0), fb = S0.førsteKontrakt(B, 'blå', 0, st, lag8); S0.godta(B, 'blå', fb.id, 0); fb.hentet = true; const p0 = S0.side(B, 'blå').rykte.pålitelig;
    const h = S0.steg(B, 'blå', 5, 1, { [fb.id]: { tapt: true } })[0]; ok(h.type === 'brutt' && h.kr === 0, 'første kontrakt brutt: ingen bot');
    ok(S0.side(B, 'blå').rykte.pålitelig === p0 + S0.REGLER.brutt.pålitelig * S0.REGLER.første.bruddRykte, 'første kontrakt brutt: halvt ryktetap');
    S0.oppdaterTråd(B, { brutt: true }); const st9 = S0.trådSteg(B); ok(st9.id === 'neste' && B.tråd.brutt, 'brutt -> neste, merket');
    ok(!/vokst/.test(st9.tekst(fb)) && /gikk galt/.test(st9.tekst(fb)) && /slått ut/.test(st9.tekst(fb)), 'neste etter brudd: ' + st9.tekst(fb));
    ok(/Prøv/.test(st9.lapp(fb)), 'lappen etter brudd'); ok(S0.fraJSON(S0.tilJSON(B), L0).tråd.brutt, 'bruddet huskes'); }
  { const send = S0.TRÅD.find(q => q.id === 'send'); ok(/«Kjør dit»/.test(send.tekst(f8, { knapp: 'Kjør dit' })) && /«Marsjer»/.test(send.tekst(f8)), 'send-steget bruker knappens navn'); }
  // (R1-løkka) de andre selskapene har hvert sitt rykte
  { const R3 = S0.ny(L0); const t = ['blå', 'rød', 'grønn'].map(id => S0.rykteTekst(S0.side(R3, id).rykte)); ok(new Set(t).size === 3, 'tre ulike ryktetekster: ' + t.join(' | ')); }
  // (R1-løkka) eskorter går ikke fra eller til steder et annet selskap holder, når det finnes andre
  { const E = S0.ny(L0); E.sider.blå.rykte.pålitelig = 95; const ss = [{ navn: 'Rødby', x: L0.x + 5000, y: L0.y, slag: 'tettsted', id: 1, eier: 'rød' }, { navn: 'Grønnby', x: L0.x - 5000, y: L0.y, slag: 'tettsted', id: 2, eier: 'grønn' },
      { navn: 'Fribygd', x: L0.x, y: L0.y + 6000, slag: 'tettsted', id: 3 }, { navn: 'Fristad', x: L0.x, y: L0.y - 6000, slag: 'tettsted', id: 4 }];
    let esk = 0, dårlig = 0; for (let i = 0; i < 40; i++) for (const k of S0.lagTilbud(E, 'blå', i * 50, ss, S0.lagRand(i + 11))) if (k.type === 'eskorte') { esk++; if (/Rødby|Grønnby/.test(k.fra.navn + k.sted.navn)) dårlig++; }
    ok(esk > 0 && dårlig === 0, `eskorter uten fiendens steder: ${esk} eskorter, ${dårlig} med fiendens steder`);
    const E2 = S0.ny(L0); E2.sider.blå.rykte.pålitelig = 95; let fare = 0, e2 = 0; for (let i = 0; i < 40; i++) for (const k of S0.lagTilbud(E2, 'blå', i * 50, ss.slice(0, 2), S0.lagRand(i + 5))) if (k.type === 'eskorte') { e2++; if (k.fare && /holdes av et annet selskap/.test(S0.kravTekst(k))) fare++; }
    ok(e2 > 0 && fare === e2, `bare fiendens steder: alle eskorter sier fra (${fare} av ${e2})`); }
  // (R1-løkka) kommunen som gir en jobb i et tettsted, er stedets egen (giver.by)
  { const G = S0.ny(L0); let n = 0, feil = 0; for (let i = 0; i < 30; i++) for (const k of S0.lagTilbud(G, 'blå', i * 50, steder.map(q => ({ ...q, x: q.x - 205000 + L0.x, y: q.y - 6900000 + L0.y })), S0.lagRand(i + 17)))
      if (k.giver.slag !== 'firma' && k.sted.slag === 'tettsted') { n++; if (k.giver.by !== k.sted.id) feil++; }
    ok(n > 0 && feil === 0, `bygd/kommune i tettsted er stedets egen: ${n} kontrakter, ${feil} feil`); }
  // nivåene
  const sd = S0.side(S0.ny(L0), 'blå'); ok(S0.nivå(sd).nr === 1 && S0.nesteNivå(sd).mangler.length === 2, 'nivå 1, to ting mangler for nivå 2');
  sd.sum.levert = 2; sd.rykte.pålitelig = 56; ok(S0.nivå(sd).nr === 2 && S0.nesteNivå(sd).nivå.nr === 3, 'nivå 2');
  sd.sum.levert = 20; sd.rykte.pålitelig = 99; ok(S0.nivå(sd).nr === 4 && S0.nesteNivå(sd) === null, 'øverste nivå');
  // kravene
  const hold = { type: 'hold', nivå: 1 }, esk = { type: 'eskorte', nivå: 1 }, stor = { type: 'hold', nivå: 2 }, sd1 = S0.side(S0.ny(L0), 'blå');
  ok(S0.kanTa(hold, { størsteLag: 3, kjøretøy: 0 }, sd1).ok && !S0.kanTa(hold, { størsteLag: 2, kjøretøy: 0 }, sd1).ok, 'hold krever et lag på 3');
  ok(!S0.kanTa(esk, { størsteLag: 9, kjøretøy: 0 }, sd1).ok && S0.kanTa(esk, { størsteLag: 0, kjøretøy: 1 }, sd1).ok, 'eskorte krever et kjøretøy');
  ok(!S0.kanTa(stor, { størsteLag: 9, kjøretøy: 2 }, sd1).ok && /nivå 2/.test(S0.kanTa(stor, {}, sd1).mangler[0]), 'nivå 2-kontrakt er låst på nivå 1');
  const T6 = S0.ny(L0); T6.tilbud.push({ ...hold, id: 'h1', timer: 10, betaling: 1, bot: 1, sted: { navn: 'X', x: 0, y: 0 }, utløper: 99 });
  const gg = S0.godta(T6, 'blå', 'h1', 0, null, { størsteLag: 1, kjøretøy: 0 }); ok(!gg.ok && /minst 3/.test(gg.grunn) && T6.tilbud.length === 1, 'godta med for lite lag avvises');
  // høyere nivå betaler mer, prisstigningen også
  ok(S0.betaling('hold', { pålitelig: 50 }, 'vanlig', 5000, 6, 1.8) > S0.betaling('hold', { pålitelig: 50 }, 'vanlig', 5000, 6) && S0.betaling('hent', { pålitelig: 50 }, 'vanlig', 5000, 0, 1, 1.2) > S0.betaling('hent', { pålitelig: 50 }, 'vanlig', 5000, 0), 'nivå og prisstigning gir mer');
  // tilbudene får nivå; noen er fra neste nivå
  const T7 = S0.ny(L0); let neste = 0; for (let i = 0; i < 20; i++) neste += S0.lagTilbud(T7, 'blå', i, steder.map(q => ({ ...q, x: q.x - 205000 + L0.x, y: q.y - 6900000 + L0.y })), S0.lagRand(i + 3)).filter(q => q.nivå === 2).length;
  ok(neste > 0 && T7.tilbud.every(q => q.nivå >= 1), 'låste tilbud fra neste nivå: ' + neste);
  // motangrep og rekruttering ved levering (med fast tilfeldighet)
  const T8 = S0.ny(L0); T8.sider.blå.sum.levert = 5; T8.sider.blå.rykte.pålitelig = 80; const ry = { id: 'r1', type: 'rydd', timer: 10, betaling: 1, bot: 1, sted: { navn: 'X', x: 0, y: 0 }, utløper: 99 };
  T8.tilbud.push(ry); S0.godta(T8, 'blå', 'r1', 0); const hv = S0.lever(T8, 'blå', ry, 1, () => .01); ok(hv.motangrep && hv.rekrutt, 'motangrep og rekruttering');
}
console.log(`Alle ${n} testene for selskap.js er ok`);
// (R1-løkka 26. nov) kravet bruker samme vurdering som krigskartet: forsvaret minst like stort som laget = «For svakt» (stopper ikke)
{ const sd = S0.side(S0.ny({ x: 0, y: 0 }), 'blå'), k = { type: 'hold', nivå: 1 };
  const a = S0.kanTa(k, { størsteLag: 4, kjøretøy: 0, forsvar: 5, forsvarTekst: 'bygdevernet 5' }, sd); assert.ok(a.ok && a.advarsel.length === 1 && /For svakt: 4 mann mot et forsvar på ca\. 5/.test(a.advarsel[0]), JSON.stringify(a));
  const b = S0.kanTa(k, { størsteLag: 6, kjøretøy: 0, forsvar: 5 }, sd); assert.ok(b.ok && !b.advarsel.length, 'sterkere enn forsvaret: ingen advarsel');
  console.log('ok   kravet bruker krigskartets vurdering (For svakt)'); }
// (R2-løkka 26. nov) eskortene har risiko: rolig rute betaler lite, meldt bakhold betaler godt og gir som oftest et bakhold
{ let rolig = [], bakhold = [], angrepR = 0, angrepB = 0;
  for (let i = 0; i < 80; i++) { const E = S0.ny(leir); for (const k of S0.lagTilbud(E, 'blå', i * 13, steder, S0.lagRand(i + 3))) { if (k.type !== 'eskorte') continue;
    assert.ok(k.risiko === 'rolig' || k.risiko === 'bakhold', 'eskorten har risiko'); (k.risiko === 'rolig' ? rolig : bakhold).push(k);
    assert.ok(k.bot === Math.round(k.betaling * S0.REGLER.bot / 10000) * 10000, 'bota følger betalingen');
    assert.ok(k.risiko === 'bakhold' ? /bakhold/.test(S0.kravTekst(k)) : /rolig/.test(S0.kravTekst(k)), 'kravteksten sier risikoen');
    S0.godta(E, 'blå', k.id, i * 13, S0.lagRand(i + 99)); if (k.angrep) { if (k.risiko === 'rolig') angrepR++; else angrepB++; } } }
  const snitt = L => L.reduce((s, k) => s + k.betaling, 0) / (L.length || 1);
  assert.ok(rolig.length > 5 && bakhold.length > 5, `begge slag eskorter kommer (${rolig.length} rolige, ${bakhold.length} med bakhold)`);
  assert.ok(snitt(bakhold) >= 2 * snitt(rolig), `bakhold betaler minst dobbelt: ${Math.round(snitt(bakhold))} mot ${Math.round(snitt(rolig))}`);
  assert.ok(angrepB / bakhold.length > .6 && angrepR / rolig.length < .3, `bakholdet kommer som oftest (${angrepB}/${bakhold.length}), sjelden på rolige ruter (${angrepR}/${rolig.length})`);
  console.log(`ok   eskorte etter risiko: ${rolig.length} rolige (snitt ${Math.round(snitt(rolig) / 1000)} 000 kr), ${bakhold.length} med bakhold (snitt ${Math.round(snitt(bakhold) / 1000)} 000 kr)`); }
