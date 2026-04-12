/**
 * Monitor schema — defines the shape of a monitor object throughout the app.
 * When a real backend is added, this will map 1:1 to the DB row + computed fields.
 *
 * {
 *   id:            string       — UUID, generated client-side (TODO: use server-assigned ID)
 *   label:         string       — friendly display name
 *   target:        string       — IP address or domain (e.g. "192.168.1.1", "google.com")
 *   description:   string       — optional free-form description
 *   interval:      number       — check interval in seconds (30 | 60 | 300 | 900 | 1800 | 3600)
 *   alertTypes:    string[]     — e.g. ['Email', 'Webhook'] or ['None']
 *   tags:          string[]     — optional labels for grouping/filtering
 *   status:        'up'|'down'|'pending'
 *   currentPing:   number|null  — latest ping in ms; null when host is down
 *   uptimePercent: number       — 0–100, computed from history
 *   history:       CheckPoint[] — last 50 data points (ring buffer)
 *   lastChecked:   Date|null
 *   createdAt:     Date
 * }
 *
 * CheckPoint: { timestamp: Date, ping: number|null, status: 'up'|'down' }
 */

export const INTERVAL_OPTIONS = [
  { label: '30s',  value: 30 },
  { label: '1m',   value: 60 },
  { label: '5m',   value: 300 },
  { label: '15m',  value: 900 },
  { label: '30m',  value: 1800 },
  { label: '1hr',  value: 3600 },
];

export const ALERT_TYPES = ['Email', 'SMS', 'Webhook', 'None'];

/** Factory — creates a new monitor in PENDING state. */
export function createMonitor(data) {
  return {
    // TODO: replace with server-assigned ID on POST /api/monitors
    id: crypto.randomUUID(),
    label: (data.label || '').trim() || data.target.trim(),
    target: data.target.trim(),
    description: (data.description || '').trim(),
    interval: data.interval ?? 60,
    alertTypes: data.alertTypes?.length ? data.alertTypes : ['None'],
    tags: data.tags ?? [],
    status: 'pending',
    currentPing: null,
    uptimePercent: 100,
    history: [],
    lastChecked: null,
    createdAt: new Date(),
  };
}

export function formatInterval(seconds) {
  const opt = INTERVAL_OPTIONS.find(o => o.value === seconds);
  return opt ? opt.label : `${seconds}s`;
}

export function formatTimestamp(date) {
  if (!date) return 'Never';
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
