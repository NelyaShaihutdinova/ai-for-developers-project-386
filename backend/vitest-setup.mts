import { mkdirSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, 'data')

export async function setup() {
  // Create data directory if it doesn't exist (e.g. in CI)
  mkdirSync(dataDir, { recursive: true })

  // Run migrations to create tables
  execSync('npx drizzle-kit migrate', {
    cwd: __dirname,
    stdio: 'inherit',
  })
}

export async function teardown() {
  // Clean up test database after all tests
}
