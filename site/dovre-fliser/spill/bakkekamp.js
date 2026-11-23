/* Riksbrudd – KAMP PÅ BAKKEN (W2, 22. nov, R17-3): reglene uten DOM (testes i pipeline/fliser/test_bakkekamp.js).
 * Når du går selv i 3D:
 *  - Dekning: en vegg, en bil, en stein eller et tre like ved deg, mellom deg og den som skyter, gir mindre skade.
 *  - Siktekikkert: høyre museknapp / knappen «Sikt» zoomer inn; våpen med kikkert treffer bedre på langt hold.
 *  - Granater: kastes i en bue, går av etter en kort lunte og skader alt innen en radius – også deg.
 *  - Lagkamerater: «følg meg», «hold her», «angrip dit» for et eget lag i nærheten.
 *  - Treffmarkør og skadeindikator: kort kryss når du treffer, rød bue på skjermkanten mot den som skyter.
 * R18-C (23. nov): FIENDENS GRANATER, GRANATER I LAGKAMPEN OG MASKINGEVÆR (samme regler i 2D og 3D):
 *  - Lagkamp: lag med granater (antallet etter bevæpningen) bruker dem i kamprunden på under 60 m – mer virkning mot nedgravde og
 *    skjulte mål. Etterfylles når laget får ammunisjon.
 *  - Undertrykk: maskingevær holder fienden nede en stund – laget i ilden treffer dårligere og går saktere.
 *  - Fiende3d: når du går selv, kaster fiender innen 15–35 m av og til en granat mot deg (fra lagets egne granater), og skaden de
 *    gjør på deg regnes med våpentabellen fra 2D-kampen (Terreng.treffsjanse), ikke med egne tall.
 * Visningen ligger i spill/bakkekamp-visning.js. Alle tall er Claudes forslag (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const REGLER = {
    // DEKNING – Claudes forslag: dekningen må stå innen «avstand» meter fra deg langs linja mot skytteren. Faktoren ganges på skaden
    // fra den skytteren, og etter stillingen din. En stein dekker bare når du er på huk eller ligger; et tre dekker lite (smal stamme).
    dekning: { avstand: 6, start: .5, steg: .4, steinR: .7, treR: .35, bilR: 1.6,
      typer: { hus: { stå: .25, huk: .2, ligg: .2 }, bil: { stå: .5, huk: .3, ligg: .3 }, stein: { stå: .9, huk: .45, ligg: .35 }, tre: { stå: .7, huk: .6, ligg: .55 } },
      navn: { hus: 'vegg', bil: 'bil', stein: 'stein', tre: 'tre' } },
    // SIKTEKIKKERT – Claudes forslag: zoom (synsfeltet deles på zoom) og ekstra treffsjanse når du sikter (ganget opp mot fullt ved
    // våpenets rekkevidde, ingenting under «fra» meter). Våpen uten kikkert får et vanlig sikte med litt zoom og lite ekstra.
    kikkert: { våpen: { rifle: { zoom: 4, treff: .4 }, jaktrifle: { zoom: 3, treff: .3 } }, sikte: { zoom: 1.45, treff: .08 }, fra: 40, følsomhet: .9 },
    // GRANATER – Claudes forslag: kastefart (m/s), kastevinkel over blikket, tyngde, lunte (s), sprett, dødelig radius og ytre radius (m),
    // skade på en mann i lag (1 = en mann ute) og på deg (helsepoeng av 100) midt i, avtagende utover. Vekt og pris i sekken.
    granat: { fart: 16, løft: .32, g: 9.81, lunte: 3.2, sprett: .35, friksjon: .6, dødelig: 4, radius: 12, skadeMann: 1.2, skadeDeg: 110,
      vekt: .45, pris: 25000, pakke: 2, startAntall: 2, belte: 6, ventMellom: 1.2 },
    // LAGKAMERATER – Claudes forslag: hvor nær et lag må være for å kunne få ordre (m), hvor langt bak deg de går, hvor langt unna før
    // de får ny ordre, og hvor ofte (s). «Angrip dit» går høyst «angrepMaks» meter fram.
    følge: { nær: 400, bak: 9, slakk: 16, hvert: 4, angrepMaks: 600 },
    // TREFFMARKØR OG SKADEINDIKATOR – Claudes forslag: varighet (s), buer innen «samme» radianer slås sammen.
    markør: { treff: .25, drept: .6 },
    indikator: { varighet: 2.2, samme: .35, maks: 6 },
    // GRANATER I LAGKAMPEN (R18-C) – Claudes forslag: under «hold» meter kan et lag bruke granater i kamprunden. Antallet per lag etter
    // bevæpningen (røvere har færrest), høyst «perRunde» per runde og én kaster per fire friske menn. Hver granat treffer med «treff»,
    // ganger «nedgravd» mot nedgravde mål og «skog» mot mål i skog (der kulene treffer dårlig), og gir 1 treff, av og til 2 («ekstra»).
    lagGranat: { hold: 60, start: { standard: 4, nærstrid: 8, avstand: 2, tung: 6, egen: 4, lett: 1 }, perRunde: 2, mennPerKaster: 4,
      treff: .5, nedgravd: 1.6, skog: 1.3, ekstra: .4, maksTreff: .9 },
    // UNDERTRYKKING (R18-C) – Claudes forslag: hvert maskingevær som skyter på et lag (innen rekkevidden), gir «perMG» styrke (høyst 1)
    // i «varighet» spillminutter. Ved full styrke treffer laget «ild» (×0,55) og går «fart» (×0,5) av det vanlige. Ditt lette
    // maskingevær gir «spillerSkudd» styrke per skudd mot laget du sikter på, i «spillerVarighet» spillminutter.
    undertrykk: { perMG: .35, varighet: 6, ild: .45, fart: .5, spillerSkudd: .05, spillerVarighet: 2 },
    // FIENDENS GRANATER I 3D (R18-C) – Claudes forslag: et fiendelag som har oppdaget deg, kaster på «fra»–«til» meter med «sjanse» per
    // sekund (ganget med undertrykkingen), høyst én gang per «mellom» sekunder per lag. Granaten lander innen «spredning» meter fra deg,
    // er «fly» sekunder i lufta (etter avstanden) og går av «påBakken» sekunder etter at den lander (minst «varsel» sekunder etter kastet).
    fiende3d: { fra: 15, til: 35, sjanse: .06, mellom: 8, spredning: 7, flyFart: 13, flyMin: 1, flyMaks: 2.2, påBakken: 1.3, varsel: 2.6, høyde: 1.5, sprett: .2, friksjon: .25 },
  };

  // ---------------- dekning ----------------
  const Dekning = {
    typeFaktor(type, stilling) { const T = REGLER.dekning.typer[type]; if (!T) return 1; return T[stilling] || T.stå; },
    // prøv(x, y) -> type | null for punkter i samme koordinater som deg (0, 0). (dx, dy) peker mot skytteren.
    // Gir den beste dekningen langs de første meterne: { type, faktor, avst } eller null.
    finn(dx, dy, prøv, stilling, maks) {
      const D = REGLER.dekning, l = Math.hypot(dx, dy); if (!(l > 1)) return null; const ux = dx / l, uy = dy / l, ende = Math.min(maks || D.avstand, l - .5);
      let best = null;
      for (let s = D.start; s <= ende + 1e-9; s += D.steg) { const t = prøv(ux * s, uy * s); if (!t) continue; const f = Dekning.typeFaktor(t, stilling || 'stå'); if (!best || f < best.faktor) best = { type: t, faktor: f, avst: s }; }
      return best && best.faktor < 1 ? best : null;
    },
    // lager prøv() av en liste hindringer rundt deg (dine koordinater): { type, x, y, r } som sirkler eller { type: 'hus', P } som omriss
    prøver(liste) {
      const inni = (P, X, Y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > Y) !== (b[1] > Y) && X < (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1]) + a[0]) inn = !inn; } return inn; };
      return (x, y) => { let t = null, f = 1;
        for (const o of liste) { const hit = o.P ? inni(o.P, x, y) : Math.hypot(o.x - x, o.y - y) <= o.r; if (!hit) continue; const g = REGLER.dekning.typer[o.type] ? REGLER.dekning.typer[o.type].huk : 1; if (g < f) { f = g; t = o.type; } }
        return t; };
    },
    tekst: d => (d ? `I dekning (${REGLER.dekning.navn[d.type] || d.type})` : ''),
  };

  // ---------------- siktekikkert ----------------
  const Kikkert = {
    def: id => REGLER.kikkert.våpen[id] || null,
    // zoom og ekstra treff for våpenet når du sikter
    sikte: id => Kikkert.def(id) || REGLER.kikkert.sikte,
    fov: (basis, id, på) => (på ? basis / Kikkert.sikte(id).zoom : basis),
    // faktor på treffsjansen: 1 når du ikke sikter; ellers opp mot 1 + treff ved våpenets rekkevidde
    treff(id, avst, rekkevidde, på) { if (!på) return 1; const S = Kikkert.sikte(id), K = REGLER.kikkert; if (avst <= K.fra) return 1; return 1 + S.treff * klem((avst - K.fra) / Math.max(1, (rekkevidde || 350) - K.fra), 0, 1); },
    // musa går saktere når du har zoomet inn, så siktet blir roligere
    følsomhet: (id, på) => (på ? REGLER.kikkert.følsomhet / Kikkert.sikte(id).zoom : 1),
  };

  // ---------------- granater ----------------
  const Granat = {
    // ny granat fra øyet (x, y, z) i retning a (kursen: blikket er (−sin a, cos a)) og pitch (opp er +)
    kast(x, y, z, a, pitch) { const G = REGLER.granat, p = klem(pitch + G.løft, -.6, 1.2), h = Math.cos(p) * G.fart;
      return { x, y, z, vx: -Math.sin(a) * h, vy: Math.cos(a) * h, vz: Math.sin(p) * G.fart, t: 0, ligger: false }; },
    // ett steg: bakke(x, y) gir bakkens høyde. Spretter litt og ruller ut. Gir true når lunta har brent ut.
    // (R18-C) g.sprett og g.friksjon kan settes per granat (fiendens granater lobbes og ruller mindre)
    steg(g, dt, bakke) { const G = REGLER.granat, sp = g.sprett === undefined ? G.sprett : g.sprett, fr = g.friksjon === undefined ? G.friksjon : g.friksjon; g.t += dt;
      if (!g.ligger) { g.vz -= G.g * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; const b = bakke(g.x, g.y);
        if (Number.isFinite(b) && g.z <= b + .08) { g.z = b + .08; if (Math.abs(g.vz) > 2) { g.vz = -g.vz * sp; g.vx *= fr; g.vy *= fr; } else { g.vz = 0; g.vx *= fr; g.vy *= fr; if (Math.hypot(g.vx, g.vy) < .4) g.ligger = true; } } }
      return g.t >= G.lunte; },
    // hvor sterkt smellet tar på avstanden d: 1 innen dødelig radius, så avtagende til 0 ved ytre radius
    styrke(d) { const G = REGLER.granat; if (d <= G.dødelig) return 1; if (d >= G.radius) return 0; return 1 - (d - G.dødelig) / (G.radius - G.dødelig); },
    // skaden på mennene i et lag som står (lx, ly) fra smellet; mennene er spredt (spredning m). rng() gir 0–1. Gir antall menn rammet.
    rammLag(menn, d, rng, spredning = 6) { const G = REGLER.granat; let n = 0;
      for (const m of menn) { if (!(m.hp > 0)) continue; const dm = Math.max(0, d + (rng() - .5) * spredning), s = Granat.styrke(dm); if (s <= 0 || rng() > .35 + .65 * s) continue; const sk = G.skadeMann * s; m.hp = m.hp - sk < .05 ? 0 : m.hp - sk; n++; }
      return n; },
    skadeDeg: d => Math.round(REGLER.granat.skadeDeg * Granat.styrke(d)),
  };

  // ---------------- lagkamerater ----------------
  const Følge = {
    ORDRE: [['følg', 'Følg meg'], ['hold', 'Hold her'], ['angrip', 'Angrip dit']],
    // punktet bak deg (kursen a) der laget skal gå; nr sprer flere lag til hver sin side
    mål(x, y, a, nr = 0) { const F = REGLER.følge, bak = F.bak + nr * 5, side = (nr % 2 ? 1 : -1) * (nr ? 6 : 0); return { x: x + Math.sin(a) * bak + Math.cos(a) * side, y: y - Math.cos(a) * bak + Math.sin(a) * side }; },
    // trenger laget ny ordre? (lagets plass, målet, sekunder siden siste ordre)
    nyOrdre: (lag, mål, siden) => Math.hypot(lag.x - mål.x, lag.y - mål.y) > REGLER.følge.slakk && siden >= REGLER.følge.hvert,
    // «angrip dit»: punktet foran deg på avstanden du ser, høyst angrepMaks
    angrepMål: (x, y, a, avst) => { const d = klem(avst || 150, 20, REGLER.følge.angrepMaks); return { x: x - Math.sin(a) * d, y: y + Math.cos(a) * d }; },
    // egne lag som kan få ordre: levende, på din side, innen «nær», ikke deg selv
    kandidater(lag, side, x, y) { return lag.filter(s => s && s.side === side && !s.karakter && s.menn && s.menn.some(m => m.hp > 0) && Math.hypot(s.x - x, s.y - y) <= REGLER.følge.nær)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)); },
  };

  // ---------------- treffmarkør og skadeindikator ----------------
  const Indikator = {
    // vinkelen til skytteren sett fra deg, i forhold til blikket: 0 = rett fram, + = til høyre, ±π = bak
    vinkel(dx, dy, a) { const fx = -Math.sin(a), fy = Math.cos(a), rx = Math.cos(a), ry = Math.sin(a); return Math.atan2(dx * rx + dy * ry, dx * fx + dy * fy); },
    // legg til en bue (verdensretning v = atan2(dy, dx), styrke 0–1) i lista; like retninger slås sammen. nå i sekunder.
    legg(liste, v, styrke, nå) { const I = REGLER.indikator, d = q => Math.abs(Math.atan2(Math.sin(q.v - v), Math.cos(q.v - v)));
      const f = liste.find(q => d(q) < I.samme); if (f) { f.t = nå; f.s = Math.min(1, Math.max(f.s, styrke)); f.v = v; } else { liste.push({ v, s: klem(styrke, .25, 1), t: nå }); if (liste.length > I.maks) liste.shift(); } return liste; },
    // buene som fortsatt synes, med alfa 0–1
    aktive(liste, nå) { const I = REGLER.indikator; return liste.filter(q => nå - q.t < I.varighet).map(q => ({ ...q, alfa: q.s * (1 - (nå - q.t) / I.varighet) })); },
    // treffmarkøren: alfa 0–1 for et treff (eller et drap) for «siden» sekunder siden
    markør(siden, drept) { const M = REGLER.markør, L = drept ? M.drept : M.treff; return siden < 0 || siden >= L ? 0 : 1 - siden / L; },
  };

  // ---------------- granater i lagkampen (2D, kamprunden) ----------------
  const levendeMenn = s => (s.menn || []).filter(m => m.hp >= 1).length;
  const Lagkamp = {
    // bevæpningen til et lag (s.strid.bev settes av StridSpill.regel for både egne og fiendens lag)
    // (uten stridsregler: samme valg som fiendeBev i spill/strid-visning.js – røvere lett, grønn avstand, ellers standard)
    bev: s => (s && s.strid && s.strid.bev) || (s && s.side !== 'blå' && (s.raid || s.post || /røver/i.test(s.navn || '')) ? 'lett' : s && s.side === 'grønn' ? 'avstand' : 'standard'),
    start: s => { const S = REGLER.lagGranat.start; const b = Lagkamp.bev(s); return b in S ? S[b] : S.standard; },
    // granatene laget har nå (settes første gang fra bevæpningen)
    antall(s) { if (!s || s.karakter) return 0; if (!Number.isFinite(s.granater)) s.granater = Lagkamp.start(s); return s.granater; },
    fyll(s) { if (s && !s.karakter) s.granater = Lagkamp.start(s); },
    // Én runde med granater fra a mot b på d meter (f = forholdene fra kamprunden, rng = kampens tilfeldighet). Bruker rng BARE når
    // laget faktisk kaster (så kamper uten granater blir nøyaktig som før). Gir { kastet, treff }.
    runde(a, b, d, f, rng) { const R = REGLER.lagGranat; if (!(d <= R.hold) || !a || !b || a.side === b.side) return { kastet: 0, treff: 0 };
      const n = Lagkamp.antall(a); if (n <= 0) return { kastet: 0, treff: 0 };
      const kastere = Math.min(n, R.perRunde, Math.ceil(levendeMenn(a) / R.mennPerKaster)); if (kastere <= 0) return { kastet: 0, treff: 0 };
      let p = R.treff; if (b.nedgravd) p *= R.nedgravd; if (f && f.målISkog) p *= R.skog; p = Math.min(R.maksTreff, p);
      let treff = 0; for (let i = 0; i < kastere; i++) if (rng() < p) treff += rng() < R.ekstra ? 2 : 1;
      a.granater = n - kastere; return { kastet: kastere, treff }; },
  };

  // ---------------- undertrykking (maskingevær) ----------------
  const erMG = m => m.hp >= 1 && (m.våpen || m.rolle) === 'maskingevær';
  const Undertrykk = {
    mg: s => (s.menn || []).filter(erMG).length,
    // a har skutt på b i kamprunden på d meter: maskingeværene som når fram, holder b nede (nå = spillminutter)
    salve(a, b, d, nå, rekkevidde = 900) { const n = d <= rekkevidde ? Undertrykk.mg(a) : 0; if (!n) return 0; return Undertrykk.legg(b, n * REGLER.undertrykk.perMG, nå, REGLER.undertrykk.varighet); },
    legg(b, styrke, nå, varighet) { const st = Math.min(1, Undertrykk.styrke(b, nå) + styrke); b.undertrykt = { s: st, til: Math.max(nå + varighet, (b.undertrykt && b.undertrykt.til) || 0) }; return st; },
    styrke: (b, nå) => (b && b.undertrykt && nå < b.undertrykt.til ? b.undertrykt.s : 0),
    ild: (b, nå) => 1 - REGLER.undertrykk.ild * Undertrykk.styrke(b, nå),
    fart: (b, nå) => 1 - REGLER.undertrykk.fart * Undertrykk.styrke(b, nå),
    tekst: (b, nå) => { const s = Undertrykk.styrke(b, nå); return s > 0 ? `Holdes nede av maskingevær (treffer ${Math.round((1 - Undertrykk.ild(b, nå)) * 100)} % dårligere)` : ''; },
  };

  // ---------------- fiendene når du går selv (3D) ----------------
  const Fiende3d = {
    // ildkraften mot deg: hver frisk mann teller som én rifle, ganget med det våpenet hans gjør på avstanden i 2D-tabellen
    // (Terreng.treffsjanse). En hagle teller mer helt nært, en pistol lite lenger ute, våpen som ikke når fram teller 0.
    ildkraft(menn, avst, T) { if (!T || !T.treffsjanse) return (menn || []).filter(m => m.hp > 0).length; const ref = T.treffsjanse('rifle', Math.min(avst, 590), {}) || 1e-9; let s = 0;
      for (const m of menn || []) if (m.hp > 0) s += T.treffsjanse(m.våpen || m.rolle, avst, {}) / ref; return s; },
    // kaster laget nå? (avst m, sekunder siden lagets siste kast, sjanse-faktor, r = tilfeldig tall)
    kaster(avst, siden, faktor, r) { const F = REGLER.fiende3d; return avst >= F.fra && avst <= F.til && siden >= F.mellom && r < F.sjanse * faktor; },
    // en granat fra (x, y, z) som skal lande ved (tx, ty, tz): rett bue med flytiden etter avstanden; t settes så den går av
    // «påBakken» s etter landing (men aldri før «varsel» s etter kastet)
    kast(x, y, z, tx, ty, tz) { const F = REGLER.fiende3d, G = REGLER.granat, l = Math.hypot(tx - x, ty - y), T = klem(l / F.flyFart, F.flyMin, F.flyMaks);
      const igjen = Math.max(F.varsel, T + F.påBakken); return { x, y, z, vx: (tx - x) / T, vy: (ty - y) / T, vz: (tz - z + .5 * G.g * T * T) / T, t: G.lunte - igjen, ligger: false, fiende: true, sprett: F.sprett, friksjon: F.friksjon }; },
    // hvor granaten lander rundt deg (rng gir 0–1)
    mål(x, y, rng) { const F = REGLER.fiende3d, v = rng() * Math.PI * 2, r = Math.sqrt(rng()) * F.spredning; return { x: x + Math.cos(v) * r, y: y + Math.sin(v) * r }; },
    // sekunder til smellet
    igjen: g => Math.max(0, REGLER.granat.lunte - g.t),
  };

  const api = { REGLER, Dekning, Kikkert, Granat, Følge, Indikator, Lagkamp, Undertrykk, Fiende3d };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Bakkekamp = api;
})(typeof window !== 'undefined' ? window : globalThis);
