/**
 * Cache Logging Service
 * Tracks cache hits, misses, and invalidation events for monitoring
 */

const fs = require('fs');
const path = require('path');

// In-memory metrics (could be persisted to DB later)
const metrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  errors: 0,
  startTime: Date.now(),
  lastReset: Date.now(),
};

// Log directory
const logDir = path.join(__dirname, '../logs');
const cacheLogFile = path.join(logDir, 'cache-events.log');

/**
 * Ensure log directory exists
 */
function ensureLogDirectory() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Write event to log file
 */
function writeLog(event) {
  try {
    ensureLogDirectory();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event.type.toUpperCase()}: ${JSON.stringify(event.data)}\n`;
    fs.appendFileSync(cacheLogFile, logEntry);
  } catch (err) {
    console.error('[CacheLogger] Error writing log:', err.message);
  }
}

/**
 * Log cache hit
 */
function logCacheHit(key, userId = null, endpoint = null) {
  metrics.hits++;
  const event = {
    type: 'HIT',
    data: {
      key,
      userId,
      endpoint,
      timestamp: Date.now(),
    },
  };
  writeLog(event);
  return event;
}

/**
 * Log cache miss
 */
function logCacheMiss(key, userId = null, endpoint = null, fetchTime = null) {
  metrics.misses++;
  const event = {
    type: 'MISS',
    data: {
      key,
      userId,
      endpoint,
      fetchTime,
      timestamp: Date.now(),
    },
  };
  writeLog(event);
  return event;
}

/**
 * Log cache invalidation
 */
function logInvalidation(action, keysInvalidated, userId = null, relatedId = null) {
  metrics.invalidations++;
  const event = {
    type: 'INVALIDATE',
    data: {
      action,
      keysInvalidated: Array.isArray(keysInvalidated) ? keysInvalidated : [keysInvalidated],
      userId,
      relatedId,
      count: Array.isArray(keysInvalidated) ? keysInvalidated.length : 1,
      timestamp: Date.now(),
    },
  };
  writeLog(event);
  return event;
}

/**
 * Log cache error
 */
function logCacheError(operation, key, error) {
  metrics.errors++;
  const event = {
    type: 'ERROR',
    data: {
      operation,
      key,
      error: error.message || String(error),
      timestamp: Date.now(),
    },
  };
  writeLog(event);
  return event;
}

/**
 * Get current metrics
 */
function getMetrics() {
  const uptime = Date.now() - metrics.startTime;
  const totalRequests = metrics.hits + metrics.misses;
  const hitRatio = totalRequests > 0 ? ((metrics.hits / totalRequests) * 100).toFixed(2) : 0;

  return {
    ...metrics,
    uptime,
    totalRequests,
    hitRatio: `${hitRatio}%`,
    averageHitTime: metrics.hits > 0 ? (uptime / metrics.hits).toFixed(2) : 0,
  };
}

/**
 * Reset metrics (for testing)
 */
function resetMetrics() {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.invalidations = 0;
  metrics.errors = 0;
  metrics.lastReset = Date.now();
}

/**
 * Generate cache performance report
 */
function generateReport() {
  const currentMetrics = getMetrics();
  const report = `
=== Cache Performance Report ===
Generated: ${new Date().toISOString()}

Metrics:
- Total Requests: ${currentMetrics.totalRequests}
- Cache Hits: ${currentMetrics.hits}
- Cache Misses: ${currentMetrics.misses}
- Hit Ratio: ${currentMetrics.hitRatio}
- Invalidations: ${currentMetrics.invalidations}
- Errors: ${currentMetrics.errors}

Timing:
- Uptime: ${(currentMetrics.uptime / 1000).toFixed(2)}s
- Average Hit Response: ${currentMetrics.averageHitTime}ms

  `;
  return report;
}

/**
 * Read cache log file
 */
function readCacheLog(lines = 100) {
  try {
    if (!fs.existsSync(cacheLogFile)) {
      return 'No cache log file found';
    }
    const content = fs.readFileSync(cacheLogFile, 'utf8');
    const allLines = content.split('\n').filter(l => l.trim());
    return allLines.slice(-lines).join('\n');
  } catch (err) {
    console.error('[CacheLogger] Error reading log:', err.message);
    return 'Error reading cache log';
  }
}

/**
 * Clear persisted cache log file so a fresh run can start from zero.
 */
function clearCacheLog() {
  try {
    ensureLogDirectory();
    fs.writeFileSync(cacheLogFile, '');
    resetMetrics();
    return true;
  } catch (err) {
    console.error('[CacheLogger] Error clearing log:', err.message);
    return false;
  }
}

/**
 * Parse persisted log file and derive stable metrics across process restarts.
 */
function getMetricsFromLog() {
  try {
    if (!fs.existsSync(cacheLogFile)) {
      return {
        hits: 0,
        misses: 0,
        invalidations: 0,
        errors: 0,
        totalRequests: 0,
        hitRatio: '0%',
        uptime: 0,
        averageHitTime: 0,
        firstEventAt: null,
        lastEventAt: null,
      };
    }

    const content = fs.readFileSync(cacheLogFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    let hits = 0;
    let misses = 0;
    let invalidations = 0;
    let errors = 0;
    let firstEventAt = null;
    let lastEventAt = null;

    for (const line of lines) {
      if (line.includes(' HIT: ')) hits++;
      else if (line.includes(' MISS: ')) misses++;
      else if (line.includes(' INVALIDATE: ')) invalidations++;
      else if (line.includes(' ERROR: ')) errors++;

      const match = line.match(/^\[(.*?)\]/);
      if (match && match[1]) {
        const ts = Date.parse(match[1]);
        if (!Number.isNaN(ts)) {
          if (firstEventAt === null || ts < firstEventAt) firstEventAt = ts;
          if (lastEventAt === null || ts > lastEventAt) lastEventAt = ts;
        }
      }
    }

    const totalRequests = hits + misses;
    const hitRatio = totalRequests > 0 ? `${((hits / totalRequests) * 100).toFixed(2)}%` : '0%';
    const uptime = firstEventAt && lastEventAt ? (lastEventAt - firstEventAt) : 0;
    const averageHitTime = hits > 0 && uptime > 0 ? (uptime / hits).toFixed(2) : 0;

    return {
      hits,
      misses,
      invalidations,
      errors,
      totalRequests,
      hitRatio,
      uptime,
      averageHitTime,
      firstEventAt,
      lastEventAt,
    };
  } catch (err) {
    console.error('[CacheLogger] Error parsing cache log metrics:', err.message);
    return {
      hits: 0,
      misses: 0,
      invalidations: 0,
      errors: 0,
      totalRequests: 0,
      hitRatio: '0%',
      uptime: 0,
      averageHitTime: 0,
      firstEventAt: null,
      lastEventAt: null,
    };
  }
}

module.exports = {
  logCacheHit,
  logCacheMiss,
  logInvalidation,
  logCacheError,
  getMetrics,
  getMetricsFromLog,
  resetMetrics,
  clearCacheLog,
  generateReport,
  readCacheLog,
};
