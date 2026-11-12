/* K1 – oppstarten av et nytt spill: regler uten DOM (Node: require('./oppstart'); nettleser: globalThis.Oppstart).
 * Du lager karakteren (navn, utseende, bakgrunn med en liten bonus) og fraksjonen (navn og eget flagg), får 100 millioner kr
 * og velger hvor leiren skal ligge (ikke i et tettsted, ikke i vann, ikke utenfor kartet). Alt lagres som JSON (localStorage).
 * Se docs/plan-kollaps.md (K1). Bonusene er forslag fra planen, godkjent av brukeren 9. nov.
 */
(function (rot) {
  'use strict';
  const STARTPENGER = 100e6;
  // bonus: treff (faktor på treff for egne lag), sikt (faktor på siktvidden), penger (ekstra ved start),
  // helse (sårede blir friske så mange ganger fortere), bygg (byggefart), mat (faktor på matpris)
  const BAKGRUNNER = {
    soldat: { navn: 'Tidligere soldat', tekst: '+10 % treff for lagene dine', bonus: { treff: 1.1 } },
    lege: { navn: 'Lege', tekst: 'Sårede blir friske dobbelt så fort', bonus: { helse: 2 } },
    ingeniør: { navn: 'Ingeniør', tekst: 'Bygger 20 % raskere', bonus: { bygg: 1.2 } },
    bonde: { navn: 'Bonde', tekst: 'Mat 25 % billigere', bonus: { mat: .75 } },
    forretningsmann: { navn: 'Forretningsmann', tekst: '+10 millioner kr ved start', bonus: { penger: 10e6 } },
    politi: { navn: 'Politi', tekst: '+15 % sikt for lagene dine', bonus: { sikt: 1.15 } },
  };
  // Utseendet er et portrett fra portrettmotoren i Karakterstudio v3 (spill/portrett-motor.js, brukerens egen, 11. nov):
  // normalize() godtar bare kjente valg og farger. Startverdiene passer en leder etter kollapsen (feltuniform, åpen krage).
  const P = typeof module !== 'undefined' && module.exports ? require('./portrett-motor.js') : rot.RiksbruddPortrait;
  const PORTRETT = { gender: 'mann', role: 'militaer', age: 38, hair: 'short', hairColor: '#392824', facialHair: 'skjeggstubb',
    outfit: 'feltuniform', outfitColor: '#5c6254', shirt: 'mork', tieStyle: 'apen', background: '#555d65', expression: 'rolig' };
  // ugyldige valg faller tilbake til startverdiene våre (ikke motorens), så et ukjent antrekk blir feltuniform
  const FARGEFELT = { skin: 'skin', hairColor: 'hair', eyeColor: 'eyes', tieColor: 'tie', outfitColor: 'outfitColor', background: 'background' };
  const gyldig = (k, v) => (P.allowed[k] ? P.allowed[k].includes(v) : FARGEFELT[k] ? P.palettes[FARGEFELT[k]].includes(v) : P.numerics[k] ? Number.isFinite(Number(v)) : false);
  const portrett = (valg, navn) => { const ren = {}; for (const [k, v] of Object.entries(valg || {})) if (gyldig(k, v)) ren[k] = v;
    const c = P.normalize({ ...PORTRETT, ...ren }); c.name = String(navn || '').slice(0, 46); c.origin = ''; c.id = 'RB-27-0001'; return c; };
  // Flagget: et mønster i opptil tre farger, et symbol og opptil tre bokstaver
  const FARGER = ['#1f1f22', '#f2efe6', '#8f2a24', '#c8102e', '#e46c1e', '#e0b53a', '#4f7a2f', '#1f4d2e', '#2d6a8a', '#1d3557',
    '#5b3a6e', '#7a5a3a', '#9aa0a6', '#c9a227', '#3e5a3a', '#6b1e3a'];
  const MØNSTER = ['ensfarget', 'loddrett', 'vannrett', 'tre striper', 'kors', 'diagonal', 'ramme', 'sirkel', 'kile'];
  const SYMBOL = ['ingen', 'stjerne', 'sverd', 'kryssede sverd', 'skjold', 'krone', 'hammer', 'øks', 'anker', 'fjell', 'gran', 'sol',
    'lyn', 'ulv', 'ørn', 'tannhjul', 'hodeskalle', 'hjerte'];

  function standard() {
    return {
      versjon: 1, ferdig: false,
      karakter: { navn: '', bakgrunn: 'soldat', portrett: portrett() },
      fraksjon: { navn: '', flagg: { mønster: 'loddrett', farger: ['#1d3557', '#f2efe6', '#8f2a24'], symbol: 'ulv', symbolfarge: '#e0b53a', bokstaver: '', bokstavfarge: '#e0b53a' } },
      penger: STARTPENGER, leir: null,
    };
  }
  const renTekst = (t, maks) => String(t || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maks);
  // Feilene i valgene (tom liste = alt i orden). leir sjekkes for seg (gyldigLeir) fordi den trenger kartet.
  function feil(S) {
    const f = [], k = S.karakter, fr = S.fraksjon, fl = fr.flagg;
    if (renTekst(k.navn, 30).length < 2) f.push('Karakteren må ha et navn (minst 2 tegn).');
    if (!BAKGRUNNER[k.bakgrunn]) f.push('Velg en bakgrunn.');
    if (!k.portrett || typeof k.portrett !== 'object') f.push('Utseendet mangler.');
    if (renTekst(fr.navn, 40).length < 2) f.push('Fraksjonen må ha et navn (minst 2 tegn).');
    if (!MØNSTER.includes(fl.mønster) || !SYMBOL.includes(fl.symbol) || !Array.isArray(fl.farger) || fl.farger.length !== 3 || !fl.farger.every(c => /^#[0-9a-f]{6}$/i.test(c))) f.push('Flagget er ugyldig.');
    if (!/^[\p{L}\p{N}]{0,3}$/u.test(fl.bokstaver || '')) f.push('Flagget kan ha høyst tre bokstaver eller tall.');
    return f;
  }
  // Leirplassen: v = { iTettsted(x, y) -> navn | null, klasse(x, y) -> arealklasse (3 = vann, 255 = utenfor kartet) | undefined,
  //                    iNorge(x, y) -> false utenfor riksgrensa (valgfri) }
  function gyldigLeir(x, y, v) {
    if (!isFinite(x) || !isFinite(y)) return 'Ugyldig sted.';
    // riksgrensa (v.iNorge finnes når grensedataene er hentet): leiren kunne legges 5 km inn i Sverige (12. nov)
    if (v.iNorge && !v.iNorge(x, y)) return 'Leiren må ligge i Norge. Dette er på den andre siden av riksgrensa.';
    const by = v.iTettsted && v.iTettsted(x, y); if (by) return `Leiren kan ikke ligge inne i et tettsted (${by}).`;
    const k = v.klasse && v.klasse(x, y);
    // Svalbard (nord for 8150 km) vises i kartet, men har ikke arealdata: da er «her finnes det ikke kart» feil beskjed
    if (k === 255 || k === undefined) return y > 8150000 ? 'Svalbard er med i kartet, men kan ikke brukes til leir ennå. Velg et sted på fastlandet.' : 'Her finnes det ikke kart. Velg et sted i Norge.';
    if (k === 3) return 'Leiren kan ikke ligge i vann.';
    return null;
  }
  // Ferdig: valgene er gyldige og leiren er satt. Pengene settes én gang (100 mill. + eventuell bonus).
  function fullfør(S, leir) {
    const f = feil(S); if (f.length) return f;
    S.karakter.navn = renTekst(S.karakter.navn, 30); S.fraksjon.navn = renTekst(S.fraksjon.navn, 40); S.karakter.portrett = portrett(S.karakter.portrett, S.karakter.navn);
    S.fraksjon.flagg.bokstaver = (S.fraksjon.flagg.bokstaver || '').toUpperCase();
    S.leir = { x: Math.round(leir.x), y: Math.round(leir.y) };
    S.penger = STARTPENGER + (BAKGRUNNER[S.karakter.bakgrunn].bonus.penger || 0); S.ferdig = true; return [];
  }
  const bonus = S => (S && S.ferdig && BAKGRUNNER[S.karakter.bakgrunn] ? BAKGRUNNER[S.karakter.bakgrunn].bonus : {});
  // Kroner som tekst: «100 mill. kr», «2,5 mill. kr», «15 000 kr»
  function kroner(n) {
    const nf = (v, d) => v.toLocaleString('nb-NO', { maximumFractionDigits: d });
    if (Math.abs(n) >= 1e9) return nf(n / 1e9, 2) + ' mrd. kr';
    if (Math.abs(n) >= 1e6) return nf(n / 1e6, 1) + ' mill. kr';
    return nf(Math.round(n), 0) + ' kr';
  }
  function tilJSON(S) { return JSON.stringify(S); }
  // Leser lagrede valg; ødelagt eller ukjent versjon gir null (da starter man på nytt)
  function fraJSON(t) {
    try { const S = JSON.parse(t); if (!S || S.versjon !== 1 || !S.karakter || !S.fraksjon) return null;
      const s = standard(); return { ...s, ...S, karakter: { ...s.karakter, ...S.karakter, portrett: portrett(S.karakter.portrett, S.karakter.navn) }, fraksjon: { ...s.fraksjon, ...S.fraksjon, flagg: { ...s.fraksjon.flagg, ...(S.fraksjon.flagg || {}) } } };
    } catch (e) { return null; }
  }
  // Lysere og mørkere utgave av en farge (for kartet: farge, lys, sti)
  function nyanse(hex, f) { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
  // Hovedfargen til fraksjonen: den første fargen i flagget som ikke er nesten hvit eller svart
  function hovedfarge(fl) { const lys = c => { const n = parseInt(c.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };
    return fl.farger.find(c => lys(c) > .12 && lys(c) < .85) || fl.farger[0]; }

  // ---------- tegning av flagget (bare et 2D-lerret, ingen DOM) ----------
  function tegnFlagg(g, fl, w, h) {
    const [a, b, c] = fl.farger; g.save();
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    const m = fl.mønster;
    if (m === 'loddrett') { g.fillStyle = b; g.fillRect(w / 2, 0, w / 2, h); }
    else if (m === 'vannrett') { g.fillStyle = b; g.fillRect(0, h / 2, w, h / 2); }
    else if (m === 'tre striper') { g.fillStyle = b; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = c; g.fillRect(0, 2 * h / 3, w, h / 3); }
    else if (m === 'kors') { const t = h * .22, x = w * .3; g.fillStyle = b; g.fillRect(x - t * .75, 0, t * 1.5, h); g.fillRect(0, h / 2 - t * .75, w, t * 1.5);
      g.fillStyle = c; g.fillRect(x - t * .35, 0, t * .7, h); g.fillRect(0, h / 2 - t * .35, w, t * .7); }
    else if (m === 'diagonal') { g.fillStyle = b; g.beginPath(); g.moveTo(w, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill(); }
    else if (m === 'ramme') { const t = h * .12; g.fillStyle = b; g.fillRect(0, 0, w, h); g.fillStyle = a; g.fillRect(t, t, w - 2 * t, h - 2 * t); }
    else if (m === 'sirkel') { g.fillStyle = b; g.beginPath(); g.arc(w / 2, h / 2, h * .36, 0, 6.283); g.fill(); }
    else if (m === 'kile') { g.fillStyle = b; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * .45, h / 2); g.lineTo(0, h); g.closePath(); g.fill(); }
    const tekst = fl.bokstaver || '', har = fl.symbol && fl.symbol !== 'ingen';
    const sx = m === 'kile' ? w * .16 : w / 2, sy = tekst && har ? h * .42 : h / 2, r = (tekst && har ? .26 : .34) * h;
    if (har) tegnSymbol(g, fl.symbol, sx, sy, r, fl.symbolfarge);
    if (tekst) { const fs = (har ? .24 : .48) * h; g.fillStyle = fl.bokstavfarge; g.font = `bold ${fs}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(tekst, m === 'kile' && !har ? w * .6 : w / 2, har ? h * .82 : h / 2 + fs * .04); }
    g.restore();
  }
  // Enkle symboler i en sirkel med radius r rundt (x, y)
  function tegnSymbol(g, navn, x, y, r, farge) {
    g.save(); g.translate(x, y); g.scale(r, r); g.fillStyle = g.strokeStyle = farge; g.lineWidth = .1; g.lineJoin = 'round'; g.lineCap = 'round';
    const P = pts => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
    const sverd = () => { P([-.07, .55, -.07, -.75, 0, -.92, .07, -.75, .07, .55]); g.fillRect(-.32, .48, .64, .1); g.fillRect(-.06, .58, .12, .28); g.beginPath(); g.arc(0, .92, .09, 0, 6.283); g.fill(); };
    switch (navn) {
      case 'stjerne': { const p = []; for (let i = 0; i < 10; i++) { const v = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? .4 : 1; p.push(Math.cos(v) * rr, Math.sin(v) * rr); } P(p); break; }
      case 'sverd': sverd(); break;
      case 'kryssede sverd': g.save(); g.rotate(Math.PI / 4); sverd(); g.restore(); g.save(); g.rotate(-Math.PI / 4); sverd(); g.restore(); break;
      case 'skjold': g.beginPath(); g.moveTo(-.75, -.8); g.lineTo(.75, -.8); g.lineTo(.75, -.1); g.quadraticCurveTo(.7, .6, 0, .95); g.quadraticCurveTo(-.7, .6, -.75, -.1); g.closePath(); g.fill(); break;
      case 'krone': P([-.85, .55, -.85, -.45, -.45, 0, 0, -.7, .45, 0, .85, -.45, .85, .55]); g.fillRect(-.85, .62, 1.7, .2); break;
      case 'hammer': g.fillRect(-.09, -.35, .18, 1.25); P([-.65, -.75, .55, -.75, .65, -.55, .55, -.35, -.65, -.35]); break;
      case 'øks': g.fillRect(-.08, -.85, .16, 1.75); g.beginPath(); g.moveTo(.05, -.75); g.quadraticCurveTo(.95, -.75, .85, .05); g.quadraticCurveTo(.5, -.15, .05, -.2); g.closePath(); g.fill(); break;
      case 'anker': g.lineWidth = .16; g.beginPath(); g.moveTo(0, -.6); g.lineTo(0, .8); g.moveTo(-.4, -.35); g.lineTo(.4, -.35); g.moveTo(-.7, .3); g.quadraticCurveTo(-.5, .85, 0, .85); g.quadraticCurveTo(.5, .85, .7, .3); g.stroke(); g.beginPath(); g.arc(0, -.75, .17, 0, 6.283); g.stroke(); break;
      case 'fjell': P([-1, .7, -.35, -.55, -.05, -.05, .3, -.75, 1, .7]); break;
      case 'gran': P([0, -.95, .35, -.35, .2, -.35, .55, .2, .35, .2, .75, .7, -.75, .7, -.35, .2, -.55, .2, -.2, -.35, -.35, -.35]); g.fillRect(-.1, .7, .2, .25); break;
      case 'sol': g.beginPath(); g.arc(0, 0, .45, 0, 6.283); g.fill(); g.lineWidth = .13; for (let i = 0; i < 12; i++) { const v = i * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(v) * .6, Math.sin(v) * .6); g.lineTo(Math.cos(v) * .92, Math.sin(v) * .92); g.stroke(); } break;
      case 'lyn': P([.2, -.95, -.5, .1, -.05, .1, -.25, .95, .55, -.15, .08, -.15]); break;
      case 'ulv': P([-.55, -.85, -.2, -.4, .2, -.4, .55, -.85, .62, -.2, .85, .1, .3, .9, -.3, .9, -.85, .1, -.62, -.2]); break;
      case 'ørn': P([0, -.65, .15, -.5, .95, -.75, .55, -.1, .9, .05, .25, .2, .3, .85, 0, .6, -.3, .85, -.25, .2, -.9, .05, -.55, -.1, -.95, -.75, -.15, -.5]); break;
      case 'tannhjul': { const p = []; for (let i = 0; i < 16; i++) { const v = i * Math.PI / 8, rr = i % 2 ? .68 : .92; p.push(Math.cos(v - .12) * rr, Math.sin(v - .12) * rr, Math.cos(v + .12) * rr, Math.sin(v + .12) * rr); } P(p);
        g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, .3, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over'; break; }
      case 'hodeskalle': g.beginPath(); g.arc(0, -.15, .65, 0, 6.283); g.fill(); g.fillRect(-.4, .3, .8, .45); g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(-.25, -.15, .17, 0, 6.283); g.arc(.25, -.15, .17, 0, 6.283); g.fill(); P([0, .1, -.1, .28, .1, .28]); g.globalCompositeOperation = 'source-over'; break;
      case 'hjerte': g.beginPath(); g.moveTo(0, .85); g.bezierCurveTo(-1.1, 0, -.6, -.95, 0, -.4); g.bezierCurveTo(.6, -.95, 1.1, 0, 0, .85); g.fill(); break;
    }
    g.restore();
  }
  const api = { STARTPENGER, BAKGRUNNER, PORTRETT, portrett, P, FARGER, MØNSTER, SYMBOL, standard, feil, gyldigLeir, fullfør, bonus, kroner, tilJSON, fraJSON, nyanse, hovedfarge, tegnFlagg, tegnSymbol };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Oppstart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
