"""
AEGIS-SIGHT -- Database query benchmark.

Measures response time of key database queries to identify bottlenecks and
validate that indexes (including BRIN indexes on timestamp columns) are
effective.

Usage:
    cd aegis-sight-api
    python -m tests.performance.db_benchmark

Environment:
    DATABASE_URL  PostgreSQL connection string
                  (default: postgresql+asyncpg://aegis:aegis@localhost:5432/aegis_sight)
"""

import asyncio
import os
import statistics
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://aegis:aegis@localhost:5432/aegis_sight",
)
ITERATIONS = 10

# ---------------------------------------------------------------------------
# Lazy model imports -- only needed when the ORM is bootstrapped
# ---------------------------------------------------------------------------
_models_loaded = False


def _ensure_models():
    global _models_loaded
    if _models_loaded:
        return
    # Import models so SQLAlchemy metadata is populated.
    import app.models.device  # noqa: F401
    import app.models.license  # noqa: F401
    import app.models.log_event  # noqa: F401

    _models_loaded = True


# ---------------------------------------------------------------------------
# Engine / Session factory
# ---------------------------------------------------------------------------
engine = create_async_engine(DATABASE_URL, echo=False, pool_size=5)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Benchmark harness
# ---------------------------------------------------------------------------
class BenchmarkResult:
    """Stores timing results for a single benchmark."""

    def __init__(self, name: str, times: list[float]):
        self.name = name
        self.times = times  # seconds

    @property
    def min_ms(self) -> float:
        return min(self.times) * 1000

    @property
    def max_ms(self) -> float:
        return max(self.times) * 1000

    @property
    def mean_ms(self) -> float:
        return statistics.mean(self.times) * 1000

    @property
    def median_ms(self) -> float:
        return statistics.median(self.times) * 1000

    @property
    def p95_ms(self) -> float:
        sorted_times = sorted(self.times)
        idx = int(len(sorted_times) * 0.95)
        return sorted_times[min(idx, len(sorted_times) - 1)] * 1000


async def run_benchmark(name: str, query_fn, iterations: int = ITERATIONS) -> BenchmarkResult:
    """Execute *query_fn* repeatedly and collect timing data."""
    times: list[float] = []
    for _ in range(iterations):
        async with async_session() as session:
            start = time.perf_counter()
            await query_fn(session)
            elapsed = time.perf_counter() - start
            times.append(elapsed)
    return BenchmarkResult(name, times)


# ---------------------------------------------------------------------------
# Benchmark queries
# ---------------------------------------------------------------------------
async def bench_device_list_500(session: AsyncSession):
    """SELECT first 500 devices ordered by created_at DESC."""
    result = await session.execute(
        text("SELECT * FROM devices ORDER BY created_at DESC LIMIT 500")
    )
    result.fetchall()


async def bench_device_count(session: AsyncSession):
    """COUNT(*) on devices table."""
    result = await session.execute(text("SELECT COUNT(*) FROM devices"))
    result.scalar()


async def bench_license_compliance(session: AsyncSession):
    """License compliance check: compare purchased_count vs installed_count."""
    result = await session.execute(
        text(
            """
            SELECT id, software_name, purchased_count, installed_count,
                   CASE WHEN installed_count > purchased_count THEN true ELSE false END AS over_deployed
            FROM software_licenses
            ORDER BY software_name
            """
        )
    )
    result.fetchall()


async def bench_logon_events_date_range(session: AsyncSession):
    """Logon events filtered by date range (exercises BRIN index on timestamp)."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)
    result = await session.execute(
        text(
            """
            SELECT * FROM logon_events
            WHERE timestamp >= :start AND timestamp <= :end
            ORDER BY timestamp DESC
            LIMIT 100
            """
        ),
        {"start": start, "end": now},
    )
    result.fetchall()


async def bench_logon_events_no_index_hint(session: AsyncSession):
    """Logon events with sequential scan (for BRIN comparison)."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)
    # Force seq scan to measure baseline
    await session.execute(text("SET LOCAL enable_indexscan = off"))
    await session.execute(text("SET LOCAL enable_bitmapscan = off"))
    result = await session.execute(
        text(
            """
            SELECT * FROM logon_events
            WHERE timestamp >= :start AND timestamp <= :end
            ORDER BY timestamp DESC
            LIMIT 100
            """
        ),
        {"start": start, "end": now},
    )
    result.fetchall()
    await session.execute(text("SET LOCAL enable_indexscan = on"))
    await session.execute(text("SET LOCAL enable_bitmapscan = on"))


async def bench_usb_events_search(session: AsyncSession):
    """USB events search (recent 30 days)."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=30)
    result = await session.execute(
        text(
            """
            SELECT * FROM usb_events
            WHERE timestamp >= :start AND timestamp <= :end
            ORDER BY timestamp DESC
            LIMIT 100
            """
        ),
        {"start": start, "end": now},
    )
    result.fetchall()


async def bench_device_with_security_join(session: AsyncSession):
    """Devices joined with latest security status."""
    result = await session.execute(
        text(
            """
            SELECT d.hostname, d.status, s.defender_on, s.bitlocker_on, s.pending_patches
            FROM devices d
            LEFT JOIN security_statuses s ON s.device_id = d.id
            ORDER BY d.hostname
            LIMIT 200
            """
        )
    )
    result.fetchall()


# ---------------------------------------------------------------------------
# BRIN index effect measurement
# ---------------------------------------------------------------------------
async def bench_brin_effect():
    """Compare query times with and without BRIN index."""
    with_index = await run_benchmark(
        "Logon events (with BRIN index)", bench_logon_events_date_range
    )
    without_index = await run_benchmark(
        "Logon events (seq scan, no index)", bench_logon_events_no_index_hint
    )
    return with_index, without_index


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    _ensure_models()

    print("=" * 78)
    print("AEGIS-SIGHT Database Benchmark")
    print(f"Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print(f"Iterations per query: {ITERATIONS}")
    print("=" * 78)
    print()

    benchmarks = [
        ("Device list (500 rows)", bench_device_list_500),
        ("Device count", bench_device_count),
        ("License compliance check", bench_license_compliance),
        ("Logon events (7-day range)", bench_logon_events_date_range),
        ("USB events (30-day range)", bench_usb_events_search),
        ("Device + Security join", bench_device_with_security_join),
    ]

    results: list[BenchmarkResult] = []

    for name, fn in benchmarks:
        try:
            result = await run_benchmark(name, fn)
            results.append(result)
            print(f"  [OK] {name}: median={result.median_ms:.1f}ms  p95={result.p95_ms:.1f}ms")
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")

    # BRIN index comparison
    print()
    print("--- BRIN Index Effect ---")
    try:
        with_idx, without_idx = await bench_brin_effect()
        results.extend([with_idx, without_idx])
        speedup = without_idx.median_ms / with_idx.median_ms if with_idx.median_ms > 0 else 0
        print(f"  With BRIN index:    median={with_idx.median_ms:.1f}ms  p95={with_idx.p95_ms:.1f}ms")
        print(f"  Without (seq scan): median={without_idx.median_ms:.1f}ms  p95={without_idx.p95_ms:.1f}ms")
        print(f"  Speedup:            {speedup:.1f}x")
    except Exception as e:
        print(f"  [SKIP] BRIN comparison: {e}")

    # Summary table
    print()
    print("-" * 78)
    print(f"{'Query':<40} {'Min':>8} {'Median':>8} {'Mean':>8} {'P95':>8} {'Max':>8}")
    print(f"{'':40} {'(ms)':>8} {'(ms)':>8} {'(ms)':>8} {'(ms)':>8} {'(ms)':>8}")
    print("-" * 78)
    for r in results:
        print(
            f"{r.name:<40} {r.min_ms:>8.1f} {r.median_ms:>8.1f} "
            f"{r.mean_ms:>8.1f} {r.p95_ms:>8.1f} {r.max_ms:>8.1f}"
        )
    print("-" * 78)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
