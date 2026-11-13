#!/usr/bin/env python3
"""MyTown 自检截图服务器 / 静态服务器.

用法:
    python tools/shotserver.py 8150

浏览器打开:
    http://127.0.0.1:8150/?v=33&sync=1

进入游戏后在控制台执行:
    await __game.captureAll({ upload: '/__shot' })

截图与 report.json 会保存到项目根目录的 shots/ 下。
"""
import base64
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'shots')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _safe_name(self, raw, ext):
        name = os.path.basename(raw or 'shot')
        keep = ''.join(c for c in name if c.isalnum() or c in '-_.')
        if not keep:
            keep = 'shot'
        if '.' not in keep:
            keep += ext
        return keep

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/__shot':
            self.send_error(404, 'unknown endpoint')
            return
        qs = parse_qs(parsed.query)
        name = (qs.get('name') or ['shot'])[0]
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        ctype = (self.headers.get('Content-Type') or '').lower()
        os.makedirs(SHOTS, exist_ok=True)

        if 'json' in ctype:
            fname = self._safe_name(name, '.json')
            data = body
            if fname == '_report.json':
                try:
                    data = json.dumps(json.loads(body.decode('utf-8')), ensure_ascii=False, indent=2).encode('utf-8')
                except Exception:
                    pass
        else:
            fname = self._safe_name(name, '.jpg')
            data = body
            # 允许 dataURL 文本（兼容旧的调用方式）
            if body[:5] == b'data:':
                data = base64.b64decode(body.split(b',', 1)[1])

        path = os.path.join(SHOTS, fname)
        with open(path, 'wb') as f:
            f.write(data)
        print('[shot] %s  %d bytes' % (fname, len(data)), flush=True)

        payload = json.dumps({'ok': True, 'file': fname, 'bytes': len(data)}).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        # 不缓存源码，改完刷新即可见
        if self.path.startswith('/src/') or self.path.endswith(('.html', '.css', '.js')):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        if str(fmt).startswith('POST'):
            return
        super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8150
    os.makedirs(SHOTS, exist_ok=True)
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print('MyTown 自检服务器: http://127.0.0.1:%d/  (截图目录: %s)' % (port, SHOTS), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == '__main__':
    main()
