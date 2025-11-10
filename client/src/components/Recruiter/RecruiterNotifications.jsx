import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import RecruiterNavbar from './RecruiterNavbar';
import { fetchNotifications, markNotificationRead, deleteNotification as deleteNotificationAction, clearNotificationsError } from '../../store/recruiterSlice';
import '../../styles/Recruiter.css';

const RecruiterNotifications = () => {
    const dispatch = useDispatch();
    
    // Redux state
    const { list: notifications, loading, error } = useSelector(state => state.recruiter.notifications);
    
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    // Handle Redux errors
    useEffect(() => {
        if (error) {
            showToast(error, 'danger');
            dispatch(clearNotificationsError());
        }
    }, [error, dispatch]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // Memoized unread count
    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.is_read).length;
    }, [notifications]);

    const handleMarkAsRead = async (notificationId, e) => {
        if (e) e.stopPropagation();
        try {
            await dispatch(markNotificationRead(notificationId)).unwrap();
        } catch (error) {
            showToast('Failed to mark as read');
        }
    };

    const handleDeleteNotification = async (notificationId, e) => {
        e.stopPropagation();
        try {
            await dispatch(deleteNotificationAction(notificationId)).unwrap();
            showToast('Notification deleted');
        } catch (error) {
            showToast('Failed to delete');
        }
    };

    const handleCardClick = (notificationId) => {
        handleMarkAsRead(notificationId);
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
                    <span className="recruiter-notification-count">{unreadCount}</span>
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
                                            onClick={(e) => handleDeleteNotification(notification._id, e)}
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
