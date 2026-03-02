import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RecruiterNavbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [appsOpen, setAppsOpen] = useState(false);
    const { logoutUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <header className={`rn-bar ${scrolled ? 'rn-bar--scrolled' : ''}`}>
            {/* Left: logo */}
            <div className="rn-logo-wrap">
                <Link to="/recruiter-home" className="rn-logo">
                    <span className="rn-logo-text">
                        RELAB<span className="rn-logo-teams-small">Teams</span>
                    </span>
                </Link>
            </div>

            {/* Center: nav links */}
            <nav className={`rn-links ${menuOpen ? 'rn-links--open' : ''}`}>
                <Link
                    to="/recruiter-home"
                    className={`rn-link ${isActive('/recruiter-home') ? 'rn-link--active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                >
                    <span className="rn-link-name">Home</span>
                    <span className="rn-link-bar" />
                </Link>

                <Link
                    to="/rec-job"
                    className={`rn-link ${isActive('/rec-job') ? 'rn-link--active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                >
                    <span className="rn-link-name">Post Jobs</span>
                    <span className="rn-link-bar" />
                </Link>

                <div
                    className={`rn-link rn-link--drop ${appsOpen ? 'rn-link--open' : ''} ${isActive('/rec-app') || isActive('/rec-not') ? 'rn-link--active' : ''}`}
                    onMouseEnter={() => setAppsOpen(true)}
                    onMouseLeave={() => setAppsOpen(false)}
                >

                    <span className="rn-link-name">Applicants <span className="rn-caret">▾</span></span>
                    <span className="rn-link-bar" />
                    <div className={`rn-drop ${appsOpen ? 'rn-drop--open' : ''}`}>
                        <Link to="/rec-app" className="rn-drop-item" onClick={() => { setAppsOpen(false); setMenuOpen(false); }}>
                            <span className="rn-drop-dot" />Applications
                        </Link>
                        <Link to="/rec-not" className="rn-drop-item" onClick={() => { setAppsOpen(false); setMenuOpen(false); }}>
                            <span className="rn-drop-dot" />Notifications
                        </Link>
                    </div>
                </div>

                <Link
                    to="/recruiter-dashboard"
                    className={`rn-link ${isActive('/recruiter-dashboard') ? 'rn-link--active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                >
                    <span className="rn-link-name">Dashboard</span>
                    <span className="rn-link-bar" />
                </Link>
            </nav>

            {/* Right: logout */}
            <div className="rn-right">
                <button className="rn-logout" onClick={handleLogout}>
                    <span className="rn-logout-text">Logout</span>
                </button>
                <button
                    className={`rn-hamburger ${menuOpen ? 'rn-hamburger--open' : ''}`}
                    onClick={() => setMenuOpen(v => !v)}
                    aria-label="Toggle menu"
                >
                    <span /><span /><span />
                </button>
            </div>
        </header>
    );
};

export default RecruiterNavbar;
