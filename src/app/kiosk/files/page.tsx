'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useISTClock } from '@/hooks/useISTClock';
import Image from 'next/image';

/**
 * Kiosk File List — Screen 3
 * Per FSMS_Report.pdf: Displays Sl No, Description of Requirement,
 * Date of Submission, SMS Reference No. Clicking a row opens detail.
 */

type FileResult = {
  id: string;
  fileId: string;
  smsRefNo: string;
  description: string;
  dateSubmission: string;
  status: string;
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

import { Suspense } from 'react';

function KioskFilesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = searchParams.get('department') ?? 'Logistics';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const smsRefNo = searchParams.get('smsRefNo') ?? '';
  const { time } = useISTClock();

  const [files, setFiles] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (smsRefNo) params.set('smsRefNo', smsRefNo);
    params.set('department', department);

    fetch(`/api/kiosk/search?${params.toString()}`)
      .then(r => {
        if (!r.ok) throw new Error('Search failed');
        return r.json();
      })
      .then(data => {
        setFiles(Array.isArray(data.files) ? data.files : []);
      })
      .catch(() => setError('Unable to fetch files. Please try again.'))
      .finally(() => setLoading(false));
  }, [from, to, smsRefNo, department]);

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
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff' }}>
              INS DEGA
              <span style={{ display: 'block', fontWeight: 400, fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>{department}</span>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
          {time || '00:00:00'} IST
        </div>
        <Image src="/logo/eastern-command.png" alt="Eastern Naval Command" width={48} height={48} style={{ objectFit: 'contain' }} priority />
      </nav>

      <div style={{ padding: '1.5rem' }}>
        {/* Back button + title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{
              fontFamily: 'Arial, sans-serif', fontSize: '0.9rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000080',
            }}>Search Results</h1>
            <div style={{ fontSize: '0.72rem', color: '#59616b' }}>
              {smsRefNo ? ` (Ref: ${smsRefNo})` : ''}
            </div>
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams({ department });
              router.push(`/kiosk/home?${params.toString()}`);
            }}
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

        {error && (
          <div style={{
            marginBottom: '1rem', border: '1px solid #f5b7b7', background: '#fff4f4',
            color: '#8f1d1d', borderRadius: 4, padding: '0.6rem 0.75rem', fontSize: '0.78rem',
          }}>{error}</div>
        )}

        {/* Results Table */}
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#000080' }}>
                {['Sl. No', 'Description of Requirement', 'Date of Submission', 'SMS Reference No'].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    fontFamily: 'Arial, sans-serif', fontSize: '0.66rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#fff', borderBottom: '2px solid #b8860b',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Loading...</td></tr>
              )}
              {!loading && files.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No files found matching your search criteria.</td></tr>
              )}
              {files.map((f, i) => (
                <tr
                  key={f.id}
                  onClick={() => router.push(`/kiosk/file/${f.fileId}?department=${encodeURIComponent(department)}`)}
                  style={{
                    cursor: 'pointer', borderBottom: '1px solid #E2E8F0',
                    minHeight: 48,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0f4ff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#333' }}>{f.description}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: '#555' }}>{fmtDate(f.dateSubmission)}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: '#000080', fontWeight: 700 }}>{f.smsRefNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{
          textAlign: 'center', marginTop: '1.5rem', fontSize: '0.55rem',
          fontFamily: 'Arial, sans-serif', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#999',
        }}>
          FILE STATUS MANAGEMENT SYSTEM: INS DEGA LOGISTICS
        </div>
      </div>
    </div>
  );
}

export default function KioskFilesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Files...</div>}>
      <KioskFilesPageInner />
    </Suspense>
  );
}