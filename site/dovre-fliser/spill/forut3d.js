// FORUT I 3D (runde 15, brukeren 21. nov: «ting laster kanskje litt sent i 3D hvis den flytter seg mye – det bør fikses»).
// Regler uten DOM: hvor neste 3D-utsnitt skal ligge og når det skal bestilles, ut fra farten (fly, kjøre, gå).
// Før ble et nytt utsnitt bestilt først når punktet du ser på var 45 % av halvsida fra midten, og det ble lagt der du var da. Når du
// flyr eller kjører fort, er du forbi det før det er ferdig (målt på testmaskinen: 37 s å bygge, 45 m/s = 1,7 km). Nå:
//  - farten (m/s) jevnes ut over litt over ett sekund (steg);
//  - byggetiden måles for hvert utsnitt (byggTid) og huskes som et glidende snitt;
//  - et nytt utsnitt bestilles når du vil være 45 % fra midten NÅR det nye er ferdig (der du er om byggetiden), ikke der du er nå;
//  - midten legges foran deg i fartsretningen: der du er når det er ferdig + 30 % av halvsida, høyst 85 % av halvsida fra der du er nå;
//  - kartdataene til utsnittet etter det bes om på forhånd (forhentPunkt), så de er hentet når det bygges.
// Står du stille eller går sakte (under 6 m/s), gjelder den gamle regelen alene (index.html tegn3d).
(function (rot) {
  // Claudes forslag (alle tallene)
  const REGLER = {
    // s: tidskonstanten når farten jevnes ut (rykk når du drar kartet skal ikke flytte utsnittet hit og dit)
    glatt: 1.2,
    // m/s: under dette brukes bare den gamle regelen (gå: 1,7–5,5 m/s)
    minFart: 6,
    // s: antatt byggetid før den første er målt, og grensene for målingene
    tid0: 12, tidMin: 3, tidMax: 45,
    // hvor mye en ny måling av byggetiden teller i snittet
    tidVekt: .5,
    // andel av halvsida: bestill når du er så langt fra midten når det nye er ferdig (samme tall som den gamle regelen)
    grense: .45,
    // andel av halvsida: midten så langt foran der du er når det nye er ferdig
    foran: .3,
    // andel av halvsida: midten høyst så langt fra der du er nå (så du er inne i det nye selv om det blir fort ferdig)
    maksFram: .85,
    // andel av halvsida: det nye midtpunktet minst så langt fra det gamle (ellers ingen nytte)
    minFlytt: .22,
    // flytter punktet seg mer enn 2 × halvsida på ett bilde, er det et hopp (teleport, nytt sted): farten nullstilles
    hopp: 2,
    // s og andel av halvsida: forhenting høyst så ofte, og bare når punktet har flyttet seg så langt siden sist
    forhentHver: 1.5, forhentFlytt: .3,
    // andel av halvsida: punktet for forhentingen høyst så langt foran deg
    forhentMaks: 2.2,
  };
  function ny() { return { x: null, y: null, vx: 0, vy: 0, tid: REGLER.tid0, målt: 0, fhT: -1e9, fh: null }; }
  // Nytt punkt (X, Y i meter) etter dt sekunder: oppdaterer den utjevnede farten. S = halvsida til utsnittet (for hopp).
  function steg(F, X, Y, dt, S) {
    if (F.x === null || !(dt > 0)) { F.x = X; F.y = Y; return F; }
    const dx = X - F.x, dy = Y - F.y; F.x = X; F.y = Y;
    if (Math.hypot(dx, dy) > REGLER.hopp * S || dt > 3) { F.vx = F.vy = 0; return F; }
    const a = 1 - Math.exp(-dt / REGLER.glatt); F.vx += (dx / dt - F.vx) * a; F.vy += (dy / dt - F.vy) * a; return F;
  }
  const fart = F => Math.hypot(F.vx, F.vy);
  // Et utsnitt tok sek sekunder fra bestilling til det var satt inn
  function byggTid(F, sek) {
    if (!(sek > 0)) return F.tid; const s = Math.max(REGLER.tidMin, Math.min(REGLER.tidMax, sek));
    F.tid = F.målt ? F.tid * (1 - REGLER.tidVekt) + s * REGLER.tidVekt : s; F.målt++; return F.tid;
  }
  // Skal et nytt utsnitt bestilles nå? u = { cx, cy, S } (det som vises), S = halvsida det nye skal ha. Svarer { cx, cy } eller null.
  function plan(F, u, S) {
    const v = fart(F); if (F.x === null || v < REGLER.minFart || !u) return null;
    const T = F.tid, fx = F.x + F.vx * T, fy = F.y + F.vy * T;
    if (Math.hypot(fx - u.cx, fy - u.cy) <= REGLER.grense * u.S) return null;
    const ex = F.vx / v, ey = F.vy / v, L = Math.min(v * T + REGLER.foran * S, REGLER.maksFram * S);
    const cx = F.x + ex * L, cy = F.y + ey * L;
    if (Math.hypot(cx - u.cx, cy - u.cy) < REGLER.minFlytt * u.S) return null;
    return { cx: Math.round(cx), cy: Math.round(cy), foran: Math.round(L), fart: v };
  }
  // Hvor kartdataene til utsnittet ETTER det som bygges nå skal bes om (eller null): der du er om to byggetider + litt.
  // t = nå i sekunder. Svarer også null når det er gjort nylig og punktet ikke har flyttet seg mye.
  function forhentPunkt(F, S, t) {
    const v = fart(F); if (F.x === null || v < REGLER.minFart) return null;
    const L = Math.min(2 * v * F.tid + REGLER.foran * S, REGLER.forhentMaks * S), x = F.x + F.vx / v * L, y = F.y + F.vy / v * L;
    if (t - F.fhT < REGLER.forhentHver) return null;
    if (F.fh && Math.hypot(x - F.fh[0], y - F.fh[1]) < REGLER.forhentFlytt * S) return null;
    F.fhT = t; F.fh = [x, y]; return [Math.round(x), Math.round(y)];
  }
  // Hvor langt foran deg (meter, x og y) det nye utsnittet ventes å være ferdig – fjernkartet bruker det til å legge midten foran deg
  function ledd(F, S) { const v = fart(F); if (F.x === null || v < REGLER.minFart) return [0, 0]; const L = Math.min(v * F.tid, REGLER.maksFram * S); return [F.vx / v * L, F.vy / v * L]; }
  const api = { REGLER, ny, steg, fart, byggTid, plan, forhentPunkt, ledd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Forut3d = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
