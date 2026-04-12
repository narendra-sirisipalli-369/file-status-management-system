'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { STAGES, formatINR } from '@/lib/qrService';
import { buildKioskTrackUrl } from '@/lib/trackingId';

const PROCESSING_TYPES = ['GEM', 'Manual', 'PAC', 'DGSND', 'RFP'];
const DEPARTMENTS = ['Logistics', 'INAS 321', 'INAS 324', 'INAS 551', 'RO', 'INAS 333', 'ALD', 'BLO'];
const FILE_TYPES  = ['Flash', 'Head', 'GEM/800(E)', 'Manual Tender', 'PAC', 'RFP'];

export default function FileEntryPage() {
  const dateRowRef = useRef<HTMLDivElement | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateMonth, setDateMonth] = useState(() => new Date());
  const [yearOptions] = useState(() => {
    const now = new Date().getFullYear();
    const start = now - 10;
    return Array.from({ length: 21 }, (_, i) => start + i);
  });
  const [form, setForm] = useState({
    description:    '',
    proposalValue:  '',
    head:           FILE_TYPES[0],
    department:     DEPARTMENTS[0],
    typeProcessing: PROCESSING_TYPES[0],
    dateSubmission: '',
    mobileNumber:   '',
    smsRefNoOverride: '',
  });

  const [generatedFile, setGeneratedFile] = useState<{
    smsRefNo: string;
    fileId: string;
    secureTrackingId: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleDatePicker = () => {
    setDatePickerOpen(open => !open);
  };

  const fmtDateForDisplay = (iso: string) => {
    // iso: YYYY-MM-DD -> display: MM / DD / YYYY (matches placeholder style)
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${m} / ${d} / ${y}`;
  };

  const parseIsoDate = (iso: string) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const toIsoDate = (date: Date) => {
    const yyyy = `${date.getFullYear()}`;
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getMonthMatrix = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < startDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    return { year, month, cells };
  };

  useEffect(() => {
    if (datePickerOpen) {
      const selected = parseIsoDate(form.dateSubmission);
      setDateMonth(selected ?? new Date());
    }
  }, [datePickerOpen, form.dateSubmission]);

  useEffect(() => {
    if (!datePickerOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!dateRowRef.current?.contains(event.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [datePickerOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedFile(null);

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description:    form.description,
          proposalValue:  parseFloat(form.proposalValue),
          head:           form.head,
          department:     form.department,
          typeProcessing: form.typeProcessing,
          dateSubmission: form.dateSubmission || undefined,
          mobileNumber:   form.mobileNumber,
          smsRefNoOverride: form.smsRefNoOverride || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedFile({
          smsRefNo:         data.data.smsRefNo,
          fileId:           data.data.fileId,
          secureTrackingId: data.data.secureTrackingId,
        });
        setForm({
          description: '', proposalValue: '', head: FILE_TYPES[0],
          department: DEPARTMENTS[0], typeProcessing: PROCESSING_TYPES[0],
          dateSubmission: '', mobileNumber: '', smsRefNoOverride: '',
        });
      } else {
        setError(data.error ?? 'Submission failed. Please verify all fields and retry.');
      }
    } catch {
      setError('Network error. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">File Entry — Inward</div>
          <div className="page-sub">Register a new file and generate a secure QR tracking code</div>
        </div>
        <a href="/admin" className="btn btn-ghost" id="back-to-home-entry">Back to Home</a>
      </div>

      <div className="container">
        <div className="grid-2" style={{ alignItems: 'start' }}>

          {/* ENTRY FORM */}
          <div className="glass-panel" style={{ padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)' }}>
            <div className="section-title mb-lg" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)', color: 'var(--navy)' }}>New File Registration</div>

            {error && <div className="alert alert-error mb-md" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} id="file-entry-form">
              <div className="form-grid">

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="entry-description">Description of Requirement</label>
                  <input
                    id="entry-description"
                    name="description"
                    type="text"
                    className="input-field"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Supply or service requirement description"
                    required
                    autoFocus
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="entry-value">Proposal Value (INR)</label>
                  <input
                    id="entry-value"
                    name="proposalValue"
                    type="number"
                    className="input-field"
                    value={form.proposalValue}
                    onChange={handleChange}
                    placeholder="Amount in INR"
                    min="0"
                    step="0.01"
                    required
                  />
                  {form.proposalValue && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(parseFloat(form.proposalValue))}
                    </span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="entry-head">File Type / Head</label>
                  <select id="entry-head" name="head" className="input-field" value={form.head} onChange={handleChange}>
                    {FILE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="entry-dept">Department</label>
                  <select id="entry-dept" name="department" className="input-field" value={form.department} onChange={handleChange}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="entry-type">Type of Processing</label>
                  <select id="entry-type" name="typeProcessing" className="input-field" value={form.typeProcessing} onChange={handleChange}>
                    {PROCESSING_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="entry-sms">SMS Reference No (Optional)</label>
                  <input
                    id="entry-sms"
                    name="smsRefNoOverride"
                    type="text"
                    className="input-field"
                    value={form.smsRefNoOverride}
                    onChange={handleChange}
                    placeholder="Auto-generated if left blank"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="entry-date-display">Date of Submission</label>
                  <div className="date-row" ref={dateRowRef}>
                    <input
                      id="entry-date-display"
                      type="text"
                      className="input-field date-field"
                      value={form.dateSubmission ? fmtDateForDisplay(form.dateSubmission) : ''}
                      placeholder="mm / dd / yyyy"
                      readOnly
                      onClick={toggleDatePicker}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleDatePicker();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="date-toggle"
                      aria-label={datePickerOpen ? 'Close calendar' : 'Open calendar'}
                      aria-pressed={datePickerOpen}
                      onMouseDown={e => e.preventDefault()}
                      onClick={toggleDatePicker}
                    >
                      <Calendar size={18} aria-hidden="true" />
                    </button>
                    {datePickerOpen && (
                      <div className="calendar-popover" role="dialog" aria-label="Choose Date of Submission">
                        <div className="calendar-header">
                          <button
                            type="button"
                            className="calendar-nav"
                            aria-label="Previous month"
                            onClick={() => setDateMonth(new Date(dateMonth.getFullYear(), dateMonth.getMonth() - 1, 1))}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <div className="calendar-title">
                            {dateMonth.toLocaleString('en-US', { month: 'long' })}
                          </div>
                          <select
                            className="calendar-year"
                            aria-label="Select year"
                            value={dateMonth.getFullYear()}
                            onChange={e => {
                              const year = Number(e.target.value);
                              setDateMonth(new Date(year, dateMonth.getMonth(), 1));
                            }}
                          >
                            {yearOptions.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="calendar-nav"
                            aria-label="Next month"
                            onClick={() => setDateMonth(new Date(dateMonth.getFullYear(), dateMonth.getMonth() + 1, 1))}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        <div className="calendar-week">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <span key={day}>{day}</span>
                          ))}
                        </div>
                        <div className="calendar-grid">
                          {getMonthMatrix(dateMonth).cells.map((day, idx) => {
                            if (!day) return <span key={`e-${idx}`} className="calendar-day is-empty" />;
                            const date = new Date(dateMonth.getFullYear(), dateMonth.getMonth(), day);
                            const iso = toIsoDate(date);
                            const selected = iso === form.dateSubmission;
                            return (
                              <button
                                type="button"
                                key={`e-${idx}`}
                                className={`calendar-day${selected ? ' is-selected' : ''}`}
                                onClick={() => {
                                  setForm(prev => ({ ...prev, dateSubmission: iso }));
                                  setDatePickerOpen(false);
                                }}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="entry-mobile">
                    Registered Mobile Number
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', marginLeft: 4 }}>
                      (Optional)
                    </span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '0.875rem', top: '50%',
                      transform: 'translateY(-50%)', fontSize: '0.85rem',
                      color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', pointerEvents: 'none',
                    }}>
                      +91
                    </span>
                    <input
                      id="entry-mobile"
                      name="mobileNumber"
                      type="tel"
                      className="input-field"
                      value={form.mobileNumber}
                      onChange={e => setForm(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="9876543210"
                      maxLength={10}
                      style={{ paddingLeft: '3rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    Applicant mobile number — used for kiosk self-service tracking
                  </span>
                </div>
              </div>

              {/* Processing pipeline preview */}
              <div style={{ margin: 'var(--space-md) 0', padding: 'var(--space-md)', background: 'var(--bg-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--navy)', marginBottom: '0.55rem' }}>
                  Processing Pipeline
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {STAGES.map((s, i) => (
                    <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: i === 0 ? 'var(--navy)' : 'var(--bg-light)',
                        color: i === 0 ? '#fff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontWeight: 700,
                      }}>
                        {s.short}
                      </span>
                      {i < STAGES.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>}
                    </span>
                  ))}
                </div>
              </div>

              <button
                id="file-entry-submit"
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
                style={{ marginTop: 'var(--space-sm)' }}
              >
                {loading ? 'Creating File Record...' : 'Create File and Generate QR'}
              </button>
            </form>
          </div>

          {/* QR PANEL */}
          <div>
            <div className="glass-panel" style={{ padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {generatedFile ? (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <div className="badge badge-done" style={{ marginBottom: 'var(--space-sm)', fontSize: '0.7rem' }}>
                      File Created Successfully
                    </div>
                  </div>
                  <div className="qr-wrapper">
                    <QRCode
                      value={buildKioskTrackUrl(generatedFile.secureTrackingId)}
                      size={200}
                      level="H"
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="qr-ref" style={{ fontSize: '0.85rem', marginBottom: 4 }}>{generatedFile.smsRefNo}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--navy)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', maxWidth: 280 }}>
                      {generatedFile.secureTrackingId}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'Arial, Helvetica, sans-serif', marginTop: 'var(--space-md)' }}>
                    Print and attach this QR code to the physical file folder
                  </div>
                  <a
                    href={`/admin/file/${generatedFile.fileId}`}
                    className="btn btn-ghost"
                    id="open-created-file"
                    style={{ marginTop: 'var(--space-sm)' }}
                  >
                    Open File Details
                  </a>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: 0.7 }}>
                  <svg width="84" height="84" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ marginBottom: 'var(--space-lg)', color: 'var(--border)' }}>
                    <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <rect x="10" y="10" width="12" height="12" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="36" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <rect x="42" y="10" width="12" height="12" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="4" y="36" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <rect x="10" y="42" width="12" height="12" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="36" y="36" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="46" y="36" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="36" y="46" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="54" y="36" width="6" height="14" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="46" y="54" width="14" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                  </svg>
                  <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)' }}>
                    Awaiting Submission
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', maxWidth: 220, marginTop: 'var(--space-sm)' }}>
                    Complete the registration form to generate the encrypted tracking QR code
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
