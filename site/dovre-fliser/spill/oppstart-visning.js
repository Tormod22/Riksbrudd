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
#oppstart .bilde{ position:sticky; top:0; }
@media (max-width:700px){ #oppstart .bilde{ order:-1; position:static; text-align:center; } #oppstart .bilde img{ width:140px; height:auto; } }
#oppstart button.valg{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); cursor:pointer; min-height:40px; padding:4px 10px; }
#oppstart button.valg.på{ border-color:var(--hover); background:#3a3022; box-shadow:inset 0 0 0 1px var(--hover); }
#oppstart button.farge{ width:34px; height:34px; min-height:0; padding:0; border:2px solid #0006; cursor:pointer; }
#oppstart button.farge.på{ outline:3px solid var(--hover); outline-offset:1px; }
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
#leirvalg button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:42px; padding:4px 14px; margin:6px 4px 0; cursor:pointer; font:inherit; }`;
  document.head.appendChild(css);

  // ---------- pengene øverst ----------
  const st = document.createElement('div'); st.innerHTML = '<b id="sPenger">–</b> <span>i kassa</span>'; st.hidden = true; document.querySelector('.stats').appendChild(st);
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

  function vis(steg) {
    ark.innerHTML = ''; bak.classList.add('på');
    const k = utkast.karakter, fr = utkast.fraksjon, fl = fr.flagg, melding = el('div', { klasse: 'feil', 'aria-live': 'polite' });
    if (steg === 1) {
      ark.append(el('h2', {}, 'Riksbrudd – nytt spill'), el('div', { klasse: 'steg' }, 'Steg 1 av 3: din karakter. Norge har falt sammen. Du starter med ' + O.kroner(O.STARTPENGER) + ' og en håndfull folk.'));
      const navn = el('input', { type: 'text', maxlength: 30, placeholder: 'Navnet ditt', value: k.navn, 'aria-label': 'Navnet til karakteren' });
      const bilde = el('div'), oppd = () => { bilde.innerHTML = ''; bilde.appendChild(portrettBilde(k)); };
      navn.oninput = () => { k.navn = navn.value; };
      const valg = el('div');
      const lagValg = () => { valg.innerHTML = ''; const p = k.portrett;
        valg.appendChild(el('div', { klasse: 'rad' }, ...FANER.map(([t], i) => knapp(t, fane === i, () => { fane = i; lagValg(); }))));
        for (const [tittel, felt, palett] of FANER[fane][1]) {
          valg.appendChild(el('h3', {}, tittel));
          if (palett) valg.appendChild(el('div', { klasse: 'rad' }, ...O.P.palettes[palett].map(f => { const b = knapp('', p[felt] === f, () => { p[felt] = f; lagValg(); oppd(); }, 'farge'); b.style.background = f; b.setAttribute('aria-label', tittel + ' ' + f); return b; })));
          else if (O.P.numerics[felt]) { const [min, maks] = O.P.numerics[felt], r = el('input', { type: 'range', min, max: maks, value: p[felt], 'aria-label': tittel, style: 'width:100%; max-width:320px' }), v = el('span', { style: 'margin-left:8px' }, felt === 'age' ? p[felt] + ' år' : p[felt] + ' %');
            r.oninput = () => { p[felt] = +r.value; v.textContent = felt === 'age' ? r.value + ' år' : r.value + ' %'; oppd(); }; valg.appendChild(el('div', { klasse: 'rad' }, r, v)); }
          else valg.appendChild(el('div', { klasse: 'rad' }, ...NAVN[felt].map(([v, t]) => knapp(t, p[felt] === v, () => { p[felt] = v; lagValg(); oppd(); }))));
        }
        valg.appendChild(el('div', { klasse: 'rad', style: 'margin-top:12px' }, knapp('Tilfeldig utseende', false, () => { const t = O.P.randomCharacter(); k.portrett = O.portrett({ ...t, role: 'militaer', outfit: NAVN.outfit[Math.floor(Math.random() * 7)][0] }, k.navn); lagValg(); oppd(); })));
      };
      lagValg(); oppd();
      const bg = el('div', { klasse: 'bakgrunn' });
      const lagBg = () => { bg.innerHTML = ''; for (const [id, b] of Object.entries(O.BAKGRUNNER)) { const kn = knapp('', k.bakgrunn === id, () => { k.bakgrunn = id; lagBg(); }); kn.append(el('b', {}, b.navn), el('small', {}, b.tekst)); bg.appendChild(kn); } };
      lagBg();
      ark.append(el('h3', {}, 'Navn'), navn, el('div', { klasse: 'to' }, el('div', {}, valg), el('div', { klasse: 'bilde', style: 'flex:0 0 auto' }, bilde)), el('h3', {}, 'Bakgrunn (gir en liten bonus)'), bg, melding,
        el('div', { klasse: 'bunn' }, el('span'), knapp('Neste: fraksjonen →', false, () => { if (k.navn.trim().length < 2) { melding.textContent = 'Skriv et navn (minst 2 tegn).'; return; } vis(2); })));
      setTimeout(() => navn.focus(), 50);
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
      ark.append(el('h3', {}, 'Navn'), navn, el('div', { klasse: 'to' }, el('div', {}, red), el('div', { style: 'flex:0 0 auto; position:sticky; top:0' }, el('h3', {}, 'Flagget'), stort)), melding,
        el('div', { klasse: 'bunn' }, knapp('← Tilbake', false, () => vis(1)), knapp('Neste: plass til leiren →', false, () => { const f = O.feil(utkast); if (f.length) { melding.textContent = f.join(' '); return; } vis(3); })));
    } else {
      ark.append(el('h2', {}, 'Plass til leiren'), el('div', { klasse: 'steg' }, 'Steg 3 av 3: trykk på kartet der leiren skal ligge. Hvor som helst i Norge – men ikke inne i et tettsted eller i vann. Basen og lagene dine flytter dit.'),
        el('div', { klasse: 'bunn' }, knapp('← Tilbake', false, () => vis(2)), knapp('Velg på kartet', false, startVelg)));
    }
  }
  // ---------- velge leirplass på kartet ----------
  function startVelg() { bak.classList.remove('på'); velger = true; forslag = null; visBanner('Trykk på kartet der leiren skal ligge. Zoom og flytt kartet som vanlig.'); }
  function visBanner(tekst, kanBekrefte) {
    banner.innerHTML = ''; banner.classList.add('på'); banner.append(el('div', {}, tekst));
    if (kanBekrefte) banner.append(knapp('Legg leiren her', false, bekreft, 'valg'));
    banner.append(knapp('Tilbake til valgene', false, () => { velger = false; forslag = null; banner.classList.remove('på'); vis(2); skitten = true; }, 'valg'));
  }
  // klassen (vann = 3, utenfor kartet = 255) i 32 m-rutenettet rundt punktet
  async function klasseVed(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false); const [i, j] = Terreng.rute(v, x, y); return v.K[j * v.w + i]; } catch (e) { return undefined; } }
  const iTettsted = (x, y) => { const by = ((typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || []).find(b => b.bb[0] <= x && x <= b.bb[2] && b.bb[1] <= y && y <= b.bb[3] && window.Garnison && Garnison.inni(b, x, y)); return by ? by.e.navn : null; };
  async function prøvLeir(x, y) {
    const kl = await klasseVed(x, y), grunn = O.gyldigLeir(x, y, { iTettsted, klasse: () => kl });
    forslag = { x, y, ok: !grunn }; skitten = true;
    let h = null; try { h = hoydeVed(x, y); } catch (e) { /* ingen høyde her */ }
    visBanner(grunn || (h != null ? `Her? ${Math.round(h)} moh.` : 'Her?'), !grunn); return grunn;
  }
  function bekreft() {
    if (!forslag || !forslag.ok) return; const f = O.fullfør(utkast, forslag); if (f.length) { visBanner(f.join(' ')); return; }
    S = utkast; velger = false; forslag = null; banner.classList.remove('på'); lagre(); bruk(true); skitten = true;
  }
  KROKER.trykk.push((X, Y) => { if (!velger) return false; prøvLeir(X, Y); return true; });
  KROKER.trykk3d.push((X, Y) => { if (!velger) return false; prøvLeir(X, Y); return true; });

  // ---------- valgene tas i bruk: fraksjonen tar over «blå», basen og lagene flytter til leiren ----------
  function bruk(ny) {
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
    }
    visPenger(); visNyttKnapp();
    // andre moduler (leiren i K2) får vite at spillet er klart
    window.dispatchEvent(new Event('riksbrudd-spill'));
    if (ny) { kam.x = L.x; kam.y = L.y; skitten = true;
      logg(`${S.karakter.navn} (${O.BAKGRUNNER[S.karakter.bakgrunn].navn.toLowerCase()}) leder ${S.fraksjon.navn}. Leiren er satt opp, og dere har ${O.kroner(S.penger)}.`); }
    else logg(`Velkommen tilbake, ${S.karakter.navn}. ${S.fraksjon.navn} har ${O.kroner(S.penger)} i kassa.`);
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
    if (navn) { g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(navn, x, y + 16); g.fillStyle = '#f2ead6'; g.fillText(navn, x, y + 16); }
    g.restore();
  }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (forslag) { const [x, y] = tilSkjerm(forslag.x, forslag.y, vx0, vy1); tegnLeir(g, x, y, forslag.ok, forslag.ok ? 'Leiren her?' : null); }
    else if (S && S.leir) { const [x, y] = tilSkjerm(S.leir.x, S.leir.y, vx0, vy1); if (x > -60 && y > -60 && x < VW + 60 && y < VH + 60) tegnLeir(g, x, y, true, S.fraksjon.navn); }
  });
  KROKER.tegn3d.push((g, proj3) => {
    if (!S || !S.leir) return; const p = proj3(S.leir.x, S.leir.y); if (!p) return;
    g.save(); g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(S.fraksjon.navn, p[0], p[1] + 18); g.fillStyle = '#f2ead6'; g.fillText(S.fraksjon.navn, p[0], p[1] + 18); g.restore();
  });
  // 3D: flaggstangen fra leirmodellene (spill/modeller.js) med ditt flagg som duk
  let stang = [];
  KROKER.sett3d.push((u, R) => {
    for (const m of stang) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } stang = [];
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
  nyKnapp.onclick = () => { if (!confirm('Starte et nytt spill? Karakteren, fraksjonen og leiren slettes.')) return; try { localStorage.removeItem(NØKKEL); localStorage.removeItem('riksbrudd-k2'); localStorage.removeItem('riksbrudd-k3'); localStorage.removeItem('riksbrudd-ressurser'); } catch (e) { /* ingen lagring */ } location.reload(); };
  document.getElementById('lagmeny').appendChild(nyKnapp);
  const visNyttKnapp = () => { nyKnapp.hidden = !S; };

  // ---------- start ----------
  // Lagrede valg brukes straks; ellers vises startskjermen (ikke i de automatiske testene, som starter den selv)
  function nytt() { utkast = O.standard(); vis(1); }
  // betal(beløp): trekker pengene og lagrer når det er nok (brukes av leiren i K2 og senere markedet)
  function betal(b) { if (!S || !(b >= 0) || S.penger < b) return false; S.penger -= b; lagre(); visPenger(); return true; }
  // gi(beløp): penger tilbake (for eksempel når et bygg rives)
  function gi(b) { if (!S || !(b > 0)) return; S.penger += b; lagre(); visPenger(); }
  window.OppstartSpill = { nytt, vis, prøvLeir, bekreft, betal, gi, tilstand: () => S, bonus: () => O.bonus(S), utkast: () => utkast, NØKKEL };
  S = les(); if (S && !S.ferdig) S = null;
  if (S) setTimeout(() => bruk(false), 0); else if (!navigator.webdriver) nytt();
})();
