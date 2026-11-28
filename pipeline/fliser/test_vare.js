// Test av spill/vare.js (ut3-varekontrakt, fase Ø2): lever, leveranseavtale, kjøpsavtale, frakt med Gråfjell og Storlias første kontrakt.
// Kjør: node pipeline/fliser/test_vare.js
'use strict';
const assert = require('assert');
const SK = require('../../site/dovre-fliser/spill/selskap.js');
const V = require('../../site/dovre-fliser/spill/vare.js');
V.registrer(SK);
let n = 0; const ok = (v, t) => { assert.ok(v, t); n++; };
const leir = { x: 200000, y: 6900000 };
const steder = [{ navn: 'Otta', x: 215000, y: 6900000, slag: 'tettsted', id: 1 }, { navn: 'Dombås', x: 205000, y: 6900000, slag: 'tettsted', id: 2 },
  { navn: 'Jora bru', x: 197000, y: 6904000, slag: 'bru', id: 'b1' }, { navn: 'For langt', x: 300000, y: 6900000, slag: 'tettsted', id: 3 }];
const verdi = { tre: 20000, tømmer: 8000, ved: 9000, flis: 3000, diesel: 3000, mat: 3000 };

ok(SK.REGLER.TYPER.lever && SK.REGLER.TYPER.avtale && SK.REGLER.TYPER.kjøp, 'typene er registrert i Selskap');
ok(!Object.keys(SK.typeVekter({ pålitelig: 50, hardhendt: 25, billig: 50 })).some(t => V.TYPER.includes(t)), 'de vanlige tilbudene lager ikke varekontrakter');

// hjemstedet: fast per firma, innen avstanden, aldri en bru
const h1 = V.hjemsted('Storlia Tømmer', steder, leir), h2 = V.hjemsted('Storlia Tømmer', steder, leir);
ok(h1 && h1.navn === h2.navn && h1.slag === 'tettsted' && h1.navn !== 'For langt', 'hjemstedet ' + (h1 && h1.navn));
ok(V.hjemsted('Storlia Tømmer', [], leir) === null, 'uten steder ingen hjemsted');

// LEVER: tilbud, ta, kjør, lever, betaling
let S = SK.ny(leir); const k = V.lagEtt(S, 'blå', 'lever', 600, { steder, verdi, leir, rand: V.lagRand(3) }, 'tre', 'Storlia Tømmer'); S.tilbud.push(k);
ok(k && k.type === 'lever' && k.vare === 'tre' && k.mengde >= 20 && k.mengde <= 40 && k.timer >= 48 && k.timer <= 72, 'lever-tilbudet ' + k.tittel);
ok(/Storlia Tømmer kjøper \d+ m³ planker, levert ved \S+ innen/.test(k.tittel), 'tittelen: ' + k.tittel);
ok(k.enhetPris >= 25000 && k.betaling === Math.round(k.mengde * k.enhetPris / 10000) * 10000 && k.bot > 0, 'prisen: ' + k.enhetPris + ' per m³, ' + k.betaling);
ok(/Gråfjell Frakt/.test(SK.kravTekst(k)), 'kravteksten nevner Gråfjell');
const rk = V.rekker(k, 12, 26.4, 1); ok(rk.ok && /Dere har 12 m³, sagbruket gir 26,4 m³ per døgn – rekker det/.test(rk.tekst), 'rekker: ' + rk.tekst);
ok(!V.rekker(k, 2, 0, 1).ok && /rekker ikke/.test(V.rekker(k, 2, 0, 1).tekst), 'rekker ikke uten sag');
let g = SK.godta(S, 'blå', k.id, 1000, () => .99); ok(g.ok && k.status === 'aktiv' && k.frist === 1000 + k.timer * 60, 'lever tatt');
let ut = SK.steg(S, 'blå', 1100, 100, { [k.id]: { levert: 10, andel: .5 } });
ok(!ut.length && k.levert === 10 && k.andel === .5, 'del levert: ' + k.levert);
ut = SK.steg(S, 'blå', 1200, 100, { [k.id]: { levert: 1000 } });
ok(ut.length === 1 && ut[0].type === 'levert' && ut[0].kr === k.betaling && S.sider.blå.sum.tjent === k.betaling && k.levert === k.mengde, 'levert og betalt ' + (ut[0] && ut[0].kr));

// LEVER: fristen går ut
S = SK.ny(leir); const kf = V.lagEtt(S, 'blå', 'lever', 0, { steder, verdi, leir, rand: V.lagRand(4) }, 'ved', 'Dalsnes Kraftlag'); S.tilbud.push(kf); SK.godta(S, 'blå', kf.id, 0, () => .99);
ut = SK.steg(S, 'blå', kf.frist + 1, 1, {}); ok(ut.length === 1 && ut[0].type === 'brutt' && ut[0].kr === kf.bot, 'fristen ute: bot ' + kf.bot);

// LEVER med bakhold kan få angrep (som eskorten) når bilen er kommet et stykke
S = SK.ny(leir); const kb = V.lagEtt(S, 'blå', 'lever', 0, { steder, verdi, leir, rand: V.lagRand(5) }, 'tre', 'Storlia Tømmer'); kb.risiko = 'bakhold'; S.tilbud.push(kb);
SK.godta(S, 'blå', kb.id, 0, () => .01); ok(!!kb.angrep, 'bakhold trukket');
ut = SK.steg(S, 'blå', 10, 1, { [kb.id]: { andel: .5 } }); ok(ut.some(h => h.type === 'angrep'), 'angrepet kommer på vegen');

// GRÅFJELL FRAKT: 15 %, tid, levert ved ankomst – og tap uten bot
S = SK.ny(leir); const kg = V.lagEtt(S, 'blå', 'lever', 0, { steder, verdi, leir, rand: V.lagRand(6) }, 'tre', 'Storlia Tømmer'); kg.risiko = 'rolig'; S.tilbud.push(kg); SK.godta(S, 'blå', kg.id, 0, () => .99);
const f = V.brukFrakt(kg, 0, 15, () => .9);
ok(f && !f.feil && f.pris === Math.round(kg.betaling * .15 / 1000) * 1000 && f.timer > 3 && f.timer < 6 && !f.tapt, 'frakten: ' + JSON.stringify({ pris: f.pris, timer: f.timer }));
ok(V.brukFrakt(kg, 0, 15).feil, 'ikke to ganger');
ut = SK.steg(S, 'blå', f.ankommer - 1, 1, {}); ok(!ut.length, 'ikke framme ennå');
ut = SK.steg(S, 'blå', f.ankommer, 1, {}); const lev = ut.find(h => h.type === 'levert');
ok(lev && lev.kr === kg.betaling - f.pris && ut.some(h => h.type === 'fraktFram'), 'Gråfjell leverte: ' + (lev && lev.kr));
S = SK.ny(leir); const kt = V.lagEtt(S, 'blå', 'lever', 0, { steder, verdi, leir, rand: V.lagRand(7) }, 'tre', 'Storlia Tømmer'); kt.risiko = 'rolig'; S.tilbud.push(kt); SK.godta(S, 'blå', kt.id, 0, () => .99);
const før = S.sider.blå.rykte.pålitelig, ft = V.brukFrakt(kt, 0, 15, () => .001); ok(ft.tapt, 'tapet trukket');
ut = SK.steg(S, 'blå', ft.ankommer, 1, {}); const br = ut.find(h => h.type === 'brutt');
ok(br && br.kr === 0 && ut.find(h => h.type === 'fraktTapt').kr > 0 && S.sider.blå.rykte.pålitelig === før - 3 && /Gråfjell Frakt mistet lasten/.test(SK.bruttTekst(kt)), 'tapt hos Gråfjell: ingen bot, erstatning, liten ripe');
S = SK.ny(leir); const kl = V.lagEtt(S, 'blå', 'lever', 0, { steder, verdi, leir, rand: V.lagRand(8) }, 'tre', 'Storlia Tømmer'); S.tilbud.push(kl); SK.godta(S, 'blå', kl.id, 0, () => .99);
ok(/rekker ikke fristen/.test(V.brukFrakt(kl, kl.frist - 30, 15).feil || ''), 'Gråfjell rekker ikke fristen');

// LEVERANSEAVTALE: henting hvert døgn, bot når lageret mangler, bonus når alt ble levert
S = SK.ny(leir); const ka = V.lagEtt(S, 'blå', 'avtale', 0, { steder, verdi, leir, rand: V.lagRand(9) }, 'ved', 'Dalsnes Kraftlag'); S.tilbud.push(ka);
ok(/Leveranseavtale: \d+ m³ ved hvert døgn i \d døgn til Dalsnes Kraftlag/.test(ka.tittel) && ka.bonus > 0 && ka.botDøgn > 0, 'avtalen: ' + ka.tittel);
SK.godta(S, 'blå', ka.id, 0, () => .99);
ut = SK.steg(S, 'blå', 600, 600, { [ka.id]: { har: 100 } }); ok(!ut.length, 'ingenting før døgnet er gått');
ut = SK.steg(S, 'blå', 1440, 1, { [ka.id]: { har: 100 } }); ok(ut.length === 1 && ut[0].type === 'vareDøgn' && ut[0].mengde === ka.perDøgn && ut[0].kr === ka.dagKr, 'døgn 1 levert');
ut = SK.steg(S, 'blå', 2880, 1, { [ka.id]: { har: 1 } }); ok(ut.length === 1 && ut[0].type === 'vareMist' && ut[0].kr === ka.botDøgn && ka.mist === 1, 'døgn 2: bot ' + ka.botDøgn);
let alle = []; for (let d = 3; d <= ka.døgn; d++) alle = alle.concat(SK.steg(S, 'blå', d * 1440, 1, { [ka.id]: { har: 100 } }));
const sl = alle.find(h => h.type === 'levert'); ok(sl && sl.kr === 0 && ka.status === 'levert', 'slutt uten bonus (ett døgn mistet)');
S = SK.ny(leir); const kb2 = V.lagEtt(S, 'blå', 'avtale', 0, { steder, verdi, leir, rand: V.lagRand(9) }, 'ved', 'Dalsnes Kraftlag'); S.tilbud.push(kb2); SK.godta(S, 'blå', kb2.id, 0, () => .99);
alle = []; for (let d = 1; d <= kb2.døgn; d++) alle = alle.concat(SK.steg(S, 'blå', d * 1440, 1, { [kb2.id]: { har: 100 } }));
ok(alle.filter(h => h.type === 'vareDøgn').length === kb2.døgn && alle.find(h => h.type === 'levert').kr === kb2.bonus && S.sider.blå.sum.tjent === kb2.dagKr * kb2.døgn + kb2.bonus, 'alt levert: bonus ' + kb2.bonus);
// flere døgn i ett steg (spilleren spoler): hvert døgn telles
S = SK.ny(leir); const kc = V.lagEtt(S, 'blå', 'avtale', 0, { steder, verdi, leir, rand: V.lagRand(10) }, 'flis', 'Dalsnes Kraftlag'); S.tilbud.push(kc); SK.godta(S, 'blå', kc.id, 0, () => .99);
ut = SK.steg(S, 'blå', 3 * 1440 + 5, 1, { [kc.id]: { har: kc.perDøgn * 1.5 } }); ok(ut.filter(h => h.type === 'vareDøgn').length === 1 && ut.filter(h => h.type === 'vareMist').length === 2, 'tre døgn på én gang: ett levert, to mistet');
ut = SK.steg(S, 'blå', 4 * 1440, 1, { [kc.id]: { har: 0 } }); ok(kc.døgn >= 5 && (ut.some(h => h.type === 'brutt') === (kc.mist > kc.døgn / 2)), 'over halvparten mistet = brutt');

// KJØPSAVTALE: første levering straks, betaling hvert døgn, plass og penger
S = SK.ny(leir); const kk = V.lagEtt(S, 'blå', 'kjøp', 0, { steder, verdi, leir, rand: V.lagRand(11) }, 'tømmer', 'Storlia Tømmer'); S.tilbud.push(kk);
ok(kk.enhetPris === Math.round(8000 * .92 / 100) * 100 && kk.kostnad === kk.dagKr * kk.døgn && /Kjøpsavtale/.test(kk.tittel), 'kjøpsavtalen: ' + kk.tittel);
SK.godta(S, 'blå', kk.id, 0, () => .99);
ut = SK.steg(S, 'blå', 1, 1, { [kk.id]: { penger: 1e9, plass: 5 } }); ok(ut.length === 1 && ut[0].type === 'vareKjøp' && ut[0].får === 5 && ut[0].kr === Math.round(kk.dagKr * 5 / kk.perDøgn / 100) * 100 && ut[0].ikkePlass === kk.perDøgn - 5, 'første levering straks, bare 5 får plass – og bare de 5 betales (ut8-kr-saga)');
// (ut8-kr-saga) fullt lager: ingenting levert, ingenting betalt, ingen bot, døgnet er ikke levert
{ const S9 = SK.ny(leir), k9 = V.lagEtt(S9, 'blå', 'kjøp', 0, { steder, verdi, leir, rand: V.lagRand(11) }, 'tømmer', 'Storlia Tømmer'); S9.tilbud.push(k9); SK.godta(S9, 'blå', k9.id, 0);
  const u9 = SK.steg(S9, 'blå', 1, 1, { [k9.id]: { penger: 1e9, plass: 0 } }); ok(u9.length === 1 && u9[0].type === 'vareKjøp' && u9[0].får === 0 && u9[0].kr === 0 && !k9.mist && !k9.levertDøgn && k9.ikkePlass === k9.perDøgn, 'fullt lager: 0 m³ for 0 kr');
  const u10 = SK.steg(S9, 'blå', 1441, 1, { [k9.id]: { penger: 1e9, plass: 1e9 } }); ok(u10[0].kr === k9.dagKr && u10[0].får === k9.perDøgn && k9.levertDøgn === 1, 'med plass: hele døgnet betales'); }
ut = SK.steg(S, 'blå', 1441, 1, { [kk.id]: { penger: 10, plass: 100 } }); ok(ut[0].type === 'vareMist' && ut[0].kr === kk.botDøgn, 'uten penger: bot');
// diesel i hele 50 liter
S = SK.ny(leir); const kd = V.lagEtt(S, 'blå', 'kjøp', 0, { steder, verdi, leir, rand: V.lagRand(12) }, 'diesel', 'Tindvik Drivstoff'); ok(kd.perDøgn % 50 === 0 && kd.enhetPris === 2760, 'diesel ' + kd.perDøgn + ' l à ' + kd.enhetPris);

// STORLIA: én gang, fast (ikke tatt av andre, går ikke ut av lista)
S = SK.ny(leir); const ks = V.storliaTilbud(S, 'blå', 0, { verdi, leir });
ok(ks && ks.storlia && ks.fast && ks.vare === 'tømmer' && ks.enhetPris === 5600 && S.tilbud[0] === ks && /sagbruk/.test(SK.kravTekst(ks)), 'Storlia: ' + ks.tittel);
ok(V.storliaTilbud(S, 'blå', 0, { verdi, leir }) === null, 'Storlia bare én gang');
for (let i = 0; i < 10; i++) SK.dagSteg(S, i * 1440 + 1, () => .01);
ok(S.tilbud.includes(ks), 'de andre selskapene tar ikke Storlias tilbud');
const S2 = SK.fraJSON(SK.tilJSON(S)); ok(S2.vare && S2.vare.storlia && S2.tilbud.some(q => q.storlia && q.type === 'kjøp'), 'lagres og leses');

// MORGENTILBUDENE: høyst maksÅpne, aldri to like
S = SK.ny(leir); for (let d = 0; d < 6; d++) V.lagTilbud(S, 'blå', d * 1440, { steder, verdi, leir, perDøgn: { tre: 26.4 } });
const vt = S.tilbud.filter(V.erVare); ok(vt.length >= 2 && vt.length <= V.REGLER.maksÅpne, 'varetilbud: ' + vt.map(q => q.type + ':' + q.vare).join(', '));
ok(vt.every(q => q.tittel && SK.kravTekst(q) && q.utløper > q.tilbudt), 'alle har tekst og utløper');

// et lag og kjøretøyene
ok(V.bære(6) === 1.5 && V.kapasitet({ type: 'tømmerbil', antall: 1 }) === 20 && V.kapasitet({ type: 'speiderbil' }) === 0, 'last');
ok(/lastebil ca\. 0,4 t/.test(V.vegTekst(21)), 'vegtekst: ' + V.vegTekst(21));
// det som er på vegen, regnes med i «rekker det»
{ const q = { type: 'lever', vare: 'tre', mengde: 20, levert: 0, turer: [{ bil: 'b', mengde: 20 }], timer: 48, sted: { navn: 'Otta' } };
  ok(V.rekker(q, 0, 0).ok && /Alt er på vegen/.test(V.rekker(q, 0, 0).tekst), 'alt på vegen'); q.turer[0].mengde = 12; ok(V.rekker(q, 8, 0).ok && !V.rekker(q, 2, 0).ok, 'resten fra lageret'); }
console.log(`test_vare: ${n} sjekker ok`);
