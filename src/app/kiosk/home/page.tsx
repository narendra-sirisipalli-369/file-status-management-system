'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useISTClock } from '@/hooks/useISTClock';
import Image from 'next/image';

/**
 * Kiosk Home / Search Page — Screen 2
 * Per FSMS_Report.pdf: Displays department (top-left), IST clock (top-right),
 * Date range picker + SMS Reference No search field.
 */

import { Suspense } from 'react';

function KioskHomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = searchParams.get('department') ?? 'Logistics';
  const { time, date } = useISTClock();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [smsRefNo, setSmsRefNo] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      setError('From Date and To Date are required.');
      return;
    }
    if (fromDate > toDate) {
      setError('From Date cannot be later than To Date.');
      return;
    }
    setError('');
    const params = new URLSearchParams({ department, from: fromDate, to: toDate });
    if (smsRefNo.trim()) params.set('smsRefNo', smsRefNo.trim());
    router.push(`/kiosk/files?${params.toString()}`);
  };

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
              <span style={{ display: 'block', fontWeight: 400, fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>Logistics Department</span>
            </div>
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
          File Status Management
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>{time || '00:00:00 AM'}</div>
            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>IST</div>
          </div>
          <Image src="/logo/eastern-command.png" alt="Eastern Naval Command" width={48} height={48} style={{ objectFit: 'contain' }} priority />
        </div>
      </nav>

      <div style={{ padding: '1.25rem' }}>
        {/* Meta row: department + clock */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            border: '1px solid #E2E8F0', borderRadius: 6, background: '#fff', padding: '0.9rem 1rem',
          }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5c6673' }}>
              Selected Department
            </div>
            <div style={{ marginTop: '0.2rem', color: '#333', fontSize: '1rem', fontWeight: 600 }}>
              {department}
            </div>
          </div>
          <div style={{
            border: '1px solid #E2E8F0', borderRadius: 6, background: '#fff', padding: '0.9rem 1rem', textAlign: 'right',
          }}>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: '1.1rem', fontWeight: 700, color: '#000080' }}>{time || '00:00:00 AM'}</div>
            <div style={{ fontSize: '0.75rem', color: '#333' }}>{date}</div>
            <div style={{ marginTop: '0.2rem', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6c7783' }}>
              Indian Standard Time (IST)
            </div>
          </div>
        </div>

        {/* Search Card */}
        <div style={{
          width: '100%', maxWidth: 760, margin: '0 auto',
          border: '1px solid #E2E8F0', borderTop: '4px solid #000080',
          borderRadius: 8, background: '#fff', padding: '1.5rem',
        }}>
          <h1 style={{
            fontFamily: 'Arial, sans-serif', fontSize: '0.9rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000080',
          }}>Date Range Search</h1>
          <p style={{ marginTop: '0.25rem', marginBottom: '1rem', color: '#59616b', fontSize: '0.82rem' }}>
            Select the file submission date range and optional SMS Reference Number.
          </p>

          {error && (
            <div style={{
              marginBottom: '1rem', border: '1px solid #f5b7b7', background: '#fff4f4',
              color: '#8f1d1d', borderRadius: 4, padding: '0.6rem 0.75rem', fontSize: '0.78rem',
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label htmlFor="from-date" style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333' }}>From Date</label>
                <input id="from-date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required
                  style={{ minHeight: 48, border: '1px solid #c7d1e0', borderRadius: 4, background: '#fff', color: '#333', padding: '0 0.875rem', fontSize: '0.9rem', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label htmlFor="to-date" style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333' }}>To Date</label>
                <input id="to-date" type="date" value={toDate} onChange={e => setToDate(e.target.value)} required
                  style={{ minHeight: 48, border: '1px solid #c7d1e0', borderRadius: 4, background: '#fff', color: '#333', padding: '0 0.875rem', fontSize: '0.9rem', cursor: 'pointer' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
              <label htmlFor="sms-ref" style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333' }}>SMS Reference No (Optional)</label>
              <input id="sms-ref" type="text" value={smsRefNo} onChange={e => setSmsRefNo(e.target.value)} placeholder="e.g. SMS/LOG/201"
                style={{ minHeight: 48, border: '1px solid #c7d1e0', borderRadius: 4, background: '#fff', color: '#333', padding: '0 0.875rem', fontSize: '0.9rem' }} />
            </div>
            <button type="submit" style={{
              minHeight: 48, width: '100%', border: '1px solid #000080', borderRadius: 4,
              background: '#000080', color: '#fff', fontFamily: 'Arial, sans-serif',
              fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Search</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function KioskHomePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Kiosk Search...</div>}>
      <KioskHomePageInner />
    </Suspense>
  );
}
