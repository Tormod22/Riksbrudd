// VAKT «økonomi og region» (natt til 18. nov): tettstedet gir varer etter typen, ruta stenges av en fiende, skatt og opprør,
// svartebørs, veksling olje ↔ diesel, markedets hyller og panelet. Alt settes tilbake.
module.exports = { navn: 'økonomi og region', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const o = {}, RS = window.RegionSpill, RG = window.Region, SS = window.SpilletSpill; if (!RS || !RG || !RS.klar()) return { mangler: true };
    // Vakten antar ingenting om hva andre vakter har etterlatt: den lager sitt eget prøvetettsted 3 km øst for leiren, flytter alle
    // fiendelag langt bort mens den prøver (og setter dem tilbake), og tåler at infrastrukturen ikke er lastet (da lages en tom).
    const l = OppstartSpill.tilstand().leir, utenInfra = typeof INFRA === 'undefined' || !INFRA;
    if (utenInfra) { const tom = {}; for (const k of INFRA_REKKE) tom[k] = []; INFRA = tom; }
    if (!INFRA.tettsted) INFRA.tettsted = [];
    const id = 'øk1', cx = l.x + 3000, cy = l.y, rr = 300, by = { lag: 'tettsted', e: { id, navn: 'Prøveby', folk: 1200 }, bb: [cx - rr, cy - rr, cx + rr, cy + rr], deler: [[cx - rr, cy - rr, cx + rr, cy - rr, cx + rr, cy + rr, cx - rr, cy + rr]] }, c = { x: cx, y: cy };
    INFRA.tettsted.push(by);
    const flyttet = ENHETER.filter(e => e.side !== 'blå').map(e => ({ e, x: e.x, y: e.y, sti: e.sti })); for (const q of flyttet) { q.e.x += 600000; q.e.sti = null; }
    // det som skal settes tilbake
    const før = { eier: TETTSTEDER.get(id), S: JSON.stringify(RS.tilstand()), penger: OppstartSpill.tilstand().penger, test: RS.test, åpen: RS.erÅpen(), lager: JSON.stringify(LeirSpill.tilstand().lager), diesel: LeirSpill.tilstand().drivstoff,
      mat: FolkSpill.tilstand().mat, olje: OLJE.BASER[0].beholdning, n: ENHETER.length, knapphet: SS.knapphet, hyller: JSON.stringify(SS.hyller()), salg: Leir.REGLER.salg, priser: ['tre', 'betong', 'stål'].map(v => Leir.MATERIALER[v].pris), panel: !!document.querySelector('#panel.på') };
    let fiende = null;
    try {
      RS.sett(null); RS.test = true; TETTSTEDER.set(id, { eier: 'blå', inntar: null });
      // 1: typen og det tettstedet gir
      o.type = RS.typeAv(by); const q = RS.status().get(id); o.rute0 = q && q.rute.status; o.gir = RG.girTekst(RS.sum(), v => Math.round(v) + ' kr');
      const P0 = OppstartSpill.tilstand().penger; RS.steg(.5); RS.lever(); o.tjent = OppstartSpill.tilstand().penger - P0;
      // 2: panelet, skatt
      RS.åpne(); o.panel = document.getElementById('region').classList.contains('på') && !!document.querySelector(`#region [data-by="${id}"]`);
      const hard = document.querySelector(`#region [data-by="${id}"] [data-skatt="hard"]`); if (hard) hard.click(); o.hard = RS.tilstand().byer[id].skatt === 'hard';
      const g1 = RS.sum().penger; RS.settSkatt(id, 'vanlig'); o.hardGirMer = g1 > RS.sum().penger * 1.5;
      // 3: en fiende på ruta truer eller stenger den (står et eget lag ved ruta, blir den «truet»)
      fiende = nyttLag('Vaktprøve', c.x + (l.x - c.x) * .1, c.y + (l.y - c.y) * .1, 'rød'); ENHETER.push(fiende);
      o.rute1 = RS.status().get(id).rute.status;
      ENHETER.splice(ENHETER.indexOf(fiende), 1); fiende = null; o.rute2 = RS.status().get(id).rute.status;
      // 4: hard skatt uten garnison ender i opprør
      RS.settSkatt(id, 'hard'); const gar = Garnison.lagI(by, ENHETER.filter(s => s.side === 'blå')).length > 0;
      for (let i = 0; i < 14; i++) RS.steg(.5); o.opprør = gar ? RS.tilstand().byer[id].uro : Garnison.tilstand(TETTSTEDER, id).eier === null;
      // 5: svartebørsen
      RS.børsNå(['våpen']); const P1 = OppstartSpill.tilstand().penger, k = RS.kjøp('våpen'); o.børs = !!k.ok && OppstartSpill.tilstand().penger === P1 - RG.Bors.VARER.våpen.pris && RS.tilstand().har.våpen === 1 && !!RS.kjøp('våpen').feil;
      // 6: veksling (uten tank: beskjed; ellers flyttes mengdene)
      OLJE.BASER[0].beholdning = 40; const L = LeirSpill.tilstand(), d0 = L.drivstoff, v = RS.veksle('diesel');
      o.veksle = v.feil ? /dieseltank/.test(v.feil) && L.drivstoff === d0 : L.drivstoff === d0 + v.liter && OLJE.BASER[0].beholdning === 40 - v.tonn;
      // 7: markedets hyller (bare i det ekte spillet – her slått på for prøven)
      SS.knapphet = true; SS.settPriser(); const H = SS.hyller(); H.tre = 3; const t0 = L.lager.tre || 0, r = Leir.kjøpMateriale(L, 'tre', 10, OppstartSpill.betal);
      o.hylle = !r.feil && Math.abs(r.mengde - 3) < 1e-6 && Math.abs((L.lager.tre || 0) - t0 - 3) < 1e-6 && !!Leir.kjøpMateriale(L, 'tre', 10, OppstartSpill.betal).feil && Leir.REGLER.salg < .6;
      // 8: leveranse av mat, og motstanderens fordel av et tettsted
      const F = FolkSpill.tilstand(), m0 = F.mat; RS.tilstand().pott.mat = 3.4; RS.lever(); o.mat = F.mat === m0 + 3;
      TETTSTEDER.set(id, { eier: 'rød', inntar: null }); RS.åpne(); const f = RS.fordel('rød'); o.fordel = f.antall === 1 && (f.treff > 1 || f.forsterk > 1) && RS.fordel('blå').treff === 1;
    } catch (e) { o.feil = String(e && e.message || e); }
    // tilbake
    if (fiende && ENHETER.includes(fiende)) ENHETER.splice(ENHETER.indexOf(fiende), 1);
    SS.knapphet = før.knapphet; const H = SS.hyller(), HF = JSON.parse(før.hyller); for (const k of Object.keys(HF)) H[k] = HF[k]; SS.settPriser();
    Leir.REGLER.salg = før.salg; ['tre', 'betong', 'stål'].forEach((v, i) => { Leir.MATERIALER[v].pris = før.priser[i]; });
    TETTSTEDER.delete(id); for (const q of flyttet) { q.e.x = q.x; q.e.y = q.y; q.e.sti = q.sti; }
    { const i = INFRA.tettsted.indexOf(by); if (i >= 0) INFRA.tettsted.splice(i, 1); } if (utenInfra) INFRA = null;
    RS.sett(JSON.parse(før.S)); RS.lagre(); RS.status(); RS.test = før.test; if (!før.åpen) RS.lukk();
    const L = LeirSpill.tilstand(); L.lager = JSON.parse(før.lager); L.drivstoff = før.diesel; FolkSpill.tilstand().mat = før.mat; OLJE.BASER[0].beholdning = før.olje;
    const P = OppstartSpill.tilstand().penger; if (P < før.penger) OppstartSpill.gi(før.penger - P); else if (P > før.penger) OppstartSpill.betal(P - før.penger);
    LeirSpill.lagre(); skitten = true; o.tilbake = OppstartSpill.tilstand().penger === før.penger && ENHETER.length === før.n && flyttet.every(q => q.e.x === q.x) && !(INFRA && INFRA.tettsted.includes(by));
    return o; });
  if (d.mangler) return { ok: false, tekst: 'RegionSpill mangler eller er ikke startet', data: d };
  const ok = !d.feil && !!d.type && d.rute0 === 'åpen' && d.tjent > 0 && d.panel && d.hard && d.hardGirMer && d.rute1 !== 'åpen' && d.rute2 === 'åpen' && d.opprør && d.børs && d.veksle && d.hylle && d.mat && d.fordel && d.tilbake;
  return { ok, tekst: `Prøvebyen er ${d.type} og gir ${d.gir} per døgn (${d.tjent} kr på et halvt døgn), panelet ${d.panel}, hard skatt ${d.hard}/${d.hardGirMer}, rute ${d.rute0} → ${d.rute1} → ${d.rute2}, opprør ${d.opprør}, svartebørs ${d.børs}, veksling ${d.veksle}, tomme hyller ${d.hylle}, mat levert ${d.mat}, motstanderens fordel ${d.fordel}, satt tilbake ${d.tilbake}` + (d.feil ? ' – FEIL: ' + d.feil : ''), data: d };
} };
