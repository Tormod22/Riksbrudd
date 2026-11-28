// ut5-rivaler (Ø8): rivalenes økonomi, veien til seier, sabotasjen, byavtalene og firmaene for rivalene, og ØKONOMITESTEN for en rival.
// Kjør fra repo-roten: node pipeline/fliser/test_rival.js   (SELVTEST=1: legger inn en feil med vilje – testen skal da slå ut)
'use strict';
const assert = require('node:assert/strict');
const RV = require('../../site/dovre-fliser/spill/rival'), R = RV.REGLER;
const BA = require('../../site/dovre-fliser/spill/byavtale'), Fi = require('../../site/dovre-fliser/spill/firma');
let n = 0; const ok = (v, t) => { assert(v, t); n++; };

// ---------- lønn og råd til lag ----------
ok(RV.lønnDøgn(2) === 2 * R.mannPerLag * R.lønn, 'lønn for to lag');
ok(RV.lønnDøgn([{ menn: [{ hp: 1 }, { hp: .4 }, { hp: 0 }] }]) === 2 * R.lønn, 'falne får ikke lønn');
const ll = R.mannPerLag * R.lønn;
{ const rik = RV.rådTak(6, { kasse: 30e6, inntekt: 2e6, lønnLag: ll }), vanlig = RV.rådTak(6, { kasse: 2e6, inntekt: 2e6, lønnLag: ll }), fattig = RV.rådTak(6, { kasse: 0, inntekt: 2e5, lønnLag: ll });
  ok(rik > vanlig && vanlig > fattig, `en rik rival har flere lag enn en fattig (${rik} / ${vanlig} / ${fattig})`);
  ok(rik === 6 + R.tak.rikMaks, 'rik: høyst rikMaks over grunntaket'); ok(fattig >= R.tak.min, 'aldri under min');
  ok(RV.rådTak(6, { kasse: 0, inntekt: 0, lønnLag: ll }) === R.tak.min, 'blakk: ett lag'); }
{ const Ø = { kr: 100000 }; RV.lønnSteg(Ø, 240000, 1440); ok(Ø.kr === 0 && Ø.ubetalt === 1440, 'kassa går ikke under null, ubetalt telles');
  ok(RV.deserter(Ø, 5, 3) && !RV.deserter(Ø, 3, 3), 'et lag går bare når de har flere lag enn råd til');
  Ø.kr = 1e6; RV.lønnSteg(Ø, 240000, 60); ok(Ø.ubetalt === 0 && Math.abs(Ø.kr - (1e6 - 10000)) < 1, 'lønn per time'); }
// ---------- sagbruket ----------
{ const v = RV.sagOverskudd({ by: 3, hp: 1 }, 24), S = R.sag; ok(Math.abs(v - (S.perTime * 24 * S.plankePris * S.salg - S.folk * R.lønn)) < 1, 'saga: planker − lønn');
  ok(RV.sagOverskudd({ by: 3, hp: .25 }, 24) < v, 'slitt sag gir mindre'); ok(RV.sagOverskudd(null, 24) === 0, 'ingen sag');
  ok(v > 0 && v < 7e5, 'saga gir ikke mer enn ett sagbruk i full drift (0,7 mill. i døgnet)');
  ok(RV.vilKjøpeSag({ kasse: 11e6, døgn: 4, vei: 'penger', harSag: false, byer: 1 }) && !RV.vilKjøpeSag({ kasse: 11e6, døgn: 4, vei: 'makt', harSag: false, byer: 1 }), 'penger kjøper sag tidlig, makt venter');
  ok(!RV.vilKjøpeSag({ kasse: 11e6, døgn: 20, vei: 'penger', harSag: false, byer: 0 }), 'uten tettsted ingen sag'); }
// ---------- veien ----------
ok(RV.velgVei({ side: 'grønn', makt: .2, penger: .1, gjenoppbygging: .5 }) === 'gjenoppbygging', 'velger det de er gode på');
ok(RV.velgVei({ side: 'rød', makt: .5, penger: .1, gjenoppbygging: .1 }) === 'makt', 'makt');
ok(RV.velgVei({ side: 'rød', makt: .3, penger: .28, gjenoppbygging: 0, nå: 'penger' }) === 'penger', 'bytter ikke for en liten forskjell');
ok(RV.velgVei({ side: 'rød', makt: .1, penger: .1, gjenoppbygging: .1 }) === 'penger', 'Ravnsund liker penger (stilen)');
ok(RV.veiTekst('Ravnsund', 'penger') === 'Ravnsund satser på penger', 'teksten i krigskartet');
for (const v of RV.VEIER) ok(RV.PRIORITET[v] && RV.PRIORITET[v].tekst, 'prioritet for ' + v);
// ---------- sabotasje ----------
{ const S = R.sabotasje, t = 10 * 1440;
  ok(RV.sabotasjeSjanse({ nå: 1440, sist: -1e9 }) === 0, 'ikke de første døgnene');
  ok(RV.sabotasjeSjanse({ nå: t, sist: t - 1440 }) === 0, 'pause mellom sabotasjene');
  const vanlig = RV.sabotasjeSjanse({ nå: t, sist: -1e9 }), bak = RV.sabotasjeSjanse({ nå: t, sist: -1e9, bak: true });
  ok(vanlig === S.sjanse && bak > vanlig && bak < .2, 'sjelden, mer når de ligger bak');
  ok(RV.sabotasjeSjanse({ nå: t, sist: -1e9, vakt: 3 }) < vanlig && RV.sabotasjeSjanse({ nå: t, sist: -1e9, pakt: true }) < vanlig, 'vakt og pakt gir mindre');
  const m = RV.sabotasjeMål([{ id: 7, type: 'sagbruk', hp: 1 }], { tre: 20 }, .1); ok(m.slag === 'maskin' && m.id === 7 && m.skade === S.maskinSkade, 'maskinen');
  const l = RV.sabotasjeMål([], { tre: 20, betong: 0 }, .3); ok(l.slag === 'lager' && l.vare === 'tre' && l.mengde === 4, 'lageret');
  ok(RV.sabotasjeMål([], { tre: 1 }, .3) === null, 'ingenting å ta'); }
// ---------- byavtalene for rivalene ----------
{ const S = BA.ny(), b = BA.by(S, '5'); ok(BA.rivalKunde(b, 'rød', 0) && b.rival.trinn === 'kunde', 'rivalen blir kunde etter en kontrakt');
  ok(!BA.rivalKunde(b, 'grønn', 0), 'bare én rival');
  const byer = [{ id: '1', x: 0, y: 0, folk: 3000, eier: 'rød' }, { id: '5', x: 3000, y: 0, folk: 1000, eier: null }, { id: '6', x: 3000, y: 0, folk: 1000, eier: null }];
  ok(BA.rivalMål(S, byer, 'rød') === '5', 'rivalen frir helst der den er kunde'); ok(BA.rivalMål(S, byer, 'grønn') === null, 'den andre ingen egne');
  BA.rivalFrir(b, 'rød', 1000, 0, 'redd'); ok(BA.rivalSteg(b, 1440) === 'rival' && b.rival.trinn === 'beskyttelse', 'kunde -> beskyttelse');
  // løftet holdt i fem døgn: handel
  for (let d = 0; d < 5; d++) { for (let h = 0; h < 24; h++) BA.rivalTime(b, 5); const r = BA.rivalDøgn(b, 1440 * (d + 2)); ok(r.holdt && !r.sierOpp, 'holdt døgn ' + d); }
  ok(BA.rivalVokser(b, 7 * 1440) && b.rival.trinn === 'handel', 'handel etter fem holdte døgn');
  // så brytes løftet: byen sier opp
  let r; for (let d = 0; d < 5 && b.rival; d++) { for (let h = 0; h < 24; h++) BA.rivalTime(b, 1); r = BA.rivalDøgn(b, 1440 * (d + 8)); }
  ok(r && r.sierOpp && !b.rival && b.rivalStengt.side === 'rød', 'byen sier opp en rival som ikke holder løftet');
  ok(BA.rivalMål(S, byer, 'rød', 1440 * 9) === '6' && BA.rivalMål(S, byer, 'rød', 1440 * 30) === '5', 'byen vil ikke snakke med dem på en stund');
  const S2 = BA.fraJSON(JSON.parse(JSON.stringify(S))); ok(S2.byer['5'].rivalStengt && S2.byer['5'].rivalStengt.side === 'rød', 'stengingen lagres');
  // gamle lagringer (uten løftene): sju døgn som før
  const g = { rival: { side: 'rød', trinn: 'beskyttelse', start: 0 } }; ok(!BA.rivalVokser(g, 6 * 1440) && BA.rivalVokser(g, 7 * 1440), 'gamle avtaler som før'); }
// ---------- firmaene for rivalene ----------
{ const F = Fi.ny({ x: 0, y: 0 }), f = Fi.finn(F, 'Storlia Tømmer');
  ok(Fi.rivalLevert(f, 'grønn', { nå: 0, kundeEtter: 2, kundeDøgn: 10 }) === null && Fi.rivalLevert(f, 'grønn', { nå: 100, kundeEtter: 2, kundeDøgn: 10 }) === 'kunde', 'fast kunde etter to leverte');
  ok(Fi.rivalKunde(f, 200) === 'grønn' && Fi.rivalKunde(f, 100 + 11 * 1440) === null, 'fast kunde i ti døgn');
  Fi.rivalLevert(f, 'grønn', { nå: 300, kundeEtter: 2, kundeDøgn: 10 });
  f.holdning = 70; f.levert = 3; ok(!Fi.kanSamarbeid(F, f, 'fast').ok && /Mosevakt er fast kunde/.test(Fi.kanSamarbeid(F, f, 'fast').mangler.join()), 'dere kan ikke være fast kunde samtidig');
  ok(Fi.rivalKanAnlegg(f) && Fi.rivalAnlegg(f, 'rød', 400) === 3e6, 'rivalen kjøper halve sagbruket');
  ok(!Fi.kanSamarbeid(F, f, 'felles').ok && /Ravnsund eier halve sagbruket/.test(Fi.kanSamarbeid(F, f, 'felles').mangler.join()), 'kappløpet om Storlia: dere kommer for sent');
  ok(Fi.rivalAnleggDøgn(f) === 120000, 'halve overskuddet'); ok(/fast kunde/.test(Fi.rivalTekst(f, 500)) && /halve sagbruket/.test(Fi.rivalTekst(f, 500)), 'teksten i Partnere');
  const F2 = Fi.fraJSON(Fi.tilJSON(F)); ok(Fi.finn(F2, 'Storlia Tømmer').rival.anlegg.side === 'rød', 'lagres');
  const g = Fi.finn(F, 'Gråfjell Frakt'); ok(!Fi.rivalKanAnlegg(g), 'fraktfirmaet har ikke anlegg'); }

// ---------- ØKONOMITESTEN: en rival med normal flaks ----------
// 60 frø × 30 døgn (Rival.simuler). Krav: medianen vinner ikke før dag 15, og blir ikke blakk før dag 10; en rival uten inntekt blir blakk.
const SELV = process.env.SELVTEST === '1';
const median = a => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; }, p10 = a => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 10)];
for (const side of ['rød', 'grønn']) {
  const kj = []; for (let f = 1; f <= 60; f++) kj.push(RV.simuler({ frø: f, side, flaks: SELV ? 3 : 1, inntektF: SELV ? 4 : 1 }));
  const seier = kj.map(k => (k.seier ? k.seier.dag : 99)), blakk = kj.map(k => (k.blakkDag === null ? 99 : k.blakkDag + 1));
  const veier = {}; for (const k of kj) if (k.seier) veier[k.seier.vei] = (veier[k.seier.vei] || 0) + 1;
  console.log(`${side}: seier median dag ${median(seier)} (10 %: dag ${p10(seier)}), ${kj.filter(k => k.seier).length} av 60 vant innen 30 døgn ${JSON.stringify(veier)}; blakk median dag ${median(blakk)} (10 %: ${p10(blakk)})`);
  ok(median(seier) >= 15, `${side}: en rival med normal flaks vinner ikke før dag 15 (median dag ${median(seier)})`);
  ok(median(blakk) >= 10, `${side}: en rival med normal flaks blir ikke blakk før dag 10 (median dag ${median(blakk)})`);
}
{ const k = RV.simuler({ frø: 3, inntektF: 0 }); ok(k.blakkDag !== null && k.blakkDag < 10, 'en rival uten inntekt blir blakk (lønna virker)'); }
console.log(`test_rival: ${n} sjekker ok`);
