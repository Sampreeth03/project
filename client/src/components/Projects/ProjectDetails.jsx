// client/src/components/Projects/ProjectDetails.jsx (FINAL CODE WITH FULL MODAL CONTENT)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import useProjectActions from '../../hooks/useProjectActions'; 
import Navbar from '../User/Navbar.jsx'; 
import '../../styles/ProjectStyles.css'; 

// Helper component for rendering a single task card
const TaskCard = ({ task, projectId, isCreator, handleExtendDeadline, openReviewModal, currentUserId }) => {
    const getStatusClass = (status) => status?.toLowerCase().replace(' ', '-') || 'assigned';
    
    const isAssignedToUser = task.assigned_to?._id === currentUserId;
    const needsReview = task.status === 'Review' && isCreator;
    const canSubmitLink = (task.status === 'Assigned' || task.status === 'In Progress') && isAssignedToUser;

    const [githubLink, setGithubLink] = useState(task.github_link || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmitLink = async () => {
        if (!githubLink) return alert("GitHub link is required.");
        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/task/submit-github-link', {
                taskId: task._id, githubLink, projectId
            });
            if (response.data.success) {
                alert('Link submitted for review!');
                window.location.reload(); 
            } else {
                alert(response.data.message || 'Failed to submit link.');
            }
        } catch (err) {
            alert('Error submitting link.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div key={task._id} className="task-card" id={`task-${task._id}`}>
            <div className="task-header">
                <h3 className="task-title">{task.title}</h3>
                <span className={`status-label ${getStatusClass(task.status)}`}>{task.status}</span>
            </div>
            <div className="task-meta">
                <div>Assigned to: {task.assigned_to?.name || 'Unassigned'}</div>
                <div>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</div>
            </div>
            <p className="task-description">{task.description || 'No description'}</p>
            
            {task.github_link && <a href={task.github_link} className="task-link" target="_blank" rel="noopener noreferrer">{task.github_link}</a>}
            {task.feedback && <p className="task-feedback"><strong>Feedback:</strong> {task.feedback}</p>}

            <div className="task-actions">
                <button className="task-btn check-status-btn" onClick={() => alert(`Status check for ${task.title}`)}>Check Status</button>
                
                {isCreator && task.status !== 'Completed' && (
                    <button className="task-btn extend-deadline-btn" onClick={() => handleExtendDeadline(task.title)}>Extend Deadline</button>
                )}
                
                {needsReview && (
                    <>
                        <button className="task-btn view-review-btn accept-btn" onClick={() => openReviewModal(task._id, 'accept')}>Accept</button>
                        <button className="task-btn view-review-btn reject-btn" onClick={() => openReviewModal(task._id, 'reject')}>Reject</button>
                    </>
                )}
                
                {canSubmitLink && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
                        <input 
                            type="url" 
                            placeholder="GitHub Link" 
                            value={githubLink}
                            onChange={(e) => setGithubLink(e.target.value)}
                            style={{ padding: '5px', width: '200px', background: '#333', border: '1px solid #444' }}
                        />
                        <button className="btn btn-white" onClick={handleSubmitLink} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Link'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const ProjectDetails = () => {
    const { id: projectId } = useParams();
    const { user } = useAuth();
    const currentUserId = user?.id;
    
    const { handleCreateTask, confirmFinishProject, handleExtendDeadline, handleReviewSubmission, handleRemoveMember } = useProjectActions(projectId);
    
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal Management States
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewAction, setReviewAction] = useState({ taskId: null, action: null });
    const [pendingTasksCount, setPendingTasksCount] = useState(0);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await axios.get(`/api/project/${projectId}`);
                if (response.data.success) {
                    setProjectData(response.data);
                    
                    const pendingCheck = await axios.get(`/api/project/${projectId}/pending-tasks`);
                    setPendingTasksCount(pendingCheck.data.pendingTasks || 0);
                    
                } else {
                    setError(response.data.error || "Project not found.");
                }
            } catch (err) {
                setError("Network error: Failed to fetch project details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [projectId, user]);

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}><Navbar />Loading project details...</div>;
    if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: '100px' }}><Navbar />Error: {error}</div>;

    const project = projectData.project;
    // CRITICAL FIX: Convert Mongoose ObjectId to string for reliable comparison
    const isCreator = currentUserId === String(project.user_id); 

    // --- Handlers ---
    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newTask = await handleCreateTask({
            title: formData.get('taskTitle'),
            description: formData.get('taskDescription'),
            assignedTo: formData.get('assignTo'),
            dueDate: formData.get('dueDate')
        });

        if (newTask) {
            setIsTaskModalOpen(false);
            window.location.reload(); 
        }
    };
    
    const openReviewModal = (taskId, action) => {
        setReviewAction({ taskId, action });
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        const feedback = e.target.reviewFeedback.value;
        await handleReviewSubmission(reviewAction.taskId, reviewAction.action, feedback);
        setIsReviewModalOpen(false);
    };
    
    const getStatusClass = (status) => status?.toLowerCase().replace(' ', '-') || 'assigned';

    return (
        <>
            <Navbar />
            <div className="container" style={{ paddingTop: '70px', maxWidth: '1200px', margin: '30px auto' }}>
                
                {/* --- Project Header and Actions --- */}
                <div className="project-header">
                    <div>
                        <h1 className="project-title">{project.title}</h1>
                        <span className={`project-status project-${getStatusClass(project.status)}`} id="projectStatus">
                            {project.status === 'active' ? 'Active' : 'Completed'}
                        </span>
                    </div>
                    
                    <div className="project-actions">
                        
                        {/* Switch Project Dropdown (Placeholder) */}
                        <div className="project-nav">
                            {/* ... (Dropdown structure here) ... */}
                        </div>

                        {/* Finish Project Button (Restored) */}
                        {isCreator && project.status !== 'completed' && (
                            <button className="finish-project-btn" onClick={() => setIsFinishModalOpen(true)}>
                                Finish Project
                            </button>
                        )}
                        
                        {/* Join Button (Simplified) */}
                        {!isCreator && (
                            <button className="join-btn" 
                                disabled={project.hasJoined || project.hasPendingRequest || project.memberCount >= project.capacity}
                                // onClick={() => handleJoinProject()} 
                            >
                                {project.hasJoined ? 'Joined' : project.hasPendingRequest ? 'Request Pending' : 'Request to Join Project'}
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Tasks Container --- */}
                <div className="tasks-container">
                    <div className="tasks-header">
                        <h2>Tasks</h2>
                        {/* New Task Button (Restored) */}
                        {isCreator && (
                            <button className="new-task-btn" onClick={() => setIsTaskModalOpen(true)}>+ New Task</button>
                        )}
                    </div>
                    <div id="tasks-list">
                        {projectData.tasks?.length > 0 ? (
                            projectData.tasks.map(task => (
                                <TaskCard 
                                    key={task._id} 
                                    task={task} 
                                    projectId={projectId} 
                                    isCreator={isCreator} 
                                    handleExtendDeadline={handleExtendDeadline}
                                    openReviewModal={openReviewModal}
                                    currentUserId={currentUserId}
                                />
                            ))
                        ) : (
                             <div className="no-projects">No tasks available for this project.</div>
                        )}
                    </div>
                </div>

                {/* --- Team Members List --- */}
                <div className="team-members">
                    {projectData.projectMembers?.length > 0 ? (
                        projectData.projectMembers.map(member => (
                            <div key={member.user_id._id} className="member">
                                <div className="member-avatar">{member.user_id.name?.charAt(0).toUpperCase() || '?'}</div>
                                <div className="member-info">
                                    <div className="member-name">{member.user_id.name || 'Unknown'}</div>
                                    <div className="member-role">{member.user_id.email}</div>
                                </div>
                                {isCreator && currentUserId !== member.user_id._id && (
                                    <button 
                                        className="remove-member-btn" 
                                        onClick={() => handleRemoveMember(member.user_id._id, member.user_id.name)}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (<p>No members in this project.</p>)}
                </div>
            </div>
            
            {/* --- MODALS (Replaced EJS Modals) --- */}
            
            {/* Task Creation Modal */}
            <div id="taskModal" className={`modal ${isTaskModalOpen ? 'open' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Create New Task</h2>
                        <span className="close" onClick={() => setIsTaskModalOpen(false)}>×</span>
                    </div>
                    {/* FORM CONTENT RESTORED HERE */}
                    <form onSubmit={handleTaskSubmit}>
                        <div className="form-group"><label htmlFor="taskTitle">Title</label><input type="text" id="taskTitle" name="taskTitle" required /></div>
                        <div className="form-group"><label htmlFor="taskDescription">Description</label><textarea id="taskDescription" name="taskDescription"></textarea></div>
                        <div className="form-group">
                            <label htmlFor="assignTo">Assign To</label>
                            <select id="assignTo" name="assignTo">
                                <option value="">Unassigned</option>
                                {projectData?.projectMembers?.map(member => (
                                    <option key={member.user_id._id} value={member.user_id._id}>
                                        {member.user_id.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group"><label htmlFor="dueDate">Due Date</label><input type="date" id="dueDate" name="dueDate" required /></div>
                        <button type="submit" className="new-task-btn" style={{ width: '100%' }}>Create Task</button>
                    </form>
                </div>
            </div>

            {/* Finish Project Modal */}
            <div id="finishProjectModal" className={`modal ${isFinishModalOpen ? 'open' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header"><h2>Finish Project</h2><span className="close" onClick={() => setIsFinishModalOpen(false)}>×</span></div>
                    <p>Are you sure you want to mark this project as completed?</p>
                    {pendingTasksCount > 0 && (
                        <div id="pendingTasksWarning" style={{ color: '#FFC107', marginTop: '12px' }}>
                            <strong>Warning:</strong> There are still {pendingTasksCount} pending tasks. Finishing will mark all tasks as completed.
                        </div>
                    )}
                    <div className="modal-buttons">
                        <button className="cancel-btn" onClick={() => setIsFinishModalOpen(false)}>Cancel</button>
                        <button className="confirm-btn" onClick={() => { setIsFinishModalOpen(false); confirmFinishProject(); }}>Confirm</button>
                    </div>
                </div>
            </div>
            
            {/* Review Submission Modal (Accept/Reject) */}
            <div id="reviewModal" className={`modal ${isReviewModalOpen ? 'open' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 id="reviewModalTitle">{reviewAction.action === 'accept' ? 'Accept Submission' : 'Reject Submission'}</h2>
                        <span className="close" onClick={() => setIsReviewModalOpen(false)}>×</span>
                    </div>
                    <form onSubmit={handleReviewSubmit}>
                        <div className="form-group">
                            <label htmlFor="reviewFeedback">Feedback/Rejection Reason</label>
                            <textarea id="reviewFeedback" name="reviewFeedback" placeholder={reviewAction.action === 'reject' ? 'Explain why you are rejecting this task...' : 'Add any feedback before approving this task...'} required></textarea>
                        </div>
                        <div className="modal-buttons">
                            <button type="button" className="cancel-btn" onClick={() => setIsReviewModalOpen(false)}>Cancel</button>
                            <button type="submit" className="confirm-btn">Confirm</button>
                        </div>
                    </form>
                </div>
            </div>

        </>
    );
};

export default ProjectDetails;