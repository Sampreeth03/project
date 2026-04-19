import { renderHook, act } from '@testing-library/react';
import {
  useCreateProjectValidation,
  validateTitle,
  validateDescription,
  validateTopic,
  validateCapacity,
  validateDeadline
} from '../../hooks/useCreateProjectValidation';

describe('useCreateProjectValidation', () => {
  it('flags invalid initial fields and becomes valid after updates', () => {
    const { result } = renderHook(() =>
      useCreateProjectValidation({ title: '', description: '', topic: '', capacity: 1, deadline: '' })
    );

    expect(result.current.isFormValid).toBe(false);
    expect(result.current.validation.title).toContain('required');

    act(() => {
      result.current.updateField('title', 'Build AI Study Helper');
      result.current.updateField('description', 'A longer valid description for testing form logic.');
      result.current.updateField('topic', 'web-dev');
      result.current.updateField('capacity', 3);
      result.current.updateField('deadline', '2099-01-01');
    });

    expect(result.current.isFormValid).toBe(true);
  });

  it('exposes validator edge cases for title/description/topic/capacity/deadline', () => {
    expect(validateTitle('')).toContain('required');
    expect(validateTitle('@@bad')).toContain('invalid');
    expect(validateDescription('tiny')).toContain('at least 10');
    expect(validateTopic('Select a topic')).toContain('select a topic');
    expect(validateCapacity(1)).toContain('at least 3');
    expect(validateCapacity(50)).toContain('cannot exceed 20');
    expect(validateDeadline('')).toContain('required');
  });

  it('supports direct form state update API', () => {
    const { result } = renderHook(() =>
      useCreateProjectValidation({ title: '', description: '', topic: '', capacity: 3, deadline: '' })
    );

    act(() => {
      result.current.setFormDataDirectly({
        title: 'Project Alpha',
        description: 'Valid description that is long enough.',
        topic: 'web-dev',
        capacity: 5,
        deadline: '2099-01-01'
      });
    });

    expect(result.current.formData.title).toBe('Project Alpha');
    expect(result.current.isFormValid).toBe(true);
  });
});
