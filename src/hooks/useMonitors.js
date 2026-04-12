import { useState, useEffect, useRef, useCallback } from 'react';
import { createMonitor } from '../types/monitor';

// ---------------------------------------------------------------------------
// Simulation layer — everything in this section will be replaced by real
// HTTP checks against a Node/Express backend.
// ---------------------------------------------------------------------------

/**
 * TODO: replace with real HTTP check via POST /api/monitors/:id/check
 * The backend will perform an actual ping / HTTP HEAD request and return
 * { status: 'up'|'down', ping: number|null, checkedAt: string }
 */
function simulateCheck() {
  const isDown = Math.random() < 0.05; // 5% chance of a DOWN event
  if (isDown) return { status: 'down', ping: null };

  const base  = 20 + Math.floor(Math.random() * 230);          // 20–250ms
  const spike = Math.random() > 0.9 ? Math.floor(100 + Math.random() * 150) : 0; // occasional spike
  return { status: 'up', ping: base + spike };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useMonitors — central state for all monitor CRUD and polling.
 *
 * In a future version this hook will:
 *  - fetch the initial list from GET /api/monitors on mount
 *  - delegate check scheduling to the backend (SSE / WebSocket push)
 *  - replace addMonitor/updateMonitor/deleteMonitor with API mutations
 */
export function useMonitors() {
  const [monitors, setMonitors] = useState([]);
  const intervalRefs = useRef({}); // { [monitorId]: intervalId }

  /** Apply one check result to a monitor in state. */
  const applyCheckResult = useCallback((monitorId, result) => {
    setMonitors(prev =>
      prev.map(m => {
        if (m.id !== monitorId) return m;
        const point = { timestamp: new Date(), ...result };
        const history = [...m.history, point].slice(-50); // keep last 50
        const upCount = history.filter(p => p.status === 'up').length;
        return {
          ...m,
          status: result.status,
          currentPing: result.ping,
          uptimePercent: Math.round((upCount / history.length) * 1000) / 10,
          history,
          lastChecked: new Date(),
        };
      })
    );
  }, []);

  /** Run one check for a monitor (simulated for now). */
  const runCheck = useCallback((monitorId) => {
    // TODO: replace with API call to POST /api/monitors/:id/check
    const result = simulateCheck();
    applyCheckResult(monitorId, result);
  }, [applyCheckResult]);

  /** Start (or restart) the polling interval for a monitor. */
  const startChecks = useCallback((id, intervalSeconds) => {
    if (intervalRefs.current[id]) {
      clearInterval(intervalRefs.current[id]);
    }
    runCheck(id); // immediate first check so the card shows data right away
    intervalRefs.current[id] = setInterval(
      () => runCheck(id),
      intervalSeconds * 1000
    );
  }, [runCheck]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** TODO: replace with POST /api/monitors */
  const addMonitor = useCallback((data) => {
    const monitor = createMonitor(data);
    setMonitors(prev => [...prev, monitor]);
    startChecks(monitor.id, monitor.interval);
    return monitor;
  }, [startChecks]);

  /** TODO: replace with PUT /api/monitors/:id */
  const updateMonitor = useCallback((id, data) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    // Restart polling if the interval changed
    if (data.interval !== undefined) {
      startChecks(id, data.interval);
    }
  }, [startChecks]);

  /** TODO: replace with DELETE /api/monitors/:id */
  const deleteMonitor = useCallback((id) => {
    if (intervalRefs.current[id]) {
      clearInterval(intervalRefs.current[id]);
      delete intervalRefs.current[id];
    }
    setMonitors(prev => prev.filter(m => m.id !== id));
  }, []);

  // Cleanup all intervals when the hook unmounts
  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, []);

  return { monitors, addMonitor, updateMonitor, deleteMonitor };
}
