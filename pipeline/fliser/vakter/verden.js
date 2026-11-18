// Vakt for pakka «verden» (spill/verden.js + verden-visning.js): vinterføre, is, brann, flom, funn, åker, radio og panelet.
// Setter alt tilbake (penger, mat, lager, været, tilstanden i VerdenSpill).
module.exports = { navn: 'verden (vinter, snøstengte veger, flom i flomfeltet, is, brann, jakt, åker som bygg, funn, kratere, radio, tog)', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
    if (!window.VerdenSpill || !window.Verden) return { feil: ['VerdenSpill mangler'] };
    const VS = VerdenSpill, V = VS.tilstand(), S = OppstartSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), L = window.LeirSpill && LeirSpill.tilstand(), l = S.leir;
    const før = { V: JSON.stringify(V), penger: S.penger, mat: F ? F.mat : 0, lager: L ? JSON.stringify(L.lager) : null, diesel: L ? L.drivstoff : 0, årstid: VaerSpill.S.årstid, låst: VaerSpill.S.låst, vær: VaerSpill.S.vær, test: VS.test, åpen: VS.erÅpen() };
    const settÅr = å => { Vaer.settÅrstid(VaerSpill.S, å, tid); Vaer.låsVær(VaerSpill.S, 'klart'); VaerSpill.straks(); };
    try {
      // panelet og linjene
      VS.vis(true); const P = document.getElementById('verdenpanel'); krev(P && P.classList.contains('på') && /Åker/.test(P.textContent) && /Tog/.test(P.textContent) && /Radio/.test(P.textContent), 'panelet viser ikke alt'); VS.vis(false);
      krev(!P.classList.contains('på'), 'panelet lukkes ikke');
      // vinter: snø bremser marsjen
      settÅr('vinter'); ut.vinter = VS.linjer(); krev(ut.vinter.some(t => /Snø: marsj −30 %/.test(t)), 'vinteren sier ikke at marsjen går saktere: ' + ut.vinter.join(' | '));
      const s = ENHETER.find(e => e.side === 'blå' && levende(e) && !e.sti && !e.karakter);
      if (s) { const g = { sti: s.sti, steg: s.steg, seg: s.seg, prog: s.prog, t: s.timerIgjen }; s.sti = [[s.x, s.y], [s.x + 100, s.y]]; s.steg = [1]; s.seg = 0; s.prog = 0;
        VS.tilpassSti(s, VAER.regel); ut.marsj = s.steg[0]; krev(Math.abs(s.steg[0] - 1 / Verden.REGLER.snø.marsj) < 1e-6, 'marsjen i snø tar ikke lengre tid: ' + s.steg[0]);
        Object.assign(s, { sti: g.sti, steg: g.steg, seg: g.seg, prog: g.prog, timerIgjen: g.t }); s._vSti = null; s._vOrig = null; s.verdenF = 1; }
      // is: bærer etter lang kulde (bare når ting får skje av seg selv)
      VS.test = true; V.frost = Verden.REGLER.is.bærer + 5; VS.isSteg(); ut.is = Terreng.fart(3, 0); krev(ut.is > 0 && window.VERDEN_IS === true, 'isen bærer ikke');
      V.frost = 0; VS.isSteg(); krev(Terreng.fart(3, 0) === 0 && !window.VERDEN_IS, 'isen ble liggende'); VS.test = før.test;
      krev(ut.vinter.length > 0, 'ingen linjer om forholdene');
      // brann: tørr sommer, tenn på i skogen nær leiren
      settÅr('sommer'); V.tørke = 6; let skog = null;
      for (let t = 0; t < 60 && !skog; t++) { const a = t * 2.4, r = 250 + t * 40, x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r, p = await VS.punkt(x, y); if (p && p.k === 1 && p.h != null) skog = [x, y]; }
      if (skog) { const r = await VS.tenn(skog[0], skog[1], 'Vakta'); krev(r.ok && BRANNER.length === 1, 'brannen tok ikke fyr: ' + JSON.stringify(r));
        for (let n = 0; n < 8; n++) { V.brann.celler && Object.values(V.brann.celler).forEach(c => { c.til = tid + 999; }); VS.brannSteg(10); }
        ut.brann = BRANNER.length; krev(BRANNER.length > 1, 'brannen sprer seg ikke i tørr skog (' + BRANNER.length + ')');
        Vaer.låsVær(VaerSpill.S, 'regn'); VaerSpill.straks(); krev(VS.linjer().every(t => !/brannfare/.test(t)), 'brannfare i regn'); Vaer.låsVær(VaerSpill.S, 'klart'); VaerSpill.straks();
      } else ut.brann = 'ingen skog funnet';
      // flom: sonen kommer i kartet og går bort
      VS.flom(l.x + 1500, l.y, 4, 'Prøveelva'); krev(VERDEN_SONER().length === 1 && VERDEN_SONER()[0].type === 'flom', 'flomsonen mangler');
      VS.ryddKart(); krev(!BRANNER.length && !BRENT.length && !VERDEN_SONER().length, 'kartet ble ikke ryddet');
      // funn: faste steder, innholdet havner i leiren
      const f = Verden.funnNær(l.x, l.y, 30000).find(q => !Verden.innhold(q).hendelse); krev(!!f, 'ingen funn innen 30 km');
      if (f) { const i = VS.undersøk(null, f); ut.funn = i && i.tekst; krev(i && V.funn.tatt[f.id] === 1 && VS.undersøk(null, f) === null, 'funnet kan tas to ganger'); }
      // åker: rydd, så om våren, høst om høsten
      S.penger = Math.max(S.penger, 5e6); const p0 = S.penger, r1 = await VS.ryddÅker(); krev(r1.ok && S.penger < p0 && V.åker.mål === Verden.REGLER.åker.ryddMål && V.åker.x != null && Math.hypot(V.åker.x - l.x, V.åker.y - l.y) < 600, 'åkeren ble ikke ryddet (eller fikk ikke plass ved leiren)');
      const af = VS.åkerFolk(); ut.åkerFolk = af; krev(af.behov === 1 && af.andel >= 0 && af.andel <= 1, 'åkerens folk stemmer ikke');
      krev(VS.så().feil, 'det gikk an å så om sommeren'); settÅr('vår'); krev(VS.så().ok && V.åker.sådd, 'det gikk ikke an å så om våren');
      V.åker.grodd = Verden.REGLER.åker.modning; const m0 = F ? F.mat : 0, h = Verden.åkerSteg(V, .01, 'høst'); ut.avling = h.mat; krev(h.mat === V.åker.mål * Verden.REGLER.åker.perMål, 'avlinga stemmer ikke');
      // jaktlag: et lag i skogen får kjøtt etter jakta
      if (s) { await VS.punkt(s.x, s.y); const her = s.her; s.her = null; const art = VS.viltHer(s); ut.vilt = art;
        if (art) { const sti = s.sti; krev(VS.startJakt(s).ok && s.jakt, 'jakta startet ikke'); if (s.jakt) { s.jakt.til = tid; VS.jaktSteg(); krev(!s.jakt, 'jakta ble ikke ferdig'); krev(VS.startJakt(s).feil, 'viltet er ikke skremt etter jakta'); } s.sti = sti; }
        s.her = her; }
      // RUNDE 4: snø stenger høye veglenker (grensen settes og fjernes), fiendens lag fryser, kratere, felte dyr, åkeren som bygg,
      // funn flyttes ut av tettbebyggelse, regnflom i flomfeltet og isen
      { const v0 = VAER.regel || VAER; VS.snøVegSteg({ ...v0, snø: 1, snøgrense: -1000 }); ut.snøGrense = VS.snøGrense(); krev(ut.snøGrense === Verden.REGLER.snø.vegFjell, 'snøværet stenger ikke fjellvegene: ' + ut.snøGrense);
        VS.snøTilbake(); krev(VS.snøGrense() == null && !VS.snøLenker().size, 'snøstengningen ble ikke opphevet'); }
      { const hp = ENHETER.map(e => (e.menn || []).map(m => m.hp)), led = ENHETER.map(e => e.leder), fi = nyttLag('Vaktfiende', l.x + 4000, l.y - 3000, 'rød'); ENHETER.push(fi);
        try { const v0 = VAER.regel || VAER; for (let i = 0; i < 4; i++) VS.kuldeTime({ ...v0, temp: -25 }, 6); ut.fiendeFryser = fi.menn.filter(m => m.hp < 1).length; }
        finally { ENHETER.splice(ENHETER.indexOf(fi), 1); ENHETER.forEach((e, i) => { (e.menn || []).forEach((m, k) => { if (hp[i] && hp[i][k] != null) m.hp = hp[i][k]; }); e.leder = led[i]; }); }
        krev(ut.fiendeFryser > 0, 'fiendens lag fryser ikke'); }
      if (window.Effekter3d && Effekter3d.kratere) { const K = Effekter3d.kratere(), n0 = K.length; Effekter3d.krater(l.x + 50, l.y + 50, 3); krev(K.length === Math.min(n0 + 1, Effekter.REGLER.kratere), 'krateret kom ikke'); K.pop(); Effekter3d.lagre();
        krev(Effekter.salveKratere(0, 0, 150, 1).length === Effekter.REGLER.salve.nedslag && !!window.SALVER, 'salvene lager ikke kratere'); }
      krev(!!(window.Dyr3d && Dyr3d.settFelte && Dyr3d.felte), 'felte dyr huskes ikke (Dyr3d.settFelte)');
      if (L && Leir.BYGG.åker) { const å0 = JSON.stringify(V.åker), b = { id: -7707, type: 'åker', x: l.x + 900, y: l.y + 900, ret: 0, igjen: 0, hp: 1, nivå: 1 }; L.bygg.push(b);
        try { const m0 = V.åker.mål; VS.syncÅker(); ut.åkerBygg = V.åker.mål - m0; krev(ut.åkerBygg === Verden.REGLER.åkerBygg.mål, 'åkerstykket teller ikke: ' + ut.åkerBygg); krev(VS.åkerVed(b.x + 10, b.y + 40) === b && !VS.åkerVed(b.x + 40, b.y), 'åkerstykket ligger feil');
          krev(!!(window.Ikoner && Ikoner.BYGG.åker), 'åkeren mangler ikon'); }
        finally { L.bygg.splice(L.bygg.indexOf(b), 1); Object.assign(V.åker, JSON.parse(å0)); } }
      else krev(false, 'Leir.BYGG.åker mangler');
      { const f = Verden.funnNær(l.x, l.y, 20000)[0]; if (f) { const r = await Promise.race([VS.plasserFunn(f), new Promise(q => setTimeout(() => q('tid'), 6000))]); ut.funnSted = r; krev(r === true || Array.isArray(r) || r === 'tid', 'funnet fikk ikke et sted: ' + JSON.stringify(r)); } }
      { const s2 = VS.flom(l.x + 1500, l.y, 4, 'Prøveelva'); krev(Array.isArray(s2.kilde), 'regnflommen har ingen kilde'); const f2 = await Promise.race([VS.lagFlomfelt(s2), new Promise(q => setTimeout(() => q('tid'), 8000))]);
        ut.flomfelt = f2 === 'tid' ? 'tid' : f2 ? f2.antall : null; if (f2 && f2 !== 'tid') krev(f2.antall > 0 && !!VS.iSoneV(f2.x0 + (f2.maske.indexOf(1) % f2.w + .5) * f2.r, f2.y0 - (Math.floor(f2.maske.indexOf(1) / f2.w) + .5) * f2.r, 'flom'), 'flomfeltet virker ikke'); VS.ryddKart(); }
      { const f0 = V.frost; V.frost = Verden.REGLER.is.båt + 1; krev(typeof Verden.islagt === 'function' && typeof Verden.islagt(l.x, l.y) === 'boolean' && VS.linjer().some(t => /islagt/.test(t)), 'isen på innsjøene'); V.frost = f0; }
      // radio og tog
      const n0 = V.radio.liste.length, m = VS.radioNå(); krev(m && m.tekst && V.radio.liste.length === Math.min(Verden.REGLER.radio.liste, n0 + 1), 'radiomeldingen kom ikke');
      ut.stasjoner = VS.stasjoner().map(q => q.navn); krev(Array.isArray(ut.stasjoner), 'stasjonslista mangler');
      krev(Verden.vilt(1300, 0) === 'rein' && Verden.vilt(700, 1) === 'elg', 'viltreglene');
      krev(!!(window.Dyr3d && Dyr3d.fell), 'Dyr3d.fell mangler');
    } catch (e) { ut.feil.push('unntak: ' + (e && e.stack || e)); }
    // alt tilbake
    const G = JSON.parse(før.V); for (const k of Object.keys(V)) delete V[k]; Object.assign(V, G); VS.ryddKart(); Object.assign(V, JSON.parse(før.V)); VS.test = før.test; VS.isSteg();
    S.penger = før.penger; if (F) F.mat = før.mat; if (L && før.lager) { L.lager = JSON.parse(før.lager); L.drivstoff = før.diesel; }
    Vaer.settÅrstid(VaerSpill.S, før.årstid, tid); Vaer.låsVær(VaerSpill.S, før.låst || 'auto'); if (!før.låst) VaerSpill.S.vær = før.vær; VaerSpill.straks(); VS.lagre(); VS.vis(før.åpen); skitten = true;
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `vinterføre, is, brann (${d.brann} ruter), flom, funn, åker (${d.avling} rasjoner), radio og panel virker`, data: d };
} };
