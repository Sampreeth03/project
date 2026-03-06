import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchProjectsData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminProjects = () => {
    const dispatch = useDispatch();
    const { projects, projectsLoading, projectsError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedProject, setExpandedProject] = useState(null);
    const popoverRef = useRef(null);

    const toggleMembers = (projectId, e) => {
        e.stopPropagation();
        setExpandedProject(prev => prev === projectId ? null : projectId);
    };

    // Close popover when clicking outside
    useEffect(() => {
        const handleOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setExpandedProject(null);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        dispatch(fetchProjectsData());
    }, [dispatch]);

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'badge-success';
            case 'completed': return 'badge-primary';
            case 'expired': return 'badge-danger';
            default: return 'badge-warning';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'No deadline';
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
                        <h2>Projects Overview</h2>
                        <div className="breadcrumb">Dashboard &gt; Projects</div>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search projects..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <i className="fas fa-search"></i>
                        </div>
                        <select 
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="expired">Expired</option>
                        </select>
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

                {/* Projects Stats */}
                {projectsError && <div className="error-message">Error: {projectsError}. Please login as admin.</div>}
                {!projectsError && (
                <div className="projects-stats">
                    <div
                        className={`stat-card stat-card-btn${statusFilter === 'all' ? ' stat-card-active' : ''}`}
                        onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
                    >
                        <div className="stat-icon bg-primary"><i className="fas fa-folder"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{projects.length}</div>
                            <div className="stat-label">Total Projects</div>
                        </div>
                    </div>
                    <div
                        className={`stat-card stat-card-btn${statusFilter === 'active' ? ' stat-card-active stat-card-active-success' : ''}`}
                        onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
                    >
                        <div className="stat-icon bg-success"><i className="fas fa-spinner"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{projects.filter(p => p.status === 'active').length}</div>
                            <div className="stat-label">Active</div>
                        </div>
                    </div>
                    <div
                        className={`stat-card stat-card-btn${statusFilter === 'completed' ? ' stat-card-active stat-card-active-warning' : ''}`}
                        onClick={() => setStatusFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                    >
                        <div className="stat-icon bg-warning"><i className="fas fa-check-circle"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{projects.filter(p => p.status === 'completed').length}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                    </div>
                    <div
                        className={`stat-card stat-card-btn${statusFilter === 'expired' ? ' stat-card-active stat-card-active-danger' : ''}`}
                        onClick={() => setStatusFilter(prev => prev === 'expired' ? 'all' : 'expired')}
                    >
                        <div className="stat-icon bg-danger"><i className="fas fa-times-circle"></i></div>
                        <div className="stat-info">
                            <div className="stat-value">{projects.filter(p => p.status === 'expired').length}</div>
                            <div className="stat-label">Expired</div>
                        </div>
                    </div>
                </div>
                )}

                {/* Projects Grid */}
                <div className="projects-grid">
                    {projectsLoading && <div className="loading-message">Loading projects...</div>}
                    {!projectsLoading && !projectsError && filteredProjects.map((project) => (
                        <div key={project.id} className="project-card">
                            <div className="project-header">
                                <h3 className="project-title">{project.title}</h3>
                                <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>
                            <div className="project-category">
                                <i className="fas fa-tag"></i> {project.category}
                            </div>
                            <p className="project-description">{project.description}</p>
                            <div className="project-footer">
                                <div className="project-meta">
                                    <span
                                        className="members-trigger"
                                        onClick={(e) => toggleMembers(project.id, e)}
                                        style={{ cursor: 'pointer', position: 'relative' }}
                                    >
                                        <i className="fas fa-users"></i> {project.members} members
                                        {expandedProject === project.id && (
                                            <div
                                                ref={popoverRef}
                                                className="members-popover"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="popover-section-label">Created by</div>
                                                <div className="member-item member-lead">
                                                    <i className="fas fa-crown"></i>
                                                    <span className="member-name">{project.lead?.name || 'Unknown'}</span>
                                                </div>
                                                {project.participants && project.participants.length > 0 && (
                                                    <>
                                                        <div className="popover-section-label popover-section-members">Members</div>
                                                        {project.participants.map((p) => (
                                                            <div key={p.id} className="member-item">
                                                                <i className="fas fa-user"></i>
                                                                <span className="member-name">{p.name}</span>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </span>
                                    <span><i className="fas fa-calendar"></i> {formatDate(project.deadline)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!projectsLoading && filteredProjects.length === 0 && (
                        <div className="no-data-message">No projects found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminProjects;
