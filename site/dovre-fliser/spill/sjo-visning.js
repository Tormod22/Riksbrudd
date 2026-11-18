/* Riksbrudd – SJØEN i kartet (18. nov, nattarbeid; regler: spill/sjo.js). window.SjoSpill.
 * Båter kjøpes ved en kai nær leiren eller et tettsted du holder, seiler over sjøen mellom kaiene (ruta holder seg i vann), tar med lag
 * og varer, fisker, legger miner og kan senkes som sperring. Havner i tettsteder du holder, gir forsyninger som samler seg på kaia.
 * Ferjer kan tas ved ferjekaiene. Styres fra panelet «Sjø» (kommandolinja, Leir-menyen, eller trykk på en kai eller en båt i kartet).
 * Lagres per leir i «riksbrudd-sjo». I testene (navigator.webdriver) kommer ikke havnevarene av seg selv før SjoSpill.test = true.
 */
(function () {
  'use strict';
  const SJ = window.Sjo; if (!SJ || typeof KROKER === 'undefined') return;
  const R = SJ.REGLER, TY = SJ.TYPER, NØKKEL = 'riksbrudd-sjo';
  const ut = { test: false }, auto = () => !navigator.webdriver || ut.test;
  let S = SJ.ny(), leirId = '', klar = false, endret = false, sistLagret = 0;
  // valgt: { båt } | { kai: i } | null. modus: 'kai' (neste trykk på en kai = mål), 'punkt' (neste trykk i sjøen = mål)
  let valg = null, modus = null, åpen = false, sistHtml = '', sistTegn = 0, kaiSjekket = false, havnKart = null, havnKartFor = null;
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const kn = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = e => { e.stopPropagation(); fn(); tegnPanel(true); }; return b; };
  const kr = v => (v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0).replace('.', ',') + ' mill. kr' : Math.round(v / 1000) + ' 000 kr');
  const km = d => (d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(d < 10000 ? 1 : 0).replace('.', ',') + ' km');
  const tidTekst = min => (min < 60 ? Math.max(1, Math.round(min)) + ' min' : (min / 60).toFixed(min < 600 ? 1 : 0).replace('.', ',') + ' t');
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const leir = () => { const O = spill(); return O && O.leir ? O.leir : null; };
  const K = () => (window.KaierSpill ? KaierSpill.data() : null);
  const infra = () => (typeof INFRA !== 'undefined' && INFRA ? INFRA : null);
  const vind = () => { const w = window.VAER && (VAER.vind !== undefined ? VAER.vind : VAER.regel && VAER.regel.vind); return typeof w === 'number' ? w : (w && w.fart) || (window.Vind3d && Vind3d.VIND && Vind3d.VIND.fart) || 0; };
  const betal = k => !!(window.OppstartSpill && OppstartSpill.betal(k));
  const merk = () => { endret = true; skitten = true; };

  // ---------- kaier, tettsteder og havner ----------
  function kai(i) { const k = K(); if (!k || i < 0 || i >= k.n) return null; return { i, x: k.x[i], y: k.y[i], t: k.t[i], l: k.l[i], størrelse: Kaier.størrelse(k.t[i], k.l[i]), navn: Kaier.navn(k, i) || Kaier.NAVN[k.t[i]] || 'Kai', tekst: Kaier.tekst(k, i) }; }
  const kaiNavn = i => { const q = kai(i); return q ? q.navn : 'sjøen'; };
  // avstand fra punktet til tettstedet (0 inne i det; ellers til nærmeste hjørne i omrisset)
  function tilBy(by, x, y) { if (window.Garnison && Garnison.inni(by, x, y)) return 0; let d = Infinity; for (const a of by.deler) for (let q = 0; q + 1 < a.length; q += 2) { const v = Math.hypot(a[q] - x, a[q + 1] - y); if (v < d) d = v; } return d; }
  function byerNær(x, y, r) { const I = infra(), utl = []; if (!I || !I.tettsted) return utl; for (const by of I.tettsted) { if (by.bb[0] > x + r || by.bb[2] < x - r || by.bb[1] > y + r || by.bb[3] < y - r) continue; const d = tilBy(by, x, y); if (d <= r) utl.push({ by, d }); } return utl.sort((a, b) => a.d - b.d); }
  const eier = by => (window.TETTSTEDER && window.Garnison ? Garnison.tilstand(TETTSTEDER, by.e.id).eier : null);
  // Hvorfor kan du kjøpe båt her? null = kan ikke.
  function kjøpGrunn(q) { const L = leir(); if (L && Math.hypot(q.x - L.x, q.y - L.y) <= R.kjøpLeir) return 'nær leiren'; const b = byerNær(q.x, q.y, R.kjøpBy).find(o => eier(o.by) === 'blå'); return b ? `i ${b.by.e.navn}, som du holder` : null; }
  const vedLeiren = (x, y) => { const L = leir(); return !!L && Math.hypot(x - L.x, y - L.y) <= R.leirKai; };
  // Havna til et tettsted: nærmeste store kai i tettstedet eller innen R.havnNær. Huskes per tettsted.
  function havnFor(by) { const k = K(); if (!k) return -1; if (havnKartFor !== k) { havnKart = new Map(); havnKartFor = k; } if (havnKart.has(by.e.id)) return havnKart.get(by.e.id);
    let best = -1, bd = Infinity; for (const i of Kaier.iBoks(k, by.bb[0] - R.havnNær, by.bb[2] + R.havnNær, by.bb[1] - R.havnNær, by.bb[3] + R.havnNær)) { if (Kaier.størrelse(k.t[i], k.l[i]) !== 'stor') continue; const d = tilBy(by, k.x[i], k.y[i]); if (d <= R.havnNær && (d < bd || (d === bd && k.l[i] > k.l[best]))) { bd = d; best = i; } }
    havnKart.set(by.e.id, best); return best; }
  let byKart = null, byKartFor = null;
  const byMedId = id => { const I = infra(); if (!I || !I.tettsted) return null; if (byKartFor !== I.tettsted) { byKart = new Map(I.tettsted.map(b => [b.e.id, b])); byKartFor = I.tettsted; } return byKart.get(id) || null; };
  // Havnene du holder: [{ id, navn, folk, kai, by }]
  function havner() { const utl = []; if (!window.TETTSTEDER || !K()) return utl; for (const [id, t] of TETTSTEDER) { if (!t || t.eier !== 'blå') continue; const by = byMedId(id); if (!by) continue; const i = havnFor(by); if (i >= 0) utl.push({ id, navn: by.e.navn, folk: by.e.folk || 0, kai: i, by }); } return utl; }
  const havnVedKai = i => havner().find(h => h.kai === i) || null;

  // ---------- leirens lager ----------
  // Legg varene inn i leiren. Gir det som ikke fikk plass.
  function tilLeiren(v) { const rest = SJ.tomLast(), L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand();
    for (const k of ['tre', 'betong', 'stål']) { const m = v[k] || 0; if (m <= 0) continue; const inn = L && window.Leir ? Leir.leggInn(L, k, m) : 0; rest[k] = m - inn; }
    if (v.drivstoff > 0) { const plass = L && window.Leir ? Math.max(0, Leir.kapasitet(L) - (L.drivstoff || 0)) : 0, inn = Math.min(plass, v.drivstoff); if (L) L.drivstoff = (L.drivstoff || 0) + inn; rest.drivstoff = v.drivstoff - inn; }
    if (v.rasjoner > 0) { if (F) F.mat += v.rasjoner; else rest.rasjoner = v.rasjoner; }
    if (L && LeirSpill.lagre) LeirSpill.lagre(); return rest; }

  // ---------- lag om bord ----------
  const egne = () => ENHETER.filter(s => s.side === 'blå' && levende(s) && !s.leirvakt);
  const omBord = b => ENHETER.filter(s => s.påBåt === b);
  function gåOmBord(s, b) { if (s.ombord) { logg(`${s.navn} sitter i et kjøretøy – la dem gå av først.`); return false; } const f = SJ.ombordFeil(s, b, omBord(b).length); if (f) { logg(`${s.navn}: ${f}`); return false; }
    s.påBåt = b; s.sti = null; s.x = b.x; s.y = b.y; s.siktSkitten = true; logg(`${s.navn} er om bord i ${b.navn}. Gi båten ordre – laget følger med.`); merk(); if (valgt === s) visPanel(); return true; }
  // nærmeste land ved punktet (laget skal ikke settes i vannet)
  async function landVed(x, y) { try { const v = await lagVindu([x - 400, y - 400, x + 400, y + 400], false); let best = null, bd = Infinity; for (let j = 0; j < v.h; j++) for (let i = 0; i < v.w; i++) { const c = v.K[j * v.w + i]; if (c === 3 || c === 255) continue; const cx = v.x0 + (i + .5) * v.r, cy = v.y0 - (j + .5) * v.r, d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = [cx, cy]; } } return bd <= 400 ? best : null; } catch (e) { return null; } }
  async function gåILand(s) { const b = s.påBåt; if (!b) return false; if (b.sti) { logg(`${b.navn} er underveis – vent til båten ligger ved kai.`); return false; } if (b.kai < 0) { logg(`${b.navn} ligger ikke ved en kai. Seil til en kai først.`); return false; }
    const p = (await landVed(b.x, b.y)) || [b.x + 8, b.y + 6]; if (s.påBåt !== b) return false; s.påBåt = null; s.x = p[0] + (Math.random() - .5) * 12; s.y = p[1] + (Math.random() - .5) * 12; s.sti = null; s.siktSkitten = true;
    // landgang: fienden i et tettsted like ved er ikke forberedt på folk fra sjøen
    const fi = byerNær(b.x, b.y, R.landgangNær).find(o => { const e = eier(o.by); return e && e !== 'blå'; });
    if (fi) { s.landgang = tid + R.landgangMin; logg(`${s.navn} går i land ved ${fi.by.e.navn}. Landgang fra sjøen: fienden er overrasket i ${R.landgangMin} minutter.`); } else logg(`${s.navn} har gått i land ved ${kaiNavn(b.kai)}.`);
    merk(); if (valgt === s) visPanel(); tegnPanel(true); return true; }
  KROKER.kanOrdre.push(s => { if (!s.påBåt) return true; logg(`${s.navn} er om bord i ${s.påBåt.navn}: gi båten ordre, eller sett laget i land ved en kai.`); return false; });
  KROKER.lagTekst.push(s => (s.påBåt ? `om bord i ${s.påBåt.navn}` : s.landgang && tid < s.landgang ? 'landgang: fienden er overrasket' : null));
  KROKER.lagKnapper.push((s, H) => { if (!klar || s.side !== 'blå' || s.karakter) return; if (s.påBåt) { H.appendChild(knapp('Gå i land', false, () => { gåILand(s); })); return; }
    const b = S.båter.find(q => !q.sti && Math.hypot(q.x - s.x, q.y - s.y) <= R.ombord && omBord(q).length < TY[q.type].lag); if (b) H.appendChild(knapp(`Om bord i ${b.navn}`, false, () => { gåOmBord(s, b); tegnPanel(true); })); });
  KROKER.ild.push((a, b) => (a.påBåt || b.påBåt || a.landgang || b.landgang ? SJ.ild(a, b, tid) : 1));

  // ---------- seilas ----------
  // Seil båten til et punkt (kaiI = kaia der, eller -1 for et sted på sjøen). o.vindu: ferdig sjøkart (testene).
  async function seil(b, x, y, kaiI = -1, o = {}) { if (b.planlegger) return { feil: 'planlegger' }; const d = Math.hypot(x - b.x, y - b.y), si = t => { logg(`${b.navn}: ${t}`); return { feil: t }; };
    if (d < 30) return si('båten ligger der alt.'); if (d > R.maksSeilas) return si(`for langt i én seilas (over ${R.maksSeilas / 1000} km). Seil i etapper.`);
    if (window.OMRÅDE_OK && !OMRÅDE_OK(x, y)) return si('det ligger utenfor spillkartet.');
    if (kaiI >= 0) { const q = kai(kaiI); if (q && !SJ.passer(b.type, q.størrelse)) return si(`${TY[b.type].navn.toLowerCase()} trenger en ${TY[b.type].kai === 'stor' ? 'stor' : 'middels eller stor'} kai – ${q.navn} er for liten.`); }
    b.planlegger = true; logg(`${b.navn}: finner lei over sjøen …`);
    try { let r = null, N = SJ.nivå(d);
      for (let forsøk = 0; forsøk < 2; forsøk++) { const v = o.vindu || await lagVindu([Math.min(b.x, x) - N.pad, Math.min(b.y, y) - N.pad, Math.max(b.x, x) + N.pad, Math.max(b.y, y) + N.pad], false, N.zv);
        const ny = SJ.rute(v, b.x, b.y, x, y, { sperringer: S.sperringer }); if (!r || !r.sti || (ny.sti && ny.meter < r.meter)) r = ny;
        // trange sund forsvinner i det grove kartet: prøv en gang til med finere kart når turen ikke er for lang og ruta mangler
        // eller er en lang omveg
        if (o.vindu || N.zv >= 9 || d > 40000 || r.feil === 'sperret' || (r.sti && r.meter < d * 1.8)) break; N = { zv: N.zv + 1, pad: Math.min(Math.max(N.pad, 6000), 14000) }; }
      if (r.feil) return si(r.feil === 'sperret' ? 'leia er sperret av miner eller et vrak. Rydd sperringen eller velg et annet mål.' : r.feil === 'start' ? 'båten ligger ikke i sjøen.' : r.feil === 'mål' ? 'det er ikke sjø der.' : 'det går ingen lei over sjøen dit – båten kan ikke gå over land.');
      SJ.settRute(b, r.sti, kaiI); b.friFor = S.sperringer.filter(q => Math.hypot(q.x - b.x, q.y - b.y) <= q.r).map(q => q.id); merk(); logg(`${b.navn}: seiler til ${kaiI >= 0 ? kaiNavn(kaiI) : 'stedet på sjøen'}, ${km(r.meter)}, ca. ${tidTekst(r.meter / TY[b.type].fart / 60)}.`); return { meter: r.meter };
    } catch (e) { return si('fikk ikke hentet sjøkartet. Prøv igjen.'); } finally { b.planlegger = false; tegnPanel(true); } }

  // ---------- kjøp, ferje, last, fiske, sperring ----------
  function kjøp(type, i) { const q = kai(i); if (!q) return { feil: 'Finner ikke kaia.' }; if (!kjøpGrunn(q)) { const f = `Du kan bare kjøpe båt ved en kai innen ${km(R.kjøpLeir)} fra leiren eller ved et tettsted du holder.`; logg(f); return { feil: f }; }
    const r = SJ.kjøp(S, type, q, betal); if (r.feil) { logg(r.feil); return r; } logg(`Kjøpt: ${r.båt.navn} (${kr(TY[type].pris)}). Den ligger ved ${q.navn}.`); valg = { båt: r.båt }; merk(); return r; }
  const ferjeNøkkel = q => Math.round(q.x / 50) + ',' + Math.round(q.y / 50);
  // Er det en ferje å ta her? (ferjeterminal i kaidataene, eller en ferjekai fra vegdataene like ved)
  function ferjeHer(q) { if (q.størrelse !== 'stor' && q.t !== 4) return false; if (S.ferjerTatt.includes(ferjeNøkkel(q))) return false; if (q.t === 4) return true; const I = infra(); return !!(I && I.ferjekai && I.ferjekai.some(o => Math.hypot(o.deler[0][0] - q.x, o.deler[0][1] - q.y) <= 500)); }
  function taFerje(i) { const q = kai(i); if (!q || !ferjeHer(q)) return { feil: 'Ingen ferje å ta her.' }; const s = egne().find(e => !e.påBåt && Math.hypot(e.x - q.x, e.y - q.y) <= R.taFerje); if (!s) { const f = `Et av lagene dine må stå innen ${R.taFerje} m fra ferjekaia for å ta ferja.`; logg(f); return { feil: f }; }
    const b = SJ.nyBåt(S, 'ferje', q.x, q.y, i, `Ferja fra ${q.navn}`); S.ferjerTatt.push(ferjeNøkkel(q)); logg(`${s.navn} har tatt ferja ved ${q.navn}. Den er din nå: fire lag og mye last, men bare store kaier.`); valg = { båt: b }; merk(); return { båt: b }; }
  function lastOm(b) { const h = b.kai >= 0 ? havnVedKai(b.kai) : null, H = h && S.havner[h.id]; if (!H) { logg(`${b.navn}: ingen varer å laste her.`); return null; } const t = SJ.lastOm(b, H); logg(`${b.navn} har lastet ${SJ.lastTekst(t)} i ${h.navn}.`); merk(); return t; }
  function loss(b) { if (b.sti || !vedLeiren(b.x, b.y)) { logg(`${b.navn} må ligge ved en kai innen ${km(R.leirKai)} fra leiren for å losse til leiren.`); return null; } const v = SJ.loss(b), rest = tilLeiren(v); b.last = rest;
    const inn = Object.fromEntries(SJ.VARER.map(k => [k, (v[k] || 0) - (rest[k] || 0)])); logg(`${b.navn} har losset ${SJ.lastTekst(inn)} til leiren.` + (SJ.lastVekt(rest) > 0.01 ? ` Det var ikke plass til ${SJ.lastTekst(rest)} – det ligger igjen om bord.` : '')); merk(); return inn; }
  function fisk(b, på) { if (!TY[b.type].fiske) { logg(`${b.navn} kan ikke fiske.`); return; } if (b.sti) SJ.stopp(b); b.fisker = på === undefined ? !b.fisker : !!på; logg(b.fisker ? `${b.navn} fisker nå. Fangsten går rett til leiren når båten ligger innen ${km(R.leirKai)} fra den, ellers i lasterommet.` : `${b.navn} har sluttet å fiske.`); merk(); }
  function miner(b) { if (b.sti) { logg('Stopp båten først.'); return; } const r = SJ.leggMiner(S, b.x, b.y, betal); if (r.feil) { logg(r.feil); return; } logg(`${b.navn} har lagt miner (${kr(R.minePris)}). Ingen båter kommer forbi innen ${R.mineRadius} m – heller ikke dine egne.`); merk(); }
  function senk(b) { for (const s of omBord(b)) { logg(`${s.navn} er om bord – sett laget i land først.`); return; } const r = SJ.senk(S, b); if (r.feil) { logg(r.feil); return; } logg(`${b.navn} er senket. Vraket sperrer leia innen ${R.vrakRadius} m for godt.`); if (valg && valg.båt === b) valg = null; merk(); }
  function rydd(id) { const r = SJ.rydd(S, id, betal); if (r.feil) logg(r.feil); else { logg(`Minefeltet er ryddet (${kr(R.ryddPris)}).`); merk(); } }

  // ---------- tiden går ----------
  KROKER.sim.push(dt => { if (!klar) return; const k = K();
    // kaiene kan ha fått nye nummer (nye kartdata): finn kaia båten ligger ved på nytt
    if (k && !kaiSjekket) { kaiSjekket = true; for (const b of S.båter) if (!b.sti) { const f = Kaier.nær(k, b.x, b.y, 90); b.kai = f ? f.i : -1; } }
    for (const b of S.båter) {
      // lagene som sto om bord da spillet ble lagret
      if (b.lag) { for (const n of b.lag) { const s = ENHETER.find(e => e.navn === n && e.side === 'blå'); if (s) s.påBåt = b; } delete b.lag; }
      if (b.sti) { const fr = SJ.steg(b, dt); skitten = true; endret = true;
        const sp = SJ.iSperring(S, b.x, b.y); if (sp && b.sti && !(b.friFor || []).includes(sp.id)) { SJ.stopp(b); logg(`${b.navn} stopper: ${sp.type === 'vrak' ? 'et vrak' : 'et minefelt'} sperrer leia.`); }
        if (fr === 'framme') { logg(b.kai >= 0 ? `${b.navn} ligger ved ${kaiNavn(b.kai)}.` : `${b.navn} er framme og ligger stille.`); tegnPanel(true); } }
      if (b.fisker) { const f = SJ.fangst(b, dt, { vind: vind(), årstid: window.VAER && VAER.årstid }); if (f > 0) { const F = window.FolkSpill && FolkSpill.tilstand(); if (F && vedLeiren(b.x, b.y)) F.mat += f; else b.last.rasjoner += Math.min(f, SJ.ledig(b) / R.vekt.rasjoner); b.fangst = (b.fangst || 0) + f; endret = true; } } }
    for (const s of ENHETER) { const b = s.påBåt; if (!b) continue; if (!S.båter.includes(b) || !levende(s)) { s.påBåt = null; continue; } if (s.x !== b.x || s.y !== b.y) { s.x = b.x; s.y = b.y; s.siktSkitten = true; } s.sti = null; s.retning = b.retning; }
    // havnene: varene samler seg på kaia; en gang i uka kjøres resten landevegen
    if (auto()) { const H = havner(); if (H.length) { SJ.havnSteg(S, H, dt); endret = true; if (S.sistHavn === null) S.sistHavn = tid;
        if (tid - S.sistHavn >= R.havnDøgn * 1440) { S.sistHavn = tid; const v = SJ.havnLandeveg(S, H.map(h => h.id)); if (SJ.lastVekt(v) > 0.05) { const rest = tilLeiren(v); const inn = Object.fromEntries(SJ.VARER.map(q => [q, (v[q] || 0) - (rest[q] || 0)]));
            logg(`Ukas varer fra ${H.length === 1 ? 'havna i ' + H[0].navn : H.length + ' havner'} som ingen båt hentet, kom landevegen: ${SJ.lastTekst(inn)} (halvparten gikk tapt på vegen).`); } } } else S.sistHavn = null; }
    const nå = performance.now(); if (endret && nå - sistLagret > 5000) lagre(); if (åpen && nå - sistTegn > 1000) tegnPanel(); });

  // ---------- lagring ----------
  function lagre() { if (!klar) return; sistLagret = performance.now(); endret = false; const d = SJ.tilJSON(S); for (let q = 0; q < S.båter.length; q++) { const n = omBord(S.båter[q]).map(s => s.navn); if (n.length) d.båter[q].lag = n; }
    try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ...d })); } catch (e) { /* fullt eller sperret */ } }
  function start() { const L = leir(); if (!L) return; leirId = Math.round(L.x) + ',' + Math.round(L.y); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    for (const s of ENHETER) if (s.påBåt) s.påBåt = null; S = d && d.leir === leirId ? SJ.fraJSON(d) : SJ.ny(); klar = true; valg = null; modus = null; kaiSjekket = false; skitten = true; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0)); window.addEventListener('pagehide', () => { if (endret) lagre(); });

  // ---------- kartet ----------
  const FARGE = { skrog: '#d8e6f2', kant: '#0f0b07', valgt: '#e8d48a', sti: 'rgba(160,205,240,.85)', mine: '#d0563c', havn: '#e8d48a' };
  function tegnBåt(g, b, x, y, m, valgt) { const T = TY[b.type], L = Math.max(T.lengde / m, m < 60 ? 13 : 8), B = Math.max(L * .36, 4); g.save(); g.translate(x, y); g.rotate(b.retning || 0);
    g.beginPath(); g.moveTo(0, -L / 2); g.quadraticCurveTo(B / 2, -L / 4, B / 2, L / 6); g.lineTo(B / 2 * .8, L / 2); g.lineTo(-B / 2 * .8, L / 2); g.lineTo(-B / 2, L / 6); g.quadraticCurveTo(-B / 2, -L / 4, 0, -L / 2); g.closePath();
    g.fillStyle = typeof sidefarge === 'function' ? sidefarge('blå', 'lys') : FARGE.skrog; g.strokeStyle = valgt ? FARGE.valgt : FARGE.kant; g.lineWidth = valgt ? 2.4 : 1.3; g.fill(); g.stroke();
    // styrehus (lekteren har last i stedet)
    g.fillStyle = 'rgba(15,11,7,.75)'; if (b.type === 'lekter') g.fillRect(-B * .28, -L * .2, B * .56, L * .45); else g.fillRect(-B * .22, L * .02, B * .44, L * .2); g.restore();
    if (b.fisker) { g.strokeStyle = '#8fd0c0'; g.lineWidth = 1.2; g.setLineDash([3, 3]); g.beginPath(); g.arc(x, y, L * .8 + 4, 0, 6.283); g.stroke(); g.setLineDash([]); } }
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar) return; const m = kam.m, P = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m]; g.save(); g.font = '13px "Cormorant Garamond", serif'; g.textAlign = 'center';
    // sperringer
    if (m < 400) for (const s of S.sperringer) { const [x, y] = P(s.x, s.y), r = Math.max(6, s.r / m); if (x < -r || y < -r || x > VW + r || y > VH + r) continue; g.strokeStyle = FARGE.mine; g.fillStyle = 'rgba(208,86,60,.16)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.stroke(); g.setLineDash([]);
      g.fillStyle = FARGE.mine; if (s.type === 'vrak') { g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.lineWidth = 2.2; g.stroke(); } else for (let q = 0; q < 5; q++) { const a = q * 1.2566, rr = q ? Math.min(r * .55, 14) : 0; g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 2.6, 0, 6.283); g.fill(); }
      if (m < 40) { g.lineWidth = 3; g.strokeStyle = 'rgba(15,11,7,.85)'; const t = s.type === 'vrak' ? 'Vrak' : 'Miner'; g.strokeText(t, x, y + r + 13); g.fillStyle = FARGE.mine; g.fillText(t, x, y + r + 13); } }
    // havnene du holder: gullring rundt kaia og hva som ligger der
    if (m < 160 && K()) for (const h of havner()) { const q = kai(h.kai), [x, y] = P(q.x, q.y); if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue; g.strokeStyle = FARGE.havn; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 13, 0, 6.283); g.stroke();
      const H = S.havner[h.id], v = H ? SJ.lastVekt(H) : 0; if (m < 60) { const t = v > 0.5 ? `Havn: ${Math.round(v)} på kaia` : 'Din havn'; g.lineWidth = 3; g.strokeStyle = 'rgba(15,11,7,.85)'; g.strokeText(t, x, y - 18); g.fillStyle = FARGE.havn; g.fillText(t, x, y - 18); } }
    // båtene
    for (const b of S.båter) { const [x, y] = P(b.x, b.y), v = valg && valg.båt === b;
      if (b.sti && (v || m < 80)) { g.strokeStyle = FARGE.sti; g.lineWidth = v ? 2 : 1.2; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(x, y); for (let q = b.seg + 1; q < b.sti.length; q++) { const [sx, sy] = P(b.sti[q][0], b.sti[q][1]); g.lineTo(sx, sy); } g.stroke(); g.setLineDash([]); const e = b.sti[b.sti.length - 1], [ex, ey] = P(e[0], e[1]); g.beginPath(); g.arc(ex, ey, 4, 0, 6.283); g.stroke(); }
      if (x < -60 || y < -60 || x > VW + 60 || y > VH + 60) continue; tegnBåt(g, b, x, y, m, v);
      if (m < 30 || v) { const n = omBord(b).length, t = b.navn + (n ? ` (${n} lag)` : ''), yt = window.Etikett ? Etikett.tekst(g, t, x, y + 22, 1) : y + 22; g.lineWidth = 3; g.strokeStyle = 'rgba(15,11,7,.85)'; g.strokeText(t, x, yt); g.fillStyle = '#d8e6f2'; g.fillText(t, x, yt); } }
    if (modus && valg && valg.båt) { const t = modus === 'kai' ? `Trykk på kaia ${valg.båt.navn} skal seile til` : `Trykk i sjøen der ${valg.båt.navn} skal ligge`; g.font = '15px "Cormorant Garamond", serif'; const w = g.measureText(t).width + 20; g.fillStyle = 'rgba(15,11,7,.85)'; g.fillRect(VW / 2 - w / 2, 96, w, 26); g.fillStyle = FARGE.valgt; g.fillText(t, VW / 2, 114); }
    g.restore(); });
  // Trykk i kartet (kalles først fra kaier.js sin trykk-krok): svarer true når trykket er brukt.
  function trykk(X, Y) { if (!klar) return false; const m = kam.m;
    if (modus === 'punkt' && valg && valg.båt) { const b = valg.båt; modus = null; seil(b, X, Y, -1); return true; }
    if (modus === 'kai') return false;
    let best = null, bd = Infinity; for (const b of S.båter) { const d = Math.hypot(b.x - X, b.y - Y); if (d <= Math.max(16 * m, TY[b.type].lengde * .6) && d < bd) { bd = d; best = b; } }
    if (best) { valg = { båt: best }; vis(true); return true; } return false; }
  // Trykk på en kai (fra kaier.js). Svarer true når trykket ga en seilordre (da skriver ikke kaier.js i loggen).
  function kaiTrykk(i) { if (!klar) return false; if (modus === 'kai' && valg && valg.båt) { const b = valg.båt, q = kai(i); modus = null; if (q) seil(b, q.x, q.y, i); return true; }
    valg = { kai: i }; vis(true); return false; }

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#sjopanel{ position:fixed; right:10px; top:calc(var(--topp,58px) + 56px); z-index:30; display:none; width:min(380px,94vw); max-height:calc(100vh - var(--topp,58px) - 150px); overflow:auto; padding:10px 12px 12px; background:#1c170f; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; border-radius:4px; }
#sjopanel.på{ display:block; } #sjopanel h2{ margin:0 26px 6px 0; font:400 19px "IM Fell English",serif; letter-spacing:.03em; } #sjopanel h3{ margin:10px 0 4px; font:600 14px inherit; color:#e8d48a; letter-spacing:.04em; }
#sjopanel .lukk{ position:absolute; right:6px; top:6px; width:28px; height:28px; padding:0; } #sjopanel p{ margin:4px 0; line-height:1.35; } #sjopanel small{ color:#b9ab86; }
#sjopanel button{ font:inherit; font-size:13.5px; padding:5px 9px; margin:3px 4px 3px 0; background:#2a2215; border:1px solid #5a4a2a; color:inherit; border-radius:3px; cursor:pointer; } #sjopanel button:hover{ border-color:#e8d48a; } #sjopanel button.på{ background:#5a4a2a; border-color:#e8d48a; } #sjopanel button[disabled]{ opacity:.45; cursor:default; }
#sjopanel .rad{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:4px 0; border-top:1px solid rgba(201,178,106,.18); } #sjopanel .rad > div{ min-width:0; } #sjopanel .rad b{ font-weight:600; }
body.smal #sjopanel, body.kort #sjopanel{ left:0; right:0; top:auto; bottom:0; width:auto; max-height:62vh; border-width:1px 0 0; border-radius:0; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'sjopanel', role: 'dialog', 'aria-label': 'Sjø' }); document.body.appendChild(panel);
  function vis(på) { åpen = på === undefined ? !åpen : !!på; panel.classList.toggle('på', åpen); if (!åpen) { modus = null; skitten = true; } else tegnPanel(true); }
  const gåTil = (x, y) => { if (typeof på3d !== 'undefined' && på3d) return; kam.x = x; kam.y = y; if (kam.m > 25) kam.m = 12; skitten = true; };
  function båtStatus(b) { if (b.planlegger) return 'finner lei …'; if (b.sti) return `underveis til ${b.mål >= 0 ? kaiNavn(b.mål) : 'et sted på sjøen'}, ${km(SJ.meterIgjen(b))} igjen (ca. ${tidTekst(SJ.minutterIgjen(b))})`; return (b.kai >= 0 ? `ligger ved ${kaiNavn(b.kai)}` : 'ligger stille på sjøen') + (b.fisker ? ' og fisker' : ''); }
  function byggBåt(H, b) { const T = TY[b.type], om = omBord(b);
    H.append(el('h2', {}, b.navn), el('p', {}, el('small', {}, `${T.navn} · ${(T.fart * 1.944).toFixed(0)} knop · ${T.lag} lag · last ${T.last}`)), el('p', {}, båtStatus(b) + '.'));
    H.append(el('p', {}, `Last: ${SJ.lastTekst(b.last)} (${Math.round(SJ.lastVekt(b.last))} av ${T.last}).`));
    H.append(el('h3', {}, 'Seilas'));
    H.append(kn('Seil til en kai', () => { modus = modus === 'kai' ? null : 'kai'; skitten = true; if (modus) logg(`Trykk på kaia ${b.navn} skal seile til (zoom inn for å se småkaiene).`); }, modus === 'kai' ? { klasse: 'på', 'data-sjo': 'tilkai' } : { 'data-sjo': 'tilkai' }));
    H.append(kn('Seil til et sted på sjøen', () => { modus = modus === 'punkt' ? null : 'punkt'; skitten = true; }, modus === 'punkt' ? { klasse: 'på' } : {}));
    if (b.sti) H.append(kn('Stopp', () => { SJ.stopp(b); merk(); logg(`${b.navn} stopper.`); })); H.append(kn('Vis i kartet', () => gåTil(b.x, b.y)));
    H.append(el('h3', {}, 'Lag om bord'));
    if (!om.length) H.append(el('p', {}, el('small', {}, `Ingen. Plass til ${T.lag} lag – laget må stå innen ${R.ombord} m fra båten.`)));
    for (const s of om) H.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, s.navn)), kn('Sett i land', () => { gåILand(s); }, b.sti || b.kai < 0 ? { disabled: '', title: 'Båten må ligge ved en kai' } : { 'data-sjo': 'iland' })));
    if (!b.sti && om.length < T.lag) for (const s of egne().filter(e => !e.påBåt && !e.ombord && !e.karakter && Math.hypot(e.x - b.x, e.y - b.y) <= R.ombord)) H.append(el('div', { klasse: 'rad' }, el('div', {}, s.navn, ' ', el('small', {}, 'står ved båten')), kn('Ta om bord', () => gåOmBord(s, b), { 'data-sjo': 'ombord' })));
    H.append(el('h3', {}, 'Last og fiske'));
    const h = !b.sti && b.kai >= 0 ? havnVedKai(b.kai) : null, Hh = h && S.havner[h.id];
    if (h) H.append(el('p', {}, `På kaia i ${h.navn}: ${Hh ? SJ.lastTekst(Hh) : 'ingenting ennå'}.`), kn('Last om bord', () => lastOm(b), Hh && SJ.lastVekt(Hh) > 0.05 && SJ.ledig(b) > 0.05 ? { 'data-sjo': 'last' } : { disabled: '' }));
    if (SJ.lastVekt(b.last) > 0.01) H.append(kn('Loss til leiren', () => loss(b), !b.sti && vedLeiren(b.x, b.y) ? { 'data-sjo': 'loss' } : { disabled: '', title: `Båten må ligge innen ${km(R.leirKai)} fra leiren` }));
    if (T.fiske) H.append(kn(b.fisker ? 'Slutt å fiske' : 'Fisk her', () => fisk(b), b.fisker ? { klasse: 'på', 'data-sjo': 'fisk' } : { 'data-sjo': 'fisk' }), el('p', {}, el('small', {}, `Ca. ${String(Math.round(T.fiske * 24)).replace('.', ',')} rasjoner i døgnet. Ingen fangst i storm.`)));
    else if (!h && SJ.lastVekt(b.last) <= 0.01) H.append(el('p', {}, el('small', {}, 'Varer lastes i en havn du holder, og losses ved en kai nær leiren.')));
    H.append(el('h3', {}, 'Sperr leia'));
    H.append(kn(`Legg miner her (${kr(R.minePris)})`, () => miner(b), b.sti ? { disabled: '' } : { 'data-sjo': 'miner' }), kn('Senk båten her', () => { if (confirm(`Senke ${b.navn}? Vraket sperrer leia for godt, og båten er tapt.`)) senk(b); }, b.sti ? { disabled: '' } : {}));
    H.append(el('p', {}, el('small', {}, 'Miner og vrak stenger leia for alle båter, også dine egne. Et smalt sund kan stenges helt.')));
    H.append(kn('← Alle båter og havner', () => { valg = null; modus = null; })); }
  function byggKai(H, i) { const q = kai(i); if (!q) { valg = null; return byggOversikt(H); } const L = leir();
    H.append(el('h2', {}, q.navn), el('p', {}, el('small', {}, `${Kaier.NAVN[q.t] || 'Kai'}${q.l > 0 ? ` · ${q.l} m kai` : ''} · ${q.størrelse} kai${L ? ` · ${km(Math.hypot(q.x - L.x, q.y - L.y))} fra leiren` : ''}`)));
    H.append(el('p', {}, q.størrelse === 'stor' ? 'Stor nok for alle båter, også lekter og ferje.' : q.størrelse === 'middels' ? 'Passer for småbåt, sjark og lekter.' : 'Bare småbåt og sjark kan legge til her.'));
    const her = S.båter.filter(b => !b.sti && Math.hypot(b.x - q.x, b.y - q.y) < 60); if (her.length) { H.append(el('h3', {}, 'Båter som ligger her')); for (const b of her) H.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, b.navn), ' ', el('small', {}, SJ.lastTekst(b.last))), kn('Velg', () => { valg = { båt: b }; }))); }
    const h = havnVedKai(i); if (h) { const Hh = S.havner[h.id]; H.append(el('h3', {}, `Havna i ${h.navn}`), el('p', {}, `Du holder ${h.navn}. Varene samler seg her: ${Hh && SJ.lastVekt(Hh) > 0.05 ? SJ.lastTekst(Hh) : 'ingenting ennå'}. Hent dem med båt – det ingen henter, kjøres landevegen en gang i uka, og da kommer bare halvparten fram.`)); }
    H.append(el('h3', {}, 'Kjøp båt')); const grunn = kjøpGrunn(q);
    if (!grunn) H.append(el('p', {}, el('small', {}, `Du kan kjøpe båt ved kaier innen ${km(R.kjøpLeir)} fra leiren, eller ved et tettsted du holder.`)));
    else { H.append(el('p', {}, el('small', {}, `Du kan kjøpe her (${grunn}).`))); for (const [id, T] of Object.entries(TY)) { if (!T.pris) continue; const ok = SJ.passer(id, q.størrelse); H.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, T.navn), ' ', el('small', {}, kr(T.pris)), el('br'), el('small', {}, ok ? T.tekst : 'Kaia er for liten.')), kn('Kjøp', () => kjøp(id, i), ok ? { 'data-kjop': id } : { disabled: '' }))); } }
    if (ferjeHer(q)) { H.append(el('h3', {}, 'Ferja'), el('p', {}, `Her ligger en ferje. Står et av lagene dine innen ${R.taFerje} m, kan dere ta den.`), kn('Ta ferja', () => taFerje(i), { 'data-sjo': 'ferje' })); }
    H.append(el('p', {}, kn('Vis i kartet', () => gåTil(q.x, q.y)), kn('← Alle båter og havner', () => { valg = null; }))); }
  function byggOversikt(H) { H.append(el('h2', {}, 'Sjøen'));
    if (!K()) H.append(el('p', {}, el('small', {}, 'Kaiene er ikke lastet ennå (eller kartet har ingen).')));
    H.append(el('h3', {}, `Båter (${S.båter.length})`)); if (!S.båter.length) H.append(el('p', {}, 'Du har ingen båter. Trykk på en kai (ankermerket) nær leiren eller i et tettsted du holder, og kjøp en der.'));
    for (const b of S.båter) H.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, b.navn), el('br'), el('small', {}, båtStatus(b) + (omBord(b).length ? ` · ${omBord(b).length} lag om bord` : '') + (SJ.lastVekt(b.last) > 0.01 ? ` · ${SJ.lastTekst(b.last)}` : ''))), kn('Velg', () => { valg = { båt: b }; gåTil(b.x, b.y); }, { 'data-bat': String(b.id) })));
    const Hv = havner(); H.append(el('h3', {}, `Havner du holder (${Hv.length})`)); if (!Hv.length) H.append(el('p', {}, el('small', {}, 'Ingen. Hold et tettsted med en stor kai eller havn, så kommer det tre, betong, stål, diesel og mat hver uke.')));
    for (const h of Hv) { const Hh = S.havner[h.id], q = kai(h.kai); H.append(el('div', { klasse: 'rad' }, el('div', {}, el('b', {}, h.navn), el('br'), el('small', {}, `på kaia: ${Hh && SJ.lastVekt(Hh) > 0.05 ? SJ.lastTekst(Hh) : 'ingenting ennå'}`)), kn('Vis', () => { valg = { kai: h.kai }; gåTil(q.x, q.y); }))); }
    if (S.sperringer.length) { H.append(el('h3', {}, 'Sperringer')); for (const s of S.sperringer) H.append(el('div', { klasse: 'rad' }, el('div', {}, s.type === 'vrak' ? `Vrak${s.navn ? ' (' + s.navn + ')' : ''}` : 'Minefelt', ' ', el('small', {}, `${s.r} m`)), el('div', {}, kn('Vis', () => gåTil(s.x, s.y)), s.type === 'miner' ? kn(`Rydd (${kr(R.ryddPris)})`, () => rydd(s.id)) : ''))); }
    H.append(el('p', {}, el('small', {}, 'Kaiene vises som ankermerker i kartet (☰ → Kaier). Trykk på en kai for å kjøpe båt, eller på en båt for å gi den ordre.'))); }
  function tegnPanel(tving) { if (!åpen) return; sistTegn = performance.now(); if (!tving && window.pekerNede && pekerNede(panel)) return;
    const H = el('div', {}); H.append(el('button', { klasse: 'lukk', 'aria-label': 'Lukk', 'data-lukk': '1' }, '×'));
    if (valg && valg.båt && !S.båter.includes(valg.båt)) valg = null;
    if (valg && valg.båt) byggBåt(H, valg.båt); else if (valg && valg.kai !== undefined) byggKai(H, valg.kai); else byggOversikt(H);
    if (H.innerHTML === sistHtml && !tving) return; sistHtml = H.innerHTML; const rull = panel.scrollTop; panel.replaceChildren(...H.childNodes); panel.scrollTop = rull; const l = panel.querySelector('[data-lukk]'); if (l) l.onclick = () => vis(false); }
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) { if (modus) { modus = null; skitten = true; tegnPanel(true); } else vis(false); } });

  // ---------- inngangene: kommandolinja og Leir-menyen ----------
  (window.KOMMANDO_TILLEGG = window.KOMMANDO_TILLEGG || []).push({ k: 'sjo', navn: 'Sjø', tast: '', tittel: 'Sjøen: båter, havner, fiske og sperringer',
    ikon: '<path d="M3 14h18l-2.5 5h-13z" fill="#000"/><path d="M11 3v10M11 4l6 8h-6" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"/>',
    fins: () => klar && (!!K() || S.båter.length > 0), på: () => åpen, trykk: () => { if (!åpen) valg = valg && valg.båt ? valg : null; vis(); } });
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e2, knapp: k2 }) => { if (!klar || (!K() && !S.båter.length)) return; const Hv = havner();
    hode.appendChild(e2('h3', { 'data-fane': 'lager' }, 'Sjøen'));
    hode.appendChild(e2('div', { klasse: 'igang' }, `${S.båter.length} båt${S.båter.length === 1 ? '' : 'er'}, ${Hv.length} havn${Hv.length === 1 ? '' : 'er'}` + (S.båter.some(b => b.fisker) ? `, ${S.båter.filter(b => b.fisker).length} fisker` : '') + '. Båter frakter lag og varer mellom kaiene, fisker og kan sperre sund.'));
    hode.appendChild(k2('Åpne sjøpanelet', () => { valg = null; vis(true); }, { id: 'sjoknapp' })); });

  window.SjoSpill = Object.assign(ut, { tilstand: () => S, klar: () => klar, start, lagre, vis, erÅpen: () => åpen, trykk, kai: kaiTrykk, velg: b => { valg = b ? { båt: b } : null; tegnPanel(true); }, valgt: () => valg, modus: m => { if (m !== undefined) modus = m; return modus; },
    kjøp, taFerje, ferjeHer: i => { const q = kai(i); return !!q && ferjeHer(q); }, seil, seilTilKai: (b, i, o) => { const q = kai(i); return q ? seil(b, q.x, q.y, i, o) : Promise.resolve({ feil: 'ingen kai' }); }, gåOmBord, gåILand, omBord, lastOm, loss, fisk, miner, senk, rydd, havner, havnFor, kjøpGrunn: i => { const q = kai(i); return q ? kjøpGrunn(q) : null; }, tilLeiren, kaiInfo: kai });
})();
