// client/src/components/Projects/CreateProject.jsx (FINAL CODE WITH LIST RENDERING FIX)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useCreateProjectValidation } from '../../hooks/useCreateProjectValidation';
import Navbar from '../User/Navbar.jsx'; 
import '../../styles/CreateProjectStyles.css'; // Contains all dedicated form styles
import '../../styles/ProjectStyles.css'; // Contains the Project Card and Grid styles

const initialProjectData = {
    title: '', description: '', topic: '', capacity: 3, deadline: '', paid: false
};

const CreateProject = () => {
    // --- STATE HOOKS ---
    const [isFormVisible, setIsFormVisible] = useState(false); // Hidden by default, toggled by button
    const [existingProjects, setExistingProjects] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
        // --- Delete Project Handler ---
        const handleDeleteProject = async (projectId) => {
            if (!window.confirm('Are you sure you want to delete this project?')) return;
            setDeletingId(projectId);
            try {
                const response = await fetch('/api/delete-project', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId })
                });
                const data = await response.json();
                if (data.success) {
                    setExistingProjects(projects => projects.filter(p => p.id !== projectId));
                    setServerMessage({ type: 'success', text: 'Project deleted successfully.' });
                } else {
                    setServerMessage({ type: 'error', text: data.error || 'Failed to delete project.' });
                }
            } catch (err) {
                setServerMessage({ type: 'error', text: 'Network error or server failure.' });
            } finally {
                setDeletingId(null);
            }
        };
    const [serverMessage, setServerMessage] = useState({ type: null, text: '' });
    const [isSaving, setIsSaving] = useState(false);
    
    const { formData, validation, isFormValid, updateField, setFormDataDirectly, normalizedString } = useCreateProjectValidation(initialProjectData);
    
    // --- Data Fetching ---
    useEffect(() => {
        const fetchCreatedProjects = async () => {
            try {
                const response = await axios.get('/api/e'); 
                setExistingProjects(response.data.projects || []); 
            } catch (err) {
                setServerMessage({ type: 'error', text: 'Failed to load existing projects.' });
            }
        };
        
        const loadFormDraft = () => {
            const saved = localStorage.getItem('projectFormDraft');
            if (saved) {
                const data = JSON.parse(saved);
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    setFormDataDirectly(data); 
                }
            }
        };

        fetchCreatedProjects();
        loadFormDraft(); 
    }, []);
    
    // --- Auto-Save Logic (Retained) ---
    const saveFormDraft = () => {
        localStorage.setItem('projectFormDraft', JSON.stringify({ ...formData, timestamp: Date.now() }));
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 2000);
    };
    
    useEffect(() => {
        const autoSaveTimeout = setTimeout(saveFormDraft, 1000);
        return () => clearTimeout(autoSaveTimeout);
    }, [formData]);

    // --- Capacity Control (Retained) ---
    const adjustCapacity = (delta) => {
        const newVal = Math.min(20, Math.max(3, formData.capacity + delta));
        updateField('capacity', newVal);
    };

    // --- Submission Handler (Retained) ---
    const handleSubmit = async (e, paidOverride = false) => {
        e.preventDefault();
        setServerMessage({ type: null, text: '' });

        if (!isFormValid) {
            setServerMessage({ type: 'error', text: 'Please complete all required fields correctly.' });
            return;
        }

        const dataToSend = { ...formData, paid: paidOverride };

        try {
            const response = await axios.post('/api/create-project', dataToSend);
            const result = response.data;

            if (result.requirePayment && !paidOverride) {
                const confirmPay = window.confirm('You have reached the free project limit. Pay ₹500 to create more projects? Click OK to pay.');
                if (confirmPay) { await handleSubmit(e, true); }
                return;
            } 
            
            if (result.success) {
                setServerMessage({ type: 'success', text: 'Project created successfully!' });
                localStorage.removeItem('projectFormDraft');
                window.location.reload(); 
            } else {
                setServerMessage({ type: 'error', text: result.message || 'Error creating project.' });
            }
        } catch (error) {
            setServerMessage({ type: 'error', text: 'Network error or server failure.' });
        }
    };
    
    // --- Render Helpers ---
    const getCharFeedback = (value, max, min) => {
        const length = normalizedString(value).length;
        if (length === 0) return { count: `0/${max}`, class: '' };
        if (length < min || length > max * 0.8) return { count: `${length}/${max}`, class: 'danger' };
        if (length > max * 0.5) return { count: `${length}/${max}`, class: 'warning' };
        return { count: `${length}/${max}`, class: 'good' };
    };
    
    const titleFeedback = getCharFeedback(formData.title, 100, 3);
    const descFeedback = getCharFeedback(formData.description, 500, 10);
    
    return (
        <>
            <Navbar />
            <div className="container main-content" style={{ paddingTop: '70px', maxWidth: '1200px', margin: '30px auto' }}>
                
                {serverMessage.text && (
                    <div className={serverMessage.type === 'error' ? 'error-message' : 'success-message'} style={{ color: serverMessage.type === 'error' ? 'var(--red)' : 'var(--success-color)' }}>
                        {serverMessage.text}
                    </div>
                )}
                <div className="create-project-section">
                    
                    {/* BUTTON TO TOGGLE FORM (FIXED) */}
                    <button id="new-project-btn" className="new-project-btn" onClick={() => setIsFormVisible(prev => !prev)}>
                        {isFormVisible ? 'Hide Creation Form' : '+ New Project'}
                    </button>

                    {/* Form Container (Toggles visibility using JS logic) */}
                    <div className={`project-form ${isFormVisible ? 'active' : ''}`} id="project-form" style={{ display: isFormVisible ? 'block' : 'none' }}> 
                        <h2>Create New Project</h2>
                        <form id="new-project-form" onSubmit={handleSubmit}>
                            {/* --- Form Fields (Skipped for brevity) --- */}
                            <div className="form-group" style={{ position: 'relative' }}><label htmlFor="project-title">Project Title</label><input type="text" id="project-title" name="title" required maxLength="100" value={formData.title} onChange={(e) => updateField('title', e.target.value)} className={validation.title ? 'invalid' : ''}/><span className={`field-valid-icon ${!validation.title && formData.title ? 'show' : ''}`} id="title-valid">✓</span><div className={`char-counter ${titleFeedback.class}`} id="title-counter">{titleFeedback.count}</div><div className="field-error" id="title-error">{validation.title}</div></div>
                            <div className="form-group" style={{ position: 'relative' }}><label htmlFor="project-description">Project Description</label><textarea id="project-description" name="description" rows="3" required maxLength="500" value={formData.description} onChange={(e) => updateField('description', e.target.value)} className={validation.description ? 'invalid' : ''}></textarea><span className={`field-valid-icon ${!validation.description && formData.description ? 'show' : ''}`} id="description-valid" style={{ top: '30px' }}>✓</span><div className={`char-counter ${descFeedback.class}`} id="description-counter">{descFeedback.count}</div><div className="field-error" id="description-error">{validation.description}</div></div>
                            <div className="form-group"><label htmlFor="project-topic">Project Topic</label><select id="project-topic" name="topic" required value={formData.topic} onChange={(e) => updateField('topic', e.target.value)} className={validation.topic ? 'invalid' : ''}><option value="" disabled>Select a topic</option><option value="blockchain">Blockchain</option><option value="cyber-security">Cyber Security</option><option value="robotics">Robotics</option><option value="web-dev">Web Development</option><option value="deep learning">Deep Learning</option><option value="data science">Data Science</option></select><div className="field-error" id="topic-error">{validation.topic}</div></div>
                            <div className="form-group"><label htmlFor="project-capacity">Number of Members</label><div className="capacity-control"><button type="button" className="capacity-btn" onClick={() => adjustCapacity(-1)} disabled={formData.capacity <= 3}>−</button><input type="number" id="project-capacity" name="capacity" min="3" max="20" required value={formData.capacity} readOnly className={validation.capacity ? 'invalid' : ''} style={{ width: '100px', textAlign: 'center' }}/><button type="button" className="capacity-btn" onClick={() => adjustCapacity(1)} disabled={formData.capacity >= 20}>+</button></div><div className="field-error" id="capacity-error">{validation.capacity}</div></div>
                            <div className="form-group"><label htmlFor="project-deadline">Deadline</label><input type="date" id="project-deadline" name="deadline" required value={formData.deadline} onChange={(e) => updateField('deadline', e.target.value)} className={validation.deadline ? 'invalid' : ''}/><div className="field-error" id="deadline-error">{validation.deadline}</div></div>
                            <button type="submit" id="create-project-btn" disabled={!isFormValid}>Create Project</button>
                        </form>
                    </div>
                </div>

                <div className={`auto-save-indicator ${isSaving ? 'show' : ''}`} id="auto-save-indicator">
                    Draft saved
                </div>
            
                {/* --- Existing Projects Section (LIST RENDERING RESTORED) --- */}
                <div className="projects-section">
                    <h2>Your Projects</h2>
                    <div className="projects-container" id="projects-container">
                        {existingProjects.length === 0 ? (
                            <div className="no-projects">No projects available. Create a new project to get started!</div>
                        ) : (
                            // FINAL FIX: This loop renders the projects with the correct structure and grid styling
                            existingProjects.map(project => (
                                <div key={project.id} className="project-card" data-id={project.id}>
                                    <div className="project-content">
                                        <div className="project-header">
                                            <h3 className="project-title">{project.title}</h3>
                                            <button
                                                className="delete-btn"
                                                title="Delete Project"
                                                onClick={() => handleDeleteProject(project.id)}
                                                disabled={deletingId === project.id}
                                                style={deletingId === project.id ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <p className="project-description">{project.description}</p>
                                        <div className="project-meta"><span>Posted by: YOU</span><span>Capacity: {project.memberCount}/{project.capacity}</span></div>
                                        <div className="project-meta"><span>Deadline: {project.deadline}</span><span>Topic: {project.topic}</span></div>
                                    </div>
                                    <Link to={`/project/${project.id}`} className="view-btn" style={{ textDecoration: 'none' }}>View Project</Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CreateProject;