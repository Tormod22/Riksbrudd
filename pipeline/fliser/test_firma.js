// Test av spill/firma.js (ut4-firmaer, fase Ø5): registeret, holdning, økonomi og konkurs, nye firmaer, samarbeid (fast kunde, felles
// anlegg, vern), teknologi gjennom handel, pakter med rivalene (våpenhvile i et område, allianse) og at fraksjoner.js respekterer dem,
// høvleriet i produksjon.js og krokene i selskap.js (fast kunde gir tilbud fra firmaet).
// Kjør: node pipeline/fliser/test_firma.js
'use strict';
const assert = require('assert');
const SP = '../../site/dovre-fliser/spill/';
const Fi = require(SP + 'firma.js'), SK = require(SP + 'selskap.js'), Fr = require(SP + 'fraksjoner.js'), PR = require(SP + 'produksjon.js'), LB = require(SP + 'leir.js');
const V = require(SP + 'vare.js'); V.registrer(SK);
let n = 0; const ok = (v, t) => { assert.ok(v, t); n++; };
const leir = { x: 200000, y: 6900000 };
const steder = [{ navn: 'Otta', x: 215000, y: 6900000, slag: 'tettsted', id: 1 }, { navn: 'Dombås', x: 205000, y: 6900000, slag: 'tettsted', id: 2 },
  { navn: 'Lesja', x: 190000, y: 6905000, slag: 'tettsted', id: 3 }, { navn: 'Jora bru', x: 197000, y: 6904000, slag: 'bru', id: 'b1' }];

// ---------- registeret ----------
let F = Fi.ny(leir);
ok(F.firmaer.length === 7 && Fi.finn(F, 'Storlia Tømmer').bransje === 'tømmer', 'de sju firmaene fra selskap.js med bransje');
ok(SK.FIRMA.every(nv => Fi.finn(F, nv)), 'samme navn som Selskap.FIRMA');
ok(Fi.økonomi(Fi.finn(F, 'Storlia Tømmer')) === 'frisk' && Fi.finn(F, 'Storlia Tømmer').holdning === Fi.REGLER.holdning.start, 'starter friske og nøytrale');
// hjemsted: samme sted som varekontraktene (Vare.hjemsted), reserve uten tettsteder
Fi.sikreHjem(F, steder, V.hjemsted);
const st = Fi.finn(F, 'Storlia Tømmer');
ok(st.hjem && st.hjem.navn === V.hjemsted('Storlia Tømmer', steder, leir).navn, 'hjemstedet er det samme som i vare.js: ' + st.hjem.navn);
const F0 = Fi.ny(leir); Fi.sikreHjem(F0, [], V.hjemsted);
ok(F0.firmaer.every(f => f.hjem && f.hjem.reserve && /^bygda /.test(f.hjem.navn)), 'uten tettsteder: en bygd som reserve');
const rh = Fi.finn(F0, 'Gråfjell Frakt').hjem, d = Math.hypot(rh.x - leir.x, rh.y - leir.y);
ok(d >= Fi.REGLER.reserve.min - 1 && d <= Fi.REGLER.reserve.maks + 1, 'reserven ligger 6–14 km unna');
ok(JSON.stringify(Fi.reserveHjem('Gråfjell Frakt', leir)) === JSON.stringify(rh), 'reserven er fast per firma');
Fi.sikreHjem(F0, steder, V.hjemsted);
ok(!Fi.finn(F0, 'Gråfjell Frakt').hjem.reserve, 'når kartet får tettsteder, flytter firmaet dit');

// ---------- holdning fra kontraktene ----------
const k1 = { id: 'k1', status: 'levert', giver: { slag: 'firma', navn: 'Storlia Tømmer' }, betaling: 800000 };
const r1 = Fi.registrerKontrakt(F, k1);
ok(r1 && r1.endring === Fi.REGLER.holdning.levert && st.holdning === 35 + 6 && st.levert === 1, 'levert kontrakt: holdningen stiger');
ok(Fi.registrerKontrakt(F, k1) === null && st.holdning === 41, 'samme kontrakt telles bare én gang');
Fi.registrerKontrakt(F, { id: 'k2', status: 'brutt', grunn: 'frist', giver: { slag: 'firma', navn: 'Storlia Tømmer' }, betaling: 1 });
ok(st.holdning === 31 && st.brutt === 1, 'brutt kontrakt: holdningen synker');
ok(Fi.registrerKontrakt(F, { id: 'k3', status: 'levert', giver: { slag: 'by', navn: 'Kommunen i Otta' } }) === null, 'kontrakter fra byer teller ikke');

// ---------- økonomi og konkurs ----------
const gr = Fi.finn(F, 'Gråfjell Frakt'); let ut = [];
for (let dag = 1; dag <= 20 && !gr.konkurs; dag++) ut = ut.concat(Fi.døgn(F, { nå: dag * 1440, krig: { 'Gråfjell Frakt': { fiendeEier: true, fiendeKm: 1, kamp: true } } }));
ok(gr.konkurs && ut.some(h => h.type === 'konkurs' && h.f === gr), 'krigen rundt hjemstedet gjør firmaet konkurs (etter ' + Math.round(gr.konkurs / 1440) + ' døgn)');
ok(Fi.økonomi(gr) === 'konkurs' && !Fi.aktive(F).includes(gr), 'konkurs firma er ikke aktivt');
const kv = Fi.finn(F, 'Kvernhaug Mølle'); kv.helse = 40; Fi.døgn(F, { nå: 30 * 1440 });
ok(kv.helse > 40, 'uten krig går økonomien mot det normale');
ok(Fi.økonomi({ helse: 40 }) === 'presset' && Fi.økonomi({ helse: 10 }) === 'konkurstruet', 'presset og konkurstruet');
// handel hjelper
const a = Fi.finn(F, 'Tindvik Drivstoff'), b2 = Fi.finn(F, 'Brattli Mineral'); a.helse = b2.helse = 50; a.handelDøgn = 1.5e6;
Fi.døgn(F, { nå: 31 * 1440, krig: { 'Tindvik Drivstoff': { fiendeKm: 2 }, 'Brattli Mineral': { fiendeKm: 2 } } });
ok(a.helse > b2.helse, 'handelen med dere hjelper økonomien');

// ---------- nye firmaer ----------
let F2 = Fi.ny(leir), nye = 0;
for (let dag = 1; dag <= 60; dag++) nye += Fi.døgn(F2, { nå: dag * 1440, rand: Fi.lagRand(dag), byer: [{ id: 1, navn: 'Otta', x: 215000, y: 6900000, trinn: 'handel' }, { id: 2, navn: 'Dombås', x: 1, y: 1, trinn: 'kunde' }] }).filter(h => h.type === 'nytt').length;
const nyF = F2.firmaer.filter(f => f.ny);
ok(nye >= 1 && nyF.length === nye && nyF.every(f => f.hjem.id === 1), `nye firmaer i byer dere har avtale med (${nye} på 60 døgn i Otta, ingen i kundebyen)`);
ok(nyF.length <= Fi.REGLER.nye.perBy && nyF.every(f => f.holdning === Fi.REGLER.holdning.ny), 'høyst to per by, og de starter med bedre holdning');

// ---------- samarbeid ----------
F = Fi.ny(leir); Fi.sikreHjem(F, steder, V.hjemsted); const s = Fi.finn(F, 'Storlia Tømmer');
ok(!Fi.kanSamarbeid(F, s, 'fast').ok && Fi.kanSamarbeid(F, s, 'fast').mangler.length === 2, 'fast kunde krever holdning og leverte kontrakter');
for (let i = 0; i < 4; i++) Fi.registrerKontrakt(F, { id: 'L' + i, status: 'levert', giver: { slag: 'firma', navn: 'Storlia Tømmer' }, betaling: 5e5 });
ok(s.holdning === 59 && Fi.kanSamarbeid(F, s, 'fast').ok, 'etter fire leveranser: fast kunde er mulig');
const tb = Fi.døgn(F, { nå: 1440 }).filter(h => h.type === 'samarbeidTilbud');
ok(tb.some(h => h.f === s && h.samarbeid === 'fast'), 'firmaet ringer og tilbyr fast kunde');
ok(Fi.døgn(F, { nå: 2880 }).filter(h => h.type === 'samarbeidTilbud' && h.f === s && h.samarbeid === 'fast').length === 0, '… bare én gang');
ok(Fi.inngå(F, s, 'fast', 3000).ok && s.fast, 'fast kunde inngått');
ok(!Fi.inngå(F, s, 'fast', 3000).ok, 'ikke to ganger');
Fi.fastTilbud(s, 'kx'); ok(Fi.fastSvar(s, 'tatt') === 'ok' && s.fast.tatt === 1, 'et tatt tilbud teller');
ok(Fi.fastSvar(s, 'utløpt') === 'utløpt' && Fi.fastSvar(s, 'utløpt') === 'utløpt' && Fi.fastSvar(s, 'utløpt') === 'slutt' && s.fast === null, 'tre ubesvarte på rad: de slutter');
// felles anlegg
s.holdning = 70; const fv = Fi.vilkår(s, 'felles');
ok(fv.anlegg === 'sagbruk' && fv.pris === 3e6, 'felles sagbruk: dere betaler halve prisen (3 mill.)');
const fi = Fi.inngå(F, s, 'felles', 4000); ok(fi.ok && fi.kostnad === 3e6, 'felles anlegg inngått');
let kr = Fi.døgn(F, { nå: 5000 }).filter(h => h.type === 'felles' && h.f === s).reduce((t, h) => t + h.kr, 0);
ok(kr === Fi.REGLER.ANLEGG.tømmer.overskudd / 2, 'halve overskuddet hvert døgn (' + kr + ' kr)');
s.helse = 40; kr = Fi.døgn(F, { nå: 6500, rand: () => .99 }).filter(h => h.type === 'felles' && h.f === s).reduce((t, h) => t + h.kr, 0);
ok(kr < Fi.REGLER.ANLEGG.tømmer.overskudd / 2, 'presset firma: mindre overskudd');
s.helse = 15; const solgt = Fi.døgn(F, { nå: 8000, rand: () => .01 }).find(h => h.type === 'solgt');
ok(solgt && s.felles.rival, 'konkurstruet firma selger sin del til en rival: ' + Fi.RIVALER[s.felles.rival]);
ok(!Fi.kanSamarbeid(F, Fi.finn(F, 'Gråfjell Frakt'), 'felles').ok && Fi.kanSamarbeid(F, Fi.finn(F, 'Gråfjell Frakt'), 'felles').ingen, 'fraktfirmaet har ikke noe anlegg');
// vern
const dal = Fi.finn(F, 'Dalsnes Kraftlag'); dal.holdning = 45; dal.levert = 2;
ok(Fi.inngå(F, dal, 'vern', 10000).ok, 'vern inngått');
for (let t = 0; t < 24; t++) Fi.vernTime(dal, t < 20 ? 3 : 0);
let h = Fi.døgn(F, { nå: 11000 }).find(q => q.type === 'vern' && q.f === dal);
ok(h && h.holdt && h.kr === Fi.REGLER.samarbeid.vern.kr && dal.vernDøgn === 1, 'vern holdt i 20 av 24 timer: betaling');
for (let t = 0; t < 24; t++) Fi.vernTime(dal, t < 10 ? 3 : 1);
h = Fi.døgn(F, { nå: 12000 }).find(q => q.type === 'vern' && q.f === dal);
ok(h && !h.holdt && h.kr === 0 && dal.vern.brudd === 1, 'for få mann: brudd og ingen betaling');
Fi.døgn(F, { nå: 13000 }); const opp = Fi.døgn(F, { nå: 14000 }).find(q => q.type === 'vernOppsagt');
ok(opp && dal.vern === null, 'tre brudd: firmaet sier opp vernet');
// svik
const før = Fi.finn(F, 'Ytterø Sjømat').holdning; s.helse = 60; s.felles = { fra: 0, anlegg: 'sagbruk', betalt: 3e6, tjent: 0, rival: null };
const sv = Fi.avslutt(F, s, 'felles', { svik: true });
ok(sv.gevinst === 2.1e6 && s.felles === null, 'svik: dere selger andelen og får 70 % tilbake nå');
ok(Fi.finn(F, 'Ytterø Sjømat').holdning === før + Fi.REGLER.holdning.sviktAndre, 'svik koster holdning hos alle de andre');

// ---------- teknologi ----------
F = Fi.ny(leir); const S2 = Fi.finn(F, 'Storlia Tømmer');
let T = Fi.tekno(F, { harSag: true }).find(q => q.id === 'høvleri');
ok(!T.ok && T.mangler.length === 2, 'høvleriet er låst: ' + T.mangler.join('; '));
S2.holdning = 70; S2.levert = 4; ok(Fi.låsOpp(F, 100, { harSag: true }).some(q => q.id === 'høvleri'), 'Storlia låser opp høvleriet');
ok(!Fi.brukTekno(F, 'høvleri', { harSag: false }).ok, 'høvleriet trenger et sagbruk');
const bh = Fi.brukTekno(F, 'høvleri', { harSag: true }); ok(bh.ok && bh.pris === 1.5e6 && Fi.tekno(F, {}).find(q => q.id === 'høvleri').iBruk, 'høvleriet tas i bruk for 1,5 mill.');
const Y = Fi.finn(F, 'Ytterø Sjømat'); Y.holdning = 70; Y.levert = 3; Fi.låsOpp(F, 200, {});
ok(Fi.tekno(F, {}).find(q => q.id === 'fryselager').låstOpp && !Fi.brukTekno(F, 'fryselager', {}).ok, 'fryselageret: låst opp, men kan ikke bygges ennå');
const D = Fi.finn(F, 'Dalsnes Kraftlag'); D.holdning = 61; D.vernDøgn = 5; ok(Fi.låsOpp(F, 300, {}).some(q => q.id === 'aggregat'), 'Dalsnes: bedre aggregat (via vern)');

// ---------- høvleriet i produksjon.js ----------
const L = LB.ny(); L.lager.tømmer = 50; const sag = { id: 1, type: 'sagbruk', hp: 1, igjen: 0, nivå: 1 }; L.bygg.push(sag);
const P1 = PR.ny(), før1 = L.lager.tre || 0; PR.steg(P1, L, 60, { kraft: 3 }); const vanlig = (L.lager.tre || 0) - før1;
sag.høvleri = true; const før2 = L.lager.tre; PR.steg(P1, L, 60, { kraft: 3 }); const høvlet = L.lager.tre - før2;
ok(vanlig > 0 && Math.abs(høvlet / vanlig - 1.4) < .01, `høvleriet gir 1,4 × planker (${vanlig.toFixed(2)} -> ${høvlet.toFixed(2)} m³)`);

// høvleriet virker også når bærerne mater maskinen (F3: ctx.mating / kraftPer)
{ const L2 = LB.ny(), s2 = { id: 7, type: 'sagbruk', hp: 1, igjen: 0, nivå: 1 }; L2.bygg.push(s2); const P2 = PR.ny();
  const kjør = () => { const MT = { 7: { inn: { tømmer: 4 }, ut: {} } }; PR.steg(P2, L2, 60, { mating: MT, kraftPer: { 7: 3 } }); return MT[7].ut.tre || 0; };
  const a1 = kjør(); s2.høvleri = true; const a2 = kjør();
  ok(a1 > 0 && Math.abs(a2 / a1 - 1.4) < .01, `høvleriet med mating: ${a1.toFixed(2)} -> ${a2.toFixed(2)} m³ planker i utmatingen`); }

// ---------- pakter med rivalene ----------
F = Fi.ny(leir);
const pp = Fi.paktPris(F, 'hvile', 'rød', 7, 10000), pg = Fi.paktPris(F, 'hvile', 'grønn', 7, 10000);
ok(pp > pg && pg === 7 * (150000 + 10 * 15000), 'våpenhvile: Ravnsund tar mer betalt enn Mosevakt (' + pp + ' / ' + pg + ')');
const ih = Fi.inngåPakt(F, 'hvile', 'rød', { r: 10000, døgn: 7 }, 0);
ok(ih.ok && ih.p.slutt === 7 * 1440 && ih.pris === pp, 'våpenhvile med Ravnsund i 7 døgn innen 10 km');
ok(Fi.iPakt(F.pakter, 'rød', 'blå', leir.x + 5000, leir.y, 100) && !Fi.iPakt(F.pakter, 'rød', 'blå', leir.x + 15000, leir.y, 100), 'gjelder bare i området');
ok(!Fi.iPakt(F.pakter, 'grønn', 'blå', leir.x, leir.y, 100) && !Fi.iPakt(F.pakter, 'rød', 'grønn', leir.x, leir.y, 100), 'bare mellom dere og Ravnsund');
ok(!Fi.iPakt(F.pakter, 'rød', 'blå', leir.x, leir.y, 8 * 1440), 'over når døgnene er ute');
ok(!Fi.iPakt(F.pakter, 'rød', 'blå', undefined, undefined, 100), 'uten sted: våpenhvilen er ikke fred overalt');
// allianse
ok(!Fi.kanPakt(F, 'allianse', 'grønn', 100, { pålitelig: 60 }).ok, 'ingen allianse med Mosevakt mens dere har våpenhvile med Ravnsund (begge sider)');
let F3 = Fi.ny(leir);
ok(!Fi.kanPakt(F3, 'allianse', 'grønn', 0, { pålitelig: 40 }).ok, 'allianse krever «pålitelig» 50');
const al = Fi.inngåPakt(F3, 'allianse', 'grønn', { døgn: 14 }, 0, { pålitelig: 60 });
ok(al.ok && al.p.mot === 'rød' && Fi.iPakt(F3.pakter, 'grønn', 'blå', undefined, undefined, 10) && Fi.alliert(F3.pakter, 'grønn', 10), 'allianse med Mosevakt mot Ravnsund: fred overalt');
// de bryter: sterkere enn dere gjør det mer sannsynlig
let bryt = 0, brytSterk = 0;
for (let i = 0; i < 400; i++) { const G = Fi.ny(leir); Fi.inngåPakt(G, 'hvile', 'rød', { r: 5000, døgn: 14 }, 0); if (Fi.paktDøgn(G, 1440, { rand: Fi.lagRand(i + 1), styrke: { blå: 10, rød: 10 } }).length) bryt++;
  const G2 = Fi.ny(leir); Fi.inngåPakt(G2, 'hvile', 'rød', { r: 5000, døgn: 14 }, 0); if (Fi.paktDøgn(G2, 1440, { rand: Fi.lagRand(i + 1), styrke: { blå: 10, rød: 30 } }).length) brytSterk++; }
ok(bryt > 5 && brytSterk > bryt * 1.5, `rivalen bryter av og til (${bryt} av 400), oftere når den er mye sterkere (${brytSterk})`);
// dere bryter: svik
const F4 = Fi.ny(leir); const p4 = Fi.inngåPakt(F4, 'hvile', 'rød', { r: 5000, døgn: 7 }, 0).p, h4 = Fi.finn(F4, 'Storlia Tømmer').holdning;
const b4 = Fi.brytPakt(F4, p4.id, 'blå', 100);
ok(b4.svik && b4.ild.faktor > 1 && b4.pålitelig < 0 && Fi.finn(F4, 'Storlia Tømmer').holdning < h4, 'dere bryter: overraskelse nå, rykte og holdning ned');
ok(!Fi.kanPakt(F4, 'hvile', 'rød', 200).ok && Fi.paktPris(F4, 'hvile', 'rød', 7, 5000) === 2 * Fi.paktPris(Fi.ny(leir), 'hvile', 'rød', 7, 5000), 'etter et brudd: pause og dobbel pris');

// ---------- fraksjoner.js respekterer pakten ----------
const vern = (x, y) => Fi.iPakt(F.pakter, 'rød', 'blå', x, y, 100);
const by = (id, navn, x, y, eier) => ({ id, navn, x, y, folk: 2000, eier, inni: (X, Y) => Math.hypot(X - x, Y - y) < 400 });
const lag = { navn: 'Ravnsunds 1. lag', side: 'rød', x: leir.x + 3000, y: leir.y, menn: Array.from({ length: 8 }, () => ({ hp: 1 })) };
const byer = [by(1, 'Blåby', leir.x + 4000, leir.y + 500, 'blå'), by(2, 'Grønnby', leir.x + 30000, leir.y, 'grønn'), by(9, 'Hjem', leir.x + 2000, leir.y + 8000, 'rød')];
const uten = Fr.velg(lag, { side: 'rød', byer, fiender: [], venner: [lag], hjem: [0, 0] });
ok(uten.hva === 'ta' && uten.mål === 1, 'uten våpenhvile går Ravnsund mot ditt tettsted: ' + uten.tekst);
const med = Fr.velg(lag, { side: 'rød', byer, fiender: [], venner: [lag], hjem: [0, 0], vern });
ok(med.mål !== 1, 'med våpenhvile tar de ikke ditt tettsted i området: ' + med.tekst);
const medLeir = Fr.velg({ ...lag, x: leir.x + 1500 }, { side: 'rød', byer: [by(9, 'Hjem', leir.x + 2000, leir.y + 8000, 'rød')], fiender: [], venner: [], hjem: [0, 0], vern, leir: { x: leir.x, y: leir.y, navn: 'leiren' } });
ok(medLeir.hva !== 'leir', 'og de rykker ikke mot leiren: ' + medLeir.tekst);
const angrep = { hva: 'angrip', x: leir.x + 1000, y: leir.y, tekst: 'angriper Lag 1' };
ok(Fr.respekterPakt(angrep, lag, vern, () => true).hva === 'hold' && Fr.respekterPakt({ ...angrep, x: leir.x + 20000 }, lag, vern, () => true).hva === 'angrip', 'respekterPakt: angrep i området stoppes, utenfor ikke');
const felles = Fr.velg({ ...lag, side: 'grønn', x: leir.x + 16000, y: leir.y }, { side: 'grønn', byer: [by(1, 'Blåby', leir.x + 14000, leir.y, 'blå'), by(5, 'Rødby', leir.x + 19500, leir.y, 'rød')], fiender: [], venner: [], hjem: [0, 0], felles: 'rød',
  vern: (x, y) => Fi.iPakt(F3.pakter, 'grønn', 'blå', x, y, 10) });
ok(felles.mål === 5, 'i alliansen går Mosevakt mot Ravnsunds tettsted (felles mål): ' + felles.tekst);

// ---------- selskap.js: tilbud fra et bestemt firma (fast kunde) og firmalista ----------
const S = SK.ny(leir); const nyeT = SK.lagTilbud(S, 'blå', 0, steder, SK.lagRand(5), { antall: 1, giver: { slag: 'firma', navn: 'Brattli Mineral' }, faktor: 1.15 });
ok(nyeT.length === 1 && nyeT[0].giver.navn === 'Brattli Mineral', 'fast kunde: ett tilbud fra firmaet');
const S5 = SK.ny(leir), vanligT = SK.lagTilbud(S5, 'blå', 0, steder, SK.lagRand(5), { antall: 1, giver: { slag: 'firma', navn: 'Brattli Mineral' } });
ok(Math.abs(nyeT[0].betaling / vanligT[0].betaling - 1.15) < .02, 'med bedre betaling (× 1,15)');
const SA = SK.ny(leir), SB = SK.ny(leir); SK.lagTilbud(SA, 'blå', 0, steder, SK.lagRand(9)); SK.lagTilbud(SB, 'blå', 0, steder, SK.lagRand(9), {});
ok(JSON.stringify(SA.tilbud) === JSON.stringify(SB.tilbud), 'uten de nye valgene er tilbudene de samme som før');
SK.firmaKilde = () => ['Nordbø Bakeri']; let alle = []; for (let i = 0; i < 30; i++) { const Q = SK.ny(leir); alle = alle.concat(SK.lagTilbud(Q, 'blå', 0, steder, SK.lagRand(100 + i))); } SK.firmaKilde = null;
ok(alle.filter(k => k.giver.slag === 'firma').every(k => k.giver.navn === 'Nordbø Bakeri') && alle.some(k => k.giver.slag === 'firma'), 'firmaKilde: tilbudene kommer fra firmaene som finnes');

// ---------- lagring ----------
const G = Fi.ny(leir); Fi.sikreHjem(G, steder, V.hjemsted); Fi.inngåPakt(G, 'hvile', 'grønn', { r: 5000, døgn: 3 }, 0); const gs = Fi.finn(G, 'Storlia Tømmer'); gs.holdning = 70; gs.levert = 3; Fi.inngå(G, gs, 'fast', 10);
G.firmaer.push(Fi.nyttFirma('Furuli Bygg', { ny: true, hjem: { navn: 'Otta', x: 1, y: 2, id: 1 } }));
const G2 = Fi.fraJSON(JSON.parse(JSON.stringify(Fi.tilJSON(G))));
ok(G2 && JSON.stringify(Fi.tilJSON(G2)) === JSON.stringify(Fi.tilJSON(G)), 'lagring: likt etter tilJSON/fraJSON');
G.fastÅpne = [{ id: 'k9', firma: 'Storlia Tømmer' }]; G.overraskelse = { side: 'rød', faktor: 1.3, til: 500 };
const G3 = Fi.fraJSON(JSON.parse(JSON.stringify(Fi.tilJSON(G)))); ok(G3.fastÅpne[0].id === 'k9' && G3.overraskelse.til === 500, 'lagring: faste tilbud ute og overraskelsen huskes');
ok(Fi.fraJSON({ versjon: 99 }) === null && Fi.fraJSON(null) === null, 'ukjent lagring gir null');

console.log(`test_firma: ${n} sjekker ok`);
