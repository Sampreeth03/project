import { renderHook } from '@testing-library/react';
import { act } from 'react';
import useDebouncedValue from '../../hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  it('delays updates', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' }
    });

    expect(result.current).toBe('a');

    rerender({ value: 'abc' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('abc');
    vi.useRealTimers();
  });
});
