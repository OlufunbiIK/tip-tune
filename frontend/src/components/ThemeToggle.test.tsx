import { fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';

const mockTheme = {
  preferences: {
    mode: 'auto' as const,
    highContrast: false,
    oledDark: false,
    animationsEnabled: true,
  },
  resolvedTheme: 'dark' as const,
  setThemeMode: vi.fn(),
  setHighContrast: vi.fn(),
  setOledDark: vi.fn(),
  setAnimationsEnabled: vi.fn(),
  cycleThemeMode: vi.fn(),
  isSynced: true,
};

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => mockTheme,
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockTheme.setThemeMode.mockReset();
    mockTheme.setHighContrast.mockReset();
    mockTheme.setOledDark.mockReset();
    mockTheme.setAnimationsEnabled.mockReset();
    mockTheme.preferences.mode = 'auto';
    mockTheme.preferences.highContrast = false;
    mockTheme.preferences.oledDark = false;
    mockTheme.preferences.animationsEnabled = true;
  });

  it('switches theme mode', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /Dark/i }));
    expect(mockTheme.setThemeMode).toHaveBeenCalledWith('dark');
  });

  it('renders advanced toggles and updates options', () => {
    render(<ThemeToggle showAdvanced />);

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    fireEvent.click(switches[1]);
    fireEvent.click(switches[2]);

    expect(mockTheme.setHighContrast).toHaveBeenCalledWith(true);
    expect(mockTheme.setOledDark).toHaveBeenCalledWith(true);
    expect(mockTheme.setAnimationsEnabled).toHaveBeenCalledWith(false);
  });
});
