import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext.jsx';
import NavBar from './NavBar.jsx';
import UserFooter from './UserFooter.jsx';
import '../../styles/Profile.css';

const Profile = () => {
    const { id } = useParams(); // Get user ID from URL if viewing another user's profile
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Form state for editing
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        about: '',
        skills: '',
        interests: '',
        profilePic: null,
        resume: null
    });

    // Profile image preview
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [resumePreview, setResumePreview] = useState(null);

    // Determine which user ID to fetch (from URL param or current user)
    const targetUserId = id || (currentUser?.id || currentUser?._id);
    const isOwnProfile = !id || (currentUser && targetUserId === (currentUser?.id || currentUser?._id));

    useEffect(() => {
        // Always fetch profile data, even if currentUser is not loaded yet
        fetchProfileData();
    }, [id, currentUser?.id]);

    const fetchProfileData = async () => {
        // If no target user ID and no URL param, try to get current user's profile from session
        let userIdToFetch = targetUserId;
        
        if (!userIdToFetch && !id) {
            try {
                // Try to get current user from session
                const sessionResponse = await axios.get('/api/home');
                if (sessionResponse.data.success && sessionResponse.data.user) {
                    userIdToFetch = sessionResponse.data.user.id;
                }
            } catch (err) {
                console.error('Failed to get session user:', err);
            }
        }
        
        if (!userIdToFetch) {
            setError('Please login to view profile');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`/api/profile-data/${userIdToFetch}`);
            
            if (response.data.success && response.data.user) {
                const userData = response.data.user;
                console.log('Profile data received:', userData);
                console.log('Completed projects:', userData.completedProjects);
                console.log('Total completed tasks:', userData.totalCompletedTasks);
                setUser(userData);
                
                // Pre-fill form data for editing
                setFormData({
                    name: userData.name || '',
                    email: userData.email || '',
                    about: userData.bio || userData.about || '',
                    skills: Array.isArray(userData.skills) ? userData.skills.join(', ') : '',
                    interests: Array.isArray(userData.interests) ? userData.interests.join(', ') : '',
                    profilePic: null,
                    resume: null
                });

                setProfileImagePreview(userData.avatarUrl || userData.profileImageUrl || null);
                setResumePreview(userData.resumeUrl || null);
            } else {
                setError('Failed to load profile data');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.response?.data?.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            setFormData(prev => ({
                ...prev,
                [name]: files[0]
            }));

            // Create preview
            const reader = new FileReader();
            reader.onload = (event) => {
                if (name === 'profilePic') {
                    setProfileImagePreview(event.target.result);
                } else if (name === 'resume') {
                    setResumePreview(event.target.result);
                }
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const handleProfilePicClick = () => {
        document.getElementById('directProfilePic').click();
    };

    const handleResumeClick = () => {
        document.getElementById('directResume').click();
    };

    const toggleEditMode = () => {
        if (!isEditMode) {
            // Entering edit mode - reset form with current user data
            setFormData({
                name: user?.name || '',
                email: user?.email || '',
                about: user?.bio || user?.about || '',
                skills: Array.isArray(user?.skills) ? user.skills.join(', ') : '',
                interests: Array.isArray(user?.interests) ? user.interests.join(', ') : '',
                profilePic: null,
                resume: null
            });
        }
        setIsEditMode(!isEditMode);
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        // Reset previews to original
        setProfileImagePreview(user?.avatarUrl || user?.profileImageUrl || null);
        setResumePreview(user?.resumeUrl || null);
    };

    const saveChanges = async () => {
        try {
            const formDataToSend = new FormData();
            
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('about', formData.about);
            formDataToSend.append('skills', formData.skills);
            formDataToSend.append('interests', formData.interests);
            
            if (formData.profilePic) {
                formDataToSend.append('picture', formData.profilePic);
            }
            
            if (formData.resume) {
                formDataToSend.append('resume', formData.resume);
            }

            const response = await axios.post('/api/profile', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success && response.data.user) {
                // Update local state with new user data
                const updatedUser = response.data.user;
                setUser({
                    ...user,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    bio: updatedUser.about,
                    about: updatedUser.about,
                    skills: updatedUser.skills || [],
                    interests: updatedUser.interests || [],
                    avatarUrl: updatedUser.profileImageUrl || user?.avatarUrl,
                    profileImageUrl: updatedUser.profileImageUrl || user?.profileImageUrl,
                    resumeUrl: updatedUser.resumeUrl || user?.resumeUrl
                });

                setProfileImagePreview(updatedUser.profileImageUrl || profileImagePreview);
                setResumePreview(updatedUser.resumeUrl || resumePreview);
                
                setIsEditMode(false);
                alert('Profile updated successfully!');
            } else {
                alert('Failed to update profile');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            alert(err.response?.data?.error || 'Failed to update profile');
        }
    };

    if (loading) {
        return (
            <div>
                <NavBar />
                <div style={{ marginTop: '100px', textAlign: 'center', color: '#fff', fontSize: '18px' }}>
                    <div style={{ marginBottom: '10px' }}>Loading profile...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <NavBar />
                <div style={{ marginTop: '100px', textAlign: 'center', color: '#ff4444', fontSize: '18px' }}>
                    <div style={{ marginBottom: '10px' }}>{error}</div>
                    {error.includes('login') && (
                        <a href="/login" style={{ color: '#0068FF', textDecoration: 'underline' }}>
                            Click here to login
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div>
            <NavBar />
            <div className="profile-container">
                {isOwnProfile && (
                    <button className="edit-button" onClick={toggleEditMode} title="Edit profile">
                        <svg className="edit-svgIcon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                            <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/>
                        </svg>
                    </button>
                )}

                <div className="profile-header">
                    <div 
                        className="profile-pic" 
                        id="profilePic" 
                        style={profileImagePreview ? { backgroundColor: 'transparent' } : {}}
                    >
                        {profileImagePreview ? (
                            <img 
                                id="profileImage" 
                                src={profileImagePreview} 
                                alt="Profile Picture" 
                            />
                        ) : (
                            isOwnProfile && (
                                <div 
                                    tabIndex="0" 
                                    className="plusButton" 
                                    onClick={handleProfilePicClick}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <svg className="plusIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
                                        <path d="M13.75 23.75V16.25H6.25V13.75H13.75V6.25H16.25V13.75H23.75V16.25H16.25V23.75H13.75Z"></path>
                                    </svg>
                                </div>
                            )
                        )}
                        {isOwnProfile && (
                            <input 
                                id="directProfilePic" 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={(e) => {
                                    handleFileChange({
                                        target: {
                                            name: 'profilePic',
                                            files: e.target.files
                                        }
                                    });
                                    // Auto-save when uploading directly
                                    if (e.target.files && e.target.files[0]) {
                                        const fd = new FormData();
                                        fd.append('picture', e.target.files[0]);
                                        axios.post('/api/profile', fd).then(() => {
                                            fetchProfileData();
                                        }).catch(err => {
                                            console.error('Error uploading profile pic:', err);
                                        });
                                    }
                                }}
                            />
                        )}
                    </div>

                    <div className="profile-info">
                        <h2 id="displayName">{user?.name || 'Your name'}</h2>
                        <p id="displayEmail">Email: {user?.email || ''}</p>
                        <div className="feedback">
                            <span>Joined: <strong>{user?.joinedAgo || 'N/A'}</strong></span>
                            {user?.totalCompletedTasks !== undefined && (
                                <span>Completed Tasks: <strong>{user.totalCompletedTasks}</strong></span>
                            )}
                        </div>
                    </div>
                </div>

                <hr />

                <div className="profile-details">
                    <div className="details-container">
                        <h3>About Me:</h3>
                        <p id="displayAbout" style={{ fontSize: '18px', color: '#c3bfbf' }}>
                            {user?.bio || user?.about || 'No bio available'}
                        </p>
                    </div>

                    <div className="details-container">
                        <h3>Skills:</h3>
                        <div className="skills" id="skillsContainer">
                            {user?.skills && Array.isArray(user.skills) && user.skills.length > 0 ? (
                                user.skills.map((skill, index) => (
                                    <span key={index} className="skill">{skill}</span>
                                ))
                            ) : (
                                <p style={{ color: '#888' }}>No skills listed</p>
                            )}
                        </div>
                    </div>

                    <div className="details-container">
                        <h3>Interested In:</h3>
                        <div className="interests" id="interestsContainer">
                            {user?.interests && Array.isArray(user.interests) && user.interests.length > 0 ? (
                                user.interests.map((interest, index) => (
                                    <span key={index} className="interest">{interest}</span>
                                ))
                            ) : (
                                <p style={{ color: '#888' }}>No interests listed</p>
                            )}
                        </div>
                    </div>

                    <hr />
                    
                    {/* Completed Projects and Tasks Section */}
                    <div className="details-container">
                        <h3>Completed Tasks in Projects:</h3>
                        
                        {user?.completedProjects && user.completedProjects.length > 0 ? (
                            <>
                                <p style={{ color: '#0068FF', fontSize: '16px', marginBottom: '15px' }}>
                                    Total Completed Tasks: <strong>{user.totalCompletedTasks || 0}</strong>
                                </p>
                                
                                {user.completedProjects.map((project, index) => (
                                    <div key={project.projectId || index} className="completed-project-card">
                                        <h4 className="project-title-completed">{project.projectTitle}</h4>
                                        <div className="completed-tasks-list">
                                            {project.tasks.map((task, taskIndex) => (
                                                <div key={task.taskId || taskIndex} className="completed-task-item">
                                                    <div>
                                                        <span className="task-title-text">{task.title}</span>
                                                    </div>
                                                    {task.description && (
                                                        <p className="task-description">{task.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p style={{ color: '#888' }}>No completed tasks yet</p>
                        )}
                    </div>
                    
                    <hr />

                    {/* Completed Projects as Team Leader Section */}
                    <div className="details-container">
                        <h3>Completed Projects as Team Leader:</h3>
                        
                        {user?.completedAsLeader && user.completedAsLeader.length > 0 ? (
                            <>
                                <p style={{ color: '#0068FF', fontSize: '16px', marginBottom: '15px' }}>
                                    Total Projects Led: <strong>{user.completedAsLeader.length}</strong>
                                </p>
                                
                                {user.completedAsLeader.map((project, index) => (
                                    <div key={project.projectId || index} className="completed-project-card leader-project">
                                        <h4 className="project-title-completed">{project.projectTitle}</h4>
                                        {project.description && (
                                            <p className="project-description">{project.description}</p>
                                        )}
                                        <p className="leader-badge">Completed this project as the team leader</p>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p style={{ color: '#888' }}>No projects completed as team leader yet</p>
                        )}
                    </div>
                    
                    <hr />
                    
                    <h3 style={{ color: '#fff', fontSize: '24px' }}>Resume:</h3>
                    <div className="resume-container">
                        {isOwnProfile && !resumePreview && (
                            <button 
                                id="addResumeBtn" 
                                className="add-resume-btn"
                                onClick={handleResumeClick}
                            >
                                <span className="text">Add Resume</span>
                                <span className="buttonSpan">+</span>
                            </button>
                        )}
                        {resumePreview && (
                            <iframe 
                                id="resumeFrame" 
                                src={resumePreview}
                                title="Resume"
                            />
                        )}
                        {isOwnProfile && (
                            <input 
                                id="directResume" 
                                type="file" 
                                accept=".pdf" 
                                style={{ display: 'none' }} 
                                onChange={(e) => {
                                    handleFileChange({
                                        target: {
                                            name: 'resume',
                                            files: e.target.files
                                        }
                                    });
                                    // Auto-save when uploading directly
                                    if (e.target.files && e.target.files[0]) {
                                        const fd = new FormData();
                                        fd.append('resume', e.target.files[0]);
                                        axios.post('/api/profile', fd).then(() => {
                                            fetchProfileData();
                                        }).catch(err => {
                                            console.error('Error uploading resume:', err);
                                        });
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Edit Mode Modal */}
                {isEditMode && (
                    <div className="edit-mode active">
                        <div className="edit-mode-content">
                            <form id="editForm" onSubmit={(e) => { e.preventDefault(); saveChanges(); }}>
                                <label htmlFor="editName">Name:</label>
                                <input 
                                    id="editName" 
                                    name="name" 
                                    type="text" 
                                    placeholder="Name" 
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />

                                <label htmlFor="editEmail">Email:</label>
                                <input 
                                    id="editEmail" 
                                    name="email" 
                                    type="email" 
                                    placeholder="Email" 
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />

                                <label htmlFor="editAbout">About Me:</label>
                                <textarea 
                                    id="editAbout" 
                                    name="about" 
                                    placeholder="About Me" 
                                    rows="4"
                                    value={formData.about}
                                    onChange={handleInputChange}
                                />

                                <label htmlFor="editSkills">Skills (comma separated):</label>
                                <input 
                                    id="editSkills" 
                                    name="skills" 
                                    type="text" 
                                    placeholder="JavaScript, Node.js" 
                                    value={formData.skills}
                                    onChange={handleInputChange}
                                />

                                <label htmlFor="editInterests">Interests (comma separated):</label>
                                <input 
                                    id="editInterests" 
                                    name="interests" 
                                    type="text" 
                                    placeholder="Blockchain, AI" 
                                    value={formData.interests}
                                    onChange={handleInputChange}
                                />

                                <label htmlFor="editProfilePic">Profile Picture:</label>
                                <input 
                                    id="editProfilePic" 
                                    name="profilePic" 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange}
                                />

                                <label htmlFor="editResume">Resume (PDF):</label>
                                <input 
                                    id="editResume" 
                                    name="resume" 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={handleFileChange}
                                />

                                <div className="but-cont">
                                    <button type="button" className="btn-save" onClick={saveChanges}>
                                        Save
                                    </button>
                                    <button type="button" className="btn-cancel" onClick={cancelEdit}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <UserFooter />
        </div>
    );
};

export default Profile;
