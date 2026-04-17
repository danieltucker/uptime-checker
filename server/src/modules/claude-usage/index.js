import { Router } from 'express';
import got        from 'got';
import { getSetting, db } from '../../db/index.js';

const router = Router();

// GET /api/modules/claude-usage/data?instanceId=:id
// Polls the Anthropic usage API and returns normalized spend + token data.
// Requires an Admin API key (Settings > API Keys in the Anthropic Console).
// Standard inference API keys do not have usage read permission.
router.get('/data', async (req, res) => {
  const apiKey = getSetting('module.claude-usage.api_key');
  if (!apiKey) return res.status(400).json({ error: 'API key not configured. Add your Anthropic Admin API key in Settings > Modules.' });

  try {
    // Build date range for the current calendar month (billing approximation).
    const now        = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const tomorrow     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    const params = new URLSearchParams({
      starting_at:  startOfMonth.toISOString().replace('.000Z', 'Z'),
      ending_at:    tomorrow.toISOString().replace('.000Z', 'Z'),
      bucket_width: '1d',
    });

    // Usage reporting endpoint — requires an Admin API key.
    // Docs: https://docs.anthropic.com/en/api/usage
    const response = await got(
      `https://api.anthropic.com/v1/organizations/usage_report/messages?${params}`,
      {
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        responseType: 'json',
        timeout: { request: 15_000 },
      }
    );

    const raw = response.body;

    // Normalize: aggregate across all daily buckets, grouped by model.
    // Field names from the reporting API:
    //   uncached_input_tokens, cached_input_tokens, cache_creation_input_tokens, output_tokens
    const byModel = {};
    let totalInputTokens  = 0;
    let totalOutputTokens = 0;

    for (const entry of raw.data ?? []) {
      const model = entry.model ?? 'unknown';
      if (!byModel[model]) byModel[model] = { model, input_tokens: 0, output_tokens: 0 };

      const inputTokens =
        (entry.uncached_input_tokens        ?? 0) +
        (entry.cached_input_tokens          ?? 0) +
        (entry.cache_creation_input_tokens  ?? 0);
      const outputTokens = entry.output_tokens ?? 0;

      byModel[model].input_tokens  += inputTokens;
      byModel[model].output_tokens += outputTokens;
      totalInputTokens  += inputTokens;
      totalOutputTokens += outputTokens;
    }

    const monthLabel = startOfMonth.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    res.json({
      period:              monthLabel,
      total_input_tokens:  totalInputTokens,
      total_output_tokens: totalOutputTokens,
      by_model:            Object.values(byModel).sort((a, b) => (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens)),
      raw_entry_count:     raw.data?.length ?? 0,
    });
  } catch (err) {
    const status = err.response?.statusCode ?? 502;
    const body   = err.response?.body;
    const msg    = (typeof body === 'object' ? body?.error?.message : null) ?? err.message;
    res.status(status).json({ error: msg });
  }
});

export default {
  id:          'claude-usage',
  name:        'Claude API Usage',
  version:     '1.0.0',
  description: 'Track Anthropic API token usage across models for the current billing period.',
  icon:        'BrainCircuit',   // lucide icon name resolved by the frontend registry

  // Global credentials — shared across all instances of this module
  settingsSchema: [
    {
      key:         'api_key',
      label:       'Admin API Key',
      type:        'password',
      required:    true,
      placeholder: 'sk-ant-admin01-...',
      hint:        'Requires an Admin API key from console.anthropic.com > Settings > API Keys. Standard inference keys do not have usage read access.',
    },
  ],

  // Per-instance config fields shown in the "Add instance" form
  instanceConfigSchema: [],

  router,
};
