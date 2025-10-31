import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RecruiterNavbar from './RecruiterNavbar';
import '../../styles/Recruiter.css';

const RecruiterNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/rec-not', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (response.ok) {
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const getUnreadCount = () => {
        return notifications.filter(n => !n.is_read).length;
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch('/api/mark-notification-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notificationId })
            });
            const result = await response.json();
            
            if (result.success) {
                setNotifications(prev => prev.map(n => 
                    n._id === notificationId ? { ...n, is_read: true } : n
                ));
            } else {
                showToast('Failed to mark as read');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            showToast('An error occurred');
        }
    };

    const deleteNotification = async (notificationId, e) => {
        e.stopPropagation();
        
        try {
            const response = await fetch('/api/delete-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notificationId })
            });
            const result = await response.json();
            
            if (result.success) {
                setNotifications(prev => prev.filter(n => n._id !== notificationId));
                showToast('Notification deleted');
            } else {
                showToast('Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            showToast('An error occurred');
        }
    };

    const handleCardClick = (notificationId) => {
        markAsRead(notificationId);
    };

    const handleMarkAsRead = (notificationId, e) => {
        e.stopPropagation();
        markAsRead(notificationId);
    };

    const getNotificationTitle = (notification) => {
        return notification.type === 'job_application' 
            ? 'New Job Application' 
            : 'Job Posted Successfully';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="recruiter-notifications-body">
            <RecruiterNavbar />

            <div className="recruiter-notifications-container">
                <div className="recruiter-page-header">
                    <h1>Notifications</h1>
                    <span className="recruiter-notification-count">{getUnreadCount()}</span>
                </div>

                <div className="recruiter-nav-tabs">
                    <Link to="/rec-not" className="recruiter-nav-tab active">Notifications</Link>
                    <Link to="/rec-app" className="recruiter-nav-tab">Applications</Link>
                </div>

                {loading ? (
                    <div className="recruiter-empty-state">
                        <p>Loading notifications...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="recruiter-notifications-list">
                        {notifications.map(notification => (
                            <div 
                                key={notification._id}
                                className={`recruiter-notification-card ${!notification.is_read ? 'unread' : ''}`}
                                onClick={() => handleCardClick(notification._id)}
                            >
                                <div className="recruiter-notification-title">
                                    {getNotificationTitle(notification)}
                                </div>
                                <div className="recruiter-notification-body">
                                    {notification.message}
                                </div>
                                {notification.job_id && (
                                    <>
                                        {notification.description && (
                                            <div className="job-description">{notification.description}</div>
                                        )}
                                        {notification.salary_range && (
                                            <div className="job-salary">{notification.salary_range}</div>
                                        )}
                                    </>
                                )}
                                <div className="recruiter-notification-time">
                                    {formatDate(notification.createdAt || notification.created_at)}
                                </div>
                                <div className="recruiter-notification-footer">
                                    <span className="recruiter-notification-badge">Job Post</span>
                                    <div className="recruiter-notification-buttons">
                                        <button 
                                            className="recruiter-btn-secondary"
                                            onClick={(e) => handleMarkAsRead(notification._id, e)}
                                        >
                                            Mark as read
                                        </button>
                                        <button 
                                            className="recruiter-btn-secondary"
                                            onClick={(e) => deleteNotification(notification._id, e)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="recruiter-empty-state">
                        <h3>No notifications to display</h3>
                        <p>New notifications will appear here</p>
                    </div>
                )}
            </div>

            <div className={`recruiter-toast ${toast.show ? 'show' : ''} ${toast.type}`}>
                {toast.message}
            </div>
        </div>
    );
};

export default RecruiterNotifications;
