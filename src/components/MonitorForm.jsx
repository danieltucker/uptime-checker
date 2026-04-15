import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Save, Loader, Tag } from 'lucide-react';
import { INTERVAL_OPTIONS, ALERT_TYPES, CHECK_TYPES } from '../types/monitor';
import { useTheme } from '../hooks/useTheme';

const DEFAULT_ALERT_CONFIG = {
  outage:    { panel: true,  notify: 'once'  },
  degraded:  { panel: false, notify: 'never' },
  recovered: { panel: true,  notify: 'once'  },
};

const NOTIFY_OPTIONS = [
  { label: 'Never',        value: 'never'  },
  { label: 'Once',         value: 'once'   },
  { label: 'Every 15 min', value: 'repeat' },
];

const ALERT_ROWS = [
  { key: 'outage',    label: 'Outage',    hint: 'service is DOWN' },
  { key: 'degraded',  label: 'Degraded',  hint: 'ping over threshold' },
  { key: 'recovered', label: 'Recovered', hint: 'back to healthy' },
];

// Which settings keys must be non-empty for a channel to be considered configured
const CHANNEL_CREDENTIAL_KEYS = {
  Telegram: ['telegram_token', 'telegram_chat_id'],
  Email:    ['email_smtp_host', 'email_smtp_user', 'email_smtp_pass', 'email_from', 'email_to'],
  SMS:      ['twilio_account_sid', 'twilio_auth_token', 'twilio_from', 'twilio_to'],
};

// Channels that are always available regardless of settings
const ALWAYS_AVAILABLE = new Set(['Webhook', 'None']);

const DEFAULT_FORM = {
  target:           '',
  label:            '',
  description:      '',
  checkType:        'http',
  port:             '',
  interval:         60,
  alertTypes:       ['None'],
  degradedThreshold: '',
  bodyMatch:        '',
  alertConfig:      DEFAULT_ALERT_CONFIG,
  tags:             [],
  tagInput:         '',
};

export function MonitorForm({ editingMonitor, onSubmit, onCancel, submitting = false, allTags = [] }) {
  const { t } = useTheme();
  const [form,       setForm]       = useState(DEFAULT_FORM);
  const [settings,   setSettings]   = useState({});
  const [formError,  setFormError]  = useState('');

  // Tag autocomplete state
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load saved settings so we know which channels are configured
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(setSettings)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (editingMonitor) {
      const rawCfg = editingMonitor.alertConfig ?? {};
      const alertConfig = {
        outage:    { ...DEFAULT_ALERT_CONFIG.outage,    ...(rawCfg.outage    || {}) },
        degraded:  { ...DEFAULT_ALERT_CONFIG.degraded,  ...(rawCfg.degraded  || {}) },
        recovered: { ...DEFAULT_ALERT_CONFIG.recovered, ...(rawCfg.recovered || {}) },
      };
      setForm({
        target:            editingMonitor.target,
        label:             editingMonitor.label,
        description:       editingMonitor.description,
        checkType:         editingMonitor.checkType ?? 'http',
        port:              editingMonitor.port ?? '',
        interval:          editingMonitor.interval,
        alertTypes:        editingMonitor.alertTypes,
        degradedThreshold: editingMonitor.degradedThreshold ?? '',
        bodyMatch:         editingMonitor.bodyMatch ?? '',
        alertConfig,
        tags:              editingMonitor.tags.filter(t => t !== '_ref'),
        tagInput:          '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setFormError('');
  }, [editingMonitor]);

  // Whether a channel is toggled enabled in Settings (i.e. should be shown as an option)
  const channelEnabled = (type) => {
    if (ALWAYS_AVAILABLE.has(type)) return true;
    if (type === 'Telegram') return settings.telegram_enabled === '1';
    if (type === 'Email')    return settings.email_enabled    === '1';
    if (type === 'SMS')      return settings.twilio_enabled   === '1';
    return false;
  };

  // Whether a channel has all required credentials filled in
  const channelConfigured = (type) => {
    if (ALWAYS_AVAILABLE.has(type)) return true;
    const keys = CHANNEL_CREDENTIAL_KEYS[type] ?? [];
    return keys.every(k => settings[k]?.trim());
  };

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

  const setAlertConfig = (type, key, value) =>
    setForm(prev => ({
      ...prev,
      alertConfig: {
        ...prev.alertConfig,
        [type]: { ...prev.alertConfig[type], [key]: value },
      },
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.target.trim()) return;

    // Validate: selected channels must have credentials saved in Settings
    const missingCreds = form.alertTypes.filter(
      type => !ALWAYS_AVAILABLE.has(type) && !channelConfigured(type)
    );
    if (missingCreds.length > 0) {
      setFormError(
        `${missingCreds.join(', ')} ${missingCreds.length === 1 ? 'has' : 'have'} no saved credentials. ` +
        `Add them in Settings before enabling this channel.`
      );
      return;
    }

    setFormError('');
    const finalTags = form.tagInput.trim()
      ? [...new Set([...form.tags, form.tagInput.trim()])]
      : form.tags;
    onSubmit({
      target:            form.target.trim(),
      label:             form.label.trim(),
      description:       form.description.trim(),
      checkType:         form.checkType,
      port:              form.checkType === 'tcp' && form.port ? Number(form.port) : null,
      interval:          form.interval,
      alertTypes:        form.alertTypes,
      degradedThreshold: form.degradedThreshold !== '' ? Number(form.degradedThreshold) : null,
      bodyMatch:         form.checkType === 'http' && form.bodyMatch.trim() ? form.bodyMatch.trim() : null,
      alertConfig:       form.alertConfig,
      tags:              finalTags,
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

          {/* Alert types — only show channels enabled in Settings */}
          <Field label="Notification Channels" hint="enable channels in Settings" t={t}>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {ALERT_TYPES.filter(channelEnabled).map(type => {
                const active       = form.alertTypes.includes(type);
                const misconfigured = active && !channelConfigured(type);
                return (
                  <button key={type} type="button" onClick={() => { toggleAlert(type); setFormError(''); }}
                    className="px-3 py-1.5 text-xs font-mono rounded border transition-colors"
                    style={misconfigured
                      ? { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.5)', color: '#fbbf24' }
                      : active
                        ? { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.5)', color: '#93c5fd' }
                        : { backgroundColor: t.tagBg, borderColor: t.tagBorder, color: t.textMuted }
                    }>
                    {type}
                    {misconfigured && <span className="ml-1 opacity-70">⚠</span>}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* HTTP-only fields */}
          {form.checkType === 'http' && (
            <>
              {/* Degraded threshold */}
              <Field label="Degraded Threshold" hint="ms — leave blank to disable" t={t}>
                <input type="number" min={1} max={60000}
                  value={form.degradedThreshold}
                  onChange={e => set('degradedThreshold', e.target.value)}
                  placeholder="e.g. 500"
                  className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#f59e0b'}
                  onBlur={e  => e.target.style.borderColor = t.cardBorder}
                />
              </Field>

              {/* Body match */}
              <Field label="Body Contains" hint="plain string, case-insensitive — leave blank to skip" t={t}>
                <input type="text"
                  value={form.bodyMatch}
                  onChange={e => set('bodyMatch', e.target.value)}
                  placeholder='e.g. "ok" or "status":"healthy"'
                  className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#a78bfa'}
                  onBlur={e  => e.target.style.borderColor = t.cardBorder}
                />
              </Field>
            </>
          )}

          {/* Alert behaviour per event type */}
          <Field label="Alert Behaviour" t={t}>
            <div className="rounded border overflow-hidden" style={{ borderColor: t.cardBorder }}>
              {/* Header row */}
              <div className="grid grid-cols-3 px-3 py-1.5 border-b text-xs font-mono uppercase tracking-wider"
                style={{ borderColor: t.cardBorder, backgroundColor: t.metricGap, color: t.textFaint }}>
                <span>Event</span>
                <span className="text-center">Show in Panel</span>
                <span className="text-center">Notify</span>
              </div>
              {ALERT_ROWS.map(({ key, label, hint }) => {
                const cfg = form.alertConfig[key];
                return (
                  <div key={key}
                    className="grid grid-cols-3 items-center px-3 py-2 border-b last:border-0"
                    style={{ borderColor: t.cardBorder }}>

                    {/* Label */}
                    <div>
                      <div className="text-xs font-mono" style={{ color: t.textSecondary }}>{label}</div>
                      <div className="text-xs font-mono" style={{ color: t.textFaint }}>{hint}</div>
                    </div>

                    {/* Panel toggle */}
                    <div className="flex justify-center">
                      <button type="button"
                        onClick={() => setAlertConfig(key, 'panel', !cfg.panel)}
                        className="w-9 h-5 rounded-full border transition-colors relative"
                        style={{
                          backgroundColor: cfg.panel ? 'rgba(59,130,246,0.3)' : t.tagBg,
                          borderColor:     cfg.panel ? 'rgba(59,130,246,0.6)' : t.tagBorder,
                        }}>
                        <span className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
                          style={{
                            left:            cfg.panel ? '18px' : '2px',
                            backgroundColor: cfg.panel ? '#3b82f6' : t.textFaint,
                          }} />
                      </button>
                    </div>

                    {/* Notify frequency */}
                    <div className="flex justify-center">
                      <select
                        value={cfg.notify}
                        onChange={e => setAlertConfig(key, 'notify', e.target.value)}
                        className="text-xs font-mono rounded border px-1.5 py-0.5 appearance-none cursor-pointer focus:outline-none"
                        style={{ backgroundColor: t.inputBg, color: t.textSecondary, borderColor: t.cardBorder }}>
                        {NOTIFY_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>

          {/* Form-level error */}
          {formError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded border text-xs font-mono"
              style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}>
              <span className="shrink-0 mt-0.5">⚠</span>
              {formError}
            </div>
          )}

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
