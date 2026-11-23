// VIRKNING I LEIRBYGGENE, visningen (R18-B). Reglene og tabellen ligger i spill/leirvirkning.js; her kobles de på der spillet regner:
//  - Folk (moral, helse, matsvinn, arbeidstempo) gjennom SamfunnSpill.valg, vaktenes varsling gjennom SamfunnSpill.varsling
//  - strømnettet (Leir.nettFaktor), lager/senger/strøm i Leir.BYGG (Leirvirkning.brukPå)
//  - KROKER.ild (vern), KROKER.sikt (sikt), KROKER.ser (radar, poster), KROKER.fart (hindringer sinker fiender)
//  - KROKER.sim: trening, ammunisjon, leging av soldater, reparasjon og fylling av kjøretøy, vaktdroner
//  - røvernes bytte (Spillet.Trussel.bytte), fangenes rømming (Krig.rømmer), skade på parkerte kjøretøy (Enheter.skad)
// Kontrollrommet (radio, satellitt) og brønnen spør LeirvirkningSpill direkte (kontrollrom-visning.js, overlev.js).
// Bygg som ikke finnes i leiren, endrer ingenting: alle faktorene er 1 og alle tillegg 0 uten dem.
(function () {
  'use strict';
  const LV = window.Leirvirkning, LB = window.Leir; if (!LV || !LB || typeof KROKER === 'undefined') return;
  const L = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const mangler = () => { try { return (window.LeirSpill && LeirSpill.siste && LeirSpill.siste().mangler) || new Set(); } catch (e) { return new Set(); } };
  // lista over byggene som virker, regnet ut høyst hvert 0,5 s (krokene for treff og sikt spørres mange ganger per runde)
  let A = [], Asist = -1, U = null;
  function oppdater(tvang) {
    const t = performance.now(); if (!tvang && t - Asist < 500) return; Asist = t;
    const l = L(); A = l ? LV.aktive(l, LB, mangler()) : []; U = l ? LV.leiren(l, LB, mangler(), A) : null;
  }
  const leiren = () => { oppdater(); return U || LV.leiren(null, LB, new Set()); };
  const natt = () => LV.erNatt(((typeof tid !== 'undefined' ? tid : 0) / 60) % 24);
  const ved = (x, y) => { oppdater(); return A.length ? LV.ved(null, LB, null, x, y, natt(), A) : null; };

  // ---------- Leir.BYGG: lager, senger, strøm og teksten ----------
  const bruk = () => LV.brukPå(LB.BYGG);
  bruk(); window.addEventListener('riksbrudd-spill', bruk);
  LB.nettFaktor = () => leiren().nett;

  // ---------- Folk: moral, helse, mat og tempo (SamfunnSpill.valg pakkes inn én gang) ----------
  function koblFolk() {
    const SA = window.SamfunnSpill;
    if (SA && SA.valg && !SA.__lvValg) { const før = SA.valg; SA.__lvValg = true;
      const ny = g => { const v = før(g), u = leiren(); if (!u.moral && !u.helse && u.mat === 1 && u.tempo === 1) return v;
        return { ...v, moralTillegg: (v.moralTillegg || 0) + u.moral, helseTillegg: (v.helseTillegg || 0) + u.helse,
          matFaktor: (v.matFaktor > 0 ? v.matFaktor : 1) * u.mat, tempoFaktor: (v.tempoFaktor > 0 ? v.tempoFaktor : 1) * u.tempo }; };
      // morgenmøtet (morgen-visning.js) pakker inn etter oss og sjekker sitt eget merke – behold det hvis det finnes
      if (før.morgen) ny.morgen = true; SA.valg = ny; }
    if (SA && SA.varsling && !SA.__lvVarsling) { SA.__lvVarsling = true; const før = SA.varsling; SA.varsling = () => før() * leiren().varsling; }
  }
  // ---------- røvernes bytte, fangene og de parkerte kjøretøyene ----------
  function koblAndre() {
    const T = window.Spillet && Spillet.Trussel;
    if (T && T.bytte && !T.__lv) { T.__lv = true; const før = T.bytte;
      const ny = h => { const b = før(h), f = leiren().bytte; if (f >= 1 || !b) return b;
        for (const k of Object.keys(b.lager || {})) b.lager[k] = Math.floor(b.lager[k] * f * 10) / 10; b.diesel = Math.floor((b.diesel || 0) * f); return b; };
      T.bytte = ny; }
    const K = window.Krig;
    if (K && K.rømmer && !K.__lv) { K.__lv = true; const før = K.rømmer; K.rømmer = (n, vakter, min, rng) => før(n, (vakter || 0) + leiren().fangevakt, min, rng); }
    const E = window.Enheter;
    if (E && E.skad && !E.__lv) { E.__lv = true; const før = E.skad;
      const ny = (kj, treff, art) => { const v = kj && kj.side !== 'rød' && kj.side !== 'grønn' ? ved(kj.x, kj.y) : null; return før(kj, v ? treff * v.skjerm : treff, art); };
      E.skad = ny; }
  }

  // ---------- kroker for kamp, sikt og fart ----------
  KROKER.ild.push((a, b) => { if (!b || b.side !== 'blå') return 1; const v = ved(b.x, b.y); return v ? v.vern : 1; });
  KROKER.sikt.push(s => { if (!s || s.side !== 'blå') return 1; const v = ved(s.x, s.y); return v ? v.sikt : 1; });
  KROKER.ser.push(e => { if (!e || e.side === 'blå') return false; oppdater(); return !!(A.length && LV.ser(null, LB, null, e, A)); });
  (KROKER.fart = KROKER.fart || []).push(s => { if (!s || s.side === 'blå') return 1; const v = ved(s.x, s.y); return v ? v.sinke : 1; });

  // ---------- hvert spillminutt: trening, ammunisjon, leging, kjøretøy, droner ----------
  const tank = k => { const F = window.Forsyning && Forsyning.REGLER && Forsyning.REGLER.drivstoff; return (F && F[k.type] && F[k.type].tank) || .3; };
  const målt = { erf: 0, ammo: 0, leging: 0, reparer: 0, fyll: 0, liter: 0 };   // det som er gitt (vakta i sjekk.js leser det)
  function minutt(dt) {
    const l = L(); if (!l || !A.length) return;
    if (typeof ENHETER !== 'undefined') for (const s of ENHETER) {
      if (s.side !== 'blå' || !Array.isArray(s.menn)) continue; const v = ved(s.x, s.y); if (!v) continue;
      // trening: bare lag som står i ro (ikke på marsj) og ikke er i kamp
      if (v.erf > 0 && !s.sti && !s.iKamp) for (const m of s.menn) if (m.hp > 0) { const før = m.erf || 0; m.erf = LV.trening(før, v.erf, dt); målt.erf += m.erf - før; }
      if (v.ammo > 0 && s.ammo !== undefined && s.ammo < 1) { const før = s.ammo; s.ammo = Math.min(1, s.ammo + v.ammo * dt / 60); målt.ammo += s.ammo - før; }
      if (v.leging > 0) for (const m of s.menn) if (m.hp > 0 && m.hp < 1) { const før = m.hp; m.hp = Math.min(1, m.hp + v.leging * dt / 60); målt.leging += m.hp - før; }
    }
    for (const k of window.KJORETOY || []) {
      if (k.side && k.side !== 'blå') continue; const v = ved(k.x, k.y); if (!v) continue;
      if (v.reparer > 0 && k.skade > 0) { const før = k.skade; k.skade = Math.max(0, k.skade - v.reparer * dt / 60); målt.reparer += før - k.skade; }
      if (v.fyll > 0 && k.drivstoff !== undefined && k.drivstoff < 1) { const f = LV.fylling(k.drivstoff, v.fyll, dt, tank(k), k.antall || 1, l.drivstoff || 0);
        if (f.andel > 0) { k.drivstoff = Math.min(1, k.drivstoff + f.andel); l.drivstoff = Math.max(0, (l.drivstoff || 0) - f.liter); målt.fyll += f.andel; målt.liter += f.liter; } }
    }
    droner(dt);
  }
  // VAKTDRONENE: sirkler i en ring rundt leiren; en drone som er tom for batteri, erstattes etter en halv spilltime
  const DR = { ring: 1500, lading: 30 };   // meter ut fra leiren, spillminutter før neste drone (Claudes forslag)
  let ventTil = 0;
  function droner() {
    const D = window.DRONER, S = window.OppstartSpill && OppstartSpill.tilstand(), E = window.Enheter; if (!D || !S || !S.leir || !E || !E.nyDrone) return;
    const vil = leiren().drone, mine = D.filter(d => d.leirvakt && d.fase !== 'tom'), nå = typeof tid !== 'undefined' ? tid : 0;
    // færre bygg enn droner (revet, uten strøm): de overtallige lander
    while (mine.length > vil) { const d = mine.pop(); d.fase = 'tom'; d.igjen = 0; }
    for (const d of mine) if (d.fase === 'over målet') { d.vinkel = (d.vinkel || 0) + Math.PI / 3; d.mål = [S.leir.x + Math.cos(d.vinkel) * DR.ring, S.leir.y + Math.sin(d.vinkel) * DR.ring]; }
    if (mine.length < vil && nå >= ventTil) { const a = mine.length * Math.PI;
      const d = E.nyDrone({ navn: `Vaktdrone ${mine.length + 1}`, x: S.leir.x, y: S.leir.y, mål: [S.leir.x + Math.cos(a) * DR.ring, S.leir.y + Math.sin(a) * DR.ring] });
      d.leirvakt = true; d.vinkel = a; D.push(d); ventTil = nå + DR.lading; if (typeof logg === 'function') logg(`${d.navn} er i lufta over leiren.`); }
  }
  let akk = 0;
  KROKER.sim.push(dt => { koblFolk(); koblAndre(); akk += dt; if (akk < 1) return; const d = akk; akk = 0; oppdater(true); minutt(d); });

  // ---------- byggpanelet: hva bygget gjør nå ----------
  // Tekst til byggpanelet (leir-visning.js visByggPanel): virkningen, nivået og om den virker nå
  function panel(b) {
    const B = LB.BYGG[b.type]; if (!B) return '';
    const t = LV.panelTekst(b.type, B, b.nivå), v = LV.VIRKNING[b.type];
    if (!v || v.tekst === LV.PYNT) return t;
    const f = LV.styrke(b, LB, mangler(), B);
    const nå = !LB.ferdig(b) ? ' Virker når bygget er ferdig.' : f === 0 ? (b.av ? ' Slått av: virker ikke.' : mangler().has(b.id) ? ' Uten strøm: virker ikke nå.' : ' Virker ikke nå.') : f < 1 ? ' Hardt skadet: virker halvt.' : '';
    let ekstra = '';
    if (v.drone && v.trenger && f > 0 && !(L() && L().bygg.some(q => q.type === v.trenger && LB.virker(q)))) ekstra = ` Mangler ${(LB.BYGG[v.trenger] || {}).navn || v.trenger}.`;
    if (v.r && f > 0 && typeof ENHETER !== 'undefined') { const n = ENHETER.filter(s => s.side === 'blå' && Array.isArray(s.menn) && Math.hypot(s.x - b.x, s.y - b.y) <= v.r).length; if (v.vern || v.erf || v.ammo || v.leging) ekstra += ` ${n ? n + ' lag innen ' + v.r + ' m nå' : 'Ingen lag innen ' + v.r + ' m nå'}.`; }
    return t + nå + ekstra;
  }
  window.LeirvirkningSpill = { kobl: () => { koblFolk(); koblAndre(); }, steg: dt => { oppdater(true); minutt(dt); }, leiren, ved, panel, oppdater: () => oppdater(true), målt: () => ({ ...målt }), aktive: () => { oppdater(); return A; }, bruk, droner: () => (window.DRONER || []).filter(d => d.leirvakt && d.fase !== 'tom').length };
})();
