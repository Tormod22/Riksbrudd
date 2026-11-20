// Test av reglene i spill/skjermlag.js (rekkefølgen på vinduene, runde 6): node pipeline/fliser/test_skjermlag.js
const S = require('../../site/dovre-fliser/spill/skjermlag.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const R = S.REGLER;
ok(R.kort < R.alarm && R.alarm < R.selv && R.selv < R.bunnmeny && R.bunnmeny < R.tips && R.tips < R.ring, 'båndene: kort < alarm < egne paneler < bunnmenyen < tips < ring');
ok(S.orden([], ['karakterark']).join() === 'karakterark', 'første panel');
ok(S.orden(['karakterark'], ['karakterark', 'hjelp']).join() === 'karakterark,hjelp', 'det som åpnes sist, legges øverst (hjelpen over Deg)');
ok(S.orden(['forklaring', 'lagmeny'], ['lagmeny']).join() === 'lagmeny', 'et lukket panel tas ut');
ok(S.orden(['leirmeny', 'hjelp'], ['hjelp', 'leirmeny', 'sekk']).join() === 'leirmeny,hjelp,sekk', 'de som står, beholder plassen; nye kommer øverst');
ok(S.fram(['a', 'b', 'c'], 'a').join() === 'b,c,a' && S.fram(['a'], 'x').join() === 'a', 'et trykk i et panel løfter det fram');
const o = ['forklaring', 'lagmeny'];
ok(S.zFor('lagmeny', o) > S.zFor('forklaring', o), '☰ åpnet etter tegnforklaringen ligger over den');
ok(S.zFor('hendelse', o) < S.zFor('alarm', o) && S.zFor('alarm', o) < S.zFor('forklaring', o), 'kort under alarmen, alarmen under panelene du åpner selv');
ok(S.zFor('ukjent', o) === null && S.zFor('sekk', []) === null, 'ukjente og lukkede paneler får ingen z');
const mange = Array.from({ length: 60 }, (_, i) => 'p' + i);
ok(S.zFor('p59', mange) <= R.selvMaks, 'mange paneler går ikke over bunnmenyen');
ok(['hendelse', 'samfunnkort', 'formkort', 'krigkort'].every(id => S.KORT.includes(id)), 'kortene som setter spillet på pause');
// runde 8: hendelseskortet og spørsmålene fra folket venter mens leiren angripes; seier/tap og krigskortet kommer straks
ok(S.venter(true).join() === 'hendelse,samfunnkort' && S.venter(false).length === 0, 'kortene som venter til angrepet er over');
ok(!S.venter(true).includes('formkort') && !S.venter(true).includes('krigkort'), 'spillformkortet og krigskortet venter ikke');
console.log(feil ? `${feil} FEIL` : 'Alt ok'); process.exit(feil ? 1 : 0);
