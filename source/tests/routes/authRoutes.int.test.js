const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/authController', () => ({
  getLanding: jest.fn((req, res) => res.json({ ok: true })),
  getLogin: jest.fn((req, res) => res.json({ ok: true })),
  postLogin: jest.fn((req, res) => res.json({ success: true })),
  postLoginRequestOtp: jest.fn((req, res) => res.json({ success: true })),
  postLoginVerifyOtp: jest.fn((req, res) => res.json({ success: true })),
  postForgotPasswordRequestOtp: jest.fn((req, res) => res.json({ success: true })),
  postForgotPasswordReset: jest.fn((req, res) => res.json({ success: true })),
  getSignup: jest.fn((req, res) => res.json({ ok: true })),
  postSignup: jest.fn((req, res) => res.json({ success: true })),
  postStudentSignupInit: jest.fn((req, res) => res.json({ success: true })),
  postStudentVerifyOTP: jest.fn((req, res) => res.json({ success: true })),
  postStudentResendOTP: jest.fn((req, res) => res.json({ success: true })),
  postStudentVerifyAuthenticatorSetup: jest.fn((req, res) => res.json({ success: true })),
  getRecruiterSignup: jest.fn((req, res) => res.json({ ok: true })),
  postRecruiterSignup: jest.fn((req, res) => res.json({ success: true })),
  postRecruiterSignupInit: jest.fn((req, res) => res.json({ success: true })),
  postRecruiterVerifyOTP: jest.fn((req, res) => res.json({ success: true })),
  postRecruiterResendOTP: jest.fn((req, res) => res.json({ success: true })),
  postRecruiterCompleteSignup: jest.fn((req, res) => res.json({ success: true })),
  logout: jest.fn((req, res) => res.json({ success: true })),
  redirectAsk: jest.fn((req, res) => res.json({ success: true }))
}));

const authController = require('../../controllers/authController');
const authRoutes = require('../../routes/authRoutes');

describe('routes/authRoutes integration', () => {
  const app = express();
  app.use(express.json());
  app.use('/', authRoutes);

  it('rejects invalid login payload via validation middleware', async () => {
    const res = await request(app).post('/login').send({ email: 'bad', password: '' });

    expect(res.status).toBe(400);
    expect(authController.postLogin).not.toHaveBeenCalled();
  });

  it('accepts valid login payload and calls controller', async () => {
    const res = await request(app).post('/login').send({ email: 'user@example.com', password: 'Pass@123' });

    expect(res.status).toBe(200);
    expect(authController.postLogin).toHaveBeenCalled();
  });
});
