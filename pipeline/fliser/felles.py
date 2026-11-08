"""Felles flisnett for Riksbrudd: hele Norge (og Svalbard) i EPSG:25833 (UTM 33, ETRS89), som Kartverket bruker.

Nivå z har oppløsning RES0 / 2**z meter per piksel og fliser på 256 x 256 piksler:
  z7 = 128 m, z9 = 32 m (Landsat), z11 = 8 m, z13 = 2 m, z14 = 1 m (Kartverkets DTM).
Flis (z, x, y) dekker x: X0 + x*span .. og y: Y0 - y*span (nedover), span = 256 * res(z).
Origo og størrelse dekker fastlandet og Svalbard med god margin.
"""
CRS = "EPSG:25833"
X0, Y0 = -200000.0, 9300000.0   # øvre venstre hjørne (meter); 9300 km nord dekker hele Svalbard (nordligst ca. 9023 km)
RES0 = 16384.0                   # meter per piksel på z0 (z0-flisen er 4194 km bred)
TILE = 256

def res(z): return RES0 / 2 ** z
def span(z): return TILE * res(z)
def tile_bounds(z, x, y):
    s = span(z); return (X0 + x * s, Y0 - (y + 1) * s, X0 + (x + 1) * s, Y0 - y * s)  # minx, miny, maxx, maxy
def tiles_for(bounds, z):
    minx, miny, maxx, maxy = bounds; s = span(z)
    return [(x, y) for x in range(int((minx - X0) // s), int((maxx - X0) // s) + 1)
                   for y in range(int((Y0 - maxy) // s), int((Y0 - miny) // s) + 1)]

# Dovre-testområdet (det samme som site/dovre, Landsat-utsnittet 13. aug 1987), i EPSG:25833
DOVRE = (182016.0, 6880000.0, 228000.0, 6930016.0)   # ca. 46 x 50 km, delelig med 32 m fra origo
# Kjernen rundt Dombås med 2 m høyde (viser hvor fint det kan bli)
DOMBAS = (189000.0, 6892000.0, 197000.0, 6900000.0)  # 8 x 8 km
