// Runde 7: eskaleringen – motstanderne blir farligere over tid. Kjør fra repo-roten: node pipeline/fliser/test_eskalering.js
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const E = require('../../site/dovre-fliser/spill/eskalering'), R = E.REGLER;
// vanskelighetsgraden
assert.equal(E.grad({ vanskelighet: 'hard' }).id, 'hard'); assert.equal(E.grad({ faktor: { fiende: .75 } }).id, 'lett'); assert.equal(E.grad().id, 'vanlig');
for (const id of ['lett', 'vanlig', 'hard']) assert(R.grad[id].tak >= 6 && R.grad[id].varsel >= 4 * 60, 'varsel minst fire timer: ' + id);
assert(R.grad.lett.storbyFra > R.grad.vanlig.storbyFra && R.grad.vanlig.storbyFra > R.grad.hard.storbyFra, 'storbyer tidligere jo vanskeligere');
assert(R.grad.lett.leirFra > R.grad.vanlig.leirFra && R.grad.vanlig.leirFra > R.grad.hard.leirFra, 'leirangrep tidligere jo vanskeligere');
// økonomien: tettstedene gir penger og folk
{ const g = E.grad(), i0 = E.inntekt(0, g), i1 = E.inntekt(20000, g); assert(i1.kr > i0.kr && i1.folk > i0.folk, 'tettsteder gir mer');
  const Ø = E.nyØkonomi(); E.tjen(Ø, 20000, 1440, g); assert(Math.abs(Ø.kr - (R.økonomi.startKr + i1.kr)) < 1, 'ett døgn inntekt');
  E.tjen(Ø, 1e7, 1440 * 30, g); assert(Ø.kr === R.økonomi.maksKr && Ø.folk === R.økonomi.maksFolk, 'kassa har tak');
  assert(E.inntekt(0, E.grad({ vanskelighet: 'hard' })).kr > E.inntekt(0, E.grad({ vanskelighet: 'lett' })).kr, 'hard tjener mer'); }
// kjøp: lag først, så lastebil, så stridsvogn (fra et visst døgn)
{ const g = E.grad(), rik = () => ({ kr: 20e6, folk: 60, kjøpt: {} });
  assert.equal(E.kjøp(rik(), { lag: 5, tak: 8, døgn: 4, g }), 'lag'); assert.equal(E.kjøp({ kr: 1e6, folk: 60 }, { lag: 5, tak: 8, døgn: 4, g }), null, 'for lite penger');
  assert.equal(E.kjøp({ kr: 20e6, folk: 3 }, { lag: 5, tak: 8, døgn: 4, g }), null, 'for få folk');
  assert.equal(E.kjøp(rik(), { lag: 8, tak: 8, lastebiler: 1, døgn: 4, g }), 'lastebil'); assert.equal(E.kjøp(rik(), { lag: 8, tak: 8, lastebiler: 2, døgn: 4, g }), null, 'ingen stridsvogn tidlig');
  assert.equal(E.kjøp(rik(), { lag: 8, tak: 8, lastebiler: 2, døgn: 8, g }), 'stridsvogn'); assert.equal(E.kjøp(rik(), { lag: 8, tak: 8, lastebiler: 2, stridsvogner: 1, døgn: 9, g }), null, 'høyst én');
  assert.equal(E.kjøp({ kr: 5e6, folk: 60 }, { lag: 7, tak: 10, lastebiler: 2, døgn: 8, g }), null, 'sparer til stridsvogna'); assert.equal(E.kjøp({ kr: 5e6, folk: 60 }, { lag: 4, tak: 10, døgn: 8, g }), 'lag', 'få lag: lag først');
  const Ø = rik(); E.betal(Ø, 'lag'); assert(Ø.kr === 20e6 - R.pris.lag.kr && Ø.folk === 60 - 12 && Ø.kjøpt.lag === 1); }
// taket vokser etter freden
assert.equal(E.tak(6, 40, E.grad(), 14), R.grad.vanlig.tak + 7, 'flere tettsteder gir flere lag'); assert.equal(E.tak(6, 0), 6); assert.equal(E.tak(6, 3.5), 9); assert.equal(E.tak(6, 40), R.grad.vanlig.tak); assert.equal(E.tak(6, 40, E.grad({ vanskelighet: 'lett' })), R.grad.lett.tak);
// behov og mål
const by = (id, navn, x, y, folk, eier, forsvar = 0) => ({ id, navn, x, y, folk, eier, forsvar, minst: Math.ceil(Math.max(4, Math.round(Math.sqrt(folk) / 7)) * .5) });
const fri = n => Array.from({ length: n }, (_, i) => ({ id: 'L' + i, x: i * 300, y: 0, styrke: 12 }));
{ const g = E.grad(), stor = by(1, 'Storby', 15000, 0, 235000, null), lite = by(2, 'Bygda', 6000, 0, 900, null), blå = by(3, 'Blåby', 9000, 0, 1500, 'blå', 12);
  assert(E.behov(stor, g) >= stor.minst, 'storbyen krever minst'); assert(E.behov(blå, g) >= 12 * R.plan.margin, 'forsvarte krever mer enn forsvarerne');
  assert(!E.gruppemål(lite) && E.gruppemål(blå) && E.gruppemål(stor), 'små nøytrale tar lagene selv');
  assert(!E.tillatt(stor, 5, g, 3.5) && E.tillatt(stor, g.storbyFra, g, 3.5), 'storbyer fra storbyFra');
  // for få lag: ingenting
  assert.equal(E.velgMål({ side: 'rød', døgn: 10, g, storFra: 3.5, byer: [stor, lite, blå], fri: fri(1) }), null, 'ett lag er ingen gruppe');
  // blått tettsted før storbyen er lov
  const v = E.velgMål({ side: 'rød', døgn: 5, g, storFra: 3.5, byer: [stor, lite, blå], fri: fri(4) });
  assert(v && v.mål.id === 3 && v.lag.length >= 2 && v.styrke >= v.behov, 'går mot spillerens tettsted med flere lag');
  assert.equal(E.velgMål({ side: 'rød', døgn: 3, g, storFra: 3.5, byer: [blå], fri: fri(4) }), null, 'dine tettsteder først fra blåFra');
  assert.equal(E.velgMål({ side: 'rød', døgn: 5, g, storFra: 3.5, byer: [blå], fri: fri(4), blåOpptatt: true }), null, 'ikke to angrep på deg samtidig');
  assert(v.styrke <= Math.max(2 * 12, v.behov * R.plan.blåOvervekt + 12), 'mindre overvekt mot deg');
  // storbyen når den er lov og de er mange nok
  const w = E.velgMål({ side: 'rød', døgn: g.storbyFra, g, storFra: 3.5, byer: [stor], fri: fri(5) }); assert(w && w.mål.id === 1 && w.styrke >= stor.minst, 'storbyen');
  assert.equal(E.velgMål({ side: 'rød', døgn: 9, g, storFra: 3.5, byer: [stor], fri: fri(2) }), null, 'for få til storbyen');
  // egne tettsteder er ikke mål
  assert.equal(E.velgMål({ side: 'blå', døgn: 9, g, storFra: 3.5, byer: [blå], fri: fri(4) }), null);
  // leiren går foran, med minst leirLag lag
  const l = E.velgMål({ side: 'rød', døgn: 9, g, storFra: 3.5, byer: [stor, blå], fri: fri(5), leir: { x: 5000, y: 3000, forsvar: 8 } });
  assert(l && l.mål.leir && l.lag.length >= g.leirLag, 'leirangrep med ' + g.leirLag + ' lag');
  // gruppa er ikke større enn gruppeMaks
  const m = E.velgMål({ side: 'rød', døgn: 9, g, storFra: 3.5, byer: [by(4, 'Festning', 8000, 0, 3000, 'grønn', 200)], fri: fri(10) }); assert.equal(m, null, 'for sterkt forsvar'); }
// samlingssted: eget tettsted nær målet, ellers nøytralt, ellers laget nærmest
{ const mål = { id: 9, x: 10000, y: 0 }, byer = [by(1, 'Eget', 6000, 0, 800, 'rød'), by(2, 'Nøytralt', 7000, 0, 500, null), by(3, 'Langt', 40000, 0, 500, 'rød'), by(4, 'Inntil', 9500, 0, 500, 'rød')];
  assert.equal(E.samlested(mål, byer, 'rød').navn, 'Eget', 'eget foran nøytralt; ikke inntil målet');
  assert.equal(E.samlested(mål, byer.slice(1), 'rød').navn, 'Nøytralt'); const s = E.samlested(mål, [], 'rød', [{ x: 1000, y: 0 }, { x: 7000, y: 0 }]); assert.equal(s.x, 7000); }
// fasene
{ const G = { fase: 'samler', start: 0, angripFra: 360, behov: 30 };
  assert.equal(E.fase(G, { tid: 100, nær: 30, styrke: 36 }), 'samler', 'venter på varselet'); assert.equal(E.fase(G, { tid: 400, nær: 30, styrke: 36 }), 'angriper');
  assert.equal(E.fase(G, { tid: 400, nær: 5, styrke: 36 }), 'samler', 'ikke samlet'); assert.equal(E.fase(G, { tid: R.plan.samleMaks + 1, nær: 5, styrke: 36 }), 'angriper', 'går etter samleMaks');
  assert.equal(E.fase(G, { tid: 400, nær: 5, styrke: 10 }), 'oppgitt', 'for svak'); assert.equal(E.fase({ ...G, fase: 'angriper' }, { tid: 400, nær: 0, styrke: 36, eid: true }), 'ferdig');
  assert.equal(E.fase({ ...G, fase: 'angriper' }, { tid: R.plan.angrepMaks + 1, nær: 0, styrke: 36 }), 'oppgitt'); }
// et punkt på ruta, ikke inntil leiren
{ const p = E.rutePunkt([{ x: 0, y: 0 }, { x: 10000, y: 0 }], { x: 0, y: 0 }); assert(Math.abs(p.x - 5000) < 1);
  const q = E.rutePunkt([{ x: 0, y: 0 }, { x: 10000, y: 0 }], { x: 4000, y: 0 }); assert(q && Math.hypot(q.x - 4000, q.y) >= R.rute.fraLeir, 'minst fraLeir fra leiren'); assert.equal(E.rutePunkt([{ x: 0, y: 0 }, { x: 3000, y: 0 }], { x: 1400, y: 0 }), null, 'kort rute inntil leiren');
  assert.equal(E.rutePunkt([{ x: 0, y: 0 }]), null); }
// teksten
{ const t = E.varselTekst({ fraksjon: 'Ravnsund', antall: 4, mann: 46, sted: { navn: 'Sandnes', x: 0, y: 9000 }, mål: { navn: 'Ålgård', eier: 'blå' }, leir: { x: 0, y: 0 }, om: 360 });
  assert(/Ravnsund samler 4 lag/.test(t) && /ved Sandnes/.test(t) && /Ålgård \(ditt\)/.test(t) && /ca\. 6 t/.test(t), t);
  const u = E.varselTekst({ fraksjon: 'Mosevakt', antall: 3, mann: 33, sted: { navn: 'Oltedal', x: 0, y: 9000 }, mål: { leir: true }, leir: { x: 0, y: 0 }, om: 240 }); assert(/leiren din/.test(u) && /9 km nord/.test(u), u); }
// i nettleseren: globalThis.Eskalering
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/eskalering.js'), 'utf8'), k); assert.equal(typeof k.Eskalering.velgMål, 'function'); }
console.log('ok – eskalering: vanskelighetsgrad, økonomi, kjøp, tak, mål, samlingssted, faser, ruter og etterretning');
// (runde 14, kritiker J) anslaget ut fra avstanden og «fienden er ved byen nå»; et varslet angrep kommer ikke før tidligst-tida
{ const t0 = E.tidligst({ nå: 100, angripFra: 460, sted: { x: 0, y: 0 }, mål: { x: 4000, y: 0 } }); assert(Math.abs(t0 - 420) < 1e-6, 'tidligst = vent + vei: ' + t0);
  const ved = E.varselTekst({ fraksjon: 'Ravnsund', antall: 2, mann: 24, sted: { navn: 'Vikeså', x: 0, y: 9000 }, mål: { navn: 'Røysland', eier: 'blå' }, leir: { x: 0, y: 0 }, om: 400, nær: 320 });
  assert(/Fienden er ved byen nå \(ca\. 300 m unna\)/.test(ved) && /tidligst om ca\. 6,5 t/.test(ved), ved);
  const langt = E.varselTekst({ fraksjon: 'Ravnsund', antall: 2, mann: 24, sted: { navn: 'Vikeså', x: 0, y: 9000 }, mål: { navn: 'Røysland', eier: 'blå' }, leir: { x: 0, y: 0 }, om: 400, nær: 5000 });
  assert(!/ved byen nå/.test(langt), langt);
  const G = { varslet: true, tidligst: 500, fase: 'samler', mål: { id: 'r', x: 0, y: 0 } };
  assert(E.holdIgjen(G, {}, { hva: 'angrip', x: 300, y: 0 }, 100), 'angrep nær målet holdes igjen');
  assert(E.holdIgjen(G, {}, { hva: 'ta', mål: 'r', x: 0, y: 0 }, 100), 'ta målet holdes igjen');
  assert(!E.holdIgjen(G, { beskutt: true }, { hva: 'angrip', x: 300, y: 0 }, 100), 'beskutt lag forsvarer seg');
  assert(!E.holdIgjen(G, {}, { hva: 'angrip', x: 300, y: 0 }, 501), 'etter tida er det lov');
  assert(!E.holdIgjen(G, {}, { hva: 'angrip', x: 9000, y: 0 }, 100), 'langt fra målet er det lov');
  assert(!E.holdIgjen({ ...G, fase: 'angriper' }, {}, { hva: 'ta', mål: 'r', x: 0, y: 0 }, 100), 'gruppa som angriper, får gå');
  console.log('runde 14: tidligst og holdIgjen ok'); }
