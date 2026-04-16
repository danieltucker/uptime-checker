import React from 'react';
import { BrainCircuit, AlertCircle, Loader } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Shorten model IDs for display: "claude-sonnet-4-6" → "Sonnet 4.6"
function fmtModel(id) {
  return id
    .replace(/^claude-/, '')
    .replace(/-(\d+)-(\d+)$/, ' $1.$2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ClaudeUsageCard({ data, loading, error, t }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-xs font-mono"
        style={{ color: t.textMuted }}>
        <Loader size={13} className="animate-spin" /> Fetching usage…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 py-3 text-xs font-mono text-red-400">
        <AlertCircle size={13} className="shrink-0 mt-0.5" />
        <span className="leading-relaxed">{error}</span>
      </div>
    );
  }

  if (!data) return null;

  const totalTokens = (data.total_input_tokens ?? 0) + (data.total_output_tokens ?? 0);

  return (
    <div className="space-y-4">
      {/* Period label */}
      {data.period && (
        <div className="text-xs font-mono" style={{ color: t.textFaint }}>
          Billing period: {data.period}
        </div>
      )}

      {/* Total tokens — headline metric */}
      <div className="flex items-end gap-3">
        <div>
          <div className="text-2xl font-mono font-bold" style={{ color: t.textPrimary }}>
            {fmtTokens(totalTokens)}
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: t.textMuted }}>
            total tokens
          </div>
        </div>
        <div className="mb-1 flex gap-4">
          <div>
            <div className="text-sm font-mono font-semibold" style={{ color: '#60a5fa' }}>
              {fmtTokens(data.total_input_tokens ?? 0)}
            </div>
            <div className="text-xs font-mono" style={{ color: t.textFaint }}>in</div>
          </div>
          <div>
            <div className="text-sm font-mono font-semibold" style={{ color: '#a78bfa' }}>
              {fmtTokens(data.total_output_tokens ?? 0)}
            </div>
            <div className="text-xs font-mono" style={{ color: t.textFaint }}>out</div>
          </div>
        </div>
      </div>

      {/* Per-model breakdown */}
      {data.by_model?.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-mono uppercase tracking-wider" style={{ color: t.textMuted }}>
            By model
          </div>
          {data.by_model.map(m => {
            const total = m.input_tokens + m.output_tokens;
            const pct   = totalTokens > 0 ? Math.round((total / totalTokens) * 100) : 0;
            return (
              <div key={m.model}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-mono" style={{ color: t.textSecondary }}>
                    {fmtModel(m.model)}
                  </span>
                  <span className="text-xs font-mono" style={{ color: t.textFaint }}>
                    {fmtTokens(total)} ({pct}%)
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: t.metricGap }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: '#3b82f6' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Module definition ─────────────────────────────────────────────────────────

export default {
  id:          'claude-usage',
  name:        'Claude API Usage',
  icon:        BrainCircuit,
  description: 'Track Anthropic API token usage across models for the current billing period.',
  minSize:     { cols: 1, rows: 1 },
  Card:        ClaudeUsageCard,

  // Global credential fields — configured once in Settings > Modules
  settingsSchema: [
    {
      key:         'api_key',
      label:       'Admin API Key',
      type:        'password',
      required:    true,
      placeholder: 'sk-ant-admin01-...',
      hint:        'Requires an Admin API key from console.anthropic.com > Settings > API Keys. Standard inference keys do not have usage read access.',
    },
  ],

  // Per-instance config — filled in when adding a dashboard card
  instanceConfigSchema: [],
};
