import React, { useState, useEffect } from 'react';
import '../../styles/UserHome.css';

const features = [
    { title: "Student Doubt Clarification Hub", description: "Post doubts, get expert answers, earn reputation points, and chat with peers" },
    { title: "Project Idea Collaboration Space", description: "Share ideas, form teams, track progress, and showcase work" },
    { title: "Recruiter Talent Discovery Portal", description: "Find top students, verify skills, send offers, and validate certificates" },
    { title: "Admin Monitoring & Moderation", description: "Monitor activity, remove spam, verify recruiters, and resolve disputes" }
];

const testimonials = [
    { quote: "Great platform! Helped me collaborate on projects easily.", author: "User 1" },
    { quote: "The best place to find team members for CS projects!", author: "User 2" },
    { quote: "Amazing experience, learned a lot from my peers!", author: "User 3" }
];

const FeaturesCarousel = () => {
    const totalSlides = testimonials.length;
    const [activeIndex, setActiveIndex] = useState(0); 

    // --- Carousel Interval Logic (Replaces EJS JavaScript setInterval) ---
    useEffect(() => {
        const nextSlide = () => {
            setActiveIndex(prevIndex => (prevIndex + 1) % totalSlides);
        };

        const interval = setInterval(nextSlide, 3000); 

        return () => clearInterval(interval); 
    }, [totalSlides]);

    const handleDotClick = (index) => {
        setActiveIndex(index);
    };

    return (
        <>
            {/* --- Features Section --- */}
            <section className="features-section">
                <h1 className="features-title">FEATURES</h1>
                <div className="features-container">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-box">
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- Testimonial Carousel --- */}
            <div className="carousel-container">
                {/* CRITICAL: Inline style driven by state for smooth sliding */}
                <div 
                    className="carousel" 
                    style={{ 
                        transform: `translateX(-${activeIndex * 100}%)`,
                    }}
                >
                    {testimonials.map((testimonial, index) => (
                        /* The testimonial class relies on flex: 0 0 100% in CSS */
                        <div key={index} className="testimonial">
                            <p>"{testimonial.quote}"</p>
                            <h4>- {testimonial.author}</h4>
                        </div>
                    ))}
                </div>
                
                <div className="dots">
                    {[...Array(totalSlides)].map((_, i) => (
                        <span 
                            key={i}
                            className={`dot ${i === activeIndex ? 'active' : ''}`}
                            onClick={() => handleDotClick(i)}
                        ></span>
                    ))}
                </div>
            </div>
        </>
    );
};

export default FeaturesCarousel;