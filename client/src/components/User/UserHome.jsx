import React, { useState, useEffect } from 'react';
import Navbar from './NavBar.jsx';
import TopicsSection from './TopicsSection.jsx'; 
import MetricsBanner from './MetricsBanner.jsx';
import FeaturesCarousel from './FeaturesCarousel.jsx';
import UserFooter from './UserFooter.jsx'; 
import { OnboardingToast } from './OnboardingToast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/UserHome.css'; 


const UserHome = () => {
    const { user, markOnboardingComplete } = useAuth();
    
    // State to hold the search query from the Navbar
    const [topicSearchQuery, setTopicSearchQuery] = useState('');
    const [isPageLoaded, setIsPageLoaded] = useState(false);
    
    // Determine if we should show onboarding
    // ONLY show for NEW SIGNUP users (isNewSignup === true)
    // This ensures returning users who login don't see onboarding again
    const shouldShowOnboarding = user && 
        user.role === 'user' && 
        user.isNewSignup === true &&
        user.onboardingCompleted !== true;

    useEffect(() => {
        // Add page load animation
        setIsPageLoaded(true);
        
        // Add smooth reveal animation on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const featureObserverOptions = {
            threshold: 0.35,
            rootMargin: '0px 0px -140px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        const featureObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, featureObserverOptions);

        // Observe sections for scroll animations
        const sections = document.querySelectorAll('.topics-section, .site-footer');
        sections.forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
            observer.observe(section);
        });

        const featureSection = document.querySelector('.features-section');
        if (featureSection) {
            featureSection.style.opacity = '0';
            featureSection.style.transform = 'translateY(30px)';
            featureSection.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
            featureObserver.observe(featureSection);
        }

        return () => {
            observer.disconnect();
            featureObserver.disconnect();
        };
    }, []);

    const handleSearchChange = (query) => {
        setTopicSearchQuery(query);
    };

    const handleOnboardingComplete = () => {
        markOnboardingComplete();
    };

    return (
        <div className={`user-home-wrapper ${isPageLoaded ? 'loaded' : ''}`}>
            {/* Pass the handler down to the Navbar */}
            <Navbar onSearchChange={handleSearchChange} />
            
            <MetricsBanner /> 
            
            {/* Pass the search query down to the Topics section for filtering */}
            <section className="topics-section">
                <TopicsSection searchQuery={topicSearchQuery} />
            </section>
            
            <FeaturesCarousel />
            
            <UserFooter /> 
            
            {/* Onboarding Toast Flow - only shown once for first-time student users */}
            {shouldShowOnboarding && (
                <OnboardingToast 
                    userName={user?.name?.split(' ')[0]} 
                    onComplete={handleOnboardingComplete}
                    profileComplete={user?.isProfileComplete === true}
                />
            )}
        </div>
    );
};

export default UserHome;