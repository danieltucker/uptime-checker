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

// Midnight — deep space. Near-black with cool blue luminescence.
const MIDNIGHT_DARK = {
  pageBg:          '#03060d',
  headerBg:        '#070e1e',
  summaryBg:       '#0b1528',
  summaryBorder:   '#122038',
  cardBg:          '#070e1e',
  cardBorder:      '#122038',
  cardBorderHover: '#1e3560',
  metricGap:       '#0e1a30',
  inputBg:         '#03060d',
  tooltipBg:       '#0b1528',
  tooltipBorder:   '#122038',
  tagBg:           '#0b1528',
  tagBorder:       '#122038',
  textPrimary:     '#c8e0ff',
  textSecondary:   '#5888c0',
  textMuted:       '#335880',
  textFaint:       '#1a3558',
  scrollTrack:     '#03060d',
  scrollThumb:     '#122038',
  scrollThumbHover:'#1e3560',
};

// Midnight light — pale arctic sky. Crisp blue-white.
const MIDNIGHT_LIGHT = {
  pageBg:          '#e6eef8',
  headerBg:        '#f5f9ff',
  summaryBg:       '#d8e8f8',
  summaryBorder:   '#a8c8e8',
  cardBg:          '#f5f9ff',
  cardBorder:      '#a8c8e8',
  cardBorderHover: '#5898d8',
  metricGap:       '#a8c8e8',
  inputBg:         '#e6eef8',
  tooltipBg:       '#f5f9ff',
  tooltipBorder:   '#a8c8e8',
  tagBg:           '#d8e8f8',
  tagBorder:       '#a8c8e8',
  textPrimary:     '#040e28',
  textSecondary:   '#205088',
  textMuted:       '#4070a8',
  textFaint:       '#78a8d8',
  scrollTrack:     '#e6eef8',
  scrollThumb:     '#a8c8e8',
  scrollThumbHover:'#5898d8',
};

// Terminal — authentic phosphor CRT. Pure black, vivid neon green.
const TERMINAL_DARK = {
  pageBg:          '#000000',
  headerBg:        '#050505',
  summaryBg:       '#080808',
  summaryBorder:   '#0e280e',
  cardBg:          '#050505',
  cardBorder:      '#0e280e',
  cardBorderHover: '#1a4a1a',
  metricGap:       '#091409',
  inputBg:         '#000000',
  tooltipBg:       '#080808',
  tooltipBorder:   '#0e280e',
  tagBg:           '#081008',
  tagBorder:       '#0e280e',
  textPrimary:     '#39ff14',
  textSecondary:   '#20c020',
  textMuted:       '#179917',
  textFaint:       '#0a5a0a',
  scrollTrack:     '#000000',
  scrollThumb:     '#0e280e',
  scrollThumbHover:'#1a4a1a',
};

// Terminal light — aged paper, dark pine ink. Same soul, inverted.
const TERMINAL_LIGHT = {
  pageBg:          '#f2ece0',
  headerBg:        '#f9f5ed',
  summaryBg:       '#e8e0d0',
  summaryBorder:   '#c8bca8',
  cardBg:          '#f9f5ed',
  cardBorder:      '#c8bca8',
  cardBorderHover: '#9e9080',
  metricGap:       '#c8bca8',
  inputBg:         '#f2ece0',
  tooltipBg:       '#f9f5ed',
  tooltipBorder:   '#c8bca8',
  tagBg:           '#e8e0d0',
  tagBorder:       '#c8bca8',
  textPrimary:     '#183828',
  textSecondary:   '#2c6040',
  textMuted:       '#487858',
  textFaint:       '#80a888',
  scrollTrack:     '#f2ece0',
  scrollThumb:     '#c8bca8',
  scrollThumbHover:'#9e9080',
};

// Ocean — abyssal navy. Deep water with bioluminescent highlights.
const OCEAN_DARK = {
  pageBg:          '#010c1c',
  headerBg:        '#041526',
  summaryBg:       '#071e35',
  summaryBorder:   '#0c2d50',
  cardBg:          '#041526',
  cardBorder:      '#0c2d50',
  cardBorderHover: '#124080',
  metricGap:       '#082240',
  inputBg:         '#010c1c',
  tooltipBg:       '#071e35',
  tooltipBorder:   '#0c2d50',
  tagBg:           '#071e35',
  tagBorder:       '#0c2d50',
  textPrimary:     '#a8d8f8',
  textSecondary:   '#3e88c0',
  textMuted:       '#205880',
  textFaint:       '#103858',
  scrollTrack:     '#010c1c',
  scrollThumb:     '#0c2d50',
  scrollThumbHover:'#124080',
};

// Ocean light — coastal mist. Pale morning sky over water.
const OCEAN_LIGHT = {
  pageBg:          '#e8f3fc',
  headerBg:        '#f4faff',
  summaryBg:       '#d5ebf8',
  summaryBorder:   '#98cce8',
  cardBg:          '#f4faff',
  cardBorder:      '#98cce8',
  cardBorderHover: '#40a0d8',
  metricGap:       '#98cce8',
  inputBg:         '#e8f3fc',
  tooltipBg:       '#f4faff',
  tooltipBorder:   '#98cce8',
  tagBg:           '#d5ebf8',
  tagBorder:       '#98cce8',
  textPrimary:     '#010e22',
  textSecondary:   '#145888',
  textMuted:       '#3878a8',
  textFaint:       '#68a8d0',
  scrollTrack:     '#e8f3fc',
  scrollThumb:     '#98cce8',
  scrollThumbHover:'#40a0d8',
};

// Nord — faithful to the iconic Nord palette. Polar Night + Snow Storm.
const NORD_DARK = {
  pageBg:          '#242932',
  headerBg:        '#2e3440',
  summaryBg:       '#3b4252',
  summaryBorder:   '#434c5e',
  cardBg:          '#2e3440',
  cardBorder:      '#434c5e',
  cardBorderHover: '#5e6f88',
  metricGap:       '#3b4252',
  inputBg:         '#242932',
  tooltipBg:       '#3b4252',
  tooltipBorder:   '#434c5e',
  tagBg:           '#3b4252',
  tagBorder:       '#434c5e',
  textPrimary:     '#eceff4',
  textSecondary:   '#aab8cc',
  textMuted:       '#7888a0',
  textFaint:       '#4c566a',
  scrollTrack:     '#242932',
  scrollThumb:     '#434c5e',
  scrollThumbHover:'#5e6f88',
};

// Nord light — Snow Storm as canvas, Polar Night as ink.
const NORD_LIGHT = {
  pageBg:          '#dde3ec',
  headerBg:        '#eceff4',
  summaryBg:       '#d0d8e4',
  summaryBorder:   '#b8c4d4',
  cardBg:          '#eceff4',
  cardBorder:      '#b8c4d4',
  cardBorderHover: '#8898b0',
  metricGap:       '#b8c4d4',
  inputBg:         '#dde3ec',
  tooltipBg:       '#eceff4',
  tooltipBorder:   '#b8c4d4',
  tagBg:           '#d0d8e4',
  tagBorder:       '#b8c4d4',
  textPrimary:     '#2e3440',
  textSecondary:   '#3d4a5e',
  textMuted:       '#5a6880',
  textFaint:       '#8898b0',
  scrollTrack:     '#dde3ec',
  scrollThumb:     '#b8c4d4',
  scrollThumbHover:'#8898b0',
};

// Mocha — third-wave espresso at golden hour. Dark roast surfaces, warm cream text.
const MOCHA_DARK = {
  pageBg:          '#0c0906',
  headerBg:        '#160f0a',
  summaryBg:       '#1e1610',
  summaryBorder:   '#2e2018',
  cardBg:          '#160f0a',
  cardBorder:      '#2e2018',
  cardBorderHover: '#503828',
  metricGap:       '#261c14',
  inputBg:         '#0c0906',
  tooltipBg:       '#1e1610',
  tooltipBorder:   '#2e2018',
  tagBg:           '#1e1610',
  tagBorder:       '#2e2018',
  textPrimary:     '#f5e8d0',
  textSecondary:   '#c89860',
  textMuted:       '#906840',
  textFaint:       '#604028',
  scrollTrack:     '#0c0906',
  scrollThumb:     '#2e2018',
  scrollThumbHover:'#503828',
};

// Mocha light — fresh cream and warm parchment. Espresso ink on linen.
const MOCHA_LIGHT = {
  pageBg:          '#fdf8ef',
  headerBg:        '#ffffff',
  summaryBg:       '#f5ede0',
  summaryBorder:   '#dfc8a0',
  cardBg:          '#ffffff',
  cardBorder:      '#dfc8a0',
  cardBorderHover: '#c09858',
  metricGap:       '#dfc8a0',
  inputBg:         '#fdf8ef',
  tooltipBg:       '#ffffff',
  tooltipBorder:   '#dfc8a0',
  tagBg:           '#f5ede0',
  tagBorder:       '#dfc8a0',
  textPrimary:     '#160c04',
  textSecondary:   '#784828',
  textMuted:       '#a06840',
  textFaint:       '#c89860',
  scrollTrack:     '#fdf8ef',
  scrollThumb:     '#dfc8a0',
  scrollThumbHover:'#c09858',
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
