// client/src/components/Projects/CreateProject.jsx (FINAL CODE WITH LIST RENDERING FIX)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useCreateProjectValidation } from '../../hooks/useCreateProjectValidation';
import Navbar from '../User/NavBar.jsx'; 

import '../../styles/CreateProjectStyles.css'; // Contains all dedicated form styles
import ProjectForm from './ProjectForm';
import StripePaymentModal from './StripePaymentModal';

const initialProjectData = {
    title: '', description: '', topic: '', capacity: 3, deadline: '', paid: false
};

const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateInput(tomorrow);
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
    const [paymentModal, setPaymentModal] = useState(null); // { clientSecret, paymentIntentId, publishableKey, paymentType, amount, title }
    const [extensionPicker, setExtensionPicker] = useState({
        isOpen: false,
        project: null,
        newDeadline: '',
    });
    
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

    // For ProjectForm: wrap updateField for capacity to use adjustCapacity logic
    const updateFieldWithCapacity = (field, value) => {
        if (field === 'capacity') {
            adjustCapacity(value - formData.capacity);
        } else {
            updateField(field, value);
        }
    };

    // ── Stripe checkout helper ────────────────────────────────────────────────
    const openStripeCheckout = async (paymentPayload, paymentMeta = {}) => {
        setServerMessage({ type: null, text: '' });
        try {
            const res = await axios.post('/api/payment/create-order', paymentPayload, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (!res.data.success) {
                setServerMessage({ type: 'error', text: res.data.error || 'Could not create payment.' });
                return;
            }
            setPaymentModal({
                clientSecret:    res.data.clientSecret,
                paymentIntentId: res.data.paymentIntentId,
                publishableKey:  res.data.publishableKey,
                mockMode: !!res.data.mockMode,
                paymentType: paymentMeta.paymentType || res.data.paymentType,
                amount: paymentMeta.amount || (res.data.amount ? Math.round(Number(res.data.amount) / 100) : 99),
                title: paymentMeta.title || 'Complete Payment',
            });
        } catch (err) {
            console.error('Payment creation error:', err);
            const errorMsg = err?.response?.data?.error || 
                           err?.message || 
                           'Network error while creating payment. Make sure backend is running on localhost:5000';
            setServerMessage({ type: 'error', text: errorMsg });
        }
    };

    const openExtendDeadlinePicker = (project) => {
        setExtensionPicker({
            isOpen: true,
            project,
            newDeadline: getTomorrowDateString(),
        });
    };

    const closeExtendDeadlinePicker = () => {
        setExtensionPicker({
            isOpen: false,
            project: null,
            newDeadline: '',
        });
    };

    const confirmExtendProjectDeadline = async () => {
        if (!extensionPicker.project) return;

        const { project, newDeadline } = extensionPicker;
        const parsed = new Date(`${newDeadline}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!newDeadline || Number.isNaN(parsed.getTime()) || parsed.getTime() <= today.getTime()) {
            setServerMessage({ type: 'error', text: 'Please select a future deadline date.' });
            return;
        }

        closeExtendDeadlinePicker();

        await openStripeCheckout(
            {
                paymentType: 'project_extension',
                projectId: project.id,
                newDeadline,
            },
            {
                paymentType: 'project_extension',
                amount: 49,
                title: 'Pay Rs 49 to Extend Deadline',
            }
        );
    };

    // ── Primary submit handler ─────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerMessage({ type: null, text: '' });

        if (!isFormValid) {
            setServerMessage({ type: 'error', text: 'Please complete all required fields correctly.' });
            return;
        }

        try {
            const response = await axios.post('/api/create-project', formData);
            const result   = response.data;

            if (result.requirePayment) {
                // 7th+ lifetime project requires payment
                await openStripeCheckout(formData, {
                    paymentType: 'project_creation',
                    amount: 99,
                    title: 'Pay Rs 99 to Create Project',
                });
                return;
            }

            if (result.success) {
                setServerMessage({ type: 'success', text: 'Project created successfully!' });
                localStorage.removeItem('projectFormDraft');
                window.location.reload();
            } else {
                setServerMessage({ type: 'error', text: result.message || 'Error creating project.' });
            }
        } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Network error or server failure.';
            setServerMessage({ type: 'error', text: msg });
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
            <div className="container main-content create-project-page" style={{ paddingTop: '70px', maxWidth: '1200px', margin: '30px auto' }}>
                
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
                    {isFormVisible && (
                        <ProjectForm
                            formData={formData}
                            validation={validation}
                            isFormValid={isFormValid}
                            updateField={updateFieldWithCapacity}
                            handleSubmit={handleSubmit}
                            titleFeedback={titleFeedback}
                            descFeedback={descFeedback}
                            isSaving={isSaving}
                        />
                    )}
                </div>

                <div className={`auto-save-indicator ${isSaving ? 'show' : ''}`} id="auto-save-indicator">
                    Draft saved
                </div>
            
                {/* --- Existing Projects Section (LIST RENDERING RESTORED) --- */}
                <div className="create-projects-section">
                    <h2 className="create-projects-title">Your Projects</h2>
                    <div className="create-projects-grid" id="projects-container">
                        {existingProjects.length === 0 ? (
                            <div className="create-no-projects">No projects available. Create a new project to get started!</div>
                        ) : (
                            // FINAL FIX: This loop renders the projects with the correct structure and grid styling
                            existingProjects.map(project => (
                                <div key={project.id} className="create-project-card" data-id={project.id}>
                                    <div className="create-project-header">
                                        <h3 className="create-project-title">{project.title}</h3>
                                        <button
                                            className="create-delete-btn"
                                            title="Delete Project"
                                            onClick={() => handleDeleteProject(project.id)}
                                            disabled={deletingId === project.id}
                                            style={deletingId === project.id ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <p className="create-project-description">{project.description || <span style={{color:'#555', fontStyle:'italic'}}>No description provided.</span>}</p>
                                    <div className="create-project-meta"><span>Posted by: YOU</span><span>Capacity: {project.memberCount}/{project.capacity}</span></div>
                                    <div className="create-project-meta"><span>Deadline: {project.deadline}</span><span>Topic: {project.topic}</span></div>
                                    <div className="create-project-footer">
                                        <Link
                                            to={`/project/${project.id}`}
                                            className="create-view-btn"
                                            title="View Details"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            View Details
                                        </Link>
                                        {project.isExpiredByDeadline && project.status !== 'completed' && (
                                            <button
                                                className="create-view-btn"
                                                type="button"
                                                onClick={() => openExtendDeadlinePicker(project)}
                                                style={{ marginLeft: '8px' }}
                                            >
                                                Extend (Rs 49)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Extend deadline calendar modal */}
            {extensionPicker.isOpen && (
                <div className="create-extension-overlay" onClick={closeExtendDeadlinePicker}>
                    <div className="create-extension-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="create-extension-title">Choose New Deadline</h3>
                        <p className="create-extension-subtitle">
                            Select a future date to continue to payment and extend this project.
                        </p>
                        <div className="form-group create-extension-form-group">
                            <label htmlFor="extension-deadline">New Deadline</label>
                            <input
                                id="extension-deadline"
                                type="date"
                                min={getTomorrowDateString()}
                                value={extensionPicker.newDeadline}
                                onChange={(e) => setExtensionPicker((prev) => ({ ...prev, newDeadline: e.target.value }))}
                            />
                        </div>
                        <div className="create-extension-actions">
                            <button type="button" className="create-extension-cancel" onClick={closeExtendDeadlinePicker}>
                                Cancel
                            </button>
                            <button type="button" className="create-extension-pay" onClick={confirmExtendProjectDeadline}>
                                Continue to Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stripe Payment Modal */}
            {paymentModal && (
                <StripePaymentModal
                    paymentIntentId={paymentModal.paymentIntentId}
                    clientSecret={paymentModal.clientSecret}
                    publishableKey={paymentModal.publishableKey}
                    mockMode={paymentModal.mockMode}
                    paymentType={paymentModal.paymentType}
                    amount={paymentModal.amount}
                    title={paymentModal.title}
                    onSuccess={(result) => {
                        setPaymentModal(null);
                        const successText =
                            result?.purpose === 'project_extension'
                                ? 'Payment successful! Project deadline extended.'
                                : 'Payment successful! Project created.';
                        setServerMessage({ type: 'success', text: successText });
                        localStorage.removeItem('projectFormDraft');
                        setTimeout(() => window.location.reload(), 1500);
                    }}
                    onError={(msg) => {
                        setPaymentModal(null);
                        setServerMessage({ type: 'error', text: msg });
                    }}
                    onClose={() => setPaymentModal(null)}
                />
            )}
        </>
    );
};

export default CreateProject;