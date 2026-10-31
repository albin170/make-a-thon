# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps: install all dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Copy workspace manifests
COPY package.json .
COPY apps/api/package.json apps/api/package.json
COPY packages/configuration/package.json packages/configuration/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json

RUN npm install --workspaces=false --ignore-scripts \
    && npm install --workspace=apps/api

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – builder: compile TypeScript via NestJS CLI
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY prisma ./prisma
COPY apps/api ./apps/api
COPY packages ./packages
COPY package.json .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS application
WORKDIR /app/apps/api
RUN npx nest build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -S brightloop && adduser -S api -G brightloop

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production \
    PORT=3001

EXPOSE 3001

USER api

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main"]
