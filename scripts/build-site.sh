#!/usr/bin/env bash
# Build the public site into _site/: the app plus the vault (no attachments, PDFs, private notes or
# Obsidian settings), with vault/manifest.json listing the files so the page can find them.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site && mkdir -p _site
cp -R app _site/app
cp -R vault _site/vault
rm -rf _site/vault/.obsidian _site/vault/.trash _site/vault/附件 _site/vault/私密
find _site/vault -name '*.pdf' -delete
find _site/vault -name '.*' -type f -delete
python3 - <<'PY'
import json, os
root = '_site/vault'
files = sorted(os.path.relpath(os.path.join(d, f), root)
               for d, _, fs in os.walk(root) for f in fs if f != 'manifest.json')
json.dump({'files': files}, open(os.path.join(root, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
print(f'manifest: {len(files)} files')
PY
printf '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=app/"><a href="app/">Thesis Web</a>\n' > _site/index.html
