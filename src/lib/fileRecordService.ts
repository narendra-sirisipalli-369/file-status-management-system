import { prisma } from '@/lib/prisma';
import { generateSecureTrackingId } from '@/lib/trackingId';
import { z } from 'zod';

export const fileEntrySchema = z.object({
  description: z.string().min(5),
  proposalValue: z.number().positive(),
  head: z.string().min(1),
  department: z.string().min(1),
  typeProcessing: z.string().min(1),
  dateSubmission: z.string().optional(),
  mobileNumber: z.string().optional().default(''),
  smsRefNoOverride: z.string().optional(),
});

export type FileEntryInput = z.infer<typeof fileEntrySchema>;

export async function createFileRecord(
  input: FileEntryInput,
  audit: { userId?: string; username?: string }
) {
  let smsRefNo = input.smsRefNoOverride;
  if (!smsRefNo) {
    const refCount = await prisma.fileRecord.count();
    smsRefNo = `SMS/LOG/${String(refCount + 201).padStart(3, '0')}`;
  }
  const secureTrackingId = generateSecureTrackingId(smsRefNo);

  const created = await prisma.$transaction(async (tx) => {
    const file = await tx.fileRecord.create({
      data: {
        smsRefNo,
        secureTrackingId,
        description: input.description,
        proposalValue: input.proposalValue,
        head: input.head,
        department: input.department,
        typeProcessing: input.typeProcessing,
        mobileNumber: input.mobileNumber,
        status: 'Inward',
        dateSubmission: input.dateSubmission ? new Date(input.dateSubmission) : new Date(),
        createdById: audit.userId,
      },
    });

    await tx.statusHistory.create({
      data: {
        fileRecordId: file.id,
        stageName: 'Inward',
        inspectionBy: audit.username ?? 'Inward User',
        remarks: 'File received and registered in the system.',
        actorUserId: audit.userId,
      },
    });

    return file;
  });

  return created;
}
