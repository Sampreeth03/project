jest.mock('../../database', () => ({
  Project: {
    findById: jest.fn(),
    create: jest.fn()
  },
  ProjectMember: {
    create: jest.fn()
  },
  Channel: {
    create: jest.fn()
  },
  UserMetrics: {
    findOneAndUpdate: jest.fn()
  },
  Notification: {
    create: jest.fn()
  }
}));

jest.mock('../../services/solrSyncService', () => ({
  syncProjectUpsert: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: function ObjectId(value) {
      return value;
    }
  }
}));

const paymentController = require('../../controllers/paymentController');
const { Project, ProjectMember, Channel } = require('../../database');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('controllers/paymentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthorized createOrder', async () => {
    const req = { user: null, body: {} };
    const res = createRes();
    await paymentController.createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects missing fields for project creation payment', async () => {
    const req = { user: { id: 'u1' }, body: { title: 'T' } };
    const res = createRes();
    await paymentController.createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates mock payment order for project creation', async () => {
    const req = {
      user: { id: 'u1' },
      body: {
        title: 'Build',
        description: 'Desc',
        capacity: 3,
        topic: 'web-dev',
        deadline: '2099-01-01'
      }
    };
    const res = createRes();

    await paymentController.createOrder(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      paymentIntentId: expect.stringContaining('mock_pi_'),
      paymentType: 'project_creation'
    }));
  });

  it('validates extension payment fields and ownership', async () => {
    const res = createRes();
    await paymentController.createOrder({ user: { id: 'u1' }, body: { paymentType: 'project_extension' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    Project.findById.mockResolvedValueOnce(null);
    await paymentController.createOrder({ user: { id: 'u1' }, body: { paymentType: 'project_extension', projectId: 'p1', newDeadline: '2099-01-01' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects unauthorized and missing paymentIntentId in verify', async () => {
    const res = createRes();
    await paymentController.verifyAndCreateProject({ user: null, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);

    await paymentController.verifyAndCreateProject({ user: { id: 'u1' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('handles unknown and mismatched payment intents', async () => {
    const res = createRes();
    await paymentController.verifyAndCreateProject({ user: { id: 'u1' }, body: { paymentIntentId: 'mock_pi_unknown' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    const orderRes = createRes();
    await paymentController.createOrder({
      user: { id: 'u1' },
      body: {
        title: 'Build',
        description: 'Desc',
        capacity: 3,
        topic: 'web-dev',
        deadline: '2099-01-01'
      }
    }, orderRes);
    const intentId = orderRes.json.mock.calls[0][0].paymentIntentId;

    await paymentController.verifyAndCreateProject({ user: { id: 'u2' }, body: { paymentIntentId: intentId } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('verifies payment and creates project for matching user', async () => {
    Project.create.mockResolvedValueOnce({ _id: 'p1', title: 'Build' });
    ProjectMember.create.mockResolvedValueOnce({});
    Channel.create.mockResolvedValue({});

    const orderRes = createRes();
    await paymentController.createOrder({
      user: { id: 'u1' },
      body: {
        title: 'Build',
        description: 'Desc',
        capacity: 3,
        topic: 'web-dev',
        deadline: '2099-01-01'
      }
    }, orderRes);
    const intentId = orderRes.json.mock.calls[0][0].paymentIntentId;

    const verifyRes = createRes();
    await paymentController.verifyAndCreateProject({ user: { id: 'u1' }, body: { paymentIntentId: intentId } }, verifyRes);

    expect(Project.create).toHaveBeenCalled();
    expect(ProjectMember.create).toHaveBeenCalled();
    expect(Channel.create).toHaveBeenCalledTimes(2);
    expect(verifyRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, purpose: 'project_creation' }));
  });
});