/* Riksbrudd – EVENTYRET TIL FOTS, visningen (window.EventyrSpill). Reglene: spill/eventyr.js (alle tall er Claudes forslag).
 * Lagres per leir i «riksbrudd-eventyr» (skader, feller, hund, historie, tellere, tilfluktslagre) og «riksbrudd-kartslor» (sløret).
 * I testene (navigator.webdriver) skjer ingenting av seg selv: EventyrSpill.test = true slår det på.
 * Kroker inn i andre filer: gange.js (fart, fall), spillet-visning.js (fiendeFaktor, truffet, skudd, treff, hodeskudd, felt, slåttUt),
 * leting-visning.js (lettHus, trolig), utstyr.js (sekkKnapp), karakter.js (window.KARAKTERARK).
 */
(function (rot) {
  'use strict';
  // Felles tilfeldighet (M0 punkt 4, R16-E): alt som bestemmer hva som skjer, trekker fra verdens strøm (spill/tilfeldig.js),
  // så verden kan lagres og regnes likt på flere maskiner.
  const tilfV = (typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random;
  const E = rot.Eventyr; if (!E || typeof document === 'undefined') return;
  const R = E.REGLER, NØKKEL = 'riksbrudd-eventyr', SLØR = 'riksbrudd-kartslor';
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (tekst, fn, a = {}) => { const b = el('button', { type: 'button', ...a }, tekst); b.onclick = fn; return b; };
  const ut = { test: false }, auto = () => !navigator.webdriver || ut.test;

  // delene, det du lager og armbrøsten legges inn i sekkens tabeller (spill/utstyr.js)
  if (rot.Utstyr) { Object.assign(Utstyr.TING, E.Handverk.DELER, E.Handverk.LAGET); Utstyr.VÅPEN.armbrøst = E.Handverk.ARMBRØST; }

  const nyT = () => ({ skader: {}, feller: [], hund: null, hist: E.Historie.ny(), tellere: { gått: 0, felt: 0, laget: 0, fangst: 0, sovet: 0 }, slør: true, våkn: true, lagre: {}, hundGått: 0, ekte: 0 });
  let T = nyT(), M = null, leirId = '', klar = false, sistPos = null, sistTid = null, sistSkudd = null, stilleSkudd = false, sistLagret = 0, slørEndret = false, slørLagret = 0, maske = null;
  let snik = new WeakMap(), hundVarslet = {}, meldt = {}, sover = 0, panelModus = '', sistPanel = '', sistRad = '', hundFig = null, hundPos = null;
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  const sekk = () => (rot.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill.tilstand() : null);
  const ting = () => { const I = sekk(); return I ? I.ting : null; };
  const behov = () => (rot.KarakterSpill && KarakterSpill.klar() && KarakterSpill.T() ? KarakterSpill.T().behov : null);
  const helse = () => (rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.K() : null);
  const har = evne => !!(rot.OverlevSpill && OverlevSpill.har && OverlevSpill.har(evne));
  const fører = () => !!(rot.KjorSpill && KjorSpill.fører && KjorSpill.fører());
  const går = () => { const Q = r3(); return !!(Q && Q.fot && Q.ut && typeof på3d !== 'undefined' && på3d && !fører()); };
  const deg = () => { const Q = r3(); return går() ? { x: Q.ut.cx + Q.bane.x, y: Q.ut.cy + Q.bane.y } : null; };
  const iLeiren = () => !!(rot.KarakterSpill && KarakterSpill.iLeiren && KarakterSpill.iLeiren());
  const inne = () => { const Q = r3(); return går() && rot.Interior3d ? Interior3d.inne(Q.bane.x, Q.bane.y) : null; };
  const iTilflukt = () => !!(rot.OverlevSpill && OverlevSpill.iTilflukt && går() && OverlevSpill.iTilflukt());
  // SPILL I 2D (26. nov, spill/spill2d.js): karakterlaget i kartet står for deg når du ikke går i 3D
  const karPos = () => { if (typeof ENHETER === 'undefined') return null; const k = ENHETER.find(e => e.karakter && levende(e)); return k && !k.ombord ? { x: k.x, y: k.y } : null; };
  const tilflukt2d = () => { const p = karPos(); return !!p && !!(rot.Overlev && rot.Overlev.Tilflukt && Overlev.Tilflukt.nærmeste) && (() => { const q = Overlev.Tilflukt.nærmeste(tilflukter(), p.x, p.y); return !!q && q.meter <= 30; })(); };
  const tilflukter = () => (rot.OverlevSpill && OverlevSpill.klar() ? OverlevSpill.T() : []);
  const stilling = () => (rot.Gange && Gange.stilling ? Gange.stilling() : 'stå');
  const fiender = () => ENHETER.filter(e => e.side !== 'blå' && levende(e));
  const lagreSekk = () => { if (rot.UtstyrSpill) { UtstyrSpill.lagre(); UtstyrSpill.vis(); } };
  const tall = v => String(Math.round(v * 10) / 10).replace('.', ',');

  // ---------- lagring ----------
  function lagre() { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: T })); } catch (e) { /* fullt eller sperret */ } }
  function lagreSlør() { if (!M) return; try { localStorage.setItem(SLØR, JSON.stringify({ leir: leirId, t: E.Slør.tilTekst(M) })); } catch (e) { /* fullt eller sperret */ } slørEndret = false; }
  function start() {
    const S = spill(); if (!S || !S.leir) return;
    leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y);
    let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    T = nyT(); if (d && d.leir === leirId && d.d) { Object.assign(T, d.d); T.tellere = { ...nyT().tellere, ...(d.d.tellere || {}) }; T.hist = { ...E.Historie.ny(), ...(d.d.hist || {}) }; T.feller = Array.isArray(T.feller) ? T.feller : []; T.skader = T.skader || {}; T.lagre = T.lagre || {}; }
    if (T.hund) E.Hund.fyll(T.hund);
    M = E.Slør.ny(S.leir.x, S.leir.y);
    try { const s = JSON.parse(localStorage.getItem(SLØR) || 'null'); if (s && s.leir === leirId) E.Slør.fraTekst(M, s.t); } catch (e) { /* begynner på nytt */ }
    maske = null; snik = new WeakMap(); hundVarslet = {}; meldt = {}; sistPos = null; sistTid = null; klar = true;
    // en ny sekk får full feltflaske (gamle spill fyller den i leiren)
    const t = ting(); if (t && t.vann === undefined && !d) t.vann = R.tur.flaske;
    merkSlør(true);
  }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- meldinger ----------
  const css = document.createElement('style');
  css.textContent = `#evrad{ position:fixed; left:8px; top:calc(var(--topp,58px) + 150px); z-index:6; display:none; flex-direction:column; gap:5px; align-items:flex-start; max-width:46vw; }
#evrad.på{ display:flex; } #evrad button{ min-height:36px; padding:3px 10px; background:rgba(20,16,10,.72); border:1px solid rgba(231,220,195,.55); color:#e7dcc3; font:inherit; font-size:14px; font-weight:600; cursor:pointer; text-align:left; }
#evrad button.viktig{ border-color:#e8a46a; color:#ffd9a8; } #evrad .lapp{ padding:2px 8px; background:rgba(40,16,12,.85); border:1px solid #c96a4a; color:#f6dccb; font-size:13px; font-weight:600; } #evrad .lapp.rolig{ background:rgba(20,16,10,.6); border-color:rgba(231,220,195,.3); color:#d8cdb4; font-weight:400; } #evrad .lapp.god{ background:rgba(20,30,16,.8); border-color:#9fc46a; color:#dcebc6; }
body.kort #evrad{ top:calc(var(--topp,40px) + 96px); gap:3px; } body.kort #evrad button{ min-height:32px; font-size:12px; padding:2px 8px; }
#evpanel{ position:fixed; left:50%; top:calc(var(--topp,58px) + 56px); transform:translateX(-50%); z-index:31; display:none; width:min(430px,94vw); max-height:calc(100vh - var(--topp,58px) - 110px); overflow:auto; padding:10px 14px 12px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#evpanel.på{ display:block; } #evpanel h2{ margin:0 30px 4px 0; font-size:19px; } #evpanel h3{ margin:11px 0 3px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); }
#evpanel .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
#evpanel .rad, #karakterark .evrad{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:4px 0; border-bottom:1px solid #2e281e; } #evpanel .rad > div, #karakterark .evrad > div{ flex:1; min-width:0; } #evpanel small, #karakterark .evrad small{ display:block; color:var(--ink-dim,#a99); }
#evpanel button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:34px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; } #evpanel button:disabled{ opacity:.45; }
#evpanel .knapper2{ display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; }
body.smal #evpanel, body.kort #evpanel{ left:0; right:0; top:auto; bottom:0; transform:none; width:auto; max-height:64vh; border-width:1px 0 0; }
#evtoast{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 100px); z-index:13; display:none; width:max-content; max-width:min(540px,90vw); padding:9px 16px; background:rgba(24,30,18,.96); border:1px solid #9fc46a; color:#e6f0d6; font-size:15px; text-align:center; } #evtoast.på{ display:block; } #evtoast b{ display:block; font-size:17px; margin-bottom:2px; }
#evsov{ position:fixed; inset:0; z-index:40; display:none; align-items:center; justify-content:center; background:rgba(4,4,6,.93); color:#cfc6b0; font-size:20px; } #evsov.på{ display:flex; }
#karakterark .evhist{ padding:6px 8px; margin:4px 0; background:#231d13; border-left:3px solid #c9b26a; } #karakterark .evhist b{ display:block; } #karakterark .evhist small{ display:block; color:var(--ink-dim,#a99); margin-top:2px; }`;
  document.head.appendChild(css);
  const rad = el('div', { id: 'evrad' }), panel = el('div', { id: 'evpanel', role: 'dialog', 'aria-label': 'Eventyret' }), toast = el('div', { id: 'evtoast', role: 'status' }), sov = el('div', { id: 'evsov' }, 'Du sover …');
  document.body.append(rad, panel, toast, sov);
  sov.addEventListener('click', () => { if (sover && !sover.straks) våkn(Math.min(1, ((typeof tid !== 'undefined' ? tid : 0) - sover.start) / TIME / R.tilflukt.sovTimer), 'du sto opp selv.'); });
  let toastTil = 0;
  function si(tittel, tekst) { toast.replaceChildren(el('b', {}, tittel), tekst || ''); toast.classList.add('på'); toastTil = performance.now() + 8000; logg(tittel + (tekst ? ': ' + tekst : '')); }
  // én melding per tilstand (ikke hvert sekund)
  function engang(id, på, tekst) { if (på && !meldt[id]) { meldt[id] = true; logg(tekst); } else if (!på) delete meldt[id]; }

  // ---------- A1: vann og mat på tur ----------
  // selv = true: karakteren drakk av seg selv (spill/karakter.js, runde 12) – da ingen melding når det ikke gikk
  function drikk(selv) { const t = ting(), B = behov(); if (!t || !B) return false; if (B.tørst > 92) { if (selv !== true) logg('Du er ikke tørst.'); return false; }
    const f = E.Tur.drikk(t); if (!f) { if (selv !== true) logg('Feltflaska er tom. Fyll den ved et vann eller i leiren.'); return false; }
    B.tørst = Math.min(100, B.tørst + f); lagreSekk(); logg(selv === true ? `Du var tørst og drakk av feltflaska (${t.vann || 0} slurker igjen).` : `Du drikker av feltflaska (${t.vann || 0} slurker igjen).`); oppdater(); return true; }
  const spis = () => (rot.KarakterSpill ? KarakterSpill.spisRasjon() : false);
  // (runde 5) ved vann: vannmasken eller en bekk (u.iBekk) i 3D; i 2D der karakteren står, når 3D-utsnittet dekker stedet
  function vedVann() { const Q = r3(); if (!Q || !Q.ut || !rot.Gange || !Gange.vannVed) return false; const u = Q.ut, v = Gange.vannVed(u), b = u.iBekk || (() => false);
    let x, y; if (går()) { const k = Gange.kropp(); if (!k) return false; x = k.x; y = k.y; } else { const s = typeof ENHETER !== 'undefined' && ENHETER.find(e => e.karakter); if (!s) return false; x = s.x - u.cx; y = s.y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) return false; }
    return [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].some(([dx, dy]) => v(x + dx, y + dy) || b(x + dx, y + dy)); }
  function fyllFlaske(stille) { const t = ting(); if (!t) return 0; const n = E.Tur.fyll(t); if (n > 0) { lagreSekk(); if (!stille) logg('Du fyller feltflaska.'); } return n; }
  // «Pakk for tur» i leiren: full flaske og opptil tre rasjoner fra leirens mat
  function pakk() { const t = ting(), F = rot.FolkSpill && FolkSpill.tilstand(); if (!t) return false; if (!iLeiren()) { logg('Du må være i leiren for å pakke.'); return false; }
    const vann = rot.KarakterSpill && KarakterSpill.harVann() ? fyllFlaske(true) : 0; let n = 0;
    while (F && F.mat >= 1 && (t.rasjon || 0) < R.tur.pakkRasjoner && rot.Utstyr.plassTil(sekk(), 'rasjon') > 0) { F.mat -= 1; t.rasjon = (t.rasjon || 0) + 1; n++; }
    lagreSekk(); logg(n || vann ? `Pakket for tur: ${vann ? 'full feltflaske' : 'flaska var full'}${n ? ` og ${n} rasjon${n > 1 ? 'er' : ''} fra leirens mat` : ''}.` : 'Du har alt du får med: full flaske og nok rasjoner.'); oppdater(); return true; }

  // ---------- skader ----------
  function fåSkade(id, årsak) { if (!E.Skader.få(T.skader, id, typeof tid !== 'undefined' ? tid : 0, årsak)) return false; const D = E.Skader.LISTE[id]; si(D.navn, `${årsak ? årsak + '. ' : ''}${D.tekst} Behandles med ${D.kurTekst}, i sykestua eller med tid.`); lagre(); oppdater(); return true; }
  function behandle(id) { const t = ting(); if (!t) return false; const g = E.Skader.behandle(T.skader, id, t); if (g) { logg(g); return false; }
    lagreSekk(); lagre(); logg(id === 'bein' ? 'Beinet er spjelket. Du går nesten som før, og det gror fortere.' : 'Såret er renset og forbundet. Infeksjonen går tilbake.'); if (id === 'infeksjon') T.tellere.behandlet = (T.tellere.behandlet || 0) + 1; oppdater(); return true; }
  function fall(v) { if (!auto() || !klar) return; const f = E.Skader.fall(v, har('seig')); if (!f) return; const K = helse(); if (K) { K.hp = Math.max(5, K.hp - f.helse); K.skadd = performance.now(); }
    logg(`Du falt hardt (−${f.helse} helse).`); if (tilfV() < f.bein) fåSkade('bein', 'Du landet stygt'); }
  function truffet(tap) { if (!auto() || !klar) return; if (tilfV() < E.Skader.skudd(tap)) fåSkade('infeksjon', 'Et skuddsår har blitt betent'); hundTruffet(tap); }
  // (runde 4) hunden ved siden av deg kan også bli truffet
  function hundTruffet(tap) { const H = T.hund; if (!H || !går()) return 0; const s = E.Hund.truffet(H, tap, tilfV()); if (!s) return 0; E.Hund.fyll(H); H.hp = Math.max(0, H.hp - s);
    if (H.hp <= 0) { logg(`${H.navn} ble skutt og døde. Den fulgte deg til det siste.`); T.hund = null; hundPos = null; } else engang('hundSkadet', true, `${H.navn} ble truffet og halter (${Math.round(H.hp)} %). Den gror i leiren.`); lagre(); return s; }
  // gi hunden en rasjon fra sekken
  function matHund() { const t = ting(); if (!t) return false; const g = E.Hund.mat(T.hund, t); if (g) { logg(g); return false; } delete meldt.hundSulten; lagreSekk(); lagre(); logg(`${T.hund.navn} fikk en rasjon og logrer.`); return true; }
  // temperaturen der du står: værets temperatur, 0,6 °C kaldere per 100 m over leiren (som i spill/verden.js)
  function tempHer() { const v = rot.VAER, t = v ? (v.regel && isFinite(v.regel.temp) ? v.regel.temp : v.temp) : null; if (!isFinite(t) || t === null) return null; const p = deg(), S = spill(); if (!p || !S || !S.leir || typeof hoydeVed !== 'function') return t; const dh = hoydeVed(p.x, p.y) - hoydeVed(S.leir.x, S.leir.y); return isFinite(dh) ? t - Math.max(0, dh) * .006 : t; }
  const sykestue = () => { const L = rot.LeirSpill && LeirSpill.tilstand(); return !!(L && rot.Leir && L.bygg.some(b => b.type === 'sykestue' && (Leir.virker ? Leir.virker(b) : Leir.ferdig(b)))); };

  // ---------- håndverk ----------
  function lag(id) { const I = sekk(); if (!I) return false; const o = E.Handverk.oppskrift(id); if (!o) return false;
    if (o.gir.våpen && I.våpen.length >= Utstyr.MAKS_VÅPEN) { logg(`Du bærer alt ${Utstyr.MAKS_VÅPEN} våpen. Kast ett først.`); return false; }
    const r = E.Handverk.lag(I.ting, id); if (r.feil) { logg(r.feil); return false; }
    if (r.våpen) { I.våpen.push({ id: r.våpen, mag: Utstyr.VÅPEN[r.våpen].magasin }); } else I.ting[r.ting] = (I.ting[r.ting] || 0) + r.n;
    T.tellere.laget++; lagreSekk(); lagre(); logg(`Du har laget: ${o.navn.toLowerCase()}.`); oppdater(); return true; }

  // ---------- feller ----------
  const skogHer = () => { const Q = r3(); if (!går() || !Q.hindre) return false; const cx = Math.floor(Q.bane.x / 20), cy = Math.floor(Q.bane.y / 20); let n = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of Q.hindre.get((cx + i) + ',' + (cy + j)) || []) if (!o.P) n++; return n >= R.snik.skogTrær; };
  function settFelle(p0) { const i2d = !!(p0 && typeof p0.x === 'number'), t = ting(), p = i2d ? p0 : deg(); if (!t || !p) { logg('Feller setter du ut der karakteren din står (velg karakteren i kartet), eller når du går selv i 3D.'); return false; } if (!(t.felle > 0)) { logg('Du har ingen snarefelle. Lag en av ståltråd og tau.'); return false; }
    if (!i2d && inne()) { logg('Fella må stå ute.'); return false; } if (iLeiren()) { logg('Sett fella et stykke unna leiren.'); return false; } if (T.feller.length >= R.felle.maks) { logg(`Du har alt ${R.felle.maks} feller ute.`); return false; }
    t.felle--; if (!t.felle) delete t.felle; T.feller.push({ x: Math.round(p.x), y: Math.round(p.y), tid: typeof tid !== 'undefined' ? tid : 0, ekte: T.ekte, skog: i2d ? !!p0.skog : skogHer() });
    lagreSekk(); lagre(); logg('Fella er satt ut. Kom tilbake om noen timer.'); skitten = true; oppdater(); return true; }
  const nærFelle = p0 => { const p = p0 && typeof p0.x === 'number' ? p0 : deg(); if (!p) return -1; return T.feller.findIndex(f => Math.hypot(f.x - p.x, f.y - p.y) <= R.felle.nær); };
  function sjekkFelle(nr, r1, r2) { const f = T.feller[nr === undefined ? nærFelle() : nr]; if (!f) return null; const n = E.Felle.sjekk(f, typeof tid !== 'undefined' ? tid : 0, T.ekte, r1 === undefined ? tilfV() : r1, r2 === undefined ? tilfV() : r2);
    if (n === null) { logg(`Fella er tom ennå (${Math.round(E.Felle.igjen(f, tid, T.ekte) * 100)} % av ventetiden er gått).`); return null; }
    T.feller.splice(T.feller.indexOf(f), 1); const t = ting();
    if (n > 0) { if (t) t.rasjon = (t.rasjon || 0) + n; T.tellere.fangst++; logg(`Fangst i fella! Du får ${n} rasjon${n > 1 ? 'er' : ''}. Fella er oppbrukt.`); } else logg('Fella var utløst, men tom. Den er ødelagt.');
    lagreSekk(); lagre(); skitten = true; oppdater(); return n; }

  // ---------- hunden ----------
  function fåHund(tekst) { if (T.hund) return false; T.hund = E.Hund.fyll({ navn: E.Hund.NAVN[Math.floor(tilfV() * E.Hund.NAVN.length)] }); hundPos = null; lagre(); si(`${T.hund.navn} følger deg`, (tekst || 'En hund har slått følge med deg.') + ' Den knurrer når fiender du ikke ser, er i nærheten.'); oppdater(); return true; }

  // ---------- sniking og dekning ----------
  // mørket: 3D-natta (spill/natt3d.js), ellers krigens natt etter klokka (spill/krig.js)
  const mørke = () => (rot.NATT && isFinite(NATT.mørke) ? NATT.mørke : rot.Krig && Krig.natt && Krig.klokkeTime && typeof tid !== 'undefined' ? Krig.natt(Krig.klokkeTime(tid)) || 0 : 0);
  // fiender med nattsikt (pakka «krig»: utstyr eller røvere som venter på mørket) ser deg som om det var dag
  const harNattsikt = e => !!((e.utstyr && e.utstyr.nattsikt) || e.nattsikt);
  // (runde 5) lommelykta på om natta (spill/lykt.js): mørket skjuler deg ikke, og fiendene ser deg lenger unna
  function snikRekkevidde(utenMørke) { const k = rot.Gange && Gange.kropp ? Gange.kropp() : null, nå = performance.now(), ly = rot.LyktSpill && LyktSpill.på() ? LyktSpill.røper() : 0;
    return (ly || 1) * E.Snik.rekkevidde({ stilling: stilling(), mørke: utenMørke || ly ? 0 : mørke(), skog: skogHer(), fart: k ? k.fart : 0, løper: !!(k && k.løper), stilleLøp: har('stilleløp'), skuddSiden: sistSkudd === null ? null : (nå - sistSkudd) / 1000, stilleVåpen: stilleSkudd }); }
  // står det en vegg eller et tre mellom deg og fienden, like ved deg?
  function vegg(d, e) { const Q = r3(); if (!Q || !Q.ut || typeof hindring3d !== 'function') return false; const dx = e.x - d.x, dy = e.y - d.y, l = Math.hypot(dx, dy) || 1, x0 = d.x - Q.ut.cx, y0 = d.y - Q.ut.cy;
    for (let s = 1; s <= Math.min(R.dekning.veggAvstand, l - 1); s += .5) if (hindring3d(x0 + dx / l * s, y0 + dy / l * s)) return true; return false; }
  // faktoren på skaden fra én fiende (kampSteg i spillet-visning.js): 0 når de ikke har oppdaget deg
  // (runde 4) ligger en bakketopp mellom deg og fienden? Terrenget langs linja fra 3D-utsnittet (kampen til fots skjer bare i 3D;
  // hoydeVed i 2D gir 0 der kartet ikke er lastet). Utenfor utsnittet: ingen dekning.
  function bakke(d, e) { const D = R.dekning, n = D.prøver, h = new Array(n), Q = r3(), u = Q && Q.ut; if (typeof hoyde3d !== 'function' || !u) return false;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), x = d.x + (e.x - d.x) * t, y = d.y + (e.y - d.y) * t; if (Math.abs(x - u.cx) > u.S || Math.abs(y - u.cy) > u.S) return false; const v = hoyde3d(x, y); if (typeof v !== 'number' || !isFinite(v)) return false; h[i] = v; }
    return E.Snik.bakkeImellom(h, D.øye[stilling()] || D.øye.stå); }
  function fiendeFaktor(d, e) { if (!auto() || !klar) return 1; const s = snik.get(e); if (!s || !s.sett) return 0; return E.Snik.dekning(stilling(), rot.BakkekampSpill ? false : vegg(d, e), bakke(d, e)); }
  function snikSteg(p, dt) { const rekk0 = snikRekkevidde(), rekkN = snikRekkevidde(true); let høyest = 0, nær = Infinity, rekk = rekk0;
    for (const e of fiender()) { const a = Math.hypot(e.x - p.x, e.y - p.y); if (a > 900) { snik.delete(e); continue; } const s = snik.get(e) || { nivå: 0, sett: false }; rekk = harNattsikt(e) ? rekkN : rekk0; s.nivå = E.Snik.steg(s.nivå, a, rekk, dt); const før = s.sett; s.sett = E.Snik.sett(s.sett, s.nivå); snik.set(e, s);
      if (s.sett && !før) logg(`${e.navn} har oppdaget deg!`); høyest = Math.max(høyest, s.nivå); nær = Math.min(nær, a); }
    snikSteg.nivå = høyest; snikSteg.nær = nær; snikSteg.rekk = rekk0; }

  // ---------- tilflukt: sov, lager, våkn opp der ----------
  const herTilflukt = () => { const P = rot.OverlevSpill && OverlevSpill.her ? OverlevSpill.her() : null; return P && tilflukter().find(q => q.i === P.bygg.i) || null; };
  const lagerFor = q => (T.lagre[q.i] = T.lagre[q.i] || E.Lager.ny());
  // SOV: klokka spoles (600×) til du har sovet REGLER.tilflukt.sovTimer spilltimer – høyst sovSek ekte sekunder – og du vekkes hvis noe skjer
  // (fiender nær, du tar skade, leiren angripes). I testene (straks) får du en hel natt uten at klokka røres.
  const FART = { 0: 'sp0', 1: 'sp1', 10: 'sp2', 60: 'sp3', 600: 'sp4' };
  const settFart = v => { const b = document.getElementById(FART[v] || 'sp1'); if (b && tempo !== v) b.click(); };
  const fare = () => { const p = deg() || (sover && sover.i2d ? karPos() : null); return !!p && fiender().some(e => Math.hypot(e.x - p.x, e.y - p.y) < R.tilflukt.vekkAvstand || (snik.get(e) || {}).sett); };
  function våkn(andel, grunn) { const ute = sover && sover.ute, g = ute ? E.Tur.ute(andel, ute.pose, ute.vinter) : E.Tur.søvn(andel), B = behov(), K = helse(); sov.classList.remove('på'); if (sover && sover.fart !== undefined) settFart(sover.fart); sover = 0;
    if (B) B.søvn = Math.min(100, B.søvn + g.søvn); if (K) K.hp = Math.max(5, Math.min(100, K.hp + g.helse)); if (B && g.sult) B.sult = Math.max(0, B.sult - g.sult); if (andel >= .5) T.tellere.sovet++; lagre();
    if (ute) { logg(g.frøs ? `Du frøs i natt uten sovepose: bare ${g.søvn} søvn, sulten og ${-g.helse} helse borte. Finn en sovepose (skap og hytter) eller sov i et sikret hus.` : `Du sov ${tall(andel * R.tilflukt.sovTimer)} timer ute${ute.pose ? ' i soveposen' : ' uten sovepose (dårlig søvn)'}: +${g.søvn} søvn.`); oppdater(); return; }
    logg(grunn ? `Du ble vekket: ${grunn} Du rakk å sove ${tall(andel * R.tilflukt.sovTimer)} timer.` : `Du har sovet ${R.tilflukt.sovTimer} timer. Du er uthvilt, og kroppen har hentet seg inn.`); oppdater(); }
  // (runde 5) «Sov her» ute: med sovepose like godt som i en tilflukt, uten halvt så godt – og om vinteren fryser du (Eventyr.Tur.ute)
  const vinter = () => !!(rot.VAER && /vinter/i.test(String(VAER.årstid || '')));
  function sovUte() { const t = ting() || {}; if (sover) return false; if (iTilflukt()) return sovNå(); if (inne()) { logg('Sov i et hus du har sikret, eller ute.'); return false; }
    const pose = t.sovepose > 0; if (!sovNå(false, { pose, vinter: vinter() })) return false;
    logg(pose ? 'Du ruller ut soveposen og legger deg.' : vinter() ? 'Du legger deg uten sovepose – det blir en kald natt.' : 'Du legger deg på bakken uten sovepose – du sover dårlig.'); return true; }
  function sovNå(straks, ute, i2d) { if (!ute && !(i2d ? tilflukt2d() : iTilflukt()) && !straks) { logg('Du kan bare sove i et hus du har sikret.'); return false; } if (sover) return false;
    if (straks) { sover = { straks: true }; våkn(1, ''); return true; }
    if (fare()) { logg('Du kan ikke sove mens fienden er så nær.'); return false; }
    const K = helse(); sover = { start: typeof tid !== 'undefined' ? tid : 0, ekte: performance.now(), fart: tempo, hp: K ? K.hp : 100, angrep: !!(rot.SpilletSpill && SpilletSpill.T && SpilletSpill.T() && SpilletSpill.T().aktiv), ute: ute || null, i2d: !!i2d };
    sov.textContent = 'Du sover …'; sov.classList.add('på'); settFart(600); return true; }
  // hver kvarte sekund mens du sover: ferdig, eller vekket
  setInterval(() => { if (!sover || sover.straks) return; const K = helse(), sovet = ((typeof tid !== 'undefined' ? tid : 0) - sover.start) / TIME, andel = Math.min(1, sovet / R.tilflukt.sovTimer);
    sov.textContent = `Du sover … ${tall(sovet)} av ${R.tilflukt.sovTimer} timer (trykk for å våkne)`;
    const angrep = !!(rot.SpilletSpill && SpilletSpill.T && SpilletSpill.T() && SpilletSpill.T().aktiv);
    if (andel >= 1) våkn(1, ''); else if (K && K.hp < sover.hp - 1) våkn(andel, 'du blir skadet!'); else if (fare()) våkn(andel, 'fiender i nærheten!'); else if (angrep && !sover.angrep) våkn(andel, 'leiren er under angrep!');
    else if (!sover.ute && !(sover.i2d ? tilflukt2d() : iTilflukt())) våkn(andel, 'du er ikke lenger i tilfluktsstedet.'); else if (sover.ute && (sover.i2d ? !karPos() : !går())) våkn(andel, ''); else if (performance.now() - sover.ekte > R.tilflukt.sovSek * 1000) våkn(1, ''); else if (tempo !== 600) settFart(600); }, 250);
  function tilLager(id) { const q = herTilflukt(), t = ting(); if (!q || !t) return 0; const L = lagerFor(q), plass = R.tilflukt.lagerKg - E.Lager.vekt(L, Utstyr.TING, Utstyr.VÅPEN), D = Utstyr.TING[id]; if (!D) return 0;
    const n = E.Lager.flytt(t, L.ting, id, Math.min(t[id] || 0, Math.floor((plass + 1e-9) / D.vekt))); if (!n) logg('Lageret i tilfluktsstedet er fullt.'); lagreSekk(); lagre(); return n; }
  function fraLager(id) { const q = herTilflukt(), I = sekk(); if (!q || !I) return 0; const L = lagerFor(q), n = E.Lager.flytt(L.ting, I.ting, id, Math.min(L.ting[id] || 0, Utstyr.plassTil(I, id))); if (!n) logg('Sekken er for tung.'); lagreSekk(); lagre(); return n; }
  function våpenTilLager(nr) { const q = herTilflukt(), I = sekk(); if (!q || !I || I.våpen.length <= 1 || !I.våpen[nr]) return false; const L = lagerFor(q); if (E.Lager.vekt(L, Utstyr.TING, Utstyr.VÅPEN) + Utstyr.VÅPEN[I.våpen[nr].id].vekt > R.tilflukt.lagerKg) { logg('Lageret i tilfluktsstedet er fullt.'); return false; }
    L.våpen.push(I.våpen.splice(nr, 1)[0]); I.aktiv = Math.max(0, Math.min(I.aktiv > nr ? I.aktiv - 1 : I.aktiv, I.våpen.length - 1)); lagreSekk(); lagre(); return true; }
  function våpenFraLager(nr) { const q = herTilflukt(), I = sekk(); if (!q || !I) return false; const L = lagerFor(q), v = L.våpen[nr]; if (!v) return false; if (I.våpen.length >= Utstyr.MAKS_VÅPEN) { logg(`Du bærer alt ${Utstyr.MAKS_VÅPEN} våpen.`); return false; } if (Utstyr.vekt(I) + Utstyr.VÅPEN[v.id].vekt > Utstyr.maks()) { logg('Sekken er for tung.'); return false; }
    I.våpen.push(L.våpen.splice(nr, 1)[0]); lagreSekk(); lagre(); return true; }
  // slått ut: våkn i nærmeste tilfluktssted når det ligger nær nok og innenfor 3D-utsnittet (spillet-visning.js spør)
  function slåttUt(K) { if (!klar || !T.våkn || fører()) return false; const p = deg(), Q = r3(); if (!p) return false; const q = rot.Overlev.Tilflukt.nærmeste(tilflukter(), p.x, p.y); if (!q || q.meter > R.tilflukt.nær) return false;
    const x = q.x - Q.ut.cx, y = q.y - Q.ut.cy; if (Math.abs(x) > Q.ut.S * .9 || Math.abs(y) > Q.ut.S * .9) return false;
    K.hp = R.tilflukt.helseEtter; Gange.flytt(x, y, false);
    // interiøret i huset bygges straks (ellers er huset en massiv kloss til du har stått der litt), og du settes på et fritt sted på gulvet
    if (rot.Interior3d && Interior3d.oppdater) { try { for (let n = 0; n < 14 && !Interior3d.inne(x, y); n++) Interior3d.oppdater(true); } catch (e) { /* bygges av seg selv etterpå */ }
      if (typeof hindring3d === 'function' && hindring3d(x, y)) { let funnet = false; for (let r = .5; r <= 8 && !funnet; r += .5) for (let v = 0; v < 6.28 && !funnet; v += .52) { const px = x + Math.cos(v) * r, py = y + Math.sin(v) * r; if (Interior3d.inne(px, py) && !hindring3d(px, py) && !hindring3d(px + .4, py) && !hindring3d(px - .4, py) && !hindring3d(px, py + .4) && !hindring3d(px, py - .4)) { Gange.flytt(px, py, false); funnet = true; } } } } if (Gange.ligg) Gange.ligg(false); snik = new WeakMap();
    si('Du kom deg unna', `Såret slepte du deg til tilfluktsstedet ${Math.round(q.meter)} m unna. Hvil eller sov her.`); if (auto() && tilfV() < .35) fåSkade('infeksjon', 'Såret har blitt betent'); return true; }

  // ---------- historien ----------
  const bakgrunn = () => { const S = spill(); return (S && S.karakter && S.karakter.bakgrunn) || 'soldat'; };
  function tellere() { const t = T.tellere; t.hus = rot.LeteSpill && LeteSpill.antall ? LeteSpill.antall() : 0; t.tilflukt = tilflukter().length; t.hund = T.hund ? 1 : 0; t.oppdaget = M ? E.Slør.km2(M) : 0; return t; }
  function giBelønning(b) { if (b.penger && rot.OppstartSpill) OppstartSpill.gi(b.penger); const I = sekk();
    if (b.ting && I) for (const [id, n] of Object.entries(b.ting)) I.ting[id] = (I.ting[id] || 0) + n;
    if (b.ferdighet && rot.OverlevSpill) OverlevSpill.øk(b.ferdighet[0], b.ferdighet[1]); lagreSekk(); }
  const belønningTekst = b => { const d = []; if (b.penger) d.push(rot.Leir ? Leir.kroner(b.penger) : b.penger + ' kr'); if (b.ting) for (const [id, n] of Object.entries(b.ting)) d.push(`${n} ${(q => (q.enhet === 'skudd' ? 'skudd ' + q.navn : q.navn.toLowerCase()))(Utstyr.TING[id] || { navn: id })}`); if (b.ferdighet) d.push(`et løft i ${(Overlev.Ferdigheter.LISTE[b.ferdighet[0]] || { navn: b.ferdighet[0] }).navn.toLowerCase()}`); return d.join(', '); };
  function historieSteg() { const k = E.Historie.fullfør(bakgrunn(), T.hist, tellere()); if (!k) return null; giBelønning(k.belønning); lagre(); si(`Kapittel fullført: ${k.tittel}`, `${k.etter} Du får ${belønningTekst(k.belønning)}.`);
    const n = E.Historie.kapittel(bakgrunn(), T.hist); if (n) logg(`Nytt kapittel – ${n.tittel}: ${n.tekst}`); oppdater(); return k; }

  // ---------- kartsløret ----------
  function merkSlør(alt) { if (!M) return 0; const S = spill(); let ny = [];
    if (alt && S && S.leir) ny = ny.concat(E.Slør.merk(M, S.leir.x, S.leir.y, R.slør.leir));
    for (const s of ENHETER) if (s.side === 'blå' && levende(s)) ny = ny.concat(E.Slør.merk(M, s.x, s.y, R.slør.lag));
    const p = deg(); if (p) ny = ny.concat(E.Slør.merk(M, p.x, p.y, R.slør.deg));
    if (ny.length) { slørEndret = true; if (maske) { const g = maske.getContext('2d'); for (const [i, j] of ny) g.clearRect(i, M.n - 1 - j, 1, 1); } if (slørVises()) skitten = true; }
    return ny.length; }
  const slørVises = () => klar && T.slør && auto() && typeof på3d !== 'undefined' && !på3d;
  function lagMaske() { maske = document.createElement('canvas'); maske.width = maske.height = M.n; const g = maske.getContext('2d'), b = g.createImageData(M.n, M.n), a = Math.round(R.slør.alfa * 255);
    for (let j = 0; j < M.n; j++) for (let i = 0; i < M.n; i++) { const k = j * M.n + i, o = ((M.n - 1 - j) * M.n + i) * 4; b.data[o] = 12; b.data[o + 1] = 10; b.data[o + 2] = 8; b.data[o + 3] = (M.bit[k >> 3] >> (k & 7)) & 1 ? 0 : a; }
    g.putImageData(b, 0, 0); }
  // Sløret tegnet i et lerret med 2D-kartets regel: skjerm-x = (X − vx0) / m, skjerm-y = (vy1 − Y) / m; W × H = lerretets størrelse.
  // (runde 4) Brukes av 2D-kartet under, og kan brukes av et minikart: EventyrSpill.slørTegn(g, cx − R, cy + R, 2R / px, px, px)
  // etter at kartet er tegnet (minikart2d.js eies av pakka «ui»; forslaget står i docs/natt/folk.md). Gir false når sløret er av.
  function slørTegn(g, vx0, vy1, m, VW, VH) { if (!M || !klar || !T.slør || !auto()) return false; if (!maske) lagMaske();
    const c = M.celle, W = M.n * c, sx = (M.x0 - vx0) / m, sy = (vy1 - (M.y0 + W)) / m, sw = W / m; g.save(); g.fillStyle = `rgba(12,10,8,${R.slør.alfa})`;
    // utenfor rutenettet er alt uoppdaget
    if (sy > 0) g.fillRect(0, 0, VW, sy); if (sy + sw < VH) g.fillRect(0, sy + sw, VW, VH - sy - sw); const y0 = Math.max(0, sy), y1 = Math.min(VH, sy + sw);
    if (y1 > y0) { if (sx > 0) g.fillRect(0, y0, sx, y1 - y0); if (sx + sw < VW) g.fillRect(sx + sw, y0, VW - sx - sw, y1 - y0); }
    // bare den synlige delen av masken tegnes (myke kanter når den forstørres)
    const i0 = Math.max(0, Math.floor(-sx * m / c)), i1 = Math.min(M.n, Math.ceil((VW - sx) * m / c)), j0 = Math.max(0, Math.floor(-sy * m / c)), j1 = Math.min(M.n, Math.ceil((VH - sy) * m / c));
    if (i1 > i0 && j1 > j0) { g.imageSmoothingEnabled = true; g.drawImage(maske, i0, j0, i1 - i0, j1 - j0, sx + i0 * c / m, sy + j0 * c / m, (i1 - i0) * c / m, (j1 - j0) * c / m); }
    g.restore(); return true; }
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar) return;
    if (slørVises() && M) slørTegn(g, vx0, vy1, kam.m, VW, VH);
    if (T.feller.length && kam.m < 30) { g.save(); g.font = '11px sans-serif'; g.textAlign = 'center';
      for (const f of T.feller) { const x = (f.x - vx0) / kam.m, y = (vy1 - f.y) / kam.m; if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue; g.strokeStyle = '#e8c46a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 6.283); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.stroke();
        if (kam.m < 4) { g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText('Felle', x, y + 19); g.fillStyle = '#f0e2b0'; g.fillText('Felle', x, y + 19); } }
      g.restore(); } });

  // ---------- 3D: snikemåler, feller og hunden ----------
  // Første gang måleren vises (i denne nettleseren): en kort forklaring («riksbrudd-snikforklart»). Teksten står også i hjelpen.
  let snikForklart = false; try { snikForklart = !!localStorage.getItem('riksbrudd-snikforklart'); } catch (e) { /* privat vindu */ }
  function snikForklar() { if (snikForklart) return; snikForklart = true; try { localStorage.setItem('riksbrudd-snikforklart', '1'); } catch (e) { /* privat vindu */ }
    si('Snikemåleren', 'Under siktet: har fienden nær deg merket deg? Skjult → Mistenkt → Sett. Huk eller ligg (C/Z), skog og mørke skjuler deg – løping avslører.'); }
  KROKER.tegn3d.push((g, proj3) => { if (!klar || !går()) return; const Q = r3(); g.save();
    if (auto() && isFinite(snikSteg.nær) && snikSteg.nær < 700) { const n = snikSteg.nivå || 0, w = 96, x = VW / 2 - w / 2, y = VH / 2 + 46, farge = n >= 1 ? '#e0604a' : n > .05 ? '#e8c46a' : '#9fc46a';
      g.globalAlpha = .85; g.fillStyle = 'rgba(20,16,10,.6)'; g.fillRect(x - 1, y - 1, w + 2, 7); g.fillStyle = farge; g.fillRect(x, y, w * Math.max(.04, n), 5);
      g.font = '600 12px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; const t = E.Snik.ord(n); g.strokeText(t, VW / 2, y + 20); g.fillStyle = farge; g.fillText(t, VW / 2, y + 20);
      // (runde 6, 19. nov, kritikken: «Skjult» → «Mistenkt» dukket opp uten forklaring) en linje under: hvem det gjelder, og hvor nær
      g.font = '11px sans-serif'; const t2 = `fiende ${Math.round(snikSteg.nær / 10) * 10} m unna` + (n > .05 && n < 1 ? ' – han har hørt noe' : n >= 1 ? ' – du er oppdaget' : '');
      g.strokeText(t2, VW / 2, y + 34); g.fillStyle = 'rgba(231,220,195,.85)'; g.fillText(t2, VW / 2, y + 34);
      snikForklar(); }
    g.globalAlpha = 1; g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
    for (const f of T.feller) { const d = Math.hypot(f.x - Q.ut.cx - Q.bane.x, f.y - Q.ut.cy - Q.bane.y); if (d > 250) continue; const p = proj3(f.x, f.y); if (!p) continue; const t = d < R.felle.nær ? 'Felle' : `Felle ${Math.round(d / 5) * 5} m`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, p[0], p[1] - 8); g.fillStyle = '#f0e2b0'; g.fillText(t, p[0], p[1] - 8); }
    g.restore(); });
  // (runde 4) hunden er en gruppe: kroppen og fire bein som svinger fra hofta/skuldra når den går, og halen logrer.
  // Ett materiale, ingen lys. hundFig = THREE.Group, hundFig.userData.bein = [fv, fh, bv, bh], .hale
  function byggHund(Rr) { const pels = [.45, .33, .2], mørk = [.2, .15, .1], lys = [.8, .72, .58], mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const geo = liste => rot.MODELLER.samle(liste), boks = (d, x, y, z, sx, sy, sz, c) => { const q = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); q.translate(x, y, z); const n = q.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); q.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(q); };
    // ser mot +x, potene i origo
    const kropp = []; boks(kropp, 0, 0, .42, .62, .22, .24, pels); boks(kropp, .12, 0, .36, .3, .2, .08, lys); boks(kropp, .38, 0, .58, .2, .18, .2, pels); boks(kropp, .52, 0, .54, .14, .1, .09, mørk); boks(kropp, .4, .07, .7, .05, .04, .08, mørk); boks(kropp, .4, -.07, .7, .05, .04, .08, mørk);
    const G = new THREE.Group(), m = new THREE.Mesh(geo(kropp), mat); G.add(m);
    // beinet henger ned fra leddet (z 0,3)
    const fram = [], bak = []; boks(fram, 0, 0, -.15, .07, .07, .3, pels); boks(bak, 0, 0, -.15, .07, .07, .3, mørk); const gF = geo(fram), gB = geo(bak);
    const bein = [[.22, .08, gF], [.22, -.08, gF], [-.24, .08, gB], [-.24, -.08, gB]].map(([x, y, g]) => { const b = new THREE.Mesh(g, mat); b.position.set(x, y, .3); G.add(b); return b; });
    const hd = []; boks(hd, -.1, 0, 0, .2, .05, .05, pels); const hale = new THREE.Mesh(geo(hd), mat); hale.position.set(-.3, 0, .56); G.add(hale);
    G.userData = { bein, hale, kilde: 'eventyr-visning.js' }; G.traverse(o => { o.frustumCulled = false; o.userData.kilde = 'eventyr-visning.js'; }); Rr.scene.add(G); return G; }
  function fjernHund() { if (hundFig) { if (hundFig.parent) hundFig.parent.remove(hundFig); const sett = new Set(); hundFig.traverse(o => { if (o.geometry && !sett.has(o.geometry)) { sett.add(o.geometry); o.geometry.dispose(); } if (o.material && !sett.has(o.material)) { sett.add(o.material); o.material.dispose(); } }); hundFig = null; } }
  KROKER.ramme3d.push(Rr => { if (typeof THREE === 'undefined' || !rot.MODELLER) return; if (hundFig && (hundFig.parent !== Rr.scene || !hundFig.isGroup)) fjernHund();
    if (!klar || !T.hund || !Rr.fot || !Rr.ut || fører()) { if (hundFig) hundFig.visible = false; return; } if (!hundFig) hundFig = byggHund(Rr);
    const u = Rr.ut, a = Rr.fot.a, mx = Rr.bane.x - Math.sin(a) * 2.2 + Math.cos(a) * 1.5, my = Rr.bane.y + Math.cos(a) * 2.2 + Math.sin(a) * 1.5;
    if (!hundPos || hundPos.u !== u || Math.hypot(hundPos.x - mx, hundPos.y - my) > 40) hundPos = { x: mx, y: my, u, r: 0, t: performance.now(), fase: 0, gang: 0 };
    // en skadet hund halter: halv fart
    const halt = T.hund.hp !== undefined && T.hund.hp < 35 ? .5 : 1;
    const nå = performance.now(), dt = Math.min(.1, (nå - hundPos.t) / 1000); hundPos.t = nå; const dx = mx - hundPos.x, dy = my - hundPos.y, l = Math.hypot(dx, dy); let v = 0;
    if (l > .6) { v = Math.min(l, (l > 6 ? 7 : R.hund.gangFart) * halt * dt); hundPos.x += dx / l * v; hundPos.y += dy / l * v; hundPos.r = Math.atan2(dy, dx); }
    const fart = dt > 0 ? v / dt : 0; hundPos.gang += ((fart > .2 ? 1 : 0) - hundPos.gang) * Math.min(1, dt * 8); hundPos.fase += fart * dt * 7;
    const g = rot.Interior3d ? Interior3d.høyde(hundPos.x, hundPos.y, (x, y) => (hoyde3d(u.cx + x, u.cy + y) - u.h0) * Rr.EX) : null, z = g !== null && g !== undefined ? g : (hoyde3d(u.cx + hundPos.x, u.cy + hundPos.y) - u.h0) * Rr.EX;
    // beina: diagonale par i takt (trav), utslag etter farten; halen logrer når den står
    const sv = Math.sin(hundPos.fase) * (fart > 4 ? .75 : .5) * hundPos.gang, B = hundFig.userData.bein; B[0].rotation.y = sv; B[3].rotation.y = sv; B[1].rotation.y = -sv; B[2].rotation.y = -sv;
    hundFig.userData.hale.rotation.z = Math.sin(nå / (hundPos.gang > .5 ? 260 : 130)) * (T.hund.mett < R.hund.spisUnder ? .15 : .5); hundFig.userData.hale.rotation.y = .5;
    hundFig.visible = true; hundFig.position.set(hundPos.x, hundPos.y, z + Math.abs(Math.sin(hundPos.fase)) * .03 * hundPos.gang); hundFig.rotation.z = hundPos.r; });

  // ---------- takten: hvert sekund ----------
  function takt() { if (!klar) return; const nå = typeof tid !== 'undefined' ? tid : 0; if (sistTid === null) sistTid = nå; const timer = Math.max(0, Math.min(6, (nå - sistTid) / TIME)); sistTid = nå;
    const spiller = typeof tempo !== 'undefined' && tempo > 0 && !document.hidden; if (spiller) T.ekte++;
    if (toastTil && performance.now() > toastTil) { toast.classList.remove('på'); toastTil = 0; }
    const p = deg(), t = ting(), B = behov(), K = helse(), ute = !!p && !iLeiren();
    // meterne du går
    const d = p && sistPos ? Math.hypot(p.x - sistPos.x, p.y - sistPos.y) : 0; sistPos = p; const gikk = d > .3 && d < 12 ? d : 0;
    if (gikk) { T.tellere.gått += gikk; if (!T.hund) T.hundGått += gikk; }
    if (auto() && spiller) {
      if (gikk && ute && B) { const k = rot.Gange.kropp(), s = E.Tur.slit(gikk, !!(k && k.løper), har('lett')); B.tørst = Math.max(0, B.tørst - s.tørst); B.sult = Math.max(0, B.sult - s.sult); }
      // feltflaska fylles i leiren og ved vann
      if (t && (t.vann || 0) < E.Tur.maks(t)) { if (p && iLeiren() && KarakterSpill.harVann()) { if (fyllFlaske(true)) logg('Feltflaska er fylt i leiren.'); } else if (vedVann()) fyllFlaske(false); }
      if (B && p) { engang('tørst', ute && B.tørst < R.tur.tørstVarsel, (t && t.vann > 0) ? `Du er tørst. Drikk av feltflaska (knappen «Drikk»${VW >= 900 ? ' eller X' : ''}).` : 'Du er tørst, og feltflaska er tom. Finn et vann eller gå til leiren.');
        engang('sult', ute && B.sult < R.tur.sultVarsel, (t && t.rasjon > 0) ? `Du er sulten. Spis en rasjon (knappen «Spis»${VW >= 900 ? ' eller N' : ''}).` : 'Du er sulten og har ingen rasjoner. Let i hus, sett feller eller gå til leiren.'); }
      // skadene gror, og infeksjonen tærer
      if (Object.keys(T.skader).length) { const r = E.Skader.steg(T.skader, timer, 1, { leir: iLeiren(), sykestue: iLeiren() && sykestue(), seig: har('seig') }); if (r.helse > 0 && K && K.hp > 5) K.hp = Math.max(5, K.hp - r.helse);
        for (const id of r.friske) logg(`${E.Skader.LISTE[id].navn}: du er frisk igjen${iLeiren() && sykestue() ? ' (behandlet i sykestua)' : ''}.`); if (r.friske.length) lagre(); }
      // kulde: ute i vinter eller nedbør
      if (ute && !inne() && timer > 0 && rot.VAER) { const reg = VAER.regel || VAER, vått = (reg.regn || 0) + (reg.snø || 0) > .3; if (tilfV() < E.Skader.kulde(timer, VAER.årstid === 'vinter', vått, tempHer())) fåSkade('infeksjon', 'Du har blitt syk av kulde og væte'); }
      // en hund slår følge
      if (!T.hund && ute && gikk && t && t.rasjon > 0) { const sikkert = (E.Historie.kapittel(bakgrunn(), T.hist) || { mål: {} }).mål.slag === 'hund'; if (E.Hund.kommer(T.hundGått, gikk, tilfV(), sikkert)) { t.rasjon--; if (!t.rasjon) delete t.rasjon; lagreSekk(); fåHund('En hund har fulgt etter deg en stund. Du ga den en rasjon, og nå blir den hos deg.'); } }
      if (p) snikSteg(p, 1);
      // (runde 4) hunden trenger mat: i leiren spiser den av leirens mat, ute må du gi den en rasjon
      if (T.hund) { const H = T.hund, h = E.Hund.steg(H, timer, 1, { leir: iLeiren(), mat: () => { const F = rot.FolkSpill && FolkSpill.tilstand(); if (F && F.mat >= 1) { F.mat -= 1; return true; } return false; } });
        if (h.spiste) delete meldt.hundSulten;
        engang('hundSulten', H.mett < R.hund.spisUnder && !h.spiste, `${H.navn} er sulten. Gi den en rasjon (knappen «Gi ${H.navn} mat») eller ta den med til leiren.`);
        if (h.går) { logg(`${H.navn} har gått sin vei for å finne mat.`); T.hund = null; hundPos = null; lagre(); } }
      // hunden varsler om fiender du ikke ser
      if (T.hund && p) { const F = fiender().map(e => ({ id: e.id || e.navn, dx: e.x - p.x, dy: e.y - p.y, avst: Math.hypot(e.x - p.x, e.y - p.y), synlig: synlig(e) })); for (const v of E.Hund.varsler(F, hundVarslet, performance.now() / 1000)) si(`${T.hund.navn} ${v.tekst.split(' – ')[0]}`, v.tekst.split(' – ')[1] ? v.tekst.split(' – ')[1].replace(/^./, c => c.toUpperCase()) + '.' : ''); }
    }
    if ((T.ekte & 1) === 0) merkSlør(false);
    if (auto()) historieSteg();
    const ms = performance.now(); if (ms - sistLagret > 15000) { sistLagret = ms; lagre(); } if (slørEndret && ms - slørLagret > 30000) { slørLagret = ms; lagreSlør(); }
    oppdater(); }
  setInterval(takt, 1000);
  rot.addEventListener('pagehide', () => { if (klar) { lagre(); if (slørEndret) lagreSlør(); } });

  // ---------- knapperaden når du går ----------
  function radInnhold() { const d = [], t = ting() || {}, B = behov(), pc = VW >= 900, st = stilling();
    for (const [id, q] of Object.entries(T.skader)) d.push(['lapp', `${E.Skader.LISTE[id].navn}${q.behandlet ? ' (behandlet)' : ''}`, null, q.behandlet ? 'god' : '']);
    // alltid synlig: hva du har med av vann og mat
    d.push(['lapp', `Flaske ${t.vann || 0}/${E.Tur.maks(t)} · rasjoner ${t.rasjon || 0}`, null, 'rolig']);
    if (T.hund) { const tl = E.Hund.tilstand(T.hund); d.push(['lapp', `Hund: ${T.hund.navn}${tl === 'i fin form' ? '' : ' (' + tl + ')'}`, null, tl === 'i fin form' ? 'god' : '']);
      if (T.hund.mett < 85 && t.rasjon > 0 && !iLeiren()) d.push(['knapp', `Gi ${T.hund.navn} mat`, 'hundmat', T.hund.mett < R.hund.spisUnder ? 'viktig' : '']); }
    if (pc) d.push(['knapp', st === 'ligg' ? 'Reis deg (Z)' : 'Legg deg ned (Z)', 'ligg', '']);
    if (B && t.vann > 0 && B.tørst < 85) d.push(['knapp', `Drikk (${t.vann})${pc ? ' X' : ''}`, 'drikk', B.tørst < R.tur.tørstVarsel ? 'viktig' : '']);
    if (B && t.rasjon > 0 && B.sult < 70) d.push(['knapp', `Spis (${t.rasjon})${pc ? ' N' : ''}`, 'spis', B.sult < R.tur.sultVarsel ? 'viktig' : '']);
    if (nærFelle() >= 0) d.push(['knapp', 'Sjekk fella', 'sjekk', 'viktig']); else if (t.felle > 0 && !inne() && !iLeiren()) d.push(['knapp', `Sett ut felle (${t.felle})`, 'felle', '']);
    if (T.skader.bein && !T.skader.bein.behandlet && t.spjelk > 0) d.push(['knapp', 'Spjelk beinet', 'bein', 'viktig']);
    if (T.skader.infeksjon && !T.skader.infeksjon.behandlet && t.forbinding > 0) d.push(['knapp', 'Behandle infeksjonen', 'inf', 'viktig']);
    if (iTilflukt()) d.push(['knapp', 'Tilflukt: sov og lager', 'tilflukt', '']);
    // (runde 5) sov ute når du er trøtt (med eller uten sovepose)
    if (B && B.søvn < R.ute.visUnder && !iTilflukt() && !inne() && !iLeiren() && !fare()) d.push(['knapp', `Sov her${t.sovepose > 0 ? ' (sovepose)' : ''}`, 'sovute', B.søvn < 25 ? 'viktig' : '']);
    d.push(['knapp', `Lag noe${pc ? ' (B)' : ''}`, 'lag', '']);
    // (runde 5) lommelykta: av/på og batterier (spill/lykt.js)
    if (rot.LyktSpill) for (const q of LyktSpill.rad()) d.push(q);
    return d; }
  // skadene dine som brikker i #varsler (spill/narhud.js leser window.VARSEL_TILLEGG); trykk = karakterarket
  (rot.VARSEL_TILLEGG = rot.VARSEL_TILLEGG || []).push(() => {
    if (!klar) return []; const t = ting() || {};
    return Object.entries(T.skader).map(([id, q]) => { const D = E.Skader.LISTE[id]; if (!D) return null;
      return { i: 'hjerte', k: q.behandlet ? '' : 'fare', t: D.navn, s: q.behandlet ? 'behandlet – gror' : t[D.kur] > 0 ? `bruk ${D.kur === 'spjelk' ? 'spjelka' : 'førstehjelp'} (i sekken)` : `trenger ${D.kurTekst.replace(/ \(.*\)$/, '')}`,
        f: () => { if (rot.KarakterSpill) KarakterSpill.åpne(); } }; }).filter(Boolean);
  });
  const GJØR = { sovute: () => sovUte(), lykt: () => rot.LyktSpill && LyktSpill.slå(), lyktbatteri: () => rot.LyktSpill && LyktSpill.bytt(), hundmat: () => matHund(), ligg: () => rot.Gange.ligg(stilling() !== 'ligg'), drikk, spis, sjekk: () => sjekkFelle(), felle: settFelle, bein: () => behandle('bein'), inf: () => behandle('infeksjon'), tilflukt: () => åpne('tilflukt'), lag: () => åpne(panelModus === 'lag' ? '' : 'lag') };
  function oppdater() { const vis = klar && går() && !sover; rad.classList.toggle('på', vis);
    if (vis && !(rot.pekerNede && pekerNede(rad))) { const d = radInnhold(), n = JSON.stringify(d); if (n !== sistRad) { sistRad = n; rad.replaceChildren(...d.map(([type, tekst, gjør, kl]) => type === 'lapp' ? el('div', { klasse: 'lapp ' + kl }, tekst) : knapp(tekst, () => { GJØR[gjør](); oppdater(); }, { klasse: kl, 'data-ev': gjør }))); } }
    if (panelModus) visPanel(false); if (rot.KarakterSpill && KarakterSpill.erÅpen && KarakterSpill.erÅpen()) KarakterSpill.vis(false); }
  rot.addEventListener('keydown', e => { if (!klar || !går() || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; const k = e.key.toLowerCase();
    if (k === 'x') drikk(); else if (k === 'n') spis(); else if (k === 'b') åpne(panelModus === 'lag' ? '' : 'lag'); else if (k === 'escape' && panelModus) åpne(''); else return; oppdater(); });

  // ---------- panelet: håndverk og tilflukt ----------
  function panelInnhold() { const f = document.createDocumentFragment(), t = ting() || {}, I = sekk();
    f.append(knapp('×', () => åpne(''), { klasse: 'lukk', 'aria-label': 'Lukk' }));
    if (panelModus === 'lag') { f.append(el('h2', {}, 'Lag noe'), el('small', {}, 'Delene finner du når du leter gjennom hus. Det du lager, havner i sekken.'), el('h3', {}, 'Deler i sekken'));
      f.append(el('div', {}, Object.entries(E.Handverk.DELER).map(([id, D]) => `${D.navn} ${t[id] || 0}`).join(' · ')), el('h3', {}, 'Oppskrifter'));
      for (const o of E.Handverk.OPPSKRIFTER) { const m = E.Handverk.mangler(t, o.id), b = knapp('Lag', () => { lag(o.id); visPanel(true); }, { 'data-lag': o.id }); b.disabled = !!m;
        f.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, o.navn), el('small', {}, `${o.tekst}. Trenger ${Object.entries(o.trenger).map(([d, n]) => `${n} ${E.Handverk.DELER[d].navn.toLowerCase()}`).join(' + ')}.${m ? ' ' + m : ''}`)), b)); } }
    else if (panelModus === 'tilflukt') { const q = herTilflukt(); f.append(el('h2', {}, 'Tilfluktsstedet'));
      if (!q || !I) { f.append(el('small', {}, 'Du står ikke i et hus du har sikret.')); return f; } const L = lagerFor(q), kg = E.Lager.vekt(L, Utstyr.TING, Utstyr.VÅPEN);
      f.append(el('small', {}, 'Her er du nesten trygg for skudd. Sov for å bli uthvilt (klokka går fort mens du sover, og du vekkes hvis noe skjer), og legg igjen utstyr du vil ha i reserve.'));
      const kn = el('div', { klasse: 'knapper2' }, knapp(`Sov (${R.tilflukt.sovTimer} timer)`, () => { if (sovNå()) åpne(''); }, { id: 'evsovknapp' }), knapp('Hvil litt (+helse)', () => { OverlevSpill.hvil(); }), knapp(T.våkn ? 'Våkner her hvis du blir slått ut: PÅ' : 'Våkner her hvis du blir slått ut: AV', () => { T.våkn = !T.våkn; lagre(); visPanel(true); }, { id: 'evvakn' })); f.append(kn);
      f.append(el('small', {}, `Blir du slått ut innen ${R.tilflukt.nær} m fra et tilfluktssted, våkner du der i stedet for i leiren (når valget står på).`));
      f.append(el('h3', {}, `Lageret her (${tall(kg)} av ${R.tilflukt.lagerKg} kg)`)); if (!Object.keys(L.ting).length && !L.våpen.length) f.append(el('small', {}, 'Tomt.'));
      L.våpen.forEach((v, n) => f.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, Utstyr.VÅPEN[v.id].navn), el('small', {}, `${v.mag} i magasinet`)), knapp('Ta med', () => { våpenFraLager(n); visPanel(true); }))));
      for (const [id, n] of Object.entries(L.ting)) f.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, Utstyr.TING[id].navn), el('small', {}, `${n} ${Utstyr.TING[id].enhet}`)), knapp('Ta med', () => { fraLager(id); visPanel(true); }, { 'data-fra': id })));
      f.append(el('h3', {}, 'I sekken'));
      I.våpen.forEach((v, n) => { const b = knapp('Legg igjen', () => { våpenTilLager(n); visPanel(true); }); b.disabled = I.våpen.length <= 1; f.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, Utstyr.VÅPEN[v.id].navn), el('small', {}, n === I.aktiv ? 'i hånda' : '')), b)); });
      for (const [id, n] of Object.entries(I.ting)) if (id !== 'vann') f.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, Utstyr.TING[id].navn), el('small', {}, `${n} ${Utstyr.TING[id].enhet}`)), knapp('Legg igjen', () => { tilLager(id); visPanel(true); }, { 'data-til': id }))); }
    return f; }
  function visPanel(tving) { if (!panelModus) return; if (!tving && rot.pekerNede && pekerNede(panel)) return; const ny = el('div'); ny.append(panelInnhold()); if (!tving && ny.innerHTML === sistPanel) return; sistPanel = ny.innerHTML; const topp = panel.scrollTop; panel.replaceChildren(...ny.childNodes); panel.scrollTop = topp; }
  function åpne(modus) { panelModus = klar ? modus || '' : ''; panel.classList.toggle('på', !!panelModus); sistPanel = ''; if (panelModus) { if (document.pointerLockElement) document.exitPointerLock(); visPanel(true); } }

  // ---------- karakterarket: historie, skader, hund, tur, kart ----------
  (rot.KARAKTERARK = rot.KARAKTERARK || []).push((f, { el: e, knapp: kn, måler }) => { if (!klar) return; const bg = bakgrunn(), k = E.Historie.kapittel(bg, T.hist), n = E.Historie.antall(bg), t = ting() || {};
    f.append(e('h3', {}, `Din historie (kapittel ${Math.min(T.hist.kap + 1, n)} av ${n})`));
    if (k) { const fr = E.Historie.framgang(bg, T.hist, tellere()); f.append(e('div', { klasse: 'evhist' }, e('b', {}, k.tittel), k.tekst, e('small', {}, `Belønning: ${belønningTekst(k.belønning)}.`)), måler('Framgang', fr.andel, `${k.mål.slag === 'gått' ? Math.round(fr.nå) + ' av ' + fr.mål + ' m' : tall(fr.nå) + ' av ' + fr.mål}`, 'ferd')); }
    else f.append(e('div', { klasse: 'evhist' }, e('b', {}, 'Historien din er fortalt'), 'Du har fullført alle kapitlene for bakgrunnen din.'));
    const sk = Object.entries(T.skader); if (sk.length) { f.append(e('h3', {}, 'Skader'));
      for (const [id, q] of sk) { const D = E.Skader.LISTE[id], b = kn(q.behandlet ? 'Behandlet' : 'Behandle', () => behandle(id), { 'data-behandle': id }); b.disabled = !!q.behandlet || !(t[D.kur] > 0);
        f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, D.navn), e('small', {}, `${q.behandlet ? 'Behandlet – gror av seg selv nå.' : D.tekst + ' Trenger ' + D.kurTekst + ', sykestua i leiren eller tid.'} ${Math.round((1 - E.Skader.igjen(q, D)) * 100)} % leget.`)), b)); } }
    f.append(e('h3', {}, 'På tur'));
    f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, `Feltflaske: ${t.vann || 0} av ${E.Tur.maks(t)} slurker`), e('small', {}, `Fylles i leiren og ved vann eller en bekk${t.feltflaske > 0 ? ` (${1 + t.feltflaske} flasker)` : ''}. Du blir tørst og sulten av å gå.`)), kn('Drikk', drikk, { id: 'evdrikk' })));
    if (iLeiren()) f.append(kn('Pakk for tur (vann og rasjoner)', pakk, { id: 'evpakk' }));
    f.append(kn('Lag noe', () => { KarakterSpill.lukk(); åpne('lag'); }, { id: 'evlag' }));
    f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, T.hund ? `Hunden ${T.hund.navn}` : 'Ingen hund'), e('small', {}, T.hund ? `Følger deg når du går, og knurrer når fiender du ikke ser, er nærmere enn 350 m. ${T.hund.navn} er ${E.Hund.tilstand(T.hund)} (helse ${Math.round(E.Hund.fyll(T.hund).hp)} %, mett ${Math.round(T.hund.mett)} %). Spiser av leirens mat i leiren – ute må du gi den rasjoner.` : 'Går du ute med en rasjon i sekken, kan en hund slå følge. Du kan også finne en i et hus.'))));
    if (T.feller.length) f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, `${T.feller.length} felle${T.feller.length > 1 ? 'r' : ''} ute`), e('small', {}, 'De står merket i kartet. Gå bort til dem for å sjekke.'))));
    f.append(e('h3', {}, 'Kartet'));
    f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, `Oppdaget: ${tall(M ? E.Slør.km2(M) : 0)} km²`), e('small', {}, 'Det du, lagene dine og leiren har sett. Resten ligger under et lett slør i 2D-kartet.')), kn(T.slør ? 'Slør: PÅ' : 'Slør: AV', () => { T.slør = !T.slør; lagre(); skitten = true; KarakterSpill.vis(true); }, { id: 'evslor' }))); });

  // ---------- det de andre filene spør om ----------
  Object.assign(ut, { start, lagre, takt, oppdater, T: () => T, slør: () => M, klar: () => klar, åpne, panel: () => panelModus,
    sovUte, vedVann, drikk, spis, pakk, matHund, hundTruffet, bakke, slørTegn, fyllFlaske, lag, settFelle, sjekkFelle, fåHund, fåSkade, behandle, sovNå, tilLager, fraLager, våpenTilLager, våpenFraLager, historieSteg, merkSlør, snikRekkevidde, snikSteg, snikNivå: () => snikSteg.nivå || 0,
    settSett: (e, v) => snik.set(e, { nivå: v ? 1 : 0, sett: !!v }),
    // spill2d.js: tellerne, fellene og søvnen når du spiller i kartet
    leggTil(teller, n) { if (!klar || !(n > 0) || !(teller in T.tellere)) return; T.tellere[teller] += n; if (teller === 'gått' && !T.hund) T.hundGått += n; },
    tellere: () => ({ ...T.tellere }), feller: () => T.feller, sover: () => !!sover, tilflukt2d, karPos, nærFelle, harFelle: () => { const t = ting(); return !!(t && t.felle > 0); },
    sov2d() { const p = karPos(); if (!klar || !p || sover) return false; if (tilflukt2d()) return sovNå(false, null, true); const S = spill(); if (S && S.leir && Math.hypot(p.x - S.leir.x, p.y - S.leir.y) < 150) { logg('I leiren sover du i brakka av deg selv.'); return false; }
      const t = ting() || {}, pose = t.sovepose > 0; if (!sovNå(false, { pose, vinter: vinter() }, true)) return false; logg(pose ? 'Du ruller ut soveposen og legger deg.' : vinter() ? 'Du legger deg uten sovepose – det blir en kald natt.' : 'Du legger deg på bakken uten sovepose – du sover dårlig.'); return true; },
    // gange.js
    fart: () => (klar ? E.Skader.fart(T.skader) : 1), kanLøpe: () => !klar || E.Skader.kanLøpe(T.skader), fall,
    // spillet-visning.js
    fiendeFaktor, truffet, slåttUt, skudd: W => { sistSkudd = performance.now(); stilleSkudd = !!(W && W.stille); }, felt: () => { if (klar) T.tellere.felt++; },
    treff: () => (klar && har('stødig') && stilling() !== 'stå' ? R.stødig : 1), hodeskudd: () => klar && har('hodeskudd') && tilfV() < R.hodeskudd,
    // leting-visning.js
    lettHus(kl, i, tomt) { if (!klar) return ''; const d = []; if (!tomt) { const f = E.Handverk.funn(kl, i, har('finner')), I = sekk(), fikk = {}; if (I) for (const [id, n] of Object.entries(f)) { const g = Utstyr.leggTil(I, id, n); if (g) fikk[id] = g; } lagreSekk(); const t = E.Handverk.tekst(fikk); if (t) d.push(t); }
      if (!T.hund && E.Hund.iHus(i) && fåHund('En hund gjemte seg i huset. Den vil bli med deg.')) d.push('En hund blir med deg!'); return d.join(' '); },
    trolig(kl, areal, i) { return har('øye') && rot.Leting ? ` (${E.Handverk.trolig(Leting.funn(kl, areal, i))})` : ''; },
    // verden-visning.js (jakt): et dyr du selv har felt. Langt fra leiren bærer du kjøttet selv – svarer true når det er tatt hånd om
    felteDyr(rasjoner, navn, avst) { const p = deg(), S = spill(), I = sekk(); if (!klar || !p || !I || !S || !S.leir || Math.hypot(p.x - S.leir.x, p.y - S.leir.y) <= R.jakt.nær) return false;
      const k = E.Tur.kjøtt(rasjoner, Utstyr.plassTil(I, 'rasjon')); if (k.med) I.ting.rasjon = (I.ting.rasjon || 0) + k.med; lagreSekk();
      logg(`Du felte en ${navn}${avst ? ` på ${Math.round(avst)} m` : ''}: ${k.med} rasjoner kjøtt i sekken${k.igjen ? `, ${k.igjen} måtte ligge igjen (sekken er full – nær leiren bæres alt hjem)` : ''}.`); oppdater(); return true; },
    // utstyr.js: egen knapp for en ting i sekken
    sekkKnapp(id) { if (!klar) return null; if (id === 'vann') return ['Drikk', drikk]; if (id === 'rasjon') return ['Spis', spis]; if (id === 'felle') return ['Sett ut', settFelle]; if (id === 'spjelk') return ['Bruk', () => behandle('bein')]; if (id === 'forbinding' && T.skader.infeksjon && !T.skader.infeksjon.behandlet) return ['Behandle', () => behandle('infeksjon')]; return null; },
  });
  rot.EventyrSpill = ut;
})(typeof window !== 'undefined' ? window : globalThis);
