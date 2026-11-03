#!/bin/bash
# Publish the vault: commit what changed under vault/ and push; GitHub rebuilds the site in ~1 minute.
# Run by 发布.command and, every 15 minutes, by the launchd agent (scripts/install-autopublish.sh).
# Only vault/ is published from here; code changes are committed separately.
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
[ -e .git/index.lock ] && { echo "git 正忙，下次再发布"; exit 0; }

python3 scripts/private-paths.py
git add -A vault
if git diff --cached --quiet; then
  echo "$(date '+%F %T') 没有新的改动"
  exit 0
fi
git commit -q -m "自动发布 $(date '+%Y-%m-%d %H:%M')" || exit 1
# ~/.gitconfig routes GitHub through a local proxy (127.0.0.1:7897); if it isn't running, go direct.
if git push -q 2>/dev/null || git -c "http.https://github.com.proxy=" push -q; then
  echo "$(date '+%F %T') 已发布"
else
  echo "$(date '+%F %T') 推送失败，下次再试"; exit 1
fi
