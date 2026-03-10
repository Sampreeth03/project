// client/src/hooks/useProjectActions.js

import axios from 'axios';
import { useState } from 'react';

// Utility function (replaces showNotification)
const useNotification = () => {
    // In a real app, you would manage a global toast state here
    const showNotification = (message, type = 'success') => {
        console.log(`[Notification | ${type.toUpperCase()}]: ${message}`);
        alert(message); // Using simple alert for now
    };
    return showNotification;
};

const useProjectActions = (projectId) => {
    const showNotification = useNotification();
    const [isFinishing, setIsFinishing] = useState(false);

    // 1. Task Management
    const handleCreateTask = async (taskData) => {
        if (!taskData.title || !taskData.dueDate) {
            showNotification("Task title and due date are required", 'error');
            return false;
        }

        try {
            const response = await axios.post('/api/task/create', { ...taskData, projectId });
            if (response.data.success) {
                showNotification('New task created successfully!');
                return response.data.task; // Return the new task object
            } else {
                showNotification(response.data.message || 'Failed to create task', 'error');
                return false;
            }
        } catch (err) {
            showNotification('Error creating task: Network failure', 'error');
            return false;
        }
    };

    // 2. Project Completion (Replaces finishProject, confirmFinishProject, and pendingTasks check)
    const handleFinishProject = async () => {
        setIsFinishing(true);
        try {
            const finishResponse = await axios.post(`/api/project/${projectId}/finish`);

            if (finishResponse.data.success) {
                showNotification('Project marked as finished successfully!');
                setTimeout(() => window.location.reload(), 1000); // Reload page after success
                return true;
            } else {
                showNotification(finishResponse.data.message || 'Failed to finish project.', 'error');
                return false;
            }

        } catch (err) {
            const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
            showNotification(backendMessage || 'Error finishing project: Network error', 'error');
            return false;
        } finally {
            setIsFinishing(false);
        }
    };

    // 3. Task Deadline Extension (Replaces extendDeadline function)
    const handleExtendDeadline = async (taskTitle) => {
        const newDueDate = prompt('Enter new due date (YYYY-MM-DD):');
        if (!newDueDate) return;

        try {
            const response = await axios.post('/api/task/extend-deadline', { taskTitle, projectId, newDueDate });
            if (response.data.success) {
                showNotification(`Deadline for "${taskTitle}" extended to ${newDueDate}`);
                setTimeout(() => window.location.reload(), 500);
            } else {
                showNotification(response.data.message || 'Failed to extend deadline', 'error');
            }
        } catch (err) {
            showNotification('Error extending deadline: Network error', 'error');
        }
    };
    
    // 4. Review Submission (Replaces reviewSubmission and related functions)
    const handleReviewSubmission = async (taskId, action, feedback) => {
        try {
            const response = await axios.post('/api/task/review-submission', { taskId, projectId, action, feedback });

            if (response.data.success) {
                showNotification(`Task ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`);
                setTimeout(() => window.location.reload(), 500); // Reload page to update status
            } else {
                showNotification(response.data.message || 'Failed to process review', 'error');
            }
        } catch (err) {
            showNotification('Error reviewing submission: Network error', 'error');
        }
    };
    
    // 5. Remove Member
    const handleRemoveMember = async (userId, userName) => {
        const confirmed = window.confirm(`Are you sure you want to remove ${userName} from this project?`);
        if (!confirmed) return;

        try {
            const response = await axios.post('/api/project/remove-member', { projectId, userId });
            if (response.data.success) {
                showNotification(`${userName} has been removed from the project`);
                setTimeout(() => window.location.reload(), 500);
            } else {
                showNotification(response.data.message || 'Failed to remove member', 'error');
            }
        } catch (err) {
            showNotification('Error removing member: Network error', 'error');
        }
    };

    return {
        handleCreateTask,
        confirmFinishProject: handleFinishProject, // Alias for compatibility
        handleExtendDeadline,
        handleReviewSubmission,
        handleRemoveMember,
        isFinishing
    };
};

export default useProjectActions;