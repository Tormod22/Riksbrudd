/* Riksbrudd – SJØEN (18. nov, nattarbeid): båter mellom kaiene, havner som gir forsyninger, fiske, landgang, sperring av sund og
 * ferjer som kan tas. Reglene her er uten DOM (Node: require('./sjo')); visningen ligger i sjo-visning.js (window.SjoSpill).
 * ALLE TALLENE ER CLAUDES FORSLAG (ikke brukerens fasit) – de står samlet i REGLER og TYPER.
 */
(function (rot) {
  'use strict';
  // Claudes forslag, alle sammen.
  const REGLER = {
    // kjøp: kaia må ligge så nær leiren (m), eller så nær et tettsted du holder
    kjøpLeir: 3000, kjøpBy: 1500,
    // en kai så nær leiren (m) regnes som leirens kai: der kan båtene losse rett inn i leiren
    leirKai: 3000,
    // laget må stå så nær båten/kaia for å gå om bord (m), og settes så langt inn på land når det går av
    ombord: 250,
    // havn: stor kai i tettstedet eller så nær (m); så ofte hentes resten landevegen (døgn), og så mye kommer fram da
    havnNær: 1500, havnDøgn: 7, landeveg: 0.5, havnTak: 4,
    // forsyninger per uke fra en havn (ganges med 1 / 1,5 / 2 etter folketallet: under 2000, under 10 000, større)
    havnUke: { tre: 20, betong: 10, stål: 6, drivstoff: 800, rasjoner: 60 },
    // hva varene veier i lasterommet (plass per enhet): materialer 1, diesel per liter, rasjoner per stykk
    vekt: { tre: 1, betong: 1, stål: 1, drivstoff: 0.01, rasjoner: 0.05 },
    // fiske: storm (vind over dette, m/s) gir ingenting; fangsten ganges med årstiden
    fiskeStorm: 14, fiskeÅrstid: { vinter: 1.2, vår: 1, sommer: 0.8, høst: 1 },
    // landgang: går laget av innen så mange meter fra et tettsted andre holder, er fienden overrasket så lenge (spillminutter)
    landgangNær: 1500, landgangMin: 30, landgangEgen: 1.25, landgangFiende: 0.6,
    // et lag om bord i en båt er vanskelig å treffe, og skyter dårlig selv
    treffPåBåt: 0.3, skuddFraBåt: 0.4,
    // sperring: minefelt (kroner, radius i meter) og senket båt (radius); rydding av miner koster dette
    minePris: 1500000, mineRadius: 300, vrakRadius: 160, ryddPris: 500000,
    // ferje: laget må stå så nær ferjekaia for å ta ferja (m)
    taFerje: 400,
    // lengste seilas i én ordre (m)
    maksSeilas: 160000,
  };
  // Båttypene (Claudes forslag): pris i kroner, fart i m/s, lag = hvor mange lag som får plass, last = plass i lasterommet,
  // fiske = rasjoner per spilltime, kai = minste kaistørrelse båten kan legge til ved.
  const TYPER = {
    småbåt: { navn: 'Småbåt', pris: 400000, fart: 6, lag: 1, last: 3, fiske: 0.4, kai: 'liten', lengde: 7, tekst: 'Rask og billig. Ett lag, nesten ingen last. Legger til ved alle kaier.' },
    sjark: { navn: 'Sjark', pris: 2000000, fart: 4.5, lag: 1, last: 20, fiske: 1.5, kai: 'liten', lengde: 11, tekst: 'Fiskebåt: best til fiske, tar ett lag og litt last. Legger til ved alle kaier.' },
    lekter: { navn: 'Lekter med slepebåt', pris: 6000000, fart: 3, lag: 3, last: 150, fiske: 0, kai: 'middels', lengde: 30, tekst: 'Treg, men tar tre lag og mye last. Trenger en middels eller stor kai.' },
    ferje: { navn: 'Ferje', pris: 0, fart: 6.5, lag: 4, last: 250, fiske: 0, kai: 'stor', lengde: 70, tekst: 'Kan ikke kjøpes – tas ved en ferjekai. Fire lag og mest last. Trenger en stor kai.' },
  };
  const STØRRELSE = { liten: 0, middels: 1, stor: 2 };
  const VARER = ['tre', 'betong', 'stål', 'drivstoff', 'rasjoner'];
  const VARENAVN = { tre: 'tre', betong: 'betong', stål: 'stål', drivstoff: 'l diesel', rasjoner: 'rasjoner' };
  const tomLast = () => ({ tre: 0, betong: 0, stål: 0, drivstoff: 0, rasjoner: 0 });
  const rund = v => Math.round(v * 10) / 10;

  function ny() { return { versjon: 1, båter: [], neste: 1, sperringer: [], nesteSperring: 1, havner: {}, ferjerTatt: [], sistHavn: null }; }
  // Passer båttypen ved en kai av denne størrelsen ('liten' | 'middels' | 'stor')?
  const passer = (type, størrelse) => !!TYPER[type] && STØRRELSE[størrelse] >= STØRRELSE[TYPER[type].kai];
  function nyBåt(S, type, x, y, kai, navn) { const T = TYPER[type]; if (!T) return null;
    const b = { id: S.neste++, type, navn: navn || `${T.navn} ${S.båter.filter(q => q.type === type).length + 1}`, x, y, kai: kai === undefined ? -1 : kai, sti: null, seg: 0, mål: -1, retning: 0, last: tomLast(), fisker: false, fangst: 0 };
    S.båter.push(b); return b; }
  // Kjøp: betal(kr) svarer true når pengene er trukket.
  function kjøp(S, type, kai, betal) { const T = TYPER[type]; if (!T) return { feil: 'Ukjent båttype.' }; if (!T.pris) return { feil: `${T.navn} kan ikke kjøpes.` };
    if (!passer(type, kai.størrelse)) return { feil: `${T.navn} trenger en ${T.kai === 'stor' ? 'stor' : 'middels eller stor'} kai.` };
    if (!betal(T.pris)) return { feil: 'Ikke nok penger.' };
    return { båt: nyBåt(S, type, kai.x, kai.y, kai.i) }; }

  // ---------- lasten ----------
  const lastVekt = l => VARER.reduce((s, k) => s + (l[k] || 0) * REGLER.vekt[k], 0);
  const ledig = b => Math.max(0, TYPER[b.type].last - lastVekt(b.last));
  const lastTekst = l => { const d = VARER.filter(k => (l[k] || 0) >= 0.05).map(k => `${Math.round(l[k] * 10) / 10} ${VARENAVN[k]}`.replace('.', ',')); return d.length ? d.join(', ') : 'tom'; };
  // Flytt så mye som får plass fra haugen (på kaia) til båten. Gir det som ble lastet.
  function lastOm(b, haug) { const ut = tomLast(); let plass = ledig(b);
    for (const k of VARER) { const har = haug[k] || 0; if (har <= 0 || plass <= 0) continue; const m = Math.min(har, plass / REGLER.vekt[k]); haug[k] = har - m; b.last[k] = (b.last[k] || 0) + m; ut[k] = m; plass -= m * REGLER.vekt[k]; }
    return ut; }
  // Tøm båten: gir lasten og nullstiller.
  function loss(b) { const ut = { ...tomLast(), ...b.last }; b.last = tomLast(); return ut; }

  // ---------- havner ----------
  const havnFaktor = folk => (folk >= 10000 ? 2 : folk >= 2000 ? 1.5 : 1);
  // Varene samler seg på kaia mens du holder tettstedet (jevnt gjennom uka, høyst havnTak uker). havner: [{ id, folk }] du holder.
  function havnSteg(S, havner, dtMin) { const andel = dtMin / (7 * 1440);
    for (const h of havner) { const H = S.havner[h.id] || (S.havner[h.id] = tomLast()), f = havnFaktor(h.folk || 0);
      for (const k of VARER) H[k] = Math.min(REGLER.havnUke[k] * f * REGLER.havnTak, (H[k] || 0) + REGLER.havnUke[k] * f * andel); } }
  // En gang i uka: det som ligger igjen på kaiene, kjøres landevegen til leiren – bare en del kommer fram. Gir det som kom.
  function havnLandeveg(S, ider) { const ut = tomLast(); for (const id of ider) { const H = S.havner[id]; if (!H) continue; for (const k of VARER) { ut[k] += (H[k] || 0) * REGLER.landeveg; H[k] = 0; } } return ut; }

  // ---------- fiske ----------
  // Fangst i rasjoner for dtMin spillminutter. v: { vind (m/s), årstid }.
  function fangst(b, dtMin, v = {}) { const T = TYPER[b.type]; if (!b.fisker || !T.fiske || b.sti) return 0; if ((v.vind || 0) >= REGLER.fiskeStorm) return 0;
    return T.fiske * (REGLER.fiskeÅrstid[v.årstid] || 1) * dtMin / 60; }

  // ---------- sjøkartet og ruta ----------
  // v: vindu fra lagVindu { x0, y0, r, w, h, K } (rute (i, j) dekker x0 + i·r … og y0 − j·r …; K 3 = vann).
  // Gir maske 1 = seilbart. sperringer: [{ x, y, r }] gjør rutene innenfor uframkommelige.
  function sjøkart(v, sperringer) { const n = v.w * v.h, M = new Uint8Array(n); for (let k = 0; k < n; k++) M[k] = v.K[k] === 3 ? 1 : 0;
    for (const s of sperringer || []) { const i0 = Math.max(0, Math.floor((s.x - s.r - v.x0) / v.r)), i1 = Math.min(v.w - 1, Math.floor((s.x + s.r - v.x0) / v.r)), j0 = Math.max(0, Math.floor((v.y0 - s.y - s.r) / v.r)), j1 = Math.min(v.h - 1, Math.floor((v.y0 - s.y + s.r) / v.r));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const cx = v.x0 + (i + .5) * v.r, cy = v.y0 - (j + .5) * v.r; if (Math.hypot(cx - s.x, cy - s.y) <= s.r + v.r * .5) M[j * v.w + i] = 0; } }
    return M; }
  // nærmeste seilbare rute innen maks meter (ring for ring): indeks eller -1
  function nærVann(v, M, x, y, maks) { const ci = Math.floor((x - v.x0) / v.r), cj = Math.floor((v.y0 - y) / v.r), R = Math.ceil(maks / v.r); let best = -1, bd = Infinity;
    for (let q = 0; q <= R; q++) { for (let j = cj - q; j <= cj + q; j++) for (let i = ci - q; i <= ci + q; i++) { if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== q) continue; if (i < 0 || j < 0 || i >= v.w || j >= v.h || !M[j * v.w + i]) continue;
        const d = Math.hypot(i - ci, j - cj); if (d < bd) { bd = d; best = j * v.w + i; } } if (best >= 0 && q >= bd) break; }
    return best >= 0 && bd * v.r <= maks + v.r ? best : -1; }
  // fri sikt over vann mellom to ruter (midtpunktene)
  function friLinje(v, M, a, b) { const ax = a % v.w, ay = (a / v.w) | 0, bx = b % v.w, by = (b / v.w) | 0, n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
    for (let s = 0; s <= n; s++) { const t = s / n, i = Math.round(ax + (bx - ax) * t), j = Math.round(ay + (by - ay) * t); if (!M[j * v.w + i]) return false; } return true; }
  // A* over vannrutene (åtte retninger, ikke på skrå forbi et hjørne; ruter inntil land koster mer, så båten holder litt avstand).
  function astjerne(v, M, start, mål) { const w = v.w, h = v.h, n = w * h, g = new Float32Array(n).fill(Infinity), fra = new Int32Array(n).fill(-1), lukket = new Uint8Array(n);
    const mx = mål % w, my = (mål / w) | 0, H = k => { const dx = Math.abs(k % w - mx), dy = Math.abs(((k / w) | 0) - my); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
    // binær haug med (f, rute)
    let hk = new Int32Array(1024), hf = new Float32Array(1024), hn = 0;
    const inn = (k, f) => { if (hn === hk.length) { const a = new Int32Array(hn * 2), b = new Float32Array(hn * 2); a.set(hk); b.set(hf); hk = a; hf = b; } let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hk[i] = hk[p]; hf[i] = hf[p]; i = p; } hk[i] = k; hf[i] = f; };
    const ut = () => { const topp = hk[0]; hn--; if (hn > 0) { const k = hk[hn], f = hf[hn]; let i = 0; for (;;) { let c = i * 2 + 1; if (c >= hn) break; if (c + 1 < hn && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hk[i] = hk[c]; hf[i] = hf[c]; i = c; } hk[i] = k; hf[i] = f; } return topp; };
    g[start] = 0; inn(start, H(start));
    while (hn > 0) { const k = ut(); if (lukket[k]) continue; lukket[k] = 1; if (k === mål) break; const x = k % w, y = (k / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (!M[q] || lukket[q]) continue;
        if (dx && dy && (!M[y * w + nx] || !M[ny * w + x])) continue;
        const vedLand = (nx > 0 && !M[q - 1]) || (nx < w - 1 && !M[q + 1]) || (ny > 0 && !M[q - w]) || (ny < h - 1 && !M[q + w]);
        const c = g[k] + (dx && dy ? 1.4142 : 1) * (vedLand ? 1.8 : 1); if (c < g[q]) { g[q] = c; fra[q] = k; inn(q, c + H(q)); } } }
    if (!lukket[mål]) return null; const sti = []; for (let k = mål; k >= 0; k = fra[k]) sti.push(k); return sti.reverse(); }
  // Rute over sjøen fra (x0, y0) til (x1, y1). o: { sperringer, snapp (m til nærmeste vann, standard 5 ruter + 150 m) }.
  // Gir { sti: [[x, y], …], meter } eller { feil: 'start' | 'mål' | 'land' | 'sperret' }.
  function rute(v, x0, y0, x1, y1, o = {}) { const snapp = o.snapp || v.r * 5 + 150, M0 = sjøkart(v, null), har = o.sperringer && o.sperringer.length, M = har ? sjøkart(v, o.sperringer) : M0;
    // start og mål finnes i kartet uten sperringer (en båt som ligger i et minefelt, skal kunne komme seg ut)
    let a = nærVann(v, M, x0, y0, snapp), b = nærVann(v, M, x1, y1, snapp); if (a < 0) a = nærVann(v, M0, x0, y0, snapp); if (b < 0) b = nærVann(v, M0, x1, y1, snapp);
    if (a < 0) return { feil: 'start' }; if (b < 0) return { feil: 'mål' };
    if (har) { M[a] = 1; M[b] = M0[b] && !o.sperringer.some(s => Math.hypot(v.x0 + (b % v.w + .5) * v.r - s.x, v.y0 - (((b / v.w) | 0) + .5) * v.r - s.y) <= s.r) ? 1 : M[b]; }
    let R = a === b || friLinje(v, M, a, b) ? [a, b] : astjerne(v, M, a, b);
    if (!R) { if (har && (friLinje(v, M0, a, b) || astjerne(v, M0, a, b))) return { feil: 'sperret' }; return { feil: 'land' }; }
    // rett ut ruta: hopp over punkter når det er fri sikt over vann (ser høyst 200 ruter fram)
    const K = [R[0]]; let i = 0; while (i < R.length - 1) { let j = i + 1; const tak = Math.min(R.length - 1, i + 200); while (j < tak && friLinje(v, M, R[i], R[j + 1])) j++; K.push(R[j]); i = j; }
    const P = K.map(k => [v.x0 + (k % v.w + .5) * v.r, v.y0 - (((k / v.w) | 0) + .5) * v.r]);
    // endene: båtens egen plass og kaia (når de ligger nær ruta)
    P[0] = [x0, y0]; P[P.length - 1] = [x1, y1]; if (P.length === 1) P.push([x1, y1]);
    let meter = 0; for (let q = 1; q < P.length; q++) meter += Math.hypot(P[q][0] - P[q - 1][0], P[q][1] - P[q - 1][1]);
    return { sti: P, meter }; }
  // Hvilket detaljnivå (ZV i lagVindu) og hvor mye kart rundt (m) trengs for en seilas på d meter? Lange turer regnes grovere.
  function nivå(d) { return d <= 15000 ? { zv: 9, pad: Math.max(2000, d * .4) } : d <= 45000 ? { zv: 8, pad: Math.min(15000, d * .35) } : { zv: 7, pad: Math.min(25000, d * .3) }; }

  // ---------- seilasen ----------
  function settRute(b, sti, mål) { b.sti = sti; b.seg = 0; b.mål = mål === undefined ? -1 : mål; b.kai = -1; b.fisker = false; }
  function stopp(b) { b.sti = null; b.seg = 0; b.mål = -1; }
  // Flytt båten dtMin spillminutter langs ruta. Gir 'framme' når den er i mål, ellers null.
  function steg(b, dtMin) { if (!b.sti) return null; let igjen = TYPER[b.type].fart * dtMin * 60;
    while (igjen > 0 && b.sti && b.seg < b.sti.length - 1) { const p = b.sti[b.seg + 1], dx = p[0] - b.x, dy = p[1] - b.y, d = Math.hypot(dx, dy);
      if (d > 1e-6) b.retning = Math.atan2(dx, dy);
      if (d <= igjen) { b.x = p[0]; b.y = p[1]; b.seg++; igjen -= d; } else { b.x += dx / d * igjen; b.y += dy / d * igjen; igjen = 0; } }
    if (b.seg >= b.sti.length - 1) { const mål = b.mål; b.sti = null; b.seg = 0; b.kai = mål; b.mål = -1; return 'framme'; }
    return null; }
  const meterIgjen = b => { if (!b.sti) return 0; let m = Math.hypot(b.sti[b.seg + 1][0] - b.x, b.sti[b.seg + 1][1] - b.y); for (let q = b.seg + 2; q < b.sti.length; q++) m += Math.hypot(b.sti[q][0] - b.sti[q - 1][0], b.sti[q][1] - b.sti[q - 1][1]); return m; };
  const minutterIgjen = b => meterIgjen(b) / TYPER[b.type].fart / 60;

  // ---------- sperringer ----------
  function leggMiner(S, x, y, betal) { if (!betal(REGLER.minePris)) return { feil: 'Ikke nok penger til miner.' }; const s = { id: S.nesteSperring++, type: 'miner', x, y, r: REGLER.mineRadius }; S.sperringer.push(s); return { sperring: s }; }
  // Senk båten der den ligger: båten er borte, vraket sperrer.
  function senk(S, b) { const i = S.båter.indexOf(b); if (i < 0) return { feil: 'Finner ikke båten.' }; S.båter.splice(i, 1); const s = { id: S.nesteSperring++, type: 'vrak', x: b.x, y: b.y, r: REGLER.vrakRadius, navn: b.navn }; S.sperringer.push(s); return { sperring: s }; }
  function rydd(S, id, betal) { const i = S.sperringer.findIndex(s => s.id === id); if (i < 0) return { feil: 'Finner ikke sperringen.' }; if (S.sperringer[i].type === 'vrak') return { feil: 'Et vrak kan ikke ryddes.' }; if (!betal(REGLER.ryddPris)) return { feil: 'Ikke nok penger til å rydde minene.' }; S.sperringer.splice(i, 1); return {}; }
  // Går ruta gjennom en sperring? (for båter som alt er underveis)
  function iSperring(S, x, y) { return S.sperringer.find(s => Math.hypot(s.x - x, s.y - y) <= s.r) || null; }

  // ---------- om bord og landgang ----------
  // lag: { x, y }, båt, antall = lag som alt er om bord. Gir feilteksten eller null.
  function ombordFeil(lag, b, antall) { if (b.sti) return 'Båten er underveis.'; if (antall >= TYPER[b.type].lag) return `${b.navn} er full (${TYPER[b.type].lag} lag).`;
    if (Math.hypot(lag.x - b.x, lag.y - b.y) > REGLER.ombord) return `Laget må stå innen ${REGLER.ombord} m fra båten.`; return null; }
  // Treffaktor når a skyter på b (påBåt = om bord, landgang = spillminuttet overraskelsen varer til).
  function ild(a, b, tid) { let f = 1; if (a.påBåt) f *= REGLER.skuddFraBåt; if (b.påBåt) f *= REGLER.treffPåBåt;
    if (a.landgang && tid < a.landgang) f *= REGLER.landgangEgen; if (b.landgang && tid < b.landgang) f *= REGLER.landgangFiende; return f; }

  // ---------- lagring ----------
  function tilJSON(S) { return { versjon: 1, neste: S.neste, nesteSperring: S.nesteSperring, sistHavn: S.sistHavn, ferjerTatt: S.ferjerTatt.slice(), havner: S.havner, sperringer: S.sperringer.map(s => ({ ...s, x: Math.round(s.x), y: Math.round(s.y) })),
    båter: S.båter.map(b => ({ id: b.id, type: b.type, navn: b.navn, x: Math.round(b.x), y: Math.round(b.y), kai: b.kai, mål: b.mål, retning: +(b.retning || 0).toFixed(2), last: Object.fromEntries(VARER.map(k => [k, rund(b.last[k] || 0)])), fisker: !!b.fisker,
      sti: b.sti ? b.sti.slice(b.seg).map(p => [Math.round(p[0]), Math.round(p[1])]) : null, lag: b.lag || undefined })) }; }
  function fraJSON(d) { const S = ny(); if (!d || d.versjon !== 1) return S; S.neste = d.neste || 1; S.nesteSperring = d.nesteSperring || 1; S.sistHavn = typeof d.sistHavn === 'number' ? d.sistHavn : null; S.ferjerTatt = Array.isArray(d.ferjerTatt) ? d.ferjerTatt.slice() : [];
    S.havner = d.havner && typeof d.havner === 'object' ? d.havner : {}; S.sperringer = (d.sperringer || []).filter(s => s && isFinite(s.x) && isFinite(s.y) && s.r > 0);
    for (const q of d.båter || []) { if (!q || !TYPER[q.type] || !isFinite(q.x) || !isFinite(q.y)) continue; const b = { id: q.id, type: q.type, navn: String(q.navn || TYPER[q.type].navn), x: q.x, y: q.y, kai: typeof q.kai === 'number' ? q.kai : -1, mål: typeof q.mål === 'number' ? q.mål : -1, retning: q.retning || 0, last: { ...tomLast(), ...(q.last || {}) }, fisker: !!q.fisker, fangst: 0, sti: null, seg: 0 };
      if (Array.isArray(q.sti) && q.sti.length > 1) { b.sti = q.sti; b.sti[0] = [b.x, b.y]; } if (Array.isArray(q.lag)) b.lag = q.lag.slice(); S.båter.push(b); S.neste = Math.max(S.neste, b.id + 1); }
    return S; }

  const api = { REGLER, TYPER, VARER, VARENAVN, STØRRELSE, ny, passer, nyBåt, kjøp, tomLast, lastVekt, ledig, lastTekst, lastOm, loss, havnFaktor, havnSteg, havnLandeveg, fangst, sjøkart, nærVann, friLinje, rute, nivå, settRute, stopp, steg, meterIgjen, minutterIgjen, leggMiner, senk, rydd, iSperring, ombordFeil, ild, tilJSON, fraJSON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Sjo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
