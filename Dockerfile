# syntax=docker/dockerfile:1

# ---- Builder: full Node image (includes the toolchain for native modules) ----
FROM node:22-bookworm AS builder
WORKDIR /app
RUN corepack enable

# Install dependencies against the committed lockfile, then build the app.
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
# Drop devDependencies; keeps better-sqlite3 (with its native binary) and srvx.
RUN pnpm prune --prod

# ---- Runtime: slim image that only runs the built server ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8744
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/package.json ./package.json
COPY docker/run.mjs ./docker/run.mjs

EXPOSE 8744
CMD ["node", "docker/run.mjs"]
