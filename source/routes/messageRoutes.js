// routes/messageRoutes.js

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { upload } = require('../middleware/uploadMiddleware');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware');
const { cacheRoute } = require('../middleware/cacheMiddleware');

// All message routes require an authenticated user
router.use(isAuthenticatedAPI);

// Get all projects for current user (created + joined)
router.get('/projects', cacheRoute({ ttlSeconds: 20, scope: 'user' }), messageController.getUserProjects);

// Get channels for a specific project
router.get('/projects/:projectId/channels', cacheRoute({ ttlSeconds: 20, scope: 'user' }), messageController.getProjectChannels);

// Get members of a specific project
router.get('/projects/:projectId/members', cacheRoute({ ttlSeconds: 20, scope: 'user' }), messageController.getProjectMembers);

// Get messages for a specific channel
router.get('/channels/:channelId/messages', cacheRoute({ ttlSeconds: 15, scope: 'user' }), messageController.getChannelMessages);

// Send a message to a channel (with optional file upload)
router.post('/channels/:channelId/messages', upload.single('file'), messageController.sendChannelMessage);

// Get direct messages between two users in a project
router.get('/projects/:projectId/direct-messages/:otherUserId', cacheRoute({ ttlSeconds: 15, scope: 'user' }), messageController.getDirectMessages);

// Send a direct message
router.post('/projects/:projectId/direct-messages/:otherUserId', messageController.sendDirectMessage);

// Create a new channel (project creator only)
router.post('/projects/:projectId/channels', messageController.createChannel);

// Get unread message counts for all projects
router.get('/unread-counts', cacheRoute({ ttlSeconds: 10, scope: 'user' }), messageController.getUnreadCounts);

// Mark channel as read
router.post('/channels/:channelId/mark-read', messageController.markChannelAsRead);

// Mark DMs as read
router.post('/projects/:projectId/direct-messages/:otherUserId/mark-read', messageController.markDMAsRead);

// Search messages in a channel
router.get('/channels/:channelId/search', cacheRoute({ ttlSeconds: 15, scope: 'user' }), messageController.searchChannelMessages);

// Toggle pin message (owner only)
router.post('/messages/:messageId/pin', messageController.togglePinMessage);

// Get pinned messages for a channel
router.get('/channels/:channelId/pinned', cacheRoute({ ttlSeconds: 20, scope: 'user' }), messageController.getPinnedMessages);

module.exports = router;
