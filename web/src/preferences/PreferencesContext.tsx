import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light';
export type LayoutDensity = 'comfortable' | 'compact';
export type SidebarMode = 'expanded' | 'rail';

type Preferences = {
  theme: ThemeMode;
  density: LayoutDensity;
  sidebar: SidebarMode;
};

type PreferencesContextValue = Preferences & {
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: LayoutDensity) => void;
  setSidebar: (sidebar: SidebarMode) => void;
};

const STORAGE_KEY = 'belle-ui-preferences';

const defaults: Preferences = {
  theme: 'dark',
  density: 'comfortable',
  sidebar: 'expanded',
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStored(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      sidebar: parsed.sidebar === 'rail' ? 'rail' : 'expanded',
    };
  } catch {
    return defaults;
  }
}

function applyToDocument(prefs: Preferences) {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.density = prefs.density;
  root.dataset.sidebar = prefs.sidebar;
  root.style.colorScheme = prefs.theme;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    const initial = readStored();
    applyToDocument(initial);
    return initial;
  });

  useEffect(() => {
    applyToDocument(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPrefs((p) => ({ ...p, theme }));
  }, []);

  const setDensity = useCallback((density: LayoutDensity) => {
    setPrefs((p) => ({ ...p, density }));
  }, []);

  const setSidebar = useCallback((sidebar: SidebarMode) => {
    setPrefs((p) => ({ ...p, sidebar }));
  }, []);

  const value = useMemo(
    () => ({ ...prefs, setTheme, setDensity, setSidebar }),
    [prefs, setTheme, setDensity, setSidebar],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
