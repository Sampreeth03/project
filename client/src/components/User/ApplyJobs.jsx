import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './NavBar.jsx';
import '../../styles/ApplyJobs.css';

const ApplyJobs = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            setJobs(data.jobs || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError(err.message);
            setLoading(false);
        }
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
            alert('Please upload a valid resume file (PDF, DOC, or DOCX).');
            // Clear the file input
            const input = document.getElementById(`resume-${jobId}`);
            if (input) input.value = '';
            return;
        }

        // Enable the apply button for this job
        setJobs(prevJobs =>
            prevJobs.map(job =>
                job.id === jobId ? { ...job, resumeSelected: true } : job
            )
        );
    };

    const handleApply = async (jobId, index) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job || job.hasApplied) return;

        const fileInput = document.getElementById(`resume-${jobId}`);
        if (!fileInput || !fileInput.files.length) {
            alert('Please select a resume file.');
            return;
        }

        const file = fileInput.files[0];
        if (!isAllowedResume(file)) {
            alert('Please upload a valid resume file (PDF, DOC, or DOCX).');
            fileInput.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('resume', file);
        formData.append('jobId', jobId);

        try {
            const response = await fetch('/apply-job', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                alert('Application submitted successfully!');
                
                // Update the job state to mark as applied
                setJobs(prevJobs =>
                    prevJobs.map(j =>
                        j.id === jobId
                            ? { ...j, hasApplied: true, resumeSelected: false }
                            : j
                    )
                );

                // Clear the file input
                if (fileInput) {
                    fileInput.value = '';
                    fileInput.disabled = true;
                }
            } else {
                alert(data.error || 'Failed to apply');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to apply. Please try again.');
        }
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="apply-jobs-container">
                    <h1>Loading jobs...</h1>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Navbar />
                <div className="apply-jobs-container">
                    <h1>Error loading jobs</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="apply-jobs-page">
            <Navbar />
            <div className="apply-jobs-container">
                <h1>Available Jobs</h1>
                <div className="jobs-grid" id="jobContainer">
                    {jobs.length === 0 ? (
                        <p className="no-jobs">No available jobs at the moment.</p>
                    ) : (
                        jobs.map((job, index) => (
                            <div className="job-card" key={job.id} data-job-id={job.id}>
                                <div className="job-title">{job.job_title}</div>
                                <div className="job-poster">Posted by: {job.company_name}</div>
                                <div className="salary-range">Salary: {job.salary_range}</div>
                                <div className="job-desc">{job.description}</div>
                                
                                <div className="resume-upload">
                                    <label>Resume</label>
                                    <input
                                        type="file"
                                        name="resume"
                                        accept=".pdf,.doc,.docx"
                                        id={`resume-${job.id}`}
                                        onChange={(e) => handleFileChange(job.id, e.target.files[0])}
                                        disabled={job.hasApplied}
                                    />
                                    <input type="hidden" className="job-id-input" value={job.id} />
                                </div>

                                <button
                                    className={`apply-btn ${job.hasApplied ? 'applied' : ''}`}
                                    onClick={() => handleApply(job.id, index)}
                                    disabled={job.hasApplied || !job.resumeSelected}
                                >
                                    {job.hasApplied ? 'Applied' : 'Apply'}
                                </button>

                                {job.hasApplied && (
                                    <div className="applied-badge">Applied</div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApplyJobs;
