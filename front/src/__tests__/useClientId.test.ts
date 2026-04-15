import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientId } from '../hooks/useClientId';

describe('useClientId', () => {
  it('should generate a client ID', () => {
    const { result } = renderHook(() => useClientId());
    expect(result.current.clientId).toBeDefined();
    expect(typeof result.current.clientId).toBe('string');
    expect(result.current.clientId.length).toBeGreaterThan(0);
  });

  it('should persist the same client ID across renders', () => {
    const { result, rerender } = renderHook(() => useClientId());
    const firstId = result.current.clientId;
    rerender();
    expect(result.current.clientId).toBe(firstId);
  });

  it('should generate a new ID on reset', () => {
    const { result } = renderHook(() => useClientId());
    const firstId = result.current.clientId;
    act(() => {
      result.current.resetClientId();
    });
    expect(result.current.clientId).not.toBe(firstId);
  });
});
