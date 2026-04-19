import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../components/Auth/ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => mockUseAuth() }));

describe('ProtectedRoute component', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders children for authenticated user with matching role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });

    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/secure" element={<ProtectedRoute allowedRoles={['admin']}><div>secure</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('secure')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/secure" element={<ProtectedRoute><div>secure</div></ProtectedRoute>} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('denies wrong role and routes to not-allowed', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'recruiter' } });

    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/secure" element={<ProtectedRoute allowedRoles={['admin']}><div>secure</div></ProtectedRoute>} />
          <Route path="/not-allowed" element={<div>not-allowed-page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('not-allowed-page')).toBeInTheDocument();
  });
});
