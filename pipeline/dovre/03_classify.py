"""Klassifiserer arealtyper fra Landsat-bånd + høyde, lager hillshade og stil-1-tekstur (texture.png, cls.npy).
Klasser: 0 snaufjell/stein, 1 skog, 2 hei/gras, 3 vann, 4 snø, 5 dyrket mark, 6 myr."""
import numpy as np
from PIL import Image
d=np.load('mosaic.npz'); sc=lambda a: np.clip(a*0.0000275-0.2,0,1)
R,G,B,N,S=[sc(d[k]) for k in ['red','green','blue','nir08','swir16']]; dem=d['dem']
ndvi=(N-R)/(N+R+1e-6); ndwi=(G-N)/(G+N+1e-6); ndsi=(G-S)/(G+S+1e-6)
cls=np.zeros(R.shape,np.uint8)
cls[ndvi>0.15]=2
cls[(ndvi>0.5)&(dem<1050)]=1            # skoggrense ~1050 m på Dovre; juster per region
cls[(ndvi>0.55)&(dem<800)&(S>0.14)]=5
cls[(ndvi>0.3)&(ndvi<0.5)&(dem>800)&(S<0.1)&(N<0.2)]=6
cls[(ndsi>0.4)&(G>0.25)]=4
cls[(ndwi>0.1)&(N<0.12)]=3
np.save('cls.npy',cls)
gy,gx=np.gradient(dem,30.0); slope=np.arctan(np.hypot(gx,gy)); aspect=np.arctan2(-gx,gy)
az,alt=np.radians(315),np.radians(35)
hs=np.clip(np.sin(alt)*np.cos(slope)+np.cos(alt)*np.sin(slope)*np.cos(az-aspect),0,1)
pal={0:(128,116,96),1:(64,82,48),2:(136,128,86),3:(22,30,38),4:(222,220,208),5:(150,142,88),6:(108,104,70)}
tex=np.zeros(R.shape+(3,),np.float32)
for k,c in pal.items(): tex[cls==k]=c
rgb=np.dstack([R,G,B]); p2,p98=np.percentile(rgb[rgb>0],[2,98]); rgb=np.clip((rgb-p2)/(p98-p2),0,1); lum=rgb.mean(axis=2,keepdims=True)
tex=tex*(0.7+0.6*lum)*(0.5+0.7*hs[...,None]); tex[cls==3]=np.array(pal[3])*(0.9+0.3*hs[cls==3][...,None])
rng=np.random.default_rng(1); tex*=1+0.06*(rng.random(R.shape)[...,None]-0.5)
Image.fromarray(np.clip(tex,0,255).astype(np.uint8)).save('texture.png')
