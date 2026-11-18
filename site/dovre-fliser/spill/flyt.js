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
    spolFart: 'sp4',     // farten det spoles i (600×)
    visSek: 9,           // sekunder kortet «Stoppet: …» står
  };
  // Hvilke hendelser som stopper hva: spol = «spol til neste hendelse», auto = automatisk nedbremsing når du selv har satt opp farten
  const HENDELSER = {
    framme: { spol: true, auto: false },
    kontakt: { spol: true, auto: true },
    alarm: { spol: true, auto: true },
    bygg: { spol: true, auto: true },
    dag: { spol: true, auto: false },
    mål: { spol: true, auto: false },
    tettsted: { spol: true, auto: false },
    tapt: { spol: true, auto: true },
  };
  // Øyeblikksbildet B: { dag, marsj: { navn: true }, strid (egne lag i ildkamp), fiender (fiender du ser), bygg (ferdige bygg),
  //   alarm (leiren angripes), mål (mål nådd), tettsteder (dine), lag (egne lag som lever) }
  // hendelser(før, nå) gir lista over det som har skjedd mellom to bilder: [{ type, tekst }]
  function hendelser(før, nå) {
    const ut = []; if (!før || !nå) return ut;
    const framme = Object.keys(før.marsj || {}).filter(n => !(nå.marsj || {})[n] && (nå.navn || []).includes(n));
    if (framme.length) ut.push({ type: 'framme', tekst: framme.length === 1 ? framme[0] + ' er framme' : framme.length + ' lag er framme' });
    if (nå.alarm && !før.alarm) ut.push({ type: 'alarm', tekst: 'leiren angripes' });
    if ((nå.strid || 0) > (før.strid || 0)) ut.push({ type: 'kontakt', tekst: 'et lag er i ildkamp' });
    else if ((nå.fiender || 0) > (før.fiender || 0)) ut.push({ type: 'kontakt', tekst: 'fienden er i sikte' });
    if ((nå.lag || 0) < (før.lag || 0)) ut.push({ type: 'tapt', tekst: 'et lag er slått ut' });
    if ((nå.bygg || 0) > (før.bygg || 0)) ut.push({ type: 'bygg', tekst: 'et bygg er ferdig' });
    if ((nå.tettsteder || 0) > (før.tettsteder || 0)) ut.push({ type: 'tettsted', tekst: 'du har tatt et tettsted' });
    else if ((nå.tettsteder || 0) < (før.tettsteder || 0)) ut.push({ type: 'tettsted', tekst: 'du har mistet et tettsted' });
    if ((nå.mål || 0) > (før.mål || 0)) ut.push({ type: 'mål', tekst: 'et mål er nådd' });
    if (nå.dag !== før.dag) ut.push({ type: 'dag', tekst: 'ny dag (dag ' + nå.dag + ')' });
    return ut;
  }
  // det som skal stoppe tiden: hva = 'spol' eller 'auto'
  const stopper = (liste, hva) => liste.filter(h => HENDELSER[h.type] && HENDELSER[h.type][hva]);
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
  const api = { REGLER, HENDELSER, hendelser, stopper, anslag, tidTekst, kmTekst, leggIKø, nesteIKø, tømKø, køLengde, plasser, iRamme };
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
  function bilde() {
    const L = rot.LeirSpill && LeirSpill.tilstand(), lag = egne(), marsj = {};
    for (const s of lag) if (s.sti || s.planlegger || (s.kø && s.kø.length)) marsj[s.navn] = true;
    let tettsteder = 0; if (rot.TETTSTEDER) for (const t of TETTSTEDER.values()) if (t && t.eier === 'blå') tettsteder++;
    const al = document.getElementById('alarm');
    return { dag: Math.floor((6 + tid / 60) / 24) + 1, marsj, navn: lag.map(s => s.navn), lag: lag.length,
      strid: lag.filter(s => s.skyterPå && s.skyterPå.size).length + ENHETER.filter(e => e.side !== 'blå' && e.skyterPå && [...e.skyterPå].some(b => b.side === 'blå')).length,
      fiender: ENHETER.filter(e => e.side !== 'blå' && levende(e) && synlig(e)).length,
      bygg: L && rot.Leir ? (L.bygg || []).filter(b => Leir.ferdig(b)).length : 0,
      alarm: ENHETER.some(e => e.raid && levende(e)) || !!(al && al.classList.contains('på') && !al.classList.contains('satt')),
      mål: rot.MaalSpill ? MaalSpill.ferdige().size : 0, tettsteder };
  }

  // ---------- spol til neste hendelse og automatisk stopp ----------
  const css = document.createElement('style');
  css.textContent = `#nesteh{ min-width:38px; } #nesteh.på{ background:#6a5a2e; color:#fff; }
body.kort .knapper #nesteh{ min-width:34px; padding:0 6px; }
#flytkort{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 8px); z-index:12; display:none; max-width:min(520px,94vw); padding:6px 10px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; gap:8px; align-items:center; flex-wrap:wrap; justify-content:center; }
#flytkort.på{ display:flex; } #flytkort b{ color:#f0e2b0; } #flytkort button, #flytgruppe button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:inherit; min-height:34px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; }
#flytgruppe{ position:fixed; left:10px; top:calc(var(--topp,58px) + 56px); z-index:10; display:none; max-width:min(330px,92vw); padding:8px 10px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#flytgruppe.på{ display:block; } #flytgruppe .kn{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; } #flytgruppe small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; line-height:1.3; } #flytgruppe button.på{ border-color:#c9b26a; background:#4a3f22; }
body.krig #flytgruppe{ display:none; } body.smal #flytgruppe, body.kort #flytgruppe{ top:auto; bottom:64px; left:6px; max-width:calc(100vw - 70px); }`;
  document.head.appendChild(css);
  const kort = el('div', { id: 'flytkort', role: 'status' }); document.body.appendChild(kort);
  let spoler = false, før = null, sistBilde = 0, kortTid = 0, sistStopp = null;
  const spolKnapp = document.getElementById('nesteh');
  function visKort(tekst, medSpol) {
    kort.replaceChildren(el('span', {}, '⏭ ', el('b', {}, tekst)));
    if (medSpol) { const b = el('button', {}, 'Spol videre'); b.onclick = () => spol(); kort.append(b); }
    const x = el('button', { 'aria-label': 'Lukk' }, '×'); x.onclick = () => kort.classList.remove('på'); kort.append(x);
    kort.classList.add('på'); clearTimeout(kortTid); kortTid = setTimeout(() => kort.classList.remove('på'), R.visSek * 1000);
  }
  function merk() { if (spolKnapp) { spolKnapp.classList.toggle('på', spoler); spolKnapp.setAttribute('aria-pressed', String(spoler)); } }
  function stopp(liste, hva) {
    const tekst = liste.map(h => h.tekst).join(', '); sistStopp = { hva, liste, tid };
    spoler = false; merk(); settFart(R.sakteFart);
    const t = tekst.charAt(0).toUpperCase() + tekst.slice(1);
    visKort((hva === 'spol' ? 'Stoppet: ' : 'Senket farten: ') + t + '.', true); logg((hva === 'spol' ? 'Spolingen stoppet: ' : 'Farten er senket: ') + tekst + '.');
  }
  function spol() {
    if (spoler) { spoler = false; merk(); settFart(R.sakteFart); return false; }
    kort.classList.remove('på'); før = bilde(); spoler = true; merk(); settFart(R.spolFart); return true;
  }
  if (spolKnapp) spolKnapp.onclick = () => spol();
  // en annen fartsknapp avbryter spolingen
  for (const id of ['sp0', 'sp1', 'sp2', 'sp3']) { const b = document.getElementById(id); if (b) b.addEventListener('click', () => { if (spoler) { spoler = false; merk(); } }); }
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
    if (!spoler && !(autoPå() && tempo > 1)) { før = null; return; }
    const b = bilde(); if (!før) { før = b; return; }
    const h = F.hendelser(før, b); før = b; if (!h.length) return;
    const st = F.stopper(h, spoler ? 'spol' : 'auto'); if (st.length) stopp(st, spoler ? 'spol' : 'auto');
  });

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
  const trykk = (X, Y) => {
    if (modus !== 'marsj') return false;
    if (gruppe.length > 1) { const pl = F.plasser(gruppe.length, X, Y); let n = 0; gruppe.forEach((s, i) => { if (giOrdre(s, pl[i][0], pl[i][1], køModus)) n++; });
      logg(n + ' lag ' + (køModus ? 'har fått et punkt til i køen.' : 'har fått marsjordre.')); modus = null; køModus = false; gpSist = ''; visGruppe(); skitten = true; return true; }
    if (valgt && valgt.side === 'blå' && køModus) { if (giOrdre(valgt, X, Y, true) && valgt.kø) logg(valgt.navn + ': punkt ' + valgt.kø.length + ' lagt i køen.'); modus = null; køModus = false; visPanel(); skitten = true; return true; }
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
    if (egne().length > 1) H.appendChild(knapp('Velg alle i bildet', false, () => velgIBildet()));
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
  setInterval(() => { if (gruppe.length && valgt) { gruppe = []; køModus = false; } if (modus !== 'marsj') køModus = false; visGruppe(); }, 300);

  // ---------- tegning: køen, gruppa, ramma og marsjtida ved pekeren ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    const sx = X => (X - vx0) / kam.m, sy = Y => (vy1 - Y) / kam.m; g.save();
    for (const s of ENHETER) { if (s.side !== 'blå' || !s.kø || !s.kø.length) continue;
      let [x, y] = s.sti && s.sti.length ? s.sti[s.sti.length - 1] : [s.x, s.y]; g.strokeStyle = 'rgba(240,215,154,.85)'; g.fillStyle = '#f0d79a'; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(sx(x), sy(y));
      for (const [a, b] of s.kø) g.lineTo(sx(a), sy(b)); g.stroke(); g.setLineDash([]); g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      s.kø.forEach(([a, b], i) => { g.fillStyle = '#f0d79a'; g.beginPath(); g.arc(sx(a), sy(b), 8, 0, 6.283); g.fill(); g.fillStyle = '#1c170f'; g.fillText(String(i + 2), sx(a), sy(b) + .5); }); }
    for (const s of gruppe) { g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(sx(s.x), sy(s.y), 17, 0, 6.283); g.stroke(); g.setLineDash([]); }
    if (ramme) { g.strokeStyle = '#f0d79a'; g.fillStyle = 'rgba(240,215,154,.12)'; g.lineWidth = 1.5; const [a, b, c, d] = ramme; g.fillRect(a, b, c - a, d - b); g.strokeRect(a, b, c - a, d - b); }
    if (modus === 'marsj' && peker) { const s = valgt && valgt.side === 'blå' ? valgt : gruppe[0];
      if (s) { const fra = køModus && s.kø && s.kø.length ? { navn: s.navn + 'k', x: s.kø[s.kø.length - 1][0], y: s.kø[s.kø.length - 1][1] } : køModus && s.sti && s.sti.length ? { navn: s.navn + 'k', x: s.sti[s.sti.length - 1][0], y: s.sti[s.sti.length - 1][1] } : s;
        const f = forhånd(fra, peker[0], peker[1]), t = (køModus ? '+ ' : '') + forhTekst(f) + (gruppe.length > 1 ? ' (' + gruppe.length + ' lag)' : ''), x = sx(peker[0]), y = sy(peker[1]);
        g.strokeStyle = 'rgba(240,215,154,.7)'; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(sx(fra.x), sy(fra.y)); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
        g.font = '600 13px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; const w = g.measureText(t).width + 12, bx = Math.min(VW - w - 4, x + 14), by = Math.max(14, y - 22);
        g.fillStyle = 'rgba(20,16,10,.88)'; g.fillRect(bx, by - 11, w, 22); g.strokeStyle = '#c9b26a'; g.lineWidth = 1; g.strokeRect(bx + .5, by - 10.5, w - 1, 21); g.fillStyle = f.ingen || f.forLangt ? '#e8a46a' : '#f0e2b0'; g.fillText(t, bx + 6, by + .5); } }
    g.restore();
  });

  // ---------- Leir-menyen (fanen Mål): av/på for automatisk stopp ----------
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e2, knapp: kn }) => {
    hode.appendChild(e2('h3', { 'data-fane': 'mål' }, 'Mål · tid og flyt'));
    hode.appendChild(e2('div', { klasse: 'dagbok' }, '⏭ ved fartsknappene spoler til neste hendelse (lag framme, bygg ferdig, fienden i sikte, alarm, ny dag, mål nådd) og går så ned til 1×.'));
    const b = kn('Senk farten selv ved alarm, kontakt og ferdig bygg: ' + (valg.auto ? 'på' : 'av'), valg.auto, () => { valg.auto = !valg.auto; lagre(); if (rot.LeirSpill && LeirSpill.vis) LeirSpill.vis(); b.textContent = 'Senk farten selv ved alarm, kontakt og ferdig bygg: ' + (valg.auto ? 'på' : 'av'); });
    b.id = 'flytauto'; hode.appendChild(b);
  });
  // kommandolinja nederst på PC: «Alle lag» velger lagene i bildet
  (rot.KOMMANDO_TILLEGG = rot.KOMMANDO_TILLEGG || []).push({ k: 'allelag', navn: 'Velg lag', tittel: 'Velg alle lagene dine som er i bildet (eller Shift + dra en ramme)', fins: () => egne().length > 1 && !(typeof på3d !== 'undefined' && på3d), på: () => gruppe.length > 1, trykk: () => { if (gruppe.length > 1) velg([]); else velgIBildet(); },
    ikon: '<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><circle cx="12" cy="16" r="3"/><rect x="2" y="2" width="20" height="20" fill="none" stroke-dasharray="3 2"/>' });

  const api2 = { test: false, spol, spoler: () => spoler, bilde, sistStopp: () => sistStopp, valg: () => valg, settAuto: v => { valg.auto = !!v; lagre(); }, velg, velgIBildet, gruppe: () => gruppe.slice(), giOrdre, forhånd, forhTekst,
    køModus: v => { if (v !== undefined) { køModus = !!v; modus = køModus ? 'marsj' : null; } return køModus; }, trykk };
  rot.FlytSpill = api2;
})(typeof globalThis !== 'undefined' ? globalThis : this);
