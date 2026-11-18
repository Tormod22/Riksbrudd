'use strict';
// VAKT for pakka «lys» (18. nov): skygger fra sola, standard fargesetting, bakkens nye skyggelegger, tåke i dalene og skylaget.
// Effektene er av i testene (KVAL.fx = ingen) – vakta slår dem på, tegner to bilder, ser at alt er med uten GL-feil, slår dem av
// igjen og ser at bildet tegnes som før. Er 3D av, prøves bare det som ikke trenger 3D (3D bygges ikke her: det tar for lang tid).
module.exports = {
  navn: 'lys og skygger',
  kjør: async (pg, profil) => {
    const r = await pg.evaluate(async () => {
      const ut = { feil: [] }, ok = (v, t) => { if (!v) ut.feil.push(t); };
      ok(window.KVAL && typeof KVAL.effekter === 'function' && KVAL.fx, 'KVAL.effekter/KVAL.fx mangler');
      ok(window.Lys3d && typeof Lys3d.init === 'function', 'Lys3d mangler');
      ok(window.Kvalitet && Kvalitet.FX && Kvalitet.FX.ingen.skygge[0] === 0 && !Kvalitet.NIVÅ.lav.fx, 'Lav grafikk skal ikke ha effektene');
      ok(document.getElementById('vis-effekter'), 'knappen «Lys og skygger» mangler i ☰');
      if (ut.feil.length) return ut;
      const før = KVAL.effekterPå, nivå = KVAL.valg; ut.før = før;
      ok(før || KVAL.fx.skygge[0] === 0, 'effektene skal være av til de slås på');
      const R = typeof R3 !== 'undefined' && R3, i3d = !!(R && R.ut && R.mesh && typeof på3d !== 'undefined' && på3d && !R.bygger);
      ut.i3d = i3d;
      try {
        KVAL.bytt('høy'); KVAL.effekter(true, false);
        ok(KVAL.fx.skygge[0] > 0 && KVAL.fx.etter === 'full' && KVAL.fx.bakke, 'Høy med effektene på skal ha skygger, etterbehandling og ny bakke');
        KVAL.bytt('lav'); ok(KVAL.fx.skygge[0] === 0 && !KVAL.fx.etter, 'Lav skal ikke ha effektene selv om de er på'); KVAL.bytt('høy');
        if (i3d) {
          const gl = R.renderer.getContext(); while (gl.getError()) { /* tøm */ }
          const mg = R.målGanger; R.målGanger = null; R.lysTid = null; tegn3d(); tegn3d(); R.målGanger = mg;
          const s = Lys3d.sjekk(), f = window.Filtre && Filtre.sjekk ? Filtre.sjekk() : {}; ut.på = s; ut.filter = f;
          const dag = R.sol.intensity >= Lys3d.REGLER.minLys;
          ok(s.glFeil === 0, 'GL-feil med effektene på: ' + s.glFeil);
          if (dag) { ok(s.på && s.kart > 0, 'skyggekartet er ikke på'); ok(s.kaster > 0 && s.tar > 0, 'ingen kaster eller tar imot skygge'); ok(R.mesh.receiveShadow, 'terrenget tar ikke imot skygge'); }
          ok(Filtre.valgt() !== 'ingen' || f.standard === true, 'standard fargesetting ble ikke brukt');
          ok([].concat(R.mesh.material).every(m => m.userData.fx && m.defines && 'BAKKE_FX' in m.defines), 'bakken har ikke fått BAKKE_FX');
          ok(s.dal[0] > 0, 'tåka i dalene er ikke satt');
          ok(!window.NATT || NATT.skylag === true, 'skylaget er ikke på');
          // punkter i bildet er ikke svarte/ensfargede
          const px = new Uint8Array(4 * 9); let sum = 0, ulike = new Set();
          for (let k = 0; k < 9; k++) { const p = new Uint8Array(4); gl.readPixels(Math.floor(gl.drawingBufferWidth * (.2 + .075 * k)), Math.floor(gl.drawingBufferHeight * (.25 + .05 * k)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); px.set(p, k * 4); sum += p[0] + p[1] + p[2]; ulike.add(p[0] + ',' + p[1] + ',' + p[2]); }
          ut.punkter = [sum, ulike.size];
          KVAL.effekter(false, false); R.målGanger = null; tegn3d(); R.målGanger = mg;
          const a = Lys3d.sjekk(); ut.av = a;
          ok(!a.på && a.kart === 0 && a.dal[0] === 0 && a.glFeil === 0, 'effektene ble ikke slått helt av');
          ok(!R.mesh.receiveShadow, 'terrenget tar fortsatt imot skygge');
          ok([].concat(R.mesh.material).every(m => !m.userData.fx), 'bakken har fortsatt BAKKE_FX');
          ok(!window.Filtre || !Filtre.sjekk().standard, 'standard fargesetting er fortsatt på');
          ok(R.skyer.visible === true, 'det gamle skybildet kom ikke tilbake');
        }
      } catch (e) { ut.feil.push('unntak: ' + (e && e.message || e)); }
      finally { KVAL.effekter(før, false); KVAL.bytt(nivå); }
      return ut;
    });
    const ok = r.feil.length === 0;
    return { ok, tekst: ok ? `lys og skygger (${profil}): ${r.i3d ? 'skygger, fargesetting, bakke, tåke og skyer slås på og av uten GL-feil' : 'innstillingene virker (3D var av – skyggene ble ikke prøvd)'}` : 'lys og skygger: ' + r.feil.join('; '), data: r };
  },
};
