/* HUSENDRING – rive og åpne husene i kartet, del for del (fase B3 i docs/plan-selskap-okonomi.md, kapittel 5.4; 28. nov).
 * Reglene her er uten DOM (Node: require('./husendring'); nettleser: window.HusEndringRegler). Visningen: spill/husendring-visning.js.
 * Byggemodellen og endringene er spill/bygning.js (Bygning.endre / vurder / medEndringer) – her bare det spillet trenger rundt dem:
 *  - handlinger(m, n, valg): det spilleren kan gjøre med en vegg, et rom eller en etasje i plantegningen, med hva det gir, koster og tar
 *    (vurdert på en kopi: «byggelaget sier fra» før noe rives) og en advarsel når noe raser.
 *  - prøv(m, endringer): flere endringer etter hverandre (f.eks. bjelke først, så riv veggen) på en kopi.
 *  - rasAreal / rasTekst: hvor mye som raser («Uten bjelke raser dekket over (ca. 24 m²).»).
 *  - stål(m, d): stålet en bjelke, en søyle eller bjelken over en ny åpning trenger (tas fra leirens lager når arbeidet bestilles).
 *  - etasjerOvenfra / andelIgjen / rivSteg: «Riv hele huset» etasje for etasje ovenfra (og kan stoppes).
 *  - skade(...): den som står under når noe raser, kan bli skadet (enkelt, fast per jobb).
 * Åpent spørsmål 11 i planen (ekte ras eller bare advarsel): planens forslag – ekte ras, men byggelaget advarer først.
 * Alle tallene her er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const B = rot.Bygning || (typeof require === 'function' ? require('./bygning.js') : null);
  const REGLER = {
    // stål (tonn): en bjelke langs en vegg per meter (stålbjelke HEB 200 ≈ 60 kg/m, med feste), minst; en søyle; bjelken over en ny åpning
    // i en bærende vegg per meter (åpningen + 0,3 m opplegg i hver ende)
    bjelke: { stålPerM: .06, min: .12 }, søyle: { stål: .08 }, overligger: { stålPerM: .05, opplegg: .3 },
    // tette en åpning med bord på begge sider: m³ tre per m² (mer enn plankene i en barrikade), og minst
    tett: { perM2: .07, min: .1 },
    // bredden på nye åpninger (m)
    nyBredde: { dør: .9, vindu: 1.2, port: 2.4 },
    // ras: den som står under, mister helse etter hvor mye som raser (andel av full helse per m²), minst og høyst; ingen skade under 2 m²
    skade: { perM2: .012, min: .12, maks: .6, rasMin: 2 },
    // riving i hånda skjer i spillets tempo; det du selv gjør (tette) tar så mange spillminutter
    selv: { tett: 10 },
  };
  const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
  const står = d => !!d && d.tilstand !== 'revet' && d.tilstand !== 'ødelagt' && d.tilstand !== 'rast';
  const finnEt = (m, n) => m.etasjer.find(e => e.n === n) || null;
  const veggL = w => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  const legg = (M, mat) => { for (const [k, v] of Object.entries(mat || {})) M[k] = r3((M[k] || 0) + v); return M; };
  function inni(P, x, y) { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; }

  // ---------- ras ----------
  // m² som raser: dekkefeltene (rommets areal) og takfeltene; vegger og møbler følger med og telles ikke
  function rasAreal(m, ras) {
    let dekke = 0, tak = 0;
    for (const r of ras || []) {
      if (r.del === 'tak') { const f = m.tak.felt[r.id]; if (f) tak += (f.u1 - f.u0) * (m.akse.v1 - m.akse.v0); }
      else if (r.del === 'dekke') { const e = finnEt(m, r.e), f = e && e.dekke.felt[r.id], ro = f && e.rom[f.rom]; if (ro) dekke += ro.areal; }
    }
    return { dekke: Math.round(dekke), tak: Math.round(tak), sum: Math.round(dekke + tak) };
  }
  // «Dette er en bærende vegg. Uten bjelke raser dekket over (ca. 24 m²).»
  function rasTekst(m, ras, bærende) {
    const A = rasAreal(m, ras); if (!A.sum && !(ras || []).length) return '';
    const hva = A.dekke && A.tak ? 'dekket og taket over' : A.tak ? 'taket over' : A.dekke ? 'dekket over' : 'noe over';
    return (bærende ? 'Dette er en bærende vegg. Uten bjelke raser ' : 'Da raser ') + hva + (A.sum ? ` (ca. ${A.sum} m²)` : '') + '.';
  }

  // ---------- stål ----------
  function stål(m, d) {
    if (!d) return 0;
    if (d.del === 'bjelke' && d.gjør === 'ny') { const e = finnEt(m, d.e), w = e && e.vegger[d.vegg]; return w ? r2(Math.max(REGLER.bjelke.min, veggL(w) * REGLER.bjelke.stålPerM)) : 0; }
    if (d.del === 'søyle' && d.gjør === 'ny') return REGLER.søyle.stål;
    if (d.del === 'åpning' && d.gjør === 'ny' && d.bjelke) return r2(((d.b || REGLER.nyBredde[d.type || 'dør']) + 2 * REGLER.overligger.opplegg) * REGLER.overligger.stålPerM);
    return 0;
  }
  // tre til å tette en åpning (m³)
  const tettTre = o => r2(Math.max(REGLER.tett.min, o.b * o.h * REGLER.tett.perM2));

  // ---------- flere endringer etter hverandre, på en kopi ----------
  // Gir { ok, feil, mat { tre, betong, stål, glass }, timer, ras [...], rasM2, stål (det som trengs fra lageret), svar [...] }
  function prøv(m, endringer) {
    const k = B.kopi(m), ut = { ok: true, mat: {}, timer: 0, ras: [], stål: 0, svar: [] };
    for (const d of endringer) {
      ut.stål = r2(ut.stål + stål(k, d));
      const s = B.endre(k, d); ut.svar.push(s);
      if (!s.ok) { ut.ok = false; ut.feil = s.feil; break; }
      legg(ut.mat, s.materialer); ut.timer = r2(ut.timer + (s.timer || 0)); ut.ras.push(...s.ras);
    }
    const A = rasAreal(k, ut.ras); ut.rasM2 = A.sum; ut.rasDel = A;
    // møbler som tas med når et gulv rives, er ikke ras; ras er dekke, tak og vegger som faller
    ut.raser = ut.ras.some(r => r.del === 'dekke' || r.del === 'tak' || r.del === 'vegg');
    return ut;
  }

  // ---------- det som kan velges i plantegningen ----------
  // nærmeste vegg som står (Plantegning.figur-vegger med a, b) til (x, y) innen maks meter; gir { w, t (m fra a), d }
  function veggVed(m, n, x, y, maks) {
    const e = finnEt(m, n); if (!e) return null; let best = null;
    for (const w of e.vegger) { if (!står(w)) continue; const L = veggL(w); if (L < .3) continue;
      const ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, t = Math.max(0, Math.min(L, (x - w.a[0]) * ux + (y - w.a[1]) * uy));
      const d = Math.hypot(w.a[0] + ux * t - x, w.a[1] + uy * t - y) - (w.tykk || .15) / 2;
      if (d <= maks && (!best || d < best.d)) best = { w, t: r2(t), d }; }
    return best;
  }
  function romVed(m, n, x, y) { const e = finnEt(m, n); if (!e) return null; for (const r of e.rom) if (inni(r.P, x, y)) return r; return null; }
  // takfeltet over (x, y): feltene er 4 m-strimler langs mønet (u = posisjonen langs akse u)
  function takFelt(m, x, y) { const A = m.akse, u = x * A.ux + y * A.uy; return m.tak.felt.find(f => u >= f.u0 && u < f.u1) || null; }
  // etasjene som står, ovenfra (loftet først; kjelleren rives ikke ovenfra)
  const etasjerOvenfra = m => m.etasjer.filter(e => e.tilstand !== 'revet' && !e.kjeller).map(e => e.n).reverse();
  const alleEtasjer = m => m.etasjer.filter(e => !e.kjeller).length;
  // andel av huset som står igjen (etasjer; loftet teller halvt) – «Riv hele huset» gir bare det som står igjen
  function andelIgjen(m) {
    const vekt = e => (e.loft ? .5 : 1), alle = m.etasjer.filter(e => !e.kjeller), sum = alle.reduce((s, e) => s + vekt(e), 0);
    return sum ? r2(alle.filter(e => e.tilstand !== 'revet').reduce((s, e) => s + vekt(e), 0) / sum) : 1;
  }
  // «Riv hele huset»: hvor mange av etasjene (lista ovenfra da jobben startet) som er revet ved framdriften fram (0–1).
  // Den nederste står til jobben er ferdig – da er huset borte (ruin, som før).
  const rivSteg = (liste, fram) => Math.max(0, Math.min(liste.length - 1, Math.floor(fram * liste.length + 1e-9)));

  // Handlingene for et valg: valg = { del: 'vegg', id, t } | { del: 'rom', id, x, y } | { del: 'etasje' }.
  // Hver handling: { k, tekst, endringer, ok, feil, mat, timer, raser, rasM2, advarsel, stål, selv?, alternativ? }
  function handlinger(m, n, valg) {
    const e = finnEt(m, n), ut = []; if (!e || e.tilstand === 'revet' || !valg) return ut;
    const med = (k, tekst, endringer, ekstra) => { const p = prøv(m, endringer); ut.push(Object.assign({ k, tekst, endringer, ok: p.ok, feil: p.feil, mat: p.mat, timer: p.timer, raser: p.raser, rasM2: p.rasM2, ras: p.ras, stål: p.stål }, ekstra || {})); return ut[ut.length - 1]; };
    if (valg.del === 'vegg') {
      const w = e.vegger[valg.id]; if (!w || !står(w)) return ut;
      const harBjelke = (e.bjelker || []).some(b => står(b) && b.vegg === w.id), L = veggL(w);
      const riv = med('riv', w.bærende ? 'Riv den bærende veggen' : 'Riv veggen', [{ e: n, del: 'vegg', id: w.id, gjør: 'riv' }]);
      if (riv.raser) riv.advarsel = rasTekst(m, riv.ras, w.bærende && !harBjelke);
      if (w.bærende && !harBjelke) {
        med('bjelke', 'Sett inn bjelke', [{ e: n, del: 'bjelke', id: w.id, gjør: 'ny', vegg: w.id }]);
        if (riv.raser) med('bjelkeRiv', 'Sett inn bjelke og riv', [{ e: n, del: 'bjelke', id: w.id, gjør: 'ny', vegg: w.id }, { e: n, del: 'vegg', id: w.id, gjør: 'riv' }]);
      }
      // ny dør og nytt vindu der du trykket (flyttes inn fra hjørnet om det trengs)
      for (const type of w.type === 'skille' ? ['dør'] : ['dør', 'vindu']) {
        const b = REGLER.nyBredde[type]; if (L < b + .8) continue; const t0 = valg.t === undefined ? L / 2 : valg.t, klem = t => r2(Math.max(b / 2 + .35, Math.min(L - b / 2 - .35, t)));
        const lag = t => { const d = { e: n, del: 'åpning', id: w.id, gjør: 'ny', vegg: w.id, t, b, type }; if (w.bærende) d.bjelke = true; return d; };
        // der du trykket, eller så nær som mulig ved siden av en åpning som står der (høyst 3 m unna)
        let d = lag(klem(t0)); for (const dt of [.5, -.5, 1, -1, 1.5, -1.5, 2, -2, 3, -3]) { if (B.vurder(m, d).ok) break; d = lag(klem(t0 + dt)); }
        med(type, (type === 'dør' ? 'Lag en dør her' : 'Lag et vindu her') + (w.bærende ? ' (med bjelke over)' : ''), [d]);
      }
    } else if (valg.del === 'rom') {
      const r = e.rom[valg.id]; if (!r) return ut;
      const k = m.etasjer.indexOf(e), f = e.dekke.felt.find(q => q.rom === r.id);
      // gulvet (dekket under rommet) – bare over en annen etasje
      if (k > 0 && f && (f.tilstand === 'hel' || f.tilstand === 'skadet')) med('gulv', 'Riv gulvet her', [{ e: n, del: 'dekke', id: f.id, gjør: 'riv' }]);
      // taket over – i øverste etasje som står (loftet er under taket)
      const øv = m.etasjer.filter(q => q.tilstand !== 'revet').slice(-1)[0], tf = takFelt(m, valg.x, valg.y);
      if (øv === e && tf && (tf.tilstand === 'hel' || tf.tilstand === 'skadet')) { const a = med('tak', 'Riv taket over', [{ e: null, del: 'tak', id: tf.id, gjør: 'riv' }]); if (a.raser && a.ras.some(q => q.del !== 'tak')) a.advarsel = rasTekst(m, a.ras.filter(q => q.del !== 'tak'), false); }
      // en søyle bærer dekket over
      if (m.etasjer[k + 1] && m.etasjer[k + 1].tilstand !== 'revet') med('søyle', 'Sett inn en søyle her', [{ e: n, del: 'søyle', id: r.id, gjør: 'ny', x: r2(valg.x), y: r2(valg.y) }]);
    } else if (valg.del === 'etasje') {
      const liste = etasjerOvenfra(m);
      if (liste[0] === n && liste.length > 1) med('etasje', `Riv ${e.loft ? 'loftet' : e.navn.toLowerCase()}`, [{ e: n, del: 'etasje', gjør: 'riv' }]);
    }
    return ut;
  }

  // Den som står under et ras (en av dem på jobben, fast per jobb): { hvem (indeks i lista), tap (andel helse) } eller null
  function skade(rasM2, antall, frø) {
    const S = REGLER.skade; if (!(rasM2 >= S.rasMin) || !(antall > 0)) return null;
    const h = B.hash ? B.hash(frø || 1, 77) : .5;
    // halvparten av rasene treffer noen (fast per jobb)
    if (h > .5) return null;
    return { hvem: Math.floor(B.hash ? B.hash(frø || 1, 78) * antall : 0) % antall, tap: r2(Math.max(S.min, Math.min(S.maks, rasM2 * S.perM2))) };
  }

  // kort tekst om materialer (glass kommer med i modellen, men leiren har ikke glass ennå)
  const MATNAVN = { tre: ['m³', 'planker'], betong: ['m³', 'betong'], stål: ['t', 'stål'], glass: ['m³', 'glass'] };
  const tall = v => String(Math.round(v * 100) / 100).replace('.', ',');
  const matTekst = M => Object.entries(M || {}).filter(([k, v]) => v >= .005 && MATNAVN[k]).map(([k, v]) => `${tall(v)} ${MATNAVN[k][0]} ${MATNAVN[k][1]}`).join(', ');
  const tidTekst = t => (t < 1 ? `${Math.max(1, Math.round(t * 60))} min` : `${tall(Math.round(t * 10) / 10)} t`);
  // navnet på jobben i Leir-menyen og loggen
  const jobbNavn = (k, w) => ({ riv: 'riv veggen', bjelke: 'sett inn bjelke', bjelkeRiv: 'bjelke og riv veggen', dør: 'ny dør', vindu: 'nytt vindu', gulv: 'riv gulvet', tak: 'riv taket', søyle: 'ny søyle', etasje: 'riv en etasje' }[k] || 'husarbeid') + (w && w.bærende && k === 'riv' ? ' (bærende)' : '');

  const api = { REGLER, rasAreal, rasTekst, stål, tettTre, prøv, veggVed, romVed, takFelt, etasjerOvenfra, alleEtasjer, andelIgjen, rivSteg, handlinger, skade, matTekst, tidTekst, jobbNavn, står };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.HusEndringRegler = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
