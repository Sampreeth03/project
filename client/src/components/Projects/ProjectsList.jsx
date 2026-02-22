// client/src/components/Projects/ProjectsList.jsx (UPDATED & CLEANED)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../User/NavBar.jsx'; 
import { ProjectsWelcomeToast } from '../User/OnboardingToast.jsx';
import '../../styles/ProjectStyles.css'; 

const ProjectsList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [projectData, setProjectData] = useState({ createdProjects: [], availableProjects: [] });
    const [showWelcomeToast, setShowWelcomeToast] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('All Topics');
    const [joinedTopicCounts, setJoinedTopicCounts] = useState({});

    // Check if coming from profile completion (welcome param)
    useEffect(() => {
        if (searchParams.get('welcome') === 'true') {
            setShowWelcomeToast(true);
            // Remove the param from URL
            searchParams.delete('welcome');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

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
                const projectsResponse = await axios.get('/api/project');

                if (projectsResponse.data.success) {
                    setProjectData({
                        createdProjects: projectsResponse.data.createdProjects,
                        availableProjects: projectsResponse.data.availableProjects,
                    });
                } else {
                    setError(projectsResponse.data.error || "Failed to load project lists.");
                }

                try {
                    const joinedResponse = await axios.get('/api/joined-projects');
                    if (joinedResponse.data?.success) {
                        const counts = {};
                        (joinedResponse.data.projects || [])
                            .filter(p => p?.status === 'approved')
                            .forEach(p => {
                                const topic = p?.topic;
                                if (!topic) return;
                                counts[topic] = (counts[topic] || 0) + 1;
                            });
                        setJoinedTopicCounts(counts);
                    } else {
                        setJoinedTopicCounts({});
                    }
                } catch {
                    setJoinedTopicCounts({});
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
                setError("Network error: Could not connect to the project API.");
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const allTopics = Array.from(
        new Set(
            [...projectData.createdProjects, ...projectData.availableProjects]
                .map(p => p?.topic)
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));

    const matchesSearch = (project) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
            project.title?.toLowerCase().includes(query) ||
            project.description?.toLowerCase().includes(query) ||
            project.topic?.toLowerCase().includes(query)
        );
    };

    const matchesTopic = (project) => {
        if (selectedTopic === 'All Topics') return true;
        return project.topic === selectedTopic;
    };

    const filteredCreatedProjects = projectData.createdProjects.filter(
        (p) => matchesSearch(p) && matchesTopic(p)
    );

    const filteredAvailableProjects = projectData.availableProjects.filter(
        (p) => matchesSearch(p) && matchesTopic(p)
    );

    const recommendedAvailableProjects = filteredAvailableProjects
        .filter((p) => (joinedTopicCounts[p.topic] || 0) > 0)
        .sort((a, b) => {
            const diff = (joinedTopicCounts[b.topic] || 0) - (joinedTopicCounts[a.topic] || 0);
            if (diff !== 0) return diff;
            return (a.title || '').localeCompare(b.title || '');
        });

    const otherAvailableProjects = filteredAvailableProjects
        .filter((p) => (joinedTopicCounts[p.topic] || 0) === 0)
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const hasRecommendations = recommendedAvailableProjects.length > 0;

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
            <Navbar onSearchChange={setSearchQuery} />
            <div className="container" style={{ paddingTop: '70px', maxWidth: '1200px', margin: '30px auto', color: 'white' }}>

                <div className="projects-controls">
                    <label className="topic-filter">
                        <span className="topic-filter-label">Topic</span>
                        <select
                            className="topic-filter-select"
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                        >
                            <option value="All Topics">All Topics</option>
                            {allTopics.map((topic) => (
                                <option key={topic} value={topic}>
                                    {topic}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                
                {/* --- REMOVED: + Create New Project Button/Toggle Logic --- */}
                
                {/* Section for Projects CREATED by the user */}
                <h1 className="projects-title">My Created Projects</h1>
                
                <section className="created-projects" style={{ marginBottom: '40px' }}>
                    {projectData.createdProjects.length > 0 ? (
                        <div className="project-grid">
                            {filteredCreatedProjects.map(project => (
                                    <div key={project._id} className="project-card">
                                        <h3>{project.title}</h3>
                                        <p>{project.description}</p>
                                        <p>Topic: {project.topic} | Capacity: {project.capacity}</p>
                                        <div className="project-actions">
                                            <Link to={`/project/${project._id}`} className="btn">View Details</Link>
                                        </div>
                                    </div>
                                ))}
                            {filteredCreatedProjects.length === 0 && (
                                <p className="no-projects">No projects match your search.</p>
                            )}
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
                        <>
                            {recommendedAvailableProjects.length > 0 && (
                                <>
                                    <h2 className="projects-subtitle">Recommended Projects</h2>
                                    <div className="project-grid" style={{ marginBottom: '20px' }}>
                                        {recommendedAvailableProjects.map(project => (
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
                                </>
                            )}

                            <h2 className="projects-subtitle">{hasRecommendations ? 'Other Available Projects' : 'All Available Projects'}</h2>
                            {otherAvailableProjects.length > 0 ? (
                                <div className="project-grid">
                                    {otherAvailableProjects.map(project => (
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
                                !hasRecommendations && (
                                    <p className="no-projects">No projects match your search.</p>
                                )
                            )}
                        </>
                    ) : (
                        <p className="no-projects">No available projects to join.</p>
                    )}
                </section>
            </div>

            {/* Welcome Toast - shown after profile completion */}
            {showWelcomeToast && (
                <ProjectsWelcomeToast onComplete={() => setShowWelcomeToast(false)} />
            )}
        </>
    );
};

export default ProjectsList;