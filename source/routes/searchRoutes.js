const express = require('express');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

const router = express.Router();

router.get('/search/users', isAuthenticatedAPI, searchController.getUserSearch);
router.get('/search/projects', isAuthenticatedAPI, searchController.getProjectSearch);
router.get('/search/jobs', isAuthenticatedAPI, searchController.getJobSearch);

module.exports = router;
