import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import RecruiterNavbar from './RecruiterNavbar';
import '../../styles/Recruiter.css';

const RecruiterHome = () => {
    const [optionsVisible, setOptionsVisible] = useState(false);

    const toggleOptions = () => {
        setOptionsVisible(!optionsVisible);
    };

    return (
        <div className="recruiter-home-body">
            <RecruiterNavbar />

            <div className="recruiter-hero">
                <h1>Find the <span>Perfect Talent</span> for Your Team</h1>
                <p>RELABTeams helps you discover, connect, and hire the best professionals for your company.</p>
                <button className="recruiter-btn" onClick={toggleOptions}>
                    <span>Start Recruiting</span>
                </button>
                
                <div className={`recruiter-options-container ${optionsVisible ? 'show' : ''}`}>
                    <Link to="/rec-app" className="recruiter-option-btn">Applications</Link>
                    <Link to="/rec-job" className="recruiter-option-btn">Create Jobs</Link>
                </div>
            </div>

            <div className="recruiter-features">
                <h2>Why Choose RELABTeams</h2>
                <div className="recruiter-feature-box">
                    <h3>Smart Hiring</h3>
                    <p>Our users apply for your posts and you can hire them based on your interest.</p>
                </div>
                <div className="recruiter-feature-box">
                    <h3>View Profiles</h3>
                    <p>View users profiles who applied for your post</p>
                </div>
                <div className="recruiter-feature-box">
                    <h3>This or That!!</h3>
                    <p>You can either ask other users to finish your project or hire them.</p>
                </div>
            </div>
        </div>
    );
};

export default RecruiterHome;
