import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchStudentsData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminStudents = () => {
    const dispatch = useDispatch();
    const { students, studentsLoading, studentsError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dispatch(fetchStudentsData());
    }, [dispatch]);

    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };

    return (
        <div className="admin-container">
            <AdminSidebar />
            <div className="admin-main-content">
                {/* Header */}
                <div className="admin-header">
                    <div className="page-title">
                        <h2>Students Management</h2>
                        <div className="breadcrumb">Dashboard &gt; Students</div>
                    </div>
                    <div className="admin-controls">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search students..." 
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

                {/* Students Table */}
                <div className="admin-table-container">
                    <div className="table-header">
                        <h4 className="table-title">All Students</h4>
                        <span className="table-count">{filteredStudents.length} students</span>
                    </div>
                    <div className="table-wrapper">
                        {studentsLoading && <div className="loading-message">Loading students...</div>}
                        {studentsError && <div className="error-message">Error: {studentsError}. Please login as admin.</div>}
                        {!studentsLoading && !studentsError && (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Hosted Projects</th>
                                        <th>Tasks Completed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id}>
                                            <td>
                                                <div className="user-info">
                                                    <div className="user-avatar">{getInitials(student.name)}</div>
                                                    <div className="user-details">
                                                        <div className="user-name">{student.name}</div>
                                                        <div className="user-email">{student.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{student.hostedProjects || 0}</td>
                                            <td>{student.tasksCompleted || 0}</td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="no-data">No students found</td>
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

export default AdminStudents;
