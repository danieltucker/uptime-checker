import { createHash } from 'node:crypto';
import { db }         from '../db/index.js';

export function requireApiKey(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';
  let raw = null;

  if (authHeader.startsWith('Bearer ')) {
    raw = authHeader.slice(7).trim();
  } else if (req.query.api_key) {
    raw = String(req.query.api_key).trim();
  }

  if (!raw) {
    return res.status(401).json({ error: 'API key required' });
  }

  const hash = createHash('sha256').update(raw).digest('hex');
  const row  = db.prepare('SELECT id FROM api_keys WHERE key_hash = ?').get(hash);

  if (!row) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(row.id);
  next();
}
