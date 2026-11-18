'use strict';
/* Riksbrudd – KAMERAVAKTA i spillet (reglene i spill/kameravakt.js; lastes etter kamera-visning.js, folk-visning.js og gange.js).
 * Folk på oppgaven «overvåking» sitter i kontrollrommet og ser gjennom klippene fra kameraene. Finner de folk, kommer det et varsel i
 * loggen og et merke i kartet, og fienden vises så lenge noen følger med. «Kameravakt» i Leir-menyen (fanen Bygg): kameraene med type,
 * hvor mange som ser gjennom, klippene, «Se gjennom kameraet» (3D fra toppen av masta, mot det siste som ble sett) og «Vis sporene»
 * (hvor folk har gått forbi kameraene de siste to døgnene). I testene (navigator.webdriver) virker kameraene som før til
 * KameravaktSpill.test = true. window.KameravaktSpill.
 */
(function () {
  const KV = window.Kameravakt; if (!KV || !window.KameraSpill) return;
  const NØKKEL = 'riksbrudd-kameravakt', api = { test: false }, auto = () => !navigator.webdriver || api.test, $ = id => document.getElementById(id);
  let K = KV.ny(), leirId = '', klar = false, akk = 0, sistLagret = 0, visSpor = false, merker = [], inne = null;
  try { visSpor = localStorage.getItem('riksbrudd-kamspor') === '1'; } catch (e) { visSpor = false; }
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ...K })); } catch (e) { /* fullt eller sperret */ } };
  function start() { const S = spill(); if (!S || !S.leir) return; leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    K = d && d.leir === leirId ? KV.fra(d) : KV.ny(); klar = true; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  const kameraer = () => KameraSpill.kameraer();
  // kontrollrommet må virke (ferdig, med strøm) for at noen skal kunne se gjennom klippene
  function rom() { const L = window.LeirSpill && LeirSpill.tilstand(), s = window.LeirSpill && LeirSpill.siste && LeirSpill.siste(); return !!(L && L.bygg.some(b => b.type === 'kontrollrom' && Leir.virker(b) && !b.av && !(s && s.mangler && s.mangler.has(b.id)))); }
  const antall = () => (window.Folk ? Folk.arbeidere('overvåking') : 0);
  const tempo = () => (rom() && window.Folk ? Folk.tempo('overvåking') : 0);
  const fiender = () => ENHETER.filter(e => e.side !== 'blå' && e.menn && e.menn.some(m => m.hp > 0)).map(e => ({ id: e.navn, x: e.x, y: e.y, antall: e.menn.filter(m => m.hp > 0).length, side: e.side }));
  const navn = c => { const i = kameraer().findIndex(q => q.id === c.id); return 'Kamera ' + (i + 1); }, kam = id => kameraer().find(c => c.id === id);
  const klokke = t => { const m = ((Math.floor(t) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  KROKER.sim.push(dt => { if (!klar || !auto()) return; akk += dt; if (akk < .5) return; const d = akk; akk = 0; const C = kameraer(); if (!C.length) return;
    const u = KV.steg(K, C, fiender(), tid, d, { tempo: tempo(), vind: window.VAER && VAER.regel ? (VAER.regel.vind && VAER.regel.vind.fart) || 0 : 0 });
    for (const k of u.varsler) { const c = kam(k.kam); logg(`${c ? navn(c) : 'Kameraet'}: ${KV.tekst(k)}${KV.type(c && c.nivå).selv ? '' : ' (sett av kameravakta)'}.`); merker.push({ x: k.x, y: k.y, til: performance.now() + 60000 }); varselKort(k, c); skitten = true; }
    if (u.nye.length || u.varsler.length || u.avvist) { const nå = performance.now(); if (nå - sistLagret > 4000) { sistLagret = nå; lagre(); } } });
  // VARSELKORTET (18. nov): et lite kort oppe til høyre når et kamera har sett folk – med «Se gjennom kameraet» og «Vis i kartet».
  // Kortet blir borte av seg selv etter 45 sekunder (Claudes forslag).
  const vk = document.createElement('div'); vk.id = 'kamvarsel'; vk.setAttribute('role', 'alert'); document.body.appendChild(vk); let vkTid = 0;
  { const st = document.createElement('style'); st.textContent = `#kamvarsel{ position:fixed; right:12px; top:calc(var(--topp,58px) + 150px); z-index:9; display:none; width:min(300px, calc(100vw - 24px)); box-sizing:border-box; padding:10px 12px; background:var(--panel,#1c170f); border:1px solid #c0503a; border-left-width:4px; color:var(--ink,#e7dcc3); box-shadow:0 6px 22px rgba(0,0,0,.55); font-size:14px; line-height:1.35; }
#kamvarsel.på{ display:block; } #kamvarsel b{ display:block; color:#f0b49a; margin-bottom:2px; } #kamvarsel .rad{ display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; } #kamvarsel button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:38px; padding:4px 10px; cursor:pointer; font:inherit; }
#kamvarsel button.hoved{ border-color:#c9b26a; color:#f0d79a; } #kamvarsel .x{ position:absolute; right:2px; top:0; border:none; background:none; font-size:20px; min-height:32px; } body.kort #kamvarsel{ top:calc(var(--topp,44px) + 44px); right:8px; } body.ikamera #kamvarsel, body.foto #kamvarsel{ display:none; }`; document.head.appendChild(st); }
  function varselKort(k, c) {
    const S = spill(), kn = (t, f, kl) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if (kl) b.className = kl; b.onclick = f; return b; };
    const d = S && S.leir ? Math.hypot(k.x - S.leir.x, k.y - S.leir.y) : 0, v = S && S.leir ? Math.atan2(k.x - S.leir.x, k.y - S.leir.y) : 0, ret = ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'][((Math.round(v / (Math.PI / 4)) % 8) + 8) % 8];
    vk.innerHTML = ''; const tittel = document.createElement('b'); tittel.textContent = `${c ? navn(c) : 'Kameraet'} har sett folk`; const tekst = document.createElement('div');
    tekst.textContent = KV.tekst(k) + (d > 30 ? ` – ${Math.round(d / 10) * 10} m ${ret} for leiren.` : '.'); const rad = document.createElement('div'); rad.className = 'rad';
    rad.append(kn('Se gjennom kameraet', () => { skjulVarsel(); seGjennom(c ? c.id : k.kam); }, 'hoved'), kn('Vis i kartet', () => { skjulVarsel(); if (typeof slå3d === 'function' && typeof på3d !== 'undefined' && på3d) slå3d(false); if (window.kartTil) kartTil(k.x, k.y, 3); }));
    vk.append(kn('×', skjulVarsel, 'x'), tittel, tekst, rad); vk.classList.add('på'); vkTid = performance.now(); vk.dataset.kam = String(c ? c.id : k.kam);
  }
  function skjulVarsel() { vk.classList.remove('på'); }
  setInterval(() => { if (vk.classList.contains('på') && performance.now() - vkTid > 45000) skjulVarsel(); }, 2000);
  // uten folk på overvåking blir klippene liggende: si fra én gang i blant
  let sistMast = 0;
  setInterval(() => { if (!klar || !auto()) return; const v = KV.venter(K); if (v >= 3 && tempo() <= 0 && performance.now() - sistMast > 240000) { sistMast = performance.now(); logg(`${v} klipp fra kameraene er ikke sett gjennom. ${rom() ? 'Sett noen på «overvåking» i Folk.' : 'Du trenger et kontrollrom som virker, og folk på «overvåking».'}`); } }, 5000);
  // ---------- kartet: merke der folk ble sett, og sporene ----------
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, nå = performance.now(); merker = merker.filter(q => q.til > nå);
    g.save();
    if (visSpor && m < 40) for (const s of KV.spor(K)) { const P = s.punkter, farge = typeof sidefarge === 'function' && s.side ? sidefarge(s.side, 'lys') : '#e0a070';
      g.strokeStyle = farge; g.fillStyle = farge; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.globalAlpha = .7; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(sx(p.x), sy(p.y)) : g.moveTo(sx(p.x), sy(p.y)))); g.stroke(); g.setLineDash([]);
      for (const p of P) { const alder = (tid - p.t) / (KV.REGLER.historikkTimer * 60); g.globalAlpha = Math.max(.25, 1 - alder); g.beginPath(); g.arc(sx(p.x), sy(p.y), 2.6, 0, 6.283); g.fill(); }
      const e = P[P.length - 1]; g.globalAlpha = .95; g.font = '12px "Cormorant Garamond", serif'; g.textAlign = 'left'; g.fillText('sett ' + klokke(e.t), sx(e.x) + 6, sy(e.y) - 5); }
    g.globalAlpha = 1; for (const q of merker) { const f = ((q.til - nå) % 1500) / 1500, x = sx(q.x), y = sy(q.y); g.strokeStyle = `rgba(224,90,60,${.3 + .7 * f})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9 + (1 - f) * 12, 0, 6.283); g.stroke(); g.fillStyle = '#e05a3c'; g.beginPath(); g.arc(x, y, 3, 0, 6.283); g.fill(); }
    if (merker.length) skitten = true; g.restore(); });
  // ---------- se gjennom kameraet i 3D ----------
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), vent = ms => new Promise(r => setTimeout(r, ms));
  function fører(R) { const c = inne, u = R.ut; if (!c || !u) return false; const x = c.x - u.cx, y = c.y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) return false;
    const z = (hoyde3d(c.x, c.y) - u.h0) * R.EX + 9.2, f = R.fot, b = R.bane; b.x = x; b.y = y; f.pitch = Math.max(-1.2, Math.min(.5, f.pitch));
    R.cam.position.set(x, y, z); R.cam.up.set(0, 0, 1); R.cam.lookAt(x - Math.sin(f.a) * Math.cos(f.pitch), y + Math.cos(f.a) * Math.cos(f.pitch), z + Math.sin(f.pitch)); return true; }
  async function seGjennom(id) { const c = kam(id) || kameraer()[0]; if (!c) { logg('Ingen kameraer som virker.'); return false; } if (inne) ut();
    const sist = [...K.klipp].reverse().find(k => k.kam === c.id && k.hva === 'folk' && k.status !== 'venter') || [...K.klipp].reverse().find(k => k.kam === c.id);
    if (window.lukkPanel) lukkPanel(); const lm = $('leirmeny'); if (lm && lm.classList.contains('på') && $('leirknapp')) $('leirknapp').click();
    if (r3() && R3.fot && window.Gange) Gange.stopp(); kam2d(c);
    if (typeof på3d === 'undefined' || !på3d) await slå3d(true); else if (r3() && R3.ut && (Math.abs(c.x - R3.ut.cx) > R3.ut.S * .6 || Math.abs(c.y - R3.ut.cy) > R3.ut.S * .6)) { await slå3d(false); await slå3d(true); }
    for (let i = 0; i < 600 && !(r3() && R3.ut && !R3.bygger); i++) await vent(100);
    const R = r3(); if (!R || !R.ut || !window.Gange) return false; R.bane.x = c.x - R.ut.cx; R.bane.y = c.y - R.ut.cy; Gange.start(); if (!R.fot) return false;
    inne = c; const mål = sist || { x: c.x, y: c.y + 100 }; R.fot.a = Math.atan2(-(mål.x - c.x), mål.y - c.y); R.fot.pitch = -.12; Gange.settFører(fører, ['Ut', 'Ut']);
    api.filterFør = window.Filtre ? Filtre.valgt() : null; if (window.Filtre && api.filterFør === 'ingen') Filtre.velg('vhs');
    document.body.classList.add('ikamera'); lapp.textContent = `${navn(c)} · ${KV.type(c.nivå).navn}`; lapp.append(document.createElement('br'), document.createTextNode(sist ? `Sist: ${sist.status === 'venter' ? 'usett klipp' : KV.tekst(sist)}, kl. ${klokke(sist.t)}` : 'Ingen klipp ennå'));
    logg(`Du ser gjennom ${navn(c).toLowerCase()}. Dra for å se deg rundt. Esc går ut.`); return true; }
  // (rettet 18. nov: «kam» er i denne fila en funksjon som finner et kamera, så kartet ble aldri flyttet; window.kartTil ligger i samfunn-visning.js)
  function kam2d(c) { if (window.kartTil) kartTil(c.x, c.y, 1.2); skitten = true; }
  function ut() { if (!inne) return; inne = null; document.body.classList.remove('ikamera'); if (window.Gange) { Gange.settFører(null); Gange.stopp(); } if (window.Filtre && api.filterFør === 'ingen' && Filtre.valgt() === 'vhs') Filtre.velg('ingen'); }
  window.addEventListener('keydown', e => { if (inne && (e.key === 'Escape' || e.key === 'f' || e.key === 'F')) { e.stopPropagation(); ut(); } }, true);
  setInterval(() => { if (inne && !(r3() && R3.fot)) ut(); }, 500);
  const css = document.createElement('style');
  css.textContent = `#kamlapp{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,48px) + 46px); z-index:9; display:none; padding:6px 12px; background:rgba(12,10,8,.78); border:1px solid #8a7440; border-radius:3px; color:#e7dcc3; font-size:14px; text-align:center; letter-spacing:.03em; }
#kamut{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(22px + env(safe-area-inset-bottom,0px)); z-index:9; display:none; }
body.ikamera #kamlapp{ display:block; } body.ikamera #kamut{ display:block; } body.ikamera #nhud, body.ikamera #karakterknapp, body.ikamera #gaaknapp, body.ikamera #kjorknapp, body.ikamera #letknapp{ display:none !important; }
.kamvakt .rad{ display:flex; gap:8px; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(201,178,106,.14); } .kamvakt .rad small{ color:var(--ink-dim,#a99); }
.kamvakt .klipp{ font-size:13.5px; padding:2px 0; } .kamvakt .klipp.folk{ color:#f0a58c; } .kamvakt .klipp.venter{ color:var(--ink-dim,#a99); font-style:italic; }
.kamvakt .tall{ display:flex; gap:14px; margin:4px 0 6px; } .kamvakt .tall b{ font-size:17px; } .kamvakt .mangler{ color:#e8b06a; margin:4px 0; }`;
  document.head.appendChild(css);
  const lapp = document.createElement('div'); lapp.id = 'kamlapp'; document.body.appendChild(lapp);
  const utknapp = document.createElement('button'); utknapp.id = 'kamut'; utknapp.textContent = 'Gå ut av kameraet'; utknapp.onclick = ut; document.body.appendChild(utknapp);
  // ---------- Leir-menyen ----------
  const folkPluss = d => { const F = window.FolkSpill && FolkSpill.tilstand(); if (!F || !window.FolkRegler) return; if (d > 0) FolkRegler.pluss(F, 'overvåking'); else FolkRegler.minus(F, 'overvåking'); if (FolkSpill.lagre) FolkSpill.lagre(); if (window.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); };
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp }) => { if (!klar) return; const C = kameraer(), L = window.LeirSpill && LeirSpill.tilstand(), alle = L ? L.bygg.filter(b => b.type === 'kameramast').length : 0; if (!alle) return;
    hode.append(e('h3', { 'data-fane': 'bygg' }, 'Kameravakt'));
    const boks = e('div', { klasse: 'kamvakt' }), n = antall(), v = KV.venter(K), trenger = C.some(c => !KV.type(c.nivå).selv);
    boks.append(e('div', { klasse: 'tall' }, e('span', {}, e('b', {}, String(C.length)), ` av ${alle} kameraer virker`), e('span', {}, e('b', {}, String(n)), ' ser gjennom'), e('span', {}, e('b', {}, String(v)), ' klipp venter')));
    if (trenger && !rom()) boks.append(e('div', { klasse: 'mangler' }, 'Ingen kan se gjennom klippene: du trenger et kontrollrom som er ferdig og har strøm.'));
    else if (trenger && n === 0) boks.append(e('div', { klasse: 'mangler' }, 'Ingen ser gjennom klippene. Kameraene filmer, men fiender blir ikke meldt før noen har sett klippet.'));
    if (trenger) boks.append(e('div', { klasse: 'rad' }, e('span', {}, 'Folk på overvåking'), e('span', {}, knapp('−', () => folkPluss(-1), { id: 'kamminus' }), ` ${n} `, knapp('+', () => folkPluss(1), { id: 'kampluss' }))));
    C.forEach((c, i) => { const T = KV.type(c.nivå), ser = KV.ser(K, c, tid); boks.append(e('div', { klasse: 'rad' }, e('span', {}, `Kamera ${i + 1} `, e('small', {}, `${T.kort}, ${c.r} m${ser && !T.selv ? ' · følger folk nå' : ''}`)), knapp('Se gjennom', () => seGjennom(c.id), { 'data-kam': c.id, title: T.tekst }))); });
    const siste = [...K.klipp].reverse().slice(0, 6); if (siste.length) { boks.append(e('small', { style: 'display:block;margin-top:6px' }, 'Siste klipp'));
      for (const k of siste) { const i = C.findIndex(c => c.id === k.kam); boks.append(e('div', { klasse: 'klipp ' + (k.status === 'venter' ? 'venter' : k.status) }, `${klokke(k.t)} · kamera ${i >= 0 ? i + 1 : '?'} · ${k.status === 'venter' ? 'ikke sett gjennom' : KV.tekst(k)}`)); } }
    boks.append(knapp(visSpor ? 'Skjul sporene i kartet' : `Vis sporene i kartet (${KV.spor(K).length})`, () => { visSpor = !visSpor; try { localStorage.setItem('riksbrudd-kamspor', visSpor ? '1' : '0'); } catch (x) { /* sperret */ } skitten = true; if (LeirSpill.visMeny) LeirSpill.visMeny(); }, { id: 'kamspor' }));
    boks.append(e('small', { style: 'display:block;margin-top:6px;color:var(--ink-dim,#a99)' }, 'Nivå 1 filmer når noe rører seg (også dyr og vær), nivå 2 filmer hele tiden og lagrer sporet av dem som går forbi, nivå 3 skiller selv folk fra dyr og varsler straks. Oppgrader masta for å bytte type.'));
    hode.append(boks); });
  Object.assign(api, { varselKort, skjulVarsel, K: () => K, ser: c => !klar || !auto() || KV.ser(K, c, tid), venter: () => KV.venter(K), antall, tempo, rom, seGjennom, ut, inne: () => inne, visSpor: v => { if (v !== undefined) { visSpor = !!v; skitten = true; } return visSpor; }, lagre, nullstill: () => { K = KV.ny(); merker = []; } });
  window.KameravaktSpill = api;
})();
