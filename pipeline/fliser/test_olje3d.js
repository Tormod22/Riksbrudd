// Test av reglene for oljeplattformene i 3D (site/dovre-fliser/spill/olje3d.js). Kjør: node pipeline/fliser/test_olje3d.js
const O = require('../../site/dovre-fliser/spill/olje3d.js');
let feil = 0; const sjekk = (ok, tekst) => { console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); if (!ok) feil++; };
const troll = O.utstyr({ navn: 'TROLL A', type: 0, fase: 'in service', funksjon: 'drilling - processing - quarter' });
sjekk(troll && troll.bor && troll.bolig && troll.fakkel && troll.stor && !troll.skip, 'Troll A: stor plattform med boretårn, boligkvarter og fakkel');
const liten = O.utstyr({ navn: 'X', type: 0, fase: 'in service', funksjon: 'wellhead' });
sjekk(liten && !liten.stor && !liten.bor && !liten.bolig, 'brønnhodeplattform: liten, uten boretårn og boligkvarter');
sjekk(O.utstyr({ navn: 'Y', type: 1, fase: 'in service', funksjon: 'subsea' }) === null, 'havbunnsinnretninger tegnes ikke');
sjekk(O.utstyr({ navn: 'Z', type: 3, fase: 'in service', funksjon: 'terminal' }) === null, 'anlegg på land tegnes ikke (de er vanlige bygg)');
sjekk(O.utstyr({ navn: 'W', type: 0, fase: 'removed', funksjon: 'drilling' }) === null, 'fjernede innretninger tegnes ikke');
const skip = O.utstyr({ navn: 'NORNE FPSO', type: 2, fase: 'in service', funksjon: 'fpso' });
sjekk(skip && skip.skip && !skip.bor && skip.fakkel, 'flytende innretning: produksjonsskip med fakkeltårn');
sjekk(O.utstyr({ navn: 'EKOFISK B-FL', type: 0, fase: 'in service', funksjon: null }).fakkel, 'fakkelplattform (navnet slutter på -FL) får fakkel');
process.exit(feil ? 1 : 0);
