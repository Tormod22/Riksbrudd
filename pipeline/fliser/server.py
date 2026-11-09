"""Liten testserver for site/ som støtter Range (slik Vercel gjør), så PMTiles kan prøves lokalt.
Bruk: python3 server.py ../../site   -> http://localhost:8765"""
import http.server, os, re, sys
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def send_head(self):
        p=self.translate_path(self.path)
        if os.path.isdir(p):
            p=os.path.join(p,'index.html')
        elif not os.path.exists(p) and os.path.exists(p+'.html'): p+='.html'
        elif not os.path.exists(p) and os.path.isdir(p.rstrip('/')): p=os.path.join(p,'index.html')
        if not os.path.exists(p): self.send_error(404); return None
        size=os.path.getsize(p); f=open(p,'rb'); rng=self.headers.get('Range')
        ct=self.guess_type(p)
        if rng:
            a,b=re.match(r'bytes=(\d+)-(\d*)',rng).groups(); a=int(a); b=int(b) if b else size-1; b=min(b,size-1)
            self.send_response(206); self.send_header('Content-Range',f'bytes {a}-{b}/{size}'); self.send_header('Content-Length',str(b-a+1))
            self.send_header('Content-Type',ct); self.end_headers(); f.seek(a); self.wfile.write(f.read(b-a+1)); f.close(); return None
        self.send_response(200); self.send_header('Content-Type',ct); self.send_header('Content-Length',str(size)); self.send_header('Accept-Ranges','bytes'); self.end_headers(); return f
os.chdir(sys.argv[1]); http.server.ThreadingHTTPServer(('',int(os.environ.get('PORT','8765'))),H).serve_forever()
