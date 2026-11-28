/* Riksbrudd – MASKINENE TRENGER FOLK PÅ RIKTIG PLASS (28. nov, fase F3 i docs/plan-selskap-okonomi.md, kapittel 6.4 og 6.6): regler uten DOM.
 * Node: require('./baering') (henter leir.js og produksjon.js selv); nettleser: globalThis.Baering (lastes rett etter folkgang-visning.js).
 * Visningen: spill/baering-visning.js.
 *
 * Hver maskin (sagbruk, vedkløyver, fyrkjele – Leir.BYGG med «maskin: true») har tre slags PLASSER ved bygget (plasser()):
 *   INNMATING  – der råvaren legges (tømmerbordet ved enden av saga), høyst Produksjon.REGLER.buffer.inn m³ per råvare
 *   BRUKSPLASS – der operatørene står (sagbruket 3, de andre 1), langs fronten av bygget
 *   UTMATING   – der det maskinen lager, havner (plankehaugen), høyst Produksjon.REGLER.buffer.ut m³ til sammen
 * Maskinen går bare når operatørene STÅR på bruksplassene (Folkgang: framme), det er råvare i innmatingen og plass i utmatingen
 * (Produksjon.steg med ctx.mating / ctx.kraftPer). Det som ligger i matingen, er IKKE i lageret (L.lager) – det er ved maskinen.
 *
 * BÆREJOBBER: når innmatingen har plass til en last til, eller utmatingen har en last å bære bort, lager maskinen bærejobber
 * («bær tømmer til sagbruket», «bær planker fra sagbruket til lageret»). Bærerne (folk på «maskin» som ikke er operatører, og folk på
 * «frakt» som ikke har noe å bære fra hogstfeltene) tar dem: reserverer en enhet i varelageret (nærmest maskinen), går dit, tar en last,
 * bærer den til innmatingen – eller tar en last fra utmatingen og bærer den til en lagerplass (rett sone først) og legger den der.
 * Forsvinner enheten de skulle hente (stjålet, brent, brukt), finner de en ny (beskjedene fra Varelager). Står maskinen fordi den mangler
 * råvare eller utmatingen er full, og ingen bærer har tatt jobben, bærer en av operatørene selv (maskinen står uansett).
 *
 * OPERATØRENE velges blant dem på «maskin» som er i arbeidstida: maskinene i rekkefølgen fyrkjele, sagbruk, vedkløyver får så mange som
 * trengs til arbeidskraften (personTempo × døgnplanens tetthet) er nok – høyst én per bruksplass. Den som kjørte maskinen sist, får den igjen.
 * OPPLÆRING: en operatør som kjører samme maskintype lenge, blir sakte bedre (ferd.maskin, REGLER.lær).
 *
 * Varelageret kobles inn gjennom et lite «lager»-grensesnitt (lager()), så reglene også virker uten det (Node-testene, gamle spill).
 * Tilstanden B = { versjon, m: { byggId: { inn, ut } }, bær: { personId: oppdrag }, rolle: { personId: { r, bygg, i } }, lær, stat, nyFunnet }
 * Alle tall er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const hent = n => { try { return require(n); } catch (e) { return null; } };
  const LB = rot.Leir || (typeof require === 'function' ? hent('./leir.js') : null);
  const PR = rot.Produksjon || (typeof require === 'function' ? hent('./produksjon.js') : null);

  // ---------- REGLER (alle tallene er Claudes forslag) ----------
  const REGLER = {
    // så mye bærer én person per tur til fots (m³)
    last: .5,
    // sekunder (spilltid) det tar å ta opp eller legge ned lasten
    håndter: 20,
    // utmatingen bæres bort når det ligger minst en last der; innmatingen fylles så lenge en last til får plass
    // ekstra plasser til bærere på jobbtavla per maskin (med to skift: én bærer i hvert skift ved saga)
    bærere: { sagbruk: 2, vedkløyver: 1, fyrkjele: 0 },
    // opplæring: ferdigheten på «maskin» stiger så mye per driftstime på samme maskintype (fullt etter «rampe» timer), høyst «maks»
    lær: { perTime: .004, rampe: 8, maks: 1.6 },
    // plassene ved bygget (m utenfor fronten): bruksplassene rett foran, innmating og utmating litt lenger ut i hver ende
    plass: { foran: 1.1, mating: 2.6, ende: 1.4, minY: 1.8, spredning: 2.6 },
  };
  const VARENAVN = { tre: 'planker', tømmer: 'tømmer', flis: 'flis', ved: 'ved' };
  const vn = v => VARENAVN[v] || v;
  const r3 = v => Math.round(v * 1e6) / 1e6;
  const nf = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const ny = () => ({ versjon: 1, m: {}, bær: {}, rolle: {}, lær: {}, stat: { turer: 0, m3: 0, sek: 0, gåSek: 0, hjelp: 0 }, nyFunnet: 0, kraftPer: {}, påPlass: {}, jobber: [] });
  const navnB = b => (LB && LB.BYGG[b.type] ? LB.BYGG[b.type].navn.toLowerCase() : b.type);
  const D = b => (PR ? PR.REGLER.maskiner[b.type] : null);

  // ---------- plassene ved maskinen ----------
  // fra bygget sitt eget koordinatsystem (lx fram mot +x = fronten, ly til siden) til kartet
  const tilKart = (b, lx, ly) => { const c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0); return { x: b.x + lx * c - ly * s, y: b.y + lx * s + ly * c }; };
  // { inn: {x,y}, ut: {x,y} | null, bruks: [{x,y}] }
  function plasser(b) {
    const B = LB && LB.BYGG[b.type], f = (B && B.fot) || [-3, 3, -3, 3], R = REGLER.plass, M = D(b), n = M ? M.folk : 1;
    const yInn = Math.min(f[2] + R.ende, -R.minY), yUt = Math.max(f[3] - R.ende, R.minY), sp = Math.min(R.spredning, Math.max(0, (f[3] - f[2]) / 2 - 1));
    const bruks = []; for (let i = 0; i < n; i++) bruks.push(tilKart(b, f[1] + R.foran, n === 1 ? 0 : -sp + 2 * sp * i / (n - 1)));
    return { inn: tilKart(b, f[1] + R.mating, yInn), ut: M && Object.keys(M.ut).length ? tilKart(b, f[1] + R.mating, yUt) : null, bruks };
  }
  const inngang = b => { const B = LB && LB.BYGG[b.type], u = ((B && B.fot) ? B.fot[1] : 3) + .9; return tilKart(b, u, 0); };

  // ---------- lageret (grensesnittet mot spill/varelager.js) ----------
  // lager(Leir, L, V, VL, leir) gir { har(v), finn(v, x, y, hvem), ta(id, v, m, hvem), slipp(id, hvem), beskjeder(hvem), levTil(v, m), lever(v, m) }.
  // Med varelageret (V, VL) hentes og legges enhetene der de ligger; uten (V = null) er lageret ett sted (lagerbygget eller leirens midte).
  function lager(Leir, L, V, VL, leir) {
    const plassIgjen = v => Math.max(0, Leir.lagerplass(L) - ((L.lager && L.lager[v]) || 0));
    const har = v => (L.lager && L.lager[v]) || 0;
    const byggMål = (b, navn) => { const q = inngang(b); return { k: 'id:' + b.id, kart: 'id:' + b.id, x: q.x, y: q.y, navn: navn || navnB(b), bygg: b.id }; };
    const uteP = () => (V && V.ute) || { x: leir.x + VL_ute() * .7, y: leir.y - VL_ute() * .7 };
    const VL_ute = () => (VL && VL.REGLER ? VL.REGLER.ute.avstand : 24);
    const lagerBygg = () => L.bygg.filter(b => Leir.BYGG[b.type] && Leir.ferdig(b) && Leir.virker(b) && (Leir.effekt(b).lager || 0) > 0);
    const målFor = (u) => {
      if (u.p === 'ute') { const q = VL.punkt(Leir, L, V, u, leir) || uteP(); return { k: 'enhet:' + u.id, x: q.x, y: q.y, navn: 'lagerplassen' }; }
      if (u.p === 'rom') return { k: 'rom-lager', kart: 'lager', x: leir.x, y: leir.y, navn: 'lageret' };
      const b = L.bygg.find(q => 'b' + q.id === u.p); return b ? byggMål(b) : { k: 'enhet:' + u.id, x: leir.x, y: leir.y, navn: 'lageret' };
    };
    if (!V || !VL) {
      // uten varelageret: hent fra og lever til det første lagerbygget (ellers leirens midte)
      const sted = () => { const b = lagerBygg()[0]; return b ? byggMål(b, 'lageret') : { k: 'lager-midte', x: leir.x + 6, y: leir.y - 6, navn: 'lageret' }; };
      return { har, finn: v => (har(v) > .01 ? { id: 'lager:' + v, mål: sted() } : null), ta: (id, v, m) => { const q = Math.min(m, har(v)); if (!(q > .001)) return { borte: true }; L.lager[v] = r3(har(v) - q); return { m: q }; },
        slipp: () => true, beskjeder: () => [], levTil: (v, m) => (plassIgjen(v) >= m - 1e-6 ? { mål: sted() } : null),
        lever: (v, m) => { const q = Math.min(m, plassIgjen(v)); L.lager[v] = r3(har(v) + q); return q; } };
    }
    return {
      har,
      // reserverer den nærmeste ledige enheten av varen (nærmest punktet x, y) og gir { id, mål }
      finn(v, x, y, hvem) {
        const kand = V.e.filter(u => u.v === v && !u.r && u.p !== 'bæres' && u.m > .01); if (!kand.length) return null;
        let best = null, bd = Infinity; for (const u of kand) { const q = u.p === 'rom' ? leir : VL.punkt(Leir, L, V, u, leir) || leir, d = Math.hypot(q.x - x, q.y - y) + (u.p === 'ute' ? 0 : 4); if (d < bd) { bd = d; best = u; } }
        const r = VL.reserver(V, best.id, hvem); return r.ok ? { id: best.id, mål: målFor(best) } : null;
      },
      // tar en last fra enheten (VL.bruk trekker også fra L.lager); { m } eller { borte }
      ta(id, v, m, hvem) { const u = VL.finn(V, id); if (!u || u.v !== v || (u.r && u.r !== String(hvem))) return { borte: true };
        const q = VL.bruk(L, V, id, Math.min(m, u.m)); if (VL.finn(V, id)) VL.slipp(V, id, hvem); return q > .001 ? { m: q } : { borte: true }; },
      slipp: (id, hvem) => VL.slipp(V, id, hvem),
      beskjeder: hvem => VL.beskjeder(V, hvem),
      // hvor lasten skal: et lagerbygg merket for varen, så et annet lagerbygg med plass, så egne rom, så ute på lagerplassen
      levTil(v, m) {
        if (plassIgjen(v) < m - 1e-6) return null;
        const Ps = VL.plasser(Leir, L, V).filter(P => P.tar(v) && P.cap(v) - VL.sum(V, v, u => u.p === P.id) >= m - 1e-6 && !P.tank);
        const rang = P => (P.id === 'ute' ? 9 : P.id === 'rom' ? 2 : P.sone === v ? 0 : 1); Ps.sort((a, b) => rang(a) - rang(b));
        const P = Ps[0]; if (!P) return null;
        if (P.id === 'ute') { const q = uteP(); return { mål: { k: 'lagerplass', x: q.x, y: q.y, navn: 'lagerplassen' } }; }
        if (P.id === 'rom') return { mål: { k: 'rom-lager', kart: 'lager', x: leir.x, y: leir.y, navn: 'lageret' } };
        return { mål: byggMål(P.bygg) };
      },
      // legger lasten i lageret (L.lager + enhetene på beste plass, VL.avstem)
      lever(v, m) { const q = Math.min(m, plassIgjen(v)); if (!(q > 0)) return 0; L.lager[v] = r3(har(v) + q); VL.avstem(Leir, L, V, { vare: v, grunn: 'lagt inn' }); return q; },
    };
  }

  // ---------- jobbene ----------
  // Hva maskinene trenger båret nå: [{ id, retning 'inn'|'ut', bygg, vare, turer (ledige), haster (maskinen står for dette), tekst, blokk }]
  function jobber(B, L, A, status) {
    const ut = [], M = PR.maskinene(L).filter(b => !b.av && LB.virker(b)), last = REGLER.last;
    const underveis = (b, retning, v) => Object.values(B.bær).filter(o => o.bygg === b.id && o.retning === retning && o.vare === v).reduce((s, o) => s + (o.m || last), 0);
    for (const b of M) {
      const Dm = D(b), Bf = B.m[b.id] || { inn: {}, ut: {} }, st = status && status[b.id];
      // råvaren: den første i oppskriften som finnes ved maskinen eller i lageret (fyrkjelen: flis, ellers ved)
      const valg = Dm.inn.map(r => Object.keys(r)[0]); let v = valg.find(q => (Bf.inn[q] || 0) > .05) || valg.find(q => A.har(q) > .01) || valg[0];
      const rom = PR.REGLER.buffer.inn - (Bf.inn[v] || 0) - underveis(b, 'inn', v), turer = Math.floor(rom / last + 1e-9);
      if (turer > 0) ut.push({ id: `inn:${b.id}:${v}`, retning: 'inn', bygg: b.id, vare: v, turer, haster: !!(st && !st.går && st.grunn === 'tom'),
        fyll: (Bf.inn[v] || 0) / PR.REGLER.buffer.inn, tekst: `Bær ${vn(v)} til ${navnB(b)}`, blokk: A.har(v) > .01 ? null : `ingen ${vn(v)} på lageret` });
      for (const [w, m] of Object.entries(Bf.ut)) { const igjen = (m || 0) - underveis(b, 'ut', w), n = Math.floor(igjen / last + 1e-9); if (n <= 0) continue;
        ut.push({ id: `ut:${b.id}:${w}`, retning: 'ut', bygg: b.id, vare: w, turer: n, haster: !!(st && !st.går && st.grunn === 'fullt'), fyll: PR.utSum(Bf) / PR.REGLER.buffer.ut,
          tekst: `Bær ${vn(w)} fra ${navnB(b)} til lageret`, blokk: A.levTil(w, last) ? null : 'lageret er fullt' }); }
    }
    return ut;
  }

  // ---------- ett steg ----------
  // ctx: { F, L, G (Folkgang-tilstanden), hva(p), A (lager()), kraftPerson(p) (arbeidskraft når hen står på plass), fraktLedig (bool),
  //        status (Produksjon: siste status per maskin), meld(tekst) }
  // dt i sekunder spilltid. Endrer B (og L.lager / enhetene gjennom A).
  function steg(B, ctx, dt) {
    const { F, L, G, A } = ctx; if (!F || !L || !A || !PR || !LB) return B;
    const hva = p => (ctx.hva ? ctx.hva(p) : 'arbeid'), kp = p => (ctx.kraftPerson ? ctx.kraftPerson(p) : 1), last = REGLER.last;
    const M = PR.maskinene(L), Mid = new Set(M.map(b => b.id)), pers = new Map(F.personer.map(p => [p.id, p]));
    for (const b of M) if (!B.m[b.id]) B.m[b.id] = { inn: {}, ut: {} };
    // maskiner som er borte (revet, flyttet bort): det som lå i matingen, går tilbake til lageret
    for (const id of Object.keys(B.m)) if (!Mid.has(+id)) { tømMating(B, +id, A); delete B.m[id]; }
    // framme ved målet: Folkgang har gått veien til nettopp dette målet (nøkkelen) og står der
    const fram = (p, k) => { const s = G && G.pers[p.id]; return !!(s && s.ved && s.mål && s.mål.k === k); };

    // 1. oppdragene som er i gang
    for (const [pid, o] of Object.entries(B.bær)) {
      const p = pers.get(+pid), b = L.bygg.find(q => q.id === o.bygg);
      // personen er borte, eller maskinen: lasten tilbake (inn -> lageret, ut -> utmatingen eller lageret)
      if (!p || !b || !Mid.has(o.bygg)) { tilbake(B, o, A, pid); delete B.bær[pid]; continue; }
      // utenfor arbeidstida: et oppdrag uten last avbrytes; med last bærer hen den ferdig først
      if (o.fase === 'hent' && (hva(p) !== 'arbeid' || p.borte)) { tilbake(B, o, A, pid); delete B.bær[pid]; continue; }
      B.stat.sek += dt;
      // enheten hen skulle hente, er borte (beskjed fra varelageret): finn en ny
      if (o.fase === 'hent' && o.retning === 'inn') { const bs = A.beskjeder(pid); if (bs.some(q => String(q.id) === String(o.enhet))) {
        const q = A.finn(o.vare, (G && G.pers[pid] ? G.pers[pid].x : b.x), (G && G.pers[pid] ? G.pers[pid].y : b.y), pid);
        if (q) { o.enhet = q.id; o.mål = q.mål; o.vent = 0; B.nyFunnet++; if (ctx.meld) ctx.meld(`${p.navn.split(' ')[0]} fant ikke ${vn(o.vare)} der hen skulle hente – går til en annen haug.`); }
        else { delete B.bær[pid]; if (ctx.meld) ctx.meld(`${p.navn.split(' ')[0]} fant ikke mer ${vn(o.vare)} på lageret.`); continue; } } }
      if (!fram(p, bærNøkkel(o))) { B.stat.gåSek += dt; o.vent = 0; continue; }
      o.vent = (o.vent || 0) + dt; if (o.vent < REGLER.håndter) continue; o.vent = 0;
      const Bf = B.m[o.bygg], P = plasser(b);
      if (o.fase === 'hent' && o.retning === 'inn') {
        const r = A.ta(o.enhet, o.vare, last, pid);
        if (r.borte) { const q = A.finn(o.vare, b.x, b.y, pid); if (q) { o.enhet = q.id; o.mål = q.mål; B.nyFunnet++; } else delete B.bær[pid]; continue; }
        o.m = r.m; o.fase = 'lever'; o.mål = { k: 'innmating:' + b.id, x: P.inn.x, y: P.inn.y, navn: 'innmatingen ved ' + navnB(b), bygg: b.id };
      } else if (o.fase === 'hent' && o.retning === 'ut') {
        const q = Math.min(last, Bf.ut[o.vare] || 0), til = q > .01 ? A.levTil(o.vare, q) : null; if (!til) { delete B.bær[pid]; continue; }
        Bf.ut[o.vare] = r3((Bf.ut[o.vare] || 0) - q); o.m = q; o.fase = 'lever'; o.mål = til.mål;
      } else if (o.retning === 'inn') { Bf.inn[o.vare] = r3((Bf.inn[o.vare] || 0) + o.m); ferdig(B, o); delete B.bær[pid]; }
      else { const q = A.lever(o.vare, o.m); if (q < o.m - 1e-6) Bf.ut[o.vare] = r3((Bf.ut[o.vare] || 0) + o.m - q); ferdig(B, o); delete B.bær[pid]; }
    }

    // 2. rollene: operatører på bruksplassene, resten bærere
    const iArbeid = F.personer.filter(p => p.oppgave === 'maskin' && hva(p) === 'arbeid' && !p.borte && !B.bær[p.id]);
    const brukt = new Set(), rolle = {}, kraftPer = {}, påPlass = {};
    for (const b of M) {
      const Dm = D(b); kraftPer[b.id] = 0; påPlass[b.id] = 0; if (b.av || !LB.virker(b)) continue;
      const før = iArbeid.filter(p => B.rolle[p.id] && B.rolle[p.id].r === 'op' && B.rolle[p.id].bygg === b.id && !brukt.has(p.id));
      const kand = før.concat(iArbeid.filter(p => !brukt.has(p.id) && !før.includes(p)));
      let k = 0, i = 0;
      for (const p of kand) { if (i >= Dm.folk || k >= Dm.folk - 1e-6) break; brukt.add(p.id);
        const fi = B.rolle[p.id] && B.rolle[p.id].bygg === b.id ? B.rolle[p.id].i : -1, ledig = [...Array(Dm.folk).keys()].filter(j => !Object.values(rolle).some(q => q.bygg === b.id && q.i === j));
        const plass = ledig.includes(fi) ? fi : ledig[0]; rolle[p.id] = { r: 'op', bygg: b.id, i: plass }; k += kp(p); i++; }
    }
    for (const p of iArbeid) if (!brukt.has(p.id)) rolle[p.id] = { r: 'bær' };
    if (ctx.fraktLedig) for (const p of F.personer) if (p.oppgave === 'frakt' && hva(p) === 'arbeid' && !p.borte && !B.bær[p.id]) rolle[p.id] = { r: 'bær', frakt: true };
    for (const pid of Object.keys(B.bær)) rolle[pid] = { r: 'bær', bærer: true };
    B.rolle = rolle;

    // 3. jobbene og hvem som tar dem (ledige bærere først; står maskinen for det, bærer en operatør selv)
    const J = jobber(B, L, A, ctx.status); B.jobber = J;
    const åpne = J.filter(j => !j.blokk && j.turer > 0);
    const ta = (p, j, hjelp) => {
      const b = L.bygg.find(q => q.id === j.bygg), P = plasser(b);
      if (j.retning === 'inn') { const q = A.finn(j.vare, P.inn.x, P.inn.y, p.id); if (!q) { j.blokk = `ingen ${vn(j.vare)} på lageret`; return false; }
        B.bær[p.id] = { retning: 'inn', bygg: b.id, vare: j.vare, fase: 'hent', enhet: q.id, mål: q.mål, m: 0, vent: 0, hjelp: !!hjelp }; }
      else B.bær[p.id] = { retning: 'ut', bygg: b.id, vare: j.vare, fase: 'hent', mål: { k: 'utmating:' + b.id, x: P.ut.x, y: P.ut.y, navn: 'utmatingen ved ' + navnB(b), bygg: b.id }, m: 0, vent: 0, hjelp: !!hjelp };
      j.turer--; rolle[p.id] = { r: 'bær', bærer: true }; if (hjelp) B.stat.hjelp++; return true;
    };
    const ledige = F.personer.filter(p => rolle[p.id] && rolle[p.id].r === 'bær' && !B.bær[p.id]).sort((a, b) => a.id - b.id);
    for (const p of ledige) {
      const s = G && G.pers[p.id], x = s ? s.x : 0, y = s ? s.y : 0;
      // det som haster først (maskinen står for det), så den tommeste innmatingen / fulleste utmatingen, så den nærmeste
      const behov = j => (j.retning === 'inn' ? j.fyll : 1 - j.fyll);
      const kand = åpne.filter(j => j.turer > 0 && !j.blokk).map(j => { const b = L.bygg.find(q => q.id === j.bygg); return { j, d: Math.hypot(b.x - x, b.y - y) }; })
        .sort((a, b) => (a.j.haster ? 0 : 1) - (b.j.haster ? 0 : 1) || behov(a.j) - behov(b.j) || a.d - b.d);
      for (const k of kand) if (ta(p, k.j)) break;
    }
    for (const j of åpne) { if (!j.haster || j.turer <= 0 || j.blokk || Object.values(B.bær).some(o => o.bygg === j.bygg)) continue;
      const op = F.personer.find(p => rolle[p.id] && rolle[p.id].r === 'op' && rolle[p.id].bygg === j.bygg); if (op) ta(op, j, true); }

    // 4. arbeidskraften per maskin: operatørene som står på bruksplassen sin
    for (const [pid, r] of Object.entries(rolle)) { if (r.r !== 'op') continue; const p = pers.get(+pid), b = L.bygg.find(q => q.id === r.bygg);
      if (fram(p, opMål(b, r.i).k)) { kraftPer[r.bygg] += kp(p); påPlass[r.bygg]++;
        // opplæring: sakte bedre på samme maskintype (bare mens maskinen går)
        const st = ctx.status && ctx.status[r.bygg]; if (st && st.går && p.ferd) { const Lr = B.lær[pid] && B.lær[pid].t === b.type ? B.lær[pid] : (B.lær[pid] = { t: b.type, h: 0 });
          Lr.h += dt / 3600 * st.drift; const R = REGLER.lær; if ((p.ferd.maskin || 1) < R.maks) p.ferd.maskin = Math.min(R.maks, (p.ferd.maskin || 1) + R.perTime * dt / 3600 * st.drift * Math.min(1, Lr.h / R.rampe)); } } }
    B.kraftPer = kraftPer; B.påPlass = påPlass;
    return B;
  }
  const bærNøkkel = o => 'bær:' + o.fase + ':' + o.mål.k;
  function ferdig(B, o) { B.stat.turer++; B.stat.m3 = r3(B.stat.m3 + (o.m || 0)); }
  // lasten tilbake der den kom fra (oppdraget avbrytes)
  function tilbake(B, o, A, hvem) {
    if (o.fase === 'hent') { if (o.enhet != null) A.slipp(o.enhet, hvem); return; }
    if (!(o.m > 0)) return;
    if (o.retning === 'inn') { const q = A.lever(o.vare, o.m); if (q < o.m - 1e-6 && B.m[o.bygg]) B.m[o.bygg].inn[o.vare] = r3((B.m[o.bygg].inn[o.vare] || 0) + o.m - q); }
    else if (B.m[o.bygg]) B.m[o.bygg].ut[o.vare] = r3((B.m[o.bygg].ut[o.vare] || 0) + o.m); else A.lever(o.vare, o.m);
  }
  // det som ligger i matingen til maskinen id, tilbake i lageret
  function tømMating(B, id, A) { const Bf = B.m[id]; if (!Bf) return; for (const side of ['inn', 'ut']) for (const [v, m] of Object.entries(Bf[side])) if (m > 0) { A.lever(v, m); Bf[side][v] = 0; } }
  // alt tilbake i lageret: døgnplanen er slått av (eller testene) – da går maskinene som før, rett fra lageret. Gir mengdene som ble lagt tilbake.
  function tøm(B, A) {
    const ut = {}; const tell = (v, m) => { ut[v] = r3((ut[v] || 0) + m); };
    for (const [pid, o] of Object.entries(B.bær)) { if (o.fase === 'hent') { if (o.enhet != null) A.slipp(o.enhet, pid); } else if (o.m > 0) { A.lever(o.vare, o.m); tell(o.vare, o.m); } }
    B.bær = {}; B.rolle = {}; B.kraftPer = {}; B.påPlass = {};
    for (const Bf of Object.values(B.m)) for (const side of ['inn', 'ut']) for (const [v, m] of Object.entries(Bf[side])) if (m > 0) { A.lever(v, m); tell(v, m); Bf[side][v] = 0; }
    return ut;
  }

  // ---------- målene for gangen (Folkgang: ctx.mål) ----------
  function opMål(b, i) { const P = plasser(b), q = P.bruks[Math.min(i, P.bruks.length - 1)] || P.bruks[0]; return { k: 'bruks:' + b.id + ':' + i, x: q.x, y: q.y, navn: 'bruksplassen ved ' + navnB(b), gjør: 'kjører ' + navnB(b), bygg: b.id }; }
  // Målet for personen p nå, eller null (da gjelder Folkgang sine egne regler)
  function mål(B, L, p, hva) {
    const o = B.bær[p.id];
    if (o) { if (o.fase === 'hent' && hva !== 'arbeid') return null;
      const gjør = o.fase === 'hent' ? (o.retning === 'inn' ? `henter ${vn(o.vare)} til ${navnB({ type: (L.bygg.find(q => q.id === o.bygg) || {}).type })}` : `henter ${vn(o.vare)} fra utmatingen`) : `bærer ${nf(o.m, 1)} m³ ${vn(o.vare)}`;
      return { ...o.mål, k: bærNøkkel(o), gjør: gjør + (o.hjelp ? ' (operatøren bærer selv)' : ''), inne: null }; }
    if (hva !== 'arbeid') return null;
    const r = B.rolle[p.id]; if (!r) return null;
    const b = r.bygg != null ? L.bygg.find(q => q.id === r.bygg) : null;
    if (r.r === 'op' && b) return opMål(b, r.i);
    if (r.r === 'bær' && !r.frakt && p.oppgave === 'maskin') { const M = PR.maskinene(L); if (!M.length) return null; const m = M[p.id % M.length], P = plasser(m), q = P.ut || P.inn;
      return { k: 'vent:' + m.id, x: q.x + 1.5, y: q.y + 1.5, navn: navnB(m), gjør: 'venter på en bærejobb' }; }
    return null;
  }

  // ---------- det visningen og panelet viser ----------
  // linjene på jobbtavla: «Bær tømmer til sagbruket (2 bærer)», «Bær planker fra sagbruket til lageret – lageret er fullt»
  function linjer(B, L) {
    const ut = [], på = {}; for (const o of Object.values(B.bær)) { const k = `${o.retning}:${o.bygg}:${o.vare}`; på[k] = (på[k] || 0) + 1; }
    const sett = new Set();
    for (const j of B.jobber || []) { sett.add(j.id); const n = på[j.id] || 0; ut.push(j.tekst + (n ? ` (${n} bærer)` : '') + (j.blokk ? ` – ${j.blokk}` : '')); }
    for (const [k, n] of Object.entries(på)) { if (sett.has(k)) continue; const [r, id, v] = k.split(':'); const b = L && L.bygg ? L.bygg.find(q => q.id === +id) : null, navn = b ? navnB(b) : 'maskinen';
      ut.push(r === 'inn' ? `Bær ${vn(v)} til ${navn} (${n} bærer)` : `Bær ${vn(v)} fra ${navn} til lageret (${n} bærer)`); }
    return ut;
  }
  // tilstanden til én maskin for panelet: { inn: { v: m }, ut: { v: m }, påPlass, folk, bærere }
  function maskin(B, id) { const Bf = B.m[id] || { inn: {}, ut: {} }; return { inn: Bf.inn, ut: Bf.ut, påPlass: B.påPlass[id] || 0, bærere: Object.values(B.bær).filter(o => o.bygg === id).length }; }
  const oversikt = B => ({ bærer: Object.keys(B.bær).length, operatører: Object.values(B.rolle).filter(r => r.r === 'op').length, jobber: (B.jobber || []).length, ...B.stat, nyFunnet: B.nyFunnet });

  // ---------- lagring ----------
  function tilJSON(B) { return { versjon: 1, m: B.m, bær: B.bær, lær: B.lær, stat: B.stat, nyFunnet: B.nyFunnet }; }
  function fraJSON(d) { const B = ny(); if (!d || typeof d !== 'object' || d.versjon !== 1) return B;
    const tall = o => { const u = {}; if (o && typeof o === 'object') for (const [v, m] of Object.entries(o)) if (VARENAVN[v] && +m > 0) u[v] = +m; return u; };
    if (d.m && typeof d.m === 'object') for (const [id, Bf] of Object.entries(d.m)) if (Bf && typeof Bf === 'object') B.m[+id] = { inn: tall(Bf.inn), ut: tall(Bf.ut) };
    if (d.bær && typeof d.bær === 'object') for (const [pid, o] of Object.entries(d.bær)) if (o && (o.retning === 'inn' || o.retning === 'ut') && VARENAVN[o.vare] && o.mål && Number.isFinite(o.mål.x)) B.bær[+pid] = { ...o, vent: 0 };
    if (d.lær && typeof d.lær === 'object') B.lær = d.lær;
    if (d.stat && typeof d.stat === 'object') for (const k of Object.keys(B.stat)) if (Number.isFinite(+d.stat[k])) B.stat[k] = +d.stat[k];
    B.nyFunnet = +d.nyFunnet || 0; return B; }

  const api = { REGLER, VARENAVN, ny, plasser, inngang, lager, jobber, steg, tøm, tømMating, mål, opMål, linjer, maskin, oversikt, tilJSON, fraJSON, nf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Baering = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
