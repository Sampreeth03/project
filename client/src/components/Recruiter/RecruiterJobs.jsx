import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RecruiterNavbar from './RecruiterNavbar';
import { fetchJobs, createJob, deleteJob, toggleJobActive, clearJobsError } from '../../store/recruiterSlice';
import '../../styles/Recruiter.css';

const RecruiterJobs = () => {
    const dispatch = useDispatch();
    
    // Redux state
    const { list: postedJobs, totalJobs, activeJobs, loading, error } = useSelector(state => state.recruiter.jobs);
    
    const [notification, setNotification] = useState({ show: false, message: '' });

    // Form state
    const [formData, setFormData] = useState({
        jobTitle: '',
        description: '',
        salaryRange: '',
        skills: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const MAX_TITLE = 100;
    const MAX_DESC = 2000;

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

    const isFormValid = () => {
        return !validateTitle(formData.jobTitle) && 
               !validateDescription(formData.description) && 
               !validatePay(formData.salaryRange) && 
               !validateSkills(formData.skills);
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
        const description = normalizedString(formData.description);
        const salaryRange = normalizedString(formData.salaryRange);
        const skillsTokens = formData.skills.split(',').map(s => normalizedString(s)).filter(Boolean);
        const skills = skillsTokens.join(', ');

        const tErr = validateTitle(title);
        const dErr = validateDescription(description);
        const pErr = validatePay(salaryRange);
        const sErr = validateSkills(skills);

        setErrors({
            jobTitle: tErr,
            description: dErr,
            salaryRange: pErr,
            skills: sErr
        });

        if (tErr || dErr || pErr || sErr) {
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await dispatch(createJob({ jobTitle: title, description, salaryRange, skills })).unwrap();
            if (result.success) {
                showNotification('Job created successfully!');
                setFormData({ jobTitle: '', description: '', salaryRange: '', skills: '' });
                dispatch(fetchJobs()); // Refresh jobs list
            } else {
                showNotification(result.error || 'Failed to create job');
            }
        } catch (err) {
            console.error('Error creating job:', err);
            showNotification('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;

        try {
            await dispatch(deleteJob(jobId)).unwrap();
            showNotification('Job deleted successfully!');
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

    return (
        <div className="recruiter-jobs-body">
            <RecruiterNavbar />

            <div className="recruiter-jobs-container">
                <div className="recruiter-stats-section">
                    <div className="recruiter-stat-box">
                        <div className="recruiter-stat-number">{totalJobs}</div>
                        <div className="recruiter-stat-title">Total Jobs</div>
                    </div>
                    <div className="recruiter-stat-box">
                        <div className="recruiter-stat-number">{activeJobs}</div>
                        <div className="recruiter-stat-title">Active Jobs</div>
                    </div>
                </div>
            </div>

            <main>
                <div className="recruiter-jobs-container">
                    <div className="recruiter-app-container">
                        <div className="recruiter-form-container">
                            <div className="recruiter-card">
                                <h2>Create a New Job</h2>
                                <form onSubmit={handleSubmit} noValidate>
                                    <div className="recruiter-form-group">
                                        <label htmlFor="jobTitle">Job Title</label>
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
                                        <label htmlFor="description">Job Description</label>
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

                                    <div className="recruiter-form-group">
                                        <label htmlFor="salaryRange">Pay / Salary</label>
                                        <input 
                                            type="text" 
                                            id="salaryRange" 
                                            name="salaryRange"
                                            placeholder="e.g. $80,000 - $120,000 per year"
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
                                        <label htmlFor="skills">Required Skills</label>
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

                                    <button 
                                        type="submit" 
                                        className="recruiter-submit-btn"
                                        disabled={!isFormValid() || isSubmitting || loading}
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Job'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="recruiter-job-list-container">
                            <div className="recruiter-card">
                                <h2>Posted Jobs</h2>
                                {loading ? (
                                    <p>Loading jobs...</p>
                                ) : postedJobs.length > 0 ? (
                                    postedJobs.map(job => (
                                        <div className="recruiter-job-card" key={job._id}>
                                            <div className="recruiter-job-header">
                                                <div>
                                                    <div className="recruiter-job-title">{job.job_title}</div>
                                                    <div className="recruiter-job-pay">{job.salary_range}</div>
                                                </div>
                                                <div className="recruiter-job-actions">
                                                    <button 
                                                        className={`recruiter-toggle-btn ${job.active ? 'deactivate' : 'activate'}`}
                                                        onClick={() => handleToggleActive(job._id, job.active)}
                                                    >
                                                        {job.active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button 
                                                        className="recruiter-delete-btn"
                                                        onClick={() => handleDeleteJob(job._id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="recruiter-job-description">{job.description}</div>
                                            <div className="recruiter-job-skills">
                                                <strong>Skills:</strong> {job.skills}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p>No jobs posted yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <div className={`recruiter-notification-popup ${notification.show ? 'show' : ''}`}>
                {notification.message}
            </div>
        </div>
    );
};

export default RecruiterJobs;
