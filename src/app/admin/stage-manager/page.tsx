'use client';

import { useEffect, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

type Lookup = { id: string; name: string };
type Stage = { id: string; name: string };
type Tab = 'new' | 'list';
type StageManagerConfig = {
  id: string;
  procurementModeId: string;
  authorityId: string;
  procurementModeName: string;
  authorityName: string;
  isActive: boolean;
  stages: { stageId: string; stageName: string; sequenceOrder: number }[];
};

/**
 * Click-to-add stage picker. Selected stages get a numbered badge (their
 * position in the selection) directly on the chip — order is just click
 * order, there is no separate reorder list.
 */
function StagePicker({
  stages, selectedStageIds, onToggle,
}: { stages: Stage[]; selectedStageIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0', width: '100%' }}>
      {stages.map((s, index) => {
        const order = selectedStageIds.indexOf(s.id);
        const selected = order !== -1;
        return (
          <button
            type="button"
            key={s.id}
            onClick={() => onToggle(s.id)}
            className="btn btn-ghost"
            style={{
              fontSize: '0.68rem',
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              flex: '1 1 200px',
              maxWidth: 260,
              whiteSpace: 'normal',
              textAlign: 'left',
              lineHeight: 1.3,
              borderRadius: 0,
              background: selected ? 'var(--navy)' : 'transparent',
              color: selected ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                title="Default sequence number"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, width: 16, height: 16, borderRadius: '50%',
                  background: selected ? 'rgba(255,255,255,0.2)' : 'var(--bg-light)',
                  color: selected ? '#fff' : 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700,
                }}
              >
                {index + 1}
              </span>
              <span>{s.name}</span>
            </span>
            {selected && (
              <span
                title="Selection order"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: 'var(--gold)',
                  color: 'var(--navy)', fontSize: '0.6rem', fontWeight: 800,
                }}
              >
                {order + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'new', label: 'New Configuration' },
  { key: 'list', label: 'List of Procurement Process' },
];

export default function StageManagerPage() {
  const [tab, setTab] = useState<Tab>('new');
  const [configs, setConfigs] = useState<StageManagerConfig[]>([]);
  const [configSearch, setConfigSearch] = useState('');
  const filteredConfigs = configs.filter((c) => {
    const q = configSearch.trim().toLowerCase();
    if (!q) return true;
    return c.procurementModeName.toLowerCase().includes(q) || c.authorityName.toLowerCase().includes(q);
  });
  const { page: configsPage, setPage: setConfigsPage, totalPages: configsTotalPages, pageItems: pagedConfigs } = usePagination(filteredConfigs);
  const [procurementModes, setProcurementModes] = useState<Lookup[]>([]);
  const [authorities, setAuthorities] = useState<Lookup[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [procurementModeId, setProcurementModeId] = useState('');
  const [authorityId, setAuthorityId] = useState('');
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingConfig, setEditingConfig] = useState<StageManagerConfig | null>(null);
  const [editSelectedStageIds, setEditSelectedStageIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [viewingConfig, setViewingConfig] = useState<StageManagerConfig | null>(null);

  const loadAll = async () => {
    const [c, pm, a, s] = await Promise.all([
      fetch('/api/stage-manager?activeOnly=false').then((r) => r.json()),
      fetch('/api/procurement-modes').then((r) => r.json()),
      fetch('/api/authorities').then((r) => r.json()),
      fetch('/api/stages').then((r) => r.json()),
    ]);
    setConfigs(c);
    setProcurementModes(pm);
    setAuthorities(a);
    setStages(s);
    setProcurementModeId((prev) => prev || pm[0]?.id || '');
    setAuthorityId((prev) => prev || a[0]?.id || '');
  };

  useEffect(() => {
    loadAll();
  }, []);

  function toggleStage(stageId: string) {
    setSelectedStageIds((prev) => (prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]));
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStageIds.length === 0) {
      setMsg({ type: 'error', text: 'Select at least one stage.' });
      return;
    }
    setLoading(true);
    const res = await fetch('/api/stage-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procurementModeId, authorityId, stageIds: selectedStageIds }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ type: 'success', text: 'Procurement Process configuration saved.' });
      setSelectedStageIds([]);
      await loadAll();
      setTab('list');
    } else {
      setMsg({ type: 'error', text: d.error ?? 'Failed to save configuration.' });
    }
  };

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/stage-manager?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) });
    loadAll();
  }

  async function deleteConfig(config: StageManagerConfig) {
    const label = `${config.procurementModeName} / ${config.authorityName}`;
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/stage-manager?id=${config.id}`, { method: 'DELETE' });
    if (res.ok) {
      setMsg({ type: 'success', text: `"${label}" deleted.` });
      loadAll();
    } else {
      const d = await res.json();
      setMsg({ type: 'error', text: d.error ?? 'Delete failed.' });
    }
  }

  function openEdit(config: StageManagerConfig) {
    setEditingConfig(config);
    setEditSelectedStageIds(config.stages.map((s) => s.stageId));
  }

  function closeEdit() {
    setEditingConfig(null);
    setEditSelectedStageIds([]);
  }

  function toggleEditStage(stageId: string) {
    setEditSelectedStageIds((prev) => (prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]));
  }

  async function confirmEdit() {
    if (!editingConfig) return;
    if (editSelectedStageIds.length === 0) {
      setMsg({ type: 'error', text: 'Select at least one stage.' });
      return;
    }
    setEditSaving(true);
    const res = await fetch(`/api/stage-manager?id=${editingConfig.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageIds: editSelectedStageIds }),
    });
    setEditSaving(false);
    if (res.ok) {
      setMsg({ type: 'success', text: 'Stages updated.' });
      closeEdit();
      loadAll();
    } else {
      const d = await res.json();
      setMsg({ type: 'error', text: d.error ?? 'Failed to update stages.' });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Procurement Process</div>
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

        {tab === 'new' && (
          <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="card-header">New Configuration</div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Procurement Mode</label>
                <select className="input-field" value={procurementModeId} onChange={(e) => setProcurementModeId(e.target.value)}>
                  {procurementModes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Authority</label>
                <select className="input-field" value={authorityId} onChange={(e) => setAuthorityId(e.target.value)}>
                  {authorities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Stages (click to add, in order)</label>
                <StagePicker stages={stages} selectedStageIds={selectedStageIds} onToggle={toggleStage} />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Saving...' : 'Save Procurement Process Configuration'}</button>
            </form>
          </div>
        )}

        {tab === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <input
                type="text"
                className="input-field"
                value={configSearch}
                onChange={(e) => setConfigSearch(e.target.value)}
                placeholder="Search by Mode or Authority..."
                style={{ maxWidth: 360 }}
              />
              {configSearch && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfigSearch('')}>Clear</button>
              )}
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Configuration</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {pagedConfigs.map((c, i) => (
                    <tr key={c.id} style={{ transition: 'var(--transition)' }}>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: '0.65rem' }}>{String((configsPage - 1) * 10 + i + 1).padStart(2, '0')}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--navy)', fontWeight: 700, letterSpacing: '0.02em' }}>{c.procurementModeName} / {c.authorityName}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.1rem' }}>Mode: {c.procurementModeName} | Authority: {c.authorityName}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ borderLeft: `3px solid ${c.isActive ? '#1a7a09' : 'var(--text-muted)'}`, background: c.isActive ? '#e8f5e8' : 'var(--bg-light)', color: c.isActive ? '#1a7a09' : 'var(--text-muted)' }}>
                          {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewingConfig(c)}>View Stage</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                        <button className={`btn btn-sm ${c.isActive ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleActive(c.id, !c.isActive)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteConfig(c)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredConfigs.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      {configSearch ? `No configurations match "${configSearch}".` : 'No Procurement Process configurations yet.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={configsPage} totalPages={configsTotalPages} onPageChange={setConfigsPage} />
          </div>
        )}
      </div>

      {editingConfig && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Stages"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={closeEdit}
        >
          <div
            className="card"
            style={{
              width: '100%', maxWidth: 560, maxHeight: '85vh', margin: 'var(--space-md)',
              background: 'var(--bg-white)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ flexShrink: 0 }}>
              <div className="card-header">Edit Stages</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {editingConfig.procurementModeName} / {editingConfig.authorityName}
              </div>
            </div>

            <div className="input-group" style={{ flex: 1, minHeight: 0, overflowY: 'auto', margin: 'var(--space-md) 0' }}>
              <label>Stages (click to add, in order)</label>
              <StagePicker stages={stages} selectedStageIds={editSelectedStageIds} onToggle={toggleEditStage} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexShrink: 0 }}>
              <button type="button" className="btn btn-ghost" onClick={closeEdit} disabled={editSaving}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={confirmEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingConfig && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="View Stage"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setViewingConfig(null)}
        >
          <div
            className="card"
            style={{
              width: '100%', maxWidth: 560, maxHeight: '85vh', margin: 'var(--space-md)',
              background: 'var(--bg-white)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ flexShrink: 0 }}>
              <div className="card-header">View Stage</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {viewingConfig.procurementModeName} / {viewingConfig.authorityName}
              </div>
            </div>

            <div className="input-group" style={{ flex: 1, minHeight: 0, overflowY: 'auto', margin: 'var(--space-md) 0' }}>
              <label>Stages (in order)</label>
              {viewingConfig.stages.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '8px 0' }}>No stages configured.</div>
              ) : (
                <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewingConfig.stages
                    .slice()
                    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                    .map((s) => <li key={s.stageId}>{s.stageName}</li>)}
                </ol>
              )}
            </div>

            <button type="button" className="btn btn-primary w-full" style={{ flexShrink: 0 }} onClick={() => setViewingConfig(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
