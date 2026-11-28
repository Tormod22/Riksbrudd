'use strict';
/* Riksbrudd – SPIONER OG SABOTØRER, visningen (28. nov, pakke «spioner», ut6; reglene i spill/spion.js). window.SpionSpill.
 *  - SØKERNE (spill/rekruttering.js, krokene Rekruttering.nySøker / ansattKrok): en ny søker kan være sendt av Ravnsund eller Mosevakt
 *    (sjansen etter hvor mye dere ligger foran, SeierSpill.bilde().verdi). Med kontrollrom og kameravakt (folk på overvåking eller et smart
 *    kamera) kan søkerkortet få merket «Noe stemmer ikke».
 *  - EN SPION I LEIREN: AI.minne[side].leir = true (de vet hvor leiren og lageret er), RivalSpill.spion(side) gjør at rivalen tar tilbudene
 *    deres oftere og saboterer oftere og hardere (spill/rival-visning.js), og under et angrep fra spionens side kan porten bli åpnet
 *    (KROKER.ild: forsvarerne nær leiren får flere treff i en halvtime).
 *  - OPPDAGE (hver natt, ved dagskiftet kl. 06): kameravakta / vakta, leirsjefen (LedereSpill), og merket på søkerkortet. Folk-panelet
 *    (RekrutteringSpill.del pakkes inn) får delen «Mistanke» med «Avhør», «Spark» og – når spionen er avslørt – «Falskt sted» / «Falsk kontrakt».
 *  - EGNE SPIONER: Selskapet → Partnere (FirmaSpill.fane / trykk pakkes inn): «Send spion», hva spionen har funnet, «Saboter», «Hent hjem».
 *    KROKER.ser: dere ser lagene til rivalen dere har en spion hos.
 *  - Alt som endrer noe, går gjennom KOMMANDO (spionAvhør, spionSpark, spionFalsk, spionSend, spionHjem, spionSabotér).
 *  - I testene (navigator.webdriver) kommer ingen spioner og ingenting skjer av seg selv før SpionSpill.test = true.
 *  - Lagres per leir i «riksbrudd-spion» ({ leir: 'x,y', S }). Egne spioner er tatt ut av folket og ligger i S.ute.
 * Alle tall er Claudes forslag (Spion.REGLER).
 */
(function () {
  const SP = window.Spion; if (!SP || typeof KROKER === 'undefined') return;
  const R = SP.REGLER, NØKKEL = 'riksbrudd-spion', SIDER = SP.SIDER, api = { test: false };
  window.SpionSpill = api;
  let S = SP.ny(), leirId = '', klar = false, akk = 0, sistDag = null, nærFør = {}, angrepNr = {}, portTil = {}, gaLeir = {};
  const auto = () => !navigator.webdriver || api.test === true;
  const nå = () => (typeof tid === 'number' && Number.isFinite(tid) ? tid : 0);
  const Sp = () => (window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null);
  const leir = () => { const s = Sp(); return s && s.leir ? s.leir : null; };
  const Fo = () => (window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null);
  const FR = () => window.FolkRegler;
  const navn = side => (window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[side] ? Fraksjoner.FRAKSJONER[side].navn : side === 'rød' ? 'Ravnsund' : 'Mosevakt');
  const kr = v => (window.Leir && Leir.kroner ? Leir.kroner(v) : Math.round(v) + ' kr');
  const mill = v => String(Math.round(v / 1e5) / 10).replace('.', ',') + ' mill. kr';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fornavn = p => String(p && p.navn || '').split(' ')[0];
  const melde = t => { if (typeof logg === 'function') logg(t); };
  const pst = v => Math.round(v * 100) + ' %';

  // ---------- lagring per leir ----------
  function lagre() { if (!leirId || (window.NETT && NETT.gjest)) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, S, gaLeir })); } catch (e) { /* fullt eller sperret */ } }
  function start() {
    const L = leir(); if (!L) return; const id = Math.round(L.x) + ',' + Math.round(L.y); if (id === leirId && klar) { koble(); return; }
    leirId = id; let d = null; try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (o && o.leir === id) d = o; } catch (e) { d = null; }
    S = (d && SP.fraJSON(d.S)) || SP.ny((Math.round(L.x) * 13 + Math.round(L.y) * 7) >>> 0); gaLeir = d && d.gaLeir ? { ...d.gaLeir } : {};
    sistDag = null; klar = true; koble();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- det vi leser fra spillet ----------
  function verdier() { try { const B = window.SeierSpill && SeierSpill.bilde ? SeierSpill.bilde() : null; if (B && B.verdi) return { blå: B.verdi.blå.sum, rød: B.verdi.rød.sum, grønn: B.verdi.grønn.sum }; } catch (e) { /* uten seier */ } return { blå: 1, rød: 1, grønn: 1 }; }
  const kameraer = () => { try { return window.KameraSpill && KameraSpill.kameraer ? KameraSpill.kameraer() : []; } catch (e) { return []; } };
  const smart = () => kameraer().some(c => (c.nivå || 1) >= 3);
  const kamFolk = () => { try { return window.KameravaktSpill ? KameravaktSpill.tempo() : 0; } catch (e) { return 0; } };
  const rom = () => { try { return !!(window.KameravaktSpill && KameravaktSpill.rom()); } catch (e) { return false; } };
  // god vakt = kontrollrom som virker, og folk på overvåking eller et smart kamera
  const godVakt = () => rom() && (kamFolk() > 0 || smart());
  function leder() {
    try { const T = window.LedereSpill && LedereSpill.tilstand ? LedereSpill.tilstand() : null, A = T && T.ledere && T.ledere.leirsjef, F = Fo(); if (!A || !F) return null;
      const p = F.personer.find(q => q.id === A.person); if (!p) return null; return { pid: p.id, navn: p.navn, ledelse: FR() && FR().ledelse ? FR().ledelse(p) : .9 }; } catch (e) { return null; }
  }
  const Ø = side => { try { const E = window.EskaleringSpill && EskaleringSpill.S(); return E && E.øk ? E.øk[side] : null; } catch (e) { return null; } };
  const lagFor = side => (typeof ENHETER !== 'undefined' ? ENHETER.filter(e => e.ai && e.side === side && typeof levende === 'function' && levende(e)) : []);
  const byNavn = id => { try { const b = (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted || []).find(q => q.e && String(q.e.id) === String(id)); return b ? b.e.navn : null; } catch (e) { return null; } };
  const FT = () => (window.FirmaSpill && FirmaSpill.tilstand ? FirmaSpill.tilstand() : null);
  const endretFolk = () => { if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (window.FolkSpill && FolkSpill.vis) FolkSpill.vis(); if (typeof skitten !== 'undefined') skitten = true; };

  // ---------- koblingene ----------
  function koble() {
    if (window.Rekruttering && !Rekruttering.nySøker) Rekruttering.nySøker = (s, t) => {
      if (!klar || !auto()) return; const r = SP.rng(S);
      // høyst én spion fra hver rival: heller ikke når en søker fra samme rival alt står på lista
      const venter = window.RekrutteringSpill && RekrutteringSpill.tilstand() ? RekrutteringSpill.tilstand().søkere.filter(q => q.spion).map(q => q.spion.side) : [];
      const x = SP.velgSender({ ...S, inne: S.inne.concat(venter.map(side => ({ side }))) }, verdier(), r);
      if (x) s.spion = { side: x.side };
      if (SP.tvil(s, godVakt(), r)) s.tvil = true; lagre();
    };
    if (window.Rekruttering && !Rekruttering.ansattKrok) Rekruttering.ansattKrok = (s, p) => {
      if (!klar) return;
      if (s.spion) SP.inn(S, p.id, s.spion.side, nå(), { tvil: !!s.tvil });
      else if (s.tvil) SP.leggMistanke(S, p.id, R.søker.tvilMistanke, 'historien stemte ikke med ryktet');
      if (s.spion || s.tvil) { minne(); lagre(); }
    };
    if (window.RivalSpill) RivalSpill.spion = side => (klar ? SP.virkning(S, side) : null);
    if (window.AI) AI.leirPunkt = side => { if (!klar) return null; const f = SP.falskSted(S, side, nå()); return f ? { x: f.x, y: f.y, navn: 'leiren din' } : null; };
    if (window.RekrutteringSpill && !koble.rk) { koble.rk = true; const gml = RekrutteringSpill.del;
      RekrutteringSpill.del = function (h) { const ut = gml.apply(this, arguments); try { merkSøkere(ut, h); return mistankeDel(h).concat(ut); } catch (e) { console.error(e); return ut; } }; }
    if (window.FirmaSpill && FirmaSpill.fane && !koble.fs) { koble.fs = true; const gf = FirmaSpill.fane, gt = FirmaSpill.trykk;
      FirmaSpill.fane = function () { const h = gf.apply(this, arguments); try { return h + partnerHtml(); } catch (e) { console.error(e); return h; } };
      FirmaSpill.trykk = function (b) { if (b && b.dataset && b.dataset.sp === 'fi-spion') return trykk(b); return gt.apply(this, arguments); }; }
    registrer();
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(koble, 0)); setTimeout(koble, 0);

  // AI.minne: en spion forteller rivalen hvor leiren er. Når spionen er borte (sparket, brent, vendt), glemmer de det igjen – hvis det var spionen som sa det.
  function minne() {
    if (!window.AI || !AI.minne) return;
    for (const side of SIDER) { const M = AI.minne[side]; if (!M) continue; const inne = SP.innsyn(S, side);
      if (inne) { if (!M.leir && !gaLeir[side]) gaLeir[side] = true; M.leir = true; M.spion = true; }
      else { if (gaLeir[side]) { M.leir = false; delete gaLeir[side]; } M.spion = false; } }
  }

  // ---------- kommandoene ----------
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    const min = s => s === (typeof MIN_SIDE !== 'undefined' ? MIN_SIDE : 'blå');
    SP.registrerKommandoer(Kommando, { tilstand: s => (min(s) && klar ? S : null), folk: s => (min(s) ? Fo() : null), nå, rett: RETT });
  }
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; if (!r.ok && r.feil) melde(r.feil); else if (r.svar && r.svar.feil) melde(r.svar.feil); return r; };
  const person = id => { const F = Fo(); return F ? F.personer.find(p => p.id === id) : null; };
  const moral = d => { const F = Fo(); if (F && Number.isFinite(F.moral)) F.moral = Math.max(0, Math.min(100, F.moral + d)); };
  const RETT = {
    avhør(k) { const p = person(k.person); const r = SP.startAvhør(S, k.person, nå()); if (r.feil) return r; const M = S.mistanke[String(k.person)];
      M.avhør.før = p.oppgave; p.oppgave = 'fri'; lagre(); endretFolk();
      const t = `Avhøret av ${p.navn} er i gang (${R.avhør.timer} timer – hen arbeider ikke imens).`; melde(t); return { tekst: t }; },
    spark(k) { const F = Fo(), p = person(k.person), r = SP.spark(S, k.person); FR().fjern(F, k.person); moral(r.moral); minne(); lagre(); endretFolk();
      const t = r.spion ? `${p.navn} har fått sparken. ${r.avslørt ? `Spionen fra ${navn(r.side)} er ute av leiren` : 'Hen var faktisk spion – folkene puster lettet ut'}. ${navn(r.side)} ser ikke lenger inn i leiren.`
        : `${p.navn} har fått sparken. Folkene mener hen var uskyldig – moralen faller (${r.moral}).`; melde(t); return { tekst: t, ...r }; },
    falsk(k) { const p = person(k.person), r = SP.falsk(S, k.person, k.hva, nå(), SP.rng(S), { leir: leir() }); if (r.feil) return r;
      if (r.hva === 'kontrakt') { const ø = Ø(r.side); if (ø) ø.kr = Math.max(0, ø.kr - r.tap); }
      minne(); lagre(); if (typeof skitten !== 'undefined') skitten = true;
      const t = (r.hva === 'sted' ? `${p.navn} har fortalt ${navn(r.side)} at leiren ligger et annet sted. De angriper der det neste døgnet.` : `${p.navn} har lurt ${navn(r.side)} inn i en falsk kontrakt – de taper ca. ${mill(r.tap)}.`)
        + (r.brent ? ` ${navn(r.side)} skjønte det og har trukket ${fornavn(p)} ut – hen er ikke lenger spion for dem.` : ''); melde(t); return { tekst: t, ...r }; },
    send(k) { const F = Fo(), p = person(k.person), r = SP.send(S, p, k.rival, nå()); if (r.feil) return r; FR().fjern(F, p.id); delete S.mistanke[String(p.id)];
      SP.leggFunn(S, k.rival, rapport(k.rival), nå()); lagre(); endretFolk(); const t = `${p.navn} er sendt inn hos ${navn(k.rival)} som spion (egnet ${pst(r.egnet)}). Dere ser lagene deres nå.`; melde(t); return { tekst: t }; },
    hjem(k) { const F = Fo(), r = SP.hjem(S, k.rival); if (r.feil) return r; const p = { ...r.p, oppgave: 'fri' }; if (!F.personer.some(q => q.id === p.id)) F.personer.push(p);
      lagre(); endretFolk(); const t = `${p.navn} er tilbake fra ${navn(k.rival)}.`; melde(t); return { tekst: t }; },
    sabotér(k) { const RS = window.RivalSpill && RivalSpill.S ? RivalSpill.S() : null, sd = RS && RS.sider ? RS.sider[k.rival] : null, sag = sd && sd.sag;
      const u = S.ute[k.rival] || null, r = SP.sabotér(S, k.rival, !!sag, nå()); if (r.feil) return r;
      if (r.mål === 'sag' && sag) sag.hp = Math.max(0, (Number.isFinite(sag.hp) ? sag.hp : 1) - r.skade); else { const ø = Ø(k.rival); if (ø) ø.kr = Math.max(0, ø.kr - r.kr); }
      if (window.RivalSpill && RivalSpill.lagre) RivalSpill.lagre();
      let t = r.mål === 'sag' ? `Spionen har sabotert sagbruket til ${navn(k.rival)}${sag.navn ? ' i ' + sag.navn : ''} (−${Math.round(r.skade * 100)} %).` : `Spionen har satt fyr på et lager hos ${navn(k.rival)} – de taper ca. ${mill(r.kr)}.`;
      if (r.avslørt) t += ' ' + avslørtEgen(k.rival, r.p || (u && u.p)); else SP.leggFunn(S, k.rival, t, nå());
      lagre(); melde(t); return { tekst: t, ...r }; },
  };
  // en egen spion er avslørt: personen er tapt, en pakt med rivalen er brutt (av dere), ryktet faller
  function avslørtEgen(side, p) {
    let brøt = false; const F = FT();
    try { if (F && window.Firma) for (const q of Firma.aktivePakter(F, nå())) if (q.side === side && Firma.brytPakt(F, q.id, 'blå', nå())) brøt = true; if (brøt && FirmaSpill.lagre) FirmaSpill.lagre(); } catch (e) { /* uten firma */ }
    try { const T = window.SelskapSpill && SelskapSpill.tilstand ? SelskapSpill.tilstand() : null; if (T && window.Selskap) { Selskap.endreRykte(T, 'blå', { pålitelig: R.egen.rykte }); if (SelskapSpill.lagre) SelskapSpill.lagre(); } } catch (e) { /* uten selskap */ }
    return `${navn(side)} har avslørt spionen deres${p ? ', ' + p.navn : ''} – hen er tapt.` + (brøt ? ' Pakten med dem er brutt av dere.' : '') + ` Ryktet som pålitelig faller (${R.egen.rykte}).`;
  }
  // det spionen ser hos rivalen nå (én linje)
  function rapport(side) {
    const d = [], ø = Ø(side), L = lagFor(side); if (ø) d.push(`kassa ca. ${mill(ø.kr)}`);
    d.push(`${L.length} lag (${L.reduce((a, s) => a + (s.menn || []).filter(m => m.hp > 0).length, 0)} mann)`);
    try { const v = window.RivalSpill && RivalSpill.vei ? RivalSpill.vei(side) : null; if (v) d.push(`satser på ${v}`); } catch (e) { /* */ }
    try { const sd = RivalSpill.S().sider[side]; if (sd && sd.sag) d.push(`sagbruk i ${sd.sag.navn || 'et tettsted'} (${Math.round((sd.sag.hp ?? 1) * 100)} %)`); } catch (e) { /* */ }
    const mål = [...new Set(L.map(s => s.ai && s.ai.målBy).filter(x => x != null).map(byNavn).filter(Boolean))]; if (mål.length) d.push(`planlegger å ta ${mål.slice(0, 2).join(' og ')}`);
    if (window.AI && AI.minne && AI.minne[side] && AI.minne[side].leir) d.push('vet hvor leiren deres er');
    return d.join(' · ');
  }

  // ---------- tiden ----------
  function steg(dt) {
    if (!klar) { if (leir()) start(); return; } akk += dt; if (akk < 1) return; const d = akk; akk = 0; const F = Fo(); if (!F) return;
    let lagr = false;
    // spioner som ikke lenger er i leiren (falt, gått, lokket bort)
    const ider = new Set(F.personer.map(p => p.id)); const før = S.inne.length; S.inne = S.inne.filter(s => ider.has(s.pid)); if (S.inne.length !== før) lagr = true;
    minne();
    // avhørene som er ferdige
    for (const [k, M] of Object.entries(S.mistanke)) { if (!M.avhør || nå() < M.avhør.til) continue; const p = person(+k), oppg = M.avhør.før; const L0 = leder();
      const r = SP.avhørFerdig(S, +k, SP.rng(S), L0 ? L0.ledelse : .9); lagr = true; if (!p) continue; if (oppg && FR().OPPGAVER.includes(oppg)) p.oppgave = oppg;
      if (r.avslørt) melde(`Avhøret av ${p.navn}: hen innrømmer å være sendt av ${navn(r.side)}! Gi hen sparken – eller bruk hen til å gi ${navn(r.side)} falske opplysninger (Folk-panelet).`);
      else if (r.uskyldig) { moral(r.moral); p.lojal = Math.max(0, Math.min(1, (p.lojal ?? .6) + r.lojal)); melde(`Avhøret av ${p.navn}: ingenting tyder på at hen er spion. Folkene liker ikke mistanken – moralen faller (${r.moral}).`); }
      else melde(`Avhøret av ${p.navn} ga ingen svar. Mistanken står fortsatt.`);
      endretFolk(); }
    // falske opplysninger: rivalen når det falske stedet og skjønner at de er lurt
    for (const side of SIDER) { const f = SP.falskSted(S, side, nå()); if (!f) continue;
      if (lagFor(side).some(s => Math.hypot(s.x - f.x, s.y - f.y) < 350)) { f.til = 0; lagr = true; const L1 = leir() || f, km = String(Math.round(Math.hypot(f.x - L1.x, f.y - L1.y) / 100) / 10).replace('.', ',');
        melde(`${navn(side)} gikk løs på et tomt sted ${km} km fra leiren – de falske opplysningene virket.`); } }
    // porten under et angrep fra spionens side
    const Lp = leir();
    if (Lp && auto()) for (const side of SIDER) { const nær = lagFor(side).some(s => Math.hypot(s.x - Lp.x, s.y - Lp.y) < R.port.nær);
      if (nær && !nærFør[side]) angrepNr[side] = (angrepNr[side] || 0) + 1; nærFør[side] = nær;
      if (nær && SP.port(S, side, angrepNr[side], SP.rng(S))) { portTil[side] = nå() + R.port.minutter; const s = S.inne.find(q => q.side === side && !q.vendt);
        if (s) SP.leggMistanke(S, s.pid, 25, 'var ved porten da den ble åpnet'); lagr = true;
        melde(`Noen har åpnet porten for ${navn(side)}! Angriperne kommer raskere inn – forsvarerne i leiren tar flere treff den neste halvtimen.`);
        try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'alarm', tekst: 'Porten er åpnet innenfra' } })); } catch (e) { /* */ } } }
    // dagskiftet (kl. 06): natta som var, og egne spioner
    const dag = Math.floor(nå() / 1440); if (sistDag === null) sistDag = dag;
    else if (dag > sistDag) { sistDag = dag; if (auto()) { morgen(); lagr = true; } }
    if (lagr) lagre();
  }
  KROKER.sim.push(steg);
  function morgen() {
    const F = Fo(); if (!F) return; const pider = F.personer.filter(p => !p.karakter).map(p => p.id), L0 = leder(), før = new Set(pider.filter(pid => SP.mistenkt(S, pid)));
    const H = SP.natt(S, { pider, kamera: { antall: kameraer().length, smart: smart(), folk: rom() ? kamFolk() : 0 }, vakt: F.personer.filter(p => p.oppgave === 'vakt' && p.helse >= .4).length, leder: L0 });
    for (const h of H) { const p = person(h.pid); if (!p) continue; const ny = SP.mistenkt(S, h.pid) && !før.has(h.pid);
      if (ny) melde(`Mistanke: ${h.type === 'leder' && L0 ? `leirsjefen ${fornavn({ navn: L0.navn })} stoler ikke på ${p.navn}` : h.grunn.replace('hen', p.navn)}. Se «Mistanke» i Folk-panelet.`); }
    for (const h of SP.egenDøgn(S)) melde(avslørtEgen(h.side, h.p));
    for (const side of SIDER) if (S.ute[side]) SP.leggFunn(S, side, rapport(side), nå());
    if (window.FolkSpill && FolkSpill.vis) FolkSpill.vis();
  }
  // porten åpnet: forsvarerne nær leiren får flere treff, og skyter dårligere
  KROKER.ild.push((a, b) => {
    if (!a || !b) return 1; const Lp = leir(); if (!Lp) return 1;
    if (b.side === 'blå' && portTil[a.side] > nå() && Math.hypot(b.x - Lp.x, b.y - Lp.y) < R.port.radius) return R.port.ild;
    if (a.side === 'blå' && portTil[b.side] > nå() && Math.hypot(a.x - Lp.x, a.y - Lp.y) < R.port.radius) return R.port.svar;
    return 1;
  });
  // egne spioner: dere ser lagene til rivalen
  KROKER.ser.push(e => !!(klar && e && e.side !== 'blå' && S.ute[e.side]));
  if (KROKER.lagTekst) KROKER.lagTekst.push(s => { if (!klar || !s || !s.ai || !S.ute[s.side]) return null; const m = s.ai.målBy != null ? byNavn(s.ai.målBy) : null; return m ? `spionen: skal ta ${m}` : 'spionen ser dem'; });

  // ---------- Folk-panelet ----------
  const css = document.createElement('style');
  css.textContent = `#folkmeny .tvil{ color:#e8a46a; font-size:12.5px; margin-top:3px; } #folkmeny .mistanke{ border:1px solid #8a5a2a; background:#241a10; padding:7px 9px; margin:6px 0; font-size:13.5px; line-height:1.35; }
#folkmeny .mistanke b{ font-weight:600; } #folkmeny .mistanke small{ display:block; color:var(--ink-dim); font-size:12.5px; } #folkmeny .mistanke.avslørt{ border-color:#c0503a; background:#2e1410; }
#folkmeny .mistanke .rad{ margin-top:5px; flex-wrap:wrap; }`;
  document.head.appendChild(css);
  function merkSøkere(ut, h) {
    const T = window.RekrutteringSpill && RekrutteringSpill.tilstand(); if (!T || !godVakt()) return;
    for (const n of ut) { if (!n || !n.classList || !n.classList.contains('søker')) continue; const s = T.søkere.find(q => String(q.id) === n.getAttribute('data-søker'));
      if (s && s.tvil) n.insertBefore(h.el('div', { klasse: 'tvil', title: 'Kameravakta har sjekket søkeren: historien stemmer ikke med det folk sier om hen. Kan være en spion.' }, '⚠ Noe stemmer ikke med historien'), n.lastChild); }
  }
  function mistankeDel({ el, knapp }) {
    const F = Fo(); if (!klar || !F) return [];
    const liste = F.personer.filter(p => !p.karakter && (SP.mistenkt(S, p.id) || (SP.spionFor(S, p.id) || {}).avslørt));
    if (!liste.length) return [];
    const ut = [el('h3', { id: 'mistanke' }, `Mistanke (${liste.length})`)];
    for (const p of liste) { const M = S.mistanke[String(p.id)] || { m: 0, grunner: [] }, s = SP.spionFor(S, p.id), avsl = s && s.avslørt;
      const rad = el('div', { klasse: 'rad' });
      if (M.avhør) rad.append(el('small', {}, `Avhør pågår – ferdig om ${Math.max(1, Math.round((M.avhør.til - nå()) / 60))} t.`));
      else { if (!avsl) rad.append(knapp(`Avhør (${R.avhør.timer} t)`, () => kom({ type: 'spionAvhør', person: p.id }), { 'data-avhor': String(p.id), title: 'Tar noen timer. Kan avsløre en spion – en uskyldig liker det ikke.' }));
        rad.append(knapp('Spark', () => kom({ type: 'spionSpark', person: p.id }), { 'data-spark': String(p.id), title: avsl ? 'Spionen går, og rivalen ser ikke lenger inn i leiren' : 'Er hen uskyldig, faller moralen' }));
        if (avsl && !s.vendt) { const f = SP.kanFalsk(S, p.id, nå());
          const b1 = knapp('Falskt sted', () => kom({ type: 'spionFalsk', person: p.id, hva: 'sted' }), { 'data-falsk': 'sted', title: 'Rivalen tror leiren ligger et annet sted og angriper der' });
          const b2 = knapp('Falsk kontrakt', () => kom({ type: 'spionFalsk', person: p.id, hva: 'kontrakt' }), { 'data-falsk': 'kontrakt', title: `Rivalen tar en kontrakt som ikke finnes og taper ca. ${mill(R.falsk.tap)}` });
          if (f) { b1.disabled = b2.disabled = true; b1.title = b2.title = f; } rad.append(b1, b2); }
        else if (avsl && s.vendt) rad.append(el('small', {}, 'Brukt til falske opplysninger – rivalen stoler på hen enda.')); }
      ut.push(el('div', { klasse: 'mistanke' + (avsl ? ' avslørt' : ''), 'data-mistenkt': String(p.id) },
        el('div', {}, el('b', {}, p.navn), avsl ? ` – avslørt: sendt av ${navn(s.side)}` : ` – mistanke ${Math.round(M.m)} %`),
        el('small', {}, M.grunner.length ? M.grunner.join(' · ').replace(/^./, c => c.toUpperCase()) : 'Ingen klare grunner'), rad)); }
    ut.push(el('div', { klasse: 'status' }, 'En spion gir rivalen innsyn i leiren (hvor den er, kontraktene, sabotasje). Mistanke mot en uskyldig senker moralen.'));
    return ut;
  }

  // ---------- Selskapet → Partnere: egne spioner ----------
  let valgt = { rød: null, grønn: null };
  function kandidater() { const F = Fo(); if (!F || !FR()) return []; return F.personer.filter(p => !p.karakter && FR().arbeidsfør(p) && !SP.mistenkt(S, p.id) && !SP.spionFor(S, p.id)).sort((a, b) => SP.egnethet(b) - SP.egnethet(a) || a.id - b.id); }
  const knappH = (tekst, data, tittel = '') => `<button type="button" data-sp="fi-spion"${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}${tittel ? ` title="${esc(tittel)}"` : ''}>${esc(tekst)}</button>`;
  function partnerHtml() {
    if (!klar || !Fo()) return ''; const K = kandidater(); let h = '<div class="fi-del">Egne spioner</div>';
    for (const side of SIDER) { const u = S.ute[side]; h += `<div class="fi-boks" data-spion="${side}"><h4>Hos ${esc(navn(side))}</h4>`;
      if (u) { h += `<div class="fi-linje"><b>${esc(u.p.navn)}</b> er inne hos dem (egnet ${pst(u.egnet)}). Dere ser lagene deres i kartet.</div>`;
        h += `<div class="fi-linje">Nå: ${esc(rapport(side))}</div>`;
        if (u.funn.length > 1) h += u.funn.slice(1, 4).map(f => `<div class="fi-linje" style="color:#a99e85">Dag ${Math.floor(f.t / 1440) + 1}: ${esc(f.tekst)}</div>`).join('');
        const fs = SP.kanSabotere(S, side, nå()); let harSag = false; try { harSag = !!RivalSpill.S().sider[side].sag; } catch (e) { harSag = false; }
        h += `<div class="fi-knapper">${knappH(harSag ? 'Saboter sagbruket' : 'Sett fyr på et lager', { gjør: 'sab', side }, fs || 'Kan avsløre spionen')}${knappH('Hent hjem', { gjør: 'hjem', side })}</div>`;
        h += `<p class="fi-mangler">Risiko: avslørt ca. ${pst(Math.min(R.egen.avslørtMaks, R.egen.avslørt / u.egnet))} per døgn, mer ved sabotasje. Avslørt = personen er tapt, en pakt med dem er brutt, og ryktet faller.</p>`; }
      else { let p = K.find(q => q.id === valgt[side]) || K[0]; if (p) valgt[side] = p.id;
        if (p) h += `<div class="fi-linje">Send en av folkene deres inn som spion: dere ser lagene og planene deres, og kan sabotere sagbruket.</div>`
          + `<div class="fi-knapper">${knappH(`Send ${p.navn} (egnet ${pst(SP.egnethet(p))})`, { gjør: 'send', side, person: p.id })}${K.length > 1 ? knappH('Velg en annen', { gjør: 'bytt', side }) : ''}</div>`
          + `<p class="fi-mangler">Modige og nattmennesker egner seg best, pratsomme og redde dårligst. Personen arbeider ikke i leiren så lenge.</p>`;
        else h += '<div class="fi-linje">Ingen ledige folk å sende.</div>'; }
      h += '</div>'; }
    return h;
  }
  function trykk(b) {
    const d = b.dataset, side = d.side;
    if (d.gjør === 'bytt') { const K = kandidater(); const i = K.findIndex(q => q.id === valgt[side]); valgt[side] = K.length ? K[(i + 1) % K.length].id : null; return true; }
    if (d.gjør === 'send') { kom({ type: 'spionSend', person: +d.person, rival: side }); return true; }
    if (d.gjør === 'hjem') { kom({ type: 'spionHjem', rival: side }); return true; }
    if (d.gjør === 'sab') { kom({ type: 'spionSabotér', rival: side }); return true; }
    return false;
  }

  Object.assign(api, { tilstand: () => S, sett: o => { S = SP.fraJSON(o) || SP.ny(); lagre(); }, nullstill: () => { S = SP.ny(); gaLeir = {}; portTil = {}; nærFør = {}; minne(); lagre(); },
    start, lagre, koble, steg, morgen, minne, rapport, godVakt, portTil: () => ({ ...portTil }), åpnePort: (side, min = R.port.minutter) => { portTil[side] = nå() + min; }, rett: RETT, NØKKEL });
})();
