const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/projectController', () => ({
  getAllProjects: jest.fn((req, res) => res.json({ success: true })),
  getJoinedProjects: jest.fn((req, res) => res.json({ success: true })),
  getProjectDetails: jest.fn((req, res) => res.json({ success: true })),
  getCreateProjectView: jest.fn((req, res) => res.json({ success: true })),
  createProject: jest.fn((req, res) => res.json({ success: true })),
  deleteProject: jest.fn((req, res) => res.json({ success: true })),
  joinProject: jest.fn((req, res) => res.json({ success: true })),
  approveJoinRequest: jest.fn((req, res) => res.json({ success: true })),
  rejectJoinRequest: jest.fn((req, res) => res.json({ success: true })),
  deleteJoinRequest: jest.fn((req, res) => res.json({ success: true })),
  getJoinRequestMessages: jest.fn((req, res) => res.json({ success: true })),
  sendJoinRequestMessage: jest.fn((req, res) => res.json({ success: true })),
  uploadJoinRequestFile: jest.fn((req, res) => res.json({ success: true })),
  inviteFriendToProject: jest.fn((req, res) => res.json({ success: true })),
  getProjectInvites: jest.fn((req, res) => res.json({ success: true })),
  respondProjectInvite: jest.fn((req, res) => res.json({ success: true })),
  finishProject: jest.fn((req, res) => res.json({ success: true })),
  getPendingTasks: jest.fn((req, res) => res.json({ success: true })),
  removeProjectMember: jest.fn((req, res) => res.json({ success: true })),
  createTask: jest.fn((req, res) => res.json({ success: true })),
  extendDeadline: jest.fn((req, res) => res.json({ success: true })),
  submitGithubLink: jest.fn((req, res) => res.json({ success: true })),
  reviewSubmission: jest.fn((req, res) => res.json({ success: true })),
  getTaskProject: jest.fn((req, res) => res.json({ success: true })),
  getTopicProjects: jest.fn((req, res) => res.json({ success: true }))
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

const projectController = require('../../controllers/projectController');
const projectRoutes = require('../../routes/projectRoutes');

describe('routes/projectRoutes integration', () => {
  const app = express();
  app.use(express.json());
  app.use('/', projectRoutes);

  it('wires GET /project to controller', async () => {
    const res = await request(app).get('/project');

    expect(res.status).toBe(200);
    expect(projectController.getAllProjects).toHaveBeenCalled();
  });

  it('rejects invalid create-project payload via validation middleware', async () => {
    const res = await request(app).post('/create-project').send({ title: '' });

    expect(res.status).toBe(400);
    expect(projectController.createProject).not.toHaveBeenCalled();
  });
});
