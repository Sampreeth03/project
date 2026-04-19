import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './NavBar.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue';
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
    const [clickKey, setClickKey] = useState(0);
    const [searchMeta, setSearchMeta] = useState({ page: 1, rows: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
    const [searchSource, setSearchSource] = useState('solr');
    const [page, setPage] = useState(1);
    const rows = 10;
    const debouncedQuery = useDebouncedValue(searchQuery, 300);

    const getSkillItems = (skills) => {
        if (Array.isArray(skills)) {
            return skills.map((skill) => String(skill || '').trim()).filter(Boolean);
        }

        return String(skills || '')
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean);
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user) return;
        fetchJobs();
    }, [user, debouncedQuery, filterStatus, page]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, filterStatus]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);

            const filters = { active: true };
            if (filterStatus === 'applied' || filterStatus === 'notapplied') {
                filters.applied = filterStatus;
            }

            const queryString = new URLSearchParams({
                q: debouncedQuery || '',
                page: String(page),
                rows: String(rows),
                sort: debouncedQuery ? 'relevance' : 'createdAt_desc',
                filters: JSON.stringify(filters)
            }).toString();

            const response = await fetch(`/api/search/jobs?${queryString}`, {
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch jobs');
            }

            const data = await response.json();
            const normalizedJobs = (Array.isArray(data.data) ? data.data : []).map((job) => {
                const questions = Array.isArray(job.custom_questions) ? job.custom_questions : [];
                return {
                    ...job,
                    custom_questions: questions,
                    resumeSelected: false,
                    resumeFile: null
                };
            });

            setJobs(normalizedJobs);
            setSearchMeta(data.meta || { page: 1, rows, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
            setSearchSource(data.source || 'solr');

            if (selectedJob) {
                const updatedSelection = normalizedJobs.find((job) => job.id === selectedJob.id);
                if (!updatedSelection) {
                    setSelectedJob(null);
                }
            }

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

                await fetchJobs();
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
        console.log('[ApplyJobs] Selected job:', normalizedJob.job_title);
        console.log('[ApplyJobs] custom_questions:', JSON.stringify(normalizedJob.custom_questions));
        setSelectedJob(normalizedJob);
        setClickKey(prev => prev + 1);
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

    const filteredJobs = jobs;

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

                        {searchSource === 'fallback' && (
                            <div className="loading-state" style={{ margin: '6px 0 10px 0' }}>
                                Solr unavailable. Showing MongoDB fallback results.
                            </div>
                        )}
                        
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

                            {searchMeta.totalPages > 1 && (
                                <div className="filter-buttons" style={{ marginTop: '12px' }}>
                                    <button
                                        className="filter-btn"
                                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                        disabled={!searchMeta.hasPrev || loading}
                                    >
                                        Prev
                                    </button>
                                    <button className="filter-btn active" disabled>
                                        {searchMeta.page} / {searchMeta.totalPages}
                                    </button>
                                    <button
                                        className="filter-btn"
                                        onClick={() => setPage((prev) => prev + 1)}
                                        disabled={!searchMeta.hasNext || loading}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel - Job Details */}
                {selectedJob && (
                    <div key={clickKey} className="job-details-panel">
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
                                    {getSkillItems(selectedJob.skills).map((skill, idx) => (
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
                                            <div className="custom-questions-form" style={{background:'#161625', border:'2px solid #0068ff', borderRadius:'10px', padding:'20px', color:'#fff'}}>
                                                <h4 className="questions-form-title" style={{color:'#fff', fontSize:'15px', fontWeight:700, marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px'}}> Application Questions</h4>
                                                <p className="questions-form-subtitle" style={{color:'#d0d0e8', fontSize:'12px', marginBottom:'16px', padding:'8px 12px', background:'rgba(255,68,85,0.12)', borderLeft:'3px solid #ff4455', borderRadius:'0 6px 6px 0'}}>
                                                    Please answer all questions. <span style={{color:'#ef4444', fontWeight:700}}>*</span> indicates required fields
                                                </p>
                                                
                                                {selectedJob.custom_questions.map((question, qIdx) => {
                                                    const isAnswered = customAnswers[selectedJob.id]?.[question.id] && 
                                                        (typeof customAnswers[selectedJob.id][question.id] !== 'string' || 
                                                        customAnswers[selectedJob.id][question.id].trim().length > 0);
                                                    const showError = attemptedSubmit[selectedJob.id] && question.required && !isAnswered;
                                                    
                                                    return (
                                                        <div key={question.id || qIdx} className={`question-answer-item ${showError ? 'error' : ''}`} style={{background:'#1e1e30', border:`1px solid ${showError ? 'rgba(255,68,85,0.6)' : 'rgba(255,255,255,0.18)'}`, borderRadius:'8px', padding:'14px 16px', marginBottom:'10px', color:'#fff'}}>
                                                            <label className="question-label" style={{display:'block', marginBottom:'10px', color:'#fff'}}>
                                                                <span className="question-text" style={{color:'#fff', fontWeight:600, fontSize:'13px'}}>Q{qIdx + 1}. {question.question}</span>
                                                                {question.required && <span className="required-star" style={{color:'#ff4455', marginLeft:'4px', fontWeight:900}}>*</span>}
                                                            </label>
                                                            {showError && (
                                                                <div className="question-error-message" style={{color:'#ff7b88', fontSize:'11px', marginBottom:'8px', fontWeight:600}}>⚠ This question is required</div>
                                                            )}
                                                            
                                                            {question.type === 'yesno' && (
                                                                <div className="yesno-options" style={{display:'flex', gap:'10px'}}>
                                                                    <label className="radio-option" style={{display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'#0e0e1a', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', cursor:'pointer', flex:1, color:'#fff'}}>
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${selectedJob.id}-${question.id}`}
                                                                            value="yes"
                                                                            checked={customAnswers[selectedJob.id]?.[question.id] === 'yes'}
                                                                            onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                        />
                                                                        <span style={{color:'#fff'}}>Yes</span>
                                                                    </label>
                                                                    <label className="radio-option" style={{display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'#0e0e1a', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', cursor:'pointer', flex:1, color:'#fff'}}>
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${selectedJob.id}-${question.id}`}
                                                                            value="no"
                                                                            checked={customAnswers[selectedJob.id]?.[question.id] === 'no'}
                                                                            onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                        />
                                                                        <span style={{color:'#fff'}}>No</span>
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
                                                                    style={{width:'100%', padding:'10px 14px', background:'#0e0e1a', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'8px', color:'#fff', fontSize:'13px', outline:'none'}}
                                                                />
                                                            )}
                                                            
                                                            {question.type === 'multiline' && (
                                                                <textarea
                                                                    className="question-textarea"
                                                                    placeholder="Enter your answer..."
                                                                    rows="4"
                                                                    value={customAnswers[selectedJob.id]?.[question.id] || ''}
                                                                    onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                    style={{width:'100%', padding:'10px 14px', background:'#0e0e1a', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'8px', color:'#fff', fontSize:'13px', outline:'none', resize:'vertical', minHeight:'88px'}}
                                                                />
                                                            )}
                                                            
                                                            {question.type === 'multiple' && question.options && (
                                                                <div className="multiple-choice-options" style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                                                    {question.options.map((option, optIdx) => (
                                                                        <label key={optIdx} className="radio-option" style={{display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'#0e0e1a', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', cursor:'pointer', color:'#fff'}}>
                                                                            <input
                                                                                type="radio"
                                                                                name={`question-${selectedJob.id}-${question.id}`}
                                                                                value={option}
                                                                                checked={customAnswers[selectedJob.id]?.[question.id] === option}
                                                                                onChange={(e) => handleCustomAnswerChange(selectedJob.id, question.id, e.target.value)}
                                                                            />
                                                                            <span style={{color:'#fff'}}>{option}</span>
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
