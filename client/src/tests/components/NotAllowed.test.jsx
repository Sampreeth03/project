import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotAllowed from '../../components/Auth/NotAllowed';

const navigate = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

describe('NotAllowed component', () => {
  it('navigates user to role dashboard', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });
    render(<NotAllowed />);

    await userEvent.click(screen.getByRole('button', { name: /go to my dashboard/i }));
    expect(navigate).toHaveBeenCalledWith('/admin');
  });
});
