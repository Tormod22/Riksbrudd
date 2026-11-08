import json, math
from shapely.geometry import shape, mapping
from shapely.ops import transform
from shapely.strtree import STRtree
from pyproj import Transformer

tr = Transformer.from_crs("EPSG:4326","+proj=laea +lat_0=65 +lon_0=15 +datum=WGS84 +units=m",always_xy=True)
def proj(g): return transform(tr.transform, g)

kom = json.load(open('kommuner_s.geojson'))['features']
fyl = json.load(open('fylker_s.geojson'))['features']
ne = json.load(open('ne50.geojson'))['features']
sval = [f for f in ne if f['properties'].get('GU_A3')=='NSV'][0]
ne110=json.load(open('ne110.geojson'))['features']
KEY={'Sweden','Finland','Russia','Denmark','United Kingdom','Iceland','Germany','Poland','Estonia','Latvia','Lithuania','Netherlands','Belgium','France','Ireland','Belarus','Ukraine'}
world=[f for f in ne if f['properties'].get('NAME') in KEY and f['properties'].get('GU_A3')!='NSV']
names50={f['properties']['NAME'] for f in world}
world+=[f for f in ne110 if f['properties']['NAME'] not in names50 and f['properties']['NAME'] not in ('Norway','Antarctica')]

# fylke lookup by kommune number prefix
fyl_by = {f['properties']['fylkesnummer']: f['properties']['name'] for f in fyl}

geoms=[]; props=[]
for f in kom:
    g = proj(shape(f['geometry'])).buffer(0)
    geoms.append(g); props.append(f['properties'])

sg = proj(shape(sval['geometry']))
# bounds (mainland only decide scale; Svalbard extends the canvas north)
minx=min(g.bounds[0] for g in geoms); miny=min(g.bounds[1] for g in geoms)
maxx=max(g.bounds[2] for g in geoms); mainmaxy=max(g.bounds[3] for g in geoms)
S = 2400/(mainmaxy-miny)
minx=min(minx,sg.bounds[0]); maxx=max(maxx,sg.bounds[2]); maxy=max(mainmaxy,sg.bounds[3])
W=maxx-minx; H=maxy-miny
def px(x,y): return [round((x-minx)*S,1), round((maxy-y)*S,1)]
def rings(g):
    polys = [g] if g.geom_type=='Polygon' else list(g.geoms)
    out=[]
    for p in polys:
        if p.area < 2e6: continue  # drop islets < 2 km2
        out.append([px(*c) for c in p.exterior.coords])
    if not out:  # keep biggest
        p=max(polys,key=lambda p:p.area); out=[[px(*c) for c in p.exterior.coords]]
    return out

tree = STRtree(geoms)
provinces=[]
for i,(g,p) in enumerate(zip(geoms,props)):
    nb=[]
    for j in tree.query(g):
        if j==i: continue
        if g.buffer(300).intersects(geoms[j]): nb.append(props[j]['kommunenummer'])
    if not nb:
        ds=sorted(((g.distance(geoms[j]),j) for j in range(len(geoms)) if j!=i))[:2]
        nb=[props[j]['kommunenummer'] for d,j in ds if d<40000]
    c=g.representative_point()
    provinces.append({
        'id':p['kommunenummer'],'name':p['name'],'fylke':fyl_by.get(p['kommunenummer'][:2],'?'),
        'area_km2':round(g.area/1e6),'c':px(c.x,c.y),'nb':nb,'rings':rings(g)})

# make neighbour relations symmetric
idx={p['id']:p for p in provinces}
for p in provinces:
    for n in p['nb']:
        if p['id'] not in idx[n]['nb']: idx[n]['nb'].append(p['id'])
fylker=[]
for f in fyl:
    g=proj(shape(f['geometry'])).buffer(0)
    fylker.append({'id':f['properties']['fylkesnummer'],'name':f['properties']['name'],'rings':rings(g)})

sval_rings=[[px(*c) for c in p.exterior.coords] for p in sg.geoms if p.area>=3e8]
from shapely.errors import GEOSException
countries=[]
for f in world:
    try:
        g=proj(shape(f['geometry'])).buffer(0)
    except Exception: continue
    if g.is_empty: continue
    polys=[g] if g.geom_type=='Polygon' else list(g.geoms)
    rings=[]
    for p in polys:
        if p.area<5e8: continue
        cs=[px(*c) for c in p.exterior.coords]
        if any((not math.isfinite(v)) or abs(v)>1e6 for c in cs for v in c): continue
        rings.append(cs)
    if not rings: continue
    c=g.representative_point(); nm=f['properties']['NAME']
    if not (math.isfinite(c.x) and math.isfinite(c.y)): continue
    countries.append({'n':nm,'key':nm in KEY,'c':px(c.x,c.y),'rings':rings})
print('countries',len(countries))
sc=sg.representative_point()
out={'width':round(W*S),'height':round(H*S),'mainland_top':round((maxy-mainmaxy)*S),'provinces':provinces,'fylker':fylker,
     'svalbard':{'c':px(sc.x,sc.y),'area_km2':round(sg.area/1e6),'rings':sval_rings},'countries':countries}
json.dump(out,open('map.json','w'),separators=(',',':'),ensure_ascii=False)
import os; print(os.path.getsize('map.json'), len(provinces), out['width'], sum(len(p['nb']) for p in provinces)/len(provinces))
print([p['name'] for p in provinces if not p['nb']])

# merge opinion/statistics (computed in ssb/opinion.json)
import os
if os.path.exists('ssb/opinion.json'):
    op=json.load(open('ssb/opinion.json'))
    M=json.load(open('map.json'))
    for p in M['provinces']:
        o=op.get(p['id'])
        if o: p['op']=[o['c'],o['m'],o['t']]; p['pop']=o['pop']; p['dens']=o['dens']; p['ind']=o['ind']; p['agri']=o['agri']; p['edu']=o['edu']; p['pub']=o['pub']
    json.dump(M,open('map.json','w'),separators=(',',':'),ensure_ascii=False)
    print('opinion merged')
