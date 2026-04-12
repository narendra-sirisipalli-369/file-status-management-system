import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function QuickScanRedirect({ searchParams }: { searchParams: { qr?: string } }) {
  const rawQr = searchParams.qr?.trim();

  if (!rawQr) {
    redirect('/admin/files?error=No+QR+code+provided');
  }

  // Same logic as qr-resolver API
  let fileId = rawQr;
  if (rawQr.startsWith('http')) {
    try {
      const url = new URL(rawQr);
      // Expected: scheme://host/admin/file/[fileId]
      const pathParts = url.pathname.split('/');
      fileId = pathParts[pathParts.length - 1];
    } catch {
      fileId = rawQr;
    }
  }

  // Priority exact matching:
  // 1. IND-CV Unique Secure ID (100% accurate)
  // 2. Prisma UUID fallback (from URL)
  // 3. User-friendly SMS ID fallback
  const file = await prisma.fileRecord.findFirst({
    where: {
      OR: [
        { secureTrackingId: fileId },
        { fileId: fileId },
        { smsRefNo: fileId },
      ]
    },
    select: { fileId: true }
  });

  if (file) {
    redirect(`/admin/file/${file.fileId}`);
  } else {
    redirect('/admin/files?error=File+not+found+from+scan');
  }
}
