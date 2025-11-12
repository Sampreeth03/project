import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './NavBar.jsx';
import '../../styles/JobNotifications.css';

const JobNotifications = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toastMessage, setToastMessage] = useState({ message: '', type: '', show: false });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchNotifications();
    }, [user, navigate]);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/job_not', {
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            setNotifications(data.jobsNotifications || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type, show: true });
        setTimeout(() => {
            setToastMessage({ message: '', type: '', show: false });
        }, 3000);
    };

    const deleteNotification = async (notificationId) => {
        try {
            const response = await fetch('/delete-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationId }),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
                showToast('Notification deleted successfully');
            } else {
                showToast('Error: Notification not found', 'error');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            showToast('Failed to delete notification', 'error');
        }
    };

    const toggleCard = (notificationId) => {
        setNotifications(prev =>
            prev.map(n =>
                n.id === notificationId ? { ...n, expanded: !n.expanded } : n
            )
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="job-notifications-container">
                    <h1>Loading notifications...</h1>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Navbar />
                <div className="job-notifications-container">
                    <h1>Error loading notifications</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="job-notifications-page">
            <Navbar />
            <main className="job-notifications-container">
                <div className="header-content">
                    <h2>Your Job Applications</h2>
                    <div className="jobs-count">
                        <span>Total Jobs</span>
                        <span className="jobs-count-number">{notifications.length}</span>
                    </div>
                </div>

                <div id="jobs-notifications">
                    {notifications.length === 0 ? (
                        <div className="empty-state">No job applications found</div>
                    ) : (
                        notifications.map((notification) => {
                            const jobTypeClass =
                                notification.type === 'approved'
                                    ? 'job-type-approved'
                                    : notification.type === 'rejected'
                                    ? 'job-type-rejected'
                                    : 'job-type-applied';
                            const jobTypeLabel =
                                notification.type === 'approved'
                                    ? 'Approved ✓'
                                    : notification.type === 'rejected'
                                    ? 'Rejected ✗'
                                    : 'Applied';

                            return (
                                <div
                                    className={`job-card ${notification.expanded ? 'expanded' : ''}`}
                                    key={notification.id}
                                    data-id={notification.id}
                                    data-type={notification.type}
                                    onClick={(e) => {
                                        if (!e.target.closest('.btn')) {
                                            toggleCard(notification.id);
                                        }
                                    }}
                                >
                                    <div className="job-card-header">
                                        <div>
                                            <h3 className="job-card-title">{notification.title}</h3>
                                        </div>
                                        <div className="job-card-header-right">
                                            <span className={`job-type ${jobTypeClass}`}>
                                                {jobTypeLabel}
                                            </span>
                                            <span className="job-card-date">
                                                {formatDate(notification.date)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="job-card-company">
                                        <span className="company-name">{notification.company}</span>
                                    </div>

                                    <div className="job-card-content">
                                        <p className="job-content-message">{notification.content}</p>
                                        <div className="job-description">{notification.description}</div>
                                        <div className="job-pay">{notification.pay}</div>
                                    </div>

                                    {notification.type === 'approved' && notification.recruiter_email && (
                                        <div className="recruiter-info">
                                            <strong>Recruiter Contact:</strong><br />
                                            {notification.recruiter_name && <span>Name: {notification.recruiter_name}<br /></span>}
                                            Email: <a href={`mailto:${notification.recruiter_email}`}>{notification.recruiter_email}</a>
                                        </div>
                                    )}

                                    <div className="job-card-footer">
                                        <button
                                            className="btn btn-icon btn-secondary"
                                            onClick={() => deleteNotification(notification.id)}
                                        >
                                            <span>✕</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {toastMessage.show && (
                    <div className={`toast show ${toastMessage.type}`}>
                        {toastMessage.message}
                    </div>
                )}
            </main>
        </div>
    );
};

export default JobNotifications;
