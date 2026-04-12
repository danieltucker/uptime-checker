import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Save, Loader, Tag } from 'lucide-react';
import { INTERVAL_OPTIONS, ALERT_TYPES, CHECK_TYPES } from '../types/monitor';
import { useTheme } from '../hooks/useTheme';

const DEFAULT_FORM = {
  target:      '',
  label:       '',
  description: '',
  checkType:   'http',
  port:        '',
  interval:    60,
  alertTypes:  ['None'],
  tags:        [],          // stored as string[] internally
  tagInput:    '',          // the text field value
};

export function MonitorForm({ editingMonitor, onSubmit, onCancel, submitting = false, allTags = [] }) {
  const { t } = useTheme();
  const [form, setForm] = useState(DEFAULT_FORM);

  // Tag autocomplete state
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (editingMonitor) {
      setForm({
        target:      editingMonitor.target,
        label:       editingMonitor.label,
        description: editingMonitor.description,
        checkType:   editingMonitor.checkType ?? 'http',
        port:        editingMonitor.port ?? '',
        interval:    editingMonitor.interval,
        alertTypes:  editingMonitor.alertTypes,
        tags:        editingMonitor.tags.filter(t => t !== '_ref'),
        tagInput:    '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editingMonitor]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          tagInputRef.current && !tagInputRef.current.contains(e.target)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Tag autocomplete logic ────────────────────────────────────────────────

  const currentTokenRaw = form.tagInput.trim().toLowerCase();

  const tagSuggestions = allTags.filter(tag => {
    if (form.tags.includes(tag)) return false;                      // already added
    if (!currentTokenRaw) return true;                               // show all when empty
    return tag.toLowerCase().includes(currentTokenRaw);              // filter by typing
  });

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed || form.tags.includes(trimmed)) return;
    set('tags', [...form.tags, trimmed]);
    set('tagInput', '');
    setTagDropdownOpen(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (tag) => set('tags', form.tags.filter(t => t !== tag));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (form.tagInput.trim()) addTag(form.tagInput);
    } else if (e.key === 'Backspace' && !form.tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    } else if (e.key === 'Escape') {
      setTagDropdownOpen(false);
    } else if (e.key === 'ArrowDown' && tagDropdownOpen && tagSuggestions.length > 0) {
      e.preventDefault();
      dropdownRef.current?.querySelector('button')?.focus();
    }
  };

  // ── Alert toggle ──────────────────────────────────────────────────────────

  const toggleAlert = (type) => {
    setForm(prev => {
      if (type === 'None') return { ...prev, alertTypes: ['None'] };
      const without = prev.alertTypes.filter(a => a !== 'None' && a !== type);
      const adding  = !prev.alertTypes.includes(type);
      const next    = adding ? [...without, type] : without;
      return { ...prev, alertTypes: next.length ? next : ['None'] };
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.target.trim()) return;
    // Commit any in-progress tag text
    const finalTags = form.tagInput.trim()
      ? [...new Set([...form.tags, form.tagInput.trim()])]
      : form.tags;
    onSubmit({
      target:      form.target.trim(),
      label:       form.label.trim(),
      description: form.description.trim(),
      checkType:   form.checkType,
      port:        form.checkType === 'tcp' && form.port ? Number(form.port) : null,
      interval:    form.interval,
      alertTypes:  form.alertTypes,
      tags:        finalTags,
    });
  };

  const isEditing = !!editingMonitor;

  const targetPlaceholder =
    form.checkType === 'http'  ? 'https://api.example.com  or  google.com' :
    form.checkType === 'tcp'   ? '192.168.1.1  or  db.internal' :
                                  '192.168.1.1  or  router.local';

  // ── Derived input style ───────────────────────────────────────────────────

  const inputStyle = {
    backgroundColor: t.inputBg,
    color:           t.textPrimary,
    borderColor:     t.cardBorder,
  };

  const inputCls = [
    'w-full rounded border px-3 py-2 text-sm font-mono',
    'focus:outline-none transition-colors appearance-none',
  ].join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && !submitting && onCancel()}
    >
      <div className="w-full max-w-lg rounded-lg shadow-2xl border"
        style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: t.metricGap }}>
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest"
            style={{ color: t.textSecondary }}>
            {isEditing ? '// Edit Monitor' : '// New Monitor'}
          </h2>
          <button onClick={onCancel} disabled={submitting}
            className="p-1.5 rounded transition-colors disabled:opacity-40"
            style={{ color: t.textFaint }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Check type */}
          <Field label="Check Type" t={t}>
            <div className="flex gap-2">
              {CHECK_TYPES.map(ct => (
                <button key={ct.value} type="button"
                  onClick={() => set('checkType', ct.value)}
                  className="flex-1 py-2 text-xs font-mono rounded border transition-colors"
                  style={form.checkType === ct.value
                    ? { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.5)', color: '#93c5fd' }
                    : { backgroundColor: t.tagBg, borderColor: t.tagBorder, color: t.textMuted }
                  }>
                  {ct.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Target */}
          <Field label="Target" required t={t}>
            <input type="text" value={form.target}
              onChange={e => set('target', e.target.value)}
              placeholder={targetPlaceholder}
              required autoFocus
              className={inputCls}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e  => e.target.style.borderColor = t.cardBorder}
            />
          </Field>

          {/* Port — TCP only */}
          {form.checkType === 'tcp' && (
            <Field label="Port" required hint="e.g. 5432, 3306, 6379" t={t}>
              <input type="number" min={1} max={65535}
                value={form.port}
                onChange={e => set('port', e.target.value)}
                placeholder="443" required
                className={inputCls}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e  => e.target.style.borderColor = t.cardBorder}
              />
            </Field>
          )}

          {/* Label */}
          <Field label="Label" hint="defaults to target" t={t}>
            <input type="text" value={form.label}
              onChange={e => set('label', e.target.value)}
              placeholder="Production API Gateway"
              className={inputCls} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e  => e.target.style.borderColor = t.cardBorder}
            />
          </Field>

          {/* Description */}
          <Field label="Description" t={t}>
            <input type="text" value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional free-form note"
              className={inputCls} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e  => e.target.style.borderColor = t.cardBorder}
            />
          </Field>

          {/* Interval + Tags */}
          <div className="grid grid-cols-2 gap-4">

            <Field label="Check Interval" t={t}>
              <select value={form.interval}
                onChange={e => set('interval', Number(e.target.value))}
                className={inputCls} style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e  => e.target.style.borderColor = t.cardBorder}>
                {INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            {/* Tags with autocomplete */}
            <Field label="Tags" hint="Enter or , to add" t={t}>
              <div className="relative">
                {/* Tag pill container + input */}
                <div
                  className="flex flex-wrap items-center gap-1 min-h-[36px] rounded border px-2 py-1 cursor-text"
                  style={{ backgroundColor: t.inputBg, borderColor: t.cardBorder }}
                  onClick={() => tagInputRef.current?.focus()}>
                  {form.tags.map(tag => (
                    <span key={tag}
                      className="flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ color: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)' }}>
                      <Tag size={8} />
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}
                        className="ml-0.5 opacity-60 hover:opacity-100">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={form.tagInput}
                    onChange={e => { set('tagInput', e.target.value); setTagDropdownOpen(true); }}
                    onFocus={() => setTagDropdownOpen(true)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={form.tags.length === 0 ? 'web, critical…' : ''}
                    className="flex-1 min-w-[60px] bg-transparent text-xs font-mono outline-none"
                    style={{ color: t.textPrimary, caretColor: '#3b82f6' }}
                  />
                </div>

                {/* Suggestions dropdown */}
                {tagDropdownOpen && tagSuggestions.length > 0 && (
                  <div ref={dropdownRef}
                    className="absolute z-10 left-0 right-0 top-full mt-1 rounded border shadow-xl overflow-hidden"
                    style={{ backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder }}>
                    {tagSuggestions.slice(0, 8).map(tag => (
                      <button key={tag} type="button"
                        onMouseDown={e => { e.preventDefault(); addTag(tag); }}
                        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-left transition-colors"
                        style={{ color: t.textSecondary }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.tagBg}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                        <Tag size={9} style={{ color: '#60a5fa' }} />
                        {tag}
                      </button>
                    ))}
                    {form.tagInput.trim() && !allTags.includes(form.tagInput.trim()) && (
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); addTag(form.tagInput); }}
                        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-left border-t transition-colors"
                        style={{ color: '#60a5fa', borderColor: t.tooltipBorder }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.tagBg}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                        <Plus size={9} />
                        Create &quot;{form.tagInput.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Field>
          </div>

          {/* Alert types — coming soon */}
          <Field label="Alert Types" t={t}>
            <div className="rounded-lg border px-3 py-3 space-y-2.5"
              style={{ borderColor: t.tagBorder, backgroundColor: t.tagBg }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.1)' }}>
                  Coming soon
                </span>
                <span className="text-xs font-mono" style={{ color: t.textMuted }}>
                  Alert dispatch is under development
                </span>
              </div>
              <div className="flex flex-wrap gap-2 opacity-40 pointer-events-none select-none">
                {ALERT_TYPES.map(type => (
                  <span key={type}
                    className="px-3 py-1.5 text-xs font-mono rounded border"
                    style={{ backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.textMuted }}>
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </Field>

          {/* Actions */}
          <div className="flex justify-end items-center gap-3 pt-2 border-t"
            style={{ borderColor: t.metricGap }}>
            <button type="button" onClick={onCancel} disabled={submitting}
              className="px-4 py-2 text-xs font-mono transition-colors disabled:opacity-40"
              style={{ color: t.textMuted }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-mono font-bold rounded transition-colors">
              {submitting
                ? <><Loader size={13} className="animate-spin" /> Saving…</>
                : isEditing
                  ? <><Save size={13} /> Save Changes</>
                  : <><Plus size={13} /> Add Monitor</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children, t }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-xs font-mono uppercase tracking-wider"
          style={{ color: t.textMuted }}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs font-mono" style={{ color: t.textFaint }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
