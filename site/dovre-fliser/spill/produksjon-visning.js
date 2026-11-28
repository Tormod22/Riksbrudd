/* PRODUKSJON – visningen (28. nov, fase Ø1 i docs/plan-selskap-okonomi.md, kapittel 4). Reglene: spill/produksjon.js.
 *  - KROKER.sim: maskinene i leiren (sagbruk, vedkløyver, fyrkjele) går med folk på «maskin», strøm og råvare (Produksjon.steg).
 *    Fyrkjelens strøm går inn i Leir.steg (Leir.maskinKW), en maskin som står tar ikke strøm (Leir.hviler), og kjelens varme
 *    erstatter ved og diesel i fyringen (FolkRegler.varmeAndel). Jobbtavla får jobben «maskin» (Jobber.maskiner).
 *  - Fanen Produksjon i panelet «Selskapet» (ProduksjonSpill.html / etter): maskinene som rader, lageret, folk, og grafene for
 *    produksjonen og «hvorfor saga sto» (StatistikkSpill.leggTilKilde).
 *  - 2D: et lite tall over hver maskin («1,1 m³/t», «30 kW»), grønt når den går, og grunnen når den står (zoomet inn).
 *  - Tømmerbil: kan kjøpes i fanen (Kjoretoy.TYPER.tømmerbil, 20 m³) og frakter tømmer fra hogstfeltene (ressurser.js).
 *  - Kommandoen «maskin» { bygg, av } slår en maskin av og på (gjennom KOMMANDO).
 * Tellingene lagres per leir i «riksbrudd-produksjon» ({ leir: 'x,y', P }). Tallene er Claudes forslag (REGLER i produksjon.js).
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.Produksjon || !window.Leir) return;
  const PR = window.Produksjon, LB = window.Leir, FR = window.FolkRegler, NØKKEL = 'riksbrudd-produksjon';
  // Claudes forslag: tømmerbilens pris og når et stopp meldes i loggen (en gang per maskin og grunn, høyst hvert 30. spillminutt)
  const VIS = { tømmerbilPris: PR.REGLER.tømmerbil.pris, meldHvert: 30, grafHvert: 4000 };
  const nf = PR.nf, kr = v => (LB.kroner ? LB.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const F = () => (window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null);
  const Sp = () => (window.OppstartSpill ? OppstartSpill.tilstand() : null);
  const leirId = () => { const s = Sp(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  const nåTid = () => (typeof tid !== 'undefined' ? tid : 0);
  let P = PR.ny(), id = '', sist = { status: {}, kw: 0, varme: 0 }, sistLagret = 0, meldt = {};

  // ---------- lagring (per leir) ----------
  function les() { const n = leirId(); if (n === id) return; id = n; P = PR.ny(); meldt = {};
    try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d && d.leir === n) P = PR.fraJSON(d.P); } catch (e) { /* sperret */ } }
  function lagre() { if (!id) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: id, P: { versjon: 1, laget: P.laget, brukt: P.brukt, sto: P.sto, gikk: P.gikk } })); } catch (e) { /* fullt */ } }

  // ---------- arbeidskraften: folk på «maskin» × tempo (ferdighet, moral, helse, døgnplanen) ----------
  const kraft = () => { const f = F(); if (!f || !FR) return 0; return FR.arbeidere(f, 'maskin') * (FR.tempo(f, 'maskin') || 0); };

  // ---------- krokene i reglene ----------
  LB.maskinKW = l => (l === L() ? sist.kw : 0);
  LB.hviler = (l, b) => (l === L() ? PR.hviler(l, b, kraft()) : false);
  if (FR) FR.varmeAndel = (l, B) => (l === L() ? PR.varmeAndel(sist.varme, B.fyring) : 0);
  if (window.Jobber) Jobber.maskiner = (f, l) => {
    const M = PR.maskinene(l); if (!M.length) return null;
    const hva = M.map(b => `Driv ${LB.BYGG[b.type].navn.toLowerCase()}` + (sist.status[b.id] && !sist.status[b.id].går ? ` (${sist.status[b.id].tekst})` : ''));
    // står ALLE maskinene for råvare, plass eller av, sendes ingen dit (folkene gjør noe annet imens)
    const alle = M.every(b => { const v = PR.vil(l, b); return v.grunn && v.grunn !== 'folk'; });
    return { plasser: M.reduce((s, b) => s + PR.REGLER.maskiner[b.type].folk, 0), hva, blokk: alle ? PR.grunnTekst(PR.vil(l, M[0]).grunn, M[0].type) : null };
  };

  // ---------- simuleringen ----------
  if (typeof KROKER !== 'undefined') KROKER.sim.push(dt => {
    const l = L(); if (!l || !(dt > 0)) return; les();
    if (!PR.maskinene(l).length) { sist = { status: {}, kw: 0, varme: 0 }; return; }
    const mangler = window.LeirSpill && LeirSpill.siste ? LeirSpill.siste().mangler : new Set();
    const før = sist.status; sist = PR.steg(P, l, dt, { kraft: kraft(), mangler });
    // et stopp meldes én gang (ny grunn), ikke oftere enn hvert 30. spillminutt per maskin
    for (const [bid, s] of Object.entries(sist.status)) { const f = før[bid];
      if (!s.går && s.grunn && s.grunn !== 'av' && f && f.går && (meldt[bid] === undefined || nåTid() - meldt[bid] > VIS.meldHvert || nåTid() < meldt[bid])) {
        meldt[bid] = nåTid(); if (typeof logg === 'function') logg(`${LB.BYGG[s.type].navn} står: ${s.tekst}.`); }
      if (s.går && f && !f.går && f.grunn && f.grunn !== 'av' && typeof logg === 'function' && meldt[bid] !== undefined) logg(`${LB.BYGG[s.type].navn} går igjen.`); }
    if (performance.now() - sistLagret > 5000) { sistLagret = performance.now(); lagre(); }
  });

  // ---------- statistikken: produksjon og «hvorfor saga sto» (snitt over døgnet: × 24 = per døgn) ----------
  function sagaAndel(g) { const S = Object.values(sist.status).filter(s => s.type === 'sagbruk'); if (!S.length) return 0;
    return 24 * S.reduce((a, s) => a + (s.grunn === g ? 1 - s.drift : 0), 0) / S.length; }
  const perDøgn = v => 24 * Object.values(sist.status).reduce((a, s) => a + ((s.ut && s.ut[v]) || 0), 0);
  function kilder() {
    const SS = window.StatistikkSpill; if (!SS || kilder.ferdig) return; kilder.ferdig = true;
    SS.leggTilKilde('prodPlanker', () => perDøgn('tre'), { navn: 'Planker', enhet: 'm³', graf: 'produksjon', grafNavn: 'Produksjon', type: 'søyle', tekst: 'Det maskinene laget per døgn (m³).' });
    SS.leggTilKilde('prodFlis', () => perDøgn('flis'), { navn: 'Flis', enhet: 'm³', graf: 'produksjon' });
    SS.leggTilKilde('prodVed', () => perDøgn('ved'), { navn: 'Ved', enhet: 'm³', graf: 'produksjon' });
    SS.leggTilKilde('sagaTom', () => sagaAndel('tom'), { navn: 'Tom for tømmer', enhet: 't', graf: 'sagaSto', grafNavn: 'Hvorfor saga sto', type: 'søyle', tekst: 'Timer per døgn sagbruket sto, etter grunnen.' });
    SS.leggTilKilde('sagaFolk', () => sagaAndel('folk'), { navn: 'Ingen folk', enhet: 't', graf: 'sagaSto' });
    SS.leggTilKilde('sagaStrøm', () => sagaAndel('strøm'), { navn: 'Uten strøm', enhet: 't', graf: 'sagaSto' });
    SS.leggTilKilde('sagaFullt', () => sagaAndel('fullt'), { navn: 'Lageret fullt', enhet: 't', graf: 'sagaSto' });
  }

  // ---------- kommandoen «maskin» { bygg, av } ----------
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true;
    Kommando.registrer('maskin', { leir: true,
      sjekk: k => { const l = L(); if (!l) return 'Ingen leir.'; const b = l.bygg.find(q => q.id === k.bygg); return !b || !PR.erMaskin(b.type) ? 'Fant ikke maskinen.' : typeof k.av !== 'boolean' ? 'Ugyldig valg.' : null; },
      utfør: k => { const b = L().bygg.find(q => q.id === k.bygg); if (k.av) b.av = true; else delete b.av; if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); return { av: !!b.av }; },
      beskriv: k => (k.av ? 'slår av en maskin' : 'slår på en maskin') });
  }
  const kom = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; if (!r.ok && r.feil && typeof logg === 'function') logg(r.feil); return r; };

  // ---------- tømmerbilen ----------
  function tømmerbilType() { if (window.Kjoretoy && Kjoretoy.TYPER && !Kjoretoy.TYPER.tømmerbil) Kjoretoy.TYPER.tømmerbil = { ...Kjoretoy.TYPER.lastebil, navn: 'Tømmerbil', flertall: 'tømmerbiler', maks: 70, lengde: 13 }; }
  function kjøpTømmerbil() {
    tømmerbilType(); const s = Sp(); if (!s || !s.leir) return { feil: 'Sett opp leiren først.' }; if (!window.Kjoretoy || typeof KJORETOY === 'undefined') return { feil: 'Kjøretøyene er ikke klare.' };
    if (!OppstartSpill.betal(VIS.tømmerbilPris)) return { feil: `Ikke nok penger (${kr(VIS.tømmerbilPris)}).` };
    const n = KJORETOY.filter(k => k.type === 'tømmerbil').length + 1, k = Kjoretoy.ny({ navn: `Tømmerbil ${n}`, type: 'tømmerbil', antall: 1, x: s.leir.x + 25, y: s.leir.y - 30, side: 'blå', retning: -1.2 });
    KJORETOY.push(k); if (typeof skitten !== 'undefined') skitten = true; return { navn: k.navn };
  }

  // ---------- fanen Produksjon ----------
  const VARER = [['tømmer', 'Tømmer'], ['tre', 'Planker'], ['flis', 'Flis'], ['ved', 'Ved']];
  function html() {
    const l = L(); if (!l) return '<p class="rolig">Sett opp leiren først.</p>';
    les(); const M = PR.maskinene(l), plass = LB.lagerplass(l), f = F(), n = f && FR ? FR.arbeidere(f, 'maskin') : 0, trenger = M.reduce((s, b) => s + PR.REGLER.maskiner[b.type].folk, 0);
    let h = '<p class="rolig" style="margin:6px 0">Maskinene gjør tømmer om til planker, flis og ved. De går bare med folk på «Maskiner», strøm og noe å arbeide med.</p>';
    if (!M.length) h += '<div class="krav"><div>Ingen maskiner ennå.</div><small>Bygg et sagbruk i Leir → Bygg (gruppen Produksjon). Hogst gir tømmer – saga gjør det til planker. Uten saga kan tømmeret selges billig.</small></div>';
    for (const b of M) { const B = LB.BYGG[b.type], R = PR.REGLER.maskiner[b.type], s = sist.status[b.id] || { går: false, tekst: 'venter', folk: 0, drift: 0 };
      const strøm = R.gir ? `gir ${nf(s.kw || 0, 0)} av ${R.gir} kW` : `${R.kw} kW`;
      h += `<div class="by mrad" data-maskin="${b.id}"><span>${esc(B.navn)}<small>${esc(PR.oppskrift(b.type))}</small><small>Folk ${nf(s.folk || 0, 1)} av ${R.folk} · ${strøm} · slitt ${Math.round((1 - (b.hp || 0)) * 100)} %</small></span>`
        + `<em class="${s.går ? 'grønn' : b.av ? '' : 'rød'}">${esc(s.går ? s.tekst : b.av ? 'slått av' : s.tekst)}</em>`
        + `<button type="button" data-pr="av" data-id="${b.id}" data-av="${b.av ? '0' : '1'}">${b.av ? 'Slå på' : 'Slå av'}</button></div>`; }
    h += '<ul class="tall">' + VARER.map(([v, navn]) => `<li><span>${navn}</span><b>${nf((l.lager && l.lager[v]) || 0, 1)} av ${plass} m³</b></li>`).join('');
    h += `<li class="prfolk"><span>Folk på «Maskiner»</span><button type="button" data-pr="folk" data-r="minus" aria-label="Færre på maskinene">−</button><b>${n}${trenger ? ' av ' + trenger : ''}</b><button type="button" data-pr="folk" data-r="pluss" aria-label="Flere på maskinene">+</button></li>`;
    if ((P.laget.tre || 0) + (P.laget.ved || 0) >= .05) h += `<li><span>Laget hittil</span><b>${nf(P.laget.tre || 0, 1)} m³ planker<small>${nf(P.laget.flis || 0, 1)} m³ flis, ${nf(P.laget.ved || 0, 1)} m³ ved · verdt ${kr(PR.verdi(P, LB.MATERIALER))} mer enn tømmeret</small></b></li>`;
    const sto = Object.entries(P.sto).filter(([, t]) => t > .05).sort((a, b) => b[1] - a[1]);
    if (sto.length) h += `<li><span>Maskinene sto</span><b>${nf(sto.reduce((a, q) => a + q[1], 0), 1)} t<small>${sto.map(([g, t]) => `${PR.grunnTekst(g, g === 'tom' ? 'sagbruk' : '')} ${nf(t, 1)} t`).join(', ')}</small></b></li>`;
    h += '</ul>';
    if (window.StatistikkSpill) h += '<h3>Produksjon per døgn</h3><div class="prgraf" data-graf="produksjon"></div><h3>Hvorfor saga sto</h3><div class="prgraf" data-graf="sagaSto"></div>';
    const biler = typeof KJORETOY !== 'undefined' ? KJORETOY.filter(k => k.type === 'tømmerbil' && k.side === 'blå').length : 0;
    h += `<div class="knapperad"><button type="button" data-pr="bygg">Bygg en maskin</button><button type="button" data-pr="bil">Kjøp tømmerbil (${kr(VIS.tømmerbilPris)})</button></div>`;
    h += `<p class="rolig" style="font-size:13px">Tømmerbilen tar 20 m³ tømmer fra et hogstfelt om gangen (velg den i Leir → Ressurser).${biler ? ` Dere har ${biler}.` : ''}</p>`;
    return h;
  }
  let sistGraf = 0;
  function etter(rot, ny) {
    kilder(); if (!window.StatistikkSpill) return;
    if (!ny && performance.now() - sistGraf < VIS.grafHvert) return; sistGraf = performance.now();
    for (const e of rot.querySelectorAll('.prgraf[data-graf]')) { try { StatistikkSpill.graf(e, e.dataset.graf, { bredde: Math.min(520, rot.clientWidth - 8 || 300), høyde: 170 }); } catch (er) { /* */ } }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#selskapet [data-pr]'); if (!b) return; e.stopPropagation(); const s = b.dataset.pr;
    if (s === 'av') { const r = kom({ type: 'maskin', bygg: +b.dataset.id, av: b.dataset.av === '1' }); if (r.ok && typeof logg === 'function') logg(r.svar.av ? 'Maskinen er slått av.' : 'Maskinen er slått på.'); }
    else if (s === 'folk') { const r = kom({ type: 'folkFlytt', oppgave: 'maskin', retning: b.dataset.r }); if (r.ok && r.svar && typeof logg === 'function') logg(`${r.svar.navn} er nå på ${FR.OPPGAVE[r.svar.oppgave].navn.toLowerCase()}.`); if (window.FolkSpill && FolkSpill.vis) try { FolkSpill.vis(); } catch (er) { /* */ } }
    else if (s === 'bygg') { if (window.SelskapetSpill) SelskapetSpill.vis(false); const lk = document.getElementById('leirknapp'), lm = document.getElementById('leirmeny'); if (lk && !(lm && lm.classList.contains('på'))) lk.click(); if (window.LeirSpill && LeirSpill.fane) LeirSpill.fane('bygg'); }
    else if (s === 'bil') { const r = kjøpTømmerbil(); if (typeof logg === 'function') logg(r.feil || `${r.navn} er kjøpt og står ved leiren.`); }
    if (window.SelskapetSpill && SelskapetSpill.tegn) SelskapetSpill.tegn();
  }, true);

  // ---------- 2D: tallet over maskinen ----------
  if (typeof KROKER !== 'undefined') KROKER.tegn.push((g, vx0, vy1) => {
    const l = L(); if (!l || typeof kam === 'undefined' || kam.m > 4) return; const M = PR.maskinene(l); if (!M.length) return;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'bottom';
    for (const b of M) { const s = sist.status[b.id], x = (b.x - vx0) / kam.m, y = (vy1 - b.y) / kam.m - 16 / Math.max(.4, kam.m);
      const t = PR.merke(b.type, s), går = s && s.går, under = !går && s ? s.tekst : b.av ? 'slått av' : '';
      g.font = '600 12px "Cormorant Garamond", serif'; const w = Math.max(g.measureText(t).width, under && kam.m < 1.6 ? g.measureText(under).width : 0) + 10;
      g.fillStyle = 'rgba(20,17,12,.78)'; g.fillRect(x - w / 2, y - 16 - (under && kam.m < 1.6 ? 14 : 0), w, 17 + (under && kam.m < 1.6 ? 14 : 0));
      g.fillStyle = går ? '#a9d48a' : '#e0a070'; g.fillText(t, x, y);
      if (under && kam.m < 1.6) { g.font = '11px "Cormorant Garamond", serif'; g.fillStyle = '#d8c8a8'; g.fillText(under, x, y - 14); } }
    g.restore();
  });

  // ---------- byggelista, ikonene, 2D-stilen og tømmerbilen (de lastes etter denne fila) ----------
  const I = { sag: "<circle cx='12' cy='12' r='8'/><path d='M12 4l2 3M20 12l-3 2M12 20l-2-3M4 12l3-2M12 9v6M9 12h6'/>",
    kloyver: "<path d='M4 20l9-9M13 11l3-7 4 4-7 3M3 21h7'/>", kjele: "<rect x='5' y='8' width='12' height='13' rx='1'/><path d='M9 8V4h4v4M8 17c1-2 3-2 3-4 1 2 3 2 2 4'/>" };
  { const url = s => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${s}</svg>`)}")`;
    const css = document.createElement('style'); css.textContent = Object.entries(I).map(([n, s]) => `[data-ikon="${n}"]{ --ik:${url(s)}; }`).join('\n') + '\n#selskapet .mrad button{ flex:none; } #selskapet .prgraf{ margin:4px 0 8px; } #selskapet .tall li.prfolk{ align-items:center; gap:6px; } #selskapet .tall li.prfolk span{ flex:1; } #selskapet .tall li.prfolk button{ min-width:34px; min-height:30px; }';
    document.head.appendChild(css); }
  function oppsett() {
    if (window.Ikoner && Ikoner.BYGG) Object.assign(Ikoner.BYGG, { sagbruk: 'sag', vedkløyver: 'kloyver', fyrkjele: 'kjele' });
    if (window.Leir2d && Leir2d.STIL) Object.assign(Leir2d.STIL, {
      sagbruk: { form: 'sal', tak: '#6e5a40', h: 6, kropp: [-6.1, 6.1, -7.1, 7.1], bølge: true, plass: [6.1, 12, -7.3, 7.3], porter: [-3.5, 3.5], vinduer: 2 },
      vedkløyver: { form: 'kasse', tak: '#5a6a3a', h: 2.4, kropp: [-3, 3.05, -1.2, 1.2], ribber: true, stripe: '#c9a227' },
      fyrkjele: { form: 'kasse', tak: '#55504a', h: 3, kropp: [-1.6, 1.6, -1, 1], rist: true, eksos: [-1, .55], pipe: [-1, .55], røyk: true } });
    const G = window.LEIR2_GRUPPER; if (Array.isArray(G) && !G.some(g => g[0] === 'Produksjon')) G.push(['Produksjon', ['sagbruk', 'vedkløyver', 'fyrkjele']]);
    else if (!G) window.LEIR2_GRUPPER = [['Produksjon', ['sagbruk', 'vedkløyver', 'fyrkjele']]];
    tømmerbilType(); kilder(); registrer();
    // fanen Produksjon er ikke lenger «kommer»
    if (window.Selskapsbilde && Selskapsbilde.REGLER) { const f = Selskapsbilde.REGLER.FANER.find(q => q.id === 'produksjon'); if (f) f.klar = true; }
    const fb = document.querySelector('#selskapet .sfaner button[data-fane="produksjon"]'); if (fb) fb.classList.remove('kommer');
  }
  window.addEventListener('riksbrudd-spill', () => { les(); oppsett(); });
  window.addEventListener('load', () => setTimeout(oppsett, 0));
  window.addEventListener('pagehide', lagre);

  window.ProduksjonSpill = { html, etter, tilstand: () => P, siste: () => sist, kraft, lagre, les: () => { id = ''; les(); }, kjøpTømmerbil, oppsett, VIS,
    // for vakta og testene: nullstill tellingene
    nullstill: () => { P = PR.ny(); sist = { status: {}, kw: 0, varme: 0 }; } };
})();
