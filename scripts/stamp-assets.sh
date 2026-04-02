#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

rev="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"

python3 - <<'PY'
from pathlib import Path
import re
import subprocess

root = Path.cwd()
index = root / 'index.html'
rev = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], text=True).strip()
text = index.read_text()
text = re.sub(r'href="style\.css(?:\?v=[^"]+)?"', f'href="style.css?v={rev}"', text)
text = re.sub(r'src="src/main\.js(?:\?v=[^"]+)?"', f'src="src/main.js?v={rev}"', text)
index.write_text(text)
PY

echo "Stamped asset versions with $rev"
