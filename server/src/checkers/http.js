/**
 * HTTP/HTTPS checker — uses `got` for the request (exposes per-phase timing)
 * and `ssl-checker` for TLS certificate expiry (runs in parallel).
 *
 * Returned timing fields map directly to got's timings.phases object:
 *   dns    → DNS lookup
 *   tcp    → TCP handshake
 *   tls    → TLS negotiation  (null for plain HTTP)
 *   ttfb   → time to first byte
 *   total  → wall-clock total
 *
 * Body matching:
 *   When bodyMatch is provided, the response body is checked (case-insensitive)
 *   for the literal string. A non-match is treated as DOWN regardless of HTTP
 *   status. Responses over BODY_SIZE_LIMIT are aborted and also treated as DOWN
 *   when bodyMatch is configured, preventing memory exhaustion from large payloads.
 */

import got        from 'got';
import sslChecker from 'ssl-checker';

const BODY_SIZE_LIMIT = 256 * 1024; // 256 KB

const safe = (v) =>
  v != null && !Number.isNaN(v) ? Math.round(v) : null;

export async function httpCheck(target, bodyMatch = null) {
  const url     = /^https?:\/\//i.test(target) ? target : `https://${target}`;
  const isHttps = url.startsWith('https://');
  let hostname;
  try { hostname = new URL(url).hostname; } catch {
    return { status: 'down', error: `Invalid URL: ${url}` };
  }

  // Kick off SSL cert check in parallel — best-effort, never blocks the ping
  const certPromise = isHttps
    ? sslChecker(hostname, { port: 443 })
        .then(s => s.daysRemaining)
        .catch(() => null)
    : Promise.resolve(null);

  let response;
  let bodyTruncated = false;

  try {
    response = await got(url, {
      timeout:          { request: 10_000 },
      followRedirect:   true,
      throwHttpErrors:  false,
      ...(bodyMatch?.trim() ? { maxResponseSize: BODY_SIZE_LIMIT } : {}),
      headers:          { 'User-Agent': 'WatchTower/4.0 uptime-monitor' },
    });
  } catch (err) {
    // got throws ERR_BODY_OVERFLOW when maxResponseSize is exceeded (only set
    // when bodyMatch is active). The partial response is on err.response.
    if (err.code === 'ERR_BODY_OVERFLOW' && err.response) {
      response      = err.response;
      bodyTruncated = true;
    } else {
      // Network failure (ECONNREFUSED, timeout, DNS failure, etc.)
      return { status: 'down', error: err.message };
    }
  }

  const certDays = await certPromise;
  const p = response.timings?.phases ?? {};

  const base = {
    totalMs:    safe(p.total),
    dnsMs:      safe(p.dns),
    tcpMs:      safe(p.tcp),
    tlsMs:      safe(p.tls),
    ttfbMs:     safe(p.firstByte),
    httpStatus: response.statusCode,
    certDays,
  };

  // ── Body match check ─────────────────────────────────────────────────────────
  if (bodyMatch?.trim()) {
    if (bodyTruncated) {
      return {
        ...base,
        status: 'down',
        error:  `Response too large to check (>${BODY_SIZE_LIMIT / 1024}KB limit)`,
      };
    }
    const needle   = bodyMatch.trim().toLowerCase();
    const haystack = (response.body ?? '').toLowerCase();
    if (!haystack.includes(needle)) {
      return {
        ...base,
        status: 'down',
        error:  `Expected "${bodyMatch.trim()}" not found in response body`,
      };
    }
  }

  return {
    ...base,
    status: response.statusCode < 400 ? 'up' : 'down',
  };
}
