/* KJEDER – visningen (ut6-kjeder 28. nov, fase Ø9 i docs/plan-selskap-okonomi.md, kapittel 4 og 12). Reglene: spill/kjeder.js,
 * spill/laan.js og spill/avis.js; maskinene selv i spill/produksjon.js (de går i Produksjon.steg som saga – produksjon-visning.js).
 * Her kobles kjedene til spillet:
 *  - PLASSREGLENE i byggelista (Leir.kanByggeEkstra): steinbruddet ved fjell, fiskemottaket ved kai og med fryselageret fra Ytterø Sjømat,
 *    smia ved et verksted.
 *  - KROKER.sim: dieselen fra raffineriet går i leirens tank, oljen hentes fra basen (OLJE.BASER[0], tonn), korn fra byene med handelsavtale
 *    (betales), kjøkkenet lager mat av melet, fiskebåtene leverer fisk til fiskemottaket, riving gir litt skrap, og sesongene
 *    (hogst om vinteren, ved dyrere i kulda) – det som skjer av seg selv, bare når !navigator.webdriver || KjedeSpill.test.
 *  - LÅN: «Bank og lån» i Leir-menyen (fanen Lager); kommandoene laanTa / laanBetal; renten hver morgen. Lagres i «riksbrudd-laan» per leir.
 *  - AVISA: hver morgen en lokalavis (Avis.lag) – en linje i morgenmøtet (MORGEN_LINJER) og dagboka, og «Avisa» i fanen Mål.
 *    Lagres i «riksbrudd-avis» per leir.
 *  - Fanen Produksjon (ProduksjonSpill.html) får «Kjedene»: lageret for de nye varene og hvor de kommer fra.
 *  - Byggelista: gruppen Produksjon får de nye maskinene, med ikoner (Ikoner.legg). 2D-merkene (tallet over maskinen) kommer fra
 *    produksjon-visning.js, formen fra leir2d.js.
 * Alle tallene er Claudes forslag (REGLER i reglene, VIS her).
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.Kjeder || !window.Leir || !window.Produksjon) return;
  const K = window.Kjeder, LB = window.Leir, PR = window.Produksjon, LN = window.Laan, AV = window.Avis;
  const api = { test: false }, auto = () => !navigator.webdriver || api.test;
  // Claudes forslag: lånebeløpene i knappene og hvor mange avisutgaver som huskes
  const VIS = { beløp: [2e6, 5e6, 10e6], betal: 1e6, aviser: 5, loggLinjer: 40 };
  const NYE = ['steinbrudd', 'steinknuser', 'betongblander', 'fiskemottak', 'mølle', 'raffineri', 'smie'];
  const KVARER = [['stein', 'Stein'], ['pukk', 'Pukk'], ['sement', 'Sement'], ['skrap', 'Skrap'], ['deler', 'Deler'], ['fisk', 'Fisk'], ['frossenfisk', 'Frossen fisk'], ['korn', 'Korn'], ['mel', 'Mel'], ['olje', 'Råolje']];
  const L = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const Sp = () => (window.OppstartSpill ? OppstartSpill.tilstand() : null);
  const leirId = () => { const s = Sp(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  const nå = () => (typeof tid !== 'undefined' ? tid : 0), dagNå = () => Math.floor(nå() / 1440) + 1;
  const årstid = () => (window.VAER && VAER.årstid) || 'sommer';
  const kr = v => (LB.kroner ? LB.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const mill = v => (Math.round(v / 1e5) / 10).toString().replace('.', ',') + ' mill. kr';
  const nf = (v, d = 1) => (Math.round((v || 0) * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // (ut10-fabrikkbygg) et industribygg tatt i bruk som fabrikk (fb_fiskemottak …) teller som maskinen det har
  const er = (b, t) => b.type === t || (LB.BYGG[b.type] && LB.BYGG[b.type].fabrikkbygg && LB.BYGG[b.type].maskinType === t);
  const har = (l, t) => !!(l && l.bygg.some(b => er(b, t) && LB.virker(b)));
  const finnes = (l, t) => !!(l && l.bygg.some(b => er(b, t)));
  const skriv = (n, v) => { try { localStorage.setItem(n, JSON.stringify(v)); } catch (e) { /* fullt eller sperret */ } };
  const lesN = n => { try { return JSON.parse(localStorage.getItem(n) || 'null'); } catch (e) { return null; } };

  // ---------- tilstanden: lån og avis per leir ----------
  let id = '', LS = LN ? LN.ny() : null, A = { versjon: 1, utgaver: [], sistDag: 0, renteDag: 0, kornT: 0 }, sist = { korn: 0, diesel: 0, olje: 0, mat: 0, fisk: 0, skrap: 0 };
  function les() { const n = leirId(); if (n === id) return; id = n; LS = LN ? LN.ny() : null; A = { versjon: 1, utgaver: [], sistDag: dagNå(), renteDag: dagNå(), kornT: 0 };
    const d = lesN('riksbrudd-laan'); if (d && d.leir === n && LN) LS = LN.fraJSON(d.S);
    const a = lesN('riksbrudd-avis'); if (a && a.leir === n && Array.isArray(a.utgaver)) A = { versjon: 1, utgaver: a.utgaver.slice(0, VIS.aviser), sistDag: +a.sistDag || dagNå(), renteDag: +a.renteDag || dagNå(), kornT: 0 };
    if (LS) for (const l of LS.lån) l.sistDag = Math.min(l.sistDag, Math.max(l.start, dagNå())); }
  function lagre() { if (!id) return; if (LS) skriv('riksbrudd-laan', { leir: id, S: LS }); skriv('riksbrudd-avis', { leir: id, utgaver: A.utgaver, sistDag: A.sistDag, renteDag: A.renteDag }); }

  // ---------- plassreglene ----------
  function plassCtx(l, v = {}) {
    const høyde = v.høyde || (typeof hoydeVed === 'function' ? (x, y) => { const z = hoydeVed(x, y); return Number.isFinite(z) ? z : null; } : null);
    const kai = window.KaierSpill && KaierSpill.nær ? (x, y, r) => KaierSpill.nær(x, y, r) : null;
    let fryselager; try { if (window.FirmaSpill && FirmaSpill.tilstand) { const F = FirmaSpill.tilstand(); fryselager = !!(F && F.tekno && F.tekno.fryselager); } } catch (e) { fryselager = undefined; }
    return { høyde, kai, fryselager, harVerksted: !!(l && l.bygg.some(b => b.type === 'verksted' && LB.ferdig(b))) };
  }
  LB.kanByggeEkstra = (l, b, v) => (NYE.includes(b.type) ? K.plassFeil(b.type, b, plassCtx(l, v)) : null);
  // varene i de nye kjedene vises i Leir → Lager bare når dere har noe av dem eller en maskin som bruker eller lager dem
  LB.visMateriale = (l, k) => !!l && (((l.lager && l.lager[k]) || 0) > .05 || l.bygg.some(b => { const M = PR.REGLER.maskiner[b.type]; return M && NYE.includes(b.type) && (M.inn.some(r => k in r) || k in M.ut); }));
  // eksporten kan be om varene leiren lager (spill/eksport.js)
  const ekstraVarer = () => { const l = L(); if (!l) return []; const v = []; if (finnes(l, 'fiskemottak')) v.push('frossenfisk'); if (finnes(l, 'mølle')) v.push('mel'); if (finnes(l, 'steinknuser')) v.push('pukk'); if (finnes(l, 'smie')) v.push('deler'); return v; };

  // ---------- sesongene: veden i markedet ----------
  function sesongPå() { const Mk = window.Spillet && Spillet.Marked; if (!Mk) return; Mk.sesong = v => (v === 'ved' && auto() ? K.sesong('ved', årstid()) : 1); }

  // ---------- innpakningene: fiske, hogst og riving ----------
  function pakkInn() {
    // FISKET: med et fiskemottak som virker, går fangsten fra båtene dit som fisk (tonn) – ellers rasjoner som før
    if (window.Sjo && !Sjo.fangst.kjede) { const f0 = Sjo.fangst; Sjo.fangst = function (b, dt, v) { const r = f0.apply(this, arguments); if (!(r > 0) || !auto()) return r;
      const l = L(); if (!har(l, 'fiskemottak')) return r; const t = K.fiskFraFangst(r, v && v.årstid), lagt = LB.leggInn(l, 'fisk', t); sist.fisk += lagt; return lagt >= t - 1e-9 ? 0 : r * (1 - lagt / t); }; Sjo.fangst.kjede = true; }
    // HOGST om vinteren raskere (frossen mark), om våren tregere; RIVING gir litt skrap i tillegg
    if (window.Ressurser && !Ressurser.steg.kjede) { const s0 = Ressurser.steg; Ressurser.steg = function (R, dt, ctx) {
      const c = auto() && ctx && ctx.tempo ? { ...ctx, tempo: o => ctx.tempo(o) * (o === 'hogst' ? K.sesong('hogst', årstid()) : 1) } : ctx;
      const hend = s0.call(this, R, dt, c);
      if (auto()) { const l = L(); for (const h of hend || []) if (h.hva === 'levert' && h.jobb && h.jobb.type === 'riving' && h.mat && h.mat.stål > 0 && l) sist.skrap += LB.leggInn(l, 'skrap', K.skrapFraRiving(h.mat.stål)); }
      return hend; }; Ressurser.steg.kjede = true; }
  }

  // ---------- pukk til grusvegen (Leir.BYGG.veg): egen pukk gjør vegen billigere ----------
  function pakkVeg() {
    if (LB.bygg.kjede) return; const b0 = LB.bygg;
    LB.bygg = function (l, b) { const r = b0.apply(this, arguments);
      try { if (r && r.bygg && b && LB.BYGG[b.type] && LB.BYGG[b.type].veg && l && (l.lager.pukk || 0) > .01 && Array.isArray(r.bygg.punkter)) {
        const P = r.bygg.punkter; let m = 0; for (let i = 1; i < P.length; i++) m += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
        const q = K.vegPukk(m, l.lager.pukk); if (q.pukk > 0) { l.lager.pukk -= q.pukk; r.bygg.pris = Math.max(0, (r.bygg.pris || 0) - q.kr); r.pukk = q;
          if (window.OppstartSpill) OppstartSpill.gi(q.kr); if (typeof logg === 'function') logg(`Vegen bruker ${nf(q.pukk)} m³ egen pukk – ${kr(q.kr)} billigere.`); } } } catch (e) { /* vegen er bygget som før */ }
      return r; };
    LB.bygg.kjede = true;
  }

  // ---------- simuleringen ----------
  let sistLagret = 0;
  function simSteg(dt) {
    const l = L(); if (!l || !(dt > 0)) return; les();
    // dieselen fra raffineriet: fra lageret (og utmatingen når folk bærer) til tanken
    if (finnes(l, 'raffineri')) {
      const Mt = window.BaeringSpill && BaeringSpill.aktiv && BaeringSpill.aktiv() ? BaeringSpill.mating() : null;
      if (Mt) for (const b of l.bygg) if (b.type === 'raffineri' && Mt[b.id] && Mt[b.id].ut.diesel > 0) { l.lager.diesel = (l.lager.diesel || 0) + Mt[b.id].ut.diesel; Mt[b.id].ut.diesel = 0; }
      sist.diesel += K.dieselTilTank(l, LB.kapasitet(l));
      // oljen fra basen (tonn) – basen er flyttet til leiren i oppstarten
      const B = window.OLJE && OLJE.BASER && OLJE.BASER[0];
      if (B && auto()) { const t = K.oljeTilLeir(B.beholdning, l.lager.olje, LB.lagerplass(l) - (l.lager.olje || 0)); if (t > .01) { B.beholdning -= t; l.lager.olje = (l.lager.olje || 0) + t; sist.olje += t; } }
    }
    if (!auto()) return;
    // korn fra byene dere har handelsavtale med (bare når leiren har en mølle) – betales med en gang
    if (finnes(l, 'mølle')) { const n = handelsByer().length, k = K.korn(n, dt / 60, l.lager.korn, årstid());
      if (k.tonn > 1e-6 && window.OppstartSpill && OppstartSpill.betal(k.kr)) { LB.leggInn(l, 'korn', k.tonn); sist.korn += k.tonn; } }
    // kjøkkenet lager mat av melet når maten holder på å ta slutt
    if ((l.lager.mel || 0) > .01 && window.FolkSpill && window.FolkRegler) { try {
      const F = FolkSpill.tilstand(), B = FolkRegler.behov(F, l, { årstid: årstid() }), sp = F.personer.length * (FolkRegler.R.rasjon || 1);
      const m = K.melTilMat(l.lager.mel, F.mat, sp, B.varmMat ? B.kjøkken : 0, dt / 60); if (m.mel > 0) { l.lager.mel -= m.mel; F.mat += m.rasjoner; sist.mat += m.rasjoner; } } catch (e) { /* folk ikke klare */ } }
    // morgenen: renter og avis
    const d = dagNå(); if (d > A.renteDag) morgen();
    if (performance.now() - sistLagret > 5000) { sistLagret = performance.now(); lagre(); }
  }
  if (typeof KROKER !== 'undefined') KROKER.sim.push(simSteg);

  // byene dere har handel eller medlemskap med: [{ id, navn }]
  function handelsByer() {
    const S = window.ByavtaleSpill && ByavtaleSpill.tilstand ? ByavtaleSpill.tilstand() : null; if (!S || !S.byer) return [];
    return Object.entries(S.byer).filter(([, b]) => b && b.avtale && (b.avtale.trinn === 'handel' || b.avtale.trinn === 'medlem'))
      .map(([bid]) => { let navn = 'byen'; try { const i = ByavtaleSpill.info(bid); if (i && i.by && i.by.navn) navn = i.by.navn; } catch (e) { /* */ } return { id: bid, navn }; });
  }

  // ---------- morgenen: renter og avis ----------
  function morgen(tving) {
    les(); const d = dagNå(); if (!tving && d <= A.renteDag) return null; A.renteDag = d;
    let r = null; if (LS) { r = LN.døgn(LS, d);
      for (const l of r.forfalt) logg(l.kilde === 'hai' ? `Lånehaien vil ha pengene sine: fristen er gått ut, og renten er doblet (${mill(l.gjeld)}).` : `Banklånet i ${l.byNavn || 'byen'} er over fristen: renten er doblet, og banken låner ikke mer før det er betalt.`);
      if (r.forfalt.some(l => l.kilde === 'hai') && window.Selskap && window.SelskapSpill) try { if (Selskap.endreRykte && SelskapSpill.tilstand) Selskap.endreRykte(SelskapSpill.tilstand(), 'blå', { pålitelig: -3 }); } catch (e) { /* */ } }
    const a = lagAvis(d, r); A.sistDag = d; lagre(); return { renter: r, avis: a };
  }

  // ---------- avisa ----------
  // loggen: de siste linjene (til avisas ulykker og angrep)
  const LOGG = [];
  function pakkLogg() { if (typeof window.logg !== 'function' || window.logg.kjede) return; const l0 = window.logg;
    window.logg = function (t) { try { LOGG.push({ t: nå(), s: String(t) }); if (LOGG.length > VIS.loggLinjer) LOGG.shift(); } catch (e) { /* */ } return l0.apply(this, arguments); }; window.logg.kjede = true; }
  function saker(d, renter) {
    const S = [], l = L();
    try { const M = window.SpilletSpill && SpilletSpill.M ? SpilletSpill.M() : null; if (M && window.Spillet) { const t = Spillet.Marked.tekst(M); if (!/små endringer/.test(t)) S.push({ slag: 'marked', tekst: t }); } } catch (e) { /* */ }
    try { const n = handelsByer(); if (n.length) S.push({ slag: 'by', tekst: n.length === 1 ? `${n[0].navn} handler med dere – gårdene selger korn og varer` : `${n.length} byer handler med dere` }); } catch (e) { /* */ }
    try { if (window.BorsSpill && BorsSpill.klar && BorsSpill.klar()) { const B = BorsSpill.tilstand(), k = BorsSpill.kurser(); if (B && B.meg && B.meg.notert) S.push({ slag: 'børs', tekst: `kursen deres står i ${kr(k.meg)}` + (B.meg.stemning >= 1.05 ? ' – det er god stemning' : B.meg.stemning <= .95 ? ' – investorene er urolige' : '') }); } } catch (e) { /* */ }
    try { const SS = window.SelskapSpill && SelskapSpill.tilstand ? SelskapSpill.tilstand() : null, r = SS && SS.sider && SS.sider.blå ? SS.sider.blå.rykte || SS.sider.blå : null; if (r && window.Selskap && Number.isFinite(r.pålitelig)) S.push({ slag: 'rykte', tekst: Selskap.rykteTekst(r) }); } catch (e) { /* */ }
    for (const s of AV.fraLogg(LOGG.filter(q => q.t > nå() - 1440).map(q => q.s))) S.push(s);
    const P = window.ProduksjonSpill && ProduksjonSpill.tilstand ? ProduksjonSpill.tilstand() : null;
    if (sist.diesel > 1) S.push({ slag: 'produksjon', tekst: `raffineriet ved leiren fylte ${nf(sist.diesel, 0)} l diesel på tanken` });
    if (sist.korn > .05) S.push({ slag: 'by', tekst: `gårdene solgte ${nf(sist.korn)} t korn til mølla` });
    if (sist.fisk > .05) S.push({ slag: 'produksjon', tekst: `fiskebåtene leverte ${nf(sist.fisk)} t fisk til mottaket` });
    if (P && l) { const st = Object.values(P.status || {}).filter(s => NYE.includes(s.type) && s.går); if (st.length) S.push({ slag: 'produksjon', tekst: `${st.length === 1 ? LB.BYGG[st[0].type].navn : st.length + ' maskiner'} går for fullt i leiren` }); }
    if (renter && renter.renter > 0) S.push({ slag: 'lån', tekst: `renten kostet dere ${kr(renter.renter)} i natt – gjelden er ${mill(LN.gjeld(LS))}` });
    const å = årstid(); if (å === 'vinter') S.push({ slag: 'vær', tekst: 'kulda biter – veden er dyr, men skogen er lett å hogge på frossen mark' });
    else if (å === 'høst') S.push({ slag: 'vær', tekst: 'høstfisket er i gang langs kysten' });
    return S;
  }
  function lagAvis(d, renter) {
    if (!AV) return null; const a = AV.lag(saker(d, renter), d, id);
    A.utgaver.unshift(a); A.utgaver.length = Math.min(A.utgaver.length, VIS.aviser);
    sist = { korn: 0, diesel: 0, olje: 0, mat: 0, fisk: 0, skrap: 0 };
    if (auto() && window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(AV.linje(a));
    return a;
  }
  // morgenmøtet får avisas tittel
  (window.MORGEN_LINJER = window.MORGEN_LINJER || []).push(() => (A.utgaver[0] && A.utgaver[0].dag === dagNå() ? AV.linje(A.utgaver[0]) : null));

  // ---------- kommandoene ----------
  function registrer() {
    if (!window.Kommando || registrer.ferdig || !LN) return; registrer.ferdig = true;
    Kommando.registrer('laanTa', { leir: true,
      sjekk: k => (k.kilde !== 'bank' && k.kilde !== 'hai' ? 'Ukjent långiver.' : !(k.beløp > 0) ? 'Ugyldig beløp.' : null),
      utfør: k => { les(); const S = Sp(), r = LN.ta(LS, { kilde: k.kilde, by: k.by, beløp: k.beløp, dag: dagNå() }, handelsByer(), S ? S.penger : 0); if (r.feil) return r;
        if (window.OppstartSpill) OppstartSpill.gi(r.lån.gjeld); lagre(); return { lån: r.lån }; },
      beskriv: k => (k.kilde === 'hai' ? 'låner hos lånehaien' : 'låner i banken') });
    Kommando.registrer('laanBetal', { leir: true,
      sjekk: k => { les(); return !LS.lån.some(l => l.id === k.id) ? 'Fant ikke lånet.' : !(k.kr > 0) ? 'Ugyldig beløp.' : null; },
      utfør: k => { const l = LS.lån.find(q => q.id === k.id), b = Math.min(k.kr, l.gjeld); if (!(window.OppstartSpill && OppstartSpill.betal(b))) return { feil: `Dere har ikke ${kr(b)} i kassa.` };
        const r = LN.betal(LS, k.id, b); lagre(); return r; },
      beskriv: () => 'betaler ned et lån' });
  }
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; if (!r.ok && r.feil && typeof logg === 'function') logg(r.feil); return r; };

  // ---------- Leir-menyen: Bank og lån (fanen Lager) og Avisa (fanen Mål) ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => {
    if (!LN || !L()) return; les(); registrer(); const S = Sp(), d = dagNå();
    hode.appendChild(el('h3', { 'data-fane': 'lager' }, 'Bank og lån'));
    for (const l of LS.lån) {
      const igjen = l.frist - d, txt = `${l.kilde === 'hai' ? 'Lånehaien' : 'Banken i ' + (l.byNavn || 'byen')}: ${mill(l.gjeld)} · ${kr(LN.perDøgn(l, d))} i rente i døgnet · ${igjen >= 0 ? `frist om ${igjen} døgn` : 'OVER FRISTEN'}`;
      hode.appendChild(el('div', { klasse: 'mat kjedelaan' }, el('span', {}, txt),
        knapp(`Betal ${mill(Math.min(VIS.betal, l.gjeld))}`, () => { const r = kom({ type: 'laanBetal', id: l.id, kr: Math.min(VIS.betal, l.gjeld) }); if (r.ok) logg(r.svar.ferdig ? 'Lånet er betalt.' : `Betalt. Igjen: ${mill(r.svar.igjen)}.`); }),
        knapp('Betal alt', () => { const r = kom({ type: 'laanBetal', id: l.id, kr: l.gjeld }); if (r.ok) logg('Lånet er betalt.'); }, { klasse: 'selg' })));
    }
    const T = LN.tilbud(LS, handelsByer(), S ? S.penger : 0);
    for (const t of T) {
      const navn = t.kilde === 'hai' ? 'Lånehaien' : `Banken i ${t.byNavn}`, info = `${navn}: ${nf(t.rente * 100, 1)} % rente i døgnet, ${t.frist} døgn` + (t.grunn ? ` – ${t.grunn}` : ` (høyst ${mill(t.maks)})`);
      const rad = el('div', { klasse: 'mat kjedelaan' }, el('span', {}, info));
      for (const b of VIS.beløp) { const kn = knapp(`Lån ${mill(b)}`, () => { const r = kom({ type: 'laanTa', kilde: t.kilde, by: t.by, beløp: b }); if (r.ok) logg(`${navn} lånte dere ${mill(b)}. Renten er ${nf(t.rente * 100, 1)} % i døgnet.`); }); kn.disabled = !!t.grunn || b > t.maks; rad.appendChild(kn); }
      hode.appendChild(rad);
    }
    if (!T.some(t => t.kilde === 'bank')) hode.appendChild(el('small', { klasse: 'kjedetips' }, 'Banken låner bare til dem som har handelsavtale med byen (Selskapet → Byer). Lånehaien sier alltid ja – men renten er høy.'));
    if (A.utgaver.length) { const a = A.utgaver[0]; hode.appendChild(el('h3', { 'data-fane': 'mål' }, `Avisa – ${a.navn}, dag ${a.dag}`));
      hode.appendChild(el('div', { klasse: 'dagbok avis' }, el('b', {}, a.tittel)));
      for (const t of a.linjer) hode.appendChild(el('div', { klasse: 'dagbok' }, t)); }
  });

  // ---------- fanen Produksjon: kjedene ----------
  function kjedeHtml() {
    const l = L(); if (!l) return ''; const vis = KVARER.filter(([v]) => LB.visMateriale(l, v)), maskiner = NYE.filter(t => finnes(l, t));
    let h = '<h3>Kjedene</h3><p class="rolig" style="font-size:13px">Steinbrudd og steinknuser gir pukk (og betong med sement). Fiskemottaket fryser fisken fra båtene. Mølla maler korn fra byene dere handler med. Raffineriet gjør olje fra basen om til diesel. Smia gjør skrap fra riving om til stål og deler.</p>';
    if (!maskiner.length && !vis.length) return h + '<p class="rolig" style="font-size:13px">Bygg en av maskinene i Leir → Bygg (gruppen Produksjon).</p>';
    const plass = LB.lagerplass(l); h += '<ul class="tall">' + vis.map(([v, n]) => `<li><span>${n}</span><b>${nf(l.lager[v] || 0, 1)} av ${plass} ${LB.MATERIALER[v].enhet}</b></li>`).join('');
    if (finnes(l, 'mølle')) { const n = handelsByer().length; h += `<li><span>Korn fra byene</span><b>${n ? `${nf(n * K.REGLER.korn.perBy * (K.REGLER.korn.årstid[årstid()] || 1), 1)} t i døgnet` : 'ingen avtaler'}<small>${n ? `${n} by${n > 1 ? 'er' : ''} med handelsavtale · ${kr(K.REGLER.korn.pris)} per tonn` : 'Gå i handel med en by (Selskapet → Byer), eller kjøp korn i Leir → Lager.'}</small></b></li>`; }
    if (finnes(l, 'raffineri')) { const B = window.OLJE && OLJE.BASER && OLJE.BASER[0]; h += `<li><span>Olje på basen</span><b>${B ? nf(B.beholdning, 1) + ' t' : '–'}<small>Raffineriet henter olje selv. Dieselen går rett i tanken (${nf(l.drivstoff || 0, 0)} av ${nf(LB.kapasitet(l), 0)} l).</small></b></li>`; }
    if (finnes(l, 'fiskemottak')) h += '<li><span>Fisk</span><b>fra båtene<small>Båter som fisker, leverer fisken hit i stedet for rasjoner. Fisket er best om høsten.</small></b></li>';
    return h + '</ul>';
  }
  function pakkProduksjon() { const P = window.ProduksjonSpill; if (!P || P.html.kjede) return; const h0 = P.html; P.html = function () { return h0.apply(this, arguments) + kjedeHtml(); }; P.html.kjede = true; }

  // ---------- byggelista og ikonene ----------
  const I = { brudd: "<path d='M3 20l6-12 4 5 3-6 5 13z'/><path d='M9 20l2-4 2 4'/>", knuser: "<path d='M5 4h14l-4 7H9z'/><path d='M10 11v5h4v-5M8 20h8'/>",
    blander: "<path d='M5 9l12-3 2 8-12 3z'/><path d='M7 17l-2 3m12-6l2 6'/>", fisk: "<path d='M3 12c4-5 10-5 14 0-4 5-10 5-14 0z'/><path d='M17 12l4-3v6z'/><circle cx='8' cy='11' r='.5'/>",
    molle: "<path d='M12 3v18M3 12h18M6 6l12 12M18 6L6 18'/>", raff: "<rect x='4' y='9' width='8' height='12' rx='3'/><path d='M16 21V5h3v16M17.5 4c-1-1.5 1-2 0-3'/>",
    smie: "<path d='M4 10h12l-2 4H8z'/><path d='M10 14v5M7 19h6M17 6l3-3'/>" };
  const IB = { steinbrudd: 'brudd', steinknuser: 'knuser', betongblander: 'blander', fiskemottak: 'fisk', mølle: 'molle', raffineri: 'raff', smie: 'smie' };
  { const url = s => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${s}</svg>`)}")`;
    const css = document.createElement('style'); css.textContent = Object.entries(I).map(([n, s]) => `[data-ikon="${n}"]{ --ik:${url(s)}; }`).join('\n')
      + '\n#leirmeny .kjedelaan span{ flex:1 1 100%; font-size:13px; } #leirmeny .kjedelaan{ flex-wrap:wrap; gap:4px; } #leirmeny .kjedetips{ display:block; color:var(--ink-dim); font-size:12.5px; margin:4px 0; } #leirmeny .dagbok.avis b{ font-size:14.5px; }';
    document.head.appendChild(css); }
  function oppsett() {
    if (window.Ikoner && Ikoner.legg) Ikoner.legg(I, IB); else if (window.Ikoner && Ikoner.BYGG) Object.assign(Ikoner.BYGG, IB);
    const G = window.LEIR2_GRUPPER; if (Array.isArray(G)) { let g = G.find(q => q[0] === 'Produksjon'); if (!g) { g = ['Produksjon', []]; G.push(g); } for (const t of NYE) if (!g[1].includes(t)) g[1].push(t); }
    if (window.Eksport) Eksport.ekstraVarer = ekstraVarer;
    pakkInn(); pakkLogg(); sesongPå(); pakkProduksjon(); pakkVeg(); registrer();
  }
  window.addEventListener('riksbrudd-spill', () => { id = ''; les(); oppsett(); });
  window.addEventListener('load', () => setTimeout(oppsett, 0));
  window.addEventListener('pagehide', lagre);

  Object.assign(api, { VIS, NYE, oppsett, morgen, lagAvis: () => lagAvis(dagNå(), null), avis: () => A.utgaver[0] || null, lån: () => LS, sett: S => { LS = LN.fraJSON(S); lagre(); },
    handelsByer, plassCtx, steg: simSteg, html: kjedeHtml, lagre, les: () => { id = ''; les(); }, sist: () => sist,
    // for vakta: tilbake til et tomt lån og ingen aviser
    nullstill: () => { LS = LN ? LN.ny() : null; A.utgaver = []; lagre(); } });
  window.KjedeSpill = api;
})();
