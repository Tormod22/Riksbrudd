/* S8 – fraksjoner og motstandere: regler og en enkel AI uten DOM (Node: require('./fraksjoner'); nettleser: globalThis.Fraksjoner).
 * Fraksjonene er oppdiktede politiske bevegelser (designdokumentet/HANDOFF.md): spilleren er Riksrådet (blå), AI-en styrer
 * Kystalliansen (rød) og Folkefronten (grønn). AI-en tenker for hvert lag for seg: trekk tilbake når laget er slått ut, hent
 * forsyninger/stell i et eget tettsted, angrip fiender laget ser når det er sterkt nok, ellers ta det nærmeste tettstedet som ikke
 * er ditt og hold det med ett lag (garnison). Tallene er forslag.
 */
(function (rot) {
  'use strict';
  const FRAKSJONER = {   // akse: [sentralisme, marked, tradisjon] (0–1)
    blå: { navn: 'Riksrådet', eieform: 'Riksrådets', farge: '#3b5878', lys: '#5b7ea8', sti: 'rgba(130,170,220,.9)', akse: [.9, .35, .2] },
    rød: { navn: 'Kystalliansen', eieform: 'Kystalliansens', farge: '#8f3c2f', lys: '#b5503d', sti: 'rgba(225,125,95,.9)', akse: [.3, .9, .35] },
    grønn: { navn: 'Folkefronten', eieform: 'Folkefrontens', farge: '#3f6b3a', lys: '#6f9a5f', sti: 'rgba(140,190,120,.9)', akse: [.15, .25, .8] },
  };
  const REGLER = {
    tenk: 600,             // spillsekunder mellom hver gang et AI-lag vurderer situasjonen
    angrep: 1500,          // meter: fiender laget ser innenfor dette vurderes
    overtak: .8,           // angrip når egen styrke ≥ 0,8 × fiendens
    såret: 3,              // så mange ute (sårede/falne) før laget søker stell i et eget tettsted
    ammoLav: .3,           // ammunisjon under dette: hent forsyninger
    rekkevidde: 30000,     // meter: tettsteder lenger unna enn dette tas ikke
    forsterkning: { hver: 6 * 3600, maks: 3 },   // nytt lag hver 6. spilltime ved startstedet, så lenge fraksjonen har færre enn 3
    påfyll: .25,           // ammunisjon per spilltime for lag i eget tettsted (alle sider)
    // BEDRE AI (17. nov, brukeren: «enda flere måter å forbedre fiendens AI»). Tallene er Claudes forslag.
    samlet: 1500,          // meter: venner nærmere enn dette teller med når laget vurderer et angrep (de slåss sammen)
    samle: 5000,           // meter: er laget underlegent alene, går det mot en venn innen dette i stedet for å flykte
    støtte: 5000,          // meter: et lag som blir beskutt, får hjelp av venner innen dette
    minne: 120,            // spillminutter fraksjonen husker hvor den sist så en fiende
    jakt: 6000,            // meter: så langt går et lag for å lete der fienden sist ble sett
    tapt: 2.5,             // et tettsted fraksjonen har mistet, teller så mye «nærmere» (vil ta det tilbake)
    leirVekt: 1500,        // spillerens leir teller som et tettsted med så mange innbyggere når fraksjonen vet hvor den er
    stil: { rød: { overtak: .7, navn: 'pågående' }, grønn: { overtak: 1, navn: 'forsiktig' } },   // Kystalliansen tar sjanser, Folkefronten gjør det ikke
    // KJØRETØY OG STILLINGER (17. nov, brukeren: «at fienden bruker kjøretøy eller bygger egne stillinger»)
    bil: { langt: 3000, nær: 200, av: 800 },        // kjør når målet er over 3 km unna og lastebilen står innen 200 m; gå av når en fiende ses innen 800 m
    stilling: { etter: 120, avstand: 300, vern: .6, radius: 25, maks: 4 },   // garnison i 120 min bygger en stilling (treff ×0,6 innen 25 m); høyst 4 per fraksjon
    lagPerBy: .5, lagMaks: 6,   // forsterkninger: taket vokser med et halvt lag per tettsted fraksjonen holder (høyst 6)
    // KRIGEN SKAL IKKE AVGJØRES DAG 1 (19. nov, kritikken: «Kystalliansen tok Stavanger/Sandnes kl. 14 dag 1»). Claudes forslag:
    //  regionFred: så mange døgn (på «Vanlig»; delt på fiendens faktor, 1,5–4) samler motstanderne styrker i sitt eget tettsted og tar
    //    ingen andre – de forsvarer seg, men går ikke ut for å ta tettsteder;
    //  lagPerDøgn: taket for antall lag vokser med ett lag for hvert andre døgn (de bygger seg opp over dager);
    //  startMaks: startstedet er helst et tettsted med høyst så mange innbyggere (ikke storbyen ved siden av leiren).
    //  storEtter: tettsteder som trenger mer enn ett lag (minst over «ettLag» mann) blir mål først så mange døgn etter fredstiden –
    //    de tar småstedene først (gjennomspillingen 19. nov: rett etter fredstiden gikk begge mot Stavanger/Sandnes)
    regionFred: 2.5, lagPerDøgn: .5, startMaks: 8000, storEtter: 1, ettLag: 12,
  };
  // døgnene med fred i regionkrigen for en fiendefaktor f (vanskelighetsgraden: lett 0,75, vanlig 1, hard 1,3)
  const fredDøgn = (f = 1) => Math.max(1.5, Math.min(4, REGLER.regionFred / (f > 0 ? f : 1)));
  const ute = s => s.menn.filter(m => m.hp < 1).length;
  const slåttUt = s => ute(s) >= 6;
  // Kampkraft: friske teller 1, sårede ½; tom for ammunisjon teller lite.
  const styrke = (s, ammo = 1) => s.menn.reduce((v, m) => v + (m.hp >= 1 ? 1 : m.hp > 0 ? .5 : 0), 0) * (ammo <= 0 ? .2 : ammo < .25 ? .6 : 1);
  const avstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Ett valg for ett lag. v: { side, byer: [{ id, navn, x, y, folk, eier, inni(x, y) }], fiender: [{ x, y, navn, styrke }] (de laget ser),
  // venner: [lag på samme side], hjem: [x, y], ammo }. Gir { hva, x, y, tekst } – hva: trekk | forsyn | angrip | ta | hold.
  function velg(s, v) {
    const R = REGLER, her = { x: s.x, y: s.y }, egne = v.byer.filter(b => b.eier === v.side), nærmest = l => l.slice().sort((a, b) => avstand(a, her) - avstand(b, her))[0];
    if (slåttUt(s)) { const b = nærmest(egne); return b ? { hva: 'trekk', x: b.x, y: b.y, tekst: `trekker seg tilbake til ${b.navn}` } : { hva: 'trekk', x: v.hjem[0], y: v.hjem[1], tekst: 'trekker seg tilbake' }; }
    const fi = v.fiender.filter(f => avstand(f, her) <= R.angrep).sort((a, b) => avstand(a, her) - avstand(b, her))[0];
    const behov = ute(s) >= R.såret || (v.ammo !== undefined && v.ammo < R.ammoLav);
    if (behov && egne.length && !(fi && avstand(fi, her) < 600)) { const b = nærmest(egne);
      return b.inni(s.x, s.y) ? { hva: 'hold', x: s.x, y: s.y, tekst: `får stell og forsyninger i ${b.navn}` } : { hva: 'forsyn', x: b.x, y: b.y, tekst: `henter forsyninger i ${b.navn}` }; }
    const overtak = (R.stil[v.side] ? R.stil[v.side].overtak : R.overtak) * (v.overtakF > 0 ? v.overtakF : 1), min = styrke(s, v.ammo), andre = v.venner.filter(f => f !== s && !slåttUt(f));
    if (fi) {
      // de forsiktige ligger i bakhold når de står i skog og fienden ennå er et stykke unna (den som blir oppdaget sist, skyter best)
      if (R.stil[v.side] && R.stil[v.side].navn === 'forsiktig' && v.iSkog && !v.beskutt && avstand(fi, her) > 300 && min >= .6 * fi.styrke) return { hva: 'hold', x: s.x, y: s.y, tekst: `ligger i bakhold for ${fi.navn}` };
      if (min >= overtak * fi.styrke) return { hva: 'angrip', x: fi.x, y: fi.y, tekst: `angriper ${fi.navn}` };
      // sammen er vi sterke nok: venner like ved teller med
      const med = andre.filter(f => avstand(f, her) <= R.samlet), sammen = min + med.reduce((a, f) => a + styrke(f, f.ammo === undefined ? 1 : f.ammo), 0);
      if (med.length && sammen >= overtak * fi.styrke) return { hva: 'angrip', x: fi.x, y: fi.y, tekst: `angriper ${fi.navn} sammen med ${med[0].navn}` };
      // underlegen alene: gå mot en venn og samle styrkene, heller enn å flykte ut i terrenget
      const venn = andre.filter(f => avstand(f, her) <= R.samle && avstand(f, fi) > 300).sort((a, b) => avstand(a, her) - avstand(b, her))[0];
      if (venn && avstand(fi, her) > 250) return { hva: 'samle', x: venn.x, y: venn.y, tekst: `trekker seg mot ${venn.navn} for å samle styrkene` };
      const a = Math.atan2(s.y - fi.y, s.x - fi.x); return { hva: 'trekk', x: s.x + Math.cos(a) * 2000, y: s.y + Math.sin(a) * 2000, tekst: `trekker seg unna ${fi.navn}` };
    }
    // en venn blir beskutt: kom til hjelp (ikke den eneste garnisonen – den blir stående, se under)
    const iEgen = v.byer.find(b => b.eier === v.side && b.inni(s.x, s.y)), eneste = iEgen && !andre.some(f => iEgen.inni(f.x, f.y));
    const nød = (v.hjelp || []).filter(h => h.lag !== s && avstand(h, her) <= R.støtte).sort((a, b) => avstand(a, her) - avstand(b, her))[0];
    if (nød && !eneste) return { hva: 'støtt', x: nød.x, y: nød.y, tekst: `kommer ${nød.navn} til hjelp` };
    // fraksjonen husker hvor den sist så en fiende: let der, hvis den ikke er for sterk (ikke i fredstiden – da samler de seg)
    const m = v.minne && v.minne.alder <= R.minne && avstand(v.minne, her) <= R.jakt && avstand(v.minne, her) > 200 ? v.minne : null;
    if (m && !eneste && !v.fred && min >= overtak * (m.styrke || 0)) return { hva: 'jakt', x: m.x, y: m.y, tekst: `leter etter ${m.navn} der de sist ble sett` };
    // garnison: står laget i et eget tettsted og er det eneste av sine der, blir det
    const iBy = v.byer.find(b => b.inni(s.x, s.y));
    if (iBy && iBy.eier === v.side && !v.venner.some(f => f !== s && iBy.inni(f.x, f.y) && !slåttUt(f) && f.navn < s.navn)) return { hva: 'hold', x: s.x, y: s.y, tekst: `garnison i ${iBy.navn}` };
    // FREDSTIDEN (19. nov): de første døgnene samler fraksjonen styrkene i et eget tettsted (eller hjemme) og tar ingen tettsteder
    if (v.fred) { if (iBy && iBy.eier === v.side) return { hva: 'hold', x: s.x, y: s.y, tekst: `samler styrker i ${iBy.navn}` };
      const b = nærmest(egne); return b ? { hva: 'samle', x: b.x, y: b.y, tekst: `samler seg i ${b.navn}` } : avstand({ x: v.hjem[0], y: v.hjem[1] }, her) > 300 ? { hva: 'samle', x: v.hjem[0], y: v.hjem[1], tekst: 'samler seg hjemme' } : { hva: 'hold', x: s.x, y: s.y, tekst: 'samler styrker' }; }
    // STYRKEN (19. nov): store tettsteder trenger mange mann (b.minst, b.mann – spill/garnison.js). «Fri» styrke = laget og vennene som
    // ikke er eneste garnison i et eget tettsted. mot: Map tettsted-id -> [lag på vei dit]. Uten b.minst gjelder ikke dette (som før).
    const sty = f => styrke(f, f.ammo === undefined ? 1 : f.ammo), garn = f => v.byer.some(b => b.eier === v.side && b.inni(f.x, f.y) && !andre.concat([s]).some(g => g !== f && b.inni(g.x, g.y) && !slåttUt(g) && g.navn < f.navn));
    const fri = min + andre.filter(f => !garn(f)).reduce((a, f) => a + sty(f), 0), mot = b => (v.mot && v.mot.get(b.id)) || [];
    const der = b => min + andre.filter(f => b.inni(f.x, f.y) || mot(b).includes(f)).reduce((a, f) => a + sty(f), 0);
    const mulig = b => !(b.minst > 0) || (fri >= b.minst && !(v.småFørst && b.minst > R.ettLag));
    if (iBy && iBy.eier !== v.side && mulig(iBy)) return { hva: 'hold', x: s.x, y: s.y, tekst: !(iBy.minst > 0) || der(iBy) >= iBy.minst ? `tar ${iBy.navn}` : `venter på flere for å ta ${iBy.navn}` };
    // ta det nærmeste tettstedet som ikke er vårt (større tettsteder teller som nærmere)
    // … men ikke det samme som en venn alt går mot (v.opptatt: Map tettsted-id -> lag), så lenge det finnes et annet;
    // tettsteder fraksjonen har mistet, vil den ha tilbake; og vet den hvor spillerens leir er, er leiren også et mål
    const vekt = b => avstand(b, her) / Math.sqrt(1 + b.folk / 1000) / (b.tapt ? R.tapt : 1);
    const kand = v.byer.filter(b => b.eier !== v.side && avstand(b, her) <= R.rekkevidde && mulig(b)).map(b => ({ b, v: vekt(b), leir: false }));
    if (v.leir && avstand(v.leir, her) <= R.rekkevidde) kand.push({ b: { id: 'leir', navn: v.leir.navn || 'leiren', x: v.leir.x, y: v.leir.y, folk: R.leirVekt }, v: avstand(v.leir, her) / Math.sqrt(1 + R.leirVekt / 1000), leir: true });
    kand.sort((a, b) => a.v - b.v);
    // (19. nov) et stort tettsted er «ledig» til de som går dit, er mange nok for full fart (b.mann)
    const fullt = b => (b.mann > 0 && v.mot ? mot(b).filter(f => f !== s).reduce((a, f) => a + sty(f), 0) >= b.mann : !!(v.opptatt && v.opptatt.has(b.id) && v.opptatt.get(b.id) !== s));
    const ledig = kand.filter(k => !fullt(k.b)), valg = (ledig.length ? ledig : kand)[0];
    if (valg) return { hva: valg.leir ? 'leir' : 'ta', mål: valg.b.id, x: valg.b.x, y: valg.b.y, tekst: valg.leir ? `rykker mot ${valg.b.navn}` : valg.b.tapt ? `vil ta tilbake ${valg.b.navn}` : `marsjerer mot ${valg.b.navn}` };
    return { hva: 'hold', x: s.x, y: s.y, tekst: 'holder stillingen' };
  }
  // Sympati 0–1 mellom en fraksjon og en folkemening på de samme tre aksene (1 = helt enig).
  const sympati = (side, akse) => 1 - Math.hypot(...FRAKSJONER[side].akse.map((a, i) => a - akse[i])) / Math.sqrt(3);
  // Hvor motstanderne holder til når leiren ligger et annet sted enn Dovre (feilretting 12. nov: på /norge sto fienden bare på Dovre).
  // leir: { x, y }; byer: [{ x, y, navn }] (tettstedene i nærheten). Kystalliansen (rød) får det nærmeste tettstedet 6–45 km fra leiren,
  // Folkefronten (grønn) det nærmeste som ligger minst 8 km fra rødt og helst i en annen retning (over 60° fra rødt sett fra leiren).
  // Finnes det ikke tettsteder, gis et punkt 9 km vest (rød) / sørøst (grønn) for leiren med by = null – visningen må finne land der.
  function startsteder(leir, byer, o = {}) {
    const MIN = o.min || 6000, MAKS = o.maks || 45000, d = b => Math.hypot(b.x - leir.x, b.y - leir.y), vinkel = b => Math.atan2(b.y - leir.y, b.x - leir.x);
    // (19. nov) helst ikke en storby som startsted (byer med folk over REGLER.startMaks kommer sist, når de har folketall)
    const stor = b => (b.folk > (o.startMaks || REGLER.startMaks) ? 1 : 0);
    const kand = (byer || []).filter(b => d(b) >= MIN && d(b) <= MAKS).sort((a, b) => stor(a) - stor(b) || d(a) - d(b));
    const sted = (b, dx, dy) => (b ? { x: b.x, y: b.y, navn: b.navn, by: b } : { x: leir.x + dx, y: leir.y + dy, navn: null, by: null });
    const rød = kand[0] || null, unna = b => b !== rød && Math.hypot(b.x - rød.x, b.y - rød.y) >= 8000;
    const skille = b => { let v = Math.abs(vinkel(b) - vinkel(rød)); if (v > Math.PI) v = 2 * Math.PI - v; return v > Math.PI / 3; };
    const grønn = rød ? kand.find(b => unna(b) && skille(b)) || kand.find(unna) || null : null;
    return { rød: sted(rød, -9000, 0), grønn: sted(grønn, 6400, -6400) };
  }
  // Taket for antall lag: grunntaket + et halvt lag per tettsted fraksjonen holder.
  // (19. nov) … og et halvt lag per døgn som har gått (dag = hele døgn siden start), så motstanderne bygger seg opp over dager
  const lagTak = (byer, dag = 0) => Math.min(REGLER.lagMaks, REGLER.forsterkning.maks + Math.floor((byer || 0) * REGLER.lagPerBy + Math.max(0, dag || 0) * REGLER.lagPerDøgn));
  // Hvor laget stiller seg når det angriper: det høyeste punktet på en ring rundt målet (høyde gir overtak i strid.js), men ikke
  // lenger unna enn at det er verdt det – 4 m høyere per 100 m ekstra marsj. høyde(x, y) kan gi NaN/null (ukjent).
  function angrepspunkt(s, mål, høyde, radius = 280) { let best = null; const d0 = Math.hypot(mål.x - s.x, mål.y - s.y); if (d0 <= radius) return { x: s.x, y: s.y, h: høyde(s.x, s.y), vinn: 0 };
    const hm = høyde(mål.x, mål.y), a0 = Math.atan2(s.y - mål.y, s.x - mål.x);
    for (let i = 0; i < 12; i++) { const a = a0 + i * Math.PI / 6, x = mål.x + Math.cos(a) * radius, y = mål.y + Math.sin(a) * radius, h = høyde(x, y); if (!isFinite(h) || h === null) continue;
      const ekstra = Math.hypot(x - s.x, y - s.y) - (d0 - radius), poeng = (isFinite(hm) ? h - hm : 0) - Math.max(0, ekstra) * .04; if (!best || poeng > best.poeng) best = { x, y, h, poeng, vinn: isFinite(hm) ? h - hm : 0 }; }
    return best || { x: mål.x + Math.cos(a0) * radius, y: mål.y + Math.sin(a0) * radius, h: null, vinn: 0 }; }
  // Skal laget kjøre? d = meter til målet, bil = meter til en ledig lastebil (null = ingen), hva = det AI-en valgte.
  const kjør = (hva, d, bil) => ['ta', 'leir', 'støtt', 'jakt', 'samle', 'forsyn', 'trekk'].includes(hva) && d > REGLER.bil.langt && bil !== null && bil !== undefined && bil <= REGLER.bil.nær;
  // Skal laget gå av? framme = kjøretøyet står, fiende = meter til nærmeste fiende laget ser (null = ingen)
  const gåAv = (framme, fiende) => !!framme || (fiende !== null && fiende !== undefined && fiende <= REGLER.bil.av);
  // Skal garnisonen bygge en stilling? holdt = minutter laget har holdt stedet, nærmeste = meter til nærmeste egne stilling, antall = fraksjonens stillinger
  const byggStilling = (holdt, nærmeste, antall) => holdt >= REGLER.stilling.etter && antall < REGLER.stilling.maks && !(nærmeste < REGLER.stilling.avstand);
  // Vernet et lag har av stillingene: lag = { x, y, side }, stillinger = [{ x, y, side }]
  const stillingVern = (lag, stillinger) => ((stillinger || []).some(q => q.side === lag.side && Math.hypot(q.x - lag.x, q.y - lag.y) <= REGLER.stilling.radius) ? REGLER.stilling.vern : 1);
  const api = { FRAKSJONER, REGLER, fredDøgn, kjør, gåAv, byggStilling, stillingVern, lagTak, angrepspunkt, velg, styrke, slåttUt, sympati, startsteder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Fraksjoner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
