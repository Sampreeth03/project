process.env.NODE_ENV = 'test';
process.env.MOCK_PAYMENTS = 'true';
process.env.JWT_SECRET = 'test-secret';
process.env.LOGIN_OTP_REQUIRED = 'false';

jest.mock('./services/redisCacheService', () => ({
  getCacheValue: jest.fn(),
  setCacheValue: jest.fn().mockResolvedValue(undefined),
  deleteByPrefix: jest.fn().mockResolvedValue(undefined),
  isRedisReady: jest.fn(() => false)
}));

jest.mock('./services/cacheLoggingService', () => ({
  logCacheHit: jest.fn(),
  logCacheMiss: jest.fn(),
  logInvalidation: jest.fn()
}));

jest.mock('./services/solrClient', () => ({
  queryCollection: jest.fn()
}));

jest.mock('./services/emailService', () => ({
  isEmailConfigured: jest.fn(() => true),
  sendLoginOtpEmail: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('./services/solrSyncService', () => ({
  syncUserUpsert: jest.fn().mockResolvedValue(undefined),
  syncProjectUpsert: jest.fn().mockResolvedValue(undefined),
  syncProjectDelete: jest.fn().mockResolvedValue(undefined)
}));
