"""Bygningspunkt fra Kartverket (WFS matrikkelen-bygningspunkt, CC BY) og vegnett fra NVDB API v4 (åpent)."""
import urllib.request, re, json
from pyproj import Transformer
# bbox i EPSG:32632 (samme som Landsat-nettet) og i lon/lat
BB32=(493700,6867500,540000,6917860); BBLL="8.88,61.94,9.76,62.39"
base=f"https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt?service=WFS&version=2.0.0&request=GetFeature&typeNames=app:Bygning&srsName=EPSG:32632&bbox={','.join(map(str,BB32))},EPSG:32632&count=5000&startIndex="
pts=[]; start=0
while True:
    x=urllib.request.urlopen(base+str(start),timeout=120).read().decode('utf-8','ignore')
    feats=re.findall(r'<app:Bygning .*?</app:Bygning>',x,re.S)
    for f in feats:
        t=re.search(r'<app:bygningstype>(\d+)',f); p=re.search(r'<gml:pos>([\d.]+) ([\d.]+)',f); st=re.search(r'<app:bygningsstatus>(\w+)',f)
        if t and p: pts.append([round(float(p.group(1)),1),round(float(p.group(2)),1),int(t.group(1)),st.group(1) if st else ''])
    if len(feats)<5000: break
    start+=5000
json.dump(pts,open('buildings.json','w')); print('bygg',len(pts))
tr=Transformer.from_crs("EPSG:4326","EPSG:32632",always_xy=True)
u=f"https://nvdbapiles.atlas.vegvesen.no/vegnett/api/v4/veglenkesekvenser/segmentert?kartutsnitt={BBLL}&srid=4326&antall=1000"
roads=[]
while u:
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'X-Client':'riksbrudd','Accept':'application/json'}),timeout=90))
    for o in d['objekter']:
        if o.get('detaljnivå') not in ('Vegtrase og kjørebane','Vegtrase'): continue
        cat=(o.get('vegsystemreferanse') or {}).get('vegsystem',{}).get('vegkategori','P')
        if cat=='P' and o.get('typeVeg')!='Enkel bilveg': continue
        m=re.search(r'\((.*)\)',o['geometri']['wkt']); p=[]
        for c in m.group(1).split(','):
            lat,lon=c.split()[:2]; x,y=tr.transform(float(lon),float(lat)); p.append([round(x),round(y)])
        if len(p)>1: roads.append({'c':cat,'p':p})
    nx=d['metadata'].get('neste'); u=nx['href'] if nx else None
json.dump(roads,open('roads.json','w')); print('veg',len(roads))
