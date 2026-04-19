jest.mock('../../database', () => ({
  User: {},
  UserMetrics: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
  Project: {
    countDocuments: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    deleteOne: jest.fn()
  },
  ProjectMember: { create: jest.fn(), find: jest.fn(), deleteMany: jest.fn() },
  JoinRequest: { deleteMany: jest.fn() },
  Task: { deleteMany: jest.fn() },
  Notification: { create: jest.fn() },
  JoinRequestMessage: {},
  Channel: { insertMany: jest.fn() }
}));

jest.mock('../../services/cacheLoggingService', () => ({ logInvalidation: jest.fn() }));
jest.mock('../../services/redisCacheService', () => ({ deleteByPrefix: jest.fn().mockResolvedValue(undefined) }));

const { createRes } = require('../utils/httpMocks');
const projectController = require('../../controllers/projectController');
const { Project, ProjectMember, UserMetrics } = require('../../database');

describe('controllers/projectController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createProject rejects unauthorized user', async () => {
    const req = { body: {} };
    const res = createRes();
    const next = jest.fn();

    await projectController.createProject(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('createProject returns requirePayment for threshold users', async () => {
    const req = {
      user: { id: '507f1f77bcf86cd799439011' },
      body: { title: 'A', description: 'B', capacity: 3, topic: 'web-dev', deadline: '2099-01-01' }
    };
    const res = createRes();
    const next = jest.fn();

    UserMetrics.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ projects_created_lifetime: 6 }) });
    Project.countDocuments.mockResolvedValue(6);

    await projectController.createProject(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ requirePayment: true });
  });

  it('createProject creates project for valid request', async () => {
    const req = {
      user: { id: '507f1f77bcf86cd799439011' },
      body: {
        title: 'My Project',
        description: 'A valid project description',
        capacity: 3,
        topic: 'web-dev',
        deadline: '2099-01-01'
      }
    };
    const res = createRes();
    const next = jest.fn();

    UserMetrics.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ projects_created_lifetime: 0 }) });
    Project.countDocuments.mockResolvedValue(0);
    Project.create.mockResolvedValue({ _id: 'p1' });

    await projectController.createProject(req, res, next);

    expect(Project.create).toHaveBeenCalled();
    expect(ProjectMember.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deleteProject enforces role permission edge', async () => {
    const req = {
      user: { id: '507f1f77bcf86cd799439011', role: 'recruiter' },
      body: { projectId: '507f1f77bcf86cd799439012' }
    };
    const res = createRes();
    const next = jest.fn();

    await projectController.deleteProject(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
