import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './NavBar.jsx';
import '../../styles/JobApplications.css';

const JobApplications = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchApplications();
    }, [user, navigate]);

    const fetchApplications = async () => {
        try {
            const response = await fetch('/job', {
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch applications');
            }

            const data = await response.json();
            setApplications(data.applications || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching applications:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="job-applications-container">
                    <h1>Loading applications...</h1>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Navbar />
                <div className="job-applications-container">
                    <h1>Error loading applications</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="job-applications-page">
            <Navbar />
            <div className="job-applications-container">
                <header className="applications-header">
                    <h1>My Pending Applications</h1>
                    <div className="subtitle">Jobs you've applied to and are waiting for a response</div>
                </header>

                <div className="applications-list">
                    {applications.length === 0 ? (
                        <p className="no-applications">No applications submitted yet.</p>
                    ) : (
                        applications.map((application) => (
                            <div className="job-card" key={application._id}>
                                <div className="job-header">
                                    <div className="company-name">{application.company_name}</div>
                                    <div className="job-title">{application.job_title}</div>
                                    <div className="salary">{application.salary_range}</div>
                                </div>

                                <div className="job-description">{application.description}</div>

                                {application.skills && (
                                    <div className="skills-container">
                                        {application.skills.split(',').map((skill, index) => (
                                            <span className="skill-tag" key={index}>
                                                {skill.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="job-footer">
                                    <div className="date-applied">
                                        Applied: {formatDate(application.date_applied)}
                                    </div>
                                    
                                    {application.status === 'Approved' ? (
                                        <div className="status-badge status-approved">
                                            You are shortlisted
                                        </div>
                                    ) : (
                                        <div className="status-badge">
                                            {application.status}
                                        </div>
                                    )}
                                </div>

                                {application.status === 'Approved' && application.recruiter_email && (
                                    <div className="recruiter-email">
                                        Recruiter email: <strong>{application.recruiter_email}</strong>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobApplications;
