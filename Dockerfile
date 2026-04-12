# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# DATABASE_URL must be set at build time so `prisma generate` has a valid URL
# for the configured datasource provider.
ARG DATABASE_URL=file:./dev.db
ENV DATABASE_URL=${DATABASE_URL}

RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built Next.js output and required runtime files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json

# Copy Prisma schema & migrations so migrate deploy works at runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Re-run prisma generate in the final image against production deps
RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "scripts/init-prod.sh"]
