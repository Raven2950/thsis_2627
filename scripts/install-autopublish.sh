#!/bin/bash
# Install (or remove with --remove) the macOS agent that runs scripts/publish.sh every 15 minutes.
LABEL=com.marginalia.autopublish
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
if [ "$1" = "--remove" ]; then rm -f "$PLIST"; echo "已关闭自动发布"; exit 0; fi
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$ROOT/scripts/publish.sh</string></array>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/marginalia-publish.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/marginalia-publish.log</string>
</dict></plist>
PL
launchctl bootstrap "gui/$(id -u)" "$PLIST" && echo "已开启自动发布：每 15 分钟一次，日志在 ~/Library/Logs/marginalia-publish.log"
