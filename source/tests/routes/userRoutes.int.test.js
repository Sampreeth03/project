const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/userController', () => ({
  searchUsers: jest.fn((req, res) => res.json({ success: true })),
  sendFriendRequest: jest.fn((req, res) => res.json({ success: true })),
  respondFriendRequest: jest.fn((req, res) => res.json({ success: true })),
  getFriends: jest.fn((req, res) => res.json({ success: true })),
  getFriendRequests: jest.fn((req, res) => res.json({ success: true })),
  getHome: jest.fn((req, res) => res.json({ success: true })),
  getHomeTopics: jest.fn((req, res) => res.json({ success: true })),
  completeOnboarding: jest.fn((req, res) => res.json({ success: true })),
  getDashboard: jest.fn((req, res) => res.json({ success: true })),
  getDashboardMetrics: jest.fn((req, res) => res.json({ success: true })),
  getDashboardTrends: jest.fn((req, res) => res.json({ success: true })),
  getProfile: jest.fn((req, res) => res.json({ success: true })),
  getProfileData: jest.fn((req, res) => res.json({ success: true })),
  postProfile: jest.fn((req, res) => res.json({ success: true })),
  getMessages: jest.fn((req, res) => res.json({ success: true })),
  getFAQ: jest.fn((req, res) => res.json({ success: true }))
}));

jest.mock('../../middleware/authMiddleware', () => ({
  isAuthenticatedAPI: (req, res, next) => {
    req.user = { id: 'u1', role: 'user' };
    next();
  },
  optionalAuth: (req, res, next) => next()
}));

jest.mock('../../middleware/cacheMiddleware', () => ({
  cacheRoute: () => (req, res, next) => next()
}));

const userController = require('../../controllers/userController');
const userRoutes = require('../../routes/userRoutes');

describe('routes/userRoutes integration', () => {
  const app = express();
  app.use(express.json());
  app.use('/', userRoutes);

  it('wires GET /dashboard to controller', async () => {
    const res = await request(app).get('/dashboard');

    expect(res.status).toBe(200);
    expect(userController.getDashboard).toHaveBeenCalled();
  });
});
