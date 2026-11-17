'use strict';
/* Riksbrudd – KAMERAENE SER (17. nov, brukeren: «det skal vises hele veien … det samme gjelder kameraene»).
 * En ferdig kameramast med strøm ser alt innen rekkevidden sin (300/500/800 m etter nivå – tallene fra Leir.BYGG.kameramast):
 * tåka i kartet er borte der, feltet lyser som lagenes siktfelt, og fiender innenfor vises (KROKER.ser). Feltet er en sirkel –
 * kameraet ser ikke bak åser slik lagene gjør (forenkling). Uten strøm er kameraet blindt. window.KameraSpill.
 */
(function () {
  const LB = window.Leir; if (!LB || !LB.BYGG.kameramast) return;
  let liste = [], sist = 0;
  function kameraer() { const nå = performance.now(); if (nå - sist < 500) return liste; sist = nå;
    const L = window.LeirSpill && LeirSpill.tilstand(), s = window.LeirSpill && LeirSpill.siste && LeirSpill.siste(), R = LB.BYGG.kameramast.nivå.rekkevidde;
    liste = L ? L.bygg.filter(b => b.type === 'kameramast' && LB.virker(b) && !b.av && !(s && s.mangler && s.mangler.has(b.id))).map(b => ({ x: b.x, y: b.y, r: R[Math.min(R.length, b.nivå || 1) - 1], id: b.id, nivå: b.nivå || 1 })) : [];
    const k = liste.map(c => c.id + ':' + c.r).join(','); if (k !== window.KAMERA_NOKKEL) { window.KAMERA_NOKKEL = k; if (typeof skitten !== 'undefined') skitten = true; }
    return liste; }
  // tåka åpnes (m = meter per punkt; uten den kartets egen målestokk) – brukes både i 2D og i tåkebildet til 3D (fritt)
  const tåke = (g, vx0, vy1, m = kam.m) => { g.fillStyle = '#000'; for (const c of kameraer()) { g.beginPath(); g.arc((c.x - vx0) / m, (vy1 - c.y) / m, c.r / m, 0, 6.283); g.fill(); } };
  tåke.fritt = true; KROKER.tåke.push(tåke);
  KROKER.siktlys.push((g, vx0, vy1, m = kam.m) => { g.save(); for (const c of kameraer()) { const x = (c.x - vx0) / m, y = (vy1 - c.y) / m, r = c.r / m;
    g.globalAlpha = .17; g.fillStyle = 'rgb(240,215,154)'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.globalAlpha = .5; g.strokeStyle = 'rgb(240,215,154)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke(); } g.restore(); });
  // fienden vises når kameraet er smart, eller når noen i kontrollrommet har sett klippet (spill/kameravakt-visning.js)
  KROKER.ser.push(e => e.side !== 'blå' && kameraer().some(c => Math.hypot(e.x - c.x, e.y - c.y) <= c.r && (!window.KameravaktSpill || KameravaktSpill.ser(c))));
  window.KameraSpill = { kameraer: () => { sist = 0; return kameraer(); } };
})();
