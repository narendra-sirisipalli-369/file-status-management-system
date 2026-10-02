import { createLookupRepository } from '@/lib/repositories/lookupFactory'

export const authorities = createLookupRepository('authorities')
export type { LookupRow as Authority } from '@/lib/repositories/lookupFactory'
