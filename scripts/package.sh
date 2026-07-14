#!/usr/bin/env bash
# 构建生产版本并把 dist/ 打成一个压缩包，方便一次性上传到 nginx 服务器。
#
# 用法：
#   bun run package      （或 npm run package）
#
# 产出：仓库根目录下的 gingko-biloba-dist.tar.gz
# 压缩包内是 dist/ 的“内容”（index.html + assets/ 位于顶层），
# 因此在服务器上 tar 解到 nginx 的 root 目录即可，无需再套一层文件夹。
set -euo pipefail

# 切到仓库根目录（脚本可能从任意位置调用）
cd "$(dirname "$0")/.."

OUT="gingko-biloba-dist.tar.gz"

# ---- 构建 ----
echo "▶ 构建生产版本…"
if command -v bun >/dev/null 2>&1; then
  bun run build
else
  npm run build
fi

if [ ! -f dist/index.html ]; then
  echo "✗ 构建失败：没找到 dist/index.html" >&2
  exit 1
fi

# ---- 打包 ----
# 在 dist/ 里写一份构建信息，方便日后确认服务器上跑的是哪一版
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
STAMP="$(date '+%Y-%m-%d %H:%M:%S')"
printf 'commit: %s\nbuilt:  %s\n' "$COMMIT" "$STAMP" > dist/build-info.txt

echo "▶ 打包 dist/ → $OUT"
# COPYFILE_DISABLE=1 阻止 macOS 往 tar 里塞 ._ 元数据文件（在 Linux 上无副作用）
COPYFILE_DISABLE=1 tar -C dist -czf "$OUT" .

ABS="$(pwd)/$OUT"
BYTES="$(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT")"
SIZE="$(awk -v b="$BYTES" 'BEGIN{printf "%.1fM", b/1048576}')"
echo ""
echo "✅ 完成：$ABS  ($SIZE)   [commit $COMMIT]"
echo "   （在仓库根目录，不在 dist/ 里；已被 .gitignore 忽略，编辑器里可能显示为灰色）"
if [ "$(uname)" = "Darwin" ] && command -v open >/dev/null 2>&1; then
  echo "   在访达中显示：open -R \"$ABS\""
fi
echo ""
echo "上传并部署（把 user@server 与目标目录换成你的）："
echo "  scp $OUT user@server:/tmp/"
echo "  ssh user@server 'rm -rf /var/www/gingko/* && mkdir -p /var/www/gingko && tar xzf /tmp/$OUT -C /var/www/gingko && rm /tmp/$OUT'"
echo ""
echo "（服务器上 nginx 的 root 指向 /var/www/gingko 即可；解压前先清空是为了删掉旧版残留的 hash 资源。）"
