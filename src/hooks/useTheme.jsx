import React, { createContext, useContext, useState, useEffect } from 'react';

export const DARK = {
  pageBg:          '#0d1117',
  headerBg:        '#161b22',
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

const ThemeContext = createContext({ isDark: true, t: DARK, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('wt-theme') !== 'light'; }
    catch { return true; }
  });

  const t = isDark ? DARK : LIGHT;

  useEffect(() => {
    try { localStorage.setItem('wt-theme', isDark ? 'dark' : 'light'); }
    catch {}

    document.body.style.backgroundColor = t.pageBg;

    // Update scrollbar styles dynamically
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
  }, [isDark, t]);

  const toggle = () => setIsDark(p => !p);

  return (
    <ThemeContext.Provider value={{ isDark, t, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
