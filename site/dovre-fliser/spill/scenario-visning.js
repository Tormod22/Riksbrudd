'use strict';
// SPILLFORMER i spillet (reglene: spill/scenario.js; natt 18. nov). window.SPILLREGLER = valgene til dette spillet (vanskelighetsgrad,
// utfordringer, scenario) – andre moduler leser den. Her kobles valgene på det denne pakka eier: fiendens treff (KROKER.ild), sikt,
// ordre uten radio, evig vinter og ingen kjøp. I tillegg: scenariet (mål og frist), tap av leiren (start i en utpost), etterspill
// (øyeblikksbilder som kan spoles) og ukas oppdrag. Egen tilstand per leir i «riksbrudd-spillform», etterspillet i «riksbrudd-etterspill».
// I testene (navigator.webdriver) skjer ingenting av seg selv før ScenarioSpill.test = true.
(function () {
  const SC = window.Scenario, R = SC.REGLER, NØKKEL = 'riksbrudd-spillform', NØKKEL_E = 'riksbrudd-etterspill', FLYTT = 'riksbrudd-flytt';
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const idAv = l => Math.round(l.x) + ',' + Math.round(l.y);
  const auto = () => !navigator.webdriver || api.test === true;
  window.SPILLREGLER = SC.regler({});

  // ---------- en leir som er flyttet (utpost): tilstanden som huskes per leir, følger med ----------
  // Kjøres med en gang skriptet lastes, før noen modul har lest sin lagring (de leser ved «riksbrudd-spill»).
  let flyttet = null;
  try { const f = JSON.parse(localStorage.getItem(FLYTT) || 'null');
    if (f && f.fra && f.til) { flyttet = f; const [tx, ty] = f.til.split(',').map(Number), [fx, fy] = f.fra.split(',').map(Number);
      // (runde 7) bare nøklene til denne siden (spill/lagringsside.js) – ikke et spill med samme leir på en annen side
      const egen = k => !window.LagringSide || LagringSide.egen(k), navn = k => (window.LagringSide && LagringSide.hvem(k) ? LagringSide.hvem(k).navn : k);
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!/^riksbrudd-/.test(k) || navn(k) === FLYTT || !egen(k)) continue;
        try { const d = JSON.parse(localStorage.getItem(k)); if (!d || typeof d !== 'object') continue;
          if (d.leir === f.fra) { d.leir = f.til; localStorage.setItem(k, JSON.stringify(d)); }
          else if (d.leir && typeof d.leir === 'object' && Math.round(d.leir.x) === fx && Math.round(d.leir.y) === fy && navn(k) !== 'riksbrudd-k1') { d.leir = { x: tx, y: ty }; localStorage.setItem(k, JSON.stringify(d)); }
        } catch (e) { /* ikke JSON */ } }
      localStorage.removeItem(FLYTT); } } catch (e) { flyttet = null; }

  // ---------- tilstanden ----------
  let T = null, leirId = '', klar = false, E = [];
  const tom = () => ({ leir: leirId, mat: false, sc: {}, scMeldt: null, tap: {}, tapt: 0, uke: null });
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify(T)); } catch (e) { /* fullt eller sperret */ } };
  const lagreE = () => { try { localStorage.setItem(NØKKEL_E, JSON.stringify({ leir: leirId, liste: E })); } catch (e) { /* fullt: de eldste bildene tas bort neste gang */ E.splice(0, Math.ceil(E.length / 3)); } };
  function settRegler() { const S = spill(); window.SPILLREGLER = SC.regler(S && S.regler ? S.regler : {}); return window.SPILLREGLER; }
  function start() {
    const S = spill(); if (!S || !S.leir) return; leirId = idAv(S.leir); settRegler();
    try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); T = d && d.leir === leirId ? { ...tom(), ...d } : tom(); } catch (e) { T = tom(); }
    try { const d = JSON.parse(localStorage.getItem(NØKKEL_E) || 'null'); E = d && d.leir === leirId && Array.isArray(d.liste) ? d.liste : []; } catch (e) { E = []; }
    klar = true; pakkAlle(); setTimeout(pakkAlle, 600); statStart();
    // start uten ferdige lag: litt mer mat, så de første dagene går opp (én gang per spill)
    if (S.utenLag && !T.mat) { const F = window.FolkSpill && FolkSpill.tilstand(); if (F) { F.mat += R.startmat; T.mat = true; lagre(); if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); } }
    const r = window.SPILLREGLER;
    if (!navigator.webdriver && (r.vanskelighet !== 'vanlig' || r.utfordringer.length || r.scenario)) setTimeout(() => logg('Spillform: ' + SC.beskriv(r) + '.' + (r.scenario ? ' ' + SC.SCENARIER[r.scenario].tekst : '')), 2200);
    if (flyttet) { const f = flyttet; flyttet = null; setTimeout(() => visKort('Leiren falt', f.tekst || 'Dere har slått dere ned i en utpost med det som var igjen.', [['Bygg opp igjen', null]]), 1500); }
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));

  // ---------- reglene som endres ----------
  // vanskelighetsgraden: fiendens treff (røvere og motstandere)
  KROKER.ild.push((a, b) => (a.side !== 'blå' && b.side === 'blå' ? window.SPILLREGLER.faktor.fiende : 1));
  // utfordringen «Tåkeland»
  KROKER.sikt.push(s => (s.side === 'blå' && window.SPILLREGLER.har('tåkeland') ? R.siktFaktor : 1));
  // utfordringen «Ingen radio»: ordre bare innen 3 km fra leiren (deg selv kan du alltid styre)
  let radioSagt = 0;
  KROKER.kanOrdre.push(s => { if (!window.SPILLREGLER.har('ingenRadio') || s.karakter || s.side !== 'blå') return true; const S = spill(); if (!S || !S.leir) return true;
    if (Math.hypot(s.x - S.leir.x, s.y - S.leir.y) <= R.radioKm * 1000) return true;
    if (performance.now() - radioSagt > 1500) { radioSagt = performance.now(); logg(`${s.navn} er over ${R.radioKm} km fra leiren og hører deg ikke (utfordringen «Ingen radio»). Laget gjør ferdig ordren det har.`); } return false; });
  KROKER.lagTekst.push(s => { if (!window.SPILLREGLER.har('ingenRadio') || s.side !== 'blå' || s.karakter) return null; const S = spill(); return S && S.leir && Math.hypot(s.x - S.leir.x, s.y - S.leir.y) > R.radioKm * 1000 ? 'uten kontakt (ingen radio)' : null; });
  // utfordringen «Evig vinter»: årstiden holdes på vinter
  setInterval(() => { if (!klar || !window.SPILLREGLER.har('evigVinter') || !window.VaerSpill || !window.Vaer) return; if (VaerSpill.S.årstid !== 'vinter') { Vaer.settÅrstid(VaerSpill.S, 'vinter', tid); VaerSpill.oppdater(); } }, 3000);
  // utfordringen «Ingen kjøp»: kjøp av materialer, diesel og mat avvises (reglene pakkes inn her; byggene koster fortsatt penger)
  const nekt = () => ({ feil: 'Utfordringen «Ingen kjøp»: dette kan ikke kjøpes. Hogg, riv, let i hus eller dyrk selv.' });
  function pakkInn(obj, navn) { if (!obj || typeof obj[navn] !== 'function' || obj[navn].spillform) return; const f = obj[navn]; obj[navn] = function (...a) { return window.SPILLREGLER.har('ingenKjøp') ? nekt() : f.apply(this, a); }; obj[navn].spillform = true; }
  // (markedet i spill/spillet-visning.js bytter ut de samme funksjonene når spillet starter – derfor pakkes de inn på nytt i start())
  const pakkAlle = () => { pakkInn(window.Leir, 'kjøpMateriale'); pakkInn(window.Leir, 'kjøpDrivstoff'); pakkInn(window.FolkRegler, 'kjøpMat'); };
  pakkAlle();

  // ---------- kortet midt på skjermen ----------
  const css = document.createElement('style');
  css.textContent = `#formkort{ position:fixed; inset:0; z-index:41; display:none; align-items:center; justify-content:center; background:rgba(10,8,5,.72); } #formkort.på{ display:flex; }
body.formkortpå #krig, body.formkortpå #panel, body.formkortpå #leirmeny, body.formkortpå #folkmeny, body.formkortpå #tropppanel{ z-index:19 !important; }
#formkort .oppsum{ margin:0 0 14px; text-align:left; font-size:14px; } #formkort .oppsum dl{ display:grid; grid-template-columns:auto 1fr; gap:3px 12px; margin:0 0 8px; padding:8px 10px; background:#241d12; border:1px solid #4a4030; }
#formkort .oppsum dt{ color:var(--ink-dim,#a99); } #formkort .oppsum dd{ margin:0; color:#f0e2b0; } #formkort .oppsum h3{ margin:8px 0 3px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); }
#formkort .oppsum ul{ margin:0; padding-left:18px; line-height:1.4; } #formkort > div{ max-height:92vh; overflow:auto; }
body.kort #formkort .oppsum{ font-size:13px; } body.kort #formkort h2{ font-size:21px; }
#formkort > div{ width:min(440px,90vw); padding:18px 20px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); text-align:center; } #formkort h2{ margin:0 0 8px; font-size:26px; } #formkort p{ margin:0 0 14px; }
#formkort button, #etterspill button{ background:#2a2318; border:1px solid #c9b26a; color:inherit; min-height:38px; padding:4px 16px; margin:3px; font:inherit; cursor:pointer; }
#leirmeny .spillform{ margin:6px 0; padding:6px 8px; border:1px solid #3a3226; background:#1e1911; font-size:13.5px; line-height:1.35; } #leirmeny .spillform b{ color:#f0e2b0; } #leirmeny .spillform small{ display:block; color:var(--ink-dim); }
#leirmeny .spillform .stolpe{ height:7px; background:#2e281e; margin:4px 0 2px; } #leirmeny .spillform .stolpe i{ display:block; height:100%; background:#c9b26a; }
#leirmeny .spillform.vunnet{ border-color:#7fa04a; } #leirmeny .spillform.tapt{ border-color:#a0523a; }
#etterspill{ position:fixed; left:50%; transform:translateX(-50%); bottom:14px; z-index:13; display:none; width:min(560px,96vw); padding:8px 12px 10px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; text-align:center; }
#etterspill.på{ display:block; } #etterspill input[type=range]{ width:100%; margin:6px 0 2px; } #etterspill b{ color:#f0e2b0; } #etterspill small{ display:block; color:var(--ink-dim,#a99); }
#etterspill .forkl{ display:flex; flex-wrap:wrap; justify-content:center; gap:2px 12px; margin:5px 0 0; font-size:12.5px; color:var(--ink-dim,#a99); } #etterspill .forkl span{ white-space:nowrap; }
#etterspill .prøve{ display:inline-block; width:10px; height:10px; margin:0 3px -1px 0; border:1px solid #e7dcc3; vertical-align:baseline; } #etterspill .prøve.rund{ border-radius:50%; } #etterspill .prøve.rute{ transform:rotate(45deg) scale(.8); }
#etterspill .prøve.tom{ border-color:rgba(231,220,195,.55); } #etterspill .prøve.ring{ border:2px solid #f0c878; border-radius:50%; background:none; } #etterspill small.byttet{ color:#f0c878; }
body.kort #etterspill .forkl{ font-size:11.5px; gap:0 8px; } body.kort #etterspill{ bottom:6px; padding:5px 8px 6px; }
#etterlerret{ position:fixed; z-index:8; pointer-events:none; display:none; } body.etterspill #etterlerret{ display:block; }
body.etterspill #kommando, body.etterspill #panel, body.etterspill #logg, body.etterspill #varsler, body.etterspill #flytgruppe{ display:none; }`;
  document.head.appendChild(css);
  // (id-en må ikke begynne på «sp»: fartsknappene i index.html slår klassen «på» av og på for alle [id^=sp])
  const kort = el('div', { id: 'formkort', role: 'alertdialog' }); document.body.appendChild(kort);
  // ekstra = et element som står mellom teksten og knappene (oppsummeringen på seiersskjermen)
  // (runde 12) body.formkortpå: krigspanelet og de andre panelene legges under det mørke sløret mens kortet står (d4-modal-13.png)
  const kortAv = () => { kort.classList.remove('på'); document.body.classList.remove('formkortpå'); };
  // det samme for krigskortene («Området er ditt», spill/strategi-visning.js)
  setInterval(() => { const k2 = document.getElementById('krigkort'), på = kort.classList.contains('på') || !!(k2 && k2.classList.contains('på')); if (document.body.classList.contains('formkortpå') !== på) document.body.classList.toggle('formkortpå', på); }, 300);
  function visKort(tittel, tekst, valg, ekstra) {
    const d = el('div', {}, el('h2', {}, tittel), el('p', {}, tekst)); if (ekstra) d.append(ekstra);
    const kn = el('div', { klasse: 'valg' }); d.append(kn);
    for (const [t, fn] of valg && valg.length ? valg : [['Fortsett', null]]) { const b = el('button', {}, t); b.onclick = () => { kortAv(); if (fn) fn(); }; kn.append(b); }
    kort.replaceChildren(d); kort.classList.add('på'); document.body.classList.add('formkortpå');
    if (typeof tempo !== 'undefined' && tempo > 0 && document.getElementById('sp0')) document.getElementById('sp0').click();
  }

  // ---------- (runde 12) PAUSEN HOLDER MED EN GANG ----------
  // PC-kritiker F: «"Spillet står på pause til du svarer" mens klokka går (14:07 → 14:14)» (47-hvorfor-sakte.png). Årsaken: spill/skjermlag.js
  // ser etter kort hvert 150. ms, men på 600× går ett bilde 2,5 spillminutter fram, og med treg grafikk (0,75 bilder i sekundet) rakk flere
  // bilder å gå før pausen kom. Nå sjekkes det i hvert steg av simuleringen: står et kort som venter på svar, settes pausen straks
  // (Skjermlag.pause – samme regler, samme lapp), og løkka i index.html stopper resten av bildet når farten er 0.
  const KORT_ID = (window.Skjermlag && Skjermlag.KORT) || ['hendelse', 'samfunnkort', 'formkort', 'krigkort'];
  KROKER.sim.unshift(() => { if (typeof tempo === 'undefined' || tempo <= 0 || !window.Skjermlag || !Skjermlag.pause || (navigator.webdriver && Skjermlag.test !== true)) return;
    for (const id of KORT_ID) { const e = document.getElementById(id); if (e && e.classList.contains('på') && e.getClientRects().length) { Skjermlag.pause(); return; } } });

  // ---------- øyeblikksbildet for scenarier og ukas oppdrag ----------
  const byer = () => (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [];
  const midt = b => [(b.bb[0] + b.bb[2]) / 2, (b.bb[1] + b.bb[3]) / 2];
  const eier = id => (window.Garnison ? Garnison.tilstand(TETTSTEDER, id).eier : null);
  const egneLag = () => ENHETER.filter(s => s.side === 'blå' && !s.karakter && levende(s));
  let nærmest = null, nærmestNøkkel = '';
  function nærmesteBy() { const S = spill(), B = byer(), k = leirId + '|' + B.length; if (k === nærmestNøkkel) return nærmest; nærmestNøkkel = k; nærmest = null; let bd = 60000;
    for (const b of B) { const [x, y] = midt(b); if (window.OMRÅDE_OK && !OMRÅDE_OK(x, y)) continue; const d = Math.hypot(x - S.leir.x, y - S.leir.y); if (d < bd) { bd = d; nærmest = b; } } return nærmest; }
  function nå() {
    const S = spill(), L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(); let egne = 0; if (window.TETTSTEDER) for (const t of TETTSTEDER.values()) if (t && t.eier === 'blå') egne++;
    let andel = 0; try { const K = window.StrategiSpill && StrategiSpill.bilde(); if (K) andel = K.st.sider.blå.andel; } catch (e) { andel = 0; }
    const nb = nærmesteBy(), iLag = egneLag().filter(s => s.fraFolk).reduce((a, s) => a + s.menn.filter(m => m.hp > 0).length, 0);
    return { tid, egne, tettsteder: egne, holder: id => eier(id) === 'blå', mistet: id => { const t = window.TETTSTEDER && TETTSTEDER.get(id); return !!(t && t.eier && t.eier !== 'blå'); },
      mål: nb ? nb.e.id : null, målNavn: nb ? nb.e.navn : null, målOm: nb ? målOm(nb) : null, folk: (F ? F.personer.length : 0) + iLag, andel, leirTapt: !!(T && T.tapt),
      penger: S ? S.penger : 0, bygg: L && window.Leir ? (L.bygg || []).filter(b => Leir.ferdig(b) && !Leir.BYGG[b.type].del).length : 0,
      angrep: T && kreverAngrep() ? { slått: !!T.sc.slått, pågår: !!(T.sc.angrep && T.sc.angrep.pågår), samler: !!(T.sc.angrep && !T.sc.angrep.pågår), ingen: !!T.sc.ingen } : undefined };
  }

  // (runde 14, kritiker J) «Kystalliansens, 9 km NV»: eieren og retningen fra leiren til scenariets by
  const RETNING = ['Ø', 'NØ', 'N', 'NV', 'V', 'SV', 'S', 'SØ'];
  function målOm(b) { const S = spill(), [x, y] = midt(b), e = eier(b.e.id), d = S && S.leir ? Math.hypot(x - S.leir.x, y - S.leir.y) : 0;
    const eierT = e === 'blå' ? 'ditt' : e ? (window.Fraksjoner && Fraksjoner.FRAKSJONER[e] ? Fraksjoner.FRAKSJONER[e].eieform : 'fiendens') : 'nøytralt';
    if (!S || !S.leir || d < 300) return eierT;
    const r = RETNING[((Math.round(Math.atan2(y - S.leir.y, x - S.leir.x) / (Math.PI / 4)) % 8) + 8) % 8], km = d < 10000 ? String(Math.round(d / 100) / 10).replace('.', ',') : String(Math.round(d / 1000));
    return `${eierT}, ${km} km ${r}`; }
  // ---------- scenariet ----------
  // (runde 14) holdtFra lagres straks den endres (før ble den bare lagret når scenariet var ferdig, så en omlasting startet telleren på nytt)
  function scenarioNå() { const r = window.SPILLREGLER; if (!klar || !r.scenario) return null; const B = nå(), før = T.sc.holdtFra, s = SC.vurder(r.scenario, B, T.sc); s.navn = SC.SCENARIER[r.scenario].navn; s.målNavn = B.målNavn; s.mål = B.mål; s.målOm = B.målOm;
    if (T.sc.holdtFra !== før) lagre(); return s; }
  function scenarioSteg() {
    const s = scenarioNå(); if (!s) return s;
    // (runde 14, kritiker J: «ingen melding når framgangen nullstilles») byen gikk tapt: én linje i loggen og i dagboka
    if (T.sc.mistetVed != null && !T.sc.mistetMeldt) { T.sc.mistetMeldt = true; lagre(); const fr = SC.SCENARIER[window.SPILLREGLER.scenario], t = `Scenariet: ${s.målNavn || 'byen'} er tapt – telleren starter på nytt (frist dag ${fr ? fr.dager : 8})`;
      logg(t + '.'); statHendelse(`Mistet scenariets by ${s.målNavn || ''}`.trim(), 2); if (window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(t + '.');
      try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'annet', tekst: `${s.målNavn || 'scenariets by'} er tapt – scenariets teller starter på nytt` } })); } catch (e) { /* uten flyt */ } }
    if (s.status === 'pågår' || T.scMeldt === s.status) return s; T.scMeldt = s.status; lagre();
    if (window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(`Scenariet «${s.navn}» er ${s.status}. ${s.tekst}`);
    logg(`Scenariet «${s.navn}»: ${s.status === 'vunnet' ? 'klart!' : 'tapt.'} ${s.tekst}`);
    if (s.status === 'vunnet') statHendelse(`Scenariet «${s.navn}» er klart`, 2);
    visKort(s.status === 'vunnet' ? 'Scenariet er klart' : 'Scenariet er tapt', `«${s.navn}»: ${s.tekst} Du kan spille videre i fritt spill, eller starte et nytt spill fra ☰.`,
      [['Spill videre', null], ...(E.length > 1 ? [['Se krigen på nytt', () => etterspill()]] : [])], oppsumElement());
    return s;
  }

  // ---------- (runde 12) OPPSUMMERINGEN: tall og de viktigste hendelsene for seiers- og tapsskjermen ----------
  // T.stat = { start: { penger, tid }, falne, sårede, maksByer, hendelser: [{ t, tekst, vekt }] } – lagres med spillformen (per leir).
  // Falne og sårede er egne soldater i lagene (ikke karakteren); tettstedene som skifter eier og angrep som slås tilbake eller lykkes, blir hendelser.
  const taltFall = new WeakSet(), taltSår = new WeakSet(); let eiere = new Map(), sistFerdig = 0;
  const byNavn = id => { const b = byer().find(q => String(q.e.id) === String(id)); return b ? b.e.navn : 'et tettsted'; };
  const fNavn = side => (window.Fraksjoner && Fraksjoner.FRAKSJONER[side] ? Fraksjoner.FRAKSJONER[side].navn : side);
  function statHendelse(tekst, vekt = 1) { if (!T) return; const st = T.stat || (T.stat = { start: null, falne: 0, sårede: 0, maksByer: 0, hendelser: [] });
    st.hendelser.push({ t: Math.round(tid), tekst, vekt }); if (st.hendelser.length > 60) { st.hendelser.sort((a, b) => b.vekt - a.vekt || b.t - a.t); st.hendelser.length = 40; st.hendelser.sort((a, b) => a.t - b.t); } }
  function statStart() { if (!T) return; const S = spill(); if (!T.stat) T.stat = { start: { penger: S ? S.penger : 0, tid: Math.round(tid) }, falne: 0, sårede: 0, maksByer: 0, hendelser: [] };
    // det som alt har skjedd (et lagret spill som lastes), telles ikke på nytt
    for (const s of ENHETER) if (s.side === 'blå' && Array.isArray(s.menn)) for (const m of s.menn) { if (m.hp <= 0) taltFall.add(m); else if (m.hp < 1) taltSår.add(m); }
    eiere = new Map(); if (window.TETTSTEDER) for (const [id, t] of TETTSTEDER) eiere.set(String(id), t && t.eier);
    const ES = window.EskaleringSpill && EskaleringSpill.S ? EskaleringSpill.S() : null; sistFerdig = ES && ES.ferdig ? ES.ferdig.length : 0; lagre(); }
  function statSteg() { if (!T || !T.stat) return; const st = T.stat; let endret = false;
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || !Array.isArray(s.menn)) continue;
      for (const m of s.menn) { if (m.hp <= 0 && !taltFall.has(m)) { taltFall.add(m); st.falne++; endret = true; } else if (m.hp > 0 && m.hp < 1 && !taltSår.has(m)) { taltSår.add(m); st.sårede++; endret = true; } } }
    if (window.TETTSTEDER) { let egne = 0; for (const [id0, t] of TETTSTEDER) { const id = String(id0), e = t && t.eier, før = eiere.get(id); if (e === 'blå') egne++;
        if (e !== før) { if (e === 'blå') statHendelse(`Tok ${byNavn(id)}`, 3); else if (før === 'blå') statHendelse(`Mistet ${byNavn(id)}` + (e ? ` til ${fNavn(e)}` : ''), 3); eiere.set(id, e); endret = true; } }
      if (egne > (st.maksByer || 0)) { st.maksByer = egne; endret = true; } }
    const ES = window.EskaleringSpill && EskaleringSpill.S ? EskaleringSpill.S() : null, F = ES && ES.ferdig;
    if (F) { if (F.length < sistFerdig) sistFerdig = 0; for (const q of F.slice(sistFerdig)) { if (!q.leir && q.eier !== 'blå') continue;
        statHendelse(q.utfall === 'oppgitt' ? `Slo tilbake ${fNavn(q.side)} ${q.leir ? 'ved leiren' : 'i ' + q.mål}` : q.leir ? `${fNavn(q.side)} herjet i leiren` : `${fNavn(q.side)} angrep ${q.mål}`, 3); endret = true; }
      sistFerdig = F.length; }
    if (endret) lagre(); }
  function oppsumElement() { if (!T) return null; const S = spill(), B = nå(), o = SC.oppsummering(T.stat, { tid, penger: S ? S.penger : 0, byer: B.egne, folk: B.folk });
    const dl = el('dl'); for (const [k, v] of o.tall) dl.append(el('dt', {}, k), el('dd', {}, v));
    const boks = el('div', { klasse: 'oppsum', id: 'oppsummering' }, dl);
    if (o.hendelser.length) { const ul = el('ul'); for (const h of o.hendelser) ul.append(el('li', {}, h)); boks.append(el('h3', {}, 'Det viktigste som skjedde'), ul); }
    return boks; }

  // ---------- (runde 12) «HOLD BYEN»: MOTANGREPET ----------
  // Kritikken: «Svorkmo tatt på 30 minutter uten en fiende i nærheten, seieren kom dag 4 uten kamp». Når fredstiden er over og du holder byen,
  // ber scenariet en motstander (spill/eskalering-visning.js, planlegg med tving og bare) om å samle lag mot nettopp den byen. Du vinner
  // først når du har holdt den i tre døgn OG slått motangrepet tilbake. Kan ingen motstander angripe på to døgn, holder de tre døgnene.
  // Claudes forslag. Ikke i testene (auto) – der er scenariet som før.
  const kreverAngrep = () => { const r = window.SPILLREGLER; return !!(r && r.scenario === 'hold' && auto() && window.EskaleringSpill && EskaleringSpill.planlegg && window.AI && AI.på !== false); };
  function holdAngrep() {
    if (!T || !kreverAngrep()) return null; const sc = T.sc, B = nå(); if (sc.ferdig || sc.slått || sc.ingen || !B.mål || !B.holder(B.mål)) return null;
    const ES = EskaleringSpill.S();
    if (sc.angrep) { const G = ES.gruppe && ES.gruppe[sc.angrep.side];
      if (G && G.mål && String(G.mål.id) === String(B.mål)) { const p = G.fase === 'angriper'; if (p !== !!sc.angrep.pågår) { sc.angrep.pågår = p; lagre(); } return sc.angrep; }
      const f = (ES.ferdig || []).filter(q => q.side === sc.angrep.side && q.mål === B.målNavn && q.t >= sc.angrep.start).pop();
      if (f && f.utfall === 'oppgitt') { sc.slått = true; logg(`Scenariet «Hold byen»: motangrepet på ${B.målNavn} er slått tilbake!`); }
      sc.angrep = null; lagre(); return null; }
    const fred = EskaleringSpill.fredSlutt ? EskaleringSpill.fredSlutt() : 0; if (tid < fred || (sc.nesteForsøk && tid < sc.nesteForsøk)) return null;
    if (sc.forsøkFra == null) sc.forsøkFra = Math.round(tid);
    const sider = ['rød', 'grønn'].sort((a, b) => ENHETER.filter(e => e.side === b && e.ai && levende(e)).length - ENHETER.filter(e => e.side === a && e.ai && levende(e)).length);
    // (døgn: 99 = dagsgrensene for når dine tettsteder og storbyer kan bli mål, gjelder ikke dette motangrepet)
    for (const side of sider) { let G = null; try { G = EskaleringSpill.planlegg(side, { tving: true, bare: B.mål, døgn: 99 }); } catch (e) { G = null; }
      if (G) { sc.angrep = { side, start: Math.round(tid), pågår: false }; logg(`Scenariet «Hold byen»: ${fNavn(side)} vil ta ${B.målNavn} tilbake og samler lag. Hold byen!`); statHendelse(`${fNavn(side)} samlet lag mot ${B.målNavn}`, 2); lagre(); return sc.angrep; } }
    sc.nesteForsøk = Math.round(tid) + 60;
    // Claudes forslag: to døgn uten at noen motstander kan angripe = de har ikke krefter til det
    if (tid - sc.forsøkFra > 2 * SC.DØGN) { sc.ingen = true; logg(`Scenariet «Hold byen»: ingen av motstanderne har krefter til et motangrep på ${B.målNavn}.`); }
    lagre(); return null; }

  // ---------- tap av leiren ----------
  function fiendeILeiren() { const S = spill(); if (!S || !S.leir) return false; return SC.truet(S.leir, ENHETER.filter(e => e.side !== 'blå' && levende(e)), ENHETER.filter(e => e.side === 'blå' && levende(e))); }
  // planen for utposten: hvor, og hva som blir med
  function utpostPlan() {
    const S = spill(), F = window.FolkSpill && FolkSpill.tilstand(); if (!S || !S.leir) return null;
    const egneB = byer().filter(b => eier(b.e.id) === 'blå').map(b => { const [x, y] = midt(b); return { x: x + 600, y: y + 600, navn: b.e.navn }; });
    const p = SC.utpost(S.leir, ENHETER.filter(e => e.side !== 'blå' && levende(e) && Math.hypot(e.x - S.leir.x, e.y - S.leir.y) < 3000), egneB), r = SC.etterTap(S.penger, F ? F.personer.length : 0);
    return { fra: { x: S.leir.x, y: S.leir.y }, til: p, ...r };
  }
  // et sted på land nær p (ikke vann, ikke utenfor kartet, ikke i et tettsted)
  async function påLand(p) {
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = i ? 150 + i * 120 : 0, x = Math.round(p.x + Math.cos(a) * r), y = Math.round(p.y + Math.sin(a) * r);
      if (window.OMRÅDE_OK && !OMRÅDE_OK(x, y)) continue;
      try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false), [ci, cj] = Terreng.rute(v, x, y), k = v.K[cj * v.w + ci]; if (k === 3 || k === 255 || k === undefined) continue;
        if (byer().some(b => b.bb[0] <= x && x <= b.bb[2] && b.bb[1] <= y && y <= b.bb[3] && window.Garnison && Garnison.inni(b, x, y))) continue; return { x, y, navn: p.navn }; } catch (e) { /* kartet mangler her */ } }
    return null;
  }
  let tapPågår = false;
  // tapLeiren({ utenOmstart }): leiren flyttes til utposten med det som er igjen. Siden lastes på nytt (alt som huskes per leir, følger med).
  async function tapLeiren(o = {}) {
    if (tapPågår) return null; const plan = utpostPlan(); if (!plan) return null; tapPågår = true;
    try {
      const sted = await påLand(plan.til) || await påLand({ x: plan.fra.x, y: plan.fra.y - 2500 }); if (!sted) { logg('Leiren er tatt, men det finnes ikke noe sted å trekke seg til.'); return null; }
      const S = spill(), L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), fraId = idAv(plan.fra), tilId = idAv(sted);
      const mistetFolk = F ? Math.max(0, F.personer.length - plan.folk) : 0, mistetKr = S.penger - plan.penger;
      const tekst = `Fienden tok leiren. ${sted.navn ? 'Dere har trukket dere til ' + sted.navn : 'Dere har slått dere ned ' + (Math.round(Math.hypot(sted.x - plan.fra.x, sted.y - plan.fra.y) / 100) / 10 + '').replace('.', ',') + ' km unna'} med ${plan.folk} personer og ${Oppstart.kroner(plan.penger)}. Byggene er tapt, og halve lageret ble igjen. Lagene dine står der de sto.`;
      if (o.prøve) return { sted, tekst, mistetFolk, mistetKr, fraId, tilId };
      T.tapt = (T.tapt || 0) + 1; T.tap = {}; lagre();
      if (window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter('Leiren falt. Vi begynner på nytt i en utpost.');
      if (F) { F.personer.sort((a, b) => (b.lojal || 0) - (a.lojal || 0)); F.personer.length = Math.min(F.personer.length, plan.folk); F.mat = Math.round((F.mat || 0) * plan.lager); }
      if (L) { L.bygg = []; if (L.plan) L.plan = []; for (const k of Object.keys(L.lager || {})) L.lager[k] = Math.round(L.lager[k] * plan.lager * 10) / 10; L.drivstoff = 0; if (L.batteri !== undefined) L.batteri = 0; L.midt = { x: sted.x, y: sted.y }; if (L.byggesett) delete L.byggesett; LeirSpill.lagre(); }
      S.penger = plan.penger; S.leir = { x: sted.x, y: sted.y }; OppstartSpill.lagre();
      if (window.LagringSpill) LagringSpill.lagre();
      try { localStorage.setItem(FLYTT, JSON.stringify({ fra: fraId, til: tilId, tekst })); } catch (e) { /* uten lagring huskes ikke flyttingen */ }
      if (!o.utenOmstart) location.reload();
      return { sted, tekst };
    } finally { tapPågår = false; }
  }

  // ---------- etterspillet: bilder av krigen ----------
  // RUNDE 4 (pakke «ui»): bildet har også leirens ferdige bygg, kjøretøyene (egne, og fiendens der dere så dem), stedene det ble kjempet
  // siden forrige bilde (KROKER.ild: hver ildveksling med et eget lag legges i en rute på 250 m) og tallene for gjengen
  let kamper = new Map();
  KROKER.ild.push((a, b) => { if (a && b && (a.side === 'blå' || b.side === 'blå')) SC.kampsted(kamper, (a.x + b.x) / 2, (a.y + b.y) / 2); return 1; });
  function ekstra() {
    const LS = window.LeirSpill && LeirSpill.tilstand && LeirSpill.tilstand(), LB = window.Leir, F = window.FolkSpill && FolkSpill.tilstand && FolkSpill.tilstand(), S = spill();
    const bygg = LS && LB ? LS.bygg.filter(b => LB.BYGG[b.type] && !LB.BYGG[b.type].del && LB.ferdig(b)) : [];
    const kj = typeof KJORETOY !== 'undefined' ? KJORETOY.filter(k => k.side === 'blå' || (typeof synlig === 'function' && (() => { try { return synlig(k); } catch (e) { return false; } })())) : [];
    const egne = ENHETER.filter(e => e.side === 'blå' && levende(e) && !e.karakter);
    const tall = { p: S && typeof S.penger === 'number' ? Math.round(S.penger) : null, f: F && F.personer ? F.personer.length : null, m: egne.reduce((n, e) => n + e.menn.filter(q => q.hp > 0).length, 0), l: egne.length,
      k: kj.filter(k => k.side === 'blå').length, b: bygg.length };
    return { bygg, kj, kamp: [...kamper.values()], tall };
  }
  const nyttBilde = () => SC.bilde(tid, [...(window.TETTSTEDER || new Map())].map(([id, t]) => ({ id, eier: t && t.eier })), ENHETER.filter(e => levende(e) && !e.karakter && (e.side === 'blå' || synlig(e))), SC.REGLER.etterspill, ekstra());
  function taBilde() {
    const b = nyttBilde();
    if (SC.leggTil(E, b)) { kamper = new Map(); lagreE(); return true; } return false;
  }
  const ep = el('div', { id: 'etterspill', role: 'dialog', 'aria-label': 'Krigen på nytt' }); document.body.appendChild(ep);
  let eÅpen = false, eNr = 0, eSpiller = 0, eFør = null, byRef = null, navnAv = new Map();
  const klokke2 = t => { const h = 6 + t / 60; return 'dag ' + (Math.floor(h / 24) + 1) + ' kl. ' + String(Math.floor(h % 24)).padStart(2, '0'); };
  function eVis() {
    const b = E[eNr]; if (!b) return; const st = SC.stillingVed(b), navn = s => (s === 'blå' ? 'du' : (window.Fraksjoner && Fraksjoner.FRAKSJONER[s] ? Fraksjoner.FRAKSJONER[s].navn : s));
    const n = b.n, kr = v => (v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',') + ' mill. kr' : Math.round(v).toLocaleString('nb-NO') + ' kr'), kampN = (b.s || []).length;
    const linje2 = n ? [`${n.l} lag (${n.m} mann)`, n.k ? `${n.k} kjøretøy` : '', `${n.b} bygg`, n.f != null ? `${n.f} folk i leiren` : '', n.p != null ? kr(n.p) : ''].filter(Boolean).join(' · ') : '';
    // (runde 12) tettstedene som skiftet eier siden forrige bilde, står i teksten (og får en ring i kartet)
    const byttet = skifter(eNr).map(q => `${navn(q.ny)} tok ${navnAv.get(q.id) || 'et tettsted'}`.replace(/^du tok/, 'Du tok').replace(/^null tok/, 'Ingen holder'));
    ep.querySelector('.tekst').replaceChildren(el('b', {}, klokke2(b.t)), ` · ${navn('blå')} ${st.blå} · ${navn('rød')} ${st.rød} · ${navn('grønn')} ${st.grønn} tettsteder · bilde ${eNr + 1} av ${E.length}`,
      el('small', {}, (linje2 ? 'Dere: ' + linje2 : 'Bildet er fra før bygg og kjøretøy ble tatt med.') + (kampN ? ` · kamper siden forrige bilde: ${kampN} ${kampN === 1 ? 'sted' : 'steder'}` : '')),
      byttet.length ? el('small', { klasse: 'byttet' }, 'Siden forrige bilde: ' + byttet.join(', ') + '.') : '');
    ep.querySelector('input').value = String(eNr); skitten = true;
  }
  // (runde 12) tettstedene som har skiftet eier fra bildet før: [{ id, før, ny }]
  function skifter(i) { const b = E[i], a = E[i - 1]; if (!b || !a) return []; const ut = [], ider = new Set([...Object.keys(a.e || {}), ...Object.keys(b.e || {})]);
    for (const id of ider) { const f = SC.eierI(a, id), n = SC.eierI(b, id); if (f !== n) ut.push({ id, før: f, ny: n }); } return ut; }
  // (runde 12, PC-kritiker F: «tiden går mens reprisen vises») tiden står så lenge reprisen er åpen – også når et kort som lukkes, ville startet
  // den igjen (spill/skjermlag.js gir farten tilbake når kortet er besvart). Farten du hadde, kommer tilbake når du lukker.
  let ePause = 0;
  function holdPause() { if (!eÅpen) { clearInterval(ePause); ePause = 0; return; } if (typeof tempo !== 'undefined' && tempo > 0) { if (eFør) eFør.fart = tempo; const p = document.getElementById('sp0'); if (p) p.click(); } }
  function etterspill() {
    if (!klar) return false; if (auto() || !E.length) taBildeTving();
    if (E.length < 1) { logg('Det er ikke tatt noen bilder av krigen ennå.'); return false; }
    if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function') slå3d(false);
    if (window.StrategiSpill && StrategiSpill.erÅpen()) StrategiSpill.lukk();
    const S = spill(); eFør = { x: kam.x, y: kam.y, m: kam.m, fart: tempo > 0 ? tempo : 0 };
    if (tempo > 0) document.getElementById('sp0').click(); clearInterval(ePause); ePause = setInterval(holdPause, 120);
    // utsnittet: alle tettstedene og lagene som er med i bildene
    byRef = new Map(byer().map(b => [String(b.e.id), midt(b)])); navnAv = new Map(byer().map(b => [String(b.e.id), b.e.navn])); let x0 = S.leir.x, x1 = S.leir.x, y0 = S.leir.y, y1 = S.leir.y;
    const ta = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    for (const b of E) { for (const id of Object.keys(b.e)) { const p = byRef.get(String(id)); if (p) ta(p[0], p[1]); } for (const l of b.l) if (l[2] === 'b') ta(l[0], l[1]); for (const k of b.k || []) if (k[2] === 'b') ta(k[0], k[1]); for (const q of b.s || []) ta(q[0], q[1]); }
    kam.x = (x0 + x1) / 2; kam.y = (y0 + y1) / 2; kam.m = Math.max(4, Math.max((x1 - x0) / Math.max(200, VW - 80), (y1 - y0) / Math.max(200, VH - 260)) * 1.25);
    eNr = 0; eÅpen = true; document.body.classList.add('etterspill');
    const spill2 = el('button', { 'data-e': 'spill' }, '▶ Spill av'), lukk = el('button', { 'data-e': 'lukk' }, 'Lukk'), sl = el('input', { type: 'range', min: '0', max: String(Math.max(0, E.length - 1)), value: '0', 'aria-label': 'Tidspunkt' });
    sl.oninput = () => { eNr = +sl.value; eVis(); };
    spill2.onclick = () => { if (eSpiller) { clearInterval(eSpiller); eSpiller = 0; spill2.textContent = '▶ Spill av'; return; } if (eNr >= E.length - 1) eNr = 0; spill2.textContent = '❚❚ Stopp';
      eSpiller = setInterval(() => { if (eNr >= E.length - 1) { clearInterval(eSpiller); eSpiller = 0; spill2.textContent = '▶ Spill av'; return; } eNr++; eVis(); }, 450); };
    lukk.onclick = () => etterspillLukk();
    // tegnforklaringen (runde 12: «uforklarte prikker»): fargene til sidene, tettsteder uten eier, kamp og leiren
    const prøve = (farge, form) => el('i', { klasse: 'prøve ' + form, style: `background:${farge}` });
    const fk = el('div', { klasse: 'forkl' }, el('span', {}, prøve(sidefarge('blå', 'farge'), 'firk'), 'dine lag'), el('span', {}, prøve(sidefarge('rød', 'farge'), 'rute'), 'fiender dere så'),
      el('span', {}, prøve(sidefarge('blå', 'farge'), 'rund'), prøve(sidefarge('rød', 'farge'), 'rund'), prøve(sidefarge('grønn', 'farge'), 'rund'), 'tettsted (farge = hvem som holdt det)'),
      el('span', {}, prøve('rgba(60,52,40,.95)', 'rund tom'), 'ingen holdt det'), el('span', {}, prøve('#e8783c', 'rund'), 'kamp'), el('span', {}, prøve('#f0e2b0', 'firk'), 'leiren og byggene'),
      el('span', {}, el('i', { klasse: 'prøve ring' }), 'skiftet eier'));
    ep.replaceChildren(el('div', {}, el('b', {}, 'Krigen din på nytt'), el('small', {}, 'Tiden står mens du ser. Spol med glideren eller ▶. Fiendens lag og kjøretøy vises bare der dere så dem.')), fk, sl, el('div', { klasse: 'tekst' }), el('div', {}, spill2, lukk));
    ep.classList.add('på'); eVis(); requestAnimationFrame(eRamme); return true;
  }
  function etterspillLukk() { if (!eÅpen) return; eÅpen = false; clearInterval(ePause); ePause = 0; if (eSpiller) { clearInterval(eSpiller); eSpiller = 0; } ep.classList.remove('på'); document.body.classList.remove('etterspill');
    if (eFør) { kam.x = eFør.x; kam.y = eFør.y; kam.m = eFør.m; if (eFør.fart && tempo === 0) { document.getElementById('sp0').click(); if (typeof tempo !== 'undefined' && tempo !== eFør.fart) tempo = eFør.fart; } eFør = null; } skitten = true; }
  function taBildeTving() { const sist = E[E.length - 1]; if (sist && tid - sist.t < 1) return; const b = nyttBilde(); if (SC.sammeBygg(E, b)) delete b.b; E.push(b); kamper = new Map(); lagreE(); }
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && eÅpen) etterspillLukk(); });
  // Etterspillet tegnes på et eget lerret oppå kartet (mørkt slør), så lagene og navnene som står der nå, ikke blandes med bildet fra den gang.
  const ec = el('canvas', { id: 'etterlerret', 'aria-hidden': 'true' }); document.body.appendChild(ec);
  function eRamme() {
    if (!eÅpen) return; const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    if (ec.width !== Math.round(r.width * d) || ec.height !== Math.round(r.height * d)) { ec.width = Math.round(r.width * d); ec.height = Math.round(r.height * d); }
    ec.style.left = r.left + 'px'; ec.style.top = r.top + 'px'; ec.style.width = r.width + 'px'; ec.style.height = r.height + 'px';
    const g = ec.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, r.width, r.height); tegnE(g, kam.x - VW / 2 * kam.m, kam.y + VH / 2 * kam.m); requestAnimationFrame(eRamme);
  }
  const tegnE = (g, vx0, vy1) => {
    if (!eÅpen) return; const b = E[eNr]; if (!b) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m; g.save();
    // (runde 12) lysere slør, så kartet under synes (før .72: «nesten svart»)
    g.fillStyle = 'rgba(14,11,7,.45)'; g.fillRect(0, 0, VW, VH);
    // leirens bygg (lyse ruter; ser du nærmere, får de typens farge), kampstedene (flammer etter hvor mye det ble skutt)
    { const bb = SC.byggI(E, eNr), r = Math.max(2.5, Math.min(7, 14 / m)); g.fillStyle = 'rgba(240,226,176,.75)'; g.strokeStyle = 'rgba(20,16,10,.9)'; g.lineWidth = 1;
      for (const [x0, y0] of bb) { const x = sx(x0), y = sy(y0); if (x < -10 || y < -10 || x > VW + 10 || y > VH + 10) continue; g.fillRect(x - r, y - r, r * 2, r * 2); g.strokeRect(x - r, y - r, r * 2, r * 2); } }
    for (const [x0, y0, n] of b.s || []) { const x = sx(x0), y = sy(y0), r = 7 + Math.min(10, Math.sqrt(n) * 2); g.fillStyle = 'rgba(232,120,60,.28)'; g.beginPath(); g.arc(x, y, r * 1.5, 0, 6.283); g.fill();
      g.fillStyle = '#e8783c'; g.strokeStyle = '#2a1408'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); }
    g.font = '600 13px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    const nyEier = new Map(skifter(eNr).map(q => [String(q.id), q])), puls = .5 + .5 * Math.sin(performance.now() / 220);
    for (const [id, p] of byRef) { const e = SC.eierI(b, id), x = sx(p[0]), y = sy(p[1]); if (x < -30 || y < -30 || x > VW + 30 || y > VH + 30) continue; if (!e && m > 60 && !nyEier.has(id)) continue;
      g.fillStyle = e ? sidefarge(e, 'farge') : 'rgba(60,52,40,.95)'; g.strokeStyle = e ? '#e7dcc3' : 'rgba(231,220,195,.55)'; g.lineWidth = e ? 2 : 1; g.beginPath(); g.arc(x, y, e ? 9 : 4.5, 0, 6.283); g.fill(); g.stroke();
      // skiftet eier siden forrige bilde: en pulserende ring i den nye eierens farge og «tatt av …»
      const q = nyEier.get(id); if (q) { g.strokeStyle = q.ny ? sidefarge(q.ny, 'lys') : '#e7dcc3'; g.lineWidth = 2.5; g.globalAlpha = .5 + .5 * puls; g.beginPath(); g.arc(x, y, 14 + 5 * puls, 0, 6.283); g.stroke(); g.globalAlpha = 1; }
      const navnet = navnAv.get(id); if (navnet && (e || q || m < 25)) { const t = navnet + (q ? (q.ny === 'blå' ? ' · tatt av deg' : q.ny ? ' · tatt av ' + (window.Fraksjoner && Fraksjoner.FRAKSJONER[q.ny] ? Fraksjoner.FRAKSJONER[q.ny].navn : q.ny) : ' · tapt') : '');
        g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)'; g.strokeText(t, x, y + 11); g.fillStyle = e || q ? '#e7dcc3' : 'rgba(231,220,195,.7)'; g.fillText(t, x, y + 11); } }
    if (nyEier.size) skitten = true;
    // lag og kjøretøy med det felles merkesettet (spill/merker.js): formen sier hvem, tegnet inni hva
    const side = s => (s === 'b' ? 'blå' : s === 'g' ? 'grønn' : 'rød');
    for (const [x0, y0, s, type] of b.k || []) { const x = sx(x0), y = sy(y0); if (window.Merker) Merker.tegn(g, x, y, { forhold: Merker.forhold(side(s)), slag: 'kjøretøy', type: type || 'lastebil', farge: sidefarge(side(s), 'farge'), r: 7 }); }
    for (const [x0, y0, s] of b.l) { const x = sx(x0), y = sy(y0); if (window.Merker) Merker.tegn(g, x, y, { forhold: Merker.forhold(side(s)), slag: 'lag', farge: sidefarge(side(s), 'farge'), r: 7 });
      else { g.fillStyle = sidefarge(side(s), 'lys'); g.strokeStyle = '#1c170f'; g.lineWidth = 1.5; g.beginPath(); g.rect(x - 7, y - 5, 14, 10); g.fill(); g.stroke(); } }
    const S = spill(); if (S && S.leir) { const x = sx(S.leir.x), y = sy(S.leir.y); g.strokeStyle = '#f0e2b0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 18); g.stroke(); g.fillStyle = '#f0e2b0'; g.fillRect(x + 1, y - 18, 12, 8); }
    g.restore(); };
  // mens etterspillet er åpent, gjør trykk i kartet ingenting
  KROKER.trykk.unshift(() => eÅpen);
  // (runde 12) kartet under er lysere nå – da skal ikke lagene slik de står NÅ blandes med bildet fra den gang: egne lag skjules, og ingen
  // fiender vises (KROKER.skjul / KROKER.innsyn) så lenge reprisen er åpen
  KROKER.skjul.push(s => eÅpen && s.side === 'blå');
  KROKER.innsyn.push(() => !eÅpen);

  // ---------- ukas oppdrag ----------
  const ukeNå = () => SC.ukasOppdrag(SC.uke(new Date()));
  const ukeBilde = () => { const B = nå(); return { tid: B.tid, penger: B.penger, tettsteder: B.tettsteder, bygg: B.bygg, folk: B.folk }; };
  function ukeGjelder() { const o = ukeNå(); return T && T.uke && T.uke.år === o.år && T.uke.uke === o.uke ? T.uke : null; }
  function ukeStart() { if (!klar) return null; const o = ukeNå(); T.uke = { år: o.år, uke: o.uke, T0: ukeBilde(), resultat: null }; lagre(); logg(`Ukas oppdrag er i gang: ${o.tekst}`); return T.uke; }
  function ukeStatus() { const u = ukeGjelder(); if (!u) return null; const o = ukeNå(); if (u.resultat) return { ...u.resultat, ferdig: true, o }; const st = SC.ukeStatus(o, u.T0, ukeBilde()); st.o = o; return st; }
  function ukeSteg() { const u = ukeGjelder(); if (!u || u.resultat) return; const st = ukeStatus(); if (!st.ferdig) return;
    u.resultat = { verdi: st.verdi, klart: st.klart, dager: st.dager, tekst: st.tekst }; lagre(); logg(`Ukas oppdrag er ${st.klart ? 'klart' : 'over'}: ${st.tekst}. Del resultatet fra Leir → Mål.`); }
  function ukeDel() { const st = ukeStatus(), S = spill(); if (!st || !S) return null; return SC.ukeTekst(st.o, S.fraksjon.navn, st); }
  function ukeSammenlign(kode) { const st = ukeStatus(), d = SC.lesUkeKode((/RB-\S+/.exec(kode || '') || [''])[0]); if (!d) return 'Fant ingen gyldig kode i teksten.'; const o = ukeNå();
    if (d.år !== o.år || d.uke !== o.uke) return `Koden gjelder uke ${d.uke}, ikke denne uka (uke ${o.uke}).`;
    const deres = `${d.navn}: ${String(d.verdi).replace('.', ',')} ${o.enhet} på ${String(d.dager).replace('.', ',')} døgn (${d.klart ? 'klart' : 'ikke klart'})`;
    if (!st || !st.ferdig) return deres + '. Du er ikke ferdig med oppdraget ennå.';
    return deres + (SC.ukeBedre(o, st, d) ? '. Du gjorde det bedre.' : SC.ukeBedre(o, d, st) ? '. De gjorde det bedre.' : '. Dere står likt.'); }

  // ---------- jevnlig ----------
  let sistMin = -1;
  KROKER.sim.push(() => {
    if (!klar) return; const min = Math.floor(tid); if (min === sistMin) return; sistMin = min;
    ukeSteg();
    if (auto()) statSteg();
    if (window.SPILLREGLER.scenario && auto()) { holdAngrep(); scenarioSteg(); }
    if (!auto()) return;
    taBilde();
    if (SC.tapSteg(T.tap, fiendeILeiren(), tid)) { T.tap = {}; tapLeiren(); }
    else if (T.tap.fra != null && !T.tap.sagt) { T.tap.sagt = true; logg(`Fienden står i leiren, og ingen av dine er der! Få et lag hjem innen ${R.tap.minutter} minutter, ellers er leiren tapt.`); }
    else if (T.tap.fra == null && T.tap.sagt) T.tap.sagt = false;
  });

  // ---------- (runde 14, kritiker J) SCENARIETS BY I KARTET OG I TETTSTEDSPANELET ----------
  // en dobbel gyllen ring rundt byen scenariet «Hold byen» gjelder, med «Scenariets by» under; tettstedspanelet sier det samme
  const scBy = () => { const r = window.SPILLREGLER; if (!klar || !r || r.scenario !== 'hold' || (T && T.sc && T.sc.ferdig)) return null; return nærmesteBy(); };
  KROKER.tegn.push((g, vx0, vy1) => { const b = scBy(); if (!b) return; const [X, Y] = midt(b), m = kam.m, x = (X - vx0) / m, y = (vy1 - Y) / m;
    if (x < -80 || y < -80 || x > VW + 80 || y > VH + 80) return;
    const r = Math.max(16, Math.min(60, Math.hypot(b.bb[2] - b.bb[0], b.bb[3] - b.bb[1]) * .35 / m));
    g.save(); g.strokeStyle = 'rgba(20,16,10,.85)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke();
    g.strokeStyle = '#f0c878'; g.lineWidth = 2.5; g.setLineDash([10, 5]); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke(); g.setLineDash([]);
    g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r + 5, 0, 6.283); g.stroke();
    g.font = '700 12px "Times New Roman", Times, serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.9)';
    g.strokeText('Scenariets by', x, y + r + 7); g.fillStyle = '#f0c878'; g.fillText('Scenariets by', x, y + r + 7); g.restore(); });
  if (KROKER.info) KROKER.info.push(o => { if (!o || o.lag !== 'tettsted') return; const b = scBy(); if (!b || String(b.e.id) !== String(o.e.id)) return; const sub = document.getElementById('psub'); if (sub) sub.textContent += ' · Scenariets by («Hold byen»)'; });
  window.SCENARIO_BY = () => { const b = scBy(); return b ? b.e.id : null; };

  // ---------- Leir-menyen, fanen Mål ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp }) => {
    if (!klar) return; const r = window.SPILLREGLER;
    hode.appendChild(e('h3', { 'data-fane': 'mål' }, 'Mål · spillform'));
    hode.appendChild(e('div', { klasse: 'spillform', id: 'formlinje' }, e('b', {}, SC.beskriv(r) || 'Vanlig'), e('small', {}, 'Vanskelighetsgrad, utfordringer og scenario velges når du starter et nytt spill.' + (r.styrke ? ` Motstanderne er styrket ${r.styrke} ${r.styrke === 1 ? 'gang' : 'ganger'} etter seirene dine.` : ''))));
    const s = scenarioNå();
    if (s) { const d = e('div', { klasse: 'spillform ' + (s.status === 'pågår' ? '' : s.status), id: 'scenariolinje' }, e('b', {}, 'Scenario: ' + s.navn + (s.status === 'vunnet' ? ' – klart' : s.status === 'tapt' ? ' – tapt' : '')), e('small', {}, SC.SCENARIER[r.scenario].tekst + (s.målNavn && r.scenario === 'hold' ? ` Tettstedet er ${s.målNavn}.` : '')), e('div', {}, s.tekst + (s.status === 'pågår' ? ' · ' + SC.fristTekst(Math.round(s.igjen / 10) * 10) : '')));
      if (s.status === 'pågår' && s.andel != null) d.appendChild(e('div', { klasse: 'stolpe' }, e('i', { style: `width:${Math.round(Math.max(0, Math.min(1, s.andel)) * 100)}%` }))); hode.appendChild(d); }
    // ukas oppdrag
    const o = ukeNå(), st = ukeStatus(), u = e('div', { klasse: 'spillform', id: 'ukelinje' }, e('b', {}, `Ukas oppdrag (uke ${o.uke}): ${o.tekst}`), e('small', {}, 'Samme oppdrag for alle som spiller denne uka. Det finnes ingen felles resultatliste – del resultatet ditt som en kode, og sammenlign med venners koder.'));
    if (st) u.appendChild(e('div', {}, (st.ferdig ? (st.klart ? 'Klart: ' : 'Ikke klart: ') : 'Nå: ') + st.tekst + (st.ferdig ? ` på ${String(st.dager).replace('.', ',')} døgn` : ' · ' + SC.fristTekst(Math.round(st.igjen / 10) * 10))));
    hode.appendChild(u);
    if (!st) hode.appendChild(knapp('Start ukas oppdrag', false, () => { ukeStart(); if (LeirSpill.fane) LeirSpill.fane('mål'); }));
    else { if (st.ferdig) hode.appendChild(knapp('Kopier resultatet', false, () => { const t = ukeDel(); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => logg('Resultatet er kopiert. Lim det inn til en venn.'), () => prompt('Kopier resultatet:', t)); }));
      hode.appendChild(knapp('Sammenlign med en venns kode', false, () => { const t = prompt('Lim inn koden (eller hele teksten) du fikk:'); if (t) logg(ukeSammenlign(t)); })); }
    // etterspillet
    hode.appendChild(e('div', { klasse: 'spillform', id: 'etterlinje' }, e('b', {}, 'Krigen på nytt'), e('small', {}, `${E.length} bilder av krigen er tatt vare på (ett hver ${R.etterspill.hver / 60}. spilltime).`)));
    hode.appendChild(knapp('Se krigen på nytt', false, () => { const lk = document.getElementById('leirknapp'), m = document.getElementById('leirmeny'); if (m && m.classList.contains('på') && lk) lk.click(); etterspill(); }));
  });

  // «sterkere motstander» etter en seier (spill/strategi-visning.js): ett trinn til, huskes i spillet
  function sterkere() { const S = spill(); if (!S) return null; S.regler = S.regler || { vanskelighet: 'vanlig', utfordringer: [], scenario: null }; S.regler.styrke = (S.regler.styrke || 0) + 1; OppstartSpill.lagre(); return settRegler().faktor.fiende; }

  const api = { test: false, start, regler: () => window.SPILLREGLER, settRegler, nå, tilstand: () => T, scenario: scenarioNå, scenarioSteg, fiendeILeiren, utpostPlan, tapLeiren, taBilde, bilder: () => E, etterspill, etterspillLukk, etterspillÅpen: () => eÅpen,
    etterspillVis: n => { eNr = Math.max(0, Math.min(E.length - 1, n)); eVis(); return eNr; }, uke: ukeNå, ukeStart, ukeStatus, ukeDel, ukeSammenlign, ukeAvbryt: () => { if (T) { T.uke = null; lagre(); } }, sterkere, visKort, kortLukk: kortAv, holdAngrep, oppsummering: () => (T ? SC.oppsummering(T.stat, { tid, penger: spill() ? spill().penger : 0, byer: nå().egne, folk: nå().folk }) : null), oppsumElement, statHendelse };
  window.ScenarioSpill = api;
})();
