import React from 'react';
import { Link } from 'react-router-dom';
// Import UserHome.css for styling
import '../../styles/UserHome.css'; 

const UserFooter = () => {
    // Note: The new Date().getFullYear() logic is moved to JS runtime.
    const currentYear = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-grid">
                <div className="footer-col">
                    <h4>RELABTeams</h4>
                    <p>Building collaborative student projects, helping students find teammates, and connecting talent with recruiters.</p>
                </div>
                <div className="footer-col">
                    <h4>Explore</h4>
                    <p><Link to="/projects">Projects</Link></p>
                    <p><Link to="/groups">Groups</Link></p>
                    <p><Link to="/faq">Help / FAQ</Link></p>
                </div>
                <div className="footer-col">
                    <h4>Followers</h4>
                    <p><a href="https://linkedin.com">LinkedIn</a></p>
                    <p><a href="https://instagram.com">Instagram</a></p>
                    <p><a href="https://youtube.com">YouTube</a></p>
                </div>
                <div className="footer-col footer-social-col">
                    <h4>Quick follow links</h4>
                    <div className="footer-social">
                        <a href="https://linkedin.com" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
                        <a href="https://instagram.com" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                        <a href="https://youtube.com" aria-label="YouTube"><i className="fab fa-youtube"></i></a>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                &copy; {currentYear} RELABTeams. All rights reserved.
            </div>
        </footer>
    );
};

export default UserFooter;