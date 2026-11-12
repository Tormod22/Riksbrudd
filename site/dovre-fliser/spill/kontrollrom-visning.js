'use strict';
// K3 – kontrollrommet (regler: spill/kontrollrom.js). Karakteren din er en figur på kartet («Kari (deg)»), som går dit du sender den
// eller der du går selv i førsteperson. Står du ved et ferdig kontrollrom med strøm, kan du «Gå inn»: da får du kontrollrom-skjermen
// (radio til venstre, feeds til høyre, kartet i midten) og ser lagene med radiokontakt der de er. Ute ser du lagene der de sist meldte
// seg, og med nettbrett der de er (men fiender bare meldt). Radioen: håndradio/feltradio, leirens radio (mast eller ikke) og terrenget.
// Kroker: KROKER.innsyn/skjul/kanOrdre (index.html), KROKER.sim, KROKER.tegn, KROKER.lagKnapper/lagTekst, KROKER.ramme3d.
// Lagres i nettleseren («riksbrudd-k3»): karakterens plass, nettbrettet og hvilke lag som har feltradio.
(function () {
  const K = Kontrollrom, R = K.REGLER, NØKKEL = 'riksbrudd-k3';
  let T = null, deg = null, inne = false, av = false, feed = null, akk = 0, kontaktAkk = 99, radiolog = [];
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const aktiv = () => !av && !!spill() && !!deg;
  const les = () => { try { return JSON.parse(localStorage.getItem(NØKKEL)) || null; } catch (e) { return null; } };
  const lagre = () => { if (!T || !deg) return; T.karakter = { x: Math.round(deg.x), y: Math.round(deg.y) }; T.inne = inne; try { localStorage.setItem(NØKKEL, JSON.stringify(T)); } catch (e) { /* privat vindu */ } };
  const info = new Map();   // lag -> { kontakt, meldt: { x, y, tid }, før, sist: {} }
  const lagInfo = s => { if (!info.has(s)) info.set(s, { kontakt: false, meldt: null, før: null, sist: {} }); return info.get(s); };

  // ---------- hvor du er ----------
  const kontrollrom = () => { const L = window.LeirSpill && LeirSpill.tilstand(); return L ? L.bygg.filter(b => b.type === 'kontrollrom' && Leir.virker(b)) : []; };
  const harStrøm = b => !(window.LeirSpill && LeirSpill.siste().mangler.has(b.id));
  const vedKontrollrom = () => deg && kontrollrom().find(b => Math.hypot(b.x - deg.x, b.y - deg.y) <= R.inne + 12);
  const inneMedStrøm = () => { if (!inne) return false; const b = vedKontrollrom(); return !!b && harStrøm(b); };
  const modus = () => (aktiv() ? K.modus(inneMedStrøm(), T.nettbrett) : null);
  const nær = s => deg && Math.hypot(s.x - deg.x, s.y - deg.y) <= R.nær;
  const syn = s => K.innsyn(modus(), { karakter: s.karakter, nær: nær(s), kontakt: lagInfo(s).kontakt });
  KROKER.innsyn.push(s => !aktiv() || syn(s).fiender);
  KROKER.skjul.push(s => aktiv() && s.side === 'blå' && !s.karakter && !syn(s).live);
  KROKER.kanOrdre.push(s => { if (!aktiv() || s.karakter || nær(s) || lagInfo(s).kontakt) return true;
    logg(`${s.navn}: ingen radiokontakt – ordren når ikke fram.`); return false; });

  // ---------- radioen ----------
  // rekkevidden til den beste radiomasten med strøm (0 uten)
  function mast() { const L = window.LeirSpill && LeirSpill.tilstand(); return L ? L.bygg.filter(b => b.type === 'radiomast' && Leir.virker(b) && harStrøm(b)).reduce((m, b) => Math.max(m, Leir.effekt(b).rekkevidde), 0) : 0; }
  const høyde = (v, x, y) => { const [i, j] = Terreng.rute(v, x, y); const h = v.H[Math.max(0, Math.min(v.h - 1, j)) * v.w + Math.max(0, Math.min(v.w - 1, i))]; return h === h ? h : 0; };
  // Kontakt mellom laget og leiren: rekkevidden etter radioene, kortere når terrenget står i veien (profil i 128 m-ruter)
  async function sjekkKontakt(s) {
    const S = spill(), I = lagInfo(s), L = S.leir, d = Math.hypot(s.x - L.x, s.y - L.y), m = mast(), r = K.rekkevidde(s.radio || 'hånd', m);
    let k = d <= r;
    if (k && d > 1200) { try {
      const v = await lagVindu([Math.min(s.x, L.x) - 300, Math.min(s.y, L.y) - 300, Math.max(s.x, L.x) + 300, Math.max(s.y, L.y) + 300], false, 7), n = 24, P = [];
      for (let i = 0; i <= n; i++) P.push(høyde(v, s.x + (L.x - s.x) * i / n, s.y + (L.y - s.y) * i / n));
      k = K.kontakt(d, r, K.blokkert(P, P[0] + R.antenne, P[n] + (m ? R.mastHøyde : 4), d));
    } catch (e) { /* uten terrengdata: bare avstanden */ } }
    if (I.kontakt && !k) radio(s, 'Kontakten er brutt.', true);
    if (!I.kontakt && k && I.før) radio(s, 'Kontakt igjen.', true);
    I.kontakt = k; I.rekkevidde = r;
  }
  function radio(s, tekst, fraLeiren) {
    const m = { tid, fra: s.navn, tekst, leir: !!fraLeiren }; radiolog.unshift(m); radiolog.length = Math.min(radiolog.length, 60);
    // høres i kontrollrommet, på nettbrettet, og ute når du er innen håndradioens rekkevidde av leiren
    const S = spill(), hører = modus() !== 'ute' || (deg && Math.hypot(deg.x - S.leir.x, deg.y - S.leir.y) <= K.RADIO.hånd.meter);
    if (hører) logg(`📻 ${s.navn}: ${tekst}`);
    if (inne) visRadio();
  }
  function rapport(s, t) {
    const I = lagInfo(s), ute = s.menn.filter(q => q.hp < 1).length;
    const fiender = ENHETER.filter(e => e.side !== 'blå' && levende(e) && ser(s, e.x, e.y)).map(e => ({ id: ENHETER.indexOf(e), navn: e.navn, x: e.x, y: e.y, e }));
    const nå = { marsj: !!s.sti, ute, underIld: SKUDD.some(k => k.b === s), fiender, sted: K.retning(spill().leir, s) + ' for leiren' };
    const før = I.før || { marsj: nå.marsj, ute };
    const tekster = K.meldinger(s, før, nå, I.sist, t); I.før = nå;
    for (const f of fiender) f.e.sett = { x: f.x, y: f.y, tid };   // det som meldes, står på kartet som «sist sett»
    if (tekster.length || !I.meldt) I.meldt = { x: s.x, y: s.y, tid };
    for (const x of tekster) radio(s, x);
  }
  KROKER.sim.push(dt => {
    if (!aktiv()) return; const t = tid;
    akk += dt; kontaktAkk += dt;
    if (kontaktAkk >= 3) { kontaktAkk = 0; for (const s of ENHETER) if (s.side === 'blå' && !s.karakter && levende(s)) sjekkKontakt(s); }
    if (akk >= 1) { akk = 0;
      for (const s of ENHETER) if (s.side === 'blå' && !s.karakter && levende(s) && lagInfo(s).kontakt) rapport(s, t);
      const L = spill().leir, iLeiren = Math.hypot(deg.x - L.x, deg.y - L.y) <= R.nettbrett.ladeAvstand, ls = window.LeirSpill && LeirSpill.siste();
      K.batteri(T.nettbrett, 1, iLeiren, !!ls && ls.prod > 0);
      if (inne && !inneMedStrøm() && !T.mørkMeldt) { T.mørkMeldt = true; logg('Kontrollrommet er mørkt: ingen strøm.'); } else if (inneMedStrøm()) T.mørkMeldt = false;
      visStatus(); if (inne) visSkjerm(); skitten = true;
      if (Math.floor(t) % 5 === 0) lagre(); }
  });

  // ---------- kartet: egne lag «sist meldt» ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!aktiv()) return;
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || !levende(s) || syn(s).live) continue; const I = lagInfo(s), p = I.meldt; if (!p) continue;
      const [x, y] = tilSkjerm(p.x, p.y, vx0, vy1); if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue;
      g.save(); g.globalAlpha = .75; g.fillStyle = sidefarge('blå', 'farge'); g.strokeStyle = '#e7dcc3'; g.setLineDash([3, 2]); g.lineWidth = 1.3;
      g.beginPath(); g.rect(x - 11, y - 8, 22, 16); g.fill(); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)';
      const t = `${s.navn} · ${I.kontakt ? 'meldt' : 'ingen kontakt, sist'} ${klokkeslett(p.tid)}`; g.strokeText(t, x, y - 13); g.fillStyle = '#e7dcc3'; g.fillText(t, x, y - 13); g.restore(); }
    if (deg) { const [x, y] = tilSkjerm(deg.x, deg.y, vx0, vy1); g.save(); g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 14, 0, 6.283); g.stroke(); g.restore(); }
  });

  // ---------- lagpanelet ----------
  KROKER.lagTekst.push(s => { if (!aktiv() || s.side !== 'blå') return null; if (s.karakter) return 'deg · ' + { kontrollrom: 'i kontrollrommet', nettbrett: `nettbrett ${(+T.nettbrett.batteri).toFixed(1).replace('.', ',')} t`, ute: 'ute' }[modus()];
    const I = lagInfo(s); return `${K.RADIO[s.radio || 'hånd'].navn.toLowerCase()} · ${I.kontakt ? 'radiokontakt' : 'ingen radiokontakt'}`; });
  KROKER.lagKnapper.push((s, H) => {
    if (!aktiv()) return;
    if (s.karakter) {
      const b = vedKontrollrom(); if (b) H.appendChild(knapp(inne ? 'Gå ut av kontrollrommet' : 'Gå inn i kontrollrommet', inne, () => (inne ? gåUt() : gåInn())));
      if (!T.nettbrett.har) H.appendChild(knapp(`Kjøp nettbrett (${Oppstart.kroner(R.nettbrett.pris)})`, false, () => { if (!OppstartSpill.betal(R.nettbrett.pris)) { logg('Ikke nok penger.'); return; } T.nettbrett = { har: true, batteri: R.nettbrett.timer }; lagre(); logg('Du har kjøpt et nettbrett: lagene med radiokontakt vises der de er, også når du er ute.'); visPanel(); visStatus(); }));
      return; }
    if ((s.radio || 'hånd') === 'hånd') H.appendChild(knapp(`Kjøp feltradio (${Oppstart.kroner(K.RADIO.felt.pris)})`, false, () => {
      if (!OppstartSpill.betal(K.RADIO.felt.pris)) { logg('Ikke nok penger.'); return; } s.radio = 'felt'; T.radio[s.navn] = 'felt'; lagre(); kontaktAkk = 99; logg(`${s.navn} har fått feltradio (15 km).`); visPanel(); }));
  });

  // ---------- kontrollrom-skjermen ----------
  const css = document.createElement('style');
  css.textContent = `#kontrollrom{ position:fixed; inset:0; z-index:7; display:none; pointer-events:none; }
#kontrollrom.på{ display:block; }
#kontrollrom .glass{ position:absolute; inset:0; background:radial-gradient(ellipse at center, rgba(40,90,50,.06) 40%, rgba(5,12,6,.55) 100%),
  repeating-linear-gradient(0deg, rgba(0,0,0,.08) 0 1px, transparent 1px 3px); }
#kontrollrom .topp{ position:absolute; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 6px); pointer-events:auto; background:#0e130d; border:1px solid #3c5a35;
  color:#9fd88f; font:600 14px/1 ui-monospace,Menlo,Consolas,monospace; letter-spacing:.08em; padding:8px 12px; display:flex; gap:10px; align-items:center; }
#kontrollrom .topp button{ background:#1b2a18; border:1px solid #3c5a35; color:#c9f0bc; min-height:34px; padding:2px 10px; cursor:pointer; font:inherit; letter-spacing:0; }
#kontrollrom .side{ position:absolute; top:calc(var(--topp,58px) + 56px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); width:min(300px, 40vw); pointer-events:auto;
  background:rgba(10,16,10,.9); border:1px solid #3c5a35; color:#a9e29a; font:13px/1.4 ui-monospace,Menlo,Consolas,monospace; display:flex; flex-direction:column; }
#kontrollrom .side h3{ margin:0; padding:8px 10px; border-bottom:1px solid #3c5a35; font-size:13px; letter-spacing:.12em; color:#c9f0bc; }
#kontrollrom .side .innhold{ overflow:auto; padding:6px 10px; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; touch-action:pan-y; }
#kontrollrom .venstre{ left:10px; } #kontrollrom .høyre{ right:64px; }
#kontrollrom .topp{ white-space:nowrap; max-width:calc(100vw - 20px); box-sizing:border-box; } #kontrollrom .topp span{ overflow:hidden; text-overflow:ellipsis; min-width:0; }
#kontrollrom .melding{ margin-bottom:6px; } #kontrollrom .melding b{ color:#e6f7c8; font-weight:600; } #kontrollrom .melding.leir{ color:#7fae73; }
#kontrollrom .feed{ display:flex; justify-content:space-between; align-items:center; gap:6px; padding:5px 0; border-bottom:1px solid #22341f; }
#kontrollrom .feed button{ background:#1b2a18; border:1px solid #3c5a35; color:#c9f0bc; min-height:34px; padding:2px 10px; cursor:pointer; font:inherit; }
#kontrollrom .feed button:disabled{ opacity:.4; cursor:default; }
#kontrollrom.mørk .glass{ background:rgba(2,3,2,.92); }
body.kort #kontrollrom .side{ width:min(250px, 30vw); bottom:calc(8px + env(safe-area-inset-bottom,0px)); } body.kort #kontrollrom .høyre{ right:calc(52px + env(safe-area-inset-right,0px)); }
body.kort #kontrollrom .venstre{ left:calc(8px + env(safe-area-inset-left,0px)); }
body.kort #kontrollrom .topp{ font-size:12px; letter-spacing:.03em; padding:5px 8px; gap:6px; } body.kort #kontrollrom .topp button{ min-height:28px; }
@media (max-width:700px){ #kontrollrom .side, body.kort #kontrollrom .side{ top:auto; height:34vh; width:calc(50vw - 15px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); }
  body.kort #kontrollrom .høyre{ right:10px; } body.kort.ikontrollrom .ctl{ bottom:calc(34vh + 68px + env(safe-area-inset-bottom,0px)); } }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const skjerm = el('div', { id: 'kontrollrom', 'aria-label': 'Kontrollrommet' }), glass = el('div', { klasse: 'glass' }), topp = el('div', { klasse: 'topp' });
  const venstre = el('div', { klasse: 'side venstre' }, el('h3', {}, 'RADIO'), el('div', { klasse: 'innhold' })), høyre = el('div', { klasse: 'side høyre' }, el('h3', {}, 'FEEDS'), el('div', { klasse: 'innhold' }));
  skjerm.append(glass, topp, venstre, høyre); document.body.appendChild(skjerm);
  const kNapp = el('button', { id: 'kontrollknapp', title: 'Kontrollrommet' }, 'Kontrollrom'); kNapp.hidden = true;
  document.querySelector('.knapper').insertBefore(kNapp, document.getElementById('meny'));
  kNapp.onclick = () => (inne ? gåUt() : gåInn());
  const st = el('div', {}, el('span', {}, 'du er'), ' ', el('b', { id: 'sHvor' }, '–')); st.hidden = true; document.querySelector('.stats').appendChild(st);
  function visStatus() {
    st.hidden = !aktiv(); document.body.classList.toggle('ikontrollrom', !st.hidden && inne); if (st.hidden) { kNapp.hidden = true; return; }
    const m = modus(); document.getElementById('sHvor').textContent = m === 'kontrollrom' ? 'i kontrollrommet' : m === 'nettbrett' ? `ute, nettbrett ${Math.round(T.nettbrett.batteri)} t` : inne ? 'i mørkt kontrollrom' : 'ute';
    kNapp.hidden = !vedKontrollrom() && !inne; kNapp.classList.toggle('på', inne);
  }
  // radio og feeds tegnes på nytt hvert spillminutt: behold plassen du har bladd til
  function visRadio() { const I = venstre.querySelector('.innhold'), rulle = I.scrollTop; I.innerHTML = '';
    for (const m of radiolog.slice(0, 40)) I.appendChild(el('div', { klasse: 'melding' + (m.leir ? ' leir' : '') }, `${klokkeslett(m.tid)} `, el('b', {}, m.fra), `: ${m.tekst}`));
    if (!radiolog.length) I.appendChild(el('div', {}, 'Ingen meldinger ennå.')); I.scrollTop = rulle; }
  function visFeeds() { const I = høyre.querySelector('.innhold'), rulle = I.scrollTop; I.innerHTML = '';
    for (const s of ENHETER) { if (s.side !== 'blå' || !levende(s)) continue; const k = s.karakter || lagInfo(s).kontakt;
      const b = el('button', {}, feed === s ? 'Lukk' : 'Se'); b.disabled = !k; b.onclick = () => (feed === s ? lukkFeed() : åpneFeed(s));
      I.appendChild(el('div', { klasse: 'feed' }, el('span', {}, `${s.navn}${k ? '' : ' (ingen kontakt)'}`), b)); } I.scrollTop = rulle; }
  function visSkjerm() {
    const mørk = inne && !inneMedStrøm(); skjerm.classList.toggle('mørk', mørk); topp.innerHTML = '';
    topp.append(el('span', {}, mørk ? 'KONTROLLROM · INGEN STRØM' : `KONTROLLROM · ${spill().fraksjon.navn.toUpperCase()}${feed ? ' · FEED: ' + feed.navn.toUpperCase() : ''}`));
    if (feed) { const b = el('button', {}, 'Tilbake til kartet'); b.onclick = lukkFeed; topp.appendChild(b); }
    const ut = el('button', {}, 'Gå ut'); ut.onclick = gåUt; topp.appendChild(ut);
    venstre.style.display = høyre.style.display = mørk ? 'none' : ''; if (!mørk) { visRadio(); visFeeds(); }
  }
  function gåInn() {
    const b = vedKontrollrom(); if (!b) { logg('Du må stå ved et ferdig kontrollrom.'); return false; }
    inne = true; deg.x = b.x; deg.y = b.y; deg.sti = null; skjerm.classList.add('på'); visSkjerm(); visStatus(); lagre(); kontaktAkk = 99; skitten = true;
    if (!harStrøm(b)) logg('Kontrollrommet har ikke strøm: skjermene er mørke.'); return true;
  }
  function gåUt() { if (feed) lukkFeed(); inne = false; skjerm.classList.remove('på'); visStatus(); lagre(); skitten = true; }
  // Feed: 3D-bildet der laget står (førsteperson ved laget)
  async function åpneFeed(s) {
    feed = s; visSkjerm(); kam.x = s.x; kam.y = s.y; kam.m = 300 / (VH * 1.1);
    if (!på3d) await slå3d(true); else await nytt3dUtsnitt(s.x, s.y, utsnittS(300));
    if (feed !== s || !window.Gange) return; valgt = s; if (R3.fot) Gange.stopp(); Gange.start(); visSkjerm();
  }
  function lukkFeed() { feed = null; if (window.Gange && typeof R3 !== 'undefined' && R3 && R3.fot) Gange.stopp(); if (på3d) slå3d(false); visSkjerm(); }
  // går du selv (førsteperson) med deg selv valgt, flytter figuren din seg med deg
  KROKER.ramme3d.push(R3x => { if (!aktiv() || feed || !R3x.fot || valgt !== deg || !R3x.ut) return; deg.x = R3x.ut.cx + R3x.bane.x; deg.y = R3x.ut.cy + R3x.bane.y; });

  // ---------- start ----------
  function start() {
    const S = spill(); if (!S) return;
    T = les() || {}; T.nettbrett = T.nettbrett || { har: false, batteri: 0 }; T.radio = T.radio || {};
    deg = ENHETER.find(s => s.karakter);
    if (!deg) { const p = T.karakter || { x: S.leir.x + 12, y: S.leir.y - 12 };
      deg = nyttLag(S.karakter.navn + ' (deg)', p.x, p.y, 'blå'); deg.menn = deg.menn.slice(0, 1); deg.menn[0].navn = S.karakter.navn; deg.karakter = true; ENHETER.push(deg); }
    for (const s of ENHETER) if (s.side === 'blå' && T.radio[s.navn]) s.radio = T.radio[s.navn];
    inne = !!T.inne && !!vedKontrollrom(); skjerm.classList.toggle('på', inne); if (inne) visSkjerm();
    kontaktAkk = 99; visStatus(); skitten = true;
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  window.KontrollromSpill = { start, gåInn, gåUt, åpneFeed, lukkFeed, modus, deg: () => deg, info: lagInfo, radiolog: () => radiolog, sjekkKontakt, rapport,
    av: v => { av = v !== false; skitten = true; }, lagre, NØKKEL };
})();
