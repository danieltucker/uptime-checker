import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Edit2, Trash2, Tag, ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatInterval, formatTimestamp, certDaysColor } from '../types/monitor';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  up:      { label: 'UP',      cls: 'text-green-400 bg-green-400/10 border-green-400/30' },
  down:    { label: 'DOWN',    cls: 'text-red-400   bg-red-400/10   border-red-400/30   animate-pulse' },
  pending: { label: 'PENDING', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
};

function StatusBadge({ status }) {
  const { label, cls } = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-bold tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

const SparkTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs font-mono shadow-lg space-y-0.5">
      <div className={d.status === 'down' ? 'text-red-400' : 'text-gray-200'}>
        {d.status === 'down' ? 'DOWN' : `${d.ping} ms`}
      </div>
      {d.status === 'up' && d.dnsMs != null && (
        <div className="text-gray-600">
          DNS {d.dnsMs}  TCP {d.tcpMs}
          {d.tlsMs != null ? `  TLS ${d.tlsMs}` : ''}
          {d.ttfbMs != null ? `  TTFB ${d.ttfbMs}` : ''}
        </div>
      )}
      <div className="text-gray-700">
        {d.timestamp ? new Date(d.timestamp).toLocaleTimeString('en-US', { hour12: false }) : ''}
      </div>
    </div>
  );
};

const SparkDot = ({ cx, cy, payload, index }) => {
  if (!cx || !cy) return null;
  if (payload?.status === 'down') {
    return <circle key={`d-${index}`} cx={cx} cy={cy} r={3} fill="#ef4444" />;
  }
  return <circle key={`u-${index}`} cx={cx} cy={cy} r={0} fill="none" />;
};

// ---------------------------------------------------------------------------
// Timing breakdown row (HTTP checks only)
// ---------------------------------------------------------------------------

function TimingRow({ latest }) {
  if (!latest || latest.dnsMs == null) return null;
  return (
    <div className="px-3 pb-2 flex items-center gap-3 flex-wrap">
      <TimingChip label="DNS"  value={latest.dnsMs} />
      <TimingChip label="TCP"  value={latest.tcpMs} />
      {latest.tlsMs != null && <TimingChip label="TLS"  value={latest.tlsMs} />}
      <TimingChip label="TTFB" value={latest.ttfbMs} />
      {latest.httpStatus != null && (
        <span className={`text-xs font-mono ml-auto ${latest.httpStatus < 400 ? 'text-green-400/70' : 'text-red-400'}`}>
          HTTP {latest.httpStatus}
        </span>
      )}
    </div>
  );
}

function TimingChip({ label, value }) {
  if (value == null) return null;
  return (
    <span className="text-xs font-mono text-gray-600">
      <span className="text-gray-700">{label} </span>{value}<span className="text-gray-800">ms</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// SSL cert badge
// ---------------------------------------------------------------------------

function CertBadge({ certDays }) {
  if (certDays == null) return null;
  const colorCls = certDaysColor(certDays);
  const Icon = certDays > 7 ? ShieldCheck : ShieldAlert;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-mono ${colorCls}`} title={`SSL cert expires in ${certDays} days`}>
      <Icon size={11} />
      {certDays}d
    </span>
  );
}

// ---------------------------------------------------------------------------
// Check-type badge
// ---------------------------------------------------------------------------

const CHECK_TYPE_LABELS = { http: 'HTTP', tcp: 'TCP', icmp: 'ICMP' };

function CheckTypeBadge({ checkType }) {
  return (
    <span className="text-xs font-mono text-gray-700 border border-gray-800 px-1.5 py-0.5 rounded">
      {CHECK_TYPE_LABELS[checkType] ?? checkType}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MonitorCard
// ---------------------------------------------------------------------------

export function MonitorCard({ monitor, onEdit, onDelete }) {
  const chartData = monitor.history.slice(-20).map((h, i) => ({
    i,
    ping:      h.ping ?? 0,
    status:    h.status,
    timestamp: h.timestamp,
    dnsMs:     h.dnsMs,
    tcpMs:     h.tcpMs,
    tlsMs:     h.tlsMs,
    ttfbMs:    h.ttfbMs,
  }));

  const lineColor  = monitor.status === 'down' ? '#ef4444' : '#22c55e';
  const gradientId = `spark-${monitor.id}`;

  const uptimeColor =
    monitor.history.length === 0  ? 'text-gray-600' :
    monitor.uptimePercent >= 99   ? 'text-green-400' :
    monitor.uptimePercent >= 95   ? 'text-amber-400' : 'text-red-400';

  const alertBadges = monitor.alertTypes?.filter(a => a !== 'None') ?? [];

  return (
    <div className="flex flex-col bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-colors">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={monitor.status} />
          <CheckTypeBadge checkType={monitor.checkType} />
          <span className="text-sm font-semibold text-gray-100 truncate" title={monitor.label}>
            {monitor.label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(monitor)} title="Edit"
            className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(monitor.id)} title="Delete"
            className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Target + description */}
      <div className="px-4 pb-3 leading-none">
        <span className="text-xs font-mono text-gray-500">{monitor.target}</span>
        {monitor.port && (
          <span className="text-xs font-mono text-gray-700">:{monitor.port}</span>
        )}
        {monitor.description && (
          <span className="text-xs text-gray-700 ml-2">— {monitor.description}</span>
        )}
      </div>

      {/* ── Metrics row ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px bg-gray-800 border-t border-b border-gray-800">
        <Metric
          label="Ping"
          value={monitor.currentPing != null ? `${monitor.currentPing}ms` : '—'}
          valueClass="text-gray-100"
        />
        <Metric
          label="24h Up"
          value={monitor.history.length > 0 ? `${monitor.uptimePercent}%` : '—'}
          valueClass={uptimeColor}
        />
        <Metric
          label="Every"
          value={formatInterval(monitor.interval)}
          valueClass="text-gray-300"
        />
      </div>

      {/* ── Timing breakdown (HTTP only, latest check) ──────── */}
      <TimingRow latest={monitor.latest} />

      {/* ── Sparkline ───────────────────────────────────────── */}
      <div className="px-2 py-2">
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 52 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 3, right: 2, left: 2, bottom: 3 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="ping"
                  stroke={lineColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={<SparkDot />}
                  activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Tooltip content={<SparkTooltip />} cursor={{ stroke: '#30363d', strokeWidth: 1 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[52px] text-xs font-mono text-gray-700">
            awaiting first check…
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-gray-700">
            {monitor.lastChecked
              ? <><span className="text-gray-600">checked</span> {formatTimestamp(monitor.lastChecked)}</>
              : 'not yet checked'}
          </span>
          <CertBadge certDays={monitor.latest?.certDays} />
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {alertBadges.map(a => (
            <span key={a} className="text-xs font-mono text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
              {a}
            </span>
          ))}
          {monitor.tags?.map(tag => (
            <span key={tag} className="flex items-center gap-0.5 text-xs font-mono text-blue-400/70 bg-blue-400/5 border border-blue-400/20 px-1.5 py-0.5 rounded">
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass }) {
  return (
    <div className="bg-gray-900 px-3 py-2.5">
      <div className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-base font-mono font-bold leading-none ${valueClass}`}>{value}</div>
    </div>
  );
}
