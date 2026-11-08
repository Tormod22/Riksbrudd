const fs=require('fs');const h=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'../../site/norge/index.html'),'utf8');
const data=h.split('<script id="mapdata" type="application/json">')[1].split('</script>')[0].replace(/<\\\//g,'</');
const js=h.split('<script>')[1].split('</script>')[0];
const noop=()=>{}; const ctxP=new Proxy({},{get:(t,k)=>{ if(k==='isPointInPath')return()=>true; if(k==='getTransform')return()=>({}); if(k==='measureText')return()=>({width:10}); if(k==='createPattern'||k==='createRadialGradient')return()=>({addColorStop:noop}); if(k==='createImageData')return()=>({data:new Uint8ClampedArray(256*256*4)}); return noop; }, set:()=>true});
const els={}; const mk=(id)=>els[id]||(els[id]={id,textContent:'',innerHTML:'',classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,setPointerCapture:noop,getBoundingClientRect:()=>({left:0,top:0}),setAttribute:noop,style:{},onclick:null,appendChild:noop,clientWidth:800,clientHeight:600,getContext:()=>ctxP,width:0,height:0,disabled:false});
global.document={getElementById:(id)=>{ if(id==='mapdata')return{textContent:data}; return mk(id);},createElement:()=>mk('c'+Math.random()),documentElement:{},querySelectorAll:()=>[]};
global.window={addEventListener:noop,devicePixelRatio:1}; global.getComputedStyle=()=>({getPropertyValue:()=>'#000'}); global.Path2D=class{moveTo(){}lineTo(){}closePath(){}}; global.performance={now:()=>0};
let frame; global.requestAnimationFrame=(f)=>{frame=f;};
try{ new Function(js)(); console.log('init ok'); frame(100); frame(200); console.log('frames ok'); }catch(e){ console.log('ERR',e.stack.split('\n').slice(0,4).join('\n')); }
