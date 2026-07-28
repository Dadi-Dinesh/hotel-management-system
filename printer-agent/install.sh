#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Sree Nookambika Thermal Printer Agent — macOS Auto-Start Installer
# ═══════════════════════════════════════════════════════════════════════════

set -e

PLIST_NAME="com.restaurant.printeragent.plist"
USER_LAUNCHAGENTS_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$USER_LAUNCHAGENTS_DIR/$PLIST_NAME"

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$(which node || echo "/usr/local/bin/node")"

echo "🖨️ [Installer] Sree Nookambika Thermal Printer Agent Setup"
echo "=========================================================="
echo "📍 Agent Directory : $AGENT_DIR"
echo "🟢 Node Executable : $NODE_BIN"
echo "----------------------------------------------------------"

# 1. Verify Node.js presence
if ! command -v node &> /dev/null; then
    echo "❌ [Error] Node.js is not installed or not in system PATH!"
    echo "   Please install Node.js (v18+) from https://nodejs.org before running installer."
    exit 1
fi

# 2. Ensure .env exists
if [ ! -f "$AGENT_DIR/.env" ]; then
    echo "⚙️ [Setup] Creating default .env file from .env.example..."
    cp "$AGENT_DIR/.env.example" "$AGENT_DIR/.env"
    echo "⚠️ [Notice] Please edit $AGENT_DIR/.env with your production Render BACKEND_URL & PRINTER_AGENT_KEY!"
fi

# 3. Ensure logs directory exists
mkdir -p "$AGENT_DIR/logs"

# 4. Install npm dependencies
echo "📦 [Dependencies] Installing Node.js dependencies..."
cd "$AGENT_DIR"
npm install --omit=dev --silent

# 5. Create LaunchAgents folder if missing
mkdir -p "$USER_LAUNCHAGENTS_DIR"

# 6. Unload existing launchd service if currently running
if launchctl list | grep -q "com.restaurant.printeragent"; then
    echo "🔄 [Service] Unloading existing launchd service..."
    launchctl unload "$TARGET_PLIST" 2>/dev/null || true
fi

# 7. Generate customized plist with exact system paths
echo "📝 [Configuration] Generating launchd service plist file..."
cat <<EOF > "$TARGET_PLIST"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.restaurant.printeragent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$AGENT_DIR/src/agent.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$AGENT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$AGENT_DIR/logs/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>$AGENT_DIR/logs/launchd_error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>
EOF

chmod 644 "$TARGET_PLIST"

# 8. Load launchd service
echo "🚀 [Service] Loading launchd service to start on boot..."
launchctl load -w "$TARGET_PLIST"

sleep 2

# 9. Verify running status
echo "----------------------------------------------------------"
if launchctl list | grep -q "com.restaurant.printeragent"; then
    echo "✅ [Success] Printer Agent successfully installed and running!"
    echo "   Service Status : Active (Auto-starts on Mac boot)"
    echo "   Logs Location  : $AGENT_DIR/logs/launchd.log"
else
    echo "⚠️ [Warning] Service loaded but status check unconfirmed."
    echo "   Check logs at: $AGENT_DIR/logs/launchd_error.log"
fi
echo "=========================================================="
