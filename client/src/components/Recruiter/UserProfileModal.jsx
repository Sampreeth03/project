import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserProfile, clearUserProfile } from '../../store/recruiterSlice';

const UserProfileModal = ({ userId, userName, onClose }) => {
    const dispatch = useDispatch();
    const { data: profileData, loading, error } = useSelector(state => state.recruiter.userProfile);

    useEffect(() => {
        if (userId) {
            dispatch(fetchUserProfile(userId));
        }
        return () => {
            dispatch(clearUserProfile());
        };
    }, [userId, dispatch]);

    if (!userId) return null;

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        overflow: 'auto',
        padding: '20px'
    };

    const modalStyle = {
        backgroundColor: '#000',
        color: '#fff',
        maxWidth: '800px',
        maxHeight: '90vh',
        margin: '0 auto',
        padding: '20px',
        position: 'relative',
        overflowY: 'auto'
    };

    const closeButtonStyle = {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#fff'
    };

    const textStyle = {
        color: '#fff'
    };

    return (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={modalStyle}>
                <button style={closeButtonStyle} onClick={onClose}>×</button>
                
                <h2 style={{ borderBottom: '1px solid #fff', paddingBottom: '10px', color: '#fff' }}>
                    User Profile - {userName}
                </h2>

                {loading && <p style={textStyle}>Loading...</p>}
                
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
                
                {!loading && !error && profileData && profileData.user && (
                    <div style={{ padding: '10px', color: '#fff' }}>
                        <p style={textStyle}><strong>Name:</strong> {profileData.user.name}</p>
                        <p style={textStyle}><strong>Email:</strong> {profileData.user.email}</p>
                        
                        {profileData.user.about && <p style={textStyle}><strong>About:</strong> {profileData.user.about}</p>}
                        
                        {profileData.user.skills && profileData.user.skills.length > 0 && (
                            <p style={textStyle}><strong>Skills:</strong> {profileData.user.skills.join(', ')}</p>
                        )}
                        
                        {profileData.user.interests && profileData.user.interests.length > 0 && (
                            <p style={textStyle}><strong>Interests:</strong> {profileData.user.interests.join(', ')}</p>
                        )}
                        
                        <br />
                        <p style={textStyle}><strong>Statistics:</strong></p>
                        <p style={textStyle}>• Collaborations: {profileData.metrics?.total_collaborations || 0}</p>
                        <p style={textStyle}>• Active Projects: {profileData.metrics?.active_projects || 0}</p>
                        <p style={textStyle}>• Completed Tasks: {profileData.metrics?.completed_tasks || 0}</p>
                        <p style={textStyle}>• Leadership Roles: {profileData.metrics?.leadership_roles || 0}</p>
                        
                        <br />
                        <div style={{ borderBottom: '1px solid #fff', paddingBottom: '5px', marginBottom: '10px' }}>
                            <p style={{ ...textStyle, fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Projects Done as Team Leader</p>
                        </div>
                        {(() => {
                            const leaderProjects = profileData.projects?.filter(p => p.role === 'leader' && p.status === 'completed') || [];
                            return leaderProjects.length > 0 ? (
                                <>
                                    <p style={{ ...textStyle, marginLeft: '20px', color: '#00bfff' }}>
                                        Total Projects Led: <strong>{leaderProjects.length}</strong>
                                    </p>
                                    {leaderProjects.map((project, idx) => (
                                        <div key={idx} style={{ marginLeft: '20px', marginBottom: '15px', color: '#fff' }}>
                                            <p style={textStyle}><strong>Project Title:</strong> {project.title}</p>
                                            {project.description && <p style={{ marginLeft: '20px', color: '#fff' }}><strong>Description:</strong> {project.description}</p>}
                                            <p style={{ marginLeft: '20px', color: '#FFD700' }}>Completed this project as the team leader</p>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <p style={{ ...textStyle, marginLeft: '20px' }}>No projects completed as team leader</p>
                            );
                        })()}
                        
                        <br />
                        <div style={{ borderBottom: '1px solid #fff', paddingBottom: '5px', marginBottom: '10px' }}>
                            <p style={{ ...textStyle, fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Tasks Done</p>
                        </div>
                        {profileData.completedTasks && profileData.completedTasks.length > 0 ? (
                            profileData.completedTasks.map((projectGroup, idx) => (
                                <div key={idx} style={{ marginBottom: '20px', color: '#fff' }}>
                                    <p style={{ ...textStyle, fontWeight: 'bold', marginLeft: '20px' }}><strong>Project Name:</strong> {projectGroup.projectTitle}</p>
                                    {projectGroup.tasks.map((task, taskIdx) => (
                                        <div key={taskIdx} style={{ marginLeft: '40px', marginBottom: '10px', color: '#fff' }}>
                                            <p style={textStyle}>
                                                <strong>Task:</strong> {task.title}
                                                {task.github_link && (
                                                    <span> - <a href={task.github_link} target="_blank" rel="noopener noreferrer" style={{ color: '#00bfff' }}>GitHub Link</a></span>
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <p style={{ ...textStyle, marginLeft: '20px' }}>No completed tasks</p>
                        )}
                        
                        {profileData.user.resumeUrl && (
                            <>
                                <br />
                                <a href={profileData.user.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#00bfff' }}>
                                    View Resume
                                </a>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;
