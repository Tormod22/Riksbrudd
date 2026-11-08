const fs=require('fs');const h=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'../../site/dovre/index.html'),'utf8');
const data=h.split('<script id="mapdata" type="application/json">')[1].split('</script>')[0].replace(/<\\\//g,'</');
let js=h.split('<script>').pop().split('</script>')[0]; js=js.replace("logMsg('Dovre, august 1987","const __r=astar(600,1130,900,700); console.log('path',__r&&__r.path.length,__r&&__r.hours.toFixed(1)); order(squads[0],900,700); for(let i=0;i<600;i++)sim(1); console.log('pos',squads[0].x|0,squads[0].y|0,'seg',squads[0].seg); console.log('vis',viewshed(540,980,8000).size); logMsg('Dovre, august 1987");
const noop=()=>{}; const ctxP=new Proxy({},{get:(t,k)=>{ if(k==='measureText')return()=>({width:10}); if(k==='createRadialGradient')return()=>({addColorStop:noop}); return noop; }, set:()=>true});
const els={}; const mk=(id)=>els[id]||(els[id]={id,textContent:'',innerHTML:'',classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,setPointerCapture:noop,getBoundingClientRect:()=>({left:0,top:0}),style:{},appendChild:noop,clientWidth:800,clientHeight:600,getContext:()=>ctxP,querySelectorAll:()=>[]});
global.document={getElementById:(id)=>id==='mapdata'?{textContent:data}:mk(id),createElement:()=>mk('x'+Math.random()),documentElement:{},querySelectorAll:()=>[]};
global.window={addEventListener:noop,devicePixelRatio:1}; global.getComputedStyle=()=>({paddingBottom:'0px'}); global.Image=class{}; global.performance={now:()=>0};
let frame; global.requestAnimationFrame=(f)=>{frame=f;};
try{ new Function(js)(); console.log('init ok'); frame(100); frame(300); console.log('frames ok'); }catch(e){ console.log('ERR',e.stack.split('\n').slice(0,4).join('\n')); }
