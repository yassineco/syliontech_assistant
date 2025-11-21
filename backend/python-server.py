#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

class ExtensionHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if self.path == '/demo/status':
            response = {
                'success': True,
                'data': {
                    'currentMode': 'PYTHON_SERVER_WORKING'
                }
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
    
    def do_POST(self):
        if self.path == '/api/genai/process':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                print(f"✅ Extension data received: {data}")
                
                response = {
                    'success': True,
                    'result': f"🎉 PYTHON SERVER WORKS!\n\nAction: {data.get('action', 'unknown')}\nText: {data.get('text', '')[:50]}...\n\n✅ Extension ↔ Python Server = OK!"
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                print(f"❌ Error: {e}")
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())

if __name__ == "__main__":
    PORT = 8080
    with socketserver.TCPServer(("", PORT), ExtensionHandler) as httpd:
        print(f"🐍 Python server running on http://localhost:{PORT}")
        print(f"🔗 Test: curl http://localhost:{PORT}/demo/status")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")