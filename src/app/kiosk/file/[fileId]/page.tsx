'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type History = {
  id: string;
  action: string;
  stageName: string | null;
  remarks: string | null;
  actorUsername: string | null;
  timestamp: string;
};
type FileRecord = {
  id: string; smsRefNo: string; fileId: string;
  description: string; proposalValue: string;
  headCodeCode: string; headCodeName: string;
  departmentName: string; procurementModeName: string; status: string;
  authorityName: string; currentStageName: string | null;
  dateSubmission: string;
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export default function KioskFileDetailPage({ params }: { params: { fileId: string } }) {
  const router = useRouter();
  const [file, setFile] = useState<FileRecord | null>(null);
  const [histories, setHistories] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/files/${params.fileId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setFile(data.file);
        setHistories(data.histories ?? []);
      })
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
      <button onClick={() => router.back()} style={{ minHeight: 42, border: '1px solid #000080', borderRadius: 0, background: '#fff', color: '#000080', padding: '0 1rem', fontWeight: 700, cursor: 'pointer' }}>
        Back
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f8' }}>
      <div style={{ padding: '1.5rem', maxWidth: '95vw', margin: '0 auto' }}>
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
              minHeight: 42, border: '1px solid #000080', borderRadius: 0,
              background: '#fff', color: '#000080', padding: '0 1rem',
              fontFamily: 'Arial, sans-serif', fontSize: '0.68rem',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Back to Search
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
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
                {['Sl. No', 'Case Description', 'Proposal Value (INR)', 'File No', 'Head Code', 'Authority'].map((h) => (
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
                  <div className="preserve-case">{file.description}</div>
                  <div style={{ fontSize: '0.68rem', color: '#888', marginTop: 2 }}>Dept: {file.departmentName} | Mode: {file.procurementModeName}</div>
                </td>
                <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontWeight: 700, color: '#333' }}>{fmtINR(Number(file.proposalValue))}</td>
                <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontWeight: 700, color: '#000080' }}>{file.smsRefNo}</td>
                <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace" }}>{file.headCodeCode} — {file.headCodeName}</td>
                <td style={{ padding: '0.85rem 1rem' }}>{file.authorityName || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={{
            padding: '0.75rem 1.25rem', borderBottom: '2px solid #000080',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{
              fontFamily: 'Arial, sans-serif', fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000080',
            }}>Status Summary</div>
            <span style={{ fontSize: '0.65rem', color: '#888', fontFamily: "'Courier New', monospace" }}>
              {histories.length} event{histories.length !== 1 ? 's' : ''} recorded
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#000080' }}>
                {['#', 'Action', 'Stage', 'Date', 'By', 'Remarks'].map((h) => (
                  <th key={h} style={{
                    padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.62rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {histories.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#888' }}>No status history recorded yet.</td></tr>
              )}
              {histories.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#888', fontSize: '0.82rem' }}>{i + 1}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.75rem', color: '#000080' }}>{h.action}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>{h.stageName ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: '#555' }}>{fmtDate(h.timestamp)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{h.actorUsername ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#555' }}>{h.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderTop: '4px solid #000080',
          borderRadius: 0, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: '#f0f0f8', border: '2px solid #000080',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '1.2rem', color: '#000080',
          }}>
            {file.status === 'COMPLETED' ? 'OK' : '>>'}
          </div>
          <div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>
              Current File Status
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#000080', marginTop: '0.1rem' }}>
              {file.status}{file.currentStageName ? ` — ${file.currentStageName}` : ''}
            </div>
            {histories.length > 0 && (
              <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.15rem' }}>
                Last updated: {fmtDate(histories[histories.length - 1].timestamp)}
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
