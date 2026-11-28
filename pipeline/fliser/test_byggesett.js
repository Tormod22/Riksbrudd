// Test for spill/byggesett.js (fritt byggesett, versjon 3 – B4): node pipeline/fliser/test_byggesett.js
const S = '../../site/dovre-fliser/spill/';
const LB = require(S + 'leir.js'), BS = require(S + 'byggesett.js'), BG = require(S + 'bygning.js'), Vei = require(S + 'vei.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const O = { ox: 1000, oy: 2000 }, U = BS.U;
let neste = 1; const legg = (deler, liste) => { for (const r of liste) { if (r.feil) continue; if (r.bytt) { const k = deler.findIndex(d => d.id === r.bytt); if (k >= 0) deler.splice(k, 1); } deler.push({ ...r.d, id: neste++ }); } return deler; };
const P = (x, y) => [O.ox + x, O.oy + y];

// delene finnes i Leir.BYGG (gamle og nye størrelser) og prisen følger stoffet og størrelsen
ok(BS.U === 1.2 && BS.G === 1.2 && BS.ETASJER === 4, 'rutenett 1,2 m og fire etasjer');
ok(LB.BYGG.bs_vegg_tre && LB.BYGG.bs_vegg_tre_1 && LB.BYGG.bs_vegg_blikk_port_4 && LB.BYGG.bs_trapp_1 && LB.BYGG.bs_søyle_stål_1 && LB.BYGG.bs_bjelke_stål_4, `${Object.keys(BS.DELER).length} typer i Leir.BYGG`);
ok(BS.DELER.bs_vegg_tre_1.pris < BS.DELER.bs_vegg_betong_1.pris && BS.DELER.bs_vegg_betong_1.tid > BS.DELER.bs_vegg_tre_1.tid && BS.DELER.bs_vegg_blikk_1.tid < BS.DELER.bs_vegg_tre_1.tid, 'tre billig og raskt, betong dyrere og tregere, blikk raskest');
ok(BS.DELER.bs_tregulv_4.pris === BS.DELER.bs_tregulv_1.pris * 16 && BS.DELER.bs_vegg_tre_4.pris === BS.DELER.bs_vegg_tre_1.pris * 4, 'hallstørrelsen (4,8 m) koster 16 × (ruter) og 4 × (vegger)');
ok(BS.DELER.bs_vegg_tre.pris === 20000 && BS.DELER.bs_vegg_tre.s === 2, 'gamle deler (2,4 m) har samme pris som før');

// rutenettet: 1,2 m-kanter, rader, 4,8 m-hall
const k = BS.kantVed(O, O.ox + .6, O.oy + .1); ok(k.a === 'x' && k.i === 0 && k.j === 0, 'nærmeste kant (1,2 m): langs x');
ok(BS.rad(O, 'bs_vegg_tre_1', P(.05, .05), P(4.8, .1)).length === 4, 'en rad på 4,8 m = fire vegger på 1,2 m');
ok(BS.rad(O, 'bs_vegg_tre_4', P(.05, .05), P(9.6, .1)).length === 2, 'hallrutenettet: 9,6 m = to vegger på 4,8 m');
ok(BS.rad(O, 'bs_fundament_1', P(.1, .1), P(3.5, 2.3)).length === 6, 'gulv 3 × 2 ruter');

// et lite hus: gulv, vegger, tak, dør – en vegg står på 1,2 m-rutenettet
let D = [];
legg(D, BS.forslag(D, 'bs_fundament_1', BS.rad(O, 'bs_fundament_1', P(.1, .1), P(3.5, 3.5))));
legg(D, BS.forslag(D, 'bs_vegg_tre_1', BS.rad(O, 'bs_vegg_tre_1', P(0, 0), P(3.6, 3.6))));
ok(D.length === 9 + 12 && D.filter(d => d.a).every(d => d.n === 0 && d.s === 1), '3 × 3 gulv og 12 vegger på 1,2 m i 1. etasje');
let r = BS.forslag(D, 'bs_tak_sal_1', BS.rad(O, 'bs_tak_sal_1', P(.1, .1), P(3.5, 3.5))); ok(r.every(q => !q.feil && q.d.n === 1), 'saltaket legger seg oppå veggene');
legg(D, r); ok(BS.rom(D).length === 1 && !BS.rom(D)[0].brukbart, 'lukket rom uten dør: ikke brukbart');
r = BS.forslag(D, 'bs_vegg_tre_dør_1', [BS.kantVed(O, O.ox + 1.8, O.oy + .05)]); ok(r[0].bytt && r[0].d.n === 0, 'døra bytter ut veggen i 1. etasje');
legg(D, r); let R = BS.rom(D); ok(R.length === 1 && R[0].brukbart && R[0].dører === 1 && Math.abs(R[0].areal - 12.96) < .1 && R[0].senger === 1, `rom med dør: ${R[0] && R[0].areal} m², ${R[0] && R[0].senger} seng`);
ok(R[0].type && R[0].type.id === 'soverom', 'romType: seng = soverom');
ok(BS.romType({ senger: 6, bruk: 'soverom' }).id === 'sovesal' && BS.romType({ senger: 0, bruk: 'lager' }).id === 'lager', 'romType: mange senger = sovesal, ellers bruken');

// spennet: et for bredt tretak avvises med grunnen, og godtas med en søylerad (Bygning.ras)
D = [];
legg(D, BS.forslag(D, 'bs_tregulv_1', BS.rad(O, 'bs_tregulv_1', P(.1, .1), P(8.3, 8.3))));
legg(D, BS.forslag(D, 'bs_vegg_tre_1', BS.rad(O, 'bs_vegg_tre_1', P(0, 0), P(8.4, 8.4))));
r = BS.forslag(D, 'bs_tak_flatt_1', BS.rad(O, 'bs_tak_flatt_1', P(.1, .1), P(8.3, 8.3)));
ok(r.every(q => /Spennet er 8,4 m/.test(q.feil || '') && /søylerad/.test(q.feil)), `tretak over 8,4 m avvises: «${r[0].feil}»`);
ok(!BS.forslag(D, 'bs_tak_blikk_1', BS.rad(O, 'bs_tak_blikk_1', P(.1, .1), P(8.3, 8.3))).some(q => q.feil), 'blikktak (stål, 12 m) over 8,4 m holder');
legg(D, BS.forslag(D, 'bs_søyle_tre_1', BS.rad(O, 'bs_søyle_tre_1', P(4.8, 0), P(4.8, 8.4))));
ok(D.filter(d => BS.kat(d) === 'søyle').length === 3, 'en søylerad (tre søyler)');
r = BS.forslag(D, 'bs_tak_flatt_1', BS.rad(O, 'bs_tak_flatt_1', P(.1, .1), P(8.3, 8.3))); ok(r.every(q => !q.feil), 'med søylerad holder tretaket');
{ const E = legg(D.slice(), r), søyle = E.find(d => BS.kat(d) === 'søyle' && d.j === 4), rr = BS.rasVedRiving(E, new Set([søyle.id]));
  ok(rr && rr.m2 > 0, `river du søylen midt i, raser taket (ca. ${rr && rr.m2} m²)`);
  ok(!BS.rasVedRiving(E, new Set([E.find(d => BS.kat(d) === 'søyle' && d.j === 0).id])), 'søylen i veggen kan rives uten ras'); }
// også uten gulv (tak rett på veggene) sjekkes spennet
{ let E = []; legg(E, BS.forslag(E, 'bs_vegg_tre_1', BS.rad(O, 'bs_vegg_tre_1', P(40, 0), P(48.4, 8.4))));
  ok(BS.forslag(E, 'bs_tak_sal_1', BS.rad(O, 'bs_tak_sal_1', P(40.1, .1), P(48.3, 8.3))).every(q => /Spennet/.test(q.feil || '')), 'saltak over 8,4 m uten gulv avvises også'); }
// bjelke: hviler på veggene i begge ender
const bj = BS.forslag(D, 'bs_bjelke_tre_1', BS.rad(O, 'bs_bjelke_tre_1', P(0, 3.6), P(8.4, 3.6))); ok(bj.length === 7 && bj.every(q => !q.feil), 'en bjelke tvers over rommet (7 stykker) hviler på veggene');
ok(/hvile/.test(BS.plassering([], 'bs_bjelke_tre_1', { a: 'x', i: 50, j: 50 }).feil || ''), 'bjelke i lufta avvises');

// fire etasjer med trapp: tak i 2. etasje kobles med trapp (veien går opp)
D = [];
legg(D, BS.forslag(D, 'bs_fundament_1', BS.rad(O, 'bs_fundament_1', P(.1, .1), P(4.7, 3.5))));
for (let e = 0; e < 4; e++) legg(D, BS.forslag(D, 'bs_vegg_betong_1', BS.rad(O, 'bs_vegg_betong_1', P(0, 0), P(4.8, 3.6)), { nivå: e }));
ok(D.filter(d => d.a).length === 14 * 4 && Math.max(...D.map(d => d.n)) === 3, 'vegger i fire etasjer');
ok(/4 etasjer/.test(BS.plassering(D, 'bs_vegg_betong_1', { a: 'x', i: 0, j: 0 }).feil || ''), 'femte vegg oppå hverandre: høyst fire etasjer');
legg(D, BS.forslag(D, 'bs_vegg_betong_dør_1', [BS.kantVed(O, O.ox + 1.8, O.oy + .05)]));
const tr = BS.plassering(D, 'bs_trapp_1', { i: 0, j: 1, r: 0 }); ok(!tr.feil && tr.d.n === 0, 'trapp i 1. etasje');
legg(D, [tr]);
r = BS.forslag(D, 'bs_betongdekke_1', BS.rad(O, 'bs_betongdekke_1', P(.1, .1), P(4.7, 3.5)), { nivå: 1 });
ok(r.filter(q => q.feil).length === 3 && /trappa/.test(r.find(q => q.feil).feil), 'dekket over trappa blir et hull (tre ruter avvist)');
legg(D, r.filter(q => !q.feil));
legg(D, BS.forslag(D, 'bs_tak_betong_1', BS.rad(O, 'bs_tak_betong_1', P(.1, .1), P(4.7, 3.5)), { nivå: 1 }));
R = BS.rom(D); const opp = R.find(q => q.etasje === 1);
ok(R.length === 2 && opp && opp.brukbart && opp.trapp && opp.ruter === 12, `rom i 2. etasje nås med trappa (${opp && opp.ruter} ruter, brukbart ${opp && opp.brukbart})`);
const m = BG.fraByggesett(D, O); ok(m && m.trapper.length === 1 && !m.trapper[0].antatt && m.trapper[0].fra === 1 && m.trapper[0].til === 2, 'Bygning-modellen har trappa (1 → 2)');
const L4 = LB.ny(); L4.bygg = D.map(d => ({ id: d.id, type: d.type, x: 0, y: 0, ret: 0, igjen: 0, totalt: 1, hp: 1, nivå: 1, bs: BS.plassFor(d) }));
const K = Vei.lag({ leir: L4, opphav: O, start: [O.ox + 2.4, O.oy - 3], prøve: true });
const v = Vei.finn({ x: O.ox + 2.4, y: O.oy - 3 }, { x: O.ox + 2.4, y: O.oy + 3, e: 2, hus: 'leir' }, { kart: K });
ok(v.ok && v.punkter.some(p => p.e === 2), `Vei.finn går opp trappa til 2. etasje (${v.ok ? Math.round(v.lengde) + ' m' : v.grunn})`);

// maler: hytte, brakke, betongbu og hall i det nye rutenettet; hallen raser uten søylerad
for (const [navn, n] of [['hytte', 48], ['brakke', null], ['bunker', null], ['hall', null]]) { const f = BS.husForslag([], navn, 10, 10, 0), H2 = legg([], f), Rh = BS.rom(H2);
  ok(f.every(q => !q.feil) && (!n || f.length === n) && Rh.length === 1 && Rh[0].brukbart, `${BS.HUS[navn].navn}: ${f.length} deler, ett brukbart rom (${Rh[0] && Rh[0].areal} m²)`); }
ok(BS.husForslag([], 'hall', 0, 0, 1).every(q => !q.feil), 'hallen dreid');
const utenSøyler = { ...BS.HUS.hall, deler: BS.HUS.hall.deler.filter(d => BS.kat(d) !== 'søyle') };
ok(BS.husForslag([], utenSøyler, 0, 0, 0).some(q => /Spennet/.test(q.feil || '')), 'hallen uten søylerad: taket avvises (spennet)');
ok(BS.husForslag(legg([], BS.husForslag([], 'hytte', 10, 10, 0)), 'hytte', 10, 10, 0).every(q => q.feil), 'hytte oppå hytta: ingenting får plass');
// eget bygg som mal, dreid
const egen = BS.tilMal(legg([], BS.husForslag([], 'brakke', 3, 3, 0)), 'Min brakke'); ok(egen && egen.w === 8 && egen.h === 5 && BS.malGyldig(egen), 'eget bygg blir en mal (8 × 5 ruter)');
ok(BS.husForslag([], egen, 40, 40, 1).every(q => !q.feil), 'egen mal lagt ut dreid');

// gamle byggesett-bygg (2,4 m, versjon 2) virker etter lasting
const L2 = LB.ny(); let id = 1; const gml = (type, i, j, a, n, r) => L2.bygg.push({ id: id++, type, x: 0, y: 0, ret: 0, igjen: 0, totalt: 1, hp: 1, nivå: 1, bs: { i, j, a, n, ...(r !== undefined ? { r } : {}) } });
for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) gml('bs_fundament', i, j, null, 0);
for (let i = 0; i < 4; i++) { gml(i === 1 ? 'bs_vegg_tre_dør' : 'bs_vegg_tre', i, 0, 'x', 0); gml('bs_vegg_tre', i, 3, 'x', 0); }
for (let j = 0; j < 3; j++) { gml('bs_vegg_tre', 0, j, 'y', 0); gml('bs_vegg_tre_vindu', 4, j, 'y', 0); }
for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) gml('bs_tak_sal', i, j, null, 1, 0);
const L3 = LB.fraJSON(LB.tilJSON(L2)), dl = BS.fraLeir(L3, LB), Rg = BS.rom(dl, { '0:0,0': 'lager' });
ok(dl.length === L2.bygg.length && dl[0].i === 0 && dl[1].j === 2 && dl.every(d => d.s === 2), 'gamle deler leses i 1,2 m-ruter (× 2) med størrelse 2,4 m');
ok(Rg.length === 1 && Rg[0].brukbart && Math.abs(Rg[0].areal - 69.1) < .2 && Rg[0].nøkkel === '0:0,0' && Rg[0].bruk === 'lager', `gammel brakke er fortsatt et rom (${Rg[0] && Rg[0].areal} m², nøkkelen som før – L.romBruk virker)`);
ok(LB.plasser(L3) === 8 + 0 || LB.plasser(L3) >= 0, 'Leir.plasser virker med gamle deler');
ok(BS.rom(dl).length === 1 && BS.rom(dl)[0].senger === 8, 'den gamle brakka har fortsatt 8 senger');
// nye 1,2 m-deler inntil den gamle brakka
const dør = BS.plassering(dl, 'bs_vegg_tre_dør_1', { a: 'x', i: 2, j: 0 }); ok(/større/.test(dør.feil || ''), 'en ny dør i en gammel 2,4 m-vegg: «riv den først»');
const til = BS.forslag(dl, 'bs_fundament_1', BS.rad(O, 'bs_fundament_1', P(9.7, .1), P(10.7, 2.3))); ok(til.every(q => !q.feil), 'nye gulv på 1,2 m inntil den gamle brakka');
ok(BG.fraByggesett(dl, O).etasjer.length >= 1, 'Bygning.fraByggesett leser gamle deler');
ok(LB.fraJSON(JSON.stringify({ versjon: 1, bygg: [{ id: 1, type: 'brakke', x: 0, y: 0, igjen: 0 }] })).bygg.length === 1, 'gamle leirer (versjon 1) lastes fortsatt');
// plassen som lagres: g = 1
ok(BS.plassFor({ i: 3, j: 4, a: 'x', n: 1 }).g === 1 && BS.fraBygg({ id: 9, type: 'bs_vegg_tre_1', bs: { g: 1, i: 3, j: 4, a: 'x', n: 1 } }).i === 3, 'nye deler lagres med g = 1 og leses uten omgjøring');

console.log(feil ? `\n${feil} FEIL` : '\nalt ok'); process.exit(feil ? 1 : 0);
