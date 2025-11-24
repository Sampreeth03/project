import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchRecruitersData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminRecruiters = () => {
    const dispatch = useDispatch();
    const { recruiters, recruitersLoading, recruitersError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dispatch(fetchRecruitersData());
    }, [dispatch]);

    const filteredRecruiters = recruiters.filter(recruiter =>
        recruiter.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recruiter.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recruiter.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'R';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {/* Header */}
                <div className="admin-header">
                    <div className="page-title">
                        <h2>Recruiters Management</h2>
                        <div className="breadcrumb">Dashboard &gt; Recruiters</div>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search recruiters..." 
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

                {/* Recruiters Table */}
                <div className="admin-table-container">
                    <div className="table-header">
                        <h4 className="table-title">All Recruiters</h4>
                        <span className="table-count">{filteredRecruiters.length} recruiters</span>
                    </div>
                    <div className="table-wrapper">
                        {recruitersLoading && <div className="loading-message">Loading recruiters...</div>}
                        {recruitersError && <div className="error-message">Error: {recruitersError}. Please login as admin.</div>}
                        {!recruitersLoading && !recruitersError && (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Recruiter</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Recruitments</th>
                                        <th>Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecruiters.map((recruiter) => (
                                        <tr key={recruiter.id}>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-avatar bg-success">{getInitials(recruiter.name)}</div>
                                                    <div className="user-details">
                                                        <div className="user-name">{recruiter.name}</div>
                                                        <div className="user-email">{recruiter.company}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{recruiter.email}</td>
                                            <td><span className="badge badge-primary">{recruiter.role}</span></td>
                                            <td>{recruiter.recruitmentCount || 0}</td>
                                            <td>{formatDate(recruiter.joinedDate)}</td>
                                        </tr>
                                    ))}
                                    {filteredRecruiters.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="no-data">No recruiters found</td>
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

export default AdminRecruiters;
