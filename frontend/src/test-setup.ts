import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Tests that use `jest.*` APIs run under Vitest via this alias.
(globalThis as unknown as { jest: typeof vi }).jest = vi;

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
