'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useISTClock } from '@/hooks/useISTClock';
import Image from 'next/image';

/**
 * Kiosk File Detail — Screen 4
 * Per FSMS_Report.pdf: File Details table + Status Summary table + Final Status display.
 */

type History = {
  id: string; stageName: string; inspectionBy: string;
  remarks: string; timestamp: string;
};
type FileRecord = {
  id: string; smsRefNo: string; fileId: string;
  description: string; proposalValue: number; head: string;
  department: string; typeProcessing: string; status: string;
  dateSubmission: string; histories: History[];
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export default function KioskFileDetailPage({ params }: { params: { fileId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = searchParams.get('department') ?? 'Logistics';
  const { time } = useISTClock();
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/files/${params.fileId}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setFile(data))
      .catch(() => setError('File not found.'))
      .finally(() => setLoading(false));
  }, [params.fileId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f4f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
      Loading file details...
    </div>
  );

  if (error || !file) return (
    <div style={{ minHeight: '100vh', background: '#f4f4f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ color: '#8f1d1d', fontSize: '1rem', fontWeight: 600 }}>{error || 'File not found'}</div>
      <button onClick={() => router.back()} style={{ minHeight: 42, border: '1px solid #000080', borderRadius: 4, background: '#fff', color: '#000080', padding: '0 1rem', fontWeight: 700, cursor: 'pointer' }}>
        Back
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f8' }}>
      {/* Top Navigation Bar */}
      <nav style={{
        background: '#000080', borderBottom: '3px solid #b8860b',
        padding: '0 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 64,
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/logo/ins-dega.png" alt="INS Dega" width={48} height={48} style={{ objectFit: 'contain' }} priority />
          <div style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff' }}>
            INS DEGA
            <span style={{ display: 'block', fontWeight: 400, fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>{department}</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
          {time || '00:00:00'} IST
        </div>
        <Image src="/logo/eastern-command.png" alt="Eastern Naval Command" width={48} height={48} style={{ objectFit: 'contain' }} priority />
      </nav>

      <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
        {/* Header + Back */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{
              fontFamily: 'Arial, sans-serif', fontSize: '0.9rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000080',
            }}>File Details</h1>
            <div style={{ fontSize: '0.72rem', color: '#59616b' }}>{file.smsRefNo}</div>
          </div>
          <button
            onClick={() => router.back()}
            style={{
              minHeight: 42, border: '1px solid #000080', borderRadius: 4,
              background: '#fff', color: '#000080', padding: '0 1rem',
              fontFamily: 'Arial, sans-serif', fontSize: '0.68rem',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Back to Search
          </button>
        </div>

        {/* TABLE 1 — File Details (per PDF: Sl No, Description, Proposal Value, Ref No & Date, File Type/Head) */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
          overflow: 'hidden', marginBottom: '1.25rem',
        }}>
          <div style={{
            padding: '0.75rem 1.25rem', borderBottom: '2px solid #000080',
            fontFamily: 'Arial, sans-serif', fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000080',
          }}>
            File Information
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#000080' }}>
                {['Sl. No', 'File Name / Description', 'Proposal Value (INR)', 'SMS Number', 'File Type / Head'].map(h => (
                  <th key={h} style={{
                    padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.62rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#666' }}>1</td>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                  <div>{file.description}</div>
                  <div style={{ fontSize: '0.68rem', color: '#888', marginTop: 2 }}>Dept: {file.department} | Processing: {file.typeProcessing}</div>
                </td>
                <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontWeight: 700, color: '#333' }}>{fmtINR(file.proposalValue)}</td>
                <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontWeight: 700, color: '#000080' }}>{file.smsRefNo}</td>
                <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace" }}>{file.head}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABLE 2 — Status Summary (per PDF: Stage, Date of Submission, Inspection Done By, Remarks) */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
          overflow: 'hidden', marginBottom: '1.25rem',
        }}>
          <div style={{
            padding: '0.75rem 1.25rem', borderBottom: '2px solid #000080',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{
              fontFamily: 'Arial, sans-serif', fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000080',
            }}>Status Summary</div>
            <span style={{ fontSize: '0.65rem', color: '#888', fontFamily: "'Courier New', monospace" }}>
              {file.histories.length} stages recorded
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#000080' }}>
                {['#', 'Stage', 'Date of Submission', 'Inspection Done By', 'Remarks'].map(h => (
                  <th key={h} style={{
                    padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.62rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {file.histories.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#888' }}>No status history recorded yet.</td></tr>
              )}
              {file.histories.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#888', fontSize: '0.82rem' }}>{i + 1}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#000080', fontSize: '0.82rem' }}>{h.stageName}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: '#555' }}>{fmtDate(h.timestamp)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{h.inspectionBy}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555' }}>{h.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FINAL STATUS (per PDF) */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderTop: '4px solid #000080',
          borderRadius: 8, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: '#f0f0f8', border: '2px solid #000080',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '1.2rem', color: '#000080',
          }}>
            {['Tender Published', 'Bid Awarded'].includes(file.status) ? 'OK' : '>>'}
          </div>
          <div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>
              Current File Status
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#000080', marginTop: '0.1rem' }}>
              {file.status}
            </div>
            {file.histories.length > 0 && (
              <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.15rem' }}>
                Last updated: {fmtDate(file.histories[file.histories.length - 1].timestamp)}
              </div>
            )}
          </div>
        </div>

        <div style={{
          textAlign: 'center', marginTop: '1.5rem', fontSize: '0.55rem',
          fontFamily: 'Arial, sans-serif', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#999',
        }}>
          FILE STATUS MANAGEMENT SYSTEM - INS DEGA LOGISTICS
        </div>
      </div>
    </div>
  );
}
