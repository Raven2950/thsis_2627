#!/bin/bash
# Double-click in Finder to publish: commits everything in this folder (except what .gitignore
# keeps private: 附件/, PDFs, vault/私密/) and pushes; GitHub then rebuilds the site in ~1 minute.
cd "$(dirname "$0")" || exit 1

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
