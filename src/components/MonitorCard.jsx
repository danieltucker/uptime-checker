import React, { useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
import { Edit2, Trash2, Tag, ShieldCheck, ShieldAlert, Code, ArrowLeftRight, Minimize2 } from 'lucide-react';
import { formatInterval, formatTimestamp, certDaysColor } from '../types/monitor';
import { useTheme } from '../hooks/useTheme';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  up:      { label: 'UP',      cls: 'text-green-400 bg-green-400/10 border-green-400/30', dot: false },
  down:    { label: 'DOWN',    cls: 'text-red-400   bg-red-400/10   border-red-400/30',   dot: true  },
  pending: { label: 'PENDING', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30', dot: false },
};

function StatusBadge({ status }) {
  const { label, cls, dot } = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono font-bold tracking-widest ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />}
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Graphical HTTP timing tooltip
// ---------------------------------------------------------------------------

const TIMING_SEGMENTS = [
  { key: 'dnsMs',  label: 'DNS',  color: '#3b82f6' },
  { key: 'tcpMs',  label: 'TCP',  color: '#22c55e' },
  { key: 'tlsMs',  label: 'TLS',  color: '#f59e0b' },
  { key: 'ttfbMs', label: 'TTFB', color: '#a78bfa' },
];

// Tooltip content — pure, no portal logic here
function SparkTooltipContent({ d, t }) {
  const isDown       = d.status === 'down';
  const total        = d.ping ?? 0;
  const isAggregated = d.aggregated === true;
  const hasBreakdown = !isDown && !isAggregated && d.dnsMs != null;
  const segments     = hasBreakdown ? TIMING_SEGMENTS.filter(s => d[s.key] != null) : [];

  const timeLabel = d.timestamp
    ? new Date(d.timestamp).toLocaleString('en-US', {
        hour12: false, month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <div className="rounded-lg text-xs font-mono shadow-xl border"
      style={{
        backgroundColor: t.tooltipBg,
        borderColor:     t.tooltipBorder,
        minWidth:        172,
        padding:         '10px 12px',
      }}>
      {isDown ? (
        <div className="text-red-400 font-bold tracking-widest mb-1.5">DOWN</div>
      ) : (
        <>
          <div className="font-bold mb-2.5" style={{ color: t.textPrimary }}>
            {isAggregated ? `avg ${total}ms` : `${total}ms total`}
          </div>
          {segments.length > 0 && (
            <div className="space-y-1.5 mb-2.5">
              {segments.map(({ key, label, color }) => {
                const value = d[key];
                const pct   = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 4;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span style={{ color: t.textMuted, width: 28, flexShrink: 0 }}>{label}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: t.metricGap }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span style={{ color, width: 42, textAlign: 'right', flexShrink: 0 }}>
                      {value}ms
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {isAggregated && d.uptimePct != null && (
            <div className="mb-1.5 flex items-center gap-2">
              <span style={{ color: t.textMuted }}>Uptime</span>
              <span style={{ color: d.uptimePct === 100 ? '#4ade80' : d.uptimePct >= 95 ? '#fbbf24' : '#f87171' }}>
                {d.uptimePct}%
              </span>
            </div>
          )}
        </>
      )}
      <div className="pt-1.5 border-t" style={{ borderColor: t.tooltipBorder, color: t.textFaint }}>
        {timeLabel}
      </div>
    </div>
  );
}

// Portal wrapper — renders the tooltip into document.body so no ancestor
// overflow or stacking-context can clip it.
function SparkTooltip({ active, payload, coordinate, containerRef }) {
  const { t } = useTheme();
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || !coordinate) return null;

  const rect  = containerRef?.current?.getBoundingClientRect();
  const pageX = rect ? rect.left + coordinate.x : coordinate.x;
  const pageY = rect ? rect.top  + coordinate.y : coordinate.y;

  // Flip below the cursor when there isn't enough room above
  const above = pageY > 160;

  return createPortal(
    <div style={{
      position:      'fixed',
      left:           pageX,
      top:            pageY,
      transform:      above ? 'translate(-50%, calc(-100% - 10px))' : 'translate(-50%, 10px)',
      zIndex:         9999,
      pointerEvents:  'none',
    }}>
      <SparkTooltipContent d={d} t={t} />
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Down-event dot on sparkline
// ---------------------------------------------------------------------------

const SparkDot = ({ cx, cy, payload, index }) => {
  if (!cx || !cy) return null;
  if (payload?.status === 'down') {
    return <circle key={`d-${index}`} cx={cx} cy={cy} r={3} fill="#ef4444" />;
  }
  return <circle key={`u-${index}`} cx={cx} cy={cy} r={0} fill="none" />;
};

// ---------------------------------------------------------------------------
// Timing breakdown row beneath the card header (HTTP only)
// ---------------------------------------------------------------------------

function TimingRow({ latest }) {
  const { t } = useTheme();
  if (!latest || latest.dnsMs == null) return null;
  return (
    <div className="px-3 pb-2 flex items-center gap-3 flex-wrap">
      <TimingChip label="DNS"  value={latest.dnsMs}  color="#3b82f6" t={t} />
      <TimingChip label="TCP"  value={latest.tcpMs}  color="#22c55e" t={t} />
      {latest.tlsMs  != null && <TimingChip label="TLS"  value={latest.tlsMs}  color="#f59e0b" t={t} />}
      <TimingChip label="TTFB" value={latest.ttfbMs} color="#a78bfa" t={t} />
      {latest.httpStatus != null && (
        <span className={`text-xs font-mono ml-auto ${latest.httpStatus < 400 ? 'text-green-400/70' : 'text-red-400'}`}>
          HTTP {latest.httpStatus}
        </span>
      )}
    </div>
  );
}

function TimingChip({ label, value, color, t }) {
  if (value == null) return null;
  return (
    <span className="text-xs font-mono flex items-center gap-0.5">
      <span style={{ color: t.textFaint }}>{label} </span>
      <span style={{ color }}>{value}</span>
      <span style={{ color: t.textFaint }}>ms</span>
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
    <span className={`flex items-center gap-0.5 text-xs font-mono ${colorCls}`}
      title={`SSL cert expires in ${certDays} days`}>
      <Icon size={11} />
      {certDays}d
    </span>
  );
}

// ---------------------------------------------------------------------------
// Check-type badge
// ---------------------------------------------------------------------------

const CHECK_TYPE_LABELS = { http: 'HTTP', api: 'API', tcp: 'TCP', icmp: 'ICMP' };

function CheckTypeBadge({ checkType }) {
  const { t } = useTheme();
  return (
    <span className="text-xs font-mono px-1.5 py-0.5 rounded border"
      style={{ color: t.textFaint, borderColor: t.cardBorder }}>
      {CHECK_TYPE_LABELS[checkType] ?? checkType}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MonitorCard
// ---------------------------------------------------------------------------

function MonitorCardInner({
  monitor, onEdit, onDelete, onEmbed, compact = false,
  // Drag-and-drop props (optional — only passed when dragging is enabled)
  dragHandleProps, isDragging = false,
  // Width control (optional — 1 = single col, 2 = double col)
  width = 1, onSetWidth,
  // Chart Y-axis scale: 'auto' | '250' | '500' | '750'
  chartYMax = 'auto',
}) {
  const { t } = useTheme();
  const chartRef = useRef(null);

  // Stable tooltip renderer that closes over chartRef — avoids creating a new
  // function on every render which would cause Recharts to remount the tooltip.
  const tooltipContent = useMemo(
    () => (props) => <SparkTooltip {...props} containerRef={chartRef} />,
    [] // chartRef is a stable object
  );

  const chartData = monitor.history.map((h, i) => ({
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
    monitor.history.length === 0  ? t.textFaint :
    monitor.uptimePercent >= 99   ? '#4ade80' :
    monitor.uptimePercent >= 95   ? '#fbbf24' : '#f87171';

  const alertBadges = monitor.alertTypes?.filter(a => a !== 'None') ?? [];

  // Y-axis domain — fixed max when set, otherwise auto-scale from 0
  const yMax    = chartYMax === 'auto' ? 'auto' : Number(chartYMax);
  const yDomain = [0, yMax];

  // Show the degraded threshold line only for HTTP/API monitors that have one set
  const showThresholdLine =
    monitor.degradedThreshold != null &&
    (monitor.checkType === 'http' || monitor.checkType === 'api');

  // ── Compact layout (reference monitors) ───────────────────────────────────
  if (compact) {
    return (
      <div className="flex flex-col rounded-lg border"
        style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>

        <div className="flex items-center justify-between px-3 pt-3 pb-1.5 gap-1.5">
          <StatusBadge status={monitor.status} />
          <span className="text-xs font-mono truncate font-semibold flex-1 ml-1"
            style={{ color: t.textSecondary }}>
            {monitor.label}
          </span>
          {monitor.currentPing != null && (
            <span className="text-xs font-mono shrink-0" style={{ color: t.textMuted }}>
              {monitor.currentPing}ms
            </span>
          )}
        </div>

        <div className="px-2 py-1.5">
          {chartData.length > 0 ? (
            <div ref={chartRef} style={{ width: '100%', height: 36 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={lineColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="ping"
                    stroke={lineColor} strokeWidth={1.5}
                    fill={`url(#${gradientId})`}
                    dot={<SparkDot />}
                    activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                  <Tooltip content={tooltipContent}
                    cursor={{ stroke: t.cardBorder, strokeWidth: 1 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-9 text-xs font-mono"
              style={{ color: t.textFaint }}>
              pending…
            </div>
          )}
        </div>

        <div className="px-3 pb-2">
          <span className="text-xs font-mono" style={{ color: t.textFaint }}>
            {monitor.target}
          </span>
        </div>
      </div>
    );
  }

  // ── Full layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col rounded-lg border transition-colors"
      style={{
        backgroundColor: t.cardBg,
        borderColor: isDragging ? t.cardBorderHover : t.cardBorder,
        opacity: isDragging ? 0.85 : 1,
      }}
      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = t.cardBorderHover; }}
      onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = t.cardBorder; }}>

      {/* ── Header — entire area is the drag handle when dragging is enabled ── */}
      <div
        className="flex items-start justify-between px-4 pt-4 pb-2 gap-2 rounded-t-lg"
        style={{ cursor: dragHandleProps ? 'grab' : 'default' }}
        {...(dragHandleProps || {})}>

        <div className="flex items-center gap-2 min-w-0 flex-1" style={{ pointerEvents: 'none' }}>
          <StatusBadge status={monitor.status} />
          <CheckTypeBadge checkType={monitor.checkType} />
          <span className="text-sm font-semibold truncate" title={monitor.label}
            style={{ color: t.textPrimary }}>
            {monitor.label}
          </span>
        </div>

        {/* Action buttons — need pointer-events restored so clicks still work */}
        <div className="flex items-center gap-1 shrink-0" style={{ pointerEvents: 'all' }}
          onPointerDown={e => e.stopPropagation()}>

          {/* Width toggle — two chips, active one highlighted */}
          {onSetWidth && (
            <div className="flex items-center rounded border overflow-hidden text-xs font-mono"
              style={{ borderColor: t.cardBorder }}>
              {[{ value: 1, label: 'Narrow', Icon: Minimize2 }, { value: 2, label: 'Wide', Icon: ArrowLeftRight }].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onSetWidth(opt.value)}
                  title={opt.label}
                  className="flex items-center gap-1 px-2 py-1 transition-all"
                  style={width === opt.value ? {
                    color:           '#60a5fa',
                    backgroundColor: 'rgba(96,165,250,0.15)',
                  } : {
                    color:           t.textMuted,
                    backgroundColor: 'transparent',
                  }}>
                  <opt.Icon size={10} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {onEmbed && (
            <button onClick={() => onEmbed(monitor)} title="Embed"
              className="p-1.5 rounded transition-colors"
              style={{ color: t.textFaint }}
              onMouseEnter={e => e.currentTarget.style.color = t.textPrimary}
              onMouseLeave={e => e.currentTarget.style.color = t.textFaint}>
              <Code size={13} />
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(monitor)} title="Edit"
              className="p-1.5 rounded transition-colors"
              style={{ color: t.textFaint }}
              onMouseEnter={e => e.currentTarget.style.color = t.textPrimary}
              onMouseLeave={e => e.currentTarget.style.color = t.textFaint}>
              <Edit2 size={13} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(monitor.id)} title="Delete"
              className="p-1.5 rounded transition-colors"
              style={{ color: t.textFaint }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.textFaint; e.currentTarget.style.backgroundColor = ''; }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Target + description */}
      <div className="px-4 pb-3 leading-none">
        <span className="text-xs font-mono" style={{ color: t.textMuted }}>
          {monitor.target}
        </span>
        {monitor.port && (
          <span className="text-xs font-mono" style={{ color: t.textFaint }}>
            :{monitor.port}
          </span>
        )}
        {monitor.description && (
          <span className="text-xs ml-2" style={{ color: t.textFaint }}>
            — {monitor.description}
          </span>
        )}
      </div>

      {/* ── Metrics row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px border-t border-b"
        style={{ backgroundColor: t.metricGap, borderColor: t.metricGap }}>
        <Metric label="Ping"
          value={monitor.currentPing != null ? `${monitor.currentPing}ms` : '—'}
          valueStyle={{ color: t.textPrimary }} t={t} />
        <Metric label="Uptime"
          value={monitor.history.length > 0 ? `${monitor.uptimePercent}%` : '—'}
          valueStyle={{ color: uptimeColor }} t={t} />
        <Metric label="Every"
          value={formatInterval(monitor.interval)}
          valueStyle={{ color: t.textSecondary }} t={t} />
      </div>

      {/* ── Timing breakdown (HTTP / API) ───────────────────────────────────── */}
      <TimingRow latest={monitor.latest} />

      {/* ── Assertion error hint (API checks) ───────────────────────────────── */}
      {monitor.status === 'down' && monitor.latest?.error && (
        <div className="px-3 pb-2">
          <span className="text-xs font-mono truncate block" style={{ color: '#f87171' }}
            title={monitor.latest.error}>
            {monitor.latest.error}
          </span>
        </div>
      )}

      {/* ── Sparkline ────────────────────────────────────────────────────────── */}
      <div className="px-2 py-2">
        {chartData.length > 0 ? (
          <div ref={chartRef} style={{ width: '100%', height: 52 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 3, right: 2, left: 2, bottom: 3 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={yDomain} hide />
                <Area type="monotone" dataKey="ping"
                  stroke={lineColor} strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={<SparkDot />}
                  activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                {showThresholdLine && (
                  <ReferenceLine
                    y={monitor.degradedThreshold}
                    stroke="#f59e0b"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                  />
                )}
                <Tooltip content={tooltipContent}
                  cursor={{ stroke: t.cardBorder, strokeWidth: 1 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[52px] text-xs font-mono"
            style={{ color: t.textFaint }}>
            awaiting first check…
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono" style={{ color: t.textFaint }}>
            {monitor.lastChecked ? (
              <>
                <span style={{ color: t.textMuted }}>checked</span>{' '}
                {formatTimestamp(monitor.lastChecked)}
              </>
            ) : 'not yet checked'}
          </span>
          <CertBadge certDays={monitor.latest?.certDays} />
        </div>

        <div className="flex items-center gap-1 flex-wrap justify-end">
          {alertBadges.map(a => (
            <span key={a} className="text-xs font-mono px-1.5 py-0.5 rounded border"
              style={{ color: t.textSecondary, backgroundColor: t.tagBg, borderColor: t.tagBorder }}>
              {a}
            </span>
          ))}
          {monitor.tags?.filter(tag => tag !== '_ref').map(tag => (
            <span key={tag}
              className="flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ color: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Only re-render when the monitor data itself changes (SSE updates preserve
// object identity for unchanged monitors), or when display-affecting props change.
export const MonitorCard = React.memo(MonitorCardInner, (prev, next) =>
  prev.monitor    === next.monitor    &&
  prev.chartYMax  === next.chartYMax  &&
  prev.width      === next.width      &&
  prev.isDragging === next.isDragging &&
  prev.compact    === next.compact
);

// ---------------------------------------------------------------------------
// Metric cell
// ---------------------------------------------------------------------------

function Metric({ label, value, valueStyle, t }) {
  return (
    <div className="px-3 py-2.5" style={{ backgroundColor: t.cardBg }}>
      <div className="text-xs font-mono uppercase tracking-wider mb-0.5"
        style={{ color: t.textFaint }}>
        {label}
      </div>
      <div className="text-base font-mono font-bold leading-none" style={valueStyle}>
        {value}
      </div>
    </div>
  );
}
