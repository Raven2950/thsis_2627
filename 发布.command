#!/bin/bash
# Double-click to publish right now. (It also happens on its own every 15 minutes; see README.)
# Publishes vault/ only, except 附件/, PDFs, 私密/, drafts (draft: true) and private moodboard images.
cd "$(dirname "$0")" || exit 1
echo "正在发布…"
if bash scripts/publish.sh; then
  echo ""
  echo "✓ 好了。大约 1 分钟后网站更新："
  echo "  https://raven2950.github.io/thsis_2627/app/"
  sleep 4
else
  echo "发布失败，请截图这个窗口发给 Claude。"; read -r -p "按回车关闭"
fi
