/* FLYT (natt 18. nov): spol til neste hendelse, automatisk stopp, marsjtid før ordren, køordre og flere lag på én gang.
 * Reglene øverst er uten DOM (Node: require('./flyt'); nettleser: globalThis.Flyt), visningen nederst kobler dem på spillet
 * (window.FlytSpill). Brukeren 18. nov: «marsjer tar timer i sanntid» – tiden skal kunne gå fort til noe skjer og så stoppe selv.
 * Alle tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  // Claudes forslag
  const REGLER = {
    gangfart: 4,         // km/t til fots i det grove anslaget (før ruta er regnet ut)
    omveg: 1.3,          // ruta er så mye lengre enn luftlinja i det grove anslaget
    ekteRute: 8000,      // meter: kortere enn dette regnes den ekte ruta ut mens du peker (lengre gir bare anslaget)
    ring: 55,            // meter mellom lagene når flere lag får samme mål
    køMaks: 8,           // høyst så mange punkter i køen til ett lag
    sakteFart: 'sp1',    // farten spolingen og auto-stoppen går ned til (1×)
    // (runde 6, kritikken: «600× faller tilbake til 1× ved hvert ferdig bygg – man må trykke 600× hele tiden») Den automatiske
    // nedbremsingen går nå bare ned til 1× når det haster (fienden i sikte, ildkamp, alarm, et lag slått ut). Et ferdig bygg og et
    // kort som venter på svar senker farten bare til 10× (HENDELSER[type].til), og et nytt ferdig bygg senker den ikke igjen før det er
    // gått to spilltimer (autoHvile, i spillminutter). Spolingen (⏭) stopper fortsatt på 1× som før. Claudes forslag.
    autoHvile: { bygg: 120, kort: 60 },
    spolFart: 'sp4',     // farten det spoles i (600×)
    visSek: 9,           // sekunder kortet «Stoppet: …» står
    // RUNDE 8 (20. nov, kritikeren på telefon: «⏭ stopper omtrent hver spilltime på småting – 22 trykk for ett døgn»): ⏭ stopper bare for det
    // som krever spilleren. En fiende i sikte stopper bare når den er nærmere enn fiendeNær meter fra leiren eller et eget lag, og den samme
    // fienden stopper ikke igjen før det er gått huskSett spillminutter. Claudes forslag.
    fiendeNær: 2000,
    huskSett: 180,
    // flom eller ras nærmere leiren enn dette (meter) stopper likevel – når hendelsen har med stedet (detail.x, detail.y)
    naturNær: 3000,
  };
  // Hvilke hendelser som stopper hva: spol = «spol til neste hendelse», auto = automatisk nedbremsing når du selv har satt opp farten
  const HENDELSER = {
    // framme: bare lag DU sendte (ikke lag som går hjem, rykker fram eller trekker seg av seg selv – ordre(…, stille), se «ordre» under)
    framme: { spol: true, auto: false },
    kontakt: { spol: true, auto: true },
    alarm: { spol: true, auto: true },
    bygg: { spol: true, auto: true, til: 'sp2' },
    dag: { spol: true, auto: false },
    // (runde 8) et nådd mål står i loggen og i Leir → Mål, men stopper ikke spolingen (det krever ikke noe av deg)
    mål: { spol: false, auto: false },
    tettsted: { spol: true, auto: false },
    tapt: { spol: true, auto: true },
    // fra andre moduler (hendelsen «riksbrudd-hendelse», se under) og kort som venter på svar
    kort: { spol: true, auto: true, til: 'sp2' },
    // (runde 8) flom og ras langt unna står i loggen; toget som kommer fram, legger lasten i leiren av seg selv
    natur: { spol: false, auto: false },
    brann: { spol: true, auto: false },
    fanger: { spol: true, auto: false },
    båt: { spol: true, auto: false },
    tog: { spol: false, auto: false },
    annet: { spol: true, auto: false },
  };
  // Øyeblikksbildet B: { dag, marsj: { navn: true }, strid (egne lag i ildkamp), fiender (fiender du ser), bygg (ferdige bygg),
  //   alarm (leiren angripes), mål (mål nådd), tettsteder (dine), lag (egne lag som lever) }
  // hendelser(før, nå) gir lista over det som har skjedd mellom to bilder: [{ type, tekst }]
  function hendelser(før, nå) {
    const ut = []; if (!før || !nå) return ut;
    // Mens et angrep alt pågår (alarm før og nå), stopper ikke hvert lag som kommer fram eller kommer i ildkamp: forsvaret flytter lagene
    // hele tida, og spolingen stoppet hvert 0–2 spillminutt (gjennomspillingen 19. nov). Alarmen, tap og ødelagte bygg stopper fortsatt.
    const midtIAngrep = !!(nå.alarm && før.alarm);
    const framme = midtIAngrep ? [] : Object.keys(før.marsj || {}).filter(n => !(nå.marsj || {})[n] && (nå.navn || []).includes(n));
    if (framme.length) ut.push({ type: 'framme', tekst: framme.length === 1 ? framme[0] + ' er framme' : framme.length + ' lag er framme' });
    if (nå.alarm && !før.alarm) ut.push({ type: 'alarm', tekst: 'leiren angripes' });
    if (midtIAngrep) { /* kontakt meldes ikke på nytt midt i et angrep */ }
    else if ((nå.strid || 0) > (før.strid || 0)) ut.push({ type: 'kontakt', tekst: 'et lag er i ildkamp' });
    else if ((nå.fiender || 0) > (før.fiender || 0)) ut.push({ type: 'kontakt', tekst: 'fienden er i sikte' });
    // (runde 14, kritiker I: patruljen stoppet ⏭ fire ganger i fredstid uten at noe skjedde) – en motstanders lag i fredstid stopper høyst én
    // gang per spilldøgn (bilde(): nå.fred), med en tekst som sier at det ikke angriper
    else if ((nå.fred || 0) > (før.fred || 0)) ut.push({ type: 'kontakt', tekst: 'fiendens patrulje – fredstid, angriper ikke' });
    if ((nå.lag || 0) < (før.lag || 0)) ut.push({ type: 'tapt', tekst: 'et lag er slått ut' });
    // leiren raseres: et bygg er borte, eller enda et bygg er under halv helse (bare mens leiren angripes – ikke når du river selv)
    if (nå.alarm || før.alarm) {
      if ((nå.byggTall || 0) < (før.byggTall || 0)) ut.push({ type: 'alarm', tekst: 'et bygg i leiren er ødelagt' });
      else if ((nå.skadd || 0) > (før.skadd || 0)) ut.push({ type: 'alarm', tekst: 'et bygg i leiren er hardt skadet' });
    }
    if ((nå.bygg || 0) > (før.bygg || 0)) ut.push({ type: 'bygg', tekst: 'et bygg er ferdig' });
    if ((nå.tettsteder || 0) > (før.tettsteder || 0)) ut.push({ type: 'tettsted', tekst: 'du har tatt et tettsted' });
    else if ((nå.tettsteder || 0) < (før.tettsteder || 0)) ut.push({ type: 'tettsted', tekst: 'du har mistet et tettsted' });
    if ((nå.mål || 0) > (før.mål || 0)) ut.push({ type: 'mål', tekst: 'et mål er nådd' });
    if (nå.kort && !før.kort) ut.push({ type: 'kort', tekst: 'noe venter på svaret ditt' });
    if (nå.dag !== før.dag) ut.push({ type: 'dag', tekst: 'ny dag (dag ' + nå.dag + ')' });
    return ut;
  }
  // det som skal stoppe tiden: hva = 'spol' eller 'auto'
  const stopper = (liste, hva) => liste.filter(h => HENDELSER[h.type] && HENDELSER[h.type][hva]);
  // farten den automatiske nedbremsingen går ned til: den laveste blant hendelsene ('sp1' = 1×, 'sp2' = 10×)
  const FARTER = ['sp0', 'sp1', 'sp2', 'sp3', 'sp4'];
  const autoFart = (liste, R = REGLER) => liste.reduce((m, h) => { const t = (HENDELSER[h.type] && HENDELSER[h.type].til) || R.sakteFart; return FARTER.indexOf(t) < FARTER.indexOf(m) ? t : m; }, 'sp4');
  // hendelser som har senket farten nylig, senker den ikke igjen: sist = { type: spillminutt }, nå = spillminutt
  const hviler = (liste, sist, nå, R = REGLER) => liste.filter(h => !(R.autoHvile[h.type] && sist && sist[h.type] !== undefined && nå - sist[h.type] < R.autoHvile[h.type]));
  // Grovt anslag for en marsj på d meter i luftlinje: { km, timer }
  const anslag = (d, R = REGLER) => ({ km: d * R.omveg / 1000, timer: d * R.omveg / 1000 / R.gangfart });
  // «2 t 15 min», «35 min», «under 5 min»
  function tidTekst(timer) {
    const min = Math.round(timer * 60); if (min < 5) return 'under 5 min';
    if (min < 60) return (Math.round(min / 5) * 5) + ' min';
    const t = Math.floor(min / 60), m = Math.round((min - t * 60) / 5) * 5; return m === 60 ? (t + 1) + ' t' : m ? t + ' t ' + m + ' min' : t + ' t';
  }
  const kmTekst = km => (km < 10 ? String(Math.round(km * 10) / 10).replace('.', ',') : String(Math.round(km))) + ' km';
  // Køen til et lag: s.kø = [[x, y] …], s.køSlutt = 'grav' (grav ned ved siste punkt) eller null
  function leggIKø(s, x, y, R = REGLER) { if (!s.kø) s.kø = []; if (s.kø.length >= R.køMaks) return false; s.kø.push([Math.round(x), Math.round(y)]); return true; }
  // neste punkt tas ut av køen når laget står stille; null når det ikke er noe å gjøre
  function nesteIKø(s) { if (!s.kø || !s.kø.length || s.sti || s.planlegger) return null; const p = s.kø.shift(); if (!s.kø.length) { s.kø = null; s.køSiste = true; } return p; }
  function tømKø(s) { s.kø = null; s.køSlutt = null; s.køSiste = false; }
  // hele ruta i køen fra der laget skal (målet for marsjen som går, eller der det står): luftlinje i meter
  function køLengde(s) { if (!s.kø || !s.kø.length) return 0; let [x, y] = s.sti && s.sti.length ? s.sti[s.sti.length - 1] : [s.x, s.y], d = 0; for (const [a, b] of s.kø) { d += Math.hypot(a - x, b - y); x = a; y = b; } return d; }
  // Plassene til n lag rundt ett mål: det første i midten, resten i ringer (seks i den første, tolv i den neste …)
  function plasser(n, X, Y, R = REGLER) {
    const ut = []; let ring = 0, iRing = 0, plass = 1;
    for (let i = 0; i < n; i++) {
      if (i === 0) { ut.push([X, Y]); continue; }
      if (iRing >= plass || ring === 0) { ring++; iRing = 0; plass = ring * 6; }
      const a = iRing / plass * 6.283185 + ring * .4; ut.push([X + Math.cos(a) * ring * R.ring, Y + Math.sin(a) * ring * R.ring]); iRing++;
    }
    return ut;
  }
  // lagene innenfor en ramme i kartet (hjørnene i hvilken som helst rekkefølge)
  function iRamme(lag, x0, y0, x1, y1) { const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1); return lag.filter(s => s.x >= a && s.x <= b && s.y >= c && s.y <= d); }
  const api = { REGLER, HENDELSER, FARTER, autoFart, hviler, hendelser, stopper, anslag, tidTekst, kmTekst, leggIKø, nesteIKø, tømKø, køLengde, plasser, iRamme };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Flyt = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ================= visningen =================
  const F = api, R = REGLER, NØKKEL = 'riksbrudd-flyt';
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  let valg = { auto: true }; try { valg = { ...valg, ...(JSON.parse(localStorage.getItem(NØKKEL) || 'null') || {}) }; } catch (e) { /* ingen lagring */ }
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify(valg)); } catch (e) { /* fullt eller sperret */ } };
  const egne = () => ENHETER.filter(s => s.side === 'blå' && !s.karakter && !s.leirvakt && levende(s));
  const fartId = () => { const b = document.querySelector('.knapper [id^=sp].på'); return b ? b.id : 'sp1'; };
  const settFart = id => { const b = document.getElementById(id); if (b && (fartId() !== id || tempo === 0)) b.click(); };

  // ---------- øyeblikksbildet ----------
  // Den samme fienden (eller den samme ildkampen) skal bare stoppe spolingen én gang: et lag som forsvinner bak en ås og kommer fram
  // igjen, telte før som «ny fiende i sikte» hver gang (spolingen stoppet hvert 2.–9. spillminutt under et angrep). Nå regnes en fiende som
  // sett, og et lag som i strid, i HUSK spillminutter etter sist gang (Claudes forslag).
  const HUSK = 90, sistSett = new Map(), sistStrid = new Map();
  function nylig(kart, nå, alle, husk = HUSK) {
    for (const e of nå) kart.set(e, tid);
    let n = 0; for (const [e, t] of kart) { if (tid - t > husk || tid < t || !alle.includes(e)) kart.delete(e); else n++; }
    return n;
  }
  // (runde 8) en fiende teller bare når den er nær leiren eller et eget lag (R.fiendeNær)
  function nærFiende(e, lag) { const S = rot.OppstartSpill && OppstartSpill.tilstand(), L = S && S.leir, n = R.fiendeNær;
    if (L && Math.hypot(e.x - L.x, e.y - L.y) < n) return true; return lag.some(s => Math.hypot(e.x - s.x, e.y - s.y) < n); }
  // (runde 14) fredstid: motstanderne angriper ikke leiren før dette (samme regel som i spill/fraksjoner-visning.js: 7 døgn / fiendens faktor,
  // 4–10 døgn). Et lag fra en motstander (ikke røvere, ikke i en angrepsgruppe mot noe av ditt) er da en «patrulje i fredstid», og samme
  // lag stopper ⏭ høyst én gang per spilldøgn. I testene (navigator.webdriver) er det aldri fredstid – som i fraksjoner-visning.js.
  const sistFred = new Map(), fredDag = new Map();
  const fredSlutt = () => { const f = (rot.SPILLREGLER && SPILLREGLER.faktor && SPILLREGLER.faktor.fiende) || 1; return Math.max(4, Math.min(10, Math.round(7 / f))) * 1440; };
  function fredLag(e) { if (navigator.webdriver && api2.test !== true) return false; if (e.raid || !e.ai || tid >= fredSlutt()) return false;
    const ES = rot.EskaleringSpill && EskaleringSpill.S ? EskaleringSpill.S() : null, G = ES && ES.gruppe ? ES.gruppe[e.side] : null;
    return !(G && G.lag && G.lag.includes(e.navn) && G.mål && (G.mål.leir || G.mål.eier === 'blå')); }
  function nyFredDag(e) { const d = Math.floor((6 + tid / 60) / 24); if (fredDag.get(e.navn) === d) return false; fredDag.set(e.navn, d); return true; }
  // et kort som venter på svar og SYNES (et hendelseskort som venter til angrepet er over, er skjult og teller ikke)
  const kortOppe = () => ['hendelse', 'samfunnkort', 'krigkort', 'formkort'].some(id => { const e = document.getElementById(id); return !!(e && e.classList.contains('på') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'); });
  function bilde() {
    const L = rot.LeirSpill && LeirSpill.tilstand(), lag = egne(), marsj = {};
    for (const s of lag) if ((s.sti || s.planlegger || (s.kø && s.kø.length)) && !s.flytSelv) marsj[s.navn] = true;
    let tettsteder = 0; if (rot.TETTSTEDER) for (const t of TETTSTEDER.values()) if (t && t.eier === 'blå') tettsteder++;
    const al = document.getElementById('alarm');
    return { dag: Math.floor((6 + tid / 60) / 24) + 1, marsj, navn: lag.map(s => s.navn), lag: lag.length,
      // (runde 13, kritiker H: «farten ble satt til 1× "Et lag er i ildkamp" over ti ganger») – finnes spill/forsvar-kamp.js, melder den hver
      // kamp ÉN gang med navn, fiende og sted (hendelsen «kontakt»), og bildet teller ikke ildkampene selv
      strid: rot.KampSpill ? 0 : nylig(sistStrid, [...lag.filter(s => s.skyterPå && s.skyterPå.size), ...ENHETER.filter(e => e.side !== 'blå' && e.skyterPå && [...e.skyterPå].some(b => b.side === 'blå'))], ENHETER),
      fiender: nylig(sistSett, ENHETER.filter(e => e.side !== 'blå' && levende(e) && synlig(e) && nærFiende(e, lag) && !fredLag(e)), ENHETER.filter(e => e.side !== 'blå' && levende(e)), R.huskSett),
      fred: nylig(sistFred, ENHETER.filter(e => e.side !== 'blå' && levende(e) && synlig(e) && nærFiende(e, lag) && fredLag(e) && nyFredDag(e)), ENHETER.filter(e => e.side !== 'blå' && levende(e)), R.huskSett),
      bygg: L && rot.Leir ? (L.bygg || []).filter(b => Leir.ferdig(b)).length : 0,
      byggTall: L ? (L.bygg || []).length : 0, skadd: L ? (L.bygg || []).filter(b => b.hp !== undefined && b.hp < .5).length : 0,
      alarm: ENHETER.some(e => e.raid && levende(e)) || !!(al && al.classList.contains('på') && !al.classList.contains('satt')),
      mål: rot.MaalSpill ? MaalSpill.ferdige().size : 0, tettsteder,
      // et kort midt på skjermen som venter på svar (hendelser i gjengen, flyktninger ved porten, seier, scenario)
      kort: kortOppe() };
  }

  // ---------- spol til neste hendelse og automatisk stopp ----------
  const css = document.createElement('style');
  css.textContent = `#nesteh{ min-width:38px; } #nesteh.på{ background:#6a5a2e; color:#fff; }
#fartgrunn{ position:fixed; z-index:13; display:none; max-width:min(300px,80vw); padding:3px 8px; font-size:12px; line-height:1.3; background:rgba(28,23,15,.94); color:#f0dfb4; border:1px solid #8a6a2e; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,.4); pointer-events:auto; cursor:pointer; }
#fartgrunn.på{ display:block; } body.foto #fartgrunn{ display:none !important; }
body.kort .knapper #nesteh{ min-width:34px; padding:0 6px; }
#flytkort{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 8px); z-index:12; display:none; max-width:min(520px,94vw); padding:6px 10px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; gap:8px; align-items:center; flex-wrap:wrap; justify-content:center; }
#flytkort.liten{ padding:2px 6px 2px 9px; font-size:12.5px; gap:6px; flex-wrap:nowrap; max-width:min(440px,94vw); background:rgba(28,23,15,.92); border-color:#6a5a34; }
#flytkort.liten b{ font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } #flytkort.liten > span{ min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
#flytkort.liten button{ min-height:24px; padding:0 7px; font-size:12px; white-space:nowrap; flex:none; }
#flytkort.på{ display:flex; } #flytkort b{ color:#f0e2b0; } #flytkort button, #flytgruppe button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:inherit; min-height:34px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; }
#marsjvalg{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 8px); z-index:12; display:none; max-width:min(440px,94vw); padding:7px 10px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; gap:8px; align-items:center; }
#marsjvalg.på{ display:flex; } #marsjvalg b{ color:#f0e2b0; } #marsjvalg small{ display:block; color:var(--ink-dim,#a99); font-size:12px; } #marsjvalg button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:inherit; min-height:40px; min-width:64px; padding:2px 12px; font:inherit; cursor:pointer; } #marsjvalg button.hoved{ border-color:#c9b26a; background:#4a3f22; } #marsjvalg button:disabled{ opacity:.45; }
#flytgruppe{ position:fixed; left:10px; top:calc(var(--topp,58px) + 56px); z-index:10; display:none; max-width:min(330px,92vw); padding:8px 10px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#flytgruppe.på{ display:block; } #flytgruppe .kn{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; } #flytgruppe small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; line-height:1.3; } #flytgruppe button.på{ border-color:#c9b26a; background:#4a3f22; }
body.krig #flytgruppe{ display:none; } body.spill #flytgruppe{ top:auto; bottom:calc(14px + env(safe-area-inset-bottom,0px)); } body.smal #flytgruppe, body.kort #flytgruppe{ top:auto; bottom:64px; left:6px; max-width:calc(100vw - 70px); }`;
  document.head.appendChild(css);
  const kort = el('div', { id: 'flytkort', role: 'status' }); document.body.appendChild(kort);
  let spoler = false, før = null, sistBilde = 0, kortTid = 0, sistStopp = null;
  const spolKnapp = document.getElementById('nesteh');
  // RUNDE 8 (PC-kritikeren: «fire bokser oppå hverandre når røverne kommer»): mens angrepsbanneret står, er stoppkortet en liten linje
  // rett under banneret (ikke en boks midt over leiren)
  const alarmOppe = () => { const a = document.getElementById('alarm'); return !!(a && a.classList.contains('på') && a.getClientRects().length && getComputedStyle(a).visibility !== 'hidden'); };
  function plasserKort() { const a = document.getElementById('alarm'), liten = alarmOppe() && (!navigator.webdriver || api2.test === true);
    // (runde 13) i gåmodus kan banneret stå nederst (forsvar-visning.js flytter det bort fra husknappene) – da står kortet på vanlig plass øverst
    const ar = liten ? a.getBoundingClientRect() : null, nede = !!ar && ar.top > innerHeight / 2;
    kort.classList.toggle('liten', liten); kort.style.top = liten && !nede ? Math.round(ar.bottom + 4) + 'px' : ''; }
  // (runde 13, kritiker G og H: «banneret hadde ingen Vis-knapp») – har hendelsen et sted (x, y i kartets meter), får kortet «Vis»:
  // kartet går til 2D og flytter seg dit
  function visSted(p) { if (!p) return; const gå = () => { kam.x = p.x; kam.y = p.y; kam.m = Math.min(Math.max(kam.m, 1.5), 6); skitten = true; };
    if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function' && !(typeof R3 !== 'undefined' && R3 && R3.fot)) { Promise.resolve(slå3d(false)).then(gå, gå); } else gå(); }
  function visKort(tekst, medSpol, sted) {
    kort.replaceChildren(el('span', {}, '⏭ ', el('b', {}, tekst)));
    if (sted) { const v = el('button', { id: 'flytvis' }, 'Vis'); v.onclick = () => visSted(sted); kort.append(v); }
    if (medSpol) { const b = el('button', {}, 'Spol videre'); b.onclick = () => spol(); kort.append(b); }
    const x = el('button', { 'aria-label': 'Lukk' }, '×'); x.onclick = () => kort.classList.remove('på'); kort.append(x);
    kort.classList.add('på'); plasserKort(); clearTimeout(kortTid); kortTid = setTimeout(() => kort.classList.remove('på'), R.visSek * 1000);
  }
  function merk() { if (spolKnapp) { spolKnapp.classList.toggle('på', spoler); spolKnapp.setAttribute('aria-pressed', String(spoler)); } }
  const NAVN = { sp1: '1×', sp2: '10×', sp3: '60×', sp4: '600×' }, sistAuto = {};
  // (R17, funn 10: «600× ble satt tilbake til 1× av seg selv, uten at det sto hvorfor ved fartsknappen») – en liten lapp rett under
  // fartsknappene sier hvorfor, til du trykker på en fartsknapp eller lappen selv, eller etter GRUNN_SEK sekunder (Claudes tall)
  const GRUNN_SEK = 90, grunnLapp = el('div', { id: 'fartgrunn', role: 'status', title: 'Trykk for å lukke' }); document.body.append(grunnLapp);
  let grunnTid = 0;
  function plasserGrunn() {
    const bs = [...document.querySelectorAll('.knapper [id^=sp]')].filter(b => b.offsetParent && b.getBoundingClientRect().width > 0);
    if (!bs.length) { grunnLapp.style.left = '50%'; grunnLapp.style.top = 'calc(var(--topp,58px) + 4px)'; return; }
    const r = bs.map(b => b.getBoundingClientRect()), venstre = Math.min(...r.map(q => q.left)), høyre = Math.max(...r.map(q => q.right)), bunn = Math.max(...r.map(q => q.bottom));
    const w = grunnLapp.offsetWidth || 220; grunnLapp.style.top = Math.round(bunn + 4) + 'px';
    grunnLapp.style.left = Math.round(Math.max(6, Math.min(innerWidth - w - 6, (venstre + høyre) / 2 - w / 2))) + 'px';
  }
  function visGrunn(tekst) {
    grunnLapp.textContent = '⚠ ' + tekst; grunnLapp.classList.add('på'); plasserGrunn();
    for (const id of FARTER) { const b = document.getElementById(id); if (b) b.title = tekst; }
    clearTimeout(grunnTid); grunnTid = setTimeout(skjulGrunn, GRUNN_SEK * 1000);
  }
  function skjulGrunn() { grunnLapp.classList.remove('på'); clearTimeout(grunnTid); for (const id of FARTER) { const b = document.getElementById(id); if (b && /^Farten ble senket/.test(b.title)) b.removeAttribute('title'); } }
  grunnLapp.onclick = skjulGrunn;
  addEventListener('resize', () => { if (grunnLapp.classList.contains('på')) plasserGrunn(); });
  for (const id of FARTER) { const b = document.getElementById(id); if (b) b.addEventListener('click', e => { if (e.isTrusted) skjulGrunn(); }); }
  function stopp(liste, hva) {
    // automatisk: bare ned (aldri opp), til 10× for et ferdig bygg og til 1× når det haster – og ingen melding når farten alt er så lav
    const mål = hva === 'auto' ? F.autoFart(liste) : R.sakteFart;
    if (hva === 'auto' && F.FARTER.indexOf(fartId()) <= F.FARTER.indexOf(mål)) return;
    if (hva === 'auto') for (const h of liste) sistAuto[h.type] = tid;
    const tekst = liste.map(h => h.tekst).join(', '); sistStopp = { hva, liste, tid, fart: mål };
    spoler = false; merk(); settFart(mål);
    const t = tekst.charAt(0).toUpperCase() + tekst.slice(1);
    const sted = liste.find(h => Number.isFinite(h.x) && Number.isFinite(h.y));
    visKort((hva === 'spol' ? 'Stoppet: ' : `Senket farten til ${NAVN[mål]}: `) + t + '.', true, sted ? { x: sted.x, y: sted.y } : null);
    // (runde 8) står grunnen alt øverst i loggen («Røverne er snart framme (ca. 9 min).»), skrives den ikke en gang til
    const nyLinje = !(typeof loggLinjer !== 'undefined' && liste.every(h => loggLinjer.slice(0, 3).some(l => l.toLowerCase().includes(h.tekst.toLowerCase()))));
    if (nyLinje) logg((hva === 'spol' ? 'Spolingen stoppet: ' : `Farten er senket til ${NAVN[mål]}: `) + tekst + '.');
    if (hva === 'auto') visGrunn(`Farten ble senket til ${NAVN[mål]}: ${tekst}. Du kan sette den opp igjen.`);
  }
  function spol() {
    if (spoler) { spoler = false; merk(); settFart(R.sakteFart); return false; }
    // RUNDE 8 (PC-kritikeren: et hendelseskort sto åpent fra dag 3 16:52 til dag 4 05:06 mens ⏭ spolte): et kort som venter på svar,
    // stopper spolingen – også når det alt står oppe når du trykker ⏭
    if (kortOppe() && (!navigator.webdriver || api2.test === true)) { visKort('Svar på kortet først – spillet står på pause til du svarer.', false); return false; }
    kort.classList.remove('på'); før = bilde(); spoler = true; merk(); settFart(R.spolFart); return true;
  }
  if (spolKnapp) spolKnapp.onclick = () => spol();
  // en annen fartsknapp avbryter spolingen
  for (const id of ['sp0', 'sp1', 'sp2', 'sp3']) { const b = document.getElementById(id); if (b) b.addEventListener('click', () => { if (spoler) { spoler = false; merk(); } }); }
  // HENDELSER FRA ANDRE MODULER: window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type, tekst } })).
  // type er en nøkkel i Flyt.HENDELSER (natur, fanger, båt, tog … – ukjente regnes som «annet»); tekst står i kortet «Stoppet: …».
  // Branner meldes av spill/verden-visning.js som «riksbrudd-brann»: en ny brann innen 3 km fra leiren stopper spolingen.
  const innboks = []; let branner = 0;
  window.addEventListener('riksbrudd-hendelse', e => { const d = e.detail || {}; if (!d.tekst) return; let type = F.HENDELSER[d.type] ? d.type : 'annet';
    // (runde 8) natur nær leiren stopper som «annet» (verden-visning.js kan sende x og y med)
    if (type === 'natur' && typeof d.x === 'number' && typeof d.y === 'number') { const S = rot.OppstartSpill && OppstartSpill.tilstand(); if (S && S.leir && Math.hypot(d.x - S.leir.x, d.y - S.leir.y) < R.naturNær) type = 'annet'; }
    const h = { type, tekst: String(d.tekst).slice(0, 200) }; if (Number.isFinite(d.x) && Number.isFinite(d.y)) { h.x = d.x; h.y = d.y; }
    innboks.push(h); if (innboks.length > 6) innboks.shift(); });
  window.addEventListener('riksbrudd-brann', () => { const B = rot.BRANNER || [], S = rot.OppstartSpill && OppstartSpill.tilstand(), n = S && S.leir ? B.filter(b => Math.hypot(b.x - S.leir.x, b.y - S.leir.y) < 3000).length : 0; if (n > branner && !branner) innboks.push({ type: 'brann', tekst: 'det brenner nær leiren' }); branner = n; });
  const autoPå = () => valg.auto && (!navigator.webdriver || api2.test === true);
  KROKER.sim.push(() => {
    // køordrene: neste punkt når laget står stille, og «grav ned» etter det siste
    for (const s of ENHETER) {
      if (s.side !== 'blå' || (!s.kø && !s.køSiste)) continue;
      if (!levende(s)) { F.tømKø(s); continue; }
      const p = F.nesteIKø(s);
      if (p) { s.køGår = true; ordre(s, p[0], p[1], true); s.køGår = false; continue; }
      if (s.køSiste && !s.sti && !s.planlegger) { s.køSiste = false; if (s.køSlutt === 'grav' && rot.Feltarbeid && Feltarbeid.startGrav && !s.nedgravd && s.graver == null) { const r = Feltarbeid.startGrav(s); logg(r && r.feil ? s.navn + ': ' + r.feil : s.navn + ' er framme og graver seg ned.'); } s.køSlutt = null; if (valgt === s) visPanel(); }
    }
    // hendelsene: høyst ti bilder i sekundet (ved 600× er det ett per spillminutt)
    const nå = performance.now(); if (nå - sistBilde < 100) return; sistBilde = nå;
    // (runde 13) banneret kan bli høyere etter at kortet ble plassert under det (en knapp til, ny linje) – plasser kortet på nytt
    if (kort.classList.contains('på')) plasserKort();
    if (!spoler && !(autoPå() && tempo > 1)) { før = null; innboks.length = 0; return; }
    const b = bilde(); if (!før) { før = b; innboks.length = 0; return; }
    const h = F.hendelser(før, b).concat(innboks.splice(0)); før = b; if (!h.length) return;
    const st = spoler ? F.stopper(h, 'spol') : F.hviler(F.stopper(h, 'auto'), sistAuto, tid); if (st.length) stopp(st, spoler ? 'spol' : 'auto');
  });

  // ---------- (runde 8) hvem som sendte laget ----------
  // Lag som går av seg selv – hjem for å hvile og fylle ammunisjon (forsvar-hjemme.js), til forsvarsplassen eller mot herjere
  // (forsvar-visning.js), eget initiativ i strid (strid-visning.js) – merkes s.flytSelv og stopper ikke spolingen når de er framme.
  // Disse modulene gir ordren med ordre(s, X, Y, stille = true), men det gjør også ordre som er dine (køordrene, en marsj som fortsetter
  // etter lasting, en ingeniør som går til en bru) – derfor avgjør fila som ga ordren (kallstakken), ikke stille alene.
  const AUTO_FILER = /(forsvar-visning|forsvar-hjemme|strid-visning)\.js/;
  if (typeof rot.ordre === 'function' && !rot.ordre.flyt) { const før = rot.ordre;
    const ny = function (s, X, Y, stille) { if (s && typeof s === 'object' && s.side === 'blå') { let selv = false; if (stille && !s.køGår) { try { selv = AUTO_FILER.test(String(new Error().stack || '')); } catch (e) { selv = false; } } s.flytSelv = selv; }
      return før.apply(this, arguments); };
    ny.flyt = true; rot.ordre = ny; }

  // ---------- marsjtid før ordren ----------
  let forh = null, forhNøkkel = '', forhJobb = 0;
  function forhånd(s, X, Y) {
    const k = s.navn + '|' + Math.round(s.x / 20) + '|' + Math.round(s.y / 20) + '|' + Math.round(X / 40) + '|' + Math.round(Y / 40); if (k === forhNøkkel) return forh;
    forhNøkkel = k; const d = Math.hypot(X - s.x, Y - s.y); forh = { ...F.anslag(d), grov: true, forLangt: typeof MARSJ_MAKS !== 'undefined' && d > MARSJ_MAKS };
    clearTimeout(forhJobb);
    if (d <= R.ekteRute && d > 30) forhJobb = setTimeout(async () => {
      try { const pad = Math.max(2500, d * .3), v = await lagVindu([Math.min(s.x, X) - pad, Math.min(s.y, Y) - pad, Math.max(s.x, X) + pad, Math.max(s.y, Y) + pad], true), r = Terreng.ruteTil(v, s.x, s.y, X, Y);
        if (forhNøkkel !== k) return;
        if (!r) forh = { ingen: true }; else { let km = 0; for (let i = 1; i < r.sti.length; i++) km += Math.hypot(r.sti[i][0] - r.sti[i - 1][0], r.sti[i][1] - r.sti[i - 1][1]) / 1000; forh = { km, timer: r.timer }; }
        skitten = true;
      } catch (e) { /* kartet er ikke lastet her ennå: anslaget står */ }
    }, 220);
    return forh;
  }
  const forhTekst = f => (f.ingen ? 'ingen rute dit' : f.forLangt ? 'for langt for én marsj' : (f.grov ? 'ca. ' : '') + F.kmTekst(f.km) + ' · ' + (f.grov ? 'ca. ' : '') + F.tidTekst(f.timer));
  cv.addEventListener('pointermove', () => { if (modus === 'marsj') skitten = true; });

  // ---------- flere lag på én gang ----------
  let gruppe = [], ramme = null, køModus = false;
  const gp = el('div', { id: 'flytgruppe', role: 'group', 'aria-label': 'Valgte lag' }); document.body.appendChild(gp);
  let gpSist = '';
  function visGruppe() {
    gruppe = gruppe.filter(s => ENHETER.includes(s) && levende(s));
    if (gruppe.length < 2) { gp.classList.remove('på'); gpSist = ''; return; }
    const nøkkel = gruppe.map(s => s.navn + (s.sti ? '>' : '')).join('|') + '|' + modus + '|' + køModus; gp.classList.add('på'); if (nøkkel === gpSist || (rot.pekerNede && pekerNede(gp))) return; gpSist = nøkkel;
    const kn = (t, fn, på) => { const b = el('button', på ? { klasse: 'på' } : {}, t); b.onclick = fn; return b; };
    gp.replaceChildren(el('b', {}, gruppe.length + ' lag valgt'), el('small', {}, gruppe.map(s => s.navn).join(', ')),
      el('div', { klasse: 'kn' },
        kn(modus === 'marsj' && !køModus ? 'Velg mål på kartet …' : 'Marsjer alle', () => { køModus = false; modus = modus === 'marsj' ? null : 'marsj'; visGruppe(); skitten = true; }, modus === 'marsj' && !køModus),
        kn(modus === 'marsj' && køModus ? 'Velg neste punkt …' : 'Legg til i køen', () => { køModus = !(modus === 'marsj' && køModus); modus = køModus ? 'marsj' : null; visGruppe(); skitten = true; }, modus === 'marsj' && køModus),
        kn('Stopp alle', () => { for (const s of gruppe) { s.sti = null; F.tømKø(s); s.siktSkitten = true; } gpSist = ''; visGruppe(); skitten = true; }),
        kn('Opphev', () => velg([]))));
  }
  function velg(lag) { gruppe = (lag || []).filter(s => s.side === 'blå' && levende(s)); køModus = false; if (gruppe.length > 1) { valgt = null; modus = null; visPanel(); } gpSist = ''; visGruppe(); skitten = true; return gruppe.length; }
  function velgIBildet() { const hx = VW / 2 * kam.m, hy = VH / 2 * kam.m, lag = F.iRamme(egne(), kam.x - hx, kam.y - hy, kam.x + hx, kam.y + hy);
    if (!lag.length) logg('Ingen av lagene dine er i bildet.'); else if (lag.length === 1) { velg([]); valgt = lag[0]; visPanel(); skitten = true; } else velg(lag); return lag.length; }
  // ordre til ett lag: rett fram, eller bakerst i køen når laget alt er på veg (kø = true)
  function giOrdre(s, X, Y, kø) {
    if (!KROKER.kanOrdre.every(f => f(s))) return false;
    if (kø && (s.sti || s.planlegger || (s.kø && s.kø.length))) { if (!F.leggIKø(s, X, Y)) { logg(s.navn + ': køen er full (' + R.køMaks + ' punkter).'); return false; } s.køSiste = false; return true; }
    if (kø) { s.køGår = true; ordre(s, X, Y); s.køGår = false; return true; }
    F.tømKø(s); ordre(s, X, Y); return true;
  }
  // trykk i kartet: gruppa får ordren (hvert lag sin plass rundt målet), eller det valgte laget får et punkt til i køen
  // MARSJ MED BEKREFTELSE (telefon og 3D, der ingen peker kan vise marsjtida på forhånd): første trykk setter målet og viser avstand og
  // tid i banneret #marsjvalg, «Gå» gir ordren, et nytt trykk flytter målet. Med mus i 2D går ordren rett ut som før (tida står ved
  // pekeren). I testene (navigator.webdriver) er det bare slik når FlytSpill.test = true.
  let sistePeker = 'mouse', utkast = null, mvSist = '';
  window.addEventListener('pointerdown', e => { sistePeker = e.pointerType || 'mouse'; }, true);
  const mv = el('div', { id: 'marsjvalg', role: 'group', 'aria-label': 'Bekreft marsjen' }); document.body.appendChild(mv);
  const fraPunkt = s => (køModus && s.kø && s.kø.length ? { navn: s.navn + 'k', x: s.kø[s.kø.length - 1][0], y: s.kø[s.kø.length - 1][1] } : køModus && s.sti && s.sti.length ? { navn: s.navn + 'k', x: s.sti[s.sti.length - 1][0], y: s.sti[s.sti.length - 1][1] } : s);
  function visUtkast() {
    if (utkast && (modus !== 'marsj' || !utkast.lag.every(s => ENHETER.includes(s) && levende(s)))) utkast = null;
    if (!utkast) { if (mvSist) { mv.classList.remove('på'); mvSist = ''; } return; }
    const s = utkast.lag[0], f = forhånd(fraPunkt(s), utkast.X, utkast.Y), t = (utkast.lag.length > 1 ? utkast.lag.length + ' lag' : s.navn) + ': ' + (utkast.kø ? '+ ' : '') + forhTekst(f);
    if (t === mvSist || (rot.pekerNede && pekerNede(mv))) return; mvSist = t;
    const gå = el('button', { id: 'marsjgaa', klasse: 'hoved' }, utkast.kø ? 'Legg til' : 'Gå'), nei = el('button', { id: 'marsjnei' }, 'Avbryt');
    gå.disabled = !!(f.ingen || f.forLangt); gå.onclick = () => utfør(); nei.onclick = () => { utkast = null; modus = null; køModus = false; visUtkast(); visPanel(); gpSist = ''; skitten = true; };
    mv.replaceChildren(el('div', {}, el('b', {}, t), el('small', {}, 'Trykk et annet sted for å flytte målet.')), gå, nei); mv.classList.add('på');
  }
  function utfør() { if (!utkast) return false; const u = utkast; utkast = null; køModus = u.kø; const ok = sendOrdre(u.X, u.Y); visUtkast(); return ok; }
  const medBekreft = () => (!navigator.webdriver || api2.test === true) && (sistePeker !== 'mouse' || (typeof på3d !== 'undefined' && på3d));
  const trykk = (X, Y) => {
    if (modus !== 'marsj') return false;
    if (medBekreft()) { const lag = gruppe.length > 1 ? gruppe.slice() : valgt && valgt.side === 'blå' && levende(valgt) ? [valgt] : []; if (!lag.length) return false;
      if (!lag.every(s => KROKER.kanOrdre.every(f => f(s))) && lag.length === 1) { modus = null; visPanel(); return true; }
      utkast = { lag, X, Y, kø: køModus }; mvSist = ''; visUtkast(); skitten = true; return true; }
    return sendOrdre(X, Y);
  };
  // ordren går ut: gruppa (hvert lag sin plass rundt målet), ett lag i køen, eller ett lag rett fram (bare etter bekreftelse – ellers tar kartet seg av det)
  const sendOrdre = (X, Y) => {
    if (modus !== 'marsj') return false;
    if (gruppe.length > 1) { const pl = F.plasser(gruppe.length, X, Y); let n = 0; gruppe.forEach((s, i) => { if (giOrdre(s, pl[i][0], pl[i][1], køModus)) n++; });
      logg(n + ' lag ' + (køModus ? 'har fått et punkt til i køen.' : 'har fått marsjordre.')); modus = null; køModus = false; gpSist = ''; visGruppe(); skitten = true; return true; }
    if (valgt && valgt.side === 'blå' && køModus) { if (giOrdre(valgt, X, Y, true) && valgt.kø) logg(valgt.navn + ': punkt ' + valgt.kø.length + ' lagt i køen.'); modus = null; køModus = false; visPanel(); skitten = true; return true; }
    if (valgt && valgt.side === 'blå' && medBekreft()) { giOrdre(valgt, X, Y, false); modus = null; visPanel(); skitten = true; return true; }
    return false;
  };
  KROKER.trykk.push(trykk); if (KROKER.trykk3d) KROKER.trykk3d.push(trykk);
  // lagpanelet: kø-knappene og «Velg alle i bildet»
  KROKER.lagTekst.push(s => (s.kø && s.kø.length ? 'kø: ' + s.kø.length + ' punkt til (' + F.kmTekst(F.køLengde(s) / 1000) + ')' + (s.køSlutt === 'grav' ? ', graver ned til slutt' : '') : s.køSlutt === 'grav' && s.sti ? 'graver ned når det er framme' : null));
  KROKER.lagKnapper.push((s, H) => {
    if (s.karakter) return;
    if (s.sti || s.planlegger || (s.kø && s.kø.length)) {
      H.appendChild(knapp(modus === 'marsj' && køModus ? 'Velg neste punkt …' : 'Legg til (så dit)', modus === 'marsj' && køModus, () => { køModus = !(modus === 'marsj' && køModus); modus = køModus ? 'marsj' : null; visPanel(); skitten = true; }));
      if (rot.Feltarbeid) H.appendChild(knapp(s.køSlutt === 'grav' ? '… og grav ned ✓' : '… og grav ned', s.køSlutt === 'grav', () => { s.køSlutt = s.køSlutt === 'grav' ? null : 'grav'; if (s.køSlutt && !(s.kø && s.kø.length)) s.køSiste = true; visPanel(); }));
      if (s.kø && s.kø.length) H.appendChild(knapp('Tøm køen', false, () => { F.tømKø(s); visPanel(); skitten = true; }));
    }
    if (egne().length > 1) H.appendChild(knapp('Velg alle i bildet', false, () => (i3d() ? velgIBildet3d() : velgIBildet())));
  });
  // Shift + dra med musa: ramme rundt lagene. Shift + trykk: på et lag = med i/ut av gruppa; ellers et punkt i køen for det valgte laget.
  // (fanges før kartets egne lyttere, så kartet ikke flytter seg)
  let shiftNed = null;
  cv.addEventListener('pointerdown', e => { if (!e.shiftKey || e.pointerType !== 'mouse' || e.button !== 0) return; e.stopImmediatePropagation(); e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const r = cv.getBoundingClientRect(); shiftNed = { id: e.pointerId, x: e.clientX - r.left, y: e.clientY - r.top, flyttet: false }; }, true);
  cv.addEventListener('pointermove', e => { if (!shiftNed || e.pointerId !== shiftNed.id) return; e.stopImmediatePropagation(); const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - shiftNed.x, y - shiftNed.y) > 6) shiftNed.flyttet = true; if (shiftNed.flyttet) { ramme = [shiftNed.x, shiftNed.y, x, y]; skitten = true; } }, true);
  const tilKart = (x, y) => [kam.x + (x - VW / 2) * kam.m, kam.y - (y - VH / 2) * kam.m];
  const shiftOpp = e => { if (!shiftNed || e.pointerId !== shiftNed.id) return; e.stopImmediatePropagation(); const n = shiftNed; shiftNed = null; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.type !== 'pointerup') { ramme = null; skitten = true; return; }
    if (n.flyttet) { const [x0, y0] = tilKart(n.x, n.y), [x1, y1] = tilKart(x, y), lag = F.iRamme(egne(), x0, y0, x1, y1); ramme = null;
      if (lag.length === 1) { velg([]); valgt = lag[0]; visPanel(); } else velg(lag); skitten = true; return; }
    const [X, Y] = tilKart(x, y);
    if (modus === 'marsj' && (valgt || gruppe.length > 1)) { const før = køModus; køModus = true; if (!trykk(X, Y)) køModus = før; return; }
    let best = null, bd = 28; for (const s of egne()) { const d = Math.hypot(s.x - X, s.y - Y) / kam.m; if (d < bd) { bd = d; best = s; } }
    if (best) { const g = gruppe.length ? gruppe.slice() : valgt && valgt.side === 'blå' && !valgt.karakter ? [valgt] : []; const i = g.indexOf(best); if (i >= 0) g.splice(i, 1); else g.push(best);
      if (g.length === 1) { velg([]); valgt = g[0]; visPanel(); skitten = true; } else velg(g); }
    else if (valgt && valgt.side === 'blå' && (valgt.sti || valgt.planlegger)) { if (giOrdre(valgt, X, Y, true) && valgt.kø) logg(valgt.navn + ': punkt ' + valgt.kø.length + ' lagt i køen.'); visPanel(); skitten = true; }
  };
  cv.addEventListener('pointerup', shiftOpp, true); cv.addEventListener('pointercancel', shiftOpp, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { køModus = false; if (gruppe.length) velg([]); } });
  // velger du ett lag på vanlig måte, oppheves gruppa
  setInterval(() => { if (gruppe.length && valgt) { gruppe = []; køModus = false; } if (modus !== 'marsj') køModus = false; visGruppe(); visUtkast(); }, 300);

  // ---------- tegning: køen, gruppa, ramma og marsjtida ved pekeren ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    const sx = X => (X - vx0) / kam.m, sy = Y => (vy1 - Y) / kam.m; g.save();
    for (const s of ENHETER) { if (s.side !== 'blå' || !s.kø || !s.kø.length) continue;
      let [x, y] = s.sti && s.sti.length ? s.sti[s.sti.length - 1] : [s.x, s.y]; g.strokeStyle = 'rgba(240,215,154,.85)'; g.fillStyle = '#f0d79a'; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(sx(x), sy(y));
      for (const [a, b] of s.kø) g.lineTo(sx(a), sy(b)); g.stroke(); g.setLineDash([]); g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      s.kø.forEach(([a, b], i) => { g.fillStyle = '#f0d79a'; g.beginPath(); g.arc(sx(a), sy(b), 8, 0, 6.283); g.fill(); g.fillStyle = '#1c170f'; g.fillText(String(i + 2), sx(a), sy(b) + .5); }); }
    for (const s of gruppe) { g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(sx(s.x), sy(s.y), 17, 0, 6.283); g.stroke(); g.setLineDash([]); }
    if (utkast) { const x = sx(utkast.X), y = sy(utkast.Y), s = utkast.lag[0], fra = fraPunkt(s); g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(sx(fra.x), sy(fra.y)); g.lineTo(x, y); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(x, y, 10, 0, 6.283); g.stroke(); g.beginPath(); g.arc(x, y, 3, 0, 6.283); g.fillStyle = '#f0d79a'; g.fill(); }
    if (ramme) { g.strokeStyle = '#f0d79a'; g.fillStyle = 'rgba(240,215,154,.12)'; g.lineWidth = 1.5; const [a, b, c, d] = ramme; g.fillRect(a, b, c - a, d - b); g.strokeRect(a, b, c - a, d - b); }
    if (modus === 'marsj' && peker) { const s = valgt && valgt.side === 'blå' ? valgt : gruppe[0];
      if (s) { const fra = køModus && s.kø && s.kø.length ? { navn: s.navn + 'k', x: s.kø[s.kø.length - 1][0], y: s.kø[s.kø.length - 1][1] } : køModus && s.sti && s.sti.length ? { navn: s.navn + 'k', x: s.sti[s.sti.length - 1][0], y: s.sti[s.sti.length - 1][1] } : s;
        const f = forhånd(fra, peker[0], peker[1]), t = (køModus ? '+ ' : '') + forhTekst(f) + (gruppe.length > 1 ? ' (' + gruppe.length + ' lag)' : ''), x = sx(peker[0]), y = sy(peker[1]);
        g.strokeStyle = 'rgba(240,215,154,.7)'; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(sx(fra.x), sy(fra.y)); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
        g.font = '600 13px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; const w = g.measureText(t).width + 12, bx = Math.min(VW - w - 4, x + 14), by = Math.max(14, y - 22);
        g.fillStyle = 'rgba(20,16,10,.88)'; g.fillRect(bx, by - 11, w, 22); g.strokeStyle = '#c9b26a'; g.lineWidth = 1; g.strokeRect(bx + .5, by - 10.5, w - 1, 21); g.fillStyle = f.ingen || f.forLangt ? '#e8a46a' : '#f0e2b0'; g.fillText(t, bx + 6, by + .5); } }
    g.restore();
  });

  // målet du har pekt ut, i 3D
  if (KROKER.tegn3d) KROKER.tegn3d.push((g, proj3) => { if (!utkast) return; const p = proj3(utkast.X, utkast.Y); if (!p) return; g.save(); g.strokeStyle = '#f0d79a'; g.lineWidth = 2.5; g.beginPath(); g.arc(p[0], p[1], 12, 0, 6.283); g.stroke(); g.beginPath(); g.moveTo(p[0], p[1] - 22); g.lineTo(p[0], p[1] - 4); g.stroke(); g.restore(); });

  // ---------- RUNDE 4 (pakke «ui»): 3D – ramme med musa, Shift + trykk og marsjtida ved pekeren ----------
  // I 3D roterte Shift + dra kameraet; nå velger det lag som i 2D (høyreknappen roterer som før). Lagene velges etter hvor de står på
  // skjermen (også bak en ås – som i strategispill). Marsjtida står ved pekeren mens du velger mål med mus (målt hvert 0,12 s).
  const R4 = { flytt: 6, nær: 28, målHver: 120 };
  const c3 = document.getElementById('c3');
  const i3d = () => typeof på3d !== 'undefined' && på3d && typeof R3 !== 'undefined' && R3 && R3.ut && R3.cam && !R3.fot && rot.THREE;
  // kartpunkt -> skjermpunkt i 3D (uten å skjule det som står bak en ås)
  function skjerm3d(X, Y) { const u = R3.ut; if (Math.abs(X - u.cx) > u.S || Math.abs(Y - u.cy) > u.S) return null; const h = typeof hoyde3d === 'function' ? hoyde3d(X, Y) : u.h0;
    const v = new THREE.Vector3(X - u.cx, Y - u.cy, (h - u.h0) * (R3.EX || 1) + 1.5); v.project(R3.cam); return v.z > 1 || v.z < -1 ? null : [(v.x + 1) / 2 * VW, (1 - v.y) / 2 * VH]; }
  // skjermpunkt -> bakken i 3D
  function bakke3d(x, y) { if (!R3.ray || !R3.mesh) return null; R3.ray.setFromCamera(new THREE.Vector2(x / VW * 2 - 1, -y / VH * 2 + 1), R3.cam); const h = R3.ray.intersectObject(R3.mesh)[0]; return h ? [R3.ut.cx + h.point.x, R3.ut.cy + h.point.y] : null; }
  const iRamme3d = (a, b, c, d) => { const x0 = Math.min(a, c), x1 = Math.max(a, c), y0 = Math.min(b, d), y1 = Math.max(b, d); return egne().filter(s => { const q = skjerm3d(s.x, s.y); return q && q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1; }); };
  let ned3 = null, ramme3 = null, peker3 = null, peker3Tid = 0, peker3Xy = null;
  if (c3) {
    const lok = e => { const r = c3.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c3.addEventListener('pointerdown', e => { if (!e.shiftKey || e.pointerType !== 'mouse' || e.button !== 0 || !i3d()) return; e.stopImmediatePropagation(); e.preventDefault(); c3.setPointerCapture(e.pointerId);
      const [x, y] = lok(e); ned3 = { id: e.pointerId, x, y, flyttet: false }; }, true);
    c3.addEventListener('pointermove', e => {
      if (ned3 && e.pointerId === ned3.id) { e.stopImmediatePropagation(); const [x, y] = lok(e); if (Math.hypot(x - ned3.x, y - ned3.y) > R4.flytt) ned3.flyttet = true; if (ned3.flyttet) ramme3 = [ned3.x, ned3.y, x, y]; return; }
      // marsjtida ved pekeren: bare med mus, i marsjmodus og ikke oftere enn hver 0,12 s (stråletreff mot terrengnettet koster)
      if (e.pointerType === 'mouse' && modus === 'marsj' && !e.buttons && i3d()) { peker3Xy = lok(e); const nå = performance.now(); if (nå - peker3Tid > R4.målHver) { peker3Tid = nå; peker3 = bakke3d(peker3Xy[0], peker3Xy[1]); } }
      else if (peker3) peker3 = null; }, true);
    const opp3 = e => { if (!ned3 || e.pointerId !== ned3.id) return; e.stopImmediatePropagation(); const n = ned3; ned3 = null; const [x, y] = lok(e); ramme3 = null;
      if (e.type !== 'pointerup' || !i3d()) return;
      if (n.flyttet) { const lag = iRamme3d(n.x, n.y, x, y); if (lag.length === 1) { velg([]); valgt = lag[0]; visPanel(); } else if (lag.length) velg(lag); else logg('Ingen av lagene dine er innenfor ramma.'); return; }
      // Shift + trykk på et lag: med i / ut av gruppa (som i 2D)
      let best = null, bd = R4.nær; for (const s of egne()) { const q = skjerm3d(s.x, s.y); if (!q) continue; const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = s; } }
      if (best) { const g = gruppe.length ? gruppe.slice() : valgt && valgt.side === 'blå' && !valgt.karakter ? [valgt] : []; const i = g.indexOf(best); if (i >= 0) g.splice(i, 1); else g.push(best);
        if (g.length === 1) { velg([]); valgt = g[0]; visPanel(); } else velg(g); } };
    c3.addEventListener('pointerup', opp3, true); c3.addEventListener('pointercancel', opp3, true);
  }
  // «Velg lag» i 3D: lagene som står på skjermen
  function velgIBildet3d() { const lag = egne().filter(s => { const q = skjerm3d(s.x, s.y); return q && q[0] >= 0 && q[0] <= VW && q[1] >= 0 && q[1] <= VH; });
    if (!lag.length) logg('Ingen av lagene dine er i bildet.'); else if (lag.length === 1) { velg([]); valgt = lag[0]; visPanel(); } else velg(lag); return lag.length; }
  if (KROKER.tegn3d) KROKER.tegn3d.push(g => {
    if (!i3d()) return; g.save();
    // gruppa: stiplet ring rundt hvert lag
    for (const s of gruppe) { const q = skjerm3d(s.x, s.y); if (!q) continue; g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(q[0], q[1], 17, 0, 6.283); g.stroke(); g.setLineDash([]); }
    if (ramme3) { const [a, b, c, d] = ramme3; g.strokeStyle = '#f0d79a'; g.fillStyle = 'rgba(240,215,154,.12)'; g.lineWidth = 1.5; g.fillRect(a, b, c - a, d - b); g.strokeRect(a, b, c - a, d - b); }
    if (modus === 'marsj' && peker3 && peker3Xy && !utkast) { const s = valgt && valgt.side === 'blå' ? valgt : gruppe[0];
      if (s) { const fra = fraPunkt(s), f = forhånd(fra, peker3[0], peker3[1]), t = (køModus ? '+ ' : '') + forhTekst(f) + (gruppe.length > 1 ? ' (' + gruppe.length + ' lag)' : ''), q = skjerm3d(fra.x, fra.y), [x, y] = peker3Xy;
        if (q) { g.strokeStyle = 'rgba(240,215,154,.7)'; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
        g.font = '600 13px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; const w = g.measureText(t).width + 12, bx = Math.min(VW - w - 4, x + 14), by = Math.max(14, y - 22);
        g.fillStyle = 'rgba(20,16,10,.88)'; g.fillRect(bx, by - 11, w, 22); g.strokeStyle = '#c9b26a'; g.lineWidth = 1; g.strokeRect(bx + .5, by - 10.5, w - 1, 21); g.fillStyle = f.ingen || f.forLangt ? '#e8a46a' : '#f0e2b0'; g.fillText(t, bx + 6, by + .5); } }
    g.restore();
  });

  // ---------- Leir-menyen (fanen Mål): av/på for automatisk stopp ----------
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e2, knapp: kn }) => {
    hode.appendChild(e2('h3', { 'data-fane': 'mål' }, 'Mål · tid og flyt'));
    hode.appendChild(e2('div', { klasse: 'dagbok' }, '⏭ ved fartsknappene spoler til neste hendelse som krever deg (et lag du sendte er framme, bygg ferdig, fienden nær, alarm, ny dag, et kort som venter på svar) og går så ned til 1×.'));
    const b = kn('Senk farten selv ved alarm, kontakt og ferdig bygg: ' + (valg.auto ? 'på' : 'av'), valg.auto, () => { valg.auto = !valg.auto; lagre(); if (rot.LeirSpill && LeirSpill.vis) LeirSpill.vis(); b.textContent = 'Senk farten selv ved alarm, kontakt og ferdig bygg: ' + (valg.auto ? 'på' : 'av'); });
    b.id = 'flytauto'; hode.appendChild(b);
  });
  // kommandolinja nederst på PC: «Alle lag» velger lagene i bildet
  (rot.KOMMANDO_TILLEGG = rot.KOMMANDO_TILLEGG || []).push({ k: 'allelag', navn: 'Velg lag', tittel: 'Velg alle lagene dine som er i bildet (eller Shift + dra en ramme)', fins: () => egne().length > 1 && !(typeof R3 !== 'undefined' && R3 && R3.fot), på: () => gruppe.length > 1, trykk: () => { if (gruppe.length > 1) velg([]); else if (i3d()) velgIBildet3d(); else velgIBildet(); },
    ikon: '<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><circle cx="12" cy="16" r="3"/><rect x="2" y="2" width="20" height="20" fill="none" stroke-dasharray="3 2"/>' });

  const api2 = { test: false, spol, spoler: () => spoler, bilde, sistStopp: () => sistStopp, valg: () => valg, settAuto: v => { valg.auto = !!v; lagre(); }, velg, velgIBildet, gruppe: () => gruppe.slice(), giOrdre, forhånd, forhTekst,
    utkast: () => utkast, utfør, iRamme3d, velgIBildet3d, skjerm3d: (X, Y) => (i3d() ? skjerm3d(X, Y) : null), peker3: () => peker3, køModus: v => { if (v !== undefined) { køModus = !!v; modus = køModus ? 'marsj' : null; } return køModus; }, trykk };
  rot.FlytSpill = api2;
})(typeof globalThis !== 'undefined' ? globalThis : this);
