/**
 * Redis Cache Performance Test Script
 * 
 * Compares performance with and without Redis cache
 * Collects hit/miss ratios and detailed metrics
 */

const BASE_URL = process.env.BENCH_BASE_URL || 'http://localhost:5000/api';
const LOGIN_EMAIL = process.env.BENCH_EMAIL || 'srihesh@gm.co';
const LOGIN_PASSWORD = process.env.BENCH_PASSWORD || 'Srih@12345';
const BENCH_COOKIE = process.env.BENCH_COOKIE || '';
const ENDPOINT = process.env.BENCH_ENDPOINT || '/dashboard-trends';
const REQUESTS = Number(process.env.BENCH_REQUESTS || 100);
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY || 10);

/**
 * Calculate percentile from sorted array
 */
function percentile(values, p) {
  if (values.length === 0) return 0;
  const idx = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, idx))];
}

/**
 * Login and get authentication cookie
 */
async function login() {
  if (BENCH_COOKIE.trim()) {
    return BENCH_COOKIE.trim();
  }

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Login failed (${response.status}): ${text}`);
    }

    const setCookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);

    if (!setCookies || setCookies.length === 0) {
      let body = null;
      try {
        body = await response.clone().json();
      } catch {
        body = null;
      }

      if (body?.requiresOtp || body?.requiresAuthenticator) {
        throw new Error('No auth cookie returned by login endpoint. This account requires OTP/authenticator verification. Set BENCH_COOKIE in environment to run the benchmark with an authenticated session cookie.');
      }

      throw new Error('No auth cookie returned by login endpoint');
    }

    return setCookies.map((c) => c.split(';')[0]).join('; ');
  } catch (err) {
    throw new Error(`Authentication failed: ${err.message}`);
  }
}

/**
 * Hit endpoint and collect metrics
 */
async function hitEndpoint({ cookie, bypassCache = false }) {
  const headers = { 
    Accept: 'application/json', 
    Cookie: cookie 
  };
  
  if (bypassCache) {
    headers['Cache-Control'] = 'no-cache';
  }

  const endpointUrl = new URL(`${BASE_URL}${ENDPOINT}`);
  if (bypassCache) {
    endpointUrl.searchParams.set('_cb', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  const startTime = process.hrtime.bigint();
  const response = await fetch(endpointUrl.toString(), { headers });
  const endTime = process.hrtime.bigint();

  const elapsedMs = Number(endTime - startTime) / 1e6;
  const cacheStatus = response.headers.get('X-Cache') || 'UNKNOWN';

  if (!response.ok) {
    throw new Error(`Endpoint failed (${response.status})`);
  }

  return { 
    elapsedMs, 
    cacheStatus,
    statusCode: response.status
  };
}

/**
 * Run load test
 */
async function runLoadTest({ cookie, testName, bypassCache = false }) {
  console.log(`\nRunning ${testName}...`);
  console.log(`   Requests: ${REQUESTS}, Concurrency: ${CONCURRENCY}`);
  
  const latencies = [];
  const cacheStats = { HIT: 0, MISS: 0, UNKNOWN: 0 };
  const errors = [];

  const wallStartTime = Date.now();
  
  for (let i = 0; i < REQUESTS; i += CONCURRENCY) {
    const batchSize = Math.min(CONCURRENCY, REQUESTS - i);
    const batchTasks = Array.from(
      { length: batchSize }, 
      () => hitEndpoint({ cookie, bypassCache }).catch(err => ({ error: err.message }))
    );
    
    const results = await Promise.all(batchTasks);

    for (const result of results) {
      if (result.error) {
        errors.push(result.error);
      } else {
        latencies.push(result.elapsedMs);
        cacheStats[result.cacheStatus] = (cacheStats[result.cacheStatus] || 0) + 1;
      }
    }

    // Progress indicator
    const progress = Math.min(i + batchSize, REQUESTS);
    process.stdout.write(`\r   Progress: ${progress}/${REQUESTS}`);
  }

  const wallEndTime = Date.now();
  process.stdout.write('\n');

  if (latencies.length === 0) {
    throw new Error('No successful requests completed');
  }

  latencies.sort((a, b) => a - b);

  const stats = {
    totalRequests: REQUESTS,
    successfulRequests: latencies.length,
    failedRequests: errors.length,
    wallTimeMs: wallEndTime - wallStartTime,
    avgLatencyMs: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)),
    minLatencyMs: Number(latencies[0].toFixed(2)),
    maxLatencyMs: Number(latencies[latencies.length - 1].toFixed(2)),
    p50LatencyMs: Number(percentile(latencies, 50).toFixed(2)),
    p95LatencyMs: Number(percentile(latencies, 95).toFixed(2)),
    p99LatencyMs: Number(percentile(latencies, 99).toFixed(2)),
    throughputRps: Number(((latencies.length / (wallEndTime - wallStartTime)) * 1000).toFixed(2)),
    cacheStats: {
      hits: cacheStats.HIT,
      misses: cacheStats.MISS,
      unknown: cacheStats.UNKNOWN,
      hitRatio: latencies.length > 0 ? Number(((cacheStats.HIT / latencies.length) * 100).toFixed(2)) + '%' : '0%'
    }
  };

  return stats;
}

/**
 * Main benchmark execution
 */
async function main() {
  console.log('============================================================');
  console.log('Redis Cache Performance Benchmark (Enhanced)');
  console.log('============================================================');
  console.log(`\nConfiguration:`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Endpoint: ${ENDPOINT}`);
  console.log(`   Total Requests: ${REQUESTS}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Authenticating as: ${LOGIN_EMAIL}\n`);

  try {
    // Authenticate
    console.log('Authenticating...');
    const cookie = await login();
    console.log('Authentication successful\n');

    // Warm up cache
    console.log('Warming up cache...');
    await hitEndpoint({ cookie, bypassCache: false });
    console.log('Cache warmed up\n');

    // Run uncached test (bypass cache)
    console.log('═'.repeat(60));
    const uncachedStats = await runLoadTest({ 
      cookie, 
      testName: 'UNCACHED TEST (No Cache)',
      bypassCache: true 
    });

    // Add delay between tests
    console.log('\nWaiting between tests...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Run cached test
    console.log('═'.repeat(60));
    const cachedStats = await runLoadTest({ 
      cookie, 
      testName: 'CACHED TEST (With Redis)', 
      bypassCache: false 
    });

    // Calculate improvements
    const improvements = {
      avgLatency: uncachedStats.avgLatencyMs > 0 
        ? Number(((uncachedStats.avgLatencyMs - cachedStats.avgLatencyMs) / uncachedStats.avgLatencyMs * 100).toFixed(2))
        : 0,
      p95Latency: uncachedStats.p95LatencyMs > 0
        ? Number(((uncachedStats.p95LatencyMs - cachedStats.p95LatencyMs) / uncachedStats.p95LatencyMs * 100).toFixed(2))
        : 0,
      throughput: uncachedStats.throughputRps > 0
        ? Number(((cachedStats.throughputRps - uncachedStats.throughputRps) / uncachedStats.throughputRps * 100).toFixed(2))
        : 0
    };

    // Print comprehensive report
    console.log('\n============================================================');
    console.log('PERFORMANCE REPORT');
    console.log('============================================================');

    console.log('\n UNCACHED TEST (Baseline)');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Successful Requests:     ${uncachedStats.successfulRequests}/${uncachedStats.totalRequests}`);
    console.log(`   Failed Requests:         ${uncachedStats.failedRequests}`);
    console.log(`   Wall Time:               ${uncachedStats.wallTimeMs}ms`);
    console.log(`   Average Latency:         ${uncachedStats.avgLatencyMs}ms`);
    console.log(`   Min/Max Latency:         ${uncachedStats.minLatencyMs}ms / ${uncachedStats.maxLatencyMs}ms`);
    console.log(`   P50 Latency:             ${uncachedStats.p50LatencyMs}ms`);
    console.log(`   P95 Latency:             ${uncachedStats.p95LatencyMs}ms`);
    console.log(`   P99 Latency:             ${uncachedStats.p99LatencyMs}ms`);
    console.log(`   Throughput:              ${uncachedStats.throughputRps} RPS`);

    console.log('\nCACHED TEST (With Redis)');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Successful Requests:     ${cachedStats.successfulRequests}/${cachedStats.totalRequests}`);
    console.log(`   Failed Requests:         ${cachedStats.failedRequests}`);
    console.log(`   Wall Time:               ${cachedStats.wallTimeMs}ms`);
    console.log(`   Average Latency:         ${cachedStats.avgLatencyMs}ms`);
    console.log(`   Min/Max Latency:         ${cachedStats.minLatencyMs}ms / ${cachedStats.maxLatencyMs}ms`);
    console.log(`   P50 Latency:             ${cachedStats.p50LatencyMs}ms`);
    console.log(`   P95 Latency:             ${cachedStats.p95LatencyMs}ms`);
    console.log(`   P99 Latency:             ${cachedStats.p99LatencyMs}ms`);
    console.log(`   Throughput:              ${cachedStats.throughputRps} RPS`);
    console.log(`   Cache Hit Ratio:         ${cachedStats.cacheStats.hitRatio}`);
    console.log(`   Cache Hits/Misses:       ${cachedStats.cacheStats.hits}/${cachedStats.cacheStats.misses}`);

    console.log('\n IMPROVEMENTS (Cache vs No Cache)');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Average Latency:         ${improvements.avgLatency}%`);
    console.log(`   P95 Latency:             ${improvements.p95Latency}%`);
    console.log(`   Throughput:              ${improvements.throughput}%`);

    console.log('\nDETAILED METRICS');
    console.log('───────────────────────────────────────────────────────────');
    console.log(JSON.stringify({ uncachedStats, cachedStats, improvements }, null, 2));

    console.log('\nBenchmark completed successfully.\n');
    process.exit(0);

  } catch (err) {
    console.error('\nBenchmark failed:', err.message);
    process.exit(1);
  }
}

// Run main
main();
