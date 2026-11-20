// Vakt for pakka «utseende» (runde 8, ny kritikk 20. nov): 2D-kartet mens det lastes (grov flis først, ingen tomme fliser, myk kant
// mot fliser som ikke er ferdige), navn uten NVDB-tillegg («Fodnestunnelen hovedløp» -> «Fodnestunnelen»), disen i 3D ovenfra i regn
// (Vaer.dis3d), trær i gulbrun skog (Vegetasjon.trePåFarge) og nærskogen mens du går (vegetasjon3d.js). Tegner 2D-kartet med tegn()
// (3D kan være på – da tegnes det skjulte 2D-lerretet) og setter kameraet tilbake. Tar høyst ca. 12 s.
module.exports = { navn: 'utseende (kartet mens det lastes, navn uten NVDB-tillegg, dis i regn, trær i gulbrun skog)', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, t) => { if (!ok) ut.feil.push(t); };
    if (typeof FLISLAST === 'undefined' || typeof tegnFliser !== 'function') return { feil: ['FLISLAST/tegnFliser mangler i index.html'] };
    if (!window.KartNavn || !window.Vaer || !Vaer.dis3d || !window.Vegetasjon || !Vegetasjon.trePåFarge) return { feil: ['KartNavn, Vaer.dis3d eller Vegetasjon.trePåFarge mangler'] };
    // 1) navn uten NVDB-tillegg: regelen, og infrastrukturen som er lest inn
    krev(KartNavn.vis('tunnel', 'Fodnestunnelen hovedløp') === 'Fodnestunnelen' && KartNavn.vis('tunnel', 'Eidsvågtunnelen løp mot Bergen') === 'Eidsvågtunnelen'
      && KartNavn.vis('bru', 'Åbrua Flomløp') === 'Åbrua Flomløp', 'KartNavn.vis gir feil navn');
    if (typeof INFRA !== 'undefined' && INFRA && INFRA.tunnel) { const tekn = INFRA.tunnel.filter(o => /hovedløp|\bløp mot\b|nordgående|sørgående/i.test(o.e.navn || ''));
      ut.tunneler = INFRA.tunnel.length; krev(!tekn.length, `${tekn.length} tunnelnavn med NVDB-tillegg i kartet, f.eks. «${tekn[0] && tekn[0].e.navn}»`); }
    // 2) disen i 3D ovenfra: bakken midt i bildet er ikke borte i regn, og nede ved bakken er det som før
    { const D = 3000, near = D * .9 + 2000, far = D + 4800, r = Vaer.dis3d(near, far, Vaer.VÆR.regn.dis, D), lav = Vaer.dis3d(120, 3800, .4, 0);
      ut.regnAndel = +((D - r.near) / (r.far - r.near)).toFixed(2); krev(r.near < D && r.far > D && ut.regnAndel < .4, 'regn ovenfra: bakken midt i bildet ligger i disen (' + ut.regnAndel + ')');
      krev(lav.far === Math.max(140, 3800 * .4), 'disen nede ved bakken er endret');
      if (typeof R3 !== 'undefined' && R3 && R3.scene && R3.scene.fog && window.VAER) ut.dis3d = [Math.round(R3.scene.fog.near), Math.round(R3.scene.fog.far)]; }
    // 3) trær i gulbrun skog, aldri på grått, blått, rødt tak eller vegfarge
    krev(Vegetasjon.trePåFarge(150, 135, 70, true) && !Vegetasjon.trePåFarge(150, 135, 70, false) && !Vegetasjon.trePåFarge(110, 112, 108, true) && !Vegetasjon.trePåFarge(218, 176, 102, true),
      'Vegetasjon.trePåFarge svarer feil');
    krev(!!(window.Vegetasjon3d && Vegetasjon3d.NÆRSKOG && 'nærskog' in Vegetasjon3d), 'nærskogen (Vegetasjon3d.nærskog) mangler');
    // 3b) det som bare tar imot skygge (terrenget m.m.), tegnes ikke i skyggekartet – ellers kaster terrenget skygge på seg selv med VSM
    // (den mørke «halvmånen» ved leiren med lav sol). Med skyggene på i 3D: alle slike har den tomme dybdetegningen.
    if (window.Lys3d && Lys3d.tomDybde) { const L = Lys3d.tomDybde(); ut.tomDybde = L; if (Lys3d.på) krev(L.n === L.tar, `${L.tar - L.n} av ${L.tar} som bare tar imot skygge, tegnes i skyggekartet`); }
    else krev(false, 'Lys3d.tomDybde mangler (lys3d.js)');
    // 4) 2D-kartet mens det lastes: et sted som ikke er vist på nær zoom – først en grov flis for hele bildet, så ingen tomme fliser
    // reserven leter bare så langt opp som den grove flisen ligger (ellers dekker oversiktsflisene fra oppstarten alt, og den grove trengs ikke)
    const kam0 = { x: kam.x, y: kam.y, m: kam.m }, O = OMRÅDE, S0 = OppstartSpill.tilstand(), L = S0 && S0.leir, dypt0 = FLISLAST.dypt; FLISLAST.dypt = FLISLAST.grov;
    try {
      // et hjørne av området langt fra leiren (der har ingen vakt zoomet inn)
      const hj = [[O[0] + 2600, O[1] + 2600], [O[2] - 2600, O[3] - 2600], [O[0] + 2600, O[3] - 2600], [O[2] - 2600, O[1] + 2600]];
      const [x, y] = hj.sort((a, b) => (L ? Math.hypot(b[0] - L.x, b[1] - L.y) - Math.hypot(a[0] - L.x, a[1] - L.y) : 0))[0];
      kam.x = x; kam.y = y; kam.m = 1.6; const z = niva(), zg = Math.max(ZMIN, z - FLISLAST.grov);
      const fliser = () => { const s = span(z), vx0 = kam.x - VW / 2 * kam.m, vy1 = kam.y + VH / 2 * kam.m, l = [];
        for (let j = Math.floor((G.y0 - vy1) / s); j <= Math.floor((G.y0 - (vy1 - VH * kam.m)) / s); j++) for (let i = Math.floor((vx0 - G.x0) / s); i <= Math.floor((vx0 + VW * kam.m - G.x0) / s); i++) l.push([i, j]); return l; };
      const l = fliser(), ferdigFør = l.filter(([i, j]) => FERDIG.has(z + '/' + i + '/' + j)).length;
      skitten = true; tegn(); const s0 = { ...FLISLAST.sist };
      const grove = [...new Set(l.map(([i, j]) => zg + '/' + (i >> (z - zg)) + '/' + (j >> (z - zg))))];
      ut.start = { z, zg, fliser: l.length, ferdigFør, ...s0, groveIKø: grove.filter(k => VENTER.has(k) || FERDIG.has(k)).length };
      // vent på at reserven dekker hele bildet (grov flis eller de ferdige), høyst 9 s; tell myke kanter underveis
      let myke = 0, tomme = Infinity; const t0 = performance.now();
      while (performance.now() - t0 < 9000) { await new Promise(r => setTimeout(r, 250)); skitten = true; tegn(); myke = Math.max(myke, FLISLAST.sist.myke); tomme = FLISLAST.sist.mangler; if (!tomme) break; }
      ut.etter = { ms: Math.round(performance.now() - t0), tomme, myke, ferdige: l.filter(([i, j]) => FERDIG.has(z + '/' + i + '/' + j)).length };
      krev(tomme === 0, `${tomme} fliser i bildet er fortsatt tomme etter ${ut.etter.ms} ms (verken grov flis eller ferdig)`);
      // (køen kan være full akkurat i første bilde – da kommer den grove i neste; det som teller, er at den er laget når bildet er fylt)
      ut.etter.grove = grove.filter(k => FERDIG.has(k)).length;
      krev(!s0.mangler || ut.etter.grove > 0 || ut.etter.ferdige === l.length, 'den grove flisen ble ikke laget (bildet ble fylt av noe annet)');
      // en ny flis tones inn (alfa under 1 den første tiden) – prøvd på en kopi i tegnFliser sitt regnestykke
      krev(FLISLAST.inn > 0 && FLISLAST.kant > 0, 'toning/myk kant er slått av');
    } finally { FLISLAST.dypt = dypt0; kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; skitten = true; tegn(); }
    return ut;
  });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? `kartet lastes grovt først (${d.start && d.start.fliser} fliser, tomme etter ${d.etter && d.etter.ms} ms: ${d.etter && d.etter.tomme}), navn uten NVDB-tillegg, regn ovenfra ${d.regnAndel} inn i disen` : d.feil.join('; '), data: d };
} };
