'use strict';
// ☰-menyen i grupper (brukeren 16. nov: «forbedre det som allerede er, f.eks. menyene»). Modulene legger knappene sine rett i
// menyen etter hvert som de lastes. Her sorteres de i grupper med overskrift, av/på-knappene får en bryter, valgene viser navnet
// til venstre og verdien til høyre, og «Nytt spill» står for seg selv nederst. Knappene er de samme (ingen ny oppførsel) – de
// flyttes bare, så modulene og testene finner dem som før. Menyen lukkes med Esc eller et trykk utenfor.
// Lastes etter alle modulene som har knapper i menyen. En ny knapp som ikke står i GRUPPER, havner under «Annet».
(function () {
  const meny = document.getElementById('lagmeny'), åpner = document.getElementById('meny'); if (!meny || !åpner) return;
  // gruppe: [overskrift, forklaring, navnene knappene begynner med – i den rekkefølgen de skal stå]
  const GRUPPER = [
    ['Kartet', 'Hva som tegnes i kartet og i 3D', ['Skygge', 'Høydekurver', 'Trær', 'Veger', 'Jernbane', 'Bygg', 'Infrastruktur', 'Kraftledninger', 'Kaier']],
    ['Oversikt', 'Hjelp til å lese situasjonen', ['Siktfelt', 'Tåke', 'Motstandere', 'Kompass', 'Minikart']],
    ['Vær og årstid', 'Automatisk, eller lås et vær', ['Årstid', 'Vær']],
    ['Bilde og lyd', 'Lavere grafikk gir jevnere bilde', ['Grafikk', 'Filter', 'Lyd', 'Fotomodus']],
    ['Måling', 'Tall du kan sende hvis noe går tregt', ['FPS-teller', 'Tekniske tall', 'Mål ytelse', 'Mål hakk']],
  ];
  const HANDLING = ['Mål ytelse', 'Mål hakk', 'Måler', 'Fotomodus'], FARE = ['Nytt spill'];
  const css = document.createElement('style');
  css.textContent = `#lagmeny.på{ display:block; width:min(430px, calc(100vw - 20px)); padding:10px 12px 12px; }
#lagmeny .mtopp{ display:flex; justify-content:space-between; align-items:baseline; margin:0 0 6px; }
#lagmeny .mtopp b{ font-size:18px; letter-spacing:.04em; }
#lagmeny .mtopp button{ min-width:0; width:34px; height:30px; padding:0; text-align:center; font-size:18px; }
#lagmeny section{ margin:0 0 10px; }
#lagmeny h3{ margin:0 0 5px; font-size:12.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-dim); display:flex; gap:8px; align-items:baseline; border-bottom:1px solid var(--rule); padding-bottom:3px; }
#lagmeny h3 small{ font-size:12px; letter-spacing:0; text-transform:none; font-weight:400; opacity:.8; }
#lagmeny .rute{ display:grid; grid-template-columns:1fr 1fr; gap:4px; }
#lagmeny .rute.en{ grid-template-columns:1fr; }
#lagmeny section button{ min-width:0; width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 10px; text-decoration:none; }
#lagmeny button.bryter::after{ content:''; flex:none; width:30px; height:16px; border-radius:9px; background:radial-gradient(circle at 22px 8px, #f3ead2 0 6px, transparent 6.5px), #7c9a4e; border:1px solid rgba(0,0,0,.4); transition:background .12s; }
#lagmeny button.bryter.av{ color:var(--ink-dim); text-decoration:none; }
#lagmeny button.bryter.av::after{ background:radial-gradient(circle at 8px 8px, #9c927c 0 6px, transparent 6.5px), #3a3226; }
#lagmeny button.valg .verdi{ color:#e9d79a; font-size:.92em; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#lagmeny button .kolon{ display:none; }
#lagmeny button.valg .verdi::after{ content:' ›'; opacity:.6; }
#lagmeny button.handling{ justify-content:center; }
#lagmeny button.fare{ width:100%; justify-content:center; text-align:center; border-color:#8a4a3a; color:#e7b3a3; background:#2a1a16; }
#lagmeny button:hover{ filter:brightness(1.18); } #lagmeny button:focus-visible{ outline:2px solid #e9d79a; outline-offset:1px; }
body.kort #lagmeny.på{ width:min(360px, calc(100vw - 16px)); padding:8px 9px 9px; } body.kort #lagmeny h3 small{ display:none; }
@media (max-width:360px){ #lagmeny .rute{ grid-template-columns:1fr; } }`;
  document.head.appendChild(css);

  const navn = b => (b.dataset.navn || b.textContent).split(':')[0].trim(), begynner = (t, liste) => liste.find(n => t === n || t.startsWith(n));
  // valg («Navn: verdi») vises som navn til venstre og verdi til høyre – også når modulen setter teksten på nytt
  function del(b) {
    if (b.querySelector('.etik')) return; const t = b.textContent, i = t.indexOf(':'); if (i < 0) return;
    const e = document.createElement('span'), v = document.createElement('span'); e.className = 'etik'; v.className = 'verdi'; e.textContent = t.slice(0, i).trim(); v.textContent = t.slice(i + 1).trim();
    // (kolonet blir stående, skjult, så knappens tekst er den samme som før for dem som leser den)
    const k = document.createElement('span'); k.className = 'kolon'; k.textContent = ': '; b.dataset.navn = e.textContent; b.textContent = ''; b.append(e, k, v);
  }
  function ordne() {
    const knapper = [...meny.querySelectorAll('button')].filter(b => !b.closest('.mtopp')), brukt = new Set();
    meny.textContent = '';
    const topp = document.createElement('div'); topp.className = 'mtopp'; const tittel = document.createElement('b'); tittel.textContent = 'Innstillinger';
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Lukk menyen'); x.onclick = lukk; topp.append(tittel, x); meny.appendChild(topp);
    const seksjon = (overskrift, forklaring, liste) => { if (!liste.length) return; const s = document.createElement('section'), h = document.createElement('h3'), r = document.createElement('div');
      h.textContent = overskrift; if (forklaring) { const sm = document.createElement('small'); sm.textContent = forklaring; h.appendChild(sm); } r.className = 'rute' + (liste.length === 1 ? ' en' : '');
      for (const b of liste) { const t = navn(b);
        if (begynner(t, HANDLING)) b.classList.add('handling'); else if (b.textContent.includes(':') || b.querySelector('.etik')) { b.classList.add('valg'); del(b); } else b.classList.add('bryter');
        r.appendChild(b); }
      s.append(h, r); meny.appendChild(s); };
    for (const [overskrift, forklaring, navnene] of GRUPPER) { const liste = [];
      for (const n of navnene) { const b = knapper.find(k => !brukt.has(k) && begynner(navn(k), [n])); if (b) { liste.push(b); brukt.add(b); } }
      seksjon(overskrift, forklaring, liste); }
    const fare = knapper.filter(b => !brukt.has(b) && begynner(navn(b), FARE)); for (const b of fare) brukt.add(b);
    seksjon('Annet', '', knapper.filter(b => !brukt.has(b)));
    for (const b of fare) { b.classList.add('fare'); meny.appendChild(b); }
  }
  function lukk() { if (!meny.classList.contains('på')) return; meny.classList.remove('på'); åpner.classList.remove('på'); åpner.setAttribute('aria-expanded', 'false'); }
  ordne(); åpner.title = 'Innstillinger';
  // knapper som kommer til senere (en modul som lastes etter denne), og tekst som settes på nytt
  new MutationObserver(liste => { let ny = false;
    for (const m of liste) { if (m.target === meny && [...m.addedNodes].some(n => n.tagName === 'BUTTON')) ny = true;
      const b = m.target.nodeType === 1 ? m.target.closest && m.target.closest('button.valg') : m.target.parentNode && m.target.parentNode.closest && m.target.parentNode.closest('button.valg'); if (b && !b.querySelector('.etik')) del(b); }
    if (ny) ordne(); }).observe(meny, { childList: true, subtree: true, characterData: true });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') lukk(); });
  document.addEventListener('pointerdown', e => { if (meny.classList.contains('på') && !meny.contains(e.target) && e.target !== åpner) lukk(); }, true);
  window.Meny = { ordne, lukk, GRUPPER };
})();
