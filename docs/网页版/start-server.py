#!/usr/bin/env python3
"""正元养老金测算 - 网页版启动服务器
双击运行，然后在浏览器打开 http://localhost:8080
"""
import http.server
import socketserver
import webbrowser
import threading
import os

PORT = 8080
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    
    def log_message(self, format, *args):
        print(f'[服务器] {args[0]} {args[1]} {args[2]}')

print('╔══════════════════════════════════════════╗')
print('║   正元养老金测算 - 桌面版服务器            ║')
print('╠══════════════════════════════════════════╣')
print(f'║  📍 本地地址: http://localhost:{PORT}        ║')
print('║  🖥️  自动打开浏览器...                    ║')
print('║  ⏹️  按 Ctrl+C 关闭服务器                 ║')
print('╚══════════════════════════════════════════╝')
print()

# Open browser after a short delay
threading.Timer(1.5, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n服务器已关闭')
