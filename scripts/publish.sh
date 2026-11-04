#!/bin/bash
# Publish the vault: commit what changed under vault/ and push; GitHub rebuilds the site in ~1 minute.
# Run by the 发布 button in the app (it writes vault/_系统/发布请求.json, which the launchd agent
# from scripts/install-autopublish.sh watches) or by double-clicking 发布.command.
# Only vault/ is published from here; code changes are committed separately.
# The result goes to vault/_系统/发布状态.json so the app can show it (that file is never published).
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.local/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
done_with() {  # ok|none|fail, message
  printf '{"at":%s,"result":"%s","message":"%s"}\n' "$(date +%s)000" "$1" "$2" > vault/_系统/发布状态.json
  echo "$(date '+%F %T') $2"
}
[ -e .git/index.lock ] && { done_with fail "git 正忙，稍后再试"; exit 0; }

python3 scripts/private-paths.py
git add -A vault
if git diff --cached --quiet; then
  done_with none "没有新的改动"
  exit 0
fi
git commit -q -m "发布 $(date '+%Y-%m-%d %H:%M')" || { done_with fail "提交失败"; exit 1; }
# ~/.gitconfig routes GitHub through a local proxy (127.0.0.1:7897); if it isn't running, go direct.
if git push -q 2>/dev/null || git -c "http.https://github.com.proxy=" push -q; then
  done_with ok "已发布"
else
  done_with fail "推送失败，检查网络后再试"; exit 1
fi
