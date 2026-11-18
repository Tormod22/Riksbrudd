'use strict';
/* Riksbrudd – KRIGSKARTET (17. nov, brukeren: «vi må få frem strategielementet mye bedre»). Reglene: spill/strategi.js.
 * Knappen «Krig» (tast T) viser hele området krigen står om: tettstedene som merker i eierens farge med området de rår over,
 * frontene mellom sidene, lagene dine med ordrene sine – og et panel med STILLINGEN (hvor stor del av folket hver side holder,
 * og streken for seier), NESTE TREKK (de tre beste målene er også nummerert i kartet, med «Send» som gir nærmeste ledige lag ordre),
 * TRUSLENE mot det du holder, og LAGENE dine. Trykk på et tettsted i krigskartet for å se det og sende et lag dit.
 * Zoomet ut ser du fargene også utenom krigskartet. Statuslinja viser andelen din hele tiden. Seier ved 60 % – og taper du løpet,
 * får du vite det. window.StrategiSpill. I testene (navigator.webdriver) kommer ikke kortene av seg selv (StrategiSpill.test).
 */
(function () {
  const S = window.Strategi, G = window.Garnison; if (!S || !G) return;
  const NØKKEL = 'riksbrudd-strategi', auto = () => !navigator.webdriver || api.test;
  let åpen = false, valgtBy = null, førKam = null, byer = [], byNøkkel = '', sist = '', meldt = { leir: '', vunnet: false, tapt: false, fare: {} };
  // panelet skjult til en stripe (huskes i denne nettleseren; bare en bekvemmelighet)
  let inne = false; try { inne = localStorage.getItem('riksbrudd-krigpanel') === 'inn'; } catch (e) { inne = false; }
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = fn; return b; };
  // TILLEGG (18. nov, runde 4 – pakke «sjø»/økonomi): andre moduler legger linjer i panelet uten å endre denne fila.
  // window.KRIG_TILLEGG = { by: [(tettsted, eier) => tekst | element], trekk: [(tettsted, eier) => …], side: [side => …] }
  // – by: boksen for det valgte tettstedet, trekk: radene i «Neste trekk», side: under hver side i stillingen. tettsted = INFRA-objektet.
  const KT = window.KRIG_TILLEGG = window.KRIG_TILLEGG || {}; for (const k of ['by', 'trekk', 'side']) KT[k] = KT[k] || [];
  const tillegg = (hvor, ...a) => { const ut = []; for (const f of KT[hvor]) { try { const r = f(...a); if (r) ut.push(typeof r === 'string' ? el('small', { klasse: 'tillegg' }, r) : r); } catch (e) { /* tillegget er valgfritt */ } } return ut; };
  const tall = v => Math.round(v).toLocaleString('nb-NO'), km = v => (v < 10 ? String(Math.round(v * 10) / 10).replace('.', ',') : String(Math.round(v))) + ' km';
  const fraksjon = side => (window.Fraksjoner && Fraksjoner.FRAKSJONER[side]) || { navn: side, eieform: side };
  const navn = side => (side === 'blå' ? 'Du' : fraksjon(side).navn);
  const leir = () => { const T = window.OppstartSpill && OppstartSpill.tilstand(); if (T && T.leir) return T.leir; const b = window.OLJE && OLJE.BASER[0]; if (b) return { x: b.x, y: b.y }; const s = ENHETER.find(e => e.side === 'blå'); return s ? { x: s.x, y: s.y } : null; };
  const eierAv = id => G.tilstand(TETTSTEDER, id).eier;
  const punkt = by => { let p = null; try { if (typeof navnP === 'function') p = navnP(by); } catch (e) { p = null; } return p && isFinite(p[0]) ? [p[0], p[1]] : [(by.bb[0] + by.bb[2]) / 2, (by.bb[1] + by.bb[3]) / 2]; };
  function område() { const L = leir(), alle = typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted; if (!L || !alle) return [];
    const id = Math.round(L.x) + ',' + Math.round(L.y); if (meldt.leir !== id) les(id);
    const k = id + ',' + alle.length + (window.SPILLOMRÅDE ? 'o' : '') + ',' + (meldt.nivå || 0); if (k === byNøkkel) return byer; byNøkkel = k;
    byer = S.område(L, alle.map(by => { const [x, y] = punkt(by); return { id: by.e.id, navn: by.e.navn, x, y, folk: by.e.folk || 0, ref: by }; }).filter(b => !window.OMRÅDE_OK || OMRÅDE_OK(b.x, b.y)), regionRegler()); return byer; }
  // STØRRE REGION (natt 18. nov): hver seier du velger «større region» etter, ganger radien med 1,6 og krever seks tettsteder til (Claudes forslag, spill/scenario.js)
  function regionRegler() { const n = meldt.nivå || 0, SR = (window.Scenario && Scenario.REGLER) || { regionFaktor: 1.6, regionMinst: 6 }; return n ? { ...S.REGLER, radius: S.REGLER.radius * SR.regionFaktor ** n, minst: S.REGLER.minst + SR.regionMinst * n, maksRadius: S.REGLER.maksRadius * SR.regionFaktor ** n } : S.REGLER; }
  const egneLag = () => ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e));
  const fiender = () => ENHETER.filter(e => e.side !== 'blå' && levende(e) && synlig(e)).map(e => ({ x: e.x, y: e.y, navn: e.navn, side: e.side, styrke: window.Fraksjoner ? Fraksjoner.styrke(e) : 8 }));
  const garnison = id => { const b = byer.find(q => q.id === id); return b ? G.lagI(b.ref, egneLag()).length : 0; };
  const iBy = s => byer.find(b => G.inni(b.ref, s.x, s.y));
  // lagene som kan sendes: uten ordre, og ikke eneste garnison i et eget tettsted (det skal holdes)
  function ledige() { return egneLag().filter(s => !s.sti && !s.planlegger).map(s => { const b = iBy(s); return { x: s.x, y: s.y, navn: s.navn, lag: s, holder: !!(b && eierAv(b.id) === 'blå' && G.lagI(b.ref, egneLag()).length === 1) }; }); }
  function bilde() { const B = område(); if (!B.length) return null; const st = S.stilling(B, eierAv), led = ledige(), fri = led.filter(l => !l.holder), fi = fiender();
    return { byer: B, st, ut: S.utfall(st), trekk: S.trekk('blå', B, eierAv, fri.length ? fri : led, fi), trusler: S.trusler('blå', B, eierAv, garnison, fi), fronter: S.fronter(B, eierAv), fiender: fi, ledige: led }; }

  // ---------- ordre ----------
  function send(by, lag) { const T = bilde(); if (!T) return false; const t = T.trekk.find(q => q.by.id === by.id);
    const s = lag || (t && t.lag && t.lag.lag); if (!s) { logg('Ingen ledige lag å sende. Lag som marsjerer, må komme fram først.'); return false; }
    if (Math.hypot(s.x - by.x, s.y - by.y) > S.REGLER.marsj) { logg(`${by.navn} ligger over ${S.REGLER.marsj / 1000} km fra ${s.navn}. Ta et tettsted på vegen først.`); return false; }
    if (!KROKER.kanOrdre.every(f => f(s))) return false;
    ordre(s, by.x, by.y); logg(`${s.navn} sendes mot ${by.navn}` + (t && t.forsvar > 0 ? ' – tettstedet er forsvart.' : '.')); valgtBy = by; vis(true); skitten = true; return true; }

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#krig{ position:fixed; left:10px; top:calc(var(--topp,58px) + 56px); z-index:11; display:none; width:min(350px,94vw); max-height:calc(100vh - var(--topp,58px) - 130px); overflow:auto; padding:10px 12px 12px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#krig.på{ display:block; } #krig h2{ margin:0 26px 2px 0; font-size:19px; } #krig h3{ margin:12px 0 3px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); }
#krig .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
#krig .maal{ color:var(--ink-dim,#a99); font-size:13px; margin-bottom:6px; } #krig .maal b{ color:var(--ink,#e7dcc3); }
#krig .side{ margin:5px 0; } #krig .side .n{ display:flex; justify-content:space-between; gap:8px; font-size:13.5px; } #krig .side .n small{ color:var(--ink-dim,#a99); }
#krig .stolpe{ position:relative; height:11px; background:#2e281e; margin-top:2px; } #krig .stolpe i{ display:block; height:100%; } #krig .stolpe u{ position:absolute; top:-2px; bottom:-2px; width:2px; background:#e7dcc3; opacity:.8; }
#krig .rad{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:5px 0; border-bottom:1px solid #2e281e; } #krig .rad small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; } #krig .rad .nr{ display:inline-block; width:19px; height:19px; line-height:19px; margin-right:6px; border-radius:50%; background:#c9b26a; color:#1c170f; text-align:center; font-size:12.5px; font-weight:700; }
#krig .rad.fare b{ color:#e8a46a; } #krig .by{ border:1px solid #c9b26a; padding:7px 9px; margin:6px 0 2px; background:#221c12; } #krig .by .kn{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
#krig button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:34px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; } #krig button.hoved{ border-color:#c9b26a; } #krig button:disabled{ opacity:.45; }
#krig .tips{ margin-top:10px; color:var(--ink-dim,#a99); font-size:12.5px; } #krig small.tillegg{ display:block; margin-top:3px; color:#d9c48a; font-size:12.5px; line-height:1.3; }
body.smal #krig, body.kort #krig{ left:0; right:0; top:auto; bottom:0; width:auto; max-height:44vh; border-width:1px 0 0; }
#krigkort{ position:fixed; inset:0; z-index:40; display:none; align-items:center; justify-content:center; background:rgba(10,8,5,.72); } #krigkort.på{ display:flex; }
#krigkort div{ width:min(430px,90vw); padding:18px 20px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); text-align:center; } #krigkort h2{ margin:0 0 8px; font-size:26px; } #krigkort p{ margin:0 0 14px; }
#krigkort > div{ max-height:90vh; overflow:auto; } #krigkort .valg{ width:auto; padding:0; border:0; background:none; margin:8px 0; } #krigkort .valg small{ display:block; margin-top:2px; color:var(--ink-dim,#a99); font-size:12.5px; } #krigkort .valg button{ min-width:210px; }
#krigkort button{ background:#2a2318; border:1px solid #c9b26a; color:inherit; min-height:40px; padding:4px 18px; font:inherit; cursor:pointer; }
#sKrigBoks{ cursor:pointer; }
/* TELEFON (19. nov, runde 5 – «krigskartet er trangt i liggende format», 844 × 390): panelet kan skjules til en stripe («Skjul»), er
   smalere og tettere liggende, og det valgte tettstedet står øverst. Kartet passes inn i den frie delen ved siden av panelet og knappene. */
#krig .hode{ display:flex; align-items:center; gap:8px; margin-right:30px; } #krig .hode h2{ flex:1; margin-right:0; } #krig .hode .skjul{ min-height:30px; padding:0 10px; font-size:13px; }
#krig .stripe{ display:none; }
#krig.inn > :not(.stripe):not(.lukk){ display:none; }
#krig.inn{ overflow:visible; padding:5px 46px 5px 10px; }
#krig.inn .stripe{ display:flex; align-items:center; flex-wrap:wrap; gap:4px 10px; font-size:14px; }
#krig .stripe .du{ color:var(--ink-dim,#a99); } #krig .stripe .du b{ color:var(--ink,#e7dcc3); } #krig .stripe .vb{ color:#f0c878; }
body.kort.tlfligg #krig.inn{ bottom:auto; width:auto; max-width:min(560px, 72vw); }
body.kort:not(.tlfligg) #krig.inn{ max-height:none; }
body.kort.tlfligg #krig:not(.inn){ width:min(330px, 40vw); padding:6px 10px 10px; }
body.kort #krig:not(.inn){ display:none; } body.kort #krig.på:not(.inn){ display:flex; flex-direction:column; }
body.kort #krig > *{ flex:none; } body.kort #krig > .by{ order:-1; margin-top:2px; } body.kort #krig > .hode{ order:-2; }
body.kort #krig h2{ font-size:17px; } body.kort #krig .maal{ font-size:12.5px; margin-bottom:3px; }
body.kort #krig .side{ margin:2px 0; } body.kort #krig .side .n{ font-size:13px; } body.kort #krig .stolpe{ height:7px; }
body.kort.tlfligg #krig:not(.inn) .side{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; } body.kort.tlfligg #krig .side .n{ flex:0 0 64%; } body.kort.tlfligg #krig .side .stolpe{ flex:1; margin-top:0; } body.kort.tlfligg #krig .side small.tillegg{ flex:0 0 100%; }
body.kort #krig .by .kn button{ min-height:30px; padding:0 9px; } body.kort #krig .by{ padding:6px 8px; }
body.kort #krig h3{ margin:8px 0 2px; } body.kort #krig .rad{ padding:3px 0; } body.kort #krig small, body.kort #krig .tips, body.kort #krig small.tillegg{ font-size:12.5px; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'krig', role: 'dialog', 'aria-label': 'Krigskartet' }); document.body.appendChild(panel);
  const kort = el('div', { id: 'krigkort', role: 'alertdialog' }); document.body.appendChild(kort);
  const kn = knapp('Krig', () => (åpen ? lukk() : åpne()), { id: 'krigknapp', title: 'Krigskartet: hvem holder hva, fronter og neste trekk (T)', 'aria-pressed': 'false' }); kn.hidden = true;
  const rad = document.querySelector('.knapper'); if (rad) rad.insertBefore(kn, document.getElementById('meny'));
  const stat = el('div', { id: 'sKrigBoks', title: 'Din andel av folket i området. Trykk for krigskartet.' }, el('b', { id: 'sKrig' }, '–'), ' ', el('span', {}, 'kontroll')); stat.hidden = true; stat.onclick = () => åpne();
  const stats = document.querySelector('.stats'); if (stats) stats.appendChild(stat);

  function statusTekst(s) { const b = iBy(s); if (s.planlegger) return 'planlegger rute'; if (s.sti) { const m = s.sti[s.sti.length - 1], mål = byer.find(q => G.inni(q.ref, m[0], m[1])); return 'marsjerer' + (mål ? ' mot ' + mål.navn : ''); }
    if (b) { const t = G.tilstand(TETTSTEDER, b.id); return t.eier === 'blå' ? 'garnison i ' + b.navn : t.inntar && t.inntar.side === 'blå' ? `tar ${b.navn} (${Math.round(100 * t.inntar.sek / G.REGLER.innta)} %)` : 'i ' + b.navn; } return 'ledig'; }
  function bygg(T) { const f = document.createDocumentFragment(), R = S.REGLER, st = T.st, L0 = leir();
    f.append(knapp('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk krigskartet' }), el('div', { klasse: 'hode' }, el('h2', {}, 'Krigskartet'), knapp('Skjul', () => skjul(true), { klasse: 'skjul', title: 'Skjul panelet så du ser hele kartet' })));
    // stripa når panelet er skjult: andelen din, og det valgte tettstedet med den viktigste knappen
    { const st0 = el('div', { klasse: 'stripe' }, el('b', {}, 'Krig'), el('span', { klasse: 'du' }, 'du har ', el('b', {}, S.prosent(st.sider.blå.andel) + ' %'), ` (seier ${S.prosent(R.seier)} %)`));
      if (valgtBy) { const b = valgtBy, e = eierAv(b.id), t = T.trekk.find(q => q.by.id === b.id);
        st0.append(el('span', { klasse: 'vb' }, b.navn), el('small', {}, e === 'blå' ? 'ditt' : e ? fraksjon(e).eieform : 'nøytralt'));
        if (e !== 'blå' && t && t.lag && t.innen) st0.append(knapp(`Send ${t.lag.navn}`, () => send(b), { klasse: 'hoved' })); }
      st0.append(knapp('Vis mer', () => skjul(false), { title: 'Vis hele panelet' })); f.append(st0); }
    f.append(el('div', { klasse: 'maal' }, 'Mål: hold ', el('b', {}, S.prosent(R.seier) + ' %'), ` av folket i de ${st.byer} tettstedene i området (${Math.round(T.byer.radius / 1000)} km rundt leiren). Du har `, el('b', {}, S.prosent(st.sider.blå.andel) + ' %'), '.'));
    for (const side of ['blå', 'rød', 'grønn']) { const m = st.sider[side]; if (!m) continue;
      f.append(el('div', { klasse: 'side', 'data-side': side }, el('div', { klasse: 'n' }, el('b', {}, side === 'blå' ? fraksjon('blå').navn + ' (du)' : fraksjon(side).navn), el('small', {}, `${m.byer} tettsted${m.byer === 1 ? '' : 'er'} · ${S.prosent(m.andel)} %`)),
        el('div', { klasse: 'stolpe' }, el('i', { style: `width:${Math.min(100, m.andel * 100)}%; background:${sidefarge(side, 'lys')}` }), el('u', { style: `left:${R.seier * 100}%` })), ...tillegg('side', side))); }
    f.append(el('div', { klasse: 'side' }, el('div', { klasse: 'n' }, el('span', {}, 'Ingen (nøytralt)'), el('small', {}, `${st.nøytral.byer} tettsted${st.nøytral.byer === 1 ? '' : 'er'} · ${S.prosent(st.nøytral.andel)} %`))));
    // valgt tettsted
    if (valgtBy) { const b = valgtBy, e = eierAv(b.id), t = T.trekk.find(q => q.by.id === b.id), g = garnison(b.id), strøm = true, olje = G.rate(b.folk, G.REGLER.produksjon, strøm), fs = G.rate(b.folk, G.REGLER.forsterkning, strøm);
      const boks = el('div', { klasse: 'by' }, el('b', {}, b.navn), el('small', {}, ` ${tall(b.folk)} innbyggere · ${e === 'blå' ? 'ditt' : e ? fraksjon(e).eieform : 'nøytralt'}`),
        el('div', {}, e === 'blå' ? (g ? `Garnison: ${g} lag.` : 'Ingen garnison – et fiendtlig lag kan ta det.') : `Gir ${nf.format(Math.round(olje * 10) / 10)} t olje i timen og ${nf.format(Math.round(fs * 10) / 10)} mann i timen til garnisonen.` + (t && t.forsvar > 0 ? ' Fienden er sett her.' : '')));
      boks.append(...tillegg('by', b.ref, e));
      const k = el('div', { klasse: 'kn' });
      if (e !== 'blå' && t) k.append(knapp(t.lag ? `Send ${t.lag.navn} (${km(t.km)})` : 'Ingen ledige lag', () => send(b), Object.assign({ klasse: 'hoved', 'data-send': b.id }, t.lag && t.innen ? {} : { disabled: '' })));
      if (e === 'blå' && !g) { const l = T.ledige.filter(q => !q.holder).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0]; if (l) k.append(knapp(`Send ${l.navn} som garnison`, () => send(b, l.lag), { klasse: 'hoved' })); }
      k.append(knapp('Gå dit i kartet', () => { kam.x = b.x; kam.y = b.y; kam.m = Math.min(kam.m, 12); skitten = true; }), knapp('Fjern valget', () => { valgtBy = null; vis(true); skitten = true; }));
      boks.append(k); f.append(boks); }
    // neste trekk
    f.append(el('h3', {}, 'Neste trekk'));
    const topp = T.trekk.slice(0, 4); if (!topp.length) f.append(el('div', { klasse: 'tips' }, 'Du holder alle tettstedene i området.'));
    topp.forEach((t, i) => f.append(el('div', { klasse: 'rad', 'data-trekk': t.by.id }, el('div', {}, i < 3 ? el('span', { klasse: 'nr' }, String(i + 1)) : '', el('b', {}, t.by.navn),
      el('small', {}, `${t.eier ? fraksjon(t.eier).eieform : 'nøytralt'}${t.forsvar > 0 ? ', forsvart' : ''} · ${tall(t.by.folk)} innb.` + (t.lag ? ` · ${km(t.km)} fra ${t.lag.navn}` : '')), ...tillegg('trekk', t.by.ref, t.eier)),
      knapp(t.lag && t.innen ? 'Send' : t.lag ? 'For langt' : 'Ingen lag', () => send(t.by), Object.assign({ 'data-send': t.by.id }, t.lag && t.innen ? { klasse: 'hoved' } : { disabled: '' })))));
    // trusler
    if (T.trusler.length) { f.append(el('h3', {}, 'Trusler'));
      for (const t of T.trusler.slice(0, 4)) f.append(el('div', { klasse: 'rad fare' }, el('div', {}, el('b', {}, t.by.navn), el('small', {}, (t.fiende ? `${t.fiende.navn} ${km(t.km)} unna` : '') + (t.fiende && !t.garnison ? ' · ' : '') + (t.garnison ? '' : 'ingen garnison'))),
        knapp('Vis', () => { valgtBy = t.by; kam.x = t.by.x; kam.y = t.by.y; vis(true); skitten = true; }))); }
    // venner (spill/spillet-visning.js): leiren og stillingen de delte – ikke sanntid
    const venner = (window.SpilletSpill && SpilletSpill.venner ? SpilletSpill.venner() : []).filter(v => Math.hypot(v.x - L0.x, v.y - L0.y) < (T.byer.radius || R.radius) * 1.5);
    if (venner.length) { f.append(el('h3', {}, 'Venner i området'));
      for (const v of venner) f.append(el('div', { klasse: 'rad', 'data-venn': v.navn }, el('div', {}, el('b', {}, v.navn), el('small', {}, v.stilling ? `holdt ${v.stilling.byer.length} tettsteder og ${v.stilling.andel} % på dag ${v.stilling.dag} – slik det var da koden ble laget, ikke sanntid` : 'leiren står i kartet (ingen stilling i koden)')),
        knapp('Vis', () => { kam.x = v.x; kam.y = v.y; skitten = true; }))); }
    // lagene
    f.append(el('h3', {}, 'Lagene dine'));
    const lag = egneLag(); if (!lag.length) f.append(el('div', { klasse: 'tips' }, 'Du har ingen lag. Tettsteder du holder, og basen, gir nye.'));
    for (const s of lag) f.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, s.navn), el('small', {}, `${s.menn.filter(m => m.hp >= 1).length} av ${s.menn.length} friske · ${statusTekst(s)}`)),
      knapp('Velg', () => { valgt = s; kam.x = s.x; kam.y = s.y; visPanel(); skitten = true; })));
    f.append(el('div', { klasse: 'tips' }, `Et lag som står ${G.REGLER.innta / 60} minutter i et tettsted uten fiender, tar det. La et lag stå igjen som garnison. Fargene i kartet viser hvem som rår hvor; stiplede streker er fronter. Trykk på et tettsted for å sende et lag dit. En marsj tar timer – sett farten til 60× eller 600× mens lagene går.`));
    return f; }
  function vis(tving) { if (!åpen) return; const T = bilde(); if (!T) { panel.replaceChildren(knapp('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk krigskartet' }), el('h2', {}, 'Krigskartet'), el('div', { klasse: 'tips' }, 'Kartdataene for tettstedene er ikke lastet ennå. Prøv igjen om litt.')); sist = ''; return; }
    if (!tving && window.pekerNede && pekerNede(panel)) return;
    const ny = el('div'); ny.append(bygg(T)); if (!tving && ny.innerHTML === sist) return; sist = ny.innerHTML; const topp = panel.scrollTop; panel.replaceChildren(...ny.childNodes); panel.scrollTop = topp; }
  function åpne() { const L = leir(); if (!L) return; if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function') slå3d(false);
    if (window.lukkPanel) lukkPanel(); åpen = true; panel.classList.add('på'); document.body.classList.add('krig'); kn.classList.add('på'); kn.setAttribute('aria-pressed', 'true');
    førKam = { x: kam.x, y: kam.y, m: kam.m }; const kl = document.body.classList;
    // liggende telefon (telefon.js, body.tlfligg): panelet er et sidepanel til venstre med full høyde, som på PC
    const ligg = kl.contains('kort') && innerWidth > innerHeight * 1.2, smal = !ligg && (kl.contains('smal') || kl.contains('kort'));
    kam.x = L.x; const rr = område().radius || S.REGLER.radius, pb = ligg ? Math.max(0, panel.getBoundingClientRect().right + 4) : smal ? 0 : Math.min(370, VW * .4);
    // hele området skal være synlig i det frie feltet: til høyre for panelet på PC og liggende telefon, over panelet på stående telefon
    kam.m = smal ? rr * 2.3 / Math.max(200, Math.min(VW, VH * .5)) : ligg ? rr * 2.3 / Math.max(150, Math.min(VW - pb - 10, VH - 60)) : rr * 2.3 / Math.max(200, Math.min(VW - pb, VH - 120));
    kam.x = L.x - pb / 2 * kam.m; kam.y = L.y - (smal ? VH * .2 * kam.m : ligg ? -22 * kam.m : -20 * kam.m); panel.classList.toggle('inn', inne); sist = ''; vis(true);
    if (kl.contains('kort')) passInn(); skitten = true; }
  // TELEFON (19. nov): hele området inn i den frie delen av skjermen – ved siden av eller over panelet, under statuslinja og knappene
  // øverst, og til venstre for knappesøyla (.ctl). Regnes etter at panelet er tegnet (stående er høyden avhengig av innholdet).
  function friDel() { const r = e => (e && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed') && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect() : null), p = panel.getBoundingClientRect();
    let x0 = 0, x1 = VW, y0 = 0, y1 = VH; const ligg = document.body.classList.contains('tlfligg');
    for (const id of ['.stats', '.knapper']) { const b = r(document.querySelector(id)); if (b && b.width && b.top < VH * .3) y0 = Math.max(y0, b.bottom + 4); }
    const c = r(document.querySelector('.ctl')); if (c && c.width && c.left > VW * .6) x1 = Math.min(x1, c.left - 4);
    if (p.width) { if (ligg && p.left < VW * .3 && p.height > VH * .5) x0 = Math.max(x0, p.right + 4); else if (p.top > VH * .3) y1 = Math.min(y1, p.top - 4); else y0 = Math.max(y0, p.bottom + 4); }
    return { x0, x1, y0, y1 }; }
  function passInn() { const L = leir(); if (!L) return; const rr = område().radius || S.REGLER.radius, f = friDel(), w = Math.max(120, f.x1 - f.x0), h = Math.max(120, f.y1 - f.y0);
    kam.m = rr * 2.3 / Math.min(w, h); kam.x = L.x - ((f.x0 + f.x1) / 2 - VW / 2) * kam.m; kam.y = L.y + ((f.y0 + f.y1) / 2 - VH / 2) * kam.m; skitten = true; return f; }
  // Skjul/vis panelet (stripa). Kartet flyttes så området fortsatt står i den frie delen.
  function skjul(ja) { inne = !!ja; try { localStorage.setItem('riksbrudd-krigpanel', inne ? 'inn' : 'ut'); } catch (e) { /* uten lagring */ }
    panel.classList.toggle('inn', inne); sist = ''; vis(true); if (document.body.classList.contains('kort')) passInn(); else skitten = true; }
  let snuTid = 0; window.addEventListener('resize', () => { if (!åpen || !document.body.classList.contains('kort')) return; clearTimeout(snuTid); snuTid = setTimeout(() => { if (åpen) passInn(); }, 350); });
  function lukk() { if (!åpen) return; åpen = false; valgtBy = null; panel.classList.remove('på'); document.body.classList.remove('krig'); kn.classList.remove('på'); kn.setAttribute('aria-pressed', 'false');
    if (førKam) { kam.x = førKam.x; kam.y = førKam.y; kam.m = førKam.m; førKam = null; } skitten = true; }
  window.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape' && åpen) { lukk(); return; } if ((e.key === 't' || e.key === 'T') && !kn.hidden && !(typeof R3 !== 'undefined' && R3 && R3.fot)) { const st = document.getElementById('oppstart'); if (st && st.classList.contains('på')) return; kn.click(); } });

  // trykk i krigskartet: et tettsted velges (merket er lite, så treffet er romslig)
  KROKER.trykk.unshift((X, Y) => { if (!åpen) return false; let best = null, bd = Math.max(18 * kam.m, 300); for (const b of område()) { const d = Math.hypot(b.x - X, b.y - Y); if (d < bd) { bd = d; best = b; } }
    if (!best) return false; valgtBy = best; vis(true); skitten = true; return true; });

  // ---------- kartet ----------
  const tegn = (g, vx0, vy1) => { const m = kam.m, ute = m >= 18; if (!åpen && !ute) return; const B = område(); if (!B.length) return;
    const sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, inn = (x, y, r) => x > -r && y > -r && x < VW + r && y < VH + r; g.save();
    if (åpen) { g.fillStyle = 'rgba(12,10,6,.3)'; g.fillRect(0, 0, VW, VH); }
    // området hver side rår over
    for (const b of B) { const e = eierAv(b.id); if (!e) continue; const x = sx(b.x), y = sy(b.y), r = S.rekkevidde(b.folk) / m; if (r < 4 || !inn(x, y, r)) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, r), c = sidefarge(e, 'lys'); g.globalAlpha = åpen ? .62 : .4; gr.addColorStop(0, c); gr.addColorStop(.7, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      g.globalAlpha = åpen ? .8 : .5; g.strokeStyle = sidefarge(e, 'sti'); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * .82, 0, 6.283); g.stroke(); }
    g.globalAlpha = 1;
    if (åpen) { const L = leir(); if (L) { g.strokeStyle = 'rgba(231,220,195,.55)'; g.lineWidth = 1.5; g.setLineDash([10, 8]); g.beginPath(); g.arc(sx(L.x), sy(L.y), (B.radius || S.REGLER.radius) / m, 0, 6.283); g.stroke(); g.setLineDash([]); } }
    // frontene
    for (const f of S.fronter(B, eierAv)) { const ax = sx(f.a.x), ay = sy(f.a.y), bx = sx(f.b.x), by = sy(f.b.y), mx = (ax + bx) / 2, my = (ay + by) / 2; if (!inn(mx, my, 400)) continue;
      g.strokeStyle = f.egen ? 'rgba(240,200,120,.95)' : 'rgba(231,220,195,.6)'; g.lineWidth = f.egen ? 2.5 : 1.5; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(mx - 5, my - 5); g.lineTo(mx + 5, my + 5); g.moveTo(mx + 5, my - 5); g.lineTo(mx - 5, my + 5); g.stroke(); }
    // egne lags ordre
    if (åpen) for (const s of egneLag()) { const x = sx(s.x), y = sy(s.y); if (s.sti) { const e = s.sti[s.sti.length - 1]; g.strokeStyle = sidefarge('blå', 'sti'); g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(x, y); g.lineTo(sx(e[0]), sy(e[1])); g.stroke(); g.setLineDash([]); }
      g.fillStyle = sidefarge('blå', 'lys'); g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.5; g.beginPath(); g.rect(x - 5, y - 4, 10, 8); g.fill(); g.stroke(); }
    // tettstedene som merker
    const T = åpen ? bilde() : null, topp = T ? T.trekk.slice(0, 3).map(t => t.by.id) : [];
    g.font = '600 13px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    B.forEach((b, i) => { const e = eierAv(b.id); if (!åpen && !e) return; const x = sx(b.x), y = sy(b.y); if (!inn(x, y, 30)) return; const r = Math.max(4, Math.min(13, 3 + Math.sqrt(b.folk) / 14));
      // det felles merkesettet (spill/merker.js, 18. nov): ditt = rektangel, motstanderens = rute på spissen, uten eier = kvadrat
      if (window.Merker) Merker.tegn(g, x, y, { forhold: e ? Merker.forhold(e) : 'nøytral', slag: 'tettsted', farge: e ? sidefarge(e, 'farge') : 'rgba(52,45,34,.92)', r: r + 2 });
      else { g.fillStyle = e ? sidefarge(e, 'farge') : 'rgba(52,45,34,.92)'; g.strokeStyle = '#e7dcc3'; g.lineWidth = e ? 2 : 1.2; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.stroke(); }
      if (valgtBy && valgtBy.id === b.id) { g.strokeStyle = '#f0c878'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r + 5, 0, 6.283); g.stroke(); }
      const nr = topp.indexOf(b.id); if (nr >= 0) { g.fillStyle = '#c9b26a'; g.beginPath(); g.arc(x + r + 5, y - r - 5, 8, 0, 6.283); g.fill(); g.fillStyle = '#1c170f'; g.font = '700 12px Georgia, serif'; g.textBaseline = 'middle'; g.fillText(String(nr + 1), x + r + 5, y - r - 4.5); g.font = '600 13px "Cormorant Garamond", Georgia, serif'; g.textBaseline = 'top'; }
      if (åpen && (i < 14 || e || nr >= 0 || m < 40)) { g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)'; g.strokeText(b.navn, x, y + r + 2); g.fillStyle = '#e7dcc3'; g.fillText(b.navn, x, y + r + 2); } });
    // fiender du vet om
    if (åpen && T) for (const f of T.fiender) { const x = sx(f.x), y = sy(f.y); g.fillStyle = sidefarge(f.side, 'lys'); g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fill(); g.stroke(); }
    g.restore(); };
  KROKER.tegn.push(tegn);

  // ---------- jevnlig: statuslinja, panelet, seier og fare ----------
  function les(id) { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); meldt = d && d.leir === id ? d : { leir: id, vunnet: false, tapt: false, fare: {} }; } catch (e) { meldt = { leir: id, vunnet: false, tapt: false, fare: {} }; } }
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify(meldt)); } catch (e) { /* fullt eller sperret */ } };
  // valg = [[tekst, funksjon, forklaring] …]: knapper på kortet (seieren fører til noe: større region eller sterkere motstander)
  function visKort(tittel, tekst, valg) { const d = el('div', {}, el('h2', {}, tittel), el('p', {}, tekst)); if (valg && valg.length) { for (const [t, fn, forkl] of valg) { const b = knapp(t, () => { kort.classList.remove('på'); if (fn) fn(); }, { 'data-valg': t }); d.append(el('div', { klasse: 'valg' }, b, forkl ? el('small', {}, forkl) : '')); } } else d.append(knapp('Fortsett', () => kort.classList.remove('på'))); kort.replaceChildren(d); kort.classList.add('på'); if (typeof tempo !== 'undefined' && document.getElementById('sp0') && tempo > 0) document.getElementById('sp0').click(); }
  function takt() { const T = bilde(); kn.hidden = stat.hidden = !T; if (!T) return; const L = leir(), id = Math.round(L.x) + ',' + Math.round(L.y); if (meldt.leir !== id) les(id);
    if (L && meldt.leir !== id) les(id);
    const a = T.st.sider.blå.andel; document.getElementById('sKrig').textContent = S.prosent(a) + ' %' + (T.ut.fare.length ? ' ⚠' : '');
    vis(false); if (!auto()) return; const R = S.REGLER;
    for (const s of T.ut.fare) if (!meldt.fare[s]) { meldt.fare[s] = true; lagre(); logg(`${fraksjon(s).navn} holder nå ${S.prosent(T.st.sider[s].andel)} % av folket i området – de vinner ved ${S.prosent(R.seier)} %. Åpne krigskartet (Krig).`); }
    for (const s of Object.keys(meldt.fare)) if (!T.ut.fare.includes(s) && T.st.sider[s] && T.st.sider[s].andel < R.fare - .05) { delete meldt.fare[s]; lagre(); }
    if (T.ut.vinner === 'blå' && !meldt.vunnet) { meldt.vunnet = true; meldt.seire = (meldt.seire || 0) + 1; lagre(); seierKort(a); }
    else if (T.ut.vinner && T.ut.vinner !== 'blå' && !meldt.tapt) { meldt.tapt = true; lagre(); visKort(`${fraksjon(T.ut.vinner).navn} har overtaket`, `De holder ${S.prosent(T.st.sider[T.ut.vinner].andel)} % av folket i området. Ta tettsteder tilbake for å snu krigen.`); }
    else if (T.ut.vinner !== 'blå' && meldt.vunnet && a < R.seier - .08) { meldt.vunnet = false; lagre(); } }
  // SEIEREN FØRER TIL NOE (natt 18. nov): fortsett som nå, ta en større region (flere tettsteder, seieren må vinnes på nytt), eller møt en
  // sterkere motstander (fienden treffer 25 % bedre per valg – ScenarioSpill.sterkere). Valgene huskes per leir.
  function størreRegion() { meldt.nivå = (meldt.nivå || 0) + 1; meldt.vunnet = false; meldt.fare = {}; lagre(); byNøkkel = ''; const B = område(); logg(`Krigen utvides: området er nå ${Math.round((B.radius || 0) / 1000)} km rundt leiren, med ${B.length} tettsteder.`); sist = ''; vis(true); skitten = true; return B.length; }
  function sterkere() { const n = window.ScenarioSpill && ScenarioSpill.sterkere ? ScenarioSpill.sterkere() : null; logg(n ? `Motstanderne har samlet seg: de treffer nå ${Math.round(n * 100)} % av det vanlige.` : 'Motstanderne samler seg.'); return n; }
  function seierKort(a) { const n = meldt.seire || 1; if (window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(`Seier nr. ${n}: ${fraksjon('blå').navn} holder ${S.prosent(a)} % av folket i området.`);
    visKort('Området er ditt', `${fraksjon('blå').navn} holder ${S.prosent(a)} % av folket i området. Du har vunnet denne krigen. Hva nå?`, [
      ['Større region', størreRegion, 'Krigen utvides til flere tettsteder lenger unna. Du må vinne på nytt.'],
      ['Sterkere motstander', sterkere, 'Samme område, men fienden treffer bedre.'],
      ['Fortsett som nå', null, 'Spill videre uten endringer.'],
      ...(window.ScenarioSpill && ScenarioSpill.etterspill ? [['Se krigen på nytt', () => ScenarioSpill.etterspill(), 'Spol gjennom hvem som holdt hva.']] : [])]); }
  setInterval(takt, 2000); window.addEventListener('riksbrudd-spill', () => setTimeout(takt, 300));
  const api = { test: false, skjul, skjult: () => inne, passInn, friDel, nivå: () => meldt.nivå || 0, seire: () => meldt.seire || 0, størreRegion, sterkere, seierKort, område, åpne, lukk, erÅpen: () => åpen, bilde, send, velg: id => { valgtBy = område().find(b => b.id === id) || null; vis(true); skitten = true; return !!valgtBy; }, takt, tegn };
  window.StrategiSpill = api;
})();
