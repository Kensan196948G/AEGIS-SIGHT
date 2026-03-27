# Performance Tests

This directory contains performance and load testing tools for the AEGIS-SIGHT API.

## Prerequisites

```bash
# Python dependencies (Locust + DB benchmark)
pip install locust sqlalchemy asyncpg

# k6 (https://k6.io/docs/get-started/installation/)
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# macOS
brew install k6
```

## Running the API Server

All tests require a running API server. Start the development environment:

```bash
make dev
```

## Locust Load Test

Interactive UI (browser at http://localhost:8089):

```bash
cd aegis-sight-api
locust -f tests/performance/locustfile.py
```

Headless mode with config:

```bash
cd aegis-sight-api
locust -f tests/performance/locustfile.py --config tests/performance/locust.conf
```

Or via Makefile:

```bash
make load-test
```

### Configuration

Edit `locust.conf` or override via CLI:

| Parameter    | Default               | Description              |
|--------------|-----------------------|--------------------------|
| `host`       | http://localhost:8000 | API base URL             |
| `users`      | 100                   | Total concurrent users   |
| `spawn-rate` | 10                    | Users spawned per second |
| `run-time`   | 5m                    | Test duration            |

### Scenarios

- **AegisSightUser** (weight=1): Authenticated dashboard user browsing stats, assets, licenses, logs, security, and alerts.
- **AgentTelemetryUser** (weight=3): Simulates endpoint agents sending telemetry payloads.

## k6 Performance Test

Run all scenarios (smoke -> load -> stress):

```bash
k6 run aegis-sight-api/tests/performance/k6-load-test.js
```

Run a single scenario:

```bash
# Set environment variable to filter
k6 run --env BASE_URL=http://localhost:8000 aegis-sight-api/tests/performance/k6-load-test.js
```

### Scenarios

| Scenario | VUs  | Duration | Purpose                      |
|----------|------|----------|------------------------------|
| smoke    | 1    | 1 min    | Quick sanity check           |
| load     | 50   | 5 min    | Normal operating conditions  |
| stress   | 100  | 10 min   | Peak load / breaking point   |

### Thresholds

- HTTP error rate < 5%
- p95 response time < 500ms

## API Benchmark

Quick curl-based endpoint timing:

```bash
./scripts/benchmark.sh          # table output
./scripts/benchmark.sh --json   # JSON output
make benchmark
```

## Database Benchmark

Measures individual query performance against PostgreSQL:

```bash
cd aegis-sight-api
python -m tests.performance.db_benchmark
```

Queries benchmarked:
- Device list (500 rows)
- Device count
- License compliance check
- Logon events (7-day date range)
- USB events (30-day search)
- Device + Security status join
- BRIN index effectiveness comparison

## Grafana Dashboard

Import `aegis-sight-infra/observability/grafana/dashboards/api-performance.json` into Grafana to visualize:

- API response time percentiles (p50/p95/p99)
- Request rate (req/s)
- Error rate (4xx/5xx)
- Database query latency
- Redis cache hit rate
- Active DB connections
- Request duration heatmap
