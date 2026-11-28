'use strict';
// OPPFØRSEL – visningen (28. nov, fase F4; reglene: spill/oppforsel.js). Lastes rett etter baering-visning.js.
//  - Gangen: FolkgangSpill.målKrok pakkes inn – alarm (tilfluktsrom og stillinger), skadde og bærere, slukkere, ryddere og
//    samlingsstedet i fritida går foran; ellers gjelder bæringen (baering-visning.js) og reglene i folkgang.js som før.
//    Planene lages i FolkgangSpill.etter (rett etter hvert steg i gangen, 4 ganger i sekundet) og brukes i neste steg.
//  - folk.js: FolkRegler.moralF (venner, uvenner, fritid, ulykker) og FolkRegler.personF (uvenn på samme jobb) – pakket rundt
//    egenskapene fra rekruttering-visning.js. rekruttering.js: Rekruttering.lokkF (venner holder på folk) og Rekruttering.ulykkeMinus.
//  - Jobbtavla: FolkgangSpill.fastLinjer får linjene «Slukk brannen …», «Alarm: …», «Bær … til sykestua», «Rydd lageret …» først.
//  - Ved personen i Folk (RekrutteringSpill.personDel): venner og uvenner, skadet.
//  - Leir-menyen (fanen Lager): «Verneutstyr og ulykker» med kjøp av verneutstyr (kommandoen kjøpVern).
//  - I TESTENE (navigator.webdriver) skjer ingenting av dette før OppforselSpill.test = true – alt er som før.
//  - Lagres per leir i «riksbrudd-oppforsel» ({ leir: 'x,y', S }): venner/uvenner, ulykkene, verneutstyret og de skadde.
(function () {
  // felles tilfeldighet (spill/tilfeldig.js): samme frø gir samme svar på alle maskiner
  const tilf = (typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random;
  const OP = window.Oppforsel, FR = window.FolkRegler, LB = window.Leir, FG = window.Folkgang;
  if (!OP || !FR || !LB || !FG || typeof KROKER === 'undefined' || !window.FolkgangSpill) return;
  const FS = window.FolkgangSpill, R = OP.REGLER, NØKKEL = 'riksbrudd-oppforsel';
  let S = OP.ny(), id = '', sistLagret = 0, vennAkk = 0, sistEgen = 0, alarmFør = null, sistBrannLogg = '';
  // planene for neste steg i gangen
  let P = { alarm: null, tilflukt: null, slukk: new Map(), jobber: [], bær: new Map(), bæres: new Map(), rydd: new Map(), samling: null, syk: null };
  const helseFør = new Map();
  const Fo = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const Lr = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const midte = () => { const T = window.OppstartSpill && OppstartSpill.tilstand(); return T && T.leir ? T.leir : null; };
  const leirId = () => { const m = midte(); return m ? Math.round(m.x) + ',' + Math.round(m.y) : ''; };
  const nåTid = () => (typeof tid !== 'undefined' ? tid : 0);
  const klokke = () => (((6 + nåTid() / 60) % 24) + 24) % 24;
  const aktiv = () => window.OppforselSpill.på !== false && (!navigator.webdriver || window.OppforselSpill.test === true) && !(window.LeirSpill && LeirSpill.erSpeil && LeirSpill.erSpeil());
  const fornavn = p => String(p.navn || '').split(' ')[0];
  const liste = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1] : a.join(''));
  const meld = t => { if (typeof logg === 'function') logg(t); };
  const navnB = b => ((LB.BYGG[b.type] || {}).navn || 'bygget').toLowerCase();
  const ferdig = b => LB.ferdig(b) && LB.virker(b) && LB.BYGG[b.type] && !LB.BYGG[b.type].del;
  const G = () => FS.tilstand();
  const plass = p => { const s = G().pers[p.id]; return s ? { x: s.x, y: s.y } : null; };

  // ---------- lagring (per leir) ----------
  function les() { const n = leirId(); if (n === id) return; id = n; S = OP.ny(); helseFør.clear(); nullPlan();
    try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d && d.leir === n) S = OP.fraJSON(d.S); } catch (e) { /* sperret */ } }
  function lagre() { if (!id) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: id, S })); } catch (e) { /* fullt */ } }
  window.addEventListener('pagehide', lagre);
  function nullPlan() { P = { alarm: null, tilflukt: null, slukk: new Map(), jobber: [], bær: new Map(), bæres: new Map(), rydd: new Map(), samling: null, syk: null }; }

  // ---------- stedene i leiren ----------
  function rommene() { const BS = window.ByggesettRegler, L = Lr(), m = midte(), g = G(); if (!BS || !L || !m || !g || !Array.isArray(g.rom)) return [];
    const o = L.byggesett || { ox: m.x, oy: m.y }; return g.rom.map(r => ({ ...r, punkt: { x: o.ox + r.ci * BS.G, y: o.oy + r.cj * BS.G, e: r.etasje + 1, hus: 'leir' } })); }
  const tilBygg = (b, gjør, navn) => { const q = FG.inngang(b); return { k: 'op:' + b.id, kart: 'id:' + b.id, x: q.x, y: q.y, navn: navn || navnB(b), gjør, inne: FG.INNE.has(b.type) ? b.type : null, bygg: b.id }; };
  // sykestua (eller feltsykehuset): målet for de skadde
  function sykestue(L, gjør) { const b = L.bygg.find(q => (q.type === 'sykestue' || q.type === 'feltsykehus') && ferdig(q)); return b ? tilBygg(b, gjør, 'sykestua') : null; }
  // samlingsstedet i fritida: det første av REGLER.samling som står ferdig
  function samling(L) { for (const t of R.samling) { const b = L.bygg.find(q => q.type === t && ferdig(q)); if (b) return b; } return null; }

  // ---------- alarmen ----------
  // 'nær' (alle i tilflukt), 'fjern' (de redde går), eller null. OppforselSpill.alarm = 'nær' | 'fjern' tvinger den (vakta).
  function alarmNivå() {
    const tving = window.OppforselSpill.alarm; if (tving === 'nær' || tving === 'fjern') return tving;
    const FS2 = window.ForsvarSpill, m = midte(); if (!FS2 || !FS2.angrep || !m) return null;
    let A = null; try { A = FS2.angrep(); } catch (e) { A = null; } if (!A || !A.lag || !A.lag.length) return null;
    const d = Math.min(...A.lag.map(e => Math.hypot(e.x - m.x, e.y - m.y)));
    if ((FS2.erSatt && FS2.erSatt()) || d < R.alarm.nær) return 'nær'; return d < R.alarm.fjern ? 'fjern' : null;
  }
  function vaktPost(L, m, p, nr) {
    const T = L.bygg.filter(b => b.type === 'vakttårn' && ferdig(b));
    if (T.length) { const b = T[nr % T.length]; return { ...tilBygg(b, 'står i stillingen – alarm', 'vakttårnet'), inne: 'vakttårn' }; }
    const a = OP.hash(p.id, 5) * 6.283; return { k: 'oppost:' + p.id, x: m.x + Math.cos(a) * 14, y: m.y + Math.sin(a) * 14, navn: 'vaktposten', gjør: 'står i stillingen – alarm' };
  }

  // ---------- målet for én person (målKrok) ----------
  const førMål = FS.målKrok;
  function mål(p, hva) {
    if (hva === 'borte' || p.borte) return null;
    const L = Lr(), m = midte(); if (!L || !m) return null;
    // alarm: tilfluktsrommet eller stillingen
    if (P.tilflukt) {
      const s = P.tilflukt.mål.get(p.id);
      if (s) return { k: 'tilflukt:' + s.k, kart: s.kart || null, x: s.x, y: s.y, e: s.e, hus: s.hus, navn: s.navn, gjør: P.alarm === 'nær' ? 'i tilflukt – alarm' : 'i tilflukt (redd – angrep meldt)', inne: s.type && FG.INNE.has(s.type) ? s.type : null, bygg: s.bygg || null };
      const v = P.tilflukt.vakter.indexOf(p.id); if (v >= 0 && P.alarm === 'nær') return vaktPost(L, m, p, v);
    }
    // båret: ligger der hen ble skadet, til bæreren kommer (og følger bæreren etterpå – se etter())
    const sk = S.skadet[p.id];
    if (sk && P.bæres.has(p.id)) { const b = P.bær.get(P.bæres.get(p.id));
      if (b && b.fase === 'bær' && P.syk) return { ...P.syk, k: 'båret:' + p.id, gjør: 'bæres til sykestua' };
      return { k: 'ligger:' + p.id, x: sk.x, y: sk.y, navn: 'der hen ble skadet', gjør: 'ligger skadet – venter på hjelp' }; }
    if (sk && P.syk) return { ...P.syk, gjør: sk.båret ? 'ligger på sykestua' : 'går til sykestua – skadet' };
    // bæreren
    const b = P.bær.get(p.id);
    if (b) { const q = Fo() && Fo().personer.find(x => x.id === b.skadet), n = q ? fornavn(q) : 'den skadde', s0 = S.skadet[b.skadet];
      if (b.fase === 'hent' && s0) return { k: 'hent:' + b.skadet, x: s0.x, y: s0.y, navn: n, gjør: `henter ${n} – skal bæres til sykestua` };
      if (P.syk) return { ...P.syk, k: 'bærer:' + p.id, gjør: `bærer ${n} til sykestua` }; }
    // slukkeren
    const j = P.slukk.get(p.id);
    if (j) { const q = OP.slukkPunkt(j, p.id); return { k: 'slukk:' + j.k, x: q.x, y: q.y, navn: j.navn ? 'brannen ved ' + j.navn : 'brannen', gjør: 'slukker brannen (høy prioritet)' }; }
    // bæringen ved maskinene (baering-visning.js)
    const før = førMål ? førMål(p, hva) : null; if (før) return før;
    // rydderen
    const r = P.rydd.get(p.id);
    if (r) { const vn = (LB.MATERIALER[r.v] || {}).navn || r.v;
      if (r.fase === 'hent') return { k: 'rydd:' + r.enhet, x: r.ux, y: r.uy, navn: 'lagerplassen ute', gjør: `rydder – henter ${vn.toLowerCase()} som ligger ute` };
      const lb = r.bygg != null ? L.bygg.find(q => q.id === r.bygg) : null;
      return lb ? tilBygg(lb, `rydder – bærer ${vn.toLowerCase()} inn`, 'lageret') : { k: 'ryddinn:' + p.id, x: m.x, y: m.y, navn: 'lageret', gjør: `rydder – bærer ${vn.toLowerCase()} inn` }; }
    // fritid ved samlingsstedet (vennene sitter sammen: vinkelen etter den første av dem)
    if (hva === 'fri' && P.samling) { const sb = P.samling, F = Fo();
      if (FG.INNE.has(sb.type)) return { ...tilBygg(sb, 'har fri – ' + (sb.type === 'kjøkken' ? 'i kantina' : 'samlet'), navnB(sb)), k: 'samling:' + sb.id };
      const vn = F ? OP.venner(S, F, p.id) : [], først = Math.min(p.id, ...vn), a = OP.hash(først, 41) * 6.283 + (p.id - først) * .45, rr = 2.4 + OP.hash(p.id, 43) * 2.2;
      return { k: 'samling:' + p.id, x: sb.x + Math.cos(a) * rr, y: sb.y + Math.sin(a) * rr, navn: navnB(sb), gjør: 'har fri ved ' + navnB(sb) + (vn.length ? ' med ' + liste(vn.map(i => { const q = F.personer.find(x => x.id === i); return q ? fornavn(q) : ''; }).filter(Boolean).slice(0, 2)) : '') }; }
    return null;
  }
  FS.målKrok = (p, hva) => (aktiv() ? mål(p, hva) : førMål ? førMål(p, hva) : null);
  // de som følger en plan herfra (teksten ved personen sier da hva de gjør, også når de er framme)
  const harPlan = id0 => !!((P.tilflukt && (P.tilflukt.mål.has(id0) || (P.alarm === 'nær' && P.tilflukt.vakter.includes(id0)))) || S.skadet[id0] || P.bær.has(id0) || P.slukk.has(id0) || P.rydd.has(id0));

  // ---------- planen, rett etter hvert steg i gangen ----------
  const arbeidsfør = p => FR.arbeidsfør(p);
  function etter(Gs, dtSek, ctx) {
    if (!aktiv()) { if (P.alarm || P.slukk.size || P.bær.size || P.rydd.size || P.samling) nullPlan(); return; }
    les(); const F = Fo(), L = Lr(), m = midte(); if (!F || !L || !m) return;
    const nu = performance.now(), dtMin = Math.max(0, dtSek / 60), t = nåTid();
    if (F.personer.some(p => !Array.isArray(p.egen))) { const n = OP.giEgenskaper(F); if (n && window.LeirSpill && nu - sistEgen > 3000) { sistEgen = nu; LeirSpill.lagre(); } }
    P.syk = sykestue(L, 'går til sykestua');
    P.samling = samling(L);
    // 1 ALARM
    const nivå = alarmNivå();
    if (nivå !== alarmFør) {
      if (nivå === 'nær') meld('Alarm! Vaktene går til stillingene, de andre i tilflukt – barn og gamle først.');
      else if (nivå === 'fjern' && !alarmFør) { const r = F.personer.filter(p => OP.har(p, 'redd')); if (r.length) meld(`Angrep meldt: ${liste(r.slice(0, 3).map(fornavn))} er redd og går alt i tilflukt.`); }
      else if (!nivå && alarmFør) meld('Faren er over – folk går tilbake til arbeidet.');
      alarmFør = nivå; }
    P.alarm = nivå;
    if (nivå) { let avh = 0; try { const T = window.SamfunnSpill && SamfunnSpill.tilstand(); avh = T && Array.isArray(T.avhengige) ? T.avhengige.length : 0; } catch (e) { avh = 0; }
      const steder = OP.tilfluktssteder(L, { ferdig, plasser: b => LB.effekt(b).plasser || 0, inngang: FG.inngang, navn: navnB, rom: rommene() });
      P.tilflukt = OP.tilflukt({ F, steder, avh, alarm: nivå, plass, leir: m }); }
    else P.tilflukt = null;
    // 2 SKADE: et stort fall i helse (kamp, brann) – ulykkene legges inn under
    for (const p of F.personer) { const h0 = helseFør.get(p.id); if (h0 != null && h0 - p.helse >= R.skade.fall && !S.skadet[p.id]) skadet(p, 'skadet'); helseFør.set(p.id, p.helse); }
    for (const k of Object.keys(S.skadet)) { const p = F.personer.find(q => q.id === +k); if (!p || p.helse >= R.skade.frisk) { if (p) meld(`${fornavn(p)} er leget og tilbake i arbeid.`); delete S.skadet[k]; P.bæres.delete(+k); } }
    // 3 BÆRING: de som ikke kan gå selv
    for (const [bid, b] of [...P.bær]) { const q = F.personer.find(x => x.id === bid); if (!q || !S.skadet[b.skadet] || !arbeidsfør(q) || !P.syk) { P.bær.delete(bid); P.bæres.delete(b.skadet); } }
    if (P.syk && !(nivå === 'nær')) for (const k of Object.keys(S.skadet)) { const p = F.personer.find(q => q.id === +k); if (!p || S.skadet[k].båret || P.bæres.has(p.id) || !OP.trengerBærer(p)) continue;
      const opptatt = new Set([...P.bær.keys(), ...P.slukk.keys(), ...Object.keys(S.skadet).map(Number)]), bb = OP.velgBærer(F, p, plass, opptatt, arbeidsfør);
      if (bb) { P.bær.set(bb.id, { skadet: p.id, fase: 'hent' }); P.bæres.set(p.id, bb.id); meld(`${fornavn(bb)} henter ${fornavn(p)} og bærer hen til sykestua.`); } }
    for (const [bid, b] of P.bær) { const sb = Gs.pers[bid], ss = Gs.pers[b.skadet]; if (!sb || !ss) continue;
      if (b.fase === 'hent' && sb.ved && sb.mål && String(sb.mål.k).startsWith('hent:')) b.fase = 'bær';
      else if (b.fase === 'bær') { ss.x = sb.x; ss.y = sb.y; ss.e = sb.e; ss.hus = sb.hus; ss.a = sb.a;
        if (sb.ved && sb.mål && String(sb.mål.k).startsWith('bærer:')) { const sk = S.skadet[b.skadet]; if (sk) sk.båret = true; ss.vi = ss.vei ? ss.vei.length : 0;
          const q = F.personer.find(x => x.id === b.skadet), qb = F.personer.find(x => x.id === bid); if (q && qb) meld(`${fornavn(qb)} har båret ${fornavn(q)} til sykestua.`);
          P.bær.delete(bid); P.bæres.delete(b.skadet); } } }
    // 4 BRANN: slukkejobb med høy prioritet
    const byggI = (x, y, r) => { const b = L.bygg.find(q => LB.BYGG[q.type] && !LB.BYGG[q.type].del && Math.abs(q.x - x) <= r + 3 && Math.abs(q.y - y) <= r + 3); return b ? navnB(b) : null; };
    P.jobber = nivå === 'nær' ? [] : OP.slukkJobber(window.BRANNER || [], m, byggI);
    if (P.jobber.length) { const opptatt = new Set([...P.bær.keys(), ...P.bæres.keys(), ...Object.keys(S.skadet).map(Number), ...(P.tilflukt ? P.tilflukt.mål.keys() : [])]);
      P.slukk = OP.velgSlukkere(F, P.jobber, plass, opptatt, arbeidsfør, P.slukk);
      const nøk = P.jobber.map(j => j.k).join('|'); if (nøk && !sistBrannLogg) meld(`Brann${P.jobber[0].navn ? ' ved ' + P.jobber[0].navn : ' i leiren'}! ${liste([...P.slukk.keys()].slice(0, 4).map(i => fornavn(F.personer.find(q => q.id === i))))} slukker (høy prioritet).`); sistBrannLogg = nøk;
      if (dtMin > 0) slukkSteg(Gs, dtMin); }
    else { P.slukk = new Map(); sistBrannLogg = ''; }
    // 5 RYDDING: ledige bærer inn det som ligger ute når det er plass inne
    rydding(Gs, ctx, F, L, m, nivå);
    // 6 ULYKKER
    if (dtMin > 0) ulykker(Gs, F, L, dtMin);
    // 7 VENNER (hvert 10. spillminutt)
    vennAkk += dtMin; if (vennAkk >= 10) { const H = OP.vennSteg(S, F, p => { const s = Gs.pers[p.id]; if (!s || !s.framme) return null; if (s.hva === 'arbeid' && p.oppgave !== 'fri') return 'j:' + p.oppgave; if (s.hva === 'mat') return 'mat'; if (s.hva === 'fri' && P.samling) return 'fri'; return null; }, Math.min(vennAkk, 600)); vennAkk = 0;
      for (const h of H.slice(0, 2)) meld(h.type === 'venn' ? `${fornavn(h.a)} og ${fornavn(h.b)} er blitt gode venner.` : `${fornavn(h.a)} og ${fornavn(h.b)} kommer ikke overens.`); }
    if (nu - sistLagret > 5000) { sistLagret = nu; lagre(); }
  }
  function skadet(p, grunn) { const s = G().pers[p.id], q = s || midte() || { x: 0, y: 0 }; S.skadet[p.id] = { fra: Math.round(nåTid()), grunn, x: q.x, y: q.y };
    const L = Lr(), syk = L && sykestue(L, ''); meld(`${fornavn(p)} er ${grunn === 'skadet' ? 'skadet' : grunn}` + (syk ? (OP.trengerBærer(p) ? ' og må bæres til sykestua.' : ' og går til sykestua.') : ' – leiren har ingen sykestue.')); }
  function slukkSteg(Gs, dtMin) {
    const V = window.VerdenSpill && VerdenSpill.tilstand ? VerdenSpill.tilstand() : null, W = window.Verden; if (!V || !V.brann || !W) return;
    let ute = 0;
    for (const j of P.jobber) { let n = 0; for (const [pid, jj] of P.slukk) if (jj.k === j.k && Gs.pers[pid] && Gs.pers[pid].ved) n++;
      if (n && tilf() < OP.slukkSjanse(n, dtMin)) { const [i, jx] = W.rute(j.x, j.y), k = i + ',' + jx; if (V.brann.celler[k]) { delete V.brann.celler[k]; V.brann.brent[k] = Math.round(nåTid()); ute++; } } }
    if (ute) { P.slukket = (P.slukket || 0) + ute; oppdaterBranner(V, W); }
  }
  function oppdaterBranner(V, W) { const Lb = W.brannListe(V.brann), B = window.BRANNER, BR = window.BRENT; if (B) { B.length = 0; for (const c of Lb.brenner) B.push(c); } if (BR) { BR.length = 0; for (const c of Lb.brent) BR.push(c); }
    try { window.dispatchEvent(new Event('riksbrudd-brann')); } catch (e) { /* eldre nettleser */ } if (typeof skitten !== 'undefined') skitten = true;
    if (window.VerdenSpill.lagre) try { VerdenSpill.lagre(); } catch (e) { /* uten lagring */ }
    if (B && !B.length) meld('Brannen i leiren er slukket – folk går tilbake til arbeidet.'); }
  function rydding(Gs, ctx, F, L, m, nivå) {
    const VS = window.VarelagerSpill, VL = window.Varelager, V = VS && VS.V ? VS.V() : null; if (!V || !VL || !VL.ryddbare || nivå || P.jobber.length) { P.rydd = new Map(); return; }
    const h = klokke(), dag = h >= 7 && h < 18;
    // ryddere: de på «Fri» i arbeidstida (ledige), de ryddige først
    for (const [pid] of [...P.rydd]) { const p = F.personer.find(q => q.id === pid); if (!p || p.oppgave !== 'fri' || !dag || !arbeidsfør(p) || harPlanUtenRydd(pid)) P.rydd.delete(pid); }
    const kø = VL.ryddbare(LB, L, V, R.rydd.maks * 2), tatt = new Set([...P.rydd.values()].map(r => r.enhet));
    for (const [pid, r] of [...P.rydd]) { const s = Gs.pers[pid]; if (!s || !s.ved || !s.mål) continue;
      if (r.fase === 'hent' && String(s.mål.k).startsWith('rydd:')) r.fase = 'bær';
      else if (r.fase === 'bær') { const p = F.personer.find(q => q.id === pid), n = VS.rydd(OP.har(p, 'ryddig') ? R.rydd.ryddig : R.rydd.perTur, r.enhet); if (n && typeof skitten !== 'undefined') skitten = true; P.rydd.delete(pid); } }
    if (!dag) return;
    const ledige = F.personer.filter(p => p.oppgave === 'fri' && arbeidsfør(p) && !p.borte && !P.rydd.has(p.id) && !harPlanUtenRydd(p.id)).sort((a, b) => (OP.har(b, 'ryddig') - OP.har(a, 'ryddig')) || a.id - b.id);
    for (const p of ledige) { if (P.rydd.size >= R.rydd.maks) break; const u = kø.find(q => !tatt.has(q.id)); if (!u) break; tatt.add(u.id);
      let q = null; try { const e = VL.finn(V, u.id); q = e && VS.punkt ? VS.punkt(e) : null; } catch (e) { q = null; }
      const B = u.bygg || (typeof u.til === 'string' && u.til[0] === 'b' ? L.bygg.find(b => 'b' + b.id === u.til) : null);
      P.rydd.set(p.id, { enhet: u.id, v: u.v, fase: 'hent', ux: q && Number.isFinite(q.x) ? q.x : m.x + 17, uy: q && Number.isFinite(q.y) ? q.y : m.y - 17, bygg: B ? B.id : null }); }
  }
  const harPlanUtenRydd = id0 => !!((P.tilflukt && P.tilflukt.mål.has(id0)) || S.skadet[id0] || P.bær.has(id0) || P.slukk.has(id0));
  // ulykker på de farlige jobbene: tretthet av nattskift, seng, mørke uten lys og helse
  function lysNå() { try { const s = window.LeirSpill && LeirSpill.siste ? LeirSpill.siste() : null; return !!(s && s.prod > 0 && s.prod >= (s.behov || 0) - 1e-6); } catch (e) { return false; } }
  function mørktNå() { const N = window.NATT; if (N && Number.isFinite(N.mørke)) return N.mørke > .45; const h = klokke(); return h >= 21.5 || h < 5.5; }
  function trøtt(p) { const F = Fo(), JR = window.Jobber, J = window.JobberSpill && JobberSpill.tilstand ? JobberSpill.tilstand() : null, h = klokke();
    let natt = h >= 22 || h < 6; try { if (JR && J && J.døgn !== false) natt = natt || JR.planFor(J, F, p).slot === 'natt'; } catch (e) { /* uten tavle */ }
    return OP.tretthet({ natt, seng: !!p.seng, mørke: mørktNå() && !lysNå(), helse: p.helse }); }
  function ulykker(Gs, F, L, dtMin) {
    const H = OP.ulykkeSteg(S, { F, tid: nåTid(), dt: dtMin, arbeider: p => { const s = Gs.pers[p.id]; return !!(s && s.hva === 'arbeid' && s.framme && s.mål && !/^bål:/.test(s.mål.k) && !harPlan(p.id)); }, tretthet: trøtt, r: tilf });
    for (const u of H) { const jobb = u.jobb === 'maskin' ? 'ved maskinene' : u.jobb === 'bygg' ? 'på byggeplassen' : u.jobb === 'hogst' ? 'i hogsten' : u.jobb === 'riving' ? 'under rivingen' : 'i verkstedet';
      const hvorfor = u.t > .6 ? ' – sliten' + (mørktNå() && !lysNå() ? ', og det var mørkt uten lys' : '') : '';
      S.skadet[u.p.id] = { fra: Math.round(nåTid()), grunn: 'ulykke', x: (Gs.pers[u.p.id] || {}).x || 0, y: (Gs.pers[u.p.id] || {}).y || 0 };
      meld(`Ulykke ${jobb}: ${fornavn(u.p)} skadet seg${hvorfor}.` + (sykestue(L, '') ? '' : ' Leiren har ingen sykestue.')); helseFør.set(u.p.id, u.p.helse); lagre(); }
  }
  FS.etter.push((Gs, dt, ctx) => { try { etter(Gs, dt, ctx); } catch (e) { window.OppforselSpill.feil = e.message; } });

  // ---------- krokene i folk.js og rekruttering.js ----------
  const stedJobb = p => (p.oppgave && p.oppgave !== 'fri' ? 'j:' + p.oppgave : null);
  // (regnes høyst én gang i sekundet – folk.js spør ofte, og parene kan være mange med 200 folk)
  let moralHurtig = { t: -1e9, v: 0 }, uvennHurtig = { t: -1e9, ids: new Set() };
  FR.moralF = (F, L) => { if (!aktiv() || !F || F !== Fo()) return 0; const nu = performance.now();
    if (nu - moralHurtig.t > 1000) moralHurtig = { t: nu, v: OP.moral(S, F, stedJobb, { samling: P.samling ? navnB(P.samling) : null, tid: nåTid() }).sum }; return moralHurtig.v; };
  const uvennIds = F => { const nu = performance.now(); if (nu - uvennHurtig.t > 1000) { const ids = new Set(); for (const p of F.personer) if (OP.uvennTempo(S, F, p) < 1) ids.add(p.id); uvennHurtig = { t: nu, ids }; } return uvennHurtig.ids; };
  const førPF = FR.personF;
  FR.personF = (p, o) => (førPF ? førPF(p, o) : 1) * (aktiv() && Fo() && o !== 'fri' && uvennIds(Fo()).has(p.id) && Fo().personer.includes(p) ? R.uvennTempo : 1);
  if (window.Rekruttering) { Rekruttering.lokkF = p => (aktiv() && Fo() ? OP.lokkF(S, Fo(), p) : 1); Rekruttering.ulykkeMinus = () => (aktiv() ? OP.søkerMinus(S, nåTid()) : 0); }

  // ---------- jobbtavla og personen ----------
  function linjer() {
    if (!aktiv()) return []; const F = Fo(); if (!F) return []; const ut = [], nv = i => { const q = F.personer.find(x => x.id === i); return q ? fornavn(q) : '?'; };
    for (const j of P.jobber) { const h = [...P.slukk].filter(([, q]) => q.k === j.k).map(([i]) => i), fr = h.filter(i => G().pers[i] && G().pers[i].ved).length;
      ut.push(`Slukk brannen${j.navn ? ' ved ' + j.navn : ''} (høy prioritet): ${h.length ? liste(h.map(nv)) + ` – ${fr} framme` : 'ingen ledige'}.`); }
    if (P.tilflukt) { const T = P.tilflukt, n = T.mål.size, sted = [...new Set([...T.mål.values()].map(s => s && s.navn).filter(Boolean))];
      ut.push(`Alarm: ${n} i tilflukt${sted.length ? ' (' + sted.slice(0, 2).join(', ') + ')' : ''}` + (T.avh.n ? `, ${T.avh.n} barn og gamle først` : '') + (P.alarm === 'nær' && T.vakter.length ? `, ${T.vakter.length} vakter i stillingene` : '') + (T.trangt ? ` – ${T.trangt} uten plass (bygg en betongbunker)` : '') + '.'); }
    for (const [bid, b] of P.bær) ut.push(`Bær ${nv(b.skadet)} til sykestua: ${nv(bid)}${b.fase === 'hent' ? ' er på vei' : ' bærer'}.`);
    const sk = Object.keys(S.skadet).filter(k => !P.bæres.has(+k)); if (sk.length && !P.syk) ut.push(`${liste(sk.map(k => nv(+k)))} er skadet – leiren har ingen sykestue.`);
    if (P.rydd.size) ut.push(`Rydd lageret: ${liste([...P.rydd.keys()].map(nv))} bærer inn det som ligger ute.`);
    return ut;
  }
  const førLinjer = FS.fastLinjer; FS.fastLinjer = () => [...linjer(), ...(førLinjer ? førLinjer() : [])];
  const førGjør = FS.gjør; FS.gjør = p => (aktiv() && harPlan(p.id) && FS.fersk() ? FS.tekst(p) : førGjør(p));
  // ved personen i Folk: venner og uvenner, skadet
  function personTekst(p) {
    if (!aktiv()) return ''; const F = Fo(); if (!F) return ''; const nv = i => { const q = F.personer.find(x => x.id === i); return q ? fornavn(q) : ''; };
    const v = OP.venner(S, F, p.id).map(nv).filter(Boolean), u = OP.uvenner(S, F, p.id).map(nv).filter(Boolean), sk = S.skadet[p.id];
    return (v.length ? ' · venn med ' + liste(v.slice(0, 3)) : '') + (u.length ? ' · uvenn med ' + liste(u.slice(0, 2)) : '') + (sk ? ' · ' + (sk.grunn === 'ulykke' ? 'skadet i en ulykke' : 'skadet') : '');
  }
  function pakkPerson() { const RS = window.RekrutteringSpill; if (!RS || RS.personDel.oppforsel) return; const før = RS.personDel; RS.personDel = p => før(p) + personTekst(p); RS.personDel.oppforsel = true; }
  pakkPerson(); setTimeout(pakkPerson, 0);

  // ---------- Leir-menyen: verneutstyr og ulykker (fanen Lager) ----------
  function registrer() { if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    OP.registrerKommandoer(Kommando, { tilstand: side => (side === (typeof MIN_SIDE !== 'undefined' ? MIN_SIDE : 'blå') && id ? S : null), betal: kr => !!(window.OppstartSpill && OppstartSpill.betal(kr)), endret: () => { lagre(); if (window.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); } }); }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; if (!r.ok && r.feil) meld(r.feil); return r; };
  function kjøpVern(pakker = 1) { const r = kom({ type: 'kjøpVern', antall: pakker }); if (r.ok && r.svar && !r.svar.feil) meld(`Kjøpte ${r.svar.sett} sett verneutstyr for ${LB.kroner(r.svar.pris)}. ${r.svar.vern} sett i alt.`); else if (r.ok && r.svar && r.svar.feil) meld(r.svar.feil); return r; }
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => {
    const F = Fo(); if (!F || !id) return;
    const far = F.personer.filter(p => OP.farlig(p.oppgave)).length, dekket = Math.min(S.vern, far), u7 = OP.ulykkerSiden(S, nåTid(), 7);
    hode.append(el('h3', { 'data-fane': 'lager' }, 'Verneutstyr og ulykker'));
    const boks = el('div', { klasse: 'forklar', id: 'vernutstyr' });
    boks.append(el('div', {}, `Ulykker siste 7 døgn: ${u7}` + (u7 ? ' – det senker moralen og gir færre søkere.' : '.')));
    boks.append(el('div', {}, `Verneutstyr: ${S.vern} sett · ${dekket} av ${far} på maskin, bygg, hogst, riving og verksted har det.`));
    boks.append(el('div', {}, `Lys om natta: ${lysNå() ? 'ja – leiren har strøm' : 'nei – uten strøm er det mørkt på arbeidsplassen'}.`));
    boks.append(el('small', {}, 'Slitne folk (nattskift, uten seng, mørke) skader seg lettere. Verneutstyr gir under halvparten så mange ulykker.'));
    hode.append(boks);
    const pris = R.vern.pakke * R.vern.pris;
    hode.append(knapp(`Kjøp ${R.vern.pakke} sett verneutstyr (${LB.kroner(pris)})`, () => kjøpVern(1), { id: 'kjopvern', 'data-fane': 'lager' }));
  });

  window.OppforselSpill = { tøm: () => { moralHurtig.t = -1e9; uvennHurtig.t = -1e9; }, test: false, på: true, alarm: null, feil: '', aktiv, tilstand: () => S, plan: () => P, sett: o => { S = OP.fraJSON(o); lagre(); }, lagre, les, linjer, personTekst, kjøpVern, lys: lysNå, trøtt,
    nullstill: () => { S = OP.ny(); nullPlan(); helseFør.clear(); alarmFør = null; sistBrannLogg = ''; lagre(); }, mål, etter: (dt = 0) => etter(G(), dt, {}), skadet };
})();
