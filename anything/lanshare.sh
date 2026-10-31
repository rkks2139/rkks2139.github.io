#!/usr/bin/env bash
# lanshare.sh —— 把当前目录（或指定目录）用局域网 HTTP 共享给手机/其它电脑
# 用法: ./lanshare.sh [目录] [端口]
# 手机连同一个 WiFi，浏览器打开打印出来的地址即可下载，速度 = 你的 WiFi 上限（几十 MB/s）
set -uo pipefail
DIR="${1:-$(pwd)}"
PORT="${2:-8000}"
cd "$DIR" || { echo "目录不存在: $DIR" >&2; exit 1; }

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
[ -z "$IP" ] && IP=$(ifconfig 2>/dev/null | awk '/inet 192\.|inet 10\./{print $2; exit}')

cat <<EOF
共享目录: $DIR
文件数  : $(ls -1 | wc -l | tr -d ' ')，合计 $(du -sh . 2>/dev/null | cut -f1)
在手机浏览器打开:  http://${IP:-本机IP}:$PORT
（iPhone 用 Safari；下载后在「文件」里长按 → 共享 → 微信，即可发给文件传输助手）
按 Ctrl-C 停止
EOF
exec python3 -m http.server "$PORT" --bind 0.0.0.0
