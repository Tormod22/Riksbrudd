// Vakt for pakka «kart» (runde 6, kritikken 19. nov): navnelappene i 2D-kartet (spill/etikett.js + spill/kartlapper.js), fiendens merke
// øverst, ingen søyle av navn langt ute, «0 t olje» og «Leiren til …» skjult ved leiren, kaiene i krigskartet bare ved leiren, krigskartets
// utsnitt på Dovre, og natt/regn i 2D (spill/kartlys.js). Tegner 2D-kartet direkte med tegn() i samme synkrone blokk (3D kan være på –
// da tegnes bare det skjulte 2D-lerretet), og setter alt tilbake: kameraet, tida, tåka, lagene og krigskartet.
module.exports = { navn: 'kart (navnelapper uten overlapp, fiender øverst, krigskartet, natt og regn i 2D, én skrift, leiren som klynge langt ute)', kjør: async (pg, profil) => {
  const d = await pg.evaluate(() => {
    const ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
    if (!window.Etikett || !Etikett.tegnAlle || !window.KartLapper || !window.KartLys) return { feil: ['Etikett/KartLapper/KartLys mangler'] };
    const S = OppstartSpill.tilstand(); if (!S || !S.leir) return { feil: ['ingen leir'] };
    // frø: tilfeldighetene i index.html (tilf) er faste – nyttLag bruker dem, og vaktene etter denne (krig) regner med samme rekke
    const L = S.leir, kam0 = { x: kam.x, y: kam.y, m: kam.m }, tid0 = tid, frø0 = frø, taake0 = VIS.taake, valgt0 = valgt, kl0 = KartLys.test, nye = [];
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
      // (krigskartet åpnes ikke – det slår av 3D; erÅpen svarer ja en liten stund)
      { const fokus = INFRA_FOKUS.test, erÅpen0 = StrategiSpill.erÅpen; INFRA_FOKUS.test = true;
        try { const før = [KAI_VIKTIG(L.x + 20000, L.y, 3, 200, 120), KAI_VIKTIG(L.x + 800, L.y, 1, 30, 120)];
          StrategiSpill.erÅpen = () => true; const etter = [KAI_VIKTIG(L.x + 20000, L.y, 3, 200, 120), KAI_VIKTIG(L.x + 800, L.y, 1, 30, 120), KAI_VIKTIG(L.x + 20000, L.y, 4, 300, 2)];
          ut.kai = { før, etter }; krev(etter[0] === false && etter[1] === true && etter[2] === true, 'krigskartet viser kaier langt fra leiren: ' + JSON.stringify(ut.kai));
          const B = StrategiSpill.boks(); ut.boks = B && [Math.round(B.w), Math.round(B.h)];
          if (B && !NORGE_BLOKKER && Array.isArray(OMRÅDE)) krev(B.w <= OMRÅDE[2] - OMRÅDE[0] + 3001 && B.h <= OMRÅDE[3] - OMRÅDE[1] + 3001, 'krigskartet viser svart utenfor kartet: ' + ut.boks);
        } finally { StrategiSpill.erÅpen = erÅpen0; INFRA_FOKUS.test = fokus; } }
      // 5) natt og regn i 2D: på et eget lite lerret med kjent kartfarge (tida i spillet røres ikke) – natta er mørkere og blåere, dagen uendret
      { const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d'), prøv = T => { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = 'rgb(200,180,140)'; g.fillRect(0, 0, 8, 8); KartLys.tegnTone(g, T); const p = g.getImageData(4, 4, 1, 1).data; return [p[0], p[1], p[2]]; };
        const dag = prøv(KartLys.tone({ e: 40 })), natt = prøv(KartLys.tone({ e: -12 })), regn = prøv(KartLys.tone({ e: 40, regn: 1, sky: 1 })); ut.lys = { dag, natt, regn };
        krev(dag[0] === 200 && dag[1] === 180 && dag[2] === 140, 'kartet endres midt på dagen: ' + dag);
        krev(natt[0] + natt[1] + natt[2] < 520 * .8 && natt[2] / natt[0] > 140 / 200, 'natta er ikke mørkere og blåere: ' + natt);
        krev(Math.abs(regn[0] - regn[2]) < 60 - 5 && regn[0] + regn[1] + regn[2] < 520, 'regnet gjør ikke kartet gråere: ' + regn);
        // og med KartLys på i selve kartet tegnes det uten feil, med navnene oppå
        KartLys.test = true; const N = tegnNå(L.x, L.y, .3); krev(N.navn.length > 0 && N.overlapp === 0, 'navnene forsvant med kartlyset på'); KartLys.test = kl0; }
      // 6) RUNDE 12: én skrift i kartet – sans-serif blir kartets skrift mens rammen tegnes (og bare da)
      { Etikett.nullstill(); ctx.font = '11px sans-serif'; const iRamme = ctx.font; Etikett.tegnAlle(ctx); ctx.font = '11px sans-serif'; const etter = ctx.font; ut.skrift = [iRamme, etter];
        krev(/Cormorant/.test(iRamme), 'sans-serif i kartet blir ikke kartets skrift: ' + iRamme); krev(!/Cormorant/.test(etter), 'skriften byttes også utenom rammen: ' + etter); }
      // 7) RUNDE 12: leiren synes som en klynge bygg på 1 km-målestokk (8 m per punkt): et ferdig bygg 25 m øst for flagget blir et merke
      //    minst kort × lang punkter, ute av lagmerkene midt i leiren; og småtallene for hogst/riving står ikke ved leiren på 2 m per punkt
      { const LS = window.LeirSpill && LeirSpill.tilstand(); if (LS && window.Leir2d && Leir2d.klyngeM) { const K = Leir2d.REGLER.klynge, t = (Leir.BYGG.brakke.tid || 1) * 60;
          const b = { id: LS.neste++, type: 'brakke', x: L.x + 25, y: L.y, ret: 0, igjen: 0, totalt: t, pris: 0, mat: {}, nivå: 1, hp: 1, nr: LS.nesteJobb++, arbeid: null, vakt: true };
          const før = tegnNå(L.x, L.y, 8).hindre.length; LS.bygg.push(b);
          try { const T = tegnNå(L.x, L.y, 8), [bx, by] = skjerm(L.x, L.y), H = T.hindre.filter(h => h[0] > bx + 4 && Math.abs(h[1] + h[3] / 2 - by) < 20 && h[2] >= K.kort && h[2] < 30);
            ut.klynge = { før, etter: T.hindre.length, merke: H[0] }; krev(T.hindre.length > før && H.length, 'brakka synes ikke på 1 km-målestokk: ' + JSON.stringify(ut.klynge)); }
          finally { const i = LS.bygg.indexOf(b); if (i >= 0) LS.bygg.splice(i, 1); LS.neste--; LS.nesteJobb--; } }
        const T2 = tegnNå(L.x, L.y, 2); krev(!T2.navn.some(n => /^(hogst|riving) /.test(n.t)), 'hogst/riving-tallene står ved leiren på 2 m per punkt'); }
    } catch (e) { ut.feil.push('kastet: ' + e.message); }
    finally { for (const e of nye) { const i = ENHETER.indexOf(e); if (i >= 0) ENHETER.splice(i, 1); } VIS.taake = taake0; valgt = valgt0; tid = tid0; frø = frø0; KartLys.test = kl0; Object.assign(kam, kam0); skitten = true; }
    return ut; });
  const ok = !d.feil.length;
  return { ok, data: d, tekst: ok ? `leiren uten overlapp (${(d.m5 || []).length} navn ved 5 m), fiendens merke øverst, langt ute ${(d.fjern || []).length} navn nær merket, kaier i krigskartet bare ved leiren, krigskartet ${d.boks ? d.boks.map(v => Math.round(v / 1000)).join(' × ') + ' km' : '–'}, natt i 2D ${d.lys ? d.lys.natt.join('/') + ' (dag ' + d.lys.dag.join('/') + ')' : ''}, én skrift i kartet, brakka som klynge på 1 km${d.klynge && d.klynge.merke ? ' (' + d.klynge.merke.slice(2).map(Math.round).join(' × ') + ' px)' : ''}` : d.feil.join('; ') };
} };
