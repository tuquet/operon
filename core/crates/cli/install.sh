#!/bin/sh
# ==============================================================================
# Operon Local Bridge - Universal Installer (macOS & Linux)
# ==============================================================================
# Usage:
#   curl -fsSL https://github.com/tuquet/operon/releases/latest/download/install.sh | sh
# ==============================================================================

set -e

REPO="${OPERON_REPO:-tuquet/operon}"
BASE_URL="https://github.com/${REPO}/releases/latest/download"
OPERON_DIR="${OPERON_HOME:-${HOME}/.operon}"
BIN_DIR="${OPERON_DIR}/bin"
TARGET_EXE="${BIN_DIR}/opn"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin) PLATFORM="macos" ;;
    Linux)  PLATFORM="linux" ;;
    *)
        echo "[operon] ERROR: Unsupported OS: $OS" >&2
        exit 1
        ;;
esac

case "$ARCH" in
    x86_64|amd64)  TARGET_ARCH="x64" ;;
    arm64|aarch64) TARGET_ARCH="arm64" ;;
    *)
        echo "[operon] ERROR: Unsupported CPU architecture: $ARCH" >&2
        exit 1
        ;;
esac

ASSET_NAME="opn-${PLATFORM}-${TARGET_ARCH}"
echo "[operon] Installing ${ASSET_NAME} to ${BIN_DIR}..."
mkdir -p "${BIN_DIR}"

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t 'operon')"
trap 'rm -rf "${TMP_DIR}"' EXIT

fetch_file() {
    url="$1"
    out="$2"
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$url" -o "$out"
    elif command -v wget >/dev/null 2>&1; then
        wget -q "$url" -O "$out"
    else
        echo "[operon] ERROR: curl or wget is required." >&2
        exit 1
    fi
}

fetch_file "${BASE_URL}/${ASSET_NAME}" "${TMP_DIR}/${ASSET_NAME}"

if fetch_file "${BASE_URL}/SHA256SUMS.txt" "${TMP_DIR}/SHA256SUMS.txt" 2>/dev/null; then
    EXPECTED_HASH="$(grep -E "[[:space:]]\*?${ASSET_NAME}$" "${TMP_DIR}/SHA256SUMS.txt" | awk '{print $1}' | head -n 1)"
    if [ -n "$EXPECTED_HASH" ]; then
        if command -v sha256sum >/dev/null 2>&1; then
            ACTUAL_HASH="$(sha256sum "${TMP_DIR}/${ASSET_NAME}" | awk '{print $1}')"
        elif command -v shasum >/dev/null 2>&1; then
            ACTUAL_HASH="$(shasum -a 256 "${TMP_DIR}/${ASSET_NAME}" | awk '{print $1}')"
        else
            ACTUAL_HASH=""
        fi
        if [ -n "$ACTUAL_HASH" ] && [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
            echo "[operon] ERROR: SHA256 mismatch (expected $EXPECTED_HASH, got $ACTUAL_HASH)" >&2
            exit 1
        fi
        [ -n "$ACTUAL_HASH" ] && echo "[operon] SHA256 verified."
    fi
fi

if [ -x "${TARGET_EXE}" ]; then
    "${TARGET_EXE}" worker stop --force >/dev/null 2>&1 || true
fi

mv -f "${TMP_DIR}/${ASSET_NAME}" "${TARGET_EXE}"
chmod +x "${TARGET_EXE}"
echo "[operon] Installed binary: ${TARGET_EXE}"

# Configure PATH idempotently
PATH_LINE='export PATH="$HOME/.operon/bin:$PATH"'
for PROFILE in "${HOME}/.bashrc" "${HOME}/.zshrc" "${HOME}/.profile"; do
    if [ -f "$PROFILE" ] && ! grep -q '\.operon/bin' "$PROFILE" 2>/dev/null; then
        printf "\n# Operon Local Bridge\n%s\n" "${PATH_LINE}" >> "$PROFILE"
    fi
done

# Register OS autostart & start daemon on 127.0.0.1:8765
if [ "$PLATFORM" = "macos" ]; then
    PLIST_DIR="${HOME}/Library/LaunchAgents"
    PLIST_PATH="${PLIST_DIR}/com.operon.local-bridge.plist"
    mkdir -p "${PLIST_DIR}" "${OPERON_DIR}/logs"
    cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.operon.local-bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>${TARGET_EXE}</string>
        <string>worker</string>
        <string>start</string>
        <string>-H</string><string>127.0.0.1</string>
        <string>-p</string><string>8765</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>${OPERON_DIR}/logs/bridge.stdout.log</string>
    <key>StandardErrorPath</key><string>${OPERON_DIR}/logs/bridge.stderr.log</string>
</dict>
</plist>
EOF
    launchctl unload "${PLIST_PATH}" >/dev/null 2>&1 || true
    launchctl load "${PLIST_PATH}" >/dev/null 2>&1 || "${TARGET_EXE}" worker start -H 127.0.0.1 -p 8765 -d
elif command -v systemctl >/dev/null 2>&1 && systemctl --user status >/dev/null 2>&1; then
    UNIT_DIR="${HOME}/.config/systemd/user"
    mkdir -p "${UNIT_DIR}"
    cat > "${UNIT_DIR}/operon-bridge.service" <<EOF
[Unit]
Description=Operon Local Bridge Daemon
After=network.target

[Service]
ExecStart=${TARGET_EXE} worker start -H 127.0.0.1 -p 8765
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF
    systemctl --user daemon-reload
    systemctl --user enable --now operon-bridge.service >/dev/null 2>&1 || "${TARGET_EXE}" worker start -H 127.0.0.1 -p 8765 -d
else
    "${TARGET_EXE}" worker start -H 127.0.0.1 -p 8765 -d
fi

echo "[operon] Local Bridge installed and started on http://127.0.0.1:8765"
