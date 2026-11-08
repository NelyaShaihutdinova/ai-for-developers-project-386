#!/bin/sh
set -e

cd /app/backend

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit migrate

# Start the server
echo "Starting server..."
exec npx tsx docker-server.ts
