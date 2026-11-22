/* Riksbrudd – KAMP PÅ BAKKEN (W2, 22. nov, R17-3): reglene uten DOM (testes i pipeline/fliser/test_bakkekamp.js).
 * Når du går selv i 3D:
 *  - Dekning: en vegg, en bil, en stein eller et tre like ved deg, mellom deg og den som skyter, gir mindre skade.
 *  - Siktekikkert: høyre museknapp / knappen «Sikt» zoomer inn; våpen med kikkert treffer bedre på langt hold.
 *  - Granater: kastes i en bue, går av etter en kort lunte og skader alt innen en radius – også deg.
 *  - Lagkamerater: «følg meg», «hold her», «angrip dit» for et eget lag i nærheten.
 *  - Treffmarkør og skadeindikator: kort kryss når du treffer, rød bue på skjermkanten mot den som skyter.
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
      vekt: .45, pris: 25000, pakke: 2, startAntall: 2, ventMellom: 1.2 },
    // LAGKAMERATER – Claudes forslag: hvor nær et lag må være for å kunne få ordre (m), hvor langt bak deg de går, hvor langt unna før
    // de får ny ordre, og hvor ofte (s). «Angrip dit» går høyst «angrepMaks» meter fram.
    følge: { nær: 400, bak: 9, slakk: 16, hvert: 4, angrepMaks: 600 },
    // TREFFMARKØR OG SKADEINDIKATOR – Claudes forslag: varighet (s), buer innen «samme» radianer slås sammen.
    markør: { treff: .25, drept: .6 },
    indikator: { varighet: 2.2, samme: .35, maks: 6 },
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
    steg(g, dt, bakke) { const G = REGLER.granat; g.t += dt;
      if (!g.ligger) { g.vz -= G.g * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; const b = bakke(g.x, g.y);
        if (Number.isFinite(b) && g.z <= b + .08) { g.z = b + .08; if (Math.abs(g.vz) > 2) { g.vz = -g.vz * G.sprett; g.vx *= G.friksjon; g.vy *= G.friksjon; } else { g.vz = 0; g.vx *= G.friksjon; g.vy *= G.friksjon; if (Math.hypot(g.vx, g.vy) < .4) g.ligger = true; } } }
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

  const api = { REGLER, Dekning, Kikkert, Granat, Følge, Indikator };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Bakkekamp = api;
})(typeof window !== 'undefined' ? window : globalThis);
