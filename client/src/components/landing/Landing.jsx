import React, { useEffect } from 'react';
import AuthNavigation from './AuthNavigation.jsx';
import Footer from './Footer.jsx';
import LottiePlayer from './LottiePlayer.jsx';
import '../../styles/LandingPage.css';

// Function to handle Particles.js initialization
const initializeParticles = () => {
  if (window.particlesJS) {
    window.particlesJS('particles-js', {
        "particles": {
            "number": { "value": 200, "density": { "enable": true, "value_area": 1000 } },
            "color": { "value": "#0068FF" },
            "shape": { "type": "circle", "stroke": { "width": 0, "color": "#000000" } },
            "opacity": { "value": 1, "random": false },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#0068FF", "opacity": 0.4, "width": 1 },
            "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false }
        },
        "interactivity": {
            "detect_on": "window",
            "events": {
                "onhover": { "enable": true, "mode": "repulse" },
                "onclick": { "enable": true, "mode": "push" },
                "resize": true
            },
            "modes": {
                "repulse": { "distance": 100, "duration": 0.4 },
                "push": { "particles_nb": 4 }
            }
        },
        "retina_detect": true
    });
  } else {
    console.warn("Particles.js library not found. Background effect disabled.");
  }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const Landing = () => {
    useEffect(() => {
        initializeParticles();
        
        // Go to Top Button Scroll Logic
        const topBtn = document.getElementById("topBtn");
        const handleScroll = () => {
            if (window.scrollY > 200) {
                topBtn.style.display = "block";
            } else {
                topBtn.style.display = "none";
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="landing-page-container">
            <div id="particles-js"></div>

            <AuthNavigation /> 

            <div className="Relabteams">
                <div id="heading">RELABTeams</div>
                <div id="quote">"Creative minds unite through collaboration"</div>
            </div>

            <span className="second-quote-image">
                <span id="second-quote">
                    NO MORE CONFUSION
                    <p id="second-quote-matter">We streamline the Q&A Process. Begin your online Tutoring Journey by explaining the subjects you are passionate about. Grow with us on the fastest growing Q&A Solving platform. Our job is to make your knowledge worth its money. Clear your confusion by asking your doubts. Keep Learning!</p>
                </span>
                <span id="image2">
                    <LottiePlayer src="https://lottie.host/65a72fce-30a7-41ae-94d9-9afe87c64ffa/eGMdONNZao.lottie" />
                </span>
            </span>

            <span className="third-quote-image">
                <span id="image3">
                    <LottiePlayer src="https://lottie.host/b86edbc5-7131-4b58-bdf4-9ebd32e25931/muvIOkqSg1.lottie" style={{ width: '700px', height: '500px' }} />
                </span>
                <span id="third-quote">
                    COLLAB AND WORK<br />
                    <p id="content">With Relabteams you can work on projects that can help you build your resume and secure your dream job. Share your own creative project ideas on topics like web development, machine learning and more and start working on it. Collaboration is now made easier by relabteams.</p>
                </span>
            </span>
            
            <span className="fourth-quote-image">
                <span id="fourth-quote">
                    HIRE YOUR FAVOURITE PROFILES
                    <p id="fourth-quote-matter">Wanna hire people for your projects? No worries!! Relabteams helps you to hire your favourite profiles to work on your projects. Let others who are willing to build their resume finish your work quickly and get paid for their work.</p>
                </span>
                <span id="image4">
                    <LottiePlayer src="https://lottie.host/e694da30-e5b7-43ef-903a-5d57a3494a26/ZnJwYWFDbF.lottie" />
                </span>
            </span>

            <div className="About-us">
                <h2 id="about-us-h2">About us</h2>
                <p id="about-text">RELABTeams is a collaborative community that helps in skill development and clarity over a particular topic. Together, Let's Create Something Extraordinary. Join RELABTeams and stand out in the crowd.</p>
                <div className="location">
                    <i className="fa-solid fa-location-dot fa-xl" style={{ color: 'white' }}></i>
                    <h2 id="iiits">IIIT Sricity</h2>
                </div>
                <div className="call">
                    <i className="fa-solid fa-phone fa-xl"></i>
                    <h2 id="number">+91 7013538491</h2>
                </div>
            </div>
            
            <button id="topBtn" onClick={scrollToTop}>Go to Top</button>

            <Footer />
        </div>
    );
};

export default Landing;