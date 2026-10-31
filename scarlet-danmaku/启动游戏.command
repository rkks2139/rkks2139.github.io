#!/bin/bash
# 紅魔弾幕録 — macOS / Linux launcher
cd "$(dirname "$0")" || exit 1
PORT=8137

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "未找到 Python，直接打开 index.html 也可以游玩。"
  open index.html 2>/dev/null || xdg-open index.html 2>/dev/null
  exit 0
fi

"$PY" -m http.server "$PORT" --bind 127.0.0.1 >/tmp/scarlet-danmaku-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT INT TERM

sleep 1
URL="http://127.0.0.1:$PORT/"
echo "睦子米魔人 已启动：$URL"
open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null || echo "请手动打开 $URL"

wait "$SERVER_PID"
