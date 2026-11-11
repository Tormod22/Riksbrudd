// Test av spill/ressurser.js (materialer fra verden: hogst, riving, frakt) og Leir.leggInn. Kjør: node pipeline/fliser/test_ressurser.js
'use strict';
const RS = require('../../site/dovre-fliser/spill/ressurser.js'), Leir = require('../../site/dovre-fliser/spill/leir.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const leir = { x: 0, y: 0 };

// Leir.leggInn: lagerplassen er taket
{ const L = Leir.ny(); const a = Leir.leggInn(L, 'tre', 40), b = Leir.leggInn(L, 'tre', 40), c = Leir.leggInn(L, 'gull', 5);
  ok(a === 40 && Math.abs(b - (Leir.GRUNNLAGER - 40)) < 1e-9 && L.lager.tre === Leir.GRUNNLAGER && c === 0, `leggInn: ${a} + ${b} (taket ${Leir.GRUNNLAGER}), ukjent materiale ${c}`); }

// utbytte: bolig gir mest tre, industri mest stål, blokk mest betong; for store bygg avvises
{ const bolig = RS.husUtbytte(0, 120, 6), ind = RS.husUtbytte(6, 800, 8), blokk = RS.husUtbytte(10, 400, 15), stor = RS.husUtbytte(2, 5000, 10);
  ok(bolig.gruppe === 'tre' && bolig.mat.tre > bolig.mat.betong && bolig.mat.tre > 20 && bolig.mat.tre < 50, `bolig 120 m²: ${JSON.stringify(bolig.mat)}, ${bolig.timer} arbeidstimer`);
  ok(ind.gruppe === 'stål' && ind.mat.stål > ind.mat.tre && ind.mat.stål > 10, `industri 800 m²: ${JSON.stringify(ind.mat)}`);
  ok(blokk.gruppe === 'betong' && blokk.mat.betong > blokk.mat.tre && blokk.mat.betong > blokk.mat.stål, `blokk 400 m² × 15 m: ${JSON.stringify(blokk.mat)}`);
  ok(!!stor.feil, `5000 m²: «${stor.feil}»`);
  const h = RS.hogstUtbytte(35, 1); ok(h.mat.tre > 40 && h.mat.tre < 50 && Math.abs(h.timer - h.mat.tre / 3) < .2, `hogstfelt 35 m full skog: ${h.mat.tre} m³, ${h.timer} arbeidstimer`); }

// hogst nær leiren: arbeidet går med folkene, tre rett i lageret, feltet huskes og trærne tynnes ut underveis
{ const R = RS.ny(), L = Leir.ny(), leggInn = (k, m) => Leir.leggInn(L, k, m);
  ok(!!RS.startHogst(R, { x: 5000, y: 0, r: 35, skog: 1 }, leir).feil, 'hogst for langt unna avvises');
  ok(!!RS.startHogst(R, { x: 50, y: 0, r: 35, skog: .05 }, leir).feil, 'hogst uten skog avvises');
  const j = RS.startHogst(R, { x: 80, y: 0, r: 20, skog: 1 }, leir).jobb, ctx = { arbeidere: o => (o === 'hogst' ? 2 : 0), tempo: () => 1, leir, leggInn };
  RS.steg(R, j.arbeid / 2 * 60 / 2, ctx);   // halve arbeidet
  const halv = RS.fram(j), tynnet = RS.erHogd(R, 80, 0, .2) && !RS.erHogd(R, 80, 0, .9);
  ok(Math.abs(halv - .5) < 1e-6 && Math.abs(L.lager.tre - j.mat.tre / 2) < .01 && tynnet, `halvveis: ${Math.round(halv * 100)} %, ${L.lager.tre.toFixed(1)} m³ i lageret, trærne tynnes ut: ${tynnet}`);
  const h = RS.steg(R, 600, ctx);
  ok(h.some(e => e.hva === 'ferdig') && h.some(e => e.hva === 'tømt') && R.jobber.length === 0 && R.hogd.length === 1 && RS.erHogd(R, 85, 5, .99) && !RS.erHogd(R, 120, 0, 0),
    `ferdig: hogd felt huskes (${R.hogd.length}), jobben er borte, ${L.lager.tre.toFixed(1)} m³ tre`);
  // uten folk på hogst går ingenting
  const R2 = RS.ny(), j2 = RS.startHogst(R2, { x: 80, y: 0, r: 20, skog: 1 }, leir).jobb; RS.steg(R2, 600, { ...ctx, arbeidere: () => 0 }); ok(j2.gjort === 0, 'ingen på hogst: ingen framdrift'); }

// riving langt unna: frakt til fots tar tid, lageret fylles til taket og resten venter; huset huskes som revet; lagring
{ const R = RS.ny(), L = Leir.ny(), leggInn = (k, m) => Leir.leggInn(L, k, m), P = [[1000, 0], [1012, 0], [1012, 10], [1000, 10]];
  const r = RS.startRiving(R, { i: 4711, P, t: 0, h: 6 }, leir), j = r.jobb;
  ok(!!j && RS.startRiving(R, { i: 4711, P, t: 0, h: 6 }, leir).feil === 'Huset rives allerede.', `riving startet (${j && JSON.stringify(j.mat)}), samme hus to ganger avvises`);
  const ctx = { arbeidere: o => (o === 'riving' ? 3 : o === 'frakt' ? 2 : 0), tempo: () => 1, leir, leggInn };
  let tid = 0, hend = []; while (R.jobber.length && tid < 60 * 24 * 20) { hend = hend.concat(RS.steg(R, 10, ctx)); tid += 10; }
  const fots = RS.fotsTimer(RS.sum(j.mat), j.avst, 2);
  ok(R.revet.length === 1 && R.revet[0].i === 4711 && RS.revetSett(R).has(4711) && Math.abs(L.lager.tre - j.mat.tre) < .05 && tid / 60 > j.arbeid / 3 && Math.abs(tid / 60 - Math.max(j.arbeid / 3, fots)) < fots * .25 + 1,
    `revet og fraktet til fots på ${(tid / 60).toFixed(1)} t (anslag ${fots.toFixed(1)} t), lager ${JSON.stringify(L.lager)}`);
  const L2 = Leir.ny(); L2.lager.tre = Leir.GRUNNLAGER - 2; const R3 = RS.ny(), j3 = RS.startRiving(R3, { i: 1, P: [[50, 0], [62, 0], [62, 10], [50, 10]], t: 0, h: 6 }, leir).jobb;
  const h3 = RS.steg(R3, 60 * 40, { ...ctx, leggInn: (k, m) => Leir.leggInn(L2, k, m) });
  ok(L2.lager.tre === Leir.GRUNNLAGER && h3.some(e => e.hva === 'fullt') && j3.haug.tre > 1 && R3.jobber.length === 1, `lageret fullt: ${j3.haug.tre.toFixed(1)} m³ tre venter i haugen`);
  const R4 = RS.fraJSON(RS.tilJSON(R3)); ok(R4 && R4.jobber.length === 1 && R4.jobber[0].haug.tre === j3.haug.tre && RS.fraJSON('{"versjon":9}') === null && RS.fraJSON('tull') === null, 'lagring: fraJSON/tilJSON');
  ok(RS.kjøpsverdi({ tre: 10, betong: 0, stål: 1 }, Leir.MATERIALER) === 10 * 20000 + 60000, 'kjøpsverdi etter Leir.MATERIALER'); }

// avbryt: påbegynt hogstfelt huskes så langt det kom
{ const R = RS.ny(), j = RS.startHogst(R, { x: 60, y: 0, r: 20, skog: 1 }, leir).jobb; RS.steg(R, j.arbeid * 60 / 4 / 2, { arbeidere: () => 2, leir, leggInn: () => 0 });
  RS.avbryt(R, j.id); ok(R.hogd.length === 1 && Math.abs(R.hogd[0].andel - .25) < .01 && RS.erHogd(R, 60, 0, .1) && !RS.erHogd(R, 60, 0, .5), `avbrutt hogst: ${R.hogd[0] && R.hogd[0].andel} av feltet hogd`); }

// lastebil: turer mellom haugen og leiren med en falsk Kjoretoy (rett linje, 10 m/s)
{ const K = { planlegg: (kj, g, m) => { kj.sti = { til: m, igjen: Math.hypot(m[0] - kj.x, m[1] - kj.y) / 10 }; return { meter: 1, sekunder: kj.sti.igjen }; },
    tidIgjen: kj => (kj.sti ? kj.sti.igjen : 0), steg: (kj, s) => { if (!kj.sti) return true; kj.sti.igjen -= s; if (kj.sti.igjen <= 0) { [kj.x, kj.y] = kj.sti.til; kj.sti = null; return true; } return false; } };
  const R = RS.ny(), L = Leir.ny(); for (let i = 0; i < 3; i++) L.bygg.push({ id: i + 1, type: 'lagertelt', igjen: 0, hp: 1, nivå: 3 });
  const leggInn = (k, m) => Leir.leggInn(L, k, m), kj = { navn: 'Bil', type: 'lastebil', antall: 1, x: 0, y: 0, sti: null };
  const j = RS.startRiving(R, { i: 7, P: [[2000, 0], [2015, 0], [2015, 12], [2000, 12]], t: 0, h: 6 }, leir).jobb;
  ok(!RS.lastebil(R, kj, j.id, null, K, leir).feil && kj.oppdrag.type === 'ressurs' && j.frakt === 'lastebil', 'lastebil får oppdraget');
  const ctx = { arbeidere: o => (o === 'riving' ? 4 : 0), tempo: () => 1, leir, leggInn }; let turer = 0, t = 0;
  while ((kj.oppdrag || R.jobber.length) && t < 60 * 24 * 10) { RS.steg(R, 1, ctx); for (const h of RS.bilSteg(R, kj, null, 60, K, leir, leggInn)) if (h.hva === 'levert') turer++; t++; }
  ok(!kj.oppdrag && R.jobber.length === 0 && turer >= Math.ceil(RS.sum(j.mat) / RS.REGLER.lastebil.last) && Math.abs(L.lager.tre - j.mat.tre) < .05 && Math.abs(L.lager.betong - j.mat.betong) < .05,
    `lastebilen kjørte ${turer} turer på ${(t / 60).toFixed(1)} t, lager ${JSON.stringify(L.lager)} (huset ga ${JSON.stringify(j.mat)})`);
  ok(RS.bilTekst({ oppdrag: { type: 'ressurs', fase: 'laster' } }) === 'laster materialer', 'tekst i kjøretøypanelet'); }

console.log(feil ? `${feil} FEIL` : 'Alle testene for materialer fra verden er ok.'); process.exit(feil ? 1 : 0);
