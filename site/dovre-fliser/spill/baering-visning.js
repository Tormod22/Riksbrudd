'use strict';
// MASKINENE TRENGER FOLK PÅ RIKTIG PLASS – visningen (28. nov, fase F3; reglene: spill/baering.js). Lastes rett etter folkgang-visning.js.
//  - Gangen (FolkgangSpill.målKrok / .etter): operatørene går til bruksplassene ved maskinene, bærerne henter og leverer
//    (Baering.mål / Baering.steg rett etter hvert steg i gangen, 4 ganger i sekundet).
//  - Maskinene (produksjon-visning.js) tar råvaren fra innmatingen og legger det de lager i utmatingen (BaeringSpill.mating/kraftPer).
//  - BARE NÅR GANGEN TELLER (døgnplanen på – FolkgangSpill.aktiv()). Med døgnplanen av (gamle spill som har slått den av, og testene med
//    navigator.webdriver uten JobberSpill.test) er bærerne USYNLIGE: matingen tømmes tilbake i lageret (Baering.tøm), og maskinene går
//    rett fra lageret som før.
//  - 2D: innmating og utmating som små felt ved maskinen med det som ligger der, bruksplassene som ringer, og bærerne med en kasse
//    eller haug på ryggen (oppå prikkene / figurene).
//  - Lagres per leir i «riksbrudd-baering» ({ leir: 'x,y', B }): matingen, oppdragene, opplæringen og tellingene.
(function () {
  const BR = window.Baering, FR = window.FolkRegler, LB = window.Leir; if (!BR || !LB || typeof KROKER === 'undefined' || !window.FolkgangSpill) return;
  const NØKKEL = 'riksbrudd-baering';
  // fargen på lasten i 2D (Claudes valg)
  const FARGE = { tømmer: '#8a6238', tre: '#d9bf8c', flis: '#c9a86a', ved: '#9a6a3c' };
  let B = BR.ny(), id = '', sistLagret = 0, sistDøgn = null, døgnFør = null;
  const Fo = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const Lr = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const midte = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  const leirId = () => { const m = midte(); return m ? Math.round(m.x) + ',' + Math.round(m.y) : ''; };
  const aktiv = () => window.BaeringSpill.på !== false && !!(window.FolkgangSpill.aktiv && FolkgangSpill.aktiv()) && !(window.LeirSpill && LeirSpill.erSpeil && LeirSpill.erSpeil());
  const nf = BR.nf, VN = BR.VARENAVN;

  // ---------- lagring (per leir) ----------
  function les() { const n = leirId(); if (n === id) return; id = n; B = BR.ny();
    try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d && d.leir === n) B = BR.fraJSON(d.B); } catch (e) { /* sperret */ } }
  function lagre() { if (!id) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: id, B: BR.tilJSON(B) })); } catch (e) { /* fullt */ } }

  // ---------- lageret (varelageret når det finnes) ----------
  function lager() { const L = Lr(), m = midte(); if (!L || !m) return null; const V = window.VarelagerSpill && VarelagerSpill.V ? VarelagerSpill.V() : null;
    return BR.lager(LB, L, V, V ? window.Varelager : null, m); }
  // arbeidskraften til én operatør når hen står på plass: personTempo × døgnplanens tetthet (som FolkRegler.tempo, men per person)
  function kraftPerson(p) {
    const F = Fo(); if (!F || !FR) return 1; const pt = FR.personTempo ? FR.personTempo(F, p, 'maskin') : 1;
    const JR = window.Jobber, J = window.JobberSpill && JobberSpill.tilstand ? JobberSpill.tilstand() : null; if (!JR || !J || J.døgn === false) return pt;
    try { const pl = JR.planFor(J, F, p), t = JR.timer(pl.plan); return t > 0 ? pt * 24 / t * (JR.REGLER.dagsverk[JR.skift(J, 'maskin')] || 1) : pt; } catch (e) { return pt; }
  }
  // frakt-folkene bærer for maskinene når de ikke har noe å bære fra hogstfeltene (samme sjekk som i gangen)
  function fraktLedig() { const R = window.RessursSpill && RessursSpill.tilstand ? RessursSpill.tilstand() : null, nær = window.Ressurser && Ressurser.REGLER ? Ressurser.REGLER.nær : 150;
    const RJ = R && Array.isArray(R.jobber) ? R.jobber : []; return !RJ.some(q => q.avst > nær && q.frakt !== 'lastebil' && q.haug && Object.values(q.haug).some(v => v > .01)); }
  const harInnhold = () => Object.keys(B.bær).length || Object.values(B.m).some(Bf => Object.values(Bf.inn).some(m => m > 0) || Object.values(Bf.ut).some(m => m > 0));

  // ---------- krokene i gangen ----------
  FolkgangSpill.målKrok = (p, hva) => { if (!aktiv()) return null; const L = Lr(); return L ? BR.mål(B, L, p, hva) : null; };
  FolkgangSpill.etter.push((G, dt, ctx) => {
    if (!aktiv()) return; les(); const L = Lr(), F = Fo(), A = lager(); if (!L || !F || !A) return;
    const st = window.ProduksjonSpill && ProduksjonSpill.siste ? ProduksjonSpill.siste().status : {};
    BR.steg(B, { F, L, G, A, hva: ctx.hva, kraftPerson, fraktLedig: fraktLedig(), status: st, meld: t => { if (typeof logg === 'function') logg(t); } }, dt);
  });
  // døgnplanen av (eller testene): alt i matingen tilbake i lageret, så maskinene går rett fra lageret som før
  KROKER.sim.push(() => {
    les(); if (aktiv() || !harInnhold()) return; const A = lager(); if (A) BR.tøm(B, A);
  });
  KROKER.sim.push(() => {
    if (performance.now() - sistLagret > 5000) { sistLagret = performance.now(); lagre();
      // tellingene for siste døgn (bæretimer) – nytt døgn ved spillets døgnskifte
      const d = typeof tid !== 'undefined' ? Math.floor(tid / 1440) : 0; if (sistDøgn !== d) { if (sistDøgn !== null) døgnFør = { ...B.stat, dag: sistDøgn }; sistDøgn = d; B.døgnStart = { ...B.stat }; } }
  });
  window.addEventListener('pagehide', lagre);

  // ---------- det produksjonen og panelet bruker ----------
  // ett ord for maskinens status (ikonet over maskinen og fanen Produksjon): går, folk, tom, fullt, strøm, stykker, av
  function status(s) { if (!s) return 'venter'; if (s.går) return s.drift >= .98 ? 'går' : 'delvis'; return { folk: 'folk', tom: 'tom', fullt: 'fullt', strøm: 'strøm', ødelagt: 'stykker', slitt: 'stykker', av: 'av' }[s.grunn] || 'venter'; }
  // en linje til maskinraden: «Innmating 2,5 av 4 m³ tømmer · utmating 1,2 av 4 m³ · på plass 1 av 3 · 1 bærer»
  function maskinTekst(b) { if (!aktiv()) return ''; const m = BR.maskin(B, b.id), D = window.Produksjon.REGLER.maskiner[b.type], R = window.Produksjon.REGLER.buffer;
    const inn = Object.entries(m.inn).filter(([, v]) => v > .01).map(([v, q]) => `${nf(q, 1)} m³ ${VN[v] || v}`).join(' + ') || 'tom';
    const utS = Object.values(m.ut).reduce((a, q) => a + q, 0);
    return `Innmating ${inn} (høyst ${R.inn}) · utmating ${nf(utS, 1)} av ${R.ut} m³ · på plass ${m.påPlass} av ${D ? D.folk : 1}${m.bærere ? ` · ${m.bærere} bærer` : ''}`; }
  // bæringen i fanen Produksjon
  function bæreTekst() {
    if (!aktiv()) return { linjer: [], tekst: 'Folk bærer ikke ennå: døgnplanen er av, så maskinene tar rett fra lageret.' };
    const S = B.stat, D0 = B.døgnStart || { sek: 0, turer: 0, m3: 0, gåSek: 0 }, i = { sek: S.sek - D0.sek, turer: S.turer - D0.turer, m3: S.m3 - D0.m3, gå: S.gåSek - D0.gåSek };
    const snitt = S.turer ? S.sek / S.turer / 60 : 0, gåAndel = S.sek > 0 ? S.gåSek / S.sek : 0;
    return { linjer: BR.linjer(B, Lr()), i, før: døgnFør, snitt, gåAndel, tekst: '' };
  }

  // ---------- 2D ----------
  // innmating, utmating og bruksplassene ved hver maskin (zoomet inn), og lasten på ryggen til bærerne
  function felt(g, q, vx0, vy1, m, tittel, innhold, farge) {
    const x = (q.x - vx0) / m, y = (vy1 - q.y) / m, r = Math.max(7, 1.3 / m);
    g.fillStyle = 'rgba(30,26,18,.55)'; g.strokeStyle = 'rgba(232,214,170,.7)'; g.lineWidth = 1; g.setLineDash([3, 2]);
    g.fillRect(x - r, y - r, 2 * r, 2 * r); g.strokeRect(x - r, y - r, 2 * r, 2 * r); g.setLineDash([]);
    const fyll = Math.max(0, Math.min(1, innhold)); if (fyll > 0) { g.fillStyle = farge; g.fillRect(x - r + 2, y + r - 2 - (2 * r - 4) * fyll, 2 * r - 4, (2 * r - 4) * fyll); }
    // (ut8-kr-telefon, Jonas: «Sagbruk · 97 % helt» oppå «inn 3,3 m³») feltet er et merke navnene går utenom, og teksten plasseres av Etikett
    if (window.Etikett && Etikett.hinder) Etikett.hinder(x - r, y - r, 2 * r, 2 * r);
    if (m < .9) { g.font = '11px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#e8dcc0'; const y0 = y + r + 13;
      const ty = window.Etikett ? Etikett.tekst(g, tittel, x, y0, 1, 1) : y0; g.fillText(tittel, x, ty); }
  }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (typeof kam === 'undefined' || (typeof på3d !== 'undefined' && på3d) || !aktiv()) return; const L = Lr(), F = Fo(); if (!L || !F) return; const m = kam.m;
    g.save();
    if (m < 1.6 && window.Produksjon) {
      const R = Produksjon.REGLER.buffer;
      for (const b of Produksjon.maskinene(L)) { const P = BR.plasser(b), Bf = B.m[b.id] || { inn: {}, ut: {} };
        const iv = Object.entries(Bf.inn).sort((a, c) => c[1] - a[1])[0], ut = Object.values(Bf.ut).reduce((a, q) => a + q, 0), uv = Object.entries(Bf.ut).sort((a, c) => c[1] - a[1])[0];
        felt(g, P.inn, vx0, vy1, m, `inn ${nf(iv ? iv[1] : 0, 1)} m³`, iv ? iv[1] / R.inn : 0, FARGE[iv ? iv[0] : 'tømmer'] || '#a08050');
        if (P.ut) felt(g, P.ut, vx0, vy1, m, `ut ${nf(ut, 1)} m³`, ut / R.ut, FARGE[uv ? uv[0] : 'tre'] || '#d0b080');
        // bruksplassene: en ring, fylt når operatøren står der
        const op = Object.entries(B.rolle).filter(([, r]) => r.r === 'op' && r.bygg === b.id).map(([, r]) => r.i), påPlass = B.påPlass[b.id] || 0;
        P.bruks.forEach((q, i) => { const x = (q.x - vx0) / m, y = (vy1 - q.y) / m, r = Math.max(3.5, .55 / m);
          g.strokeStyle = 'rgba(212,129,58,.85)'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke();
          if (op.includes(i) && påPlass > 0) { g.fillStyle = 'rgba(212,129,58,.35)'; g.fill(); } }); }
    }
    // lasten: en liten kasse (planker, flis, ved) eller stokker (tømmer) bak prikken / figuren
    if (m < 3) for (const [pid, o] of Object.entries(B.bær)) { if (!(o.m > 0)) continue; const p = F.personer.find(q => q.id === +pid); if (!p) continue;
      const q = FolkgangSpill.plass2d(p); if (!q) continue; const x = (q.x - vx0) / m, y = (vy1 - q.y) / m, a = q.a || 0, bx = x - Math.cos(a) * 4.5, by = y + Math.sin(a) * 4.5, s = Math.max(4, Math.min(7, .9 / m));
      g.save(); g.translate(bx, by); g.rotate(-a); g.fillStyle = FARGE[o.vare] || '#c0a070'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1;
      if (o.vare === 'tømmer') { for (const k of [-1, 0, 1]) { g.beginPath(); g.ellipse(0, k * s * .38, s * .9, s * .2, 0, 0, 6.283); g.fill(); g.stroke(); } }
      else { g.fillRect(-s / 2, -s / 2, s, s); g.strokeRect(-s / 2, -s / 2, s, s); }
      g.restore(); }
    g.restore();
  });
  KROKER.tegn[KROKER.tegn.length - 1].bygg = true;

  window.addEventListener('riksbrudd-spill', () => { id = ''; les(); });
  window.BaeringSpill = { på: true, test: false, aktiv, tilstand: () => B, mating: () => B.m, kraftPer: () => B.kraftPer, linjer: () => (aktiv() ? BR.linjer(B, Lr()) : []),
    plasser: b => BR.plasser(b), maskinTekst, bæreTekst, status, lagre, les: () => { id = ''; les(); }, tøm: () => { const A = lager(); return A ? BR.tøm(B, A) : null; },
    ekstraPlasser: L => (aktiv() && window.Produksjon ? Produksjon.maskinene(L).reduce((s, b) => s + (BR.REGLER.bærere[Produksjon.base ? Produksjon.base(b.type) : b.type] || 0), 0) : 0),
    nullstill: () => { B = BR.ny(); } };
})();
