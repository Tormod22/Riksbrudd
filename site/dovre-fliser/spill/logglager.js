'use strict';
/* LOGGLAGERET (runde 13, 21. nov – kritiker H: «Loggen tømmes når spillet åpnes på nytt. Etter omlasting står bare 4–6 linjer igjen,
 * og «▾ les alt» viser ikke det som skjedde før»).
 *   - De siste REGLER.maks meldingene i loggen lagres per leir (localStorage «riksbrudd-logg»: { v, leir: 'x,y', økt, linjer: [[tid, tekst, økt]] }).
 *     Samme melding som slås sammen («… (×3)», spill/loggdemp.js) erstatter den forrige linja i stedet for å legge til en ny.
 *   - Når et lagret spill åpnes, kommer en liten boks: «Velkommen tilbake – dette skjedde sist du spilte (dag 2, 15:12–15:54)» med de
 *     viktigste meldingene fra forrige gang (varsler, tap, angrep, ferdige bygg, ordre). Teksten sier «sist du spilte», ikke «mens du var
 *     borte»: spillet står stille når det er lukket, så ingenting skjer mens du er borte.
 *   - «Hele loggen» (i boksen, under loggen når «les alt» er åpen, og i Leir → Mål) viser alle de lagrede meldingene, nyeste først, med dag og klokkeslett.
 * Reglene øverst er uten DOM (Node: require('./logglager'), test_logglager.js); visningen nederst (window.LoggLager).
 * I testene (navigator.webdriver) kommer velkomstboksen ikke av seg selv før LoggLager.test = true. Tallene er Claudes forslag.
 */
(function (rot) {
  // Claudes forslag
  const REGLER = {
    maks: 100,            // så mange meldinger lagres per leir
    viktigeMaks: 5,       // så mange meldinger står i velkomstboksen
    VIKTIG: /angrep|angrip|røver|fiende|falt|død|såret|slått ut|tapt|tom for|sulter|kontakten er brutt|i kamp|ildkamp|ferdig|bestilt|sendt|framme|er satt opp:|ny i gjengen|forlatt|rekrutt|kjøpt|solgt|flyttet|⚠/i,
    // stemningsmeldinger, oppskrifter (med «→»), tips og meldingene ved oppstart tas ikke med i velkomstboksen
    // RUNDE 14 (kritiker J): det som skal med først i velkomstboksen – [mønster, vekt] (Claudes forslag)
    PRIORITET: [
      [/tettsted|er vårt|er vår|tok |inntatt|holder byen|mistet|overgitt|erobr/i, 4],
      [/falt|død|drept|såret|slått ut|tapt|forlot|forlatt|savnet/i, 4],
      [/angrep|angrip|røver|bølge|fiende|ildkamp|i kamp|kampen/i, 3],
      [/ – [^.]*\.|morgenmøt|valgte|bestemte/i, 3],
    ],
    // aldri i velkomstboksen
    ALDRI: /farten er|farten settes|spillform:|holder til (i|ved)|velkommen tilbake/i,
    // så mange spillminutter må ha gått i forrige økt før velkomstboksen vises
    minTid: 1,
    // (løkka r1, kritiker J: «Velkommen tilbake» viste dag 1 12:50–13:12 da spillet sto på 16:34) bare meldinger fra de siste
    // nylig spillminuttene før spillet ble lagret; er ingen så nye, vises bare den siste viktige meldingen (med klokkeslett)
    nylig: 120,
    // stemningsmeldinger, tips og oppstartsmeldinger
    STØY: /^(Det klarner opp|Det skyer over|Det begynner å (regne|snø)|Tåka kommer sigende|Velkommen tilbake|Pengene:|Tips?:|Vil du|Fikk ikke hentet)|→|Riket har gått i oppløsning|Leiren er satt opp|ingen ferdige lag/,
  };
  const nøkkel = t => String(t).replace(/\s*\(×\d+\)\s*$/, '').replace(/[\d\s.,]*\d/g, '#').trim();
  const leirId = l => (l && Number.isFinite(+l.x) && Number.isFinite(+l.y) ? Math.round(l.x) + ',' + Math.round(l.y) : null);
  // spillminutter -> { dag, klokke } (tid 0 = dag 1 kl. 06:00, som klokka i spillet)
  function når(t) { const h = 6 + Math.max(0, +t || 0) / 60; return { dag: Math.floor(h / 24) + 1, klokke: String(Math.floor(h % 24)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60 + 1e-6)).padStart(2, '0') }; }
  const tom = leir => ({ v: 1, leir: leir || null, økt: 1, linjer: [] });
  // legger en melding til (nyeste sist). slått = meldingen er slått sammen med en tidligere (×n): den forrige like linja byttes ut.
  function legg(L, tekst, t, slått, R = REGLER) {
    tekst = String(tekst == null ? '' : tekst).trim(); if (!tekst) return L;
    const ny = [Math.max(0, Math.round((+t || 0) * 10) / 10), tekst.slice(0, 600), L.økt];
    if (slått) { const k = nøkkel(tekst); for (let i = L.linjer.length - 1; i >= Math.max(0, L.linjer.length - 30); i--) if (nøkkel(L.linjer[i][1]) === k) { L.linjer.splice(i, 1); break; } }
    L.linjer.push(ny); if (L.linjer.length > R.maks) L.linjer.splice(0, L.linjer.length - R.maks); return L;
  }
  // leser lagringen for leiren (en annen leir eller ødelagt tekst gir en tom logg)
  function les(tekst, leir) {
    let d = null; try { d = typeof tekst === 'string' ? JSON.parse(tekst) : tekst; } catch (e) { d = null; }
    const L = tom(leir); if (!d || d.v !== 1 || !leir || d.leir !== leir || !Array.isArray(d.linjer)) return L;
    L.linjer = d.linjer.filter(q => Array.isArray(q) && Number.isFinite(q[0]) && typeof q[1] === 'string' && q[1]).slice(-REGLER.maks).map(q => [q[0], q[1].slice(0, 600), Number.isFinite(q[2]) ? q[2] : 1]);
    L.økt = Math.max(1, Number.isFinite(d.økt) ? d.økt : 1, ...L.linjer.map(q => q[2])); return L;
  }
  const pakk = L => JSON.stringify({ v: 1, leir: L.leir, økt: L.økt, linjer: L.linjer });
  // RUNDE 14 (kritiker I og J): det velkomstboksen viser. Bare meldingene fra økta rett før denne (en F5 rett etter en F5 gir ingenting),
  // bare når spilltid har gått i den økta (ikke «06:00–06:00»), aldri «Farten er …» eller støy. De viktigste velges etter vekt (PRIORITET:
  // tettsteder, tap, angrep og valg først), og de vises i tidsrekkefølge – eldste først. antall = antall linjer som vises.
  function vekt(tekst, R = REGLER) { let v = 0; for (const [re, n] of R.PRIORITET) if (re.test(tekst)) v = Math.max(v, n); if (!v && R.VIKTIG.test(tekst)) v = 1; return v; }
  // nå = spillminuttet spillet står på (det lagrede spillets klokke); uten nå regnes den siste meldingens tid
  function oppsummer(L, R = REGLER, nå) {
    const mine = L.linjer.filter(q => q[2] === L.økt - 1); if (!mine.length) return null;
    const fra = mine[0][0], til = mine[mine.length - 1][0]; if (til - fra < R.minTid) return null;
    const slutt = Number.isFinite(+nå) && nå !== null && +nå >= til ? +nå : til;
    const alle = mine.map((q, i) => ({ q, i, v: R.ALDRI.test(q[1]) || R.STØY.test(q[1]) ? 0 : vekt(q[1], R) })).filter(k => k.v > 0);
    if (!alle.length) return null;
    // bare det siste som skjedde: meldingene fra de siste R.nylig minuttene, ellers den nyeste viktige meldingen alene
    let kandidater = alle.filter(k => k.q[0] >= slutt - R.nylig); const stille = !kandidater.length; if (stille) kandidater = [alle[alle.length - 1]];
    // høyest vekt først, nyeste først ved lik vekt; så tilbake i tidsrekkefølge (eldste øverst)
    const valgt = kandidater.sort((a, b) => b.v - a.v || b.i - a.i).slice(0, R.viktigeMaks).sort((a, b) => a.i - b.i);
    return { fra: når(valgt[0].q[0]), til: når(til), nå: når(slutt), stille, antall: valgt.length, alle: mine.length, viktige: valgt.map(k => ({ ...når(k.q[0]), tekst: k.q[1] })) };
  }
  // tittelen i velkomstboksen
  function tittel(o) { if (!o) return ''; const a = o.fra, b = o.til; return a.dag === b.dag ? `dag ${a.dag}, ${a.klokke}–${b.klokke}` : `dag ${a.dag} ${a.klokke} – dag ${b.dag} ${b.klokke}`; }
  const api = { REGLER, nøkkel, leirId, når, tom, legg, les, pakk, vekt, oppsummer, tittel };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  if (typeof document === 'undefined') { rot.LoggLager = api; return; }

  // ---------------- visningen ----------------
  const NØKKEL = 'riksbrudd-logg';
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand();
  // før spillet er i gang (startskjermen, eller et lagret spill som ikke er lest ennå): meldingene samles i «venter»
  let L = null, venter = [], skriv = 0, vist = false;
  function lagre() { clearTimeout(skriv); skriv = 0; if (!L || !L.leir) return; try { localStorage.setItem(NØKKEL, pakk(L)); } catch (e) { /* fullt eller sperret */ } }
  const lagreSnart = () => { if (!skriv) skriv = setTimeout(lagre, 800); };
  function ny(tekst, t, slått) { if (!L) { venter.push([tekst, t, slått]); if (venter.length > REGLER.maks) venter.shift(); return; } legg(L, tekst, t, slått); lagreSnart(); oppdaterPanel(); }
  function start() {
    const l = leirId(spill() && spill().leir); if (!l) return;
    let lagret = null; try { lagret = localStorage.getItem(NØKKEL); } catch (e) { lagret = null; }
    // et nytt spill eller en ny leir: ny logg. Ellers: neste økt.
    // et nytt spill (spill/lagring.js: ingen lagret spill da siden ble lastet) begynner med tom logg, også om leiren ligger der den forrige lå
    const nytt = rot.LagringSpill && LagringSpill.nyttSpill && LagringSpill.nyttSpill();
    L = nytt ? tom(l) : les(lagret, l); if (L.linjer.length) L.økt += 1;
    // meldingene fra før det lagrede spillet var lest inn, har klokka 06:00 – de får klokka spillet står på nå
    const nå = typeof tid === 'number' && isFinite(tid) ? tid : 0; for (const [x, t, s] of venter) legg(L, x, Math.max(+t || 0, nå), s); venter = []; lagre();
    // RUNDE 14: velkomsten vises STRAKS (før kortene og morgenmøtet, som venter i kortkøen til den er lukket – høyst én modal om gangen)
    const o = oppsummer(L, REGLER, nå); if (o && !vist && (!navigator.webdriver || API.test === true)) { vist = true; velkommen(o); }
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  window.addEventListener('pagehide', lagre);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lagre(); });

  const css = document.createElement('style');
  css.textContent = `#loggvelkommen{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 10px); z-index:20; width:min(460px, calc(100vw - 24px)); box-sizing:border-box;
  background:linear-gradient(180deg,#2a2114,#17120a); border:1px solid #c9b26a; box-shadow:0 10px 28px rgba(0,0,0,.6); color:var(--ink,#e7dcc3); padding:10px 13px 11px; font-size:14px; line-height:1.4; }
#loggvelkommen h3{ margin:0 0 2px; font-family:"IM Fell English",serif; font-weight:400; font-size:19px; color:#f0dc9a; } #loggvelkommen small{ display:block; color:#a89970; font-size:12px; margin-bottom:6px; }
#loggvelkommen ul{ margin:0; padding:0; list-style:none; max-height:min(220px, 40vh); overflow-y:auto; } #loggvelkommen li{ padding:3px 0; border-top:1px solid #3a2f1c; } #loggvelkommen li i{ font-style:normal; color:#a89970; font-size:12px; margin-right:6px; white-space:nowrap; }
#loggvelkommen .rad, #logghel .rad{ display:flex; gap:8px; justify-content:flex-end; margin-top:8px; }
#loggvelkommen button, #logghel button, #loggheleknapp{ min-height:34px; padding:0 12px; background:#2a2318; border:1px solid var(--rule,#5a4a2a); color:var(--ink,#e7dcc3); font:inherit; font-size:13.5px; cursor:pointer; }
#loggheleknapp{ position:fixed; z-index:9; min-height:26px; font-size:12px; padding:0 9px; display:none; } #loggheleknapp.på{ display:block; }
#logghel{ position:fixed; right:10px; top:calc(var(--topp,58px) + 6px); bottom:calc(64px + env(safe-area-inset-bottom,0px)); width:min(420px, calc(100vw - 20px)); box-sizing:border-box; z-index:31; display:none; flex-direction:column;
  background:#16120c; border:1px solid var(--rule,#5a4a2a); color:var(--ink,#e7dcc3); padding:10px 12px; font-size:13.5px; line-height:1.4; } #logghel.på{ display:flex; }
#logghel h3{ margin:0; font-family:"IM Fell English",serif; font-weight:400; font-size:20px; } #logghel .liste{ flex:1; overflow-y:auto; overscroll-behavior:contain; margin-top:6px; }
#logghel h4{ margin:8px 0 2px; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:#a89970; } #logghel p{ margin:0; padding:3px 0; border-top:1px solid #2e2618; } #logghel p i{ font-style:normal; color:#a89970; font-size:12px; margin-right:7px; }
#logghel .lukk{ position:absolute; right:8px; top:6px; min-height:30px; border:none; background:none; font-size:22px; }
body.kort #loggvelkommen{ top:calc(var(--topp,44px) + 4px); font-size:13px; padding:7px 10px 8px; } body.kort #loggvelkommen ul{ max-height:34vh; } body.kort #loggvelkommen h3{ font-size:16px; }`;
  document.head.appendChild(css);
  const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x !== undefined) e.textContent = x; return e; };
  const kn = (t, f, id) => { const b = el('button', '', t); b.type = 'button'; if (id) b.id = id; b.onclick = f; return b; };

  // velkomstboksen. RUNDE 14 (kritiker I og J: den lå oppå et kort/morgenmøtet, et trykk på «Fortsett» traff «Selg 15 m³ tre» under, og den
  // ble liggende over stoppbanneret og angrepsbanneret i timevis):
  //   - den er med i kortkøen (spill/samfunn-visning.js: Kortkø), så kortene og morgenmøtet venter til den er lukket;
  //   - står et annet kort (seier/tap, krigskortet, morgenmøtet) oppe likevel, lukkes velkomsten – aldri to oppå hverandre;
  //   - spillet står på pause mens den vises, og den lukkes når spillet går igjen (▶, ⏭, en fart) eller tiden flytter seg;
  //   - den ligger under bannere og varsler (z-index REGLER.z).
  let vakt = 0, tidVed = 0, tempoFør = 0;
  const nåTid = () => (typeof tid === 'number' && isFinite(tid) ? tid : 0), fart = () => (typeof tempo !== 'undefined' ? tempo : 0);
  function lukkVelkommen(gjenoppta) { const b = document.getElementById('loggvelkommen'); clearInterval(vakt); vakt = 0; if (!b) return; b.remove();
    if (rot.Kortkø && Kortkø.slipp) Kortkø.slipp('loggvelkommen');
    // «Fortsett»: spillet går videre i farten det hadde før velkomsten (bare når den selv satte pause)
    if (gjenoppta && tempoFør > 0 && fart() === 0) { const p = document.getElementById('sp0'); if (p) p.click(); if (typeof tempo !== 'undefined' && tempo !== tempoFør) tempo = tempoFør; }
    tempoFør = 0; }
  function velkommen(o) {
    if (!o) return; lukkVelkommen(false);
    if (['formkort', 'krigkort', 'morgenkort'].some(id => { const e = document.getElementById(id); return e && e.classList.contains('på'); })) return;
    // et kort i køen (hendelse, folket) som alt står oppe, viker og kommer straks etter velkomsten
    if (rot.Kortkø && Kortkø.vik) Kortkø.vik();
    const b = el('div', 'på'); b.id = 'loggvelkommen'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Velkommen tilbake');
    // (løkka r1) klokka spillet står på, og bare det siste som skjedde – hver melding med dag og klokkeslett
    const n = o.nå || o.til, hva = o.stille ? 'Det siste som skjedde' : o.antall === 1 ? 'Det siste som skjedde' : `Det siste som skjedde (${o.antall} meldinger, eldste først)`;
    b.append(el('h3', '', 'Velkommen tilbake'), el('small', '', `Spillet står på dag ${n.dag} kl. ${n.klokke}. ${hva}:` + (o.stille ? ` Etter dette var det stille til spillet ble lagret.` : '') + ' Spillet sto stille mens du var borte.'));
    const ul = el('ul'); for (const v of o.viktige) { const li = el('li'); li.append(el('i', '', `dag ${v.dag} ${v.klokke}`), document.createTextNode(v.tekst)); ul.appendChild(li); } b.appendChild(ul);
    const rad = el('div', 'rad'); rad.append(kn('Hele loggen', () => { lukkVelkommen(false); visHele(true); }, 'loggvelkommen-hele'), kn('Fortsett', () => lukkVelkommen(true), 'loggvelkommen-ok')); b.appendChild(rad);
    document.body.appendChild(b);
    // pause mens den står oppe
    tempoFør = 0; if (fart() > 0) { const p = document.getElementById('sp0'); if (p) { tempoFør = fart(); p.click(); } }
    tidVed = nåTid();
    vakt = setInterval(() => { if (!document.getElementById('loggvelkommen')) { clearInterval(vakt); vakt = 0; return; }
      // et annet kort eller møte står oppe, eller spillet går igjen: velkomsten lukkes
      const annet = ['formkort', 'krigkort', 'morgenkort'].some(id => { const e = document.getElementById(id); return e && e.classList.contains('på') && e.getClientRects().length > 0; });
      if (annet || nåTid() > tidVed + .01 || fart() > 0) { tempoFør = 0; lukkVelkommen(false); } }, 200);
  }
  // hele loggen: nyeste først, gruppert per dag
  const hel = el('div'); hel.id = 'logghel'; hel.setAttribute('role', 'dialog'); hel.setAttribute('aria-label', 'Hele loggen'); document.body.appendChild(hel);
  let helSig = '';
  function oppdaterPanel() { if (!hel.classList.contains('på')) return; const linjer = L ? L.linjer : venter.map(q => [q[1] || 0, String(q[0]), 1]), sig = linjer.length + '|' + (linjer.length ? linjer[linjer.length - 1].join('|') : ''); if (sig === helSig) return; helSig = sig;
    hel.textContent = ''; hel.append(kn('×', () => visHele(false), 'logghel-lukk'), el('h3', '', 'Hele loggen'), el('small', '', `De siste ${linjer.length} meldingene (høyst ${REGLER.maks}), nyeste øverst.`));
    hel.lastChild.style.cssText = 'display:block;color:#a89970;font-size:12px;'; hel.firstChild.className = 'lukk';
    const liste = el('div', 'liste'); let dag = 0;
    for (let i = linjer.length - 1; i >= 0; i--) { const q = linjer[i], n = når(q[0]); if (n.dag !== dag) { dag = n.dag; liste.appendChild(el('h4', '', 'Dag ' + dag)); } const p = el('p'); p.append(el('i', '', n.klokke), document.createTextNode(q[1])); liste.appendChild(p); }
    if (!linjer.length) liste.appendChild(el('p', '', 'Ingen meldinger ennå.')); hel.appendChild(liste); }
  function visHele(på) { hel.classList.toggle('på', !!på); helSig = ''; if (på) { oppdaterPanel(); const lk = document.getElementById('logg'); if (lk) lk.classList.remove('hel'); } }
  // «Hele loggen» under loggen mens «les alt» er åpen (hud.js setter klassen «hel» på #logg)
  const knapp = kn('📜 Hele loggen', () => visHele(true), 'loggheleknapp'); document.body.appendChild(knapp);
  const logg0 = document.getElementById('logg');
  function plasser() { const på = !!logg0 && logg0.classList.contains('hel') && !hel.classList.contains('på'); knapp.classList.toggle('på', på); if (!på) return;
    const r = logg0.getBoundingClientRect(); knapp.style.top = Math.round(r.bottom + 4) + 'px'; knapp.style.right = Math.max(10, Math.round(window.innerWidth - r.right)) + 'px'; knapp.textContent = `📜 Hele loggen (${L ? L.linjer.length : venter.length})`; }
  if (logg0) new MutationObserver(plasser).observe(logg0, { attributes: true, attributeFilter: ['class'] });
  // Leir-menyen, fanen Mål
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e, knapp: k }) => { if (!L) return; hode.appendChild(e('h3', { 'data-fane': 'mål' }, 'Loggen'));
    hode.appendChild(e('div', { klasse: 'rad' }, e('span', {}, `${L.linjer.length} meldinger er lagret (de siste ${REGLER.maks}).`), k('Hele loggen', () => visHele(true)))); });
  const API = Object.assign(api, { test: false, ny, start, lagre, velkommen, lukkVelkommen, visHele, tilstand: () => L, nullstill: () => { L = L ? tom(L.leir) : null; lagre(); helSig = ''; oppdaterPanel(); }, vist: () => !!document.getElementById('loggvelkommen') });
  rot.LoggLager = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
