'use strict';
// S6 i kartet: stridsvogn, rakettartilleri, radarbil og drone (regler: spill/enheter.js). Kjøretøyene bruker kjoretoy-visning.js
// (kjøring, panel, tegning), forsyning (drivstoff) og økonomien (bygges på basen). Dronene sendes fra basens panel.
// Kroker: KROKER.sim, trykk, tegn, tegn3d, ser (fienden synes) og tåke (hull i tåka), KJ_PANEL, KJ_TEKST og BASE_PANEL.
(function () {
  const E = Enheter, R = E.REGLER, rng = Terreng.frø(2023), DRONER = [], SALVER = [], SMELL = [];
  Object.assign(Kjoretoy.TYPER, E.KJORETOY); Object.assign(Forsyning.REGLER.drivstoff, R.drivstoff);
  for (const k of ['pris', 'byggetid', 'navn']) Object.assign(Okonomi.REGLER[k], R[k]);
  KJORETOY.push(Kjoretoy.ny({ navn: 'Stridsvogn 1', type: 'stridsvogn', antall: 1, x: 193620, y: 6896640, retning: -1.2 }),
    Kjoretoy.ny({ navn: 'Rakettartilleri 1', type: 'rakettartilleri', antall: 1, x: 192600, y: 6895800, retning: -1.2 }));
  window.DRONER = DRONER; window.SALVER = SALVER;
  let ildModus = null, droneModus = null, nyeDroner = 0;
  const av = t => KJORETOY.filter(k => k.type === t && k.side === 'blå');
  const kmTekst = m => nf.format(Math.round(m / 100) / 10) + ' km';
  // Ser noen av våre punktet? (lagenes siktfelt, dronene og radaren) – observert ild treffer bedre.
  // (19. nov) Artilleriet skyter på et punkt, ikke på et mål det ser selv, så en observatør er greit – men observasjonen må nå fram:
  // laget må ha radiokontakt (KROKER.innsyn, som for det du ser på kartet). Vaktene og kameraene i leiren er ikke observatører.
  const observert = (X, Y) => ENHETER.some(s => s.side === 'blå' && levende(s) && ser(s, X, Y) && KROKER.innsyn.every(f => f(s))) || DRONER.some(d => E.droneSer(d, X, Y));

  // ---------- stridsvognas egen sikt (19. nov) ----------
  // Før skjøt vogna på alt du visste om (synlig(): også det vaktene, kameraene og dronene meldte), selv bak en ås eller i skogen.
  // Nå: siktfeltet fra tårnet (Terreng.siktfelt, øyne 3 m), regnet i bakgrunnen når vogna har flyttet seg; til det er klart, den gamle
  // regelen (sirkel på 1,2 km, ikke inn i skog). Siktfeltet ligger utenfor kjøretøyet (WeakMap), så det ikke lagres.
  const RS = R.egenSikt, VSIKT = new WeakMap();
  async function vognSikt(k) {
    const o = VSIKT.get(k) || {}; VSIKT.set(k, o); o.jobb = true; o.bedt = performance.now();
    try {
      const X = k.x, Y = k.y, r = R.stridsvogn.sikt, v = await lagVindu([X - r - 100, Y - r - 100, X + r + 100, Y + r + 100], false), m = Terreng.siktfelt(v, X, Y, r, RS.øyne);
      const [oi, oj] = Terreng.rute(v, X, Y), Rc = Math.ceil(r / v.r) + 1, i0 = Math.max(0, oi - Rc), j0 = Math.max(0, oj - Rc), i1 = Math.min(v.w - 1, oi + Rc), j1 = Math.min(v.h - 1, oj + Rc), w = i1 - i0 + 1, h = j1 - j0 + 1;
      const mk = new Uint8Array(w * h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) mk[j * w + i] = m[(j0 + j) * v.w + i0 + i];
      o.sikt = { x0: v.x0 + i0 * v.r, y0: v.y0 - j0 * v.r, m: mk, mw: w, mh: h, r: v.r }; o.ved = [X, Y];
    } catch (e) { console.error(e); } finally { o.jobb = false; }
  }
  // Ser vogna punktet selv? true/false, eller null når siktfeltet ikke er regnet her ennå (da gjelder den gamle sirkelen)
  // (et lag inne i skogen ser vogna bare på nært hold, RS.skog meter – som før, da hele skogen var skjult for den)
  function vognSer(k, X, Y, e) {
    const d = Math.hypot(k.x - X, k.y - Y); if (d > R.stridsvogn.sikt) return false;
    if (e && e.her && e.her.k === 1 && d > RS.skog) return false;
    const o = VSIKT.get(k);
    if (o && o.sikt && Math.hypot(k.x - o.ved[0], k.y - o.ved[1]) <= RS.gammel) return ser({ sikt: o.sikt }, X, Y);
    return true;
  }
  // Et eget lag rett ved vogna (RS.nabo) som ser punktet – det kan vise vogna målet
  const naboSer = (k, X, Y) => ENHETER.some(s => s.side === k.side && levende(s) && !s.ombord && Math.hypot(s.x - k.x, s.y - k.y) <= RS.nabo && ser(s, X, Y));
  const kanonF = (k, b) => E.kanonFaktor(vognSer(k, b.x, b.y, b), naboSer(k, b.x, b.y), synlig(b));
  window.vognSer = vognSer;
  KROKER.sim.push(() => {
    const nå = performance.now();
    for (const k of KJORETOY) { if (k.type !== 'stridsvogn') continue; const o = VSIKT.get(k);
      if (o && (o.jobb || nå - o.bedt < 1500)) continue;
      if (!o || !o.ved || Math.hypot(k.x - o.ved[0], k.y - o.ved[1]) > RS.flytt) vognSikt(k); }
  });

  // ---------- hva dronene og radaren ser ----------
  KROKER.ser.push(e => DRONER.some(d => E.droneSer(d, e.x, e.y)) || av('radar').some(r => E.radarSer(r, e))
    || av('stridsvogn').some(k => vognSer(k, e.x, e.y, e)));
  KROKER.tåke.push((g, vx0, vy1) => {
    const m = kam.m; g.fillStyle = '#000';
    for (const d of DRONER) { if (d.fase === 'tom') continue; g.beginPath(); g.arc((d.x - vx0) / m, (vy1 - d.y) / m, R.drone.sikt / m, 0, 6.283); g.fill(); }
  });

  // ---------- simulering ----------
  KROKER.sim.push(dt => {
    const sek = dt * 3600 / TIME;
    for (const k of KJORETOY) { if (k.type === 'rakettartilleri') E.lad(k, sek); if (k.type === 'radar') { const før = (k.iRo || 0) >= R.radar.oppstart; E.radarSteg(k, sek);
      if (!før && k.iRo >= R.radar.oppstart && k.side === 'blå') logg(`${k.navn} har satt opp radaren og ser bevegelse på åpen mark innen ${R.radar.rekkevidde / 1000} km.`); } }
    for (let i = DRONER.length - 1; i >= 0; i--) { const d = DRONER[i], h = E.droneSteg(d, sek);
      if (h === 'framme') logg(`${d.navn} er over målet og ser ${nf.format(R.drone.sikt / 1000)} km rundt seg.`);
      if (h === 'tom') { logg(`${d.navn} har tomt batteri og er borte.`); DRONER.splice(i, 1); }
      skitten = true; }
    for (let i = SALVER.length - 1; i >= 0; i--) { const s = SALVER[i]; s.igjen -= sek; if (s.igjen > 0) continue; SALVER.splice(i, 1); slå(s); }
    // stridsvognene skyter i kamprundene (som lagene, hvert KAMPRUNDE_MIN spillminutt)
    if (Math.floor((tid + dt) / Terreng.KAMPRUNDE_MIN) !== Math.floor(tid / Terreng.KAMPRUNDE_MIN)) { for (const k of av('stridsvogn')) kanon(k); motKjøretøy(); }
  });
  function treffPå(b, treff, hva) {
    for (const [m, h] of Terreng.fordelTreff(b.menn, treff, rng)) if (b.side === 'blå') logg(`${m.navn} (${m.rolle}, ${b.navn}) er ${h}${hva ? ' ' + hva : ''}.`);
    if (b.menn[b.leder].hp < 1) { const ny = b.menn.findIndex(m => m.hp >= 1); if (ny >= 0) b.leder = ny; }
    if (Terreng.slattUt(b.menn) && !b.slattUtMeldt) { b.slattUtMeldt = true; logg(b.navn + ' er slått ut av kamp (' + Terreng.uteAvKamp(b.menn) + ' av 12 falt eller såret).');
      if (b.side !== 'blå') ordre(b, b.x + (rng() - .5) * 6000, b.y + (rng() - .5) * 6000, true); }
    if (valgt === b) visPanel(); skitten = true;
  }
  function kanon(k) {
    // (19. nov) bare mål vogna selv ser, eller som et eget lag rett ved ser – det andre har meldt, gir ikke skudd (kanonF)
    const lag = ENHETER.filter(b => b.side !== k.side && levende(b) && !Terreng.slattUt(b.menn) && !(window.AI && AI.hvile && AI.hvile(k.side, b.side)));
    const valg = E.velgKanonmål(k, lag, b => kanonF(k, b));
    let best = valg && valg.mål, bd = valg ? valg.avstand : R.stridsvogn.rekkevidde;
    // ROLLER (18. nov): ingen lag i sikte – da skyter kanonen på fiendens kjøretøy
    if (!best) { const kv = E.velgKanonmål(k, KJORETOY.filter(q => q.side !== k.side), q => kanonF(k, q)), kj = kv && kv.mål, kd = kv && kv.avstand;
      if (kj) { const t = E.tynn(E.kanonMotKj(kd, { skytterPåMarsj: !!k.sti, målPåMarsj: !!kj.sti }, rng), kv.faktor, rng); if (k.skyterPå !== kj) logg(`${k.navn} skyter mot ${kj.navn} (${Math.round(kd)} m).`); k.skyterPå = kj; SKUDD.push({ a: k, b: kj, til: performance.now() + 1400 }); if (t) skadKj(kj, t, true, k.navn); return; }
      k.skyterPå = null; meldtUtenSikt(k, lag); return; }
    let treff = E.tynn(E.kanonrunde(bd, { målISkog: !!best.her && best.her.k === 1, skytterPåMarsj: !!k.sti }, rng), valg.faktor, rng);
    // ROLLER (18. nov): kanonen knekker stillinger – et mål i skyttergrav eller stilling tar flere treff, og stillingen kan rives
    { const RS = R.roller.stridsvogn, ST = window.STILLINGER || [], iSt = ST.some(q => q.side === best.side && Math.hypot(q.x - best.x, q.y - best.y) <= 25);
      if ((best.nedgravd || iSt) && (!window.KrigSpill || KrigSpill.auto())) { let t = treff; for (let i = 0; i < treff; i++) if (rng() < RS.dekkFaktor - 1) t++; treff = t;
        if (treff && iSt) for (const i of E.rivStillinger(ST, best.x, best.y, 25, 1 - Math.pow(1 - RS.stillingSjanse, treff), rng)) { ST.splice(i, 1); logg(`${k.navn} har skutt i stykker stillingen til ${best.navn}.`); } } }
    if (k.skyterPå !== best) logg(`${k.navn} skyter mot ${best.navn} (${Math.round(bd)} m).`); k.skyterPå = best;
    SKUDD.push({ a: k, b: best, til: performance.now() + 1400 });
    if (treff) { if (synlig(best)) logg(`${best.navn}: ${treff} treff fra ${k.navn}.`); treffPå(best, treff); }
  }
  // Et fiendelag du vet om innen rekkevidden, men som vogna ikke ser: si fra én gang per lag (RS.minnes spillminutter), så spilleren
  // skjønner hvorfor den ikke skyter og kan kjøre nærmere eller sende et lag dit.
  function meldtUtenSikt(k, lag) {
    if (k.side !== 'blå') return; let b = null, bd = R.stridsvogn.rekkevidde;
    for (const q of lag) { const d = Math.hypot(q.x - k.x, q.y - k.y); if (d < bd && synlig(q)) { bd = d; b = q; } }
    if (!b) return; k.meldtSett = k.meldtSett || {}; const n = k.meldtSett[b.navn];
    if (n !== undefined && tid - n < RS.minnes) return; k.meldtSett[b.navn] = tid;
    logg(`${k.navn}: ${b.navn} er meldt ${Math.round(bd)} m unna, men vogna ser dem ikke selv – kjør nærmere eller send et lag dit.`);
  }
  // Lag som ikke skjøt mot et annet lag sist runde, skyter mot kjøretøy fra en annen side som de ser innen 600 m.
  function motKjøretøy() {
    for (const a of ENHETER) {
      if (!levende(a) || Terreng.slattUt(a.menn) || (a.skyterPå && a.skyterPå.size)) continue;
      // (18. nov, del 3) et kjøretøy som skyter på laget, røper seg: laget svarer selv om det ikke ser det (stridsvogna skyter på alt du vet
      // om – også det vaktene og kameraene melder –, så et lag i skogen ble skutt i stykker uten å kunne svare)
      let best = null, bd = 600; for (const k of KJORETOY) { if (k.side === a.side) continue; const d = Math.hypot(k.x - a.x, k.y - a.y); if (d < bd && (ser(a, k.x, k.y) || k.skyterPå === a)) { bd = d; best = k; } }
      if (!best) continue;
      const ildf = KROKER.ild.reduce((v, h) => v * h(a, best), 1); if (ildf <= 0) continue;
      let treff = Terreng.ildrunde(a.menn, bd, { målPåMarsj: !!best.sti }, rng); if (ildf < 1) treff = [...Array(treff)].filter(() => rng() < ildf).length;
      SKUDD.push({ a, b: best, til: performance.now() + 1400 });
      if (!best.angrepet || tid - best.angrepet > 30) logg(`${best.navn} er under ild fra ${synlig(a) ? a.navn : 'fienden'} (${Math.round(bd)} m)!`); best.angrepet = tid;
      if (treff) skadKj(best, treff, false, synlig(a) ? a.navn : 'fienden');
    }
  }
  function skadKj(k, treff, artilleri, fra) {
    const T = Kjoretoy.TYPER[k.type], r = E.skad(k, treff, artilleri);
    if (r.ødelagt) logg(r.borte ? `${k.navn} er ødelagt (${fra}).` : `${k.navn}: ${r.ødelagt} ${r.ødelagt === 1 ? T.navn.toLowerCase() : T.flertall} ødelagt, ${k.antall} igjen.`);
    if (r.borte) { const i = KJORETOY.indexOf(k); if (i >= 0) KJORETOY.splice(i, 1); Kjoretoy.stopp(k); k.oppdrag = null;
      if (window.valgtKjoretoy && valgtKjoretoy() === k && window.slippKjoretoy) { slippKjoretoy(); document.getElementById('panel').classList.remove('på'); } }
    else if (window.valgtKjoretoy && valgtKjoretoy() === k) visKjoretoy(k);
    skitten = true;
  }
  window.skadKjoretoy = skadKj;
  function slå(s) {
    SMELL.push({ x: s.x, y: s.y, t: performance.now() }); const treffet = E.nedslag(s, ENHETER.filter(levende), rng);
    const egne = treffet.filter(([b, t]) => b.side === 'blå' && t), fi = treffet.filter(([b, t]) => b.side !== 'blå' && t);
    logg(`Salven fra ${s.fra} slo ned ${Math.round(Math.hypot(s.x - s.mål[0], s.y - s.mål[1]))} m fra målet` + (fi.length ? ` – ${fi.map(([b, t]) => `${b.navn}: ${t} treff`).join(', ')}.` : treffet.length ? ' – ingen treff.' : ' – ingen enheter i nærheten.'));
    if (egne.length) logg('Egne tap i salven: ' + egne.map(([b, t]) => `${b.navn} ${t}`).join(', ') + '!');
    for (const [b, t] of treffet) if (t) treffPå(b, t, 'av artilleri');
    // ROLLER (18. nov): salven river stillinger nær nedslaget
    { const ST = window.STILLINGER || []; for (const i of E.rivStillinger(ST, s.x, s.y, R.roller.rakettartilleri.stillingRadius, 1, rng)) { ST.splice(i, 1); logg('Salven rev en stilling.'); } }
    for (const [k, t] of E.nedslagKj(s, KJORETOY.slice(), rng)) if (t) { logg(`${k.navn} ble truffet av salven.`); skadKj(k, t, true, 'artilleri'); }
  }

  // ---------- panelene ----------
  KJ_TEKST.push(k => {
    if (k.type === 'rakettartilleri') return k.lader > 0 ? `lader om (${Math.ceil(k.lader / 60)} min)` : `klar til å skyte, ${R.artilleri.minimum / 1000}–${R.artilleri.rekkevidde / 1000} km` + ` · ${R.roller.rakettartilleri.tekst}`;
    if (k.type === 'radar') return k.sti ? 'radar pakket ned (kjører)' : (k.iRo || 0) >= R.radar.oppstart ? `radar i drift, ${R.radar.rekkevidde / 1000} km` : `setter opp radaren (${Math.ceil((R.radar.oppstart - (k.iRo || 0)) / 60)} min)`;
    if (k.type === 'stridsvogn') return `kanon ${R.stridsvogn.rekkevidde / 1000} km, ${R.roller.stridsvogn.tekst}` + (k.skyterPå ? ' · i ildkamp' : '') + (k.skade ? ` · skade ${Math.round(100 * k.skade)} %` : '');
    return k.skade ? `skade ${Math.round(100 * k.skade)} %` : null;
  });
  // (19. nov) meldte mål kan vogna kjøre mot: knappen gir kjøreordre mot det nærmeste fiendelaget du vet om, men som vogna ikke ser selv
  // (innen RS.kjørMot meter)
  function meldtMål(k) { let b = null, bd = RS.kjørMot;
    for (const q of ENHETER) { if (q.side === k.side || !levende(q) || Terreng.slattUt(q.menn) || !synlig(q)) continue; const d = Math.hypot(q.x - k.x, q.y - k.y);
      if (d < bd && kanonF(k, q) <= 0) { bd = d; b = q; } }
    return b ? { lag: b, avstand: bd } : null; }
  KJ_PANEL.push((k, H) => {
    if (k.type !== 'stridsvogn' || k.side !== 'blå' || typeof window.kjørTil !== 'function') return; const m = meldtMål(k); if (!m) return;
    const b = knapp(`Kjør mot ${m.lag.navn} (${kmTekst(m.avstand)})`, false, () => { window.kjørTil(k, m.lag.x, m.lag.y); logg(`${k.navn} kjører mot ${m.lag.navn}, som er meldt, men ikke sett fra vogna.`); });
    b.title = 'Vogna skyter bare på det den ser selv eller et eget lag rett ved ser. Kjør nærmere.'; H.appendChild(b);
  });
  KJ_PANEL.push((k, H) => {
    if (k.type !== 'rakettartilleri') return;
    const på = ildModus === k;
    const b = knapp(på ? 'Velg mål på kartet …' : 'Ild …', på, () => { ildModus = på ? null : k;
      if (ildModus) logg(`Trykk der salven skal slå ned (${R.artilleri.minimum / 1000}–${R.artilleri.rekkevidde / 1000} km). Ser noen av våre målet, treffer den bedre.`); visKjoretoy(k); skitten = true; });
    if (k.lader > 0 || k.sti) { b.disabled = true; b.style.opacity = '.5'; b.title = k.sti ? 'Må stå i ro' : 'Lader om'; }
    H.appendChild(b);
  });
  window.BASE_PANEL = window.BASE_PANEL || [];
  BASE_PANEL.push((b, H) => {
    const på = droneModus === b, kn = knapp(på ? 'Velg hvor dronen skal fly …' : `Send drone … (${R.drone.pris} t)`, på, () => { droneModus = på ? null : b;
      if (droneModus) logg(`Trykk der dronen skal fly. Den ser ${nf.format(R.drone.sikt / 1000)} km rundt seg, også over fjellet, i ${R.drone.levetid / 3600} timer.`); visBase(b); skitten = true; });
    if (b.beholdning < R.drone.pris && !på) { kn.disabled = true; kn.style.opacity = '.5'; kn.title = 'For lite olje'; }
    H.appendChild(kn);
  });
  function sendDrone(b, X, Y) {
    if (b.beholdning < R.drone.pris) { logg(`${b.navn}: for lite olje til en drone (${R.drone.pris} t).`); return null; }
    b.beholdning -= R.drone.pris; const d = E.nyDrone({ navn: `Drone ${++nyeDroner}`, x: b.x, y: b.y, mål: [X, Y] }); DRONER.push(d);
    logg(`${d.navn} letter fra ${b.navn}: ${kmTekst(Math.hypot(X - b.x, Y - b.y))}, framme om ca. ${Math.round(Math.hypot(X - b.x, Y - b.y) / (R.drone.fart / 3.6) / 60)} min.`); skitten = true; return d;
  }
  function ild(k, X, Y) {
    const obs = observert(X, Y), r = E.avfyr(k, [X, Y], obs, rng);
    if (r.feil) { logg(`${k.navn}: ${r.feil}`); return null; }
    SALVER.push(r.salve); logg(`${k.navn} skyter en salve mot målet ${kmTekst(Math.hypot(X - k.x, Y - k.y))} unna (${obs ? 'observert' : 'ingen ser målet – stor spredning'}). Nedslag om ${R.artilleri.flytid} s.`);
    skitten = true; return r.salve;
  }
  window.S6 = { sendDrone, ild, observert, treffPå, skadKj, kanon, motKjøretøy, vognSer, naboSer, kanonF, vognSikt, meldtMål };   // for sjekk.js
  KROKER.trykk.unshift((X, Y) => {
    if (ildModus) { const k = ildModus; ildModus = null; ild(k, X, Y); visKjoretoy(k); return true; }
    if (droneModus) { const b = droneModus; droneModus = null; sendDrone(b, X, Y); if (window.visBase) visBase(b); return true; }
    return false;
  });

  // ---------- tegning ----------
  function drone(g, x, y, v, valgtNå) {
    g.save(); g.translate(x, y); g.rotate(v); g.fillStyle = '#c9d3dc'; g.strokeStyle = 'rgba(20,16,10,.9)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(8, 0); g.lineTo(-6, -9); g.lineTo(-3, 0); g.lineTo(-6, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  function smell(g, x, y, alder) {   // nedslag: lysglimt og røyk som blekner i 4 s
    const f = alder / 4000; if (f >= 1) return false;
    g.fillStyle = `rgba(255,${180 - 120 * f | 0},80,${(.8 * (1 - f) * (1 - f)).toFixed(3)})`; g.beginPath(); g.arc(x, y, 8 + 22 * f, 0, 6.283); g.fill();
    g.fillStyle = `rgba(60,55,50,${(.5 * (1 - f)).toFixed(3)})`; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + Math.cos(i * 1.3) * 14 * f, y + Math.sin(i * 1.3) * 10 * f - 10 * f, 6 + 10 * f, 0, 6.283); g.fill(); }
    return true;
  }
  KROKER.tegn.push((g, vx0, vy1) => {
    const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m], nå = performance.now(); g.save();
    for (const r of av('radar')) if ((r.iRo || 0) >= R.radar.oppstart && (window.valgtKjoretoy && valgtKjoretoy() === r || m < 120)) {
      const [x, y] = S(r.x, r.y); g.strokeStyle = 'rgba(160,200,230,.45)'; g.lineWidth = 1.2; g.setLineDash([6, 6]); g.beginPath(); g.arc(x, y, R.radar.rekkevidde / m, 0, 6.283); g.stroke(); g.setLineDash([]); }
    for (const k of av('rakettartilleri')) if (ildModus === k || (window.valgtKjoretoy && valgtKjoretoy() === k)) { const [x, y] = S(k.x, k.y);
      g.strokeStyle = 'rgba(224,112,63,.6)'; g.lineWidth = 1.4; g.setLineDash([8, 6]); g.beginPath(); g.arc(x, y, R.artilleri.rekkevidde / m, 0, 6.283); g.stroke();
      g.beginPath(); g.arc(x, y, R.artilleri.minimum / m, 0, 6.283); g.stroke(); g.setLineDash([]); }
    for (const d of DRONER) { const [x, y] = S(d.x, d.y);
      g.strokeStyle = 'rgba(201,211,220,.55)'; g.lineWidth = 1; g.setLineDash([3, 5]); g.beginPath(); g.arc(x, y, R.drone.sikt / m, 0, 6.283); g.stroke(); g.setLineDash([]);
      const t = nå / 1000, [vx, vy] = d.fase === 'flyr' ? [0, 0] : [Math.cos(t) * 12, Math.sin(t) * 12]; drone(g, x + vx, y + vy, d.fase === 'flyr' ? -d.retning : -t - Math.PI / 2);
      g.font = '600 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)';
      const tx = `${d.navn} · ${Math.ceil(d.igjen / 60)} min`; g.strokeText(tx, x, y + 26); g.fillStyle = '#e7dcc3'; g.fillText(tx, x, y + 26); }   // under, så navnet på det dronen ser står fritt
    for (const s of SALVER) { const [x, y] = S(s.x, s.y); g.strokeStyle = 'rgba(224,112,63,.85)'; g.lineWidth = 1.5; const r = 6 + 4 * Math.sin(nå / 120);
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.moveTo(x - 12, y); g.lineTo(x + 12, y); g.moveTo(x, y - 12); g.lineTo(x, y + 12); g.stroke(); }
    for (let i = SMELL.length - 1; i >= 0; i--) { const s = SMELL[i], [x, y] = S(s.x, s.y); if (!smell(g, x, y, nå - s.t)) SMELL.splice(i, 1); }
    g.restore();
    if (DRONER.length || SALVER.length || SMELL.length) skitten = true;
  });
  KROKER.tegn3d.push((g, proj) => {
    const nå = performance.now();
    for (const d of DRONER) { const q = proj(d.x, d.y); if (q) drone(g, q[0], q[1] - 60, -d.retning); }
    for (let i = SMELL.length - 1; i >= 0; i--) { const s = SMELL[i], q = proj(s.x, s.y); if (q && !smell(g, q[0], q[1], nå - s.t)) SMELL.splice(i, 1); }
  });
})();
