import { describe, it, expect } from 'vitest';
import { API_BASE } from '../config/api';

describe('API config', () => {
  it('should have a valid API_BASE', () => {
    expect(API_BASE).toBeDefined();
    expect(typeof API_BASE).toBe('string');
  });

  it('should point to localhost in test environment', () => {
    expect(API_BASE).toBe('http://localhost:8000');
  });
});
