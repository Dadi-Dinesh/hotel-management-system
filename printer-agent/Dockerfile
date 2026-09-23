# ServeSync — Printer Agent — optional container image
#
# IMPORTANT: this agent's primary job is talking to a physical USB/serial
# thermal printer (see src/drivers/SerialPrinter.js) plugged into the same
# machine it runs on. Docker containers cannot see host USB/serial devices
# unless the host explicitly passes them through (`--device=/dev/ttyUSB0`
# on Linux; not straightforward with Docker Desktop on macOS/Windows,
# which is where this agent most commonly runs today).
#
# This image is genuinely useful for:
#   - Network printers (drivers/NetworkPrinter.js — pure TCP, no host
#     device access needed at all).
#   - Running the agent on a Linux box/NAS with real device passthrough.
#   - CI/local testing of the agent's non-hardware logic.
#
# For a restaurant's actual USB thermal printer (TVS MP-280 Lite, etc.),
# installing the agent natively on that machine (`npm install && npm start`)
# remains the recommended, zero-surprises path — see printer-agent/README
# if one exists, or the root project README's Printing Setup section.

FROM node:22-alpine
WORKDIR /app

# serialport needs a native build toolchain even when only network printing
# is used at runtime — it's still a declared dependency.
RUN apk add --no-cache python3 make g++ udev

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

RUN addgroup --system --gid 1001 agent && adduser --system --uid 1001 agent

# printerLogger.js writes to printer-agent/logs/agent.log (./logs here), and
# printerConfigManager.js persists printer.json to a directory it resolves
# three levels above src/config — the repo-root config/ dir on a native
# checkout, which lands outside /app as /config in this single-context image.
# Both must exist and be writable by the non-root runtime user up front, or
# their first write fails with EACCES (COPY above leaves everything root-owned).
RUN mkdir -p logs /config && chown -R agent:agent /app /config

USER agent

CMD ["node", "src/agent.js"]
