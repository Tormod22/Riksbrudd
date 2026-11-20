'use strict';
/* Riksbrudd – HELLINGEN I KARTET (runde 8, 20. nov natt; regler i spill/helling.js). Kritikken: «kartet på 20–50 m er uskarpe
 * trekroner uten skyggelegging, så man kan ikke se hvor det er flatt» når man skal plassere en brakke.
 * Mens du plasserer et bygg i 2D (LeirSpill.plassering) og mens du velger leirplass (OppstartSpill.forslag), farges bakken rundt
 * stedet for DET bygget du holder, med retningen det har: grønt = flatt, gult = skrått (bygget får grunnmur), rødt med skravur = for
 * bratt (Leir.kanBygge sier «For bratt her»), blått = vann. Under fargene: svak skyggelegging (lys fra nordvest) og høydekurver hver
 * 2 m (hver 10. m sterkere), så du ser formen på terrenget. Høydene er 8 m-rutene (lagVindu z11) som bratt-sjekken bruker.
 * Bare i 2D og nær nok (kam.m ≤ REGLER.maksM). window.HellingVis (tilstand, ved, oppdater, av). Ingen kroker endret i andre filer:
 * tegnekroken ligger først i KROKER.tegn (under byggene og leirflagget) og er merket bygg = true (over sløret i byggevisningen).
 */
(function () {
  const HL = window.Helling, LB = window.Leir; if (!HL || !LB) return;
  // Claudes forslag: radius (m) rundt midten som farges og meter per punkt i bildet – helt nær (under nærM meter per skjermpunkt, som
  // byggevisningen på telefon) et finere bilde over et mindre område, lenger ute (over fjernM) et grovere over et større; maksM: lengst
  // ute (meter per punkt) det vises; flytt: hvor langt
  // (m, andel av radien) midten kan flytte seg før kartet regnes på nytt; celle: m mellom stedene som vurderes; kurve/kurveSterk:
  // høydekurvene (m); styrke: hvor sterke fargene er (0–1).
  const REGLER = { radius: 240, px: 1, nærM: .45, nærRadius: 150, nærPx: .5, fjernM: 2, fjernRadius: 500, fjernPx: 2, fjernCelle: 4, maksM: 6, flytt: .33, celle: 2, kurve: 2, kurveSterk: 10, styrke: 1 };
  const FARGE = { [HL.FLATT]: [96, 205, 104, .26], [HL.SKRÅTT]: [236, 198, 64, .2], [HL.BRATT]: [228, 72, 52, .32], [HL.VANN]: [70, 130, 210, .2] };
  let mål = null, klar = null, regner = null, teller = 0, av = false;
  const ekte = () => !navigator.webdriver || HellingVis.test === true;

  // Hva skal farges nå? Plasseringen av et bygg (ikke gjerde/veg/mal), ellers leirvalget. -> { type, ret, x, y } eller null
  function ønsket() {
    // i testene (navigator.webdriver) bare når HellingVis.test er satt: hentingen av høyder skal ikke forstyrre de andre vaktene
    if (av || !ekte() || (typeof på3d !== 'undefined' && på3d)) return null;
    const p = window.LeirSpill && LeirSpill.plassering && LeirSpill.plassering();
    if (p && !p.mal && p.type && LB.BYGG[p.type] && !LB.BYGG[p.type].linje) {
      const S = window.OppstartSpill && OppstartSpill.tilstand(), sx = p.x !== null && p.x !== undefined ? p.x : null;
      // midten: skissen når den står, ellers midten av kartet (leiren når kartet er langt unna)
      const x = sx !== null ? p.x : kam.x, y = sx !== null ? p.y : kam.y;
      const L = sx === null && S && S.leir && Math.hypot(x - S.leir.x, y - S.leir.y) > 5000 ? S.leir : { x, y };
      return { type: p.type, ret: p.ret || 0, x: L.x, y: L.y, hvor: 'bygg', ...skala() };
    }
    const f = window.OppstartSpill && OppstartSpill.forslag && OppstartSpill.forslag();
    if (f && f.x !== undefined) return { type: HL.REGLER.første[0], ret: 0, x: f.x, y: f.y, hvor: 'leir', ...skala() };
    return null;
  }
  const skala = () => (kam.m < REGLER.nærM ? { R: REGLER.nærRadius, px: REGLER.nærPx, c: REGLER.celle } : kam.m >= REGLER.fjernM ? { R: REGLER.fjernRadius, px: REGLER.fjernPx, c: REGLER.fjernCelle } : { R: REGLER.radius, px: REGLER.px, c: REGLER.celle });
  const sammeBygg = (a, b) => a && b && a.type === b.type && Math.abs(a.ret - b.ret) < 1e-6 && a.px === b.px;
  // Regner ut bildet for målet: høydene (8 m) og arealklassene (32 m) rundt, så nivået per 4 m-rute, skygge og kurver per meter
  async function regn(m) {
    const nr = ++teller, R = m.R, px = m.px, bb = [m.x - R - 24, m.y - R - 24, m.x + R + 24, m.y + R + 24];
    let hv = null, kv = null; try { [hv, kv] = await Promise.all([lagVindu(bb, false, 11), lagVindu(bb, false)]); } catch (e) { hv = null; }
    if (nr !== teller) return;
    if (!hv) { klar = null; return; }
    const høyde = HL.høydeFra(hv), tørt = HL.tørtFra(HL.klasseFra(kv)), c = m.c, n = Math.round(2 * R / c), x0 = m.x - R, y1 = m.y + R;
    const nivå = HL.kart(m.type, m.ret, høyde, tørt, x0, y1, n, n, c);
    // bildet: ett punkt per px meter
    const W = Math.round(2 * R / px), cv = document.createElement('canvas'); cv.width = cv.height = W; const g = cv.getContext('2d'), im = g.createImageData(W, W), d = im.data;
    const z = new Float32Array((W + 1) * (W + 1)); let har = 0;
    for (let j = 0; j <= W; j++) for (let i = 0; i <= W; i++) { const v = høyde(x0 + i * px, y1 - j * px); z[j * (W + 1) + i] = v === null ? NaN : v; if (v !== null) har++; }
    const cp = c / px, kantPx = 40 / px, skrav = Math.max(2, Math.round(4 / px));
    if (!har) { klar = null; return; }
    const tell = [0, 0, 0, 0, 0];
    for (const v of nivå) tell[v]++;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      // en rund flekk med myk kant de siste 40 m, så fargene ikke slutter i en skarp firkant
      const kant = W / 2 - Math.hypot(i - W / 2, j - W / 2); if (kant <= 0) continue; const tone = kant < kantPx ? kant / kantPx : 1;
      const k = j * (W + 1) + i, h = z[k], hx = z[k + 1], hy = z[k + W + 1], o = (j * W + i) * 4;
      if (h !== h) continue;
      // skygge: lys fra nordvest – en side som stiger mot øst (gx > 0) eller mot sør (gy < 0) vender mot lyset
      const gx = hx === hx ? (hx - h) / px : 0, gy = hy === hy ? (h - hy) / px : 0, lys = Math.max(-1, Math.min(1, (gx - gy) * .9));
      let r = lys > 0 ? 255 : 0, gg = r, b = r, a = Math.abs(lys) * .32;
      // nivået for bygget i denne ruta
      const nv = nivå[Math.min(n - 1, Math.floor(j / cp)) * n + Math.min(n - 1, Math.floor(i / cp))], F = FARGE[nv];
      // rødt får skravur (striper hver 8. m), så det ikke bare er en farge
      if (F) { const at = F[3] * REGLER.styrke * (nv === HL.BRATT && ((i + j) % (2 * skrav)) < Math.max(1, skrav >> 1) ? 1.9 : 1), ao = at + a * (1 - at);
        r = (F[0] * at + r * a * (1 - at)) / ao; gg = (F[1] * at + gg * a * (1 - at)) / ao; b = (F[2] * at + b * a * (1 - at)) / ao; a = ao; }
      // høydekurver: der kurvehøyden skifter mot naboen til høyre eller under (tynne der det er bratt, så de ikke blir et teppe)
      const steil = Math.hypot(gx, gy), KS = REGLER.kurveSterk, K = REGLER.kurve, fS = Math.floor(h / KS), f = Math.floor(h / K);
      const sterk = (hx === hx && fS !== Math.floor(hx / KS)) || (hy === hy && fS !== Math.floor(hy / KS));
      const svak = !sterk && steil < .6 && ((hx === hx && f !== Math.floor(hx / K)) || (hy === hy && f !== Math.floor(hy / K)));
      if (sterk || svak) { const al = sterk ? .42 : .22, ao = al + a * (1 - al); r = (40 * al + r * a * (1 - al)) / ao; gg = (30 * al + gg * a * (1 - al)) / ao; b = (20 * al + b * a * (1 - al)) / ao; a = ao; }
      d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = Math.round(a * tone * 255);
    }
    g.putImageData(im, 0, 0);
    klar = { ...m, x0, y1, W, M: 2 * R, cv, nivå, n, c, tell, høyde, tørt };
    skitten = true;
  }
  function oppdater() {
    const m = ønsket(); mål = m;
    if (!m) { if (klar) { klar = null; skitten = true; } return; }
    const k = klar && sammeBygg(klar, m) && Math.hypot(klar.x - m.x, klar.y - m.y) < REGLER.flytt * m.R ? klar : null;
    if (k) return;
    if (regner && sammeBygg(regner, m) && Math.hypot(regner.x - m.x, regner.y - m.y) < REGLER.flytt * m.R) return;
    regner = m; regn(m).catch(e => console.error(e)).then(() => { if (regner === m) regner = null; });
  }
  // tegnes først av krokene (under byggene, skissen og leirflagget) og i byggevisningen over sløret
  const tegn = (g, vx0, vy1) => {
    oppdater();
    if (!klar || !mål || klar.type !== mål.type || Math.abs(klar.ret - mål.ret) > 1e-6 || kam.m > REGLER.maksM) return;
    const s = 1 / kam.m, x = (klar.x0 - vx0) * s, y = (vy1 - klar.y1) * s, w = klar.M * s;
    if (x > VW || y > VH || x + w < 0 || y + w < 0) return;
    g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(1, (REGLER.maksM - kam.m) / 1 + .25); g.drawImage(klar.cv, x, y, w, w); g.restore();
  };
  tegn.bygg = true; KROKER.tegn.unshift(tegn);

  // Nivået ved et punkt (vakten og banneret): HL.FLATT … eller null når kartet ikke er regnet ut der
  function ved(x, y) { if (!klar) return null; const i = Math.floor((x - klar.x0) / klar.c), j = Math.floor((klar.y1 - y) / klar.c); return i < 0 || j < 0 || i >= klar.n || j >= klar.n ? null : klar.nivå[j * klar.n + i]; }
  // Når skissen står for bratt: går det med bygget dreid 90°, og hvor er nærmeste sted (innen 150 m) der det går med samme retning?
  // -> { drei: true|false, sted: { x, y, m, retning } | null } eller null når hellingskartet ikke er klart for dette bygget
  function forslag(type, ret, x, y) {
    if (!klar || klar.type !== type || Math.abs(klar.ret - ret) > 1e-6) return null;
    const ok = nv => nv === HL.FLATT || nv === HL.SKRÅTT, v = HL.vurderer(type, ret, klar.høyde, klar.tørt);
    const drei = ok(HL.vurderer(type, ret + Math.PI / 2, klar.høyde, klar.tørt)(x, y)); let sted = null;
    // stedet må gå også 1,25 m til hver side (rutenettet i leiren flytter skissen opptil så mye)
    // – og helst flatt (uten høy grunnmur): et flatt sted vinner når det ligger høyst 30 m lenger unna enn det nærmeste som går
    const trygt = (X, Y, f = ok) => f(v(X, Y)) && f(v(X - 1.25, Y - 1.25)) && f(v(X + 1.25, Y - 1.25)) && f(v(X - 1.25, Y + 1.25)) && f(v(X + 1.25, Y + 1.25));
    const flat = nv => nv === HL.FLATT; let grense = Infinity;
    for (const [dx, dy, m] of HL.ringer(150, 2)) { if (m === 0 || m > grense) continue;
      if (!sted && trygt(x + dx, y + dy)) { sted = { x: x + dx, y: y + dy, m, retning: HL.retning(dx, dy) }; grense = m + 30; if (trygt(x + dx, y + dy, flat)) break; continue; }
      if (sted && trygt(x + dx, y + dy, flat)) { sted = { x: x + dx, y: y + dy, m, retning: HL.retning(dx, dy) }; break; } }
    return { drei, sted };
  }
  // nøyaktig nivå for bygget i kartet ved (x, y) – med de samme høydene som bildet (vakten sammenligner med kanBygge)
  const nivåVed = (x, y) => (klar ? HL.vurderer(klar.type, klar.ret, klar.høyde, klar.tørt)(x, y) : null);
  window.HellingVis = { REGLER, test: false, ved, nivåVed, forslag, oppdater, tilstand: () => (klar ? { type: klar.type, ret: klar.ret, x: klar.x, y: klar.y, hvor: klar.hvor, flatt: klar.tell[0], skrått: klar.tell[1], bratt: klar.tell[2], vann: klar.tell[4], vises: !!mål && sammeBygg(klar, mål) && kam.m <= REGLER.maksM } : null),
    venter: () => !!regner, av: v => { av = !!v; skitten = true; }, forklaring: () => HL.FORKLARING, ekte };
})();
