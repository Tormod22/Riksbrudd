/* Leting i hus: regler uten DOM (Node: require('./leting'); nettleser: globalThis.Leting).
 * Brukeren 16. nov: «legg til flere funksjoner». Når du har gått inn i et bygg (spill/interior3d.js), kan du lete gjennom det én
 * gang. Hva du finner, kommer an på hva slags bygg det er og hvor stort det er – butikker har mat, verksteder og lager har
 * materialer, garasjer litt diesel, boliger litt av hvert, og en del hus er alt tømt av andre. Samme bygg gir alltid det samme.
 * funn(kl, areal, i) gir { mat (rasjoner), tre (m³), betong (m³), stål (t), diesel (l), penger (kr), tomt, person }.
 * person = det er en overlevende i bygget (i noen boliger, hytter, skoler, sykehus og kirker) som kan bli med til leiren.
 * Mengdene er små mot det leiren bruker (en rasjon koster 3000 kr å kjøpe) – de er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // per klasse: sjansen for at bygget er tomt, og hva som kan ligge der [slag, sjanse, minst, mest] for et bygg på 100 m²
  const KLASSER = {
    hus: { tomt: .3, ting: [['mat', .8, 2, 9], ['penger', .35, 5000, 60000], ['diesel', .15, 5, 25], ['tre', .2, .5, 1.5]] },
    hytte: { tomt: .35, ting: [['mat', .7, 2, 8], ['tre', .5, .5, 2], ['diesel', .1, 5, 15]] },
    leil: { tomt: .3, ting: [['mat', .8, 4, 12], ['penger', .4, 10000, 80000]] },
    uthus: { tomt: .35, ting: [['diesel', .5, 10, 40], ['tre', .5, .5, 2.5], ['stål', .3, .1, .5]] },
    låve: { tomt: .25, ting: [['tre', .7, 1, 4], ['diesel', .4, 15, 60], ['mat', .4, 3, 12], ['stål', .3, .2, .8]] },
    // (balansen 18. nov) en butikk har fulle hyller i 3D – den er aldri tom (før 20 %)
    butikk: { tomt: 0, ting: [['mat', 1, 25, 70], ['penger', .3, 10000, 100000]] },
    kontor: { tomt: .4, ting: [['penger', .5, 10000, 120000], ['mat', .4, 2, 8]] },
    skole: { tomt: .4, ting: [['mat', .6, 6, 20], ['tre', .3, .5, 2]] },
    sykehus: { tomt: .3, ting: [['mat', .7, 10, 30], ['penger', .3, 20000, 100000]] },
    industri: { tomt: .25, ting: [['stål', .8, .5, 2.5], ['tre', .5, 1, 4], ['diesel', .5, 20, 80], ['betong', .3, 1, 4]] },
    lager: { tomt: .25, ting: [['tre', .7, 2, 6], ['stål', .5, .5, 2], ['mat', .4, 10, 40], ['betong', .3, 1, 5]] },
    kirke: { tomt: .7, ting: [['penger', .5, 2000, 20000]] },
    hangar: { tomt: .3, ting: [['diesel', .8, 40, 150], ['stål', .5, .5, 2]] },
    terminal: { tomt: .35, ting: [['mat', .7, 10, 40], ['penger', .4, 10000, 80000]] },
  };
  // sjansen for å møte en overlevende, per klasse (ellers 0)
  const OVERLEVENDE = { hus: .06, hytte: .08, leil: .06, skole: .1, sykehus: .12, kirke: .15, låve: .04 };
  const ENHET = { mat: ['rasjon', 'rasjoner'], tre: ['m³ tre', 'm³ tre'], betong: ['m³ betong', 'm³ betong'], stål: ['t stål', 't stål'], diesel: ['l diesel', 'l diesel'], penger: ['kr', 'kr'] };
  const rund = (slag, v) => slag === 'mat' || slag === 'diesel' ? Math.round(v) : slag === 'penger' ? Math.round(v / 1000) * 1000 : Math.round(v * 10) / 10;
  function funn(kl, areal, i) {
    const K = KLASSER[kl] || KLASSER.hus, f = { mat: 0, tre: 0, betong: 0, stål: 0, diesel: 0, penger: 0, tomt: false, person: hash(i, 3) < (OVERLEVENDE[KLASSER[kl] ? kl : 'hus'] || 0) };
    if (hash(i, 1) < K.tomt) { f.tomt = true; return f; }
    // større bygg har mer, men ikke i takt med arealet (roten), og høyst seks ganger et bygg på 100 m²
    const skala = Math.max(.4, Math.min(6, Math.sqrt(Math.max(10, areal) / 100)));
    K.ting.forEach(([slag, sjanse, a, b], n) => { if (hash(i, 10 + n) < sjanse) f[slag] = rund(slag, (a + (b - a) * hash(i, 40 + n)) * skala); });
    if (!(f.mat || f.tre || f.betong || f.stål || f.diesel || f.penger)) f.tomt = true;
    return f;
  }
  // Sekunder det tar å lete gjennom bygget (du må bli inne)
  const tid = areal => Math.max(4, Math.min(15, 4 + Math.max(0, areal) / 40));
  const tall = v => String(v).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function tekst(f) {
    if (f.tomt) return f.person ? 'Huset var tømt for alt av verdi.' : 'Huset var tomt – noen har vært her før.';
    const d = []; for (const slag of ['mat', 'tre', 'betong', 'stål', 'diesel', 'penger']) if (f[slag] > 0) d.push(tall(f[slag]) + ' ' + ENHET[slag][f[slag] === 1 ? 0 : 1]);
    return 'Du fant ' + (d.length > 1 ? d.slice(0, -1).join(', ') + ' og ' + d[d.length - 1] : d[0]) + '.';
  }
  // (runde 12, kritiker F: «Du fant 17 rasjoner», men HUD-en viste «rasjoner 2» og ingenting sa hvor de ble av) – hvor funnet havnet.
  // tot.mat = rasjonene i leirens matlager etterpå (FolkSpill). Feltrasjonene i sekken er noe annet enn leirens matlager.
  function hvor(f, tot = {}) { const d = [];
    if (f.mat > 0) d.push('rasjonene i leirens matlager' + (Number.isFinite(tot.mat) ? ` (${tall(Math.round(tot.mat))} i alt)` : ''));
    if (f.tre > 0 || f.betong > 0 || f.stål > 0) d.push('materialene på lageret'); if (f.diesel > 0) d.push('dieselen på tankene'); if (f.penger > 0) d.push('pengene i kassa');
    if (!d.length) return ''; return 'Lagt i leiren: ' + (d.length > 1 ? d.slice(0, -1).join(', ') + ' og ' + d[d.length - 1] : d[0]) + (f.mat > 0 ? ' – ikke i sekken din' : '') + '.'; }
  // (løkka r1, kritiker J: «Funnet i låven var tamt: 4 rasjoner, 20 000 kr») – én kort setning om stedet, fast per bygg (samme bygg gir
  // samme setning), etter byggtypen og det som ble funnet. Nøkternt, i samme ånd som lappene i spill/spor.js. Setningene er Claudes forslag.
  // STEMNING[gruppe][slag] = setninger; slag = det viktigste som ble funnet (mat, penger, diesel, tre, stål), «tomt» eller «alt» (reserve)
  const STEMNING = {
    bolig: {
      mat: ['Kjøkkenbenken er ryddet, men i kjelleren står det sylteglass på rad.', 'Bak hermetikken i spiskammeret står en pappeske ingen har åpnet.',
        'Kjøleskapet står åpent og tomt. Fryseboksen i boden var glemt.', 'Noen har stablet boksmat under trappa og lagt et teppe over.'],
      penger: ['I en skoeske i klesskapet ligger en konvolutt merket «strømregninga».', 'Pengene lå i en kakeboks øverst i kjøkkenskapet.'],
      diesel: ['I garasjen står en dunk diesel bak sommerdekkene.'],
      tre: ['Vedkassa ved ovnen er full, og bak huset ligger det plank under en presenning.'],
      alt: ['Sengene er oppredd. Det ser ut som de reiste i ro og mak.'],
      tomt: ['Skuffene er trukket ut og tømt på gulvet.', 'Døra sto på gløtt. Det eneste som er igjen, er gardinene.',
        'Kjøkkenskapene står åpne. Noen tok alt og hadde dårlig tid.'] },
    hytte: {
      mat: ['Hytteboka ligger på bordet. Siste innførsel er fra påsken, og i boden står det fortsatt boksmat.'],
      tre: ['Vedskjulet er fullt. Noen har stablet det pent til en vinter som aldri kom.'],
      alt: ['Det lukter kald røyk. På peishylla står et bilde av en familie på ski.'],
      tomt: ['Vinduet ved døra er knust, og skapene står tomme.'] },
    gård: {
      mat: ['Under høyet ligger det sekker med poteter og korn.', 'I melkerommet står det kasser med mat ingen rakk å hente.'],
      diesel: ['Traktoren står tom, men kannene i hjørnet er fulle.'],
      stål: ['Bak verktøyveggen ligger stålprofiler og en rull med netting.'],
      tre: ['Det ligger materialer på loftet, lagt til side til et tilbygg.'],
      alt: ['Det knirker i takbjelkene. Redskapene henger fortsatt på plass.'],
      tomt: ['Båsene er tomme, og døra slår i vinden. Dyra er borte.'] },
    butikk: {
      mat: ['Hyllene foran er tomme, men lageret bak var låst og urørt.', 'Kassaapparatet er brutt opp. I kjølerommet bak lå det kartonger ingen så.'],
      tomt: ['Det er glasskår over hele gulvet. Hyllene er tømt helt inn til veggen.'] },
    offentlig: {
      mat: ['Kantina er tom, men nødlageret i kjelleren er urørt.', 'Tegningene henger fortsatt på veggen. Kjøkkenet hadde et lite lager.'],
      penger: ['I personalrommet står en pengekasse med kontanter fra en innsamling.'],
      alt: ['Oppslagstavla er full av beskjeder om stengte dager. Den siste er skrevet for hånd.'],
      tomt: ['Pultene står i rader. Alt annet er båret ut.', 'Medisinskapene er brutt opp og tømt.'] },
    industri: {
      stål: ['Hallen er stille. Ved porten ligger stål og bordkledning på paller.'],
      diesel: ['Truckene står parkert på rekke. Tanken bak hallen har fortsatt diesel i bunnen.'],
      mat: ['Øverst i pallereolene står det fortsatt varer ingen nådde.'],
      alt: ['Stemplingsuret viser fortsatt samme dag. Hjelmene henger på knaggene.'],
      tomt: ['Portene er brutt opp, og hallen er ribbet for alt som kunne bæres.'] },
    kirke: {
      penger: ['Kollektbøssa står urørt ved døra. Ingen ville ta den.'],
      alt: ['Det står lys på alteret, brent helt ned.'],
      tomt: ['Benkene er tomme. Noen har sovet her og gått videre.'] },
  };
  const GRUPPE = { hus: 'bolig', leil: 'bolig', hytte: 'hytte', låve: 'gård', uthus: 'gård', butikk: 'butikk', kontor: 'offentlig', skole: 'offentlig', sykehus: 'offentlig', terminal: 'offentlig',
    industri: 'industri', lager: 'industri', hangar: 'industri', kirke: 'kirke' };
  // hva som teller mest i et funn (den første som er med)
  const VIKTIGST = ['mat', 'penger', 'diesel', 'tre', 'stål', 'betong'];
  function stemning(kl, i, f) {
    const G = STEMNING[GRUPPE[kl] || 'bolig'] || STEMNING.bolig, slag = !f || f.tomt ? 'tomt' : (VIKTIGST.find(k => f[k] > 0 && G[k]) || 'alt');
    const L = G[slag] || G.alt || STEMNING.bolig.alt; return L[Math.floor(hash(i, 777) * L.length)] || '';
  }
  // setter stemningen inn etter den første setningen i en melding («Du fant … . <stemning> Lagt i leiren …»)
  const medStemning = (melding, st) => { if (!st) return melding; const m = String(melding), k = m.search(/[.!?](\s|$)/); return k < 0 ? m + ' ' + st : m.slice(0, k + 1) + ' ' + st + m.slice(k + 1); };
  const api = { KLASSER, OVERLEVENDE, STEMNING, funn, tid, tekst, hvor, stemning, medStemning };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Leting = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
