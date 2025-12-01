// client/src/components/Projects/ProjectsList.jsx (UPDATED & CLEANED)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../User/NavBar.jsx'; 
import '../../styles/ProjectStyles.css'; 

const ProjectsList = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [projectData, setProjectData] = useState({ createdProjects: [], availableProjects: [] });

    const handleJoinProject = async (projectId) => {
        try {
            const response = await axios.post('/api/join-project', { projectId });
            if (response.data.success) {
                alert(response.data.message || 'Join request sent successfully!');
                // Refresh the project list to update the button state
                const refreshResponse = await axios.get('/api/project');
                if (refreshResponse.data.success) {
                    setProjectData({
                        createdProjects: refreshResponse.data.createdProjects,
                        availableProjects: refreshResponse.data.availableProjects,
                    });
                }
            } else {
                alert(response.data.message || 'Failed to send join request');
            }
        } catch (err) {
            console.error('Error joining project:', err);
            alert('An error occurred while sending the join request');
        }
    };

    useEffect(() => {
        // ... (data fetching logic remains the same) ...
        const fetchProjects = async () => {
            try {
                const response = await axios.get('/api/project'); 
                
                if (response.data.success) {
                    setProjectData({
                        createdProjects: response.data.createdProjects,
                        availableProjects: response.data.availableProjects,
                    });
                } else {
                    setError(response.data.error || "Failed to load project lists.");
                }
            } catch (err) {
                setError("Network error: Could not connect to the project API.");
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    if (loading) {
        return (
            <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>
                <Navbar />
                Loading Project Lists...
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

    return (
        <>
            <Navbar />
            <div className="container" style={{ paddingTop: '70px', maxWidth: '1200px', margin: '30px auto', color: 'white' }}>
                
                {/* --- REMOVED: + Create New Project Button/Toggle Logic --- */}
                
                {/* Section for Projects CREATED by the user */}
                <h1 className="projects-title">My Created Projects</h1>
                <section className="created-projects" style={{ marginBottom: '40px' }}>
                    {projectData.createdProjects.length > 0 ? (
                        <div className="project-grid">
                            {projectData.createdProjects.map(project => (
                                <div key={project._id} className="project-card">
                                    <h3>{project.title}</h3>
                                    <p>{project.description}</p>
                                    <p>Topic: {project.topic} | Capacity: {project.capacity}</p>
                                    <div className="project-actions">
                                        <Link to={`/project/${project._id}`} className="btn">View Details</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Provides link to the dedicated creation page
                        <p className="no-projects" style={{ marginTop: '10px' }}>You have not created any projects yet. <Link to="/e">Create a new project</Link> to get started!</p>
                    )}
                </section>
                
                {/* Section for Projects AVAILABLE to join */}
                <h1 className="projects-title">Available Projects</h1>
                <section className="available-projects">
                    {projectData.availableProjects.length > 0 ? (
                        <div className="project-grid">
                            {projectData.availableProjects.map(project => (
                                <div key={project._id} className="project-card available-project-card">
                                    <div className="project-content">
                                        <div className="project-header">
                                            <h2 className="project-title subtle-title">{project.title}</h2>
                                        </div>
                                        <p className="project-description subtle-desc">{project.description}</p>
                                        <div className="project-meta subtle-meta">
                                            <span className="project-members">Members: {project.member_count} / {project.capacity}</span>
                                            <span className="project-topic">Topic: {project.topic}</span>
                                        </div>
                                        <div className="project-actions">
                                            <Link to={`/project/${project._id}`} className="btn btn-outline">View Details</Link>
                                            <button
                                                disabled={project.has_pending_request || project.request_status === 'pending'}
                                                className="btn btn-ghost"
                                                onClick={() => handleJoinProject(project._id)}
                                            >
                                                {project.request_status === 'pending' ? 'Request Pending' : 
                                                 project.request_status === 'rejected' ? 'Rejected' : 
                                                 project.request_status === 'approved' ? 'Approved' : 
                                                 'Join Project'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-projects">No available projects to join.</p>
                    )}
                </section>
            </div>
        </>
    );
};

export default ProjectsList;