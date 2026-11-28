'use strict';
/* Riksbrudd – VAREKONTRAKTER I SPILLET (fase Ø2, 28. nov; docs/plan-selskap-okonomi.md kapittel 7). Reglene: spill/vare.js (window.Vare).
 * Kobler varekontraktene til leiren og verden: verdien i markedet i dag (prisene), lageret (planker, tømmer, ved, flis i Leir, diesel i
 * tankene, mat i Folk), maskinene (sagbruk og vedkløyver), egne lastebiler/tømmerbiler og lag (frakten langs vegnettet med kjørTil /
 * ordre), og Gråfjell Frakt. Kortene står i kontraktpanelet (spill/selskap-visning.js kaller VareSpill.kort, .mål, .vis og .hendelse).
 * Handlingene («Send lastebil», «La et lag bære», «La Gråfjell Frakt ta det») går gjennom kommandolaget (kommandoen 'vareSend').
 * Nye varetilbud kommer hver morgen fra trinn 2 «Leverandør» (spill/trinn.js), og da kommer også Storlia Tømmers første tømmerkontrakt.
 * I TESTENE (navigator.webdriver) skjer ingenting av seg selv: VareSpill.test = true slår det på. Alle tall og tekster er Claudes forslag.
 */
(function () {
  const V = window.Vare, SK = window.Selskap; if (!V || !SK || typeof KROKER === 'undefined') return;
  V.registrer(SK);
  const api = { test: false }, auto = () => !navigator.webdriver || api.test === true;
  const SS = () => window.SelskapSpill, ID = 'blå';
  const S = () => (SS() && SS().tilstand ? SS().tilstand() : null);
  const Sp = () => (window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null);
  const L = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const kr = v => (window.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const meter = d => (d >= 1000 ? nf(d / 1000) + ' km' : Math.round(d) + ' m');
  const VN = v => (V.REGLER.VARER[v] || { navn: v }).navn;
  const lagre = () => { if (SS() && SS().lagre) SS().lagre(); };
  const lagreLeir = () => { try { if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); } catch (e) { /* uten leir */ } };

  // ---------- verdien i markedet i dag (kr per enhet) ----------
  // materialene: med markedet i gang (spill/spillet-visning.js) er Leir.MATERIALER.pris kjøpsprisen (med påslag når markedet er dyrt) og
  // salg × pris / 0,8 markedets egen pris; uten markedet (testene) er prisen grunnprisen
  function verdi() {
    const LB = window.Leir, FR = window.FolkRegler, MK = window.Spillet && Spillet.Marked, ut = {}, salg = LB && LB.REGLER ? LB.REGLER.salg : 0;
    // påslaget er med når salget er satt til SALG / PÅSLAG (det dyre markedet)
    const f = MK && Math.abs(salg - Math.round(MK.SALG / MK.PÅSLAG * 100) / 100) < .005 ? 1 / MK.PÅSLAG : 1;
    if (LB) for (const v of ['tre', 'tømmer', 'ved', 'flis']) if (LB.MATERIALER[v]) ut[v] = Math.round(LB.MATERIALER[v].pris * f);
    if (LB && LB.DRIVSTOFF) ut.diesel = LB.DRIVSTOFF.prisPerLiter; if (FR && FR.R) ut.mat = FR.R.matPris;
    return ut;
  }
  // ---------- lageret ----------
  function har(v) { const l = L(); if (v === 'diesel') return l ? l.drivstoff || 0 : 0; if (v === 'mat') { const F = window.FolkSpill && FolkSpill.tilstand(); return F ? F.mat || 0 : 0; } return l && l.lager ? l.lager[v] || 0 : 0; }
  function plass(v) { const l = L(), LB = window.Leir; if (!l || !LB) return 0; if (v === 'mat') return Infinity; if (v === 'diesel') return Math.max(0, LB.kapasitet(l) - (l.drivstoff || 0));
    return Math.max(0, LB.lagerplass(l) - (l.lager[v] || 0)); }
  function ta(v, m) { const l = L(); if (!l || !(m > 0)) return 0; const t = Math.min(m, har(v)); if (v === 'diesel') l.drivstoff -= t; else if (v === 'mat') FolkSpill.tilstand().mat -= t; else l.lager[v] = Math.round((l.lager[v] - t) * 10) / 10; lagreLeir(); return t; }
  function legg(v, m) { const l = L(); if (!l || !(m > 0)) return 0; const g = Math.min(m, plass(v)); if (v === 'diesel') l.drivstoff = (l.drivstoff || 0) + g; else if (v === 'mat') FolkSpill.tilstand().mat += g; else l.lager[v] = Math.round(((l.lager[v] || 0) + g) * 10) / 10; lagreLeir(); return g; }
  // det maskinene lager i døgnet: sagbruk og vedkløyver fra spill/produksjon.js
  // (ut8-kr-saga, kritikeren: «sagbruket gir 26,4 m³ per døgn – rekker det» mens saga hadde laget 0) – det maskinene FAKTISK laget siste
  // døgn (ProduksjonSpill.laget().iGår). Finnes ikke det ennå (maskinen er ny, eller siden er lastet på nytt), regnes full drift bare for
  // maskinene som går nå (× hvor fort de går); står de, regnes 0. perDøgnKilde() sier hvilket tall det er (målt / nå / sto).
  function perDøgnRå() { const l = L(), PR = window.Produksjon, ut = {}, kilde = {}; if (!l || !PR) return { ut, kilde };
    const lag = window.ProduksjonSpill && ProduksjonSpill.laget ? ProduksjonSpill.laget() : null, iGår = lag && lag.iGår, st = (lag && lag.status) || {};
    for (const b of PR.maskinene(l)) { const M = PR.REGLER.maskiner[b.type]; if (!M || !M.ut || b.av) continue;
      for (const [v, m] of Object.entries(M.ut)) { if (iGår) { ut[v] = iGår[v] || 0; kilde[v] = ut[v] > .05 ? 'målt' : 'sto'; continue; }
        const s = st[b.id], d = s && s.går ? s.drift || 0 : 0; ut[v] = (ut[v] || 0) + m * 24 * d; kilde[v] = (ut[v] || 0) > .05 ? 'nå' : 'står'; } }
    for (const v of Object.keys(ut)) ut[v] = Math.round(ut[v] * 10) / 10; return { ut, kilde }; }
  const perDøgn = () => perDøgnRå().ut, perDøgnKilde = () => perDøgnRå().kilde;

  // ---------- kjøretøy og lag ved leiren ----------
  const leir = () => (Sp() && Sp().leir) || (S() && S().leir) || null;
  const KJ = () => (typeof KJORETOY !== 'undefined' ? KJORETOY : []);
  const fri = b => b.side === ID && b.antall >= 1 && V.kapasitet(b) > 0 && !b.kontrakt && !b.oppdrag && !b.vare;
  function ledigBil() { const p = leir(); if (!p) return { feil: 'Ingen leir.' }; const N = V.REGLER.nær.leir, B = KJ().filter(fri);
    const her = B.filter(b => Math.hypot(b.x - p.x, b.y - p.y) <= N).sort((a, b) => V.kapasitet(b) - V.kapasitet(a))[0]; if (her) return { bil: her };
    const nærmest = B.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    return { feil: nærmest ? `${nærmest.navn} står ${meter(Math.hypot(nærmest.x - p.x, nærmest.y - p.y))} fra leiren – kjør den til leiren først, så kan lasten tas på.` : 'Dere har ingen ledig lastebil eller tømmerbil. Bestill en ved basen, eller kjøp en tømmerbil (Selskap → Produksjon).' }; }
  const egneLag = () => (typeof ENHETER !== 'undefined' ? ENHETER.filter(s => s.side === ID && levende(s) && !s.karakter && !s.leirvakt && !s.sperre && !s.ombord) : []);
  const friske = s => s.menn.filter(m => m.hp >= 1).length;
  function ledigLag() { const p = leir(); if (!p) return null; return egneLag().filter(s => !s.vare && Math.hypot(s.x - p.x, s.y - p.y) <= V.REGLER.nær.leir).sort((a, b) => friske(b) - friske(a))[0] || null; }

  // ---------- måling til Selskap.steg (med sideeffekter: bare herfra) og vurdering til visningen (uten) ----------
  function finnTur(t) { if (t.bil) { const b = KJ().find(q => q.navn === t.bil && q.side === ID); return b && b.antall >= 1 ? b : null; } const s = typeof ENHETER !== 'undefined' ? ENHETER.find(q => q.navn === t.lag && q.side === ID) : null; return s && levende(s) ? s : null; }
  function andelFor(k, o) { const p = leir(); if (!p || !o) return 0; const hele = Math.hypot(k.sted.x - p.x, k.sted.y - p.y) || 1; return Math.max(0, Math.min(1, 1 - Math.hypot(k.sted.x - o.x, k.sted.y - o.y) / hele)); }
  function mål(k) {
    if (k.type === 'avtale') return { har: har(k.vare) };
    if (k.type === 'kjøp') return { penger: (Sp() && Sp().penger) || 0, plass: plass(k.vare) };
    let levert = 0, andel = 0; const N = V.REGLER.nær.fram;
    for (const t of (k.turer || []).slice()) { const o = finnTur(t);
      if (!o) { k.turer = k.turer.filter(q => q !== t); logg(`${t.bil || t.lag} er borte – ${V.mengdeTekst(k.vare, t.mengde)} ${VN(k.vare)} gikk tapt på vegen til ${k.sted.navn}.`); continue; }
      if (Math.hypot(o.x - k.sted.x, o.y - k.sted.y) <= N) { k.turer = k.turer.filter(q => q !== t); levert += t.mengde; o.vare = null; if (t.bil && k.bil === t.bil) k.bil = null;
        logg(`${o.navn} leverte ${V.mengdeTekst(k.vare, t.mengde)} ${VN(k.vare)} i ${k.sted.navn} for ${k.giver.navn}.`);
        const p = leir(); if (p && auto()) { try { if (t.bil && window.kjørTil) kjørTil(o, p.x, p.y); else if (t.lag && typeof ordre === 'function') ordre(o, p.x, p.y, true); } catch (e) { /* blir stående */ } }
        continue; }
      andel = Math.max(andel, andelFor(k, o)); }
    if (levert || (k.turer && k.turer.length === 0)) lagre();
    return { levert, andel };
  }
  // til visningen: { underveis, andel, igjen }
  function vis(k) {
    if (k.type !== 'lever') return {}; let underveis = 0, andel = 0; for (const t of k.turer || []) { underveis += t.mengde; andel = Math.max(andel, andelFor(k, finnTur(t))); }
    return { underveis, andel, igjen: Math.max(0, k.mengde - (k.levert || 0) - underveis) };
  }

  // ---------- handlingene ----------
  // hvordan: 'bil' (ledig lastebil/tømmerbil ved leiren), 'lag' (et lag ved leiren bærer litt), 'frakt' (Gråfjell Frakt). Gir { ok, tekst } / { feil }
  function send(id, hvordan) {
    const s = S(); if (!s) return { feil: 'Selskapet er ikke klart.' }; const k = s.sider[ID].aktive.find(q => q.id === id);
    if (!k || k.type !== 'lever') return { feil: 'Fant ikke leveringen.' }; if (k.frakt) return { feil: `${V.REGLER.frakt.firma} har alt lasten.` };
    const v = vis(k), lager = har(k.vare), p = leir(); if (!p) return { feil: 'Ingen leir.' };
    if (v.igjen <= .01) return { feil: 'Resten er alt på vegen.' };
    if (lager <= .01) return { feil: `Lageret har ingen ${VN(k.vare)}. ${k.vare === 'tre' ? 'Sag tømmer til planker (sagbruket), eller kjøp planker i Leir → Lager.' : 'Lag mer, eller kjøp i Leir → Lager.'}` };
    if (hvordan === 'frakt') {
      if (lager < v.igjen - .01) return { feil: `${V.REGLER.frakt.firma} tar bare hele resten (${V.mengdeTekst(k.vare, v.igjen)}) – dere har ${V.mengdeTekst(k.vare, lager)}.` };
      const km = Math.hypot(k.sted.x - p.x, k.sted.y - p.y) / 1000, f = V.brukFrakt(k, tid, km); if (f.feil) return { feil: f.feil };
      ta(k.vare, f.mengde); lagre(); skitten = true;
      return { ok: true, tekst: `${V.REGLER.frakt.firma} henter ${V.mengdeTekst(k.vare, f.mengde)} ${VN(k.vare)} og leverer i ${k.sted.navn} om ca. ${nf(f.timer)} t. De tar ${kr(f.pris)} og risikoen.` };
    }
    let o, kap, hva;
    if (hvordan === 'lag') { o = ledigLag(); if (!o) return { feil: 'Ingen egne lag står ved leiren.' }; kap = V.bære(friske(o)); hva = 'lag'; }
    else { const r = ledigBil(); if (r.feil) return { feil: r.feil }; o = r.bil; kap = V.kapasitet(o); hva = 'bil'; }
    const m = Math.round(Math.min(kap, v.igjen, lager) * 10) / 10; if (!(m > 0)) return { feil: 'Ingenting å laste.' };
    ta(k.vare, m); o.vare = k.id; (k.turer = k.turer || []).push(hva === 'bil' ? { bil: o.navn, mengde: m } : { lag: o.navn, mengde: m });
    if (hva === 'bil') k.bil = o.navn;
    try { if (hva === 'bil' && window.kjørTil) kjørTil(o, k.sted.x, k.sted.y); else if (hva === 'lag' && typeof ordre === 'function') ordre(o, k.sted.x, k.sted.y, true); } catch (e) { /* spilleren kan kjøre selv */ }
    lagre(); skitten = true;
    return { ok: true, tekst: `${o.navn} har lastet ${V.mengdeTekst(k.vare, m)} ${VN(k.vare)} og ${hva === 'bil' ? 'kjører' : 'går'} til ${k.sted.navn}.` + (k.risiko === 'bakhold' ? ' Det er meldt bakhold – send gjerne et lag med.' : '') };
  }
  // kommandolaget (spill/kommando.js): registreres første gang den trengs
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    Kommando.registrer('vareSend', { leir: true, sjekk: k => (['bil', 'lag', 'frakt'].includes(k.hvordan) ? null : 'Ugyldig valg.'),
      utfør: k => { const r = send(k.id, k.hvordan); return r.feil ? { feil: r.feil } : r; }, beskriv: k => (k.hvordan === 'frakt' ? 'lar Gråfjell Frakt ta en levering' : 'sender en levering') });
  }
  function knapp(id, hvordan) {
    registrer(); const r = window.KOMMANDO ? KOMMANDO({ type: 'vareSend', id, hvordan, stille: true }) : send(id, hvordan);
    const t = r && (r.feil || (r.svar && r.svar.tekst) || r.tekst); if (t) logg(t); return r;
  }

  // ---------- hendelsene fra reglene ----------
  function hendelse(h) {
    const k = h.k; if (!k) return false;
    if (h.type === 'vareDøgn') { ta(k.vare, h.mengde); if (window.OppstartSpill) OppstartSpill.gi(h.kr); logg(`${k.giver.navn} hentet ${V.mengdeTekst(k.vare, h.mengde)} ${VN(k.vare)} og betalte ${kr(h.kr)} (døgn ${k.døgnGjort} av ${k.døgn}).`); return true; }
    // (ut8-kr-saga) det som ikke får plass, betales ikke (vare.js) – og meldingen sier det
    if (h.type === 'vareKjøp') { if (window.OppstartSpill && h.kr > 0) OppstartSpill.betal(h.kr); const g = legg(k.vare, h.får), uten = Math.max(0, h.mengde - g);
      logg(g < .05 ? `${k.giver.navn} kom med ${V.mengdeTekst(k.vare, h.mengde)} ${VN(k.vare)}, men lageret var fullt – ingenting levert, ingenting betalt (døgn ${k.døgnGjort} av ${k.døgn}). Lag plass før neste levering (lagertelt eller selg).`
        : `${k.giver.navn} leverte ${V.mengdeTekst(k.vare, g)} ${VN(k.vare)} for ${kr(h.kr)} (døgn ${k.døgnGjort} av ${k.døgn})` + (uten > .05 ? ` – ${V.mengdeTekst(k.vare, uten)} fikk ikke plass og ble ikke betalt.` : '.')); return true; }
    if (h.type === 'vareMist') { const bot = Math.min(h.kr || 0, (Sp() && Sp().penger) || 0); if (bot > 0) OppstartSpill.betal(bot);
      logg(k.type === 'avtale' ? `${k.giver.navn} kom for å hente ${V.mengdeTekst(k.vare, k.perDøgn)} ${VN(k.vare)}, men lageret manglet ${V.mengdeTekst(k.vare, h.mangler)}. Bot ${kr(bot)}.`
        : `Kassa hadde ikke ${kr(k.dagKr)} til dagens ${VN(k.vare)} fra ${k.giver.navn}. Bot ${kr(bot)}.`); return true; }
    if (h.type === 'fraktFram') { logg(`${V.REGLER.frakt.firma} leverte ${VN(k.vare)} i ${k.sted.navn} for dere.`); return true; }
    if (h.type === 'fraktTapt') { if (window.OppstartSpill && h.kr > 0) OppstartSpill.gi(h.kr); logg(`${V.REGLER.frakt.firma} mistet lasten på vegen til ${k.sted.navn}. De erstatter varene med ${kr(h.kr)} og tar boten selv.`); return true; }
    return false;
  }
  // når en varekontrakt er ferdig (levert, brutt, avbrutt): kjøretøy og lag med last slippes (lasten de har, er tapt for kontrakten)
  function ferdig(k) { for (const t of k.turer || []) { const o = finnTur(t); if (o) o.vare = null; } k.turer = []; }
  function levertTekst(k, beløp) {
    if (k.type === 'lever') return `Levert: ${k.tittel}. ${k.giver.navn} betalte ${kr(beløp)}${k.frakt ? ` (frakten til ${V.REGLER.frakt.firma} er trukket)` : ''}.`;
    if (k.type === 'avtale') return `Leveranseavtalen med ${k.giver.navn} er ferdig: ${k.levertDøgn} av ${k.døgn} døgn levert` + (beløp > 0 ? `, bonus ${kr(beløp)}.` : ' – ingen bonus (ikke alle døgnene ble levert).');
    return `Kjøpsavtalen med ${k.giver.navn} er ferdig (${k.levertDøgn} av ${k.døgn} døgn).`;
  }

  // ---------- kortene i kontraktpanelet ----------
  const css = document.createElement('style');
  css.textContent = `#selskap .kort.vare{ border-left-color:#8a6a32; } #selskap .kort.vare.aktiv{ border-left-color:#c8963e; } #selskap .kort .vlinje{ font-size:12.5px; color:#c8bfa9; margin:3px 0; }
#selskap .kort .vlinje.ok{ color:#a9c27a; } #selskap .kort .vlinje.ikke{ color:#e7a593; } #selskap .doegn{ display:flex; gap:3px; margin:5px 0; } #selskap .doegn i{ flex:1; height:7px; border-radius:2px; background:#2a2f35; }
#selskap .doegn i.ja{ background:#7c9a4e; } #selskap .doegn i.nei{ background:#b0443a; }`;
  document.head.appendChild(css);
  const vegLinje = (k, marsj) => { const p = leir(); if (!p) return ''; if (marsj && !marsj.venter && !marsj.feil && !marsj.ingen && !marsj.forLangt && marsj.km > 0) return V.vegTekst(marsj.km);
    return `${meter(Math.hypot(k.sted.x - p.x, k.sted.y - p.y))} i luftlinje` + (marsj && marsj.venter ? ' (regner ut ruta …)' : ''); };
  // døgnene som ruter: grønt = levert/kjøpt, rødt = mistet (rekkefølgen er ikke lagret – de leverte står først)
  const døgnRuter = k => `<div class="doegn" title="levert ${k.levertDøgn || 0} av ${k.døgn} døgn">${Array.from({ length: k.døgn }, (_, i) => `<i class="${i < (k.levertDøgn || 0) ? 'ja' : i < (k.døgnGjort || 0) ? 'nei' : ''}"></i>`).join('')}</div>`;
  // (ut8-kr-saga, kritikeren: flis til Lismarka, «Ruta regnes som rolig» – men Ravnsund holdt Lismarka) navnet på rivalen som holder
  // tettstedet, eller null. Nye leveranser tilbys ikke dit (morgen), og et tilbud som står, merkes farlig (k.rival, k.risiko = bakhold).
  function rivalVed(sted) {
    if (!sted || sted.id == null || typeof TETTSTEDER === 'undefined' || !window.Garnison) return null; let e = null;
    try { e = Garnison.tilstand(TETTSTEDER, sted.id).eier; } catch (er) { return null; }
    if (!e || e === ID) return null; const F = window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[e]; return F && F.navn ? F.navn : e;
  }
  function merkRival(k) { if (!k || k.type !== 'lever' || k.status !== 'tilbud') return; const r = rivalVed(k.sted);
    if (r) { if (k.rival !== r) { k.rival = r; k.risiko = 'bakhold'; } } else if (k.rival) delete k.rival; }
  // finnes det en maskin som lager varen (så «sto siste døgn» kan sies)
  const maskinFor = v => { const l = L(), PR = window.Produksjon; return !!(l && PR && PR.maskinene(l).some(b => !b.av && PR.REGLER.maskiner[b.type] && PR.REGLER.maskiner[b.type].ut && PR.REGLER.maskiner[b.type].ut[v] > 0)); };
  // (ut8-kr-saga) kjøpsavtaler som spilleren har sagt «Inngå avtalen» til selv om lageret ikke har plass: andre trykk inngår den
  const bekreftet = new Set();
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-s="varebekreft"]'); if (!b) return;
    e.stopPropagation(); bekreftet.add(b.dataset.id);
    if (window.SelskapSpill) SelskapSpill.vis(true); }, true);
  function kort(k, aktiv, o = {}) {
    merkRival(k);
    const P = perDøgn()[k.vare] || 0, h = har(k.vare);
    const rk = V.rekker(k, h, P, o.marsj && o.marsj.km > 0 ? V.bilTimer(o.marsj.km) : 0, { kilde: perDøgnKilde()[k.vare] || null, maskin: maskinFor(k.vare) });
    let h1 = `<div class="kort vare${aktiv ? ' aktiv' : ''}${o.låst ? ' låst' : ''}" data-kontrakt="${k.id}"><b>${esc(k.tittel)}</b><div class="fra">${esc(SK.REGLER.TYPER[k.type].navn)}${k.type === 'lever' ? (k.rival ? ` · <span class="krav">⚠ ${esc(k.sted.navn)} holdes av ${esc(k.rival)}</span>` : k.risiko === 'bakhold' ? ' · <span class="krav">⚠ meldt bakhold</span>' : ' · rolig rute') : ''} · ${esc(k.giver.navn)}${aktiv ? ` · <span class="tall">${esc(SK.fristTekst(k, tid))}</span>` : ''}</div>`;
    if (!aktiv) h1 += `<p>${esc(SK.kravTekst(k))}</p>`;
    if (k.type === 'lever') {
      h1 += `<div class="vlinje">${esc(k.sted.navn)}: ${esc(vegLinje(k, o.marsj))}</div>`;
      if (aktiv) { const v = vis(k), and = (k.levert || 0) / k.mengde;
        h1 += `<div class="fram"><i style="width:${Math.round(Math.min(1, and) * 100)}%"></i></div><div class="vlinje">Levert ${nf(k.levert || 0)} av ${V.mengdeTekst(k.vare, k.mengde)}` + (v.underveis ? ` · ${V.mengdeTekst(k.vare, v.underveis)} på vegen` : '') + (k.frakt ? ` · ${esc(V.REGLER.frakt.firma)} leverer om ca. ${nf(Math.max(0, k.frakt.ankommer - tid) / 60)} t` : '') + '</div>';
        for (const t of k.turer || []) { const ob = finnTur(t); if (ob) h1 += `<div class="vlinje">${esc(ob.navn)}: ${V.mengdeTekst(k.vare, t.mengde)} – ${meter(Math.hypot(ob.x - k.sted.x, ob.y - k.sted.y))} igjen</div>`; } }
      h1 += `<div class="rad"><span>Betaling <span class="kr tall">${kr(k.betaling)}</span></span><span>${esc(V.prisTekst(k))}</span><span>Bot ved brudd <span class="bot tall">${kr(k.bot)}</span></span>${aktiv ? '' : `<span>Frist <span class="tall">${k.timer} t</span></span>`}</div>`;
    } else {
      if (aktiv) h1 += døgnRuter(k) + `<div class="vlinje">${k.type === 'avtale' ? 'Levert' : 'Kjøpt'} ${k.levertDøgn || 0} av ${k.døgn} døgn${k.mist ? ` · ${k.mist} mistet (bot)` : ''} · neste ${k.type === 'avtale' ? 'henting' : 'levering'} om ${nf(Math.max(0, (k.godtatt + ((k.døgnGjort || 0) + (k.type === 'avtale' ? 1 : 0)) * 1440 - tid) / 60))} t</div>`;
      h1 += k.type === 'avtale' ? `<div class="rad"><span>Per døgn <span class="kr tall">${kr(k.dagKr)}</span></span><span>Bonus til slutt <span class="kr tall">${kr(k.bonus)}</span></span><span>Bot per døgn uten varer <span class="bot tall">${kr(k.botDøgn)}</span></span></div>`
        : `<div class="rad"><span>Kostnad per døgn <span class="bot tall">${kr(k.dagKr)}</span></span><span>${esc(V.prisTekst(k))} (marked i dag ${kr((verdi()[k.vare]) || 0)})</span><span>Bot uten penger <span class="bot tall">${kr(k.botDøgn)}</span></span></div>`;
    }
    const trangK = k.type === 'kjøp' && Number.isFinite(plass(k.vare)) && plass(k.vare) < k.perDøgn - .05;
    h1 += `<div class="vlinje ${rk.ok && !trangK ? 'ok' : 'ikke'}">${esc(rk.tekst)}${k.type === 'kjøp' && Number.isFinite(plass(k.vare)) ? ` Plass på lageret: ${V.mengdeTekst(k.vare, Math.floor(plass(k.vare) * 10) / 10)}.` : ''}</div>`;
    if (!aktiv) { const igjen = Math.max(0, k.utløper - tid), pl = k.type === 'kjøp' ? plass(k.vare) : Infinity, trang = Number.isFinite(pl) && pl < k.perDøgn - .05;
      // (ut8-kr-saga) kjøpsavtale når lageret ikke har plass til ett døgns levering: først en bekreftelse på kortet
      const spør = trang && !bekreftet.has(k.id), ja = trang && bekreftet.has(k.id);
      if (trang) h1 += `<div class="vlinje ikke vareplass">${pl < .05 ? 'Lageret er fullt' : `Lageret har bare plass til ${V.mengdeTekst(k.vare, Math.floor(pl * 10) / 10)}`} – avtalen gir ${V.mengdeTekst(k.vare, Math.floor(Math.min(pl, k.perDøgn) * 10) / 10)} i dag av ${V.mengdeTekst(k.vare, k.perDøgn)}. Det som ikke får plass, betales ikke.${ja ? ' Inngå likevel?' : ''}</div>`;
      h1 += `<div class="rad"><span>Tilbudet står i ${igjen >= 60 ? Math.round(igjen / 60) + ' t' : Math.round(igjen) + ' min'} til.</span></div><div class="knapper">` + (spør ? `<button class="hoved" data-s="varebekreft" data-id="${k.id}"${o.låst ? ' disabled' : ''}>Inngå avtalen</button>`
        : `<button class="hoved" data-s="ta" data-id="${k.id}"${o.låst ? ' disabled' : ''}>${k.type === 'lever' ? 'Ta kontrakten' : ja ? 'Ja, inngå likevel' : 'Inngå avtalen'}</button>`)
        + `<button data-s="avslå" data-id="${k.id}">Avslå</button>${k.type === 'lever' ? `<button data-s="vis" data-id="${k.id}">Vis i kartet</button>` : ''}</div>`; }
    else { h1 += '<div class="knapper">';
      if (k.type === 'lever' && !k.frakt) { const b = ledigBil(), lag = ledigLag(), v = vis(k);
        if (v.igjen > .01) h1 += `<button class="hoved" data-s="vare" data-v="bil" data-id="${k.id}" title="${esc(b.feil || `${b.bil.navn} tar ${V.mengdeTekst(k.vare, V.kapasitet(b.bil))}`)}">Send lastebil</button>`
          + `<button data-s="vare" data-v="lag" data-id="${k.id}" title="${esc(lag ? `${lag.navn} bærer ${V.mengdeTekst(k.vare, V.bære(friske(lag)))}` : 'Ingen egne lag ved leiren')}">La et lag bære</button>`
          + (!(k.turer && k.turer.length) ? `<button data-s="vare" data-v="frakt" data-id="${k.id}" title="${esc(V.REGLER.frakt.firma)} tar ${Math.round(V.REGLER.frakt.andel * 100)} % (${kr(Math.round(k.betaling * V.REGLER.frakt.andel / 1000) * 1000)}) og risikoen">La Gråfjell Frakt ta det</button>` : ''); }
      if (k.type === 'lever') h1 += `<button data-s="vis" data-id="${k.id}">Vis i kartet</button>`;
      h1 += `<button class="fare" data-s="avbryt" data-id="${k.id}">Avbryt (bot)</button></div>`; }
    return h1 + '</div>';
  }

  // ---------- morgenen: nye varetilbud fra trinn 2, og Storlias første tømmerkontrakt ----------
  const trinnNr = () => { try { return window.TrinnSpill && TrinnSpill.regn ? TrinnSpill.regn().nr : 1; } catch (e) { return 1; } };
  const steder = () => { try { return SS() && SS().steder ? SS().steder() : []; } catch (e) { return []; } };
  function morgen(tving) {
    const s = S(); if (!s || (!tving && (!auto() || trinnNr() < 2))) return [];
    const n = V.lagTilbud(s, ID, tid, { steder: steder().filter(q => !rivalVed(q)), verdi: verdi(), leir: leir(), perDøgn: perDøgn() }); if (n.length) lagre(); return n;
  }
  let storliaSist = 0;
  function storlia(tving) {
    const s = S(); if (!s || (s.vare && s.vare.storlia) || (!tving && (!auto() || trinnNr() < 2))) return null;
    const k = V.storliaTilbud(s, ID, tid, { verdi: verdi(), leir: leir() }); if (!k) return null; lagre();
    if (!tving) logg(`Storlia Tømmer har hørt om dere – og har et tilbud: billig tømmer i ${k.døgn} døgn (${V.prisTekst(k)}). Se Selskap → Kontrakter.`);
    return k;
  }
  // Storlia-kontrakten er tatt: sagbruket blir kjent – tømmeret er verdt mer som planker, og Storlia kjøper dem
  function storliaTatt(k) {
    const s = S(); if (!s || !k || !k.storlia) return; s.vare = s.vare || {}; if (s.vare.sagKjent) return; s.vare.sagKjent = true; lagre();
    const sag = L() && window.Produksjon ? Produksjon.maskinene(L()).some(b => b.type === 'sagbruk') : false;
    logg(sag ? 'Storlia Tømmer: «Sag tømmeret til planker – vi kjøper plankene.» Leveringer av planker kommer i Selskapet.'
      : 'Storlia Tømmer: «Med et sagbruk blir tømmeret planker, og plankene kjøper vi.» Bygg et sagbruk (Leir → Bygg → Produksjon) – det gjør 48 m³ tømmer om til 26 m³ planker i døgnet.');
    // sagbruket er kjent: et leveringstilbud for planker følger straks, så tråden går videre
    if (auto()) { const n = V.lagEtt(s, ID, 'lever', tid, { steder: steder().filter(q => !rivalVed(q)), verdi: verdi(), leir: leir() }, 'tre', 'Storlia Tømmer'); if (n) { s.tilbud.push(n); lagre(); } }
  }
  const erVare = V.erVare;
  // et lite tilskudd til steget i Selskapet: Storlia sjekkes hvert 5. sekund (trinnet kan nås når som helst)
  KROKER.sim.push(() => { if (performance.now() - storliaSist < 5000) return; storliaSist = performance.now(); try { storlia(false); } catch (e) { /* neste gang */ } });

  // ---------- kartet: lasten på vegen ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    const s = S(); if (!s) return; const m = kam.m, P = (x, y) => [(x - vx0) / m, (vy1 - y) / m], p = leir();
    g.save();
    for (const k of s.sider[ID].aktive) { if (k.type !== 'lever' || !p) continue; const [lx, ly] = P(p.x, p.y), [sx, sy] = P(k.sted.x, k.sted.y);
      g.strokeStyle = 'rgba(200,150,62,.55)'; g.lineWidth = 2; g.setLineDash([3, 7]); g.beginPath(); g.moveTo(lx, ly); g.lineTo(sx, sy); g.stroke(); g.setLineDash([]);
      for (const t of k.turer || []) { const o = finnTur(t); if (!o) continue; const [x, y] = P(o.x, o.y); g.fillStyle = '#c8963e'; g.strokeStyle = '#121417'; g.lineWidth = 1.5; g.fillRect(x - 4, y - 14, 8, 6); g.strokeRect(x - 4, y - 14, 8, 6); } }
    g.restore();
  });

  Object.assign(api, { verdi, har, plass, perDøgn, perDøgnKilde, rivalVed, merkRival, mål, vis, kort, send, knapp, hendelse, ferdig, levertTekst, morgen, storlia, storliaTatt, erVare, ledigBil, ledigLag, rett: { send },
    // (ut4-eksport) lageret og kjøretøyene brukes også av eksporten (spill/eksport-visning.js): ta/legg flytter varer ut av og inn i lageret
    ta, legg, fri });
  window.VareSpill = api;
})();
