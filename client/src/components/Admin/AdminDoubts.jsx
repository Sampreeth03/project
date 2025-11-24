import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchDoubtsData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminDoubts = () => {
    const dispatch = useDispatch();
    const { doubts, doubtsLoading, doubtsError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dispatch(fetchDoubtsData());
    }, [dispatch]);

    const filteredDoubts = doubts.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };

    const totalDoubtsAsked = doubts.reduce((sum, user) => sum + (user.doubtsAsked || 0), 0);
    const totalDoubtsCleared = doubts.reduce((sum, user) => sum + (user.doubtsCleared || 0), 0);

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {/* Header */}
                <div className="admin-header">
                    <div className="page-title">
                        <h2>Doubts Management</h2>
                        <div className="breadcrumb">Dashboard &gt; Doubts</div>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search users..." 
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
                                <div className="admin-name">Admin</div>
                                <div className="admin-role">Super Admin</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Doubts Stats */}
                <div className="doubts-stats">
                    <div className="stat-card">
                        <div className="stat-icon bg-primary"><i className="fas fa-question-circle"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{totalDoubtsAsked}</div>
                            <div className="stat-label">Total Doubts Asked</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-success"><i className="fas fa-check-circle"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{totalDoubtsCleared}</div>
                            <div className="stat-label">Doubts Cleared</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-warning"><i className="fas fa-clock"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{totalDoubtsAsked - totalDoubtsCleared}</div>
                            <div className="stat-label">Pending</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-danger"><i className="fas fa-percentage"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">
                                {totalDoubtsAsked > 0 ? Math.round((totalDoubtsCleared / totalDoubtsAsked) * 100) : 0}%
                            </div>
                            <div className="stat-label">Resolution Rate</div>
                        </div>
                    </div>
                </div>

                {/* Doubts Table */}
                <div className="admin-table-container">
                    <div className="table-header">
                        <h4 className="table-title">Doubts Statistics</h4>
                        <span className="table-count">{filteredDoubts.length} users</span>
                    </div>
                    <div className="table-wrapper">
                        {doubtsLoading && <div className="loading-message">Loading doubts data...</div>}
                        {doubtsError && <div className="error-message">Error: {doubtsError}. Please login as admin.</div>}
                        {!doubtsLoading && !doubtsError && (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Doubts Cleared</th>
                                        <th>Total Doubts Asked</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDoubts.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-avatar">{getInitials(user.name)}</div>
                                                    <div className="user-details">
                                                        <div className="user-name">{user.name}</div>
                                                        <div className="user-email">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-success">{user.doubtsCleared || 0}</span>
                                            </td>
                                            <td>
                                                <span className="badge badge-primary">{user.doubtsAsked || 0}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredDoubts.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="no-data">No data available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDoubts;
