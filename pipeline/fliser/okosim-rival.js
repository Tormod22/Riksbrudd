// ut5-rivaler (Ø8): ØKONOMITESTEN får en enkel rival. Rival.simuler (spill/rival.js) spiller Ravnsund og Mosevakt i 30 døgn med de samme
// reglene som i spillet (eskaleringens inntekt, lønn 15 000 kr per mann, råd til lag, byavtaler, kontrakter, sagbruk) og seier.js.
// Krav (Claudes forslag): en rival med normal flaks (medianen av frøene) vinner ikke før dag 15 og blir ikke blakk før dag 10.
// Selve regeltesten med selvtest: node pipeline/fliser/test_rival.js (SELVTEST=1).
'use strict';
const O = require('./okosim.js'), RV = require('../../site/dovre-fliser/spill/rival.js');
const median = a => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
O.leggTilKrav({ navn: 'rivalene', sjekk(RES, REGLER) {
  const ut = [], n = Math.max(20, Math.min(100, (REGLER && REGLER.frø) || 60));
  for (const side of ['rød', 'grønn']) {
    const kj = []; for (let f = 1; f <= n; f++) kj.push(RV.simuler({ frø: f, side }));
    const seier = median(kj.map(k => (k.seier ? k.seier.dag : 99))), blakk = median(kj.map(k => (k.blakkDag === null ? 99 : k.blakkDag + 1)));
    ut.push({ ok: seier >= 15, tekst: `${side === 'rød' ? 'Ravnsund' : 'Mosevakt'} med normal flaks vinner ikke før dag 15 (median ${seier >= 99 ? 'ikke innen 30 døgn' : 'dag ' + seier})` });
    ut.push({ ok: blakk >= 10, tekst: `${side === 'rød' ? 'Ravnsund' : 'Mosevakt'} blir ikke blakk før dag 10 (median ${blakk >= 99 ? 'aldri innen 30 døgn' : 'dag ' + blakk})` });
  }
  return ut;
} });
