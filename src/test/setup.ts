import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.ipcRenderer
Object.defineProperty(window, 'ipcRenderer', {
  value: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  writable: true,
});

// Mock resize observer which is often needed for layout components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};