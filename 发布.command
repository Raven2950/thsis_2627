#!/bin/bash
# Double-click in Finder to publish: commits everything in this folder (except what .gitignore
# keeps private: 附件/, PDFs, vault/私密/, and images of moodboards not marked public) and pushes; GitHub then rebuilds the site in ~1 minute.
cd "$(dirname "$0")" || exit 1

# Moodboard images are private unless the board is marked public (灵感板 page). The repo is public
# too, so private boards' images are kept out of git altogether, not just off the website.
python3 - <<'PY'
import json, os, subprocess
try: boards = json.load(open('vault/_系统/灵感板.json')).get('boards', {})
except (OSError, ValueError): boards = {}
base = 'vault/灵感板/图片'
private = sorted(f'{base}/{n}/' for n in (os.listdir(base) if os.path.isdir(base) else []) if not boards.get(n, {}).get('public'))
path = '.git/info/exclude'
lines = open(path).read().split('\n') if os.path.exists(path) else []
start = '# 灵感板（不公开）'
if start in lines: lines = lines[:lines.index(start)]
lines = [l for l in lines if l] + [start] + [f'/{p}' for p in private]
open(path, 'w').write('\n'.join(lines) + '\n')
for p in private:
    subprocess.run(['git', 'rm', '-r', '--cached', '--quiet', '--ignore-unmatch', p])
PY

git add -A
if git diff --cached --quiet; then
  echo "没有新的改动，不需要发布。"
else
  git commit -q -m "更新 $(date '+%Y-%m-%d %H:%M')" && echo "已提交本地改动。"
fi

echo "正在推送到 GitHub…"
# ~/.gitconfig routes GitHub through a local proxy (127.0.0.1:7897); if it isn't running, go direct.
if ! git push -q 2>/dev/null; then
  git -c "http.https://github.com.proxy=" push -q || { echo "推送失败，请截图这个窗口发给 Claude。"; read -r -p "按回车关闭"; exit 1; }
fi

echo ""
echo "✓ 已发布。大约 1 分钟后网站更新："
echo "  https://raven2950.github.io/thsis_2627/"
sleep 4
