import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectForm from '../../components/Projects/ProjectForm';

describe('ProjectForm component', () => {
  it('shows validation and triggers callbacks', async () => {
    const updateField = vi.fn();
    const handleSubmit = vi.fn((e) => e.preventDefault());

    render(
      <ProjectForm
        formData={{ title: '', description: '', topic: '', capacity: 3, deadline: '' }}
        validation={{ title: 'required', description: '', topic: '', capacity: '', deadline: '' }}
        isFormValid={false}
        updateField={updateField}
        handleSubmit={handleSubmit}
        titleFeedback={{ count: '0/100', class: '' }}
        descFeedback={{ count: '0/500', class: '' }}
        isSaving={false}
      />
    );

    expect(screen.getByText('required')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /create project/i }));
    expect(handleSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(updateField).toHaveBeenCalled();
  });
});
