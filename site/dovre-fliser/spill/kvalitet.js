'use strict';
// GRAFIKKVALITET (12. nov, brukeren: «spillet går alt for hakkete»). Tre nivåer for 3D, valgt i ☰ «Grafikk: …» (Auto/Høy/Middels/Lav,
// localStorage «riksbrudd-grafikk»). Auto starter på Høy og går ned et nivå når bildene i snitt tar for lang tid (etter at oppløsningen
// allerede er senket, se størrelse3d i index.html), og opp igjen når det går lett lenge. Nivået styrer:
//   pr      høyeste pikseltetthet [PC, mobil]       tre   detaljavstanden for trærne (faktor)
//   gress   andel gresstuster rundt kameraet          blomster  blomster/bregner/siv rundt kameraet
//   tekstur stor bakketekstur (4096) nær bakken       skumtopper og krusning i vannet (vann)
//   nett    terrengnettets tetthet (1 = 289 × 289 punkter på PC; Middels 273, Lav 241 – ikke grovere: trær og hus står etter den ekte høyden) – gjelder fra neste utsnitt
//   bakke   'enkel' på Lav: terrenget med lys per hjørne og uten effektene i skyggeleggingen (bakkeMateriale i index.html) – det
//           klart tyngste i bildet på svake maskiner (målt 15. nov med programvare-grafikk, terrenget alene: ca. 400 ms per bilde
//           med alt, ca. 190 ms med kartbildet og lys per hjørne; tallene fra 14. nov – 700 og 20 ms – var feilmålt)
// GRAFIKKORTET (15. nov): første gang 3D tegner, leses navnet på grafikkortet (KVAL.kort, i loggen og på Grafikk-knappen). Tegner
// nettleseren uten grafikkort (programvare-grafikk: SwiftShader, llvmpipe, Microsoft Basic Render Driver), går det tregt uansett
// innstilling: spilleren får beskjed om å slå på maskinvareakselerasjon, og Auto starter på Lav. (Ikke i testene: navigator.webdriver.)
// Reglene øverst uten DOM (Kvalitet.neste) – test: node pipeline/fliser/test_kvalitet.js.
(function (rot) {
  // LYS OG SKYGGER (18. nov, pakke «lys»): det nye og dyre i bildet følger grafikknivået (KVAL.fx) og kan slås av med knappen
  // «Lys og skygger» i ☰ (localStorage «riksbrudd-effekter»). Lav grafikk har ingenting av det. Tallene er Claudes forslag.
  //   skygge  skyggekartets side i punkter [PC, mobil] (0 = ingen skygger fra sola)      myk    myke skyggekanter (flere oppslag)
  //   etter   etterbehandling av bildet: 'full' = fargesetting, kantutjevning og dybdeuskarphet når du går, 'farge' = bare fargesetting
  //   bakke   skarp bakke nært (egne teksturer), dybde i vannet og tåke i dalene i bakkens skyggelegger
  //   skyer   skyer i lag som henger sammen med skyskyggene                              lys    lys fra lykter på bakken om natta
  const FX = {
    høy: { skygge: [2048, 1024], myk: true, etter: 'full', bakke: true, skyer: true, lys: true },
    middels: { skygge: [1024, 0], myk: false, etter: 'farge', bakke: true, skyer: true, lys: true },
    ingen: { skygge: [0, 0], myk: false, etter: null, bakke: false, skyer: false, lys: false },
    // Auto: går bildet for tregt, tas de dyre effektene bort FØR grafikknivået senkes (trinn 1 = som Middels, trinn 2 = uten skygger
    // og etterbehandling – målt med programvare-grafikk er de to omtrent hele kostnaden; resten er nesten gratis)
    billig: { skygge: [0, 0], myk: false, etter: null, bakke: true, skyer: true, lys: true },
  };
  const NIVÅ = {
    høy: { navn: 'Høy', pr: [1.5, 1.25], tre: 1, gress: 1, blomster: true, tekstur: true, vann: 1, fx: FX.høy },
    middels: { navn: 'Middels', pr: [1, 1], tre: .6, gress: .5, blomster: true, tekstur: false, vann: 1, nett: .92, fx: FX.middels },
    lav: { navn: 'Lav', pr: [.75, .75], tre: .35, gress: 0, blomster: false, tekstur: false, vann: 0, bakke: 'enkel', nett: .83 },
  };
  const REKKE = ['høy', 'middels', 'lav'];
  // Auto: ms = snittid per bilde, skala = oppløsningsfaktoren (1 = full, 0,6 = laveste), nå/sist i sekunder.
  // Ned: over 24 ms når oppløsningen alt er senket (eller over 40 ms uansett), høyst hvert 4. s. Opp: under 18 ms (60 bilder/s) i 20 s med full oppløsning,
  // men ikke tilbake til et nivå som var for tungt det siste minuttet.
  function neste(s, ms, skala, nå) {
    const i = REKKE.indexOf(s.nivå);
    if (nå - (s.endret || -99) < 4) return s.nivå;
    if ((ms > 24 && skala <= .65) || ms > 40) { if (i < REKKE.length - 1) { s.endret = nå; s.forTungt = { nivå: s.nivå, ved: nå }; s.lett = null; return REKKE[i + 1]; } return s.nivå; }
    if (ms < 18 && skala >= 1) {
      if (s.lett == null) s.lett = nå;
      const opp = REKKE[i - 1];
      if (i > 0 && nå - s.lett > 20 && !(s.forTungt && s.forTungt.nivå === opp && nå - s.forTungt.ved < 60)) { s.endret = nå; s.lett = null; return opp; }
    } else s.lett = null;
    return s.nivå;
  }
  // Er navnet nettleseren oppgir en programvare-tegner (ikke et grafikkort)?
  const programvare = navn => /swiftshader|llvmpipe|softpipe|software|basic render|warp/i.test(navn || '');
  // Kort, lesbart navn: «ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)» -> «Intel(R) UHD Graphics 620»
  function kortNavn(navn) {
    let t = String(navn || '').trim(); const m = /^ANGLE \((.*)\)$/.exec(t);
    if (m) { const d = m[1].split(','); t = (d.length >= 2 ? d[1] : d[0]).trim(); }
    return t.replace(/\s*(Direct3D|OpenGL|vs_\d|ps_\d|D3D\d+).*$/i, '').replace(/\(0x[0-9a-f]+\)/ig, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'ukjent';
  }
  const Kvalitet = { NIVÅ, REKKE, FX, neste, programvare, kortNavn };
  if (typeof module !== 'undefined') { module.exports = Kvalitet; return; }
  rot.Kvalitet = Kvalitet;

  // ---------- i nettleseren ----------
  let valg = 'auto'; try { const v = localStorage.getItem('riksbrudd-grafikk'); if (v && (v === 'auto' || NIVÅ[v])) valg = v; } catch (e) { /* privat vindu */ }
  const S = { nivå: valg === 'auto' ? 'høy' : valg };
  // KVAL: det andre deler av spillet leser (index.html: størrelse3d, lodTrær, gress3d, bygg3d; vegetasjon3d.js; vind3d.js)
  const KVAL = window.KVAL = { get nivå() { return S.nivå; }, get valg() { return valg; }, v: 0, get p() { return NIVÅ[S.nivå]; },
    // fx: de nye effektene på dette nivået (FX.ingen når de er slått av, på Lav og i testene – se under)
    get fx() { const f = fxPå && NIVÅ[S.nivå].fx; return !f ? FX.ingen : fxTrinn >= 2 ? FX.billig : fxTrinn === 1 ? FX.middels : f; }, get effekterPå() { return fxPå; }, get fxTrinn() { return fxTrinn; } };
  let fxTrinn = 0;
  // Effektene er på hos spilleren til han slår dem av. I testene (navigator.webdriver) er de av til testen selv slår dem på
  // (KVAL.effekter(true)) – kontrollskriptet skal se det samme bildet som før.
  let fxPå = !navigator.webdriver; try { if (localStorage.getItem('riksbrudd-effekter') === 'av') fxPå = false; } catch (e) { /* privat vindu */ }
  const fxKnapp = document.createElement('button'); fxKnapp.id = 'vis-effekter';
  const settFx = () => { fxKnapp.textContent = 'Lys og skygger: ' + (fxPå ? 'på' : 'av'); fxKnapp.title = 'Skygger fra sola, fargesetting, skarp bakke nært, dybde i vannet og tåke i dalene (bare på Høy og Middels grafikk). Slå av hvis bildet går tregt.'; };
  // Slår effektene på eller av. lagre = false: husk ikke valget (testene).
  KVAL.effekter = (på, lagre) => { på = !!på; fxTrinn = 0; if (på === fxPå) return på; fxPå = på; KVAL.v++; settFx();
    if (lagre !== false) try { localStorage.setItem('riksbrudd-effekter', på ? 'på' : 'av'); } catch (e) { /* privat vindu */ }
    if (typeof R3 !== 'undefined' && R3) { R3.lodVed = null; if (typeof byttBakke === 'function') byttBakke(true); }
    return på; };
  fxKnapp.onclick = () => { KVAL.effekter(!fxPå); if (typeof logg === 'function') logg('Lys og skygger: ' + (fxPå ? 'på' : 'av') + '.'); };
  settFx();
  const knapp = document.createElement('button'); knapp.id = 'vis-grafikk';
  const settKnapp = () => { knapp.textContent = 'Grafikk: ' + (valg === 'auto' ? 'auto (' + NIVÅ[S.nivå].navn.toLowerCase() + ')' : NIVÅ[valg].navn); knapp.title = 'Lavere grafikk gir jevnere bilde på svake maskiner' + (KVAL.kort ? '. Grafikkort: ' + kortNavn(KVAL.kort) : '') + (KVAL.programvare ? ' (programvare: slå på maskinvareakselerasjon i nettleseren)' : ''); };
  function bytt(nivå) {
    if (nivå === S.nivå) return; S.nivå = nivå; KVAL.v++; settKnapp();
    // trærne, gresset og blomstene fordeles på nytt i neste ramme; bakketeksturen følger med i neste utsnitt
    if (typeof R3 !== 'undefined' && R3) { R3.lodVed = null; R3.gressSenter = null; }
    if (typeof byttBakke === 'function') byttBakke(true);
    if (typeof logg === 'function') logg('Grafikk: ' + NIVÅ[nivå].navn.toLowerCase() + (valg === 'auto' ? ' (automatisk – velg selv i ☰)' : '') + '.');
  }
  knapp.onclick = () => { const r = ['auto', ...REKKE]; valg = r[(r.indexOf(valg) + 1) % r.length]; try { localStorage.setItem('riksbrudd-grafikk', valg); } catch (e) { /* privat vindu */ }
    if (valg === 'auto') { S.endret = performance.now() / 1000; S.lett = null; S.forTungt = null; settKnapp(); } else bytt(valg); settKnapp(); };
  settKnapp(); const lm = document.getElementById('lagmeny'); if (lm) { lm.appendChild(knapp); lm.appendChild(fxKnapp); }
  // Første bilde i 3D: hvilket grafikkort tegner nettleseren med?
  KVAL.kort = null; KVAL.programvare = false;
  KROKER.ramme3d.push(R => {
    if (KVAL.kort != null || !R.renderer) return;
    let navn = ''; try { const gl = R.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); navn = String((e && gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || ''); } catch (err) { /* ukjent */ }
    KVAL.kort = navn; KVAL.programvare = programvare(navn); settKnapp();
    if (typeof logg === 'function') logg('Grafikkort: ' + kortNavn(navn) + (KVAL.programvare ? ' (programvare – ikke et grafikkort)' : '') + '.');
    if (!KVAL.programvare || navigator.webdriver) return;
    if (valg === 'auto') bytt('lav');
    programvareVarsel();
  });
  // MASKINVAREVARSELET (runde 6, 19. nov, kritikken: varselet la seg midt i bildet ved hver åpning av 3D, også over siktet når du gikk,
  // og kom tilbake etter × og omlasting). Nå: en liten lapp i hjørnet én gang i denne nettleseren – lukket (×) eller borte av seg selv
  // etter REGLER_VARSEL.sek sekunder er den husket som sett («riksbrudd-grafikkvarsel»). Rådet står også i loggen og på Grafikk-knappen.
  // Claudes forslag:
  const REGLER_VARSEL = { sek: 25 };
  function programvareVarsel() {
    const RÅD = 'Slå på «maskinvareakselerasjon» i nettleserens innstillinger (Edge og Chrome: Innstillinger → System → «Bruk grafikkakselerasjon når tilgjengelig») og start nettleseren på nytt.';
    let sett = null; try { sett = localStorage.getItem('riksbrudd-grafikkvarsel'); } catch (e) { /* privat vindu */ }
    if (sett || document.getElementById('grafikkvarsel')) return;
    if (typeof logg === 'function') logg('3D går tregt: nettleseren tegner uten grafikkortet. ' + RÅD);
    const husk = () => { try { localStorage.setItem('riksbrudd-grafikkvarsel', 'lukket'); } catch (e) { /* privat vindu */ } };
    if (!document.getElementById('grafikkvarselcss')) { const css = document.createElement('style'); css.id = 'grafikkvarselcss';
      css.textContent = `#grafikkvarsel{ position:fixed; right:12px; top:calc(var(--topp,58px) + 56px); z-index:9; width:min(290px,60vw); padding:7px 30px 7px 10px; background:rgba(28,23,15,.9);
  border:1px solid #6b5a36; color:#d8ccb0; font-size:12.5px; line-height:1.3; } #grafikkvarsel b{ color:#f0d79a; font-weight:600; }
#grafikkvarsel button{ position:absolute; right:3px; top:3px; width:24px; height:24px; padding:0; background:none; border:0; color:#e7dcc3; font-size:16px; cursor:pointer; }
body.kort #grafikkvarsel{ right:auto; left:8px; top:38%; width:min(180px,45vw); font-size:12px; } body.foto #grafikkvarsel{ display:none; }`; document.head.appendChild(css); }
    const v = document.createElement('div'); v.id = 'grafikkvarsel'; v.setAttribute('role', 'status');
    const b = document.createElement('b'); b.textContent = '3D går tregt: '; const x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.title = 'Lukk (vises ikke igjen)'; x.setAttribute('aria-label', 'Lukk');
    v.append(b, 'nettleseren tegner uten grafikkortet. Slå på maskinvareakselerasjon i nettleserens innstillinger (mer i loggen).', x);
    x.onclick = () => { husk(); v.remove(); }; document.body.appendChild(v); husk();
    setTimeout(() => v.remove(), REGLER_VARSEL.sek * 1000);
  }
  KVAL.programvareVarsel = programvareVarsel;
  KROKER.ramme3d.push(R => {
    // (R.måler: spill/ytelse.js måler – da står nivået stille)
    if (valg !== 'auto' || R.rammeSnitt == null || R.måler) return;
    const nå = performance.now() / 1000; if (!S.start) S.start = nå;
    // de første sekundene etter at 3D er åpnet bygges alt: ikke mål da
    if (nå - S.start < 6 || R.bygger) return;
    // for tregt (samme grense som Kvalitet.neste): først de dyre effektene, så nivået
    const ms = R.rammeSnitt, skala = R.skala || 1;
    if (fxPå && fxTrinn < 2 && NIVÅ[S.nivå].fx && nå - (S.endret || -99) >= 4 && ((ms > 24 && skala <= .65) || ms > 40)) {
      fxTrinn++; S.endret = nå; S.lett = null; KVAL.v++; if (typeof byttBakke === 'function') byttBakke();
      if (typeof logg === 'function') logg(fxTrinn === 1 ? 'Grafikk: enklere skygger (bildet gikk tregt).' : 'Grafikk: uten skygger og fargesetting (bildet gikk tregt).');
      return;
    }
    const ny = neste(S, R.rammeSnitt, R.skala || 1, nå); if (ny !== S.nivå) bytt(ny);
  });
  KVAL.bytt = n => { valg = n; bytt(n === 'auto' ? 'høy' : n); settKnapp(); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
