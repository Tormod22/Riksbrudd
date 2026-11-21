'use strict';
// ANLEGGSARBEID i spillet (runde 15, 21. nov kveld; regler: spill/anleggsarbeid.js). «Anlegg» i Leir-menyen (fanen Bygg): skyttergrav
// (trykk punkter), bunker (ett punkt, roter), kai (i strandkanten) og tunnel (to portaler i fjellsiden). Prisen og materialene betales
// når du bekrefter (det som mangler på lageret kjøpes); folk på «bygg» og ingeniørlag innen 400 m gjør arbeidet.
// FELLES MOTOR FOR TERRENGINNGREP: hoydeVed (2D-reglene) pakkes inn og trekker fra Anlegg.endringVed; i 3D senker bygg3d-kroken
// høydegitteret u.H med Veg.skjærG (samme motor som vegene i liv3d.js – bakken senkes bare, til kravene fra Anlegg.terrengKrav er
// oppfylt også i terrengnettet slik det tegnes), og planter som står der, ryddes. Et anlegg som blir ferdig, bygger 3D-utsnittet på nytt.
// VERN: KROKER.ild ganger med vernet for lag i graven/bunkeren (Anlegg.fordel: plass etter kapasiteten). KAI: egne kaier legges til
// Kaier-dataene (KaierSpill.data og Kaier.nær/iBoks pakkes inn) – båtene i sjo.js legger til der som ved en havn. TUNNEL: ordre() pakkes
// inn – gir det kortere marsj, går laget til portalen, reiser gjennom (Anlegg.reiseMin) og går videre; kjøretøy får «Kjør gjennom tunnelen».
// Lagres per leir i «riksbrudd-anlegg». window.AnleggSpill for vakta og andre moduler.
(function () {
  const A = Anlegg, RG = A.REGLER, NØKKEL = 'riksbrudd-anlegg', r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  let liste = [], leirId = '', klar = false, plass = null, valgt = null, akk = 0, lagreAkk = 0, INNGREP = [], VERN = new Map(), kaiVer = 0, panelHtml = '';
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const finn = id => liste.find(a => a.id === id) || null;
  const nf1 = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const kr = v => (v >= 1e6 ? nf1(v / 1e6) + ' mill. kr' : Math.round(v / 1000) + ' 000 kr');
  const tidTekst = t => (!isFinite(t) ? 'venter på arbeidere' : t < 1 ? Math.max(1, Math.round(t * 60)) + ' min' : t < 48 ? nf1(t) + ' t' : nf1(t / 24) + ' døgn');
  const navnPå = a => { const A0 = A.ANLEGG[a.type]; if (a.type === 'kai') return A0.nivåer[a.nivå - 1].navn; const n = liste.filter(b => b.type === a.type).indexOf(a) + 1; return A0.navn + (n > 1 ? ' ' + n : ''); };

  // ---------- lagring (per leir) ----------
  function lagre() { if (!klar) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, liste: A.tilJSON(liste) })); } catch (e) { /* fullt eller sperret */ } }
  function start() {
    const S = spill(); if (!S || !S.leir) return; leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y);
    let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    liste = d && d.leir === leirId ? A.fraJSON(d.liste) : []; klar = true; plass = null; valgt = null; oppdaterInngrep(); kaiVer++; skitten = true;
  }
  window.addEventListener('riksbrudd-spill', start);

  // ---------- terrenginngrep i 2D-reglene ----------
  function oppdaterInngrep() { lokFor = null; const ut = []; for (const a of liste) for (const o of A.inngrep(a)) ut.push(o); INNGREP = ut; }
  const hvOrig = typeof hoydeVed === 'function' ? hoydeVed : null;
  if (hvOrig) window.hoydeVed = function (X, Y) { const h = hvOrig(X, Y); if (h === null || h === undefined || !INNGREP.length) return h; return h + A.endringVed(INNGREP, X, Y); };
  const urørt = (x, y) => (hvOrig ? hvOrig(x, y) : null);

  // ---------- terrenget for plasseringen (vann fra 32 m-rutene, høyden fra 8 m-rutene) ----------
  async function terrengFor(P, ekstra) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), b = [Math.min(...xs) - ekstra, Math.min(...ys) - ekstra, Math.max(...xs) + ekstra, Math.max(...ys) + ekstra];
    let kv = null, hv = null; try { [kv, hv] = await Promise.all([lagVindu(b, false), lagVindu(b, false, 11)]); } catch (e) { kv = kv || null; }
    const høyde = (x, y) => { if (!hv) return urørt(x, y); const fx = (x - hv.x0) / hv.r - .5, fy = (hv.y0 - y) / hv.r - .5, i = Math.floor(fx), j = Math.floor(fy), a = fx - i, c = fy - j;
      if (i < 0 || j < 0 || i + 1 >= hv.w || j + 1 >= hv.h) return urørt(x, y); const H = (ii, jj) => hv.H[jj * hv.w + ii];
      const z = H(i, j) * (1 - a) * (1 - c) + H(i + 1, j) * a * (1 - c) + H(i, j + 1) * (1 - a) * c + H(i + 1, j + 1) * a * c; return z === z ? z : null; };
    const vann = (x, y) => { if (kv) { const [i, j] = Terreng.rute(kv, x, y); if (i >= 0 && j >= 0 && i < kv.w && j < kv.h && kv.K[j * kv.w + i] === 3) return true; }
      return typeof NORGE_BLOKKER !== 'undefined' && NORGE_BLOKKER ? (høyde(x, y) ?? 1) < .4 : false; };
    return { høyde, vann };
  }

  // ---------- plassering ----------
  const panelEl = (id) => { let e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; e.className = 'anleggboks'; document.body.appendChild(e); } return e; };
  (function stil() { const s = document.createElement('style');
    s.textContent = '.anleggboks{position:fixed;left:12px;bottom:96px;z-index:40;max-width:min(360px,calc(100vw - 32px));background:rgba(15,11,7,.93);color:#e8dcc4;border:1px solid #6b5a3c;border-radius:8px;padding:10px 12px;font:15px "Cormorant Garamond",serif;box-shadow:0 4px 18px rgba(0,0,0,.45)}'
      + '.anleggboks[hidden]{display:none}.anleggboks h3{margin:0 0 4px;font-size:17px}.anleggboks .rad{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.anleggboks .feil{color:#f0a08a}.anleggboks .ok{color:#a8d8a0}.anleggboks small{opacity:.85}'
      + '.anleggboks .maaler{height:6px;background:#3a3024;border-radius:3px;margin:6px 0}.anleggboks .maaler>i{display:block;height:100%;background:#c9a45c;border-radius:3px}';
    document.head.appendChild(s); })();
  function startPlass(type, nivå = 1) {
    if (!klar) { logg('Start spillet først.'); return; }
    if (window.lukkPanel) try { lukkPanel(); } catch (e) { /* uten panel */ }
    // Leir-menyen lukkes (som når et bygg plasseres), så kartet er fritt
    { const k = document.getElementById('leirknapp'); if (k && k.classList.contains('på')) k.click(); }
    plass = { type, nivå, P: [], ret: 0, retSatt: false, sjekk: null, nr: 0, sikksakk: type === 'skyttergrav' }; valgt = null; visValg(); visAnleggPanel(); skitten = true;
  }
  function avbryt() { plass = null; visValg(); skitten = true; }
  // punktene slik graven bygges: med traverser (sikksakk) når det er valgt
  const eff = p => (p.sikksakk && p.P.length > 1 ? A.sikksakk(p.P) : p.P);
  async function prøv() {
    const p = plass; if (!p) return; const T0 = A.ANLEGG[p.type], nr = ++p.nr; p.sjekk = { venter: true }; visValg();
    if (!p.P.length) { p.sjekk = null; visValg(); return; }
    // bunkeren vender skyteskåret bort fra leiren (til du roterer selv)
    const S = spill(); if (T0.form === 'punkt' && p.type !== 'kai' && !p.retSatt && S && S.leir) p.ret = Math.atan2(p.P[0][1] - S.leir.y, p.P[0][0] - S.leir.x);
    const T = await terrengFor(p.P, 70); if (plass !== p || nr !== p.nr) return;
    const r = A.kanPlassere(p.type, eff(p), T, p.ret); if (r.ret !== undefined && p.type === 'kai') p.ret = r.ret;
    // to like anlegg oppå hverandre avvises
    if (r.ok) { const [mx, my] = A.midt({ type: p.type, P: p.P }); if (liste.some(a => a.type === p.type && Math.hypot(A.midt(a)[0] - mx, A.midt(a)[1] - my) < 4)) { r.ok = false; r.feil = 'Det står et anlegg her fra før.'; } }
    p.sjekk = r; visValg(); skitten = true;
  }
  function trykkPlass(X, Y) {
    const p = plass; if (!p) return false; const f = A.ANLEGG[p.type].form;
    if (f === 'linje') { if (p.P.length >= RG.linje.punkter) { logg(`Høyst ${RG.linje.punkter} punkter i én grav – bygg den og start en ny.`); return true; } p.P.push([X, Y]); }
    else if (f === 'punkt') p.P = [[X, Y]];
    else { if (p.P.length >= 2) p.P = [p.P[0], [X, Y]]; else p.P.push([X, Y]); }
    prøv(); skitten = true; return true;
  }
  function kostnadMedMat(type, P, nivå, fra) {
    const k = A.kostnad(type, P, nivå, fra), L = window.LeirSpill && LeirSpill.tilstand(), M = window.Leir ? Leir.MATERIALER : {};
    const mangler = L && window.Leir ? Leir.manglerMat(L, k.mat) : k.mat; let kjøp = 0; for (const [m, v] of Object.entries(mangler)) kjøp += v * ((M[m] && M[m].pris) || 0);
    return { ...k, mangler, kjøp: Math.round(kjøp), total: k.kr + Math.round(kjøp) };
  }
  function matTekst(mat) { const M = window.Leir ? Leir.MATERIALER : {}; return Object.entries(mat).map(([k, v]) => `${nf1(v)} ${M[k] ? M[k].enhet + ' ' + M[k].navn.toLowerCase() : k}`).join(', '); }
  function betalFor(k) {
    if (!window.OppstartSpill || !OppstartSpill.betal(k.total)) return false;
    const L = window.LeirSpill && LeirSpill.tilstand(); if (L && L.lager) { for (const [m, v] of Object.entries(k.mat)) L.lager[m] = Math.max(0, (L.lager[m] || 0) - Math.min(v, L.lager[m] || 0)); try { LeirSpill.lagre(); } catch (e) { /* uten leir */ } }
    return true;
  }
  function bekreft() {
    const p = plass; if (!p || !p.sjekk || !p.sjekk.ok) return false;
    const k = kostnadMedMat(p.type, eff(p), p.nivå);
    if (!betalFor(k)) { logg(`Ikke nok penger: ${navnFor(p)} koster ${kr(k.total)}.`); return false; }
    const a = A.nytt(p.type, eff(p), { ret: p.ret, nivå: p.nivå, tid: typeof tid !== 'undefined' ? tid : 0 }); liste.push(a);
    logg(`${navnPå(a)} er satt i gang (${kr(k.total)}${k.kjøp ? `, av det ${kr(k.kjøp)} for materialer som manglet` : ''}). ${arbeidTekst(a)}`);
    plass = null; valgt = a.id; lagre(); oppdaterInngrep(); visValg(); visAnleggPanel(); nyeModeller(); skitten = true; return a;
  }
  const navnFor = p => (p.type === 'kai' ? A.ANLEGG.kai.nivåer[p.nivå - 1].navn : A.ANLEGG[p.type].navn).toLowerCase();
  function visValg() {
    const e = panelEl('anleggvalg'), p = plass; if (!p) { e.hidden = true; e.innerHTML = ''; return; } e.hidden = false; const T0 = A.ANLEGG[p.type];
    const hjelp = { linje: 'Trykk i kartet der graven skal gå – punkt for punkt.', punkt: p.type === 'kai' ? 'Trykk på land helt i strandkanten. Kaia legger seg mot sjøen.' : 'Trykk der bunkeren skal stå. Skyteskåret vender bort fra leiren (Roter for å snu).', topunkt: 'Trykk to steder ved foten av et fjell: én portal på hver side.' }[T0.form];
    let info = ''; if (p.P.length && (T0.form !== 'linje' || p.P.length > 1) && (T0.form !== 'topunkt' || p.P.length > 1)) { const k = kostnadMedMat(p.type, eff(p), p.nivå);
      info = `${k.lengde ? k.lengde + ' m · ' : ''}${kr(k.total)} · ${k.timer} persontimer (${tidTekst(k.timer / Math.max(1, kraftNå()))} med ${Math.round(kraftNå()) || 'ingen'} arbeidere)${Object.keys(k.mat).length ? ' · ' + matTekst(k.mat) : ''}`; }
    const s = p.sjekk, st = !s ? '' : s.venter ? '<small>Sjekker kartet …</small>' : s.ok ? '<span class="ok">Kan bygges her.</span>' : `<span class="feil">${s.feil}</span>`;
    e.innerHTML = `<h3>${T0.navn}${p.type === 'kai' ? ' – ' + T0.nivåer[p.nivå - 1].navn.toLowerCase() : ''}</h3><small>${hjelp}</small><div>${info}</div><div>${st}</div><div class="rad"></div>`;
    const rad = e.querySelector('.rad'), kn = (t, fn, id) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; if (id) b.id = id; rad.appendChild(b); return b; };
    const b = kn('Bygg', () => bekreft(), 'anleggbygg'); b.disabled = !(s && s.ok);
    if (T0.form === 'linje') kn(`Sikksakk: ${p.sikksakk ? 'på' : 'av'}`, () => { p.sikksakk = !p.sikksakk; prøv(); skitten = true; }, 'anleggsikksakk');
    if (T0.form === 'linje' && p.P.length) kn('Angre punkt', () => { p.P.pop(); prøv(); skitten = true; });
    if (p.type === 'bunker' && p.P.length) kn('Roter', () => { p.ret += Math.PI / 4; p.retSatt = true; prøv(); skitten = true; });
    kn('Avbryt', avbryt, 'anleggavbryt');
  }

  // ---------- arbeidet ----------
  function folkPåBygg() { try { const F = window.FolkSpill && FolkSpill.tilstand(); return F && window.FolkRegler ? FolkRegler.arbeidere(F, 'bygg') : 0; } catch (e) { return 0; } }
  const ingeniørlag = () => ENHETER.filter(s => s.ingeniør && s.side === 'blå' && levende(s) && !s.sti).map(s => ({ x: s.x, y: s.y, menn: s.menn.filter(m => m.hp >= 1).length }));
  // folkene på «bygg» arbeider på det første uferdige anlegget i køen; ingeniørlagene der de står
  const førsteUferdig = () => liste.find(a => !a.ferdig) || null;
  function kraftFor(a) { return A.arbeidskraft(a, a === førsteUferdig() ? folkPåBygg() : 0, ingeniørlag()); }
  const kraftNå = () => folkPåBygg() + 0;
  const arbeidTekst = a => { const k = kraftFor(a); return k > 0 ? `${Math.round(k)} arbeidere – ferdig om ca. ${tidTekst(A.igjen(a, k))}.` : 'Ingen arbeider på det ennå: sett folk på «bygg» i Folk, eller send et ingeniørlag dit.'; };

  KROKER.sim.push(dt => {
    if (!klar) return; akk += dt; if (akk < 1) return; const min = akk; akk = 0; let endret = false;
    for (const a of liste) { if (a.ferdig) continue; const før = A.andel(a), r = A.steg(a, min / 60, kraftFor(a));
      if (r === 'ferdig') { endret = true; ferdig(a); } else if (r && Math.floor(før * 20) !== Math.floor(A.andel(a) * 20)) endret = true; }
    if (endret) { oppdaterInngrep(); skitten = true; }
    lagreAkk += min; if (lagreAkk >= 30 || endret) { lagreAkk = 0; lagre(); }
    // vernet: hvem står i hvilket anlegg (plass etter kapasiteten)
    VERN = A.fordel(liste, ENHETER.filter(s => levende(s) && !s.sti && s.side === 'blå'));
    tunnelSteg(min);
    if (valgt) visAnleggPanel();
  });
  function ferdig(a) {
    logg(`${navnPå(a)} er ferdig.${a.type === 'skyttergrav' ? ` Lag i graven får langt færre treff (plass til ${A.plasser(a)} lag).` : a.type === 'bunker' ? ' Ett lag i bunkeren får svært få treff.' : a.type === 'kai' ? ' Båtene dine kan legge til her.' : ' Lag og kjøretøy kan reise gjennom tunnelen.'}`);
    if (a.type === 'kai') kaiVer++;
    lagre(); oppdaterInngrep(); panelHtml = ''; visAnleggPanel(); byggPåNytt(a);
  }
  function iUtsnitt(a) { const R = r3(); if (!R || !R.ut) return false; const u = R.ut; return a.P.some(p => Math.abs(p[0] - u.cx) < u.S && Math.abs(p[1] - u.cy) < u.S); }
  // AnleggSpill.utenOmbygging = true (vakta): 3D-utsnittet bygges ikke på nytt, bare modellene
  function byggPåNytt(a) { const R = r3(); if (window.AnleggSpill && AnleggSpill.utenOmbygging) { nyeModeller(); return; } if (typeof på3d !== 'undefined' && på3d && R && R.ut && !R.bygger && (!a || iUtsnitt(a))) nytt3dUtsnitt(R.ut.cx + R.bane.x, R.ut.cy + R.bane.y, R.ut.S); }

  // ---------- vern ----------
  KROKER.ild.push((a, b) => { const an = VERN.get(b); if (!an) return 1; const v = A.vern(an);
    // er laget også nedgravd (feltarbeid.js), gjelder det beste vernet – ikke begge ganget sammen
    return b.nedgravd && window.Feltarbeid ? Math.min(1, v / Feltarbeid.REGLER.vern) : v; });
  KROKER.lagTekst.push(s => { const an = VERN.get(s); if (an) return `i ${navnPå(an).toLowerCase()} (treff ×${nf1(A.vern(an))})`; if (s.iTunnel) return `i tunnelen (${Math.max(1, Math.round(s.iTunnel.igjen))} min igjen)`; if (s.anleggVia) return 'på vei til tunnelen'; return null; });

  // ---------- tunnelen som en lenke i ruta ----------
  const tunneler = () => liste.filter(a => a.type === 'tunnel' && a.ferdig);
  const PORTAL_NÆR = 80;
  function inn(s, a, fra, mål) { const p = a.P[fra]; s.x = p[0]; s.y = p[1]; s.sti = null; s.iTunnel = { id: a.id, ut: 1 - fra, igjen: A.reiseMin(a, !s.menn), mål: mål || null }; s.anleggVia = null; skitten = true;
    if (s.side === 'blå') logg(`${s.navn} går inn i ${navnPå(a).toLowerCase()} (${Math.max(1, Math.round(s.iTunnel.igjen))} min).`); }
  function tunnelSteg(min) {
    for (const s of [...ENHETER, ...KJORETOY]) {
      if (s.anleggVia) { const a = finn(s.anleggVia.id); if (!a || !a.ferdig) { s.anleggVia = null; continue; }
        const p = a.P[s.anleggVia.inn], d = Math.hypot(s.x - p[0], s.y - p[1]);
        if (!s.sti && !s.planlegger) { if (d <= PORTAL_NÆR) inn(s, a, s.anleggVia.inn, s.anleggVia.mål); else s.anleggVia = null; } }
      if (s.iTunnel) { s.sti = null; if ((s.iTunnel.igjen -= min) > 0) continue;
        const a = finn(s.iTunnel.id), T = s.iTunnel; s.iTunnel = null; if (!a) continue; const q = a.P[T.ut], o = a.P[1 - T.ut], l = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1;
        s.x = q[0] + (q[0] - o[0]) / l * 12; s.y = q[1] + (q[1] - o[1]) / l * 12; skitten = true;
        if (s.side === 'blå') logg(`${s.navn} er gjennom tunnelen.`);
        if (T.mål && s.menn && typeof window.ordre === 'function') window.ordre(s, T.mål[0], T.mål[1], true); }
    }
  }
  // høydene for marsjen (32 m-rutene, som marsjreglene), hentet for området mellom laget, målet og portalene
  async function høyderFor(P) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), b = [Math.min(...xs) - 100, Math.min(...ys) - 100, Math.max(...xs) + 100, Math.max(...ys) + 100];
    if (b[2] - b[0] > 40000 || b[3] - b[1] > 40000) return null; const v = await lagVindu(b, false);
    return (x, y) => { const [i, j] = Terreng.rute(v, x, y); if (i < 0 || j < 0 || i >= v.w || j >= v.h) return null; const h = v.H[j * v.w + i]; return h === h ? h : null; };
  }
  function pakkOrdre() {
    const før = window.ordre; if (typeof før !== 'function' || før.anlegg) return;
    const ny = function (s, X, Y, stille) {
      if (!(s && typeof s === 'object' && s.menn && s.side === 'blå' && klar)) return før.apply(this, arguments);
      if (s.iTunnel) { s.iTunnel.mål = [X, Y]; if (!stille) logg(`${s.navn} er i tunnelen og går videre når laget er ute.`); return Promise.resolve(); }
      s.anleggVia = null;
      // bare tunneler som kan tenkes å lønne seg (med tunnelen under dobbelt så langt som luftlinja)
      const l = Math.hypot(X - s.x, Y - s.y), T = tunneler().filter(a => [0, 1].some(i => Math.hypot(a.P[i][0] - s.x, a.P[i][1] - s.y) + A.lengde(a.P) + Math.hypot(X - a.P[1 - i][0], Y - a.P[1 - i][1]) < 2 * l));
      if (!T.length) return før.apply(this, arguments);
      const selv = this, args = arguments;
      return (async () => { let v = null;
        try { v = A.viaTunnel(T, s.x, s.y, X, Y, await høyderFor([[s.x, s.y], [X, Y], ...T.flatMap(a => a.P)])); } catch (e) { v = null; }
        if (!v) return før.apply(selv, args);
        const p = v.a.P[v.inn]; s.anleggVia = { id: v.a.id, inn: v.inn, mål: [X, Y] };
        if (!stille) logg(`${s.navn} tar ${navnPå(v.a).toLowerCase()} – kortere enn over fjellet.`);
        if (Math.hypot(s.x - p[0], s.y - p[1]) <= PORTAL_NÆR) { inn(s, v.a, v.inn, [X, Y]); return; }
        return før.call(selv, s, p[0], p[1], stille); })();
    };
    ny.anlegg = true; ny.flyt = før.flyt; ny.lagring = før.lagring; window.ordre = ny;
  }
  const nærPortal = s => { for (const a of tunneler()) for (const i of [0, 1]) if (Math.hypot(s.x - a.P[i][0], s.y - a.P[i][1]) <= PORTAL_NÆR) return { a, i }; return null; };
  KROKER.lagKnapper.push((s, H) => { if (s.sti || s.iTunnel || s.side !== 'blå') return; const n = nærPortal(s); if (!n) return;
    H.appendChild(knapp('Gjennom tunnelen', false, () => { inn(s, n.a, n.i, null); if (typeof visPanel === 'function') visPanel(); })); });
  if (window.KJ_PANEL) KJ_PANEL.push((k, H) => { if (k.sti || k.iTunnel || k.side !== 'blå') return; const n = nærPortal(k); if (!n) return;
    H.appendChild(knapp('Kjør gjennom tunnelen', false, () => { inn(k, n.a, n.i, null); })); });
  if (window.KJ_TEKST) KJ_TEKST.push(k => (k.iTunnel ? `i tunnelen (${Math.max(1, Math.round(k.iTunnel.igjen))} min igjen)` : null));

  // ---------- egne kaier i kaidataene (sjo.js legger til der) ----------
  let kombo = null, komboFor = undefined, komboVer = -1;
  function kaiPunkt(a) { const [L, B] = A.målFor(A.ANLEGG.kai, a.nivå), c = Math.cos(a.ret), s = Math.sin(a.ret); return [a.P[0][0] + c * (B - 2), a.P[0][1] + s * (B - 2)]; }
  function kombinert(K0) {
    if (komboFor === K0 && komboVer === kaiVer) return kombo; komboFor = K0; komboVer = kaiVer;
    const E = liste.filter(a => a.type === 'kai' && a.ferdig); if (!E.length) return (kombo = K0);
    const nb = K0 ? K0.n : 0, n = nb + E.length, navn = (K0 ? K0.navn : []).slice();
    const K = { n, x: new Int32Array(n), y: new Int32Array(n), t: new Uint8Array(n), l: new Int32Array(n), ni: new Int32Array(n), navn, _base: K0 || null, _nb: nb, _egne: E.map(a => a.id) };
    if (K0) { K.x.set(K0.x); K.y.set(K0.y); K.t.set(K0.t); K.l.set(K0.l); K.ni.set(K0.ni); }
    E.forEach((a, k) => { const i = nb + k, [x, y] = kaiPunkt(a); K.x[i] = Math.round(x); K.y[i] = Math.round(y); K.t[i] = 1; K.l[i] = A.ANLEGG.kai.nivåer[a.nivå - 1].kaiLengde; navn.push('Egen kai' + (E.length > 1 ? ' ' + (k + 1) : '')); K.ni[i] = navn.length; });
    return (kombo = K);
  }
  function pakkKaier() {
    if (!window.Kaier || Kaier.anlegg) return; const nær0 = Kaier.nær, iBoks0 = Kaier.iBoks;
    Kaier.nær = (K, x, y, r, filter) => { if (!K || K._nb === undefined) return K ? nær0(K, x, y, r, filter) : null; let best = K._base ? nær0(K._base, x, y, r, filter) : null;
      for (let i = K._nb; i < K.n; i++) { if (filter && !filter(i)) continue; const d = Math.hypot(K.x[i] - x, K.y[i] - y); if (d <= r && (!best || d < best.d)) best = { i, d }; } return best; };
    Kaier.iBoks = (K, x0, x1, y0, y1) => { if (!K || K._nb === undefined) return K ? iBoks0(K, x0, x1, y0, y1) : []; const ut = K._base ? iBoks0(K._base, x0, x1, y0, y1) : [];
      for (let i = K._nb; i < K.n; i++) if (K.x[i] >= x0 && K.x[i] <= x1 && K.y[i] >= y0 && K.y[i] <= y1) ut.push(i); return ut; };
    Kaier.anlegg = true;
    if (window.KaierSpill && !KaierSpill.data.anlegg) { const d0 = KaierSpill.data; KaierSpill.data = () => kombinert(d0()); KaierSpill.data.anlegg = true; }
  }
  // Planter (gress, blomster, bregner rundt kameraet i vegetasjon3d.js og fjellmark3d.js) skal ikke vokse i graven eller inne i bunkeren:
  // Interior3d.iLeirbygg (lokale meter i utsnittet) pakkes inn og svarer også ja der.
  let lokFor = null, lokL = [];
  function iAnleggLokalt(x, y) { const R = r3(), u = R && R.ut; if (!u || !liste.length) return false;
    if (lokFor !== u || lokL.n !== liste.length) { lokFor = u; lokL = liste.filter(a => (a.type === 'skyttergrav' || a.type === 'bunker') && A.andel(a) > 0 && iU(a, u)).map(a => lok(a, u)); lokL.n = liste.length; }
    for (const a of lokL) if (utenfor(a, x, y) < .4) return true; return false; }
  function pakkPlanter() { const I = window.Interior3d; if (!I || !I.iLeirbygg || I.iLeirbygg.anlegg) return; const f0 = I.iLeirbygg; I.iLeirbygg = (x, y) => f0(x, y) || iAnleggLokalt(x, y); I.iLeirbygg.anlegg = true; }
  const pakk = () => { pakkOrdre(); pakkKaier(); pakkPlanter(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pakk); else setTimeout(pakk, 0);

  // ---------- panelet for et valgt anlegg ----------
  function visAnleggPanel() {
    const e = panelEl('anleggpanel'), a = valgt && !plass ? finn(valgt) : null; if (!a) { e.hidden = true; e.innerHTML = ''; panelHtml = ''; return; }
    if (typeof pekerNede === 'function' && pekerNede(e)) return;
    const T0 = A.ANLEGG[a.type], k = kraftFor(a), f = A.andel(a), L = A.lengde(a.P), i = VERN.size ? [...VERN.values()].filter(x => x === a).length : 0;
    const linjer = [T0.tekst, a.ferdig ? 'Ferdig.' : `Bygges: ${Math.round(f * 100)} % · ${k > 0 ? Math.round(k) + ' arbeidere, ' + tidTekst(A.igjen(a, k)) + ' igjen' : 'ingen arbeidere (folk på «bygg» eller et ingeniørlag innen 400 m)'}`];
    if (a.type !== 'kai' && a.type !== 'tunnel') linjer.push(`Plass til ${A.plasser(a)} lag · ${i} der nå · treff ×${nf1(T0.vern)}`);
    if (a.type === 'tunnel') linjer.push(`${Math.round(L)} m · ${nf1(A.reiseMin(a, false))} min til fots, ${nf1(A.reiseMin(a, true))} min med kjøretøy`);
    if (a.type === 'kai') linjer.push(a.nivå >= 2 ? 'Middels kai: småbåt, sjark og lekter.' : 'Liten kai: småbåt og sjark.');
    const html = `<h3>${navnPå(a)}</h3>${linjer.map(t => `<div><small>${t}</small></div>`).join('')}${a.ferdig ? '' : `<div class="maaler"><i style="width:${Math.round(f * 100)}%"></i></div>`}<div class="rad"></div>`;
    if (html === panelHtml && e.querySelector('.rad').childElementCount) return; panelHtml = html; e.hidden = false; e.innerHTML = html;
    const rad = e.querySelector('.rad'), kn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; rad.appendChild(b); };
    if (a.type === 'kai' && a.ferdig && a.nivå < 2) { const ko = kostnadMedMat('kai', a.P, 2, 1); kn(`Oppgrader til middels kai (${kr(ko.total)})`, () => {
      if (!betalFor(ko)) { logg('Ikke nok penger.'); return; } a.nivå = 2; a.ferdig = false; a.behov += ko.timer; kaiVer++; lagre(); logg(`${navnPå(a)} bygges ut (${kr(ko.total)}). ${arbeidTekst(a)}`); nyeModeller(); visAnleggPanel(); }); }
    kn(a.ferdig ? 'Riv' : 'Stopp og riv', () => { if (!navigator.webdriver && !confirm(`Rive ${navnPå(a).toLowerCase()}? Du får ingenting tilbake.`)) return; fjern(a.id); logg(`${navnPå(a)} er revet.`); });
    kn('Lukk', () => { valgt = null; visAnleggPanel(); skitten = true; });
  }
  function fjern(id) { const i = liste.findIndex(a => a.id === id); if (i < 0) return false; const [a] = liste.splice(i, 1); if (valgt === id) valgt = null;
    for (const s of [...ENHETER, ...KJORETOY]) { if (s.anleggVia && s.anleggVia.id === id) s.anleggVia = null; }
    kaiVer++; lagre(); oppdaterInngrep(); visAnleggPanel(); if (A.ANLEGG[a.type].inngrep && A.andel(a) > 0) byggPåNytt(a); else nyeModeller(); skitten = true; return true; }
  function treff(X, Y) { const r = Math.max(6, 12 * kam.m);
    for (const a of liste) { const T0 = A.ANLEGG[a.type];
      if (T0.form === 'linje' && A.avstandLinje(a.P, X, Y).d <= r) return a;
      if (T0.form !== 'linje' && a.P.some(p => Math.hypot(p[0] - X, p[1] - Y) <= r + (T0.mål ? T0.mål[0] / 2 : 0))) return a; }
    return null; }
  function trykkVelg(X, Y) { if (plass || !klar) return false; const a = treff(X, Y); if (!a) { if (valgt) { valgt = null; visAnleggPanel(); skitten = true; } return false; } valgt = a.id; panelHtml = ''; visAnleggPanel(); skitten = true; return true; }
  const trykk = (X, Y) => (plass ? trykkPlass(X, Y) : false);
  KROKER.trykk.unshift(trykk); KROKER.trykk3d.unshift(trykk); KROKER.trykk.push(trykkVelg);
  document.addEventListener('keydown', e => { if (!plass) return; if (e.key === 'Escape') { avbryt(); e.preventDefault(); } else if (e.key === 'Enter' && plass.sjekk && plass.sjekk.ok) { bekreft(); e.preventDefault(); } });

  // ---------- Leir-menyen ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp: kn }) => { if (!klar) return;
    hode.appendChild(el('h3', { 'data-fane': 'bygg' }, 'Anlegg'));
    const n = liste.length, u = liste.filter(a => !a.ferdig).length;
    hode.appendChild(el('div', { klasse: 'igang' }, (n ? `${n} anlegg${u ? `, ${u} under bygging` : ''}. ` : '') + 'Skyttergraver, bunkere, egne kaier og tunneler. Folk på «bygg» og ingeniørlag gjør arbeidet.'));
    const rad = el('div', { klasse: 'mat' });
    for (const [id, t] of [['skyttergrav', 'Skyttergrav'], ['bunker', 'Bunker'], ['kai', 'Kai'], ['tunnel', 'Tunnel']]) rad.appendChild(kn(t, () => startPlass(id), { 'data-anlegg': id, title: A.ANLEGG[id].tekst }));
    hode.appendChild(rad);
    for (const a of liste.filter(b => !b.ferdig).slice(0, 4)) hode.appendChild(el('div', { klasse: 'igang' }, `${navnPå(a)}: ${Math.round(A.andel(a) * 100)} % – ${kraftFor(a) > 0 ? tidTekst(A.igjen(a, kraftFor(a))) + ' igjen' : 'venter på arbeidere'}`));
  });

  // ---------- 2D ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!klar) return; const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m], ut = (x, y, r) => x < -r || y < -r || x > VW + r || y > VH + r;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const tegnEtt = (a, forslag, ok) => { const T0 = A.ANLEGG[a.type], f = forslag ? 1 : A.andel(a), ferdig = forslag ? false : a.ferdig, P = a.P.map(p => S(p[0], p[1]));
      g.globalAlpha = forslag ? .85 : 1; const farge = forslag ? (ok ? '#8fd08a' : ok === false ? '#e07a62' : '#d8c890') : null;
      if (T0.form === 'linje') { if (P.length < 2) { for (const [x, y] of P) { g.fillStyle = farge; g.beginPath(); g.arc(x, y, 4, 0, 6.283); g.fill(); } return; }
        const b = Math.max(3, T0.inngrep.bredde / m), sti = () => { g.beginPath(); P.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); };
        // jordvoll/sandsekker på kanten, mørk grav i midten
        sti(); g.strokeStyle = farge || 'rgba(176,152,104,.95)'; g.lineWidth = b + Math.max(4, 3.2 / m); if (!ferdig) g.setLineDash([Math.max(6, 4 / m), Math.max(4, 3 / m)]); g.stroke(); g.setLineDash([]);
        sti(); g.strokeStyle = 'rgba(46,34,22,.95)'; g.lineWidth = b * (ferdig ? 1 : .35 + .65 * f); g.stroke();
        if (forslag) for (const [x, y] of P) { g.fillStyle = farge; g.beginPath(); g.arc(x, y, 4, 0, 6.283); g.fill(); } }
      else if (T0.form === 'punkt') { if (!P.length) return; const [Lm, Bm] = A.målFor(T0, a.nivå || 1), H = A.hjørner(a.P[0][0], a.P[0][1], a.ret || 0, Lm, Bm).map(p => S(p[0], p[1]));
        const sx = Lm / m < 6 ? 6 / (Lm / m) : 1; g.beginPath(); H.forEach(([x, y], i) => { const [cx, cy] = P[0]; g[i ? 'lineTo' : 'moveTo'](cx + (x - cx) * sx, cy + (y - cy) * sx); }); g.closePath();
        g.fillStyle = farge || (a.type === 'kai' ? 'rgba(170,168,160,.95)' : 'rgba(128,126,118,.95)'); g.fill(); g.strokeStyle = 'rgba(20,18,14,.9)'; g.lineWidth = 1.4; if (!ferdig && !forslag) g.setLineDash([5, 3]); g.stroke(); g.setLineDash([]);
        // forsiden: skyteskår (bunker) eller kaikanten mot sjøen (kai)
        const c = Math.cos(a.ret || 0), s = Math.sin(a.ret || 0), [fx, fy] = S(a.P[0][0] + c * Lm / 2, a.P[0][1] + s * Lm / 2);
        if (a.type === 'bunker') { g.strokeStyle = '#1a1612'; g.lineWidth = Math.max(2, .4 / m); g.beginPath(); g.moveTo(fx + s * 1.2 / m * sx, fy + c * 1.2 / m * sx); g.lineTo(fx - s * 1.2 / m * sx, fy - c * 1.2 / m * sx); g.stroke(); }
        if (a.type === 'kai') { const [ux, uy] = S(a.P[0][0] + c * Bm / 2, a.P[0][1] + s * Bm / 2); g.fillStyle = '#2a2622'; g.beginPath(); g.arc(ux, uy, 2.5, 0, 6.283); g.fill(); } }
      else { if (!P.length) return; g.strokeStyle = farge || 'rgba(200,190,170,.7)'; g.lineWidth = 2; g.setLineDash([6, 5]); if (P.length > 1) { g.beginPath(); g.moveTo(...P[0]); g.lineTo(...P[1]); g.stroke(); } g.setLineDash([]);
        P.forEach(([x, y], i) => { const o = P[1 - i] || P[i], v = Math.atan2(y - o[1], x - o[0]) + (P.length > 1 ? 0 : 0); g.fillStyle = farge || (ferdig ? '#3a342c' : 'rgba(90,80,64,.9)'); g.strokeStyle = '#d8ccb0'; g.lineWidth = 1.5;
          g.beginPath(); g.arc(x, y, 7, v - Math.PI / 2, v + Math.PI / 2); g.closePath(); g.fill(); g.stroke(); }); }
      g.globalAlpha = 1;
      if (!forslag && m < 8) { const [x, y] = S(...A.midt(a)); const t = navnPå(a) + (ferdig ? '' : ` (${Math.round(f * 100)} %)`), yt = window.Etikett ? Etikett.tekst(g, t, x, y - 12, -1) : y - 12;
        g.font = 'italic 12.5px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(15,11,7,.85)'; g.strokeText(t, x, yt); g.fillStyle = a.id === valgt ? '#f4e2a8' : '#e0d2b4'; g.fillText(t, x, yt); } };
    for (const a of liste) { const [x, y] = S(...A.midt(a)); if (ut(x, y, 2000 / m + 60)) continue; tegnEtt(a, false); }
    if (plass && plass.P.length) tegnEtt({ type: plass.type, P: eff(plass), ret: plass.ret, nivå: plass.nivå, id: '' }, true, plass.sjekk && !plass.sjekk.venter ? !!plass.sjekk.ok : undefined);
    g.restore();
  });

  // ---------- 3D: terrenget ----------
  function nettVekter(u) {
    const { M, gt } = nett3d(u), X = new Float64Array(M), bil = Veg.bilineær(u.N, u.steg, -u.S, u.S), k4 = new Int32Array(4), w4 = new Float64Array(4);
    for (let i = 0; i < M; i++) X[i] = u.S * gt(-1 + 2 * i / (M - 1));
    const finnI = v => { let a = 0, b = M - 1; while (b - a > 1) { const q = (a + b) >> 1; if (X[q] <= v) a = q; else b = q; } return a; };
    return (x, y, K, W) => {
      const i = finnI(Math.max(-u.S, Math.min(u.S, x))), j = finnI(Math.max(-u.S, Math.min(u.S, -y)));
      const fx = Math.max(0, Math.min(1, (x - X[i]) / (X[i + 1] - X[i]))), fy = Math.max(0, Math.min(1, (-y - X[j]) / (X[j + 1] - X[j])));
      const hj = fx + fy <= 1 ? [[i, j, 1 - fx - fy], [i + 1, j, fx], [i, j + 1, fy]] : [[i + 1, j + 1, fx + fy - 1], [i, j + 1, 1 - fx], [i + 1, j, 1 - fy]];
      let n = 0;
      for (const [a, b, beta] of hj) { if (beta <= 0) continue; bil(X[a], -X[b], k4, w4);
        for (let q = 0; q < 4; q++) { const v = beta * w4[q]; if (v <= 0) continue; let p = 0; while (p < n && K[p] !== k4[q]) p++; if (p === n) { K[n] = k4[q]; W[n++] = v; } else W[p] += v; } }
      return n; };
  }
  // lokale koordinater (meter fra utsnittets midte)
  const lok = (a, u) => ({ ...a, P: a.P.map(p => [p[0] - u.cx, p[1] - u.cy]) });
  const iU = (a, u) => a.P.some(p => Math.abs(p[0] - u.cx) < u.S - 10 && Math.abs(p[1] - u.cy) < u.S - 10);
  // område rundt et anlegg der planter ryddes og bakken males (lokalt): avstand utenfor kanten (negativ = inne)
  function utenfor(a, x, y) { const T0 = A.ANLEGG[a.type];
    if (T0.form === 'linje') return A.avstandLinje(a.P, x, y).d - T0.inngrep.bredde / 2;
    if (T0.form === 'punkt') { const [L, B] = A.målFor(T0, a.nivå), g = T0.inngang || 0, c = Math.cos(a.ret), s = Math.sin(a.ret), mx = a.P[0][0] - c * g / 2, my = a.P[0][1] - s * g / 2, dx = x - mx, dy = y - my;
      const uu = dx * c + dy * s, vv = -dx * s + dy * c, aa = a.type === 'kai' ? (L) / 2 : (L + g) / 2, bb = a.type === 'kai' ? B : B / 2;
      return a.type === 'kai' ? Math.max(Math.abs(vv) - aa, -uu - 3, uu - bb) : Math.max(Math.abs(uu) - aa, Math.abs(vv) - bb); }
    return Math.min(...a.P.map(p => Math.hypot(x - p[0], y - p[1]))) - 8; }
  const RYDD = { skyttergrav: 4, bunker: 4, kai: 3, tunnel: 7 };
  async function rydd(u, L) {
    const inne = (x, y) => L.some(a => utenfor(a, x, y) < RYDD[a.type]);
    const rens = async (data, st) => { if (!data || !data.length) return data; const ut = []; for (let k = 0; k < data.length; k += st) { if ((k & 1023) === 0 && børPuste()) await pust(); if (!inne(data[k], data[k + 1])) for (let i = 0; i < st; i++) ut.push(data[k + i]); }
      return ut.length === data.length ? data : Array.isArray(data) ? ut : new Float32Array(ut); };
    if (u.trær) for (const art of Object.keys(u.trær)) u.trær[art] = await rens(u.trær[art], 5);
    if (u.smått) { u.smått.stein = await rens(u.smått.stein, 5); u.smått.busk = await rens(u.smått.busk, 5); }
    if (u.hus) { if (u.hus.biler) u.hus.biler = await rens(u.hus.biler, 5); if (u.hus.flagg) u.hus.flagg = await rens(u.hus.flagg, 4); }
  }
  // bakken males: jord rundt graven og bunkeren, grus foran portalene (kartbildet px, TW punkter, lokalt -S..S)
  async function mal(u, px, TW, L) {
    const mpp = 2 * u.S / TW, rnd = (i, j) => { const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return v - Math.floor(v); };
    for (const a of L) { const r = { skyttergrav: 1.1, bunker: 2, kai: 1.5, tunnel: 10 }[a.type], farge = a.type === 'tunnel' || a.type === 'kai' ? [118, 112, 102] : [86, 70, 50];
      const xs = a.P.map(p => p[0]), ys = a.P.map(p => p[1]), ek = r + 30;
      const i0 = Math.max(0, Math.floor((Math.min(...xs) - ek + u.S) / mpp)), i1 = Math.min(TW - 1, Math.ceil((Math.max(...xs) + ek + u.S) / mpp)), j0 = Math.max(0, Math.floor((u.S - Math.max(...ys) - ek) / mpp)), j1 = Math.min(TW - 1, Math.ceil((u.S - Math.min(...ys) + ek) / mpp));
      for (let j = j0; j <= j1; j++) { if ((j & 31) === 0 && børPuste()) await pust(); const y = u.S - (j + .5) * mpp;
        for (let i = i0; i <= i1; i++) { const x = -u.S + (i + .5) * mpp, d = utenfor(a, x, y); if (d > r) continue; const w = Math.min(1, (r - d) / 1.2) * (.75 + .25 * rnd(i, j)), q = (j * TW + i) * 4, v = .85 + .3 * rnd(j, i);
          for (let c = 0; c < 3; c++) px[q + c] = px[q + c] * (1 - w) + farge[c] * v * w; } } }
  }
  KROKER.bygg3d.push(async (u, { px, TW } = {}) => {
    u.anleggZ = null; if (!klar || !liste.length || u.S > 4200) return; const L = liste.filter(a => iU(a, u)).map(a => lok(a, u)); if (!L.length) return;
    // bakkens høyde FØR inngrepet (moh.), for modellene: graven langs linja hver meter, ellers midten
    const z0 = (x, y) => hoyde3d(u.cx + x, u.cy + y, u), Z = {};
    for (const a of L) Z[a.id] = A.ANLEGG[a.type].form === 'linje' ? A.langs(a.P, 1).map(([x, y]) => [x, y, z0(x, y)]) : a.P.map(([x, y]) => [x, y, z0(x, y)]);
    u.anleggZ = Z;
    const I = []; for (const a of L) for (const o of A.inngrep(a)) I.push(o);
    if (I.length && window.Veg && Veg.skjærG && u.H) {
      const krav = A.terrengKrav(I, z0, Math.min(1, u.steg / 3)), vekter = [Veg.bilineær(u.N, u.steg, -u.S, u.S)]; if (typeof nett3d === 'function') vekter.push(nettVekter(u));
      // Claudes forslag: inntil 3 m senking i ett punkt, 10 runder (kravene ligger tettere enn vegenes)
      const R = { ...Veg.SKJÆR, maksSkjær: 3, runder: 10, under: 0 };
      if (børPuste()) await pust();
      u.anleggSkjær = (await kjørAsynk(Veg.skjærG(u.H, u.N, u.steg, -u.S, u.S, krav, null, R, vekter))).size; u.nett = null;
    }
    await rydd(u, L);
    if (px && TW) await mal(u, px, TW, L);
  });

  // ---------- 3D: modellene ----------
  let gruppe = null, trekanter = 0;
  const FARGE = { betong: [.6, .59, .56], betongMørk: [.42, .41, .39], betongLys: [.6, .6, .57], plank: [.43, .33, .21], plankMørk: [.3, .23, .15], sekk: [.63, .56, .41], sekk2: [.56, .5, .37], jord: [.34, .28, .2], stål: [.25, .27, .28],
    svart: [.06, .06, .06], gress: [.25, .28, .17], torv: [.3, .3, .19], gul: [.86, .72, .2], lampe: [1, .93, .66], kasse: [.27, .31, .2], tre: [.5, .38, .24], stake: [.92, .45, .12], hvit: [.9, .9, .88] };
  function farg(g, f) { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); if (!n.attributes.normal) n.computeVertexNormals(); const p = n.attributes.position, k = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) k.set(f, i * 3); n.setAttribute('color', new THREE.BufferAttribute(k, 3)); if (n.attributes.uv) n.deleteAttribute('uv'); return n; }
  // kasse med midten i (x, y) og bunnen i z, dreid rot om z
  function kasse(D, lx, ly, lz, x, y, z, rot, f) { const g = new THREE.BoxGeometry(lx, ly, lz); g.translate(0, 0, lz / 2); if (rot) g.rotateZ(rot); g.translate(x, y, z); D.push(farg(g, f)); }
  function sylinder(D, r, h, x, y, z, f, n = 8) { const g = new THREE.CylinderGeometry(r, r, h, n); g.rotateX(Math.PI / 2); g.translate(x, y, z + h / 2); D.push(farg(g, f)); }
  // firkant av fire hjørner [x, y, z] (rundt)
  // f2: fargen i hjørnene c og d (glir over fra f) – jordvollen går fra jord ved graven til gress ute
  function firkant(D, a, b, c, d, f, f2) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]), 3)); g.computeVertexNormals(); const n = farg(g, f);
    if (f2) { const k = n.attributes.color.array; for (const i of [2, 4, 5]) k.set(f2, i * 3); } D.push(n); }
  function slå(D) { let n = 0; for (const g of D) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of D) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.BufferAttribute(N, 3)); G.setAttribute('color', new THREE.BufferAttribute(C, 3)); return G; }
  // lokalt rammeverk for punktanlegg: (uu langs retningen, vv på tvers) -> utsnittets x, y
  const ramme = (x0, y0, ret) => { const c = Math.cos(ret), s = Math.sin(ret); return (uu, vv) => [x0 + uu * c - vv * s, y0 + uu * s + vv * c]; };
  function staker(D, P, z, hver = 3) { for (const [x, y] of A.langs(P, hver)) { const h = z(x, y); kasse(D, .08, .08, 1.1, x, y, h - .1, 0, FARGE.stake); kasse(D, .1, .1, .12, x, y, h + 1, 0, FARGE.hvit); } }

  function grav3d(D, a, u, Z, EX) {
    const T0 = A.ANLEGG[a.type], h = T0.inngrep.bredde / 2, d = T0.inngrep.dybde, zz = z => (z - u.h0) * EX, S = Z[a.id] || A.langs(a.P, 1).map(([x, y]) => [x, y, hoyde3d(u.cx + x, u.cy + y, u)]);
    if (!a.ferdig) { staker(D, a.P, (x, y) => zz(hoyde3d(u.cx + x, u.cy + y, u)), 3); return; }
    const n = S.length, nor = i => { const p = S[Math.max(0, i - 1)], q = S[Math.min(n - 1, i + 1)], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [-(q[1] - p[1]) / l, (q[0] - p[0]) / l]; };
    const pt = (i, o, z) => [S[i][0] + nor(i)[0] * o, S[i][1] + nor(i)[1] * o, z];
    for (let i = 0; i + 1 < n; i++) { const g0 = zz(S[i][2]), g1 = zz(S[i + 1][2]), f0 = g0 - d * EX, f1 = g1 - d * EX, r0 = g0 + .08, r1 = g1 + .08, pl = i % 2 ? FARGE.plank : FARGE.plankMørk;
      // bunnen (plankegang), veggene (kledning) og jordvollen ut på begge sider
      firkant(D, pt(i, -h, f0 + .03), pt(i + 1, -h, f1 + .03), pt(i + 1, h, f1 + .03), pt(i, h, f0 + .03), FARGE.plankMørk);
      for (const sd of [-1, 1]) { firkant(D, pt(i, sd * h, f0), pt(i + 1, sd * h, f1), pt(i + 1, sd * h, r1), pt(i, sd * h, r0), pl);
        firkant(D, pt(i, sd * (h + .05), r0), pt(i + 1, sd * (h + .05), r1), pt(i + 1, sd * (h + 1.9), g1 - .35), pt(i, sd * (h + 1.9), g0 - .35), FARGE.jord, FARGE.gress); } }
    for (const [i, sd] of [[0, -1], [n - 1, 1]]) { const g0 = zz(S[i][2]); firkant(D, pt(i, -h, g0 - d * EX), pt(i, h, g0 - d * EX), pt(i, h, g0 + .15), pt(i, -h, g0 + .15), FARGE.plank); void sd; }
    // sandsekker i to lag langs begge kantene (forskjøvet som murstein)
    for (const sd of [-1, 1]) for (const lag of [0, 1]) { const P = A.langs(S.map(s => [s[0], s[1]]), .62);
      for (let k = lag; k + 1 < P.length; k++) { const [x0, y0] = P[k], [x1, y1] = P[k + 1], l = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / l, ny = (x1 - x0) / l, mx = (x0 + x1) / 2 + nx * sd * (h + .32), my = (y0 + y1) / 2 + ny * sd * (h + .32);
        kasse(D, .58, .36, .2, mx, my, zz(S[Math.min(n - 1, Math.round(k * .62))][2]) + .12 + lag * .2, Math.atan2(y1 - y0, x1 - x0), (k + lag) % 3 ? FARGE.sekk : FARGE.sekk2); } }
  }
  function bunker3d(D, a, u, Z, EX) {
    const T0 = A.ANLEGG.bunker, [L, B] = T0.mål, t = .4, z0 = (Z[a.id] ? Z[a.id][0][2] : hoyde3d(u.cx + a.P[0][0], u.cy + a.P[0][1], u)), g = (z0 - u.h0) * EX, zf = g - T0.inngrep.dybde * EX, zc = zf + 2.4, f = ramme(a.P[0][0], a.P[0][1], a.ret);
    if (!a.ferdig) { const H = A.hjørner(a.P[0][0], a.P[0][1], a.ret, L, B); staker(D, [...H, H[0]], (x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * EX, 2.5); return; }
    const K = (lu, lv, lz, cu, cv, z, c, rot = 0) => { const [x, y] = f(cu, cv); kasse(D, lu, lv, lz, x, y, z, a.ret + rot, c); };
    K(L, B, .2, 0, 0, zf - .2, FARGE.betongMørk);
    // forveggen med skyteskår (2,4 m bredt, 30 cm høyt, 1,6 m over gulvet)
    const fu = L / 2 - t / 2, s0 = zf + 1.6, s1 = zf + 1.9;
    K(t, B, s0 - zf, fu, 0, zf, FARGE.betong); K(t, B, zc - s1, fu, 0, s1, FARGE.betong); K(t, B / 2 - 1.2, s1 - s0, fu, -(B / 4 + .6), s0, FARGE.betong); K(t, B / 2 - 1.2, s1 - s0, fu, B / 4 + .6, s0, FARGE.betong);
    // bakveggen med døråpning (1 m bred, 2 m høy) og sideveggene
    const bu = -L / 2 + t / 2, d0 = .6, d1 = 1.6;
    K(t, d0 + B / 2, zc - zf, bu, (d0 - B / 2) / 2, zf, FARGE.betong); K(t, B / 2 - d1, zc - zf, bu, (d1 + B / 2) / 2, zf, FARGE.betong); K(t, d1 - d0, zc - zf - 2, bu, (d0 + d1) / 2, zf + 2, FARGE.betong);
    for (const sd of [-1, 1]) K(L - 2 * t, t, zc - zf, 0, sd * (B / 2 - t / 2), zf, FARGE.betong);
    // taket (overheng) og jord oppå
    K(L + .5, B + .5, .5, 0, 0, zc, FARGE.betongLys); K(L - 1, B - 1, .25, -.2, 0, zc + .5, FARGE.torv);
    // jordvoll rundt sidene og foran (under skyteskåret)
    for (const sd of [-1, 1]) { const p = (uu, vv, z) => [...f(uu, vv), z]; firkant(D, p(-L / 2, sd * (B / 2 + .25), g + .7), p(L / 2, sd * (B / 2 + .25), g + .7), p(L / 2, sd * (B / 2 + 3), g - .5), p(-L / 2, sd * (B / 2 + 3), g - .5), FARGE.torv, FARGE.gress); }
    { const p = (uu, vv, z) => [...f(uu, vv), z]; firkant(D, p(L / 2 + .25, -B / 2 - .2, Math.min(g + .2, s0 - .1)), p(L / 2 + .25, B / 2 + .2, Math.min(g + .2, s0 - .1)), p(L / 2 + 3, B / 2 + 2.5, g - .5), p(L / 2 + 3, -B / 2 - 2.5, g - .5), FARGE.torv, FARGE.gress); }
    // døra i stål (åpen) og trinn ned mot døra
    { const geo = new THREE.BoxGeometry(.06, .95, 1.95); geo.translate(0, -.475, .975); geo.rotateZ(a.ret + 1.15); const [x, y] = f(-L / 2, d1); geo.translate(x, y, zf); D.push(farg(geo, FARGE.stål)); }
    for (let k = 0; k < 3; k++) K(.4, 1.1, (k + 1) * .4, -L / 2 - .3 - (2 - k) * .45, (d0 + d1) / 2, zf, FARGE.betongMørk);
    // inne: benk, bord, ammunisjonskasser, hylle og en lampe i taket
    K(L - 1.6, .45, .45, -.2, -(B / 2 - t - .25), zf, FARGE.tre); K(1.2, .7, .05, .4, .3, zf + .72, FARGE.tre); for (const [cu, cv] of [[.0, .0], [.8, .0], [.0, .6], [.8, .6]]) K(.06, .06, .72, -.15 + cu, .02 + cv, zf, FARGE.plankMørk);
    K(.6, .4, .35, -2, 1.5, zf, FARGE.kasse); K(.6, .4, .35, -2, 1.5, zf + .35, FARGE.kasse); K(.6, .4, .35, -1.3, 1.6, zf, FARGE.kasse);
    K(1.4, .3, .04, 1.6, B / 2 - t - .15, zf + 1.2, FARGE.tre); K(1.4, .3, .04, 1.6, B / 2 - t - .15, zf + .7, FARGE.tre);
    K(.3, .3, .12, 0, 0, zc - .14, FARGE.lampe);
  }
  function kai3d(D, a, u, EX) {
    const T0 = A.ANLEGG.kai, [L, B] = A.målFor(T0, a.nivå), f = ramme(a.P[0][0], a.P[0][1], a.ret), zz = h => (h - u.h0) * EX;
    // vannflaten: lavest i bakken foran kaia (der er det sjø); dekket 1,6 m over
    let zW = Infinity; for (let uu = 2; uu <= B + 6; uu += 2) for (let vv = -L / 2; vv <= L / 2; vv += 4) { const [x, y] = f(uu, vv); zW = Math.min(zW, hoyde3d(u.cx + x, u.cy + y, u)); }
    if (!isFinite(zW)) return; const w = zz(zW), zd = w + 1.6;
    if (!a.ferdig) { const H = [f(-3, -L / 2), f(B, -L / 2), f(B, L / 2), f(-3, L / 2)]; staker(D, [...H, H[0]], (x, y) => Math.max(w + .2, zz(hoyde3d(u.cx + x, u.cy + y, u))), 3); return; }
    const K = (lu, lv, lz, cu, cv, z, c) => { const [x, y] = f(cu, cv); kasse(D, lu, lv, lz, x, y, z, a.ret, c); };
    // kaiblokka i betong ned i sjøen, lyst dekke, kaikant med gul stripe, fendere og pullerter
    K(B + 3, L, zd - .25 - (w - 2.5), (B - 3) / 2, 0, w - 2.5, FARGE.betongMørk); K(B + 3, L, .25, (B - 3) / 2, 0, zd - .25, FARGE.betongLys);
    K(.35, L, .22, B - .18, 0, zd, FARGE.betong); K(.12, L - .4, .01, B - .7, 0, zd + .005, FARGE.gul);
    for (let vv = -L / 2 + 1.5; vv <= L / 2 - 1.4; vv += 4) K(.3, .35, zd - .1 - (w - .5), B + .15, vv, w - .5, FARGE.svart);
    for (let vv = -L / 2 + 2.5; vv <= L / 2 - 2; vv += 6) { const [x, y] = f(B - .75, vv); sylinder(D, .17, .45, x, y, zd, FARGE.svart); sylinder(D, .24, .06, x, y, zd + .45, FARGE.svart); }
    for (const vv of [-L / 3, L / 3]) { K(.15, .15, 6, .6, vv, zd, FARGE.stål); K(.9, .25, .15, 1, vv, zd + 6, FARGE.stål); K(.35, .3, .1, 1.35, vv, zd + 5.9, FARGE.lampe); }
    // leider ned til vannet
    { const vv = L / 2 - 3.2; for (const s of [-.22, .22]) K(.06, .06, zd - w + .3, B + .05, vv + s, w - .3, FARGE.stål); for (let z = w; z < zd; z += .35) K(.06, .5, .04, B + .05, vv, z, FARGE.stål); }
  }
  function tunnel3d(D, a, u, Z, EX) {
    if (!(a.ferdig || A.andel(a) > 0) || !window.Portal3d || !Portal3d.mal) { staker(D, a.P.map(p => p), (x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * EX, 4); return; }
    const B = A.ANLEGG.tunnel.bredde;
    for (const i of [0, 1]) { const p = a.P[i], q = a.P[1 - i]; if (Math.abs(p[0]) > u.S - 20 || Math.abs(p[1]) > u.S - 20) continue;
      const v = Math.atan2(p[1] - q[1], p[0] - q[0]), z = (hoyde3d(u.cx + p[0], u.cy + p[1], u) - u.h0) * EX;
      for (const g0 of Portal3d.mal(B)) { const g = g0.clone(); g.rotateZ(v); g.translate(p[0], p[1], z - .3); if (!g.attributes.normal) g.computeVertexNormals(); D.push(g); }
      if (!a.ferdig) { const [x, y] = [p[0] + Math.cos(v) * 8, p[1] + Math.sin(v) * 8]; kasse(D, 4, 3, 1.6, x, y, z - .4, v, FARGE.jord); } }
  }
  // Bunkerveggene stopper deg når du går selv (R3.hindre, som husene og byggesettet); døråpningen bak er åpen
  function hindringer(u, R) {
    if (!R.hindre) return;
    for (const [k, l] of R.hindre) { const f = l.filter(q => !q.an); if (f.length !== l.length) { if (f.length) R.hindre.set(k, f); else R.hindre.delete(k); } }
    for (const a0 of liste) { if (a0.type !== 'bunker' || !a0.ferdig || !iU(a0, u)) continue; const a = lok(a0, u), [L, B] = A.ANLEGG.bunker.mål, f = ramme(a.P[0][0], a.P[0][1], a.ret), t = .45;
      // veggene som rektangler (uu0, uu1, vv0, vv1): forveggen, sidene og bakveggen på hver side av døra (0,6–1,6 m)
      const biter = [[L / 2 - t, L / 2, -B / 2, B / 2], [-L / 2, L / 2, -B / 2, -B / 2 + t], [-L / 2, L / 2, B / 2 - t, B / 2], [-L / 2, -L / 2 + t, -B / 2, .6], [-L / 2, -L / 2 + t, 1.6, B / 2]];
      for (const [u0, u1, v0, v1] of biter) { const P = [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)], bb = [Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))];
        for (const n of new Set(P.map(([x, y]) => Math.floor(x / 20) + ',' + Math.floor(y / 20)))) { if (!R.hindre.has(n)) R.hindre.set(n, []); R.hindre.get(n).push({ P, bb, an: true }); } } }
  }
  function lagModeller(u, R) {
    if (gruppe) { R.scene.remove(gruppe); gruppe.geometry.dispose(); gruppe.material.dispose(); gruppe = null; } trekanter = 0;
    try { hindringer(u, R); } catch (e) { console.error(e); }
    if (!klar || !liste.length || !window.THREE || u.S > 4200) return; const D = [], Z = u.anleggZ || {}, EX = R.EX || 1;
    for (const a0 of liste) { if (!iU(a0, u)) continue; const a = lok(a0, u);
      try { if (a.type === 'skyttergrav') grav3d(D, a, u, Z, EX); else if (a.type === 'bunker') bunker3d(D, a, u, Z, EX); else if (a.type === 'kai') kai3d(D, a, u, EX); else if (a.type === 'tunnel') tunnel3d(D, a, u, Z, EX); } catch (e) { console.error(e); } }
    if (!D.length) return; const G = slå(D); trekanter = G.attributes.position.count / 3;
    gruppe = new THREE.Mesh(G, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); gruppe.name = 'anlegg'; R.scene.add(gruppe);
  }
  function nyeModeller() { const R = r3(); if (R && R.ut && R.scene && window.THREE) { lagModeller(R.ut, R); if (typeof skitten3d !== 'undefined') skitten3d = true; } }
  KROKER.sett3d.push((u, R) => lagModeller(u, R));

  window.AnleggSpill = { test: false, tilstand: () => ({ klar, liste, plass, valgt }), liste: () => liste, startPlass, trykk: trykkPlass, bekreft, avbryt, prøv, fjern, lagre, start,
    // for vakta og tester: legg inn et anlegg uten å betale (ferdig: true gir det ferdig straks)
    legg: (type, P, valg = {}) => { const a = A.nytt(type, P, valg); if (valg.ferdig) { a.arbeid = a.behov; a.ferdig = true; } liste.push(a); if (type === 'kai') kaiVer++; oppdaterInngrep(); lagre(); nyeModeller(); skitten = true; return a; },
    gjørFerdig: id => { const a = finn(id); if (!a || a.ferdig) return false; a.arbeid = a.behov; a.ferdig = true; ferdig(a); return true; },
    endring: (x, y) => A.endringVed(INNGREP, x, y), urørt,
    // bakken i 3D før inngrepet (moh.) nær (x, y) – fra prøvene bygg3d-kroken tok
    grunnFør: (id, x, y) => { const u = r3() && r3().ut, Z = u && u.anleggZ && u.anleggZ[id]; if (!Z) return null; let b = null, d = Infinity; for (const [px, py, z] of Z) { const e = Math.hypot(px + u.cx - x, py + u.cy - y); if (e < d) { d = e; b = z; } } return b; }, vern: s => VERN.get(s) || null, oppdaterVern: () => { VERN = A.fordel(liste, ENHETER.filter(s => levende(s) && !s.sti && s.side === 'blå')); return VERN.size; },
    // krav til terrenget for et anlegg her (asynkront: kartet hentes): { ok, feil, ret }
    sjekk: async (type, P, ret = 0) => A.kanPlassere(type, P, await terrengFor(P, 70), ret),
    // marsjen med og uten tunnel (for vakta og feilsøking): { rett, via: { v, inn } | null }
    rute: async (x, y, X, Y) => { const T = tunneler(), h = await høyderFor([[x, y], [X, Y], ...T.flatMap(a => a.P)]); const v = A.viaTunnel(T, x, y, X, Y, h); return { rett: Math.round(A.marsjKost(h, x, y, X, Y)), via: v ? { v: Math.round(v.v), inn: v.inn, id: v.a.id } : null }; },
    kaier: () => (window.KaierSpill ? KaierSpill.data() : null), kaiPunkt, tunnelSteg, inn, velg: id => { valgt = id; panelHtml = ''; visAnleggPanel(); },
    sjekk3d: () => ({ iScene: !!(gruppe && r3() && r3().scene.children.includes(gruppe)), trekanter, skjær: r3() && r3().ut ? r3().ut.anleggSkjær || 0 : 0 }) };
})();
