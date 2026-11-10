'use strict';
// Vakt mot ting som ser rart ut i 3D (10. nov, brukeren: «se om det er noen plasser ting ser rart ut i 3D og fiks slik at slikt ikke skjer igjen»).
// Vakt3d.sjekk(u) går gjennom det som er plassert i et 3D-utsnitt og teller feil: steiner, busker, trær, biler, flagg og lykter inne i hus,
// og ting som svever over eller er begravd i terrenget. sjekk.js bygger et utsnitt i Dombås og krever at tallene er 0 (eller nesten).
// Dyrene telles også (ut.dyr, ut.iVann; årstid: 'sommer' om ikke annet er gitt).
// Kan også kjøres i konsollen: Vakt3d.sjekk(R3.ut).
(function () {
  function sjekk(u, årstid) {
    const ut = { antall: {}, iHus: {}, svever: {}, eksempel: [] };
    if (!u) return ut;
    const rute = u.hus && u.hus.omriss ? hindringer({ hus: u.hus }) : null;
    const iHus = (x, y) => !!rute && hindring3d(x, y, rute);
    const bakke = (x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R3.EX;
    const gå = (navn, data, steg, opts) => {
      if (!data || !data.length) return;
      const n = data.length / steg; ut.antall[navn] = n; ut.iHus[navn] = 0; ut.svever[navn] = 0;
      // et jevnt utvalg (høyst 4000) så vakten er rask også med mange trær
      const hopp = Math.max(1, Math.floor(n / 4000));
      for (let k = 0; k < n; k += hopp) {
        const x = data[k * steg], y = data[k * steg + 1], z = data[k * steg + 2];
        if (opts.hus && iHus(x, y)) { ut.iHus[navn]++; if (ut.eksempel.length < 8) ut.eksempel.push([navn, 'i hus', Math.round(x + u.cx), Math.round(y + u.cy)]); }
        const d = z - bakke(x, y);
        if (Math.abs(d) > opts.tol) { ut.svever[navn]++; if (ut.eksempel.length < 8) ut.eksempel.push([navn, d > 0 ? 'svever' : 'begravd', Math.round(x + u.cx), Math.round(y + u.cy), +d.toFixed(2)]); }
      }
      if (hopp > 1) { ut.iHus[navn] = Math.round(ut.iHus[navn] * hopp); ut.svever[navn] = Math.round(ut.svever[navn] * hopp); }
    };
    if (u.smått) { gå('stein', u.smått.stein, 5, { hus: true, tol: .6 }); gå('busk', u.smått.busk, 5, { hus: true, tol: .6 }); }
    if (u.trær) { gå('gran', u.trær.gran, 5, { hus: true, tol: .6 }); gå('løv', u.trær.løv, 5, { hus: true, tol: .6 }); }
    if (u.hus) { gå('bil', u.hus.biler, 5, { hus: true, tol: .6 }); gå('flagg', u.hus.flagg, 4, { hus: true, tol: .6 }); }
    if (u.lys) gå('lykt', u.lys, 4, { hus: true, tol: .6 });
    // dyrene (spill/dyr3d.js) for årstiden: ikke i hus, ikke svevende, og ikke i vann (vannmasken u.vann, uavhengig av dyrenes egen maske)
    if (window.Dyr3d && u.dyrSteder) {
      const P = Dyr3d.punkter(u, årstid || 'sommer'); ut.dyr = {}; ut.iVann = {};
      let vann = null; if (u.vann) { const W = u.vann.width; vann = { W, d: u.vann.getContext('2d').getImageData(0, 0, W, W).data }; }
      for (const art in P) { gå(art, P[art], 3, { hus: true, tol: .3 }); ut.dyr[art] = P[art].length / 3; ut.iVann[art] = 0;
        if (vann) for (let k = 0; k < P[art].length; k += 3) { const i = Math.floor((P[art][k] + u.S) / (2 * u.S) * vann.W), j = Math.floor((u.S - P[art][k + 1]) / (2 * u.S) * vann.W);
          if (i >= 0 && j >= 0 && i < vann.W && j < vann.W && vann.d[(j * vann.W + i) * 4] > 128) { ut.iVann[art]++; if (ut.eksempel.length < 8) ut.eksempel.push([art, 'i vann', Math.round(P[art][k] + u.cx), Math.round(P[art][k + 1] + u.cy)]); } } }
    }
    return ut;
  }
  window.Vakt3d = { sjekk };
})();
