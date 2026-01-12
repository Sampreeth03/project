import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx'; 
import '../../styles/UserHome.css'; 

const Navbar = ({ onSearchChange }) => {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const navLinks = [
        { name: "Home", href: "/home", submenu: [] },
        // ... (rest of the link array remains the same as previously corrected) ...
        { 
            name: "Projects", href: "/project", 
            submenu: [
                { name: "Projects", href: "/project" },
                { name: "Joined Projects", href: "/joined-projects" },
                 { name: "Interact", href: "/messages" }
            ]
        },
        { 
            name: "Q&A", href: "/doubt",
            submenu: [
                { name: "Ask a Doubt", href: "/doubt" },
                { name: "Clear Doubts", href: "/clear" }
            ]
        },
        { 
            name: "Jobs", href: "/apply",
            submenu: [
                { name: "Apply for Jobs", href: "/apply" },
                { name: "My Applications", href: "/job" }
            ]
        },
        { 
            name: "Profile",
            href: "/profile",
            submenu: [
                { name: "Profile", href: "/profile" },
                { name: "Dashboard", href: "/dashboard" }
            ]
        },
        { 
            name: "Notifications", 
            href: "/not", 
            submenu: [
                { name: "Project Notifications", href: "/not" },
                { name: "Job Notifications", href: "/job_not" }
            ]
        },
        {
            name: 'Friends', href: '/friends', submenu: []
        }
    ];

    const finalNavLinks = [...navLinks];

    if (user?.role === 'admin') {
        finalNavLinks.push({ href: '/admin', name: 'Admin Panel', submenu: [] });
    }
    if (user?.role === 'recruiter') {
        finalNavLinks.push({ href: '/recruiter-home', name: 'Recruiter Dashboard', submenu: [] });
    }
    finalNavLinks.push({ href: '/logout', name: 'Logout', submenu: [] });

    const handleLogout = (e) => {
        e.preventDefault(); 
        logoutUser(); 
        navigate('/login');
    };
    
    // Handler for search bar input change
    const handleInputChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        // Pass the query up to the parent (UserHome) to filter topics
        if (onSearchChange) {
            onSearchChange(query);
        }
    };
    
    return (
        <header>
            <div className="navbar">
                <span className="logo">
                    <Link id="logo-link" to={user ? "/home" : "/"}>RELABTeams</Link>
                </span>
                
                <ul className="nav-links">
                    {finalNavLinks.map((link, index) => (
                        <li key={index}>
                            {link.name === 'Logout' ? (
                                <a onClick={handleLogout} style={{ cursor: 'pointer' }}>{link.name}</a>
                            ) : (
                                <Link to={link.href}>{link.name}</Link>
                            )}
                            
                            {link.submenu && link.submenu.length > 0 && (
                                <ul className="dropdown">
                                    {link.submenu.map((sublink, subIndex) => (
                                        <li key={subIndex}>
                                            <Link to={sublink.href}>{sublink.name}</Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
                
                {/* SEARCH BAR RESTORATION: Moved back into the Navbar container for layout */}
                <input 
                    type="text" 
                    placeholder="Search" 
                    className="search-box" 
                    id="topicSearchBar"
                    value={searchQuery}
                    onChange={handleInputChange}
                />
            </div>
        </header>
    );
};

export default Navbar;