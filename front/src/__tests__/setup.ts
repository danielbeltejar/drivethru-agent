import '@testing-library/jest-dom';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

Element.prototype.scrollIntoView = () => {};

// Mock SpeechSynthesis API
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: () => {},
    cancel: () => {},
    getVoices: () => [],
  },
});

class MockSpeechSynthesisUtterance {
  lang = '';
  rate = 1;
  pitch = 1;
  voice = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_text?: string) {}
}
(globalThis as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
