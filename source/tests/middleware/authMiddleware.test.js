const { signToken, COOKIE_NAME } = require('../../config/jwt');
const { isAuthenticatedAPI, isRecruiterAPI, optionalAuth } = require('../../middleware/authMiddleware');
const { createRes } = require('../utils/httpMocks');

describe('middleware/authMiddleware', () => {
  it('accepts valid bearer token', () => {
    const token = signToken({ id: 'u1', role: 'user' });
    const req = { get: jest.fn((h) => (h.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined)), cookies: {} };
    const res = createRes();
    const next = jest.fn();

    isAuthenticatedAPI(req, res, next);

    expect(req.user).toMatchObject({ id: 'u1', role: 'user' });
    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid token', () => {
    const req = { get: jest.fn(() => 'Bearer bad-token'), cookies: {} };
    const res = createRes();
    const next = jest.fn();

    isAuthenticatedAPI(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing token', () => {
    const req = { get: jest.fn(() => undefined), cookies: {} };
    const res = createRes();
    const next = jest.fn();

    isAuthenticatedAPI(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts valid cookie token', () => {
    const token = signToken({ id: 'u2', role: 'admin' });
    const req = { get: jest.fn(() => undefined), cookies: { [COOKIE_NAME]: token } };
    const res = createRes();
    const next = jest.fn();

    isAuthenticatedAPI(req, res, next);

    expect(req.user).toMatchObject({ id: 'u2', role: 'admin' });
    expect(next).toHaveBeenCalled();
  });

  it('blocks student from recruiter-only middleware', () => {
    const token = signToken({ id: 'u3', role: 'student' });
    const req = { get: jest.fn(() => `Bearer ${token}`), cookies: {} };
    const res = createRes();
    const next = jest.fn();

    isRecruiterAPI(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('optionalAuth never blocks anonymous user', () => {
    const req = { get: jest.fn(() => undefined), cookies: {} };
    const res = createRes();
    const next = jest.fn();

    optionalAuth(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});
