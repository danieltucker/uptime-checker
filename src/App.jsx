import React, { useState } from 'react';
import { Plus, Radio, Activity, AlertTriangle } from 'lucide-react';

import { useMonitors } from './hooks/useMonitors';
import { SummaryBar }  from './components/SummaryBar';
import { MonitorCard } from './components/MonitorCard';
import { MonitorForm } from './components/MonitorForm';

export default function App() {
  const { monitors, loading, error, addMonitor, updateMonitor, deleteMonitor } = useMonitors();

  const [showForm,       setShowForm]       = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [submitting,     setSubmitting]     = useState(false);

  // ── Form handlers ─────────────────────────────────────────

  const openAdd = () => { setEditingMonitor(null); setShowForm(true); };

  const openEdit = (monitor) => { setEditingMonitor(monitor); setShowForm(true); };

  const closeForm = () => { setShowForm(false); setEditingMonitor(null); };

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingMonitor) {
        await updateMonitor(editingMonitor.id, data);
      } else {
        await addMonitor(data);
      }
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
    try {
      await deleteMonitor(id);
    } catch (err) {
      console.error('[watchtower] delete failed:', err);
      alert(`Failed to delete monitor: ${err.message}`);
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117', color: '#e6edf3' }}>

      {/* ── Top nav ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-800" style={{ backgroundColor: '#161b22' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-green-400" />
            <span className="font-mono font-bold tracking-[0.12em] text-gray-100">WATCHTOWER</span>
            <span className="hidden sm:inline text-xs font-mono text-gray-700 border border-gray-800 px-2 py-0.5 rounded">
              uptime monitor · v2
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* SSE live indicator */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-mono text-gray-600">live</span>
            </div>

            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded transition-colors">
              <Plus size={14} />
              Add Monitor
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {loading && <LoadingState />}

        {error && <ErrorState message={error} />}

        {!loading && !error && (
          <>
            {monitors.length > 0 && <SummaryBar monitors={monitors} />}

            {monitors.length === 0
              ? <EmptyState onAdd={openAdd} />
              : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {monitors.map(m => (
                    <MonitorCard key={m.id} monitor={m} onEdit={openEdit} onDelete={handleDelete} />
                  ))}
                </div>
              )
            }
          </>
        )}
      </main>

      {/* ── Modal ──────────────────────────────────────────── */}
      {showForm && (
        <MonitorForm
          editingMonitor={editingMonitor}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          submitting={submitting}
        />
      )}
    </div>
  );
}

// ── State screens ──────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-36 gap-3 text-gray-600 font-mono text-sm">
      <span className="animate-spin">⟳</span> Connecting to server…
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <AlertTriangle size={36} className="text-red-500/60" />
      <p className="font-mono text-sm text-red-400">Cannot reach the WatchTower server</p>
      <p className="font-mono text-xs text-gray-600">{message}</p>
      <p className="font-mono text-xs text-gray-700 mt-2">
        Run <span className="text-gray-500">npm run dev</span> inside <span className="text-gray-500">server/</span> to start the backend.
      </p>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-36 text-center">
      <div className="relative mb-6">
        <Activity size={52} className="text-gray-800" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600" />
        </span>
      </div>
      <p className="font-mono text-sm text-gray-500 mb-1">No monitors configured</p>
      <p className="font-mono text-xs text-gray-700">Add an IP or domain to start tracking uptime</p>
      <button onClick={onAdd}
        className="mt-8 flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-mono rounded border border-gray-700 hover:border-gray-600 transition-colors">
        <Plus size={15} />
        Add your first monitor
      </button>
    </div>
  );
}
