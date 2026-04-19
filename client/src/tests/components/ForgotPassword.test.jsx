import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ForgotPassword from '../../components/Auth/ForgotPassword';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

describe('ForgotPassword component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates email before submission', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'bad-email');
    expect(screen.getByRole('button', { name: /enter email/i })).toBeDisabled();
  });

  it('moves to OTP step on successful request', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() => expect(screen.getByPlaceholderText(/enter 4-digit code/i)).toBeInTheDocument());
  });
});
