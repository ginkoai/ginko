#!/bin/bash

# Serve handoff via local web server for browser access

EMAIL=$(git config user.email)
SAFE_USERNAME=$(echo "$EMAIL" | sed 's/@/-at-/g' | sed 's/\./-/g')
HANDOFF_PATH=".ginko/sessions/$SAFE_USERNAME/session-handoff.md"

if [ ! -f "$HANDOFF_PATH" ]; then
    echo "❌ No handoff found"
    exit 1
fi

echo "🌐 Starting local server for handoff..."
echo "📋 Share this URL with Claude.ai:"
echo ""
echo "http://localhost:8080/handoff.md"
echo ""
echo "Press Ctrl+C to stop"

# Simple Python HTTP server serving just the handoff
python3 -c "
import http.server
import socketserver

class HandoffHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/handoff.md':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open('$HANDOFF_PATH', 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404)

with socketserver.TCPServer(('', 8080), HandoffHandler) as httpd:
    httpd.serve_forever()
"