'use strict';
// Leirens folk (regler: spill/folk.js). «Folk» i Leir-menyen åpner panelet: moral, senger, mat, varme og helse, hva som mangler,
// kjøp mat og rekruttering, oppgavene med − / + (to på «bygg» = ett byggelag), og hvem som finnes. Øverst: antall folk (⚠ når noe mangler).
// Byggene virker gjennom folket: vakttårn med vakt gir egne lag i nærheten lengre sikt (KROKER.sikt) og flere treff (KROKER.ild), og
// vaktene ser fiender nær leiren (KROKER.ser); sandsekkvollen gir lagene bak den færre treff; sykestua med folk på «stell» leger sårede
// soldater i lagene ved leiren. Kjøkkenet er et nytt bygg (3D-modellen MODELLER.kjøkken lages her).
// Folket lagres i leiren (L.folk i «riksbrudd-k2»). window.Folk er avtalen med de andre delene: arbeidere(oppgave), tempo(oppgave), liste().
(function () {
  const FR = FolkRegler, LB = Leir;
  let F = null, åpen = false, visFolk = false, alleMangler = false, akk = 0, sist = 0, vist = '';
  const L = () => (window.LeirSpill ? LeirSpill.tilstand() : null);
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const nf = (v, d = 0) => v.toLocaleString('nb-NO', { maximumFractionDigits: d });
  const årstid = () => (window.VAER && VAER.årstid) || 'sommer';
  // senger i egenbygde rom (spill/byggesett.js, del 2), hvis de finnes – men ikke når Leir.plasser allerede har dem med
  // (byggesett.js legger rommene inn i Leir.plasser; før ble de telt to ganger)
  function ekstraSenger() { if (LB.plasser && LB.plasser.byggesett) return 0; try { const r = window.Byggesett && Byggesett.rom ? Byggesett.rom() : null; return Array.isArray(r) ? r.reduce((s, q) => s + (+q.senger || 0), 0) : 0; } catch (e) { return 0; } }
  // egenbygde rom brukt som kjøkken eller verksted (spill/byggesett-visning.js: Byggesett.romBruk)
  function romBruk() { try { return window.Byggesett && Byggesett.romBruk ? Byggesett.romBruk() : null; } catch (e) { return null; } }
  const grunn = () => { const rb = romBruk(); return { årstid: årstid(), mangler: window.LeirSpill ? LeirSpill.siste().mangler : new Set(), ekstraSenger: ekstraSenger(), moralTillegg: window.OverlevSpill ? OverlevSpill.moralTillegg() : 0,
    ekstraKjøkken: rb ? rb.kjøkken : 0, ekstraVerksted: rb ? rb.verksted : 0 }; };
  // samfunnet (spill/samfunn-visning.js) legger til lover, barn og gamle, ønsker, sykdom og hendelser som varer
  const valg = () => (window.SamfunnSpill && SamfunnSpill.valg ? SamfunnSpill.valg(grunn()) : grunn());
  // maten koster mer når butikkene er tomme (forfallet, spill/overlev.js)
  const matF = () => (window.OverlevSpill && OverlevSpill.matFaktor ? OverlevSpill.matFaktor() : 1);
  // KOMMANDOLAGET (R17-4): kjøp og rekruttering går gjennom window.KOMMANDO (spill/kommandoer.js); svaret er det folk.js ga, eller { feil }
  const kom = k => { const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; return r.svar != null ? r.svar : r.ok ? r.svar : { feil: r.feil }; };
  // RUNDE 13 (kritiker G: en ny fikk navnet til en som falt natta før): navnene en ny person ikke kan få – folk i egne lag (levende og
  // falne), karakteren, de døde og gravlagte i samfunnet, barna og de gamle (spill/folk.js tatteNavn)
  FR.opptatteNavn = () => { const ut = [];
    if (typeof ENHETER !== 'undefined') for (const s of ENHETER) if (s && s.side === 'blå' && Array.isArray(s.menn)) for (const m of s.menn) if (m && m.navn) ut.push(m.navn);
    try { const k = window.OppstartSpill && OppstartSpill.tilstand(); if (k && k.karakter && k.karakter.navn) ut.push(k.karakter.navn); } catch (e) { /* uten karakter */ }
    try { const S = window.SamfunnSpill && SamfunnSpill.tilstand && SamfunnSpill.tilstand(); if (S) { for (const d of S.døde || []) ut.push(d.navn); for (const n of S.gravlagte || []) ut.push(n); for (const a of S.avhengige || []) ut.push(a.navn); } } catch (e) { /* uten samfunn */ }
    return ut; };

  // ---------- stil ----------
  const css = document.createElement('style');
  css.textContent = `#folkmeny{ position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); width:min(370px, calc(100vw - 20px));
  box-sizing:border-box; z-index:7; display:none; background:#16120c; border:1px solid var(--rule); color:var(--ink); overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; touch-action:pan-y; padding:10px 12px 12px; }
#folkmeny.på{ display:block; }
#folkmeny h2{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:22px; }
#folkmeny h3{ margin:10px 0 3px; font-size:14px; color:var(--hover); font-weight:600; }
#folkmeny button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:38px; padding:4px 10px; cursor:pointer; font:inherit; }
#folkmeny button:disabled{ opacity:.45; cursor:default; }
#folkmeny .lukk{ float:right; min-height:36px; border:none; background:none; font-size:22px; }
#folkmeny .tilbake{ float:right; min-height:32px; font-size:13px; margin-right:4px; }
#folkmeny .status{ font-size:14px; color:var(--ink-dim); line-height:1.45; margin-top:4px; }
#folkmeny .moral{ display:flex; align-items:center; gap:8px; margin:6px 0 2px; font-size:14px; }
#folkmeny .moral .strek{ flex:1; height:9px; background:#3a3226; position:relative; }
#folkmeny .moral .strek i{ position:absolute; left:0; top:0; bottom:0; }
#folkmeny .mangler{ font-size:13px; color:#e8a46a; margin:2px 0; line-height:1.35; }
#folkmeny .rad{ display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
#folkmeny .opp{ display:grid; grid-template-columns:1fr 40px 26px 40px; align-items:center; gap:4px; padding:3px 0; border-bottom:1px solid #3a3226; }
#folkmeny .opp b{ font-weight:600; font-size:14.5px; } #folkmeny .opp small{ display:block; color:var(--ink-dim); font-size:12px; line-height:1.25; }
#folkmeny .opp span.n{ text-align:center; font-size:16px; font-weight:600; }
#folkmeny .opp button{ min-height:38px; padding:0; font-size:19px; }
#folkmeny .person{ font-size:13px; padding:3px 0; border-bottom:1px solid #2e281e; line-height:1.3; } #folkmeny .person small{ color:var(--ink-dim); }
#folkmeny .person.syk{ color:#e8a46a; } #folkmeny .person img.ansikt{ float:left; width:30px; height:37px; margin:1px 7px 2px 0; border:1px solid #3a3226; background:#2a2318; border-radius:3px; cursor:pointer; } #folkmeny .person::after{ content:''; display:block; clear:both; } #folkmeny .person select{ background:#2a2318; color:var(--ink); border:1px solid var(--rule); font:inherit; font-size:13px; min-height:30px; margin:0 4px; }
body.kort #folkmeny{ top:calc(var(--topp,44px) + 4px); bottom:calc(6px + env(safe-area-inset-bottom,0px)); left:calc(8px + env(safe-area-inset-left,0px)); padding:8px 10px 10px; }
body.kort #folkmeny h2{ font-size:19px; } body.kort #folkmeny .opp button{ min-height:34px; } body.kort #folkmeny .opp{ grid-template-columns:1fr 36px 24px 36px; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const panel = el('div', { id: 'folkmeny', role: 'dialog', 'aria-label': 'Folk' }); document.body.appendChild(panel);
  const st = el('div', {}, el('b', { id: 'sFolk' }, '–'), ' ', el('span', {}, 'folk')); st.hidden = true; st.className = 'viktig'; document.querySelector('.stats').appendChild(st);

  // ---------- panelet ----------
  function åpne(på) {
    åpen = på === undefined ? !åpen : !!på; panel.classList.toggle('på', åpen);
    if (åpen) { const lm = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (lm && lm.classList.contains('på') && lk) lk.click(); if (window.lukkPanel) lukkPanel(); vis(); }
  }
  // Hva som mangler, med hva du kan gjøre
  function mangler(B) {
    const ut = [], s = F.sist || {};
    if (B.utenSeng) ut.push(`${B.utenSeng} sover i telt: bygg en brakke (eller oppgrader).`);
    if (s.sult) ut.push('Tom for mat! Kjøp mat eller bygg drivhus.'); else if (B.dager < 2) ut.push(`Maten varer under ${B.dager < 1 ? 'ett døgn' : 'to døgn'}: kjøp mat eller bygg drivhus.`);
    if (s.kald > .05) ut.push('Folk fryser: legg inn ved (tre) eller kjøp diesel til leiren' + (B.utenSeng ? ', og bygg brakker.' : '.'));
    if (!B.kjøkken) ut.push(B.ferdige('kjøkken') ? 'Kjøkkenet har ikke strøm: maten lages på bål.' : 'Ingen kjøkken: maten lages på bål (bygg et kjøkken for varm mat og mindre svinn).');
    else if (!B.bemannet) ut.push('Kjøkkenet står tomt: sett noen på «kjøkken».');
    if (B.syke && !FR.arbeidere(F, 'stell')) ut.push(`${B.syke} er syke eller skadet: sett noen på «stell»${B.sykestue ? '' : B.ferdige('sykestue') ? ' (sykestua har ikke strøm)' : ' (best med sykestue)'}.`);
    if (FR.arbeidere(F, 'verksted') && !B.verksted) ut.push(B.ferdige('verksted') ? 'Verkstedet har ikke strøm.' : 'Folk på «verksted» trenger et verksted med strøm.');
    if (B.tårn > B.bemannedeTårn) ut.push(`${B.tårn - B.bemannedeTårn} vakttårn står ubemannet: sett flere på «vakt».`);
    if (!FR.arbeidere(F, 'bygg')) ut.push('Ingen på «bygg»: ingenting blir bygget.');
    if (F.ubetalt > 0) ut.unshift(`Lønn skyldes (${LB.kroner(F.ubetalt)}): moralen synker til folkene får betalt – ta en kontrakt eller selg noe.`);
    if (FR.nød(F)) ut.unshift(F.personer.length ? `Bare ${F.personer.length} igjen i gjengen: rekrutter flere (ingen krav om seng når dere er færre enn tre).` : 'Gjengen er tom: rekrutter nye folk (de første tre trenger ikke seng).');
    return ut;
  }
  let sistHtml = '';
  function vis() {
    if (!åpen) return; const ny = el('div'); fyll(ny);
    if (ny.innerHTML === sistHtml && panel.firstChild) return;
    const rulle = panel.scrollTop; sistHtml = ny.innerHTML; panel.innerHTML = ''; panel.append(...ny.childNodes); panel.scrollTop = rulle;
  }
  // (runde 4) små portretter i lista over folkene: portrettmotoren (Samfunn.portrettSVG, fast per person – samme ansikt som i
  // personkortet). Bildet lages én gang per person som en blob-adresse, så innerHTML holder seg kort og lik mellom tegningene
  // (vis() bytter bare inn når innholdet er endret).
  const ansikter = new Map();
  function ansikt(p) {
    if (!window.Samfunn || !Samfunn.portrettSVG || typeof Blob === 'undefined' || !window.URL || !URL.createObjectURL) return null;
    const k = p.navn + '|' + p.yrke; let u = ansikter.get(k);
    if (u === undefined) { try { u = URL.createObjectURL(new Blob([Samfunn.portrettSVG(p)], { type: 'image/svg+xml' })); } catch (e) { u = null; } ansikter.set(k, u); }
    return u ? el('img', { klasse: 'ansikt', src: u, alt: '', 'data-person': String(p.id), width: '30', height: '37' }) : null;
  }
  // fyll(panel): innholdet i panelet (panel er her en løs boks som vis() setter inn)
  function fyll(panel) {
    const Lr = L(); if (!F || !Lr) { panel.append(knapp('×', () => åpne(false), { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Folk'), el('div', { klasse: 'status' }, 'Start et spill først.')); return; }
    const B = FR.behov(F, Lr, valg()), s = F.sist || {}, n = F.personer.length, pil = F.mål > F.moral + 1 ? ' ↑' : F.mål < F.moral - 1 ? ' ↓' : '';
    const farge = F.moral >= 60 ? '#7fb06a' : F.moral >= 35 ? '#d6b25a' : '#d0684a';
    panel.append(knapp('×', () => åpne(false), { klasse: 'lukk', 'aria-label': 'Lukk' }), knapp('‹ Leiren', () => { åpne(false); const lk = document.getElementById('leirknapp'); if (lk) lk.click(); }, { klasse: 'tilbake' }),
      el('h2', {}, `Folk (${n})`));
    const strek = el('span', { klasse: 'strek' }, el('i', { style: `width:${Math.round(F.moral)}%;background:${farge}` }));
    panel.append(el('div', { klasse: 'moral' }, el('span', {}, `Moral ${Math.round(F.moral)}${pil}`), strek));
    const varme = B.fyring ? (s.kald > .05 ? 'mangler' : `${nf(B.ved, 1)} m³ ved eller ${nf(B.drivstoff)} l diesel per døgn`) : 'trengs ikke nå';
    const sh = F.personer.reduce((a, p) => a + p.helse, 0) / Math.max(1, n);
    // (runde 12, kritiker F: «Senger: 2 av 2 (6 ledige)» var uklart) – si sengene først, så hvor mange som bruker dem
    const sover = n + (B.avh || 0), iBruk = Math.min(sover, B.senger);
    const linjer = [B.senger ? `${B.senger} ${B.senger === 1 ? 'seng' : 'senger'}, ${iBruk} i bruk` + (B.utenSeng ? ` – ${B.utenSeng} sover i telt` : '') : `Ingen senger – ${sover} sover i telt`,
      `Mat: ${nf(F.mat)} rasjoner` + (B.dager === Infinity ? ' (drivhusene holder)' : ` (ca. ${nf(B.dager, 1)} døgn)`) + (B.drivhus ? ` · drivhus +${nf(B.drivhus, 1)}/døgn` : '') + (B.varmMat ? ' · varm mat' : ''),
      `Varme: ${varme}`, `Helse: ${n ? Math.round(sh * 100) + ' %' : '–'}` + (B.syke ? ` · ${B.syke} syke/skadet` : '') + (B.sykestue ? ' · sykestue' : ''),
      `Vakttårn: ${B.bemannedeTårn} av ${B.tårn} bemannet` + (F.borte ? ` · ${F.borte} har forlatt gjengen` : ''),
      `Lønn: ${LB.kroner(lønnNå())} per døgn` + (F.ubetalt > 0 ? ` · ${LB.kroner(F.ubetalt)} skyldes` : '')];
    // lav skjerm (telefon): status som ett avsnitt og høyst to ting som mangler, så oppgavene synes uten å bla langt
    const kort = document.body.classList.contains('kort'), mg = mangler(B);
    panel.append(el('div', { klasse: 'status brikker' }, ...linjer.flatMap(t => String(t).split(' · ')).map(t => el('span', {}, t))));
    const matN = 50, kjøp = knapp(`Kjøp ${matN} rasjoner (${LB.kroner(Math.round(matN * FR.R.matPris * matF()))})`, () => { const r = kom({ type: 'kjøpMat', rasjoner: matN }); logg(r.feil || `Kjøpte ${r.rasjoner} rasjoner mat for ${LB.kroner(r.pris)}.`); lagre(); vis(); }, { id: 'kjøpmat' });
    const rek = knapp(`Rekrutter (${LB.kroner(FR.R.rekruttPris)})`, () => { const r = kom({ type: 'rekrutter' });
      logg(r.feil || `${r.person.navn} (${r.person.yrke}) er med i gjengen` + (r.nød ? ` og går på «${FR.OPPGAVE[r.person.oppgave].navn.toLowerCase()}»` + (r.pris ? '.' : ' (gratis: kassa er tom).') : '.')); lagre(); vis(); visStatus(); }, { id: 'rekrutter' });
    // færre enn tre i gjengen: rekruttering er alltid mulig (FR.kanRekruttere), så spillet ikke låser seg
    // (runde 6, kritikken: «Rekrutter» var grå uten forklaring) – grunnen står nå som tekst under knappene, ikke bare i verktøytipset
    const penger = OppstartSpill.tilstand().penger, hvorfor = FR.kanRekruttere(F, Lr, valg()) || (FR.nød(F) || penger >= FR.R.rekruttPris ? null : `Ikke nok penger i kassa (${LB.kroner(FR.R.rekruttPris)}).`);
    rek.disabled = !!hvorfor; if (hvorfor) rek.title = hvorfor;
    panel.append(el('div', { klasse: 'rad' }, kjøp, rek, window.SamfunnSpill && SamfunnSpill.tilstand() ? knapp('Samfunn ›', () => SamfunnSpill.åpne(true), { id: 'samfunn-fra-folk' }) : ''));
    if (hvorfor) panel.append(el('div', { klasse: 'mangler', id: 'rekrutthvorfor' }, 'Kan ikke rekruttere nå – ' + hvorfor.charAt(0).toLowerCase() + hvorfor.slice(1)));
    // (runde 12, kritiker F: «Rekrutter» flyttet seg etter første trykk – linja «Bare 2 igjen …» over knappene forsvant) – det som mangler,
    // står nå under knappene, så knappene ikke flytter seg når en linje kommer eller går
    for (const t of kort && !alleMangler ? mg.slice(0, 2) : mg) panel.append(el('div', { klasse: 'mangler' }, t));
    if (kort && !alleMangler && mg.length > 2) { const m = el('div', { klasse: 'mangler', style: 'cursor:pointer;text-decoration:underline' }, `… og ${mg.length - 2} til`); m.onclick = () => { alleMangler = true; vis(); }; panel.append(m); }
    if (B.avh) panel.append(el('div', { klasse: 'status' }, `Barn og gamle: ${B.avh} (arbeider ikke, men spiser og trenger seng)`));
    // oppgavene: − antall +
    panel.append(el('h3', {}, 'Oppgaver'));
    // RUNDE 13 (kritiker H: «+ på Vakt tok en fra Bygg uten å si det»): siste flytting står her til neste endring
    if (flyttet) panel.append(el('div', { klasse: 'status', id: 'folkflyttet' }, flyttet));
    for (const o of FR.OPPGAVER) {
      const antall = F.personer.filter(p => p.oppgave === o).length, a = FR.arbeidere(F, o), t = FR.tempo(F, o), O = FR.OPPGAVE[o];
      const info = o === 'bygg' ? lagTekst(a) + (a ? ` · tempo ${nf(FR.byggTempo(F), 2)}` : '') : o === 'fri' ? O.tekst : a ? `tempo ${nf(t, 2)} · ${O.tekst.toLowerCase()}` : O.tekst;
      const minus = knapp('−', () => flytt(o, FR.minus), { 'aria-label': `Færre på ${O.navn.toLowerCase()}`, 'data-o': o, klasse: 'minus', title: minusHjelp(o) });
      const pluss = knapp('+', () => flytt(o, FR.pluss), { 'aria-label': `Flere på ${O.navn.toLowerCase()}`, 'data-o': o, klasse: 'pluss', title: plussHjelp(o) });
      minus.disabled = !antall; pluss.disabled = o === 'fri' ? n - antall === 0 : antall === n;
      panel.append(el('div', { klasse: 'opp' }, el('div', {}, el('b', {}, O.navn), el('small', {}, info + (antall > a ? ` · ${antall - a} syke` : ''))), minus, el('span', { klasse: 'n' }, String(antall)), pluss));
    }
    // folkene
    panel.append(el('div', { klasse: 'rad' }, knapp(visFolk ? `Skjul folkene` : `Vis folkene (${n})`, () => { visFolk = !visFolk; vis(); }, { id: 'visfolk' })));
    if (visFolk) for (const p of F.personer) {
      const best = Object.entries(p.ferd).sort((a, b) => b[1] - a[1])[0];
      // DELEGERE (brukeren 16. nov): velg oppgaven for hver enkelt; ★ står ved det personen er best på
      const velg = el('select', { 'aria-label': `Oppgave for ${p.navn}`, 'data-id': String(p.id) }); for (const o of FR.OPPGAVER) { const v = el('option', { value: o }, FR.OPPGAVE[o].navn + (o === best[0] ? ' ★' : '')); if (o === p.oppgave) v.setAttribute('selected', ''); velg.appendChild(v); }
      velg.onchange = () => { KOMMANDO({ type: 'folk', person: p.id, oppgave: velg.value }); endret(); };
      // trykk på navnet åpner personkortet (ansikt, historie, ønske – spill/samfunn-visning.js)
      const navn = el('span', { klasse: 'pnavn', 'data-person': String(p.id), style: 'cursor:pointer;text-decoration:underline dotted' }, `${p.spes ? '★ ' : ''}${p.navn}, ${p.alder} `);
      navn.onclick = () => { if (window.SamfunnSpill) SamfunnSpill.visPerson(p.id); };
      const merke = (p.syk ? ' · Grålungen' : '') + (p.karantene ? ' · karantene' : '') + (p.trener ? ' · i opplæring' : '') + (p.borte ? ' · borte' : '');
      const bilde = ansikt(p); if (bilde) bilde.onclick = navn.onclick;
      panel.append(el('div', { klasse: 'person' + (p.helse < FR.R.arbeidsfør || p.syk ? ' syk' : '') }, ...(bilde ? [bilde] : []), navn, velg,
        el('small', {}, ` · ${p.yrke}, best på ${FR.OPPGAVE[best[0]].navn.toLowerCase()} · helse ${Math.round(p.helse * 100)} %${p.seng ? '' : ' · telt'}${merke}`)));
    }
  }
  function endret() { lagre(); vis(); visStatus(); skitten = true; }
  // ---------- RUNDE 13: hvem − / + flytter, og byggelagene sagt likt overalt ----------
  let flyttet = '';
  const oNavn = o => (FR.OPPGAVE[o] ? FR.OPPGAVE[o].navn : o);
  // + tar en fri; er ingen fri, tar den fra oppgaven med flest (samme regel som FolkRegler.pluss)
  function plussKilde(o) { if (o === 'fri') { const t = FR.OPPGAVER.filter(q => q !== 'fri').map(q => [q, F.personer.filter(p => p.oppgave === q).length]).sort((a, b) => b[1] - a[1]); return t[0] && t[0][1] ? t[0][0] : null; }
    if (F.personer.some(p => p.oppgave === 'fri')) return 'fri'; const t = FR.OPPGAVER.filter(q => q !== o && q !== 'fri').map(q => [q, F.personer.filter(p => p.oppgave === q).length]).sort((a, b) => b[1] - a[1]); return t[0] && t[0][1] ? t[0][0] : null; }
  const plussHjelp = o => { if (!F) return ''; const k = plussKilde(o); return !k ? 'Ingen å flytte' : k === 'fri' ? `Tar en som har fri` : `Ingen har fri – tar en fra ${oNavn(k)}`; };
  const minusHjelp = o => (o === 'fri' ? 'Den beste av de frie går til Bygg' : 'Den svakeste her får fri');
  function flytt(o, fn) { const før = new Map(F.personer.map(p => [p.id, p.oppgave])), p = KOMMANDO({ type: 'folkFlytt', oppgave: o, retning: fn === FR.minus ? 'minus' : 'pluss' }).svar;
    flyttet = p && før.get(p.id) !== p.oppgave ? `Flyttet: ${p.navn} fra ${oNavn(før.get(p.id))} til ${oNavn(p.oppgave)}.` : '';
    if (flyttet && før.get(p.id) !== 'fri' && p.oppgave !== 'fri') flyttet += ' (ingen hadde fri)';
    if (flyttet) logg(flyttet.replace(/^Flyttet: /, '')); endret(); }
  // to på Bygg = ett byggelag; et lag med bare én går halvt så fort (FolkRegler.byggelag/byggTempo)
  function lagTekst(n) { const l = FR.byggelag(F); if (!n) return 'ingen byggelag – sett minst én (helst to) her';
    return n % 2 ? `${n} på bygg = ${l} byggelag (${n === 1 ? 'bare én – halv fart' : 'det ene har bare én – halv fart'})` : `${n} på bygg = ${l} byggelag`; }
  const lagre = () => { if (window.LeirSpill) LeirSpill.lagre(); };
  function visStatus() {
    st.hidden = !F; if (!F) return; const Lr = L(), B = Lr ? FR.behov(F, Lr, valg()) : null;
    const varsel = B && (B.utenSeng || (F.sist && (F.sist.sult || F.sist.kald > .05)) || B.dager < 1 || F.moral < 35);
    // (R2-løkka 26. nov, kritikken: «topplinja 8, krigskartet 12 personer») de som er ute i troppene, står etter et pluss: «8 +4»
    // (8 i leiren og 4 i tropper = 12 i alt, som Krig og lønna regner). Første tall er fortsatt de i leiren (Folk-knappen).
    const ute = iTropper(), t = `${F.personer.length}` + (ute ? ` +${ute}` : '') + (varsel ? ' ⚠' : ''); if (t !== vist) { vist = t; document.getElementById('sFolk').textContent = t; }
    st.title = `${F.personer.length} i leiren` + (ute ? `, ${ute} i tropper (${F.personer.length + ute} i alt)` : '') + ` · moral ${Math.round(F.moral)}`;
  }
  // Raden i Leir-menyen (leir-visning.js kaller denne)
  function menyRad() {
    const n = F ? F.personer.length : 0;
    return el('div', { style: 'margin-top:6px' }, knapp(F ? `Folk (${n}) – moral ${Math.round(F.moral)} ›` : 'Folk', () => åpne(true), { id: 'folkknapp' }));
  }

  // ---------- lønn (brukeren 25. nov: «Ja») ----------
  // Alle i gjengen og mennene i egne tropper (s.fraFolk) får lønn hver spilltime (FR.lønnSteg); den følger markedets inflasjon.
  // I testene (navigator.webdriver) betales det ikke av seg selv – FolkSpill.lønnTest = true slår det på.
  const lønnAuto = () => !navigator.webdriver || window.FolkSpill.lønnTest;
  const iTropper = () => (typeof ENHETER === 'undefined' ? 0 : ENHETER.filter(s => s.side === 'blå' && s.fraFolk && Array.isArray(s.menn)).reduce((a, s) => a + s.menn.filter(m => m.hp > 0).length, 0));
  const infl = () => { try { const M = window.SpilletSpill && SpilletSpill.M && SpilletSpill.M(); return M && M.infl > 0 ? M.infl : 1; } catch (e) { return 1; } };
  const lønnNå = () => FR.lønnPerDøgn(F.personer.length + iTropper(), infl());
  function lønn(dt) {
    if (!F || !lønnAuto() || !window.OppstartSpill) return null;
    const r = FR.lønnSteg(F, dt, kr => OppstartSpill.betal(kr), { ekstra: iTropper(), infl: infl() });
    for (const h of r.hendelser) logg(h); if (r.betalt || r.hendelser.length) lagre();
    return r;
  }
  // ---------- tiden ----------
  const meldt = new Map();
  KROKER.sim.push(dt => {
    const Lr = L(); if (!F || !Lr || !spill()) return;
    akk += dt;
    if (akk >= 1) { const r = FR.steg(F, Lr, akk, valg()); lønn(akk); akk = 0;
      for (const h of r.hendelser) logg(h); if (r.hendelser.length) lagre();
      if (r.døde && r.døde.length && window.SamfunnSpill) SamfunnSpill.døde(r.døde); }
    soldater(dt); vakter(); falne();
    if (performance.now() - sist > 1000) { sist = performance.now(); visStatus(); if (!(window.pekerNede && pekerNede(panel)) && !(document.activeElement && document.activeElement.tagName === 'SELECT' && panel.contains(document.activeElement))) vis(); forsvarNå = null; }
  });
  // RUNDE 14 (kritiker J: «FOLK 10 ⚠» øverst mens Folk-knappen viste 6 etter at en tropp ble laget): tallet øverst oppdateres også når
  // spillet står på pause (KROKER.sim går ikke da) – samme kilde som knappen (F.personer.length), høyst 0,4 s etter
  setInterval(() => { try { if (F && document.getElementById('sFolk') && (document.getElementById('sFolk').textContent.split(' ')[0] !== String(F.personer.length) || !/\+/.test(document.getElementById('sFolk').textContent) !== !iTropper())) visStatus(); } catch (e) { /* neste runde */ } }, 400);
  // ---------- (runde 12, kritiker F) DE FALNE: én kilde for loggen, folket og begravelsen ----------
  // Kritikken: «Håkon Rønning og Silje Berg er falt» og «2 døde venter på begravelse», men begge sto i Folk med helse 15 %, og
  // folketallet sto på 12 også etter «4 døde». Leirvakta (forsvar-visning.js) er folk på «vakt» som tar opp våpen: mennene peker på
  // personen med m.person = p.id, og når angrepet var over, fikk en falt vakt bare lav helse. Nå: hver mann som faller i et eget lag,
  // merkes m.falt (én gang), går ut av folket hvis han hører til der, meldes i én linje per lag og settes på lista over døde
  // (SamfunnSpill.falt). Tropper har personene utenfor folket (Tropper.opprett), så der er det bare meldingen og begravelsen.
  // Rett etter start/lasting merkes de som alt er falt, uten melding (lagring.js tar ikke vare på m.falt).
  let stilleTil = 0;
  function falne() {
    if (typeof ENHETER === 'undefined') return 0; const stille = performance.now() < stilleTil; let n = 0, ut = false;
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || !Array.isArray(s.menn)) continue; const nye = [];
      for (const m of s.menn) { if (!(m.hp <= 0) || m.falt) continue; m.falt = true; n++;
        if (F && FR.fjern(F, FR.personId(m))) ut = true;
        if (!stille && m.navn) nye.push(m.navn); }
      if (nye.length) { const farvel = window.SamfunnSpill && SamfunnSpill.falt ? nye.map(navn => SamfunnSpill.falt(navn)).some(Boolean) : false;
        logg(FR.falneTekst(nye, s.navn) + (farvel ? ' Ta farvel i Samfunn-panelet.' : '')); } }
    if (ut) { lagre(); visStatus(); vis(); }
    return n;
  }
  // loggteksten når en av dine er truffet (index.html og enheter-visning.js): de som faller, meldes av falne() over
  window.treffLogg = (m, lag, hva, ekstra) => { if (!lag || lag.side !== 'blå' || hva === 'falt' && !lag.karakter) return; logg(FR.treffTekst(m, lag, hva, ekstra)); };
  // sykestua med folk på «stell» leger sårede soldater i egne lag innen 150 m (fra 50 % til helt på ca. 5 timer)
  function soldater(dt) {
    const Lr = L(), stell = FR.arbeidere(F, 'stell'); if (!stell) return;
    const ss = Lr.bygg.filter(b => b.type === 'sykestue' && LB.virker(b) && !LeirSpill.siste().mangler.has(b.id)); if (!ss.length) return;
    const fart = .1 * FR.tempo(F, 'stell') * Math.min(2, stell) * dt / 60;
    for (const s of ENHETER) { if (s.side !== 'blå' || !ss.some(b => Math.hypot(b.x - s.x, b.y - s.y) < 150)) continue;
      for (const m of s.menn) if (m.hp > 0 && m.hp < 1) { m.hp = Math.min(1, m.hp + fart); if (m.hp >= 1) logg(`${m.navn} (${s.navn}) er ferdig stelt på sykestua.`); } }
  }
  // vaktene melder fiender nær leiren (én gang i timen per fiende)
  function vakter() {
    const S = spill(), f = forsvar(); if (!f.varsling || !S || !S.leir) return;
    for (const e of ENHETER) { if (e.side === 'blå' || !levende(e)) continue; const d = Math.hypot(e.x - S.leir.x, e.y - S.leir.y);
      if (d < f.varsling && !(meldt.get(e) > tid - 60)) { meldt.set(e, tid); logg(`Vakta melder: ${e.navn} ${nf(Math.round(d / 10) * 10)} m fra leiren!`); } }
  }

  // ---------- forsvar: vakttårn og sandsekker ----------
  let forsvarNå = null;
  const forsvar = () => { const Lr = L(); if (!F || !Lr) return { tårn: [], sekker: [], varsling: 0 }; if (!forsvarNå) { forsvarNå = FR.forsvar(F, Lr); if (window.SamfunnSpill && SamfunnSpill.varsling) forsvarNå.varsling *= SamfunnSpill.varsling(); } return forsvarNå; };
  const nær = (liste, s, r) => liste.some(b => Math.hypot(b.x - s.x, b.y - s.y) < r);
  KROKER.sikt.push(s => (s.side === 'blå' && nær(forsvar().tårn, s, 150) ? 1.25 : 1));
  KROKER.ild.push((a, b) => {
    let f = 1; if (a.side === 'blå' && nær(forsvar().tårn, a, 100)) f *= 1.2;
    if (b.side === 'blå' && nær(forsvar().sekker, b, 15)) f *= .6; return f;
  });
  KROKER.ser.push(e => { const S = spill(), f = forsvar(); return !!(f.varsling && S && S.leir && e.side !== 'blå' && Math.hypot(e.x - S.leir.x, e.y - S.leir.y) < f.varsling); });

  // ---------- 3D: kjøkkenet (rødmalt trehus med pipe og tak over døra) ----------
  if (window.MODELLER) MODELLER.kjøkken = function () {
    const d = [], hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
    const farg = (g, c) => { if (g.index) g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals(); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); return g; };
    const boks = (x, y, z, sx, sy, sz, c, ry) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, 0, sz / 2); if (ry) g.rotateY(ry); g.translate(x, y, z); d.push(farg(g, hex(c))); };
    boks(0, 0, 0, 7.2, 9.2, .25, '#8f8d87');
    boks(-.4, 0, .25, 5.6, 8.4, 2.6, '#7d2f25');
    for (const y of [-2.6, 0, 2.6]) { boks(2.42, y, 1.1, .08, 1.1, .9, '#1f2b33'); boks(2.43, y, 1.05, .06, 1.25, .08, '#e4e1d8'); boks(2.43, y, 2.02, .06, 1.25, .08, '#e4e1d8'); }
    for (const y of [-2.2, 2.2]) boks(-3.22, y, 1.1, .08, 1.1, .9, '#1f2b33');
    boks(2.44, -1.3, .25, .08, 1, 2, '#4f4132');
    // saltak (mønet langs y) og takutstikk
    for (const sd of [-1, 1]) { const g = new THREE.BoxGeometry(3.5, 9.0, .16); g.translate(0, 0, .08); g.rotateY(sd * .52); g.translate(-.4 + sd * 1.48, 0, 3.67); d.push(farg(g, hex('#2a2c2e'))); }
    // gavlene (trekanter, begge sider)
    for (const sd of [-1, 1]) { const y = sd * 4.2, h = 1.6, A = [-3.2, y, 2.85], Bp = [2.4, y, 2.85], C = [-.4, y, 2.85 + h];
      for (const P of [[A, Bp, C], [A, C, Bp]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P.flat()), 3)); g.computeVertexNormals(); d.push(farg(g, hex('#7d2f25'))); } }
    // pipe og røykhette, tak over døra med to stolper, benk og bord ute
    boks(-1.8, 2.4, 3, .5, .5, 2.1, '#5e6366'); boks(-1.8, 2.4, 5.1, .75, .75, .12, '#3c3d3e');
    boks(3.05, -1.3, 2.35, 1.3, 2.2, .1, '#4f4132'); for (const y of [-2.25, -.35]) boks(3.55, y, .25, .12, .12, 2.1, '#6e5b45');
    boks(3.05, 2.2, .25, .9, 2.2, .75, '#8a7457'); boks(3.05, 2.2, 1, 1.1, 2.4, .07, '#8a7457');
    return MODELLER.samle(d, .22);
  };

  // ---------- start ----------
  function start() {
    const Lr = L(); if (!Lr || !spill()) { F = null; visStatus(); return; }
    // samme frø per leir (fra leirens plass), så en ny leir et annet sted får andre folk
    const S = spill(), frø = S.leir ? (Math.round(S.leir.x) * 31 + Math.round(S.leir.y)) >>> 0 : 1987;
    F = (Lr.folk && FR.fraJSON(Lr.folk)) || FR.ny(frø); Lr.folk = F; meldt.clear(); forsvarNå = null; stilleTil = performance.now() + 2500; lagre(); visStatus(); vis();
  }
  window.addEventListener('riksbrudd-spill', start);

  // ---------- INGEN BYGGER (runde 8, kritiker D: «Brakke bygges – venter i kø · Byggelag: 0» i tre døgn, Folk 0) ----------
  // Når jobber venter og ingen står på «bygg», står en tydelig linje øverst i Leir-menyen (klassen «fast»: synlig i alle faner) med
  // det som hjelper: «Sett to på Bygg» (henter fra de andre oppgavene) eller, når gjengen er nesten tom, «Ring etter arbeidere»
  // (nødrekrutteringen i folk.js: ingen krav om seng når dere er færre enn tre, vanlig pris – gratis når kassa er tom). VALG: ingen
  // gratis «nødbyggelag» av seg selv – da kunne alle gjøres til soldater og nye arbeidere hentes gratis igjen og igjen.
  function hjelpBygg() { const Lr = L(); if (!F || !Lr) return { feil: 'Ingen leir.' }; const før = FR.arbeidere(F, 'bygg'), mål = 2; let flyttet = 0, nye = 0;
    while (FR.arbeidere(F, 'bygg') < mål && F.personer.some(p => p.oppgave !== 'bygg' && FR.arbeidsfør(p))) { const p = kom({ type: 'folkFlytt', oppgave: 'bygg', retning: 'pluss' }); if (!p || p.feil) break; flyttet++; }
    while (FR.arbeidere(F, 'bygg') < mål && FR.nød(F)) { const r = kom({ type: 'rekrutter', bygg: true }); if (r.feil) break; nye++; }
    if (flyttet || nye) logg((flyttet ? `${flyttet} satt på «bygg»` : '') + (flyttet && nye ? ', og ' : '') + (nye ? `${nye} ${nye === 1 ? 'ny arbeider er' : 'nye arbeidere er'} med i gjengen` : '') + `: ${FR.byggelag(F)} byggelag.`);
    else logg(F.personer.length ? 'Ingen ledige å sette på «bygg» – rekrutter i Folk (krever ledig seng), eller oppløs en tropp ved leiren.' : 'Fikk ikke tak i arbeidere nå.');
    endret(); if (window.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); return { før, etter: FR.arbeidere(F, 'bygg'), flyttet, nye }; }
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp: k2 }) => { const Lr = L(); if (!F || !Lr || !window.Leir || !LB.jobber) return; let J = 0; try { J = LB.jobber(Lr).length; } catch (er) { J = 0; }
    if (!J || FR.byggelag(F) > 0) return; const andre = F.personer.filter(p => p.oppgave !== 'bygg' && FR.arbeidsfør(p)).length, nød = FR.nød(F);
    const tekst = !F.personer.length ? `Ingen i leiren – ${J === 1 ? 'jobben' : `de ${J} jobbene`} står stille. Ring etter arbeidere, eller oppløs en tropp ved leiren.` : `Ingen på «bygg» – ${J === 1 ? 'jobben' : `de ${J} jobbene`} står stille.`;
    const k = andre ? k2('Sett to på Bygg', hjelpBygg, { id: 'hjelpbygg' }) : nød ? k2(`Ring etter arbeidere (${OppstartSpill.tilstand().penger >= FR.R.rekruttPris ? LB.kroner(FR.R.rekruttPris) + ' per person' : 'gratis: kassa er tom'})`, hjelpBygg, { id: 'hjelpbygg' }) : null;
    const boks = e('div', { klasse: 'fast ingenbygger', role: 'alert' }, e('span', {}, '⚠ ' + tekst), k || e('small', {}, ' Rekrutter i Folk (krever ledig seng), eller oppløs en tropp ved leiren.'));
    const rad = [...hode.children].find(n => n.querySelector && n.querySelector('#folkknapp')); if (rad) rad.before(boks); else hode.appendChild(boks); });
  { const c2 = document.createElement('style'); c2.textContent = `#leirmeny .ingenbygger{ display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; margin:8px 0 2px; padding:7px 9px; border:1px solid #c0603a; background:#3a1d12; color:#f2c9a8; font-size:14px; line-height:1.35; }
#leirmeny .ingenbygger button{ min-height:36px; border-color:#e0804a; } #leirmeny .ingenbygger small{ color:#e8c0a0; }`; document.head.appendChild(c2); }
  // R18-D (flerspiller): en gjest viser vertens folk (L.folk i speilet av vertens leir, se LeirSpill.speil). null = eget spill igjen.
  function speil(Fo) { const Lr = L(); if (!Fo || !Lr) { start(); return; } F = FR.fraJSON(Fo) || F; Lr.folk = F; visStatus(); if (åpen) vis(); }
  window.FolkSpill = { speil, start, åpne, vis, menyRad, tilstand: () => F, valg, matFaktor: matF, grunn, forsvar: () => forsvar(), hjelpBygg, falne, lønn, lønnNå, lønnTest: false };
  // Avtalen med de andre delene (byggesett, materialer): tåler at spillet ikke er startet (da 0)
  window.Folk = {
    arbeidere: o => (F ? FR.arbeidere(F, o) : 0),
    tempo: o => (F ? FR.tempo(F, o) : 0),
    liste: () => (F ? F.personer : []),
    moral: () => (F ? F.moral : 0),
    byggelag: () => (F ? FR.byggelag(F) : 0),
    OPPGAVER: FR.OPPGAVER,
  };
})();
