/* Riksbrudd – EVENTYRET TIL FOTS, visningen (window.EventyrSpill). Reglene: spill/eventyr.js (alle tall er Claudes forslag).
 * Lagres per leir i «riksbrudd-eventyr» (skader, feller, hund, historie, tellere, tilfluktslagre) og «riksbrudd-kartslor» (sløret).
 * I testene (navigator.webdriver) skjer ingenting av seg selv: EventyrSpill.test = true slår det på.
 * Kroker inn i andre filer: gange.js (fart, fall), spillet-visning.js (fiendeFaktor, truffet, skudd, treff, hodeskudd, felt, slåttUt),
 * leting-visning.js (lettHus, trolig), utstyr.js (sekkKnapp), karakter.js (window.KARAKTERARK).
 */
(function (rot) {
  'use strict';
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
#evrad button.viktig{ border-color:#e8a46a; color:#ffd9a8; } #evrad .lapp{ padding:2px 8px; background:rgba(40,16,12,.85); border:1px solid #c96a4a; color:#f6dccb; font-size:13px; font-weight:600; } #evrad .lapp.god{ background:rgba(20,30,16,.8); border-color:#9fc46a; color:#dcebc6; }
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
  let toastTil = 0;
  function si(tittel, tekst) { toast.replaceChildren(el('b', {}, tittel), tekst || ''); toast.classList.add('på'); toastTil = performance.now() + 8000; logg(tittel + (tekst ? ': ' + tekst : '')); }
  // én melding per tilstand (ikke hvert sekund)
  function engang(id, på, tekst) { if (på && !meldt[id]) { meldt[id] = true; logg(tekst); } else if (!på) delete meldt[id]; }

  // ---------- A1: vann og mat på tur ----------
  function drikk() { const t = ting(), B = behov(); if (!t || !B) return false; if (B.tørst > 92) { logg('Du er ikke tørst.'); return false; }
    const f = E.Tur.drikk(t); if (!f) { logg('Feltflaska er tom. Fyll den ved et vann eller i leiren.'); return false; }
    B.tørst = Math.min(100, B.tørst + f); lagreSekk(); logg(`Du drikker av feltflaska (${t.vann || 0} slurker igjen).`); oppdater(); return true; }
  const spis = () => (rot.KarakterSpill ? KarakterSpill.spisRasjon() : false);
  function vedVann() { const Q = r3(); if (!går() || !rot.Gange || !Gange.vannVed) return false; const k = Gange.kropp(), v = Gange.vannVed(Q.ut); return !!k && [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].some(([dx, dy]) => v(k.x + dx, k.y + dy)); }
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
    logg(`Du falt hardt (−${f.helse} helse).`); if (Math.random() < f.bein) fåSkade('bein', 'Du landet stygt'); }
  function truffet(tap) { if (!auto() || !klar) return; if (Math.random() < E.Skader.skudd(tap)) fåSkade('infeksjon', 'Et skuddsår har blitt betent'); }
  const sykestue = () => { const L = rot.LeirSpill && LeirSpill.tilstand(); return !!(L && rot.Leir && L.bygg.some(b => b.type === 'sykestue' && (Leir.virker ? Leir.virker(b) : Leir.ferdig(b)))); };

  // ---------- håndverk ----------
  function lag(id) { const I = sekk(); if (!I) return false; const o = E.Handverk.oppskrift(id); if (!o) return false;
    if (o.gir.våpen && I.våpen.length >= Utstyr.MAKS_VÅPEN) { logg(`Du bærer alt ${Utstyr.MAKS_VÅPEN} våpen. Kast ett først.`); return false; }
    const r = E.Handverk.lag(I.ting, id); if (r.feil) { logg(r.feil); return false; }
    if (r.våpen) { I.våpen.push({ id: r.våpen, mag: Utstyr.VÅPEN[r.våpen].magasin }); } else I.ting[r.ting] = (I.ting[r.ting] || 0) + r.n;
    T.tellere.laget++; lagreSekk(); lagre(); logg(`Du har laget: ${o.navn.toLowerCase()}.`); oppdater(); return true; }

  // ---------- feller ----------
  const skogHer = () => { const Q = r3(); if (!går() || !Q.hindre) return false; const cx = Math.floor(Q.bane.x / 20), cy = Math.floor(Q.bane.y / 20); let n = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of Q.hindre.get((cx + i) + ',' + (cy + j)) || []) if (!o.P) n++; return n >= R.snik.skogTrær; };
  function settFelle() { const t = ting(), p = deg(); if (!t || !p) { logg('Feller setter du ut når du går selv.'); return false; } if (!(t.felle > 0)) { logg('Du har ingen snarefelle. Lag en av ståltråd og tau.'); return false; }
    if (inne()) { logg('Fella må stå ute.'); return false; } if (iLeiren()) { logg('Sett fella et stykke unna leiren.'); return false; } if (T.feller.length >= R.felle.maks) { logg(`Du har alt ${R.felle.maks} feller ute.`); return false; }
    t.felle--; if (!t.felle) delete t.felle; T.feller.push({ x: Math.round(p.x), y: Math.round(p.y), tid: typeof tid !== 'undefined' ? tid : 0, ekte: T.ekte, skog: skogHer() });
    lagreSekk(); lagre(); logg('Fella er satt ut. Kom tilbake om noen timer.'); skitten = true; oppdater(); return true; }
  const nærFelle = () => { const p = deg(); if (!p) return -1; return T.feller.findIndex(f => Math.hypot(f.x - p.x, f.y - p.y) <= R.felle.nær); };
  function sjekkFelle(nr, r1, r2) { const f = T.feller[nr === undefined ? nærFelle() : nr]; if (!f) return null; const n = E.Felle.sjekk(f, typeof tid !== 'undefined' ? tid : 0, T.ekte, r1 === undefined ? Math.random() : r1, r2 === undefined ? Math.random() : r2);
    if (n === null) { logg(`Fella er tom ennå (${Math.round(E.Felle.igjen(f, tid, T.ekte) * 100)} % av ventetiden er gått).`); return null; }
    T.feller.splice(T.feller.indexOf(f), 1); const t = ting();
    if (n > 0) { if (t) t.rasjon = (t.rasjon || 0) + n; T.tellere.fangst++; logg(`Fangst i fella! Du får ${n} rasjon${n > 1 ? 'er' : ''}. Fella er oppbrukt.`); } else logg('Fella var utløst, men tom. Den er ødelagt.');
    lagreSekk(); lagre(); skitten = true; oppdater(); return n; }

  // ---------- hunden ----------
  function fåHund(tekst) { if (T.hund) return false; T.hund = { navn: E.Hund.NAVN[Math.floor(Math.random() * E.Hund.NAVN.length)] }; hundPos = null; lagre(); si(`${T.hund.navn} følger deg`, (tekst || 'En hund har slått følge med deg.') + ' Den knurrer når fiender du ikke ser, er i nærheten.'); oppdater(); return true; }

  // ---------- sniking og dekning ----------
  const mørke = () => (rot.NATT && isFinite(NATT.mørke) ? NATT.mørke : 0);
  function snikRekkevidde() { const k = rot.Gange && Gange.kropp ? Gange.kropp() : null, nå = performance.now();
    return E.Snik.rekkevidde({ stilling: stilling(), mørke: mørke(), skog: skogHer(), fart: k ? k.fart : 0, løper: !!(k && k.løper), stilleLøp: har('stilleløp'), skuddSiden: sistSkudd === null ? null : (nå - sistSkudd) / 1000, stilleVåpen: stilleSkudd }); }
  // står det en vegg eller et tre mellom deg og fienden, like ved deg?
  function vegg(d, e) { const Q = r3(); if (!Q || !Q.ut || typeof hindring3d !== 'function') return false; const dx = e.x - d.x, dy = e.y - d.y, l = Math.hypot(dx, dy) || 1, x0 = d.x - Q.ut.cx, y0 = d.y - Q.ut.cy;
    for (let s = 1; s <= Math.min(R.dekning.veggAvstand, l - 1); s += .5) if (hindring3d(x0 + dx / l * s, y0 + dy / l * s)) return true; return false; }
  // faktoren på skaden fra én fiende (kampSteg i spillet-visning.js): 0 når de ikke har oppdaget deg
  function fiendeFaktor(d, e) { if (!auto() || !klar) return 1; const s = snik.get(e); if (!s || !s.sett) return 0; return E.Snik.dekning(stilling(), vegg(d, e)); }
  function snikSteg(p, dt) { const rekk = snikRekkevidde(); let høyest = 0, nær = Infinity;
    for (const e of fiender()) { const a = Math.hypot(e.x - p.x, e.y - p.y); if (a > 900) { snik.delete(e); continue; } const s = snik.get(e) || { nivå: 0, sett: false }; s.nivå = E.Snik.steg(s.nivå, a, rekk, dt); const før = s.sett; s.sett = E.Snik.sett(s.sett, s.nivå); snik.set(e, s);
      if (s.sett && !før) logg(`${e.navn} har oppdaget deg!`); høyest = Math.max(høyest, s.nivå); nær = Math.min(nær, a); }
    snikSteg.nivå = høyest; snikSteg.nær = nær; snikSteg.rekk = rekk; }

  // ---------- tilflukt: sov, lager, våkn opp der ----------
  const herTilflukt = () => { const P = rot.OverlevSpill && OverlevSpill.her ? OverlevSpill.her() : null; return P && tilflukter().find(q => q.i === P.bygg.i) || null; };
  const lagerFor = q => (T.lagre[q.i] = T.lagre[q.i] || E.Lager.ny());
  function sovNå(straks) { if (!iTilflukt() && !straks) { logg('Du kan bare sove i et hus du har sikret.'); return false; } if (sover) return false;
    if (auto() && fiender().some(e => { const s = snik.get(e); return s && s.sett; })) { logg('Du kan ikke sove mens fienden vet hvor du er.'); return false; }
    const ferdig = () => { sover = 0; sov.classList.remove('på'); const B = behov(), K = helse(); if (B) B.søvn = Math.min(100, B.søvn + R.tilflukt.sovSøvn); if (K) K.hp = Math.min(100, K.hp + R.tilflukt.sovHelse); T.tellere.sovet++; lagre(); logg('Du har sovet. Du er uthvilt, og kroppen har hentet seg inn.'); oppdater(); };
    if (straks) { ferdig(); return true; } sover = performance.now() + R.tilflukt.sovSek * 1000; sov.classList.add('på'); setTimeout(ferdig, R.tilflukt.sovSek * 1000); return true; }
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
    K.hp = R.tilflukt.helseEtter; Gange.flytt(x, y, false); if (Gange.ligg) Gange.ligg(false); snik = new WeakMap();
    si('Du kom deg unna', `Såret slepte du deg til tilfluktsstedet ${Math.round(q.meter)} m unna. Hvil eller sov her.`); if (auto() && Math.random() < .35) fåSkade('infeksjon', 'Såret har blitt betent'); return true; }

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
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar) return;
    if (slørVises() && M) { if (!maske) lagMaske(); const c = M.celle, W = M.n * c, m = kam.m, sx = (M.x0 - vx0) / m, sy = (vy1 - (M.y0 + W)) / m, sw = W / m; g.save(); g.fillStyle = `rgba(12,10,8,${R.slør.alfa})`;
      // utenfor rutenettet er alt uoppdaget
      if (sy > 0) g.fillRect(0, 0, VW, sy); if (sy + sw < VH) g.fillRect(0, sy + sw, VW, VH - sy - sw); const y0 = Math.max(0, sy), y1 = Math.min(VH, sy + sw);
      if (y1 > y0) { if (sx > 0) g.fillRect(0, y0, sx, y1 - y0); if (sx + sw < VW) g.fillRect(sx + sw, y0, VW - sx - sw, y1 - y0); }
      // bare den synlige delen av masken tegnes (myke kanter når den forstørres)
      const i0 = Math.max(0, Math.floor(-sx * m / c)), i1 = Math.min(M.n, Math.ceil((VW - sx) * m / c)), j0 = Math.max(0, Math.floor(-sy * m / c)), j1 = Math.min(M.n, Math.ceil((VH - sy) * m / c));
      if (i1 > i0 && j1 > j0) { g.imageSmoothingEnabled = true; g.drawImage(maske, i0, j0, i1 - i0, j1 - j0, sx + i0 * c / m, sy + j0 * c / m, (i1 - i0) * c / m, (j1 - j0) * c / m); }
      g.restore(); }
    if (T.feller.length && kam.m < 30) { g.save(); g.font = '11px sans-serif'; g.textAlign = 'center';
      for (const f of T.feller) { const x = (f.x - vx0) / kam.m, y = (vy1 - f.y) / kam.m; if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue; g.strokeStyle = '#e8c46a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 6.283); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.stroke();
        if (kam.m < 4) { g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText('Felle', x, y + 19); g.fillStyle = '#f0e2b0'; g.fillText('Felle', x, y + 19); } }
      g.restore(); } });

  // ---------- 3D: snikemåler, feller og hunden ----------
  KROKER.tegn3d.push((g, proj3) => { if (!klar || !går()) return; const Q = r3(); g.save();
    if (auto() && isFinite(snikSteg.nær) && snikSteg.nær < 700) { const n = snikSteg.nivå || 0, w = 96, x = VW / 2 - w / 2, y = VH / 2 + 46, farge = n >= 1 ? '#e0604a' : n > .05 ? '#e8c46a' : '#9fc46a';
      g.globalAlpha = .85; g.fillStyle = 'rgba(20,16,10,.6)'; g.fillRect(x - 1, y - 1, w + 2, 7); g.fillStyle = farge; g.fillRect(x, y, w * Math.max(.04, n), 5);
      g.font = '600 12px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; const t = E.Snik.ord(n); g.strokeText(t, VW / 2, y + 20); g.fillStyle = farge; g.fillText(t, VW / 2, y + 20); }
    g.globalAlpha = 1; g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
    for (const f of T.feller) { const d = Math.hypot(f.x - Q.ut.cx - Q.bane.x, f.y - Q.ut.cy - Q.bane.y); if (d > 250) continue; const p = proj3(f.x, f.y); if (!p) continue; const t = d < R.felle.nær ? 'Felle' : `Felle ${Math.round(d / 5) * 5} m`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, p[0], p[1] - 8); g.fillStyle = '#f0e2b0'; g.fillText(t, p[0], p[1] - 8); }
    g.restore(); });
  function byggHund(Rr) { const d = [], pels = [.45, .33, .2], mørk = [.2, .15, .1], lys = [.8, .72, .58];
    const boks = (x, y, z, sx, sy, sz, c) => { const q = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); q.translate(x, y, z); const n = q.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); q.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(q); };
    // ser mot +x, potene i origo
    boks(0, 0, .42, .62, .22, .24, pels); boks(.12, 0, .36, .3, .2, .08, lys); boks(.38, 0, .58, .2, .18, .2, pels); boks(.52, 0, .54, .14, .1, .09, mørk); boks(.4, .07, .7, .05, .04, .08, mørk); boks(.4, -.07, .7, .05, .04, .08, mørk);
    boks(-.36, 0, .56, .2, .05, .05, pels); for (const [x, y] of [[.22, .08], [.22, -.08], [-.24, .08], [-.24, -.08]]) boks(x, y, .15, .07, .07, .3, x > 0 ? pels : mørk);
    const m = new THREE.Mesh(rot.MODELLER.samle(d), new THREE.MeshLambertMaterial({ vertexColors: true })); m.frustumCulled = false; m.userData.kilde = 'eventyr-visning.js'; Rr.scene.add(m); return m; }
  function fjernHund() { if (hundFig) { if (hundFig.parent) hundFig.parent.remove(hundFig); hundFig.geometry.dispose(); hundFig.material.dispose(); hundFig = null; } }
  KROKER.ramme3d.push(Rr => { if (typeof THREE === 'undefined' || !rot.MODELLER) return; if (hundFig && hundFig.parent !== Rr.scene) fjernHund();
    if (!klar || !T.hund || !Rr.fot || !Rr.ut || fører()) { if (hundFig) hundFig.visible = false; return; } if (!hundFig) hundFig = byggHund(Rr);
    const u = Rr.ut, a = Rr.fot.a, mx = Rr.bane.x - Math.sin(a) * 2.2 + Math.cos(a) * 1.5, my = Rr.bane.y + Math.cos(a) * 2.2 + Math.sin(a) * 1.5;
    if (!hundPos || hundPos.u !== u || Math.hypot(hundPos.x - mx, hundPos.y - my) > 40) hundPos = { x: mx, y: my, u, r: 0, t: performance.now() };
    const nå = performance.now(), dt = Math.min(.1, (nå - hundPos.t) / 1000); hundPos.t = nå; const dx = mx - hundPos.x, dy = my - hundPos.y, l = Math.hypot(dx, dy);
    if (l > .6) { const v = Math.min(l, (l > 6 ? 7 : 2.6) * dt); hundPos.x += dx / l * v; hundPos.y += dy / l * v; hundPos.r = Math.atan2(dy, dx); }
    const g = rot.Interior3d ? Interior3d.høyde(hundPos.x, hundPos.y, (x, y) => (hoyde3d(u.cx + x, u.cy + y) - u.h0) * Rr.EX) : null, z = g !== null && g !== undefined ? g : (hoyde3d(u.cx + hundPos.x, u.cy + hundPos.y) - u.h0) * Rr.EX;
    hundFig.visible = true; hundFig.position.set(hundPos.x, hundPos.y, z + (l > .6 ? Math.abs(Math.sin(nå / 90)) * .04 : 0)); hundFig.rotation.z = hundPos.r; });

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
      if (t && (t.vann || 0) < R.tur.flaske) { if (p && iLeiren() && KarakterSpill.harVann()) { if (fyllFlaske(true)) logg('Feltflaska er fylt i leiren.'); } else if (p && vedVann()) fyllFlaske(false); }
      if (B && p) { engang('tørst', ute && B.tørst < R.tur.tørstVarsel, (t && t.vann > 0) ? `Du er tørst. Drikk av feltflaska (knappen «Drikk»${VW >= 900 ? ' eller X' : ''}).` : 'Du er tørst, og feltflaska er tom. Finn et vann eller gå til leiren.');
        engang('sult', ute && B.sult < R.tur.sultVarsel, (t && t.rasjon > 0) ? `Du er sulten. Spis en rasjon (knappen «Spis»${VW >= 900 ? ' eller N' : ''}).` : 'Du er sulten og har ingen rasjoner. Let i hus, sett feller eller gå til leiren.'); }
      // skadene gror, og infeksjonen tærer
      if (Object.keys(T.skader).length) { const r = E.Skader.steg(T.skader, timer, 1, { leir: iLeiren(), sykestue: iLeiren() && sykestue(), seig: har('seig') }); if (r.helse > 0 && K && K.hp > 5) K.hp = Math.max(5, K.hp - r.helse);
        for (const id of r.friske) logg(`${E.Skader.LISTE[id].navn}: du er frisk igjen${iLeiren() && sykestue() ? ' (behandlet i sykestua)' : ''}.`); if (r.friske.length) lagre(); }
      // kulde: ute i vinter eller nedbør
      if (ute && !inne() && timer > 0 && rot.VAER) { const reg = VAER.regel || VAER, vått = (reg.regn || 0) + (reg.snø || 0) > .3; if (Math.random() < E.Skader.kulde(timer, VAER.årstid === 'vinter', vått)) fåSkade('infeksjon', 'Du har blitt syk av kulde og væte'); }
      // en hund slår følge
      if (!T.hund && ute && gikk && t && t.rasjon > 0) { const sikkert = (E.Historie.kapittel(bakgrunn(), T.hist) || { mål: {} }).mål.slag === 'hund'; if (E.Hund.kommer(T.hundGått, gikk, Math.random(), sikkert)) { t.rasjon--; if (!t.rasjon) delete t.rasjon; lagreSekk(); fåHund('En hund har fulgt etter deg en stund. Du ga den en rasjon, og nå blir den hos deg.'); } }
      if (p) snikSteg(p, 1);
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
    if (T.hund) d.push(['lapp', `Hund: ${T.hund.navn}`, null, 'god']);
    if (pc) d.push(['knapp', st === 'ligg' ? 'Reis deg (Z)' : 'Legg deg ned (Z)', 'ligg', '']);
    if (B && t.vann > 0 && B.tørst < 85) d.push(['knapp', `Drikk (${t.vann})${pc ? ' X' : ''}`, 'drikk', B.tørst < R.tur.tørstVarsel ? 'viktig' : '']);
    if (B && t.rasjon > 0 && B.sult < 70) d.push(['knapp', `Spis (${t.rasjon})${pc ? ' N' : ''}`, 'spis', B.sult < R.tur.sultVarsel ? 'viktig' : '']);
    if (nærFelle() >= 0) d.push(['knapp', 'Sjekk fella', 'sjekk', 'viktig']); else if (t.felle > 0 && !inne() && !iLeiren()) d.push(['knapp', `Sett ut felle (${t.felle})`, 'felle', '']);
    if (T.skader.bein && !T.skader.bein.behandlet && t.spjelk > 0) d.push(['knapp', 'Spjelk beinet', 'bein', 'viktig']);
    if (T.skader.infeksjon && !T.skader.infeksjon.behandlet && t.forbinding > 0) d.push(['knapp', 'Behandle infeksjonen', 'inf', 'viktig']);
    if (iTilflukt()) d.push(['knapp', 'Tilflukt: sov og lager', 'tilflukt', '']);
    d.push(['knapp', `Lag noe${pc ? ' (B)' : ''}`, 'lag', '']);
    return d; }
  const GJØR = { ligg: () => rot.Gange.ligg(stilling() !== 'ligg'), drikk, spis, sjekk: () => sjekkFelle(), felle: settFelle, bein: () => behandle('bein'), inf: () => behandle('infeksjon'), tilflukt: () => åpne('tilflukt'), lag: () => åpne(panelModus === 'lag' ? '' : 'lag') };
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
      f.append(el('small', {}, 'Her er du nesten trygg for skudd. Sov for å bli uthvilt, og legg igjen utstyr du vil ha i reserve.'));
      const kn = el('div', { klasse: 'knapper2' }, knapp(`Sov (${R.tilflukt.sovSek} s)`, () => { if (sovNå()) åpne(''); }, { id: 'evsovknapp' }), knapp('Hvil litt (+helse)', () => { OverlevSpill.hvil(); }), knapp(T.våkn ? 'Våkner her hvis du blir slått ut: PÅ' : 'Våkner her hvis du blir slått ut: AV', () => { T.våkn = !T.våkn; lagre(); visPanel(true); }, { id: 'evvakn' })); f.append(kn);
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
    f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, `Feltflaske: ${t.vann || 0} av ${R.tur.flaske} slurker`), e('small', {}, 'Fylles i leiren og ved vann. Du blir tørst og sulten av å gå.')), kn('Drikk', drikk, { id: 'evdrikk' })));
    if (iLeiren()) f.append(kn('Pakk for tur (vann og rasjoner)', pakk, { id: 'evpakk' }));
    f.append(kn('Lag noe', () => { KarakterSpill.lukk(); åpne('lag'); }, { id: 'evlag' }));
    f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, T.hund ? `Hunden ${T.hund.navn}` : 'Ingen hund'), e('small', {}, T.hund ? 'Følger deg når du går, og knurrer når fiender du ikke ser, er nærmere enn 350 m.' : 'Går du ute med en rasjon i sekken, kan en hund slå følge. Du kan også finne en i et hus.'))));
    if (T.feller.length) f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, `${T.feller.length} felle${T.feller.length > 1 ? 'r' : ''} ute`), e('small', {}, 'De står merket i kartet. Gå bort til dem for å sjekke.'))));
    f.append(e('h3', {}, 'Kartet'));
    f.append(e('div', { klasse: 'evrad' }, e('div', {}, e('b', {}, `Oppdaget: ${tall(M ? E.Slør.km2(M) : 0)} km²`), e('small', {}, 'Det du, lagene dine og leiren har sett. Resten ligger under et lett slør i 2D-kartet.')), kn(T.slør ? 'Slør: PÅ' : 'Slør: AV', () => { T.slør = !T.slør; lagre(); skitten = true; KarakterSpill.vis(true); }, { id: 'evslor' }))); });

  // ---------- det de andre filene spør om ----------
  Object.assign(ut, { start, lagre, takt, oppdater, T: () => T, slør: () => M, klar: () => klar, åpne, panel: () => panelModus,
    drikk, spis, pakk, fyllFlaske, lag, settFelle, sjekkFelle, fåHund, fåSkade, behandle, sovNå, tilLager, fraLager, våpenTilLager, våpenFraLager, historieSteg, merkSlør, snikRekkevidde, snikSteg, snikNivå: () => snikSteg.nivå || 0,
    settSett: (e, v) => snik.set(e, { nivå: v ? 1 : 0, sett: !!v }),
    // gange.js
    fart: () => (klar ? E.Skader.fart(T.skader) : 1), kanLøpe: () => !klar || E.Skader.kanLøpe(T.skader), fall,
    // spillet-visning.js
    fiendeFaktor, truffet, slåttUt, skudd: W => { sistSkudd = performance.now(); stilleSkudd = !!(W && W.stille); }, felt: () => { if (klar) T.tellere.felt++; },
    treff: () => (klar && har('stødig') && stilling() !== 'stå' ? R.stødig : 1), hodeskudd: () => klar && har('hodeskudd') && Math.random() < R.hodeskudd,
    // leting-visning.js
    lettHus(kl, i, tomt) { if (!klar) return ''; const d = []; if (!tomt) { const f = E.Handverk.funn(kl, i, har('finner')), I = sekk(), fikk = {}; if (I) for (const [id, n] of Object.entries(f)) { const g = Utstyr.leggTil(I, id, n); if (g) fikk[id] = g; } lagreSekk(); const t = E.Handverk.tekst(fikk); if (t) d.push(t); }
      if (!T.hund && E.Hund.iHus(i) && fåHund('En hund gjemte seg i huset. Den vil bli med deg.')) d.push('En hund blir med deg!'); return d.join(' '); },
    trolig(kl, areal, i) { return har('øye') && rot.Leting ? ` (${E.Handverk.trolig(Leting.funn(kl, areal, i))})` : ''; },
    // utstyr.js: egen knapp for en ting i sekken
    sekkKnapp(id) { if (!klar) return null; if (id === 'vann') return ['Drikk', drikk]; if (id === 'rasjon') return ['Spis', spis]; if (id === 'felle') return ['Sett ut', settFelle]; if (id === 'spjelk') return ['Bruk', () => behandle('bein')]; if (id === 'forbinding' && T.skader.infeksjon && !T.skader.infeksjon.behandlet) return ['Behandle', () => behandle('infeksjon')]; return null; },
  });
  rot.EventyrSpill = ut;
})(typeof window !== 'undefined' ? window : globalThis);
