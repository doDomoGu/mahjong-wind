#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/mahjong-wind}"
PORT="${PORT:-80}"
cd "$APP_DIR"

if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  echo "正在安装 Node.js 20…"
  VER="v20.18.1"
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64|amd64) NODE_ARCH=x64 ;;
    aarch64|arm64) NODE_ARCH=arm64 ;;
    *) echo "不支持的架构: $ARCH"; exit 1 ;;
  esac
  TMP="$(mktemp -d)"
  curl -fsSL "https://npmmirror.com/mirrors/node/${VER}/node-${VER}-linux-${NODE_ARCH}.tar.xz" -o "$TMP/node.tar.xz"
  tar -xJf "$TMP/node.tar.xz" -C "$TMP"
  mkdir -p /usr/local
  cp -R "$TMP/node-${VER}-linux-${NODE_ARCH}/"* /usr/local/
  rm -rf "$TMP"
  hash -r
fi

echo "Node $(node -v)"
npm install --omit=dev --registry=https://registry.npmmirror.com
# 前端构建需要 vite / vue 插件
npm install --include=dev --registry=https://registry.npmmirror.com
npm run build

mkdir -p /etc/systemd/system
sed "s/Environment=PORT=80/Environment=PORT=${PORT}/" deploy/mahjong-wind.service > /etc/systemd/system/mahjong-wind.service
# ExecStart 用刚装的 node
NODE_BIN="$(command -v node)"
sed -i "s#/usr/bin/env node#${NODE_BIN}#" /etc/systemd/system/mahjong-wind.service

systemctl daemon-reload
systemctl enable mahjong-wind
systemctl restart mahjong-wind

if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port="${PORT}/tcp" || true
  firewall-cmd --reload || true
fi
if command -v ufw >/dev/null 2>&1; then
  ufw allow "${PORT}/tcp" || true
fi

sleep 1
systemctl --no-pager --full status mahjong-wind | head -n 20
echo ""
echo "服务已启动，端口 ${PORT}"
