const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/searchController', () => ({
  getUserSearch: jest.fn((req, res) => res.json({ success: true })),
  getProjectSearch: jest.fn((req, res) => res.json({ success: true })),
  getJobSearch: jest.fn((req, res) => res.json({ success: true }))
}));

jest.mock('../../middleware/authMiddleware', () => ({
  isAuthenticatedAPI: (req, res, next) => {
    req.user = { id: 'u1', role: 'user' };
    next();
  }
}));

const searchController = require('../../controllers/searchController');
const searchRoutes = require('../../routes/searchRoutes');

describe('routes/searchRoutes integration', () => {
  const app = express();
  app.use(express.json());
  app.use('/', searchRoutes);

  it('wires GET /search/users to controller', async () => {
    const res = await request(app).get('/search/users');

    expect(res.status).toBe(200);
    expect(searchController.getUserSearch).toHaveBeenCalled();
  });
});
