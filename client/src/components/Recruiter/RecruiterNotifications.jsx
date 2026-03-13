import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import RecruiterNavbar from './RecruiterNavbar';
import { fetchNotifications, markNotificationRead, deleteNotification as deleteNotificationAction, clearNotificationsError } from '../../store/recruiterSlice';

const JOB_MGMT_TYPES = ['job_created', 'job_deleted', 'job_activated', 'job_deactivated'];

const TYPE_META = {
    job_created:     { label: 'Job Created',     color: '#0068FF' },
    job_deleted:     { label: 'Job Deleted',      color: '#0068FF' },
    job_activated:   { label: 'Job Activated',    color: '#0068FF' },
    job_deactivated: { label: 'Job Deactivated',  color: '#0068FF' },
};

const RecruiterNotifications = () => {
    const dispatch = useDispatch();
    const { list: notifications, loading, error } = useSelector(state => state.recruiter.notifications);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

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

    // Only show job management notifications
    const filtered = useMemo(() =>
        notifications.filter(n => JOB_MGMT_TYPES.includes(n.type)),
        [notifications]
    );

    const unreadCount = useMemo(() => filtered.filter(n => !n.is_read).length, [filtered]);

    const handleMarkAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        try { await dispatch(markNotificationRead(id)).unwrap(); } catch { showToast('Failed to mark as read', 'danger'); }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            await dispatch(deleteNotificationAction(id)).unwrap();
            showToast('Notification deleted');
        } catch { showToast('Failed to delete', 'danger'); }
    };

    const formatDate = (d) => new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="rn-root">
            <RecruiterNavbar />

            <div className="rn-content">
                {/* page header */}
                <div className="rn-header">
                    <h1 className="rn-title">Notifications</h1>
                </div>

                {/* list */}
                {loading ? (
                    <div className="rn-loading">
                        <div className="rn-ring" />
                        <span>Loading…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rn-empty">
                        <div className="rn-empty-icon">◈</div>
                        <p>No job activity yet</p>
                        <span>Notifications will appear here when you create, activate, deactivate or delete a job.</span>
                    </div>
                ) : (
                    <div className="rn-list">
                        {filtered.map((n, i) => {
                            const meta = TYPE_META[n.type] || { label: n.type, color: '#888' };
                            return (
                                <div
                                    key={n._id}
                                    className={`rn-card${n.is_read ? '' : ' rn-card--unread'}`}
                                    style={{ '--nc': meta.color, '--idx': i }}
                                    onClick={() => handleMarkAsRead(n._id)}
                                >
                                    <div className="rn-card-bar" style={{ background: meta.color }} />
                                    <div className="rn-card-body">
                                        <div className="rn-card-top">
                                            <span className="rn-card-type" style={{ color: meta.color, borderColor: meta.color + '44' }}>{meta.label}</span>
                                            {!n.is_read && <span className="rn-card-dot" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />}
                                        </div>
                                        <p className="rn-card-msg">{n.message}</p>
                                        <div className="rn-card-footer">
                                            <span className="rn-card-time">{formatDate(n.createdAt || n.created_at)}</span>
                                            <div className="rn-card-actions">
                                                {!n.is_read && (
                                                    <button className="rn-btn rn-btn--read" onClick={(e) => handleMarkAsRead(n._id, e)}>
                                                        Mark read
                                                    </button>
                                                )}
                                                <button className="rn-btn rn-btn--del" onClick={(e) => handleDelete(n._id, e)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className={`rn-toast rn-toast--${toast.type}${toast.show ? ' rn-toast--show' : ''}`}>
                <span className="rn-toast-dot" />
                {toast.message}
            </div>
        </div>
    );
};

export default RecruiterNotifications;
