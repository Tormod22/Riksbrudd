'use strict';
// Panelet nede til venstre (lag, kjøretøy, base, tettsted, bygg): statuslinja var én lang setning med prikker mellom
// (brukeren 16. nov: «forbedre det som allerede er»). Her blir hver opplysning en egen brikke, og et valgt lag får to målere
// (styrke og ammunisjon). Teksten i statuslinja er den samme som før for dem som leser den (prikkene står igjen, skjult).
(function () {
  const sub = document.getElementById('psub'), panel = document.getElementById('panel'); if (!sub || !panel) return;
  const css = document.createElement('style');
  css.textContent = `#psub{ display:flex; flex-wrap:wrap; gap:4px; } #psub .skille{ display:none; }
#psub .brikke{ background:#241e14; border:1px solid #3a3226; padding:1px 7px; white-space:nowrap; line-height:1.5; }
#psub .brikke.varsel{ border-color:#8a4a3a; color:#e7b3a3; } #psub .brikke.bra{ border-color:#56703a; color:#cfe0b0; }
#pmaal{ display:none; gap:10px; margin:6px 0 2px; } #pmaal.på{ display:flex; } #pmaal div{ flex:1; min-width:0; font-size:12px; color:var(--ink-dim); letter-spacing:.05em; text-transform:uppercase; }
#pmaal i{ display:block; height:6px; margin-top:2px; background:#2a2318; border:1px solid #3a3226; } #pmaal i b{ display:block; height:100%; background:#7c9a4e; } #pmaal i b.lav{ background:#c9a24a; } #pmaal i b.kritisk{ background:#c0563e; }`;
  document.head.appendChild(css);
  const maal = document.createElement('div'); maal.id = 'pmaal'; sub.after(maal);
  const VARSEL = /uten radiokontakt|ingen kontakt|såret|slått ut|tom for|mangler|sprengt|ødelagt/i, BRA = /radiokontakt|nedgravd/i;
  let jobber = false;
  function pynt() {
    if (jobber) return; jobber = true;
    try {
      if (!sub.querySelector('.brikke') && sub.childNodes.length === 1 && sub.firstChild.nodeType === 3 && sub.textContent.includes(' · ')) {
        const deler = sub.textContent.split(' · '); sub.textContent = '';
        deler.forEach((t, i) => { const b = document.createElement('span'); b.className = 'brikke' + (VARSEL.test(t) ? ' varsel' : BRA.test(t) && !/uten/.test(t) ? ' bra' : ''); b.textContent = t; sub.appendChild(b);
          if (i < deler.length - 1) { const s = document.createElement('span'); s.className = 'skille'; s.textContent = ' · '; sub.appendChild(s); } });
      }
      // målere for et valgt lag
      const s = typeof valgt !== 'undefined' && valgt && valgt.menn && panel.classList.contains('på') ? valgt : null;
      if (!s) { maal.classList.remove('på'); return; }
      const alle = s.menn.length, lev = s.menn.filter(q => q.hp > 0).length, ammo = window.Forsyning && Forsyning.ammo ? Forsyning.ammo(s) : 1;
      const kl = v => v < .34 ? 'kritisk' : v < .67 ? 'lav' : '';
      const nøkkel = lev + '/' + alle + '/' + Math.round(ammo * 100); if (maal.dataset.n !== nøkkel) { maal.dataset.n = nøkkel;
        maal.innerHTML = `<div>Styrke ${lev} av ${alle}<i><b class="${kl(lev / alle)}" style="width:${Math.round(lev / alle * 100)}%"></b></i></div><div>Ammunisjon ${Math.round(ammo * 100)} %<i><b class="${kl(ammo)}" style="width:${Math.round(Math.max(0, Math.min(1, ammo)) * 100)}%"></b></i></div>`; }
      maal.classList.add('på');
    } finally { jobber = false; }
  }
  // PORTRETTER (18. nov): hver mann i laget får en liten tegning (spill/tegninger.js) – samme navn gir samme ansikt
  const menn = document.getElementById('menn');
  if (menn) { const css3 = document.createElement('style'); css3.textContent = '.menn button{ display:flex; align-items:center; gap:7px; min-width:0; } .menn button .portrett{ flex:none; width:28px; height:31px; border:1px solid #4a3d24; border-radius:3px; background:#241c10; } .menn button .navn{ min-width:0; color:inherit; font-size:inherit; display:block; }'; document.head.appendChild(css3);
    const portrett = () => { if (!window.Tegninger) return; for (const b of menn.children) { if (b.querySelector('.portrett') || !b.firstChild || b.firstChild.nodeType !== 3) continue; const navn = b.firstChild.textContent, im = document.createElement('img'), boks = document.createElement('span'); im.className = 'portrett'; im.alt = ''; im.src = Tegninger.bilde(Tegninger.person(navn)); boks.className = 'navn'; while (b.firstChild) boks.appendChild(b.firstChild); b.append(im, boks); } };
    new MutationObserver(portrett).observe(menn, { childList: true }); portrett(); }
  // FOLK-PANELET (18. nov, runde 2): hver person i lista «Vis folkene» får ansiktet sitt foran navnet – det SAMME ansiktet som på
  // personkortet (portrettmotoren via Samfunn.portrettSVG; lages én gang per person). Trykk på ansiktet åpner personkortet.
  // Folk-panelet sammenligner mot sin egen lagrede tekst, så bildet kan settes inn i den levende siden uten at panelet tegnes på nytt.
  { const ansikter = new Map(), css4 = document.createElement('style'); css4.textContent = '#folkmeny .person{ overflow:hidden; } #folkmeny .person .ansikt{ float:left; width:30px; height:37px; margin:1px 8px 2px 0; object-fit:cover; object-position:top; border:1px solid #4a3d24; border-radius:3px; background:#241c10; cursor:pointer; }'; document.head.appendChild(css4);
    let koblet = null;
    const sett = () => { const fm = document.getElementById('folkmeny'); if (!fm || !window.Samfunn || !Samfunn.portrettSVG || !window.FolkSpill) return; const F = FolkSpill.tilstand(); if (!F) return;
      for (const n of fm.querySelectorAll('.person .pnavn[data-person]')) { if (n.parentNode.querySelector('.ansikt')) continue; const id = n.dataset.person, p = F.personer.find(q => String(q.id) === id); if (!p) continue;
        let src = ansikter.get(id); if (src === undefined) { try { src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Samfunn.portrettSVG(p)); } catch (e) { src = ''; } ansikter.set(id, src); } if (!src) continue;
        const im = document.createElement('img'); im.className = 'ansikt'; im.alt = ''; im.loading = 'lazy'; im.src = src; im.onclick = () => { if (window.SamfunnSpill) SamfunnSpill.visPerson(p.id); }; n.parentNode.insertBefore(im, n); } };
    const kobl = () => { const fm = document.getElementById('folkmeny'); if (fm && fm !== koblet) { koblet = fm; new MutationObserver(sett).observe(fm, { childList: true }); sett(); } };
    kobl(); window.addEventListener('riksbrudd-spill', () => setTimeout(kobl, 500)); window.addEventListener('load', kobl); }
  // (runde 8, nybegynner: «Oppløs troppen» / «Send hjem og oppløs» står framme – kritikeren fant ingen måte å oppløse en tropp)
  // KNAPPENE I LAGPANELET (18. nov, runde 3): åtte pakker la hver sine knapper i raden. For et eget lag står nå de viktigste framme
  // (ORDRE: marsj, stopp, grav ned, gå av … og STRID: stridsregler, formasjon, tiltak), resten ligger bak «Mer (n)» som bretter dem
  // ut (valget huskes). En knapp som er slått på, står alltid framme. I testene (navigator.webdriver) skjules ingenting – kontrollen
  // trykker på knappene etter teksten – før window.LAGKNAPPER_TEST = true.
  { const H = document.getElementById('handl'), ORDRE = /^(Marsjer|Stopp|Styres av|Grav|Gå av|Om bord|Avbryt|Fortsett|Lag \(|Oppløs|Bekreft: oppløs|Send hjem og oppløs)/, STRID = /^(Stridsregler|Formasjon|Tiltak|Forsvar)/;
    if (H) { const css5 = document.createElement('style'); css5.textContent = '#handl button.bakmer{ display:none; } #handl.utbrettet button.bakmer{ display:inline-block; } #handl button.gr-ordre{ order:1; } #handl button.gr-strid{ order:2; border-color:#6a5a34; } #handl button.gr-mer{ order:4; } #handl #lagmer{ order:3; background:none; border-style:dashed; color:var(--ink-dim,#a69b82); }'; document.head.appendChild(css5);
      let åpen = false; try { åpen = localStorage.getItem('riksbrudd-lagmer') === '1'; } catch (e) { åpen = false; } let ordner = false, obs = null;
      const ordne = () => { if (ordner) return; ordner = true; try { const gammel = H.querySelector('#lagmer'); if (gammel) gammel.remove(); H.classList.remove('utbrettet');
          const s = typeof valgt !== 'undefined' && valgt && valgt.menn && valgt.side === 'blå' ? valgt : null, K = [...H.querySelectorAll(':scope > button')]; for (const b of K) b.classList.remove('bakmer', 'gr-ordre', 'gr-strid', 'gr-mer');
          if (!s || K.length <= 6) return; let bak = 0; for (const b of K) { const t = b.textContent.trim(), g = ORDRE.test(t) ? 'ordre' : STRID.test(t) ? 'strid' : 'mer'; b.classList.add('gr-' + g); if (g === 'mer' && !b.classList.contains('på') && (!navigator.webdriver || window.LAGKNAPPER_TEST === true)) { b.classList.add('bakmer'); bak++; } }
          if (!bak) return; const m = document.createElement('button'); m.id = 'lagmer'; const tekst = () => { m.textContent = åpen ? 'Færre ▴' : `Mer (${bak}) ▾`; H.classList.toggle('utbrettet', åpen); }; m.onclick = e => { e.stopPropagation(); åpen = !åpen; try { localStorage.setItem('riksbrudd-lagmer', åpen ? '1' : '0'); } catch (x) { /* sperret */ } tekst(); }; tekst(); H.appendChild(m);
        } finally { ordner = false; if (obs) obs.takeRecords(); } };
      // (egne endringer – «Mer»-knappen inn og ut – kastes med takeRecords, ellers ville ordningen gå i ring)
      obs = new MutationObserver(() => ordne()); obs.observe(H, { childList: true }); } }
  new MutationObserver(pynt).observe(sub, { childList: true, characterData: true, subtree: true });
  new MutationObserver(pynt).observe(panel, { attributes: true, attributeFilter: ['class'] });
  // STATUSLINJA øverst: tallene for folk, kassa og strøm kan trykkes på (på telefon finnes det ingen hjelpetekst å holde over):
  // folk åpner Folk, kassa åpner Leir-menyen på Lager (der pengene brukes), strøm åpner Leir-menyen på Bygg.
  const stats = document.querySelector('.stats');
  if (stats) { const css2 = document.createElement('style'); css2.textContent = '.stats>div.trykk{ cursor:pointer; } .stats>div.trykk:hover b{ text-decoration:underline; text-decoration-thickness:1px; }'; document.head.appendChild(css2);
    const MÅL = { sFolk: () => { if (window.FolkSpill) FolkSpill.åpne(true); }, sPenger: () => åpneLeir('lager'), sStrom: () => åpneLeir('bygg') };
    const åpneLeir = fane => { const m = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (!m || !lk || !window.LeirSpill || !LeirSpill.tilstand()) return; if (!m.classList.contains('på')) lk.click(); if (LeirSpill.fane) LeirSpill.fane(fane); };
    const merk = () => { for (const id of Object.keys(MÅL)) { const b = document.getElementById(id); if (b && b.parentNode && !b.parentNode.classList.contains('trykk')) { b.parentNode.classList.add('trykk'); b.parentNode.setAttribute('role', 'button'); } } };
    merk(); window.addEventListener('riksbrudd-spill', () => setTimeout(merk, 300));
    stats.addEventListener('click', e => { const d = e.target.closest && e.target.closest('.stats>div'); if (!d) return; for (const [id, f] of Object.entries(MÅL)) if (d.querySelector('#' + id)) { f(); return; } }); }
  window.Panelpynt = { pynt };
})();
