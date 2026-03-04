import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RecruiterNavbar from './RecruiterNavbar';
import { fetchJobs, createJob, deleteJob, toggleJobActive, clearJobsError, fetchDashboard } from '../../store/recruiterSlice';
import '../../styles/Recruiter.css';

const RecruiterJobs = () => {
    const dispatch = useDispatch();
    
    // Redux state
    const { list: postedJobs, loading, error } = useSelector(state => state.recruiter.jobs);
    
    const [notification, setNotification] = useState({ show: false, message: '' });
    
    // Filter state
    const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'active', 'inactive'

    // Form state
    const [formData, setFormData] = useState({
        jobTitle: '',
        companyName: '',
        description: '',
        salaryRange: '',
        skills: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    
    // Custom questions state
    const [customQuestions, setCustomQuestions] = useState([]);
    const [stagedQuestion, setStagedQuestion] = useState(null);
    const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);

    const MAX_TITLE = 100;
    const MAX_DESC = 2000;
    const MAX_COMPANY = 100;

    useEffect(() => {
        dispatch(fetchJobs());
    }, [dispatch]);

    // Handle Redux errors
    useEffect(() => {
        if (error) {
            showNotification(error);
            dispatch(clearJobsError());
        }
    }, [error, dispatch]);

    const showNotification = (message) => {
        setNotification({ show: true, message });
        setTimeout(() => setNotification({ show: false, message: '' }), 3000);
    };

    // Normalize string: trim and collapse whitespace
    const normalizedString = (str) => {
        if (!str) return '';
        return String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    };

    const validateTitle = (v) => {
        const norm = normalizedString(v);
        if (!norm) return 'Title must be at least 3 letters';
        if (!/^[A-Za-z ]+$/.test(norm)) return 'Title can only contain letters and spaces';
        const lettersOnly = norm.replace(/\s+/g, '');
        if (lettersOnly.length < 3) return 'Title must be at least 3 letters';
        if (norm.length > MAX_TITLE) return `Title cannot exceed ${MAX_TITLE} characters`;
        return '';
    };

    const validateDescription = (v) => {
        const norm = normalizedString(v);
        if (!norm) return 'Description must be at least 10 letters';
        if (!/^[A-Za-z ]+$/.test(norm)) return 'Description can only contain letters and spaces';
        const lettersOnly = norm.replace(/\s+/g, '');
        if (lettersOnly.length < 10) return 'Description must be at least 10 letters';
        if (norm.length > MAX_DESC) return `Description cannot exceed ${MAX_DESC} characters`;
        return '';
    };

    const validatePay = (v) => {
        const val = (v || '').trim();
        if (!val) return 'Please enter a valid pay/salary';
        const salaryRegex = /^[\s\d,.\-$£€₹kKmM]+$/;
        if (!salaryRegex.test(val)) return 'Please enter a numeric salary or range (e.g. $80,000 - $120,000)';
        if (!/\d/.test(val)) return 'Please include a numeric amount';
        return '';
    };

    const validateSkills = (v) => {
        if (!v) return 'Please list at least one required skill';
        const items = v.split(',').map(s => normalizedString(s)).filter(Boolean);
        if (items.length === 0) return 'Please list at least one required skill';
        for (const item of items) {
            if (!/^[A-Za-z ]+$/.test(item)) return 'Each skill can only contain letters and spaces';
        }
        return '';
    };

    const validateCompanyName = (v) => {
        const norm = normalizedString(v);
        if (!norm) return 'Company name must be at least 2 letters';
        if (!/^[A-Za-z ]+$/.test(norm)) return 'Company name can only contain letters and spaces';
        const lettersOnly = norm.replace(/\s+/g, '');
        if (lettersOnly.length < 2) return 'Company name must be at least 2 letters';
        if (norm.length > MAX_COMPANY) return `Company name cannot exceed ${MAX_COMPANY} characters`;
        return '';
    };

    const isFormValid = () => {
        return !validateTitle(formData.jobTitle) && 
               !validateCompanyName(formData.companyName) &&
               !validateDescription(formData.description) && 
               !validatePay(formData.salaryRange) && 
               !validateSkills(formData.skills);
    };

    // Custom Questions Handlers
    const addCustomQuestion = (type) => {
        const newQuestion = {
            id: Date.now(),
            type: type, // 'yesno', 'text', 'multiline', 'multiple'
            question: '',
            required: false,
            options: type === 'multiple' ? ['Option 1', 'Option 2'] : []
        };
        setStagedQuestion(newQuestion);
    };

    const confirmAddQuestion = () => {
        if (stagedQuestion && stagedQuestion.question.trim() !== '') {
            setCustomQuestions([...customQuestions, stagedQuestion]);
            setStagedQuestion(null);
        }
    };

    const cancelStagedQuestion = () => {
        setStagedQuestion(null);
    };

    const updateStagedQuestion = (field, value) => {
        if (stagedQuestion) {
            setStagedQuestion({ ...stagedQuestion, [field]: value });
        }
    };

    const addStagedOption = () => {
        if (stagedQuestion && stagedQuestion.type === 'multiple') {
            setStagedQuestion({
                ...stagedQuestion,
                options: [...stagedQuestion.options, `Option ${stagedQuestion.options.length + 1}`]
            });
        }
    };

    const updateStagedOption = (index, value) => {
        if (stagedQuestion) {
            const updatedOptions = [...stagedQuestion.options];
            updatedOptions[index] = value;
            setStagedQuestion({ ...stagedQuestion, options: updatedOptions });
        }
    };

    const removeStagedOption = (index) => {
        if (stagedQuestion && stagedQuestion.options.length > 2) {
            setStagedQuestion({
                ...stagedQuestion,
                options: stagedQuestion.options.filter((_, i) => i !== index)
            });
        }
    };

    const updateQuestion = (id, field, value) => {
        setCustomQuestions(customQuestions.map(q => 
            q.id === id ? { ...q, [field]: value } : q
        ));
    };

    const removeQuestion = (id) => {
        setCustomQuestions(customQuestions.filter(q => q.id !== id));
    };

    const addOption = (questionId) => {
        setCustomQuestions(customQuestions.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    options: [...q.options, `Option ${q.options.length + 1}`]
                };
            }
            return q;
        }));
    };

    const updateOption = (questionId, optionIndex, value) => {
        setCustomQuestions(customQuestions.map(q => {
            if (q.id === questionId) {
                const newOptions = [...q.options];
                newOptions[optionIndex] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const removeOption = (questionId, optionIndex) => {
        setCustomQuestions(customQuestions.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    options: q.options.filter((_, i) => i !== optionIndex)
                };
            }
            return q;
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        let error = '';
        
        switch (name) {
            case 'jobTitle':
                error = validateTitle(value);
                break;
            case 'companyName':
                error = validateCompanyName(value);
                break;
            case 'description':
                error = validateDescription(value);
                break;
            case 'salaryRange':
                error = validatePay(value);
                break;
            case 'skills':
                error = validateSkills(value);
                break;
            default:
                break;
        }
        
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const title = normalizedString(formData.jobTitle);
        const companyName = normalizedString(formData.companyName);
        const description = normalizedString(formData.description);
        const salaryRange = normalizedString(formData.salaryRange);
        const skillsTokens = formData.skills.split(',').map(s => normalizedString(s)).filter(Boolean);
        const skills = skillsTokens.join(', ');

        const tErr = validateTitle(title);
        const cErr = validateCompanyName(companyName);
        const dErr = validateDescription(description);
        const pErr = validatePay(salaryRange);
        const sErr = validateSkills(skills);

        setErrors({
            jobTitle: tErr,
            companyName: cErr,
            description: dErr,
            salaryRange: pErr,
            skills: sErr
        });

        if (tErr || cErr || dErr || pErr || sErr) {
            return;
        }

        setIsSubmitting(true);

        try {
            const jobPayload = { 
                jobTitle: title, 
                companyName: companyName,
                description, 
                salaryRange, 
                skills,
                customQuestions: customQuestions.filter(q => q.question.trim() !== '')
            };
            
            const result = await dispatch(createJob(jobPayload)).unwrap();
            if (result.success) {
                showNotification('Job created successfully!');
                setFormData({ jobTitle: '', companyName: '', description: '', salaryRange: '', skills: '' });
                setCustomQuestions([]);
                setStagedQuestion(null);
                setShowForm(false);
                dispatch(fetchJobs()); // Refresh jobs list
                dispatch(fetchDashboard()); // Refresh dashboard metrics
            } else {
                showNotification(result.error || 'Failed to create job');
            }
        } catch (err) {
            console.error('Error creating job:', err);
            const message = typeof err === 'string' ? err : (err?.message || 'Verification under progress');
            showNotification(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;

        try {
            await dispatch(deleteJob(jobId)).unwrap();
            showNotification('Job deleted successfully!');
            dispatch(fetchDashboard()); // Refresh dashboard metrics
        } catch (error) {
            console.error('Error deleting job:', error);
            showNotification('An error occurred');
        }
    };

    const handleToggleActive = async (jobId, currentActive) => {
        const action = currentActive ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this job?`)) return;

        try {
            await dispatch(toggleJobActive({ jobId, active: !currentActive })).unwrap();
            showNotification(`Job ${action}d successfully!`);
        } catch (error) {
            console.error(`Error ${action}ing job:`, error);
            showNotification('An error occurred');
        }
    };

    // Compute counts directly from the live jobs list (always accurate)
    const totalCount = postedJobs.length;
    const activeCount = postedJobs.filter(job => job.active === true || job.active === 1).length;
    const inactiveCount = postedJobs.filter(job => !job.active || job.active === 0).length;

    // Filter jobs based on selected filter
    const getFilteredJobs = () => {
        if (selectedFilter === 'active') {
            return postedJobs.filter(job => job.active === true || job.active === 1);
        } else if (selectedFilter === 'inactive') {
            return postedJobs.filter(job => !job.active || job.active === 0);
        }
        return postedJobs; // 'all' or default
    };

    const filteredJobs = getFilteredJobs();

    return (
        <div className="recruiter-jobs-body">
            <RecruiterNavbar />

            {/* Main Container with Sidebar Layout */}
            <div className="recruiter-jobs-main-wrapper">
                {/* Left Sidebar - Stats Cards */}
                <aside className="recruiter-jobs-sidebar">
                    <h3 className="recruiter-sidebar-title">Quick Filters</h3>
                    
                    <div 
                        className={`recruiter-stat-card ${selectedFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedFilter('all')}
                    >
                        <div className="recruiter-stat-icon">All</div>
                        <div className="recruiter-stat-number">{totalCount}</div>
                    </div>

                    <div 
                        className={`recruiter-stat-card ${selectedFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setSelectedFilter('active')}
                    >
                        <div className="recruiter-stat-icon">Active</div>
                        <div className="recruiter-stat-number">{activeCount}</div>
                    </div>

                    <div 
                        className={`recruiter-stat-card ${selectedFilter === 'inactive' ? 'active' : ''}`}
                        onClick={() => setSelectedFilter('inactive')}
                    >
                        <div className="recruiter-stat-icon">Inactive</div>
                        <div className="recruiter-stat-number">{inactiveCount}</div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="recruiter-jobs-main-content">
                    {/* Page Header with Create Button */}
                    <div className="recruiter-jobs-header">
                        {!showForm ? (
                            <>
                                <div className="recruiter-page-title-wrapper">
                                    <h1 className="recruiter-page-main-title">Job Management</h1>
                                    <p className="recruiter-page-subtitle">Create and manage your job postings</p>
                                </div>
                                
                                {/* Create Job Button - Centered */}
                                <button 
                                    className="recruiter-create-job-btn"
                                    onClick={() => setShowForm(true)}
                                >
                                    <span className="recruiter-btn-icon">+</span>
                                    Create New Job
                                </button>
                            </>
                        ) : (
                            <div className="recruiter-page-title-wrapper">
                                <h1 className="recruiter-page-main-title">Create Job Posting</h1>
                                <p className="recruiter-page-subtitle">Fill in the details for your new job posting</p>
                            </div>
                        )}
                    </div>

                    {/* Job Creation Form Modal */}
                    {showForm && (
                        <div className="recruiter-form-overlay">
                            <div className="recruiter-form-modal">
                                <div className="recruiter-form-modal-header">
                                    <h2>Create New Job Posting</h2>
                                    <button 
                                        className="recruiter-close-form-btn"
                                        onClick={() => {
                                            setShowForm(false);
                                            setFormData({ jobTitle: '', description: '', salaryRange: '', skills: '' });
                                            setCustomQuestions([]);
                                            setErrors({});
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <form onSubmit={handleSubmit} noValidate className="recruiter-job-form">
                                    <div className="recruiter-form-section">
                                        <h3 className="recruiter-section-title">Basic Information</h3>
                                        
                                        <div className="recruiter-form-group">
                                            <label htmlFor="jobTitle">Job Title <span className="required">*</span></label>
                                            <input 
                                                type="text" 
                                                id="jobTitle" 
                                                name="jobTitle"
                                                placeholder="e.g. Senior Frontend Developer" 
                                                value={formData.jobTitle}
                                                onChange={handleInputChange}
                                                onBlur={handleBlur}
                                                maxLength={MAX_TITLE}
                                                className={errors.jobTitle ? 'invalid' : ''}
                                            />
                                            <div className="recruiter-char-counter">
                                                {normalizedString(formData.jobTitle).length}/{MAX_TITLE}
                                            </div>
                                            {errors.jobTitle && (
                                                <div className="recruiter-error-message">{errors.jobTitle}</div>
                                            )}
                                        </div>

                                        <div className="recruiter-form-group">
                                            <label htmlFor="companyName">Company Name <span className="required">*</span></label>
                                            <input 
                                                type="text" 
                                                id="companyName" 
                                                name="companyName"
                                                placeholder="e.g. Microsoft Corporation" 
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                onBlur={handleBlur}
                                                maxLength={MAX_COMPANY}
                                                className={errors.companyName ? 'invalid' : ''}
                                            />
                                            <div className="recruiter-char-counter">
                                                {normalizedString(formData.companyName).length}/{MAX_COMPANY}
                                            </div>
                                            {errors.companyName && (
                                                <div className="recruiter-error-message">{errors.companyName}</div>
                                            )}
                                        </div>

                                        <div className="recruiter-form-group">
                                            <label htmlFor="description">Job Description <span className="required">*</span></label>
                                            <textarea 
                                                id="description" 
                                                name="description"
                                                placeholder="Describe the job role, responsibilities, and requirements..."
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                onBlur={handleBlur}
                                                maxLength={MAX_DESC}
                                                className={errors.description ? 'invalid' : ''}
                                            />
                                            <div className="recruiter-char-counter">
                                                {normalizedString(formData.description).length}/{MAX_DESC}
                                            </div>
                                            {errors.description && (
                                                <div className="recruiter-error-message">{errors.description}</div>
                                            )}
                                        </div>

                                        <div className="recruiter-form-row">
                                            <div className="recruiter-form-group">
                                                <label htmlFor="salaryRange">Pay / Salary <span className="required">*</span></label>
                                                <input 
                                                    type="text" 
                                                    id="salaryRange" 
                                                    name="salaryRange"
                                                    placeholder="e.g. $80,000 - $120,000"
                                                    value={formData.salaryRange}
                                                    onChange={handleInputChange}
                                                    onBlur={handleBlur}
                                                    className={errors.salaryRange ? 'invalid' : ''}
                                                />
                                                {errors.salaryRange && (
                                                    <div className="recruiter-error-message">{errors.salaryRange}</div>
                                                )}
                                            </div>

                                            <div className="recruiter-form-group">
                                                <label htmlFor="skills">Required Skills <span className="required">*</span></label>
                                                <input 
                                                    type="text" 
                                                    id="skills" 
                                                    name="skills"
                                                    placeholder="e.g. JavaScript, React, Node.js"
                                                    value={formData.skills}
                                                    onChange={handleInputChange}
                                                    onBlur={handleBlur}
                                                    className={errors.skills ? 'invalid' : ''}
                                                />
                                                {errors.skills && (
                                                    <div className="recruiter-error-message">{errors.skills}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Questions Section */}
                                    <div className="recruiter-form-section">
                                        <div className="recruiter-section-header">
                                            <h3 className="recruiter-section-title">
                                                Custom Application Questions
                                                <span style={{
                                                    marginLeft: '12px',
                                                    background: customQuestions.length > 0 ? '#10b981' : '#6b7280',
                                                    color: 'white',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {customQuestions.length} {customQuestions.length === 1 ? 'Question' : 'Questions'}
                                                </span>
                                            </h3>
                                            <button 
                                                type="button"
                                                className="recruiter-toggle-questions-btn"
                                                onClick={() => setShowQuestionBuilder(!showQuestionBuilder)}
                                            >
                                                {showQuestionBuilder ? '− Hide' : '+ Add Questions'}
                                            </button>
                                        </div>
                                        <p className="recruiter-section-description">
                                            Add custom questions for candidates to answer when applying
                                        </p>

                                        {showQuestionBuilder && (
                                            <div className="recruiter-question-builder">
                                                <div className="recruiter-question-type-buttons">
                                                    <button 
                                                        type="button"
                                                        onClick={() => addCustomQuestion('yesno')}
                                                        className="recruiter-add-question-btn"
                                                        disabled={stagedQuestion !== null}
                                                    >
                                                        <span>Y/N</span> Yes/No Question
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => addCustomQuestion('text')}
                                                        className="recruiter-add-question-btn"
                                                        disabled={stagedQuestion !== null}
                                                    >
                                                        <span>TXT</span> Short Answer
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => addCustomQuestion('multiline')}
                                                        className="recruiter-add-question-btn"
                                                        disabled={stagedQuestion !== null}
                                                    >
                                                        <span>PARA</span> Paragraph
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => addCustomQuestion('multiple')}
                                                        className="recruiter-add-question-btn"
                                                        disabled={stagedQuestion !== null}
                                                    >
                                                        <span>MCQ</span> Multiple Choice
                                                    </button>
                                                </div>

                                                {/* Staged Question Editor */}
                                                {stagedQuestion && (
                                                    <div className="recruiter-staged-question">
                                                        <div className="recruiter-question-item">
                                                            <div className="recruiter-question-header-item">
                                                                <span className="recruiter-question-number">New Question</span>
                                                                <span className="recruiter-question-type-badge">
                                                                    {stagedQuestion.type === 'yesno' && 'Y/N Yes/No'}
                                                                    {stagedQuestion.type === 'text' && 'TXT Short Answer'}
                                                                    {stagedQuestion.type === 'multiline' && 'PARA Paragraph'}
                                                                    {stagedQuestion.type === 'multiple' && 'MCQ Multiple Choice'}
                                                                </span>
                                                            </div>

                                                            <input
                                                                type="text"
                                                                placeholder="Enter your question here..."
                                                                value={stagedQuestion.question}
                                                                onChange={(e) => updateStagedQuestion('question', e.target.value)}
                                                                className="recruiter-question-input"
                                                            />

                                                            {stagedQuestion.type === 'multiple' && (
                                                                <div className="recruiter-options-container">
                                                                    <label className="recruiter-options-label">Options:</label>
                                                                    {stagedQuestion.options.map((option, optIndex) => (
                                                                        <div key={optIndex} className="recruiter-option-item">
                                                                            <input
                                                                                type="text"
                                                                                value={option}
                                                                                onChange={(e) => updateStagedOption(optIndex, e.target.value)}
                                                                                className="recruiter-option-input"
                                                                                placeholder={`Option ${optIndex + 1}`}
                                                                            />
                                                                            {stagedQuestion.options.length > 2 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeStagedOption(optIndex)}
                                                                                    className="recruiter-remove-option-btn"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        type="button"
                                                                        onClick={addStagedOption}
                                                                        className="recruiter-add-option-btn"
                                                                    >
                                                                        + Add Option
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <label className="recruiter-checkbox-label">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={stagedQuestion.required}
                                                                    onChange={(e) => updateStagedQuestion('required', e.target.checked)}
                                                                />
                                                                <span>Required question</span>
                                                            </label>

                                                            {/* Add and Cancel Buttons */}
                                                            <div className="recruiter-staged-question-actions">
                                                                <button
                                                                    type="button"
                                                                    onClick={confirmAddQuestion}
                                                                    className="recruiter-confirm-question-btn"
                                                                    disabled={!stagedQuestion.question.trim()}
                                                                >
                                                                    Add Question
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelStagedQuestion}
                                                                    className="recruiter-cancel-question-btn"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* List of Added Questions */}
                                                {customQuestions.length > 0 && (
                                                    <div className="recruiter-questions-list">
                                                        <h4 className="recruiter-questions-list-title">Added Questions ({customQuestions.length})</h4>
                                                        {customQuestions.map((q, index) => (
                                                            <div key={q.id} className="recruiter-question-item recruiter-confirmed-question">
                                                                <div className="recruiter-question-header-item">
                                                                    <span className="recruiter-question-number">Q{index + 1}</span>
                                                                    <span className="recruiter-question-type-badge">
                                                                        {q.type === 'yesno' && 'Y/N Yes/No'}
                                                                        {q.type === 'text' && 'TXT Short Answer'}
                                                                        {q.type === 'multiline' && 'PARA Paragraph'}
                                                                        {q.type === 'multiple' && 'MCQ Multiple Choice'}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="recruiter-remove-question-btn"
                                                                        onClick={() => removeQuestion(q.id)}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>

                                                                <div className="recruiter-question-preview">
                                                                    <p className="recruiter-question-text">{q.question}</p>
                                                                    {q.type === 'multiple' && (
                                                                        <ul className="recruiter-options-preview">
                                                                            {q.options.map((option, idx) => (
                                                                                <li key={idx}>{option}</li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                    {q.required && <span className="recruiter-required-badge">Required</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="recruiter-form-actions">
                                        <button 
                                            type="button"
                                            className="recruiter-cancel-btn"
                                            onClick={() => {
                                                setShowForm(false);
                                                setFormData({ jobTitle: '', description: '', salaryRange: '', skills: '' });
                                                setCustomQuestions([]);
                                                setErrors({});
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="recruiter-submit-btn"
                                            disabled={!isFormValid() || isSubmitting || loading}
                                        >
                                            {isSubmitting ? 'Creating...' : 'Create Job Posting'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Job List Section */}
                    <div className="recruiter-job-list-section">
                        <div className="recruiter-jobs-list-header">
                            <h2>
                                {selectedFilter === 'all' && 'All Jobs'}
                                {selectedFilter === 'active' && 'Active Jobs'}
                                {selectedFilter === 'inactive' && 'Inactive Jobs'}
                            </h2>
                            <div className="recruiter-jobs-count">
                                {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}
                            </div>
                        </div>
                        
                        {loading ? (
                            <div className="recruiter-loading-state">
                                <div className="recruiter-spinner"></div>
                                <p>Loading jobs...</p>
                            </div>
                        ) : filteredJobs.length > 0 ? (
                            <div className="recruiter-jobs-grid">
                                {filteredJobs.map(job => (
                                        <div className="recruiter-job-card" key={job._id}>
                                            <div className="recruiter-job-header">
                                                <div className="recruiter-job-title-section">
                                                    <div className="recruiter-job-title">{job.job_title}</div>
                                                    <span className={`recruiter-job-status-badge ${job.active ? 'active' : 'inactive'}`}>
                                                        {job.active ? '● Active' : '○ Inactive'}
                                                    </span>
                                                </div>
                                                <div className="recruiter-job-actions">
                                                    <button 
                                                        className={`recruiter-toggle-btn ${job.active ? 'deactivate' : 'activate'}`}
                                                        onClick={() => handleToggleActive(job._id, job.active)}
                                                        title={job.active ? 'Deactivate job' : 'Activate job'}
                                                    >
                                                        {job.active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button 
                                                        className="recruiter-delete-btn"
                                                        onClick={() => handleDeleteJob(job._id)}
                                                        title="Delete job"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="recruiter-job-pay">{job.salary_range}</div>
                                            <div className="recruiter-job-description">{job.description}</div>
                                            <div className="recruiter-job-footer">
                                                <div className="recruiter-job-skills">
                                                    <strong>Required Skills:</strong> {job.skills}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="recruiter-empty-jobs-state">
                                    <div className="recruiter-empty-icon">No Jobs</div>
                                    <h3>
                                        {selectedFilter === 'all' && 'No Jobs Posted Yet'}
                                        {selectedFilter === 'active' && 'No Active Jobs'}
                                        {selectedFilter === 'inactive' && 'No Inactive Jobs'}
                                    </h3>
                                    <p>
                                        {selectedFilter === 'all' && 'Create your first job posting using the "Create New Job" button above.'}
                                        {selectedFilter === 'active' && 'You don\'t have any active job postings at the moment.'}
                                        {selectedFilter === 'inactive' && 'You don\'t have any inactive job postings.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                <div className={`recruiter-notification-popup ${notification.show ? 'show' : ''}`}>
                    {notification.message}
                </div>
            </div>
    );
};

export default RecruiterJobs;
