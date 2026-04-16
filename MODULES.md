# WatchTower Module System

Modules extend WatchTower beyond uptime monitoring. Each module renders as a card in the main dashboard grid and can fetch data from any external API on a configurable interval.

Two bundled modules ship with v4.4.0:
- **Claude API Usage** - Anthropic token usage and costs
- **Cloudflare Analytics** - requests, pageviews, visitors, and bandwidth per zone

---

## Using modules

### Add credentials

Open **Settings > Modules**. Each installed module shows its credential fields. Fill them in and click **Save credentials**. Credentials are stored in the SQLite `settings` table under a namespaced key (`module.<id>.<field>`).

### Add a card to the dashboard

In **Settings > Modules**, click **Add card** under the module you want. Fill in a label and any instance-specific config (e.g. a Cloudflare Zone ID), then click **Add to dashboard**. The card appears in the **Modules** section below the main monitor grid.

### Edit or remove a card

- **Edit** - click the pencil icon on the card header to open the instance form
- **Remove** - click the trash icon on the card, or use the instance list in Settings > Modules

---

## Building a module

A module is two files in matching directories:

```
server/src/modules/your-module/
  index.js      ← backend: Express routes + module metadata

src/modules/your-module/
  index.jsx     ← frontend: React card component + module metadata
```

Restart the dev server after adding the files. The backend registry auto-discovers all subdirectories; the frontend registry uses Vite's `import.meta.glob` to pick up new modules automatically.

---

## Backend module contract

`server/src/modules/your-module/index.js`

```js
import { Router } from 'express';
import got        from 'got';
import { getSetting, db } from '../../db/index.js';

const router = Router();

// Data endpoint — called by the frontend card on its polling interval
// GET /api/modules/your-module/data?instanceId=:id
router.get('/data', async (req, res) => {
  // Read global credentials
  const apiKey = getSetting('module.your-module.api_key');
  if (!apiKey) return res.status(400).json({ error: 'API key not configured' });

  // Read per-instance config (zone ID, account ID, etc.)
  const { instanceId } = req.query;
  const row    = db.prepare('SELECT config FROM module_instances WHERE id = ?').get(instanceId);
  const config = JSON.parse(row?.config || '{}');

  try {
    const response = await got('https://api.example.com/data', {
      headers:      { Authorization: `Bearer ${apiKey}` },
      responseType: 'json',
      timeout:      { request: 15_000 },
    });
    // Return whatever shape your frontend Card component expects
    res.json({ value: response.body.value });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default {
  id:          'your-module',          // must match directory name
  name:        'Your Module',          // display name
  version:     '1.0.0',
  description: 'One-line description shown in Settings.',
  icon:        'IconName',             // lucide-react icon name (resolved by frontend)

  // Global credential fields — shared across all instances of this module
  settingsSchema: [
    {
      key:         'api_key',
      label:       'API Key',
      type:        'password',          // 'text' | 'password'
      required:    true,
      placeholder: 'sk-...',
      hint:        'Where to find this key.',
    },
  ],

  // Per-instance config fields — filled in when adding a card
  instanceConfigSchema: [
    {
      key:         'accountId',
      label:       'Account ID',
      type:        'text',
      required:    true,
      placeholder: 'xxxxxxxx',
      hint:        'Found on your account overview page.',
    },
  ],

  router,   // Express Router — mounted at /api/modules/your-module/
};
```

### Available helpers

```js
import { getSetting, setSetting, db } from '../../db/index.js';

getSetting('module.your-module.api_key')   // → string, '' if not set
getSetting('module.your-module.api_key', 'default')

// db is the raw better-sqlite3 instance for ad-hoc queries
const row = db.prepare('SELECT config FROM module_instances WHERE id = ?').get(instanceId);
```

---

## Frontend module contract

`src/modules/your-module/index.jsx`

```jsx
import React from 'react';
import { SomeIcon } from 'lucide-react';

// Your card receives these props every time data is fetched:
//   data     — the JSON returned by your backend /data endpoint, or null
//   loading  — true on the initial fetch
//   error    — error message string if the fetch failed, otherwise null
//   instance — the full module instance object (label, config, tags, interval…)
//   t        — WatchTower theme token object
//   isDark   — boolean

function YourCard({ data, loading, error, instance, t, isDark }) {
  if (loading) return <div style={{ color: t.textMuted }}>Loading…</div>;
  if (error)   return <div className="text-red-400 text-xs font-mono">{error}</div>;
  if (!data)   return null;

  return (
    <div>
      <div className="text-2xl font-mono font-bold" style={{ color: t.textPrimary }}>
        {data.value}
      </div>
    </div>
  );
}

export default {
  id:          'your-module',     // must match backend id
  name:        'Your Module',
  icon:        SomeIcon,          // lucide-react component (not a string)
  description: 'One-line description.',
  minSize:     { cols: 1, rows: 1 },
  Card:        YourCard,
};
```

### Theme tokens

The `t` object provides these keys:

| Token            | Use                                  |
|------------------|--------------------------------------|
| `t.pageBg`       | Page background                      |
| `t.cardBg`       | Card background                      |
| `t.cardBorder`   | Card border color                    |
| `t.inputBg`      | Input field background               |
| `t.textPrimary`  | Primary text                         |
| `t.textSecondary`| Secondary text                       |
| `t.textMuted`    | Muted / label text                   |
| `t.textFaint`    | Very subtle text (timestamps, hints) |
| `t.tagBg`        | Tag pill background                  |
| `t.metricGap`    | Divider / separator color            |
| `t.tooltipBg`    | Recharts tooltip background          |
| `t.tooltipBorder`| Recharts tooltip border              |

---

## Module instance object

The `instance` prop passed to your Card contains:

```js
{
  id:          string,    // UUID
  moduleId:    string,    // matches your module's id
  label:       string,    // user-defined display name
  description: string,
  interval:    number,    // seconds between data fetches
  tags:        string[],
  alertTypes:  string[],
  config:      object,    // instance-specific config from instanceConfigSchema
  colSpan:     1 | 2,
  enabled:     boolean,
  createdAt:   string,
}
```

---

## Module API routes

Your module's Express router is mounted at `/api/modules/<your-module-id>/`. Add as many endpoints as you need:

```js
router.get('/data',    handler);   // → /api/modules/your-module/data
router.get('/history', handler);   // → /api/modules/your-module/history
router.post('/action', handler);   // → /api/modules/your-module/action
```

The `ModuleCard` component always calls `GET /api/modules/<moduleId>/data?instanceId=<id>` for the polling interval. Additional endpoints are yours to use however the card needs.

---

## Checklist for a new module

- [ ] `server/src/modules/your-module/index.js` — backend definition + router
- [ ] `src/modules/your-module/index.jsx` — frontend definition + Card component
- [ ] `id` matches in both files and equals the directory name
- [ ] Backend `settingsSchema` matches what `getSetting('module.<id>.<key>')` reads
- [ ] `instanceConfigSchema` covers any per-card config your `/data` handler reads from `instance.config`
- [ ] `/data` endpoint returns a consistent shape your Card handles (including `loading` and `error` states)
- [ ] Restart the dev server — the module appears in Settings > Modules automatically
