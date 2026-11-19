// Vakt for pakka «kart» (runde 6, kritikken 19. nov): navnelappene i 2D-kartet (spill/etikett.js + spill/kartlapper.js), fiendens merke
// øverst, ingen søyle av navn langt ute, «0 t olje» og «Leiren til …» skjult ved leiren, kaiene i krigskartet bare ved leiren, krigskartets
// utsnitt på Dovre, og natt/regn i 2D (spill/kartlys.js). Tegner 2D-kartet direkte med tegn() i samme synkrone blokk (3D kan være på –
// da tegnes bare det skjulte 2D-lerretet), og setter alt tilbake: kameraet, tida, tåka, lagene og krigskartet.
module.exports = { navn: 'kart (navnelapper uten overlapp, fiender øverst, krigskartet, natt og regn i 2D)', kjør: async (pg, profil) => {
  const d = await pg.evaluate(() => {
    const ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
    if (!window.Etikett || !Etikett.tegnAlle || !window.KartLapper || !window.KartLys) return { feil: ['Etikett/KartLapper/KartLys mangler'] };
    const S = OppstartSpill.tilstand(); if (!S || !S.leir) return { feil: ['ingen leir'] };
    const L = S.leir, kam0 = { x: kam.x, y: kam.y, m: kam.m }, tid0 = tid, taake0 = VIS.taake, valgt0 = valgt, kl0 = KartLys.test, nye = [];
    const over = (r, q) => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3];
    const tegnNå = (x, y, m) => { kam.x = x; kam.y = y; kam.m = m; skitten = true; tegn(); return { navn: Etikett.tegnet(), hindre: Etikett.hindringer(), overlapp: Etikett.overlapp() }; };
    const piksel = (x, y) => { const p = ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data; return [p[0], p[1], p[2]]; };
    const skjerm = (X, Y) => [(X - (kam.x - VW / 2 * kam.m)) / kam.m, ((kam.y + VH / 2 * kam.m) - Y) / kam.m];
    try {
      valgt = null;
      // 1) leiren på vanlig zoom: ingen navn oppå hverandre eller oppå merkene, «0 t olje» og «Leiren til …» vises ikke
      for (const m of [5, 2]) { const T = tegnNå(L.x + 120, L.y, m); ut['m' + m] = T.navn.map(n => n.t);
        krev(T.overlapp === 0, `m ${m}: ${T.overlapp} navn oppå hverandre`);
        krev(!T.navn.some(n => n.t === '0 t olje' || /^Leiren til /.test(n.t)), `m ${m}: «0 t olje» eller «Leiren til …» står ved leiren: ${ut['m' + m].join(' | ')}`);
        krev(T.navn.some(n => n.t === S.fraksjon.navn || n.t.startsWith(S.fraksjon.navn + ' · ')), `m ${m}: leirens navn mangler`);
        const opp = T.navn.filter(n => n.prio < Etikett.REGLER.tving && T.hindre.some(h => over(n.ramme, h))); krev(!opp.length, `m ${m}: navn oppå et merke: ${opp.map(n => n.t).join(', ')}`); }
      // 2) fienden ved leiren: navnet får plassen sin, egne navn flyttes, og merket ligger over alle navn
      VIS.taake = false; const fi = nyttLag('Røvere vakt', L.x + 60, L.y + 40, 'rød'); fi.raid = 1; ENHETER.push(fi); nye.push(fi);
      for (let i = 0; i < 3; i++) { const e = nyttLag('Eget vaktlag ' + (i + 1), L.x + 60, L.y + 40, 'blå'); ENHETER.push(e); nye.push(e); }
      { const T = tegnNå(L.x, L.y, 5), [fx, fy] = skjerm(fi.x, fi.y), f = T.navn.find(n => n.t === fi.navn);
        krev(f && Math.hypot(f.x - fx, f.y - fy) < 70, 'fiendens navn står ikke ved merket sitt: ' + JSON.stringify(f));
        krev(T.overlapp === 0, `fiende og egne lag: ${T.overlapp} navn oppå hverandre`);
        const [w, h] = Merker.mål('fiende', 11), p = piksel(fx, fy - h * .45), fa = sidefarge('rød', 'farge'), want = [parseInt(fa.slice(1, 3), 16), parseInt(fa.slice(3, 5), 16), parseInt(fa.slice(5, 7), 16)];
        ut.fiendePiksel = p; if (/^#[0-9a-f]{6}$/i.test(fa)) krev(Math.abs(p[0] - want[0]) + Math.abs(p[1] - want[1]) + Math.abs(p[2] - want[2]) < 60, `fiendens merke er dekket (piksel ${p} mot ${want})`);
        const egne = T.navn.filter(n => /^Eget vaktlag/.test(n.t)); krev(egne.every(n => !over(n.ramme, [fx - w, fy - h, 2 * w, 2 * h])), 'et eget navn ligger oppå fiendens merke'); }
      // 3) langt ute (som /norge på 200 km): mange lag på samme sted gir ingen lang søyle av navn
      for (let i = 0; i < 6; i++) { const e = nyttLag('Fjernlag ' + (i + 1), L.x + 40000, L.y + 30000, 'rød'); ENHETER.push(e); nye.push(e); }
      { const T = tegnNå(L.x + 40000, L.y + 30000, 150), [ax, ay] = skjerm(L.x + 40000, L.y + 30000), fj = T.navn.filter(n => /^Fjernlag/.test(n.t));
        ut.fjern = fj.map(n => Math.round(Math.hypot(n.x - ax, n.y - ay))); krev(fj.length >= 2 && fj.every(n => Math.hypot(n.x - ax, n.y - ay) < 110), 'navnene langt ute står i en søyle: ' + ut.fjern.join(', ')); }
      for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); } nye.length = 0; VIS.taake = taake0;
      // 4) krigskartet: kaiene bare ved leiren, og utsnittet holder seg der kartet finnes
      { const fokus = INFRA_FOKUS.test; INFRA_FOKUS.test = true; const var0 = StrategiSpill.erÅpen();
        try { const før = [KAI_VIKTIG(L.x + 20000, L.y, 3, 200, 120), KAI_VIKTIG(L.x + 800, L.y, 1, 30, 120)];
          if (!var0) StrategiSpill.åpne(); const etter = [KAI_VIKTIG(L.x + 20000, L.y, 3, 200, 120), KAI_VIKTIG(L.x + 800, L.y, 1, 30, 120), KAI_VIKTIG(L.x + 20000, L.y, 4, 300, 2)];
          ut.kai = { før, etter }; krev(etter[0] === false && etter[1] === true && etter[2] === true, 'krigskartet viser kaier langt fra leiren: ' + JSON.stringify(ut.kai));
          const B = StrategiSpill.boks(); ut.boks = B && [Math.round(B.w), Math.round(B.h)];
          if (B && !NORGE_BLOKKER && Array.isArray(OMRÅDE)) krev(B.w <= OMRÅDE[2] - OMRÅDE[0] + 3001 && B.h <= OMRÅDE[3] - OMRÅDE[1] + 3001, 'krigskartet viser svart utenfor kartet: ' + ut.boks);
        } finally { if (!var0) StrategiSpill.lukk(); INFRA_FOKUS.test = fokus; } }
      // 5) natt og regn i 2D: kartet er mørkere og blåere kl. 02 enn kl. 12, og navnene står fortsatt
      { KartLys.test = true; const måle = () => { let r = 0, g = 0, b = 0; for (const [fx, fy] of [[.3, .3], [.7, .3], [.5, .5], [.3, .7], [.7, .7]]) { const p = piksel(VW * fx, VH * fy); r += p[0]; g += p[1]; b += p[2]; } return [r / 5, g / 5, b / 5]; };
        const dagTid = Math.floor(tid / 1440) * 1440 + 6 * 60, nattTid = dagTid + 14 * 60;
        tid = dagTid; tegnNå(L.x, L.y, 5); const dag = måle(); tid = nattTid; const N = tegnNå(L.x, L.y, 5), natt = måle(); ut.lys = { dag: dag.map(Math.round), natt: natt.map(Math.round), tone: KartLys.nå() };
        krev(natt[0] + natt[1] + natt[2] < (dag[0] + dag[1] + dag[2]) * .85, 'kartet blir ikke mørkere om natta: ' + JSON.stringify(ut.lys));
        krev(natt[2] / Math.max(1, natt[0]) > dag[2] / Math.max(1, dag[0]), 'natta er ikke blåere');
        krev(N.navn.length > 0 && N.overlapp === 0, 'navnene forsvant om natta');
        krev(KartLys.tone({ e: 40, regn: 1, sky: 1 }).grå > .2, 'regn gjør ikke kartet gråere'); }
    } catch (e) { ut.feil.push('kastet: ' + e.message); }
    finally { for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); } VIS.taake = taake0; valgt = valgt0; tid = tid0; KartLys.test = kl0; Object.assign(kam, kam0); skitten = true; }
    return ut; });
  const ok = !d.feil.length;
  return { ok, data: d, tekst: ok ? `leiren uten overlapp (${(d.m5 || []).length} navn ved 5 m), fiendens merke øverst, langt ute ${(d.fjern || []).length} navn nær merket, kaier i krigskartet bare ved leiren, krigskartet ${d.boks ? d.boks.map(v => Math.round(v / 1000)).join(' × ') + ' km' : '–'}, natt i 2D ${d.lys ? d.lys.natt.join('/') : ''}` : d.feil.join('; ') };
} };
