jest.mock('../../database', () => ({
  User: {},
  UserMetrics: {
    findOneAndUpdate: jest.fn()
  },
  JobApplication: {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    deleteOne: jest.fn()
  },
  Notification: {
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn()
  }
}));

jest.mock('../../services/redisCacheService', () => ({
  deleteByPrefix: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../services/cacheLoggingService', () => ({
  logInvalidation: jest.fn()
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn((id) => String(id || '').startsWith('valid'))
    }
  }
}));

const { JobApplication, Notification, UserMetrics } = require('../../database');
const jobController = require('../../controllers/jobController');

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
  res.redirect = jest.fn(() => res);
  return res;
};

describe('controllers/jobController', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns jobs JSON for API requests and renders for HTML', async () => {
    JobApplication.find
      .mockReturnValueOnce(makeChain([{ _id: 'j1', job_title: 'Dev', company_name: 'Comp', custom_questions: [] }]))
      .mockReturnValueOnce(makeChain([]));

    const reqApi = { user: { id: 'u1', name: 'Stud' }, headers: { accept: 'application/json' } };
    const resApi = createRes();
    await jobController.getJobApplyPage(reqApi, resApi);
    expect(resApi.json).toHaveBeenCalledWith(expect.objectContaining({ jobs: expect.any(Array) }));

    JobApplication.find
      .mockReturnValueOnce(makeChain([{ _id: 'j2', job_title: 'Dev2', company_name: 'Comp', custom_questions: [] }]))
      .mockReturnValueOnce(makeChain([]));
    const reqHtml = { user: { id: 'u1', name: 'Stud' }, headers: { accept: 'text/html' } };
    const resHtml = createRes();
    await jobController.getJobApplyPage(reqHtml, resHtml);
    expect(resHtml.render).toHaveBeenCalledWith('applyjobs', expect.any(Object));
  });

  it('validates applyForJob input branches', async () => {
    const res = createRes();
    await jobController.applyForJob({ user: { id: 'u1' }, body: {}, file: { path: 'resume.pdf' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await jobController.applyForJob({ user: { id: 'u1' }, body: { jobId: 'bad-id' }, file: { path: 'resume.pdf' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await jobController.applyForJob({ user: { id: 'u1' }, body: { jobId: 'valid-id' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates application successfully', async () => {
    const jobDoc = {
      _id: 'valid-job1',
      user_id: null,
      posted_by: 'r1',
      job_title: 'Dev',
      company_name: 'Comp',
      salary_range: '10-20',
      description: 'Desc',
      skills: 'js',
      custom_questions: []
    };
    JobApplication.findById.mockResolvedValueOnce(jobDoc);
    JobApplication.findOne.mockResolvedValueOnce(null);
    JobApplication.create.mockResolvedValueOnce({ _id: 'a1' });

    const req = {
      user: { id: 'u1', name: 'Stud' },
      body: { jobId: 'valid-job1', customAnswers: '{}' },
      file: { path: 'resume.pdf' }
    };
    const res = createRes();
    await jobController.applyForJob(req, res);

    expect(JobApplication.create).toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns unauthorized for student applications and notifications without user', async () => {
    const res = createRes();
    await jobController.getStudentApplications({ user: null }, res);
    expect(res.status).toHaveBeenCalledWith(401);

    await jobController.getJobNotifications({ user: null }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns application and notification payloads', async () => {
    JobApplication.find
      .mockReturnValueOnce(makeChain([
        {
          _id: 'a1',
          job_title: 'Dev',
          company_name: 'Comp',
          salary_range: '10-20',
          description: 'Desc',
          skills: 'js',
          date_applied: new Date('2026-01-01'),
          status: 'Waiting',
          posted_by: { email: 'r@x.com', name: 'Rec' }
        }
      ]))
      .mockReturnValueOnce(makeChain([
        {
          _id: 'a1',
          job_title: 'Dev',
          company_name: 'Comp',
          salary_range: '10-20',
          description: 'Desc',
          skills: 'js',
          date_applied: new Date('2026-01-01'),
          status: 'Approved',
          posted_by: { email: 'r@x.com', name: 'Rec' }
        }
      ]));

    const res = createRes();
    await jobController.getStudentApplications({ user: { id: 'u1' } }, res);
    await jobController.getJobNotifications({ user: { id: 'u1' } }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ applications: expect.any(Array) }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ jobsNotifications: expect.any(Array) }));
  });

  it('covers markNotificationRead branches', async () => {
    const res = createRes();
    await jobController.markNotificationRead({ user: null, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);

    await jobController.markNotificationRead({ user: { id: 'u1' }, body: { notificationId: 'bad' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    Notification.updateOne.mockResolvedValueOnce({ matchedCount: 1 });
    await jobController.markNotificationRead({ user: { id: 'u1' }, body: { notificationId: 'valid-note1' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    Notification.updateOne.mockResolvedValueOnce({ matchedCount: 0 });
    JobApplication.exists.mockResolvedValueOnce(null);
    await jobController.markNotificationRead({ user: { id: 'u1' }, body: { notificationId: 'valid-note2' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('covers deleteNotification and revokeApplication branches', async () => {
    const res = createRes();

    Notification.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    await jobController.deleteNotification({ user: { id: 'u1' }, body: { notificationId: 'valid-note1' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    Notification.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });
    JobApplication.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });
    await jobController.deleteNotification({ user: { id: 'u1' }, body: { notificationId: 'valid-note2' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    await jobController.revokeApplication({ user: { id: 'u1' }, body: { applicationId: 'bad' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    JobApplication.findOne.mockResolvedValueOnce({ status: 'Approved' });
    await jobController.revokeApplication({ user: { id: 'u1' }, body: { applicationId: 'valid-app1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    JobApplication.findOne.mockResolvedValueOnce({ status: 'Waiting' });
    JobApplication.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    UserMetrics.findOneAndUpdate.mockResolvedValueOnce({});
    await jobController.revokeApplication({ user: { id: 'u1' }, body: { applicationId: 'valid-app2' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});