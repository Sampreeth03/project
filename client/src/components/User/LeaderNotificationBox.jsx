import React from 'react';

const LeaderNotificationBox = ({
    joinRequests = [],
    projectCreationNotifications = [],
    formatDate,
    viewProfile,
    openChatModal,
    approveRequest,
    rejectRequest,
    deleteNotification,
    deleteRequest
}) => (
    <div className="notification-list">
        {joinRequests.length === 0 && projectCreationNotifications.length === 0 ? (
            <div className="empty-state">No team leader notifications available</div>
        ) : (
            <>
                {projectCreationNotifications.map(notification => (
                    <div 
                        key={notification.id} 
                        className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                        data-id={notification.id}
                    >
                        <div className="notification-header">
                            <h3 className="notification-title">
                                {notification.type === 'project_creation' 
                                    ? 'Project Creation' 
                                    : notification.type === 'project_completion' 
                                        ? 'Project Completion' 
                                        : 'Join Request Approved'}
                            </h3>
                            <span className="notification-date">
                                {formatDate(notification.created_at)}
                            </span>
                        </div>
                        <div className="notification-content">
                            <p>{notification.message}</p>
                        </div>
                        <div className="notification-footer">
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

                {joinRequests.map(request => (
                    <div 
                        key={request.id} 
                        className="notification-card"
                        data-id={request.id}
                    >
                        <div className="notification-header">
                            <h3 className="notification-title">
                                {request.isApplicant ? 'Your Join Request' : 'Join Request'}
                            </h3>
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
                            <p>
                                {request.isApplicant 
                                    ? `You requested to join project: ${request.project_name} (Owner: ${request.user_name})`
                                    : `${request.user_name} wants to join your project: ${request.project_name}`
                                }
                            </p>
                        </div>
                        <div className="notification-footer" id={`footer-${request.id}`}>
                            {request.status === 'pending' ? (
                                <>
                                    <button 
                                        className="view-review-btn" 
                                        onClick={() => openChatModal(request)}
                                        aria-label={request.isApplicant ? "Chat with Owner" : "Chat with Applicant"}
                                        style={{background: '#2196F3'}}
                                    >
                                        💬 Chat
                                    </button>
                                    {request.isCreator && (
                                        <>
                                            <button 
                                                className="view-review-btn approve" 
                                                onClick={(e) => approveRequest(request.id, e)}
                                                aria-label="Approve Request"
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                className="view-review-btn reject" 
                                                onClick={(e) => rejectRequest(request.id, e)}
                                                aria-label="Reject Request"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    {request.isApplicant && (
                                        <span className="view-review-btn info" style={{cursor: 'default', background: '#FF9800'}}>
                                            Pending Approval
                                        </span>
                                    )}
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

export default LeaderNotificationBox;
