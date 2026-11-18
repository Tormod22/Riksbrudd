'use strict';
// Samfunnet i leiren (regler: spill/samfunn.js). Nattarbeidet 18. nov, pakke «folk».
//  - Panelet «Samfunn» (fra Folk-panelet og Leir-menyen): barn og gamle, Grålungen og karantene, lovene, forrædere, opplæring, de døde.
//  - Personkortet: ansikt (portrettmotoren), historie, lynne, ønske og ferdigheter – åpnes ved å trykke på et navn i Folk-panelet.
//  - Kortene midt på skjermen: flyktninger ved porten, krangler og ønsker, en avslørt forræder.
//  - Spesialistene virker gjennom krokene (skytter: KROKER.ild; radiooperatør: vaktenes varsling; mekaniker: kjøretøy ved leiren).
//  - Minnesmerket er et nytt bygg i leiren (Leir.BYGG.minnesmerke, MODELLER.minnesmerke).
// Lagres i «riksbrudd-samfunn» per leir. I de automatiske testene (navigator.webdriver) sover hele samfunnet til SamfunnSpill.test = true.
(function () {
  const SR = window.Samfunn, FR = window.FolkRegler, LB = window.Leir; if (!SR || !FR || !LB) return;
  const api = { test: false }, auto = () => !navigator.webdriver || api.test;
  // Claudes forslag: ett ekte minutt teller som minst én time i samfunnet (ellers ville et døgn ta et døgn når spillet går i sanntid)
  const EKTE_FAKTOR = 60;
  let S = null, leirId = '', åpen = false, akk = 0, akkEkte = 0, sistEkte = performance.now(), personId = null, falne = null, sistHtml = '', sistKort = '';
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const L = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const F = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const har = t => { const l = L(); return !!(l && l.bygg.some(b => b.type === t && LB.virker(b))); };
  const prosent = v => Math.round(v * 100) + ' %';
  const lagre = () => { if (!S) return; try { localStorage.setItem('riksbrudd-samfunn', JSON.stringify({ leir: leirId, d: S })); } catch (e) { /* fullt eller sperret */ } if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); };
  const les = () => { try { const d = JSON.parse(localStorage.getItem('riksbrudd-samfunn') || 'null'); return d && d.leir === leirId ? SR.fraJSON(d.d) : null; } catch (e) { return null; } };
  const r = () => SR.tilf(S);

  // ---------- minnesmerket: et nytt bygg ----------
  if (!LB.BYGG.minnesmerke) LB.BYGG.minnesmerke = { navn: 'Minnesmerke', pris: 4e5, tid: 1, kw: 0, modell: 'minnesmerke', fot: [-1.6, 1.6, -1.6, 1.6], mat: { betong: 2, tre: 1 }, tekst: 'En stein med navnene på dem som er borte: bedre moral' };
  // ikonet i byggelista (vakten «ikoner» krever at alle bygg har ett)
  if (window.Ikoner && Ikoner.BYGG && !Ikoner.BYGG.minnesmerke) Ikoner.BYGG.minnesmerke = Ikoner.har('kors') ? 'kors' : Ikoner.BYGG.sykestue;
  if (window.MODELLER && !MODELLER.minnesmerke) MODELLER.minnesmerke = function () {
    const d = [], boks = (x, y, z, sx, sy, sz, c) => { let g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z + sz / 2); g = g.toNonIndexed(); g.computeVertexNormals(); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); d.push(g); };
    const stein = [.5, .5, .48], mørk = [.3, .3, .29], tre = [.42, .31, .2];
    // heller rundt, sokkel, bautastein med plate, to lave kors og en benk
    boks(0, 0, 0, 3, 3, .12, [.42, .41, .38]); boks(0, .2, .12, 1.3, .9, .3, mørk); boks(0, .2, .42, .8, .45, 1.9, stein); boks(0, -.04, 1.1, .5, .04, .7, [.2, .2, .2]);
    for (const x of [-1.05, 1.05]) { boks(x, .5, .12, .08, .08, .8, tre); boks(x, .5, .62, .4, .08, .08, tre); }
    boks(0, -1.1, .12, 1.4, .35, .08, tre); for (const x of [-.55, .55]) boks(x, -1.1, .12, .1, .3, .38, tre); boks(0, -1.1, .5, 1.4, .35, .06, tre);
    return MODELLER.samle(d, .15);
  };

  // ---------- det folket trenger fra samfunnet ----------
  function ktx(grunn) {
    const f = F(), l = L(), o = grunn || (window.FolkSpill && FolkSpill.grunn ? FolkSpill.grunn() : {});
    const B = FR.behov(f, l, { ...o, avhengige: S.avhengige.length, matFaktor: S.lover.rasjonering ? SR.LOVER.rasjonering.mat : 1 });
    const D = window.OverlevSpill && OverlevSpill.D ? OverlevSpill.D() : null;
    // sprengkulde (spill/verden.js bruker −8 grader som grense): Grålungen smitter lettere
    const temp = window.VAER && VAER.regel && typeof VAER.regel.temp === 'number' ? VAER.regel.temp : 10;
    return { B, sprengkulde: temp <= -8, sult: !!(f.sist && f.sist.sult), kald: (f.sist && f.sist.kald) || 0, tid: S.klokke || 0, auto: auto(), utenVann: !!(D && D.vann && D.vann.nede && !har('brønn')),
      minnesmerke: har('minnesmerke'), brønn: har('brønn'), radiomast: har('radiomast'), F: f };
  }
  // FolkSpill.valg() spør her: grunnvalgene pluss samfunnets (sover i testene)
  function valg(grunn) {
    if (!S || !F() || !L() || !auto()) return grunn;
    const v = SR.valg(S, F(), ktx(grunn));
    return { ...grunn, moralTillegg: (grunn.moralTillegg || 0) + v.moralTillegg, tempoFaktor: v.tempoFaktor, matFaktor: v.matFaktor, avhengige: v.avhengige };
  }

  // ---------- stil ----------
  const css = document.createElement('style');
  css.textContent = `#samfunnmeny{ position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); width:min(380px, calc(100vw - 20px)); box-sizing:border-box; z-index:7; display:none;
  background:#16120c; border:1px solid var(--rule); color:var(--ink); overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; touch-action:pan-y; padding:10px 12px 12px; font-size:14px; line-height:1.35; }
#samfunnmeny.på{ display:block; } #samfunnmeny h2{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:22px; } #samfunnmeny h3{ margin:12px 0 3px; font-size:14px; color:var(--hover); font-weight:600; }
#samfunnmeny button, #personkort button, #samfunnkort button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:38px; padding:4px 10px; cursor:pointer; font:inherit; }
#samfunnmeny button:disabled{ opacity:.45; cursor:default; } #samfunnmeny .lukk, #personkort .lukk{ float:right; min-height:36px; border:none; background:none; font-size:22px; } #samfunnmeny .tilbake{ float:right; min-height:32px; font-size:13px; margin-right:4px; }
#samfunnmeny small{ color:var(--ink-dim); display:block; font-size:12.5px; } #samfunnmeny .rad{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:5px; }
#samfunnmeny .lov{ display:grid; grid-template-columns:1fr 64px; gap:6px; align-items:center; padding:4px 0; border-bottom:1px solid #3a3226; } #samfunnmeny .lov button.på{ background:#4a5a2c; border-color:#8fae5a; }
#samfunnmeny .varsel{ color:#e8a46a; } #samfunnmeny .bra{ color:#9cc37f; } #samfunnmeny select{ background:#2a2318; color:var(--ink); border:1px solid var(--rule); font:inherit; font-size:13px; min-height:34px; max-width:100%; }
#samfunnmeny .deler span{ display:inline-block; margin:1px 8px 1px 0; }
#personkort{ position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:14; display:none; width:min(430px,94vw); max-height:92vh; overflow-y:auto; box-sizing:border-box; padding:12px 14px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); box-shadow:0 8px 30px rgba(0,0,0,.6); font-size:14px; line-height:1.4; }
#personkort.på{ display:block; } #personkort img{ float:left; margin:0 12px 6px 0; border:1px solid var(--rule,#4a4030); background:#2a2318; } #personkort h3{ margin:0 0 2px; font-size:19px; font-family:"IM Fell English",serif; font-weight:400; color:#f0d79a; }
#personkort small{ color:var(--ink-dim,#b5a888); } #personkort p{ margin:6px 0; } #personkort .ferd{ clear:both; display:grid; grid-template-columns:1fr 1fr; gap:2px 12px; font-size:13px; margin-top:6px; } #personkort .ferd b{ color:#f0d79a; font-weight:600; }
#personkort .merke{ display:inline-block; border:1px solid #c9b26a; color:#f0d79a; padding:0 6px; font-size:12px; margin-right:4px; }
#samfunnkort{ position:fixed; left:50%; transform:translateX(-50%); top:20%; z-index:13; display:none; width:min(470px,92vw); box-sizing:border-box; padding:14px 16px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); box-shadow:0 8px 30px rgba(0,0,0,.6); }
#samfunnkort.på{ display:block; } #samfunnkort h3{ margin:0 0 6px; font-size:17px; color:#f0d79a; } #samfunnkort p{ margin:0 0 10px; line-height:1.35; } #samfunnkort button{ display:block; width:100%; margin-top:6px; min-height:42px; text-align:left; padding:6px 12px; } #samfunnkort button:disabled{ opacity:.45; }
body.kort #samfunnmeny{ top:calc(var(--topp,44px) + 4px); bottom:calc(6px + env(safe-area-inset-bottom,0px)); left:calc(8px + env(safe-area-inset-left,0px)); padding:8px 10px 10px; } body.kort #samfunnkort{ top:8%; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn.filter(b => b !== null && b !== undefined && b !== false)); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const panel = el('div', { id: 'samfunnmeny', role: 'dialog', 'aria-label': 'Samfunn' }), pk = el('div', { id: 'personkort', role: 'dialog', 'aria-label': 'Person' }), kort = el('div', { id: 'samfunnkort', role: 'dialog', 'aria-label': 'Hendelse i leiren' });
  document.body.append(panel, pk, kort);
  const si = t => { if (t) logg(t); };

  // ---------- KORTKØEN: ett kort med valg om gangen, og en pause mellom dem ----------
  // Kortene med valg er #hendelse (spillet-visning.js), #formkort (scenario-visning.js) og #samfunnkort (her). Claudes forslag: minst
  // KORT_PAUSE sekunder ekte tid fra ett kort lukkes til det neste vises (flyktninger og en avslørt forræder venter bare på ledig plass).
  const KORT_PAUSE = 120, KORT_ID = ['hendelse', 'formkort', 'samfunnkort']; let sistÅpent = -1e9;
  const Kortkø = { åpent: () => KORT_ID.find(id => { const e = document.getElementById(id); return e && e.classList.contains('på'); }) || null,
    // ledig(haster): er det plass til et nytt kort nå? I testene (webdriver) gjelder ingen pause.
    ledig: haster => !Kortkø.åpent() && (haster || navigator.webdriver || (performance.now() - sistÅpent) / 1000 >= KORT_PAUSE), pause: KORT_PAUSE, sist: () => sistÅpent };
  setInterval(() => { if (Kortkø.åpent()) sistÅpent = performance.now(); }, 1000);
  window.Kortkø = Kortkø;
  // flytt 2D-kartet til et sted (brukes av varselkortet i kameravakt-visning.js)
  window.kartTil = (x, y, m) => { kam.x = x; kam.y = y; if (m && kam.m > m) kam.m = m; skitten = true; };

  // ---------- personkortet ----------
  const bilder = new Map();
  function bilde(p, bredde) {
    const nøkkel = p.navn + '|' + p.yrke; let src = bilder.get(nøkkel);
    if (!src) { try { src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SR.portrettSVG(p)); } catch (e) { src = ''; } bilder.set(nøkkel, src); }
    return el('img', { alt: 'Portrett av ' + p.navn, width: String(bredde), height: String(Math.round(bredde * 740 / 600)), src });
  }
  const lojalTekst = v => (v >= .8 ? 'svært trofast' : v >= .6 ? 'trofast' : v >= .4 ? 'usikker' : v >= .25 ? 'misfornøyd' : 'på vei bort');
  function visPerson(id) {
    if (id !== undefined) personId = id; const f = F(), p = f && f.personer.find(q => q.id === personId); pk.innerHTML = '';
    if (!p || !S) { pk.classList.remove('på'); personId = null; return; }
    const P = SR.profil(p), k = ktx(), oppfylt = SR.ønskeOppfylt(p, k), sp = p.spes && SR.SPES[p.spes];
    const merker = [sp && el('span', { klasse: 'merke', title: sp.tekst }, '★ ' + sp.navn), p.erf > 0 && el('span', { klasse: 'merke' }, 'Veteran'), p.syk && el('span', { klasse: 'merke' }, 'Grålungen'), p.karantene && el('span', { klasse: 'merke' }, 'I karantene'),
      p.immun && el('span', { klasse: 'merke' }, 'Tåler Grålungen'), p.trener && el('span', { klasse: 'merke' }, 'I opplæring'), p.borte && el('span', { klasse: 'merke' }, 'Borte fra leiren')];
    const ferd = Object.entries(p.ferd).sort((a, b) => b[1] - a[1]).slice(0, 4);
    pk.append(knapp('×', () => visPerson(null), { klasse: 'lukk', 'aria-label': 'Lukk' }), bilde(p, 130), el('h3', {}, p.navn),
      el('small', {}, `${p.alder} år · ${p.yrke} · ${FR.OPPGAVE[p.oppgave].navn.toLowerCase()} nå`), el('div', { style: 'margin-top:4px' }, ...merker),
      el('p', {}, P.historie), el('p', {}, el('b', {}, P.lynneTekst + '. '), `Ønsker seg ${P.ønskeTekst} `, el('span', { klasse: oppfylt ? 'bra' : 'varsel', style: `color:${oppfylt ? '#9cc37f' : '#e8a46a'}` }, oppfylt ? '(oppfylt)' : '(ikke oppfylt)'), '.'),
      el('p', {}, `Helse ${prosent(p.helse)} · ${lojalTekst(p.lojal)} (lojalitet ${prosent(p.lojal)})` + (p.seng ? ' · har seng' : ' · sover i telt')),
      sp ? el('p', {}, el('b', {}, sp.navn + ': '), sp.tekst) : '',
      el('div', { klasse: 'ferd' }, ...ferd.map(([o, v]) => el('span', {}, FR.OPPGAVE[o] ? FR.OPPGAVE[o].navn : o, ' ', el('b', {}, v.toFixed(2).replace('.', ','))))));
    pk.classList.add('på');
  }

  // ---------- kortene ----------
  function visKort() {
    const c = S && S.kort, f = F(); const annet = document.getElementById('hendelse');
    const andre = Kortkø.åpent(), venter = !kort.classList.contains('på') && !Kortkø.ledig(c && c.type === 'spion');
    if (!c || !f || (andre && andre !== 'samfunnkort') || venter) { if (kort.classList.contains('på')) { kort.classList.remove('på'); kort.innerHTML = ''; sistKort = ''; } return; }
    const nøkkel = JSON.stringify(c) + '|' + Math.round(f.mat); if (nøkkel === sistKort) return; sistKort = nøkkel; kort.innerHTML = '';
    if (c.type === 'flyktninger') { kort.append(el('h3', {}, 'Flyktninger ved porten'), el('p', {}, SR.flyktTekst(c)));
      const k = ktx(), ledig = k.B.senger - k.B.n - k.B.avh; kort.append(el('p', { style: 'font-size:13px;color:var(--ink-dim,#b5a888)' }, `Ledige senger: ${Math.max(0, ledig)} · mat: ${Math.round(f.mat)} rasjoner`));
      for (const v of SR.flyktValg(c)) { const b = knapp(v.t, () => svarFlykt(v.id), { 'data-valg': v.id }); if (v.id === 'mat' && f.mat < (c.voksne + c.barn + c.gamle) * SR.REGLER.flyktMat) b.disabled = true; kort.append(b); } }
    else if (c.type === 'spion') { kort.append(el('h3', {}, 'Forræder avslørt'), el('p', {}, `${c.navn} har lekket til fienden. Hva gjør dere?`),
      knapp('Utvis hen fra leiren', () => svarSpion('utvis'), { 'data-valg': 'utvis' }), knapp('Gi hen en sjanse til', () => svarSpion('tilgi'), { 'data-valg': 'tilgi' })); }
    else { const T = SR.kortTekst(S, f, c, ktx()); kort.append(el('h3', {}, T.tittel), el('p', {}, T.tekst)); T.valg.forEach((v, i) => { const b = knapp(v.t, () => svarKort(i), { 'data-valg': String(i) }); b.disabled = !v.kan; kort.append(b); }); }
    kort.classList.add('på');
  }
  function ferdigKort() { S.kort = null; sistKort = ''; lagre(); visKort(); vis(); if (window.FolkSpill) FolkSpill.vis(); }
  function svarFlykt(id) { const c = S.kort; if (!c || c.type !== 'flyktninger') return; const u = SR.flyktSvar(S, F(), c, id, ktx(), r()); if (u.feil) { logg(u.feil); return; }
    si(u.tekst); for (const p of u.nye) si(`${p.navn} (${p.yrke}) er med i gjengen` + (p.spes ? ` – en ${SR.SPES[p.spes].navn.toLowerCase()}!` : '.')); ferdigKort(); }
  function svarSpion(v) { const c = S.kort; if (!c || c.type !== 'spion') return; si(SR.dom(S, F(), c.id, v).tekst); ferdigKort(); }
  function svarKort(i) { const c = S.kort; if (!c || c.type !== 'kort') return; const T = SR.kortTekst(S, F(), c, ktx()), u = SR.kortSvar(S, F(), c, i, ktx(), r()); if (u.feil) { logg(u.feil); return; }
    if (u.penger > 0 && window.OppstartSpill) OppstartSpill.gi(u.penger); si(`${T.tekst} – ${T.valg[i].t.replace(/ \(.*\)$/, '').toLowerCase()}. ${u.tekst}`); ferdigKort(); }
  // et kort nå (brukes av hendelsene i spillet-visning.js, av testene og av vakten). type: 'flyktninger' | 'kort' | id-en til et kort
  function nyttKort(type) {
    const f = F(); if (!S || !f || S.kort) return false;
    if (type === 'flyktninger') S.kort = SR.nyeFlyktninger(S, r());
    else if (type && type !== 'kort') { const P = f.personer; if (P.length < 2 || !SR.KORT.find(q => q.id === type)) return false; S.kort = { type: 'kort', id: type, a: P[0].id, b: P[1].id }; }
    else { if (!Kortkø.ledig()) return false; S.kort = SR.velgKort(S, f, ktx(), r()); }
    if (!S.kort) return false; lagre(); visKort(); return true;
  }

  // ---------- panelet ----------
  function åpne(på) {
    åpen = på === undefined ? !åpen : !!på; panel.classList.toggle('på', åpen);
    if (åpen) { if (window.FolkSpill) FolkSpill.åpne(false); const lm = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (lm && lm.classList.contains('på') && lk) lk.click(); if (window.lukkPanel) lukkPanel(); sistHtml = ''; vis(); }
  }
  let lær = { o: 'bygg', a: null, b: null };
  function vis() {
    if (!åpen) return; const ny = el('div'); fyll(ny);
    if (ny.innerHTML === sistHtml && panel.firstChild) return;
    const rulle = panel.scrollTop; sistHtml = ny.innerHTML; panel.innerHTML = ''; panel.append(...ny.childNodes); panel.scrollTop = rulle;
  }
  function fyll(p) {
    const f = F(), l = L();
    p.append(knapp('×', () => åpne(false), { klasse: 'lukk', 'aria-label': 'Lukk' }), knapp('‹ Folk', () => { åpne(false); if (window.FolkSpill) FolkSpill.åpne(true); }, { klasse: 'tilbake' }), el('h2', {}, 'Samfunn'));
    if (!S || !f || !l) { p.append(el('small', {}, 'Start et spill først.')); return; }
    if (!auto()) p.append(el('small', {}, 'Samfunnet sover i de automatiske testene.'));
    const k = ktx(), v = SR.valg(S, f, k), nå = S.klokke || 0;
    // moralen: hva som trekker opp og ned
    const deler = Object.entries(v.deler).filter(([, x]) => Math.round(x)).map(([n, x]) => el('span', { klasse: x > 0 ? 'bra' : 'varsel' }, `${n} ${x > 0 ? '+' : '−'}${Math.abs(Math.round(x))}`));
    p.append(el('h3', {}, 'Stemningen'), el('div', { klasse: 'deler' }, ...(deler.length ? deler : [el('span', {}, 'Ingenting særskilt trekker moralen opp eller ned.')])),
      el('small', {}, `Ønsker oppfylt: ${Math.round(SR.ønskeAndel(f, k) * f.personer.length)} av ${f.personer.length} · snittlojalitet ${prosent(SR.snittLojal(f))}` + (v.tempoFaktor !== 1 ? ` · arbeidstempo ×${v.tempoFaktor.toFixed(2).replace('.', ',')}` : '')));
    for (const q of S.virkninger.filter(x => x.til > nå)) p.append(el('small', {}, `${q.navn}: ${q.moral ? 'moral ' + (q.moral > 0 ? '+' : '−') + Math.abs(q.moral) : ''}${q.tempo && q.tempo !== 1 ? ' tempo ×' + String(q.tempo).replace('.', ',') : ''} – ${Math.max(1, Math.round((q.til - nå) / 60))} timer til`));
    // barn og gamle
    const barn = S.avhengige.filter(a => a.type === 'barn'), gamle = S.avhengige.filter(a => a.type !== 'barn');
    p.append(el('h3', {}, `Barn og gamle (${S.avhengige.length})`), el('small', {}, S.avhengige.length ? 'De arbeider ikke, men spiser og trenger seng. Har de det bra, løfter de moralen – lider de, tærer det hardt.' : 'Ingen ennå. De kommer gjerne med flyktninger.'));
    if (barn.length) p.append(el('div', {}, 'Barn: ' + barn.map(a => `${a.navn.split(' ')[0]} (${a.alder})`).join(', ')));
    if (gamle.length) p.append(el('div', {}, 'Gamle: ' + gamle.map(a => `${a.navn.split(' ')[0]} (${a.alder})`).join(', ')));
    // spesialister
    const sp = f.personer.filter(q => q.spes);
    p.append(el('h3', {}, `Spesialister (${sp.length})`));
    if (!sp.length) p.append(el('small', {}, 'Lege, mekaniker, radiooperatør og skytter er sjeldne. Let i hus, og se etter dem blant flyktninger.'));
    for (const q of sp) { const T = SR.SPES[q.spes], virker = SR.harSpes(f, q.spes) && f.personer.some(x => x === q && FR.arbeidsfør(x) && x.oppgave === T.oppgave);
      const rad = el('div', { klasse: 'rad' }, knapp(`★ ${T.navn}: ${q.navn}`, () => visPerson(q.id), { 'data-person': String(q.id) }));
      if (!virker) rad.append(knapp(`Sett på «${FR.OPPGAVE[T.oppgave].navn.toLowerCase()}»`, () => { FR.sett(f, q.id, T.oppgave); lagre(); vis(); })); p.append(rad, el('small', { klasse: virker ? '' : 'varsel' }, virker ? T.tekst : `Virker bare på «${FR.OPPGAVE[T.oppgave].navn.toLowerCase()}».`)); }
    // Grålungen
    const syke = SR.sykeI(f);
    p.append(el('h3', {}, 'Grålungen'), el('div', { klasse: syke.length ? 'varsel' : '' }, syke.length ? `${syke.length} syke: ${syke.map(q => q.navn.split(' ')[0]).join(', ')}.` : 'Ingen syke i leiren.'),
      el('small', {}, 'Smitter fort når folk sover trangt. Karantene, sykestue og lege bremser den. I karantene arbeider ikke de syke.'),
      el('div', { klasse: 'rad' }, knapp(S.karantene ? 'Opphev karantenen' : 'Sett syke i karantene', () => { SR.settKarantene(S, f, !S.karantene); logg(S.karantene ? 'Karantene: de syke holdes for seg selv og arbeider ikke.' : 'Karantenen er opphevet.'); lagre(); vis(); }, { id: 'karantene', klasse: S.karantene ? 'på' : '' })));
    // lovene
    p.append(el('h3', {}, 'Lov i leiren'));
    for (const [id, Lv] of Object.entries(SR.LOVER)) p.append(el('div', { klasse: 'lov' }, el('div', {}, el('b', {}, Lv.navn), el('small', {}, Lv.tekst)),
      knapp(S.lover[id] ? 'På' : 'Av', () => { si(SR.settLov(S, f, id, !S.lover[id]).tekst); lagre(); vis(); }, { klasse: S.lover[id] ? 'på' : '', 'data-lov': id, 'aria-pressed': String(!!S.lover[id]) })));
    // fanger som kan få bli
    const FA = fanger(); if (FA.length) { p.append(el('h3', {}, 'Fanger'), el('small', {}, 'Fangene i leiren kan få bli som en del av gjengen. De er lite trofaste i starten, og de andre liker det dårlig (moral −2).'));
      FA.forEach((q, i) => p.append(el('div', { klasse: 'rad' }, el('span', {}, `${q.n} ${q.n === 1 ? 'fange' : 'fanger'}`), knapp('La dem bli med i leiren', () => taFanger(i), { 'data-fange': String(i) })))); }
    // forrædere
    const dager = (nå - S.sistEtterforsket) / SR.REGLER.døgn;
    p.append(el('h3', {}, 'Forrædere'), el('div', { klasse: S.mistanke ? 'varsel' : '' }, S.mistanke ? `Noe er galt: ${S.mistanke} ${S.mistanke === 1 ? 'hendelse' : 'hendelser'} tyder på at noen i leiren arbeider for fienden.` : 'Ingen tegn til forræderi.'),
      el('small', {}, 'Er lojaliteten lav, kan noen lekke til fienden eller sabotere. Radiooperatør og portforbud gjør det lettere å avsløre dem. Å etterforske uten grunn koster lojalitet.'));
    const eb = knapp('Etterforsk', () => { const u = SR.etterforsk(S, f, S.klokke || 0, r()); logg(u.feil || u.tekst); lagre(); visKort(); vis(); }, { id: 'etterforsk' }); eb.disabled = dager < SR.REGLER.etterforskPause; p.append(el('div', { klasse: 'rad' }, eb));
    // opplæring
    p.append(el('h3', {}, 'Opplæring'), el('small', {}, `En som er god (minst ${String(SR.REGLER.lærerMin).replace('.', ',')}) eller en veteran lærer opp en annen. Begge arbeider saktere imens. Høyst ${SR.REGLER.maksPar} par.`));
    S.opplæring.forEach((q, i) => { const a = f.personer.find(x => x.id === q.lærer), b = f.personer.find(x => x.id === q.elev); if (!a || !b) return;
      p.append(el('div', { klasse: 'rad' }, el('span', {}, `${a.navn.split(' ')[0]} → ${b.navn.split(' ')[0]}: ${FR.OPPGAVE[q.oppgave].navn.toLowerCase()} ${(b.ferd[q.oppgave] || 0).toFixed(2).replace('.', ',')}`), knapp('Stopp', () => { SR.stoppOpplæring(S, f, i); lagre(); vis(); }))); });
    const oppg = FR.OPPGAVER.filter(o => o !== 'fri'), so = el('select', { id: 'lær-o', 'aria-label': 'Oppgave' }), sa = el('select', { id: 'lær-a', 'aria-label': 'Lærer' }), sb = el('select', { id: 'lær-b', 'aria-label': 'Elev' });
    for (const o of oppg) { const e = el('option', { value: o }, FR.OPPGAVE[o].navn); if (o === lær.o) e.setAttribute('selected', ''); so.append(e); }
    const LA = SR.lærere(f, lær.o); if (!LA.some(x => x.id === lær.a)) lær.a = LA[0] ? LA[0].id : null;
    for (const x of LA) { const e = el('option', { value: String(x.id) }, `${x.navn} (${SR.lærerNivå(x, lær.o).toFixed(2).replace('.', ',')})`); if (x.id === lær.a) e.setAttribute('selected', ''); sa.append(e); }
    const EL = f.personer.filter(x => x.id !== lær.a && !x.trener).sort((x, y) => (x.ferd[lær.o] || 0) - (y.ferd[lær.o] || 0)); if (!EL.some(x => x.id === lær.b)) lær.b = EL[0] ? EL[0].id : null;
    for (const x of EL) { const e = el('option', { value: String(x.id) }, `${x.navn} (${(x.ferd[lær.o] || 0).toFixed(2).replace('.', ',')})`); if (x.id === lær.b) e.setAttribute('selected', ''); sb.append(e); }
    so.onchange = () => { lær.o = so.value; lær.a = lær.b = null; sistHtml = ''; vis(); }; sa.onchange = () => { lær.a = +sa.value; sistHtml = ''; vis(); }; sb.onchange = () => { lær.b = +sb.value; };
    const start = knapp('Start opplæring', () => { const u = SR.startOpplæring(S, f, lær.a, lær.b, lær.o); logg(u.feil || u.tekst); lagre(); vis(); }, { id: 'lær-start' }); start.disabled = !LA.length || !EL.length || S.opplæring.length >= SR.REGLER.maksPar;
    p.append(el('div', { klasse: 'rad' }, so, sa, el('span', {}, 'lærer'), sb), el('div', { klasse: 'rad' }, start, !LA.length ? el('small', {}, 'Ingen er gode nok til å lære bort dette.') : null));
    // de døde
    p.append(el('h3', {}, 'De døde'));
    if (S.døde.length) p.append(el('div', { klasse: 'varsel' }, `Venter på begravelse: ${S.døde.map(q => q.navn).join(', ')}.`),
      el('div', { klasse: 'rad' }, knapp('Begravelse med seremoni (3 timer)', () => { si(SR.gravlegg(S, f, 'seremoni', S.klokke || 0).tekst); lagre(); vis(); }, { id: 'gravlegg' }), knapp('Gravlegg uten seremoni', () => { si(SR.gravlegg(S, f, 'enkel', S.klokke || 0).tekst); lagre(); vis(); }, { id: 'gravlegg-enkel' })),
      el('small', {}, 'Venter dere mer enn tre døgn, legges de i jorda uten farvel – det tynger leiren.'));
    else p.append(el('small', {}, 'Ingen venter på begravelse.'));
    if (S.gravlagte.length) p.append(el('div', {}, `Gravlagt: ${S.gravlagte.slice(-8).join(', ')}${S.gravlagte.length > 8 ? ` og ${S.gravlagte.length - 8} til` : ''}.`));
    p.append(el('small', { klasse: k.minnesmerke ? 'bra' : '' }, k.minnesmerke ? `Minnesmerket står i leiren (moral +${Math.round(SR.minneMoral(S, true))}).` : 'Bygg et minnesmerke i Leir-menyen (under «Annet»): det gir moral, mer for hvert navn.'));
    // prøv selv
    p.append(el('h3', {}, 'Ved porten'), el('small', {}, 'Flyktninger, krangler og ønsker kommer av seg selv mens du spiller.'));
  }

  // ---------- tiden ----------
  KROKER.sim.push(dt => {
    const f = F(), l = L(); if (!S || !f || !l || !spill() || !auto()) return;
    // samfunnets klokke: spilltiden, men minst EKTE_FAKTOR ganger den ekte tiden (så ting skjer også når spillet går i sanntid)
    const nå = performance.now(), ekte = Math.min(2, (nå - sistEkte) / 1000); sistEkte = nå; akk += Math.max(dt, ekte / 60 * EKTE_FAKTOR);
    if (akk < 1) return; const d = akk; akk = 0; S.klokke = (S.klokke || 0) + d;
    const u = SR.steg(S, f, l, d, ktx(), r());
    for (const h of u.hendelser) logg(h);
    if (u.lekk && window.AI && AI.minne) for (const side of Object.keys(AI.minne)) AI.minne[side].leir = true;
    if (u.hendelser.length || u.kort) lagre();
  });
  // hvert sekund: kort, panel, falne soldater, mekanikeren
  setInterval(() => {
    if (!S || !spill()) return; const f = F(); if (!f) return;
    if (auto()) { soldater(); mekaniker(); }
    visKort();
    if (åpen && !(window.pekerNede && pekerNede(panel)) && !(document.activeElement && document.activeElement.tagName === 'SELECT' && panel.contains(document.activeElement))) vis();
  }, 1000);
  // soldater som faller i egne lag skal også tas farvel med
  function soldater() {
    const sett = new Set(); for (const s of ENHETER) if (s.side === 'blå' && !s.karakter) for (const m of s.menn || []) if (m.hp <= 0 && m.navn) sett.add(s.navn + '|' + m.navn);
    if (falne) for (const n of sett) if (!falne.has(n)) { SR.død(S, n.split('|')[1], 'soldat', S.klokke || 0); logg(`${n.split('|')[1]} (${n.split('|')[0]}) er falt. Ta farvel i Samfunn-panelet.`); lagre(); }
    falne = sett;
  }
  // mekanikeren reparerer skadde kjøretøy innen 200 m fra leiren
  function mekaniker() {
    const sp = spill(), f = F(); if (!sp || !sp.leir || typeof KJORETOY === 'undefined' || !SR.harSpes(f, 'mekaniker') || !har('verksted')) return;
    for (const k of KJORETOY) if ((!k.side || k.side === 'blå') && k.skade > 0 && Math.hypot(k.x - sp.leir.x, k.y - sp.leir.y) < 200) { k.skade = Math.max(0, k.skade - SR.REGLER.mekanikerHp * (typeof tempo === 'number' ? Math.max(1, tempo) : 1) / 3600 * EKTE_FAKTOR);
      if (k.skade <= 0) logg(`Mekanikeren har reparert ${k.navn}.`); }
  }
  // folk som dør i leiren (folk-visning.js melder dem)
  function døde(liste) { if (!S || !auto()) return; for (const p of liste) SR.død(S, p.navn, 'folk', S.klokke || 0); if (liste.length) { logg('Ta farvel med de døde i Samfunn-panelet (begravelse).'); lagre(); } }
  // en rekrutt fra en by (region-visning.js): får et sted i historien. Stedet = det største tettstedet dere holder (ellers «byen»).
  function ankommet(p) { if (!S || !p || !auto()) return null; let navn = '';
    try { const B = (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || []; let best = -1; for (const b of B) { if (!b.e || Garnison.tilstand(TETTSTEDER, b.e.id).eier !== 'blå') continue; const n = b.e.folk || b.e.innb || b.e.n || 0; if (n > best) { best = n; navn = b.e.navn || ''; } } } catch (e) { navn = ''; }
    const q = SR.ankommet(p, navn, Math.random); if (q && q.spes) logg(`${p.navn} viser seg å være ${SR.SPES[q.spes].navn.toLowerCase()}!`); lagre(); return q; }
  // fanger i leiren (krig-visning.js: KrigSpill.T().fanger) kan få bli – de er lite trofaste i starten
  const fanger = () => { try { return window.KrigSpill && KrigSpill.T && KrigSpill.T() ? KrigSpill.T().fanger || [] : []; } catch (e) { return []; } };
  function taFanger(i) { const T = fanger(), q = T[i], f = F(); if (!S || !q || !f) return false; const navn = window.Fraksjoner && Fraksjoner.FRAKSJONER[q.side] ? Fraksjoner.FRAKSJONER[q.side].navn : 'røverne';
    const nye = SR.fangerInn(f, Math.min(6, q.n || 1), navn, r()); T.splice(i, 1); if (KrigSpill.lagre) KrigSpill.lagre();
    logg(`${nye.length} ${nye.length === 1 ? 'fange' : 'fanger'} fra ${navn} får bli i leiren: ${nye.map(p => p.navn.split(' ')[0]).join(', ')}. De er lite trofaste – følg med på dem.`); lagre(); vis(); if (window.FolkSpill) FolkSpill.vis(); return nye; }
  // en overlevende funnet ved leting (leting-visning.js): av og til en spesialist
  function funnet(p) { if (!S || !p) return null; const q = SR.funnet(p, Math.random); if (q) { logg(`${p.navn} viser seg å være ${SR.SPES[q.spes].navn.toLowerCase()}! ${SR.SPES[q.spes].tekst}`); lagre(); } return q; }

  // ---------- spesialistene og lovene i krokene ----------
  KROKER.ild.push((a, b) => {
    if (!S || !auto() || a.side !== 'blå') return 1; const sp = spill(), f = F(); if (!sp || !sp.leir || !f || Math.hypot(a.x - sp.leir.x, a.y - sp.leir.y) > SR.REGLER.skytterAvstand) return 1;
    return (SR.harSpes(f, 'skytter') ? SR.REGLER.skytterIld : 1) * (S.lover.våpen ? SR.LOVER.våpen.ild : 1);
  });
  // vaktenes varsling (folk-visning.js spør): lengre med radiooperatør
  const varsling = () => (S && auto() && F() && SR.harSpes(F(), 'radiooperatør') ? SR.REGLER.radioVarsling : 1);

  // ---------- Leir-menyen ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e2, knapp: k2 }) => {
    if (!S || !auto()) return; const f = F(); if (!f) return; const syke = SR.sykeI(f).length;
    hode.append(e2('h3', { 'data-fane': 'mål' }, 'Samfunnet'), e2('small', {}, `${S.avhengige.length} barn og gamle · ${f.personer.filter(q => q.spes).length} spesialister` + (syke ? ` · ${syke} syke av Grålungen` : '') + (S.døde.length ? ` · ${S.døde.length} venter på begravelse` : '')),
      e2('div', { klasse: 'mat' }, k2('Samfunn ›', () => åpne(true), { id: 'samfunnknapp' })));
  });

  // ---------- varselbrikkene øverst til venstre (spill/narhud.js leser window.VARSEL_TILLEGG) ----------
  // Claudes forslag: fra så mange syke heter det «utbrudd», og etter så mange døgn blir de ugravlagte en fare for moralen
  const UTBRUDD_SYKE = 3, DØDE_FARE = 1;
  (window.VARSEL_TILLEGG = window.VARSEL_TILLEGG || []).push(() => {
    const f = F(); if (!S || !f || !auto()) return [];
    const ut = [], voksne = SR.sykeI(f).length, avh = S.avhengige.filter(a => a.syk).length, n = voksne + avh;
    if (n) ut.push({ i: 'kors', k: 'fare', t: n >= UTBRUDD_SYKE ? 'Utbrudd av Grålungen' : 'Grålungen i leiren', s: `${n} syke` + (avh ? ` (${avh} barn/gamle)` : '') + (S.karantene ? ' · i karantene' : ' · ingen karantene'), f: () => åpne(true) });
    if (S.døde.length) { const eldst = Math.min(...S.døde.map(d => d.tid || 0)), døgn = ((S.klokke || 0) - eldst) / SR.REGLER.døgn;
      ut.push({ i: 'folk', k: døgn >= DØDE_FARE ? 'fare' : '', t: `${S.døde.length} ${S.døde.length === 1 ? 'død venter' : 'døde venter'} på begravelse`, s: 'ta farvel i Samfunn', f: () => åpne(true) }); }
    return ut;
  });

  // ---------- start ----------
  function start() {
    const sp = spill(); if (!sp || !sp.leir) { S = null; return; }
    leirId = Math.round(sp.leir.x) + ',' + Math.round(sp.leir.y); S = les() || SR.ny((Math.round(sp.leir.x) * 17 + Math.round(sp.leir.y) * 3) >>> 0); if (!S.klokke) S.klokke = typeof tid === 'number' ? tid : 0;
    falne = null; akk = 0; sistEkte = performance.now(); sistKort = ''; sistHtml = ''; visKort(); vis();
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  Object.assign(api, { våken: () => !!S && auto(), start, åpne, vis, valg, visPerson, visKort, nyttKort, ankommet, taFanger, fanger, svarFlykt, svarSpion, svarKort, døde, funnet, varsling, lagre, tilstand: () => S, ktx,
    // for testene og vakten: sett en ny, tom tilstand
    nullstill: () => { const sp = spill(); S = SR.ny(1); S.klokke = typeof tid === 'number' ? tid : 0; sistKort = ''; falne = null; if (sp) lagre(); visKort(); vis(); } });
  window.SamfunnSpill = api;
})();
