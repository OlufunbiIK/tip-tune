export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePreferences {
  mode: ThemeMode;
  highContrast: boolean;
  oledDark: boolean;
  animationsEnabled: boolean;
}

interface ThemeDocumentOptions {
  enableTransitions?: boolean;
  markReady?: boolean;
}

const THEME_STORAGE_KEY = 'tiptune.theme.preferences.v1';
const LEGACY_DISPLAY_SETTINGS_KEY = 'tiptune_display_settings';
const ARTIST_THEME_STORAGE_KEY = 'tiptune.artist.theme.v1';

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: 'auto',
  highContrast: false,
  oledDark: false,
  animationsEnabled: true,
};

export const ARTIST_ACCENT_PALETTE = [
  '#6366f1',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#a855f7',
  '#ec4899',
];

export const DEFAULT_ARTIST_ACCENT = ARTIST_ACCENT_PALETTE[0];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'auto';

export const isValidHexColor = (color: string): boolean =>
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color.trim());

export const normalizeHexColor = (color: string): string | null => {
  const trimmed = color.trim();
  if (!isValidHexColor(trimmed)) return null;
  if (trimmed.length === 4) {
    const [hash, r, g, b] = trimmed;
    return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
};

const sanitizeThemePreferences = (
  value: unknown,
): Partial<ThemePreferences> => {
  if (!isObject(value)) return {};

  return {
    mode: isThemeMode(value.mode) ? value.mode : undefined,
    highContrast:
      typeof value.highContrast === 'boolean' ? value.highContrast : undefined,
    oledDark: typeof value.oledDark === 'boolean' ? value.oledDark : undefined,
    animationsEnabled:
      typeof value.animationsEnabled === 'boolean'
        ? value.animationsEnabled
        : undefined,
  };
};

const migrateLegacyDisplaySettings = (): Partial<ThemePreferences> => {
  if (typeof window === 'undefined') return {};

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_DISPLAY_SETTINGS_KEY);
    if (!legacyRaw) return {};

    const legacy = JSON.parse(legacyRaw) as {
      theme?: 'light' | 'dark' | 'system';
      showAnimations?: boolean;
    };

    const mode: ThemeMode | undefined =
      legacy.theme === 'system'
        ? 'auto'
        : legacy.theme === 'dark' || legacy.theme === 'light'
          ? legacy.theme
          : undefined;

    return {
      mode,
      animationsEnabled:
        typeof legacy.showAnimations === 'boolean'
          ? legacy.showAnimations
          : undefined,
    };
  } catch {
    return {};
  }
};

export const readStoredThemePreferences = (): ThemePreferences => {
  if (typeof window === 'undefined') return DEFAULT_THEME_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    const parsed = raw ? sanitizeThemePreferences(JSON.parse(raw)) : {};
    const migrated = raw ? {} : migrateLegacyDisplaySettings();

    return {
      ...DEFAULT_THEME_PREFERENCES,
      ...migrated,
      ...parsed,
    };
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
};

export const persistThemePreferences = (preferences: ThemePreferences): void => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences));
};

export const resolveThemeMode = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'dark' || mode === 'light') return mode;
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const applyThemeToDocument = (
  preferences: ThemePreferences,
  options: ThemeDocumentOptions = {},
): ResolvedTheme => {
  const resolved = resolveThemeMode(preferences.mode);
  if (typeof document === 'undefined') return resolved;

  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');
  root.classList.toggle('theme-high-contrast', preferences.highContrast);
  root.classList.toggle(
    'theme-oled',
    preferences.oledDark && resolved === 'dark',
  );
  root.classList.toggle('theme-no-animations', !preferences.animationsEnabled);

  if (options.enableTransitions === true) {
    root.classList.add('theme-transitions-enabled');
  }
  if (options.enableTransitions === false) {
    root.classList.remove('theme-transitions-enabled');
  }
  if (typeof options.markReady === 'boolean') {
    root.dataset.themeReady = options.markReady ? 'true' : 'false';
  }

  root.dataset.themeMode = preferences.mode;
  root.dataset.themeResolved = resolved;
  root.style.colorScheme = resolved;

  return resolved;
};

export const initializeThemeOnLoad = (): ResolvedTheme => {
  const preferences = readStoredThemePreferences();
  return applyThemeToDocument(preferences, {
    enableTransitions: false,
    markReady: false,
  });
};

export const subscribeSystemThemeChanges = (
  listener: (theme: ResolvedTheme) => void,
): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (event: MediaQueryListEvent) => {
    listener(event.matches ? 'dark' : 'light');
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }

  media.addListener(handleChange);
  return () => media.removeListener(handleChange);
};

const parseHexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = normalizeHexColor(hex) ?? DEFAULT_ARTIST_ACCENT;
  const value = normalized.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

export const resolveArtistAccentColor = (
  artistId?: string,
  explicitColor?: string,
): string => {
  const explicit = explicitColor ? normalizeHexColor(explicitColor) : null;
  if (explicit) return explicit;

  if (!artistId) return DEFAULT_ARTIST_ACCENT;
  const stored = getArtistAccentPreference(artistId);
  if (stored) return stored;

  const hash = Array.from(artistId).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  return ARTIST_ACCENT_PALETTE[hash % ARTIST_ACCENT_PALETTE.length];
};

export const buildArtistThemeVariables = (
  artistId?: string,
  explicitColor?: string,
): Record<string, string> => {
  const accent = resolveArtistAccentColor(artistId, explicitColor);
  const { r, g, b } = parseHexToRgb(accent);
  return {
    '--artist-accent': accent,
    '--artist-accent-rgb': `${r} ${g} ${b}`,
  };
};

const readArtistAccentMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ARTIST_THEME_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const getArtistAccentPreference = (artistId: string): string | null => {
  const map = readArtistAccentMap();
  const value = map[artistId];
  if (!value) return null;
  return normalizeHexColor(value);
};

export const setArtistAccentPreference = (
  artistId: string,
  color: string,
): string | null => {
  if (typeof window === 'undefined') return null;
  const normalized = normalizeHexColor(color);
  if (!normalized) return null;

  const map = readArtistAccentMap();
  map[artistId] = normalized;
  window.localStorage.setItem(ARTIST_THEME_STORAGE_KEY, JSON.stringify(map));
  return normalized;
};
