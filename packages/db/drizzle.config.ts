import dotenv from 'dotenv'
import path from 'node:path'
import type { Config } from 'drizzle-kit'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export default {
  schema: './src/schema/**/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config
