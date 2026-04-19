jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('../../database', () => ({
  User: { findOne: jest.fn(), findById: jest.fn() },
  UserMetrics: { create: jest.fn() },
  PendingRecruiter: { deleteOne: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  PendingStudent: { deleteOne: jest.fn(), create: jest.fn(), findOne: jest.fn() }
}));

jest.mock('../../services/helperService', () => ({
  validatePassword: jest.fn()
}));

jest.mock('../../services/otpService', () => ({
  createLoginOtp: jest.fn(() => '1234'),
  verifyLoginOtp: jest.fn(() => ({ ok: true, userId: 'u1' }))
}));

jest.mock('../../services/totpService', () => ({
  verifyTotpToken: jest.fn(() => true),
  generateTotpSecret: jest.fn(() => 'secret'),
  buildOtpAuthUrl: jest.fn(() => 'otpauth://url'),
  buildQrCodeUrl: jest.fn(() => 'https://qr')
}));

const bcrypt = require('bcrypt');
const { createRes } = require('../utils/httpMocks');
const authController = require('../../controllers/authController');
const { User } = require('../../database');
const { validatePassword } = require('../../services/helperService');

describe('controllers/authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('postLoginRequestOtp succeeds and logs user in when OTP bypass applies', async () => {
    const req = { body: { email: 'user@example.com', password: 'Pass@123' } };
    const res = createRes();

    validatePassword.mockReturnValue(true);
    User.findOne.mockResolvedValue({
      _id: 'u1',
      name: 'User',
      email: 'user@example.com',
      role: 'user',
      password: 'hashed'
    });
    bcrypt.compare.mockResolvedValue(true);

    await authController.postLoginRequestOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('postLoginRequestOtp rejects missing payload', async () => {
    const req = { body: { email: '', password: '' } };
    const res = createRes();

    await authController.postLoginRequestOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('postLoginRequestOtp rejects invalid password format', async () => {
    const req = { body: { email: 'user@example.com', password: 'weak' } };
    const res = createRes();

    validatePassword.mockReturnValue(false);

    await authController.postLoginRequestOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Password validation failed.' }));
  });

  it('postLoginRequestOtp rejects wrong credentials', async () => {
    const req = { body: { email: 'user@example.com', password: 'Pass@123' } };
    const res = createRes();

    validatePassword.mockReturnValue(true);
    User.findOne.mockResolvedValue({ _id: 'u1', email: 'user@example.com', password: 'hash', role: 'user' });
    bcrypt.compare.mockResolvedValue(false);

    await authController.postLoginRequestOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
