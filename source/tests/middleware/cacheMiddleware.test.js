const { cacheMiddleware } = require('../../middleware/cacheMiddleware');
const redisService = require('../../services/redisCacheService');
const { createRes } = require('../utils/httpMocks');

describe('middleware/cacheMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cache hit response', async () => {
    redisService.isRedisReady.mockReturnValue(true);
    redisService.getCacheValue.mockResolvedValue(JSON.stringify({ success: true, from: 'cache' }));

    const req = { query: {}, path: '/dashboard', user: { id: 'u1' } };
    const res = createRes();
    const next = jest.fn();

    await cacheMiddleware('user:dashboard')(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT');
    expect(res.json).toHaveBeenCalledWith({ success: true, from: 'cache' });
    expect(next).not.toHaveBeenCalled();
  });

  it('continues on cache miss and wraps json', async () => {
    redisService.isRedisReady.mockReturnValue(true);
    redisService.getCacheValue.mockResolvedValue(null);

    const req = { query: { p: 1 }, path: '/dashboard', user: { id: 'u1' } };
    const res = createRes();
    const next = jest.fn();

    await cacheMiddleware('user:dashboard')(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    expect(next).toHaveBeenCalled();

    res.json({ ok: true });
    expect(redisService.setCacheValue).toHaveBeenCalled();
  });
});
