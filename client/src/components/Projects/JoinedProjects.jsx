// client/src/components/Projects/JoinedProjects.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../User/NavBar.jsx'; 
import  '../../styles/ProjectStyles.css';

const JoinedProjects = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joinedData, setJoinedData] = useState({ projects: [], tasksByProject: {} });
    const [selectedTopic, setSelectedTopic] = useState('All Topics');

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
                console.error('Error fetching joined projects:', err);
                setError("Network error: Could not connect to the joined projects API.");
            } finally {
                setLoading(false);
            }
        };

        fetchJoinedProjects();
    }, []);

    if (loading) {
        return (
            <div className="joined-projects-state joined-projects-state-loading">
                <Navbar />
                Loading Joined Projects...
            </div>
        );
    }

    if (error) {
        return (
            <div className="joined-projects-state joined-projects-state-error">
                <Navbar />
                Error: {error}
            </div>
        );
    }

    const topics = Array.from(
        new Set(
            (joinedData.projects || [])
                .map(p => p?.topic)
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));

    const filteredProjects = (joinedData.projects || []).filter((project) => {
        if (selectedTopic === 'All Topics') return true;
        return project.topic === selectedTopic;
    });
    
    // --- Render Logic (Replaces EJS HTML) ---
    return (
        <>
            <Navbar />
            <div className="container joined-projects-page">
                <h1 className="projects-title">My Joined Projects & Requests</h1>

                <div className="projects-controls">
                    <label className="topic-filter">
                        <span className="topic-filter-label">Topic</span>
                        <select
                            className="topic-filter-select"
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                        >
                            <option value="All Topics">All Topics</option>
                            {topics.map((topic) => (
                                <option key={topic} value={topic}>
                                    {topic}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                
                {joinedData.projects.length === 0 ? (
                    <p className="no-projects">You haven't joined any projects yet or have no pending requests.</p>
                ) : filteredProjects.length === 0 ? (
                    <p className="no-projects">No joined projects match the selected topic.</p>
                ) : (
                    <div className="joined-projects-list">
                        {filteredProjects.map(project => (
                            <article key={project.id} className="project-card joined-project-card">
                                <div className="joined-project-card-shell">
                                    <div className="joined-project-card-top">
                                        <div className="joined-project-title-row">
                                            <h2 className="joined-project-title">{project.title}</h2>
                                            <span className={`joined-project-status ${project.status === 'approved' ? 'is-approved' : 'is-pending'}`}>
                                                {project.status}
                                            </span>
                                        </div>

                                        {project.topic && (
                                            <p className="joined-project-topic">{project.topic}</p>
                                        )}
                                    </div>

                                    <div className="joined-project-card-body">
                                        {project.status === 'approved' && (
                                            <>
                                                <p className="joined-project-description">{project.description}</p>
                                                <div className="joined-project-task-section">
                                                    <p className="joined-project-section-label">Tasks Assigned to Me</p>
                                                    <ul className="joined-project-task-list">
                                                        {joinedData.tasksByProject[project.id]?.length ? (
                                                            joinedData.tasksByProject[project.id].map(task => (
                                                                <li key={task.id}>
                                                                    <Link to={`/project/${project.id}`} className="joined-project-task-link">
                                                                        {task.title}
                                                                    </Link>
                                                                    <span className={`joined-task-status status-${String(task.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                                                        {task.status}
                                                                    </span>
                                                                </li>
                                                            ))
                                                        ) : (
                                                            <li className="joined-project-task-empty">No tasks assigned to you yet.</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </>
                                        )}

                                        {project.status === 'pending' && (
                                            <p className="joined-project-pending-copy">Your request to join this project is pending approval. You can still open the project and track its status.</p>
                                        )}
                                    </div>

                                    <div className="project-actions joined-project-actions">
                                        <Link to={`/project/${project.id}`} className="btn-secondary">View Project Status</Link>

                                        {project.status === 'pending' && (
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => alert(`Logic to cancel request ${project.requestId}`)}
                                            >
                                                Cancel Request
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default JoinedProjects;
