import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RecruiterNavbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const { logoutUser } = useAuth();
    const navigate = useNavigate();

    const navLinks = [
        { name: "Home", href: "/recruiter-home" },
        {
            name: "Applications",
            href: "/rec-app",
            submenu: [
                { name: "Applications", href: "/rec-app" },
                { name: "Notifications", href: "/rec-not" }
            ]
        },
        {
            name: "Dashboard",
            href: "/recruiter-dashboard",
            // submenu: [
            //     { name: "Dashboard", href: "/recruiter-dashboard" }
            // ]
        },
    ];

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <>
            <header>
                <div className="recruiter-navbar">
                    <div className="recruiter-logo">
                        <Link to="/recruiter-home">RELABTeams</Link>
                    </div>
                    <ul className={`recruiter-nav-links ${menuOpen ? 'show' : ''}`}>
                        {navLinks.map((link, index) => (
                            <li key={index}>
                                <Link to={link.href}>{link.name}</Link>
                                {link.submenu && (
                                    <ul className="recruiter-dropdown">
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
                    <button className="recruiter-menu-btn" onClick={toggleMenu}>
                        ☰
                    </button>
                </div>
            </header>
            <div className="recruiter-logout-container">
                <button className="recruiter-logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </>
    );
};

export default RecruiterNavbar;
