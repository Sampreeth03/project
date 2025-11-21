import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/LandingPage.css'; 

const AuthNavigation = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <div className="auth-buttons">
            {/* Login Button */}
            <button className="auth-button">
                {/* The 'auth-link' class handles the strict sizing and vertical centering */}
                <Link to="/login" className="auth-link">Login</Link>
            </button>
            
            {/* Signup Button / Dropdown Container */}
            <div 
                className="signup-container"
                // Uses mouse events for hover/dropdown functionality
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
            >
                <button 
                    className={`auth-button ${isDropdownOpen ? 'hover' : ''}`}
                    id="signupBtn"
                >
                    {/* The span element here must also use 'auth-link' for sizing */}
                    <span className="auth-link">Signup</span>
                </button>
                
                {/* Dropdown Menu */}
                <div className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`} id="signupDropdown">
                    <Link to="/signup" className="dropdown-item">
                        <span>As a Student</span>
                    </Link>
                    <hr/>
                    <Link to="/signupforrec" className="dropdown-item">
                        <span>As a Recruiter</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};
export default AuthNavigation;