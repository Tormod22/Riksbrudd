'use strict';
// Fritt byggesett (regler: spill/byggesett.js). «Byggesett» i Leir-menyen åpner verktøylinja nederst: velg Gulv, Vegg (tre, betong,
// murstein; hel, dør, vindu, port), Tak (flatt, saltak), Forsvar (palisade, mur, jordvoll, piggtråd), Hus (ferdige små hus) eller Riv.
// Trykk på kartet (2D eller 3D): delen legger seg i rutenettet (2,4 m), veggen på nærmeste kant, taket oppå veggene. Trykk et punkt til
// for en rad (gulv og tak: rektangelet; vegger: linja, eller rundt rektangelet når du trykker to hjørner). «Bygg» bestiller delene som
// jobber for byggelagene i leiren (Leir.bygg); det som mangler av materialer kan kjøpes med én knapp. Dør og vindu bytter ut en hel vegg.
// 3D: alle delene i fem samlede nett (tre, betong, murstein, tak og resten med hjørnefarger), med tekstur laget i koden; ingen del svever
// (hele huset står på samme grunnmur, sokkelen går ned i terrenget). window.Byggesett.rom() gir de lukkede rommene (for Folk-delen).
// Kroker: KROKER.trykk/trykk3d (først i lista, bare når verktøyet er på), KROKER.tegn, KROKER.sett3d, KROKER.sim.
(function () {
  const BS = window.ByggesettRegler, LB = window.Leir; if (!BS || !LB) return;
  const G = BS.U || BS.G, H = BS.H, D = BS.DELER, r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const L = () => (window.LeirSpill ? LeirSpill.tilstand() : null), spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const bonus = () => (window.OppstartSpill ? OppstartSpill.bonus() : {});
  // rutenettet går ut fra leirens midte (lagres i leiren første gang)
  function opphav() { const l = L(), S = spill(); if (!l) return null; if (!l.byggesett) { const x = S && S.leir ? S.leir.x : kam.x, y = S && S.leir ? S.leir.y : kam.y; l.byggesett = { ox: Math.round(x * 10) / 10, oy: Math.round(y * 10) / 10 }; } return l.byggesett; }
  const deler = () => BS.fraLeir(L(), LB);
  // rommene med bruken spilleren har valgt (L.romBruk lagres med leiren)
  const romNå = () => BS.rom(deler(), (L() || {}).romBruk);
  function byttBruk(nøkkel) { const l = L(); if (!l) return; const typer = Object.keys(BS.ROMBRUK), r = romNå().find(q => q.nøkkel === nøkkel); if (!r) return;
    const ny = typer[(typer.indexOf(r.bruk) + 1) % typer.length]; l.romBruk = { ...(l.romBruk || {}), [nøkkel]: ny };
    logg(`Rommet på ${String(r.areal).replace('.', ',')} m² brukes nå som ${BS.ROMBRUK[ny].navn.toLowerCase()}.`); if (LeirSpill.lagre) LeirSpill.lagre(); if (LeirSpill.visMeny) LeirSpill.visMeny(); skitten = true; }

  // ---------- verktøylinja ----------
  const css = document.createElement('style');
  css.textContent = `#byggesett{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(64px + env(safe-area-inset-bottom,0px)); z-index:11; display:none; background:var(--panel);
  border:1px solid var(--hover); padding:7px 9px 8px; color:var(--ink); width:min(640px,96vw); box-sizing:border-box; text-align:center; }
#byggesett.på{ display:block; }
#byggesett .rad{ display:flex; flex-wrap:wrap; gap:4px; justify-content:center; margin-top:5px; }
#byggesett button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:36px; padding:3px 10px; cursor:pointer; font:inherit; font-size:14px; }
#byggesett button.på{ border-color:var(--hover); background:#4a3c22; color:#fff3d6; }
#byggesett button:disabled{ opacity:.45; cursor:default; }
#byggesett .tekst{ font-size:13.5px; margin-top:4px; line-height:1.35; } #byggesett small{ color:var(--ink-dim); display:block; font-size:12.5px; } #byggesett small.advarsel{ color:#e8a35a; }
#byggesett .faner button{ flex:1 1 auto; }
body.kort #byggesett{ bottom:calc(6px + env(safe-area-inset-bottom,0px)); padding:4px 6px 5px; width:min(620px,calc(100vw - 120px)); max-height:46vh; overflow-y:auto; }
body.kort.smal #byggesett{ left:calc(6px + env(safe-area-inset-left,0px)); transform:none; width:calc(100vw - 62px); }
body.kort #byggesett button{ min-height:30px; padding:1px 7px; font-size:12.5px; } body.kort #byggesett .rad{ margin-top:3px; gap:3px; }
body.kort #byggesett .tekst{ font-size:12px; margin-top:2px; } body.kort #byggesett small{ font-size:11px; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const linje = el('div', { id: 'byggesett', role: 'dialog', 'aria-label': 'Byggesett' }); document.body.appendChild(linje);
  // B4 (byggesett 3): rutenett 1,2 m (eller «Hall 4,8 m» med ett trykk), fire etasjer, Bærende (søyler og bjelker), Trapp, Plan (plantegningen)
  const FANER = [['gulv', 'Gulv'], ['vegg', 'Vegg'], ['tak', 'Tak'], ['bærende', 'Bærende'], ['trapp', 'Trapp'], ['forsvar', 'Forsvar'], ['maskin', 'Maskiner'], ['hus', 'Hus'], ['plan', 'Plan'], ['riv', 'Riv']];
  const STOFF = [['tre', 'Tre'], ['stein', 'Mur'], ['betong', 'Betong'], ['blikk', 'Blikk']], VARIANT = [['hel', 'Hel'], ['dør', 'Dør'], ['vindu', 'Vindu'], ['port', 'Port']];
  const V = { åpen: false, fane: 'vegg', stoff: 'tre', variant: 'hel', gulv: 'bs_fundament', tak: 'bs_tak_sal', forsvar: 'bs_palisade', bærende: 'bs_søyle_tre', trapp: 'bs_trapp', maskin: 'bs_sagbenk', hus: 'hytte', rot: 0, nivå: 'auto', nett: 1, planE: 1, malValg: false };
  let A = null, B = null, forslag = [], kart = null, teller = 0, tekst = '', ekstra = '', advarsel = '';
  // grunntypen for fanen (de gamle 2,4 m-navnene er de samme grunnene) og størrelsen etter rutenettet
  const grunn = t => (t ? String(t).replace(/_[124]$/, '') : t);
  function typeNå() {
    let g = V.fane === 'vegg' ? `bs_vegg_${V.stoff}${V.variant === 'hel' ? '' : '_' + V.variant}` : V.fane === 'gulv' ? V.gulv : V.fane === 'tak' ? V.tak : V.fane === 'forsvar' ? V.forsvar : V.fane === 'bærende' ? V.bærende : V.fane === 'trapp' ? V.trapp : V.fane === 'maskin' ? V.maskin : null;
    g = grunn(g); if (!g) return null; const N = BS.NYE[g]; if (!N) return D[g] ? g : null;
    const s = N.str.includes(V.nett) ? V.nett : N.str[0];
    return BS.typeFor(g, s);
  }
  const malNå = () => (V.hus && String(V.hus).startsWith('egen:') ? egneMaler()[+String(V.hus).slice(5)] : BS.HUS[V.hus]) || BS.HUS.hytte;
  // egne maler (spilleren lagrer et bygg): localStorage «riksbrudd-bsmaler» (felles for alle leirer, som leirens maler)
  const MALNØKKEL = 'riksbrudd-bsmaler';
  function egneMaler() { try { const v = JSON.parse(localStorage.getItem(MALNØKKEL) || '[]'); return Array.isArray(v) ? v.filter(BS.malGyldig) : []; } catch (e) { return []; } }
  function lagreMal(deler, navn) { const m = BS.tilMal(deler, navn); if (!m) return null; const L0 = egneMaler(); L0.push(m); while (L0.length > 12) L0.shift(); try { localStorage.setItem(MALNØKKEL, JSON.stringify(L0)); } catch (e) { /* sperret */ } return L0.length - 1; }
  const prisTekst = t => { const d = D[t]; if (!d) return ''; const L = d.s * G, k = d.kat === 'gulv' || d.kat === 'tak' ? `${String(Math.round(L * L * 10) / 10).replace('.', ',')} m²` : d.kat === 'søyle' ? 'søyle' : d.kat === 'trapp' ? 'trapp' : `${String(L).replace('.', ',')} m`;
    // (B5) maskiner, lamper og hyller: prisen per stykk, målene og strømmen
    if (['maskin', 'lampe', 'lager'].includes(d.kat)) return `${LB.kroner(d.pris)} og ${tidTekst(d.tid * 60)} arbeid` + (d.l ? ` · ${String(d.b * G).replace('.', ',')} × ${String(Math.round(d.l * G * 10) / 10).replace('.', ',')} m` : '') + (d.kw ? ` · ${String(-d.kw).replace('.', ',')} kW` : '') + (d.tung ? ' · betonggulv' : '');
    return `${LB.kroner(d.pris)} og ${tidTekst(d.tid * 60)} per ${k}`; };
  const stoffTekst = st => { const S = BS.STOFF[st]; return S ? `${S.navn}: spenn ${S.spenn} m${S.brenner ? ', brenner' : ''}` : ''; };
  const velg = (k, v) => () => { V[k] = v; if (k === 'fane') { V.rot = 0; V.malValg = false; } A = null; B = null; forslag = []; if (k === 'fane' && v === 'plan') sentrerPlan(); oppdater(); };
  // fanen Plan: kartet går til byggene (de fyller ca. 60 % av skjermen)
  function sentrerPlan() { const M = planModell(); if (!M || typeof kam === 'undefined') return; const xs = M.P.map(p => p[0]), ys = M.P.map(p => p[1]);
    kam.x = (Math.min(...xs) + Math.max(...xs)) / 2; kam.y = (Math.min(...ys) + Math.max(...ys)) / 2 - 4; kam.m = Math.max(.05, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / (Math.min(VW, VH) * .55)); skitten = true; }
  function visLinje() {
    linje.innerHTML = ''; linje.classList.toggle('på', V.åpen); if (!V.åpen) return;
    const rad = (...k) => el('div', { klasse: 'rad' }, ...k), valg = (k, v, t) => knapp(t, velg(k, v), V[k] === v ? { klasse: 'på' } : {});
    linje.append(el('div', { klasse: 'rad faner' }, ...FANER.map(([k, t]) => valg('fane', k, t))));
    const gv = (k, liste) => rad(...liste.map(t => knapp(BS.NYE[t].kort === 'Hel' ? BS.NYE[t].navn : BS.NYE[t].navn, velg(k, t), { ...(grunn(V[k]) === t ? { klasse: 'på' } : {}), title: BS.NYE[t].tekst || '' })));
    if (V.fane === 'vegg') linje.append(rad(...STOFF.map(([k, t]) => valg('stoff', k, t)), el('span', { style: 'width:8px' }), ...VARIANT.map(([k, t]) => valg('variant', k, t))));
    if (V.fane === 'gulv') linje.append(gv('gulv', ['bs_fundament', 'bs_tregulv', 'bs_betongdekke']));
    if (V.fane === 'tak') linje.append(gv('tak', ['bs_tak_sal', 'bs_tak_flatt', 'bs_tak_betong', 'bs_tak_blikk']));
    if (V.fane === 'bærende') linje.append(gv('bærende', ['bs_søyle_tre', 'bs_søyle_betong', 'bs_søyle_stål', 'bs_bjelke_tre', 'bs_bjelke_stål']));
    if (V.fane === 'trapp') linje.append(gv('trapp', ['bs_trapp', 'bs_trapp_betong']));
    // (B5) maskiner, lys og lager inni (spill/fabrikk.js / fabrikk-visning.js)
    if (V.fane === 'maskin') linje.append(gv('maskin', ['bs_sagbenk', 'bs_høvel', 'bs_vedkløyver', 'bs_fyrkjele', 'bs_lysrør', 'bs_lyskaster', 'bs_hylle', 'bs_pall']));
    if (V.fane === 'forsvar') linje.append(rad(...['bs_palisade', 'bs_mur', 'bs_voll', 'bs_piggtråd'].map(t => knapp(D[t].kort, velg('forsvar', t), grunn(V.forsvar) === t ? { klasse: 'på' } : {}))));
    if (V.fane === 'hus') { linje.append(rad(...Object.entries(BS.HUS).map(([k, M]) => valg('hus', k, M.navn)), ...egneMaler().map((M, k) => valg('hus', 'egen:' + k, M.navn))));
      linje.append(rad(knapp(V.malValg ? 'Trykk to hjørner rundt bygget …' : 'Lagre et bygg som mal', () => { V.malValg = !V.malValg; A = null; B = null; forslag = []; oppdater(); }, { id: 'bs-lagremal', ...(V.malValg ? { klasse: 'på' } : {}) }))); }
    if (V.fane === 'plan') { const m = planModell(); linje.append(rad(...(m ? m.etasjer : []).map(e => knapp(e.loft ? 'Loft' : e.n + '. etasje', () => { V.planE = e.n; visLinje(); skitten = true; }, V.planE === e.n ? { klasse: 'på', 'data-etg': e.n } : { 'data-etg': e.n }))));
      if (!m) linje.append(el('small', {}, 'Ingen egne bygg med gulv ennå.')); }
    // stoffet og prisen for delen som er valgt (pris og tid etter stoffet, Claudes tall)
    const tn = typeNå(); if (tn && V.fane !== 'riv' && V.fane !== 'hus' && V.fane !== 'plan') linje.append(el('small', { klasse: 'pris' }, `${D[tn].navn}: ${prisTekst(tn)}` + (!['forsvar', 'trapp', 'maskin', 'lampe', 'lager'].includes(D[tn].kat) ? ' · ' + stoffTekst(D[tn].stoff === 'tak' ? 'tre' : D[tn].stoff) : '')));
    linje.append(el('div', { klasse: 'tekst' }, tekst || hjelp()), advarsel ? el('small', { klasse: 'advarsel' }, advarsel) : '', ekstra ? el('small', {}, ekstra) : '');
    const ok = forslag.filter(q => !q.feil), mangler = matMangler(), knp = [];
    if (V.fane === 'maskin' && BS.TING({ type: typeNå() })) knp.push(knapp(`Flyt mot ${['øst', 'nord', 'vest', 'sør'][V.rot % 4]}`, () => { V.rot = (V.rot + 1) % 4; oppdater(); }, { title: 'Retningen tømmeret går gjennom maskinen: innmating → utmating (R)' }));
    if (V.fane === 'tak' && grunn(V.tak) === 'bs_tak_sal' || V.fane === 'hus' || V.fane === 'trapp') knp.push(knapp(V.fane === 'hus' ? '⟳ Snu' : V.fane === 'trapp' ? `Opp mot ${['øst', 'nord', 'vest', 'sør'][V.rot % 4]}` : `Møne: ${['auto', 'langs x', 'langs y'][V.rot]}`, () => { V.rot = (V.rot + 1) % (V.fane === 'tak' ? 3 : 4); oppdater(); }));
    if (['vegg', 'gulv', 'tak', 'bærende', 'trapp', 'maskin'].includes(V.fane)) knp.push(knapp(`${V.fane === 'tak' ? 'Over etasje' : 'Etasje'}: ${V.nivå === 'auto' ? 'auto' : V.nivå + 1}`, () => { V.nivå = V.nivå === 'auto' ? 0 : V.nivå >= BS.ETASJER - 1 ? 'auto' : V.nivå + 1; oppdater(); }, { title: 'Auto: delen legger seg i neste ledige etasje (høyst fire)' }));
    if (['vegg', 'gulv', 'tak', 'forsvar'].includes(V.fane) || (V.fane === 'bærende' && /bjelke/.test(V.bærende))) knp.push(knapp(V.nett === 4 ? 'Rutenett: hall 4,8 m' : 'Rutenett: 1,2 m', () => { V.nett = V.nett === 4 ? 1 : 4; A = null; B = null; forslag = []; oppdater(); }, { id: 'bs-nett', title: 'Hallrutenettet (4,8 m) legger store deler med ett trykk' }));
    if (V.fane === 'riv') { if (ok.length) knp.push(knapp(`Riv ${ok.length} (+${LB.kroner(rivPenger())})`, () => riv(), { id: 'bs-riv' })); }
    else if (ok.length) { knp.push(knapp(`Bygg ${ok.length > 1 ? ok.length + ' deler' : ''} (${LB.kroner(sum().pris)})`.replace('  ', ' '), () => bekreft(false), { id: 'bs-bygg', ...(mangler ? { disabled: '' } : {}) }));
      if (mangler) knp.push(knapp(`Kjøp materialene (${LB.kroner(mangler)}) og bygg`, () => bekreft(true), { id: 'bs-kjop' })); }
    if (A) knp.push(knapp('Nullstill', () => { A = null; B = null; forslag = []; oppdater(); }));
    knp.push(knapp('Lukk', () => lukk()));
    linje.append(rad(...knp));
  }
  function hjelp() {
    if (V.fane === 'riv') return 'Trykk på en del for å rive den, eller trykk to hjørner for alt mellom.';
    if (V.fane === 'plan') return 'Plantegningen av byggene dine: velg etasje. Rommene, dørene, trappene og søylene vises.';
    if (V.fane === 'hus') return V.malValg ? 'Trykk to hjørner rundt bygget du vil lagre som mal.' : `Trykk der ${malNå().navn.toLowerCase()} skal stå (nederste venstre hjørne). «Snu» flytter døra.`;
    const t = typeNå(), K = D[t].kat;
    if (K === 'maskin' || K === 'lager') return `${D[t].navn}: trykk der den skal stå – på gulvet i et rom eller en hall${D[t].tung ? ' (betonggulv)' : ''}. «Flyt mot» snur den (R).`;
    if (K === 'lampe') return `${D[t].navn}: trykk en rute i rommet, og et punkt til for en lampe hver 4,8 m.`;
    if (K === 'søyle') return `${D[t].navn}: trykk et hjørne i rutenettet, og et punkt til for en søylerad (hver 4,8 m).`;
    if (K === 'trapp') return `${D[t].navn}: trykk der foten skal stå (på gulvet). Den går 3,6 m opp mot ${['øst', 'nord', 'vest', 'sør'][V.rot % 4]}.`;
    return K === 'gulv' || K === 'tak' ? `${D[t].navn}: trykk en rute, og et punkt til for et rektangel.` : `${D[t].navn}: trykk ved en kant, og et punkt til for en rad (to hjørner: rundt).`;
  }
  function åpne() { V.åpen = true; if (window.lukkPanel) lukkPanel(); LB && window.LeirSpill && LeirSpill.avbryt && LeirSpill.avbryt(); const m = document.getElementById('leirmeny'); if (m && m.classList.contains('på')) document.getElementById('leirknapp').click(); A = null; B = null; forslag = []; opphav(); visLinje(); skitten = true; }
  function lukk() { V.åpen = false; A = null; B = null; forslag = []; visLinje(); skisse3d(); skitten = true; }
  // knappen i Leir-menyen
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e2, knapp: k2 }) => {
    const R = romNå(), senger = R.reduce((s, r) => s + r.senger, 0);
    hode.appendChild(e2('h3', {}, 'Byggesett'));
    hode.appendChild(e2('div', { klasse: 'igang' }, 'Bygg selv av deler på et rutenett på 1,2 m (haller på 4,8 m): gulv, vegger i tre, mur, betong eller blikk med dør og vindu, tak, søyler, bjelker og trapper i opptil fire etasjer. Lukkede rom med dør blir egenbygde brakker med senger.'));
    if (R.length) hode.appendChild(e2('div', { klasse: 'igang' }, `${R.length} rom: ` + R.map(r => `${r.navn.toLowerCase()} ${String(r.areal).replace('.', ',')} m²${r.senger ? ` (${r.senger} senger)` : ''}`).join(', ') + (senger ? '' : '')));
    // ROMTYPER: velg hva hvert lukkede rom med dør skal brukes til (soverom, kjøkken, lager, verksted)
    for (const r of R.filter(q => q.brukbart)) { const B = BS.ROMBRUK[r.bruk];
      hode.appendChild(e2('div', { klasse: 'mat' }, e2('em', { style: 'flex:1;font-style:normal' }, `Rom ${String(r.areal).replace('.', ',')} m²: `), k2(`${B.navn} ›`, () => byttBruk(r.nøkkel), { 'data-rom': r.nøkkel, title: 'Bytt hva rommet brukes til' }),
        e2('small', {}, ' ' + (r.bruk === 'soverom' ? `${r.senger} senger` : r.bruk === 'lager' ? `+${String(r.lager).replace('.', ',')} m³ lagerplass` : r.virker ? B.tekst : `for lite: trenger ${B.min} m²`)))); }
    hode.appendChild(e2('div', { klasse: 'mat' }, k2('Åpne byggesettet', åpne, { id: 'bs-apne' })));
  });

  // ---------- kostnad ----------
  const sum = () => { const ut = { pris: 0, timer: 0, mat: {} };
    for (const q of forslag) { if (q.feil) continue; const k = LB.kostnad(q.d.type, 0, bonus()); ut.pris += k.pris; ut.timer += k.timer; for (const [m, v] of Object.entries(k.mat)) ut.mat[m] = Math.round(((ut.mat[m] || 0) + v) * 10) / 10; }
    return ut; };
  const matMangler = () => { const l = L(); if (!l || V.fane === 'riv') return 0; return LB.manglerPris ? LB.manglerPris(l, sum().mat) : Object.entries(sum().mat).reduce((s, [k, v]) => s + Math.max(0, v - (l.lager[k] || 0)) * LB.MATERIALER[k].pris, 0); };
  const matTekst = mat => Object.entries(mat || {}).filter(([, v]) => v > 0).map(([k, v]) => `${String(v).replace('.', ',')} ${LB.MATERIALER[k].enhet} ${LB.MATERIALER[k].navn.toLowerCase()}`).join(', ');
  const tidTekst = min => (min >= 60 ? `${(min / 60).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} t` : `${Math.ceil(min)} min`);
  function rivPenger() { const l = L(); return forslag.filter(q => !q.feil).reduce((s, q) => { const b = LB.finn(l, q.d.id); return s + (b ? Math.round(b.pris * (b.igjen > 0 ? LB.REGLER.rivUferdig : LB.REGLER.rivFerdig)) : 0); }, 0); }

  // ---------- plassering ----------
  // Kartet for delene: klasse (vann), hus og høyde i én henting for hele raden (som kartFor i leir-visning.js)
  async function kartFor(punkter) {
    if (!punkter.length) return {}; const xs = punkter.map(p => p[0]), ys = punkter.map(p => p[1]), bb = [Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20];
    let kv = null, hv = null; try { [kv, hv] = await Promise.all([lagVindu(bb, false), lagVindu(bb, false, 11)]); } catch (e) { /* uten kart */ }
    const klasse = (x, y) => { if (!kv) return 2; const [i, j] = Terreng.rute(kv, x, y); return i >= 0 && j >= 0 && i < kv.w && j < kv.h ? kv.K[j * kv.w + i] : 255; };
    const høyde = (x, y) => { if (!hv) return null; const fx = (x - hv.x0) / hv.r - .5, fy = (hv.y0 - y) / hv.r - .5, i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
      if (i < 0 || j < 0 || i + 1 >= hv.w || j + 1 >= hv.h) return null; const Hh = (ii, jj) => hv.H[jj * hv.w + ii];
      const z = Hh(i, j) * (1 - a) * (1 - b) + Hh(i + 1, j) * a * (1 - b) + Hh(i, j + 1) * (1 - a) * b + Hh(i + 1, j + 1) * a * b; return z === z ? z : null; };
    // husene fra kartet (forlatte hus): én sjekk per 2,4 m-rute
    const hus = new Set(), sett = new Set();
    await Promise.all(punkter.map(async ([x, y]) => { const k = Math.round(x) + ',' + Math.round(y); if (sett.has(k)) return; sett.add(k);
      try { const h = typeof finnBygg === 'function' ? await finnBygg(x, y) : null; if (h && pip(h.P, x, y)) hus.add(k); } catch (e) { /* ingen husdata */ } }));
    // (R17 funn 12) vegene i kartet (LeirSpill.kartveger) – delene kan ikke stå på en bilveg
    let veger = null; try { veger = window.LeirSpill && LeirSpill.kartveger ? await LeirSpill.kartveger(punkter) : null; } catch (e) { veger = null; }
    return { klasse, høyde, veger, iHus: (x, y) => hus.has(Math.round(x) + ',' + Math.round(y)) };
  }
  const pip = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; };
  const somBygg = (o, d) => ({ type: d.type, ...BS.midt(o, d) });
  // Regner ut hva som legges (eller rives) for trykkene A og B, og sjekker kartet
  async function oppdater() {
    const nr = ++teller, o = opphav(), l = L(); tekst = ''; ekstra = ''; advarsel = '';
    if (!o || !l || !A || V.fane === 'plan') { forslag = []; visLinje(); skisse3d(); skitten = true; return; }
    const alle = deler();
    // eget bygg som mal: delene i rektangelet mellom to trykk
    if (V.fane === 'hus' && V.malValg) { if (!B) { tekst = 'Trykk det andre hjørnet.'; forslag = []; visLinje(); skitten = true; return; }
      const valgt = rivValg(alle, o), nr = valgt.length ? lagreMal(valgt, `Eget bygg ${egneMaler().length + 1}`) : null; V.malValg = false; A = null; B = null; forslag = [];
      if (nr !== null) { V.hus = 'egen:' + nr; logg(`Byggesettet: ${egneMaler()[nr].navn} lagret som mal (${valgt.length} deler).`); } else logg('Byggesettet: ingen deler der – ingen mal lagret.');
      visLinje(); skitten = true; return; }
    if (V.fane === 'riv') forslag = rivValg(alle, o).map(d => ({ d }));
    else if (V.fane === 'hus') { const [i, j] = BS.celle(o, A[0], A[1]); forslag = BS.husForslag(alle, malNå(), i, j, V.rot).map(q => ({ ...q, d: q.d || { ...q.slot, type: q.type, n: q.slot.n || 0 } })); }
    else { const t = typeNå(), r = V.fane === 'tak' && V.rot ? V.rot - 1 : V.fane === 'trapp' || V.fane === 'maskin' ? V.rot % 4 : undefined;
      forslag = BS.forslag(alle, t, BS.rad(o, t, A, B, { r }), { nivå: V.nivå, r: V.fane === 'tak' ? r : undefined }).map(q => ({ ...q, d: q.d || { ...q.slot, type: t, n: 0, s: D[t].s } })); }
    visLinje(); skisse3d(); skitten = true;
    if (V.fane !== 'riv') {
      const ok = forslag.filter(q => !q.feil), pkt = ok.flatMap(q => [...LB.hjørner(somBygg(o, q.d)), [BS.midt(o, q.d).x, BS.midt(o, q.d).y]]);
      const v = await kartFor(pkt); if (nr !== teller) return; kart = v;
      for (const q of ok) { const f = LB.kanBygge(l, somBygg(o, q.d), v); if (f) q.feil = f; }
      // (B5) en maskin: veien til bruksplassen (feil) og «ikke under tak» (advarsel) – spill/fabrikk-visning.js
      if (window.FabrikkSpill && V.fane === 'maskin') FabrikkSpill.sjekkForslag(alle, forslag, o, l);
      // (runde 8) et ferdig hus står på én felles grunnmur: hele huset sjekkes som ett bygg (samme regel som leirens bygg, Leir.BRATT eller
      // 35 % av diagonalen) – før kunne hver del godtas for seg, og en hytte i en bratt li fikk en mange meter høy sokkel
      const hel = forslag.filter(q => !q.feil);
      if (V.fane === 'hus' && hel.length && v.høyde) { const P = hel.flatMap(q => LB.hjørner(somBygg(o, q.d))), hz = P.map(([x, y]) => v.høyde(x, y)).filter(z => z !== null && z === z);
        const xs = P.map(p => p[0]), ys = P.map(p => p[1]), diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), d = hz.length > 1 ? Math.max(...hz) - Math.min(...hz) : 0;
        if (d > Math.max(LB.BRATT, .35 * diag)) for (const q of hel) q.feil = `For bratt for huset (${Math.round(d)} m høydeforskjell under det).`; }
    }
    const ok = forslag.filter(q => !q.feil), feil = forslag.filter(q => q.feil), s = sum();
    if (V.fane === 'riv') { tekst = ok.length ? `Riv ${ok.length} ${ok.length === 1 ? D[ok[0].d.type].navn.toLowerCase() : 'deler'}.` : 'Ingen deler her.';
      // (B4) river du noe som bærer, sier byggesettet fra om det som raser (samme regel som husene i kartet)
      try { const r = ok.length ? BS.rasVedRiving(alle, new Set(ok.map(q => q.d.id))) : null; if (r) advarsel = `Uten ${ok.length === 1 ? 'denne delen' : 'disse delene'} raser dekket eller taket over (ca. ${r.m2} m²) – rives sammen med det.`; } catch (e) { /* uten Bygning */ } }
    else if (!ok.length) tekst = feil.length ? feil[0].feil : 'Ingenting å bygge her.';
    else { const n = ok.length, navn = V.fane === 'hus' ? malNå().navn : D[ok[0].d.type].navn, erTak = D[ok[0].d.type].kat === 'tak' || D[ok[0].d.type].kat === 'gulv' && ok[0].d.n > 0;
      // etasjen: vegger og gulv står i etasje n + 1, taket ligger oppå etasje n
      const etg = [...new Set(ok.map(q => (erTak ? q.d.n : q.d.n + 1)))].sort().join('/') + '. etasje';
      tekst = `${navn}${V.fane === 'hus' ? ` (${n} deler)` : n > 1 ? ` × ${n}` : ''}: ${LB.kroner(s.pris)}, ${tidTekst(s.timer * 60)} arbeid` + (V.fane !== 'hus' && V.fane !== 'forsvar' ? ` (${erTak ? 'oppå ' : ''}${etg})` : '')
        + (ok.some(q => q.bytt) ? ` – bytter ut ${ok.filter(q => q.bytt).length}` : '') + '.';
      // utpost: byggelaget må reise dit først (Leir.reise, brukeren 12. nov) – si det før du bekrefter
      const sted = BS.midt(o, ok[0].d), rs = LB.reise ? LB.reise(l, sted.x, sted.y) : null;
      const m = matMangler(); ekstra = [rs && rs.full > 0 ? LB.reiseTekst(rs) : null, matTekst(s.mat) ? `Materialer: ${matTekst(s.mat)}` + (m ? ` – mangler for ${LB.kroner(m)}` : '') : 'Ingen materialer', feil.length ? `${feil.length} får ikke plass (rødt): ${feil[0].feil}` : null, B ? null : 'Trykk et punkt til for en rad.'].filter(Boolean).join(' · '); }
    // F1 (veien, spill/vei.js): et rom som blir lukket uten dør, eller som ingen vei går inn til, sies fra om (som de andre grunnene)
    if (V.fane !== 'riv' && ok.length && window.Vei) advarsel = veiTekst(alle, ok, o, l) || '';
    if (V.fane === 'maskin' && ok.some(q => q.advarsel)) advarsel = [advarsel, ok.find(q => q.advarsel).advarsel].filter(Boolean).join(' ');
    visLinje(); skisse3d(); skitten = true;
  }
  // F1: rommene som ikke nås (Vei.romUtenVei) før og etter forslaget; de nye gir teksten «Rommet på 23 m² har ingen dør …».
  // Alle delene regnes som ferdige (det er planen som sjekkes). Kartet for delene som står, huskes til de endres.
  let veiFør = null;
  function veiRom(deler, o, l) { const S = spill(), st = S && S.leir ? [S.leir.x, S.leir.y] : [o.ox, o.oy];
    const K = Vei.lag({ deler: deler.map(d => ({ ...d, ferdig: true })), leir: l, opphav: o, start: st, prøve: true });
    return Vei.romUtenVei(K, { minAreal: 2 }); }
  function veiTekst(alle, ok, o, l) {
    try { const nøkkel = alle.map(d => d.type + d.i + ',' + d.j + d.a + d.n).join('|');
      if (!veiFør || veiFør.nøkkel !== nøkkel) veiFør = { nøkkel, rom: veiRom(alle, o, l) };
      const bytt = new Set(ok.filter(q => q.bytt).map(q => q.bytt)), nye = [...alle.filter(d => !bytt.has(d.id)), ...ok.map((q, k) => ({ ...q.d, id: 'ny' + k }))];
      const før = veiFør.rom.map(r => r.e + ':' + Math.round(r.x) + ',' + Math.round(r.y) + ':' + r.ruter), R = veiRom(nye, o, l).filter(r => !før.includes(r.e + ':' + Math.round(r.x) + ',' + Math.round(r.y) + ':' + r.ruter));
      if (!R.length) return null; const r = R[0], navn = `rommet på ${Math.round(r.areal)} m²${r.e > 1 ? ' i ' + r.e + '. etasje' : ''}`, fler = R.length > 1 ? ` (og ${R.length - 1} rom til)` : '';
      if (r.grunn === 'rommet har ingen dør') return `R${navn.slice(1)} har ingen dør – ingen kommer inn (sett inn en dør)${fler}.`;
      if (r.grunn === 'døra er låst') return `Døra til ${navn} er låst${fler}.`;
      return `Ingen vei inn til ${navn}${fler}.`;
    } catch (e) { return null; } }
  window.ByggesettVei = { tekst: () => advarsel, sjekk: veiTekst };
  // Delene som rives: den øverste nær trykket, eller alt i rektangelet mellom to trykk
  function rivValg(alle, o) {
    if (!B) { let best = null, bd = 1.6;
      for (const d of alle) { const m = BS.midt(o, d), h = (d.s || 1) * G / 2, ting = BS.TING && BS.TING(d), [fw, fh] = ting ? BS.fotRuter(d) : [0, 0];
        // (B5) en maskin eller hylle: trykket et sted på fotavtrykket velger den (foran gulvet og taket)
        if (ting && Math.abs(m.x - A[0]) < fw * G / 2 && Math.abs(m.y - A[1]) < fh * G / 2) { if (.2 < bd) { bd = .2; best = d; } continue; }
        const inne = BS.RUTE(d) && Math.abs(m.x - A[0]) < h && Math.abs(m.y - A[1]) < h;
        const dd = (inne ? .5 : Math.hypot(m.x - A[0], m.y - A[1]) - (BS.KANT(d) ? .3 + (d.s - 1) * G / 2 : 0)) - d.n * .01 - (BS.kat(d) === 'søyle' || BS.kat(d) === 'bjelke' ? .2 : 0); if (dd < bd) { bd = dd; best = d; } }
      return best ? [best] : []; }
    const x0 = Math.min(A[0], B[0]) - .3, x1 = Math.max(A[0], B[0]) + .3, y0 = Math.min(A[1], B[1]) - .3, y1 = Math.max(A[1], B[1]) + .3;
    return alle.filter(d => { const m = BS.midt(o, d); return m.x > x0 && m.x < x1 && m.y > y0 && m.y < y1; });
  }
  function trykk(X, Y) {
    if (!V.åpen || !L()) return false;
    if (V.fane === 'plan') return false;
    if (!A || B || (V.fane === 'hus' && !V.malValg) || V.fane === 'trapp' || (V.fane === 'maskin' && BS.TING({ type: typeNå() }))) { A = [X, Y]; B = null; } else B = [X, Y];
    oppdater(); return true;
  }
  // KOMMANDOLAGET (R17-4): byggingen, rivingen og kjøpet går gjennom window.KOMMANDO (spill/kommandoer.js); svaret er det regelfunksjonen
  // ga, eller { feil } når kommandoen ble avvist før den kom så langt
  const kom = k => { const r = window.KOMMANDO ? KOMMANDO(k) : { ok: false, feil: 'Kommandolaget mangler.' }; return r.svar != null ? r.svar : r.ok ? r.svar : { feil: r.feil }; };
  // Kjøper det som mangler av materialene, gir true når alt finnes
  function kjøpManglende(mat) { const l = L(); for (const [k, v] of Object.entries(mat || {})) { const m = Math.ceil((v - (l.lager[k] || 0)) * 10) / 10; if (m > 0) { const r = kom({ type: 'kjøpMateriale', materiale: k, mengde: m }); if (r.feil) { logg(r.feil); return false; } } } return true; }
  function bekreft(kjøp) {
    const l = L(), o = opphav(); if (!l || V.fane === 'riv') return 0; const ok = forslag.filter(q => !q.feil); if (!ok.length) return 0;
    // (runde 8) det materialene kostet, står også i loggen (før sa den bare arbeidet, mens knappen sa prisen i alt)
    const før = OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : 0;
    if (kjøp && !kjøpManglende(sum().mat)) { oppdater(); return 0; }
    const kjøpt = kjøp ? Math.max(0, før - (OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : 0)) : 0;
    let n = 0, pris = 0, stopp = null;
    for (const q of ok) {
      if (q.bytt) kom({ type: 'riv', bygg: q.bytt });   // (riv gir pengene tilbake når det gikk)
      // delens plass i rutenettet (bs) følger med kommandoen og settes på bygget
      const r = kom({ type: 'bygg', bygg: somBygg(o, q.d), kart: kart || {}, bs: BS.plassFor(q.d) });
      if (r.feil) { stopp = r.feil; break; }
      n++; pris += r.bygg.pris;
    }
    if (n) { const lag = LB.byggelag(l); logg(`Byggesettet: ${n} ${n === 1 ? 'del' : 'deler'} bestilt for ${kjøpt ? `${LB.kroner(pris + kjøpt)} i alt (${(LB.PRISDEL || {}).navn || 'utstyr og deler'} ${LB.kroner(pris)} + materialer ${LB.kroner(kjøpt)})` : LB.kroner(pris)}` + (LB.jobber(l).length > lag ? ` – ${lag} byggelag tar dem etter tur.` : '.') + (stopp ? ` Resten venter: ${stopp}` : '')); }
    else if (stopp) logg(stopp);
    ferdigEndret(); if (V.fane === 'hus' || !stopp) { A = null; B = null; forslag = []; } oppdater(); return n;
  }
  function riv() {
    const l = L(); let n = 0, penger = 0, rast = 0;
    // det som ville rast (BS.rasVedRiving), rives med – ingen deler blir stående i lufta
    let ras = null; try { ras = BS.rasVedRiving(deler(), new Set(forslag.map(q => q.d.id))); } catch (e) { ras = null; }
    for (const q of forslag) { const r = kom({ type: 'riv', bygg: q.d.id }); if (r.feil) continue; penger += r.penger; n++; }
    if (ras) for (const id of ras.ider) { const r = kom({ type: 'riv', bygg: id }); if (r.feil) continue; penger += r.penger; rast++; }
    if (n) logg(`Byggesettet: ${n} ${n === 1 ? 'del' : 'deler'} revet, ${LB.kroner(penger)} tilbake.` + (rast ? ` ${rast} ${rast === 1 ? 'del' : 'deler'} over raste og ble tatt ned.` : ''));
    ferdigEndret(); A = null; B = null; forslag = []; oppdater(); return n;
  }
  function ferdigEndret() { LeirSpill.lagre(); if (LeirSpill.oppdater3d) LeirSpill.oppdater3d(true); lag3d(); LeirSpill.visMeny && LeirSpill.visMeny(); skitten = true; }
  KROKER.trykk.unshift(trykk); KROKER.trykk3d.unshift((X, Y) => { if (!V.åpen) return false; const p = pek3d(); return trykk(p ? p[0] : X, p ? p[1] : Y); });
  // i 3D treffer trykket også delene (en vegg eller et tak), ikke bare bakken: siste pekerposisjon over 3D-lerretet
  let sistPek = null; window.addEventListener('pointerup', e => { sistPek = [e.clientX, e.clientY]; }, true);
  function pek3d(pek = sistPek, medBakken) {
    const R = r3(); if (!R || !R.ut || !pek || (!mesh.length && !medBakken)) return null; const r = R.c3.getBoundingClientRect();
    R.ray.setFromCamera(new THREE.Vector2((pek[0] - r.left) / r.width * 2 - 1, -(pek[1] - r.top) / r.height * 2 + 1), R.cam);
    const hit = R.ray.intersectObjects([R.mesh, ...mesh])[0]; if (!hit) return null;
    // litt inn i veggen (punktet på veggflaten ligger en halv veggtykkelse fra kanten)
    const n = hit.face ? hit.face.normal : null, inn = n && Math.abs(n.z) < .5 ? .1 : 0;
    return [R.ut.cx + hit.point.x - (n ? n.x * inn : 0), R.ut.cy + hit.point.y - (n ? n.y * inn : 0)];
  }
  // med mus: etter første trykk følger raden pekeren (som å dra en linje) til du trykker igjen
  let svev = 0;
  window.addEventListener('pointermove', e => {
    if (!V.åpen || !A || B || V.fane === 'hus' || V.fane === 'trapp' || V.fane === 'plan' || V.fane === 'maskin' || e.pointerType !== 'mouse' || e.buttons || performance.now() - svev < 150) return;
    const p3 = typeof på3d !== 'undefined' && på3d, mål = e.target && e.target.id; if (mål !== (p3 ? 'c3' : 'c') && !(p3 && mål === 'c3o')) return;
    let P = null; if (p3) P = pek3d([e.clientX, e.clientY], true); else { const r = cv.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top; P = [kam.x + (cx - VW / 2) * kam.m, kam.y - (cy - VH / 2) * kam.m]; }
    // oppdater() leser B før den venter på kartet: B settes bare så lenge forslaget regnes ut
    if (!P || Math.hypot(P[0] - A[0], P[1] - A[1]) < G * .6) return; svev = performance.now(); B = P; oppdater(); B = null;
  }, { passive: true });
  window.addEventListener('keydown', e => {
    if (!V.åpen || (r3() && R3.fot) || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    const k = e.key.toLowerCase();
    if (k === 'enter') { bekreft(matMangler() > 0); e.preventDefault(); } else if (k === 'escape') { if (A) { A = null; B = null; forslag = []; oppdater(); } else lukk(); e.preventDefault(); }
    else if (k === 'r') { V.rot = (V.rot + 1) % (V.fane === 'tak' ? 3 : 4); oppdater(); e.preventDefault(); }
  });

  // ---------- ferdig bygget: samlet melding, nye rom ----------
  let uferdige = null, romFør = null;
  KROKER.sim.push(() => {
    const l = L(); if (!l) return;
    const n = l.bygg.filter(b => D[b.type] && b.igjen > 0).length;
    if (uferdige !== null && n < uferdige) { if (!n) logg('Byggesettet: alle delene er ferdige.');
      const R = BS.rom(deler()), før = romFør || [];
      for (const r of R) if (!før.some(q => q.etasje === r.etasje && q.celler.some(c => r.celler.some(d => d[0] === c[0] && d[1] === c[1])))) logg(`Nytt rom: ${r.navn.toLowerCase()} på ${String(r.areal).replace('.', ',')} m²${r.senger ? ` med ${r.senger} senger` : r.brukbart ? '' : ' – sett inn en dør'}.`);
      romFør = R; }
    if (romFør === null) romFør = BS.rom(deler());
    uferdige = n;
  });

  // ---------- kartet (2D) ----------
  const FARGE = { tre: '#8a3428', betong: '#9a9890', stein: '#9a5a44', tak: '#3a3b3d', jord: '#6b6a3a', stål: '#9ba1a4', blikk: '#7f8a90' };
  const GULV = { bs_fundament: '#8f8d87', bs_tregulv: '#8a7457', bs_betongdekke: '#9d9b94' };
  Object.keys(D).forEach(t => { if (D[t].kat === 'gulv' && !GULV[t]) GULV[t] = GULV[D[t].grunn] || '#8f8d87'; });
  // ---------- plantegningen (fanen Plan): Bygning.fraByggesett -> Plantegning.figur, én etasje om gangen ----------
  let planHusk = null;
  function planModell() {
    const dl = deler(), o = opphav(); if (!window.Bygning || !o || !dl.length) return null; const n = dl.map(d => d.type + d.i + ',' + d.j + d.a + d.n + (d.ferdig ? 'f' : '')).join('|');
    if (!planHusk || planHusk.n !== n) { let m = null; try { m = Bygning.fraByggesett(dl.map(d => ({ ...d, ferdig: true })), o); } catch (e) { m = null; } planHusk = { n, m }; }
    return planHusk.m;
  }
  function tegnPlan(g, sx, sy, m) {
    const M = planModell(); if (!M || !window.Plantegning) return; const e = M.etasjer.find(q => q.n === V.planE) || M.etasjer[0]; if (!e) return; V.planE = e.n;
    const F = Plantegning.figur(M, e.n), P = (p) => [sx(p[0]), sy(p[1])];
    g.save(); g.fillStyle = 'rgba(10,12,14,.55)'; const bb = M.P.map(P), x0 = Math.min(...bb.map(p => p[0])) - 30, y0 = Math.min(...bb.map(p => p[1])) - 30, x1 = Math.max(...bb.map(p => p[0])) + 30, y1 = Math.max(...bb.map(p => p[1])) + 30;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (const r of F.rom) { g.beginPath(); r.P.forEach((p, k) => { const q = P(p); if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = 'rgba(214,196,150,.16)'; g.fill(); }
    for (const t of F.trapper) { g.beginPath(); t.P.forEach((p, k) => { const q = P(p); if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = 'rgba(160,130,90,.6)'; g.fill(); g.strokeStyle = '#f2ead6'; g.lineWidth = 1; g.stroke();
      const c = P([t.x, t.y]); g.fillStyle = '#f2ead6'; g.font = '11px sans-serif'; g.textAlign = 'center'; g.fillText(t.opp ? 'opp' : 'ned', c[0], c[1] + 4); }
    for (const w of F.vegger) { g.strokeStyle = w.revet ? 'rgba(240,215,154,.3)' : w.type === 'skille' ? '#d9cfb4' : '#f2ead6'; g.lineWidth = Math.max(2, w.tykk / m); g.lineCap = 'square';
      for (const [a, b] of w.biter) { const p = P(a), q = P(b); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } }
    for (const o of F.åpninger) { const a = P([o.x - o.ux * o.b / 2, o.y - o.uy * o.b / 2]), b = P([o.x + o.ux * o.b / 2, o.y + o.uy * o.b / 2]);
      g.strokeStyle = o.type === 'vindu' ? '#bcd6e6' : o.type === 'port' ? 'rgba(220,220,220,.7)' : '#e8a35a'; g.lineWidth = o.type === 'vindu' ? Math.max(1.5, .06 / m) : 1.5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    for (const q of F.søyler) { const p = P([q.x, q.y]), r = Math.max(2.5, .17 / m); g.fillStyle = '#c9ccce'; g.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r); }
    g.setLineDash([6, 3]); for (const q of F.bjelker) { const a = P(q.a), b = P(q.b); g.strokeStyle = '#c9ccce'; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.setLineDash([]);
    g.font = '12px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3;
    for (const r of F.rom) { const p = P([r.x, r.y]), t = `${r.navn || 'Rom'} · ${String(r.areal).replace('.', ',')} m²`; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#f2ead6'; g.strokeText(t, p[0], p[1]); g.fillText(t, p[0], p[1]); }
    const t0 = `${e.loft ? 'Loft' : e.n + '. etasje'} · ${F.rom.length} rom`; g.textAlign = 'left'; g.strokeText(t0, x0 + 6, y0 + 16); g.fillText(t0, x0 + 6, y0 + 16);
    g.restore();
  }
  KROKER.tegn.push((g, vx0, vy1) => {
    const l = L(), o = l && l.byggesett; if (!l || (!o && !V.åpen)) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    const alle = deler(), syn = d => { const p = BS.midt(o, d); const x = sx(p.x), y = sy(p.y); return x > -40 && y > -40 && x < VW + 40 && y < VH + 40; };
    // rutenettet mens verktøyet er på (når rutene er minst 7 px)
    // (B4) 1,2 m-ruter, hver fjerde linje sterkere (4,8 m); i hallrutenettet bare 4,8 m-linjene
    const GS = G * (V.nett === 4 ? 4 : 1);
    if (V.åpen && o && GS / m >= 6) { g.save(); g.lineWidth = 1; const x0 = vx0, x1 = vx0 + VW * m, y1 = vy1, y0 = vy1 - VH * m;
      for (let i = Math.ceil((x0 - o.ox) / GS); o.ox + i * GS < x1; i++) { const x = sx(o.ox + i * GS); g.strokeStyle = (V.nett === 4 || i % 4 === 0) ? 'rgba(240,215,154,.24)' : 'rgba(240,215,154,.11)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, VH); g.stroke(); }
      for (let j = Math.ceil((y0 - o.oy) / GS); o.oy + j * GS < y1; j++) { const y = sy(o.oy + j * GS); g.strokeStyle = (V.nett === 4 || j % 4 === 0) ? 'rgba(240,215,154,.24)' : 'rgba(240,215,154,.11)'; g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke(); } g.restore(); }
    if (V.åpen && V.fane === 'plan') { tegnPlan(g, sx, sy, m); return; }
    const tegnDel = (d, skisse) => {
      if (!syn(d)) return; const K = D[d.type].kat, st = D[d.type].stoff, alfa = skisse ? 1 : d.ferdig ? 1 : .45, ds = d.s || D[d.type].s;
      g.save(); g.globalAlpha = alfa;
      // (B5) maskiner, lamper og hyller tegnes av spill/fabrikk-visning.js
      if (K === 'maskin' || K === 'lampe' || K === 'lager') { if (window.FabrikkSpill) FabrikkSpill.tegnDel(g, d, o, sx, sy, m, skisse); g.restore(); return; }
      if (K === 'trapp') { const R = BS.ruter(d), i0 = Math.min(...R.map(c => c[0])), j0 = Math.min(...R.map(c => c[1])), i1 = Math.max(...R.map(c => c[0])) + 1, j1 = Math.max(...R.map(c => c[1])) + 1;
        const x = sx(o.ox + i0 * G), y = sy(o.oy + j1 * G), w = (i1 - i0) * G / m, h = (j1 - j0) * G / m; g.fillStyle = skisse || (st === 'betong' ? '#a19f98' : '#9a7a52'); g.fillRect(x, y, w, h);
        if (!skisse) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; const lx = w > h; for (let k = 1; k < 12; k++) { g.beginPath(); if (lx) { g.moveTo(x + w * k / 12, y); g.lineTo(x + w * k / 12, y + h); } else { g.moveTo(x, y + h * k / 12); g.lineTo(x + w, y + h * k / 12); } g.stroke(); }
          const [di, dj] = [[1, 0], [0, 1], [-1, 0], [0, -1]][(d.r || 0) & 3], cx = x + w / 2, cy = y + h / 2, L = Math.max(w, h) * .38; g.strokeStyle = '#f2ead6'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - di * L, cy + dj * L); g.lineTo(cx + di * L, cy - dj * L); g.stroke();
          g.beginPath(); g.arc(cx + di * L, cy - dj * L, 3, 0, 6.283); g.fillStyle = '#f2ead6'; g.fill(); }
        g.restore(); return; }
      if (K === 'søyle') { const p = BS.midt(o, d), r = Math.max(2.5, .17 / m); g.fillStyle = skisse || FARGE[st] || '#9ba1a4'; g.fillRect(sx(p.x) - r, sy(p.y) - r, 2 * r, 2 * r); if (!skisse) { g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.strokeRect(sx(p.x) - r, sy(p.y) - r, 2 * r, 2 * r); } g.restore(); return; }
      if (K === 'bjelke') { const [[ax, ay], [bx, by]] = BS.kantEnder(o, d); g.strokeStyle = skisse || FARGE[st] || '#9ba1a4'; g.lineWidth = Math.max(2, .18 / m); g.setLineDash([6, 3]); g.beginPath(); g.moveTo(sx(ax), sy(ay)); g.lineTo(sx(bx), sy(by)); g.stroke(); g.restore(); return; }
      if (K === 'gulv' || K === 'tak') { const x = sx(o.ox + d.i * G), y = sy(o.oy + (d.j + ds) * G), s = ds * G / m;
        if (K === 'gulv') { g.fillStyle = skisse || GULV[d.type]; if (d.n > 0 && !skisse) g.globalAlpha *= .6; g.fillRect(x, y, s, s); if (!skisse && s > 10) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.strokeRect(x + .5, y + .5, s - 1, s - 1); } }
        else { g.fillStyle = skisse || 'rgba(40,40,42,.42)'; g.fillRect(x, y, s, s); if (!skisse) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath();
          if (D[d.type].grunn === 'bs_tak_sal') { for (let k = 1; k < 4; k++) { const f = k / 4; if (d.r === 1) { g.moveTo(x + f * s, y); g.lineTo(x + f * s, y + s); } else { g.moveTo(x, y + f * s); g.lineTo(x + s, y + f * s); } } }
          else { g.moveTo(x, y); g.lineTo(x + s, y + s); } g.stroke(); } }
      } else {
        const [[ax, ay], [bx, by]] = BS.kantEnder(o, d), px = [sx(ax), sy(ay)], qx = [sx(bx), sy(by)], tykk = Math.max(2, (D[d.type].grunn === 'bs_voll' ? 1.6 : D[d.type].grunn === 'bs_mur' ? .4 : .22) / m);
        g.strokeStyle = skisse || FARGE[st]; g.lineWidth = tykk; g.lineCap = 'square';
        const v = D[d.type].v, LL = ds * G, åpning = v === 'dør' ? Math.min(.8, 1 / LL) : v === 'port' ? Math.max(.5, (LL - .4) / LL) : v === 'vindu' ? Math.min(.7, 1.2 / LL) : 0, seg = (f0, f1) => { g.beginPath(); g.moveTo(px[0] + (qx[0] - px[0]) * f0, px[1] + (qx[1] - px[1]) * f0); g.lineTo(px[0] + (qx[0] - px[0]) * f1, px[1] + (qx[1] - px[1]) * f1); g.stroke(); };
        if (D[d.type].grunn === 'bs_piggtråd') { g.lineWidth = Math.max(1.2, .08 / m); g.setLineDash([3, 2]); seg(0, 1); }
        else if (D[d.type].grunn === 'bs_palisade' && !skisse && G / m > 7) { g.fillStyle = '#6e5b45'; const nn = Math.round(ds * 4); for (let k = 0; k < nn; k++) { const f = (k + .5) / nn; g.beginPath(); g.arc(px[0] + (qx[0] - px[0]) * f, px[1] + (qx[1] - px[1]) * f, Math.max(1.5, .14 / m), 0, 6.283); g.fill(); } }
        else if (!åpning || skisse) seg(0, 1);
        else { const a0 = .5 - åpning / 2, a1 = .5 + åpning / 2; seg(0, a0); seg(a1, 1);
          if (v === 'vindu') { g.strokeStyle = '#bcd6e6'; g.lineWidth = Math.max(1.5, tykk * .45); seg(a0, a1); } else if (v === 'port') { g.strokeStyle = 'rgba(200,200,200,.5)'; g.lineWidth = 1; seg(a0, a1); } }
      }
      g.restore();
    };
    if (o) { const ordne = d => { const K = D[d.type].kat; return K === 'gulv' ? d.n * 3 : K === 'trapp' ? d.n * 3 + 1 : K === 'tak' ? 10 + d.n : K === 'søyle' || K === 'bjelke' ? 4.5 + d.n : 4 + d.n; };
      // veggene i 2. etasje vises bare der det ikke står en vegg under (ovenfra ser de like ut)
      const M = BS.indeks(alle), under = d => BS.KANT(d) && d.n > 0 && M.has(BS.nøkkel({ ...d, n: d.n - 1 }));
      for (const d of alle.slice().sort((a, b) => ordne(a) - ordne(b))) if (!under(d)) tegnDel(d, null);
      // rommene: navnet midt i (nær nok)
      if (G / m > 9) { g.save(); g.font = '12px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3;
        for (const r of BS.rom(alle, (L() || {}).romBruk)) { if (r.etasje) continue; const x = sx(o.ox + r.ci * G), y = sy(o.oy + r.cj * G), t = r.navn + (r.type && r.type.id === 'sovesal' ? ' · sovesal' : '') + (r.senger ? ` · ${r.senger} senger` : '');
          g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#f2ead6'; g.strokeText(t, x, y + 4); g.fillText(t, x, y + 4); } g.restore(); } }
    // forslaget: grønt (kan bygges), rødt (får ikke plass); riv: rødt omriss
    for (const q of forslag) tegnDel(q.d, V.fane === 'riv' ? 'rgba(224,96,74,.75)' : q.feil ? 'rgba(224,96,74,.6)' : 'rgba(110,200,105,.62)');
    if (V.åpen && A) { g.save(); g.fillStyle = '#f0d79a'; for (const p of [A, B].filter(Boolean)) { g.beginPath(); g.arc(sx(p[0]), sy(p[1]), 4, 0, 6.283); g.fill(); } g.restore(); }
  });
  KROKER.tegn[KROKER.tegn.length - 1].bygg = true;   // tegnes øverst i byggevisningen (spill/byggevisning.js)

  // ---------- 3D ----------
  // Teksturene lages i koden (lysstyrke; fargen kommer fra hjørnefargene, bortsett fra murstein)
  const TEX = {};
  function tekstur(navn) {
    if (TEX[navn]) return TEX[navn];
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), tilf = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(navn.length * 7919 + 13);
    const støy = (a, b) => { const d = g.getImageData(0, 0, 256, 256), p = d.data; for (let i = 0; i < p.length; i += 4) { const k = 1 + (tilf() - .5) * a; p[i] *= k; p[i + 1] *= k; p[i + 2] *= k; } g.putImageData(d, 0, 0); };
    if (navn === 'tre') {
      // stående kledning: bord 20 cm (256 px = 1,2 m), lekter og fuger
      g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 6; k++) { const x = k * 256 / 6, w = 256 / 6; g.fillStyle = `rgb(${220 + tilf() * 30 | 0},${220 + tilf() * 30 | 0},${220 + tilf() * 30 | 0})`; g.fillRect(x, 0, w, 256);
        for (let a = 0; a < 7; a++) { g.strokeStyle = `rgba(0,0,0,${.03 + tilf() * .05})`; g.beginPath(); const xx = x + 3 + tilf() * (w - 6); g.moveTo(xx, 0); g.bezierCurveTo(xx + 2, 80, xx - 2, 170, xx + 1, 256); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, 0, 2, 256); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 2, 0, 2, 256); }
      støy(.08);
    } else if (navn === 'betong') {
      g.fillStyle = '#d8d8d6'; g.fillRect(0, 0, 256, 256); støy(.16);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${tilf() * .06})`; g.beginPath(); g.arc(tilf() * 256, tilf() * 256, 4 + tilf() * 18, 0, 6.283); g.fill(); }
      // forskalingsskjøter hver 1,2 m og forankringshull
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 127, 256, 2); g.fillRect(127, 0, 2, 256);
      g.fillStyle = 'rgba(0,0,0,.35)'; for (const [x, y] of [[64, 64], [192, 64], [64, 192], [192, 192]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 6.283); g.fill(); }
    } else if (navn === 'stein') {
      // murstein 25 × 6,5 cm med 1 cm fuge (256 px = 1 m), forbandt
      g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, 256, 256); const hR = 256 / 13.3, bR = 256 / 3.85;
      for (let r = 0; r * hR < 256; r++) for (let k = -1; k * bR < 256; k++) { const x = k * bR + (r % 2 ? bR / 2 : 0), y = r * hR, t = tilf();
        g.fillStyle = `rgb(${130 + t * 40 | 0},${58 + t * 22 | 0},${42 + t * 14 | 0})`; g.fillRect(x + 1.5, y + 1.5, bR - 3, hR - 3); }
      støy(.12);
    } else if (navn === 'tak') {
      // takpapp/takstein: rader hver 20 cm (256 px = 1 m)
      g.fillStyle = '#d4d4d4'; g.fillRect(0, 0, 256, 256); støy(.14);
      for (let y = 0; y < 256; y += 256 / 5) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, 256, 3); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y + 3, 256, 2);
        for (let x = (y / 51 % 2) * 32; x < 256; x += 64) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y, 2, 256 / 5); } }
    } else { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (TEX[navn] = t);
  }
  const SKALA = { tre: 1.2, betong: 2.4, stein: 1, tak: 1, farge: 1 };   // meter per tekstur
  let MAT = null;
  const materialer = () => MAT || (MAT = Object.fromEntries(['tre', 'betong', 'stein', 'tak', 'farge'].map(k => [k, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, ...(k === 'farge' ? {} : { map: tekstur(k) }) })])));
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const tone = (c, k) => c.map(v => Math.min(1, v * k));
  // fargene: rødmalt kledning, hvite hjørner og vindskier, grå betong, mørkt tak
  const F = { kledning: hex('#9b3a2c'), hvit: hex('#e9e5da'), betong: hex('#b4b2ab'), betongM: hex('#8c8a84'), stein: [1, 1, 1], tak: hex('#4a4b4e'), takFlatt: hex('#3c3d3f'),
    under: hex('#5a4a38'), tregulv: hex('#a88b62'), dør: hex('#2f4a3c'), dørStål: hex('#5d6366'), dørTre: hex('#5a4330'), glass: hex('#2a3c46'), rammeM: hex('#3a3c3e'),
    stålport: hex('#7b8083'), blikk: hex('#8a949a'), palisade: hex('#6e5b45'), jord: hex('#6a5a40'), gress: hex('#5f6e3a'), stål: hex('#7b8083'), stolpe: hex('#4f4132') };
  const TYKK = { tre: .16, betong: .22, stein: .26, blikk: .1 };
  // En samling trekanter per materiale: position, normal, uv (fra posisjonen) og color
  function nyGeo() { return { p: [], n: [], t: [], c: [] }; }
  function kv(g, a, b, c, d, col, sk) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const uv = q => (Math.abs(nz) > .7 ? [q[3] / sk, q[4] / sk] : [(q[3] * -ny + q[4] * nx) / sk, q[2] / sk]);
    for (const q of d ? [a, b, c, a, c, d] : [a, b, c]) { g.p.push(q[0], q[1], q[2]); g.n.push(nx, ny, nz); const t = uv(q); g.t.push(t[0], t[1]); g.c.push(col[0], col[1], col[2]); }
  }
  // Bygger alle delene (og forslaget) som trekanter i lokale 3D-koordinater
  function bygger(u, R, o) {
    const ex = R.EX || 1, gx = o.ox - u.cx, gy = o.oy - u.cy, z3 = moh => (moh - u.h0) * ex, grupper = { tre: nyGeo(), betong: nyGeo(), stein: nyGeo(), tak: nyGeo(), farge: nyGeo() };
    // punkt: [x, y, z, uvx, uvy] – uv i meter fra rutenettets opphav (små tall)
    const P = (x, y, z) => [x, y, z, x - gx, y - gy];
    // skrå boks langs en retning: midten (cx, cy), lengde l (langs ux, uy), bredde b, bunn/topp i hver ende (za0/za1 og zb0/zb1)
    function boks(gr, col, cx, cy, ux, uy, l, b, za0, za1, zb0 = za0, zb1 = za1, uten = '') {
      const g = grupper[gr], sk = SKALA[gr], px = -uy, py = ux, h = l / 2, w = b / 2;
      const p = (s, q, z) => P(cx + ux * s + px * q, cy + uy * s + py * q, z), A0 = p(-h, -w, za0), B0 = p(h, -w, zb0), C0 = p(h, w, zb0), D0 = p(-h, w, za0), A1 = p(-h, -w, za1), B1 = p(h, -w, zb1), C1 = p(h, w, zb1), D1 = p(-h, w, za1);
      kv(g, A1, B1, C1, D1, col, sk); if (!uten.includes('b')) kv(g, A0, D0, C0, B0, tone(col, .7), sk);
      kv(g, A0, B0, B1, A1, col, sk); kv(g, C0, D0, D1, C1, col, sk); if (!uten.includes('e')) { kv(g, B0, C0, C1, B1, tone(col, .92), sk); kv(g, D0, A0, A1, D1, tone(col, .92), sk); }
    }
    return { grupper, boks, P, kv: (gr, a, b, c, d, col) => kv(grupper[gr], a, b, c, d, col, SKALA[gr]), z3, gx, gy };
  }
  // Legger delene inn i byggeren. hz: høydene (BS.høyder). f(d): 0–1 hvor ferdig (under bygging: lav).
  // (B4) delene har størrelse (d.s ruter på 1,2 m): gulv og tak lages rute for rute, vegger i hele lengden; søyler, bjelker og trapper er nye.
  const farge = st => (st === 'tre' ? F.kledning : st === 'betong' ? F.betong : st === 'blikk' ? F.blikk : F.stein);
  const gruppe = st => (st === 'blikk' ? 'tre' : st === 'stål' ? 'farge' : st);
  function leggInn(Bg, o, liste, hz, alle, u) {
    const { boks, P, z3, gx, gy } = Bg, M = BS.indeks(alle), hd = (x, y) => hoyde3d(x + u.cx, y + u.cy, u);
    const vegg = (a, i, j, n) => { const q = M.get(`k:${a}:${i}:${j}:${n}`); return q && D[q.type].kat === 'vegg' ? q : null; };
    const dekke = (i, j, n) => M.get(`c:${i}:${j}:${n}`) || null, gulvHer = (i, j, n) => { const q = dekke(i, j, n); return q && D[q.type].kat === 'gulv'; };
    const tak = (i, j, n) => { const q = dekke(i, j, n); return q && D[q.type].kat === 'tak' ? q : null; };
    const fr = d => (d.ferdig === false ? Math.max(.05, Math.min(1, d.f || 0)) : 1);
    // (B4) står det en hjørnestolpe i hjørnet (vi, vj)? Når veggene møtes på tvers, eller én vegg slutter der – ikke mellom to vegger på rad
    const stolpe = (vi, vj, n) => { const x = [vegg('x', vi, vj, n), vegg('x', vi - 1, vj, n)].filter(Boolean).length, y = [vegg('y', vi, vj, n), vegg('y', vi, vj - 1, n)].filter(Boolean).length; return (x && y) || x + y === 1; };
    const hjørner = new Map();   // hjørnestolpene: per hjørne og etasje
    const saltak = [];
    for (const d of liste) {
      const Dd = D[d.type], hv = hz.get(d.id); if (!hv) continue; const f = fr(d), z0 = hv.z0, ds = d.s || Dd.s, K = Dd.kat;
      // (B5) maskiner, lamper og hyller: enkle kasser (spill/fabrikk-visning.js)
      if (K === 'maskin' || K === 'lampe' || K === 'lager') { if (window.FabrikkSpill) FabrikkSpill.bygg3d(Bg, d, Dd, z0, f, o); continue; }
      if (K === 'gulv') {
        for (const [ci, cj] of BS.ruter(d)) {
          const x0 = gx + ci * G, y0 = gy + cj * G, ut = (di, dj) => (gulvHer(ci + di, cj + dj, d.n) ? 0 : d.n ? .1 : .12);
          const ax = x0 - ut(-1, 0), bx = x0 + G + ut(1, 0), ay = y0 - ut(0, -1), by = y0 + G + ut(0, 1), cx = (ax + bx) / 2, cy = (ay + by) / 2;
          if (d.n === 0) { const ned = z3(hv.ned), topp = z3(z0);
            if (Dd.grunn !== 'bs_tregulv') boks('betong', F.betong, cx, cy, 1, 0, bx - ax, by - ay, ned, topp, ned, topp, 'b');
            else { boks('betong', F.betongM, cx, cy, 1, 0, bx - ax, by - ay, ned, topp - .07, ned, topp - .07, 'b'); boks('tre', F.tregulv, cx, cy, 0, 1, by - ay, bx - ax, topp - .07, topp, topp - .07, topp); } }
          else { const zb = z3(z0 + d.n * H); if (Dd.stoff === 'betong') boks('betong', F.betong, cx, cy, 1, 0, bx - ax, by - ay, zb - .25, zb + .03); else boks('tre', F.tregulv, cx, cy, 0, 1, by - ay, bx - ax, zb - .22, zb + .03); }
        }
        continue;
      }
      if (K === 'tak') {
        const zb = z3(z0 + d.n * H);
        if (d.ferdig === false) { boks('farge', tone(F.tregulv, 1.1), gx + (d.i + ds / 2) * G, gy + (d.j + ds / 2) * G, 1, 0, ds * G - .1, ds * G - .1, zb, zb + .05); continue; }
        if (Dd.grunn === 'bs_tak_sal') { for (const [ci, cj] of BS.ruter(d)) saltak.push({ ...d, i: ci, j: cj }); continue; }
        const st = Dd.stoff, gr = st === 'betong' ? 'betong' : st === 'blikk' ? 'tre' : 'tak', col = st === 'betong' ? F.betong : st === 'blikk' ? F.blikk : F.takFlatt, tyk = st === 'blikk' ? .12 : .28;
        for (const [ci, cj] of BS.ruter(d)) { const ut = (di, dj) => (tak(ci + di, cj + dj, d.n) ? 0 : .3), x0 = gx + ci * G, y0 = gy + cj * G;
          const ax = x0 - ut(-1, 0), bx = x0 + G + ut(1, 0), ay = y0 - ut(0, -1), by = y0 + G + ut(0, 1);
          boks(gr, col, (ax + bx) / 2, (ay + by) / 2, 1, 0, bx - ax, by - ay, zb, zb + tyk); }
        continue;
      }
      if (K === 'søyle') { const m = BS.midt(o, d), zb = z3(z0 + d.n * H), st = Dd.stoff, b0 = st === 'stål' ? .2 : .26;
        boks(st === 'stål' ? 'farge' : st, st === 'tre' ? F.tregulv : st === 'betong' ? F.betong : F.stål, m.x - u.cx, m.y - u.cy, 1, 0, b0, b0, zb, zb + H * f); continue; }
      if (K === 'trapp') { const R = BS.ruter(d), [di, dj] = [[1, 0], [0, 1], [-1, 0], [0, -1]][(d.r || 0) & 3], zb = z3(z0 + d.n * H), N = 14, L3 = 3 * G;
        const sx0 = gx + (R[0][0] + .5) * G - di * G / 2, sy0 = gy + (R[0][1] + .5) * G - dj * G / 2, gr = Dd.stoff === 'betong' ? 'betong' : 'tre', col = Dd.stoff === 'betong' ? F.betong : F.tregulv;
        for (let k = 0; k < Math.max(1, Math.round(N * f)); k++) { const t0 = k / N * L3, t1 = (k + 1) / N * L3, cx = sx0 + di * (t0 + t1) / 2, cy = sy0 + dj * (t0 + t1) / 2;
          boks(gr, col, cx, cy, di || 0, dj || 0, t1 - t0 + .01, G * .9, zb + Math.max(0, k - 1) / N * H, zb + (k + 1) / N * H); }
        // rekkverk på den ene siden
        if (f >= 1) { const px = -dj, py = di; for (const k of [0, N / 2, N]) { const t = k / N * L3, x = sx0 + di * t + px * G * .43, y = sy0 + dj * t + py * G * .43; boks('farge', F.stål, x, y, 1, 0, .05, .05, zb + k / N * H, zb + k / N * H + 1); }
          const x0 = sx0 + px * G * .43, y0 = sy0 + py * G * .43; Bg.kv('farge', P(x0, y0, zb + 1), P(x0 + di * L3, y0 + dj * L3, zb + H + 1), P(x0 + di * L3, y0 + dj * L3, zb + H + .95), P(x0, y0, zb + .95), F.stål); }
        continue; }
      // kanter
      const m = BS.midt(o, d), cx = m.x - u.cx, cy = m.y - u.cy, ux = d.a === 'x' ? 1 : 0, uy = d.a === 'x' ? 0 : 1, L = ds * G;
      if (K === 'forsvar') { forsvar(Bg, d, cx, cy, ux, uy, hd, f, L); continue; }
      if (K === 'bjelke') { const zb = z3(z0 + d.n * H), st = Dd.stoff; boks(st === 'stål' ? 'farge' : 'tre', st === 'stål' ? F.stål : F.tregulv, cx, cy, ux, uy, L + .1, .2, zb + H - .42, zb + H - .02); continue; }
      const st = Dd.stoff, t = TYKK[st] || .16, zb = z3(z0 + d.n * H), zt = zb + H * f, gr = gruppe(st), col = farge(st);
      // hjørnestolpene (to ender)
      for (const [vi, vj] of d.a === 'x' ? [[d.i, d.j], [d.i + ds, d.j]] : [[d.i, d.j], [d.i, d.j + ds]]) { const k = `${vi},${vj},${d.n}`, h0 = hjørner.get(k) || { t: 0, zb, zt: zb, tre: false, st, ak: new Set(), n: 0 };
        h0.t = Math.max(h0.t, t); h0.zt = Math.max(h0.zt, zt); h0.tre = h0.tre || st === 'tre'; h0.ak.add(d.a); h0.n++; hjørner.set(k, h0); }
      // sokkel under veggen når den ikke står på et gulv
      if (d.n === 0 && hv.ned < z0 - .05) { const k0 = BS.kanter(d)[0], [[r1i, r1j], [r2i, r2j]] = k0.a === 'x' ? [[k0.i, k0.j - 1], [k0.i, k0.j]] : [[k0.i - 1, k0.j], [k0.i, k0.j]];
        if (!gulvHer(r1i, r1j, 0) && !gulvHer(r2i, r2j, 0)) boks('betong', F.betongM, cx, cy, ux, uy, L + t, t + .06, z3(hv.ned), zb, z3(hv.ned), zb, 'b'); }
      const pc = (Math.max(t, .2) + .06) / 2, [ea, eb] = d.a === 'x' ? [[d.i, d.j], [d.i + ds, d.j]] : [[d.i, d.j], [d.i, d.j + ds]], s0 = -L / 2 + (stolpe(ea[0], ea[1], d.n) ? pc - .01 : 0), s1 = L / 2 - (stolpe(eb[0], eb[1], d.n) ? pc - .01 : 0), v = d.ferdig === false ? 'hel' : Dd.v, dh = L <= 1.3 ? .42 : .5, vh = Math.min(.6, L / 2 - pc - .1);
      const ÅPN = { dør: [-dh, dh, 0, 2.1], vindu: [-vh, vh, .95, 2.15], port: [-(L / 2 - pc - .06), L / 2 - pc - .06, 0, ds >= 4 ? 2.85 : 2.45] }[v];
      const bit = (a0, a1, b0, b1, gg = gr, c = col, tt = t) => { if (a1 - a0 < .005 || b1 - b0 < .005) return; boks(gg, c, cx + ux * (a0 + a1) / 2, cy + uy * (a0 + a1) / 2, ux, uy, a1 - a0, tt, zb + b0, zb + b1); };
      if (!ÅPN) { bit(s0, s1, 0, zt - zb); continue; }
      const [o0, o1, h0, h1] = ÅPN, hh = Math.min(h1, zt - zb);
      bit(s0, o0, 0, zt - zb); bit(o1, s1, 0, zt - zb); bit(o0, o1, 0, Math.min(h0, zt - zb)); if (zt - zb > h1) bit(o0, o1, h1, zt - zb);
      if (f < 1) continue;
      const ramme = st === 'tre' ? F.hvit : F.rammeM, rb = .07;
      // karmene rundt åpningen (litt utenfor veggen på begge sider)
      bit(o0 - rb, o0, h0 > 0 ? h0 - rb : 0, h1 + rb, 'farge', ramme, t + .04); bit(o1, o1 + rb, h0 > 0 ? h0 - rb : 0, h1 + rb, 'farge', ramme, t + .04); bit(o0 - rb, o1 + rb, h1, h1 + rb, 'farge', ramme, t + .04);
      if (v === 'dør') bit(o0 + .02, o1 - .02, .02, hh - .01, 'farge', st === 'tre' ? F.dør : st === 'betong' || st === 'blikk' ? F.dørStål : F.dørTre, .05);
      if (v === 'vindu') { bit(o0 - rb, o1 + rb, h0 - rb, h0, 'farge', ramme, t + .1); bit(o0, o1, h0, h1, 'farge', F.glass, .03);
        bit(-.025, .025, h0, h1, 'farge', ramme, .07); bit(o0, o1, (h0 + h1) / 2 + .1, (h0 + h1) / 2 + .15, 'farge', ramme, .07); }
      if (v === 'port') { if (st === 'tre') bit(o0 + .02, o1 - .02, .02, hh - .01, 'tre', tone(F.kledning, .8), .06);
        else { bit(o0 + .02, o1 - .02, .02, hh - .01, 'farge', F.stålport, .05); for (let k = 1; k < 6; k++) bit(o0 + .02, o1 - .02, hh * k / 6 - .02, hh * k / 6 + .02, 'farge', tone(F.stålport, .8), .08); } }
    }
    // hjørnestolpene: hvite hjørnekasser på trehus, ellers i veggens stoff
    // (B4) bare i ekte hjørner og i enden av en vegg – ikke der to vegger på 1,2 m står i forlengelse av hverandre
    for (const [k, h0] of hjørner) { const [vi, vj, vn] = k.split(',').map(Number), s = h0.t + .06; if (!stolpe(vi, vj, vn)) continue;
      boks(h0.tre ? 'farge' : gruppe(h0.st), h0.tre ? F.hvit : farge(h0.st), gx + vi * G, gy + vj * G, 1, 0, s, s, h0.zb, h0.zt); }
    saltak3d(Bg, saltak, M, hz, gx, gy, vegg);
  }
  // Saltakene: sammenhengende ruter i samme høyde får ett tak med mønet langs lengste side (eller valgt), gavler og vindskier
  function saltak3d(Bg, liste, M, hz, gx, gy, vegg) {
    const { boks, P, kv: kvG, z3 } = Bg, sett = new Map(liste.map(d => [`${d.i},${d.j},${d.n}`, d])), brukt = new Set(), TAN = .58;
    for (const d0 of liste) {
      const k0 = `${d0.i},${d0.j},${d0.n}`; if (brukt.has(k0)) continue; const comp = [], kø = [d0];
      while (kø.length) { const d = kø.pop(), k = `${d.i},${d.j},${d.n}`; if (brukt.has(k)) continue; brukt.add(k); comp.push(d);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = sett.get(`${d.i + di},${d.j + dj},${d.n}`); if (q) kø.push(q); } }
      const i0 = Math.min(...comp.map(d => d.i)), i1 = Math.max(...comp.map(d => d.i)), j0 = Math.min(...comp.map(d => d.j)), j1 = Math.max(...comp.map(d => d.j));
      const valgt = comp.filter(d => d.r === 0 || d.r === 1), langsX = valgt.length ? valgt.filter(d => d.r === 0).length * 2 >= valgt.length : i1 - i0 >= j1 - j0;
      // taket løftes litt så veggtoppene (utsiden av veggen) ikke stikker gjennom takflaten ved raftet
      const n = d0.n, zv = z3(hz.get(d0.id).z0 + n * H), zb = zv + .14;
      // aksene: r langs mønet, q på tvers. til(r, q, z) gir punktet
      const til = langsX ? (r, q, z) => P(r, q, z) : (r, q, z) => P(q, r, z);
      const p0 = langsX ? gy + j0 * G : gx + i0 * G, p1 = langsX ? gy + (j1 + 1) * G : gx + (i1 + 1) * G, pm = (p0 + p1) / 2, topp = zb + (p1 - p0) / 2 * TAN;
      const zr = q => topp - Math.abs(q - pm) * TAN, TH = .16, har = (i, j) => sett.has(`${i},${j},${n}`);
      for (const d of comp) {
        const r0w = langsX ? gx + d.i * G : gy + d.j * G, q0w = langsX ? gy + d.j * G : gx + d.i * G;
        const før = langsX ? har(d.i - 1, d.j) : har(d.i, d.j - 1), etter = langsX ? har(d.i + 1, d.j) : har(d.i, d.j + 1);
        const venstre = langsX ? har(d.i, d.j - 1) : har(d.i - 1, d.j), høyre = langsX ? har(d.i, d.j + 1) : har(d.i + 1, d.j);
        const r0 = r0w - (før ? 0 : .3), r1 = r0w + G + (etter ? 0 : .3), q0 = q0w - (venstre ? 0 : .4), q1 = q0w + G + (høyre ? 0 : .4);
        const bånd = (qa, qb) => {
          kvG('tak', til(r0, qa, zr(qa)), til(r1, qa, zr(qa)), til(r1, qb, zr(qb)), til(r0, qb, zr(qb)), F.tak);
          kvG('farge', til(r0, qa, zr(qa) - TH), til(r0, qb, zr(qb) - TH), til(r1, qb, zr(qb) - TH), til(r1, qa, zr(qa) - TH), F.under);
          // vindskiene i gavlendene
          if (!før) kvG('farge', til(r0, qa, zr(qa) - TH - .06), til(r0, qb, zr(qb) - TH - .06), til(r0, qb, zr(qb) + .04), til(r0, qa, zr(qa) + .04), F.hvit);
          if (!etter) kvG('farge', til(r1, qa, zr(qa) - TH - .06), til(r1, qb, zr(qb) - TH - .06), til(r1, qb, zr(qb) + .04), til(r1, qa, zr(qa) + .04), F.hvit);
        };
        if (q0 < pm && q1 > pm) { bånd(q0, pm); bånd(pm, q1); } else bånd(q0, q1);
        // takrenna/vindski langs raftet
        for (const [q, ute] of [[q0, !venstre], [q1, !høyre]]) if (ute) kvG('farge', til(r0, q, zr(q) - TH - .08), til(r1, q, zr(q) - TH - .08), til(r1, q, zr(q) + .03), til(r0, q, zr(q) + .03), F.hvit);
        // gavlene: veggen under taket i endene (i veggens stoff)
        for (const [rw, ute, kant] of [[r0w, !før, langsX ? { a: 'y', i: d.i, j: d.j } : { a: 'x', i: d.i, j: d.j }], [r0w + G, !etter, langsX ? { a: 'y', i: d.i + 1, j: d.j } : { a: 'x', i: d.i, j: d.j + 1 }]]) {
          if (!ute) continue; const w = vegg(kant.a, kant.i, kant.j, n - 1), st = w ? D[w.type].stoff : 'tre', t = (TYKK[st] || .16) / 2, col = farge(st);
          const qa = q0w, qb = q0w + G, qs = qa < pm && qb > pm ? [qa, pm, qb] : [qa, qb];
          for (const s of [-t, t]) for (let k = 1; k < qs.length; k++) kvG(gruppe(st), til(rw + s, qs[k - 1], zv), til(rw + s, qs[k], zv), til(rw + s, qs[k], zr(qs[k]) - TH + .02), til(rw + s, qs[k - 1], zr(qs[k - 1]) - TH + .02), col);
        }
      }
      // mønebeslaget
      const ra = langsX ? gx + i0 * G - .3 : gy + j0 * G - .3, rb = langsX ? gx + (i1 + 1) * G + .3 : gy + (j1 + 1) * G + .3;
      if (langsX) boks('farge', tone(F.tak, .7), (ra + rb) / 2, pm, 1, 0, rb - ra, .22, topp - .05, topp + .07); else boks('farge', tone(F.tak, .7), pm, (ra + rb) / 2, 0, 1, rb - ra, .22, topp - .05, topp + .07);
    }
  }
  // Forsvar: følger terrenget (hd: høyden i lokale koordinater)
  function forsvar(Bg, d, cx, cy, ux, uy, hd, f, L = L) {
    const gr0 = D[d.type].grunn;
    const { boks, z3 } = Bg, ha = z3(hd(cx - ux * L / 2, cy - uy * L / 2)), hb = z3(hd(cx + ux * L / 2, cy + uy * L / 2)), hash = (d.i * 73856093 ^ d.j * 19349663) >>> 0;
    if (gr0 === 'bs_mur') { boks('betong', F.betong, cx, cy, ux, uy, L + .4, .4, ha - .3, ha + 2.2 * f, hb - .3, hb + 2.2 * f); if (f >= 1) boks('betong', F.betongM, cx, cy, ux, uy, L + .5, .52, ha + 2.2, ha + 2.32, hb + 2.2, hb + 2.32); return; }
    if (gr0 === 'bs_voll') { const g = Bg.grupper.farge, hh = 1.3 * f, l = L / 2 + .4, B0 = 1, B1 = .35, p = (s, q, z) => Bg.P(cx + ux * s - uy * q, cy + uy * s + ux * q, z);
      for (const sd of [-1, 1]) kv(g, p(-l, sd * B0, ha - .3), p(l, sd * B0, hb - .3), p(l, sd * B1, hb + hh), p(-l, sd * B1, ha + hh), sd < 0 ? F.jord : tone(F.jord, 1.08), 1);
      kv(g, p(-l, -B1, ha + hh), p(l, -B1, hb + hh), p(l, B1, hb + hh), p(-l, B1, ha + hh), F.gress, 1);
      for (const [s, h] of [[-l, ha], [l, hb]]) kv(g, p(s, -B0, h - .3), p(s, B0, h - .3), p(s, B1, h + hh), p(s, -B1, h + hh), tone(F.jord, .9), 1); return; }
    if (gr0 === 'bs_piggtråd') { for (const s of [-L / 2, L / 2]) { const h = z3(hd(cx + ux * s, cy + uy * s)); boks('farge', F.stolpe, cx + ux * s, cy + uy * s, ux, uy, .08, .08, h - .3, h + 1.3 * f); }
      if (f < 1) return; for (const z of [.35, .7, 1.05, 1.28]) boks('farge', F.stål, cx, cy, ux, uy, L, .018, ha + z, ha + z + .018, hb + z, hb + z + .018, 'e');
      // ruller med piggtråd i kryss mellom stolpene
      const g = Bg.grupper.farge; for (const sd of [-1, 1]) { const p = (s, z) => Bg.P(cx + ux * s, cy + uy * s, z);
        kv(g, p(-L / 2, (sd < 0 ? ha + .1 : ha + 1.2)), p(L / 2, (sd < 0 ? hb + 1.2 : hb + .1)), p(L / 2, (sd < 0 ? hb + 1.22 : hb + .12)), p(-L / 2, (sd < 0 ? ha + .12 : ha + 1.22)), F.stål, 1); } return; }
    // palisade: åtte spisse stokker (åttekant), litt ujevne
    const g = Bg.grupper.farge, N = 8, NS = Math.max(2, Math.round(L / .3));
    for (let k = 0; k < NS; k++) { const s = -L / 2 + (k + .5) * L / NS, x = cx + ux * s, y = cy + uy * s, h = z3(hd(x, y)), r = .14, rr = ((hash >> k) & 7) / 7, topp = h + (2.45 + rr * .3) * f, spiss = topp + .35 * f, col = tone(F.palisade, .82 + rr * .3);
      for (let a = 0; a < N; a++) { const v0 = a / N * 6.283, v1 = (a + 1) / N * 6.283, c0 = [x + Math.cos(v0) * r, y + Math.sin(v0) * r], c1 = [x + Math.cos(v1) * r, y + Math.sin(v1) * r];
        kv(g, Bg.P(c0[0], c0[1], h - .3), Bg.P(c1[0], c1[1], h - .3), Bg.P(c1[0], c1[1], topp), Bg.P(c0[0], c0[1], topp), col, 1);
        kv(g, Bg.P(c0[0], c0[1], topp), Bg.P(c1[0], c1[1], topp), Bg.P(x, y, spiss), null, tone(col, 1.12), 1); } }
    // tverrstokk på innsiden
    if (f >= 1) boks('farge', tone(F.palisade, .75), cx + uy * .2, cy - ux * .2, ux, uy, L, .12, ha + 1.7, ha + 1.82, hb + 1.7, hb + 1.82);
  }
  function tilMesh(g, mat) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.t, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(g.c, 3)); geo.computeBoundingSphere();
    return new THREE.Mesh(geo, mat);
  }
  const MAKS3D = 1500;
  let mesh = [], ghost = [], sistNøkkel = '';
  const fjern = (R, liste) => { for (const m of liste) { R.scene.remove(m); m.geometry.dispose(); if (m.userData.egen) m.material.dispose(); } liste.length = 0; };
  // Delene i 3D-utsnittet med hvor ferdige de er (bare de som er innenfor utsnittet)
  function delerI3d(u) { const l = L(), o = l && l.byggesett; if (!l || !o) return [];
    return l.bygg.filter(b => D[b.type] && b.bs && Math.abs(b.x - u.cx) < u.S - 5 && Math.abs(b.y - u.cy) < u.S - 5).slice(0, MAKS3D).map(b => ({ ...BS.fraBygg(b, LB), f: LB.framdrift(b) })); }
  function lag3d(u, R) {
    R = R || r3(); u = u || (R && R.ut); if (!R || !u || !window.THREE) return; fjern(R, mesh);
    const l = L(), o = l && l.byggesett, liste = delerI3d(u); sistNøkkel = nøkkel3d(); if (!o || !liste.length) return;
    const hz = BS.høyder(o, liste, (x, y) => hoyde3d(x, y, u)), Bg = bygger(u, R, o); leggInn(Bg, o, liste, hz, liste, u);
    const M = materialer();
    for (const [k, g] of Object.entries(Bg.grupper)) { if (!g.p.length) continue; const m = tilMesh(g, M[k]); m.userData.byggesett = k; R.scene.add(m); mesh.push(m); }
    R.byggesettMesh = mesh; hindringer(u, R, o, liste);
  }
  // Veggene og forsvaret stopper deg når du går selv (R3.hindre, som husene); døra og porten er åpne
  function hindringer(u, R, o, liste) {
    if (!R.hindre) return;
    for (const [k, l] of R.hindre) { const f = l.filter(q => !q.bs); if (f.length !== l.length) { if (f.length) R.hindre.set(k, f); else R.hindre.delete(k); } }
    for (const d of liste) {
      if (!BS.KANT(d) || BS.kat(d) === 'bjelke' || d.n !== 0 || d.ferdig === false) continue; const Dd = D[d.type], m = BS.midt(o, d), cx = m.x - u.cx, cy = m.y - u.cy, ux = d.a === 'x' ? 1 : 0, uy = 1 - ux;
      const L = (d.s || Dd.s) * G, w = Dd.grunn === 'bs_voll' ? .9 : .17, ÅP = { dør: L <= 1.3 ? [-.42, .42] : [-.5, .5], port: [-(L / 2 - .25), L / 2 - .25] }[Dd.v], biter = ÅP ? [[-L / 2, ÅP[0]], [ÅP[1], L / 2]] : [[-L / 2, L / 2]];
      for (const [s0, s1] of biter) { const P = [[s0, -w], [s1, -w], [s1, w], [s0, w]].map(([s, q]) => [cx + ux * s - uy * q, cy + uy * s + ux * q]), k = Math.floor((cx + ux * (s0 + s1) / 2) / 20) + ',' + Math.floor((cy + uy * (s0 + s1) / 2) / 20);
        // med i alle rutene på 20 m som biten berører (endene kan ligge i nabo-ruta)
        const nøkler = new Set(P.map(([x, y]) => Math.floor(x / 20) + ',' + Math.floor(y / 20))); nøkler.add(k);
        for (const n of nøkler) { if (!R.hindre.has(n)) R.hindre.set(n, []); R.hindre.get(n).push({ P, bs: true }); } }
    }
  }
  // Forslaget i 3D: gjennomsiktig grønt (kan bygges) og rødt (får ikke plass), riv: rødt
  function skisse3d(u, R) {
    R = R || r3(); u = u || (R && R.ut); if (!R || !u || !window.THREE) return; fjern(R, ghost); if (!V.åpen || !forslag.length) return;
    const l = L(), o = l && l.byggesett; if (!o) return;
    const finnes = delerI3d(u), riv = V.fane === 'riv', nye = riv ? [] : forslag.map((q, k) => ({ ...q.d, id: 'f' + k, ferdig: true, feil: !!q.feil }));
    const alle = [...finnes.filter(d => !forslag.some(q => q.bytt === d.id)), ...nye], hz = BS.høyder(o, alle, (x, y) => hoyde3d(x, y, u));
    for (const [farge, utvalg] of [[0x7fd17a, nye.filter(d => !d.feil)], [0xe0604a, riv ? forslag.map(q => finnes.find(d => d.id === q.d.id)).filter(Boolean).map(d => ({ ...d, ferdig: true })) : nye.filter(d => d.feil)]]) {
      if (!utvalg.length) continue; const Bg = bygger(u, R, o); leggInn(Bg, o, utvalg, hz, alle, u); const samlet = nyGeo();
      for (const g of Object.values(Bg.grupper)) for (const k of ['p', 'n', 't', 'c']) samlet[k].push(...g[k]);
      const m = tilMesh(samlet, new THREE.MeshBasicMaterial({ color: farge, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide }));
      m.userData.egen = true; m.renderOrder = 2; R.scene.add(m); ghost.push(m); }
  }
  // 3D lages på nytt når noe er endret (ny del, ferdig, revet) – sjekkes hvert sekund
  const nøkkel3d = () => { const l = L(); return l ? l.bygg.filter(b => D[b.type]).map(b => `${b.id}:${b.igjen > 0 ? Math.round(LB.framdrift(b) * 10) : 'f'}:${b.hp > .5 ? 1 : 0}`).join(',') : ''; };
  setInterval(() => { const R = r3(); if (!R || !R.ut || !window.THREE || R.bygger) return; if (nøkkel3d() !== sistNøkkel) { lag3d(); skitten = true; } }, 1000);
  KROKER.sett3d.push((u, R) => { lag3d(u, R); skisse3d(u, R); });
  // trærne i husene ryddes av leir-visning.js (omrisset til delene); ved nye deler kalles LeirSpill.oppdater3d(true)

  // Kontroll (VAKT i sjekk.js): delene i scenen, trekanter, og at ingen del på bakken svever over terrenget
  function sjekk() {
    const R = r3(); if (!R || !R.ut) return null; const u = R.ut, l = L(), o = l && l.byggesett, liste = delerI3d(u); if (!o) return { deler: 0 };
    const hz = BS.høyder(o, liste, (x, y) => hoyde3d(x, y, u)); let svever = 0, ustøttet = 0; const M = BS.indeks(liste);
    for (const d of liste) { const v = hz.get(d.id); if (!v) continue;
      if (d.n === 0 && D[d.type].kat !== 'forsvar') { const pkt = BS.punkter(o, d); if (pkt.some(([x, y]) => v.ned > hoyde3d(x, y, u) + .01)) svever++; }
      if (!BS.støttet(M, d)) ustøttet++; }
    const tri = mesh.reduce((s, m) => s + m.geometry.attributes.position.count / 3, 0);
    return { deler: liste.length, nett: mesh.length, iScene: mesh.filter(m => m.parent === R.scene).length, trekanter: tri, svever, ustøttet, rom: BS.rom(liste).length };
  }
  window.Byggesett = {
    rom: () => romNå(), senger: () => romNå().reduce((s, r) => s + r.senger, 0), romBruk: () => BS.romSum(romNå()), byttBruk, deler, åpne, lukk, trykk, oppdater, bekreft, riv, lag3d, sjekk,
    velg: (o2) => { Object.assign(V, o2); A = null; B = null; forslag = []; tekst = ''; ekstra = ''; advarsel = ''; visLinje(); }, forslag: () => forslag, tilstand: () => V, opphav, planModell, egneMaler, lagreMal, typeNå,
  };
})();
