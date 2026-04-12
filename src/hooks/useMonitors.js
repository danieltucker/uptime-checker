import { useState, useEffect, useCallback } from 'react';

/**
 * useMonitors — manages monitor state via the Express REST API + SSE stream.
 *
 * Data flow:
 *  1. Mount / window change  → GET /api/monitors?window=1h|12h|1d|1w
 *  2. Always                 → EventSource /api/events (scheduler pushes check results)
 *  3. CRUD                   → POST / PUT / DELETE /api/monitors/:id
 *
 * The SSE 'monitor:checked' event updates status/ping/uptime fields live.
 * For the 1h window it also appends a raw history point so the sparkline
 * stays live. For longer windows the sparkline is static between fetches
 * (the buckets are already wide enough that one new point doesn't matter).
 */
export function useMonitors(historyWindow = '1h') {
  const [monitors, setMonitors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── Fetch / re-fetch when window changes ────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/monitors?window=${historyWindow}`)
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(data => { setMonitors(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, [historyWindow]);

  // ── SSE stream ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource('/api/events');

    es.addEventListener('monitor:checked', (e) => {
      const u = JSON.parse(e.data);
      setMonitors(prev => prev.map(m => {
        if (m.id !== u.id) return m;

        // Always update the live fields
        const base = {
          ...m,
          status:        u.status,
          currentPing:   u.currentPing,
          uptimePercent: u.uptimePercent,
          lastChecked:   u.lastChecked,
          latest:        u.latest,
        };

        // Only append the raw point to history for the 1h (raw) window.
        // Longer windows use pre-aggregated buckets — appending a single
        // raw point would break the bucket shape.
        if (m.historyWindow === '1h') {
          const history = [...m.history, u.newPoint].slice(-120);
          return { ...base, history };
        }

        return base;
      }));
    });

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
  }, []);

  return { monitors, loading, error, addMonitor, updateMonitor, deleteMonitor };
}
