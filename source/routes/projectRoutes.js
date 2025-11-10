// routes/projectRoutes.js

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { isAuthenticated } = require('../middleware/authMiddleware'); 
const { topics } = require('../config/constants'); // Needed for dynamic route mapping

const jsonParser = express.json();

// Apply Authentication to all project routes
router.use(isAuthenticated);

// --- Core Project Views ---
router.get('/project', projectController.getAllProjects);
router.get('/available-projects', projectController.getAllProjects); // Duplicate route from original code
router.get('/joined-projects', projectController.getJoinedProjects);
router.get('/project/:id', projectController.getProjectDetails);
router.get('/e', projectController.getCreateProjectView); // View to create projects

// --- Project CRUD & Membership APIs ---
router.post('/create-project', jsonParser, projectController.createProject);
router.post('/delete-project', jsonParser, projectController.deleteProject);
router.post('/join-project', jsonParser, projectController.joinProject);
router.post('/approve-join-request', jsonParser, projectController.approveJoinRequest);
router.post('/reject-join-request', jsonParser, projectController.rejectJoinRequest);
router.post('/delete-join-request', jsonParser, projectController.deleteJoinRequest);

// --- Project Completion / Status ---
router.post('/project/:id/finish', jsonParser, projectController.finishProject);
router.get('/project/:id/pending-tasks', projectController.getPendingTasks);

// --- Task Management APIs ---
router.post('/task/create', jsonParser, projectController.createTask);
router.post('/task/extend-deadline', jsonParser, projectController.extendDeadline);
router.post('/task/submit-github-link', jsonParser, projectController.submitGithubLink);
router.post('/task/review-submission', jsonParser, projectController.reviewSubmission);
router.post('/task/:id/feedback', jsonParser, projectController.reviewSubmission); 
router.post('/task/review-submission', jsonParser, projectController.reviewSubmission);

// --- Dynamic Topic Routes ---
// This loop maps all topic paths from constants to the same controller function
Object.keys(topics).forEach(path => {
    router.get(path, projectController.getTopicProjects);
});


module.exports = router;