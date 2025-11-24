import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchDashboardData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const { dashboardData, dashboardLoading, dashboardError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dispatch(fetchDashboardData());
    }, [dispatch]);

    const renderChangeSpan = (change) => {
        const num = Number(change) || 0;
        if (num > 0) return <span className="stat-up"><i className="fas fa-arrow-up"></i> {Math.abs(num)}%</span>;
        if (num < 0) return <span className="stat-down"><i className="fas fa-arrow-down"></i> {Math.abs(num)}%</span>;
        return <span className="stat-neutral">0%</span>;
    };

    const filteredCards = (dashboardData?.dashboardCards || []).filter(card => 
        card.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            className="dashboard-card"
                            style={{ animationDelay: `${index * 0.08}s` }}
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
            </div>
        </div>
    );
};

export default AdminDashboard;