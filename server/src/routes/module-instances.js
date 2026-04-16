import { Router }      from 'express';
import { randomUUID }  from 'node:crypto';
import { db }          from '../db/index.js';
import { registry }    from '../modules/registry.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToInstance(row) {
  return {
    id:          row.id,
    moduleId:    row.module_id,
    label:       row.label,
    description: row.description,
    interval:    row.interval,
    tags:        JSON.parse(row.tags        || '[]'),
    alertTypes:  JSON.parse(row.alert_types || '["None"]'),
    config:      JSON.parse(row.config      || '{}'),
    position:    row.position,
    colSpan:     row.col_span,
    enabled:     row.enabled === 1,
    createdAt:   row.created_at,
  };
}

// ── GET /api/module-instances/available ───────────────────────────────────────
// List all registered module types with their schemas.

router.get('/available', (_req, res) => {
  const mods = [];
  for (const [, def] of registry) {
    mods.push({
      id:                   def.id,
      name:                 def.name,
      version:              def.version,
      description:          def.description,
      icon:                 def.icon,
      settingsSchema:       def.settingsSchema       ?? [],
      instanceConfigSchema: def.instanceConfigSchema ?? [],
    });
  }
  res.json(mods);
});

// ── GET /api/module-instances ─────────────────────────────────────────────────

router.get('/', (_req, res) => {
  const rows = db.prepare(
    'SELECT * FROM module_instances ORDER BY position ASC, created_at ASC'
  ).all();
  res.json(rows.map(rowToInstance));
});

// ── POST /api/module-instances ────────────────────────────────────────────────

router.post('/', (req, res) => {
  const {
    moduleId,
    label       = '',
    description = '',
    interval    = 3600,
    tags        = [],
    alertTypes  = ['None'],
    config      = {},
    colSpan     = 1,
  } = req.body;

  if (!moduleId)             return res.status(400).json({ error: 'moduleId is required' });
  if (!registry.has(moduleId)) return res.status(400).json({ error: `Unknown module: ${moduleId}` });

  const maxRow  = db.prepare('SELECT MAX(position) as m FROM module_instances').get();
  const position = (maxRow?.m ?? -1) + 1;
  const id       = randomUUID();

  db.prepare(`
    INSERT INTO module_instances
      (id, module_id, label, description, interval, tags, alert_types, config, position, col_span)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, moduleId, label, description, interval,
    JSON.stringify(tags), JSON.stringify(alertTypes),
    JSON.stringify(config), position, colSpan,
  );

  res.status(201).json(rowToInstance(
    db.prepare('SELECT * FROM module_instances WHERE id = ?').get(id)
  ));
});

// ── PUT /api/module-instances/:id ─────────────────────────────────────────────

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM module_instances WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const {
    label, description, interval, tags, alertTypes,
    config, colSpan, position, enabled,
  } = req.body;

  db.prepare(`
    UPDATE module_instances SET
      label = ?, description = ?, interval = ?, tags = ?, alert_types = ?,
      config = ?, col_span = ?, position = ?, enabled = ?
    WHERE id = ?
  `).run(
    label       ?? row.label,
    description ?? row.description,
    interval    ?? row.interval,
    JSON.stringify(tags       ?? JSON.parse(row.tags)),
    JSON.stringify(alertTypes ?? JSON.parse(row.alert_types)),
    JSON.stringify(config     ?? JSON.parse(row.config)),
    colSpan  ?? row.col_span,
    position ?? row.position,
    enabled !== undefined ? (enabled ? 1 : 0) : row.enabled,
    req.params.id,
  );

  res.json(rowToInstance(
    db.prepare('SELECT * FROM module_instances WHERE id = ?').get(req.params.id)
  ));
});

// ── DELETE /api/module-instances/:id ─────────────────────────────────────────

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM module_instances WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
