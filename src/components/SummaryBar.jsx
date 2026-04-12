import React from 'react';
import { Server, ArrowUp, ArrowDown, Gauge } from 'lucide-react';

/** Top-of-dashboard stats bar. */
export function SummaryBar({ monitors }) {
  const total    = monitors.length;
  const up       = monitors.filter(m => m.status === 'up').length;
  const down     = monitors.filter(m => m.status === 'down').length;
  const pending  = monitors.filter(m => m.status === 'pending').length;

  const pinging  = monitors.filter(m => m.currentPing !== null);
  const avgPing  = pinging.length
    ? Math.round(pinging.reduce((s, m) => s + m.currentPing, 0) / pinging.length)
    : null;

  return (
    <div className="grid grid-cols-4 gap-px rounded-lg overflow-hidden border border-gray-800">
      <StatCell
        icon={<Server size={14} />}
        label="Monitors"
        value={total}
        valueClass="text-gray-100"
      />
      <StatCell
        icon={<ArrowUp size={14} className="text-green-400" />}
        label="Online"
        value={up}
        valueClass="text-green-400"
        sub={pending > 0 ? `${pending} pending` : null}
        subClass="text-amber-400"
      />
      <StatCell
        icon={<ArrowDown size={14} className="text-red-400" />}
        label="Offline"
        value={down}
        valueClass={down > 0 ? 'text-red-400' : 'text-gray-500'}
      />
      <StatCell
        icon={<Gauge size={14} className="text-blue-400" />}
        label="Avg Ping"
        value={avgPing !== null ? `${avgPing}ms` : '—'}
        valueClass="text-blue-400"
      />
    </div>
  );
}

function StatCell({ icon, label, value, valueClass, sub, subClass }) {
  return (
    <div className="bg-gray-900 px-5 py-4">
      <div className="flex items-center gap-1.5 text-gray-600 mb-1">
        {icon}
        <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-3xl font-mono font-bold leading-none ${valueClass}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-xs font-mono mt-1 ${subClass}`}>{sub}</div>
      )}
    </div>
  );
}
