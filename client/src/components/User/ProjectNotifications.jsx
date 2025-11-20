import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBar from './NavBar';
import { useAuth } from '../../context/AuthContext';

import '../../styles/ProjectNotifications.css';
import MemberNotificationBox from './MemberNotificationBox';
import LeaderNotificationBox from './LeaderNotificationBox';

const ProjectNotifications = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [taskNotifications, setTaskNotifications] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);
    const [projectCreationNotifications, setProjectCreationNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [currentChatRequest, setCurrentChatRequest] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const buttonStates = useRef(new Map());
    const chatEndRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/api/notifications');
            if (response.data.success) {
                setTaskNotifications(response.data.taskNotifications || []);
                setMyApplications(response.data.myApplications || []);
                setJoinRequests(response.data.joinRequests || []);
                setProjectCreationNotifications(response.data.projectCreationNotifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            showToast('Failed to load notifications', 'error');
        } finally {
            setLoading(false);
        }
    };

    const approveRequest = async (requestId, event) => {
        const button = event?.target;
        if (!button) return;
        if (buttonStates.current.get(requestId)) return;
        buttonStates.current.set(requestId, true);
        button.disabled = true;
        button.textContent = 'Approving...';

        try {
            const response = await axios.post('/api/approve-join-request', { requestId });
            const data = response.data;
            const msg = data?.message || '';
            const lower = msg.toLowerCase();

            if (data?.success) {
                showToast(msg || 'Request approved successfully');
                setJoinRequests(prev => prev.filter(req => req.id !== requestId));
            } else if (lower.includes('already') || lower.includes('processed')) {
                showToast(msg || 'Request already processed', 'success');
                setJoinRequests(prev => prev.filter(req => req.id !== requestId));
            } else if (lower.includes('full') || data?.code === 'PROJECT_FULL') {
                showToast(msg || 'Project is full. Could not approve the request.', 'error');
                button.disabled = false;
                button.textContent = 'Approve';
            } else {
                showToast(msg || 'Failed to approve request', 'error');
                button.disabled = false;
                button.textContent = 'Approve';
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred while approving the request', 'error');
            button.disabled = false;
            button.textContent = 'Approve';
        } finally {
            buttonStates.current.delete(requestId);
        }
    };

    const rejectRequest = async (requestId, event) => {
        const button = event?.target;
        if (!button) return;
        if (buttonStates.current.get(requestId)) return;
        buttonStates.current.set(requestId, true);
        button.disabled = true;
        button.textContent = 'Rejecting...';

        try {
            const response = await axios.post('/api/reject-join-request', { requestId });
            const data = response.data;
            const msg = data?.message || '';
            const lower = msg.toLowerCase();

            if (data?.success) {
                showToast(msg || 'Request rejected successfully');
                setJoinRequests(prev => prev.map(req => 
                    req.id === requestId ? {...req, status: 'rejected'} : req
                ));
                setMyApplications(prev => prev.map(req => 
                    req.id === requestId ? {...req, status: 'rejected'} : req
                ));
            } else if (lower.includes('already') || lower.includes('processed')) {
                showToast(msg || 'Request already processed', 'success');
                setJoinRequests(prev => prev.map(req => 
                    req.id === requestId ? {...req, status: 'rejected'} : req
                ));
                setMyApplications(prev => prev.map(req => 
                    req.id === requestId ? {...req, status: 'rejected'} : req
                ));
            } else {
                showToast(msg || 'Failed to reject request', 'error');
                button.disabled = false;
                button.textContent = 'Reject';
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred while rejecting the request', 'error');
            button.disabled = false;
            button.textContent = 'Reject';
        } finally {
            buttonStates.current.delete(requestId);
        }
    };

    const deleteRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to delete this request?')) return;

        if (buttonStates.current.get(requestId)) return;
        buttonStates.current.set(requestId, true);

        try {
            const response = await axios.post('/api/delete-join-request', { requestId });
            if (response.data.success) {
                showToast('Request deleted successfully');
                setJoinRequests(prev => prev.filter(req => req.id !== requestId));
                setMyApplications(prev => prev.filter(req => req.id !== requestId));
            } else {
                showToast(response.data.message || 'Failed to delete request', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred while deleting the request', 'error');
        } finally {
            buttonStates.current.delete(requestId);
        }
    };

    const viewProfile = async (userId) => {
        setProfileModalOpen(true);
        setProfileData({ loading: true });

        try {
            const response = await axios.get(`/api/profile-data/${encodeURIComponent(userId)}`);
            if (response.data?.success) {
                setProfileData(response.data.user);
            } else {
                setProfileData({ error: 'Failed to load profile.' });
            }
        } catch (error) {
            console.error('Profile load error:', error);
            if (error.response?.status === 401) {
                setProfileData({ error: 'Please log in to view profiles.' });
            } else {
                setProfileData({ error: 'Error loading profile.' });
            }
        }
    };

    const closeProfileModal = () => {
        setProfileModalOpen(false);
        setProfileData(null);
    };

    const viewTask = async (taskId, notificationId) => {
        markAsRead(notificationId);
        try {
            const response = await axios.get(`/api/get-task-project/${taskId}`);
            if (response.data.success) {
                navigate(`/joined-projects?highlightProject=${response.data.projectId}&highlightTask=${taskId}`);
            } else {
                showToast('Failed to load task', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred while loading the task', 'error');
        }
    };

    const markAsRead = async (notificationId) => {
        if (buttonStates.current.get(notificationId)) return;
        buttonStates.current.set(notificationId, true);

        try {
            const response = await axios.post('/api/mark-notification-read', { notificationId });
            if (response.data.success) {
                setTaskNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId ? { ...notif, is_read: true } : notif
                    )
                );
                setProjectCreationNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId ? { ...notif, is_read: true } : notif
                    )
                );
                showToast('Notification marked as read');
            } else {
                showToast(response.data.message || 'Failed to mark as read', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred while marking as read', 'error');
        } finally {
            buttonStates.current.delete(notificationId);
        }
    };

    const deleteNotification = async (notificationId) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;

        if (buttonStates.current.get(notificationId)) return;
        buttonStates.current.set(notificationId, true);

        try {
            const response = await axios.post('/api/delete-notification', { notificationId });
            if (response.data.success) {
                setTaskNotifications(prev => prev.filter(notif => notif.id !== notificationId));
                setProjectCreationNotifications(prev => prev.filter(notif => notif.id !== notificationId));
                showToast('Notification deleted successfully');
            } else {
                showToast(response.data.message || 'Failed to delete notification', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('An error occurred while deleting the notification', 'error');
        } finally {
            buttonStates.current.delete(notificationId);
        }
    };

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

    const getMemberBadgeCount = () => {
        const unreadTasks = taskNotifications.filter(notif => !notif.is_read).length;
        const pendingApplications = myApplications.filter(app => app.status === 'pending').length;
        return unreadTasks + pendingApplications;
    };

    const getLeaderBadgeCount = () => {
        const unreadProjectNotifications = projectCreationNotifications.filter(notif => !notif.is_read).length;
        const pendingJoinRequests = joinRequests.filter(req => req.status === 'pending').length;
        return unreadProjectNotifications + pendingJoinRequests;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Chat Modal Functions
    const openChatModal = async (request) => {
        setCurrentChatRequest(request);
        setChatModalOpen(true);
        await fetchChatMessages(request.id);
    };

    const closeChatModal = () => {
        setChatModalOpen(false);
        setCurrentChatRequest(null);
        setChatMessages([]);
        setNewMessage('');
    };

    const fetchChatMessages = async (requestId) => {
        try {
            const response = await axios.get(`/api/join-request-messages/${requestId}`);
            if (response.data.success) {
                setChatMessages(response.data.messages);
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            showToast('Failed to load messages', 'error');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const response = await axios.post('/api/send-join-request-message', {
                requestId: currentChatRequest.id,
                message: newMessage
            });

            if (response.data.success) {
                setChatMessages(prev => [...prev, response.data.message]);
                setNewMessage('');
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('requestId', currentChatRequest.id);

        setUploadingFile(true);
        try {
            const response = await axios.post('/api/upload-join-request-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setChatMessages(prev => [...prev, response.data.message]);
                showToast('File uploaded successfully');
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showToast('Failed to upload file', 'error');
        } finally {
            setUploadingFile(false);
            event.target.value = '';
        }
    };

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && profileModalOpen) {
                closeProfileModal();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [profileModalOpen]);

    if (loading) {
        return (
            <div className="project-notifications-container">
                <NavBar />
                <main className="project-notifications-main">
                    <div className="dashboard-header">
                        <h1 className="dashboard-title">Loading...</h1>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="project-notifications-container">
            <NavBar />
            <main className="project-notifications-main">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Notifications</h1>
                    <p className="user-greeting">
                        Welcome back, {user?.name || 'Guest'}. Here are your latest notifications.
                    </p>
                </div>

                <div className="notification-columns">
                    {/* Member Inbox */}
                    <div className="notification-column">
                        <div className="column-header">
                            <h2>As a Member Inbox</h2>
                            <span className="badge">{getMemberBadgeCount()}</span>
                        </div>
                        <MemberNotificationBox
                            taskNotifications={taskNotifications}
                            myApplications={myApplications}
                            formatDate={formatDate}
                            viewTask={viewTask}
                            markAsRead={markAsRead}
                            deleteNotification={deleteNotification}
                            viewProfile={viewProfile}
                            openChatModal={openChatModal}
                            deleteRequest={deleteRequest}
                        />
                    </div>
                    {/* Team Leader Inbox */}
                    <div className="notification-column">
                        <div className="column-header">
                            <h2>Team Leader Inbox</h2>
                            <span className="badge">{getLeaderBadgeCount()}</span>
                        </div>
                        <LeaderNotificationBox
                            joinRequests={joinRequests}
                            projectCreationNotifications={projectCreationNotifications}
                            formatDate={formatDate}
                            viewProfile={viewProfile}
                            openChatModal={openChatModal}
                            approveRequest={approveRequest}
                            rejectRequest={rejectRequest}
                            deleteNotification={deleteNotification}
                            deleteRequest={deleteRequest}
                        />
                    </div>
                </div>
            </main>

            {/* Profile Modal */}
            <div 
                id="profile-modal" 
                className={`modal ${profileModalOpen ? 'open' : ''}`} 
                role="dialog" 
                aria-modal="true" 
                aria-hidden={!profileModalOpen}
            >
                <div className="modal-backdrop" onClick={closeProfileModal}></div>
                <div className="modal-content" role="document" aria-label="User profile">
                    <button 
                        className="modal-close" 
                        onClick={closeProfileModal} 
                        aria-label="Close profile"
                    >
                        ✕
                    </button>
                    <div id="profile-modal-body">
                        {!profileData ? (
                            <div className="profile-section">Loading profile…</div>
                        ) : profileData.loading ? (
                            <div className="profile-section">Loading profile…</div>
                        ) : profileData.error ? (
                            <div className="profile-section">{profileData.error}</div>
                        ) : (
                            <>
                                <div className="profile-header">
                                    {profileData.avatarUrl ? (
                                        <img 
                                            src={profileData.avatarUrl} 
                                            alt={profileData.name} 
                                            style={{
                                                width: '72px', 
                                                height: '72px', 
                                                borderRadius: '50%', 
                                                objectFit: 'cover',
                                                border: '1px solid rgba(255,255,255,0.06)'
                                            }}
                                        />
                                    ) : (
                                        <div className="profile-avatar">
                                            {(profileData.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="profile-name">{profileData.name}</h2>
                                        <div className="profile-meta">{profileData.email}</div>
                                    </div>
                                </div>
                                <div className="profile-section" style={{marginTop: '8px'}}>
                                    {profileData.bio ? (
                                        <>
                                            <strong>About:</strong>
                                            <div style={{marginTop: '6px', color: 'var(--medium-text)'}}>
                                                {profileData.bio}
                                            </div>
                                        </>
                                    ) : (
                                        <em style={{color: 'var(--medium-text)'}}>No bio provided</em>
                                    )}
                                </div>
                                <div style={{marginTop: '12px'}}>
                                    {profileData.skills && profileData.skills.length > 0 && (
                                        <div style={{marginBottom: '8px'}}>
                                            <strong>Skills</strong>
                                            <div>
                                                {profileData.skills.map((skill, index) => (
                                                    <span key={index} className="chip">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {profileData.interests && profileData.interests.length > 0 && (
                                        <div>
                                            <strong>Interests</strong>
                                            <div>
                                                {profileData.interests.map((interest, index) => (
                                                    <span key={index} className="chip">{interest}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{marginTop: '14px', textAlign: 'right'}}>
                                    {profileData.resumeUrl && (
                                        <a 
                                            className="view-review-btn" 
                                            href={profileData.resumeUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            View Resume
                                        </a>
                                    )}
                                    <button 
                                        className="view-review-btn" 
                                        onClick={closeProfileModal} 
                                        style={{marginLeft: '6px'}}
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Modal */}
            <div 
                id="chat-modal" 
                className={`modal ${chatModalOpen ? 'open' : ''}`} 
                role="dialog" 
                aria-modal="true" 
                aria-hidden={!chatModalOpen}
            >
                <div className="modal-backdrop" onClick={closeChatModal}></div>
                <div className="modal-content" role="document" aria-label="Chat with applicant" style={{maxWidth: '600px'}}>
                    <button 
                        className="modal-close" 
                        onClick={closeChatModal} 
                        aria-label="Close chat"
                    >
                        ✕
                    </button>
                    {currentChatRequest && (
                        <>
                            <div className="profile-header" style={{marginBottom: '16px'}}>
                                <div className="profile-avatar">
                                    {currentChatRequest.user_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="profile-name">
                                        Chat with {currentChatRequest.user_name}
                                        {currentChatRequest.isApplicant && ' (Project Owner)'}
                                        {currentChatRequest.isCreator && ' (Applicant)'}
                                    </h2>
                                    <div className="profile-meta">Project: {currentChatRequest.project_name}</div>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div style={{
                                height: '400px',
                                overflowY: 'auto',
                                padding: '12px',
                                background: 'var(--darker-bg)',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                {chatMessages.length === 0 ? (
                                    <div style={{textAlign: 'center', color: 'var(--medium-text)', padding: '20px'}}>
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    chatMessages.map((msg, index) => (
                                        <div 
                                            key={index} 
                                            style={{
                                                marginBottom: '12px',
                                                textAlign: msg.sender_id._id === user?.id ? 'right' : 'left'
                                            }}
                                        >
                                            <div style={{
                                                display: 'inline-block',
                                                maxWidth: '70%',
                                                padding: '8px 12px',
                                                borderRadius: '12px',
                                                background: msg.sender_id._id === user?.id ? 'var(--primary-color)' : 'var(--card-bg)',
                                                color: 'var(--light-text)',
                                                textAlign: 'left'
                                            }}>
                                                <div style={{fontSize: '0.75rem', opacity: 0.7, marginBottom: '4px'}}>
                                                    {msg.sender_id.name}
                                                </div>
                                                {msg.file_url ? (
                                                    <div>
                                                        <a 
                                                            href={`http://localhost:5000${msg.file_url}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{color: 'var(--light-text)', textDecoration: 'underline'}}
                                                        >
                                                            📎 {msg.file_name}
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div>{msg.message}</div>
                                                )}
                                                <div style={{fontSize: '0.7rem', opacity: 0.5, marginTop: '4px'}}>
                                                    {new Date(msg.created_at).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Message Input */}
                            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        color: 'var(--light-text)'
                                    }}
                                />
                                <label 
                                    htmlFor="file-upload" 
                                    className="view-review-btn"
                                    style={{
                                        cursor: 'pointer',
                                        margin: 0,
                                        padding: '10px 12px'
                                    }}
                                >
                                    {uploadingFile ? '⏳' : '📎'}
                                </label>
                                <input
                                    id="file-upload"
                                    type="file"
                                    onChange={handleFileUpload}
                                    style={{display: 'none'}}
                                    disabled={uploadingFile}
                                />
                                <button 
                                    className="view-review-btn approve"
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim()}
                                    style={{margin: 0}}
                                >
                                    Send
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <footer className="project-notifications-footer">
                <p>© 2025 RELABTeams Platform • Version 2.4.1 • Last updated: March 24, 2025</p>
            </footer>
        </div>
    );
};

export default ProjectNotifications;
