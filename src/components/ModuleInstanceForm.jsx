import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// Shown when adding or editing a module instance (card).
// moduleDef — the frontend module definition (id, name, instanceConfigSchema)
// instance  — existing instance when editing, null when adding
export function ModuleInstanceForm({ moduleDef, instance, onSubmit, onCancel, submitting }) {
  const { t, isDark } = useTheme();

  const [label,       setLabel]       = useState(instance?.label       ?? '');
  const [description, setDescription] = useState(instance?.description ?? '');
  const [interval,    setInterval]    = useState(instance?.interval    ?? 3600);
  const [tagsInput,   setTagsInput]   = useState((instance?.tags ?? []).join(', '));
  const [config,      setConfig]      = useState(instance?.config      ?? {});

  const setConfigKey = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit({ moduleId: moduleDef.id, label, description, interval: Number(interval), tags, config });
  };

  const inputCls   = 'w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 transition-all';
  const inputStyle = { backgroundColor: t.inputBg, color: t.textPrimary, borderColor: t.cardBorder };
  const labelCls   = 'block text-xs font-mono font-medium uppercase tracking-wider mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>

      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: t.cardBorder }}>
          <div>
            <h2 className="text-sm font-mono font-bold" style={{ color: t.textPrimary }}>
              {instance ? 'Edit' : 'Add'} {moduleDef.name}
            </h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: t.textMuted }}>
              {moduleDef.description}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded opacity-50 hover:opacity-100"
            style={{ color: t.textSecondary }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

            {/* Label */}
            <div>
              <label className={labelCls} style={{ color: t.textMuted }}>Label *</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={`My ${moduleDef.name}`}
                required
                className={inputCls} style={inputStyle}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls} style={{ color: t.textMuted }}>Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional notes"
                className={inputCls} style={inputStyle}
              />
            </div>

            {/* Refresh interval */}
            <div>
              <label className={labelCls} style={{ color: t.textMuted }}>Refresh interval (seconds)</label>
              <input
                type="number"
                value={interval}
                onChange={e => setInterval(e.target.value)}
                min={60}
                className={inputCls} style={inputStyle}
              />
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls} style={{ color: t.textMuted }}>Tags</label>
              <input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="production, api (comma separated)"
                className={inputCls} style={inputStyle}
              />
            </div>

            {/* Module-specific instance config */}
            {moduleDef.instanceConfigSchema?.length > 0 && (
              <div className="pt-2 border-t space-y-4" style={{ borderColor: t.cardBorder }}>
                <p className="text-xs font-mono uppercase tracking-wider"
                  style={{ color: t.textMuted }}>
                  {moduleDef.name} settings
                </p>
                {moduleDef.instanceConfigSchema.map(field => (
                  <div key={field.key}>
                    <label className={labelCls} style={{ color: t.textMuted }}>
                      {field.label}{field.required ? ' *' : ''}
                    </label>
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={config[field.key] ?? ''}
                      onChange={e => setConfigKey(field.key, e.target.value)}
                      placeholder={field.placeholder ?? ''}
                      required={field.required}
                      className={inputCls} style={inputStyle}
                    />
                    {field.hint && (
                      <p className="text-xs font-mono mt-1 leading-relaxed"
                        style={{ color: t.textFaint }}>
                        {field.hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: t.cardBorder }}>
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-xs font-mono rounded-lg border transition-colors"
              style={{ borderColor: t.cardBorder, color: t.textMuted, backgroundColor: 'transparent' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-60"
              style={{
                background:  'linear-gradient(135deg, #3b82f6, #2563eb)',
                color:       '#fff',
                boxShadow:   '0 2px 12px rgba(59,130,246,0.35)',
              }}>
              {submitting
                ? <><Loader size={12} className="animate-spin" /> Saving…</>
                : instance ? 'Save changes' : 'Add to dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
