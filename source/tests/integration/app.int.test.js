const request = require('supertest');
const app = require('../../app');

describe('app.js integration', () => {
  it('redirects /api-docs to /api/docs', async () => {
    const res = await request(app).get('/api-docs');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api/docs');
  });

  it('returns standard not-found payload for unknown endpoint', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({ success: false, error: 'Not Found' }));
  });
});
