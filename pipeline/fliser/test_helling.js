// Test av spill/helling.js (runde 8): bratt-regelen er den samme som Leir.kanBygge, hellingskartet, de første byggene og forslaget.
// node pipeline/fliser/test_helling.js
const path = require('path');
const H = require(path.join(__dirname, '../../site/dovre-fliser/spill/helling.js'));
const Leir = require(path.join(__dirname, '../../site/dovre-fliser/spill/leir.js'));
let feil = 0;
const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// Terreng: flatt (100 moh.) vest for x = 0, en li som stiger 1,2 m per meter østover (ca. 50°) – som lia ved Aurland
const li = (x, y) => (x < 0 ? 100 : 100 + 1.2 * x);
const flatt = () => 100;
const tørt = () => true;

// 1. vurder bruker samme grense som kanBygge
{ const L = Leir.ny(); const b = { type: 'brakke', x: 200, y: 0, ret: 0 };
  const f = Leir.kanBygge(L, b, { klasse: () => 2, høyde: li }), v = H.vurder(b, li, tørt);
  ok(/For bratt/.test(f || '') && v.nivå === H.BRATT, `brakke i lia: kanBygge «${f}», vurder ${v.nivå} (d ${v.d.toFixed(1)} > ${v.grense.toFixed(1)})`);
  const b2 = { type: 'brakke', x: -200, y: 0, ret: 0 }, f2 = Leir.kanBygge(L, b2, { klasse: () => 2, høyde: li }), v2 = H.vurder(b2, li, tørt);
  ok(f2 === null && v2.nivå === H.FLATT, `brakke på flata: kanBygge ${f2}, vurder ${v2.nivå}`);
  // litt skrått (0,7 m per meter østover): kanBygge godtar, vurder sier skrått (gult)
  const sk = (x) => .7 * x, v3 = H.vurder({ type: 'brakke', x: 0, y: 0, ret: 0 }, sk, tørt), f3 = Leir.kanBygge(L, { type: 'brakke', x: 0, y: 0, ret: 0 }, { klasse: () => 2, høyde: sk });
  ok(f3 === null && v3.nivå === H.SKRÅTT, `brakke i slak skråning: kanBygge ${f3}, vurder ${v3.nivå} (d ${v3.d.toFixed(1)})`);
  // bratt-regelen er trukket ut av kanBygge uten å endre den: samme svar for mange steder
  let like = 0, n = 0; for (let x = -40; x <= 40; x += 4) for (const ret of [0, .5, 1.3]) { n++;
    const b4 = { type: 'brakke', x, y: 3, ret }, f4 = Leir.kanBygge(L, b4, { klasse: () => 2, høyde: li }), r = Leir.bratt(b4, li); if (!!f4 === r.d > r.grense) like++; }
  ok(like === n, `Leir.bratt stemmer med kanBygge på ${like} av ${n} steder`);
  // den raske utgaven gir samme svar som vurder
  { let like = 0, n = 0; const hf = (x, y) => 100 + .9 * x + .3 * y + 4 * Math.sin(y / 7), tf = (x, y) => x > -30;
    for (const ret of [0, .7, 1.9]) { const vf = H.vurderer('brakke', ret, hf, tf); for (let x = -40; x <= 40; x += 3) for (let y = -20; y <= 20; y += 5) { n++; if (vf(x, y) === H.vurder({ type: 'brakke', x, y, ret }, hf, tf).nivå) like++; } }
    ok(like === n, `vurderer = vurder på ${like} av ${n} steder`); }
  ok(H.vurder(b, () => null, tørt).nivå === H.UKJENT, 'uten høyder: ukjent (ingen advarsel)');
  ok(H.vurder(b2, li, (x) => x > -195).nivå === H.VANN, 'et hjørne i vann: vann');
}

// 2. hellingskartet: grønt på flata, rødt i lia
{ const w = 40, h = 10, k = H.kart('brakke', 0, li, tørt, -80, 20, w, h, 4);
  const vest = k[5 * w + 2], øst = k[5 * w + 38];
  ok(k.length === w * h && vest === H.FLATT && øst === H.BRATT, `hellingskartet: vest ${vest}, øst ${øst}`);
  const rot = H.kart('brakke', Math.PI / 2, li, tørt, -80, 20, w, h, 4);
  ok(rot.some((v, i) => v !== k[i]), 'retningen på bygget endrer kartet');
}

// 3. de første byggene
{ const r = H.førsteBygg(flatt, tørt, 0, 0);
  const P = r.plasser.map(b => Leir.hjørner(b)), overlapp = P.some((A, i) => P.some((B, j) => j > i && Leir.overlapper(A, B)));
  ok(r.ok && r.plasser.length === 4 && !overlapp, `flatt: ${r.plasser.map(b => b.type).join(', ')} får plass uten overlapp`);
  const L = Leir.ny(); let lov = 0; for (const b of r.plasser) { if (!Leir.kanBygge(L, b, { klasse: () => 2, høyde: flatt })) lov++; Leir.bygg(L, b, () => true); }
  ok(lov === 4, `alle fire kan bygges med Leir.bygg etter hverandre (${lov})`);
  const ri = H.førsteBygg(li, tørt, 400, 0);
  ok(!ri.ok && ri.mangler === 'Brakke' && /Bratt – ingen flat plass for en brakke/.test(H.brattTekst(ri)), `midt i lia: ${H.brattTekst(ri)}`);
  // nær flata (60 m øst for kanten): brakka får plass innen 80 m, men ikke 120 m inn i lia
  ok(H.førsteBygg(li, tørt, 60, 0).ok && !H.førsteBygg(li, tørt, 120, 0).ok, '60 m inn i lia: flata innen 80 m holder; 120 m inn: nei');
  // en smal hylle: brakka får plass, dieseltanken ikke
  const hylle = (x, y) => (Math.abs(x) < 5 && Math.abs(y) < 8 ? 50 : 50 + 3 * Math.max(Math.abs(x) - 5, Math.abs(y) - 8, 0));
  const hy = H.førsteBygg(hylle, tørt, 0, 0);
  ok(!hy.ok && hy.plasser.length === 1 && /For lite flat plass/.test(H.brattTekst(hy)), `smal hylle: ${H.brattTekst(hy)}`);
  // vann: et punkt i elva er ikke tørt, men land like ved gir plass
  const elv = x => Math.abs(x) > 20;
  ok(H.førsteBygg(flatt, elv, 0, 0).ok, 'i elva: tørt land innen 80 m gir plass');
}

// 4. forslaget: nærmeste sted der brakka selv står flatt nok (leirens midte), og de andre får plass rundt
{ const f = H.finnPlass(li, tørt, 400, 0);
  ok(f && f.x <= 8 && f.x > -8 && f.retning === 'vest' && H.førsteBygg(li, tørt, f.x, f.y).ok, `fra lia: forslag ${f && Math.round(f.m)} m ${f && f.retning} (x ${f && f.x})`);
  // forslaget er der brakka står flatt eller skrått
  ok(f && H.vurder({ type: 'brakke', x: f.x, y: f.y, ret: 0 }, li, tørt).nivå <= H.SKRÅTT, 'brakka får plass midt på forslaget');
  // lovlig() sier nei til en stripe: forslaget går forbi den
  const f2 = H.finnPlass(li, tørt, 400, 0, { lovlig: (x) => x < 0 });
  ok(f2 && f2.x < 0, `med sperret stripe: forslaget ved x ${f2 && f2.x}`);
  // bratt overalt innen søket: ingenting
  ok(H.finnPlass((x) => 2 * x, tørt, 0, 0, { søk: 300 }) === null, 'bratt overalt: ingen forslag');
  // vann: nærmeste tørre sted
  const f3 = H.finnPlass(flatt, x => x > 60, 0, 0);
  ok(f3 && f3.retning === 'øst' && f3.m < 100, `fra vann: ${f3 && Math.round(f3.m)} m ${f3 && f3.retning}`);
  // raskt nok for et vindu på 4 km
  const t0 = Date.now(); H.finnPlass(li, tørt, 2100, 0); const ms = Date.now() - t0;
  ok(ms < 1500, `søk fra 2 km inn i lia: ${ms} ms`);
}

// 5. høyde fra et vindu (som lagVindu): lest mellom rutene
{ const v = { x0: 0, y0: 80, r: 8, w: 10, h: 10, H: new Float32Array(100), K: new Uint8Array(100) };
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) v.H[j * 10 + i] = (i + .5) * 8; v.K[5 * 10 + 5] = 3;
  const hf = H.høydeFra(v); ok(Math.abs(hf(20, 40) - 20) < 1e-6 && hf(-5, 40) === null, `høydeFra: ${hf(20, 40)} ved x 20`);
  const kf = H.klasseFra(v), tf = H.tørtFra(kf); ok(kf(44, 36) === 3 && !tf(44, 36) && tf(10, 10) && !tf(-1, 10), 'klasseFra/tørtFra: vann og utenfor kartet');
  ok(H.retning(1, 1) === 'nordøst' && H.retning(0, -1) === 'sør' && H.retning(-1, 0) === 'vest', 'retning');
}
console.log(feil ? `${feil} FEIL` : 'alt ok'); process.exit(feil ? 1 : 0);
