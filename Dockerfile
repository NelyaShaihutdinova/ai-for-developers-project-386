# Multi-stage Dockerfile for Calendar Booking Service
# Frontend: Vite + React → static files
# Backend: Hono + TypeScript + better-sqlite3 (native module, multi-stage build)
# SQLite file is stored in /app/backend/data (mount as volume to persist)

# ─── Stage 1: Build frontend ───
FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ─── Stage 2: Build backend (with native modules) ───
FROM node:24-alpine AS backend-builder

RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
# TypeScript compilation to dist/
RUN npm run build

# ─── Stage 3: Runtime ───
FROM node:24-alpine AS runtime

RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime && \
    echo "Europe/Moscow" > /etc/timezone

WORKDIR /app

# Copy built backend node_modules (with pre-built native modules) from builder
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy backend source (needed for tsx to resolve imports)
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/docker-server.ts ./backend/docker-server.ts

# Copy migrations
COPY backend/migrations ./backend/migrations
COPY backend/drizzle.config.ts ./backend/drizzle.config.ts

# Copy built frontend static files
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data directory for SQLite (mount as volume)
RUN mkdir -p /app/backend/data

# Copy entrypoint script
COPY entrypoint.sh ./backend/entrypoint.sh
RUN chmod +x ./backend/entrypoint.sh

WORKDIR /app/backend

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE ${PORT}

ENTRYPOINT ["/app/backend/entrypoint.sh"]
