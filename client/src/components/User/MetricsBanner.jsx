import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/UserHome.css';

const MetricsBanner = () => {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const [metricsData, setMetricsData] = useState(null);
    const [loading, setLoading] = useState(true);

    // CRITICAL: Base the username on the user context immediately
    const username = metricsData?.username || user?.name || 'User';

    useEffect(() => {
        if (user) {
            const fetchMetrics = async () => {
                try {
                    const response = await axios.get('/api/dashboard-metrics');
                    setMetricsData(response.data);
                } catch (err) {
                    console.error("Error fetching metrics:", err);
                    // Use the existing session user name as fallback
                    setMetricsData({ username: user.name, metrics: {}, completedProjects: [] }); 
                } finally {
                    setLoading(false);
                }
            };
            fetchMetrics();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <section className="welcome-section">
            
            {/* FINAL FIX: The visible, functional Logout button is placed here 
               and styled absolutely relative to the section, fixing the overlap. */}
            <button id="logout-btn" onClick={handleLogout}>
                <span style={{ textDecoration: 'none', color: 'white' }}>Logout</span>
            </button>
            
            {/* Displays the stable username */}
            <h1 className="banner-content">Welcome to RELABTeams {username}</h1>
            <p className="banner-para">--Collaborate, Learn, and Build Innovative Projects--</p>
        </section>
    );
};

export default MetricsBanner;