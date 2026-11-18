'use strict';
/* Riksbrudd – STRIDSREGLER I SPILLET (17. nov, brukeren – se spill/strid.js for reglene og sitatet).
 * Hvert av lagene dine har stridsregler (s.strid: når det åpner ild, hva det gjør som underlegent, tap før retrett, om det rykker
 * fram) og en bevæpning (s.strid.bev). Du setter dem i panelet «Stridsregler» fra lagpanelet, ett lag om gangen eller for alle.
 * Kampen (kamprunde i index.html) får tre ting herfra gjennom KROKER.ild: høydeforskjellen, hvem som oppdaget hvem først, og om
 * laget har lov til å skyte. Fiendens lag har også bevæpning (røvere lett, Kystalliansen standard, Folkefronten avstand) – du ser den
 * når du ser laget. Hvert spillminutt vurderer lagene dine styrkeforholdet mot fienden de ser, og trekker seg, unngår eller rykker
 * fram etter reglene sine. I testene (navigator.webdriver) gjør de ikke det av seg selv (StridSpill.test). window.StridSpill.
 */
(function () {
  const S = window.Strid; if (!S || typeof Terreng === 'undefined') return;
  Object.assign(Terreng.VÅPEN, S.VÅPEN);
  const NØKKEL = 'riksbrudd-strid', api = { test: false }, auto = () => !navigator.webdriver || api.test;
  let mal = S.standard(); try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d) mal = S.ren(d); } catch (e) { mal = S.standard(); }
  const FIENDE = { ild: 'fri', underlegen: 'kjemp', tap: 0, fram: 'nei' };
  const fiendeBev = s => (s.raid || s.post || /røver/i.test(s.navn) ? 'lett' : s.side === 'grønn' ? 'avstand' : 'standard');
  // lagets regler (lages første gang de trengs), og våpnene deles ut én gang per endring
  function regel(s) { if (s.side === 'blå') { if (!s.strid || s.strid.ild === undefined) s.strid = S.ren(s.strid || mal); } else if (!s.strid) s.strid = { ...FIENDE, bev: fiendeBev(s) };
    if (s.bevSatt !== s.strid.bev) { S.bevæpn(s.menn, s.strid.bev); s.bevSatt = s.strid.bev; } return s.strid; }
  const egne = () => ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e));
  const rekkevidde = s => s.menn.reduce((r, m) => (m.hp >= 1 ? Math.max(r, Terreng.vapen(m.våpen || m.rolle)[0]) : r), 0);
  const beskutt = s => s.beskuttTid !== undefined && tid - s.beskuttTid < 15;
  // ---------- hvem så hvem først ----------
  const SETT = new Map(), nøkkel = (a, b) => a.navn + '>' + b.navn, kontakt = (a, b) => ({ a: SETT.has(nøkkel(a, b)) ? SETT.get(nøkkel(a, b)) : null, b: SETT.has(nøkkel(b, a)) ? SETT.get(nøkkel(b, a)) : null });
  const forholdF = (a, b) => ({ målISkog: !!b.her && b.her.k === 1, målPåMarsj: !!b.sti, skytterPåMarsj: !!a.sti, høydefordel: a.her && b.her ? a.her.h - b.her.h : 0 });
  const dh = (a, b) => (a.her && b.her && isFinite(a.her.h) && isFinite(b.her.h) ? a.her.h - b.her.h : 0);
  // faktoren for a sin ild mot b: høyde × oppdagelse (og 0 når laget ikke har lov til å skyte)
  // (kroken kalles også når et lag skyter mot et kjøretøy eller omvendt – de har ikke mannskapsliste og får ingen regler)
  function faktor(a, b, d) { if (!a || !b || !Array.isArray(a.menn) || !Array.isArray(b.menn)) return 1; regel(a); regel(b); let f = S.høydeRett(dh(a, b)) * S.oppdagelse(kontakt(a, b), tid);
    if (a.side === 'blå' && !a.karakter && !S.ildLov(a.strid, { avstand: d, beskutt: beskutt(a) })) f = 0; return f; }
  KROKER.ild.push((a, b) => faktor(a, b, Math.hypot(a.x - b.x, a.y - b.y)));
  // Vurderingen laget gjør: nærmeste fiende det ser, og styrkeforholdet med alt regnet inn (uten ildforbudet – det er vårt eget valg)
  function vurdering(s) { regel(s); let fi = null, d = Infinity; for (const e of ENHETER) { if (e.side === s.side || !levende(e)) continue; const q = Math.hypot(e.x - s.x, e.y - s.y); if (q < d && q < 1600 && (ser(s, e.x, e.y) || (s.side === 'blå' && synlig(e)))) { d = q; fi = e; } }
    if (!fi) return null; regel(fi); const hf = S.høydeRett(dh(s, fi)), of = S.oppdagelse(kontakt(s, fi), tid), vår = S.kraft(s.menn, d, forholdF(s, fi), hf * of, Terreng.treffsjanse), deres = S.kraft(fi.menn, d, forholdF(fi, s), S.høydeRett(dh(fi, s)) * S.oppdagelse(kontakt(fi, s), tid), Terreng.treffsjanse);
    return { fi, d, vår, deres, forhold: S.forhold(vår, deres), høyde: dh(s, fi), høydeF: S.høyde(dh(s, fi)), oppdag: of, ute: Terreng.uteAvKamp(s.menn), rekkevidde: rekkevidde(s) }; }

  // EGET INITIATIV (Strid.tiltak): hente ammunisjon, komme et lag under ild til hjelp, eller flytte seg til høyere terreng like ved
  const leirPos = () => { const O = window.OppstartSpill && OppstartSpill.tilstand(); return O && O.leir ? O.leir : null; };
  // der ammunisjonen fylles: leiren, eller et tettsted vi holder
  function forsyningssted(s) { const L = leirPos(); let best = L ? { x: L.x, y: L.y, navn: 'leiren', d: Math.hypot(L.x - s.x, L.y - s.y) } : null;
    if (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted && window.Garnison && typeof TETTSTEDER !== 'undefined') for (const b of INFRA.tettsted) { if (b.bb[2] < s.x - 30000 || b.bb[0] > s.x + 30000 || b.bb[3] < s.y - 30000 || b.bb[1] > s.y + 30000) continue; if (Garnison.tilstand(TETTSTEDER, b.e.id).eier !== 'blå') continue;
      const x = (b.bb[0] + b.bb[2]) / 2, y = (b.bb[1] + b.bb[3]) / 2, d = Math.hypot(x - s.x, y - s.y); if (!best || d < best.d) best = { x, y, navn: b.e.navn, d }; }
    return best; }
  function høyereNær(s) { const h0 = hoydeVed(s.x, s.y); if (!isFinite(h0)) return null; let best = null; for (const r of [70, S.INITIATIV.søk]) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r, h = hoydeVed(x, y); if (isFinite(h) && (!best || h > best.h)) best = { x, y, h }; }
    return best ? { ...best, vinn: best.h - h0 } : null; }
  // Laget spør selv om det kan ta ordre (eget initiativ, hvert steg): krokene skal da ikke skrive i loggen. Før sto
  // «ingen radiokontakt – ordren når ikke fram» på nytt og på nytt for et lag uten kontakt.
  const kanStille = s => { const l = window.logg; window.logg = () => {}; try { return kanStille(s); } finally { window.logg = l; } };
  function initiativ(s, v) { const r = regel(s); if (s.sti && r.forsyn !== 'ja') return; if (s.nedgravd || s.ombord || s.forsvar || s.leirvakt) return; if (!kanStille(s)) return;
    const amm = window.Forsyning ? Forsyning.ammo(s) : 1, sted = amm < S.INITIATIV.ammo ? forsyningssted(s) : null, hø = v && !s.sti ? høyereNær(s) : null;
    let venn = null; if (!v && !s.sti && r.støtte === 'ja') for (const e of egne()) { if (e === s || !beskutt(e)) continue; const d = Math.hypot(e.x - s.x, e.y - s.y); if (d <= S.INITIATIV.støtte && (!venn || d < venn.d)) venn = { e, d }; }
    const t = S.tiltak(r, { stille: !s.sti, fiende: v ? v.d : null, beskutt: beskutt(s), høyde: hø ? hø.vinn : 0, venn: venn ? venn.d : null, ammo: amm, hjemme: !sted || sted.d < 250 || (s.initiativ === 'forsyn' && !!s.sti) });
    if (!t) return null; s.stridSist = tid; s.initiativ = t.hva;
    // (18. nov) husk hva laget gjorde av seg selv, hvorfor og når – vises i lagpanelet
    s.egetValg = { hva: t.hva === 'forsyn' ? 'gikk etter ammunisjon' : t.hva === 'støtte' ? 'kom ' + venn.e.navn + ' til hjelp' : 'flyttet seg til høyere terreng', grunn: t.grunn || '', t: tid };
    if (t.hva === 'forsyn') { ordre(s, sted.x, sted.y, true); logg(`${s.navn} går til ${sted.navn} etter ammunisjon: ${t.grunn}.`); }
    else if (t.hva === 'støtte') { const a = Math.atan2(s.y - venn.e.y, s.x - venn.e.x); ordre(s, venn.e.x + Math.cos(a) * 180, venn.e.y + Math.sin(a) * 180, true); logg(`${s.navn} kommer ${venn.e.navn} til hjelp.`); }
    else { ordre(s, hø.x, hø.y, true); logg(`${s.navn} flytter seg til høyere terreng: ${t.grunn}.`); }
    if (valgt === s) visPanel(); return t; }
  let akk = 0;
  KROKER.sim.push(dt => { akk += dt; if (akk < 1) return; akk = 0;   // hvert spillminutt
    for (const k of SKUDD) if (k.b) k.b.beskuttTid = tid;
    for (const a of ENHETER) { if (!levende(a)) continue; for (const b of ENHETER) { if (a.side === b.side || !levende(b)) continue; const d = Math.hypot(a.x - b.x, a.y - b.y), k = nøkkel(a, b);
        if (d > 2500) { SETT.delete(k); continue; } if (!SETT.has(k) && d < 1600 && ser(a, b.x, b.y)) { SETT.set(k, tid);
          if (a.side === 'blå' && !a.karakter && auto() && !SETT.has(nøkkel(b, a))) logg(`${a.navn} har oppdaget ${b.navn} (${Math.round(d)} m) uten å bli sett.`); } } }
    if (!auto()) return;
    for (const s of egne()) { if (s.planlegger || tid - (s.stridSist === undefined ? -99 : s.stridSist) < 15) continue; const v = vurdering(s), r = S.reaksjon(regel(s), v ? { forhold: v.forhold, ute: v.ute, avstand: v.d, beskutt: beskutt(s), rekkevidde: v.rekkevidde } : { ute: Terreng.uteAvKamp(s.menn), forhold: 1 });
      if (!r || (!v && !beskutt(s))) { initiativ(s, v); continue; } s.stridSist = tid;
      if (r.hva === 'fram') { if (s.sti || !kanStille(s)) continue; const a = Math.atan2(s.y - v.fi.y, s.x - v.fi.x), q = v.rekkevidde * .45; ordre(s, v.fi.x + Math.cos(a) * q, v.fi.y + Math.sin(a) * q, true); logg(`${s.navn} rykker fram mot ${v.fi.navn}: ${r.grunn}.`); s.egetValg = { hva: 'rykket fram mot ' + v.fi.navn, grunn: r.grunn || '', t: tid }; }
      else { const fx = v ? v.fi.x : s.x + 1, fy = v ? v.fi.y : s.y, a = Math.atan2(s.y - fy, s.x - fx); ordre(s, s.x + Math.cos(a) * 1500, s.y + Math.sin(a) * 1500, true); logg(`${s.navn} ${r.hva === 'unngå' ? 'trekker unna' : 'trekker seg tilbake'}: ${r.grunn}.`); s.egetValg = { hva: r.hva === 'unngå' ? 'trakk unna' : 'trakk seg tilbake', grunn: r.grunn || '', t: tid }; }
      if (valgt === s) visPanel(); } });

  // ---------- panelet ----------
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const kn = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = fn; return b; };
  const css = document.createElement('style');
  css.textContent = `#stridpanel{ position:fixed; right:10px; top:calc(var(--topp,58px) + 56px); z-index:30; display:none; width:min(390px,94vw); max-height:calc(100vh - var(--topp,58px) - 120px); overflow:auto; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#stridpanel.på{ display:block; } #stridpanel h2{ margin:0 28px 2px 0; font-size:19px; } #stridpanel h3{ margin:12px 0 4px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); } #stridpanel small{ color:var(--ink-dim,#a99); }
#stridpanel .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
#stridpanel button, #stridpanel select{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:36px; padding:2px 10px; font:inherit; font-size:13.5px; cursor:pointer; } #stridpanel button.på{ border-color:#c9b26a; background:#3a3020; } #stridpanel button:disabled{ opacity:.5; }
#stridpanel .hold{ display:grid; grid-template-columns:1fr 1fr; gap:6px; } #stridpanel .hold button{ text-align:left; padding:6px 9px; } #stridpanel .hold button small{ display:block; font-size:12px; line-height:1.25; }
#stridpanel label{ display:grid; grid-template-columns:118px 1fr; gap:8px; align-items:center; margin:5px 0; } #stridpanel select{ width:100%; }
#stridpanel .bev{ display:flex; justify-content:space-between; gap:8px; align-items:center; padding:5px 0; border-bottom:1px solid #2e281e; } #stridpanel .bev small{ display:block; font-size:12.5px; } #stridpanel .bev.på b{ color:#e8d48a; }
#stridpanel .naa{ border:1px solid #c9b26a; background:#221c12; padding:7px 9px; margin-top:4px; } #stridpanel .naa .rad{ display:flex; justify-content:space-between; gap:10px; } #stridpanel .naa .pluss{ color:#9fd08a; } #stridpanel .naa .minus{ color:#f0a88a; }
body.smal #stridpanel, body.kort #stridpanel{ left:0; right:0; top:auto; bottom:0; width:auto; max-height:66vh; border-width:1px 0 0; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'stridpanel', role: 'dialog', 'aria-label': 'Stridsregler' }); document.body.appendChild(panel);
  let lag = null, sist = '';
  const pst = f => (f >= 1 ? '+' : '−') + Math.round(Math.abs(f - 1) * 100) + ' %';
  function sett(s, endring, alle) { for (const q of alle ? egne() : [s]) { q.strid = S.ren({ ...regel(q), ...endring }); regel(q); q.siktSkitten = q.siktSkitten; } mal = S.ren({ ...mal, ...(alle ? endring : {}) }); if (alle) { try { localStorage.setItem(NØKKEL, JSON.stringify(mal)); } catch (e) { /* sperret */ } } if (window.LagringSpill && LagringSpill.lagre) LagringSpill.lagre(); vis(true); if (valgt) visPanel(); }
  function velgBev(s, id) { const B = S.BEVÆPNING[id]; if (regel(s).bev === id) return; if (B.pris > 0 && !(window.OppstartSpill && OppstartSpill.betal(B.pris))) { logg(`Ikke råd til bevæpningen «${B.navn}» (${B.pris.toLocaleString('nb-NO')} kr).`); return; } sett(s, { bev: id }); logg(`${s.navn} har fått bevæpningen «${B.navn}» (${B.kort}).`); }
  function bygg(s) { const r = regel(s), f = document.createDocumentFragment(), h = S.holdningFor(r), v = vurdering(s);
    f.append(kn('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk stridsreglene' }), el('h2', {}, 'Stridsregler'), el('small', {}, `${s.navn} · bestemmer hva laget gjør når det møter fienden`));
    f.append(el('h3', {}, 'Holdning')); const hold = el('div', { klasse: 'hold' }); for (const [id, H] of Object.entries(S.HOLDNING)) hold.append(kn('', () => sett(s, H.regel), { klasse: h === id ? 'på' : '', 'data-holdning': id })); [...hold.children].forEach((b, i) => { const H = Object.values(S.HOLDNING)[i]; b.append(el('b', {}, H.navn), el('small', {}, H.tekst)); }); f.append(hold);
    f.append(el('h3', {}, h ? 'Eller velg selv' : 'Egne regler')); for (const [k, V] of Object.entries(S.VALG)) { const sel = el('select', { 'data-regel': k }); for (const [vv, t] of Object.entries(V.valg)) { const o = el('option', { value: vv }, t); if (String(r[k]) === vv) o.selected = true; sel.append(o); } sel.onchange = () => sett(s, { [k]: k === 'tap' ? +sel.value : sel.value }); f.append(el('label', {}, el('span', {}, V.navn), sel)); }
    f.append(el('h3', {}, 'Bevæpning')); for (const id of S.VALGBARE) { const B = S.BEVÆPNING[id], på = r.bev === id; f.append(el('div', { klasse: 'bev' + (på ? ' på' : ''), 'data-bev': id }, el('div', {}, el('b', {}, B.navn), el('small', {}, `${B.kort}. ${B.tekst}`)), kn(på ? 'I bruk' : B.pris ? `Bytt · ${B.pris.toLocaleString('nb-NO')} kr` : 'Bytt', () => velgBev(s, id), på ? { disabled: '', style: 'white-space:nowrap' } : { style: 'white-space:nowrap' }))); }
    f.append(el('h3', {}, 'Slik står det nå')); const nå = el('div', { klasse: 'naa' });
    if (v) { nå.append(el('div', { klasse: 'rad' }, el('b', {}, `Mot ${v.fi.navn}`), el('span', {}, `${Math.round(v.d)} m`)), el('div', { klasse: 'rad' }, el('span', {}, 'Styrkeforhold'), el('b', { klasse: v.forhold >= 1 ? 'pluss' : 'minus' }, `${S.forholdTekst(v.forhold)}${isFinite(v.forhold) && v.forhold > 0 ? ' (' + String(Math.round(v.forhold * 10) / 10).replace('.', ',') + ' : 1)' : ''}`)));
      if (Math.abs(v.høyde) >= S.HØYDE.fra) nå.append(el('div', { klasse: 'rad' }, el('span', {}, v.høyde > 0 ? `Vi står ${Math.round(v.høyde)} m høyere` : `De står ${Math.round(-v.høyde)} m høyere`), el('span', { klasse: v.høyde > 0 ? 'pluss' : 'minus' }, pst(v.høydeF) + ' treff')));
      if (v.oppdag !== 1) nå.append(el('div', { klasse: 'rad' }, el('span', {}, S.oppdagetTekst(v.oppdag)), el('span', { klasse: v.oppdag > 1 ? 'pluss' : 'minus' }, pst(v.oppdag) + ' treff')));
      nå.append(el('div', { klasse: 'rad' }, el('span', {}, 'De har'), el('span', {}, S.BEVÆPNING[regel(v.fi).bev].kort)));
      const re = S.reaksjon(r, { forhold: v.forhold, ute: v.ute, avstand: v.d, beskutt: beskutt(s), rekkevidde: v.rekkevidde }), lov = S.ildLov(r, { avstand: v.d, beskutt: beskutt(s) });
      nå.append(el('div', { klasse: 'rad' }, el('span', {}, 'Laget vil'), el('b', {}, re ? (re.hva === 'fram' ? 'rykke fram' : re.hva === 'unngå' ? 'trekke unna' : 'trekke seg tilbake') : lov ? 'kjempe der det står' : 'holde ilden'))); }
    else nå.append(el('small', {}, 'Laget ser ingen fiender. Når det gjør det, står styrkeforholdet her – med høyde, hvem som oppdaget hvem først, og våpnene på begge sider.'));
    f.append(nå, el('div', { style: 'margin-top:10px' }, kn('Bruk disse reglene på alle lag', () => { const q = regel(s); sett(s, { ild: q.ild, underlegen: q.underlegen, tap: q.tap, fram: q.fram }, true); logg('Stridsreglene gjelder nå alle lagene dine, og nye lag får dem.'); }, { id: 'stridalle' })));
    f.append(el('small', { style: 'display:block;margin-top:8px' }, `Høyde: fra ${S.HØYDE.fra} m over fienden treffer laget bedre (opptil +${Math.round((S.HØYDE.maks - 1) * 100)} % ved ${S.HØYDE.full} m), og tilsvarende dårligere oppover. Oppdager laget fienden først, treffer det +${Math.round((S.OPPDAG.først - 1) * 100)} % det første kvarteret; ser ikke fienden laget i det hele tatt, +${Math.round((S.OPPDAG.bakhold - 1) * 100)} %. Lag som står stille og er gravd ned, er vanskeligst å oppdage.`));
    return f; }
  function vis(tving) { if (!lag || !panel.classList.contains('på')) return; if (!levende(lag)) { lukk(); return; } if (!tving && window.pekerNede && pekerNede(panel)) return; if (!tving && document.activeElement && panel.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return;
    const ny = el('div'); ny.append(bygg(lag)); const html = ny.innerHTML + lag.navn; if (!tving && html === sist) return; sist = html; const topp = panel.scrollTop; panel.replaceChildren(...ny.childNodes); panel.scrollTop = topp; }
  function åpne(s) { lag = s; panel.classList.add('på'); sist = ''; vis(true); }
  function lukk() { panel.classList.remove('på'); lag = null; }
  setInterval(() => vis(false), 1500);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('på')) lukk(); });
  KROKER.lagKnapper.push((s, H) => { if (s.side !== 'blå' || s.karakter) return; H.appendChild(knapp('Stridsregler', panel.classList.contains('på') && lag === s, () => (panel.classList.contains('på') && lag === s ? lukk() : åpne(s)))); });
  KROKER.lagTekst.push(s => { if (s.karakter) return null; const r = regel(s); if (s.side !== 'blå') return 'bevæpning: ' + S.BEVÆPNING[r.bev].navn.toLowerCase();
    const h = S.holdningFor(r), v = vurdering(s); return `${h ? S.HOLDNING[h].navn.toLowerCase() : 'egne regler'}, ${S.BEVÆPNING[r.bev].navn.toLowerCase()}` + (v ? ` · ${S.forholdTekst(v.forhold)} mot ${v.fi.navn}` : ''); });
  Object.assign(api, { regel, sett, velgBev, vurdering, faktor, kontakt, åpne, lukk, mal: () => mal, SETT, beskutt });
  Object.assign(api, { initiativ, høyereNær, forsyningssted });
  window.StridSpill = api;
})();
