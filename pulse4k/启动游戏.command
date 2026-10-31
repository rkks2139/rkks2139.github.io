#!/bin/bash
cd "$(dirname "$0")"
TARGET="4kYOU.html"
[ -f "$TARGET" ] || TARGET="index.html"
if [ ! -f "$TARGET" ]; then
  echo "找不到 4kYOU.html / index.html"
  read -n 1 -s -r -p "按任意键退出"
  exit 1
fi
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "$TARGET"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -a "Microsoft Edge" "$TARGET"
else
  open "$TARGET"
fi
