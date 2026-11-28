/* Riksbrudd – SPIONER OG SABOTØRER (28. nov, pakke «spioner», ut6 – kapittel 14.3 og 12 «Etterretning og sabotasje» i
 * docs/plan-selskap-okonomi.md). Regler uten DOM (Node: require('./spion'); nettleser: globalThis.Spion). Visningen: spill/spion-visning.js.
 *  - EN SØKER KAN VÆRE SENDT AV EN RIVAL: sjansen per søker stiger jo mer dere ligger foran Ravnsund/Mosevakt (søkerSjanse). Høyst én spion
 *    fra hver rival om gangen. En spion i leiren gir rivalen INNSYN: de vet hvor leiren og lageret er (AI.minne), hvilke kontrakter dere byr
 *    på (de tar tilbudene foran dere oftere), sabotasjen deres treffer bedre (rival.js), og under et angrep kan spionen åpne porten.
 *  - OPPDAGE: kameravakta ser noen der de ikke skal være om natta (ved lageret), søkerens historie stemmer ikke med ryktet («noe stemmer ikke»
 *    på søkerkortet når dere har kontrollrom med kameravakt), eller leirsjefen fatter mistanke. Mistanken samles (0–100); fra «terskel» står
 *    personen under «Mistanke» i Folk-panelet. Valg: AVHØR (tar noen timer, kan avsløre), SPARKEN, eller (når spionen er avslørt) BRUK SPIONEN
 *    TIL FALSKE OPPLYSNINGER (rivalen angriper feil sted / tar en falsk kontrakt). Mistanke mot en uskyldig senker moralen.
 *  - EGNE SPIONER: send en av folkene deres inn hos en rival. Spionen gir innsyn (dere ser lagene deres og hva de planlegger), kan sabotere
 *    sagbruket deres, og kan bli avslørt (personen er tapt, en pakt med rivalen er brutt av dere, og ryktet «pålitelig» faller).
 * Spørsmål 22 i planen («er det gøy med slike overraskelser, eller blir det for mye uflaks?»): forslaget er brukt – overraskelsene er med, men
 * sjeldne, og dere har alltid en vei til å oppdage og svare (ingen spion uten søker, kameraer og leder gir varsler, uskyldige rammes sjelden).
 * ALLE TALL HER ER CLAUDES FORSLAG (samlet i REGLER).
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const tall = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
  const DØGN = 1440;
  const SIDER = ['rød', 'grønn'];

  // ---------- TALLENE (alle er Claudes forslag) ----------
  const REGLER = {
    // sjansen for at en ny søker er sendt av en rival: grunn + foran × (forholdet din verdi / rivalens − 1, høyst foranTak), høyst maks
    søker: { grunn: .03, foran: .08, foranTak: 1.5, maks: .15,
      // «noe stemmer ikke» på søkerkortet: sjansen når dere har god vakt (kontrollrom med kameravakt), for en spion og (sjelden) for en ærlig søker
      tvil: .6, tvilFalsk: .04,
      // en spion dere ansetter selv om kortet sa «noe stemmer ikke», starter med denne mistanken
      tvilMistanke: 30 },
    // innsynet en spion gir rivalen
    innsyn: { kontrakt: 2, sabotasje: 2, stopp: .3, skade: 1.5 },
    // porten: under et angrep fra spionens side, innen «nær» meter fra leiren, åpner spionen porten med «sjanse»; i «minutter» tar
    // forsvarerne nær leiren «ild» ganger så mange treff og skyter «svar» ganger så godt
    port: { sjanse: .6, nær: 900, minutter: 30, ild: 1.3, svar: .85, radius: 400 },
    // OPPDAGE (hver natt): spionen sniker seg rundt med «snik»; kameravakta ser det med «kamera» (smart kamera «smart»), og det gir «sett»
    // i mistanke. Uten kameraer: «vakt» per person på vakt (høyst «vaktMaks»). Leirsjefen: «leder» × (ledelse − 0,7) / 0,75 per døgn, «lederSett».
    // Falske syn: med kameraer kan en uskyldig bli sett ved lageret («falsk» per natt), og en leder kan ta feil («lederFalsk» × det samme).
    oppdag: { snik: .5, kamera: .4, smart: .55, sett: 35, vakt: .05, vaktMaks: .2, leder: .25, lederSett: 25, falsk: .03, lederFalsk: .02, falskSett: 30, terskel: 50, glemmer: 3 },
    // AVHØR: tar «timer» spilltimer (personen arbeider ikke imens); avslører en spion med «avslør» + «leder» × (ledelse − 0,9) / 0,55.
    // En uskyldig: moral «moral», lojalitet «lojal», og mistanken forsvinner.
    avhør: { timer: 3, avslør: .55, leder: .25, moral: -4, lojal: -.15 },
    // SPARKEN: en uskyldig som får sparken, gir moral «uskyldig»; en spion gir moral «spion» (lettelse)
    spark: { uskyldig: -6, spion: 2 },
    // FALSKE OPPLYSNINGER: høyst én gang per «pause» døgn; rivalen angriper et falskt sted i «timer» spilltimer, eller tar en falsk kontrakt
    // og taper «tap» kr; etter hver gang er spionen «brent» med denne sjansen (rivalen skjønner det og trekker hen ut)
    falsk: { pause: 2, timer: 24, avstand: [2500, 4500], tap: 1.5e6, brent: .35 },
    // EGNE SPIONER: egnethet 0,5 + egenskapene; avslørt per døgn = avslørt / egnethet (høyst avslørtMaks); en sabotasje har i tillegg
    // «sabRisiko» / egnethet for å bli tatt; sagbruket mister «sag» av helsa (ellers brenner et lager for «lager» kr); hver sabotasje høyst
    // hvert «sabPause» døgn. Avslørt: personen er tapt, en pakt med rivalen er brutt av dere, ryktet «pålitelig» faller med «rykte».
    egen: { grunn: .5, egenskap: { modig: .15, nattmenneske: .1, lærenem: .05, pratsom: -.2, redd: -.15, lat: -.05 }, avslørt: .025, avslørtMaks: .12,
      sabRisiko: .2, sag: .45, lager: 8e5, sabPause: 1, rykte: -6, maks: 1 },
  };

  // ---------- tilstand ----------
  // inne: spionene i leiren deres { pid, side, kom, avslørt, vendt, sistFalsk, porter }; mistanke: { pid: { m, grunner, avhør } };
  // ute: deres egne spioner { side: { p (personposten), kom, funn: [], sistSab, egnet } }; falsk: { side: { x, y, til } | null }
  function ny(frø = 1717) { return { versjon: 1, inne: [], mistanke: {}, ute: {}, falsk: {}, tapt: 0, avslørt: 0, frø: frø >>> 0 || 1, dag: null }; }
  function fraJSON(o) {
    if (!o || typeof o !== 'object') return null; const S = { ...ny(o.frø), ...o };
    S.inne = Array.isArray(o.inne) ? o.inne.filter(s => s && s.pid != null && SIDER.includes(s.side)) : [];
    S.mistanke = o.mistanke && typeof o.mistanke === 'object' ? { ...o.mistanke } : {};
    S.ute = {}; for (const sd of SIDER) if (o.ute && o.ute[sd] && o.ute[sd].p) S.ute[sd] = { funn: [], ...o.ute[sd] };
    S.falsk = {}; for (const sd of SIDER) if (o.falsk && o.falsk[sd] && Number.isFinite(o.falsk[sd].til)) S.falsk[sd] = { ...o.falsk[sd] };
    return S;
  }
  // egen tilfeldighet (endrer ikke tallene til de andre modulene)
  function rng(S) { return () => { let x = (S.frø = (Math.imul(S.frø ^ (S.frø >>> 15), 2246822519) + 0x9e3779b9) >>> 0 || 1); x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16; return (x >>> 0) / 4294967296; }; }

  // ---------- søkerne ----------
  // foran = din verdi / rivalens verdi
  function søkerSjanse(foran) { const R = REGLER.søker; return klem(R.grunn + R.foran * klem(tall(foran, 1) - 1, 0, R.foranTak), 0, R.maks); }
  // hvilken rival sender en spion: den som ligger lengst bak (forholdet størst) og ikke alt har en spion inne. verdi = { blå, rød, grønn }
  function velgSender(S, verdi, r) {
    const fri = SIDER.filter(sd => !S.inne.some(s => s.side === sd && !s.vendt));
    if (!fri.length) return null;
    const v = verdi || {}, foran = sd => tall(v.blå, 1) / Math.max(1, tall(v[sd], 1));
    const best = fri.slice().sort((a, b) => foran(b) - foran(a))[0];
    return r() < søkerSjanse(foran(best)) ? { side: best, foran: foran(best) } : null;
  }
  // søkerkortet: «noe stemmer ikke» (bare med god vakt). Gir true/false; fast for søkeren (s.tvil settes én gang)
  function tvil(s, godVakt, r) {
    if (!godVakt) return false; const R = REGLER.søker; return r() < (s.spion ? R.tvil : R.tvilFalsk);
  }
  // en ansatt søker: spionen kommer inn i leiren (pid = personens id)
  function inn(S, pid, side, nå, o = {}) {
    if (!SIDER.includes(side)) return null; const s = { pid, side, kom: Math.round(tall(nå)), avslørt: false, vendt: false, sistFalsk: -1e9, porter: 0 };
    S.inne.push(s); if (o.tvil) leggMistanke(S, pid, REGLER.søker.tvilMistanke, 'historien stemte ikke med ryktet'); return s;
  }
  const spionFor = (S, pid) => S.inne.find(s => s.pid === pid) || null;
  // rivalen har innsyn så lenge spionen er inne og ikke vendt (en vendt spion gir bare det dere vil)
  const innsyn = (S, side) => S.inne.some(s => s.side === side && !s.vendt);
  // faktorene rival.js bruker (1 = som før)
  function virkning(S, side) {
    const I = REGLER.innsyn; if (!innsyn(S, side)) return { kontrakt: 1, sabotasje: 1, stopp: 1, skade: 1, leir: false };
    return { kontrakt: I.kontrakt, sabotasje: I.sabotasje, stopp: I.stopp, skade: I.skade, leir: true };
  }

  // ---------- mistanke ----------
  function leggMistanke(S, pid, m, grunn) {
    const k = String(pid), M = S.mistanke[k] || (S.mistanke[k] = { m: 0, grunner: [] });
    M.m = klem(M.m + m, 0, 100); if (grunn && !M.grunner.includes(grunn)) { M.grunner.push(grunn); if (M.grunner.length > 4) M.grunner.shift(); }
    return M;
  }
  const mistanke = (S, pid) => (S.mistanke[String(pid)] ? S.mistanke[String(pid)].m : 0);
  const mistenkt = (S, pid) => mistanke(S, pid) >= REGLER.oppdag.terskel || !!(S.mistanke[String(pid)] && S.mistanke[String(pid)].avhør);
  // NATTA: ctx = { pider (alle i leiren), kamera: { antall, smart, folk (operatører × tempo > 0) }, vakt (folk på vakt), leder: { pid, ledelse } | null }
  // Gir hendelsene [{ type: 'sett'|'leder', pid, grunn, uskyldig }]
  function natt(S, ctx = {}, r = rng(S)) {
    const O = REGLER.oppdag, H = [], K = ctx.kamera || {}, harKam = tall(K.antall) > 0 && (K.smart || tall(K.folk) > 0);
    const pkam = harKam ? (K.smart ? O.smart : O.kamera) : Math.min(O.vaktMaks, O.vakt * tall(ctx.vakt));
    const lev = new Set(ctx.pider || []);
    for (const s of S.inne) {
      if (!lev.has(s.pid) || s.vendt) continue;
      if (r() < O.snik && r() < pkam) { const g = harKam ? 'kameravakta så hen ved lageret i natt' : 'vakta så hen ute i natt'; leggMistanke(S, s.pid, O.sett, g); H.push({ type: 'sett', pid: s.pid, grunn: g }); }
    }
    // falske syn: sjeldne, og bare med kameraer
    if (harKam && lev.size && r() < O.falsk) { const ærlige = [...lev].filter(pid => !spionFor(S, pid)); if (ærlige.length) { const pid = ærlige[Math.floor(r() * ærlige.length) % ærlige.length];
      const g = 'kameravakta så hen ved lageret i natt'; leggMistanke(S, pid, O.falskSett, g); H.push({ type: 'sett', pid, grunn: g, uskyldig: true }); } }
    // leirsjefen
    const L = ctx.leder; if (L && Number.isFinite(L.ledelse)) { const evne = klem((L.ledelse - .7) / .75, 0, 1);
      for (const s of S.inne) { if (!lev.has(s.pid) || s.vendt || s.pid === L.pid) continue; if (r() < O.leder * evne) { const g = 'leirsjefen fatter mistanke'; leggMistanke(S, s.pid, O.lederSett, g); H.push({ type: 'leder', pid: s.pid, grunn: g }); } }
      if (lev.size && r() < O.lederFalsk * (1.2 - evne)) { const ærlige = [...lev].filter(pid => !spionFor(S, pid) && pid !== L.pid); if (ærlige.length) { const pid = ærlige[Math.floor(r() * ærlige.length) % ærlige.length];
        const g = 'leirsjefen fatter mistanke'; leggMistanke(S, pid, O.lederSett, g); H.push({ type: 'leder', pid, grunn: g, uskyldig: true }); } } }
    // mistanke som ikke får ny næring, svinner sakte (ikke under avhør)
    for (const [k, M] of Object.entries(S.mistanke)) { if (M.avhør) continue; if (!lev.has(+k) && !lev.has(k)) { delete S.mistanke[k]; continue; }
      if (!H.some(h => String(h.pid) === k)) M.m = Math.max(0, M.m - O.glemmer); if (M.m <= 0 && !spionFor(S, +k)) delete S.mistanke[k]; }
    return H;
  }
  // ---------- avhør, sparken, falske opplysninger ----------
  function startAvhør(S, pid, nå) {
    const k = String(pid), M = S.mistanke[k] || leggMistanke(S, pid, 0, null); if (M.avhør) return { feil: 'Avhøret er alt i gang.' };
    M.avhør = { fra: Math.round(tall(nå)), til: Math.round(tall(nå) + REGLER.avhør.timer * 60) }; return { ok: true, til: M.avhør.til };
  }
  // ferdig avhør: ledelse = avhørerens (leirsjefens) ledelse eller 0,9. Gir { spion, avslørt, uskyldig, side }
  function avhørFerdig(S, pid, r = rng(S), ledelse = .9) {
    const k = String(pid), M = S.mistanke[k]; if (M) delete M.avhør; const s = spionFor(S, pid), A = REGLER.avhør;
    if (s) { if (s.avslørt) return { spion: true, avslørt: true, side: s.side };
      const p = klem(A.avslør + A.leder * klem((tall(ledelse, .9) - .9) / .55, 0, 1), 0, .95);
      if (r() < p) { s.avslørt = true; S.avslørt++; if (M) M.m = 100; return { spion: true, avslørt: true, side: s.side }; }
      if (M) M.m = Math.max(0, M.m - 20); return { spion: true, avslørt: false, side: s.side }; }
    delete S.mistanke[k]; return { spion: false, uskyldig: true, moral: A.moral, lojal: A.lojal };
  }
  // sparken: gir { spion, side, moral } – spionen er ute, innsynet borte
  function spark(S, pid) {
    const s = spionFor(S, pid); delete S.mistanke[String(pid)];
    if (s) { S.inne.splice(S.inne.indexOf(s), 1); return { spion: true, side: s.side, moral: REGLER.spark.spion, avslørt: s.avslørt }; }
    return { spion: false, moral: REGLER.spark.uskyldig };
  }
  // falske opplysninger gjennom en avslørt spion. hva = 'sted' (rivalen tror leiren ligger der: { x, y }) eller 'kontrakt'
  function kanFalsk(S, pid, nå) {
    const s = spionFor(S, pid); if (!s || !s.avslørt) return 'Bare en avslørt spion kan brukes til falske opplysninger.';
    if (tall(nå) - tall(s.sistFalsk, -1e9) < REGLER.falsk.pause * DØGN) return `Vent litt – rivalen blir mistenksom (hver ${REGLER.falsk.pause}. døgn).`;
    return null;
  }
  function falsk(S, pid, hva, nå, r = rng(S), o = {}) {
    const f = kanFalsk(S, pid, nå); if (f) return { feil: f }; const s = spionFor(S, pid), F = REGLER.falsk; s.vendt = true; s.sistFalsk = Math.round(tall(nå));
    const ut = { side: s.side, hva };
    if (hva === 'sted') { const L = o.leir || { x: 0, y: 0 }, a = r() * Math.PI * 2, d = F.avstand[0] + r() * (F.avstand[1] - F.avstand[0]);
      S.falsk[s.side] = { x: Math.round(L.x + Math.cos(a) * d), y: Math.round(L.y + Math.sin(a) * d), til: Math.round(tall(nå) + F.timer * 60) }; ut.punkt = S.falsk[s.side]; }
    else ut.tap = F.tap;
    if (r() < F.brent) { S.inne.splice(S.inne.indexOf(s), 1); delete S.mistanke[String(pid)]; ut.brent = true; }
    return ut;
  }
  // der rivalen tror leiren ligger (falske opplysninger), eller null
  const falskSted = (S, side, nå) => { const f = S.falsk[side]; return f && tall(nå) < f.til ? f : null; };
  // porten under et angrep: én gang per angrep (nr), sjansen gjelder. Gir true når spionen åpner den nå.
  function port(S, side, nr, r = rng(S)) {
    const s = S.inne.find(q => q.side === side && !q.vendt); if (!s || s.sistPort === nr) return false; s.sistPort = nr;
    if (r() >= REGLER.port.sjanse) return false; s.porter = (s.porter || 0) + 1; return true;
  }

  // ---------- egne spioner ----------
  function egnethet(p) { const E = REGLER.egen; let v = E.grunn; for (const e of (p && p.egen) || []) v += E.egenskap[e] || 0; return klem(Math.round(v * 100) / 100, .2, .9); }
  function kanSende(S, p, side) {
    if (!SIDER.includes(side)) return 'Ukjent rival.'; if (!p) return 'Velg en person.'; if (S.ute[side]) return 'Dere har alt en spion der.';
    if (p.karakter) return 'Du kan ikke sende deg selv.'; return null;
  }
  function send(S, p, side, nå) { const f = kanSende(S, p, side); if (f) return { feil: f }; S.ute[side] = { p: { ...p }, kom: Math.round(tall(nå)), funn: [], sistSab: -1e9, egnet: egnethet(p) }; return { ok: true, egnet: S.ute[side].egnet }; }
  function hjem(S, side) { const u = S.ute[side]; if (!u) return { feil: 'Dere har ingen spion der.' }; delete S.ute[side]; return { ok: true, p: u.p }; }
  // hver morgen: avslørt? Gir [{ type: 'avslørt', side, p }]
  function egenDøgn(S, r = rng(S)) {
    const E = REGLER.egen, H = [];
    for (const sd of SIDER) { const u = S.ute[sd]; if (!u) continue; const p = Math.min(E.avslørtMaks, E.avslørt / Math.max(.2, u.egnet));
      if (r() < p) { delete S.ute[sd]; S.tapt++; H.push({ type: 'avslørt', side: sd, p: u.p }); } }
    return H;
  }
  function kanSabotere(S, side, nå) { const u = S.ute[side]; if (!u) return 'Dere har ingen spion der.'; if (tall(nå) - tall(u.sistSab, -1e9) < REGLER.egen.sabPause * DØGN) return 'Spionen må vente til i morgen.'; return null; }
  // sabotasje hos rivalen: harSag = rivalen har et sagbruk. Gir { mål: 'sag'|'lager', skade|kr, avslørt }
  function sabotér(S, side, harSag, nå, r = rng(S)) {
    const f = kanSabotere(S, side, nå); if (f) return { feil: f }; const u = S.ute[side], E = REGLER.egen; u.sistSab = Math.round(tall(nå));
    const ut = harSag ? { mål: 'sag', skade: E.sag } : { mål: 'lager', kr: E.lager };
    if (r() < Math.min(.6, E.sabRisiko / Math.max(.2, u.egnet))) { delete S.ute[side]; S.tapt++; ut.avslørt = true; ut.p = u.p; }
    return ut;
  }
  function leggFunn(S, side, tekst, nå) { const u = S.ute[side]; if (!u || !tekst) return; u.funn.unshift({ t: Math.round(tall(nå)), tekst }); if (u.funn.length > 8) u.funn.length = 8; }

  // ---------- kommandoene (registreres av visningen, testes i test_spion.js) ----------
  // M: { tilstand(side), folk(side), rett: { avhør(k), spark(k), falsk(k), send(k), hjem(k), sabotér(k) } }
  function registrerKommandoer(K, M = {}) {
    const S = c => (M.tilstand ? M.tilstand((c && c.side) || 'blå') : null), F = c => (M.folk ? M.folk((c && c.side) || 'blå') : null);
    const finnP = (c, id) => { const f = F(c); return f && f.personer ? f.personer.find(p => p.id === id) : null; };
    const uten = c => (!S(c) || !F(c) ? 'Ingen folk i leiren.' : null);
    const R = M.rett || {};
    K.registrer('spionAvhør', { leir: true, sjekk: (k, c) => uten(c) || (!finnP(c, k.person) ? 'Fant ikke personen.' : null), utfør: k => R.avhør(k), beskriv: () => 'avhører en mistenkt' });
    K.registrer('spionSpark', { leir: true, sjekk: (k, c) => uten(c) || (!finnP(c, k.person) ? 'Fant ikke personen.' : null), utfør: k => R.spark(k), beskriv: () => 'gir en mistenkt sparken' });
    K.registrer('spionFalsk', { leir: true, sjekk: (k, c) => uten(c) || (k.hva !== 'sted' && k.hva !== 'kontrakt' ? 'Velg sted eller kontrakt.' : null) || kanFalsk(S(c), k.person, M.nå ? M.nå() : 0),
      utfør: k => R.falsk(k), beskriv: () => 'gir rivalen falske opplysninger' });
    K.registrer('spionSend', { leir: true, sjekk: (k, c) => uten(c) || kanSende(S(c), finnP(c, k.person), k.rival), utfør: k => R.send(k), beskriv: () => 'sender en spion til en rival' });
    K.registrer('spionHjem', { leir: true, sjekk: (k, c) => uten(c) || (!S(c).ute[k.rival] ? 'Dere har ingen spion der.' : null), utfør: k => R.hjem(k), beskriv: () => 'henter spionen hjem' });
    K.registrer('spionSabotér', { leir: true, sjekk: (k, c) => uten(c) || kanSabotere(S(c), k.rival, M.nå ? M.nå() : 0), utfør: k => R.sabotér(k), beskriv: () => 'saboterer hos en rival' });
  }

  const api = { REGLER, SIDER, ny, fraJSON, rng, søkerSjanse, velgSender, tvil, inn, spionFor, innsyn, virkning, leggMistanke, mistanke, mistenkt, natt,
    startAvhør, avhørFerdig, spark, kanFalsk, falsk, falskSted, port, egnethet, kanSende, send, hjem, egenDøgn, kanSabotere, sabotér, leggFunn, registrerKommandoer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Spion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
