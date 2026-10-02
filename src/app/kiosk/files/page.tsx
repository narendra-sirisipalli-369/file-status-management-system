'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

type FileResult = {
  id: string;
  fileId: string;
  smsRefNo: string;
  description: string;
  dateSubmission: string;
  status: string;
  currentStageName: string | null;
  authorityName: string;
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

import { Suspense } from 'react';

function KioskFilesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departmentId = searchParams.get('departmentId') ?? '';
  const departmentName = searchParams.get('departmentName') ?? 'Department';

  const [files, setFiles] = useState<FileResult[]>([]);
  const { page, setPage, totalPages, pageItems: pagedFiles } = usePagination(files);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    date: '',
    description: '',
    fileNo: '',
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (filters.date) params.set('date', filters.date);
    if (filters.description.trim()) params.set('q', filters.description.trim());
    if (filters.fileNo.trim()) params.set('fileNo', filters.fileNo.trim());

    setLoading(true);
    setError('');
    fetch(`/api/kiosk/search?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error('Search failed');
        return r.json();
      })
      .then((data) => {
        setFiles(Array.isArray(data.files) ? data.files : []);
      })
      .catch(() => setError('Unable to fetch files. Please try again.'))
      .finally(() => setLoading(false));
  }, [filters.date, filters.description, filters.fileNo, departmentId]);

  const openFile = (fileId: string) => {
    const p = new URLSearchParams({ departmentId, departmentName });
    router.push(`/kiosk/file/${fileId}?${p.toString()}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f8' }}>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{
              fontFamily: 'Arial, sans-serif', fontSize: '0.9rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000080',
            }}>Department Files</h1>
            <div style={{ fontSize: '0.72rem', color: '#59616b' }}>{departmentName}</div>
          </div>
          <button
            onClick={() => setFilters({ date: '', description: '', fileNo: '' })}
            style={{
              minHeight: 42, border: '1px solid #000080', borderRadius: 0,
              background: '#fff', color: '#000080', padding: '0 1rem',
              fontFamily: 'Arial, sans-serif', fontSize: '0.68rem',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 0,
          padding: '1rem', marginBottom: '1rem',
          display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.85rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="filter-date" style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333' }}>By Date</label>
            <input
              id="filter-date"
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
              style={{ minHeight: 42, border: '1px solid #c7d1e0', borderRadius: 0, padding: '0 0.75rem', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="filter-description" style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333' }}>Description Name</label>
            <input
              id="filter-description"
              type="search"
              value={filters.description}
              onChange={(e) => setFilters((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Search case description"
              style={{ minHeight: 42, border: '1px solid #c7d1e0', borderRadius: 0, padding: '0 0.75rem', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label htmlFor="filter-file-no" style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333' }}>File No</label>
            <input
              id="filter-file-no"
              type="search"
              value={filters.fileNo}
              onChange={(e) => setFilters((prev) => ({ ...prev, fileNo: e.target.value }))}
              placeholder="SMS ref or file no"
              style={{ minHeight: 42, border: '1px solid #c7d1e0', borderRadius: 0, padding: '0 0.75rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            marginBottom: '1rem', border: '1px solid #f5b7b7', background: '#fff4f4',
            color: '#8f1d1d', borderRadius: 0, padding: '0.6rem 0.75rem', fontSize: '0.78rem',
          }}>{error}</div>
        )}

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#000080' }}>
                {['Sl. No', 'Case Description', 'Date', 'File No', 'Authority', 'Current Stage', 'Action'].map((h) => (
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
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Loading...</td></tr>
              )}
              {!loading && files.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No files found matching your filter criteria.</td></tr>
              )}
              {pagedFiles.map((f, i) => (
                <tr
                  key={f.id}
                  onClick={() => openFile(f.fileId)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #E2E8F0', minHeight: 48 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f0f4ff'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>{(page - 1) * 10 + i + 1}</td>
                  <td className="preserve-case" style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#333' }}>{f.description}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: '#555' }}>{fmtDate(f.dateSubmission)}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: '#000080', fontWeight: 700 }}>{f.smsRefNo}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#333', fontSize: '0.82rem' }}>{f.authorityName || '-'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#333', fontSize: '0.82rem' }}>{f.currentStageName ?? 'Completed'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openFile(f.fileId); }}
                      style={{
                        minHeight: 36, border: '1px solid #000080', borderRadius: 0,
                        background: '#000080', color: '#fff', padding: '0 0.75rem',
                        fontFamily: 'Arial, sans-serif', fontSize: '0.65rem',
                        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
