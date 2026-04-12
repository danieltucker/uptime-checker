import { Router }                       from 'express';
import { randomUUID }                   from 'node:crypto';
import { db, rowToMonitor }             from '../db/index.js';
import { scheduleMonitor, stopMonitor,
         executeCheck }                 from '../scheduler.js';
import { broadcast }                    from '../sse.js';

const router = Router();

// ── Helper: build full monitor payload (with history + computed fields) ───────

function buildMonitorPayload(id) {
  const row = db.prepare('SELECT * FROM monitors WHERE id = ?').get(id);
  if (!row) return null;

  const monitor = rowToMonitor(row);

  // Last 50 checks, oldest-first (for the sparkline chart)
  const rows = db.prepare(`
    SELECT checked_at, status, total_ms, dns_ms, tcp_ms, tls_ms,
           ttfb_ms, http_status, cert_days, error
    FROM   check_history
    WHERE  monitor_id = ?
    ORDER  BY checked_at DESC
    LIMIT  50
  `).all(id).reverse();

  const latest    = rows.length ? rows[rows.length - 1] : null;
  const upCount   = rows.filter(r => r.status === 'up').length;

  return {
    ...monitor,
    status:        latest?.status       ?? 'pending',
    currentPing:   latest?.total_ms     ?? null,
    uptimePercent: rows.length
      ? Math.round((upCount / rows.length) * 1000) / 10
      : 100,
    lastChecked:   latest?.checked_at   ?? null,
    latest: latest ? {
      dnsMs:      latest.dns_ms,
      tcpMs:      latest.tcp_ms,
      tlsMs:      latest.tls_ms,
      ttfbMs:     latest.ttfb_ms,
      totalMs:    latest.total_ms,
      httpStatus: latest.http_status,
      certDays:   latest.cert_days,
    } : null,
    history: rows.map(r => ({
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
    })),
  };
}

// ── GET /api/monitors ─────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  const ids = db.prepare('SELECT id FROM monitors ORDER BY created_at ASC').all();
  res.json(ids.map(r => buildMonitorPayload(r.id)));
});

// ── GET /api/monitors/:id ─────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const payload = buildMonitorPayload(req.params.id);
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

  // Restart with potentially new interval / target
  scheduleMonitor(id, next.interval);

  const payload = buildMonitorPayload(id);
  res.json(payload);
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
