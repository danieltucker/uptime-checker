import { Router } from 'express';
import got        from 'got';
import { getSetting, db } from '../../db/index.js';

const router = Router();

// GET /api/modules/cloudflare-analytics/data?instanceId=:id
// Queries the Cloudflare GraphQL Analytics API for the zone configured
// on the given instance. Returns 7 days of daily traffic data.
router.get('/data', async (req, res) => {
  const apiToken = getSetting('module.cloudflare-analytics.api_token');
  if (!apiToken) return res.status(400).json({ error: 'API token not configured. Add your Cloudflare API token in Settings > Modules.' });

  const { instanceId } = req.query;
  if (!instanceId) return res.status(400).json({ error: 'instanceId is required' });

  const row = db.prepare('SELECT config FROM module_instances WHERE id = ?').get(instanceId);
  if (!row) return res.status(404).json({ error: 'Instance not found' });

  let config;
  try { config = JSON.parse(row.config); } catch { config = {}; }

  const { zoneId } = config;
  if (!zoneId) return res.status(400).json({ error: 'Zone ID not configured. Edit the module instance to add a Zone ID.' });

  // Build a 7-day date range
  const until = new Date();
  const since = new Date(until - 7 * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().split('T')[0];
  const untilDate = until.toISOString().split('T')[0];

  const query = `{
    viewer {
      zones(filter: { zoneTag: "${zoneId}" }) {
        httpRequests1dGroups(
          limit: 8
          filter: { date_geq: "${sinceDate}", date_leq: "${untilDate}" }
          orderBy: [date_ASC]
        ) {
          dimensions { date }
          sum { requests pageViews bytes }
          uniq { uniques }
        }
      }
    }
  }`;

  try {
    const response = await got.post('https://api.cloudflare.com/client/v4/graphql', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type':  'application/json',
      },
      json:            { query },
      responseType:    'json',
      timeout:         { request: 15_000 },
    });

    if (response.body.errors?.length) {
      return res.status(502).json({ error: response.body.errors[0].message });
    }

    const zones = response.body?.data?.viewer?.zones;
    if (!zones?.length) return res.status(502).json({ error: 'Zone not found. Check your Zone ID.' });

    const groups = zones[0].httpRequests1dGroups ?? [];
    const history = groups.map(g => ({
      date:      g.dimensions.date,
      requests:  g.sum.requests,
      pageViews: g.sum.pageViews,
      bytes:     g.sum.bytes,
      uniques:   g.uniq?.uniques ?? 0,
    }));

    const totals = history.reduce((acc, d) => ({
      requests:  acc.requests  + d.requests,
      pageViews: acc.pageViews + d.pageViews,
      bytes:     acc.bytes     + d.bytes,
      uniques:   acc.uniques   + d.uniques,
    }), { requests: 0, pageViews: 0, bytes: 0, uniques: 0 });

    res.json({ totals, history, sinceDate, untilDate });
  } catch (err) {
    const status = err.response?.statusCode ?? 502;
    res.status(status).json({ error: err.message });
  }
});

export default {
  id:          'cloudflare-analytics',
  name:        'Cloudflare Analytics',
  version:     '1.0.0',
  description: 'Track requests, pageviews, unique visitors, and bandwidth for a Cloudflare zone.',
  icon:        'Cloud',

  // Global credentials — one API token covers all zones / instances
  settingsSchema: [
    {
      key:         'api_token',
      label:       'API Token',
      type:        'password',
      required:    true,
      placeholder: 'your-cloudflare-api-token',
      hint:        'Create a token in the Cloudflare dashboard (My Profile > API Tokens) with Analytics:Read permission scoped to the zones you want to monitor.',
    },
  ],

  // Per-instance config — one instance per Cloudflare zone
  instanceConfigSchema: [
    {
      key:         'zoneId',
      label:       'Zone ID',
      type:        'text',
      required:    true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      hint:        'Found on the Overview page of your domain in the Cloudflare dashboard, in the right-hand sidebar.',
    },
  ],

  router,
};
