/**
 * Diagnostic tools — ping, DNS lookup, traceroute.
 * These are homelab tools, intentionally allowed to reach private IPs
 * (same policy as ICMP/TCP checkers; no data is exfiltrated).
 */

import { Router }    from 'express';
import { execFile }  from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, resolveMx, resolveTxt, resolveCname, resolveNs } from 'node:dns/promises';
import { icmpCheck } from '../checkers/icmp.js';

const router       = Router();
const execFileAsync = promisify(execFile);
const IS_WIN        = process.platform === 'win32';

// ── POST /api/tools/ping ──────────────────────────────────────────────────────

router.post('/ping', async (req, res) => {
  const { target } = req.body;
  if (!target?.trim()) return res.status(400).json({ error: 'target is required' });
  try {
    const result = await icmpCheck(target.trim());
    res.json(result);
  } catch (err) {
    res.json({ status: 'down', error: err.message });
  }
});

// ── POST /api/tools/dns ───────────────────────────────────────────────────────

router.post('/dns', async (req, res) => {
  const { domain } = req.body;
  if (!domain?.trim()) return res.status(400).json({ error: 'domain is required' });

  const d = domain.trim();
  const result = {};

  await Promise.allSettled([
    resolve(d, 'A')    .then(r => { result.A     = r; }).catch(() => {}),
    resolve(d, 'AAAA') .then(r => { result.AAAA  = r; }).catch(() => {}),
    resolveCname(d)    .then(r => { result.CNAME = r; }).catch(() => {}),
    resolveMx(d)       .then(r => { result.MX    = r; }).catch(() => {}),
    resolveNs(d)       .then(r => { result.NS    = r; }).catch(() => {}),
    resolveTxt(d)      .then(r => { result.TXT   = r; }).catch(() => {}),
  ]);

  const hasAny = Object.values(result).some(v => v?.length > 0);
  if (!hasAny) return res.json({ error: `No DNS records found for "${d}"` });

  res.json(result);
});

// ── POST /api/tools/traceroute ────────────────────────────────────────────────

router.post('/traceroute', async (req, res) => {
  const { target } = req.body;
  if (!target?.trim()) return res.status(400).json({ error: 'target is required' });

  const t = target.trim();

  try {
    let stdout;
    if (IS_WIN) {
      ({ stdout } = await execFileAsync('tracert', ['-d', '-h', '20', t], { timeout: 45_000 }));
    } else {
      ({ stdout } = await execFileAsync('traceroute', ['-n', '-m', '20', '-w', '3', t], { timeout: 45_000 }));
    }
    res.json({ hops: parseTraceroute(stdout, IS_WIN) });
  } catch (err) {
    // Non-zero exit still produces partial output (destination unreachable, etc.)
    if (err.stdout) {
      const hops = parseTraceroute(err.stdout, IS_WIN);
      if (hops.length > 0) return res.json({ hops });
    }
    res.json({ error: 'Traceroute failed or timed out', hops: [] });
  }
});

// ── Traceroute output parser ──────────────────────────────────────────────────

function parseTraceroute(stdout, isWin) {
  const hops = [];

  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(.*)/);
    if (!m) continue;

    const hop  = parseInt(m[1], 10);
    const rest = m[2].trim();

    if (isWin) {
      // "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
      // "  2     *        *        *     Request timed out."
      if (rest.toLowerCase().includes('timed out') || /^[*\s]+$/.test(rest)) {
        hops.push({ hop, address: null, times: null });
        continue;
      }
      const times    = [...rest.matchAll(/<?\s*(\d+)\s*ms/gi)].map(tm => parseInt(tm[1], 10));
      const words    = rest.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      const address  = /^[\d.]+$/.test(lastWord) || /^[a-f0-9:]+$/i.test(lastWord)
        ? lastWord : null;
      hops.push({ hop, address, times: times.length > 0 ? times : null });

    } else {
      // "  1  192.168.1.1  1.234 ms  1.123 ms  1.045 ms"
      // "  2  * * *"
      if (/^[*\s]+$/.test(rest)) {
        hops.push({ hop, address: null, times: null });
        continue;
      }
      const parts   = rest.split(/\s+/);
      const address = parts[0];
      const times   = [];
      for (let i = 1; i < parts.length - 1; i++) {
        if (parts[i + 1] === 'ms') {
          const val = parseFloat(parts[i]);
          if (!isNaN(val)) times.push(Math.round(val));
        }
      }
      hops.push({ hop, address, times: times.length > 0 ? times : null });
    }
  }

  return hops;
}

export default router;
