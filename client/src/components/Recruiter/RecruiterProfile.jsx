import React, { useState, useEffect } from 'react';
import RecruiterNavbar from './RecruiterNavbar';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Recruiter.css';

const RecruiterProfile = () => {
    const { user } = useAuth();
    const [profileImage, setProfileImage] = useState(null);
    const [showUploadButton, setShowUploadButton] = useState(true);
    const [profileData, setProfileData] = useState({
        name: '',
        company: '',
        projectsGiven: 0,
        jobsGiven: 0,
        studentsInterested: 0,
        students: 0,
        aboutCompany: '',
        email: '',
        phone: '',
        postedJobs: []
    });

    useEffect(() => {
        // Set initial data from auth context
        if (user) {
            setProfileData(prev => ({
                ...prev,
                name: user.name || 'Recruiter Name',
                email: user.email || 'recruiter@company.com'
            }));
        }
        
        // Fetch additional profile data
        fetchProfileData();
    }, [user]);

    const fetchProfileData = async () => {
        try {
            // You can create an API endpoint for profile data if needed
            // For now, we'll use static data similar to the EJS template
            setProfileData(prev => ({
                ...prev,
                company: 'Company Name',
                projectsGiven: 10,
                jobsGiven: 5,
                studentsInterested: 20,
                students: 10,
                aboutCompany: 'A leading company in the industry, focused on innovation and excellence.',
                phone: '+123 456 7890',
                postedJobs: ['Product Manager', 'Software Engineer', 'Data Scientist']
            }));
        } catch (error) {
            console.error('Error fetching profile data:', error);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfileImage(e.target.result);
                setShowUploadButton(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        document.getElementById('fileInput').click();
    };

    return (
        <div className="recruiter-profile-body">
            <RecruiterNavbar />

            <div className="recruiter-profile-container">
                <header className="recruiter-profile-header">
                    <div className="recruiter-company-logo">
                        {profileImage ? (
                            <img 
                                src={profileImage} 
                                alt="Company Logo"
                                style={{ display: 'block' }}
                            />
                        ) : null}
                        
                        {showUploadButton && (
                            <button 
                                className="recruiter-upload-button"
                                onClick={triggerFileInput}
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="1.25rem" 
                                    height="1.25rem" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2"
                                >
                                    <path d="M12 19v-7m0 0V5m0 7H5m7 0h7"></path>
                                </svg>
                            </button>
                        )}
                        
                        {!showUploadButton && (
                            <div 
                                className="recruiter-edit-icon"
                                onClick={triggerFileInput}
                                style={{ display: 'block', opacity: 1 }}
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="24" 
                                    height="24" 
                                    fill="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        fillRule="evenodd" 
                                        d="M14 4.182A4.136 4.136 0 0 1 16.9 3c1.087 0 2.13.425 2.899 1.182A4.01 4.01 0 0 1 21 7.037c0 1.068-.43 2.092-1.194 2.849L18.5 11.214l-5.8-5.71 1.287-1.31.012-.012Zm-2.717 2.763L6.186 12.13l2.175 2.141 5.063-5.218-2.141-2.108Zm-6.25 6.886-1.98 5.849a.992.992 0 0 0 .245 1.026 1.03 1.03 0 0 0 1.043.242L10.282 19l-5.25-5.168Zm6.954 4.01 5.096-5.186-2.218-2.183-5.063 5.218 2.185 2.15Z" 
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                        )}
                        
                        <input 
                            type="file" 
                            id="fileInput" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                    </div>
                    
                    <div className="recruiter-info">
                        <h2>{profileData.name}</h2>
                        <br />
                        <h2>{profileData.company}</h2>
                    </div>
                </header>
                
                <br />
                <hr />
                
                <main className="recruiter-profile-main">
                    <div className="recruiter-profile-stats">
                        <div className="recruiter-profile-stat-item">
                            <h2>Projects Given</h2>
                            <p style={{ color: 'white' }}>{profileData.projectsGiven}</p>
                        </div>
                        <div className="recruiter-profile-stat-item">
                            <h2>Jobs Given</h2>
                            <p style={{ color: 'white' }}>{profileData.jobsGiven}</p>
                        </div>
                        <div className="recruiter-profile-stat-item">
                            <h2>Students Interested</h2>
                            <p style={{ color: 'white' }}>{profileData.studentsInterested}</p>
                        </div>
                        <div className="recruiter-profile-stat-item">
                            <h2>Students</h2>
                            <p style={{ color: 'white' }}>{profileData.students}</p>
                        </div>
                    </div>
                    
                    <hr />
                    
                    <div className="recruiter-company-description">
                        <h2 className="recruiter-section-title">About the Company</h2>
                        <p>{profileData.aboutCompany}</p>
                    </div>
                    
                    <div className="recruiter-contact-info">
                        <h2 className="recruiter-section-title">Contact Information</h2>
                        <p>Email: {profileData.email}</p>
                        <p>Phone: {profileData.phone}</p>
                    </div>
                    
                    <div className="recruiter-posted-jobs">
                        <h2 className="recruiter-section-title">Posted Jobs</h2>
                        <ul>
                            {profileData.postedJobs.map((job, index) => (
                                <li key={index}>{job}</li>
                            ))}
                        </ul>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default RecruiterProfile;
