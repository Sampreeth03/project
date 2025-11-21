import React, { useState } from 'react'; // Import useState
import Navbar from './NavBar.jsx';
import TopicsSection from './TopicsSection.jsx'; 
import MetricsBanner from './MetricsBanner.jsx';
import FeaturesCarousel from './FeaturesCarousel.jsx'; 
import UserFooter from './UserFooter.jsx'; 
import '../../styles/UserHome.css'; 


const UserHome = () => {
    // State to hold the search query from the Navbar
    const [topicSearchQuery, setTopicSearchQuery] = useState('');

    const handleSearchChange = (query) => {
        setTopicSearchQuery(query);
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
        </div>
    );
};

export default UserHome;