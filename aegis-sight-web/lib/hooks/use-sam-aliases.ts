'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createSamAlias,
  deleteSamAlias,
  fetchSamLicense,
  fetchSamLicenseAliases,
  updateSamAlias,
} from '@/lib/api';
import type { SamLicense, SamSkuAlias } from '@/lib/types';

interface UseSamAliasesResult {
  license: SamLicense | null;
  aliases: SamSkuAlias[];
  loading: boolean;
  error: string | null;
  addAlias:    (skuPartNumber: string) => Promise<void>;
  editAlias:   (aliasId: string, skuPartNumber: string) => Promise<void>;
  removeAlias: (aliasId: string) => Promise<void>;
  refetch:     () => void;
}

export function useSamAliases(licenseId: string): UseSamAliasesResult {
  const [license, setLicense] = useState<SamLicense | null>(null);
  const [aliases,  setAliases]  = useState<SamSkuAlias[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lic, als] = await Promise.all([
        fetchSamLicense(licenseId),
        fetchSamLicenseAliases(licenseId),
      ]);
      setLicense(lic);
      setAliases(als);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [licenseId]);

  useEffect(() => { load(); }, [load]);

  const addAlias = useCallback(async (skuPartNumber: string) => {
    const created = await createSamAlias(licenseId, skuPartNumber);
    setAliases(prev => [...prev, created]);
  }, [licenseId]);

  const editAlias = useCallback(async (aliasId: string, skuPartNumber: string) => {
    const updated = await updateSamAlias(aliasId, skuPartNumber);
    setAliases(prev => prev.map(a => a.id === aliasId ? updated : a));
  }, []);

  const removeAlias = useCallback(async (aliasId: string) => {
    await deleteSamAlias(aliasId);
    setAliases(prev => prev.filter(a => a.id !== aliasId));
  }, []);

  return { license, aliases, loading, error, addAlias, editAlias, removeAlias, refetch: load };
}
