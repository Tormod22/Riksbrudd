// Vakt for pakka «varer» (28. nov, fase G4: varer med plass – spill/varelager.js og varelager-visning.js).
// Legger et ferdig lagertelt i leiren og sjekker: summen av enhetene = tallene i lageret etter innlegg, kjøp, salg, uttak og direkte
// skriving; nye planker havner under tak; reservering hindrer dobbel henting; røverne (Spillet.Trussel.bytte, slik spillet-visning.js
// bruker den) tar bare det som ligger ute; sonen settes med kommandoen «lagersone»; enhetene tegnes i kartet når du er zoomet inn,
// og fanen Lager viser lagerplassene. Setter alt tilbake: byggene, lageret, dieselen, kassa, varelageret, kartet og menyen.
module.exports = {
  navn: 'varer med plass (G4)',
  kjør: async (pg, profil) => {
    const d = await pg.evaluate(async () => {
      const ut = {}, L = window.LeirSpill && LeirSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand(), VS = window.VarelagerSpill, VL = window.Varelager;
      if (!L || !S || !VS || !VL || !VS.V() || !window.KOMMANDO) return { mangler: true, L: !!L, VS: !!VS, V: !!(VS && VS.V()) };
      const V = VS.V(), V0 = JSON.stringify(VL.tilJSON(V)), bygg0 = L.bygg.slice(), lager0 = { ...L.lager }, d0 = L.drivstoff, penger0 = S.penger, neste0 = L.neste;
      const kam0 = { x: kam.x, y: kam.y, m: kam.m }, lagret0 = localStorage.getItem('riksbrudd-varer'), meny0 = document.getElementById('leirmeny') && document.getElementById('leirmeny').classList.contains('på');
      const vent = ms => new Promise(r => setTimeout(r, ms)), stemmer = () => !VS.avvik().length;
      try {
        S.penger = Math.max(S.penger, 50e6);
        const sum = [];
        // innlegg, kjøp, salg, uttak, direkte skriving
        Leir.leggInn(L, 'tømmer', 5); sum.push(stemmer());
        KOMMANDO({ type: 'kjøpMateriale', materiale: 'stål', mengde: 6 }); sum.push(stemmer());
        KOMMANDO({ type: 'selgMateriale', materiale: 'stål', mengde: 2 }); sum.push(stemmer());
        Leir.uttak(L, 'tømmer', 1.5); sum.push(stemmer());
        L.lager.flis = (L.lager.flis || 0) + 3; VS.avstem(); sum.push(stemmer());
        ut.sum = sum.every(Boolean); ut.sumListe = sum;
        // lagertelt: nye planker under tak
        const id = L.neste++; L.bygg.push({ id, type: 'lagertelt', x: S.leir.x + 34, y: S.leir.y + 12, ret: 0, nivå: 1, hp: 1, igjen: 0, totalt: 60, pris: 2e6, mat: {} });
        const r = KOMMANDO({ type: 'lagersone', bygg: id, vare: 'tre' }); ut.sone = !!(r.ok && V.soner[id] === 'tre');
        const inneFør = VL.sum(V, 'tre', u => VL.inne(Leir, L, V, u));
        KOMMANDO({ type: 'kjøpMateriale', materiale: 'tre', mengde: 8 });
        ut.inne = VL.sum(V, 'tre', u => VL.inne(Leir, L, V, u)) >= inneFør + 8 - 1e-6 && stemmer();
        ut.ugyldigSone = !KOMMANDO({ type: 'lagersone', bygg: id, vare: 'diesel' }).ok;
        // reservering
        const e = V.e.find(u => u.v === 'tømmer');
        ut.reservering = !!(e && VS.reserver(e.id, 'vakt A').ok && VS.reserver(e.id, 'vakt B').feil && VS.hent(e.id, 'vakt B').feil && VS.hent(e.id, 'vakt A').ok && VS.hent(e.id, 'vakt A').feil && stemmer()
          && VS.lever(e.id, 'ute').ok && !e.r);
        // røverne tar bare det som ligger ute (som trekkUt i spillet-visning.js)
        Leir.leggInn(L, 'stål', 4); VS.avstem();
        const ute0 = VS.ute(), inneTre0 = VL.sum(V, 'tre', u => VL.inne(Leir, L, V, u)), inneStål0 = VL.sum(V, 'stål', u => VL.inne(Leir, L, V, u));
        const b = Spillet.Trussel.bytte({ penger: 0, lager: L.lager, diesel: L.drivstoff, mat: 0 });
        for (const [k, v] of Object.entries(b.lager)) L.lager[k] = Math.max(0, Math.round(((L.lager[k] || 0) - v) * 10) / 10); L.drivstoff = Math.max(0, L.drivstoff - b.diesel); VS.avstem();
        ut.tyveri = Object.entries(b.lager).every(([k, v]) => v <= (ute0[k] || 0) + 1e-6) && !(b.lager.tre > 0) && Math.abs(VL.sum(V, 'tre', u => VL.inne(Leir, L, V, u)) - inneTre0) < 1e-6
          && Math.abs(VL.sum(V, 'stål', u => VL.inne(Leir, L, V, u)) - inneStål0) < 1e-6 && stemmer() && Spillet.Trussel.bytte.varelager === true;
        ut.bytte = b.lager;
        // tegnes i kartet
        const tx = (V.ute || S.leir); kam.x = tx.x + 8; kam.y = tx.y - 10; kam.m = .25; skitten = true; const t0 = performance.now();
        for (let i = 0; i < 30 && !(VS.tegnetNår > t0); i++) { skitten = true; await vent(150); }
        ut.tegnet = VS.tegnetNår > t0 && VS.tegnet > 0; ut.antallTegnet = VS.tegnet;
        // fanen Lager
        if (!document.getElementById('leirmeny').classList.contains('på')) document.getElementById('leirknapp').click(); LeirSpill.fane('lager'); await vent(600);
        const boks = document.getElementById('varelager');
        ut.meny = !!(boks && boks.querySelector(`[data-plass="b${id}"] [data-sone="tre"].på`) && boks.querySelector('[data-plass="ute"]'));
      } catch (e) { ut.feil = e.message; }
      finally {
        L.bygg.length = 0; for (const b of bygg0) L.bygg.push(b); L.neste = neste0; for (const k of Object.keys(L.lager)) L.lager[k] = lager0[k] || 0; L.drivstoff = d0; S.penger = penger0;
        const V2 = VL.fraJSON(JSON.parse(V0)); V.e = V2.e; V.neste = V2.neste; V.soner = V2.soner; V.ute = V2.ute; V.tapt = V2.tapt; V.beskjeder = [];
        if (lagret0 == null) localStorage.removeItem('riksbrudd-varer'); else localStorage.setItem('riksbrudd-varer', lagret0); VS.avstem();
        kam.x = kam0.x; kam.y = kam0.y; kam.m = kam0.m; skitten = true;
        const m = document.getElementById('leirmeny'); if (m && m.classList.contains('på') !== !!meny0) document.getElementById('leirknapp').click();
        if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre();
        ut.tilbake = OppstartSpill.tilstand().penger === penger0 && L.bygg.length === bygg0.length && !VS.avvik().length && JSON.stringify(VL.tilJSON(V)) === V0;
      }
      return ut;
    });
    const ok = !d.mangler && !d.feil && d.sum && d.sone && d.inne && d.ugyldigSone && d.reservering && d.tyveri && d.tegnet && d.meny && d.tilbake;
    return { ok: !!ok, tekst: ok ? `summen stemmer, planker under tak, reservering, røverne tok bare det som lå ute (${JSON.stringify(d.bytte)}), ${d.antallTegnet} enheter tegnet, fanen Lager (${profil})` : 'FEIL: ' + JSON.stringify(d), data: d };
  },
};
