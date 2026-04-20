/**
 * Cache Middleware
 * Automatically handles caching for read endpoints
 */

const { getCacheValue, setCacheValue, deleteByPrefix, isRedisReady } = require('../services/redisCacheService');
const { logCacheHit, logCacheMiss } = require('../services/cacheLoggingService');

const DEFAULT_CACHE_TTLS = {
  default: Number(process.env.CACHE_TTL_DEFAULT || 900),
  userDashboard: Number(process.env.CACHE_TTL_USER_DASHBOARD || process.env.CACHE_TTL_DASHBOARD || 45),
  userProfile: Number(process.env.CACHE_TTL_USER_PROFILE || 1800),
  friends: Number(process.env.CACHE_TTL_FRIENDS || 20),
  project: Number(process.env.CACHE_TTL_PROJECTS || 600),
  recruiter: Number(process.env.CACHE_TTL_RECRUITER || 45),
  admin: Number(process.env.CACHE_TTL_ADMIN || process.env.CACHE_TTL_DEFAULT || 60),
  topic: Number(process.env.CACHE_TTL_PROJECTS || 600),
  message: Number(process.env.CACHE_TTL_MESSAGE || 20),
  job: Number(process.env.CACHE_TTL_JOB || 30),
  doubt: Number(process.env.CACHE_TTL_DOUBT || 20),
  public: Number(process.env.CACHE_TTL_PUBLIC || 20),
  notifications: Number(process.env.CACHE_TTL_NOTIFICATIONS || 20),
};

function resolveCacheTtl(ttlSeconds, scope = 'default') {
  if (Number.isFinite(Number(ttlSeconds))) {
    return Number(ttlSeconds);
  }

  return DEFAULT_CACHE_TTLS[scope] || DEFAULT_CACHE_TTLS.default;
}

/**
 * Generate cache key from route and parameters
 */
function generateCacheKey(baseKey, req) {
  const queryString = Object.keys(req.query)
    .sort()
    .map(k => `${k}=${req.query[k]}`)
    .join('&');
  
  return queryString ? `${baseKey}?${queryString}` : baseKey;
}

/**
 * Cache middleware for GET requests
 * Usage: app.get('/endpoint', cacheMiddleware('cache-key-name', 300), controller);
 */
const cacheMiddleware = (cacheKeyGenerator, ttlSeconds = 900) => {
  return async (req, res, next) => {
    if (!isRedisReady()) {
      return next();
    }

    try {
      const requestStartTime = Date.now();

      // Generate cache key
      const cacheKey = typeof cacheKeyGenerator === 'function' 
        ? cacheKeyGenerator(req)
        : generateCacheKey(cacheKeyGenerator, req);

      // Check cache
      const cachedData = await getCacheValue(cacheKey);

      if (cachedData) {
        const responseTime = Date.now() - requestStartTime;
        logCacheHit(cacheKey, req.user?.id, req.path, responseTime);
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedData));
      }

      res.set('X-Cache', 'MISS');

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);
      res.json = function(data) {
        // Calculate response time for MISS (log after data is fetched)
        const responseTime = Date.now() - requestStartTime;
        logCacheMiss(cacheKey, req.user?.id, req.path, null, responseTime);
        
        // Cache the response
        setCacheValue(cacheKey, JSON.stringify(data), ttlSeconds).catch(err => {
          console.error('[CacheMiddleware] Error setting cache:', err.message);
        });
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('[CacheMiddleware] Error:', err.message);
      next();
    }
  };
};

/**
 * Invalidation middleware for write operations
 * Usage: app.post('/endpoint', invalidateCache(['pattern1', 'pattern2']), controller);
 */
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    if (!isRedisReady()) {
      return next();
    }

    // Store patterns for invalidation after response
    req.cacheInvalidatePatterns = Array.isArray(patterns) ? patterns : [patterns];
    
    // Intercept res.json to invalidate after response sent
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Invalidate cache patterns after response
      if (req.cacheInvalidatePatterns) {
        req.cacheInvalidatePatterns.forEach(pattern => {
          deleteByPrefix(pattern).catch(err => {
            console.error('[CacheMiddleware] Error invalidating cache:', err.message);
          });
        });
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Manual cache invalidation helper
 */
const manualInvalidate = (patterns) => {
  if (!isRedisReady()) {
    return Promise.resolve();
  }

  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
  return Promise.all(
    patternsArray.map(pattern => deleteByPrefix(pattern))
  );
};

/**
 * Structured cache route wrapper
 * Usage: cacheRoute({ ttlSeconds: 300, scope: 'user' })
 */
const cacheRoute = (options = {}) => {
  const { ttlSeconds, scope = 'default' } = options;
  const resolvedTtl = resolveCacheTtl(ttlSeconds, scope);
  
  return (req, res, next) => {
    const cacheKeyBase = `${scope}:${req.path}:${req.user?.id || 'anon'}`;
    return cacheMiddleware(cacheKeyBase, resolvedTtl)(req, res, next);
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  manualInvalidate,
  generateCacheKey,
  cacheRoute,
  resolveCacheTtl,
};
