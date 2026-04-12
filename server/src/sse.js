/**
 * Server-Sent Events — push check results to all connected browser clients
 * in real time without polling. The browser's EventSource API auto-reconnects.
 */

const clients = new Set();

/** Express route handler — call as app.get('/api/events', sseHandler) */
export function sseHandler(req, res) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // prevent nginx from buffering the stream
  res.flushHeaders();

  // Keepalive comment every 25s — prevents proxies/load-balancers from closing idle connections
  const heartbeat = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 25_000);

  clients.add(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

/**
 * Broadcast a named event to every connected client.
 * @param {string} event  — event name, matched by addEventListener() on the client
 * @param {object} data   — will be JSON-serialised into the `data:` field
 */
export function broadcast(event, data) {
  if (clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}
