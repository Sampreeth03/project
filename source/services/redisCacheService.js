const { createClient } = require('redis');

let client = null;
let initialized = false;
let enabled = false;

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

async function initRedisCache() {
  if (initialized) return client;
  initialized = true;

  if (process.env.REDIS_ENABLED === 'false') {
    enabled = false;
    return null;
  }

  try {
    client = createClient({ url: getRedisUrl() });

    client.on('error', (err) => {
      enabled = false;
      console.warn('[Redis] Client error:', err.message);
    });

    await client.connect();
    enabled = true;
    console.log('[Redis] Connected for API caching');
    return client;
  } catch (err) {
    enabled = false;
    console.warn('[Redis] Cache disabled:', err.message);
    return null;
  }
}

function isRedisReady() {
  return Boolean(client && client.isReady && enabled);
}

async function getCacheValue(key) {
  if (!isRedisReady()) return null;
  return client.get(key);
}

async function setCacheValue(key, value, ttlSeconds) {
  if (!isRedisReady()) return;
  await client.setEx(key, ttlSeconds, value);
}

async function deleteByPrefix(prefix) {
  if (!isRedisReady()) return 0;
  let cursor = '0';
  let deleted = 0;

  do {
    const scanResult = await client.scan(cursor, {
      MATCH: `${prefix}*`,
      COUNT: 100
    });

    cursor = scanResult.cursor;
    const keys = scanResult.keys || [];
    if (keys.length > 0) {
      deleted += await client.del(keys);
    }
  } while (cursor !== '0');

  return deleted;
}

module.exports = {
  initRedisCache,
  isRedisReady,
  getCacheValue,
  setCacheValue,
  deleteByPrefix,
};
