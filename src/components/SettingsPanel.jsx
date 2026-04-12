import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const DEFAULT_SETTINGS = {
  telegram_enabled: '', telegram_token: '', telegram_chat_id: '',
  email_enabled: '', email_smtp_host: '', email_smtp_port: '587',
  email_smtp_user: '', email_smtp_pass: '', email_from: '', email_to: '',
  twilio_enabled: '', twilio_account_sid: '', twilio_auth_token: '',
  twilio_from: '', twilio_to: '',
};

export function SettingsPanel({ onClose }) {
  const { t } = useTheme();
  const [settings,  setSettings]  = useState(DEFAULT_SETTINGS);
  const [saving,    setSaving]     = useState(false);
  const [saved,     setSaved]      = useState(false);
  const [testState, setTestState]  = useState({}); // channel → 'loading'|'ok'|'error'|message
  const [showPass,  setShowPass]   = useState({});

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setSettings(s => ({ ...s, ...data })))
      .catch(console.error);
  }, []);

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));
  const toggleShow = (key) => setShowPass(p => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('[settings] save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const test = async (channel) => {
    setTestState(s => ({ ...s, [channel]: 'loading' }));
    try {
      const res = await fetch(`/api/settings/test/${channel}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      setTestState(s => ({ ...s, [channel]: 'ok' }));
    } catch (err) {
      setTestState(s => ({ ...s, [channel]: err.message }));
    } finally {
      setTimeout(() => setTestState(s => ({ ...s, [channel]: null })), 5000);
    }
  };

  const inputCls = 'w-full rounded border px-3 py-2 text-sm font-mono focus:outline-none transition-colors';
  const inputStyle = { backgroundColor: t.inputBg, color: t.textPrimary, borderColor: t.cardBorder };

  return (
    <div className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="h-full w-full max-w-md flex flex-col border-l shadow-2xl overflow-hidden"
        style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: t.metricGap }}>
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest"
            style={{ color: t.textSecondary }}>
            // Alert Settings
          </h2>
          <button onClick={onClose} className="p-1.5 rounded opacity-50 hover:opacity-100"
            style={{ color: t.textSecondary }}>
            <X size={16} />
          </button>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Telegram */}
          <Channel
            title="Telegram"
            description="Free. Create a bot via @BotFather, then message it to get your chat ID."
            enabled={settings.telegram_enabled === '1'}
            onToggle={v => set('telegram_enabled', v ? '1' : '')}
            testState={testState.telegram}
            onTest={() => test('telegram')}
            t={t}>
            <Field label="Bot Token" t={t}>
              <PasswordInput value={settings.telegram_token}
                onChange={v => set('telegram_token', v)}
                show={showPass.telegram_token}
                onToggle={() => toggleShow('telegram_token')}
                placeholder="123456:ABC-DEF..."
                cls={inputCls} style={inputStyle} t={t} />
            </Field>
            <Field label="Chat ID" t={t}>
              <input value={settings.telegram_chat_id}
                onChange={e => set('telegram_chat_id', e.target.value)}
                placeholder="-1001234567890"
                className={inputCls} style={inputStyle} />
            </Field>
          </Channel>

          {/* Email */}
          <Channel
            title="Email"
            description="Sends via SMTP. Works with Gmail (use an App Password), Brevo, Resend, or any SMTP relay."
            enabled={settings.email_enabled === '1'}
            onToggle={v => set('email_enabled', v ? '1' : '')}
            testState={testState.email}
            onTest={() => test('email')}
            t={t}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SMTP Host" t={t}>
                <input value={settings.email_smtp_host}
                  onChange={e => set('email_smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Port" t={t}>
                <input value={settings.email_smtp_port}
                  onChange={e => set('email_smtp_port', e.target.value)}
                  placeholder="587"
                  className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <Field label="Username" t={t}>
              <input value={settings.email_smtp_user}
                onChange={e => set('email_smtp_user', e.target.value)}
                placeholder="you@gmail.com"
                className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Password / App Password" t={t}>
              <PasswordInput value={settings.email_smtp_pass}
                onChange={v => set('email_smtp_pass', v)}
                show={showPass.email_smtp_pass}
                onToggle={() => toggleShow('email_smtp_pass')}
                placeholder="••••••••••••••••"
                cls={inputCls} style={inputStyle} t={t} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" t={t}>
                <input value={settings.email_from}
                  onChange={e => set('email_from', e.target.value)}
                  placeholder="alerts@example.com"
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="To" t={t}>
                <input value={settings.email_to}
                  onChange={e => set('email_to', e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls} style={inputStyle} />
              </Field>
            </div>
          </Channel>

          {/* Twilio SMS */}
          <Channel
            title="SMS via Twilio"
            description="Paid per message (~$0.008/msg). Requires a Twilio account and a purchased phone number."
            enabled={settings.twilio_enabled === '1'}
            onToggle={v => set('twilio_enabled', v ? '1' : '')}
            testState={testState.twilio}
            onTest={() => test('twilio')}
            t={t}>
            <Field label="Account SID" t={t}>
              <input value={settings.twilio_account_sid}
                onChange={e => set('twilio_account_sid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxx"
                className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Auth Token" t={t}>
              <PasswordInput value={settings.twilio_auth_token}
                onChange={v => set('twilio_auth_token', v)}
                show={showPass.twilio_auth_token}
                onToggle={() => toggleShow('twilio_auth_token')}
                placeholder="••••••••••••••••"
                cls={inputCls} style={inputStyle} t={t} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From Number" t={t}>
                <input value={settings.twilio_from}
                  onChange={e => set('twilio_from', e.target.value)}
                  placeholder="+15551234567"
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="To Number" t={t}>
                <input value={settings.twilio_to}
                  onChange={e => set('twilio_to', e.target.value)}
                  placeholder="+15559876543"
                  className={inputCls} style={inputStyle} />
              </Field>
            </div>
          </Channel>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between shrink-0"
          style={{ borderColor: t.metricGap }}>
          <span className="text-xs font-mono" style={{ color: t.textFaint }}>
            Enable channels per monitor in the Edit form
          </span>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-mono font-bold rounded transition-colors">
            {saving  ? <><Loader size={12} className="animate-spin" /> Saving…</> :
             saved   ? <><CheckCircle size={12} /> Saved</> :
                       'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Channel({ title, description, enabled, onToggle, testState, onTest, children, t }) {
  const isLoading = testState === 'loading';
  const isOk      = testState === 'ok';
  const isError   = testState && testState !== 'loading' && testState !== 'ok';

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: t.cardBorder }}>
      {/* Channel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: t.tagBg, borderColor: t.cardBorder }}>
        <div>
          <div className="text-sm font-mono font-semibold" style={{ color: t.textPrimary }}>
            {title}
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: t.textMuted }}>
            {description}
          </div>
        </div>
        {/* Toggle */}
        <button onClick={() => onToggle(!enabled)}
          className="shrink-0 ml-4 w-9 h-5 rounded-full transition-colors relative"
          style={{ backgroundColor: enabled ? '#3b82f6' : t.metricGap }}>
          <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm"
            style={{ left: enabled ? '18px' : '2px' }} />
        </button>
      </div>

      {/* Fields */}
      <div className="px-4 py-4 space-y-3">
        {children}

        {/* Test button + result */}
        <div className="flex items-center gap-3 pt-1">
          <button onClick={onTest} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors disabled:opacity-50"
            style={{ backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.textSecondary }}>
            {isLoading
              ? <><Loader size={11} className="animate-spin" /> Sending…</>
              : <><Send size={11} /> Send Test</>}
          </button>
          {isOk && (
            <span className="flex items-center gap-1 text-xs font-mono text-green-400">
              <CheckCircle size={11} /> Sent successfully
            </span>
          )}
          {isError && (
            <span className="flex items-center gap-1 text-xs font-mono text-red-400">
              <AlertCircle size={11} /> {testState}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, t }) {
  return (
    <div>
      <label className="block text-xs font-mono uppercase tracking-wider mb-1"
        style={{ color: t.textMuted }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle, placeholder, cls, style, t }) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cls}
        style={{ ...style, paddingRight: '2.5rem' }}
      />
      <button type="button" onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
        style={{ color: t.textSecondary }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}
