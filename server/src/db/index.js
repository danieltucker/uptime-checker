import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolves to /app/data in Docker (volume mount), or server/data in dev
const DATA_DIR = join(__dirname, '../../../data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'watchtower.db'));

// WAL mode: faster concurrent reads, no blocking writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS monitors (
    id          TEXT    PRIMARY KEY,
    label       TEXT    NOT NULL,
    target      TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    interval    INTEGER NOT NULL DEFAULT 60,
    alert_types TEXT    NOT NULL DEFAULT '["None"]',  -- JSON array
    tags        TEXT    NOT NULL DEFAULT '[]',          -- JSON array
    check_type  TEXT    NOT NULL DEFAULT 'http',        -- 'http' | 'tcp' | 'icmp'
    port        INTEGER,                                -- required for tcp checks
    created_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS check_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    monitor_id  TEXT    NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    checked_at  TEXT    NOT NULL,
    status      TEXT    NOT NULL,  -- 'up' | 'down'
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
`);

// ── Row → JS object ───────────────────────────────────────────────────────────
export function rowToMonitor(row) {
  return {
    id:          row.id,
    label:       row.label,
    target:      row.target,
    description: row.description,
    interval:    row.interval,
    alertTypes:  JSON.parse(row.alert_types),
    tags:        JSON.parse(row.tags),
    checkType:   row.check_type,
    port:        row.port ?? null,
    createdAt:   row.created_at,
  };
}

export { db };
