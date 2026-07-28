#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Sree Nookambika Thermal Printer Agent — macOS Uninstaller
# ═══════════════════════════════════════════════════════════════════════════

set -e

PLIST_NAME="com.restaurant.printeragent.plist"
USER_LAUNCHAGENTS_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$USER_LAUNCHAGENTS_DIR/$PLIST_NAME"

echo "🗑️ [Uninstaller] Removing Sree Nookambika Thermal Printer Agent Service..."
echo "========================================================================="

# 1. Unload launchd background service
if [ -f "$TARGET_PLIST" ] || launchctl list | grep -q "com.restaurant.printeragent"; then
    echo "🛑 [Service] Unloading background service..."
    launchctl unload -w "$TARGET_PLIST" 2>/dev/null || true
    echo "✓ Service unloaded."
else
    echo "ℹ️ Service not currently running or loaded."
fi

# 2. Remove plist configuration
if [ -f "$TARGET_PLIST" ]; then
    echo "🧹 [Cleanup] Removing launchd plist file: $TARGET_PLIST"
    rm -f "$TARGET_PLIST"
    echo "✓ Plist removed."
fi

echo "========================================================================="
echo "✅ [Success] Printer Agent launchd service has been completely removed."
echo "   Note: The source code in printer-agent/ was preserved."
echo "========================================================================="
