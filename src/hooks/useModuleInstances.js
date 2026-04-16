import { useState, useEffect, useCallback } from 'react';

export function useModuleInstances() {
  const [instances, setInstances] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/module-instances');
      const data = await res.json();
      setInstances(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addInstance = useCallback(async (payload) => {
    const res  = await fetch('/api/module-instances', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create instance');
    setInstances(prev => [...prev, data]);
    return data;
  }, []);

  const updateInstance = useCallback(async (id, payload) => {
    const res  = await fetch(`/api/module-instances/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update instance');
    setInstances(prev => prev.map(i => i.id === id ? data : i));
    return data;
  }, []);

  const deleteInstance = useCallback(async (id) => {
    const res = await fetch(`/api/module-instances/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete instance');
    setInstances(prev => prev.filter(i => i.id !== id));
  }, []);

  return { instances, loading, error, addInstance, updateInstance, deleteInstance };
}
