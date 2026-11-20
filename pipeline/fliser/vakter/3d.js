// VAKT «3d» (runde 12, 21. nov natt, kritikken E: «3D ser fortsatt ut som en prototype»):
//  - grafikknivået går bare ned ved vedvarende tregt (ikke under/rett etter bygging), oppløsningen først, og Lav har gress og blomster
//  - den enkle bakken (Lav) har korn og flekker fra detaljmønsteret (skyggeleggeren får detaljteksturen)
//  - låven: avrundet traktor og høyballer og lysstråler som egne nett (Lave3d.prøvNett på en prøvelåve)
//  - flagget i leiren er et ekte 3D-flagg som blafrer (Flagg3d), stedsnavn i gåmodus bare langt unna (NAVN_GÅ)
// Uten 3D prøves bare reglene. Endrer ingenting i spillet (prøvenettene frigjøres straks).
module.exports = { navn: '3d: grafikknivå, enkel bakke, låven, flagget og navnene', kjør: async (pg, profil) => {
  const d = await pg.evaluate(async () => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    krev(window.Kvalitet && Kvalitet.vedvarende && window.KVAL, 'Kvalitet.vedvarende mangler');
    if (ut.feil.length) return ut;
    // reglene: 10 s sammenhengende tregt mens noe skjer; ikke under bygging og 8 s etter; oppløsningen senkes først
    { const v = { nivå: 'høy' }, T = (nå, o = {}) => Kvalitet.vedvarende(v, { ms: 30, skala: .6, nå, aktiv: true, bygger: false, ...o });
      krev(!T(0) && !T(5) && T(11), 'vedvarende: ikke tregt etter 10 s');
      krev(!T(20, { bygger: true }) && !T(25) && !T(27), 'vedvarende: slo til under eller rett etter bygging');
      const s = { nivå: 'høy' }; krev(Kvalitet.neste(s, 60, 1, 100) === 'høy', 'nivået gikk ned før oppløsningen');
      krev(Kvalitet.neste({ nivå: 'høy' }, 30, .6, 100, false) === 'høy', 'nivået gikk ned uten at det var tregt lenge');
      krev(Kvalitet.NIVÅ.lav.gress > 0 && Kvalitet.NIVÅ.lav.blomster, 'Lav fjerner gress eller blomster'); }
    krev(typeof NAVN_GÅ === 'object' && NAVN_GÅ.min >= 300 && NAVN_GÅ.bredde > 0, 'NAVN_GÅ (navn i gåmodus) mangler');
    const R = typeof R3 !== 'undefined' && R3 && R3.ut && på3d ? R3 : null; ut.i3d = !!R;
    if (!R || typeof THREE === 'undefined') return ut;
    // den enkle bakken: skyggeleggeren får detaljteksturen og bruker den
    { const mat = new THREE.MeshLambertMaterial(); enkelBakke(mat, 4000); const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader };
      mat.onBeforeCompile(sh); krev(sh.uniforms.detalj && sh.uniforms.detalj.value && /kornE/.test(sh.fragmentShader) && /vAvstE = -mvPosition\.z/.test(sh.vertexShader), 'den enkle bakken har ikke detaljmønsteret'); mat.dispose(); }
    // låven: prøvelåve 20 × 12 m med traktor og høyballer
    if (window.Lave3d && Lave3d.prøvNett && window.Interior && window.Kjoretoy3d) {
      const P = [[0, 0], [20, 0], [20, 12], [0, 12]], plan = Interior.plan(P, { i: 4243, kl: 'låve', h: 8, dør: { x: 10, y: 0, ux: 1, uy: 0, w: 3 } }); plan.gulv = 0;
      const r = Lave3d.prøvNett(plan); ut.låve = r;
      krev(r && r.tall, 'låvenettet har ugyldige tall');
      krev(r && r.barn >= 3, 'låven mangler avrundet traktor, høyballer eller lysstråler (' + (r ? r.barn : 'ingen') + ' nett)');
      krev(Lave3d.tegner && Lave3d.tegner.traktor && Lave3d.tegner.høyball, 'Lave3d.tegner mangler');
    } else krev(false, 'Lave3d/Interior/Kjoretoy3d mangler');
    // flagget: finnes når leiren er i utsnittet, og duka beveger seg
    const S = window.OppstartSpill && OppstartSpill.tilstand();
    if (S && S.leir && Math.abs(S.leir.x - R.ut.cx) < R.ut.S && Math.abs(S.leir.y - R.ut.cy) < R.ut.S && window.Flagg3d) {
      const duk = Flagg3d.duk(); krev(duk && duk.parent && duk.material.map, 'flagget i 3D mangler (duk med flaggbildet)');
      if (duk) { const a = Float32Array.from(duk.geometry.attributes.position.array); duk.userData.sist = -1; for (const f of KROKER.ramme3d) { try { f(R); } catch (e) { /* andre kroker */ } }
        await new Promise(r => setTimeout(r, 120)); duk.userData.sist = -1; for (const f of KROKER.ramme3d) { try { f(R); } catch (e) { /* andre kroker */ } }
        const b = duk.geometry.attributes.position.array; let maks = 0; for (let i = 0; i < a.length; i++) maks = Math.max(maks, Math.abs(a[i] - b[i])); ut.blafrer = +maks.toFixed(3);
        krev(maks > .002, 'flagget blafrer ikke'); }
      ut.flaggdeler = Flagg3d.deler();
    }
    return ut;
  });
  const ok = !d.feil.length;
  return { ok, tekst: ok ? `grafikknivå (vedvarende, oppløsning først, Lav med gress), ${d.i3d ? `enkel bakke med detaljer, låve med ${d.låve ? d.låve.barn : '?'} avrundede nett, flagg${d.blafrer != null ? ' som blafrer (' + d.blafrer + ' m)' : ' (ikke i utsnittet)'}` : 'uten 3D (bare reglene)'} (${profil})` : d.feil.join('; '), data: d };
} };
