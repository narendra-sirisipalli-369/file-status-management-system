'use client';

  import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEPARTMENTS = ['Logistics', 'INAS 321', 'INAS 324', 'INAS 551', 'RO', 'INAS 333', 'ALD', 'BLO'];
const ROLES = [
  { value: 'B_LOGO',           label: 'B Logo (Super Admin)' },
  { value: 'D_LOGO',           label: 'D Logo (Admin)' },
  { value: 'MCPO',             label: 'MCPO (Admin)' },
  { value: 'INWARD',           label: 'Inward (File Operator)' },
  { value: 'MAILMAN_INTERNAL', label: 'Mailman - Internal' },
  { value: 'MAILMAN_EXTERNAL', label: 'Mailman - External' },
  { value: 'STORE_OFFICE',     label: 'Store Office' },
  { value: 'IFA',              label: 'IFA (Financial Approval)' },
  { value: 'CO_SIR',           label: 'CO Sir (Approver)' },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  B_LOGO:           ['Full system control', 'User management', 'File entry', 'Status updates', 'Remarks', 'Reports', 'Flow Charts'],
  D_LOGO:           ['View all files', 'Add remarks', 'Reports', 'Flow Charts', 'May create staff if authorised by B Logo'],
  MCPO:             ['View all files', 'Administrative access', 'Reports', 'Flow Charts'],
  INWARD:           ['File entry', 'QR generation', 'Full status updates', 'Remarks entry', 'Reports'],
  MAILMAN_INTERNAL: ['Mark as Received', 'Mark as Submitted (movement events only)'],
  MAILMAN_EXTERNAL: ['Mark as Received', 'Mark as Submitted (movement events only)'],
  STORE_OFFICE:     ['File entry', 'Report viewing', 'Receiving-related work'],
  IFA:              ['Approve transactions', 'Release budget', 'View reports', 'Mandatory for files above Rs. 1 lakh'],
  CO_SIR:           ['Approval authority for files up to Rs. 1 lakh', 'View assigned files'],
};

type User = { id: string; username: string; role: string; department: string | null; createdAt: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function UsersPage() {
  const [users,       setUsers]      = useState<User[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [initialized, setInit]       = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'INWARD', department: DEPARTMENTS[0] });
  const [formLoading, setFormLoading] = useState(false);
  const [msg,  setMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } finally { setLoading(false); setInit(true); }
  };

  useEffect(() => {
    if (!initialized) loadUsers();
  }, [initialized]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMsg(null);
    try {
      const res  = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: `User "${form.username}" created successfully.` });
        setForm({ username: '', password: '', role: 'INWARD', department: DEPARTMENTS[0] });
        loadUsers();
      } else {
        setMsg({ type: 'error', text: data.error ?? 'Failed to create user.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please retry.' });
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        setMsg({ type: 'success', text: `User "${username}" deleted.` });
      } else {
        setMsg({ type: 'error', text: 'Delete failed.' });
      }
    } catch { setMsg({ type: 'error', text: 'Network error.' }); }
  };

  const roleBadgeStyle = (role: string): React.CSSProperties => {
    const map: Record<string, { bg: string; border: string; color: string }> = {
      B_LOGO:  { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning)' },
      D_LOGO:  { bg: 'var(--navy-faint)', color: 'var(--navy)',    border: 'var(--navy)' },
      INWARD:  { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success)' },
      MAILMAN: { bg: 'var(--danger-bg)',  color: 'var(--danger)',  border: 'var(--danger)' },
    };
    const c = map[role] ?? { bg: 'var(--bg-light)', color: 'var(--text-secondary)', border: 'var(--border)' };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      background: c.bg,
      borderLeft: `3px solid ${c.color}`,
      color: c.color,
      borderRadius: '2px',
      fontSize: '0.62rem',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-sub">System user account management (Admin access only)</div>
        </div>
      </div>

      <div className="container">
        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} mb-lg`} role="alert">
            {msg.text}
          </div>
        )}

        <div className="grid-sidebar" style={{ alignItems: 'start' }}>

          {/* CREATE USER FORM */}
          <div className="card">
            <div className="card-header">Create New User</div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label htmlFor="new-username">Username</label>
                <input
                  id="new-username"
                  type="text"
                  className="input-field"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="e.g. inward_op1"
                  minLength={3}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="new-password">Password</label>
                <input
                  id="new-password"
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="new-role">Role</label>
                <select
                  id="new-role"
                  className="input-field"
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="new-department">Department</label>
                <select
                  id="new-department"
                  className="input-field"
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                >
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              {/* Access matrix preview */}
              <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: '0.4rem' }}>
                  Permissions: {form.role}
                </div>
                {(ROLE_PERMISSIONS[form.role] ?? []).map(p => (
                  <div key={p} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', padding: '1px 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#1a7a09', fontWeight: 700 }}>+</span>
                    {p}
                  </div>
                ))}
              </div>

              <button type="submit" className="btn btn-primary w-full" id="create-user-btn" disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create User Account'}
              </button>
            </form>
          </div>

          {/* USERS TABLE */}
          <div className="glass-panel" style={{ padding: 0, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-white)' }}>
              <div className="section-title" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)', color: 'var(--navy)' }}>System Personnel Accounts</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {users.length} identity records
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 'var(--space-lg)' }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 1 }} />)}
              </div>
            ) : (
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table" aria-label="Users List">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} id={`user-row-${i + 1}`}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'center' }}>{i + 1}</td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{u.username}</span></td>
                        <td><span style={roleBadgeStyle(u.role)}>{u.role}</span></td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{u.department ?? '—'}</td>
                        <td style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{fmtDate(u.createdAt)}</td>
                        <td>
                          <button className="btn btn-danger" style={{ minHeight: 36, fontSize: '0.65rem', padding: '0 0.75rem' }} onClick={() => handleDelete(u.id, u.username)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
