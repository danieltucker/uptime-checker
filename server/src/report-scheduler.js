/**
 * report-scheduler.js — Fires periodic status reports via email.
 *
 * Ticks every 60 s and checks whether the configured HH:MM time has been
 * reached and whether enough days have elapsed since the last send.
 *
 * Settings read from DB:
 *   report_enabled      '1' | ''
 *   report_interval     'daily' | 'weekly' | 'monthly'
 *   report_time         'HH:MM'  (24-hour, server local time)
 *   report_tag_filter   tag string | ''   (empty = all monitors)
 *   report_last_sent    ISO timestamp (written here after a successful send)
 */

import { getSetting, setSetting } from './db/index.js';
import { sendReport } from './reporter.js';

const INTERVAL_DAYS = {
  daily:   1,
  weekly:  7,
  monthly: 30,
};

export function initReportScheduler() {
  setInterval(tick, 60_000);
  console.log('[report-scheduler] started');
}

async function tick() {
  if (getSetting('report_enabled') !== '1') return;

  const intervalKey = getSetting('report_interval', 'weekly');
  const timeStr     = getSetting('report_time', '08:00');
  const days        = INTERVAL_DAYS[intervalKey] ?? 7;

  // Only fire at the configured HH:MM
  const now = new Date();
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return;
  if (now.getHours() !== hh || now.getMinutes() !== mm) return;

  // Require that at least (days - a small tolerance) have elapsed since last send
  const lastSent = getSetting('report_last_sent', '');
  if (lastSent) {
    const elapsed  = now.getTime() - new Date(lastSent).getTime();
    const required = (days * 24 * 60 * 60 * 1000) - (2 * 60 * 1000); // 2-min grace
    if (elapsed < required) return;
  }

  // Mark sent *before* the attempt to guard against double-sends when slow
  setSetting('report_last_sent', now.toISOString());

  // Compute the report window: [now - N days, now]
  const end   = new Date(now);
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

  try {
    await sendReport(LABELS[intervalKey] ?? 'Periodic', start.toISOString(), end.toISOString());
  } catch (err) {
    // Roll back so it can retry at the next matching minute
    setSetting('report_last_sent', lastSent);
    console.error('[report-scheduler] send failed:', err.message);
  }
}
