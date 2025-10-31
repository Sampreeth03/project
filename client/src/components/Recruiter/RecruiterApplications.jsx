import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RecruiterNavbar from './RecruiterNavbar';
import '../../styles/Recruiter.css';

const RecruiterApplications = () => {
    const [applications, setApplications] = useState([]);
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        filterApplications();
    }, [applications, activeTab, searchQuery]);

    const fetchApplications = async () => {
        try {
            const response = await fetch('/api/rec-app', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (response.ok) {
                setApplications(data.applications || []);
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterApplications = () => {
        let filtered = [...applications];

        // Filter by tab
        if (activeTab === 'pending') {
            filtered = filtered.filter(app => app.status === 'pending');
        } else if (activeTab === 'approved') {
            filtered = filtered.filter(app => app.status === 'approved');
        }

        // Filter by search query
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            filtered = filtered.filter(app => {
                const fields = [app.applicantName || '', app.jobTitle || '', app.status || '', app.content || ''];
                return fields.some(f => String(f).toLowerCase().includes(q));
            });
        }

        setFilteredApplications(filtered);
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const getUnreadCount = () => {
        return applications.filter(n => n.unread).length;
    };

    const handleApprove = async (applicationId, e) => {
        e.stopPropagation();
        
        try {
            const response = await fetch('/api/update-application-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ applicationId, status: 'Approved' })
            });
            const data = await response.json();
            
            if (data.success) {
                setApplications(prev => prev.map(app => 
                    app.id === applicationId 
                        ? { ...app, status: 'approved', unread: false }
                        : app
                ));
                showToast('Application approved successfully.', 'success');
            } else {
                showToast(data.error || 'Failed to approve application', 'danger');
            }
        } catch (err) {
            showToast('Error approving application', 'danger');
        }
    };

    const handleReject = async (applicationId, e) => {
        e.stopPropagation();
        
        try {
            const response = await fetch('/api/update-application-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ applicationId, status: 'Rejected' })
            });
            const data = await response.json();
            
            if (data.success) {
                setApplications(prev => prev.map(app => 
                    app.id === applicationId 
                        ? { ...app, status: 'rejected' }
                        : app
                ));
                showToast('Application rejected.', 'danger');
            } else {
                showToast(data.error || 'Failed to reject application', 'danger');
            }
        } catch (err) {
            showToast('Error rejecting application', 'danger');
        }
    };

    const handleCardClick = (applicationId) => {
        setApplications(prev => prev.map(app => 
            app.id === applicationId 
                ? { ...app, unread: false }
                : app
        ));
    };

    const renderActionButtons = (application) => {
        const status = application.status;
        
        if (status === 'approved') {
            return (
                <>
                    <a 
                        href={`/api/view-resume/${application.resumeId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="recruiter-action-btn recruiter-btn-primary"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View Resume
                    </a>
                    <span className="recruiter-status-badge approved">Approved</span>
                </>
            );
        } else if (status === 'pending') {
            return (
                <>
                    <a 
                        href={`/api/view-resume/${application.resumeId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="recruiter-action-btn recruiter-btn-primary"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View Resume
                    </a>
                    <span className="recruiter-status-badge pending">Pending</span>
                    <button 
                        className="recruiter-action-btn recruiter-btn-success"
                        onClick={(e) => handleApprove(application.id, e)}
                    >
                        Approve
                    </button>
                    <button 
                        className="recruiter-action-btn recruiter-btn-danger"
                        onClick={(e) => handleReject(application.id, e)}
                    >
                        Reject
                    </button>
                </>
            );
        } else if (status === 'rejected') {
            return (
                <>
                    <a 
                        href={`/api/view-resume/${application.resumeId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="recruiter-action-btn recruiter-btn-primary"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View Resume
                    </a>
                    <span className="recruiter-status-badge rejected">Rejected</span>
                </>
            );
        } else {
            return (
                <>
                    <a 
                        href={`/api/view-resume/${application.resumeId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="recruiter-action-btn recruiter-btn-primary"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View Resume
                    </a>
                    <button 
                        className="recruiter-action-btn recruiter-btn-success"
                        onClick={(e) => handleApprove(application.id, e)}
                    >
                        Approve
                    </button>
                    <button 
                        className="recruiter-action-btn recruiter-btn-danger"
                        onClick={(e) => handleReject(application.id, e)}
                    >
                        Reject
                    </button>
                </>
            );
        }
    };

    return (
        <div className="recruiter-applications-body">
            <RecruiterNavbar />

            <div className="recruiter-applications-container">
                <div className="recruiter-page-header">
                    <h1>Applications</h1>
                    <span className="recruiter-notification-count">{getUnreadCount()}</span>
                </div>

                <div className="recruiter-nav-tabs">
                    <Link to="/rec-not" className="recruiter-nav-tab">Notifications</Link>
                    <Link to="/rec-app" className="recruiter-nav-tab active">Applications</Link>
                </div>

                <div className="recruiter-tabs">
                    <button 
                        className={`recruiter-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Applications
                    </button>
                    <button 
                        className={`recruiter-tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending
                    </button>
                    <button 
                        className={`recruiter-tab ${activeTab === 'approved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('approved')}
                    >
                        Approved
                    </button>
                </div>

                <input 
                    className="recruiter-search-box"
                    placeholder="Search by name, title, status"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {loading ? (
                    <div className="recruiter-empty-state">
                        <p>Loading applications...</p>
                    </div>
                ) : filteredApplications.length > 0 ? (
                    <div className="recruiter-applications-list">
                        {filteredApplications.map(application => (
                            <div 
                                key={application.id}
                                className={`recruiter-application-card ${application.unread ? 'unread' : ''}`}
                                onClick={() => handleCardClick(application.id)}
                            >
                                <div className="recruiter-application-title">{application.title}</div>
                                <div className="recruiter-application-body">{application.content}</div>
                                <div className="recruiter-application-time">{application.time}</div>
                                <div className="recruiter-application-footer">
                                    <span className="recruiter-application-badge">{application.badge}</span>
                                    <div className="recruiter-application-buttons">
                                        {renderActionButtons(application)}
                                        <a 
                                            href={`/api/view-resume/${application.resumeId}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="recruiter-resume-link"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <svg className="recruiter-resume-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M5 2C3.343 2 2 3.343 2 5v14c0 1.657 1.343 3 3 3h14c1.657 0 3-1.343 3-3V5c0-1.657-1.343-3-3-3H5zm0 2h14c.552 0 1 .448 1 1v14c0 .552-.448 1-1 1H5c-.552 0-1-.448-1-1V5c0-.552.448-1 1-1zm2 3v10h10V7H7zm2 2h6v2H9V9zm0 4h6v2H9v-2z"/>
                                            </svg>
                                            Resume - {application.applicantName}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="recruiter-empty-state">
                        <h3>No applications to display</h3>
                        <p>New applications will appear here</p>
                    </div>
                )}
            </div>

            <div className={`recruiter-toast ${toast.show ? 'show' : ''} ${toast.type}`}>
                {toast.message}
            </div>
        </div>
    );
};

export default RecruiterApplications;
