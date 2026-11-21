'use strict';
// Laget av pipeline/fliser/samle_hjelp.py fra docs/natt/*-hjelp.json – ikke rediger for hånd.
window.HJELP_TILLEGG = [
[
"Grafikk som justerer seg selv",
"Står grafikken på Auto, senkes først oppløsningen når bildet går tregt over tid, så skyggene, og først til slutt detaljnivået. Det skjer aldri mens et nytt område bygges. Du kan låse nivået i ☰ «Grafikk».",
"Vær, lyd og bilde"
],
[
"Låver og uthus",
"Låvene har plankevegger, høyballer, høyloft, redskap og en gammel traktor. Gjennom sprekkene i veggene faller det lys.",
"I 3D"
],
[
"Sette seg inn i feltbilen",
"Når du går og står ved feltbilen, kommer knappen «Sett deg inn» (F på PC). Står bilen ikke foran deg, sier knappen hvor den er, for eksempel «Sett deg inn i feltbilen · 6 m bak deg». Snu deg, eller trykk knappen likevel.",
"I 3D"
],
[
"Stedsnavn når du går",
"Til fots ser du bare navn på steder som ligger mer enn 600 m unna, med avstanden («Vikeså · 1,2 km»). Ser du rett mot stedet, eller ligger det bak en ås, står navnet øverst i bildet under kompasset.",
"I 3D"
],
[
"Første gang du åpner 3D",
"Første gang du åpner 3D med leiren midt i kartet, ser kameraet ned på leiren fra et par hundre meter, så du ser byggene og teltene. Rull eller knip for å se lenger ut.",
"I 3D"
],
[
"Hvor er jeg i 3D?",
"Når du ser ovenfra i 3D, står nærmeste tettsted med avstand og retning øverst midt på skjermen, for eksempel «Nærmeste tettsted: Rognan · 8,6 km N». Står du midt i et tettsted, står det «Du er i …».",
"I 3D"
],
[
"Når du flyr langt i 3D",
"Flyr du ut av området som er bygget, ser du et grovere kart av landskapet rundt mens det nye området lages, og «Laster landskapet …» står midt på skjermen. Det tar noen sekunder før trær og hus kommer.",
"I 3D"
],
[
"Skygger tidlig og sent",
"Når sola står lavt (morgen og kveld), er skyggene myke og blir svakere et stykke fra treet eller huset som kaster dem – de strekker seg ikke over hele jordet. Midt på dagen er de tydeligere. Slå av skyggene med «Lys og skygger» i ☰ hvis bildet går tregt.",
"Vær, lyd og bilde"
],
[
"Vegene i 3D",
"Vegene har grå asfalt med hjulspor og kantlinjer på riksveger og fylkesveger. I en bratt li er vegen skåret inn i lia som en ekte veg: en skjæring på oversiden og en lav, gresskledd fylling ned til bakken på nedsiden.",
"I 3D"
],
[
"Kameraet når du kjører",
"Kameraet ligger bak bilen. Kjører du i skogen og et tre står der kameraet skulle vært, glir kameraet nærmere bilen så du ikke ser gjennom greinene, og tilbake når det er fritt.",
"I 3D"
],
[
"Den første uka",
"Bygg brakke, aggregat og dieseltank først, kjøp 500 l diesel, sett folk i arbeid og lag en tropp. Et vakttårn med en person på «Vakt» melder røverne før de er i leiren. Kontrollrommet (9 mill. kr) kan vente til leiren står. Den første røverbølgen kommer tidligst etter et døgn (eller en halv time spilling), og de tre første døgnene er det bare ett røverlag om gangen.",
"Kom i gang"
],
[
"Røverne og byttet",
"Røverbølgene vokser sakte og blir aldri større enn det du har folk til å møte: omtrent ett røverlag per åtte soldater, ett ekstra hvis du har stridsvogn eller rakettartilleri, og ett lag mer for hvert tredje døgn. Til sammen har røverne i en bølge på det meste omtrent like mange mann som soldatene dine + 2 (på «Vanlig»; flere på «Hard», færre på «Lett»). Byttet etter en slått bølge dekker omtrent skadene (450 000 kr for den første, høyst 1,5 mill.) – pengene skal komme fra tettsteder, oppdrag og handel, ikke fra å bli angrepet. Laster du siden på nytt midt i et angrep, fortsetter angrepet der det var: røverne står der de sto, med de sårede og det de alt har tatt.",
"Lag og strid"
],
[
"Brann og mat i leiren",
"Inne i leiren er det grusplass, så brann sprer seg sakte der. Folk hjemme på «Vakt» og «Bygg» slokker en brann innen 150 m fra leiren – jo flere, jo fortere – og byggene tar skade litt etter litt. Når det brenner i leiren, stopper spolingen. Maten: hver person spiser én rasjon per døgn. Når den rekker under to døgn, sier loggen fra: kjøp mat i Folk-panelet, send et lag på jakt, fisk eller så en åker – eller bygg drivhus.",
"Leiren"
],
[
"Røvere i leiren",
"Kommer røverne inn i leiren (innen ca. 150 m fra midten), går lagene dine hjemme (innen 3 km, som står stille eller er i forsvarsstilling) og Leirvakta helt inn til dem av seg selv. Røverne gir opp og flykter når en tredel av dem er falt eller såret – da er bølgen slått tilbake. Får de herje i halvannen time, tar de med seg et bytte (litt av kassa, materialene, dieselen og maten) og trekker seg ut: bølgen er over, men du får ingen belønning. Lag som har trukket seg tilbake etter stridsreglene sine, går hjem igjen når faren er over.",
"Lag og strid"
],
[
"Reparasjon etter angrep",
"Etter et angrep står det «N bygg er skadet» øverst, med knappen «Reparer alle». Ledige byggelag reparerer også av seg selv mellom angrepene, de mest skadde først (300 000 kr blir alltid igjen i kassa). Det slår du av og på i Leir → Bygg → Forsvar. Reparasjon koster en firedel av byggets pris for et helt ødelagt bygg, mindre jo mindre skaden er.",
"Leiren"
],
[
"Siste døgn",
"Hver morgen kl. 06, rett etter dagboka, kommer en linje i loggen om det som hendte siste døgn: bølger som ble slått tilbake eller som herjet i leiren, nye sårede og falne, lag som ble slått ut, bygg som ble ødelagt eller skadet, hus dere lette gjennom, og folk som kom eller dro.",
"Kom i gang"
],
[
"Ammunisjon og hvile hjemme",
"Et lag som står stille hjemme i leiren (innen ca. 250 m) mellom angrepene, fyller ammunisjon av seg selv: gratis når basen har olje, ellers fra kassa (en full last koster 200 000 kr, og 300 000 kr blir alltid igjen). De sårede i laget blir sakte bedre – fra hardt såret til frisk på omtrent et døgn. Med sykestue og folk på «Stell» går det fortere. Falne blir ikke friske: lag nye tropper av folkene dine.",
"Lag og strid"
],
[
"Folk og soldater i 3D",
"Folkene i leiren, barna og de gamle, soldatene på alle sider og karakteren din er avrundede figurer som går, står, bærer og sikter. Jakken viser hvilken side en soldat hører til; hjelmen og sekken er feltutstyr. Nær kameraet får figurene flere detaljer enn langt unna.",
"I 3D"
],
[
"Hva figurene gjør",
"På marsj går soldatene med geværet lavt; når laget skyter, løfter de det til skulderen. Sårede kneler, falne ligger. I leiren bærer folk på «frakt» og «bygg» en kasse når de går, vakta har gevær, og de gamle går litt krumme.",
"I 3D"
],
[
"Kjøretøy, trafikk og dyr i 3D",
"Kjøretøyene i kolonnene står på fire hjul og heller med bakken, både framover og til siden. Stridsvogna, lastebilene, rakettartilleriet og radarbilen har avrundede former. I byene går folk på fortauene og kjører biler i gatene; dyrene på heia har runde kropper og bein.",
"I 3D"
],
[
"Folk som personer",
"Trykk «Vis folkene» i Folk og så på et navn: du får et kort med ansikt, historie, lynne og hva personen ønsker seg. Får folk ønsket sitt oppfylt, blir de mer trofaste. ★ betyr spesialist.",
"Leiren"
],
[
"Samfunnet",
"«Samfunn» i Folk-panelet viser hva som trekker moralen opp og ned, barn og gamle, sykdom, lovene, forrædere, opplæring og de døde.",
"Leiren"
],
[
"Flyktninger",
"Av og til står flyktninger ved porten. Tar du imot alle, får du flere hender – men også barn og gamle som må ha mat og seng. Avviser du dem, faller moralen og lojaliteten.",
"Leiren"
],
[
"Spesialister",
"Lege, mekaniker, radiooperatør og skytter er sjeldne. Du finner dem blant flyktninger, når du leter i hus – og på oppdrag: står det ★ ved et redningsoppdrag eller en røverpost i fanen Mål, får dere en spesialist når det er gjort. De virker bare når de står på riktig oppgave (stell, verksted, overvåking, vakt).",
"Leiren"
],
[
"Barn og gamle",
"De arbeider ikke, men spiser og trenger seng. Har de det bra, løfter de moralen. Sulter eller fryser de, faller den hardt. De kan få Grålungen selv – barna sjeldnere, og de gamle tåler den dårligst: karantene, sykestue og lege redder liv.",
"Leiren"
],
[
"Grålungen",
"Sykdommen smitter fort når folk sover trangt. Sett de syke i karantene (de arbeider ikke da), bygg sykestue og finn en lege. De som kommer gjennom, blir ikke syke igjen.",
"Leiren"
],
[
"Lov i leiren",
"Du kan innføre rasjonering, arbeidsplikt, portforbud og våpen i leiren. Hver lov hjelper på én ting og koster på en annen – og noen i gjengen liker den dårlig.",
"Leiren"
],
[
"Forrædere",
"Er lojaliteten lav, kan noen lekke til fienden eller sabotere. «Etterforsk» i Samfunn-panelet kan avsløre dem – en radiooperatør og portforbud hjelper. Etterforsker du uten grunn, blir folk sure.",
"Leiren"
],
[
"Opplæring",
"Sett en dyktig person eller en veteran til å lære opp en annen i Samfunn-panelet. Eleven blir bedre dag for dag, men begge arbeider saktere imens.",
"Leiren"
],
[
"Begravelser og minnesmerke",
"Når noen dør, kan du holde begravelse (arbeidet stopper i tre timer, men moralen løftes) eller gravlegge uten seremoni. Et minnesmerke i leiren gir varig bedre moral.",
"Leiren"
],
[
"Forfallet",
"Først svikter strømnettet, så mobilnettet (bygg radiomast), vannverket (bygg brønn), butikkene (maten blir dobbelt så dyr) og til slutt småvegene (frakt går saktere). Du får et varsel før hvert trinn.",
"Leiren"
],
[
"Egne rom",
"Et lukket rom med dør i byggesettet er soverom til du velger noe annet. I Leir-menyen under «Byggesett» kan du gjøre det om til kjøkken, lager eller verksted.",
"Leiren"
],
[
"Varsel fra kameraene",
"Når kameravakta ser folk, kommer et lite kort oppe til høyre. Trykk «Se gjennom kameraet» for å se selv, eller «Vis i kartet».",
"Leiren"
],
[
"Fanger og rekrutter",
"Fanger du har tatt, kan få bli i leiren (Samfunn-panelet). De er lite trofaste i starten, så følg med på dem. Rekrutter som kommer med handelsruta fra byene, har byen i historien sin.",
"Leiren"
],
[
"Ett kort om gangen",
"Kort med valg (hendelser, flyktninger, krangler) kommer ett om gangen, med minst to minutter imellom.",
"Leiren"
],
[
"Varsler øverst til venstre",
"Brikkene øverst til venstre sier fra om Grålungen i leiren, døde som venter på begravelse, skader du selv har, og kort som venter på deg. Trykk på en brikke for å komme dit det gjelder.",
"Leiren"
],
[
"Kort som venter",
"Hendelser i leiren kommer som kort midt på skjermen, ett om gangen og i den rekkefølgen de kom. Står det «Et kort venter» øverst til venstre, kan du trykke for å se det med en gang.",
"Leiren"
],
[
"Folk i byggene",
"I 3D står operatørene inne i kontrollrommet, kokken i kjøkkenet og de som steller syke i sykestua – gå inn, så ser du dem. Vakta står oppe i vakttårnet og speider.",
"I 3D"
],
[
"Hunden din",
"Hunden trenger mat: i leiren spiser den av leirens mat, ute må du gi den en rasjon (knappen «Gi … mat»). Får den ikke mat, går den sin vei. Blir du truffet, kan hunden også bli truffet – den gror i leiren.",
"Lag og strid"
],
[
"Dekning bak en bakketopp",
"Ligger en bakketopp mellom deg og fienden, treffer de deg sjelden. Legg deg ned bak en kul – da holder selv en lav forhøyning.",
"Lag og strid"
],
[
"Gå hit eller gå her",
"Trykk «Gå» (G) i 3D. Ser kameraet på et sted langt fra karakteren din, får du velge: «Reis hit» – karakteren går dit, og spilltiden går så lenge turen tar (ca. 4 km/t, litt omveg regnet med) – eller «Gå her, der du står». Merket «Hit» midt i bildet viser hvor du havner. Lenger enn 6 km går du i etapper. Har du valgt et lag, starter du ved laget.",
"I 3D"
],
[
"Gå inn i et hus",
"Trykk på et bygg i kartet (eller i 3D): panelet sier om bygget har en innside, og har knappen «Gå inn i huset». Da reiser du dit (spilltiden går så lenge turen tar), 3D bygges rundt huset, og du settes ved døra og går inn av deg selv. Går du selv: pila under siktet («Inngang 14 m» med en pil) peker mot nærmeste dør, også når døra er på andre siden av huset. Merket «Inngang» står over døra. Nær døra kommer knappen «Gå inn» – den går gjennom døra for deg. Inne kommer «Gå ut».",
"I 3D"
],
[
"Esc når du går",
"Esc lukker først det som er åpent (sekken, lutpanelet, karakterarket, menyer). Et kort med valg går tilbake og venter. Er ingenting åpent, slipper Esc musa, og Esc en gang til flyr deg opp i lufta igjen.",
"I 3D"
],
[
"Kort som venter mens du går",
"Mens du går selv, kommer ikke hendelseskortene midt i bildet. Øverst står i stedet «Et kort venter». Trykk på det (eller Enter på PC) for å se det nå – ellers kommer det når du slutter å gå.",
"I 3D"
],
[
"Snikemåleren",
"Når en fiende er nær (under 700 m) og du går selv, står en måler under siktet: Skjult → Mistenkt (han har hørt eller sett noe) → Sett (han vet hvor du er og skyter). Linja under sier hvor nær han er. Gå på huk eller ligg (C/Z), hold deg i skog og mørke, og ikke løp, så tar det lenger tid før du blir sett.",
"I 3D"
],
[
"Været i 3D",
"Toppstripa viser været: mens det skifter, står det for eksempel «Klart → regn», og himmelen i 3D blir gradvis grå i løpet av 25–45 spillminutter. Når det står «Regn», regner det også i 3D.",
"Vær, lyd og bilde"
],
[
"3D går tregt",
"Tegner nettleseren 3D uten grafikkortet (programvare), kommer en liten lapp i hjørnet én gang: slå på «maskinvareakselerasjon» i nettleserens innstillinger (Edge og Chrome: Innstillinger → System → «Bruk grafikkakselerasjon når tilgjengelig») og start nettleseren på nytt. Rådet står også i loggen og på knappen «Grafikk» i ☰.",
"Vær, lyd og bilde"
],
[
"Se rundt på telefon",
"Dra med én finger hvor som helst utenom styrespaken nede til venstre. En ring med piler følger fingeren og viser kursen (f.eks. 045°), så du ser at du snur deg. Styrespaken er bare rundt sirkelen nede til venstre.",
"I 3D"
],
[
"Når du reiser eller begynner å gå",
"Mens du reiser (Reis hit / Gå inn i huset) står bildet i 3D stille, og bare tiden og karakteren går – det går mye fortere. Før du begynner å gå, bygges kartet rundt deg ferdig («Henter kartet rundt deg …»). På trege maskiner tegnes 3D i halv oppløsning mens du snur deg.",
"I 3D"
],
[
"Leiren i 3D",
"En ny leir har telt, bål, kasser, oljefat og ved rundt flaggstanga fra første stund. Bygg som er under arbeid står som byggeplass: først stikker og snor, så grunnmur, reisverk, tak og kledning, med stillas rundt og materialer ved siden av – som i kartet.",
"Leiren"
],
[
"Angrep mens du går",
"Mens du går selv, er angrepsbanneret én linje øverst med «Forsvar leiren», så det ikke dekker bildet.",
"Lag og strid"
],
[
"Når lagene dine kommer i kamp",
"Første gang et av lagene dine skyter eller blir skutt på, stopper ⏭ og farten går ned til 1× – én gang per kamp. Meldingen sier hvem, mot hvem og hvor, f.eks. «⚔ Speidertropp 1 er i kamp med bygdevernet i Lærdalsøyri (7 mann)». Trykk «Vis» for å se stedet. Har laget ikke radiokontakt, står det et merke med to sverd der kampen er. Faller noen, sier loggen hvem de falt for.",
"Lag og strid"
],
[
"Når kommer røverne?",
"Ser ingen røverne ennå, står det bare omtrent når de kommer («ikke sett – kommer trolig i natt»). Når noen ser dem, står avstanden og minuttene – og anslaget går bare ned så lenge de ikke snur. Tida for neste bølge står i Leir → Forsvar med nedtelling, og øverst til venstre når det er under 12 timer igjen.",
"Lag og strid"
],
[
"Spolingen under et angrep",
"⏭ stopper når røverne blir sett, når kampen om leiren begynner og når angrepet er over. Alle stoppkort med et sted har «Vis».",
"Lag og strid"
],
[
"Varslet angrep",
"Etterretningen sier «angrep tidligst om ca. 6 t» ut fra hvor fienden står og hvor fort de går. Står de alt nær byen, står det «fienden er ved byen nå». De angriper ikke før tida – med mindre dere skyter på dem først.",
"Lag og strid"
],
[
"Røverne kommer",
"Brikka sier når røverne drar ut («Røverne drar ut om 3 t»). Er de sett, viser banneret hvor og når: «sist sett 3,5 km N kl. 08:53». Når de er under 500 m fra leiren, går farten ned til 1×. Fra bølge 2 kommer de oftere fra to kanter.",
"Lag og strid"
],
[
"Patruljer i fredstid",
"De første døgnene angriper ikke motstanderne leiren. Ser du en av patruljene deres, stopper spolingen én gang med «fiendens patrulje – fredstid, angriper ikke».",
"Lag og strid"
],
[
"Vann og mat på tur",
"Når du går selv utenfor leiren, blir du tørst og sulten av meterne du går – mest når du løper. Feltflaska har fire slurker og fylles av seg selv i leiren og når du står ved et vann. Knappene «Drikk» (X) og «Spis» (N) kommer til venstre når du trenger dem. I karakterarket (Deg) kan du «Pakke for tur» i leiren: full flaske og rasjoner fra leirens mat.",
"I 3D"
],
[
"Ligg, dekning og sniking",
"Z legger deg ned (på telefon: trykk Huk to ganger). Liggende tar du halv skade, og står det en vegg eller et tre mellom deg og fienden, enda mindre. Fienden må oppdage deg før de skyter: på huk, liggende, i skog og i mørke ser de deg på mye kortere hold. Løping og skudd røper deg. Måleren under siktet sier Skjult, Mistenkt eller Sett.",
"I 3D"
],
[
"Skader som varer",
"Et høyt fall kan gi brukket bein: du går sakte og kan ikke løpe før det er spjelket eller grodd. Skudd og kulde (særlig under −8 °C, eller i vinter og nedbør) kan gi infeksjon, som tærer på helsa til du behandler den med førstehjelp. I leiren gror alt fortere, og en sykestue gjør deg frisk med en gang. Skadene står til venstre på skjermen og i karakterarket.",
"I 3D"
],
[
"Lag noe selv",
"Når du leter gjennom hus, finner du tøy, tau, ståltråd, metallskrap og sprit. Trykk «Lag noe» (B) for å lage førstehjelp, spjelk, snarefelle, armbrøst (et stille våpen) og bolter. Fella setter du ut i terrenget; kom tilbake etter noen timer og sjekk om det er fangst.",
"I 3D"
],
[
"Hunden",
"Går du ute med en rasjon i sekken, kan en hund slå følge med deg. Du kan også finne en i et hus. Hunden følger deg og knurrer i retningen der det er fiender du ikke ser.",
"I 3D"
],
[
"Tilfluktssteder",
"Et hus du har sikret, er mer enn et gjemmested: der kan du sove (klokka går fort mens du sover, og du vekkes hvis noe skjer), legge igjen våpen og utstyr i et lager, og velge å våkne der i stedet for i leiren hvis du blir slått ut i nærheten.",
"I 3D"
],
[
"Din historie og evner",
"Karakterarket (Deg) har en egen historie i tre kapitler som følger bakgrunnen du valgte, med mål og belønning. Ferdighetene dine åpner nye evner på nivå 3 og 6 – for eksempel ser du hva et hus trolig inneholder før du leter.",
"Kom i gang"
],
[
"Kartet du oppdager",
"I 2D-kartet ligger et lett slør over områder verken du, lagene dine eller leiren har sett. Sløret letter etter hvert som dere utforsker. Det kan slås av nederst i karakterarket.",
"Kom i gang"
],
[
"Jakt til fots",
"Skyter du et dyr når du er langt fra leiren, bærer du kjøttet selv: det som får plass i sekken, blir rasjoner. Nær leiren bæres alt hjem som før.",
"I 3D"
],
[
"Navn i kartet",
"Navnene i kartet legger seg der det er plass, og de viktigste får plassen først: fiender, så det du har valgt, så lagene dine, kjøretøyene og til sist bygg og steder. Merkene ligger alltid over navnene. Er det for trangt, skjules de minst viktige – zoom inn for å se alle.",
"Lag og strid"
],
[
"Natt og regn i kartet",
"Om natta blir kartet mørkere og blåere, og i regn og snø blir det gråere. Lagene, fiendene og navnene er like tydelige som om dagen.",
"Vær, lyd og bilde"
],
[
"Krigskartet",
"Krigskartet viser tettstedene, hvem som holder dem og fronten mellom sidene. Kaiene vises ikke der – bare leirens egen kai – så byene kan leses. På telefon fyller kartet plassen over panelet.",
"Lag og strid"
],
[
"Leiren langt ute",
"Når du zoomer ut, tegnes leiren som en liten klynge bygg rundt flagget, litt større enn i virkeligheten, så du ser hva som står der også på 1 km-målestokk. Zoom inn for å se byggene i riktig størrelse og trykke på dem.",
"Leiren"
],
[
"Grønt, gult og rødt når du bygger",
"Mens du plasserer et bygg, farges bakken rundt skissen: grønt er flatt, gult er skrått (bygget får grunnmur) og rødt er for bratt. Fargene følger skissen når du flytter den – resten av kartet er som vanlig.",
"Leiren"
],
[
"Hogst og haug i kartet",
"Hvor langt hogsten eller rivingen har kommet («hogst 40 % · 12 t i haug»), står ved feltet når du zoomer helt inn eller har valgt jobben.",
"Leiren"
],
[
"Leiren: 1 lag + deg ›",
"Når lagene og kjøretøyene dine står samlet i leiren, får de én lapp under leirens navn – «Leiren: 1 lag + deg, 2 kjøretøy ›» – i stedet for navn oppå hverandre. Tallet er lagene innen ca. 450 m fra flagget; «deg» er karakteren din, som ikke telles som et lag. Er noen av lagene dine ute, står det til slutt, for eksempel «· 1 lag ute». Trykk på lappen, så zoomer kartet inn på leiren, der hvert lag har sitt eget navn. Laget du har valgt, har alltid sitt eget navn.",
"Lag og strid"
],
[
"Byggene i leiren",
"Byggene i leiren tegnes med tak i leirens farge og mørk kant, og små bygg er litt større enn i virkeligheten når du er zoomet ut, så brakka synes også på 100 m-målestokk. Mens du bygger, står alt i riktig størrelse, så målene stemmer. Når du velger et bygg å plassere, går kartet inn til ca. 50–100 m-målestokk – står du alt så nær, beholdes zoomen.",
"Leiren"
],
[
"Oppdrag i kartet",
"Rutene med lys kjerne er oppdrag («Hent forsyninger», «Ta en røverpost» …). Navnet står ved ruta så lenge det er plass; åpne Leir → Mål for å ta oppdraget.",
"Kom i gang"
],
[
"Høydekurver i bratte lier",
"Høydekurvene står med 5 eller 10 m mellom seg. I bratte lier ville de ligget så tett at lia så stripete ut, så der vises bare hver femte kurve, tynt – og i stup ingen.",
"Vær, lyd og bilde"
],
[
"Når du velger leirplass",
"Kartet er uskarpt et øyeblikk mens de skarpe kartbitene lastes – det er bare midlertidig. Oljeinnretningene i Nordsjøen vises ikke langt ute mens du velger. Står du over tregrensen, sier valget om skogen bare finnes nede i dalen.",
"Kom i gang"
],
[
"Kaier med båtnavn",
"Noen kaier er oppkalt etter en båt («M/K …», «M/S …»). Da viser kartet og leirvalget stedsnavnet i stedet – for eksempel «Odlandstø».",
"Kom i gang"
],
[
"Kjøre feltbilen",
"Gå selv (Gå) bort til feltbilen og trykk «Sett deg inn» (F på PC). På telefonen styrer og gir styrespaken gass; nede til høyre er «Gass», «Brems» og «Gå ut». Hold «Brems» når bilen står, så rygger den. På PC: W gass, S brems og rygg, A/D styrer, mellomrom håndbrekk, F går ut.",
"I 3D"
],
[
"Bratt terreng med bilen",
"Feltbilen står på fire hjul og heller med bakken, men aldri mer enn den tåler. Er det for bratt rett opp, stopper den. På skrå eller bratt nedover kryper den sakte og kan skli litt nedover – kjør langs bakken eller ned igjen, så kommer du løs.",
"I 3D"
],
[
"Flanke og rygg",
"Lagene vender en veg. Skyter du på et lag fra siden eller bakfra, treffer du mye bedre. Et lag som står stille, snur seg sakte mot den som skyter – så angrip fra to kanter.",
"Lag og strid"
],
[
"Formasjon og marsjfart",
"Kolonne går raskest, særlig på veg, men er sårbar. Linje og spredt går saktere. Bytt formasjon i lagpanelet før marsjen.",
"Lag og strid"
],
[
"Sårede og sykestue",
"Et lag med sårede går saktere fordi de bæres. Stå stille ved leiren, så blir de friske – mye fortere med en sykestue. Helikopteret kan hente laget hjem.",
"Lag og strid"
],
[
"Fanger og avhør",
"Et fiendelag som er knust eller omringet, gir seg. Fangene følger laget ditt til leiren. Under Leir → Mål → Fanger kan du avhøre dem (da får du vite hvor lagene deres står), bytte dem, sette dem i arbeid, gi dem god behandling eller sette dem fri.",
"Lag og strid"
],
[
"Etterretning",
"Det speidere, droner, radiomasten og fanger forteller, står i kartet som stiplede merker med «?» og under Leir → Mål. Merket viser hvor laget sist ble meldt, og hvor gammelt det er.",
"Lag og strid"
],
[
"Natt og nattsikt",
"Om natta ser alle mye kortere. Gi troppen nattsikt (Tropper → utstyr), eller skyt opp en lysrakett fra Tiltak i lagpanelet.",
"Lag og strid"
],
[
"Tiltak: artilleri, røyk, lys og støy",
"Knappen «Tiltak» i lagpanelet: kall inn rakettartilleri på et sted laget ser, legg røyk for å komme unna, skyt opp lys om natta, eller lag støy som lokker fienden dit du vil.",
"Lag og strid"
],
[
"Bakhold på veg",
"Sett et lag i bakhold ved en veg (Tiltak). Kjører fiendens lastebil forbi, blir den stoppet – og du kan ta den.",
"Lag og strid"
],
[
"Beleiring",
"Still lag på to kanter av et tettsted fienden holder. Da får ikke garnisonen forsyninger: etter seks timer er den svekket, etter tolv gir den seg. Uten strøm går det fortere.",
"Lag og strid"
],
[
"Våpenhvile",
"Under Leir → Mål kan du kjøpe våpenhvile med en fraksjon for ett døgn. Da lar de deg være, og du kan ta deg av den andre. Bryter du avtalen, blir den neste dobbelt så dyr.",
"Lag og strid"
],
[
"Bygdevern",
"Tettsteder ingen eier, har et bygdevern. Du kan gjøre en avtale med dem (koster penger) eller ta stedet med makt – det koster både folk og moral. Motstanderne må også slåss mot vernet.",
"Lag og strid"
],
[
"Helikopterfrakt",
"Har leiren et helikopter, kan det fly et lag ut eller hente det hjem (Tiltak i lagpanelet). Hver tur koster penger.",
"Lag og strid"
],
[
"Røverne finner på nytt",
"Røverne kommer ikke alltid rett på: de kan komme fra to kanter, vente til det blir mørkt, eller sende sabotører mot aggregatet eller tanken.",
"Leiren"
],
[
"Dekning bak hus",
"Et lag som står stille i et tettsted eller inntil et hus, er vanskeligere å treffe. Panelet sier «i dekning bak hus».",
"Lag og strid"
],
[
"Når laget er knust og omringet",
"I Stridsregler for laget velger du om det skal gi seg heller enn å dø når det er knust og har fiender på to kanter. Standard er at det aldri gir seg.",
"Lag og strid"
],
[
"Når angrepet er over",
"Et angrep er slått tilbake når røverne er slått ut, eller når de har trukket seg unna og holdt seg over 2,5 km fra leiren i en halv time. Da får dere belønningen, og neste bølge kommer senere.",
"Leiren"
],
[
"Dekning bak leirens bygg",
"Et lag som står stille inntil et ferdig bygg i leiren, tar mye færre treff når bygget står mellom laget og fienden. Brakker, verksted og containere gir best dekning, telt og drivhus mindre. Sandsekkvollen har sin egen dekning.",
"Leiren"
],
[
"Bytte fanger",
"Under Leir → Mål → Fanger: «Bytt» gir penger fra motstanderen (150 000 kr per fange). Har motstanderen tatt noen av dine, kan du bytte én mot én – de som kommer hjem, står som «fri» i Folk.",
"Lag og strid"
],
[
"Fanger i arbeid",
"«Arbeid» setter fangene på bygg, hogst, riving eller frakt. En fange er en halv arbeider, men bare der minst én av dine arbeider. Fanger i arbeid kan rømme – mest når få vokter dem (folk på vakt og soldater ved leiren). De som rømmer, vet hvor leiren ligger.",
"Leiren"
],
[
"Fanger som blir med",
"Gi fangene god behandling (én rasjon per fange per døgn). Etter tre døgn kan du spørre om de vil bli med i gjengen – flere sier ja når moralen er god. De trenger en ledig seng. Noen få kan være forrædere.",
"Leiren"
],
[
"Krigen lagres",
"Røyk og lysraketter som brenner, helikopteret på tur og kjøreordrene for kjøretøyene dine er med når du kommer tilbake til spillet. Det samme er fiendens stillinger og det motstanderne vet om deg.",
"Kom i gang"
],
[
"Krigen i 3D",
"Fiendens stillinger du har sett, står som ringer av sandsekker. Helikopteret flyr ut når det henter eller frakter et lag, og stedene der fiendens lag sist ble meldt, har et merke med «?».",
"I 3D"
],
[
"Stridsvogna ser selv",
"Stridsvogna skyter bare på fiender den ser selv fra tårnet, eller som et av lagene dine rett ved vogna ser. Det vaktene, kameraene og dronene melder, ser du på kartet, men vogna skyter ikke på det. Står det «er meldt, men vogna ser dem ikke» i loggen, trykk «Kjør mot …» i panelet til vogna, eller send et lag dit.",
"Lag og strid"
],
[
"Artilleri trenger en som ser",
"Rakettartilleriet treffer mye bedre når noen ser målet: en drone, eller et lag som har radiokontakt med deg. Uten det blir spredningen stor.",
"Lag og strid"
],
[
"Krigskartet på telefon",
"Trykk «Skjul» øverst i krigskartet, så blir panelet en smal stripe og du ser hele kartet. Trykk på et tettsted for å se det i stripa – og «Send» et lag dit med en gang. «Vis mer» henter panelet tilbake.",
"Lag og strid"
],
[
"Fienden husker",
"Når du lagrer og kommer tilbake, er fienden der den var: lagene, stillingene du har sett, der du sist så dem, marsjene de var på og lastebilene deres.",
"Lag og strid"
],
[
"Store tettsteder tar tid",
"Et lite tettsted (opptil ca. 4000 innbyggere) tas av et lag som står 30 minutter der uten fiender. Større steder trenger flere mann og lengre tid: Stavanger/Sandnes trenger ca. 69 mann for full fart (ca. 4 timer) og minst 35 for at det går i det hele tatt. Med færre går det saktere, og under minstetallet skjer ingenting. Trykk på tettstedet (eller se «Neste trekk» i krigskartet) for å se hva det krever.",
"Lag og strid"
],
[
"Motstanderne samler seg først",
"De første døgnene (2,5 på Vanlig, lenger på Lett, kortere på Hard) holder Ravnsund Sikkerhet og Mosevakt Feltoperasjoner seg i sitt eget tettsted og bygger seg opp – de tar ingen andre tettsteder. Det neste døgnet tar de bare småsteder, og først etter det går de mot byene. Bruk tida: lag tropper og ta tettstedene nær leiren. De får et nytt lag omtrent hver sjette spilltime, og flere jo lenger spillet varer.",
"Lag og strid"
],
[
"Seier tidligst dag 4",
"Ingen side kan vinne krigen eller «ha overtaket» før det har gått tre døgn. Krigskartet sier når krigen tidligst kan avgjøres.",
"Lag og strid"
],
[
"Send flere lag",
"«Neste trekk» i krigskartet sier hvor mange mann et tettsted trenger. Er ett lag for lite, står det «Send 3 lag» – da sendes de nærmeste lagene sammen. Har du for få, står det «For få».",
"Lag og strid"
],
[
"Varsel om røvere",
"Røverne starter 3–4 km fra leiren. Banneret sier fra hvilken kant de kommer og når de ventes (et anslag) til noen ser dem. Et bemannet vakttårn ser dem på 1,5 km, kameramaster innenfor sin sirkel, og vaktene nær leiren. Omtrent ti minutter før de er framme, senkes farten og du får et varsel til.",
"Leiren"
],
[
"Forsvaret huskes",
"Har du trykket «Forsvar leiren», husker spillet det selv om du laster siden på nytt midt i angrepet: lagene står i stillingene og banneret sier «lagene holder stillingen».",
"Leiren"
],
[
"Ildkraft i troppsoppsettet",
"Troppsoppsettet viser treff per salve på 100, 400 og 800 m (de faller med avstanden) og hvor mye det er mot et vanlig lag på tolv. Prosenten kan stige på langt hold fordi maskingeværene i et vanlig lag treffer dårlig der.",
"Lag og strid"
],
[
"Motstanderne blir sterkere",
"Etter fredstiden tjener Ravnsund Sikkerhet og Mosevakt Feltoperasjoner penger og får folk fra tettstedene de holder. De kjøper nye lag, lastebiler og etter hvert en stridsvogn. Jo mer de holder, jo fortere vokser de – ta tettsteder fra dem, så bremser du dem. På «Lett» går det saktere, på «Hard» fortere.",
"Lag og strid"
],
[
"Angrep med flere lag",
"Motstanderne samler flere lag på ett sted før de angriper et stort tettsted eller et tettsted noen holder – også dine (fra dag 5 på «Vanlig», og bare én av dem om gangen). Storbyene blir mål først etter noen dager (dag 11 på «Vanlig», dag 15 på «Lett», dag 8–9 på «Hard»). De kjemper også mot hverandre om tettstedene.",
"Lag og strid"
],
[
"Etterretning om angrep",
"Når et angrep mot noe av ditt samles, sier loggen det: «Etterretning: Ravnsund Sikkerhet samler 3 lag ved Oltedal. Målet er trolig Høle (ditt) – angrep tidligst om ca. 6 t.» Kartet viser samlingsstedet med en stiplet ring og en pil. Bruk tida: send flere lag dit, grav ned garnisonen og sett stridsreglene til «kjemp» – ellers trekker garnisonen seg når den er underlegen.",
"Lag og strid"
],
[
"Angrep på leiren",
"Fra dag 8 på «Vanlig» (dag 11 på «Lett», dag 6 på «Hard») kan motstanderne sende ekte tropper mot leiren – sjeldnere enn røverne, og alltid med varsel noen timer før. Jo flere lag du har hjemme, jo flere må de samle.",
"Leiren"
],
[
"Handelsrutene",
"Motstanderne sender av og til et lag for å stenge en handelsrute eller ruta til oljekolonnen din. Loggen sier fra. Sett et lag ved ruta som vakt, eller jag dem bort.",
"Lag og strid"
],
[
"Angrepsbanneret",
"Når noen angriper leiren – røvere eller en av motstanderne – står et rødt banner øverst med hvem, hvor mange og fra hvilken kant. Ser ett av lagene dine, et vakttårn, et kamera eller vakta dem, står avstanden og når de er framme. Har noen sett dem nylig, står «sist sett … for N min siden». Ellers står et anslag som et spenn («ca. 1–2 timer»), fordi ingen vet nøyaktig hvor de er. Varselbrikka øverst til venstre sier det samme. «Forsvar leiren» sender lagene i stilling.",
"Leiren"
],
[
"Når kampen begynner",
"⏭ og farten stopper når røverne er snart framme, og igjen når kampen begynner (et av lagene dine og en angriper skyter på hverandre). Da går tida på 1×, så du kan følge kampen: skuddene står som stiplede streker med munningsglimt, og lagene i kamp får en rød ring og «I ildkamp». Lagene i og ved leiren (innen 600 m) vises der de er, og det de ser, står på kartet.",
"Lag og strid"
],
[
"Rapporten etter et angrep",
"Når en røverbølge eller et angrep på leiren er over, kommer en kort rapport i banneret og i loggen: om angrepet ble slått tilbake eller om de herjet, hva dere tok fra dem eller de tok fra dere, tap hos dere (falne og sårede) og skadde bygg. ⏭ stopper så du ser den. «Reparer alle» står i rapporten når bygg er skadet.",
"Leiren"
],
[
"Garnisonen holder stillingen",
"Et lag som blir garnison i et tettsted dere holder, kjemper som standard også mot en sterkere fiende og trekker seg ikke etter tap – ellers ble tettstedet tatt uten kamp. Vil du at laget heller skal trekke seg, endrer du det i lagpanelet → Stridsregler. Går laget ut av tettstedet, får det reglene sine tilbake.",
"Lag og strid"
],
[
"Radiorekkevidde når du sender et lag",
"Krigskartet sier fra før du sender et lag lenger ut enn radioen når (håndradio 3 km, feltradio 8–40 km etter radiomasten): da kan laget ikke få nye ordre der ute. Du kan sende likevel, gi laget feltradio og sende, eller sende et annet lag som har feltradio. Lag du ikke har kontakt med nå, har grå knapper med forklaring.",
"Lag og strid"
],
[
"Garnisonen melder seg fra tettstedet",
"Et lag som står i et tettsted du holder, bruker radioen der: det melder seg, vises der det står og kan få ordre, selv om det er langt utenfor håndradioens rekkevidde.",
"Lag og strid"
],
[
"Send en tropp som sitter i et kjøretøy",
"Sitter troppen i en lastebil eller speiderbil, sender «Send» kjøretøyet til tettstedet. Troppen går av når de er framme og går inn i tettstedet.",
"Lag og strid"
],
[
"Troppene dine",
"«Tropper» viser troppene og lagene du har øverst: hvor mange mann, hvor de er, om du har radiokontakt, og «Velg». «Lag ny tropp» står under.",
"Lag og strid"
],
[
"Leiren forsvarer seg når du spoler",
"Spoler du (60×, 600× eller ⏭) mens et angrep på leiren pågår – eller angriperne er nesten i leiren – går lagene hjemme i forsvar av seg selv, som om du trykket «Forsvar leiren». Loggen sier fra.",
"Lag og strid"
],
[
"Hold byen: motangrepet",
"I scenariet «Hold byen» må du holde tettstedet i tre døgn og slå tilbake motangrepet som kommer når fredstiden er over. Har ingen motstander krefter til å angripe på to døgn, holder de tre døgnene.",
"Kom i gang"
],
[
"Oppsummeringen når scenariet er over",
"Seiers- og tapsskjermen viser døgn, tettsteder, tap (falne og sårede), pengene og det viktigste som skjedde: tettsteder tatt og mistet, angrep slått tilbake.",
"Kom i gang"
],
[
"Krigen din på nytt",
"Reprisen står på pause mens du ser. Fargene viser hvem som holdt tettstedene; en ring betyr at tettstedet skiftet eier siden forrige bilde. Tegnforklaringen står i boksen nederst.",
"Lag og strid"
],
[
"Før laget går: advarselen i Krig",
"Trykker du «Send» i krigskartet, sjekker spillet først hva som venter: for få mann («For få: 1 av 3 – tar ikke stedet»), bygdevernet («Bygdevernet i Vikeså (7 mann) slipper dere ikke inn»), fiender som er sett der, om laget havner utenfor radioen, og om leiren står uten vakt når det siste laget går. Da må du velge: «Send likevel», «Gjør avtale og send», «Speid og meld» eller «Avbryt».",
"Lag og strid"
],
[
"Ett tall: hvor mange som trengs",
"«Trenger minst 3 mann (5 for full fart)»: med færre enn 3 står inntaket stille. Med 3 eller 4 tar laget stedet, men saktere enn med 5. Det første tallet er det som avgjør.",
"Lag og strid"
],
[
"Radioen og terrenget",
"Radioen når lengst over flatt land. Står en fjellrygg mellom leiren og målet, rekker den bare en tredel (håndradio 3 km blir ca. 1 km, feltradio 8 km blir 2,8 km). Krig regner med terrenget før du sender, og foreslår bare et annet lag med feltradio når det faktisk når fram – ellers står det «når heller ikke fram (terreng: 2,8 km)».",
"Lag og strid"
],
[
"Speid og meld",
"En speidertropp skal finne fienden uten å slåss. Sender du den mot et sted med bygdevern eller fiender, stopper den ca. 400 m utenfor og melder hva som står der. Også når du gir ordren rett i kartet, stopper den før et forsvart sted. Uten radiokontakt venter meldingen til kontakten kommer tilbake.",
"Lag og strid"
],
[
"Bygdevernet og avtalen",
"Tettsteder uten eier har et bygdevern. «Neste trekk» viser hvor mange de er («bygdevernet: 7 mann»). Med en avtale (knappen ved stedet eller i advarselen) slipper de dere inn uten kamp.",
"Lag og strid"
],
[
"Friske, sårede og falne",
"Lagene i Krig og Tropper viser «4 friske av 6, 1 såret, 1 falt». De falne trekkes fra med en gang de er meldt. Har du ikke kontakt med laget, står det når det sist meldte seg («sist meldt dag 2 06:53»).",
"Lag og strid"
],
[
"Scenariet i Krig",
"Øverst i Krig står scenariet ditt med dag og frist (for eksempel «Sju døgn – dag 4 av 7»), og om krigen teller for det. I «Sju døgn» vinner du ved å overleve – prosenten i krigen er da bare en bonus.",
"Lag og strid"
],
[
"Tegnforklaringen i krigskartet",
"Nederst i Krig står hva merkene betyr: egne lag, fiender dere ser, «sist sett» (stiplet), «?» = fiende meldt over radio eller av speidere, tettsteder etter eier, tallene 1–3 (forslagene) og frontene. Flere lag på samme sted får ett tall («3 lag»).",
"Lag og strid"
],
[
"Tankbilen: laget går hjem",
"Sender du et lag til tankbilen, får du samme radiovarsel som i Krig. Lappen viser «Vaktlaget på vei (43 min)», og når dieselen er hentet, går laget hjem til leiren av seg selv.",
"Lag og strid"
],
[
"Scenariets by",
"I «Hold byen» står byen du skal ta med navn i Krig («Ta Røysland (Ravnsund Sikkerhets, 9 km NV)»), med en gyllen ring i kartet og «Scenariets by» i tettstedspanelet. Holder du den, teller Krig døgnene («1,0 av 3 døgn» etter 24 timer). Mister du den, sier loggen at telleren starter på nytt.",
"Lag og strid"
],
[
"Hvorfor tar ikke laget byen?",
"Krig viser kjent forsvar i mann før du sender et lag, og fredstiden (motstanderne slåss ikke om byer de første døgnene). Er forsvaret større enn laget, er Send rød. Står et lag ved et sted det ikke kan ta, skriver loggen hvorfor og spolingen stopper.",
"Lag og strid"
],
[
"Lagre og last",
"Spillet lagres av seg selv i nettleseren, hele tiden. «Lagre og last» i ☰ (eller «Lagre» bak «Mer» nederst) viser når det sist ble lagret, og har tre lagringsplasser du kan lagre i, laste inn og slette, med navn, dag, fraksjon og kasse. Når du laster en plass, legges spillet du hadde i «Automatisk» først, så du kan gå tilbake. «Automatisk» tas også hvert tiende minutt du spiller.",
"Kom i gang"
],
[
"Ta spillet med deg",
"«Last ned som fil» lager en fil med hele spillet (JSON). På en annen maskin: åpne samme side (/dovre-fliser, /norge eller /rogaland), trykk «Last inn et lagret spill …» på startskjermen eller «Lagre og last» i ☰, og velg «Hent fra fil».",
"Kom i gang"
],
[
"Hver side sitt spill",
"/dovre-fliser, /norge og /rogaland har hvert sitt lagrede spill og lagringsplasser. De rører ikke hverandre. Startskjermen sier fra hvis du har et spill på en annen side.",
"Kom i gang"
],
[
"Når spillet ikke kan lagres",
"I et privat vindu eller med blokkert lagring, eller når nettleseren er full, sier spillet fra i loggen og i «Lagre og last». Spillet virker likevel – last det ned som fil før du lukker siden, eller slett en lagringsplass for å få plass.",
"Kom i gang"
],
[
"Leiren på nær zoom",
"Zoom helt inn på leiren i 2D-kartet, så ser du byggene ovenfra: blikktak på brakkene, svart tak og antenne på kontrollrommet, rødt kors på sykestua, presenning på lagerteltet, panelene på solcellene og H-en på helikopterplassen. Skyggen viser hvor høyt bygget er. En tynn kant i fraksjonens farge betyr at bygget er ditt; gul kant = valgt, rød kant = uten strøm eller hardt skadet.",
"Leiren"
],
[
"Hvordan bygget har det",
"Stikker og snor: bygget står i kø, eller byggelaget er på vei. Grunnmur, reisverk og stillas: bygget er under bygging, og taket legges etter hvert som arbeidet går fram. Sot og hull i taket: bygget er skadet – reparer det. Brent tomt med murrester: bygget er ødelagt. Stillas rundt et ferdig bygg: det repareres eller oppgraderes.",
"Leiren"
],
[
"Folk og lag på nær zoom",
"Helt inne i kartet er lagene soldater sett ovenfra – skuldre i sidens farge, hjelm og gevær – i formasjonen sin. Lagføreren er gul, sårede har bare omriss. Folkene i leiren står der de arbeider: byggelaget rundt byggeplassen, vakta ved porten eller tårnet. De som arbeider inne (kontrollrom, kjøkken, sykestue, verksted), ser du ikke. Feltbilen og helikopteret vises som kjøretøy.",
"Lag og strid"
],
[
"Leiren om natta",
"Om natta blir kartet mørkere, og byggene med strøm har varmt lys fra vinduene på bakken rundt seg. Mangler et bygg strøm, er det mørkt.",
"Vær, lyd og bilde"
],
[
"Lut i husene",
"Inne i husene ligger det ting i møblene: mat og drikke i kjøleskapet og kjøkkenskapene, klær, sekker og av og til et jaktvåpen i garderoben, medisin i baderomsskapet og på nattbordet, verktøy på verktøybenken, mye mat i butikkenes reoler. Står du ved et møbel, kommer knappen «Åpne kjøleskapet (E)». Hvert møbel har sitt eget innhold, og det du legger igjen der, blir liggende. Ransakede hus har lite igjen.",
"I 3D"
],
[
"Inventaret",
"Panelet har det du bærer til venstre og møblene du står ved til høyre – én fane per møbel, og «Gulvet» der du står. Trykk en ting og så den andre siden for å flytte den (på telefonen), eller dra og slipp med musa. Dobbeltklikk flytter med en gang. Høyreklikk eller hold inne for valgene: Spis, Drikk, Utstyr, Ta på, Legg fra deg, Flytt til …, Bruk og Lad. «Ta alt» og «Legg alt» flytter alt på én gang. Tab åpner og lukker panelet når du går.",
"I 3D"
],
[
"Vekt, lommer og sekk",
"Lommene rommer 5 kg. Sekken på ryggen gir mer plass og gjør vekten lettere å bære: handlenett 7 kg, skolesekk 12 kg, tursekk 22 kg og militærsekk 30 kg. Du starter med en tursekk. Bærer du mer enn bæreevnen (22 kg, mer med styrke), går du tregere og blir fortere sliten; ved halvannen gang så mye kan du ikke løpe. Våpnene i beltet (1–4) teller i vekten, men tar ikke plass i sekken.",
"I 3D"
],
[
"Fersk mat",
"Melk, brød, pølser, egg og epler blir gamle og så råtne etter noen døgn. Gammel mat metter mindre, råtten mat gjør deg dårlig (minus helse). Hermetikk, knekkebrød, tørrfisk og saft holder; brunost holder lenge, men ikke evig. Et kjøleskap holder maten fersk fire ganger så lenge – men bare så lenge det er strøm. I leiren kan du gi mat til folket («Gi til leiren»): den blir rasjoner i matlageret.",
"I 3D"
],
[
"Flytte møbler",
"Står du ved et møbel (inne i et hus, i leirens bygg eller ute), kommer knappen «Plukk opp …» (P på PC) – på telefon i raden med knapper under kompasset. Er det for tungt (høyballer, traktorer), står det på knappen. Står det «ingen møbler du kan bære» under bygget, er det ingenting å flytte der. Et gjennomsiktig bilde av møbelet står foran deg og følger blikket: grønt = her kan det stå, rødt = ikke plass (vegg, et annet møbel, døråpning, vann eller hus). R dreier det, E (eller «Sett her») setter det ned, «Sett tilbake» legger det der det sto. Det som ligger i et skap eller kjøleskap, følger med – opptil 20 kg, ellers må du ta ut noe først. Store møbler bærer du i armene: du går tregere og kan verken løpe eller skyte. Traktorer, biler og fly er for tunge. Et kjøleskap i en brakke med strøm holder maten kald.",
"Leiren"
],
[
"Lommelykt",
"Har du en lommelykt i sekken, slår L (eller knappen «Lykt» til venstre når du går) den på og av. Om natta lyser den opp bakken foran deg, og du ser lenger – men fiendene ser deg også mye lenger unna, og mørket skjuler deg ikke lenger. Et sett batterier varer i 8 spilltimer; «Bytt batterier» bruker én pakke batterier fra sekken.",
"I 3D"
],
[
"Sove ute og sovepose",
"Er du trøtt ute, kommer knappen «Sov her». Med en sovepose i sekken sover du like godt som i et sikret hus. Uten sovepose sover du halvt så godt – og om vinteren fryser du: lite søvn, du blir sulten og mister litt helse. Soveposer finner du i garderober og hytter.",
"I 3D"
],
[
"Feltflasker",
"Flaska di rommer fire slurker. Hver ekstra feltflaske du finner i husene, gir fire slurker til («Flaske 3/8»). Flaskene fylles av seg selv i leiren (når leiren har vann) og når du står ved et vann eller en bekk.",
"I 3D"
],
[
"Ransakede hus",
"Røvere og fiendelag som går forbi et hus, tar med seg det som ligger i det – jo lenger de er der, jo mindre blir igjen. I panelet står det «huset er ransaket». Butikker og lagre fylles litt på igjen hvert tredje døgn. Husene nærmest en ny leir er aldri tomme.",
"I 3D"
],
[
"Det du fant i huset",
"Når letingen er ferdig, kommer et panel som står til du lukker det: hva som gikk til leiren (mat til leirens mat, materialer til lageret, diesel til tankene, penger til kassa – ikke i sekken din), hva som havnet i sekken, og hva som ble liggende igjen fordi leiren ikke hadde plass. Knappen «Se i skapene» åpner inventaret med alle skapene, skuffene og hyllene i huset – mat, våpen og utstyr tar du selv derfra.",
"I 3D"
],
[
"Drikk og spis av deg selv",
"Er det vann i feltflaska og du blir tørst, drikker du av deg selv – også når karakteren står i kartet. Det samme med feltrasjonene i sekken når du blir sulten. Loggen sier fra hver gang. Varselet «Du er tørst» har også knappen «Drikk» (og «Spis» når du er sulten), så du kan gjøre det med en gang.",
"Kom i gang"
],
[
"Lys og skygger",
"På Høy og Middels grafikk kaster sola (og månen) skygger fra trær, hus, bruer og leirens bygg, bildet får en lett fargesetting (varm kveld, kald vinter), bakken er skarpere nært, vannet er lysere på grunna, skyene henger sammen med skyggene sine, og tåka ligger i dalbunnen. Går bildet tregt, slår du alt av med «Lys og skygger» i ☰ – eller velger lavere grafikk.",
"Vær, lyd og bilde"
],
[
"Lys om natta",
"Gatelys og vinduer lyser opp bakken rundt seg om natta. Skyggene kommer da fra månen når den er oppe.",
"Vær, lyd og bilde"
],
[
"Grensa i 3D (Rogaland)",
"På Rogaland-kartet er alt utenfor fylket mørklagt også i 3D – terrenget, husene og trærne – med en myk overgang og en stiplet gul strek der grensa går. Du kan se ut over grensa, men spillet holder seg innenfor.",
"I 3D"
],
[
"Jevnt når du går inn i hus",
"Når du går, lages innsiden av husene rundt deg litt om gangen, så bildet ikke stopper opp. Husene du går mot, gjøres klare først, og et hus du nettopp gikk fra, kommer tilbake med en gang når du snur. Står et hus du vil inn i, fortsatt stengt, så vent et øyeblikk – innsiden er på vei.",
"I 3D"
],
[
"Jevnere når du flyr",
"Når du flyr eller kjører langt, bygges et nytt stykke 3D-landskap i bakgrunnen mens du ser på det gamle. Det gjøres nå i mindre biter, og spillet bruker den samme plassen i minnet om igjen fra stykke til stykke – derfor blir det færre og kortere stopp i bildet. Hakker det fortsatt, prøv «Mål hakk» i ☰ (i 3D) og send teksten.",
"I 3D"
],
[
"Morgenmøtet",
"Hver morgen kl. 06 (fra dag 2) kommer et kort: øverst dagboka, døgnoppgjøret og hvordan gårsdagens valg gikk («I går: …»), så 2–3 valg for dagen ut fra det som står på i leiren – lite mat, røvere på vei, lite penger, godt med folk eller lav moral. Hvert valg sier hva det koster og hva det gir (på PC: tastene 1–3). Spillet står på pause til du svarer. «Ingen endring i dag» lukker kortet. Under et angrep venter kortet til angrepet er over. Det dere har bestemt for i dag, står under «Morgenmøtet» i Leir → Mål. Møtet holdes én gang per dag: åpner du spillet igjen rett før kl. 06, kommer ikke gårsdagens møte en gang til. Er kortet for høyt (liggende telefon), står det viktigste på én linje – «Vis hele døgnet ›» viser hele rapporten. Trykker du ⏭ eller en fart mens møtet venter, står tiden til du har svart; så gjelder farten du trykket.",
"Leiren"
],
[
"Folk som sendes ut",
"Jakt og fiske, speidertur, våpenøvelse, leie ut to som vakter og tankbilen til fots tar to personer bort til neste morgen – de arbeider ikke den dagen (Folk viser «borte»). Neste morgen kommer de hjem med det de fikk: rasjoner, penger, materialer, diesel eller kamperfaring (våpenøvelsen: +15 min hver, den følger dem inn i en tropp) – og av og til er en av dem skadet. Spillet sender aldri den eneste som har en oppgave (for eksempel den eneste kokken).",
"Leiren"
],
[
"Tap i lagene",
"Morgenmøtet sier hvem i lagene dine som falt eller ble såret siste døgn, med navn og lag – også lag som er langt ute – og om det var lagføreren («Tap i lagene: Vaktlaget: Oddvar Aasen falt, Kari Lund (lagfører) ble såret»).",
"Lag og strid"
],
[
"Dobbel vakt, fridag og ekstra skift",
"Dobbel vakt i natt: to til går på vakt til neste morgen – vaktene ser røverne tidligere, og lagene innen 450 m fra leiren treffer bedre. Dagen etter er folk slitne (moral −8, litt saktere arbeid). Fridag: moral +12, men alt arbeid går halvt så fort den dagen. Ekstra skift: arbeidet går 25 % raskere, men moral −10. Halve rasjoner: 40 % mindre matforbruk og moral −12. Alt varer til neste morgen.",
"Leiren"
],
[
"Viktige beslutninger",
"Fra dag 2 får morgenmøtet hver dag en større sak som steg 2 på kortet: et nabogårdsfolk vil bli med (folk +4 og litt mat – men de trenger senger og mat hver dag), en forlatt tankbil med diesel (send en tropp dit – den står i kartet i to døgn, og det kan være røvere der – eller to til fots), røverne vil ha betalt for å la dere være et døgn til, en handelskaravane som selger billig og kjøper tre, eller en handelsmann som kommer kl. 14. Samme sak kommer aldri to dager på rad, og nabogården høyst hver fjerde dag.",
"Leiren"
],
[
"Tankbilen",
"Velger du «Send en tropp dit», står tankbilen i kartet (oransje merke) og som brikke øverst til venstre med «Send …» for det nærmeste laget. Kommer et eget lag innen 60 m, fraktes dieselen til leiren – så langt det er plass i tankene. Omtrent hver tredje gang ligger det røvere der: slå dem først. Etter to døgn er bilen borte.",
"Lag og strid"
],
[
"Handelsmannen og svartebørsen",
"Penger uten krig: svartebørsen kjøper tre (eller diesel når dere ikke har tre) – det står som et valg på morgenmøtet hver dag dere har noe å selge, og den betaler 40 % mer enn markedet for treet. Handelsmannen kommer kl. 14: velg på morgenmøtet hva du legger av til ham (tre eller diesel). Han betaler 80 % mer enn markedet for treet, men det må ligge på lageret når han kommer – brikken øverst til venstre sier hvor lenge det er igjen. Har dere brukt noe av det, tar han resten og betaler for det.",
"Leiren"
],
[
"Når det går dårlig",
"Morgenmøtet hjelper deg tilbake etter et tap. Kommer røverne snart, står det øverst i møtet med samme tid som varselet, og første valg er «Forsvar leiren nå» (lagene går i stilling og graver seg ned). Har dere tapt et tettsted eller en tropp siden i går, står det i rapporten, og møtet tilbyr flere soldater: leiesoldater (et ferdig lag på 4 for 2,5 mill. kr), et vaktlag av folkene i leiren (gratis) eller folk fra nabogården (600 000 kr). Har dere ingen tettsteder og under 6 friske soldater, sender bygdevernet 3 frivillige gratis (høyst hver tredje dag). En speidertur mot et tettsted fienden holder, er farligere, men de melder hvor mange fiender som er der.",
"Lag og strid"
],
[
"Trær, gress og lyng",
"Trærne har kroner av blader og nåler, og granene har hengende greiner. Går du selv, står det høyt gress i flekker på enga og lyng i skogen, og alt svaier i vinden. Om vinteren mister løvtrærne nesten alt løvet.",
"I 3D"
],
[
"Støv, eksos og hjulspor",
"Kjøretøy som kjører, slipper eksos. På tørr grus og i terrenget virvler de opp støv, på snø snøføyke. Hjulsporene blir liggende et par minutter før de blir borte. På asfalt blir det ikke spor.",
"I 3D"
],
[
"Ildkamp som synes",
"Når et lag skyter, ser du munningsild, sporlys mot målet, kruttrøyk og nedslag i bakken. I kartet blinker det ved laget som skyter.",
"Lag og strid"
],
[
"Kratere og brent skog",
"Et kjøretøy som blir ødelagt, etterlater et krater og en røyksky. Der det har brent, er bakken svidd og trærne svarte. Der det brenner nå, ser du flammer og røyk.",
"I 3D"
],
[
"Skogen fortsetter i det fjerne",
"Skog langt unna tegnes som enkle holt, så landskapet ikke slutter i en kant. Kommer du nær, står de ekte trærne der. På lav grafikk er de fjerne holtene slått av.",
"Vær, lyd og bilde"
],
[
"Strender og vannkant",
"Innsjøer og elver har en myk, ujevn strandkant som følger terrenget, med en lys sone av stein og grus og en mørk, fuktig kant helt nede ved vannet. Der du ser vann, kan du ikke gå – og der du ser land, kan du gå.",
"I 3D"
],
[
"Lyng på heia",
"Brun og grønn hei er lyng og gress når du går på den. Stein ligger der fjellet er grått.",
"I 3D"
],
[
"Opplæringen",
"Ni korte steg i en rute nederst: Åpne Leir, Bygg en brakke, Sett to på bygg, Lag en tropp, Gå i 3D, Mer forsvar før dag 4, Ha mat til tre døgn, Sett lagene i forsvar og Reparer etter et angrep. En ring viser hva du skal trykke på. «Senere» legger steget sammen til én linje (trykk + for å se det igjen). Et steg som står ugjort lenge, og opplæringen mens leiren angripes, legges sammen av seg selv. «Reparer» kommer først når noe faktisk er skadet.",
"Kom i gang"
],
[
"Mer forsvar før dag 4",
"Røverbølgene vokser. Lag en liten tropp til (to til fire holder), eller sett to på Vakt i Folk – de blir Leirvakta og forsvarer leiren når røverne kommer. Hver soldat er en arbeider mindre: la alltid minst to stå på Bygg, ellers stopper byggingen.",
"Kom i gang"
],
[
"Lag en tropp",
"Tropper (eller Leir → Bygg → Tropper → «Lag ny tropp»): velg et forslag eller kryss av folk selv, gi troppen navn, våpen og utstyr. Forslagene tar aldri de to siste byggerne – de blir igjen og bygger. Velger du dem selv, sier panelet fra i rødt («Ingen igjen på «bygg»») og knappen heter «Opprett likevel».",
"Lag og strid"
],
[
"Oppløs en tropp",
"Trykk på troppen og «Oppløs troppen» i panelet (trykk to ganger for å bekrefte). De som lever, går tilbake til arbeid i leiren som «fri» i Folk – sett dem på Bygg eller en annen oppgave. Er troppen ute, heter knappen «Send hjem og oppløs»: troppen marsjerer hjem og oppløses ved leiren. En ny ordre avbryter det. Kjøpte våpen og utstyr følger ikke med.",
"Lag og strid"
],
[
"Ingen bygger",
"Står det «Ingen på «bygg» – jobben står stille» øverst i Leir-menyen, trykk «Sett to på Bygg». Er gjengen tom eller nesten tom, heter knappen «Ring etter arbeidere»: når dere er færre enn tre, kan nye bli med uten ledig seng (500 000 kr hver, gratis når kassa er tom), og de går rett på Bygg til to bygger.",
"Leiren"
],
[
"Lagene",
"Trykk på et lag og så «Marsjer» og et sted på kartet – ruten følger veger og terreng. Trykk på en soldat for å velge ny lagfører. «Grav ned» gir halvparten så mange treff.",
"Lag og strid"
],
[
"Penger og knapphet",
"Et nytt spill starter med 40 millioner kr. Det rekker til brakke, dieseltank, aggregat, vakttårn og diesel, og litt til – resten må du tjene. Penger kommer fra oppdrag (Leir → Mål: «Hent forsyninger» er trygt og gir 0,5–1,2 mill. kr), salg av tre og materialer dere hogger og river (Leir → Lager, «Selg 10»), skatt fra tettsteder du tar (Mer → Region) og byttet fra røvere du slår tilbake. Leir → Lager → «Penger inn» viser alt, med hva som kom inn og gikk ut i går.",
"Kom i gang"
],
[
"Markedets hyller",
"Markedet har ikke alt hver dag. I fanen Lager («Markedet i dag») står det hvor mye som er på hylla av tre, betong, stål, diesel og mat. Kjøper du hylla tom, må du vente til det kommer mer neste døgn. Tre, betong og stål koster halvannen gang markedsprisen å kjøpe, og du får omtrent halve kjøpsprisen når du selger – så hogst og riving lønner seg klart.",
"Leiren"
],
[
"Regionen: hva tettstedene gir",
"Hvert tettsted du holder, gir noe eget etter hva som ligger der: en bygd gir mat og tre, et industristed (kraftverk like ved) gir stål og betong, en by gir rekrutter og stål, en havn (ferjekai eller havn) gir mat og diesel, og en oljeby gir diesel. Alle betaler skatt i kroner. Åpne «Region» nederst (på telefon: Leir → Lager → «Åpne Region») for å se hva hvert tettsted gir per døgn. Krigskartet viser det samme for tettstedene du kan ta. Et døgn her er et spilldøgn eller ti minutter spilling.",
"Lag og strid"
],
[
"Handelsruter",
"Varene må fram til leiren langs en rute – rett linje, gjerne via et annet tettsted du holder. Står det fiender nærmere enn 4 km fra ruta, er den truet og bare halvparten kommer fram. Nærmere enn 1,5 km er den stengt. Et eget lag ved ruta vokter den og gjør den ett hakk tryggere. Rutene tegnes i kartet (grønn, gul, rød) når Region eller krigskartet er åpent. Når vegnettet er lastet (på PC hentes det når du åpner Region eller krigskartet), følger rutene vegene. Er en bru eller tunnel på vegen sprengt, eller er det sprengt et krater i vegen, er ruta stengt til den er reparert.",
"Lag og strid"
],
[
"Skatt, lojalitet og opprør",
"For hvert tettsted velger du skatt: Støtte (du gir i stedet for å ta – koster penger, lojaliteten stiger fort), Lett, Vanlig eller Hard (mye mer nå, men lojaliteten faller). Lojale tettsteder gir mer. Faller lojaliteten til bunnen, blir det opprør: uten garnison blir tettstedet nøytralt igjen, med garnison holder du det, men det gir bare halvparten. En garnison og strøm løfter lojaliteten. Mister du et tettsted og tar det igjen, starter lojaliteten på høyst 35.",
"Lag og strid"
],
[
"Strøm til tettstedene",
"Et tettsted får strøm fra et helt kraftverk innen 40 km. Uten strøm gir det bare 40 % og blir misfornøyd. Saboterer du et kraftverk for å ramme fienden, rammer du også dine egne tettsteder i nærheten – trykk på kraftverket for å se hvem det forsyner.",
"Lag og strid"
],
[
"Gjenoppbygging",
"Reparerer et av ingeniørlagene dine en bru eller et kraftverk, stiger lojaliteten med 20 i tettstedene dine innen 15 km, og det nærmeste nøytrale tettstedet innen 10 km (uten fiender i) slutter seg til deg uten kamp.",
"Lag og strid"
],
[
"Svartebørsen",
"Av og til kommer en selger til leiren med ting markedet ikke har: medisiner (seks sårede soldater blir kampklare, syke i leiren blir friske), nattsikt (lagene ser 40 % lenger om natta), tunge våpen (lagene treffer 15 % bedre) og smuglerdiesel. Det er dyrt, og han er borte neste døgn. Når en selger er i leiren, står «Svartebørsen» øverst til venstre – trykk på den, eller åpne Mer → Region.",
"Leiren"
],
[
"Olje og diesel kan veksles",
"Olje (tonn, på basen) går til nye enheter, kjøretøy og ammunisjon. Diesel (liter, i leiren) driver aggregatene. I «Region» kan du gjøre 10 tonn olje om til 100 liter diesel i feltraffineriet, eller blande 150 liter diesel til 10 tonn olje.",
"Leiren"
],
[
"Motstandernes tettsteder",
"Også motstanderne har nytte av det de holder: industristeder, byer og oljebyer gir dem bedre våpen (treff +5 % for hvert, høyst +20 %), og bygder og havner gjør at garnisonene deres fylles opp raskere. «Region» viser hva hver motstander får. Tar du tettstedene, mister de fordelen.",
"Lag og strid"
],
[
"Krigskartet: hva et tettsted gir",
"Trykk på et tettsted i krigskartet: boksen sier hva det gir deg per døgn nå (skatt, varer, olje til basen og om det har strøm) – eller hva det ville gitt hvis du tar det, og hva det gir motstanderen som holder det. Under hver side står hva tettstedene deres gir.",
"Lag og strid"
],
[
"Penger inn",
"Øverst i fanen Lager i Leir-menyen står «Penger inn»: kassa, hva som kom inn og gikk ut siste døgn, og hver inntekt – oppdragene som venter (nærmeste og best betalte), hogsten, det du kan selge, tettstedene dine og røverne. Knappene der tar deg rett til oppdragene, Folk og Region. Blir kassa lav, kommer en brikke øverst til venstre som tar deg hit. Nye oppdrag kommer med noen timers mellomrom (høyst tre om gangen), og markedet kjøper høyst 25 m³ tre, 15 m³ betong og 6 t stål per døgn.",
"Kom i gang"
],
[
"Diesel: hvorfor dyr, og hva gjør jeg?",
"Diesel er knapt etter kollapsen og koster ca. 3 000 kr literen (prisen flytter seg litt hver dag). Et aggregat som gir 9 kW, bruker ca. 65 liter i døgnet. Billigere strøm: solceller og batteribank er gratis i drift, strømnettet virker de første døgnene, og bygg du ikke trenger kan slås av (Leir → Bygg → Strøm). Hvor lenge dieselen rekker, regnes likt overalt – i dagsrapporten, i Lager og i varselet – ut fra forbruket det siste døgnet. Er tanken tom, har varselet øverst til venstre en egen «Kjøp 500 l»-knapp.",
"Leiren"
],
[
"Hogstlaget",
"Står noen på «Hogst» under Folk, finner de selv nærmeste skog innen 1,5 km fra leiren og begynner å hogge – loggen sier hvor. Folk på «Frakt» bærer treet til leiren (innen 150 m går det rett i lageret). Vil du velge stedet selv: Leir → Lager → «Hogst …» og trykk i skogen. Tre du ikke trenger, kan selges.",
"Leiren"
],
[
"Hva bygget koster",
"Prisen på byggekortene er hele prisen: arbeidet pluss materialene du mangler på lageret, kjøpt til dagens pris. Har du materialene, er bare arbeidet igjen. Pek på prisen for å se hvordan den er delt.",
"Leiren"
],
[
"Farten senkes av seg selv",
"Når du har satt opp farten, senkes den av seg selv når noe skjer: til 1× når fienden er i sikte, et lag er i ildkamp eller leiren angripes, men bare til 10× når et bygg er ferdig eller et kort venter på svar – og et nytt ferdig bygg innen to spilltimer senker den ikke igjen. ⏭ spoler til neste hendelse og stopper på 1× som før.",
"Kom i gang"
],
[
"Falne og døde",
"Faller en i et av lagene dine (også Leirvakta), står det én linje i loggen, og personen er borte fra Folk med en gang – folketallet øverst går ned. De døde står i Samfunn-panelet til dere tar farvel (begravelse). Folk som går inn i en tropp, er ikke borte: de står i troppen og kommer tilbake til Folk når troppen oppløses ved leiren.",
"Leiren"
],
[
"Hva materialene koster",
"Bygger du noe du ikke har materialer til, kjøpes det som mangler (rundet opp til en tidel). Tallet i byggemenyen, i banneret og i loggen er det samme, og det er det du betaler. Prisene på markedet endrer seg en gang i døgnet.",
"Leiren"
],
[
"Hva prisen på et bygg betaler",
"Prisen på et bygg («utstyr og deler») kjøper utstyret og de ferdige delene – aggregatet, lyskasteren, vinduer og beslag. Arbeidet gjør byggelagene dine uten lønn; det koster bare tid. Materialene (tre, betong, stål) kommer i tillegg hvis du ikke har dem.",
"Leiren"
],
[
"Loggen og «Velkommen tilbake»",
"De siste 100 meldingene lagres med spillet. Når du åpner spillet igjen, viser «Velkommen tilbake» det viktigste fra sist du spilte. Spillet står stille mens det er lukket. «Hele loggen» (trykk «les alt» under meldingene, eller Leir → Mål) viser alle meldingene med dag og klokkeslett.",
"Kom i gang"
],
[
"Lagres ordren?",
"Ja. En ordre, et valg på et kort eller i morgenmøtet lagres med en gang, og klokka går aldri tilbake når du åpner spillet igjen.",
"Kom i gang"
],
[
"Byggelag og + i Folk",
"To på Bygg er ett byggelag. Er det et oddetall, har ett lag bare én person, og det går halvt så fort. Trykker du + på en oppgave og ingen har fri, tas en fra oppgaven med flest folk – panelet sier hvem som ble flyttet og hvorfra.",
"Leiren"
],
[
"Velkommen tilbake",
"Når du åpner et lagret spill, kommer først en liten boks med det viktigste fra sist du spilte (tettsteder, tap, angrep og valg), eldste først. Spillet står på pause så lenge den vises. Kort og morgenmøtet venter til du har trykket «Fortsett» – det står aldri to vinduer oppå hverandre. Har ingen tid gått siden sist, kommer ingen boks. Et kort du ikke har svart på, kommer igjen etter omlasting med de samme valgene; spillet velger aldri for deg.",
"Kom i gang"
],
[
"Hva «utstyr og deler» er",
"Prisen på et bygg kjøper utstyret og de ferdige delene – for et vakttårn lyskaster, radio, våpenfeste og stålfester, for en brakke senger, ovn, vinduer og dører. Byggemenyen sier hva det er for hvert bygg. Arbeidet gjør byggelagene dine uten lønn.",
"Leiren"
],
[
"Sjøen og båter",
"Kaiene vises som ankermerker i kartet. Trykk på en kai innen 3 km fra leiren, eller i et tettsted du holder, og kjøp en båt: småbåt (rask, ett lag), sjark (fisker, litt last) eller lekter (tre lag og mye last, trenger en middels kai). Velg båten, trykk «Seil til en kai» og så på kaia. Båten finner selv leia over sjøen og går aldri over land. Alt samles i panelet «Sjø» (knappen nederst, eller «Sjøen» i Leir-menyen under Lager).",
"Lag og strid"
],
[
"Lag om bord og landgang",
"Står et lag innen 250 m fra en båt som ligger stille, kan det gå om bord («Om bord i …» i lagpanelet). Laget følger båten, og går i land når båten ligger ved en kai. Går dere i land ved et tettsted fienden holder, er fienden overrasket i 30 minutter: dere treffer bedre, og de treffer dårligere.",
"Lag og strid"
],
[
"Havner og varer sjøvegen",
"Regionen frakter det tettstedene dine gir, over land til leiren. Holder du et tettsted med en stor kai eller havn, og vegen derfra er truet eller stengt av fienden, legges det som ikke kommer fram, på kaia. Hent det med en båt («Last om bord») og loss ved en kai innen 3 km fra leiren. Du får aldri de samme varene to ganger.",
"Leiren"
],
[
"Fiske",
"En båt kan settes til å fiske («Fisk her»): en sjark gir omtrent 36 rasjoner i døgnet, en småbåt 10. Har leiren en kai innen 3 km, kan også folk som står på «fri», fiske fra kaia – velg hvor mange under «Fiske fra kaia» i sjøpanelet (2–3 rasjoner per person i døgnet). Ingen fangst i storm.",
"Leiren"
],
[
"Sperr et sund",
"En båt som ligger stille på sjøen, kan legge miner (300 m rundt båten) eller senkes som vrak. Ingen båter kommer forbi – heller ikke dine egne. Fiendens havnebyer får forsyninger med båt annethvert døgn: stenger du leia inn, er garnisonen avskåret og treffer dårligere. Brede fjorder trenger flere minefelt ved siden av hverandre.",
"Lag og strid"
],
[
"Ta en ferje",
"Ved en ferjekai kan et lag som står innen 400 m, ta ferja («Ta ferja» når du trykker på kaia). Ferja tar fire lag og mest last av alle båter, men kan bare legge til ved store kaier.",
"Lag og strid"
],
[
"Kjøretøy på lekter og ferje",
"En lekter tar to kjøretøy og en ferje seks. Kjør kjøretøyet bort til båten mens den ligger ved kai, velg båten og trykk «Kjør om bord». Lag som sitter i kjøretøyet, følger med. Ved neste kai: «Kjør i land».",
"Lag og strid"
],
[
"Bord eller senk fiendens båter",
"Fiendens forsyningsbåter (og båter med soldater) kan stoppes på tre måter: miner og vrak som før, ild – et lag innen 450 m som ser båten, skyter på den til den synker – eller bording: velg en egen båt med et lag om bord og trykk «Bord den» under «Fiendens forsyningsbåter». Båten jager forsyningsbåten, og når den er innen 60 m, tas lasten. Garnisonen som skulle hatt forsyningene, er avskåret og treffer dårligere. Fiendens båter skyter tilbake – på båtene dine og på lag som står nær vannet. Dine båter har også helse: en skadet båt repareres ved en kai nær leiren, og synker den, svømmer laget i land og mister noen.",
"Lag og strid"
],
[
"Fienden bruker sjøen",
"Fiendens lag kan også ta båt: står de ved en kai og skal til et sted der sjøvegen er mye kortere enn vegen, går de om bord i en sjark og går i land ved kaia nær målet. Senk båten underveis, så mister de halvparten av mennene.",
"Lag og strid"
],
[
"Kaier i 3D og ved oppstart",
"I 3D kan du trykke på en egen båt eller nær en kai for å åpne sjøpanelet, og gi båten et mål på samme måte som i kartet. Når du velger leirplass ved oppstart, sier startskjermen hvor nærmeste kai er og hvor stor den er – det avgjør hvilke båter leiren kan få. Tar du en ferje, går ikke ruteferja der lenger.",
"I 3D"
],
[
"Is på innsjøene",
"Etter lang kulde legger isen seg på innsjøene. Da kommer ingen båter gjennom der – heller ikke fiendens. Båten finner en annen lei, eller sier at isen stenger. Sjøen fryser aldri.",
"Vær, lyd og bilde"
],
[
"Sjøpanelet på telefon",
"På telefon er sjøpanelet et lavt ark nederst med det viktigste på én rad. Trykk «Mer» for alt.",
"Kom i gang"
],
[
"Spol til neste hendelse",
"Knappen ⏭ ved fartsknappene lar tiden gå fort (600×) til noe skjer som krever deg: et lag du sendte er framme, et bygg er ferdig, fienden er nær leiren eller lagene dine, leiren angripes, det blir ny dag, noe venter på svaret ditt (flyktninger, hendelser), brann nær leiren, en fiende gir seg eller en båt er framme. Da går farten ned til 1×, og et kort øverst sier hva den stoppet for. Trykk ⏭ igjen for å spole videre. Småting – mat og drikke, været, et nådd mål, flom og ras langt unna, toget som kommer – står bare i meldingene. Står et kort og venter på svar, må du svare før du kan spole.",
"Kom i gang"
],
[
"Marsjtid før du gir ordren",
"Trykk «Marsjer» og pek i kartet (PC): ved pekeren står avstanden og hvor lang tid marsjen tar. På telefon og i 3D trykker du først der laget skal: da står avstand og tid i et banner øverst, og «Gå» gir ordren (et nytt trykk flytter målet, «Avbryt» lar være). Korte marsjer regnes ut nøyaktig langs ruta, lange er et anslag («ca.»).",
"Lag og strid"
],
[
"Køordre: gå hit, så dit",
"Når et lag er på marsj, legger «Legg til (så dit)» i lagpanelet et punkt til i køen (på PC også Shift + trykk i kartet). Laget går punktene etter tur – høyst åtte. «… og grav ned» får laget til å grave seg ned når det er framme ved det siste. «Stopp» eller en ny vanlig marsjordre tømmer køen.",
"Lag og strid"
],
[
"Flere lag på én gang",
"«Velg lag» nederst (PC) eller «Velg alle i bildet» i lagpanelet velger alle lagene dine som er i bildet. På PC kan du også holde Shift og dra en ramme, eller Shift + trykke på lag for å ta dem med eller ut. «Marsjer alle» gir alle samme mål – de stiller seg i ring rundt det. Esc eller «Opphev» slipper gruppa.",
"Lag og strid"
],
[
"Start uten ferdige lag",
"Et nytt spill begynner med deg, ti personer, noen kjøretøy og et lite vaktlag på fire. Troppene lager du selv: Leir → Tropper → «Lag ny tropp». Du får litt ekstra mat i starten.",
"Kom i gang"
],
[
"Vanskelighetsgrad, scenario og utfordringer",
"På siste steg i «Nytt spill» velger du Lett, Vanlig eller Hard (startkassa, hvor godt fienden treffer, hvor mange røverlag som kommer), et scenario med mål og tidsfrist (for eksempel «Hold byen» i tre døgn) eller fritt spill, og utfordringer som endrer reglene: ingen kjøp (heller ikke på svartebørsen), evig vinter, ingen radio (ingen ordre over 3 km fra leiren og ingen radiomeldinger), tåkeland, tom kasse. Stillingen i scenariet står under Leir → Mål.",
"Kom i gang"
],
[
"Når du vinner regionen",
"Holder du 60 % av folket i området, har du vunnet. Da velger du: en større region (flere tettsteder lenger unna – du må vinne på nytt), en sterkere motstander (fienden treffer bedre), eller å fortsette som nå. Etter de fire første kapitlene med mål kommer kapittelet «Krigen om regionen».",
"Lag og strid"
],
[
"Hvis leiren faller",
"De to første døgnene kan ikke leiren tapes. Etter det: står en fiende inne i leiren i halvannen time uten at noen av dine lag er der, er leiren tapt. Da begynner dere på nytt i en utpost – i det nærmeste tettstedet du holder, ellers fire kilometer unna – med halve kassa, halve lageret og de fleste folkene. Byggene er borte, lagene står der de sto. Du får et varsel når fienden står i leiren.",
"Leiren"
],
[
"Krigen på nytt",
"Spillet tar et bilde av krigen hver tredje spilltime: hvem som holder tettstedene, og hvor lagene sto. Leir → Mål → «Se krigen på nytt» lar deg spole gjennom dem. Fiendens lag vises bare der dere så dem.",
"Lag og strid"
],
[
"Ukas oppdrag",
"Hver uke har ett oppdrag som er likt for alle som spiller (Leir → Mål). Start det når du vil. Det finnes ingen felles resultatliste, for spillet har ingen tjener – men du kan kopiere resultatet som en kode og sammenligne med kodene til venner.",
"Kom i gang"
],
[
"Venner i samme område",
"Lenka under Leir → Mål → Venner har nå også med hvilke tettsteder du holder og hvor stor del av området du har. Vennens leir, tettsteder (stiplet ring i vennens farge) og stilling vises i kartet og i krigskartet ditt. Det er ikke sanntid: dere spiller hver for dere, og bildet er fra da lenka ble laget.",
"Lag og strid"
],
[
"Lag karakteren din",
"Steg 1 på startskjermen: skriv navnet, og velg utseendet i fanene Ansikt, Øyne, Hår og Klær. Velger du «Kvinne» eller «Mann», får portrettet en frisyre som passer og (for kvinner) ikke skjegg – det du selv velger etterpå, blir stående. «Tilfeldig utseende» lager et nytt portrett. Portrettet står fast mens du blar. Bakgrunnen nederst gir en liten bonus.",
"Kom i gang"
],
[
"Startskjermen husker hvor du var",
"Laster du siden på nytt mens du lager karakteren, fraksjonen eller velger spillform, fortsetter du på samme steg med alt du hadde valgt. Utkastet slettes når leiren er lagt.",
"Kom i gang"
],
[
"Velg plass til leiren",
"Trykk på kartet der leiren skal ligge. Banneret sier høyden og advarer om det som gjør stedet vanskelig: høyfjell over tregrensen (kaldt, ingen skog å hogge), ingen veg i nærheten (lastebilene kommer ikke fram) og langt til nærmeste tettsted (få hus å lete i). Ligger det sjø i nærheten, står det hvor nærmeste kai er – en kai innen 3 km gir leiren båter, fiske og varer sjøveien. Du starter med ti personer og et lite vaktlag; ingen andre lag står på kartet før leiren er lagt.",
"Kom i gang"
],
[
"Ett lagret spill per kart",
"Spillet lagres i nettleseren, for seg for hvert kart: Rogaland (/rogaland) har sitt eget spill, og Dovre og hele Norge deler ett. Startskjermen sier fra når du har et spill lagret på et annet kart – det blir ikke rørt.",
"Kom i gang"
],
[
"Flat plass til leiren",
"Når du trykker der leiren skal ligge, sjekker spillet om det er flatt nok for de første byggene (brakke, dieseltank, aggregat og vakttårn) innen 80 m fra flagget. Er det for bratt eller vått, står det i rødt, og et grønt flagg «Plass her» viser nærmeste sted som går. Trykk «Flytt hit», så prøves det stedet. En dalbunn eller et platå er tryggest.",
"Kom i gang"
],
[
"Hvor er det flatt?",
"Mens du plasserer et bygg (og mens du velger leirplass) farges bakken rundt for akkurat det bygget du holder: grønt = flatt, gult = skrått (bygget får grunnmur), rødt med striper = for bratt, blått = vann. Tynne streker er høydekurver hver 2 m. Zoom inn for å se fargene. Roterer du bygget, regnes fargene på nytt.",
"Leiren"
],
[
"Grunnmur i skråning",
"Et bygg kan stå i en skråning med opptil 8 m høydeforskjell under seg (store bygg litt mer). Det står da på en grunnmur. Banneret sier hvor høy grunnmuren blir («skrå grunn: 5 m grunnmur»). Er det brattere, sier skissen «For bratt her», og banneret foreslår «Drei 90°» eller «Flytt skissen …» til nærmeste sted som går. Et ferdig hus fra byggesettet står på én felles grunnmur og sjekkes som helhet.",
"Leiren"
],
[
"Hva kostet bygget?",
"Mangler du materialer, kjøper «Kjøp materialene og bygg» det som mangler. Prisen på knappen er arbeid og materialer til sammen, og loggen sier det samme: «Brakke bestilt: 5 mill. kr i alt (arbeid 4 mill. kr + materialer …)».",
"Leiren"
],
[
"Tallene øverst",
"Øverst står klokka, været og kassa, og så det leiren har: Diesel (liter, eller «ingen tank»), Tre og Betong (m³), Stål (t), Strøm (kW), Folk, Mål og Kontroll (din andel av folket i området). Hver flis har et kort ord foran tallet og enheten bak. Det som ikke får plass, står bak flisa «+3 tall» (tallet sier hvor mange tall som er gjemt) – trykk der for resten. Før leiren er lagt, står bare klokka og været der. Et trykk på en flis som åpner noe (Folk, kassa, lageret, «+3 tall»), åpner panelet uten forklaring oppå. Pek (PC) eller trykk lenge (telefon) på en flis for å se hva tallet betyr og hva som påvirker det.",
"Kom i gang"
],
[
"Knappene nederst",
"Leir, Folk, Tropper, Krig og Deg står nederst – på telefon også under angrep, med et kort oppe og når telefonen ligger. «Mer» åpner resten (Region, Verden, Sjø …) – det er det eneste stedet ordet «Mer» brukes. Panelene du åpner herfra, åpnes alltid til venstre og ett om gangen; det som hører til et panel (Stridsregler, Tiltak, Sekken) åpnes til høyre ved siden av.",
"Kom i gang"
],
[
"Meldingene",
"Meldingene øverst til høyre har et ikon og er kortet ned til to linjer. Røde er varsler. Trykk på «les alt» under dem for å lese hele teksten (på telefon: trykk på meldingen). Samme melding flere ganger står bare én gang, med «×4» bak. Rutinemeldinger (hogstlaget, din egen mat og drikke, ammunisjon hjemme) kommer høyst noen ganger i døgnet, været bare ved store skifter (tåke, snø, storm – og når det er over), og tips som «Vil du velge stedet selv …» bare første gang.",
"Kom i gang"
],
[
"Merkene i kartet",
"Formen sier hvem: egne er liggende rektangler, fiender er ruter som står på spissen, nøytrale ting er kvadrater. Tegnet inni sier hva: kryss = lag, egne tegn for lastebil, stridsvogn, rakettartilleri, radarbil og speiderbil, ring = tettsted, anker = kai. Fargen sier hvilken side. En stiplet rute er der en fiende sist ble sett. Knappen med tre rader nederst blant zoomknappene viser hele tegnforklaringen.",
"Lag og strid"
],
[
"Bruer, tunneler og kraftverk i kartet",
"Kartet viser bare dem som betyr noe for det du gjør: de store, de som ligger nær laget du har valgt eller nær leiren, og alle når du er helt nær. Vil du se alle, velg «Kartmerker: alle» i ☰.",
"Lag og strid"
],
[
"Oversikten når du er zoomet inn",
"Zoomer du langt inn i kartet på PC, kommer en rund oversikt nede til høyre med leiren, lagene dine og fiender du ser. Rammen viser hva skjermen dekker. Trykk i den for å flytte kartet.",
"Vær, lyd og bilde"
],
[
"Byggemenyen",
"Byggene står som kort med en tegning, pris, byggetid og strøm. Pek på et kort for materialer og hva bygget gjør.",
"Leiren"
],
[
"Paneler og plasser",
"Alt du åpner fra knappene nederst (Leir, Folk, Tropper, Krig, Deg, og Region, Verden og Sjø under «Mer»), står til venstre – åpner du et nytt, lukkes det som sto der. Stridsregler, Tiltak, Sekken og tegnforklaringen står til høyre. Kort som venter på svar står i midten. Det du åpnet sist, ligger alltid øverst, og et trykk i et panel henter det fram.",
"Kom i gang"
],
[
"Delene i Leir-menyen",
"Trykk på en overskrift i Leir-menyen for å legge delen sammen eller åpne den. Spillet husker valget. De lange delene er lagt sammen fra start.",
"Leiren"
],
[
"Tegnforklaring",
"Knappen med tre små rader nederst blant zoomknappene (i 2D) viser hva merkene, fargene og strekene i kartet betyr: egne, fiender og nøytrale, lag, kjøretøy, tettsteder, kaier, marsjruter, fronter, «sist sett» og siktfeltet.",
"Lag og strid"
],
[
"Paneler",
"Det står ett panel til venstre og ett til høyre. Åpner du et nytt på samme side, lukkes det gamle – også lagpanelet nede til venstre når du åpner Leir, Folk eller Samfunn (og omvendt når du velger et lag). Målestokken flytter seg til høyre for panelet, og oversikten nede til høyre viker for panelene til høyre.",
"Kom i gang"
],
[
"Byggelista",
"På PC står byggene i fanen Bygg som små ruter med ikon, navn og pris – trykk på ruta for å bygge. Pek på en rute for materialer og hva bygget gjør. Trykker du på et bygg i leiren, viser panelet en tegning av det.",
"Leiren"
],
[
"Flere lag i 3D",
"Shift + dra med musa i 3D (og i 2D) tegner en ramme rundt lagene du vil velge. Shift + trykk på et lag tar det med eller ut. «Velg lag» i kommandolinja velger alle lagene på skjermen. Høyre museknapp dreier kameraet. Når du velger mål, står marsjtida ved pekeren før du gir ordren.",
"Lag og strid"
],
[
"Spillet står på pause til du svarer",
"Når et kort venter på svar – en hendelse i leiren, et spørsmål fra folket eller et kort om krigen – settes spillet på pause, og under kortet står «Spillet står på pause til du svarer». Når du har svart, går spillet videre i farten du hadde. Hadde du satt spillet på pause selv, blir det stående. Røverangrepet kommer aldri bak et kort: banneret øverst ligger over kortene, og kortet flyttes ned under banneret. Trykker du ⏭ eller en fart mens kortet står, blir spillet stående på pause (lappen blinker), og farten du valgte, gjelder når du har svart. Mens leiren angripes, venter hendelseskortene og spørsmålene fra folket til angrepet er over, og «⏭ Stoppet …» er en liten linje under banneret.",
"Kom i gang"
],
[
"Hvilket vindu ligger øverst",
"Et kort som venter på svaret ditt (morgenmøtet, en hendelse, et spørsmål fra folket) ligger alltid øverst, og spillet står på pause til du svarer. Trykker du på et varsel mens kortet står, blinker kortet i stedet for at et panel legger seg over det. Panelene du åpner selv, ligger over varslene og angrepsbanneret – det du åpnet sist, ligger øverst.",
"Kom i gang"
],
[
"Leir-menyen",
"Leir-menyen åpnes alltid øverst, i fanen du brukte sist, så et trykk treffer det samme bygget hver gang. Fanene Bygg, Lager, Plan og Mål står fast øverst når du ruller nedover.",
"Leiren"
],
[
"Hjelpen",
"Hjelpen (?) er delt i grupper – Kom i gang, Skjermen og knappene, Leiren og bygging, Angrep og forsvar, Folk og samfunn, Mat, penger og handel, Lag og strid, Krigen og regionen, Sjøen, I 3D og Vær, lyd og bilde. Trykk på en gruppe for å åpne den, eller skriv i søkefeltet øverst.",
"Kom i gang"
],
[
"Telefonen liggende",
"Spillet er laget for å spilles med telefonen liggende. Opplæringen står som én tynn linje nede til venstre – trykk på den (eller +) for å lese hele steget, og – for å legge den sammen igjen. Når Leir, Folk eller Deg er åpen, går panelet fra toppen helt ned, og knappene nederst blir en smal rad med ikoner ved siden av. Når du plasserer et bygg, står valgene på én rad – hvert ikon med et ord under: ⟲ Snu, ⟳ Snu, ▦ Rutenett, ⇤ Inntil, + Fortsett – og kjøpeknappen; trykk på teksten for alle detaljene. Er det flere varsler, står bare det viktigste og en brikke «+3 varsler» som folder ut resten. To fingre zoomer bare kartet, ikke hele siden.",
"Kom i gang"
],
[
"Knappene når du går (telefon)",
"Når du går, står bare Gå, Deg, ☰, pause og farten øverst – resten ligger bak ⋯. Helse og våpen står små ved styrespaken, «Gå inn»/«Gå ut» nede til høyre over Huk og Hopp, og kildene til kartet står nederst i ☰ i stedet for på skjermen.",
"I 3D"
],
[
"Varseltrekanten på Folk",
"Står det ⚠ ved Folk øverst, mangler noe i leiren. Pek på flisa (PC) eller trykk lenge (telefon), så står årsaken under «Nå», for eksempel «ingen seng: 10 sover i telt – bygg en brakke» eller «maten rekker bare 5 timer». Et vanlig trykk åpner Folk.",
"Leiren"
],
[
"Knappene når du bygger",
"Når du plasserer et bygg, har hvert ikon et ord under seg (liggende telefon) eller ved siden av (PC): «Snu ⟲» og «Snu ⟳» dreier bygget 15°, ▦ Rutenett legger det på rutenettet, ⇤ Inntil legger det inntil naboen, + Fortsett lar deg sette ut flere av samme slag etter hverandre, ✕ Avbryt. Et lyst ikon er slått på.",
"Leiren"
],
[
"Til leiren og hele kartet",
"Nede til høyre: ⌂ tar kartet hjem til leiren, med flagget midt på skjermen. Knappen med fire piler ut viser hele kartet. Før du har lagt leiren, går ◎ til Dombås.",
"Kom i gang"
],
[
"Kartet mens det lastes",
"Når du zoomer eller åpner spillet, kommer kartet først uskarpt for hele skjermen, og så blir det skarpt bit for bit. De skarpe bitene tones inn og glir mykt over i de uskarpe, så du ser ikke rette kanter. Venter du et par sekunder, er alt skarpt.",
"Vær, lyd og bilde"
],
[
"3D i regn og tåke",
"Ovenfra blir landskapet disig i regn og tåke, mest langt unna – men det du ser på, synes fortsatt. Nede på bakken ser du kortere i dårlig vær.",
"I 3D"
],
[
"Skogen når du går",
"Trykker du Gå, bygges et mer detaljert område rundt deg. Mens det skjer, står trærne rundt deg allerede – de samme som i 2D-kartet.",
"I 3D"
],
[
"Verden rundt dere",
"Trykk «Verden» nederst (eller på værflisa øverst, eller «Vær og verden» i Leir-menyen under Mål). Der står det hva været og årstiden gjør akkurat nå – føre, is, brannfare og flomfare – og du finner åkeren, jakta, funnene, radioen og toget.",
"Vær, lyd og bilde"
],
[
"Vinter som biter",
"Snø gjør marsjen 30 % tregere, snøvær enda mer, og mens det snør (og noen timer etter, til vegen er brøytet) er vegene over fjellet stengt: kolonner kjører om, eller blir stående og får beskjed hvis det ikke finnes noen omkjøring. Kulda biter på fiendens lag også. Etter lang kulde legger isen seg på innsjøene – først stenger den båtene, så bærer den, og lagene kan gå rett over vann og elver. Lag som står ute i sprengkulde, får frostskader – få dem til leiren eller inn i et tettsted.",
"Vær, lyd og bilde"
],
[
"Flom og ras",
"Etter mye regn kan elver gå over sine bredder og bratte lier rase ut. Flommen følger dalen nedover fra elva og vises som blått vann i kartet og i 3D. Det er tungt å gå gjennom, og vegene der er stengt til vannet har trukket seg tilbake. Et ingeniørlag kan rydde et ras på noen timer.",
"Vær, lyd og bilde"
],
[
"Brann",
"I tørt vær kan skog og mark brenne. Brannen går med vinden og slokner i regn. Du kan tenne på selv med «Tenn på her» i lagpanelet – for eksempel for å stenge en dal for fienden. Lag som står i brannen blir skadet, og leiren kan brenne. Brent mark vises mørk i kartet.",
"Vær, lyd og bilde"
],
[
"Jakt",
"Det er rein i høyfjellet og elg i skogen. Velg et lag som står i ro der, og trykk «Jakt på …»: etter seks timer kommer de hjem med kjøtt. Går du selv i 3D og skyter et dyr, får leiren kjøttet. Samme område må hvile noen døgn mellom hver jakt.",
"Leiren"
],
[
"Åker",
"En åker er et bygg i leiren: trykk «Anlegg en åker» i «Verden» (eller velg Åker under Annet i byggelista) og legg den der det er flatt og åpent – et byggelag rydder og pløyer den. Så om våren, så høstes kornet av seg selv når det blir høst – mye mat på én gang. I 3D ser du radene vokse fra grønt til gult. Åkeren trenger folk på «fri», og modent korn brenner lett: en brann i åkeren tar avlinga.",
"Leiren"
],
[
"Funn i terrenget",
"Rundt i terrenget ligger bilvrak, gjemte depoter, forlatte leirer og flyvrak. Lagene melder fra når de ser noe, og stedet får et gult merke i kartet. Send et lag helt bort og trykk «Undersøk» – det kan gi materialer, mat, diesel eller penger. Noen er tomme, og en forlatt leir kan være en felle. Funnene ligger aldri midt i et tettsted eller i vannet, og i 3D ser du kasser, tønner, sekker, telt eller vraket der de ligger.",
"Lag og strid"
],
[
"Radio",
"Med en radiomast eller et kontrollrom hører dere meldinger fra regionen noen ganger i døgnet: vegmeldinger, varsler og rykter om hvor det ligger noe. Ikke alt som sendes, er sant.",
"Leiren"
],
[
"Tog",
"Holder du to tettsteder som jernbanen går gjennom, kan du sette banen mellom dem i stand i «Verden». Da kommer det et tog hvert døgn med mye tre, betong, stål, diesel og mat – så lenge du holder begge stasjonene.",
"Leiren"
],
[
"Kratere og spor",
"Miner, rakettsalver og sprengte kjøretøy etterlater kratere, og kjøretøy i terrenget lager hjulspor. Kraterne og de ferskeste sporene blir liggende også etter at du har lastet spillet på nytt.",
"I 3D"
],
[
"Dyr du har felt",
"Et dyr du har skutt selv, kommer ikke tilbake når du går videre eller laster spillet på nytt.",
"I 3D"
]
];
