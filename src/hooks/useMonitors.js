import { useState, useEffect, useCallback } from 'react';

/**
 * useMonitors — manages monitor state via the Express REST API + SSE stream.
 *
 * Data flow:
 *  1. Mount  → GET /api/monitors  (initial list with history)
 *  2. Always → EventSource /api/events  (scheduler pushes check results)
 *  3. CRUD   → POST / PUT / DELETE /api/monitors/:id
 *
 * The SSE 'monitor:checked' event carries a newPoint to append locally so the
 * sparkline updates without re-fetching the full history array.
 */
export function useMonitors() {
  const [monitors, setMonitors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/monitors')
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(data => { setMonitors(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  // ── SSE stream ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource('/api/events');

    // Scheduler completed a check — update status, ping, uptime and append history point
    es.addEventListener('monitor:checked', (e) => {
      const u = JSON.parse(e.data);
      setMonitors(prev => prev.map(m => {
        if (m.id !== u.id) return m;
        const history = [...m.history, u.newPoint].slice(-50);
        return {
          ...m,
          status:        u.status,
          currentPing:   u.currentPing,
          uptimePercent: u.uptimePercent,
          lastChecked:   u.lastChecked,
          latest:        u.latest,
          history,
        };
      }));
    });

    // Another client deleted a monitor
    es.addEventListener('monitor:deleted', (e) => {
      const { id } = JSON.parse(e.data);
      setMonitors(prev => prev.filter(m => m.id !== id));
    });

    es.onerror = () => { /* EventSource auto-reconnects */ };

    return () => es.close();
  }, []);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addMonitor = useCallback(async (data) => {
    const res = await fetch('/api/monitors', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create monitor (${res.status})`);
    const monitor = await res.json();
    setMonitors(prev => [...prev, monitor]);
    return monitor;
  }, []);

  const updateMonitor = useCallback(async (id, data) => {
    const res = await fetch(`/api/monitors/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update monitor (${res.status})`);
    const updated = await res.json();
    setMonitors(prev => prev.map(m => m.id === id ? updated : m));
    return updated;
  }, []);

  const deleteMonitor = useCallback(async (id) => {
    const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete monitor (${res.status})`);
    setMonitors(prev => prev.filter(m => m.id !== id));
    // SSE 'monitor:deleted' will fire too — the filter is idempotent
  }, []);

  return { monitors, loading, error, addMonitor, updateMonitor, deleteMonitor };
}
