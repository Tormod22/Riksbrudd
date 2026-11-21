'use strict';
// Bakkens farge i 3D (runde 15, brukeren: «ikke alt ser like pent ut som pen natur-utsikt i 3D – teksturen på bakken er av og til litt
// for sandaktig, litt for gul»). Reglene her virker uten DOM (Node: pipeline/fliser/test_bakkefarge.js); naturfarger() i index.html
// bruker dem på kartbildet til 3D (etter skogbunn, relieff og strand, før det sendes til grafikkortet).
//
// HVORFOR GULT: satellittbildet (Sentinel/Landsat-mosaikken i kartflisene) gir eng, beite og åker i Rogaland en gulbrun/oliven farge
// (fargetone ca. 45–60°, lav metning), mens ekte eng og beite om sommeren er klart grønne (ca. 70–100°, metning 0,5–0,8 – målt i bildene
// i notatet). Den gamle naturfarger() økte metning og lys likt for alle farger (×1,15 og ×1,1): da ble den gulbrune marka enda mer
// sand. Nå dreies gul-oliven vegetasjon mot grønt, får litt mer metning og blir litt mørkere – mest der satellittbildet alt har farge
// (åker, eng), lite der det er grått eller lyst (berg, grus, strand, snø) og ingenting der det er brunt (lyng, myr) eller blått (vann).
(function (rot) {
  // Claudes forslag (målt mot ekte bilder, se docs/natt/natur.md «Runde 15»):
  //  dreiMaks: største dreining av fargetonen mot grønt (grader); gul0/gul1: fra hvilken tone dreiningen begynner/er full;
  //  grønn0/grønn1: der den slipper igjen (alt grønt dreies ikke mer); mett0/mett1: metningen som gir full dreining (grå mark dreies lite);
  //  lys0/lys1: lyse punkter (sand, strand, grus, berg, snø) dreies ikke; mettVeg/lysVeg: ekstra metning og lys for vegetasjonen;
  //  mett/lys: metning og lys for alt annet land (som før: 1,15 og 1,1 – det gamle er beholdt for berg, by og veg).
  const REGLER = {
    dreiMaks: 16, gul0: 34, gul1: 46, grønn0: 84, grønn1: 110, mett0: .1, mett1: .3, lys0: 150, lys1: 205,
    mettVeg: 1.22, lysVeg: 1, mett: 1.15, lys: 1.1,
    // DYRKET MARK (terrengklasse 5 i 32 m-rutene: eng, beite, åker): grønnere enn annen vegetasjon – også den matte, gulbrune
    // satellittfargen der (Jæren) –, men aldri mer enn at en slått eng fortsatt kan være gulgrønn. dyrketGul0: tonen dreiningen begynner
    // fra på dyrket mark; dyrketDrei/dyrketMett/dyrketLys: dreining (grader), metning og lys der.
    dyrketGul0: 26, dyrketDrei: 26, dyrketMett: 1.38, dyrketLys: 1.05, dyrketMett0: .05, dyrketLysTillegg: 35,
    // vann som før: 20 % av satellittbildets eget mønster, resten fast blågrått
    vann: [92, 126, 152], vannEget: .2,
  };
  const trinn = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // HSV (h i grader 0–360, s og v 0–1) fra og til RGB 0–255
  function hsv(R, G, B) {
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn; let h = 0;
    if (d > 0) { if (mx === R) h = ((G - B) / d) % 6; else if (mx === G) h = (B - R) / d + 2; else h = (R - G) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx > 0 ? d / mx : 0, mx / 255];
  }
  function rgb(h, s, v, ut) {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    ut[0] = (r + m) * 255; ut[1] = (g + m) * 255; ut[2] = (b + m) * 255; return ut;
  }
  // er punktet vann i kartbildet? (samme regel som vannmasken i index.html)
  const erVann = (R, G, B) => B > R + 18 && B > G + 4;
  // hvor mye et punkt regnes som gul-oliven vegetasjon (0–1)
  function vegetasjon(h, s, mx, Rg = REGLER) {
    return trinn(Rg.gul0, Rg.gul1, h) * (1 - trinn(Rg.grønn0, Rg.grønn1, h)) * trinn(Rg.mett0, Rg.mett1, s) * (1 - trinn(Rg.lys0, Rg.lys1, mx));
  }
  // ett punkt: [R, G, B] inn (0–255), samme rekke ut
  const tmp = [0, 0, 0];
  // d = hvor mye punktet ligger på dyrket mark (0–1; fra 32 m-rutene, utjevnet).
  // (Rask: ingen nye tabeller per punkt – 16 mill. punkter i 4096² – og det gamle, billige regnestykket når punktet ikke er vegetasjon.)
  function punkt(R, G, B, ut = [0, 0, 0], Rg = REGLER, d = 0) {
    if (B > R + 18 && B > G + 4) { const e = Rg.vannEget, V = Rg.vann; ut[0] = R * e + V[0] * (1 - e); ut[1] = G * e + V[1] * (1 - e); ut[2] = B * e + V[2] * (1 - e); return ut; }
    const l = .3 * R + .59 * G + .11 * B;
    let r0 = (l + (R - l) * Rg.mett) * Rg.lys, g0 = (l + (G - l) * (Rg.mett + .03)) * (Rg.lys + .02), b0 = (l + (B - l) * Rg.mett) * Rg.lys;
    const mx = R > G ? (R > B ? R : B) : (G > B ? G : B), mn = R < G ? (R < B ? R : B) : (G < B ? G : B), dd = mx - mn;
    // vegetasjon i gult/oliven har blått som minste kanal og er ikke for lys; alt annet går rett ut
    if (B === mx || dd <= 0 || mx >= Rg.lys1 || (B !== mn)) return klem(r0, g0, b0, ut);
    let h = mx === R ? ((G - B) / dd) * 60 : ((B - R) / dd + 2) * 60; if (h < 0) h += 360;
    const s = dd / mx, v = mx / 255;
    const lysV = 1 - trinn(Rg.lys0, Rg.lys1, mx), slipp = 1 - trinn(Rg.grønn0, Rg.grønn1, h);
    let w = trinn(Rg.gul0, Rg.gul1, h) * slipp * trinn(Rg.mett0, Rg.mett1, s) * lysV, dreiMaks = Rg.dreiMaks, mettVeg = Rg.mettVeg, lysVeg = Rg.lysVeg;
    if (d > 0) {
      // (på dyrket mark er lyse, solbelyste jorder ikke sand: lysgrensen ligger høyere der – dyrketLysTillegg)
      const wd = trinn(Rg.dyrketGul0, Rg.gul1, h) * slipp * trinn(Rg.dyrketMett0, Rg.mett1, s) * (1 - trinn(Rg.lys0 + Rg.dyrketLysTillegg, Rg.lys1 + Rg.dyrketLysTillegg, mx));
      w += ((wd > w ? wd : w) - w) * d; dreiMaks += (Rg.dyrketDrei - dreiMaks) * d; mettVeg += (Rg.dyrketMett - mettVeg) * d; lysVeg += (Rg.dyrketLys - lysVeg) * d;
    }
    if (w <= 0) return klem(r0, g0, b0, ut);
    // dreiningen er størst for de gule tonene og avtar mot grønt (en eng som alt er grønn, dreies lite)
    const dh = dreiMaks * w * (1 - trinn(Rg.gul1 + 10, Rg.grønn0, h) * .6);
    rgb(h + dh, Math.min(1, s * (1 + (mettVeg - 1) * w)), Math.min(1, v * (1 + (lysVeg - 1) * w)), tmp);
    return klem(r0 + (tmp[0] - r0) * w, g0 + (tmp[1] - g0) * w, b0 + (tmp[2] - b0) * w, ut);
  }
  function klem(r, g, b, ut) { ut[0] = r < 0 ? 0 : r > 255 ? 255 : r; ut[1] = g < 0 ? 0 : g > 255 ? 255 : g; ut[2] = b < 0 ? 0 : b > 255 ? 255 : b; return ut; }
  // hele rader av et RGBA-bilde (px: Uint8ClampedArray/Uint8Array, TW punkter brede)
  // dyrk = { W, v } (v 0–255 i W × W over hele bildet) eller null
  function naturfarger(px, TW, rad0 = 0, rad1 = TW, dyrk = null, Rg = REGLER) {
    const ut = [0, 0, 0], f = dyrk ? dyrk.W / TW : 0;
    for (let y = rad0; y < rad1; y++) { const rad = dyrk ? Math.min(dyrk.W - 1, (y * f) | 0) * dyrk.W : 0;
      for (let x = 0, q = y * TW * 4; x < TW; x++, q += 4) { const d = dyrk ? dyrk.v[rad + Math.min(dyrk.W - 1, (x * f) | 0)] / 255 : 0;
        punkt(px[q], px[q + 1], px[q + 2], ut, Rg, d); px[q] = ut[0]; px[q + 1] = ut[1]; px[q + 2] = ut[2]; } }
  }
  // dyrket mark som maske (W × W, 0–255) fra terrengklassene (32 m-ruter, klasse 5), utjevnet mellom rutene. K = klassene, w/h = rutenettet,
  // x0/y0 = hjørnet oppe til venstre i kartets meter, r = rutens størrelse; boks = [vest, sør, øst, nord] for bildet.
  function dyrketMaske(kv, boks, W = 512, klasse = 5) {
    const v = new Uint8Array(W * W), [X0, Y0, X1, Y1] = boks;
    const hent = (a, c) => (a >= 0 && c >= 0 && a < kv.w && c < kv.h && kv.K[c * kv.w + a] === klasse ? 1 : 0);
    let n = 0;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const X = X0 + (i + .5) / W * (X1 - X0), Y = Y1 - (j + .5) / W * (Y1 - Y0);
      const fa = (X - kv.x0) / kv.r - .5, fc = (kv.y0 - Y) / kv.r - .5, a0 = Math.floor(fa), c0 = Math.floor(fc), ta = fa - a0, tc = fc - c0;
      const w = (hent(a0, c0) * (1 - ta) + hent(a0 + 1, c0) * ta) * (1 - tc) + (hent(a0, c0 + 1) * (1 - ta) + hent(a0 + 1, c0 + 1) * ta) * tc;
      if (w > 0) { v[j * W + i] = w * 255; n++; } }
    return { W, v, andel: n / (W * W) };
  }
  const api = { REGLER, hsv, rgb, erVann, vegetasjon, punkt, naturfarger, trinn, dyrketMaske };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Bakkefarge = api;
  // hvor mye (x, y) – utsnittets meter fra midten – ligger på dyrket mark (0–1); 0 uten maske
  api.verdi = (u, x, y) => { const M = u && u.dyrketMaske; if (!M) return 0; const i = Math.floor((x + u.S) / (2 * u.S) * M.W), j = Math.floor((u.S - y) / (2 * u.S) * M.W);
    return i < 0 || j < 0 || i >= M.W || j >= M.W ? 0 : M.v[j * M.W + i] / 255; };
  // visningen: dyrket mark for et 3D-utsnitt (samme terrengklasser som skogmasken og gard3d.js bruker)
  api.dyrket = async (u, b) => {
    if (typeof lagVindu !== 'function') return null;
    try { const kv = await lagVindu(b, false, 9); if (!kv || !kv.K) return null; return dyrketMaske(kv, [u.cx - u.S, u.cy - u.S, u.cx + u.S, u.cy + u.S]); }
    catch (e) { return null; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
