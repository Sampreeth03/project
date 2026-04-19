import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AuthProvider, useAuth } from '../../context/AuthContext';

vi.mock('axios', () => {
  const mock = { get: vi.fn(), defaults: {} };
  return { default: mock };
});

const Probe = () => {
  const { user, isAuthenticated, loginUser, logoutUser, markOnboardingComplete } = useAuth();
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="role">{user?.role || 'none'}</span>
      <span data-testid="onboarded">{String(Boolean(user?.onboardingCompleted))}</span>
      <button onClick={() => loginUser({ id: '1', role: 'student' })}>login</button>
      <button onClick={() => logoutUser()}>logout</button>
      <button onClick={() => markOnboardingComplete()}>complete</button>
    </div>
  );
};

describe('AuthContext', () => {
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('loads active session user', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, user: { id: '1', role: 'student' } } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));
    expect(screen.getByTestId('role')).toHaveTextContent('user');
  });

  it('updates and clears auth state via login/logout', async () => {
    axios.get.mockRejectedValueOnce(new Error('no session'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('user'));

    axios.get.mockResolvedValueOnce({ data: { success: true } });
    await userEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));

    await userEvent.click(screen.getByText('login'));
    await userEvent.click(screen.getByText('complete'));
    await waitFor(() => expect(screen.getByTestId('onboarded')).toHaveTextContent('true'));
  });

  it('keeps unauthenticated default state when API returns success without user', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));
    expect(screen.getByTestId('role')).toHaveTextContent('none');
  });
});
