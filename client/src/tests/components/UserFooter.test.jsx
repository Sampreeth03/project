import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserFooter from '../../components/User/UserFooter';

describe('UserFooter component', () => {
  it('renders footer links and current year', () => {
    render(
      <MemoryRouter>
        <UserFooter />
      </MemoryRouter>
    );

    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });
});
