import React, { useState } from 'react';
import { X, Trash2, Copy, Check, Monitor, LayoutGrid, ArrowLeftRight } from 'lucide-react';
import { MonitorForm } from './MonitorForm';
import { useTheme } from '../hooks/useTheme';
import { formatTimestamp } from '../types/monitor';

// ---------------------------------------------------------------------------
// Status dot (local — mirrors MonitorCard's)
// ---------------------------------------------------------------------------

const STATUS_DOT_COLORS = {
  up: '#4ade80', degraded: '#fbbf24', down: '#ef4444', pending: '#6b7280',
};

function StatusDot({ status }) {
  return (
    <span className="rounded-full shrink-0 inline-block"
      style={{
        width: 8, height: 8,
        backgroundColor: STATUS_DOT_COLORS[status] ?? STATUS_DOT_COLORS.pending,
      }} />
  );
}

// ---------------------------------------------------------------------------
// History tab
// ---------------------------------------------------------------------------

function StatChip({ label, value, color, t }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: t.textFaint }}>
        {label}
      </span>
      <span className="text-sm font-mono font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

function HistoryTab({ monitor, t }) {
  const history = monitor.history ?? [];
  const upCount    = history.filter(r => r.status === 'up').length;
  const downCount  = history.filter(r => r.status === 'down').length;
  const pings      = history.map(r => r.ping).filter(p => p != null);
  const avgPing    = pings.length ? Math.round(pings.reduce((s, v) => s + v, 0) / pings.length) : null;
  const uptimePct  = history.length ? Math.round((upCount / history.length) * 1000) / 10 : null;

  const uptimeColor = uptimePct == null ? t.textFaint
    : uptimePct >= 99 ? '#4ade80'
    : uptimePct >= 95 ? '#fbbf24'
    : '#f87171';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Stats row */}
      <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b shrink-0"
        style={{ borderColor: t.metricGap }}>
        <StatChip label="Uptime"   value={uptimePct != null ? `${uptimePct}%` : '—'} color={uptimeColor} t={t} />
        <StatChip label="Up"       value={upCount}   color="#4ade80"   t={t} />
        <StatChip label="Down"     value={downCount} color={downCount > 0 ? '#ef4444' : t.textFaint} t={t} />
        <StatChip label="Avg Ping" value={avgPing != null ? `${avgPing}ms` : '—'} color={t.textSecondary} t={t} />
      </div>

      {/* History table */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-xs font-mono"
            style={{ color: t.textFaint }}>
            No history yet — awaiting first check
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0" style={{ backgroundColor: t.cardBg }}>
              <tr className="border-b" style={{ borderColor: t.metricGap }}>
                <th className="px-4 py-2 text-left font-semibold" style={{ color: t.textFaint }}>Time</th>
                <th className="px-4 py-2 text-left font-semibold" style={{ color: t.textFaint }}>Status</th>
                <th className="px-4 py-2 text-right font-semibold" style={{ color: t.textFaint }}>Ping</th>
                <th className="px-4 py-2 text-left font-semibold" style={{ color: t.textFaint }}>Info</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((entry, i) => {
                const statusColor = entry.status === 'down' ? '#f87171'
                  : entry.status === 'up' ? '#4ade80'
                  : t.textSecondary;

                let info = null;
                if (entry.aggregated && entry.uptimePct != null) {
                  info = <span style={{ color: t.textFaint }}>{entry.uptimePct}% up</span>;
                } else if (entry.httpStatus != null) {
                  info = (
                    <span className={entry.httpStatus >= 400 ? 'text-red-400' : ''}
                      style={entry.httpStatus < 400 ? { color: t.textFaint } : {}}>
                      HTTP {entry.httpStatus}
                    </span>
                  );
                } else if (entry.error) {
                  info = (
                    <span className="text-red-400/80 truncate block max-w-[140px]" title={entry.error}>
                      {entry.error}
                    </span>
                  );
                }

                return (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: t.metricGap }}>
                    <td className="px-4 py-2" style={{ color: t.textFaint }}>
                      {entry.timestamp ? formatTimestamp(entry.timestamp) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={entry.status} />
                        <span style={{ color: statusColor }}>{entry.status}</span>
                        {entry.aggregated && (
                          <span className="opacity-50" style={{ color: t.textFaint }}>(avg)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right" style={{ color: t.textSecondary }}>
                      {entry.ping != null ? `${entry.ping}ms` : '—'}
                    </td>
                    <td className="px-4 py-2">{info ?? <span style={{ color: t.textFaint }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Embed tab
// ---------------------------------------------------------------------------

function EmbedTab({ monitor, t }) {
  const [embedType, setEmbedType] = useState('widget');
  const [copied,    setCopied]    = useState(false);

  const origin    = window.location.origin;
  const widgetSrc = `${origin}/embed/monitor/${monitor.id}`;
  const pageSrc   = `${origin}/embed`;

  const widgetCode = `<iframe\n  src="${widgetSrc}"\n  width="360"\n  height="230"\n  frameborder="0"\n  style="border-radius:8px;overflow:hidden"\n></iframe>`;
  const pageCode   = `<iframe\n  src="${pageSrc}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border-radius:8px;overflow:hidden"\n></iframe>`;
  const activeCode = embedType === 'widget' ? widgetCode : pageCode;

  const copy = () => {
    navigator.clipboard.writeText(activeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setEmbedType('widget')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors"
          style={embedType === 'widget'
            ? { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.5)', color: '#93c5fd' }
            : { backgroundColor: t.tagBg, borderColor: t.tagBorder, color: t.textMuted }}>
          <Monitor size={11} />
          This Monitor
        </button>
        <button onClick={() => setEmbedType('page')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors"
          style={embedType === 'page'
            ? { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.5)', color: '#93c5fd' }
            : { backgroundColor: t.tagBg, borderColor: t.tagBorder, color: t.textMuted }}>
          <LayoutGrid size={11} />
          Full Dashboard
        </button>
      </div>

      <p className="text-xs font-mono" style={{ color: t.textMuted }}>
        {embedType === 'widget'
          ? `Embeds just the ${monitor.label} card. No edit or delete controls.`
          : 'Embeds the full read-only dashboard. No edit, delete, or settings controls.'}
      </p>

      <div className="rounded border px-3 py-2 text-xs font-mono truncate"
        style={{ backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.textFaint }}>
        {embedType === 'widget' ? widgetSrc : pageSrc}
      </div>

      <div className="relative">
        <pre className="rounded border px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed"
          style={{ backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.textSecondary }}>
          {activeCode}
        </pre>
        <button onClick={copy}
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors"
          style={{ backgroundColor: t.tagBg, borderColor: t.tagBorder, color: copied ? '#4ade80' : t.textMuted }}>
          {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
        </button>
      </div>

      <p className="text-xs font-mono" style={{ color: t.textFaint }}>
        {embedType === 'widget'
          ? 'Recommended size: 360 x 230px. Adjust height if the monitor has many tags.'
          : 'Set height to match your content. Use 100% width for responsive layouts.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonitorDetailModal
// ---------------------------------------------------------------------------

export function MonitorDetailModal({
  monitor,
  initialTab = 'history',
  onClose,
  onSave,
  onDelete,
  width,
  onSetWidth,
  allTags = [],
}) {
  const { t } = useTheme();
  const [activeTab,      setActiveTab]      = useState(initialTab);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [formError,      setFormError]      = useState('');
  const [deleteError,    setDeleteError]    = useState('');

  const switchTab = (tab) => {
    setActiveTab(tab);
    setConfirmDelete(false);
    setDeleteError('');
  };

  const handleSave = async (data) => {
    setSubmitting(true);
    setFormError('');
    try {
      await onSave(monitor.id, data);
      onClose();
    } catch (err) {
      setFormError(`Failed to save: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(monitor.id);
      onClose();
    } catch (err) {
      setDeleteError(`Delete failed: ${err.message}`);
      setConfirmDelete(false);
    }
  };

  const CHECK_TYPE_LABELS = { http: 'HTTP', api: 'API', tcp: 'TCP', icmp: 'ICMP' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div
        className="w-full max-w-lg rounded-lg border shadow-2xl flex flex-col"
        style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder, maxHeight: 'calc(100vh - 2rem)' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: t.metricGap }}>
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={monitor.status ?? 'pending'} />
            <h2 className="text-xs font-mono font-bold truncate" style={{ color: t.textPrimary }}>
              {monitor.label}
            </h2>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded border shrink-0"
              style={{ color: t.textFaint, borderColor: t.cardBorder }}>
              {CHECK_TYPE_LABELS[monitor.checkType] ?? (monitor.checkType ?? 'HTTP').toUpperCase()}
            </span>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded opacity-50 hover:opacity-100 shrink-0 transition-opacity"
            style={{ color: t.textSecondary }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b shrink-0" style={{ borderColor: t.metricGap }}>
          {[
            { id: 'history', label: 'History' },
            { id: 'embed',   label: 'Embed'   },
            { id: 'edit',    label: 'Edit'    },
          ].map(tab => (
            <button key={tab.id} onClick={() => switchTab(tab.id)}
              className="px-5 py-2.5 text-xs font-mono font-semibold transition-colors border-b-2 -mb-px"
              style={{
                color:           activeTab === tab.id ? '#60a5fa' : t.textMuted,
                borderColor:     activeTab === tab.id ? '#60a5fa' : 'transparent',
                backgroundColor: 'transparent',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <HistoryTab monitor={monitor} t={t} />
        )}

        {/* ── Embed tab ── */}
        {activeTab === 'embed' && (
          <EmbedTab monitor={monitor} t={t} />
        )}

        {/* ── Edit tab ── */}
        {activeTab === 'edit' && (
          <div className="flex flex-col flex-1 min-h-0">
            <MonitorForm
              embedded
              editingMonitor={monitor}
              onSubmit={handleSave}
              onCancel={onClose}
              submitting={submitting}
              allTags={allTags}
              error={formError}
            />

            {/* Width toggle + Delete */}
            <div className="shrink-0 border-t px-4 py-3 flex items-center justify-between gap-3"
              style={{ borderColor: t.metricGap }}>

              {/* Width toggle */}
              <div className="flex items-center gap-2">
                <ArrowLeftRight size={12} style={{ color: t.textFaint }} />
                <span className="text-xs font-mono" style={{ color: t.textFaint }}>Width</span>
                <div className="flex rounded border overflow-hidden" style={{ borderColor: t.cardBorder }}>
                  {[1, 2].map(w => (
                    <button key={w} type="button" onClick={() => onSetWidth?.(w)}
                      className="px-2.5 py-1 text-xs font-mono transition-colors"
                      style={width === w
                        ? { backgroundColor: 'rgba(59,130,246,0.2)', color: '#93c5fd' }
                        : { backgroundColor: t.inputBg, color: t.textMuted }}>
                      {w === 1 ? 'Narrow' : 'Wide'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <div className="flex flex-col items-end gap-1">
                {deleteError && (
                  <span className="text-xs font-mono text-red-400">{deleteError}</span>
                )}
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: '#f87171' }}>Sure?</span>
                    <button type="button" onClick={handleDelete}
                      className="px-2.5 py-1 text-xs font-mono rounded border transition-colors"
                      style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}>
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1 text-xs font-mono rounded border transition-colors"
                      style={{ color: t.textMuted, borderColor: t.cardBorder, backgroundColor: t.inputBg }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border transition-colors"
                    style={{ color: t.textMuted, borderColor: t.cardBorder, backgroundColor: t.inputBg }}>
                    <Trash2 size={11} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
