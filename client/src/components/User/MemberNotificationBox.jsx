import React from 'react';

const MemberNotificationBox = ({
    taskNotifications = [],
    myApplications = [],
    projectInvites = [],
    formatDate,
    viewTask,
    markAsRead,
    deleteNotification,
    viewProfile,
    openChatModal,
    deleteRequest,
    respondToInvite
}) => (
    <div className="notification-list">
        {taskNotifications.length === 0 && myApplications.length === 0 && projectInvites.length === 0 ? (
            <div className="empty-state">No member notifications available</div>
        ) : (
            <>
                                {/* Project Invites (as invitee) */}
                                {projectInvites.map(invite => (
                                    <div
                                        key={invite.id}
                                        className="notification-card"
                                        data-id={invite.id}
                                    >
                                        <div className="notification-header">
                                            <h3 className="notification-title">Project Invitation</h3>
                                            <span className="notification-date">
                                                {formatDate(invite.created_at)}
                                            </span>
                                        </div>
                                        <div className="notification-content">
                                            <div className="team-member-profile">
                                                <div className="team-member-avatar">
                                                    {invite.from_user_name ? invite.from_user_name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <span className="team-member-name">{invite.from_user_name}</span>
                                            </div>
                                            <p>
                                                {invite.from_user_name} invited you to join project: {invite.project_name}
                                            </p>
                                        </div>
                                        <div className="notification-footer">
                                            <button
                                                className="view-review-btn approve"
                                                onClick={e => respondToInvite(invite.id, 'accept', e)}
                                                aria-label="Accept Invite"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="view-review-btn reject"
                                                onClick={e => respondToInvite(invite.id, 'reject', e)}
                                                aria-label="Reject Invite"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                {taskNotifications.map(notification => (
                    <div 
                        key={notification.id} 
                        className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                        data-id={notification.id}
                    >
                        <div className="notification-header">
                            <h3 className="notification-title">
                                {notification.type === 'join_request_approved' 
                                    ? 'Join Request Approved' 
                                    : (notification.task_title ? `Task: ${notification.task_title}` : 'Project Update')}
                            </h3>
                            <span className="notification-date">
                                {formatDate(notification.created_at)}
                            </span>
                        </div>
                        <div className="notification-content">
                            <p>{notification.message}</p>
                        </div>
                        <div className="notification-footer">
                            {notification.type === 'task' && 
                             !notification.message.includes('approved') && 
                             !notification.message.includes('rejected') && (
                                <button 
                                    className="view-review-btn" 
                                    onClick={() => viewTask(notification.task_id, notification.id)}
                                    aria-label="View Task"
                                >
                                    View Task
                                </button>
                            )}
                            {!notification.is_read && (
                                <button 
                                    className="view-review-btn approve" 
                                    onClick={() => markAsRead(notification.id)}
                                    aria-label="Mark as Read"
                                >
                                    Mark as Read
                                </button>
                            )}
                            <button 
                                className="delete-btn" 
                                onClick={() => deleteNotification(notification.id)}
                                aria-label="Delete Notification"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}

                {/* My Join Applications (as member/applicant) */}
                {myApplications.map(request => (
                    <div 
                        key={request.id} 
                        className="notification-card"
                        data-id={request.id}
                    >
                        <div className="notification-header">
                            <h3 className="notification-title">Your Join Request</h3>
                            <span className="notification-date">
                                {formatDate(request.created_at)}
                            </span>
                        </div>
                        <div className="notification-content">
                            <div 
                                className="team-member-profile" 
                                onClick={() => viewProfile(request.user_id)}
                            >
                                <div className="team-member-avatar">
                                    {request.user_name ? request.user_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span className="team-member-name">{request.user_name}</span>
                            </div>
                            <p>You requested to join project: {request.project_name} (Owner: {request.user_name})</p>
                        </div>
                        <div className="notification-footer">
                            {request.status === 'pending' ? (
                                <>
                                    <button 
                                        className="view-review-btn" 
                                        onClick={() => openChatModal(request)}
                                        aria-label="Chat with Owner"
                                        style={{background: '#2196F3'}}
                                    >
                                        💬 Chat
                                    </button>
                                    <span className="view-review-btn info" style={{cursor: 'default', background: '#FF9800'}}>
                                        Pending Approval
                                    </span>
                                </>
                            ) : (
                                <span className="view-review-btn info" style={{cursor: 'default'}}>
                                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                </span>
                            )}
                            <button 
                                className="delete-btn" 
                                onClick={() => deleteRequest(request.id)}
                                aria-label="Delete Request"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </>
        )}
    </div>
);

export default MemberNotificationBox;
