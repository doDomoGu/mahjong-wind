#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js 18 或更高版本：https://nodejs.org/"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "正在安装依赖…"
  npm install
fi

export NODE_ENV=production
echo "启动立直麻将 · 风向盘"
npm start
