// Test av spill/verden.js (reglene for vinter, flom/ras, jakt, dyrking, brann, funn, radio og tog)
const assert = require('assert'), V = require('../../site/dovre-fliser/spill/verden.js'), R = V.REGLER;
let frø = 7; const rnd = () => (frø = (frø * 16807) % 2147483647) / 2147483647;
const vinter = { temp: -15, snøgrense: -1000, snø: 0, regn: 0, våt: 0, årstid: 'vinter', vær: 'klart', vind: { fart: 3, retning: 0 } };
const sommer = { temp: 15, snøgrense: 1900, snø: 0, regn: 0, våt: 0, årstid: 'sommer', vær: 'klart', vind: { fart: 3, retning: 0 } };

// 31 vinter
assert.strictEqual(V.marsjFaktor(sommer, 700), 1);
assert.strictEqual(V.marsjFaktor(vinter, 700), R.snø.marsj);
assert.ok(Math.abs(V.marsjFaktor({ ...vinter, snø: 1 }, 700) - R.snø.marsj * R.snø.snøvær) < 1e-9);
assert.strictEqual(V.marsjFaktor(sommer, 2000), R.snø.marsj, 'snø over snøgrensa om sommeren');
assert.ok(V.vegStengt({ ...vinter, snø: 1 }, 1000) && !V.vegStengt({ ...vinter, snø: 1 }, 600) && !V.vegStengt(vinter, 1000));
let S = V.ny(); assert.ok(!V.isBærer(S));
V.steg(S, 1440, vinter); assert.ok(!V.isBærer(S), 'ett døgn med −15 er ikke nok');
V.steg(S, 1440, vinter); assert.ok(V.isBærer(S), 'to døgn med −15 gir is som bærer');
for (let i = 0; i < 3; i++) V.steg(S, 1440, sommer); assert.strictEqual(S.frost, 0, 'isen tiner om sommeren');
assert.ok(V.vedEkstra(-18, 1) > 0 && V.vedEkstra(0, 1) === 0);
S = V.ny(); let treff = 0; for (let t = 0; t < 30; t++) treff += V.kuldeSteg(S, 'a', 1, -15, true);
assert.strictEqual(treff, Math.floor((30 - R.kulde.timerFør) / R.kulde.timerPer));
assert.strictEqual(V.kuldeSteg(S, 'a', 1, -15, false), 0); assert.ok(S.kulde.a < 30, 'varmen i leiren hjelper');
assert.strictEqual(V.kuldeSteg(V.ny(), 'b', 50, 5, true), 0, 'ingen kuldeskade i varmegrader');
assert.ok(V.forhold(V.ny(), sommer).includes('Gode forhold'));
assert.ok(V.forhold(V.ny(), { ...vinter, snø: 1 }).some(l => /marsj −/.test(l)));

// 32 regn, flom og ras
S = V.ny(); assert.strictEqual(V.trekkHendelse(S, 1, () => 0), null);
for (let i = 0; i < 6; i++) V.steg(S, 60, { ...sommer, regn: 1 }); assert.strictEqual(V.trekkHendelse(S, 1, () => 0), 'flom');
for (let i = 0; i < 4; i++) V.steg(S, 60, { ...sommer, regn: 1 }); assert.strictEqual(V.trekkHendelse(S, 1, () => 0), 'ras');
assert.strictEqual(V.trekkHendelse(S, 1, () => .99), null);
const sone = V.nySone(S, 'ras', 1000, 2000, 90, 100); assert.ok(V.iSone(S, 1050, 2000) === sone && !V.iSone(S, 1200, 2000) && !V.iSone(S, 1050, 2000, 'flom'));
assert.strictEqual(V.ryddSoner(S, 200).length, 0); assert.strictEqual(V.ryddSoner(S, 100 + R.regn.rasTimer * 60).length, 1); assert.strictEqual(S.soner.length, 0);
assert.ok(V.flomRadius(S, 6) >= V.flomRadius(S, 2));
for (let i = 0; i < 200; i++) V.steg(S, 60, sommer); assert.strictEqual(S.regn, 0); assert.ok(V.brannfare(S, sommer) === 1 && V.brannfare(S, { ...sommer, regn: 1 }) === 0 && V.brannfare(S, vinter) === 0);

// 33 jakt
assert.strictEqual(V.vilt(1300, 0), 'rein'); assert.strictEqual(V.vilt(700, 1), 'elg'); assert.strictEqual(V.vilt(700, 5), null);
S = V.ny(); const u = V.jaktUtbytte(S, 'rein', 6, 5000, 5000, 0, rnd); assert.ok(u.dyr >= 1 && u.dyr <= 3 && u.mat === u.dyr * R.kjøtt.rein);
assert.ok(V.jaktHviler(S, 5100, 5100, 60) && !V.jaktHviler(S, 5100, 5100, R.jakt.hviler * 60 + 1) && !V.jaktHviler(S, 50000, 5100, 60));
assert.strictEqual(V.jaktUtbytte(S, 'elg', 0, 0, 0, 0, rnd).dyr, 0);
const fl = [{ art: 'rein', dyr: [{ x: 0, y: 100 }, { x: 0.5, y: 50 }, { x: 30, y: 60 }] }];
assert.strictEqual(V.sikt(fl, 0, 0, 0, 1).i, 1, 'nærmeste dyr i skuddlinja'); assert.strictEqual(V.sikt(fl, 0, 0, 1, 0), null); assert.strictEqual(V.sikt(fl, 0, 0, 0, 1, 40), null);

// 34 dyrking
S = V.ny(); assert.ok(V.så(S, 'vår').feil); assert.ok(V.ryddÅker(S).ok); assert.strictEqual(S.åker.mål, R.åker.ryddMål);
assert.ok(V.så(S, 'sommer').feil); assert.ok(V.så(S, 'vår').ok); assert.ok(V.så(S, 'vår').feil);
V.åkerSteg(S, 2, 'vår'); V.åkerSteg(S, 2, 'sommer'); const h = V.åkerSteg(S, .1, 'høst'); assert.strictEqual(h.mat, R.åker.ryddMål * R.åker.perMål); assert.ok(!S.åker.sådd);
assert.deepStrictEqual(V.åkerSteg(S, 1, 'høst'), {}, 'bare én avling');
V.så(S, 'vår'); V.åkerSteg(S, 1, 'vår'); assert.ok(V.åkerSteg(S, 1, 'høst').mat < R.åker.ryddMål * R.åker.perMål, 'umoden avling gir mindre');
V.så(S, 'vår'); assert.ok(V.åkerSteg(S, 1, 'vinter').tapt);
V.så(S, 'vår'); V.åkerSteg(S, 4, 'sommer', .5); assert.strictEqual(S.åker.grodd, 2, 'halvparten av folkene: halv vekst'); V.åkerSteg(S, 1, 'høst');
assert.strictEqual(V.åkerBehov(20), 1); assert.strictEqual(V.åkerBehov(100), 3); assert.ok(Math.abs(V.åkerSide(20) - 141.42) < .01);
for (let i = 0; i < 20; i++) V.ryddÅker(S); assert.ok(S.åker.mål <= R.åker.maks);

// 35 brann
let B = V.nyBrann(); assert.ok(V.tenn(B, 100, 100, 0, rnd)); assert.ok(!V.tenn(B, 100, 100, 0, rnd)); assert.ok(V.brenner(B, 110, 90));
const skog = () => 1; let nye = 0; for (let t = 10; t <= 60; t += 10) nye += V.brannSteg(B, t, 10, sommer, 1, skog, rnd).nye; assert.ok(nye > 3, 'brannen sprer seg i tørr skog: ' + nye);
// med vinden: vind mot øst (retning 0) gir flere ruter i øst enn i vest
let øst = 0, vest = 0; for (let n = 0; n < 30; n++) { const b = V.nyBrann(); V.tenn(b, 0, 0, 0, rnd); for (let t = 10; t <= 40; t += 10) V.brannSteg(b, t, 10, { ...sommer, vind: { fart: 8, retning: 0 } }, 1, skog, rnd);
  for (const k of Object.keys(b.celler)) { const i = +k.split(',')[0]; if (i > 0) øst++; if (i < 0) vest++; } }
assert.ok(øst > vest * 1.5, `brannen går med vinden (øst ${øst}, vest ${vest})`);
B = V.nyBrann(); V.tenn(B, 0, 0, 0, rnd); assert.strictEqual(V.brannSteg(B, 10, 10, sommer, 1, () => 0, rnd).nye, 0, 'vann brenner ikke');
assert.strictEqual(V.brannSteg(B, 20, 10, sommer, 0, skog, rnd).nye, 0, 'ingen spredning uten brannfare');
B = V.nyBrann(); for (let i = 0; i < 20; i++) V.tenn(B, i * 64, 0, 0, rnd); let ute = 0; for (let t = 10; t <= 40; t += 10) ute += V.brannSteg(B, t, 10, { ...sommer, regn: 1 }, 0, skog, rnd).ut; assert.ok(ute >= 10, 'regnet slokker: ' + ute);
B = V.nyBrann(); V.tenn(B, 0, 0, 0, rnd); V.brannSteg(B, 500, 10, sommer, 0, skog, rnd); assert.ok(V.erBrent(B, 10, 10) && !V.brenner(B, 10, 10)); assert.ok(!V.tenn(B, 10, 10, 600, rnd), 'brent mark brenner ikke igjen');
const L = V.brannListe(B); assert.ok(L.brent.length === 1 && L.brenner.length === 0 && L.brent[0].r === R.brann.rute / 2 && L.brent[0].x === 32);

// 36 funn
let antall = 0; for (let bx = 0; bx < 40; bx++) for (let by = 0; by < 40; by++) { const f = V.funnIBlokk(bx, by); if (!f) continue; antall++;
  assert.deepStrictEqual(f, V.funnIBlokk(bx, by)); assert.ok(f.x >= bx * R.funn.blokk && f.x < (bx + 1) * R.funn.blokk); const i = V.innhold(f); assert.ok(i.tekst && i.gi); assert.deepStrictEqual(i, V.innhold(f)); }
assert.ok(antall > 1600 * R.funn.p * .7 && antall < 1600 * R.funn.p * 1.3, 'andelen funn: ' + antall);
const f0 = V.funnNær(50000, 50000, 6000)[0]; assert.ok(f0 && Math.hypot(f0.x - 50000, f0.y - 50000) <= 6000);

// 37 radio
let sanne = 0; for (let i = 0; i < 400; i++) if (V.radioMelding(['Sant'], ['Dombås'], rnd).sann) sanne++; assert.ok(sanne > 400 * R.radio.sann - 50 && sanne < 400 * R.radio.sann + 50);
assert.ok(!V.radioMelding([], ['Dombås'], rnd).sann); S = V.ny(); for (let i = 0; i < 12; i++) V.radioInn(S, { tekst: 'a' + i, sann: true }, i * 60, rnd);
assert.strictEqual(S.radio.liste.length, R.radio.liste); assert.strictEqual(S.radio.liste[0].tekst, 'a11'); assert.ok(S.radio.neste > 11 * 60);

// 38 tog
assert.ok(V.erStasjon('Dombås') && V.erStasjon('dombås') && !V.erStasjon('Geiranger'));
const a = { id: 1, navn: 'Dombås', x: 0, y: 0, eier: 'blå' }, b = { id: 2, navn: 'Otta', x: 30000, y: -30000, eier: 'blå' };
assert.ok(V.togPlan(a, { ...b, eier: 'rød' }).feil); assert.ok(V.togPlan(a, { ...b, navn: 'Geiranger' }).feil); assert.ok(V.togPlan(a, a).feil);
assert.ok(V.togPlan({ ...a, stasjon: false }, b).feil, 'kartet sier ingen spor'); assert.ok(!V.togPlan(a, { ...b, navn: 'Geiranger', stasjon: true }).feil, 'kartet sier spor');
const p = V.togPlan(a, b); assert.ok(p.km > 42 && p.km < 43 && p.pris > 0 && p.stål > 0);
S = V.ny(); const st = V.togStart(S, a, b, 0); assert.ok(st.s && V.togStart(S, b, a, 0).feil);
assert.strictEqual(V.togSteg(S, 10, () => 'blå').length, 0);
let ut = V.togSteg(S, st.s.klar, () => 'blå'); assert.ok(ut.length === 1 && ut[0].åpnet);
ut = V.togSteg(S, st.s.klar + R.tog.mellom * 60, () => 'blå'); assert.ok(ut.length === 1 && ut[0].last.mat === R.tog.last.mat);
ut = V.togSteg(S, st.s.klar + 2 * R.tog.mellom * 60, id => id === 1 ? 'blå' : 'rød'); assert.ok(ut.length === 1 && ut[0].last === null, 'brutt strekning gir ikke last');

// årstidene av seg selv og lagring
S = V.ny(); assert.strictEqual(V.årstidNå(S, 1e6), null); S.auto = { på: true, start: 0, fra: 'vinter' };
assert.strictEqual(V.årstidNå(S, 10), 'vinter'); assert.strictEqual(V.årstidNå(S, R.årstid.døgn * 1440 + 1), 'vår'); assert.strictEqual(V.årstidNå(S, 4 * R.årstid.døgn * 1440 + 1), 'vinter');
S.frost = 12; V.tenn(S.brann, 0, 0, 0, rnd); const S2 = V.fraJSON(JSON.parse(JSON.stringify(S))); assert.strictEqual(S2.frost, 12); assert.ok(V.brenner(S2.brann, 1, 1)); assert.strictEqual(V.fraJSON(null).frost, 0);
console.log('test_verden: alt i orden');
