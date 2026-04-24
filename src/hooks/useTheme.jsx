import React, { createContext, useContext, useState, useEffect } from 'react';

export const DARK = {
  pageBg:          '#0d1117',
  headerBg:        '#161b22',
  summaryBg:       '#1e252c',
  summaryBorder:   '#292e34',
  cardBg:          '#161b22',
  cardBorder:      '#30363d',
  cardBorderHover: '#484f58',
  metricGap:       '#21262d',
  inputBg:         '#0d1117',
  tooltipBg:       '#1f2937',
  tooltipBorder:   '#374151',
  tagBg:           '#21262d',
  tagBorder:       '#30363d',
  textPrimary:     '#e6edf3',
  textSecondary:   '#8d96a0',
  textMuted:       '#6e7681',
  textFaint:       '#484f58',
  scrollTrack:     '#0d1117',
  scrollThumb:     '#30363d',
  scrollThumbHover:'#484f58',
};

export const LIGHT = {
  pageBg:          '#f6f8fa',
  headerBg:        '#ffffff',
  summaryBg:       '#eaeef2',
  summaryBorder:   '#d0d7de',
  cardBg:          '#ffffff',
  cardBorder:      '#d0d7de',
  cardBorderHover: '#9aa2ab',
  metricGap:       '#d0d7de',
  inputBg:         '#f6f8fa',
  tooltipBg:       '#ffffff',
  tooltipBorder:   '#d0d7de',
  tagBg:           '#eaeef2',
  tagBorder:       '#d0d7de',
  textPrimary:     '#1f2328',
  textSecondary:   '#57606a',
  textMuted:       '#6e7781',
  textFaint:       '#9aa2ab',
  scrollTrack:     '#f6f8fa',
  scrollThumb:     '#d0d7de',
  scrollThumbHover:'#9aa2ab',
};

const ThemeContext = createContext({ isDark: true, t: DARK, themeMode: 'auto', setThemeMode: () => {} });

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const stored = localStorage.getItem('wt-theme');
      if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
      return 'auto';
    } catch {
      return 'auto';
    }
  });

  // Tracks the live OS preference so auto mode re-renders when the OS changes.
  const [osPrefersDark, setOsPrefersDark] = useState(() => {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
    catch { return true; }
  });

  // Wire up / tear down the OS preference listener only while in auto mode.
  useEffect(() => {
    if (themeMode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setOsPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  const isDark =
    themeMode === 'dark'  ? true  :
    themeMode === 'light' ? false :
    osPrefersDark;

  const t = isDark ? DARK : LIGHT;

  // Persist the chosen mode and apply body / scrollbar styles whenever resolved theme changes.
  useEffect(() => {
    try { localStorage.setItem('wt-theme', themeMode); }
    catch {}

    document.body.style.backgroundColor = t.pageBg;

    const styleId = 'wt-scrollbar-style';
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = `
      ::-webkit-scrollbar-track { background: ${t.scrollTrack}; }
      ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: ${t.scrollThumbHover}; }
    `;
  }, [isDark, themeMode, t]);

  return (
    <ThemeContext.Provider value={{ isDark, t, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
