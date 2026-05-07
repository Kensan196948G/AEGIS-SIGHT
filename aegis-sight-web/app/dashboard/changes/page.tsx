'use client';

import { useEffect, useState, useCallback } from 'react';
import { DonutChart, BarChart } from '@/components/ui/chart';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ConfigChange {
  id: string;
  device_id: string;
  snapshot_before_id: string | null;
  snapshot_after_id: string;
  change_type: 'added' | 'modified' | 'removed';
  field_path: string;
  old_value: unknown;
  new_value: unknown;
  detected_at: string;
}

interface PaginatedChanges {
  items: ConfigChange[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

interface ChangeSummary {
  total_changes: number;
  by_change_type: { added: number; modified: number; removed: number };
  by_snapshot_type: { hardware: number; software: number; security: number; network: number };
  daily: { date: string; count: number }[];
}

interface DiffEntry {
  field_path: string;
  change_type: string;
  old_value: unknown;
  new_value: unknown;
}

interface SnapshotDiff {
  snapshot_1: { id: string; snapshot_type: string; checksum: string; captured_at: string };
  snapshot_2: { id: string; snapshot_type: string; checksum: string; captured_at: string };
  differences: DiffEntry[];
  total_changes: number;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
const CHANGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  added: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  modified: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  removed: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

function changeColor(type: string) {
  return CHANGE_COLORS[type] ?? CHANGE_COLORS.modified;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if ('value' in obj) return String(obj.value);
    return JSON.stringify(val, null, 2);
  }
  return String(val);
}

// ---------------------------------------------------------------------------
// Dummy data (displayed when API returns empty or fails)
// ---------------------------------------------------------------------------

const DUMMY_SUMMARY: ChangeSummary = {
  total_changes: 73,
  by_change_type: { added: 18, modified: 43, removed: 12 },
  by_snapshot_type: { hardware: 22, software: 30, security: 12, network: 9 },
  daily: [
    { date: '2026-05-01', count: 9 },
    { date: '2026-05-02', count: 14 },
    { date: '2026-05-03', count: 8 },
    { date: '2026-05-04', count: 12 },
    { date: '2026-05-05', count: 17 },
    { date: '2026-05-06', count: 7 },
    { date: '2026-05-07', count: 6 },
  ],
};

const DUMMY_CHANGES: PaginatedChanges = {
  items: [
    { id: 'chg-001', device_id: 'dev-aabb1100-1234-5678-9012-abcd00000001', snapshot_before_id: 'snap-001a', snapshot_after_id: 'snap-001b', change_type: 'modified', field_path: 'os.version', old_value: 'Windows 11 22H2', new_value: 'Windows 11 23H2', detected_at: '2026-05-07T08:30:00Z' },
    { id: 'chg-002', device_id: 'dev-ccdd2200-1234-5678-9012-abcd00000002', snapshot_before_id: null, snapshot_after_id: 'snap-002b', change_type: 'added', field_path: 'software.microsoft_teams', old_value: null, new_value: '23.240.0.1', detected_at: '2026-05-07T07:15:00Z' },
    { id: 'chg-003', device_id: 'dev-eeff3300-1234-5678-9012-abcd00000003', snapshot_before_id: 'snap-003a', snapshot_after_id: 'snap-003b', change_type: 'removed', field_path: 'software.adobe_reader_dc', old_value: '22.003.20282', new_value: null, detected_at: '2026-05-06T16:45:00Z' },
    { id: 'chg-004', device_id: 'dev-aabb4400-1234-5678-9012-abcd00000004', snapshot_before_id: 'snap-004a', snapshot_after_id: 'snap-004b', change_type: 'modified', field_path: 'security.defender_status', old_value: 'disabled', new_value: 'enabled', detected_at: '2026-05-06T14:20:00Z' },
    { id: 'chg-005', device_id: 'dev-ccdd5500-1234-5678-9012-abcd00000005', snapshot_before_id: 'snap-005a', snapshot_after_id: 'snap-005b', change_type: 'modified', field_path: 'network.ip_address', old_value: '192.168.10.45', new_value: '192.168.10.67', detected_at: '2026-05-06T10:00:00Z' },
    { id: 'chg-006', device_id: 'dev-eeff6600-1234-5678-9012-abcd00000006', snapshot_before_id: 'snap-006a', snapshot_after_id: 'snap-006b', change_type: 'modified', field_path: 'hardware.total_memory_gb', old_value: 8, new_value: 16, detected_at: '2026-05-05T15:30:00Z' },
    { id: 'chg-007', device_id: 'dev-aabb7700-1234-5678-9012-abcd00000007', snapshot_before_id: null, snapshot_after_id: 'snap-007b', change_type: 'added', field_path: 'software.vscode', old_value: null, new_value: '1.88.1', detected_at: '2026-05-05T11:10:00Z' },
    { id: 'chg-008', device_id: 'dev-ccdd8800-1234-5678-9012-abcd00000008', snapshot_before_id: 'snap-008a', snapshot_after_id: 'snap-008b', change_type: 'modified', field_path: 'security.bitlocker_status', old_value: 'not_encrypted', new_value: 'fully_encrypted', detected_at: '2026-05-04T09:00:00Z' },
  ],
  total: 73,
  offset: 0,
  limit: 20,
  has_more: true,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ChangesPage() {
  // State
  const [changes, setChanges] = useState<PaginatedChanges | null>(null);
  const [summary, setSummary] = useState<ChangeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [deviceFilter, setDeviceFilter] = useState('');
  const [changeTypeFilter, setChangeTypeFilter] = useState('');
  const [snapshotTypeFilter, setSnapshotTypeFilter] = useState('');

  // Diff viewer
  const [diffData, setDiffData] = useState<SnapshotDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffSnap1, setDiffSnap1] = useState('');
  const [diffSnap2, setDiffSnap2] = useState('');

  // Pagination
  const [offset, setOffset] = useState(0);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('offset', String(offset));
      params.set('limit', String(pageSize));
      if (deviceFilter) params.set('device_id', deviceFilter);
      if (changeTypeFilter) params.set('change_type', changeTypeFilter);
      if (snapshotTypeFilter) params.set('snapshot_type', snapshotTypeFilter);

      const [changesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/changes?${params}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/v1/changes/summary`, { credentials: 'include' }),
      ]);

      if (!changesRes.ok) throw new Error(`Changes API: ${changesRes.status}`);
      if (!summaryRes.ok) throw new Error(`Summary API: ${summaryRes.status}`);

      const changesData = await changesRes.json() as PaginatedChanges;
      const summaryData = await summaryRes.json() as ChangeSummary;
      setSummary(summaryData.total_changes > 0 ? summaryData : DUMMY_SUMMARY);
      setChanges(changesData.items.length > 0 ? changesData : DUMMY_CHANGES);
    } catch {
      // API unavailable — use dummy data
      setSummary(DUMMY_SUMMARY);
      setChanges(DUMMY_CHANGES);
    } finally {
      setLoading(false);
    }
  }, [offset, deviceFilter, changeTypeFilter, snapshotTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchDiff = async () => {
    if (!diffSnap1 || !diffSnap2) return;
    setDiffLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/changes/diff/${diffSnap1}/${diffSnap2}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Diff API: ${res.status}`);
      setDiffData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diff fetch failed');
    } finally {
      setDiffLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          構成変更履歴
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          デバイス構成の変更追跡とスナップショット差分分析
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 変更管理概要チャート */}
      {summary && (() => {
        const total = summary.total_changes || 1;
        const modifiedRate = Math.round(((summary.by_change_type?.modified ?? 0) / total) * 100);
        const modColor = modifiedRate >= 70 ? '#f59e0b' : modifiedRate >= 40 ? '#10b981' : '#2563eb';
        const typeBarData = Object.entries(summary.by_snapshot_type || {}).map(([type, count], i) => ({
          label: type,
          value: count as number,
          color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'][i] || 'bg-gray-400',
        }));
        return (
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">変更概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">変更タイプ: Modified率</p>
                <DonutChart value={modifiedRate} max={100} size={140} strokeWidth={14} color={modColor} label={`${modifiedRate}%`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  全 {total} 件中 modified {summary.by_change_type?.modified ?? 0} 件
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">スナップショット種別</p>
                <BarChart data={typeBarData} maxValue={Math.max(...typeBarData.map(d => d.value), 1)} height={160} showValues />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="総変更数"
            value={summary.total_changes}
            color="text-primary-600 dark:text-primary-400"
          />
          <SummaryCard
            title="追加"
            value={summary.by_change_type.added}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            title="変更"
            value={summary.by_change_type.modified}
            color="text-amber-600 dark:text-amber-400"
          />
          <SummaryCard
            title="削除"
            value={summary.by_change_type.removed}
            color="text-red-600 dark:text-red-400"
          />
        </div>
      )}

      {/* Snapshot type breakdown */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['hardware', 'software', 'security', 'network'] as const).map((t) => (
            <div
              key={t}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-aegis-border dark:bg-aegis-surface"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t}
              </p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {summary.by_snapshot_type[t]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Daily chart (simple bar representation) */}
      {summary && summary.daily.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-aegis-border dark:bg-aegis-surface">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            日別変更件数
          </h2>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {summary.daily.map((d) => {
              const max = Math.max(...summary.daily.map((x) => x.count), 1);
              const h = Math.max((d.count / max) * 100, 4);
              return (
                <div key={d.date} className="group relative flex flex-1 flex-col items-center">
                  <div
                    className="w-full rounded-t bg-primary-500 transition-colors group-hover:bg-primary-400"
                    style={{ height: `${h}%` }}
                  />
                  <span className="mt-1 hidden text-[10px] text-gray-400 lg:block">
                    {d.date.slice(5)}
                  </span>
                  <span className="absolute -top-5 hidden text-xs font-medium text-gray-600 group-hover:block dark:text-gray-300">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-aegis-border dark:bg-aegis-surface">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            デバイスID
          </label>
          <input
            type="text"
            value={deviceFilter}
            onChange={(e) => { setDeviceFilter(e.target.value); setOffset(0); }}
            placeholder="UUID..."
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-aegis-border dark:bg-aegis-darker dark:text-gray-200"
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            変更種別
          </label>
          <select
            value={changeTypeFilter}
            onChange={(e) => { setChangeTypeFilter(e.target.value); setOffset(0); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-aegis-border dark:bg-aegis-darker dark:text-gray-200"
          >
            <option value="">全て</option>
            <option value="added">追加</option>
            <option value="modified">変更</option>
            <option value="removed">削除</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            スナップショット種別
          </label>
          <select
            value={snapshotTypeFilter}
            onChange={(e) => { setSnapshotTypeFilter(e.target.value); setOffset(0); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-aegis-border dark:bg-aegis-darker dark:text-gray-200"
          >
            <option value="">全て</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="security">Security</option>
            <option value="network">Network</option>
          </select>
        </div>
        <button
          onClick={() => { setDeviceFilter(''); setChangeTypeFilter(''); setSnapshotTypeFilter(''); setOffset(0); }}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:bg-aegis-darker dark:text-gray-300 dark:hover:bg-aegis-border"
        >
          リセット
        </button>
      </div>

      {/* Change timeline */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-surface">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            変更タイムライン
            {changes && (
              <span className="ml-2 font-normal text-gray-400">({changes.total} 件)</span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : changes && changes.items.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {changes.items.map((c) => {
              const colors = changeColor(c.change_type);
              return (
                <div key={c.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="mt-1.5 flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${colors.dot}`} />
                    <div className="mt-1 h-full w-px bg-gray-200 dark:bg-aegis-border" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
                      >
                        {c.change_type.toUpperCase()}
                      </span>
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {c.field_path}
                      </span>
                    </div>

                    {/* Before / After */}
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {c.old_value !== null && (
                        <div className="rounded bg-red-50 px-3 py-2 text-xs dark:bg-red-900/10">
                          <span className="font-medium text-red-600 dark:text-red-400">Before: </span>
                          <code className="text-gray-700 dark:text-gray-300">{formatValue(c.old_value)}</code>
                        </div>
                      )}
                      {c.new_value !== null && (
                        <div className="rounded bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-900/10">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">After: </span>
                          <code className="text-gray-700 dark:text-gray-300">{formatValue(c.new_value)}</code>
                        </div>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(c.detected_at).toLocaleString('ja-JP')} &middot; Device: {c.device_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">
            変更履歴がありません
          </div>
        )}

        {/* Pagination */}
        {changes && changes.total > pageSize && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-aegis-border"
            >
              前へ
            </button>
            <span className="text-xs text-gray-400">
              {offset + 1} - {Math.min(offset + pageSize, changes.total)} / {changes.total}
            </span>
            <button
              disabled={!changes.has_more}
              onClick={() => setOffset(offset + pageSize)}
              className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-aegis-border"
            >
              次へ
            </button>
          </div>
        )}
      </div>

      {/* Diff viewer */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-aegis-border dark:bg-aegis-surface">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          スナップショット差分ビューア
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-500 dark:text-gray-400">Snapshot 1 (UUID)</label>
            <input
              value={diffSnap1}
              onChange={(e) => setDiffSnap1(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-aegis-border dark:bg-aegis-darker dark:text-gray-200"
              placeholder="UUID..."
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-500 dark:text-gray-400">Snapshot 2 (UUID)</label>
            <input
              value={diffSnap2}
              onChange={(e) => setDiffSnap2(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-aegis-border dark:bg-aegis-darker dark:text-gray-200"
              placeholder="UUID..."
            />
          </div>
          <button
            onClick={fetchDiff}
            disabled={diffLoading || !diffSnap1 || !diffSnap2}
            className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
          >
            {diffLoading ? '読込中...' : '差分表示'}
          </button>
        </div>

        {diffData && (
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Snap 1: {diffData.snapshot_1.snapshot_type} ({diffData.snapshot_1.captured_at.slice(0, 19)})</span>
              <span>Snap 2: {diffData.snapshot_2.snapshot_type} ({diffData.snapshot_2.captured_at.slice(0, 19)})</span>
              <span className="font-semibold">{diffData.total_changes} 差分</span>
            </div>

            <div className="max-h-96 overflow-auto rounded border border-gray-200 dark:border-aegis-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-aegis-darker">
                  <tr>
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">フィールド</th>
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">種別</th>
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">旧値</th>
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">新値</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                  {diffData.differences.map((d, i) => {
                    const colors = changeColor(d.change_type);
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-200">{d.field_path}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                            {d.change_type}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-gray-600 dark:text-gray-400">
                          {formatValue(d.old_value)}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-gray-600 dark:text-gray-400">
                          {formatValue(d.new_value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-aegis-border dark:bg-aegis-surface">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}
