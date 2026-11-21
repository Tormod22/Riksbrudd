/* Riksbrudd – ANLEGGSARBEID (runde 15, 21. nov kveld). Brukeren: «Jeg ønsker å lage systemer der spilleren kan bygge tunneler i
 * framtiden, samt bunkere og skyttergraver, og bygge egne kaier. Det skal også være båter i spillet.»
 * Dette er grunnmuren: en felles tabell over anlegg (ANLEGG), en felles motor for terrenginngrep (bakken senkes i et område – brukt både
 * av 2D-reglene og av 3D-terrenget), kostnad og byggetid etter lengden, krav til terrenget (tørt land, strand, bratt fjellside), vern for
 * lag i anlegget og tunnelen som en egen lenke i ruta med reisetid. Reglene er uten DOM (Node: require('./anleggsarbeid'); nettleser:
 * globalThis.Anlegg); visningen (meny, kart, 3D, lagring) ligger i anleggsarbeid-visning.js.
 * Et nytt anlegg = en ny rad i ANLEGG (navn, form, krav, inngrep, vern, kapasitet, pris, tid, materialer, modell). Visningen trenger da
 * bare en tegning (2D) og en modell (3D) med samme navn som «modell».
 * ALLE TALLENE ER CLAUDES FORSLAG (ikke brukerens fasit) – de står samlet i REGLER og ANLEGG.
 */
(function (rot) {
  'use strict';
  // Claudes forslag, alle sammen.
  const REGLER = {
    // arbeidskraft: hver person i leiren på oppgaven «bygg» teller 1, hver levende mann i et ingeniørlag innen «ingeniørNær» meter fra
    // anlegget teller «ingeniør» (de har maskiner og sprengstoff). Byggetiden i ANLEGG er i persontimer.
    arbeid: { folk: 1, ingeniør: 3, ingeniørNær: 400 },
    // hvor nær (m) et lag må stå anlegget for å få vernet (skyttergrav: fra linja; bunker: fra midten)
    vernNær: { linje: 4, punkt: 9 },
    // strandkravet: vann innen så mange meter fra punktet (og selve punktet på land); prøvene ligger i ringer rundt punktet
    strand: { nær: 40, ringer: [10, 20, 30, 40], retninger: 16 },
    // bratt fjellside (tunnel): portalene på land, lengden mellom min og maks (m), fjellet over linja minst «over» meter på det høyeste og
    // over linja på minst «andel» av strekningen, og bakken stiger minst «stigning» meter de første «inn» metrene innover fra hver portal
    tunnel: { min: 60, maks: 3000, over: 15, andel: .6, stigning: 6, inn: 40, prøver: 24 },
    // skyttergrav: lengde (m) og punkter i linja
    linje: { min: 4, maks: 250, punkter: 12 },
    // bakken ved terrenginngrep: skråningen ut fra kanten (m) før bakken er urørt (2D-reglene)
    skråning: 1.5,
    // reisetiden i en tunnel: fart til fots og med kjøretøy (m/s); en rute gjennom tunnelen velges når den er kortere enn «spar» × rett vei
    reise: { fot: 1.3, kjøretøy: 8, spar: .9, opp: 8, ned: 3, prøver: 32 },
  };
  // Tabellen over anlegg (Claudes forslag). form: 'linje' (to eller flere punkter), 'punkt' (ett punkt med retning) eller 'topunkt' (to ender).
  // krav: 'tørt' | 'strand' | 'fjellside'. inngrep: hvordan bakken endres (null = ingen) – 'grav' langs en linje, 'grop' under et rektangel,
  // og 'bore' (tunnel – kommer senere: inngrepet beskrives, men brukes ikke i terrenget ennå). vern: treff mot laget ganges med dette.
  // kapasitet: lag som får vernet (linje: per så mange meter). pris (kr), tid (persontimer) og mat (materialer) er funksjoner av lengden
  // (m) og nivået. modell: navnet på tegningen/modellen i visningen.
  const ANLEGG = {
    skyttergrav: {
      navn: 'Skyttergrav', form: 'linje', krav: 'tørt', modell: 'skyttergrav',
      inngrep: { type: 'grav', dybde: 1.5, bredde: 1.2 }, kant: 'sandsekker', vern: .4, kapasitet: { perMeter: 20 },
      pris: L => 15000 + 2500 * L, tid: L => 4 * L, mat: L => ({ tre: Math.ceil(L / 8) }),
      tekst: 'Grøft på 1,5 m med sandsekker på kanten. Lag i graven får langt færre treff, og du kan gå ned i den.',
    },
    bunker: {
      // inngang: gropa går så langt (m) bak bunkeren, så du kommer ned til døra
      navn: 'Bunker', form: 'punkt', krav: 'tørt', modell: 'bunker', mål: [7, 5.5], inngang: 3,
      inngrep: { type: 'grop', dybde: 1.3 }, vern: .15, kapasitet: { lag: 1 },
      pris: () => 3000000, tid: () => 600, mat: () => ({ betong: 40, stål: 8 }),
      tekst: 'Betong, delvis nedgravd, med skyteskår og dør. Plass til ett lag, som får svært få treff.',
    },
    kai: {
      navn: 'Kai', form: 'punkt', krav: 'strand', modell: 'kai', mål: [24, 8],
      // nivå 1 = liten kai (småbåt og sjark), nivå 2 = middels kai (også lekter). kaiLengde går til sjøen (Kaier.størrelse: middels fra 50 m).
      nivåer: [{ navn: 'Liten kai', mål: [24, 8], kaiLengde: 30 }, { navn: 'Middels kai', mål: [44, 10], kaiLengde: 60 }],
      inngrep: null, vern: 1, kapasitet: { båter: [2, 4] },
      pris: (L, n = 1) => (n >= 2 ? 6000000 : 2000000), tid: (L, n = 1) => (n >= 2 ? 900 : 350), mat: (L, n = 1) => (n >= 2 ? { betong: 60, stål: 10, tre: 10 } : { betong: 25, stål: 4, tre: 6 }),
      tekst: 'Betongkai langs strandkanten. Båtene dine kan legge til her som ved en havn: liten kai for småbåt og sjark, middels også for lekter.',
    },
    tunnel: {
      navn: 'Tunnel', form: 'topunkt', krav: 'fjellside', modell: 'portal', bredde: 9,
      inngrep: { type: 'bore', bredde: 9, høyde: 6.5 }, vern: 1, kapasitet: { samtidig: 2 },
      pris: L => 5000000 + 40000 * L, tid: L => 400 + 20 * L, mat: L => ({ betong: Math.ceil(20 + L / 10), stål: Math.ceil(6 + L / 40) }),
      tekst: 'To portaler i fjellsiden. Lag og kjøretøy reiser gjennom på kort tid. Lang byggetid og høy pris etter lengden.',
    },
  };

  // ---------- geometri ----------
  const lengde = P => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return s; };
  // avstand fra (x, y) til linja P (og parameteren langs den i meter)
  function avstandLinje(P, x, y) {
    let best = Infinity, s = 0, langs = 0;
    for (let i = 1; i < P.length; i++) { const ax = P[i - 1][0], ay = P[i - 1][1], dx = P[i][0] - ax, dy = P[i][1] - ay, l2 = dx * dx + dy * dy, l = Math.sqrt(l2);
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0, d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
      if (d < best) { best = d; langs = s + t * l; } s += l; }
    return { d: best, langs };
  }
  // punkter langs linja hver «hver» meter (med endene)
  function langs(P, hver) {
    const ut = [];
    for (let i = 1; i < P.length; i++) { const ax = P[i - 1][0], ay = P[i - 1][1], l = Math.hypot(P[i][0] - ax, P[i][1] - ay), n = Math.max(1, Math.ceil(l / hver));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) ut.push([ax + (P[i][0] - ax) * k / n, ay + (P[i][1] - ay) * k / n]); }
    return ut;
  }
  // rektangelets hjørner (midten x, y, retning ret i radianer: lengden langs ret, bredden på tvers)
  function hjørner(x, y, ret, L, B) { const c = Math.cos(ret), s = Math.sin(ret), a = L / 2, b = B / 2;
    return [[-a, -b], [a, -b], [a, b], [-a, b]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]); }
  // et punkt i rektangelets egne koordinater (u langs, v på tvers)
  const lokalt = (o, x, y) => { const c = Math.cos(o.ret || 0), s = Math.sin(o.ret || 0), dx = x - o.x, dy = y - o.y; return [dx * c + dy * s, -dx * s + dy * c]; };

  // ---------- nye anlegg ----------
  const målFor = (A, nivå) => (A.nivåer ? A.nivåer[Math.max(0, Math.min(A.nivåer.length, nivå || 1) - 1)].mål : A.mål);
  // Kostnaden for et anlegg (eller for å oppgradere fra nivå «fra»): { kr, timer (persontimer), mat, lengde }
  function kostnad(type, P, nivå = 1, fra = 0) {
    const A = ANLEGG[type]; if (!A) return null; const L = A.form === 'punkt' ? 0 : lengde(P);
    const kr = A.pris(L, nivå) - (fra ? A.pris(L, fra) : 0), timer = A.tid(L, nivå) - (fra ? A.tid(L, fra) : 0), m = A.mat(L, nivå), m0 = fra ? A.mat(L, fra) : {}, mat = {};
    for (const k in m) { const v = m[k] - (m0[k] || 0); if (v > 0) mat[k] = v; }
    return { kr: Math.max(0, Math.round(kr)), timer: Math.max(1, Math.round(timer)), mat, lengde: Math.round(L) };
  }
  let nesteId = 1;
  // Et nytt anlegg (under bygging). P: punktene (linje/topunkt) eller [[x, y]] (punkt), ret: retningen for punktanlegg (radianer).
  function nytt(type, P, valg = {}) {
    const A = ANLEGG[type]; if (!A) return null; const k = kostnad(type, P, valg.nivå || 1);
    return { id: valg.id || 'a' + (nesteId++), type, P: P.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]), ret: valg.ret || 0, nivå: valg.nivå || 1,
      arbeid: 0, behov: k.timer, ferdig: false, startet: valg.tid || 0 };
  }
  const andel = a => (a.ferdig ? 1 : Math.max(0, Math.min(1, a.arbeid / (a.behov || 1))));
  // Arbeidskraften ved et anlegg: folk = personer på «bygg», ingeniører = levende menn i ingeniørlag nær nok (lister med { x, y, menn }).
  function arbeidskraft(a, folk, ingeniørlag) {
    const R = REGLER.arbeid, [x, y] = midt(a); let n = (folk || 0) * R.folk;
    for (const s of ingeniørlag || []) if (Math.hypot(s.x - x, s.y - y) <= R.ingeniørNær) n += (s.menn || 0) * R.ingeniør;
    return n;
  }
  // Ett steg: timer spilltimer med «kraft» arbeidere. Gir 'ferdig' når anlegget nettopp ble ferdig.
  function steg(a, timer, kraft) { if (a.ferdig || !(kraft > 0) || !(timer > 0)) return null; a.arbeid += kraft * timer; if (a.arbeid >= a.behov) { a.arbeid = a.behov; a.ferdig = true; return 'ferdig'; } return 'arbeid'; }
  // timer igjen med denne arbeidskraften (Infinity uten arbeidere)
  const igjen = (a, kraft) => (a.ferdig ? 0 : kraft > 0 ? (a.behov - a.arbeid) / kraft : Infinity);
  function midt(a) { if (ANLEGG[a.type].form === 'punkt') return a.P[0]; const P = a.P; let sx = 0, sy = 0; for (const p of P) { sx += p[0]; sy += p[1]; } return [sx / P.length, sy / P.length]; }

  // ---------- krav til terrenget ----------
  // T = { høyde(x, y) -> moh. | null, vann(x, y) -> true i vann, iHus(x, y) -> true }. Gir { ok, feil, ret } (ret: retningen mot sjøen for en kai).
  function kanPlassere(type, P, T, ret = 0) {
    const A = ANLEGG[type], R = REGLER; if (!A) return { feil: 'Ukjent anlegg.' };
    const land = (x, y) => { const h = T.høyde(x, y); return h !== null && h !== undefined && h === h && !(T.vann && T.vann(x, y)); };
    if (A.form === 'linje') {
      if (P.length < 2) return { feil: 'Trykk minst to punkter for graven.' };
      const L = lengde(P); if (L < R.linje.min) return { feil: `Graven må være minst ${R.linje.min} m lang.` }; if (L > R.linje.maks) return { feil: `Graven kan være høyst ${R.linje.maks} m lang.` };
      for (const [x, y] of langs(P, 2)) { if (!land(x, y)) return { feil: 'Graven kan ikke gå i vann eller utenfor kartet.' }; if (T.iHus && T.iHus(x, y)) return { feil: 'Graven kan ikke gå gjennom et hus.' }; }
      return { ok: true, lengde: L };
    }
    if (A.form === 'punkt') {
      const [x, y] = P[0];
      if (A.krav === 'strand') {
        if (!land(x, y)) return { feil: 'Kaia må stå på land, helt i strandkanten.' };
        // retningen mot sjøen: snittet av retningene der det er vann, nærmeste ring først
        const S = R.strand; let vx = 0, vy = 0, nær = Infinity;
        for (const r of S.ringer) for (let k = 0; k < S.retninger; k++) { const v = 2 * Math.PI * k / S.retninger; if (T.vann && T.vann(x + Math.cos(v) * r, y + Math.sin(v) * r)) { vx += Math.cos(v) / r; vy += Math.sin(v) / r; nær = Math.min(nær, r); } }
        if (nær === Infinity) return { feil: `Kaia må ligge i strandkanten (vann innen ${S.nær} m).` };
        return { ok: true, ret: Math.atan2(vy, vx), vannNær: nær };
      }
      const [L, B] = målFor(A, 1);
      for (const [hx, hy] of [[x, y], ...hjørner(x, y, ret, L, B)]) { if (!land(hx, hy)) return { feil: `${A.navn} må stå på tørt land.` }; if (T.iHus && T.iHus(hx, hy)) return { feil: `${A.navn} kan ikke stå i et hus.` }; }
      return { ok: true, ret };
    }
    // to punkter: tunnel
    const S = R.tunnel, [a, b] = P; if (!a || !b) return { feil: 'Trykk to steder: de to portalene.' };
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < S.min) return { feil: `Tunnelen må være minst ${S.min} m lang.` }; if (L > S.maks) return { feil: `Tunnelen kan være høyst ${S.maks / 1000} km lang.` };
    if (!land(a[0], a[1]) || !land(b[0], b[1])) return { feil: 'Begge portalene må stå på land.' };
    const ha = T.høyde(a[0], a[1]), hb = T.høyde(b[0], b[1]); let over = 0, maks = -Infinity, n = 0;
    for (let k = 1; k < S.prøver; k++) { const t = k / S.prøver, h = T.høyde(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); if (h === null || h === undefined || h !== h) continue; n++;
      const d = h - (ha + (hb - ha) * t); if (d > 0) over++; maks = Math.max(maks, d); }
    if (!n || maks < S.over || over / n < S.andel) return { feil: `Tunnelen må gå gjennom et fjell (minst ${S.over} m fjell over tunnelen).` };
    for (const [p, q, hp] of [[a, b, ha], [b, a, hb]]) { const t = Math.min(1, S.inn / L), h = T.høyde(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t);
      if (h === null || h === undefined || h - hp < S.stigning) return { feil: 'Portalene må stå ved foten av en bratt fjellside (bakken må stige inn mot fjellet).' }; }
    return { ok: true, lengde: L, over: Math.round(maks) };
  }

  // ---------- terrenginngrep (felles motor) ----------
  // Inngrepene til et anlegg som former: { form: 'linje', P, halv, dybde } eller { form: 'rekt', x, y, ret, a, b, dybde } (a, b = halv lengde
  // og bredde). dybde ganges med hvor langt arbeidet er kommet (en halvferdig grav er halvt så dyp). 'bore' (tunnel) gir ingenting ennå:
  // når ekte graving i fjellet kommer, legges en form 'bore' til her og i 3D-terrenget.
  function inngrep(a, helt) {
    const A = ANLEGG[a.type], I = A && A.inngrep; if (!I) return [];
    const f = helt ? 1 : andel(a); if (f <= 0) return [];
    if (I.type === 'grav') return [{ form: 'linje', P: a.P, halv: I.bredde / 2, dybde: I.dybde * f, id: a.id }];
    if (I.type === 'grop') { const [L, B] = målFor(A, a.nivå), g = A.inngang || 0, r = a.ret || 0;
      return [{ form: 'rekt', x: a.P[0][0] - Math.cos(r) * g / 2, y: a.P[0][1] - Math.sin(r) * g / 2, ret: r, a: (L + g) / 2, b: B / 2, dybde: I.dybde * f, id: a.id }]; }
    return [];
  }
  const boks = o => (o.form === 'linje' ? o.P.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity])
    : [o.x - o.a - o.b, o.y - o.a - o.b, o.x + o.a + o.b, o.y + o.a + o.b]);
  // Hvor mye bakken er endret i (x, y): negativt = senket (m). Inne i graven/gropa hele dybden, så en jevn skråning (REGLER.skråning) ut.
  function endringVed(liste, x, y) {
    let d = 0; const sk = REGLER.skråning;
    for (const o of liste) { const b = o.boks || (o.boks = boks(o)); if (x < b[0] - o.halv - sk - (o.b || 0) || x > b[2] + (o.halv || 0) + sk || y < b[1] - (o.halv || 0) - sk || y > b[3] + (o.halv || 0) + sk) continue;
      let ut;
      if (o.form === 'linje') ut = avstandLinje(o.P, x, y).d - o.halv;
      else { const [u, v] = lokalt(o, x, y); ut = Math.max(Math.abs(u) - o.a, Math.abs(v) - o.b); }
      const e = ut <= 0 ? -o.dybde : ut < sk ? -o.dybde * (1 - ut / sk) : 0; if (e < d) d = e; }
    return d;
  }
  // Kravene til 3D-terrenget (samme form som Veg.skjærKrav: [x, y, z, …] i utsnittets lokale meter): bakken skal ligge minst så dypt
  // som bunnen over hele inngrepet. z(x, y) = bakkens høyde (moh.) før inngrepet. hver = avstanden mellom prøvene (m).
  function terrengKrav(liste, z, hver = 1, ut = []) {
    for (const o of liste) {
      if (o.form === 'linje') { const P = langs(o.P, hver), n = P.length;
        for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, h = z(P[i][0], P[i][1]) - o.dybde;
          for (const t of [-1, -.5, 0, .5, 1]) ut.push(P[i][0] + nx * o.halv * t, P[i][1] + ny * o.halv * t, h); } }
      else { const c = Math.cos(o.ret), s = Math.sin(o.ret), h = z(o.x, o.y) - o.dybde;
        for (let u = -o.a; u <= o.a + 1e-6; u += hver) for (let v = -o.b; v <= o.b + 1e-6; v += hver) ut.push(o.x + u * c - v * s, o.y + u * s + v * c, h); }
    }
    return ut;
  }

  // ---------- vern og plass ----------
  // Er (x, y) i anlegget (ferdig)? Gir anlegget eller null.
  function iAnlegg(liste, x, y) {
    const R = REGLER.vernNær;
    for (const a of liste) { if (!a.ferdig) continue; const A = ANLEGG[a.type]; if (A.vern >= 1) continue;
      if (A.form === 'linje' && avstandLinje(a.P, x, y).d <= R.linje) return a;
      if (A.form === 'punkt' && Math.hypot(x - a.P[0][0], y - a.P[0][1]) <= R.punkt) return a; }
    return null;
  }
  // Hvor mange lag anlegget har plass til
  const plasser = a => { const A = ANLEGG[a.type], k = A.kapasitet || {}; if (k.perMeter) return Math.max(1, Math.floor(lengde(a.P) / k.perMeter)); if (k.lag) return k.lag; return 0; };
  // Fordel lagene på anleggene (de første som står der, får plassen): gir Map(lag -> anlegg). lag: [{ x, y, … }]
  function fordel(liste, lag) {
    const ut = new Map(), brukt = new Map();
    for (const s of lag) { const a = iAnlegg(liste, s.x, s.y); if (!a) continue; const n = brukt.get(a.id) || 0; if (n >= plasser(a)) continue; brukt.set(a.id, n + 1); ut.set(s, a); }
    return ut;
  }
  const vern = a => (a ? ANLEGG[a.type].vern : 1);

  // ---------- tunnelen som en lenke i ruta ----------
  // Reisetiden gjennom en tunnel (spillminutter)
  const reiseMin = (a, kjøretøy) => lengde(a.P) / (kjøretøy ? REGLER.reise.kjøretøy : REGLER.reise.fot) / 60;
  // Hvor langt en strekning «føles» til fots (m): luftlinja + «opp» meter per høydemeter opp og «ned» per høydemeter ned (som Naismiths
  // regel: en time per 600 høydemeter). høyde(x, y) -> moh. eller null. Uten høyde: luftlinja.
  function marsjKost(høyde, x, y, X, Y) {
    const R = REGLER.reise, L = Math.hypot(X - x, Y - y); if (!høyde) return L;
    const n = Math.max(2, Math.min(R.prøver, Math.ceil(L / 25))); let s = L, h0 = høyde(x, y);
    for (let k = 1; k <= n; k++) { const h = høyde(x + (X - x) * k / n, y + (Y - y) * k / n); if (h === null || h === undefined || h !== h) continue; if (h0 !== null && h0 !== undefined && h0 === h0) s += h > h0 ? (h - h0) * R.opp : (h0 - h) * R.ned; h0 = h; }
    return s;
  }
  // Lønner det seg å gå gjennom en ferdig tunnel fra (x, y) til (X, Y)? Gir { a, inn (0/1: portalen du går inn), ut } eller null.
  // Rett vei = marsjKost over fjellet; med tunnelen: til portalen + tunnelen (flat) + fra den andre portalen. Velges når den er kortere
  // enn «spar» × rett vei. høyde: se marsjKost (uten høyde er rett vei alltid kortest).
  function viaTunnel(liste, x, y, X, Y, høyde) {
    const rett = marsjKost(høyde, x, y, X, Y); let best = null;
    for (const a of liste) { if (a.type !== 'tunnel' || !a.ferdig) continue; const L = lengde(a.P);
      for (const inn of [0, 1]) { const p = a.P[inn], q = a.P[1 - inn], v = marsjKost(høyde, x, y, p[0], p[1]) + L + marsjKost(høyde, q[0], q[1], X, Y);
        if (v < rett * REGLER.reise.spar && (!best || v < best.v)) best = { a, inn, ut: 1 - inn, v }; } }
    return best;
  }

  // ---------- lagring ----------
  function tilJSON(liste) { return liste.map(a => ({ id: a.id, type: a.type, P: a.P, ret: +(a.ret || 0).toFixed(3), nivå: a.nivå, arbeid: +a.arbeid.toFixed(2), behov: a.behov, ferdig: !!a.ferdig, startet: a.startet || 0 })); }
  function fraJSON(d) {
    const ut = []; if (!Array.isArray(d)) return ut;
    for (const o of d) { if (!o || !ANLEGG[o.type] || !Array.isArray(o.P) || !o.P.length || !o.P.every(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))) continue;
      const a = { id: String(o.id || 'a' + nesteId), type: o.type, P: o.P.map(p => [p[0], p[1]]), ret: Number.isFinite(o.ret) ? o.ret : 0, nivå: Math.max(1, Math.min(3, o.nivå | 0 || 1)),
        arbeid: Math.max(0, +o.arbeid || 0), behov: Math.max(1, +o.behov || 1), ferdig: !!o.ferdig, startet: +o.startet || 0 };
      const n = parseInt(String(a.id).replace(/\D/g, ''), 10); if (n >= nesteId) nesteId = n + 1; ut.push(a); }
    return ut;
  }

  const api = { REGLER, ANLEGG, lengde, avstandLinje, langs, hjørner, lokalt, målFor, kostnad, nytt, andel, arbeidskraft, steg, igjen, midt, kanPlassere,
    inngrep, endringVed, terrengKrav, iAnlegg, plasser, fordel, vern, reiseMin, marsjKost, viaTunnel, tilJSON, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Anlegg = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
