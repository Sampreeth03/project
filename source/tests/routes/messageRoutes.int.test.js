const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/messageController', () => ({
  getUserProjects: jest.fn((req, res) => res.json({ success: true })),
  getProjectChannels: jest.fn((req, res) => res.json({ success: true })),
  getProjectMembers: jest.fn((req, res) => res.json({ success: true })),
  getChannelMessages: jest.fn((req, res) => res.json({ success: true })),
  sendChannelMessage: jest.fn((req, res) => res.json({ success: true })),
  getDirectMessages: jest.fn((req, res) => res.json({ success: true })),
  sendDirectMessage: jest.fn((req, res) => res.json({ success: true })),
  createChannel: jest.fn((req, res) => res.json({ success: true })),
  getUnreadCounts: jest.fn((req, res) => res.json({ success: true })),
  markChannelAsRead: jest.fn((req, res) => res.json({ success: true })),
  markDMAsRead: jest.fn((req, res) => res.json({ success: true })),
  searchChannelMessages: jest.fn((req, res) => res.json({ success: true })),
  togglePinMessage: jest.fn((req, res) => res.json({ success: true })),
  getPinnedMessages: jest.fn((req, res) => res.json({ success: true }))
}));

jest.mock('../../middleware/authMiddleware', () => ({
  isAuthenticatedAPI: (req, res, next) => {
    req.user = { id: 'u1', role: 'user' };
    next();
  }
}));

jest.mock('../../middleware/cacheMiddleware', () => ({
  cacheRoute: () => (req, res, next) => next()
}));

const messageController = require('../../controllers/messageController');
const messageRoutes = require('../../routes/messageRoutes');

describe('routes/messageRoutes integration', () => {
  const app = express();
  app.use(express.json());
  app.use('/', messageRoutes);

  it('wires GET /projects to controller under auth router', async () => {
    const res = await request(app).get('/projects');

    expect(res.status).toBe(200);
    expect(messageController.getUserProjects).toHaveBeenCalled();
  });
});
