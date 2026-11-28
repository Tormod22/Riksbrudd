// Vakt for pakka «ut5-bors» (fase Ø7, 28. nov; docs/natt/ut5-bors.md): andeler, investorer og Gråbørsen.
// 1) ANDELER: kjøp 10 % i Storlia Tømmer (nivå 3) gir 5 % rabatt (Firma.rabatt) og utbytte når uka er omme;
// 2) EIE: over 50 % gjør Storlia til deres (Firma.eierSkifte -> f.eier = 'blå');
// 3) NOTERING: nivå 4, 30 % notert -> penger i kassa, kursen er satt og kursserien finnes i statistikken;
// 4) BRUDD: en brutt kontrakt senker stemningen (og kursen) neste døgn;
// 5) OPPKJØP: Ravnsund over 50 % -> oppkjøpet, og avslutningen (tapskortet «Penger – Ravnsund vant») med SeierSpill.test;
// 6) SEIER: penger-veien leser børsen (din del av børsverdien).
// Setter alt tilbake: børsen, firmaene, selskapet, kassa, tida, seieren og lagringen.
module.exports = {
  navn: 'ut5-bors',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], d = {}, krev = (b, t) => { if (!b) feil.push(t); };
    const Bo = window.Bors, BS = window.BorsSpill, Fi = window.Firma, FS = window.FirmaSpill, SS = window.SelskapSpill, SK = window.Selskap, OS = window.OppstartSpill, SE = window.SeierSpill;
    if (!Bo || !BS || !Fi || !FS || !SS || !SK || !OS || !SE || !window.KOMMANDO) return { ok: false, tekst: 'Bors, BorsSpill, Firma, FirmaSpill, SelskapSpill, OppstartSpill, SeierSpill eller KOMMANDO mangler', data: {} };
    BS.start(); FS.start(); const S = SS.tilstand(); if (!S || !BS.klar() || !FS.klar()) return { ok: false, tekst: 'selskapet, firmaene eller børsen er ikke startet', data: {} };
    const penger = () => OS.tilstand().penger, settPenger = v => { const p = penger(); if (p > v) OS.betal(p - v); else if (p < v) OS.gi(v - p); };
    const sd = S.sider.blå, før = { penger: penger(), S: SK.tilJSON(S), F: Fi.tilJSON(FS.tilstand()), B: Bo.tilJSON(BS.tilstand()), tid, seierTest: SE.test,
      lagring: Object.keys(localStorage).filter(n => /^riksbrudd-(selskap$|firma|bors|seier)/.test(n)).map(n => [n, localStorage.getItem(n)]), logg: typeof loggLinjer !== 'undefined' ? loggLinjer.slice() : null };
    // (ut6-fiksd) firmaet dere eier (Storlia) leverer tømmer til leiren i døgnene vakta spoler: lageret settes tilbake etterpå
    // (18 m³ tømmer ble liggende ute, og oppførsel-vakta (F4) fikk ikke båret sin vare inn før tida var ute)
    const Lr = window.LeirSpill && LeirSpill.tilstand(), lager0 = Lr ? { ...Lr.lager } : null, varer0 = (() => { try { return localStorage.getItem('riksbrudd-varer'); } catch (e) { return null; } })();
    const vent = ms => new Promise(r => setTimeout(r, ms));
    try {
      OS.gi(200e6); BS.nullstill();
      // ---------- 1) andeler i Storlia (nivå 3) ----------
      sd.sum.levert = 10; sd.rykte.pålitelig = 70; krev(SS.nivå().nr === 3, 'nivå 3 ble ikke nådd (' + SS.nivå().nr + ')');
      const pris0 = Fi.vilkår(Fi.finn(FS.tilstand(), 'Storlia Tømmer'), 'felles').pris;
      let r = KOMMANDO({ type: 'borsKjøp', navn: 'Storlia Tømmer', n: 10 }); krev(r.ok, 'kjøp av 10 % ble avvist: ' + (r.feil || ''));
      const vi = Bo.virkning(BS.tilstand(), 'Storlia Tømmer'), pris1 = Fi.vilkår(Fi.finn(FS.tilstand(), 'Storlia Tømmer'), 'felles').pris;
      d.rabatt = [pris0, pris1]; krev(vi.rabatt === .95 && Fi.rabatt('Storlia Tømmer') === .95 && pris1 < pris0, `10 % gir ikke rabatt (${pris0} -> ${pris1})`);
      tid = 7 * 1440; const p0 = penger(); BS.døgn(true); const ub = penger() - p0; d.utbytte = ub;
      krev(ub > 0, 'ingen utbytte etter en uke');
      // ---------- 2) over 50 % ----------
      r = KOMMANDO({ type: 'borsKjøp', navn: 'Storlia Tømmer', n: 42 }); const st = Fi.finn(FS.tilstand(), 'Storlia Tømmer');
      krev(r.ok && st.eier === 'blå' && Bo.virkning(BS.tilstand(), 'Storlia Tømmer').eier, 'over 50 % i Storlia: dere eier det ikke (' + (r.feil || st.eier) + ')');
      // ---------- 3) notering (nivå 4) ----------
      sd.sum.levert = 25; sd.rykte.pålitelig = 85; krev(SS.nivå().nr === 4, 'nivå 4 ble ikke nådd');
      const p1 = penger(); r = KOMMANDO({ type: 'borsNoter', p: 30 }); const B = BS.tilstand();
      d.notering = penger() - p1; krev(r.ok && B.meg.notert && B.meg.egne === 70 && d.notering > 1e6, 'notering ga ikke penger (' + (r.feil || d.notering) + ')');
      const K = BS.kurser(); d.kurs = K.meg; krev(K.meg > 0 && B.meg.uke && B.meg.uke.forventet > 0, 'ingen kurs eller forventet utbytte etter noteringen');
      krev(!!(window.Statistikk && Statistikk.SERIER.kursMeg && Statistikk.GRAFER.kurs), 'kursgrafen mangler i statistikken');
      // ---------- 4) kursen faller ved brudd ----------
      tid = 8 * 1440; BS.døgn(true); B.meg.stemning = 1; const s0 = B.meg.stemning;
      sd.sum.brutt = (+sd.sum.brutt || 0) + 1; tid = 9 * 1440; BS.døgn(true); d.stemning = [s0, B.meg.stemning];
      krev(B.meg.stemning < s0 - .03, `kursen falt ikke ved brudd (${s0} -> ${B.meg.stemning})`);
      // ---------- 6) seier-veien leser børsen ----------
      const inn = BS.seierInn(), pen = SE.bilde().A.blå.penger; d.seier = [pen.verdi, inn.verdier.blå];
      krev(pen.børs && Math.abs(pen.verdi - inn.verdier.blå) < 1, 'penger-veien bruker ikke børsverdien');
      // ---------- 5) fiendtlig oppkjøp -> tapskortet ----------
      B.meg.egne = 40; B.meg.fritt = 9; B.meg.rival.rød = 51; B.meg.rival.grønn = 0; B.meg.inv = {};
      SE.test = true; tid = 10 * 1440; BS.døgn(true); await vent(150); SE.takt(); await vent(100);
      const kort = document.getElementById('krigkort'), vist = !!(kort && kort.classList.contains('avslutning') && kort.classList.contains('på'));
      d.oppkjøp = [B.meg.oppkjøpt, vist ? kort.querySelector('.vei').textContent : ''];
      krev(B.meg.oppkjøpt === 'rød' && SE.bilde().A.rød.penger.nådd, 'oppkjøpet ble ikke registrert som rivalens seier');
      krev(vist && /Tap/.test(d.oppkjøp[1]) && /Penger/.test(d.oppkjøp[1]), 'tapskortet kom ikke: ' + d.oppkjøp[1]);
      if (vist) SE.lukk('videre');
    } catch (e) { feil.push('kastet: ' + e.message); }
    finally {
      SE.test = før.seierTest; { const k = document.getElementById('krigkort'); if (k && k.classList.contains('avslutning')) { k.classList.remove('på', 'avslutning'); k.innerHTML = ''; } }
      tid = før.tid; SS.sett(før.S);
      FS.sett(før.F); FS.tekno(); BS.sett(før.B); settPenger(før.penger);
      for (const n of Object.keys(localStorage).filter(n => /^riksbrudd-(selskap$|firma|bors|seier)/.test(n))) localStorage.removeItem(n);
      for (const [n, v] of før.lagring) localStorage.setItem(n, v);
      if (SE.lesPåNytt) SE.lesPåNytt(); if (SS.lagre) SS.lagre();
      if (Lr && lager0) { for (const k of Object.keys(Lr.lager)) Lr.lager[k] = lager0[k] || 0; Object.assign(Lr.lager, lager0);
        try { if (varer0 === null) localStorage.removeItem('riksbrudd-varer'); else localStorage.setItem('riksbrudd-varer', varer0); } catch (e) { /* privat */ }
        if (window.VarelagerSpill) { try { if (VarelagerSpill.last) VarelagerSpill.last(); VarelagerSpill.avstem(); } catch (e) { /* */ } } }
      if (før.logg && typeof loggLinjer !== 'undefined') { loggLinjer.length = 0; loggLinjer.push(...før.logg); }
    }
    d.tilbake = { penger: penger() === før.penger, tid: tid === før.tid, bors: JSON.stringify(Bo.tilJSON(BS.tilstand())) === JSON.stringify(før.B), lager: !Lr || !lager0 || Object.keys(lager0).every(k => Math.abs((Lr.lager[k] || 0) - lager0[k]) < 1e-6) };
    if (!d.tilbake.penger || !d.tilbake.tid || !d.tilbake.bors || !d.tilbake.lager) feil.push('ble ikke satt tilbake: ' + JSON.stringify(d.tilbake));
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : `rabatt ${d.rabatt.join(' -> ')}, utbytte ${d.utbytte}, notering ${Math.round(d.notering / 1e6)} mill., brudd ${d.stemning.join(' -> ')}, oppkjøp ${d.oppkjøp[0]}`, data: d };
  }),
};
