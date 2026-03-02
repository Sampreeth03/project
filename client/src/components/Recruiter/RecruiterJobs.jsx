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
        <div className="rj-root">
            <RecruiterNavbar />

            {/* ── Top bar: filters + create button ── */}
            <div className="rj-topbar">
                <div className="rj-filters">
                    {[
                        { key: 'all',      label: 'ALL',      count: totalCount  },
                        { key: 'active',   label: 'ACTIVE',   count: activeCount   },
                        { key: 'inactive', label: 'INACTIVE', count: inactiveCount },
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`rj-filter-btn ${selectedFilter === f.key ? 'rj-filter-btn--on' : ''}`}
                            onClick={() => setSelectedFilter(f.key)}
                        >
                            {f.label}
                            <span className="rj-filter-count">{f.count}</span>
                        </button>
                    ))}
                </div>

                <div className="rj-topbar-right">
                    <div className="rj-page-meta">
                        <span className="rj-page-eyebrow">JOB MANAGEMENT</span>
                        <span className="rj-page-count">{filteredJobs.length} position{filteredJobs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <button className="rj-create-btn" onClick={() => setShowForm(true)}>
                        <span className="rj-create-icon">+</span> Post a Job
                    </button>
                </div>
            </div>

            {/* ── Job grid ── */}
            <div className="rj-content">
                {loading ? (
                    <div className="rj-loading">
                        <div className="rj-spinner" />
                        <p>Loading positions…</p>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="rj-empty">
                        <div className="rj-empty-glyph">⬡</div>
                        <h3>
                            {selectedFilter === 'all'      && 'No positions posted yet'}
                            {selectedFilter === 'active'   && 'No active positions'}
                            {selectedFilter === 'inactive' && 'No inactive positions'}
                        </h3>
                        <p>
                            {selectedFilter === 'all' && 'Hit "Post a Job" above to create your first listing.'}
                            {selectedFilter !== 'all' && 'Try switching the filter above.'}
                        </p>
                    </div>
                ) : (
                    <div className="rj-grid">
                        {filteredJobs.map((job, idx) => (
                            <div className="rj-card" key={job._id} style={{ '--idx': idx }}>
                                <div className="rj-card-accent" />

                                <div className="rj-card-head">
                                    <div className="rj-card-head-left">
                                        <span className="rj-card-idx">{String(idx + 1).padStart(2, '0')}</span>
                                        <span
                                            className="rj-card-pip"
                                            style={{ background: job.active ? '#00e07a' : '#333' }}
                                            title={job.active ? 'Active' : 'Inactive'}
                                        />
                                    </div>
                                    <div className="rj-card-actions">
                                        <button
                                            className={`rj-toggle-btn ${job.active ? 'rj-toggle-btn--off' : 'rj-toggle-btn--on'}`}
                                            onClick={() => handleToggleActive(job._id, job.active)}
                                        >
                                            {job.active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            className="rj-delete-btn"
                                            onClick={() => handleDeleteJob(job._id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="rj-card-title">{job.job_title}</div>
                                {job.company_name && <div className="rj-card-company">{job.company_name}</div>}
                                {job.salary_range  && <div className="rj-card-salary">{job.salary_range}</div>}

                                <p className="rj-card-desc">{job.description}</p>

                                {job.skills && (
                                    <div className="rj-card-skills">
                                        {job.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                            <span key={s} className="rj-skill-tag">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Create Job Modal ── */}
            {showForm && (
                <div className="rj-overlay" onClick={() => { setShowForm(false); setErrors({}); }}>
                    <div className="rj-modal" onClick={e => e.stopPropagation()}>
                        <div className="rj-modal-head">
                            <div>
                                <span className="rj-modal-eyebrow">NEW POSITION</span>
                                <h2 className="rj-modal-title">Post a Job</h2>
                            </div>
                            <button className="rj-modal-close" onClick={() => { setShowForm(false); setFormData({ jobTitle: '', companyName: '', description: '', salaryRange: '', skills: '' }); setCustomQuestions([]); setErrors({}); }}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="rj-form">

                            {/* Basic fields */}
                            <div className="rj-form-row">
                                <div className="rj-field">
                                    <label className="rj-label">Job Title <span className="rj-req">*</span></label>
                                    <input className={`rj-input ${errors.jobTitle ? 'rj-input--err' : ''}`} type="text" name="jobTitle" placeholder="e.g. Senior Frontend Developer" value={formData.jobTitle} onChange={handleInputChange} onBlur={handleBlur} maxLength={MAX_TITLE} />
                                    <div className="rj-counter">{normalizedString(formData.jobTitle).length}/{MAX_TITLE}</div>
                                    {errors.jobTitle && <div className="rj-err">{errors.jobTitle}</div>}
                                </div>
                                <div className="rj-field">
                                    <label className="rj-label">Company Name <span className="rj-req">*</span></label>
                                    <input className={`rj-input ${errors.companyName ? 'rj-input--err' : ''}`} type="text" name="companyName" placeholder="e.g. Acme Corp" value={formData.companyName} onChange={handleInputChange} onBlur={handleBlur} maxLength={MAX_COMPANY} />
                                    <div className="rj-counter">{normalizedString(formData.companyName).length}/{MAX_COMPANY}</div>
                                    {errors.companyName && <div className="rj-err">{errors.companyName}</div>}
                                </div>
                            </div>

                            <div className="rj-field">
                                <label className="rj-label">Description <span className="rj-req">*</span></label>
                                <textarea className={`rj-input rj-textarea ${errors.description ? 'rj-input--err' : ''}`} name="description" placeholder="Describe the role, responsibilities, requirements…" value={formData.description} onChange={handleInputChange} onBlur={handleBlur} maxLength={MAX_DESC} />
                                <div className="rj-counter">{normalizedString(formData.description).length}/{MAX_DESC}</div>
                                {errors.description && <div className="rj-err">{errors.description}</div>}
                            </div>

                            <div className="rj-form-row">
                                <div className="rj-field">
                                    <label className="rj-label">Salary Range <span className="rj-req">*</span></label>
                                    <input className={`rj-input ${errors.salaryRange ? 'rj-input--err' : ''}`} type="text" name="salaryRange" placeholder="e.g. $80,000 – $120,000" value={formData.salaryRange} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.salaryRange && <div className="rj-err">{errors.salaryRange}</div>}
                                </div>
                                <div className="rj-field">
                                    <label className="rj-label">Required Skills <span className="rj-req">*</span></label>
                                    <input className={`rj-input ${errors.skills ? 'rj-input--err' : ''}`} type="text" name="skills" placeholder="e.g. React, Node.js, TypeScript" value={formData.skills} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.skills && <div className="rj-err">{errors.skills}</div>}
                                </div>
                            </div>

                            {/* Custom questions */}
                            <div className="rj-section-divider">
                                <span>CUSTOM QUESTIONS</span>
                                <button type="button" className="rj-toggle-q-btn" onClick={() => setShowQuestionBuilder(!showQuestionBuilder)}>
                                    {showQuestionBuilder ? '− Hide' : '+ Add'}
                                </button>
                            </div>

                            {showQuestionBuilder && (
                                <div className="rj-qbuilder">
                                    <div className="rj-qtype-row">
                                        {[['yesno','Y/N'],['text','Short'],['multiline','Para'],['multiple','MCQ']].map(([type, label]) => (
                                            <button key={type} type="button" className="rj-qtype-btn" onClick={() => addCustomQuestion(type)} disabled={stagedQuestion !== null}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {stagedQuestion && (
                                        <div className="rj-staged">
                                            <input type="text" className="rj-input" placeholder="Enter question…" value={stagedQuestion.question} onChange={e => updateStagedQuestion('question', e.target.value)} />
                                            {stagedQuestion.type === 'multiple' && (
                                                <div className="rj-options">
                                                    {stagedQuestion.options.map((opt, i) => (
                                                        <div key={i} className="rj-opt-row">
                                                            <input className="rj-input" type="text" value={opt} onChange={e => updateStagedOption(i, e.target.value)} placeholder={`Option ${i+1}`} />
                                                            {stagedQuestion.options.length > 2 && <button type="button" className="rj-remove-opt" onClick={() => removeStagedOption(i)}>×</button>}
                                                        </div>
                                                    ))}
                                                    <button type="button" className="rj-add-opt-btn" onClick={addStagedOption}>+ Option</button>
                                                </div>
                                            )}
                                            <label className="rj-check-label">
                                                <input type="checkbox" checked={stagedQuestion.required} onChange={e => updateStagedQuestion('required', e.target.checked)} />
                                                Required
                                            </label>
                                            <div className="rj-staged-actions">
                                                <button type="button" className="rj-confirm-q-btn" disabled={!stagedQuestion.question.trim()} onClick={confirmAddQuestion}>Add Question</button>
                                                <button type="button" className="rj-cancel-q-btn" onClick={cancelStagedQuestion}>Cancel</button>
                                            </div>
                                        </div>
                                    )}

                                    {customQuestions.length > 0 && (
                                        <div className="rj-q-list">
                                            {customQuestions.map((q, i) => (
                                                <div key={q.id} className="rj-q-item">
                                                    <div className="rj-q-item-head">
                                                        <span className="rj-q-num">Q{i+1}</span>
                                                        <span className="rj-q-badge">{q.type}</span>
                                                        {q.required && <span className="rj-q-req-badge">required</span>}
                                                        <button type="button" className="rj-remove-q" onClick={() => removeQuestion(q.id)}>×</button>
                                                    </div>
                                                    <p className="rj-q-text">{q.question}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="rj-form-footer">
                                <button type="button" className="rj-cancel-submit-btn" onClick={() => { setShowForm(false); setFormData({ jobTitle: '', companyName: '', description: '', salaryRange: '', skills: '' }); setCustomQuestions([]); setErrors({}); }}>Cancel</button>
                                <button type="submit" className="rj-submit-btn" disabled={!isFormValid() || isSubmitting || loading}>
                                    {isSubmitting ? 'Posting…' : 'Post Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* toast */}
            <div className={`rj-toast ${notification.show ? 'rj-toast--show' : ''}`}>
                <span className="rj-toast-dot" />
                {notification.message}
            </div>
        </div>
    );
};

export default RecruiterJobs;
