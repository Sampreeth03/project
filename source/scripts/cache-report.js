/**
 * Redis Cache Report Generator
 * 
 * Generates a comprehensive Redis cache performance report
 * Retrieves metrics from cache logging service
 * 
 * Usage:
 *   node source/scripts/cache-report.js
 */

const path = require('path');
const fs = require('fs');

const {
  initRedisCache,
  getRedisMemoryInfo,
  isRedisReady,
} = require('../services/redisCacheService');

const loggingService = require('../services/cacheLoggingService');

const freshMode = process.argv.includes('--fresh') || process.argv.includes('--reset');

// Get cache metrics from logging service
function getCacheMetrics() {
  try {
    return loggingService.getMetricsFromLog();
  } catch (err) {
    console.error('Error getting cache metrics:', err.message);
    return null;
  }
}

// Get cache log entries
function getCacheLog(lines = 50) {
  try {
    return loggingService.readCacheLog(lines);
  } catch (err) {
    console.error('Error reading cache log:', err.message);
    return null;
  }
}

async function getRedisMemoryStats() {
  try {
    await initRedisCache();
    if (!isRedisReady()) {
      return null;
    }

    return await getRedisMemoryInfo();
  } catch (err) {
    console.error('Error getting Redis memory stats:', err.message);
    return null;
  }
}

// Generate report
async function generateReport() {
  if (freshMode) {
    const cleared = loggingService.clearCacheLog();
    if (!cleared) {
      console.log('Unable to clear cache log. Report will use existing history.');
    }
  }

  console.log('\n============================================================');
  console.log('Redis Cache Performance & Logging Report');
  console.log('============================================================');

  if (freshMode) {
    console.log('Fresh mode enabled: cache log history was cleared before generating this report.');
  }

  const metrics = getCacheMetrics();
  
  if (!metrics) {
    console.log('\nUnable to retrieve cache metrics. Make sure Redis cache is running.');
    return;
  }

  console.log('\nCACHE STATISTICS');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`Total Requests:          ${metrics.totalRequests}`);
  console.log(`Cache Hits:              ${metrics.hits}`);
  console.log(`Cache Misses:            ${metrics.misses}`);
  console.log(`Hit Ratio:               ${metrics.hitRatio}`);
  console.log(`Cache Invalidations:     ${metrics.invalidations}`);
  console.log(`Cache Errors:            ${metrics.errors}`);

  console.log('\nTIMING INFORMATION');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`Uptime:                  ${(metrics.uptime / 1000).toFixed(2)}s`);
  console.log(`Average Hit Time:        ${metrics.averageHitTime}ms`);

  const redisMemory = await getRedisMemoryStats();
  console.log('\nREDIS MEMORY USAGE');
  console.log('───────────────────────────────────────────────────────────');
  if (redisMemory) {
    console.log(`Used Memory:             ${redisMemory.usedMemoryHuman}`);
    console.log(`Peak Memory:             ${redisMemory.usedMemoryPeakHuman}`);
    console.log(`RSS Memory:              ${redisMemory.usedMemoryRssHuman}`);
    console.log(`Max Memory:              ${redisMemory.maxMemoryHuman}`);
    console.log(`Fragmentation Ratio:     ${redisMemory.memFragmentationRatio}`);
  } else {
    console.log('Redis memory stats unavailable');
  }

  console.log('\nRECENT CACHE EVENTS (Last 20 entries)');
  console.log('───────────────────────────────────────────────────────────');
  const logEntries = getCacheLog(20);
  if (logEntries) {
    const lines = logEntries.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (line.includes('HIT')) {
        console.log('[HIT] ' + line.substring(0, 120));
      } else if (line.includes('MISS')) {
        console.log('[MISS] ' + line.substring(0, 120));
      } else if (line.includes('INVALIDATE')) {
        console.log('[INVALIDATE] ' + line.substring(0, 120));
      } else if (line.includes('ERROR')) {
        console.log('[ERROR] ' + line.substring(0, 120));
      } else {
        console.log('[INFO] ' + line.substring(0, 120));
      }
    });
  }

  console.log('\nINTERPRETATION');
  console.log('───────────────────────────────────────────────────────────');
  
  if (metrics.hitRatio && parseFloat(metrics.hitRatio) > 80) {
    console.log('Excellent cache hit ratio (>80%)');
    console.log('   Redis is effectively caching frequently accessed data');
  } else if (metrics.hitRatio && parseFloat(metrics.hitRatio) > 50) {
    console.log('Moderate cache hit ratio (50-80%)');
    console.log('   Consider extending TTLs or reviewing cache key strategy');
  } else {
    console.log('Low cache hit ratio (<50%)');
    console.log('   Review cache configuration and TTL settings');
  }

  if (metrics.errors > 0) {
    console.log(`\nDetected ${metrics.errors} cache errors`);
    console.log('   Check Redis connection and error logs');
  }

  console.log('\nReport generated successfully.\n');
}

// Run report
generateReport().catch(err => {
  console.error('Failed to generate cache report:', err.message);
  process.exitCode = 1;
});
