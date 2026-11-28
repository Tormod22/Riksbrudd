/* TIDA – visningen (G2, 28. nov; reglene i spill/tida.js, spolingen i spill/flyt.js). window.TidaSpill.
 *  - «Spol til …»: panelet #spoltil med det som finnes i spillet nå (morgenen, kontraktene, byggingen, angrepet). Åpnes med «▾» ved
 *    ⏭ (PC), langt trykk eller høyreklikk på ⏭ (også telefon), fra tidslinja og fra Leir-menyen (fanen Mål). Farten går til 600× og
 *    stopper selv (FlytSpill.spol(mål)); alarm, fiender nær og kort som venter på svar stopper alltid. Lesepausen i paneler.js virker
 *    som før (600× og spoling).
 *  - AUTOMATISK PAUSE per type (av som standard): angrep, en kontrakt trenger deg, folk står fast – spillet settes på pause (❚❚).
 *  - TIDSLINJA (av som standard): de neste kjente hendelsene i en rolig linje øverst på PC; på telefon står den som en liste i panelet.
 * Valgene lagres i «riksbrudd-tida» (gjelder alle leirer, som valgene i flyt.js). I testene (navigator.webdriver) pauser ingenting av seg
 * selv før TidaSpill.test = true. Tallene er Claudes forslag (se spill/tida.js).
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof KROKER === 'undefined' || !window.Tida) return;
  const T = window.Tida, NØKKEL = 'riksbrudd-tida';
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  let valg = { tidslinje: false, pause: { angrep: false, trenger: false, fast: false } };
  try { const v = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (v) valg = { tidslinje: !!v.tidslinje, pause: { ...valg.pause, ...(v.pause || {}) } }; } catch (e) { /* ingen lagring */ }
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify(valg)); } catch (e) { /* fullt eller sperret */ } };
  const auto = () => !navigator.webdriver || api.test === true;
  const liten = () => document.body.classList.contains('kort') || document.body.classList.contains('smal') || innerWidth < 700;

  // ---------- øyeblikksbildet av spillet (formen står i spill/tida.js) ----------
  function øyeblikk() {
    const o = { tid: typeof tid === 'number' ? tid : 0, kontrakter: [], jobber: [], lag: 1, fart: 1, angrep: null, alarm: false, fast: false };
    try { const S = window.SelskapSpill && SelskapSpill.tilstand && SelskapSpill.tilstand(), sd = S && S.sider && S.sider['blå'];
      if (sd) o.kontrakter = (sd.aktive || []).map(k => { let klar = false; try { klar = !!SelskapSpill.klar(k); } catch (e) { klar = false; } return { id: k.id, tittel: k.tittel || 'Kontrakten', frist: k.frist, klar }; }); } catch (e) { /* selskapet er ikke klart */ }
    try { const L = window.LeirSpill && LeirSpill.tilstand && LeirSpill.tilstand(), LB = window.Leir;
      if (L && LB && LB.jobber) {
        o.jobber = LB.jobber(L).map(j => { const B = LB.BYGG[j.b.type] || {}; return { id: j.b.id + ':' + j.hva, navn: B.navn || j.b.type, hva: j.hva, igjen: j.hva === 'bygg' ? j.b.igjen : (j.b.arbeid ? j.b.arbeid.igjen : 0), reise: j.reise || 0 }; });
        o.lag = LB.byggelag ? LB.byggelag(L) : 1;
        // (ut2, 28. nov) døgnplanen (jobbtavla, spill/jobber.js) setter byggefarten til 0 utenfor arbeidstida. Anslagene bruker farten
        // over hele døgnet (døgnplanen slått av mens vi regner – den gir like mye arbeid per døgn), og «folk står fast» betyr at ingen
        // kan bygge – ikke at skiftet er over for kvelden. o.venter = jobbene venter på arbeidstida.
        const FR = window.FolkRegler, d0 = FR ? FR.døgnF : null; let nå = 1;
        try { nå = LB.folkTempo ? LB.folkTempo(L) : 1; if (FR) FR.døgnF = null; o.fart = LB.folkTempo ? LB.folkTempo(L) : 1; } finally { if (FR) FR.døgnF = d0; }
        o.venter = o.jobber.length > 0 && o.fart > 0 && !(nå > 0);
        o.fast = o.jobber.length > 0 && !(o.lag > 0 && o.fart > 0); } } catch (e) { /* leiren er ikke klar */ }
    try { const FS = window.ForsvarSpill; const A = FS && FS.angrep ? FS.angrep() : null, n = FS && FS.neste ? FS.neste() : null;
      if (A) o.angrep = { aktiv: true, min: 0 }; else if (n && Number.isFinite(n.min)) o.angrep = { aktiv: false, min: n.min }; } catch (e) { /* ingen forsvar */ }
    try { o.alarm = ENHETER.some(e => e.raid > 0 && levende(e)); } catch (e) { o.alarm = false; }
    o.byBer = byBer;
    return o;
  }

  // EN BY BER OM HJELP (kommer med byene i Ø3): window.dispatchEvent(new CustomEvent('riksbrudd-by-ber', { detail: { tekst } })) – teller
  // opp, og «Pause ved: kontrakt eller by trenger deg» slår til
  let byBer = 0; window.addEventListener('riksbrudd-by-ber', () => { byBer++; });

  // ---------- spol til ----------
  function spolTil(id) {
    const o = øyeblikk(), m = T.mål(id, o);
    if (!m) { logg('Det finnes ikke noe å spole til der nå.'); return false; }
    if (!window.FlytSpill || !FlytSpill.spol) return false;
    const ok = FlytSpill.spol({ navn: m.tekst, sjekk: () => T.nådd(m, øyeblikk()) });
    lukk();
    if (ok) FlytSpill.visKort('Spoler til ' + m.tekst + ' (600×) – stopper av seg selv.', false);
    return ok;
  }

  // ---------- panelet «Spol til …» ----------
  const css = el('style');
  css.textContent = `#spoltil{ position:fixed; z-index:40; right:10px; top:calc(var(--topp,58px) + 8px); width:min(360px,94vw); max-height:calc(100vh - var(--topp,58px) - 30px); overflow:auto; display:none; padding:8px 10px 10px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; line-height:1.35; box-shadow:0 4px 18px rgba(0,0,0,.5); border-radius:6px; }
#nesteh{ -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; }
#spoltil.på{ display:block; } #spoltil .hode{ display:flex; align-items:center; gap:8px; } #spoltil .hode b{ flex:1; color:#f0e2b0; font-size:15px; }
#spoltil small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; }
#spoltil h4{ margin:10px 0 4px; font-size:12.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:#b9a77a; }
#spoltil button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:inherit; font:inherit; cursor:pointer; border-radius:4px; }
#spoltil .valg{ display:flex; flex-direction:column; gap:5px; margin-top:6px; } #spoltil .valg button{ text-align:left; min-height:40px; padding:4px 10px; }
#spoltil .valg button span{ display:block; font-size:12px; color:var(--ink-dim,#a99); } #spoltil .valg button[disabled]{ opacity:.5; cursor:default; }
#spoltil .liste{ margin:0; padding:0; list-style:none; } #spoltil .liste li{ display:flex; gap:8px; padding:2px 0; border-bottom:1px solid rgba(255,255,255,.05); font-size:13px; }
#spoltil .liste li i{ font-style:normal; min-width:92px; color:#d8c48e; font-variant-numeric:tabular-nums; }
#spoltil .brytere{ display:flex; flex-wrap:wrap; gap:6px; } #spoltil .brytere button{ min-height:34px; padding:2px 9px; font-size:13px; } #spoltil .brytere button.på{ border-color:#c9b26a; background:#4a3f22; }
#spoltil .x{ min-width:34px; min-height:32px; }
body.kort #spoltil, body.smal #spoltil{ left:6px; right:6px; width:auto; top:calc(var(--topp,48px) + 6px); }
.knapper #spoltilk{ min-width:22px; padding:0 4px; font-size:12px; }
body.kort #spoltilk, body.smal #spoltilk, body.foto #spoltilk{ display:none; }
#tidslinje{ position:fixed; z-index:9; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 6px); display:none; max-width:min(760px,60vw); gap:2px; align-items:center; padding:2px 6px; background:rgba(20,16,10,.78); border:1px solid #4a4030; border-radius:5px; color:var(--ink,#e7dcc3); font-size:12.5px; white-space:nowrap; overflow:hidden; }
#tidslinje.på{ display:flex; } #tidslinje > b{ color:var(--ink-dim,#a99); font-weight:500; margin-right:4px; }
#tidslinje button{ background:none; border:0; border-left:1px solid #3a3226; color:inherit; font:inherit; padding:1px 7px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; }
#tidslinje button:first-of-type{ border-left:0; } #tidslinje button:hover{ color:#f0e2b0; } #tidslinje button i{ font-style:normal; color:#d8c48e; margin-right:4px; }
body.kort #tidslinje, body.smal #tidslinje, body.foto #tidslinje, body.gaar #tidslinje{ display:none; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'spoltil', role: 'dialog', 'aria-label': 'Spol til' }); document.body.appendChild(panel);
  const linje = el('div', { id: 'tidslinje', role: 'status', 'aria-label': 'Tidslinje' }); document.body.appendChild(linje);
  let åpen = false, sistHtml = '';
  const tidTekst = (når, nå) => (når === null ? 'nå' : T.når(når, nå) + ' · ' + T.om(når - nå));
  // hendelsen i tidslinja -> valget i «Spol til»
  const spolId = h => (h.type === 'morgen' ? 'morgen' : h.type === 'frist' || h.type === 'levering' ? h.id : h.type === 'bygg' ? h.id : h.type === 'angrep' ? 'angrep' : null);
  function tegnPanel(tving) {
    if (!åpen) return; if (!tving && window.pekerNede && pekerNede(panel)) return;
    const o = øyeblikk(), V = T.valg(o), K = T.kjente(o).slice(0, 8);
    const ny = el('div');
    const x = el('button', { klasse: 'x', 'aria-label': 'Lukk' }, '×'); x.onclick = lukk;
    ny.append(el('div', { klasse: 'hode' }, el('b', {}, '⏭ Spol til …'), x),
      el('small', {}, 'Farten går til 600× og stopper av seg selv. Alarm, fiender nær leiren og kort som venter på svar stopper alltid.'));
    const vb = el('div', { klasse: 'valg' });
    for (const v of V) { const b = el('button', { 'data-spol': v.id }, v.tekst, el('span', {}, v.nå ? 'nå' : v.stille ? 'står stille – ingen bygger' : v.når === null ? '' : (v.frist ? 'senest ' : '') + tidTekst(v.når, o.tid) + (v.frist ? ' (en time før fristen)' : '')));
      if (v.nå || v.stille) b.setAttribute('disabled', ''); else b.onclick = () => spolTil(v.id); vb.append(b); }
    ny.append(vb);
    ny.append(el('h4', {}, 'Det som kommer'));
    const ul = el('ul', { klasse: 'liste' }); for (const h of K) ul.append(el('li', {}, el('i', {}, h.når === null ? 'nå' : T.kortNår(h.når, o.tid)), h.tekst)); ny.append(ul);
    ny.append(el('h4', {}, 'Pause av seg selv'));
    const br = el('div', { klasse: 'brytere' });
    for (const p of T.PAUSETYPER) { const på = !!valg.pause[p.id], b = el('button', { 'data-pause': p.id, title: 'Pause når ' + p.tekst, 'aria-pressed': String(på), klasse: på ? 'på' : '' }, p.navn + ': ' + (på ? 'på' : 'av'));
      b.onclick = () => settPause(p.id, !valg.pause[p.id]); br.append(b); }
    ny.append(br);
    if (!liten()) { const b = el('button', { id: 'tidslinjeknapp', 'aria-pressed': String(valg.tidslinje), klasse: valg.tidslinje ? 'på' : '' }, 'Tidslinje øverst: ' + (valg.tidslinje ? 'på' : 'av'));
      b.onclick = () => settTidslinje(!valg.tidslinje); ny.append(el('h4', {}, 'Tidslinje'), el('div', { klasse: 'brytere' }, b)); }
    else ny.append(el('small', { style: 'margin-top:8px' }, 'På telefon står tidslinja her i panelet. Langt trykk på ⏭ åpner det.'));
    if (ny.innerHTML !== sistHtml) { sistHtml = ny.innerHTML; panel.replaceChildren(...ny.childNodes); }
  }
  function åpne() { åpen = true; panel.classList.add('på'); sistHtml = ''; tegnPanel(true); }
  function lukk() { åpen = false; panel.classList.remove('på'); }
  function veksle() { if (åpen) lukk(); else åpne(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) lukk(); });
  document.addEventListener('pointerdown', e => { if (!åpen) return; const t = e.target; if (panel.contains(t) || (t.closest && t.closest('#nesteh, #spoltilk, #tidslinje, #leirmeny'))) return; lukk(); }, true);

  // ---------- knappene ved ⏭ ----------
  const neste = document.getElementById('nesteh');
  if (neste) {
    // «▾» rett etter ⏭ på PC (skjult på telefon – toppraden blir ikke fullere der)
    const k = el('button', { id: 'spoltilk', 'aria-label': 'Spol til …', title: 'Spol til … (morgenen, kontrakten, byggingen, angrepet) – også langt trykk eller høyreklikk på ⏭', 'aria-expanded': 'false' }, '▾');
    k.onclick = () => { veksle(); k.setAttribute('aria-expanded', String(åpen)); }; neste.after(k);
    // langt trykk (telefon) og høyreklikk (PC) på ⏭ åpner panelet; det korte trykket virker som før
    let holdt = 0, langt = false;
    neste.addEventListener('pointerdown', () => { langt = false; clearTimeout(holdt); holdt = setTimeout(() => { langt = true; åpne(); }, 550); });
    for (const t of ['pointerup', 'pointerleave', 'pointercancel']) neste.addEventListener(t, () => clearTimeout(holdt));
    neste.addEventListener('click', e => { if (langt) { langt = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    neste.addEventListener('contextmenu', e => { e.preventDefault(); åpne(); });
    if (!/Spol til/.test(neste.title || '')) neste.title = (neste.title || '') + ' – hold inne (eller høyreklikk) for «Spol til …».';
  }

  // ---------- tidslinja (PC) ----------
  let linjeSist = '';
  function tegnLinje() {
    const vis = valg.tidslinje && !liten(); linje.classList.toggle('på', vis); if (!vis) { linjeSist = ''; return; }
    if (window.pekerNede && pekerNede(linje)) return;
    const o = øyeblikk(), K = T.kjente(o).slice(0, T.REGLER.tidslinjeMaks), ny = el('div');
    ny.append(el('b', {}, 'Neste:'));
    for (const h of K) { const id = spolId(h), b = el('button', { title: (id && h.når !== null ? 'Spol hit: ' : '') + h.tekst + (h.når !== null ? ' (' + T.når(h.når, o.tid) + ', ' + T.om(h.når - o.tid) + ')' : ''), 'data-spol': id || '' },
      el('i', {}, h.når === null ? 'nå' : T.kortNår(h.når, o.tid)), h.tekst); ny.append(b); }
    if (ny.innerHTML === linjeSist) return; linjeSist = ny.innerHTML; linje.replaceChildren(...ny.childNodes);
    for (const b of linje.querySelectorAll('button')) b.onclick = () => { const id = b.getAttribute('data-spol'); const h = K.find(q => spolId(q) === id); if (id && h && h.når !== null) spolTil(id); else åpne(); };
  }
  function settTidslinje(v) { valg.tidslinje = !!v; lagre(); tegnLinje(); sistHtml = ''; tegnPanel(true); oppdaterMeny(); }
  function settPause(id, v) { if (!(id in valg.pause)) return; valg.pause[id] = !!v; lagre(); før = null; sistHtml = ''; tegnPanel(true); oppdaterMeny(); }
  const oppdaterMeny = () => { if (window.LeirSpill && LeirSpill.visMeny && document.getElementById('tidmeny')) try { LeirSpill.visMeny(); } catch (e) { /* menyen er lukket */ } };

  // ---------- automatisk pause ----------
  let før = null, sistPause = null;
  function pauseSteg() {
    const noen = Object.values(valg.pause).some(Boolean);
    if (!noen || !auto() || typeof tempo === 'undefined') { før = null; return; }
    const nå = øyeblikk(); if (!før) { før = nå; return; }
    const P = T.pauser(før, nå, valg.pause); før = nå; if (!P.length || !(tempo > 0)) return;
    const p = document.getElementById('sp0'); if (p) p.click();
    const tekst = P.map(q => q.tekst).join(', '); sistPause = { tid: nå.tid, liste: P };
    if (window.FlytSpill && FlytSpill.visKort) FlytSpill.visKort('Pause: ' + tekst.charAt(0).toUpperCase() + tekst.slice(1) + '.', false);
    logg('Pause: ' + tekst + '. (Pause av seg selv – Leir → Mål → Tid.)');
  }
  setInterval(() => { try { pauseSteg(); tegnLinje(); if (åpen) tegnPanel(); } catch (e) { console.error(e); } }, 500);
  addEventListener('resize', () => { linjeSist = ''; tegnLinje(); });

  // ---------- Leir-menyen (fanen Mål): «Tid» ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e2, knapp: kn }) => {
    hode.appendChild(e2('h3', { 'data-fane': 'mål', id: 'tidmeny' }, 'Tid: spol til og pause'));
    const o = øyeblikk(), V = T.valg(o).filter(v => !v.nå && !v.stille);
    const rad = e2('div', { klasse: 'kn' }); for (const v of V) { const b = kn(v.tekst + (v.når !== null ? ' (' + T.om(v.når - o.tid) + ')' : ''), () => spolTil(v.id)); b.setAttribute('data-spol', v.id); rad.appendChild(b); }
    hode.appendChild(rad);
    for (const p of T.PAUSETYPER) { const b = kn('Pause ved «' + p.navn.toLowerCase() + '»: ' + (valg.pause[p.id] ? 'på' : 'av'), () => settPause(p.id, !valg.pause[p.id])); b.setAttribute('data-pause', p.id); hode.appendChild(b); }
    if (!liten()) { const b = kn('Tidslinje øverst: ' + (valg.tidslinje ? 'på' : 'av'), () => settTidslinje(!valg.tidslinje)); b.id = 'tidslinjemeny'; hode.appendChild(b); }
  });

  const api = window.TidaSpill = { test: false, øyeblikk, spolTil, åpne, lukk, erÅpen: () => åpen, valg: () => JSON.parse(JSON.stringify(valg)), settPause, settTidslinje,
    pauseSteg, sistPause: () => sistPause, linje: () => [...linje.querySelectorAll('button')].map(b => b.textContent) };
})();
