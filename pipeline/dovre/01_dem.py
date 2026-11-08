"""Henter terrengfliser (Terrarium, AWS elevation-tiles-prod) for et bbox og lager dem.npy + meta.json.
Erstatt gjerne med Kartverkets DTM10 fra hoydedata.no for bedre oppløsning."""
import math, urllib.request, io, json, numpy as np
from PIL import Image
lon0,lat0,lon1,lat1 = 8.95, 61.95, 9.75, 62.35   # Dombås/Dovrefjell
z=12
def t(lon,lat,z):
    n=2**z; x=int((lon+180)/360*n); y=int((1-math.log(math.tan(math.radians(lat))+1/math.cos(math.radians(lat)))/math.pi)/2*n); return x,y
x0,y1=t(lon0,lat0,z); x1,y0=t(lon1,lat1,z)
W=(x1-x0+1)*256; H=(y1-y0+1)*256; dem=np.zeros((H,W),dtype=np.float32)
for x in range(x0,x1+1):
    for y in range(y0,y1+1):
        u=f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        im=np.array(Image.open(io.BytesIO(urllib.request.urlopen(u,timeout=60).read())).convert('RGB')).astype(np.float32)
        dem[(y-y0)*256:(y-y0+1)*256,(x-x0)*256:(x-x0+1)*256]=im[:,:,0]*256+im[:,:,1]+im[:,:,2]/256-32768
np.save('dem.npy',dem)
n=2**z
def tile2lonlat(x,y): return x/n*360-180, math.degrees(math.atan(math.sinh(math.pi*(1-2*y/n))))
tl=tile2lonlat(x0,y0); br=tile2lonlat(x1+1,y1+1)
json.dump({'z':z,'x0':x0,'y0':y0,'W':W,'H':H,'lon0':tl[0],'lat0':tl[1],'lon1':br[0],'lat1':br[1]},open('meta.json','w'))
