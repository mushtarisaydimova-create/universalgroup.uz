#!/usr/bin/env python3
"""
universalgroup.uz — Production Web & Real-Time Persistent Database Server
-------------------------------------------------------------------------
Serves static assets AND provides a persistent JSON database + Server-Sent
Events (SSE) real-time stream at:
  - GET  /api/state    -> Returns shared { content, lockout }
  - PUT  /api/state    -> Saves global Admin Panel content & broadcasts via SSE
  - PUT  /api/lockout  -> Saves global exponential lockout state & broadcasts
  - GET  /api/stream   -> Real-time EventSource stream for all connected visitors
"""
import json
import os
import queue
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(ROOT, "db")
STATE_FILE = os.path.join(DB_DIR, "state.json")
LOCK_for_DB = threading.Lock()
SUBSCRIBERS = set()


def load_db():
    os.makedirs(DB_DIR, exist_ok=True)
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"content": None, "lockout": None}


def save_db(doc):
    os.makedirs(DB_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)


def broadcast(payload):
    msg = f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
    dead = []
    for q in list(SUBSCRIBERS):
        try:
            q.put_nowait(msg)
        except Exception:
            dead.append(q)
    for q in dead:
        SUBSCRIBERS.discard(q)


class UGHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/state"):
            with LOCK_for_DB:
                doc = load_db()
            body = json.dumps(doc, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path.startswith("/api/stream"):
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            q = queue.Queue(maxsize=32)
            SUBSCRIBERS.add(q)
            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()
                while True:
                    try:
                        chunk = q.get(timeout=20)
                        self.wfile.write(chunk.encode("utf-8"))
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                SUBSCRIBERS.discard(q)
            return

        super().do_GET()

    def do_PUT(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            incoming = json.loads(raw)
        except Exception:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        if self.path.startswith("/api/state"):
            with LOCK_for_DB:
                doc = load_db()
                if "content" in incoming:
                    doc["content"] = incoming["content"]
                if "lockout" in incoming:
                    doc["lockout"] = incoming["lockout"]
                save_db(doc)
            broadcast(doc)
            self._json_ok(doc)
            return

        if self.path.startswith("/api/lockout"):
            with LOCK_for_DB:
                doc = load_db()
                doc["lockout"] = incoming
                save_db(doc)
            broadcast({"lockout": incoming})
            self._json_ok(doc["lockout"])
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def _json_ok(self, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), UGHandler)
    print(f"universalgroup.uz server running at http://localhost:{port}")
    server.serve_forever()
