#!/usr/bin/env bash
# Drive the Android app like a tester through adb + uiautomator (#395).
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/adb-ui.sh <command> [args]

Works on adb -s emulator-$E2E_AVD_PORT (default 5570). Refuses 5554/5556 (vm_pos, vm_kitchen).
Selectors match a node's text or content-desc exactly; prefix with ~ for a case-insensitive substring
("~Giao đồ"); @x,y taps raw coordinates.

  dump                    print visible nodes (text | content-desc | bounds); XML kept in $E2E_OUT/android/ui.xml
  has "<sel>"             exit 0 if the selector is on screen, 1 otherwise
  tap "<sel>" [n]         tap the n-th match (default 1)
  type "<text>"           type into the focused field (ASCII only: adb input text cannot type Vietnamese)
  back                    press Back
  swipe up|down           scroll the screen content up or down
  shot <name>             save a screenshot to $E2E_OUT/android/<name>.png
  wait "<sel>" [seconds]  wait until the selector appears (default 15 s); exit 1 on timeout
EOF
}

case "$E2E_AVD_PORT" in
  5554|5556) echo "REFUSED: emulator port $E2E_AVD_PORT belongs to vm_pos / vm_kitchen." >&2; exit 1 ;;
esac
SERIAL="emulator-$E2E_AVD_PORT"
ADB_BIN="$(command -v adb || echo "${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb")"
OUT_DIR="$E2E_OUT/android"
XML="$OUT_DIR/ui.xml"

adb_s() { "$ADB_BIN" -s "$SERIAL" "$@"; }

dump_xml() {
  mkdir -p "$OUT_DIR"
  adb_s shell uiautomator dump /sdcard/e2e-ui.xml >/dev/null 2>&1 || true
  adb_s exec-out cat /sdcard/e2e-ui.xml >"$XML"
}

# find <selector> <n> -> "x y" centre of the n-th matching node
find_node() {
  python3 - "$XML" "$1" "${2:-1}" <<'PY'
import re, sys, xml.etree.ElementTree as ET
path, sel, nth = sys.argv[1], sys.argv[2], int(sys.argv[3])
try:
    root = ET.parse(path).getroot()
except Exception:
    sys.exit(1)
sub = sel.startswith("~")
needle = sel[1:].casefold() if sub else sel
hits = []
for n in root.iter("node"):
    for v in (n.get("text") or "", n.get("content-desc") or ""):
        if (sub and needle in v.casefold()) or (not sub and v == needle):
            m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", n.get("bounds") or "")
            if m:
                x1, y1, x2, y2 = map(int, m.groups())
                if x2 > x1 and y2 > y1:
                    hits.append(((x1 + x2) // 2, (y1 + y2) // 2))
            break
if len(hits) < nth:
    sys.exit(1)
print(*hits[nth - 1])
PY
}

cmd="${1:-}"
[ $# -gt 0 ] && shift
case "$cmd" in
  -h|--help|"") usage; [ -n "$cmd" ] || exit 64 ;;
  dump)
    dump_xml
    python3 - "$XML" <<'PY'
import sys, xml.etree.ElementTree as ET
for n in ET.parse(sys.argv[1]).getroot().iter("node"):
    t, d = n.get("text") or "", n.get("content-desc") or ""
    if t or d:
        print(f"{t} | {d} | {n.get('bounds')}{' (clickable)' if n.get('clickable') == 'true' else ''}")
PY
    ;;
  has)
    dump_xml
    find_node "${1:?selector}" 1 >/dev/null ;;
  tap)
    sel="${1:?selector}"
    if [[ "$sel" == @* ]]; then
      xy="${sel#@}"; adb_s shell input tap "${xy%,*}" "${xy#*,}"
    else
      dump_xml
      if ! xy="$(find_node "$sel" "${2:-1}")"; then
        echo "tap: '$sel' not on screen" >&2; exit 1
      fi
      # shellcheck disable=SC2086
      adb_s shell input tap $xy
    fi
    sleep 1 ;;
  type)
    text="${1:?text}"
    adb_s shell input text "$(printf '%s' "$text" | sed -e 's/ /%s/g' -e "s/'/\\\\'/g")" ;;
  back) adb_s shell input keyevent 4; sleep 1 ;;
  swipe)
    size="$(adb_s shell wm size | awk -F': ' '/Physical/{print $2}' | tr -d '\r')"
    w="${size%x*}"; h="${size#*x}"; x=$((w / 2))
    case "${1:-}" in
      up) adb_s shell input swipe "$x" $((h * 7 / 10)) "$x" $((h * 3 / 10)) 300 ;;
      down) adb_s shell input swipe "$x" $((h * 3 / 10)) "$x" $((h * 7 / 10)) 300 ;;
      *) echo "swipe up|down" >&2; exit 64 ;;
    esac
    sleep 1 ;;
  shot)
    name="${1:?name}"; mkdir -p "$OUT_DIR"
    adb_s exec-out screencap -p >"$OUT_DIR/$name.png"
    echo "$OUT_DIR/$name.png" ;;
  wait)
    sel="${1:?selector}"; secs="${2:-15}"
    for _ in $(seq 1 "$secs"); do
      dump_xml
      if find_node "$sel" 1 >/dev/null; then exit 0; fi
      sleep 1
    done
    echo "wait: '$sel' did not appear in ${secs}s" >&2; exit 1 ;;
  *) echo "Unknown command: $cmd" >&2; usage >&2; exit 64 ;;
esac
