import { Router }                               from 'express';
import { getSetting, setSetting, getAllSettings } from '../db/index.js';
import { sendTelegramAlert, sendEmailAlert,
         sendTwilioAlert }                        from '../alerter.js';

const router = Router();

const KNOWN_KEYS = [
  'telegram_enabled', 'telegram_token', 'telegram_chat_id',
  'email_enabled', 'email_smtp_host', 'email_smtp_port',
  'email_smtp_user', 'email_smtp_pass', 'email_from', 'email_to',
  'twilio_enabled', 'twilio_account_sid', 'twilio_auth_token',
  'twilio_from', 'twilio_to',
];

// ── GET /api/settings ─────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  const stored = getAllSettings();
  const result = {};
  for (const key of KNOWN_KEYS) result[key] = stored[key] ?? '';
  res.json(result);
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────

router.put('/', (req, res) => {
  for (const key of KNOWN_KEYS) {
    if (key in req.body) setSetting(key, req.body[key]);
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
      default:
        return res.status(400).json({ error: 'Unknown channel' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
