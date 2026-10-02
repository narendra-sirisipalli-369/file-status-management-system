import type { ReactNode } from 'react';

type Tone = 'navy' | 'gold' | 'success' | 'danger' | 'warning' | 'neutral';

const TONE_STYLES: Record<Tone, { bg: string; color: string; border: string }> = {
  navy:    { bg: 'var(--navy-faint)',  color: 'var(--navy)',    border: 'var(--navy)' },
  gold:    { bg: 'var(--warning-bg)',  color: 'var(--gold)',    border: 'var(--gold)' },
  success: { bg: 'var(--success-bg)',  color: 'var(--success)', border: 'var(--success)' },
  danger:  { bg: 'var(--danger-bg)',   color: 'var(--danger)',  border: '#ffaaaa' },
  warning: { bg: 'var(--warning-bg)',  color: 'var(--warning)', border: 'var(--warning)' },
  neutral: { bg: 'var(--bg-light)',    color: 'var(--text-secondary)', border: 'var(--border-dark)' },
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

/** Wraps the existing .badge CSS class with a semantic tone API instead of hand-picked colors per usage site. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  const t = TONE_STYLES[tone];
  return (
    <span className="badge" style={{ background: t.bg, color: t.color, borderColor: t.border }}>
      {children}
    </span>
  );
}

/** The Active/Inactive pill repeated (with small drifts) across Master Data and Stage Manager. */
export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
}
