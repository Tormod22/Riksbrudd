/* «Gå hit» og døra: regler uten DOM (Node: require('./gaavalg'); nettleser: globalThis.Gaavalg). Visningen er i spill/gange.js.
 * Runde 6 (19. nov, kritikken): «Gå» satte deg alltid ved leiren/karakteren, også når kameraet så på gården 800 m unna, så husene var
 * utenfor rekkevidde (dagen før var klagen at det så ut som du teleporterte). Nå spør «Gå» når kameraet ser langt fra karakteren:
 * «Reis hit (ca. N min til fots)» – karakteren går dit og spilltiden går tilsvarende – eller «Gå her, der du står».
 * Og på telefon var døra vanskelig å treffe (åpningen er 1,1 m, kroppen 0,6 m): nå trekkes du inn mot midten av døra når du går mot
 * den, og knappene «Gå inn» / «Gå ut» går gjennom døra for deg.
 */
(function (rot) {
  'use strict';
  // Claudes forslag (alle tallene):
  const REGLER = {
    // kameraet ser innen så mange meter fra karakteren: «Gå» starter der karakteren står uten å spørre
    nær: 60,
    // fart til fots i terrenget (km/t) og omvegen (terrenget er ikke en rett linje)
    kmt: 4, omveg: 1.25,
    // lenger enn dette (m) reiser du ikke i ett strekk: gå i etapper
    maks: 6000,
    // farten spillet spoles med mens du reiser (ganger sanntid), og hvor lenge reisen minst vises (sekunder)
    spol: 600, minVis: 1.2,
    dør: {
      // «Gå inn» vises når du står ute innen så mange meter fra en inngang; «Gå ut» inne når døra er nærmere enn ute (telefon: alltid inne)
      nær: 5, ute: 5,
      // døra trekker deg mot midten når du er så nær døråpningen (m langs normalen) og høyst så langt til siden av åpningen
      trekk: 1.6, side: .8,
      // hvor fort du trekkes mot midten (andel per sekund) og hvor tydelig du må gå mot døra (cos til normalen)
      fart: 7, mot: .35,
      // hjelpen «Gå inn/ut»: punktene foran og bak døra (m), og hvor lenge den prøver før den setter deg på plass (s, pluss per meter)
      foran: 1.3, bak: 1, tid: 2.5, perMeter: .7,
    },
    // RUNDE 8 (20. nov natt, ny kritikk) – Claudes forslag:
    // styrespaken på telefon: bare et trykk innen spakR punkter fra spakens midte (90, høyden − 120) eller helt nede til venstre
    // (nederste spakBunn punkter, venstre spakBredde av bredden) blir styrespak – før var hele nedre venstre firedel spak, så et drag
    // midt på skjermen (kritikeren: fra x 150 til 300 i høyde 450 av 844) flyttet deg i stedet for å snu deg. følsom = radianer per punkt.
    berøring: { spakR: 110, spakBunn: 220, spakBredde: .42, følsom: .005 },
    // pila mot nærmeste inngang («Inngang 14 m →»): bygg med dør innen maks meter; vises ikke nærmere enn min (da kommer «Gå inn»),
    // og ikke når døra er rett foran deg (innen rett grader) og vender mot deg innen synlig meter (da står «Inngang»-merket over døra)
    peker: { maks: 70, min: 4.5, rett: 25, synlig: 28 },
    // «Gå inn i huset» fra kartet: du reiser til et punkt så mange meter utenfor huset (ute), og du settes så mange meter foran døra; nærmere enn nær meter reiser du ikke, du bare går inn. Venter så lenge (s) på interiøret,
    // og høyst maksVent sekunder på at kartet rundt deg er bygget før du begynner å gå (gjelder all gange)
    inn: { ute: 5, foran: 2.4, nær: 40, vent: 8, maksVent: 120 },
    // reisen: høyst så mange spillminutter per bilde (sim får små steg som ellers), og 3D tegnes ikke mens du reiser eller mens kartet
    // rundt målet bygges (det var tegningen av hvert bilde med programvare-grafikk som gjorde at siden svarte tregt i minutter)
    reise: { maksPerBilde: 3 },
    // snur du deg (dra/mus) når bildene tar over treg ms (snitt), tegnes 3D i oppløsningen pr (andel) til hold ms etter siste bevegelse –
    // med programvare-grafikk tok hvert bilde flere sekunder, så å snu seg med musa føltes som at spillet frøs
    snu: { treg: 120, pr: .5, hold: 700 },
  };
  const R = REGLER;
  // Minutter til fots for d meter (minst 1)
  const reiseMin = d => Math.max(1, Math.round(d * R.omveg / (R.kmt * 1000 / 60)));
  // Hva «Gå» skal gjøre når kameraet ser d meter fra karakteren: 'her' (start der karakteren står), 'spør' (tilby å reise) eller
  // 'forLangt' (bare «Gå her», og si at det er for langt). min = minutter til fots.
  function valg(d) {
    if (!(d > R.nær)) return { type: 'her', min: 0 };
    const min = reiseMin(d);
    return d > R.maks ? { type: 'forLangt', min } : { type: 'spør', min };
  }
  // Teksten om tiden: «ca. 15 min» / «ca. 1 t 20 min»
  function tidTekst(min) { const t = Math.floor(min / 60), m = Math.round(min % 60); return 'ca. ' + (t ? t + ' t' + (m ? ' ' + m + ' min' : '') : m + ' min'); }
  // Døra: I = { x, y, nx, ny (ut av huset), ux, uy (langs veggen), w (åpningen) }. Hvor langt du står ut fra veggen (ut > 0 = ute) og
  // langs den fra midten av døra.
  function iDøra(I, x, y) { const rx = x - I.x, ry = y - I.y; return { ut: rx * I.nx + ry * I.ny, langs: rx * I.ux + ry * I.uy }; }
  // Forskyvningen langs veggen (meter, i retning u) som trekker deg mot midten av døra dette steget. (dx, dy) er retningen du vil gå
  // (enhetsvektor eller 0). Bare når du er nær døråpningen og går gjennom den – inn når du står ute, ut når du står inne.
  function dørTrekk(I, x, y, dx, dy, dt) {
    const { ut, langs } = iDøra(I, x, y), D = R.dør, w = I.w || 1.1;
    if (Math.abs(ut) > D.trekk || Math.abs(langs) > w / 2 + D.side || !(dt > 0)) return 0;
    const mot = dx * I.nx + dy * I.ny;
    if (ut > 0 ? mot > -D.mot : mot < D.mot) return 0;
    return -langs * Math.min(1, dt * D.fart);
  }
  // Punktene «Gå inn» går gjennom: foran døra (midt ut for åpningen) og innenfor. «Gå ut»: motsatt.
  function dørVei(I, inn) {
    const D = R.dør, foran = [I.x + I.nx * D.foran, I.y + I.ny * D.foran], bak = [I.x - I.nx * D.bak, I.y - I.ny * D.bak];
    return inn ? [foran, bak] : [bak, foran];
  }
  // Kursen (som Gange: du ser mot (−sin a, cos a)) som peker fra (x, y) mot (tx, ty)
  const kurs = (x, y, tx, ty) => Math.atan2(-(tx - x), ty - y);
  // ---------- RUNDE 8 ----------
  // Blir et trykk på (x, y) styrespak (telefon, skjermen vw × vh)? Ellers ser du rundt.
  function erSpak(x, y, vw, vh) { const B = R.berøring; return Math.hypot(x - 90, y - (vh - 120)) < B.spakR || (x < vw * B.spakBredde && y > vh - B.spakBunn); }
  // Inngangen til et bygg ut fra døra hus3d la på omrisset (P.dør: midt i døra, ux/uy langs veggen) og omrisset P: { x, y, nx, ny (ut av
  // huset), ux, uy, w }. Normalen snus så den peker bort fra midten av huset.
  function inngang(P, D) {
    let mx = 0, my = 0; for (const [x, y] of P) { mx += x; my += y; } mx /= P.length; my /= P.length;
    let nx = -D.uy, ny = D.ux; if (nx * (D.x - mx) + ny * (D.y - my) < 0) { nx = -nx; ny = -ny; }
    return { x: D.x, y: D.y, nx, ny, ux: D.ux, uy: D.uy, w: D.w || 1.1 };
  }
  // Retningen til døra sett fra deg: rel = vinkelen fra blikket (kurs a) til døra (radianer, + = til høyre), om døra vender mot deg
  // (du står på utsiden av veggen den sitter i), og om pila skal vises (ikke for nær, ikke når døra er rett foran deg og synlig).
  function pekerMot(I, x, y, a) {
    const P = R.peker, dx = I.x + I.nx * .7 - x, dy = I.y + I.ny * .7 - y, d = Math.hypot(dx, dy);
    const hx = -Math.sin(a), hy = Math.cos(a), rel = Math.atan2(dx * Math.cos(a) + dy * Math.sin(a), dx * hx + dy * hy);
    const vender = (x - I.x) * I.nx + (y - I.y) * I.ny > 0;
    const vis = d >= P.min && d <= P.maks && !(vender && d < P.synlig && Math.abs(rel) < P.rett * Math.PI / 180);
    return { d, rel, vender, vis };
  }
  // Teksten på pila: «Inngang 14 m» (og «på andre siden» når døra vender bort fra deg)
  const pekerTekst = q => `Inngang ${q.d < 10 ? q.d.toFixed(0) : Math.round(q.d / 5) * 5} m` + (q.vender ? '' : ' · rundt huset');
  // Punktet utenfor huset som er nærmest (fx, fy), ute meter ut fra veggen – dit «Gå inn i huset» reiser fra kartet
  function utenfor(P, fx, fy, ute) {
    let best = null, bd = Infinity;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((fx - ax) * vx + (fy - ay) * vy) / l2)), px = ax + vx * t, py = ay + vy * t, d = Math.hypot(fx - px, fy - py); if (d < bd) { bd = d; best = [px, py]; } }
    if (!best) return [fx, fy]; const l = bd || 1, k = Math.min(ute, bd);
    return bd > 1e-6 ? [best[0] + (fx - best[0]) / l * k, best[1] + (fy - best[1]) / l * k] : best;
  }
  // Spillminutter i dette bildet mens du reiser: som spilløkka (sanntid × tempo), men høyst maksPerBilde
  const reiseSteg = (dtSek, tempo) => Math.min(R.reise.maksPerBilde, Math.max(0, dtSek) * tempo / 60);
  const api = { REGLER, reiseMin, valg, tidTekst, iDøra, dørTrekk, dørVei, kurs, erSpak, inngang, pekerMot, pekerTekst, utenfor, reiseSteg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Gaavalg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
