import React, { useState } from 'react';
import { X, Copy, Check, Monitor, LayoutGrid } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function EmbedModal({ monitor, onClose }) {
  const { t } = useTheme();
  const [tab,    setTab]    = useState(monitor ? 'widget' : 'page');
  const [copied, setCopied] = useState(false);

  const origin = window.location.origin;

  const widgetSrc = `${origin}/embed/monitor/${monitor?.id}`;
  const pageSrc   = `${origin}/embed`;

  const widgetCode = monitor
    ? `<iframe\n  src="${widgetSrc}"\n  width="360"\n  height="230"\n  frameborder="0"\n  style="border-radius:8px;overflow:hidden"\n></iframe>`
    : null;

  const pageCode = `<iframe\n  src="${pageSrc}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border-radius:8px;overflow:hidden"\n></iframe>`;

  const activeCode = tab === 'widget' ? widgetCode : pageCode;

  const copy = () => {
    navigator.clipboard.writeText(activeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-lg rounded-lg border shadow-2xl flex flex-col"
        style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder, maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header — fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: t.metricGap }}>
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest"
            style={{ color: t.textSecondary }}>
            // Embed
          </h2>
          <button onClick={onClose} className="p-1.5 rounded opacity-50 hover:opacity-100"
            style={{ color: t.textSecondary }}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Tabs */}
          <div className="flex gap-2">
            {monitor && (
              <button onClick={() => setTab('widget')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors"
                style={tab === 'widget'
                  ? { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.5)', color: '#93c5fd' }
                  : { backgroundColor: t.tagBg, borderColor: t.tagBorder, color: t.textMuted }}>
                <Monitor size={11} />
                This Monitor
              </button>
            )}
            <button onClick={() => setTab('page')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors"
              style={tab === 'page'
                ? { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.5)', color: '#93c5fd' }
                : { backgroundColor: t.tagBg, borderColor: t.tagBorder, color: t.textMuted }}>
              <LayoutGrid size={11} />
              Full Dashboard
            </button>
          </div>

          {/* Description */}
          <p className="text-xs font-mono" style={{ color: t.textMuted }}>
            {tab === 'widget'
              ? `Embeds just the ${monitor?.label} card. No edit or delete controls.`
              : 'Embeds the full read-only dashboard. No edit, delete, or settings controls.'}
          </p>

          {/* URL preview */}
          <div className="rounded border px-3 py-2 text-xs font-mono truncate"
            style={{ backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.textFaint }}>
            {tab === 'widget' ? widgetSrc : pageSrc}
          </div>

          {/* Code block */}
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

          {/* Dimensions hint */}
          <p className="text-xs font-mono" style={{ color: t.textFaint }}>
            {tab === 'widget'
              ? 'Recommended size: 360 x 230px. Adjust height if the monitor has many tags.'
              : 'Set height to match your content. Use 100% width for responsive layouts.'}
          </p>
        </div>
      </div>
    </div>
  );
}
