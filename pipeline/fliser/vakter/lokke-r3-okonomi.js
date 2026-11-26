// VAKT «økonomi» (kritikerløkka runde 3, 26. nov): (1) tettstedene: forvaltningen tar en del av skatten, et nytt tettsted betaler gradvis,
// og en by på 20 000 gir høyst én middels kontrakt; (2) Penger inn: byggekjøp, diesel og materialer får egne kategorier (før «annet»),
// og aldri to linjer med samme navn; skatten står som «anslag nå» og «siste døgn»; (3) radiorådet nevner ikke masten for et lag med
// håndradio; (4) bålplassen følger bakken (ingen grunnmur); (5) opplæringens «Reparer byggene» er gjort når reparasjonen er satt i gang.
// Setter alt tilbake (kasse, lager, diesel, bygg, dagbok, tid).
module.exports = { navn: 'løkka r3: økonomi (tettsteder, kategorier, radioråd, grunnmur, opplæring)', kjør: async (pg) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    for (const n of ['PengerSpill', 'Penger', 'Region', 'RegionSpill', 'Selskap', 'Leir', 'LeirSpill', 'OppstartSpill', 'Kontrollrom', 'Opplaering']) krev(!!window[n], 'mangler ' + n);
    if (ut.feil.length) return ut;
    const O = OppstartSpill.tilstand(), PS = PengerSpill.tilstand(), L = LeirSpill.tilstand();
    const før = { kasse: O.penger, tid, tempo, B: PS ? JSON.stringify(PS.B) : null, sist: PS && PS.sist, lager: JSON.stringify(L.lager), diesel: L.drivstoff, nb: L.bygg.length, neste: L.neste, nj: L.nesteJobb };
    try {
      tempo = 0; krev(!!PS, 'PengerSpill er ikke startet');
      // 1) tettstedene
      const RG = Region, st = { loj: RG.lojMål({ skatt: 'vanlig', strøm: true, garnison: true }), skatt: 'vanlig', strøm: true, rute: 'åpen' };
      const full = RG.gir(20000, 'by', { ...st, holdt: 99 }).penger, ny = RG.gir(20000, 'by', { ...st, holdt: 0 }).penger, middels = Selskap.betaling('hent', Selskap.REGLER.rykte.start, 'vanlig', 8000, 0);
      ut.by = [Math.round(ny), Math.round(full), middels];
      krev(full <= middels, `en by på 20 000 gir ${Math.round(full)} kr per døgn – mer enn en middels kontrakt (${middels})`);
      krev(ny < .5 * full, `et nytt tettsted betaler full skatt med en gang (${Math.round(ny)} av ${Math.round(full)})`);
      krev(RG.REGLER.forvaltning > 0 && RG.skatt(20000, 'by', st).forvaltning > 0, 'forvaltningen tar ingenting');
      // 2) kategoriene i dagboka: kjøp gjennom spill/leir.js
      const dn = PengerSpill.døgnNå(), p0 = { ...(PengerSpill.døgn(dn).p || {}) };
      const plass = Leir.kapasitet ? Leir.kapasitet(L) - L.drivstoff : 0;
      if (plass >= 10) { const r = Leir.kjøpDrivstoff(L, 10, OppstartSpill.betal); krev(!r.feil, 'kjøpDrivstoff: ' + r.feil); }
      const rm = Leir.kjøpMateriale(L, 'tre', .5, OppstartSpill.betal); krev(!rm.feil || /fullt/.test(rm.feil), 'kjøpMateriale: ' + rm.feil);
      const leir = O.leir, b = Leir.bygg(L, { type: 'sandsekkvoll', x: leir.x + 900, y: leir.y + 900, ret: 0 }, OppstartSpill.betal); krev(!b.feil, 'bygg: ' + b.feil);
      const p1 = PengerSpill.døgn(dn).p || {}, ny1 = k => (p1[k] || 0) - (p0[k] || 0);
      ut.poster = { bygg: ny1('bygg'), diesel: ny1('diesel'), materialer: ny1('materialer'), annet: ny1('annet') };
      krev(ny1('bygg') < 0, 'byggekjøpet står ikke under «bygg»'); if (plass >= 10) krev(ny1('diesel') < 0, 'dieselen står ikke under «diesel»');
      if (!rm.feil) krev(ny1('materialer') < 0, 'materialene står ikke under «materialer»'); krev(ny1('annet') === 0, 'kjøp i leiren ble ført som «annet»');
      const D = { p: { bygg: -17e6, annet: -4e5, avtaler: -8e6, lønn: -2e5, vedlikehold: -1e5, diesel: -5e4 } }, t = Penger.poster(D, false, v => v + ' kr', 4), navn = t.split(', ').map(x => x.replace(/ [\d.e+-]+ kr$/, ''));
      ut.posterTekst = t; krev(new Set(navn).size === navn.length && navn.includes('avtaler'), 'to linjer med samme navn eller ingen «avtaler»: ' + t);
      const lin = Penger.linjer({ oppdrag: [], hogst: {}, tettsteder: { antall: 1, kr: 900000, siste: 300000 }, lager: {} }, v => v + ' kr').find(l => l.id === 'region');
      ut.region = lin && lin.tekst; krev(lin && /Anslag nå/.test(lin.tekst) && /siste døgn kom det inn/.test(lin.tekst), 'Penger inn skiller ikke anslag og siste døgn: ' + (lin && lin.tekst));
      // 3) radiorådet
      const h = Kontrollrom.radioRåd({ hånd: ['Vaktlaget'], felt: [], mast: 15000, feltNår: 15000, avstand: 12000, terreng: false });
      ut.radio = h; krev(/feltradio/.test(h) && !/kraftigere radiomast|Leir → radiomast/.test(h), 'håndradio-laget får råd om radiomast: ' + h);
      // 4) bålplassen følger bakken
      const skrå = (x, y) => (x - leir.x) * .6, gB = Leir.grunn({ type: 'bålplass', x: leir.x, y: leir.y, ret: 0 }, skrå), gK = Leir.grunn({ type: 'brakke', x: leir.x, y: leir.y, ret: 0 }, skrå);
      ut.grunn = [gB.forskjell, Math.round(gK.forskjell * 10) / 10];
      krev(!!Leir.BYGG.bålplass && gB.forskjell === 0 && gK.forskjell > 1, `bålplassen får grunnmur (${gB.forskjell} m)`);
      // 5) opplæringen
      const s = Opplaering.STEG.find(q => q.id === 'reparer');
      krev(!!s && s.ferdig({ angrep: true, skadet: 1, reparert: true }) && !s.ferdig({ angrep: true, skadet: 1 }), '«Reparer byggene» blir ikke gjort når reparasjonen er satt i gang');
    } catch (e) { ut.feil.push('unntak: ' + (e && e.message || e)); }
    // tilbake
    L.bygg.length = før.nb; L.neste = før.neste; L.nesteJobb = før.nj; L.lager = JSON.parse(før.lager); L.drivstoff = før.diesel;
    const P = O.penger; if (P < før.kasse) OppstartSpill.gi(før.kasse - P); else if (P > før.kasse) OppstartSpill.betal(P - før.kasse);
    if (PS && før.B) { PS.B = JSON.parse(før.B); PS.sist = O.penger; PengerSpill.lagre(); }
    tid = før.tid; tempo = før.tempo; LeirSpill.lagre(); skitten = true;
    krev(O.penger === før.kasse && L.bygg.length === før.nb, 'satt ikke tilbake');
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join(' · ') : `by 20 000: ${d.by[0]} kr første døgn, ${d.by[1]} kr full (kontrakt ${d.by[2]}); poster ${JSON.stringify(d.poster)}; grunnmur bålplass ${d.grunn[0]} m / brakke ${d.grunn[1]} m`, data: d };
} };
