import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  DEFAULT_PREFERENCES,
  PRESETS,
  type ThemePreferences,
  type ThemePreset,
} from '../lib/themeDefaults';
import { applyThemePreferences, preferencesToRow, rowToPreferences } from '../lib/themeEngine';

const CACHE_KEY = 'pt-theme-cache';

interface ThemeContextType {
  preferences: ThemePreferences;
  updatePreferences: (partial: Partial<ThemePreferences>) => void;
  applyPreset: (preset: ThemePreset) => void;
  resetToDefault: () => void;
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  isLoading: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  preferences: DEFAULT_PREFERENCES,
  updatePreferences: () => {},
  applyPreset: () => {},
  resetToDefault: () => {},
  isPanelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  togglePanel: () => {},
  isLoading: false,
  theme: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function readCache(): ThemePreferences | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) as ThemePreferences : null;
  } catch {
    return null;
  }
}

function writeCache(prefs: ThemePreferences) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ThemePreferences>(() => readCache() ?? DEFAULT_PREFERENCES);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const commitPreferences = useCallback((next: ThemePreferences, animate = true) => {
    setPreferences(next);
    writeCache(next);
    applyThemePreferences(next, animate);
    setTheme(document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark');
  }, []);

  const scheduleSave = useCallback((next: ThemePreferences) => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from('user_preferences').upsert(preferencesToRow(next, user.id), { onConflict: 'user_id' });
    }, 400);
  }, [user]);

  const updatePreferences = useCallback((partial: Partial<ThemePreferences>) => {
    const next = { ...prefsRef.current, ...partial };
    commitPreferences(next);
    scheduleSave(next);
  }, [commitPreferences, scheduleSave]);

  const applyPreset = useCallback((preset: ThemePreset) => {
    const { name: _n, ...rest } = preset;
    const next = { ...rest };
    commitPreferences(next);
    scheduleSave(next);
  }, [commitPreferences, scheduleSave]);

  const resetToDefault = useCallback(() => {
    commitPreferences({ ...DEFAULT_PREFERENCES });
    scheduleSave({ ...DEFAULT_PREFERENCES });
  }, [commitPreferences, scheduleSave]);

  const toggleTheme = useCallback(() => {
    const paper = PRESETS.find(p => p.name === 'Paper (claro)')!;
    const neon = PRESETS.find(p => p.name === 'Neón (default)')!;
    const isLight = prefsRef.current.bg_color.toLowerCase() === paper.bg_color.toLowerCase();
    applyPreset(isLight ? neon : paper);
  }, [applyPreset]);

  // Apply on mount
  useEffect(() => {
    applyThemePreferences(preferences, false);
    setTheme(document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      const cached = readCache();
      if (cached) commitPreferences(cached, false);
      else commitPreferences(DEFAULT_PREFERENCES, false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        commitPreferences(rowToPreferences(data), false);
      } else {
        commitPreferences(readCache() ?? DEFAULT_PREFERENCES, false);
      }
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user, commitPreferences]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  return (
    <ThemeContext.Provider value={{
      preferences,
      updatePreferences,
      applyPreset,
      resetToDefault,
      isPanelOpen,
      openPanel: () => setIsPanelOpen(true),
      closePanel: () => setIsPanelOpen(false),
      togglePanel: () => setIsPanelOpen(o => !o),
      isLoading,
      theme,
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
