import React, { useState } from 'react';
import { Plus, Radio, Activity } from 'lucide-react';

import { useMonitors } from './hooks/useMonitors';
import { SummaryBar } from './components/SummaryBar';
import { MonitorCard } from './components/MonitorCard';
import { MonitorForm } from './components/MonitorForm';

export default function App() {
  const { monitors, addMonitor, updateMonitor, deleteMonitor } = useMonitors();

  const [showForm,        setShowForm]        = useState(false);
  const [editingMonitor,  setEditingMonitor]  = useState(null);

  // ── Form handlers ────────────────────────────────────────

  const openAdd = () => {
    setEditingMonitor(null);
    setShowForm(true);
  };

  const openEdit = (monitor) => {
    setEditingMonitor(monitor);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingMonitor(null);
  };

  const handleFormSubmit = (data) => {
    if (editingMonitor) {
      updateMonitor(editingMonitor.id, data);
    } else {
      addMonitor(data);
    }
    closeForm();
  };

  const handleDelete = (id) => {
    // TODO: replace confirm() with an in-app modal when backend is added
    if (window.confirm('Delete this monitor? This cannot be undone.')) {
      deleteMonitor(id);
    }
  };

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117', color: '#e6edf3' }}>

      {/* ── Top nav ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-800" style={{ backgroundColor: '#161b22' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-green-400" />
            <span className="font-mono font-bold tracking-[0.12em] text-gray-100">
              WATCHTOWER
            </span>
            <span className="hidden sm:inline text-xs font-mono text-gray-700 border border-gray-800 px-2 py-0.5 rounded">
              uptime monitor · v1
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-mono text-gray-600">live</span>
            </div>

            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded transition-colors"
            >
              <Plus size={14} />
              Add Monitor
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Summary bar — only shown when monitors exist */}
        {monitors.length > 0 && <SummaryBar monitors={monitors} />}

        {/* Monitor grid or empty state */}
        {monitors.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {monitors.map(m => (
              <MonitorCard
                key={m.id}
                monitor={m}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Add / Edit modal ─────────────────────────────── */}
      {showForm && (
        <MonitorForm
          editingMonitor={editingMonitor}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
        />
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-36 text-center">
      <div className="relative mb-6">
        <Activity size={52} className="text-gray-800" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span>
        </span>
      </div>
      <p className="font-mono text-sm text-gray-500 mb-1">No monitors configured</p>
      <p className="font-mono text-xs text-gray-700">Add an IP or domain to start tracking uptime</p>
      <button
        onClick={onAdd}
        className="mt-8 flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-mono rounded border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <Plus size={15} />
        Add your first monitor
      </button>
    </div>
  );
}
