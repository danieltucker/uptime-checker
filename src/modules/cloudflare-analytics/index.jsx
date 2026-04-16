import React from 'react';
import { Cloud, AlertCircle, Loader } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

function fmtBytes(bytes) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024)         return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── Card ──────────────────────────────────────────────────────────────────────

function CloudflareAnalyticsCard({ data, loading, error, t }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-xs font-mono"
        style={{ color: t.textMuted }}>
        <Loader size={13} className="animate-spin" /> Fetching analytics…
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

  const { totals, history = [] } = data;

  const metrics = [
    { label: 'Requests',  value: fmtNum(totals?.requests),  color: '#3b82f6' },
    { label: 'Pageviews', value: fmtNum(totals?.pageViews), color: '#22c55e' },
    { label: 'Visitors',  value: fmtNum(totals?.uniques),   color: '#a78bfa' },
    { label: 'Bandwidth', value: fmtBytes(totals?.bytes),   color: '#f59e0b' },
  ];

  return (
    <div className="space-y-4">
      {/* Period label */}
      {data.sinceDate && (
        <div className="text-xs font-mono" style={{ color: t.textFaint }}>
          {fmtDate(data.sinceDate)} – {fmtDate(data.untilDate)} (7 days)
        </div>
      )}

      {/* 4-metric grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg px-3 py-2"
            style={{ backgroundColor: `${m.color}14`, border: `1px solid ${m.color}30` }}>
            <div className="text-base font-mono font-bold" style={{ color: m.color }}>
              {m.value}
            </div>
            <div className="text-xs font-mono" style={{ color: t.textMuted }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Daily requests bar chart */}
      {history.length > 0 && (
        <div>
          <div className="text-xs font-mono uppercase tracking-wider mb-2"
            style={{ color: t.textMuted }}>
            Daily requests
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={history} barSize={8}>
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 9, fill: t.textFaint, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded border px-2 py-1.5 text-xs font-mono shadow-lg"
                      style={{ backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, color: t.textSecondary }}>
                      <div style={{ color: t.textFaint }}>{fmtDate(d.date)}</div>
                      <div>{fmtNum(d.requests)} requests</div>
                      <div>{fmtNum(d.pageViews)} pageviews</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="requests" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Module definition ─────────────────────────────────────────────────────────

export default {
  id:          'cloudflare-analytics',
  name:        'Cloudflare Analytics',
  icon:        Cloud,
  description: 'Track requests, pageviews, unique visitors, and bandwidth for a Cloudflare zone.',
  minSize:     { cols: 1, rows: 1 },
  Card:        CloudflareAnalyticsCard,

  // Global credential fields — one API token covers all zones
  settingsSchema: [
    {
      key:         'api_token',
      label:       'API Token',
      type:        'password',
      required:    true,
      placeholder: 'your-cloudflare-api-token',
      hint:        'Create a token in the Cloudflare dashboard (My Profile > API Tokens) with Analytics:Read permission scoped to the zones you want to monitor.',
    },
  ],

  // Per-instance config — one card per Cloudflare zone
  instanceConfigSchema: [
    {
      key:         'zoneId',
      label:       'Zone ID',
      type:        'text',
      required:    true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      hint:        'Found on the Overview page of your domain in the Cloudflare dashboard, in the right-hand sidebar.',
    },
  ],
};
