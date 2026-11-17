"""Tar i bruk en ferdig bygget versjon av kaiene: setter KAIER_TAG i site/dovre-fliser/spill/kaier.js.
Sjekker først at releasen finnes og har manifest.json. Bruk: python3 bruk_kaier.py kart-kaier-<hash>   (kjør versjon.py etterpå)"""
import os, re, sys, json, urllib.request
tag = sys.argv[1]; assert re.fullmatch(r'kart-kaier-[0-9a-f]{12}', tag), tag
m = json.load(urllib.request.urlopen(f'https://github.com/Tormod22/Riksbrudd/releases/download/{tag}/manifest.json', timeout=60))
assert m.get('versjon') == tag, m.get('versjon')
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser', 'spill', 'kaier.js')
s = open(p, encoding='utf-8').read(); s, n = re.subn(r"const KAIER_TAG = '[^']*';", f"const KAIER_TAG = '{tag}';", s); assert n == 1
open(p, 'w', encoding='utf-8').write(s)
print(tag, 'tatt i bruk:', m['statistikk'], m['filer']['kaier'][0]['byte'] // 1000, 'KB')
