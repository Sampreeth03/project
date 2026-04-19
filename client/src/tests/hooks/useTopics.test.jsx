import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import useTopics from '../../hooks/useTopics';

vi.mock('axios', () => {
  const mock = { get: vi.fn() };
  return { default: mock };
});

describe('useTopics', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads topics successfully', async () => {
    axios.get.mockResolvedValueOnce({ data: ['web-dev', 'data science'] });

    const { result } = renderHook(() => useTopics());

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });
    expect(result.current.topics).toEqual(['web-dev', 'data science']);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error state', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useTopics());
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });
    expect(result.current.error).toContain('Failed to load topics');
  });

  it('stays in loading state before timer fires', () => {
    vi.useFakeTimers();
    axios.get.mockResolvedValueOnce({ data: ['x'] });
    const { result } = renderHook(() => useTopics());

    vi.advanceTimersByTime(400);
    expect(result.current.loading).toBe(true);
    expect(result.current.topics).toEqual([]);
    vi.useRealTimers();
  });
});
