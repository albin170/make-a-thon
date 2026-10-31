# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps: install production dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install native build tools required by argon2, canvas, etc.
RUN apk add --no-cache python3 make g++

# Copy workspace manifests
COPY package.json package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/configuration/package.json packages/configuration/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json

# Install all deps (needed for prisma generate)
RUN npm install --workspaces=false --ignore-scripts \
    && npm install --workspace=apps/worker

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – builder: compile TypeScript
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules

# Copy source
COPY prisma ./prisma
COPY apps/worker ./apps/worker
COPY packages ./packages
COPY package.json .

# Generate Prisma client
RUN npx prisma generate

# Compile worker
WORKDIR /app/apps/worker
RUN npx tsc -p tsconfig.json 2>/dev/null || npx tsc --skipLibCheck

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Non-root user for security
RUN addgroup -S brightloop && adduser -S worker -G brightloop

# Copy built artefacts
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/prisma ./prisma

# Prisma client (generated)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

USER worker

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('fs').existsSync('/tmp/worker-alive') || process.exit(1)"

CMD ["node", "dist/main.js"]
