// Vakt for pakka «kjøring» (runde 10, 20. nov kveld, brukerens bilder 3–5: bilen vippet på skrå/på siden, to knapper «Brems»,
// «Gå ut» midt i bildet, en lys strek over bilen). Prøver reglene for stillingen på fire hjul, knappene på telefonen og – når 3D er
// på – at feltbilen der den står i leiren vises uten mer helling enn den tåler og uten hjul under bakken.
// Endrer ingenting varig: klassen «kjorbil» settes bare et øyeblikk og tas bort igjen; bilen flyttes ikke.
module.exports = {
  navn: 'kjoring',
  kjør: async (pg, profil) => pg.evaluate(async () => {
    const feil = [], data = {}, K = window.Kjor, KS = window.KjorSpill;
    if (!K || !K.stilling || !KS) return { ok: false, tekst: 'Kjor.stilling eller KjorSpill mangler', data };
    const S = K.STILLING;
    // 1) reglene: flat, bratt sideheng (vinkelen begrenses), en kant under ett hjulpar, ingen hjul under bakken
    const under = (p, h) => { const hj = K.hjulHøyder(0, 0, 0, h); return [[1, 1], [1, -1], [-1, 1], [-1, -1]].some(([sx, sy], n) => p.z + (-sx * S.hx * Math.sin(p.stigning) + sy * S.hy * Math.sin(p.side) * Math.cos(p.stigning)) < hj[n] - 1e-6); };
    for (const [navn, h] of [['flat', () => 2], ['sideheng 50°', x => -x * 1.2], ['bakke 45°', (x, y) => y], ['kant 2 m', x => (x > .5 ? 2 : 0)]]) {
      const p = K.stilling(0, 0, 0, h); if (Math.abs(p.side) > S.maksSide + 1e-9 || Math.abs(p.stigning) > S.maksStigning + 1e-9) feil.push(navn + ': bilen vippes mer enn den tåler');
      if (under(p, h)) feil.push(navn + ': et hjul står under bakken'); }
    // 2) for bratt opp: bilen stopper; langs et for bratt sideheng: kryper, sitter ikke fast
    { const flat = { høyde: () => 0, hindring: () => false, vann: () => false, vei: () => false }, k = { x: 0, y: 0, z: 0, a: -Math.PI / 2, v: 0 };
      for (let t = 0; t < 5; t += .02) K.bilSteg(k, { gass: 1 }, .02, { ...flat, høyde: x => Math.max(0, x - 3) }); if (k.x > 4.5) feil.push('kjører rett opp en 45° bakke');
      const s = { x: 0, y: 0, z: 0, a: 0, v: 0 }; for (let t = 0; t < 4; t += .02) K.bilSteg(s, { gass: 1 }, .02, { ...flat, høyde: x => -x * .7 }); if (!(s.y > 4)) feil.push('setter seg fast i et sideheng'); data.sideheng = +s.y.toFixed(1); }
    // 3) knappene på telefonen: Gå ut, Brems, Gass i raden nede til høyre (Huk/Hopp skjult) mens du kjører bil
    { const mk = document.getElementById('gangeknapper'), ped = mk ? [...mk.querySelectorAll('.pedal')] : [];
      data.pedaler = ped.map(b => b.textContent);
      if (ped.length !== 3 || !/Gå ut/.test(data.pedaler[0]) || !/Brems/.test(data.pedaler[1]) || !/Gass/.test(data.pedaler[2])) feil.push('knappene Gå ut / Brems / Gass mangler');
      const før = document.body.classList.contains('kjorbil'); document.body.classList.add('kjorbil');
      const vis = mk ? [...mk.children].map(b => getComputedStyle(b).display) : []; if (!før) document.body.classList.remove('kjorbil');
      data.visning = vis; if (mk && (vis.filter(d => d !== 'none').length !== 3 || ped.some(b => getComputedStyle(b).display === 'none' && false))) feil.push('i bilen vises ikke akkurat de tre bilknappene'); }
    // 4) i 3D: feltbilen der den står – helling innenfor grensene, ingen hjul under terrengnettet
    const R = typeof R3 !== 'undefined' ? R3 : null;
    if (R && R.ut && typeof på3d !== 'undefined' && på3d && typeof THREE !== 'undefined' && typeof nettHoyde === 'function') {
      for (const f of KROKER.ramme3d) { try { f(R); } catch (e) { /* andre moduler */ } }
      const u = R.ut, bil = KS.liste().find(k => k.type === 'bil');
      if (bil && bil.m && bil.m.visible) { const m = bil.m, x = bil.X - u.cx, y = bil.Y - u.cy;
        data.bil = { side: +(m.rotation.x * 57.3).toFixed(1), stigning: +(m.rotation.y * 57.3).toFixed(1) };
        if (Math.abs(m.rotation.x) > S.maksSide + 1e-6 || Math.abs(m.rotation.y) > S.maksStigning + 1e-6) feil.push('feltbilen i 3D vippes mer enn den tåler');
        m.updateMatrixWorld(true); let lavest = Infinity; const v = new THREE.Vector3();
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { v.set(sx * S.hx, sy * S.hy, 0).applyMatrix4(m.matrixWorld); lavest = Math.min(lavest, v.z - nettHoyde(u, v.x, v.y)); }
        data.bil.lavesteHjul = +lavest.toFixed(2); if (lavest < -.25) feil.push(`et hjul står ${(-lavest).toFixed(2)} m under bakken`); }
      else data.bil = 'ikke i utsnittet';
    } else data.bil = '3D av – bare reglene prøvd';
    return { ok: !feil.length, tekst: feil.length ? feil.join('; ') : 'bilen står på fire hjul, knappene er riktige', data };
  }),
};
