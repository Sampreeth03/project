import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useTopics from '../../hooks/useTopics';
import '../../styles/UserHome.css'; 

const TopicsSection = ({ searchQuery }) => { // RECEIVE PROP
    const { topics, loading, error } = useTopics();
    
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

    // --- Render Logic ---
    let topicContent;

    if (loading) {
        topicContent = <p id="loadingText" style={{ color: '#bbb', textAlign: 'center' }}>Loading topics...</p>;
    } else if (error) {
        topicContent = <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>;
    } else if (filteredTopics.length === 0 && searchQuery) {
        topicContent = <p style={{ color: '#bbb', textAlign: 'center', gridColumn: '1 / -1' }}>No topics found matching "{searchQuery}"</p>;
    } else {
        topicContent = filteredTopics.map((topic, index) => (
            <div key={index} className="topic">
                <span className="topic-name">{topic.name}</span>
                <p className="topic-desc">{topic.description}</p>
                <div className="options">
                    <button style={{ width: '120px' }}>
                        <Link to="/ask" style={{ textDecoration: 'none', color: '#0068FF' }}>Ask a Doubt</Link>
                    </button>
                    <button style={{ width: '120px' }}>
                        <Link to="/e" style={{ textDecoration: 'none', color: '#0068FF' }}>Create Project</Link>
                    </button>
                    <button style={{ width: '120px' }}>
                        <Link to={topic.joinLink} style={{ textDecoration: 'none', color: '#0068FF' }}>Join a Project</Link>
                    </button>
                </div>
            </div>
        ));
    }

    return (
        <div className="topics-anxtion-container">
            {/* The actual search input is now in Navbar.jsx */}
            <div className="topics" id="topicsContainer">
                {topicContent}
            </div>
        </div>
    );
};

export default TopicsSection;