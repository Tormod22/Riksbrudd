/* Riksbrudd – HVERDAGSTING (28. nov, brukeren: «Vi må ha et skikkelig lagringssystem med hyller som kan lagre for eksempel
 * peanøttsmør, alt slags mulig småting og hverdagslige ting»). Regler uten DOM (Node: require('./ting'); nettleser: globalThis.Ting).
 * Lagringen (hyller, kjøleskap, skap …) står i spill/tinglager.js, visningen i spill/tinglager-visning.js. Test: pipeline/fliser/test_ting.js.
 *
 *  KATALOGEN: ca. 200 ting i ti kategorier – mat, drikke, hygiene, medisin, verktøy, elektro, klær, kjøkken, fritid og kontor.
 *  Hver ting har navn, kategori, vekt (kg), volum (liter), holdbarhet (døgn i riktig lagring, 0 = tåler alt), verdi (kr), hvor den
 *  helst skal stå (lag: tørt, kjøl, frys, vann, medisin, verktøy, klær) og hva den kan brukes til:
 *   r   = rasjoner (mat og drikke teller i leirens matlager),
 *   h   = raskere heling (andel, f.eks. 0,3 = 30 % raskere) og antall doser (én dose per syk person per døgn),
 *   m   = moral som brukes opp (poeng, gruppe, porsjoner = person-døgn per stk.: kaffe, sjokolade, tobakk …),
 *   M   = moral som varer (poeng, hvor mange personer én dekker: kortstokk, bøker, gitar, radio …),
 *   t   = tempo-bonus for en oppgave i folk.js (oppgave, andel, hvor mange arbeidere én dekker: hammer → bygg …),
 *   krever = noe den bruker opp for å virke (radioen tar batterier).
 *   s   = hvor vanlig den er (1 = vanlig, 0,2 = sjelden).
 *  FUNN: funnIRom(rolle, frø, skala) gir det som ligger i et rom (kjøkken: mat; bad: hygiene og medisin; bod og garasje: verktøy;
 *   soverom: klær …), funnIBygg(kl, areal, i, o) for et helt bygg (rommene etter byggklassen – en butikk har mest mat).
 *  ALLE TALL ER CLAUDES FORSLAG (vekter, volumer, holdbarhet, priser, rasjoner, moral, tempo og sjansene).
 */
(function (rot) {
  'use strict';
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // Claudes forslag, alle sammen
  const REGLER = {
    // én rasjon = det én person spiser på et døgn (folk.js); verdien i kroner av en rasjon (samme som å kjøpe mat i Folk-panelet)
    rasjonKr: 3000,
    // salg: andel av verdien du får når du selger (markedet tar sitt)
    salg: .6,
    // moral: høyst så mange poeng fra tingene til sammen
    moralMaks: 12,
    // tempo: høyst så mye raskere en oppgave går med verktøy
    tempoMaks: .2,
    // heling: høyst så mye raskere med medisin (den beste som finnes brukes)
    helingMaks: .8,
    // funn: høyst så mange slag ting fra ett bygg, og skalaen etter arealet (roten av arealet / 100 m², mellom min og maks)
    maksSlag: 28, skala: [.6, 2.5],
    // snart ut på dato: under så mange døgn igjen (eller under 20 % av holdbarheten)
    snart: 3, snartAndel: .2,
  };

  const KATEGORIER = {
    mat: { navn: 'Mat', lag: 'tørt' }, drikke: { navn: 'Drikke', lag: 'tørt' }, hygiene: { navn: 'Hygiene', lag: 'tørt' },
    medisin: { navn: 'Medisin', lag: 'medisin' }, verktøy: { navn: 'Verktøy', lag: 'verktøy' }, elektro: { navn: 'Elektro', lag: 'tørt' },
    klær: { navn: 'Klær', lag: 'klær' }, kjøkken: { navn: 'Kjøkken', lag: 'tørt' }, fritid: { navn: 'Fritid og moral', lag: 'tørt' },
    kontor: { navn: 'Kontor og annet', lag: 'tørt' },
  };
  const KAT_REKKE = Object.keys(KATEGORIER);
  const LAG = ['tørt', 'kjøl', 'frys', 'vann', 'medisin', 'verktøy', 'klær'];

  // KATALOGEN. Én linje per ting: id | navn | enhet | vekt kg | volum l | holdbarhet døgn (0 = tåler alt) | verdi kr | lag (- = kategoriens) | bruk
  // navn uten enhet: «entall/flertall» (1 hammer, 2 hammere); enhet: «entall/flertall» eller ett ord for begge (1 glass, 2 glass).
  // ID-ene som også finnes i spill/lut.js (gjenstander i husene) og spill/utstyr.js (sekken), er de samme – så tingene kan flyttes mellom sekken og lageret.
  const TABELL = `
# mat
peanøttsmør | Peanøttsmør | glass | .4 | .4 | 365 | 2400 | - | r=.8
hermbønner | Hermetiske bønner | boks/bokser | .45 | .45 | 900 | 1500 | - | r=.5
hermtomat | Hermetiske tomater | boks/bokser | .45 | .45 | 900 | 900 | - | r=.2
fiskeboller | Fiskeboller | boks/bokser | .56 | .55 | 900 | 1500 | - | r=.5
lapskaus | Lapskaus | boks/bokser | .56 | .55 | 900 | 2100 | - | r=.7
pølseboks | Pølser på boks | boks/bokser | .58 | .55 | 900 | 1800 | - | r=.6
makrell | Makrell i tomat | boks/bokser | .17 | .15 | 900 | 900 | - | r=.3
leverpostei_boks | Leverpostei på boks | boks/bokser | .1 | .1 | 600 | 600 | - | r=.2
kjøttkaker_boks | Kjøttkaker i brun saus | boks/bokser | .55 | .55 | 900 | 2100 | - | r=.7
ravioli | Ravioli | boks/bokser | .4 | .4 | 900 | 1500 | - | r=.5
suppepose | Posesuppe | pose/poser | .08 | .2 | 540 | 600 | - | r=.2
knekkebrød | Knekkebrød | pakke/pakker | .3 | .8 | 540 | 1200 | - | r=.4
havregryn | Havregryn | pose/poser | .5 | .9 | 365 | 2400 | - | r=.8
müsli | Müsli | pose/poser | .75 | 1.2 | 300 | 2700 | - | r=.9
cornflakes | Cornflakes | eske/esker | .5 | 2.5 | 270 | 1800 | - | r=.6
ris | Ris | pose/poser | 1 | 1.1 | 900 | 3600 | - | r=1.2
pasta | Pasta | pose/poser | .5 | .8 | 730 | 1800 | - | r=.6
mel | Hvetemel | pose/poser | 2 | 2.5 | 365 | 4500 | - | r=1.5
sukker | Sukker | pose/poser | 1 | 1 | 0 | 2400 | - | r=.8
salt | Salt | pakke/pakker | 1 | .8 | 0 | 600 | - | m=.5/salt/200
krydder | Krydderboks | boks/bokser | .05 | .1 | 900 | 300 | - | m=.3/salt/60
tørrfisk | Tørrfisk | stk. | .35 | 1 | 900 | 1800 | - | r=.6
tørrkjøtt | Fenalår i skiver | pakke/pakker | .2 | .3 | 120 | 1800 | - | r=.5
spekepølse | Spekepølse | stk. | .4 | .5 | 90 | 2100 | - | r=.7
syltetøy | Syltetøy | glass | .4 | .4 | 365 | 1200 | - | r=.4
honning | Honning | glass | .45 | .4 | 0 | 1800 | - | r=.6
sirup | Sirup | flaske/flasker | .5 | .45 | 900 | 900 | - | r=.4
nøtter | Nøtter | pose/poser | .2 | .3 | 270 | 1500 | - | r=.5
rosiner | Rosiner | pose/poser | .25 | .3 | 365 | 900 | - | r=.35
tørket_frukt | Tørket aprikos | pose/poser | .2 | .3 | 365 | 900 | - | r=.3
kjeks | Kjeks | pakke/pakker | .25 | .5 | 270 | 900 | - | r=.4 m=1/søtt/4
lompe | Lomper | pakke/pakker | .26 | .4 | 30 | 600 | - | r=.3
flatbrød | Flatbrød | pakke/pakker | .3 | 1 | 365 | 900 | - | r=.4
brunost | Brunost | stk. | .5 | .5 | 45 | 1800 | kjøl | r=.6
gulost | Gulost | stk. | .5 | .5 | 30 | 1800 | kjøl | r=.6
smør | Smør | pakke/pakker | .25 | .25 | 60 | 1200 | kjøl | r=.6
margarin | Margarin | boks/bokser | .5 | .5 | 90 | 900 | kjøl | r=.8
melk | Melk | kartong/kartonger | 1.05 | 1 | 7 | 600 | kjøl | r=.2
yoghurt | Yoghurt | beger | .5 | .5 | 14 | 600 | kjøl | r=.2
egg | Egg (6 stk.) | eske/esker | .4 | .6 | 30 | 900 | kjøl | r=.5
grovbrød | Grovbrød | stk. | .75 | 2 | 5 | 900 | - | r=.6
epler | Epler | pose/poser | 1 | 1.5 | 30 | 900 | kjøl | r=.3
poteter | Poteter | sekk/sekker | 5 | 6 | 120 | 1500 | kjøl | r=1.5
gulrøtter | Gulrøtter | pose/poser | 1 | 1.2 | 45 | 600 | kjøl | r=.2
løk | Løk | nett | 1 | 1.2 | 90 | 450 | - | r=.15
kål | Kålhode | stk. | 1.5 | 3 | 45 | 450 | kjøl | r=.2
wienerpølser | Wienerpølser | pakke/pakker | .45 | .5 | 14 | 1500 | kjøl | r=.6
leverpostei | Leverpostei | beger | .1 | .1 | 21 | 450 | kjøl | r=.2
kjøttdeig | Kjøttdeig | pakke/pakker | .4 | .4 | 3 | 1800 | kjøl | r=.6
frossen_fisk | Frossen fisk | pakke/pakker | .4 | .5 | 270 | 2100 | frys | r=.6
fiskepinner | Fiskepinner | eske/esker | .45 | .8 | 270 | 1500 | frys | r=.5
frossen_kylling | Frossen kylling | stk. | 1.2 | 1.5 | 270 | 3600 | frys | r=1.2
frosne_bær | Frosne blåbær | pose/poser | .5 | .6 | 365 | 900 | frys | r=.2
fårikål | Fårikålkjøtt (frossent) | pakke/pakker | 1 | 1.1 | 365 | 3600 | frys | r=1.2
pizza | Frossenpizza | stk. | .4 | 1.2 | 270 | 1200 | frys | r=.6
sylteagurk | Sylteagurk | glass | .7 | .7 | 900 | 600 | - | r=.1
rasjon | Feltrasjon | stk. | .6 | .8 | 1800 | 3000 | - | r=1 s=.3
tørrmat | Turmat (frysetørket) | pose/poser | .15 | .6 | 1800 | 3000 | - | r=1 s=.5
proteinbar | Proteinbar | stk. | .06 | .07 | 365 | 450 | - | r=.15
sjokolade | Melkesjokolade | plate/plater | .2 | .2 | 270 | 900 | - | r=.2 m=2/søtt/2
smågodt | Smågodt | pose/poser | .3 | .5 | 270 | 900 | - | m=2/søtt/3
lakris | Lakris | pose/poser | .25 | .4 | 365 | 600 | - | m=1.5/søtt/3
# drikke
flaskevann | Flaskevann (1,5 l) | flaske/flasker | 1.55 | 1.6 | 0 | 450 | vann | r=.05
vanndunk | Vanndunk (10 l) | dunk/dunker | 10.5 | 11 | 0 | 1500 | vann | r=.3
kaffe | Kaffe (filtermalt) | pakke/pakker | .5 | .6 | 365 | 900 | - | m=3/kaffe/25
pulverkaffe | Pulverkaffe | glass | .2 | .4 | 730 | 900 | - | m=2.5/kaffe/30
te | Te | eske/esker | .05 | .2 | 730 | 450 | - | m=1/kaffe/12
kakao | Kakao | boks/bokser | .5 | .6 | 540 | 900 | - | r=.3 m=1.5/søtt/15
saft | Saft (solbær) | flaske/flasker | 1.1 | 1 | 365 | 900 | - | r=.3
saftbr | Saft (bringebær) | flaske/flasker | 1.1 | 1 | 365 | 900 | - | r=.3
juice | Eplejuice | kartong/kartonger | 1.05 | 1 | 180 | 600 | - | r=.2
brus | Brus (0,5 l) | flaske/flasker | .55 | .55 | 270 | 300 | - | r=.1 m=.5/søtt/1
øl | Øl (boks) | boks/bokser | .5 | .5 | 270 | 450 | - | m=1.5/øl/1
melkepulver | Melkepulver | pose/poser | .5 | 1 | 540 | 1200 | - | r=.6
vannrens | Vannrensetabletter | eske/esker | .05 | .1 | 1800 | 1200 | medisin | h=.05/20 s=.4
# hygiene
såpe | Såpe | stk. | .1 | .1 | 0 | 300 | - | h=.03/30 m=.5/rent/30
flytende_såpe | Flytende såpe | flaske/flasker | .5 | .5 | 0 | 450 | - | h=.03/40 m=.5/rent/40
tannkrem | Tannkrem | tube/tuber | .1 | .1 | 730 | 300 | - | m=.5/rent/40
tannbørste | Tannbørste/tannbørster | - | .02 | .05 | 0 | 150 | - | M=.3/1
dopapir | Dopapir | pakke/pakker | .8 | 8 | 0 | 600 | - | m=1/dopapir/30
tørkepapir | Tørkerull | pakke/pakker | .6 | 6 | 0 | 450 | - | m=.3/dopapir/20
bind | Bind | pakke/pakker | .2 | .8 | 0 | 450 | - | m=.8/dopapir/20
tamponger | Tamponger | eske/esker | .1 | .3 | 0 | 450 | - | m=.8/dopapir/20
bleier | Bleier | pakke/pakker | 1 | 6 | 0 | 900 | - | m=.5/dopapir/10
sjampo | Sjampo | flaske/flasker | .3 | .3 | 900 | 300 | - | m=.5/rent/30
deodorant | Deodorant | stk. | .1 | .15 | 900 | 300 | - | m=.5/rent/30
barberhøvel | Barberhøvel/barberhøvler | - | .05 | .1 | 0 | 150 | - | M=.3/1
våtservietter | Våtservietter | pakke/pakker | .3 | .5 | 540 | 300 | - | h=.02/20
håndsprit | Håndsprit | flaske/flasker | .5 | .5 | 900 | 600 | - | h=.06/40
oppvaskmiddel | Oppvaskmiddel | flaske/flasker | .5 | .5 | 0 | 300 | - | h=.03/40
vaskepulver | Vaskepulver | pakke/pakker | 2 | 3 | 0 | 900 | - | h=.03/60 m=.5/rent/60
klor | Klorin | flaske/flasker | 1 | 1 | 365 | 450 | - | h=.05/60
håndkle | Håndkle/håndklær | - | .4 | 1 | 0 | 450 | klær | M=.3/2
solkrem | Solkrem | tube/tuber | .2 | .2 | 730 | 450 | - | m=.3/rent/20
myggmiddel | Myggmiddel | flaske/flasker | .1 | .1 | 900 | 450 | - | m=.8/mygg/20
# medisin
smertestillende | Paracetamol | eske/esker | .03 | .05 | 1800 | 600 | - | h=.25/10
ibux | Ibuprofen | eske/esker | .03 | .05 | 1800 | 600 | - | h=.25/10
plaster | Plaster | eske/esker | .05 | .1 | 1800 | 450 | - | h=.1/10
bandasje | Bandasje | rull/ruller | .1 | .15 | 1800 | 900 | - | h=.3/3
forbinding | Førstehjelpsskrin | stk. | .5 | 1.5 | 1800 | 50000 | - | h=.45/6 s=.4
sårsalve | Sårsalve | tube/tuber | .05 | .05 | 900 | 600 | - | h=.15/10
antiseptisk | Desinfeksjonsmiddel | flaske/flasker | .2 | .2 | 1100 | 900 | - | h=.2/12
antibiotika | Antibiotika (kur) | eske/esker | .05 | .05 | 900 | 30000 | - | h=.8/7 s=.15
jod | Jodtabletter | eske/esker | .02 | .03 | 1800 | 3000 | - | h=.1/10 s=.25
hostesaft | Hostesaft | flaske/flasker | .2 | .2 | 540 | 600 | - | h=.15/8
nesespray | Nesespray | stk. | .03 | .03 | 730 | 300 | - | h=.08/10
allergi | Allergitabletter | eske/esker | .02 | .03 | 1100 | 450 | - | h=.08/10
vitaminer | Vitaminer | boks/bokser | .1 | .15 | 730 | 450 | - | h=.1/30
termometer | Termometer/termometre | - | .03 | .05 | 0 | 300 | - | M=.3/10 h=.05/100
insulin | Insulin | eske/esker | .05 | .05 | 30 | 6000 | kjøl | h=.3/10 s=.15
kompress | Kompresser | pakke/pakker | .05 | .1 | 1800 | 450 | - | h=.15/5
skinne | Skinne (beinbrudd) | stk. | .2 | .8 | 0 | 1500 | - | h=.3/2 s=.4
blodtrykk | Blodtrykksmåler/blodtrykksmålere | - | .4 | 1 | 0 | 1500 | - | h=.05/200 s=.3
sovetabletter | Sovemedisin | eske/esker | .02 | .03 | 1100 | 900 | - | h=.05/10 m=.5/søvn/10 s=.4
hodelus | Lusesjampo | flaske/flasker | .1 | .1 | 730 | 300 | - | h=.03/10
# verktøy
hammer | Hammer/hammere | - | .6 | .5 | 0 | 3000 | - | t=bygg/.06/2
skrutrekker | Skrutrekkersett | sett | .4 | .4 | 0 | 2400 | - | t=verksted/.05/2
sag | Håndsag/håndsager | - | .6 | 1.5 | 0 | 3000 | - | t=bygg/.05/2
baufil | Baufil/baufiler | - | .4 | .8 | 0 | 1500 | - | t=riving/.04/2
tang | Tang/tenger | - | .3 | .2 | 0 | 1500 | - | t=verksted/.04/2
fastnøkkel | Fastnøkkelsett | sett | 1.5 | 1 | 0 | 4500 | - | t=verksted/.06/2
skiftenøkkel | Skiftenøkkel/skiftenøkler | - | .5 | .3 | 0 | 1500 | - | t=maskin/.04/2
øks | Øks/økser | - | 1.5 | 1.5 | 0 | 4500 | - | t=hogst/.08/1
motorsag | Motorsag/motorsager | - | 6 | 15 | 0 | 45000 | - | t=hogst/.15/1 krever=bensinkanne/.2 s=.4
spade | Spade/spader | - | 2 | 6 | 0 | 2400 | - | t=bygg/.04/1
kubein | Kubein/kubein | - | 2 | 2 | 0 | 2400 | - | t=riving/.08/1
slegge | Slegge/slegger | - | 4 | 3 | 0 | 3000 | - | t=riving/.06/1
tape | Tape | rull/ruller | .2 | .3 | 0 | 450 | - | t=verksted/.02/3
gaffatape | Gaffatape | rull/ruller | .3 | .4 | 0 | 750 | - | t=verksted/.03/3
spiker | Spiker | pakke/pakker | 1 | .6 | 0 | 900 | - | t=bygg/.03/4
skruer | Skruer | eske/esker | .8 | .5 | 0 | 900 | - | t=bygg/.03/4
bolter | Bolter og muttere | eske/esker | 1 | .5 | 0 | 1200 | - | t=verksted/.02/4
strips | Strips | pose/poser | .1 | .1 | 0 | 300 | - | t=frakt/.02/4
tau | Tau | rull/ruller | .4 | 1 | 0 | 1200 | - | t=frakt/.04/2
stropper | Stropper | sett | 1 | 1 | 0 | 1800 | - | t=frakt/.06/2
presenning | Presenning/presenninger | - | 2 | 4 | 0 | 1800 | - | t=frakt/.03/3
målebånd | Målebånd | stk. | .2 | .1 | 0 | 600 | - | t=bygg/.02/4
vater | Vater/vatere | - | .5 | .6 | 0 | 900 | - | t=bygg/.03/4
drill | Batteridrill/batteridriller | - | 1.8 | 2 | 0 | 9000 | - | t=bygg/.08/2 s=.6
vinkelsliper | Vinkelsliper/vinkelslipere | - | 2.5 | 3 | 0 | 9000 | - | t=verksted/.08/2 s=.5
sveiseapparat | Sveiseapparat/sveiseapparater | - | 15 | 25 | 0 | 30000 | - | t=verksted/.12/2 s=.2
wd40 | Rustløser | boks/bokser | .4 | .5 | 1800 | 450 | - | t=maskin/.03/4
lim | Lim | tube/tuber | .1 | .1 | 730 | 300 | - | t=verksted/.02/3
silikon | Fugemasse | tube/tuber | .4 | .4 | 730 | 450 | - | t=bygg/.02/4
maling | Maling | spann | 3 | 3 | 1100 | 1800 | - | t=bygg/.02/4
pensel | Pensel/pensler | - | .1 | .2 | 0 | 300 | - | t=bygg/.01/4
hansker | Arbeidshansker | par | .2 | .4 | 0 | 450 | klær | t=bygg/.03/1
vernebriller | Vernebriller | par | .1 | .3 | 0 | 450 | - | t=verksted/.02/1
hørselvern | Hørselvern | par | .3 | 1 | 0 | 900 | - | t=maskin/.03/1
verktøy | Verktøykasse/verktøykasser | - | 4.5 | 15 | 0 | 6000 | - | t=bygg/.08/3
bensinkanne | Bensinkanne/bensinkanner | - | 5.5 | 6 | 365 | 1500 | - | t=frakt/.01/1
kniv | Tollekniv/tollekniver | - | .1 | .1 | 0 | 900 | - | t=hogst/.02/1
lommekniv | Lommekniv/lommekniver | - | .1 | .05 | 0 | 900 | - | t=frakt/.01/1
# elektro
batterier | Batterier (AA) | pakke/pakker | .1 | .1 | 1800 | 450 | - | -
batteri9v | Batteri 9 V | stk. | .05 | .05 | 1800 | 150 | - | -
lommelykt | Lommelykt/lommelykter | - | .3 | .3 | 0 | 900 | - | M=.5/2 krever=batterier/.1
hodelykt | Hodelykt/hodelykter | - | .15 | .2 | 0 | 900 | - | t=hogst/.03/1 M=.3/1 krever=batterier/.1
lyspære | Lyspære/lyspærer | - | .05 | .2 | 0 | 150 | - | M=.3/3
ledning | Skjøteledning/skjøteledninger | - | 1 | 2 | 0 | 600 | - | t=maskin/.02/2
kabeltromme | Kabeltrommel/kabeltromler | - | 5 | 10 | 0 | 2400 | - | t=bygg/.03/4
radio | Radio/radioer | - | 1 | 2 | 0 | 1800 | - | M=2/15 krever=batterier/.3
nødradio | Nødradio med sveiv | stk. | .6 | 1 | 0 | 2400 | - | M=2/15 s=.4
powerbank | Powerbank/powerbanker | - | .3 | .2 | 0 | 900 | - | M=.3/3
mobillader | Mobillader/mobilladere | - | .1 | .1 | 0 | 300 | - | M=.2/4
solcellelader | Solcellelader/solcelleladere | - | .5 | 1 | 0 | 1800 | - | M=.5/4 s=.4
vhf | Walkie-talkie (par) | par | .5 | .5 | 0 | 3000 | - | t=vakt/.06/2 krever=batterier/.2
kikkert | Kikkert/kikkerter | - | .7 | 1 | 0 | 3000 | - | t=vakt/.08/1
skrujern | Loddebolt/loddebolter | - | .3 | .4 | 0 | 900 | - | t=verksted/.03/2
multimeter | Multimeter | stk. | .3 | .4 | 0 | 900 | - | t=maskin/.03/2
sikringer | Sikringer | eske/esker | .1 | .1 | 0 | 300 | - | t=maskin/.02/4
røykvarsler | Røykvarsler/røykvarslere | - | .2 | .4 | 0 | 300 | - | M=.3/6
vekkerklokke | Vekkerklokke/vekkerklokker | - | .2 | .4 | 0 | 300 | - | t=vakt/.02/2
laptop | Bærbar PC | stk. | 2 | 3 | 0 | 6000 | - | t=overvåking/.05/1 M=.5/4 s=.5
nettbrett | Nettbrett | stk. | .5 | .5 | 0 | 3000 | - | M=.8/3 s=.6
# klær
ullsokker | Ullsokker | par | .1 | .3 | 0 | 450 | - | M=.4/1
ullundertøy | Ullundertøy | sett | .4 | 1 | 0 | 1500 | - | M=.6/1
regnjakke | Regnjakke/regnjakker | - | .7 | 2 | 0 | 1800 | - | t=hogst/.02/1 M=.3/1
regnbukse | Regnbukse/regnbukser | - | .6 | 2 | 0 | 1200 | - | t=frakt/.02/1
vinterjakke | Vinterjakke/vinterjakker | - | 1.5 | 6 | 0 | 3000 | - | M=.6/1
lue | Lue/luer | - | .1 | .4 | 0 | 300 | - | M=.2/1
votter | Votter | par | .1 | .3 | 0 | 300 | - | M=.2/1
arbeidsbukse | Arbeidsbukse/arbeidsbukser | - | .8 | 2 | 0 | 1500 | - | t=bygg/.02/1
arbeidsstøvler | Arbeidsstøvler | par | 2 | 6 | 0 | 2400 | - | t=bygg/.03/1
gummistøvler | Gummistøvler | par | 1.5 | 6 | 0 | 900 | - | t=frakt/.02/1
joggesko | Joggesko | par | .8 | 4 | 0 | 900 | - | M=.2/1
genser | Ullgenser/ullgensere | - | .6 | 2 | 0 | 1200 | - | M=.4/1
tskjorte | T-skjorte/T-skjorter | - | .2 | .5 | 0 | 150 | - | M=.1/1
jeans | Olabukse/olabukser | - | .7 | 1.5 | 0 | 450 | - | M=.1/1
refleksvest | Refleksvest/refleksvester | - | .2 | .5 | 0 | 300 | - | t=vakt/.02/1
pledd | Ullpledd | stk. | 1 | 4 | 0 | 900 | - | M=.4/1
sovepose | Sovepose/soveposer | - | 1.6 | 12 | 0 | 2400 | - | M=.6/1
dyne | Dyne/dyner | - | 1.2 | 20 | 0 | 1500 | - | M=.5/1
# kjøkken
kjele | Kjele/kjeler | - | 1 | 4 | 0 | 900 | - | t=kjøkken/.04/2
stekepanne | Stekepanne/stekepanner | - | 1.2 | 3 | 0 | 900 | - | t=kjøkken/.04/2
kjøkkenkniv | Kjøkkenkniv/kjøkkenkniver | - | .2 | .3 | 0 | 900 | - | t=kjøkken/.04/2
skjærebrett | Skjærebrett | stk. | .5 | 1 | 0 | 300 | - | t=kjøkken/.02/2
bestikk | Bestikk (sett for 6) | sett | 1 | 1.5 | 0 | 900 | - | M=.3/6
tallerkener | Tallerkener (sett for 6) | sett | 3 | 5 | 0 | 900 | - | M=.3/6
krus | Kaffekrus | stk. | .3 | .5 | 0 | 150 | - | M=.1/1
termos | Termos/termoser | - | .5 | 1.2 | 0 | 900 | - | t=hogst/.02/1 M=.3/2
primus | Primus/primuser | - | .5 | 1 | 0 | 2400 | - | t=kjøkken/.05/4 krever=rødsprit/.2
rødsprit | Rødsprit (1 l) | flaske/flasker | .85 | 1 | 0 | 600 | - | -
gassboks | Gassboks | stk. | .45 | .8 | 0 | 900 | - | -
fyrstikker | Fyrstikker | eske/esker | .02 | .03 | 0 | 75 | - | m=.3/ild/30
lighter | Lighter/lightere | - | .02 | .02 | 0 | 150 | - | m=.3/ild/60
stearinlys | Stearinlys | pakke/pakker | .5 | .8 | 0 | 450 | - | m=.8/lys/10
telys | Telys | pose/poser | .4 | .8 | 0 | 300 | - | m=.6/lys/10
parafinlampe | Parafinlampe/parafinlamper | - | 1 | 3 | 0 | 1800 | - | M=1/6 krever=parafin/.15
parafin | Parafin (1 l) | flaske/flasker | .8 | 1 | 0 | 600 | - | -
aluminiumsfolie | Aluminiumsfolie | rull/ruller | .3 | .6 | 0 | 300 | - | t=kjøkken/.01/4
plastfolie | Plastfolie | rull/ruller | .2 | .5 | 0 | 150 | - | t=kjøkken/.01/4
fryseposer | Fryseposer | eske/esker | .2 | .4 | 0 | 150 | - | t=kjøkken/.01/6
søppelsekker | Søppelsekker | rull/ruller | .4 | .5 | 0 | 300 | - | h=.02/30
bøtte | Bøtte/bøtter | - | .5 | 10 | 0 | 300 | - | t=frakt/.01/2
vannfilter | Vannfilter/vannfiltre | - | .4 | 1 | 0 | 3000 | - | h=.1/60 s=.3
boksåpner | Boksåpner/boksåpnere | - | .1 | .1 | 0 | 150 | - | t=kjøkken/.02/8
kaffetrakter | Kaffetrakter/kaffetraktere | - | 1.5 | 6 | 0 | 900 | - | M=.5/8
kokeplate | Kokeplate/kokeplater | - | 2 | 5 | 0 | 900 | - | t=kjøkken/.04/4
# fritid
kortstokk | Kortstokk/kortstokker | - | .1 | .1 | 0 | 150 | - | M=1.5/6
brettspill | Brettspill | stk. | .8 | 3 | 0 | 450 | - | M=1.5/5
sjakk | Sjakkspill | stk. | .5 | 1.5 | 0 | 450 | - | M=1/2
bok | Bok/bøker | - | .4 | .5 | 0 | 150 | - | M=.6/2
krim | Kriminalroman/kriminalromaner | - | .35 | .4 | 0 | 150 | - | M=.6/2
blader | Ukeblader | bunke/bunker | .5 | .8 | 0 | 75 | - | m=.5/lese/5
tegneserier | Tegneserieblader | bunke/bunker | .4 | .6 | 0 | 150 | - | m=.5/lese/6
gitar | Gitar/gitarer | - | 2.5 | 30 | 0 | 3000 | - | M=3/12 s=.4
munnspill | Munnspill | stk. | .1 | .1 | 0 | 450 | - | M=1/8 s=.6
fotball | Fotball/fotballer | - | .45 | 5 | 0 | 300 | - | M=1.5/12
puslespill | Puslespill | stk. | .6 | 2 | 0 | 150 | - | M=.8/4
strikketøy | Strikketøy | pose/poser | .5 | 2 | 0 | 450 | - | M=.8/2
fiskestang | Fiskestang/fiskestenger | - | .5 | 3 | 0 | 1500 | - | M=.8/2
tobakk | Rulletobakk | pakke/pakker | .05 | .1 | 365 | 900 | - | m=2.5/tobakk/3
sigaretter | Sigaretter | pakke/pakker | .03 | .05 | 365 | 900 | - | m=2/tobakk/1
snus | Snus | boks/bokser | .05 | .05 | 60 | 600 | kjøl | m=2/tobakk/2
dart | Dartskive/dartskiver | - | 2 | 4 | 0 | 600 | - | M=1/8
fotoalbum | Fotoalbum | stk. | 1 | 2 | 0 | 0 | - | M=.5/4
akvarell | Fargeblyanter | eske/esker | .2 | .3 | 0 | 150 | - | M=.4/3
høyttaler | Høyttaler (batteri) | stk. | .6 | 1 | 0 | 900 | - | M=1.5/15 krever=batterier/.3
# kontor
kart | Turkart | stk. | .1 | .1 | 0 | 450 | - | t=frakt/.03/3
veikart | Veiatlas | stk. | .6 | .8 | 0 | 300 | - | t=frakt/.03/6
kompass | Kompass | stk. | .05 | .05 | 0 | 900 | - | t=frakt/.03/2
notatbok | Notatbok/notatbøker | - | .2 | .3 | 0 | 75 | - | t=overvåking/.01/2
penner | Penner | eske/esker | .1 | .1 | 0 | 75 | - | t=overvåking/.01/4
blyant | Blyanter | eske/esker | .1 | .1 | 0 | 75 | - | t=bygg/.01/4
papir | Skrivepapir | pakke/pakker | 2.5 | 3 | 0 | 300 | - | t=overvåking/.01/6
saks | Saks/sakser | - | .1 | .1 | 0 | 150 | - | t=verksted/.01/2
kalkulator | Kalkulator/kalkulatorer | - | .1 | .1 | 0 | 150 | - | t=overvåking/.01/2
klokke | Armbåndsur | stk. | .05 | .05 | 0 | 900 | - | t=vakt/.02/1
paraply | Paraply/paraplyer | - | .4 | 1 | 0 | 300 | - | M=.1/1
`;

  // ---------- lesingen av tabellen ----------
  const tall = v => +String(v).trim().replace(',', '.');
  function lesBruk(s) {
    const B = {}; for (const tok of String(s || '').trim().split(/\s+/)) { if (!tok || tok === '-') continue; const [k, v] = tok.split('='), d = (v || '').split('/');
      if (k === 'r') B.r = tall(d[0]);
      else if (k === 'h') B.h = { f: tall(d[0]), doser: tall(d[1]) || 1 };
      else if (k === 'm') B.m = { p: tall(d[0]), gruppe: d[1] || 'moral', porsjoner: tall(d[2]) || 1 };
      else if (k === 'M') B.M = { p: tall(d[0]), dekker: tall(d[1]) || 1 };
      else if (k === 't') B.t = { oppgave: d[0], andel: tall(d[1]), dekker: tall(d[2]) || 1 };
      else if (k === 'krever') B.krever = { ting: d[0], perDøgn: tall(d[1]) || 0 };
      else if (k === 's') B.s = tall(d[0]);
      else throw new Error('Ukjent bruk: ' + tok); }
    return B;
  }
  const TING = {};
  (function les() {
    let kat = null;
    for (const linje of TABELL.split('\n')) { const l = linje.trim(); if (!l) continue; if (l[0] === '#') { kat = l.slice(1).trim(); continue; }
      const f = l.split('|').map(x => x.trim()); if (f.length < 9) throw new Error('Kort linje: ' + l);
      const [id, navn0, enhet0, vekt, vol, hold, pris, lag0, bruk] = f, B = lesBruk(bruk);
      const [navn, fl] = enhet0 === '-' ? navn0.split('/') : [navn0, navn0];
      const [e1, e2] = enhet0 === '-' ? [null, null] : enhet0.split('/');
      TING[id] = { id, navn, flertall: fl || navn, enhet: e1, enheter: e2 || e1, kat, vekt: tall(vekt), vol: tall(vol), hold: tall(hold) || 0, pris: tall(pris),
        lag: lag0 === '-' ? KATEGORIER[kat].lag : lag0, s: B.s === undefined ? 1 : B.s, ...B };
      delete TING[id].s; TING[id].s = B.s === undefined ? 1 : B.s; }
  })();
  const IDER = Object.keys(TING);

  // ---------- tekst ----------
  const lite = s => (/^[A-ZÆØÅ][a-zæøå]/.test(s) && !/^(T-|PC)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
  // «2 glass peanøttsmør», «1 rull tape», «3 hammere», «1 hammer»
  function antall(id, n) { const g = TING[id]; if (!g) return `${n} × ${id}`; n = Math.round(n);
    return g.enhet && !(g.enhet === 'stk.' && n === 1) ? `${n} ${n === 1 ? g.enhet : g.enheter} ${lite(g.navn)}` : `${n} ${lite(n === 1 ? g.navn : g.flertall)}`; }
  // tittelen i lister: «Peanøttsmør (glass)», «Hammer»
  const tittel = id => { const g = TING[id]; return g ? g.navn + (g.enhet && g.enhet !== 'stk.' && !/\(/.test(g.navn) ? ` (${g.enhet})` : '') : id; };
  // «Fant: 2 glass peanøttsmør, 1 rull tape og 3 andre ting.» – høyst maks slag nevnt
  function fantTekst(liste, maks = 4) { const L = (liste || []).filter(q => q && q.n > 0); if (!L.length) return '';
    const sort = L.slice().sort((a, b) => (TING[b.id] ? TING[b.id].pris * b.n : 0) - (TING[a.id] ? TING[a.id].pris * a.n : 0));
    const vis = sort.slice(0, maks).map(q => antall(q.id, q.n)), rest = sort.length - vis.length;
    if (rest > 0) vis.push(`${rest} ${rest === 1 ? 'annen ting' : 'andre ting'}`);
    return 'Fant: ' + (vis.length > 1 ? vis.slice(0, -1).join(', ') + ' og ' + vis[vis.length - 1] : vis[0]) + '.'; }
  // hva tingen kan brukes til, kort
  function bruksTekst(id) { const g = TING[id]; if (!g) return ''; const d = [];
    if (g.r) d.push(`${String(g.r).replace('.', ',')} rasjon${g.r === 1 ? '' : 'er'}`);
    if (g.h) d.push(`heling +${Math.round(g.h.f * 100)} % (${g.h.doser} ${g.h.doser === 1 ? 'dose' : 'doser'})`);
    if (g.m) d.push(`moral +${String(g.m.p).replace('.', ',')} (${g.m.porsjoner} porsjon${g.m.porsjoner === 1 ? '' : 'er'})`);
    if (g.M) d.push(`moral +${String(g.M.p).replace('.', ',')} for ${g.M.dekker} ${g.M.dekker === 1 ? 'person' : 'personer'}`);
    if (g.t) d.push(`${OPPGAVE_NAVN[g.t.oppgave] || g.t.oppgave} +${Math.round(g.t.andel * 100)} %`);
    if (g.krever) d.push(`trenger ${lite(TING[g.krever.ting] ? TING[g.krever.ting].flertall : g.krever.ting)}`);
    return d.join(' · '); }
  const OPPGAVE_NAVN = { bygg: 'bygging', hogst: 'hogst', riving: 'riving', frakt: 'frakt', vakt: 'vakt', overvåking: 'overvåking', kjøkken: 'kjøkken', stell: 'stell', verksted: 'verksted', maskin: 'maskiner' };
  const holdTekst = id => { const g = TING[id]; if (!g) return ''; if (!g.hold) return 'tåler alt';
    const d = g.hold; return d >= 730 ? `holder ${Math.round(d / 365)} år` : d >= 60 ? `holder ${Math.round(d / 30)} mnd.` : `holder ${d} døgn`; };

  // ---------- funn i rom og bygg ----------
  // per rom: vekt per kategori og [minst, mest] slag ting (for et rom i et bygg på 100 m²)
  const ROM = {
    kjøkken: { kat: { mat: 6, drikke: 3, kjøkken: 3.5, hygiene: .6, medisin: .4, elektro: .4 }, n: [4, 9] },
    bad: { kat: { hygiene: 6, medisin: 3 }, n: [2, 6] },
    vaskerom: { kat: { hygiene: 4, klær: 2, kjøkken: .5 }, n: [2, 4] },
    soverom: { kat: { klær: 6, fritid: 2, elektro: 1, medisin: .6, kontor: .5 }, n: [2, 6] },
    stue: { kat: { fritid: 5, elektro: 2, kontor: 1, mat: .6, drikke: .6 }, n: [2, 5] },
    bod: { kat: { verktøy: 4, elektro: 2, klær: 1.2, kjøkken: 1, mat: 1, hygiene: .6 }, n: [2, 6] },
    garasje: { kat: { verktøy: 6, elektro: 2, kjøkken: .3, klær: .5 }, n: [3, 7] },
    kontor: { kat: { kontor: 6, elektro: 2, drikke: 1, mat: .5 }, n: [2, 5] },
    pauserom: { kat: { drikke: 3, mat: 2, kjøkken: 2, fritid: .5 }, n: [2, 5] },
    klasserom: { kat: { kontor: 5, fritid: 2, medisin: .3 }, n: [2, 5] },
    sykerom: { kat: { medisin: 7, hygiene: 3, klær: .5 }, n: [3, 8] },
    butikk: { kat: { mat: 7, drikke: 4, hygiene: 2, kjøkken: 1, kontor: .5, elektro: .5 }, n: [8, 18] },
    lager: { kat: { mat: 3, drikke: 2, verktøy: 2, hygiene: 1, kjøkken: 1 }, n: [4, 10] },
    verksted: { kat: { verktøy: 7, elektro: 3, klær: .6 }, n: [3, 8] },
    låve: { kat: { verktøy: 3, mat: 1, klær: 1, kjøkken: .4 }, n: [2, 5] },
    kirke: { kat: { fritid: 2, kontor: 1, mat: .5, hygiene: .5 }, n: [1, 3] },
    loft: { kat: { klær: 3, fritid: 3, kjøkken: 1, elektro: 1, kontor: .5 }, n: [2, 6] },
    kjeller: { kat: { mat: 5, drikke: 2, verktøy: 1, kjøkken: .5 }, n: [2, 7] },
    tilfluktsrom: { kat: { mat: 5, drikke: 4, medisin: 2, elektro: 2, hygiene: 1 }, n: [5, 11] },
  };
  // rollene fra spill/interior.js og spill/bygning.js som ikke heter det samme her
  const ROLLE = { dagligstue: 'stue', allrom: 'stue', beboerrom: 'soverom', behandlingsrom: 'sykerom', lærerrom: 'pauserom', møterom: 'kontor', vaktrom: 'kontor', rom: 'stue' };
  // rommene i et bygg etter klassen (1. etasje, når vi ikke vet mer)
  const KLASSE_ROM = {
    hus: ['kjøkken', 'bad', 'soverom', 'stue', 'bod'], hytte: ['kjøkken', 'soverom', 'stue', 'bod'], leil: ['kjøkken', 'bad', 'soverom', 'stue'],
    uthus: ['garasje', 'bod'], låve: ['låve', 'bod'], butikk: ['butikk', 'lager'], kontor: ['kontor', 'pauserom', 'kontor'],
    skole: ['klasserom', 'pauserom', 'bad'], sykehus: ['sykerom', 'sykerom', 'lager', 'bad'], industri: ['verksted', 'lager'], lager: ['lager', 'lager'],
    kirke: ['kirke'], hangar: ['verksted', 'lager'], terminal: ['butikk', 'kontor', 'pauserom'],
  };
  // etasjene (spill/etasjer.js): loft, kjeller og tilfluktsrom har egne rom; andre etasjer i boliger er soverom og bad
  const ETASJE_ROM = { loft: ['loft'], kjeller: ['kjeller', 'bod'], tilfluktsrom: ['tilfluktsrom'], over: null };
  const rolle = r => (ROM[r] ? r : ROLLE[r] && ROM[ROLLE[r]] ? ROLLE[r] : null);

  // det som ligger i ett rom: [{ id, n }]. frø: fast per rom (samme rom gir det samme), skala: større rom har mer
  function funnIRom(r, frø, skala = 1) {
    const R = ROM[rolle(r)]; if (!R) return []; const h = k => hash(frø, k), ut = new Map();
    const kand = []; let sum = 0; for (const id of IDER) { const g = TING[id], w = (R.kat[g.kat] || 0) * g.s; if (w > 0) { kand.push([id, w]); sum += w; } }
    if (!sum) return [];
    const n = Math.max(0, Math.round((R.n[0] + Math.floor((R.n[1] - R.n[0] + 1) * h(1))) * Math.max(.3, skala)));
    for (let j = 0; j < n; j++) { let t = h(100 + j) * sum, id = kand[kand.length - 1][0]; for (const [k, w] of kand) { t -= w; if (t <= 0) { id = k; break; } }
      const g = TING[id], mest = g.vol >= 3 || g.pris >= 5000 || g.M ? 1 : g.kat === 'mat' || g.kat === 'drikke' ? 3 : 2;
      ut.set(id, (ut.get(id) || 0) + 1 + Math.floor(h(300 + j) * mest)); }
    return [...ut].map(([id, n]) => ({ id, n }));
  }
  // hele bygget: rommene (o.rom = rollene fra interiøret, ellers etter klassen; o.etasje = 'loft' | 'kjeller' | 'tilfluktsrom' | 'over')
  function funnIBygg(kl, areal, i, o = {}) {
    const etg = o.etasje && ETASJE_ROM[o.etasje] ? ETASJE_ROM[o.etasje] : null;
    let rom = etg || (Array.isArray(o.rom) && o.rom.length ? o.rom.map(rolle).filter(Boolean) : null) || KLASSE_ROM[kl] || KLASSE_ROM.hus;
    if (o.etasje === 'over' && (kl === 'hus' || kl === 'leil' || kl === 'hytte')) rom = ['soverom', 'bad', 'soverom'];
    const sk = Math.max(REGLER.skala[0], Math.min(REGLER.skala[1], Math.sqrt(Math.max(10, areal || 100) / 100))) / Math.sqrt(Math.max(1, rom.length / 3));
    const frø0 = Math.imul((i | 0) + 17, 2654435761) ^ (o.frø | 0), sum = new Map();
    rom.forEach((r, k) => { for (const q of funnIRom(r, frø0 + k * 7919, sk)) sum.set(q.id, (sum.get(q.id) || 0) + q.n); });
    // høyst maksSlag slag: de mest verdifulle (målt i verdi per slag) beholdes
    return [...sum].map(([id, n]) => ({ id, n })).sort((a, b) => TING[b.id].pris * b.n - TING[a.id].pris * a.n).slice(0, REGLER.maksSlag);
  }

  // ---------- holdbarhet ----------
  // døgn igjen (Infinity når tingen tåler alt), etter alderen a (døgn i riktig lagring – lagringen regner om, se tinglager.js)
  const igjen = (id, a) => { const g = TING[id]; if (!g || !g.hold) return Infinity; return g.hold - (a || 0); };
  const snart = (id, a) => { const g = TING[id], r = igjen(id, a); return Number.isFinite(r) && r > 0 && (r < REGLER.snart || r < g.hold * REGLER.snartAndel); };
  const verdi = (id, n = 1) => (TING[id] ? Math.round(TING[id].pris * n) : 0);
  const salgsverdi = (id, n = 1) => Math.round(verdi(id, n) * REGLER.salg);

  const api = { REGLER, KATEGORIER, KAT_REKKE, LAG, TING, IDER, ROM, ROLLE, KLASSE_ROM, ETASJE_ROM, OPPGAVE_NAVN, lesBruk, antall, tittel, fantTekst, bruksTekst, holdTekst,
    rolle, funnIRom, funnIBygg, igjen, snart, verdi, salgsverdi, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Ting = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
