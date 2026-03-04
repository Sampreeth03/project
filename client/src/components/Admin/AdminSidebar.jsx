import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const AdminSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <div className="admin-sidebar">
            <div className="sidebar-header">
                <Link to="/admin" className="logo">
                    <div className="logo-text">RELABTeams</div>
                </Link>
            </div>
            <div className="nav-menu">
                <div className="menu-label">Core</div>
                <Link to="/admin" className={`menu-item ${isActive('/admin') ? 'active' : ''}`}>
                    <i className="fas fa-gauge-high"></i>
                    <span>Dashboard</span>
                </Link>

                <div className="menu-label">Management</div>
                <Link to="/admin/students" className={`menu-item ${isActive('/admin/students') ? 'active' : ''}`}>
                    <i className="fas fa-user-graduate"></i>
                    <span>Students</span>
                </Link>
                <Link to="/admin/recruiters" className={`menu-item ${isActive('/admin/recruiters') ? 'active' : ''}`}>
                    <i className="fas fa-building"></i>
                    <span>Recruiters</span>
                </Link>
                <Link to="/admin/projects" className={`menu-item ${isActive('/admin/projects') ? 'active' : ''}`}>
                    <i className="fas fa-lightbulb"></i>
                    <span>Projects</span>
                </Link>
                <Link to="/admin/doubts" className={`menu-item ${isActive('/admin/doubts') ? 'active' : ''}`}>
                    <i className="fas fa-question-circle"></i>
                    <span>Doubts</span>
                </Link>

                <Link to="/admin/administrators" className={`menu-item ${isActive('/admin/administrators') ? 'active' : ''}`}>
                    <i className="fas fa-user-shield"></i>
                    <span>Administrators</span>
                </Link>

                <div className="menu-label">Communication</div>
                <Link to="/admin/messages" className={`menu-item ${isActive('/admin/messages') ? 'active' : ''}`}>
                    <i className="fas fa-comment"></i>
                    <span>Messages</span>
                </Link>

                <div className="menu-label">Settings</div>
                <Link to="/admin/profile" className={`menu-item ${isActive('/admin/profile') ? 'active' : ''}`}>
                    <i className="fas fa-user-circle"></i>
                    <span>Profile</span>
                </Link>
                <button className="menu-item logout-btn" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default AdminSidebar;
