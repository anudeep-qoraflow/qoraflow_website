#!/bin/sh
# Rebuilds the images used in Qoraflow emails (served from qoraflow.com/email/).
# Uses headless Google Chrome to run email-assets/render.html, then saves the PNGs.
# Run from the qoraflow-website folder:  sh email-assets/build.sh
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"
"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$TMP/profile" \
  --virtual-time-budget=15000 --dump-dom "file://$PWD/email-assets/render.html" > "$TMP/dom.html" 2>/dev/null
python3 - "$TMP/dom.html" <<'EOF'
import base64, html, json, re, sys
dom = open(sys.argv[1]).read()
m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
data = json.loads(html.unescape(m.group(1))) if m and m.group(1).strip() else {}
if not data or "__error" in data:
    sys.exit("render failed: " + str(data.get("__error", "no output")))
print("fonts:", data.pop("__fonts", "?"))
import io
from PIL import Image
for name, b64 in data.items():
    raw = base64.b64decode(b64)
    if name in ("hero.png",):  # photos: compressed JPEG keeps emails light
        jpg = "email/" + name.replace(".png", ".jpg")
        Image.open(io.BytesIO(raw)).convert("RGB").save(jpg, "JPEG", quality=86, optimize=True, progressive=True)
        print("wrote " + jpg)
    else:
        open("email/" + name, "wb").write(raw)
        print("wrote email/" + name)
EOF
rm -rf "$TMP"
