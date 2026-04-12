import { Router }                       from 'express';
import { randomUUID }                   from 'node:crypto';
import { db, rowToMonitor }             from '../db/index.js';
import { scheduleMonitor, stopMonitor,
         executeCheck }                 from '../scheduler.js';
import { broadcast }                    from '../sse.js';

const router = Router();

// ── Window config ─────────────────────────────────────────────────────────────
// lookback: SQLite datetime modifier
// bucketMinutes: null = return raw points; number = aggregate into N-min buckets

const WINDOWS = {
  '1h':  { lookback: '-1 hour',   bucketMinutes: null },
  '12h': { lookback: '-12 hours', bucketMinutes: 15   },
  '1d':  { lookback: '-1 day',    bucketMinutes: 60   },
  '1w':  { lookback: '-7 days',   bucketMinutes: 360  },
};

// ── Windowed history query ────────────────────────────────────────────────────

function getWindowedHistory(monitorId, window) {
  const cfg = WINDOWS[window] ?? WINDOWS['1h'];

  const rows = db.prepare(`
    SELECT checked_at, status, total_ms, dns_ms, tcp_ms, tls_ms,
           ttfb_ms, http_status, cert_days, error
    FROM   check_history
    WHERE  monitor_id = ? AND checked_at >= datetime('now', ?)
    ORDER  BY checked_at ASC
  `).all(monitorId, cfg.lookback);

  if (!cfg.bucketMinutes) {
    // Return raw points for the 1h window
    return rows.map(r => ({
      timestamp:  r.checked_at,
      ping:       r.total_ms,
      status:     r.status,
      dnsMs:      r.dns_ms,
      tcpMs:      r.tcp_ms,
      tlsMs:      r.tls_ms,
      ttfbMs:     r.ttfb_ms,
      httpStatus: r.http_status,
      certDays:   r.cert_days,
      error:      r.error,
    }));
  }

  // Bucket-aggregate in JS for longer windows
  const bucketMs = cfg.bucketMinutes * 60 * 1000;
  const buckets  = new Map();

  for (const r of rows) {
    const ts    = new Date(r.checked_at).getTime();
    const bKey  = Math.floor(ts / bucketMs) * bucketMs;
    if (!buckets.has(bKey)) buckets.set(bKey, { ts: bKey, pings: [], statuses: [] });
    const b = buckets.get(bKey);
    if (r.total_ms != null) b.pings.push(r.total_ms);
    b.statuses.push(r.status);
  }

  return [...buckets.values()]
    .sort((a, b) => a.ts - b.ts)
    .map(b => ({
      timestamp:  new Date(b.ts).toISOString(),
      ping:       b.pings.length
        ? Math.round(b.pings.reduce((s, v) => s + v, 0) / b.pings.length)
        : null,
      status:     b.statuses.some(s => s === 'down') ? 'down' : 'up',
      aggregated: true,
      uptimePct:  b.statuses.length
        ? Math.round((b.statuses.filter(s => s === 'up').length / b.statuses.length) * 100)
        : 100,
    }));
}

// ── Build full monitor payload ─────────────────────────────────────────────────

function buildMonitorPayload(id, window = '1h') {
  const row = db.prepare('SELECT * FROM monitors WHERE id = ?').get(id);
  if (!row) return null;

  const monitor = rowToMonitor(row);
  const history = getWindowedHistory(id, window);

  // Uptime% calculated from the windowed history
  const upCount       = history.filter(r => r.status === 'up').length;
  const uptimePercent = history.length
    ? Math.round((upCount / history.length) * 1000) / 10
    : 100;

  // Always use the most recent raw check for current ping, last-checked, and
  // the timing breakdown row shown beneath the card header
  const latestRaw = db.prepare(`
    SELECT checked_at, status, total_ms, dns_ms, tcp_ms, tls_ms,
           ttfb_ms, http_status, cert_days
    FROM   check_history
    WHERE  monitor_id = ?
    ORDER  BY checked_at DESC
    LIMIT  1
  `).get(id);

  return {
    ...monitor,
    status:        latestRaw?.status      ?? 'pending',
    currentPing:   latestRaw?.total_ms    ?? null,
    uptimePercent,
    lastChecked:   latestRaw?.checked_at  ?? null,
    historyWindow: window,
    latest: latestRaw ? {
      dnsMs:      latestRaw.dns_ms,
      tcpMs:      latestRaw.tcp_ms,
      tlsMs:      latestRaw.tls_ms,
      ttfbMs:     latestRaw.ttfb_ms,
      totalMs:    latestRaw.total_ms,
      httpStatus: latestRaw.http_status,
      certDays:   latestRaw.cert_days,
    } : null,
    history,
  };
}

// ── GET /api/monitors ─────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const window = WINDOWS[req.query.window] ? req.query.window : '1h';
  const ids    = db.prepare('SELECT id FROM monitors ORDER BY created_at ASC').all();
  res.json(ids.map(r => buildMonitorPayload(r.id, window)));
});

// ── GET /api/monitors/:id ─────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const window  = WINDOWS[req.query.window] ? req.query.window : '1h';
  const payload = buildMonitorPayload(req.params.id, window);
  if (!payload) return res.status(404).json({ error: 'Monitor not found' });
  res.json(payload);
});

// ── POST /api/monitors ────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  const {
    label, target, description = '', interval = 60,
    alertTypes = ['None'], tags = [], checkType = 'http', port,
  } = req.body;

  if (!target?.trim()) return res.status(400).json({ error: '`target` is required' });

  const id = randomUUID();

  db.prepare(`
    INSERT INTO monitors
      (id, label, target, description, interval, alert_types, tags, check_type, port, created_at)
    VALUES
      (@id, @label, @target, @description, @interval, @alertTypes, @tags, @checkType, @port, @createdAt)
  `).run({
    id,
    label:       (label || target).trim(),
    target:      target.trim(),
    description: description.trim(),
    interval,
    alertTypes:  JSON.stringify(alertTypes),
    tags:        JSON.stringify(tags),
    checkType,
    port:        port ?? null,
    createdAt:   new Date().toISOString(),
  });

  scheduleMonitor(id, interval);

  res.status(201).json(buildMonitorPayload(id));
});

// ── PUT /api/monitors/:id ─────────────────────────────────────────────────────

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM monitors WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Monitor not found' });

  const {
    label, target, description, interval,
    alertTypes, tags, checkType, port,
  } = req.body;

  const next = {
    label:       label       ?? existing.label,
    target:      target      ?? existing.target,
    description: description ?? existing.description,
    interval:    interval    ?? existing.interval,
    alertTypes:  JSON.stringify(alertTypes ?? JSON.parse(existing.alert_types)),
    tags:        JSON.stringify(tags       ?? JSON.parse(existing.tags)),
    checkType:   checkType   ?? existing.check_type,
    port:        port        ?? existing.port,
  };

  db.prepare(`
    UPDATE monitors SET
      label = @label, target = @target, description = @description,
      interval = @interval, alert_types = @alertTypes, tags = @tags,
      check_type = @checkType, port = @port
    WHERE id = @id
  `).run({ ...next, id });

  scheduleMonitor(id, next.interval);

  res.json(buildMonitorPayload(id));
});

// ── DELETE /api/monitors/:id ──────────────────────────────────────────────────

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!db.prepare('SELECT id FROM monitors WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  stopMonitor(id);
  db.prepare('DELETE FROM monitors WHERE id = ?').run(id);
  broadcast('monitor:deleted', { id });

  res.status(204).end();
});

// ── POST /api/monitors/:id/check — manual trigger ─────────────────────────────

router.post('/:id/check', async (req, res) => {
  const row = db.prepare('SELECT * FROM monitors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Monitor not found' });

  const result = await executeCheck(rowToMonitor(row));
  res.json(result);
});

export default router;
