// S5: ødeleggelse og ingeniører. Kjør fra repo-roten: node pipeline/fliser/test_odeleggelse.js [ekte-vegnett.bin]
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { les } = require('../../site/dovre-fliser/spill/vegnett');
const K = require('../../site/dovre-fliser/spill/kjoretoy'), O = require('../../site/dovre-fliser/spill/odeleggelse');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riksbrudd-odtest-'));
let data; try { const fil = path.join(dir, 'f.bin'); execFileSync('python3', [path.join(__dirname, 'test_vegnett.py'), '--fixture', fil]); data = fs.readFileSync(fil); }
finally { fs.rmSync(dir, { recursive: true, force: true }); }
const g = les(data), R = O.REGLER;
// Testgrafen: bru 12345 på lenke 1 (B–C), tunnelløp 23456 på lenke 3 (D–C, enveis), ferjesamband 34567 (lenke 5 og 6).
const bru = { lag: 'bru', e: { id: 12345, navn: 'Testbrua' } }, tunnel = { lag: 'tunnel', e: { id: 23456, navn: 'Testtunnelen' } };
{ const T = O.ny();
  assert.equal(O.tilstand(T, 'bru', 12345), 'hel');
  const { arbeid: a } = O.nyttArbeid(T, bru, 'ødelegg'); assert.equal(a.igjen, R.tid.bru[0]);
  assert.equal(O.arbeid(T, a, 600, 500), 'for langt unna'); assert.equal(a.igjen, R.tid.bru[0], 'Ingen framgang på avstand');
  assert.equal(O.arbeid(T, a, 600, 50), 'arbeider');
  assert.equal(O.arbeid(T, a, R.tid.bru[0], 50), 'ferdig'); assert.equal(O.tilstand(T, 'bru', 12345), 'sprengt');
  assert(O.nyttArbeid(T, bru, 'ødelegg').feil, 'Kan ikke sprenge to ganger');
  // vegnettet: sprengt bru sperrer lenken, ruten går om tunnelen (lenke 2+3); sperres tunnelen også, er det ingen veg
  assert.equal(O.oppdaterVegnett(T, g), 1);
  const kj = K.ny({ navn: 'K', x: 0, y: 0 }); K.planlegg(kj, g, [2000, 0]); assert(!K.lenkerIgjen(kj).includes(1), 'Omkjøring');
  const { arbeid: b } = O.nyttArbeid(T, tunnel, 'ødelegg'); O.arbeid(T, b, R.tid.tunnel[0], 0); O.oppdaterVegnett(T, g);
  assert(K.planlegg(K.ny({ navn: 'K', x: 0, y: 0 }), g, [2000, 0]).feil, 'Bru og tunnel sperret: ingen veg');
  // reparasjon: under reparasjon er den fortsatt sperret; ferdig = åpen igjen
  const { arbeid: c } = O.nyttArbeid(T, bru, 'reparer'); assert.equal(c.igjen, R.tid.bru[1]);
  O.arbeid(T, c, 3600, 20); assert.equal(O.tilstand(T, 'bru', 12345), 'reparasjon'); O.oppdaterVegnett(T, g);
  assert(K.planlegg(K.ny({ navn: 'K', x: 0, y: 0 }), g, [2000, 0]).feil, 'Under reparasjon: fortsatt sperret');
  O.avbryt(T, c); assert.equal(O.tilstand(T, 'bru', 12345), 'sprengt', 'Avbrutt reparasjon: sprengt igjen');
  const { arbeid: d } = O.nyttArbeid(T, bru, 'reparer'); assert.equal(O.arbeid(T, d, R.tid.bru[1], 20), 'ferdig');
  assert.equal(O.tilstand(T, 'bru', 12345), 'hel'); O.oppdaterVegnett(T, g);
  assert(!K.planlegg(K.ny({ navn: 'K', x: 0, y: 0 }), g, [2000, 0]).feil, 'Reparert: veg igjen');
  assert(O.nyttArbeid(T, bru, 'reparer').feil, 'Hel bru repareres ikke');
  // ferjekai: sperrer ferjesambandet som visningen oppgir
  T.set('ferjekai:99', { tilstand: 'sprengt' }); O.oppdaterVegnett(T, g, id => id === 99 ? [34567] : []);
  assert(K.planlegg(K.ny({ navn: 'K', x: 2000, y: 0 }), g, [4000, 0]).feil, 'Sperret ferjekai: ingen ferje');
  assert(O.nyttArbeid(T, { lag: 'kraft', e: { id: 1 } }, 'ødelegg').feil, 'Kraftverk ikke ennå');
}
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/odeleggelse.js'), 'utf8'), k); assert.equal(typeof k.Odeleggelse.arbeid, 'function'); }
console.log('ok – sprenging og reparasjon tar tid og krever nærhet, sperrer og åpner vegnettet, omkjøring/ingen veg, ferjekai');
if (process.argv[2]) {   // ekte vegnett: spreng en E6-bru mellom Dombås og Otta – lastebilen finner en omkjøring eller ingen veg
  const ekte = les(fs.readFileSync(process.argv[2])), T = O.ny();
  const kj = K.ny({ navn: 'K', type: 'lastebil', x: 193233, y: 6896398 }), p = K.planlegg(kj, ekte, [212021, 6860888]);
  const e = K.lenkerIgjen(kj).find(e => ekte.infraPåLenke(e).some(([t]) => t === 60)), id = ekte.infraPåLenke(e).find(([t]) => t === 60)[1];
  T.set('bru:' + id, { tilstand: 'sprengt' }); O.oppdaterVegnett(T, ekte);
  const q = K.planlegg(K.ny({ navn: 'K', type: 'lastebil', x: 193233, y: 6896398 }), ekte, [212021, 6860888]);
  assert(q.feil || q.meter > p.meter, 'Lengre omvei eller ingen veg');
  console.log(`ok – sprengt E6-bru (NVDB ${id}): ${q.feil ? 'ingen veg' : 'omkjøring ' + ((q.meter - p.meter) / 1000).toFixed(1) + ' km lengre'}`);
}
