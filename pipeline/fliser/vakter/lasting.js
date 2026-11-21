// VAKT «lasting» (runde 15, brukeren 21. nov: «ting laster kanskje litt sent i 3D hvis den flytter seg mye – det bør fikses»):
//  - reglene (spill/forut3d.js): en prøveflyging bestiller neste utsnitt før du er 45 % fra midten, og gir færre sekunder uten detaljer
//    enn den gamle regelen (Forut3d.simuler)
//  - i 3D: tegn3d bruker forut3d; en flyging østover (farten lagt inn i R3.forut) bestiller et utsnitt FORAN deg og ber om kartdataene
//    lenger fram (nytt3dUtsnitt og forhent3d byttes ut mens vakta går, så ingenting bygges); fjernkartet legger midten foran deg
// Uten 3D prøves bare reglene. Setter alt tilbake (R3.forut, funksjonene).
module.exports = { navn: 'lasting: neste 3D-utsnitt foran deg når du flyr', kjør: async (pg, profil) => {
  const d = await pg.evaluate(() => {
    const ut = { feil: [] }, krev = (ok, tekst) => { if (!ok) ut.feil.push(tekst); };
    const F3 = window.Forut3d; krev(F3 && F3.plan && F3.simuler, 'spill/forut3d.js (Forut3d) mangler'); if (!F3) return ut;
    krev(typeof forut3d === 'function' && /forut3d\(R, u, b, S\)/.test(tegn3d.toString()), 'tegn3d bruker ikke forut3d');
    // prøveflyging: 45 m/s, 30 s byggetid – den gamle regelen er 50 s utenfor utsnittet
    const g = F3.simuler({ v: 45, T: 30, gammel: true }), n = F3.simuler({ v: 45, T: 30 });
    ut.prøve = { gammel: g, ny: n };
    krev(n.første !== null && n.første < .45, `første utsnitt bestilt først ved ${n.første} av halvsida (skal være før 0,45)`);
    krev(n.ute < g.ute, `flyging gir ikke færre sekunder uten detaljer (${g.ute} -> ${n.ute})`);
    const R = typeof R3 !== 'undefined' && R3 && R3.ut && på3d ? R3 : null; ut.i3d = !!R;
    if (!R) return ut;
    // i 3D: du står 20 % øst for midten og flyr østover i 50 m/s, byggetiden 20 s
    const u = R.ut, b = R.bane, S = utsnittS(b.avst), før = { forut: R.forut, forutT: R.forutT, bx: b.x, by: b.y, bestilt: R.forutBestilt, fh: R.forhentNr },
      nyttF = nytt3dUtsnitt, fhF = forhent3d, kall = [], hent = [];
    try {
      nytt3dUtsnitt = (cx, cy, s) => { kall.push([cx, cy, s]); };
      forhent3d = (cx, cy, s, bb, mer) => { hent.push([cx, cy, mer]); };
      b.x = .2 * u.S; b.y = 0; const F = R.forut = F3.ny(); F.x = u.cx + b.x; F.y = u.cy; F.vx = 50; F.vy = 0; F.tid = 20; R.forutT = performance.now() / 1000;
      if (!R.bygger) { forut3d(R, u, b, S);
        krev(kall.length === 1, 'ingen bestilling av neste utsnitt når du flyr fort (' + kall.length + ')');
        if (kall[0]) { ut.bestilt = { foran: Math.round(kall[0][0] - (u.cx + b.x)), sidelengs: Math.round(kall[0][1] - u.cy) };
          krev(kall[0][0] > u.cx + b.x + .2 * S && Math.abs(kall[0][1] - u.cy) < 50, 'neste utsnitt ligger ikke foran deg i fartsretningen: ' + JSON.stringify(ut.bestilt)); }
        krev(hent.length === 1 && hent[0][2] === true && (!kall[0] || hent[0][0] > kall[0][0]), 'kartdataene lenger fram bes ikke om (forhent3d med mer)');
      } else ut.hoppet = 'bygger';
      // fjernkartet: midten foran deg
      if (window.Fjernkart3d && Fjernkart3d.midten) { const m = Fjernkart3d.midten(R); krev(m[0] > u.cx + b.x + 100, 'fjernkartet legger ikke midten foran deg'); }
      // står du stille, skal ingenting bestilles (den gamle regelen gjelder)
      kall.length = 0; R.forut = F3.ny(); R.forut.x = u.cx + b.x; R.forut.y = u.cy; R.forutT = performance.now() / 1000; if (!R.bygger) { forut3d(R, u, b, S); krev(kall.length === 0, 'bestilte et utsnitt uten fart'); }
    } finally { nytt3dUtsnitt = nyttF; forhent3d = fhF; R.forut = før.forut; R.forutT = før.forutT; b.x = før.bx; b.y = før.by; R.forutBestilt = før.bestilt; R.forhentNr = før.fh; }
    return ut;
  });
  return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : `ok (prøveflyging uten detaljer ${d.prøve.gammel.ute} -> ${d.prøve.ny.ute} s${d.i3d ? ', bestilt ' + (d.bestilt ? d.bestilt.foran + ' m foran deg' : d.hoppet) : ', uten 3D'})`, data: d };
} };
