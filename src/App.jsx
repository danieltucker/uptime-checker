import React, { useState, useEffect, useRef } from 'react';
import { Plus, Radio, Activity, AlertTriangle, Sun, Moon, Bell, Tag as TagIcon, Settings, Code } from 'lucide-react';
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useMonitors }    from './hooks/useMonitors';
import { useAlerts }      from './hooks/useAlerts';
import { useTheme }       from './hooks/useTheme';
import { useCardLayout }  from './hooks/useCardLayout';
import { SummaryBar }     from './components/SummaryBar';
import { MonitorCard }    from './components/MonitorCard';
import { MonitorForm }    from './components/MonitorForm';
import { AlertsPanel }    from './components/AlertsPanel';
import { SettingsPanel }  from './components/SettingsPanel';
import { EmbedModal }     from './components/EmbedModal';

// ── Sortable card wrapper ─────────────────────────────────────────────────────

function SortableMonitorCard({ monitor, onEdit, onDelete, onEmbed, width, onSetWidth, sortEnabled }) {
  const id = String(monitor.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !sortEnabled,
  });

  const style = {
    transform:   CSS.Transform.toString(transform),
    transition,
    gridColumn:  width === 2 ? 'span 2' : 'span 1',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <MonitorCard
        monitor={monitor}
        onEdit={onEdit}
        onDelete={onDelete}
        onEmbed={onEmbed}
        width={width}
        onSetWidth={onSetWidth}
        dragHandleProps={sortEnabled ? { ...attributes, ...listeners } : undefined}
        isDragging={isDragging}
      />
    </div>
  );
}

// ── Reference monitors seeded on first load ───────────────────────────────────
const REFERENCE_SEEDS = [
  { label: 'Google',        target: 'https://www.google.com',      checkType: 'http', interval: 60, tags: ['_ref'], alertTypes: ['None'], description: 'Network reference' },
  { label: 'Cloudflare DNS',target: '1.1.1.1',                     checkType: 'icmp', interval: 60, tags: ['_ref'], alertTypes: ['None'], description: 'Network reference' },
  { label: 'Google DNS',    target: '8.8.8.8',                     checkType: 'icmp', interval: 60, tags: ['_ref'], alertTypes: ['None'], description: 'Network reference' },
  { label: 'Cloudflare',   target: 'https://www.cloudflare.com',   checkType: 'http', interval: 60, tags: ['_ref'], alertTypes: ['None'], description: 'Network reference' },
];

const HISTORY_OPTIONS = [
  { label: '1h',  value: '1h'  },
  { label: '12h', value: '12h' },
  { label: '1d',  value: '1d'  },
  { label: '1w',  value: '1w'  },
];

const SORT_OPTIONS = [
  { label: 'Default',  value: 'default' },
  { label: 'Uptime',   value: 'uptime'  },
  { label: 'Avg Ping', value: 'ping'    },
];

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { isDark, t, toggle: toggleTheme } = useTheme();

  const [historyWindow,  setHistoryWindow]  = useState(() => {
    try { return localStorage.getItem('wt-history-window') || '1h'; }
    catch { return '1h'; }
  });

  const { monitors, loading, error, addMonitor, updateMonitor, deleteMonitor } = useMonitors(historyWindow);

  const { alerts, dismiss: dismissAlert, dismissAll } = useAlerts();

  const [showForm,       setShowForm]       = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [tagFilter,      setTagFilter]      = useState([]);
  const [showAlerts,     setShowAlerts]     = useState(false);
  const [sortBy,         setSortBy]         = useState('default');
  const [showSettings,   setShowSettings]   = useState(false);
  const [embedMonitor,   setEmbedMonitor]   = useState(null);   // null = closed, undefined = full-page
  const [viewMode,       setViewMode]       = useState(() => {
    try { return localStorage.getItem('wt-view-mode') || 'flat'; }
    catch { return 'flat'; }
  });

  const { moveCard, sortMonitors, getWidth, setWidth } = useCardLayout();

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('wt-view-mode', mode); }
    catch {}
  };

  const seededRef = useRef(false);

  // ── Seed reference monitors once after initial load ───────────────────────
  useEffect(() => {
    if (loading || error || seededRef.current) return;
    seededRef.current = true;
    const existing = new Set(monitors.map(m => m.target));
    for (const seed of REFERENCE_SEEDS) {
      if (!existing.has(seed.target)) {
        addMonitor(seed).catch(console.error);
      }
    }
  }, [loading, error]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist history window choice ─────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('wt-history-window', historyWindow); }
    catch {}
  }, [historyWindow]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const userMonitors = monitors.filter(m => !m.tags?.includes('_ref'));
  const refMonitors  = monitors.filter(m =>  m.tags?.includes('_ref'));

  // All unique tags from user monitors (never includes _ref)
  const allTags = [...new Set(userMonitors.flatMap(m => m.tags ?? []))].sort();

  const baseFiltered = tagFilter.length === 0
    ? userMonitors
    : userMonitors.filter(m => tagFilter.some(tag => m.tags?.includes(tag)));

  const filteredMonitors = (() => {
    if (sortBy === 'uptime') {
      return baseFiltered.slice().sort((a, b) =>
        (a.uptimePercent ?? 100) - (b.uptimePercent ?? 100)
      );
    }
    if (sortBy === 'ping') {
      return baseFiltered.slice().sort((a, b) => {
        if (a.currentPing == null && b.currentPing == null) return 0;
        if (a.currentPing == null) return 1;
        if (b.currentPing == null) return -1;
        return b.currentPing - a.currentPing;
      });
    }
    // 'default': apply saved manual order
    return sortMonitors(baseFiltered);
  })();

  // Drag-and-drop — only active in default sort mode
  const sortEnabled = sortBy === 'default';
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      moveCard(active.id, over.id, filteredMonitors.map(m => m.id));
    }
  };

  // Active = unresolved and not dismissed
  const ongoingCount = alerts.filter(a => !a.resolvedAt && !a.dismissedAt).length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openAdd  = () => { setEditingMonitor(null); setShowForm(true); };
  const openEdit = (m) => { setEditingMonitor(m);   setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingMonitor(null); };

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      editingMonitor ? await updateMonitor(editingMonitor.id, data) : await addMonitor(data);
      closeForm();
    } catch (err) {
      console.error('[watchtower] save failed:', err);
      alert(`Failed to save monitor: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this monitor? This cannot be undone.')) return;
    try { await deleteMonitor(id); }
    catch (err) { console.error('[watchtower] delete failed:', err); alert(`Failed to delete: ${err.message}`); }
  };

  const toggleTag = (tag) =>
    setTagFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.pageBg, color: t.textPrimary }}>

      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: t.headerBg, borderColor: t.cardBorder }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-green-400" />
            <span className="font-mono font-bold tracking-[0.12em]" style={{ color: t.textPrimary }}>
              WATCHTOWER
            </span>
            <span className="hidden sm:inline text-xs font-mono px-2 py-0.5 rounded border"
              style={{ color: t.textFaint, borderColor: t.cardBorder }}>
              uptime monitor · v4
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">

            {/* SSE live indicator */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-mono" style={{ color: t.textFaint }}>live</span>
            </div>

            {/* History window selector */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-mono" style={{ color: t.textMuted }}>Window</span>
              <select
                value={historyWindow}
                onChange={e => setHistoryWindow(e.target.value)}
                className="text-xs font-mono rounded border px-1.5 py-0.5 appearance-none cursor-pointer focus:outline-none"
                style={{ backgroundColor: t.inputBg, color: t.textSecondary, borderColor: t.cardBorder }}>
                {HISTORY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Sort selector */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-mono" style={{ color: t.textMuted }}>Sort</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="text-xs font-mono rounded border px-1.5 py-0.5 appearance-none cursor-pointer focus:outline-none"
                style={{ backgroundColor: t.inputBg, color: t.textSecondary, borderColor: t.cardBorder }}>
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Alerts bell */}
            <button onClick={() => setShowAlerts(p => !p)}
              className="relative p-1.5 rounded transition-colors"
              style={{ color: ongoingCount > 0 ? '#f87171' : t.textMuted }}
              title="Alerts">
              <Bell size={16} />
              {ongoingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white font-bold"
                  style={{ fontSize: 9 }}>
                  {ongoingCount}
                </span>
              )}
            </button>

            {/* Embed full dashboard */}
            <button onClick={() => setEmbedMonitor(undefined)}
              className="p-1.5 rounded transition-colors"
              style={{ color: t.textMuted }}
              title="Embed dashboard">
              <Code size={16} />
            </button>

            {/* Settings */}
            <button onClick={() => setShowSettings(true)}
              className="p-1.5 rounded transition-colors"
              style={{ color: t.textMuted }}
              title="Alert settings">
              <Settings size={16} />
            </button>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="p-1.5 rounded transition-colors"
              style={{ color: t.textMuted }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Add monitor */}
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded transition-colors">
              <Plus size={14} />
              Add Monitor
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Alerts panel */}
        {showAlerts && (
          <AlertsPanel
            alerts={alerts}
            onDismiss={dismissAlert}
            onDismissAll={dismissAll}
            onClose={() => setShowAlerts(false)}
          />
        )}

        {loading && <LoadingState t={t} />}
        {error   && <ErrorState  message={error} t={t} />}

        {!loading && !error && (
          <>
            {userMonitors.length > 0 && <SummaryBar monitors={userMonitors} />}

            {/* Tag filter row */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-wider"
                  style={{ color: t.textMuted }}>
                  Filter
                </span>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className="flex items-center gap-0.5 text-xs font-mono px-2 py-0.5 rounded border transition-colors"
                    style={tagFilter.includes(tag)
                      ? { color: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.15)', borderColor: 'rgba(96,165,250,0.4)' }
                      : { color: t.textMuted, backgroundColor: t.tagBg, borderColor: t.tagBorder }
                    }>
                    <TagIcon size={9} />
                    {tag}
                  </button>
                ))}
                {tagFilter.length > 0 && (
                  <button onClick={() => setTagFilter([])}
                    className="text-xs font-mono transition-opacity opacity-50 hover:opacity-100"
                    style={{ color: t.textSecondary }}>
                    clear
                  </button>
                )}
              </div>
            )}

            {/* Monitor grid */}
            {userMonitors.length === 0 ? (
              <EmptyState onAdd={openAdd} t={t} />
            ) : filteredMonitors.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono" style={{ color: t.textMuted }}>
                No monitors match the selected tags
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}>
                <SortableContext
                  items={filteredMonitors.map(m => String(m.id))}
                  strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMonitors.map(m => (
                      <SortableMonitorCard
                        key={m.id}
                        monitor={m}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onEmbed={m => setEmbedMonitor(m)}
                        width={getWidth(m.id)}
                        onSetWidth={(w) => setWidth(m.id, w)}
                        sortEnabled={sortEnabled}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* ── Network Reference section ──────────────────────────────── */}
            {refMonitors.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1" style={{ backgroundColor: t.cardBorder }} />
                  <span className="text-xs font-mono uppercase tracking-widest px-1"
                    style={{ color: t.textFaint }}>
                    Network Reference
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: t.cardBorder }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {refMonitors.map(m => (
                    <MonitorCard
                      key={m.id}
                      monitor={m}
                      onEdit={null}
                      onDelete={null}
                      compact
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── Modals / panels ─────────────────────────────────────────────────── */}
      {showForm && (
        <MonitorForm
          editingMonitor={editingMonitor}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          submitting={submitting}
          allTags={allTags}
        />
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      )}

      {embedMonitor !== null && (
        <EmbedModal
          monitor={embedMonitor}
          onClose={() => setEmbedMonitor(null)}
        />
      )}
    </div>
  );
}

// ── State screens ─────────────────────────────────────────────────────────────

function LoadingState({ t }) {
  return (
    <div className="flex items-center justify-center py-36 gap-3 font-mono text-sm"
      style={{ color: t.textMuted }}>
      <span className="animate-spin">⟳</span> Connecting to server…
    </div>
  );
}

function ErrorState({ message, t }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <AlertTriangle size={36} className="text-red-500/60" />
      <p className="font-mono text-sm text-red-400">Cannot reach the WatchTower server</p>
      <p className="font-mono text-xs" style={{ color: t.textMuted }}>{message}</p>
      <p className="font-mono text-xs mt-2" style={{ color: t.textFaint }}>
        Run <span style={{ color: t.textSecondary }}>npm run dev</span> inside{' '}
        <span style={{ color: t.textSecondary }}>server/</span> to start the backend.
      </p>
    </div>
  );
}

function EmptyState({ onAdd, t }) {
  return (
    <div className="flex flex-col items-center justify-center py-36 text-center">
      <div className="relative mb-6">
        <Activity size={52} style={{ color: t.textFaint }} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600" />
        </span>
      </div>
      <p className="font-mono text-sm mb-1" style={{ color: t.textMuted }}>No monitors configured</p>
      <p className="font-mono text-xs" style={{ color: t.textFaint }}>
        Add an IP or domain to start tracking uptime
      </p>
      <button onClick={onAdd}
        className="mt-8 flex items-center gap-2 px-4 py-2.5 text-sm font-mono rounded border transition-colors hover:opacity-80"
        style={{ backgroundColor: t.tagBg, color: t.textSecondary, borderColor: t.tagBorder }}>
        <Plus size={15} />
        Add your first monitor
      </button>
    </div>
  );
}
