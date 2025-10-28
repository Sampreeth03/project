// client/src/components/Projects/JoinedProjects.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../User/Navbar.jsx'; 
import  '../../styles/ProjectStyles.css';

const JoinedProjects = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joinedData, setJoinedData] = useState({ projects: [], tasksByProject: {} });

    useEffect(() => {
        const fetchJoinedProjects = async () => {
            try {
                // Call the converted API endpoint /api/joined-projects
                const response = await axios.get('/api/joined-projects'); 
                
                if (response.data.success) {
                    setJoinedData({
                        projects: response.data.projects, // Contains approved and pending projects
                        tasksByProject: response.data.tasksByProject,
                    });
                } else {
                    setError(response.data.error || "Failed to load joined projects.");
                }
            } catch (err) {
                setError("Network error: Could not connect to the joined projects API.");
            } finally {
                setLoading(false);
            }
        };

        fetchJoinedProjects();
    }, []);

    if (loading) {
        return (
            <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>
                <Navbar />
                Loading Joined Projects...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ color: 'red', textAlign: 'center', marginTop: '100px' }}>
                <Navbar />
                Error: {error}
            </div>
        );
    }
    
    // --- Render Logic (Replaces EJS HTML) ---
    return (
        <>
            <Navbar />
            <div className="container" style={{ paddingTop: '70px', maxWidth: '1200px', margin: '30px auto', color: 'white' }}>
                <h1 className="projects-title">My Joined Projects & Requests</h1>
                
                {joinedData.projects.length === 0 ? (
                    <p className="no-projects">You haven't joined any projects yet or have no pending requests.</p>
                ) : (
                    <div className="joined-projects-list">
                        {joinedData.projects.map(project => (
                            <div key={project.id} className="project-card">
                                <h2>
                                    {project.title} 
                                    <span style={{ fontSize: '0.8em', marginLeft: '10px', color: project.status === 'approved' ? '#66BB6A' : '#FFC107' }}>
                                        ({project.status.toUpperCase()})
                                    </span>
                                </h2>
                                
                                {project.status === 'approved' && (
                                    <>
                                        <p>{project.description}</p>
                                        <p>Tasks Assigned to Me:</p>
                                        <ul style={{ listStyleType: 'disc', marginLeft: '20px', color: '#BBBBBB' }}>
                                            {joinedData.tasksByProject[project.id]?.map(task => (
                                                <li key={task.id}>
                                                    <Link to={`/project/${project.id}`} style={{ color: '#0068FF' }}>
                                                        {task.title}
                                                    </Link> - Status: {task.status}
                                                </li>
                                            )) || <li>No tasks assigned to you.</li>}
                                        </ul>
                                    </>
                                )}
                                
                                {project.status === 'pending' && (
                                    <p style={{ color: '#FFC107' }}>Your request to join this project is pending approval.</p>
                                )}
                                
                                <div className="project-actions">
                                    {/* Link to project details or simply view the pending request */}
                                    <Link to={`/project/${project.id}`} className="btn-secondary">View Project Status</Link>
                                    
                                    {project.status === 'pending' && (
                                        <button className="btn btn-secondary" onClick={() => alert(`Logic to cancel request ${project.requestId}`)}>
                                            Cancel Request
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default JoinedProjects;