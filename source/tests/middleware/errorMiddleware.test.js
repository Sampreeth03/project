const { notFoundHandler, errorHandler } = require('../../middleware/errorMiddleware');
const { createRes } = require('../utils/httpMocks');

describe('middleware/errorMiddleware', () => {
  it('notFoundHandler forwards 404 error', () => {
    const req = { method: 'GET', originalUrl: '/missing', url: '/missing' };
    const next = jest.fn();

    notFoundHandler(req, {}, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(404);
  });

  it('errorHandler returns standard JSON response', () => {
    const err = new Error('boom');
    err.statusCode = 500;
    err.publicMessage = 'Server exploded';

    const req = { method: 'GET', originalUrl: '/x', url: '/x' };
    const res = createRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Server exploded' });
  });
});
