/* Riksbrudd – DØGNOPPGJØRET (runde 5, 18.–19. nov, pakke «balanse»). Dagboka (spill/dagbok.js) skriver hver morgen kl. 06 hvor mange
 * dere er, moral, mat, diesel og kassa. Det den ikke sier, er hva som HENDTE siste døgn: angrep (slått tilbake eller herjet), egne
 * sårede og falne, bygg som ble ødelagt eller skadet, hus dere lette gjennom, folk som kom eller dro – og hvor lenge maten rekker.
 * Dette er en linje rett etter dagbokas rapport: «Siste døgn: bølge 3 slått tilbake. 2 nye sårede. Brakke ødelagt. 2 hus gjennomsøkt.
 * Mat til 3,4 døgn.» (maten bare når dagboka mangler – den står alt i dagbokas rapport rett over).
 * Reglene øverst er uten DOM (Node: require('./forsvar-oppgjor'); nettleser: globalThis.Oppgjor) – test_forsvar_oppgjor.js.
 * I testene (navigator.webdriver) skrives ingenting av seg selv: OppgjorSpill.test = true slår det på.
 */
(function (rot) {
  'use strict';
  const des = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
  // Claudes forslag: et bygg som har tapt mer enn «skadet» av helsa på et døgn, regnes som skadet; et bygg som er borte og sist hadde
  // under «ødelagt» helse, regnes som ødelagt (ellers revet av spilleren og ikke nevnt)
  const REGLER = { skadet: .05, ødelagt: .6, maksBygg: 3 };
  // b: { bølge (bølger startet), aktiv (bølgen som pågår, 0 = ingen), herjet (bølger som endte med herjing), friske, såret, falne
  //      (egne menn i lagene), slåttUt (egne lag slått ut), bygg: [{ id, navn, hp }], hus (gjennomsøkt), folk, mat, matDøgn }
  // ferdige bølger = bølge − (aktiv ? 1 : 0); slått tilbake = ferdige − herjet (sabotører som slapp unna regnes også som herjet)
  function tekst(før, nå) {
    if (!før || !nå) return null;
    const deler = [], ferdig = b => (b.bølge || 0) - (b.aktiv ? 1 : 0);
    const nyeFerdig = Math.max(0, ferdig(nå) - ferdig(før)), nyeHerjet = Math.max(0, (nå.herjet || 0) - (før.herjet || 0)), slått = Math.max(0, nyeFerdig - nyeHerjet);
    if (slått) deler.push(slått === 1 ? `bølge ${ferdig(nå) - nyeHerjet} slått tilbake` : `${slått} bølger slått tilbake`);
    // (runde 12, kritiker F: «Røverne slapp unna (herjet eller sabotasje)» er uklart) – si hva som skjedde: herjet = røverne kom inn i
    // leiren og tok med seg bytte; sabotasje = sabotører gjorde skade og kom seg unna. Gamle bilder uten «slapp» får den gamle summen.
    const nyeSab = Number.isFinite(nå.slapp) && Number.isFinite(før.slapp) ? Math.max(0, Math.min(nyeHerjet, nå.slapp - før.slapp)) : null;
    if (nyeHerjet && nyeSab === null) deler.push(nyeHerjet === 1 ? 'røverne kom seg unna – de herjet i leiren eller fikk gjort sabotasje' : `røverne kom seg unna ${nyeHerjet} ganger – de herjet i leiren eller fikk gjort sabotasje`);
    else if (nyeHerjet) { const herj = nyeHerjet - nyeSab;
      if (herj) deler.push(herj === 1 ? 'røverne kom inn i leiren og dro med bytte' : `røverne kom inn i leiren og dro med bytte ${herj} ganger`);
      if (nyeSab) deler.push(nyeSab === 1 ? 'sabotører gjorde skade og slapp unna' : `sabotører gjorde skade og slapp unna ${nyeSab} ganger`); }
    if (nå.aktiv) deler.push(`bølge ${nå.aktiv} pågår`);
    const såret = Math.max(0, (nå.såret || 0) - (før.såret || 0)), falne = Math.max(0, (nå.falne || 0) - (før.falne || 0)), ute = Math.max(0, (nå.slåttUt || 0) - (før.slåttUt || 0));
    if (såret || falne) deler.push([såret ? `${såret} ${såret === 1 ? 'ny såret' : 'nye sårede'}` : '', falne ? `${falne} falt` : ''].filter(Boolean).join(', '));
    // (runde 13, kritiker G: morgenmøtet sa bare «4 falt. Ett lag er slått ut» – uten hvem de kjempet mot) kampene siste døgn fra
    // spill/forsvar-kamp.js (nå.kamper: { lag, fiende, sted, falne, slått, start }) med tap: hvem, mot hvem og hvor
    const ks = Array.isArray(nå.kamper) ? nå.kamper.filter(k => k && k.lag && (!Number.isFinite(før.tid) || k.start >= før.tid) && (k.falne > 0 || k.slått)) : [];
    if (ute && ks.filter(k => k.slått).length < ute) deler.push(ute === 1 ? 'ett lag er slått ut' : `${ute} lag er slått ut`);
    for (const k of ks.slice(0, REGLER.maksBygg)) deler.push(`${k.lag} ${k.slått ? 'ble slått ut' : `mistet ${k.falne}`} i kamp med ${k.fiende || 'en fiende dere ikke så'}${k.sted ? ' ' + k.sted : ''}`);
    const nåId = new Map((nå.bygg || []).map(b => [b.id, b])), ødelagt = (før.bygg || []).filter(b => !nåId.has(b.id) && b.hp < REGLER.ødelagt).map(b => b.navn);
    const skadet = (før.bygg || []).filter(b => nåId.has(b.id) && b.hp - nåId.get(b.id).hp > REGLER.skadet).length;
    if (ødelagt.length) deler.push(`${ødelagt.length > REGLER.maksBygg ? ødelagt.length + ' bygg' : ødelagt.join(', ')} ødelagt`);
    if (skadet) deler.push(`${skadet} ${skadet === 1 ? 'bygg' : 'bygg'} skadet`);
    const hus = Math.max(0, (nå.hus || 0) - (før.hus || 0)); if (hus) deler.push(`${hus} ${hus === 1 ? 'hus' : 'hus'} gjennomsøkt`);
    // (runde 12, kritiker F: «2 har dratt» sier ikke hvem eller hvorfor) – med navnene i bildene: hvem som gikk inn i en tropp, døde/falt
    // eller forlot gjengen (lav moral når folk.js telte dem i F.borte); uten navn (gamle bilder) som før
    if (Array.isArray(før.navn) && Array.isArray(nå.navn)) deler.push(...folkTekst(før, nå));
    else { const folk = (nå.folk || 0) - (før.folk || 0); if (folk) deler.push(folk > 0 ? `${folk} ${folk === 1 ? 'ny' : 'nye'} i gjengen` : `${-folk} har forlatt leiren`); }
    const hendte = deler.length;
    const stor = s => s.charAt(0).toUpperCase() + s.slice(1);
    let t = hendte ? 'Siste døgn: ' + deler.map(stor).join('. ') + '.' : 'Siste døgn: Et rolig døgn.';
    if (nå.folk > 0 && Number.isFinite(nå.matDøgn)) t += ` Mat til ${des(Math.max(0, nå.matDøgn))} døgn${nå.matDøgn < 2 ? ' – kjøp eller skaff mat' : ''}.`;
    return { tekst: t, hendte };
  }
  const og = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' og ' + l[l.length - 1]);
  const kort = l => (l.length > 4 ? og([...l.slice(0, 3), `${l.length - 3} til`]) : og(l));
  // folkTekst(før, nå): før/nå.navn = navnene i folket; nå.tropp = { navn: lagnavn } (folk som står i en tropp), nå.døde = { navn: 'falt'|'døde' }
  // (lista over døde i Samfunn), før/nå.borte = folk.js sin teller for dem som har forlatt gjengen fordi moralen var for lav
  function folkTekst(før, nå) {
    const ut = [], nå1 = new Set(nå.navn), før1 = new Set(før.navn), gått = før.navn.filter(n => !nå1.has(n)), nye = nå.navn.filter(n => !før1.has(n));
    const tropp = {}, falt = [], døde = [], dro = [];
    for (const n of gått) { const t = nå.tropp && nå.tropp[n], d = nå.døde && nå.døde[n];
      if (t) (tropp[t] = tropp[t] || []).push(n); else if (d === 'falt') falt.push(n); else if (d) døde.push(n); else dro.push(n); }
    for (const [t, l] of Object.entries(tropp)) ut.push(`${kort(l)} gikk inn i ${t}`);
    if (falt.length) ut.push(`${kort(falt)} falt`);
    if (døde.length) ut.push(`${kort(døde)} døde`);
    // (kritikerløkka r2: alle som manglet ble kalt «forlot gjengen», også en tropp som manglet etter omlasting) – «forlot gjengen» bare så
    // mange som folk.js faktisk telte som gått (lav moral); de andre «er ikke lenger i leiren» (grunnen er ukjent her)
    if (dro.length) { const moral = Math.min(dro.length, Math.max(0, (nå.borte || 0) - (før.borte || 0)));
      if (moral >= dro.length) ut.push(`${kort(dro)} forlot gjengen fordi moralen var for lav`);
      else if (moral) ut.push(`${kort(dro)} er ikke lenger i leiren (${moral === 1 ? 'én' : moral} av dem forlot gjengen fordi moralen var for lav)`);
      else ut.push(`${kort(dro)} er ikke lenger i leiren`); }
    if (nye.length) ut.push(`${kort(nye)} ${nye.length === 1 ? 'er ny' : 'er nye'} i gjengen`);
    return ut;
  }
  const api = { REGLER, tekst, folkTekst };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Oppgjor = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ---------- visningen ----------
  const NØKKEL = 'riksbrudd-oppgjor';
  const ut = { test: false }, auto = () => !navigator.webdriver || ut.test;
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  const leirId = () => { const S = spill(); return S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : null; };
  const dag = t => Math.floor(t / 1440) + 1;
  let S = null, klar = false;
  // matDøgn bare når dagboka ikke finnes (ellers står maten i rapporten dens)
  function bilde() {
    const L = rot.LeirSpill && LeirSpill.tilstand(), F = rot.FolkSpill && FolkSpill.tilstand(), T = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : {};
    const egne = ENHETER.filter(e => e.side === 'blå' && !e.karakter && !e.leirvakt && Array.isArray(e.menn)), menn = egne.flatMap(e => e.menn);
    let matDøgn = Infinity; try { const B = F && L && rot.FolkRegler ? FolkRegler.behov(F, L, FolkSpill.valg ? FolkSpill.valg() : {}) : null; matDøgn = B && Number.isFinite(B.dager) ? B.dager : (F && F.personer.length ? F.mat / F.personer.length : Infinity); } catch (e) { matDøgn = F && F.personer.length ? F.mat / F.personer.length : Infinity; }
    // sabotører som slapp unna (krig-visning.js) regnes som herjet: ingen seier
    let slapp = 0; if (rot.KrigSpill && KrigSpill.slapp) for (let w = 1; w <= (T.bølge || 0) - (T.aktiv ? 1 : 0); w++) if (KrigSpill.slapp(w)) slapp++;
    return { bølge: T.bølge || 0, aktiv: T.aktiv || 0, herjet: (T.herjet || 0) + slapp, friske: menn.filter(m => m.hp >= 1).length, såret: menn.filter(m => m.hp > 0 && m.hp < 1).length, falne: menn.filter(m => m.hp <= 0).length,
      slåttUt: egne.filter(e => !levende(e) || (rot.Terreng && Terreng.slattUt(e.menn))).length,
      bygg: L ? L.bygg.filter(b => !b.del && !(b.igjen > 0)).map(b => ({ id: b.id, navn: Leir.BYGG[b.type] ? Leir.BYGG[b.type].navn : b.type, hp: Math.round((b.hp === undefined ? 1 : b.hp) * 100) / 100 })) : [],
      hus: rot.LeteSpill && LeteSpill.antall ? LeteSpill.antall() : 0, tid, kamper: kamper(), folk: F ? F.personer.length : 0, slapp, ...hvem(F), mat: F ? F.mat : 0, matDøgn: rot.DagbokSpill ? null : matDøgn };
  }
  // (runde 13) kampene til lagene dine (spill/forsvar-kamp.js), uten kampen om leiren (den står i bølgene)
  const kamper = () => (rot.KampSpill ? [...KampSpill.ferdige(), ...KampSpill.kamper().map(k => ({ ...k, slått: false }))].filter(k => !k.leir)
    .map(k => ({ lag: k.lag, fiende: k.fiende, sted: k.sted, falne: k.falne || 0, slått: !!k.slått, start: Math.round(k.start) })).slice(-8) : undefined);
  // (runde 12) navnene i folket, hvem som står i en tropp nå, og hvem som er døde (Samfunn) – så oppgjøret kan si hvem og hvorfor
  function hvem(F) { if (!F) return {}; const tropp = {}, døde = {};
    for (const e of ENHETER) if (e.side === 'blå' && !e.karakter && !e.leirvakt && Array.isArray(e.menn)) for (const m of e.menn) if (m.hp > 0 && m.navn) tropp[m.navn] = e.navn;
    const S = rot.SamfunnSpill && SamfunnSpill.tilstand ? SamfunnSpill.tilstand() : null;
    if (S) { for (const d of S.døde || []) døde[d.navn] = d.hvem === 'soldat' ? 'falt' : 'døde'; for (const n of S.gravlagte || []) if (!døde[n]) døde[n] = 'døde'; }
    for (const e of ENHETER) if (e.side === 'blå' && Array.isArray(e.menn)) for (const m of e.menn) if (m.hp <= 0 && m.navn) døde[m.navn] = 'falt';
    return { navn: F.personer.map(p => p.navn), tropp, døde, borte: F.borte || 0 }; }
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId(), d: S })); } catch (e) { /* fullt eller sperret */ } };
  function start() { const id = leirId(); if (!id) return; let d = null; try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); d = o && o.leir === id ? o.d : null; } catch (e) { d = null; }
    S = d && d.før && Number.isFinite(d.dag) ? d : { dag: dag(tid), før: bilde() }; klar = true; lagre(); }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  // ny morgen (samme regel som dagboka: ny dag fra kl. 06): oppgjøret etter dagbokas rapport (denne kroken ligger etter dagboka i lista)
  // RUNDE 13 (pakke «morgen», kritiker H: «Et rolig døgn» samme døgn som en falt): etter en omlasting rett før kl. 06 sto klokka bak dagen som
  // alt var gjort opp, så oppgjøret ble tatt på nytt og sammenlignet bare de siste minuttene. Nå: bare en NYERE dag (aldri bakover).
  function morgen(tving) { if (!klar || !S) return null; if (!tving && Number.isFinite(S.dag) && dag(tid) <= S.dag) return null; const nå = bilde(), r = tekst(S.før, nå); S.dag = Math.max(S.dag || 0, dag(tid)); S.før = nå; lagre();
    if (r && (auto() || tving)) logg(r.tekst); return r; }
  KROKER.sim.push(() => { morgen(false); });
  rot.OppgjorSpill = Object.assign(ut, { bilde, morgen, start, tilstand: () => S });
})(typeof globalThis !== 'undefined' ? globalThis : this);
