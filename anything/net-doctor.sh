#!/usr/bin/env bash
# net-doctor.sh —— 30 秒体检：出口线路 / 代理隧道 / 带宽 / WiFi / 磁盘
# 用法: ./net-doctor.sh          （可反复运行，改完代理设置后对比数字）
set -uo pipefail
say() { printf '%s\n' "$*"; }
hr() { printf '%s\n' "------------------------------------------------------------"; }

hr; say "1) 出口 IP 与落地位置"
GEO=$(curl -s --max-time 12 https://api.ip.sb/geoip || curl -s --max-time 12 https://ipinfo.io/json)
printf '%s' "$GEO" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('   (取不到出口信息)'); raise SystemExit
for k in ('ip','country','region','city','isp','organization'):
    if d.get(k): print(f'   {k:14s}: {d[k]}')
" 2>/dev/null
say "   ↑ 如果你人在国内，这里出现日本/新加坡/美国 = 流量被代理接管了"

hr; say "2) 是否有全局隧道劫持默认路由"
if netstat -rn -f inet 2>/dev/null | awk '$1=="default"{print $NF}' | grep -q '^utun'; then
  TUN=$(netstat -rn -f inet | awk '$1=="default" && $NF ~ /^utun/{print $NF; exit}')
  say "   ⚠️  默认路由指向 ${TUN}（TUN 全局代理），所有流量（含国内镜像）都在绕道"
  say "      → 需要开「分流 / 绕过大陆」，否则国内站点也会走国外节点"
else
  say "   ✅ 没有 TUN 全局代理"
fi

hr; say "3) 下载测速"
HF_URL="https://huggingface.co/openai-community/gpt2/resolve/main/pytorch_model.bin"
MIRROR_URL="https://hf-mirror.com/openai-community/gpt2/resolve/main/pytorch_model.bin"
CN_URL="https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/24.04/ubuntu-24.04.3-live-server-amd64.iso"

s=$(curl -sL -o /dev/null -r 0-10485760 --max-time 20 -w '%{speed_download}' "$HF_URL")
say "   HuggingFace 单线程 : $(( ${s%.*} / 1024 )) KB/s"
s=$(curl -sL -o /dev/null -r 0-10485760 --max-time 20 -w '%{speed_download}' "$MIRROR_URL")
say "   hf-mirror   单线程 : $(( ${s%.*} / 1024 )) KB/s"
s=$(curl -sL -o /dev/null -r 0-10485760 --max-time 20 -w '%{speed_download}' "$CN_URL")
say "   清华镜像    单线程 : $(( ${s%.*} / 1024 )) KB/s"
say "   ↑ 清华镜像本该有 10 MB/s 以上。如果这里也只有几百 KB/s，说明国内流量也在绕国外节点。"

if command -v aria2c >/dev/null; then
  D=$(mktemp -d)
  aria2c -x8 -s8 -k1M --file-allocation=none --console-log-level=error --summary-interval=5 \
    -d "$D" -o t.bin "$HF_URL" >"$D/log" 2>&1 &
  P=$!; sleep 12; kill -9 $P 2>/dev/null; wait 2>/dev/null
  R=$(grep -oE 'DL:[0-9.]+[KMG]iB' "$D/log" | tail -1)
  say "   aria2 8 连接      : ${R:-未测出}   ← 这才是实际下载速度"
  rm -rf "$D"
fi

hr; say "4) WiFi 链路"
system_profiler SPAirPortDataType 2>/dev/null | awk '
  /Current Network Information/{f=1}
  f && /PHY Mode|Channel|Signal|Transmit Rate/{gsub(/^ +/,""); print "   "$0}
  f && /Other Local Wi-Fi Networks/{exit}' | head -6
say "   ↑ PHY 802.11n + 2GHz 频道 = 走的是 2.4G，换成 5G 通常快 3–5 倍"

hr; say "5) 磁盘"
df -h / 2>/dev/null | awk 'NR==2{printf "   根分区可用 %s（已用 %s）\n",$4,$5}'
say "   ↑ 下载 7B 模型约需 15GB、13B 约 26GB，空间不够会下到一半失败"

hr
say "结论速查："
say "  · 清华镜像 < 2 MB/s  → 分流没做好（最重要）"
say "  · aria2 ≫ 单线程     → 该用多线程下载器（本目录 hfget.sh）"
say "  · 2.4G / 802.11n     → 换 5GHz 或插网线"
