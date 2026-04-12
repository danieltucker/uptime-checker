import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms) {
  const secs = Math.floor(ms / 1000);
  if (secs < 60)   return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins}m ${secs % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Live duration counter for ongoing outages
// ---------------------------------------------------------------------------

function LiveDuration({ downAt }) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(downAt).getTime());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(downAt).getTime()), 1000);
    return () => clearInterval(id);
  }, [downAt]);

  return <span className="text-red-400">{formatDuration(elapsed)}</span>;
}

// ---------------------------------------------------------------------------
// Single alert card
// ---------------------------------------------------------------------------

function AlertCard({ alert, onDismiss }) {
  const { t } = useTheme();
  const isOngoing = !alert.upAt;
  const duration  = alert.upAt
    ? formatDuration(new Date(alert.upAt) - new Date(alert.downAt))
    : null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors"
      style={{
        backgroundColor: isOngoing ? 'rgba(239,68,68,0.07)' : t.tagBg,
        borderColor:     isOngoing ? 'rgba(239,68,68,0.25)' : t.cardBorder,
      }}>

      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {isOngoing
          ? <AlertTriangle size={15} className="text-red-400 animate-pulse" />
          : <CheckCircle  size={15} className="text-green-400" />
        }
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-mono font-semibold truncate" style={{ color: t.textPrimary }}>
            {alert.monitorLabel}
          </span>
          {isOngoing
            ? <span className="text-xs font-mono font-bold text-red-400 border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 rounded tracking-widest">
                DOWN
              </span>
            : <span className="text-xs font-mono font-bold text-green-400 border border-green-400/30 bg-green-400/10 px-1.5 py-0.5 rounded tracking-widest">
                RECOVERED
              </span>
          }
        </div>

        <div className="text-xs font-mono flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: t.textMuted }}>
          <span className="flex items-center gap-1">
            <Clock size={9} />
            Down {formatDate(alert.downAt)} at {formatTime(alert.downAt)}
          </span>

          {isOngoing ? (
            <span className="flex items-center gap-1">
              Outage duration: <LiveDuration downAt={alert.downAt} />
            </span>
          ) : (
            <>
              <span>Recovered at {formatTime(alert.upAt)}</span>
              <span className="text-green-400/70">Down for {duration}</span>
            </>
          )}

          <span style={{ color: t.textFaint }}>{alert.target}</span>
        </div>
      </div>

      {/* Dismiss */}
      <button onClick={() => onDismiss(alert.id)}
        className="p-1 rounded shrink-0 transition-opacity hover:opacity-100 opacity-50"
        style={{ color: t.textSecondary }}
        title="Dismiss">
        <X size={13} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlertsPanel
// ---------------------------------------------------------------------------

export function AlertsPanel({ alerts, onDismiss, onClose }) {
  const { t } = useTheme();
  const visible = alerts.filter(a => !a.dismissed);

  const ongoing   = visible.filter(a => !a.upAt);
  const resolved  = visible.filter(a =>  a.upAt);

  return (
    <div className="rounded-lg border shadow-lg" style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.cardBorder }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: t.textPrimary }}>
            Alerts
          </span>
          {ongoing.length > 0 && (
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
              {ongoing.length} active
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
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono" style={{ color: t.textMuted }}>
            No alerts — all monitors are healthy
          </div>
        ) : (
          <>
            {ongoing.length > 0 && (
              <>
                {ongoing.map(a => <AlertCard key={a.id} alert={a} onDismiss={onDismiss} />)}
              </>
            )}
            {resolved.length > 0 && (
              <>
                {ongoing.length > 0 && (
                  <div className="text-xs font-mono uppercase tracking-wider pt-1" style={{ color: t.textFaint }}>
                    Resolved
                  </div>
                )}
                {resolved.map(a => <AlertCard key={a.id} alert={a} onDismiss={onDismiss} />)}
              </>
            )}
          </>
        )}
      </div>

      {/* Dismiss all footer */}
      {visible.length > 1 && (
        <div className="px-4 py-2 border-t flex justify-end" style={{ borderColor: t.cardBorder }}>
          <button
            onClick={() => visible.forEach(a => onDismiss(a.id))}
            className="text-xs font-mono transition-opacity opacity-50 hover:opacity-100"
            style={{ color: t.textSecondary }}>
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
