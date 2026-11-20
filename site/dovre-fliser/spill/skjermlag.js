'use strict';
/* Riksbrudd – LAGENE PÅ SKJERMEN (19. nov, runde 6: det kritikerne sa om vinduer oppå hverandre og spill som går mens et kort venter).
 *  1. ÉN REKKEFØLGE for vinduene (z-index settes her, i bånd):
 *       kort som venter på svar (hendelse, folket, krigskort)  <  stoppkort og varsler  <  pausemerket  <  angrepsbanneret (alarm)
 *       <  panelene du åpner selv (Leir, Folk, Tropper, Deg, hjelpen ?, ☰, tegnforklaringen …): det du åpnet sist, ligger øverst,
 *          og et trykk i et panel løfter det fram  <  bunnmenyen på telefon  <  verktøytipset  <  ringen fra opplæringen.
 *     Før: hendelseskortet «I LEIREN» lå oppå angrepsbanneret og «Forsvar leiren», hjelpen åpnet seg under Deg-panelet, og ☰ åpnet seg bak
 *     tegnforklaringen (liggende telefon) – alt etter tilfeldige z-index-tall i hver fil.
 *  2. KORT SOM VENTER PÅ SVAR SETTER SPILLET PÅ PAUSE: står et kort oppe (hendelse, spørsmål fra folket, spillformkort, krigskort som
 *     «Kystalliansen har overtaket»), settes farten til pause, og en lapp under kortet sier «Spillet står på pause til du svarer».
 *     Når kortet er besvart, går spillet videre i farten det hadde. Satte du selv på pause før, blir det stående. Før sto et hendelseskort
 *     åpent i 15 spilltimer ved 600×, og krigskortet satte spillet på pause uten å si det.
 *  3. BUNNMENYEN PÅ TELEFON (Leir, Folk, Tropper, Krig, Deg, Mer) står alltid på kartet – også under angrep, med et kort oppe og når
 *     telefonen ligger (før forsvant den da). Panelene som når ned dit, slutter over den (makshøyde/bunn settes her og tas bort igjen når
 *     panelet lukkes). Den viker bare for det som tar hele skjermen: hjelpen, kontrollrommet, byggingen, etterspillet og krigskortet.
 *  RUNDE 8 (20. nov natt, ny kritikk): (a) PAUSEN HOLDER: startet noen tiden igjen mens kortet sto oppe (⏭ «Spol videre», en fartsknapp),
 *     settes spillet på pause igjen (og lappen blinker) – farten du valgte, brukes når kortet er besvart. Før gikk tiden fra dag 3 16:52 til dag 4
 *     05:06 med kortet åpent, men etter omlasting sto det på pause. (b) KORT VENTER TIL ANGREPET ER OVER: mens leiren angripes (angrepet er
 *     i gang, eller banneret varsler røvere på vei), er hendelseskortet og spørsmålene fra folket skjult (body.angrepvent) – de kommer fram når
 *     angrepet er over. Før sto fire bokser oppå hverandre midt over leiren (banneret, «fest?», «⏭ Stoppet», opplæringen).
 *  Alt dette gjelder spilleren. I testene (navigator.webdriver) er alt som før til Skjermlag.test = true (vakta «ui» slår det på og av).
 *  Reglene øverst er uten DOM (Skjermlag.orden/zFor – test_skjermlag.js). Tallene er Claudes forslag. window.Skjermlag.
 */
(function (rot) {
  // båndene (Claudes forslag): alt annet på kartet (logg, varsler, zoomknapper …) ligger under 20 som før
  const REGLER = { kort: 20, status: 21, pausemerke: 23, alarm: 24, selv: 30, selvMaks: 66, bunnmeny: 70, tips: 80, ring: 85, luft: 6 };
  const KORT = ['hendelse', 'samfunnkort', 'formkort', 'krigkort'], STATUS = ['flytkort', 'varsel'], ALARM = ['alarm'];
  // (runde 8) kortene som venter til et angrep er over (krigskortet og spillformkortet – seier/tap – kommer straks som før)
  const VENTER = ['hendelse', 'samfunnkort'];
  // venter(angrep) gir id-ene som skal skjules nå (uten DOM: test_skjermlag.js)
  const venter = angrep => (angrep ? VENTER.slice() : []);
  // panelene spilleren åpner selv (fra bunnmenyen, ☰, ?, kartet eller et annet panel)
  const SELV = ['leirmeny', 'folkmeny', 'samfunnmeny', 'region', 'krig', 'panel', 'flytgruppe', 'karakterark', 'verdenpanel', 'sjopanel', 'krigpanel', 'sekk', 'tropppanel', 'stridpanel',
    'forklaring', 'personkort', 'evpanel', 'hjelp', 'lagmeny', 'degmeny', 'kommer', 'mkommer', 'flismerliste', 'marsjvalg'];
  // rekkefølgen på de åpne panelene: de som fortsatt er åpne, beholder plassen, nye legges øverst (sist), i den rekkefølgen de kom
  function orden(gammel, åpne) { const ny = gammel.filter(id => åpne.includes(id)); for (const id of åpne) if (!ny.includes(id)) ny.push(id); return ny; }
  // et panel spilleren trykket i, løftes fram
  const fram = (o, id) => (o.includes(id) ? o.filter(x => x !== id).concat(id) : o);
  function zFor(id, o) { if (KORT.includes(id)) return REGLER.kort; if (STATUS.includes(id)) return REGLER.status; if (ALARM.includes(id)) return REGLER.alarm;
    const i = o.indexOf(id); return i < 0 ? null : Math.min(REGLER.selvMaks, REGLER.selv + i); }
  const Skjermlag = { REGLER, KORT, SELV, VENTER, venter, orden, fram, zFor, test: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Skjermlag; return; }
  rot.Skjermlag = Skjermlag;
  if (typeof document === 'undefined') return;

  const $ = id => document.getElementById(id), aktiv = () => !navigator.webdriver || Skjermlag.test === true;
  const vises = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const css = document.createElement('style');
  css.textContent = `#kortpause{ position:fixed; z-index:${REGLER.pausemerke}; display:none; box-sizing:border-box; padding:4px 10px; background:#2a2215; border:1px solid #c9b26a; border-radius:3px; color:#f0dc9a; font-size:13.5px; text-align:center; pointer-events:none; box-shadow:0 4px 12px rgba(0,0,0,.5); }
#kortpause.på{ display:block; } #kortpause::before{ content:'❚❚'; margin-right:7px; font-size:11px; letter-spacing:-1px; }
#kortpause.blink{ animation:kortblink .9s ease-out 2; } @keyframes kortblink{ 40%{ background:#6a5320; color:#fff3c8; } }
body.angrepvent #hendelse.på, body.angrepvent #samfunnkort.på{ display:none; }
body.mkomalltid #mkom{ z-index:${REGLER.bunnmeny}; } body.mkomalltid #mkommer{ z-index:${REGLER.bunnmeny + 1}; }
#tips{ z-index:${REGLER.tips}; } #oppring{ z-index:${REGLER.ring}; }
/* angrepsbanneret på PC: tekst og knapper på én rad (etter «Forsvar leiren» brøt «Opphev» og «Vis» ned på en egen linje – kritikeren så en
   tom grå boks under banneret der kortet dekket «Vis») */
body.spill #alarm.på{ flex-wrap:nowrap; max-width:min(980px, calc(100vw - 150px)); } body.spill #alarm > *{ flex:none; } body.spill #alarm > span:first-child{ flex:0 1 auto; min-width:0; }
#alarm > :empty:not(button){ display:none; }
/* telefon: banneret sto i en smal stripe (left:50 % gir bare halve bredden å krympe i) */
body.kort #alarm{ width:max-content; max-width:min(560px, calc(100vw - 16px)); box-sizing:border-box; }`;
  document.head.appendChild(css);

  // ---------- 1: rekkefølgen ----------
  let o = [];
  const satt = new Map();
  function settZ(e, z) { if (!satt.has(e)) satt.set(e, e.style.zIndex); const v = String(z); if (e.style.zIndex !== v) e.style.zIndex = v; }
  function lag() { if (!aktiv()) { for (const [e, z] of satt) e.style.zIndex = z; satt.clear(); o = []; return; }
    const åpne = SELV.filter(id => vises($(id))); o = orden(o, åpne);
    for (const id of [...KORT, ...STATUS, ...ALARM, ...SELV]) { const e = $(id); if (!e) continue; const z = zFor(id, o); if (z !== null && vises(e)) settZ(e, z); else if (satt.has(e)) { e.style.zIndex = satt.get(e); satt.delete(e); } } }
  document.addEventListener('pointerdown', e => { if (!aktiv() || !e.target || !e.target.closest) return; const p = e.target.closest(SELV.map(id => '#' + id).join(',')); if (p && o.includes(p.id) && o[o.length - 1] !== p.id) { o = fram(o, p.id); lag(); } }, true);

  // ---------- 2: kort som venter på svar setter spillet på pause ----------
  const merke = document.createElement('div'); merke.id = 'kortpause'; merke.setAttribute('role', 'status'); merke.textContent = 'Spillet står på pause til du svarer'; document.body.appendChild(merke);
  let pauset = false, sistTempo = typeof tempo !== 'undefined' ? tempo : 1, tempoFør = 0;
  const fart = () => (typeof tempo !== 'undefined' ? tempo : 1);
  function kortOppe() { for (const id of KORT) { const e = $(id); if (e && e.classList.contains('på') && vises(e)) return e; } return null; }
  function pause() { const t = fart(), k = aktiv() ? kortOppe() : null, p = $('sp0');
    if (k) { if (!pauset) { if (t > 0 && p) { tempoFør = t; p.click(); pauset = true; } else if (sistTempo > 0) { tempoFør = sistTempo; pauset = true; } }
      // (runde 8) tiden ble startet igjen med kortet oppe: pause igjen, og den nye farten gjelder når kortet er besvart
      else if (t > 0 && p) { tempoFør = t; p.click(); merke.classList.remove('blink'); void merke.offsetWidth; merke.classList.add('blink'); }
      // lappen under kortet (over når det ikke er plass under); for krigskortet (hele skjermen) under ruta i midten
      const r = ((k.id === 'krigkort' || k.id === 'formkort') && k.firstElementChild ? k.firstElementChild : k).getBoundingClientRect(), H = window.innerHeight;
      if (fart() === 0 && r.width > 40) { merke.classList.add('på'); const h = merke.offsetHeight || 26, w = Math.min(Math.max(r.width, 250), window.innerWidth - 12);
        merke.style.width = w + 'px'; merke.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + (r.width - w) / 2)) + 'px';
        merke.style.top = (r.bottom + h + 6 < H - 70 ? r.bottom + 4 : Math.max(4, r.top - h - 4)) + 'px'; } else merke.classList.remove('på'); }
    else { if (pauset && fart() === 0 && p) { p.click();
        // samme fart som før kortet (▶ gir farten på knappen; en fart satt på annen måte, f.eks. av spolingen, settes tilbake her)
        if (typeof tempo !== 'undefined' && tempoFør > 0 && tempo !== tempoFør) tempo = tempoFør; }
      pauset = false; merke.classList.remove('på'); }
    sistTempo = fart(); }

  // ---------- 3: bunnmenyen på telefon står alltid; panelene slutter over den ----------
  const LØFT = ['panel', 'leirmeny', 'folkmeny', 'krig', 'karakterark', 'tropppanel', 'stridpanel', 'sekk', 'degmeny', 'region', 'samfunnmeny', 'personkort', 'samfunnkort', 'krigpanel',
    'verdenpanel', 'sjopanel', 'evpanel', 'flytgruppe', 'marsjvalg', 'forklaring', 'lagmeny', 'hendelse', 'flismerliste'];
  const løftet = new Map();
  const tilbake = e => { const v = løftet.get(e); if (!v) return; e.style.bottom = v.bottom; e.style.maxHeight = v.maxHeight; e.style.overflowY = v.overflowY; løftet.delete(e); };
  function løft() { const B = document.body, m = $('mkom'), alltid = aktiv(); if (B.classList.contains('mkomalltid') !== alltid) B.classList.toggle('mkomalltid', alltid);
    const på = alltid && B.classList.contains('kort') && !!m && m.classList.contains('på') && vises(m);
    let grense = på ? m.getBoundingClientRect().top : Infinity; const op = $('opplaering'); if (på && op && op.classList.contains('liten') && vises(op)) grense = Math.min(grense, op.getBoundingClientRect().top);
    grense -= REGLER.luft; const H = window.innerHeight;
    for (const id of LØFT) { const e = $(id); if (!e) continue; if (!på || !vises(e)) { tilbake(e); continue; }
      const r = e.getBoundingClientRect(); if (r.bottom <= grense + 1 || r.height < 40) continue;
      if (!løftet.has(e)) løftet.set(e, { bottom: e.style.bottom, maxHeight: e.style.maxHeight, overflowY: e.style.overflowY });
      e.style.maxHeight = Math.max(90, Math.round(grense - Math.max(r.top, 0))) + 'px'; e.style.overflowY = 'auto';
      // står panelet fast i bunnen, flyttes det opp (toppen blir der den var)
      if (e.getBoundingClientRect().bottom > grense + 1) e.style.bottom = Math.round(H - grense) + 'px'; } }

  // ---------- 4: et kort som ligger under angrepsbanneret, flyttes ned under det (begge skal kunne leses) ----------
  const flyttet = new Map();
  function underAlarm() { const a = $('alarm'), på = aktiv() && vises(a) && a.classList.contains('på'), ar = på ? a.getBoundingClientRect() : null, H = window.innerHeight;
    for (const id of KORT) { const e = $(id); if (!e) continue; const v = på && e.id !== 'krigkort' && e.id !== 'formkort' && e.classList.contains('på') && vises(e);
      if (!v) { if (flyttet.has(e)) { e.style.top = flyttet.get(e); flyttet.delete(e); } continue; }
      if (flyttet.has(e)) { const før = e.style.top; e.style.top = flyttet.get(e); const r0 = e.getBoundingClientRect(); e.style.top = før;
        // står det ikke lenger i veien (banneret er kortere nå), settes det tilbake
        if (r0.bottom <= ar.top || r0.top >= ar.bottom || r0.right <= ar.left || r0.left >= ar.right) { e.style.top = flyttet.get(e); flyttet.delete(e); continue; } }
      const r = e.getBoundingClientRect(); if (r.bottom <= ar.top || r.top >= ar.bottom || r.right <= ar.left || r.left >= ar.right) continue;
      if (ar.bottom + REGLER.luft + Math.min(r.height, 160) > H - 70) continue;
      if (!flyttet.has(e)) flyttet.set(e, e.style.top); e.style.top = Math.round(ar.bottom + REGLER.luft) + 'px'; } }
  // telefon: zoomknappene til høyre står ellers i glipen mellom et løftet panel og bunnmenyen
  const ctlCss = document.createElement('style'); ctlCss.textContent = 'body.kort.mkomloft .ctl{ visibility:hidden; }'; document.head.appendChild(ctlCss);
  // ---------- 5 (runde 8): kortene venter til angrepet er over ----------
  function angrepPågår() { const T = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() && SpilletSpill.T ? SpilletSpill.T() : null, a = $('alarm');
    return !!(T && T.aktiv) || (typeof ENHETER !== 'undefined' && ENHETER.some(e => e.raid && e.menn && e.menn.some(m => m.hp > 0))) || !!(a && a.classList.contains('på') && !a.classList.contains('satt') && vises(a)); }
  function vent() { const v = aktiv() && venter(angrepPågår()).length > 0; if (document.body.classList.contains('angrepvent') !== v) document.body.classList.toggle('angrepvent', v); }
  setInterval(() => { try { vent(); lag(); underAlarm(); pause(); løft(); const l = løftet.size > 0; if (document.body.classList.contains('mkomloft') !== l) document.body.classList.toggle('mkomloft', l); } catch (e) { /* neste runde */ } }, 150);
  Object.assign(Skjermlag, { lag, pause, løft, vent, angrepPågår, rekke: () => o.slice(), pauset: () => pauset, merke: () => merke.classList.contains('på'), løftet: () => [...løftet.keys()].map(e => e.id) });
})(typeof globalThis !== 'undefined' ? globalThis : this);
