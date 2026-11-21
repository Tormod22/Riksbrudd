'use strict';
// S7 i kartet: tettstedene (INFRA.tettsted) tas med lag, garnisonen forsterkes, tettstedene sender olje til basen.
// Strøm fra kraftverkene (INFRA.kraft, sabotert i INFRA_TILSTAND = uten strøm). Regler: spill/garnison.js.
(function () {
  const G = Garnison, R = G.REGLER, S = G.ny(), byer = () => (INFRA && INFRA.tettsted) || [];
  let akk = 0; const LOGG = new Map();   // tettsted-id -> sist meldt inntak (så loggen ikke fylles)
  window.TETTSTEDER = S;
  const kraft = () => (INFRA && INFRA.kraft || []).map(k => ({ x: k.deler[0][0], y: k.deler[0][1], hel: !window.INFRA_TILSTAND || Odeleggelse.tilstand(INFRA_TILSTAND, 'kraft', k.e.id) === 'hel' }));
  const strømFor = by => G.harStrøm(by, kraft());
  const eierTekst = e => e === 'blå' ? 'ditt' : e ? (window.Fraksjoner && Fraksjoner.FRAKSJONER[e] ? Fraksjoner.FRAKSJONER[e].eieform : 'fiendens') : 'nøytralt';
  const nyMann = rolle => ({ navn: FORNAVN[Math.floor(Math.random() * FORNAVN.length)] + ' ' + ETTERNAVN[Math.floor(Math.random() * ETTERNAVN.length)], rolle, hp: 1, loy: .6 + Math.random() * .3 });
  const hvem = side => window.Fraksjoner && Fraksjoner.FRAKSJONER[side] ? Fraksjoner.FRAKSJONER[side].navn : 'Fienden';
  const byFor = s => byer().find(by => G.inni(by, s.x, s.y));
  const tidTekst = sek => (!isFinite(sek) ? 'for få mann' : sek < 5400 ? Math.round(sek / 60) + ' min' : (Math.round(sek / 360) / 10).toString().replace('.', ',') + ' t');
  // (19. nov) hva et tettsted krever: «trenger ca. 69 mann (minst 35) og ca. 3,8 t»
  // (runde 13, kritiker H: «trenger 5 mann» og «minst 3 mann» om samme sted) begge tallene står alltid: full fart og minst
  const kravTekst = folk => `${G.mannFor(folk) <= 6 ? 'Et lag på ' + G.mannFor(folk) + ' mann' : 'Ca. ' + G.mannFor(folk) + ' mann'}${G.minstFor(folk) < G.mannFor(folk) ? ' (minst ' + G.minstFor(folk) + ')' : ''} tar det på ${tidTekst(G.inntaTid(folk))} uten fiender der`;
  // for regionen (spill/region-visning.js): strømmen til et tettsted og kraftverkene
  window.GarnisonSpill = { strømFor, kraft, byFor, byer, kravTekst, tidTekst, test: false };
  // krigskartet (spill/strategi-visning.js): hva det valgte tettstedet krever
  { const KT = window.KRIG_TILLEGG = window.KRIG_TILLEGG || {}; KT.by = KT.by || [];
    KT.by.push((by, eier) => (eier === 'blå' || !by || !by.e ? null : kravTekst(by.e.folk || 0) + '.')); }

  // ---------- (runde 8) GARNISONENE HOLDER STILLINGEN ----------
  // Kritikken: garnisoner med standardreglene («balansert»: trekk deg når laget er underlegent, eller etter 5 ute) trakk seg ut uten kamp,
  // så tettstedet ble tatt uten kamp. Nå får et eget lag som blir garnison i et tettsted dere holder, reglene «hold stillingen» (kjemp også
  // som underlegne, ingen retrett etter tap, ikke fram) – én gang per opphold, så du kan endre det i lagpanelet (Stridsregler), og det du
  // velger, står. Går laget ut av tettstedet, får det reglene sine tilbake (hvis du ikke har endret dem). Ikke i testene uten GarnisonSpill.test.
  const HOLD = { ild: 'fri', underlegen: 'kjemp', tap: 0, fram: 'nei' }, holder = s => !!s.strid && Object.entries(HOLD).every(([k, v]) => String(s.strid[k]) === String(v));
  const gAuto = () => !navigator.webdriver || !!window.GarnisonSpill.test;
  function holdStilling() { if (!gAuto() || !window.StridSpill || !StridSpill.regel) return;
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || !levende(s) || s.leirvakt || s.forsvar) continue; const by = byFor(s), t = by ? G.tilstand(S, by.e.id) : null, id = t && t.eier === 'blå' ? by.e.id : null;
      if (id && s.garnisonHold !== id) { if (s.garnisonHold === undefined || s.garnisonHold === null) s.garnisonFør = { ...StridSpill.regel(s) }; s.garnisonHold = id;
        if (!holder(s)) { s.strid = window.Strid ? Strid.ren({ ...StridSpill.regel(s), ...HOLD }) : { ...StridSpill.regel(s), ...HOLD }; logg(`${s.navn} er garnison i ${by.e.navn} og holder stillingen (kjemper også mot en sterkere fiende). Vil du at laget skal trekke seg: lagpanelet → Stridsregler.`); } }
      else if (!id && s.garnisonHold) { if (holder(s) && s.garnisonFør) s.strid = s.garnisonFør; s.garnisonHold = null; delete s.garnisonFør; } } }
  window.GarnisonSpill.holdStilling = holdStilling;
  KROKER.sim.push(dt => {
    akk += dt * 3600 / TIME; if (akk < 60) return;   // ett steg per spillminutt
    holdStilling();
    const sek = akk; akk = 0;
    for (const h of G.steg(S, byer(), ENHETER, sek)) {
      const navn = h.by.e.navn, blå = h.side === 'blå';
      // (19. nov) for få mann: meldingen «For få til å ta …» under sier det i stedet
      const forFå = h.hva === 'inntar' && blå && !isFinite(G.tidMed(G.mann(G.lagI(h.by, ENHETER.filter(s => s.side === 'blå'))), h.by.e.folk));
      if (h.hva === 'inntar' && !forFå && (blå || synlig(ENHETER.find(s => s.side === h.side && G.inni(h.by, s.x, s.y)) || {}))) {
        if (performance.now() - (LOGG.get(h.by.e.id) || -1e9) > 5000) { LOGG.set(h.by.e.id, performance.now()); logg(blå ? `Våre lag tar ${navn} (${tidTekst(G.tidMed(G.mann(G.lagI(h.by, ENHETER.filter(s => s.side === 'blå'))), h.by.e.folk))} uten fiender i tettstedet).` : `${hvem(h.side)} er i ${navn}!`); } }
      // (19. nov) store tettsteder trenger flere mann: si fra når laget er for lite
      if (h.hva === 'forFå' && blå) logg(`For få til å ta ${navn} (${nf.format(h.by.e.folk || 0)} innb.): det trengs minst ${h.trengs} mann, dere har ${Math.floor(h.har)}. Send flere lag.`);
      // (runde 7) et tettsted du holdt, er tapt: si det tydelig (motstanderne angriper nå garnisonene dine)
      if (h.hva === 'inntatt') logg(blå ? `${navn} er vårt. ${G.lagI(h.by, ENHETER.filter(s => s.side === 'blå')).map(s => s.navn).join(', ')} er garnison.` : h.fra === 'blå' ? `Vi har mistet ${navn} – ${hvem(h.side)} har tatt det.` : `${hvem(h.side)} har tatt ${navn}${h.fra && h.fra !== h.side ? ' fra ' + hvem(h.fra) : ''}.`);
      if (h.hva === 'strid') logg(`Kamp om ${navn}: ingen tar tettstedet mens begge sider er der.`);
      skitten = true;
    }
    const b = window.OLJE && OLJE.BASER[0];
    for (const by of byer()) { const t = S.get(by.e.id); if (!t || !t.eier) continue;
      const strøm = strømFor(by);
      if (t.eier === 'blå' && b) b.beholdning += G.produksjon(by.e.folk, sek, strøm);
      for (const s of G.lagI(by, ENHETER.filter(s => s.side === t.eier))) for (const [hva, m] of G.forsterk(s, by.e.folk, sek * (t.eier !== 'blå' && window.RegionSpill && RegionSpill.fordel ? RegionSpill.fordel(t.eier).forsterk : 1), strøm, nyMann))
        if (s.side === 'blå') logg(hva === 'ny' ? `${m.navn} (${m.rolle}) er rekruttert i ${by.e.navn} og går inn i ${s.navn}.` : `${m.navn} (${s.navn}) er frisk igjen etter stell i ${by.e.navn}.`);
    }
    // verkstedene i egne tettsteder reparerer kjøretøy: 10 % skade per spilltime (uten strøm 4 %)
    for (const k of KJORETOY) { if (!k.skade || k.sti) continue; const by = byer().find(b => b.bb[0] <= k.x && k.x <= b.bb[2] && b.bb[1] <= k.y && k.y <= b.bb[3] && G.inni(b, k.x, k.y));
      if (!by || G.tilstand(S, by.e.id).eier !== k.side) continue;
      k.skade = Math.max(0, k.skade - .1 * sek / 3600 * (strømFor(by) ? 1 : R.strøm.uten));
      if (!k.skade && k.side === 'blå') logg(`${k.navn} er reparert på verkstedet i ${by.e.navn}.`); }
  });

  // ---------- panelene ----------
  KROKER.lagTekst.push(s => { const by = byFor(s); if (!by) return null; const t = G.tilstand(S, by.e.id);
    return t.eier === s.side ? `garnison i ${by.e.navn}` + (s.side === 'blå' && s.garnisonHold === by.e.id && holder(s) ? ' · holder stillingen' : '') : t.inntar && t.inntar.side === s.side ? `tar ${by.e.navn} (${Math.round(100 * t.inntar.sek / R.innta)} %)` : `i ${by.e.navn}`; });
  KROKER.info.push((o) => {
    if (o.lag === 'kraft') { const t = window.INFRA_TILSTAND ? Odeleggelse.tilstand(INFRA_TILSTAND, 'kraft', o.e.id) : 'hel', x = o.deler[0][0], y = o.deler[0][1];
      const n = byer().filter(by => Math.hypot((by.bb[0] + by.bb[2]) / 2 - x, (by.bb[1] + by.bb[3]) / 2 - y) <= R.strøm.radius).length;
      document.getElementById('hint').textContent = (t === 'hel' ? `Gir strøm til ${n} tettsted${n === 1 ? '' : 'er'} innen ${R.strøm.radius / 1000} km. ` : `Sabotert: tettstedene rundt får strøm bare fra andre kraftverk. `) + document.getElementById('hint').textContent;
      return; }
    if (o.lag !== 'tettsted') return;
    const t = G.tilstand(S, o.e.id), strøm = strømFor(o), sub = document.getElementById('psub');
    sub.textContent += ' · ' + eierTekst(t.eier) + (t.inntar ? ` (${t.inntar.side === 'blå' ? 'vi tar det' : hvem(t.inntar.side) + ' tar det'}: ${Math.round(100 * t.inntar.sek / R.innta)} %)` : '');
    const prod = G.rate(o.e.folk, R.produksjon, strøm), fs = G.rate(o.e.folk, R.forsterkning, strøm), gar = G.lagI(o, ENHETER.filter(s => s.side === t.eier && t.eier));
    document.getElementById('hint').textContent = `${strøm ? 'Har strøm' : 'Uten strøm (ingen hele kraftverk innen ' + R.strøm.radius / 1000 + ' km): ' + Math.round(R.strøm.uten * 100) + ' %'}. `
      + `Som ditt gir det ${nf.format(Math.round(prod * 10) / 10)} t olje i timen til basen og forsterker garnisonen med ${nf.format(Math.round(fs * 10) / 10)} mann i timen. `
      + (t.eier ? (gar.length ? 'Garnison: ' + gar.map(s => s.navn).join(', ') + '.' : 'Ingen garnison.') : '') + (t.eier === 'blå' ? '' : ' ' + kravTekst(o.e.folk || 0) + '.');
  });

  // ---------- tegning: omrisset i eierens farge, og inntak som en ring som fylles ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!INFRA) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    g.save(); g.lineJoin = 'round';
    for (const by of byer()) { const t = S.get(by.e.id); if (!t || (!t.eier && !t.inntar)) continue;
      if (sx(by.bb[2]) < -20 || sx(by.bb[0]) > VW + 20 || sy(by.bb[1]) < -20 || sy(by.bb[3]) > VH + 20) continue;
      if (t.eier && m < 600) { g.beginPath(); for (const a of by.deler) { g.moveTo(sx(a[0]), sy(a[1])); for (let i = 2; i < a.length; i += 2) g.lineTo(sx(a[i]), sy(a[i + 1])); g.closePath(); }
        g.globalAlpha = .12; g.fillStyle = sidefarge(t.eier, 'lys'); g.fill('evenodd'); g.globalAlpha = 1;
        g.strokeStyle = sidefarge(t.eier, 'sti'); g.lineWidth = 2; g.setLineDash([8, 4]); g.stroke(); g.setLineDash([]); }
      const x = sx((by.bb[0] + by.bb[2]) / 2) - 34, y = sy((by.bb[1] + by.bb[3]) / 2) - 4, r = 9;   // vimpelen ved navnet
      // runde 4: tettstedsmerket fra det felles merkesettet (spill/merker.js) i eierens farge – vimpelen bare som reserve
      if (window.Merker) Merker.tegn(g, x, y, { forhold: Merker.forhold(t.eier), slag: 'tettsted', farge: t.eier ? sidefarge(t.eier, 'farge') : 'rgba(40,34,26,.85)', r });
      else { g.fillStyle = t.eier ? sidefarge(t.eier, 'farge') : 'rgba(40,34,26,.85)'; g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(x - 4, y + r); g.lineTo(x - 4, y - r); g.lineTo(x + 8, y - r + 4); g.lineTo(x - 4, y - r + 8); g.closePath(); g.fill(); g.stroke(); }
      if (t.inntar) { const p = t.inntar.sek / R.innta; g.strokeStyle = sidefarge(t.inntar.side, 'sti'); g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + 6.283 * p); g.stroke(); }
    }
    g.restore();
  });
})();
