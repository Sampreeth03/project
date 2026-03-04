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
    const [showWelcome, setShowWelcome] = useState(false);

    // CRITICAL: Base the username on the user context immediately
    const username = metricsData?.username || user?.name || 'User';

    useEffect(() => {
        // Trigger welcome animation
        setTimeout(() => setShowWelcome(true), 200);

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
        // Add confirmation with style
        if (window.confirm('Are you sure you want to logout?')) {
            await logoutUser();
            navigate('/login');
        }
    };

    return (
        <section className="welcome-section">
            <div className="welcome-centered">
                <h1
                    className={`welcome-title ${showWelcome ? 'typing-animation' : ''}`}
                    style={{
                        opacity: showWelcome ? 1 : 0
                    }}
                >
                    Welcome back, <span style={{ color: 'var(--primary-blue)' }}>{username}</span>
                </h1>
                
                <div className="welcome-tagline">
                    ----<span>Collaborate. Learn. and Build Innovative Projects</span>----
                </div>
            </div>
        </section>
    );
};

export default MetricsBanner;