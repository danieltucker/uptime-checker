import express        from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sseHandler }   from './sse.js';
import { initScheduler } from './scheduler.js';
import monitorsRouter   from './routes/monitors.js';
import settingsRouter   from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT ?? 3000;

const app = express();
app.use(express.json());

// Static frontend (built by `npm run build` at repo root → dist/ → copied to server/public/)
const PUBLIC_DIR = join(__dirname, '../public');
app.use(express.static(PUBLIC_DIR));

// ── API ───────────────────────────────────────────────────────────────────────

// Real-time check results pushed to connected browsers
app.get('/api/events', sseHandler);

// Monitor CRUD + manual trigger
app.use('/api/monitors', monitorsRouter);

// Alert channel configuration
app.use('/api/settings', settingsRouter);

// Fallback: let the React router handle all non-API paths
app.get('*', (_req, res) => {
  res.sendFile(join(PUBLIC_DIR, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[watchtower] server listening on http://localhost:${PORT}`);
  initScheduler(); // restore persisted monitors and begin polling
});
