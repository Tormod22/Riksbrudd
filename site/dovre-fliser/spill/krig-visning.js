'use strict';
/* Riksbrudd – KRIG i spillet (nattarbeidet 18. nov; reglene i spill/krig.js, tallene er Claudes forslag). window.KrigSpill.
 * A. Flanke og rygg (laget snur seg mot den som skyter), dekning bak hus, sårede som bæres og stelles ved leiren, overgivelse og
 *    fanger, fiendens førere med væremåte, røvere som varierer, og hva laget gjorde av seg selv (i lagpanelet).
 * B. Etterretning (avhør, radiosamband, det lagene og dronene ser), natt og nattsikt, artilleri kalt inn fra et lag, røyk, lys og
 *    støy, bakhold på veg, beleiring, våpenhvile, bygdevern i tettsteder ingen eier, og helikopterfrakt av lag.
 * I TESTENE (navigator.webdriver) er de nye stridsfaktorene og alt som skjer av seg selv, slått av til KrigSpill.test = true.
 * Det spilleren selv setter i gang (røyk, bakhold, våpenhvile, helikopter, artilleri), virker alltid.
 */
(function () {
  const K = window.Krig; if (!K || typeof KROKER === 'undefined') return;
  const R = K.REGLER, rng = Terreng.frø(181126), api = { test: false };
  const auto = () => !navigator.webdriver || api.test === true; api.auto = auto;
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand(), leir = () => { const s = spill(); return s && s.leir ? s.leir : null; };
  const avst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), erLag = s => !!s && Array.isArray(s.menn);
  const egne = () => ENHETER.filter(s => s.side === 'blå' && levende(s) && !s.karakter && !s.iLufta);
  const fiender = () => ENHETER.filter(s => s.side !== 'blå' && erLag(s) && levende(s));
  const friske = s => s.menn.filter(m => m.hp >= 1).length, ilive = s => s.menn.filter(m => m.hp > 0).length;
  const kr = v => (v >= 1e6 ? nf.format(Math.round(v / 1e5) / 10) + ' mill. kr' : nf.format(Math.round(v)) + ' kr');
  const kl = t => { const m = Math.floor(360 + t) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const fnavn = side => (window.Fraksjoner && Fraksjoner.FRAKSJONER[side] ? Fraksjoner.FRAKSJONER[side].navn : side === 'rød' ? 'Røverne' : side);
  const byer = () => (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [];
  const eier = by => (window.Garnison && window.TETTSTEDER ? Garnison.tilstand(TETTSTEDER, by.e.id).eier : null);
  const midt = by => ({ x: (by.bb[0] + by.bb[2]) / 2, y: (by.bb[1] + by.bb[3]) / 2 });
  // fiendens fører: navnet på den som leder laget, og væremåten som følger navnet
  const fører = s => (s.menn[s.leder] || s.menn[0] || { navn: '?' }).navn, vm = s => K.væremåte(fører(s));
  const harVm = s => erLag(s) && s.side !== 'blå' && !s.raid && !s.post;

  // ---------- tilstanden (lagres per leir i «riksbrudd-krig») ----------
  const NØKKEL = 'riksbrudd-krig', ny = () => ({ fanger: [], etter: [], fred: {}, fredN: {}, brudd: {}, vern: {}, beleiring: {}, raid: {}, tatt: [], forslag: null });
  let T = ny(), klar = false; const RØYK = [], LYS = []; let HELI = null, modus = null, natt0 = 0;
  const leirId = () => { const L = leir(); return L ? Math.round(L.x) + ',' + Math.round(L.y) : null; };
  // (runde 4) lagres også: røyk og lys som brenner, helikopteret i lufta og kjøreordre for egne kjøretøy (målet; ruta legges på nytt)
  const r1 = v => Math.round(v * 10) / 10;
  function kjøreordre() { const ut = [];
    for (const k of window.KJORETOY || []) { if (k.side !== 'blå' || k.oppdrag || !k.sti || !Array.isArray(k.sti.P) || k.sti.P.length < 4 || k.framme) continue; const P = k.sti.P; ut.push({ navn: k.navn, mål: [r1(P[P.length - 2]), r1(P[P.length - 1])] }); }
    return ut; }
  function lagre() { if (!klar || !leirId()) return;
    try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId(), ...T, røyk: RØYK.map(q => ({ x: r1(q.x), y: r1(q.y), til: q.til })), lys: LYS.map(q => ({ x: r1(q.x), y: r1(q.y), til: q.til })),
      heli: HELI ? { lag: HELI.lag && HELI.lag.navn, fase: HELI.fase, x: r1(HELI.x), y: r1(HELI.y), mål: HELI.mål.map(r1), retning: +(HELI.retning || 0).toFixed(3), fra: HELI.fra ? HELI.fra.map(r1) : null } : null, kjør: kjøreordre(),
      fiende: fiendePakk() })); } catch (e) { /* fullt lager */ } }
  // ---------- FIENDEN MELLOM ØKTENE (runde 5, 19. nov) ----------
  // spill/lagring.js lagrer fiendens lag (sted, helse, hva de holdt på med), minnet (AI.minne) og stillingene (med «kjent»), og målet
  // for marsjen – men bare dine egne marsjer ble satt i gang igjen. Her i tillegg: der du sist så hvert fiendelag («sist sett» i kartet),
  // fiendens lastebiler (sted, skade, hvor de kjørte og hvem som satt på), og fiendens marsjer settes i gang igjen mot målet de hadde.
  function fiendePakk() {
    const sett = {}; for (const e of ENHETER) if (e.side !== 'blå' && e.sett && tallOk(e.sett.x) && tallOk(e.sett.y)) sett[e.navn] = { x: r1(e.sett.x), y: r1(e.sett.y), tid: r1(+e.sett.tid || 0) };
    const biler = []; if (window.AI && AI.biler) for (const side of Object.keys(AI.biler)) { const k = AI.biler[side]; if (!k) continue; const P = k.sti && Array.isArray(k.sti.P) && k.sti.P.length >= 4 ? k.sti.P : null;
      biler.push({ side, navn: k.navn, borte: !(window.KJORETOY || []).includes(k), x: r1(k.x), y: r1(k.y), retning: +(+k.retning || 0).toFixed(3), antall: k.antall, skade: +(+(k.skade || 0)).toFixed(3),
        mål: P ? [r1(P[P.length - 2]), r1(P[P.length - 1])] : null, ombord: ENHETER.filter(e => e.ombord === k).map(e => e.navn) }); }
    return { sett, biler }; }
  let fiendeVenter = null; api.fiendePakk = () => fiendePakk(); api.fiendeBruk = f => fiendeBruk(f);
  // Legger det lagrede inn igjen. Kalles 2 s etter lesingen og på nytt etter AI.flytt (som flytter motstanderne og bilene til leiren).
  // Uten vegnett kan ikke kjøreturen legges på nytt: da går de om bord av der lastebilen står, og AI-en tenker på nytt.
  async function fiendeBruk(f) {
    if (!f || typeof f !== 'object') return null; const ut = { sett: 0, biler: 0, kjører: 0 };
    for (const e of ENHETER) { const q = f.sett && f.sett[e.navn]; if (e.side === 'blå' || !q || !tallOk(q.x) || !tallOk(q.y)) continue; e.sett = { x: q.x, y: q.y, tid: tallOk(q.tid) ? q.tid : tid }; ut.sett++; }
    for (const b of Array.isArray(f.biler) ? f.biler : []) { const k = window.AI && AI.biler && AI.biler[b.side]; if (!k || k.navn !== b.navn || !tallOk(b.x) || !tallOk(b.y)) continue; ut.biler++;
      const KJ = window.KJORETOY || [];
      if (b.borte) { const i = KJ.indexOf(k); if (i >= 0) KJ.splice(i, 1); for (const e of ENHETER) if (e.ombord === k) e.ombord = null; continue; }
      if (window.Kjoretoy && k.sti) Kjoretoy.stopp(k); k.x = b.x; k.y = b.y; k.retning = tallOk(b.retning) ? b.retning : k.retning; if (b.antall >= 1) k.antall = Math.min(40, Math.round(b.antall)); k.skade = tallOk(b.skade) ? b.skade : 0;
      const lag = (Array.isArray(b.ombord) ? b.ombord : []).map(n => ENHETER.find(e => e.navn === n && e.side === b.side && levende(e))).filter(Boolean);
      let g = window.VEGNETT || null;
      if (!g && b.mål && lag.length && window.lastVegnett && (window.VEG_TLF ? VEG_TLF.kan() || (innerWidth >= 900 && !navigator.webdriver) : !navigator.webdriver)) { try { g = await lastVegnett(); } catch (e) { g = null; } }
      let kjører = false;
      if (g && b.mål && tallOk(b.mål[0]) && tallOk(b.mål[1]) && lag.length) { let r = null; try { r = Kjoretoy.planlegg(k, g, b.mål); } catch (e) { r = null; } kjører = !!(r && !r.feil); }
      for (const e of lag) { e.ombord = kjører ? k : null; e.x = k.x + (kjører ? 0 : 6); e.y = k.y + (kjører ? 0 : 4); e.sti = null; e.siktSkitten = true; delete e.målLagret; if (e.ai) { e.ai.mål = kjører ? b.mål.slice() : null; e.ai.neste = kjører ? 60 : 0; } }
      if (kjører) ut.kjører++; }
    skitten = true; return ut; }
  // fiendens marsjer som var i gang (målet er lagret av spill/lagring.js i s.målLagret): planlegg ruta på nytt, høyst én gang i sekundet
  // (runde 5) lagres også når siden skjules – pagehide kommer ikke alltid på telefon (spill/lagring.js gjør det samme); ellers hvert 10. s (simuleringen)
  let fiendeSjekk = 0;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lagre(); });
  KROKER.sim.push(() => { const nå = performance.now(); if (nå - fiendeSjekk < 1000) return; fiendeSjekk = nå;
    for (const e of ENHETER) { if (e.side === 'blå' || !e.målLagret || e.planlegger || e.ombord) continue; const m = e.målLagret; delete e.målLagret;
      if (!levende(e) || !tallOk(m[0]) || !tallOk(m[1]) || Math.hypot(m[0] - e.x, m[1] - e.y) <= 30) continue;
      if (e.ai) e.ai.mål = [m[0], m[1]]; ordre(e, m[0], m[1], true).catch(() => {}); } });
  if (window.AI && AI.flytt) { const flytt0 = AI.flytt; AI.flytt = async function (...a) { const r = await flytt0.apply(this, a); if (fiendeVenter) { try { await fiendeBruk(fiendeVenter); } catch (e) { console.error(e); } } return r; }; }
  const tallOk = v => typeof v === 'number' && Number.isFinite(v), punktOk = q => q && tallOk(q.x) && tallOk(q.y) && tallOk(q.til);
  api.gjenopprettet = null;
  function les() { T = ny(); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (!d || d.leir !== leirId()) d = null; else for (const k of Object.keys(T)) if (d[k] && typeof d[k] === 'object') T[k] = d[k]; } catch (e) { T = ny(); d = null; } fredTilAI();
    RØYK.length = 0; LYS.length = 0; HELI = null; api.gjenopprettet = null; fiendeVenter = null; if (!d) return;
    fiendeVenter = d.fiende && typeof d.fiende === 'object' ? d.fiende : null;
    // røyk og lys: tiden (tid) er lagret av spill/lagring.js, så «til» gjelder fortsatt
    for (const q of Array.isArray(d.røyk) ? d.røyk : []) if (punktOk(q)) RØYK.push({ x: q.x, y: q.y, til: q.til });
    for (const q of Array.isArray(d.lys) ? d.lys : []) if (punktOk(q)) LYS.push({ x: q.x, y: q.y, til: q.til });
    const G = api.gjenopprettet = { røyk: RØYK.length, lys: LYS.length, heli: null, kjør: [] };
    // helikopteret og kjøreordrene settes inn når lagene og kjøretøyene er lest inn (spill/lagring.js), og vegnettet kan hentes
    setTimeout(() => {
      const h = d.heli, L = leir(); if (h && L && tallOk(h.x) && tallOk(h.y) && Array.isArray(h.mål) && h.mål.length === 2 && ['ut', 'hjem', 'frakt', 'retur'].includes(h.fase)) {
        const s = h.lag ? egne().concat(ENHETER.filter(e => e.side === 'blå' && e.iLufta)).find(e => e.navn === h.lag) : null;
        HELI = { lag: s || null, fase: s || h.fase === 'retur' ? h.fase : 'retur', x: h.x, y: h.y, mål: s || h.fase === 'retur' ? h.mål.slice() : [L.x, L.y], retning: tallOk(h.retning) ? h.retning : 0,
          fra: Array.isArray(h.fra) && tallOk(h.fra[0]) && tallOk(h.fra[1]) ? h.fra.slice() : null };
        if (s && (HELI.fase === 'hjem' || HELI.fase === 'frakt')) { s.iLufta = true; s.sti = null; s.x = HELI.x; s.y = HELI.y; }
        G.heli = HELI.fase; skitten = true; }
      if (fiendeVenter) fiendeBruk(fiendeVenter).then(f => { G.fiende = f; }).catch(e => console.error(e));
      for (const q of Array.isArray(d.kjør) ? d.kjør : []) { const k = (window.KJORETOY || []).find(e => e.side === 'blå' && e.navn === q.navn);
        if (!k || k.sti || k.oppdrag || !Array.isArray(q.mål) || !tallOk(q.mål[0]) || !tallOk(q.mål[1]) || typeof window.kjørTil !== 'function') continue;
        G.kjør.push(k.navn); window.kjørTil(k, q.mål[0], q.mål[1]); }
      if (G.heli || G.kjør.length || G.røyk || G.lys) logg(`Fortsetter der dere slapp: ${[G.heli ? 'helikopteret er i lufta' : '', G.kjør.length ? `${G.kjør.length} ${G.kjør.length === 1 ? 'kjøretøy kjører' : 'kjøretøy kjører'} videre` : '', G.røyk ? 'røyken ligger fortsatt' : '', G.lys ? 'lysraketten brenner' : ''].filter(Boolean).join(', ')}.`);
    }, 2000); }
  function fredTilAI() { if (window.AI && AI.fred) for (const side of Object.keys(AI.fred)) delete AI.fred[side]; if (window.AI && AI.fred) Object.assign(AI.fred, T.fred); }
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { les(); klar = true; }, 0));
  window.addEventListener('pagehide', lagre);

  // ---------- kroker i ildkampen ----------
  KROKER.ild.push((a, b) => {
    if (!a || !b) return 1;
    if (a.iLufta || b.iLufta) return 0;
    if (a.side !== b.side && window.AI && AI.hvile && AI.hvile(a.side, b.side)) return 0;
    if (!erLag(b)) return 1;
    let f = K.røykFaktor(a, b, RØYK, tid);
    if (!auto()) return f;
    if (erLag(a)) {
      const fl = K.flanke(b.retning, b.x, b.y, a.x, a.y, b.nedgravd); let ff = fl.f;
      if (ff > 1 && harVm(a) && vm(a).flanke) ff = 1 + (ff - 1) * vm(a).flanke;
      f *= ff; b.krigFra = { v: Math.atan2(a.y - b.y, a.x - b.x), t: tid, hva: fl.hva };
      if (harVm(a)) f *= vm(a).ild;
      if (a.krigSvekket) f *= R.beleiring.ild;
    }
    if (harVm(b)) f *= vm(b).tar;
    // dekning bak hus i kartet, eller (runde 4) bak leirens egne bygg – den beste av dem gjelder
    let hv = K.husVern(b.her && b.her.k, !!b.sti, b.vedHus);
    if (b.side === 'blå' && !b.sti && !b.ombord && Number.isFinite(a.x)) { const lv = K.leirVern(b, a, leirBygg(b)); if (lv.f < 1) { b.krigLeirDekning = { navn: lv.navn, t: tid }; hv = Math.min(hv, lv.f); } }
    f *= hv;
    return f;
  });
  // (runde 4) leirens ferdige bygg som gir dekning: hjørnene, dekningen og navnet. Regnes på nytt hvert spillminutt.
  let leirB = [], leirBt = null;
  function leirBygg(b) {
    const L = leir(); if (!L || !window.Leir || !window.LeirSpill) return [];
    if (b && Math.hypot(b.x - L.x, b.y - L.y) > 1500) return [];
    const LS = LeirSpill.tilstand(), t = Math.floor(tid) + ':' + (LS ? LS.bygg.length : 0); if (t === leirBt) return leirB; leirBt = t;
    leirB = !LS ? [] : LS.bygg.filter(q => Leir.ferdig(q) && q.hp > 0 && Leir.BYGG[q.type] && !Leir.BYGG[q.type].linje && K.byggDekning(q.type) < 1)
      .map(q => ({ P: Leir.hjørner(q), tar: K.byggDekning(q.type), navn: Leir.BYGG[q.type].navn }));
    return leirB;
  }
  (KROKER.fart = KROKER.fart || []).push(s => (auto() && erLag(s) ? K.sårFart(s.menn) * (s.fanger ? R.overgi.fangeFart : 1) : 1));
  KROKER.sikt.push(s => (auto() ? K.nattSikt(K.klokkeTime(tid), !!((s.utstyr && s.utstyr.nattsikt) || s.nattsikt), K.iLys(s, LYS, tid)) : 1));
  KROKER.kanOrdre.push(s => !s.iLufta);

  // viktige hendelser stopper spolingen (spill/flyt.js, docs/natt/spillform.md)
  const hend = (type, tekst) => { try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type, tekst } })); } catch (e) { /* eldre nettlesere */ } };
  // ---------- overgivelse og fanger ----------
  function overgi(e, til, grunn) {
    const n = ilive(e); if (!til) til = egne().sort((a, b) => avst(a, e) - avst(b, e))[0];
    if (til && n) til.fanger = { n: ((til.fanger && til.fanger.n) || 0) + n, side: e.side };
    window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'fanger', tekst: e.navn + ' gir seg' } })); 
    logg(`${e.navn} gir seg${grunn ? ': ' + grunn : ''}. ${til && n ? `${til.navn} tar ${n} ${n === 1 ? 'fange' : 'fanger'} – ta dem med til leiren.` : ''}`);
    const i = ENHETER.indexOf(e); e.ombord = null; e.sti = null; e.overgitt = true;
    // de fire første lagene har faste plasser i lista (patruljen er nr. 4): de blir stående som tomme lag
    if (i > 3) ENHETER.splice(i, 1); else for (const m of e.menn) m.hp = 0;
    if (valgt === e && window.lukkPanel) lukkPanel(); else if (valgt === til) visPanel();
    skitten = true; lagre(); return n;
  }
  api.overgi = overgi;
  function overgivelser() {
    const E = egne(); if (!E.length) return;
    for (const e of fiender()) { if (e.iLufta || (window.AI && AI.hvile && AI.hvile('blå', e.side))) continue; const nær = E.filter(s => avst(s, e) <= R.overgi.omringet); if (!nær.length) continue;
      const d = nær.reduce((v, s) => Math.min(v, avst(s, e)), Infinity), st = s => (window.Fraksjoner ? Fraksjoner.styrke(s, window.Forsyning ? Forsyning.ammo(s) : 1) : friske(s));
      const g = K.girSeg({ ute: Terreng.uteAvKamp(e.menn), nær: d, omringet: K.omringet(e, nær), forhold: st(e) / Math.max(.1, nær.reduce((v, s) => v + st(s), 0)), seig: harVm(e) && vm(e).seig });
      if (g) overgi(e, nær.sort((a, b) => avst(a, e) - avst(b, e))[0], g); }
  }
  function leverFanger(L) {
    for (const s of egne()) { if (!s.fanger || Math.hypot(s.x - L.x, s.y - L.y) > R.overgi.avstandLeir) continue;
      T.fanger.push({ side: s.fanger.side, n: s.fanger.n, t: tid }); logg(`${s.navn} har levert ${s.fanger.n} ${s.fanger.n === 1 ? 'fange' : 'fanger'} i leiren. Avhør dem under Leir → Mål.`); delete s.fanger; lagre(); if (valgt === s) visPanel(); }
  }
  // avhør: tar tid; så vet du hvor fraksjonens lag står og hva de vil
  api.avhør = i => { const f = T.fanger[i]; if (!f || f.avhørt || f.til) return false; f.til = tid + R.etterretning.avhør; logg(`Avhøret av fangene fra ${fnavn(f.side)} er i gang (${R.etterretning.avhør} min).`); lagre(); return true; };
  api.settFri = i => { const f = T.fanger[i]; if (!f) return false; T.fanger.splice(i, 1); if (T.brudd[f.side] > 0) T.brudd[f.side]--; else if (T.fredN[f.side] > 0) T.fredN[f.side]--;
    logg(`Fangene fra ${fnavn(f.side)} er satt fri. Det blir husket – en avtale med dem blir billigere.`); lagre(); return true; };
  // ---------- (runde 4) fanger: bytte, arbeid og rekruttering ----------
  const folk = () => (window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null);
  const lagreLeir = () => { if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (window.FolkSpill && FolkSpill.vis) { try { FolkSpill.vis(); } catch (e) { /* panelet er lukket */ } } };
  const fangeTekst = n => `${n} ${n === 1 ? 'fange' : 'fanger'}`;
  const egneTatt = side => T.tatt.filter(q => q.side === side);
  const fjernTom = i => { if (T.fanger[i] && T.fanger[i].n <= 0) T.fanger.splice(i, 1); };
  // bytte mot penger: motstanderen betaler for å få sine tilbake
  api.byttPenger = i => { const f = T.fanger[i]; if (!f || f.til) return false; const kr0 = K.byttePris(f.n); T.fanger.splice(i, 1); OppstartSpill.gi(kr0);
    logg(`${fnavn(f.side)} har kjøpt tilbake ${fangeTekst(f.n)} for ${kr(kr0)}.`); lagre(); return true; };
  // bytte én mot én: dine som er tatt, kommer hjem (de står som «fri» i Folk)
  api.byttEgne = (i, maks) => { const f = T.fanger[i]; if (!f || f.til) return false; const tatt = egneTatt(f.side), k = Math.min(f.n, tatt.length, maks > 0 ? maks : Infinity);
    if (!k) { logg(`${fnavn(f.side)} har ingen av dine å bytte.`); return false; }
    const hjem = tatt.slice(0, k); T.tatt = T.tatt.filter(q => !hjem.includes(q)); f.n -= k; fjernTom(i); const Fo = folk(); let inn = 0;
    if (Fo && window.Tropper && window.FolkRegler) { for (const p of Tropper.oppløs({ menn: hjem.map(q => ({ navn: q.navn, rolle: q.rolle, hp: q.hp, erf: q.erf, person: q.person })) }, FolkRegler.OPPGAVER)) { p.id = Fo.neste++; Fo.personer.push(p); inn++; } lagreLeir(); }
    logg(`Fangeutveksling med ${fnavn(f.side)}: ${k} mot ${k}. ${hjem.map(q => q.navn.split(' ')[0]).join(', ')} er tilbake i leiren${inn ? ' (de står som «fri» i Folk)' : ''}.`); lagre(); skitten = true; return true; };
  // (runde 4, del 2) motstanderen foreslår selv et bytte når de har noen av dine og du har noen av deres (bare av seg selv utenfor
  // testene); svaret gis under Leir → Mål → Fanger
  const fangerFra = side => T.fanger.reduce((v, f) => v + (f.side === side && !f.til ? f.n : 0), 0);
  api.foreslå = side => { const k = K.forslagBytte(fangerFra(side), egneTatt(side).length); if (!k || T.forslag) return false;
    T.forslag = { side, n: k, til: tid + R.fange.forslagVarer }; logg(`${fnavn(side)} foreslår et fangebytte: ${k} av deres mot ${k} av dine. Svar under Leir → Mål → Fanger.`);
    hend('annet', `${fnavn(side)} foreslår et fangebytte`); lagre(); return true; };
  api.svarForslag = ja => { const q = T.forslag; if (!q) return false; T.forslag = null;
    if (!ja) { logg(`Du avslo fangebyttet med ${fnavn(q.side)}.`); lagre(); return true; }
    let igjen = K.forslagBytte(Math.min(q.n, fangerFra(q.side)), egneTatt(q.side).length);
    if (!igjen) { logg(`Fangebyttet med ${fnavn(q.side)} kunne ikke gjennomføres – noen av fangene er ikke lenger her.`); lagre(); return false; }
    for (let i = T.fanger.length - 1; i >= 0 && igjen > 0; i--) { const f = T.fanger[i]; if (!f || f.side !== q.side || f.til) continue; const før = egneTatt(q.side).length; api.byttEgne(i, igjen); igjen -= før - egneTatt(q.side).length; }
    return true; };
  let forslagAkk = 0;
  function forslagSteg(min) {
    if (T.forslag && tid > T.forslag.til) { logg(`Forslaget om fangebytte fra ${fnavn(T.forslag.side)} gikk ut.`); T.forslag = null; lagre(); }
    if (!auto() || T.forslag || !T.tatt.length || !T.fanger.length) return; forslagAkk += min; if (forslagAkk < R.fange.forslagHver) return; forslagAkk = 0;
    for (const side of new Set(T.tatt.map(q => q.side))) if (rng() < R.fange.forslagSjanse && api.foreslå(side)) break;
  }
  // arbeid: fangene er halve arbeidere på oppgaven (null = de sitter innestengt). Blar gjennom oppgavene når o mangler.
  api.arbeid = (i, o) => { const f = T.fanger[i]; if (!f) return false; const liste = [null, ...R.fange.oppgaver];
    if (o === undefined) o = liste[(liste.indexOf(f.arbeid || null) + 1) % liste.length]; if (o !== null && !R.fange.oppgaver.includes(o)) return false;
    f.arbeid = o; const Fo = folk(), mine = Fo && window.FolkRegler && o ? FolkRegler.arbeidere(Fo, o) : 0;
    logg(o ? `${fangeTekst(f.n)} fra ${fnavn(f.side)} arbeider nå på «${(window.FolkRegler && FolkRegler.OPPGAVE[o] ? FolkRegler.OPPGAVE[o].navn : o).toLowerCase()}»${mine ? '' : ' – men ingen av dine er der for å lede dem, så det gir ingenting ennå'}. Med få vakter kan noen rømme.` : `Fangene fra ${fnavn(f.side)} arbeider ikke lenger.`);
    lagre(); return true; };
  // god behandling: de spiser av matlageret, og etter noen døgn kan de spørres om å bli med
  api.behandling = (i, god) => { const f = T.fanger[i]; if (!f) return false; f.god = god === undefined ? !f.god : !!god; f.matMeldt = false;
    logg(f.god ? `Fangene fra ${fnavn(f.side)} får god behandling (${R.fange.mat} rasjon per fange per døgn). Etter ${R.fange.døgn} døgn kan dere spørre om de vil bli med.` : `Fangene fra ${fnavn(f.side)} får vanlig behandling igjen.`); lagre(); return true; };
  api.kanSpørres = i => K.kanSpørres(T.fanger[i], tid);
  api.spør = i => {
    const f = T.fanger[i]; if (!f || !K.kanSpørres(f, tid)) return null; const Fo = folk(), Lr = window.LeirSpill && LeirSpill.tilstand(), FR = window.FolkRegler;
    if (!Fo || !Lr || !FR) { logg('Leiren har ingen folk-liste.'); return null; }
    const o = window.FolkSpill && FolkSpill.valg ? FolkSpill.valg() : {}, grunn = FR.kanRekruttere(Fo, Lr, o); if (grunn) { logg(`Fangene kan ikke bli med nå: ${grunn}`); return null; }
    const B = FR.behov(Fo, Lr, o), ledig = FR.nød(Fo) ? f.n : Math.max(1, B.senger - B.n - B.avh), r = K.spør(f.n, Fo.moral, rng), ja = Math.min(r.ja, ledig), rr = FR.rng(Fo.frø), nye = [];
    for (let j = 0; j < ja; j++) { const p = FR.nyPerson(Fo, rr, 'fri', rr() < .6 ? 'tidligere soldat' : null), [a, b] = R.fange.lojal; p.lojal = Math.round((a + rr() * (b - a)) * 100) / 100; p.fange = fnavn(f.side);
      // forræderen bruker det spill/samfunn.js har (p.spion): han kan lekke og sabotere til han blir avslørt
      if (r.forrædere.includes(j)) { p.spion = true; p.krigForræder = true; } nye.push(p); }
    Fo.frø = Math.floor(rr() * 4294967296); f.n -= ja; f.nei = tid + R.fange.nyttForsøk * 1440; fjernTom(i);
    logg(ja ? `${nye.map(p => p.navn.split(' ')[0]).join(', ')} (${ja} av ${ja + Math.max(0, f.n)}) vil bli med i gjengen etter den gode behandlingen. De står som «fri» i Folk.${ja < r.ja ? ' Flere ville, men det er ikke senger nok.' : ''}`
      : `Ingen av fangene fra ${fnavn(f.side)} vil bli med ennå. Prøv igjen om et døgn.`);
    if (ja) lagreLeir(); lagre(); return { ja, spurt: ja + Math.max(0, f.n) };
  };
  // vakter: folk på «vakt» og friske soldater i lag som står ved leiren
  function vakterNå(L) { const Fo = folk(); let v = Fo && window.FolkRegler ? FolkRegler.arbeidere(Fo, 'vakt') : 0;
    for (const s of egne()) if (Math.hypot(s.x - L.x, s.y - L.y) <= R.sårede.avstand) v += friske(s); return v; }
  api.vakter = () => { const L = leir(); return L ? vakterNå(L) : 0; };
  function fangeSteg(min, L) {
    const Fo = folk();
    for (const f of T.fanger) { if (!f.god) continue; const behov = f.n * R.fange.mat * min / 1440;
      if (!Fo) f.godMin = (f.godMin || 0) + min; else if (Fo.mat >= behov) { Fo.mat -= behov; f.godMin = (f.godMin || 0) + min; f.matMeldt = false; }
      else if (!f.matMeldt) { f.matMeldt = true; logg(`Det er ikke mat nok til å gi fangene fra ${fnavn(f.side)} god behandling.`); } }
    // rømming fra arbeidet (av seg selv – ikke i testene)
    if (!auto()) return; const iArb = T.fanger.filter(f => f.arbeid && f.n > 0), k = iArb.reduce((v, f) => v + f.n, 0); if (!k) return; const v = vakterNå(L);
    let rømt = false;
    for (const f of iArb) { const n = K.rømmer(f.n, v * f.n / k, min, rng); if (!n) continue; f.n -= n; rømt = true;
      if (window.AI && AI.minne && AI.minne[f.side]) AI.minne[f.side].leir = true;
      logg(`${n === 1 ? 'En fange' : n + ' fanger'} fra ${fnavn(f.side)} har rømt fra arbeidet! De vet hvor leiren ligger. Flere vakter gjør det vanskeligere.`); hend('annet', 'Fanger har rømt'); }
    if (rømt) { for (let i = T.fanger.length - 1; i >= 0; i--) fjernTom(i); lagre(); }
  }
  // arbeidet: faktoren på oppgaven i Folk (FolkRegler.oppgaveF – spill/overlev.js bruker den også, så vi henger oss på det som er der)
  let førOppgaveF = null;
  const fangeArbeidF = o => { const n = T.fanger.reduce((v, f) => v + (f.arbeid === o ? f.n : 0), 0); if (!n) return 1; const Fo = folk(); return Fo && window.FolkRegler ? K.arbeidF(FolkRegler.arbeidere(Fo, o), n) : 1; };
  const minOppgaveF = o => (førOppgaveF ? førOppgaveF(o) || 1 : 1) * fangeArbeidF(o);
  function koblArbeid() { if (window.FolkRegler && FolkRegler.oppgaveF !== minOppgaveF) { førOppgaveF = FolkRegler.oppgaveF; FolkRegler.oppgaveF = minOppgaveF; } }
  api.fangeArbeidF = fangeArbeidF;
  function avhørFerdig() {
    for (const f of T.fanger) { if (!f.til || f.avhørt || tid < f.til) continue; f.avhørt = true; delete f.til; let n = 0;
      for (const e of fiender()) if (e.side === f.side && !e.raid) { K.meld(T.etter, { navn: e.navn, side: e.side, x: e.x, y: e.y, t: tid, kilde: 'avhør', hva: e.ai && e.ai.tekst ? e.ai.tekst : 'står stille', varer: R.etterretning.varer }); n++; }
      logg(n ? `Avhøret er ferdig: fangene fortalte hvor ${n} lag fra ${fnavn(f.side)} står og hva de vil. Se kartet og Leir → Mål.` : `Avhøret er ferdig, men fangene visste ikke noe nytt.`); skitten = true; lagre(); }
  }

  // ---------- etterretning ----------
  let radioAkk = 0;
  function etterretning(min, L) {
    for (const e of fiender()) if (synlig(e)) K.meld(T.etter, { navn: e.navn, side: e.side, x: e.x, y: e.y, t: tid, kilde: 'sett', hva: e.ai && e.ai.tekst ? e.ai.tekst : '' });
    K.rydd(T.etter, tid);
    for (let i = T.etter.length - 1; i >= 0; i--) if (!ENHETER.some(e => e.navn === T.etter[i].navn && levende(e))) T.etter.splice(i, 1);
    if (!auto()) return;
    radioAkk += min; if (radioAkk < R.etterretning.hver) return; radioAkk = 0;
    const LS = window.LeirSpill && LeirSpill.tilstand(); if (!LS || !LS.bygg.some(b => b.type === 'radiomast' && Leir.virker(b)) || (window.SPILLREGLER && SPILLREGLER.har('ingenRadio'))) return;
    for (const e of fiender()) { if (!e.ai || !e.ai.tekst || synlig(e)) continue; const p = K.oppfang(e, L, rng); if (!p) continue;
      K.meld(T.etter, { navn: e.navn, side: e.side, x: p.x, y: p.y, t: tid, kilde: 'radio', hva: e.ai.tekst, varer: R.etterretning.radioVarer });
      logg(`Radiomasten fanget opp samband: ${e.navn} ${e.ai.tekst}. Omtrentlig sted er merket i kartet.`); skitten = true; break; }
  }
  // dronene i kameravakta: en drone i lufta varsler om lag den ser
  function droner() {
    if (!window.DRONER || !window.Enheter) return;
    for (const d of DRONER) for (const e of fiender()) { if (!Enheter.droneSer(d, e.x, e.y)) continue;
      K.meld(T.etter, { navn: e.navn, side: e.side, x: e.x, y: e.y, t: tid, kilde: 'drone', hva: e.ai && e.ai.tekst ? e.ai.tekst : '' });
      if (auto() && !(tid - (e.droneMeldt === undefined ? -1e9 : e.droneMeldt) < R.drone.varsel)) { e.droneMeldt = tid; logg(`${d.navn} ser ${e.navn} (${ilive(e)} mann)${e.sti ? ' på marsj' : ''}. Se gjennom dronen under Leir → Mål.`); } }
  }
  api.seDrone = async i => { const d = window.DRONER && DRONER[i]; if (!d) return false; kam.x = d.x; kam.y = d.y; kam.m = Math.min(kam.m, 4); skitten = true;
    if (window.lukkPanel) lukkPanel(); const lm = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (lm && lm.classList.contains('på') && lk) lk.click();
    logg(`Du ser det ${d.navn} ser – ovenfra.`); if (typeof slå3d === 'function' && !(typeof på3d !== 'undefined' && på3d)) await slå3d(true); return true; };

  // ---------- røyk, lys og støy ----------
  const lager = s => (s.krig = s.krig || { røyk: R.røyk.antall, lys: R.lys.antall, støy: R.støy.antall });
  api.røyk = s => { const q = lager(s); if (q.røyk <= 0) { logg(`${s.navn} har ikke flere røykbokser. Fyll opp ved leiren.`); return false; } q.røyk--; RØYK.push({ x: s.x, y: s.y, til: tid + R.røyk.varer });
    logg(`${s.navn} legger røyk: i ${R.røyk.varer} min er laget vanskelig å treffe, men skyter også dårligere.`); skitten = true; return true; };
  api.lys = s => { const q = lager(s); if (q.lys <= 0) { logg(`${s.navn} har ikke flere lysraketter. Fyll opp ved leiren.`); return false; } q.lys--; LYS.push({ x: s.x, y: s.y, til: tid + R.lys.varer });
    for (const e of ENHETER) if (avst(e, s) <= R.lys.radius) e.siktSkitten = true; logg(`${s.navn} skyter opp en lysrakett: natta er borte innen ${R.lys.radius} m i ${R.lys.varer} min.`); skitten = true; return true; };
  api.støy = (s, X, Y) => { const q = lager(s), d = Math.hypot(X - s.x, Y - s.y); if (q.støy <= 0) { logg(`${s.navn} har ikke flere støyladninger. Fyll opp ved leiren.`); return false; }
    if (d > R.støy.kast) { logg(`${s.navn}: for langt unna (høyst ${R.støy.kast} m fra laget).`); return false; } q.støy--; let n = 0;
    if (window.AI && AI.minne) for (const side of AI.sider) { if (AI.hvile && AI.hvile(side, 'blå')) continue; if (!ENHETER.some(e => e.side === side && e.ai && levende(e) && Math.hypot(e.x - X, e.y - Y) <= R.støy.hører)) continue;
      AI.minne[side].sist = { x: X, y: Y, navn: 'støy', styrke: 1, t: tid }; n++; }
    STØY.push({ x: X, y: Y, til: tid + 3 }); logg(n ? `${s.navn} lager støy ${Math.round(d)} m unna. Fienden i nærheten har hørt det og kommer trolig for å se.` : `${s.navn} lager støy, men ingen fiender er nær nok til å høre det (${R.støy.hører / 1000} km).`); skitten = true; return true; };
  const STØY = [];

  // ---------- artilleri kalt inn fra et lag med radio ----------
  const harRadio = s => s.menn.some(m => m.rolle === 'radio' && m.hp >= 1) || !!s.radio;
  const batterier = () => (window.KJORETOY || []).filter(k => k.type === 'rakettartilleri' && k.side === 'blå');
  api.kallInn = (s, X, Y) => {
    if (!harRadio(s)) { logg(`${s.navn} har ingen radio som virker (radiomannen er ute av kamp).`); return null; }
    if (!ser(s, X, Y)) { logg(`${s.navn} ser ikke det stedet – laget må se målet for å lede ilden.`); return null; }
    const A = window.Enheter.REGLER.artilleri, k = batterier().find(q => !q.sti && !(q.lader > 0) && Math.hypot(q.x - X, q.y - Y) <= A.rekkevidde && Math.hypot(q.x - X, q.y - Y) >= A.minimum);
    if (!k) { logg(`${s.navn}: ikke noe rakettartilleri kan skyte dit nå (lader, kjører, eller målet er for nær/langt unna).`); return null; }
    logg(`${s.navn} kaller inn ild over radioen og leder salven.`); return window.S6.ild(k, X, Y);
  };

  // ---------- bakhold på veg ----------
  function bakhold() {
    for (const s of egne()) { if (!s.bakhold) continue; if (s.sti) { s.bakhold = false; continue; }
      for (const k of (window.KJORETOY || []).slice()) { if (k.side === 'blå' || Math.hypot(k.x - s.x, k.y - s.y) > R.bakhold.avstand) continue;
        if (window.AI && AI.hvile && AI.hvile('blå', k.side)) continue;
        const om = ENHETER.filter(e => e.ombord === k), d = Math.hypot(k.x - s.x, k.y - s.y);
        if (window.Kjoretoy && k.sti) Kjoretoy.stopp(k);
        logg(`${s.navn} slår til fra bakholdet: ${k.navn} er stoppet${om.length ? ', og de som satt på, er tatt på senga' : ''}.`);
        for (const e of om) { e.ombord = null; e.x = k.x + 6; e.y = k.y + 4; e.sti = null; e.siktSkitten = true;
          const treff = Math.round(Terreng.ildrunde(s.menn, Math.max(30, d), { målPåMarsj: true }, rng) * R.bakhold.ild); if (treff && window.S6) S6.treffPå(e, treff, 'i bakholdet'); }
        if (!om.some(e => levende(e) && !Terreng.slattUt(e.menn))) { const side = k.side; k.side = 'blå'; k.navn = 'Erobret ' + (Kjoretoy.TYPER[k.type] ? Kjoretoy.TYPER[k.type].navn.toLowerCase() : 'kjøretøy'); k.oppdrag = null;
          if (window.AI && AI.biler && AI.biler[side] === k) AI.biler[side] = null; logg(`${s.navn} har tatt kjøretøyet. Det er ditt nå.`); }
        s.bakhold = false; skitten = true; if (valgt === s) visPanel(); break; } }
  }

  // ---------- beleiring ----------
  const utenStrøm = () => { if (!window.INFRA_TILSTAND) return false; for (const [k, v] of INFRA_TILSTAND) if (/^kraft:/.test(k) && v && v.tilstand && v.tilstand !== 'hel') return true; return false; };
  function beleiringer(min) {
    const E = egne(), FI = fiender().filter(e => !e.raid && !e.post); for (const e of fiender()) e.krigSvekket = false;
    for (const by of byer()) { const id = by.e.id, før = T.beleiring[id], m = midt(by);
      if (før === undefined && !E.some(s => Math.abs(s.x - m.x) < 4000 && Math.abs(s.y - m.y) < 4000)) continue;
      // (runde 4) et tettsted ingen eier, der fiendens lag holder til (og kanskje sloss med bygdevernet), kan også beleires –
      // før startet ringen aldri der, fordi stedet ikke hadde noen eier (prøvd på /rogaland 18. nov)
      let ei = eier(by), nøytral = false;
      if (!ei) { const inne = FI.find(e => e.x > by.bb[0] && e.x < by.bb[2] && e.y > by.bb[1] && e.y < by.bb[3] && Garnison.inni(by, e.x, e.y)); if (inne) { ei = inne.side; nøytral = true; } }
      if (!ei || ei === 'blå') { if (før !== undefined) delete T.beleiring[id]; continue; }
      // våpenhvile med dem som sitter i stedet: beleiringen står stille (tiden telles ikke)
      if (window.AI && AI.hvile && AI.hvile('blå', ei)) continue;
      if (!K.beleiret(m, E)) { if (før !== undefined) { delete T.beleiring[id]; logg(`Beleiringen av ${by.e.navn} er brutt – lagene dine står ikke lenger på to kanter.`); lagre(); } continue; }
      const garnison = fiender().filter(e => e.side === ei && Garnison.inni(by, e.x, e.y));
      // (runde 4) ingen å beleire: en ny ring startes ikke rundt et tomt tettsted (på /rogaland startet den på nytt med en gang etter at
      // garnisonen hadde gitt seg, og meldte «beleiret» hver tolvte time)
      if (før === undefined && !garnison.length) continue;
      const nå = K.beleiringSteg(før || 0, min, utenStrøm()), s0 = K.beleiringNå(før || 0), s1 = K.beleiringNå(nå); T.beleiring[id] = nå;
      if (før === undefined) logg(`${by.e.navn} er beleiret: ${nøytral ? `${fnavn(ei)} sitter fast der${T.vern[id] > 0 ? ' og sloss med bygdevernet' : ''}, og får` : 'garnisonen får'} ikke forsyninger. Etter ${R.beleiring.svekket / 60} timer svekkes den, etter ${R.beleiring.girSeg / 60} gir den seg${utenStrøm() ? ' (uten strøm går det fortere)' : ''}.`);
      // garnisonen får ikke ny ammunisjon mens ringen holder
      for (const e of garnison) { const a = window.Forsyning ? Forsyning.ammo(e) : 1; e.krigAmmoTak = Math.min(e.krigAmmoTak === undefined ? a : e.krigAmmoTak, a); e.ammo = e.krigAmmoTak; e.krigSvekket = s1 === 'svekket' || s1 === 'girSeg'; }
      if (s1 === 'svekket' && s0 !== 'svekket') logg(`Garnisonen i ${by.e.navn} er svekket av beleiringen og skyter dårligere.`);
      if (s1 === 'girSeg') { delete T.beleiring[id]; if (garnison.length) for (const e of garnison) overgi(e, null, 'beleiringen har tatt motet fra dem'); else logg(`${by.e.navn} har ingen garnison igjen – gå inn og ta stedet.`); hend('annet', `Beleiringen av ${by.e.navn} er over`); lagre(); } }
  }

  // ---------- våpenhvile ----------
  api.fredPris = side => K.fredPris(T.fredN[side] || 0, T.brudd[side] || 0);
  api.fred = side => { if (!window.AI || !AI.fred || (T.fred[side] || 0) > tid) return false; const p = api.fredPris(side);
    if (!OppstartSpill.betal(p)) { logg(`Dere har ikke råd til en våpenhvile med ${fnavn(side)} (${kr(p)}).`); return false; }
    T.fred[side] = tid + R.fred.varer; T.fredN[side] = (T.fredN[side] || 0) + 1; fredTilAI(); logg(`Våpenhvile med ${fnavn(side)} i ${R.fred.varer / 60} timer (${kr(p)}). De skyter ikke på dere, og dere ikke på dem – bruk tiden mot den andre.`); lagre(); return true; };
  api.brytFred = side => { if (!((T.fred[side] || 0) > tid)) return false; delete T.fred[side]; T.brudd[side] = (T.brudd[side] || 0) + 1; fredTilAI(); logg(`Du har brutt våpenhvilen med ${fnavn(side)}. Neste avtale med dem blir dobbelt så dyr.`); lagre(); return true; };
  function fredSteg() { for (const side of Object.keys(T.fred)) if (T.fred[side] <= tid) { delete T.fred[side]; fredTilAI(); logg(`Våpenhvilen med ${fnavn(side)} er over.`); hend('annet', `Våpenhvilen med ${fnavn(side)} er over`); lagre(); } }

  // ---------- bygdevern ----------
  let vernAktive = [], vernAkk = 0; const oppdragMeldt = new Set();
  // Vernet gjelder alle som går inn i et tettsted ingen eier – også motstanderne (de kan ikke gjøre avtaler og må slåss).
  function vern(min) {
    vernAktive = []; if (!auto() || !window.Garnison) return;
    const alle = ENHETER.filter(s => erLag(s) && levende(s) && !s.karakter && !s.iLufta && !s.ombord);
    for (const by of byer()) { if (eier(by)) continue; let inne = alle.filter(s => s.x > by.bb[0] && s.x < by.bb[2] && s.y > by.bb[1] && s.y < by.bb[3] && Garnison.inni(by, s.x, s.y)); if (!inne.length) continue;
      // (R1-løkka 26. nov, kritikken: «bygdevernet angrep folkene som ga oss jobben») egne lag er i fred når dere har en kontrakt for
      // bygdelaget eller kommunen her (SelskapSpill.oppdragFor) – vernet vet om jobben
      const opp = window.SelskapSpill && SelskapSpill.oppdragFor ? SelskapSpill.oppdragFor(by.e.id) : null;
      if (opp) { const fredet = inne.filter(s => s.side === 'blå'); if (fredet.length) { inne = inne.filter(s => s.side !== 'blå'); const nøkkel = by.e.id + ':' + opp.id;
        if (!oppdragMeldt.has(nøkkel)) { oppdragMeldt.add(nøkkel); logg(`Bygdevernet i ${by.e.navn} slipper ${fredet[0].navn} inn – dere er her på oppdrag for ${opp.giver.navn}.`); } } if (!inne.length) continue; }
      const id = by.e.id, blå = inne.some(s => s.side === 'blå'); if (T.vern[id] === undefined) { T.vern[id] = K.vernMenn(by.e.folk);
        // (R2-løkka) avtalen gjøres i Krig (tettstedets boks og scenariets by) – Leir → Mål hadde den ikke; ett tall for styrken (Strategi.anbefalt)
        if (blå) { const anb = window.Strategi && Strategi.anbefalt ? Strategi.anbefalt(Garnison.minstFor ? Garnison.minstFor(by.e.folk) : 0, T.vern[id]) : T.vern[id] + 1;
          logg(`Bygdevernet i ${by.e.navn} (${T.vern[id]} mann) vil ikke slippe dere inn. Gjør en avtale i Krig (${kr(K.vernPris(by.e.folk))}), eller ta stedet med minst ${anb} mann.`); } lagre(); }
      // en avtale gjelder bare dine lag; har vernet gitt opp eller gjort avtale, slipper alle inn
      if (T.vern[id] > 0) vernAktive.push({ by, inne }); }
    vernAkk += min; if (vernAkk < Terreng.KAMPRUNDE_MIN) return; vernAkk = 0;
    for (const { by, inne } of vernAktive) { const id = by.e.id, s = inne[Math.floor(rng() * inne.length)], r = K.vernRunde(T.vern[id], inne.reduce((v, q) => v + friske(q), 0), rng), blå = inne.some(q => q.side === 'blå');
      if (r.motLaget && window.S6) S6.treffPå(s, r.motLaget, 'av bygdevernet'); T.vern[id] -= r.motVernet;
      if (T.vern[id] <= 0) { T.vern[id] = 0; const F = window.FolkSpill && FolkSpill.tilstand(); if (blå && F) F.moral = Math.max(0, F.moral - R.vern.moral);
        if (blå) { logg(`Bygdevernet i ${by.e.navn} har gitt opp. Folk i leiren liker det dårlig (moral −${R.vern.moral}).`); hend('annet', `Bygdevernet i ${by.e.navn} har gitt opp`); } else if (inne.some(synlig)) logg(`${fnavn(inne[0].side)} har knust bygdevernet i ${by.e.navn}.`); }
      lagre(); }
  }
  // ---------- RUTER UTENOM FIENDTLIGE TETTSTEDER (R1-løkka 26. nov) ----------
  // De tettstedene et eget lag ikke kan gå gjennom uten kamp: bygdevern som står (ikke møtt ennå, eller mann igjen – ikke avtale, ikke
  // gitt opp, og ikke på oppdrag for bygda: SelskapSpill.oppdragFor), eller en motstanders tettsted. unntak = punkter ([x, y]) som ligger
  // i byer som ikke skal regnes med (der laget står, og målet). Gir [{ by, navn, grunn, mann }].
  function fiendtligeByer(unntak = []) {
    const ut = [];
    for (const by of byer()) { if (!by.bb || !by.e) continue; if (unntak.some(p => p && p[0] > by.bb[0] && p[0] < by.bb[2] && p[1] > by.bb[1] && p[1] < by.bb[3] && Garnison.inni(by, p[0], p[1]))) continue;
      const e = eier(by);
      if (e && e !== 'blå') { ut.push({ by, navn: by.e.navn, grunn: `${fnavn(e)} holder det`, mann: 0 }); continue; }
      if (e) continue; const st = T.vern[by.e.id]; if (st === -1 || st === 0) continue;
      if (window.SelskapSpill && SelskapSpill.oppdragFor && SelskapSpill.oppdragFor(by.e.id)) continue;
      const mann = st > 0 ? st : K.vernMenn(by.e.folk); ut.push({ by, navn: by.e.navn, grunn: `bygdevern ${mann} mann`, mann }); }
    return ut;
  }
  const byTekst = L => L.map(b => `${b.navn} (${b.grunn})`).join(' og ');
  const advart = new Map();
  // Kroken i ordre() (index.html): s = laget, v = vinduet, r = ruta (Terreng.ruteTil). Går ruta gjennom fiendtlige tettsteder, prøves en
  // rute med dem sperret; den brukes når den er god nok (Krig.omvegOk). Ellers står den første ruta, og loggen advarer (høyst hvert 10. min).
  // Bare egne lag, og bare når ting skjer av seg selv (ikke i testene, der bygdevernet heller ikke slåss – KrigSpill.test slår det på).
  (KROKER.rute = KROKER.rute || []).push((s, v, r, X, Y, stille) => {
    if (!auto() || !r || !s || s.side !== 'blå' || s.ai || s.karakter || !window.Garnison) return null;
    const fi = fiendtligeByer([[s.x, s.y], [X, Y]]); if (!fi.length) return null;
    const gj = K.gjennomByer(r.sti, fi, Garnison.inni); if (!gj.length) return null;
    const sp = K.sperrByer(v, gj, Garnison.inni), r2 = Terreng.ruteTil(sp.v, s.x, s.y, X, Y);
    if (r2 && K.omvegOk(r.timer, r2.timer) && !K.gjennomByer(r2.sti, fi, Garnison.inni).length) {
      if (!stille) logg(`${s.navn}: ruta går utenom ${byTekst(gj)}${r2.timer > r.timer * 1.05 ? ` – omvegen tar ca. ${nf.format(Math.round((r2.timer - r.timer) * 10) / 10)} t ekstra` : ''}.`);
      return r2; }
    const nøkkel = s.navn + '|' + gj.map(b => b.navn).join(','); if ((advart.get(nøkkel) || -1e9) > tid - 10) return null; advart.set(nøkkel, tid);
    logg(`Advarsel: ${s.navn} sin rute går gjennom ${byTekst(gj)} – det finnes ingen god omveg. Gjør en avtale først (Krig), send et sterkere lag, eller gi ordren i etapper utenom.`);
    return null; });
  // (R2-løkka 26. nov, kritikken: «Speidertroppen stoppet 4 km før Elverum uten forvarsel») en speidertropp som får ordre inn i et forsvart
  // tettsted (bygdevern som står, eller fiender dere ser der), stopper før stedet (spill/strategi-visning.js) – nå sier loggen det
  // allerede når ordren gis, og hvordan troppen kan sendes inn likevel.
  KROKER.rute.push((s, v, r, X, Y, stille) => {
    const SS = window.StrategiSpill; if (stille || !auto() || !s || s.side !== 'blå' || !SS || !SS.speider || !SS.speider(s) || !r || !r.sti || !window.Garnison) return null;
    let B = []; try { B = SS.område() || []; } catch (e) { B = []; }
    for (const by of B) { if (!by.ref || by.id === s.speidLikevel || Garnison.inni(by.ref, s.x, s.y)) continue; const bb = by.ref.bb;
      if (!r.sti.some(([x, y]) => x > bb[0] && x < bb[2] && y > bb[1] && y < bb[3] && Garnison.inni(by.ref, x, y))) continue;
      let vn = null; try { vn = SS.vern ? SS.vern(by) : null; } catch (e) { vn = null; }
      const fi = ENHETER.filter(e => e.side !== 'blå' && levende(e) && !e.karakter && Math.hypot(e.x - by.x, e.y - by.y) <= 2500 && (() => { try { return synlig(e); } catch (x) { return false; } })());
      if (!(vn && vn.mann > 0) && !fi.length) continue;
      logg(`Merk: ${s.navn} er speidere og stopper før ${by.navn} (${vn && vn.mann > 0 ? `bygdevernet har ${vn.mann} mann` : `${fi.length === 1 ? '1 fiendelag' : fi.length + ' fiendelag'} sett der`}) – speidere går ikke inn i et forsvart sted, de melder hva som står der. Skal troppen inn: Krig → ${by.navn} → «Send likevel».`);
      break; }
    return null; });
  api.fiendtligeByer = fiendtligeByer; api.ruteGjennom = (sti, unntak) => K.gjennomByer(sti, fiendtligeByer(unntak || []), Garnison.inni);
  api.vernAvtale = id => { const by = byer().find(b => b.e.id === id); if (!by || !(T.vern[id] > 0)) return false; const p = K.vernPris(by.e.folk);
    if (!OppstartSpill.betal(p)) { logg(`Dere har ikke råd til avtalen med bygdevernet i ${by.e.navn} (${kr(p)}).`); return false; }
    T.vern[id] = -1; logg(`Avtale med bygdevernet i ${by.e.navn} (${kr(p)}): de slipper dere inn uten kamp.`); lagre(); return true; };

  // ---------- helikopterfrakt ----------
  const heliFins = () => { const L = window.KjorSpill && KjorSpill.liste && KjorSpill.liste(); return !!(L && L.some(k => k.type === 'heli' && !(k.hp <= 0))) && !(KjorSpill.fører && KjorSpill.fører()); };
  api.heliFins = heliFins; api.heli = () => HELI;
  function heliStart(s, fase, mål) {
    const L = leir(); if (!L) return false;
    if (HELI) { logg('Helikopteret er alt ute på tur.'); return false; }
    if (!heliFins()) { logg('Dere har ikke noe helikopter som kan fly (eller du sitter i det selv).'); return false; }
    if (ilive(s) > R.heli.plasser) { logg(`Helikopteret tar høyst ${R.heli.plasser}.`); return false; }
    const d = fase === 'ut' ? Math.hypot(s.x - L.x, s.y - L.y) : Math.hypot(mål[0] - L.x, mål[1] - L.y);
    if (d > R.heli.radius) { logg(`For langt for helikopteret (høyst ${R.heli.radius / 1000} km fra leiren).`); return false; }
    if (!OppstartSpill.betal(R.heli.pris)) { logg(`Dere har ikke råd til turen (${kr(R.heli.pris)}).`); return false; }
    HELI = { lag: s, fase, x: L.x, y: L.y, mål: fase === 'ut' ? [s.x, s.y] : mål, retning: 0, fra: [L.x, L.y] };
    if (fase === 'frakt') { s.iLufta = true; s.sti = null; }
    logg(fase === 'ut' ? `Helikopteret henter ${s.navn}: framme om ca. ${Math.max(1, Math.round(K.heliMin(d)))} min (${kr(R.heli.pris)}).` : `Helikopteret flyr ${s.navn} ut: framme om ca. ${Math.max(1, Math.round(K.heliMin(d)))} min (${kr(R.heli.pris)}).`);
    skitten = true; return true;
  }
  api.heliHent = s => { const L = leir(); if (L && Math.hypot(s.x - L.x, s.y - L.y) < 300) { logg(`${s.navn} står alt ved leiren.`); return false; } return heliStart(s, 'ut'); };
  api.heliFly = (s, X, Y) => { const L = leir(); if (!L || Math.hypot(s.x - L.x, s.y - L.y) > 300) { logg(`${s.navn} må stå ved leiren for å gå om bord i helikopteret.`); return false; } return heliStart(s, 'frakt', [X, Y]); };
  function heliSteg(dt) {
    const H = HELI, L = leir(); if (!H || !L) return; const s = H.lag, steg = R.heli.fart * 1000 / 60 * dt;
    if (H.fase === 'ut' && levende(s)) H.mål = [s.x, s.y];
    const dx = H.mål[0] - H.x, dy = H.mål[1] - H.y, d = Math.hypot(dx, dy); skitten = true;
    if (d > steg) { H.x += dx / d * steg; H.y += dy / d * steg; H.retning = Math.atan2(dy, dx); if (s.iLufta) { s.x = H.x; s.y = H.y; } return; }
    H.x = H.mål[0]; H.y = H.mål[1];
    H.fra = [H.x, H.y];
    if (H.fase === 'ut') { if (!levende(s)) { H.fase = 'retur'; H.mål = [L.x, L.y]; return; } s.iLufta = true; s.sti = null; H.fase = 'hjem'; H.mål = [L.x + 30, L.y - 20]; logg(`${s.navn} er om bord i helikopteret${K.sårede(s.menn) ? ' med de sårede' : ''}.`); return; }
    if (H.fase === 'hjem' || H.fase === 'frakt') { s.iLufta = false; s.x = H.x; s.y = H.y; s.sti = null; s.siktSkitten = true; logg(H.fase === 'hjem' ? `${s.navn} er satt av ved leiren.` : `${s.navn} er satt av. Helikopteret flyr hjem.`);
      if (valgt === s) visPanel(); if (H.fase === 'hjem') { HELI = null; return; } H.fase = 'retur'; H.mål = [L.x, L.y]; return; }
    HELI = null;
  }

  // ---------- røverne varierer ----------
  let ventere = [];
  function røvere() {
    const Sp = window.SpilletSpill, Tr = Sp && Sp.T && Sp.T(), L = leir(); if (!Tr || !Tr.aktiv || !L) { ventere = []; return; }
    const lag = ENHETER.filter(e => e.raid === Tr.aktiv && levende(e)); if (!lag.length) return;
    let V = T.raid[Tr.aktiv];
    if (!V) { if (lag.some(e => e.planlegger)) return; const id = K.røverVariant(Tr.aktiv, K.klokkeTime(tid), lag.length, navigator.webdriver ? undefined : Math.floor(tid / 1440));
      V = { id, t: tid }; T.raid = { [Tr.aktiv]: V }; if (K.VARIANTER[id].tekst) logg(K.VARIANTER[id].tekst);
      if (id === 'to') for (const e of lag.slice(Math.ceil(lag.length / 2))) { const nx = 2 * L.x - e.x, ny2 = 2 * L.y - e.y;
        lagVindu([nx - 200, ny2 - 200, nx + 200, ny2 + 200], false).then(v => { if (Terreng.verdi(v, v.K, nx, ny2, 3) === 3 || !levende(e)) return; e.x = nx; e.y = ny2; e.sti = null; e.siktSkitten = true; ordre(e, L.x + (rng() - .5) * 80, L.y + (rng() - .5) * 80, true); skitten = true; }).catch(() => {}); }
      if (id === 'natt') { V.til = tid + R.røvere.venterHøyst; for (const e of lag) { e.sti = null; e.nattsikt = true; e.venterNatt = true; e.siktSkitten = true; } }
      if (id === 'sabotasje') { const LS = window.LeirSpill && LeirSpill.tilstand(), B = LS ? LS.bygg.filter(b => Leir.ferdig(b) && Leir.BYGG[b.type] && !Leir.BYGG[b.type].del && !Leir.BYGG[b.type].veg && b.type !== 'gjerde') : [];
        const mål = B.find(b => /aggregat|drivstofftank|radiomast|lager/.test(b.type)) || B[0], e = lag[lag.length - 1];
        if (mål) { V.bygg = mål.id; V.lag = e.navn = `Sabotører ${Tr.aktiv}`; ordre(e, mål.x, mål.y, true); } else V.id = 'rett'; }
      lagre(); return; }
    ventere = V.id === 'natt' && !V.gått ? lag : [];
    if (V.id === 'natt' && !V.gått && (K.natt(K.klokkeTime(tid)) >= .5 || tid >= V.til)) { V.gått = true; ventere = []; logg('Røverne kommer i mørket!'); for (const e of lag) { e.venterNatt = false; } for (const e of lag) ordre(e, L.x + (rng() - .5) * 80, L.y + (rng() - .5) * 80, true); lagre(); }
    if (V.id === 'sabotasje') { const e = lag.find(q => q.navn === V.lag), LS = window.LeirSpill && LeirSpill.tilstand(), b = LS && LS.bygg.find(q => q.id === V.bygg); if (!e) return;
      if (!V.gjort && b && Math.hypot(e.x - b.x, e.y - b.y) <= R.røvere.sabotasje) { V.gjort = true; const r = Leir.skade(LS, b.id, R.røvere.skade), navn = (Leir.BYGG[b.type] || {}).navn || 'et bygg';
        logg(`Sabotasje! Røverne har ${r === 'ødelagt' ? 'ødelagt' : 'skadet'} ${navn.toLowerCase()} i leiren og stikker av.`); if (LeirSpill.lagre) LeirSpill.lagre(); if (LeirSpill.oppdater3d) LeirSpill.oppdater3d();
        const a = Math.atan2(e.y - L.y, e.x - L.x); ordre(e, L.x + Math.cos(a) * (R.røvere.flukt + 600), L.y + Math.sin(a) * (R.røvere.flukt + 600), true); lagre(); }
      else if (V.gjort && Math.hypot(e.x - L.x, e.y - L.y) > R.røvere.flukt) { const i = ENHETER.indexOf(e); if (i > 3) ENHETER.splice(i, 1); V.slapp = true; logg('Sabotørene er borte.'); skitten = true; lagre(); }
      else if (!V.gjort && !b && !e.sti) ordre(e, L.x, L.y, true); }
  }

  // ---------- dekning bak ekte hus ----------
  // Et lag som står stille, sjekkes mot husomrissene (finnBygg i index.html) i midten og i en ring rundt – én gang per sted.
  function husSjekk() {
    if (typeof finnBygg !== 'function') return;
    for (const s of ENHETER) { if (!erLag(s) || !levende(s)) continue; if (s.sti) { s.vedHus = false; s.husSted = null; continue; }
      const sted = Math.round(s.x) + ',' + Math.round(s.y); if (s.husSted === sted) continue; s.husSted = sted;
      Promise.all(K.husPunkter(s.x, s.y).map(([x, y]) => finnBygg(x, y).catch(() => null))).then(r => { if (s.husSted === sted) { const v = r.some(Boolean); if (v !== !!s.vedHus && valgt === s) setTimeout(visPanel, 0); s.vedHus = v; } }); }
  }
  // ---------- egne lag kan gi seg (stridsvalget «Knust og omringet») ----------
  function egneGirSeg() {
    const Fi = fiender().filter(e => !Terreng.slattUt(e.menn));
    for (const s of egne()) { if (!window.Strid || Strid.ren(s.strid || (window.StridSpill && StridSpill.regel ? StridSpill.regel(s) : null)).overgi !== 'ja' || s.leirvakt) continue; const nær = Fi.filter(e => avst(e, s) <= R.overgi.omringet && !(window.AI && AI.hvile && AI.hvile('blå', e.side)));
      if (!K.egetGirSeg({ ute: Terreng.uteAvKamp(s.menn), omringet: K.omringet(s, nær) })) continue;
      logg(`${s.navn} har gitt seg: laget var knust og omringet. ${ilive(s)} mann er tatt til fange av ${fnavn(nær[0].side)}.`); hend('fanger', `${s.navn} har gitt seg`);
      // (runde 4) de som er tatt, huskes – de kan byttes mot fanger du har (Leir → Mål → Fanger)
      for (const m of s.menn) if (m.hp > 0) T.tatt.push({ side: nær[0].side, navn: m.navn, rolle: m.rolle, hp: m.hp, lag: s.navn, t: tid, ...(m.person ? { person: m.person } : {}), ...(m.erf ? { erf: m.erf } : {}) });
      if (T.tatt.length > 60) T.tatt.splice(0, T.tatt.length - 60); lagre();
      const i = ENHETER.indexOf(s); s.sti = null; s.ombord = null; if (valgt === s && window.lukkPanel) lukkPanel();
      // startlagene har faste plasser i lista: de blir stående som tomme lag
      if (i > 3) ENHETER.splice(i, 1); else for (const m of s.menn) m.hp = 0; skitten = true; }
  }
  // ---------- simuleringen ----------
  let akk = 0, sistLagret = 0;
  KROKER.sim.push(dt => {
    if (HELI) heliSteg(dt);
    // røvere som venter på mørket, står stille (spillet-visning.js gir dem ellers ordren på nytt)
    for (const e of ventere) if (e.sti) { e.sti = null; e.siktSkitten = true; }
    // bygdevernet holder stedet: ingen tar tettstedet mens vernet står
    if (vernAktive.length && window.TETTSTEDER) for (const { by } of vernAktive) { const t = TETTSTEDER.get(by.e.id); if (t && t.inntar) t.inntar.sek = 0; }
    // laget snur seg mot den det skyter på, eller den som skyter på det
    if (auto()) for (const s of ENHETER) { if (s.sti || !erLag(s) || s.ombord) continue; let mål = null;
      if (s.skyterPå && s.skyterPå.size) { const b = s.skyterPå.values().next().value; mål = Math.atan2(b.y - s.y, b.x - s.x); } else if (s.krigFra && tid - s.krigFra.t < 12) mål = s.krigFra.v;
      if (mål !== null) { const r = K.snu(s.retning || 0, mål, dt); if (r !== s.retning) { s.retning = r; skitten = true; } } }
    akk += dt; if (akk < 1) return; const min = akk; akk = 0; if (!klar) return; const L = leir(); if (!L) return;
    for (let i = RØYK.length - 1; i >= 0; i--) if (RØYK[i].til <= tid) { RØYK.splice(i, 1); skitten = true; }
    for (let i = LYS.length - 1; i >= 0; i--) if (LYS[i].til <= tid) { for (const e of ENHETER) if (avst(e, LYS[i]) <= R.lys.radius) e.siktSkitten = true; LYS.splice(i, 1); skitten = true; }
    for (let i = STØY.length - 1; i >= 0; i--) if (STØY[i].til <= tid) STØY.splice(i, 1);
    fredSteg(); avhørFerdig(); leverFanger(L); bakhold(); etterretning(min, L); droner(); koblArbeid(); if (T.fanger.length) fangeSteg(min, L); forslagSteg(min);
    // ved leiren: røyk, lys og støy fylles opp
    for (const s of egne()) if (s.krig && Math.hypot(s.x - L.x, s.y - L.y) <= R.sårede.avstand) { s.krig.røyk = R.røyk.antall; s.krig.lys = R.lys.antall; s.krig.støy = R.støy.antall; }
    if (auto()) {
      // natta kommer og går: sikten regnes på nytt
      const n = K.natt(K.klokkeTime(tid)); if (Math.abs(n - natt0) >= .1 || (n !== natt0 && (n === 0 || n === 1))) { natt0 = n; for (const s of ENHETER) s.siktSkitten = true; }
      // sårede stelles ved leiren (fortere med en sykestue som virker)
      const LS = window.LeirSpill && LeirSpill.tilstand(), syk = !!(LS && LS.bygg.some(b => b.type === 'sykestue' && Leir.virker(b)));
      for (const s of egne()) { if (s.sti || Math.hypot(s.x - L.x, s.y - L.y) > R.sårede.avstand) { s.stellAkk = 0; continue; } const r = K.stell(s.menn, min, syk, s.stellAkk); s.stellAkk = r.akk;
        if (r.friske.length) { logg(`${r.friske.join(' og ')} (${s.navn}) er kampklar igjen etter stell ${syk ? 'i sykestua' : 'i leiren'}.`); if (valgt === s) visPanel(); } }
      overgivelser(); egneGirSeg(); husSjekk(); beleiringer(min); røvere();
    }
    vern(min);
    if (performance.now() - sistLagret > 10000) { sistLagret = performance.now(); lagre(); }
  });

  // ---------- lagpanelet ----------
  KROKER.lagTekst.push(s => {
    if (!erLag(s) || s.karakter) return null; const d = [];
    if (s.side !== 'blå') { if (harVm(s) && levende(s)) d.push(`fører: ${fører(s)} (${vm(s).navn})`); if (s.krigSvekket) d.push('svekket av beleiring'); if (window.AI && AI.hvile && AI.hvile('blå', s.side)) d.push('våpenhvile'); return d.join(' · ') || null; }
    if (s.iLufta) d.push('i helikopteret');
    if (auto()) { const sår = K.sårede(s.menn); if (sår && s.sti) d.push(`bærer ${sår} ${sår === 1 ? 'såret' : 'sårede'} (marsj −${Math.round(100 * (1 - K.sårFart(s.menn)))} %)`);
      if (K.husVern(s.her && s.her.k, !!s.sti, s.vedHus) < 1) d.push('i dekning bak hus');
      else if (!s.sti && s.krigLeirDekning && tid - s.krigLeirDekning.t < 6) d.push(`i dekning bak ${String(s.krigLeirDekning.navn || 'et bygg').toLowerCase()}`);
      if (s.krigFra && tid - s.krigFra.t < 6 && s.krigFra.hva !== 'front') d.push(s.krigFra.hva === 'rygg' ? 'beskutt i ryggen!' : 'beskutt i flanken');
      const n = K.natt(K.klokkeTime(tid)); if (n > .5) d.push((s.utstyr && s.utstyr.nattsikt) ? 'nattsikt' : K.iLys(s, LYS, tid) ? 'opplyst' : 'mørkt: ser kortere'); }
    if (s.fanger) d.push(`fører ${s.fanger.n} ${s.fanger.n === 1 ? 'fange' : 'fanger'}`);
    if (s.bakhold) d.push('i bakhold ved vegen');
    if (RØYK.some(q => q.til > tid && avst(q, s) <= R.røyk.radius)) d.push('i røyk');
    if (s.egetValg && tid - s.egetValg.t < 180) d.push(`kl. ${kl(s.egetValg.t)} av seg selv: ${s.egetValg.hva}${s.egetValg.grunn ? ' – ' + s.egetValg.grunn : ''}`);
    return d.join(' · ') || null;
  });
  const css = document.createElement('style');
  css.textContent = `#krigpanel{ position:fixed; right:10px; top:calc(var(--topp,58px) + 56px); z-index:31; display:none; width:min(360px,94vw); max-height:calc(100vh - var(--topp,58px) - 120px); overflow:auto; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; border-radius:6px; }
#krigpanel.på{ display:block; } #krigpanel h2{ margin:0 28px 6px 0; font-size:19px; } #krigpanel .rad{ margin:7px 0; } #krigpanel .rad button{ min-height:36px; padding:4px 12px; margin-right:6px; background:#2a2216; color:inherit; border:1px solid rgba(201,178,106,.55); border-radius:4px; font:inherit; cursor:pointer; } #krigpanel .rad button:hover:not(:disabled){ background:#3a2f1d; } #krigpanel small{ display:block; color:var(--ink-dim,#a99); margin-top:2px; }
#krigpanel .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
.krigliste{ margin:4px 0 8px; } .krigliste .rad{ display:flex; gap:8px; align-items:center; justify-content:space-between; padding:4px 0; border-top:1px solid rgba(201,178,106,.18); } .krigliste .rad small{ color:var(--ink-dim,#a99); display:block; } .krigliste button{ min-height:32px; white-space:nowrap; }
.krigliste .rad.fange{ flex-direction:column; align-items:stretch; } .krigknapper{ display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; } #leirmeny .krigknapper button, .krigknapper button{ flex:0 0 auto; width:auto; white-space:nowrap; margin:0; }`;
  document.head.appendChild(css);
  const P = document.createElement('div'); P.id = 'krigpanel'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Tiltak for laget'); document.body.appendChild(P);
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  let panelLag = null;
  function lukk() { P.classList.remove('på'); panelLag = null; }
  function velg(hva, s, tekst) { modus = { hva, lag: s }; logg(tekst); lukk(); skitten = true; }
  function visTiltak(s) {
    panelLag = s; P.innerHTML = ''; const q = lager(s), L = leir(), vedLeir = L && Math.hypot(s.x - L.x, s.y - L.y) <= 300;
    const rad = (tekst, fn, forkl, av, id) => { const b = el('button', { type: 'button', 'data-tiltak': id }, tekst); b.onclick = fn; if (av) { b.disabled = true; b.style.opacity = '.5'; } P.append(el('div', { klasse: 'rad' }, b, el('small', {}, forkl))); };
    const x = el('button', { klasse: 'lukk', type: 'button', 'aria-label': 'Lukk' }, '×'); x.onclick = lukk; P.append(x, el('h2', {}, 'Tiltak – ' + s.navn));
    rad('Kall inn artilleri …', () => velg('art', s, `Trykk i kartet der salven skal slå ned. ${s.navn} må se stedet.`), batterier().length ? 'Laget leder ilden fra rakettartilleriet over radioen. Målet må ligge der laget ser.' : 'Dere har ikke noe rakettartilleri.', !batterier().length || !harRadio(s), 'art');
    rad(`Legg røyk (${q.røyk})`, () => { api.røyk(s); visTiltak(s); visPanel(); }, `Røyk rundt laget i ${R.røyk.varer} min: mye vanskeligere å treffe, men dere skyter dårligere selv.`, q.røyk <= 0, 'røyk');
    rad(`Lysrakett (${q.lys})`, () => { api.lys(s); visTiltak(s); }, `Om natta ser alle kortere. Lysraketten gir dagslys innen ${R.lys.radius} m i ${R.lys.varer} min.`, q.lys <= 0, 'lys');
    rad(`Lag støy … (${q.støy})`, () => velg('støy', s, `Trykk i kartet der støyen skal være (høyst ${R.støy.kast} m fra laget). Fiender innen ${R.støy.hører / 1000} km kommer for å se.`), 'Lokker fiendens lag til et sted du velger – bort fra deg, eller inn i et bakhold.', q.støy <= 0, 'støy');
    rad(s.bakhold ? 'Avslutt bakholdet' : 'Legg bakhold ved vegen', () => { s.bakhold = !s.bakhold; if (s.bakhold) { s.sti = null; logg(`${s.navn} ligger i bakhold: fiendens kjøretøy som kommer innen ${R.bakhold.avstand} m, blir stoppet og kan tas.`); } visTiltak(s); visPanel(); skitten = true; }, 'Laget ligger stille og stopper fiendens kjøretøy som kjører forbi. De som sitter på, blir tatt på senga.', false, 'bakhold');
    if (vedLeir) rad('Fly ut med helikopter …', () => velg('heli', s, `Trykk i kartet der ${s.navn} skal settes av (høyst ${R.heli.radius / 1000} km fra leiren).`), `Helikopteret setter laget av der du peker (${kr(R.heli.pris)} per tur).`, !heliFins() || !!HELI, 'heliut');
    else rad('Hent med helikopter', () => { api.heliHent(s); lukk(); }, `Helikopteret henter laget og de sårede hjem til leiren (${kr(R.heli.pris)}).`, !heliFins() || !!HELI, 'helihjem');
    P.append(el('small', {}, 'Røyk, lys og støy fylles opp når laget står ved leiren.')); P.classList.add('på');
  }
  KROKER.lagKnapper.push((s, H) => { if (s.side !== 'blå' || s.karakter || s.ombord || s.iLufta || s.leirvakt) return; const b = knapp('Tiltak', panelLag === s, () => { if (panelLag === s) lukk(); else visTiltak(s); }); b.id = 'krigtiltak'; b.title = 'Artilleri, røyk, lys, støy, bakhold og helikopter'; H.appendChild(b); });
  const trykk = (X, Y) => {
    if (!modus) return false; const m = modus; modus = null; skitten = true; if (!levende(m.lag)) return true;
    if (m.hva === 'art') api.kallInn(m.lag, X, Y); else if (m.hva === 'støy') api.støy(m.lag, X, Y);
    else if (m.hva === 'heli') lagVindu([X - 100, Y - 100, X + 100, Y + 100], false).then(v => { if (Terreng.verdi(v, v.K, X, Y, 3) === 3) logg('Helikopteret kan ikke sette laget av i vann.'); else api.heliFly(m.lag, X, Y); }).catch(() => api.heliFly(m.lag, X, Y));
    return true;
  };
  KROKER.trykk.unshift(trykk); if (KROKER.trykk3d) KROKER.trykk3d.unshift(trykk);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { if (modus) { modus = null; skitten = true; } if (P.classList.contains('på')) lukk(); } });

  // ---------- Leir-menyen: etterretning og avtaler (fanen Mål) ----------
  const KILDE = { sett: 'sett av egne', radio: 'oppfanget på radio', avhør: 'fra avhør', drone: 'sett av drone', speidere: 'fra speidere' };
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp: kn }) => {
    if (!klar || !leir()) return;
    // (runde 4) fangene: avhør, bytte, arbeid, behandling og rekruttering
    if (T.fanger.length || T.tatt.length) {
      hode.append(e('h3', { 'data-fane': 'mål' }, 'Fanger'));
      const fb = e('div', { klasse: 'krigliste', id: 'krigfanger' }), FA = R.fange, oppg = o => (window.FolkRegler && FolkRegler.OPPGAVE[o] ? FolkRegler.OPPGAVE[o].navn : o).toLowerCase();
      if (T.forslag) { const q = T.forslag, v = e('div', {}, `${fnavn(q.side)} foreslår et fangebytte: ${q.n} mot ${q.n}`), h = e('div', { klasse: 'krigknapper' });
        v.append(e('small', {}, `De gir tilbake ${q.n} av dine og får like mange av sine. Svar innen ${Math.max(1, Math.round((q.til - tid) / 60))} t.`));
        h.append(kn('Godta', () => api.svarForslag(true), { 'data-krig': 'forslag-ja' }), kn('Avslå', () => api.svarForslag(false), { 'data-krig': 'forslag-nei' }));
        fb.append(e('div', { klasse: 'rad fange' }, v, h)); }
      T.fanger.forEach((f, i) => {
        const st = [f.til ? `avhøres, ferdig om ${Math.max(1, Math.round(f.til - tid))} min` : f.avhørt ? 'avhørt' : 'ikke avhørt – de vet hvor lagene deres står'];
        if (f.arbeid) { const af = fangeArbeidF(f.arbeid), v = api.vakter();
          st.push(`arbeider på «${oppg(f.arbeid)}» (${af > 1 ? `+${Math.round((af - 1) * 100)} % fart` : 'ingen av dine er der – gir ingenting ennå'}) · ${v} ${v === 1 ? 'vakt' : 'vakter'} – med få vakter kan de rømme`); }
        if (f.god) st.push(K.kanSpørres(f, tid) ? 'god behandling – kan spørres om å bli med' : f.nei > tid && (f.godMin || 0) >= FA.døgn * 1440 ? `sa nei – spør igjen om ${Math.max(1, Math.round((f.nei - tid) / 60))} t` : `god behandling i ${String(Math.round((f.godMin || 0) / 144) / 10).replace('.', ',')} av ${FA.døgn} døgn`);
        const tatt = egneTatt(f.side).length, v = e('div', {}, `${fangeTekst(f.n)} fra ${fnavn(f.side)}`); v.append(e('small', {}, st.join(' · ')));
        const h = e('div', { klasse: 'krigknapper' });
        if (!f.til && !f.avhørt) h.append(kn('Avhør', () => api.avhør(i), { 'data-krig': 'avhør', title: 'Fangene forteller hvor lagene deres står' }));
        if (!f.til) h.append(kn(`Bytt (${kr(K.byttePris(f.n))})`, () => api.byttPenger(i), { 'data-krig': 'bytt', title: `${fnavn(f.side)} kjøper sine tilbake` }));
        if (!f.til && tatt) h.append(kn(`Bytt mot dine (${Math.min(tatt, f.n)})`, () => api.byttEgne(i), { 'data-krig': 'byttegne', title: 'Én mot én: dine som er tatt, kommer hjem' }));
        h.append(kn(`Arbeid: ${f.arbeid ? oppg(f.arbeid) : 'nei'}`, () => api.arbeid(i), { 'data-krig': 'arbeid', title: 'En fange er en halv arbeider der dine arbeider – men kan rømme' }));
        h.append(kn(f.god ? 'God behandling: på' : 'God behandling: av', () => api.behandling(i), { 'data-krig': 'god', title: `${FA.mat} rasjon per fange per døgn. Etter ${FA.døgn} døgn kan de spørres om å bli med.` }));
        if (K.kanSpørres(f, tid)) h.append(kn('Spør om de vil bli med', () => api.spør(i), { 'data-krig': 'spør' }));
        h.append(kn('Sett fri', () => api.settFri(i), { 'data-krig': 'fri', title: 'Blir husket: en våpenhvile med dem blir billigere' }));
        fb.append(e('div', { klasse: 'rad fange' }, v, h)); });
      if (T.tatt.length) { const per = {}; for (const q of T.tatt) (per[q.side] = per[q.side] || []).push(q.navn.split(' ')[0]);
        fb.append(e('small', {}, 'Dine som er tatt til fange: ' + Object.entries(per).map(([sd, n]) => `${n.join(', ')} (hos ${fnavn(sd)})`).join('; ') + '. Bytt dem mot fanger fra samme side.')); }
      hode.append(fb);
    }
    hode.append(e('h3', { 'data-fane': 'mål' }, 'Etterretning og avtaler'));
    const boks = e('div', { klasse: 'krigliste', id: 'krigliste' });
    const rad = (tekst, små, ...kn2) => { const v = e('div', {}, tekst); if (små) v.append(e('small', {}, små)); const h = e('div', {}); h.append(...kn2); boks.append(e('div', { klasse: 'rad' }, v, h)); };
    const E = T.etter.slice().sort((a, b) => b.t - a.t).slice(0, 6);
    for (const m of E) rad(m.navn, `${KILDE[m.kilde] || m.kilde}, ${K.alder(tid - m.t)}${m.hva ? ' – ' + m.hva : ''}`, kn('Vis', () => { kam.x = m.x; kam.y = m.y; kam.m = Math.min(kam.m, 8); skitten = true; }, { 'data-krig': 'vis' }));
    if (!E.length) boks.append(e('small', {}, 'Ingen meldinger om fienden ennå. Speidere, droner, en radiomast og fanger du avhører, gir etterretning.'));
    (window.DRONER || []).forEach((d, i) => rad(d.navn, d.fase === 'flyr' ? 'på veg til målet' : 'over målet – varsler om lag den ser', kn('Se gjennom', () => api.seDrone(i), { 'data-krig': 'drone' })));
    if (window.AI && AI.fred) for (const side of AI.sider) { const på = (T.fred[side] || 0) > tid;
      rad(`Våpenhvile med ${fnavn(side)}`, på ? `varer ${Math.round((T.fred[side] - tid) / 60 * 10) / 10} t til` : `${kr(api.fredPris(side))} for ${R.fred.varer / 60} timer – de lar deg være, så du kan ta den andre`,
        på ? kn('Bryt', () => api.brytFred(side), { 'data-krig': 'bryt-' + side }) : kn('Avtal', () => api.fred(side), { 'data-krig': 'fred-' + side })); }
    for (const by of byer()) { const n = T.vern[by.e.id]; if (n > 0) rad(`Bygdevernet i ${by.e.navn}`, `${n} mann holder stedet`, kn(`Avtale (${kr(K.vernPris(by.e.folk))})`, () => api.vernAvtale(by.e.id), { 'data-krig': 'vern' }));
      const b = T.beleiring[by.e.id]; if (b !== undefined) rad(`Beleiring av ${by.e.navn}`, `${Math.round(b / 60 * 10) / 10} t – ${K.beleiringNå(b) === 'svekket' ? 'garnisonen er svekket' : 'garnisonen holder ennå'}`); }
    hode.append(boks);
  });

  // ---------- kartet ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    const m = kam.m, px = X => (X - vx0) / m, py = Y => (vy1 - Y) / m; g.save();
    for (const q of RØYK) { g.fillStyle = 'rgba(210,210,205,.5)'; g.beginPath(); g.arc(px(q.x), py(q.y), Math.max(5, R.røyk.radius / m), 0, 6.283); g.fill(); }
    for (const q of LYS) { g.strokeStyle = 'rgba(255,240,170,.7)'; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath(); g.arc(px(q.x), py(q.y), R.lys.radius / m, 0, 6.283); g.stroke(); g.setLineDash([]); }
    for (const q of STØY) { g.strokeStyle = 'rgba(255,200,90,.9)'; g.lineWidth = 2; for (const r of [8, 15, 22]) { g.beginPath(); g.arc(px(q.x), py(q.y), r, -.9, .9); g.stroke(); } }
    // etterretning: lag du ikke ser nå, der de sist ble meldt
    g.font = '13px "Cormorant Garamond", serif'; g.textAlign = 'center';
    // (runde 8, «lappene til fiendelag ligger oppå hverandre»: «Ravnsunds 3. lag · nå» oppå «… 4. lag») lag som ikke finnes lenger
    // (en røverbølge som er over), tegnes ikke; merkene som ligger nær hverandre på skjermen (KLYNGE px), får ÉN lapp – «Ravnsund: 2 lag · nå» –
    // og lappene går gjennom Etikett med fiendens prioritet, så de ikke legges oppå andre navn. Claudes forslag: KLYNGE = 46 px.
    const KLYNGE = 46, merker = [];
    for (const q of T.etter) { const e = ENHETER.find(s => s.navn === q.navn); if (!e || synlig(e)) continue; const x = px(q.x), y = py(q.y); if (x < -40 || y < -40 || x > g.canvas.width + 40 || y > g.canvas.height + 40) continue;
      g.strokeStyle = sidefarge(q.side, 'lys') || '#b5503d'; g.fillStyle = 'rgba(20,16,10,.55)'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#e7dcc3'; g.fillText('?', x, y + 4); merker.push({ q, x, y }); }
    // (lappene tegnes av spill/kartlapper.js over alle navn – her bare når den mangler)
    if (m < 40 && !window.KartLapper) for (const k of K.klynger(merker.map(o => ({ x: o.x, y: o.y, side: o.q.side, navn: o.q.navn, t: o.q.t })), KLYNGE)) {
      const t = K.klyngeTekst(k, tid, window.Fraksjoner && Fraksjoner.FRAKSJONER[k.side] ? Fraksjoner.FRAKSJONER[k.side].navn : null);
      g.font = '13px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillStyle = '#e7dcc3'; g.fillText(t, k.x, k.y + 23); }
    // beleirede tettsteder
    for (const by of byer()) { if (T.beleiring[by.e.id] === undefined) continue; const c = midt(by); g.strokeStyle = 'rgba(120,170,225,.85)'; g.lineWidth = 2; g.setLineDash([10, 7]); g.beginPath(); g.arc(px(c.x), py(c.y), R.beleiring.ring / m, 0, 6.283); g.stroke(); g.setLineDash([]); }
    // helikopteret
    if (HELI) { const x = px(HELI.x), y = py(HELI.y); g.fillStyle = '#e7dcc3'; g.strokeStyle = '#1c170f'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0, 6.283); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - 12, y - 9); g.lineTo(x + 12, y - 9); g.stroke(); g.fillStyle = '#1c170f'; g.font = 'bold 10px sans-serif'; g.fillText('H', x, y + 3.5); }
    // bakhold og fanger ved laget, og hvor du peker
    for (const s of egne()) { if (!s.bakhold && !s.fanger) continue; const x = px(s.x), y = py(s.y); g.font = '12px "Cormorant Garamond", serif'; g.fillStyle = '#e7dcc3'; g.fillText([s.bakhold ? 'bakhold' : '', s.fanger ? `${s.fanger.n} fanger` : ''].filter(Boolean).join(' · '), x, y - 18); }
    g.restore();
  });

  Object.assign(api, { slapp: nr => !!(T.raid[nr] && T.raid[nr].slapp), T: () => T, lagre, les, røykSkyer: RØYK, lysSkyer: LYS, vm, fører, visTiltak, lukk, modus: () => modus, settModus: (hva, s) => { modus = hva ? { hva, lag: s } : null; },
    nullstill: () => { T = ny(); RØYK.length = 0; LYS.length = 0; STØY.length = 0; HELI = null; modus = null; vernAktive = []; fredTilAI(); }, steg: { egneGirSeg, husSjekk, overgivelser, beleiringer, røvere, vern, etterretning, droner, bakhold, heliSteg } });
  window.KrigSpill = api;
})();
