// client/src/hooks/useCreateProjectValidation.js

import { useState, useCallback } from 'react';

// Utility to normalize string (removes excessive whitespace, handles EJS logic)
const normalizedString = (str) => {
    if (!str) return '';
    let s = String(str).replace(/[\u200B-\u200D\uFEFF]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
};

// --- EJS VALIDATION FUNCTIONS PORTED TO JS ---

export const validateTitle = (value) => {
    const norm = normalizedString(value);
    if (!norm) return 'Project name is required';
    const regex = /^[A-Za-z0-9][A-Za-z0-9 .,'\-()]*$/; 
    if (!regex.test(norm)) return 'Project name contains invalid characters';
    if (norm.length < 3) return 'Project name must be at least 3 characters';
    if (norm.length > 100) return 'Project name cannot exceed 100 characters';
    return '';
};

export const validateDescription = (value) => {
    const norm = normalizedString(value);
    if (!norm || norm.length < 10) return 'Description must be at least 10 characters';
    if (norm.length > 500) return 'Description cannot exceed 500 characters';
    return '';
};

export const validateTopic = (value) => {
    if (!value || value === 'Select a topic') return 'Please select a topic';
    return '';
};

export const validateCapacity = (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 3) return 'Capacity must be at least 3';
    if (num > 20) return 'Capacity cannot exceed 20';
    return '';
};

export const validateDeadline = (value) => {
    if (!value) return 'Deadline is required';
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate <= today) return 'Deadline must be a future date';
    return '';
};

export const useCreateProjectValidation = (initialData) => {
    const [formData, setFormData] = useState(initialData);

    const validation = {
        title: validateTitle(formData.title),
        description: validateDescription(formData.description),
        topic: validateTopic(formData.topic),
        capacity: validateCapacity(formData.capacity),
        deadline: validateDeadline(formData.deadline),
    };

    const isFormValid = Object.values(validation).every(msg => msg === '');

    // CRITICAL: Return setFormData as updateField to maintain state integrity
    const updateField = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // Specifically return the setter function for loading drafts
    const setFormDataDirectly = setFormData; 

    return {
        formData,
        validation,
        isFormValid,
        updateField,
        setFormDataDirectly, // EXPOSED FOR loadFormDraft FIX
        normalizedString 
    };
};