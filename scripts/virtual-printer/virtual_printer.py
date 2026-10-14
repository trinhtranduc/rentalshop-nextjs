#!/usr/bin/env python3
"""Virtual ESC/POS network printer for testing AnyRent printing (#970).

Usage:  python3 virtual_printer.py [--port 9100] [--out DIR] [--no-open] [ADDR ...]
        default ADDR: 127.0.0.1 and the Mac's Wi-Fi/LAN IP (ipconfig getifaddr en0/en1)

Each job is saved as job-<n>.bin (raw bytes), job-<n>.txt (readable text with
the ESC/POS commands decoded) and job-<n>.png (receipt preview incl. raster
images), and the PNG is opened on screen. Needs Python 3; Pillow for the PNG.
It binds the given addresses (not *), so it can run next to another listener on *:9100.
"""
import argparse, datetime, os, socket, subprocess, sys, tempfile, threading

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # still saves .bin/.txt without Pillow
    Image = None

PAPER_PX = 576  # 80 mm @ 203 dpi
COLS = 48
lock = threading.Lock()
counter = [0]


def font(size):
    for p in ("/System/Library/Fonts/Menlo.ttc",
              "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
              "/Library/Fonts/Arial Unicode.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def raster_image(width_bytes, height, bits):
    if Image is None:
        return None
    img = Image.new("1", (width_bytes * 8, height), 1)
    px = img.load()
    for y in range(height):
        for xb in range(width_bytes):
            i = y * width_bytes + xb
            b = bits[i] if i < len(bits) else 0
            for k in range(8):
                if b & (0x80 >> k):
                    px[xb * 8 + k, y] = 0
    return img


def parse(data):
    """Returns a list of blocks: ('text', str, align, bold, scale) / ('img', PIL, align) / ('note', str)."""
    blocks, buf = [], bytearray()
    st = {"align": 0, "bold": False, "scale": 1}
    notes = []

    def flush():
        if buf:
            text = buf.decode("utf-8", errors="replace")
            for line in text.split("\n"):
                blocks.append(("text", line, st["align"], st["bold"], st["scale"]))
            if text.endswith("\n"):
                blocks.pop()  # trailing empty piece of split
            buf.clear()

    i, n = 0, len(data)
    while i < n:
        b = data[i]
        if b == 0x1B and i + 1 < n:  # ESC
            c = data[i + 1]
            if c == 0x40: flush(); st.update(align=0, bold=False, scale=1); notes.append("ESC @ init"); i += 2; continue
            if c == 0x61 and i + 2 < n: flush(); st["align"] = data[i + 2] % 48 if data[i + 2] >= 48 else data[i + 2]; i += 3; continue
            if c in (0x45, 0x47) and i + 2 < n: flush(); st["bold"] = bool(data[i + 2] & 1); i += 3; continue
            if c == 0x21 and i + 2 < n: flush(); m = data[i + 2]; st["bold"] = bool(m & 0x08); st["scale"] = 2 if (m & 0x30) else 1; i += 3; continue
            if c == 0x64 and i + 2 < n: flush(); blocks.extend([("text", "", 0, False, 1)] * data[i + 2]); i += 3; continue
            if c == 0x4A and i + 2 < n: flush(); i += 3; continue
            if c in (0x74, 0x52, 0x2D, 0x4D, 0x20, 0x33, 0x56, 0x7B) and i + 2 < n: i += 3; continue
            if c == 0x32: i += 2; continue
            if c == 0x2A and i + 4 < n:  # ESC * m nL nH d1..dk (column bit image)
                flush(); m = data[i + 2]; cols = data[i + 3] + data[i + 4] * 256
                bpc = 3 if m in (32, 33) else 1
                d = data[i + 5:i + 5 + cols * bpc]
                if Image is not None:
                    img = Image.new("1", (cols, 8 * bpc), 1); px = img.load()
                    for x in range(cols):
                        for k in range(bpc):
                            byte = d[x * bpc + k] if x * bpc + k < len(d) else 0
                            for bit in range(8):
                                if byte & (0x80 >> bit):
                                    px[x, k * 8 + bit] = 0
                    blocks.append(("img", img, st["align"]))
                notes.append(f"ESC * bit image m={m} cols={cols}")
                i += 5 + cols * bpc; continue
            notes.append(f"ESC 0x{c:02X} (skipped)"); i += 2; continue
        if b == 0x1D and i + 1 < n:  # GS
            c = data[i + 1]
            if c == 0x21 and i + 2 < n: flush(); m = data[i + 2]; st["scale"] = max(1, min(3, (m >> 4) + 1, (m & 0xF) + 1) if m else 1); i += 3; continue
            if c == 0x56:  # cut
                flush(); blocks.append(("note", "------------- CUT -------------"))
                i += 4 if (i + 2 < n and data[i + 2] in (65, 66, 0x41, 0x42)) else 3; continue
            if c == 0x76 and i + 7 < n and data[i + 2] == 0x30:  # GS v 0 m xL xH yL yH
                flush(); xb = data[i + 4] + data[i + 5] * 256; h = data[i + 6] + data[i + 7] * 256
                bits = data[i + 8:i + 8 + xb * h]
                img = raster_image(xb, h, bits)
                if img is not None:
                    blocks.append(("img", img, st["align"]))
                notes.append(f"GS v 0 raster {xb * 8}x{h}")
                i += 8 + xb * h; continue
            if c == 0x28 and i + 4 < n and data[i + 2] == 0x6B:  # GS ( k  (QR)
                pl = data[i + 3] + data[i + 4] * 256
                body = data[i + 5:i + 5 + pl]
                if len(body) >= 3 and body[1] == 0x50 and body[2] == 0x30:
                    flush(); payload = body[3:].decode("utf-8", errors="replace")
                    blocks.append(("qr", payload, st["align"]))
                    notes.append(f"QR: {payload}")
                i += 5 + pl; continue
            if c in (0x42, 0x48, 0x66, 0x68, 0x77, 0x4C) and i + 2 < n: i += 3; continue
            notes.append(f"GS 0x{c:02X} (skipped)"); i += 2; continue
        if b in (0x0A,):
            buf.append(b); i += 1; continue
        if b < 0x20 and b not in (0x09,):
            i += 1; continue
        buf.append(b); i += 1
    flush()
    return blocks, notes


def render_txt(blocks, notes):
    out = []
    for blk in blocks:
        if blk[0] == "text":
            _, t, a, bold, sc = blk
            t = t.upper() if bold and sc > 1 else t
            out.append(t.center(COLS) if a == 1 else (t.rjust(COLS) if a == 2 else t))
        elif blk[0] == "img":
            out.append(f"[image {blk[1].width}x{blk[1].height}]".center(COLS))
        elif blk[0] == "qr":
            out.append(f"[QR] {blk[1]}")
        else:
            out.append(blk[1])
    return "\n".join(out) + "\n\n# commands: " + "; ".join(notes) + "\n"


def render_png(blocks, path):
    if Image is None:
        return False
    pieces, y = [], 10
    for blk in blocks:
        if blk[0] in ("text", "note"):
            text = blk[1]
            a, bold, sc = (blk[2], blk[3], blk[4]) if blk[0] == "text" else (1, False, 1)
            f = font(19 * sc)
            h = 30 * sc
            pieces.append(("t", text, a, bold, f, y)); y += h
        elif blk[0] == "img":
            img = blk[1]
            if img.width > PAPER_PX:
                img = img.resize((PAPER_PX, int(img.height * PAPER_PX / img.width)))
            pieces.append(("i", img, blk[2], y)); y += img.height + 4
        elif blk[0] == "qr":
            pieces.append(("t", "[QR] " + blk[1][:60], 1, False, font(16), y)); y += 26
    canvas = Image.new("RGB", (PAPER_PX + 40, y + 20), "white")
    d = ImageDraw.Draw(canvas)
    for p in pieces:
        if p[0] == "t":
            _, text, a, bold, f, yy = p
            w = d.textlength(text, font=f)
            x = 20 + (PAPER_PX - w) / 2 if a == 1 else (20 + PAPER_PX - w if a == 2 else 20)
            d.text((x, yy), text, fill="black", font=f)
            if bold:
                d.text((x + 1, yy), text, fill="black", font=f)
        else:
            _, img, a, yy = p
            x = 20 + (PAPER_PX - img.width) // 2 if a == 1 else (20 + PAPER_PX - img.width if a == 2 else 20)
            canvas.paste(img.convert("RGB"), (x, yy))
    canvas.save(path)
    return True


def handle(conn, addr, out_dir, auto_open, bound):
    data = bytearray()
    conn.settimeout(3)
    try:
        while True:
            d = conn.recv(65536)
            if not d:
                break
            data += d
    except Exception:
        pass
    conn.close()
    with lock:
        counter[0] += 1
        n = counter[0]
    base = os.path.join(out_dir, f"job-{n}")
    open(base + ".bin", "wb").write(data)
    blocks, notes = parse(bytes(data))
    open(base + ".txt", "w").write(render_txt(blocks, notes))
    has_png = render_png(blocks, base + ".png")
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"{ts}  job {n}: {len(data)} bytes from {addr[0]} (to {bound}) -> {base}.txt" + (" .png" if has_png else ""), flush=True)
    if auto_open:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        try:
            subprocess.Popen([opener, base + (".png" if has_png else ".txt")])
        except OSError:
            pass


def serve(addr, port, out_dir, auto_open):
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind((addr, port))
    except OSError as e:
        print(f"!! cannot listen on {addr}:{port} ({e})", flush=True)
        return
    s.listen(5)
    print(f"Virtual printer listening on {addr}:{port}", flush=True)
    while True:
        c, a = s.accept()
        threading.Thread(target=handle, args=(c, a, out_dir, auto_open, addr), daemon=True).start()


def lan_ip():
    for iface in ("en0", "en1"):
        try:
            ip = subprocess.run(["ipconfig", "getifaddr", iface], capture_output=True, text=True).stdout.strip()
        except OSError:
            return None
        if ip:
            return ip
    return None


def main():
    ap = argparse.ArgumentParser(description="Virtual ESC/POS network printer for AnyRent")
    ap.add_argument("addrs", nargs="*", metavar="ADDR", help="addresses to listen on (default: 127.0.0.1 + LAN IP)")
    ap.add_argument("--port", type=int, default=9100, help="TCP port (default 9100; the apps print to 9100)")
    ap.add_argument("--out", default=os.path.join(tempfile.gettempdir(), "anyrent-virtual-printer"),
                    help="folder for job-N.bin/.txt/.png")
    ap.add_argument("--no-open", action="store_true", help="do not open each printed job")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    addrs = args.addrs or ["127.0.0.1"] + [ip for ip in [lan_ip()] if ip]
    print(f"Jobs are saved in {args.out}. Enter one of {addrs} as the printer IP in AnyRent "
          f"(Android emulator: 10.0.2.2). Ctrl+C to stop.", flush=True)
    for a in addrs:
        threading.Thread(target=serve, args=(a, args.port, args.out, not args.no_open), daemon=True).start()
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
