import { Router }                               from 'express';
import { getSetting, setSetting, getAllSettings } from '../db/index.js';
import { sendTelegramAlert, sendEmailAlert,
         sendTwilioAlert, sendWebhookAlert }      from '../alerter.js';
import { sendReport }                            from '../reporter.js';

const router = Router();

const KNOWN_KEYS = [
  'telegram_enabled', 'telegram_token', 'telegram_chat_id',
  'email_enabled', 'email_smtp_host', 'email_smtp_port',
  'email_smtp_user', 'email_smtp_pass', 'email_from', 'email_to',
  'twilio_enabled', 'twilio_account_sid', 'twilio_auth_token',
  'twilio_from', 'twilio_to',
  'webhook_enabled', 'webhook_url',
  'report_enabled', 'report_interval', 'report_time', 'report_tag_filter',
  'report_last_sent',
  'network_refs_enabled', 'network_refs_custom',
];

// ── GET /api/settings ─────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  const stored = getAllSettings();
  const result = {};
  for (const key of KNOWN_KEYS) result[key] = stored[key] ?? '';
  // Also return any module.* keys that exist in the DB
  for (const [key, value] of Object.entries(stored)) {
    if (key.startsWith('module.')) result[key] = value;
  }
  res.json(result);
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────

// report_last_sent is written by the report-scheduler only — never from the UI
const READ_ONLY_KEYS = new Set(['report_last_sent']);

router.put('/', (req, res) => {
  for (const key of KNOWN_KEYS) {
    if (READ_ONLY_KEYS.has(key)) continue;
    if (key in req.body) setSetting(key, req.body[key]);
  }
  // Also persist any module.* keys
  for (const [key, value] of Object.entries(req.body)) {
    if (key.startsWith('module.')) setSetting(key, value);
  }
  res.json({ ok: true });
});

// ── POST /api/settings/test/:channel ─────────────────────────────────────────
// Accepts credentials directly in the body so the user can test before saving.

const TEST_MONITOR = { id: 'test', label: 'Test Monitor', target: 'watchtower.test', alertTypes: [] };

router.post('/test/:channel', async (req, res) => {
  const overrides = req.body ?? {};
  try {
    switch (req.params.channel) {
      case 'telegram':
        await sendTelegramAlert(TEST_MONITOR, 'down', overrides);
        break;
      case 'email':
        await sendEmailAlert(TEST_MONITOR, 'down', overrides);
        break;
      case 'twilio':
        await sendTwilioAlert(TEST_MONITOR, 'down', overrides);
        break;
      case 'webhook':
        await sendWebhookAlert(TEST_MONITOR, 'down', overrides);
        break;
      case 'report': {
        const end   = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        await sendReport('Test', start.toISOString(), end.toISOString());
        break;
      }
      default:
        return res.status(400).json({ error: 'Unknown channel' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
