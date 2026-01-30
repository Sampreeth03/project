import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from './AdminSidebar';
import { fetchStudentsData } from '../../store/adminSlice';
import '../../styles/Admin.css';

const AdminStudents = () => {
    const dispatch = useDispatch();
    const { students, studentsLoading, studentsError } = useSelector((state) => state.admin);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentProfile, setStudentProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');

    useEffect(() => {
        dispatch(fetchStudentsData());
    }, [dispatch]);

    const filteredStudents = useMemo(() => {
        const query = searchQuery.toLowerCase();

        return [...students]
            .filter((student) =>
                student.name?.toLowerCase().includes(query) ||
                student.email?.toLowerCase().includes(query)
            )
            .sort((left, right) => {
                const leftProjects = Number(left.projectCount ?? left.hostedProjects ?? 0);
                const rightProjects = Number(right.projectCount ?? right.hostedProjects ?? 0);
                if (rightProjects !== leftProjects) return rightProjects - leftProjects;

                const leftTasks = Number(left.completedTasks ?? left.tasksCompleted ?? 0);
                const rightTasks = Number(right.completedTasks ?? right.tasksCompleted ?? 0);
                if (rightTasks !== leftTasks) return rightTasks - leftTasks;

                return String(left.name || '').localeCompare(String(right.name || ''));
            });
    }, [students, searchQuery]);

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };

    const formatJoinedDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return 'N/A';
        return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleOpenProfile = async (student) => {
        if (!student?.id) return;

        setSelectedStudent(student);
        setStudentProfile(null);
        setProfileError('');
        setProfileLoading(true);

        try {
            const response = await fetch(`/api/profile-data/${student.id}`, {
                credentials: 'include'
            });

            const payload = await response.json();
            if (!response.ok || payload?.success === false) {
                throw new Error(payload?.message || 'Failed to load profile');
            }

            setStudentProfile(payload?.user || null);
        } catch (error) {
            setProfileError(error.message || 'Failed to load profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleCloseProfile = () => {
        setSelectedStudent(null);
        setStudentProfile(null);
        setProfileError('');
        setProfileLoading(false);
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
                                                        <button
                                                            type="button"
                                                            className="user-name profile-link-btn"
                                                            onClick={() => handleOpenProfile(student)}
                                                        >
                                                            {student.name}
                                                        </button>
                                                        <div className="user-email">{student.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{student.projectCount ?? student.hostedProjects ?? 0}</td>
                                            <td>{student.completedTasks ?? student.tasksCompleted ?? 0}</td>
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

                {selectedStudent && (
                    <div className="admin-modal-overlay" onClick={handleCloseProfile}>
                        <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
                            <button type="button" className="admin-modal-close" onClick={handleCloseProfile}>
                                <i className="fas fa-times"></i>
                            </button>

                            <div className="admin-modal-header">
                                <div className="admin-modal-avatar">{getInitials(selectedStudent.name)}</div>
                                <div className="admin-modal-headline">
                                    <h3>{selectedStudent.name}</h3>
                                    <p>{selectedStudent.email}</p>
                                </div>
                            </div>

                            {profileLoading && <div className="loading-message">Loading profile...</div>}
                            {!profileLoading && profileError && (
                                <div className="error-message">Error: {profileError}</div>
                            )}

                            {!profileLoading && !profileError && studentProfile && (
                                <div className="admin-modal-content">
                                    <div className="admin-modal-grid">
                                        <div className="admin-modal-item">
                                            <span className="admin-modal-label">Joined</span>
                                            <span className="admin-modal-value">{formatJoinedDate(studentProfile.joinedAt)}</span>
                                        </div>
                                        <div className="admin-modal-item">
                                            <span className="admin-modal-label">Completed Tasks</span>
                                            <span className="admin-modal-value">{studentProfile.totalCompletedTasks || 0}</span>
                                        </div>
                                        <div className="admin-modal-item">
                                            <span className="admin-modal-label">Projects as Leader</span>
                                            <span className="admin-modal-value">
                                                {Array.isArray(studentProfile.completedAsLeader)
                                                    ? studentProfile.completedAsLeader.length
                                                    : 0}
                                            </span>
                                        </div>
                                        <div className="admin-modal-item">
                                            <span className="admin-modal-label">Task Projects</span>
                                            <span className="admin-modal-value">
                                                {Array.isArray(studentProfile.completedProjects)
                                                    ? studentProfile.completedProjects.length
                                                    : 0}
                                            </span>
                                        </div>
                                    </div>

                                    {studentProfile.bio && (
                                        <div className="admin-modal-section">
                                            <h4>About</h4>
                                            <p>{studentProfile.bio}</p>
                                        </div>
                                    )}

                                    {Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0 && (
                                        <div className="admin-modal-section">
                                            <h4>Skills</h4>
                                            <p>{studentProfile.skills.join(', ')}</p>
                                        </div>
                                    )}

                                    {Array.isArray(studentProfile.interests) && studentProfile.interests.length > 0 && (
                                        <div className="admin-modal-section">
                                            <h4>Interests</h4>
                                            <p>{studentProfile.interests.join(', ')}</p>
                                        </div>
                                    )}

                                    {studentProfile.resumeUrl && (
                                        <div className="admin-modal-section">
                                            <a
                                                className="admin-modal-link"
                                                href={studentProfile.resumeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                View Resume
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminStudents;
