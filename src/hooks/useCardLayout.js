import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

const STORAGE_KEY = 'wt-card-layout';

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { order: [], widths: {} };
}

function saveLayout(layout) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); }
  catch {}
}

/**
 * useCardLayout — persists manual card order and per-card column widths (1 or 2).
 *
 * sortMonitors(list) — applies the saved order to an array of monitors.
 * getWidth(id)       — returns the saved width for a card (default 1).
 * setWidth(id, n)    — saves a new width for a card.
 * setOrder(ids)      — saves a new sort order (array of string IDs).
 * moveCard(activeId, overId) — swaps two cards within the saved order.
 */
export function useCardLayout() {
  const [layout, setLayout] = useState(loadLayout);

  const updateLayout = useCallback((updater) => {
    setLayout(prev => {
      const next = updater(prev);
      saveLayout(next);
      return next;
    });
  }, []);

  const setOrder = useCallback((ids) => {
    updateLayout(prev => ({ ...prev, order: ids.map(String) }));
  }, [updateLayout]);

  const moveCard = useCallback((activeId, overId, currentIds) => {
    const strIds = currentIds.map(String);
    const oldIndex = strIds.indexOf(String(activeId));
    const newIndex = strIds.indexOf(String(overId));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    setOrder(arrayMove(strIds, oldIndex, newIndex));
  }, [setOrder]);

  const setWidth = useCallback((id, width) => {
    updateLayout(prev => ({
      ...prev,
      widths: { ...prev.widths, [String(id)]: width },
    }));
  }, [updateLayout]);

  const sortMonitors = useCallback((monitors) => {
    const { order } = layout;
    if (!order || order.length === 0) return monitors;
    const orderMap = new Map(order.map((id, i) => [id, i]));
    return [...monitors].sort((a, b) => {
      const ia = orderMap.has(String(a.id)) ? orderMap.get(String(a.id)) : Infinity;
      const ib = orderMap.has(String(b.id)) ? orderMap.get(String(b.id)) : Infinity;
      return ia - ib;
    });
  }, [layout]);

  const getWidth = useCallback((id) => layout.widths[String(id)] ?? 1, [layout]);

  return { layout, setOrder, moveCard, setWidth, sortMonitors, getWidth };
}
