'use strict';
/* Riksbrudd – SELSKAPET DITT (W1, 22. nov, R16-D; docs/plan-wardogs.md). Reglene ligger i spill/selskap.js (window.Selskap).
 * Panelet «Selskapet»: navnet og merket fra oppstarten, ryktet (pålitelig, hardhendt, billig) som målere, prisprofilen,
 * kontraktene (ledige og aktive: frist, betaling, krav – Ta, Avslå, Lever, Avbryt) og de to andre selskapene.
 * Åpnes fra kommandolinja nederst (window.KOMMANDO_TILLEGG), fra ☰ («Selskapet», gruppen Oversikt i spill/meny.js) og fra fanen Mål
 * i Leir-menyen. Kontraktene bruker det som finnes i spillet: tettstedene og bruene i INFRA, egne lag (ENHETER), kjøretøy (KJORETOY),
 * leiren (OppstartSpill) og pengene (OppstartSpill.gi / betal). Lagres per leir i localStorage «riksbrudd-selskap» – ikke hos en gjest
 * i flerspiller (window.NETT.gjest). I TESTENE (navigator.webdriver) skjer ingenting av seg selv (nye tilbud hver morgen, de andre
 * selskapene tar tilbud): SelskapSpill.test = true slår det på. Å åpne panelet uten tilbud gir likevel de første tilbudene.
 * Alle tall og tekster her er Claudes forslag.
 */
(function () {
  const SK = window.Selskap; if (!SK || typeof KROKER === 'undefined') return;
  const api = { test: false }, auto = () => !navigator.webdriver || api.test;
  const ID = 'blå', NØKKEL = 'riksbrudd-selskap';
  // de andre selskapene (navnene er Claudes forslag, docs/plan-wardogs.md – besluttet av brukeren 21. nov at de skal hete noe nytt)
  const RIVALER = {
    rød: { navn: 'Ravnsund Sikkerhet', motto: 'Først fram.', farge: '#b0443a',
      omtale: 'Kystselskap med hurtigbåter og pansrede lastebiler. Raske og dyre, og de tar gjerne ryddejobbene for firmaene. Kommer de først, er kontrakten tapt.' },
    grønn: { navn: 'Mosevakt Feltoperasjoner', motto: 'Vi venter.', farge: '#5f8a45',
      omtale: 'Innlandsselskap med skarpskyttere og bakhold i skogen. Billige og tålmodige; bygdene liker dem, og de henter folk som ingen andre tør hente.' },
  };
  const Sp = () => window.OppstartSpill && OppstartSpill.tilstand();
  const kr = v => (window.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const meter = d => (d >= 1000 ? (Math.round(d / 100) / 10).toString().replace('.', ',') + ' km' : Math.round(d) + ' m');
  const gjest = () => !!(window.NETT && NETT.gjest);
  let S = null, leirId = '', klar = false, åpen = false, sistHtml = '', sistTegn = 0, lagreTid = 0, melding = '';

  // ---------- lagring (per leir, ren JSON) ----------
  function lagre() { if (!S || gjest()) return; try { localStorage.setItem(NØKKEL, SK.tilJSON(S)); } catch (e) { /* fullt eller sperret */ } }
  function les(leir) { try { return SK.fraJSON(localStorage.getItem(NØKKEL) || 'null', leir); } catch (e) { return null; } }

  // ---------- navn og merker ----------
  const fraksjon = () => { const s = Sp(); return s && s.fraksjon ? s.fraksjon : null; };
  function egetNavn() { const f = fraksjon(); return (f && f.navn) || (window.Fraksjoner && Fraksjoner.FRAKSJONER.blå.navn) || 'Ditt selskap'; }
  const navnFor = side => (side === ID ? egetNavn() : RIVALER[side] ? RIVALER[side].navn : side);
  function settNavn() { if (!S) return; S.sider.blå.navn = egetNavn(); for (const s of Object.keys(RIVALER)) S.sider[s].navn = RIVALER[s].navn; }
  // Merket til ditt selskap: skjold i flaggets farger med bokstavene (eller forbokstavene i navnet) – tegnes som SVG her
  function egetMerke(px) {
    const f = fraksjon(), fl = f && f.flagg ? f.flagg : { farger: ['#3f6fb0', '#e9e4d6', '#121417'], symbolfarge: '#d9a441' };
    const hoved = window.Oppstart && Oppstart.hovedfarge ? Oppstart.hovedfarge(fl) : fl.farger[0];
    const bokst = ((fl.bokstaver || '').trim() || egetNavn().split(/\s+/).filter(Boolean).map(o => o[0]).join('').slice(0, 2) || 'DS').toUpperCase().slice(0, 3);
    const aks = fl.symbolfarge || '#d9a441';
    return `<svg class="smerke" width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 L88 18 V48 C88 72 70 86 50 95 C30 86 12 72 12 48 V18 Z" fill="${esc(hoved)}" stroke="${esc(aks)}" stroke-width="4"/>`
      + `<path d="M50 16 L78 25 V48 C78 66 65 77 50 84 Z" fill="rgba(0,0,0,.18)"/><path d="M22 36 H78" stroke="${esc(aks)}" stroke-width="3" opacity=".8"/>`
      + `<text x="50" y="66" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="700" font-size="${bokst.length > 2 ? 24 : 30}" fill="#f3efe4" letter-spacing="1">${esc(bokst)}</text></svg>`;
  }
  // Ravnsund: sittende ravn med tungt nebb over to streker (sundet). Mosevakt: gran i tre lag i et sikte.
  function rivalMerke(side, px) {
    const R = RIVALER[side], f = R.farge;
    if (side === 'rød') return `<svg class="smerke" width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="${f}"/>`
      + `<path d="M30 62 C30 44 40 32 54 30 L70 26 L62 36 C68 42 70 52 66 62 L74 72 L56 68 L44 72 Z" fill="#121417"/><circle cx="58" cy="36" r="2.6" fill="${f}"/>`
      + `<path d="M24 78 H76 M32 86 H68" stroke="#121417" stroke-width="4" stroke-linecap="round"/></svg>`;
    return `<svg class="smerke" width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="${f}"/>`
      + `<circle cx="50" cy="50" r="34" fill="none" stroke="#121417" stroke-width="4" stroke-dasharray="44 9.4" transform="rotate(-23 50 50)"/>`
      + `<path d="M50 22 L62 40 H56 L66 54 H58 L70 70 H30 L42 54 H34 L44 40 H38 Z" fill="#121417"/><rect x="47" y="70" width="6" height="9" fill="#121417"/>`
      + `<path d="M50 8 V18 M50 82 V92 M8 50 H18 M82 50 H92" stroke="#121417" stroke-width="3"/></svg>`;
  }

  // ---------- stedene i kartet (tettsteder og bruer fra INFRA) ----------
  let STEDER = null, stederAntall = -1;
  function steder() {
    if (typeof INFRA === 'undefined' || !INFRA) return [];
    const n = (INFRA.tettsted || []).length + (INFRA.bru || []).length; if (STEDER && n === stederAntall) return STEDER;
    const ut = [], sett = new Set(), lov = (x, y) => typeof OMRÅDE_OK !== 'function' || OMRÅDE_OK(x, y);
    for (const o of INFRA.tettsted || []) { if (!o.e || !o.e.navn || !o.bb) continue; const p = typeof navnP === 'function' ? navnP(o) : null;
      const x = p ? p[0] : (o.bb[0] + o.bb[2]) / 2, y = p ? p[1] : (o.bb[1] + o.bb[3]) / 2; if (!lov(x, y)) continue; ut.push({ navn: o.e.navn, x, y, slag: 'tettsted', id: o.e.id, folk: o.e.folk || 0 }); }
    for (const o of INFRA.bru || []) { const nv = o.e && o.e.navn && String(o.e.navn).trim(); if (!nv || sett.has(nv) || !o.deler || !o.deler[0] || !o.deler[0].length) continue;
      const d = o.deler[0], m = d[Math.floor(d.length / 2)], x = o.midt3 ? o.midt3[0] : m[0], y = o.midt3 ? o.midt3[1] : m[1]; if (!lov(x, y)) continue;
      sett.add(nv); ut.push({ navn: /bru/i.test(nv) ? nv : nv + ' bru', x, y, slag: 'bru', id: o.e.id }); }
    STEDER = ut; stederAntall = n; return ut;
  }
  const dagNå = () => Math.floor((6 * 60 + tid) / 1440);
  function nyeTilbud(liste) { if (!S) return []; const n = SK.lagTilbud(S, ID, tid, liste || steder()); lagre(); return n; }

  // ---------- det som legges ut i verden når en kontrakt tas ----------
  const egneLag = () => ENHETER.filter(s => s.side === ID && levende(s) && !s.karakter);
  const fiender = () => ENHETER.filter(s => s.side !== ID && levende(s));
  const bilFor = k => (k.bil ? KJORETOY.find(q => q.navn === k.bil && q.side === ID) : null);
  const sperreFor = k => ENHETER.find(s => s.kontrakt === k.id && s.sperre);
  function lagSperre(k) {
    const p = k.sperre || k.sted, s = nyttLag(`Vegsperre ved ${k.sted.navn}`, p.x, p.y, 'rød');
    // (Claudes forslag) seks mann ved sperra, lett bevæpnet
    s.menn.length = 6; s.sperre = true; s.kontrakt = k.id; s.ingenAI = true;
    try { if (window.Strid && Strid.bevæpn) Strid.bevæpn(s, 'lett'); } catch (e) { /* uten stridsregler */ }
    ENHETER.push(s); return s;
  }
  function lagBil(k) {
    if (!window.Kjoretoy) return null; let nr = 1; while (KJORETOY.some(q => q.navn === `${k.last === 'tankbil' ? 'Tankbil' : 'Lastebil'} ${k.id}${nr > 1 ? '-' + nr : ''}`)) nr++;
    const navn = `${k.last === 'tankbil' ? 'Tankbil' : 'Lastebil'} ${k.id}${nr > 1 ? '-' + nr : ''}`;
    try { const b = Kjoretoy.ny({ navn, type: 'lastebil', antall: 1, x: k.fra.x, y: k.fra.y, side: ID }); b.kontrakt = k.id; KJORETOY.push(b); k.bil = navn; return b; } catch (e) { return null; }
  }
  function rydd(k) {
    for (let i = ENHETER.length - 1; i >= 0; i--) if (ENHETER[i].kontrakt === k.id && (ENHETER[i].sperre || ENHETER[i].angrepslag)) ENHETER.splice(i, 1);
    const b = bilFor(k); if (b) { const i = KJORETOY.indexOf(b); if (i >= 0) KJORETOY.splice(i, 1); }
    skitten = true;
  }

  // ---------- er kravet oppfylt? ----------
  // gir { i, tapt, hentet, andel } til Selskap.steg (se reglene)
  function vurder(k) {
    const N = SK.REGLER.nær, s = Sp(), L = s && s.leir;
    if (k.type === 'eskorte') { const b = bilFor(k); if (!b || !(b.antall >= 1)) return { tapt: true };
      const hele = Math.hypot(k.sted.x - k.fra.x, k.sted.y - k.fra.y) || 1, igjen = Math.hypot(k.sted.x - b.x, k.sted.y - b.y);
      return { i: igjen <= N.fram, andel: Math.max(0, Math.min(1, 1 - igjen / hele)), igjen }; }
    if (k.type === 'hold') { const lag = egneLag().filter(q => Math.hypot(q.x - k.sted.x, q.y - k.sted.y) <= N.hold), fi = fiender().some(q => Math.hypot(q.x - k.sted.x, q.y - k.sted.y) <= N.hold);
      return { i: lag.length > 0 && !fi, lag: lag.length, fiender: fi }; }
    if (k.type === 'rydd') { const sp = sperreFor(k); return { i: !sp || !levende(sp) }; }
    // hent: et eget lag henter personen ved stedet og tar vedkommende med hjem
    let bærer = k.bærer ? ENHETER.find(q => q.navn === k.bærer && q.side === ID) : null;
    if (k.hentet && (!bærer || !levende(bærer))) return { tapt: true };
    if (!k.hentet) { const her = egneLag().find(q => Math.hypot(q.x - k.sted.x, q.y - k.sted.y) <= N.hent); if (her) { k.bærer = her.navn; bærer = her;
      logg(`${her.navn} har med seg ${k.person}. Ta vedkommende med til leiren.`); return { hentet: true }; } return {}; }
    return { i: !!(L && bærer && Math.hypot(bærer.x - L.x, bærer.y - L.y) <= N.leir), hentet: true };
  }
  function klarTilLevering(k) { if (k.type === 'hold') return k.framdrift >= k.hold * 60; const v = vurder(k); return !!v.i; }

  // ---------- hendelsene fra reglene: penger, logg, ting som ryddes ----------
  function hendelser(ut) {
    for (const h of ut) {
      const k = h.k;
      if (h.type === 'levert') { if (window.OppstartSpill) OppstartSpill.gi(h.kr); logg(`Kontrakt levert: ${k.tittel}. ${k.giver.navn} betalte ${kr(h.kr)}.`); rydd(k);
        try { window.dispatchEvent(new CustomEvent('riksbrudd-kontrakt', { detail: { type: 'levert', id: k.id, kr: h.kr } })); } catch (e) { /* gammel nettleser */ } }
      else if (h.type === 'brutt') { const bot = Math.min(h.kr || 0, (Sp() && Sp().penger) || 0); if (bot > 0) OppstartSpill.betal(bot);
        const grunn = h.grunn === 'frist' ? 'fristen gikk ut' : h.grunn === 'tapt' ? (k.type === 'eskorte' ? 'bilen gikk tapt' : 'laget med personen ble slått ut') : 'dere avbrøt den';
        logg(`Kontrakt brutt (${grunn}): ${k.tittel}. Bot ${kr(bot)}.`); rydd(k); }
      else if (h.type === 'rivalFørst') { logg(`${navnFor(h.rival)} kom først: ${k.tittel}. Kontrakten er tapt, men uten bot.`); rydd(k); }
      else if (h.type === 'angrep') { const b = bilFor(k); if (b) { const v = Math.random() * Math.PI * 2, a = nyttLag(`${navnFor(h.rival)}, angrepslag`, b.x + Math.cos(v) * 700, b.y + Math.sin(v) * 700, h.rival);
        a.menn.length = 6; a.angrepslag = true; a.kontrakt = k.id; ENHETER.push(a); try { ordre(a, b.x, b.y, true); } catch (e) { /* uten ordre */ }
        logg(`${navnFor(h.rival)} angriper ${k.bil}! Beskytt bilen.`); } }
      else if (h.type === 'rivalTok') { /* stille: står i oversikten */ }
    }
    if (ut.length) { lagre(); skitten = true; }
  }

  // ---------- steget (KROKER.sim, dt i spillminutter) ----------
  let akk = 0;
  function steg(dt) {
    if (!klar || !S || gjest()) return; akk += dt; if (akk < 1) return; const d = akk; akk = 0;
    // en sperre for en aktiv rydd-kontrakt som ikke finnes etter omlasting, settes ut igjen (fiendens lag lagres ikke)
    for (const k of S.sider[ID].aktive) { if (k.type === 'rydd' && !k.slått && !sperreFor(k)) { if (k.sperreSatt) k.slått = true; else { lagSperre(k); k.sperreSatt = true; } }
      if (k.type === 'eskorte' && !bilFor(k) && !k.bilSatt) { lagBil(k); k.bilSatt = true; } }
    const mål = {}; for (const k of S.sider[ID].aktive) mål[k.id] = vurder(k);
    hendelser(SK.steg(S, ID, tid, d, mål));
    const dag = dagNå();
    if (dag !== S.dag && auto()) { S.dag = dag; hendelser(SK.dagSteg(S, tid)); const n = nyeTilbud(); if (n.length) logg(`Selskapet: ${n.length} nye kontrakttilbud. Se «Selskapet».`); }
    if (performance.now() - lagreTid > 20000) { lagreTid = performance.now(); lagre(); }
  }

  // ---------- handlingene ----------
  function ta(id) {
    if (!S) return { ok: false }; const r = SK.godta(S, ID, id, tid); if (!r.ok) { melding = r.grunn; tegn(true); return r; }
    const k = r.k; if (k.type === 'rydd') { lagSperre(k); k.sperreSatt = true; } if (k.type === 'eskorte') { lagBil(k); k.bilSatt = true; }
    logg(`Kontrakt tatt: ${k.tittel}. Frist om ${k.timer} timer.`); melding = ''; lagre(); skitten = true; tegn(true); return r;
  }
  function avslå(id) { if (!S) return false; const n = S.tilbud.length; S.tilbud = S.tilbud.filter(k => k.id !== id); lagre(); tegn(true); return S.tilbud.length < n; }
  // lever(id, tving): leverer straks når kravet er oppfylt (tving: bare for prøver)
  function lever(id, tving) {
    if (!S) return null; const k = S.sider[ID].aktive.find(q => q.id === id); if (!k) return null;
    if (!tving && !klarTilLevering(k)) { melding = 'Kravet er ikke oppfylt ennå: ' + SK.kravTekst(k); tegn(true); return null; }
    const h = SK.lever(S, ID, k, tid); hendelser([h]); tegn(true); return h;
  }
  function avbryt(id) { if (!S) return null; const h = SK.avbryt(S, ID, id, tid); if (h) hendelser([h]); tegn(true); return h; }
  function pris(p) { if (S && SK.settPris(S, ID, p)) { lagre(); tegn(true); } }
  const gåTil = (x, y) => { if (typeof på3d !== 'undefined' && på3d) slå3d(false); kam.x = x; kam.y = y; if (kam.m > 20) kam.m = 10; skitten = true; };

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#selskap{ display:none; position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); z-index:11; width:min(440px, calc(100vw - 20px)); max-height:calc(100% - var(--topp,58px) - 84px);
  overflow-y:auto; background:linear-gradient(180deg, #1d2125, #121417); color:#e9e4d6; border:1px solid #3a3f45; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.5); padding:12px 14px 14px; font-size:14px; }
#selskap.på{ display:block; } #selskap .lukk{ position:absolute; right:8px; top:8px; width:34px; height:30px; min-width:0; padding:0; font-size:18px; }
#selskap .hode{ display:flex; gap:12px; align-items:center; padding-right:36px; margin-bottom:8px; }
#selskap .hode h2{ margin:0; font-family:'Cormorant Garamond', serif; font-size:24px; line-height:1.05; font-weight:700; }
#selskap .kode{ font-family:ui-monospace, 'JetBrains Mono', Menlo, monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#d9a441; }
#selskap .motto{ font-family:'IM Fell English', serif; font-style:italic; color:#c8bfa9; font-size:14px; }
#selskap h3{ margin:12px 0 6px; font-size:11.5px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:#b48a3c; border-bottom:1px solid #2d3238; padding-bottom:3px; display:flex; justify-content:space-between; }
#selskap h3 small{ letter-spacing:.04em; text-transform:none; color:#8f8a7c; font-weight:400; }
#selskap .maal{ display:grid; grid-template-columns:86px 1fr 92px; gap:6px; align-items:center; margin:3px 0; }
#selskap .bar{ height:8px; border-radius:4px; background:#2a2f35; overflow:hidden; position:relative; } #selskap .bar i{ position:absolute; left:0; top:0; bottom:0; border-radius:4px; }
#selskap .maal span:last-child{ font-size:12.5px; color:#c8bfa9; text-align:right; }
#selskap .tall{ font-family:ui-monospace, 'JetBrains Mono', Menlo, monospace; font-variant-numeric:tabular-nums; }
#selskap button{ background:#1d2125; border:1px solid #454b52; color:#e9e4d6; border-radius:5px; cursor:pointer; } #selskap button:hover{ filter:brightness(1.2); }
#selskap .valg{ display:flex; gap:4px; margin:4px 0; } #selskap .valg button{ flex:1; min-width:0; } #selskap .valg button.på{ background:#3b3220; border-color:#d9a441; color:#f2d68a; }
#selskap .kort{ border:1px solid #31363c; border-left:3px solid #d9a441; border-radius:6px; padding:8px 10px; margin:6px 0; background:rgba(255,255,255,.025); }
#selskap .kort.aktiv{ border-left-color:#3f6fb0; } #selskap .kort.klar{ border-left-color:#7c9a4e; background:rgba(124,154,78,.08); }
#selskap .kort b{ font-family:'Cormorant Garamond', serif; font-size:17px; font-weight:700; display:block; line-height:1.15; }
#selskap .kort .fra{ font-size:12px; color:#8f8a7c; margin:1px 0 4px; } #selskap .kort p{ margin:3px 0; font-size:13px; line-height:1.35; color:#d8d1bf; }
#selskap .rad{ display:flex; flex-wrap:wrap; gap:4px 12px; font-size:12.5px; color:#c8bfa9; margin:4px 0; } #selskap .rad .kr{ color:#f2d68a; } #selskap .rad .bot{ color:#e7a593; }
#selskap .knapper{ display:flex; gap:5px; margin-top:6px; flex-wrap:wrap; } #selskap .knapper button{ min-height:32px; padding:0 12px; }
#selskap button.hoved{ background:#3b3220; border-color:#d9a441; color:#f2d68a; } #selskap button.fare{ border-color:#8a4a3a; color:#e7b3a3; background:#2a1a16; }
#selskap .smerke{ flex:none; display:block; } #selskap .rival .smerke{ width:40px; height:40px; } #selskap .hode .smerke{ width:58px; height:58px; }
#selskap .rival{ display:flex; gap:10px; align-items:flex-start; margin:6px 0; } #selskap .rival b{ font-family:'Cormorant Garamond', serif; font-size:16px; }
#selskap .tom{ color:#8f8a7c; font-style:italic; font-size:13px; } #selskap .melding{ color:#f2c48a; font-size:13px; margin:6px 0; }
#selskap .fram{ height:5px; background:#2a2f35; border-radius:3px; overflow:hidden; margin:4px 0; } #selskap .fram i{ display:block; height:100%; background:#3f6fb0; }
body.kort #selskap{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(8px + env(safe-area-inset-right,0px)); width:auto; top:calc(var(--topp,44px) + 4px); bottom:calc(6px + env(safe-area-inset-bottom,0px)); max-height:none; }
@media (max-width:420px){ #selskap .maal{ grid-template-columns:76px 1fr 80px; } #selskap .hode h2{ font-size:21px; } }`;
  document.head.appendChild(css);
  const panel = document.createElement('div'); panel.id = 'selskap'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Selskapet'); document.body.appendChild(panel);

  const FARGE = { pålitelig: '#7c9a4e', hardhendt: '#b0443a', billig: '#d9a441' }, NAVN = { pålitelig: 'Pålitelig', hardhendt: 'Hardhendt', billig: 'Billig' };
  const måler = (k, v) => `<div class="maal" data-rykte="${k}"><span>${NAVN[k]}</span><div class="bar" title="${Math.round(v)} av 100"><i style="width:${Math.round(v)}%;background:${FARGE[k]}"></i></div><span>${esc(SK.ord(k, v))}</span></div>`;
  const typeNavn = k => SK.REGLER.TYPER[k.type].navn;
  function avstand(k) { const s = Sp(); if (!s || !s.leir) return ''; return meter(Math.hypot(k.sted.x - s.leir.x, k.sted.y - s.leir.y)) + ' fra leiren'; }
  function tilbudKort(k) {
    const igjen = Math.max(0, k.utløper - tid), går = igjen >= 60 ? `${Math.round(igjen / 60)} t` : `${Math.round(igjen)} min`;
    return `<div class="kort" data-kontrakt="${k.id}"><b>${esc(k.tittel)}</b><div class="fra">${esc(typeNavn(k))} · ${esc(k.giver.navn)} · ${esc(avstand(k))}</div><p>${esc(SK.kravTekst(k))}</p>`
      + `<div class="rad"><span>Betaling <span class="kr tall">${kr(k.betaling)}</span></span><span>Bot ved brudd <span class="bot tall">${kr(k.bot)}</span></span><span>Frist <span class="tall">${k.timer} t</span> etter at dere tar den</span></div>`
      + (k.konkurrent ? `<div class="rad"><span>${esc(navnFor(k.konkurrent))} vil også ha den – vær raske.</span></div>` : '')
      + `<div class="rad"><span>Tilbudet står i ${går} til.</span></div><div class="knapper"><button class="hoved" data-s="ta" data-id="${k.id}">Ta kontrakten</button><button data-s="avslå" data-id="${k.id}">Avslå</button><button data-s="vis" data-id="${k.id}">Vis i kartet</button></div></div>`;
  }
  function aktivKort(k) {
    const klarNå = klarTilLevering(k), v = vurder(k); let status = '', andel = 0;
    if (k.type === 'hold') { andel = k.framdrift / (k.hold * 60); status = `Holdt ${Math.floor(k.framdrift / 60)} t ${Math.round(k.framdrift % 60)} min av ${k.hold} t` + (v.fiender ? ' – fiender ved stedet, tida står' : v.lag ? ' – laget holder stedet' : ' – ingen lag der ennå'); }
    else if (k.type === 'eskorte') { andel = v.andel || 0; status = v.tapt ? 'Bilen er borte.' : `${esc(k.bil || 'Bilen')}: ${meter(v.igjen || 0)} igjen. Velg bilen i kartet og gi den ordre.`; }
    else if (k.type === 'rydd') { status = v.i ? 'Sperra er slått ut.' : 'Sperra står. Send et lag.'; andel = v.i ? 1 : 0; }
    else { status = k.hentet ? `${esc(k.bærer || 'Laget')} har ${esc(k.person)} med seg – til leiren.` : `${esc(k.person)} venter ved ${esc(k.sted.navn)}.`; andel = k.hentet ? (v.i ? 1 : .5) : 0; }
    return `<div class="kort aktiv${klarNå ? ' klar' : ''}" data-kontrakt="${k.id}"><b>${esc(k.tittel)}</b><div class="fra">${esc(typeNavn(k))} · ${esc(k.giver.navn)} · <span class="tall">${esc(SK.fristTekst(k, tid))}</span></div>`
      + `<p>${status}</p><div class="fram"><i style="width:${Math.round(Math.max(0, Math.min(1, andel)) * 100)}%"></i></div>`
      + `<div class="rad"><span>Betaling <span class="kr tall">${kr(k.betaling)}</span></span><span>Bot <span class="bot tall">${kr(k.bot)}</span></span></div>`
      + `<div class="knapper">${klarNå ? `<button class="hoved" data-s="lever" data-id="${k.id}">Lever</button>` : ''}<button data-s="vis" data-id="${k.id}">Vis i kartet</button><button class="fare" data-s="avbryt" data-id="${k.id}">Avbryt (bot)</button></div></div>`;
  }
  function html() {
    if (!S) return `<button class="lukk" data-s="lukk" aria-label="Lukk">×</button><p class="tom">Selskapet kommer når leiren er lagt.</p>`;
    const sd = S.sider[ID], r = sd.rykte, sum = sd.sum;
    let h = `<button class="lukk" data-s="lukk" aria-label="Lukk">×</button><div class="hode">${egetMerke(58)}<div><div class="kode">Privat militærselskap · blå</div><h2>${esc(egetNavn())}</h2><div class="motto">${esc(SK.rykteTekst(r))}</div></div></div>`;
    h += `<h3>Rykte <small>styrer hvilke tilbud som kommer</small></h3>${måler('pålitelig', r.pålitelig)}${måler('hardhendt', r.hardhendt)}${måler('billig', r.billig)}`;
    h += `<h3>Pris <small>høy pris gir mer betaling, men færre bygder vil ha dere</small></h3><div class="valg">${Object.entries(SK.REGLER.pris).map(([id, p]) => `<button data-s="pris" data-id="${id}" class="${sd.pris === id ? 'på' : ''}">${p.navn} <span class="tall">×${String(p.faktor).replace('.', ',')}</span></button>`).join('')}</div>`;
    h += `<div class="rad"><span>Levert <span class="tall">${sum.levert}</span></span><span>Brutt <span class="tall">${sum.brutt}</span></span><span>Tjent <span class="kr tall">${kr(sum.tjent)}</span></span><span>Bøter <span class="bot tall">${kr(sum.bøter)}</span></span></div>`;
    if (melding) h += `<div class="melding">${esc(melding)}</div>`;
    h += `<h3>Aktive kontrakter <small>${sd.aktive.length} av ${SK.REGLER.maksAktive}</small></h3>` + (sd.aktive.length ? sd.aktive.map(aktivKort).join('') : `<p class="tom">Ingen ennå. Ta et tilbud under.</p>`);
    h += `<h3>Ledige tilbud <small>nye hver morgen</small></h3>` + (S.tilbud.length ? S.tilbud.map(tilbudKort).join('') : `<p class="tom">Ingen tilbud nå${steder().length ? '' : ' – kartet har ingen tettsteder eller bruer innen rekkevidde'}.</p>`);
    h += `<h3>De andre selskapene</h3>` + Object.keys(RIVALER).map(s => { const R = RIVALER[s], q = S.sider[s], fr = window.Fraksjoner && Fraksjoner.FRAKSJONER[s];
      const iKart = fr && fr.navn && fr.navn !== R.navn ? ` <span class="kode" style="letter-spacing:.04em">i kartet: ${esc(fr.navn)}</span>` : '';
      return `<div class="rival" data-rival="${s}">${rivalMerke(s, 40)}<div><b>${esc(R.navn)}</b>${iKart}<div class="motto">${esc(R.motto)}</div><p style="margin:2px 0;font-size:13px;color:#d8d1bf">${esc(R.omtale)}</p><div class="rad"><span>${esc(SK.rykteTekst(q.rykte).replace('dere er', 'de er'))}</span><span>Kontrakter <span class="tall">${q.sum.levert}</span></span></div></div></div>`; }).join('');
    const fer = sd.ferdige.slice(0, 3); if (fer.length) h += `<h3>Siste kontrakter</h3>` + fer.map(k => `<div class="rad"><span>${k.status === 'levert' ? '✓' : '✗'} ${esc(k.tittel)}</span><span class="${k.status === 'levert' ? 'kr' : 'bot'} tall">${k.status === 'levert' ? kr(k.betaling) : k.status === 'tapt' ? 'tapt' : '−' + kr(k.bot)}</span></div>`).join('');
    return h;
  }
  function tegn(tving) {
    if (!åpen) return; sistTegn = performance.now(); if (!tving && window.pekerNede && pekerNede(panel)) return;
    const h = html(); if (h === sistHtml && !tving) return; sistHtml = h; const rull = panel.scrollTop; panel.innerHTML = h; panel.scrollTop = rull;
  }
  panel.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; e.stopPropagation(); const id = b.dataset.id, s = b.dataset.s;
    if (s === 'lukk') vis(false); else if (s === 'ta') ta(id); else if (s === 'avslå') avslå(id); else if (s === 'lever') lever(id); else if (s === 'avbryt') avbryt(id); else if (s === 'pris') pris(id);
    else if (s === 'vis') { const k = S && (S.tilbud.find(q => q.id === id) || S.sider[ID].aktive.find(q => q.id === id)); if (k) { const p = k.type === 'rydd' && k.sperre ? k.sperre : k.type === 'eskorte' && bilFor(k) ? bilFor(k) : k.sted; gåTil(p.x, p.y); } } });
  function vis(på) {
    åpen = på === undefined ? !åpen : !!på; panel.classList.toggle('på', åpen);
    if (åpen) { if (S && !S.tilbud.length && !S.sider[ID].aktive.length) { nyeTilbud(); if (S.dag < 0) S.dag = dagNå(); } if (window.lukkPanel) try { lukkPanel(); } catch (e) { /* */ } melding = ''; tegn(true); }
  }
  setInterval(() => { if (åpen && performance.now() - sistTegn > 900) tegn(false); }, 1000);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) vis(false); });

  // ---------- kartet: stedene i kontraktene ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!S || !klar) return; const m = kam.m, P = (x, y) => [(x - vx0) / m, (vy1 - y) / m];
    g.save(); g.font = '600 12px "Cormorant Garamond", serif'; g.textAlign = 'center';
    for (const k of S.sider[ID].aktive) {
      const [x, y] = P(k.sted.x, k.sted.y), r = k.type === 'hold' ? Math.max(8, SK.REGLER.nær.hold / m) : 9;
      g.strokeStyle = '#d9a441'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#d9a441'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(18,20,23,.85)'; const t = `Kontrakt: ${typeNavn(k)}`, w = g.measureText(t).width + 10; g.fillRect(x - w / 2, y - r - 20, w, 16); g.fillStyle = '#f2d68a'; g.fillText(t, x, y - r - 8);
      if (k.type === 'eskorte' && k.fra) { const [fx, fy] = P(k.fra.x, k.fra.y); g.strokeStyle = 'rgba(217,164,65,.6)'; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(fx, fy); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
      if (k.type === 'hent' && !k.hentet) { g.fillStyle = '#f2efe4'; g.beginPath(); g.arc(x + 12, y - 4, 3, 0, 7); g.fill(); g.fillRect(x + 10, y, 4, 8); }
      if (k.type === 'rydd' && k.sperre) { const [sx, sy] = P(k.sperre.x, k.sperre.y); g.strokeStyle = '#b0443a'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx - 7, sy - 7); g.lineTo(sx + 7, sy + 7); g.moveTo(sx + 7, sy - 7); g.lineTo(sx - 7, sy + 7); g.stroke(); }
    }
    g.restore();
  });
  KROKER.sim.push(dt => { try { steg(dt); } catch (e) { console.error('selskap', e); } });
  // sprengte bruer, kraftverk og dammer gjør selskapet mer hardhendt (spill/odeleggelse-visning.js kaller KROKER.ødelagt)
  if (KROKER.ødelagt) KROKER.ødelagt.push((o, hva) => { if (S && hva === 'ødelegg') { SK.hardhendt(S, ID, SK.REGLER.sprengt); lagre(); } });

  // ---------- inngangene ----------
  (window.KOMMANDO_TILLEGG = window.KOMMANDO_TILLEGG || []).push({ k: 'selskap', navn: 'Selskapet', tast: '', tittel: 'Selskapet: rykte, kontrakter og de andre selskapene',
    ikon: "<path d='M12 3l7 2.5V11c0 4.5-3 8-7 10-4-2-7-5.5-7-10V5.5z'/><path d='M9 12l2 2 4-4'/>",
    fins: () => klar && !!S, på: () => åpen, trykk: () => vis(),
    merke: () => { if (!S) return ''; const n = S.sider[ID].aktive.filter(klarTilLevering).length; return n || ''; } });
  const meny = document.getElementById('lagmeny');
  if (meny) { const b = document.createElement('button'); b.id = 'vis-selskap'; b.textContent = 'Selskapet'; b.onclick = () => { vis(true); const m = document.getElementById('lagmeny'); if (m) m.classList.remove('på'); }; meny.appendChild(b); }
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => { if (!S) return; const sd = S.sider[ID];
    hode.appendChild(el('h3', { 'data-fane': 'mål' }, 'Selskapet'));
    hode.appendChild(el('div', { klasse: 'igang' }, `${sd.aktive.length} aktive kontrakter, ${S.tilbud.length} ledige tilbud. ${SK.rykteTekst(sd.rykte)}`));
    hode.appendChild(knapp('Åpne «Selskapet»', () => vis(true), { id: 'selskapknapp' })); });

  // ---------- start ----------
  function start() {
    const s = Sp(); if (!s || !s.leir) return; const id = Math.round(s.leir.x) + ',' + Math.round(s.leir.y);
    if (klar && id === leirId) return; leirId = id;
    S = les(s.leir) || SK.ny(s.leir, {}); settNavn(); klar = true; sistHtml = ''; if (åpen) tegn(true);
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  Object.assign(api, { start, vis, erÅpen: () => åpen, tilstand: () => S, sett: d => { S = SK.fraJSON(d) || S; settNavn(); tegn(true); }, ta, avslå, lever, avbryt, pris, nyeTilbud, steder,
    vurder, klar: klarTilLevering, steg: dt => { akk = 0; steg(Math.max(1, dt)); }, lagre, NØKKEL, RIVALER, merke: (side, px) => (side === ID ? egetMerke(px || 40) : rivalMerke(side, px || 40)) });
  window.SelskapSpill = api;
})();
