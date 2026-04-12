interface MetricsData {
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
  avgDays?: number;
}

export default function DashboardMetrics({ data }: { data: MetricsData }) {
  const completionPct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

  // Mini bar chart data (last 7 "bins" — simulate weekly distribution)
  const bars = [35, 62, 48, 71, 55, data.total > 0 ? 80 : 20, 90];

  return (
    <div className="metrics-grid">
      {/* Total Files */}
      <div className="metric-card blue">
        <div className="metric-glow" />
        <div className="metric-label">Total Files</div>
        <div className="metric-value">{data.total.toString().padStart(3, '0')}</div>
        <div className="metric-sub">All registered files</div>
        <div className="bar-chart" style={{ marginTop: '0.75rem' }}>
          {bars.map((h, i) => (
            <div
              key={i}
              className={`bar ${i === bars.length - 1 ? 'active' : 'filled'}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* In Progress */}
      <div className="metric-card amber">
        <div className="metric-glow" />
        <div className="metric-label">In Progress</div>
        <div className="metric-value">{data.inProgress}</div>
        <div className="metric-sub">Currently being processed</div>
        <svg viewBox="0 0 60 20" style={{ width: '100%', marginTop: '0.75rem' }}>
          <rect x="0" y="8" width="60" height="4" rx="2" fill="rgba(255,255,255,0.05)" />
          <rect
            x="0" y="8"
            width={`${data.total > 0 ? (data.inProgress / data.total) * 60 : 0}`}
            height="4" rx="2"
            fill="var(--amber)"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Completed */}
      <div className="metric-card green">
        <div className="metric-glow" />
        <div className="metric-label">Completed</div>
        <div className="metric-value">{data.completed}</div>
        <div className="metric-sub">Tender published or awarded</div>
        {/* Donut SVG */}
        <svg viewBox="0 0 60 30" style={{ width: '80px', marginTop: '0.5rem' }}>
          <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle
            cx="15" cy="15" r="12"
            fill="none"
            stroke="var(--neon-green)"
            strokeWidth="4"
            strokeDasharray={`${(completionPct / 100) * 75.4} 75.4`}
            strokeLinecap="round"
            transform="rotate(-90 15 15)"
            filter="url(#glow-green)"
            opacity="0.9"
          />
          <text x="15" y="18" textAnchor="middle" fontSize="8" fill="var(--neon-green)" fontWeight="700">
            {completionPct}%
          </text>
        </svg>
      </div>

      {/* Avg Days */}
      <div className="metric-card purple">
        <div className="metric-glow" />
        <div className="metric-label">Avg Processing</div>
        <div className="metric-value">{data.avgDays ?? '—'}</div>
        <div className="metric-sub">{data.avgDays ? 'Days per file cycle' : 'Insufficient data'}</div>
        {/* Sparkline */}
        <svg viewBox="0 0 60 25" style={{ width: '100%', marginTop: '0.75rem' }}>
          <polyline
            points="0,20 10,14 20,16 30,10 40,12 50,6 60,8"
            fill="none"
            stroke="var(--purple-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      </div>
    </div>
  );
}
