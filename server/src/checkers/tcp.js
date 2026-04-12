/**
 * TCP checker — attempts a raw TCP connection to host:port.
 * No data is sent; we just measure how long the three-way handshake takes.
 * No special OS capabilities required.
 */

import { createConnection } from 'node:net';

const TIMEOUT_MS = 5_000;

export function tcpCheck(host, port) {
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
