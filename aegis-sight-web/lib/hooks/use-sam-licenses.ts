'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSamLicenses } from '@/lib/api';
import type { SamLicense } from '@/lib/types';

interface UseSamLicensesResult {
  licenses: SamLicense[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSamLicenses(vendor?: string): UseSamLicensesResult {
  const [licenses, setLicenses] = useState<SamLicense[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSamLicenses(0, 200, vendor);
      setLicenses(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ライセンス一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => { load(); }, [load]);

  return { licenses, total, loading, error, refetch: load };
}
