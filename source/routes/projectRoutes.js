
// routes/projectRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { topics } = require('../config/constants');
const { projectCreationLimiter } = require('../middleware/securityMiddleware');
const { validateProjectCreation } = require('../middleware/validationMiddleware');

const jsonParser = express.json();

// --- Core Project Views ---
router.get('/project', isAuthenticatedAPI, projectController.getAllProjects);
router.get('/joined-projects', isAuthenticatedAPI, projectController.getJoinedProjects);
router.get('/project/:id', isAuthenticatedAPI, projectController.getProjectDetails);
router.get('/e', isAuthenticatedAPI, projectController.getCreateProjectView); 

// --- Project CRUD & Membership APIs (Paths are correct) ---
router.post('/create-project', isAuthenticatedAPI, projectCreationLimiter, jsonParser, validateProjectCreation, projectController.createProject);
router.post('/delete-project', isAuthenticatedAPI, jsonParser, projectController.deleteProject);
// ... (rest of CRUD routes remain the same) ...
router.post('/join-project', isAuthenticatedAPI, jsonParser, projectController.joinProject);
router.post('/approve-join-request', isAuthenticatedAPI, jsonParser, projectController.approveJoinRequest);
router.post('/reject-join-request', isAuthenticatedAPI, jsonParser, projectController.rejectJoinRequest);
router.post('/delete-join-request', isAuthenticatedAPI, jsonParser, projectController.deleteJoinRequest);

// --- Join Request Chat APIs ---
router.get('/join-request-messages/:requestId', isAuthenticatedAPI, projectController.getJoinRequestMessages);
router.post('/send-join-request-message', isAuthenticatedAPI, jsonParser, projectController.sendJoinRequestMessage);
router.post('/upload-join-request-file', isAuthenticatedAPI, projectController.uploadJoinRequestFile);

// --- Project Invite (owner invites friend) ---
router.post('/project/invite-friend', isAuthenticatedAPI, jsonParser, projectController.inviteFriendToProject);
router.get('/project/invites', isAuthenticatedAPI, projectController.getProjectInvites);
router.post('/project/invite/respond', isAuthenticatedAPI, jsonParser, projectController.respondProjectInvite);

// --- Project Completion / Status (Paths are correct) ---
router.post('/project/:id/finish', isAuthenticatedAPI, jsonParser, projectController.finishProject);
router.get('/project/:id/pending-tasks', isAuthenticatedAPI, projectController.getPendingTasks);
router.post('/project/remove-member', isAuthenticatedAPI, jsonParser, projectController.removeProjectMember);

// --- Task Management APIs (Paths are correct) ---
router.post('/task/create', isAuthenticatedAPI, jsonParser, projectController.createTask);
router.post('/task/extend-deadline', isAuthenticatedAPI, jsonParser, projectController.extendDeadline);
router.post('/task/submit-github-link', isAuthenticatedAPI, jsonParser, projectController.submitGithubLink);
router.post('/task/review-submission', isAuthenticatedAPI, jsonParser, projectController.reviewSubmission);
router.post('/task/:id/feedback', isAuthenticatedAPI, jsonParser, projectController.reviewSubmission); 
router.get('/get-task-project/:taskId', isAuthenticatedAPI, projectController.getTaskProject); 

// --- Dynamic Topic Routes (Paths are correct) ---
Object.keys(topics).forEach(path => {
    router.get(path, isAuthenticatedAPI, projectController.getTopicProjects);
});


module.exports = router;