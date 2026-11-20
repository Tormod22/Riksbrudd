'use strict';
// RUNDE 7 (20. nov natt): motstanderne blir farligere over tid. Reglene ligger i spill/eskalering.js (Eskalering), AI-en i
// spill/fraksjoner-visning.js (AI.styr er kroken herfra). Etter fredstiden får hver motstander inntekt av tettstedene den holder,
// kjøper lag og kjøretøy, samler flere lag til ett angrep (et stort tettsted, et tettsted en annen side holder – også dine – eller
// leiren din fra en viss dag), sender lag mot handelsrutene dine, og tar til slutt storbyene. Angrep mot noe av ditt varsles med
// etterretning i god tid. I testene (navigator.webdriver) skjer ingenting av seg selv før EskaleringSpill.test = true.
// Lagres per leir i «riksbrudd-eskalering». window.EskaleringSpill.
(function () {
  const E = window.Eskalering, F = window.Fraksjoner; if (!E || !F || !window.AI) return;
  const ER = E.REGLER, SIDER = ['rød', 'grønn'], NØKKEL = 'riksbrudd-eskalering';
  const api = { test: false };
  window.EskaleringSpill = api;
  const på = () => !navigator.webdriver || api.test === true;
  const auto = () => på() && AI.på;
  const ny = () => ({ v: 1, øk: { rød: E.nyØkonomi(), grønn: E.nyØkonomi() }, gruppe: { rød: null, grønn: null }, sistLeir: { rød: -1e9, grønn: -1e9 }, sistRute: { rød: 0, grønn: 0 }, rute: { rød: null, grønn: null }, biler: [], sett: {}, ferdig: [] });
  let S = ny();
  const navn = side => (F.FRAKSJONER[side] ? F.FRAKSJONER[side].navn : 'Fienden');
  const g = () => E.grad(window.SPILLREGLER);
  const fiendeF = () => (window.SPILLREGLER && SPILLREGLER.faktor && SPILLREGLER.faktor.fiende) || 1;
  const fredSlutt = () => F.fredDøgn(fiendeF()) * 1440;
  const døgn = () => tid / 1440;
  const leir = () => { const s = window.OppstartSpill && OppstartSpill.tilstand(); return s && s.leir ? s.leir : null; };
  const hvile = (a, b) => !!(AI.hvile && AI.hvile(a, b));
  const hend = (type, tekst) => { if (navigator.webdriver) return; try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type, tekst } })); } catch (e) { /* eldre nettlesere */ } };
  const alle = () => ((typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || []).filter(b => !window.OMRÅDE_OK || OMRÅDE_OK((b.bb[0] + b.bb[2]) / 2, (b.bb[1] + b.bb[3]) / 2));
  const eierAv = by => Garnison.tilstand(TETTSTEDER, by.e.id).eier;
  const iBy = (by, x, y) => x >= by.bb[0] && x <= by.bb[2] && y >= by.bb[1] && y <= by.bb[3] && Garnison.inni(by, x, y);
  const kjemper = e => levende(e) && Array.isArray(e.menn) && !e.raid && !e.post && !e.karakter && !e.leirvakt;
  const sty = e => F.styrke(e, Forsyning.ammo(e));
  const avst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // tettstedene rundt (leiren, ellers hjemmet til siden) som reglene ser dem
  function byer(side) {
    const L = leir(), h = AI.hjem ? AI.hjem()[side] : null, m = L || (h ? { x: h[0], y: h[1] } : { x: 0, y: 0 }), r = ER.plan.rekkevidde + 20000, ute = ENHETER.filter(kjemper);
    return alle().filter(b => b.bb[2] > m.x - r && b.bb[0] < m.x + r && b.bb[3] > m.y - r && b.bb[1] < m.y + r).map(b => {
      const [x, y] = AI.inne ? AI.inne(b) : [(b.bb[0] + b.bb[2]) / 2, (b.bb[1] + b.bb[3]) / 2], eier = eierAv(b), folk = b.e.folk || 0;
      // forsvarerne: de andre sidenes lag i tettstedet, og like utenfor (innen 1 km av midten – de kommer til)
      const forsvar = ute.filter(e => e.side !== side && !hvile(side, e.side) && (iBy(b, e.x, e.y) || Math.hypot(e.x - x, e.y - y) <= 1000)).reduce((a, e) => a + sty(e), 0);
      return { id: b.e.id, navn: b.e.navn, x, y, folk, eier, minst: Garnison.minstFor(folk), mann: Garnison.mannFor(folk), forsvar, tapt: !!(AI.minne && AI.minne[side] && AI.minne[side].hatt.has(b.e.id) && eier !== side), by: b };
    });
  }
  const gruppeAv = side => S.gruppe[side];
  const iGruppe = s => { const G = gruppeAv(s.side); return !!(G && G.lag.includes(s.navn)); };
  // lagene som kan sendes: ikke slått ut, ikke eneste garnison i et eget tettsted, ikke i en gruppe eller på ruteoppdrag, nok ammunisjon
  // o.småGarnison: også garnisonene i egne småsteder (under REGLER.plan.småsted innbyggere) uten fiender innen 5 km – til et storbyangrep
  // tar motstanderen dem med (tettstedet er fortsatt deres uten garnison, men står åpent)
  function fri(side, B, o = {}) {
    const lag = ENHETER.filter(e => e.ai && e.side === side && kjemper(e) && !F.slåttUt(e));
    const egne = B.filter(b => b.eier === side), fiender = ENHETER.filter(e => e.side !== side && kjemper(e) && !hvile(side, e.side));
    return lag.filter(s => {
      if (iGruppe(s) || (S.rute[side] && S.rute[side].lag === s.navn) || Forsyning.ammo(s) < .3 || s.menn.filter(m => m.hp < 1).length >= 3 || s.ombord) return false;
      const her = egne.find(b => iBy(b.by, s.x, s.y));
      if (!her || lag.some(f => f !== s && iBy(her.by, f.x, f.y) && f.navn < s.navn)) return true;
      return !!o.småGarnison && her.folk < ER.plan.småsted && !fiender.some(e => avst(e, s) < 5000);
    }).map(s => ({ id: s.navn, x: s.x, y: s.y, styrke: sty(s), lag: s }));
  }
  const medlemmer = G => ENHETER.filter(e => e.ai && kjemper(e) && G.lag.includes(e.navn));
  const intel = (G, side) => { if (!window.KrigSpill || !KrigSpill.T || !window.Krig || !Krig.meld) return; const T = KrigSpill.T(); if (!T || !T.etter) return;
    for (const e of medlemmer(G)) Krig.meld(T.etter, { navn: e.navn, side, x: G.sted.x + (Math.random() - .5) * 600, y: G.sted.y + (Math.random() - .5) * 600, t: tid, kilde: 'speidere', hva: `samles ved ${G.sted.navn || 'samlingsstedet'} mot ${G.mål.navn}`, varer: 8 * 60 }); };

  // ---------- planleggingen: én gang i timen per motstander ----------
  function planlegg(side, o = {}) {
    if (S.gruppe[side] || (!o.tving && tid < fredSlutt())) return null;
    const gr = g(), B = byer(side), frie = fri(side, B), L = leir();
    const leirOk = !o.utenLeir && L && !hvile(side, 'blå') && AI.angripLeir !== false && (o.leir || (døgn() >= gr.leirFra && tid - S.sistLeir[side] >= gr.leirHver * 1440));
    const forsvarLeir = L ? ENHETER.filter(e => e.side === 'blå' && kjemper(e) && avst(e, L) <= ER.plan.leirForsvar).reduce((a, e) => a + sty(e), 0) : 0;
    // den andre motstanderen angriper noe av ditt nå: da venter denne (du skal ikke få to angrep samtidig)
    const andre = SIDER.filter(sd => sd !== side).map(sd => S.gruppe[sd]).find(G => G && (G.mål.leir || G.mål.eier === 'blå')), blåOpptatt = !!andre && !o.tving;
    let v = E.velgMål({ side, døgn: o.døgn !== undefined ? o.døgn : døgn(), g: gr, storFra: F.fredDøgn(fiendeF()) + F.REGLER.storEtter, byer: o.bare ? B.filter(b => b.id === o.bare) : B, fri: frie, leir: leirOk ? { x: L.x, y: L.y, forsvar: forsvarLeir } : null, blåOpptatt });
    // storbyen: er de for få, tar de med garnisonene fra småstedene sine (bare mot en storby som er lov nå)
    let alleFrie = frie;
    if (!v && !o.bare) { const store = B.filter(b => b.folk >= ER.storby && b.eier !== side && E.tillatt(b, o.døgn !== undefined ? o.døgn : døgn(), gr, 0));
      if (store.length) { alleFrie = fri(side, B, { småGarnison: true }); v = E.velgMål({ side, døgn: o.døgn !== undefined ? o.døgn : døgn(), g: gr, storFra: 0, byer: store, fri: alleFrie }); } }
    if (!v) return null;
    const lag = alleFrie.filter(f => v.lag.includes(f.id)), sted = E.samlested(v.mål, B, side, lag);
    const blå = v.mål.leir || v.mål.eier === 'blå';
    const G = { mål: v.mål, lag: v.lag.slice(), behov: v.behov, sted, fase: 'samler', start: tid, angripFra: blå ? tid + gr.varsel : tid, side };
    S.gruppe[side] = G;
    for (const f of lag) { f.lag.ai.neste = 0; f.lag.ai.mål = null; }
    if (v.mål.leir) { S.sistLeir[side] = tid; if (AI.minne && AI.minne[side]) AI.minne[side].leir = true; }
    const mann = lag.reduce((a, f) => a + f.lag.menn.filter(m => m.hp > 0).length, 0);
    if (blå) { const t = E.varselTekst({ fraksjon: navn(side), antall: lag.length, mann, sted, mål: v.mål, leir: L, om: gr.varsel });
      logg(t); hend('alarm', `${navn(side)} samler ${lag.length} lag mot ${v.mål.leir ? 'leiren' : v.mål.navn}`); intel(G, side); G.varslet = true; }
    else if (v.mål.eier && sted.navn && L && Math.min(avst(sted, L), avst(v.mål, L)) <= ER.plan.rykte) logg(`Etterretning: ${navn(side)} samler ${lag.length} lag ved ${sted.navn} – trolig mot ${navn(v.mål.eier)} i ${v.mål.navn}.`);
    lagre(); skitten = true; return G;
  }

  // ---------- gruppene: fasene (hvert tiende spillminutt) ----------
  function oppdater(side) {
    const G = S.gruppe[side]; if (!G) return null;
    const M = medlemmer(G); G.lag = M.map(e => e.navn);
    const styrke = M.filter(e => !F.slåttUt(e)).reduce((a, e) => a + sty(e), 0), nær = M.filter(e => !F.slåttUt(e) && avst(e, G.sted) <= ER.plan.samleR).reduce((a, e) => a + sty(e), 0);
    let eid = false, borte = false;
    if (G.mål.leir) { const L = leir(); borte = !L || hvile(side, 'blå');
      if (L && G.fase === 'angriper' && M.some(e => avst(e, L) < 400)) G.inne = (G.inne || 0) + 10;
      eid = (G.inne || 0) >= 240; }
    else { const by = alle().find(b => b.e.id === G.mål.id); borte = !by; eid = !!by && eierAv(by) === side; }
    const før = G.fase, nå = E.fase(G, { tid, nær, styrke, eid, borte });
    if (nå === 'angriper' && før === 'samler') { G.fase = 'angriper'; G.angrepStart = tid; for (const e of M) e.ai.neste = 0;
      if (G.mål.leir || G.mål.eier === 'blå') { const km = String(Math.round(avst(G.sted, G.mål) / 100) / 10).replace('.', ',');
        logg(`${navn(side)} angriper nå: ${M.length} lag går ${G.sted.navn ? 'fra ' + G.sted.navn + ' ' : ''}mot ${G.mål.leir ? 'leiren din' : G.mål.navn} (ca. ${km} km).`); hend('alarm', `${navn(side)} angriper ${G.mål.leir ? 'leiren' : G.mål.navn}`); } }
    if (nå === 'ferdig' || nå === 'oppgitt') { S.gruppe[side] = null; for (const e of M) { e.ai.neste = 0; e.ai.mål = null; }
      S.ferdig.push({ side, mål: G.mål.navn, leir: !!G.mål.leir, eier: G.mål.eier, utfall: nå, t: tid }); if (S.ferdig.length > 30) S.ferdig.shift();
      if (G.mål.leir && nå === 'oppgitt') logg(`${navn(side)} har gitt opp angrepet på leiren din.`);
      else if (G.mål.leir) logg(`${navn(side)} trekker seg bort fra leiren.`);
      else if (G.mål.eier === 'blå' && nå === 'oppgitt') logg(`Angrepet på ${G.mål.navn} er slått tilbake – ${navn(side)} har gitt opp.`);
      lagre(); }
    return nå;
  }

  // ---------- AI.styr: lagene i en gruppe eller på ruteoppdrag følger det ----------
  AI.styr = (s, v) => {
    if (!på()) return null;
    const R = S.rute[s.side];
    if (R && R.lag === s.navn) {
      if (tid > R.til || F.slåttUt(s)) { S.rute[s.side] = null; return null; }
      if (v.hva === 'angrip' || v.hva === 'trekk' || v.hva === 'forsyn') return null;
      return avst(s, R) > 200 ? { hva: 'samle', x: R.x, y: R.y, tekst: `går mot ${R.navn} for å stenge den` } : { hva: 'hold', x: s.x, y: s.y, tekst: `stenger ${R.navn}` };
    }
    const G = gruppeAv(s.side); if (!G || !G.lag.includes(s.navn)) return null;
    if (F.slåttUt(s)) { G.lag = G.lag.filter(n => n !== s.navn); return null; }
    if (v.hva === 'angrip') return null;
    if (G.fase === 'samler') { if (v.hva === 'forsyn' || v.hva === 'trekk') return null; const ved = G.sted.navn ? `ved ${G.sted.navn}` : 'på samlingsstedet';
      return avst(s, G.sted) > 300 ? { hva: 'samle', x: G.sted.x, y: G.sted.y, tekst: `samles ${ved} for å angripe ${G.mål.navn}` } : { hva: 'hold', x: s.x, y: s.y, tekst: `venter ${ved} – angrep mot ${G.mål.navn}` }; }
    if (G.mål.leir) return { hva: 'leir', mål: 'leir', x: G.mål.x, y: G.mål.y, tekst: 'angriper leiren din' };
    // fienden som står i tettstedet: gå inntil den (Fraksjoner.velg vet om den)
    if (v.hva === 'jakt') return null;
    const by = alle().find(b => b.e.id === G.mål.id);
    if (by && iBy(by, s.x, s.y) && avst(s, G.mål) <= F.REGLER.midten) return { hva: 'hold', x: s.x, y: s.y, tekst: `tar ${G.mål.navn}` };
    return { hva: 'ta', mål: G.mål.id, x: G.mål.x, y: G.mål.y, tekst: `angriper ${G.mål.navn} med ${G.lag.length} lag` };
  };

  // ---------- handelsruter og oljekolonner ----------
  function ruter(L) {
    const ut = [];
    if (window.RegionSpill && RegionSpill.status) { try { for (const q of RegionSpill.status().values()) if (q.rute && Array.isArray(q.rute.punkter) && q.rute.punkter.length > 1) ut.push({ navn: `handelsruta fra ${q.by.e.navn}`, punkter: q.rute.punkter }); } catch (e) { /* regionen er ikke klar */ } }
    for (const k of KJORETOY) if (k.side === 'blå' && k.oppdrag && k.sti && k.sti.P && k.sti.P.length >= 4) { const P = []; for (let i = 0; i < k.sti.P.length; i += 2) P.push({ x: k.sti.P[i], y: k.sti.P[i + 1] }); ut.push({ navn: `ruta til ${k.navn}`, punkter: P }); }
    return ut.map(r => ({ ...r, p: E.rutePunkt(r.punkter, L) })).filter(r => r.p);
  }
  function rute(side, o = {}) {
    const gr = g(), L = leir(); if (!L || S.rute[side] || hvile(side, 'blå')) return null;
    if (!o.tving && (tid < fredSlutt() || tid - S.sistRute[side] < ER.rute.hver)) return null;
    S.sistRute[side] = tid; if (!o.tving && Math.random() >= gr.rute) return null;
    const frie = fri(side, byer(side)); if (frie.length < (o.tving ? 1 : 2)) return null;   // det siste frie laget holdes igjen
    let best = null; for (const r of ruter(L)) for (const f of frie) { const d = avst(f, r.p); if (d <= ER.rute.avstand && (!best || d < best.d)) best = { r, f, d }; }
    if (!best) return null;
    S.rute[side] = { lag: best.f.id, x: best.r.p.x, y: best.r.p.y, til: tid + ER.rute.holdMaks, navn: best.r.navn };
    best.f.lag.ai.neste = 0; best.f.lag.ai.mål = null;
    logg(`Etterretning: et lag fra ${navn(side)} er på vei mot ${best.r.navn}. Sett et lag ved ruta som vakt, eller jag dem bort.`);
    lagre(); return S.rute[side];
  }

  // ---------- økonomien: inntekt hver spilltime, kjøp ----------
  AI.ekstraBiler = { rød: [], grønn: [] };
  const stedFor = side => { const egne = alle().filter(b => eierAv(b) === side).sort((a, b) => (b.e.folk || 0) - (a.e.folk || 0));
    if (egne[0]) { const [x, y] = AI.inne(egne[0]); return { x, y, navn: egne[0].e.navn }; } const h = AI.hjem()[side]; return { x: h[0], y: h[1], navn: null }; };
  function lagBil(side, type, x, y, navnet) { if (!window.Kjoretoy || !Kjoretoy.TYPER || !Kjoretoy.TYPER[type]) return null;
    const k = Kjoretoy.ny({ navn: navnet, type, antall: 1, x, y, side }); KJORETOY.push(k); if (type === 'lastebil') AI.ekstraBiler[side].push(k); return k; }
  function økonomi(side, min) {
    const gr = g(), Ø = S.øk[side], holder = alle().filter(b => eierAv(b) === side), folk = holder.reduce((a, b) => a + (b.e.folk || 0), 0);
    E.tjen(Ø, folk, min, gr);
    const dEtter = (tid - fredSlutt()) / 1440; if (dEtter < 0) return null;
    const lag = ENHETER.filter(e => e.ai && e.side === side && levende(e)).length;
    const tak = E.tak(F.lagTak(holder.length, Math.floor(døgn())), dEtter, gr, holder.length);
    const biler = AI.ekstraBiler[side].filter(k => KJORETOY.includes(k)).length + (AI.biler && AI.biler[side] && KJORETOY.includes(AI.biler[side]) ? 1 : 0);
    const vogner = KJORETOY.filter(k => k.side === side && k.type === 'stridsvogn').length;
    const hva = E.kjøp(Ø, { lag, tak, lastebiler: biler, stridsvogner: vogner, døgn: døgn(), g: gr }); if (!hva) return null;
    const st = stedFor(side); let ut = null;
    if (hva === 'lag') { ut = AI.nytt(side, st.x + (Math.random() - .5) * 200, st.y + (Math.random() - .5) * 200); if (synlig(ut)) logg(`${navn(side)} har rekruttert et nytt lag: ${ut.navn}.`); }
    else { const n = (Ø.kjøpt[hva] || 0) + 1, eier = F.FRAKSJONER[side].eieform; ut = lagBil(side, hva, st.x + 30, st.y + 20, hva === 'lastebil' ? `${eier} lastebil ${n + 1}` : `${eier} stridsvogn${n > 1 ? ' ' + n : ''}`); if (!ut) return null;
      S.biler.push(ut.navn); if (hva === 'stridsvogn') logg(`Etterretning: ${navn(side)} har fått en stridsvogn${st.navn ? ' i ' + st.navn : ''}.`); }
    E.betal(Ø, hva); lagre(); skitten = true; return hva;
  }
  // stridsvogna kjører med angrepet når vegnettet finnes
  function vogner(side) { const G = S.gruppe[side]; if (!G || G.fase !== 'angriper' || !window.VEGNETT || !window.Kjoretoy) return;
    for (const k of KJORETOY) { if (k.side !== side || k.type !== 'stridsvogn' || k.sti || avst(k, G.mål) < 800) continue;
      try { Kjoretoy.planlegg(k, window.VEGNETT, [G.mål.x, G.mål.y]); } catch (e) { /* ingen veg dit */ } } }

  // ---------- simuleringen ----------
  let akk = 0, timeAkk = 0;
  KROKER.sim.push(dt => {
    AI.leirMedVarsel = på();
    if (!auto() || !leir()) return;
    akk += dt; if (akk < 10) return; const min = akk; akk = 0; timeAkk += min;
    for (const side of SIDER) oppdater(side);
    if (timeAkk < ER.plan.hver) return; const t = timeAkk; timeAkk = 0;
    for (const side of SIDER) { økonomi(side, t); if (!planlegg(side)) rute(side); vogner(side); }
  });

  // ---------- kartet: samlingsstedet og pila mot målet for angrep du er varslet om ----------
  KROKER.tegn.push((gc, vx0, vy1) => {
    if (!på()) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    for (const side of SIDER) { const G = S.gruppe[side]; if (!G || !G.varslet) continue;
      const x = sx(G.sted.x), y = sy(G.sted.y), mx = sx(G.mål.x), my = sy(G.mål.y), r = Math.max(14, ER.plan.samleR / m);
      if (Math.max(x, mx) < -60 || Math.min(x, mx) > VW + 60 || Math.max(y, my) < -60 || Math.min(y, my) > VH + 60) continue;
      gc.save(); gc.strokeStyle = sidefarge(side, 'sti'); gc.fillStyle = sidefarge(side, 'lys'); gc.lineWidth = 2; gc.setLineDash([6, 5]);
      gc.beginPath(); gc.arc(x, y, r, 0, 6.283); gc.stroke();
      // pila: fra kanten av ringen mot målet
      const a = Math.atan2(my - y, mx - x), x0 = x + Math.cos(a) * r, y0 = y + Math.sin(a) * r, d = Math.hypot(mx - x0, my - y0);
      if (d > 20) { const x1 = mx - Math.cos(a) * 14, y1 = my - Math.sin(a) * 14; gc.beginPath(); gc.moveTo(x0, y0); gc.lineTo(x1, y1); gc.stroke(); gc.setLineDash([]);
        gc.beginPath(); gc.moveTo(x1 + Math.cos(a) * 10, y1 + Math.sin(a) * 10); gc.lineTo(x1 + Math.cos(a + 2.5) * 10, y1 + Math.sin(a + 2.5) * 10); gc.lineTo(x1 + Math.cos(a - 2.5) * 10, y1 + Math.sin(a - 2.5) * 10); gc.closePath(); gc.fill(); }
      gc.setLineDash([]); gc.font = '600 13px "Cormorant Garamond", serif'; gc.textAlign = 'center'; gc.lineWidth = 3; gc.strokeStyle = 'rgba(20,16,12,.85)';
      // teksten holdes inne på skjermen (på telefon står ringen ofte ved kanten)
      const t = `${navn(side)}: ${G.lag.length} lag ${G.fase === 'samler' ? 'samles' : 'angriper'}`, w = gc.measureText(t).width, lx = Math.max(w / 2 + 8, Math.min(VW - w / 2 - 8, x)), ly = Math.max(70, y - r - 6);
      const ty = window.Etikett ? Etikett.tekst(gc, t, lx, ly, -1) : ly;
      gc.strokeText(t, lx, ty); gc.fillText(t, lx, ty); gc.restore(); }
  });

  // ---------- krigskartet: hva motstanderne har ----------
  { const KT = window.KRIG_TILLEGG = window.KRIG_TILLEGG || {}; KT.side = KT.side || [];
    KT.side.push(side => { if (!SIDER.includes(side) || !på()) return null; const n = ENHETER.filter(e => e.ai && e.side === side && levende(e)).length, G = S.gruppe[side];
      return `${n} lag` + (G && G.varslet ? ` · samler ${G.lag.length} lag ${G.sted.navn ? 'ved ' + G.sted.navn : 'i terrenget'} mot ${G.mål.leir ? 'leiren din' : G.mål.navn}` : '') + (tid < fredSlutt() ? ' · samler styrker (fredstid)' : ''); }); }
  KROKER.lagTekst.push(s => (s.ai && iGruppe(s) ? `i angrepsgruppa mot ${gruppeAv(s.side).mål.navn}` : null));

  // ---------- lagring per leir ----------
  const leirId = () => { const L = leir(); return L ? Math.round(L.x) + ',' + Math.round(L.y) : null; };
  function pakk() { return { v: 1, leir: leirId(), øk: S.øk, gruppe: S.gruppe, sistLeir: S.sistLeir, sistRute: S.sistRute, rute: S.rute, ferdig: S.ferdig,
    biler: KJORETOY.filter(k => S.biler.includes(k.navn)).map(k => ({ navn: k.navn, type: k.type, side: k.side, x: Math.round(k.x), y: Math.round(k.y), skade: k.skade || 0, antall: k.antall })) }; }
  let lagreTid = 0;
  function lagre(tving) { if (!på() || !leirId()) return; if (!tving && performance.now() - lagreTid < 3000) return; lagreTid = performance.now(); try { localStorage.setItem(NØKKEL, JSON.stringify(pakk())); } catch (e) { /* fullt eller sperret */ } }
  function les() {
    let o = null; try { o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { o = null; }
    S = ny(); if (!o || o.leir !== leirId()) return false;
    for (const sd of SIDER) { if (o.øk && o.øk[sd]) Object.assign(S.øk[sd], o.øk[sd]); if (o.gruppe && o.gruppe[sd] && o.gruppe[sd].mål) S.gruppe[sd] = o.gruppe[sd];
      if (o.sistLeir && isFinite(o.sistLeir[sd])) S.sistLeir[sd] = o.sistLeir[sd]; if (o.sistRute && isFinite(o.sistRute[sd])) S.sistRute[sd] = o.sistRute[sd]; if (o.rute && o.rute[sd]) S.rute[sd] = o.rute[sd]; }
    S.ferdig = Array.isArray(o.ferdig) ? o.ferdig.slice(-30) : [];
    for (const b of Array.isArray(o.biler) ? o.biler : []) { if (!SIDER.includes(b.side) || KJORETOY.some(k => k.navn === b.navn) || !isFinite(b.x) || !isFinite(b.y)) continue;
      const k = lagBil(b.side, b.type, b.x, b.y, b.navn); if (k) { k.skade = b.skade || 0; S.biler.push(k.navn); } }
    return true;
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { if (på()) les(); }, 2500));
  window.addEventListener('pagehide', () => lagre(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) lagre(true); });
  setInterval(() => { if (auto()) lagre(); }, 15000);

  Object.assign(api, { S: () => S, nullstill: () => { S = ny(); }, planlegg, oppdater, rute, økonomi, byer, fri, pakk, les, lagre, grad: g, fredSlutt });
})();
