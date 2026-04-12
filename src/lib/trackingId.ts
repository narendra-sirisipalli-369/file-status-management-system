import { randomBytes } from 'crypto'

/**
 * Generates a secure, unguessable IND-CV tracking ID.
 *
 * Format : [SMS-RefNo]-IND-CV-[YYYYMMDD]-[8-char-crypto-hex]
 * Example: 201-IND-CV-20260409-a7b8c9d0
 *
 * The 8-char crypto hex (4 random bytes) provides 2^32 ≈ 4.3 billion
 * possible values per date prefix, making brute-force enumeration
 * computationally infeasible.
 */
export function generateSecureTrackingId(smsRefNo: string): string {
  const refPart = extractSmsRefPart(smsRefNo)
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replaceAll('-', '')

  // Cryptographically secure 8-char hex (4 random bytes)
  const hash = randomBytes(4).toString('hex')  // e.g. "a7b8c9d0"

  return `${refPart}-IND-CV-${dateStr}-${hash}`
}

function extractSmsRefPart(smsRefNo: string): string {
  const trimmed = smsRefNo.trim()
  const terminalSegment = trimmed.split('/').pop() ?? ''
  const refPart = terminalSegment.replace(/[^A-Za-z0-9-]/g, '')

  if (!refPart) {
    throw new Error('SMS reference number is required to generate a tracking ID')
  }

  return refPart
}

/**
 * Validates that a raw string matches the IND-CV format.
 * Used as a first defence layer before any DB query.
 */
export function isValidTrackingId(id: string): boolean {
  return /^[A-Za-z0-9-]+-IND-CV-\d{8}-[0-9a-f]{8}$/.test(id)
}

/**
 * Builds the full kiosk URL that gets encoded into the QR code.
 * On a production deployment, replace with the real domain.
 */
export function buildKioskTrackUrl(secureTrackingId: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  return `${base}/kiosk/track/${secureTrackingId}`
}
