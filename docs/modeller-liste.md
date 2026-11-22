# 3D-modeller som trengs (22. nov 2026)

Brukeren: «kan du ikke lage en liste på typ 200 modeller som trengs». Lista er Claudes forslag. Den deles mellom:
- **L** = økta på brukerens egen PC (leirbygg og ting i leiren; gren `claude/lokal-modeller`, filene `spill/modeller.js` og
  modellfunksjonene i `spill/leir-visning.js`, nye modeller i en ny fil `spill/modeller-leir2.js`), og
- **S** = skymaskinene (kjøretøy, våpen, figurer og verden; kommer i runde R18 og senere).

★ = viktigst først. **Finnes** = modellen er der i dag og skal bli bedre. **Ny** = finnes ikke.

## Felles regler for alle modellene
- Ekte mål i meter. Samme origo og retning som i dag (fronten mot +x), så dører, interiør og hindringer fortsatt stemmer.
- Én `BufferGeometry` med hjørnefarger (som `MODELLER.brakke()`), ingen nye teksturfiler. Flere like ting = InstancedMesh.
- Trekanter, høyst: leirbygg 3000 (store 5000), små ting 300, kjøretøy 6000, figurer 1500, våpen i hånda 2500.
- Detaljnivå (LOD): en enklere utgave lenger enn ca. 150 m unna for alt over 1000 trekanter.
- Stil: 2020-tallets private militærselskap (moderne, nøkternt, grått/oliven/sand, selskapets farge som detalj), ikke 1980-tallet.
  Ingen navn, merker eller design fra virkelige firma eller spill (Wardogs er bare inspirasjon).
- Mål bildefarten før og etter med ☰ → «Mål ytelse» i 3D ved leiren.

## A. Leirbygg som finnes – gjøres bedre (L) · 28
1. ★ Kontrollrom (hovedhus) – antenner på taket, ventilasjon, trapp, skilt med selskapsmerket
2. ★ Brakke – modulbrakke med vinduer, trapp, aircondition-enhet, nivå 1–3 synlig ulike
3. ★ Vakttårn – stål/tre, takoverbygg, lyskaster, sandsekker øverst, stige
4. ★ Port med vaktbu – bom, sluse, lys, skilt «Stopp – vis ID»
5. ★ Aggregat – containergenerator med eksosrør, tankluke, kabler
6. ★ Dieseltank – dobbeltvegget tank med pumpe, slange og oppsamlingskar
7. ★ Solcellepaneler – rader på stativ med kabelkasse og inverter
8. ★ Batteribank – container med vifter og varselskilt
9. ★ Kameramast nivå 1 – enkel stang med bevegelsessensor-kamera
10. ★ Kameramast nivå 2 – høyere mast med to kameraer og koblingsboks
11. ★ Kameramast nivå 3 – «smart» kuppelkamera med IR-lys
12. ★ Radiomast nivå 1 – enkel antenne med barduner
13. ★ Radiomast nivå 2 – gittermast med flere antenner
14. ★ Radiomast nivå 3 – høy gittermast, parabol og flyvarsellys
15. ★ Sykestue – feltsykehustelt/brakke med rødt kors, båre ved døra
16. ★ Verksted – hall med port, arbeidslys, verktøy ute
17. Lagertelt – buetelt med paller og presenning
18. Container – 20 fot med dører, låsestenger og nummer
19. Drivhus – plast over buer, plantebed, vannrør
20. Helikopterplass – plattform med H, lys i kanten og vindpølse
21. Sandsekkvoll – ujevne sekker, skyteskår
22. Gjerde – stolper med netting og piggtråd i toppen
23. Kjøkken – feltkjøkkencontainer med pipe og luke
24. Brønn – pumpehus/brønnring med veiv
25. Flaggstang – flagg med selskapets merke
26. Vegsperring – betongklosser og bom
27. Skytebane – skiver, voll, skytestillinger
28. Hinderløype – vegg, nett, bjelker, dekk

## B. Nye leirbygg (L) · 46
29. ★ Kommandosenter (stor modulbygning med møterom og skjermvegger)
30. ★ Dronehangar (lett hall med stor port)
31. ★ Oppskytingsrampe for droner
32. ★ Satellittterminal (flat terminal på stativ) og parabol
33. ★ Radartårn
34. ★ Ammunisjonsbunker (jordvoll over betong, tung dør)
35. ★ Våpenlager (container med gitter og alarm)
36. ★ Spisebrakke/messe
37. Offisersbrakke (mindre, bedre)
38. Dusj- og vaskebrakke
39. Toalettcontainer
40. Vaskeri
41. Treningstelt/gymtelt
42. Arrest/celle
43. Garasje/kjøretøyhall (to porter)
44. Verkstedhall for tunge kjøretøy (høy port, kran)
45. Vaskeplass for kjøretøy (høytrykk, slange, rist)
46. Fyllestasjon for drivstoff (tank, pumpe, tak)
47. Vanntank og vannrenseanlegg
48. Avfallsplass med forbrenningsovn
49. Stort feltsykehus (flere telt koblet sammen)
50. Medevac-plass (merket flate med lys)
51. Observasjonspost (OP) med kamuflasjenett
52. Betongbunker (lav, skyteskår)
53. Skyttergrav, rett del
54. Skyttergrav, hjørne og ende
55. Jordfylte kurver (barrierer i stålnett og duk)
56. T-vegger i betong (høye barrierer)
57. Piggtrådrull (concertina)
58. Kryss mot kjøretøy (stålbjelker)
59. Sluse/bom med kontrollbu (for kjøretøy)
60. Lysmast (mobil, fire lamper)
61. Høyttaler-/sirenemast
62. Generatorhus (fast)
63. Transformator med gjerde
64. Varmepumpe-/klimaenheter (til brakkene)
65. Kontorcontainer
66. Møtetelt/orienteringstelt med kartbord
67. Lagerhall med reoler
68. Kjølecontainer (mat)
69. Hundegård med hundehus
70. Parkeringsplass med oppmerking
71. Skilt: inngang, fareskilt, fartsgrense, selskapets skilt
72. Flaggrekke med selskapets flagg
73. Porttårn (to tårn over porten)
74. Bålplass/samlingsplass

## C. Ting i leiren (L) · 40
75. ★ Paller (tomme, stablet)
76. ★ Ammunisjonskasser
77. ★ Medisinkasser
78. ★ Matkasser/feltrasjoner
79. ★ Oljefat (stående, liggende, stablet)
80. Gassflasker i stativ
81. Jerrykanner
82. Sandsekkstabler
83. Kamuflasjenett på stolper
84. Presenning over last
85. Tømmerstabel
86. Verktøytavle
87. Arbeidsbenk ute
88. Liten bærbar generator
89. Lyskaster på stativ
90. Feltbord og klappstoler
91. Grill/feltkokeapparat
92. IBC-vanntank (1000 l)
93. Søppelcontainer
94. Lite telt (2-manns)
95. Kamuflasjetelt
96. Liten antenne på stativ
97. Bærbart solcellepanel
98. Stige
99. Stillas
100. Mobilkran
101. Betongblander
102. Parkert anleggsmaskin (gravemaskin)
103. Kabeltrommel og kabler
104. Rør og rørstabel
105. Strømskap
106. Lysstolpe
107. Skiltstolpe
108. Trafikkjegler
109. Sperrebånd
110. Førstehjelpsskap
111. Brannslukker og brannstasjon
112. Radiostasjon (bordmodell)
113. Kartbord med kart
114. Våpenstativ

## D. Kjøretøy (S) · 30
115. ★ Feltbil (finnes – bedre)
116. ★ Lastebil med kalesje (finnes – bedre)
117. ★ Speiderbil (finnes – bedre)
118. ★ Stridsvogn (finnes – bedre)
119. ★ Rakettartilleri (finnes – bedre)
120. ★ Radarbil (finnes – bedre)
121. ★ Helikopter (finnes – bedre, med kabin innvendig)
122. ★ Pansret personellkjøretøy på hjul
123. ★ Pickup med tung mitraljøse
124. Pansret ambulanse
125. Tankbil (drivstoff)
126. Bergingsbil
127. Bulldoser/ingeniørkjøretøy
128. Brolegger
129. ATV/firehjuling
130. Snøscooter med slede
131. Beltevogn for snø (to ledd)
132. Motorsykkel
133. Transportfly (på bakken)
134. Lett fly
135. Stor drone (fly)
136. Liten quadkopter-drone
137. RIB-båt
138. Patruljebåt
139. Landgangsfartøy
140. Lekter
141. Sivile biler (finnes – flere typer: stasjonsvogn, varebil, SUV)
142. Buss
143. Traktor med henger
144. Tømmerbil

## E. Våpen og utstyr (S) · 26
145. ★ Pistol (finnes – bedre)
146. ★ Maskinpistol (finnes – bedre)
147. ★ Gevær (finnes – bedre)
148. ★ Hagle (finnes – bedre)
149. ★ Presisjonsrifle (finnes – bedre)
150. ★ Maskingevær (lett)
151. ★ Håndgranat
152. Granatkaster
153. Panservernvåpen (rør)
154. Morter
155. Tung mitraljøse på stativ
156. Kikkert
157. Nattsiktbriller
158. Bærbar radio
159. Dronekontroller
160. Førstehjelpsveske
161. Sekk
162. Skuddsikker vest
163. Hjelm (med og uten nattsiktfeste)
164. Spade
165. Øks
166. Motorsag
167. Landmine
168. Sprengladning
169. Feltflaske
170. Kniv

## F. Figurer (S) · 16
171. ★ Soldat, lett utrustning (sidens farge)
172. ★ Soldat, tung utrustning
173. Sanitetssoldat
174. Ingeniør
175. Skarpskytter med kamuflasjedrakt
176. Sivil mann
177. Sivil kvinne
178. Barn
179. Eldre
180. Arbeider: snekker
181. Arbeider: kokk
182. Arbeider: mekaniker
183. Røver (lett bevæpnet, sivile klær)
184. Hund
185. Figur sittende/liggende/såret (stillinger)
186. Fange (hendene bundet)

## G. Verden (S) · 26
187. ★ Utbrent bil
188. ★ Ødelagt stridsvogn
189. ★ Ruiner av hus (tre varianter)
190. ★ Krater etter eksplosjon
191. Nedfalt brudel
192. Sivil veisperring (biler på tvers, dekk)
193. Bensinstasjon (finnes – bedre, to typer)
194. Sykehus (finnes – bedre)
195. Skole (finnes – bedre)
196. Fabrikk
197. Sagbruk
198. Smelteverk
199. Oljeterminal/raffineri
200. Tankanlegg
201. Kornsilo
202. Vindturbin
203. Mobilmast
204. Kai med kran
205. Containerkran og containerstabler
206. Havnelager
207. Jernbanestasjon
208. Togvogner (person)
209. Godsvogner
210. Låve (finnes – bedre)
211. Kirke (finnes – bedre)
212. Fyr (finnes – bedre)

**Sum: 212 modeller** (L: 114, S: 98).
