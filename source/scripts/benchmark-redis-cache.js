/* eslint-disable no-console */

const BASE_URL = process.env.BENCH_BASE_URL || 'http://localhost:5000/api';
const LOGIN_EMAIL = process.env.BENCH_EMAIL || 'srihesh@gm.co';
const LOGIN_PASSWORD = process.env.BENCH_PASSWORD || 'Srih@12345';
const ENDPOINT = process.env.BENCH_ENDPOINT || '/dashboard-trends';
const REQUESTS = Number(process.env.BENCH_REQUESTS || 120);
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY || 12);

function percentile(values, p) {
  if (values.length === 0) return 0;
  const idx = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, idx))];
}

async function login() {
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
    throw new Error('No auth cookie returned by login endpoint');
  }

  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

async function hitEndpoint({ cookie, bypass }) {
  const headers = { Accept: 'application/json', Cookie: cookie };
  if (bypass) headers['x-cache-bypass'] = '1';

  const t0 = process.hrtime.bigint();
  const response = await fetch(`${BASE_URL}${ENDPOINT}`, { headers });
  const t1 = process.hrtime.bigint();

  const elapsedMs = Number(t1 - t0) / 1e6;
  const cacheHeader = response.headers.get('x-redis-cache') || 'NONE';

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Endpoint failed (${response.status}): ${text}`);
  }

  return { elapsedMs, cacheHeader };
}

async function runLoad({ cookie, bypass }) {
  const latencies = [];
  const cacheCounts = {};

  const started = Date.now();
  for (let i = 0; i < REQUESTS; i += CONCURRENCY) {
    const size = Math.min(CONCURRENCY, REQUESTS - i);
    const tasks = Array.from({ length: size }, () => hitEndpoint({ cookie, bypass }));
    const results = await Promise.all(tasks);

    for (const result of results) {
      latencies.push(result.elapsedMs);
      cacheCounts[result.cacheHeader] = (cacheCounts[result.cacheHeader] || 0) + 1;
    }
  }
  const ended = Date.now();

  latencies.sort((a, b) => a - b);

  const totalMs = ended - started;
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const rps = (REQUESTS / totalMs) * 1000;

  return {
    requests: REQUESTS,
    concurrency: CONCURRENCY,
    totalMs,
    avgMs: Number(avg.toFixed(2)),
    p50Ms: Number(p50.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    p99Ms: Number(p99.toFixed(2)),
    rps: Number(rps.toFixed(2)),
    cacheCounts
  };
}

async function main() {
  console.log('Redis cache benchmark starting...');
  console.log(`Target endpoint: ${BASE_URL}${ENDPOINT}`);

  const cookie = await login();

  // Warm cache once
  await hitEndpoint({ cookie, bypass: false });

  const uncached = await runLoad({ cookie, bypass: true });
  const cached = await runLoad({ cookie, bypass: false });

  const latencyImprovement = uncached.avgMs > 0
    ? ((uncached.avgMs - cached.avgMs) / uncached.avgMs) * 100
    : 0;
  const p95Improvement = uncached.p95Ms > 0
    ? ((uncached.p95Ms - cached.p95Ms) / uncached.p95Ms) * 100
    : 0;
  const throughputImprovement = uncached.rps > 0
    ? ((cached.rps - uncached.rps) / uncached.rps) * 100
    : 0;

  const report = {
    endpoint: `${BASE_URL}${ENDPOINT}`,
    uncached,
    cached,
    improvement: {
      avgLatencyPercent: Number(latencyImprovement.toFixed(2)),
      p95LatencyPercent: Number(p95Improvement.toFixed(2)),
      throughputPercent: Number(throughputImprovement.toFixed(2))
    }
  };

  console.log('\n=== Redis Cache Performance Report ===');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
});
