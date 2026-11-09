'use strict';
// «Slik spiller du»: ?-knappen øverst åpner en kort veiledning til alt i spillet. Vises av seg selv første gang (ikke i testene).
(function () {
  const DELER = [
    ['Nytt spill', 'Første gang lager du karakteren din (navn, utseende, bakgrunn med bonus) og fraksjonen (navn og eget flagg), og du velger hvor leiren skal ligge. Dere starter med 100 millioner kr (øverst). «Nytt spill» i ☰ begynner på nytt.'],
    ['Tiden', '1× er sanntid: ett minutt i spillet er ett minutt i virkeligheten. 10× og 60× går fortere, ❚❚ stopper tiden.'],
    ['Lagene', 'Trykk på et lag og så «Marsjer» og et sted på kartet – ruten følger veger og terreng. Trykk på en soldat for å gjøre ham til lagfører. «Grav ned» gir halvparten så mange treff.'],
    ['Tåke', 'Du ser bare det lagene, stridsvognene, dronene og radaren ser. Resten ligger i tåke; «sist sett» viser hvor fienden var.'],
    ['Kjøretøy', 'Trykk på en kolonne og «Kjør til …». Kjøretøyene følger de ekte vegene (NVDB) og tar ferje. De bruker drivstoff og kan skades.'],
    ['Olje', 'Olje er pengene. Velg lastebilkolonnen, trykk «Hent olje …» og en oljeterminal (for eksempel Nyhamna). Oljen kjøres til Hovedbase Dombås. Trykk på basen for å bygge nye enheter.'],
    ['Forsyning', 'Lag bruker ammunisjon og kjøretøy drivstoff. Det fylles på ved basen, med «Forsyn …» fra en lastebil, og i egne tettsteder.'],
    ['Ingeniører', '«Spreng / sperr …» og så en bru, tunnel, ferjekai, et kraftverk eller en dam. «Spreng vegen her» lager et krater. «Reparer …» bygger opp igjen, «Legg miner her» legger et minefelt. Du kan også trykke på en bru og velge «Spreng med …». En sprengt dam gir flom nedover dalen.'],
    ['Tettsteder', 'Et lag som står 30 minutter i et tettsted uten fiender, tar det. Tettstedet gir olje, forsterker garnisonen og reparerer kjøretøy – mest når det har strøm fra et kraftverk i nærheten.'],
    ['Flere enheter', 'Stridsvogn (kanon), rakettartilleri («Ild …» og et mål 2–30 km unna), radarbil (ser bevegelse på åpen mark) og drone («Send drone …» på basen). Alt bygges for olje på basen.'],
    ['Motstanderne', 'Du leder Riksrådet (blå). Kystalliansen (rød) og Folkefronten (grønn) tar tettsteder, henter forsyninger og angriper. «Motstandere» i ☰ stopper dem.'],
    ['Vær og årstid', 'Været skifter av seg selv: klart, skyet, regn, snø og tåke. I tåke ser lagene bare 30 % så langt, i snø 55 % og i regn 70 %. Under ☰ velger du årstid (sommer, høst, vinter, vår) og kan låse været. Om vinteren ligger snøen helt ned i dalen, om høsten blir bjørkene gule og røde.'],
    ['Byer og butikker', 'Butikkene har oppdiktede kjedenavn som ligner på de ekte: Pære (grønn), Toppris (gul), Rima 2000 og så videre. Trykk på et bygg for å se hva det er. Fotballbaner har oppmerking og mål, store baner har lysmaster.'],
    ['Gå selv', 'I 3D: trykk «Gå», så står du på bakken i øyehøyde (ved det valgte laget hvis du har valgt et). PC: W/A/S/D eller piltastene, dra med musa for å se rundt, hold Shift for å løpe. Mobil: styrespaken nede til venstre, dra med den andre fingeren for å se rundt. «Gå» igjen eller Esc for å fly opp. Du kan ikke gå gjennom hus og trær.'],
    ['Kartet', '☰ slår kartlag av og på. «3D» viser terrenget i 3D. ◎ går til Dombås, ⌂ viser hele området. Trykk på bruer, kraftverk og tettsteder for å lese om dem.'],
  ];
  const css = document.createElement('style');
  css.textContent = `#hjelp{ position:fixed; inset:0; z-index:9; display:none; align-items:center; justify-content:center; background:rgba(10,8,5,.55); padding:16px; }
#hjelp.på{ display:flex; }
#hjelp .ark{ background:var(--panel); border:1px solid var(--rule); max-width:600px; width:100%; max-height:82vh; overflow:auto; padding:16px 20px; color:var(--ink); }
#hjelp h2{ margin:0 0 6px; font-family:"IM Fell English",serif; font-weight:400; font-size:24px; }
#hjelp h3{ margin:12px 0 2px; font-size:15px; color:var(--hover); }
#hjelp p{ margin:0; line-height:1.4; font-size:15px; }
#hjelp .lukk{ float:right; background:none; border:none; color:var(--ink); font-size:24px; cursor:pointer; min-width:40px; height:40px; }`;
  document.head.appendChild(css);
  const d = document.createElement('div'); d.id = 'hjelp'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Slik spiller du');
  const ark = document.createElement('div'); ark.className = 'ark';
  const x = document.createElement('button'); x.className = 'lukk'; x.textContent = '×'; x.setAttribute('aria-label', 'Lukk'); ark.appendChild(x);
  const h = document.createElement('h2'); h.textContent = 'Slik spiller du'; ark.appendChild(h);
  for (const [t, tekst] of DELER) { const a = document.createElement('h3'), p = document.createElement('p'); a.textContent = t; p.textContent = tekst; ark.append(a, p); }
  d.appendChild(ark); document.body.appendChild(d);
  const vis = på => { d.classList.toggle('på', på); knapp.setAttribute('aria-expanded', String(på)); };
  const knapp = document.createElement('button'); knapp.id = 'hjelpknapp'; knapp.textContent = '?'; knapp.title = 'Slik spiller du'; knapp.setAttribute('aria-controls', 'hjelp'); knapp.setAttribute('aria-expanded', 'false');
  knapp.onclick = () => vis(!d.classList.contains('på'));
  document.querySelector('.knapper').appendChild(knapp);
  x.onclick = () => vis(false); d.onclick = e => { if (e.target === d) vis(false); };
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && d.classList.contains('på')) vis(false); });
  let sett = true; try { sett = localStorage.getItem('riksbrudd-hjelp') === '1'; localStorage.setItem('riksbrudd-hjelp', '1'); } catch (e) { /* privat vindu: vis ikke */ }
  if (!sett && !navigator.webdriver) vis(true);
  window.visHjelp = vis;
})();
