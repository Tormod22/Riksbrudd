// Test av grafikknivået i auto (site/dovre-fliser/spill/kvalitet.js): ned når det går tregt, opp igjen når det går lett lenge, ikke fram og tilbake.
const K = require('../../site/dovre-fliser/spill/kvalitet.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let s = { nivå: 'høy' };
ok(K.neste(s, 30, 1, 10) === 'høy', 'treg, men oppløsningen er ikke senket ennå: blir på høy');
s = { nivå: 'høy' }; s.nivå = K.neste(s, 30, .6, 10); ok(s.nivå === 'middels', 'treg med lav oppløsning: ned til middels');
ok(K.neste(s, 30, .6, 12) === 'middels', 'venter minst 4 s før neste endring');
s.nivå = 'middels'; ok(K.neste(s, 45, 1, 15) === 'lav', 'svært treg (45 ms): ned uansett oppløsning');
s.nivå = 'lav'; ok(K.neste(s, 60, .6, 30) === 'lav', 'lav er laveste');
s = { nivå: 'lav' }; let n = s.nivå; for (let t = 0; t <= 30; t++) n = s.nivå = K.neste(s, 16.7, 1, t); ok(n === 'middels', 'jevne 60 bilder/s i over 20 s: opp et nivå');
s = { nivå: 'høy' }; K.neste(s, 30, .6, 10); s.nivå = 'middels'; let m = 'middels'; for (let t = 11; t <= 50; t++) m = s.nivå = K.neste(s, 16.7, 1, t); ok(m === 'middels', 'ikke opp igjen til et nivå som var for tungt det siste minuttet');
for (let t = 51; t <= 120; t++) m = s.nivå = K.neste(s, 16.7, 1, t); ok(m === 'høy', 'etter et minutt kan det prøves igjen');
ok(K.REKKE.every(k => K.NIVÅ[k].pr[0] > 0 && K.NIVÅ[k].tre > 0), 'alle nivåene har pikseltetthet og trær');
ok(K.NIVÅ.lav.pr[0] < K.NIVÅ.middels.pr[0] && K.NIVÅ.middels.pr[0] < K.NIVÅ.høy.pr[0], 'lavere nivå = færre piksler');
// grafikkortet: programvare-tegnere kjennes igjen, ekte grafikkort gjør ikke; navnet kortes ned
ok(K.programvare('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)') && K.programvare('llvmpipe (LLVM 15.0.7, 256 bits)') && K.programvare('ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)'), 'programvare-grafikk kjennes igjen (SwiftShader, llvmpipe, Basic Render Driver)');
ok(!K.programvare('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)') && !K.programvare('ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F99) Direct3D11 vs_5_0 ps_5_0, D3D11)') && !K.programvare('Apple GPU') && !K.programvare(''), 'ekte grafikkort (Intel, NVIDIA, Apple) og ukjent navn er ikke programvare');
ok(K.kortNavn('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)') === 'Intel(R) UHD Graphics 620' && K.kortNavn('ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F99) Direct3D11 vs_5_0 ps_5_0, D3D11)') === 'NVIDIA GeForce GTX 1650' && K.kortNavn('Apple GPU') === 'Apple GPU' && K.kortNavn('') === 'ukjent', 'navnet på grafikkortet kortes ned: ' + K.kortNavn('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)'));
process.exit(feil ? 1 : 0);
