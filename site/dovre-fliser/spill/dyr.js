/* Dyr i fjellet og på innmarka: regler uten DOM (Node: require('./dyr'); nettleser: globalThis.Dyr).
 * Hvor et dyr kan være (art, høyde, terrengklasse, årstid, område), hvor flokkene står (fast per blokk i kartet, samme sted hver gang),
 * og hvordan flokken beveger seg: dyrene beiter (står, hodet ned), går sakte etter flokken, og løper unna når noen kommer nær.
 * Terrengklasser (terreng.js): 0 snaufjell, 1 skog, 2 hei, 3 vann, 4 snø, 5 dyrket, 6 myr, 7 tettbebyggelse.
 * Tallene er forslag (Claude), ikke fasit fra brukeren.
 */
(function (rot) {
  'use strict';
  const ALLE = ['vinter', 'vår', 'sommer', 'høst'];
  // blokk: rutenett i kartet (m) – én mulig flokk per blokk; p: sjansen for flokk i blokka; str: [minst, flest] i flokken;
  // spred: hvor tett flokken står (m, ganges med kvadratroten av antallet); vandre: hvor langt flokken kan trekke fra der den startet (m);
  // fart: beite (m/s når de rusler mens de beiter), gå, løp; flukt: avstand (m) der de løper unna; L: kroppslengde (m)
  const ARTER = {
    sau: { navn: 'Sau', årstider: ['sommer', 'høst'], klasser: [0, 2, 5, 6], moh: [0, 1400], blokk: 300, p: .3, str: [5, 30], spred: 3.2, vandre: 160,
      fart: { beite: .12, gå: .7, løp: 3.6 }, flukt: 28, L: 1.15, gå: .25 },
    ku: { navn: 'Ku', årstider: ['sommer'], klasser: [5], moh: [0, 1000], blokk: 420, p: .4, str: [4, 12], spred: 4.5, vandre: 70, gård: true,
      fart: { beite: .1, gå: .8, løp: 2.6 }, flukt: 9, L: 2.1, gå: .15 },
    rein: { navn: 'Villrein', årstider: ALLE, klasser: [0, 2, 4, 6], moh: [1100, 2100], blokk: 1100, p: .32, str: [18, 60], spred: 5, vandre: 900,
      fart: { beite: .2, gå: 1.3, løp: 7 }, flukt: 170, L: 1.75, gå: .45 },
    moskus: { navn: 'Moskus', årstider: ALLE, klasser: [0, 2, 6], moh: [950, 1700], blokk: 700, p: .45, str: [3, 8], spred: 4, vandre: 220,
      område: [198000, 6912000, 216000, 6930000], fart: { beite: .08, gå: .6, løp: 4.5 }, flukt: 45, L: 2.1, gå: .15 },
    elg: { navn: 'Elg', årstider: ALLE, klasser: [1], moh: [0, 1050], blokk: 900, p: .12, str: [1, 2], spred: 6, vandre: 140, kant: true,
      fart: { beite: .1, gå: 1, løp: 8 }, flukt: 80, L: 2.6, gå: .2 },
  };
  const REKKE = ['sau', 'ku', 'rein', 'moskus', 'elg'];

  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
  const artNr = art => REKKE.indexOf(art) + 1;
  // Et frø som bare avhenger av art og blokk (samme flokk på samme sted hver gang utsnittet bygges)
  const frø = (art, bx, by, k) => hash(Math.imul(bx, 73856093) ^ Math.imul(by, 19349663) ^ Math.imul(artNr(art) * 31 + k, 83492791));

  function iSesong(art, årstid) { const A = ARTER[art]; return !!A && A.årstider.includes(årstid || 'sommer'); }
  // Kan dyret stå her? s: { moh, klasse, årstid, x, y, kant (skogkant: naboruta er ikke skog), gård (nær gårdsbygg) }
  function kanVære(art, s) {
    const A = ARTER[art]; if (!A) return false;
    if (!iSesong(art, s.årstid)) return false;
    if (!A.klasser.includes(s.klasse)) return false;
    if (!(s.moh >= A.moh[0] && s.moh <= A.moh[1])) return false;
    if (A.område && !(s.x >= A.område[0] && s.x <= A.område[2] && s.y >= A.område[1] && s.y <= A.område[3])) return false;
    if (A.kant && !s.kant) return false;
    if (A.gård && !s.gård) return false;
    // sau på dyrket mark bare nær gårdene (innmarksbeite); på hei og snaufjell er det utmarksbeite
    if (art === 'sau' && s.klasse === 5 && !s.gård) return false;
    return true;
  }
  // Flokken i blokk (bx, by): finnes den, hvor mange, og forslag til plasser i blokka (0–1) å prøve i rekkefølge
  function flokkIBlokk(art, bx, by) {
    const A = ARTER[art]; if (!A || frø(art, bx, by, 0) >= A.p) return null;
    const n = Math.round(A.str[0] + (A.str[1] - A.str[0]) * Math.pow(frø(art, bx, by, 1), 1.6));
    const plasser = []; for (let k = 0; k < 14; k++) plasser.push([frø(art, bx, by, 10 + k * 2), frø(art, bx, by, 11 + k * 2)]);
    return { n, plasser, frø: Math.floor(frø(art, bx, by, 2) * 1e9) };
  }
  // Blokkene som dekker et område [x0, y0, x1, y1]
  function blokker(art, b) {
    const B = ARTER[art].blokk, ut = [];
    for (let by = Math.floor(b[1] / B); by <= Math.floor(b[3] / B); by++) for (let bx = Math.floor(b[0] / B); bx <= Math.floor(b[2] / B); bx++) ut.push([bx, by, bx * B, by * B, B]);
    return ut;
  }
  function tilfeldig(f) { let s = f >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

  // Ny flokk rundt (x, y): dyrene spres rundt midten; lovlig(x, y) sier om et dyr kan stå der (vann, hus, veg, trær)
  function nyFlokk(art, x, y, n, rnd, lovlig = () => true) {
    const A = ARTER[art], r = A.spred * Math.sqrt(n), dyr = [];
    for (let i = 0; i < n; i++) {
      let px = x, py = y, ok = false;
      for (let t = 0; t < 12 && !ok; t++) { const a = rnd() * 6.283, rr = r * Math.sqrt(rnd()); px = x + Math.cos(a) * rr; py = y + Math.sin(a) * rr; ok = lovlig(px, py); }
      if (!ok) continue;
      dyr.push({ x: px, y: py, v: rnd() * 6.283, t: 'beite', tid: rnd() * 8, fart: 0, fase: rnd() * 6.283, hode: 1, ung: art !== 'elg' && rnd() < .22 });
    }
    return { art, x, y, hjem: [x, y], mål: [x, y], dyr, redd: 0, fra: null };
  }
  const vinkel = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // Ett tidssteg (s) for flokken. o: { fare: [[x, y, faktor], …] (folk; faktor ganges med fluktavstanden, f.eks. 0,5 når du går
  // på huk), skudd: [[x, y], …] (skudd skremmer på minst 300 m), lovlig(x, y) }
  function steg(F, dt, rnd, o = {}) {
    const A = ARTER[F.art], lovlig = o.lovlig || (() => true), R = A.spred * Math.sqrt(Math.max(1, F.dyr.length));
    // fare: nærmeste trussel innenfor fluktavstanden (målt fra kanten av flokken)
    let fare = null, best = Infinity;
    for (const p of o.fare || []) { const d = Math.hypot(p[0] - F.x, p[1] - F.y) - R; if (d < A.flukt * (p[2] == null ? 1 : p[2]) && d < best) { best = d; fare = p; } }
    for (const p of o.skudd || []) { const d = Math.hypot(p[0] - F.x, p[1] - F.y) - R; if (d < Math.max(300, A.flukt * 2) && d < best) { best = d; fare = p; } }
    if (fare) { F.redd = 6 + rnd() * 4; F.fra = fare; }
    else if (F.redd > 0) F.redd -= dt;
    // midten og målet: flokken trekker sakte mot et mål innenfor vandreavstanden; redde flokker løper bort fra faren
    if (F.redd > 0 && F.fra) {
      const a = Math.atan2(F.y - F.fra[1], F.x - F.fra[0]), l = A.flukt * 2.2;
      const mx = F.x + Math.cos(a) * l, my = F.y + Math.sin(a) * l;
      if (lovlig(mx, my)) F.mål = [mx, my];
    } else if (Math.hypot(F.mål[0] - F.x, F.mål[1] - F.y) < R * .6) {
      for (let t = 0; t < 6; t++) { const a = rnd() * 6.283, rr = A.vandre * Math.sqrt(rnd()), mx = F.hjem[0] + Math.cos(a) * rr, my = F.hjem[1] + Math.sin(a) * rr;
        if (lovlig(mx, my)) { F.mål = [mx, my]; break; } }
    }
    // midten = snittet av dyrene (følger dem), og dyrene trekkes mot målet
    let sx = 0, sy = 0; for (const d of F.dyr) { sx += d.x; sy += d.y; } if (F.dyr.length) { F.x = sx / F.dyr.length; F.y = sy / F.dyr.length; }
    const tilMål = Math.atan2(F.mål[1] - F.y, F.mål[0] - F.x), langtMål = Math.hypot(F.mål[0] - F.x, F.mål[1] - F.y) > R;
    for (const d of F.dyr) {
      const ut = Math.hypot(d.x - F.x, d.y - F.y);
      if (F.redd > 0) d.t = 'løp';
      else if (d.t === 'løp') { d.t = 'gå'; d.tid = 1 + rnd() * 2; }
      d.tid -= dt;
      if (d.t !== 'løp' && d.tid <= 0) {
        // nytt valg: beite (mest), eller gå et stykke – mot midten når dyret er langt ute, ellers i flokkens retning
        if (ut > R * 1.3) { d.t = 'gå'; d.v = Math.atan2(F.y - d.y, F.x - d.x) + (rnd() - .5) * .6; d.tid = 2 + rnd() * 3; }
        else if (rnd() < A.gå || (langtMål && rnd() < .5)) { d.t = 'gå'; d.v = (langtMål ? tilMål : d.v) + (rnd() - .5) * 1.4; d.tid = 2 + rnd() * 5; }
        else { d.t = 'beite'; d.v += (rnd() - .5) * 1.2; d.tid = 4 + rnd() * 10; }
      }
      let mål = d.t === 'løp' ? A.fart.løp * (.85 + .3 * ((d.fase * 7) % 1)) : d.t === 'gå' ? A.fart.gå : (rnd() < .02 ? A.fart.beite * 8 : 0);
      if (d.t === 'løp') { const a = Math.atan2(F.mål[1] - d.y, F.mål[0] - d.x); d.v += vinkel(a - d.v) * Math.min(1, dt * 3); }
      d.fart += (mål - d.fart) * Math.min(1, dt * (d.t === 'løp' ? 3 : 1.5));
      d.hode += ((d.t === 'beite' ? 1 : 0) - d.hode) * Math.min(1, dt * 2);
      if (d.fart > .01) {
        const nx = d.x + Math.cos(d.v) * d.fart * dt, ny = d.y + Math.sin(d.v) * d.fart * dt;
        if (lovlig(nx, ny)) { d.x = nx; d.y = ny; }
        else { d.v += (rnd() < .5 ? 1 : -1) * (1 + rnd()); d.fart *= .3; if (d.t === 'gå') d.tid = Math.min(d.tid, .5); }
      }
      // fasen til beina: ett steg per ca. kroppslengde
      d.fase += dt * d.fart * 6.5 / Math.sqrt(A.L);
    }
    return F;
  }

  const api = { ARTER, REKKE, iSesong, kanVære, flokkIBlokk, blokker, nyFlokk, steg, tilfeldig, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Dyr = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
