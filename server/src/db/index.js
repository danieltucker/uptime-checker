import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../../data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'watchtower.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS monitors (
    id                 TEXT    PRIMARY KEY,
    label              TEXT    NOT NULL,
    target             TEXT    NOT NULL,
    description        TEXT    NOT NULL DEFAULT '',
    interval           INTEGER NOT NULL DEFAULT 60,
    alert_types        TEXT    NOT NULL DEFAULT '["None"]',
    tags               TEXT    NOT NULL DEFAULT '[]',
    check_type         TEXT    NOT NULL DEFAULT 'http',
    port               INTEGER,
    created_at         TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS check_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    monitor_id  TEXT    NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    checked_at  TEXT    NOT NULL,
    status      TEXT    NOT NULL,
    total_ms    INTEGER,
    dns_ms      INTEGER,
    tcp_ms      INTEGER,
    tls_ms      INTEGER,
    ttfb_ms     INTEGER,
    http_status INTEGER,
    cert_days   INTEGER,
    error       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_history_monitor
    ON check_history (monitor_id, checked_at DESC);

  CREATE TABLE IF NOT EXISTS alerts (
    id               TEXT    PRIMARY KEY,
    monitor_id       TEXT    NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    type             TEXT    NOT NULL,
    started_at       TEXT    NOT NULL,
    last_occurred_at TEXT    NOT NULL,
    resolved_at      TEXT,
    dismissed_at     TEXT,
    notified_at      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_alerts_monitor
    ON alerts (monitor_id, started_at DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`);

// ── Migrations for existing databases ─────────────────────────────────────────
for (const sql of [
  `ALTER TABLE monitors ADD COLUMN degraded_threshold INTEGER`,
  `ALTER TABLE monitors ADD COLUMN alert_config TEXT NOT NULL DEFAULT '{}'`,
]) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

// ── Row → JS object ───────────────────────────────────────────────────────────
export function rowToMonitor(row) {
  return {
    id:               row.id,
    label:            row.label,
    target:           row.target,
    description:      row.description,
    interval:         row.interval,
    alertTypes:       JSON.parse(row.alert_types),
    tags:             JSON.parse(row.tags),
    checkType:        row.check_type,
    port:             row.port             ?? null,
    degradedThreshold: row.degraded_threshold ?? null,
    alertConfig:      row.alert_config      ?? '{}',
    createdAt:        row.created_at,
  };
}

export function rowToAlert(row) {
  return {
    id:             row.id,
    monitorId:      row.monitor_id,
    monitorLabel:   row.monitor_label  ?? null,
    target:         row.monitor_target ?? null,
    type:           row.type,
    startedAt:      row.started_at,
    lastOccurredAt: row.last_occurred_at,
    resolvedAt:     row.resolved_at  ?? null,
    dismissedAt:    row.dismissed_at ?? null,
  };
}

// ── Settings helpers ──────────────────────────────────────────────────────────
export function getSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value ?? ''));
}

export function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export { db };
