const { createClient } = require('redis');

let client = null;
let initialized = false;
let enabled = false;
let connectionErrorLogged = false;

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

async function initRedisCache() {
  if (initialized) return client;
  initialized = true;

  if (process.env.REDIS_ENABLED === 'false' || process.env.REDIS_ENABLED === '0') {
    enabled = false;
    return null;
  }

  try {
    client = createClient({
      url: getRedisUrl(),
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: () => false,
      },
    });

    client.on('error', (err) => {
      enabled = false;
      if (!connectionErrorLogged) {
        connectionErrorLogged = true;
        console.warn('[Redis] Client error:', err.message);
        console.warn('[Redis] Cache disabled until Redis becomes available.');
      }
    });

    client.on('end', () => {
      enabled = false;
      console.warn('[Redis] Connection closed. Cache disabled.');
    });

    await client.connect();
    enabled = true;
    connectionErrorLogged = false;
    console.log('[Redis] Connected for API caching');
    return client;
  } catch (err) {
    enabled = false;
    client = null;
    if (!connectionErrorLogged) {
      connectionErrorLogged = true;
      console.warn('[Redis] Cache disabled:', err.message);
    }
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

async function getRedisMemoryInfo() {
  if (!isRedisReady()) return null;

  const info = await client.info('memory');
  const memory = {};

  for (const line of info.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    memory[key] = value;
  }

  return {
    usedMemory: memory.used_memory || '0',
    usedMemoryHuman: memory.used_memory_human || '0B',
    usedMemoryPeak: memory.used_memory_peak || '0',
    usedMemoryPeakHuman: memory.used_memory_peak_human || '0B',
    usedMemoryRss: memory.used_memory_rss || '0',
    usedMemoryRssHuman: memory.used_memory_rss_human || '0B',
    memFragmentationRatio: memory.mem_fragmentation_ratio || '0',
    maxMemory: memory.maxmemory || '0',
    maxMemoryHuman: memory.maxmemory_human || '0B',
  };
}

module.exports = {
  initRedisCache,
  isRedisReady,
  getCacheValue,
  setCacheValue,
  deleteByPrefix,
  getRedisMemoryInfo,
};
