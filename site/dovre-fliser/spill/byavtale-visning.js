'use strict';
/* Riksbrudd – BYENE PÅ LAGET i spillet (fase Ø3, 28. nov; docs/plan-selskap-okonomi.md kapittel 3). Reglene: spill/byavtale.js.
 * window.ByavtaleSpill. Lagres per leir i localStorage «riksbrudd-byavtale».
 *  - FANEN BYER i panelet Selskapet (selskapspanel.js spør ByavtaleSpill.fane(liste) og sender trykk på [data-sp^="ba-"] hit):
 *    hver by med tillit, frykt, behov og avtale; trykk -> byens kort (leder, målere, behov, Forhandle, Send lag, Vis i kartet);
 *    forhandlingskortet med tre valg (pris, løfte, varighet) -> ja, nei eller motbud.
 *  - AVTALENE går gjennom kommandolaget: byForhandle { by, trinn, pris, løfte, varighet }, bySiOpp { by }, og «Send lag» bruker ordre.
 *  - TAKTEN (bare når !navigator.webdriver || ByavtaleSpill.test): hver spilltime telles egne mann i byen eller innen 3 km (løftet),
 *    handelsvarene går i potten til regionen, fiender nær en by med avtale gir en bønn om hjelp (hendelsen «riksbrudd-by-ber», som
 *    tida-visning.js teller); hvert spilldøgn kommer betalingen (via RegionSpill-potten, så den står som skatt i dagboka), tilliten går
 *    opp eller ned, byen kan si opp (et døgns varsel, nabobyene får høre det), og rivalene Ravnsund og Mosevakt frir til byer nær seg.
 *  - TILLIT = LOJALITET for tettsteder du holder: tilliten leses og skrives som Region-lojaliteten (RegionSpill.lojFor/settLoj).
 *  - MAKT (kapittel 18, spørsmål 2): et tettsted som blir ditt uten avtale, starter med tillit 10 og frykt 80 (RegionSpill.startLoj);
 *    med en garnison og frykt fra 50 er byen lydig (RegionSpill.lydig). Ikke i testene.
 *  - KARTET: en ring i avtalefargen rundt byene (kunde, beskyttelse, handel, medlem; rivalenes stiplet i deres farge; rød puls når byen
 *    ber om hjelp). KRIG: linjer i krigskartet («Ravnsund forhandler med Otta»), og stillingen teller partnere halvt (Strategi.avtaler).
 * Tekstene og tallene er Claudes forslag.
 */
(function () {
  const BA = window.Byavtale, G = window.Garnison; if (!BA || !G || typeof KROKER === 'undefined') return;
  const R = BA.REGLER, api = { test: false }, auto = () => !navigator.webdriver || api.test === true;
  const tilfV = (typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random;
  const Sp = () => window.OppstartSpill && OppstartSpill.tilstand(), RS = () => window.RegionSpill;
  const kr = v => (window.Leir ? Leir.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NØKKEL = 'riksbrudd-byavtale';
  let S = BA.ny(), leirId = '', klar = false;
  const les = () => { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); return d && d.leir === leirId ? d.d : null; } catch (e) { return null; } };
  const lagre = () => { if (!leirId || (window.NETT && NETT.gjest)) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: S })); } catch (e) { /* fullt eller sperret */ } };
  const sidenavn = s => (window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[s] ? Fraksjoner.FRAKSJONER[s].navn : s === 'rød' ? 'Ravnsund' : s === 'grønn' ? 'Mosevakt' : 'Dere');
  const nåMin = () => (typeof tid === 'number' && Number.isFinite(tid) ? tid : 0);

  // ---------- tettstedene ----------
  const alle = () => (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [];
  const midt = by => by.midtR || (by.midtR = { x: (by.bb[0] + by.bb[2]) / 2, y: (by.bb[1] + by.bb[3]) / 2 });
  const eier = id => { try { return G.tilstand(TETTSTEDER, id).eier || null; } catch (e) { return null; } };
  let OMR = { t: -1e9, n: -1, liste: [], m: new Map() };
  // området: tettstedene innen 45 km fra leiren, minst de åtte nærmeste (Strategi.område) – regnes høyst hvert femte sekund
  function område() {
    const s = Sp(), A = alle(); if (!s || !s.leir || !A.length) return [];
    if (performance.now() - OMR.t < 5000 && OMR.n === A.length) return OMR.liste;
    const B = A.filter(by => by.e && by.bb).map(by => ({ id: by.e.id, navn: by.e.navn, folk: by.e.folk || 0, x: midt(by).x, y: midt(by).y, r: Math.max(250, Math.hypot(by.bb[2] - by.bb[0], by.bb[3] - by.bb[1]) / 2), by }));
    const L = window.Strategi && Strategi.område ? Strategi.område(s.leir, B) : B.filter(b => Math.hypot(b.x - s.leir.x, b.y - s.leir.y) < 45000);
    OMR = { t: performance.now(), n: A.length, liste: L, m: new Map(L.map(b => [String(b.id), b])) }; return L;
  }
  const finn = id => { område(); return OMR.m.get(String(id)) || null; };
  const tilstand = id => BA.by(S, String(id));
  // tilliten: Region-lojaliteten når byen er din, ellers byavtalens eget tall
  function tillit(id) { const v = eier(id) === 'blå' && RS() && RS().lojFor ? RS().lojFor(id) : null; return v !== null && v !== undefined ? v : tilstand(id).tillit; }
  function endreTillit(id, d) { const b = tilstand(id); if (eier(id) === 'blå' && RS() && RS().lojFor && RS().lojFor(id) !== null) { const v = Math.max(0, Math.min(100, RS().lojFor(id) + d)); RS().settLoj(id, v); b.tillit = v; }
    else b.tillit = Math.max(0, Math.min(100, b.tillit + d)); }
  const synk = id => { const b = tilstand(id); b.tillit = tillit(id); return b; };

  // ---------- det rundt byen ----------
  const lag = () => (typeof ENHETER !== 'undefined' ? ENHETER : []);
  const lever = s => (typeof levende === 'function' ? levende(s) : true);
  const friske = s => s.menn.reduce((a, m) => a + (m.hp >= 1 ? 1 : m.hp > 0 ? .5 : 0), 0);
  function mannNær(by, radius) { let n = 0; for (const s of lag()) if (s.side === 'blå' && !s.karakter && lever(s) && Math.hypot(s.x - by.x, s.y - by.y) <= radius) n += friske(s); return n; }
  function fienderNær(by, radius) { const ut = []; for (const s of lag()) if (s.side !== 'blå' && lever(s)) { const d = Math.hypot(s.x - by.x, s.y - by.y); if (d <= radius) ut.push({ s, d }); } return ut.sort((a, b) => a.d - b.d); }
  const retning = (by, p) => { const a = Math.atan2(p.x - by.x, p.y - by.y) * 180 / Math.PI, i = Math.round(((a + 360) % 360) / 45) % 8; return ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'][i]; };
  function behovFor(by) {
    const f = fienderNær(by, 30000)[0], strøm = window.GarnisonSpill && GarnisonSpill.strømFor ? GarnisonSpill.strømFor(by.by) : true;
    const type = RS() && RS().typeFor ? RS().typeFor(by.id) : 'bygd', vinter = window.VAER && VAER.årstid === 'vinter';
    const rivalNær = !!(S.byer[by.id] && (S.byer[by.id].forhandler || S.byer[by.id].rival));
    return BA.behov({ fiendeKm: f ? f.d / 1000 : Infinity, strøm, type, vinter, garnison: mannNær(by, 1500) >= 2, rivalNær });
  }
  function info(id) { const by = finn(id); if (!by) return null; const b = synk(by.id), l = BA.leder(by.id, by.folk);
    return { by, b, leder: l, H: BA.HOLDNING[l.holdning], behov: behovFor(by), trinn: eier(by.id) === 'blå' && !(b.avtale && b.avtale.trinn === 'medlem') ? 'holdt' : BA.trinn(b), eier: eier(by.id) }; }

  // ---------- kommandoene ----------
  // byForhandle { by, trinn, pris, løfte, varighet } -> svaret fra Byavtale.forhandle; ja = avtalen er inngått
  function forhandleRett(k) {
    const by = finn(k.by); if (!by) return { svar: 'nei', grunn: 'Fant ikke byen.' };
    const b = synk(by.id), l = BA.leder(by.id, by.folk), bh = behovFor(by), rp = b.forhandler ? b.forhandler.pris : b.rival ? b.rival.pris : 0;
    if (k.trinn === 'medlem' && eier(by.id) && eier(by.id) !== 'blå') return { svar: 'nei', grunn: `${by.navn} holdes av ${sidenavn(eier(by.id))}.` };
    const r = BA.forhandle(b, { trinn: k.trinn, pris: +k.pris, løfte: k.løfte, varighet: +k.varighet }, { folk: by.folk, behov: bh.verdi, holdning: l.holdning, rivalPris: rp, eid: eier(by.id) === 'blå', nå: nåMin() });
    if (r.svar === 'ja') { const hadde = b.forhandler || b.rival; BA.inngå(b, { trinn: k.trinn, pris: +k.pris, løfte: k.løfte, varighet: +k.varighet }, nåMin());
      if (k.trinn === 'medlem' && RS() && RS().nyttMedlem) RS().nyttMedlem(by.id, b.tillit);
      const L = b.avtale, tekst = k.trinn === 'medlem' ? `${by.navn} er medlem: byen betaler skatt til dere og teller fullt i krigen.` : `Avtale med ${by.navn}: ${BA.TRINNORD[k.trinn].toLowerCase()} i ${L.varighet} døgn for ${kr(L.pris)} per døgn. Dere lover ${L.mann} mann i byen eller innen 3 km og hjelp innen ${L.svartid} t.`;
      logg(tekst + (hadde ? ` ${sidenavn(hadde.side)} gikk tomhendt.` : '')); skitten = true; }
    lagre(); return r;
  }
  function siOppRett(k) { const by = finn(k.by), b = by && S.byer[by.id]; if (!b || !b.avtale) return { feil: 'Ingen avtale å si opp.' };
    const t = b.avtale.trinn; if (t === 'medlem' && RS() && RS().ikkeMedlem) RS().ikkeMedlem(by.id); BA.avslutt(b, 'spiller'); endreTillit(by.id, R.tillit.oppsagt);
    logg(`Dere sa opp avtalen med ${by.navn}. Byrådet er skuffet.`); lagre(); skitten = true; return { ok: true }; }
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true; const K = window.Kommando;
    K.registrer('byForhandle', { meld: false,
      sjekk: k => (!finn(k.by) ? 'Fant ikke byen.' : !BA.REGLER.trinn[k.trinn] || k.trinn === 'kunde' ? 'Ukjent avtale.' : !R.løfter.some(l => l.id === k.løfte) ? 'Ukjent løfte.' : null),
      utfør: k => forhandleRett(k), beskriv: k => `forhandler med ${(finn(k.by) || {}).navn || 'en by'}` });
    K.registrer('bySiOpp', { meld: false, sjekk: k => (!S.byer[k.by] || !S.byer[k.by].avtale ? 'Ingen avtale å si opp.' : null), utfør: k => siOppRett(k), beskriv: k => `sier opp avtalen med ${(finn(k.by) || {}).navn || 'en by'}` });
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; return r.ok ? r.svar : { svar: 'nei', grunn: r.feil || 'Kommandoen ble avvist.' }; };

  // ---------- takten ----------
  const melding = t => { if (window.SpilletSpill && SpilletSpill.varsel) SpilletSpill.varsel(t); else logg(t); };
  // én spilltime: løftene, handelsvarene, bønner om hjelp, rivalenes forhandlinger
  function timeSteg() {
    const nå = nåMin(); let endret = false;
    for (const by of område()) { let b = S.byer[by.id];
      // egne lag som vokter en by uten avtale, telles (tillit opp til Byavtale.REGLER.vakt.tak)
      if ((!b || !b.avtale) && eier(by.id) !== 'blå' && mannNær(by, R.radius) >= R.vakt.mann) { b = tilstand(by.id); b.vakt = (b.vakt || 0) + 1; }
      if (!b) continue;
      if (b.avtale) { BA.time(b, mannNær(by, R.radius));
        if (b.avtale.trinn === 'handel' && RS() && RS().leggIPott && window.Region) { const g = Region.grunn(by.folk, RS().typeFor(by.id)); delete g.penger; delete g.folk; RS().leggIPott(g, 1 / 24); }
        const fi = fienderNær(by, R.hjelp.radius);
        if (fi.length) { const h = BA.berOmHjelp(b, { nå, fiender: fi.length, km: Math.round(fi[0].d / 100) / 10, retning: retning(by, fi[0].s) });
          if (h) { const t = `${by.navn} ber om hjelp – ${h.fiender} ${h.fiender === 1 ? 'fiendtlig lag' : 'fiendtlige lag'} ${String(h.km).replace('.', ',')} km ${h.retning}. Dere lovte hjelp innen ${b.avtale.svartid} t.`;
            melding(t); try { window.dispatchEvent(new CustomEvent('riksbrudd-by-ber', { detail: { tekst: t, by: by.id, navn: by.navn } })); } catch (e) { /* eldre nettlesere */ } endret = true; } }
        const r = BA.hjelpSteg(b, { nå, framme: mannNær(by, R.hjelp.framme) >= 2, fiendeBorte: !fi.length });
        if (r === 'hjulpet') { logg(`${by.navn}: hjelpen kom i tide. Tilliten stiger.`); endret = true; }
        if (r === 'for sent') { logg(`${by.navn}: dere kom ikke i tide. Tilliten synker, og byrådet noterer et brutt løfte.`); endret = true; } }
      // (ut8-kr-ro) byen trenger dere mens en rival frir: et tilbud fra kommunen der (én gang per frieri)
      if (b.forhandler && b.oppdragFor !== b.forhandler.fra) byOppdrag(by.id);
      const rv = BA.rivalSteg(b, nå); if (rv === 'rival') { logg(`${sidenavn(b.rival.side)} har fått en beskyttelsesavtale med ${by.navn}.`); endret = true; }
      if (BA.rivalVokser(b, nå)) { logg(`${by.navn} har gått i handel med ${sidenavn(b.rival.side)}. Byen teller halvt for dem i krigen.`); endret = true; } }
    if (endret) skitten = true; lagre();
  }
  // ett spilldøgn: betaling, tillit, oppsigelser, slutt på avtaler, rivaler som frir
  function døgnSteg() {
    const nå = nåMin(); let betalt = 0; const linjer = [];
    for (const by of område()) { const b = S.byer[by.id]; if (!b) continue; const l = BA.leder(by.id, by.folk);
      synk(by.id); const før = b.tillit, d = BA.døgn(b, { holdning: l.holdning, vokter: (b.vakt || 0) >= R.vakt.timer }); b.vakt = 0;
      if (!b.avtale && d.endring > 0) linjer.push(`${by.navn}: dere vokter byen (tillit ${Math.round(b.tillit)})`);
      if (eier(by.id) === 'blå' && b.tillit !== før && RS() && RS().settLoj) RS().settLoj(by.id, b.tillit);
      const p = BA.betaling(b); if (p > 0 && !(b.avtale && b.avtale.oppsagt && nå >= b.avtale.oppsagt.slutt)) { betalt += p; }
      if (d.holdt === true) linjer.push(`${by.navn}: løftet holdt`); else if (d.holdt === false) linjer.push(`${by.navn}: løftet brutt (tilliten synker)`);
      if (d.sierOpp && BA.siOpp(b, nå, d.grunn)) { logg(`${by.navn} sier opp avtalen (${d.grunn}). Den gjelder ett døgn til – og byrådet forteller nabobyene det.`);
        for (const o of BA.naboer(by, område())) endreTillit(o.id, R.tillit.nabo); }
      const sl = BA.slutt(b, nå); if (sl) { const t = b.avtale.trinn; if (t === 'medlem' && RS() && RS().ikkeMedlem) RS().ikkeMedlem(by.id); BA.avslutt(b, sl, nå);
        logg(sl === 'ute' ? `Avtalen med ${by.navn} er ute. Forhandle på nytt i Selskapet → Byer.` : `${by.navn} har gått ut av avtalen med dere.`); } }
    if (betalt > 0 && RS() && RS().leggIPott) { RS().leggIPott({ penger: betalt }); if (RS().lever) RS().lever(); }
    if (betalt > 0 || linjer.length) logg(`Byavtalene: ${betalt > 0 ? kr(betalt) + ' inn' : 'ingen betaling'}${linjer.length ? ' · ' + linjer.slice(0, 3).join(' · ') : ''}.`);
    // rivalene frir (enkel AI): hver av dem kanskje til én by nær seg
    if (auto()) for (const side of ['rød', 'grønn']) { if (tilfV() >= R.rival.sjanse) continue;
      const L = område().map(o => ({ id: o.id, x: o.x, y: o.y, folk: o.folk, eier: eier(o.id) })), id = BA.rivalMål(S, L, side); if (id === null) continue;
      const by = finn(id); BA.rivalFrir(tilstand(id), side, by.folk, nå, BA.leder(id, by.folk).holdning);
      logg(`${sidenavn(side)} forhandler med ${by.navn}. Vil dere by over, gjør det innen et døgn (Selskapet → Byer).`); }
    lagre(); skitten = true;
  }
  let sistTime = null, sistDag = null;
  setInterval(() => { if (!klar || !auto()) { sistTime = null; sistDag = null; return; } const t = nåMin(), h = Math.floor(t / 60), d = Math.floor(t / 1440);
    if (sistTime === null) { sistTime = h; sistDag = d; return; }
    for (let n = 0; sistTime < h && n < 48; n++) { sistTime++; timeSteg(); }
    sistTime = h; if (d > sistDag) { sistDag = d; døgnSteg(); } }, 1000);
  // kontrakter levert for en by: tilliten stiger, og byen er kunde
  window.addEventListener('riksbrudd-kontrakt', e => { try { const d = e.detail; if (!d || d.type !== 'levert' || !window.SelskapSpill) return; const T = SelskapSpill.tilstand(), sd = T && T.sider && T.sider.blå;
    const k = sd && [...(sd.ferdige || []), ...(sd.aktive || [])].find(q => q.id === d.id); if (!k || !k.giver || k.giver.slag === 'firma' || k.giver.by == null || !finn(k.giver.by)) return;
    const b = tilstand(k.giver.by); b.kontrakter++; endreTillit(k.giver.by, R.tillit.kontrakt); lagre(); skitten = true; } catch (er) { /* */ } });
  // makt og lydighet (region-visning.js spør)
  function koble() { const rs = RS(); if (!rs) return;
    rs.startLoj = id => { if (!auto()) return undefined; const b = S.byer[id]; if (b && b.avtale && b.avtale.trinn === 'medlem') return b.tillit;
      const t = tilstand(id); t.tillit = R.makt.tillit; t.frykt = Math.max(t.frykt, R.makt.frykt); t.makt = true; lagre(); return R.makt.tillit; };
    rs.lydig = id => !!(S.byer[id] && S.byer[id].frykt >= R.lydig);
    if (window.Strategi) Strategi.avtaler = id => BA.stillingVekt(S.byer[id]); }

  // ---------- krigskartet ----------
  { const KT = window.KRIG_TILLEGG = window.KRIG_TILLEGG || {};
    (KT.by = KT.by || []).push(by => { if (!klar || !by || !by.e) return null; const b = S.byer[by.e.id]; if (!b) return null; const d = [];
      if (b.avtale) d.push(`Avtale: ${BA.TRINNORD[b.avtale.trinn].toLowerCase()}${b.avtale.oppsagt ? ' (oppsagt)' : ''}, tillit ${Math.round(tillit(by.e.id))}`);
      if (b.forhandler) d.push(`${sidenavn(b.forhandler.side)} forhandler med ${by.e.navn}`);
      if (b.rival) d.push(`${sidenavn(b.rival.side)} har ${b.rival.trinn === 'handel' ? 'handelsavtale' : 'beskyttelsesavtale'} her`);
      return d.length ? d.join(' · ') : null; });
    (KT.side = KT.side || []).push(sd => { if (!klar) return null; const d = [];
      for (const by of område()) { const b = S.byer[by.id]; if (!b) continue;
        if (sd === 'blå' && b.avtale) d.push(`${by.navn} (${BA.TRINNORD[b.avtale.trinn].toLowerCase()})`);
        if (sd !== 'blå' && b.forhandler && b.forhandler.side === sd) d.push(`${sidenavn(sd)} forhandler med ${by.navn}`);
        if (sd !== 'blå' && b.rival && b.rival.side === sd) d.push(`${sidenavn(sd)} har ${b.rival.trinn === 'handel' ? 'handelsavtale' : 'beskyttelsesavtale'} med ${by.navn}`); }
      return d.length ? (sd === 'blå' ? 'Byavtaler: ' + d.slice(0, 4).join(', ') : d.slice(0, 3).join('. ')) + '.' : null; }); }

  // ---------- varselbrikken (spill/narhud.js leser window.VARSEL_TILLEGG): en by ber om hjelp; trykk = byens kort ----------
  (window.VARSEL_TILLEGG = window.VARSEL_TILLEGG || []).push(() => { if (!klar) return []; const ut = [];
    for (const by of område()) { const b = S.byer[by.id]; if (!b || !b.hjelp) continue; const t = Math.max(0, Math.round((b.hjelp.frist - nåMin()) / 6) / 10);
      ut.push({ i: 'varsel', k: 'fare', t: `${by.navn} ber om hjelp`, s: `frist ${String(t).replace('.', ',')} t`, f: () => { valgt = by.id; modus = 'kort'; if (window.SelskapetSpill) SelskapetSpill.vis(true, 'byer'); } }); }
    return ut.slice(0, 2); });

  // ---------- kartet: ringene ----------
  const RING = { kunde: ['rgba(170,180,190,.75)', 1.5, [4, 4]], beskyttelse: ['rgba(214,178,90,.9)', 2.5, []], handel: ['rgba(127,176,122,.95)', 3, []], medlem: ['rgba(110,150,210,1)', 4, []] };
  const ringer = (g, vx0, vy1) => { if (!klar) return; const m = kam.m;
    for (const by of område()) { const b = S.byer[by.id]; if (!b) continue; const t = BA.trinn(b), x = (by.x - vx0) / m, y = (vy1 - by.y) / m, r = Math.max(10, by.r / m);
      if (x < -r - 20 || y < -r - 20 || x > g.canvas.width + r + 20 || y > g.canvas.height + r + 20) continue;
      g.save();
      if (RING[t]) { const [f, w, d] = RING[t]; g.strokeStyle = f; g.lineWidth = w; g.setLineDash(d); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
      if (b.rival || b.forhandler) { const sd = (b.rival || b.forhandler).side; g.strokeStyle = typeof sidefarge === 'function' ? sidefarge(sd, 'lys') : '#b5503d'; g.lineWidth = 2; g.setLineDash(b.rival ? [7, 5] : [2, 5]); g.beginPath(); g.arc(x, y, r + 6, 0, Math.PI * 2); g.stroke(); }
      if (b.hjelp) { const p = .5 + .5 * Math.sin(performance.now() / 250); g.strokeStyle = `rgba(230,80,60,${.4 + .5 * p})`; g.lineWidth = 3; g.setLineDash([]); g.beginPath(); g.arc(x, y, r + 12 + 4 * p, 0, Math.PI * 2); g.stroke(); skitten = true; }
      g.restore(); } };
  KROKER.tegn.push(ringer);

  // ---------- fanen Byer ----------
  const css = document.createElement('style');
  css.textContent = `#selskapet .ba{ display:grid; grid-template-columns:1fr auto; gap:2px 8px; align-items:center; padding:7px 0; border-bottom:1px solid #3a3226; }
#selskapet .ba b{ font-weight:600; } #selskapet .ba small{ display:block; color:#a89970; font-size:12.5px; line-height:1.35; }
#selskapet .ba .t{ display:inline-block; padding:0 6px; border-radius:8px; font-size:12px; margin-left:4px; border:1px solid #5a4a2a; color:#c9b98f; }
#selskapet .ba .t.beskyttelse{ border-color:#b8964a; color:#e0c57a; } #selskapet .ba .t.handel{ border-color:#6f9a5f; color:#9fca8f; } #selskapet .ba .t.medlem{ border-color:#5b7ea8; color:#9cbbe0; }
#selskapet .ba .t.rival{ border-color:#a0503d; color:#e09a85; } #selskapet .ba .t.hjelp{ border-color:#c0503a; color:#ff9a80; }
#selskapet .bakort h3{ margin:8px 0 4px; } #selskapet .bakort .leder{ color:#c9b98f; font-size:13.5px; margin:2px 0 8px; line-height:1.4; }
#selskapet .bamaal{ display:grid; grid-template-columns:62px 1fr 34px; gap:4px 8px; align-items:center; font-size:13px; margin:3px 0; }
#selskapet .bamaal i{ display:block; height:8px; border-radius:4px; background:#2c261c; overflow:hidden; } #selskapet .bamaal i span{ display:block; height:100%; background:#c9b26a; }
#selskapet .bamaal.frykt i span{ background:#b5503d; } #selskapet .bamaal.behov i span{ background:#7fa0c0; }
#selskapet .bavalg{ display:flex; flex-wrap:wrap; gap:4px; margin:4px 0 8px; } #selskapet .skropp .bavalg button.på{ border-color:#c9b26a; color:#f0e2b0; background:#4a3c22; background-image:none; outline:2px solid #c9b26a; outline-offset:-2px; font-weight:700; }
#selskapet .basvar{ margin:8px 0; padding:6px 8px; border-left:3px solid #c9b26a; font-size:13.5px; line-height:1.4; } #selskapet .basvar.nei{ border-color:#b5503d; } #selskapet .basvar.ja{ border-color:#7fb07a; }
#selskapet .bapris{ display:flex; align-items:center; gap:6px; margin:4px 0 8px; } #selskapet .bapris b{ min-width:120px; text-align:center; }
#selskapet .baandre{ margin:10px 0 2px; } #selskapet .skropp .baandre button{ width:100%; text-align:left; background:none; border-color:#3a3226; color:#a89970; }
#selskapet .ba.andre b{ font-weight:400; color:#b9ab86; }
#selskapet .baspor{ margin:4px 0 6px; padding:0; list-style:none; } #selskapet .baspor li{ display:flex; gap:8px; align-items:center; padding:5px 0; border-bottom:1px solid #3a3226; font-size:13.5px; line-height:1.35; }
#selskapet .baspor li > span{ flex:1; min-width:0; } #selskapet .baspor li b{ color:#cfe0a8; font-weight:600; white-space:nowrap; } #selskapet .baspor li small{ display:block; color:#8f8a7c; font-size:12.5px; }
#selskapet .basvar.budkamp{ border-color:#c9b26a; background:rgba(201,178,106,.06); }`;
  document.head.appendChild(css);
  let valgt = null, modus = 'liste', forslag = null, svar = null, andreÅpen = false;
  const prosent = v => Math.round(v);
  const måler = (navn, v, kl) => `<div class="bamaal ${kl}"><span>${navn}</span><i><span style="width:${Math.max(0, Math.min(100, v))}%"></span></i><b>${prosent(v)}</b></div>`;
  const trinnMerke = (b, id) => { const t = eier(id) === 'blå' && !(b.avtale && b.avtale.trinn === 'medlem') ? null : BA.trinn(b); let h = t && t !== 'nøytral' ? `<span class="t ${t}">${BA.TRINNORD[t]}</span>` : '';
    if (b.avtale && b.avtale.oppsagt) h += '<span class="t rival">oppsagt</span>'; if (b.rival) h += `<span class="t rival">${esc(sidenavn(b.rival.side))}</span>`; else if (b.forhandler) h += `<span class="t rival">${esc(sidenavn(b.forhandler.side))} frir</span>`;
    if (b.hjelp) h += '<span class="t hjelp">ber om hjelp</span>'; return h; };
  function liste(L) {
    // (ut4-fiksa) uten tettsteder (kartet laster fortsatt, eller området har ingen) sier fanen det, i stedet for bare innledningen
    if (!L.length) return '<p class="rolig">Ingen tettsteder i området ennå. Kartet laster kanskje fortsatt.</p>';
    let h = '<p class="rolig" style="margin:6px 0">Vinn byene med avtaler: kunde (kontrakter) → beskyttelse → handel → medlem. Holder dere det dere lover, stiger tilliten. Dere kan fortsatt ta en by med makt, men da er den redd dere og stoler ikke på dere.</p>';
    // (ut8-kr-ro, kritikken: «Byer lister Oslo, Bergen, Tromsø og Bodø med Vis, selv om bare Hamar, Gjøvik og Lillehammer er aktuelle»)
    // byene i området (som krigskartet: Strategi.område) først; resten ligger sammenfoldet under «Andre byer»
    const iOmr = L.filter(q => finn(q.id)), andre = L.filter(q => !finn(q.id));
    if (!iOmr.length) h += '<p class="rolig">Ingen tettsteder i området rundt leiren ennå. Kartet laster kanskje fortsatt.</p>';
    for (const q of iOmr.slice(0, 40)) { const i = info(q.id); if (!i) continue;
      const b = i.b, eierT = i.eier && i.eier !== 'blå' ? ` · holdes av ${esc(sidenavn(i.eier))}` : i.eier === 'blå' && !(b.avtale && b.avtale.trinn === 'medlem') ? ' · holdes av dere' : '';
      h += `<div class="ba"><span><b>${esc(q.navn)}</b>${trinnMerke(b, q.id)}<small>${(q.folk || 0).toLocaleString('nb-NO')} innb.${eierT} · tillit ${prosent(b.tillit)} · frykt ${prosent(b.frykt)} · trenger ${BA.BEHOVORD[i.behov.hoved]}</small></span><button type="button" data-sp="ba-kort" data-id="${esc(q.id)}">Åpne</button></div>`; }
    if (andre.length) { h += `<div class="baandre"><button type="button" data-sp="ba-andre" aria-expanded="${andreÅpen}">${andreÅpen ? '▾' : '▸'} Andre byer (${andre.length}) – utenfor området</button></div>`;
      if (andreÅpen) h += andre.slice(0, 40).map(q => `<div class="ba andre"><span><b>${esc(q.navn)}</b><small>${q.folk ? q.folk.toLocaleString('nb-NO') + ' innbyggere' : 'tettsted'} · ${esc(q.eierNavn || '')}</small></span><button type="button" data-sp="by" data-id="${esc(q.id)}">Vis</button></div>`).join(''); }
    h += `<div class="knapperad">${window.RegionSpill && RegionSpill.åpne ? '<button type="button" data-sp="region">Regionen</button>' : ''}${document.getElementById('krigknapp') ? '<button type="button" data-sp="krig">Krigskartet</button>' : ''}</div>`;
    return h;
  }
  const nesteTrinn = (b, id) => { if (id !== undefined && eier(id) === 'blå') return b.avtale && b.avtale.trinn === 'medlem' ? null : 'medlem'; const t = BA.trinn(b); return t === 'beskyttelse' ? 'handel' : t === 'handel' ? 'medlem' : t === 'medlem' ? null : 'beskyttelse'; };
  function kortHtml(i) {
    const { by, b, leder: l, H, behov: bh } = i, A = b.avtale, nå = nåMin();
    let h = `<div class="bakort"><button type="button" data-sp="ba-liste">← Alle byene</button><h3>${esc(by.navn)} ${trinnMerke(b, by.id)}</h3>`;
    h += `<div class="leder">${esc(l.navn)}, ${esc(l.tittel)} – ${esc(H.navn)}: ${esc(H.tekst)}.<br>${by.folk.toLocaleString('nb-NO')} innbyggere${i.eier ? ' · holdes av ' + esc(i.eier === 'blå' ? 'dere' : sidenavn(i.eier)) : ''}.</div>`;
    h += måler('Tillit', b.tillit, 'tillit') + måler('Frykt', b.frykt, 'frykt') + måler('Behov', bh.verdi, 'behov');
    h += `<p class="rolig" style="margin:6px 0">Byen trenger mest ${BA.BEHOVORD[bh.hoved]} (trygghet ${bh.trygghet}, strøm ${bh.strøm}, mat ${bh.mat}, ved ${bh.ved}).${b.makt ? ' Dere tok byen med makt – den husker det.' : ''}</p>`;
    if (A) { const igjen = Math.max(0, (A.slutt - nå) / 1440), timer = A.timer || 0;
      h += `<h3>Avtalen</h3><p class="rolig">${BA.TRINNORD[A.trinn]}${A.trinn === 'medlem' ? ': byen betaler skatt til dere' : `: ${kr(A.pris)} per døgn`}. Dere lover ${A.mann} mann i byen eller innen 3 km og hjelp innen ${A.svartid} t. ${igjen > 1 ? Math.ceil(igjen) + ' døgn igjen' : 'under ett døgn igjen'}.${timer ? ` I dag: løftet holdt ${A.okTimer} av ${timer} t.` : ''} Egne mann nær nå: ${Math.floor(mannNær(by, R.radius))}.${A.brudd ? ` Brutt ${A.brudd} ${A.brudd === 1 ? 'gang' : 'ganger'}.` : ''}${A.oppsagt ? ' <b>Byen har sagt opp avtalen.</b>' : ''}</p>`; }
    if (b.hjelp) h += `<div class="basvar nei">Byen ber om hjelp: ${b.hjelp.fiender} fiendtlige lag ${String(b.hjelp.km).replace('.', ',')} km ${esc(b.hjelp.retning)}. Frist om ${Math.max(0, Math.round((b.hjelp.frist - nå) / 6) / 10).toString().replace('.', ',')} t.</div>`;
    if (b.forhandler) h += `<div class="basvar">${esc(sidenavn(b.forhandler.side))} forhandler med ${esc(by.navn)} og tilbyr beskyttelse for ${kr(b.forhandler.pris)} per døgn. By under for å vinne byen (innen ${Math.max(0, Math.round((b.forhandler.ferdig - nå) / 60))} t).</div>`;
    if (b.rival) h += `<div class="basvar">${esc(by.navn)} har ${b.rival.trinn === 'handel' ? 'handelsavtale' : 'beskyttelsesavtale'} med ${esc(sidenavn(b.rival.side))}. Et billigere tilbud kan vinne byen tilbake.</div>`;
    // (ut8-kr-ro) i budkamp regnes kravet med det minste løftet som holder (Byavtale.tillitSpor), ellers som før
    const annen = i.eier && i.eier !== 'blå', nt = annen ? null : nesteTrinn(b, by.id), spor = nt ? BA.tillitSpor(b, { holdning: l.holdning, navn: by.navn, trinn: nt }) : null;
    const feil = nt ? BA.kanTrinn(b, nt, 'blå', i.eier === 'blå', nåMin(), { løfte: spor && spor.budkamp && spor.budkamp.løfte ? spor.budkamp.løfte : undefined }) : null;
    h += sporHtml(by, b, nt, spor);
    h += '<div class="knapperad">';
    if (nt) h += `<button type="button" data-sp="ba-forhandle" data-id="${esc(by.id)}">Forhandle${feil ? '' : ' om ' + BA.TRINNORD[nt].toLowerCase()}</button>`;
    h += `<button type="button" data-sp="ba-send" data-id="${esc(by.id)}">Send lag</button><button type="button" data-sp="by" data-id="${esc(by.id)}">Vis i kartet</button>`;
    if (A && !A.oppsagt) h += `<button type="button" data-sp="ba-siopp" data-id="${esc(by.id)}">Si opp</button>`;
    h += '</div>'; if (annen) h += `<p class="rolig">${esc(sidenavn(i.eier))} holder byen. Ta den tilbake, eller vent til den er fri.</p>`; else if (nt && feil) h += `<p class="rolig">Neste steg (${BA.TRINNORD[nt].toLowerCase()}): ${esc(feil)}</p>`;
    if (svar && svar.by === String(by.id) && modus === 'kort') h += `<div class="basvar ${svar.r.svar}">${esc(svar.r.grunn)}</div>`;
    return h + '</div>';
  }
  // (ut8-kr-ro, kritikken: «Ravnsund frir, men all forhandling sier tillit 30 av 40 – og ingen kontrakt jeg kunne ta, ga tillit»)
  // kontraktene for byen (tilbud og aktive i Selskapet: oppdragsgiveren er bygdelaget eller kommunen der)
  function kontrakterFor(id) { const T = window.SelskapSpill && SelskapSpill.tilstand ? SelskapSpill.tilstand() : null, sd = T && T.sider && T.sider.blå; if (!T) return { tilbud: [], aktive: [] };
    const for_ = k => k && k.giver && k.giver.slag !== 'firma' && k.giver.by != null && String(k.giver.by) === String(id);
    return { tilbud: (T.tilbud || []).filter(for_), aktive: sd ? (sd.aktive || []).filter(for_) : [] }; }
  // SPORET: hva som gir mer tillit, med tallene fra Byavtale.REGLER, og budkampen når en rival frir
  function sporHtml(by, b, nt, spor) {
    if (!spor || !nt || nt === 'medlem' && !spor.mangler) return '';
    const K = kontrakterFor(by.id), sd = s => sidenavn(s), rv = b.forhandler || b.rival; let h = '';
    if (spor.budkamp && rv) { const bk = spor.budkamp, L = bk.løfte ? R.løfter.find(q => q.id === bk.løfte) : null, grense = rv.pris ? Math.round(rv.pris * R.rival.overby / 1000) * 1000 : 0;
      h += `<div class="basvar budkamp" data-budkamp="${bk.løfte || ''}"><b>Budkamp.</b> ${esc(sd(rv.side))} vil ha byen. Lover dere mer, trenger dere mindre tillit: ${R.løfter.map((q, n) => `${q.mann} mann krever ${n ? '' : 'tillit '}${BA.tillitKrav(b, 'beskyttelse', q.id)}`).join(', ')} (dere har ${prosent(b.tillit)}). `
        + (L ? `Lov ${L.mann} mann og hjelp innen ${L.svartid} t, og by under ${esc(sd(rv.side))}${grense ? `: høyst ${kr(grense)} per døgn` : ''}.` : `Dere trenger tillit ${bk.krav} selv med det største løftet.`) + '</div>'; }
    if (!spor.mangler && !spor.budkamp) return h;
    h += `<h3>Slik får dere mer tillit${spor.mangler ? ` <small>${spor.mangler} mangler til ${BA.TRINNORD[nt].toLowerCase()}</small>` : ''}</h3><ul class="baspor">`;
    for (const v of spor.veier) {
      const pluss = `+${String(v.pluss).replace('.', ',')} ${v.per === 'døgn' ? 'per døgn' : v.per === 'gang' ? 'hver gang' : 'tillit'}`;
      let under = '', knapp = '';
      if (v.id === 'kontrakt') { const n = K.tilbud.length, a = K.aktive.length; under = a ? `${a} aktiv${a === 1 ? '' : 'e'} for byen nå` : n ? `${n} tilbud for byen i Selskapet nå` : 'Ingen tilbud for byen akkurat nå – nye kommer om morgenen.';
        if (n || a) knapp = `<button type="button" data-sp="ba-kontrakter" data-id="${esc(by.id)}">Se ${n ? 'tilbudet' : 'kontrakten'}</button>`; }
      else if (v.id === 'vakt') { under = `Opp til tillit ${v.tak}. I dag: ${b.vakt || 0} av ${R.vakt.timer} t, ${Math.floor(mannNær(by, R.radius))} egne mann nær nå.`; knapp = `<button type="button" data-sp="ba-send" data-id="${esc(by.id)}">Send lag</button>`; }
      h += `<li data-spor="${v.id}"><span>${esc(v.tekst)}: <b>${pluss}</b><small>${esc(under)}</small></span>${knapp}</li>`; }
    return h + '</ul>';
  }
  // et tilbud fra byen når den trenger dere (en rival frir): ett per frieri, fra kommunen i byen (Selskap.lagTilbud med fast oppdragsgiver)
  function byOppdrag(id, stille) {
    const by = finn(id), b = by && S.byer[by.id], rv = b && b.forhandler; if (!by || !rv || eier(by.id) || !window.Selskap || !window.SelskapSpill) return null;
    if (b.oppdragFor === rv.fra) return null; const K = kontrakterFor(by.id); if (K.tilbud.length || K.aktive.length) { b.oppdragFor = rv.fra; lagre(); return null; }
    const T = SelskapSpill.tilstand(); if (!T) return null;
    const infl = (() => { try { const M = window.SpilletSpill && SpilletSpill.M && SpilletSpill.M(); return M && M.infl > 0 ? M.infl : 1; } catch (e) { return 1; } })();
    const st = SelskapSpill.steder ? SelskapSpill.steder() : [], her = st.filter(q => q.slag === 'tettsted' && String(q.id) === String(by.id));
    const giver = { slag: 'by', navn: `Kommunen i ${by.navn}`, by: by.id };
    let n = []; try { n = Selskap.lagTilbud(T, 'blå', nåMin(), her.length ? her : [{ navn: by.navn, x: by.x, y: by.y, slag: 'tettsted', id: by.id }], null, { antall: 1, giver, infl });
      if (!n.length) n = Selskap.lagTilbud(T, 'blå', nåMin(), st, null, { antall: 1, giver, infl }); } catch (e) { n = []; }
    const k = n[0]; b.oppdragFor = rv.fra; lagre(); if (!k) return null;
    k.byOppdrag = by.id; try { if (SelskapSpill.lagre) SelskapSpill.lagre(); } catch (e) { /* */ }
    if (!stille) logg(`Kommunen i ${by.navn} har en jobb til dere mens ${sidenavn(rv.side)} frir: ${k.tittel} (${kr(k.betaling)}). Levert gir den +${R.tillit.kontrakt} tillit hos byen (Selskapet → Kontrakter).`);
    skitten = true; return k;
  }
  function forhandleHtml(i) {
    const { by, b } = i, f = forslag;
    let h = `<div class="bakort"><button type="button" data-sp="ba-kort" data-id="${esc(by.id)}">← ${esc(by.navn)}</button><h3>Forhandle med ${esc(by.navn)}</h3>`;
    const muligeTrinn = eier(by.id) === 'blå' ? ['medlem'] : ['beskyttelse', 'handel', 'medlem'].filter(t => BA.rang(t) > BA.rang(BA.trinn(b)));
    h += '<div class="bavalg">' + muligeTrinn.map(t => `<button type="button" data-sp="ba-trinn" data-v="${t}" class="${f.trinn === t ? 'på' : ''}">${BA.TRINNORD[t]}</button>`).join('') + '</div>';
    const feil = BA.kanTrinn(b, f.trinn, 'blå', eier(by.id) === 'blå', nåMin(), { løfte: f.løfte }); if (feil) h += `<p class="rolig">${esc(feil)}</p>`;
    // (ut8-kr-ro) budkamp: løftet senker kravet til tillit – si det her også
    if (f.trinn === 'beskyttelse' && BA.budkamp(b)) { const rv = b.forhandler || b.rival;
      h += `<p class="rolig" data-budkamp="1">Budkamp med ${esc(sidenavn(rv.side))}: ${R.løfter.map(q => `${q.mann} mann krever tillit ${BA.tillitKrav(b, 'beskyttelse', q.id)}`).join(', ')}.${rv.pris ? ` By under ${kr(Math.round(rv.pris * R.rival.overby / 1000) * 1000)} per døgn.` : ''}</p>`; }
    if (f.trinn !== 'medlem') h += `<h3>Pris byen betaler per døgn</h3><div class="bapris"><button type="button" data-sp="ba-pris" data-v="-1">−</button><b>${kr(f.pris)}</b><button type="button" data-sp="ba-pris" data-v="1">+</button></div>`;
    else h += '<p class="rolig">Som medlem betaler byen skatt til dere (som et tettsted dere holder), uten opprør, og teller fullt i krigen.</p>';
    h += '<h3>Det dere lover</h3><div class="bavalg">' + R.løfter.map(l => `<button type="button" data-sp="ba-løfte" data-v="${l.id}" class="${f.løfte === l.id ? 'på' : ''}">${l.mann} mann, hjelp innen ${l.svartid} t</button>`).join('') + '</div>';
    h += '<h3>Varighet</h3><div class="bavalg">' + R.varigheter.map(v => `<button type="button" data-sp="ba-varighet" data-v="${v}" class="${f.varighet === v ? 'på' : ''}">${v} døgn</button>`).join('') + '</div>';
    h += `<div class="knapperad"><button type="button" data-sp="ba-tilbud" data-id="${esc(by.id)}"${feil ? ' disabled' : ''}>Send tilbudet</button></div>`;
    if (svar && svar.by === String(by.id)) { h += `<div class="basvar ${svar.r.svar}">${svar.r.svar === 'ja' ? 'Ja. ' : svar.r.svar === 'nei' ? 'Nei. ' : 'Motbud: '}${esc(svar.r.grunn)}${svar.r.motbud ? ` Byrådet tilbyr ${kr(svar.r.motbud.pris)} per døgn.` : ''}</div>`;
      if (svar.r.motbud) h += `<div class="knapperad"><button type="button" data-sp="ba-motbud" data-id="${esc(by.id)}">Godta motbudet</button></div>`; }
    return h + '</div>';
  }
  function fane(L) {
    if (!klar) return null;
    if (valgt !== null && modus !== 'liste') { const i = info(valgt); if (i) return modus === 'forhandle' && forslag ? forhandleHtml(i) : kortHtml(i); modus = 'liste'; }
    return liste(L || []);
  }
  function nyttForslag(id) { const i = info(id); if (!i) return; const t = nesteTrinn(i.b, i.by.id) || 'beskyttelse';
    forslag = { trinn: t, pris: Math.round(BA.grunnpris(t === 'medlem' ? 'handel' : t, i.by.folk) * 1.1 / 1000) * 1000, løfte: 'vanlig', varighet: 14 };
    // (ut8-kr-ro) budkamp: det minste løftet som holder, og en pris under rivalens
    if (t === 'beskyttelse' && BA.budkamp(i.b)) { const sp = BA.tillitSpor(i.b, { holdning: i.leder.holdning }), rv = i.b.forhandler || i.b.rival;
      if (sp.budkamp && sp.budkamp.løfte) forslag.løfte = sp.budkamp.løfte;
      if (rv && rv.pris) forslag.pris = Math.max(1000, Math.min(forslag.pris, Math.round(rv.pris * R.rival.overby / 1000) * 1000)); } }
  function sendLag(id) { const by = finn(id); if (!by) return; let best = null, bd = Infinity;
    for (const s of lag()) { if (s.side !== 'blå' || s.karakter || s.ombord || s.leirvakt || !lever(s)) continue; const d = Math.hypot(s.x - by.x, s.y - by.y); if (d < bd) { bd = d; best = s; } }
    if (!best) { logg('Ingen ledige lag å sende.'); return; }
    if (window.KOMMANDO) { const r = KOMMANDO({ type: 'ordre', lag: KOMMANDO.nid(best), x: by.x, y: by.y }); if (r && r.ok) logg(`${best.navn} er sendt til ${by.navn} (${String(Math.round(bd / 100) / 10).replace('.', ',')} km).`); } }
  // trykk fra selskapspanel.js: knappen med data-sp="ba-…" -> true når den er brukt
  function trykk(knapp) {
    const s = knapp.dataset.sp, id = knapp.dataset.id, v = knapp.dataset.v;
    if (s === 'ba-liste') { modus = 'liste'; valgt = null; svar = null; }
    else if (s === 'ba-kort') { valgt = id; modus = 'kort'; byOppdrag(id); }
    else if (s === 'ba-andre') andreÅpen = !andreÅpen;
    else if (s === 'ba-kontrakter') { if (window.SelskapetSpill && SelskapetSpill.velgFane) SelskapetSpill.velgFane('kontrakter'); }
    else if (s === 'ba-forhandle') { valgt = id; modus = 'forhandle'; nyttForslag(id); svar = null; }
    else if (s === 'ba-trinn' && forslag) { forslag.trinn = v; const i = info(valgt); if (i && v !== 'medlem') forslag.pris = Math.round(BA.grunnpris(v, i.by.folk) * 1.1 / 1000) * 1000; svar = null; }
    else if (s === 'ba-pris' && forslag) { const steg = Math.max(1000, Math.round(forslag.pris * .08 / 1000) * 1000); forslag.pris = Math.max(1000, forslag.pris + (+v) * steg); }
    else if (s === 'ba-løfte' && forslag) forslag.løfte = v;
    else if (s === 'ba-varighet' && forslag) forslag.varighet = +v;
    else if ((s === 'ba-tilbud' || s === 'ba-motbud') && forslag) { if (s === 'ba-motbud' && svar && svar.r.motbud) forslag.pris = svar.r.motbud.pris;
      const r = kom({ type: 'byForhandle', by: id, trinn: forslag.trinn, pris: forslag.pris, løfte: forslag.løfte, varighet: forslag.varighet });
      svar = { by: String(id), r }; if (r.svar === 'ja') modus = 'kort'; }
    else if (s === 'ba-send') sendLag(id);
    else if (s === 'ba-siopp') { if (confirm('Si opp avtalen? Byrådet blir skuffet, og tilliten synker.')) kom({ type: 'bySiOpp', by: id }); }
    else return false;
    return true;
  }

  // ---------- start ----------
  function start() { const s = Sp(); if (!s || !s.leir) return; leirId = Math.round(s.leir.x) + ',' + Math.round(s.leir.y); S = BA.fraJSON(les()); OMR.t = -1e9; klar = true; valgt = null; modus = 'liste'; koble(); }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  setTimeout(koble, 0);
  Object.assign(api, { start, fane, trykk, ringer, timeSteg, døgnSteg, info, område, tillit, endreTillit, forhandle: k => kom({ type: 'byForhandle', ...k }), siOpp: id => kom({ type: 'bySiOpp', by: id }),
    byOppdrag, kontrakterFor, andre: v => { if (v !== undefined) andreÅpen = !!v; return andreÅpen; },
    tilstand: () => S, sett: d => { S = BA.fraJSON(d); lagre(); }, nullstill: () => { S = BA.ny(); lagre(); }, lagre, mannNær, klar: () => klar, velg: (id, m) => { valgt = id; modus = m || 'kort'; if (m === 'forhandle') nyttForslag(id); }, NØKKEL });
  window.ByavtaleSpill = api;
})();
