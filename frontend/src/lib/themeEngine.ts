import type { ThemePreferences } from './themeDefaults';
import { fontCss } from './themeDefaults';

export function hexToRgb(h: string): [number, number, number] {
  let hex = h.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function mix(h1: string, h2: string, t: number): string {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

export function lum(h: string): number {
  const c = hexToRgb(h).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

const FONT_LINK_ID = 'pt-display-font';

const FONT_GOOGLE: Record<string, string> = {
  'Space Grotesk': 'Space+Grotesk:wght@400;500;700',
  'Sora': 'Sora:wght@400;500;700',
  'Outfit': 'Outfit:wght@400;500;700',
  'Chakra Petch': 'Chakra+Petch:wght@400;500;700',
};

export function loadDisplayFont(family: string): void {
  const spec = FONT_GOOGLE[family] ?? FONT_GOOGLE['Space Grotesk'];
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
}

export function applyThemePreferences(prefs: ThemePreferences, animate = true): void {
  const root = document.documentElement;
  const s = root.style;
  const light = lum(prefs.bg_color) > 0.45;

  s.setProperty('--bg', prefs.bg_color);
  s.setProperty('--panel', prefs.panel_color);
  s.setProperty('--card', prefs.card_color);
  s.setProperty('--acc', prefs.accent_color);

  const rgb = hexToRgb(prefs.accent_color);
  const accRgb = rgb.join(',');
  s.setProperty('--acc-rgb', accRgb);

  const accHover = light ? mix(prefs.accent_color, '#000000', 0.14) : mix(prefs.accent_color, '#ffffff', 0.14);
  s.setProperty('--acc-hover', accHover);

  const onAcc = lum(prefs.accent_color) > 0.55 ? '#0a130d' : '#ffffff';
  s.setProperty('--on-acc', onAcc);

  const txt = light ? mix(prefs.bg_color, '#0c1116', 0.9) : mix(prefs.bg_color, '#f4f8f6', 0.93);
  const mut = mix(txt, prefs.bg_color, 0.42);
  const mut2 = mix(txt, prefs.bg_color, 0.66);
  const line = mix(txt, prefs.bg_color, 0.87);
  const line2 = mix(txt, prefs.bg_color, 0.76);

  s.setProperty('--txt', txt);
  s.setProperty('--mut', mut);
  s.setProperty('--mut2', mut2);
  s.setProperty('--line', line);
  s.setProperty('--line2', line2);

  const gridC = light ? 'rgba(10,17,22,.07)' : 'rgba(255,255,255,.04)';
  s.setProperty('--grid-c', gridC);

  s.setProperty('--rad', `${prefs.radius}px`);
  s.setProperty('--rad-sm', `${Math.max(2, Math.round(prefs.radius * 0.55))}px`);
  s.setProperty('--rad-lg', `${Math.round(prefs.radius * 1.5)}px`);
  s.setProperty('--pad', `${prefs.card_padding}px`);
  s.setProperty('--glow', (prefs.glow_intensity / 100).toFixed(2));
  s.setProperty('--disp', fontCss(prefs.font_family));

  document.body.classList.toggle('no-grid', !prefs.show_grid);
  document.body.classList.toggle('no-noise', !prefs.show_noise);
  document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');

  loadDisplayFont(prefs.font_family);

  if (animate) {
    document.body.classList.add('theme-anim');
    window.setTimeout(() => document.body.classList.remove('theme-anim'), 450);
  }
}

export function rowToPreferences(row: Record<string, unknown>): ThemePreferences {
  return {
    accent_color: String(row.accent_color ?? '#00e08a'),
    bg_color: String(row.bg_color ?? '#05080c'),
    panel_color: String(row.panel_color ?? '#0a0f16'),
    card_color: String(row.card_color ?? '#0c1219'),
    radius: Number(row.radius ?? 12),
    card_padding: Number(row.card_padding ?? 20),
    glow_intensity: Number(row.glow_intensity ?? 35),
    show_grid: row.show_grid !== false,
    show_noise: row.show_noise !== false,
    font_family: String(row.font_family ?? 'Space Grotesk'),
  };
}

export function preferencesToRow(prefs: ThemePreferences, userId: string) {
  return {
    user_id: userId,
    accent_color: prefs.accent_color,
    bg_color: prefs.bg_color,
    panel_color: prefs.panel_color,
    card_color: prefs.card_color,
    radius: prefs.radius,
    card_padding: prefs.card_padding,
    glow_intensity: prefs.glow_intensity,
    show_grid: prefs.show_grid,
    show_noise: prefs.show_noise,
    font_family: prefs.font_family,
    updated_at: new Date().toISOString(),
  };
}
