# ServeSync — API Server (Express + Prisma) — production image

FROM node:22-alpine AS deps
WORKDIR /app
# node-serialport needs a native build toolchain even just to install —
# only present in this stage, never shipped in the final image.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 expressjs

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client is generated from the checked-in schema at image build time,
# so the container never depends on reaching npm at runtime.
RUN npx prisma generate

# printerLogger.js writes to server/logs/printer.log — pre-create it and
# hand ownership to the non-root runtime user, or its first write fails
# with EACCES (the directory is otherwise owned by root from the COPY above).
RUN mkdir -p logs && chown -R expressjs:nodejs /app

USER expressjs
EXPOSE 4000
ENV PORT=4000

# server.js already validates required env vars itself on boot (see
# src/config/validateEnv.js) and exits with a clear message if misconfigured.
CMD ["node", "server.js"]
