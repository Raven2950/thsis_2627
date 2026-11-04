#!/bin/bash
# Install (or remove with --remove) the macOS agent behind the app's 发布 button: it runs scripts/publish.sh
# whenever the app writes vault/_系统/发布请求.json. Nothing is published on a timer.
LABEL=com.marginalia.autopublish
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
if [ "$1" = "--remove" ]; then rm -f "$PLIST"; echo "已关闭发布按钮的后台程序"; exit 0; fi
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$ROOT/scripts/publish.sh</string></array>
  <key>WatchPaths</key><array><string>$ROOT/vault/_系统/发布请求.json</string></array>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/marginalia-publish.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/marginalia-publish.log</string>
</dict></plist>
PL
launchctl bootstrap "gui/$(id -u)" "$PLIST" && echo "发布按钮已就绪：点一下才发布，日志在 ~/Library/Logs/marginalia-publish.log"
