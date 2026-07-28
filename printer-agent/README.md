# Sree Nookambika Thermal Printer Agent (macOS Daemon)

Production-grade local Node.js daemon for 80mm ESC/POS thermal printing connected to Render cloud Express backend and Next.js frontend over Socket.IO.

---

## 📋 Features
- **Auto-Boot Service**: Starts automatically on macOS boot using `launchd`.
- **Keep-Alive Resilience**: Automatically restarts if the process terminates unexpectedly.
- **USB Auto-Detection**: Finds USB thermal printers dynamically (`/dev/cu.usbserial-*`).
- **Disk-Backed Persistent Queue**: Retains pending jobs across reboots without data loss.
- **Idempotency Engine**: Prevents double-printing of customer bills or kitchen tickets.
- **Socket.IO Heartbeat**: Maintains periodic 10-second heartbeats and auto-reconnects on Wi-Fi dropouts.

---

## 🛠️ Requirements
- macOS 10.15 (Catalina) or newer on restaurant Mac mini / Mac.
- Node.js (v18.0.0 or higher installed).
- 80mm ESC/POS USB Thermal Receipt Printer.

---

## 🚀 Commands to Install

### Quick Installation (Recommended)
Open Terminal, navigate to `printer-agent` folder, and run:

```bash
cd printer-agent
./install.sh
```

The installer will:
1. Check your Node.js installation.
2. Generate default `.env` from `.env.example` (if missing).
3. Install production dependencies.
4. Create `$HOME/Library/LaunchAgents/com.restaurant.printeragent.plist` with exact absolute system paths.
5. Register and start the background auto-start service immediately via `launchctl`.

---

## ⚙️ Configuration (`.env`)

Before running in production, ensure your `.env` settings match your Render backend:

```env
# Render Production Express Backend URL
BACKEND_URL=https://hotel-management-system-backend.onrender.com

# Shared Security API Key (Must match PRINTER_AGENT_KEY on Render)
PRINTER_AGENT_KEY=nookambika_printer_secret_key_2026

# Physical Printer Port & Speed Defaults
PRINTER_PORT=/dev/cu.usbserial-110
PRINTER_BAUD_RATE=9600

# Kitchen Mode (LIVE | NORMAL)
KITCHEN_MODE=LIVE
```

---

## 🔄 Commands to Restart

To restart the Printer Agent service without rebooting your Mac:

```bash
launchctl unload ~/Library/LaunchAgents/com.restaurant.printeragent.plist
launchctl load -w ~/Library/LaunchAgents/com.restaurant.printeragent.plist
```

Or using standard process signal (if running via launchd):
```bash
killall node
```
*(launchd will immediately auto-restart the agent within 2 seconds)*.

---

## 📜 Commands to View Logs

### Stream Live Output Logs:
```bash
tail -f printer-agent/logs/launchd.log
```

### Stream Live Error Logs:
```bash
tail -f printer-agent/logs/launchd_error.log
```

### Stream Agent System Log:
```bash
tail -f printer-agent/logs/agent.log
```

---

## 🛑 Commands to Remove / Uninstall

To completely stop and remove the auto-start service:

```bash
cd printer-agent
./uninstall.sh
```

Or manually:
```bash
launchctl unload -w ~/Library/LaunchAgents/com.restaurant.printeragent.plist
rm -f ~/Library/LaunchAgents/com.restaurant.printeragent.plist
```

---

## 🔍 Service Status Check

To check if the service is currently registered and active:

```bash
launchctl list | grep printeragent
```
- If active, it will print PID and status `0 com.restaurant.printeragent`.
