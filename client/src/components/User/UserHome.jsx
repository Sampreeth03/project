import React, { useState } from 'react';
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
    
    // Determine if we should show onboarding
    // ONLY show for NEW SIGNUP users (isNewSignup === true)
    // This ensures returning users who login don't see onboarding again
    const shouldShowOnboarding = user && 
        user.role === 'user' && 
        user.isNewSignup === true &&
        user.onboardingCompleted !== true;

    const handleSearchChange = (query) => {
        setTopicSearchQuery(query);
    };

    const handleOnboardingComplete = () => {
        markOnboardingComplete();
    };

    return (
        <div className="user-home-wrapper">
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