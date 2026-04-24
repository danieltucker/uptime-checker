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

const MIDNIGHT_DARK = {
  pageBg:          '#05080d',
  headerBg:        '#090e17',
  summaryBg:       '#0d1420',
  summaryBorder:   '#182436',
  cardBg:          '#090e17',
  cardBorder:      '#182436',
  cardBorderHover: '#263850',
  metricGap:       '#0f1a2a',
  inputBg:         '#05080d',
  tooltipBg:       '#0d1420',
  tooltipBorder:   '#182436',
  tagBg:           '#0d1420',
  tagBorder:       '#182436',
  textPrimary:     '#d8e8f5',
  textSecondary:   '#7090b0',
  textMuted:       '#4a6880',
  textFaint:       '#2a4060',
  scrollTrack:     '#05080d',
  scrollThumb:     '#182436',
  scrollThumbHover:'#263850',
};

const MIDNIGHT_LIGHT = {
  pageBg:          '#eef3fa',
  headerBg:        '#ffffff',
  summaryBg:       '#e0eaf5',
  summaryBorder:   '#c0d0e8',
  cardBg:          '#ffffff',
  cardBorder:      '#c0d0e8',
  cardBorderHover: '#88a8cc',
  metricGap:       '#c0d0e8',
  inputBg:         '#eef3fa',
  tooltipBg:       '#ffffff',
  tooltipBorder:   '#c0d0e8',
  tagBg:           '#e0eaf5',
  tagBorder:       '#c0d0e8',
  textPrimary:     '#0a1828',
  textSecondary:   '#3a6080',
  textMuted:       '#5a7a98',
  textFaint:       '#88a8c8',
  scrollTrack:     '#eef3fa',
  scrollThumb:     '#c0d0e8',
  scrollThumbHover:'#88a8cc',
};

const TERMINAL_DARK = {
  pageBg:          '#000000',
  headerBg:        '#0a0a0a',
  summaryBg:       '#0d0d0d',
  summaryBorder:   '#1a2a1a',
  cardBg:          '#0a0a0a',
  cardBorder:      '#1a2a1a',
  cardBorderHover: '#2a402a',
  metricGap:       '#111811',
  inputBg:         '#000000',
  tooltipBg:       '#0d0d0d',
  tooltipBorder:   '#1a2a1a',
  tagBg:           '#0d1a0d',
  tagBorder:       '#1a2a1a',
  textPrimary:     '#33ff33',
  textSecondary:   '#22cc22',
  textMuted:       '#179917',
  textFaint:       '#0d5a0d',
  scrollTrack:     '#000000',
  scrollThumb:     '#1a2a1a',
  scrollThumbHover:'#2a402a',
};

const TERMINAL_LIGHT = {
  pageBg:          '#f5f0e8',
  headerBg:        '#faf7f0',
  summaryBg:       '#ede8dc',
  summaryBorder:   '#d4cdc0',
  cardBg:          '#faf7f0',
  cardBorder:      '#d4cdc0',
  cardBorderHover: '#a89e90',
  metricGap:       '#d4cdc0',
  inputBg:         '#f5f0e8',
  tooltipBg:       '#faf7f0',
  tooltipBorder:   '#d4cdc0',
  tagBg:           '#ede8dc',
  tagBorder:       '#d4cdc0',
  textPrimary:     '#1a4d2e',
  textSecondary:   '#2d6b44',
  textMuted:       '#4a7c5a',
  textFaint:       '#7aaa88',
  scrollTrack:     '#f5f0e8',
  scrollThumb:     '#d4cdc0',
  scrollThumbHover:'#a89e90',
};

const OCEAN_DARK = {
  pageBg:          '#0a1628',
  headerBg:        '#0d1e36',
  summaryBg:       '#112544',
  summaryBorder:   '#1a3256',
  cardBg:          '#0d1e36',
  cardBorder:      '#1a3256',
  cardBorderHover: '#264878',
  metricGap:       '#152b4e',
  inputBg:         '#0a1628',
  tooltipBg:       '#112544',
  tooltipBorder:   '#1a3256',
  tagBg:           '#112544',
  tagBorder:       '#1a3256',
  textPrimary:     '#c8dff5',
  textSecondary:   '#6a9cc0',
  textMuted:       '#4a7498',
  textFaint:       '#2a5070',
  scrollTrack:     '#0a1628',
  scrollThumb:     '#1a3256',
  scrollThumbHover:'#264878',
};

const OCEAN_LIGHT = {
  pageBg:          '#eef2f8',
  headerBg:        '#ffffff',
  summaryBg:       '#dde8f2',
  summaryBorder:   '#b8cfe0',
  cardBg:          '#ffffff',
  cardBorder:      '#b8cfe0',
  cardBorderHover: '#7aaac8',
  metricGap:       '#b8cfe0',
  inputBg:         '#eef2f8',
  tooltipBg:       '#ffffff',
  tooltipBorder:   '#b8cfe0',
  tagBg:           '#dde8f2',
  tagBorder:       '#b8cfe0',
  textPrimary:     '#0a2040',
  textSecondary:   '#3a6080',
  textMuted:       '#5a80a0',
  textFaint:       '#8aafca',
  scrollTrack:     '#eef2f8',
  scrollThumb:     '#b8cfe0',
  scrollThumbHover:'#7aaac8',
};

const NORD_DARK = {
  pageBg:          '#2e3440',
  headerBg:        '#3b4252',
  summaryBg:       '#434c5e',
  summaryBorder:   '#4c566a',
  cardBg:          '#3b4252',
  cardBorder:      '#4c566a',
  cardBorderHover: '#5e6f88',
  metricGap:       '#434c5e',
  inputBg:         '#2e3440',
  tooltipBg:       '#434c5e',
  tooltipBorder:   '#4c566a',
  tagBg:           '#434c5e',
  tagBorder:       '#4c566a',
  textPrimary:     '#eceff4',
  textSecondary:   '#aab4c4',
  textMuted:       '#7a8898',
  textFaint:       '#4c566a',
  scrollTrack:     '#2e3440',
  scrollThumb:     '#4c566a',
  scrollThumbHover:'#5e6f88',
};

const NORD_LIGHT = {
  pageBg:          '#eceff4',
  headerBg:        '#ffffff',
  summaryBg:       '#e5e9f0',
  summaryBorder:   '#d8dee9',
  cardBg:          '#ffffff',
  cardBorder:      '#d8dee9',
  cardBorderHover: '#b0bac8',
  metricGap:       '#d8dee9',
  inputBg:         '#eceff4',
  tooltipBg:       '#ffffff',
  tooltipBorder:   '#d8dee9',
  tagBg:           '#e5e9f0',
  tagBorder:       '#d8dee9',
  textPrimary:     '#2e3440',
  textSecondary:   '#4c566a',
  textMuted:       '#6a7888',
  textFaint:       '#9aa4b0',
  scrollTrack:     '#eceff4',
  scrollThumb:     '#d8dee9',
  scrollThumbHover:'#b0bac8',
};

const MOCHA_DARK = {
  pageBg:          '#12100e',
  headerBg:        '#1a1714',
  summaryBg:       '#211e1a',
  summaryBorder:   '#2e2920',
  cardBg:          '#1a1714',
  cardBorder:      '#2e2920',
  cardBorderHover: '#4a4030',
  metricGap:       '#252018',
  inputBg:         '#12100e',
  tooltipBg:       '#211e1a',
  tooltipBorder:   '#2e2920',
  tagBg:           '#211e1a',
  tagBorder:       '#2e2920',
  textPrimary:     '#f0e8d8',
  textSecondary:   '#b09878',
  textMuted:       '#806848',
  textFaint:       '#504030',
  scrollTrack:     '#12100e',
  scrollThumb:     '#2e2920',
  scrollThumbHover:'#4a4030',
};

const MOCHA_LIGHT = {
  pageBg:          '#faf7f2',
  headerBg:        '#fffdf9',
  summaryBg:       '#f0ebe0',
  summaryBorder:   '#ddd0bc',
  cardBg:          '#fffdf9',
  cardBorder:      '#ddd0bc',
  cardBorderHover: '#c0a882',
  metricGap:       '#ddd0bc',
  inputBg:         '#faf7f2',
  tooltipBg:       '#fffdf9',
  tooltipBorder:   '#ddd0bc',
  tagBg:           '#f0ebe0',
  tagBorder:       '#ddd0bc',
  textPrimary:     '#1c1410',
  textSecondary:   '#6b4e30',
  textMuted:       '#8b6a48',
  textFaint:       '#b89070',
  scrollTrack:     '#faf7f2',
  scrollThumb:     '#ddd0bc',
  scrollThumbHover:'#c0a882',
};

export const THEMES = {
  default:  { dark: DARK,          light: LIGHT,          label: 'Default'  },
  midnight: { dark: MIDNIGHT_DARK, light: MIDNIGHT_LIGHT, label: 'Midnight' },
  terminal: { dark: TERMINAL_DARK, light: TERMINAL_LIGHT, label: 'Terminal' },
  ocean:    { dark: OCEAN_DARK,    light: OCEAN_LIGHT,    label: 'Ocean'    },
  nord:     { dark: NORD_DARK,     light: NORD_LIGHT,     label: 'Nord'     },
  mocha:    { dark: MOCHA_DARK,    light: MOCHA_LIGHT,    label: 'Mocha'    },
};

const ThemeContext = createContext({
  isDark: true, t: DARK, themeMode: 'auto', setThemeMode: () => {},
  themeName: 'default', setThemeName: () => {},
});

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

  const [themeName, setThemeName] = useState(() => {
    try {
      const stored = localStorage.getItem('wt-theme-name');
      if (stored && THEMES[stored]) return stored;
      return 'default';
    } catch {
      return 'default';
    }
  });

  const [osPrefersDark, setOsPrefersDark] = useState(() => {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
    catch { return true; }
  });

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

  const theme = THEMES[themeName] ?? THEMES.default;
  const t = isDark ? theme.dark : theme.light;

  useEffect(() => {
    try { localStorage.setItem('wt-theme', themeMode); }
    catch {}
    try { localStorage.setItem('wt-theme-name', themeName); }
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
  }, [isDark, themeMode, themeName, t]);

  return (
    <ThemeContext.Provider value={{ isDark, t, themeMode, setThemeMode, themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
