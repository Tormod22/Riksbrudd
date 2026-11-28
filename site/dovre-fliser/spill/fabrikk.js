/* FABRIKKEN DU BYGGER SELV (28. nov, fase B5 i docs/plan-selskap-okonomi.md, kapittel 5.6): regler uten DOM.
 * Node: require('./fabrikk') (henter leir.js, byggesett.js og produksjon.js selv); nettleser: globalThis.Fabrikk (lastes rett etter
 * byggesett-visning.js). Visningen: spill/fabrikk-visning.js.
 *
 * Maskinene i byggesettet (Sagbenk, Høvel, Vedkløyver, Fyrkjele – ByggesettRegler.NYE, kat 'maskin') er bygg i leiren med b.bs (plassen i
 * rutenettet) og Leir.BYGG[type].maskinType. Produksjon.js kjører dem med de samme reglene som maskin-byggene (sagbruk …); denne fila gir
 * det som er nytt med en hall:
 *  - PLASSENE (plasser(b)): innmating og utmating i rutene rett utenfor hver ende av fotavtrykket, bruksplassene i rutene langs høyre side
 *    (sett i flytretningen). Fotavtrykket sperrer (Vei), plassene er frie ruter, så bærerne og operatørene går dit gjennom dørene/portene.
 *  - FLYT: i et lukket rom med minst to åpninger (port/dør): inn = åpningen nærmest sagbenkens innmating, ut = åpningen nærmest den siste
 *    maskinens utmating. Veien inn -> sag (inn, ut) -> høvel (inn, ut) -> ut målt langs linja fra inn-porten til ut-porten: går den aldri
 *    baklengs (mer enn REGLER.toleranse), er rekkefølgen riktig (+15 %); går den tydelig baklengs (mer enn REGLER.baklengs), står maskinene
 *    hulter til bulter (−10 %). Ellers, eller med bare én åpning: som før.
 *  - LYS: om natta (utenfor REGLER.dag) arbeider folk 40 % saktere uten en lampe som virker (strøm, ikke slått av) innen lampens rekkevidde.
 *    Om dagen gir vinduer, porter og åpen himmel lys gratis; et rom uten vinduer og porter er mørkt også om dagen.
 *  - TAK: en maskin uten tak over hele fotavtrykket slites dobbelt så fort.
 *  - VARME: om vinteren arbeider folk 20 % saktere uten en fyrkjele som går i samme rom.
 * Maskin-byggene (sagbruk som eget bygg) får ingen av faktorene – gamle spill går nøyaktig som før.
 * Alle tallene er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const hent = n => { try { return require(n); } catch (e) { return null; } };
  const NODE = typeof module !== 'undefined' && module.exports;
  const LB = rot.Leir || (NODE ? hent('./leir.js') : null);
  const BS = rot.ByggesettRegler || (NODE ? hent('./byggesett.js') : null);
  const PR = () => rot.Produksjon || (NODE ? hent('./produksjon.js') : null);

  // ---------- REGLER (Claudes forslag) ----------
  const REGLER = {
    // flyt: riktig rekkefølge gir + 15 % (planen 5.6), hulter til bulter − 10 %
    flyt: 1.15, hulter: .9,
    // hvor langt (m) et steg kan gå baklengs før det teller: litt (en rute) er greit; mer enn to ruter er baklengs
    toleranse: 1.2, baklengs: 2.4,
    // uten lys om natta (planen: 40 % saktere), uten varme om vinteren (20 % saktere), uten tak slites maskinen dobbelt
    mørkt: .6, kaldt: .8, åpen: 2,
    // dagslys fra kl. 7 til 19 (spilltimer)
    dag: [7, 19],
  };
  const U = BS ? BS.U : 1.2;
  const erDel = b => !!(b && LB && LB.BYGG[b.type] && LB.BYGG[b.type].maskinDel);
  const mtype = t => (LB && LB.BYGG[t] && LB.BYGG[t].maskinType) || t;
  const folk = t => { const P = PR(); const M = P && P.REGLER.maskiner[mtype(t)]; return M ? M.folk : 1; };
  const harUt = t => { const P = PR(); const M = P && P.REGLER.maskiner[mtype(t)]; return !!(M && Object.keys(M.ut).length); };

  // ---------- plassene ved maskinen ----------
  // lokalt: lx langs flyten (ret), ly til venstre. Kartet: b.x, b.y og b.ret (fra ByggesettRegler.midt).
  const tilKart = (b, lx, ly) => { const c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0); return { x: b.x + lx * c - ly * s, y: b.y + lx * s + ly * c }; };
  function plasser(b) {
    const D = LB.BYGG[b.type].maskinDel, l = D.l || 1, w = D.b || 1, L = l * U, W = w * U, c0 = w % 2 ? 0 : -U / 2, n = Math.min(l, folk(b.type));
    // bruksplassene: midt i rutene langs høyre side (ly < 0), spredt jevnt langs maskinen
    const bruks = []; for (let k = 0; k < n; k++) { const q = Math.min(l - 1, Math.round((k + .5) * l / n - .5)); bruks.push(tilKart(b, -L / 2 + U * (q + .5), -(W / 2 + U / 2))); }
    return { inn: tilKart(b, -L / 2 - U / 2, c0), ut: harUt(b.type) ? tilKart(b, L / 2 + U / 2, c0) : null, bruks, ende: tilKart(b, L / 2 + U / 2, c0) };
  }

  // ---------- hallen ----------
  // Åpningene (dør/port) i veggene rundt et rom: [{ id, x, y, v }]
  function åpninger(M, o, r) {
    const iRom = new Set(r.celler.map(c => c.join(','))), ut = new Map(), e = r.etasje;
    for (const [i, j] of r.celler) for (const [k, ni, nj] of [[{ a: 'x', i, j }, i, j - 1], [{ a: 'x', i, j: j + 1 }, i, j + 1], [{ a: 'y', i, j }, i - 1, j], [{ a: 'y', i: i + 1, j }, i + 1, j]]) {
      if (iRom.has(ni + ',' + nj)) continue; const w = M.get(`k:${k.a}:${k.i}:${k.j}:${e}`); if (!w || ut.has(w.id)) continue;
      const v = BS.DELER[w.type] && BS.DELER[w.type].v; if (v === 'dør' || v === 'port') { const p = BS.midt(o, w); ut.set(w.id, { id: w.id, x: p.x, y: p.y, v }); } }
    return [...ut.values()];
  }
  const nær = (A, p, unntatt) => A.filter(a => a !== unntatt).reduce((best, a) => (!best || Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? a : best), null);
  // Flyten for én sagbenk (og høvelen etter den): { faktor, riktig, baklengs, tekst, punkter (kartet, i rekkefølge) }
  function flyt(sag, høvler, Å) {
    const P = plasser(sag);
    if (Å.length < 2) return { faktor: 1, riktig: false, tekst: Å.length ? 'bare én åpning – sett inn en port til, så tømmeret kan gå inn én vei og ut en annen' : 'ingen port inn' };
    const inn = nær(Å, P.inn), h = høvler.length ? høvler.slice().sort((a, b) => Math.hypot(plasser(a).inn.x - P.ende.x, plasser(a).inn.y - P.ende.y) - Math.hypot(plasser(b).inn.x - P.ende.x, plasser(b).inn.y - P.ende.y))[0] : null;
    const Ph = h ? plasser(h) : null, siste = Ph ? Ph.ende : P.ende, ut = nær(Å, siste, inn);
    const pk = [inn, P.inn, P.ende, ...(Ph ? [Ph.inn, Ph.ende] : []), ut], ax = ut.x - inn.x, ay = ut.y - inn.y, LL = Math.hypot(ax, ay) || 1;
    const pr = pk.map(p => ((p.x - inn.x) * ax + (p.y - inn.y) * ay) / LL);
    let verst = 0; for (let k = 1; k < pr.length; k++) verst = Math.min(verst, pr[k] - pr[k - 1]);
    const riktig = verst >= -REGLER.toleranse, baklengs = verst < -REGLER.baklengs;
    const faktor = riktig ? REGLER.flyt : baklengs ? REGLER.hulter : 1;
    const tekst = riktig ? `riktig rekkefølge (port inn → sag${h ? ' → høvel' : ''} → port ut): +${Math.round((REGLER.flyt - 1) * 100)} %`
      : baklengs ? `hulter til bulter (veien går ${String(Math.round(-verst * 10) / 10).replace('.', ',')} m baklengs): −${Math.round((1 - REGLER.hulter) * 100)} %` : 'nesten riktig rekkefølge – snu eller flytt maskinene for +15 %';
    return { faktor, riktig, baklengs, tekst, punkter: pk.map(p => ({ x: p.x, y: p.y })), inn: inn.id, ut: ut.id, høvel: h ? h.id : null };
  }
  // Hallen rundt hver maskin i byggesettet: Map id -> { id, type, maskin, tak, rom (nøkkel), romNavn, dagslys, lamper [id], flyt, flytTekst,
  // flytPunkter, sager/høvler i samme rom }. L = leirens tilstand.
  function hall(L) {
    const ut = new Map(); if (!L || !BS || !LB || !Array.isArray(L.bygg)) return ut;
    const o = L.byggesett || { ox: 0, oy: 0 }, deler = BS.fraLeir(L, LB), M = BS.indeks(deler.filter(d => d.ferdig !== false));
    const maskiner = L.bygg.filter(erDel); if (!maskiner.length) return ut;
    const R = BS.rom(deler, L.romBruk), lamper = L.bygg.filter(b => LB.BYGG[b.type] && LB.BYGG[b.type].lampe && LB.ferdig(b));
    for (const b of maskiner) {
      const d = BS.fraBygg(b, LB), C = BS.ruter(d), r = R.find(q => q.maskiner && q.maskiner.includes(b.id)) || null;
      const tak = C.every(([i, j]) => M.has(`c:${i}:${j}:${d.n + 1}`) || M.has(`t:${i}:${j}:${d.n}`));
      // lampene som lyser på maskinen: innen rekkevidden fra et punkt på fotavtrykket, i samme etasje (og i samme rom når maskinen står i et rom)
      const lys = lamper.filter(q => { const ld = BS.fraBygg(q, LB); if (!ld || ld.n !== d.n) return false; if (r && !(r.lamper || []).includes(q.id)) return false;
        const rr = LB.BYGG[q.type].lampe, dx = Math.max(0, Math.abs(q.x - b.x) - LB.BYGG[b.type].maskinDel.l * U / 2), dy = Math.max(0, Math.abs(q.y - b.y) - LB.BYGG[b.type].maskinDel.l * U / 2);
        return Math.hypot(dx, dy) <= rr; }).map(q => q.id);
      ut.set(b.id, { id: b.id, type: b.type, maskin: mtype(b.type), n: d.n, tak, rom: r ? r.nøkkel : null, romNavn: r ? r.navn : null, lukket: !!r,
        dagslys: !tak || !r || (r.vinduer + r.porter) > 0, lamper: lys, flyt: 1, flytTekst: r ? '' : 'står ikke i et lukket rom', flytPunkter: null, sager: [], høvler: [] });
    }
    // flyten per rom: sagbenkene og høvlene i samme rom
    for (const r of R) { if (!r.maskiner || !r.maskiner.length) continue;
      const her = r.maskiner.map(id => L.bygg.find(b => b.id === id)).filter(Boolean), sager = her.filter(b => mtype(b.type) === 'sagbruk'), høvler = her.filter(b => mtype(b.type) === 'høvel');
      const Å = åpninger(M, o, r);
      for (const b of her) { const I = ut.get(b.id); if (!I) continue; I.sager = sager.map(q => q.id); I.høvler = høvler.map(q => q.id); I.åpninger = Å.length; }
      for (const s of sager) { const F = flyt(s, høvler, Å), I = ut.get(s.id); I.flyt = F.faktor; I.flytTekst = F.tekst; I.flytPunkter = F.punkter; I.riktig = F.riktig;
        if (F.høvel && ut.get(F.høvel)) { const H = ut.get(F.høvel); if (F.faktor !== 1 || H.flyt === 1) { H.flyt = F.faktor; H.flytTekst = F.tekst; } } }
      for (const b of her) { const I = ut.get(b.id); if (I && !I.flytTekst) I.flytTekst = mtype(b.type) === 'høvel' && !sager.length ? 'ingen sagbenk i rommet' : ''; }
    }
    return ut;
  }
  const erDag = time => { const t = ((time % 24) + 24) % 24; return t >= REGLER.dag[0] && t < REGLER.dag[1]; };
  // Faktorene for steget: H = hall(L), o = { time (0–24), vinter, virker(lampe-bygg) -> bool, status (forrige Produksjon.steg) }.
  // Gir { fart: { id }, slit: { id }, sager: { høvelId: [sag] }, høvelFor: { sagId: [høvel] }, del: { id: { flyt, lys, varme, slit, tekster } } }
  function faktorer(L, H, o = {}) {
    const ut = { fart: {}, slit: {}, sager: {}, høvelFor: {}, del: {} }, dag = erDag(o.time === undefined ? 12 : o.time), st = o.status || {};
    for (const [id, I] of H) {
      const lampe = I.lamper.some(q => (o.virker ? o.virker(q) : true)), lys = (dag && I.dagslys) || lampe ? 1 : REGLER.mørkt;
      const kjele = o.vinter ? (I.rom ? L.bygg.some(b => erDel(b) && mtype(b.type) === 'fyrkjele' && H.get(b.id) && H.get(b.id).rom === I.rom && st[b.id] && st[b.id].går) : false) : true;
      const varme = o.vinter && !kjele ? REGLER.kaldt : 1, slit = I.tak ? 1 : REGLER.åpen, fart = I.flyt * lys * varme;
      const tekster = []; if (I.flyt !== 1) tekster.push(I.flyt > 1 ? `flyt +${Math.round((I.flyt - 1) * 100)} %` : `hulter til bulter −${Math.round((1 - I.flyt) * 100)} %`);
      if (lys < 1) tekster.push(dag ? 'mørkt rom – sett inn vinduer eller lys (−40 %)' : 'mørkt – uten lys om natta (−40 %)'); if (varme < 1) tekster.push('kaldt – fyrkjele i rommet gir varme (−20 %)');
      if (!I.tak) tekster.push('ikke under tak – slites dobbelt');
      ut.fart[id] = fart; ut.slit[id] = slit; ut.del[id] = { flyt: I.flyt, lys, varme, slit, tak: I.tak, lampe, dag, tekster };
      if (I.maskin === 'høvel') ut.sager[id] = I.sager.slice();
      if (I.maskin === 'sagbruk') ut.høvelFor[id] = I.høvler.slice();
    }
    return ut;
  }
  // Advarsler og feil når en maskin skal settes (byggesettet): deler = alle deler (med forslaget), d = den nye maskinen, o = rutenettets opphav.
  // Gir { advarsel } – «ikke under tak» er lov, men sies fra om.
  function sjekkNy(deler, d) {
    if (!BS || BS.kat(d) !== 'maskin') return {}; const M = BS.indeks(deler), C = BS.ruter(d);
    const tak = C.every(([i, j]) => M.has(`c:${i}:${j}:${d.n + 1}`));
    return tak ? {} : { advarsel: `${BS.DELER[d.type].navn} står ikke under tak – den slites dobbelt så fort (legg tak over).` };
  }

  const api = { REGLER, erDel, mtype, plasser, åpninger, flyt, hall, faktorer, erDag, sjekkNy };
  if (NODE) module.exports = api; else rot.Fabrikk = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
