// ─── ROLE-BASED ACCESS CONTROL ────────────────────────────────────────────────
// Authoritative list of all system roles per FSMS_Report.pdf specification.
// B_LOGO           — Super Admin: Full system control, user management
// D_LOGO           — Admin: Verification, remarks, may create staff if authorised by B Logo
// MCPO             — Admin: Administrative access (same as D Logo)
// INWARD           — Operator: File entry, QR generation, full status updates
// MAILMAN_INTERNAL — Internal courier: Received/Submitted movement only
// MAILMAN_EXTERNAL — External courier: Received/Submitted movement only
// STORE_OFFICE     — File entry, report viewing, receiving-related work
// IFA              — Approves transactions, releases budget (mandatory >1 lakh)
// CO_SIR           — Approval authority (files <=1 lakh only)

export const ROLES = {
  B_LOGO:           'B_LOGO',
  D_LOGO:           'D_LOGO',
  MCPO:             'MCPO',
  INWARD:           'INWARD',
  MAILMAN_INTERNAL: 'MAILMAN_INTERNAL',
  MAILMAN_EXTERNAL: 'MAILMAN_EXTERNAL',
  STORE_OFFICE:     'STORE_OFFICE',
  IFA:              'IFA',
  CO_SIR:           'CO_SIR',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

// Admin-tier roles (can view all modules except user management)
export const ADMIN_ROLES: AppRole[] = [ROLES.B_LOGO, ROLES.D_LOGO, ROLES.MCPO];

// Roles that can create/update file entries
export const FILE_ENTRY_ROLES: AppRole[] = [ROLES.B_LOGO, ROLES.D_LOGO, ROLES.INWARD, ROLES.STORE_OFFICE];

// Roles restricted to movement-only (Received/Submitted via QR scan)
export const MAILMAN_ROLES: AppRole[] = [ROLES.MAILMAN_INTERNAL, ROLES.MAILMAN_EXTERNAL];

// Roles that can scan QR codes
export const QR_SCAN_ROLES: AppRole[] = [ROLES.B_LOGO, ROLES.D_LOGO, ROLES.MCPO, ROLES.INWARD];

export function hasAnyRole(role: string | null | undefined, allowed: AppRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role as AppRole);
}

export function isMailman(role: string | null | undefined): boolean {
  return hasAnyRole(role, MAILMAN_ROLES);
}

export function isAdmin(role: string | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}
