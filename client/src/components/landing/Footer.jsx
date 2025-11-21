import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/LandingPage.css'; 

const Footer = () => {
    return (
        <footer>
            <div className="footer-content">
                <div className="footer-section">
                    <h3>RELABTeams</h3>
                    <ul>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/contact">Contact</Link></li>
                        <li><Link to="/careers">Careers</Link></li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><Link to="/doubt">Doubt Board</Link></li>
                        <li><Link to="/project">Projects</Link></li>
                        <li><Link to="/apply">Jobs</Link></li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h3>Follow Us</h3>
                    <div className="social-icons">
                        <a href="#"><i className="fa-brands fa-facebook-f"></i></a>
                        <a href="#"><i className="fa-brands fa-twitter"></i></a>
                        <a href="#"><i className="fa-brands fa-instagram"></i></a>
                        <a href="#"><i className="fa-brands fa-linkedin-in"></i></a>
                    </div>
                </div>
            </div>
            <div className="copyright">
                &copy; 2024 RELABTeams. All Rights Reserved.
            </div>
        </footer>
    );
};
export default Footer;