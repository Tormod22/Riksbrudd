"""Pakker tekstur (JPEG), høyde- og klassegrid (120 m, base64), veier, bygg og høydekurver til dovre_data.json,
og setter det inn i tpl.html -> dovre.html."""
import json, numpy as np, base64, io
from PIL import Image
from shapely.geometry import LineString
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
meta=json.load(open('landsat_meta.json')); X0,Y0=meta['transform'][2],meta['transform'][5]; W,H=meta['shape'][1],meta['shape'][0]
px=lambda e,n: [round((e-X0)/30,1), round((Y0-n)/30,1)]
buf=io.BytesIO(); Image.open('texture.png').save(buf,'JPEG',quality=82); tex64=base64.b64encode(buf.getvalue()).decode()
d=np.load('mosaic.npz'); dem=d['dem']; cls=np.load('cls.npy'); g=4; gh,gw=H//g,W//g
demg=dem[:gh*g,:gw*g].reshape(gh,g,gw,g).mean(axis=(1,3)).astype(np.int16)
cb=cls[:gh*g,:gw*g].reshape(gh,g,gw,g)
clsg=np.array([[np.bincount(cb[i,:,j,:].ravel(),minlength=7).argmax() for j in range(gw)] for i in range(gh)],dtype=np.uint8)
roads=[{'c':r['c'],'p':[px(x,y) for x,y in LineString(r['p']).simplify(12).coords]} for r in json.load(open('roads.json'))]
bld=[]
for e,n,t,st in json.load(open('buildings.json')):
    if st not in ('TB','FA'): continue
    g2=t//10
    if g2==16: continue   # hytter: de fleste etter 1986
    k=0 if g2==18 else 1 if g2 in (11,12,13,14,15,17) else 2 if g2==24 else 3 if g2 in (21,22,23) else 4
    bld.append(px(e,n)+[k])
cs=plt.contour(np.arange(W),np.arange(H),dem,levels=np.arange(500,2300,100)); cont=[]
for lvl,segs in zip(cs.levels,cs.allsegs):
    for s in segs:
        if len(s)<8: continue
        cont.append({'z':int(lvl),'p':[[round(x,1),round(y,1)] for x,y in LineString(s).simplify(1.5).coords]})
data={'W':W,'H':H,'g':g,'gw':gw,'gh':gh,'dem':base64.b64encode(demg.tobytes()).decode(),'cls':base64.b64encode(clsg.tobytes()).decode(),'tex':tex64,'roads':roads,'bld':bld,'cont':cont,'origin':[X0,Y0]}
s=json.dumps(data,separators=(',',':')); open('dovre_data.json','w').write(s)
open('dovre.html','w').write(open('tpl.html').read().replace('__MAPDATA__',s.replace('</','<\\/')))
print(len(s)//1024,'KB')
