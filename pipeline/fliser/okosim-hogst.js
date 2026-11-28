// ØKONOMITESTEN – del «hogst og salg» (eksempel på hvordan en økonomidel legger seg inn, se docs/natt/ut1-okotest.md).
// (Ø1, 28. nov) hogst gir nå TØMMER (Ressurser.hogstUtbytte(...).mat.tømmer), som selges billig (8 000 kr/m³ × 80 %) – eller sages
// (okosim-sagbruk.js). Med en tømmerbil (sim.tømmerbil) fraktes det med bil i stedet for på ryggen.
// Lastes av test_okonomitest.js (alle pipeline/fliser/okosim-*.js). Tallene fra spillet: Ressurser.hogstUtbytte og REGLER.hogst/bæring
// (felt, m³ per arbeidstime, bæring til leiren), Marked (pris, SALG = 80 %, KJØPER = det markedet tar imot per døgn), FolkRegler.tempo.
'use strict';
const path = require('path');
const O = require('./okosim.js');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Ressurser = require(SP + '/ressurser.js'), FolkR = require(SP + '/folk.js'), Leir = require(SP + '/leir.js'), { Marked } = require(SP + '/spillet.js');

// Claudes forslag for modellen: feltene (radius 35 m) ligger i snitt 400 m fra leiren i skog med andel 0,6; et nytt felt når det forrige
// er tomt (hogstlaget i spill/penger-visning.js velger selv nærmeste skog). Bærerne går fram og tilbake (Ressurser.REGLER.bæring).
const H = { radius: 35, skog: .6, avstand: 400 };
// tømmerbilen (Claudes forslag for modellen): snittfart 30 km/t mellom feltet og leiren, lasting og lossing som lastebilen (ressurser.js)
const BIL = { kmt: 30 };
const bilPerTime = () => { const R = Ressurser.REGLER; return R.tømmerbil.last / (2 * H.avstand / 1000 / BIL.kmt + (R.lastebil.lastetid + R.lastebil.lossetid) / 3600); };

O.leggTilDel({ id: 'hogst',
  start(sim) { sim.hogst = { igjen: Ressurser.hogstUtbytte(H.radius, H.skog).mat.tømmer, haug: 0, hogd: 0, solgt: 0 }; },
  time(sim) {
    const F = sim.F, R = Ressurser.REGLER, h = sim.hogst, n = FolkR.arbeidere(F, 'hogst'); if (!n && !(h.haug > 0)) return;
    // hogst: m³ per arbeidstime × tempo (ferdighet, moral, helse)
    const m = Math.min(h.igjen, n * R.hogst.perArbeider * FolkR.tempo(F, 'hogst')); h.igjen -= m; h.haug += m; h.hogd += m;
    if (h.igjen <= 0) h.igjen = Ressurser.hogstUtbytte(H.radius, H.skog).mat.tømmer;
    // frakt til leiren til fots (folk på «frakt», ellers bærer hogstlaget selv med halv fart)
    const bærere = FolkR.arbeidere(F, 'frakt') || n / 2, perTime = sim.tømmerbil ? bilPerTime() : bærere * R.bæring.last * R.bæring.fart * 3600 / (2 * H.avstand);
    const inn = Leir.leggInn(sim.L, 'tømmer', Math.floor(Math.min(h.haug, perTime) * 10) / 10); h.haug -= inn;
  },
  døgn(sim) {
    // salg om morgenen (før markedet går videre): så mye tømmer markedet tar imot, til 80 % av markedsprisen
    if (!sim.hogst || !sim.selgTømmer) return; const L = sim.L, m = Marked.kanSelge(sim.M, 'tømmer', Math.floor((L.lager.tømmer || 0) * 10) / 10); if (!(m > 0)) return;
    const kr = Math.round(m * Marked.pris(sim.M, 'tømmer', Leir.MATERIALER.tømmer.pris) * Marked.SALG); L.lager.tømmer -= m; Marked.selg(sim.M, 'tømmer', m); sim.gi(kr, 'salg'); sim.hogst.solgt += m;
  },
});

O.leggTilStrategi({ id: 'hogst', navn: 'hogst og salg', fornuftig: true, tekst: 'fire på hogst og to på frakt; selger tømmeret markedet tar imot hver morgen',
  start(sim) { sim.selgTømmer = true; const P = sim.F.personer.slice().sort((a, b) => (b.ferd.hogst || 0) - (a.ferd.hogst || 0));
    P.forEach((p, i) => { if (i < 4) FolkR.sett(sim.F, p.id, 'hogst'); else if (i < 6) FolkR.sett(sim.F, p.id, 'frakt'); }); },
  // (ut2-balanse 28. nov) når startleiren er ferdig bygget, går de som bygde, på vakt i leiren (Leirvakta) – en fornuftig spiller lar ikke
  // leiren stå åpen for røverne mens hogstlaget er ute (før dekket belønningen for bølgene det; den er nå lavere, spillet.js Trussel)
  time(sim) { if (sim.hogstVakt || Leir.jobber(sim.L).length) return; sim.hogstVakt = true;
    for (const p of sim.F.personer) if (p.oppgave === 'bygg') FolkR.sett(sim.F, p.id, 'vakt'); },
});

O.leggTilKrav({ navn: 'hogst og salg', sjekk(RES) {
  const L = RES.hogst; if (!L) return []; const snitt = L.reduce((a, r) => a + (r.sum.inn.salg || 0), 0) / L.length, M = Marked.KJØPER.tømmer * O.REGLER.døgn;
  // salget kan aldri bli større enn det markedet tar imot (KJØPER.tømmer per døgn) til full pris med inflasjon
  const tak = M * Leir.MATERIALER.tømmer.pris * 1.8 * Math.pow(Marked.INFL, O.REGLER.døgn) * Marked.SALG;
  return [{ ok: snitt > 0 && snitt <= tak, tekst: `salget av tømmer gir i snitt ${O.mill(snitt)} på ${O.REGLER.døgn} døgn (høyst ${O.mill(tak)}: markedet tar ${Marked.KJØPER.tømmer} m³ i døgnet)` }];
} });
module.exports = { H, BIL, bilPerTime };
