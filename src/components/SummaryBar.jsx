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

  const stats = [
    { icon: <Server    size={12} />, label: 'Monitors', value: String(total),                         valueColor: t.textSecondary },
    { icon: <ArrowUp   size={12} />, label: 'Online',   value: String(up),    valueColor: '#4ade80',
      sub: pending > 0 ? `${pending} pending` : null },
    { icon: <ArrowDown size={12} />, label: 'Offline',  value: String(down),  valueColor: down > 0 ? '#f87171' : t.textMuted },
    { icon: <Gauge     size={12} />, label: 'Avg Ping', value: avgPing !== null ? `${avgPing}ms` : '—', valueColor: '#60a5fa' },
  ];

  return (
    <div className="border-b" style={{ backgroundColor: t.summaryBg, borderColor: t.summaryBorder }}>
      <div className="max-w-7xl mx-auto px-6 flex">
        {stats.map((s, i) => (
          <div key={s.label}
            className="flex flex-1 items-center justify-center gap-3 py-2"
            style={i < stats.length - 1 ? { borderRight: `1px solid ${t.summaryBorder}` } : {}}>
            <div className="flex items-center gap-1.5" style={{ color: t.textFaint }}>
              {s.icon}
              <span className="text-xs font-mono uppercase tracking-widest hidden sm:inline">
                {s.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-mono font-bold leading-none" style={{ color: s.valueColor }}>
                {s.value}
              </span>
              {s.sub && (
                <span className="text-xs font-mono hidden md:inline" style={{ color: '#fbbf24' }}>
                  {s.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
