import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const secs = Math.floor(ms / 1000);
  if (secs < 60)   return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins}m ${secs % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const timeStr = d.toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  if (d.toDateString() === today.toDateString()) return timeStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

// ---------------------------------------------------------------------------
// Live elapsed counter
// ---------------------------------------------------------------------------

function LiveElapsed({ since }) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(since).getTime());
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(since).getTime()), 1000);
    return () => clearInterval(id);
  }, [since]);
  return <span>{formatDuration(elapsed)}</span>;
}

// ---------------------------------------------------------------------------
// Single alert row
// ---------------------------------------------------------------------------

function AlertRow({ alert, onDismiss }) {
  const { t } = useTheme();

  const isActive   = !alert.resolvedAt;
  const isOutage   = alert.type === 'outage';
  const isDegraded = alert.type === 'degraded';

  const accentColor = isActive
    ? (isOutage ? '#ef4444' : '#f59e0b')
    : '#4ade80';

  const bgAlpha = isActive
    ? (isOutage ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)')
    : 'rgba(74,222,128,0.05)';

  const borderAlpha = isActive
    ? (isOutage ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)')
    : 'rgba(74,222,128,0.2)';

  const Icon = isActive
    ? (isOutage ? AlertTriangle : AlertCircle)
    : CheckCircle;

  const typeLabel = isOutage ? 'OUTAGE' : isDegraded ? 'DEGRADED' : 'RECOVERED';

  const duration = alert.resolvedAt
    ? formatDuration(new Date(alert.resolvedAt) - new Date(alert.startedAt))
    : null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border"
      style={{ backgroundColor: bgAlpha, borderColor: borderAlpha }}>

      <div className="mt-0.5 shrink-0">
        <Icon size={15} style={{ color: accentColor }}
          className={isActive && isOutage ? 'animate-pulse' : ''} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono font-semibold truncate" style={{ color: t.textPrimary }}>
            {alert.monitorLabel}
          </span>
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded border tracking-widest"
            style={{ color: accentColor, borderColor: borderAlpha, backgroundColor: bgAlpha }}>
            {typeLabel}
          </span>
        </div>

        {/* Time info */}
        <div className="text-xs font-mono flex flex-wrap gap-x-4 gap-y-0.5"
          style={{ color: t.textMuted }}>

          <span className="flex items-center gap-1">
            <Clock size={9} />
            Started {formatDateTime(alert.startedAt)}
          </span>

          {isActive ? (
            <>
              <span>
                Last seen {formatDateTime(alert.lastOccurredAt)}
              </span>
              <span style={{ color: accentColor }}>
                Ongoing · <LiveElapsed since={alert.startedAt} />
              </span>
            </>
          ) : (
            <>
              <span>
                Last occurred {formatDateTime(alert.lastOccurredAt)}
              </span>
              <span style={{ color: '#4ade80' }}>
                Recovered {formatDateTime(alert.resolvedAt)}
                {duration && <> · was down {duration}</>}
              </span>
            </>
          )}

          <span style={{ color: t.textFaint }}>{alert.target}</span>
        </div>
      </div>

      <button onClick={() => onDismiss(alert.id)}
        className="p-1 rounded shrink-0 transition-opacity opacity-40 hover:opacity-100"
        style={{ color: t.textSecondary }}
        title={isActive ? 'Acknowledge (re-surfaces on next check if still active)' : 'Dismiss'}>
        <X size={13} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeading({ label, count, color }) {
  const { t } = useTheme();
  return (
    <div className="flex items-center gap-2 px-1 pt-1">
      <span className="text-xs font-mono uppercase tracking-widest font-bold"
        style={{ color }}>
        {label}
      </span>
      <span className="text-xs font-mono px-1.5 py-0.5 rounded-full"
        style={{ color, backgroundColor: `${color}22` }}>
        {count}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: t.cardBorder }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlertsPanel
// ---------------------------------------------------------------------------

export function AlertsPanel({ alerts, onDismiss, onDismissAll, onClose }) {
  const { t } = useTheme();

  const outages   = alerts.filter(a => a.type === 'outage'   && !a.resolvedAt);
  const degraded  = alerts.filter(a => a.type === 'degraded' && !a.resolvedAt);
  const recovered = alerts.filter(a => a.resolvedAt);

  const totalActive = outages.length + degraded.length;

  return (
    <div className="rounded-lg border shadow-lg" style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: t.cardBorder }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold uppercase tracking-widest"
            style={{ color: t.textPrimary }}>
            Alerts
          </span>
          {outages.length > 0 && (
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
              {outages.length} outage{outages.length !== 1 ? 's' : ''}
            </span>
          )}
          {degraded.length > 0 && (
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              {degraded.length} degraded
            </span>
          )}
        </div>
        <button onClick={onClose}
          className="p-1 rounded transition-opacity opacity-50 hover:opacity-100"
          style={{ color: t.textSecondary }}>
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono" style={{ color: t.textMuted }}>
            No alerts — all monitors are healthy
          </div>
        ) : (
          <>
            {outages.length > 0 && (
              <div className="space-y-2">
                <SectionHeading label="Outages" count={outages.length} color="#ef4444" />
                {outages.map(a => <AlertRow key={a.id} alert={a} onDismiss={onDismiss} />)}
              </div>
            )}

            {degraded.length > 0 && (
              <div className="space-y-2">
                <SectionHeading label="Degraded" count={degraded.length} color="#f59e0b" />
                {degraded.map(a => <AlertRow key={a.id} alert={a} onDismiss={onDismiss} />)}
              </div>
            )}

            {recovered.length > 0 && (
              <div className="space-y-2">
                <SectionHeading label="Recovered" count={recovered.length} color="#4ade80" />
                {recovered.map(a => <AlertRow key={a.id} alert={a} onDismiss={onDismiss} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {alerts.length > 1 && (
        <div className="px-4 py-2 border-t flex justify-between items-center"
          style={{ borderColor: t.cardBorder }}>
          <span className="text-xs font-mono" style={{ color: t.textFaint }}>
            {totalActive > 0
              ? `Acknowledge re-surfaces on next check if still active`
              : null}
          </span>
          <button onClick={onDismissAll}
            className="text-xs font-mono transition-opacity opacity-50 hover:opacity-100"
            style={{ color: t.textSecondary }}>
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
