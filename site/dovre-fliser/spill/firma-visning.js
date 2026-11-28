'use strict';
/* Riksbrudd – FIRMAER OG SAMARBEID, visningen (fase Ø5, 28. nov; docs/plan-selskap-okonomi.md kapittel 8 og 14.5). Reglene: spill/firma.js.
 * window.FirmaSpill:
 *  - registeret per leir i localStorage «riksbrudd-firma» (firmaene, holdningen, samarbeidet, paktene, teknologien);
 *  - holdningen følger kontraktene: ferdige kontrakter fra et firma (SelskapSpill) telles én gang (levert opp, brutt ned);
 *  - FAST KUNDE: hver morgen ett ekstra tilbud fra firmaet (× 1,15, rivalene tar det ikke – k.fast), og det telles om dere sier ja;
 *  - døgnet (økonomi, konkurs, nye firmaer i byer dere har avtale med, vern, felles anlegg, rivalene som bryter) og vernets timer;
 *  - PAKTENE til fraksjonene: AI.pakter (spill/fraksjoner-visning.js) peker på lista her; KROKER.ild gir 0 i våpenhvileområdet og
 *    overraskelsen etter et svik; KROKER.ser gir delt etterretning i en allianse; KROKER.tegn viser området og vernet;
 *  - TEKNOLOGI: høvleriet (b.høvleri på sagbrukene, spill/produksjon.js), bedre aggregat (Leir.DRIVSTOFF.literPerKWt × 0,8), fryselager (lås);
 *  - fanen Partnere i Selskapet (selskapspanel.js spør FirmaSpill.fane() og FirmaSpill.trykk(knapp));
 *  - telefonen ringer (hendelsen «riksbrudd-telefon», spill/lyd2d.js) når et firma tilbyr samarbeid, et nytt firma kommer eller en rival bryter.
 * Alt spilleren gjør går gjennom kommandolaget (KOMMANDO): firmaSamarbeid, firmaAvslutt, firmaTekno, paktInngå, paktBryt.
 * I TESTENE (navigator.webdriver) skjer ingenting av seg selv (morgen, døgn, timer, telefon) før FirmaSpill.test = true.
 */
(function () {
  const Fi = window.Firma; if (!Fi || typeof KROKER === 'undefined') return;
  const R = Fi.REGLER, api = { test: false }, auto = () => !navigator.webdriver || api.test === true;
  const NØKKEL = 'riksbrudd-firma', ID = 'blå';
  const Sp = () => window.OppstartSpill && OppstartSpill.tilstand();
  const kr = v => (window.Leir && Leir.kroner ? Leir.kroner(v) : Fi.kroner(v));
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nåMin = () => (typeof tid === 'number' && Number.isFinite(tid) ? tid : 0);
  const dagNå = () => Math.floor((6 * 60 + nåMin()) / 1440);
  const sidenavn = s => (window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[s] ? Fraksjoner.FRAKSJONER[s].navn : Fi.RIVALER[s] || s);
  const tilfV = (typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random;
  let F = Fi.ny(null), leirId = '', klar = false, timeSist = null, sistLagret = 0;
  // valgene i panelet (radius og døgn for våpenhvilen, døgn for alliansen) og en melding etter siste knapp
  const valg = { r: R.pakt.hvile.radier[1], døgn: R.pakt.hvile.døgn[1], aDøgn: R.pakt.allianse.døgn[0] };
  let melding = '';

  // ---------- lagring per leir ----------
  const les = () => { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); return d && d.leir === leirId ? d.d : null; } catch (e) { return null; } };
  const lagre = () => { if (!leirId || (window.NETT && NETT.gjest)) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: Fi.tilJSON(F) })); } catch (e) { /* fullt eller sperret */ } };
  const koble = () => { if (window.AI) AI.pakter = F.pakter; };
  function start() {
    const s = Sp(); if (!s || !s.leir) return; const id = Math.round(s.leir.x) + ',' + Math.round(s.leir.y);
    if (id !== leirId) { leirId = id; F = Fi.fraJSON(les()) || Fi.ny(s.leir); F.leir = { x: Math.round(s.leir.x), y: Math.round(s.leir.y) }; timeSist = null; }
    klar = true; koble(); hjem(); tekno(); lagre();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- stedene ----------
  const steder = () => { try { return window.SelskapSpill && SelskapSpill.steder ? SelskapSpill.steder() : []; } catch (e) { return []; } };
  let stederN = -1;
  function hjem() { const st = steder(); if (st.length === stederN && F.firmaer.every(f => f.hjem)) return; stederN = st.length; if (Fi.sikreHjem(F, st, window.Vare && Vare.hjemsted)) lagre(); }

  // ---------- holdningen følger kontraktene ----------
  const selskap = () => { const S = window.SelskapSpill && SelskapSpill.tilstand ? SelskapSpill.tilstand() : null; return { S, sd: S && S.sider ? S.sider[ID] : null }; };
  function telKontrakter() {
    const { S, sd } = selskap(); if (!sd) return false; let endret = false;
    for (const k of sd.ferdige || []) { const r = Fi.registrerKontrakt(F, k); if (r) { endret = true; if (k.fastKunde) Fi.fastSvar(r.f, 'tatt'); } }
    // FAST KUNDE: tilbudene som er borte fra lista – tatt (aktiv/ferdig hos dere) eller gått ut
    const åpne = F.fastÅpne || (F.fastÅpne = []);
    for (const o of åpne.slice()) {
      if (S.tilbud.some(k => k.id === o.id)) continue; const f = Fi.finn(F, o.firma); åpne.splice(åpne.indexOf(o), 1); endret = true;
      const tatt = sd.aktive.some(k => k.id === o.id) || sd.ferdige.some(k => k.id === o.id);
      if (!f) continue; if (tatt) { Fi.fastSvar(f, 'tatt'); continue; }
      const r = Fi.fastSvar(f, 'utløpt'); if (r === 'slutt') logg(`${f.navn} er ikke lenger fast kunde: dere lot ${R.samarbeid.fast.ubesvart} av tilbudene deres gå ut på rad.`);
    }
    return endret;
  }
  // ett tilbud fra firmaet (fast kunde), lagt øverst i Selskapets liste. Firmaer som kjøper varer, gir en levering (vare.js), ellers en vanlig jobb
  function fastTilbud(f) {
    const { S } = selskap(); if (!S || !f.hjem || !window.Selskap) return null; const st = [{ navn: f.hjem.navn, x: f.hjem.x, y: f.hjem.y, slag: 'tettsted', id: f.hjem.id }];
    let k = null; const V = window.Vare, VS = window.VareSpill, kjøper = V && V.REGLER.firma.lever ? Object.entries(V.REGLER.firma.lever).filter(([, L]) => L.includes(f.navn)).map(([v]) => v) : [];
    if (kjøper.length && VS && VS.verdi) { try { k = V.lagEtt(S, ID, 'lever', nåMin(), { steder: st, verdi: VS.verdi(), leir: S.leir }, kjøper[Math.floor(tilfV() * kjøper.length) % kjøper.length], f.navn); } catch (e) { k = null; }
      if (k) { k.enhetPris = Math.round(k.enhetPris * R.samarbeid.fast.faktor / 100) * 100; k.betaling = Math.round(k.mengde * k.enhetPris / 10000) * 10000; k.bot = Math.round(k.betaling * V.REGLER.lever.bot / 10000) * 10000; S.tilbud.unshift(k); } }
    if (!k) { const infl = (() => { try { const M = window.SpilletSpill && SpilletSpill.M && SpilletSpill.M(); return M && M.infl > 0 ? M.infl : 1; } catch (e) { return 1; } })();
      const n = Selskap.lagTilbud(S, ID, nåMin(), st, null, { antall: 1, giver: { slag: 'firma', navn: f.navn }, faktor: R.samarbeid.fast.faktor, infl }); k = n[0] || null; }
    if (!k) return null;
    k.fast = true; k.fastKunde = f.navn; k.utløper = Math.round(nåMin() + R.samarbeid.fast.varer); Fi.fastTilbud(f, k.id); (F.fastÅpne || (F.fastÅpne = [])).push({ id: k.id, firma: f.navn });
    try { if (SelskapSpill.lagre) SelskapSpill.lagre(); } catch (e) { /* */ }
    return k;
  }
  function morgen(tving) { if (!tving && !auto()) return []; const ut = []; for (const f of Fi.aktive(F)) if (f.fast && !(F.fastÅpne || []).some(o => o.firma === f.navn)) { const k = fastTilbud(f); if (k) ut.push(k); }
    if (ut.length) logg(`Faste kunder: ${ut.map(k => k.giver.navn).join(', ')} har sendt dere ${ut.length === 1 ? 'et tilbud' : 'tilbud'} først. Se «Selskapet».`); lagre(); return ut; }

  // ---------- døgnet og timene ----------
  const lag = () => (typeof ENHETER !== 'undefined' ? ENHETER : []);
  const lever = s => (typeof levende === 'function' ? levende(s) : true);
  const friske = s => (s.menn || []).reduce((a, m) => a + (m.hp >= 1 ? 1 : m.hp > 0 ? .5 : 0), 0);
  const mannNær = (p, r) => lag().reduce((n, s) => n + (s.side === ID && !s.karakter && lever(s) && Math.hypot(s.x - p.x, s.y - p.y) <= r ? friske(s) : 0), 0);
  const fiendtlig = s => s.side === 'rød' || s.side === 'grønn';
  function krig() {
    const K = {};
    for (const f of Fi.aktive(F)) { if (!f.hjem) continue; let d = Infinity, kamp = false;
      for (const s of lag()) { if (!fiendtlig(s) || !lever(s)) continue; const a = Math.hypot(s.x - f.hjem.x, s.y - f.hjem.y); if (a < d) d = a; if (a < 3000 && s.beskuttTid !== undefined && nåMin() - s.beskuttTid < 1440) kamp = true; }
      let eier = null; if (f.hjem.id != null && window.Garnison && typeof TETTSTEDER !== 'undefined') { try { eier = Garnison.tilstand(TETTSTEDER, f.hjem.id).eier; } catch (e) { eier = null; } }
      K[f.navn] = { fiendeEier: eier === 'rød' || eier === 'grønn', fiendeKm: d / 1000, kamp }; }
    return K;
  }
  function avtaleByer() { const ut = [], ids = new Set(); try { const BS = window.ByavtaleSpill, T = BS && BS.tilstand ? BS.tilstand() : null; if (!T || !T.byer) return { ut, ids };
    const st = steder(); for (const [id, b] of Object.entries(T.byer)) { const t = window.Byavtale ? Byavtale.trinn(b) : null; if (!t || !R.nye.trinn.includes(t)) continue; const q = st.find(s => String(s.id) === String(id)); if (!q) continue; ut.push({ id: q.id, navn: q.navn, x: q.x, y: q.y, trinn: t }); ids.add(q.id); } } catch (e) { /* uten byavtaler */ }
    return { ut, ids }; }
  const telefon = tekst => { if (!auto()) return; try { window.dispatchEvent(new CustomEvent('riksbrudd-telefon', { detail: { tekst } })); } catch (e) { /* eldre nettlesere */ } };
  const styrke = () => { const S = { blå: 0, rød: 0, grønn: 0 }; for (const s of lag()) if (S[s.side] !== undefined && lever(s) && !s.karakter) S[s.side] += friske(s); return S; };
  function døgn(tving) {
    if (!tving && !auto()) return []; const { ut: byer, ids } = avtaleByer(), H = Fi.døgn(F, { nå: nåMin(), krig: krig(), byer, avtaleBy: ids, rand: tilfV });
    for (const h of H) hendelse(h);
    for (const b of Fi.paktDøgn(F, nåMin(), { rand: tilfV, styrke: styrke() })) { const t = `${sidenavn(b.p.side)} har brutt ${b.p.type === 'allianse' ? 'alliansen' : 'våpenhvilen'} – ${b.grunn}. Regn med angrep.`; logg(t); telefon(t); }
    tekno(); lagre(); return H;
  }
  function hendelse(h) {
    const f = h.f;
    if (h.type === 'konkurs') { logg(`${f.navn} har gått konkurs – krigen rundt ${f.hjem ? f.hjem.navn : 'hjemstedet'} ble for mye.${h.kr ? ` Bobestyreren betaler dere ${kr(h.kr)} for andelen i anlegget.` : ''}`); if (h.kr && window.OppstartSpill) OppstartSpill.gi(h.kr); }
    else if (h.type === 'nytt') { const t = `Et nytt firma har startet i ${f.hjem.navn}: ${f.navn} (${Fi.BRANSJER[f.bransje] || f.bransje}). De har hørt om dere.`; logg(t); telefon(t); }
    else if (h.type === 'samarbeidTilbud') { const t = `${f.navn} ringer: de vil gjerne ha ${h.samarbeid === 'fast' ? 'dere som fast leverandør' : h.samarbeid === 'vern' ? 'en rammeavtale om vern av ' + (f.hjem ? f.hjem.navn : 'anlegget') : 'et felles ' + ((Fi.anleggFor(f) || {}).navn || 'anlegg')}. Se Selskapet → Partnere.`; logg(t); telefon(t); }
    else if (h.type === 'vern') { if (h.holdt && h.kr > 0 && window.OppstartSpill) OppstartSpill.gi(h.kr); if (!h.holdt) logg(`Vernet av ${f.navn} ble ikke holdt i går (${h.ok} av ${h.av} timer med nok mann). Ingen betaling.`); }
    else if (h.type === 'vernOppsagt') logg(`${f.navn} har sagt opp vernet – det ble brutt for mange døgn.`);
    else if (h.type === 'vernFerdig') logg(`Rammeavtalen om vern med ${f.navn} er ute. Den kan inngås på nytt.`);
    else if (h.type === 'felles') { if (window.OppstartSpill) OppstartSpill.gi(h.kr); }
    else if (h.type === 'solgt') logg(`${f.navn} har solgt sin del av ${f.felles ? f.felles.anlegg : 'anlegget'} til ${sidenavn(h.til)}. Overskuddet blir mindre.`);
  }
  let dagSist = null;
  KROKER.sim.push(dt => {
    if (!klar) return; hjem();
    if (telKontrakter()) { tekno(); lagre(); }
    if (!auto()) return;
    // vernet telles hver spilltime (høyst 48 timer per steg), døgnet om morgenen
    const t = Math.floor(nåMin() / 60); if (timeSist === null) timeSist = t;
    for (let n = 0; timeSist < t && n < 48; n++) { timeSist++; for (const f of Fi.aktive(F)) if (f.vern && f.hjem) Fi.vernTime(f, mannNær(f.hjem, R.samarbeid.vern.radius)); }
    if (timeSist < t) timeSist = t;
    const d = dagNå(); if (dagSist === null) dagSist = F.dag >= 0 ? F.dag : d;
    if (d !== dagSist) { dagSist = d; F.dag = d; døgn(); morgen(); }
    if (performance.now() - sistLagret > 20000) { sistLagret = performance.now(); lagre(); }
  });

  // ---------- teknologien i spillet ----------
  const leirT = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const harSag = () => { const L = leirT(); return !!(L && Array.isArray(L.bygg) && L.bygg.some(b => b.type === 'sagbruk')); };
  let DIESEL0 = null;
  function tekno() {
    for (const t of Fi.låsOpp(F, nåMin(), { harSag: harSag() })) { const s = `${t.firma} deler noe med dere: ${t.navn}. ${t.tekst}${t.bare ? '' : ' Ta det i bruk i Selskapet → Partnere.'}`; logg(s); telefon(s); }
    // høvleriet: alle sagbrukene i leiren høvler (også nye)
    const L = leirT(), hø = !!(F.tekno.høvleri && F.tekno.høvleri.iBruk);
    if (L && Array.isArray(L.bygg)) for (const b of L.bygg) if (b.type === 'sagbruk') { if (hø && !b.høvleri) b.høvleri = true; else if (!hø && b.høvleri) delete b.høvleri; }
    // bedre aggregat: mindre diesel per kWt
    if (window.Leir && Leir.DRIVSTOFF) { if (DIESEL0 === null) DIESEL0 = Leir.DRIVSTOFF.literPerKWt; Leir.DRIVSTOFF.literPerKWt = F.tekno.aggregat && F.tekno.aggregat.iBruk ? DIESEL0 * R.TEKNO.aggregat.diesel : DIESEL0; }
  }

  // ---------- handlingene (gjennom KOMMANDO) ----------
  const pålitelig = () => { const { sd } = selskap(); return sd && sd.rykte ? sd.rykte.pålitelig : 50; };
  const rykte = d => { try { const { S } = selskap(); if (S && window.Selskap) Selskap.endreRykte(S, ID, { pålitelig: d }); if (window.SelskapSpill && SelskapSpill.lagre) SelskapSpill.lagre(); } catch (e) { /* */ } };
  function samarbeidRett(k) {
    const f = Fi.finn(F, k.firma); if (!f) return { feil: 'Fant ikke firmaet.' };
    const kv = Fi.kanSamarbeid(F, f, k.slag); if (!kv.ok) return { feil: `${f.navn} vil ikke ennå: ${kv.mangler.join(' og ')}.` };
    const V = Fi.vilkår(f, k.slag); if (k.slag === 'felles' && !(window.OppstartSpill && OppstartSpill.betal(V.pris))) return { feil: `Dere har ikke råd til halve ${V.anlegg} (${kr(V.pris)}).` };
    const r = Fi.inngå(F, f, k.slag, nåMin()); if (!r.ok) { if (k.slag === 'felles') OppstartSpill.gi(V.pris); return { feil: r.grunn }; }
    logg(k.slag === 'fast' ? `${f.navn} gjør dere til fast leverandør: dere får deres tilbud først hver morgen. Si ja ofte nok.` : k.slag === 'felles' ? `Dere eier nå et ${V.anlegg} sammen med ${f.navn} (betalt ${kr(V.pris)}). Halve overskuddet kommer hvert døgn.`
      : `Rammeavtale om vern med ${f.navn}: ha ${V.mann} mann innen ${V.radius / 1000} km av ${f.hjem.navn} i ${Math.round(R.samarbeid.vern.holdtAndel * 100)} % av døgnet, ${kr(V.kr)} per døgn i ${V.døgn} døgn.`);
    if (k.slag === 'fast' && auto()) fastTilbud(f); lagre(); return { ok: true };
  }
  function avsluttRett(k) {
    const f = Fi.finn(F, k.firma); if (!f || !f[k.slag]) return { feil: 'Dere har ikke det samarbeidet.' };
    const r = Fi.avslutt(F, f, k.slag, { svik: !!k.svik }); if (r.svik) rykte(R.pakt.svik.pålitelig);
    if (r.gevinst && window.OppstartSpill) OppstartSpill.gi(r.gevinst);
    logg(r.svik ? `Dere solgte andelen i anlegget til en rival for ${kr(r.gevinst)}. ${f.navn} føler seg sveket – og de andre firmaene hører om det.` : `Dere avsluttet ${Fi.SAMARBEID[k.slag].toLowerCase()} med ${f.navn}.`);
    lagre(); return { ok: true };
  }
  function teknoRett(k) {
    const r = Fi.brukTekno(F, k.id, { harSag: harSag() }); if (!r.ok) return { feil: r.grunn };
    if (r.pris > 0 && !(window.OppstartSpill && OppstartSpill.betal(r.pris))) { F.tekno[k.id].iBruk = false; return { feil: `Dere har ikke råd (${kr(r.pris)}).` }; }
    tekno(); logg(`${R.TEKNO[k.id].navn} er tatt i bruk${r.pris ? ` (${kr(r.pris)})` : ''}. ${R.TEKNO[k.id].tekst}`); lagre(); return { ok: true };
  }
  function paktRett(k) {
    const pris = Fi.paktPris(F, k.pakt, k.side, +k.døgn || 0, +k.r || 0), kp = Fi.kanPakt(F, k.pakt, k.side, nåMin(), { pålitelig: pålitelig() });
    if (!kp.ok) return { feil: `${sidenavn(k.side)} sier nei: ${kp.mangler.join(' og ')}.` };
    if (pris > 0 && !(window.OppstartSpill && OppstartSpill.betal(pris))) return { feil: `Dere har ikke råd (${kr(pris)}).` };
    const r = Fi.inngåPakt(F, k.pakt, k.side, { r: k.r, døgn: k.døgn }, nåMin(), { pålitelig: pålitelig() }); if (!r.ok) { if (pris > 0) OppstartSpill.gi(pris); return { feil: r.grunn }; }
    koble(); logg(Fi.paktTekst(r.p, nåMin()) + (pris ? ` Dere betalte ${kr(pris)}.` : '')); lagre(); skitten = true; return { ok: true, p: r.p };
  }
  function brytRett(k) {
    const b = Fi.brytPakt(F, k.id, ID, nåMin()); if (!b) return { feil: 'Ingen slik avtale.' }; rykte(b.pålitelig);
    F.overraskelse = b.ild; if (b.innsyn) F.innsyn = { side: b.p.side, til: b.innsyn };
    logg(`Dere brøt ${b.p.type === 'allianse' ? 'alliansen' : 'våpenhvilen'} med ${sidenavn(b.p.side)}. De er uforberedt de neste ${Math.round(R.pakt.svik.minutter / 60)} timene – men alle hører om det («pålitelig» ${b.pålitelig}).`);
    lagre(); skitten = true; return { ok: true };
  }
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true; const K = window.Kommando;
    const typ = t => ['fast', 'felles', 'vern'].includes(t);
    K.registrer('firmaSamarbeid', { meld: false, sjekk: k => (!Fi.finn(F, k.firma) ? 'Fant ikke firmaet.' : !typ(k.slag) ? 'Ukjent samarbeid.' : null), utfør: samarbeidRett, beskriv: k => `inngår samarbeid med ${k.firma}` });
    K.registrer('firmaAvslutt', { meld: false, sjekk: k => (!Fi.finn(F, k.firma) || !typ(k.slag) ? 'Ukjent samarbeid.' : null), utfør: avsluttRett, beskriv: k => `avslutter samarbeidet med ${k.firma}` });
    K.registrer('firmaTekno', { meld: false, sjekk: k => (!R.TEKNO[k.id] ? 'Ukjent.' : null), utfør: teknoRett, beskriv: k => `tar i bruk ${(R.TEKNO[k.id] || {}).navn}` });
    K.registrer('paktInngå', { meld: false, sjekk: k => (!Fi.RIVALER[k.side] || !['hvile', 'allianse'].includes(k.pakt) ? 'Ukjent avtale.' : null), utfør: paktRett, beskriv: k => `inngår ${k.pakt === 'allianse' ? 'allianse' : 'våpenhvile'} med ${sidenavn(k.side)}` });
    K.registrer('paktBryt', { meld: false, sjekk: k => (!F.pakter.some(p => p.id === k.id) ? 'Ingen slik avtale.' : null), utfør: brytRett, beskriv: () => 'bryter en avtale' });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; melding = r.ok ? '' : (r.feil || 'Avvist.'); return r; };

  // ---------- krokene: våpenhvilen, overraskelsen, etterretningen ----------
  const iPakt = (a, b, x, y) => F.pakter.length && Fi.iPakt(F.pakter, a, b, x, y, nåMin());
  KROKER.ild.push((a, b) => {
    if (!a || !b || a.side === b.side) return 1;
    if (F.pakter.length && (iPakt(a.side, b.side, a.x, a.y) || iPakt(a.side, b.side, b.x, b.y))) return 0;
    const o = F.overraskelse; if (o && a.side === ID && b.side === o.side && nåMin() < o.til) return o.faktor;
    return 1;
  });
  // delt etterretning: dere ser lagene til den dere er alliert med, og det de ser av den felles fienden
  KROKER.ser.push(e => {
    if (!e || e.side === ID || (!F.pakter.length && !F.innsyn)) return false; const nå = nåMin();
    if (F.innsyn && F.innsyn.side === e.side && nå < F.innsyn.til) return true;
    for (const p of F.pakter) { if (p.type !== 'allianse' || !Fi.gjelder(p, nå)) continue; if (e.side === p.side) return true;
      if (e.side === p.mot && typeof ser === 'function' && lag().some(s => s.side === p.side && lever(s) && ser(s, e.x, e.y))) return true; }
    return false;
  });
  KROKER.lagTekst.push(s => { if (!s || s.side === ID || !F.pakter.length) return null; const p = Fi.aktivePakter(F, nåMin()).find(q => q.side === s.side); return p ? (p.type === 'allianse' ? 'alliert med dere' : 'våpenhvile med dere') : null; });
  // kartet: våpenhvileområdet (stiplet i rivalens farge) og firmaene dere verner
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!klar || typeof kam === 'undefined') return; const m = kam.m, nå = nåMin();
    for (const p of Fi.aktivePakter(F, nå)) { if (p.type !== 'hvile') continue; const X = (p.x - vx0) / m, Y = (vy1 - p.y) / m, r = p.r / m;
      g.save(); g.setLineDash([12, 8]); g.lineWidth = 3; g.strokeStyle = typeof sidefarge === 'function' ? sidefarge(p.side, 'lys') : '#b5503d'; g.globalAlpha = .9;
      g.beginPath(); g.arc(X, Y, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; g.textAlign = 'center'; g.font = '600 14px "Cormorant Garamond", serif';
      g.lineWidth = 3; g.strokeStyle = 'rgba(10,10,8,.8)'; const t = `Våpenhvile med ${sidenavn(p.side)} · ${Math.max(0, Math.ceil((p.slutt - nå) / 1440))} døgn`; g.strokeText(t, X, Y - r - 8); g.fillStyle = '#f0e2b0'; g.fillText(t, X, Y - r - 8); g.restore(); }
    for (const f of Fi.aktive(F)) { if (!f.vern || !f.hjem) continue; const X = (f.hjem.x - vx0) / m, Y = (vy1 - f.hjem.y) / m, r = R.samarbeid.vern.radius / m;
      g.save(); g.strokeStyle = 'rgba(201,178,106,.75)'; g.setLineDash([4, 6]); g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      if (m < 60) { g.fillStyle = '#f0e2b0'; g.font = '12px "Cormorant Garamond", serif'; g.fillText(`Vern: ${f.navn}`, X - 40, Y - r - 5); } g.restore(); }
  });

  // ---------- fanen Partnere ----------
  const css = document.createElement('style');
  css.textContent = `#selskapet .fi-boks{ border:1px solid #3a3222; background:rgba(20,18,14,.55); padding:8px 10px; margin:6px 0 8px; border-radius:3px; }
#selskapet .fi-boks h4{ margin:0 0 2px; font-family:'Cormorant Garamond', serif; font-size:17px; font-weight:600; color:#f0e2b0; display:flex; gap:8px; align-items:center; }
#selskapet .fi-boks h4 small{ font-family:inherit; font-size:12px; color:#a99e85; font-weight:400; margin-left:auto; text-align:right; }
#selskapet .fi-linje{ font-size:13px; color:#cfc4ab; margin:2px 0; } #selskapet .fi-linje b{ color:#e7dcc3; font-weight:600; }
#selskapet .fi-maal{ height:6px; background:#2a2418; border-radius:3px; overflow:hidden; margin:3px 0 4px; } #selskapet .fi-maal i{ display:block; height:100%; background:#8fae5e; }
#selskapet .fi-frisk{ color:#a9c27a; } #selskapet .fi-presset{ color:#d8b25a; } #selskapet .fi-konkurstruet, #selskapet .fi-konkurs{ color:#d97a62; }
#selskapet .fi-knapper{ display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; } #selskapet .fi-knapper button{ min-height:32px; padding:0 10px; font-size:13px; }
#selskapet .fi-knapper button.svik{ border-color:#7a3b2e; color:#e8b3a3; } #selskapet .fi-mangler{ font-size:12px; color:#a99e85; margin:2px 0 0; }
#selskapet .fi-del{ margin:8px 0 2px; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#a9c27a; }
#selskapet .fi-valg{ display:flex; flex-wrap:wrap; gap:4px; align-items:center; font-size:12.5px; color:#a99e85; margin:3px 0; } #selskapet .fi-valg span{ min-width:128px; }
#selskapet .fi-valg button{ min-height:28px; min-width:0; padding:0 9px; font-size:12.5px; }
#selskapet .fi-valg button.på, #selskapet .fi-valg button.på:hover{ border-color:#c9b26a; color:#f0e2b0; background:#4a3d1f; box-shadow:inset 0 0 0 1px #c9b26a; }
#selskapet .fi-knapper button.hoved{ border-color:#c9b26a; color:#f0e2b0; }
#selskapet .fi-ringer{ color:#f0e2b0; font-size:13px; margin:3px 0; } #selskapet .fi-melding{ color:#e8b3a3; font-size:13px; margin:4px 0; }
#selskapet details.fi-konk summary{ cursor:pointer; color:#a99e85; font-size:13px; }`;
  document.head.appendChild(css);
  const knapp = (tekst, sp, data = {}, kl = '') => `<button type="button" class="${kl}" data-sp="${sp}"${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}>${esc(tekst)}</button>`;
  const merke = side => { try { return window.SelskapSpill && SelskapSpill.merke ? SelskapSpill.merke(side, 26) : ''; } catch (e) { return ''; } };
  function rivalHtml(side) {
    const nå = nåMin(), A = Fi.aktivePakter(F, nå).filter(p => p.side === side), annen = Fi.annen(side);
    let h = `<div class="fi-boks" data-rival="${side}"><h4>${merke(side)}${esc(sidenavn(side))}<small>${side === 'rød' ? 'pågående – tar sjanser, bryter lettere' : 'forsiktig – holder oftere ord'}</small></h4>`;
    { const rv = window.RivalSpill && RivalSpill.partnerTekst ? RivalSpill.partnerTekst(side) : ''; if (rv) h += `<div class="fi-linje fi-rival">${esc(rv)}</div>`; }   // (ut5-rivaler, Ø8)
    if (A.length) for (const p of A) h += `<div class="fi-linje"><b>${esc(Fi.paktTekst(p, nå))}</b></div><div class="fi-knapper">${knapp(p.type === 'allianse' ? 'Bryt alliansen (svik)' : 'Bryt våpenhvilen (svik)', 'fi-bryt', { id: p.id }, 'svik')}</div>`
      + `<p class="fi-mangler">Å bryte gir overraskelse (treff × ${String(R.pakt.svik.ild).replace('.', ',')} mot dem i ${Math.round(R.pakt.svik.minutter / 60)} timer), men koster «pålitelig» ${R.pakt.svik.pålitelig} og holdningen hos alle firmaene.</p>`;
    else h += `<div class="fi-linje">Ingen avtale – dere er fiender.${F.brudd[side] ? ` Dere har brutt med dem ${F.brudd[side]} ${F.brudd[side] === 1 ? 'gang' : 'ganger'}: prisen er ${2 ** F.brudd[side]} ganger så høy.` : ''}</div>`;
    if (!A.some(p => p.type === 'hvile')) { const kp = Fi.kanPakt(F, 'hvile', side, nå, { pålitelig: pålitelig() }), pris = Fi.paktPris(F, 'hvile', side, valg.døgn, valg.r);
      h += `<div class="fi-del">Våpenhvile</div><div class="fi-valg"><span>Område rundt leiren</span>${R.pakt.hvile.radier.map(r => knapp(r / 1000 + ' km', 'fi-valg', { r }, valg.r === r ? 'på' : '')).join('')}</div>`
        + `<div class="fi-valg"><span>Varighet</span>${R.pakt.hvile.døgn.map(d => knapp(d + ' døgn', 'fi-valg', { d }, valg.døgn === d ? 'på' : '')).join('')}</div>`
        + `<div class="fi-knapper">${knapp(`Tilby våpenhvile (${kr(pris)})`, 'fi-pakt', { type: 'hvile', side })}</div>` + (kp.ok ? '' : `<p class="fi-mangler">Sier nei nå: ${esc(kp.mangler.join('; '))}</p>`); }
    if (!A.some(p => p.type === 'allianse')) { const kp = Fi.kanPakt(F, 'allianse', side, nå, { pålitelig: pålitelig() }), pris = Fi.paktPris(F, 'allianse', side, valg.aDøgn, 0);
      h += `<div class="fi-del">Allianse mot ${esc(sidenavn(annen))}</div><div class="fi-valg"><span>Varighet</span>${R.pakt.allianse.døgn.map(d => knapp(d + ' døgn', 'fi-valg', { a: d }, valg.aDøgn === d ? 'på' : '')).join('')}</div>`
        + `<div class="fi-knapper">${knapp(`Foreslå allianse (bidrag ${kr(pris)})`, 'fi-pakt', { type: 'allianse', side })}</div>`
        + `<p class="fi-mangler">${kp.ok ? `Dere ser lagene deres og det de ser av ${esc(sidenavn(annen))}, og de går mot de samme tettstedene. Den sterkeste tar mest til slutt.` : 'Sier nei nå: ' + esc(kp.mangler.join('; '))}</p>`; }
    return h + '</div>';
  }
  const SAMORD = { fast: 'Fast kunde', felles: 'Felles anlegg', vern: 'Vern' };
  function firmaHtml(f) {
    const ø = Fi.økonomi(f), H = Math.round(f.holdning);
    let h = `<div class="fi-boks" data-firma="${esc(f.navn)}"><h4>${esc(f.navn)}<small>${esc(Fi.BRANSJER[f.bransje] || f.bransje)} · ${esc(f.hjem ? f.hjem.navn : 'ukjent sted')}${f.ny ? ' · nytt' : ''}</small></h4>`;
    h += `<div class="fi-linje">Økonomi: <b class="fi-${ø}">${esc(Fi.økonomiTekst(f))}</b> · holdning <b>${H}</b> (${esc(Fi.holdningOrd(H))}) · ${f.levert} levert${f.brutt ? `, ${f.brutt} brutt` : ''}</div><div class="fi-maal" title="Holdning ${H} av 100"><i style="width:${H}%"></i></div>`;
    if (f.behov.length) h += `<div class="fi-linje">Trenger: ${esc(f.behov.join(', '))}</div>`;
    const sam = Fi.samarbeidTekst(f); if (sam) h += `<div class="fi-linje">Har sammen med dere: <b>${esc(sam)}</b></div>`;
    { const rv = Fi.rivalTekst ? Fi.rivalTekst(f, nåMin()) : ''; if (rv) h += `<div class="fi-linje fi-rival">Rivalene: <b>${esc(rv)}</b></div>`; }   // (ut5-rivaler, Ø8)
    for (const t of Object.keys(f.tilbudt || {})) if (!f[t]) h += `<div class="fi-ringer">☎ ${esc(f.navn)} har ringt om ${esc(SAMORD[t].toLowerCase())}.</div>`;
    const tk = Fi.tekno(F, { harSag: harSag() }).filter(t => t.firma === f.navn);
    for (const t of tk) h += `<div class="fi-linje">Kan låse opp: <b>${esc(t.navn)}</b> – ${t.låstOpp ? (t.iBruk ? 'i bruk' : t.bare ? 'låst opp (kan bygges senere)' : 'låst opp') : 'mangler ' + esc(t.mangler.join(', '))}</div>`;
    let kn = '', mang = [];
    for (const type of ['fast', 'felles', 'vern']) {
      if (f[type]) { kn += type === 'felles' ? knapp(`Selg andelen til en rival (svik, +${kr(Math.round(f.felles.betalt * R.samarbeid.felles.svikSalg))})`, 'fi-slutt', { firma: f.navn, type, svik: 1 }, 'svik') : knapp(`Avslutt ${SAMORD[type].toLowerCase()}`, 'fi-slutt', { firma: f.navn, type }); continue; }
      const kv = Fi.kanSamarbeid(F, f, type); if (kv.ingen) continue; const V = Fi.vilkår(f, type);
      const tekst = type === 'fast' ? 'Fast kunde' : type === 'felles' ? `Felles ${V.anlegg} (${kr(V.pris)})` : `Vern (${kr(V.kr)}/døgn)`;
      if (kv.ok) kn += knapp(tekst, 'fi-sam', { firma: f.navn, type }, f.tilbudt && f.tilbudt[type] ? 'hoved' : ''); else mang.push(`${SAMORD[type]}: ${kv.mangler.join(', ')}`);
    }
    if (f.hjem) kn += knapp('Vis i kartet', 'fi-vis', { firma: f.navn });
    h += `<div class="fi-knapper">${kn}</div>` + (mang.length ? `<p class="fi-mangler">${esc(mang.join(' · '))}</p>` : '');
    return h + '</div>';
  }
  function fane() {
    if (!klar) start(); if (!klar) return '<p class="rolig">Velg leir først.</p>';
    let h = '<p class="rolig" style="margin:6px 0">Firmaene dere handler med, og rivalene. God holdning gir faste kunder, felles anlegg, vern – og ny teknologi. Å bryte en avtale gir noe nå, men alle hører om det.</p>';
    if (melding) h += `<p class="fi-melding">${esc(melding)}</p>`;
    h += '<h3>Rivalene</h3>' + rivalHtml('rød') + rivalHtml('grønn');
    const T = Fi.tekno(F, { harSag: harSag() });
    h += '<h3>Teknologi gjennom handel</h3>' + T.map(t => `<div class="fi-boks"><h4>${esc(t.navn)}<small>fra ${esc(t.firma)}</small></h4><div class="fi-linje">${esc(t.tekst)}</div>`
      + (t.iBruk ? '<div class="fi-linje"><b class="fi-frisk">I bruk.</b></div>' : t.låstOpp ? (t.bare ? '<div class="fi-linje">Låst opp – bygg et fiskemottak ved en kai (Leir → Bygg → Produksjon).</div>' : `<div class="fi-knapper">${knapp(`Ta i bruk (${kr(t.pris)})`, 'fi-tekno', { id: t.id })}</div>` + (t.manglerBruk.length ? `<p class="fi-mangler">Trenger ${esc(t.manglerBruk.join(', '))}.</p>` : ''))
        : `<p class="fi-mangler">Mangler: ${esc(t.mangler.join('; '))}</p>`) + '</div>').join('');
    const A = Fi.aktive(F).slice().sort((a, b) => (!!(b.fast || b.felles || b.vern) - !!(a.fast || a.felles || a.vern)) || b.holdning - a.holdning), K = F.firmaer.filter(f => f.konkurs);
    h += `<h3>Firmaene <small>${A.length} i området</small></h3>` + A.map(firmaHtml).join('');
    if (K.length) h += `<details class="fi-konk"><summary>Gått konkurs (${K.length})</summary>${K.map(f => `<div class="fi-linje">${esc(f.navn)} – ${esc(f.hjem ? f.hjem.navn : '')}, dag ${Math.floor(f.konkurs / 1440) + 1}</div>`).join('')}</details>`;
    return h;
  }
  // et trykk i fanen: svarer true når panelet skal tegnes på nytt
  function trykk(b) {
    const s = b.dataset.sp, d = b.dataset;
    if (s === 'fi-valg') { if (d.r) valg.r = +d.r; if (d.d) valg.døgn = +d.d; if (d.a) valg.aDøgn = +d.a; return true; }
    if (s === 'fi-pakt') { kom({ type: 'paktInngå', side: d.side, pakt: d.type, ...(d.type === 'hvile' ? { r: valg.r, døgn: valg.døgn } : { døgn: valg.aDøgn }) }); return true; }
    if (s === 'fi-bryt') { kom({ type: 'paktBryt', id: d.id }); return true; }
    if (s === 'fi-sam') { kom({ type: 'firmaSamarbeid', firma: d.firma, slag: d.type }); return true; }
    if (s === 'fi-slutt') { kom({ type: 'firmaAvslutt', firma: d.firma, slag: d.type, svik: !!d.svik }); return true; }
    if (s === 'fi-tekno') { kom({ type: 'firmaTekno', id: d.id }); return true; }
    if (s === 'fi-vis') { const f = Fi.finn(F, d.firma); if (f && f.hjem && typeof kam !== 'undefined') { if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function') slå3d(false); kam.x = f.hjem.x; kam.y = f.hjem.y; if (kam.m > 20) kam.m = 12; skitten = true;
      if (innerWidth < 700 && window.SelskapetSpill) SelskapetSpill.vis(false); } return true; }
    return false;
  }

  Object.assign(api, { tilstand: () => F, sett: d => { F = Fi.fraJSON(d) || F; koble(); lagre(); }, nullstill: () => { const s = Sp(); F = Fi.ny(s && s.leir); koble(); hjem(); lagre(); }, start, lagre, fane, trykk, morgen, døgn,
    telKontrakter, fastTilbud, tekno, krig, mannNær, klar: () => klar, NØKKEL, valg,
    rett: { samarbeid: samarbeidRett, avslutt: avsluttRett, tekno: teknoRett, pakt: paktRett, bryt: brytRett } });
  window.FirmaSpill = api;
  // Selskap: tilbudene kommer fra firmaene som finnes nå (nye med, konkurs ikke)
  if (window.Selskap) Selskap.firmaKilde = () => (klar ? Fi.aktive(F).map(f => f.navn) : null);
})();
