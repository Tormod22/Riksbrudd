"""Søker Landsat 5 (Collection 2, Level 2) i Microsoft Planetary Computer, laster ned bånd for to striper
fra samme dato, syr dem sammen og resampler DEM til Landsat-nettet (UTM 32, 30 m). Krever rasterio.
Bruk GDAL_HTTP_UNSAFESSL=YES bak proxy."""
import json, urllib.request, urllib.parse, rasterio, numpy as np, math
from rasterio.warp import transform_bounds, reproject, Resampling
from rasterio.windows import from_bounds
from rasterio.transform import from_bounds as tfb, Affine
BBOX=[8.88,61.94,9.76,62.39]
q={"collections":["landsat-c2-l2"],"bbox":BBOX,"datetime":"1984-06-01T00:00:00Z/1989-09-30T23:59:59Z","query":{"eo:cloud_cover":{"lt":30},"platform":{"in":["landsat-5"]}},"limit":50}
req=urllib.request.Request("https://planetarycomputer.microsoft.com/api/stac/v1/search",data=json.dumps(q).encode(),headers={"Content-Type":"application/json"})
js=json.load(urllib.request.urlopen(req,timeout=90)); feats={f['id']:f for f in js['features']}
def sign(h): return json.load(urllib.request.urlopen("https://planetarycomputer.microsoft.com/api/sas/v1/sign?href="+urllib.parse.quote(h,safe='')))['href']
SCENES=['LT05_L2SP_199017_19870813_02_T1','LT05_L2SP_199016_19870813_02_T1']  # sør + nord, samme dato
BANDS=['red','green','blue','nir08','swir16']
mos={}; meta=None
for sid in SCENES:
    f=feats[sid]
    for b in BANDS:
        with rasterio.open(sign(f['assets'][b]['href'])) as src:
            bb=transform_bounds('EPSG:4326',src.crs,*BBOX); win=from_bounds(*bb,transform=src.transform)
            arr=src.read(1,window=win).astype(np.float32)
            if meta is None: meta={'crs':str(src.crs),'transform':list(src.window_transform(win))[:6],'shape':list(arr.shape)}
            if b not in mos: mos[b]=arr
            else: m=(mos[b]==0); mos[b][m]=arr[m]
T=Affine(*meta['transform'])
dm=json.load(open('meta.json')); dem=np.load('dem.npy')
def m(lon,lat): return lon*20037508.34/180, math.log(math.tan((90+lat)*math.pi/360))/(math.pi/180)*20037508.34/180
x0,y0=m(dm['lon0'],dm['lat0']); x1,y1=m(dm['lon1'],dm['lat1'])
out=np.zeros(mos['red'].shape,dtype=np.float32)
reproject(dem,out,src_transform=tfb(x0,y1,x1,y0,dm['W'],dm['H']),src_crs='EPSG:3857',dst_transform=T,dst_crs=meta['crs'],resampling=Resampling.bilinear)
mos['dem']=out
np.savez('mosaic.npz',**mos); json.dump(meta,open('landsat_meta.json','w')); print('ok',meta)
