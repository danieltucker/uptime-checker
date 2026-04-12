import React, { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { INTERVAL_OPTIONS, ALERT_TYPES } from '../types/monitor';

const DEFAULT_FORM = {
  target:     '',
  label:      '',
  description: '',
  interval:   60,
  alertTypes: ['None'],
  tags:       '',
};

/**
 * Add / Edit monitor modal.
 * @param {object|null} editingMonitor — null → "Add" mode, object → "Edit" mode
 * @param {function}    onSubmit       — called with validated form data
 * @param {function}    onCancel
 */
export function MonitorForm({ editingMonitor, onSubmit, onCancel }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  // Pre-populate when editing
  useEffect(() => {
    if (editingMonitor) {
      setForm({
        target:      editingMonitor.target,
        label:       editingMonitor.label,
        description: editingMonitor.description,
        interval:    editingMonitor.interval,
        alertTypes:  editingMonitor.alertTypes,
        tags:        editingMonitor.tags.join(', '),
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editingMonitor]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleAlert = (type) => {
    setForm(prev => {
      if (type === 'None') return { ...prev, alertTypes: ['None'] };
      const without = prev.alertTypes.filter(a => a !== 'None' && a !== type);
      const adding  = !prev.alertTypes.includes(type);
      const next    = adding ? [...without, type] : without;
      return { ...prev, alertTypes: next.length ? next : ['None'] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.target.trim()) return;
    onSubmit({
      target:      form.target.trim(),
      label:       form.label.trim(),
      description: form.description.trim(),
      interval:    form.interval,
      alertTypes:  form.alertTypes,
      tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  const isEditing = !!editingMonitor;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-xs font-mono font-bold text-gray-300 uppercase tracking-widest">
            {isEditing ? '// Edit Monitor' : '// New Monitor'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Target */}
          <Field label="Target" required>
            <input
              type="text"
              value={form.target}
              onChange={e => set('target', e.target.value)}
              placeholder="192.168.1.1  or  google.com"
              required
              autoFocus
              className={inputCls}
            />
          </Field>

          {/* Label */}
          <Field label="Label" hint="defaults to target">
            <input
              type="text"
              value={form.label}
              onChange={e => set('label', e.target.value)}
              placeholder="Production API Gateway"
              className={inputCls}
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional free-form note"
              className={inputCls}
            />
          </Field>

          {/* Interval + Tags — 2-col row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Check Interval">
              <select
                value={form.interval}
                onChange={e => set('interval', Number(e.target.value))}
                className={inputCls}
              >
                {INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Tags" hint="comma-separated">
              <input
                type="text"
                value={form.tags}
                onChange={e => set('tags', e.target.value)}
                placeholder="web, critical, dns"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Alert types */}
          <Field label="Alert Types">
            <div className="flex flex-wrap gap-2 pt-0.5">
              {ALERT_TYPES.map(type => {
                const active = form.alertTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleAlert(type)}
                    className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                      active
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Actions */}
          <div className="flex justify-end items-center gap-3 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-mono text-gray-500 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded transition-colors"
            >
              {isEditing ? <><Save size={13} /> Save Changes</> : <><Plus size={13} /> Add Monitor</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls = [
  'w-full bg-[#0d1117] border border-gray-700 rounded',
  'px-3 py-2 text-sm font-mono text-gray-100',
  'placeholder-gray-700',
  'focus:outline-none focus:border-blue-500',
  'transition-colors',
  // select-specific
  'appearance-none',
].join(' ');

function Field({ label, hint, required, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs font-mono text-gray-700">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
