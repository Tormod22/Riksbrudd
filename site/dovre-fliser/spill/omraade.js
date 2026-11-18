/* Riksbrudd – ET MINDRE SPILLKART (17. nov, brukeren: «lag et kart av bare Rogaland fylke, da det per nå er mer praktisk å spille på et
 * litt mindre kart»). /rogaland viser det samme kartet som /norge, men spillet holder seg innenfor fylkesgrensa (med sjøområdet):
 * kartet åpner på fylket, alt utenfor er mørklagt, leiren må ligge innenfor, og motstanderne og krigskartet bruker bare tettstedene der.
 * Lagrede spill holdes atskilt fra /norge (index.html gir nøklene en egen ending). Grensa: pipeline/fliser/fylke.py (Kartverket).
 * Reglene øverst uten DOM (Node: require('./omraade')). window.Omraade (regler) og window.SPILLOMRÅDE (området når siden har ett).
 */
(function (rot) {
  'use strict';
  // { navn, bb, ring: [x, y, dx, dy, …] } -> { navn, bb, P: [[x, y], …] }
  function les(o) { const P = []; let x = 0, y = 0; for (let i = 0; i + 1 < o.ring.length; i += 2) { x += o.ring[i]; y += o.ring[i + 1]; P.push([x, y]); } return { navn: o.navn, bb: o.bb.slice(), P }; }
  function inni(O, x, y) { if (x < O.bb[0] || x > O.bb[2] || y < O.bb[1] || y > O.bb[3]) return false; const P = O.P; let inne = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inne = !inne; } return inne; }
  // meter fra punktet til grensa (omtrentlig: til nærmeste linjestykke)
  function tilGrensa(O, x, y) { const P = O.P; let best = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[j], b = P[i], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0, d = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); if (d < best) best = d; } return best; }
  const api = { les, inni, tilGrensa };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Omraade = api;
  const id = typeof PÅ_OMRÅDE !== 'undefined' ? PÅ_OMRÅDE : null; if (!id) return;
  document.title = 'Riksbrudd – Rogaland';
  fetch('/dovre-fliser/data/' + id + '.json').then(r => r.json()).then(o => { const O = les(o); rot.SPILLOMRÅDE = O; skitten = true;
    // åpne på fylket når det ikke alt finnes en leir å gå til
    const S = rot.OppstartSpill && OppstartSpill.tilstand(); if (!(S && S.leir) && typeof passInn === 'function') passInn(O.bb, 1.04);
  }).catch(() => { if (typeof logg === 'function') logg('Fikk ikke hentet grensa for spillkartet – hele landet er åpent.'); });
  // alt utenfor fylket er mørklagt, og grensa er en stiplet strek
  KROKER.tegn.push((g, vx0, vy1) => { const O = rot.SPILLOMRÅDE; if (!O) return; const m = kam.m, P = O.P; g.save(); g.beginPath(); g.rect(-2, -2, VW + 4, VH + 4);
    for (let i = 0; i < P.length; i++) { const x = (P[i][0] - vx0) / m, y = (vy1 - P[i][1]) / m; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath();
    g.fillStyle = 'rgba(8,8,10,.6)'; g.fill('evenodd');
    g.beginPath(); for (let i = 0; i < P.length; i++) { const x = (P[i][0] - vx0) / m, y = (vy1 - P[i][1]) / m; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath();
    g.strokeStyle = 'rgba(232,212,138,.75)'; g.lineWidth = 1.6; g.setLineDash([8, 6]); g.stroke(); g.restore(); });
  // ordre utenfor fylket stoppes (lagene holder seg på spillkartet)
  rot.OMRÅDE_OK = (x, y) => !rot.SPILLOMRÅDE || inni(rot.SPILLOMRÅDE, x, y);
  // kjør selv (spill/kjor.js): bilen og helikopteret holdes innenfor fylket – ved grensa settes kjøretøyet tilbake dit det sist var inne
  let sistInne = null, sistMeldt = 0;
  KROKER.ramme3d.push(() => { const O = rot.SPILLOMRÅDE, k = O && rot.KjorSpill && KjorSpill.fører && KjorSpill.fører(); if (!k || typeof k.X !== 'number') { sistInne = null; return; }
    if (inni(O, k.X, k.Y)) { sistInne = [k.X, k.Y]; return; } if (!sistInne) return;
    k.X = sistInne[0]; k.Y = sistInne[1]; k.v = 0; k.vx = 0; k.vy = 0; if (performance.now() - sistMeldt > 5000) { sistMeldt = performance.now(); logg('Her slutter spillkartet. Snu.'); } });
})(typeof globalThis !== 'undefined' ? globalThis : this);
