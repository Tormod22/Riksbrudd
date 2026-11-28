/* INDUSTRIMASKINENE: modellene, produksjonslinjene og symbolene (28. nov, ut9-maskiner). Regler uten DOM
 * (Node: require('./maskiner'); nettleser: globalThis.Maskiner – lastes rett FØR spill/industri.js, som henter alt herfra).
 * Brukeren: «flere forskjellige maskiner til industri … et system som kan ha forskjellige industrimaskiner til forskjellige industribygg».
 *
 *  - MASKINER[type] = [bredde (langs flyten/veggen), dybde, høyde, sperrer, navn] – nye maskiner og nye mål (industri.js slår dem sammen
 *    med sine egne, og Industri.koble legger dem i Interior.MØBLER).
 *  - MODELLER[type] = (m, k, b, d, h) – 3D-modellen av maskinen som kasser og sylindre i møbelets akser (x langs bredden −b … b, y fra
 *    ryggen −d til fronten d, z opp), samme k(x0, x1, y0, y1, z0, z1, farge, stoff, rund) som spill/interior3d.js. Gjenkjennelige
 *    former av felles byggeklosser (liggende sylinder, skive, bein, rekkverk), 60–400 trekanter per maskin. Erstatter kassemodellene
 *    i Industri.MODELLER.
 *  - LINJER[rolle]: produksjonslinja i hallen (råvare inn ved porten -> maskinene -> ferdigvare). Steget ['linje', liste, …] i
 *    oppskriftene (interior.js plasserer det, se «linje» der); i lista betyr '?type' at maskinen bare står der i noen bygg, og
 *    ['a', 'b'] at bygget har én av dem – fast per bygg (byggets nummer).
 *  - SYMBOL[type]: tegnet i plantegningen (2D): 'sag', 'bånd', 'tank', 'sylinder', 'knuser', 'haug', 'kar', 'krok', 'reol', 'skap',
 *    'pult', 'vifte', 'flamme', 'båt', 'valse', 'hjul', 'kryss'. Tegnes av Industri.tegn2d (industri-visning.js).
 *  - LIV[type]: delene som beveger seg når maskinen går (spill/maskiner3d.js): sagblad som roterer, bånd som går, røyk fra pipa.
 * ALLE TALL ER CLAUDES FORSLAG.
 */
(function (rot) {
  'use strict';

  // ---------- fargene ----------
  const C = { stål: [.66, .68, .7], rustfri: [.8, .82, .84], mørk: [.16, .16, .18], grå: [.42, .43, .45], gul: [.86, .66, .12], oransje: [.88, .42, .1], rød: [.72, .16, .12],
    grønn: [.24, .44, .3], mgrønn: [.2, .34, .26], blå: [.24, .38, .58], lblå: [.5, .66, .8], hvit: [.9, .9, .88], tre: [.72, .56, .36], tømmer: [.5, .36, .22], bark: [.34, .25, .17],
    rust: [.48, .32, .22], stein: [.58, .56, .52], pukk: [.5, .5, .48], is: [.84, .92, .97], kobber: [.72, .44, .26], betong: [.62, .62, .6], gummi: [.1, .1, .11],
    kjøtt: [.74, .36, .32], fett: [.9, .82, .72], glass: [.55, .7, .78], plast: [.86, .86, .8], skjerm: [.06, .14, .12], lampeG: [.2, .8, .3], lampeR: [.85, .15, .1] };

  // ---------- byggeklosser ----------
  // stående sylinder (8 kanter) med midte (cx, cy) og radius r
  const S = (k, cx, cy, r, z0, z1, f, st) => k(cx - r, cx + r, cy - r, cy + r, z0, z1, f, st || 'glatt', true);
  // liggende sylinder langs x: åttekant av tre kasser (tverrsnitt i yz med midte (cy, cz))
  const LX = (k, x0, x1, cy, cz, r, f, st) => { const c = r * .41, e = r * .71; k(x0, x1, cy - r, cy + r, cz - c, cz + c, f, st); k(x0, x1, cy - c, cy + c, cz - r, cz + r, f, st); k(x0, x1, cy - e, cy + e, cz - e, cz + e, f, st); };
  // liggende sylinder langs y (tverrsnitt i xz)
  const LY = (k, y0, y1, cx, cz, r, f, st) => { const c = r * .41, e = r * .71; k(cx - r, cx + r, y0, y1, cz - c, cz + c, f, st); k(cx - c, cx + c, y0, y1, cz - r, cz + r, f, st); k(cx - e, cx + e, y0, y1, cz - e, cz + e, f, st); };
  // fire bein under en flate (x0 … x1, y0 … y1) opp til z
  const bein = (k, x0, x1, y0, y1, z, f, q) => { q = q || .08; for (const x of [x0, x1 - q]) for (const y of [y0, y1 - q]) k(x, x + q, y, y + q, 0, z, f || C.mørk); };
  // rekkverk langs x (y fast) med stolper hver 1,2 m
  const rekkX = (k, x0, x1, y, z, f) => { f = f || C.gul; k(x0, x1, y - .03, y + .03, z + 1, z + 1.05, f); k(x0, x1, y - .02, y + .02, z + .5, z + .54, f); for (let x = x0; x <= x1 + .01; x += Math.max(.6, (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 1.2)))) k(x - .025, x + .025, y - .025, y + .025, z, z + 1.05, f); };
  // stige (loddrett) på en side
  const stige = (k, x, y, z0, z1, f) => { f = f || C.gul; k(x - .22, x - .18, y - .02, y + .02, z0, z1, f); k(x + .18, x + .22, y - .02, y + .02, z0, z1, f); for (let z = z0 + .3; z < z1; z += .3) k(x - .2, x + .2, y - .015, y + .015, z, z + .03, f); };
  // flens/ring rundt en stående sylinder
  const ring = (k, cx, cy, r, z, f) => S(k, cx, cy, r + .04, z, z + .07, f || C.grå);
  // motor (liggende sylinder med vifteskjerm)
  const motor = (k, x0, x1, cy, cz, r, f) => { LX(k, x0, x1, cy, cz, r, f || C.blå); k(x0 - .04, x0, cy - r * .8, cy + r * .8, cz - r * .8, cz + r * .8, C.mørk); k(x0 + (x1 - x0) * .3, x0 + (x1 - x0) * .7, cy - r * .5, cy + r * .5, cz - r - .12, cz - r + .02, C.mørk); };
  // skjerm/panel på fronten (y = d)
  const panel = (k, x0, x1, z0, z1, y, f) => { k(x0, x1, y, y + .03, z0, z1, f || C.skjerm); };
  // tilfeldig tall 0–1 fast per møbel og nummer
  const rf = (m, n) => { const v = Math.sin(((m.f || 0) + 1.7) * (n + 1) * 77.3) * 4375.85; return v - Math.floor(v); };

  // ---------- MASKINENE: [bredde, dybde, høyde, sperrer, navn] (nye og nye mål) ----------
  const MASKINER = {
    // tømmer
    tømmerbord: [5, 3.2, 1.1, 1, 'Tømmerbord med kjeder'], barkemaskin: [4.2, 2, 2.2, 1, 'Barkemaskin'], rammesag: [3, 2.8, 3.6, 1, 'Rammesag'],
    stokkbåndsag: [3.4, 2.6, 3.4, 1, 'Båndsag for tømmer'], flishogger: [2.6, 2, 2.4, 1, 'Flishogger'], tørkekammer: [6, 4.4, 3.6, 1, 'Tørkekammer'],
    // trevare
    høvel: [2.6, 1.4, 1.4, 1, 'Høvelmaskin'], cncfres: [4.4, 2.6, 2.4, 1, 'CNC-fres'],
    // olje
    destillasjonskolonne: [2.4, 2.4, 5.6, 1, 'Destillasjonskolonne'], varmeveksler: [3.6, 1.4, 1.8, 1, 'Varmeveksler'], pumpestasjon: [2.6, 1.6, 1.6, 1, 'Pumpestasjon'],
    rørbro: [6, 1.2, 3.2, 1, 'Rørbro'],
    // gass
    separator: [2, 2, 4.2, 1, 'Separator'], fakkel: [1.6, 1.6, 5.2, 1, 'Fakkel (avbrenning)'],
    // stein
    kjegleknuser: [2.6, 2.6, 3, 1, 'Kjegleknuser'], pukkhaug: [5, 5, 2.4, 1, 'Pukkhaug'],
    // fisk
    sløyelinje: [6, 1.4, 1.3, 1, 'Sløyelinje'], ismaskin: [1.6, 1.4, 2.4, 1, 'Iskvern'], platefryser: [3, 1.6, 2.4, 1, 'Platefryser'], fiskekar: [1.4, 1.2, .9, 1, 'Fiskekar'],
    // mat
    pasteur: [2.4, 1.2, 2, 1, 'Pasteur'], kjøttskinne: [6, 1.2, 3, 1, 'Kjøttkroker på skinne'], deigelter: [1.6, 1.2, 1.6, 1, 'Deigelter'],
    // metall
    fres: [1.8, 1.8, 2.2, 1, 'Fresemaskin'], kantpresse: [3.4, 1.6, 2.6, 1, 'Kantpresse'], sveisebord: [2.4, 1.2, .9, 1, 'Sveisebord'],
    // verft
    platevalse: [3.6, 1.4, 1.6, 1, 'Platevalse'],
    // kraft
    turbin: [4, 3, 2.6, 1, 'Turbin'], kontrollpult: [3, 1.2, 1.3, 1, 'Kontrollpult'],
    // lager
    rullebane: [5, 1, .8, 1, 'Rullebane'],
    // gjenvinning
    sorteringsbånd: [7, 2.4, 2.4, 1, 'Sorteringsbånd'],
    // bryggeri (høyere: fyllekarusellen står over båndet)
    tappelinje: [6, 1.2, 2.2, 1, 'Tappelinje'],
    // kjemi
    rørstativ: [4, 1, 2.6, 1, 'Rørstativ'], nøddusj: [1, 1, 2.4, 0, 'Nøddusj og øyeskyll'],
  };

  // ---------- MODELLENE ----------
  const MODELLER = {
    // ===== TØMMER OG SAGBRUK =====
    // tømmerstabel: stokker i lag med bark og lyse endeflater, kryssbjelker under
    tømmerstabel: (m, k, b, d, h) => { for (const y of [-d * .7, d * .7]) k(-b, b, y - .1, y + .1, 0, .14, C.tømmer, 'tre');
      for (let z = .14, j = 0; z < h - .1; z += .36, j++) for (let y = -d + .22 + (j % 2) * .2; y < d - .1; y += .46) { const r = .16 + rf(m, j * 7 + y) * .03, x0 = -b + rf(m, y + j) * .3, x1 = b - rf(m, j + 2 * y) * .3;
        // stokken som kryss av to kasser (billigere enn LX – stabelen har mange)
        const f = j % 2 ? C.bark : C.tømmer; k(x0, x1, y - r, y + r, z + r * .45, z + r * 1.55, f, 'tre'); k(x0, x1, y - r * .55, y + r * .55, z, z + r * 2, f, 'tre');
        // lyse endeflater (sagsnittet) i begge ender
        for (const x of [x0 - .015, x1]) k(x, x + .015, y - r * .8, y + r * .8, z + r * .2, z + r * 1.8, [.8, .66, .46], 'tre'); } },
    // tømmerbord: stålramme på bein, tre kjeder på tvers som drar stokkene fram, to stokker på
    tømmerbord: (m, k, b, d, h) => { k(-b, b, -d, -d + .2, h - .25, h - .05, C.gul); k(-b, b, d - .2, d, h - .25, h - .05, C.gul); bein(k, -b, b, -d, d, h - .25, C.gul, .14);
      for (const x of [-b * .7, 0, b * .7]) { k(x - .14, x + .14, -d, d, h - .2, h, C.grå); k(x - .1, x + .1, -d, d, h, h + .04, C.mørk); for (let y = -d + .2; y < d; y += .5) k(x - .12, x + .12, y, y + .06, h + .04, h + .1, C.mørk); }
      for (const [y, r] of [[-d * .4, .2], [d * .2, .17]]) LX(k, -b + .1, b - .1, y, h + .1 + r, r, C.bark, 'tre'); },
    // barkemaskin: rotorring som stokken går gjennom, mateskinner inn og ut, motor ved siden
    barkemaskin: (m, k, b, d, h) => { const cz = 1.15, R = .85; k(-b * .3, b * .3, -d * .8, d * .8, 0, .3, C.grå);
      for (const [y0, y1, z0, z1] of [[-R, R, cz + R - .18, cz + R], [-R, R, cz - R, cz - R + .18], [-R, -R + .18, cz - R, cz + R], [R - .18, R, cz - R, cz + R]]) k(-.35, .35, y0, y1, z0, z1, C.rød);
      for (const s of [-1, 1]) for (const t of [-1, 1]) k(-.3, .3, s * R * .62 - .12, s * R * .62 + .12, cz + t * R * .62 - .12, cz + t * R * .62 + .12, C.rød);
      k(-.36, .36, -.25, .25, .3, .42, C.grå); k(-.4, .4, -R, R, cz - .02, cz + .02, C.mørk);
      for (const s of [-1, 1]) { k(s > 0 ? .45 : -b, s > 0 ? b : -.45, -.3, .3, .5, .75, C.gul); for (let x = s * .7; Math.abs(x) < b - .1; x += s * .45) LY(k, -.28, .28, x, .82, .07, C.grå); k(s > 0 ? b - .2 : -b, s > 0 ? b : -b + .2, -.3, .3, 0, .5, C.gul); }
      motor(k, -.4, .5, d * .75, .55, .3, C.mgrønn); LX(k, -.2, .2, -d + .2, .3, .2, C.gul); },
    // rammesag: to høye søyler, svinghjulskasse på toppen, sagramme med mange blad, materuller foran og bak
    rammesag: (m, k, b, d, h) => { k(-b, b, -d * .6, d * .6, 0, .5, C.grå, 'betong'); for (const s of [-1, 1]) k(s * b * .55 - .25, s * b * .55 + .25, -d * .45, d * .45, .5, h - .5, C.blå);
      k(-b * .8, b * .8, -d * .5, d * .5, h - .7, h, C.blå); LY(k, -d * .55, -d * .5, 0, h - .35, .45, C.mørk); k(-.2, .2, -d * .3, d * .3, h - .9, h - .7, C.stål);
      k(-b * .45, b * .45, -.25, .25, 1.6, 1.75, C.stål); k(-b * .45, b * .45, -.25, .25, 2.5, 2.65, C.stål); for (let x = -b * .4; x <= b * .4; x += .22) k(x - .01, x + .01, -.2, .2, 1.75, 2.5, C.rustfri);
      for (const y of [-d * .8, d * .8]) { k(-b * .4, b * .4, y - .1, y + .1, .5, .9, C.gul); LX(k, -b * .35, b * .35, y, 1.05, .15, C.grå); }
      LX(k, -b * .4, b * .4, -d + .1, 1.35, .18, C.bark, 'tre'); rekkX(k, -b, -b * .6, d * .6, .5); },
    // båndsag for tømmer: stor C-ramme med to hjulkasser, bladet mellom, vogn på skinner
    stokkbåndsag: (m, k, b, d, h) => { k(-b * .25, b * .25, -d * .2, d * .3, 0, .6, C.grå, 'betong'); k(-.35, .35, -d * .1, .3, .6, h - .2, C.oransje);
      for (const z of [1, h - .8]) { LY(k, -d * .2, .5, 0, z, .62, C.oransje); }
      k(-.02, .02, -d * .45, -d * .2, 1, h - .8, C.rustfri); k(-.45, .45, -d * .45, -d * .2, 1.25, 1.35, C.stål);
      for (const s of [-1, 1]) k(-b, b, s * .2 - d * .5 - .06, s * .2 - d * .5 + .06, 0, .12, C.grå); k(-b * .7, -b * .1, -d * .8, -d * .25, .12, .5, C.gul);
      LX(k, -b * .8, b * .1, -d * .5, .8, .28, C.bark, 'tre'); motor(k, .3, 1.1, d * .6, .4, .28); },
    // kantverk: rullebord inn, to sirkelsagblad under gul kappe, bord ut
    kantverk: (m, k, b, d, h) => { bein(k, -b, b, -d * .7, d * .7, .7, C.mørk, .1); k(-b, b, -d * .7, d * .7, .7, .78, C.grå);
      for (let x = -b + .25; x < b - .1; x += .4) LY(k, -d * .65, d * .65, x, .85, .06, C.stål);
      k(-.6, .6, -d, d, .78, h, C.gul); k(-.62, .62, -d - .02, d + .02, h - .12, h, C.oransje); for (const y of [-d * .35, d * .35]) k(-.45, .45, y - .02, y + .02, .6, 1.1, C.rustfri);
      k(.6, 1.1, d * .4, d, .78, 1.6, C.grå); panel(k, .7, 1, 1.1, 1.45, d, C.skjerm); },
    // transportbånd: gummibånd med sidelister, endeskiver, bein og motor i den ene enden
    transportbånd: (m, k, b, d, h) => { const z = h - .2; k(-b, b, -d + .08, d - .08, z, z + .06, C.gummi, 'tøy'); for (const s of [-1, 1]) k(-b, b, s * (d - .04) - .04, s * (d - .04) + .04, z - .12, z + .14, C.grå);
      for (const x of [-b + .15, b - .15]) LY(k, -d + .1, d - .1, x, z - .02, .14, C.stål); for (let x = -b + .4; x < b - .2; x += 1.3) { k(x, x + .06, -d + .05, -d + .11, 0, z - .1, C.mørk); k(x, x + .06, d - .11, d - .05, 0, z - .1, C.mørk); k(x, x + .06, -d + .05, d - .05, .2, .26, C.mørk); }
      motor(k, b - .45, b - .05, d + .12, z - .2, .14, C.blå); },
    // flishogger: matetrakt, liggende trommel, blåserør opp og bort
    flishogger: (m, k, b, d, h) => { k(-b * .2, b * .6, -d * .7, d * .7, 0, .4, C.mørk); LY(k, -d * .5, d * .5, b * .2, 1, .6, C.grønn); k(b * .1, b * .3, -d * .55, d * .55, .4, .6, C.grønn);
      k(-b, -b * .3, -d * .5, d * .5, .9, 1.05, C.grønn); k(-b, -b * .95, -d * .5, d * .5, 1.05, 1.5, C.grønn); for (const s of [-1, 1]) k(-b, -b * .3, s * d * .5 - .04, s * d * .5 + .04, 1.05, 1.5, C.grønn);
      S(k, b * .35, 0, .16, 1.5, h - .2, C.grå); k(b * .35 - .16, b, -.16, .16, h - .36, h - .04, C.grå); k(b - .3, b, -.24, .24, h - .5, h - .3, C.grå);
      motor(k, b * .5, b, -d * .55, .7, .3, C.blå); LX(k, -b * .9, -b * .3, 0, 1.25, .16, C.bark, 'tre'); },
    // tørkekammer: isolert stålboks med store dører og vifter på taket, plank stablet foran
    tørkekammer: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h - .4, C.hvit); for (let x = -b; x <= b; x += 1.2) k(x - .02, x + .02, d, d + .03, 0, h - .4, C.grå);
      for (const s of [-1, 1]) { k(s > 0 ? .04 : -b + .2, s > 0 ? b - .2 : -.04, d + .03, d + .08, .1, h - .6, C.lblå); k(s * .3 - .04, s * .3 + .04, d + .08, d + .12, h * .4, h * .55, C.mørk); }
      for (const x of [-b * .5, 0, b * .5]) { S(k, x, 0, .5, h - .4, h - .1, C.grå); S(k, x, 0, .3, h - .1, h, C.mørk); }
      k(-b + .1, -b + 1.5, d - .1, d, h - .7, h - .5, C.lampeG); },
    // ===== TREVARE OG SNEKKER =====
    høvel: (m, k, b, d, h) => { k(-b * .5, b * .5, -d * .6, d * .5, 0, .85, C.grønn); for (const s of [-1, 1]) { k(s > 0 ? b * .5 : -b, s > 0 ? b : -b * .5, -d * .4, d * .4, .82, .88, C.stål); }
      k(-b * .5, b * .5, -d * .6, d * .5, .85, h - .2, C.mgrønn); k(-b * .45, b * .45, -d * .5, d * .4, h - .2, h, C.grønn); S(k, 0, -d * .4, .14, h, h + .6, C.grå); LX(k, -b * .45, b * .45, .1, 1.05, .1, C.rustfri);
      panel(k, b * .2, b * .45, 1, 1.25, d * .5, C.skjerm); k(b * .3, b * .38, d * .5, d * .55, .5, .6, C.rød); },
    bordsag: (m, k, b, d, h) => { k(-b * .7, b * .7, -d * .7, d * .7, 0, h - .08, C.mgrønn); k(-b, b, -d, d, h - .08, h, C.stål); k(-.02, .02, -.35, .35, h - .3, h + .14, C.rustfri);
      k(-b * .9, b * .9, d * .5, d * .56, h, h + .08, C.gul); k(-.15, .15, -.3, .3, h + .3, h + .42, C.oransje); k(-.04, .04, -.04, .04, h + .42, h + 1.4, C.grå); k(-.6, .6, -.08, .08, h + 1.3, h + 1.4, C.grå);
      k(b * .5, b * .7, d * .7, d * .75, .4, .6, C.rød); },
    båndsag: (m, k, b, d, h) => { k(-b * .4, b * .4, -d * .4, d * .4, 0, .9, C.grønn); k(-b, b, -d, d, .9, .95, C.stål); k(-b * .7, -b * .3, -d * .3, d * .3, .95, h - .2, C.grønn);
      for (const z of [.95 + .32, h - .4]) LY(k, -d * .3, d * .3, 0, z, .4, C.grønn); k(-.01, .01, -.05, .05, .95, h - .5, C.rustfri); k(-.08, .08, -.08, .08, 1.3, 1.5, C.grå); },
    cncfres: (m, k, b, d, h) => { bein(k, -b, b, -d * .8, d * .8, .8, C.grå, .16); k(-b, b, -d * .8, d * .8, .8, .95, C.mørk); for (let x = -b + .3; x < b; x += .4) k(x, x + .04, -d * .75, d * .75, .95, .96, C.grå);
      k(-b * .6, b * .2, -d * .5, d * .6, .96, 1, C.tre, 'tre'); const gx = rf(m, 3) * b - b * .5;
      for (const s of [-1, 1]) k(gx - .15, gx + .15, s * d * .85 - .12, s * d * .85 + .12, .95, h - .3, C.oransje); k(gx - .2, gx + .2, -d * .95, d * .95, h - .4, h, C.oransje);
      k(gx - .25, gx + .25, -.1, .3, 1.3, h - .4, C.hvit); S(k, gx, .1, .06, 1.15, 1.3, C.stål); k(b + .1, b + .7, d * .5, d, 0, 1.8, C.hvit); panel(k, b + .2, b + .6, 1.2, 1.6, d, C.skjerm); },
    limpresse: (m, k, b, d, h) => { bein(k, -b, b, -d, d, .6, C.blå, .12); k(-b, b, -d, d, .6, .7, C.blå); k(-b + .1, b - .1, -d + .1, d - .1, .7, .9, C.tre, 'tre');
      for (let x = -b + .3; x < b; x += .7) { k(x, x + .12, -d, d, h - .3, h - .15, C.blå); S(k, x + .06, 0, .06, .9, h - .3, C.rustfri); } k(-b, b, -d, d, h - .15, h, C.blå); },
    lakkbås: (m, k, b, d, h) => { k(-b, b, -d, -d + .06, 0, h, C.hvit); for (const s of [-1, 1]) k(s * b - (s > 0 ? .06 : 0), s * b + (s > 0 ? 0 : .06), -d, d, 0, h, C.hvit); k(-b, b, -d, d, h - .08, h, C.hvit);
      for (let x = -b + .3; x < b - .2; x += .5) for (let z = .3; z < h - .4; z += .5) k(x, x + .4, -d + .06, -d + .09, z, z + .4, C.grå, 'tøy');
      k(-b * .3, b * .3, -d + .1, -d + .3, h - .08, h + .6, C.grå); k(-.3, .3, 0, .6, 0, .02, C.oransje); S(k, b * .6, d * .5, .08, 0, 1.2, C.rød); },
    // ===== OLJE =====
    destillasjonskolonne: (m, k, b, d, h) => { const r = Math.min(b, d) * .5; S(k, 0, 0, r * 1.1, 0, .35, C.betong, 'betong'); S(k, 0, 0, r, .35, h * .55, C.stål); S(k, 0, 0, r * .8, h * .55, h - .3, C.stål); S(k, 0, 0, r * .5, h - .3, h, C.stål);
      for (const z of [1.2, 2.4, 3.6]) { if (z > h - .5) break; ring(k, 0, 0, z < h * .55 ? r : r * .8, z, C.grå); }
      for (const z of [1.8, 3.6]) if (z < h - .6) { k(-b, b, -d, -d + .5, z, z + .06, C.gul); rekkX(k, -b, b, -d + .05, z + .06); }
      stige(k, b * .55, d * .62, 0, h - .4); S(k, -r * .9, d * .5, .1, .3, h - .6, C.grå); k(-r * .9 - .1, -r * .2, d * .5 - .1, d * .5 + .1, h - .7, h - .5, C.grå); },
    varmeveksler: (m, k, b, d, h) => { for (const x of [-b * .6, b * .6]) k(x - .2, x + .2, -d * .6, d * .6, 0, h * .4, C.betong, 'betong'); LX(k, -b * .85, b * .85, 0, h * .55, d * .42, C.stål);
      for (const x of [-b * .85, b * .85]) LX(k, x - .07, x + .07, 0, h * .55, d * .48, C.grå); LX(k, b * .85, b, 0, h * .55, d * .36, C.stål);
      for (const x of [-b * .5, b * .4]) { S(k, x, 0, .12, h * .9, h, C.grå); } S(k, -b * .2, -d * .3, .1, 0, h * .4, C.grå); },
    pumpestasjon: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .18, C.gul); for (const x of [-b * .5, b * .5]) { S(k, x - .2, 0, .28, .18, .8, C.blå); motor(k, x, x + .8, 0, .55, .25, C.blå); S(k, x - .2, 0, .12, .8, h - .2, C.grå); }
      k(-b, b, -.12, .12, h - .32, h - .08, C.grå); for (const x of [-b * .7, 0, b * .7]) S(k, x, -.6 * d, .09, .18, h - .2, C.rød); panel(k, -.3, .3, .6, 1.1, d, C.skjerm); },
    rørbro: (m, k, b, d, h) => { for (let x = -b + .2; x < b; x += 2.4) { k(x, x + .2, -d, -d + .2, 0, h, C.grå); k(x, x + .2, d - .2, d, 0, h, C.grå); k(x, x + .2, -d, d, h - .9, h - .75, C.grå); k(x, x + .2, -d, d, h - .2, h, C.grå); }
      const F = [C.rød, C.gul, C.stål, C.grønn]; for (let i = 0; i < 4; i++) LX(k, -b, b, -d + .25 + i * (2 * d - .5) / 3, h - .62, .1, F[i]); LX(k, -b, b, -d * .4, h + .12, .12, C.stål); LX(k, -b, b, d * .3, h + .1, .09, C.blå); },
    pumpe: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .15, C.mørk); S(k, -b * .35, 0, d * .55, .15, h * .75, C.blå); motor(k, -b * .1, b * .8, 0, h * .4, d * .35, C.blå); S(k, -b * .35, 0, .1, h * .75, h, C.grå); LY(k, -d, -d * .5, -b * .35, .35, .1, C.grå); },
    // ===== GASS =====
    gasstank: (m, k, b, d, h) => { const r = Math.min(d * .5, h * .42), cz = h - r; for (const x of [-b * .6, b * .6]) k(x - .25, x + .25, -d * .7, d * .7, 0, cz - r * .5, C.betong, 'betong');
      LX(k, -b + r * .5, b - r * .5, 0, cz, r, C.hvit); LX(k, -b, -b + r * .5, 0, cz, r * .7, C.hvit); LX(k, b - r * .5, b, 0, cz, r * .7, C.hvit); k(-b * .8, b * .8, -.05, .05, cz - r * .1, cz + r * .1, C.lblå);
      S(k, 0, 0, .2, h, h + .3, C.grå); k(-.15, .15, -.15, .15, h + .3, h + .4, C.rød); stige(k, b * .3, d * .55, 0, h); },
    kompressor: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .15, C.mørk); LX(k, -b * .9, b * .1, 0, .75, d * .45, C.blå); motor(k, b * .15, b * .9, 0, .75, d * .38, C.blå);
      k(-b * .9, -b * .2, -d * .6, d * .6, 1.2, h - .1, C.grå); for (let x = -b * .85; x < -b * .25; x += .12) k(x, x + .05, -d * .62, d * .62, 1.25, h - .15, C.mørk);
      S(k, -b * .55, 0, .12, h - .1, h + .3, C.grå); panel(k, b * .4, b * .8, .5, .9, d, C.skjerm); k(b * .55, b * .65, d, d + .05, 1, 1.1, C.lampeG); },
    separator: (m, k, b, d, h) => { const r = Math.min(b, d) * .42; for (const [x, y] of [[-r * .7, -r * .7], [r * .7, -r * .7], [-r * .7, r * .7], [r * .7, r * .7]]) k(x - .06, x + .06, y - .06, y + .06, 0, .9, C.grå);
      S(k, 0, 0, r, .9, h - .5, C.hvit); S(k, 0, 0, r * .7, h - .5, h - .25, C.hvit); S(k, 0, 0, r * .35, h - .25, h, C.hvit); ring(k, 0, 0, r, 1.6); ring(k, 0, 0, r, h - 1.2);
      LY(k, r * .9, d, 0, 2.2, .1, C.grå); LX(k, -b, -r * .9, 0, 1.4, .1, C.grå); LX(k, r * .9, b, 0, 3, .08, C.grå); stige(k, 0, -r - .15, .9, h - .5); },
    gassflasker: (m, k, b, d, h) => { k(-b, b, -d, -d + .05, 0, h * .9, C.grå); for (const s of [-1, 1]) k(s * b - (s > 0 ? .05 : 0), s * b + (s > 0 ? 0 : .05), -d, d, 0, h * .9, C.grå); k(-b, b, -d, d, 0, .05, C.grå);
      k(-b, b, d - .03, d, h * .55, h * .58, C.mørk); let i = 0; for (let x = -b + .16; x < b - .1; x += .28, i++) { const f = [C.rød, C.blå, C.grønn, C.grå][(i + Math.floor(rf(m, 1) * 4)) % 4];
        S(k, x, 0, .12, .05, h - .25, f); S(k, x, 0, .07, h - .25, h - .12, f); S(k, x, 0, .03, h - .12, h, C.stål); } },
    fakkel: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .3, C.betong, 'betong'); S(k, 0, 0, .25, .3, h - .4, C.stål); for (let z = .9; z < h - .5; z += .9) S(k, 0, 0, .27, z, z + .4, (z / .9) % 2 < 1 ? C.rød : C.hvit);
      S(k, 0, 0, .35, h - .4, h, C.mørk); for (const [x, y] of [[-b, -d], [b, -d], [-b, d], [b, d]]) k(x * .9 - .02, x * .9 + .02, y * .9 - .02, y * .9 + .02, .3, h * .6, C.grå); LX(k, -b, 0, 0, .55, .12, C.gul); },
    // ===== STEIN OG PUKK =====
    // kjeftknuser: kraftig ramme, to svinghjul på sidene, trakt på toppen, motor med kileremmer
    knuser: (m, k, b, d, h) => { k(-b * .7, b * .7, -d * .8, d * .8, 0, .4, C.betong, 'betong'); k(-b * .5, b * .5, -d * .6, d * .6, .4, h * .65, C.gul);
      for (const s of [-1, 1]) { const x = s * b * .55; k(x - .06, x + .06, -d * .75, d * .2, .5, .7, C.mørk); for (const [y0, y1, z0, z1] of [[-.5, .5, 1.05, 1.95], [-.7, .7, 1.2, 1.8], [-.6, .6, 1.12, 1.88]]) k(x - .1, x + .1, y0 - d * .25, y1 - d * .25, z0, z1, C.mørk); }
      k(-b * .7, b * .7, -d * .8, d * .8, h * .65, h * .7, C.grå); for (const [w, z] of [[.55, h * .7], [.7, h * .8], [.85, h * .9]]) k(-b * w, b * w, -d * w, d * w, z, z + h * .1, C.rust);
      k(-b * .3, b * .3, -d * .3, d * .3, h - .05, h, C.stein); motor(k, -b * .2, b * .5, d * .85, .7, .35, C.blå); k(-b * .45, -b * .3, d * .2, d * .85, .5, 1.5, C.mørk); },
    kjegleknuser: (m, k, b, d, h) => { const r = Math.min(b, d) * .45; k(-b, b, -d, d, 0, .3, C.betong, 'betong'); S(k, 0, 0, r, .3, h * .45, C.oransje); S(k, 0, 0, r * 1.1, h * .45, h * .52, C.grå);
      S(k, 0, 0, r * .9, h * .52, h * .7, C.oransje); S(k, 0, 0, r * .7, h * .7, h * .82, C.oransje); S(k, 0, 0, r * .95, h * .82, h, C.rust); S(k, 0, 0, r * .55, h - .06, h, C.stein);
      motor(k, r * .9, b, -d * .6, .7, .3, C.blå); k(-b, -r * .7, -.3, .3, .3, .7, C.oransje); },
    sikt: (m, k, b, d, h) => { for (const [x, z] of [[-b, h - .3], [b - .15, h - 1.2]]) for (const y of [-d, d - .15]) { k(x, x + .15, y, y + .15, 0, z - .5, C.gul); S(k, x + .07, y + .07, .1, z - .5, z - .25, C.mørk); }
      for (let i = 0; i < 4; i++) { const z0 = h - .1 - i * .3, x0 = -b + i * (2 * b / 4), x1 = x0 + 2 * b / 4; k(x0, x1, -d, d, z0 - .9 * (i / 4) - .5, z0 - .9 * (i / 4) - .3, C.oransje);
        k(x0, x1, -d + .1, d - .1, z0 - .9 * (i / 4) - .55, z0 - .9 * (i / 4) - .5, C.pukk); }
      for (const s of [-1, 1]) k(-b, b, s * d - .04, s * d + .04, h - 1.3, h - .25, C.oransje); motor(k, -.3, .4, d + .1, h - .8, .2, C.blå); },
    // hauger: mange lave lag som smalner jevnt (ser ut som en kjegle), litt skjevt og i to toner
    grushaug: (m, k, b, d, h) => { const r = Math.min(b, d) * .5, N = 9; for (let q = 0; q < N; q++) { const s = Math.pow(1 - q / N, 1.15) * .98 + .02; S(k, (rf(m, q) - .5) * .25 * q / N, (rf(m, q + 3) - .5) * .25 * q / N, r * s, h * q / N, h * (q + 1) / N, q % 3 ? C.stein : [.52, .5, .46], 'betong'); } },
    pukkhaug: (m, k, b, d, h) => { const r = Math.min(b, d) * .5, N = 10; for (let q = 0; q < N; q++) { const s = Math.pow(1 - q / N, 1.1) * .97 + .03; S(k, 0, (q / N) * .3, r * s, h * q / N, h * (q + 1) / N, q % 3 ? C.pukk : [.44, .44, .42], 'betong'); } },
    hjullaster: (m, k, b, d, h) => { k(-b * .7, b * .7, -d * .35, d * .55, .6, 1.5, C.gul); k(-b * .75, b * .75, d * .35, d * .55, .6, 1.7, C.gul); k(-b * .6, b * .6, -d * .1, d * .3, 1.5, h - .1, C.gul);
      for (const [x0, x1] of [[-b * .6, -b * .5], [b * .5, b * .6]]) for (const [y0, y1] of [[-d * .1, -d * .08], [d * .28, d * .3]]) k(x0, x1, y0, y1, 1.5, h - .1, C.mørk);
      k(-b * .6, b * .6, -d * .1, d * .3, h - .1, h, C.gul); k(-b * .55, b * .55, -d * .08, d * .28, 1.7, h - .2, C.glass);
      for (const y of [-d * .35, d * .3]) for (const s of [-1, 1]) LX(k, s > 0 ? b * .55 : -b, s > 0 ? b : -b * .55, y, .7, .7, C.gummi);
      for (const s of [-1, 1]) k(s * b * .45 - .08, s * b * .45 + .08, -d * .85, -d * .3, .6, .9, C.gul); k(-b, b, -d, -d * .82, .1, 1.1, C.mørk); k(-b, b, -d * .92, -d * .82, .05, .15, C.stål); },
    // ===== FISK OG SJØMAT =====
    sløyebenk: (m, k, b, d, h) => { k(-b, b, -d, d, h - .08, h, C.rustfri); bein(k, -b, b, -d * .9, d * .9, h - .08, C.rustfri, .06); k(-b, b, -d, -d + .06, h, h + .3, C.rustfri);
      for (let x = -b + .5; x < b; x += 1.2) { k(x - .25, x + .25, -d * .7, d * .2, h - .02, h, C.lblå); k(x - .02, x + .02, -d + .05, -d + .1, h + .3, h + .9, C.grå); }
      LX(k, -b, b, -d + .05, h + .95, .03, C.grå); k(-b * .8, b * .8, -d * .6, d * .6, .1, .5, C.blå); },
    sløyelinje: (m, k, b, d, h) => { const z = h - .35; bein(k, -b, b, -d * .3, d * .3, z, C.rustfri, .07); k(-b, b, -d * .3, d * .3, z, z + .06, C.hvit, 'tøy');
      for (const s of [-1, 1]) k(-b, b, s * d * .3 - .03, s * d * .3 + .03, z - .05, z + .18, C.rustfri);
      for (let x = -b + .6; x < b; x += 1.3) { for (const s of [-1, 1]) { k(x - .35, x + .35, s * d * .65 - .25, s * d * .65 + .25, .85, .9, C.rustfri); k(x - .03, x + .03, s * d * .65 - .2, s * d * .65 - .14, 0, .85, C.rustfri); }
        k(x - .25, x + .25, d * .55, d * .95, 0, .5, C.blå); }
      LX(k, -b, b, 0, h + .9, .04, C.grå); for (let x = -b + .6; x < b; x += 1.3) k(x - .02, x + .02, -.02, .02, z + .2, h + .9, C.grå); for (let x = -b * .8; x < b; x += 1.6) S(k, x, 0, .05, z + .07, z + .14, [.62, .66, .7]); },
    filetmaskin: (m, k, b, d, h) => { bein(k, -b, b, -d * .8, d * .8, .55, C.rustfri, .08); k(-b * .6, b * .6, -d * .8, d * .8, .55, h - .1, C.rustfri); k(-b * .55, b * .55, d * .8, d * .82, .8, h - .3, C.glass);
      k(-b, -b * .6, -d * .3, d * .3, .85, .9, C.hvit, 'tøy'); k(b * .6, b, -d * .3, d * .3, .75, .8, C.hvit, 'tøy'); for (const s of [-1, 1]) { k(s > 0 ? b * .6 : -b, s > 0 ? b : -b * .6, -d * .33, -d * .29, .75, 1, C.rustfri); k(s > 0 ? b * .6 : -b, s > 0 ? b : -b * .6, d * .29, d * .33, .75, 1, C.rustfri); }
      k(-b * .6, b * .6, -d * .8, d * .8, h - .1, h, C.rustfri); panel(k, b * .3, b * .55, 1.1, 1.35, d * .82, C.skjerm); k(b * .7, b * .9, d * .5, d, .05, .55, C.blå); for (let x = -b * .9; x < -b * .65; x += .1) S(k, x, 0, .04, .9, .95, [.6, .64, .68]); },
    ismaskin: (m, k, b, d, h) => { bein(k, -b * .8, b * .8, -d * .8, d * .8, .9, C.rustfri, .08); k(-b * .8, b * .8, -d * .8, d * .8, 1.2, h, C.rustfri); for (const [w, z] of [[.8, 1.2], [.55, 1.05], [.3, .9]]) k(-b * w, b * w, -d * w, d * w, z - .15, z, C.rustfri);
      k(-b, b, -d, d, 0, .55, C.blå); k(-b + .06, b - .06, -d + .06, d - .06, .55, .62, C.is); panel(k, -b * .3, b * .3, 1.6, 1.9, d * .8, C.skjerm); S(k, b * .5, -d * .5, .08, h, h + .4, C.grå); },
    platefryser: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .3, C.grå); for (const s of [-1, 1]) k(s * b - (s > 0 ? .15 : 0), s * b + (s > 0 ? 0 : .15), -d, d, .3, h - .4, C.lblå);
      for (let z = .45; z < h - .6; z += .2) k(-b + .15, b - .15, -d * .9, d * .9, z, z + .05, C.rustfri); for (let z = .5; z < h - .65; z += .4) k(-b * .8, b * .8, -d * .7, d * .7, z, z + .1, [.7, .64, .58]);
      k(-b, b, -d, d, h - .4, h - .2, C.lblå); S(k, 0, 0, .14, h - .2, h, C.grå); LX(k, -b, b, -d + .1, h - .3, .05, C.rød); panel(k, b * .3, b * .75, 1, 1.3, d, C.skjerm); },
    frysetunnel: (m, k, b, d, h) => { k(-b + .4, b - .4, -d, d, 0, h, C.hvit); for (let x = -b + .4; x < b - .4; x += 1.2) k(x - .02, x + .02, d, d + .02, 0, h, C.grå);
      for (const s of [-1, 1]) { const x = s * (b - .2); k(x - .2, x + .2, -d * .3, d * .3, .85, .9, C.hvit, 'tøy'); k(x - .2, x + .2, -d * .32, -d * .28, .9, 1.05, C.rustfri); k(x - .2, x + .2, d * .28, d * .32, .9, 1.05, C.rustfri); bein(k, x - .2, x + .2, -d * .3, d * .3, .85, C.rustfri, .05);
        k(s * (b - .4) - .03, s * (b - .4) + .03, -d * .4, d * .4, .7, 1.4, [.3, .36, .4]); }
      k(-b + .8, -b + 2, d, d + .05, .1, h - .4, C.rustfri); k(-b + 1.8, -b + 1.9, d + .05, d + .1, 1, 1.3, C.mørk); S(k, b * .3, 0, .5, h, h + .25, C.grå); },
    iskar: (m, k, b, d, h) => { k(-b, b, -d, d, .1, h - .1, C.blå); k(-b + .05, b - .05, -d + .05, d - .05, h - .1, h - .04, C.is); for (const s of [-1, 1]) k(-b + .1, b - .1, s * d * .6 - .08, s * d * .6 + .08, 0, .1, C.mørk);
      for (const [x, y] of [[-b * .4, 0], [b * .3, d * .3]]) S(k, x, y, .1, h - .06, h, [.62, .66, .7]); },
    fiskekar: (m, k, b, d, h) => { k(-b, b, -d, d, .1, h, C.blå); k(-b + .05, b - .05, -d + .05, d - .05, h - .12, h - .06, [.3, .45, .55]); for (const s of [-1, 1]) k(-b + .1, b - .1, s * d * .6 - .08, s * d * .6 + .08, 0, .1, C.mørk);
      for (let i = 0; i < 4; i++) LX(k, -b * .6 + rf(m, i) * .3, b * .5, -d * .5 + i * d * .33, h - .05, .06, [.62, .66, .7]); },
    pakkebord: (m, k, b, d, h) => { k(-b, b, -d, d, h - .06, h, C.rustfri); bein(k, -b, b, -d * .9, d * .9, h - .06, C.rustfri, .06); k(-b + .1, b - .1, -d + .1, d - .1, .2, .25, C.rustfri);
      for (let x = -b + .2; x < b - .4; x += .55) k(x, x + .45, -d * .5, d * .2, h, h + .25, [.85, .78, .62], 'tøy'); k(b - .4, b - .1, -d * .4, d * .4, h, h + .5, C.hvit); },
    // ===== MAT, MEIERI OG SLAKTERI =====
    kokekar: (m, k, b, d, h) => { const r = Math.min(b, d) * .45; for (const s of [-1, 1]) k(s * r * 1.05 - .08, s * r * 1.05 + .08, -.12, .12, 0, h * .7, C.rustfri); S(k, 0, 0, r, .35, h - .1, C.rustfri);
      S(k, 0, 0, r * .9, h - .1, h - .04, [.86, .82, .7]); LX(k, -r * 1.2, r * 1.2, 0, h * .7, .05, C.rustfri); k(-.3, .3, d * .7, d, .4, 1, C.rustfri); panel(k, -.2, .2, .65, .9, d, C.skjerm); },
    pasteur: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .12, C.rustfri); for (const x of [-b + .1, b - .3]) k(x, x + .2, -d * .6, d * .6, .12, h - .3, C.rustfri); k(-b + .1, b - .1, -.08, .08, h - .4, h - .3, C.rustfri);
      for (let x = -b + .35; x < b * .3; x += .07) k(x, x + .04, -d * .45, d * .45, .3, h - .5, x % .14 < .07 ? C.rustfri : C.stål); k(b * .35, b - .35, -d * .5, d * .5, .3, h - .5, C.rustfri);
      S(k, b * .6, -d * .3, .3, .12, 1.4, C.rustfri); for (const z of [.6, 1, 1.4]) LX(k, -b, b, d * .7, z, .04, C.rustfri); k(b * .3, b * .7, d * .55, d * .7, .9, 1.7, C.hvit); panel(k, b * .35, b * .65, 1.2, 1.55, d * .7, C.skjerm); },
    kjøttskinne: (m, k, b, d, h) => { for (const x of [-b + .1, b - .2]) k(x, x + .12, -.06, .06, 0, h, C.grå); k(-b, b, -.08, .08, h - .15, h, C.stål);
      let i = 0; for (let x = -b + .5; x < b - .4; x += .6, i++) { if (rf(m, i) < .2) continue; k(x - .015, x + .015, -.015, .015, h - .5, h - .15, C.stål); const l = .9 + rf(m, i + 9) * .4, w = .22 + rf(m, i + 4) * .08;
        k(x - w, x + w, -.16, .16, h - .5 - l, h - .55, C.kjøtt); k(x - w * .7, x + w * .7, -.12, .18, h - .5 - l * .55, h - .65, C.fett); k(x - w * .5, x + w * .5, -.1, .1, h - .62 - l, h - .5 - l, C.kjøtt); } },
    deigelter: (m, k, b, d, h) => { k(-b, b, -d, d, 0, .7, C.hvit); S(k, -b * .2, 0, Math.min(b, d) * .55, .7, 1.15, C.rustfri); S(k, -b * .2, 0, Math.min(b, d) * .5, 1.12, 1.15, [.92, .86, .72]);
      k(b * .45, b, -d * .3, d * .3, .7, h, C.hvit); k(-b * .2, b, -.15, .15, h - .3, h, C.hvit); S(k, -b * .2, 0, .05, 1, h - .3, C.rustfri); panel(k, b * .55, b * .9, 1.1, 1.35, d * .3 + .01, C.skjerm); },
    pakkemaskin: (m, k, b, d, h) => { k(-b, b, -d * .7, d * .7, 0, h * .55, C.hvit); k(-b * .5, b * .3, -d * .7, d * .7, h * .55, h, C.glass); k(-b * .5, b * .3, -d * .72, d * .72, h - .06, h, C.hvit);
      LY(k, -d * .5, d * .5, b * .6, h * .55 + .25, .25, [.86, .86, .8]); k(-b, b, -d * .3, d * .3, h * .55, h * .55 + .06, C.mørk, 'tøy'); panel(k, b * .4, b * .8, .7, 1, d * .7, C.skjerm); k(b * .5, b * .6, d * .7, d * .75, 1.1, 1.2, C.lampeG); },
    stålbenk: (m, k, b, d, h) => { k(-b, b, -d, d, h - .05, h, C.rustfri); bein(k, -b, b, -d * .9, d * .9, h - .05, C.rustfri, .06); k(-b + .1, b - .1, -d + .1, d - .1, .15, .2, C.rustfri); k(-b, b, -d, -d + .04, h, h + .1, C.rustfri); },
    kjølereol: (m, k, b, d, h) => { for (const s of [-1, 1]) k(s * b - (s > 0 ? .06 : 0), s * b + (s > 0 ? 0 : .06), -d, d, 0, h, C.rustfri); for (let z = .1; z < h; z += .5) k(-b, b, -d, d, z, z + .04, C.rustfri);
      for (let z = .14, i = 0; z < h - .4; z += .5, i++) for (let x = -b + .1; x < b - .3; x += .45) if (rf(m, i * 9 + x) > .25) k(x, x + .38, -d + .05, d - .05, z, z + .25 + rf(m, x + i) * .1, [.85, .78, .62], 'tøy'); },
    // ===== METALL OG VERKSTED =====
    dreiebenk: (m, k, b, d, h) => { for (const x of [-b * .85, b * .55]) k(x - .3, x + .3, -d * .5, d * .5, 0, .85, C.grønn); k(-b, b, -d * .4, d * .4, .85, 1.05, C.mgrønn); k(-b, b, -d * .45, d * .45, .7, .75, C.mørk);
      k(-b, -b * .55, -d * .4, d * .4, 1.05, h, C.grønn); LX(k, -b * .55, -b * .45, 0, 1.25, .2, C.stål); k(b * .5, b * .85, -d * .25, d * .25, 1.05, 1.3, C.grønn); LX(k, b * .3, b * .5, 0, 1.25, .04, C.stål);
      k(-b * .2, b * .1, -d * .45, d * .45, 1.05, 1.18, C.grønn); k(-b * .12, b * .02, -d * .1, d * .2, 1.18, 1.3, C.stål); LX(k, -b * .45, b * .3, 0, 1.25, .05, C.stål); panel(k, -b * .9, -b * .6, 1.2, 1.4, d * .4, C.skjerm); },
    fres: (m, k, b, d, h) => { k(-b * .4, b * .4, -d * .5, -d * .05, 0, h - .3, C.grå); k(-b * .45, b * .45, -d * .5, d * .2, h - .4, h, C.grå); S(k, 0, d * .05, .12, h - .7, h - .4, C.stål);
      k(-b * .35, b * .35, -d * .05, d * .4, .6, .9, C.grå); k(-b, b, -d * .05, d * .4, .9, 1, C.stål); for (const s of [-1, 1]) LX(k, s > 0 ? b : -b - .1, s > 0 ? b + .1 : -b, d * .2, .95, .1, C.mørk);
      k(-b * .3, b * .3, 0, d * .3, 1, 1.12, C.mørk); k(b * .4, b * .8, -d * .5, -d * .1, 1.2, 1.8, C.hvit); panel(k, b * .45, b * .75, 1.35, 1.65, -d * .1, C.skjerm); },
    kantpresse: (m, k, b, d, h) => { for (const s of [-1, 1]) k(s * b - (s > 0 ? .25 : 0), s * b + (s > 0 ? 0 : .25), -d * .6, d * .3, 0, h, C.blå); k(-b, b, -d * .3, d * .3, 0, .9, C.blå);
      k(-b + .1, b - .1, -.08, .08, .9, 1, C.stål); k(-b, b, -d * .35, d * .35, h - .9, h - .2, C.blå); k(-b + .1, b - .1, -.05, .05, 1.05, h - .9, C.stål);
      for (const s of [-1, 1]) S(k, s * b * .6, -d * .1, .14, h - .2, h, C.rustfri); k(-.25, .25, d * .5, d, 0, .12, C.gul); panel(k, b * .55, b * .9, 1.3, 1.7, d * .3, C.skjerm); k(-b, b, d * .3, d * .32, 1.1, 1.14, C.gul); },
    sveisebord: (m, k, b, d, h) => { bein(k, -b, b, -d, d, h - .2, C.mørk, .12); k(-b, b, -d, d, h - .2, h, C.grå); for (let x = -b + .15; x < b; x += .3) k(x - .015, x + .015, -d + .08, d - .08, h, h + .004, C.mørk); for (let y = -d + .15; y < d; y += .3) k(-b + .08, b - .08, y - .015, y + .015, h, h + .004, C.mørk);
      for (const x of [-b * .6, b * .3]) { k(x - .05, x + .05, -d * .5, -d * .4, h, h + .3, C.rød); k(x - .05, x + .05, -d * .5, -d * .1, h + .25, h + .3, C.rød); } k(-b * .3, b * .1, -d * .2, d * .3, h, h + .02, C.stål); },
    esse: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h * .75, [.5, .26, .2], 'betong'); k(-b * .7, b * .7, -d * .6, d * .6, h * .72, h * .78, C.mørk); k(-b * .4, b * .4, -d * .3, d * .3, h * .76, h * .8, [.95, .45, .1]);
      for (const [w, z] of [[.95, h + .2], [.7, h + .5], [.4, h + .9]]) k(-b * w, b * w, -d * w, d * w * .7, z - .3, z, C.mørk); S(k, 0, -d * .1, .15, h + .9, h + 1.8, C.mørk); LX(k, b, b + .3, 0, .5, .12, C.mørk); },
    ambolt: (m, k, b, d, h) => { S(k, 0, 0, .22, 0, h - .3, C.tømmer, 'tre'); k(-b * .5, b * .5, -d * .5, d * .5, h - .3, h - .18, C.mørk); k(-b * .3, b * .3, -d * .4, d * .4, h - .18, h - .1, C.mørk);
      k(-b * .6, b * .6, -d, d, h - .1, h, C.mørk); k(b * .6, b * 1.05, -d * .5, d * .5, h - .09, h - .02, C.mørk); k(b * 1.05, b * 1.3, -d * .25, d * .25, h - .07, h - .03, C.mørk); },
    platesaks: (m, k, b, d, h) => { for (const s of [-1, 1]) k(s * b - (s > 0 ? .25 : 0), s * b + (s > 0 ? 0 : .25), -d * .6, d * .4, 0, h, C.blå); k(-b, b, -d * .3, d * .3, 0, .9, C.blå); k(-b, b, d * .3, d, .86, .9, C.stål);
      k(-b + .25, b - .25, -.1, .1, 1.05, h - .1, C.blå); k(-b + .25, b - .25, -.02, .02, .9, 1.05, C.rustfri); k(-.2, .2, d * .5, d, 0, .1, C.gul); },
    // ===== BÅT OG VERFT =====
    // slipp med båtskrog: skinner på gulvet, vogn med støtter, skrog som smalner mot kjølen og baugen
    båtbukk: (m, k, b, d, h) => { for (const s of [-1, 1]) k(s * b * .3 - .08, s * b * .3 + .08, -d, d, 0, .12, C.stål); for (const y of [-d * .6, -d * .2, d * .2, d * .6]) k(-b * .75, b * .75, y - .15, y + .15, .12, .55, C.gul);
      const H = h - .55, hv = rf(m, 1) < .5 ? C.hvit : rf(m, 2) < .5 ? C.rød : C.blå; k(-.08, .08, -d * .9, d * .85, .55, .75, C.mørk);
      for (const [w, z0, z1] of [[.18, .75, .75 + H * .2], [.42, .75 + H * .2, .75 + H * .45], [.62, .75 + H * .45, .75 + H * .75]]) { k(-b * w, b * w, -d * .88, d * .55, z0, z1, C.rust); k(-b * w * .6, b * w * .6, d * .55, d * .85, z0, z1, C.rust); }
      k(-b * .72, b * .72, -d * .9, d * .5, .55 + H * .75, h - .2, hv); k(-b * .45, b * .45, d * .5, d * .8, .55 + H * .75, h - .2, hv); k(-b * .2, b * .2, d * .8, d * .95, .55 + H * .8, h - .1, hv);
      k(-b * .7, b * .7, -d * .88, d * .7, h - .22, h - .12, C.tre, 'tre'); for (const s of [-1, 1]) for (const y of [-d * .5, 0, d * .4]) k(s > 0 ? b * .55 : -b * .7 - .06, s > 0 ? b * .7 + .06 : -b * .55, y - .06, y + .06, .55, .55 + H * .55, C.tre, 'tre'); },
    platevalse: (m, k, b, d, h) => { for (const s of [-1, 1]) k(s * b - (s > 0 ? .5 : 0), s * b + (s > 0 ? 0 : .5), -d * .5, d * .5, 0, h, C.blå); LX(k, -b + .5, b - .5, 0, h - .3, .2, C.stål);
      for (const s of [-1, 1]) LX(k, -b + .5, b - .5, s * d * .25, h - .75, .17, C.stål); k(-b, -b + .5, -d * .5, d * .5, h, h + .1, C.mørk); k(-b * .3, b * .3, -d * .2, d * .2, h - .52, h - .5, C.grå);
      panel(k, b - .45, b - .05, 1, 1.3, d * .5, C.skjerm); },
    // ===== KRAFT OG ENERGI =====
    turbin: (m, k, b, d, h) => { k(-b, b, -d * .6, d * .6, 0, .4, C.betong, 'betong'); LX(k, -b * .7, b * .3, 0, 1.4, 1.05, C.grønn); for (const x of [-b * .7, -b * .2, b * .3]) LX(k, x - .06, x + .06, 0, 1.4, 1.12, C.grå);
      LX(k, b * .3, b * .55, 0, 1.4, .3, C.stål); k(b * .55, b, -d * .5, d * .5, .4, 2.2, C.grønn); LX(k, -b, -b * .7, 0, 1.4, .5, C.grå); LY(k, d * .2, d, -b * .2, .9, .4, C.grå); stige(k, -b * .5, d * .62, 0, 2.5); },
    generator: (m, k, b, d, h) => { const r = Math.min(b, d) * .45; S(k, 0, 0, r * 1.08, 0, .6, C.betong, 'betong'); S(k, 0, 0, r, .6, h - .5, C.grønn); for (let z = .9; z < h - .6; z += .35) ring(k, 0, 0, r, z, C.mgrønn);
      S(k, 0, 0, r * .85, h - .5, h - .3, C.grå); S(k, 0, 0, r * .35, h - .3, h, C.stål); k(-b, b, -d, -d + .5, h - .5, h - .44, C.gul); rekkX(k, -b, b, -d + .04, h - .44); stige(k, b * .6, -d + .3, 0, h - .5); },
    transformator: (m, k, b, d, h) => { k(-b * .7, b * .7, -d * .6, d * .6, 0, .15, C.mørk); k(-b * .6, b * .6, -d * .5, d * .5, .15, h * .7, C.grå); for (let x = -b * .55; x < b * .55; x += .18) for (const s of [-1, 1]) k(x, x + .05, s * d * .5 - (s > 0 ? 0 : .35), s * d * .5 + (s > 0 ? .35 : 0), .3, h * .65, C.grå);
      for (const x of [-b * .35, 0, b * .35]) { S(k, x, 0, .09, h * .7, h - .1, [.6, .4, .3]); for (let z = h * .72; z < h - .2; z += .12) S(k, x, 0, .13, z, z + .05, [.6, .4, .3]); S(k, x, 0, .05, h - .1, h, C.stål); }
      S(k, -b * .5, 0, .35, h * .7, h * .8, C.grå); k(b * .3, b * .5, d * .5, d * .52, .6, .9, C.gul); },
    kontrollpult: (m, k, b, d, h) => { k(-b, b, -d, d * .2, 0, h - .5, C.grå); k(-b, b, -d * .2, d * .6, .7, .76, C.grå); k(-b, b, -d, -d * .2, h - .5, h, C.grå);
      for (let x = -b + .2; x < b - .3; x += .7) { k(x, x + .55, -d * .2, -d * .17, h - .45, h - .05, C.skjerm); k(x + .05, x + .5, -d * .17, -d * .16, h - .4, h - .1, [.12, .3, .26]); }
      for (let x = -b + .2; x < b - .1; x += .25) k(x, x + .08, d * .2, d * .3, .76, .79, rf(m, x * 7) < .7 ? C.lampeG : C.lampeR); k(-b, b, d * .6, d, 0, .05, C.mørk); },
    // ===== LAGER OG LOGISTIKK =====
    truck: (m, k, b, d, h) => { k(-b, b, -d * .45, d * .55, .25, 1, C.oransje); k(-b * .9, b * .9, -d * .45, -d * .2, 1, 1.25, C.mørk); k(-b * .6, b * .6, -d * .1, d * .2, 1, 1.4, C.mørk);
      for (const [x0, x1] of [[-b, -b * .85], [b * .85, b]]) for (const [y0, y1] of [[-d * .45, -d * .4], [d * .35, d * .4]]) k(x0, x1, y0, y1, 1, h, C.mørk); k(-b, b, -d * .45, d * .4, h - .06, h, C.mørk);
      for (const s of [-1, 1]) { k(s * b * .3 - .05, s * b * .3 + .05, d * .55, d * .6, .1, h - .2, C.grå); k(s * b * .3 - .06, s * b * .3 + .06, d * .6, d, .05, .1, C.stål); }
      for (const y of [-d * .3, d * .35]) for (const s of [-1, 1]) LY(k, y - .12, y + .12, s * (b - .1), .25, .25, C.gummi); },
    rullebane: (m, k, b, d, h) => { for (const s of [-1, 1]) k(-b, b, s * d - (s > 0 ? .06 : 0), s * d + (s > 0 ? 0 : .06), h - .2, h - .02, C.gul);
      for (let x = -b + .12; x < b; x += .22) k(x - .05, x + .05, -d + .06, d - .06, h - .13, h - .03, C.stål); for (let x = -b + .3; x < b; x += 1.5) bein(k, x, x + .1, -d, d, h - .2, C.mørk, .06);
      if (rf(m, 1) < .7) k(-b * .6, -b * .1, -d * .8, d * .8, h, h + .35, [.72, .6, .42], 'tøy'); },
    pallereol: null,
    // ===== GJENVINNING =====
    ballepresse: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h * .55, C.gul); k(-b * .8, b * .8, -d * .8, d * .8, h * .55, h - .3, C.gul); S(k, 0, 0, .14, h - .3, h, C.rustfri); k(-b * .6, b * .6, d, d + .03, .2, h * .5, C.mørk);
      k(-b * .7, b * .7, -d * 1.05, -d * .8, h * .55, h * .8, C.mørk); panel(k, b * .5, b * .9, 1.1, 1.4, d, C.skjerm); k(b * .1, b * .9, d + .1, d + 1, 0, .9, [.58, .5, .38], 'tøy');
      for (const z of [.25, .6]) k(b * .1, b * .9, d + .08, d + 1.02, z, z + .04, C.mørk); },
    avfallscontainer: (m, k, b, d, h) => { const c = [C.grønn, C.blå, C.rød, C.gul][Math.floor((m.f || 0) * 4) % 4]; k(-b + .1, b - .1, -d + .1, d - .1, .1, h * .6, c); k(-b, b, -d, d, h * .6, h, c);
      k(-b + .08, b - .08, -d + .08, d - .08, h - .25, h - .2, [.3, .28, .25]); for (let x = -b + .4; x < b; x += .8) { k(x - .05, x + .05, -d - .03, -d, .1, h, c.map(v => v * .8)); k(x - .05, x + .05, d, d + .03, .1, h, c.map(v => v * .8)); }
      for (const s of [-1, 1]) { k(s > 0 ? b - .02 : -b - .1, s > 0 ? b + .1 : -b + .02, -.2, .2, h * .7, h * .85, C.mørk); k(-b + .1, b - .1, s * d * .7 - .08, s * d * .7 + .08, 0, .1, C.mørk); } },
    sorteringsbånd: (m, k, b, d, h) => { const z = h - 1.2; for (let x = -b + .2; x < b; x += 2) bein(k, x, x + .15, -d, d, z, C.grå, .1); k(-b, b, -d, d, z - .1, z, C.grå);
      k(-b, b, -.35, .35, z + .1, z + .16, C.gummi, 'tøy'); for (const s of [-1, 1]) k(-b, b, s * .38 - .03, s * .38 + .03, z, z + .3, C.gul); rekkX(k, -b, b, -d + .05, z, C.gul); rekkX(k, -b, b, d - .05, z, C.gul);
      for (let x = -b + .8; x < b - .5; x += 1.6) for (const s of [-1, 1]) { k(x - .25, x + .25, s * .5 - .25, s * .5 + .25, z - 1.1, z - .1, C.grå); k(x - .45, x + .45, s * (d - .5) - .4, s * (d - .5) + .4, 0, .8, [C.grønn, C.blå, C.rød][(Math.round(x) + (s > 0 ? 1 : 0) + 3) % 3]); }
      for (let i = 0; i < 6; i++) k(-b + .5 + i * (2 * b - 1) / 6, -b + .7 + i * (2 * b - 1) / 6, -.2 + rf(m, i) * .2, .1 + rf(m, i) * .2, z + .16, z + .3, [C.blå, C.plast, C.tre][i % 3]);
      for (let s = 0; s < 4; s++) k(-b - .6 + s * .15, -b - .45 + s * .15, -.4, .4, s * z / 4, s * z / 4 + .05, C.gul); },
    skraphaug: (m, k, b, d, h) => { for (let q = 0; q < 9; q++) { const x = (rf(m, q) - .5) * b * 1.2, y = (rf(m, q + 20) - .5) * d * 1.2, s = .5 + rf(m, q + 40) * .8, z0 = rf(m, q + 60) * h * .5;
      k(x - s, x + s, y - s * .6, y + s * .6, z0, z0 + .3 + rf(m, q + 80) * .5, [C.rust, C.grå, C.mørk, C.blå][q % 4]); } for (let q = 0; q < 3; q++) LX(k, -b * .6, b * .3, (rf(m, q + 5) - .5) * d, .3 + q * .4, .08, C.rust); },
    // ===== BRYGGERI =====
    bryggekjele: (m, k, b, d, h) => { const r = Math.min(b, d) * .45; for (const s of [-1, 1]) k(s * r * .7 - .06, s * r * .7 + .06, -.06, .06, 0, .4, C.rustfri); S(k, 0, 0, r, .4, h - .6, C.kobber);
      S(k, 0, 0, r * .8, h - .6, h - .35, C.kobber); S(k, 0, 0, r * .5, h - .35, h - .2, C.kobber); S(k, 0, 0, .1, h - .2, h + .9, C.kobber); ring(k, 0, 0, r, .9, C.rustfri); LY(k, r * .8, d, 0, .6, .06, C.rustfri);
      k(-.25, .25, r * .95, r + .05, 1, 1.4, C.mørk); },
    gjæringstank: (m, k, b, d, h) => { const r = Math.min(b, d) * .45; for (let i = 0; i < 4; i++) { const a = i * 1.571 + .785; k(Math.cos(a) * r * .7 - .05, Math.cos(a) * r * .7 + .05, Math.sin(a) * r * .7 - .05, Math.sin(a) * r * .7 + .05, 0, 1.2, C.rustfri); }
      S(k, 0, 0, r * .3, .45, .75, C.rustfri); S(k, 0, 0, r * .6, .75, 1, C.rustfri); S(k, 0, 0, r * .85, 1, 1.25, C.rustfri); S(k, 0, 0, r, 1.25, h - .4, C.rustfri);
      S(k, 0, 0, r * .8, h - .4, h - .2, C.rustfri); S(k, 0, 0, r * .4, h - .2, h - .1, C.rustfri); for (const z of [1.8, h - 1]) ring(k, 0, 0, r, z, C.stål);
      k(-.2, .2, r - .02, r + .04, 1.5, 1.9, C.mørk); LY(k, r, r + .3, 0, .6, .04, C.rustfri); S(k, 0, 0, .04, .1, .45, C.rustfri); },
    tappelinje: (m, k, b, d, h) => { bein(k, -b, b, -d * .3, d * .3, .9, C.rustfri, .06); k(-b, b, -d * .3, d * .3, .9, .96, C.mørk, 'tøy'); for (const s of [-1, 1]) k(-b, b, s * d * .3 - .02, s * d * .3 + .02, .96, 1.06, C.rustfri);
      for (let x = -b + .1; x < b - .1; x += .24) { if (Math.abs(x + b * .3) < .6) continue; const f = x < -b * .3 ? C.glass : [.34, .22, .1]; k(x - .03, x + .03, -.03, .03, .96, 1.2, f); k(x - .012, x + .012, -.012, .012, 1.2, 1.26, x < -b * .3 ? C.glass : C.gul); }
      S(k, -b * .3, 0, .6, .9, 1.4, C.rustfri); for (let i = 0; i < 8; i++) { const a = i * .785; S(k, -b * .3 + Math.cos(a) * .45, Math.sin(a) * .45, .04, 1.4, 1.7, C.rustfri); } S(k, -b * .3, 0, .4, 1.7, h, C.rustfri);
      k(b * .3, b * .5, -d * .45, d * .45, .9, h - .2, C.rustfri); k(b * .3, b * .5, -d * .45, d * .45, h - .2, h, C.hvit); panel(k, -b * .05, b * .2, 1.2, 1.5, d * .5, C.skjerm); k(-b * .05, b * .2, d * .3, d * .5, .9, 1.5, C.hvit); },
    fat: (m, k, b, d, h) => { S(k, 0, 0, Math.min(b, d) * .5, 0, h, C.tømmer, 'tre'); S(k, 0, 0, Math.min(b, d) * .53, h * .45, h * .55, C.tømmer, 'tre'); for (const z of [.08, h * .3, h * .68, h - .12]) S(k, 0, 0, Math.min(b, d) * .52, z, z + .04, C.mørk); },
    // ===== KJEMI OG PLAST =====
    reaktor: (m, k, b, d, h) => { const r = Math.min(b, d) * .42; for (let i = 0; i < 4; i++) { const a = i * 1.571 + .785; k(Math.cos(a) * r - .06, Math.cos(a) * r + .06, Math.sin(a) * r - .06, Math.sin(a) * r + .06, 0, 1.2, C.grå); }
      S(k, 0, 0, r * .6, .5, .8, C.rustfri); S(k, 0, 0, r, .8, h - 1, C.rustfri); S(k, 0, 0, r * 1.06, 1.2, h - 1.3, [.6, .62, .64]); S(k, 0, 0, r * .75, h - 1, h - .8, C.rustfri);
      k(-.18, .18, -.18, .18, h - .8, h - .3, C.grå); motor(k, -.25, .25, 0, h - .15, .15, C.blå); k(-b, b, -d, d, h - 1.6, h - 1.54, C.gul); rekkX(k, -b, b, d - .04, h - 1.54); stige(k, b - .1, -d * .5, 0, h - 1.6);
      for (const a of [0, 2.1]) LY(k, 0, d, Math.cos(a) * r * .5, h - .9, .06, C.grå); },
    blandetank: (m, k, b, d, h) => { const r = Math.min(b, d) * .46; for (const s of [-1, 1]) k(s * r * .7 - .05, s * r * .7 + .05, -.05, .05, 0, .5, C.grå); S(k, 0, 0, r * .5, .3, .5, C.plast); S(k, 0, 0, r, .5, h - .3, C.plast);
      S(k, 0, 0, r * .6, h - .3, h - .2, C.plast); motor(k, -.2, .2, 0, h - .05, .14, C.blå); for (let z = .9; z < h - .5; z += .5) k(r * .98, r * 1.02, -.04, .04, z, z + .02, C.mørk); },
    sprøytestøper: (m, k, b, d, h) => { k(-b, b, -d * .7, d * .7, 0, .95, C.blå); k(-b * .9, -b * .1, -d * .6, d * .6, .95, h - .4, C.hvit); k(-b * .85, -b * .15, -d * .62, d * .62, 1.1, h - .6, C.glass);
      for (const s of [-1, 1]) LX(k, -b * .9, -b * .1, s * d * .4, h - .45, .06, C.rustfri); LX(k, -b * .1, b * .8, 0, 1.25, .2, C.stål); S(k, b * .4, 0, .25, 1.45, h, C.gul); S(k, b * .4, 0, .3, h - .1, h, C.gul);
      panel(k, b * .1, b * .5, 1.05, 1.35, d * .7, C.skjerm); },
    kjemikalieskap: (m, k, b, d, h) => { k(-b, b, -d, d, 0, h, C.gul); k(-.01, .01, d, d + .02, .1, h - .1, C.mørk); for (const s of [-1, 1]) k(s * .08 - .02, s * .08 + .02, d, d + .05, h * .45, h * .55, C.mørk);
      k(-b * .4, -b * .05, d, d + .015, h * .7, h * .85, C.rød); k(b * .05, b * .4, d, d + .015, h * .7, h * .85, [.95, .95, .95]); },
    rørstativ: (m, k, b, d, h) => { for (let x = -b + .1; x < b; x += 1.3) { k(x, x + .12, -d, -d + .12, 0, h, C.grå); k(x, x + .12, d - .12, d, 0, h, C.grå); for (const z of [.9, 1.7, h - .1]) k(x, x + .12, -d, d, z - .08, z, C.grå); }
      const F = [C.gul, C.rød, C.blå, C.grønn, C.hvit, C.oransje]; let i = 0; for (const z of [.9, 1.7, h - .1]) for (const y of [-d * .5, 0, d * .5]) { LX(k, -b, b, y, z + .1, .07, F[(i++ + Math.floor(rf(m, 1) * 6)) % 6]); }
      for (const x of [-b * .4, b * .3]) { S(k, x, d * .5, .05, 1.8, 2.05, C.mørk); k(x - .15, x + .15, d * .5 - .02, d * .5 + .02, 2.05, 2.09, C.rød); } },
    nøddusj: (m, k, b, d, h) => { k(-b * .6, b * .6, -d * .6, d * .6, 0, .04, C.gul); S(k, 0, -d * .4, .05, .04, h - .2, C.grønn); k(-.05, .05, -d * .4, d * .2, h - .25, h - .15, C.grønn); S(k, 0, d * .2, .18, h - .3, h - .2, C.grønn);
      k(-.01, .01, d * .1, d * .12, h - 1, h - .3, C.mørk); S(k, 0, d * .1, .05, h - 1.05, h - 1, C.mørk); k(-.05, .05, -d * .4, d * .05, 1.05, 1.1, C.grønn); S(k, 0, d * .05, .16, 1, 1.1, C.rustfri);
      k(-.3, .3, -d * .45, -d * .42, h - .1, h + .3, C.grønn); k(-.2, .2, -d * .42, -d * .41, h, h + .2, C.hvit); },
  };
  for (const [t, f] of Object.entries(MODELLER)) if (!f) delete MODELLER[t];

  // ---------- PRODUKSJONSLINJENE per hall (Claudes forslag) ----------
  // [hva, liste, antall (0 = ikke med), valg]. Lista følger råvaren: inn ved porten, gjennom maskinene, ut som ferdigvare.
  const LINJER = {
    sagbrukshall: ['tømmerstabel', 'tømmerbord', 'barkemaskin', 'sagbenk', ['rammesag', 'stokkbåndsag'], 'kantverk', 'transportbånd', '?flishogger', 'plankestabel', '?tørkekammer'],
    snekkerverksted: ['plankestabel', 'høvel', ['bordsag', 'båndsag'], '?cncfres', 'limpresse', 'lakkbås'],
    oljehall: ['pumpestasjon', 'varmeveksler', 'destillasjonskolonne', 'rørbro', '?varmeveksler', 'tank'],
    gasshall: ['separator', 'kompressor', '?kompressor', 'gasstank', '?fakkel'],
    knuserhall: ['grushaug', 'knuser', 'transportbånd', 'kjegleknuser', 'sikt', 'transportbånd', 'pukkhaug'],
    fiskehall: ['fiskekar', 'sløyelinje', 'filetmaskin', 'transportbånd', 'platefryser', '?ismaskin'],
    mathall: [['melketank', 'kjøttskinne'], ['pasteur', 'deigelter'], 'transportbånd', 'pakkemaskin'],
    metallverksted: ['stålplater', 'platesaks', 'kantpresse', ['dreiebenk', 'fres'], 'sveisebord'],
    verftshall: ['stålplater', 'platevalse', 'båtbukk'],
    turbinhall: ['turbin', 'generator', '?turbin', 'transformator'],
    sorteringshall: ['skraphaug', 'sorteringsbånd', 'ballepresse'],
    bryggerhall: ['bryggekjele', 'gjæringstank', 'gjæringstank', '?gjæringstank', 'tappelinje', 'pall'],
    kjemihall: ['blandetank', 'reaktor', 'rørstativ', '?reaktor', 'sprøytestøper'],
  };
  // det som skal stå i tillegg til linja (langs veggene), og antallet i linja for små rom
  const EKSTRA = {
    sagbrukshall: [['rad', 'plankestabel', A => Math.min(4, Math.floor(A / 90)), { fri: 1.6 }], ['vegg', 'arbeidsbenk', 1]],
    snekkerverksted: [['rutenett', 'høvelbenk', 6, { du: 4, dv: 3.4, mU: 2.2, mV: 2.2, fri: 1.4 }], ['vegg', 'arbeidsbenk', 2]],
    oljehall: [['rad', 'rørgate', A => Math.min(3, Math.floor(A / 150)), { fri: 1.4 }], ['vegg', 'pumpe', 2, { fri: 1 }], ['vegg', 'ventil', A => Math.min(4, Math.floor(A / 100)), { fri: 1 }], ['rutenett', 'tank', 4, { du: 6, dv: 6, mU: 3, mV: 3, fri: 2 }], ['vegg', 'kontrollpult', 1, { fri: 1 }], ['vegg', 'tønne', 2]],
    gasshall: [['vegg', 'gassflasker', 2, { fri: .8 }], ['vegg', 'ventil', A => Math.min(4, Math.floor(A / 100)), { fri: 1 }], ['rad', 'rørgate', A => Math.min(3, Math.floor(A / 150)), { fri: 1.4 }]],
    knuserhall: [['midt', 'hjullaster', A => A > 260 ? 1 : 0, { fri: 2 }], ['rutenett', 'grushaug', 2, { du: 7, dv: 7, mU: 3, mV: 3, fri: 2.5 }]],
    fiskehall: [['rad', 'sløyebenk', A => Math.min(3, 1 + Math.floor(A / 160)), { fri: 1.4, sider: 'lang' }], ['vegg', 'iskar', A => Math.min(6, 2 + Math.floor(A / 100)), { fri: .9 }],
      ['vegg', 'frysetunnel', A => A > 260 ? 1 : 0, { fri: 1.6, sider: 'lang' }], ['vegg', 'pakkebord', A => Math.min(3, 1 + Math.floor(A / 150)), { fri: 1.2 }], ['vegg', 'pall', 2]],
    mathall: [['rutenett', 'kokekar', 4, { du: 3.6, dv: 3.6, mU: 2.4, mV: 2.4, fri: 1.4 }], ['vegg', 'stålbenk', A => Math.min(4, 1 + Math.floor(A / 100)), { fri: 1 }], ['vegg', 'pall', 2]],
    metallverksted: [['kran', 'traverskran'], ['rutenett', 'dreiebenk', 3, { du: 5, dv: 4, mU: 3, mV: 3, fri: 1.6 }], ['vegg', 'sveisebås', A => Math.min(2, 1 + Math.floor(A / 300)), { fri: 1.2 }],
      ['vegg', 'esse', 1, { fri: 1.2 }], ['vegg', 'ambolt', 1, { fri: 1 }], ['vegg', 'arbeidsbenk', 2], ['vegg', 'verktøyvogn', 1]],
    verftshall: [['kran', 'traverskran'], ['vegg', 'sveisebås', A => Math.min(2, 1 + Math.floor(A / 400)), { fri: 1.2 }], ['rad', 'stålplater', A => Math.min(3, Math.floor(A / 150)), { fri: 1.4 }],
      ['vegg', 'plankestabel', 1, { fri: 1.4 }], ['vegg', 'arbeidsbenk', 2], ['vegg', 'verktøyvogn', 2]],
    turbinhall: [['kran', 'traverskran'], ['vegg', 'kontrollpult', 1, { fri: 1.2 }], ['vegg', 'tavlepanel', 2, { fri: 1 }], ['rad', 'rørgate', A => Math.min(2, Math.floor(A / 200)), { fri: 1.4 }]],
    sorteringshall: [['rutenett', 'avfallscontainer', 6, { du: 6, dv: 4, mU: 2.5, mV: 2.5, fri: 2 }], ['vegg', 'skraphaug', A => Math.min(2, Math.floor(A / 200)), { fri: 1.6 }], ['midt', 'hjullaster', A => A > 300 ? 1 : 0, { fri: 2 }]],
    bryggerhall: [['rutenett', 'gjæringstank', 4, { du: 3.4, dv: 3.4, mU: 2.4, mV: 2.4, fri: 1.4 }], ['vegg', 'fat', A => Math.min(8, Math.floor(A / 30)), { fri: .6 }]],
    kjemihall: [['vegg', 'kjemikalieskap', 2, { fri: .8 }], ['vegg', 'nøddusj', 1, { fri: .6 }], ['rad', 'rørgate', A => Math.min(3, Math.floor(A / 150)), { fri: 1.4 }], ['vegg', 'blandetank', 1, { fri: 1.2 }]],
  };
  // lagerhallen (interior.js har egen kode for reolene): rullebane og truck i tillegg
  const LAGERHALL = [['vegg', 'rullebane', A => A > 120 ? 1 : 0, { fri: 1.4 }], ['midt', 'truck', A => A > 80 ? 1 : 0, { fri: 1.2 }]];
  // OPPSKRIFT[rolle]: linja først (den får de beste plassene), så resten
  const OPPSKRIFT = {};
  for (const [rolle, liste] of Object.entries(LINJER)) OPPSKRIFT[rolle] = [['linje', liste, A => A > 60 ? 1 : 0, { fri: 2.1 }], ...(EKSTRA[rolle] || [])];

  // ---------- 2D-symbolene i plantegningen ----------
  const SYMBOL = {
    sagbenk: 'sag', rammesag: 'sag', stokkbåndsag: 'sag', kantverk: 'sag', bordsag: 'sag', båndsag: 'sag', flishogger: 'vifte', barkemaskin: 'hjul',
    tømmerbord: 'bånd', transportbånd: 'bånd', sløyelinje: 'bånd', tappelinje: 'bånd', sorteringsbånd: 'bånd', rullebane: 'bånd', frysetunnel: 'bånd',
    tank: 'tank', gasstank: 'sylinder', varmeveksler: 'sylinder', destillasjonskolonne: 'tank', separator: 'tank', reaktor: 'tank', blandetank: 'tank', melketank: 'tank',
    gjæringstank: 'tank', bryggekjele: 'tank', kokekar: 'tank', generator: 'hjul', turbin: 'sylinder', fat: 'tank',
    knuser: 'knuser', kjegleknuser: 'knuser', sikt: 'knuser', grushaug: 'haug', pukkhaug: 'haug', skraphaug: 'haug', tømmerstabel: 'haug',
    iskar: 'kar', fiskekar: 'kar', ismaskin: 'kar', kjøttskinne: 'krok', pallereol: 'reol', kjølereol: 'reol', plankestabel: 'reol', stålplater: 'reol',
    tørkekammer: 'vifte', platefryser: 'skap', filetmaskin: 'skap', pakkemaskin: 'skap', pasteur: 'skap', deigelter: 'hjul', kontrollpult: 'pult', tavlepanel: 'pult',
    dreiebenk: 'valse', fres: 'kryss', cncfres: 'kryss', kantpresse: 'skap', platesaks: 'skap', sveisebord: 'kryss', esse: 'flamme', fakkel: 'flamme',
    båtbukk: 'båt', platevalse: 'valse', transformator: 'skap', ballepresse: 'skap', avfallscontainer: 'kar', rørbro: 'valse', rørstativ: 'valse', rørgate: 'valse',
    kompressor: 'vifte', sprøytestøper: 'skap', pumpestasjon: 'hjul', pumpe: 'hjul', høvel: 'valse', truck: 'kryss', hjullaster: 'kryss', limpresse: 'skap', lakkbås: 'skap', nøddusj: 'kryss',
  };

  // ---------- delene som beveger seg (spill/maskiner3d.js) ----------
  // blad: roterende skive (r meter, akse x/y), bånd: knaster som går langs bredden, røyk: røyk fra et punkt (høyde z),
  // stempel: opp og ned (høyde). Typene er både maskinene i interiøret og maskinene du bygger selv (produksjon.js / byggesett).
  const LIV = {
    sagbenk: [{ del: 'blad', x: 0, y: 0, z: 1.3, r: .55, akse: 'y' }], rammesag: [{ del: 'stempel', x: 0, y: 0, z: 1.75, slag: .35 }], kantverk: [{ del: 'blad', x: 0, y: .3, z: .9, r: .3, akse: 'x' }],
    transportbånd: [{ del: 'bånd' }], tømmerbord: [{ del: 'bånd' }], sløyelinje: [{ del: 'bånd' }], tappelinje: [{ del: 'bånd' }], sorteringsbånd: [{ del: 'bånd' }],
    esse: [{ del: 'røyk', x: 0, y: 0, z: 3 }], fakkel: [{ del: 'røyk', x: 0, y: 0, z: 5.2 }],
    // maskinene i leiren (produksjon.js): sagbruket, vedkløyveren, fyrkjelen, steinknuseren, fiskemottaket, smia, raffineriet
    // sagbenken i byggesettet (fabrikk-visning.js): bladet står i bordet foran motorhuset og stikker ca. 0,6 m opp over bordplata (0,85 m).
    // Sagbruket som eget bygg er et lukket hus (modellen «verksted») – der synes ikke bladet, så det får ingen deler.
    bs_sagbenk: [{ del: 'blad', x: 2.2, y: 0, z: .95, r: .55, akse: 'y' }],
    bs_høvel: [{ del: 'blad', x: 0, y: 0, z: 1.25, r: .2, akse: 'x' }], vedkløyver: [{ del: 'stempel', x: 0, y: 0, z: 1, slag: .5 }], bs_vedkløyver: [{ del: 'stempel', x: 0, y: 0, z: 1, slag: .5 }],
    fyrkjele: [{ del: 'røyk', x: 0, y: 0, z: 4.5 }], bs_fyrkjele: [{ del: 'røyk', x: 1.08, y: 0, z: 4.2 }], smie: [{ del: 'røyk', x: 0, y: 0, z: 4 }], raffineri: [{ del: 'røyk', x: 0, y: 0, z: 8 }],
    steinknuser: [{ del: 'stempel', x: 0, y: 0, z: 2.5, slag: .15 }], fiskemottak: [{ del: 'bånd' }],
    // (ut9-maskiner2) de nye maskinene i egen fabrikk (byggesettet): flishoggeren blåser flis (støv) ut av røret, filetmaskinens bånd går,
    // ballepressas stempel går opp og ned, steinknuseren rister
    bs_flishogger: [{ del: 'røyk', x: 1.6, y: 0, z: 2.4 }], bs_filetmaskin: [{ del: 'bånd', z: .95 }], bs_ballepresse: [{ del: 'stempel', x: 0, y: 0, z: 2.1, slag: .3 }],
    bs_knuser: [{ del: 'stempel', x: 0, y: 0, z: 2.9, slag: .12 }],
    // (ut10-fabrikkbygg) maskinene i industribygg dere har tatt i bruk (spill/fabrikkbygg.js, fb_<maskin>): står der møbelet står i hallen
    fb_sagbruk: [{ del: 'blad', x: 0, y: 0, z: 1.05, r: .5, akse: 'y' }], fb_flishogger: [{ del: 'røyk', x: 1.2, y: 0, z: 2.4 }], fb_steinknuser: [{ del: 'stempel', x: 0, y: 0, z: 2.9, slag: .12 }],
    fb_fiskemottak: [{ del: 'bånd', z: 1.05 }], fb_filetmaskin: [{ del: 'bånd', z: .95 }], fb_mølle: [{ del: 'bånd', z: 1.2 }], fb_raffineri: [{ del: 'røyk', x: 0, y: 0, z: 5.6 }],
    fb_smie: [{ del: 'røyk', x: 0, y: 0, z: 2.8 }], fb_ballepresse: [{ del: 'stempel', x: 0, y: 0, z: 2.1, slag: .3 }],
  };
  // (ut9-maskiner2) delene i byggesettet som tegnes med modellene her (fabrikk-visning.js bygg3d): del -> modell
  const FABRIKK = { bs_flishogger: 'flishogger', bs_filetmaskin: 'filetmaskin', bs_ballepresse: 'ballepresse', bs_knuser: 'knuser' };

  const api = { C, MASKINER, MODELLER, LINJER, EKSTRA, LAGERHALL, OPPSKRIFT, SYMBOL, LIV, FABRIKK, S, LX, LY, bein, rf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Maskiner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
