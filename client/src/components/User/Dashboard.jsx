import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext.jsx';
import NavBar from './NavBar.jsx';
import UserFooter from './UserFooter.jsx';
import '../../styles/Dashboard.css';

const Dashboard = () => {
    const { user: currentUser } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDashboardMetrics();
    }, []);

    const fetchDashboardMetrics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/dashboard-metrics');
            
            if (response.data) {
                setDashboardData(response.data);
            } else {
                setError('Failed to load dashboard data');
            }
        } catch (err) {
            console.error('Error fetching dashboard metrics:', err);
            setError(err.response?.data?.error || 'Failed to load dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Metric cards data based on API response
    const getMetricCards = () => {
        if (!dashboardData?.metrics) return [];
        
        const m = dashboardData.metrics;
        return [
            { title: 'Total Collaborations', value: m.total_collaborations || 0 },
            { title: 'Active Projects', value: m.active_projects || 0 },
            { title: 'Completed Tasks', value: m.completed_tasks || 0 },
            { title: 'Leadership Roles', value: m.leadership_roles || 0 },
            { title: 'Inquiries Initiated', value: m.inquiriesInitiated || 0 },
            { title: 'Job Applications', value: m.job_applications || 0 },
            { title: 'Projects as Member', value: m.projects_as_member || 0 },
            { title: 'Solutions Provided', value: m.solutions_provided || 0 }
        ];
    };

    // Filter metrics based on search term
    const filteredMetrics = getMetricCards().filter(metric => 
        metric.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get username initial for profile image
    const getInitial = () => {
        if (dashboardData?.username) {
            return dashboardData.username.charAt(0).toUpperCase();
        }
        if (currentUser?.name) {
            return currentUser.name.charAt(0).toUpperCase();
        }
        return '?';
    };

    // Get display name
    const getDisplayName = () => {
        return dashboardData?.username || currentUser?.name || 'User';
    };

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Render loading state
    if (loading) {
        return (
            <div className="dashboard-wrapper">
                <NavBar />
                <div className="dashboard-main-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading your dashboard...</p>
                    </div>
                </div>
                <UserFooter />
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="dashboard-wrapper">
                <NavBar />
                <div className="dashboard-main-content">
                    <div className="error-container">
                        <p>{error}</p>
                        <button className="retry-button" onClick={fetchDashboardMetrics}>
                            Try Again
                        </button>
                    </div>
                </div>
                <UserFooter />
            </div>
        );
    }

    return (
        <div className="dashboard-wrapper">
            <NavBar />
            
            <div className="dashboard-main-content">
                {/* Dashboard Header */}
                <div className="dashboard-header">
                    <div className="user-greeting">
                        <h1 className="dashboard-title">Dashboard</h1>
                        <p id="user-welcome">
                            Welcome back, {getDisplayName()}. Here's your current performance summary.
                        </p>
                    </div>
                    <div className="user-profile">
                        <div className="profile-image">{getInitial()}</div>
                        <div className="profile-info">
                            <div className="profile-name">{getDisplayName()}</div>
                            <div className="profile-role">Student │ IIIT Sri City</div>
                        </div>
                    </div>
                </div>

                {/* Search Box for Metrics */}
                <input
                    type="text"
                    placeholder="Search metrics..."
                    className="dashboard-search-box"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />

                {/* Metrics Container */}
                <div className="metrics-container">
                    {filteredMetrics.length > 0 ? (
                        filteredMetrics.map((metric, index) => (
                            <div className="metric-card" key={index}>
                                <div className="metric-title">{metric.title}</div>
                                <div className="metric-value">{metric.value}</div>
                            </div>
                        ))
                    ) : (
                        <div className="no-data">
                            <p>No metrics found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>

                {/* Completed Projects Section */}
                <div className="completed-projects">
                    <div className="completed-projects-header">
                        <h2 className="completed-projects-title">
                            {dashboardData?.completedProjects?.length > 0 
                                ? 'Completed Projects' 
                                : 'No Completed Projects Yet'}
                        </h2>
                        <Link to="/project" className="view-all">
                            {dashboardData?.completedProjects?.length > 0 
                                ? 'View All Projects' 
                                : 'Start a Project'}
                        </Link>
                    </div>
                    
                    {dashboardData?.completedProjects?.length > 0 && (
                        <ul className="project-list">
                            {dashboardData.completedProjects.map((project, index) => (
                                <li className="project-item" key={project._id || index}>
                                    <div className="project-info">
                                        <div className="project-name">{project.title}</div>
                                        <div className="project-date">
                                            Completed on {formatDate(project.deadline)}
                                        </div>
                                    </div>
                                    <div className="project-status completed">Completed</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <UserFooter />
        </div>
    );
};

export default Dashboard;
