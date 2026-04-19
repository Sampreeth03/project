const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/paymentController', () => ({
  createOrder: jest.fn((req, res) => res.json({ success: true, paymentIntentId: 'pi_123' })),
  verifyAndCreateProject: jest.fn((req, res) => res.json({ success: true }))
}));

jest.mock('../../middleware/authMiddleware', () => ({
  isAuthenticatedAPI: (req, res, next) => {
    req.user = { id: 'u1', role: 'user' };
    next();
  }
}));

const paymentController = require('../../controllers/paymentController');
const paymentRoutes = require('../../routes/paymentRoutes');

describe('routes/paymentRoutes integration', () => {
  const app = express();
  app.use(express.json());
  app.use('/', paymentRoutes);

  it('wires POST /create-order to controller', async () => {
    const res = await request(app).post('/create-order').send({ title: 'P' });

    expect(res.status).toBe(200);
    expect(paymentController.createOrder).toHaveBeenCalled();
  });
});
