import express                from 'express';
import { join, dirname }      from 'node:path';
import { fileURLToPath }      from 'node:url';
import { sseHandler }         from './sse.js';
import { initScheduler }      from './scheduler.js';
import monitorsRouter         from './routes/monitors.js';
import settingsRouter         from './routes/settings.js';
import alertsRouter           from './routes/alerts.js';
import moduleInstancesRouter  from './routes/module-instances.js';
import { loadModules, registry } from './modules/registry.js';
import { initReportScheduler }  from './report-scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT ?? 3000;

const app = express();
app.use(express.json());

// Static frontend (built by `npm run build` at repo root → dist/ → copied to server/public/)
const PUBLIC_DIR = join(__dirname, '../public');
app.use(express.static(PUBLIC_DIR));

// ── Load modules (async dynamic imports) ──────────────────────────────────────
await loadModules();

// Mount per-module routers at /api/modules/:moduleId/...
for (const [id, def] of registry) {
  if (def.router) {
    app.use(`/api/modules/${id}`, def.router);
    console.log(`[modules] routes mounted: /api/modules/${id}`);
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

app.get('/api/events',          sseHandler);
app.use('/api/monitors',        monitorsRouter);
app.use('/api/settings',        settingsRouter);
app.use('/api/alerts',          alertsRouter);
app.use('/api/module-instances', moduleInstancesRouter);

// Fallback: let the React router handle all non-API paths
app.get('*', (_req, res) => {
  res.sendFile(join(PUBLIC_DIR, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[watchtower] server listening on http://localhost:${PORT}`);
  initScheduler();
  initReportScheduler();
});
