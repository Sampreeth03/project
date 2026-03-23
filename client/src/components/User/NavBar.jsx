import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx'; 
import '../../styles/UserHome.css'; 

const Navbar = ({ onSearchChange }) => {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const navLinks = [
        { name: "Home", href: "/home", submenu: [] },
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
                { name: "My Applications", href: "/my-applications" }
            ]
        },
        { 
            name: "Profile",
            href: "/profile",
            submenu: [
                { name: "Profile", href: "/profile" },
                { name: "Dashboard", href: "/dashboard" },
                { name: "Contact Us", href: "/contact" }
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

    // Add scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async (e) => {
        e.preventDefault(); 
        if (window.confirm('Are you sure you want to logout?')) {
            await logoutUser(); 
            navigate('/login', { replace: true });
        }
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

    // Check if a link is active
    const isLinkActive = (href) => {
        return location.pathname === href;
    };
    
    return (
        <header>
            <div 
                className="navbar"
                style={{
                    background: isScrolled 
                        ? 'var(--overlay-strong)' 
                        : 'var(--overlay-soft)',
                    boxShadow: isScrolled 
                        ? 'var(--shadow-elevated)' 
                        : 'var(--shadow-soft)',
                    transition: 'all 0.3s ease'
                }}
            >
                <span className="logo">
                    <Link 
                        id="logo-link" 
                        to={user ? "/home" : "/"}
                        style={{
                            textDecoration: 'none',
                            display: 'inline-block'
                        }}
                    >
                        RELABTeams
                    </Link>
                </span>
                
                <ul className="nav-links">
                    {finalNavLinks.map((link, index) => (
                        <li key={index}>
                            {link.name === 'Logout' ? (
                                <a 
                                    onClick={handleLogout} 
                                    style={{ 
                                        cursor: 'pointer',
                                        color: 'var(--accent-danger)'
                                    }}
                                >
                                    {link.name}
                                </a>
                            ) : (
                                <Link 
                                    to={link.href}
                                    style={{
                                        color: isLinkActive(link.href) 
                                            ? 'var(--primary-blue-light)' 
                                            : 'var(--text-secondary)',
                                        background: 'transparent',
                                        textDecoration: isLinkActive(link.href) ? 'underline' : 'none',
                                        textUnderlineOffset: '7px',
                                        textDecorationThickness: '2px'
                                    }}
                                >
                                    {link.name}
                                </Link>
                            )}
                            
                            {link.submenu && link.submenu.length > 0 && (
                                <ul className="dropdown">
                                    {link.submenu.map((sublink, subIndex) => (
                                        <li key={subIndex}>
                                            <Link 
                                                to={sublink.href}
                                                style={{
                                                    color: isLinkActive(sublink.href)
                                                        ? 'var(--primary-blue-light)'
                                                        : 'var(--text-secondary)',
                                                    textDecoration: isLinkActive(sublink.href) ? 'underline' : 'none',
                                                    textUnderlineOffset: '5px',
                                                    textDecorationThickness: '2px'
                                                }}
                                            >
                                                {sublink.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
                
                {/* Enhanced SEARCH BAR */}
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder="Search topics..." 
                        className="search-box" 
                        id="topicSearchBar"
                        value={searchQuery}
                        onChange={handleInputChange}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        style={{
                            width: isSearchFocused 
                                ? (window.innerWidth <= 768 ? '240px' : '300px')
                                : (window.innerWidth <= 768 ? '130px' : '170px'),
                            transition: 'width 0.3s ease'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                if (onSearchChange) onSearchChange('');
                            }}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: '0',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;