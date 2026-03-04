import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/UserHome.css'; 

const UserFooter = () => {
    const currentYear = new Date().getFullYear();
    const [hoveredSocial, setHoveredSocial] = useState(null);

    const footerSections = [
        {
            title: "RELABTeams",
            content: "Building collaborative student projects, helping students find teammates, and connecting talent with recruiters.",
            type: "text"
        },
        {
            title: "Explore",
            links: [
                { name: "Projects", path: "/project" },
                { name: "Jobs", path: "/apply" },
                { name: "Q&A Forum", path: "/doubt" },
                { name: "Help / FAQ", path: "/faq" }
            ],
            type: "links"
        },
        {
            title: "Quick Links",
            links: [
                { name: "Dashboard", path: "/dashboard" },
                { name: "Profile", path: "/profile" },
                { name: "Notifications", path: "/not" },
                { name: "Friends", path: "/friends" }
            ],
            type: "links"
        },
        {
            title: "Connect With Us",
            type: "social"
        }
    ];

    const socialLinks = [
        { 
            name: "LinkedIn", 
            url: "https://linkedin.com", 
            logo: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.474-2.229-1.863-2.229-1.012 0-1.614.678-1.878 1.334-.097.237-.121.568-.121.899v5.565h-3.554s.048-9.035 0-9.976h3.554v1.413c.44-.679 1.228-1.645 2.989-1.645 2.183 0 3.819 1.427 3.819 4.485v5.723zM5.337 8.855c-1.144 0-1.915-.759-1.915-1.706 0-.968.77-1.706 1.951-1.706 1.179 0 1.914.738 1.939 1.706 0 .947-.76 1.706-1.975 1.706zm1.581 11.597H3.715V8.477h3.203v11.975zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                </svg>
            ),
            color: "#0077b5"
        },
        { 
            name: "Instagram", 
            url: "https://instagram.com", 
            logo: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.646.069 4.85 0 3.204-.012 3.584-.07 4.85-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.717 0 8.283.012 7.028.072 2.735.272.273 2.69.073 7.05.012 8.308 0 8.742 0 12s.012 3.692.072 4.947c.2 4.358 2.662 6.78 7.022 6.98 1.271.058 1.709.072 4.978.072 3.267 0 3.709-.014 4.978-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.722.073-4.947s-.011-3.692-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.709.013 15.268 0 12 0z"/>
                    <circle cx="12" cy="12" r="3.6"/>
                    <circle cx="18.406" cy="5.594" r="0.6"/>
                </svg>
            ),
            color: "#E4405F"
        },
        { 
            name: "YouTube", 
            url: "https://youtube.com", 
            logo: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
            ),
            color: "#FF0000"
        },
        { 
            name: "GitHub", 
            url: "https://github.com", 
            logo: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
            ),
            color: "#14b8a6"
        }
    ];

    return (
        <footer className="site-footer">
            <div className="footer-grid">
                {footerSections.map((section, index) => (
                    <div 
                        key={index} 
                        className={`footer-col ${section.type === 'social' ? 'footer-social-col' : ''}`}
                    >
                        <h4>{section.title}</h4>
                        
                        {section.type === 'text' && (
                            <p style={{ lineHeight: '1.8' }}>{section.content}</p>
                        )}
                        
                        {section.type === 'links' && (
                            <div>
                                {section.links.map((link, linkIndex) => (
                                    <p key={linkIndex}>
                                        <Link 
                                            to={link.path}
                                            style={{
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            {link.name}
                                        </Link>
                                    </p>
                                ))}
                            </div>
                        )}
                        
                        {section.type === 'social' && (
                            <>
                                <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
                                    Follow us on social media for updates
                                </p>
                                <div className="footer-social">
                                    {socialLinks.map((social, socialIndex) => (
                                        <a 
                                            key={socialIndex}
                                            href={social.url}
                                            aria-label={social.name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onMouseEnter={() => setHoveredSocial(socialIndex)}
                                            onMouseLeave={() => setHoveredSocial(null)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: hoveredSocial === socialIndex ? 'white' : '#9ca3af',
                                                transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                                                background: hoveredSocial === socialIndex 
                                                    ? social.color 
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                            title={social.name}
                                        >
                                            {social.logo}
                                        </a>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="footer-bottom">
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div>
                        &copy; {currentYear} RELABTeams. All rights reserved.
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '20px',
                        fontSize: '13px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Link 
                            to="/privacy" 
                            style={{ 
                                color: 'var(--text-muted)',
                                textDecoration: 'none',
                                transition: 'color 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.color = 'var(--primary-blue-light)'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            Privacy Policy
                        </Link>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <Link 
                            to="/terms" 
                            style={{ 
                                color: 'var(--text-muted)',
                                textDecoration: 'none',
                                transition: 'color 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.color = 'var(--primary-blue-light)'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            Terms of Service
                        </Link>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <Link 
                            to="/contact" 
                            style={{ 
                                color: 'var(--text-muted)',
                                textDecoration: 'none',
                                transition: 'color 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.color = 'var(--primary-blue-light)'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            Contact Us
                        </Link>
                    </div>
                    <div style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        marginTop: '5px'
                    }}>
                        Made by the RELABTeams
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default UserFooter;