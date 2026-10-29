#!/usr/bin/env python3
"""#1309 stand-in for a network thermal printer: accepts ESC/POS jobs on a TCP port and keeps every job as
<outdir>/job-<n>.bin plus a readable <outdir>/job-<n>.txt (printable text only, QR/image blocks dropped), so a flow can
check what the app really sent (note, bank block, account number) instead of reading a picture.
The emulator reaches the host as 10.0.2.2. Usage: escpos-capture.py <port> <outdir>"""
import os, re, socketserver, sys, threading

port, out = int(sys.argv[1]), sys.argv[2]
os.makedirs(out, exist_ok=True)
lock, counter = threading.Lock(), [len([f for f in os.listdir(out) if f.endswith(".bin")])]

def readable(data: bytes) -> str:
    data = re.sub(rb"\x1d\(k.{2}.*?(?=\x1d\(k|\x1b|\n|$)", b"[QR]", data, flags=re.S)  # GS ( k ... QR commands
    data = re.sub(rb"\x1d\x76\x30.*", b"[IMAGE]", data, flags=re.S)
    data = re.sub(rb"\x1b[@!-~].?", b"", data)   # ESC x n
    data = re.sub(rb"\x1d.[\x00-\xff]?", b"", data)
    return "".join(chr(b) if 32 <= b < 127 or b == 10 else (" " if b == 0 else "") for b in data)

class H(socketserver.BaseRequestHandler):
    def handle(self):
        buf = b""
        while True:
            chunk = self.request.recv(65536)
            if not chunk: break
            buf += chunk
        with lock:
            counter[0] += 1; n = counter[0]
        open(f"{out}/job-{n}.bin", "wb").write(buf)
        open(f"{out}/job-{n}.txt", "w").write(readable(buf))
        print(f"job {n}: {len(buf)} bytes", flush=True)

socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", port), H) as s:
    print(f"listening on {port}", flush=True)
    s.serve_forever()
