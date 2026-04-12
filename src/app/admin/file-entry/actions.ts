'use server';

import { headers } from 'next/headers';
import { createFileRecord, fileEntrySchema } from '@/lib/fileRecordService';
import { hasAnyRole, FILE_ENTRY_ROLES } from '@/lib/rbac';

export async function createFileEntryAction(input: unknown) {
  const hdrs = headers();
  const role = hdrs.get('x-user-role');
  const userId = hdrs.get('x-user-id') ?? undefined;
  const username = hdrs.get('x-username') ?? undefined;

  if (!hasAnyRole(role, FILE_ENTRY_ROLES)) {
    return { ok: false as const, error: 'Access denied' };
  }

  const parsed = fileEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: 'Validation failed',
      details: parsed.error.errors.map((e) => e.message),
    };
  }

  try {
    const file = await createFileRecord(parsed.data, { userId, username });
    return { ok: true as const, data: file };
  } catch {
    return { ok: false as const, error: 'Internal server error' };
  }
}