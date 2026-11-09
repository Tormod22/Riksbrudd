// Portrettmotoren fra Riksbrudd Karakterstudio v3 (brukerens egen, 11. nov 2026: «kanskje vi kan bruke noe av dette»). Uendret,
// bortsett fra denne linja. Lager et SVG-portrett av en karakter (RiksbruddPortrait.normalize / renderSVG). Brukes av oppstart-visning.js.
/* Riksbrudd 1986 · Portrait Engine v3.0
 * Deterministic, offline, dependency-free, self-contained SVG vector portrait renderer.
 * Data is normalized before rendering; only enumerated choices and bounded numeric values
 * enter SVG markup. Public API is compatible with Characterstudio v1.
 */
(function(root){
'use strict';
const palettes = Object.freeze({
 skin:['#f6d6c2','#eec4a7','#dfaf91','#d09a75','#bf8765','#aa7557','#926145','#7d503b','#684433','#53392f','#43302c','#302522'],
 hair:['#171719','#28201f','#392824','#53362a','#70442b','#8d5533','#ad7443','#c99a61','#e2bf7d','#ddd3c1','#9d9a98','#665d59','#8b3d32','#bf6650'],
 eyes:['#657e88','#46748a','#476879','#6d825d','#4c6542','#94825d','#8d6b4a','#624a3b','#6e6c6b','#3c4244'],
 tie:['#8e302c','#223c56','#5d664c','#3b3534','#7a6751','#af9781','#912e38','#d0b982'],
 background:['#6c7781','#8f978c','#9d9587','#555d65','#757d7a','#807b78','#6f7880','#998b7b'],
 outfitColor:['#283341','#4b4b4b','#645247','#5c6254','#263d4d','#6a594e','#596251','#7b7266','#342f35','#a9a69d']
});
const allowed={
 gender:['kvinne','mann'],role:['politisk','militaer'],face:['oval','kantete','rund','smal','hjerte','bred'],
 eyes:['standard','smale','store','mandel','dyptsittende','runde'],
 brows:['normal','rette','buede','kraftige','smale','sammenknepne'],
 nose:['rett','kort','lang','bred','smal','romersk'],mouth:['normal','smal','fyldig','bred','asymmetrisk'],
 expression:['alvorlig','rolig','streng','svakt-smil','bekymret'],
 glasses:['ingen','runde','firkantede','pilot','smale','innfatningslose'],
 hair:['sidepart','short','slick','waves','bob','long','curly','buzz','bald','fringe','crop','undercut','quiff','pompadour','shag','mullet','pixie','braid','ponytail','afro','curls-short','crew'],
 facialHair:['ingen','bart','skjeggstubb','helskjegg','kort-skjegg','fippskjegg','hestesko'],
 outfit:['dress','dress-gra','dress-brun','uniform','feltuniform','genser','skjorte','hoyhalset','frakk','marineuniform','offisersjakke','skinnjakke','arbeidsjakke','jakke'],
 headwear:['ingen','barett','offiserslue','strikkelue','skyggelue'],
 detail:['ingen','fregner','arr','foflekk'],
 shirt:['hvit','krem','bla','mork'],
 tieStyle:['slips','apen','sløyfe','hoyhalset'],
};
const defaults=Object.freeze({
 version:3,id:'RB-86-0024',name:'Ingrid Berg',role:'politisk',origin:'Vestlandet',gender:'kvinne',age:39,
 face:'oval',skin:palettes.skin[2],eyes:'mandel',eyeColor:palettes.eyes[1],brows:'normal',nose:'rett',mouth:'normal',
 expression:'alvorlig',glasses:'ingen',detail:'ingen',
 hair:'sidepart',hairColor:palettes.hair[1],facialHair:'ingen',headwear:'ingen',
 outfit:'dress',outfitColor:palettes.outfitColor[0],shirt:'hvit',tieStyle:'slips',tieColor:palettes.tie[1],background:palettes.background[0],
 eyeSpacing:50,faceWidth:50,eyeSize:50,cheek:50,grayAmount:0
});
const numerics={age:[20,80],eyeSpacing:[0,100],faceWidth:[0,100],eyeSize:[0,100],cheek:[0,100],grayAmount:[0,100]};
const xml=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function mix(a,b,t){t=Math.max(0,Math.min(1,t));const x=rgb(a),y=rgb(b);return '#'+x.map((n,i)=>Math.round(n*(1-t)+y[i]*t).toString(16).padStart(2,'0')).join('');}
function normalize(value){
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const c={...defaults};
 for(const [k,opts] of Object.entries(allowed)) if(opts.includes(raw[k]))c[k]=raw[k];
 for(const [field,palette] of [['skin','skin'],['hairColor','hair'],['eyeColor','eyes'],['tieColor','tie'],['outfitColor','outfitColor'],['background','background']]) if(palettes[palette].includes(raw[field]))c[field]=raw[field];
 for(const [key,[min,max]] of Object.entries(numerics)) if(Number.isFinite(Number(raw[key]))&&raw[key]!==''&&raw[key]!=null)c[key]=Math.min(max,Math.max(min,Math.round(Number(raw[key]))));
 c.name=String(raw.name??defaults.name).slice(0,46);c.id=String(raw.id??defaults.id).slice(0,32);c.origin=String(raw.origin??defaults.origin).slice(0,36);
 // v1 import: retain all shared fields and map legacy fields to v2 defaults.
 c.version=3;return c;
}
const p=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const stroke=(d,color,w=2,opacity=1,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" ${extra}/>`;
const ell=(x,y,rx,ry,fill,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const circ=(x,y,r,fill,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const rect=(x,y,w,h,rx,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
function frontHair(c, dark, hi, shadow){
 const style=c.hair;
 if(style==='bald')return '';
 if(style==='buzz'||style==='crew')return p('M211 252 Q194 194 228 171 Q278 138 350 153 Q403 167 395 252 Q374 207 337 203 Q269 188 224 223 Z',dark)+stroke('M225 219 Q281 189 372 216',hi,style==='crew'?9:4,.23);
 if(style==='sidepart')return p('M205 265 Q193 207 219 177 Q255 136 324 146 Q386 149 400 200 L393 274 Q372 245 372 218 Q326 207 288 231 Q242 258 210 270 Z',dark)+p('M217 237 Q245 167 315 161 Q372 160 386 184 Q343 177 304 206 Q250 245 217 237 Z',hi,'opacity=".24"')+stroke('M229 240 Q274 205 341 183',shadow,3,.34);
 if(style==='short'||style==='crop'||style==='pixie')return p('M210 257 Q198 189 227 168 Q261 143 314 147 Q364 142 391 182 Q403 208 392 260 L366 232 Q331 235 307 216 Q261 240 220 230 Z',dark)+stroke('M226 204 Q276 164 366 196',hi,7,.24);
 if(style==='slick'||style==='undercut')return p('M217 262 Q198 208 241 168 Q279 139 348 155 Q397 169 397 247 Q372 207 337 203 Q272 198 224 241 Z',dark)+stroke('M236 198 Q295 158 362 187 M238 213 Q287 185 359 205',hi,8,.25);
 if(style==='quiff'||style==='pompadour')return p('M207 259 Q183 195 224 174 Q218 130 276 133 Q309 115 341 144 Q387 137 398 199 L392 260 Q371 224 359 215 Q325 223 295 222 Q249 249 215 263 Z',dark)+p('M235 170 Q258 129 307 146 Q342 137 362 173 Q319 166 292 189 Q260 199 235 170 Z',hi,'opacity=".26"');
 if(style==='fringe')return p('M206 265 Q189 190 235 160 Q281 129 350 155 Q396 176 398 251 L383 242 Q362 260 342 243 Q321 270 296 249 Q273 267 249 246 Q230 263 206 265 Z',dark)+stroke('M231 220 L227 243 M274 210 L267 249 M315 208 L311 238',hi,5,.22);
 if(style==='waves'||style==='shag'||style==='mullet')return p('M195 281 Q187 218 220 176 Q254 146 299 157 Q340 138 374 169 Q418 183 407 277 Q389 281 379 237 Q346 260 322 226 Q283 258 240 239 Q230 273 195 281 Z',dark)+stroke('M225 212 Q257 174 295 199 Q335 171 378 205',hi,9,.3);
 if(style==='bob'||style==='long'||style==='ponytail'||style==='braid')return p('M194 297 Q188 209 235 171 Q287 139 343 154 Q411 172 406 298 L390 287 Q379 259 377 229 Q336 241 302 224 Q257 241 231 214 Q225 275 194 297 Z',dark)+p('M226 191 Q292 154 362 179 Q328 180 291 216 Z',hi,'opacity=".23"');
 if(style==='curly'||style==='afro'||style==='curls-short'){
  const base=[[221,221,36],[257,191,38],[294,177,38],[329,187,40],[367,213,39],[200,256,34],[244,238,29],[287,218,32],[333,225,30],[391,254,31]];
  if(style==='afro')base.push([190,197,42],[243,143,39],[303,122,47],[362,153,44],[413,204,39]);
  return base.map(([x,y,r],i)=>circ(x,y,r,i%4===0?hi:dark,`opacity="${i%4===0?.74:1}"`)).join('')+stroke('M230 211 Q248 188 266 214 M330 201 Q358 184 378 214',shadow,3,.22);
 }
 return '';
}
function backHair(c,color,shadow){
 const k=c.hair;
 if(['long','bob','waves','shag','mullet','ponytail','braid'].includes(k)){
  let s=p('M219 202 Q189 244 184 379 Q184 478 170 536 Q213 570 250 518 L249 255 Z',color)+p('M380 199 Q415 244 415 382 Q415 482 430 534 Q383 577 351 519 L353 254 Z',color);
  if(k==='bob')s=p('M221 220 Q181 253 187 403 L177 472 Q220 492 250 458 L246 257 Z',color)+p('M380 219 Q420 256 413 405 L424 472 Q374 495 350 456 L354 254 Z',color);
  if(k==='ponytail')s=p('M390 232 Q435 277 423 377 Q441 464 406 569 Q391 583 372 568 Q403 456 389 359 Z',color)+stroke('M398 308 Q427 415 388 546',shadow,9,.27);
  if(k==='braid'){
   for(let i=0;i<6;i++)s+=ell(393+(i%2?6:0),336+i*34,23,24,i%2?color:mix(color,'#e7dac0',.1),`transform="rotate(${i%2?-18:18} ${393+(i%2?6:0)} ${336+i*34})"`);
  }
  return s;
 }
 if(['curly','afro'].includes(k))return [[192,272,36],[406,276,36],[197,330,34],[404,340,37],[208,399,29],[390,402,29]].map(([x,y,r])=>circ(x,y,r,color)).join('');
 return '';
}
function cloth(c){
 const color=['dress-gra','dress-brun'].includes(c.outfit)?(c.outfit==='dress-gra'?'#55595b':'#65534a'):c.outfitColor;
 const deep=mix(color,'#0b0f15',.44),lit=mix(color,'#e3d7c6',.20),button='#c8ad76';
 const uniform=['uniform','offisersjakke','marineuniform','feltuniform'].includes(c.outfit);
 const work=['arbeidsjakke','jakke','skinnjakke'].includes(c.outfit);
 let s=`<g>`+p('M252 524 Q211 545 143 567 Q82 588 62 684 L46 740 H554 L536 685 Q515 595 458 568 Q393 540 349 524 Z',`url(#fabricGradient)`)+p('M153 573 Q99 610 87 677 L70 740 H154 Z',deep,'opacity=".6"')+p('M447 573 Q501 610 513 677 L530 740 H446 Z',deep,'opacity=".62"');
 // neck is drawn with the face above the shirt; costume base can layer behind face.
 const shirt=c.shirt==='hvit'?'#e1e0db':c.shirt==='krem'?'#cfc6af':c.shirt==='bla'?'#8199ab':'#313a42';
 if(['genser','hoyhalset'].includes(c.outfit)){
  s+=p('M246 530 Q302 584 356 529 L374 552 Q312 633 225 551 Z',deep)+stroke('M230 565 Q299 620 368 564',lit,5,.55);
  if(c.outfit==='hoyhalset')s+=p('M256 492 Q298 514 344 492 L350 568 Q299 610 248 565 Z',color)+Array.from({length:5},(_,i)=>stroke(`M253 ${515+i*11} Q299 ${530+i*10} 346 ${515+i*11}`,deep,2,.48)).join('');
  for(let y=600;y<740;y+=17)s+=stroke(`M108 ${y} Q299 ${y+9} 494 ${y}`,lit,1.6,.15);
 }else if(work){
  s+=p('M250 531 Q299 590 353 532 L360 741 H242 Z',shirt);
  s+=p('M247 532 L311 640 L268 664 L204 546 Z',deep)+p('M354 533 L291 640 L331 663 L396 546 Z',deep);
  s+=stroke('M299 613 L299 738',lit,2,.46)+rect(156,647,94,54,4,deep,'opacity=".35"')+rect(350,647,94,54,4,deep,'opacity=".35"');
  if(c.outfit==='skinnjakke'){s+=Array.from({length:3},(_,i)=>stroke(`M${167+i*38} 585 L${221+i*25} 698`,lit,2,.29)).join('')+stroke('M299 600 L299 737','#a2a3a0',4,.7);}
 }else if(uniform){
  s+=p('M258 530 L302 602 L344 531 L339 740 H260 Z',shirt);
  s+=p('M244 531 L305 633 L271 661 L213 551 Z',deep)+p('M357 531 L295 633 L329 661 L389 551 Z',deep);
  s+=stroke('M302 624 V740',lit,2,.4)+[658,705].map(y=>circ(304,y,4.5,button)).join('');
  s+=p('M139 575 L232 543 L259 571 L171 609 Z',deep,`stroke="${button}" stroke-width="2"`)+p('M461 575 L365 542 L340 572 L433 610 Z',deep,`stroke="${button}" stroke-width="2"`);
  s+=Array.from({length:4},(_,i)=>stroke(`M178 ${578+i*5} L228 ${562+i*2}`,button,1.6,.9)).join('');
  s+=rect(380,653,65,12,1,button)+rect(380,666,65,5,0,'#a63b3b');
  if(c.outfit==='marineuniform')s+=stroke('M243 549 L294 615 L307 615 L359 548','#d9d2c2',7,.65);
  if(c.outfit==='feltuniform')s+=rect(153,654,93,45,3,deep,'opacity=".55"')+rect(361,654,86,45,3,deep,'opacity=".55"');
 }else if(c.outfit==='skjorte'){
  s+=p('M258 532 L300 589 L346 529 L352 740 H247 Z',shirt);
  s+=p('M250 533 L300 603 L270 616 L230 549 Z',mix(shirt,'#9d9185',.24))+p('M351 533 L300 603 L330 616 L375 549 Z',mix(shirt,'#9d9185',.2));
  s+=stroke('M300 624 V740',mix(shirt,'#191919',.5),2,.5)+[644,686,729].map(y=>circ(300,y,3,deep)).join('');
 }else{
  s+=p('M258 532 L301 608 L345 531 L355 740 H247 Z',shirt);
  if(c.tieStyle==='slips')s+=p('M301 586 L319 609 L305 625 L329 741 H274 L296 625 L284 609 Z',c.tieColor)+stroke('M300 600 L304 615',mix(c.tieColor,'#ffffff',.5),3,.6);
  if(c.tieStyle==='sløyfe')s+=p('M296 597 L272 584 L272 615 L298 605 L328 615 L328 584 L304 597 Z',c.tieColor)+circ(300,600,7,deep);
  if(c.tieStyle==='apen')s+=p('M274 548 L300 610 L325 550 L300 568 Z',mix(c.skin,'#3d2c26',.11));
  if(c.tieStyle==='hoyhalset')s+=p('M254 531 Q300 553 347 530 L345 602 Q300 625 256 602 Z',mix(color,'#181a20',.4))+Array.from({length:4},(_,i)=>stroke(`M260 ${548+i*13} Q299 ${557+i*13} 341 ${548+i*13}`,lit,1.8,.3)).join('');
  s+=p('M246 529 L307 656 L244 615 L209 553 Z',deep)+p('M354 529 L293 656 L355 615 L390 552 Z',deep);
  s+=stroke('M237 558 L306 670 L278 737',lit,2,.45)+stroke('M361 558 L296 670 L321 738',lit,2,.45);
  s+=p('M371 654 L422 654 L403 666 Z','#dad9d4','opacity=".85"')+circ(304,715,4,lit);
 }
 if(c.outfit==='frakk')s+=p('M196 539 L286 721 L266 740 H137 L155 610 Z',deep)+p('M405 539 L315 721 L334 740 H462 L443 610 Z',deep);
 s+='</g>';return s;
}
function face(c){
 const base=c.skin,
   hi=mix(base,'#fff2df',.33),
   pearl=mix(base,'#fffaf1',.48),
   sh=mix(base,'#322527',.39),
   midSh=mix(base,'#5a352a',.25),
   lip=mix(base,'#924846',c.gender==='kvinne'?.34:.28),
   hair=mix(c.hairColor,'#b0aaa0',c.grayAmount/116),
   hLit=mix(hair,'#d6bda1',.29),hairSh=mix(hair,'#08090b',.26);
 const isMale=c.gender==='mann';
 const scale=1.09+(c.faceWidth-50)/500+(c.face==='bred'?.1:c.face==='smal'?-.07:0)+(isMale?.025:0);
 const jaw=c.face==='kantete'?59:c.face==='rund'?50:c.face==='hjerte'?34:c.face==='bred'?57:44;
 const cheekAdj=(c.cheek-50)*.18;
 const chiny=c.face==='smal'?525:c.face==='rund'?494:511;
 const skull=`M300 179 C253 178 222 196 213 260 C206 291 ${211-cheekAdj} 354 ${224-cheekAdj} 411 C231 450 ${268-jaw*.16} 488 300 ${chiny} C${334+jaw*.12} 492 365 454 ${377+cheekAdj} 410 C${390+cheekAdj} 354 394 294 387 259 C381 197 350 179 300 179 Z`;
 let s=`<g transform="translate(300 0) scale(${scale.toFixed(4)} 1) translate(-300 0)">`;
 // Hair behind shoulders and jaw, forehead and crown layers are rendered later.
 s+=backHair(c,"url(#hairGradient)",hairSh);
 // Neck volume: sternomastoid muscles, throat highlight and shadow beneath jaw.
 s+=p('M258 469 Q297 480 344 467 L357 556 Q342 576 299 587 Q263 577 244 553 Z','url(#skinGradient)');
 s+=p('M258 476 Q297 504 339 473 L332 514 Q295 541 271 515 Z',sh,'opacity=".23"');
 s+=p('M256 495 Q273 542 296 564 Q277 543 268 507 Z',hi,'opacity=".17"');
 s+=p('M340 489 Q323 545 310 565 Q339 542 346 515 Z',midSh,'opacity=".22"');
 s+=stroke('M284 524 Q286 544 295 553 M319 523 Q317 542 308 553',midSh,2,.17);
 // Ears in three planes instead of featureless ovals.
 for (const side of [-1,1]) {
  const cx=300+side*88;
  s+=ell(cx,353,17,37,'url(#skinGradient)',`transform="rotate(${side*8} ${cx} 353)"`);
  s+=p(side===-1?'M208 330 Q193 337 199 362 Q207 386 219 379 Q211 367 211 350 Z':'M392 330 Q407 337 401 362 Q393 386 381 379 Q389 367 389 350 Z',sh,'opacity=".18"');
  s+=stroke(side===-1?'M208 342 Q196 351 208 370 Q213 365 213 359':'M392 342 Q404 351 392 370 Q387 365 387 359',midSh,2.5,.47);
  s+=ell(cx+(side*1),372,4.5,8,hi,'opacity=".15"');
 }
 // Facial silhouette with warm shadow along jaw; not an oval mask.
 s+=p(skull,'url(#skinGradient)',`stroke="${mix(base,'#39271e',.32)}" stroke-width="1.25"`);
 s+=p('M214 275 C208 351 226 429 248 466 Q267 497 295 509 C252 480 232 424 221 369 Z',midSh,'opacity=".21"');
 s+=p('M388 268 C399 341 380 429 350 467 Q329 497 301 507 Q353 468 370 399 Z',sh,'opacity=".19"');
 s+=p('M226 307 Q235 243 281 210 Q247 272 237 323 Z',pearl,'opacity=".11"');
 s+=ell(263,401,37,27,'#c66f64','opacity=".09" filter="url(#skinSoft)"');
 s+=ell(345,398,37,27,'#c66f64','opacity=".10" filter="url(#skinSoft)"');
 // Subtle tonal planes for cheekbones and temples.
 s+=p('M221 356 Q241 367 260 372 Q283 386 285 404 Q260 395 238 413 Q223 401 221 356 Z',sh,'opacity=".105"');
 s+=p('M381 355 Q361 371 339 374 Q318 385 312 404 Q340 394 363 411 Q377 400 381 355 Z',sh,'opacity=".13"');
 s+=p('M233 383 Q249 371 276 383 Q253 386 240 399 Z',hi,'opacity=".21"');
 s+=p('M366 384 Q347 373 322 386 Q344 388 359 400 Z',hi,'opacity=".16"');
 s+=ell(295,274,71,59,pearl,'opacity=".075" filter="url(#skinSoft)"');
 s+=ell(300,469,51,20,sh,'opacity=".13" filter="url(#skinSoft)"');
 s+=stroke('M255 476 Q275 499 299 500 Q321 496 345 475',midSh,1.4,.12);
 // Eyebrow bone, more compact lifelike eyes and irregular brows.
 const spacing=43+(c.eyeSpacing-50)*.18,eyeY=346;
 const left=300-spacing,right=300+spacing;
 [left,right].forEach((x,i)=>{
  const side=i===0?-1:1;
  const eyeWidth=c.eyes==='smale'?21:c.eyes==='store'?27:24;
  const eyeH=(c.eyes==='store'?9.4:c.eyes==='smale'?4.6:c.eyes==='runde'?9.0:c.eyes==='dyptsittende'?5.3:6.6)*(.83+c.eyeSize/300);
  const browThick=c.brows==='kraftige'?6:c.brows==='smale'?2.7:4.1;
  const browArch=c.brows==='buede'?-9:c.brows==='rette'?2:c.brows==='sammenknepne'?6:0;
  const browY=c.expression==='streng'?313:c.expression==='bekymret'?319:316;
  s+=ell(x,eyeY-7,34,19,sh,'opacity=".22" filter="url(#skinSoft)"');
  s+=stroke(`M${x-29} ${eyeY-24} Q${x} ${eyeY-34} ${x+26} ${eyeY-25}`,pearl,5,.18);
  s+=p(`M${x-29} ${browY+3} Q${x-13} ${browY-11+browArch} ${x+6} ${browY-7+browArch} Q${x+20} ${browY-6+browArch} ${x+29} ${browY} Q${x+8} ${browY-2+browArch} ${x-29} ${browY+3} Z`,hairSh,`opacity="${c.brows==='smale'?.65:.88}"`);
  s+=stroke(`M${x-27} ${browY+2} Q${x-8} ${browY-7+browArch} ${x+24} ${browY-1}`,hLit,browThick*.25,.25);
  for(let j=0;j<8;j++){
   const xx=x-24+j*6;
   s+=stroke(`M${xx} ${browY-1-Math.sin(j/8*Math.PI)*6+browArch*.4} l${side*1.2} -2.3`,hLit,.8,.26);
  }
  const y0=eyeY+(c.eyes==='mandel'?1:0);
  const d=`M${x-eyeWidth} ${y0} Q${x-7} ${y0-eyeH-5} ${x+eyeWidth} ${y0-1} Q${x+6} ${y0+eyeH+4} ${x-eyeWidth} ${y0} Z`;
  s+=p(d,'url(#scleraGradient)',`stroke="${midSh}" stroke-width="1.35"`);
  s+=`<clipPath id="eye${i}">${p(d,'white')}</clipPath>`;
  s+=`<g clip-path="url(#eye${i})">`;
  s+=ell(x,eyeY+1.5,8.4,9.5,mix(c.eyeColor,'#192229',.28));
  s+=circ(x,eyeY+1.5,6.6,c.eyeColor)+circ(x,eyeY+1.5,3.8,'#191a1b');
  s+=circ(x-2.5,eyeY-2,2.1,'#fff7eb','opacity=".82"')+circ(x+3,eyeY+4,1,'#f4eee8','opacity=".54"');
  s+='</g>';
  s+=stroke(`M${x-eyeWidth} ${y0} Q${x-5} ${y0-eyeH-5} ${x+eyeWidth} ${y0-1}`,mix(midSh,'#1c1820',.4),isMale?2.2:2.5,.83);
  s+=stroke(`M${x-eyeWidth+3} ${eyeY-10} Q${x} ${eyeY-19} ${x+eyeWidth-4} ${eyeY-9}`,midSh,1.4,.23);
  s+=stroke(`M${x-eyeWidth+6} ${eyeY+13} Q${x} ${eyeY+17} ${x+eyeWidth-6} ${eyeY+11}`,sh,1.3,.2);
  if(!isMale){s+=stroke(`M${x+eyeWidth-2} ${eyeY} l5 -4`,hairSh,1.7,.58);}
 });
 // Nose: vertical form highlight, side shade, alar lobes and nasal base.
 const noseW=c.nose==='bred'?1.32:c.nose==='smal'?.75:1;
 const noseL=c.nose==='lang'||c.nose==='romersk'?11:c.nose==='kort'?-8:0;
 const ny=409+noseL;
 s+=p(`M292 349 Q288 375 ${293-3*noseW} ${ny-7} Q292 ${ny+3} 297 ${ny+7} Q277 ${ny+2} ${280-5*noseW} ${ny+4} Q283 390 285 372 Z`,sh,'opacity=".19"');
 s+=p(`M302 351 Q309 380 ${308+3*noseW} ${ny-11} Q309 ${ny+1} ${315+4*noseW} ${ny+4} Q318 382 310 367 Z`,hi,'opacity=".27"');
 s+=ell(300,ny-3,17*noseW,10,pearl,'opacity=".26" filter="url(#skinSoft)"');
 s+=stroke(`M${285-3*noseW} ${ny+2} Q${289-3*noseW} ${ny-2} 296 ${ny+4}`,midSh,2,.37);
 s+=stroke(`M305 ${ny+4} Q${312+3*noseW} ${ny-2} ${316+3*noseW} ${ny+3}`,midSh,2,.38);
 s+=ell(285-2*noseW,ny+3,4.5*noseW,2.5,sh,'opacity=".62"');
 s+=ell(315+2*noseW,ny+3,4.5*noseW,2.5,sh,'opacity=".62"');
 s+=stroke(`M294 ${ny+6} Q300 ${ny+9} 307 ${ny+5}`,hi,1.5,.29);
 if(c.nose==='romersk') s+=stroke('M306 377 Q315 388 307 397',sh,2.3,.27);
 // Philtrum, upper/lower lips, mouth aperture and chin break.
 const my=447+noseL*.19,ml=c.mouth==='bred'?33:c.mouth==='smal'?22:27,full=c.mouth==='fyldig'?1.35:c.mouth==='smal'?.65:1;
 const smiling=c.expression==='svakt-smil'?-5:c.expression==='streng'?3:0;
 s+=stroke(`M294 ${ny+19} Q290 ${my-13} 295 ${my-10} M306 ${ny+19} Q310 ${my-13} 306 ${my-10}`,midSh,1.2,.18);
 s+=p(`M${300-ml} ${my+smiling} Q283 ${my-3} 293 ${my-3} Q300 ${my+1} 307 ${my-3} Q316 ${my-3} ${300+ml} ${my+smiling} Q317 ${my+5*full} 300 ${my+8*full} Q282 ${my+5*full} ${300-ml} ${my+smiling} Z`,lip,'opacity=".45"');
 s+=stroke(`M${300-ml} ${my+smiling} Q300 ${my+3+smiling} ${300+ml} ${my+smiling}`,mix(lip,'#3d2024',.35),1.7,.66);
 s+=stroke(`M283 ${my+8*full} Q300 ${my+12*full} 316 ${my+8*full}`,pearl,1.3,.28);
 s+=ell(300,my+23,28,6,sh,'opacity=".14" filter="url(#skinSoft)"');
 s+=stroke(`M279 ${my+25} Q299 ${my+30} 320 ${my+25}`,midSh,1.2,.22);
 if(c.expression==='bekymret')s+=stroke('M269 326 Q280 321 286 325 M314 325 Q320 321 331 326',midSh,1.8,.35);
 if(c.expression==='streng')s+=stroke('M267 317 L289 320 M311 320 L333 317',midSh,1.8,.28);
 // Finely scattered skin texture and age-based expression lines, deterministic.
 if(c.detail==='fregner')for(let i=0;i<22;i++){
  const x=235+(i%11)*5,y=390+Math.floor(i/11)*9+(i%3)*2;
  s+=circ(x,y,.9+(i%3)*.25,sh,'opacity=".32"')+circ(600-x,y,1+(i%2)*.2,sh,'opacity=".30"');
 }
 if(c.detail==='arr')s+=stroke('M362 385 Q352 406 358 428',pearl,2.5,.64)+stroke('M364 385 Q354 406 360 428',sh,.9,.39);
 if(c.detail==='foflekk')s+=circ(366,431,2.7,mix(base,'#2d1d16',.65),'opacity=".72"');
 if(c.age>=38){s+=stroke('M226 367 Q232 360 239 362 M361 363 Q368 360 374 366',sh,1.2,.17);}
 if(c.age>=46){s+=stroke('M267 294 Q300 290 333 295 M258 302 Q300 300 342 304',midSh,1.2,.16);}
 if(c.age>=55){s+=stroke('M243 426 Q234 441 241 457 M360 426 Q369 444 359 455',sh,1.1,.23)+stroke('M278 471 Q299 479 324 471',sh,1.2,.22);}
 if(c.age>=65){s+=stroke('M265 277 Q300 270 333 277 M242 385 Q253 390 263 385 M338 385 Q350 390 360 385',sh,1.4,.24);}
 // Layered facial hair; translucent stubble, dark contours, restrained strand lines.
 if(c.facialHair==='skjeggstubb'){
  s+=p('M231 425 Q238 469 273 488 Q301 509 328 489 Q363 465 371 425 Q351 454 333 468 Q300 488 266 468 Z',hair,'opacity=".23"');
  for(let i=0;i<85;i++){
   const x=246+(i*29)%112,y=440+(i*13)%46;
   if(Math.abs(x-300)+(y-441)*.5<91)s+=circ(x,y,.65,hairSh,'opacity=".17"');
  }
 }
 if(['kort-skjegg','helskjegg','fippskjegg','hestesko'].includes(c.facialHair)){
  if(c.facialHair==='fippskjegg')s+=p('M283 461 Q300 472 319 458 L327 486 Q305 516 275 486 Z',hair,'opacity=".91"');
  else if(c.facialHair==='hestesko')s+=p('M269 436 Q288 430 301 438 Q318 429 332 436 L332 484 L317 482 L313 447 Q300 456 286 447 L286 482 L269 483 Z',hair,'opacity=".91"');
  else s+=p(c.facialHair==='helskjegg'?'M228 421 Q243 470 263 488 Q267 518 300 545 Q337 518 343 487 Q367 468 374 421 Q356 453 338 469 Q300 458 270 472 Q245 464 228 421 Z':'M237 431 Q246 468 270 481 Q299 495 329 482 Q353 467 366 431 Q347 483 326 497 Q299 513 273 497 Q249 483 237 431 Z',hair,'opacity=".88"');
  s+=stroke('M260 484 Q300 517 338 484',hLit,1.2,.24);
 }
 if(['bart','hestesko','helskjegg','kort-skjegg'].includes(c.facialHair)){
  s+=p('M269 436 Q286 429 295 438 Q300 443 305 438 Q318 429 331 435 Q320 450 305 444 Q299 442 294 445 Q278 450 269 436 Z',hair,'opacity=".93"');
  s+=stroke('M278 437 Q287 432 295 440 M307 440 Q314 434 324 437',hLit,1.1,.21);
 }
 s+=frontHair(c,"url(#hairGradient)",hLit,hairSh);
 // Wisps and volume lines concentrated along the hairline, not across the face.
 if(c.hair!=='bald'&&!['curly','afro','curls-short'].includes(c.hair)){
  for(let i=0;i<20;i++){
   const x=230+i*7.1;
   s+=stroke(`M${x.toFixed(1)} ${177+(i%4)*3} Q${(x+12).toFixed(1)} ${190+(i%3)*5} ${(x+16).toFixed(1)} ${213+(i%4)*3}`,i%3?hLit:hairSh,1.35,.17);
  }
 }
 if(c.glasses!=='ingen'){
  const round=c.glasses==='runde',pilot=c.glasses==='pilot',small=c.glasses==='smale',rimless=c.glasses==='innfatningslose';
  const frame=mix('#31302b',c.outfitColor,.1);
  for(const x of [left,right]){
   const w=small?54:pilot?77:68,h=small?37:pilot?52:48;
   if(round)s+=`<circle cx="${x}" cy="347" r="29" fill="#c2d6d1" fill-opacity=".035" stroke="${frame}" stroke-width="${rimless?1.4:3.4}"/>`;
   else s+=rect(x-w/2,347-h/2,w,h,small?8:pilot?20:11,'#d7e0dc',`fill-opacity=".038" stroke="${frame}" stroke-width="${rimless?1.4:3.3}"`);
  }
  s+=stroke(`M${left+32} 344 Q300 334 ${right-32} 344`,frame,2.8,.9);
  s+=stroke(`M${left-34} 341 L208 332 M${right+34} 341 L392 332`,frame,3,.88);
  s+=stroke(`M${left-24} 330 L${left-5} 329 M${right-23} 330 L${right-6} 329`,pearl,1.1,.28);
 }
 if(c.headwear!=='ingen'){
  if(c.headwear==='barett')s+=p('M194 246 Q184 191 246 159 Q327 131 386 165 Q425 188 402 234 Q360 209 292 204 Q232 207 194 246 Z',c.outfitColor)+ell(311,238,112,15,mix(c.outfitColor,'#131419',.38));
  if(c.headwear==='offiserslue')s+=p('M194 233 L215 159 Q299 130 386 159 L408 231 Z',mix(c.outfitColor,'#0c0d0f',.12))+ell(300,226,112,23,'#20262d')+stroke('M219 213 Q300 195 383 213','#c9af79',5,.88)+circ(300,189,11,'#c9b279');
  if(c.headwear==='strikkelue')s+=p('M197 251 Q194 142 299 142 Q406 142 403 251 Z',c.outfitColor)+rect(194,221,212,38,10,mix(c.outfitColor,'#15151b',.24));
  if(c.headwear==='skyggelue')s+=p('M202 228 Q200 158 298 156 Q397 156 398 230 Z',c.outfitColor)+ell(322,244,133,15,mix(c.outfitColor,'#111117',.29));
 }
 s+='</g>';return s;
}
function renderSVG(input){
 const c=normalize(input),bg=c.background,bgl=mix(bg,'#f4efe9',.3),bgd=mix(bg,'#171d22',.24);
 const color=['dress-gra','dress-brun'].includes(c.outfit)?(c.outfit==='dress-gra'?'#54575a':'#625044'):c.outfitColor;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="740" viewBox="0 0 600 740" role="img" aria-label="Portrett av ${xml(c.name)}">
<defs>
<linearGradient id="backGrad" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="${bgl}"/><stop offset="1" stop-color="${bgd}"/></linearGradient>
<radialGradient id="skinGradient" cx="34%" cy="31%" r="78%"><stop offset="0" stop-color="${mix(c.skin,'#fff5dd',.27)}"/><stop offset=".4" stop-color="${c.skin}"/><stop offset=".76" stop-color="${mix(c.skin,'#593c31',.14)}"/><stop offset="1" stop-color="${mix(c.skin,'#2f2725',.26)}"/></radialGradient>
<linearGradient id="fabricGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(color,'#a9a59a',.20)}"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="${mix(color,'#090b10',.48)}"/></linearGradient>
<linearGradient id="hairGradient" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="${mix(c.hairColor,'#f8e7d0',.15)}"/><stop offset=".28" stop-color="${mix(c.hairColor,'#efe7dd',.06)}"/><stop offset=".65" stop-color="${mix(c.hairColor,'#171215',.12)}"/><stop offset="1" stop-color="${mix(c.hairColor,'#08090d',.40)}"/></linearGradient>
<linearGradient id="skinRim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff0d5" stop-opacity=".18"/><stop offset=".5" stop-color="#fff0d5" stop-opacity="0"/><stop offset="1" stop-color="#261b1d" stop-opacity=".18"/></linearGradient>
<linearGradient id="scleraGradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dfd7ce"/><stop offset=".47" stop-color="#f9f0e6"/><stop offset="1" stop-color="#d1c5c0"/></linearGradient>
<radialGradient id="vignette"><stop offset=".6" stop-color="#182027" stop-opacity="0"/><stop offset="1" stop-color="#121820" stop-opacity=".33"/></radialGradient>
<filter id="skinSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="backBlur"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="softShadow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="8"/></filter>
<clipPath id="crop"><rect width="600" height="740"/></clipPath>
<pattern id="subtleGrain" width="67" height="67" patternUnits="userSpaceOnUse"><circle cx="4" cy="14" r=".5" fill="#fbf6ec" opacity=".18"/><circle cx="42" cy="32" r=".8" fill="#0a0f18" opacity=".15"/><circle cx="21" cy="62" r=".55" fill="#fff" opacity=".17"/></pattern>
</defs><g clip-path="url(#crop)">
<rect width="600" height="740" fill="url(#backGrad)"/>
${ell(490,210,205,370,'#ffffff','opacity=".1" filter="url(#backBlur)"')}
${ell(300,800,320,230,'#10141b','opacity=".18" filter="url(#softShadow)"')}
${cloth(c)}${face(c)}
<rect width="600" height="740" fill="url(#vignette)"/>
<rect width="600" height="740" fill="url(#subtleGrain)" opacity=".7"/>
<rect x="4" y="4" width="592" height="732" fill="none" stroke="#e7e1d2" stroke-width="6" opacity=".13"/>
</g></svg>`;
}
function safeFileName(v){return String(v||'leder').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'leder';}
function randomCharacter(){
 const c={...defaults},pick=arr=>arr[Math.floor(Math.random()*arr.length)];
 for(const [k,opts] of Object.entries(allowed))c[k]=pick(opts);
 for(const [k,pal] of [['skin','skin'],['hairColor','hair'],['eyeColor','eyes'],['tieColor','tie'],['outfitColor','outfitColor'],['background','background']])c[k]=pick(palettes[pal]);
 for(const [k,[min,max]] of Object.entries(numerics))c[k]=min+Math.floor(Math.random()*(max-min+1));
 c.name=pick(['Ingrid Berg','Arne Vik','Solveig Nilsen','Erik Holmen','Kari Solheim','Olav Strand','Marta Haugen','Johan Dahl','Liv Andreassen','Sverre Lund','Ragnhild Næss','Henrik Hauge']);
 c.id='RB-86-'+String(1000+Math.floor(Math.random()*8999));return c;
}
const api={defaults,palettes,allowed,numerics,normalize,renderSVG,randomCharacter,safeFileName};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.RiksbruddPortrait=api;
})(typeof window!=='undefined'?window:globalThis);
