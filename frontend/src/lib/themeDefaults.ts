export type ThemePreferences = {
  accent_color: string;
  bg_color: string;
  panel_color: string;
  card_color: string;
  radius: number;
  card_padding: number;
  glow_intensity: number;
  show_grid: boolean;
  show_noise: boolean;
  font_family: string;
};

export type ThemePreset = ThemePreferences & { name: string };

export const DEFAULT_PREFERENCES: ThemePreferences = {
  accent_color: '#00e08a',
  bg_color: '#05080c',
  panel_color: '#0a0f16',
  card_color: '#0c1219',
  radius: 12,
  card_padding: 20,
  glow_intensity: 35,
  show_grid: true,
  show_noise: true,
  font_family: 'Space Grotesk',
};

export const PRESETS: ThemePreset[] = [
  { name: 'Neón (default)', ...DEFAULT_PREFERENCES },
  { name: 'Azul eléctrico', accent_color: '#4f8cff', bg_color: '#05070d', panel_color: '#0a0e18', card_color: '#0c1220', radius: 12, card_padding: 20, glow_intensity: 35, show_grid: true, show_noise: true, font_family: 'Space Grotesk' },
  { name: 'Cyan hielo', accent_color: '#2ee6d6', bg_color: '#04100f', panel_color: '#081615', card_color: '#0a1a19', radius: 12, card_padding: 20, glow_intensity: 35, show_grid: true, show_noise: true, font_family: 'Space Grotesk' },
  { name: 'Ámbar pro', accent_color: '#ffc24b', bg_color: '#0b0806', panel_color: '#120e09', card_color: '#16110b', radius: 12, card_padding: 20, glow_intensity: 35, show_grid: true, show_noise: true, font_family: 'Space Grotesk' },
  { name: 'Rosa synth', accent_color: '#ff5c9e', bg_color: '#0c0711', panel_color: '#140c1a', card_color: '#180f20', radius: 12, card_padding: 20, glow_intensity: 35, show_grid: true, show_noise: true, font_family: 'Space Grotesk' },
  { name: 'Violeta deep', accent_color: '#9d7bff', bg_color: '#08070f', panel_color: '#0e0c18', card_color: '#110f1e', radius: 12, card_padding: 20, glow_intensity: 35, show_grid: true, show_noise: true, font_family: 'Space Grotesk' },
  { name: 'Rojo trader', accent_color: '#ff5c5c', bg_color: '#0c0607', panel_color: '#140b0c', card_color: '#180d0e', radius: 12, card_padding: 20, glow_intensity: 35, show_grid: true, show_noise: true, font_family: 'Space Grotesk' },
  { name: 'Paper (claro)', accent_color: '#0aa06e', bg_color: '#eef1ef', panel_color: '#f8faf9', card_color: '#ffffff', radius: 12, card_padding: 20, glow_intensity: 35, show_grid: true, show_noise: true, font_family: 'Space Grotesk' },
];

export const ACCENT_SWATCHES = [
  '#00e08a', '#2ee6d6', '#4f8cff', '#9d7bff', '#ff5c9e', '#ff5c5c', '#ffc24b', '#ff8a3d', '#a3e635', '#e2e8f0',
];

export const FONT_OPTIONS = [
  { id: 'Space Grotesk', label: 'Space Grotesk (default)' },
  { id: 'Sora', label: 'Sora' },
  { id: 'Outfit', label: 'Outfit' },
  { id: 'Chakra Petch', label: 'Chakra Petch' },
] as const;

export function fontCss(family: string): string {
  return `'${family}', system-ui, sans-serif`;
}

export function preferencesEqual(a: ThemePreferences, b: ThemePreferences): boolean {
  return (Object.keys(DEFAULT_PREFERENCES) as (keyof ThemePreferences)[]).every(k => a[k] === b[k]);
}

export function isPresetActive(preset: ThemePreset, current: ThemePreferences): boolean {
  return (
    preset.accent_color.toLowerCase() === current.accent_color.toLowerCase() &&
    preset.bg_color.toLowerCase() === current.bg_color.toLowerCase() &&
    preset.panel_color.toLowerCase() === current.panel_color.toLowerCase() &&
    preset.card_color.toLowerCase() === current.card_color.toLowerCase()
  );
}
