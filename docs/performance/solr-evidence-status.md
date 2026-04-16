# Solr Evidence Status

## Current Result

- Solr setup/index could not be completed on this machine because no Solr runtime is available.
- API search endpoints are currently running in fallback mode (MongoDB), confirmed by `"source":"fallback"` in response payload.

## Captured Proof Files

- `docs/performance/search-response-current.json`
- `docs/performance/search-timing-current.txt`

## Blocking Error Evidence

- `docker info` failed because Docker daemon socket is unavailable.
- `npm run solr:setup` failed before this fix due to `spawn solr.cmd ENOENT`.
- `npm run solr:index` failed for the same Solr binary issue when Solr was not already online.

## Code Fix Applied

- Updated `source/scripts/solrUtils.js` so Solr binary resolution is cross-platform:
  - Uses `solr` on macOS/Linux and `solr.cmd` on Windows by default.
  - Supports `SOLR_BIN=solr` (command in PATH) and only checks file existence when a path is provided.

## How To Complete Solr Proof On Your Machine

1. Start Docker Desktop (or Colima) so `docker info` succeeds.
2. Start Solr in cloud mode:

```bash
cd source
docker rm -f relab-solr >/dev/null 2>&1 || true
docker run -d --name relab-solr -p 8983:8983 solr:9 solr -c -f
```

3. Run setup and indexing with root `.env` loaded:

```bash
cd source
node -r dotenv/config scripts/solrSetup.js dotenv_config_path=../.env
node -r dotenv/config scripts/solrIndex.js dotenv_config_path=../.env
```

4. Re-run API checks and timing capture:

```bash
cd source
COOKIE="token=<valid_jwt_cookie_here>"
curl -sS -H "Cookie: $COOKIE" "http://localhost:5000/api/search/projects?q=web&rows=10&page=1" | tee ../docs/performance/search-response-solr.json

{
  echo "search/projects";
  curl -sS -o /dev/null -w "http:%{http_code} time_total:%{time_total}\n" -H "Cookie: $COOKIE" "http://localhost:5000/api/search/projects?q=web&rows=10&page=1";
  echo "search/users";
  curl -sS -o /dev/null -w "http:%{http_code} time_total:%{time_total}\n" -H "Cookie: $COOKIE" "http://localhost:5000/api/search/users?q=sri&rows=10&page=1";
  echo "search/jobs";
  curl -sS -o /dev/null -w "http:%{http_code} time_total:%{time_total}\n" -H "Cookie: $COOKIE" "http://localhost:5000/api/search/jobs?q=developer&rows=10&page=1";
} | tee ../docs/performance/search-timing-solr.txt
```

5. Confirm success criteria:

- `search-response-solr.json` should show `"source":"solr"` or no fallback error.
- Compare `search-timing-current.txt` vs `search-timing-solr.txt` for latency improvement.
