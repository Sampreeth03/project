const makeChain = (result) => {
  const chain = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    populate: jest.fn(() => chain),
    lean: jest.fn().mockResolvedValue(result)
  };
  return chain;
};

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.render = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

jest.mock('../../database', () => ({
  User: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn()
  },
  UserMetrics: {
    find: jest.fn(),
    findOneAndUpdate: jest.fn()
  },
  Project: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn()
  },
  Doubt: {
    countDocuments: jest.fn(),
    aggregate: jest.fn()
  },
  JobApplication: {
    find: jest.fn()
  },
  ProjectMember: {
    find: jest.fn()
  },
  PlatformAdministrator: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

const adminController = require('../../controllers/adminController');
const {
  User,
  UserMetrics,
  Project,
  Doubt,
  JobApplication,
  ProjectMember,
  PlatformAdministrator
} = require('../../database');

describe('controllers/adminController', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders admin dashboard shell', () => {
    const req = { user: { name: 'Boss' } };
    const res = createRes();

    adminController.getAdminDashboard(req, res);

    expect(res.render).toHaveBeenCalledWith('admin', expect.objectContaining({ activePage: 'dashboard' }));
  });

  it('returns dashboard data payload', async () => {
    User.countDocuments
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(18);
    Project.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(14);
    Doubt.countDocuments.mockResolvedValueOnce(7).mockResolvedValueOnce(3).mockResolvedValueOnce(41);
    PlatformAdministrator.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const req = { user: { name: 'Boss' } };
    const res = createRes();

    await adminController.getDashboardData(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      dashboardData: expect.objectContaining({
        adminName: 'Boss',
        dashboardCards: expect.any(Array)
      })
    }));
  });

  it('returns students data mapped with metrics', async () => {
    const students = [{ _id: 'u1', name: 'A', email: 'a@x.com' }];
    User.find.mockReturnValueOnce(makeChain(students));
    UserMetrics.find.mockReturnValueOnce(makeChain([{ user_id: 'u1', completed_tasks: 9 }]));
    Project.aggregate.mockResolvedValueOnce([{ _id: 'u1', count: 2 }]);

    const req = { user: { name: 'Boss' } };
    const res = createRes();
    await adminController.getStudentsData(req, res);

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'A', hostedProjects: 2, tasksCompleted: 9 })
    ]);
  });

  it('renders doubts page and serves doubts data API', async () => {
    const users = [{ _id: 'u1', name: 'A', email: 'a@x.com' }];
    User.find.mockReturnValue(makeChain(users));
    UserMetrics.find.mockReturnValue(makeChain([{ user_id: 'u1', solutions_provided: 4 }]));
    Doubt.aggregate.mockResolvedValue([{ _id: 'u1', count: 7 }]);

    const req = { user: { name: 'Boss' } };
    const res = createRes();
    await adminController.getDoubtsPage(req, res);
    await adminController.getDoubtsData(req, res);

    expect(res.render).toHaveBeenCalledWith('admin-doubts', expect.objectContaining({ activePage: 'doubts' }));
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ doubtsAsked: 7, doubtsCleared: 4 })
    ]);
  });

  it('returns recruiters data with hired/posting breakdown', async () => {
    User.find.mockReturnValueOnce(makeChain([
      { _id: 'r1', name: 'Rec', email: 'r@x.com', createdAt: new Date('2026-01-01') }
    ]));
    JobApplication.find.mockReturnValueOnce(makeChain([
      {
        posted_by: 'r1',
        user_id: null,
        status: 'Waiting',
        job_title: 'J1',
        company_name: 'C1',
        createdAt: new Date('2026-01-02')
      },
      {
        posted_by: 'r1',
        user_id: { name: 'Stud' },
        status: 'Approved',
        job_title: 'J2',
        company_name: 'C1',
        createdAt: new Date('2026-01-03')
      }
    ]));

    const req = { user: { name: 'Boss' } };
    const res = createRes();
    await adminController.getRecruitersData(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      recruiters: [expect.objectContaining({ recruitmentCount: 1 })]
    }));
  });

  it('returns project data with derived statuses and member counts', async () => {
    Project.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([
      {
        _id: 'p1',
        title: 'P1',
        topic: 'web-dev',
        status: 'active',
        description: 'x',
        deadline: '2099-01-01',
        user_id: 'u1'
      }
    ]) });
    User.find.mockReturnValue(makeChain([{ _id: 'u1', name: 'Lead', email: 'lead@x.com' }]));
    ProjectMember.find.mockReturnValue(makeChain([{ project_id: 'p1', user_id: 'u1' }]));

    const req = { user: { name: 'Boss' } };
    const res = createRes();
    await adminController.getProjectsData(req, res);

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'P1', members: 1, status: 'active' })
    ]);
  });

  it('returns default profile data when session id missing', async () => {
    const req = { user: null };
    const res = createRes();
    await adminController.getProfileData(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Admin User' }));
  });

  it('returns 404 for unknown admin profile', async () => {
    User.findById.mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
    const req = { user: { id: 'a1' } };
    const res = createRes();
    await adminController.getProfileData(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('handles messages API failure path and returns platform admins list', async () => {
    PlatformAdministrator.find.mockReturnValueOnce(makeChain([{ email: 'p@x.com', adminId: 'PA1' }]));
    const req = { user: { id: 'a1', name: 'Boss' } };
    const res = createRes();
    await adminController.getMessagesData(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Server Error' });

    await adminController.getPlatformAdministrators(req, res);

    expect(res.json).toHaveBeenLastCalledWith(expect.objectContaining({
      administrators: [expect.objectContaining({ email: 'p@x.com' })]
    }));
  });

  it('validates and creates platform admin with conflict branch', async () => {
    const res = createRes();
    await adminController.createPlatformAdministrator({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    PlatformAdministrator.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({ _id: 'exists' })
    });
    await adminController.createPlatformAdministrator({ body: { email: 'a@x.com', passkey: 'k', adminId: 'PA1' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);

    PlatformAdministrator.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(null)
    });
    PlatformAdministrator.create.mockResolvedValueOnce({ _id: 'new', email: 'a@x.com', adminId: 'PA1', createdAt: new Date() });
    await adminController.createPlatformAdministrator({ body: { email: 'a@x.com', passkey: 'k', adminId: 'PA1' } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});