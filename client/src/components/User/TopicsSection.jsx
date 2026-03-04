import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTopics from '../../hooks/useTopics';
import '../../styles/UserHome.css'; 

const topicImageMap = {
    'Web Development': '/images/topics/web-development.svg',
    'Cyber Security': '/images/topics/cyber-security.svg',
    Robotics: '/images/topics/robotics.svg',
    'Data Science': '/images/topics/data-science.svg',
    'Deep Learning': '/images/topics/deep-learning.svg',
    Blockchain: '/images/topics/blockchain.svg'
};

const topicToneClassMap = {
    'Web Development': 'topic-image--web',
    'Cyber Security': 'topic-image--cyber',
    Robotics: 'topic-image--robotics',
    'Data Science': 'topic-image--data',
    'Deep Learning': 'topic-image--deep',
    Blockchain: 'topic-image--blockchain'
};

const TopicsSection = ({ searchQuery }) => { // RECEIVE PROP
    const { topics, loading, error } = useTopics();
    const [animatedTopics, setAnimatedTopics] = useState(false);
    
    // --- Filter Logic (Based on prop) ---
    const filteredTopics = topics.filter(topic => {
        const query = searchQuery ? searchQuery.toLowerCase() : '';
        // If query is empty, show all topics
        if (!query) return true; 

        // Checks topic name and description
        return (
            topic.name.toLowerCase().includes(query) ||
            topic.description.toLowerCase().includes(query)
        );
    });

    const navigate = useNavigate();

    // Add staggered animation effect when topics load
    useEffect(() => {
        if (!loading && filteredTopics.length > 0) {
            setTimeout(() => setAnimatedTopics(true), 280);
        }
    }, [loading, filteredTopics.length]);

    // Prevent button click from triggering parent card click
    const handleButtonClick = (e, path) => {
        e.stopPropagation();
        navigate(path);
    };

    // Navigate to doubt page when card is clicked
    const handleCardClick = (path) => {
        navigate(path || '/doubt');
    };

    // --- Render Logic ---
    let topicContent;

    if (loading) {
        topicContent = (
            <div style={{ 
                gridColumn: '1 / -1', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                padding: '60px 20px'
            }}>
                <div className="loading-spinner"></div>
                <p id="loadingText" style={{ 
                    color: 'var(--text-muted)', 
                    textAlign: 'center',
                    marginTop: '20px',
                    fontSize: '1.1rem'
                }}>
                    Loading amazing topics...
                </p>
            </div>
        );
    } else if (error) {
        topicContent = (
            <p style={{ 
                color: '#ff6b6b', 
                textAlign: 'center',
                gridColumn: '1 / -1',
                padding: '40px 20px',
                fontSize: '1.1rem'
            }}>
                {error}
            </p>
        );
    } else if (filteredTopics.length === 0 && searchQuery) {
        topicContent = (
            <p style={{ 
                color: 'var(--text-muted)', 
                textAlign: 'center', 
                gridColumn: '1 / -1',
                padding: '40px 20px',
                fontSize: '1.1rem'
            }}>
                No topics found matching "<span style={{ color: 'var(--primary-blue)' }}>{searchQuery}</span>"
            </p>
        );
    } else {
        topicContent = filteredTopics.map((topic, index) => (
            <div 
                key={index} 
                className="topic" 
                onClick={() => handleCardClick(topic.joinLink)}
                style={{ 
                    cursor: 'pointer',
                    animation: animatedTopics ? `fadeInUp 1.1s ease-out ${index * 0.18}s both` : 'none'
                }}
            >
                <img
                    className={`topic-image ${topicToneClassMap[topic.name] || ''}`}
                    src={topicImageMap[topic.name] || '/images/topics/web-development.svg'}
                    alt={topic.name}
                    loading="lazy"
                />
                <div className="topic-content">
                    <span className="topic-name">{topic.name}</span>
                    <p className="topic-desc">{topic.description}</p>
                    <div className="options">
                        <button 
                            onClick={(e) => handleButtonClick(e, '/doubt')}
                        >
                            Ask a Doubt
                        </button>
                        <button 
                            onClick={(e) => handleButtonClick(e, '/e')}
                        >
                            Create Project
                        </button>
                        <button 
                            onClick={(e) => handleButtonClick(e, topic.joinLink)}
                        >
                            Join a Project
                        </button>
                    </div>
                </div>
            </div>
        ));
    }

    return (
        <div className="topics-anxtion-container">
            <div className="topics-header">
                <h2>Explore Domains</h2>
                <p>Pick a track, join teams, and start building with real project workflows.</p>
            </div>
            {/* The actual search input is now in Navbar.jsx */}
            <div className="topics" id="topicsContainer">
                {topicContent}
            </div>
        </div>
    );
};

export default TopicsSection;