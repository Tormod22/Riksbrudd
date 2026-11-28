// ØKONOMITESTEN – strategien «bare kontrakter + leirsjef og kasserer» (fase G5, docs/natt/ut5-ledere.md). Lastes av test_okonomitest.js.
// Som «bare kontrakter», men to av folkene er ledere (spill/ledere.js), med reglene og dyktigheten de har i spillet:
//  - LEIRSJEFEN kjøper mat etter regelen «hold 5 døgn mat» (Ledere.matValg) – den slår til før driftens egen innkjøpsregel (under 3 døgn),
//    så det er leirsjefen som holder leiren med mat. En lite dyktig leirsjef kjøper seinere og av og til for lite.
//  - KASSEREREN «hold minst 5 mill. i kassa»: rekruttering, bygg, tømmerbil og teknologi stoppes når kjøpet ville tatt kassa under
//    (Ledere.kassaValg – en lite dyktig kasserer slipper av og til et kjøp gjennom). Lønn, vedlikehold, mat og diesel stoppes aldri.
//  - De to dyktigste i gjengen (Ledere.ledelse) blir ledere og får lederlønn (Ledere.lederLønn: 1,5–2 × 15 000 kr) – det koster.
// Kravet (Claudes forslag): med ledere ender strategien (median dag 30) mellom 0,85 og 1,1 × «bare kontrakter», og ikke flere blakke
// kjøringer enn uten (+ 5 prosentpoeng slingring). Resten av kravene (blakk, over «gjør ingenting», under 200 mill.) gjelder som for alle.
'use strict';
const path = require('path');
const O = require('./okosim.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const LR = require(SP + '/ledere.js'), FolkR = require(SP + '/folk.js');
const { Marked } = require(SP + '/spillet.js');

// Claudes forslag: reglene lederne får i modellen, og postene kassereren passer på
const LM = { mat: 5, minimum: 5e6, stopper: ['rekruttering', 'bygg', 'tømmerbil', 'teknologi'], gulv: .85, tak: 1.1, blakkSlakk: .05 };

O.leggTilStrategi({ id: 'kontrakterLedere', navn: 'bare kontrakter + leirsjef og kasserer', fornuftig: true,
  tekst: 'som «bare kontrakter», og en leirsjef som holder 5 døgn mat og en kasserer som holder minst 5 mill. i kassa (rekruttering og bygg stoppes under)',
  start(sim) {
    O.STRATEGIER.kontrakter.start(sim);
    const S = sim.ledere = Object.assign(LR.ny(sim.frø * 7919 + 13), { kjøp: 0, rasjoner: 0, stoppet: 0, slapp: 0 }), r = LR.rng(S);
    const P = sim.F.personer.slice().sort((a, b) => LR.ledelse(b) - LR.ledelse(a));
    LR.utnevn(S, 'leirsjef', null, P[0], 0, { regler: { mat: LM.mat, diesel: 0, bygg: 'av' } });
    LR.utnevn(S, 'kasserer', null, P[1], 0, { regler: { minimum: LM.minimum } });
    // kassereren: kjøpene på postene over stoppes når kassa ville gått under minimum
    const betal = sim.betal;
    sim.betal = (kr, post) => {
      const A = S.ledere.kasserer, p = A && sim.F.personer.find(q => q.id === A.person);
      if (p && LM.stopper.includes(post) && kr > 0) { const v = LR.kassaValg(sim.kasse, kr, A.regler, A.ledelse, r); if (!v.ok) { S.stoppet++; return false; } if (v.dårlig) S.slapp++; }
      return betal(kr, post);
    };
    sim.lederRng = r;
  },
  time(sim) {
    const S = sim.ledere, A = S && S.ledere.leirsjef, p = A && sim.F.personer.find(q => q.id === A.person);
    if (p && sim.F.personer.length) {
      const B = FolkR.behov(sim.F, sim.L, { årstid: sim.årstid });
      const v = LR.matValg({ mat: sim.F.mat, forbruk: B.spiser - B.drivhus }, A.regler, A.ledelse, sim.lederRng);
      if (v) { const n = Marked.kan(sim.M, 'mat', v.rasjoner), kr = n * Marked.pris(sim.M, 'mat', FolkR.R.matPris);
        if (n > 0 && sim.betal(kr, 'mat')) { sim.F.mat += n; Marked.ta(sim.M, 'mat', n); S.kjøp++; S.rasjoner += n; } }
    }
    O.STRATEGIER.kontrakter.time(sim);
  },
  døgn(sim) { if (O.STRATEGIER.kontrakter.døgn) O.STRATEGIER.kontrakter.døgn(sim); } });

O.leggTilDel({ id: 'ledere', slutt(sim, res) { if (sim.ledere) { const S = sim.ledere; res.ledere = { kjøp: S.kjøp, rasjoner: S.rasjoner, stoppet: S.stoppet, slapp: S.slapp,
  igjen: Object.values(S.ledere).filter(A => sim.F.personer.some(p => p.id === A.person)).length }; } } });

O.leggTilKrav({ navn: 'ledere', sjekk(RES) {
  const ut = [], L = RES.kontrakterLedere || [], B = RES.kontrakter || []; if (!L.length || !B.length) return ut;
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
  const a = med(L.map(r => r.slutt)), b = med(B.map(r => r.slutt));
  ut.push({ ok: a >= b * LM.gulv && a <= b * LM.tak, tekst: `med leirsjef og kasserer ${O.mill(a)} mot ${O.mill(b)} uten (median dag 30; mellom ${LM.gulv} og ${LM.tak} ganger)` });
  const blakk = R => R.filter(r => r.sluttBlakk).length / R.length;
  ut.push({ ok: blakk(L) <= blakk(B) + LM.blakkSlakk, tekst: `blakk til slutt: ${Math.round(blakk(L) * 100)} % med ledere mot ${Math.round(blakk(B) * 100)} % uten` });
  const kjøp = L.reduce((s, r) => s + (r.ledere ? r.ledere.kjøp : 0), 0) / L.length, stopp = L.reduce((s, r) => s + (r.ledere ? r.ledere.stoppet : 0), 0) / L.length;
  ut.push({ ok: kjøp >= 1, tekst: `leirsjefen kjøpte mat ${kjøp.toFixed(1).replace('.', ',')} ganger per kjøring (minst 1); kassereren stoppet ${stopp.toFixed(1).replace('.', ',')} kjøp per kjøring` });
  return ut;
} });

module.exports = { LM };
