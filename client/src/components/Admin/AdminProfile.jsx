import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { fetchProfileData, updateProfile } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminProfile = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { profile, profileLoading, profileError } = useSelector((state) => state.admin);
    const [isEditing, setIsEditing] = useState(false);
    const [localProfile, setLocalProfile] = useState(profile);

    useEffect(() => {
        dispatch(fetchProfileData());
    }, [dispatch]);

    useEffect(() => {
        setLocalProfile(profile);
    }, [profile]);

    const handleEdit = () => {
        setIsEditing(!isEditing);
    };

    const handleChange = (e) => {
        setLocalProfile({
            ...localProfile,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = () => {
        setIsEditing(false);
        dispatch(updateProfile(localProfile));
        // Here you would typically make an API call to save the profile
        console.log('Profile saved:', localProfile);
    };

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {profileLoading && <div className="loading-message">Loading profile...</div>}
                {profileError && <div className="error-message">Error: {profileError}. Please login as admin.</div>}
                {!profileLoading && !profileError && (
                <div className="profile-container">
                    <div className="profile-header">
                        <div className="profile-avatar">
                            <i className="fas fa-user"></i>
                        </div>
                        <div className="profile-info">
                            <h2>{profile.fullName || 'Admin User'}</h2>
                            <div className="role">{profile.role}</div>
                        </div>
                    </div>

                    <div className="profile-details">
                        <div className="detail-group">
                            <h3>Personal Information</h3>
                            <div className="detail-item">
                                <div className="detail-label">Full Name</div>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        name="fullName"
                                        className="detail-input"
                                        value={localProfile.fullName}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <div className="detail-value">{profile.fullName || 'N/A'}</div>
                                )}
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Email</div>
                                {isEditing ? (
                                    <input 
                                        type="email" 
                                        name="email"
                                        className="detail-input"
                                        value={localProfile.email}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <div className="detail-value">{profile.email || 'N/A'}</div>
                                )}
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Phone</div>
                                {isEditing ? (
                                    <input 
                                        type="tel" 
                                        name="phone"
                                        className="detail-input"
                                        value={localProfile.phone}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <div className="detail-value">{profile.phone || 'N/A'}</div>
                                )}
                            </div>
                        </div>

                        <div className="detail-group">
                            <h3>Account Information</h3>
                            <div className="detail-item">
                                <div className="detail-label">Role</div>
                                <div className="detail-value">{profile.role}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Joined</div>
                                <div className="detail-value">{profile.joined || 'N/A'}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Last Login</div>
                                <div className="detail-value">{profile.lastLogin || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="profile-actions">
                            {isEditing ? (
                                <>
                                    <button className="btn btn-primary" onClick={handleSave}>
                                        <i className="fas fa-save"></i> Save Changes
                                    </button>
                                    <button className="btn btn-outline" onClick={() => setIsEditing(false)}>
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="btn btn-primary" onClick={handleEdit}>
                                        <i className="fas fa-edit"></i> Edit Profile
                                    </button>
                                    <button className="btn btn-outline">
                                        <i className="fas fa-key"></i> Change Password
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default AdminProfile;
