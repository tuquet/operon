#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== [1/5] Checking VPS Disk Space & Safety ==="
DISK_USAGE=$(df / --output=pcent | tail -1 | tr -dc '0-9')
echo "Current disk usage: ${DISK_USAGE}%"
if [ "$DISK_USAGE" -gt 85 ]; then
  echo "WARNING: Disk usage exceeds 85%. Cleaning temporary turbo caches..."
  rm -rf .turbo apps/shell/.turbo
fi

echo "=== [2/5] Running Core Preferences Unit Tests ==="
pnpm test:unit packages/@core/preferences/__tests__/preferences.test.ts

echo "=== [3/5] Building @operon/shell (Local Only) ==="
export NODE_OPTIONS="--max-old-space-size=3072"
if [ -d "apps/shell/dist" ] && [ -f "apps/shell/dist/index.html" ]; then
  rm -rf apps/shell/dist.bak
  cp -a apps/shell/dist apps/shell/dist.bak
fi
trap 'if [ ! -f "apps/shell/dist/index.html" ] && [ -d "apps/shell/dist.bak" ]; then echo "Restoring previous dist backup to prevent Nginx 403..."; rm -rf apps/shell/dist && mv apps/shell/dist.bak apps/shell/dist; fi' EXIT

pnpm exec turbo build --filter="@operon/shell^..." --concurrency=1
pnpm --filter @operon/shell run build
rm -rf apps/shell/dist.bak

echo "=== [4/5] Writing Build Metadata to dist ==="
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat <<EOF > apps/shell/dist/.build-meta.json
{
  "commit": "${COMMIT_HASH}",
  "buildTime": "${BUILD_TIME}",
  "mode": "local-production",
  "tailscaleHost": "http://100.68.217.61/"
}
EOF

echo "=== [5/5] Reloading Nginx & Verifying Endpoint ==="
nginx -t -q && systemctl reload nginx

echo ""
echo "============================================================"
echo "  LOCAL BUILD SUCCESSFUL! (Zero Git Push)"
echo "  - Commit: ${COMMIT_HASH}"
echo "  - Build Time: ${BUILD_TIME}"
echo "  - Tailscale URL: http://100.68.217.61/"
echo "  - Localhost URL: http://127.0.0.1/"
echo "============================================================"
