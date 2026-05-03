/**
 * TCP checker — attempts a raw TCP connection to host:port.
 * No data is sent; we just measure how long the three-way handshake takes.
 * No special OS capabilities required.
 */

import { createConnection } from 'node:net';
import { assertNotSsrfTarget } from './ssrf-guard.js';

const TIMEOUT_MS = 5_000;

export async function tcpCheck(host, port) {
  try {
    await assertNotSsrfTarget(host);
  } catch (err) {
    return { status: 'down', error: err.message };
  }

  return new Promise((resolve) => {
    const start  = Date.now();
    const socket = createConnection({ host, port });

    socket.setTimeout(TIMEOUT_MS);

    socket.once('connect', () => {
      const tcpMs = Date.now() - start;
      socket.destroy();
      resolve({ status: 'up', totalMs: tcpMs, tcpMs });
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve({ status: 'down', error: 'Connection timed out' });
    });

    socket.once('error', (err) => {
      resolve({ status: 'down', error: err.message });
    });
  });
}
