import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ProjectsList from '../../components/Projects/ProjectsList';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../components/User/NavBar.jsx', () => ({ default: () => <div>nav</div> }));
vi.mock('../../components/User/OnboardingToast.jsx', () => ({ ProjectsWelcomeToast: () => null }));
vi.mock('../../hooks/useDebouncedValue', () => ({ default: (v) => v }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'user' } }) }));

describe('ProjectsList component', () => {
  it('renders created projects from API', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          createdProjects: [{ _id: 'p1', title: 'Project One', description: 'desc', topic: 'web-dev', capacity: 3 }],
          availableProjects: []
        }
      })
      .mockResolvedValueOnce({ data: { success: true, projects: [] } })
      .mockResolvedValueOnce({ data: { source: 'solr', data: [], meta: {} } })
      .mockResolvedValueOnce({ data: { source: 'solr', data: [], meta: {} } });

    render(
      <MemoryRouter>
        <ProjectsList />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/my created projects/i)).toBeInTheDocument());
    expect(screen.getByText('Project One')).toBeInTheDocument();
  });
});
