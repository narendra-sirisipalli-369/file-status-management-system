'use client';

import { useEffect, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

type Department = { id: string; name: string; code: string; isActive: boolean };
type StageType = 'IN' | 'OUT';
type Stage = { id: string; name: string; stageType: StageType; isActive: boolean };
type Lookup = { id: string; name: string; isSystemDefined: boolean; isActive: boolean };
type MajorHeadCode = { id: string; code: string; name: string; isActive: boolean };
type HeadCode = { id: string; code: string; name: string; majorId: string | null; isSystemDefined: boolean; isActive: boolean };
type HeadCodeItem = { id: string; headCodeId: string; code: string; name: string; isActive: boolean };

type Tab = 'departments' | 'stages' | 'procurement-modes' | 'authorities' | 'head-codes' | 'remarks-by';

const TABS: { key: Tab; label: string }[] = [
  { key: 'departments', label: 'Departments' },
  { key: 'stages', label: 'Stages' },
  { key: 'procurement-modes', label: 'Procurement Modes' },
  { key: 'authorities', label: 'Authorities' },
  { key: 'head-codes', label: 'Head Codes' },
  { key: 'remarks-by', label: 'Remarks By' },
];

export default function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [procurementModes, setProcurementModes] = useState<Lookup[]>([]);
  const [authorities, setAuthorities] = useState<Lookup[]>([]);
  const [majorHeadCodes, setMajorHeadCodes] = useState<MajorHeadCode[]>([]);
  const [headCodes, setHeadCodes] = useState<HeadCode[]>([]);
  const [headCodeItems, setHeadCodeItems] = useState<HeadCodeItem[]>([]);
  const [remarksBy, setRemarksBy] = useState<Lookup[]>([]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAll = async () => {
    const [d, s, pm, a, mhc, hc, hci, rb] = await Promise.all([
      fetch('/api/departments?activeOnly=false').then((r) => r.json()),
      fetch('/api/stages?activeOnly=false').then((r) => r.json()),
      fetch('/api/procurement-modes?activeOnly=false').then((r) => r.json()),
      fetch('/api/authorities?activeOnly=false').then((r) => r.json()),
      fetch('/api/major-head-codes?activeOnly=false').then((r) => r.json()),
      fetch('/api/head-codes?activeOnly=false').then((r) => r.json()),
      fetch('/api/head-code-items?activeOnly=false').then((r) => r.json()),
      fetch('/api/remarks-by?activeOnly=false').then((r) => r.json()),
    ]);
    setDepartments(d);
    setStages(s);
    setProcurementModes(pm);
    setAuthorities(a);
    setMajorHeadCodes(mhc);
    setHeadCodes(hc);
    setHeadCodeItems(hci);
    setRemarksBy(rb);
  };

  useEffect(() => {
    loadAll();
  }, []);

  async function toggleActive(endpoint: string, id: string, isActive: boolean) {
    const res = await fetch(`${endpoint}?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) {
      await loadAll();
    } else {
      const d = await res.json();
      setMsg({ type: 'error', text: d.error ?? 'Update failed' });
    }
  }

  async function deleteItem(endpoint: string, id: string, label: string) {
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    const res = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAll();
      setMsg({ type: 'success', text: `"${label}" deleted.` });
    } else {
      const d = await res.json();
      setMsg({ type: 'error', text: d.error ?? 'Delete failed' });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Master Data</div>
        </div>
      </div>

      <div className="container">
        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} mb-lg`} role="alert">
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border)' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="btn btn-ghost"
              style={{
                borderRadius: 0,
                borderBottom: tab === t.key ? '2px solid var(--navy)' : '2px solid transparent',
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? 'var(--navy)' : 'var(--text-secondary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'departments' && (
          <DepartmentPanel
            departments={departments}
            onCreated={loadAll}
            onToggle={(id, active) => toggleActive('/api/departments', id, active)}
            onDelete={(id, label) => deleteItem('/api/departments', id, label)}
            setMsg={setMsg}
          />
        )}
        {tab === 'stages' && (
          <StagePanel stages={stages} onCreated={loadAll} onToggle={(id, active) => toggleActive('/api/stages', id, active)} setMsg={setMsg} />
        )}
        {tab === 'procurement-modes' && (
          <LookupPanel
            title="Procurement Mode"
            endpoint="/api/procurement-modes"
            items={procurementModes}
            onCreated={loadAll}
            onToggle={(id, active) => toggleActive('/api/procurement-modes', id, active)}
            onDelete={(id, label) => deleteItem('/api/procurement-modes', id, label)}
            setMsg={setMsg}
          />
        )}
        {tab === 'authorities' && (
          <LookupPanel
            title="Authority"
            endpoint="/api/authorities"
            items={authorities}
            onCreated={loadAll}
            onToggle={(id, active) => toggleActive('/api/authorities', id, active)}
            onDelete={(id, label) => deleteItem('/api/authorities', id, label)}
            setMsg={setMsg}
          />
        )}
        {tab === 'head-codes' && (
          <HeadCodePanel
            majorHeadCodes={majorHeadCodes}
            headCodes={headCodes}
            headCodeItems={headCodeItems}
            onCreated={loadAll}
            setMsg={setMsg}
          />
        )}
        {tab === 'remarks-by' && (
          <LookupPanel
            title="Remarks By"
            endpoint="/api/remarks-by"
            items={remarksBy}
            onCreated={loadAll}
            onToggle={(id, active) => toggleActive('/api/remarks-by', id, active)}
            onDelete={(id, label) => deleteItem('/api/remarks-by', id, label)}
            setMsg={setMsg}
          />
        )}
      </div>
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        fontSize: '0.6rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        background: active ? 'var(--success-bg)' : 'var(--bg-light)',
        color: active ? 'var(--success)' : 'var(--text-muted)',
      }}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function DepartmentPanel({
  departments, onCreated, onToggle, onDelete, setMsg,
}: { departments: Department[]; onCreated: () => void; onToggle: (id: string, active: boolean) => void; onDelete: (id: string, label: string) => void; setMsg: (m: { type: 'success' | 'error'; text: string }) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code }) });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setName(''); setCode('');
      onCreated();
      setMsg({ type: 'success', text: `Department "${d.data.name}" created.` });
    } else {
      setMsg({ type: 'error', text: d.error ?? 'Failed to create department' });
    }
  };

  return (
    <div className="grid-sidebar" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-header">Add Department</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group"><label>Name</label><input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="input-group"><label>Code</label><input className="input-field" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Saving...' : 'Add Department'}</button>
        </form>
      </div>
      <div className="table-wrap table-scroll-box">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{d.code}</td>
                <td><ActiveBadge active={d.isActive} /></td>
                <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button className={`btn btn-sm ${d.isActive ? 'btn-warning' : 'btn-success'}`} onClick={() => onToggle(d.id, !d.isActive)}>{d.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(d.id, d.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StageTypeBadge({ stageType }: { stageType: StageType }) {
  return (
    <span
      style={{
        fontSize: '0.6rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        background: stageType === 'IN' ? 'var(--success-bg)' : 'var(--bg-light)',
        color: stageType === 'IN' ? 'var(--success)' : 'var(--text-secondary)',
      }}
    >
      {stageType}
    </span>
  );
}

function StagePanel({
  stages, onCreated, onToggle, setMsg,
}: { stages: Stage[]; onCreated: () => void; onToggle: (id: string, active: boolean) => void; setMsg: (m: { type: 'success' | 'error'; text: string }) => void }) {
  const [name, setName] = useState('');
  const [stageType, setStageType] = useState<StageType>('IN');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stageType }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setName(''); setStageType('IN');
      onCreated();
      setMsg({ type: 'success', text: `Stage "${d.data.name}" created.` });
    } else {
      setMsg({ type: 'error', text: d.error ?? 'Failed to create stage' });
    }
  };

  const allSelected = stages.length > 0 && selectedIds.length === stages.length;

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : stages.map((s) => s.id));
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    const res = await fetch('/api/stages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    });
    const d = await res.json();
    setDeleting(false);
    setSelectedIds([]);
    onCreated();
    if (res.ok) {
      if (d.blocked.length > 0) {
        setMsg({ type: 'error', text: `Deleted ${d.deleted.length} stage(s). ${d.blocked.length} could not be deleted because they are already in use by a Procurement Process configuration or a file.` });
      } else {
        setMsg({ type: 'success', text: `Deleted ${d.deleted.length} stage(s).` });
      }
    } else {
      setMsg({ type: 'error', text: d.error ?? 'Failed to delete stages' });
    }
  }

  return (
    <div className="grid-sidebar" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-header">Add Stage</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group"><label>Name</label><input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="input-group">
            <label>In / Out</label>
            <select className="input-field" value={stageType} onChange={(e) => setStageType(e.target.value as StageType)}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Saving...' : 'Add Stage'}</button>
        </form>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.65rem', color: 'var(--danger)' }}
            disabled={selectedIds.length === 0 || deleting}
            onClick={deleteSelected}
          >
            {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
          </button>
        </div>
        <div className="table-wrap table-scroll-box">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all stages" /></th>
                <th>Name</th>
                <th>In / Out</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelectOne(s.id)} aria-label={`Select stage ${s.name}`} /></td>
                  <td>{s.name}</td>
                  <td><StageTypeBadge stageType={s.stageType} /></td>
                  <td><ActiveBadge active={s.isActive} /></td>
                  <td><button className={`btn btn-sm ${s.isActive ? 'btn-warning' : 'btn-success'}`} onClick={() => onToggle(s.id, !s.isActive)}>{s.isActive ? 'Deactivate' : 'Activate'}</button></td>
                </tr>
              ))}
              {stages.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No stages yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LookupPanel({
  title, endpoint, items, onCreated, onToggle, onDelete, setMsg,
}: { title: string; endpoint: string; items: Lookup[]; onCreated: () => void; onToggle: (id: string, active: boolean) => void; onDelete: (id: string, label: string) => void; setMsg: (m: { type: 'success' | 'error'; text: string }) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setName('');
      onCreated();
      setMsg({ type: 'success', text: `${title} "${d.data.name}" created.` });
    } else {
      setMsg({ type: 'error', text: d.error ?? `Failed to create ${title.toLowerCase()}` });
    }
  };

  return (
    <div className="grid-sidebar" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-header">Add {title}</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group"><label>Name</label><input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Saving...' : `Add ${title}`}</button>
        </form>
      </div>
      <div className="table-wrap table-scroll-box">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Source</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{i.isSystemDefined ? 'Predefined' : 'Added via "Other"'}</td>
                <td><ActiveBadge active={i.isActive} /></td>
                <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button className={`btn btn-sm ${i.isActive ? 'btn-warning' : 'btn-success'}`} onClick={() => onToggle(i.id, !i.isActive)}>{i.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDelete(i.id, i.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type HeadCodeLevel = 'MAJOR' | 'MINOR' | 'CODE';

type CombinedHeadCodeRow = {
  id: string;
  level: HeadCodeLevel;
  code: string;
  isActive: boolean;
};

const LEVEL_ORDER: Record<HeadCodeLevel, number> = { MAJOR: 0, MINOR: 1, CODE: 2 };
const LEVEL_LABEL: Record<HeadCodeLevel, string> = { MAJOR: 'Major', MINOR: 'Minor', CODE: 'Code' };
const LEVEL_ENDPOINT: Record<HeadCodeLevel, string> = {
  MAJOR: '/api/major-head-codes',
  MINOR: '/api/head-codes',
  CODE: '/api/head-code-items',
};

/**
 * Single unified Head Codes section covering all three categories of head
 * code (Major / Minor / Code). One form — a Category dropdown plus a Code
 * field, nothing else — and one combined table.
 */
function HeadCodePanel({
  majorHeadCodes, headCodes, headCodeItems, onCreated, setMsg,
}: {
  majorHeadCodes: MajorHeadCode[];
  headCodes: HeadCode[];
  headCodeItems: HeadCodeItem[];
  onCreated: () => void;
  setMsg: (m: { type: 'success' | 'error'; text: string }) => void;
}) {
  const [level, setLevel] = useState<HeadCodeLevel>('MAJOR');
  const [code, setCode] = useState('');
  const [editing, setEditing] = useState<{ id: string; level: HeadCodeLevel } | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setLevel('MAJOR');
    setCode('');
  };

  const startEdit = (row: CombinedHeadCodeRow) => {
    setEditing({ id: row.id, level: row.level });
    setLevel(row.level);
    setCode(row.code);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { code, name: code };
    const url = LEVEL_ENDPOINT[level];
    const res = editing
      ? await fetch(`${url}?id=${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ type: 'success', text: `${LEVEL_LABEL[level]} "${d.data.code}" ${editing ? 'updated' : 'created'}.` });
      resetForm();
      onCreated();
    } else {
      setMsg({ type: 'error', text: d.error ?? 'Failed to save' });
    }
  };

  const toggle = async (row: CombinedHeadCodeRow) => {
    const url = LEVEL_ENDPOINT[row.level];
    const res = await fetch(`${url}?id=${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !row.isActive }) });
    if (res.ok) {
      onCreated();
    } else {
      const d = await res.json();
      setMsg({ type: 'error', text: d.error ?? 'Update failed' });
    }
  };

  const remove = async (row: CombinedHeadCodeRow) => {
    if (!confirm(`Delete "${row.code}"? This cannot be undone.`)) return;
    const url = LEVEL_ENDPOINT[row.level];
    const res = await fetch(`${url}?id=${row.id}`, { method: 'DELETE' });
    if (res.ok) {
      onCreated();
      setMsg({ type: 'success', text: `"${row.code}" deleted.` });
    } else {
      const d = await res.json();
      setMsg({ type: 'error', text: d.error ?? 'Delete failed' });
    }
  };

  const rows: CombinedHeadCodeRow[] = [
    ...majorHeadCodes.map((m) => ({ id: m.id, level: 'MAJOR' as const, code: m.code, isActive: m.isActive })),
    ...headCodes.map((h) => ({ id: h.id, level: 'MINOR' as const, code: h.code, isActive: h.isActive })),
    ...headCodeItems.map((it) => ({ id: it.id, level: 'CODE' as const, code: it.code, isActive: it.isActive })),
  ].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.code.localeCompare(b.code));

  return (
    <div className="grid-sidebar" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-header">{editing ? `Edit ${LEVEL_LABEL[editing.level]}` : 'Add Head Code'}</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label>Name (Category)</label>
            <select
              className="input-field"
              value={level}
              disabled={!!editing}
              onChange={(e) => setLevel(e.target.value as HeadCodeLevel)}
            >
              <option value="MAJOR">Major</option>
              <option value="MINOR">Minor</option>
              <option value="CODE">Code</option>
            </select>
          </div>
          <div className="input-group"><label>Code</label><input className="input-field" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Head Code'}</button>
            {editing && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="table-wrap table-scroll-box">
        <table className="data-table">
          <thead><tr><th>Name (Category)</th><th>Code</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.level}-${row.id}`}>
                <td style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>{LEVEL_LABEL[row.level]}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{row.code}</td>
                <td><ActiveBadge active={row.isActive} /></td>
                <td style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button className="btn btn-sm" onClick={() => startEdit(row)}>Edit</button>
                  <button className={`btn btn-sm ${row.isActive ? 'btn-warning' : 'btn-success'}`} onClick={() => toggle(row)}>{row.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(row)}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No head codes yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
