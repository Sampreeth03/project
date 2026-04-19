const express = require('express');
const request = require('supertest');
const { validateLogin, validateProjectCreation, validateEmail } = require('../../middleware/validationMiddleware');

describe('middleware/validationMiddleware', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.post('/login', validateLogin, (req, res) => res.json({ success: true }));
    app.post('/project', validateProjectCreation, (req, res) => res.json({ success: true }));
    app.post('/email', validateEmail, (req, res) => res.json({ success: true }));
    return app;
  };

  it('rejects invalid payload', async () => {
    const app = buildApp();
    const res = await request(app).post('/login').send({ email: 'bad-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('accepts valid payload', async () => {
    const app = buildApp();
    const res = await request(app).post('/login').send({ email: 'user@example.com', password: 'Pass@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects invalid project payload', async () => {
    const app = buildApp();
    const res = await request(app).post('/project').send({
      title: 'bad',
      description: 'tiny',
      topic: '',
      capacity: 1,
      deadline: ''
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('accepts valid email-only payload and rejects bad email', async () => {
    const app = buildApp();
    const ok = await request(app).post('/email').send({ email: 'valid@example.com' });
    const bad = await request(app).post('/email').send({ email: 'not-email' });

    expect(ok.status).toBe(200);
    expect(bad.status).toBe(400);
  });
});
