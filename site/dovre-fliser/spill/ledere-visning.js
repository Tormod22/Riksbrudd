'use strict';
// FORMENN OG LEDERE i spillet (28. nov, pakke «ledere», fase G5; reglene: spill/ledere.js). Lastes etter rekruttering-visning.js.
//  - Delen «Ledere» i Folk-panelet (FolkSpill kaller LedereSpill.del): de fem rollene, hvem som har dem, dyktighet, reglene (enkle
//    valg), siste beslutninger, «Utnevn», «Ta over selv» og «Jeg styrer selv i dag».
//  - Lederne ser over sakene sine hvert 20. spillminutt (KROKER.sim) og handler gjennom KOMMANDO, som spilleren:
//    kjøpMat, kjøpDiesel, kjøpMateriale + byggPlan (leirsjef), jobbLås / folk (formann), byForhandle / firmaSamarbeid (forhandler),
//    ordre / strid (troppsjef). Kassereren sjekker kjøpene (sjekk-funksjonen til kjøpskommandoene pakkes inn) og stopper det som
//    ville tatt kassa under minimum.
//  - I testene (navigator.webdriver) gjør lederne ingenting før LedereSpill.test = true (det skjer ikke av seg selv uansett: en leder
//    finnes bare når spilleren har utnevnt en). Lokkingen fra rivalene skjer bare i ekte spill.
//  - Lagres per leir i «riksbrudd-ledere» ({ leir: 'x,y', S }). Lønna står på personen (p.lønn, som rekrutteringen).
(function () {
  const LR = window.Ledere, FR = window.FolkRegler; if (!LR || !FR) return;
  const NØKKEL = 'riksbrudd-ledere', VIS = 'riksbrudd-ledervis';
  let S = LR.ny(), leirNøkkel = '', velger = null, åpen = false, akk = 0, sistDag = null;
  try { åpen = localStorage.getItem(VIS) === '1'; } catch (e) { /* uten lager */ }
  const api = { test: false };
  const aktiv = () => !navigator.webdriver || api.test === true;
  const nåTid = () => (typeof tid !== 'undefined' ? tid : 0);
  const Fo = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const Lr = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const Sp = () => (window.OppstartSpill ? OppstartSpill.tilstand() : null);
  const LB = () => window.Leir;
  const kr = n => (LB() ? LB().kroner(n) : Math.round(n) + ' kr');
  const mill = v => LR.des(v / 1e6, 1) + ' mill.';
  const melde = t => { if (typeof logg === 'function') logg(t); };
  const nøkkel = () => { const s = Sp(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  const rng = () => LR.rng(S);

  // ---------- lagring ----------
  function lagre() { if (!leirNøkkel) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirNøkkel, S })); } catch (e) { /* fullt eller sperret */ } }
  function les() {
    leirNøkkel = nøkkel(); S = LR.ny();
    try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (o && o.leir === leirNøkkel) S = LR.fraJSON(o.S); } catch (e) { S = LR.ny(); }
    sistDag = null;
  }
  window.addEventListener('riksbrudd-spill', les);

  // ---------- personene ----------
  const lag = () => (typeof ENHETER !== 'undefined' ? ENHETER : []);
  const lever = s => (typeof levende === 'function' ? levende(s) : true);
  const tropper = () => lag().filter(s => s && s.side === 'blå' && !s.karakter && !s.leirvakt && Array.isArray(s.menn) && s.menn.length && lever(s));
  const finnLag = navn => tropper().find(s => s.navn === navn) || null;
  // personposten for en rolle: folket i leiren, eller (troppsjef) mannen i troppen (m.person når den finnes – der står lønna)
  function person(rolle, del, id) {
    if (rolle === 'troppsjef') { const s = finnLag(del); if (!s) return null; const m = s.menn.find(q => q.navn === id && q.hp > 0); return m ? (m.person || m) : null; }
    const F = Fo(); return F ? F.personer.find(p => p.id === id) || null : null;
  }
  const maskinTyper = () => (window.Produksjon && Produksjon.REGLER && Produksjon.REGLER.maskiner ? Object.keys(Produksjon.REGLER.maskiner) : ['sagbruk', 'vedkløyver', 'fyrkjele']);
  const maskiner = () => { const L = Lr(); return L ? L.bygg.filter(b => maskinTyper().includes(b.type)) : []; };
  const status = bid => (window.ProduksjonSpill && ProduksjonSpill.siste ? (ProduksjonSpill.siste().status || {})[bid] : null) || null;

  // ---------- kommandoene ----------
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    LR.registrerKommandoer(Kommando, { tilstand: side => (side === 'blå' && leirNøkkel ? S : null), person: (side, rolle, del, id) => person(rolle, del, id), tid: nåTid,
      endret: () => { lagre(); if (window.FolkSpill) FolkSpill.vis(); } });
    pakkKasse();
  }
  document.addEventListener('DOMContentLoaded', registrer); setTimeout(registrer, 0);
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; return r; };
  // lederens egen kommando: kassereren sjekker den som spillerens (sjekk-funksjonen er pakket inn), men meldingen skrives av lederen
  let stille = 0;
  const komStille = k => { stille++; try { return kom(k); } finally { stille--; } };

  // ---------- kassereren ----------
  const leder = k => S.ledere[k] || null;
  const iArbeid = A => LR.iArbeid(S, A, nåTid());
  const kasserer = () => { const A = leder('kasserer'); return A && iArbeid(A) && aktiv() ? A : null; };
  // hva en kjøpskommando koster (kr), eller 0 når den ikke koster noe kasseren bryr seg om
  function prisFor(k) {
    const L = Lr(), B = LB(); if (!B) return 0;
    try {
      if (k.type === 'kjøpMat') { const f = window.FolkSpill && FolkSpill.matFaktor ? FolkSpill.matFaktor() : 1; return Math.round((+k.rasjoner || 0) * FR.R.matPris * (f > 0 ? f : 1)); }
      if (k.type === 'kjøpDiesel') return Math.round((+k.liter || 0) * B.DRIVSTOFF.prisPerLiter);
      if (k.type === 'kjøpMateriale') return Math.round((+k.mengde || 0) * ((B.MATERIALER[k.materiale] || {}).pris || 0));
      if (k.type === 'bygg' && k.bygg && B.BYGG[k.bygg.type]) { const T = B.BYGG[k.bygg.type], q = B.kostnad(k.bygg.type, T.linje && k.bygg.punkter ? B.lengde(k.bygg.punkter, k.bygg.lukket) : 0); return q ? q.pris : 0; }
      if (k.type === 'byggPlan' && L) return (L.plan || []).filter(a => !k.pids || k.pids.includes(a.pid)).reduce((s, a) => { const T = B.BYGG[a.type], q = T && B.kostnad(a.type, T.linje ? B.lengde(a.punkter, a.lukket) : 0); return s + (q ? q.pris : 0); }, 0);
      if (k.type === 'ansett' && window.Rekruttering) return Rekruttering.REGLER.utstyr;
    } catch (e) { return 0; }
    return 0;
  }
  // Får kjøpet gå? Gir null (ja) eller teksten som stopper det. Et dårlig valg slipper kjøpet gjennom (står i lederens liste).
  function kassaSjekk(pris, hva) {
    const A = kasserer(); if (!A || !(pris > 0)) return null; const s = Sp(), penger = s ? s.penger : 0;
    const v = LR.kassaValg(penger, pris, A.regler, A.ledelse, rng());
    if (v.ok) { if (v.dårlig) LR.notér(S, nåTid(), 'kasserer', `${LR.tittel(A)} slapp gjennom ${hva} for ${kr(pris)} selv om kassa gikk under ${mill(A.regler.minimum)} kr.`, true); return null; }
    const t = `${LR.tittel(A)} stopper kjøpet: kassa skal ha minst ${mill(A.regler.minimum)} kr (nå ${mill(penger)}, ${hva} koster ${kr(pris)}).`;
    LR.notér(S, nåTid(), 'kasserer', t); lagre(); return t;
  }
  // kjøpene kassereren passer på. Mat og diesel stoppes aldri (folk må spise, og strømmen holder leiren i gang) – Claudes valg.
  const KJØP = { kjøpMateriale: 'materialene', bygg: 'bygget', byggPlan: 'bygget', ansett: 'ansettelsen' };
  function pakkKasse() {
    if (!window.Kommando || !Kommando.def) return;
    for (const [type, hva] of Object.entries(KJØP)) { const d = Kommando.def(type); if (!d || d.lederPakket) continue; const før = d.sjekk;
      d.sjekk = (k, c, s) => { const f = før ? før(k, c, s) : null; if (f) return f; if (c && c.spiller) return null; return kassaSjekk(prisFor(k), hva); };
      d.lederPakket = true; }
  }
  // Kan det betales utbytte nå (for børsen, Ø7)? kr = summen. Gir { ok, grunn }; uten kasserer: alltid ok.
  function utbytte(sum) { const A = leder('kasserer'); if (!A || !iArbeid(A)) return { ok: true, grunn: '' }; const s = Sp(); return LR.utbytteLov(A.regler, ukeResultat(), s ? s.penger : 0, sum); }
  function ukeResultat() { const D = S.uke && Array.isArray(S.uke.kassa) ? S.uke.kassa : []; const s = Sp(); if (!s || D.length < 2) return null; return { resultat: s.penger - D[0], døgn: D.length }; }

  // ---------- lederne handler ----------
  const sist = (n, minutter) => { const t = S.sist[n]; return t != null && nåTid() >= t && nåTid() - t < minutter; };
  const merk = n => { S.sist[n] = Math.round(nåTid()); };
  function viktig(A, tekst) { LR.notér(S, nåTid(), A.rolle, tekst, true); melde(tekst); }
  function vanlig(A, tekst) { LR.notér(S, nåTid(), A.rolle, tekst); }
  const døgnTekst = d => (d < .95 ? 'under 1 døgn' : d < 1.5 ? '1 døgn' : `${Math.floor(d)} døgn`);

  function leirsjef(A) {
    const F = Fo(), L = Lr(), B0 = LB(); if (!F || !L || !B0 || !F.personer.length) return;
    let valg = {}; try { valg = window.FolkSpill && FolkSpill.valg ? FolkSpill.valg() : {}; } catch (e) { valg = {}; }
    const B = FR.behov(F, L, valg);
    // maten
    if (!sist('mat', 120)) { const v = LR.matValg({ mat: F.mat, forbruk: B.spiser - B.drivhus }, A.regler, A.ledelse, rng());
      if (v) { merk('mat'); const r = komStille({ type: 'kjøpMat', rasjoner: v.rasjoner });
        if (r.ok) viktig(A, `${LR.tittel(A)} kjøpte ${v.rasjoner} rasjoner – maten rakk ${døgnTekst(v.dagerFør)}.` + (v.dårlig ? ' (Litt for lite.)' : ''));
        else viktig(A, `${LR.tittel(A)} fikk ikke kjøpt mat: ${r.feil}`); } }
    // dieselen til strømmen
    if (!sist('diesel', 120)) { const dr = B0.dieselRekker(L), plass = Math.max(0, B0.kapasitet(L) - (L.drivstoff || 0));
      const v = LR.dieselValg({ liter: L.drivstoff || 0, perDøgn: dr.perDøgn, plass }, A.regler, A.ledelse, rng());
      if (v) { merk('diesel'); const r = komStille({ type: 'kjøpDiesel', liter: v.liter });
        if (r.ok) viktig(A, `${LR.tittel(A)} kjøpte ${v.liter} liter diesel – den rakk ${døgnTekst(v.dagerFør)}.`);
        else viktig(A, `${LR.tittel(A)} fikk ikke kjøpt diesel: ${r.feil}`); } }
    // planen
    if (!sist('bygg', 60) && (L.plan || []).length) {
      const plan = L.plan.map(a => { const T = B0.BYGG[a.type], q = T && B0.kostnad(a.type, T.linje ? B0.lengde(a.punkter, a.lukket) : 0); return { pid: a.pid, type: a.type, pris: q ? q.pris + B0.manglerPris(L, q.mat) : 0, mat: q ? q.mat : {} }; });
      const v = LR.byggValg({ plan, kø: B0.jobber(L).length, utenSeng: B.utenSeng || 0 }, A.regler, A.ledelse, rng());
      if (v) { merk('bygg'); const a = plan.find(q => q.pid === v.pid), navn = B0.BYGG[v.type].navn.toLowerCase(); let feil = null;
        if (kassaSjekk(a.pris, `${navn}`)) feil = 'kassereren sier nei';
        if (!feil) for (const [m, n] of Object.entries(B0.manglerMat(L, a.mat))) { const r = komStille({ type: 'kjøpMateriale', materiale: m, mengde: n }); if (!r.ok) { feil = r.feil; break; } }
        if (!feil) { const r = komStille({ type: 'byggPlan', pids: [v.pid] }), sv = r.svar || {}; if (!r.ok || !(sv.bygget && sv.bygget.length)) feil = r.feil || (sv.feil && sv.feil[0] ? sv.feil[0][1] : 'fikk ikke bestilt'); }
        if (feil) vanlig(A, `${LR.tittel(A)} ville bygge ${navn} fra planen, men: ${feil}`);
        else { viktig(A, `${LR.tittel(A)} bestilte ${navn} fra planen` + (v.type === 'brakke' && B.utenSeng > 0 ? ` – ${B.utenSeng} sov i telt.` : '.')); if (window.LeirSpill) LeirSpill.lagre(); } } }
  }

  function formann(A, bid) {
    const st = status(bid), F = Fo(); if (!st || !F || sist('formann:' + bid, 30)) return;
    const J = window.JobberSpill ? JobberSpill.tilstand() : null, prio = o => (J && window.Jobber ? Jobber.prio(J, o) : 3);
    const folk = F.personer.filter(p => p.id !== undefined).map(p => ({ id: p.id, navn: p.navn, oppgave: p.oppgave, maskin: p.ferd ? p.ferd.maskin : 1, arbeidsfør: FR.arbeidsfør(p) && !p.skole, prio: prio(p.oppgave), låst: !!(J && J.auto && J.lås && J.lås[p.id]) }));
    const v = LR.formannValg(st, folk, A.regler, A.ledelse, rng()); if (!v) return;
    merk('formann:' + bid); const p = F.personer.find(q => q.id === v.person), navn = LB().BYGG[st.type] ? LB().BYGG[st.type].navn.toLowerCase() : 'maskinen';
    const r = J && J.auto ? komStille({ type: 'jobbLås', person: p.id, jobb: 'maskin' }) : komStille({ type: 'folk', person: p.id, oppgave: 'maskin' });
    if (!r.ok) { vanlig(A, `${LR.tittel(A)} fikk ikke flyttet ${p.navn}: ${r.feil}`); return; }
    const fra = FR.OPPGAVE[v.fra] ? FR.OPPGAVE[v.fra].navn.toLowerCase() : v.fra;
    const bestemt = { sagbruk: 'sagbruket', 'vedkløyver': 'vedkløyveren', fyrkjele: 'fyrkjelen' }[st.type] || navn;
    viktig(A, `${LR.tittel(A)} satte ${p.navn.split(' ')[0]} (${fra}) på ${bestemt} – den sto og ventet på folk.`);
    if (window.FolkSpill) FolkSpill.vis();
  }

  function forhandler(A) {
    // byene
    const BS = window.ByavtaleSpill, BA = window.Byavtale;
    if (BS && BA && +A.regler.by > 0) for (const by of (BS.område ? BS.område() : [])) {
      if (sist('by:' + by.id, LR.REGLER.forhandler.hvert)) continue;
      const i = BS.info(by.id); if (!i || i.trinn === 'holdt' || (i.eier && i.eier !== 'blå')) continue;
      const nå = BA.trinn(i.b), neste = BA.rang(nå) < BA.rang('beskyttelse') ? 'beskyttelse' : nå === 'beskyttelse' ? 'handel' : null;
      if (!neste || BA.kanTrinn(i.b, neste, 'blå', false, nåTid())) continue;
      const t = LR.byTilbud({ folk: by.folk, kan: neste, grunnpris: BA.grunnpris(neste, by.folk) }, A.regler, A.ledelse); if (!t) continue;
      merk('by:' + by.id);
      const svar = k => { const r = komStille({ type: 'byForhandle', by: by.id, trinn: t.trinn, pris: k, løfte: t.løfte, varighet: t.varighet }); return r.ok ? r.svar || {} : { svar: 'nei', grunn: r.feil }; };
      let s = null, pris = 0;
      for (const b of t.bud) { pris = b; s = svar(b);
        if (s.svar === 'motbud' && s.motbud) { const v = LR.svarMotbud(s.motbud.pris, t.min, A.ledelse, rng());
          if (v.ja) { pris = s.motbud.pris; s = svar(pris); break; }
          vanlig(A, `${LR.tittel(A)} sa nei til motbudet fra ${by.navn}: ${kr(s.motbud.pris)} per døgn er under grensen din (${kr(t.min)}).` + (v.dårlig ? ' (Et godt tilbud.)' : '')); break; }
        if (s.svar !== 'nei' || /stoler|redd|opp avtalen|holder|ikke forhandle|lar seg ikke/.test(s.grunn || '')) break; }
      if (s.svar === 'ja') viktig(A, `${LR.tittel(A)} avtalte ${t.trinn === 'beskyttelse' ? 'beskyttelse' : 'handel'} med ${by.navn} for ${kr(pris)} per døgn (${Math.round(pris / Math.max(1, by.folk))} kr per innbygger).`);
      else if (s.svar === 'nei') vanlig(A, `${LR.tittel(A)} fikk nei fra ${by.navn}: ${s.grunn || 'for dyrt'}`);
    }
    // firmaene
    const FS = window.FirmaSpill, Fi = window.Firma, typer = LR.firmaTyper(A.regler);
    if (FS && Fi && typer.length && FS.tilstand) { const FF = FS.tilstand(); if (FF) for (const f of Fi.aktive(FF)) for (const ty of typer) {
      if (sist(`firma:${f.navn}:${ty}`, 720) || !Fi.kanSamarbeid(FF, f, ty).ok) continue; merk(`firma:${f.navn}:${ty}`);
      const r = komStille({ type: 'firmaSamarbeid', firma: f.navn, slag: ty });
      if (r.ok && !(r.svar && r.svar.feil)) viktig(A, `${LR.tittel(A)} sa ja til ${f.navn}: ${ty === 'fast' ? 'fast kunde' : 'vern'}.`);
      else vanlig(A, `${LR.tittel(A)} fikk ikke avtalen med ${f.navn}: ${(r.svar && r.svar.feil) || r.feil || 'nei'}`); } }
  }

  function troppsjef(A, navn) {
    const s = finnLag(navn), sp = Sp(); if (!s || !sp || !sp.leir) return;
    // stridsreglene: holdningen fra regelen
    const h = A.regler.holdning;
    if (h && h !== 'egen' && window.Strid && window.StridSpill && Strid.HOLDNING[h] && Strid.holdningFor(StridSpill.regel(s)) !== h) {
      const r = komStille({ type: 'strid', lag: Kommando.nid(s), endring: { ...Strid.HOLDNING[h].regel } }); if (r.ok) vanlig(A, `${LR.tittel(A)} satte ${s.navn} på ${Strid.HOLDNING[h].navn.toLowerCase()} strid.`); }
    if (sist('tropp:' + navn, 60)) return;
    const ammo = window.Forsyning && Forsyning.ammo ? Forsyning.ammo(s) : Number.isFinite(s.ammo) ? s.ammo : 1, d = Math.hypot(s.x - sp.leir.x, s.y - sp.leir.y);
    const v = LR.troppValg({ ammo, hjemme: d <= LR.REGLER.tropp.hjemRadius, påVei: !!s.sti || !!s.planlegger || !!s.ombord }, A.regler, A.ledelse);
    if (v !== 'hjem') return; merk('tropp:' + navn);
    const a = rng()() * 6.2832, r = komStille({ type: 'ordre', lag: Kommando.nid(s), x: sp.leir.x + Math.cos(a) * 40, y: sp.leir.y + Math.sin(a) * 40, stille: true });
    if (r.ok) viktig(A, `${LR.tittel(A)} tar ${s.navn} hjem til leiren – ammunisjonen er ${Math.round(ammo * 100)} %.`); else vanlig(A, `${LR.tittel(A)} fikk ikke tatt ${s.navn} hjem: ${r.feil}`);
  }

  // rydd: ledere som ikke lenger finnes (gått, død, tatt inn i en tropp) eller som har mistet maskinen/troppen sin
  function rydd() {
    const F = Fo(), L = Lr(); if (!F || !L) return;
    for (const [k, A] of Object.entries(S.ledere)) {
      const del = String(k).split(':').slice(1).join(':');
      let borte = null;
      if (A.rolle === 'troppsjef') { const s = finnLag(del); if (!s) borte = `${del} finnes ikke lenger – ${A.navn} er ikke troppsjef.`; else if (!s.menn.some(m => m.navn === A.mann && m.hp > 0)) borte = `${A.navn} er ikke lenger med i ${s.navn} – troppen er uten troppsjef.`; }
      else if (!F.personer.some(p => p.id === A.person)) borte = `${LR.tittel(A)} er ikke lenger i leiren – rollen står tom.`;
      else if (A.rolle === 'formann' && !L.bygg.some(b => String(b.id) === del) && !status(del)) borte = `Maskinen til ${LR.tittel(A)} finnes ikke lenger.`;
      if (borte) { LR.av(S, k, A.rolle === 'troppsjef' ? null : F.personer.find(p => p.id === A.person), nåTid(), borte); melde(borte); lagre(); }
    }
  }

  // morgenen: kassa for uka (utbytte) og rivalene som lokker dyktige ledere (bare i ekte spill)
  function morgen() {
    const s = Sp(); if (!s) return; const U = S.uke && Array.isArray(S.uke.kassa) ? S.uke : (S.uke = { kassa: [] });
    U.kassa.push(Math.round(s.penger)); while (U.kassa.length > 8) U.kassa.shift();
    if (!aktiv()) return;
    const RS = window.RekrutteringSpill, F = Fo(); if (!RS || !RS.tilstand || !F) return; const T = RS.tilstand(); if (!T || T.lokk) return;
    for (const A of Object.values(S.ledere)) { if (A.rolle === 'troppsjef') continue; const p = F.personer.find(q => q.id === A.person); if (!p) continue;
      const bud = LR.lokkBud(A, p, rng()); if (!bud) continue;
      const rv = window.Rekruttering ? Rekruttering.REGLER.rivaler[Math.floor(rng()() * Rekruttering.REGLER.rivaler.length)] : { id: 'ravnsund', navn: 'Ravnsund' };
      T.lokk = { id: p.id, navn: rv.navn, rival: rv.id, lønn: bud, frist: nåTid() + 720, person: p.navn };
      const t = `${rv.navn} vil ha ${LR.ROLLER[A.rolle].navn.toLowerCase()} ${p.navn} og byr ${kr(bud)} i døgnet. Svar i Folk-panelet innen 12 timer, ellers går hen.`;
      melde(t); LR.notér(S, nåTid(), A.rolle, t, true); if (RS.lagre) RS.lagre(); break; }
  }

  // ett steg: alle lederne som er i arbeid. tving = også i testene (vakta)
  function steg(tving) {
    if (!leirNøkkel || (!tving && !aktiv())) return; registrer(); pakkKasse(); rydd();
    for (const [k, A] of Object.entries(S.ledere)) { if (!iArbeid(A)) continue; const del = String(k).split(':').slice(1).join(':');
      try { if (A.rolle === 'leirsjef') leirsjef(A); else if (A.rolle === 'formann') formann(A, del); else if (A.rolle === 'forhandler') forhandler(A); else if (A.rolle === 'troppsjef') troppsjef(A, del); }
      catch (e) { LR.notér(S, nåTid(), A.rolle, `${LR.tittel(A)}: noe gikk galt (${e.message}).`); } }
    lagre();
  }
  if (typeof KROKER !== 'undefined') KROKER.sim.push(dt => {
    if (!leirNøkkel) return;
    const dag = Math.floor(nåTid() / LR.REGLER.døgn); if (sistDag !== null && dag > sistDag) morgen(); sistDag = dag;
    if (!Object.keys(S.ledere).length || !aktiv()) return; akk += dt; if (akk < LR.REGLER.hvert) return; akk = 0; steg();
  });

  // ---------- verdien (for børsen, Ø7) ----------
  function verdi() { const L = Object.values(S.ledere).map(A => ({ rolle: A.rolle, ledelse: A.ledelse })); return LR.verdi(L); }

  // ---------- visningen (delen «Ledere» i Folk-panelet) ----------
  const css = document.createElement('style');
  css.textContent = `#folkmeny .ledere{ margin:8px 0 4px; border-top:1px solid #3a3226; padding-top:4px; }
#folkmeny .ledere .lrad{ padding:5px 0; border-bottom:1px solid #3a3226; }
#folkmeny .ledere .lrad b{ font-weight:600; font-size:14.5px; } #folkmeny .ledere .lrad small{ display:block; color:var(--ink-dim); font-size:12px; line-height:1.35; }
#folkmeny .ledere .lrad .regler{ display:flex; flex-wrap:wrap; gap:4px; margin-top:3px; }
#folkmeny .ledere button{ min-height:30px; padding:1px 8px; font-size:12.5px; }
#folkmeny .ledere .kand{ display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
#folkmeny .ledere .selv{ color:#e8a46a; } #folkmeny .ledere .siste{ font-size:12px; color:var(--ink-dim); line-height:1.4; margin:4px 0; }
#folkmeny .ledere .siste div.v{ color:#c9b98f; }`;
  document.head.appendChild(css);
  const pnavn = A => (A ? A.navn.split(' ')[0] : '');
  const lederlinje = A => `${A.navn} · ${LR.dyktighetOrd(A.ledelse)} (ledelse ${LR.des(A.ledelse, 2)})`;
  // kandidatene til en rolle: folket i leiren (eller troppens menn), de dyktigste først
  function kandidater(rolle, del) {
    if (rolle === 'troppsjef') { const s = finnLag(del); return s ? s.menn.filter(m => m.hp > 0).map(m => ({ id: m.navn, navn: m.navn, l: LR.ledelse(m.person || m), lønn: (m.person && m.person.lønn) || 0 })) : []; }
    const F = Fo(); if (!F) return [];
    return F.personer.filter(p => !LR.lederFor(S, p.id)).map(p => ({ id: p.id, navn: p.navn, l: LR.ledelse(p), lønn: p.lønn || 0, yrke: p.yrke }));
  }
  function rolleRad(rolle, del, tittel, { el, knapp }) {
    const k = LR.nøkkel(rolle, del), A = S.ledere[k], R = LR.ROLLER[rolle];
    const rad = el('div', { klasse: 'lrad', 'data-leder': k });
    const t = el('div', {}, el('b', {}, tittel), el('small', {}, A ? lederlinje(A) + (betales(rolle, del) ? ` · ${kr(person(rolle, del, LR.ref(A))?.lønn || 0)} i døgnet` : ' · startlag (ingen lønn)') : `Ingen – ${R.tekst.toLowerCase()}. Du styrer selv.`));
    rad.append(t);
    if (A) {
      if (A.selvTil != null && nåTid() < A.selvTil) rad.append(el('small', { klasse: 'selv' }, 'Du styrer selv til i morgen kl. 06.'));
      const regler = el('div', { klasse: 'regler' });
      for (const [rk, d] of Object.entries(R.regler)) { const i = d.valg.findIndex(q => String(q[0]) === String(A.regler[rk])), neste = d.valg[(i + 1) % d.valg.length][0];
        regler.append(knapp(`${d.navn}: ${LR.regelTekst(rolle, rk, A.regler[rk])}`, () => kom({ type: 'lederRegel', nøkkel: k, regel: rk, verdi: neste }), { 'data-regel': `${k}|${rk}`, title: 'Trykk for neste valg' })); }
      rad.append(regler);
      const selv = A.selvTil != null && nåTid() < A.selvTil;
      rad.append(el('div', { klasse: 'regler' }, knapp(selv ? 'La lederen styre' : 'Ta over selv', () => kom({ type: 'lederSelv', nøkkel: k, på: !selv }), { 'data-selv': k }),
        knapp('Bytt', () => { velger = velger === k ? null : k; FolkSpill.vis(); }, { 'data-bytt': k }), knapp('Fjern', () => kom({ type: 'lederAv', nøkkel: k }), { 'data-fjern': k })));
      const s = S.logg.find(q => q.rolle === rolle && q.tekst.includes(pnavn(A))); if (s) rad.append(el('small', {}, 'Sist: ' + s.tekst));
    } else rad.append(el('div', { klasse: 'regler' }, knapp(velger === k ? 'Lukk' : 'Utnevn …', () => { velger = velger === k ? null : k; FolkSpill.vis(); }, { 'data-utnevn': k })));
    if (velger === k) rad.append(kandBoks(rolle, del, k, { el, knapp }));
    return rad;
  }
  // lønn betales for folket i leiren og for egne tropper (s.fraFolk); startlagene får ingen lønn i spillet
  const betales = (rolle, del) => rolle !== 'troppsjef' || !!(finnLag(del) && finnLag(del).fraFolk);
  // knappene med kandidatene (de dyktigste først) for nøkkelen k
  function kandBoks(rolle, del, k, { el, knapp }) {
    const R = LR.ROLLER[rolle], K = kandidater(rolle, del).sort((a, b) => b.l - a.l).slice(0, 6), boks = el('div', { klasse: 'kand' });
    if (!K.length) boks.append(el('small', {}, 'Ingen ledige.'));
    const lønn = betales(rolle, del), kortNavn = c => (K.filter(q => q.navn.split(' ')[0] === c.navn.split(' ')[0]).length > 1 ? c.navn.split(' ')[0] + ' ' + (c.navn.split(' ')[1] || '').slice(0, 1) + '.' : c.navn.split(' ')[0]);
    for (const c of K) boks.append(knapp(`${kortNavn(c)} · ${LR.des(c.l, 2)}` + (lønn ? ` · ${kr(LR.lederLønn(c.lønn, c.l))}` : ''), () => { velger = null; const r = kom({ type: 'lederUtnevn', rolle, del, person: c.id }); melde(r.ok && r.svar && r.svar.A ? `${c.navn} er ${R.navn.toLowerCase()}.` : (r.feil || (r.svar && r.svar.feil) || 'Fikk ikke utnevnt.')); },
      { 'data-kand': `${k}|${c.id}`, title: `${c.navn}: ledelse ${LR.des(c.l, 2)} (${LR.dyktighetOrd(c.l)}), krever ${kr(LR.lederLønn(c.lønn, c.l))} i døgnet som leder` }));
    return boks;
  }
  // formenn og troppsjefer: de som har en leder står hver for seg, resten samlet på én rad med en knapp per maskin/tropp
  function flereRad(rolle, liste, tittel, tom, { el, knapp }) {
    const ut = [], uten = [];
    for (const q of liste) { if (S.ledere[LR.nøkkel(rolle, q.del)]) ut.push(rolleRad(rolle, q.del, `${tittel} – ${q.navn}`, { el, knapp })); else uten.push(q); }
    if (!liste.length) ut.push(el('div', { klasse: 'lrad' }, el('b', {}, tittel), el('small', {}, tom)));
    else if (uten.length) { const rad = el('div', { klasse: 'lrad' }, el('b', {}, tittel), el('small', {}, `${LR.ROLLER[rolle].tekst}. Uten ${tittel.toLowerCase()}:`)), r = el('div', { klasse: 'regler' });
      for (const q of uten) { const k = LR.nøkkel(rolle, q.del); r.append(knapp(velger === k ? `${q.navn} ✕` : `${q.navn} …`, () => { velger = velger === k ? null : k; FolkSpill.vis(); }, { 'data-utnevn': k, title: `Utnevn ${tittel.toLowerCase()} for ${q.navn}` })); }
      rad.append(r); const v = uten.find(q => LR.nøkkel(rolle, q.del) === velger); if (v) rad.append(kandBoks(rolle, v.del, velger, { el, knapp })); ut.push(rad); }
    return ut;
  }
  function del({ el, knapp }) {
    if (!leirNøkkel) les(); if (!Fo() || !Lr()) return [];
    const ut = [], antall = Object.keys(S.ledere).length, alleSelv = S.selvTil != null && nåTid() < S.selvTil;
    const boks = el('div', { klasse: 'ledere', id: 'ledere' });
    const kort = Object.values(S.ledere).slice(0, 4).map(A => LR.tittel(A)).join(', ');
    boks.append(el('h3', {}, 'Ledere'));
    boks.append(el('div', { klasse: 'status' }, antall ? `${kort}${antall > 4 ? ` og ${antall - 4} til` : ''}.` + (alleSelv ? ' Du styrer selv i dag.' : ' De styrer etter reglene dine.') : 'Gi noen en lederrolle, så tar de beslutningene etter reglene du setter.'));
    const rad = el('div', { klasse: 'rad' }, knapp(åpen ? 'Skjul lederne' : `Vis lederne${antall ? ` (${antall})` : ''}`, () => { åpen = !åpen; try { localStorage.setItem(VIS, åpen ? '1' : '0'); } catch (e) { /* sperret */ } FolkSpill.vis(); }, { id: 'visledere' }));
    if (antall) rad.append(knapp(alleSelv ? 'La lederne styre' : 'Jeg styrer selv i dag', () => kom({ type: 'lederSelv', nøkkel: null, på: !alleSelv }), { id: 'styrselv', title: 'Lederne gjør ingenting før i morgen kl. 06' }));
    boks.append(rad);
    if (åpen) {
      boks.append(rolleRad('leirsjef', null, 'Leirsjef', { el, knapp }));
      boks.append(...flereRad('formann', maskiner().map(b => ({ del: String(b.id), navn: LB().BYGG[b.type].navn.toLowerCase() })), 'Formann', 'Én per maskin (sagbruk, vedkløyver, fyrkjele) – ingen maskiner ennå.', { el, knapp }));
      boks.append(rolleRad('forhandler', null, 'Forhandler', { el, knapp }));
      boks.append(...flereRad('troppsjef', tropper().map(s => ({ del: s.navn, navn: s.navn })), 'Troppsjef', 'Én per tropp – ingen tropper ute.', { el, knapp }));
      boks.append(rolleRad('kasserer', null, 'Kasserer', { el, knapp }));
      const v = verdi(); if (v.antall) boks.append(el('div', { klasse: 'siste' }, `Lederne gjør selskapet ca. ${mill(v.kr)} kr mer verdt (snitt ledelse ${LR.des(v.snitt, 2)}).`));
      if (S.logg.length) { const s = el('div', { klasse: 'siste' }, el('div', {}, 'Siste beslutninger:')); for (const q of S.logg.slice(0, 5)) s.append(el('div', { klasse: q.viktig ? 'v' : '' }, '· ' + q.tekst)); boks.append(s); }
    }
    ut.push(boks); return ut;
  }

  Object.assign(api, { morgen, tilstand: () => S, sett: o => { S = LR.fraJSON(o); lagre(); }, les, lagre, steg, del, verdi, utbytte, kassaSjekk, prisFor, kandidater, person,
    nullstill: () => { S = LR.ny(); lagre(); }, NØKKEL });
  window.LedereSpill = api;
})();
