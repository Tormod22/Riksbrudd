// Regeltest for spill/forsvar.js: node pipeline/fliser/test_forsvar.js
const F = require('../../site/dovre-fliser/spill/forsvar'), assert = require('assert');
let b = F.beredskap({ lag: 0, tårn: 0, sekker: 0, varsling: 0, vakter: 0, ammo: 1, bølge: 2 }); assert.strictEqual(b.sum, 10, 'bare ammunisjon gir poeng'); assert.strictEqual(b.ord, 'forsvarsløst'); assert.ok(/Ingen lag/.test(b.råd[0]), 'det viktigste rådet først');
b = F.beredskap({ lag: 2, tårn: 1, sekker: 2, varsling: 800, vakter: 4, ammo: 1, bølge: 2 }); assert.strictEqual(b.sum, 100); assert.strictEqual(b.ord, 'godt forberedt'); assert.strictEqual(b.råd.length, 0);
b = F.beredskap({ lag: 1, tårn: 1, sekker: 1, varsling: 300, vakter: 2, ammo: .25, bølge: 2 }); assert.ok(b.sum > 40 && b.sum < 70); assert.ok(b.punkter.find(p => p.id === 'lag').poeng === 18);
assert.strictEqual(F.retning(0), 'øst'); assert.strictEqual(F.retning(Math.PI / 2), 'nord'); assert.strictEqual(F.retning(-Math.PI / 2), 'sør');
// stillinger: uten voller en bue mot fienden
const leir = { x: 1000, y: 1000 }; let S = F.stillinger(leir, 0, 3);
assert.strictEqual(S.length, 3); for (const p of S) { assert.ok(Math.abs(Math.hypot(p.x - 1000, p.y - 1000) - F.R.radius) < 1e-9); assert.ok(p.x > 1000, 'på fiendens side'); assert.ok(!p.voll); }
assert.ok(Math.min(...S.map((p, i) => Math.min(...S.filter((q, j) => j !== i).map(q => Math.hypot(p.x - q.x, p.y - q.y))))) > 25, 'lagene står ikke oppå hverandre');
// med voller: vollen mot fienden tas først, den på baksiden ikke
S = F.stillinger(leir, 0, 2, [{ x: 1060, y: 1005 }, { x: 930, y: 1000 }]); assert.ok(S[0].voll && S[0].x > 1040 && S[0].x < 1060, 'bak vollen sett fra fienden'); assert.ok(!S[1].voll);
const lag = [{ x: 1050, y: 1004, navn: 'a' }, { x: 900, y: 1000, navn: 'b' }], Fo = F.fordel(lag, S); assert.strictEqual(Fo.length, 2); assert.ok(Fo[0].plass.voll && Fo[0].lag.navn === 'a', 'vollen går til laget som er nærmest den');
assert.strictEqual(F.fordel(lag, [S[0]]).length, 1, 'ikke flere lag enn plasser');
assert.ok(Math.abs(F.ankomst(1300 * 1.3) - 21.67) < .01); assert.strictEqual(F.vaktStørrelse(1), 0); assert.strictEqual(F.vaktStørrelse(5), 5); assert.strictEqual(F.vaktStørrelse(30), 12);
assert.strictEqual(F.rapport({ fiender: 2, fienderUte: 2, falne: 1, sårede: 2, bygg: 1 }), 'alle 2 røverlag er slått ut, vi har 1 falne og 2 sårede, 1 bygg ble skadet.'); assert.ok(/ingen tap/.test(F.rapport({ fiender: 1, fienderUte: 1, falne: 0, sårede: 0, bygg: 0 })));
console.log('ok   forsvar: beredskap, stillinger, fordeling, ankomst, leirvakt og rapport');
// (runde 4) mot røverne i leiren: hvert lag mot nærmeste røver, 50 m fra den på sin egen side
{ const M = F.motHerjere([{ x: 1300, y: 1000 }, { x: 1000, y: 700 }], [{ x: 1100, y: 1000 }, { x: 1000, y: 950 }], leir);
  assert.strictEqual(M.length, 2); assert.ok(M[0].fi.x === 1100 && Math.abs(M[0].mål.x - 1125) < 1e-9 && Math.abs(M[0].mål.y - 1000) < 1e-9, 'laget øst for leiren går mot røveren i øst og stiller seg 25 m fra den');
  assert.ok(M[1].fi.y === 950 && Math.abs(M[1].mål.y - 925) < 1e-9, 'laget i sør tar den nærmeste'); assert.strictEqual(F.motHerjere([{ x: 1, y: 1 }], [], leir).length, 0, 'ingen røvere inne: ingen ordre');
  const Q = F.motHerjere([{ x: 1010, y: 1000 }], [{ x: 1000, y: 1000 }], leir); assert.ok(Math.hypot(Q[0].mål.x - 1000, Q[0].mål.y - 1000) <= 10 + 1e-9, 'et lag like ved går ikke lenger bort'); }
// (runde 4) reparasjon: de mest skadde først, bare så mange som det er ledige byggelag, og reserven blir igjen i kassa
{ const B = [{ id: 1, hp: .9, pris: 1e5 }, { id: 2, hp: .3, pris: 7e5 }, { id: 3, hp: .5, pris: 4e5, opptatt: true }, { id: 4, hp: .97, pris: 2e4 }, { id: 5, hp: 0, pris: 1e6 }];
  assert.deepStrictEqual(F.velgReparasjon(B, 2, 5e6), [2, 1]); assert.deepStrictEqual(F.velgReparasjon(B, 1, 5e6), [2]); assert.deepStrictEqual(F.velgReparasjon(B, 3, 6e5), [1], 'for dyrt: hopper over, tar det neste');
  assert.deepStrictEqual(F.velgReparasjon(B, 3, 3.5e5), [], 'reserven (300 000 kr) blir alltid igjen'); assert.deepStrictEqual(F.velgReparasjon(B, 0, 5e6), []);
  const s = F.skadet(B); assert.strictEqual(s.n, 4); assert.strictEqual(s.pris, 1e5 + 7e5 + 2e4); assert.strictEqual(s.tekst, '4 bygg er skadet'); assert.strictEqual(F.skadet([{ hp: .5, pris: 1 }]).tekst, 'Ett bygg er skadet'); }
console.log('ok   forsvar: mot røverne i leiren, reparasjon og skadevarsel');
// (runde 8) én kilde for angrepet: glattet anslag som ikke hopper, spenn når ingen ser dem, og rapporten etter hver bølge
{ let e = F.glatt(null, 70, 0, false); assert.strictEqual(e.v, 70);
  e = F.glatt(e, 60, 10, false); assert.ok(Math.abs(e.v - 60) < 1e-9, 'teller ned med tida');
  const før = e.v; e = F.glatt(e, 231, 20, false); assert.ok(e.v > før - 10 && e.v < 120, `hopper ikke til 231 (${e.v.toFixed(0)})`);
  e = F.glatt(e, 15, 20, true); assert.strictEqual(e.v, 15, 'sett: avstanden gjelder');
  assert.strictEqual(F.glatt(null, null, 5, false), null); assert.strictEqual(F.glatt({ v: 30, t: 0 }, null, 10, false).v, 20);
  assert.strictEqual(F.spenn(3), null); assert.strictEqual(F.spenn(50), 'ca. 35–65 min'); assert.strictEqual(F.spenn(90), 'ca. 1–2 timer'); assert.strictEqual(F.spenn(200), 'ca. 2–5 timer');
  assert.strictEqual(F.rapport({ fiender: 1, fienderUte: 1, falne: 0, sårede: 0, bygg: 0 }), 'røverlaget er slått ut, ingen tap hos oss.', 'ikke «alle 1 røverlag»');
  let r = F.sluttRapport({ hvem: 'Røverne', nr: 2, utfall: 'unna', tok: '450 000 kr', fiender: 2, fienderUte: 1, falne: 1, sårede: 2, skadet: 1 });
  assert.ok(r.god && /Bølge 2 er slått tilbake/.test(r.tittel) && /Dere tok 450 000 kr/.test(r.tekst) && /1 av 2 røverlag/.test(r.tekst) && /1 falt og 2 såret/.test(r.tekst) && /1 bygg skadet/.test(r.tekst), JSON.stringify(r));
  r = F.sluttRapport({ hvem: 'Røverne', nr: 3, utfall: 'herjet', tapte: '1,2 mill. kr og 40 m³ tre', fiender: 1, fienderUte: 0 }); assert.ok(!r.god && /herjet/.test(r.tittel) && /De tok 1,2 mill/.test(r.tekst) && /Ingen tap/.test(r.tekst));
  r = F.sluttRapport({ hvem: 'Ravnsund', utfall: 'oppgitt', fiender: 3, fienderUte: 2, ødelagt: 1 }); assert.ok(r.god && /Angrepet fra Ravnsund er slått tilbake/.test(r.tittel) && /2 av 3 lag fra Ravnsund/.test(r.tekst) && /1 ødelagt/.test(r.tekst)); }
console.log('ok   forsvar (runde 8): glattet anslag, spenn, «røverlaget» i entall og rapport etter hver bølge');
// runde 12 (kritiker E): navnene på de sårede, de falne og byggene står i rapporten når de er kjent
{ const r = F.sluttRapport({ hvem: 'Røverne', nr: 2, utfall: 'slått', falne: 1, sårede: 1, falneNavn: ['Håkon Rønning (Leirvakta)'], sårNavn: ['Kari (deg)'], skadet: 2, skadetNavn: ['Brakke', 'Kjøkken'] });
  require('assert')(/Håkon Rønning \(Leirvakta\) falt, og Kari \(deg\) ble såret\./.test(r.tekst) && /Brakke og Kjøkken skadet\./.test(r.tekst), JSON.stringify(r)); console.log('ok   rapporten har navn på sårede, falne og bygg'); }

// (runde 13, kritiker G) anslaget kan bare minke når angriperne ikke har snudd, og uten syn står det når de trolig kommer, ikke minutter
{ let e = F.monoton(null, 40, 0, true); assert.strictEqual(e.v, 40);
  e = F.monoton(e, 300, 10, false); assert.strictEqual(e.v, 30, 'et større rått anslag drar det ikke opp');
  e = F.monoton(e, 12, 15, false); assert.strictEqual(e.v, 12, 'et mindre rått anslag gjelder');
  e = F.monoton(e, 200, 20, true); assert.strictEqual(e.v, 200, 'har de snudd, gjelder det nye');
  assert.ok(F.harSnudd(1000, 1300, false) && !F.harSnudd(1000, 1200, false) && F.harSnudd(1000, 900, true), 'snudd = 250 m lenger unna enn nærmest, eller de trekker seg');
  // 01:22 dag 3 (G sitt angrep)
  const t = (48 + 1 + 22 / 60 - 6) * 60;
  assert.deepStrictEqual(F.klokke(t).dag, 3); assert.ok(Math.abs(F.klokke(t).time - 1.3667) < .01);
  assert.ok(/^trolig i natt \(ca\. kl\. 0\d–0\d\)$/.test(F.når(t, t + 200)), F.når(t, t + 200));
  assert.strictEqual(F.når(t, t + 30), 'trolig innen en time');
  const t2 = (24 + 14 - 6) * 60; assert.ok(/^trolig i kveld/.test(F.når(t2, t2 + 300))); assert.ok(/^trolig i morgen tidlig/.test(F.når(t2, t2 + 900)));
  assert.ok(!/\(/.test(F.når(t2, t2 + 1300)), 'ingen klokkeslett så langt fram');
  assert.ok(!/\d+ min/.test(F.når(t, t + 200)), 'ingen minutter når ingen ser dem');
  assert.strictEqual(F.nedtelling(1060), '17 t 40 min'); assert.strictEqual(F.nedtelling(45), '45 min'); assert.strictEqual(F.nedtelling(.4), 'under 1 min'); }
console.log('ok   forsvar (runde 13): anslaget går ikke baklengs, «ikke sett – kommer trolig i natt», nedtelling');
// (runde 14) «sist sett 3,5 km N kl. 08:53» og brikka før bølgen drar ut
{ const F = require('../../site/dovre-fliser/spill/forsvar.js'), A = require('assert');
  A.strictEqual(F.klTekst(173), 'kl. 08:53'); A.strictEqual(F.retningKort(Math.PI / 2), 'N'); A.strictEqual(F.utTekst(0.4), 'Røverne drar ut nå');
  A.ok(!/under 1 min/.test(F.utTekst(0.2)), 'aldri «under 1 min» før de er på vei'); A.ok(F.STATUS.sistSettLang >= 120, 'sist sett står lenge nok');
  console.log('ok   forsvar (runde 14): sist sett med klokkeslett, «drar ut nå»'); }
// (kritikerløkka r1) sjansen for forsvaret, umulig nedtelling, «hvem kom» og tapene hos dem i rapporten
{ const F = require('../../site/dovre-fliser/spill/forsvar.js'), A = require('assert');
  const sterk = F.sjanse({ egne: [{ treff: .2, menn: 6, vern: .5 }], fiender: [{ treff: .07, menn: 4 }], tårn: true }), svak = F.sjanse({ egne: [{ treff: .13, menn: 4, vern: 1 }], fiender: [{ treff: .27, menn: 6 }] });
  A.strictEqual(sterk.ord, 'god'); A.strictEqual(svak.ord, 'dårlig'); A.ok(/^Med dette forsvaret: dårlig sjanse/.test(svak.tekst));
  A.strictEqual(F.sjanse({ egne: [], fiender: [{ treff: .1, menn: 4 }] }).ord, 'dårlig', 'ingen soldater hjemme'); A.strictEqual(F.sjanse({ egne: [{ treff: .1, menn: 4 }], fiender: [] }).ord, 'god');
  A.ok(F.umulig(1, 1800), '1 min igjen på 1,8 km er umulig'); A.ok(!F.umulig(20, 1800), '20 min på 1,8 km går');
  const r = F.sluttRapport({ hvem: 'Røverne', nr: 1, utfall: 'slått', kom: 'ett røverlag på 4 mann fra nordvest', deresFalne: 2, deresSåret: 1 });
  A.ok(/Det kom ett røverlag på 4 mann fra nordvest\./.test(r.tekst) && /Hos dem: 2 falt og 1 såret\./.test(r.tekst), r.tekst);
  console.log('ok   forsvar (kritikerløkka r1): sjansen, umulig nedtelling, hvem kom og tapene hos dem'); }
