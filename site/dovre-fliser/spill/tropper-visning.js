'use strict';
/* Riksbrudd – TROPPER DU LAGER SELV, i spillet (17. nov, brukeren – reglene i spill/tropper.js).
 * «Tropper» i Leir-menyen (fanen Bygg): «Lag ny tropp» åpner et panel der du krysser av folk fra leiren (2–12), gir troppen navn,
 * velger bevæpning og eventuelt et kjøretøy som står i leiren. Folkene går ut av leirens folk og blir et lag (s.fraFolk) du gir
 * ordre som de andre. «Oppløs» ved leiren sender dem som lever, hjem igjen. KJØRETØY: en tropp kan gå om bord i en ledig speiderbil
 * (4) eller lastebil (12) innen 60 m – da følger den kjøretøyet til du trykker «Gå av». Lagene du starter med, kan også oppløses
 * og settes sammen på nytt. window.TropperSpill.
 */
(function () {
  const TR = window.Tropper; if (!TR) return; const R = TR.R;
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const kn = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = fn; return b; };
  const leir = () => { const S = window.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  const folk = () => (window.FolkSpill ? FolkSpill.tilstand() : null);
  const egne = () => ENHETER.filter(e => e.side === 'blå' && !e.karakter && !e.leirvakt && !e.ai);
  const vedLeir = o => { const L = leir(); return !!L && Math.hypot(o.x - L.x, o.y - L.y) <= R.nær; };
  const bærer = k => ENHETER.find(e => e.ombord === k);
  const biler = () => (window.KJORETOY || []).filter(k => k.side === 'blå' && TR.plass(k) > 0 && !k.sti && !k.oppdrag);
  const lagre = () => { if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (window.LagringSpill && LagringSpill.lagre) LagringSpill.lagre(); };
  let valgte = new Set(), navn = '', bev = 'standard', bil = '', sist = '';

  function opprett(ider, navnet, bevId, kjøretøy) { const F = folk(), L = leir(); if (!F || !L) return { feil: 'Ingen leir.' }; const P = F.personer.filter(p => ider.includes(p.id)), r = TR.opprett(P, navnet); if (r.feil) return r;
    const k = kjøretøy || null; if (k && TR.plass(k) < r.menn.length) return { feil: `Det er bare plass til ${TR.plass(k)} i ${k.navn}.` };
    const B = window.Strid && Strid.BEVÆPNING[bevId]; if (B && B.pris > 0 && !(window.OppstartSpill && OppstartSpill.betal(B.pris))) return { feil: `Ikke råd til bevæpningen «${B.navn}» (${B.pris.toLocaleString('nb-NO')} kr).` };
    F.personer = F.personer.filter(p => !ider.includes(p.id)); const v = Math.random() * 6.283, s = nyttLag(r.navn, k ? k.x : L.x + Math.cos(v) * 25, k ? k.y : L.y + Math.sin(v) * 25, 'blå'); s.menn = r.menn; s.leder = 0; s.fraFolk = true;
    if (window.StridSpill) { const st = StridSpill.regel(s); if (B && bevId !== 'standard') { s.strid = { ...st, bev: bevId }; StridSpill.regel(s); } } if (k) s.ombord = k; ENHETER.push(s); lagre(); skitten = true;
    logg(`${r.navn} er satt opp: ${r.menn.length} fra leiren, ${r.menn[0].navn} leder` + (k ? `, om bord i ${k.navn}` : '') + '.'); return { lag: s }; }
  function oppløs(s) { const F = folk(); if (!F) return { feil: 'Leiren har ingen folk-liste.' }; if (!vedLeir(s)) return { feil: `${s.navn} må stå innen ${R.nær} m fra leiren for å oppløses.` };
    const hjem = TR.oppløs(s, window.FolkRegler ? FolkRegler.OPPGAVER : []); for (const p of hjem) { p.id = F.neste++; F.personer.push(p); } const i = ENHETER.indexOf(s); if (i >= 0) ENHETER.splice(i, 1); if (valgt === s) { valgt = null; if (window.lukkPanel) lukkPanel(); }
    lagre(); skitten = true; logg(`${s.navn} er oppløst: ${hjem.length} er tilbake i leiren (de står som «fri» i Folk).`); return { hjem: hjem.length }; }

  // ---------- om bord ----------
  function gåOmBord(s, k) { const f = TR.ombordFeil(s, k, Math.hypot(s.x - k.x, s.y - k.y), !!bærer(k)); if (f) { logg(`${s.navn}: ${f}`); return false; } s.ombord = k; s.sti = null; logg(`${s.navn} er om bord i ${k.navn}. Gi kjøretøyet ordre – troppen følger med.`); if (valgt === s) visPanel(); return true; }
  function gåAv(s) { if (!s.ombord) return; const k = s.ombord; s.ombord = null; delete s.ombordNavn; s.x = k.x + 6; s.y = k.y + 4; s.siktSkitten = true; logg(`${s.navn} har gått av ${k.navn}.`); if (valgt === s) visPanel(); skitten = true; }
  KROKER.sim.push(() => { for (const s of ENHETER) { if (s.ombordNavn && !s.ombord) { const k = (window.KJORETOY || []).find(q => q.navn === s.ombordNavn && q.side === 'blå'); if (k) s.ombord = k; delete s.ombordNavn; }
      if (!s.ombord) continue; const k = s.ombord; if (!(window.KJORETOY || []).includes(k) || !levende(s)) { s.ombord = null; continue; } if (Math.hypot(s.x - k.x, s.y - k.y) > 2) { s.x = k.x; s.y = k.y; skitten = true; } s.sti = null; s.retning = k.retning || s.retning; } });
  KROKER.kanOrdre.push(s => { if (!s.ombord) return true; logg(`${s.navn} sitter i ${s.ombord.navn}: gi kjøretøyet ordre, eller la troppen gå av først.`); return false; });
  KROKER.lagTekst.push(s => (s.ombord ? `om bord i ${s.ombord.navn}` : s.fraFolk ? 'egen tropp' : null));
  KROKER.lagKnapper.push((s, H) => { if (s.side !== 'blå' || s.karakter) return; if (s.ombord) { H.appendChild(knapp('Gå av', false, () => gåAv(s))); return; }
    let best = null, bd = R.bord; for (const k of biler()) { if (bærer(k)) continue; const d = Math.hypot(s.x - k.x, s.y - k.y); if (d <= bd && TR.friske(s) <= TR.plass(k)) { bd = d; best = k; } } if (best) H.appendChild(knapp(`Gå om bord i ${best.navn}`, false, () => gåOmBord(s, best))); });
  (window.KJ_TEKST = window.KJ_TEKST || []).push(k => { const s = bærer(k); return s ? `frakter ${s.navn}` : null; });

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#tropppanel{ position:fixed; right:10px; top:calc(var(--topp,58px) + 56px); z-index:30; display:none; width:min(400px,94vw); max-height:calc(100vh - var(--topp,58px) - 120px); overflow:auto; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#tropppanel.på{ display:block; } #tropppanel h2{ margin:0 28px 2px 0; font-size:19px; } #tropppanel h3{ margin:12px 0 4px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); } #tropppanel small{ color:var(--ink-dim,#a99); }
#tropppanel .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
#tropppanel input, #tropppanel select, #tropppanel button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:36px; padding:2px 10px; font:inherit; font-size:14px; } #tropppanel input, #tropppanel select{ width:100%; box-sizing:border-box; } #tropppanel button{ cursor:pointer; } #tropppanel button.hoved{ border-color:#c9b26a; } #tropppanel button:disabled{ opacity:.5; }
#tropppanel label{ display:grid; grid-template-columns:96px 1fr; gap:8px; align-items:center; margin:5px 0; }
#tropppanel .p{ display:grid; grid-template-columns:26px 1fr auto; gap:6px; align-items:center; padding:5px 4px; border-bottom:1px solid #2e281e; cursor:pointer; } #tropppanel .p.på{ background:#2f2819; } #tropppanel .p .h{ width:20px; height:20px; border:1px solid #c9b26a; text-align:center; line-height:18px; } #tropppanel .p small{ display:block; }
body.smal #tropppanel, body.kort #tropppanel{ left:0; right:0; top:auto; bottom:0; width:auto; max-height:70vh; border-width:1px 0 0; }
#leirmeny .tropper .t{ display:flex; justify-content:space-between; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid #2e281e; font-size:14px; } #leirmeny .tropper .t small{ display:block; color:var(--ink-dim,#a99); }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'tropppanel', role: 'dialog', 'aria-label': 'Lag ny tropp' }); document.body.appendChild(panel);
  const lukk = () => panel.classList.remove('på');
  function bygg() { const F = folk(), L = leir(), f = document.createDocumentFragment(); f.append(kn('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk' }), el('h2', {}, 'Lag ny tropp'), el('small', {}, `Velg ${R.min}–${R.maks} fra leiren. De slutter å arbeide i leiren og blir soldater.`));
    const inp = el('input', { type: 'text', maxlength: '30', value: navn, id: 'troppnavn', 'aria-label': 'Navn på troppen' }); inp.oninput = () => { navn = inp.value; }; f.append(el('label', {}, el('span', {}, 'Navn'), inp));
    if (window.Strid) { const sel = el('select', { id: 'troppbev' }); for (const id of Strid.VALGBARE) { const B = Strid.BEVÆPNING[id], o = el('option', { value: id }, `${B.navn} – ${B.kort}${B.pris ? ' (' + B.pris.toLocaleString('nb-NO') + ' kr)' : ''}`); if (id === bev) o.selected = true; sel.append(o); } sel.onchange = () => { bev = sel.value; }; f.append(el('label', {}, el('span', {}, 'Bevæpning'), sel)); }
    const ledige = biler().filter(k => !bærer(k) && L && Math.hypot(k.x - L.x, k.y - L.y) <= R.nær), sb = el('select', { id: 'troppbil' }); sb.append(el('option', { value: '' }, 'Til fots')); for (const k of ledige) { const o = el('option', { value: k.navn }, `${k.navn} (plass til ${TR.plass(k)})`); if (k.navn === bil) o.selected = true; sb.append(o); } sb.onchange = () => { bil = sb.value; vis(true); }; f.append(el('label', {}, el('span', {}, 'Kjøretøy'), sb));
    const P = F ? F.personer.filter(p => !window.FolkRegler || FolkRegler.arbeidsfør(p)) : []; valgte = new Set([...valgte].filter(id => P.some(p => p.id === id)));
    const k = ledige.find(q => q.navn === bil), tak = k ? Math.min(R.maks, TR.plass(k)) : R.maks; f.append(el('h3', {}, `Folk (${valgte.size} valgt${k ? ', høyst ' + tak + ' i ' + k.navn : ''})`));
    if (!P.length) f.append(el('small', {}, 'Ingen arbeidsføre i leiren. Rekrutter flere i Folk.'));
    for (const p of P.slice().sort((a, b) => ((b.ferd && b.ferd.vakt) || 0) - ((a.ferd && a.ferd.vakt) || 0))) { const på = valgte.has(p.id), rad = el('div', { klasse: 'p' + (på ? ' på' : ''), 'data-person': String(p.id), role: 'checkbox', 'aria-checked': String(på), tabindex: '0' }, el('span', { klasse: 'h' }, på ? '✓' : ''), el('span', {}, el('b', {}, p.navn), el('small', {}, `${p.alder} år · ${p.yrke} · nå: ${p.oppgave}`)), el('small', {}, `strid ${Math.round(((p.ferd && p.ferd.vakt) || .9) * 100)} %`));
      rad.onclick = () => { if (valgte.has(p.id)) valgte.delete(p.id); else if (valgte.size < tak) valgte.add(p.id); else logg(`Høyst ${tak} i denne troppen.`); vis(true); }; f.append(rad); }
    const ok = valgte.size >= R.min && valgte.size <= tak; f.append(el('div', { style: 'margin-top:10px' }, kn(ok ? `Opprett troppen (${valgte.size})` : `Velg minst ${R.min}`, () => { const r = opprett([...valgte], navn || 'Tropp', bev, k); if (r.feil) { logg(r.feil); return; } valgte = new Set(); navn = ''; bil = ''; lukk(); valgt = r.lag; visPanel(); if (window.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); }, Object.assign({ klasse: 'hoved', id: 'troppopprett' }, ok ? {} : { disabled: '' }))));
    return f; }
  function vis(tving) { if (!panel.classList.contains('på')) return; if (!tving && window.pekerNede && pekerNede(panel)) return; const a = document.activeElement; if (!tving && a && panel.contains(a) && /INPUT|SELECT/.test(a.tagName)) return; const ny = el('div'); ny.append(bygg()); if (!tving && ny.innerHTML === sist) return; sist = ny.innerHTML; const topp = panel.scrollTop; panel.replaceChildren(...ny.childNodes); panel.scrollTop = topp; }
  function åpne() { if (!navn) navn = `${egne().filter(e => e.fraFolk).length + 1}. tropp`; panel.classList.add('på'); sist = ''; vis(true); }
  setInterval(() => vis(false), 2000); window.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('på')) lukk(); });
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp: k2 }) => { if (!folk() || !leir()) return; hode.append(e('h3', { 'data-fane': 'bygg' }, 'Tropper'));
    const boks = e('div', { klasse: 'tropper' }, e('small', { style: 'display:block;color:var(--ink-dim,#a99);margin-bottom:4px' }, 'Sett sammen egne tropper av folk fra leiren, med bevæpning og kjøretøy. Oppløs en tropp ved leiren for å få folkene hjem.'), k2('Lag ny tropp', åpne, { id: 'nytropp' }));
    for (const s of egne()) { const n = TR.friske(s), nær = vedLeir(s); boks.append(e('div', { klasse: 't' }, e('div', {}, e('b', {}, s.navn), e('small', {}, `${n} mann` + (s.fraFolk ? ' · egen tropp' : '') + (s.ombord ? ` · om bord i ${s.ombord.navn}` : '') + (nær ? '' : ' · ute'))), k2('Oppløs', () => { if (!confirm(`Oppløse ${s.navn}? De ${n} som lever, går tilbake til leiren.`)) return; const r = oppløs(s); if (r.feil) logg(r.feil); if (LeirSpill.visMeny) LeirSpill.visMeny(); }, nær ? { 'data-opplos': s.navn } : { disabled: '', title: `Må stå innen ${R.nær} m fra leiren` }))); }
    hode.append(boks); });
  window.TropperSpill = { opprett, oppløs, gåOmBord, gåAv, åpne, lukk, bærer };
})();
