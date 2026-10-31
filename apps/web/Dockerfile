# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps: install all dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json .
COPY apps/web/package.json apps/web/package.json

RUN npm install --workspaces=false --ignore-scripts \
    && npm install --workspace=apps/web

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – builder: Next.js production build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY apps/web ./apps/web
COPY package.json .

WORKDIR /app/apps/web

# Disable Next.js telemetry in CI/build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – production image (standalone output)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -S brightloop && adduser -S web -G brightloop

# Copy Next.js standalone build
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

USER web

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

CMD ["node", "apps/web/server.js"]
