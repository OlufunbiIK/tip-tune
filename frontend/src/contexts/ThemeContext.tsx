import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWallet } from '../hooks/useWallet';
import {
  userService,
  type DisplaySettings as UserDisplaySettings,
} from '../services/userService';
import {
  applyThemeToDocument,
  persistThemePreferences,
  readStoredThemePreferences,
  resolveThemeMode,
  subscribeSystemThemeChanges,
  type ResolvedTheme,
  type ThemeMode,
  type ThemePreferences,
} from '../utils/theme';

type ThemeContextValue = {
  preferences: ThemePreferences;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  setHighContrast: (enabled: boolean) => void;
  setOledDark: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  cycleThemeMode: () => void;
  isSynced: boolean;
};

type ThemeProviderProps = {
  children: React.ReactNode;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const mapDisplaySettingsToTheme = (
  display: Partial<UserDisplaySettings> | undefined,
): Partial<ThemePreferences> => {
  if (!display) return {};
  return {
    mode:
      display.theme === 'system'
        ? 'auto'
        : display.theme === 'dark' || display.theme === 'light'
          ? display.theme
          : undefined,
    animationsEnabled:
      typeof display.showAnimations === 'boolean'
        ? display.showAnimations
        : undefined,
    highContrast:
      typeof display.highContrast === 'boolean'
        ? display.highContrast
        : undefined,
    oledDark: typeof display.oledDark === 'boolean' ? display.oledDark : undefined,
  };
};

const mapThemeToDisplaySettings = (
  preferences: ThemePreferences,
  base: Partial<UserDisplaySettings>,
): UserDisplaySettings => ({
  theme: preferences.mode === 'auto' ? 'system' : preferences.mode,
  compactMode: base.compactMode ?? false,
  showAnimations: preferences.animationsEnabled,
  highContrast: preferences.highContrast,
  oledDark: preferences.oledDark,
});

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isConnected } = useWallet();
  const [preferences, setPreferences] = useState<ThemePreferences>(() =>
    readStoredThemePreferences(),
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemeMode(readStoredThemePreferences().mode),
  );
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  const hasLoadedRemotePreferences = useRef(false);
  const skipNextSync = useRef(true);
  const displaySettingsBase = useRef<Partial<UserDisplaySettings>>({
    compactMode: false,
  });
  const syncTimerRef = useRef<number | null>(null);
  const preferencesRef = useRef(preferences);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    const nextResolved = applyThemeToDocument(preferences, {
      enableTransitions: isThemeReady,
      markReady: isThemeReady,
    });
    setResolvedTheme(nextResolved);
    persistThemePreferences(preferences);
  }, [preferences, isThemeReady]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setIsThemeReady(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(
    () =>
      subscribeSystemThemeChanges(() => {
        if (preferencesRef.current.mode !== 'auto') return;
        const nextResolved = applyThemeToDocument(preferencesRef.current, {
          enableTransitions: isThemeReady,
          markReady: isThemeReady,
        });
        setResolvedTheme(nextResolved);
      }),
    [isThemeReady],
  );

  useEffect(() => {
    if (!isConnected || hasLoadedRemotePreferences.current) return;
    hasLoadedRemotePreferences.current = true;

    let isCancelled = false;

    const loadRemote = async () => {
      try {
        const response = await userService.getSettings();
        if (isCancelled) return;

        displaySettingsBase.current = {
          compactMode: response.display?.compactMode ?? false,
        };

        const mapped = mapDisplaySettingsToTheme(response.display);
        if (Object.keys(mapped).length > 0) {
          setPreferences((current) => ({ ...current, ...mapped }));
        }
      } catch {
        // Ignore API availability issues and keep local preferences.
      }
    };

    loadRemote().finally(() => {
      if (!isCancelled) {
        setIsSynced(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || !isThemeReady || !hasLoadedRemotePreferences.current) {
      return;
    }

    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(async () => {
      try {
        try {
          const latest = await userService.getSettings();
          displaySettingsBase.current = {
            compactMode:
              latest.display?.compactMode ?? displaySettingsBase.current.compactMode,
          };
        } catch {
          // Keep existing compactMode fallback when settings read is unavailable.
        }

        const payload = mapThemeToDisplaySettings(
          preferences,
          displaySettingsBase.current,
        );
        await userService.updateDisplaySettings(payload);
        setIsSynced(true);
      } catch {
        setIsSynced(false);
      }
    }, 500);

    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [isConnected, isThemeReady, preferences]);

  const updatePreferences = useCallback(
    (partial: Partial<ThemePreferences>) => {
      setPreferences((current) => ({ ...current, ...partial }));
    },
    [],
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => updatePreferences({ mode }),
    [updatePreferences],
  );

  const setHighContrast = useCallback(
    (enabled: boolean) => updatePreferences({ highContrast: enabled }),
    [updatePreferences],
  );

  const setOledDark = useCallback(
    (enabled: boolean) => updatePreferences({ oledDark: enabled }),
    [updatePreferences],
  );

  const setAnimationsEnabled = useCallback(
    (enabled: boolean) => updatePreferences({ animationsEnabled: enabled }),
    [updatePreferences],
  );

  const cycleThemeMode = useCallback(() => {
    const modes: ThemeMode[] = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(preferencesRef.current.mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updatePreferences({ mode: nextMode });
  }, [updatePreferences]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preferences,
      resolvedTheme,
      setThemeMode,
      setHighContrast,
      setOledDark,
      setAnimationsEnabled,
      cycleThemeMode,
      isSynced,
    }),
    [
      preferences,
      resolvedTheme,
      setThemeMode,
      setHighContrast,
      setOledDark,
      setAnimationsEnabled,
      cycleThemeMode,
      isSynced,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;
