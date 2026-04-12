import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isValidTrackingId } from '@/lib/trackingId';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

interface Params {
  params: { 'secure-id': string };
}

export default async function KioskTrackPage({ params }: Params) {
  const secureId = params['secure-id'];

  // First-line defence: validate format before any DB query
  if (!isValidTrackingId(secureId)) {
    notFound();
  }

  // DB lookup — single, indexed, exact-match query
  const file = await prisma.fileRecord.findUnique({
    where: { secureTrackingId: secureId },
    include: {
      histories: { orderBy: { timestamp: 'asc' } },
    },
  });

  if (!file) {
    notFound(); // Strict 404 — no data leakage
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.main}>
        <div className={styles.trackingStrip}>
          <span>INS DEGA — File Status Management System</span>
          <span>Tracking ID: {file.secureTrackingId}</span>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableHeading}>Table 1 - File Information</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>File Name</th>
                  <th>Proposal Value (INR)</th>
                  <th>SMS Number</th>
                  <th>File Type (Flash/Head)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>{file.description}</td>
                  <td>{fmtINR(file.proposalValue)}</td>
                  <td>{file.smsRefNo}</td>
                  <td>{file.typeProcessing}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.tableHeading}>Table 2 - Status Summary</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Date of Submission</th>
                  <th>Inspection Done By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {file.histories.length === 0 && (
                  <tr>
                    <td colSpan={4} className={styles.emptyState}>
                      No status history recorded.
                    </td>
                  </tr>
                )}

                {file.histories.map((history) => (
                  <tr key={history.id}>
                    <td>{history.stageName}</td>
                    <td>{fmtDate(history.timestamp)}</td>
                    <td>{history.inspectionBy}</td>
                    <td>{history.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className={styles.footerNote}>
          File Status Management System - INS Dega Logistics Department
        </div>
      </main>
    </div>
  );
}
