'use strict';
// K2 – leiren (regler: spill/leir.js). Knappen «Leir» øverst åpner byggemenyen (kassa, strøm, drivstoff, materialer, byggelag og kø,
// og bygglista). Velg et bygg, trykk på kartet (2D eller 3D): skissen er grønn når det kan bygges og rød ellers, også som et
// gjennomsiktig bygg i 3D. Roter 15° om gangen, rutenett (2,5 m og 15°) av og på, nye bygg retter seg etter nærmeste nabo, og porter
// festes i gjerdet. Gjerdet trykkes punkt for punkt («Angre punkt», «Lukk ringen»). Trykk på et bygg for byggpanelet: oppgrader,
// reparer, flytt og riv. Fiender i leiren skader byggene. Lagres i nettleseren («riksbrudd-k2»).
// Plassering og planlegging (12. nov): nye bygg legger seg inntil naboen (Leir.snapp, hjelpelinjer, avstand), for bratt grunn avvises,
// «Fortsett» setter ut flere av samme slag, tastene R/Q (roter), Enter (bygg) og Esc (avbryt). Planen: «Planlegg» gir gratis skisser
// (blå) som holder plassen; trykk på en skisse for å bygge den nå, flytte, kopiere eller fjerne den; «Bygg hele planen», angre/gjør om
// (Ctrl+Z/Ctrl+Y), og maler (leiren lagres rundt midten og settes inn et annet sted, også dreid). Malene lagres i «riksbrudd-maler».
// Brukerens valg etter feiljakten (12. nov): utposter er lov, men byggelaget må reise dit (Leir.reise – reisetiden står i banneret før
// du bekrefter, i byggpanelet og i jobblista); byggeplasser kan skades av fiender, og en ødelagt byggeplass gir de ubrukte materialene
// tilbake (Leir.skad); radiomastens nivå og rekkevidde står i byggpanelet; leirens diesel forklares ved drivstoffet i menyen.
// Kroker: KROKER.sim (bygging, strøm, skade), KROKER.trykk/trykk3d (plassering og byggpanel), KROKER.tegn (kartet), KROKER.bygg3d/sett3d (3D).
(function () {
  const LB = Leir, NØKKEL = 'riksbrudd-k2', r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  // RUNDE 14 (kritiker J: «utstyr og deler 5 mill. kr» for et vakttårn i tre var vanskelig å tro på): hva utstyret er, per bygg.
  // Listene er Claudes forslag; prisene er uendret.
  const UTSTYR = { vakttårn: 'lyskaster, radio, våpenfeste og stålfester', brakke: 'senger, ovn, vinduer og dører', kontrollrom: 'skjermer, radioer, kart og datamaskiner',
    port: 'portmotor, bom og vaktbu', batteri: 'batterier og omformer', aggregat: 'dieselaggregat og koblingsskap', solcelle: 'paneler og omformer', verksted: 'verktøy, løftebukk og sveiseapparat',
    sykestue: 'senger, medisiner og utstyr', drivstofftank: 'tank, pumpe og slanger', kameramast: 'kamera, mast og kabel', radiomast: 'sender, antenne og mast', drivhus: 'glass, lys og varme',
    helikopterplass: 'lys, drivstoffpumpe og radio', lagertelt: 'telt og reoler', container: 'containeren' };
  // midt i en setning: «utstyr og deler – lyskaster, radio … – 5 mill. kr»; sist: «utstyr og deler: lyskaster, radio …»
  const delNavn = (id, sist) => ((LB.PRISDEL || {}).navn || 'utstyr og deler') + (UTSTYR[id] ? (sist ? `: ${UTSTYR[id]}` : ` – ${UTSTYR[id]} –`) : '');
  let L = null, plassering = null, valgtBygg = null, valgtPlan = null, sist = null, akk = 0, meny = false, rutenett = true, inntil = true, planModus = false, fortsett = false;
  const angre = [], gjørOm = [], MALER = 'riksbrudd-maler';
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const les = () => { try { return LB.fraJSON(localStorage.getItem(NØKKEL)); } catch (e) { return null; } };
  const lagre = () => { try { localStorage.setItem(NØKKEL, LB.tilJSON(L)); } catch (e) { /* privat vindu */ } };
  const bonus = () => OppstartSpill.bonus();

  // ---------- stil og knapper ----------
  const css = document.createElement('style');
  css.textContent = `#leirmeny{ position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); width:min(350px, calc(100vw - 20px));
  z-index:6; display:none; flex-direction:column; background:#16120c; border:1px solid var(--rule); color:var(--ink); overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; touch-action:pan-y; }
#leirmeny.på{ display:flex; }
#leirmeny .hode{ padding:10px 12px 6px; border-bottom:1px solid var(--rule); flex:0 0 auto; }
#leirmeny h2{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:22px; }
#leirmeny h3{ margin:8px 0 2px; font-size:14px; color:var(--hover); font-weight:600; }
#leirmeny .status{ font-size:14px; color:var(--ink-dim); margin-top:6px; line-height:1.3; display:grid; grid-template-columns:1fr 1fr; gap:4px; }
#leirmeny .flis{ background:#221c13; border:1px solid #3a3226; padding:4px 8px; min-width:0; } #leirmeny .flis small{ display:block; font-size:11.5px; letter-spacing:.06em; text-transform:uppercase; opacity:.8; }
#leirmeny .flis b{ color:var(--ink); font-weight:600; font-size:15px; white-space:nowrap; } #leirmeny .flis.fare{ border-color:#8a4a3a; } #leirmeny .status .linje{ grid-column:1 / -1; font-size:13px; }
#leirmeny .liste h4{ margin:10px 4px 2px; font-size:12px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-dim); border-bottom:1px solid var(--rule); padding-bottom:3px; } #leirmeny .liste h4:first-child{ margin-top:2px; }
#leirmeny .faner{ display:flex; gap:0; margin:8px -12px -6px; border-top:1px solid var(--rule); }
#leirmeny .faner button{ flex:1; border:none; border-right:1px solid var(--rule); background:#1c1710; min-height:38px; color:var(--ink-dim); } #leirmeny .faner button:last-child{ border-right:none; }
#leirmeny .faner button.på{ background:var(--panel); color:var(--ink); box-shadow:inset 0 -3px 0 #c9b26a; font-weight:600; }
#leirmeny [hidden]{ display:none !important; }
#leirmeny .liste{ padding:6px 8px 10px; flex:0 0 auto; }
#leirmeny .bygg{ display:flex; gap:8px; align-items:center; padding:6px 4px; border-bottom:1px solid #3a3226; }
#leirmeny h3.del{ cursor:pointer; position:relative; padding-right:24px; user-select:none; -webkit-user-select:none; } #leirmeny h3.del::after{ content:'▾'; position:absolute; right:4px; top:8px; font-size:13px; opacity:.8; } #leirmeny h3.del.lukket::after{ content:'▸'; }
#leirmeny h3.del:hover{ color:#f0dc9a; } #leirmeny h3.del.lukket{ margin-bottom:0; opacity:.9; } #leirmeny .delboks.lukket > :not(h3):not(:has(h3)){ display:none; } #leirmeny .hale[hidden]{ display:none; } #leirmeny .hale{ border-bottom:0; padding-top:2px; } #leirmeny .hale:empty{ display:none; }
#leirmeny .liste{ display:grid; grid-template-columns:repeat(auto-fill, minmax(132px, 1fr)); gap:7px; } #leirmeny .liste[hidden], #leirmeny .liste [hidden]{ display:none; } #leirmeny .liste h4{ grid-column:1 / -1; }
#leirmeny .bygg.kort{ flex-direction:column; align-items:stretch; gap:3px; padding:6px 7px 7px; background:linear-gradient(180deg,#2c2416,#1a140b); border:1px solid #4a3d24; border-radius:4px; transition:border-color .12s, transform .12s; }
#leirmeny .bygg.kort:hover{ border-color:#c9b26a; transform:translateY(-1px); } #leirmeny .bygg.kort .tegn{ width:100%; height:58px; object-fit:contain; background:radial-gradient(ellipse at 50% 80%, rgba(201,178,106,.16), rgba(0,0,0,0) 70%); pointer-events:none; }
#leirmeny .bygg.kort b{ display:block; font-size:14.5px; line-height:1.15; } #leirmeny .bygg.kort .pris{ color:#f0dc9a; font-size:13.5px; } #leirmeny .bygg.kort .kortlinje{ font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#leirmeny .bygg.kort .mer{ display:none; } #leirmeny .bygg.kort button{ width:100%; height:30px; margin-top:2px; } #leirmeny .bygg.kort button:disabled{ opacity:.45; }
@media (prefers-reduced-motion:reduce){ #leirmeny .bygg.kort{ transition:none; } #leirmeny .bygg.kort:hover{ transform:none; } }
#leirmeny .bygg div{ flex:1; min-width:0; } #leirmeny .bygg b{ font-weight:600; } #leirmeny .bygg small{ display:block; color:var(--ink-dim); font-size:12.5px; }
#leirmeny button, #byggvalg button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:40px; padding:4px 12px; cursor:pointer; font:inherit; }
#leirmeny button:disabled, #byggvalg button:disabled{ opacity:.45; cursor:default; }
#leirmeny .lukk{ float:right; min-height:36px; border:none; background:none; font-size:22px; }
#leirmeny .igang{ font-size:13.5px; color:var(--ink); margin:2px 0 0; }
#leirmeny .mat{ display:flex; align-items:center; gap:6px; font-size:13.5px; margin:3px 0; } #leirmeny .mat span{ flex:1; }
#leirmeny .mat button{ min-height:34px; padding:2px 8px; font-size:13px; }
#leirmeny .mat .fyll{ display:block; height:5px; margin-top:2px; background:#2a2318; border:1px solid #3a3226; max-width:150px; } #leirmeny .mat .fyll b{ display:block; height:100%; background:#8a7a4a; }
#byggvalg{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(70px + env(safe-area-inset-bottom,0px)); z-index:11; display:none; background:var(--panel);
  border:1px solid var(--hover); padding:10px 14px; color:var(--ink); max-width:min(600px,94vw); text-align:center; }
#byggvalg.på{ display:block; } #byggvalg button{ margin:6px 3px 0; } #byggvalg small{ color:var(--ink-dim); display:block; }
#byggvalg small.forklar{ margin-top:3px; line-height:1.35; }
body.kort #byggvalg{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(52px + env(safe-area-inset-right,0px)); transform:none; max-width:none; bottom:calc(6px + env(safe-area-inset-bottom,0px));
  padding:6px 8px; font-size:13.5px; max-height:44vh; overflow-y:auto; }
body.kort #byggvalg button{ min-height:34px; padding:2px 8px; margin:4px 2px 0; }
/* RUNDE 12: liggende telefon – Leir-menyen går helt ned (telefon.js/skjermlag.js), og de fire tallene står på én smal rad så byggekortene
   kommer høyere opp (før måtte lista rulles fram). Strømlinja er én linje. */
body.kort.tlfligg #leirmeny .status{ grid-template-columns:repeat(4, minmax(0,1fr)); gap:3px; margin-top:2px; } body.kort.tlfligg #leirmeny h2{ margin:0; font-size:19px; }
body.kort.tlfligg #leirmeny .flis{ padding:2px 5px; } body.kort.tlfligg #leirmeny .flis small{ font-size:9.5px; letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } body.kort.tlfligg #leirmeny .flis b{ font-size:12.5px; display:block; overflow:hidden; text-overflow:ellipsis; }
body.kort.tlfligg #leirmeny .status .linje{ font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
/* RUNDE 13: ingen «…» i tallboksene liggende – kort ord og kort tall (data-kort), uten ikonet (det tok plassen), og bryter heller enn å kuttes */
body.kort.tlfligg #leirmeny .flis[data-ikon]::before{ display:none; }
body.kort.tlfligg #leirmeny .flis :is(small, b)[data-kort]{ font-size:0; white-space:normal; overflow:visible; text-overflow:clip; }
body.kort.tlfligg #leirmeny .flis small[data-kort]::after{ content:attr(data-kort); font-size:9.5px; } body.kort.tlfligg #leirmeny .flis b[data-kort]::after{ content:attr(data-kort); font-size:12.5px; line-height:1.15; }
body.kort.tlfligg #leirmeny .status .linje{ white-space:normal; line-height:1.3; }
/* RUNDE 12: liggende telefon – én linje tekst og én rad knapper (se kortBanner) */
body.kort.tlfligg #byggvalg.på{ display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:4px; left:calc((100vw - 52px) / 2); right:auto; transform:translateX(-50%); width:max-content; max-width:min(640px, calc(100vw - 72px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px))); padding:4px 6px; max-height:none; overflow:visible; }
body.kort.tlfligg #byggvalg .btekst{ flex:1 1 100%; min-width:0; font-size:13px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; cursor:pointer; }
body.kort.tlfligg #byggvalg.harsmå:not(.helt) .btekst::after{ content:' ⓘ'; color:var(--ink-dim); }
body.kort.tlfligg #byggvalg:not(.helt) > small{ display:none; } body.kort.tlfligg #byggvalg.helt .btekst{ white-space:normal; } body.kort.tlfligg #byggvalg > small{ flex:1 1 100%; font-size:12px; }
body.kort.tlfligg #byggvalg button{ margin:0; flex:none; min-height:36px; } body.kort.tlfligg #byggvalg button[data-kort]{ font-size:0; min-width:40px; padding:0 9px; }
body.kort.tlfligg #byggvalg button[data-kort]::after{ content:attr(data-kort); font-size:14px; } body.kort.tlfligg #byggvalg button.slått{ border-color:#c9b26a; color:#f0dc9a; background:#3a3020; }
/* RUNDE 13: ikon med en kort tekst under (liggende telefon), og tegnet foran hele teksten ellers */
body.kort.tlfligg #byggvalg button[data-etikett]{ font-size:0; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; min-width:50px; padding:1px 6px; line-height:1.05; }
body.kort.tlfligg #byggvalg button[data-etikett]::before{ content:attr(data-tegn); font-size:16px; line-height:1; }
body.kort.tlfligg #byggvalg button[data-etikett]::after{ content:attr(data-etikett); font-size:10.5px; letter-spacing:.01em; margin-top:2px; color:var(--ink-dim); }
body.kort.tlfligg #byggvalg button.slått[data-etikett]::after{ color:#f0dc9a; }
/* RUNDE 14 (kritiker I, bilde 17: «DIES 0/0 l» – boksen «Velkommen tilbake» la seg oppå tallflisene i Leir): mens Leir-panelet er åpent,
   står velkomstboksen til høyre for panelet i stedet for midt på skjermen, så ingen flis dekkes. Målene er Claudes forslag. */
body:has(#leirmeny.på) #loggvelkommen{ left:calc(var(--leirH, 372px) + env(safe-area-inset-left,0px)); transform:none; width:min(440px, calc(100vw - var(--leirH, 372px) - 64px)); }
body:not(.tlfligg) #byggvalg button[data-tegn]:not([data-medtegn])::before{ content:attr(data-tegn); display:inline-block; margin-right:5px; opacity:.85; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const menyEl = el('div', { id: 'leirmeny', role: 'dialog', 'aria-label': 'Leiren' }); document.body.appendChild(menyEl);
  const banner = el('div', { id: 'byggvalg' }); document.body.appendChild(banner);
  const leirKnapp = el('button', { id: 'leirknapp', title: 'Bygg leiren' }, 'Leir'); leirKnapp.hidden = true;
  document.querySelector('.knapper').insertBefore(leirKnapp, document.getElementById('meny'));
  leirKnapp.onclick = () => { meny = !meny; menyEl.classList.toggle('på', meny); leirKnapp.classList.toggle('på', meny); if (meny) { if (window.lukkPanel) lukkPanel(); visMeny(); } };
  const st = el('div', {}, el('b', { id: 'sStrom' }, '–'), ' ', el('span', {}, 'strøm')); st.hidden = true; document.querySelector('.stats').appendChild(st);
  const matTekst = mat => Object.entries(mat || {}).filter(([, v]) => v > 0).map(([k, v]) => `${String(v).replace('.', ',')} ${LB.MATERIALER[k].enhet} ${LB.MATERIALER[k].navn.toLowerCase()}`).join(', ');
  // (runde 12) samme regel som kjøpet: det som mangler, rundet opp til 0,1 (Leir.manglerPris) – så banneret, byggemenyen og loggen sier det samme
  const matPris = mat => LB.manglerPris(L, mat);
  // KOMMANDOLAGET (R17-4): alt knappene endrer i leiren, går gjennom window.KOMMANDO (spill/kommandoer.js); svaret er det regelfunksjonen
  // ga (også { feil, mangler }), eller { feil } når kommandoen ble avvist før den kom så langt – meldingene blir de samme som før
  const kom = k => { const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; return r.svar != null ? r.svar : r.ok ? r.svar : { feil: r.feil }; };
  // Kjøper det som mangler av materialene (når det er plass), gir true når alt finnes
  function kjøpManglende(mat) { for (const [k, m] of Object.entries(LB.manglerMat(L, mat))) { if (m > 0) { const r = kom({ type: 'kjøpMateriale', materiale: k, mengde: m }); if (r.feil) { logg(r.feil); return false; } } } return true; }

  // ---------- angre/gjør om (planen) og maler ----------
  const øyeblikk = () => JSON.stringify({ plan: L.plan, nestePlan: L.nestePlan });
  // kalles før hver endring i planen
  const husk = () => { angre.push(øyeblikk()); if (angre.length > 50) angre.shift(); gjørOm.length = 0; };
  function angreEn(fra, til) { if (!fra.length) return false; til.push(øyeblikk()); const o = JSON.parse(fra.pop()); L.plan = o.plan; L.nestePlan = o.nestePlan; valgtPlan = null; lagre(); bygg3dPåNytt(); skitten = true; if (meny) visMeny(); return true; }
  const maler = () => { try { return JSON.parse(localStorage.getItem(MALER)) || []; } catch (e) { return []; } };
  const lagreMaler = m => { try { localStorage.setItem(MALER, JSON.stringify(m)); } catch (e) { /* privat vindu */ } };
  function lagreMal(navn) { const S = spill(); const m = maler(); m.push(LB.tilMal(L, S.leir.x, S.leir.y, navn || `Mal ${m.length + 1}`)); lagreMaler(m); return m.length; }
  // Bygger skissene i planen (alle eller pids) og kjøper det som mangler av materialer for hver (kjøp = true)
  function byggFraPlan(pids, kjøp) {
    let n = 0, sist = null; husk();
    for (const a of L.plan.slice()) { if (pids && !pids.includes(a.pid)) continue;
      const B = LB.BYGG[a.type], k = LB.kostnad(a.type, B.linje ? LB.lengde(a.punkter, a.lukket) : 0, bonus());
      if (kjøp && !LB.harMat(L, k.mat) && !kjøpManglende(k.mat)) { sist = 'Fikk ikke kjøpt materialene.'; break; }
      const r0 = kom({ type: 'byggPlan', pids: [a.pid] }), r = Array.isArray(r0.feil) ? r0 : { bygget: [], feil: [[a.pid, r0.feil]] }; if (r.feil.length) { sist = r.feil[0][1]; if (/penger/.test(sist)) break; continue; } n++; }
    if (!n) angre.pop();
    logg(n ? `${n} bygg fra planen er bestilt.${sist ? ' Resten venter: ' + sist : ''}` : sist || 'Ingenting å bygge.');
    lagre(); bygg3dPåNytt(true); skitten = true; if (meny) visMeny(); return n;
  }

  // ---------- strøm og sol ----------
  let siste = { prod: 0, kapasitet: 0, behov: 0, mangler: new Set(), sol: 0, kø: 0, aktive: 0 };
  function solNå() {
    const h = (6 + tid / TIME) % 24, V = window.VAER, e = V && window.Vaer ? Vaer.solHøyde(V.dag, h) : 40 * Math.cos((h - 13) / 12 * Math.PI);
    return Math.max(0, Math.min(1, e / 25)) * (V ? 1 - .7 * Math.max(0, (V.sky - .3) / .7) : 1);
  }
  const kw = v => v.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
  function visStatus() {
    st.hidden = !L || !L.bygg.length; if (st.hidden) return;
    const m = siste.mangler.size; document.getElementById('sStrom').textContent = `${kw(siste.behov)}/${kw(Math.max(siste.kapasitet, siste.prod))} kW` + (siste.batKap > 0 ? ` · ${Math.round(siste.batteri / siste.batKap * 100)} % batteri` : '') + (m - (siste.avslått || 0) > 0 ? ' ⚠' : '');
  }
  const HVA = { bygg: 'bygges', oppgrader: 'oppgraderes', flytt: 'flyttes', reparer: 'repareres' };
  // Forklaringen av de to slagene drivstoff (Leir-menyen og byggpanelet for tank og aggregat). Kjøretøy- og basepanelet og hjelpen sier det samme.
  const DIESEL = 'Leirens diesel (liter, kjøpes for kroner) driver aggregatene og fyrer i brakkene om vinteren. Kjøretøyene bruker den ikke: de fyller olje (tonn) på basen, eller får den kjørt ut med «Forsyn …».';
  // (runde 6, kritikken: «hvorfor er dieselen så dyr, og hva er alternativet?») – står under kjøpeknappen
  const dieselHvorfor = () => `Diesel er knapt etter kollapsen og koster ca. ${LB.kroner(LB.DRIVSTOFF.prisPerLiter)} literen. Billigere strøm: solceller og batteribank er gratis i drift, strømnettet virker de første døgnene, og bygg du ikke trenger kan slås av.`;
  // Kjøp diesel (knappen i Leir-menyen og varselbrikken «Tom for diesel»): så mye som får plass, høyst `liter`
  function kjøpDiesel(liter = 500) { if (!L) return { feil: 'Ingen leir.' }; const r = kom({ type: 'kjøpDiesel', liter }); logg(r.feil || `Kjøpte ${r.liter} l diesel til leiren for ${LB.kroner(r.pris)}.`); lagre(); siste = LB.steg(L, 0, solNå()); visStatus(); if (meny) visMeny(); return r; }
  // Det et bygg koster i alt når materialene som mangler på lageret, kjøpes til dagens pris (runde 6: menyen sa «Brakke 4 mill. kr», og
  // etter plasseringen kom «Kjøp materialene (975 000 kr) og bygg» i tillegg)
  const totalPris = k => k.pris + matPris(k.mat);
  const skadeMeldt = new Set();
  // dieselforbruket måles som det tanken synker fra steg til steg (aggregatene her, fyringen i folk.js) – Leir.dieselMål/dieselRekker
  let sistDiesel = null;
  const målDiesel = () => { const d = L.drivstoff || 0; LB.dieselMål(L, sistDiesel !== null && d < sistDiesel ? sistDiesel - d : 0, tid); sistDiesel = d; };
  KROKER.sim.push(dt => {
    if (!L || !spill()) return;
    målDiesel();
    siste = LB.steg(L, dt, solNå());
    for (const b of siste.nyFerdig) { if (!LB.BYGG[b.type].del) logg(`${LB.BYGG[b.type].navn} er ferdig bygget.`); bygg3dPåNytt(); }
    for (const [b, hva] of siste.ferdigArbeid) { logg(`${LB.BYGG[b.type].navn} er ${{ oppgrader: `oppgradert til nivå ${b.nivå}`, flytt: 'flyttet', reparer: 'reparert' }[hva]}.`); bygg3dPåNytt(hva === 'flytt'); }
    // utposter: byggelaget er kommet fram og begynner arbeidet
    for (const b of siste.framme || []) logg(`Byggelaget er framme ved ${LB.BYGG[b.type].del ? 'byggesettet' : LB.BYGG[b.type].navn.toLowerCase()} (${LB.kmTekst(LB.reise(L, b.x, b.y).meter)} fra leiren) og begynner arbeidet.`);
    // fiender skader byggene: 8 % per spilltime per fiendtlig lag innen 120 m. Også byggeplassene (bygg under bygging eller i kø) kan
    // skades (brukeren 12. nov); blir en byggeplass ødelagt, kommer materialene som ikke var brukt, tilbake på lageret (Leir.skad).
    HERJER.clear();
    for (const e of ENHETER) { if (e.side === 'blå' || !levende(e)) continue;
      const deler = { n: 0, mat: {} };
      for (const b of L.bygg.slice()) { if (Math.hypot(e.x - b.x, e.y - b.y) > 120) continue;
        HERJER.add(e);
        const B = LB.BYGG[b.type], navn = B.navn.toLowerCase(), r = LB.skad(L, b.id, .08 * dt / 60); if (!r) continue;
        if (r.ødelagt) { const tapt = Math.max(0, L.drivstoff - LB.kapasitet(L)), mt = matTekst(r.mat);
          // delene i byggesettet (ofte mange på én gang) meldes samlet under
          if (B.del) { deler.n++; for (const [k, v] of Object.entries(r.mat)) deler.mat[k] = Math.round(((deler.mat[k] || 0) + v) * 10) / 10; }
          else if (r.byggeplass) logg(`Byggeplassen for ${navn} er ødelagt av ${e.navn}! ` + (mt ? `Materialene som ikke var brukt, er tilbake på lageret: ${mt}.` : 'Alle materialene var brukt opp.'));
          else logg(`${B.navn} er ødelagt av ${e.navn}!` + (tapt >= 1 ? ` ${Math.round(tapt).toLocaleString('nb-NO')} l diesel gikk tapt.` : '') + (mt ? ` Materialene til oppgraderingen som ikke var brukt, er tilbake på lageret: ${mt}.` : ''));
          if (valgtBygg === b.id) { valgtBygg = null; banner.classList.remove('på'); }
          bygg3dPåNytt(); lagre(); }
        else { const nøkkel = B.del ? 'byggesett' : b.id; if (!skadeMeldt.has(nøkkel)) { skadeMeldt.add(nøkkel);
          logg(B.del ? `${e.navn} skader byggesettet!` : r.byggeplass ? `${e.navn} skader byggeplassen for ${navn}!` : `${e.navn} skader ${navn} i leiren!`); } } }
      if (deler.n) { const mt = matTekst(deler.mat); logg(`${deler.n} ${deler.n === 1 ? 'del' : 'deler'} i byggesettet er ødelagt av ${e.navn}!` + (mt ? ` Materialene som ikke var brukt, er tilbake på lageret: ${mt}.` : '')); skitten = true; } }
    akk += dt; if (akk >= 10 || siste.nyFerdig.length || siste.ferdigArbeid.length) { akk = 0; lagre(); }
    if (performance.now() - (sist || 0) > 1000) { sist = performance.now(); visStatus(); const nede = window.pekerNede || (() => false); if (meny && !nede(menyEl)) visMeny(); if (valgtBygg && !plassering && !nede(banner)) visByggPanel(); skitten = true; }
  });

  // ---------- menyen ----------
  // Menyen tegnes på nytt hvert sekund (strøm, kø): behold plassen du har bladd til (brukeren 11. nov: «lar meg ikke bla ned»)
  let menyNøkkel = '';
  let fane = 'bygg';
  // delene i fanene: rekkefølge, og hvilke som er lagt sammen til du åpner dem (Claudes forslag)
  const FANEREKKE = ['bygg', 'lager', 'plan', 'mål'], DELREKKE = { bygg: [/^Byggelag/, /^Strøm$/, /^Byggesett/, /^Forsvar/, /^Tropper/, /^Kameravakt/, /^Sjøen/, /^Strømnett/],
    lager: [/^Penger inn/, /^Materialer$/, /^Oversikt/, /^Materialer fra verden/, /^Markedet/, /^Region/, /^Sjø/, /^Våpen/], plan: [/^Planlegg/],
    mål: [/^Oppdrag/, /^Mål$/, /^Trusselen/, /^Ukas|^Scenario/, /^Etterretning/, /^Vær og verden/, /^Samfunn/, /^Dagbok/, /^Venner/, /tid og flyt/, /spillform/, /^Opplæring/] };
  const DEL_LUKKET = /^(Forsvar|Tropper|Strømnett|Byggesett|Kameravakt|Sjøen|Våpen og utstyr|Markedet|Venner|Etterretning|Vær og verden|Mål · |Opplæring|Region|Samfunn)/;
  let DELVALG = {}; try { DELVALG = JSON.parse(localStorage.getItem('riksbrudd-leirdeler') || '{}') || {}; } catch (e) { DELVALG = {}; }
  const delNøkkel = t => t.replace(/[\d(].*$/, '').replace(/[:·\s]+$/, '').trim() || t.trim();
  const delLukket = k => (k in DELVALG ? !!DELVALG[k] : (!navigator.webdriver || window.LEIRDELER_TEST === true) && DEL_LUKKET.test(k));
  // STRØMTEKSTENE (runde 6, kritikken: «Alle bygg har strøm» sto mens ingen bygg brukte strøm, og «bruker 0 av 5 kW» uten aggregat –
  // de 5 kW kom fra strømnettet, men det sto ingen steder). Nå sier linja hvem som bruker strøm, og hvor den kommer fra.
  function strømKilde() { if (!siste) return ''; const d = [];
    if (siste.nett > 0) d.push(`strømnettet ${kw(siste.nett)} kW (virker bare de første døgnene)`); if (siste.sol > 0) d.push(`sola ${kw(siste.sol)} kW`);
    if (siste.aggInst > 0) d.push(L.drivstoff > 0 ? `aggregat ${kw(siste.aggInst)} kW` : 'aggregatet står (tom for diesel)'); if (siste.batKW > 0) d.push(`batteriet ${kw(siste.batKW)} kW`);
    return d.join(', '); }
  function strømLinje() {
    if (!siste || !(siste.behov || siste.kapasitet)) return '';
    const n = L.bygg.filter(b => LB.virker(b) && LB.BYGG[b.type].kw < 0 && !b.av).length, k = strømKilde();
    if (!siste.behov) return 'Ingen bygg bruker strøm ennå' + (k ? ` · strøm fra ${k}` : '') + '.';
    return (n === 1 ? 'Bygget som bruker strøm, har strøm' : `Alle ${n} byggene som bruker strøm, har strøm`) + (k ? ` · fra ${k}` : '') + '.';
  }
  function visMeny() {
    const S = spill(), rulle = menyEl.scrollTop;
    const kap = LB.kapasitet(L), plass = LB.lagerplass(L);
    // status som fire små fliser (tall først, forklaringen i tittelen), og en rød linje når noe mangler strøm
    // RUNDE 13 (kritiker G: «40 mill…», «0 l av …» på liggende telefon): hver flis har også en kort utgave (k = [ord, tall]) som vises der
    const flis = (navn, verdi, tittel, fare, k) => el('div', { klasse: 'flis' + (fare ? ' fare' : ''), title: tittel || '' }, el('small', k ? { 'data-kort': k[0] } : {}, navn + ': '), el('b', k ? { 'data-kort': k[1] } : {}, verdi));
    const kapMaks = Math.max(siste.kapasitet, siste.prod), nb = v => Math.floor(v).toLocaleString('nb-NO');
    const strømTekst = siste.behov || siste.kapasitet ? `Strøm: byggene trenger ${kw(siste.behov)} kW og får ${kw(siste.prod)} kW (anleggene kan gi ${kw(siste.kapasitet)} kW)` : 'Strøm: ingen bygg bruker eller lager strøm ennå';
    const status = el('div', { klasse: 'status' },
      flis('Kassa', LB.kroner(S.penger), '', false, ['Kassa', LB.kroner(S.penger)]),
      flis('Strøm', siste.behov ? (siste.behov > Math.max(siste.kapasitet, siste.prod) + 1e-6 ? `trenger ${kw(siste.behov)}, har ${kw(Math.max(siste.kapasitet, siste.prod))} kW` : `bruker ${kw(siste.behov)} av ${kw(Math.max(siste.kapasitet, siste.prod))} kW`) : siste.kapasitet ? `${kw(siste.kapasitet)} kW ledig` : 'ikke i bruk', strømTekst + (strømKilde() ? ` – ${strømKilde()}` : ''), siste.mangler.size - (siste.avslått || 0) > 0,
        ['Strøm', siste.behov ? `${kw(siste.behov)}/${kw(kapMaks)} kW` : siste.kapasitet ? `${kw(siste.kapasitet)} kW ledig` : 'ingen']),
      flis('Diesel til leiren', `${Math.floor(L.drivstoff).toLocaleString('nb-NO')} l av ${kap.toLocaleString('nb-NO')} l`, 'Driver aggregatene og fyrer i brakkene om vinteren', false, ['Diesel', `${nb(L.drivstoff)}/${nb(kap)} l`]),
      flis('Sengeplasser', String(LB.plasser(L)), '', false, ['Senger', String(LB.plasser(L))]),
      siste.mangler.size - (siste.avslått || 0) > 0 ? el('div', { klasse: 'linje', style: 'color:#e88a6a' }, `${siste.mangler.size - (siste.avslått || 0)} bygg mangler strøm` + (siste.aggInst > 0 && !(L.drivstoff > 0) ? ' – aggregatene er tomme for diesel' : '')) : el('div', { klasse: 'linje' }, strømLinje()));
    const kjøp = knapp(`Kjøp 500 l diesel (${LB.kroner(500 * LB.DRIVSTOFF.prisPerLiter)} · ${Math.round(LB.DRIVSTOFF.prisPerLiter).toLocaleString('nb-NO')} kr/l)`, () => kjøpDiesel(500), { id: 'kjopdiesel' });
    kjøp.disabled = kap - L.drivstoff < 1; if (kjøp.disabled) kjøp.title = kap ? 'Tankene er fulle' : 'Bygg en dieseltank først';
    // to slags drivstoff (brukeren 12. nov: behold begge, men si tydelig hva som er hva)
    const dieselTekst = el('small', { id: 'dieseltekst', style: 'display:block; color:var(--ink-dim); font-size:12.5px; line-height:1.35; margin-top:4px' }, DIESEL + ' ' + dieselHvorfor());
    const hode = el('div', { klasse: 'hode' }, knapp('×', () => leirKnapp.onclick(), { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Leiren'), status, el('div', { style: 'margin-top:6px' }, kjøp), kap ? '' : el('div', { klasse: 'igang' }, 'Dieselen trenger en dieseltank (i lista under).'), dieselTekst);
    // folket og oppgavene (spill/folk-visning.js)
    if (window.FolkSpill) hode.appendChild(FolkSpill.menyRad());
    // materialene: lager og kjøp
    hode.appendChild(el('h3', {}, `Materialer (lager ${plass} av hvert)`));
    for (const [k, M] of Object.entries(LB.MATERIALER)) {
      const b = knapp(`+10 (${LB.kroner(10 * M.pris)})`, () => { const r = kom({ type: 'kjøpMateriale', materiale: k, mengde: 10 }); logg(r.feil || `Kjøpte ${String(r.mengde).replace('.', ',')} ${M.enhet} ${M.navn.toLowerCase()} for ${LB.kroner(r.pris)}.`); lagre(); visMeny(); });
      b.disabled = (L.lager[k] || 0) >= plass;
      // selg overskudd (halv pris) og en måler for hvor fullt lageret er
      const har = L.lager[k] || 0, selg = knapp(`Selg 10 (${LB.kroner(10 * M.pris * LB.REGLER.salg)})`, () => { const r = kom({ type: 'selgMateriale', materiale: k, mengde: 10 }); logg(r.feil || `Solgte ${String(r.mengde).replace('.', ',')} ${M.enhet} ${M.navn.toLowerCase()} for ${LB.kroner(r.pris)}.`); lagre(); visMeny(); }, { klasse: 'selg' });
      selg.disabled = har < .1; selg.title = 'Selg overskudd for halv pris';
      hode.appendChild(el('div', { klasse: 'mat' }, el('span', {}, `${M.navn}: ${String(Math.round(har * 10) / 10).replace('.', ',')} ${M.enhet}`, el('i', { klasse: 'fyll' }, el('b', { style: `width:${Math.round(Math.min(1, har / Math.max(1, plass)) * 100)}%` }))), b, selg));
    }
    // byggelag og køen
    const J = LB.jobber(L), lag = LB.byggelag(L);
    hode.appendChild(el('h3', {}, L.folk ? `Byggelag: ${lag} (to på «bygg» = ett lag)` : `Byggelag: ${lag} (ett + ett per brakke)`));
    // delene i byggesettet (ofte mange) står samlet på én linje
    const del = J.filter(j => LB.BYGG[j.b.type].del), delAktive = J.slice(0, lag).filter(j => LB.BYGG[j.b.type].del).length;
    J.forEach((j, i) => { if (!LB.BYGG[j.b.type].del) hode.appendChild(el('div', { klasse: 'igang' }, `${LB.BYGG[j.b.type].navn} ${HVA[j.hva]} – ` + (i >= lag ? 'venter i kø' + (j.reise > 0 ? ` (utpost: ${tidTekst(j.reise)} reise først)` : '')
      : j.reise > 0 ? `byggelaget er på vei (${tidTekst(j.reise)} reise igjen)` : `${Math.round(LB.framdrift(j.b) * 100)} % (${tidTekst(j.hva === 'bygg' ? j.b.igjen : j.b.arbeid.igjen)} igjen)`))); });
    const delReise = Math.max(0, ...J.slice(0, lag).filter(j => LB.BYGG[j.b.type].del).map(j => j.reise));
    if (del.length) hode.appendChild(el('div', { klasse: 'igang' }, `Byggesettet: ${del.length} deler – ` + (delReise > 0 ? `byggelaget er på vei (${tidTekst(delReise)} reise igjen), ` : `${delAktive} bygges nå, `) + `${del.length - delAktive} i kø (${tidTekst(del.reduce((s, j) => s + (j.hva === 'bygg' ? j.b.igjen : j.b.arbeid.igjen), 0))} arbeid igjen)`));
    if (!J.length) hode.appendChild(el('div', { klasse: 'igang' }, 'Ingen jobber.'));
    // planen: gratis skisser, hva de koster, bygg alle, angre, maler
    const pk = LB.planKostnad(L, bonus()), mangler = matPris(pk.mat);
    hode.appendChild(el('h3', {}, 'Planlegg leiren'));
    hode.appendChild(el('div', { klasse: 'igang' }, planModus ? 'Planlegging er på: «Planlegg» legger gratis skisser (blå) som holder plassen.' : 'Slå på planlegging for å tegne leiren først og bygge senere.'));
    const rad = (...k) => el('div', { klasse: 'mat' }, ...k);
    hode.appendChild(rad(knapp(planModus ? 'Planlegging: på' : 'Planlegging: av', () => { planModus = !planModus; visMeny(); }, { id: 'planmodus' }),
      knapp('↶ Angre', () => angreEn(angre, gjørOm), { id: 'angre', ...(angre.length ? {} : { disabled: '' }) }), knapp('↷ Gjør om', () => angreEn(gjørOm, angre), gjørOm.length ? {} : { disabled: '' })));
    if (pk.antall) {
      const planReise = Math.max(0, ...L.plan.map(a => LB.reiseFor(L, a).min));
      hode.appendChild(el('div', { klasse: 'igang' }, `Planen: ${pk.antall} bygg, ${LB.kroner(pk.pris)}, ${tidTekst(pk.timer * 60)} byggetid i alt` + (planReise > 0 ? ` + opptil ${tidTekst(planReise)} reise til utposten` : '') + (matTekst(pk.mat) ? ` · ${matTekst(pk.mat)}` : '') + (mangler ? ` (materialer mangler for ${LB.kroner(mangler)})` : '')));
      hode.appendChild(rad(knapp(`Bygg hele planen (${LB.kroner(pk.pris + mangler)})`, () => byggFraPlan(null, true), { id: 'byggplan' }),
        knapp('Tøm planen', () => { if (!confirm('Fjerne alle skissene i planen?')) return; husk(); kom({ type: 'plan', handling: 'tøm' }); lagre(); bygg3dPåNytt(); skitten = true; visMeny(); })));
    }
    hode.appendChild(rad(knapp('Lagre leiren som mal', () => { const n = prompt('Navn på malen:', `Leir ${maler().length + 1}`); if (n === null) return; lagreMal(n); logg(`Malen «${n}» er lagret.`); visMeny(); }, (L.bygg.length || L.plan.length) ? {} : { disabled: '' })));
    maler().forEach((m, i) => hode.appendChild(rad(el('span', {}, `${m.navn} (${m.bygg.length} bygg)`),
      knapp('Sett inn', () => startMal(i)), knapp('Slett', () => { if (!confirm(`Slette malen «${m.navn}»?`)) return; const a = maler(); a.splice(i, 1); lagreMaler(a); visMeny(); }))));
    // andre deler kan legge til sitt eget i menyen (LEIR_MENY: (hode, { el, knapp }) => void): materialer fra verden, byggesettet
    for (const f of window.LEIR_MENY || []) try { f(hode, { el, knapp }); } catch (e) { console.error(e); }
    // byggene i grupper (16. nov: lista var 17 bygg uten inndeling); et bygg som ikke står i noen gruppe, havner under «Annet»
    const liste = el('div', { klasse: 'liste' }), GR = [['Bo og leve', ['brakke', 'kjøkken', 'drivhus', 'sykestue'].concat(LB.BYGG.brønn ? ['brønn'] : [])], ['Strøm og diesel', ['drivstofftank', 'aggregat', 'solcelle', 'batteri']],
      ['Oversikt og samband', ['kontrollrom', 'radiomast', 'kameramast', 'vakttårn']], ['Lager og arbeid', ['lagertelt', 'container', 'verksted', 'helikopterplass']], ['Forsvar', ['gjerde', 'port', 'sandsekkvoll']], ['Veger', ['veg']]];
    const iGruppe = new Set(GR.flatMap(g => g[1])), rekke = [...GR.flatMap(([navn, ider]) => ider.filter(id => LB.BYGG[id] && !LB.BYGG[id].del).map((id, n) => [id, n ? null : navn])),
      ...Object.keys(LB.BYGG).filter(id => !LB.BYGG[id].del && !iGruppe.has(id)).map((id, n) => [id, n ? null : 'Annet'])];
    for (const [id, gruppe] of rekke) { const B = LB.BYGG[id];
      if (gruppe) liste.appendChild(el('h4', {}, gruppe));
      const k = LB.kostnad(id, 1, bonus()), mp = B.linje ? 0 : matPris(k.mat), pris = B.linje ? `${LB.kroner(B.prisPerMeter)} per meter` : `${LB.kroner(k.pris + mp)} i alt` + (mp ? ` (${delNavn(id)} ${LB.kroner(k.pris)} + materialer du mangler ${LB.kroner(mp)})` : ` (${delNavn(id, true)}; materialene har du)`) + ` · byggelagene dine: ${tidTekst(k.timer * 60)}`;
      const strøm = B.kw > 0 ? ` · gir ${kw(B.kw)} kW` : B.kw < 0 ? ` · bruker ${kw(-B.kw)} kW` : '', nv = B.nivå ? ` · ${Object.values(B.nivå)[0].length} nivåer` : '';
      const b = knapp(planModus ? 'Planlegg' : 'Bygg', () => startPlassering(id, null, { plan: planModus })); b.disabled = !planModus && !B.linje && S.penger < k.pris;
      // 18. nov: byggene som kort i et rutenett – en liten tegning av bygget, navn, pris og én kort linje; resten står i forklaringen (data-tips)
      const tegn = el('img', { klasse: 'tegn', alt: '', draggable: 'false' }); if (window.Tegninger) tegn.src = Tegninger.bilde(Tegninger.bygg(id));
      liste.appendChild(el('div', { klasse: 'bygg kort', 'data-type': id, 'data-tips': `${B.navn}|${pris}${strøm}${nv}. ${B.linje ? 'Per meter: ' : 'Materialer: '}${matTekst(k.mat)}. ${B.tekst}` }, tegn,
        el('div', {}, el('b', {}, B.navn), el('small', { klasse: 'pris', title: B.linje ? '' : mp ? `Arbeid ${LB.kroner(k.pris)} + materialer du mangler ${LB.kroner(mp)}` : 'Materialene har du på lageret' }, B.linje ? `${LB.kroner(B.prisPerMeter)}/m` : LB.kroner(k.pris + mp) + (mp ? ' i alt' : '')), el('small', { klasse: 'kortlinje' }, (B.linje ? '' : tidTekst(k.timer * 60)) + strøm.replace(/^ · /, B.linje ? '' : ' · ') || B.tekst), el('small', { klasse: 'mer' }, (B.linje ? 'per meter: ' : '') + matTekst(k.mat)), el('small', { klasse: 'mer' }, B.tekst)), b));
    }
    // FANER (brukeren 16. nov: «forbedre menyene» – Leir-menyen var én lang side): status og Folk-knappen står alltid øverst, resten
    // er delt på Bygg (jobbene, byggene, byggesettet), Lager (diesel, materialer, hogst og riving) og Plan (skisser og maler).
    // Alt ligger fortsatt i siden; det som ikke hører til den valgte fanen, er bare skjult.
    { let cur = 'lager'; const fast = n => n === status || n.tagName === 'H2' || (n.classList && n.classList.contains('lukk')) || (n.querySelector && n.querySelector('#folkknapp')) || (n.classList && n.classList.contains('fast'));
      const faneFor = t => /^Materialer/.test(t) ? 'lager' : /^Byggelag/.test(t) ? 'bygg' : /^Planlegg/.test(t) ? 'plan' : /yggesett/.test(t) ? 'bygg' : /^Mål|^Dagbok$/.test(t) ? 'mål' : null;
      for (const n of [...hode.childNodes]) { if (n.nodeType !== 1) continue; if (fast(n)) continue;
        const h = n.tagName === 'H3' ? n : n.querySelector && n.querySelector('h3'); if (h) cur = h.dataset.fane || faneFor(h.textContent) || cur;
        n.dataset.fane = cur; if (cur !== fane) n.hidden = true; }
      liste.dataset.fane = 'bygg'; liste.hidden = fane !== 'bygg';
      const J2 = LB.jobber(L).length, bar = el('div', { klasse: 'faner', role: 'tablist' });
      for (const [id, navn] of [['bygg', J2 ? `Bygg (${J2})` : 'Bygg'], ['lager', 'Lager'], ['plan', L.plan.length ? `Plan (${L.plan.length})` : 'Plan'], ...(window.MaalSpill && hode.querySelector('.nestemaal') ? [['mål', `Mål ${MaalSpill.kort()}`]] : [])])
        bar.appendChild(knapp(navn, () => { fane = id; menyEl.scrollTop = 0; visMeny(); }, { klasse: id === fane ? 'på' : '', role: 'tab', 'aria-selected': String(id === fane), 'data-fane-knapp': id }));
      const folk = [...hode.children].find(n => n.querySelector && n.querySelector('#folkknapp')); (folk || status).after(bar);
      // «Neste mål» (spill/maal-visning.js) står rett over fanene
      const nm = hode.querySelector('.nestemaal'); if (nm) bar.before(nm);
      // det som hører til en fane og sto over fanene (dieselkjøpet), flyttes ned under dem
      let etter = bar; for (const n of [...hode.children]) { if (n === bar) break; if (n.dataset && n.dataset.fane) { etter.after(n); etter = n; } } }
    // DELER SOM KAN LEGGES SAMMEN, I FAST REKKEFØLGE (18. nov, runde 2: fanene hadde fått mange nye deler fra andre moduler – Bygg var
    // nesten 4000 punkter høy). Hver overskrift (h3) åpner og lukker delen sin, og valget huskes («riksbrudd-leirdeler»). Delene
    // sorteres etter DELREKKE per fane (ukjente sist, i den rekkefølgen de kom); i fanen Bygg står byggekortene rett under jobbene,
    // og resten av delene under kortene (hale). I testene (navigator.webdriver) er alle deler åpne til noen lukker dem.
    const hale = el('div', { klasse: 'hode hale' });
    { const grupper = []; let g = null;
      for (const n of [...hode.children]) { if (n === status || !n.dataset || !n.dataset.fane || (n.classList && (n.classList.contains('faner') || n.classList.contains('nestemaal')))) continue;
        const h = n.tagName === 'H3' ? n : n.querySelector && n.querySelector('h3');
        if (h) { g = { nøkkel: delNøkkel(h.textContent), fane: n.dataset.fane, h, noder: [n], boks: n !== h }; grupper.push(g); } else if (g && g.fane === n.dataset.fane) g.noder.push(n); else g = null; }
      const rang = q => { const R = DELREKKE[q.fane] || [], i = R.findIndex(re => re.test(q.nøkkel)); return i < 0 ? 50 : i; };
      grupper.forEach((q, i) => { q.i = i; q.rang = rang(q); }); grupper.sort((a, b) => FANEREKKE.indexOf(a.fane) - FANEREKKE.indexOf(b.fane) || a.rang - b.rang || a.i - b.i);
      for (const q of grupper) { const lukket = delLukket(q.nøkkel), til = q.fane === 'bygg' && q.rang > 0 ? hale : hode;
        q.h.classList.add('del'); q.h.classList.toggle('lukket', lukket); q.h.setAttribute('role', 'button'); q.h.setAttribute('aria-expanded', String(!lukket)); q.h.tabIndex = 0; q.h.dataset.del = q.nøkkel;
        q.h.onclick = () => { DELVALG[q.nøkkel] = !lukket; try { localStorage.setItem('riksbrudd-leirdeler', JSON.stringify(DELVALG)); } catch (e) { /* sperret */ } visMeny(); };
        q.h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); q.h.onclick(); } };
        for (const n of q.noder) { if (lukket) { if (n === q.h) { /* overskriften står */ } else if (q.boks && n === q.noder[0]) n.classList.add('delboks', 'lukket'); else n.hidden = true; } til.appendChild(n); } }
      if (fane !== 'bygg') hale.hidden = true; }
    const nøkkel = hode.innerHTML + liste.innerHTML + hale.innerHTML; if (nøkkel === menyNøkkel && menyEl.firstChild) return;
    menyNøkkel = nøkkel; menyEl.innerHTML = ''; menyEl.append(hode, liste, hale); menyEl.scrollTop = rulle;
  }
  const tidTekst = LB.tidTekst;

  // ---------- plassering (nye bygg og flytting) ----------
  // ny: { type, ret, x, y, punkter (gjerde), lukket, flytt: id }
  // o: { plan (skisse i planen), pid (flytte en skisse), ret (kopi: samme retning) }
  function startPlassering(type, flytt, o = {}) {
    valgtBygg = null; valgtPlan = null; plassering = { type, ret: 0, x: null, y: null, punkter: LB.BYGG[type].linje ? [] : null, lukket: false, feil: null, flytt: flytt || null, retSatt: false, plan: !!(o.plan || o.pid), pid: o.pid || null };
    if (flytt) { const b = LB.finn(L, flytt); plassering.ret = b.ret; plassering.retSatt = true; }
    if (o.pid) { const a = LB.planFinn(L, o.pid); plassering.ret = a.ret; plassering.retSatt = true; }
    if (o.ret !== undefined) { plassering.ret = o.ret; plassering.retSatt = true; }
    meny = false; menyEl.classList.remove('på'); leirKnapp.classList.remove('på');
    visBanner(LB.BYGG[type].linje ? `Trykk der ${LB.BYGG[type].veg ? 'vegen' : 'gjerdet'} skal begynne, og så punkt for punkt.` : `${LB.BYGG[type].navn}: trykk der bygget skal ${flytt || o.pid ? 'flyttes' : 'stå'}.`);
  }
  // En mal settes inn i planen: trykk der midten skal være, roter, «Legg i planen»
  function startMal(i) {
    const m = maler()[i]; if (!m) return; valgtBygg = null; valgtPlan = null;
    plassering = { mal: m, type: null, ret: 0, x: null, y: null, feil: null, plan: true };
    meny = false; menyEl.classList.remove('på'); leirKnapp.classList.remove('på'); visBanner(`Trykk der midten av «${m.navn}» skal være.`);
  }
  const avbryt = () => { plassering = null; banner.classList.remove('på'); skisse3d(); skitten = true; };
  const hellingTekst = p => typeof på3d !== 'undefined' && på3d ? 'I 2D-kartet ser du hvor det er flatt nok (grønt) og for bratt (rødt).'
    : kam.m <= HellingVis.REGLER.maksM ? `Bakken for ${LB.BYGG[p.type].navn.toLowerCase()}: grønt = flatt, gult = skrått (grunnmur), rødt = for bratt.` : 'Zoom inn for å se i kartet hvor det er flatt nok.';
  // (21. nov) teksten om fargene følger zoomen: zoomer du inn etter at banneret kom, byttes «Zoom inn …» ut med forklaringen av fargene
  setInterval(() => { const h = banner.classList.contains('på') && banner.querySelector('.hellingtekst'), p = plassering; if (!h || !p || !p.type || !LB.BYGG[p.type]) return;
    const t = hellingTekst(p); if (h.textContent !== t) h.textContent = t; }, 400);
  function visBanner(tekst, kan, ekstra) {
    banner.innerHTML = ''; banner.classList.add('på'); banner.append(el('div', {}, tekst)); if (ekstra) banner.append(el('small', {}, ekstra));
    const p = plassering;
    // (runde 8) hellingen i kartet: hva fargene betyr for bygget du holder (bare i 2D, og bare nær nok til at de vises)
    if (p && p.type && !p.mal && !LB.BYGG[p.type].linje && window.HellingVis)
      banner.append(el('small', { klasse: 'hellingtekst' }, hellingTekst(p)));
    if (p && p.type && LB.BYGG[p.type].linje) {
      const a = knapp('Angre punkt', () => { p.punkter.pop(); prøv(); }); a.disabled = !p.punkter.length;
      const r = knapp(p.lukket ? 'Åpent gjerde' : 'Lukk ringen', () => { p.lukket = !p.lukket; prøv(); }); r.disabled = p.punkter.length < 3; if (LB.BYGG[p.type].veg) r.hidden = true;
      banner.append(a, r);
    } else if (p && p.x !== null) {
      banner.append(knapp('Snu ⟲', () => roter(1), { title: 'Snu bygget 15° mot klokka' }), knapp('Snu ⟳', () => roter(-1), { title: 'Snu bygget 15° med klokka' }));
      // (runde 8) for bratt: drei bygget, eller flytt skissen til nærmeste sted der det går (fra hellingskartet, helling-visning.js)
      const bf = p.feil && /For bratt/.test(p.feil) ? p.brattForslag : null;
      if (bf && bf.drei) banner.append(knapp('Drei 90° (da går det)', () => roter(6), { id: 'brattdrei' }));
      if (bf && bf.sted) banner.append(knapp(`Flytt skissen ${Math.round(bf.sted.m)} m ${bf.sted.retning}`, () => { p.rx = p.x = bf.sted.x; p.ry = p.y = bf.sted.y; p.svever = false; prøv(); }, { id: 'brattflytt', title: 'Nærmeste sted der bygget ikke står for bratt' }));
    }
    if (p && !p.mal) banner.append(knapp(rutenett ? 'Rutenett: på' : 'Rutenett: av', () => { rutenett = !rutenett; if (p.x !== null) { p.x = p.rx; p.y = p.ry; } prøv(); }));
    if (p && !p.mal && !LB.BYGG[p.type].linje) banner.append(knapp(inntil ? 'Inntil naboen: på' : 'Inntil naboen: av', () => { inntil = !inntil; prøv(); }));
    if (p && !p.mal && !p.flytt && !p.pid) banner.append(knapp(fortsett ? 'Fortsett: på' : 'Fortsett: av', () => { fortsett = !fortsett; prøv(); }, { title: 'Sett ut flere av samme slag etter hverandre' }));
    if (p && p.plan) { if (kan) banner.append(knapp(p.pid ? 'Flytt skissen hit' : 'Legg i planen', bekreft, { id: 'leggplan' })); }
    else {
      // mangler materialer, kan «Bygg her» bare svare «Mangler materialer» (og kjøpeknappen ble borte): vis bare kjøpeknappen da
      if (kan && (kan !== 'mat' || (p && p.flytt))) banner.append(knapp(p && p.flytt ? 'Flytt hit' : 'Bygg her', bekreft));
      // (runde 8, kritikken: loggen sa «Brakke bestilt: 4 mill. kr» mens knappen sa «5 mill. kr i alt») – det materialene faktisk kostet, huskes til loggen
      if (kan === 'mat') banner.append(knapp(`Kjøp materialene og bygg: ${LB.kroner((p.pris || 0) + p.matPris)} i alt`, () => { const før = OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : 0;
        if (kjøpManglende(p.mat)) { p.kjøpt = Math.max(0, før - (OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : 0)); bekreft(); } }, { title: `Arbeid ${LB.kroner(p.pris || 0)} + materialer ${LB.kroner(p.matPris)}` }));
      if (kan && p && !p.flytt) banner.append(knapp('Legg i planen', () => { p.plan = true; bekreft(); }));
    }
    banner.append(knapp('Avbryt', avbryt));
    kortBanner();
  }
  // RUNDE 12 (21. nov, kritiker E): på liggende telefon dekket byggebanneret en tredjedel av kartet. Der er det én linje tekst (trykk på den
  // for alle detaljene) og én rad med små knapper: veksleknappene som ikoner (hele navnet i title/aria-label), og kortere tekst på kjøpeknappen.
  // Knappene beholder teksten sin (kontrollskriptet trykker etter den); bare CSS-en viser data-kort. Tegnene er Claudes forslag.
  let bannerHelt = false;
  // RUNDE 13 (kritiker G: «ikonene ⟲ ⟳ ▦ ⇤ ⧉ har ingen tekst – ⧉ ser ut som kopier»): hvert ikon får en kort tekst under seg (tredje ledd),
  // og «Fortsett» har fått + i stedet for ⧉. På PC står hele teksten som før, med det samme tegnet foran. Ordene er Claudes forslag.
  // RUNDE 14 (kritiker I: «Venstre»/«Høyre» kan leses som «flytt til venstre»): rotasjonsknappene heter «Snu ⟲» og «Snu ⟳» på PC,
  // og ikonet med «Snu» under på liggende telefon.
  const KORT_NAVN = [[/^Snu ⟲$/, '⟲', 'Snu'], [/^Snu ⟳$/, '⟳', 'Snu'], [/^Rutenett: .*$/, '▦', 'Rutenett'], [/^Inntil naboen: .*$/, '⇤', 'Inntil'], [/^Fortsett: .*$/, '+', 'Fortsett'],
    [/^Avbryt$/, '✕', 'Avbryt'], [/^Legg i planen$/, 'Til planen'], [/^Kjøp materialene og bygg: (.*) i alt$/, 'Kjøp og bygg · $1']];
  // på telefon lukkes også forklaringsruta fra byggekortet (den ble liggende over kartet mens du plasserte bygget, kritiker E bilde 13)
  function kortBanner() { if (window.FlisTips && FlisTips.skjul && document.body.classList.contains('kort')) FlisTips.skjul(); const f = banner.firstElementChild; if (f && f.tagName === 'DIV') { f.classList.add('btekst'); f.onclick = () => { bannerHelt = !bannerHelt; banner.classList.toggle('helt', bannerHelt); }; }
    banner.classList.toggle('helt', bannerHelt); banner.classList.toggle('harsmå', !!banner.querySelector(':scope > small'));
    for (const b of banner.querySelectorAll(':scope > button')) { const t = b.textContent.trim(), k = KORT_NAVN.find(([r]) => r.test(t)); if (!k) continue;
      if (k[2]) { b.dataset.tegn = k[1]; b.dataset.etikett = k[2]; if (t.includes(k[1])) b.dataset.medtegn = '1'; } else b.dataset.kort = t.replace(k[0], k[1]);
      if (!b.title) b.title = t; b.setAttribute('aria-label', t); if (/: på$/.test(t)) b.classList.add('slått'); } }
  async function klasseVed(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false); const [i, j] = Terreng.rute(v, x, y); return v.K[j * v.w + i]; } catch (e) { return undefined; } }
  // Kartets klasse (vann) og eksisterende hus for punktene i bygget (hentes før regelsjekken, som er uten nettverk)
  async function kartFor(punkter) {
    const kl = new Map(), hus = new Set();
    for (const [x, y] of punkter) { kl.set(x + ',' + y, await klasseVed(x, y)); try { const h = await finnBygg(x, y); if (h && pip(h.P, x, y)) hus.add(x + ',' + y); } catch (e) { /* ingen husdata */ } }
    // høyden fra 8 m-rutene (samme nivå uansett hvor langt ut kartet er zoomet), lest mellom rutene
    let hv = null; try { const xs = punkter.map(p => p[0]), ys = punkter.map(p => p[1]); hv = await lagVindu([Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20], false, 11); } catch (e) { hv = null; }
    const høyde = (x, y) => { if (!hv) return null; const fx = (x - hv.x0) / hv.r - .5, fy = (hv.y0 - y) / hv.r - .5, i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
      if (i < 0 || j < 0 || i + 1 >= hv.w || j + 1 >= hv.h) return null; const H = (ii, jj) => hv.H[jj * hv.w + ii];
      const z = H(i, j) * (1 - a) * (1 - b) + H(i + 1, j) * a * (1 - b) + H(i, j + 1) * (1 - a) * b + H(i + 1, j + 1) * a * b; return z === z ? z : null; };
    // (R17 funn 12) bilvegene og gang- og sykkelvegene fra kartet rundt bygget – Leir.kanBygge sier «står på vegen»
    let veger = null; try { veger = await kartveger(punkter); } catch (e) { veger = null; }
    return { klasse: (x, y) => kl.get(x + ',' + y), iHus: (x, y) => hus.has(x + ',' + y), høyde, veger };
  }
  // Vegene (vektorflisene z13, alle veger og gang- og sykkelveger, ikke ferjer) innen 20 m av punktene: [{ k, g, P: [[x, y] …] }]
  async function kartveger(punkter) {
    if (typeof hentFlis !== 'function' || typeof span !== 'function' || typeof flisområde !== 'function') return null;
    const xs = punkter.map(p => p[0]), ys = punkter.map(p => p[1]), bb = [Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20];
    const z = 13, sp = span(z), [x0, y0, x1, y1] = flisområde(bb, z), ut = [], jobber = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) jobber.push(hentFlis('vektor', z, x, y).then(t => {
      if (!t || !t.veg) return; const mx = G.x0 + x * sp, my = G.y0 - y * sp, e = t.veg.ext;
      for (const o of t.veg.obj) { if (o.e.t === 4) continue;
        for (const d of o.deler) ut.push({ k: o.e.k, g: o.e.g === 1 ? 1 : 0, P: d.map(([a, c]) => [mx + a / e * sp, my - c / e * sp]) }); }
    }).catch(() => {}));
    await Promise.all(jobber); return ut;
  }
  const pip = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; };
  const sp = p => (LB.BYGG[p.type].linje ? { type: p.type, punkter: p.punkter, lukket: p.lukket } : { type: p.type, x: p.x, y: p.y, ret: p.ret });
  // rutenett: 2,5 m fra midten av leiren og 15°; nærmeste nabo (innen 60 m) gir retningen når du ikke har rotert selv; porter festes i gjerdet
  function juster(p) {
    if (LB.BYGG[p.type].linje || p.x === null) return; const S = spill(); p.festet = null;
    if (LB.BYGG[p.type].port) { const f = LB.festTilGjerde(L, p.rx, p.ry); if (f) { p.x = f.x; p.y = f.y; p.ret = f.ret; p.festet = true; return; } }
    if (!p.retSatt) { const n = L.bygg.filter(b => !LB.BYGG[b.type].linje && !LB.BYGG[b.type].del && b.id !== p.flytt).sort((a, b) => Math.hypot(a.x - p.rx, a.y - p.ry) - Math.hypot(b.x - p.rx, b.y - p.ry))[0];
      if (n && Math.hypot(n.x - p.rx, n.y - p.ry) < 60) p.ret = n.ret; }
    if (rutenett) { const g = 2.5, ox = S.leir.x, oy = S.leir.y; p.x = ox + Math.round((p.rx - ox) / g) * g; p.y = oy + Math.round((p.ry - oy) / g) * g; p.ret = Math.round(p.ret / (Math.PI / 12)) * Math.PI / 12; }
    else { p.x = p.rx; p.y = p.ry; }
    // inntil naboen: 2 m mellomrom eller på linje med kanten/midten (Leir.snapp), med hjelpelinjer i kartet
    const sn = LB.snapp(L, { type: p.type, x: p.x, y: p.y, ret: p.ret }, { unntatt: p.flytt, unntattPid: p.pid, gap: inntil ? 2 : 0, rad: inntil ? 3 : 0 });
    if (inntil) { p.x = sn.x; p.y = sn.y; p.linjer = sn.linjer; } else p.linjer = [];
    p.nabo = sn.nabo || null; p.avstand = sn.nabo ? LB.snapp(L, { type: p.type, x: p.x, y: p.y, ret: p.ret }, { unntatt: p.flytt, unntattPid: p.pid, rad: 1e-9 }).avstand : null;
  }
  function roter(r) { const p = plassering; if (!p) return; p.ret += r * Math.PI / 12; p.retSatt = true; prøv(); }
  const mål = t => { const f = LB.BYGG[t].fot; return `${String(Math.round((f[1] - f[0]) * 10) / 10).replace('.', ',')} × ${String(Math.round((f[3] - f[2]) * 10) / 10).replace('.', ',')} m`; };
  const navnPå = q => (q ? (q.pid ? 'planlagt ' : '') + LB.BYGG[q.type].navn.toLowerCase() : '');
  async function prøv() {
    const p = plassering; if (!p) return;
    if (p.mal) {
      if (p.x === null) { visBanner(`Trykk der midten av «${p.mal.navn}» skal være.`); skitten = true; return; }
      // hvert bygg i malen sjekkes mot kartet (vann, hus, bratt grunn) slik som ved vanlig plassering – før ble malen lagt rett i vannet
      const nøkkel = p.x + ',' + p.y + ',' + p.ret, deler = LB.fraMal(p.mal, p.x, p.y, p.ret); p.sjekket = null; p.feil = 'Sjekker kartet …'; visBanner(p.feil);
      for (const b of deler) { const pk = LB.BYGG[b.type].linje ? LB.gjerdePunkter(b.punkter, b.lukket) : [...LB.hjørner(b), [b.x, b.y]]; b.kart = await kartFor(pk);
        if (plassering !== p || nøkkel !== p.x + ',' + p.y + ',' + p.ret) return; b.feil = LB.kanBygge(L, b, b.kart); }
      p.deler = deler; p.sjekket = nøkkel;
      const ok = p.deler.filter(b => !b.feil).length; p.feil = ok ? null : 'Ingenting får plass her.';
      const mr = LB.reise(L, p.x, p.y);
      visBanner(`«${p.mal.navn}»: ${ok} av ${p.deler.length} bygg får plass` + (ok < p.deler.length ? ' (de røde hoppes over)' : '') + '.', !!ok, mr.full > 0 ? LB.reiseTekst(mr) + ' – når planen bygges.' : null); skisse3d(); skitten = true; return;
    }
    const B = LB.BYGG[p.type];
    if (B.linje && p.punkter.length < 2) { visBanner(p.punkter.length ? 'Trykk der neste punkt skal være.' : `Trykk der ${B.veg ? 'vegen' : 'gjerdet'} skal begynne.`); skisse3d(); skitten = true; return; }
    juster(p); const b = sp(p);
    const punkter = B.linje ? LB.gjerdePunkter(p.punkter, p.lukket) : [...LB.hjørner(b), [b.x, b.y]], v = await kartFor(punkter);
    if (plassering !== p) return;
    p.feil = LB.kanBygge(L, b, v, p.flytt, { planUnntatt: p.pid }); p.kart = v;
    p.brattForslag = p.feil && /For bratt/.test(p.feil) && window.HellingVis && HellingVis.forslag ? HellingVis.forslag(p.type, p.ret, b.x, b.y) : null;
    const k = LB.kostnad(p.type, B.linje ? LB.lengde(p.punkter, p.lukket) : 0, bonus()); p.mat = p.flytt ? {} : k.mat; p.matPris = matPris(p.mat);
    const harMat = LB.harMat(L, p.mat), pris = p.flytt ? Math.round(B.pris * LB.REGLER.flyttPris) : k.pris; p.pris = pris;
    // utpost: byggelaget må reise dit først (Leir.reise) – tiden står her før du bekrefter
    const rs = LB.reiseFor(L, b, p.flytt); p.reise = rs;
    const tekst = p.feil || (p.flytt ? `Flytte ${B.navn.toLowerCase()}: ${LB.kroner(pris)}, ferdig om ${tidTekst(B.tid * LB.REGLER.flyttTid / (bonus().bygg || 1) * 60 + rs.min)}.`
      : `${p.pid ? 'Skisse: ' : p.plan ? 'Planlegg ' : ''}${B.navn}: ${LB.kroner(k.pris + (harMat ? 0 : p.matPris))}${harMat ? ` (${delNavn(p.type, true)})` : ` i alt (${delNavn(p.type)} ${LB.kroner(k.pris)} + materialer ${LB.kroner(p.matPris)})`}, byggelagene dine bygger det – ferdig om ${tidTekst(k.timer * 60 + rs.min)}` + (B.linje ? ` (${Math.round(LB.lengde(p.punkter, p.lukket))} m${p.lukket ? ', lukket ring' : ''})` : '') + (p.festet ? ' – festet i gjerdet' : '') + '.');
    const plass = !B.linje ? `${mål(p.type)}` + (p.avstand !== null && p.avstand !== undefined ? ` · ${String(Math.round(p.avstand * 10) / 10).replace('.', ',')} m til ${navnPå(p.nabo)}` : '') + (p.linjer && p.linjer.length ? ' · på linje' : '') : null;
    // (runde 8) skrå grunn: hvor høy grunnmuren blir (samme regel som hellingskartet: over halve grensa = gult)
    const br = !B.linje && !p.feil && v.høyde && LB.bratt ? LB.bratt(b, v.høyde) : null, mur = br && br.n > 1 && window.Helling && br.d > Helling.REGLER.flatAndel * br.grense ? `skrå grunn: ${Math.round(br.d)} m grunnmur` : null;
    const ekstra = [!p.feil && rs.full > 0 ? LB.reiseTekst(rs) : null, plass, mur, !p.feil && !p.flytt && !p.plan && matTekst(p.mat) ? `Materialer: ${matTekst(p.mat)}` + (harMat ? ' (på lageret)' : ` – kjøpes for ${LB.kroner(p.matPris)} (eller hogg og riv selv)`) : null].filter(Boolean).join(' · ') || null;
    visBanner(tekst, p.feil ? false : (harMat || p.plan) ? true : 'mat', ekstra); skisse3d(); skitten = true;
  }
  function trykk(X, Y) {
    if (plassering) {
      const p = plassering; if (!p.mal && LB.BYGG[p.type].linje) p.punkter.push([X, Y]); else { p.rx = X; p.ry = Y; p.x = X; p.y = Y; }
      p.svever = false;   // et trykk setter skissen fast (byggevisning.js lar den følge musa til da)
      prøv(); return true;
    }
    if (!L) return false;
    // et eget lag nær trykket går foran (ikke åpne byggpanelet når du vil velge laget)
    if (ENHETER.some(s => s.side === 'blå' && Math.hypot(s.x - X, s.y - Y) / kam.m < 22 && !på3d)) return false;
    const b = byggVed(X, Y);
    if (!b) { const a = byggVed(X, Y, L.plan); if (a) { valgtBygg = null; valgtPlan = a.pid; visPlanPanel(); skitten = true; return true; } }
    if (!b) { if (valgtBygg || valgtPlan) { valgtBygg = null; valgtPlan = null; banner.classList.remove('på'); skitten = true; } return false; }
    valgtPlan = null; valgtBygg = b.id; visByggPanel(); skitten = true; return true;
  }
  function byggVed(X, Y, liste) {
    for (const b of liste || L.bygg) { const B = LB.BYGG[b.type];
      if (B.linje) { const P = b.lukket ? [...b.punkter, b.punkter[0]] : b.punkter; for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / l2)); if (Math.hypot(X - ax - dx * t, Y - ay - dy * t) < 3) return b; } }
      else if (pip(LB.hjørner(b), X, Y)) return b; }
    return null;
  }
  KROKER.trykk.push(trykk); KROKER.trykk3d.push(trykk);
  // (runde 8, kritikken på telefon: trykket på leirflagget for å sette brakka der åpnet basepanelet «Leiren til …») – mens du
  // plasserer et bygg, går trykket på kartet først til plasseringen. Legges først i lista når alle skriptene er lastet (andre
  // moduler legger seg først med unshift).
  const førstPlassering = () => { const f = (X, Y) => (plassering && !(window.Byggesett && Byggesett.tilstand && Byggesett.tilstand().åpen) ? trykk(X, Y) : false); KROKER.trykk.unshift(f); KROKER.trykk3d.unshift(f); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', førstPlassering); else setTimeout(førstPlassering, 0);
  // Fiender som står inne i leiren og ødelegger bygg: de synes i kartet, og lag innen 300 m kan skyte på dem (kamprunde i index.html)
  const HERJER = window.HERJER = new Set(); KROKER.ser.push(e => HERJER.has(e));
  function bekreft() {
    const p = plassering; if (!p || p.feil) return;
    if (p.mal) { if (p.sjekket !== p.x + ',' + p.y + ',' + p.ret) return; husk(); let nr = 0;
      const r = LB.planMal(L, p.mal, p.x, p.y, p.ret, () => (p.deler[nr++] || {}).kart || {});
      if (!r.lagt.length) { angre.pop(); visBanner('Ingenting fikk plass her.'); return; }
      logg(`«${p.mal.navn}» lagt i planen: ${r.lagt.length} skisser${r.feil.length ? `, ${r.feil.length} fikk ikke plass` : ''}.`); return ferdigPlassert(p); }
    if (p.plan) { husk(); const r = p.pid ? kom({ type: 'plan', handling: 'flytt', pid: p.pid, til: { x: p.x, y: p.y, ret: p.ret }, kart: p.kart || {} }) : kom({ type: 'plan', handling: 'legg', bygg: sp(p), kart: p.kart || {} });
      if (r.feil) { angre.pop(); visBanner(r.feil); return; } if (!p.pid) logg(`${LB.BYGG[p.type].navn} lagt i planen.`); return ferdigPlassert(p); }
    if (p.flytt) { const r = kom({ type: 'flytt', bygg: p.flytt, til: { x: p.x, y: p.y, ret: p.ret }, kart: p.kart || {} }); if (r.feil) { visBanner(r.feil); return; }
      logg(`${LB.BYGG[p.type].navn} flyttes: ${LB.kroner(r.pris)}.` + (r.reise.min > 0 ? ` Byggelaget reiser ${tidTekst(r.reise.min)} dit først.` : '')); }
    else { const r = kom({ type: 'bygg', bygg: sp(p), kart: p.kart || {} }); if (r.feil) { visBanner(r.feil); return; }
      const kø = LB.jobber(L).length > LB.byggelag(L);
      const kjøpt = p.kjøpt > 0 ? p.kjøpt : 0; p.kjøpt = 0;
      logg(`${LB.BYGG[p.type].navn} bestilt: ${kjøpt ? `${LB.kroner(r.bygg.pris + kjøpt)} i alt (${(LB.PRISDEL || {}).navn || 'utstyr og deler'} ${LB.kroner(r.bygg.pris)} + materialer ${LB.kroner(kjøpt)})` : `${LB.kroner(r.bygg.pris)} (${(LB.PRISDEL || {}).navn || 'utstyr og deler'})`}, ${tidTekst(r.bygg.totalt)} byggetid for byggelagene dine` + (r.reise.min > 0 ? ` + ${tidTekst(r.reise.min)} reise (${LB.kmTekst(r.reise.meter)} fra leiren)` : '') + `${kø ? ' – venter i kø på et ledig byggelag' : ''}.`); }
    ferdigPlassert(p);
  }
  // Etter et bygg eller en skisse: med «Fortsett» står samme bygg klart (samme retning), ellers er plasseringen ferdig
  function ferdigPlassert(p) {
    lagre(); visStatus(); bygg3dPåNytt(!p.plan); skitten = true; if (meny) visMeny();
    if (fortsett && !p.mal && !p.flytt && !p.pid && !LB.BYGG[p.type].linje) { plassering = { ...p, x: null, y: null, rx: null, ry: null, feil: null, linjer: [], retSatt: true };
      visBanner(`${LB.BYGG[p.type].navn}: trykk der neste skal stå (Fortsett er på).`); skisse3d(); return; }
    plassering = null; banner.classList.remove('på'); skisse3d();
  }

  // ---------- byggpanelet (trykk på et bygg) ----------
  // Radiomasten: hva nivået gir lagene nå og på de neste nivåene (reglene i spill/kontrollrom.js; brukeren 12. nov: 15, 25 og 40 km)
  function radioTekst(b) {
    const K = window.Kontrollrom, N = LB.BYGG.radiomast.nivå.rekkevidde, n = b.nivå || 1, km = LB.kmTekst, uten = K ? K.LEIR.uten : 8000, hånd = K ? K.RADIO.hånd.meter : 3000;
    const strøm = !siste.mangler.has(b.id), virker = LB.virker(b) && strøm;
    const nå = virker ? `Feltradioene når ${km(Math.max(uten, LB.effekt(b).rekkevidde))} med denne masten` + (b.hp < LB.REGLER.halvSkade ? ' (hardt skadet: halv rekkevidde)' : '')
      : !LB.ferdig(b) ? `Når masten er ferdig, når feltradioene ${km(N[n - 1])}` : `Masten virker ikke nå (${strøm ? 'den flyttes' : 'uten strøm'}): feltradioene når bare ${km(uten)}`;
    const neste = N.map((v, i) => (i >= n ? `nivå ${i + 1}: ${km(v)}` : null)).filter(Boolean).join(', ');
    return `${nå}${neste ? ` (${neste})` : ' (høyeste nivå)'}. Uten mast: ${km(uten)}. Håndradio når ${km(hånd)} uansett.`;
  }
  function visByggPanel() {
    const b = valgtBygg && LB.finn(L, valgtBygg); if (!b) { valgtBygg = null; banner.classList.remove('på'); return; }
    const B = LB.BYGG[b.type], e = LB.effekt(b), ok = LB.oppgraderKostnad(b, bonus()), rk = LB.reparerKostnad(b, bonus());
    // jobben på bygget: i kø, byggelaget på vei til utposten, eller i arbeid
    const J = LB.jobber(L), ji = J.findIndex(j => j.b === b), jobb = ji >= 0 ? J[ji] : null, kø = ji >= LB.byggelag(L), hva = jobb ? HVA[jobb.hva] : '';
    const status = jobb ? (kø ? `${hva}: venter i kø` + (jobb.reise > 0 ? ` (så ${tidTekst(jobb.reise)} reise)` : '') : jobb.reise > 0 ? `${hva}: byggelaget er på vei, ${tidTekst(jobb.reise)} reise igjen` : `${hva} ${Math.round(LB.framdrift(b) * 100)} %`)
      : siste.mangler.has(b.id) ? 'uten strøm' : 'i drift';
    // utpost: nye jobber på bygget (oppgradering, reparasjon) krever at byggelaget reiser dit
    const rs = LB.reise(L, b.x, b.y, b.id), reise = rs.min > 0 ? ` + ${tidTekst(rs.min)} reise` : '';
    const verdier = [e.kw > 0 ? `gir ${kw(e.kw)} kW` : null, e.plasser ? `${e.plasser} senger` + (b.hp < LB.REGLER.halvSkade && B.nivå && B.nivå.plasser ? ` (hardt skadet: halvparten av ${B.nivå.plasser[(b.nivå || 1) - 1]} – reparer bygget)` : '') : null, B.nivå && B.nivå.liter ? `rommer ${LB.BYGG.drivstofftank.nivå.liter[(b.nivå || 1) - 1].toLocaleString('nb-NO')} l diesel` : null,
      e.lager ? `lager +${e.lager}` : null, e.rekkevidde && b.type !== 'radiomast' ? `${e.rekkevidde} m` : null, rs.full > 0 ? `utpost ${LB.kmTekst(rs.meter)} fra leiren` : null,
      !LB.ferdig(b) ? 'byggeplass: kan skades av fiender' : null].filter(Boolean).join(' · ');
    // radiomasten: hva nivået gir lagene (brukeren 12. nov), og de to slagene drivstoff ved tank og aggregat
    const ekstra = b.type === 'radiomast' ? radioTekst(b) : b.type === 'drivstofftank' || b.type === 'aggregat' ? `Leiren har ${Math.floor(L.drivstoff).toLocaleString('nb-NO')} l diesel. ${DIESEL}` : '';
    const nøkkel = [ji, b.id, b.nivå, status, Math.round(b.hp * 100), verdier, ekstra, ok ? ok.pris + '>' + ok.til : '', rk ? rk.pris : '', b.igjen > 0, !!b.arbeid, planModus, reise, window.BYGGEVISNING && BYGGEVISNING.radioZoom ? BYGGEVISNING.radioZoom() : ''].join('|');
    if (banner.firstChild && banner.firstChild.byggNøkkel === nøkkel && banner.classList.contains('på')) return;
    banner.innerHTML = ''; banner.classList.add('på');
    banner.append(el('div', {}, el('b', {}, B.navn + (LB.maksNivå(b.type) > 1 ? ` (nivå ${b.nivå})` : '')), ` – ${status}, ${Math.round(b.hp * 100)} % helt`), verdier ? el('small', {}, verdier) : '', ekstra ? el('small', { klasse: 'forklar' }, ekstra) : '');
    banner.firstChild.byggNøkkel = nøkkel;
    // runde 4 (pakke «ui»): tegningen av bygget i panelet (spill/tegninger.js; utseendet i spillhud.js, .byggtegn)
    if (window.Tegninger) { const t = el('img', { klasse: 'byggtegn', alt: '', draggable: 'false' }); t.src = Tegninger.bilde(Tegninger.bygg(b.type)); banner.firstChild.prepend(t); }
    // radiomasten: se hvor langt feltradioene når (sirkelen tegnes av byggevisning.js så lenge masten er valgt)
    if (b.type === 'radiomast' && window.BYGGEVISNING && BYGGEVISNING.visRekkevidde) banner.appendChild(knapp(BYGGEVISNING.radioZoom() ? 'Tilbake til leiren' : `Vis rekkevidden (${LB.kmTekst(BYGGEVISNING.radioRekkevidde(b))})`, () => { BYGGEVISNING.visRekkevidde(b); visByggPanel(); }, { id: 'visradio' }));
    // delegere: denne jobben først (byggelagene tar køen i rekkefølge)
    if (jobb && ji > 0) banner.appendChild(knapp('Bygg dette først', () => { KOMMANDO({ type: 'prioriter', bygg: b.id }); logg(`${B.navn}: byggelaget tar denne jobben først.`); lagre(); visByggPanel(); if (meny) visMeny(); skitten = true; }, { id: 'byggforst' }));
    if (ok) { const k = knapp(`Oppgrader til nivå ${ok.til} (${LB.kroner(ok.pris)}${reise})`, () => { const r = kom({ type: 'oppgrader', bygg: b.id });
        if (r.feil && r.mangler && confirm(`${r.feil} Kjøpe det som mangler for ${LB.kroner(matPris(r.mangler))}?`) && kjøpManglende(r.mangler)) return k.onclick();
        logg(r.feil || `${B.navn} oppgraderes til nivå ${r.til}.` + (r.reise.min > 0 ? ` Byggelaget reiser ${tidTekst(r.reise.min)} dit først.` : '')); lagre(); visByggPanel(); });
      k.disabled = b.igjen > 0 || !!b.arbeid; banner.appendChild(k); }
    if (rk) { const k = knapp(`Reparer (${LB.kroner(rk.pris)}${reise})`, () => { const r = kom({ type: 'reparer', bygg: b.id }); logg(r.feil || `${B.navn} repareres.` + (r.reise.min > 0 ? ` Byggelaget reiser ${tidTekst(r.reise.min)} dit først.` : '')); lagre(); visByggPanel(); }); k.disabled = !!b.arbeid; banner.appendChild(k); }
    if (!B.linje && !B.del) { const k = knapp(`Flytt (${LB.kroner(Math.round(B.pris * LB.REGLER.flyttPris))})`, () => startPlassering(b.type, b.id)); k.disabled = b.igjen > 0 || !!b.arbeid; banner.appendChild(k);
      banner.appendChild(knapp('Kopier', () => startPlassering(b.type, null, { ret: b.ret, plan: planModus }), { title: 'Sett ut et likt bygg med samme retning' })); }
    banner.appendChild(knapp(`Riv (+${LB.kroner(Math.round(b.pris * (b.igjen > 0 ? LB.REGLER.rivUferdig : LB.REGLER.rivFerdig)))})`, () => {
      // drivstoff som ikke får plass i de andre tankene når denne rives, selges tilbake (Leir.riv) – si fra før og etter
      const over = Math.max(0, L.drivstoff - LB.kapasitet({ bygg: L.bygg.filter(q => q !== b) })), liter = v => Math.round(v).toLocaleString('nb-NO');
      if (!confirm(`Rive ${B.navn.toLowerCase()}?` + (over >= 1 ? ` ${liter(over)} l diesel får ikke plass i de andre tankene og selges tilbake for ${LB.kroner(Math.round(over * LB.DRIVSTOFF.prisPerLiter))}.` : ''))) return;
      const r = kom({ type: 'riv', bygg: b.id }); if (r.feil) { logg(r.feil); return; }
      logg(`${B.navn} er revet. ${LB.kroner(r.bygg)} tilbake${r.uferdig ? ', og materialene' : ''}.` + (r.drivstoff >= 1 ? ` ${liter(r.drivstoff)} l diesel uten plass er solgt tilbake for ${LB.kroner(r.drivstoffPenger)}.` : '')); valgtBygg = null; banner.classList.remove('på'); lagre(); bygg3dPåNytt(); skitten = true; }));
    banner.appendChild(knapp('Lukk', () => { valgtBygg = null; banner.classList.remove('på'); skitten = true; }));
  }

  // Panelet for en skisse i planen: bygg nå, flytt, kopier, fjern
  function visPlanPanel() {
    const a = valgtPlan && LB.planFinn(L, valgtPlan); if (!a) { valgtPlan = null; banner.classList.remove('på'); return; }
    const B = LB.BYGG[a.type], k = LB.kostnad(a.type, B.linje ? LB.lengde(a.punkter, a.lukket) : 0, bonus()), mp = matPris(k.mat);
    banner.innerHTML = ''; banner.classList.add('på');
    const rs = LB.reiseFor(L, a);
    banner.append(el('div', {}, el('b', {}, `Planlagt ${B.navn.toLowerCase()}`), ` – ${LB.kroner(k.pris)}, ${tidTekst(k.timer * 60)}` + (rs.min > 0 ? ` + ${tidTekst(rs.min)} reise` : '')), rs.full > 0 ? el('small', {}, LB.reiseTekst(rs) + '.') : '',
      matTekst(k.mat) ? el('small', {}, `Materialer: ${matTekst(k.mat)}` + (mp ? ` – mangler for ${LB.kroner(mp)}` : '')) : '');
    if (window.Tegninger) { const t = el('img', { klasse: 'byggtegn', alt: '', draggable: 'false' }); t.src = Tegninger.bilde(Tegninger.bygg(a.type)); banner.firstChild.prepend(t); }
    banner.appendChild(knapp(`Bygg nå (${LB.kroner(k.pris + mp)})`, () => { valgtPlan = null; banner.classList.remove('på'); byggFraPlan([a.pid], true); }, { id: 'byggskisse' }));
    if (!B.linje) banner.appendChild(knapp('Flytt', () => startPlassering(a.type, null, { pid: a.pid })));
    if (!B.linje) banner.appendChild(knapp('Kopier', () => startPlassering(a.type, null, { plan: true, ret: a.ret })));
    banner.appendChild(knapp('Fjern', () => { husk(); kom({ type: 'plan', handling: 'fjern', pid: a.pid }); valgtPlan = null; banner.classList.remove('på'); lagre(); bygg3dPåNytt(); skitten = true; if (meny) visMeny(); }));
    banner.appendChild(knapp('Lukk', () => { valgtPlan = null; banner.classList.remove('på'); skitten = true; }));
  }
  // tastene mens du plasserer (ikke når du går selv eller skriver): R/Q roterer, Enter bygger, Esc avbryter; Ctrl+Z / Ctrl+Y i planen
  window.addEventListener('keydown', e => {
    if (!L || (r3() && R3.fot) || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'y')) { if (angreEn(k === 'z' ? angre : gjørOm, k === 'z' ? gjørOm : angre)) e.preventDefault(); return; }
    const p = plassering; if (!p) return;
    if (k === 'r' || k === 'q') { roter(k === 'r' ? -1 : 1); e.preventDefault(); }
    else if (k === 'enter') { bekreft(); e.preventDefault(); }
    else if (k === 'escape') { avbryt(); e.preventDefault(); }
  });

  // ---------- kartet ----------
  function farge() { const S = spill(); return S ? Oppstart.hovedfarge(S.fraksjon.flagg) : '#5b7ea8'; }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!L) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    // RUNDE 7 (kritikken: «leiren er bare grå bokser»): byggene tegnes som bygg sett ovenfra av spill/leir2d.js (tak, skygge, tilstand);
    // R2 = rammens nattfarge og lys, J2/n2 = jobblista (hvilke byggeplasser som er i arbeid nå). Uten Leir2d: boksene som før.
    const R2 = window.Leir2d && !Leir2d.av ? Leir2d.ramme() : null, J2 = R2 ? LB.jobber(L) : [], n2 = R2 ? LB.byggelag(L) : 0;
    const aktiv2 = b => { const i = J2.findIndex(j => j.b === b); return i < 0 ? true : i < n2 && !(J2[i].reise > 0); };
    const linje = (ledd, farge2, stipl) => { g.save(); g.strokeStyle = farge2; g.lineWidth = Math.max(1.5, 1.2 / m); if (stipl) g.setLineDash([6, 3]);
      for (const [a, b] of ledd) { g.beginPath(); g.moveTo(sx(a[0]), sy(a[1])); g.lineTo(sx(b[0]), sy(b[1])); g.stroke(); } g.restore(); };
    const tegn1 = (b, skisse, ok) => {
      const B = LB.BYGG[b.type];
      if (B.veg) { if (!b.punkter || !b.punkter.length) return; const w = Math.max(2.5, B.bredde / m), strek = (farge2, bredde, stipl) => { g.save(); g.strokeStyle = farge2; g.lineWidth = bredde; g.lineJoin = g.lineCap = 'round'; if (stipl) g.setLineDash(stipl);
          g.beginPath(); b.punkter.forEach(([x, y], i) => (i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); g.stroke(); g.restore(); };
        if (skisse) { strek(ok ? 'rgba(110,200,105,.55)' : 'rgba(224,96,74,.55)', w); for (const q of b.punkter) { g.fillStyle = '#f0d79a'; g.beginPath(); g.arc(sx(q[0]), sy(q[1]), 4, 0, 6.283); g.fill(); } return; }
        const fer = LB.ferdig(b); if (R2) { Leir2d.veg(g, b.punkter, sx, sy, m, { ferdig: fer, valgt: b.id === valgtBygg, bredde: B.bredde }); return; }
        strek(b.id === valgtBygg ? '#f0d79a' : 'rgba(60,50,36,.9)', w + 2); strek(fer ? '#a89878' : 'rgba(168,152,120,.45)', w, fer ? null : [8, 6]); return; }
      if (B.linje) { if (!b.punkter || !b.punkter.length) return;
        if (skisse) { const P = b.lukket ? [...b.punkter, b.punkter[0]] : b.punkter, ledd = []; for (let i = 1; i < P.length; i++) ledd.push([P[i - 1], P[i]]);
          linje(ledd, ok ? '#7fd17a' : '#e0604a', true); for (const q of b.punkter) { g.fillStyle = '#f0d79a'; g.beginPath(); g.arc(sx(q[0]), sy(q[1]), 4, 0, 6.283); g.fill(); } return; }
        if (R2) { Leir2d.gjerde(g, LB.gjerdeLedd(L, b), sx, sy, m, { ferdig: LB.ferdig(b), valgt: b.id === valgtBygg }); return; }
        linje(LB.gjerdeLedd(L, b), b.id === valgtBygg ? '#f0d79a' : LB.ferdig(b) ? '#cfc6b0' : 'rgba(207,198,176,.5)', !LB.ferdig(b)); return; }
      const P = LB.hjørner(b).map(([x, y]) => [sx(x), sy(y)]); if (P.every(([x, y]) => x < -50 || y < -50 || x > VW + 50 || y > VH + 50)) return;
      g.save();
      const ny2 = R2 && Leir2d.bygg(g, b, { sx, sy, m, skisse, ok, valgt: b.id === valgtBygg, mangler: siste.mangler.has(b.id), aktiv: aktiv2(b), fraksjon: farge(), lys: R2.lys });
      if (!ny2) { g.beginPath(); g.moveTo(...P[0]); for (const q of P.slice(1)) g.lineTo(...q); g.closePath();
      g.fillStyle = skisse ? (ok ? 'rgba(110,200,105,.45)' : 'rgba(224,96,74,.45)') : farge(); g.globalAlpha = skisse ? 1 : LB.virker(b) ? .85 : .35 + .5 * LB.framdrift(b);
      // (en myk skygge under bygget, så det løfter seg fra kartet)
      if (!skisse && m < 1.5) { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 7; g.shadowOffsetX = 2; g.shadowOffsetY = 3; } g.fill(); g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; g.globalAlpha = 1;
      g.strokeStyle = b.id === valgtBygg ? '#f0d79a' : siste.mangler.has(b.id) || b.hp < .5 ? '#e0604a' : '#efe6cf'; g.lineWidth = b.id === valgtBygg ? 2.5 : 1.2; g.stroke();
      // møne langs lengste side og et lyst merke på forsiden (+x i modellen, der døra er) når bygget er stort nok på skjermen
      if (!skisse && m < .8) { const mid = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], l01 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), l12 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
        if (Math.min(l01, l12) > 9) { const [a, c] = l01 >= l12 ? [mid(P[0], P[3]), mid(P[1], P[2])] : [mid(P[0], P[1]), mid(P[3], P[2])];
          g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0] + (c[0] - a[0]) * .12, a[1] + (c[1] - a[1]) * .12); g.lineTo(a[0] + (c[0] - a[0]) * .88, a[1] + (c[1] - a[1]) * .88); g.stroke();
          const f = mid(P[1], P[2]), t = [(P[2][0] - P[1][0]) / (l12 || 1), (P[2][1] - P[1][1]) / (l12 || 1)], w = Math.min(5, l12 * .22);
          g.strokeStyle = '#f0d79a'; g.lineWidth = 3; g.beginPath(); g.moveTo(f[0] - t[0] * w, f[1] - t[1] * w); g.lineTo(f[0] + t[0] * w, f[1] + t[1] * w); g.stroke(); } } }
      // (skissen har ikke navn i byggevisningen: der står målene rundt den, og navnet står i banneret)
      if (m < 1.2 && !(skisse && window.BYGGEVISNING && BYGGEVISNING.på())) { g.font = '600 14px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillStyle = '#f2ead6'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3;
        const J = LB.jobber(L), i = J.findIndex(j => j.b === b), kø = i >= LB.byggelag(L);
        const t = B.navn + ((b.nivå || 1) > 1 ? ` ${b.nivå}` : '') + (i >= 0 ? (kø ? ' (kø)' : J[i].reise > 0 ? ' (laget på vei)' : ` ${Math.round(LB.framdrift(b) * 100)} %`) : '') + (b.hp < 1 ? ` · ${Math.round(b.hp * 100)} % helt` : '');
        // (runde 7) helt nær står navnet under bygget, så taket (korset, panelene, skaden) synes
        const nærN = R2 && !skisse && m < Leir2d.REGLER.nær, y0 = nærN ? Math.max(...P.map(q => q[1])) + 14 : sy(b.y) + 4;
        const ty = window.Etikett ? Etikett.tekst(g, t, sx(b.x), y0, 1) : y0; g.strokeText(t, sx(b.x), ty); g.fillText(t, sx(b.x), ty); }
      g.restore(); };
    // skyggene først, så ingen skygge faller oppå et nabotak (slitt jord og stier tegner leir2d.js under alt annet)
    if (R2) for (const b of L.bygg) if (b.id !== (plassering && plassering.flytt) && !LB.BYGG[b.type].del) Leir2d.skygge(g, b, sx, sy, m);
    for (const b of L.bygg) if (b.id !== (plassering && plassering.flytt) && !LB.BYGG[b.type].del) tegn1(b, false);
    // planen: blå stiplede omriss med navnet
    g.save(); g.setLineDash([5, 4]);
    for (const a of L.plan || []) { if (plassering && a.pid === plassering.pid) continue; const B = LB.BYGG[a.type]; g.strokeStyle = a.pid === valgtPlan ? '#f0d79a' : '#8fc2ef'; g.lineWidth = a.pid === valgtPlan ? 2.5 : 1.6;
      const P = B.linje ? (a.lukket ? [...a.punkter, a.punkter[0]] : a.punkter) : [...LB.hjørner(a), LB.hjørner(a)[0]];
      g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); if (!B.linje) { g.fillStyle = 'rgba(110,160,220,.18)'; g.fill(); } g.stroke();
      if (!B.linje && m < 1.2) { g.setLineDash([]); g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#cfe4f7'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; const t = 'plan: ' + B.navn;
        g.strokeText(t, sx(a.x), sy(a.y) + 4); g.fillText(t, sx(a.x), sy(a.y) + 4); g.setLineDash([5, 4]); } }
    g.restore();
    const p = plassering;
    if (p && p.mal && p.deler) for (const d of p.deler) tegn1(d, true, !d.feil);
    else if (p && !p.mal && (p.x !== null || (p.punkter && p.punkter.length))) {
      tegn1(sp(p), true, !p.feil);
      // hjelpelinjene når bygget ligger på linje med naboen
      if (p.linjer && p.linjer.length) { g.save(); g.strokeStyle = '#f0d79a'; g.lineWidth = 1.2; g.setLineDash([3, 3]);
        for (const [x0, y0, x1, y1] of p.linjer) { g.beginPath(); g.moveTo(sx(x0), sy(y0)); g.lineTo(sx(x1), sy(y1)); g.stroke(); } g.restore(); }
    }
  });

  KROKER.tegn[KROKER.tegn.length - 1].bygg = true;   // tegnes øverst i byggevisningen (spill/byggevisning.js)
  // (runde 7) og over tåka og siktfeltet ellers (index.html tegn: f.over) – byggene var bleke under det lyse siktfeltet
  KROKER.tegn[KROKER.tegn.length - 1].over = true;

  // ---------- 3D ----------
  // egne enkle modeller (vertex-farger, origo midt på bunnen, fronten mot +x) for byggene som ikke finnes i spill/modeller.js
  const boks = (d, x, y, z, sx, sy, sz, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y, z + sz / 2); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const EGNE = {
    aggregat: () => { const d = []; boks(d, 0, 0, 0, 3.2, 2, .2, [.4, .4, .38]); boks(d, 0, 0, .2, 3, 1.8, 1.7, hex('#4f6a3a')); boks(d, 1.51, 0, .5, .05, 1.4, 1.1, [.15, .15, .15]); boks(d, -1, .5, 1.9, .18, .18, .9, [.2, .2, .2]); return d; },
    solcelle: () => { const d = []; for (const x of [-2.7, 0, 2.7]) { boks(d, x, -1, 0, .1, .1, .8, [.5, .5, .5]); boks(d, x, 1, 0, .1, .1, 1.8, [.5, .5, .5]); }
      const g = new THREE.BoxGeometry(8, 3.6, .08).toNonIndexed(); g.rotateX(-.45); g.translate(0, 0, 1.35); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set([.1, .16, .3], i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); return d; },
    kameramast: () => { const d = []; boks(d, 0, 0, 0, .5, .5, .3, [.45, .45, .43]); boks(d, 0, 0, .3, .15, .15, 6, [.55, .56, .57]); boks(d, .3, 0, 6.1, .6, .25, .25, [.85, .85, .82]); boks(d, .62, 0, 6.15, .05, .16, .16, [.05, .05, .08]); return d; },
    radiomast: () => { const d = [], H = 24; boks(d, 0, 0, 0, 1.4, 1.4, .3, [.45, .45, .43]);
      for (const [x, y] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) boks(d, x, y, .3, .08, .08, H, [.75, .2, .15]);
      for (let z = 2; z < H; z += 3) { boks(d, 0, -.5, z, 1, .06, .06, [.8, .8, .78]); boks(d, 0, .5, z, 1, .06, .06, [.8, .8, .78]); boks(d, -.5, 0, z, .06, 1, .06, [.8, .8, .78]); boks(d, .5, 0, z, .06, 1, .06, [.8, .8, .78]); }
      boks(d, 0, 0, H + .3, .08, .08, 4, [.3, .3, .3]); return d; },
    batteri: () => { const d = [], gr = [.78, .8, .8], m = [.2, .22, .24]; boks(d, 0, 0, 0, 4, 2.4, .2, [.45, .44, .42]); for (const x of [-1.25, 0, 1.25]) { boks(d, x, 0, .2, 1.1, 1.9, 2, gr); boks(d, x, .96, .5, .9, .04, 1.4, m); boks(d, x + .3, .99, 1.5, .12, .03, .12, [.3, .8, .35]); } boks(d, 0, 0, 2.2, 3.9, 2.1, .08, m); boks(d, 1.95, 0, .3, .12, .5, 1.2, m); return d; },
    brønn: () => { const d = [], st = [.5, .49, .46], tre = [.45, .33, .2]; boks(d, 0, 0, 0, 2.6, 2.6, .25, [.42, .41, .39]); for (const [x, y, sx, sy] of [[0, .9, 2, .3], [0, -.9, 2, .3], [.9, 0, .3, 1.5], [-.9, 0, .3, 1.5]]) boks(d, x, y, .25, sx, sy, .8, st);
      boks(d, 0, 0, .3, 1.4, 1.4, .1, [.12, .2, .28]); for (const y of [-.95, .95]) boks(d, 0, y, 1.05, .14, .14, 1.4, tre); boks(d, 0, 0, 2.3, .14, 2.1, .12, tre); boks(d, 0, 0, 2.45, 1.8, 2.5, .1, [.35, .2, .15]); boks(d, 0, 0, 1.5, .3, .3, .35, [.3, .3, .32]); return d; },
    drivhus: () => { const d = [], ramme = [.82, .84, .82], glass = [.62, .78, .74]; boks(d, 0, 0, 0, 6, 10, .3, [.45, .43, .4]); boks(d, 0, 0, .3, 5.8, 9.8, 2.4, glass);
      for (const sd of [-1, 1]) { const g = new THREE.BoxGeometry(3.3, 9.8, .06).toNonIndexed(); g.rotateY(sd * .55); g.translate(sd * 1.4, 0, 3.4); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(glass.map(v => v * 1.08), i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); }
      for (let y = -4.8; y <= 4.9; y += 1.6) boks(d, 0, y, .3, 6, .08, 2.5, ramme); return d; },
  };
  function modell(b) {
    const B = LB.BYGG[b.type], M = window.MODELLER; if (!M) return null;
    if (EGNE[B.modell]) return M.samle(EGNE[B.modell]());
    if (B.modell === 'port') return M.port(false); if (B.modell === 'verksted') return M.verksted([false, false]); if (B.modell === 'container') return M.container('utstyr');
    if (B.modell === 'sandsekkvoll') return M.sandsekkvoll(8, 2);
    return M[B.modell] ? M[B.modell]() : null;
  }
  // Gjerdet i 3D: et stykke per 10 m som står på bakken og heller med terrenget, med åpninger der portene står
  // VEGEN I 3D: et bånd som følger terrenget (punkt hver 3. m, mykere hjørner), lysere i midten, bare så langt den er bygget
  function vegLinje(P) { let Q = P.map(p => p.slice()); if (Q.length > 2) { const N = [Q[0]]; for (let i = 0; i < Q.length - 1; i++) { const a = Q[i], c = Q[i + 1]; if (i) N.push([a[0] * .78 + c[0] * .22, a[1] * .78 + c[1] * .22]); if (i < Q.length - 2) N.push([a[0] * .22 + c[0] * .78, a[1] * .22 + c[1] * .78]); } N.push(Q[Q.length - 1]); Q = N; }
    const ut = []; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], c = Q[i], l = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.ceil(l / 3)); for (let k = i === 1 ? 0 : 1; k <= n; k++) ut.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n]); } return ut; }
  function veg3d(b, u, R, mat) {
    const B = LB.BYGG[b.type]; let Q = vegLinje(b.punkter || []); if (Q.length < 2) return []; const andel = b.igjen > 0 && b.id >= 0 ? Math.max(.03, LB.framdrift(b)) : 1; Q = Q.slice(0, Math.max(2, Math.ceil(Q.length * andel)));
    const pos = [], col = [], idx = [], w = B.bredde / 2, kant = [.42, .38, .31], midt = [.6, .55, .45]; let n = 0;
    for (let i = 0; i < Q.length; i++) { const [x, y] = Q[i]; if (Math.abs(x - u.cx) > u.S - 5 || Math.abs(y - u.cy) > u.S - 5) { n = 0; continue; }
      const a = Q[Math.max(0, i - 1)], c = Q[Math.min(Q.length - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / l, ny = (c[0] - a[0]) / l, z = (hoyde3d(x, y, u) - u.h0) * R.EX + .12;
      for (const [t, f] of [[-1, kant], [0, midt], [1, kant]]) { const px = x + nx * w * t, py = y + ny * w * t; pos.push(px - u.cx, py - u.cy, t ? Math.max(z - .25, Math.min(z, (hoyde3d(px, py, u) - u.h0) * R.EX + .1)) : z); col.push(...f); }
      const o = pos.length / 3 - 3; if (n) idx.push(o - 3, o, o - 2, o, o + 1, o - 2, o - 2, o + 1, o - 1, o + 1, o + 2, o - 1); n++; }
    if (!idx.length) return []; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.userData.id = b.id; m.renderOrder = 1; return [m]; }
  function gjerde3d(b, u, R, mat) {
    if (LB.BYGG[b.type].veg) return veg3d(b, u, R, mat);
    const ut = [];
    for (const [a, c] of LB.gjerdeLedd(L, b)) { const l = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.ceil(l / 10)), ret = Math.atan2(c[1] - a[1], c[0] - a[0]);
      for (let i = 0; i < n; i++) { const x0 = a[0] + (c[0] - a[0]) * i / n, y0 = a[1] + (c[1] - a[1]) * i / n, x1 = a[0] + (c[0] - a[0]) * (i + 1) / n, y1 = a[1] + (c[1] - a[1]) * (i + 1) / n;
        if (Math.abs(x0 - u.cx) > u.S - 5 || Math.abs(y0 - u.cy) > u.S - 5) continue;
        const z0 = (hoyde3d(x0, y0, u) - u.h0) * R.EX, z1 = (hoyde3d(x1, y1, u) - u.h0) * R.EX, m = new THREE.Mesh(MODELLER.gjerde(l / n), mat);
        m.position.set(x0 - u.cx, y0 - u.cy, z0 - .05); m.rotation.order = 'ZXY'; m.rotation.z = ret - Math.PI / 2; m.rotation.x = Math.atan2(z1 - z0, l / n);
        if (!LB.ferdig(b)) m.scale.z = Math.max(.08, LB.framdrift(b)); m.userData.id = b.id; ut.push(m); } }
    return ut;
  }
  let mesh = [], skisse = [];
  // Grunnen under et bygg i 3D-utsnittets egne mål: topp = høyeste punkt under bygget, bunn = laveste.
  function grunn3d(b, u, R) { const G = LB.grunn(b, (x, y) => (Math.abs(x - u.cx) > u.S || Math.abs(y - u.cy) > u.S ? null : (hoyde3d(x, y, u) - u.h0) * R.EX)); return G; }
  // Grunnmuren: en mur i gråstein under hele bygget, fra byggets fot ned i bakken på den lave siden, med en lysere sokkelkant øverst
  function grunnmur(b, G, mat, u) { const B = LB.BYGG[b.type]; if (!B.fot) return null; const k = 1 + ((b.nivå || 1) - 1) * .08, [x0, x1, y0, y1] = B.fot.map(v => v * k), w = x1 - x0 + .3, d = y1 - y0 + .3, h = G.forskjell + .6, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const farg = (g, c) => { const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) { const z = g.attributes.position.getZ(q), t = .82 + .18 * ((q * 7) % 5) / 5; f.set([c[0] * t * (z > 0 ? 1 : .8), c[1] * t * (z > 0 ? 1 : .8), c[2] * t * (z > 0 ? 1 : .8)], q * 3); } g.setAttribute('color', new THREE.BufferAttribute(f, 3)); return g; };
    const mur = new THREE.BoxGeometry(w, d, h, Math.max(1, Math.round(w / 1.2)), Math.max(1, Math.round(d / 1.2)), Math.max(1, Math.round(h / .5))).toNonIndexed(); mur.translate(cx, cy, -h / 2 + .02); farg(mur, [.47, .46, .43]);
    const kant = new THREE.BoxGeometry(w + .16, d + .16, .14).toNonIndexed(); kant.translate(cx, cy, -.05); farg(kant, [.62, .61, .58]);
    const m = new THREE.Mesh(MODELLER.samle([mur, kant]), mat); m.position.set(b.x - u.cx, b.y - u.cy, G.topp - .05); m.rotation.z = b.ret || 0; return m; }
  // Er bygget et hus som skal stå som byggeplass i 3D? 'saltak' / 'flatt' (formene i leir2d.js), ellers false
  function byggeplassHus(b) {
    const BP = window.Byggeplass, B = LB.BYGG[b.type]; if (!BP || !B || !B.fot || B.linje || B.del) return false;
    const L2 = window.Leir2d, st = L2 && L2.stil ? L2.stil(b.type, B) : null; if (st && L2.HUS && !L2.HUS.has(st.form)) return false;
    // (tanken og porten reiser seg som før; små kasser – aggregat, batteri – også)
    if (st && (st.form === 'tank' || st.form === 'port' || (st.form === 'kasse' && (B.fot[1] - B.fot[0]) * (B.fot[3] - B.fot[2]) < 12))) return false;
    return st && st.form === 'sal' ? 'saltak' : st ? 'flatt' : 'saltak';
  }
  // Leirens ting (telt, bål …) – lages på nytt med leirens nett
  let leirTing = null;
  function leirting3d(u, R) {
    const BP = window.Byggeplass, S = spill(); if (leirTing && BP) { BP.fjernLeir(R, leirTing); leirTing = null; }
    if (!BP || !S || !S.leir || !L || !window.MODELLER) return;
    const brakker = L.bygg.filter(b => b.type === 'brakke' && LB.ferdig(b)).length + ((window.Byggesett && Byggesett.rom && (() => { try { return Byggesett.rom().length; } catch (e) { return 0; } })()) || 0);
    const vann = window.Gange && Gange.vannVed ? Gange.vannVed(u) : null, sx = S.leir.x, sy = S.leir.y;
    const bygg = L.bygg.filter(b => !LB.BYGG[b.type].linje).map(b => ({ b, f: LB.BYGG[b.type].fot || [-2, 2, -2, 2], c: Math.cos(b.ret || 0), s: Math.sin(b.ret || 0) }));
    const plan = (L.plan || []).filter(a => !LB.BYGG[a.type].linje).map(b => ({ b, f: LB.BYGG[b.type].fot || [-2, 2, -2, 2], c: Math.cos(b.ret || 0), s: Math.sin(b.ret || 0) }));
    const kjøretøy = window.KjorSpill && KjorSpill.liste ? KjorSpill.liste().filter(k => Number.isFinite(k.X) && Number.isFinite(k.Y)) : [];
    // opptatt: bygg og skisser (fotavtrykket + tingens radius + 1,5 m til stillaset), flaggstanga, vann og vegen
    const opptatt = (x, y, r) => { const X = sx + x, Y = sy + y; if (Math.hypot(x, y) < r + 1.5) return true;
      for (const q of [...bygg, ...plan]) { const dx = X - q.b.x, dy = Y - q.b.y, a = dx * q.c + dy * q.s, d = -dx * q.s + dy * q.c, m = r + 2.5;
        if (a > q.f[0] - m && a < q.f[1] + m && d > q.f[2] - m && d < q.f[3] + m) return true; }
      if (vann && vann(X - u.cx, Y - u.cy)) return true;
      // (R17, funn 17: helikopteret sto inne i byggeteltene) – feltbilen og helikopteret (spill/kjor.js) holdes fri: rotoren ca. 7 m
      if (kjøretøy.some(k => Math.hypot(X - k.X, Y - k.Y) < r + (k.type === 'heli' ? 7 : 3.5))) return true;
      return !!(L.bygg.some(b => LB.BYGG[b.type].veg) && LB.vegAvstand && LB.vegAvstand(L, X, Y, false) < LB.BYGG.veg.bredde / 2 + r); };
    leirTing = BP.lagLeir(u, R, [sx, sy], BP.antallTelt(brakker), BP.hash(Math.round(sx), Math.round(sy)), opptatt);
  }
  function lagLeir3d(u, R) {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); if (m.userData.plan) m.material.dispose(); } mesh = [];
    if (!L || !window.MODELLER) return; const mat = MODELLER.materiale();
    for (const b of L.bygg) {
      if (LB.BYGG[b.type].linje) { for (const m of gjerde3d(b, u, R, mat)) { R.scene.add(m); mesh.push(m); } continue; }
      const x = b.x - u.cx, y = b.y - u.cy; if (Math.abs(x) > u.S - 5 || Math.abs(y) > u.S - 5) continue;
      let g; try { g = modell(b); } catch (e) { console.error(e); continue; } if (!g) continue;
      // bygget står i høyde med det høyeste punktet under seg (ingenting graves ned i bakken); i skråning fyller en grunnmur ned
      const G = grunn3d(b, u, R), m = new THREE.Mesh(g, mat), z = G.topp;
      m.position.set(x, y, z - .05); m.rotation.z = b.ret || 0;
      if (G.forskjell > .35 && !LB.BYGG[b.type].del) { const gm = grunnmur(b, G, mat, u); if (gm) { gm.userData.id = b.id; gm.userData.grunnmur = true; R.scene.add(gm); mesh.push(gm); } }
      // under bygging: reiser seg etter framdriften (minst en grunnmur); oppgradert: litt større
      // (runde 8, kritikken: «den uferdige brakka er en svevende, mørk, flat plate») – hus står som byggeplass i trinn (spill/byggeplass3d.js:
      // stikker, grunnmur, reisverk, tak, kledning, stillas, materialer), andre bygg reiser seg som før
      const k = 1 + ((b.nivå || 1) - 1) * .08, plass = !LB.ferdig(b) && byggeplassHus(b);
      if (plass) { g.computeBoundingBox(); const H = g.boundingBox.max.z, p = LB.framdrift(b); g.dispose();
        m.geometry = window.Byggeplass.byggeplassGeo(LB.BYGG[b.type].fot.map(v => v * k), H * k, p, plass === 'flatt'); m.userData.byggeplass = window.Byggeplass.nøkkel(p); }
      else { m.scale.z = LB.ferdig(b) ? 1 : Math.max(.08, LB.framdrift(b)); m.scale.x = m.scale.y = k; m.scale.z *= k; }
      m.userData.id = b.id; R.scene.add(m); mesh.push(m);
    }
    // (runde 8, kritikken: «leiren i 3D er et tomt jorde ved start») telt, bål, kasser, fat, ved og presenning rundt flaggstanga
    leirting3d(u, R);
    // planen: gjennomsiktige blå skisser (gjerdet som stykker)
    if (!(L.plan || []).length) return; const pm = new THREE.MeshBasicMaterial({ color: 0x6fa8dc, transparent: true, opacity: .32, depthWrite: false });
    for (const a of L.plan) {
      if (LB.BYGG[a.type].linje) { for (const m of gjerde3d({ ...a, id: -2, igjen: 0 }, u, R, pm)) { m.material = pm; m.userData.plan = a.pid; R.scene.add(m); mesh.push(m); } continue; }
      const x = a.x - u.cx, y = a.y - u.cy; if (Math.abs(x) > u.S - 5 || Math.abs(y) > u.S - 5) continue;
      let g; try { g = modell(a); } catch (e) { continue; } if (!g) continue;
      const m = new THREE.Mesh(g, pm); m.position.set(x, y, (hoyde3d(a.x, a.y, u) - u.h0) * R.EX + .02); m.rotation.z = a.ret || 0; m.userData.plan = a.pid; R.scene.add(m); mesh.push(m);
    }
  }
  // Skissen i 3D mens du plasserer: selve bygget, gjennomsiktig grønt (kan bygges) eller rødt
  function skisse3d() {
    const R = r3(); if (!R || !R.ut || !window.THREE || !window.MODELLER) return; const u = R.ut;
    for (const m of skisse) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } skisse = [];
    const p = plassering; if (!p) return;
    if (p.mal) { for (const d of p.deler || []) { if (LB.BYGG[d.type].linje) continue; let g; try { g = modell(d); } catch (e) { g = null; } if (!g) continue;
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: d.feil ? 0xe0604a : 0x7fd17a, transparent: true, opacity: .45, depthWrite: false }));
        m.position.set(d.x - u.cx, d.y - u.cy, (hoyde3d(d.x, d.y, u) - u.h0) * R.EX + .02); m.rotation.z = d.ret; R.scene.add(m); skisse.push(m); } return; }
    const B = LB.BYGG[p.type], ok = !p.feil;
    const mat = new THREE.MeshBasicMaterial({ color: ok ? 0x7fd17a : 0xe0604a, transparent: true, opacity: .45, depthWrite: false });
    if (B.linje) { if (p.punkter.length < 2) { mat.dispose(); return; } for (const m of gjerde3d({ ...sp(p), id: -1, igjen: 0 }, u, R, mat)) { m.material = mat; R.scene.add(m); skisse.push(m); } return; }
    if (p.x === null) { mat.dispose(); return; } let g; try { g = modell({ type: p.type }); } catch (e) { g = null; } if (!g) { mat.dispose(); return; }
    const m = new THREE.Mesh(g, mat); m.position.set(p.x - u.cx, p.y - u.cy, (hoyde3d(p.x, p.y, u) - u.h0) * R.EX + .02); m.rotation.z = p.ret; R.scene.add(m); skisse.push(m);
  }
  // Fjerner trær, steiner og busker inne i byggene (med 5 m margin) og midt i leiren – både når 3D-utsnittet bygges og når et nytt bygg settes opp
  function innenfor(u) {
    const P = (L ? L.bygg : []).filter(b => !LB.BYGG[b.type].linje).map(b => { const B = LB.BYGG[b.type], f = B.fot, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0);
      return [[f[0] - 5, f[2] - 5], [f[1] + 5, f[2] - 5], [f[1] + 5, f[3] + 5], [f[0] - 5, f[3] + 5]].map(([a, d]) => [b.x - u.cx + a * c - d * s, b.y - u.cy + a * s + d * c]); });
    // og en ryddet plass på 30 m rundt midten av leiren (der flagget står)
    const S = spill(), lx = S && S.leir ? S.leir.x - u.cx : 1e9, ly = S && S.leir ? S.leir.y - u.cy : 1e9;
    const harVeg = !!L && L.bygg.some(b => LB.BYGG[b.type].veg);
    return (x, y) => Math.hypot(x - lx, y - ly) < 30 || P.some(Q => pip(Q, x, y)) || (harVeg && LB.vegAvstand(L, x + u.cx, y + u.cy, false) < LB.BYGG.veg.bredde / 2 + 1.5);
  }
  KROKER.bygg3d.push(async u => {
    if (!L || !spill()) return; const inni = innenfor(u);
    const sil = data => { const ut = []; for (let k = 0; k < data.length; k += 5) if (!inni(data[k], data[k + 1])) for (let q = 0; q < 5; q++) ut.push(data[k + q]); return new Float32Array(ut); };
    if (u.trær) for (const k in u.trær) u.trær[k] = sil(u.trær[k]);
    if (u.smått) { u.smått.stein = sil(u.smått.stein); u.smått.busk = sil(u.smått.busk); }
  });
  function ryddTrær(R) {
    const u = R.ut; if (!u) return; const inni = innenfor(u), null16 = new Float32Array(16);
    for (const t of R.treLOD || []) for (let k = 0; k < t.n; k++) if (inni(t.data[k * 5], t.data[k * 5 + 1])) t.M.set(null16, k * 16);
    R.lodVed = null;
    const mm = new THREE.Matrix4(), v = new THREE.Vector3(), nullM = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const m of [...(R.treMesh || []), ...(R.småMesh || [])]) { if (!m.isInstancedMesh || (R.treLOD || []).some(t => t.nær === m || t.fjern === m)) continue;
      let endret = false; for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, mm); v.setFromMatrixPosition(mm); if (inni(v.x, v.y)) { m.setMatrixAt(k, nullM); endret = true; } }
      if (endret) m.instanceMatrix.needsUpdate = true; }
  }
  KROKER.sett3d.push((u, R) => { lagLeir3d(u, R); skisse = []; skisse3d(); });
  // når et bygg settes opp, flyttes eller blir ferdig: bare leirens nett lages på nytt (og trærne der ryddes)
  function bygg3dPåNytt(nytt) { const R = r3(); if (!R || !R.ut || !window.THREE) return; lagLeir3d(R.ut, R); if (nytt) ryddTrær(R); }
  // byggene vokser mens de bygges (oppdateres hvert sekund)
  // (runde 8) byggeplassene lages på nytt når de er kommet et trinn (5 %) lenger
  setInterval(() => { const R = r3(); if (!R || !L) return; for (const m of mesh) { const b = L.bygg.find(q => q.id === m.userData.id); if (!b || !(b.igjen > 0) || LB.BYGG[b.type].veg || m.userData.grunnmur) continue;
    if (m.userData.byggeplass === undefined) { m.scale.z = Math.max(.08, LB.framdrift(b)) * (1 + ((b.nivå || 1) - 1) * .08); continue; }
    const p = LB.framdrift(b), n = window.Byggeplass.nøkkel(p); if (n === m.userData.byggeplass) continue;
    const k = 1 + ((b.nivå || 1) - 1) * .08, g0 = modell(b); if (!g0) continue; g0.computeBoundingBox(); const H = g0.boundingBox.max.z; g0.dispose();
    m.geometry.dispose(); m.geometry = window.Byggeplass.byggeplassGeo(LB.BYGG[b.type].fot.map(v => v * k), H * k, p, byggeplassHus(b) === 'flatt'); m.userData.byggeplass = n; } }, 1000);

  // ---------- start ----------
  function start() {
    const S = spill(); leirKnapp.hidden = !S; if (!S) return;
    L = les() || LB.ny(); sistDiesel = null;
    // leirens midte: herfra reiser byggelagene til utpostene (Leir.reise). Gamle lagrede leirer får den her.
    L.midt = { x: S.leir.x, y: S.leir.y };
    siste = LB.steg(L, 0, solNå()); visStatus(); bygg3dPåNytt();
  }
  window.LeirSpill = { kartveger, kjøpDiesel, totalPris: type => { const k = LB.kostnad(type, 1, bonus()); return k ? totalPris(k) : null; },
    // dieselprognosen (Leir.dieselRekker): { timer, perDøgn, målt } – samme tall i dagsrapporten, Lager og varselbrikkene
    diesel: () => (L ? LB.dieselRekker(L, siste ? siste.agg * LB.DRIVSTOFF.literPerKWt : 0) : null),
    påEgenVeg: (X, Y) => !!L && LB.påVeg(L, X, Y), fane: id => { fane = id; if (menyEl.classList.contains('på')) { menyEl.scrollTop = 0; visMeny(); } }, start, tilstand: () => L, startPlassering, trykk, bekreft, prøv, avbryt, plassering: () => plassering, siste: () => siste, lagre, rutenett: v => { rutenett = v; }, velg: id => { valgtBygg = id; visByggPanel(); },
    planModus: v => { if (v !== undefined) planModus = v; return planModus; }, fortsett: v => { if (v !== undefined) fortsett = v; return fortsett; }, inntil: v => { if (v !== undefined) inntil = v; return inntil; },
    grunn3d,
    angre: () => angreEn(angre, gjørOm), gjørOm: () => angreEn(gjørOm, angre), byggFraPlan, startMal, lagreMal, maler, roter, oppdater3d: bygg3dPåNytt, valgt: () => valgtBygg, visMeny: () => meny && visMeny() };
  // K1 sier fra når spillet er klart (lagret spill lest inn, eller ny leir satt opp)
  window.addEventListener('riksbrudd-spill', start);
})();
