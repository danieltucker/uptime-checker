import React from 'react';
import { Server, ArrowUp, ArrowDown, Gauge } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function SummaryBar({ monitors }) {
  const { t } = useTheme();

  const total   = monitors.length;
  const up      = monitors.filter(m => m.status === 'up').length;
  const down    = monitors.filter(m => m.status === 'down').length;
  const pending = monitors.filter(m => m.status === 'pending').length;

  const pinging = monitors.filter(m => m.currentPing !== null);
  const avgPing = pinging.length
    ? Math.round(pinging.reduce((s, m) => s + m.currentPing, 0) / pinging.length)
    : null;

  return (
    <div className="grid grid-cols-4 gap-px rounded-lg overflow-hidden border"
      style={{ backgroundColor: t.metricGap, borderColor: t.cardBorder }}>
      <StatCell
        icon={<Server size={14} style={{ color: t.textMuted }} />}
        label="Monitors"
        value={total}
        valueStyle={{ color: t.textPrimary }}
        t={t}
      />
      <StatCell
        icon={<ArrowUp size={14} className="text-green-400" />}
        label="Online"
        value={up}
        valueStyle={{ color: '#4ade80' }}
        sub={pending > 0 ? `${pending} pending` : null}
        subStyle={{ color: '#fbbf24' }}
        t={t}
      />
      <StatCell
        icon={<ArrowDown size={14} className="text-red-400" />}
        label="Offline"
        value={down}
        valueStyle={{ color: down > 0 ? '#f87171' : t.textMuted }}
        t={t}
      />
      <StatCell
        icon={<Gauge size={14} className="text-blue-400" />}
        label="Avg Ping"
        value={avgPing !== null ? `${avgPing}ms` : '—'}
        valueStyle={{ color: '#60a5fa' }}
        t={t}
      />
    </div>
  );
}

function StatCell({ icon, label, value, valueStyle, sub, subStyle, t }) {
  return (
    <div className="px-5 py-4" style={{ backgroundColor: t.cardBg }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: t.textMuted }}>
        {icon}
        <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-mono font-bold leading-none" style={valueStyle}>
        {value}
      </div>
      {sub && (
        <div className="text-xs font-mono mt-1" style={subStyle}>{sub}</div>
      )}
    </div>
  );
}
