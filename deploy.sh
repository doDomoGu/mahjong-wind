#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ -f deploy.env ]; then
  # shellcheck disable=SC1091
  source deploy.env
fi

TARGET="${1:-${ECS_HOST:-}}"
USER_NAME="${ECS_USER:-root}"
SSH_PORT="${ECS_PORT:-22}"
APP_DIR="${APP_DIR:-/opt/mahjong-wind}"
PORT="${PORT:-80}"

if [ -z "$TARGET" ]; then
  cat <<'EOF'
用法：
  ./deploy.sh 公网IP
  ./deploy.sh root@公网IP

或先建 deploy.env：
  ECS_HOST=x.x.x.x
  ECS_USER=root
  ECS_PORT=22
  PORT=80
  ./deploy.sh

阿里云安全组需放行：22（SSH）和 80（网页，默认端口）。
EOF
  exit 1
fi

if [[ "$TARGET" == *@* ]]; then
  SSH_TARGET="$TARGET"
else
  SSH_TARGET="${USER_NAME}@${TARGET}"
fi

SSH_OPTS=(-p "$SSH_PORT" -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
if [ -n "${SSHPASS:-}" ]; then
  PASS_SSH="$(cd "$(dirname "$0")" && pwd)/deploy/ssh-pass.exp"
  chmod +x "$PASS_SSH"
  SSH=(expect "$PASS_SSH" -- "${SSH_OPTS[@]}" "$SSH_TARGET")
  RSYNC_SSH="expect $PASS_SSH -- ${SSH_OPTS[*]}"
else
  SSH=(ssh -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new "$SSH_TARGET")
  RSYNC_SSH="ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new"
fi

echo "部署到 ${SSH_TARGET}，目录 ${APP_DIR}，端口 ${PORT}"
"${SSH[@]}" "mkdir -p '$APP_DIR'"

BUNDLE="$(mktemp -t mahjong-wind.XXXXXX).tgz"
trap 'rm -f "$BUNDLE"' EXIT
tar -czf "$BUNDLE" \
  --exclude node_modules \
  --exclude client/dist \
  --exclude data/store.json \
  --exclude './data/*.tmp' \
  --exclude .git \
  --exclude deploy.env \
  .

if [ -n "${SSHPASS:-}" ]; then
  expect "$(pwd)/deploy/scp-pass.exp" -- -P "$SSH_PORT" -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no "$BUNDLE" "${SSH_TARGET}:/tmp/mahjong-wind.tgz"
  "${SSH[@]}" "tar -xzf /tmp/mahjong-wind.tgz -C '$APP_DIR' && rm -f /tmp/mahjong-wind.tgz"
else
  rsync -az --delete \
    -e "$RSYNC_SSH" \
    --exclude node_modules \
    --exclude client/dist \
    --exclude data/store.json \
    --exclude data/*.tmp \
    --exclude .git \
    --exclude deploy.env \
    ./ "${SSH_TARGET}:${APP_DIR}/"
fi

"${SSH[@]}" "APP_DIR='$APP_DIR' PORT='$PORT' bash '$APP_DIR/deploy/remote-setup.sh'"

HOST_ONLY="${SSH_TARGET##*@}"
echo ""
echo "部署完成。手机/电脑访问："
if [ "$PORT" = "80" ]; then
  echo "  http://${HOST_ONLY}"
else
  echo "  http://${HOST_ONLY}:${PORT}"
fi
