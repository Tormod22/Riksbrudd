'use strict';
// K2 – leiren (regler: spill/leir.js). Knappen «Leir» øverst åpner byggemenyen (kassa, strøm, drivstoff, materialer, byggelag og kø,
// og bygglista). Velg et bygg, trykk på kartet (2D eller 3D): skissen er grønn når det kan bygges og rød ellers, også som et
// gjennomsiktig bygg i 3D. Roter 15° om gangen, rutenett (2,5 m og 15°) av og på, nye bygg retter seg etter nærmeste nabo, og porter
// festes i gjerdet. Gjerdet trykkes punkt for punkt («Angre punkt», «Lukk ringen»). Trykk på et bygg for byggpanelet: oppgrader,
// reparer, flytt og riv. Fiender i leiren skader byggene. Lagres i nettleseren («riksbrudd-k2»).
// Plassering og planlegging (12. nov): nye bygg legger seg inntil naboen (Leir.snapp, hjelpelinjer, avstand), for bratt grunn avvises,
// «Fortsett» setter ut flere av samme slag, tastene R/Q (roter), Enter (bygg) og Esc (avbryt). Planen: «Planlegg» gir gratis skisser
// (blå) som holder plassen; trykk på en skisse for å bygge den nå, flytte, kopiere eller fjerne den; «Bygg hele planen», angre/gjør om
// (Ctrl+Z/Ctrl+Y), og maler (leiren lagres rundt midten og settes inn et annet sted, også dreid). Malene lagres i «riksbrudd-maler».
// Kroker: KROKER.sim (bygging, strøm, skade), KROKER.trykk/trykk3d (plassering og byggpanel), KROKER.tegn (kartet), KROKER.bygg3d/sett3d (3D).
(function () {
  const LB = Leir, NØKKEL = 'riksbrudd-k2', r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let L = null, plassering = null, valgtBygg = null, valgtPlan = null, sist = null, akk = 0, meny = false, rutenett = true, inntil = true, planModus = false, fortsett = false;
  const angre = [], gjørOm = [], MALER = 'riksbrudd-maler';
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const les = () => { try { return LB.fraJSON(localStorage.getItem(NØKKEL)); } catch (e) { return null; } };
  const lagre = () => { try { localStorage.setItem(NØKKEL, LB.tilJSON(L)); } catch (e) { /* privat vindu */ } };
  const bonus = () => OppstartSpill.bonus();

  // ---------- stil og knapper ----------
  const css = document.createElement('style');
  css.textContent = `#leirmeny{ position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); bottom:calc(60px + env(safe-area-inset-bottom,0px)); width:min(350px, calc(100vw - 20px));
  z-index:6; display:none; flex-direction:column; background:var(--panel); border:1px solid var(--rule); color:var(--ink); overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; touch-action:pan-y; }
#leirmeny.på{ display:flex; }
#leirmeny .hode{ padding:10px 12px 6px; border-bottom:1px solid var(--rule); flex:0 0 auto; }
#leirmeny h2{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:22px; }
#leirmeny h3{ margin:8px 0 2px; font-size:14px; color:var(--hover); font-weight:600; }
#leirmeny .status{ font-size:14px; color:var(--ink-dim); margin-top:4px; line-height:1.45; }
#leirmeny .liste{ padding:6px 8px 10px; flex:0 0 auto; }
#leirmeny .bygg{ display:flex; gap:8px; align-items:center; padding:6px 4px; border-bottom:1px solid #3a3226; }
#leirmeny .bygg div{ flex:1; min-width:0; } #leirmeny .bygg b{ font-weight:600; } #leirmeny .bygg small{ display:block; color:var(--ink-dim); font-size:12.5px; }
#leirmeny button, #byggvalg button{ background:#2a2318; border:1px solid var(--rule); color:var(--ink); min-height:40px; padding:4px 12px; cursor:pointer; font:inherit; }
#leirmeny button:disabled, #byggvalg button:disabled{ opacity:.45; cursor:default; }
#leirmeny .lukk{ float:right; min-height:36px; border:none; background:none; font-size:22px; }
#leirmeny .igang{ font-size:13.5px; color:var(--ink); margin:2px 0 0; }
#leirmeny .mat{ display:flex; align-items:center; gap:6px; font-size:13.5px; margin:3px 0; } #leirmeny .mat span{ flex:1; }
#leirmeny .mat button{ min-height:34px; padding:2px 8px; font-size:13px; }
#byggvalg{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(70px + env(safe-area-inset-bottom,0px)); z-index:11; display:none; background:var(--panel);
  border:1px solid var(--hover); padding:10px 14px; color:var(--ink); max-width:min(600px,94vw); text-align:center; }
#byggvalg.på{ display:block; } #byggvalg button{ margin:6px 3px 0; } #byggvalg small{ color:var(--ink-dim); display:block; }`;
  document.head.appendChild(css);
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const menyEl = el('div', { id: 'leirmeny', role: 'dialog', 'aria-label': 'Leiren' }); document.body.appendChild(menyEl);
  const banner = el('div', { id: 'byggvalg' }); document.body.appendChild(banner);
  const leirKnapp = el('button', { id: 'leirknapp', title: 'Bygg leiren' }, 'Leir'); leirKnapp.hidden = true;
  document.querySelector('.knapper').insertBefore(leirKnapp, document.getElementById('meny'));
  leirKnapp.onclick = () => { meny = !meny; menyEl.classList.toggle('på', meny); leirKnapp.classList.toggle('på', meny); if (meny) visMeny(); };
  const st = el('div', {}, el('b', { id: 'sStrom' }, '–'), ' ', el('span', {}, 'strøm')); st.hidden = true; document.querySelector('.stats').appendChild(st);
  const matTekst = mat => Object.entries(mat || {}).filter(([, v]) => v > 0).map(([k, v]) => `${String(v).replace('.', ',')} ${LB.MATERIALER[k].enhet} ${LB.MATERIALER[k].navn.toLowerCase()}`).join(', ');
  const matPris = mat => Object.entries(mat || {}).reduce((s, [k, v]) => s + Math.max(0, v - (L.lager[k] || 0)) * LB.MATERIALER[k].pris, 0);
  // Kjøper det som mangler av materialene (når det er plass), gir true når alt finnes
  function kjøpManglende(mat) { for (const [k, v] of Object.entries(mat || {})) { const m = Math.ceil((v - (L.lager[k] || 0)) * 10) / 10; if (m > 0) { const r = LB.kjøpMateriale(L, k, m, OppstartSpill.betal); if (r.feil) { logg(r.feil); return false; } } } return true; }

  // ---------- angre/gjør om (planen) og maler ----------
  const øyeblikk = () => JSON.stringify({ plan: L.plan, nestePlan: L.nestePlan });
  // kalles før hver endring i planen
  const husk = () => { angre.push(øyeblikk()); if (angre.length > 50) angre.shift(); gjørOm.length = 0; };
  function angreEn(fra, til) { if (!fra.length) return false; til.push(øyeblikk()); const o = JSON.parse(fra.pop()); L.plan = o.plan; L.nestePlan = o.nestePlan; valgtPlan = null; lagre(); bygg3dPåNytt(); skitten = true; if (meny) visMeny(); return true; }
  const maler = () => { try { return JSON.parse(localStorage.getItem(MALER)) || []; } catch (e) { return []; } };
  const lagreMaler = m => { try { localStorage.setItem(MALER, JSON.stringify(m)); } catch (e) { /* privat vindu */ } };
  function lagreMal(navn) { const S = spill(); const m = maler(); m.push(LB.tilMal(L, S.leir.x, S.leir.y, navn || `Mal ${m.length + 1}`)); lagreMaler(m); return m.length; }
  // Bygger skissene i planen (alle eller pids) og kjøper det som mangler av materialer for hver (kjøp = true)
  function byggFraPlan(pids, kjøp) {
    let n = 0, sist = null; husk();
    for (const a of L.plan.slice()) { if (pids && !pids.includes(a.pid)) continue;
      const B = LB.BYGG[a.type], k = LB.kostnad(a.type, B.linje ? LB.lengde(a.punkter, a.lukket) : 0, bonus());
      if (kjøp && !LB.harMat(L, k.mat) && !kjøpManglende(k.mat)) { sist = 'Fikk ikke kjøpt materialene.'; break; }
      const r = LB.byggPlan(L, OppstartSpill.betal, bonus(), {}, [a.pid]); if (r.feil.length) { sist = r.feil[0][1]; if (/penger/.test(sist)) break; continue; } n++; }
    if (!n) angre.pop();
    logg(n ? `${n} bygg fra planen er bestilt.${sist ? ' Resten venter: ' + sist : ''}` : sist || 'Ingenting å bygge.');
    lagre(); bygg3dPåNytt(true); skitten = true; if (meny) visMeny(); return n;
  }

  // ---------- strøm og sol ----------
  let siste = { prod: 0, kapasitet: 0, behov: 0, mangler: new Set(), sol: 0, kø: 0, aktive: 0 };
  function solNå() {
    const h = (6 + tid / TIME) % 24, V = window.VAER, e = V && window.Vaer ? Vaer.solHøyde(V.dag, h) : 40 * Math.cos((h - 13) / 12 * Math.PI);
    return Math.max(0, Math.min(1, e / 25)) * (V ? 1 - .7 * Math.max(0, (V.sky - .3) / .7) : 1);
  }
  const kw = v => v.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
  function visStatus() {
    st.hidden = !L || !L.bygg.length; if (st.hidden) return;
    const m = siste.mangler.size; document.getElementById('sStrom').textContent = `${kw(siste.prod)}/${kw(siste.behov)} kW` + (m ? ' ⚠' : '');
  }
  const HVA = { bygg: 'bygges', oppgrader: 'oppgraderes', flytt: 'flyttes', reparer: 'repareres' };
  const skadeMeldt = new Set();
  KROKER.sim.push(dt => {
    if (!L || !spill()) return;
    siste = LB.steg(L, dt, solNå());
    for (const b of siste.nyFerdig) { if (!LB.BYGG[b.type].del) logg(`${LB.BYGG[b.type].navn} er ferdig bygget.`); bygg3dPåNytt(); }
    for (const [b, hva] of siste.ferdigArbeid) { logg(`${LB.BYGG[b.type].navn} er ${{ oppgrader: `oppgradert til nivå ${b.nivå}`, flytt: 'flyttet', reparer: 'reparert' }[hva]}.`); bygg3dPåNytt(hva === 'flytt'); }
    // fiender inne i leiren skader byggene: 8 % per spilltime per fiendtlig lag innen 120 m
    for (const e of ENHETER) { if (e.side === 'blå' || !levende(e)) continue;
      for (const b of L.bygg.slice()) { if (!LB.ferdig(b) || Math.hypot(e.x - b.x, e.y - b.y) > 120) continue;
        const r = LB.skade(L, b.id, .08 * dt / 60);
        if (r === 'ødelagt') { const tapt = Math.max(0, L.drivstoff - LB.kapasitet(L));
          logg(`${LB.BYGG[b.type].navn} er ødelagt av ${e.navn}!` + (tapt >= 1 ? ` ${Math.round(tapt).toLocaleString('nb-NO')} l drivstoff gikk tapt.` : '')); bygg3dPåNytt(); lagre(); }
        else if (!skadeMeldt.has(b.id)) { skadeMeldt.add(b.id); logg(`${e.navn} skader ${LB.BYGG[b.type].navn.toLowerCase()} i leiren!`); } } }
    akk += dt; if (akk >= 10 || siste.nyFerdig.length || siste.ferdigArbeid.length) { akk = 0; lagre(); }
    if (performance.now() - (sist || 0) > 1000) { sist = performance.now(); visStatus(); if (meny) visMeny(); if (valgtBygg && !plassering) visByggPanel(); skitten = true; }
  });

  // ---------- menyen ----------
  // Menyen tegnes på nytt hvert sekund (strøm, kø): behold plassen du har bladd til (brukeren 11. nov: «lar meg ikke bla ned»)
  function visMeny() {
    const S = spill(), rulle = menyEl.scrollTop; menyEl.innerHTML = '';
    const kap = LB.kapasitet(L), plass = LB.lagerplass(L);
    const status = el('div', { klasse: 'status' },
      `Kassa: ${LB.kroner(S.penger)}`, el('br'),
      `Strøm: ${kw(siste.prod)} kW brukt av ${kw(siste.behov)} kW behov (kan gi ${kw(siste.kapasitet)} kW)`, el('br'),
      siste.mangler.size ? el('span', { style: 'color:#e88a6a' }, `${siste.mangler.size} bygg mangler strøm`) : 'Alle bygg har strøm', el('br'),
      `Drivstoff: ${Math.floor(L.drivstoff).toLocaleString('nb-NO')} l av ${kap.toLocaleString('nb-NO')} l · Sengeplasser: ${LB.plasser(L)}`);
    const kjøp = knapp(`Kjøp 500 l drivstoff (${LB.kroner(500 * LB.DRIVSTOFF.prisPerLiter)})`, () => {
      const r = LB.kjøpDrivstoff(L, 500, OppstartSpill.betal); logg(r.feil || `Kjøpte ${r.liter} l drivstoff for ${LB.kroner(r.pris)}.`); lagre(); visMeny(); });
    kjøp.disabled = kap - L.drivstoff < 1;
    const hode = el('div', { klasse: 'hode' }, knapp('×', () => leirKnapp.onclick(), { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Leiren'), status, el('div', { style: 'margin-top:6px' }, kjøp));
    // folket og oppgavene (spill/folk-visning.js)
    if (window.FolkSpill) hode.appendChild(FolkSpill.menyRad());
    // materialene: lager og kjøp
    hode.appendChild(el('h3', {}, `Materialer (lager ${plass} av hvert)`));
    for (const [k, M] of Object.entries(LB.MATERIALER)) {
      const b = knapp(`+10 (${LB.kroner(10 * M.pris)})`, () => { const r = LB.kjøpMateriale(L, k, 10, OppstartSpill.betal); logg(r.feil || `Kjøpte ${String(r.mengde).replace('.', ',')} ${M.enhet} ${M.navn.toLowerCase()} for ${LB.kroner(r.pris)}.`); lagre(); visMeny(); });
      b.disabled = (L.lager[k] || 0) >= plass;
      hode.appendChild(el('div', { klasse: 'mat' }, el('span', {}, `${M.navn}: ${String(Math.round((L.lager[k] || 0) * 10) / 10).replace('.', ',')} ${M.enhet}`), b));
    }
    // byggelag og køen
    const J = LB.jobber(L), lag = LB.byggelag(L);
    hode.appendChild(el('h3', {}, L.folk ? `Byggelag: ${lag} (to på «bygg» = ett lag)` : `Byggelag: ${lag} (ett + ett per brakke)`));
    // delene i byggesettet (ofte mange) står samlet på én linje
    const del = J.filter(j => LB.BYGG[j.b.type].del), delAktive = J.slice(0, lag).filter(j => LB.BYGG[j.b.type].del).length;
    J.forEach((j, i) => { if (!LB.BYGG[j.b.type].del) hode.appendChild(el('div', { klasse: 'igang' }, `${LB.BYGG[j.b.type].navn} ${HVA[j.hva]} – ` + (i < lag ? `${Math.round(LB.framdrift(j.b) * 100)} % (${tidTekst(j.hva === 'bygg' ? j.b.igjen : j.b.arbeid.igjen)} igjen)` : 'venter i kø'))); });
    if (del.length) hode.appendChild(el('div', { klasse: 'igang' }, `Byggesettet: ${del.length} deler – ${delAktive} bygges nå, ${del.length - delAktive} i kø (${tidTekst(del.reduce((s, j) => s + (j.hva === 'bygg' ? j.b.igjen : j.b.arbeid.igjen), 0))} arbeid igjen)`));
    if (!J.length) hode.appendChild(el('div', { klasse: 'igang' }, 'Ingen jobber.'));
    // planen: gratis skisser, hva de koster, bygg alle, angre, maler
    const pk = LB.planKostnad(L, bonus()), mangler = matPris(pk.mat);
    hode.appendChild(el('h3', {}, 'Planlegg leiren'));
    hode.appendChild(el('div', { klasse: 'igang' }, planModus ? 'Planlegging er på: «Planlegg» legger gratis skisser (blå) som holder plassen.' : 'Slå på planlegging for å tegne leiren først og bygge senere.'));
    const rad = (...k) => el('div', { klasse: 'mat' }, ...k);
    hode.appendChild(rad(knapp(planModus ? 'Planlegging: på' : 'Planlegging: av', () => { planModus = !planModus; visMeny(); }, { id: 'planmodus' }),
      knapp('↶ Angre', () => angreEn(angre, gjørOm), { id: 'angre', ...(angre.length ? {} : { disabled: '' }) }), knapp('↷ Gjør om', () => angreEn(gjørOm, angre), gjørOm.length ? {} : { disabled: '' })));
    if (pk.antall) {
      hode.appendChild(el('div', { klasse: 'igang' }, `Planen: ${pk.antall} bygg, ${LB.kroner(pk.pris)}, ${tidTekst(pk.timer * 60)} byggetid i alt` + (matTekst(pk.mat) ? ` · ${matTekst(pk.mat)}` : '') + (mangler ? ` (materialer mangler for ${LB.kroner(mangler)})` : '')));
      hode.appendChild(rad(knapp(`Bygg hele planen (${LB.kroner(pk.pris + mangler)})`, () => byggFraPlan(null, true), { id: 'byggplan' }),
        knapp('Tøm planen', () => { if (!confirm('Fjerne alle skissene i planen?')) return; husk(); L.plan = []; lagre(); bygg3dPåNytt(); skitten = true; visMeny(); })));
    }
    hode.appendChild(rad(knapp('Lagre leiren som mal', () => { const n = prompt('Navn på malen:', `Leir ${maler().length + 1}`); if (n === null) return; lagreMal(n); logg(`Malen «${n}» er lagret.`); visMeny(); }, (L.bygg.length || L.plan.length) ? {} : { disabled: '' })));
    maler().forEach((m, i) => hode.appendChild(rad(el('span', {}, `${m.navn} (${m.bygg.length} bygg)`),
      knapp('Sett inn', () => startMal(i)), knapp('Slett', () => { if (!confirm(`Slette malen «${m.navn}»?`)) return; const a = maler(); a.splice(i, 1); lagreMaler(a); visMeny(); }))));
    // andre deler kan legge til sitt eget i menyen (LEIR_MENY: (hode, { el, knapp }) => void): materialer fra verden, byggesettet
    for (const f of window.LEIR_MENY || []) try { f(hode, { el, knapp }); } catch (e) { console.error(e); }
    const liste = el('div', { klasse: 'liste' });
    for (const [id, B] of Object.entries(LB.BYGG)) {
      if (B.del) continue;
      const k = LB.kostnad(id, 1, bonus()), pris = B.linje ? `${LB.kroner(B.prisPerMeter)} per meter` : `${LB.kroner(k.pris)} · ${tidTekst(k.timer * 60)}`;
      const strøm = B.kw > 0 ? ` · gir ${kw(B.kw)} kW` : B.kw < 0 ? ` · bruker ${kw(-B.kw)} kW` : '', nv = B.nivå ? ` · ${Object.values(B.nivå)[0].length} nivåer` : '';
      const b = knapp(planModus ? 'Planlegg' : 'Bygg', () => startPlassering(id, null, { plan: planModus })); b.disabled = !planModus && !B.linje && S.penger < k.pris;
      liste.appendChild(el('div', { klasse: 'bygg' }, el('div', {}, el('b', {}, B.navn), el('small', {}, pris + strøm + nv), el('small', {}, (B.linje ? 'per meter: ' : '') + matTekst(k.mat)), el('small', {}, B.tekst)), b));
    }
    menyEl.append(hode, liste); menyEl.scrollTop = rulle;
  }
  const tidTekst = min => min >= 60 ? `${kw(min / 60)} t` : `${Math.ceil(min)} min`;

  // ---------- plassering (nye bygg og flytting) ----------
  // ny: { type, ret, x, y, punkter (gjerde), lukket, flytt: id }
  // o: { plan (skisse i planen), pid (flytte en skisse), ret (kopi: samme retning) }
  function startPlassering(type, flytt, o = {}) {
    valgtBygg = null; valgtPlan = null; plassering = { type, ret: 0, x: null, y: null, punkter: LB.BYGG[type].linje ? [] : null, lukket: false, feil: null, flytt: flytt || null, retSatt: false, plan: !!(o.plan || o.pid), pid: o.pid || null };
    if (flytt) { const b = LB.finn(L, flytt); plassering.ret = b.ret; plassering.retSatt = true; }
    if (o.pid) { const a = LB.planFinn(L, o.pid); plassering.ret = a.ret; plassering.retSatt = true; }
    if (o.ret !== undefined) { plassering.ret = o.ret; plassering.retSatt = true; }
    meny = false; menyEl.classList.remove('på'); leirKnapp.classList.remove('på');
    visBanner(LB.BYGG[type].linje ? 'Trykk der gjerdet skal begynne, og så punkt for punkt.' : `Trykk der ${LB.BYGG[type].navn.toLowerCase()} skal ${flytt || o.pid ? 'flyttes' : 'stå'}.`);
  }
  // En mal settes inn i planen: trykk der midten skal være, roter, «Legg i planen»
  function startMal(i) {
    const m = maler()[i]; if (!m) return; valgtBygg = null; valgtPlan = null;
    plassering = { mal: m, type: null, ret: 0, x: null, y: null, feil: null, plan: true };
    meny = false; menyEl.classList.remove('på'); leirKnapp.classList.remove('på'); visBanner(`Trykk der midten av «${m.navn}» skal være.`);
  }
  const avbryt = () => { plassering = null; banner.classList.remove('på'); skisse3d(); skitten = true; };
  function visBanner(tekst, kan, ekstra) {
    banner.innerHTML = ''; banner.classList.add('på'); banner.append(el('div', {}, tekst)); if (ekstra) banner.append(el('small', {}, ekstra));
    const p = plassering;
    if (p && p.type && LB.BYGG[p.type].linje) {
      const a = knapp('Angre punkt', () => { p.punkter.pop(); prøv(); }); a.disabled = !p.punkter.length;
      const r = knapp(p.lukket ? 'Åpent gjerde' : 'Lukk ringen', () => { p.lukket = !p.lukket; prøv(); }); r.disabled = p.punkter.length < 3;
      banner.append(a, r);
    } else if (p && p.x !== null) {
      banner.append(knapp('⟲ 15°', () => roter(1)), knapp('⟳ 15°', () => roter(-1)));
    }
    if (p && !p.mal) banner.append(knapp(rutenett ? 'Rutenett: på' : 'Rutenett: av', () => { rutenett = !rutenett; if (p.x !== null) { p.x = p.rx; p.y = p.ry; } prøv(); }));
    if (p && !p.mal && !LB.BYGG[p.type].linje) banner.append(knapp(inntil ? 'Inntil naboen: på' : 'Inntil naboen: av', () => { inntil = !inntil; prøv(); }));
    if (p && !p.mal && !p.flytt && !p.pid) banner.append(knapp(fortsett ? 'Fortsett: på' : 'Fortsett: av', () => { fortsett = !fortsett; prøv(); }, { title: 'Sett ut flere av samme slag etter hverandre' }));
    if (p && p.plan) { if (kan) banner.append(knapp(p.pid ? 'Flytt skissen hit' : 'Legg i planen', bekreft, { id: 'leggplan' })); }
    else {
      if (kan) banner.append(knapp(p && p.flytt ? 'Flytt hit' : 'Bygg her', bekreft));
      if (kan === 'mat') banner.append(knapp(`Kjøp materialene (${LB.kroner(p.matPris)}) og bygg`, () => { if (kjøpManglende(p.mat)) bekreft(); }));
      if (kan && p && !p.flytt) banner.append(knapp('Legg i planen', () => { p.plan = true; bekreft(); }));
    }
    banner.append(knapp('Avbryt', avbryt));
  }
  async function klasseVed(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false); const [i, j] = Terreng.rute(v, x, y); return v.K[j * v.w + i]; } catch (e) { return undefined; } }
  // Kartets klasse (vann) og eksisterende hus for punktene i bygget (hentes før regelsjekken, som er uten nettverk)
  async function kartFor(punkter) {
    const kl = new Map(), hus = new Set();
    for (const [x, y] of punkter) { kl.set(x + ',' + y, await klasseVed(x, y)); try { const h = await finnBygg(x, y); if (h && pip(h.P, x, y)) hus.add(x + ',' + y); } catch (e) { /* ingen husdata */ } }
    // høyden fra 8 m-rutene (samme nivå uansett hvor langt ut kartet er zoomet), lest mellom rutene
    let hv = null; try { const xs = punkter.map(p => p[0]), ys = punkter.map(p => p[1]); hv = await lagVindu([Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20], false, 11); } catch (e) { hv = null; }
    const høyde = (x, y) => { if (!hv) return null; const fx = (x - hv.x0) / hv.r - .5, fy = (hv.y0 - y) / hv.r - .5, i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
      if (i < 0 || j < 0 || i + 1 >= hv.w || j + 1 >= hv.h) return null; const H = (ii, jj) => hv.H[jj * hv.w + ii];
      const z = H(i, j) * (1 - a) * (1 - b) + H(i + 1, j) * a * (1 - b) + H(i, j + 1) * (1 - a) * b + H(i + 1, j + 1) * a * b; return z === z ? z : null; };
    return { klasse: (x, y) => kl.get(x + ',' + y), iHus: (x, y) => hus.has(x + ',' + y), høyde };
  }
  const pip = (P, x, y) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; };
  const sp = p => (LB.BYGG[p.type].linje ? { type: p.type, punkter: p.punkter, lukket: p.lukket } : { type: p.type, x: p.x, y: p.y, ret: p.ret });
  // rutenett: 2,5 m fra midten av leiren og 15°; nærmeste nabo (innen 60 m) gir retningen når du ikke har rotert selv; porter festes i gjerdet
  function juster(p) {
    if (LB.BYGG[p.type].linje || p.x === null) return; const S = spill(); p.festet = null;
    if (LB.BYGG[p.type].port) { const f = LB.festTilGjerde(L, p.rx, p.ry); if (f) { p.x = f.x; p.y = f.y; p.ret = f.ret; p.festet = true; return; } }
    if (!p.retSatt) { const n = L.bygg.filter(b => !LB.BYGG[b.type].linje && !LB.BYGG[b.type].del && b.id !== p.flytt).sort((a, b) => Math.hypot(a.x - p.rx, a.y - p.ry) - Math.hypot(b.x - p.rx, b.y - p.ry))[0];
      if (n && Math.hypot(n.x - p.rx, n.y - p.ry) < 60) p.ret = n.ret; }
    if (rutenett) { const g = 2.5, ox = S.leir.x, oy = S.leir.y; p.x = ox + Math.round((p.rx - ox) / g) * g; p.y = oy + Math.round((p.ry - oy) / g) * g; p.ret = Math.round(p.ret / (Math.PI / 12)) * Math.PI / 12; }
    else { p.x = p.rx; p.y = p.ry; }
    // inntil naboen: 2 m mellomrom eller på linje med kanten/midten (Leir.snapp), med hjelpelinjer i kartet
    const sn = LB.snapp(L, { type: p.type, x: p.x, y: p.y, ret: p.ret }, { unntatt: p.flytt, unntattPid: p.pid, gap: inntil ? 2 : 0, rad: inntil ? 3 : 0 });
    if (inntil) { p.x = sn.x; p.y = sn.y; p.linjer = sn.linjer; } else p.linjer = [];
    p.nabo = sn.nabo || null; p.avstand = sn.nabo ? LB.snapp(L, { type: p.type, x: p.x, y: p.y, ret: p.ret }, { unntatt: p.flytt, unntattPid: p.pid, rad: 1e-9 }).avstand : null;
  }
  function roter(r) { const p = plassering; if (!p) return; p.ret += r * Math.PI / 12; p.retSatt = true; prøv(); }
  const mål = t => { const f = LB.BYGG[t].fot; return `${String(Math.round((f[1] - f[0]) * 10) / 10).replace('.', ',')} × ${String(Math.round((f[3] - f[2]) * 10) / 10).replace('.', ',')} m`; };
  const navnPå = q => (q ? (q.pid ? 'planlagt ' : '') + LB.BYGG[q.type].navn.toLowerCase() : '');
  async function prøv() {
    const p = plassering; if (!p) return;
    if (p.mal) {
      if (p.x === null) { visBanner(`Trykk der midten av «${p.mal.navn}» skal være.`); skitten = true; return; }
      // hvert bygg i malen sjekkes mot kartet (vann, hus, bratt grunn) slik som ved vanlig plassering – før ble malen lagt rett i vannet
      const nøkkel = p.x + ',' + p.y + ',' + p.ret, deler = LB.fraMal(p.mal, p.x, p.y, p.ret); p.sjekket = null; p.feil = 'Sjekker kartet …'; visBanner(p.feil);
      for (const b of deler) { const pk = LB.BYGG[b.type].linje ? LB.gjerdePunkter(b.punkter, b.lukket) : [...LB.hjørner(b), [b.x, b.y]]; b.kart = await kartFor(pk);
        if (plassering !== p || nøkkel !== p.x + ',' + p.y + ',' + p.ret) return; b.feil = LB.kanBygge(L, b, b.kart); }
      p.deler = deler; p.sjekket = nøkkel;
      const ok = p.deler.filter(b => !b.feil).length; p.feil = ok ? null : 'Ingenting får plass her.';
      visBanner(`«${p.mal.navn}»: ${ok} av ${p.deler.length} bygg får plass` + (ok < p.deler.length ? ' (de røde hoppes over)' : '') + '.', !!ok); skisse3d(); skitten = true; return;
    }
    const B = LB.BYGG[p.type];
    if (B.linje && p.punkter.length < 2) { visBanner(p.punkter.length ? 'Trykk der neste punkt skal være.' : 'Trykk der gjerdet skal begynne.'); skisse3d(); skitten = true; return; }
    juster(p); const b = sp(p);
    const punkter = B.linje ? LB.gjerdePunkter(p.punkter, p.lukket) : [...LB.hjørner(b), [b.x, b.y]], v = await kartFor(punkter);
    if (plassering !== p) return;
    p.feil = LB.kanBygge(L, b, v, p.flytt, { planUnntatt: p.pid }); p.kart = v;
    const k = LB.kostnad(p.type, B.linje ? LB.lengde(p.punkter, p.lukket) : 0, bonus()); p.mat = p.flytt ? {} : k.mat; p.matPris = matPris(p.mat);
    const harMat = LB.harMat(L, p.mat), pris = p.flytt ? Math.round(B.pris * LB.REGLER.flyttPris) : k.pris;
    const tekst = p.feil || (p.flytt ? `Flytte ${B.navn.toLowerCase()}: ${LB.kroner(pris)}, ferdig om ${tidTekst(B.tid * LB.REGLER.flyttTid / (bonus().bygg || 1) * 60)}.`
      : `${p.pid ? 'Skisse: ' : p.plan ? 'Planlegg ' : ''}${B.navn}: ${LB.kroner(k.pris)}, ferdig om ${tidTekst(k.timer * 60)}` + (B.linje ? ` (${Math.round(LB.lengde(p.punkter, p.lukket))} m${p.lukket ? ', lukket ring' : ''})` : '') + (p.festet ? ' – festet i gjerdet' : '') + '.');
    const plass = !B.linje ? `${mål(p.type)}` + (p.avstand !== null && p.avstand !== undefined ? ` · ${String(Math.round(p.avstand * 10) / 10).replace('.', ',')} m til ${navnPå(p.nabo)}` : '') + (p.linjer && p.linjer.length ? ' · på linje' : '') : null;
    const ekstra = [plass, !p.feil && !p.flytt && !p.plan && matTekst(p.mat) ? `Materialer: ${matTekst(p.mat)}` + (harMat ? '' : ` – mangler for ${LB.kroner(p.matPris)}`) : null].filter(Boolean).join(' · ') || null;
    visBanner(tekst, p.feil ? false : (harMat || p.plan) ? true : 'mat', ekstra); skisse3d(); skitten = true;
  }
  function trykk(X, Y) {
    if (plassering) {
      const p = plassering; if (!p.mal && LB.BYGG[p.type].linje) p.punkter.push([X, Y]); else { p.rx = X; p.ry = Y; p.x = X; p.y = Y; }
      prøv(); return true;
    }
    if (!L) return false;
    // et eget lag nær trykket går foran (ikke åpne byggpanelet når du vil velge laget)
    if (ENHETER.some(s => s.side === 'blå' && Math.hypot(s.x - X, s.y - Y) / kam.m < 22 && !på3d)) return false;
    const b = byggVed(X, Y);
    if (!b) { const a = byggVed(X, Y, L.plan); if (a) { valgtBygg = null; valgtPlan = a.pid; visPlanPanel(); skitten = true; return true; } }
    if (!b) { if (valgtBygg || valgtPlan) { valgtBygg = null; valgtPlan = null; banner.classList.remove('på'); skitten = true; } return false; }
    valgtPlan = null; valgtBygg = b.id; visByggPanel(); skitten = true; return true;
  }
  function byggVed(X, Y, liste) {
    for (const b of liste || L.bygg) { const B = LB.BYGG[b.type];
      if (B.linje) { const P = b.lukket ? [...b.punkter, b.punkter[0]] : b.punkter; for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / l2)); if (Math.hypot(X - ax - dx * t, Y - ay - dy * t) < 3) return b; } }
      else if (pip(LB.hjørner(b), X, Y)) return b; }
    return null;
  }
  KROKER.trykk.push(trykk); KROKER.trykk3d.push(trykk);
  function bekreft() {
    const p = plassering; if (!p || p.feil) return;
    if (p.mal) { if (p.sjekket !== p.x + ',' + p.y + ',' + p.ret) return; husk(); let nr = 0;
      const r = LB.planMal(L, p.mal, p.x, p.y, p.ret, () => (p.deler[nr++] || {}).kart || {});
      if (!r.lagt.length) { angre.pop(); visBanner('Ingenting fikk plass her.'); return; }
      logg(`«${p.mal.navn}» lagt i planen: ${r.lagt.length} skisser${r.feil.length ? `, ${r.feil.length} fikk ikke plass` : ''}.`); return ferdigPlassert(p); }
    if (p.plan) { husk(); const r = p.pid ? LB.planFlytt(L, p.pid, { x: p.x, y: p.y, ret: p.ret }, p.kart || {}) : LB.planLegg(L, sp(p), p.kart || {});
      if (r.feil) { angre.pop(); visBanner(r.feil); return; } if (!p.pid) logg(`${LB.BYGG[p.type].navn} lagt i planen.`); return ferdigPlassert(p); }
    if (p.flytt) { const r = LB.flytt(L, p.flytt, { x: p.x, y: p.y, ret: p.ret }, OppstartSpill.betal, bonus(), p.kart || {}); if (r.feil) { visBanner(r.feil); return; }
      logg(`${LB.BYGG[p.type].navn} flyttes: ${LB.kroner(r.pris)}.`); }
    else { const r = LB.bygg(L, sp(p), OppstartSpill.betal, bonus(), p.kart || {}); if (r.feil) { visBanner(r.feil); return; }
      const kø = LB.jobber(L).length > LB.byggelag(L);
      logg(`${LB.BYGG[p.type].navn} bestilt: ${LB.kroner(r.bygg.pris)}, ${tidTekst(r.bygg.totalt)} byggetid${kø ? ' – venter i kø på et ledig byggelag' : ''}.`); }
    ferdigPlassert(p);
  }
  // Etter et bygg eller en skisse: med «Fortsett» står samme bygg klart (samme retning), ellers er plasseringen ferdig
  function ferdigPlassert(p) {
    lagre(); visStatus(); bygg3dPåNytt(!p.plan); skitten = true; if (meny) visMeny();
    if (fortsett && !p.mal && !p.flytt && !p.pid && !LB.BYGG[p.type].linje) { plassering = { ...p, x: null, y: null, rx: null, ry: null, feil: null, linjer: [], retSatt: true };
      visBanner(`Trykk der neste ${LB.BYGG[p.type].navn.toLowerCase()} skal stå (Fortsett er på).`); skisse3d(); return; }
    plassering = null; banner.classList.remove('på'); skisse3d();
  }

  // ---------- byggpanelet (trykk på et bygg) ----------
  function visByggPanel() {
    const b = valgtBygg && LB.finn(L, valgtBygg); if (!b) { valgtBygg = null; banner.classList.remove('på'); return; }
    const B = LB.BYGG[b.type], e = LB.effekt(b), ok = LB.oppgraderKostnad(b, bonus()), rk = LB.reparerKostnad(b, bonus());
    const status = b.igjen > 0 ? `bygges ${Math.round(LB.framdrift(b) * 100)} %` : b.arbeid ? `${HVA[b.arbeid.hva]} ${Math.round(LB.framdrift(b) * 100)} %` : siste.mangler.has(b.id) ? 'uten strøm' : 'i drift';
    const verdier = [e.kw > 0 ? `gir ${kw(e.kw)} kW` : null, e.plasser ? `${e.plasser} senger` : null, B.nivå && B.nivå.liter ? `${LB.BYGG.drivstofftank.nivå.liter[(b.nivå || 1) - 1].toLocaleString('nb-NO')} l` : null,
      e.lager ? `lager +${e.lager}` : null, e.rekkevidde ? (e.rekkevidde >= 1000 ? `${e.rekkevidde / 1000} km radio` : `${e.rekkevidde} m`) : null].filter(Boolean).join(' · ');
    banner.innerHTML = ''; banner.classList.add('på');
    banner.append(el('div', {}, el('b', {}, B.navn + (LB.maksNivå(b.type) > 1 ? ` (nivå ${b.nivå})` : '')), ` – ${status}, ${Math.round(b.hp * 100)} % helt`), verdier ? el('small', {}, verdier) : '');
    if (ok) { const k = knapp(`Oppgrader til nivå ${ok.til} (${LB.kroner(ok.pris)})`, () => { const r = LB.oppgrader(L, b.id, OppstartSpill.betal, bonus());
        if (r.feil && r.mangler && confirm(`${r.feil} Kjøpe det som mangler for ${LB.kroner(matPris(r.mangler))}?`) && kjøpManglende(r.mangler)) return k.onclick();
        logg(r.feil || `${B.navn} oppgraderes til nivå ${r.til}.`); lagre(); visByggPanel(); });
      k.disabled = b.igjen > 0 || !!b.arbeid; banner.appendChild(k); }
    if (rk) { const k = knapp(`Reparer (${LB.kroner(rk.pris)})`, () => { const r = LB.reparer(L, b.id, OppstartSpill.betal, bonus()); logg(r.feil || `${B.navn} repareres.`); lagre(); visByggPanel(); }); k.disabled = !!b.arbeid; banner.appendChild(k); }
    if (!B.linje && !B.del) { const k = knapp(`Flytt (${LB.kroner(Math.round(B.pris * LB.REGLER.flyttPris))})`, () => startPlassering(b.type, b.id)); k.disabled = b.igjen > 0 || !!b.arbeid; banner.appendChild(k);
      banner.appendChild(knapp('Kopier', () => startPlassering(b.type, null, { ret: b.ret, plan: planModus }), { title: 'Sett ut et likt bygg med samme retning' })); }
    banner.appendChild(knapp(`Riv (+${LB.kroner(Math.round(b.pris * (b.igjen > 0 ? LB.REGLER.rivUferdig : LB.REGLER.rivFerdig)))})`, () => {
      // drivstoff som ikke får plass i de andre tankene når denne rives, selges tilbake (Leir.riv) – si fra før og etter
      const over = Math.max(0, L.drivstoff - LB.kapasitet({ bygg: L.bygg.filter(q => q !== b) })), liter = v => Math.round(v).toLocaleString('nb-NO');
      if (!confirm(`Rive ${B.navn.toLowerCase()}?` + (over >= 1 ? ` ${liter(over)} l drivstoff får ikke plass i de andre tankene og selges tilbake for ${LB.kroner(Math.round(over * LB.DRIVSTOFF.prisPerLiter))}.` : ''))) return;
      const r = LB.riv(L, b.id); OppstartSpill.gi(r.penger);
      logg(`${B.navn} er revet. ${LB.kroner(r.bygg)} tilbake${r.uferdig ? ', og materialene' : ''}.` + (r.drivstoff >= 1 ? ` ${liter(r.drivstoff)} l drivstoff uten plass er solgt tilbake for ${LB.kroner(r.drivstoffPenger)}.` : '')); valgtBygg = null; banner.classList.remove('på'); lagre(); bygg3dPåNytt(); skitten = true; }));
    banner.appendChild(knapp('Lukk', () => { valgtBygg = null; banner.classList.remove('på'); skitten = true; }));
  }

  // Panelet for en skisse i planen: bygg nå, flytt, kopier, fjern
  function visPlanPanel() {
    const a = valgtPlan && LB.planFinn(L, valgtPlan); if (!a) { valgtPlan = null; banner.classList.remove('på'); return; }
    const B = LB.BYGG[a.type], k = LB.kostnad(a.type, B.linje ? LB.lengde(a.punkter, a.lukket) : 0, bonus()), mp = matPris(k.mat);
    banner.innerHTML = ''; banner.classList.add('på');
    banner.append(el('div', {}, el('b', {}, `Planlagt ${B.navn.toLowerCase()}`), ` – ${LB.kroner(k.pris)}, ${tidTekst(k.timer * 60)}`), matTekst(k.mat) ? el('small', {}, `Materialer: ${matTekst(k.mat)}` + (mp ? ` – mangler for ${LB.kroner(mp)}` : '')) : '');
    banner.appendChild(knapp(`Bygg nå (${LB.kroner(k.pris + mp)})`, () => { valgtPlan = null; banner.classList.remove('på'); byggFraPlan([a.pid], true); }, { id: 'byggskisse' }));
    if (!B.linje) banner.appendChild(knapp('Flytt', () => startPlassering(a.type, null, { pid: a.pid })));
    if (!B.linje) banner.appendChild(knapp('Kopier', () => startPlassering(a.type, null, { plan: true, ret: a.ret })));
    banner.appendChild(knapp('Fjern', () => { husk(); LB.planFjern(L, a.pid); valgtPlan = null; banner.classList.remove('på'); lagre(); bygg3dPåNytt(); skitten = true; if (meny) visMeny(); }));
    banner.appendChild(knapp('Lukk', () => { valgtPlan = null; banner.classList.remove('på'); skitten = true; }));
  }
  // tastene mens du plasserer (ikke når du går selv eller skriver): R/Q roterer, Enter bygger, Esc avbryter; Ctrl+Z / Ctrl+Y i planen
  window.addEventListener('keydown', e => {
    if (!L || (r3() && R3.fot) || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'y')) { if (angreEn(k === 'z' ? angre : gjørOm, k === 'z' ? gjørOm : angre)) e.preventDefault(); return; }
    const p = plassering; if (!p) return;
    if (k === 'r' || k === 'q') { roter(k === 'r' ? -1 : 1); e.preventDefault(); }
    else if (k === 'enter') { bekreft(); e.preventDefault(); }
    else if (k === 'escape') { avbryt(); e.preventDefault(); }
  });

  // ---------- kartet ----------
  function farge() { const S = spill(); return S ? Oppstart.hovedfarge(S.fraksjon.flagg) : '#5b7ea8'; }
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!L) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    const linje = (ledd, farge2, stipl) => { g.save(); g.strokeStyle = farge2; g.lineWidth = Math.max(1.5, 1.2 / m); if (stipl) g.setLineDash([6, 3]);
      for (const [a, b] of ledd) { g.beginPath(); g.moveTo(sx(a[0]), sy(a[1])); g.lineTo(sx(b[0]), sy(b[1])); g.stroke(); } g.restore(); };
    const tegn1 = (b, skisse, ok) => {
      const B = LB.BYGG[b.type];
      if (B.linje) { if (!b.punkter || !b.punkter.length) return;
        if (skisse) { const P = b.lukket ? [...b.punkter, b.punkter[0]] : b.punkter, ledd = []; for (let i = 1; i < P.length; i++) ledd.push([P[i - 1], P[i]]);
          linje(ledd, ok ? '#7fd17a' : '#e0604a', true); for (const q of b.punkter) { g.fillStyle = '#f0d79a'; g.beginPath(); g.arc(sx(q[0]), sy(q[1]), 4, 0, 6.283); g.fill(); } return; }
        linje(LB.gjerdeLedd(L, b), b.id === valgtBygg ? '#f0d79a' : LB.ferdig(b) ? '#cfc6b0' : 'rgba(207,198,176,.5)', !LB.ferdig(b)); return; }
      const P = LB.hjørner(b).map(([x, y]) => [sx(x), sy(y)]); if (P.every(([x, y]) => x < -50 || y < -50 || x > VW + 50 || y > VH + 50)) return;
      g.save(); g.beginPath(); g.moveTo(...P[0]); for (const q of P.slice(1)) g.lineTo(...q); g.closePath();
      g.fillStyle = skisse ? (ok ? 'rgba(110,200,105,.45)' : 'rgba(224,96,74,.45)') : farge(); g.globalAlpha = skisse ? 1 : LB.virker(b) ? .85 : .35 + .5 * LB.framdrift(b); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = b.id === valgtBygg ? '#f0d79a' : siste.mangler.has(b.id) || b.hp < .5 ? '#e0604a' : '#efe6cf'; g.lineWidth = b.id === valgtBygg ? 2.5 : 1.2; g.stroke();
      if (m < 1.2) { g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2ead6'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3;
        const J = LB.jobber(L), i = J.findIndex(j => j.b === b), kø = i >= LB.byggelag(L);
        const t = B.navn + ((b.nivå || 1) > 1 ? ` ${b.nivå}` : '') + (i >= 0 ? (kø ? ' (kø)' : ` ${Math.round(LB.framdrift(b) * 100)} %`) : '') + (b.hp < 1 ? ` · ${Math.round(b.hp * 100)} % helt` : '');
        g.strokeText(t, sx(b.x), sy(b.y) + 4); g.fillText(t, sx(b.x), sy(b.y) + 4); }
      g.restore(); };
    for (const b of L.bygg) if (b.id !== (plassering && plassering.flytt) && !LB.BYGG[b.type].del) tegn1(b, false);
    // planen: blå stiplede omriss med navnet
    g.save(); g.setLineDash([5, 4]);
    for (const a of L.plan || []) { if (plassering && a.pid === plassering.pid) continue; const B = LB.BYGG[a.type]; g.strokeStyle = a.pid === valgtPlan ? '#f0d79a' : '#8fc2ef'; g.lineWidth = a.pid === valgtPlan ? 2.5 : 1.6;
      const P = B.linje ? (a.lukket ? [...a.punkter, a.punkter[0]] : a.punkter) : [...LB.hjørner(a), LB.hjørner(a)[0]];
      g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); if (!B.linje) { g.fillStyle = 'rgba(110,160,220,.18)'; g.fill(); } g.stroke();
      if (!B.linje && m < 1.2) { g.setLineDash([]); g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#cfe4f7'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; const t = 'plan: ' + B.navn;
        g.strokeText(t, sx(a.x), sy(a.y) + 4); g.fillText(t, sx(a.x), sy(a.y) + 4); g.setLineDash([5, 4]); } }
    g.restore();
    const p = plassering;
    if (p && p.mal && p.deler) for (const d of p.deler) tegn1(d, true, !d.feil);
    else if (p && (p.x !== null || (p.punkter && p.punkter.length))) {
      tegn1(sp(p), true, !p.feil);
      // hjelpelinjene når bygget ligger på linje med naboen
      if (p.linjer && p.linjer.length) { g.save(); g.strokeStyle = '#f0d79a'; g.lineWidth = 1.2; g.setLineDash([3, 3]);
        for (const [x0, y0, x1, y1] of p.linjer) { g.beginPath(); g.moveTo(sx(x0), sy(y0)); g.lineTo(sx(x1), sy(y1)); g.stroke(); } g.restore(); }
    }
  });

  // ---------- 3D ----------
  // egne enkle modeller (vertex-farger, origo midt på bunnen, fronten mot +x) for byggene som ikke finnes i spill/modeller.js
  const boks = (d, x, y, z, sx, sy, sz, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y, z + sz / 2); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const EGNE = {
    aggregat: () => { const d = []; boks(d, 0, 0, 0, 3.2, 2, .2, [.4, .4, .38]); boks(d, 0, 0, .2, 3, 1.8, 1.7, hex('#4f6a3a')); boks(d, 1.51, 0, .5, .05, 1.4, 1.1, [.15, .15, .15]); boks(d, -1, .5, 1.9, .18, .18, .9, [.2, .2, .2]); return d; },
    solcelle: () => { const d = []; for (const x of [-2.7, 0, 2.7]) { boks(d, x, -1, 0, .1, .1, .8, [.5, .5, .5]); boks(d, x, 1, 0, .1, .1, 1.8, [.5, .5, .5]); }
      const g = new THREE.BoxGeometry(8, 3.6, .08).toNonIndexed(); g.rotateX(-.45); g.translate(0, 0, 1.35); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set([.1, .16, .3], i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); return d; },
    kameramast: () => { const d = []; boks(d, 0, 0, 0, .5, .5, .3, [.45, .45, .43]); boks(d, 0, 0, .3, .15, .15, 6, [.55, .56, .57]); boks(d, .3, 0, 6.1, .6, .25, .25, [.85, .85, .82]); boks(d, .62, 0, 6.15, .05, .16, .16, [.05, .05, .08]); return d; },
    radiomast: () => { const d = [], H = 24; boks(d, 0, 0, 0, 1.4, 1.4, .3, [.45, .45, .43]);
      for (const [x, y] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) boks(d, x, y, .3, .08, .08, H, [.75, .2, .15]);
      for (let z = 2; z < H; z += 3) { boks(d, 0, -.5, z, 1, .06, .06, [.8, .8, .78]); boks(d, 0, .5, z, 1, .06, .06, [.8, .8, .78]); boks(d, -.5, 0, z, .06, 1, .06, [.8, .8, .78]); boks(d, .5, 0, z, .06, 1, .06, [.8, .8, .78]); }
      boks(d, 0, 0, H + .3, .08, .08, 4, [.3, .3, .3]); return d; },
    drivhus: () => { const d = [], ramme = [.82, .84, .82], glass = [.62, .78, .74]; boks(d, 0, 0, 0, 6, 10, .3, [.45, .43, .4]); boks(d, 0, 0, .3, 5.8, 9.8, 2.4, glass);
      for (const sd of [-1, 1]) { const g = new THREE.BoxGeometry(3.3, 9.8, .06).toNonIndexed(); g.rotateY(sd * .55); g.translate(sd * 1.4, 0, 3.4); const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let i = 0; i < n; i++) f.set(glass.map(v => v * 1.08), i * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); d.push(g); }
      for (let y = -4.8; y <= 4.9; y += 1.6) boks(d, 0, y, .3, 6, .08, 2.5, ramme); return d; },
  };
  function modell(b) {
    const B = LB.BYGG[b.type], M = window.MODELLER; if (!M) return null;
    if (EGNE[B.modell]) return M.samle(EGNE[B.modell]());
    if (B.modell === 'port') return M.port(false); if (B.modell === 'verksted') return M.verksted([false, false]); if (B.modell === 'container') return M.container('utstyr');
    if (B.modell === 'sandsekkvoll') return M.sandsekkvoll(8, 2);
    return M[B.modell] ? M[B.modell]() : null;
  }
  // Gjerdet i 3D: et stykke per 10 m som står på bakken og heller med terrenget, med åpninger der portene står
  function gjerde3d(b, u, R, mat) {
    const ut = [];
    for (const [a, c] of LB.gjerdeLedd(L, b)) { const l = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.ceil(l / 10)), ret = Math.atan2(c[1] - a[1], c[0] - a[0]);
      for (let i = 0; i < n; i++) { const x0 = a[0] + (c[0] - a[0]) * i / n, y0 = a[1] + (c[1] - a[1]) * i / n, x1 = a[0] + (c[0] - a[0]) * (i + 1) / n, y1 = a[1] + (c[1] - a[1]) * (i + 1) / n;
        if (Math.abs(x0 - u.cx) > u.S - 5 || Math.abs(y0 - u.cy) > u.S - 5) continue;
        const z0 = (hoyde3d(x0, y0, u) - u.h0) * R.EX, z1 = (hoyde3d(x1, y1, u) - u.h0) * R.EX, m = new THREE.Mesh(MODELLER.gjerde(l / n), mat);
        m.position.set(x0 - u.cx, y0 - u.cy, z0 - .05); m.rotation.order = 'ZXY'; m.rotation.z = ret - Math.PI / 2; m.rotation.x = Math.atan2(z1 - z0, l / n);
        if (!LB.ferdig(b)) m.scale.z = Math.max(.08, LB.framdrift(b)); m.userData.id = b.id; ut.push(m); } }
    return ut;
  }
  let mesh = [], skisse = [];
  function lagLeir3d(u, R) {
    for (const m of mesh) { R.scene.remove(m); m.geometry.dispose(); if (m.userData.plan) m.material.dispose(); } mesh = [];
    if (!L || !window.MODELLER) return; const mat = MODELLER.materiale();
    for (const b of L.bygg) {
      if (LB.BYGG[b.type].linje) { for (const m of gjerde3d(b, u, R, mat)) { R.scene.add(m); mesh.push(m); } continue; }
      const x = b.x - u.cx, y = b.y - u.cy; if (Math.abs(x) > u.S - 5 || Math.abs(y) > u.S - 5) continue;
      let g; try { g = modell(b); } catch (e) { console.error(e); continue; } if (!g) continue;
      const m = new THREE.Mesh(g, mat), z = (hoyde3d(b.x, b.y, u) - u.h0) * R.EX;
      m.position.set(x, y, z - .05); m.rotation.z = b.ret || 0;
      // under bygging: reiser seg etter framdriften (minst en grunnmur); oppgradert: litt større
      m.scale.z = LB.ferdig(b) ? 1 : Math.max(.08, LB.framdrift(b)); const k = 1 + ((b.nivå || 1) - 1) * .08; m.scale.x = m.scale.y = k; m.scale.z *= k;
      m.userData.id = b.id; R.scene.add(m); mesh.push(m);
    }
    // planen: gjennomsiktige blå skisser (gjerdet som stykker)
    if (!(L.plan || []).length) return; const pm = new THREE.MeshBasicMaterial({ color: 0x6fa8dc, transparent: true, opacity: .32, depthWrite: false });
    for (const a of L.plan) {
      if (LB.BYGG[a.type].linje) { for (const m of gjerde3d({ ...a, id: -2, igjen: 0 }, u, R, pm)) { m.material = pm; m.userData.plan = a.pid; R.scene.add(m); mesh.push(m); } continue; }
      const x = a.x - u.cx, y = a.y - u.cy; if (Math.abs(x) > u.S - 5 || Math.abs(y) > u.S - 5) continue;
      let g; try { g = modell(a); } catch (e) { continue; } if (!g) continue;
      const m = new THREE.Mesh(g, pm); m.position.set(x, y, (hoyde3d(a.x, a.y, u) - u.h0) * R.EX + .02); m.rotation.z = a.ret || 0; m.userData.plan = a.pid; R.scene.add(m); mesh.push(m);
    }
  }
  // Skissen i 3D mens du plasserer: selve bygget, gjennomsiktig grønt (kan bygges) eller rødt
  function skisse3d() {
    const R = r3(); if (!R || !R.ut || !window.THREE || !window.MODELLER) return; const u = R.ut;
    for (const m of skisse) { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } skisse = [];
    const p = plassering; if (!p) return;
    if (p.mal) { for (const d of p.deler || []) { if (LB.BYGG[d.type].linje) continue; let g; try { g = modell(d); } catch (e) { g = null; } if (!g) continue;
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: d.feil ? 0xe0604a : 0x7fd17a, transparent: true, opacity: .45, depthWrite: false }));
        m.position.set(d.x - u.cx, d.y - u.cy, (hoyde3d(d.x, d.y, u) - u.h0) * R.EX + .02); m.rotation.z = d.ret; R.scene.add(m); skisse.push(m); } return; }
    const B = LB.BYGG[p.type], ok = !p.feil;
    const mat = new THREE.MeshBasicMaterial({ color: ok ? 0x7fd17a : 0xe0604a, transparent: true, opacity: .45, depthWrite: false });
    if (B.linje) { if (p.punkter.length < 2) { mat.dispose(); return; } for (const m of gjerde3d({ ...sp(p), id: -1, igjen: 0 }, u, R, mat)) { m.material = mat; R.scene.add(m); skisse.push(m); } return; }
    if (p.x === null) { mat.dispose(); return; } let g; try { g = modell({ type: p.type }); } catch (e) { g = null; } if (!g) { mat.dispose(); return; }
    const m = new THREE.Mesh(g, mat); m.position.set(p.x - u.cx, p.y - u.cy, (hoyde3d(p.x, p.y, u) - u.h0) * R.EX + .02); m.rotation.z = p.ret; R.scene.add(m); skisse.push(m);
  }
  // Fjerner trær, steiner og busker inne i byggene (med 5 m margin) og midt i leiren – både når 3D-utsnittet bygges og når et nytt bygg settes opp
  function innenfor(u) {
    const P = (L ? L.bygg : []).filter(b => !LB.BYGG[b.type].linje).map(b => { const B = LB.BYGG[b.type], f = B.fot, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0);
      return [[f[0] - 5, f[2] - 5], [f[1] + 5, f[2] - 5], [f[1] + 5, f[3] + 5], [f[0] - 5, f[3] + 5]].map(([a, d]) => [b.x - u.cx + a * c - d * s, b.y - u.cy + a * s + d * c]); });
    // og en ryddet plass på 30 m rundt midten av leiren (der flagget står)
    const S = spill(), lx = S && S.leir ? S.leir.x - u.cx : 1e9, ly = S && S.leir ? S.leir.y - u.cy : 1e9;
    return (x, y) => Math.hypot(x - lx, y - ly) < 30 || P.some(Q => pip(Q, x, y));
  }
  KROKER.bygg3d.push(async u => {
    if (!L || !spill()) return; const inni = innenfor(u);
    const sil = data => { const ut = []; for (let k = 0; k < data.length; k += 5) if (!inni(data[k], data[k + 1])) for (let q = 0; q < 5; q++) ut.push(data[k + q]); return new Float32Array(ut); };
    if (u.trær) for (const k in u.trær) u.trær[k] = sil(u.trær[k]);
    if (u.smått) { u.smått.stein = sil(u.smått.stein); u.smått.busk = sil(u.smått.busk); }
  });
  function ryddTrær(R) {
    const u = R.ut; if (!u) return; const inni = innenfor(u), null16 = new Float32Array(16);
    for (const t of R.treLOD || []) for (let k = 0; k < t.n; k++) if (inni(t.data[k * 5], t.data[k * 5 + 1])) t.M.set(null16, k * 16);
    R.lodVed = null;
    const mm = new THREE.Matrix4(), v = new THREE.Vector3(), nullM = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const m of [...(R.treMesh || []), ...(R.småMesh || [])]) { if (!m.isInstancedMesh || (R.treLOD || []).some(t => t.nær === m || t.fjern === m)) continue;
      let endret = false; for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, mm); v.setFromMatrixPosition(mm); if (inni(v.x, v.y)) { m.setMatrixAt(k, nullM); endret = true; } }
      if (endret) m.instanceMatrix.needsUpdate = true; }
  }
  KROKER.sett3d.push((u, R) => { lagLeir3d(u, R); skisse = []; skisse3d(); });
  // når et bygg settes opp, flyttes eller blir ferdig: bare leirens nett lages på nytt (og trærne der ryddes)
  function bygg3dPåNytt(nytt) { const R = r3(); if (!R || !R.ut || !window.THREE) return; lagLeir3d(R.ut, R); if (nytt) ryddTrær(R); }
  // byggene vokser mens de bygges (oppdateres hvert sekund)
  setInterval(() => { const R = r3(); if (!R || !L) return; for (const m of mesh) { const b = L.bygg.find(q => q.id === m.userData.id); if (b && b.igjen > 0) m.scale.z = Math.max(.08, LB.framdrift(b)); } }, 1000);

  // ---------- start ----------
  function start() {
    const S = spill(); leirKnapp.hidden = !S; if (!S) return;
    L = les() || LB.ny(); siste = LB.steg(L, 0, solNå()); visStatus(); bygg3dPåNytt();
  }
  window.LeirSpill = { start, tilstand: () => L, startPlassering, trykk, bekreft, prøv, avbryt, plassering: () => plassering, siste: () => siste, lagre, rutenett: v => { rutenett = v; }, velg: id => { valgtBygg = id; visByggPanel(); },
    planModus: v => { if (v !== undefined) planModus = v; return planModus; }, fortsett: v => { if (v !== undefined) fortsett = v; return fortsett; }, inntil: v => { if (v !== undefined) inntil = v; return inntil; },
    angre: () => angreEn(angre, gjørOm), gjørOm: () => angreEn(gjørOm, angre), byggFraPlan, startMal, lagreMal, maler, roter, oppdater3d: bygg3dPåNytt, valgt: () => valgtBygg, visMeny: () => meny && visMeny() };
  // K1 sier fra når spillet er klart (lagret spill lest inn, eller ny leir satt opp)
  window.addEventListener('riksbrudd-spill', start);
})();
