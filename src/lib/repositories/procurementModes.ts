import { createLookupRepository } from '@/lib/repositories/lookupFactory'

export const procurementModes = createLookupRepository('procurement_modes')
export type { LookupRow as ProcurementMode } from '@/lib/repositories/lookupFactory'
