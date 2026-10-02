import { notFound } from 'next/navigation';
import { isValidTrackingId } from '@/lib/trackingId';
import { getFileDetail } from '@/lib/fileRecordService';
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

  const detail = await getFileDetail(secureId);

  if (!detail) {
    notFound(); // Strict 404 — no data leakage
  }

  const { file, histories } = detail;

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
                  <th>Case Description</th>
                  <th>Proposal Value (INR)</th>
                  <th>File No</th>
                  <th>Mode of procurement</th>
                  <th>Authority</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td className="preserve-case">{file.description}</td>
                  <td>{fmtINR(Number(file.proposalValue))}</td>
                  <td>{file.smsRefNo}</td>
                  <td>{file.procurementModeName}</td>
                  <td>{file.authorityName || '-'}</td>
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
                  <th>Action</th>
                  <th>Stage</th>
                  <th>Date of Submission</th>
                  <th>By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {histories.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      No status history recorded.
                    </td>
                  </tr>
                )}

                {histories.map((history) => (
                  <tr key={history.id}>
                    <td>{history.action}</td>
                    <td>{history.stageName ?? '—'}</td>
                    <td>{fmtDate(history.timestamp)}</td>
                    <td>{history.actorUsername ?? '—'}</td>
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
