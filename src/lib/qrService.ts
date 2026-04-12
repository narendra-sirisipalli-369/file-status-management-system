/**
 * QR Service — File Status Management System
 * Provides QR generation metadata and fast O(1) resolution utilities.
 */

export const STAGES = [
  { key: 'Inward',              label: 'Inward',              color: 'var(--stage-inward)',  short: 'IN'  },
  { key: 'D Logo',              label: 'D Logo',              color: 'var(--stage-dlogo)',   short: 'DL'  },
  { key: 'B Logo',              label: 'B Logo',              color: 'var(--stage-blogo)',   short: 'BL'  },
  { key: 'CO Stage',            label: 'CO Stage',            color: 'var(--stage-co)',      short: 'CO'  },
  { key: 'Store Office',        label: 'Store Office',        color: 'var(--stage-store)',   short: 'SO'  },
  { key: 'IFA',                 label: 'IFA',                 color: 'var(--stage-ifa)',     short: 'IFA' },
  { key: 'Tender Prep',         label: 'Tender Preparation',  color: 'var(--stage-tender)',  short: 'TP'  },
  { key: 'Tender Published',    label: 'Tender Published',    color: 'var(--stage-done)',    short: 'PUB' },
  { key: 'Evolution',           label: 'Evolution',           color: 'var(--stage-done)',    short: 'EVO' },
  { key: 'Bid Awarded',         label: 'Bid Awarded',         color: 'var(--stage-done)',    short: 'AWD' },
  { key: 'CB Punching',         label: 'CB Punching',         color: 'var(--stage-done)',    short: 'CB'  },
  { key: 'Forwarded to CDA/GEM',label: 'Forwarded to CDA/GEM',color: 'var(--stage-done)',   short: 'FWD' },
  { key: 'Logo Office',         label: 'Logo Office',         color: 'var(--stage-dlogo)',   short: 'LO'  },
  { key: 'Mailman',             label: 'Mailman',             color: 'var(--stage-co)',      short: 'MM'  },
] as const;

export type StageName = typeof STAGES[number]['key'];

/**
 * Returns the index of a stage in the pipeline.
 * Used to determine "completion" of a stage in the SVG flow.
 */
export function getStageIndex(stageName: string): number {
  return STAGES.findIndex(s => s.key === stageName);
}

/**
 * Maps a current status string to a CSS badge class.
 */
export function statusToBadge(status: string): string {
  const map: Record<string, string> = {
    'Inward':           'badge-blue',
    'D Logo':           'badge-purple',
    'B Logo':           'badge-amber',
    'CO Stage':         'badge-red',
    'Store Office':     'badge-blue',
    'IFA':              'badge-amber',
    'Tender Prep':      'badge-amber',
    'Tender Published': 'badge-green',
    'Bid Awarded':      'badge-green',
  };
  return map[status] ?? 'badge-blue';
}

/**
 * Generates the QR code value from a fileId.
 * This is the string encoded into the QR image.
 */
export function buildQRValue(fileId: string): string {
  return `FSMS_FILE:${fileId}`;
}

/**
 * Parses a raw QR scanned value and extracts the fileId.
 * Returns null if the value is not a valid FSMS QR code.
 */
export function parseQRValue(raw: string): string | null {
  const prefix = 'FSMS_FILE:';
  if (raw.startsWith(prefix)) {
    return raw.slice(prefix.length).trim();
  }
  // Also support raw fileId directly (admin manual entry)
  if (raw.length >= 10) return raw.trim();
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
 * Format datetime.
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
