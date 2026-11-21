"""Testserver for fiks-teknisk: site/ med Range, /norge -> /dovre-fliser, og /api/kart/... hentet fra den ekte siden med disklager.
Bruk: PORT=8789 python3 pipeline/fliser/dev.py site   (hurtiglager i $RB_APICACHE, standard /tmp/rb-apicache)
Miljø: API=feil (alle /api/kart gir 500), API=heng (svarer aldri)."""
import http.server, os, re, sys, ssl, urllib.request, time, threading
ROT = sys.argv[1]; LAGER = os.environ.get('RB_APICACHE', '/tmp/rb-apicache'); os.makedirs(LAGER, exist_ok=True)
GAMLE = []
CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt') if os.path.exists('/root/.ccr/ca-bundle.crt') else ssl.create_default_context()
MODUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api-modus-' + os.environ.get('PORT', '8765'))   # fil med 'feil' / 'heng' / tom: kan byttes mens serveren går
def modus():
    try: return open(MODUS).read().strip()
    except OSError: return os.environ.get('API', '')
class H(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def svar(self, kode, data, ct='application/octet-stream', ekstra=()):
        self.send_response(kode); self.send_header('Content-Type', ct); self.send_header('Content-Length', str(len(data)))
        for k, v in ekstra: self.send_header(k, v)
        self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        sti = self.path.split('?')[0]
        if sti.startswith('/api/kart/'):
            m = modus()
            if m == 'feil': return self.svar(500, b'{"feil":"test"}', 'application/json')
            if m == 'heng': time.sleep(600); return self.svar(504, b'')
            n = re.sub(r'[^a-zA-Z0-9.-]', '_', sti); f = os.path.join(LAGER, n)
            for g in [f] + [os.path.join(d, n) for d in GAMLE]:
                if os.path.exists(g): return self.svar(200, open(g, 'rb').read())
            try:
                with urllib.request.urlopen('https://riksbrudd.vercel.app' + sti, timeout=40, context=CTX) as r: data = r.read()
                open(f + '.tmp', 'wb').write(data); os.replace(f + '.tmp', f); return self.svar(200, data)
            except urllib.error.HTTPError as e: return self.svar(e.code, b'{}', 'application/json')
            except Exception as e: return self.svar(502, str(e).encode(), 'text/plain')
        if sti in ('/norge', '/norge/', '/rogaland', '/rogaland/'): sti = '/dovre-fliser/'
        p = os.path.join(ROT, sti.lstrip('/'))
        if os.path.isdir(p): p = os.path.join(p, 'index.html')
        elif not os.path.exists(p) and os.path.exists(p + '.html'): p += '.html'
        if not os.path.exists(p): return self.svar(404, b'ikke funnet', 'text/plain')
        data = open(p, 'rb').read(); ct = self.guess_type(p); rng = self.headers.get('Range')
        if rng:
            a, b = re.match(r'bytes=(\d+)-(\d*)', rng).groups(); a = int(a); b = min(int(b) if b else len(data) - 1, len(data) - 1)
            return self.svar(206, data[a:b + 1], ct, [('Content-Range', f'bytes {a}-{b}/{len(data)}')])
        self.svar(200, data, ct, [('Accept-Ranges', 'bytes'), ('Cache-Control', 'no-cache')])
class S(http.server.ThreadingHTTPServer): daemon_threads = True
S(('', int(os.environ.get('PORT', '8765'))), H).serve_forever()
