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
 */

import got        from 'got';
import sslChecker from 'ssl-checker';

const safe = (v) =>
  v != null && !Number.isNaN(v) ? Math.round(v) : null;

export async function httpCheck(target) {
  const url     = /^https?:\/\//i.test(target) ? target : `https://${target}`;
  const isHttps = url.startsWith('https://');
  let hostname;
  try { hostname = new URL(url).hostname; } catch {
    return { status: 'down', error: `Invalid URL: ${url}` };
  }

  // Kick off SSL cert check in parallel — it's best-effort, never blocks the ping
  const certPromise = isHttps
    ? sslChecker(hostname, { port: 443 })
        .then(s => s.daysRemaining)
        .catch(() => null)
    : Promise.resolve(null);

  try {
    const [response, certDays] = await Promise.all([
      got(url, {
        timeout:          { request: 10_000 },
        followRedirect:   true,
        throwHttpErrors:  false,
        headers:          { 'User-Agent': 'WatchTower/2.0 uptime-monitor' },
      }),
      certPromise,
    ]);

    const p = response.timings.phases;

    return {
      status:     response.statusCode < 400 ? 'up' : 'down',
      totalMs:    safe(p.total),
      dnsMs:      safe(p.dns),
      tcpMs:      safe(p.tcp),
      tlsMs:      safe(p.tls),      // null for plain HTTP
      ttfbMs:     safe(p.firstByte),
      httpStatus: response.statusCode,
      certDays,
    };
  } catch (err) {
    // got throws on network-level failure (ECONNREFUSED, timeout, etc.)
    return { status: 'down', error: err.message };
  }
}
