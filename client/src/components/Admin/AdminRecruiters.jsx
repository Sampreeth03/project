import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchRecruitersData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminRecruiters = () => {
    const dispatch = useDispatch();
    const { recruiters, recruitersLoading, recruitersError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRecruiter, setExpandedRecruiter] = useState(null);

    const toggleRecruiter = (id) => {
        setExpandedRecruiter(prev => prev === id ? null : id);
    };

    const formatJobDate = (dateStr) => {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

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
                                        <th>Company</th>
                                        <th>Recruitments</th>
                                        <th>Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecruiters.map((recruiter) => (
                                        <React.Fragment key={recruiter.id}>
                                            <tr
                                                className={`recruiter-row${expandedRecruiter === recruiter.id ? ' recruiter-row-active' : ''}`}
                                                onClick={() => toggleRecruiter(recruiter.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>
                                                    <div className="user-info">
                                                        <div className="user-avatar bg-success">{getInitials(recruiter.name)}</div>
                                                        <div className="user-details">
                                                            <div className="user-name">{recruiter.name}</div>
                                                            <div className="user-email">{recruiter.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{recruiter.email}</td>
                                                <td><span className="badge badge-primary">{recruiter.role}</span></td>
                                                <td>{recruiter.company || '—'}</td>
                                                <td>{recruiter.recruitmentCount || 0}</td>
                                                <td>{formatDate(recruiter.joinedDate)}</td>
                                            </tr>
                                            {expandedRecruiter === recruiter.id && (
                                                <tr className="recruiter-expand-row">
                                                    <td colSpan="6">
                                                        <div className="recruiter-expand-body">
                                                            {(() => {
                                                                const hired = (recruiter.hiredJobs || []).filter(j => j.type === 'hired');
                                                                return hired.length > 0 ? (
                                                                    <>
                                                                        <div className="expand-label">Hired Members</div>
                                                                        <div className="hired-jobs-list">
                                                                            {hired.map((job, idx) => (
                                                                                <div key={idx} className="hired-job-item">
                                                                                    <span className="hired-person-name"><i className="fas fa-user-check"></i> {job.personName || '—'}</span>
                                                                                    <span className="hired-role-title">{job.title}</span>
                                                                                    <span className="hired-job-date"><i className="fas fa-calendar-alt"></i> {formatJobDate(job.date)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="no-jobs-msg">No one hired yet.</div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {filteredRecruiters.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="no-data">No recruiters found</td>
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
