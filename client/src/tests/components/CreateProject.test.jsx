import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import CreateProject from '../../components/Projects/CreateProject';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../components/User/NavBar.jsx', () => ({ default: () => <div>nav</div> }));
vi.mock('../../components/Projects/StripePaymentModal', () => ({ default: () => <div>payment-modal</div> }));

describe('CreateProject component', () => {
  it('renders existing projects empty state and toggles form', async () => {
    axios.get.mockResolvedValueOnce({ data: { projects: [] } });

    render(
      <MemoryRouter>
        <CreateProject />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/no projects available/i)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /new project/i }));
    expect(screen.getByText(/create new project/i)).toBeInTheDocument();
  });
});
