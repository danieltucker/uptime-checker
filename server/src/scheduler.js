/**
 * Scheduler — manages a setInterval per monitor.
 * Each tick fetches the latest monitor config from DB (so edits take effect
 * on the next check without restarting the server) then runs the appropriate
 * checker and persists + broadcasts the result.
 *
 * Alert state is tracked in memory. On server startup it is seeded from the
 * last known check result so a restart doesn't re-fire stale alerts.
 */

import { db, rowToMonitor } from './db/index.js';
import { runCheck }         from './checkers/index.js';
import { broadcast }        from './sse.js';
import { dispatchAlerts }   from './alerter.js';

const timers      = new Map(); // monitorId → NodeJS.Timer
const alertStates = new Map(); // monitorId → 'up' | 'down' | null

// ── Core check execution ──────────────────────────────────────────────────────

export async function executeCheck(monitor) {
  const result    = await runCheck(monitor);
  const checkedAt = new Date().toISOString();

  // Persist result
  db.prepare(`
    INSERT INTO check_history
      (monitor_id, checked_at, status, total_ms, dns_ms, tcp_ms,
       tls_ms, ttfb_ms, http_status, cert_days, error)
    VALUES
      (@monitorId, @checkedAt, @status, @totalMs, @dnsMs, @tcpMs,
       @tlsMs, @ttfbMs, @httpStatus, @certDays, @error)
  `).run({
    monitorId:  monitor.id,
    checkedAt,
    status:     result.status,
    totalMs:    result.totalMs    ?? null,
    dnsMs:      result.dnsMs      ?? null,
    tcpMs:      result.tcpMs      ?? null,
    tlsMs:      result.tlsMs      ?? null,
    ttfbMs:     result.ttfbMs     ?? null,
    httpStatus: result.httpStatus ?? null,
    certDays:   result.certDays   ?? null,
    error:      result.error      ?? null,
  });

  // Rolling uptime % from the last 50 results (used for SSE payload)
  const history = db.prepare(`
    SELECT status FROM check_history
    WHERE monitor_id = ?
    ORDER BY checked_at DESC
    LIMIT 50
  `).all(monitor.id);

  const upCount       = history.filter(h => h.status === 'up').length;
  const uptimePercent = history.length
    ? Math.round((upCount / history.length) * 1000) / 10
    : 100;

  // Alert dispatch — fire on first DOWN, fire again on RECOVERY
  const prev = alertStates.get(monitor.id);
  if (result.status === 'down' && prev !== 'down') {
    dispatchAlerts(monitor, 'down').catch(console.error);
  } else if (result.status === 'up' && prev === 'down') {
    dispatchAlerts(monitor, 'recovered').catch(console.error);
  }
  alertStates.set(monitor.id, result.status);

  // Push real-time update to all connected browsers
  broadcast('monitor:checked', {
    id:           monitor.id,
    status:       result.status,
    currentPing:  result.totalMs ?? null,
    uptimePercent,
    lastChecked:  checkedAt,
    latest: {
      dnsMs:      result.dnsMs      ?? null,
      tcpMs:      result.tcpMs      ?? null,
      tlsMs:      result.tlsMs      ?? null,
      ttfbMs:     result.ttfbMs     ?? null,
      totalMs:    result.totalMs    ?? null,
      httpStatus: result.httpStatus ?? null,
      certDays:   result.certDays   ?? null,
    },
    newPoint: {
      timestamp: checkedAt,
      ping:      result.totalMs ?? null,
      status:    result.status,
    },
  });

  return result;
}

// ── Scheduling ────────────────────────────────────────────────────────────────

export function scheduleMonitor(id, intervalSeconds) {
  stopMonitor(id);

  const tick = async () => {
    const row = db.prepare('SELECT * FROM monitors WHERE id = ?').get(id);
    if (!row) { stopMonitor(id); return; }
    await executeCheck(rowToMonitor(row));
  };

  tick();
  timers.set(id, setInterval(tick, intervalSeconds * 1000));
}

export function stopMonitor(id) {
  const timer = timers.get(id);
  if (timer) { clearInterval(timer); timers.delete(id); }
}

/** Restore schedules on startup. Seeds alert state from last known check so
 *  a server restart doesn't re-trigger alerts for already-down monitors. */
export function initScheduler() {
  const monitors = db.prepare('SELECT * FROM monitors').all().map(rowToMonitor);
  for (const m of monitors) {
    const last = db.prepare(`
      SELECT status FROM check_history
      WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 1
    `).get(m.id);
    alertStates.set(m.id, last?.status ?? null);
    scheduleMonitor(m.id, m.interval);
  }
  console.log(`[scheduler] ${monitors.length} monitor(s) scheduled`);
}
