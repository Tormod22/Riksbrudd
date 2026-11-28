/* Riksbrudd – LAGRING AV HVERDAGSTING (28. nov, brukeren: «et skikkelig lagringssystem med hyller» og «flere forskjellige hyller»).
 * Regler uten DOM (Node: require('./tinglager'); nettleser: globalThis.Tinglager). Katalogen er spill/ting.js, visningen
 * spill/tinglager-visning.js. Test: pipeline/fliser/test_tinglager.js.
 *
 * Varelageret (spill/varelager.js) holder materialene (paller planker, tømmerhauger, fat diesel). Her ligger TINGENE: peanøttsmør,
 * tape, ullsokker, paracet … i STABLER på PLASSER med plass i liter:
 *  - hyllene og skapene du setter inn med byggesettet (hyllereol, pallplass, pallreol, kjøleskap, kjølerom, frysboks, medisinskap,
 *    verktøytavle, garderobeskap, kiste, tønne), og leirens bygg som har en standardplass (lagertelt, container, brakke, sykestue,
 *    verksted, kjøkken) – Leir.BYGG[type].tingLager eller STANDARD her;
 *  - «ute» = det som ikke får plass: på bakken i leiren, uten grense – der holder det kortere (fukt, mus).
 *  HOLDBARHET: hver stabel har en alder a i døgn «i riktig lagring». Den eldes med faktoren for plassen: ferskvarer 3 × fortere på en
 *  vanlig hylle enn i kjøleskap, frysevarer 15 × fortere uten frys, alt tørt 2,5 × fortere ute; kjøleskap/kjølerom/frysboks uten strøm er
 *  bare et skap. Når alderen passerer holdbarheten, har tingen råtnet (eller er ødelagt av fukt ute) og kastes.
 *  BRUK: spis() tar mat (rasjoner) – det som går ut først, spises først; medisin() gir raskere heling (den beste medisinen som finnes);
 *  moral() bruker opp kaffe/sjokolade/tobakk og teller kortstokker, bøker, gitarer og radioer (radioen trenger batterier);
 *  tempo() gir verktøy-bonusen for en oppgave.
 * Tilstanden T = { versjon, neste, s: [{ id, t: ting-id, n, a: alder i døgn, p: plass-id }], åpnet: { ting-id: rest }, moral: { … }, tapt: { ting-id: n } }
 * ALLE TALL ER CLAUDES FORSLAG.
 */
(function (rot) {
  'use strict';
  const Ting = typeof module !== 'undefined' && module.exports ? require('./ting.js') : rot.Ting;
  const TI = Ting.TING;

  // Claudes forslag, alle sammen
  const REGLER = {
    // hvor fort ting eldes etter hva de trenger (tørt/kjøl/frys) og hvor de står (klimaet på plassen)
    faktor: { tørt: { tørt: 1, kjøl: 1, frys: 1, ute: 2.5 }, kjøl: { kjøl: 1, frys: 1, tørt: 3, ute: 4 }, frys: { frys: 1, kjøl: 6, tørt: 15, ute: 20 } },
    // ting som tåler alt inne, men blir ødelagt av fukt ute etter så mange døgn (klær, elektro, papir, bøker …)
    fuktHold: 60, fukt: { klær: true, elektro: true, kontor: true, fritid: true, hygiene: true, medisin: true, kjøkken: false, verktøy: false, mat: false, drikke: false },
    // stabler med så lik alder (døgn) slås sammen
    slåSammen: 1,
    // én dose medisin per syk person per døgn; én porsjon av hver moralgruppe per person per døgn
    dosePerDøgn: 1, porsjonPerDøgn: 1,
  };
  // LAGRINGSTYPENE: liter, klima, strøm (kW – trenger strøm for å kjøle), tar (hva som får plass: lag eller kategori; null = alt),
  // passer (det som helst skal stå her), låst (tyver tar det ikke). Liter er Claudes forslag.
  const LAGRING = {
    hyllereol: { navn: 'Hyllereol', liter: 400, klima: 'tørt', tar: null, passer: ['tørt', 'medisin', 'verktøy', 'klær'], tekst: 'Alt tørt' },
    pallplass: { navn: 'Pallplass', liter: 900, klima: 'tørt', tar: null, passer: ['tørt', 'vann'], tekst: 'Store mengder tørt og vann' },
    pallreol: { navn: 'Pallreol', liter: 3000, klima: 'tørt', tar: null, passer: ['tørt', 'vann'], tekst: 'Store mengder – paller i høyden' },
    kjøleskap: { navn: 'Kjøleskap', liter: 300, klima: 'kjøl', strøm: .15, tar: null, passer: ['kjøl'], tekst: 'Ferskvarer holder tre ganger så lenge (trenger strøm)' },
    kjølerom: { navn: 'Kjølerom', liter: 2500, klima: 'kjøl', strøm: 1, tar: null, passer: ['kjøl'], tekst: 'Mye ferskvare (trenger strøm)' },
    frysboks: { navn: 'Frysboks', liter: 250, klima: 'frys', strøm: .2, tar: { lag: ['frys', 'kjøl'] }, passer: ['frys'], tekst: 'Frysevarer og kjøtt (trenger strøm)' },
    medisinskap: { navn: 'Medisinskap', liter: 60, klima: 'tørt', låst: true, tar: { kat: ['medisin', 'hygiene'] }, passer: ['medisin'], tekst: 'Låst – medisin og hygiene' },
    verktøytavle: { navn: 'Verktøytavle', liter: 150, klima: 'tørt', tar: { kat: ['verktøy'] }, passer: ['verktøy'], tekst: 'Verktøy på knagger – alt på sin plass' },
    garderobe: { navn: 'Garderobeskap', liter: 400, klima: 'tørt', tar: { kat: ['klær'], lag: ['klær'] }, passer: ['klær'], tekst: 'Klær holder seg tørre' },
    kiste: { navn: 'Kiste', liter: 180, klima: 'tørt', tar: null, passer: ['tørt', 'klær'], tekst: 'Lukket kiste – tørt og klær' },
    tønne: { navn: 'Vanntønne', liter: 200, klima: 'tørt', tar: { lag: ['vann'] }, passer: ['vann'], tekst: 'Vann (flasker og dunker)' },
    // standardplassen i leirens egne bygg
    lagertelt: { navn: 'Lagerteltet', liter: 600, klima: 'tørt', tar: null, passer: ['tørt', 'vann', 'verktøy'], tekst: 'Kasser og hyller i teltet' },
    container: { navn: 'Containeren', liter: 1200, klima: 'tørt', tar: null, passer: ['tørt', 'vann', 'verktøy', 'klær'], tekst: 'Hyller i containeren' },
    brakkeskap: { navn: 'Skapene i brakka', liter: 150, klima: 'tørt', tar: null, passer: ['klær'], tekst: 'Klesskap ved køyene' },
    sykeskap: { navn: 'Medisinskapet i sykestua', liter: 120, klima: 'tørt', låst: true, tar: { kat: ['medisin', 'hygiene'] }, passer: ['medisin'], tekst: 'Låst – medisin og hygiene' },
    verkstedtavle: { navn: 'Verktøyveggen i verkstedet', liter: 300, klima: 'tørt', tar: { kat: ['verktøy', 'elektro'] }, passer: ['verktøy'], tekst: 'Verktøy og elektro' },
    kjøkkenkjøl: { navn: 'Kjølerommet på kjøkkenet', liter: 500, klima: 'kjøl', strøm: 0, tar: null, passer: ['kjøl'], tekst: 'Kjøl (når kjøkkenet har strøm)' },
    ute: { navn: 'Ute i leiren', liter: Infinity, klima: 'ute', tar: null, passer: [], tekst: 'Uten lagring – holder kortere' },
  };
  // leirens bygg (Leir.BYGG-typene) med standardplass
  const STANDARD = { lagertelt: 'lagertelt', container: 'container', brakke: 'brakkeskap', sykestue: 'sykeskap', verksted: 'verkstedtavle', kjøkken: 'kjøkkenkjøl' };

  const ny = () => ({ versjon: 1, neste: 1, s: [], åpnet: {}, doser: {}, moral: {}, tapt: {} });
  const r4 = v => Math.round(v * 1e4) / 1e4;
  const kl = g => (g.lag === 'kjøl' ? 'kjøl' : g.lag === 'frys' ? 'frys' : 'tørt');

  // ---------- plassene ----------
  // Gir [{ id, type, navn, liter, klima, strøm, låst, tar, passer, bygg }] – ferdige bygg med lagring + «ute» sist.
  // o.strøm(b) = har bygget strøm (ellers antas ja). o.ute: ta med «ute» (standard ja)
  function plasser(Leir, L, o = {}) {
    const ut = [];
    for (const b of (L && L.bygg) || []) {
      const B = Leir && Leir.BYGG ? Leir.BYGG[b.type] : null, type = (B && B.tingLager) || STANDARD[b.type]; if (!type || !LAGRING[type]) continue;
      const ferdig = Leir && Leir.ferdig ? Leir.ferdig(b) : !(b.igjen > 0); if (!ferdig) continue;
      const D = LAGRING[type], strøm = D.strøm !== undefined ? (o.strøm ? !!o.strøm(b) : true) : true;
      ut.push({ id: 'b' + b.id, type, navn: D.navn, liter: D.liter, klima: D.strøm !== undefined && !strøm ? 'tørt' : D.klima, strøm, kjøler: D.strøm !== undefined, låst: !!D.låst, tar: D.tar, passer: D.passer, bygg: b });
    }
    if (o.ute !== false) ut.push({ id: 'ute', type: 'ute', navn: LAGRING.ute.navn, liter: Infinity, klima: 'ute', strøm: true, låst: false, tar: null, passer: [], bygg: null });
    return ut;
  }
  const tar = (P, id) => { const g = TI[id]; if (!g) return false; if (!P.tar) return true; return (P.tar.lag || []).includes(g.lag) || (P.tar.kat || []).includes(g.kat); };
  const faktor = (P, id) => { const g = TI[id]; if (!g) return 1; return REGLER.faktor[kl(g)][P.klima] || 1; };
  // hvor lenge tingen tåler i alt (døgn i riktig lagring); Infinity = tåler alt (men fuktømfintlige ting tåler fuktHold ute)
  const grense = (id, P) => { const g = TI[id]; if (!g) return Infinity; if (g.hold > 0) return g.hold; return P && P.klima === 'ute' && REGLER.fukt[g.kat] ? REGLER.fuktHold : Infinity; };
  // eldes tingen på plassen? (det som tåler alt, eldes bare ute når det er fuktømfintlig)
  const eldes = (id, P) => { const g = TI[id]; if (!g) return false; return g.hold > 0 || (P.klima === 'ute' && !!REGLER.fukt[g.kat]); };
  const literAv = (id, n) => (TI[id] ? TI[id].vol * n : 0);
  const brukt = (T, pid) => T.s.reduce((s, q) => s + (q.p === pid ? literAv(q.t, q.n) : 0), 0);
  const ledig = (T, P) => (P.liter === Infinity ? Infinity : Math.max(0, P.liter - brukt(T, P.id)));
  // hvor godt plassen passer tingen: lavere er bedre. Den som eldes saktest først, så den som passer, så tørre plasser for tørre ting
  // (kjøleplassen spares til ferskvarene), skap for ett slag (medisinskap, verktøytavle, tønne) foran hyllene, og «ute» alltid sist.
  function rang(P, id) { const g = TI[id]; if (P.id === 'ute') return 1e9; const f = faktor(P, id), pass = P.passer.includes(g.lag) ? 0 : 1, spar = P.klima !== 'tørt' && kl(g) === 'tørt' ? 1 : 0;
    return f * 100 + pass * 10 + spar * 3 + (P.tar ? -5 : 0) + (P.låst && g.kat !== 'medisin' ? 2 : 0); }
  const beste = (Ps, id) => Ps.filter(P => tar(P, id)).sort((a, b) => rang(a, id) - rang(b, id) || (a.bygg && b.bygg ? a.bygg.id - b.bygg.id : 0));

  // ---------- legge inn og ta ut ----------
  // legger stabelen inn i T (slår sammen med en lik stabel med nesten samme alder)
  function leggStabel(T, t, n, a, p) { if (!(n > 0)) return null;
    const lik = T.s.find(q => q.t === t && q.p === p && Math.abs(q.a - a) <= REGLER.slåSammen);
    if (lik) { lik.a = r4((lik.a * lik.n + a * n) / (lik.n + n)); lik.n += n; return lik; }
    const s = { id: T.neste++, t, n, a: r4(a), p }; T.s.push(s); return s; }
  // n stk. av tingen t med alder a: på de beste plassene som har plass (o.plass = bare der; o.utenUte = ikke ute). Gir [{ p, n }]
  function legg(T, Ps, t, n, a = 0, o = {}) {
    n = Math.floor(n); const ut = []; if (!TI[t] || !(n > 0)) return ut; const v = TI[t].vol;
    const kand = o.plass ? Ps.filter(P => P.id === o.plass && tar(P, t)) : beste(Ps, t);
    for (const P of kand) { if (!(n > 0)) break; if (o.utenUte && P.id === 'ute') continue; const k = v > 0 ? Math.min(n, Math.floor((ledig(T, P) + 1e-9) / v)) : n; if (!(k > 0)) continue;
      leggStabel(T, t, k, a, P.id); ut.push({ p: P.id, n: k }); n -= k; }
    if (n > 0 && !o.plass && !o.utenUte) { leggStabel(T, t, n, a, 'ute'); ut.push({ p: 'ute', n }); }
    return ut;
  }
  // en liste [{ id, n }] (funn) – gir [{ id, n, p }]
  function leggListe(T, Ps, liste, a = 0) { const ut = []; for (const q of liste || []) for (const r of legg(T, Ps, q.id, q.n, a)) ut.push({ id: q.id, n: r.n, p: r.p }); return ut; }
  // tar n stk. ut av en stabel (helt når n mangler). Gir antallet
  function taStabel(T, sid, n) { const s = T.s.find(q => q.id === sid); if (!s) return 0; const k = Math.min(s.n, n == null ? s.n : Math.floor(n)); if (!(k > 0)) return 0;
    s.n -= k; if (!s.n) T.s = T.s.filter(q => q !== s); return k; }
  // tar n stk. av tingen t (den eldste først, eller o.fra = plass). Gir [{ n, a, p }]
  function ta(T, t, n, o = {}) { const ut = []; let igjen = Math.floor(n); const kand = T.s.filter(q => q.t === t && (!o.fra || q.p === o.fra)).sort((a, b) => b.a - a.a);
    for (const s of kand) { if (!(igjen > 0)) break; const k = Math.min(s.n, igjen); s.n -= k; igjen -= k; ut.push({ n: k, a: s.a, p: s.p }); }
    T.s = T.s.filter(q => q.n > 0); return ut; }
  const antall = (T, t) => T.s.reduce((s, q) => s + (q.t === t ? q.n : 0), 0);
  // flytt n stk. fra en stabel til en plass (må ta tingen og ha plass). Gir { ok, n } eller { feil }
  function flytt(T, Ps, sid, n, til) {
    const s = T.s.find(q => q.id === sid); if (!s) return { feil: 'Fant ikke tingene.' }; const P = Ps.find(q => q.id === til); if (!P) return { feil: 'Fant ikke plassen.' };
    if (P.id === s.p) return { feil: 'Tingene står alt der.' }; if (!tar(P, s.t)) return { feil: `${P.navn} tar ikke ${Ting.tittel(s.t).toLowerCase()}.` };
    const v = TI[s.t].vol, k = Math.min(s.n, n == null ? s.n : Math.floor(n), v > 0 ? Math.floor((ledig(T, P) + 1e-9) / v) : s.n); if (!(k > 0)) return { feil: `${P.navn} er full.` };
    const a = s.a; taStabel(T, sid, k); leggStabel(T, s.t, k, a, P.id); return { ok: true, n: k };
  }

  // ---------- avstemming og rydding ----------
  // stabler på en plass som er borte (bygget revet eller ikke ferdig) eller som er for full (skadet), flyttes til de beste andre plassene
  function avstem(T, Ps) { const Pm = new Map(Ps.map(P => [P.id, P])); let flyttet = 0;
    for (const s of T.s.slice()) { const P = Pm.get(s.p); if (P && tar(P, s.t)) continue; const n = s.n, a = s.a, t = s.t; taStabel(T, s.id); legg(T, Ps.filter(q => q.id !== s.p), t, n, a); flyttet++; }
    for (const P of Ps) { if (P.liter === Infinity) continue; let over = brukt(T, P.id) - P.liter; if (over <= 1e-9) continue;
      for (const s of T.s.filter(q => q.p === P.id).sort((a, b) => b.id - a.id)) { if (over <= 1e-9) break; const v = TI[s.t].vol, k = Math.min(s.n, Math.ceil(over / Math.max(1e-6, v)));
        taStabel(T, s.id, k); leggStabel(T, s.t, k, s.a, 'ute'); over -= k * v; flyttet++; } }
    return flyttet; }
  // folkene rydder: høyst n stabler fra ute (eller en dårligere plass) inn der de holder lenger. Gir antallet stabler flyttet.
  function rydd(T, Ps, n = 4) { let flyttet = 0; const Pm = new Map(Ps.map(P => [P.id, P]));
    for (const s of T.s.slice().sort((a, b) => (a.p === 'ute' ? 0 : 1) - (b.p === 'ute' ? 0 : 1))) { if (flyttet >= n) break; const nå = Pm.get(s.p) || Pm.get('ute');
      const P = beste(Ps, s.t).find(q => q.id !== s.p && q.id !== 'ute' && rang(q, s.t) < rang(nå, s.t) && ledig(T, q) >= TI[s.t].vol - 1e-9); if (!P) continue;
      if (flytt(T, Ps, s.id, s.n, P.id).ok) flyttet++; }
    return flyttet; }

  // ---------- holdbarhet ----------
  // døgn igjen før stabelen råtner (Infinity når den tåler alt der den står)
  function igjen(s, P) { if (!eldes(s.t, P)) return Infinity; return (grense(s.t, P) - s.a) / faktor(P, s.t); }
  const snart = (s, P) => { const r = igjen(s, P), g = grense(s.t, P); return Number.isFinite(r) && r > 0 && (r < Ting.REGLER.snart || r * faktor(P, s.t) < g * Ting.REGLER.snartAndel); };
  // dt i spillminutter: alt eldes; det som har passert grensen, kastes. Gir [{ t, n, p }] som råtnet/ble ødelagt
  function eld(T, Ps, dt) { const Pm = new Map(Ps.map(P => [P.id, P])), ute = Pm.get('ute') || { id: 'ute', klima: 'ute' }, borte = [], d = dt / 1440;
    for (const s of T.s) { const P = Pm.get(s.p) || ute; if (!eldes(s.t, P)) continue; s.a = r4(s.a + d * faktor(P, s.t));
      if (s.a >= grense(s.t, P)) { borte.push({ t: s.t, n: s.n, p: s.p }); T.tapt[s.t] = (T.tapt[s.t] || 0) + s.n; s.n = 0; } }
    T.s = T.s.filter(q => q.n > 0); return borte; }

  // ---------- bruk ----------
  // rekkefølgen tingene brukes i: det som går ut først; det som tåler alt sist
  const iRekke = (T, Ps, filter) => { const Pm = new Map(Ps.map(P => [P.id, P])), ute = Pm.get('ute') || { id: 'ute', klima: 'ute' };
    return T.s.filter(filter).map(s => [s, igjen(s, Pm.get(s.p) || ute)]).sort((a, b) => a[1] - b[1] || b[0].a - a[0].a).map(x => x[0]); };
  // spis: folkene trenger `rasjoner`; tingene med rasjonsverdi åpnes etter tur (det som går ut først). Mat som også gir moral (sjokolade)
  // spares til sist. Gir { spist (rasjoner), åpnet: [{ t, n }] }
  function spis(T, Ps, rasjoner) {
    let rest = T.åpnet.mat || 0; const åpnet = new Map();
    if (rest < rasjoner) for (const s of iRekke(T, Ps, q => TI[q.t] && TI[q.t].r > 0).sort((a, b) => (TI[a.t].m ? 1 : 0) - (TI[b.t].m ? 1 : 0))) {
      while (s.n > 0 && rest < rasjoner) { s.n--; rest += TI[s.t].r; åpnet.set(s.t, (åpnet.get(s.t) || 0) + 1); } if (rest >= rasjoner) break; }
    T.s = T.s.filter(q => q.n > 0); const spist = Math.min(rest, rasjoner); T.åpnet.mat = r4(rest - spist);
    return { spist: r4(spist), åpnet: [...åpnet].map(([t, n]) => ({ t, n })) };
  }
  const matIAlt = T => r4(T.s.reduce((s, q) => s + (TI[q.t] && TI[q.t].r > 0 ? TI[q.t].r * q.n : 0), 0) + (T.åpnet.mat || 0));
  // medisin: syke = antall syke, dt i spillminutter. Den sterkeste medisinen brukes (én dose per syk per døgn).
  // Gir { f: helingsfaktoren (andel raskere), dekning 0–1, id }
  function medisin(T, Ps, syke, dt) {
    if (!(syke > 0)) return { f: 0, dekning: 0, id: null };
    const kand = T.s.filter(q => TI[q.t] && TI[q.t].h).map(q => q.t).concat(Object.keys(T.doser).filter(t => T.doser[t] > 1e-9));
    if (!kand.length) return { f: 0, dekning: 0, id: null };
    const id = kand.sort((a, b) => TI[b].h.f - TI[a].h.f)[0], g = TI[id], trengs = syke * REGLER.dosePerDøgn * dt / 1440;
    let har = T.doser[id] || 0; while (har < trengs) { const s = iRekke(T, Ps, q => q.t === id)[0]; if (!s) break; s.n--; har += g.h.doser; T.s = T.s.filter(q => q.n > 0); }
    const gitt = Math.min(har, trengs); T.doser[id] = r4(har - gitt); if (!(T.doser[id] > 1e-9)) delete T.doser[id];
    return { f: Math.min(Ting.REGLER.helingMaks, g.h.f), dekning: trengs > 0 ? gitt / trengs : 0, id };
  }
  // moral: n personer, dt spillminutter. Brukes opp: én porsjon per gruppe (kaffe, søtt, tobakk …) per person per døgn – gruppen gir sitt
  // beste p når alle får. Varig: p × andelen som dekkes (en kortstokk holder til seks). Radioen og lommelykta trenger batterier.
  // Gir { sum, grupper: { gruppe: { p, dekning, id } }, varig: { id: { p, dekning } } } (lagres i T.moral)
  function moral(T, Ps, n, dt) {
    const ut = { sum: 0, grupper: {}, varig: {} }; if (!(n > 0)) { T.moral = ut; return ut; }
    const trengs = n * REGLER.porsjonPerDøgn * dt / 1440, grupper = {};
    for (const s of T.s) { const g = TI[s.t]; if (g && g.m) (grupper[g.m.gruppe] = grupper[g.m.gruppe] || new Set()).add(s.t); }
    for (const t of Object.keys(T.åpnet)) if (t !== 'mat' && TI[t] && TI[t].m && T.åpnet[t] > 1e-9) (grupper[TI[t].m.gruppe] = grupper[TI[t].m.gruppe] || new Set()).add(t);
    for (const [gr, ider] of Object.entries(grupper)) {
      const L = [...ider].sort((a, b) => TI[b].m.p - TI[a].m.p); let igjen = trengs, best = 0, bestId = null;
      for (const t of L) { let har = T.åpnet[t] || 0; while (har < igjen) { const s = iRekke(T, Ps, q => q.t === t)[0]; if (!s) break; s.n--; har += TI[t].m.porsjoner; T.s = T.s.filter(q => q.n > 0); }
        const k = Math.min(har, igjen); if (k > 0 && !bestId) { best = TI[t].m.p; bestId = t; } igjen -= k; T.åpnet[t] = r4(har - k); if (!(T.åpnet[t] > 1e-9)) delete T.åpnet[t]; if (igjen <= 1e-12) break; }
      const dekning = trengs > 0 ? Math.max(0, Math.min(1, 1 - igjen / trengs)) : 0; ut.grupper[gr] = { p: best, dekning, id: bestId }; ut.sum += best * dekning;
    }
    for (const t of new Set(T.s.map(q => q.t))) { const g = TI[t]; if (!g || !g.M) continue; const har = antall(T, t);
      if (g.krever) { const k = g.krever.ting, bruk = g.krever.perDøgn * har * dt / 1440; let r = T.åpnet[k] || 0;
        while (r < bruk) { const s = iRekke(T, Ps, q => q.t === k)[0]; if (!s) break; s.n--; r += 1; T.s = T.s.filter(q => q.n > 0); }
        if (r + 1e-12 < bruk && !(antall(T, k) > 0)) { T.åpnet[k] = 0; delete T.åpnet[k]; ut.varig[t] = { p: g.M.p, dekning: 0, mangler: k }; continue; }
        T.åpnet[k] = r4(Math.max(0, r - bruk)); if (!(T.åpnet[k] > 1e-9)) delete T.åpnet[k]; }
      const dekning = Math.min(1, har * g.M.dekker / n); ut.varig[t] = { p: g.M.p, dekning }; ut.sum += g.M.p * dekning; }
    ut.sum = r4(Math.min(Ting.REGLER.moralMaks, ut.sum)); T.moral = ut; return ut;
  }
  // tempo for en oppgave med `arbeidere` folk: andelen raskere (0–tempoMaks). Gir { f, ting: [id] }
  function tempo(T, oppgave, arbeidere) { if (!(arbeidere > 0)) return { f: 0, ting: [] }; let f = 0; const brukt = [];
    for (const t of new Set(T.s.map(q => q.t))) { const g = TI[t]; if (!g || !g.t || g.t.oppgave !== oppgave) continue; if (g.krever && !(antall(T, g.krever.ting) > 0)) continue;
      f += g.t.andel * Math.min(1, antall(T, t) * g.t.dekker / arbeidere); brukt.push(t); }
    return { f: r4(Math.min(Ting.REGLER.tempoMaks, f)), ting: brukt }; }

  // ---------- oversikt ----------
  // per kategori: [{ kat, navn, ting: [{ id, n, plasser: [{ p, navn, n, igjen }], igjen (kortest), snart }] }]; søk = tekst i navnet
  function oversikt(T, Ps, søk) {
    const Pm = new Map(Ps.map(P => [P.id, P])), ute = Pm.get('ute') || { id: 'ute', navn: LAGRING.ute.navn, klima: 'ute' }, s0 = (søk || '').trim().toLowerCase(), per = {};
    for (const s of T.s) { const g = TI[s.t]; if (!g) continue; if (s0 && !(g.navn.toLowerCase().includes(s0) || (g.flertall || '').toLowerCase().includes(s0) || (Ting.KATEGORIER[g.kat].navn.toLowerCase().includes(s0)))) continue;
      const P = Pm.get(s.p) || ute, r = igjen(s, P), k = per[g.kat] || (per[g.kat] = new Map()), o = k.get(s.t) || { id: s.t, n: 0, plasser: [], igjen: Infinity, snart: false };
      o.n += s.n; o.plasser.push({ p: s.p, navn: P.navn, n: s.n, igjen: r, stabel: s.id }); o.igjen = Math.min(o.igjen, r); o.snart = o.snart || snart(s, P); k.set(s.t, o); }
    return Ting.KAT_REKKE.filter(k => per[k]).map(k => ({ kat: k, navn: Ting.KATEGORIER[k].navn, ting: [...per[k].values()].sort((a, b) => Ting.TING[a.id].navn.localeCompare(Ting.TING[b.id].navn, 'nb')) }));
  }
  // det som snart går ut på dato: [{ id, n, p, navn, igjen }] sortert
  function snartUt(T, Ps, maks = 8) { const Pm = new Map(Ps.map(P => [P.id, P])), ute = Pm.get('ute') || { id: 'ute', navn: LAGRING.ute.navn, klima: 'ute' };
    return T.s.map(s => { const P = Pm.get(s.p) || ute; return { s, P, r: igjen(s, P) }; }).filter(x => snart(x.s, x.P)).sort((a, b) => a.r - b.r).slice(0, maks)
      .map(x => ({ id: x.s.t, n: x.s.n, p: x.s.p, navn: x.P.navn, igjen: x.r, stabel: x.s.id })); }
  // det som står på én plass: [{ stabel, id, n, igjen, snart }]
  function påPlass(T, Ps, pid) { const P = Ps.find(q => q.id === pid) || { id: pid, klima: 'ute', navn: '' }; return T.s.filter(s => s.p === pid).map(s => ({ stabel: s.id, id: s.t, n: s.n, igjen: igjen(s, P), snart: snart(s, P) }))
    .sort((a, b) => Ting.KAT_REKKE.indexOf(TI[a.id].kat) - Ting.KAT_REKKE.indexOf(TI[b.id].kat) || TI[a.id].navn.localeCompare(TI[b.id].navn, 'nb')); }
  const verdi = T => T.s.reduce((s, q) => s + Ting.verdi(q.t, q.n), 0);
  const igjenTekst = r => (!Number.isFinite(r) ? 'holder' : r < 1 ? 'under ett døgn igjen' : r < 60 ? `${Math.round(r)} døgn igjen` : r < 730 ? `${Math.round(r / 30)} mnd. igjen` : `${Math.round(r / 365)} år igjen`);

  // ---------- lagring ----------
  function tilJSON(T) { return { versjon: 1, neste: T.neste, s: T.s.map(q => [q.id, q.t, q.n, q.a, q.p]), åpnet: T.åpnet, doser: T.doser, tapt: T.tapt }; }
  function fraJSON(d) { const T = ny(); if (!d || typeof d !== 'object') return T; T.neste = Number.isInteger(d.neste) && d.neste > 0 ? d.neste : 1;
    if (Array.isArray(d.s)) for (const a of d.s) { if (!Array.isArray(a) || !TI[a[1]] || !(a[2] > 0)) continue; const s = { id: +a[0] || T.neste, t: a[1], n: Math.floor(a[2]), a: +a[3] || 0, p: typeof a[4] === 'string' ? a[4] : 'ute' };
      T.s.push(s); T.neste = Math.max(T.neste, s.id + 1); }
    for (const k of ['åpnet', 'doser', 'tapt']) if (d[k] && typeof d[k] === 'object') for (const [t, v] of Object.entries(d[k])) if ((t === 'mat' || TI[t]) && +v > 0) T[k][t] = +v;
    return T; }

  const api = { REGLER, LAGRING, STANDARD, ny, plasser, tar, faktor, grense, eldes, ledig, brukt, rang, beste, legg, leggListe, leggStabel, taStabel, ta, antall, flytt, avstem, rydd,
    igjen, snart, eld, spis, matIAlt, medisin, moral, tempo, oversikt, snartUt, påPlass, verdi, igjenTekst, tilJSON, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Tinglager = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
