// routes/projectRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { topics } = require('../config/constants'); 

const jsonParser = express.json();

// Apply Authentication to all project routes
router.use(isAuthenticatedAPI); // Changed to API-aware middleware

// --- Core Project Views ---
router.get('/project', projectController.getAllProjects);
router.get('/joined-projects', projectController.getJoinedProjects);
router.get('/project/:id', projectController.getProjectDetails);
router.get('/e', projectController.getCreateProjectView); 

// --- Project CRUD & Membership APIs (Paths are correct) ---
router.post('/create-project', jsonParser, projectController.createProject);
router.post('/delete-project', jsonParser, projectController.deleteProject);
// ... (rest of CRUD routes remain the same) ...
router.post('/join-project', jsonParser, projectController.joinProject);
router.post('/approve-join-request', jsonParser, projectController.approveJoinRequest);
router.post('/reject-join-request', jsonParser, projectController.rejectJoinRequest);
router.post('/delete-join-request', jsonParser, projectController.deleteJoinRequest);

// --- Join Request Chat APIs ---
router.get('/join-request-messages/:requestId', projectController.getJoinRequestMessages);
router.post('/send-join-request-message', jsonParser, projectController.sendJoinRequestMessage);
router.post('/upload-join-request-file', projectController.uploadJoinRequestFile);

// --- Project Completion / Status (Paths are correct) ---
router.post('/project/:id/finish', jsonParser, projectController.finishProject);
router.get('/project/:id/pending-tasks', projectController.getPendingTasks);

// --- Task Management APIs (Paths are correct) ---
router.post('/task/create', jsonParser, projectController.createTask);
router.post('/task/extend-deadline', jsonParser, projectController.extendDeadline);
router.post('/task/submit-github-link', jsonParser, projectController.submitGithubLink);
router.post('/task/review-submission', jsonParser, projectController.reviewSubmission);
router.post('/task/:id/feedback', jsonParser, projectController.reviewSubmission); 
router.get('/get-task-project/:taskId', projectController.getTaskProject); 

// --- Dynamic Topic Routes (Paths are correct) ---
Object.keys(topics).forEach(path => {
    router.get(path, projectController.getTopicProjects);
});


module.exports = router;