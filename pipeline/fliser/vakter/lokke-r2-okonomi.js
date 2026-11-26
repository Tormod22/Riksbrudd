// VAKT «økonomi» (kritikerløkka runde 2, 26. nov): (1) én dagbok over inn og ut – gi/betal føres, og morgenrapporten bruker den;
// (2) vedlikehold av byggene trekkes hver spilltime og står i Penger inn; (3) eskortene betaler etter risiko (rolig / meldt bakhold);
// (4) folketallet øverst viser de i troppene etter et pluss («8 +4»); (5) samme døde står bare én gang; (6) statusmeldinger om et lag
// gjentas ikke; (7) karavanen uten tank sier det; (8) leveringsøyeblikket. Setter alt tilbake (kasse, tid, dagbok, lag, test-flagg).
module.exports = { navn: 'løkka r2: økonomi, dagbok og tekster', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); }, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
    for (const n of ['PengerSpill', 'Penger', 'Selskap', 'SelskapSpill', 'Dagbok', 'Leir', 'LeirSpill', 'OppstartSpill', 'LoggDemp', 'Samfunn', 'Morgen', 'FolkSpill']) krev(!!window[n], 'mangler ' + n);
    if (ut.feil.length) return ut;
    const O = OppstartSpill.tilstand(), PS = PengerSpill.tilstand();
    const før = { kasse: O.penger, tid, tempo, B: PS ? JSON.stringify(PS.B) : null, vAkk: PS && PS.vAkk, vTid: PS && PS.vTid, sist: PS && PS.sist, dt: PengerSpill.driftTest, st: SelskapSpill.test, n: ENHETER.length };
    try {
      tempo = 0; krev(!!PS, 'PengerSpill er ikke startet');
      // 1) dagboka: gi og betal føres i døgnet nå
      const dn = PengerSpill.døgnNå(), d0 = JSON.parse(JSON.stringify(PengerSpill.døgn(dn)));
      OppstartSpill.gi(1234000); OppstartSpill.betal(234000); const d1 = PengerSpill.døgn(dn);
      krev(d1.inn - d0.inn === 1234000 && d1.ut - d0.ut === 234000, `dagboka førte ikke gi/betal: inn +${d1.inn - d0.inn}, ut +${d1.ut - d0.ut}`);
      // en endring utenom gi/betal (røverbytte rett i kassa) føres ved avstemmingen
      O.penger += 50000; PengerSpill.avstem(); krev(PengerSpill.døgn(dn).inn - d0.inn === 1284000, 'avstemmingen førte ikke en endring utenom gi/betal');
      ut.sum = PengerSpill.sumTekst(); krev(/Så langt i dag: .+ inn, .+ ut/.test(ut.sum), 'Penger inn viser ikke dagboka: ' + ut.sum);
      const r = Dagbok.rapport({ dag: 3, folk: 8, moral: 80, matDager: 5, diesel: 0, dieselBruk: 0, kassa: 20.8e6, kassaFør: 16.9e6, bok: { inn: 6.3e6, ut: 2.4e6 }, faste: 3e5, mål: null });
      ut.rapport = r.tekst; krev(/siste døgn: 6,3 mill\. kr inn, 2,4 mill\. kr ut/.test(r.tekst) && !/\+3,9/.test(r.tekst), 'morgenrapporten bruker ikke dagboka: ' + r.tekst);
      // 2) vedlikehold: to spilltimer trekker perDøgn × 2/24 (bygg legges inn midlertidig)
      const L = LeirSpill.tilstand(), nb = L.bygg.length; L.bygg.push({ id: 99901, type: 'brakke', x: 0, y: 0, ret: 0, igjen: 0, totalt: 60, pris: 4e6, mat: {}, nivå: 1, hp: 1, nr: 0, arbeid: null });
      const v = PengerSpill.vedlikehold(); krev(v.perDøgn >= 40000, 'vedlikeholdet mangler: ' + v.perDøgn);
      PengerSpill.driftTest = true; PS.vTid = tid; PS.vAkk = 0; const k0 = O.penger; tid += 120; PengerSpill.driftSteg(); const trukket = k0 - O.penger;
      krev(Math.abs(trukket - v.perDøgn / 12) <= 2, `vedlikeholdet trakk ${trukket} kr på 2 t (ventet ${Math.round(v.perDøgn / 12)})`);
      krev((PengerSpill.døgn(PengerSpill.døgnNå()).p || {}).vedlikehold < 0, 'vedlikeholdet står ikke i dagboka');
      ut.faste = PengerSpill.fasteTekst(); krev(/vedlikehold/.test(ut.faste) && /lønn/.test(ut.faste), 'Penger inn sier ikke de faste utgiftene');
      L.bygg.length = nb;
      // 3) eskorte etter risiko
      const leir = O.leir, st = [{ navn: 'A', x: leir.x + 6000, y: leir.y, slag: 'tettsted', id: 'va' }, { navn: 'B', x: leir.x - 6000, y: leir.y + 3000, slag: 'tettsted', id: 'vb' }];
      const R = { rolig: [], bakhold: [] }; for (let i = 0; i < 40; i++) for (const k of Selskap.lagTilbud(Selskap.ny(leir), 'blå', i * 7, st, Selskap.lagRand(i + 1))) if (k.type === 'eskorte' && R[k.risiko]) R[k.risiko].push(k.betaling);
      const sn = a => a.reduce((s, x) => s + x, 0) / (a.length || 1); ut.eskorte = [R.rolig.length, Math.round(sn(R.rolig)), R.bakhold.length, Math.round(sn(R.bakhold))];
      krev(R.rolig.length && R.bakhold.length && sn(R.bakhold) >= 2 * sn(R.rolig), 'eskortene betaler ikke etter risiko: ' + ut.eskorte.join(' / '));
      // 4) folketallet: et lag fra folket gir «+n»
      const t = nyttLag('Vaktprøve', leir.x + 50, leir.y, 'blå'); t.fraFolk = true; t.menn.length = 3; ENHETER.push(t); await vent(900);
      ut.folk = $('sFolk').textContent; krev(/^\d+ \+3/.test(ut.folk), 'folketallet viser ikke de i troppene: ' + ut.folk);
      ENHETER.splice(ENHETER.indexOf(t), 1); await vent(900); krev(!/\+/.test($('sFolk').textContent), 'pluss-tallet går ikke bort');
      // 5) samme døde én gang
      const SS = { døde: [], gravlagte: [] }; Samfunn.død(SS, 'Vegard Dahl', 'soldat', 1); Samfunn.død(SS, 'Vegard Dahl', 'soldat', 2); krev(SS.døde.length === 1, 'samme døde står to ganger');
      // 6) statusmeldinger gjentas ikke
      const D = LoggDemp.lag(); let n = 0; for (let i = 0; i < 6; i++) if (D.vurder('Speidertropp 1: planlegger rute …', [], 100 + i * 3)) n++; krev(n === 1, '«planlegger rute …» vist ' + n + ' ganger');
      // 7) karavanen uten tank
      let kar = null; for (let i = 0; i < 300 && !kar; i++) { const s = Morgen.storBeslutning({ dag: 4, folk: 8, arbeidsføre: 8, frie: 2, mat: 30, matDøgn: 5, moral: 60, penger: 30e6, matPris: 3000, trePris: 1e5, lager: { tre: 20 }, diesel: 200, dieselPlass: 200, tank: false, dieselPris: 3000 }, Selskap.lagRand(i + 7), null); if (s && s.id === 'karavane') kar = s; }
      if (kar) krev(!/tankene er fulle/i.test(kar.tekst) && /ingen dieseltank/.test(kar.tekst), 'karavanen: ' + kar.tekst); else ut.karavane = 'ikke prøvd';
      // 8) leveringsøyeblikket (kortet vises, og går bort)
      SelskapSpill.test = true; SelskapSpill.levertØyeblikk({ første: true, giver: { navn: 'Bygdelaget i prøva' }, tittel: 'Prøve' }, 1500000); await vent(400);
      const kort = $('levertkort'); ut.kort = kort ? kort.textContent.slice(0, 80) : (document.querySelector('#morgenkort.på') ? 'venter på morgenmøtet' : null);
      krev(!!kort || /venter/.test(ut.kort || ''), 'leveringskortet kom ikke'); if (kort) { krev(/betalte 1,5 mill\. kr/.test(kort.textContent) && /Neste steg/.test(kort.textContent), 'leveringskortet sier ikke hvem som betalte og neste steg'); kort.remove(); }
    } catch (e) { ut.feil.push('unntak: ' + String(e && e.stack || e).slice(0, 300)); }
    finally {
      tid = før.tid; tempo = før.tempo; O.penger = før.kasse; PengerSpill.driftTest = før.dt; SelskapSpill.test = før.st;
      if (PS) { PS.B = før.B ? JSON.parse(før.B) : { d: {} }; PS.vAkk = før.vAkk; PS.vTid = før.vTid; PS.sist = O.penger; PengerSpill.lagre(); }
      const k = $('levertkort'); if (k) k.remove(); for (let i = ENHETER.length - 1; i >= 0; i--) if (ENHETER[i].navn === 'Vaktprøve') ENHETER.splice(i, 1);
      if (OppstartSpill.lagre) OppstartSpill.lagre();
    }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join(' | ') : `dagbok, vedlikehold (${(d.faste || '').slice(0, 60)}…), eskorte rolig/bakhold ${d.eskorte}, folk «${d.folk}»`, data: d };
} };
