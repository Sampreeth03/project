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
    const [stats, setStats] = useState({ total: 0, waiting: 0, approved: 0 });
    const [confirmRevoke, setConfirmRevoke] = useState(null);
    const [revoking, setRevoking] = useState(null);
    const [revokeToast, setRevokeToast] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchApplications();
    }, [user, navigate]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/job', {
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include'
            });

            if (response.status === 401) {
                navigate('/login');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch applications');
            }

            const data = await response.json();
            const apps = data.applications || [];
            setApplications(apps);
            
            // Calculate stats
            const waiting = apps.filter(app => app.status === 'Waiting').length;
            const approved = apps.filter(app => app.status === 'Approved').length;
            setStats({ total: apps.length, waiting, approved });
            
            setLoading(false);
        } catch (err) {
            console.error('Error fetching applications:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return 'Unknown date';
        }
    };

    const getStatusText = (status) => {
        if (status === 'Approved') return 'Shortlisted';
        if (status === 'Waiting') return 'Under Review';
        return status;
    };

    const handleRevoke = async (applicationId) => {
        setRevoking(applicationId);
        try {
            const response = await fetch('/revoke-application', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ applicationId })
            });
            const data = await response.json();
            if (data.success) {
                setApplications(prev => {
                    const removed = prev.find(a => a._id === applicationId);
                    setStats(s => ({
                        total: s.total - 1,
                        waiting: removed?.status === 'Waiting' ? s.waiting - 1 : s.waiting,
                        approved: removed?.status === 'Approved' ? s.approved - 1 : s.approved,
                    }));
                    return prev.filter(a => a._id !== applicationId);
                });
                setRevokeToast('Application revoked successfully');
                setTimeout(() => setRevokeToast(''), 3000);
            } else {
                alert(data.error || 'Failed to revoke application');
            }
        } catch (err) {
            console.error('Revoke error:', err);
            alert('Failed to revoke application');
        } finally {
            setRevoking(null);
            setConfirmRevoke(null);
        }
    };

    if (loading) {
        return (
            <div className="job-applications-page">
                <Navbar />
                <div className="job-applications-container">
                    <div className="loading-state">
                        <h1>Loading your applications...</h1>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="job-applications-page">
                <Navbar />
                <div className="job-applications-container">
                    <div className="error-state">
                        <h1>Error Loading Applications</h1>
                        <p>{error}</p>
                        <button 
                            onClick={fetchApplications}
                            style={{
                                marginTop: '20px',
                                padding: '12px 24px',
                                background: 'var(--primary-blue)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const filteredApplications = activeFilter === 'all'
        ? applications
        : activeFilter === 'shortlisted'
            ? applications.filter(a => a.status === 'Approved')
            : applications.filter(a => a.status === 'Waiting');

    return (
        <div className="job-applications-page">
            <Navbar />
            <div className="job-applications-container">
                <header className="applications-header">
                    <h1>My Job Applications</h1>
                    <div className="stat-filters">
                        <button
                            className={`stat-tab${activeFilter === 'all' ? ' stat-tab-active' : ''}`}
                            onClick={() => setActiveFilter('all')}
                        >
                            <span className="stat-num">{stats.total}</span>
                            <span className="stat-label">Total</span>
                        </button>
                        <button
                            className={`stat-tab stat-tab-green${activeFilter === 'shortlisted' ? ' stat-tab-active stat-tab-active-green' : ''}`}
                            onClick={() => setActiveFilter('shortlisted')}
                        >
                            <span className="stat-num">{stats.approved}</span>
                            <span className="stat-label">Shortlisted</span>
                        </button>
                        <button
                            className={`stat-tab stat-tab-amber${activeFilter === 'pending' ? ' stat-tab-active stat-tab-active-amber' : ''}`}
                            onClick={() => setActiveFilter('pending')}
                        >
                            <span className="stat-num">{stats.waiting}</span>
                            <span className="stat-label">Under Review</span>
                        </button>
                    </div>
                </header>

                <div className="applications-list">
                    {filteredApplications.length === 0 ? (
                        <div className="no-applications">
                            {applications.length === 0
                                ? 'No applications submitted yet.'
                                : `No ${activeFilter === 'shortlisted' ? 'shortlisted' : 'under review'} applications.`
                            }
                        </div>
                    ) : (
                        filteredApplications.map((application) => (
                            <div className="job-card" key={application._id}>
                                <div className={`card-status-badge ${application.status === 'Approved' ? 'status-approved' : ''}`}>
                                    {getStatusText(application.status)}
                                </div>

                                <div className="job-header">
                                    <div className="company-name">{application.company_name || 'Company Name N/A'}</div>
                                    <div className="job-title">{application.job_title || 'Job Title N/A'}</div>
                                    {application.salary_range && (
                                        <div className="salary">{application.salary_range}</div>
                                    )}
                                </div>

                                {application.description && (
                                    <div className="job-description">
                                        {application.description.length > 200 
                                            ? `${application.description.substring(0, 200)}...` 
                                            : application.description
                                        }
                                    </div>
                                )}

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
                                        {formatDate(application.date_applied)}
                                    </div>
                                    
                                    <div className="footer-right">
                                        {application.status === 'Waiting' && (
                                            confirmRevoke === application._id ? (
                                                <div className="revoke-confirm-inline">
                                                    <span>Revoke?</span>
                                                    <button
                                                        className="revoke-confirm-btn"
                                                        onClick={() => handleRevoke(application._id)}
                                                        disabled={revoking === application._id}
                                                    >
                                                        {revoking === application._id ? '...' : 'Yes'}
                                                    </button>
                                                    <button
                                                        className="revoke-cancel-btn"
                                                        onClick={() => setConfirmRevoke(null)}
                                                        disabled={revoking === application._id}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="revoke-btn"
                                                    onClick={() => setConfirmRevoke(application._id)}
                                                >
                                                    Revoke
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {application.status === 'Approved' && (
                                    <div className="recruiter-email">
                                        <div>
                                            <strong>Congratulations!</strong> You've been shortlisted for this position.
                                        </div>
                                        {application.recruiter_email && (
                                            <div style={{ marginTop: '8px' }}>
                                                Contact the recruiter at: <strong>{application.recruiter_email}</strong>
                                            </div>
                                        )}
                                        {application.recruiter_name && application.recruiter_name !== 'Unknown' && (
                                            <div style={{ marginTop: '4px' }}>
                                                Recruiter: <strong>{application.recruiter_name}</strong>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {revokeToast && (
                <div className="revoke-toast">{revokeToast}</div>
            )}
        </div>
    );
};

export default JobApplications;
