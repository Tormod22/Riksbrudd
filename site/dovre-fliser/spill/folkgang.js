/* Riksbrudd – FOLK SOM GÅR (fase F2 i docs/plan-selskap-okonomi.md, kapittel 6.2, 6.3, 6.7, 6.8 og 6.9): regler uten DOM.
 * Node: require('./folkgang') (henter vei.js, leir.js og byggesett.js selv); nettleser: globalThis.Folkgang (lastes rett etter vei.js).
 *
 * Hver person i leiren har en PLASS (x, y, etasje e, hus), et MÅL og en VEI dit (fra spill/vei.js). Målet kommer av døgnplanen
 * (spill/jobber.js: arbeid, mat, søvn, fri) og jobben:
 *   arbeid -> arbeidsplassen: byggeplassen, maskinen, vakttårnet, kjøkkenet, sykestua, verkstedet, kontrollrommet, hogstfeltet, haugen
 *   mat    -> kjøkkenet (kantina), ellers bålet / leirens midte
 *   søvn   -> sin egen seng (brakkene og de egenbygde rommene med senger, Leir.effekt/Byggesett.rom), ellers «sover ute» ved bålet
 *   fri    -> bålet / fellesplassen ved leirens midte
 * Inne i leiren går folk etter veikartene (Vei.veikart for byggene og rommene – felles for alle som skal samme sted, Vei.finn for et punkt).
 * Utenfor leirens rutenett (hogstfeltet, haugene) går de rett fram, som lagene i terrenget.
 * ARBEIDET DER DE STÅR: en person bidrar til jobben bare når hen er FRAMME (stedF). Står hen fast (Vei.kanNå), får jobben grunnen.
 * Oppdateres i spilltid (steg med dt i sekunder) – visningen kaller det 4 ganger i sekundet, ikke hver ramme.
 * Alle tall er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const hent = n => { try { return require(n); } catch (e) { return null; } };
  const Vei = rot.Vei || (typeof require === 'function' ? hent('./vei.js') : null);
  const Leir = rot.Leir || (typeof require === 'function' ? hent('./leir.js') : null);
  const BS = rot.ByggesettRegler || (typeof require === 'function' ? hent('./byggesett.js') : null);

  // ---------- REGLER (alle tallene er Claudes forslag) ----------
  const REGLER = {
    // gangfart (m/s); syke går saktere
    fart: 1.3, sykFart: .7,
    // framme når så nær målet (m) – veikartenes mål er midten av en rute på 1,2 m foran døra
    framme: 2.2,
    // hvor ofte visningen kaller steg (sekunder i spilltid ved 1×)
    takt: .25,
    // bålet / fellesplassen: en ring rundt leirens midte (m)
    bål: [3.5, 7.5],
    // så langt unna leirens midte regnes en byggeplass som en utpost: leir.js regner reisen dit (Leir.reise), så den teller som framme
    utpost: 300,
    // høyst så mange nye veier per steg (resten venter til neste steg – ingen topp på 100 ms når 200 folk legger seg samtidig)
    planPerSteg: 40,
    // … og høyst så mange ms med veisøk per steg (et nytt veikart tar 3–15 ms; de neste venter til neste steg)
    planMs: 8,
    // (F5) LANGT UNNA: mål over så mange meter unna (utpost, sagbruk i en by, hogstfelt) går de ikke ekte – reisen regnes med reisetid
    // (rett linje i reiseFart m/s; samme gangfart nå, en bil kan gi mer senere). Utpostens område: hogst/riving innen utpostR m.
    langt: 3000, reiseFart: 1.3, utpostR: 2000,
    // (F5) ORDRE TIL ÉN PERSON: «Gjør dette nå» varer så mange spillminutter, så tar jobbtavla over igjen
    ordreMin: 60,
    // (F5) trafikkartet får et punkt per så mange meter personen går
    sporSteg: 2,
  };
  // stedene folk kan gå til (Vei.MÅL har de samme byggtypene) og hva de heter i teksten
  const STED = {
    vakt: { bygg: ['vakttårn'], navn: 'vakttårnet', gjør: 'står vakt' },
    kjøkken: { bygg: ['kantine', 'feltkjøkken', 'kjøkken'], rom: ['kjøkken'], navn: 'kjøkkenet', gjør: 'lager mat' },
    stell: { bygg: ['sykestue'], navn: 'sykestua', gjør: 'steller de syke' },
    verksted: { bygg: ['verksted'], rom: ['verksted'], navn: 'verkstedet', gjør: 'arbeider i verkstedet' },
    overvåking: { bygg: ['kontrollrom'], navn: 'kontrollrommet', gjør: 'ser gjennom kameraene' },
    frakt: { bygg: ['lagertelt', 'container'], rom: ['lager', 'bod'], navn: 'lageret', gjør: 'ordner lageret' },
  };
  // byggene folk går INN i når de er framme (3D setter dem på gulvet inne; 2D viser dem ikke ute)
  const INNE = new Set(['kontrollrom', 'kjøkken', 'sykestue', 'verksted', 'brakke']);
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const r1 = v => Math.round(v * 10) / 10;

  function ny() { return { pers: {}, kartV: -1, senger: null, sengSig: '', ms: 0, ordre: {}, hendelser: [], ute: {} }; }

  // ---------- leirens bygg ----------
  const ferdigB = b => Leir && Leir.BYGG[b.type] && !Leir.BYGG[b.type].del && Leir.virker(b);
  // inngangen: midt foran (fronten mot +x), som målene i vei.js
  function inngang(b) { const B = Leir.BYGG[b.type], c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), u = (B && B.fot ? B.fot[1] : 3) + .9; return { x: b.x + u * c, y: b.y + u * s }; }
  const navnB = b => (Leir && Leir.BYGG[b.type] ? Leir.BYGG[b.type].navn.toLowerCase() : b.type);
  // rommene i byggesettet (bruk, senger) – huskes per kart
  function rommene(ctx) { if (!BS || !ctx.L) return []; try { return BS.rom(BS.fraLeir(ctx.L, Leir), ctx.L.romBruk).filter(r => r.brukbart); } catch (e) { return []; } }
  const romPunkt = (ctx, r) => { const o = (ctx.L && ctx.L.byggesett) || { ox: ctx.leir.x, oy: ctx.leir.y }, G = BS ? BS.G : 2.4; return { x: o.ox + r.ci * G, y: o.oy + r.cj * G, e: r.etasje + 1, hus: 'leir' }; };

  // ---------- sengene: hver person får sin seng (de som har vært lengst i gjengen først, som i folk.js) ----------
  // Gir en liste med plasser [{ k ('id:<brakke>' | 'rom:<nøkkel>'), x, y, e, hus, navn, bygg }]
  function senger(ctx, sm) {
    const ut = [];
    for (const b of ctx.L.bygg) { if (b.type !== 'brakke' || !ferdigB(b)) continue; const n = Leir.effekt(b).plasser || 0, p = inngang(b);
      for (let i = 0; i < n; i++) ut.push({ k: 'id:' + b.id, x: p.x, y: p.y, navn: 'brakka', bygg: b.id, inne: 'brakke' }); }
    for (const r of sm.rom) { if (!(r.senger > 0)) continue; const p = romPunkt(ctx, r); for (let i = 0; i < r.senger; i++) ut.push({ k: 'rom:' + r.nøkkel, ...p, navn: 'det egenbygde huset' }); }
    return ut;
  }

  // ---------- målet for én person ----------
  // Gir { k (nøkkel – samme nøkkel = samme mål), x, y, e, hus, kart ('id:..'/'rom:..' = felles veikart, ellers null), navn (stedet), gjør (når hen er framme),
  //       regnet (teller som framme: en utpost der leir.js regner reisen, eller frakten der ressurser.js regner turene), inne (byggtype folk går inn i), bygg (id) }
  function målFor(p, i, hva, ctx, sm) {
    const leir = ctx.leir, bål = (k, tekst) => { const a = hash(p.id, 11) * 6.283, r = REGLER.bål[0] + hash(p.id, 13) * (REGLER.bål[1] - REGLER.bål[0]);
      return { k: 'bål:' + p.id, x: leir.x + Math.cos(a) * r, y: leir.y + Math.sin(a) * r, navn: 'bålet', gjør: tekst || k }; };
    const tilBygg = (b, gjør, navn) => { const q = inngang(b); return { k: 'id:' + b.id, kart: 'id:' + b.id, x: q.x, y: q.y, navn: navn || navnB(b), gjør, inne: INNE.has(b.type) ? b.type : null, bygg: b.id }; };
    const tilRom = (r, gjør, navn) => ({ k: 'rom:' + r.nøkkel, kart: 'rom:' + r.nøkkel, ...romPunkt(ctx, r), navn, gjør });
    // nærmeste av byggene av typene (eller et rom med bruken), fordelt etter tur når det er flere
    const sted = (D, nr) => { const B = ctx.L.bygg.filter(b => D.bygg.includes(b.type) && ferdigB(b)); if (B.length) return tilBygg(B[nr % B.length], D.gjør, D.navn);
      const R = (D.rom || []).length ? sm.rom.filter(r => D.rom.includes(r.bruk)) : []; return R.length ? tilRom(R[nr % R.length], D.gjør, D.navn) : null; };
    if (hva === 'borte') return null;
    // (F5) UTPOST: personen hører til en utpost langt unna (ctx.utpost(p) -> { id, x, y, navn, seng(p) }): arbeid, mat, søvn og fri der
    const U = ctx.utpost ? ctx.utpost(p) : null; if (U) return utpostMål(p, hva, U, ctx);
    // (F3) bæring og bruksplassene ved maskinene (spill/baering.js): ctx.mål(p, hva) gir et mål – eller ingenting, så gjelder reglene under
    if (ctx.mål) { const q = ctx.mål(p, hva); if (q) return q; }
    if (hva === 'søvn' || hva === 'syk') {
      if (hva === 'syk') { const s = sted(STED.stell, 0); if (s) return { ...s, gjør: 'ligger på sykestua' }; }
      const seng = sm.seng.get(p.id);
      if (seng) return { k: seng.k, kart: seng.k, x: seng.x, y: seng.y, e: seng.e, hus: seng.hus, navn: 'senga i ' + seng.navn, gjør: hva === 'syk' ? 'hviler i senga' : 'sover', inne: seng.inne || null, bygg: seng.bygg };
      return bål('sover ute (ingen seng)');
    }
    if (hva === 'mat') {
      // langt ute (hogstfelt, utpost over REGLER.utpost m unna): matpakke der de arbeider – ingen tur hjem til lunsj
      if (p.oppgave !== 'fri') { const A = målFor(p, i, 'arbeid', ctx, sm); if (A && Math.hypot(A.x - leir.x, A.y - leir.y) > REGLER.utpost) return { ...A, kart: A.kart, gjør: 'spiser matpakka', inne: null }; }
      const s = sted(STED.kjøkken, p.id); return s ? { ...s, gjør: 'spiser' } : bål('spiser ved bålet'); }
    if (hva !== 'arbeid' || p.oppgave === 'fri') return bål('har fri');
    const o = p.oppgave, nr = sm.nr.get(p.id) || 0;
    if (o === 'bygg') {
      const J = sm.jobber; if (!J.length) return bål('venter – ingenting å bygge');
      const j = J[Math.floor(nr / 2) % J.length], b = j.b, ord = { bygg: 'bygger', oppgrader: 'oppgraderer', flytt: 'flytter', reparer: 'reparerer' }[j.hva] || 'bygger';
      const D = Leir.BYGG[b.type], gjør = `${ord} ${navnB(b)}`;
      const lang = j.reise > 0 || Math.hypot(b.x - leir.x, b.y - leir.y) > REGLER.utpost;
      // byggesettets deler: til delen selv (den står ikke i veien før den er ferdig); ellers inngangen foran bygget
      if (D && D.del) return { k: 'del:' + b.id, x: b.x, y: b.y, navn: 'byggeplassen', gjør, regnet: lang, bygg: b.id };
      if (D && D.linje && b.punkter) { const q = b.punkter[nr % b.punkter.length]; return { k: 'linje:' + b.id + ':' + (nr % b.punkter.length), x: q[0], y: q[1], navn: 'byggeplassen', gjør, regnet: lang, bygg: b.id }; }
      return { ...tilBygg(b, gjør, 'byggeplassen'), inne: null, regnet: lang };
    }
    if (o === 'maskin') { const M = ctx.L.bygg.filter(b => Leir.BYGG[b.type] && Leir.BYGG[b.type].maskin && ferdigB(b)); if (!M.length) return bål('venter – ingen maskin');
      const b = M[nr % M.length]; return { ...tilBygg(b, 'kjører ' + navnB(b), navnB(b)), inne: null }; }
    if (o === 'hogst' || o === 'riving') { const A = (ctx.RJ || []).filter(q => q.type === o && !q.stoppet && q.gjort < q.arbeid);
      if (!A.length) return bål('venter – ' + (o === 'hogst' ? 'ingen hogstfelt' : 'ingen hus å rive'));
      const q = A[nr % A.length], a = hash(p.id, 21) * 6.283, r = o === 'hogst' ? Math.min(12, (q.r || 10) * .6) : 4;
      return { k: o + ':' + q.id, x: q.x + Math.cos(a) * r, y: q.y + Math.sin(a) * r, navn: o === 'hogst' ? 'hogstfeltet' : 'huset som rives', gjør: o === 'hogst' ? 'feller trær' : 'river huset' }; }
    if (o === 'frakt') { const A = (ctx.RJ || []).filter(q => q.avst > (ctx.nær || 150) && q.frakt !== 'lastebil' && q.haug && Object.values(q.haug).some(v => v > .01));
      if (A.length) { const q = A[nr % A.length]; return { k: 'haug:' + q.id, x: q.x, y: q.y, navn: 'haugen', gjør: 'bærer materialer til leiren', regnet: true }; } }
    const D = STED[o]; if (D) { const s = sted(D, nr); if (s) return o === 'vakt' ? { ...s, inne: 'vakttårn' } : s; }
    if (o === 'vakt') { const a = hash(p.id, 5) * 6.283; return { k: 'post:' + p.id, x: leir.x + Math.cos(a) * 14, y: leir.y + Math.sin(a) * 14, navn: 'vaktposten', gjør: 'står vakt' }; }
    return bål('venter – ' + (D ? 'trenger ' + D.navn : 'ingen arbeidsplass'));
  }

  // ---------- utposten (F5) ----------
  // Målet for en person som hører til utposten U. jobbDer = arbeidet teller i leirens oppgave (hogst/riving ved utposten);
  // ellers er arbeidet utpostens eget (Utpost.steg regner det), og personen teller ikke som framme i leirens oppgave (stedF).
  function utpostMål(p, hva, U, ctx) {
    const a = hash(p.id, 31) * 6.283, r = 3 + hash(p.id, 37) * 6, her = { x: U.x + Math.cos(a) * r, y: U.y + Math.sin(a) * r };
    const m = (k, gjør, o = {}) => ({ k: 'utpost:' + U.id + ':' + k + ':' + p.id, ...her, navn: U.navn, gjør, utpost: U.id, ...o });
    if (hva === 'søvn' || hva === 'syk') return m('seng', U.seng && U.seng(p) ? (hva === 'syk' ? 'hviler i utposten' : 'sover i utposten') : 'sover ute ved utposten (ingen seng)');
    if (hva === 'mat') return m('mat', 'spiser i utposten');
    if (hva !== 'arbeid' || p.oppgave === 'fri') return m('fri', 'har fri i utposten');
    if (p.oppgave === 'hogst' || p.oppgave === 'riving') {
      const A = (ctx.RJ || []).filter(q => q.type === p.oppgave && !q.stoppet && q.gjort < q.arbeid && Math.hypot(q.x - U.x, q.y - U.y) <= REGLER.utpostR);
      if (A.length) { const q = A[p.id % A.length], b = hash(p.id, 21) * 6.283, rr = p.oppgave === 'hogst' ? Math.min(12, (q.r || 10) * .6) : 4;
        return { k: p.oppgave + ':' + q.id, x: q.x + Math.cos(b) * rr, y: q.y + Math.sin(b) * rr, navn: p.oppgave === 'hogst' ? 'hogstfeltet ved ' + U.navn : 'huset som rives ved ' + U.navn,
          gjør: p.oppgave === 'hogst' ? 'feller trær' : 'river huset', utpost: U.id, jobbDer: true }; }
    }
    return m('arbeid', p.oppgave === 'vakt' ? 'holder vakt ved utposten' : 'arbeider ved utposten', { utpostArbeid: true });
  }

  // ---------- veien ----------
  const iNett = (K, x, y) => { const L = K && K.lagene[0]; return !!L && x >= L.x0 && y >= L.y0 && x <= L.x0 + L.W * L.s && y <= L.y0 + L.H * L.s; };
  // planlegg veien til målet: s.vei = punktene, s.fast = grunnen når hen ikke kommer fram
  function planlegg(s, M, K) {
    s.vei = []; s.vi = 0; s.fast = null; s.inn = false; s.reise = null;
    if (!M) return;
    // (F5) langt unna: ingen veisøk – reisen regnes (rett linje, reisetid = avstand / reiseFart)
    const d = Math.hypot(M.x - s.x, M.y - s.y); if (d > REGLER.langt) { s.vei = [{ x: M.x, y: M.y, e: M.e || 1, hus: M.hus }]; s.reise = { m: d, T: d / REGLER.reiseFart }; return; }
    const målInne = iNett(K, M.x, M.y), herInne = iNett(K, s.x, s.y);
    if (!K || !Vei || !målInne) { s.vei = [{ x: M.x, y: M.y, e: 1 }]; return; }
    // utenfor leirens rutenett: rett mot målet til hen er inne, så etter veikartet
    if (!herInne) { s.vei = [{ x: M.x, y: M.y, e: M.e || 1 }]; s.inn = true; return; }
    const fra = { x: s.x, y: s.y, e: s.e || 1, hus: s.hus };
    let r = null;
    if (M.kart && K.mål.has(M.kart)) { const V = Vei.veikart(M.kart, { kart: K }); r = V ? V.vei(fra) : null; }
    else r = Vei.finn(fra, { x: M.x, y: M.y, e: M.e || 1, hus: M.hus }, { kart: K });
    if (r && r.ok) { s.vei = r.punkter.slice(); if (!M.kart) s.vei.push({ x: M.x, y: M.y, e: M.e || 1, hus: M.hus }); s.lengde = r.lengde; return; }
    // står fast: grunnen fra Vei.kanNå («rommet har ingen dør», «døra er låst», «ingen vei dit» …)
    let g = r && r.grunn; try { const k = Vei.kanNå({ x: M.x, y: M.y, e: M.e || 1, hus: M.hus }, { kart: K }); if (!k.ok && k.grunn) g = k.grunn; } catch (e) { /* bruk grunnen over */ }
    s.fast = g || Vei.GRUNN.vei;
  }
  // gå langs veien så langt dt sekunder rekker; gir meter gått
  // spor(x, y, meter) (F5, trafikkartet): et punkt for hver REGLER.sporSteg meter langs veien
  function gå(s, dt, fart, spor) {
    let rest = fart * dt, gått = 0;
    while (rest > 1e-6 && s.vi < s.vei.length) { const q = s.vei[s.vi], dx = q.x - s.x, dy = q.y - s.y, d = Math.hypot(dx, dy);
      if (d > 1e-6) s.a = Math.atan2(dy, dx);
      const l = Math.min(d, rest), x0 = s.x, y0 = s.y;
      if (d <= rest) { s.x = q.x; s.y = q.y; if (q.e) s.e = q.e; s.hus = q.hus; s.vi++; rest -= d; gått += d; }
      else { s.x += dx / d * rest; s.y += dy / d * rest; gått += rest; rest = 0; }
      if (spor && l > 0 && d > 1e-6) { s.sporRest = (s.sporRest || 0) + l; let k = 0; const ux = dx / d, uy = dy / d;
        while (s.sporRest >= REGLER.sporSteg && k < 400) { s.sporRest -= REGLER.sporSteg; const t = l - s.sporRest; spor(x0 + ux * t, y0 + uy * t, REGLER.sporSteg); k++; } } }
    return gått;
  }

  // ---------- ett steg ----------
  // ctx: { F (folket), L (leiren), leir { x, y } (midten), hva(p) -> 'arbeid' | 'mat' | 'søvn' | 'fri' | 'syk' | 'borte' (døgnplanen),
  //        kart (Vei-kartet for leiren; uten kart går alle rett fram), RJ (hogst/riving/hauger fra RessursSpill), nær,
  //        mål(p, hva) -> mål eller null (F3: bærerne og operatørene, spill/baering.js) }
  // dt i sekunder spilltid. Gir G.
  function steg(G, ctx, dt) {
    const t0 = Date.now(), F = ctx.F, K = ctx.kart || null; if (!F || !ctx.L || !ctx.leir) return G;
    const ny = K ? K.versjon : -1, kartNytt = ny !== G.kartV; G.kartV = ny;
    // det som er felles for alle i dette steget: byggejobbene, rommene, sengene, rekkefølgen per jobb
    const sig = ny + '|' + ctx.L.bygg.length + '|' + ctx.L.bygg.reduce((a, b) => a + (Leir.virker(b) ? b.id : -b.id), 0);
    if (sig !== G.sengSig || !G.rom) { G.sengSig = sig; G.rom = rommene(ctx); G.senger = null; }
    const sm = { rom: G.rom, jobber: Leir.jobber(ctx.L).slice(0, Math.max(1, Leir.byggelag(ctx.L))), nr: new Map(), seng: new Map() };
    if (!G.senger) G.senger = senger(ctx, sm);
    F.personer.forEach((p, i) => { if (i < G.senger.length) sm.seng.set(p.id, G.senger[i]); });
    const tell = {}; for (const p of F.personer.slice().sort((a, b) => a.id - b.id)) { tell[p.oppgave] = (tell[p.oppgave] || 0) + 1; sm.nr.set(p.id, tell[p.oppgave] - 1); }
    const finnes = new Set(), ute = {}; let planer = 0;
    F.personer.forEach((p, i) => {
      finnes.add(p.id); let s = G.pers[p.id];
      const O = G.ordre[p.id];
      // (F5) ORDRE «Gjør dette nå»: arbeid nå (også utenom arbeidstida) til tida er ute – så tar jobbtavla over igjen
      if (O && O.type === 'gjør' && ctx.tid !== undefined && ctx.tid >= O.til) { delete G.ordre[p.id]; G.hendelser.push({ type: 'ferdig', id: p.id, ordre: O }); }
      const Oo = G.ordre[p.id];
      const ekteHva = p.borte ? 'borte' : ctx.hva ? ctx.hva(p) : p.oppgave === 'fri' ? 'fri' : 'arbeid';
      const hva = Oo && Oo.type === 'gjør' && !p.borte ? 'arbeid' : ekteHva;
      // ny person: starter ved bålet (et nytt spill, en rekrutt)
      if (!s) { const a = hash(p.id, 3) * 6.283, r = 2 + hash(p.id, 4) * 6; s = G.pers[p.id] = { id: p.id, x: ctx.leir.x + Math.cos(a) * r, y: ctx.leir.y + Math.sin(a) * r, e: 1, hus: 'leir', a, vei: [], vi: 0, mk: null, fast: null, framme: false, går: false, gått: 0 }; }
      s.hva = hva; s.oppgave = p.oppgave;
      // (F5) ORDRE «Gå hit»: til punktet – det overstyrer jobbtavla til hen er framme
      const M = Oo && Oo.type === 'gå' && !p.borte ? { k: 'ordre:' + Oo.n, x: Oo.x, y: Oo.y, e: Oo.e || 1, hus: Oo.hus, navn: 'stedet du pekte på', gjør: 'er framme der du sa', ordre: true } : målFor(p, i, hva, ctx, sm); s.mål = M;
      s.ordre = !!Oo; s.utpost = M && M.utpost !== undefined ? M.utpost : null;
      const mk = M ? M.k + '|' + r1(M.x) + ',' + r1(M.y) : null;
      if ((mk !== s.mk || kartNytt || s.nyKart || (s.inn && K && iNett(K, s.x, s.y))) && planer < REGLER.planPerSteg && (Date.now() - t0 < REGLER.planMs || !planer)) { s.mk = mk; s.nyKart = false; planlegg(s, M, K); planer++; }
      else if (kartNytt) s.nyKart = true;
      // planlagt: veien er regnet for dette målet (ellers venter hen på sin tur – planPerSteg/planMs)
      const fart = (p.helse < .4 ? REGLER.sykFart : REGLER.fart), planlagt = s.mk === mk;
      const g = M && planlagt && !s.fast ? gå(s, dt, s.reise ? REGLER.reiseFart : fart, s.reise ? null : ctx.spor) : 0; s.går = g > 1e-3; s.gått += g;
      const ved = M && planlagt && s.vi >= s.vei.length && (M.kart ? true : Math.hypot(M.x - s.x, M.y - s.y) <= REGLER.framme);
      s.framme = !!M && !s.fast && (ved || (!!M.regnet && planlagt));
      s.ved = !!M && !s.fast && ved;
      s.inne = s.ved && M.inne ? M.inne : null;
      if (s.ved) s.reise = null;
      // ordren er utført: framme der spilleren pekte – eller hen står fast (grunnen går til visningen)
      if (Oo && Oo.type === 'gå' && planlagt) { if (s.ved) { delete G.ordre[p.id]; G.hendelser.push({ type: 'framme', id: p.id, ordre: Oo }); }
        else if (s.fast) { delete G.ordre[p.id]; G.hendelser.push({ type: 'fast', id: p.id, ordre: Oo, grunn: s.fast }); } }
      // utposten: hvem er der, hvem reiser, og arbeidstida som går med der (Utpost.steg bruker den)
      if (s.utpost !== null) { const u = ute[s.utpost] || (ute[s.utpost] = { her: 0, reiser: 0, arbeider: 0, arbeidSek: 0, reiseSek: 0, ider: [] }); u.ider.push(p.id);
        if (s.framme) u.her++; else u.reiser++;
        if (hva === 'arbeid' && p.oppgave !== 'fri') { if (s.framme && !s.går) { u.arbeider++; u.arbeidSek += dt; } else u.reiseSek += dt; } }
    });
    G.ute = ute;
    for (const id of Object.keys(G.pers)) if (!finnes.has(+id)) delete G.pers[id];
    for (const id of Object.keys(G.ordre)) if (!finnes.has(+id)) delete G.ordre[id];
    G.ms = Date.now() - t0;
    return G;
  }

  // ---------- det reglene gir videre ----------
  // Andelen av dem på oppgaven o som er i arbeidstida og FRAMME (1 når ingen er i arbeidstida – døgnplanen gir da 0 uansett)
  function stedF(G, F, o) {
    if (!G || !F) return 1; let n = 0, f = 0;
    // (en person som nettopp har fått ny oppgave, er ikke regnet ennå – telles ikke før neste steg)
    for (const p of F.personer) { if (p.oppgave !== o) continue; const s = G.pers[p.id]; if (!s || s.hva !== 'arbeid' || s.oppgave !== o) continue; n++;
      // (F5) ute på ordre, eller i en utpost med utpostens eget arbeid: bidrar ikke i leiren (hogst/riving ved utposten gjør det)
      if (s.framme && !s.ordre && !(s.utpost !== null && s.utpost !== undefined && !(s.mål && s.mål.jobbDer))) f++; }
    return n ? f / n : 1;
  }
  // Hva personen gjør nå og hvorfor: «går til byggeplassen – bygger brakke», «spiser», «sover», «står fast: rommet har ingen dør»
  function tekst(G, p) {
    const s = G && G.pers[p.id]; if (!s) return ''; const M = s.mål; if (!M) return p.borte ? 'borte fra leiren' : '';
    if (s.fast) return `står fast – kommer ikke til ${M.navn}: ${s.fast}`;
    if (s.ved || (M.regnet && s.framme && !s.går)) return M.gjør;
    if (s.reise) { const igjen = Math.max(0, Math.hypot(M.x - s.x, M.y - s.y) / REGLER.reiseFart / 60); return `reiser til ${M.navn} – ${M.gjør} (ca. ${igjen < 60 ? Math.max(1, Math.round(igjen)) + ' min' : (Math.round(igjen / 6) / 10).toString().replace('.', ',') + ' t'} igjen)`; }
    return `går til ${M.navn} – ${M.gjør}` + (M.regnet ? ' (regnes som framme: utpost)' : '');
  }
  // Jobbene der noen står fast: [{ type, navn (personene), grunn, sted }]
  function fast(G, F) {
    const ut = new Map(); if (!G || !F) return [];
    for (const p of F.personer) { const s = G.pers[p.id]; if (!s || !s.fast || s.hva !== 'arbeid') continue; const k = p.oppgave + '|' + s.fast;
      if (!ut.has(k)) ut.set(k, { type: p.oppgave, navn: [], grunn: s.fast, sted: s.mål ? s.mål.navn : '' }); ut.get(k).navn.push(p.navn); }
    return [...ut.values()];
  }
  // Oversikt for testene: hvor mange som er framme, går, står fast
  function oversikt(G) { const v = Object.values(G.pers); return { n: v.length, framme: v.filter(s => s.framme).length, går: v.filter(s => s.går).length, fast: v.filter(s => s.fast).length, ms: G.ms }; }

  // ---------- ordre til én person (F5) ----------
  // gi(G, id, { type: 'gå', x, y, e, hus }) eller { type: 'gjør', oppgave, fra (oppgaven før), til (spilltid) }; stopp(G, id)
  let ordreNr = 1;
  function gi(G, id, o) { if (!G || !o || (o.type !== 'gå' && o.type !== 'gjør')) return null; const O = { ...o, n: ordreNr++ }; G.ordre[id] = O; const s = G.pers[id]; if (s) s.mk = null; return O; }
  function stopp(G, id) { const O = G && G.ordre[id]; if (!O) return null; delete G.ordre[id]; const s = G.pers[id]; if (s) s.mk = null; return O; }
  // hendelsene siden sist (framme, fast, ferdig) – tømmes når de leses
  function hendelser(G) { const h = G.hendelser || []; G.hendelser = []; return h; }

  const api = { REGLER, STED, INNE, ny, steg, målFor, utpostMål, planlegg, gå, stedF, tekst, fast, oversikt, inngang, senger, gi, stopp, hendelser };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Folkgang = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
