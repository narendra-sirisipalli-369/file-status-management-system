/**
 * QR Service — File Status Management System
 * Provides QR generation metadata and fast O(1) resolution utilities.
 */

/** Maps a FileRecord.status enum value to a CSS badge class. */
export function statusToBadge(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'badge-blue',
    IN_PROGRESS: 'badge-amber',
    ON_HOLD: 'badge-purple',
    COMPLETED: 'badge-green',
    CANCELLED: 'badge-red',
    REJECTED: 'badge-red',
  };
  return map[status] ?? 'badge-blue';
}

const STAGE_PALETTE = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#c026d3', '#4f46e5', '#0d9488',
];

/**
 * Deterministic color for a stage name — stages are DB-driven data now (30+
 * of them, admin-editable), so this replaces the several hand-maintained
 * stage -> color maps that existed when stages were a fixed 14-item array.
 */
export function colorForStage(stageName: string): string {
  let hash = 0;
  for (let i = 0; i < stageName.length; i++) {
    hash = (hash * 31 + stageName.charCodeAt(i)) >>> 0;
  }
  return STAGE_PALETTE[hash % STAGE_PALETTE.length];
}

/**
 * Builds the full URL to a file's page — this is what gets encoded into the
 * QR now printed on file labels. Scanning it with literally anything (this
 * app's own listener, a phone camera, a browser address bar focused via the
 * scanner's keystrokes) opens that exact file directly, with no parsing of
 * free text required.
 */
export function buildFileUrl(fileId: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return `${base}/admin/file/${fileId}`;
}

/**
 * Parses a raw QR scanned value and extracts an identifier that resolves a
 * file (any of id / fileId / secureTrackingId / smsRefNo — see
 * getFileRecordByAnyId). Returns null if nothing recognizable is found.
 */
export function parseQRValue(raw: string): string | null {
  const trimmed = raw.trim();

  // Current format — a direct URL to the file's page (see buildFileUrl).
  const urlMatch = trimmed.match(/\/admin\/file\/([^\s/?#]+)/i);
  if (urlMatch) return urlMatch[1];

  const prefix = 'FSMS_FILE:';
  if (trimmed.startsWith(prefix)) {
    return trimmed.slice(prefix.length).trim();
  }
  // Legacy format — physical labels printed before the URL format above
  // encode buildFileInfoQRText's multi-line human-readable text instead;
  // pull the file number back out of it so those older labels keep working.
  const fileNumberMatch = trimmed.match(/File Number:\s*(\S+)/i);
  if (fileNumberMatch) return fileNumberMatch[1].trim();
  // Also support a raw fileId/tracking id/sms ref entered or scanned directly.
  if (trimmed.length >= 10 && !trimmed.includes('\n')) return trimmed;
  return null;
}

/**
 * Format currency in INR.
 */
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date to DD/MM/YYYY.
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/**
 * Format datetime (24-hour time).
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/**
 * Format time only, 24-hour.
 */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
