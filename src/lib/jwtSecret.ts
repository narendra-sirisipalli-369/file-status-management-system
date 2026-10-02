/**
 * Single source of truth for the JWT signing secret. Fails fast in
 * production if JWT_SECRET isn't set, instead of silently signing tokens
 * with the hardcoded dev fallback — that fallback is public (it's right
 * here in source control), so a production deploy that forgets to set the
 * env var would otherwise let anyone forge a valid admin session.
 */
function resolveSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production.')
  }
  return 'super-secret-key-for-dev'
}

export const JWT_SECRET_KEY = new TextEncoder().encode(resolveSecret())
