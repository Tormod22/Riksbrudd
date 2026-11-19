'use strict';
// MÅLING AV YTELSE (15. nov, brukeren har Intel Iris Xe og meldte 9 bilder i sekundet). Testmaskinen tegner uten grafikkort, så tallene
// derfra sier lite om en ekte maskin. «Mål ytelse» i ☰ (bare i 3D) måler derfor på spillerens egen maskin hva som koster tid i bildet:
// hele bildet, med halv oppløsning (koster punktene på skjermen eller tingene i bildet?), og uten én og én del (bakken, trærne, husene
// og de største av resten, etter hvilken fil i spill/ som la tingen inn i scenen). Tiden er medianen av avstanden mellom bildene, og
// «spillets regning» er tiden spilløkka selv bruker (R3.løkkeTid/tegneTid fra index.html) – resten er grafikkortet.
// Mens det måles (R3.måler): alle bilder tegnes, oppløsningen og grafikknivået står stille. Delene skjules med lag (layers), ikke med
// visible – flere deler styrer visible selv hver ramme. Resultatet vises som tekst som kan kopieres eller tas bilde av.
// SKJERMENS TAK (brukerens første måling viste 16,7 ms på alle radene: skjermen viser høyst 60 bilder i sekundet, så målingen sa
// ingenting): først måles skjermens takt uten å tegne (R3.målGanger = 0). Ligger bildet på takten (erTak), har maskinen kraft til
// overs: da tegnes bildet flere ganger per bilde (2, 4, 8 … til bildet tar minst fire takter – nokTegninger), og tallene deles på
// antallet – «ms per tegning».
// Reglene øverst uten DOM (median, kilde, nettleser, tabell, vurdering) – test: node pipeline/fliser/test_ytelse.js.
(function (rot) {
  const NAVN = { bakke: 'bakken', trær: 'trær og busker', hus: 'husene', smått: 'biler, flagg og gatelys', liv3d: 'veger, trafikk og folk',
    vegetasjon3d: 'blomster, bregner og siv', gard3d: 'gjerder og rundballer', kraft3d: 'kraftledninger', infra3d: 'bruer og ferjekaier',
    bane3d: 'jernbane', gate3d: 'gatemøbler', dyr3d: 'dyr', kyst3d: 'båter, brygger og naust', ferje3d: 'ferjer', natt3d: 'stjerner, måne og nattlys',
    vind3d: 'vind og tåke', 'vaer-visning': 'regn og snø', fjellmark3d: 'fjellmark nær deg', fjern3d: 'fjernterrenget', byhus: 'gatetrær', anlegg3d: 'idrettsanlegg og bensin',
    portal3d: 'tunnelportaler', olje3d: 'oljeplattformer', 'bekker-visning': 'bekker', 'leir-visning': 'leiren', 'byggesett-visning': 'byggesettet',
    'ressurser-visning': 'hogst og ruiner', index: 'gress, soldater og himmel', annet: 'alt det andre' };
  const median = L => { if (!L.length) return 0; const s = [...L].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  // Hvilken fil i spill/ la tingen inn i scenen? Første fil i stakken som ikke er denne; uten treff er det index.html.
  // første spill/-fil i stakken utenom ytelse.js, eller null (kildeNå nedenfor)
  const førsteFil = stakk => { const re = /\/spill\/([\w-]+)\.js/g; let m; while ((m = re.exec(stakk || ''))) if (m[1] !== 'ytelse') return m[1]; return null; };
  function kilde(stakk) { const re = /\/spill\/([\w-]+)\.js/g; let m; while ((m = re.exec(stakk || ''))) if (m[1] !== 'ytelse') return m[1]; return 'index'; }
  function nettleser(ua) {
    ua = ua || ''; const v = re => { const m = re.exec(ua); return m ? m[1] : ''; };
    const navn = /Edg\//.test(ua) ? 'Edge ' + v(/Edg\/(\d+)/) : /OPR\//.test(ua) ? 'Opera ' + v(/OPR\/(\d+)/) : /Firefox\//.test(ua) ? 'Firefox ' + v(/Firefox\/(\d+)/)
      : /Chrome\//.test(ua) ? 'Chrome ' + v(/Chrome\/(\d+)/) : /Safari\//.test(ua) ? 'Safari ' + v(/Version\/(\d+)/) : 'ukjent nettleser';
    const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'ukjent system';
    return navn.trim() + ' på ' + os;
  }
  const des = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
  const hel = n => String(Math.round(n)).replace(/\B(?=(\d{3})+$)/g, ' ');
  // Det de andre målingene sammenlignes med: snittet av hele bildet først og sist (maskinen blir gjerne litt raskere underveis).
  function grunnlag(r) { const alt = r.rader[0], slutt = r.rader.find(x => x.slutt); return alt ? (slutt && slutt.ms > 0 ? (alt.ms + slutt.ms) / 2 : alt.ms) : 0; }
  // Tabellen som tekst. r = { hode: [linjer], rader: [{ navn, ms, tri, kall }], js, tegn } der første rad er hele bildet.
  // «sparer ms» er grunnlaget minus målingen.
  function tabell(r) {
    const alt = r.rader[0], grunn = grunnlag(r), L = [...(r.hode || []), ''], k = (t, n) => String(t).padStart(n);
    if (r.ganger > 1) L.push(`Skjermen viser høyst ${des(1000 / r.skjerm, 0)} bilder i sekundet, og maskinen har kraft til overs. For å måle er bildet`, `tegnet ${r.ganger} ganger per bilde – tallene under gjelder én tegning.`, '');
    L.push('Måling'.padEnd(36) + k(r.ganger > 1 ? 'ms/tegn.' : 'ms/bilde', 9) + k('bilder/s', 10) + k('sparer ms', 11) + k('trekanter', 12) + k('kall', 7));
    r.rader.forEach((x, i) => {
      const spart = i && !x.slutt ? des(grunn - x.ms) : '';
      L.push(x.navn.padEnd(36).slice(0, 36) + k(des(x.ms), 9) + k(x.ms > 0 ? des(1000 / x.ms) : '–', 10) + k(spart, 11) + k(x.tri != null ? hel(x.tri) : '', 12) + k(x.kall != null ? hel(x.kall) : '', 7));
      if (!i) L.push('  av dette spillets regning'.padEnd(36) + k(des(r.js || 0), 9) + '   (three.js: ' + des(r.tegn || 0) + ' ms)');
    });
    return L.join('\n');
  }
  // Kort vurdering i klartekst: prosessoren, punktene på skjermen eller tingene i bildet – og den største enkeltposten.
  function vurdering(r) {
    const alt = r.rader[0], halv = r.rader.find(x => x.halv), deler = r.rader.filter(x => x.del), ut = [], g = grunnlag(r), flere = r.ganger > 1;
    if (!alt || !(g > 0)) return ut;
    // ett helt bilde: med flere tegninger per bilde er g bare tegningen – resten av spillets regning kommer i tillegg
    const helt = flere ? g + Math.max(0, (r.js || 0) - (r.tegn || 0)) : g;
    if (flere) ut.push(`Maskinen lager et bilde på ${des(helt)} ms – nok til ca. ${des(1000 / helt, 0)} bilder i sekundet her, mens skjermen viser ${des(1000 / r.skjerm, 0)}.`);
    if (!flere && g < 18) ut.push('Bildet går så fort skjermen tillater (ca. 60 bilder i sekundet) – målingen sier lite da.');
    else if ((r.js || 0) > .6 * helt) ut.push('Mest tid går i spillets egen regning (prosessoren), ikke i grafikkortet.');
    else if (halv && g - halv.ms > .35 * g) ut.push('Antall punkter på skjermen betyr mest: lavere oppløsning hjelper.');
    else ut.push('Mengden ting i bildet betyr mest (trekanter og tegnekall), ikke oppløsningen.');
    const størst = deler.slice().sort((a, b) => a.ms - b.ms)[0];
    if (størst && g - størst.ms > .08 * g) ut.push('Størst enkeltpost: ' + størst.navn.replace(/^Uten /, '') + ' (' + des(g - størst.ms) + ' ms av ' + des(g) + ').');
    return ut;
  }
  // Skjermens tak: bildet ligger på takten når det tar høyst 15 % mer enn takten (tiden mellom bildene uten tegning).
  const erTak = (takt, ms) => takt > 0 && ms <= 1.15 * takt;
  // Nok tegninger per bilde: bildet tar minst fire takter (da er avrundingen til hele takter høyst en firedel), eller 64 er nådd.
  const nokTegninger = (takt, ganger, rammetid) => rammetid >= 4 * takt || ganger >= 64;
  // HAKK: oppsummering av pausene mellom bildene. pauser = [{ dt (ms), hva: 'bytte' | 'bygging' | 'ellers' }], bilder = antall bilder,
  // sek = hvor lenge det ble målt. Gir linjene til rapporten.
  const HVA = { bytte: 'da et nytt område ble satt inn', bygging: 'mens et nytt område ble bygget', ellers: 'ellers' };
  function hakkTekst(hode, pauser, bilder, sek) {
    const L = [...(hode || []), '', `Bilder: ${hel(bilder)} på ${des(sek, 0)} s (${des(bilder / Math.max(1, sek), 0)} per sekund i snitt)`], P = pauser.slice().sort((a, b) => b.dt - a.dt);
    if (!P.length) { L.push('Ingen pauser over 50 ms – bildet gikk jevnt hele tiden.'); return L.join('\n'); }
    L.push(`Pauser over 50 ms: ${P.length} – den lengste ${des(P[0].dt, 0)} ms (sum ${des(P.reduce((s, p) => s + p.dt, 0), 0)} ms)`);
    for (const k of ['bytte', 'bygging', 'ellers']) { const G = P.filter(p => p.hva === k); if (G.length) L.push(`  ${HVA[k]}: ${G.length} (lengste ${des(G[0].dt, 0)} ms)`); }
    L.push('De lengste: ' + P.slice(0, 10).map(p => `${des(p.dt, 0)} ms (${p.hva})`).join(', '));
    // hvor i koden (p.sted): summert per sted, de tyngste først
    const S = new Map(); for (const p of P) if (p.sted) { const o = S.get(p.sted) || { n: 0, sum: 0, maks: 0 }; o.n++; o.sum += p.dt; o.maks = Math.max(o.maks, p.dt); S.set(p.sted, o); }
    if (S.size) { L.push('Hvor i koden (sum ms, antall, lengste):');
      for (const [k, o] of [...S].sort((a, b) => b[1].sum - a[1].sum).slice(0, 12)) L.push(`  ${des(o.sum, 0)} ms, ${o.n}, ${des(o.maks, 0)} ms: ${k}`); }
    return L.join('\n');
  }
  // stedFraStakk(stakk): «fil:linje» for den som tok pusten – første linje i stakken som ikke er pustefunksjonene selv.
  function stedFraStakk(stakk) {
    for (const l of String(stakk || '').split('\n')) {
      if (/^\s*Error\b/.test(l) || /\b(pusterom|pust|kjørAsynk|iStriper|stedFraStakk)\b\s*[@(]|\bat (async )?(pusterom|pust|kjørAsynk|iStriper)\b/.test(l)) continue;
      const m = /([^\/@( ]*?)(?:\?[^:]*)?:(\d+):\d+\)?\s*$/.exec(l); if (!m) continue;
      const fn = /^\s*at (?:async )?([^\s(]+) \(/.exec(l) || /^([^@]+)@/.exec(l);
      return (m[1] || 'siden') + ':' + m[2] + (fn ? ' ' + fn[1] : '');
    }
    return '?';
  }
  const Ytelse = { NAVN, median, kilde, førsteFil, nettleser, grunnlag, tabell, vurdering, des, hel, erTak, nokTegninger, hakkTekst, stedFraStakk };
  if (typeof module !== 'undefined') { module.exports = Ytelse; return; }
  rot.Ytelse = Ytelse;

  // ---------- i nettleseren ----------
  // Alt som legges i scenen merkes med fila det kom fra (userData.kilde). Kobles på første gang et utsnitt bygges.
  KROKER.bygg3d.push(() => {
    const R = typeof R3 !== 'undefined' && R3; if (!R || !R.scene || R.scene.userData.kildeMerket) return; R.scene.userData.kildeMerket = true;
    const leggTil = R.scene.add;
    R.scene.add = function (...o) { let k = null; for (const m of o) if (m && m.userData && !m.userData.kilde) { if (k == null) k = kildeNå(); m.userData.kilde = k; } return leggTil.apply(this, o); };
  });
  // KILDEN TIL DET SOM LEGGES I SCENEN (18. nov, hakk: en hel stakk per nett – ca. 280 i et bytte i Bergen, 15–20 ms). userData.kilde
  // brukes av «Mål ytelse», av lys3d.js (hvem kaster skygge) og av vaktene, så den må settes hele tiden. Nå leses først en kort stakk
  // (de nærmeste rammene – nesten alt avgjøres der), og hele stakken bare når den korte ikke har noen spill/-fil. Første treff i den
  // korte er første treff i hele, så svaret er det samme; hele stakken får én ramme ekstra for kildeNå selv. Nettlesere uten
  // Error.stackTraceLimit (Safari, Firefox) gir alltid hele stakken, som før.
  function kildeNå() {
    const L = Error.stackTraceLimit, tall = typeof L === 'number';
    if (tall) { let s; try { Error.stackTraceLimit = 5; s = new Error().stack; } finally { Error.stackTraceLimit = L; } const f = førsteFil(s); if (f) return f; }
    let s; try { if (tall) Error.stackTraceLimit = L + 1; s = new Error().stack; } finally { if (tall) Error.stackTraceLimit = L; }
    return kilde(s);
  }
  const tegnes = o => o.isMesh || o.isPoints || o.isLine || o.isSprite;
  function trekanter(o) {
    const g = o.geometry; if (!g || !o.isMesh) return 0;
    const n = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0, r = g.drawRange;
    return Math.min(n, r && r.count !== Infinity ? r.count : n) / 3 * (o.isInstancedMesh ? o.count : 1);
  }
  // Tingene i scenen i grupper: bakken, trærne, husene, småtingene, og resten etter kilden (de største for seg, de andre samlet)
  function samle(R, maks) {
    const trær = new Set([...(R.treMesh || []), ...(R.treLOD || []).flatMap(l => [l.nær, l.fjern])]), hus = new Set(R.husMesh || []), små = new Set(R.småMesh || []), G = new Map();
    const legg = (n, o) => { let g = G.get(n); if (!g) G.set(n, g = { navn: n, ting: [], tri: 0 }); g.ting.push(o); g.tri += trekanter(o); };
    R.scene.traverse(o => {
      if (!tegnes(o) || o.layers.mask !== 1) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      let k = null; for (let p = o; p && !k; p = p.parent) k = p.userData && p.userData.kilde;
      legg(o === R.mesh ? 'bakke' : trær.has(o) ? 'trær' : hus.has(o) ? 'hus' : små.has(o) ? 'smått' : k || 'index', o);
    });
    const faste = ['bakke', 'trær', 'hus'].map(n => G.get(n)).filter(Boolean), andre = [...G.values()].filter(g => !faste.includes(g)).sort((a, b) => b.tri - a.tri);
    const ut = [...faste, ...andre.slice(0, maks)], rest = andre.slice(maks);
    if (rest.length) ut.push({ navn: 'annet', ting: rest.flatMap(g => g.ting), tri: rest.reduce((s, g) => s + g.tri, 0) });
    return ut;
  }
  let boks = null, pre = null, knapp = null, sist = null;
  function lagBoks() {
    if (boks) return;
    const css = document.createElement('style');
    css.textContent = `#ytelse{ position:fixed; inset:0; z-index:9; display:none; align-items:center; justify-content:center; background:rgba(10,8,5,.55); padding:12px; }
#ytelse.på{ display:flex; }
#ytelse .ark{ background:var(--panel); border:1px solid var(--rule); max-width:860px; width:100%; max-height:88vh; overflow:auto; padding:12px 16px; color:var(--ink); }
#ytelse pre{ margin:8px 0; font:12px/1.35 ui-monospace,Consolas,Menlo,monospace; white-space:pre; overflow-x:auto; }
#ytelse p{ margin:4px 0; font-size:15px; }
#ytelse button{ margin-right:8px; min-height:36px; padding:0 14px; }`;
    document.head.appendChild(css);
    boks = document.createElement('div'); boks.id = 'ytelse'; boks.setAttribute('role', 'dialog'); boks.setAttribute('aria-label', 'Måling av ytelse');
    const ark = document.createElement('div'); ark.className = 'ark'; const p = document.createElement('p'); p.id = 'ytelseTekst';
    pre = document.createElement('pre'); const kop = document.createElement('button'), lukk = document.createElement('button');
    kop.textContent = 'Kopier teksten'; lukk.textContent = 'Lukk'; lukk.id = 'ytelseLukk';
    kop.onclick = async () => { try { await navigator.clipboard.writeText(pre.textContent); kop.textContent = 'Kopiert'; } catch (e) { const s = getSelection(), r = document.createRange(); r.selectNodeContents(pre); s.removeAllRanges(); s.addRange(r); kop.textContent = 'Merket – trykk Ctrl+C'; } };
    lukk.onclick = () => boks.classList.remove('på');
    ark.append(p, pre, kop, lukk); boks.appendChild(ark); document.body.appendChild(boks);
  }
  const vis = (overskrift, tekst) => { lagBoks(); document.getElementById('ytelseTekst').textContent = overskrift; pre.textContent = tekst; boks.classList.add('på'); };

  // Selve målingen. valg: { rammer, vent, kilder, tak (ms per måling) } – testene bruker få rammer.
  async function mål(valg) {
    const R = typeof R3 !== 'undefined' && R3, v = Object.assign({ rammer: 20, vent: 5, kilder: 7, tak: 9000 }, valg || {});
    if (!R || !på3d || !R.ut || R.bygger || R.måler) return null;
    const ramme = () => new Promise(r => requestAnimationFrame(r)), skala0 = R.skala, snitt0 = R.rammeSnitt, skjult = [];
    const skjul = (L, av) => { for (const o of L) o.traverse(c => { c.layers.set(av ? 1 : 0); }); if (av) skjult.push(L); };
    R.måler = true;
    try {
      let ganger = 1;
      // én måling: medianen av tiden mellom bildene, delt på antall tegninger per bilde (ganger)
      const ett = async (antall = v.rammer) => {
        for (let i = 0; i < v.vent; i++) await ramme();
        const dt = [], js = [], tg = []; let t = await ramme(); const t0 = performance.now();
        for (let i = 0; i < antall && (i < 2 || performance.now() - t0 < v.tak); i++) { const n = await ramme(); dt.push(n - t); t = n; js.push(R.løkkeTid || 0); tg.push(R.tegneTid || 0); }
        const inf = R.renderer.info.render, tegn = median(tg) / ganger;
        return { ms: median(dt) / ganger, js: Math.max(0, median(js) - median(tg)) + tegn, tegn, tri: inf.triangles, kall: inf.calls };
      };
      const grupper = samle(R, v.kilder), antall = grupper.length + 5; let nr = 0;
      const steg = t => { nr++; if (knapp) knapp.textContent = `Måler ${nr} av ${antall} …`; if (!v.stille) vis(`Måler ${nr} av ${antall}: ${t} – la musa ligge i ro.`, ''); };
      // første måling er alltid treg (programmer og teksturer tas i bruk): en runde som ikke teller
      steg('varmer opp'); await ett();
      // skjermens takt: tiden mellom bildene når ingenting tegnes (v.takt: testene kan oppgi den)
      steg('skjermens takt'); R.målGanger = 0; const skjerm = v.takt || (await ett(Math.min(10, v.rammer))).ms; R.målGanger = null;
      steg('hele bildet'); let alt = await ett();
      if (v.flere !== false && erTak(skjerm, alt.ms)) { let m = alt;
        while (!nokTegninger(skjerm, ganger, m.ms * ganger)) { ganger *= 2; R.målGanger = ganger; m = await ett(Math.min(8, v.rammer)); }
        if (ganger > 1) alt = await ett(); }
      const rader = [{ navn: 'Hele bildet', ms: alt.ms, tri: alt.tri, kall: alt.kall }];
      steg('halv oppløsning'); R.målPr = .5; const halv = await ett(); R.målPr = null; rader.push({ navn: 'Med halv oppløsning', ms: halv.ms, halv: true });
      for (const g of grupper) {
        const navn = NAVN[g.navn] || g.navn; steg('uten ' + navn);
        skjul(g.ting, true); const m = await ett(); skjul(g.ting, false);
        rader.push({ navn: 'Uten ' + navn, ms: m.ms, tri: Math.max(0, alt.tri - m.tri), kall: Math.max(0, alt.kall - m.kall), del: g.navn });
      }
      steg('hele bildet igjen'); const slutt = await ett(); rader.push({ navn: 'Hele bildet (til slutt)', ms: slutt.ms, slutt: true });
      const gl = R.renderer.getContext(), c = R.renderer.domElement, kp = R.cam.position, u = R.ut;
      const over = typeof hoyde3d === 'function' ? kp.z - (hoyde3d(u.cx + kp.x, u.cy + kp.y) - u.h0) * R.EX : kp.z, vær = (document.getElementById('sVaer') || {}).textContent || '';
      const K = window.KVAL, hode = ['RIKSBRUDD – MÅLING AV YTELSE',
        'Grafikkort: ' + (K && K.kort != null && window.Kvalitet ? Kvalitet.kortNavn(K.kort) : 'ukjent'),
        `Nettleser: ${nettleser(navigator.userAgent)} – skjerm ${screen.width} × ${screen.height}, forstørrelse ${des(window.devicePixelRatio || 1, 2)}`,
        `Bilde: ${c.width} × ${c.height} punkter, kantutjevning ${gl.getParameter(gl.SAMPLES) || 0}×, grafikk ${K ? (K.valg === 'auto' ? 'auto (' + K.nivå + ')' : K.nivå) : '?'}, oppløsning ${Math.round((skala0 || 1) * 100)} %`,
        `Sted: ${Math.round(u.cx + kp.x)} ${Math.round(u.cy + kp.y)}, kamera ${Math.round(over)} m over bakken${R.fot ? ' (går)' : ''}, utsnitt ${des(2 * u.S / 1000)} km${vær ? ', ' + vær.trim() : ''}`];
      const r = { hode, rader, js: alt.js, tegn: alt.tegn, ganger, skjerm }; r.vurdering = vurdering(r); r.tekst = tabell(r) + (r.vurdering.length ? '\n\n' + r.vurdering.join('\n') : '');
      sist = r; if (!v.stille) vis('Ferdig. Kopier teksten eller ta et skjermbilde, og send det.', r.tekst);
      return r;
    } finally {
      for (const L of skjult) for (const o of L) o.traverse(c => { c.layers.set(0); });
      R.målPr = null; R.målGanger = null; R.måler = false; R.skala = skala0; R.rammeSnitt = snitt0; R.skalaVed = performance.now();
      if (knapp) knapp.textContent = 'Mål ytelse';
    }
  }
  knapp = document.createElement('button'); knapp.id = 'vis-ytelse'; knapp.textContent = 'Mål ytelse'; knapp.title = 'Måler hva som koster tid i 3D-bildet på denne maskinen (ca. et halvt minutt)';
  knapp.onclick = async () => {
    if (typeof på3d === 'undefined' || !på3d || !R3 || !R3.ut) { vis('Åpne 3D først (knappen «3D»), gå dit det hakker, og trykk «Mål ytelse» igjen.', ''); return; }
    if (R3.bygger) { vis('3D bygges ennå – vent til bildet er ferdig og trykk «Mål ytelse» igjen.', ''); return; }
    try { await mål(); } catch (e) { vis('Målingen stoppet: ' + (e && e.message || e), ''); }
  };
  // MÅLING AV HAKK (15. nov): pausene mellom bildene mens spilleren flyr rundt som vanlig. Forteller om bildet stopper opp når et
  // nytt område bygges eller settes inn (R3.bygger, R3.settNr) – også det grafikkortet bruker tid på, som ikke kan måles på testmaskinen.
  let hakkKnapp = null;
  async function målHakk(valg) {
    const R = typeof R3 !== 'undefined' && R3, v = Object.assign({ sek: 20 }, valg || {});
    if (!R || !på3d || !R.ut || R.måler) return null;
    R.måler = true; const pauser = [], t0 = performance.now(); let sistT = t0, bilder = 0, sett0 = R.settNr || 0, bygget = !!R.bygger, pust0 = R.pustNr || 0;
    try {
      while (performance.now() - t0 < v.sek * 1000) {
        await new Promise(r => requestAnimationFrame(r)); const nå = performance.now(), dt = nå - sistT; sistT = nå; bilder++;
        if (dt > 50) pauser.push({ dt, ved: (nå - t0) / 1000, hva: (R.settNr || 0) !== sett0 ? 'bytte' : bygget || R.bygger ? 'bygging' : 'ellers',
          sted: (R.pustNr || 0) !== pust0 ? (R.pustFør || '?') + ' → ' + (R.pustSted || '?') : (bygget || R.bygger ? 'uten pust' + (R.steg ? ' (' + R.steg + ')' : '') : '') });
        sett0 = R.settNr || 0; bygget = !!R.bygger; pust0 = R.pustNr || 0;
        if (hakkKnapp) hakkKnapp.textContent = `Måler hakk … ${Math.max(0, Math.ceil(v.sek - (nå - t0) / 1000))} s`;
      }
      const gl = R.renderer.getContext(), c = R.renderer.domElement, K = window.KVAL;
      const hode = [`RIKSBRUDD – MÅLING AV HAKK (${des(v.sek, 0)} s)`, 'Grafikkort: ' + (K && K.kort != null && window.Kvalitet ? Kvalitet.kortNavn(K.kort) : 'ukjent'),
        `Nettleser: ${nettleser(navigator.userAgent)} – bilde ${c.width} × ${c.height} punkter, kantutjevning ${gl.getParameter(gl.SAMPLES) || 0}×, grafikk ${K ? (K.valg === 'auto' ? 'auto (' + K.nivå + ')' : K.nivå) : '?'}`,
        `Sted: ${Math.round(R.ut.cx + R.cam.position.x)} ${Math.round(R.ut.cy + R.cam.position.y)}${R.fot ? ' (går)' : ''}, utsnitt ${des(2 * R.ut.S / 1000)} km`];
      const r = { pauser, bilder, sek: (performance.now() - t0) / 1000, tekst: hakkTekst(hode, pauser, bilder, (performance.now() - t0) / 1000) };
      sist = r; if (!v.stille) vis('Ferdig. Kopier teksten eller ta et skjermbilde, og send det.', r.tekst);
      return r;
    } finally { R.måler = false; if (hakkKnapp) hakkKnapp.textContent = 'Mål hakk'; }
  }
  hakkKnapp = document.createElement('button'); hakkKnapp.id = 'vis-hakk'; hakkKnapp.textContent = 'Mål hakk'; hakkKnapp.title = 'Måler i 20 sekunder om bildet stopper opp mens du flyr rundt – fly langt nok til at nye områder lastes';
  hakkKnapp.onclick = async () => {
    if (typeof på3d === 'undefined' || !på3d || !R3 || !R3.ut) { vis('Åpne 3D først (knappen «3D») og trykk «Mål hakk» igjen.', ''); return; }
    if (typeof logg === 'function') logg('Måler hakk i 20 sekunder – fly rundt som vanlig, gjerne langt.');
    try { await målHakk(); } catch (e) { vis('Målingen stoppet: ' + (e && e.message || e), ''); }
  };
  const lm = document.getElementById('lagmeny'); if (lm) { lm.appendChild(knapp); lm.appendChild(hakkKnapp); }
  Ytelse.målHakk = målHakk; Ytelse.mål = mål; Ytelse.samle = samle; Ytelse.siste = () => sist; Ytelse.lukk = () => { if (boks) boks.classList.remove('på'); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
