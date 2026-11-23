/* Riksbrudd – SKYTEVÅPEN OG SEKK (16. nov, brukeren: «legg også til skytevåpen og et inventory-system»).
 * Reglene øverst uten DOM (Utstyr, testes i pipeline/fliser/test_utstyr.js), visningen nederst (UtstyrSpill).
 * Du bærer opptil fire våpen og en sekk med ammunisjon, førstehjelp og rasjoner – alt veier, og du bærer høyst MAKS_VEKT kg.
 * Utstyr kjøpes i Leir-menyen (fanen Lager) og finnes i husene du leter gjennom. Kampen (spillet-visning.js) bruker våpenet du har framme.
 * Alle tall er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  // rekkevidde i meter, skade per treff (1 = en mann ute), bredde = hvor lett det er å sikte, hagl = antall prosjektiler per skudd
  const VÅPEN = {
    pistol: { navn: 'Pistol', ammo: 'a9', magasin: 15, takt: .25, lade: 1.6, rekkevidde: 80, skade: .45, bredde: 1, hagl: 1, vekt: 1, pris: 150000, tekst: 'Lett reservevåpen på kort hold' },
    mp: { navn: 'Maskinpistol', ammo: 'a9', magasin: 30, takt: .08, lade: 2, rekkevidde: 120, skade: .35, bredde: 1.3, hagl: 1, vekt: 3, pris: 400000, tekst: 'Skyter fort, best nær' },
    gevær: { navn: 'Automatgevær', ammo: 'a556', magasin: 30, takt: .14, lade: 2.2, rekkevidde: 350, skade: .6, bredde: 1, hagl: 1, vekt: 4, pris: 600000, tekst: 'Allsidig på alle hold' },
    hagle: { navn: 'Hagle', ammo: 'ahagl', magasin: 6, takt: .8, lade: 3, rekkevidde: 60, skade: .5, bredde: 2.2, hagl: 6, vekt: 3.5, pris: 300000, tekst: 'Seks hagl per skudd – farlig helt nær' },
    rifle: { navn: 'Skarpskyttergevær', ammo: 'a762', magasin: 5, takt: 1.4, lade: 3, rekkevidde: 700, skade: 1, bredde: .7, hagl: 1, vekt: 6, pris: 1200000, tekst: 'Ett skudd, én mann – på langt hold' },
  };
  const TING = {
    a9: { navn: '9 mm', enhet: 'skudd', vekt: .012, pris: 300, pakke: 30 }, a556: { navn: '5,56 mm', enhet: 'skudd', vekt: .012, pris: 500, pakke: 30 },
    ahagl: { navn: 'Haglpatroner', enhet: 'skudd', vekt: .04, pris: 600, pakke: 12 }, a762: { navn: '7,62 mm', enhet: 'skudd', vekt: .025, pris: 900, pakke: 10 },
    forbinding: { navn: 'Førstehjelp', enhet: 'stk.', vekt: .5, pris: 50000, pakke: 1, helse: 45 }, rasjon: { navn: 'Feltrasjon', enhet: 'stk.', vekt: .6, pris: 3000, pakke: 1, helse: 10 },
  };
  // (18. nov) Deler til håndverk, det du lager selv og vannet i feltflaska legges inn av spill/eventyr-visning.js (del: true = kan ikke
  // kjøpes); armbrøsten (selges: false) lager du selv.
  const GRUNNVEKT = 35, MAKS_VÅPEN = 4;   // api.ekstraVekt (styrke, spill/overlev.js) legges til grunnvekta
  // (18. nov kveld) spill/lut-visning.js kan bytte ut vekt og plass med lommer og sekk på ryggen: api.krok = { maks, vekt, plassTil, våpenOk }
  const krok = () => (typeof api !== 'undefined' && api.krok) || {};
  const maks = () => (krok().maks ? krok().maks() : GRUNNVEKT + ((typeof api !== 'undefined' && api.ekstraVekt) || 0));
  // STARTSEKKEN (R18, «knappe ressurser» – docs/balanse-r18.md, Claudes forslag): 60 skudd i reserve til geværet (før 90) og 15 til pistolen
  // (før 30) – to fulle magasiner til hvert våpen i tillegg til det som sitter i. Hver kule skal telle når du går alene.
  const ny = () => ({ våpen: [{ id: 'gevær', mag: 30 }, { id: 'pistol', mag: 15 }], aktiv: 0, ting: { a556: 60, a9: 15, forbinding: 1, rasjon: 2 } });
  const råVekt = I => Math.round((I.våpen.reduce((s, v) => s + VÅPEN[v.id].vekt, 0) + Object.entries(I.ting).reduce((s, [id, n]) => s + (TING[id] ? TING[id].vekt * n : 0), 0)) * 100) / 100;
  const vekt = I => (krok().vekt ? krok().vekt(I) : råVekt(I));
  // så mange av en ting du får plass til (etter vekt)
  const plassTil = (I, id) => (TING[id] ? (krok().plassTil ? krok().plassTil(I, id) : Math.max(0, Math.floor((maks() - vekt(I) + 1e-9) / TING[id].vekt))) : 0);
  const forTungt = (I, V) => (krok().våpenOk ? !krok().våpenOk(I, V) : vekt(I) + V.vekt > maks() + 1e-9);
  function leggTil(I, id, n) { if (!TING[id] || !(n > 0)) return 0; const t = Math.min(Math.floor(n), plassTil(I, id)); if (t > 0) I.ting[id] = (I.ting[id] || 0) + t; return t; }
  function taUt(I, id, n) { const t = Math.min(n, I.ting[id] || 0); if (t > 0) { I.ting[id] -= t; if (!I.ting[id]) delete I.ting[id]; } return t; }
  // et våpen til: høyst fire, og vekta må gå. Gir null eller en grunn.
  function nyttVåpen(I, id) { const V = VÅPEN[id]; if (!V) return 'Ukjent våpen.'; if (I.våpen.length >= MAKS_VÅPEN) return `Du bærer alt ${MAKS_VÅPEN} våpen. Kast ett først.`; if (forTungt(I, V)) return 'Sekken er for tung.'; I.våpen.push({ id, mag: V.magasin }); return null; }
  // kast et våpen: skuddene i magasinet legges tilbake i sekken hvis det er plass; du beholder alltid minst ett våpen
  function kastVåpen(I, nr) { if (I.våpen.length <= 1 || !I.våpen[nr]) return false; const v = I.våpen.splice(nr, 1)[0]; leggTil(I, VÅPEN[v.id].ammo, v.mag); I.aktiv = klem(I.aktiv > nr ? I.aktiv - 1 : I.aktiv, 0, I.våpen.length - 1); return true; }
  const aktivt = I => { const v = I.våpen[klem(I.aktiv, 0, I.våpen.length - 1)]; return { v, def: VÅPEN[v.id], reserve: I.ting[VÅPEN[v.id].ammo] || 0 }; };
  // lad: fyll magasinet fra sekken. Gir antallet som ble ladet.
  function lad(I, v) { const V = VÅPEN[v.id], t = taUt(I, V.ammo, V.magasin - v.mag); v.mag += t; return t; }
  // sikter du på målet? bredden på målet (3 m × våpenets bredde) sett fra deg, innenfor rekkevidden
  const sikter = (V, avst, vinkelFeil) => avst <= V.rekkevidde && Math.abs(vinkelFeil) <= Math.atan2(3 * V.bredde, Math.max(1, avst)) + .012;
  const sjanse = (V, avst) => klem(1.1 - avst / V.rekkevidde, .15, .95);
  // bruk førstehjelp eller en rasjon: gir helsa du får (0 når du ikke har den)
  function bruk(I, id) { const T = TING[id]; if (!T || !T.helse || !taUt(I, id, 1)) return 0; return T.helse; }
  // FUNN i et hus (fast per bygg): ca. hvert tredje hus har noe – oftest ammunisjon, av og til førstehjelp, sjelden et våpen
  function funn(kl, i) { let h = (Math.imul(i | 0, 2654435761) ^ 0x5bd1e995) >>> 0; const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 4294967296);
    const rik = { industri: .5, lager: .5, kontor: .35, butikk: .4, hus: .3, hytte: .35, låve: .3, uthus: .25, leil: .3 }[kl] || .2; if (r() > rik) return null;
    const t = r(); if (t < .08) return { våpen: ['pistol', 'hagle', 'mp', 'pistol', 'rifle'][Math.floor(r() * 5)] };
    if (t < .3) return { ting: 'forbinding', n: 1 }; const a = ['a556', 'a9', 'ahagl', 'a762'][Math.floor(r() * 4)]; return { ting: a, n: Math.round(TING[a].pakke * (.5 + r())) }; }
  const fra = d => { const I = ny(); if (!d || !Array.isArray(d.våpen)) return I; const v = d.våpen.filter(q => q && VÅPEN[q.id]).slice(0, MAKS_VÅPEN).map(q => ({ id: q.id, mag: klem(q.mag | 0, 0, VÅPEN[q.id].magasin) })); if (!v.length) return I;
    const ting = {}; for (const [id, n] of Object.entries(d.ting || {})) if (TING[id] && n > 0) ting[id] = Math.floor(n); return { våpen: v, aktiv: klem(d.aktiv | 0, 0, v.length - 1), ting }; };
  const api = { VÅPEN, TING, MAKS_VEKT: GRUNNVEKT, ekstraVekt: 0, krok: {}, råVekt, maks, MAKS_VÅPEN, ny, fra, vekt, plassTil, leggTil, taUt, nyttVåpen, kastVåpen, aktivt, lad, sikter, sjanse, bruk, funn };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Utstyr = api;

  // ---------- visningen ----------
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), går = () => { const Q = r3(); return !!(Q && Q.fot); }, kr = v => (rot.Leir ? Leir.kroner(v) : v + ' kr');
  let I = ny(), leirId = '', klar = false, åpen = false, sistHtml = '';
  const lagre = () => { try { localStorage.setItem('riksbrudd-utstyr', JSON.stringify({ leir: leirId, d: I })); } catch (e) { /* fullt eller sperret */ } };
  function start() { const S = rot.OppstartSpill && OppstartSpill.tilstand(); if (!S || !S.leir) return; leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y); let d = null; try { d = JSON.parse(localStorage.getItem('riksbrudd-utstyr') || 'null'); } catch (e) { d = null; }
    I = fra(d && d.leir === leirId ? d.d : null); klar = true; vis(); }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (t, f, eg = {}) => { const b = el('button', { type: 'button', ...eg }, t); b.onclick = f; return b; };
  const kg = v => String(Math.round(v * 10) / 10).replace('.', ',') + ' kg';
  const css = document.createElement('style');
  css.textContent = `#sekk{ position:fixed; right:10px; top:calc(var(--topp,58px) + 56px); z-index:11; display:none; width:min(330px,92vw); max-height:70vh; overflow:auto; padding:10px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#sekk.på{ display:block; } #sekk h2{ margin:0 0 4px; font-size:18px; } #sekk h3{ margin:10px 0 2px; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); }
#sekk .rad{ display:flex; align-items:center; gap:6px; padding:4px 0; border-bottom:1px solid #2e281e; } #sekk .rad > div{ flex:1; min-width:0; } #sekk .rad small{ display:block; color:var(--ink-dim,#a99); } #sekk .rad.aktiv b{ color:#f0d79a; }
#sekk button, #leirmeny .utstyr button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:34px; padding:2px 9px; font:inherit; font-size:13px; cursor:pointer; } #sekk button:disabled{ opacity:.45; }
#sekk .lukk{ float:right; min-width:34px; } #sekk .vekt{ height:6px; background:#2e281e; margin:4px 0 2px; } #sekk .vekt i{ display:block; height:100%; background:#c9b26a; }
#byttvapen{ position:fixed; right:78px; bottom:calc(208px + env(safe-area-inset-bottom,0px)); z-index:5; display:none; min-height:36px; padding:4px 10px; background:rgba(20,16,10,.7); border:1px solid rgba(231,220,195,.6); color:#e7dcc3; font:600 12px sans-serif; } #byttvapen.på{ display:block; }
#leirmeny .utstyr{ display:flex; justify-content:space-between; align-items:center; gap:8px; padding:3px 0; font-size:14px; } #leirmeny .utstyr small{ display:block; color:var(--ink-dim,#a99); }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'sekk', role: 'dialog', 'aria-label': 'Sekken' }); document.body.appendChild(panel);
  const bytt = el('button', { id: 'byttvapen', type: 'button' }); document.body.appendChild(bytt);
  const sekkKnapp = el('button', { id: 'sekkknapp', title: 'Sekken: våpen og utstyr (I)' }, 'Sekk'); sekkKnapp.hidden = true; document.querySelector('.knapper').insertBefore(sekkKnapp, document.getElementById('meny'));
  sekkKnapp.onclick = () => åpne(!åpen);
  function velg(n) { if (!I.våpen[n] || n === I.aktiv) return false; I.aktiv = n; lagre(); vis(); if (rot.SpilletSpill && SpilletSpill.K) SpilletSpill.K().lader = performance.now() + 500; return true; }
  function helbred(id) { const K = rot.SpilletSpill && SpilletSpill.K && SpilletSpill.K(); if (K && K.hp >= 99.5 && id === 'forbinding') { logg('Du er ikke skadet.'); return false; } const h = bruk(I, id); if (!h) return false; if (K) K.hp = Math.min(100, K.hp + h); lagre(); vis(); logg(`${TING[id].navn} brukt${K ? `: helsa er ${Math.round(K.hp)} %` : ''}.`); return true; }
  function fyll(p) { const A = aktivt(I), v = vekt(I);
    p.append(knapp('×', () => åpne(false), { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Sekken'), el('div', { title: 'Vekt er alt du bærer, også våpnene. Over bæreevnen går du tregere og blir fortere sliten.' }, `Vekt ${kg(v)} · du bærer lett opptil ${maks()} kg`), el('div', { klasse: 'vekt' }, el('i', { style: `width:${Math.min(100, v / maks() * 100)}%` })), el('h3', {}, `Våpen (${I.våpen.length} av ${MAKS_VÅPEN})`));
    I.våpen.forEach((w, n) => { const V = VÅPEN[w.id]; p.append(el('div', { klasse: 'rad' + (n === I.aktiv ? ' aktiv' : '') }, el('div', {}, el('b', {}, `${n + 1}. ${V.navn}`), el('small', {}, `${w.mag} av ${V.magasin} i magasinet · ${I.ting[V.ammo] || 0} ${TING[V.ammo].navn} i sekken · ${kg(V.vekt)}`)),
      n === I.aktiv ? el('span', {}, 'framme') : knapp('Ta fram', () => velg(n)), (() => { const b = knapp('Kast', () => { if (kastVåpen(I, n)) { lagre(); vis(); } }); b.disabled = I.våpen.length <= 1; return b; })())); });
    p.append(el('h3', {}, 'I sekken')); const T = Object.entries(I.ting); if (!T.length) p.append(el('small', {}, 'Tom.'));
    for (const [id, n] of T) { const D = TING[id]; p.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, D.navn), el('small', {}, `${n} ${D.enhet} · ${kg(D.vekt * n)}`)), (() => { const ek = (rot.LutSpill && LutSpill.sekkKnapp && LutSpill.sekkKnapp(id)) || (rot.EventyrSpill && EventyrSpill.sekkKnapp ? EventyrSpill.sekkKnapp(id) : null); return ek ? knapp(ek[0], ek[1]) : D.helse ? knapp('Bruk', () => helbred(id)) : ''; })(), knapp('Kast', () => { taUt(I, id, D.pakke || 1); lagre(); vis(); }))); }
    // tillegg fra andre moduler (spill/lut-visning.js: sekken på ryggen, vekten og knappen til beholderne): window.SEKK_TILLEGG.push((p, el, knapp) => …)
    for (const fn of rot.SEKK_TILLEGG || []) { try { fn(p, el, knapp); } catch (e) { console.error(e); } }
    if (rot.OverlevSpill && OverlevSpill.klar()) OverlevSpill.fyllSekk(p, el);
    p.append(el('small', {}, 'Utstyr kjøper du i Leir-menyen (fanen Lager), og du finner det i husene.' + (window.matchMedia && matchMedia('(pointer: coarse)').matches ? '' : ' Tastene 1–4 bytter våpen, R lader.'))); }
  function vis() { bytt.textContent = klar ? aktivt(I).def.navn : ''; if (!åpen) return; const ny2 = el('div'); fyll(ny2); if (ny2.innerHTML === sistHtml && panel.firstChild) return; sistHtml = ny2.innerHTML; panel.innerHTML = ''; panel.append(...ny2.childNodes); }
  function åpne(v) { åpen = !!v && klar; panel.classList.toggle('på', åpen); sekkKnapp.classList.toggle('på', åpen); sistHtml = ''; vis(); }
  bytt.onclick = () => velg((I.aktiv + 1) % I.våpen.length);
  rot.addEventListener('keydown', e => { if (!klar || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key.toLowerCase();
    if (k === 'i' && (går() || åpen)) { åpne(!åpen); e.preventDefault(); } else if (går() && /^[1-4]$/.test(k)) { if (velg(+k - 1)) e.preventDefault(); } else if (k === 'escape' && åpen) åpne(false); });
  setInterval(() => { const g = går(); sekkKnapp.hidden = !g; if (!g && åpen && !(typeof på3d !== 'undefined' && !på3d)) åpne(false); bytt.classList.toggle('på', g && VW < 900 && !(rot.KjorSpill && KjorSpill.fører())); if (åpen) vis(); }, 500);
  // kjøp: våpen og pakker legges rett i sekken (så langt vekta rekker)
  function kjøp(id) { const V = VÅPEN[id], T = TING[id];
    if ((V && V.selges === false) || (T && T.del)) return logg('Det kan ikke kjøpes.');
    if (V) { if (I.våpen.length >= MAKS_VÅPEN) return logg(`Du bærer alt ${MAKS_VÅPEN} våpen. Kast ett i sekken først.`); if (forTungt(I, V)) return logg('Sekken er for tung.'); if (!OppstartSpill.betal(V.pris)) return logg(`Ikke nok penger (${kr(V.pris)}).`); nyttVåpen(I, id); logg(`${V.navn} kjøpt.`); }
    else if (T) { const n = Math.min(T.pakke, plassTil(I, id)); if (!n) return logg('Sekken er for tung.'); if (!OppstartSpill.betal(T.pris * n)) return logg(`Ikke nok penger (${kr(T.pris * n)}).`); leggTil(I, id, n); logg(`${n} ${T.navn.toLowerCase()} kjøpt.`); }
    lagre(); vis(); if (rot.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); }
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e, knapp: kn }) => { if (!klar) return; hode.append(e('h3', { 'data-fane': 'lager' }, 'Våpen og utstyr'), e('small', {}, `Det du kjøper, legges i sekken din (${kg(vekt(I))} av ${maks()} kg, ${I.våpen.length} av ${MAKS_VÅPEN} våpen).`));
    for (const [id, V] of Object.entries(VÅPEN)) if (V.selges !== false) hode.append(e('div', { klasse: 'utstyr' }, e('div', {}, e('b', {}, V.navn), e('small', {}, `${V.tekst} · ${kg(V.vekt)}${I.våpen.some(w => w.id === id) ? ' · du har' : ''}`)), kn(`Kjøp ${kr(V.pris)}`, () => kjøp(id), { 'data-utstyr': id })));
    for (const [id, T] of Object.entries(TING)) if (!T.del) hode.append(e('div', { klasse: 'utstyr' }, e('div', {}, e('b', {}, T.navn), e('small', {}, `${T.pakke} ${T.enhet} · du har ${I.ting[id] || 0}`)), kn(`Kjøp ${kr(T.pris * T.pakke)}`, () => kjøp(id), { 'data-utstyr': id })));
    hode.append(kn('Åpne sekken', () => åpne(true), { id: 'apnesekk' })); });
  // funn i et hus du har lett gjennom (kalles fra leting-visning.js): gir teksten, eller '' når det ikke var noe
  function fantIHus(kl, i) { if (!klar) return ''; const f = funn(kl, i); if (!f) return '';
    if (f.våpen) { const g = nyttVåpen(I, f.våpen); lagre(); vis(); return g ? `Du fant også et våpen (${VÅPEN[f.våpen].navn.toLowerCase()}), men kunne ikke ta det med: ${g.toLowerCase()}` : `Du fant også et våpen: ${VÅPEN[f.våpen].navn.toLowerCase()}!`; }
    const n = leggTil(I, f.ting, f.n); lagre(); vis(); return n ? `I sekken: ${n} ${TING[f.ting].navn.toLowerCase()}.` : `Du fant ${TING[f.ting].navn.toLowerCase()}, men sekken er for tung.`; }
  rot.UtstyrSpill = { start, nyttVåpen: id => { const g = nyttVåpen(I, id); lagre(); vis(); return g; }, leggTil: (id, n) => { const t = leggTil(I, id, n); lagre(); vis(); return t; }, tilstand: () => I, aktivt: () => aktivt(I), velg, lad: v => { const t = lad(I, v || aktivt(I).v); lagre(); vis(); return t; }, kjøp, åpne, erÅpen: () => åpen, helbred, fantIHus, lagre, vis, klar: () => klar };
})(typeof window !== 'undefined' ? window : globalThis);
