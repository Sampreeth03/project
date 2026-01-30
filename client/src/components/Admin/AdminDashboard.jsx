import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import AdminSidebar from './AdminSidebar';
import { fetchDashboardData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { dashboardData, dashboardLoading, dashboardError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');
    const [analyticsData, setAnalyticsData] = useState({ students: [], recruiters: [], projects: [], jobs: [], hires: [] });
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');

    useEffect(() => {
        dispatch(fetchDashboardData());
    }, [dispatch]);

    useEffect(() => {
        let mounted = true;

        const loadAnalytics = async () => {
            try {
                setAnalyticsLoading(true);
                setAnalyticsError('');
                const response = await fetch('/api/admin/analytics?range=30d', {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch analytics');
                }

                const data = await response.json();
                if (!mounted) return;

                setAnalyticsData({
                    students: Array.isArray(data.students) ? data.students : [],
                    recruiters: Array.isArray(data.recruiters) ? data.recruiters : [],
                    projects: Array.isArray(data.projects) ? data.projects : [],
                    jobs: Array.isArray(data.jobs) ? data.jobs : [],
                    hires: Array.isArray(data.hires) ? data.hires : []
                });
            } catch (error) {
                if (!mounted) return;
                setAnalyticsError(error.message || 'Failed to load analytics');
            } finally {
                if (mounted) setAnalyticsLoading(false);
            }
        };

        loadAnalytics();

        return () => {
            mounted = false;
        };
    }, []);

    const renderChangeSpan = (change) => {
        const num = Number(change) || 0;
        if (num > 0) return <span className="stat-up"><i className="fas fa-arrow-up"></i> {Math.abs(num)}%</span>;
        if (num < 0) return <span className="stat-down"><i className="fas fa-arrow-down"></i> {Math.abs(num)}%</span>;
        return <span className="stat-neutral">0%</span>;
    };

    const filteredCards = (dashboardData?.dashboardCards || []).filter(card => 
        card.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const fallbackRouteByTitle = {
        students: '/admin/students',
        recruiters: '/admin/recruiters',
        projects: '/admin/projects',
        'doubts asked': '/admin/doubts',
        administrators: '/admin/administrators',
        'platform administrators': '/admin/administrators'
    };

    const getCardRoute = (card) => {
        if (typeof card?.route === 'string' && card.route.startsWith('/')) {
            return card.route;
        }

        const key = String(card?.title || '').trim().toLowerCase();
        return fallbackRouteByTitle[key] || null;
    };

    const navigateFromCard = (card) => {
        const route = getCardRoute(card);
        if (!route) return;
        navigate(route);
    };

    const analyticsTotals = useMemo(() => ({
        students: analyticsData.students.reduce((sum, item) => sum + Number(item.count || 0), 0),
        recruiters: analyticsData.recruiters.reduce((sum, item) => sum + Number(item.count || 0), 0),
        projects: analyticsData.projects.reduce((sum, item) => sum + Number(item.count || 0), 0),
        jobs: analyticsData.jobs.reduce((sum, item) => sum + Number(item.count || 0), 0),
        hires: analyticsData.hires.reduce((sum, item) => sum + Number(item.count || 0), 0)
    }), [analyticsData]);

    const analyticsChartData = useMemo(() => {
        const buildMap = (series) => new Map((series || []).map((item) => [item.date, Number(item.count || 0)]));
        const joinedDates = analyticsData.students.map((item) => item.date);
        const studentMap = buildMap(analyticsData.students);
        const recruiterMap = buildMap(analyticsData.recruiters);

        return {
            joined: joinedDates.map((date) => ({
                date,
                students: studentMap.get(date) || 0,
                recruiters: recruiterMap.get(date) || 0
            })),
            projects: analyticsData.projects,
            jobs: analyticsData.jobs,
            hires: analyticsData.hires
        };
    }, [analyticsData]);

    const formatAxisDate = (value) => {
        if (!value) return '';
        const date = new Date(`${value}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const AnalyticsTooltip = ({ active, label, payload }) => {
        if (!active || !payload || payload.length === 0) return null;

        return (
            <div className="analytics-tooltip">
                <div className="analytics-tooltip-label">{formatAxisDate(label)}</div>
                {payload.map((item) => (
                    <div className="analytics-tooltip-row" key={item.dataKey || item.name}>
                        <span className="analytics-tooltip-dot" style={{ backgroundColor: item.color || '#fff' }}></span>
                        <span className="analytics-tooltip-name">{item.name || item.dataKey}</span>
                        <span className="analytics-tooltip-value">{Number(item.value || 0)}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {/* Header */}
                <div className="admin-header">
                    <div className="welcome">
                        <h2>Welcome, {dashboardData?.adminName || 'Admin'}!</h2>
                        <h4>Here's what's happening on RELABTeams today</h4>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <i className="fas fa-search"></i>
                        </div>
                        <div className="admin-profile">
                            <div className="admin-avatar">
                                <i className="fas fa-user"></i>
                            </div>
                            <div className="admin-info">
                                <div className="admin-name">{dashboardData?.adminName || 'Admin'}</div>
                                <div className="admin-role">{dashboardData?.adminRole || 'Super Admin'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Cards */}
                <div className="dashboard-cards">
                    {dashboardLoading && <div className="loading-message">Loading dashboard data...</div>}
                    {dashboardError && <div className="error-message">Error: {dashboardError}. Please login as admin.</div>}
                    {!dashboardLoading && !dashboardError && filteredCards.map((card, index) => (
                        <div 
                            key={index} 
                            className={`dashboard-card ${getCardRoute(card) ? 'dashboard-card-clickable' : ''}`}
                            style={{ animationDelay: `${index * 0.08}s` }}
                            onClick={() => navigateFromCard(card)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    navigateFromCard(card);
                                }
                            }}
                            role={getCardRoute(card) ? 'button' : undefined}
                            tabIndex={getCardRoute(card) ? 0 : undefined}
                            aria-label={getCardRoute(card) ? `Open ${card.title}` : undefined}
                        >
                            <div className="card-header">
                                <div className="card-title">{card.title}</div>
                                <div className={`card-icon bg-${card.colorClass || 'primary'}`}>
                                    <i className={`fas fa-${card.icon || 'chart-line'}`}></i>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="stat">{card.stat}</div>
                                <div className="stat-desc">
                                    {renderChangeSpan(card.change)}
                                    <span> since last {dashboardData?.period || '30 days'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!dashboardLoading && !dashboardError && filteredCards.length === 0 && (
                        <div className="no-data-message">No dashboard data available.</div>
                    )}
                </div>

                <div className="admin-analytics-section">
                    <div className="section-header">
                        <div>
                            <h3>30-Day Analytics</h3>
                            <p>Students, recruiters, projects, jobs, and hires trends from the last 30 days.</p>
                        </div>
                    </div>

                    <div className="analytics-kpi-grid">
                        {[
                            { label: 'Students', value: analyticsTotals.students, color: 'bg-primary', icon: 'user-graduate' },
                            { label: 'Recruiters', value: analyticsTotals.recruiters, color: 'bg-success', icon: 'building' },
                            { label: 'Projects', value: analyticsTotals.projects, color: 'bg-warning', icon: 'lightbulb' },
                            { label: 'Jobs', value: analyticsTotals.jobs, color: 'bg-primary', icon: 'briefcase' },
                            { label: 'Hires', value: analyticsTotals.hires, color: 'bg-danger', icon: 'user-check' }
                        ].map((item) => (
                            <div className="stat-card" key={item.label}>
                                <div className={`stat-icon ${item.color}`}>
                                    <i className={`fas fa-${item.icon}`}></i>
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value">{analyticsLoading ? '—' : item.value}</div>
                                    <div className="stat-label">{item.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {analyticsError && <div className="error-message">Error: {analyticsError}</div>}

                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <h4>Students & Recruiters Joined</h4>
                                <span>Line graph</span>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={analyticsChartData.joined}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" tickFormatter={formatAxisDate} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip content={<AnalyticsTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.18)' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="students" name="Students" stroke="#0068FF" strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="recruiters" name="Recruiters" stroke="#4ade80" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <h4>Projects Created</h4>
                                <span>Line graph</span>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={analyticsData.projects}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" tickFormatter={formatAxisDate} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip content={<AnalyticsTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.18)' }} />
                                    <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <h4>Job Recruitments</h4>
                                <span>Line graph</span>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={analyticsData.hires}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" tickFormatter={formatAxisDate} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip content={<AnalyticsTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.18)' }} />
                                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <h4>Projects Created</h4>
                                <span>Bar graph</span>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={analyticsData.projects}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" tickFormatter={formatAxisDate} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip content={<AnalyticsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="analytics-card">
                            <div className="analytics-card-header">
                                <h4>Jobs Created</h4>
                                <span>Bar graph</span>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={analyticsData.jobs}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" tickFormatter={formatAxisDate} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip content={<AnalyticsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;