/**
 * Scheduler — manages a setInterval per monitor.
 * Each tick fetches the latest monitor config from DB (so edits take effect
 * on the next check without restarting the server) then runs the appropriate
 * checker and persists + broadcasts the result.
 */

import { db, rowToMonitor } from './db/index.js';
import { runCheck }         from './checkers/index.js';
import { broadcast }        from './sse.js';

const timers = new Map(); // monitorId → NodeJS.Timer

// ── Core check execution ──────────────────────────────────────────────────────

export async function executeCheck(monitor) {
  const result    = await runCheck(monitor);
  const checkedAt = new Date().toISOString();

  // Persist result to check_history
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

  // Rolling uptime % from the last 50 results
  const history = db.prepare(`
    SELECT status FROM check_history
    WHERE monitor_id = ?
    ORDER BY checked_at DESC
    LIMIT 50
  `).all(monitor.id);

  const upCount      = history.filter(h => h.status === 'up').length;
  const uptimePercent = history.length
    ? Math.round((upCount / history.length) * 1000) / 10
    : 100;

  // Push real-time update to all connected browser clients via SSE
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
    // New history point to append on the client
    newPoint: {
      timestamp:  checkedAt,
      ping:       result.totalMs ?? null,
      status:     result.status,
    },
  });

  return result;
}

// ── Scheduling ────────────────────────────────────────────────────────────────

export function scheduleMonitor(id, intervalSeconds) {
  stopMonitor(id); // clear any existing timer

  const tick = async () => {
    // Re-fetch config each tick so edits (target, interval change, etc.) apply immediately
    const row = db.prepare('SELECT * FROM monitors WHERE id = ?').get(id);
    if (!row) { stopMonitor(id); return; } // deleted while running
    await executeCheck(rowToMonitor(row));
  };

  tick(); // immediate first check — card gets live data right away
  timers.set(id, setInterval(tick, intervalSeconds * 1000));
}

export function stopMonitor(id) {
  const timer = timers.get(id);
  if (timer) {
    clearInterval(timer);
    timers.delete(id);
  }
}

/** Called once at server startup — restores schedules for all persisted monitors. */
export function initScheduler() {
  const monitors = db.prepare('SELECT * FROM monitors').all().map(rowToMonitor);
  for (const m of monitors) {
    scheduleMonitor(m.id, m.interval);
  }
  console.log(`[scheduler] ${monitors.length} monitor(s) scheduled`);
}
