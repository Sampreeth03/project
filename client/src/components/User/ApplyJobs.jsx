import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './NavBar.jsx';
import '../../styles/ApplyJobs.css';

const ApplyJobs = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customAnswers, setCustomAnswers] = useState({});
    const [attemptedSubmit, setAttemptedSubmit] = useState({}); // Track submit attempts per job
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'applied', 'notapplied'

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchJobs();
    }, [user, navigate]);

    const fetchJobs = async () => {
        try {
            const response = await fetch('/apply', {
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch jobs');
            }

            const data = await response.json();
            const normalizedJobs = (data.jobs || []).map(job => ({
                ...job,
                custom_questions: Array.isArray(job.custom_questions) ? job.custom_questions : []
            }));
            setJobs(normalizedJobs);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    const isAllowedResume = (file) => {
        if (!file) return false;
        const allowedExt = ['pdf', 'doc', 'docx'];
        const name = file.name || '';
        const ext = name.split('.').pop().toLowerCase();
        return allowedExt.includes(ext);
    };

    const handleFileChange = (jobId, file) => {
        if (!file) return;

        if (!isAllowedResume(file)) {
            showNotification('Please upload a valid resume file (PDF, DOC, or DOCX).', 'error');
            const input = document.getElementById(`resume-${jobId}`);
            if (input) input.value = '';
            return;
        }

        setJobs(prevJobs =>
            prevJobs.map(job =>
                job.id === jobId ? { ...job, resumeSelected: true, resumeFile: file } : job
            )
        );

        if (selectedJob && selectedJob.id === jobId) {
            setSelectedJob({ ...selectedJob, resumeSelected: true, resumeFile: file });
        }
    };

    const handleCancelResume = (jobId) => {
        const input = document.getElementById(`resume-${jobId}`);
        if (input) input.value = '';
        setJobs(prevJobs =>
            prevJobs.map(job =>
                job.id === jobId ? { ...job, resumeSelected: false, resumeFile: null } : job
            )
        );
        if (selectedJob && selectedJob.id === jobId) {
            setSelectedJob({ ...selectedJob, resumeSelected: false, resumeFile: null });
        }
    };

    const handleCustomAnswerChange = (jobId, questionId, value) => {
        setCustomAnswers(prev => ({
            ...prev,
            [jobId]: {
                ...prev[jobId],
                [questionId]: value
            }
        }));
    };

    // Check if all required questions are answered for a job
    const areRequiredQuestionsAnswered = (job) => {
        if (!job.custom_questions || job.custom_questions.length === 0) {
            return true; // No questions, so all requirements met
        }
        
        const jobAnswers = customAnswers[job.id] || {};
        for (const question of job.custom_questions) {
            if (question.required) {
                const answer = jobAnswers[question.id];
                // Check if answer exists and is not just whitespace
                if (!answer || (typeof answer === 'string' && answer.trim().length === 0)) {
                    return false; // Required question not answered properly
                }
            }
        }
        return true; // All required questions answered
    };

    const handleApply = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job || job.hasApplied) return;

        // Mark that submit was attempted for this job
        setAttemptedSubmit(prev => ({ ...prev, [jobId]: true }));

        // Check if resume is uploaded
        if (!job.resumeSelected) {
            showNotification('Please upload your resume first.', 'error');
            return;
        }

        // Check if all required questions are answered
        if (!areRequiredQuestionsAnswered(job)) {
            showNotification('Please answer all required questions.', 'error');
            return;
        }

        const fileInput = document.getElementById(`resume-${jobId}`);
        if (!fileInput || !fileInput.files.length) {
            showNotification('Please select a resume file.', 'error');
            return;
        }

        const file = fileInput.files[0];
        if (!isAllowedResume(file)) {
            showNotification('Please upload a valid resume file (PDF, DOC, or DOCX).', 'error');
            fileInput.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('resume', file);
        formData.append('jobId', jobId);
        
        // Add custom question answers if they exist
        if (job.custom_questions && job.custom_questions.length > 0) {
            const answers = customAnswers[jobId] || {};
            formData.append('customAnswers', JSON.stringify(answers));
        }

        try {
            const response = await fetch('/apply-job', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Application submitted successfully!', 'success');
                
                setJobs(prevJobs =>
                    prevJobs.map(j =>
                        j.id === jobId
                            ? { ...j, hasApplied: true, resumeSelected: false }
                            : j
                    )
                );

                if (selectedJob && selectedJob.id === jobId) {
                    setSelectedJob({ ...selectedJob, hasApplied: true, resumeSelected: false });
                }

                // Clear custom answers for this job
                setCustomAnswers(prev => {
                    const updated = { ...prev };
                    delete updated[jobId];
                    return updated;
                });

                if (fileInput) {
                    fileInput.value = '';
                    fileInput.disabled = true;
                }
            } else {
                showNotification(data.error || 'Failed to apply', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to apply. Please try again.', 'error');
        }
    };

    const handleJobClick = (job) => {
        // Ensure custom_questions is always an array
        const normalizedJob = {
            ...job,
            custom_questions: Array.isArray(job.custom_questions) ? job.custom_questions : []
        };
        setSelectedJob(normalizedJob);
        // Reset attempted submit state when switching jobs
        setAttemptedSubmit(prev => ({ ...prev, [job.id]: false }));
    };

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: 'Job Opportunities',
                text: 'Check out these amazing job opportunities!',
                url: url,
            }).catch(() => {
                // Fallback to clipboard
                copyToClipboard(url);
            });
        } else {
            copyToClipboard(url);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy link', 'error');
        });
    };

    // Filter jobs based on search query and filter status
    const filteredJobs = jobs.filter(job => {
        // Search filter
        const matchesSearch = searchQuery === '' || 
            job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (job.skills && job.skills.toLowerCase().includes(searchQuery.toLowerCase()));

        // Status filter
        const matchesStatus = 
            filterStatus === 'all' ||
            (filterStatus === 'applied' && job.hasApplied) ||
            (filterStatus === 'notapplied' && !job.hasApplied);

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="apply-jobs-container">
                    <div className="loading-state">Loading jobs...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Navbar />
                <div className="apply-jobs-container">
                    <div className="error-state">
                        <h2>Error loading jobs</h2>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="apply-jobs-page">
            <Navbar />
            <div className="apply-jobs-split-container">
                {/* Left Panel - Jobs List */}
                <div className="jobs-list-panel">
                    <div className="jobs-list-header">
                        <div className="jobs-list-header-top">
                            <h2 className="jobs-list-title">Job Openings</h2>
                        </div>
                        
                        <div className="search-filter-section">
                            <div className="search-bar">
                                <input 
                                    type="text" 
                                    className="search-input" 
                                    placeholder="Search jobs by title, company, or skills..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            <div className="filter-buttons">
                                <button 
                                    className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('all')}
                                >
                                    All
                                </button>
                                <button 
                                    className={`filter-btn ${filterStatus === 'applied' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('applied')}
                                >
                                    Applied
                                </button>
                                <button 
                                    className={`filter-btn ${filterStatus === 'notapplied' ? 'active' : ''}`}
                                    onClick={() => setFilterStatus('notapplied')}
                                >
                                    Not Applied
                                </button>
                            </div>
                        </div>
                    </div>

                    {filteredJobs.length === 0 ? (
                        <div className="no-jobs-message">
                            <p>No jobs found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="jobs-list-container">
                            {filteredJobs.map((job) => (
                                <div
                                    key={job.id}
                                    className={`job-list-item ${selectedJob?.id === job.id ? 'active' : ''} ${job.hasApplied ? 'applied' : ''}`}
                                    onClick={() => handleJobClick(job)}
                                >
                                    <div className="job-list-item-header">
                                        <h3 className="job-list-title">{job.job_title}</h3>
                                        {job.hasApplied && <span className="applied-indicator">Applied</span>}
                                    </div>
                                    <div className="job-list-company">{job.company_name}</div>
                                    <div className="job-list-salary">{job.salary_range}</div>
                                    {job.custom_questions && job.custom_questions.length > 0 && (
                                        <div className="job-list-questions-badge">
                                            {job.custom_questions.length} question{job.custom_questions.length !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel - Job Details */}
                {selectedJob && (
                    <div className="job-details-panel">
                        <div className="job-details-header">
                            <div className="job-details-title-section">
                                <div className="job-details-title-row">
                                    <h1 className="job-details-title">{selectedJob.job_title}</h1>
                                    <button className="share-btn" onClick={handleShare} title="Share this job">
                                        Share
                                    </button>
                                </div>
                                <div className="job-details-meta">
                                    <span className="job-details-company">
                                        {selectedJob.company_name}
                                    </span>
                                    <span className="job-details-separator">•</span>
                                    <span className="job-details-salary">{selectedJob.salary_range}</span>
                                </div>
                            </div>
                        </div>

                        <div className="job-details-body">
                            <div className="job-details-section-block">
                                <h3 className="section-heading">Job Description</h3>
                                <p className="job-description-text">{selectedJob.description}</p>
                            </div>

                            <div className="job-details-section-block">
                                <h3 className="section-heading">Required Skills</h3>
                                <div className="skills-tags">
                                    {selectedJob.skills && selectedJob.skills.split(',').map((skill, idx) => (
                                        <span key={idx} className="skill-tag">{skill.trim()}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Application Section */}
                            <div className="job-application-section">
                                <h3 className="section-heading">Apply for this Position</h3>
                                
                                {selectedJob.hasApplied ? (
                                    <div className="already-applied">
                                        <div className="applied-icon">APPLIED</div>
                                        <h4>Application Submitted</h4>
                                        <p>You have already applied for this position</p>
                                    </div>
                                ) : (
                                    <div className="application-form">
                                        {/* Custom Questions */}
                                        {selectedJob.custom_questions && selectedJob.custom_questions.length > 0 && (
                                            <div className="custom-questions-form">
                                                <h4 className="questions-form-title">Application Questions</h4>
                                                <p className="questions-form-subtitle">
                                                    Please answer all questions. <span style={{color: '#ef4444', fontWeight: 600}}>*</span> indicates required fields
                                                </p>
                                                
                                                {selectedJob.custom_questions.map((question, qIdx) => {
                                                    const isAnswered = customAnswers[selectedJob.id]?.[question.id] && 
                                                        (typeof customAnswers[selectedJob.id][question.id] !== 'string' || 
                                                        customAnswers[selectedJob.id][question.id].trim().length > 0);
                                                    const showError = attemptedSubmit[selectedJob.id] && question.required && !isAnswered;
                                                    
                                                    return (
                                                        <div key={question.id || qIdx} className={`question-answer-item ${showError ? 'error' : ''}`}>
                                                            <label className="question-label">
                                                                <span className="question-text">Q{qIdx + 1}. {question.question}</span>
                                                                {question.required && <span className="required-star">*</span>}
                                                            </label>
                                                            {showError && (
                                                                <div className="question-error-message">This question is required</div>
                                                            )}
                                                            
                                                            {question.type === 'yesno' && (
                                                                <div className="yesno-options">
                                                                    <label className="radio-option">
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${selectedJob.id}-${question.id}`}
                                                                            value="yes"
                                                                            checked={customAnswers[selectedJob.id]?.[question.id] === 'yes'}
                                                                            onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                        />
                                                                        <span>Yes</span>
                                                                    </label>
                                                                    <label className="radio-option">
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${selectedJob.id}-${question.id}`}
                                                                            value="no"
                                                                            checked={customAnswers[selectedJob.id]?.[question.id] === 'no'}
                                                                            onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                        />
                                                                        <span>No</span>
                                                                    </label>
                                                                </div>
                                                            )}
                                                            
                                                            {question.type === 'text' && (
                                                                <input
                                                                    type="text"
                                                                    className="question-input"
                                                                    placeholder="Enter your answer..."
                                                                    value={customAnswers[selectedJob.id]?.[question.id] || ''}
                                                                    onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                />
                                                            )}
                                                            
                                                            {question.type === 'multiline' && (
                                                                <textarea
                                                                    className="question-textarea"
                                                                    placeholder="Enter your answer..."
                                                                    rows="4"
                                                                    value={customAnswers[selectedJob.id]?.[question.id] || ''}
                                                                    onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                />
                                                            )}
                                                            
                                                            {question.type === 'multiple' && question.options && (
                                                                <div className="multiple-choice-options">
                                                                    {question.options.map((option, optIdx) => (
                                                                        <label key={optIdx} className="radio-option">
                                                                            <input
                                                                                type="radio"
                                                                                name={`question-${selectedJob.id}-${question.id}`}
                                                                                value={option}
                                                                                checked={customAnswers[selectedJob.id]?.[question.id] === option}
                                                                                onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                            />
                                                                            <span>{option}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Resume Upload - Below Questions */}
                                        <div className="resume-upload-box">
                                            <label className="upload-label">
                                                <span className="label-text">Upload Your Resume <span className="required-star">*</span></span>
                                                <span className="label-hint">PDF, DOC, or DOCX (Max 5MB)</span>
                                            </label>
                                            <div className="file-input-wrapper">
                                                <input
                                                    type="file"
                                                    id={`resume-${selectedJob.id}`}
                                                    accept=".pdf,.doc,.docx"
                                                    onChange={(e) => handleFileChange(selectedJob.id, e.target.files[0])}
                                                    className="file-input"
                                                />
                                                <label htmlFor={`resume-${selectedJob.id}`} className="file-input-label" style={{ paddingRight: selectedJob.resumeFile ? '90px' : '16px' }}>
                                                    <span className="file-icon">📎</span>
                                                    <span className="file-text">
                                                        {selectedJob.resumeFile ? selectedJob.resumeFile.name : 'Choose a file'}
                                                    </span>
                                                </label>
                                                {selectedJob.resumeFile && (
                                                    <button
                                                        type="button"
                                                        className="file-cancel-btn"
                                                        onClick={(e) => { e.preventDefault(); handleCancelResume(selectedJob.id); }}
                                                    >
                                                        ✕ Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Show messages only after user attempts to submit */}
                                        {attemptedSubmit[selectedJob.id] && !selectedJob.resumeSelected && (
                                            <div className="submit-warning">
                                                 Please upload your resume before submitting your application.
                                            </div>
                                        )}

                                        {attemptedSubmit[selectedJob.id] && selectedJob.resumeSelected && !areRequiredQuestionsAnswered(selectedJob) && (
                                            <div className="submit-warning">
                                                 Please answer all required questions before submitting.
                                            </div>
                                        )}

                                        {/* Show submit button only when all requirements are met */}
                                        {selectedJob.resumeSelected && areRequiredQuestionsAnswered(selectedJob) ? (
                                            <button
                                                className="apply-btn-new"
                                                onClick={() => handleApply(selectedJob.id)}
                                            >
                                                Submit Application
                                            </button>
                                        ) : (
                                            <button
                                                className="apply-btn-new"
                                                onClick={() => handleApply(selectedJob.id)}
                                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                                disabled
                                            >
                                                {!selectedJob.resumeSelected
                                                    ? 'Upload Resume to Continue'
                                                    : 'Answer All Required Questions'
                                                }
                                            </button>
                                        )}

                                        <p className="application-note">
                                            By submitting your application, you agree to our terms and conditions.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* No Job Selected State */}
                {!selectedJob && filteredJobs.length > 0 && (
                    <div className="no-job-selected">
                        <h3>Select a Job</h3>
                        <p>Click on a job from the list to view details and apply</p>
                    </div>
                )}
            </div>

            {/* Notification Toast */}
            {notification.show && (
                <div className={`notification-toast ${notification.type}`}>
                    <span>{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default ApplyJobs;
