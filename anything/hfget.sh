#!/usr/bin/env bash
# hfget.sh —— 用 aria2 多线程从 HuggingFace / hf-mirror 下载模型，支持断点续传
#
# 用法:
#   ./hfget.sh openai-community/gpt2                      # 整个仓库
#   ./hfget.sh openai-community/gpt2 "*.safetensors"      # 只下匹配的文件
#   ./hfget.sh Qwen/Qwen2.5-7B-Instruct --dir ~/models    # 指定保存目录
#   ./hfget.sh --mirror Qwen/Qwen2.5-7B-Instruct          # 走 hf-mirror.com（国内直连时更快）
#   ./hfget.sh --list openai-community/gpt2               # 只看文件清单，不下载
#   ./hfget.sh --dry-run openai-community/gpt2            # 只生成 aria2 任务文件
#
# 环境变量:
#   HF_TOKEN    gated/私有仓库的 token
#   HF_PROXY    仅当本仓库需要走代理时使用，例如 http://127.0.0.1:1082
#   CONNS       单文件连接数（默认 8；实测 8 最好，16 反而更慢）
#   JOBS        同时下载的文件数（默认 4）
#
set -uo pipefail

HOST="${HF_HOST:-https://huggingface.co}"
REV="main"
OUTDIR=""
PATTERNS=()
DRY=0
LISTONLY=0
REPO=""
JOBS="${JOBS:-4}"
CONNS="${CONNS:-8}"

usage() { sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --mirror)   HOST="https://hf-mirror.com"; shift ;;
    --host)     HOST="$2"; shift 2 ;;
    --rev)      REV="$2"; shift 2 ;;
    --dir|-d)   OUTDIR="$2"; shift 2 ;;
    --token)    HF_TOKEN="$2"; shift 2 ;;
    --jobs|-j)  JOBS="$2"; shift 2 ;;
    --conns|-x) CONNS="$2"; shift 2 ;;
    --dry-run)  DRY=1; shift ;;
    --list)     LISTONLY=1; shift ;;
    -h|--help)  usage 0 ;;
    --)         shift; break ;;
    -*)         echo "未知参数: $1" >&2; usage 1 ;;
    *)          REPO="$1"; shift; break ;;
  esac
done

[ -n "$REPO" ] || usage 1
while [ $# -gt 0 ]; do PATTERNS+=("$1"); shift; done
[ ${#PATTERNS[@]} -eq 0 ] && PATTERNS=("*")

command -v aria2c >/dev/null || { echo "缺少 aria2c：brew install aria2" >&2; exit 1; }

REPO="${REPO%/}"
SLUG="${REPO//\//__}"
OUTDIR="${OUTDIR:-./$SLUG}"
mkdir -p "$OUTDIR" || exit 1

TREE_URL="$HOST/api/models/$REPO/tree/$REV?recursive=true"
AUTH=()
if [ -n "${HF_TOKEN:-}" ]; then AUTH=(-H "Authorization: Bearer $HF_TOKEN"); fi

echo "仓库 : $REPO  (rev=$REV)"
echo "源   : $HOST"
echo "目录 : $OUTDIR"
echo "拉取文件清单 ..."
TREE="$(curl -sSL --max-time 60 ${AUTH[@]+"${AUTH[@]}"} "$TREE_URL")" || { echo "取文件清单失败" >&2; exit 1; }
case "$TREE" in
  \[*) : ;;
  *) echo "接口返回异常（可能是私有/gated 仓库，需要 --token）:"; echo "$TREE" | head -c 300; echo; exit 1 ;;
esac

LISTFILE="$(mktemp)"
printf '%s' "$TREE" | python3 -c '
import sys, json, fnmatch, os
tree = json.load(sys.stdin)
pats = sys.argv[1:]
files = [x for x in tree if x.get("type") == "file"]
sel = [f for f in files if any(fnmatch.fnmatch(f["path"], p) for p in pats)]
for f in sel:
    print(f["path"] + "\t" + str(f.get("size", 0)))
' "${PATTERNS[@]}" > "$LISTFILE"

if [ ! -s "$LISTFILE" ]; then echo "没有匹配到文件" >&2; rm -f "$LISTFILE"; exit 1; fi

COUNT=$(wc -l < "$LISTFILE" | tr -d ' ')
TOTAL=$(awk -F'\t' '{s+=$2} END{printf "%.1f", s/1048576}' "$LISTFILE")

if [ "$LISTONLY" = 1 ]; then
  awk -F'\t' '{printf "%10.1f MB  %s\n", $2/1048576, $1}' "$LISTFILE"
  echo "共 $COUNT 个文件, $TOTAL MB"
  rm -f "$LISTFILE"; exit 0
fi

# 生成 aria2 任务文件
INFILE="$(mktemp -t hfget).aria2"
python3 - "$LISTFILE" "$INFILE" "$HOST" "$REPO" "$REV" "$OUTDIR" <<'PY'
import sys, os
listfile, infile, host, repo, rev, outdir = sys.argv[1:7]
lines = []
for raw in open(listfile, encoding="utf-8"):
    path, size = raw.rstrip("\n").split("\t")
    url = f"{host}/{repo}/resolve/{rev}/{path}"
    d = os.path.join(outdir, os.path.dirname(path))
    lines.append(url)
    lines.append(f"  dir={d}")
    lines.append(f"  out={os.path.basename(path)}")
open(infile, "w", encoding="utf-8").write("\n".join(lines) + "\n")
PY

echo "文件数: $COUNT, 合计 $TOTAL MB"
if [ "$DRY" = 1 ]; then echo "aria2 任务文件: $INFILE"; head -6 "$INFILE"; exit 0; fi
mkdir -p "$OUTDIR"

ARIA_EXTRA=()
if [ -n "${HF_PROXY:-}" ]; then ARIA_EXTRA+=(--all-proxy="$HF_PROXY"); fi
if [ -n "${HF_TOKEN:-}" ]; then ARIA_EXTRA+=(--header="Authorization: Bearer $HF_TOKEN"); fi

echo "开始下载（$JOBS 个文件并发 x 每文件 $CONNS 连接），中断后重跑本命令即可续传 ..."
START=$(date +%s)
aria2c -i "$INFILE" \
  -j "$JOBS" -x "$CONNS" -s "$CONNS" -k 1M -c \
  --file-allocation=none --auto-file-renaming=false --allow-overwrite=false \
  --max-tries=8 --retry-wait=3 --timeout=60 --connect-timeout=20 \
  --console-log-level=warn --summary-interval=0 --show-console-readout=false \
  ${ARIA_EXTRA[@]+"${ARIA_EXTRA[@]}"} \
  --header="User-Agent: Mozilla/5.0 hfget/1.0"
RC=$?
END=$(date +%s)
DUR=$((END-START)); [ "$DUR" -eq 0 ] && DUR=1

# 校验大小
echo "校验文件完整性 ..."
python3 - "$LISTFILE" "$OUTDIR" <<'PY'
import sys, os
listfile, outdir = sys.argv[1:3]
bad = 0; total = 0
for raw in open(listfile, encoding="utf-8"):
    path, size = raw.rstrip("\n").split("\t")
    p = os.path.join(outdir, path)
    if not os.path.exists(p):
        print(f"  缺失: {path}"); bad += 1; continue
    real = os.path.getsize(p)
    total += real
    if int(size) and real != int(size):
        print(f"  大小不符: {path}  {real} != {size}"); bad += 1
print(f"已就位 {total/1048576:.1f} MB，异常 {bad} 个")
sys.exit(1 if bad else 0)
PY
VERIFY=$?
rm -f "$LISTFILE" "$INFILE"

if [ "$VERIFY" -eq 0 ]; then
  AVG=$(awk -v m="$TOTAL" -v d="$DUR" 'BEGIN{printf "%.0f", m*1024/d}')
  echo "✅ 完成：${TOTAL} MB / ${DUR}s ≈ ${AVG} KB/s"
else
  echo "⚠️  有文件未完成或大小不符，重跑本命令会继续续传"
fi
exit $RC
