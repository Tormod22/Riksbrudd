'use strict';
/* Riksbrudd – FORMASJONER OG ERFARING i spillet (reglene i spill/formasjon.js). Formasjonen velges i lagpanelet («Formasjon: Kile» blar),
 * mennene står etter den i kartet og i 3D (FORMPLASS i index.html), og den teller i ildkamp (KROKER.ild). Hvert spillminutt et lag
 * skyter eller blir beskutt, lærer mennene; erfarne, veteraner og elite treffer bedre. Fiendens lag velger formasjon etter det de gjør.
 */
(function () {
  const F = window.Formasjon; if (!F) return;
  KROKER.ild.push((a, b) => (a && b && Array.isArray(a.menn) && Array.isArray(b.menn) ? F.ild({ id: a.formasjon }, { id: b.formasjon }) * F.erfFaktor(a.menn) : 1));
  let akk = 0;
  KROKER.sim.push(dt => { akk += dt; if (akk < 1) return; akk = 0; const i = new Set();
    for (const k of SKUDD) { if (k.a && Array.isArray(k.a.menn)) i.add(k.a); if (k.b && Array.isArray(k.b.menn)) i.add(k.b); }
    for (const s of i) { const opp = F.lær(s.menn, 1); if (opp.length && s.side === 'blå' && !s.karakter) { logg(`${s.navn}: ${opp.length === 1 ? opp[0].navn + ' er nå ' + opp[0].nivå.toLowerCase() : opp.length + ' har fått mer erfaring'} (${F.erfTekst(s.menn)}).`); if (valgt === s) visPanel(); } }
    // fiendens lag: linje når de angriper, spredt når de holder en stilling, ellers kile
    for (const s of ENHETER) if (s.ai) { const f = s.ai.hva === 'angrip' || s.ai.hva === 'leir' ? 'linje' : s.ai.hva === 'hold' ? 'spredt' : 'kile'; if (s.formasjon !== f) { s.formasjon = f; skitten = true; } } });
  KROKER.lagTekst.push(s => { if (!Array.isArray(s.menn) || s.karakter) return null; const d = [], t = F.erfTekst(s.menn); if (s.formasjon && s.formasjon !== 'kile') d.push(F.type(s.formasjon).navn.toLowerCase()); if (t && t !== 'rekrutter') d.push(t + (s.side === 'blå' ? ` (treff ×${F.erfFaktor(s.menn).toFixed(2).replace('.', ',')})` : '')); return d.length ? d.join(' · ') : null; });
  KROKER.lagKnapper.push((s, H) => { if (s.side !== 'blå' || s.karakter || s.ombord) return; const T = F.type(s.formasjon), b = knapp(`Formasjon: ${T.navn}`, false, () => { s.formasjon = F.neste(s.formasjon); const N = F.type(s.formasjon); logg(`${s.navn} går i ${N.navn.toLowerCase()}. ${N.tekst}`); skitten = true; visPanel(); }); b.id = 'formknapp'; b.title = T.tekst + ' Trykk for å bytte.'; H.appendChild(b); });
  window.FormasjonSpill = { sett: (s, id) => { s.formasjon = F.TYPER[id] ? id : 'kile'; skitten = true; } };
})();
