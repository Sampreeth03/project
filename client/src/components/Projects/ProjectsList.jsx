// client/src/components/Projects/ProjectsList.jsx (UPDATED & CLEANED)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../User/NavBar.jsx'; 
import { ProjectsWelcomeToast } from '../User/OnboardingToast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import '../../styles/ProjectsListStyles.css'; 

const ProjectsList = () => {
    const defaultMeta = { page: 1, rows: 12, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [projectData, setProjectData] = useState({ createdProjects: [], availableProjects: [] });
    const [searchData, setSearchData] = useState({ createdProjects: [], availableProjects: [] });
    const [showWelcomeToast, setShowWelcomeToast] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('All Topics');
    const [joinedTopicCounts, setJoinedTopicCounts] = useState({});
    const [createdPage, setCreatedPage] = useState(1);
    const [availablePage, setAvailablePage] = useState(1);
    const [createdMeta, setCreatedMeta] = useState(defaultMeta);
    const [availableMeta, setAvailableMeta] = useState(defaultMeta);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [searchSource, setSearchSource] = useState({ created: 'solr', available: 'solr' });
    const debouncedQuery = useDebouncedValue(searchQuery, 300);

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
                    const refreshedData = {
                        createdProjects: refreshResponse.data.createdProjects,
                        availableProjects: refreshResponse.data.availableProjects,
                    };

                    setProjectData(refreshedData);
                    setSearchData(refreshedData);
                }
            } else {
                alert(response.data.message || 'Failed to send join request');
            }
        } catch (err) {
            console.error('Error joining project:', err);
            alert('An error occurred while sending the join request');
        }
    };

    const mergeSearchWithBase = (items, baseItems) => {
        const baseById = new Map(
            (baseItems || []).map((item) => [String(item._id || item.id), item])
        );

        return (items || []).map((item) => {
            const id = String(item._id || item.id);
            const base = baseById.get(id) || {};

            return {
                ...base,
                ...item,
                _id: id,
                id,
                topic: item.topic || base.topic || 'General',
                member_count: base.member_count ?? item.member_count ?? item.members ?? 0,
                has_pending_request: Boolean(base.has_pending_request || item.has_pending_request),
                request_status: base.request_status || item.request_status || null
            };
        });
    };

    const runProjectSearch = async (baseData = projectData) => {
        if (!user?.id) return;

        try {
            setSearchLoading(true);
            setSearchError(null);

            const topicFilter = selectedTopic !== 'All Topics' ? selectedTopic : null;

            const createdFilters = { ownerId: user.id };
            const availableFilters = { excludeOwnerId: user.id, onlyOpenToJoin: true };

            if (topicFilter) {
                createdFilters.topic = topicFilter;
                availableFilters.topic = topicFilter;
            }

            const createdQuery = new URLSearchParams({
                q: debouncedQuery || '',
                page: String(createdPage),
                rows: '12',
                sort: debouncedQuery ? 'relevance' : 'createdAt_desc',
                filters: JSON.stringify(createdFilters)
            }).toString();

            const availableQuery = new URLSearchParams({
                q: debouncedQuery || '',
                page: String(availablePage),
                rows: '12',
                sort: debouncedQuery ? 'relevance' : 'createdAt_desc',
                filters: JSON.stringify(availableFilters)
            }).toString();

            const [createdResponse, availableResponse] = await Promise.all([
                axios.get(`/api/search/projects?${createdQuery}`),
                axios.get(`/api/search/projects?${availableQuery}`)
            ]);

            const createdPayload = createdResponse.data || {};
            const availablePayload = availableResponse.data || {};

            const createdProjects = mergeSearchWithBase(
                Array.isArray(createdPayload.data) ? createdPayload.data : [],
                baseData.createdProjects
            );

            const availableProjects = mergeSearchWithBase(
                Array.isArray(availablePayload.data) ? availablePayload.data : [],
                baseData.availableProjects
            );

            setSearchData({ createdProjects, availableProjects });
            setCreatedMeta(createdPayload.meta || defaultMeta);
            setAvailableMeta(availablePayload.meta || defaultMeta);
            setSearchSource({
                created: createdPayload.source || 'solr',
                available: availablePayload.source || 'solr'
            });
        } catch (err) {
            console.error('Error searching projects:', err);
            setSearchError('Search failed. Showing latest available data.');
            setSearchData(baseData);
            setCreatedMeta(defaultMeta);
            setAvailableMeta(defaultMeta);
        } finally {
            setSearchLoading(false);
        }
    };

    useEffect(() => {
        // ... (data fetching logic remains the same) ...
        const fetchProjects = async () => {
            try {
                const projectsResponse = await axios.get('/api/project');

                if (projectsResponse.data.success) {
                    const baseData = {
                        createdProjects: projectsResponse.data.createdProjects,
                        availableProjects: projectsResponse.data.availableProjects,
                    };

                    setProjectData(baseData);
                    setSearchData(baseData);
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

    useEffect(() => {
        setCreatedPage(1);
        setAvailablePage(1);
    }, [searchQuery, selectedTopic]);

    useEffect(() => {
        if (loading || !user?.id) return;
        runProjectSearch(projectData);
    }, [loading, user?.id, debouncedQuery, selectedTopic, createdPage, availablePage, projectData]);

    const allTopics = Array.from(
        new Set(
            [...projectData.createdProjects, ...projectData.availableProjects]
                .map(p => p?.topic)
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));

    const recommendedAvailableProjects = searchData.availableProjects
        .filter((p) => (joinedTopicCounts[p.topic] || 0) > 0)
        .sort((a, b) => {
            const diff = (joinedTopicCounts[b.topic] || 0) - (joinedTopicCounts[a.topic] || 0);
            if (diff !== 0) return diff;
            return (a.title || '').localeCompare(b.title || '');
        });

    const otherAvailableProjects = searchData.availableProjects
        .filter((p) => (joinedTopicCounts[p.topic] || 0) === 0)
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const hasRecommendations = recommendedAvailableProjects.length > 0;

    if (loading) {
        return (
            <div style={{ color: 'var(--text-primary)', textAlign: 'center', marginTop: '100px' }}>
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
            <div className="container projects-list-page" style={{ paddingTop: '70px', maxWidth: '1200px', margin: '30px auto', color: 'var(--text-primary)' }}>

                <div className="pl-controls">
                    <label className="pl-topic-filter">
                        <span className="pl-topic-filter-label">Topic</span>
                        <select
                            className="pl-topic-filter-select"
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

                {searchLoading && <p className="pl-empty">Searching projects...</p>}
                {searchError && <p className="pl-empty">{searchError}</p>}
                {!searchError && (searchSource.created === 'fallback' || searchSource.available === 'fallback') && (
                    <p className="pl-empty">Solr unavailable. Showing MongoDB fallback results.</p>
                )}
                
                {/* --- REMOVED: + Create New Project Button/Toggle Logic --- */}
                
                {/* Section for Projects CREATED by the user */}
                <h1 className="pl-title">My Created Projects</h1>
                
                <section className="created-projects" style={{ marginBottom: '40px' }}>
                    {projectData.createdProjects.length > 0 ? (
                        <div className="pl-grid">
                            {searchData.createdProjects.map(project => (
                                    <div key={project._id} className="pl-card">
                                        <h3>{project.title}</h3>
                                        <p>{project.description}</p>
                                        <p>Topic: {project.topic} | Capacity: {project.capacity}</p>
                                        <div className="pl-actions">
                                            <Link to={`/project/${project._id}`} className="pl-btn">View Details</Link>
                                        </div>
                                    </div>
                                ))}
                            {searchData.createdProjects.length === 0 && (
                                <p className="pl-empty">No projects match your search.</p>
                            )}

                            {createdMeta.totalPages > 1 && (
                                <div className="pl-actions" style={{ gridColumn: '1 / -1', justifyContent: 'center' }}>
                                    <button
                                        className="pl-btn pl-btn-outline"
                                        onClick={() => setCreatedPage((prev) => Math.max(1, prev - 1))}
                                        disabled={!createdMeta.hasPrev || searchLoading}
                                    >
                                        Prev
                                    </button>
                                    <span className="pl-empty" style={{ margin: 0 }}>
                                        Page {createdMeta.page} of {createdMeta.totalPages}
                                    </span>
                                    <button
                                        className="pl-btn pl-btn-outline"
                                        onClick={() => setCreatedPage((prev) => prev + 1)}
                                        disabled={!createdMeta.hasNext || searchLoading}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Provides link to the dedicated creation page
                        <p className="pl-empty" style={{ marginTop: '10px' }}>You have not created any projects yet. <Link to="/e">Create a new project</Link> to get started!</p>
                    )}
                </section>
                
                {/* Section for Projects AVAILABLE to join */}
                <h1 className="pl-title">Available Projects</h1>
                
                <section className="available-projects">
                    {projectData.availableProjects.length > 0 ? (
                        <>
                            {recommendedAvailableProjects.length > 0 && (
                                <>
                                    <h2 className="pl-subtitle">Recommended Projects</h2>
                                    <div className="pl-grid" style={{ marginBottom: '20px' }}>
                                        {recommendedAvailableProjects.map(project => (
                                            <div key={project._id} className="pl-card pl-available-card">
                                                <div className="pl-content">
                                                    <div className="pl-header">
                                                        <h2 className="pl-card-title">{project.title}</h2>
                                                    </div>
                                                    <p className="pl-card-desc">{project.description}</p>
                                                    <div className="pl-meta">
                                                        <span className="pl-members">Members: {project.member_count} / {project.capacity}</span>
                                                        <span className="pl-topic">Topic: {project.topic}</span>
                                                    </div>
                                                    <div className="pl-actions">
                                                        <Link to={`/project/${project._id}`} className="pl-btn pl-btn-outline">View Details</Link>
                                                        <button
                                                            disabled={project.has_pending_request || project.request_status === 'pending'}
                                                            className="pl-btn pl-btn-ghost"
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

                            <h2 className="pl-subtitle">{hasRecommendations ? 'Other Available Projects' : 'All Available Projects'}</h2>
                            {otherAvailableProjects.length > 0 ? (
                                <div className="pl-grid">
                                    {otherAvailableProjects.map(project => (
                                        <div key={project._id} className="pl-card pl-available-card">
                                            <div className="pl-content">
                                                <div className="pl-header">
                                                    <h2 className="pl-card-title">{project.title}</h2>
                                                </div>
                                                <p className="pl-card-desc">{project.description}</p>
                                                <div className="pl-meta">
                                                    <span className="pl-members">Members: {project.member_count} / {project.capacity}</span>
                                                    <span className="pl-topic">Topic: {project.topic}</span>
                                                </div>
                                                <div className="pl-actions">
                                                    <Link to={`/project/${project._id}`} className="pl-btn pl-btn-outline">View Details</Link>
                                                    <button
                                                        disabled={project.has_pending_request || project.request_status === 'pending'}
                                                        className="pl-btn pl-btn-ghost"
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
                                    <p className="pl-empty">No projects match your search.</p>
                                )
                            )}

                            {availableMeta.totalPages > 1 && (
                                <div className="pl-actions" style={{ justifyContent: 'center', marginTop: '12px' }}>
                                    <button
                                        className="pl-btn pl-btn-outline"
                                        onClick={() => setAvailablePage((prev) => Math.max(1, prev - 1))}
                                        disabled={!availableMeta.hasPrev || searchLoading}
                                    >
                                        Prev
                                    </button>
                                    <span className="pl-empty" style={{ margin: 0 }}>
                                        Page {availableMeta.page} of {availableMeta.totalPages}
                                    </span>
                                    <button
                                        className="pl-btn pl-btn-outline"
                                        onClick={() => setAvailablePage((prev) => prev + 1)}
                                        disabled={!availableMeta.hasNext || searchLoading}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="pl-empty">No available projects to join.</p>
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