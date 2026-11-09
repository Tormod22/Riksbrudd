/* S6 – flere enheter: regler uten DOM (Node: require('./enheter'); nettleser: globalThis.Enheter).
 * Stridsvogn (kanon og maskingevær mot lag), rakettartilleri (salve mot et punkt langt unna), radar (ser det som beveger seg på
 * åpen mark) og drone (flyr over fjellet og ser alt innen sikten til batteriet er tomt). Kjøretøyene kjører på vegnettet som
 * de andre (spill/kjoretoy.js). Alle tall er spillverdier (Claudes forslag), ikke fasit. Tid i spillsekunder, avstand i meter.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    stridsvogn: { rekkevidde: 2000, sikt: 1200, kanon: [2, .30], mg: [10, .06], mgRekkevidde: 1000 },   // [skudd per kamprunde, grunnsjanse]
    artilleri: { rekkevidde: 30000, minimum: 2000, ladetid: 3600, flytid: 60, spredning: [80, 300], radius: 150, sjanse: .5 },   // spredning: [observert, blind]
    radar: { rekkevidde: 15000, oppstart: 600 },   // ser bevegelse på åpen mark når den har stått i ro i 10 min
    drone: { fart: 120, levetid: 7200, sikt: 2500, pris: 10 },   // km/t, sekunder, meter, tonn olje
    drivstoff: { stridsvogn: { tank: 1.2, km: 450 }, rakettartilleri: { tank: .4, km: 600 }, radar: { tank: .3, km: 700 } },
    pris: { stridsvogn: 80, rakettartilleri: 90, radar: 50 }, byggetid: { stridsvogn: 4 * 3600, rakettartilleri: 4 * 3600, radar: 2 * 3600 },
    navn: { stridsvogn: 'Stridsvogn', rakettartilleri: 'Rakettartilleri', radar: 'Radarbil' },
  };
  // Kjøretøytypene for spill/kjoretoy.js (legges inn i Kjoretoy.TYPER av visningen eller testen).
  const KJORETOY = {
    stridsvogn: { navn: 'Stridsvogn', flertall: 'stridsvogner', maks: 60, lengde: 7.7, bredde: 3.6, avstand: 50, faktor: [1, 1, 1, 1, 1.1, 1.1] },
    rakettartilleri: { navn: 'Rakettartilleri', flertall: 'rakettartilleri', maks: 70, lengde: 10, bredde: 2.6, avstand: 60, faktor: [1, 1, 1.1, 1.3, 1.6, 1.6] },
    radar: { navn: 'Radarbil', flertall: 'radarbiler', maks: 70, lengde: 9, bredde: 2.5, avstand: 60, faktor: [1, 1, 1.1, 1.3, 1.6, 1.6] },
  };

  // Stridsvogn mot et lag: treff i én kamprunde. f: { målISkog, skytterPåMarsj }.
  function kanonrunde(avstand, f, rng) {
    const R = REGLER.stridsvogn; if (avstand > R.rekkevidde) return 0;
    let treff = 0;
    const skyt = ([n, p0], maks) => { if (avstand > maks) return; let p = p0 * (1 - avstand / maks);
      if (f.målISkog) p *= .5; if (f.skytterPåMarsj) p *= .5; for (let i = 0; i < n; i++) if (rng() < p) treff++; };
    skyt(R.kanon, R.rekkevidde); skyt(R.mg, R.mgRekkevidde);
    return treff;
  }

  // Artilleri: ett batteri (kjøretøy) med ladetid. Gir { feil } når det ikke kan skyte, ellers en salve { x, y, igjen } underveis.
  function avfyr(kj, mål, observert, rng) {
    const R = REGLER.artilleri, d = Math.hypot(mål[0] - kj.x, mål[1] - kj.y);
    if (kj.sti) return { feil: 'Rakettartilleriet må stå i ro for å skyte.' };
    if ((kj.lader || 0) > 0) return { feil: `Lader om: ${Math.ceil(kj.lader / 60)} min igjen.` };
    if (d > R.rekkevidde) return { feil: `For langt: ${(d / 1000).toFixed(1)} km (høyst ${R.rekkevidde / 1000} km).` };
    if (d < R.minimum) return { feil: `For nær: minst ${R.minimum / 1000} km.` };
    const s = R.spredning[observert ? 0 : 1], v = rng() * 2 * Math.PI, r = s * Math.sqrt(-2 * Math.log(1 - rng() * .999)) * .6;
    kj.lader = R.ladetid;
    return { salve: { x: mål[0] + Math.cos(v) * r, y: mål[1] + Math.sin(v) * r, mål, igjen: R.flytid, fra: kj.navn, observert } };
  }
  // Nedslaget: treff per lag (begge sider) etter avstanden fra nedslaget til laget. lag: [{ x, y, menn, her? }]. Gir [[lag, treff]].
  function nedslag(salve, lag, rng) {
    const R = REGLER.artilleri, ut = [];
    for (const s of lag) {
      const d = Math.hypot(s.x - salve.x, s.y - salve.y); if (d > R.radius) continue;
      let p = R.sjanse * (1 - d / R.radius); if (s.her && s.her.k === 1) p *= .7; if (s.nedgravd) p *= .4;
      let treff = 0; for (const m of s.menn) if (m.hp > 0 && rng() < p) treff++;
      ut.push([s, treff]);
    }
    return ut;
  }
  function lad(kj, sek) { if (kj.lader > 0) kj.lader = Math.max(0, kj.lader - sek); }

  // Radar: har stått i ro i «oppstart» sekunder, og målet beveger seg på åpen mark (ikke i skog) innenfor rekkevidden.
  function radarSer(r, e) {
    const R = REGLER.radar;
    return !r.sti && (r.iRo || 0) >= R.oppstart && !!e.sti && !(e.her && e.her.k === 1) && Math.hypot(e.x - r.x, e.y - r.y) <= R.rekkevidde;
  }
  function radarSteg(r, sek) { r.iRo = r.sti ? 0 : (r.iRo || 0) + sek; }

  // Drone: flyr rett til målet og sirkler der til batteriet er tomt.
  function nyDrone({ navn, x, y, mål }) { return { navn, x, y, mål: mål.slice(), igjen: REGLER.drone.levetid, retning: 0, fase: 'flyr' }; }
  function droneSteg(d, sek) {
    const R = REGLER.drone, v = R.fart / 3.6 * sek; d.igjen -= sek;
    if (d.igjen <= 0) { d.fase = 'tom'; return 'tom'; }
    const dx = d.mål[0] - d.x, dy = d.mål[1] - d.y, l = Math.hypot(dx, dy);
    if (l > v) { d.x += dx / l * v; d.y += dy / l * v; d.retning = Math.atan2(dy, dx); d.fase = 'flyr'; return 'flyr'; }
    d.x = d.mål[0]; d.y = d.mål[1]; const kom = d.fase === 'flyr'; d.fase = 'over målet'; return kom ? 'framme' : 'over målet';
  }
  const droneSer = (d, X, Y) => d.fase !== 'tom' && Math.hypot(X - d.x, Y - d.y) <= REGLER.drone.sikt;

  const api = { REGLER, KJORETOY, kanonrunde, avfyr, nedslag, lad, radarSer, radarSteg, nyDrone, droneSteg, droneSer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Enheter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
