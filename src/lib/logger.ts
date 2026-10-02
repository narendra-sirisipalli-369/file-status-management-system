import pino, { type Logger } from 'pino'
import fs from 'fs'
import path from 'path'

/**
 * Structured logger — JSON lines to both stdout and a file on disk at
 * logs/app.log (project root), so log history survives closing the
 * terminal. Two things get logged here: unexpected errors (every API
 * route's catch block) and security events (login success/failure,
 * role-denied access) — everything else (who did what to which file, when)
 * already lives in the status_history table.
 *
 * Uses pino.destination() for the file stream, NOT the `transport` option
 * (e.g. pino-pretty) — transport spawns a worker thread that resolves the
 * transport module at runtime, which breaks under Next.js's webpack
 * bundling of route handlers ("the worker has exited") and crashed the
 * request that triggered the log call. pino.destination() writes
 * synchronously in the main thread instead, so it doesn't have that
 * problem. For readable output while developing, pipe the dev server:
 *   npm run dev | npx pino-pretty
 *
 * Cached on globalThis, same pattern as the pg Pool in db.ts — Next.js dev
 * mode re-executes module-level code on every hot reload, and without this
 * each reload opened a brand new file handle to logs/app.log that was never
 * closed (confirmed: one dev session left 14 leaked descriptors open on a
 * single stale process). Caching means hot reloads reuse the same stream.
 */
const globalForLogger = globalThis as unknown as { pinoLogger?: Logger }

function createLogger(): Logger {
  const logDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })

  const fileDestination = pino.destination({ dest: path.join(logDir, 'app.log'), append: true, sync: false })

  return pino(
    { level: process.env.LOG_LEVEL || 'info' },
    pino.multistream([{ stream: process.stdout }, { stream: fileDestination }])
  )
}

export const logger = globalForLogger.pinoLogger ?? createLogger()
if (process.env.NODE_ENV !== 'production') globalForLogger.pinoLogger = logger
