import React, { useEffect, useRef } from 'react';
import '../../styles/UserHome.css';

const features = [
    { 
        title: "Student Doubt Clarification Hub", 
        description: "Post doubts, get expert answers, earn reputation points, and chat with peers"
    },
    { 
        title: "Project Idea Collaboration Space", 
        description: "Share ideas, form teams, track progress, and showcase work"
    },
    { 
        title: "Recruiter Talent Discovery Portal", 
        description: "Find top students, verify skills, send offers, and validate certificates"
    },
    { 
        title: "Admin Monitoring & Moderation", 
        description: "Monitor activity, remove spam, verify recruiters, and resolve disputes"
    }
];

const FeaturesCarousel = () => {
    const featuresRef = useRef(null);

    // Intersection Observer for feature boxes animation
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const featureBoxes = entry.target.querySelectorAll('.feature-box');
                        featureBoxes.forEach((box, index) => {
                            setTimeout(() => {
                                box.style.opacity = '1';
                                box.style.transform = 'translateY(0)';
                            }, index * 150);
                        });
                    }
                });
            },
            { threshold: 0.45, rootMargin: '0px 0px -120px 0px' }
        );

        if (featuresRef.current) {
            observer.observe(featuresRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section className="features-section" ref={featuresRef}>
            <h1 className="features-title">FEATURES</h1>
            <div className="features-container">
                {features.map((feature, index) => (
                    <div 
                        key={index} 
                        className="feature-box"
                        style={{
                            opacity: 0,
                            transform: 'translateY(20px)',
                            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <h3>{feature.title}</h3>
                        <p>{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FeaturesCarousel;