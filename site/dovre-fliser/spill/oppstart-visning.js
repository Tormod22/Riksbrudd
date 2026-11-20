'use strict';
// K1 – startskjermen (regler: spill/oppstart.js). Første gang: lag karakteren (navn, utseende, bakgrunn), fraksjonen (navn og eget
// flagg) og velg plass til leiren på kartet. Valgene lagres i nettleseren (localStorage «riksbrudd-k1») og brukes ved neste besøk.
// Fraksjonen din tar over lagene, kjøretøyene og basen (brukeren 9. nov): navnet og fargen til «blå», basen flyttes til leiren.
// Pengene vises øverst (sPenger). «Nytt spill» i ☰ sletter valgene. Kroker: KROKER.trykk (velge leirplass), KROKER.tegn (leiren i
// kartet), KROKER.tegn3d (navnet i 3D), KROKER.sett3d (flaggstangen i 3D), KROKER.sikt og KROKER.ild (bonusene).
(function () {
  const O = Oppstart, NØKKEL = 'riksbrudd-k1';
  let S = null, utkast = null, velger = false, forslag = null, flaggC = null;
  const les = () => { try { return O.fraJSON(localStorage.getItem(NØKKEL)); } catch (e) { return null; } };
  const lagre = () => { try { localStorage.setItem(NØKKEL, O.tilJSON(S)); } catch (e) { /* privat vindu: huskes ikke */ } };

  // ---------- stil ----------
  const css = document.createElement('style');
  css.textContent = `#oppstart{ position:fixed; inset:0; z-index:12; display:none; align-items:center; justify-content:center; background:rgba(10,8,5,.82); padding:12px; }
#oppstart.på{ display:flex; }
#oppstart .ark{ background:var(--panel); border:1px solid var(--rule); width:100%; max-width:760px; max-height:92vh; overflow:auto; padding:16px 20px; color:var(--ink); }
#oppstart h2{ margin:0 0 2px; font-family:"IM Fell English",serif; font-weight:400; font-size:26px; }
#oppstart .steg{ color:var(--ink-dim); font-size:14px; margin-bottom:10px; }
#oppstart h3{ margin:14px 0 6px; font-size:15px; color:var(--hover); font-weight:600; }
#oppstart input[type=text]{ box-sizing:border-box; font:inherit; font-size:17px; width:100%; max-width:360px; padding:8px 10px; background:#1d1912; color:var(--ink); border:1px solid var(--rule); }
#oppstart .rad{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
#oppstart .to{ display:flex; gap:18px; flex-wrap:wrap; align-items:flex-start; }
#oppstart .to>div{ flex:1 1 300px; min-width:0; }
#oppstart .to>.bilde{ flex:0 0 auto; position:sticky; top:0; align-self:flex-start; }
#oppstart .bilde img{ display:block; height:auto; max-height:calc(92vh - 70px); width:auto; max-width:200px; }
/* (runde 6, kritikken) telefon: portrettet står lite og fast øverst mens du blar ned til klær og bakgrunn */
@media (max-width:700px){ #oppstart .to>.bilde{ order:-1; flex:1 1 100%; position:sticky; top:-17px; z-index:2; background:#16120c; padding:16px 0 6px;
  border-bottom:1px solid var(--rule); display:flex; justify-content:center; } #oppstart .bilde img{ width:92px; max-height:none; } }
/* liggende telefon (lav skjerm): hele portrettet synlig ved siden av valgene */
@media (max-height:500px) and (min-width:701px){ #oppstart .bilde img{ height:calc(92vh - 110px); max-height:none; width:auto; } }
#oppstart .faner{ display:flex; flex-wrap:wrap; gap:2px; border-bottom:1px solid var(--rule); margin:2px 0 4px; }
#oppstart .faner button{ background:transparent; border:0; border-bottom:3px solid transparent; color:var(--ink-dim); min-height:40px; padding:4px 14px; cursor:pointer; font:inherit; font-size:16px; }
#oppstart .faner button.på{ color:var(--hover); border-bottom-color:var(--hover); }
#oppstart .lagret{ color:var(--ink-dim); font-size:14px; margin:-4px 0 8px; padding-left:8px; border-left:2px solid var(--hover); }
#oppstart input[type=range]{ -webkit-appearance:none; appearance:none; accent-color:var(--hover); height:28px; background:transparent; cursor:pointer; }
#oppstart input[type=range]::-webkit-slider-runnable-track{ height:6px; background:#3a3022; border:1px solid var(--rule); border-radius:3px; }
#oppstart input[type=range]::-moz-range-track{ height:6px; background:#3a3022; border:1px solid var(--rule); border-radius:3px; }
#oppstart input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:20px; height:20px; margin-top:-8px; border-radius:50%; background:var(--hover); border:2px solid #16120c; box-shadow:0 0 0 1px var(--hover); }
#oppstart input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; background:var(--hover); border:2px solid #16120c; }
#oppstart input[type=range]:focus-visible{ outline:2px solid var(--hover); outline-offset:2px; }
#leirvalg .adv{ color:#e8b06a; text-align:left; margin-top:4px; font-size:15px; }
#leirvalg .fakta{ color:var(--ink-dim); font-size:14px; margin-top:4px; }
#leirvalg .kai{ font-size:14px; margin-top:4px; }
#leirvalg .stopp{ color:#f0a090; text-align:left; margin-top:6px; font-size:16px; font-weight:600; }
#leirvalg .flytt{ color:#bfe6b4; text-align:left; margin-top:4px; font-size:15px; }
#leirvalg .venter{ font-style:italic; }
/* (runde 8) telefon: banneret tar mindre plass, så flagget synes over det */
@media (max-width:700px){ #leirvalg{ padding:8px 10px; } #leirvalg .fakta, #leirvalg .kai{ font-size:13px; } #leirvalg .stopp{ font-size:15px; } #leirvalg .flytt, #leirvalg .adv{ font-size:14px; } #leirvalg button{ min-height:44px; margin:5px 3px 0; } }
#oppstart .to>.flaggboks{ flex:0 0 auto; position:sticky; top:0; }
@media (max-width:700px){ #oppstart .to>.flaggboks{ order:-1; flex:1 1 100%; position:sticky; top:-17px; z-index:1; background:#16120c; text-align:center; padding:22px 0 6px; border-bottom:1px solid var(--rule); }
  #oppstart .flaggboks h3{ display:none; } #oppstart .flaggboks canvas{ width:150px; height:100px; } }
#oppstart button.valg{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); cursor:pointer; min-height:40px; padding:4px 10px; }
#oppstart button.valg.på{ border-color:var(--hover); background:#3a3022; box-shadow:inset 0 0 0 1px var(--hover); }
#oppstart button.farge{ width:34px; height:34px; min-height:0; padding:0; border:2px solid #0006; cursor:pointer; }
#oppstart button.farge.på{ outline:3px solid var(--hover); outline-offset:1px; }
/* (runde 8, kritikken: fargeprøvene var 34 × 34 px) – minst 44 px å trykke på med finger */
@media (pointer:coarse), (max-width:700px){ #oppstart button.farge{ width:44px; height:44px; } #oppstart .rad{ gap:7px; } }
#oppstart button.ikon{ width:44px; height:44px; padding:2px; background:#2a2318; border:1px solid var(--rule); cursor:pointer; }
#oppstart button.ikon.på{ border-color:var(--hover); box-shadow:inset 0 0 0 2px var(--hover); }
#oppstart .bakgrunn{ display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:6px; }
#oppstart .bakgrunn button{ text-align:left; padding:8px 10px; }
#oppstart .bakgrunn small{ display:block; color:var(--ink-dim); font-size:13px; }
#oppstart .bunn{ display:flex; justify-content:space-between; gap:8px; margin-top:16px; flex-wrap:wrap; }
#oppstart .bunn button{ font-size:16px; min-height:44px; padding:6px 18px; }
#oppstart .feil{ color:#e88a6a; min-height:20px; margin-top:8px; font-size:14px; }
#oppstart canvas{ border:1px solid var(--rule); background:#1d1912; max-width:100%; }
#leirvalg{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(70px + env(safe-area-inset-bottom,0px)); z-index:11; display:none; background:var(--panel);
  border:1px solid var(--hover); padding:10px 14px; color:var(--ink); max-width:min(560px,92vw); text-align:center; }
#leirvalg.på{ display:block; }
/* PC: over kommandolinja nederst */
body:not(.kort) #leirvalg{ bottom:calc(100px + env(safe-area-inset-bottom,0px)); }
#leirvalg button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:42px; padding:4px 14px; margin:6px 4px 0; cursor:pointer; font:inherit; }`;
  document.head.appendChild(css);

  // ---------- pengene øverst ----------
  const st = document.createElement('div'); st.innerHTML = '<b id="sPenger">–</b> <span>i kassa</span>'; st.hidden = true; st.className = 'viktig'; document.querySelector('.stats').appendChild(st);
  const visPenger = () => { st.hidden = !S; if (S) document.getElementById('sPenger').textContent = O.kroner(S.penger); };

  // ---------- startskjermen ----------
  const bak = document.createElement('div'); bak.id = 'oppstart'; bak.setAttribute('role', 'dialog'); bak.setAttribute('aria-label', 'Nytt spill');
  const ark = document.createElement('div'); ark.className = 'ark'; bak.appendChild(ark); document.body.appendChild(bak);
  const banner = document.createElement('div'); banner.id = 'leirvalg'; document.body.appendChild(banner);
  const el = (tag, egensk = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(egensk)) { if (k === 'klasse') e.className = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (tekst, på, gjør, klasse = 'valg') => { const b = el('button', { klasse: klasse + (på ? ' på' : ''), type: 'button' }, tekst); b.onclick = gjør; return b; };

  // Portrettet fra portrettmotoren (Karakterstudio v3) som bilde. SVG-en lages bare av kjente valg (normalize), så den er trygg.
  const portrettBilde = (k, bredde = 200) => { const img = el('img', { alt: 'Portrett av karakteren', width: bredde, height: Math.round(bredde * 740 / 600) });
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(O.P.renderSVG(O.portrett(k.portrett, k.navn))); img.style.border = '1px solid var(--rule)'; return img; };
  // Valgene i portrettet, med norske navn (som i Karakterstudio v3), fordelt på faner
  const NAVN = {
    gender: [['kvinne', 'Kvinne'], ['mann', 'Mann']], face: [['oval', 'Oval'], ['kantete', 'Kantete'], ['rund', 'Rund'], ['smal', 'Smal'], ['hjerte', 'Hjerte'], ['bred', 'Bred']],
    detail: [['ingen', 'Ingen'], ['fregner', 'Fregner'], ['arr', 'Lite arr'], ['foflekk', 'Føflekk']], expression: [['alvorlig', 'Alvorlig'], ['rolig', 'Rolig'], ['streng', 'Streng'], ['svakt-smil', 'Svakt smil'], ['bekymret', 'Bekymret']],
    eyes: [['standard', 'Normal'], ['smale', 'Smale'], ['store', 'Store'], ['mandel', 'Mandelform'], ['dyptsittende', 'Dyptsittende'], ['runde', 'Runde']],
    brows: [['normal', 'Naturlige'], ['rette', 'Rette'], ['buede', 'Buede'], ['kraftige', 'Kraftige'], ['smale', 'Smale'], ['sammenknepne', 'Sammentrukket']],
    nose: [['rett', 'Rett'], ['kort', 'Kort'], ['lang', 'Lang'], ['bred', 'Bred'], ['smal', 'Smal'], ['romersk', 'Buet']], mouth: [['normal', 'Normal'], ['smal', 'Smal'], ['fyldig', 'Fyldig'], ['bred', 'Bred'], ['asymmetrisk', 'Asymmetrisk']],
    glasses: [['ingen', 'Ingen'], ['runde', 'Runde'], ['firkantede', 'Firkantede'], ['pilot', 'Pilotbriller'], ['smale', 'Smale'], ['innfatningslose', 'Uten innfatning']],
    hair: [['sidepart', 'Sideskill'], ['short', 'Kort'], ['slick', 'Bakovergredd'], ['waves', 'Bølget'], ['bob', 'Bob'], ['long', 'Langt'], ['curly', 'Krøllet'], ['buzz', 'Maskinklipt'], ['bald', 'Skallet'], ['fringe', 'Pannelugg'], ['crop', 'Kort lugg'], ['undercut', 'Undercut'], ['quiff', 'Høy lugg'], ['pompadour', 'Pompadour'], ['shag', 'Etasjeklipt'], ['mullet', 'Hockeysveis'], ['pixie', 'Pixie'], ['braid', 'Flette'], ['ponytail', 'Hestehale'], ['afro', 'Afro'], ['curls-short', 'Korte krøller'], ['crew', 'Militærklipp']],
    facialHair: [['ingen', 'Ingen'], ['bart', 'Bart'], ['skjeggstubb', 'Skjeggstubb'], ['kort-skjegg', 'Kort skjegg'], ['helskjegg', 'Helskjegg'], ['fippskjegg', 'Fippskjegg'], ['hestesko', 'Hestesko']],
    headwear: [['ingen', 'Ingen'], ['barett', 'Beret'], ['offiserslue', 'Offiserslue'], ['strikkelue', 'Strikkelue'], ['skyggelue', 'Skyggelue']],
    outfit: [['feltuniform', 'Feltuniform'], ['arbeidsjakke', 'Arbeidsjakke'], ['skinnjakke', 'Skinnjakke'], ['jakke', 'Hverdagsjakke'], ['genser', 'Ullgenser'], ['frakk', 'Frakk'], ['hoyhalset', 'Høyhalset'], ['skjorte', 'Skjorte'], ['offisersjakke', 'Offisersjakke'], ['uniform', 'Paradeuniform'], ['marineuniform', 'Marineuniform'], ['dress', 'Mørk dress'], ['dress-gra', 'Grå dress'], ['dress-brun', 'Brun dress']],
    shirt: [['hvit', 'Hvit'], ['krem', 'Krem'], ['bla', 'Blå'], ['mork', 'Mørk']], tieStyle: [['apen', 'Åpen krage'], ['slips', 'Slips'], ['sløyfe', 'Sløyfe'], ['hoyhalset', 'Høy hals']],
  };
  const FANER = [['Ansikt', [['Kjønn', 'gender'], ['Hud', 'skin', 'skin'], ['Alder', 'age'], ['Ansiktsform', 'face'], ['Uttrykk', 'expression'], ['Kjennetegn', 'detail']]],
    ['Øyne', [['Øyne', 'eyes'], ['Øyenfarge', 'eyeColor', 'eyes'], ['Øyenbryn', 'brows'], ['Nese', 'nose'], ['Munn', 'mouth'], ['Briller', 'glasses']]],
    ['Hår', [['Frisyre', 'hair'], ['Hårfarge', 'hairColor', 'hair'], ['Grått hår', 'grayAmount'], ['Skjegg', 'facialHair'], ['Hodeplagg', 'headwear']]],
    ['Klær', [['Antrekk', 'outfit'], ['Farge', 'outfitColor', 'outfitColor'], ['Skjorte', 'shirt'], ['Krage', 'tieStyle'], ['Slips', 'tieColor', 'tie'], ['Bakgrunn', 'background', 'background']]]];
  let fane = 0;
  function flaggLerret(fl, w, h) { const c = el('canvas', { width: w, height: h }); O.tegnFlagg(c.getContext('2d'), fl, w, h); return c; }

  // ---------- hvor spillet foregår (runde 6, kritikken: steg 3 sa «Hvor som helst i Norge» på /rogaland) ----------
  // /rogaland: fylket (SPILLOMRÅDE, eller navnet fra adressen før grensa er hentet); /dovre-fliser: Dovre-kartet; /norge: hele landet
  // (OMRÅDE kan byttes ut av manifestet også på Dovre-siden, så adressen avgjør: alt som ikke er /norge eller /rogaland, er Dovre-piloten)
  const påDovre = () => typeof PÅ_NORGE !== 'undefined' && !PÅ_NORGE && typeof DOVRE !== 'undefined';
  function sted() {
    const fylke = (window.SPILLOMRÅDE && SPILLOMRÅDE.navn) || (typeof PÅ_OMRÅDE !== 'undefined' && PÅ_OMRÅDE ? PÅ_OMRÅDE[0].toUpperCase() + PÅ_OMRÅDE.slice(1) : null);
    if (fylke) return { navn: fylke, hvor: 'i ' + fylke, bb: window.SPILLOMRÅDE ? SPILLOMRÅDE.bb : null };
    if (påDovre()) return { navn: 'Dovre', hvor: 'på Dovre-kartet', bb: DOVRE };
    return { navn: 'Norge', hvor: 'i Norge', bb: null };
  }
  // Hver side har sitt eget lagrede spill (spill/lagringsside.js: /rogaland og /norge får nøklene med «@rogaland»/«@norge», /dovre-fliser
  // uten ending; runde 7). Startskjermen sier fra når det finnes et spill på en annen side (kritikken: «/rogaland startet et helt nytt spill
  // uten å si fra»). Nøklene leses rått (localStorage.key / localStorage[nøkkel]) fordi getItem alltid legger til endingen for siden.
  function andreSpill() {
    const her = window.LagringSide && LagringSide.her ? (LagringSide.her === 'dovre' ? null : LagringSide.her) : typeof PÅ_OMRÅDE !== 'undefined' && PÅ_OMRÅDE ? PÅ_OMRÅDE : null, ute = [];
    try { for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i), m = /^riksbrudd-k1(?:@(\w+))?$/.exec(n || ''); if (!m || (m[1] || null) === her) continue;
      const T = O.fraJSON(localStorage[n]); if (!T || !T.ferdig) continue;
      const dovre = T.leir && typeof DOVRE !== 'undefined' && T.leir.x >= DOVRE[0] && T.leir.x <= DOVRE[2] && T.leir.y >= DOVRE[1] && T.leir.y <= DOVRE[3];
      const hvor = m[1] ? `i ${m[1][0].toUpperCase() + m[1].slice(1)} (/${m[1]})` : dovre || window.LagringSide ? 'på Dovre (/dovre-fliser)' : 'på Norgeskartet (/norge)';
      ute.push(`«${T.fraksjon.navn}» ${hvor}`); } } catch (e) { return ''; }
    const st = sted(), eget = `Dette er et eget spill ${st.hvor}. `;
    if (!ute.length) return her ? eget + 'Det lagres i denne nettleseren, for seg.' : '';
    return eget + `Spillet ditt ${ute.join(' og ')} er lagret for seg og blir ikke rørt.`;
  }
  // Utkastet lagres underveis (kritikken: «omlasting under oppstarten sletter alt og starter på steg 1»): steget og valgene,
  // i en egen nøkkel som tas bort når leiren er lagt. Leses bare for vanlige spillere (ikke i testene, som starter skjermen selv).
  const UTKAST = NØKKEL + '-utkast'; let steget = 1, sistUtkast = '';
  function lagreUtkast(tving) { if (!utkast || (S && !tving)) return; const t = JSON.stringify({ steg: steget, utkast });
    if (t === sistUtkast) return; sistUtkast = t; try { localStorage.setItem(UTKAST, t); } catch (e) { /* privat vindu: huskes ikke */ } }
  function lesUtkast() { try { const d = JSON.parse(localStorage.getItem(UTKAST) || 'null'); if (!d || !d.utkast) return null;
    const u = O.fraJSON(JSON.stringify(d.utkast)); if (!u) return null; u.ferdig = false; u.leir = null; u.karakter.valgt = d.utkast.karakter.valgt || {};
    if (d.utkast.regler) u.regler = d.utkast.regler; return { steg: [1, 2, 3].includes(d.steg) ? d.steg : 1, utkast: u }; } catch (e) { return null; } }
  const glemUtkast = () => { sistUtkast = ''; try { localStorage.removeItem(UTKAST); } catch (e) { /* ingen lagring */ } };
  setInterval(() => { if (bak.classList.contains('på') || velger) lagreUtkast(); }, 1000);
  // Kameraet mens du velger (bare for vanlige spillere og når OppstartSpill.test er satt): spillområdet fyller skjermen.
  // dekk = true: hele skjermen er området (bakgrunnen bak startskjermen – før så man Agder bak steg 3 på /rogaland);
  // ellers hele området synlig, men på høy, smal skjerm (telefon) fyller det høyden – før var over halve skjermen tom og mørk.
  const ekte = () => !navigator.webdriver || window.OppstartSpill.test === true;
  function visOmrådet(dekk) {
    const b = sted().bb; if (!b || !ekte() || S || (typeof på3d !== 'undefined' && på3d)) return;
    const topp = (document.querySelector('.top') || { getBoundingClientRect: () => ({ bottom: 60 }) }).getBoundingClientRect().bottom, bunn = dekk || (VH <= VW && VH < 600) ? 0 : VH > VW ? 230 : 210;
    const høy = Math.max(200, VH - topp - bunn), mx = (b[2] - b[0]) / VW, my = (b[3] - b[1]) / høy;
    kam.x = (b[0] + b[2]) / 2; kam.m = dekk || VH > VW ? Math.min(mx, my) : Math.max(mx, my) * 1.04;
    kam.y = (b[1] + b[3]) / 2 + (dekk ? 0 : (topp - bunn) / 2 * kam.m); skitten = true;
  }
  function vis(steg) {
    steget = steg; visOmrådet(true); lagreUtkast();
    ark.innerHTML = ''; ark.scrollTop = 0; bak.classList.add('på');
    const k = utkast.karakter, fr = utkast.fraksjon, fl = fr.flagg, melding = el('div', { klasse: 'feil', 'aria-live': 'polite' });
    if (steg === 1) {
      ark.append(el('h2', {}, 'Riksbrudd – nytt spill'), el('div', { klasse: 'steg' }, 'Steg 1 av 3: din karakter. Norge har falt sammen. Du starter med ' + O.kroner(O.STARTPENGER) + ' og en håndfull folk.'));
      const navn = el('input', { type: 'text', maxlength: 30, placeholder: 'Navnet ditt', value: k.navn, 'aria-label': 'Navnet til karakteren' });
      const bilde = el('div'), oppd = () => { bilde.innerHTML = ''; bilde.appendChild(portrettBilde(k)); };
      navn.oninput = () => { k.navn = navn.value; };
      const valg = el('div');
      // (runde 6) det spilleren trykker på selv, huskes med kjønnet hen hadde da (Oppstart.byttKjønn beholder det)
      const velg = (felt, v) => { const p = k.portrett, vt = k.valgt || (k.valgt = {}); if (felt === 'gender') O.byttKjønn(p, v, vt); else { p[felt] = v; vt[felt] = p.gender; } };
      const lagValg = () => { valg.innerHTML = ''; const p = k.portrett;
        valg.appendChild(el('div', { klasse: 'faner', role: 'tablist', 'aria-label': 'Utseende' }, ...FANER.map(([t], i) => { const b = knapp(t, fane === i, () => { fane = i; lagValg(); }, ''); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(fane === i)); return b; })));
        for (const [tittel, felt, palett] of FANER[fane][1]) {
          valg.appendChild(el('h3', {}, tittel));
          if (palett) valg.appendChild(el('div', { klasse: 'rad' }, ...O.P.palettes[palett].map(f => { const b = knapp('', p[felt] === f, () => { velg(felt, f); lagValg(); oppd(); }, 'farge'); b.style.background = f; b.setAttribute('aria-label', tittel + ' ' + f); return b; })));
          else if (O.P.numerics[felt]) { const [min, maks] = O.P.numerics[felt], r = el('input', { type: 'range', min, max: maks, value: p[felt], 'aria-label': tittel, style: 'flex:1 1 160px; min-width:0; max-width:320px' }), v = el('span', { style: 'margin-left:8px' }, felt === 'age' ? p[felt] + ' år' : p[felt] + ' %');
            r.oninput = () => { velg(felt, +r.value); v.textContent = felt === 'age' ? r.value + ' år' : r.value + ' %'; oppd(); }; valg.appendChild(el('div', { klasse: 'rad' }, r, v)); }
          else valg.appendChild(el('div', { klasse: 'rad' }, ...NAVN[felt].map(([v, t]) => knapp(t, p[felt] === v, () => { velg(felt, v); lagValg(); oppd(); }))));
        }
        valg.appendChild(el('div', { klasse: 'rad', style: 'margin-top:12px' }, knapp('Tilfeldig utseende', false, () => { k.portrett = O.portrett(O.tilfeldigPortrett(), k.navn); k.valgt = {}; lagValg(); oppd(); })));
      };
      lagValg(); oppd();
      const bg = el('div', { klasse: 'bakgrunn' });
      const lagBg = () => { bg.innerHTML = ''; for (const [id, b] of Object.entries(O.BAKGRUNNER)) { const kn = knapp('', k.bakgrunn === id, () => { k.bakgrunn = id; lagBg(); }); kn.append(el('b', {}, b.navn), el('small', {}, b.tekst)); bg.appendChild(kn); } };
      lagBg();
      const lagret = andreSpill();
      if (lagret) ark.append(el('div', { klasse: 'lagret' }, lagret));
      ark.append(el('div', { klasse: 'to' }, el('div', {}, el('h3', {}, 'Navn'), navn, el('h3', { style: 'margin-top:18px' }, 'Utseende'), valg, el('h3', {}, 'Bakgrunn (gir en liten bonus)'), bg),
        el('div', { klasse: 'bilde' }, bilde)), melding,
        el('div', { klasse: 'bunn' }, el('span'), knapp('Neste: fraksjonen →', false, () => { if (k.navn.trim().length < 2) { melding.textContent = 'Skriv et navn (minst 2 tegn).'; return; } vis(2); })));
      // (runde 8, kritikken: på telefon spratt tastaturet opp før man hadde sett skjermen) – fokus i navnefeltet bare med mus og tastatur
      const berøring = window.matchMedia && (matchMedia('(pointer: coarse)').matches || matchMedia('(hover: none)').matches);
      if (!berøring) setTimeout(() => navn.focus(), 50);
    } else if (steg === 2) {
      ark.append(el('h2', {}, 'Din fraksjon'), el('div', { klasse: 'steg' }, 'Steg 2 av 3: navn og flagg. Fargen i flagget blir fargen til lagene dine på kartet.'));
      const navn = el('input', { type: 'text', maxlength: 40, placeholder: 'Navnet på fraksjonen', value: fr.navn, 'aria-label': 'Navnet på fraksjonen' }); navn.oninput = () => { fr.navn = navn.value; };
      const stort = el('canvas', { width: 300, height: 200, 'aria-label': 'Flagget' }), tegn = () => O.tegnFlagg(stort.getContext('2d'), fl, 300, 200), red = el('div');
      const fargerad = (hent, sett, tittel) => el('div', {}, el('h3', {}, tittel), el('div', { klasse: 'rad' }, ...O.FARGER.map(f => { const b = knapp('', hent() === f, () => { sett(f); lag(); }, 'farge'); b.style.background = f; b.setAttribute('aria-label', tittel + ' ' + f); return b; })));
      const lag = () => { red.innerHTML = ''; tegn();
        red.append(el('h3', {}, 'Mønster'), el('div', { klasse: 'rad' }, ...O.MØNSTER.map(m => { const b = knapp('', fl.mønster === m, () => { fl.mønster = m; lag(); }, 'ikon'); b.title = m; b.setAttribute('aria-label', 'Mønster ' + m);
          b.appendChild(flaggLerret({ ...fl, mønster: m, symbol: 'ingen', bokstaver: '' }, 38, 26)); return b; })),
          fargerad(() => fl.farger[0], f => { fl.farger[0] = f; }, 'Farge 1'), fargerad(() => fl.farger[1], f => { fl.farger[1] = f; }, 'Farge 2'), fargerad(() => fl.farger[2], f => { fl.farger[2] = f; }, 'Farge 3'),
          el('h3', {}, 'Symbol'), el('div', { klasse: 'rad' }, ...O.SYMBOL.map(s => { const b = knapp('', fl.symbol === s, () => { fl.symbol = s; lag(); }, 'ikon'); b.title = s; b.setAttribute('aria-label', 'Symbol ' + s);
            const c = el('canvas', { width: 38, height: 38 }); c.style.border = '0'; if (s !== 'ingen') O.tegnSymbol(c.getContext('2d'), s, 19, 19, 15, '#e7dcc3'); else { const g = c.getContext('2d'); g.strokeStyle = '#e7dcc3'; g.beginPath(); g.moveTo(8, 8); g.lineTo(30, 30); g.stroke(); }
            b.appendChild(c); return b; })),
          fargerad(() => fl.symbolfarge, f => { fl.symbolfarge = f; }, 'Farge på symbolet'));
        const bokst = el('input', { type: 'text', maxlength: 3, placeholder: 'f.eks. DF', value: fl.bokstaver || '', 'aria-label': 'Bokstaver i flagget', style: 'max-width:120px' });
        bokst.oninput = () => { fl.bokstaver = bokst.value.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3); tegn(); };
        red.append(el('h3', {}, 'Bokstaver (høyst 3)'), bokst, fargerad(() => fl.bokstavfarge, f => { fl.bokstavfarge = f; }, 'Farge på bokstavene')); };
      lag();
      ark.append(el('h3', {}, 'Navn'), navn, el('div', { klasse: 'to' }, el('div', {}, red), el('div', { klasse: 'flaggboks' }, el('h3', {}, 'Flagget'), stort)), melding,
        el('div', { klasse: 'bunn' }, knapp('← Tilbake', false, () => vis(1)), knapp('Neste: plass til leiren →', false, () => { const f = O.feil(utkast); if (f.length) { melding.textContent = f.join(' '); return; } vis(3); })));
    } else {
      // spillformen (spill/scenario.js): vanskelighetsgrad, utfordringer og scenario velges her, før leiren
      const SC = window.Scenario, rg = utkast.regler || (utkast.regler = { vanskelighet: 'vanlig', utfordringer: [], scenario: null }), form = el('div', { id: 'formvalg' });
      const lagForm = () => { form.innerHTML = ''; if (!SC) return;
        form.append(el('h3', {}, 'Vanskelighetsgrad'));
        const v = el('div', { klasse: 'bakgrunn' }); for (const [id, V] of Object.entries(SC.REGLER.vanskelighet)) { const kn = knapp('', rg.vanskelighet === id, () => { rg.vanskelighet = id; lagForm(); }); kn.dataset.vansk = id; kn.append(el('b', {}, V.navn), el('small', {}, V.tekst)); v.appendChild(kn); } form.append(v);
        form.append(el('h3', {}, 'Scenario (mål med tidsfrist)'));
        const sc = el('div', { klasse: 'bakgrunn' }), fritt = knapp('', !rg.scenario, () => { rg.scenario = null; lagForm(); }); fritt.append(el('b', {}, 'Fritt spill'), el('small', {}, 'Ingen frist. Vinn regionen når du vil.')); sc.appendChild(fritt);
        for (const [id, S2] of Object.entries(SC.SCENARIER)) { const kn = knapp('', rg.scenario === id, () => { rg.scenario = id; lagForm(); }); kn.dataset.scenario = id; kn.append(el('b', {}, S2.navn), el('small', {}, S2.tekst)); sc.appendChild(kn); } form.append(sc);
        form.append(el('h3', {}, 'Utfordringer (valgfritt – gjør spillet vanskeligere)'));
        const u = el('div', { klasse: 'bakgrunn' }); for (const [id, U] of Object.entries(SC.REGLER.utfordringer)) { const på = rg.utfordringer.includes(id), kn = knapp('', på, () => { if (på) rg.utfordringer = rg.utfordringer.filter(q => q !== id); else rg.utfordringer.push(id); lagForm(); }); kn.dataset.utfordring = id; kn.setAttribute('aria-pressed', String(på)); kn.append(el('b', {}, (på ? '☑ ' : '☐ ') + U.navn), el('small', {}, U.tekst)); u.appendChild(kn); } form.append(u);
        form.append(el('div', { klasse: 'steg' }, 'Du starter med ' + O.kroner(Math.round((O.STARTPENGER + (O.BAKGRUNNER[k.bakgrunn].bonus.penger || 0)) * SC.regler(rg).faktor.penger)) + ', ti personer og et lite vaktlag. Troppene lager du selv av folkene dine (Leir → Tropper).')); };
      lagForm();
      ark.append(el('h2', {}, 'Spillform og plass til leiren'), el('div', { klasse: 'steg' }, `Steg 3 av 3: velg hvordan du vil spille, og trykk så på kartet der leiren skal ligge. Hvor som helst ${sted().hvor} – men ikke inne i et tettsted, i vann eller i en bratt li: de første byggene (brakke, dieseltank, aggregat og vakttårn) trenger flat grunn.`), form,
        el('div', { klasse: 'bunn' }, knapp('← Tilbake', false, () => vis(2)), knapp('Velg på kartet', false, startVelg)));
    }
  }
  // ---------- velge leirplass på kartet ----------
  function startVelg() { bak.classList.remove('på'); if (window.visHjelp) visHjelp(false); velger = true; forslag = null; gjemStart(); visOmrådet(false);
    visBanner(`Trykk på kartet der leiren skal ligge – hvor som helst ${sted().hvor}. Velg et flatt sted, gjerne i en dalbunn. Zoom og flytt kartet som vanlig.`); }
  function visBanner(tekst, kanBekrefte, mer) {
    banner.innerHTML = ''; banner.classList.add('på'); banner.append(el('div', {}, tekst));
    if (mer) {
      // (runde 8) hvorfor stedet ikke går (bratt, vann), og forslaget med «Flytt hit» – først, det er det viktigste
      if (mer.stopp) banner.append(el('div', { klasse: 'stopp' }, '✋ ' + mer.stopp));
      if (mer.flytt) banner.append(el('div', { klasse: 'flytt' }, mer.flytt.tekst));
      for (const a of mer.adv || []) banner.append(el('div', { klasse: 'adv' }, '⚠ ' + a));
      if (mer.fakta && mer.fakta.length) banner.append(el('div', { klasse: 'fakta' }, mer.fakta.join(' · ')));
      if (mer.kai) banner.append(el('div', { klasse: 'kai' }, mer.kai));
      if (mer.venter) banner.append(el('div', { klasse: 'fakta venter' }, mer.venter)); }
    if (mer && mer.flytt) { const b = knapp('Flytt hit', false, () => flyttHit(mer.flytt), 'valg'); b.id = 'flytthit'; banner.append(b); }
    if (kanBekrefte) banner.append(knapp('Legg leiren her', false, bekreft, 'valg'));
    banner.append(knapp('Tilbake til valgene', false, () => { velger = false; forslag = null; banner.classList.remove('på'); vis(2); skitten = true; }, 'valg'));
    synligForslag();
  }
  // (runde 8, kritikken på telefon: banneret dekket flagget midt på skjermen) – ligger stedet under banneret eller statuslinja, flyttes
  // kartet så det står midt i det frie feltet over banneret
  function synligForslag() {
    if (!velger || !forslag || !ekte()) return; const br = banner.getBoundingClientRect(), c = document.getElementById('c'), cr = c ? c.getBoundingClientRect() : { top: 0, left: 0 };
    const topp = (document.querySelector('.top') || { getBoundingClientRect: () => ({ bottom: 60 }) }).getBoundingClientRect().bottom;
    const sy = cr.top + VH / 2 + (kam.y - forslag.y) / kam.m, sx = cr.left + VW / 2 + (forslag.x - kam.x) / kam.m, under = sy > br.top - 50 && sx > br.left - 30 && sx < br.right + 30;
    if (!under && sy > topp + 30) return; const mål = (topp + br.top) / 2;
    if (br.top - topp < 120) return;
    kam.y = forslag.y + (mål - cr.top - VH / 2) * kam.m; skitten = true;
  }
  // klassen (vann = 3, utenfor kartet = 255) i 32 m-rutenettet rundt punktet
  async function klasseVed(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false); const [i, j] = Terreng.rute(v, x, y); return v.K[j * v.w + i]; } catch (e) { return undefined; } }
  const iTettsted = (x, y) => { const by = ((typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || []).find(b => b.bb[0] <= x && x <= b.bb[2] && b.bb[1] <= y && y <= b.bb[3] && window.Garnison && Garnison.inni(b, x, y)); return by ? by.e.navn : null; };
  const riksgrense = () => (typeof RIKSGRENSE !== 'undefined' && RIKSGRENSE && window.Riksgrense ? RIKSGRENSE : null);   // RIKSGRENSE er en let i index.html
  // Kan leiren ligge her (uten å se på arealklassen – den sjekkes for seg)? Brukes for forslagene (Flytt hit).
  function lovligLeir(X, Y) { const rg = riksgrense();
    return !O.gyldigLeir(X, Y, { iTettsted, klasse: () => 2, iNorge: rg ? (A, B) => Riksgrense.iNorge(rg, A, B) : null }) && !(window.SPILLOMRÅDE && !Omraade.inni(SPILLOMRÅDE, X, Y)); }
  async function prøvLeir(x, y) {
    const rg = riksgrense();
    const kl = await klasseVed(x, y); let grunn = O.gyldigLeir(x, y, { iTettsted, klasse: () => kl, iNorge: rg ? (X, Y) => Riksgrense.iNorge(rg, X, Y) : null });
    // et mindre spillkart (/rogaland): leiren må ligge innenfor
    if (!grunn && window.SPILLOMRÅDE && !Omraade.inni(SPILLOMRÅDE, x, y)) grunn = `Leiren må ligge i ${SPILLOMRÅDE.navn}. Dette er utenfor spillkartet.`;
    // (runde 8) for vanlige spillere kan leiren først bekreftes når terrenget er sjekket (sjekker = true til da); testene som før
    forslag = { x, y, ok: !grunn, sjekker: !grunn && !!window.Helling && ekte() }; skitten = true;
    let h = null; try { h = hoydeVed(x, y); } catch (e) { /* ingen høyde her */ }
    // (18. nov, runde 4) andre moduler kan si noe om stedet: window.LEIRVALG_TILLEGG = [(x, y) => tekst] (kaier.js: nærmeste kai)
    const til = grunn ? [] : (window.LEIRVALG_TILLEGG || []).map(f => { try { return f(x, y) || ''; } catch (e) { return ''; } }).filter(Boolean);
    // (runde 6) kaiteksten bare der det betyr noe; vurderingen av stedet (høyfjell, skog, veg, folk) kommer når terrenget er målt
    const først = grunn || (h != null ? `Her? ${Math.round(h)} moh.` : 'Her?');
    // (runde 8, kritikken: et trykk i en tynn elvestrek ga bare «Leiren kan ikke ligge i vann») – vann og tettsted: forslag til nærmeste sted
    const kanFlytte = grunn && window.Helling && ekte() && (kl === 3 || /tettsted/.test(grunn));
    visBanner(først, !grunn && !forslag.sjekker, grunn ? (kanFlytte ? { venter: 'Ser etter nærmeste sted der leiren får plass …' } : null)
      : { kai: window.Leirvalg ? '' : til.join(' '), venter: forslag.sjekker ? 'Sjekker om det er flatt nok for de første byggene …' : '' });
    // feiler målingen, eller tar den over 25 s (tregt nett), kan leiren legges her likevel – ellers ville spilleren stått fast
    const fs = forslag, slipp = () => { if (forslag !== fs || !fs.sjekker || !velger) return; fs.sjekker = false; skitten = true;
      visBanner(først, fs.ok, { adv: ['Fikk ikke sjekket terrenget rundt stedet. Du kan legge leiren her likevel.'], kai: til.join(' ') }); };
    if (!grunn && window.Leirvalg) { vurderSted(x, y, h, til).catch(e => { console.error(e); slipp(); }); if (fs.sjekker) setTimeout(slipp, 25000); }
    else if (kanFlytte) foreslå(x, y, grunn, kl === 3).catch(e => console.error(e));
    return grunn;
  }
  // (runde 8) Flat plass for de første byggene (Helling.førsteBygg) rundt stedet; går det ikke, nærmeste sted der det går (finnPlass).
  // kv: et vindu med arealklassene (32 m) som dekker søket. -> { ok, r, f (forslag eller null), søkt } eller null uten høydedata.
  async function flatSjekk(x, y, kv) {
    // i testene (navigator.webdriver) bare når OppstartSpill.test er satt – kontrollskriptet bekrefter leiren straks, som før
    const HL = window.Helling; if (!HL || !ekte()) return null;
    const R = HL.REGLER, nær = R.nær + 30, tørt = HL.tørtFra(HL.klasseFra(kv));
    let hv = null; try { hv = await lagVindu([x - nær, y - nær, x + nær, y + nær], false, 11); } catch (e) { return null; }
    const høyde = HL.høydeFra(hv), r = HL.førsteBygg(høyde, tørt, x, y, { flatFørst: true });
    // uten høyder midt på stedet kan vi ikke si noe – leiren godtas som før
    if (r.ok || r.nivå === HL.UKJENT) return { ok: true, r, høyde };
    const S = R.søk + nær; let hs = null; try { hs = await lagVindu([x - S, y - S, x + S, y + S], false, 11); } catch (e) { hs = null; }
    const f = hs ? HL.finnPlass(HL.høydeFra(hs), tørt, x, y, { lovlig: lovligLeir, flatFørst: true }) : null;
    return { ok: false, r, f, søkt: true };
  }
  const flyttTekst = (f, hva) => `${hva}: ${Helling.meter(f.m)} ${f.retning}${f.h != null ? ` (${Math.round(f.h)} moh.)` : ''}. Det grønne flagget («Plass her») viser stedet.`;
  // høyden på et forslag (fra kartet, ellers ingen)
  const høydeHer = (X, Y) => { try { return hoydeVed(X, Y); } catch (e) { return null; } };
  // vann eller tettsted: let etter nærmeste lovlige sted med plass til de første byggene
  async function foreslå(x, y, grunn, vann) {
    const fs = forslag, HL = Helling, S = HL.REGLER.søk + HL.REGLER.nær + 30;
    let kv = null; try { kv = await lagVindu([x - S, y - S, x + S, y + S], false); } catch (e) { kv = null; }
    if (!velger || forslag !== fs || !kv) return;
    let hs = null; try { hs = await lagVindu([x - S, y - S, x + S, y + S], false, 11); } catch (e) { hs = null; }
    if (!velger || forslag !== fs) return;
    const f = hs ? HL.finnPlass(HL.høydeFra(hs), HL.tørtFra(HL.klasseFra(kv)), x, y, { lovlig: lovligLeir, flatFørst: true }) : null;
    if (f) { f.h = høydeHer(f.x, f.y); fs.flytt = f; skitten = true; }
    visBanner(grunn, false, f ? { flytt: { ...f, tekst: flyttTekst(f, vann ? 'Nærmeste tørre sted med plass til leiren' : 'Nærmeste sted utenfor tettstedet med plass til leiren') } }
      : { adv: [`Fant ikke noe tørt, flatt sted innen ${HL.meter(HL.REGLER.søk)}. Trykk et annet sted i kartet.`] });
  }
  // «Flytt hit»: kartet går dit, og stedet prøves på nytt (samme sjekk som et trykk)
  function flyttHit(f) { if (!velger) return; kam.x = f.x; kam.y = f.y; skitten = true; return prøvLeir(f.x, f.y); }
  // Måler terrenget rundt stedet (Leirvalg.REGLER.radius) og viser advarslene i banneret – bare hvis forslaget fortsatt står
  async function vurderSted(x, y, h, kai) {
    const R = Leirvalg.REGLER.radius, f = forslag;
    let v = null; try { v = await lagVindu([x - R, y - R, x + R, y + R], true); } catch (e) { v = null; }
    if (!velger || forslag !== f) return;
    // (runde 8) helling: får de første byggene plass på flat, tørr grunn? (vinduet over dekker søket: radius 2500 m)
    let fl = null; try { fl = await flatSjekk(x, y, v); } catch (e) { console.error(e); fl = null; }
    if (!velger || forslag !== f) return;
    // høyden fra vinduet når kartet ikke hadde den (stedet utenfor bildet eller ikke lastet ennå)
    if (h == null && v && window.Terreng) try { const [i, j] = Terreng.rute(v, x, y), z = v.H[j * v.w + i]; if (z === z) h = z; } catch (e) { /* utenfor vinduet */ }
    const m = Leirvalg.måle(v, x, y), tg = window.Vegetasjon && Vegetasjon.tregrense ? Vegetasjon.tregrense(y, x) : null;
    let by = null; for (const b of ((typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [])) { const dx = Math.max(b.bb[0] - x, 0, x - b.bb[2]), dy = Math.max(b.bb[1] - y, 0, y - b.bb[3]), d = Math.hypot(dx, dy);
      if (!by || d < by.m) by = { navn: b.e.navn, m: d }; }
    const vu = Leirvalg.vurder(m, { h, tregrense: tg, by }), HL = window.Helling;
    // grunnen der leiren står (flat / skrå med grunnmur) står først i faktalinja; går det ikke, kan leiren ikke bekreftes her
    let stopp = null, flytt = null;
    if (fl && fl.ok && fl.r && HL) {
      // flagget står bratt eller i vann, men brakka får plass like ved: si hvor, og tilby å flytte flagget dit (ikke nødvendig)
      const b0 = fl.r.plasser && fl.r.plasser[0], m0 = b0 ? Math.hypot(b0.x - x, b0.y - y) : 0;
      const skråHer = fl.r.nivå === HL.SKRÅTT && b0 && HL.vurderer(b0.type, 0, fl.høyde, null)(b0.x, b0.y) === HL.FLATT;
      if (b0 && m0 > 1 && (fl.r.nivå === HL.BRATT || fl.r.nivå === HL.VANN || skråHer)) { const g = { x: b0.x, y: b0.y, m: m0, retning: HL.retning(b0.x - x, b0.y - y) };
        const hva = fl.r.nivå === HL.VANN ? 'vått' : fl.r.nivå === HL.BRATT ? 'bratt' : 'skrått (byggene får grunnmur)';
        if (lovligLeir(g.x, g.y)) { g.h = høydeHer(g.x, g.y); f.flytt = g; flytt = { ...g, tekst: `Det er ${hva} der flagget står, men ${skråHer ? 'flatt' : 'flatt nok'} ${HL.meter(m0)} ${g.retning} – der kan brakka stå. Du kan flytte flagget dit.` }; }
        vu.fakta.unshift(skråHer ? 'grunnen: litt skrå ved flagget, flat like ved' : 'grunnen: bratt ved flagget, flat like ved'); }
      else if (fl.r.nivå === HL.SKRÅTT) vu.fakta.unshift('grunnen: litt skrå (byggene får grunnmur)');
      else if (fl.r.nivå === HL.FLATT) vu.fakta.unshift('grunnen: flat'); }
    if (fl && !fl.ok) { stopp = HL.brattTekst(fl.r); f.ok = false; f.bratt = true;
      if (fl.f) { fl.f.h = høydeHer(fl.f.x, fl.f.y); f.flytt = fl.f; flytt = { ...fl.f, tekst: flyttTekst(fl.f, 'Nærmeste flate sted') }; }
      else vu.advarsler.unshift(`Fant ikke noe flatt nok sted innen ${HL.meter(HL.REGLER.søk)}. Trykk et annet sted – en dalbunn eller et platå.`); }
    // når grunnen ikke er flat: hva fargene i kartet betyr (helling-visning.js viser dem når du zoomer inn)
    if ((stopp || flytt) && window.HellingVis) vu.fakta.push(kam.m <= HellingVis.REGLER.maksM ? 'i kartet: grønt = flatt, gult = skrått, rødt = for bratt' : 'zoom inn for å se i kartet hvor det er flatt');
    f.sjekker = false; skitten = true;
    visBanner(h != null ? `Her? ${Math.round(h)} moh.` : 'Her?', f.ok, { stopp, flytt, adv: vu.advarsler, fakta: vu.fakta, kai: kai.map(t => Leirvalg.kaiTekst(t, m.sjø)).filter(Boolean).join(' ') });
  }
  function bekreft() {
    if (!forslag || !forslag.ok || forslag.sjekker) return;
    // nye spill starter uten ferdige lag (brukeren 17. nov: «jeg skal selv måtte lage troppene») – i testene som før, til OppstartSpill.test er satt
    utkast.utenLag = !navigator.webdriver || window.OppstartSpill.test === true;
    // lett start (balansen 18. nov, Claudes forslag): nye spill har bare lastebil og speiderbil – stridsvogna og rakettartilleriet
    // bar forsvaret alene de første døgnene. De kan bygges på basen for olje senere.
    utkast.lettStart = utkast.utenLag;
    const f = O.fullfør(utkast, forslag, window.Scenario ? Scenario.regler(utkast.regler).faktor.penger : 1); if (f.length) { visBanner(f.join(' ')); return; }
    S = utkast; velger = false; forslag = null; banner.classList.remove('på'); glemUtkast(); gjemTilbake(); lagre(); bruk(true); skitten = true;
    // (17. nov) kartet går inn på leiren når den er lagt – før sto det igjen på hele landsdelen, og du så ikke leiren din
    if (typeof på3d === 'undefined' || !på3d) { kam.x = S.leir.x; kam.y = S.leir.y; kam.m = Math.min(kam.m, 3); skitten = true; }
  }
  // først i rekka: mens du velger leirplass, skal et trykk der et lag eller kjøretøy står, gi leirforslag og ikke åpne panelet
  KROKER.trykk.unshift((X, Y) => { if (!velger) return false; prøvLeir(X, Y); return true; });
  KROKER.trykk3d.unshift((X, Y) => { if (!velger) return false; prøvLeir(X, Y); return true; });

  // ---------- før spillet er startet: ingen ferdige lag (runde 6, kritikken) ----------
  // Dovre-pilotens lag, kjøretøy og «Hovedbase Dombås» sto i kartet mens du valgte leirplass – også på /norge og /rogaland, med lapper
  // oppå hverandre – mens teksten sa at du starter med ti personer. For vanlige spillere tas de ut av ENHETER/KJORETOY til leiren er
  // lagt (gjemTilbake setter dem inn på samme plass i listene, og bruk(true) gjør resten som før: Vaktlaget blir igjen, de tunge
  // kjøretøyene går). Basen flyttes langt ut av kartet til den får leirens plass. I testene (navigator.webdriver) skjer ingenting av
  // dette før OppstartSpill.test er satt – kontrollskriptet bruker lagene som før.
  const GJEMT = { lag: [], kj: [], base: null };
  function gjemStart(tving) {
    if (!tving && (S || !ekte())) return 0; let n = 0;
    for (let i = ENHETER.length - 1; i >= 0; i--) { const e = ENHETER[i]; if (e.side !== 'blå' || e.karakter) continue; GJEMT.lag.push([i, e]); ENHETER.splice(i, 1); n++; if (valgt === e) { valgt = null; visPanel(); } }
    if (window.KJORETOY) for (let i = KJORETOY.length - 1; i >= 0; i--) { const k = KJORETOY[i]; if (k.side !== 'blå') continue; GJEMT.kj.push([i, k]); KJORETOY.splice(i, 1); n++; if (valgt === k) { valgt = null; visPanel(); } }
    const B = window.OLJE && OLJE.BASER && OLJE.BASER[0]; if (B && !GJEMT.base && B.x > -1e6) { GJEMT.base = { x: B.x, y: B.y }; B.x = B.y = -9e6; n++; }
    if (n) skitten = true; return n;
  }
  // tilbake i samme rekkefølge (lavest plass først – de ble tatt ut bakfra, så lista snus)
  function gjemTilbake() {
    const inn = (liste, arr) => { arr.sort((a, b) => a[0] - b[0]); for (const [i, e] of arr) if (!liste.includes(e)) liste.splice(Math.min(i, liste.length), 0, e); arr.length = 0; };
    inn(ENHETER, GJEMT.lag); if (window.KJORETOY) inn(KJORETOY, GJEMT.kj);
    const B = window.OLJE && OLJE.BASER && OLJE.BASER[0]; if (B && GJEMT.base) Object.assign(B, GJEMT.base); GJEMT.base = null; skitten = true;
  }
  // nye lag som modulene legger inn senere (mens startskjermen står), gjemmes også – sjekkes i tegnekroken, billig
  KROKER.tegn.push(() => { if (!S && (GJEMT.lag.length || GJEMT.kj.length || GJEMT.base) && (ENHETER.some(e => e.side === 'blå' && !e.karakter) || (window.KJORETOY || []).some(k => k.side === 'blå'))) gjemStart(); });

  // ---------- valgene tas i bruk: fraksjonen tar over «blå», basen og lagene flytter til leiren ----------
  // START UTEN FERDIGE LAG (natt 18. nov): et nytt spill har bare deg, de ti personene og et lite vaktlag (4 mann av 1. lag) – resten av
  // startlagene tas ut av ENHETER. Når et slikt spill lastes inn igjen, tas alle startlagene ut, og spill/lagring.js setter inn de lagrede.
  let startlagBorte = false;
  function fjernStartlag(ny) {
    if (startlagBorte) return; startlagBorte = true;
    const start = ENHETER.filter(s => s.side === 'blå' && !s.karakter && !s.fraFolk && !s.leirvakt && !s.ai), n = window.Scenario ? Scenario.REGLER.vaktlag : 4;
    start.forEach((s, i) => { if (ny && i === 0) { s.menn = s.menn.slice(0, n); s.leder = 0; s.navn = 'Vaktlaget'; s.speider = false; return; }
      const k = ENHETER.indexOf(s); if (k >= 0) ENHETER.splice(k, 1); if (valgt === s) { valgt = null; visPanel(); } });
  }
  let tungeBorte = false;
  function fjernTunge() {
    if (tungeBorte || !window.KJORETOY) return; tungeBorte = true;
    for (const k of KJORETOY.filter(q => q.side === 'blå' && (q.type === 'stridsvogn' || q.type === 'rakettartilleri'))) KJORETOY.splice(KJORETOY.indexOf(k), 1);
  }
  function bruk(ny) {
    if (S.utenLag) fjernStartlag(ny);
    if (S.lettStart) fjernTunge();
    const fl = S.fraksjon.flagg, farge = O.hovedfarge(fl), lys = O.nyanse(farge, 1.35), n = parseInt(lys.slice(1), 16);
    flaggC = null;
    if (window.Fraksjoner) { const navn = S.fraksjon.navn; Object.assign(Fraksjoner.FRAKSJONER.blå, { navn, eieform: /[sxz]$/i.test(navn) ? navn + "'" : navn + 's', farge, lys, sti: `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},.9)` }); }
    const L = S.leir;
    if (window.OLJE && OLJE.BASER[0]) Object.assign(OLJE.BASER[0], { navn: 'Leiren til ' + S.fraksjon.navn, x: L.x, y: L.y });
    // lagene og kjøretøyene samles rundt leiren (bare når de står langt unna, så ikke en lagret leir flytter dem hver gang)
    const egne = ENHETER.filter(s => s.side === 'blå'), kj = (window.KJORETOY || []).filter(k => k.side === 'blå');
    if (ny || egne.some(s => Math.hypot(s.x - L.x, s.y - L.y) > 20000)) {
      egne.forEach((s, i) => { const a = i / Math.max(1, egne.length) * 6.283; s.x = L.x + Math.cos(a) * 380; s.y = L.y + Math.sin(a) * 380; s.sti = null; s.siktSkitten = true; });
      kj.forEach((k, i) => { k.x = L.x + 160 + i * 45; k.y = L.y - 200; k.sti = null; });
      påLand(L, egne, kj);
    }
    // utenfor Dovre-piloten (/norge): lagene heter ikke lenger «… Dombås», og motstanderne flytter til tettstedene rundt leiren
    if (L.x < DOVRE[0] - 10000 || L.x > DOVRE[2] + 10000 || L.y < DOVRE[1] - 10000 || L.y > DOVRE[3] + 10000) {
      for (const s of egne) s.navn = s.navn.replace(/, Dombås$/, '');
      if (window.AI && AI.flytt) AI.flytt(L).catch(e => console.error(e));
    }
    visPenger(); visNyttKnapp();
    // andre moduler (leiren i K2) får vite at spillet er klart
    window.dispatchEvent(new Event('riksbrudd-spill'));
    if (ny) { kam.x = L.x; kam.y = L.y; skitten = true;
      logg(`${S.karakter.navn} (${O.BAKGRUNNER[S.karakter.bakgrunn].navn.toLowerCase()}) leder ${S.fraksjon.navn}. Leiren er satt opp, og dere har ${O.kroner(S.penger)}.`);
      if (S.utenLag) logg('Du har ingen ferdige lag – bare Vaktlaget (4 mann). Lag troppene selv av folkene dine: Leir → Tropper → «Lag ny tropp».');
      if (S.lettStart) logg('Råd: bygg brakke, dieseltank og aggregat først, så en tropp og et vakttårn. Kjøp mat i Folk-panelet før den tar slutt (den rekker noen få døgn), eller bygg drivhus. Kontrollrommet (9 mill. kr) kan vente.'); }
    else { logg(`Velkommen tilbake, ${S.karakter.navn}. ${S.fraksjon.navn} har ${O.kroner(S.penger)} i kassa.`);
      // Et lagret spill åpnet før med hele landet i bildet (200 km-målestokk), og leiren var en prikk. Nå står kartet over leiren.
      // Ikke i testene (kontrollskriptet regner med startbildet), og ikke når adressen selv sier hvor kartet skal stå.
      if (!navigator.webdriver && !/[#&?](x|kart|pos)=/.test(location.href)) { kam.x = L.x; kam.y = L.y; kam.m = Math.min(kam.m, 8); skitten = true; } }
  }
  // Ringen rundt leiren kan ligge i sjøen eller i en fjellvegg (feilretting 12. nov: leir på en holme ved Reine satte alle lagene og
  // kjøretøyene i sjøen). Når terrenget rundt leiren er hentet, flyttes de til land som henger sammen med leiren, kjøretøyene helst til
  // en veg (regelen: Oppstart.startplasser). Bare de som fortsatt står der ringen satte dem – et lagret spill (spill/lagring.js) kan
  // ha satt dem tilbake der de sto i mellomtiden.
  async function påLand(L, egne, kj) {
    const før = egne.concat(kj).map(e => [e, e.x, e.y]);
    try {
      const v = await lagVindu([L.x - 1000, L.y - 1000, L.x + 1000, L.y + 1000], true), p = O.startplasser(L, egne.length, kj.length, v);
      if (!S || S.leir !== L || før.some(([e, x, y]) => e.x !== x || e.y !== y)) return null;
      egne.forEach((s, i) => { [s.x, s.y] = p.lag[i]; s.sti = null; s.siktSkitten = true; }); kj.forEach((k, i) => { [k.x, k.y] = p.kj[i]; k.sti = null; });
      skitten = true; if (p.iVann) logg('Det er ikke land nok rundt leiren til alle lagene – noen står i vannet. Flytt dem inn på land.');
      return p;
    } catch (e) { console.error(e); return null; }
  }
  // bonusene: sikt (politi) og treff (soldat) for egne lag
  KROKER.sikt.push(s => (s.side === 'blå' ? O.bonus(S).sikt || 1 : 1));
  KROKER.ild.push((a) => (a.side === 'blå' ? O.bonus(S).treff || 1 : 1));

  // ---------- kartet: leiren med flagget (og forslaget mens du velger) ----------
  const flaggBilde = () => flaggC || (S ? (flaggC = flaggLerret(S.fraksjon.flagg, 60, 40)) : null);
  function tegnLeir(g, x, y, ok, navn) {
    g.save(); g.strokeStyle = '#e7dcc3'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 38); g.stroke();
    const f = flaggBilde(); if (f && ok !== false && !forslag) { g.drawImage(f, x + 1, y - 38, 30, 20); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.strokeRect(x + 1, y - 38, 30, 20); }
    else { g.fillStyle = ok ? '#e0b53a' : '#c8102e'; g.fillRect(x + 1, y - 38, 24, 16); }
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 6.283); g.fill();
    if (navn) { g.font = '600 15px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; const ny = window.Etikett && !forslag ? Etikett.tekst(g, navn, x, y + 16, 1) : y + 16; g.strokeText(navn, x, ny); g.fillStyle = '#f2ead6'; g.fillText(navn, x, ny); }
    g.restore();
  }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (forslag) { const [x, y] = tilSkjerm(forslag.x, forslag.y, vx0, vy1); tegnLeir(g, x, y, forslag.ok, forslag.ok ? 'Leiren her?' : null);
      // (runde 8) forslaget fra «Flytt hit»: et grønt flagg og en stiplet strek dit
      const fl = forslag.flytt; if (fl) { const [fx, fy] = tilSkjerm(fl.x, fl.y, vx0, vy1);
        g.save(); g.strokeStyle = 'rgba(191,230,180,.8)'; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(x, y); g.lineTo(fx, fy); g.stroke(); g.setLineDash([]);
        g.strokeStyle = '#e7dcc3'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 30); g.stroke(); g.fillStyle = '#6fc46a'; g.fillRect(fx + 1, fy - 30, 20, 13);
        g.font = '600 14px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText('Plass her', fx, fy + 15); g.fillStyle = '#d9f2cf'; g.fillText('Plass her', fx, fy + 15); g.restore(); } }
    else if (S && S.leir) { const [x, y] = tilSkjerm(S.leir.x, S.leir.y, vx0, vy1); if (x > -60 && y > -60 && x < VW + 60 && y < VH + 60) tegnLeir(g, x, y, true, S.fraksjon.navn + (typeof leirTillegg === 'function' ? leirTillegg() : '')); }
  });
  KROKER.tegn3d.push((g, proj3) => {
    if (!S || !S.leir) return; const p = proj3(S.leir.x, S.leir.y); if (!p) return;
    g.save(); g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; const ny = window.Etikett ? Etikett.tekst(g, S.fraksjon.navn, p[0], p[1] + 18, 1) : p[1] + 18; g.strokeText(S.fraksjon.navn, p[0], ny); g.fillStyle = '#f2ead6'; g.fillText(S.fraksjon.navn, p[0], ny); g.restore();
  });
  // 3D: flaggstangen fra leirmodellene (spill/modeller.js) med ditt flagg som duk
  let stang = [];
  KROKER.sett3d.push((u, R) => {
    // (18. nov: flaggets bilde – CanvasTexture – frigjøres også; før ble ett nytt bilde liggende på grafikkortet for hvert nytt utsnitt)
    for (const m of stang) { R.scene.remove(m); m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose(); } stang = [];
    if (!S || !S.leir || !window.MODELLER) return; const x = S.leir.x - u.cx, y = S.leir.y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) return;
    const z = (hoyde3d(S.leir.x, S.leir.y, u) - u.h0) * R.EX, st2 = new THREE.Mesh(MODELLER.flaggstang({ farge: O.hovedfarge(S.fraksjon.flagg), merke: 'ingen' }), MODELLER.materiale().clone());
    st2.position.set(x, y, z); R.scene.add(st2); stang.push(st2);
    // duken med flaggbildet: samme bølge som i modellen (H 8 m, 1,8 × 1,2 m), litt utenpå på begge sider
    const H = 8, fb = 1.8, fh = 1.2, P = (uu, v, sd) => [.06 + uu * fb, Math.sin(uu * 5.5) * .08 * uu + sd * .015, H - .1 - fh + v * fh - .12 * uu * uu], pos = [], uv = [];
    for (const sd of [1, -1]) for (let i = 0; i < 12; i++) { const a = i / 12, b = (i + 1) / 12, q = [P(a, 0, sd), P(b, 0, sd), P(b, 1, sd), P(a, 1, sd)], t = [[a, 0], [b, 0], [b, 1], [a, 1]];
      for (const k of sd > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { pos.push(...q[k]); uv.push(sd > 0 ? t[k][0] : t[k][0], t[k][1]); } }
    const gd = new THREE.BufferGeometry(); gd.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gd.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gd.computeVertexNormals();
    const tex = new THREE.CanvasTexture(flaggLerret(S.fraksjon.flagg, 240, 160)), duk = new THREE.Mesh(gd, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    duk.position.set(x, y, z); R.scene.add(duk); stang.push(duk);
  });

  // ---------- «Nytt spill» i ☰ ----------
  const nyKnapp = document.createElement('button'); nyKnapp.textContent = 'Nytt spill'; nyKnapp.hidden = true;
  // (runde 7) spillet du har, legges først i «Automatisk» under «Lagre og last» (spill/lagringsmeny.js), så «Nytt spill» kan angres
  nyKnapp.onclick = () => { if (!confirm('Starte et nytt spill? Karakteren, fraksjonen og leiren slettes.' + (window.LagringMeny ? ' Spillet du har nå, legges i «Automatisk» under «Lagre og last» i ☰.' : ''))) return;
    if (window.LagringMeny) LagringMeny.taAuto('Før «Nytt spill»'); try { localStorage.removeItem(NØKKEL); localStorage.removeItem('riksbrudd-k2'); localStorage.removeItem('riksbrudd-k3'); localStorage.removeItem('riksbrudd-ressurser'); localStorage.removeItem('riksbrudd-verden'); localStorage.removeItem(UTKAST); } catch (e) { /* ingen lagring */ } location.reload(); };
  document.getElementById('lagmeny').appendChild(nyKnapp);
  const visNyttKnapp = () => { nyKnapp.hidden = !S; };

  // ---------- start ----------
  // Lagrede valg brukes straks; ellers vises startskjermen (ikke i de automatiske testene, som starter den selv)
  function nytt() { utkast = O.standard(); vis(1); }
  // betal(beløp): trekker pengene og lagrer når det er nok (brukes av leiren i K2 og senere markedet)
  function betal(b) { if (!S || !(b >= 0) || S.penger < b) return false; S.penger -= b; lagre(); visPenger(); return true; }
  // gi(beløp): penger tilbake (for eksempel når et bygg rives)
  function gi(b) { if (!S || !(b > 0)) return; S.penger += b; lagre(); visPenger(); }
  // lukk(): startskjermen og leirvalget bort uten å starte (vakten bruker den); gjemt()/gjemStart/gjemTilbake: lagene fra Dovre-piloten
  function lukk() { bak.classList.remove('på'); banner.classList.remove('på'); velger = false; forslag = null; skitten = true; }
  window.OppstartSpill = { test: false, lagre: () => lagre(), nytt, vis, prøvLeir, bekreft, forslag: () => (velger ? forslag : null), flyttHit, betal, gi, påLand, tilstand: () => S, bonus: () => O.bonus(S), utkast: () => utkast, NØKKEL,
    UTKAST, lukk, sted, andreSpill, lesUtkast, lagreUtkast, glemUtkast, gjemStart, gjemTilbake, gjemt: () => ({ lag: GJEMT.lag.length, kj: GJEMT.kj.length, base: !!GJEMT.base }), visOmrådet };
  S = les(); if (S && !S.ferdig) S = null;
  // Et lagret spill tas i bruk når ALLE skriptene på siden er kjørt (DOMContentLoaded). Før var det setTimeout(0), som kan slå til mellom
  // to skript når nettet er tregt – da gikk «riksbrudd-spill» ut før leiren, folket og kontrollrommet lyttet (feilretting 12. nov).
  if (S) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bruk(false)); else setTimeout(() => bruk(false), 0); }
  else if (!navigator.webdriver) {
    // (runde 6) et påbegynt utkast tas opp igjen der du slapp (steget og alle valgene)
    const d = lesUtkast(); if (d) { utkast = d.utkast; vis(d.steg); } else nytt();
    const gjem = () => gjemStart(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gjem); else setTimeout(gjem, 0);
  }
})();
