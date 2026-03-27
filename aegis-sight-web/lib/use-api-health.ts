'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = 30_000;

export interface ServiceCheck {
  status: string;
  latency_ms?: number;
  error?: string;
  workers?: number;
  beat_scheduled_tasks?: number;
  free_gb?: number;
  total_gb?: number;
  used_percent?: number;
  last_received?: string | null;
  count?: number;
  expiring_within_30d?: number;
}

export interface HealthDetail {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  checks: Record<string, ServiceCheck>;
}

interface UseApiHealthReturn {
  health: HealthDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Poll /health/detail every 30 seconds.
 * Detects status transitions and calls `onStatusChange` when the overall
 * status or any individual service status changes.
 */
export function useApiHealth(
  onStatusChange?: (current: HealthDetail, previous: HealthDetail | null) => void
): UseApiHealthReturn {
  const [health, setHealth] = useState<HealthDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<HealthDetail | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health/detail`);
      if (!res.ok) {
        throw new Error(`Health endpoint returned ${res.status}`);
      }
      const data: HealthDetail = await res.json();

      setHealth(data);
      setError(null);

      // Detect status changes
      const prev = previousRef.current;
      if (prev && onStatusChange) {
        const changed =
          prev.status !== data.status ||
          Object.keys(data.checks).some(
            (key) => prev.checks[key]?.status !== data.checks[key]?.status
          );
        if (changed) {
          onStatusChange(data, prev);
        }
      }
      previousRef.current = data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, isLoading, error, refetch: fetchHealth };
}
