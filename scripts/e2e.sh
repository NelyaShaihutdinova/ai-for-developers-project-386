#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${E2E_PORT:-3001}"
DB_PATH="$ROOT/backend/data/calendar-e2e.db"

# Kill any existing process on the E2E port
if lsof -ti:$PORT > /dev/null 2>&1; then
  echo "Killing existing process on port $PORT..."
  lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Build frontend
echo "Building frontend..."
cd "$ROOT/frontend" && npm run build

# Ensure data directory exists
mkdir -p "$ROOT/backend/data"

# Clear E2E database for clean test
if [ -f "$DB_PATH" ]; then
  rm "$DB_PATH"
fi

# Run migrations on E2E database
echo "Running migrations..."
cd "$ROOT/backend"
DB_PATH="$DB_PATH" npx drizzle-kit migrate

# Start E2E server in background with E2E database
echo "Starting E2E server on port $PORT..."
E2E_DB="$DB_PATH" E2E_PORT=$PORT npx tsx e2e-server.ts &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
    echo "Server is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

# Run Playwright tests
echo "Running E2E tests..."
cd "$ROOT/e2e"
BASE_URL="http://localhost:$PORT" npm test
TEST_EXIT=$?

# Cleanup
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

exit $TEST_EXIT
