/* Riksbrudd – visningene for reglene i spillet.js (16. nov, brukeren: «lag alle 7»): angrep på leiren, marked, oppdrag, kamp når du
 * går selv, hendelser i gjengen (og folk som går rundt i leiren i 3D) og deling av leiren med venner.
 * Alt lagres per leir i localStorage. I de automatiske testene (navigator.webdriver) skjer ingenting av seg selv: SpilletSpill.test = true
 * slår det på. «Ekte tid» er sekunder med spilling (ikke pause, ikke skjult fane) – 1× er sanntid, så ting må også skje uten at klokka spoles.
 */
(function () {
  'use strict';
  const R = window.Spillet; if (!R) return; const { Trussel, Marked, Oppdrag, Kamp, Hendelser, Deling } = R, LB = window.Leir, FR = window.FolkRegler;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null), S = () => window.OppstartSpill && OppstartSpill.tilstand(), L = () => window.LeirSpill && LeirSpill.tilstand(), F = () => window.FolkSpill && FolkSpill.tilstand();
  const api = { test: false }, auto = () => !navigator.webdriver || api.test, kr = v => (LB ? LB.kroner(v) : v + ' kr');
  let leirId = '', klar = false, ekte = 0;
  const les = n => { try { const d = JSON.parse(localStorage.getItem(n) || 'null'); return d && d.leir === leirId ? d.d : null; } catch (e) { return null; } };
  const skriv = (n, d) => { try { localStorage.setItem(n, JSON.stringify({ leir: leirId, d })); } catch (e) { /* fullt eller sperret */ } };
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const meter = d => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m');
  const tidTekst = min => (min >= 1440 ? `${Math.round(min / 144) / 10} døgn`.replace('.', ',') : min >= 60 ? `${Math.round(min / 60)} t` : `${Math.max(1, Math.round(min))} min`);
  async function påLand(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false), [i, j] = Terreng.rute(v, x, y), k = v.K[j * v.w + i]; return k !== 3 && k !== 255 && k !== undefined; } catch (e) { return false; } }
  const deg = () => { const Q = r3(); return Q && Q.fot && Q.ut ? { x: Q.ut.cx + Q.bane.x, y: Q.ut.cy + Q.bane.y } : null; };
  const fiender = () => ENHETER.filter(e => e.side !== 'blå' && levende(e));
  // et kort varsel midt øverst (angrep, oppdrag, hendelser)
  const css = document.createElement('style');
  css.textContent = `#varsel{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 56px); z-index:12; display:none; max-width:min(560px,90vw); padding:8px 16px; background:rgba(40,16,12,.95); border:1px solid #c96a4a; color:#f6dccb; font-size:15px; text-align:center; }
#varsel.på{ display:block; } #varsel.god{ background:rgba(22,30,16,.95); border-color:#8fb86a; color:#e2f0cf; }
#hendelse{ position:fixed; left:50%; transform:translateX(-50%); top:22%; z-index:13; display:none; width:min(460px,92vw); padding:14px 16px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); box-shadow:0 8px 30px rgba(0,0,0,.6); }
#hendelse.på{ display:block; } #hendelse h3{ margin:0 0 6px; font-size:17px; color:#f0d79a; } #hendelse p{ margin:0 0 10px; line-height:1.35; } #hendelse button{ display:block; width:100%; margin-top:6px; min-height:42px; background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); font:inherit; cursor:pointer; text-align:left; padding:6px 12px; } #hendelse button:disabled{ opacity:.45; }
#skytknapp{ position:fixed; right:78px; bottom:calc(128px + env(safe-area-inset-bottom,0px)); z-index:5; display:none; width:72px; height:72px; border-radius:50%; border:2px solid rgba(240,150,110,.8); background:rgba(60,20,12,.55); color:#f6dccb; font:600 15px sans-serif; touch-action:none; } #skytknapp.på{ display:block; }
#leirmeny .oppdrag{ border:1px solid var(--rule,#4a4030); padding:6px 8px; margin:6px 0; } #leirmeny .oppdrag.tatt{ border-color:#c9b26a; } #leirmeny .oppdrag small{ display:block; color:var(--ink-dim,#a99); } #leirmeny .markedrad{ display:flex; justify-content:space-between; gap:8px; padding:2px 0; font-size:14px; } #leirmeny .opp{ color:#e8a46a; } #leirmeny .ned{ color:#9fc46a; }`;
  document.head.appendChild(css);
  const varselEl = el('div', { id: 'varsel', role: 'status' }); document.body.appendChild(varselEl); let varselTil = 0;
  function varsel(t, god) { varselEl.textContent = t; varselEl.classList.toggle('god', !!god); varselEl.classList.add('på'); varselTil = performance.now() + 9000; logg(t); }
  const meny = () => { if (window.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); };

  // ================= ANGREP =================
  let T = null;
  const planlegg = () => { const v = Trussel.vent(T.bølge + 1); T.nesteSpill = tid + v.spill; T.nesteEkte = ekte + v.ekte * 60; };
  async function angrep() { const leir = S().leir, nr = T.bølge + 1, n = Trussel.lag(nr); let s = null;
    for (let k = 0; k < 10 && !s; k++) { const q = Trussel.start(leir, Math.random(), Math.random()); if (await påLand(q.x, q.y)) s = q; } if (!s) { planlegg(); return false; }
    T.bølge = nr; T.aktiv = nr; skriv('riksbrudd-trussel', T);
    for (let i = 0; i < n; i++) { const e = nyttLag(`Røvere ${nr}.${i + 1}`, s.x + (i % 3) * 45, s.y + Math.floor(i / 3) * 45, 'rød'); e.raid = nr; ENHETER.push(e); ordre(e, leir.x + (Math.random() - .5) * 80, leir.y + (Math.random() - .5) * 80, true); }
    varsel(Trussel.varsel(nr, n, s)); skitten = true; meny(); return true; }
  function angrepSteg() { if (!T.aktiv) { if (auto() && (tid >= T.nesteSpill || ekte >= T.nesteEkte)) { T.nesteSpill = T.nesteEkte = Infinity; angrep(); } return; }
    const lag = ENHETER.filter(e => e.raid === T.aktiv);
    if (!lag.some(levende)) { const b = Trussel.belønning(T.aktiv); OppstartSpill.gi(b); const f = F(); if (f) f.moral = Math.min(100, f.moral + 5); varsel(`Angrepet er slått tilbake! Dere tok ${kr(b)} fra røverne.`, true);
      for (const e of lag) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); } T.aktiv = 0; planlegg(); skriv('riksbrudd-trussel', T); meny(); return; }
    // røvere som står stille langt fra leiren, får ordren på nytt
    const leir = S().leir; for (const e of lag) if (levende(e) && !e.sti && !e.planlegger && Math.hypot(e.x - leir.x, e.y - leir.y) > 160 && Math.random() < .03) ordre(e, leir.x + (Math.random() - .5) * 80, leir.y + (Math.random() - .5) * 80, true); }

  // ================= MARKED =================
  let M = null; const GRUNN = LB && FR ? { tre: LB.MATERIALER.tre.pris, betong: LB.MATERIALER.betong.pris, stål: LB.MATERIALER.stål.pris, diesel: LB.DRIVSTOFF.prisPerLiter, mat: FR.R.matPris, salg: LB.REGLER.salg } : null;
  function settPriser() { if (!GRUNN || !M) return; for (const v of ['tre', 'betong', 'stål']) LB.MATERIALER[v].pris = Marked.pris(M, v, GRUNN[v]); LB.DRIVSTOFF.prisPerLiter = Marked.pris(M, 'diesel', GRUNN.diesel); FR.R.matPris = Marked.pris(M, 'mat', GRUNN.mat); LB.REGLER.salg = Marked.SALG; }
  function markedSteg() { if (!auto() || !M) return; const d = Math.floor(tid / 1440); if (d === M.spilldag && ekte - M.ekte < 600) return; M.spilldag = d; M.ekte = ekte; Marked.steg(M, Math.random); settPriser(); skriv('riksbrudd-marked', M); logg(Marked.tekst(M)); meny(); }

  // ================= OPPDRAG =================
  let O = null, lager = false;
  async function fyllOppdrag() { if (lager || !auto()) return; lager = true; try { const leir = S().leir; for (let k = 0; k < 12 && O.liste.length < 3; k++) { const o = Oppdrag.lag(leir, ++O.nr, Math.random, tid); if (await påLand(o.x, o.y)) O.liste.push(o); } skriv('riksbrudd-oppdrag', O); meny(); } finally { lager = false; } }
  function ta(id) { const o = O.liste.find(q => q.id === id); if (!o || o.tatt) return false; o.tatt = true; o.frist = Math.max(o.frist, tid + 2 * 1440);
    if (o.type === 'post') for (let i = 0; i < o.fiender; i++) { const e = nyttLag(`Røverpost ${o.id}${o.fiender > 1 ? '.' + (i + 1) : ''}`, o.x + i * 40, o.y + i * 25, 'rød'); e.post = o.id; ENHETER.push(e); }
    skriv('riksbrudd-oppdrag', O); logg(`Oppdrag tatt: ${Oppdrag.TYPER[o.type].navn.toLowerCase()}, ${meter(o.meter)} mot ${o.retning}.`); skitten = true; meny(); return true; }
  function fullfør(o, plasser) { const g = { ...o.gir }, f = F(), l = L(); let ekstra = '';
    if (g.folk) { let fikk = 0; const n = Oppdrag.medFolk(o, plasser); for (let i = 0; i < n; i++) { const r = f && l && FR ? FR.rekrutter(f, l, () => true) : {}; if (r.person) fikk++; }
      if (fikk < n) { g.penger = (g.penger || 0) + (n - fikk) * 2e5; ekstra = ` ${n - fikk} fikk ikke seng og dro videre (de la igjen litt som takk).`; } if (n < g.folk) ekstra += ` ${g.folk - n} måtte bli igjen – det var ikke plass.`; g.folk = fikk; }
    if (g.penger) OppstartSpill.gi(g.penger); if (g.mat && f) f.mat += g.mat; if (l && LB) { if (g.tre) LB.leggInn(l, 'tre', g.tre); if (g.stål) LB.leggInn(l, 'stål', g.stål); }
    for (const e of ENHETER.filter(q => q.post === o.id)) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); }
    O.liste.splice(O.liste.indexOf(o), 1); O.gjort = (O.gjort || 0) + 1; skriv('riksbrudd-oppdrag', O); if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre();
    varsel(`Oppdrag fullført: ${Oppdrag.TYPER[o.type].navn.toLowerCase()}. Dere fikk ${Oppdrag.belønning(g) || 'ingenting'}.${ekstra}`, true); if (window.MaalSpill) MaalSpill.sjekk(false); skitten = true; fyllOppdrag(); meny(); }
  function oppdragSteg() { if (!O) return; const d = deg(), punkter = ENHETER.filter(e => e.side === 'blå' && levende(e)).map(e => ({ x: e.x, y: e.y }));
    for (const o of [...O.liste]) {
      if (Oppdrag.utløpt(o, tid)) { if (o.tatt) logg(`Oppdraget «${Oppdrag.TYPER[o.type].navn}» gikk ut på tid.`); for (const e of ENHETER.filter(q => q.post === o.id)) ENHETER.splice(ENHETER.indexOf(e), 1); O.liste.splice(O.liste.indexOf(o), 1); skriv('riksbrudd-oppdrag', O); meny(); continue; }
      if (!o.tatt) continue;
      if (o.type === 'post') { if (!ENHETER.some(e => e.post === o.id && levende(e))) fullfør(o); continue; }
      const selv = d && Oppdrag.framme(o, [d]), k = selv && window.KjorSpill && KjorSpill.fører(); if (selv || Oppdrag.framme(o, punkter)) fullfør(o, k ? (k.type === 'heli' ? 6 : 3) : 1); }
    if (O.liste.length < 3) fyllOppdrag(); }

  // ================= KAMP NÅR DU GÅR SELV =================
  // Våpenet og ammunisjonen kommer fra sekken (spill/utstyr.js): K.mag og K.res leser og skriver våpenet du har framme
  const U = () => (window.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill : null), A = () => (U() ? U().aktivt() : { v: reserveV, def: { ...Kamp.VÅPEN, navn: 'Gevær', ammo: 'x', bredde: 1, hagl: 1 }, reserve: reserveV.res }), reserveV = { mag: Kamp.VÅPEN.magasin, res: Kamp.VÅPEN.reserve };
  const K = { hp: Kamp.HELSE.maks, lader: 0, sist: 0, treff: 0, skadd: 0,
    get mag() { return A().v.mag; }, set mag(n) { A().v.mag = Math.max(0, Math.min(A().def.magasin, n)); },
    get res() { return A().reserve; }, set res(n) { if (U()) { U().tilstand().ting[A().def.ammo] = Math.max(0, Math.round(n)); } else reserveV.res = n; } };
  let lydK = null;
  function smell() { try { if (localStorage.getItem('riksbrudd-lyd') === 'av') return; lydK = lydK || new (window.AudioContext || window.webkitAudioContext)(); const n = lydK.sampleRate * .12, b = lydK.createBuffer(1, n, lydK.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = lydK.createBufferSource(), g = lydK.createGain(); g.gain.value = .25; s.buffer = b; s.connect(g).connect(lydK.destination); s.start(); } catch (e) { /* ingen lyd */ } }
  function lad() { const nå = performance.now(), a = A(); if (K.lader > nå || a.v.mag === a.def.magasin || !a.reserve) return; K.lader = nå + a.def.lade * 1000; const v = a.v; setTimeout(() => { if (U()) U().lad(v); else { const t = Math.min(a.def.magasin - v.mag, reserveV.res); v.mag += t; reserveV.res -= t; } }, a.def.lade * 1000); }
  function skyt() { const Q = r3(), d = deg(), nå = performance.now(); if (!Q || !d || (window.KjorSpill && KjorSpill.fører()) || nå < K.lader || nå - K.sist < A().def.takt * 1000) return false; if (!K.mag) { lad(); return false; } const W = A().def;
    K.sist = nå; K.mag--; if (!W.stille) smell(); if (window.EventyrSpill && EventyrSpill.skudd) EventyrSpill.skudd(W); const a = Q.fot.a, fx = -Math.sin(a), fy = Math.cos(a);
    if (typeof SKUDD !== 'undefined') SKUDD.push({ a: { x: d.x, y: d.y, side: 'blå' }, b: { x: d.x + fx * 80, y: d.y + fy * 80, side: 'blå' }, til: nå + 1400 });
    const sikt = (avst, v) => (window.Utstyr && W.rekkevidde ? Utstyr.sikter(W, avst, v) : Kamp.sikter(avst, v)), sj = avst => Math.min(.97, (window.Utstyr ? Utstyr.sjanse(W, avst) : Kamp.sjanse(avst)) * (window.OverlevSpill ? OverlevSpill.treff() : 1) * (window.KarakterSpill ? KarakterSpill.treff() : 1) * (window.EventyrSpill && EventyrSpill.treff ? EventyrSpill.treff() : 1));
    let best = null, bd = Infinity; for (const e of fiender()) { const dx = e.x - d.x, dy = e.y - d.y, avst = Math.hypot(dx, dy), v = Math.atan2(fx * dy - fy * dx, fx * dx + fy * dy); if (sikt(avst, v) && avst < bd) { bd = avst; best = e; } }
    // hvert hagl (ett for de fleste våpen, seks for hagla) kan treffe en mann
    // ferdigheten Skyting vokser når du skyter mot en fiende, mest når du treffer (spill/overlev.js)
    if (best && window.OverlevSpill) OverlevSpill.øk('skyting', 1);
    if (best) for (let h = 0; h < (W.hagl || 1); h++) if (Math.random() < sj(bd)) { const m = best.menn.find(q => q.hp > 0); if (m) { const sk = W.skade * (window.EventyrSpill && EventyrSpill.hodeskudd && EventyrSpill.hodeskudd() ? 2 : 1); m.hp = m.hp - sk < .05 ? 0 : m.hp - sk; if (!m.hp && window.EventyrSpill && EventyrSpill.felt) EventyrSpill.felt(); K.treff = nå; if (window.OverlevSpill) OverlevSpill.øk('skyting', 2); if (!levende(best)) { logg(`${best.navn} er slått ut.`); } skitten = true; } }
    if (!K.mag) lad(); return true; }
  function slåttUt() {
    // et tilfluktssted i nærheten: du våkner der i stedet for i leiren (spill/eventyr-visning.js)
    if (window.EventyrSpill && EventyrSpill.slåttUt && EventyrSpill.slåttUt(K)) return;
    K.hp = 60; K.mag = A().def.magasin; K.res = Math.max(K.res, A().def.magasin * 2); const f = F(); if (f) f.moral = Math.max(0, f.moral - 5); if (window.KjorSpill && KjorSpill.fører()) KjorSpill.ut(true); if (window.Gange) Gange.stopp();
    const Q = r3(), leir = S() && S().leir; if (Q && Q.ut && leir) { Q.bane.x = leir.x - Q.ut.cx; Q.bane.y = leir.y - Q.ut.cy; } varsel('Du ble såret og båret tilbake til leiren. Gjengen mistet litt mot.'); }
  function kampSteg() { const d = deg(); if (!d) { K.hp = Math.min(Kamp.HELSE.maks, K.hp + Kamp.HELSE.hvile * 3); return; } // dekning og sniking (spill/eventyr-visning.js): faktor per fiende – 0 når de ikke har oppdaget deg, mindre når du ligger eller står bak en vegg
    const EV = window.EventyrSpill && EventyrSpill.fiendeFaktor ? EventyrSpill : null;
    const nær = fiender().map(e => ({ avst: Math.hypot(e.x - d.x, e.y - d.y), menn: e.menn.filter(m => m.hp > 0).length * (EV ? EV.fiendeFaktor(d, e) : 1) })).filter(q => q.avst < 300);
    const dek = window.KjorSpill && KjorSpill.fører() ? 'kjøretøy' : window.OverlevSpill && OverlevSpill.iTilflukt() ? 'tilflukt' : window.Interior3d && Interior3d.inne(r3().bane.x, r3().bane.y) ? 'hus' : null, s = Kamp.skade(nær, dek);
    if (s > 0) { K.hp -= s; K.skadd = performance.now(); if (EV && EV.truffet) EV.truffet(s); if (K.hp <= 0) slåttUt(); } else if (!nær.length) K.hp = Math.min(Kamp.HELSE.maks, K.hp + Kamp.HELSE.hvile); }
  const skytKnapp = el('button', { id: 'skytknapp', type: 'button' }, 'Skyt'); document.body.appendChild(skytKnapp); let holder = null;
  skytKnapp.addEventListener('pointerdown', e => { e.preventDefault(); skyt(); holder = setInterval(skyt, 150); });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) skytKnapp.addEventListener(t, () => { clearInterval(holder); holder = null; });
  // PC: venstre museknapp når musa er låst i bildet (første klikk låser musa og skyter ikke)
  window.addEventListener('pointerdown', e => { const c = document.getElementById('c3'); if (e.button === 0 && e.pointerType === 'mouse' && c && document.pointerLockElement === c && deg()) skyt(); }, true);
  window.addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && deg() && !(window.LeirSpill && LeirSpill.plassering())) lad(); });
  KROKER.tegn3d.push(g => { if (!klar || !deg()) return; const nå = performance.now(), x = VW / 2, y = VH - (VW < 900 ? 214 : 70); g.save();
    // helse og ammunisjon nederst, treffmerke i siktet, rød kant når du blir truffet
    if (!window.NarHud) {   // (helse og ammunisjon vises av spill/narhud.js når den er lastet)
    g.fillStyle = 'rgba(20,16,10,.6)'; g.fillRect(x - 81, y - 1, 162, 8); g.fillStyle = K.hp > 40 ? '#9fc46a' : '#e0604a'; g.fillRect(x - 80, y, 160 * Math.max(0, K.hp) / Kamp.HELSE.maks, 6);
    if (!(window.KjorSpill && KjorSpill.fører())) { g.font = '600 13px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#f0e2b0'; const t = nå < K.lader ? 'Lader …' : `${A().def.navn}  ${K.mag} / ${K.res}${VW < 900 ? '' : '  ·  klikk: skyt  ·  R: lad  ·  I: sekk'}`; g.strokeText(t, x, y - 8); g.fillText(t, x, y - 8); }
    }
    if (nå - K.treff < 220) { g.strokeStyle = '#ffd27a'; g.lineWidth = 2; const cx = VW / 2, cy = VH / 2; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(cx + a * 5, cy + b * 5); g.lineTo(cx + a * 11, cy + b * 11); g.stroke(); } }
    if (nå - K.skadd < 900) { const v = (1 - (nå - K.skadd) / 900) * .35; g.strokeStyle = `rgba(224,60,40,${v})`; g.lineWidth = 26; g.strokeRect(0, 0, VW, VH); }
    g.restore(); });

  // ================= HENDELSER I GJENGEN =================
  let H = null; const kort = el('div', { id: 'hendelse', role: 'dialog' }); document.body.appendChild(kort);
  function tilstand() { const f = F(), s = S(); return { folk: f ? f.personer.length : 0, mat: f ? f.mat : 0, penger: s ? s.penger : 0 }; }
  function hendelse() { const f = F(); if (!f || !f.personer.length) return false; const h = Hendelser.velg(Math.random, tilstand(), H.sist); if (!h) return false; const p = f.personer[Math.floor(Math.random() * f.personer.length)];
    H.åpen = { id: h.id, navn: p.navn }; H.sist = h.id; skriv('riksbrudd-hendelser', H); visHendelse(); return true; }
  function visHendelse() { kort.innerHTML = ''; const å = H && H.åpen, h = å && Hendelser.LISTE.find(q => q.id === å.id); if (!h) { kort.classList.remove('på'); return; }
    kort.append(el('h3', {}, 'I leiren'), el('p', {}, h.tekst(å.navn))); const t = tilstand();
    h.valg.forEach((v, i) => { const b = el('button', { type: 'button' }, v.t); b.disabled = !Hendelser.kan(v.v, t); b.onclick = () => velg(i); kort.appendChild(b); }); kort.classList.add('på'); }
  function velg(i) { const å = H.åpen, h = å && Hendelser.LISTE.find(q => q.id === å.id); if (!h) return; const v = h.valg[i].v, f = F(), l = L(); let ut = '';
    if (v.penger < 0) OppstartSpill.betal(-v.penger); else if (v.penger > 0) OppstartSpill.gi(v.penger);
    if (f) { if (v.moral) f.moral = Math.max(0, Math.min(100, f.moral + v.moral)); if (v.mat) f.mat = Math.max(0, f.mat + v.mat);
      const p = f.personer.find(q => q.navn === å.navn); if (v.helse && p) p.helse = Math.max(.1, p.helse + v.helse);
      if (v.folk < 0 && p) { f.personer.splice(f.personer.indexOf(p), 1); ut = ` ${å.navn} har forlatt gjengen.`; }
      if (v.folk > 0) { const r = l && FR ? FR.rekrutter(f, l, () => true) : {}; ut = r.person ? ` ${r.person.navn} er blitt med i gjengen.` : ' Det var ingen ledig seng, så vandreren gikk videre.'; } }
    logg(`${h.tekst(å.navn)} – ${h.valg[i].t.replace(/ \(.*\)$/, '').toLowerCase()}.${ut}`); H.åpen = null; const w = 18 + Math.random() * 10; H.nesteSpill = tid + w * 60; H.nesteEkte = ekte + (14 + Math.random() * 8) * 60; skriv('riksbrudd-hendelser', H);
    if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); visHendelse(); meny(); }
  function hendelseSteg() { if (!H || H.åpen || !auto()) return; if (tid >= H.nesteSpill || ekte >= H.nesteEkte) { H.nesteSpill = H.nesteEkte = Infinity; if (!hendelse()) { H.nesteSpill = tid + 600; H.nesteEkte = ekte + 600; } } }

  // (folkene som figurer i leiren ligger i spill/folk3d.js)

  // ================= VENNER =================
  let V = []; const lesV = () => { try { V = JSON.parse(localStorage.getItem('riksbrudd-venner') || '[]').filter(q => q && q.kode); } catch (e) { V = []; } for (const v of V) v.d = Deling.les(v.kode, t => !!(LB && LB.BYGG[t] && !LB.BYGG[t].linje)); V = V.filter(v => v.d); };
  const skrivV = () => { try { localStorage.setItem('riksbrudd-venner', JSON.stringify(V.map(v => ({ kode: v.kode })))); } catch (e) { /* fullt */ } };
  function leggTilVenn(tekst) { const m = /venn=([A-Za-z0-9_-]+)/.exec(tekst || ''), kode = m ? m[1] : String(tekst || '').trim(), d = Deling.les(kode, t => !!(LB && LB.BYGG[t] && !LB.BYGG[t].linje)); if (!d) return null;
    V = V.filter(v => !(v.d.x === d.x && v.d.y === d.y)); V.unshift({ kode, d }); V = V.slice(0, 8); skrivV(); skitten = true; return d; }
  function minLenke() { const s = S(), l = L(); if (!s || !s.leir || !l) return null; return location.origin + location.pathname + '#venn=' + Deling.kode(s.fraksjon.navn, window.Oppstart ? Oppstart.hovedfarge(s.fraksjon.flagg) : '#8fc2ef', s.leir, l.bygg.filter(b => !LB.BYGG[b.type].linje && !LB.BYGG[b.type].del && LB.ferdig(b))); }
  function vennFraAdressen() { const m = /#venn=([A-Za-z0-9_-]+)/.exec(location.hash || ''); if (!m) return; const d = leggTilVenn(m[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ok */ } if (d) logg(`${d.navn} er lagt til som venn. Leiren deres står i kartet.`); }
  KROKER.tegn.push((g, vx0, vy1) => { if (!V.length) return; const m = kam.m; g.save();
    for (const v of V) { const d = v.d, x = (d.x - vx0) / m, y = (vy1 - d.y) / m; if (x < -200 || y < -200 || x > VW + 200 || y > VH + 200) continue;
      if (m < 3 && LB) for (const b of d.bygg) { const P = LB.hjørner(b); g.beginPath(); P.forEach(([px, py], i) => (i ? g.lineTo((px - vx0) / m, (vy1 - py) / m) : g.moveTo((px - vx0) / m, (vy1 - py) / m))); g.closePath(); g.globalAlpha = .7; g.fillStyle = d.farge; g.fill(); g.globalAlpha = 1; g.strokeStyle = '#efe6cf'; g.lineWidth = 1; g.stroke(); }
      g.fillStyle = d.farge; g.strokeStyle = '#efe6cf'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + 13, y - 11); g.lineTo(x, y - 6); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x, y + 3); g.stroke();
      g.font = '600 14px "Cormorant Garamond", serif'; g.textAlign = 'center'; const t = d.navn + ' (venn)', ty = window.Etikett ? Etikett.tekst(g, t, x, y + 17, 1) : y + 17; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = '#f2ead6'; g.fillText(t, x, ty); }
    g.restore(); });

  // ================= KARTET: oppdragene =================
  KROKER.tegn.push((g, vx0, vy1) => { if (!O || !O.liste.length || kam.m > 40) return; g.save(); g.font = '12px sans-serif'; g.textAlign = 'center';
    for (const o of O.liste) { const x = (o.x - vx0) / kam.m, y = (vy1 - o.y) / kam.m; if (x < -30 || y < -30 || x > VW + 30 || y > VH + 30) continue; const f = o.tatt ? '#f0d79a' : 'rgba(240,215,154,.5)';
      g.fillStyle = 'rgba(22,18,12,.8)'; g.strokeStyle = f; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.fill(); g.stroke();
      if (o.tatt || kam.m < 6) { const t = Oppdrag.TYPER[o.type].navn, ty = window.Etikett ? Etikett.tekst(g, t, x, y + 23, 1) : y + 23; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = f; g.fillText(t, x, ty); } }
    g.restore(); });
  KROKER.tegn3d.push((g, proj3) => { if (!O) return; const d = deg(), Q = r3(); if (!Q || !Q.ut) return; g.save(); g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
    for (const o of O.liste) { if (!o.tatt) continue; const p = proj3(o.x, o.y); if (!p) continue; const a = d ? Math.hypot(o.x - d.x, o.y - d.y) : Math.hypot(o.x - Q.ut.cx - Q.bane.x, o.y - Q.ut.cy - Q.bane.y), t = `◆ ${Oppdrag.TYPER[o.type].navn} ${meter(a)}`;
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, p[0], p[1] - 14); g.fillStyle = '#f0d79a'; g.fillText(t, p[0], p[1] - 14); }
    g.restore(); });

  // ================= LEIR-MENYEN =================
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el: e, knapp }) => { if (!klar) return;
    // markedet (i fanen Lager: overskriften begynner med «Materialer»)
    if (M && GRUNN) { hode.append(e('h3', { 'data-fane': 'lager' }, 'Markedet i dag')); const NAVN = { tre: 'Tre (m³)', betong: 'Betong (m³)', stål: 'Stål (t)', diesel: 'Diesel (liter)', mat: 'Mat (rasjon)' };
      for (const v of Marked.VARER) { const en = Marked.endring(M, v); hode.append(e('div', { klasse: 'markedrad' }, e('span', {}, NAVN[v]), e('span', { klasse: en > 1 ? 'opp' : en < -1 ? 'ned' : '' }, `${kr(Marked.pris(M, v, GRUNN[v]))} ${en > 1 ? '↑' : en < -1 ? '↓' : '→'} ${en > 0 ? '+' : ''}${en} %`))); }
      hode.append(e('small', {}, `Prisene flytter seg hver dag. Du får ${Math.round(Marked.SALG * 100)} % av dagens pris når du selger – kjøp billig og selg dyrt.`)); }
    // oppdrag og trussel står ØVERST i fanen Mål (flyttes foran overskriften «Mål» til slutt), vennene nederst
    const første = hode.childNodes.length; hode.append(e('h3', { 'data-fane': 'mål' }, 'Oppdrag'));
    if (O) { if (!O.liste.length) hode.append(e('small', {}, 'Ingen oppdrag akkurat nå – nye kommer snart.'));
      for (const o of O.liste) { const T = Oppdrag.TYPER[o.type], rad = e('div', { klasse: 'oppdrag' + (o.tatt ? ' tatt' : ''), 'data-ikon': o.type === 'hent' ? 'kasse' : o.type === 'redd' ? 'folk' : 'sikte' }, e('b', {}, T.navn), e('small', {}, `${meter(o.meter)} mot ${o.retning} · gir ${Oppdrag.belønning(o.gir)} · frist om ${tidTekst(o.frist - tid)}`), e('small', {}, T.tekst));
        if (!o.tatt) rad.append(knapp('Ta oppdraget', () => ta(o.id))); rad.append(knapp('Vis i kartet', () => { if (typeof på3d !== 'undefined' && på3d) return logg(`Oppdraget ligger ${meter(o.meter)} mot ${o.retning} for leiren.`); kam.x = o.x; kam.y = o.y; kam.m = Math.min(kam.m, 4); skitten = true; })); hode.append(rad); } }
    if (T) hode.append(e('h3', { 'data-fane': 'mål' }, 'Trusselen'), e('small', {}, T.aktiv ? `Bølge ${T.aktiv} angriper nå: ${ENHETER.filter(q => q.raid === T.aktiv && levende(q)).length} røverlag igjen.` : `${T.bølge} angrep slått tilbake. Røverne kommer tilbake – neste bølge har ${Trussel.lag(T.bølge + 1)} lag. Vakttårn, sandsekker og lag ved leiren hjelper.`));
    { const mine = [...hode.childNodes].slice(første), h = [...hode.querySelectorAll('h3')].find(q => q.textContent === 'Mål'); let topp = h; while (topp && topp.parentNode !== hode) topp = topp.parentNode; if (topp) for (const n of mine) hode.insertBefore(n, topp); }
    hode.append(e('h3', { 'data-fane': 'mål' }, 'Venner'), e('small', {}, 'Del leiren din med en lenke. Vennens leir vises i kartet ditt (ikke direkte samspill ennå).'));
    hode.append(knapp('Kopier lenke til leiren min', () => { const u = minLenke(); if (!u) return; (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => logg('Lenken er kopiert. Send den til en venn.'), () => prompt('Kopier lenken og send den til en venn:', u)); }, { id: 'dellenke' }),
      knapp('Legg til en venn', () => { const t = prompt('Lim inn lenken du fikk fra vennen din:'); if (!t) return; const d = leggTilVenn(t); logg(d ? `${d.navn} er lagt til som venn.` : 'Fant ingen leir i den lenken.'); meny(); }, { id: 'leggtilvenn' }));
    for (const v of V) hode.append(e('div', { klasse: 'oppdrag' }, e('b', {}, v.d.navn), e('small', {}, `${v.d.bygg.length} bygg`), knapp('Vis i kartet', () => { kam.x = v.d.x; kam.y = v.d.y; kam.m = Math.min(kam.m, 1); skitten = true; }), knapp('Fjern', () => { V = V.filter(q => q !== v); skrivV(); skitten = true; meny(); })));
  });

  // ================= START OG TAKT =================
  function start() { const s = S(); if (!s || !s.leir) return; leirId = Math.round(s.leir.x) + ',' + Math.round(s.leir.y); ekte = 0;
    T = les('riksbrudd-trussel') || { bølge: 0, aktiv: 0 }; T.aktiv = 0; T.nesteSpill = tid + 12 * 60; T.nesteEkte = 18 * 60;
    M = les('riksbrudd-marked') || Marked.ny(); M.spilldag = Math.floor(tid / 1440); M.ekte = 0; if (auto()) settPriser();
    O = les('riksbrudd-oppdrag') || { nr: 0, liste: [], gjort: 0 }; for (const o of O.liste) if (o.type === 'post' && o.tatt && !ENHETER.some(e => e.post === o.id)) { for (let i = 0; i < o.fiender; i++) { const e = nyttLag(`Røverpost ${o.id}`, o.x + i * 40, o.y + i * 25, 'rød'); e.post = o.id; ENHETER.push(e); } }
    H = les('riksbrudd-hendelser') || { sist: null, åpen: null }; H.nesteSpill = tid + 8 * 60; H.nesteEkte = 9 * 60; lesV(); vennFraAdressen(); klar = true; visHendelse(); fyllOppdrag(); }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  setInterval(() => { if (performance.now() > varselTil) varselEl.classList.remove('på'); if (!klar || !S() || !S().leir) return; if (tempo > 0 && !document.hidden) ekte++;
    const g = deg(); skytKnapp.classList.toggle('på', !!g && VW < 900 && !(window.KjorSpill && KjorSpill.fører()));
    if (tempo > 0) { angrepSteg(); markedSteg(); oppdragSteg(); hendelseSteg(); kampSteg(); } }, 1000);
  Object.assign(api, { start, angrep, ta, fullfør, skyt, lad, hendelse, velg, leggTilVenn, minLenke, settPriser, markedNå: () => { M.spilldag = -1; const t = api.test; api.test = true; markedSteg(); api.test = t; }, fyllOppdrag,
    T: () => T, M: () => M, O: () => O, K: () => K, H: () => H, V: () => V, klar: () => klar, kampSteg, oppdragSteg, angrepSteg });
  window.SpilletSpill = api;
})();
