import { renderHook, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

vi.mock('axios', () => {
  const mock = { get: vi.fn() };
  return { default: mock };
});

describe('useUnreadMessages', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('fetches unread counts and computes totals', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, unreadCounts: { p1: 2, p2: 3 } }
    });

    const { result } = renderHook(() => useUnreadMessages(null, 99999));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getUnreadCount('p1')).toBe(2);
    expect(result.current.getUnreadCount('missing')).toBe(0);
    expect(result.current.getTotalUnread()).toBe(5);
  });

  it('keeps empty counts when request fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useUnreadMessages(null, 99999));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.unreadCounts).toEqual({});
    expect(result.current.getTotalUnread()).toBe(0);
  });

  it('refresh re-fetches counts and updates totals', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { success: true, unreadCounts: { p1: 1 } } })
      .mockResolvedValueOnce({ data: { success: true, unreadCounts: { p1: 4, p2: 1 } } });

    const { result } = renderHook(() => useUnreadMessages(null, 99999));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getTotalUnread()).toBe(1);

    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.getTotalUnread()).toBe(5));
  });
});
