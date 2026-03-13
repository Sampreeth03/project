import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext.jsx';
import NavBar from './NavBar.jsx';
import UserFooter from './UserFooter.jsx';
import { LineChart, DualLineChart, StackedBarChart, Heatmap } from './TrendCharts.jsx';
import '../../styles/Dashboard.css';

const Dashboard = () => {
    const { user: currentUser } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [trendData, setTrendData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [metricsRes, trendsRes] = await Promise.all([
                axios.get('/api/dashboard-metrics'),
                axios.get('/api/dashboard-trends')
            ]);
            setDashboardData(metricsRes.data);
            setTrendData(trendsRes.data);
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            setError(err.response?.data?.error || 'Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    };

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
            { title: 'Solutions Provided', value: m.solutions_provided || 0 },
        ];
    };

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

    const getDisplayName = () => dashboardData?.username || currentUser?.name || 'User';

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
                        <button className="retry-button" onClick={fetchData}>
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
            
            {/* Fixed top-right profile badge */}
            <div className="user-profile-fixed">
                <div className="profile-image">{getInitial()}</div>
                <div className="profile-info">
                    <div className="profile-name">{getDisplayName()}</div>
                    <div className="profile-role">Student │ IIIT Sri City</div>
                </div>
            </div>

            <div className="dashboard-main-content">
                {/* Dashboard Header */}
                <div className="dashboard-header">
                    <div className="user-greeting">
                        <h1 className="dashboard-title">Dashboard</h1>
                        <p id="user-welcome">
                            Welcome back, {getDisplayName()}. Here's your current performance summary.
                        </p>
                    </div>
                </div>

               

                {/* ── Metric Cards ── */}
                <div className="metrics-container">
                    {getMetricCards().map((metric, index) => (
                        <div className="metric-card" key={index}>
                            <div className="metric-value">{metric.value}</div>
                            <div className="metric-title">{metric.title}</div>
                        </div>
                    ))}
                </div>

                {/* ── Trend Charts ── */}
                <div className="trends-section">
                    {/* 1. Project Growth Trend */}
                    <div className="trend-card">
                        <div className="trend-header">
                            <h3 className="trend-title">Project Growth Trend</h3>
                            <span className="trend-subtitle">Members joining your projects per week</span>
                        </div>
                        <LineChart data={trendData?.memberGrowth} valueKey="count" color="#0066ee" id="gMG" />
                    </div>

                    {/* 2. Creation vs Participation */}
                    <div className="trend-card">
                        <div className="trend-header">
                            <h3 className="trend-title">Creation vs Participation</h3>
                            <div className="trend-legend">
                                <span className="tl-item"><span className="tl-line" style={{ background: '#0066ee' }} />Created</span>
                                <span className="tl-item"><span className="tl-line tl-dashed" style={{ background: '#a855f7' }} />Joined</span>
                            </div>
                        </div>
                        <DualLineChart data={trendData?.projectComparison} k1="created" k2="joined" c1="#0066ee" c2="#a855f7" l1="Created" l2="Joined" id="gPC" />
                    </div>

                    {/* 3. Task Progress Timeline */}
                    <div className="trend-card">
                        <div className="trend-header">
                            <h3 className="trend-title">Task Progress Timeline</h3>
                            <span className="trend-subtitle">Cumulative completed tasks</span>
                        </div>
                        <LineChart data={trendData?.taskProgress} valueKey="cumulative" color="#10b981" id="gTP" />
                    </div>

                    {/* 4. Community Contribution */}
                    <div className="trend-card">
                        <div className="trend-header">
                            <h3 className="trend-title">Community Contribution</h3>
                            <div className="trend-legend">
                                <span className="tl-item"><span className="tl-line" style={{ background: '#f59e0b' }} />Doubts</span>
                                <span className="tl-item"><span className="tl-line tl-dashed" style={{ background: '#06b6d4' }} />Replies</span>
                            </div>
                        </div>
                        <DualLineChart data={trendData?.communityTrend} k1="doubts" k2="replies" c1="#f59e0b" c2="#06b6d4" l1="Doubts" l2="Replies" id="gCC" />
                    </div>

                    {/* 5. Job Application Activity */}
                    <div className="trend-card">
                        <div className="trend-header">
                            <h3 className="trend-title">Job Application Activity</h3>
                            <div className="trend-legend">
                                <span className="tl-item"><span className="tl-dot" style={{ background: '#f59e0b' }} />Pending</span>
                                <span className="tl-item"><span className="tl-dot" style={{ background: '#10b981' }} />Approved</span>
                                <span className="tl-item"><span className="tl-dot" style={{ background: '#ef4444' }} />Rejected</span>
                            </div>
                        </div>
                        <StackedBarChart
                            data={trendData?.jobActivity}
                            keys={['pending', 'approved', 'rejected']}
                            colors={['#f59e0b', '#10b981', '#ef4444']}
                            labels={['Pending', 'Approved', 'Rejected']}
                        />
                    </div>

                    {/* 6. Activity Heatmap */}
                    <div className="trend-card trend-card-wide">
                        <div className="trend-header">
                            <h3 className="trend-title">Activity Heatmap</h3>
                            <span className="trend-subtitle">Last 13 weeks</span>
                        </div>
                        <Heatmap data={trendData?.activityHeatmap} />
                    </div>
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
