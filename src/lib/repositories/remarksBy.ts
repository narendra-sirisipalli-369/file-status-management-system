import { createLookupRepository } from '@/lib/repositories/lookupFactory'

export const remarksBy = createLookupRepository('remarks_by')
export type { LookupRow as RemarksBy } from '@/lib/repositories/lookupFactory'
