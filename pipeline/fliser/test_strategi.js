// Regeltest for spill/strategi.js: node pipeline/fliser/test_strategi.js
const S = require('../../site/dovre-fliser/spill/strategi'), assert = require('assert');
const byer = [{ id: 'a', navn: 'A', x: 0, y: 0, folk: 6000 }, { id: 'b', navn: 'B', x: 10000, y: 0, folk: 3000 }, { id: 'c', navn: 'C', x: 25000, y: 0, folk: 1000 }, { id: 'd', navn: 'D', x: 90000, y: 0, folk: 50000 }];
const leir = { x: 2000, y: 0 }, O = S.område(leir, byer, { ...S.REGLER, minst: 3 });
assert.strictEqual(S.område(leir, byer).length, 4, 'færre enn åtte innen 45 km: de nærmeste tas med'); assert.ok(S.område(leir, byer).radius > 88000);
assert.strictEqual(S.utfall(S.stilling(byer.slice(0, 2), () => 'blå')).vinner, null, 'to tettsteder er ingen krig');
assert.deepStrictEqual(O.map(b => b.id), ['a', 'b', 'c'], 'bare tettstedene innen 45 km, størst først');
let eier = { a: 'blå', b: 'rød' }; const eierAv = id => eier[id] || null;
let st = S.stilling(O, eierAv);
assert.strictEqual(st.folk, 10000); assert.strictEqual(st.sider.blå.andel, .6); assert.strictEqual(st.sider.rød.byer, 1); assert.strictEqual(st.nøytral.folk, 1000);
assert.strictEqual(S.utfall(st).vinner, 'blå', '60 % av folket gir seier');
eier = { a: 'rød', b: 'blå' }; st = S.stilling(O, eierAv); let u = S.utfall(st); assert.strictEqual(u.vinner, 'rød'); assert.strictEqual(u.leder, 'rød');
eier = { b: 'rød', c: 'rød' }; st = S.stilling(O, eierAv); u = S.utfall(st); assert.strictEqual(u.vinner, null); assert.deepStrictEqual(u.fare, [], '40 % er ikke fare ennå');
eier = { a: 'blå', b: 'rød', c: 'grønn' };
const F = S.fronter(O, eierAv); assert.strictEqual(F.length, 2, 'A–B og B–C (C har B nærmest)'); assert.strictEqual(F[0].km, 10); assert.ok(F[0].egen);
assert.ok(S.rekkevidde(100000) === 9000 && S.rekkevidde(0) === 1800);
// neste trekk: nøytralt og nært går foran forsvart
eier = { a: 'blå' };
let T = S.trekk('blå', O, eierAv, [{ x: 0, y: 0, navn: '1. lag' }], [{ x: 10200, y: 0, styrke: 40 }]);
assert.strictEqual(T.length, 2); assert.strictEqual(T[0].by.id, 'c', 'forsvart B faller bak nøytrale C'); assert.strictEqual(T[1].grunn, 'forsvart'); assert.ok(T[0].innen && T[0].lag.navn === '1. lag');
T = S.trekk('blå', O, eierAv, [{ x: 0, y: 0 }], []); assert.strictEqual(T[0].by.id, 'b', 'uten forsvar er det nære og større B best');
assert.strictEqual(S.trekk('blå', O, eierAv, [{ x: -20000, y: 0 }], [])[1].innen, false, 'over 30 km er utenfor én marsj');
// trusler: uten garnison, og fiende nær
eier = { a: 'blå', b: 'blå' };
let Tr = S.trusler('blå', O, eierAv, id => (id === 'a' ? 1 : 0), [{ x: 1000, y: 3000, navn: 'Røvere' }]);
assert.strictEqual(Tr.length, 2); assert.strictEqual(Tr[0].by.id, 'a', 'fiende 3 km unna er alvorligst'); assert.strictEqual(Tr[1].garnison, 0);
assert.strictEqual(S.trusler('blå', O, eierAv, () => 1, []).length, 0);
// (19. nov, kritikken) ingen vinner før det har gått tre døgn; «Neste trekk» sier hva et tettsted krever, og et lag på tre sendes ikke mot storbyen
{ const byer = [{ id: 1, navn: 'Storby', x: 17000, y: 0, folk: 235000 }, { id: 2, navn: 'Liten', x: 9000, y: 0, folk: 6700 }, { id: 3, navn: 'Vatne', x: 0, y: 7000, folk: 2000 }];
  const st = S.stilling(byer, id => (id === 1 ? 'rød' : null));
  assert.equal(S.utfall(st).vinner, 'rød', 'uten tid: som før'); assert.equal(S.utfall(st, S.REGLER, 600).vinner, null, 'dag 1: ingen vinner');
  assert(S.utfall(st, S.REGLER, 600).forTidlig && S.utfall(st, S.REGLER, 3 * 1440 + 1).vinner === 'rød', 'etter tre døgn: vinner');
  const tre = { x: 0, y: 0, navn: 'Kritikerlaget', lag: { menn: [{ hp: 1 }, { hp: 1 }, { hp: 1 }] } };
  const T = S.trekk('blå', byer, () => null, [tre], []), stor = T.find(t => t.by.id === 1), liten = T.find(t => t.by.id === 2);
  assert(stor.mann >= 60 && stor.minst >= 30 && !stor.nok && stor.har === 3, 'storbyen: for få');
  assert.match(S.kravTekst(stor), /trenger minst \d+ mann \(\d+ for full fart\) – dere har 3/);
  assert(T.indexOf(stor) > 0 && T[0].nok && T[0].by.id === 3, 'det tre mann kan ta (Vatne) står først, storbyen etter');
  const fire = [1, 2, 3, 4].map(i => ({ x: i * 100, y: 0, navn: 'L' + i, lag: { menn: Array.from({ length: 12 }, () => ({ hp: 1 })) } })), T4 = S.trekk('blå', byer, () => null, fire, []), s4 = T4.find(t => t.by.id === 1);
  assert(s4.nok && !s4.ettLag && s4.flere.length >= 3, 'fire lag: nok, men det trengs flere lag sammen');
  // (runde 13) ett tall: «trenger minst N mann», og kravFor sier hva lagene som sendes, rekker til
  { const lite = { minst: 3, mann: 5 }, L = n => ({ menn: Array.from({ length: n }, () => ({ hp: 1 })) });
    assert.match(S.kravTekst({ ...lite, nok: true }), /^trenger minst 3 mann \(5 for full fart\)$/);
    const k1 = S.kravFor(lite, [L(1)]), k4 = S.kravFor(lite, [L(4)]), k5 = S.kravFor(lite, [L(2), L(3)]);
    assert(!k1.nok && /For få: 1 av 3 – tar ikke stedet/.test(k1.tekst), k1.tekst);
    assert(k4.nok && !k4.full && /4 av 5 for full fart/.test(k4.tekst), k4.tekst);
    assert(k5.nok && k5.full && k5.tekst === '', 'to lag på til sammen 5: nok');
    // (runde 14) et kjent forsvar som er større enn laget: aldri «tar stedet»
    const ks = S.kravFor({ minst: 4, mann: 7 }, [L(4)], 36); assert(ks.svak && /For svakt: 4 mann mot et forsvar på ca\. 36/.test(ks.tekst) && !/tar stedet/.test(ks.tekst), ks.tekst);
    const kf = S.kravFor({ minst: 4, mann: 7 }, [L(5)], 3); assert(!kf.svak && !/tar stedet/.test(kf.tekst) && /forsvart \(ca\. 3 mann\)/.test(kf.tekst), kf.tekst);
    assert.equal(S.kravFor(lite, [{ menn: [{ hp: 1 }, { hp: .5 }, { hp: 0 }] }]).har, 1, 'såret teller ½, falt 0'); }
  assert.equal(S.tettsteder(1), '1 tettsted'); assert.equal(S.tettsteder(41), '41 tettsteder'); }
console.log('ok   strategi: område, stilling, seier, fronter, neste trekk og trusler');
// (R1-løkka 26. nov) et sted der et eget lag nylig ble slått ut, står ikke øverst i «Neste trekk»
{ const S2 = require('../../site/dovre-fliser/spill/strategi.js'), a = require('assert');
  const byer = [{ id: 1, navn: 'Otta', x: 3000, y: 0, folk: 2000 }, { id: 2, navn: 'Sel', x: 0, y: 7000, folk: 600 }], egne = [{ x: 0, y: 0, navn: 'Vaktlaget', mann: 8 }];
  const før = S2.trekk('blå', byer, () => null, egne, []); a.strictEqual(før[0].by.navn, 'Otta', 'uten tap: Otta først');
  const tap = { liste: [{ x: 3100, y: 50, tid: 100, navn: 'Speidertropp 1' }], nå: 160 }, etter = S2.trekk('blå', byer, () => null, egne, [], undefined, tap);
  a.ok(etter[0].by.navn === 'Sel' && etter[1].tapt && /Speidertropp 1 ble slått ut her for 1 t siden/.test(S2.tapTekst(etter[1], 160)), 'etter tap: Otta trekkes ned – ' + S2.tapTekst(etter[1], 160));
  a.strictEqual(S2.trekk('blå', byer, () => null, egne, [], undefined, { liste: tap.liste, nå: 100 + S2.REGLER.tap.tid + 1 })[0].by.navn, 'Otta', 'etter et døgn: glemt');
  console.log('ok   strategi (R1-løkka): nylige tap trekker stedet ned'); }
// (R2-løkka 26. nov) et sted med et kjent forsvar som er større enn det dere har (Løten, 35 mann), står ikke øverst; ett tall for kravet
{ const S2 = require('../../site/dovre-fliser/spill/strategi.js'), a = require('assert');
  const byer = [{ id: 1, navn: 'Løten', x: 3000, y: 0, folk: 4000 }, { id: 2, navn: 'Elverum', x: 0, y: 6000, folk: 900 }], egne = [{ x: 0, y: 0, navn: 'Vaktlaget', mann: 8 }];
  const uten = S2.trekk('blå', byer, () => null, egne, []); a.strictEqual(uten[0].by.navn, 'Løten', 'uten kjent forsvar: Løten først (størst og nærmest)');
  const med = S2.trekk('blå', byer, id => (id === 1 ? 'grønn' : null), egne, [], undefined, null, b => (b.id === 1 ? 35 : 0));
  a.ok(med[0].by.navn === 'Elverum' && med[1].sterk && med[1].anbefalt === 36 && !med[0].sterk, 'Løten (35 mann) trekkes ned: ' + med.map(t => t.by.navn + (t.sterk ? '*' : '')).join(', '));
  a.strictEqual(S2.anbefalt(9, 7), 9, 'inntaket krever 9, bygdevernet 7: 9'); a.strictEqual(S2.anbefalt(4, 7), 8, 'bygdevernet 7: minst 8'); a.strictEqual(S2.anbefalt(5, 0), 5);
  console.log('ok   strategi (R2-løkka): for sterke steder trekkes ned, ett tall for kravet'); }
