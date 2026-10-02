// ─── ROLE-BASED ACCESS CONTROL ────────────────────────────────────────────
// Three roles. ADMIN does everything (file entry, stage in/out, master data,
// Procurement Process config, admin management, reports). USER is
// department-less like ADMIN but restricted to dashboard/file entry/file
// search — no master data, Procurement Process, admin management, or
// reports. KIOSK is per-department, view-only search/track. This is the
// single source of truth for role→route access — middleware.ts and API
// routes both import from here instead of re-declaring their own literal
// role arrays.

export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  KIOSK: 'KIOSK',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

/** Route prefixes only ADMIN may access — USER is redirected away from these. */
export const ADMIN_ONLY_ROUTES: string[] = [
  '/admin/users',
  '/admin/master-data',
  '/admin/stage-manager',
  '/admin/reports',
  '/admin/automation-log',
]

export function hasAnyRole(role: string | null | undefined, allowed: AppRole[]): boolean {
  if (!role) return false
  return allowed.includes(role as AppRole)
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN
}

export function isKiosk(role: string | null | undefined): boolean {
  return role === ROLES.KIOSK
}

/** ADMIN or USER — anyone who logs in through the staff portal (i.e. not KIOSK). */
export function isStaff(role: string | null | undefined): boolean {
  return role === ROLES.ADMIN || role === ROLES.USER
}
