'use client';

import { useState, useEffect, useRef } from 'react';

const ROLES = [
  { value: 'ADMIN', label: 'Admin (full control)' },
  { value: 'USER', label: 'User (dashboard, file entry & search only)' },
  { value: 'KIOSK', label: 'Kiosk (view-only, per department)' },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['Full system control', 'Admin management', 'Master data & Procurement Process', 'File entry', 'Stage in/out', 'Reports', 'Flow Charts'],
  USER: ['Dashboard', 'File entry', 'File search', 'No stage in/out, master data, or admin access'],
  KIOSK: ['View files for one department', 'Search files', 'Track by QR code', 'No edit access'],
};

type Department = { id: string; name: string };
type User = { id: string; username: string; role: string; departmentId: string | null; departmentName: string | null; mobileNumber: string | null; createdAt: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInit] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'KIOSK', departmentId: '', mobileNumber: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', mobileNumber: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /** "Create New User" (plus Edit User, when open) sets the row height; the table panel is capped to it and scrolls internally instead of stretching the form. */
  const formColRef = useRef<HTMLDivElement>(null);
  const [tableMaxHeight, setTableMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = formColRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setTableMaxHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, deptRes] = await Promise.all([fetch('/api/users'), fetch('/api/departments')]);
      const usersData = await usersRes.json();
      const deptData = await deptRes.json();
      if (Array.isArray(usersData)) setUsers(usersData);
      if (Array.isArray(deptData)) {
        setDepartments(deptData);
        setForm((p) => ({ ...p, departmentId: p.departmentId || deptData[0]?.id || '' }));
      }
    } finally {
      setLoading(false);
      setInit(true);
    }
  };

  useEffect(() => {
    if (!initialized) loadUsers();
  }, [initialized]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role,
          departmentId: form.role === 'KIOSK' ? form.departmentId : null,
          mobileNumber: form.role === 'KIOSK' && form.mobileNumber.trim() ? form.mobileNumber.trim() : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: `User "${form.username}" created successfully.` });
        setForm((p) => ({ ...p, username: '', password: '', mobileNumber: '' }));
        loadUsers();
      } else {
        setMsg({ type: 'error', text: data.error ?? 'Failed to create user.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please retry.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setMsg({ type: 'success', text: `User "${username}" deleted.` });
      } else {
        setMsg({ type: 'error', text: 'Delete failed.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error.' });
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({ username: user.username, password: '', mobileNumber: user.mobileNumber ?? '' });
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ username: '', password: '', mobileNumber: '' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setMsg(null);

    const body: Record<string, unknown> = { username: editForm.username, mobileNumber: editForm.mobileNumber.trim() || null };
    if (editForm.password.trim()) {
      body.password = editForm.password;
    }

    try {
      const res = await fetch(`/api/users?id=${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: `User "${editForm.username}" updated successfully.` });
        cancelEdit();
        loadUsers();
      } else {
        setMsg({ type: 'error', text: data.error ?? 'Failed to update user.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please retry.' });
    } finally {
      setEditLoading(false);
    }
  };

  const roleBadgeStyle = (role: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      ADMIN: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
      USER: { bg: 'var(--navy-faint)', color: 'var(--navy)' },
      KIOSK: { bg: 'var(--success-bg)', color: 'var(--success)' },
    };
    const c = map[role] ?? { bg: 'var(--bg-light)', color: 'var(--text-secondary)' };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      background: c.bg,
      borderLeft: `3px solid ${c.color}`,
      color: c.color,
      borderRadius: 0,
      fontSize: '0.62rem',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="container">
        <div className="section-header">
          <div>
            <div className="page-title">Admin Management</div>
            <div className="page-sub">Create user accounts, manage kiosk access, and edit personnel details.</div>
          </div>
        </div>

        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} mb-lg`} role="alert">
            {msg.text}
          </div>
        )}

        <div className="grid-sidebar" style={{ alignItems: 'start' }}>
          <div ref={formColRef} style={{ display: 'grid', gap: 'var(--space-lg)' }}>
            <div className="card">
              <div className="card-header">Create New User</div>
              <form onSubmit={handleCreate} style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="new-username">Username</label>
                    <input id="new-username" type="text" className="input-field" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="e.g. accounts_kiosk" minLength={3} required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="new-password">Password</label>
                    <input id="new-password" type="password" className="input-field" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" minLength={8} required />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label htmlFor="new-role">Role</label>
                    <select id="new-role" className="input-field" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  {form.role === 'KIOSK' ? (
                    <div className="input-group">
                      <label htmlFor="new-department">Department</label>
                      <select id="new-department" className="input-field" value={form.departmentId} onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                {form.role === 'KIOSK' && (
                  <div className="input-group">
                    <label htmlFor="new-mobile">Mobile Number</label>
                    <input
                      id="new-mobile"
                      type="tel"
                      className="input-field"
                      value={form.mobileNumber}
                      onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                      placeholder="e.g. 9876543210 (optional)"
                    />
                  </div>
                )}

                <div className="card" style={{ background: 'var(--bg-light)', borderColor: 'var(--border)', boxShadow: 'none' }}>
                  <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>Permissions</div>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    {(ROLE_PERMISSIONS[form.role] ?? []).map((p) => (
                      <div key={p} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>+</span>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary w-full" id="create-user-btn" disabled={formLoading}>
                    {formLoading ? 'Creating...' : 'Create User Account'}
                  </button>
                </div>
              </form>
            </div>

            {editingUser && (
              <div className="card">
                <div className="card-header">Edit User</div>
                <form onSubmit={handleUpdate} style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label htmlFor="edit-username">Username</label>
                    <input
                      id="edit-username"
                      type="text"
                      className="input-field"
                      value={editForm.username}
                      onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                      placeholder="Enter new username"
                      minLength={3}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="edit-password">Password</label>
                    <input
                      id="edit-password"
                      type="password"
                      className="input-field"
                      value={editForm.password}
                      onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Leave blank to keep current password"
                      minLength={8}
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="edit-mobile">Mobile Number</label>
                    <input
                      id="edit-mobile"
                      type="tel"
                      className="input-field"
                      value={editForm.mobileNumber}
                      onChange={(e) => setEditForm((p) => ({ ...p, mobileNumber: e.target.value }))}
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary w-full" disabled={editLoading}>
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" className="btn btn-secondary w-full" onClick={cancelEdit} disabled={editLoading}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="table-panel" style={{ display: 'flex', flexDirection: 'column', maxHeight: tableMaxHeight }}>
            <div className="table-panel-header">
              <div className="section-title">System Personnel Accounts</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{users.length} records</div>
            </div>
            <div className="table-panel-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ padding: 'var(--space-lg)' }}>
                  {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 1 }} />)}
                </div>
              ) : (
                <div className="table-wrap table-scroll-box" style={{ border: 'none', borderRadius: 0, maxHeight: 'none', flex: 1, minHeight: 0 }}>
                  <table className="data-table compact" aria-label="Users List">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Mobile Number</th>
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
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{u.departmentName ?? '—'}</td>
                          <td style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{u.mobileNumber ?? '—'}</td>
                          <td style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{fmtDate(u.createdAt)}</td>
                          <td style={{ display: 'flex', gap: '0.35rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => startEdit(u)}>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.username)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
