import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Login from '../../components/Auth/Login';

const navigate = vi.fn();
const loginUser = vi.fn();

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ loginUser }) }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

describe('Login component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables submit until valid credentials are entered', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /enter details/i });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'Pass@123');

    await waitFor(() => expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled());
  });

  it('shows backend failure in credentials step', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid email or password' } } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'Pass@123');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
  });
});
