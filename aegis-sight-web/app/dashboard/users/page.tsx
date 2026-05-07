'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DonutChart, BarChart } from '@/components/ui/chart';
import { fetchUsers, updateUser } from '@/lib/api';
import type { BackendUser, UserRole } from '@/lib/api';

const roleVariant: Record<UserRole, 'danger' | 'warning' | 'info' | 'default'> = {
  admin: 'danger',
  operator: 'warning',
  auditor: 'info',
  readonly: 'default',
};

const roleLabel: Record<UserRole, string> = {
  admin: '管理者',
  operator: 'オペレーター',
  auditor: '監査者',
  readonly: '閲覧者',
};

export function getActiveRateColor(rate: number): string {
  return rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444';
}

export default function UsersPage() {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editUser, setEditUser] = useState<BackendUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('readonly');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers(0, 100);
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (user: BackendUser) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditName(user.full_name);
    setSaveError(null);
  };

  const closeEdit = () => {
    setEditUser(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateUser(editUser.id, {
        full_name: editName,
        role: editRole,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      closeEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = users.filter((u) => u.is_active).length;
  const activeRate = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const activeColor = getActiveRateColor(activeRate);

  const roleCounts: Record<string, number> = {};
  users.forEach((u) => {
    const label = roleLabel[u.role] ?? u.role;
    roleCounts[label] = (roleCounts[label] || 0) + 1;
  });
  const roleBarData = Object.entries(roleCounts).map(([role, count], i) => ({
    label: role,
    value: count,
    color: (['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'] as const)[i] || 'bg-gray-400',
  }));

  return (
    <div className="space-y-6">
      {/* ユーザー概要チャート */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ユーザー概要</h2>
        {loading ? (
          <div className="h-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブ率</p>
              <DonutChart value={activeRate} max={100} size={140} strokeWidth={14} color={activeColor} label={`${activeRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {total} ユーザー中 {activeCount} 名有効
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ロール別ユーザー数</p>
              {roleBarData.length > 0 ? (
                <BarChart
                  data={roleBarData}
                  maxValue={Math.max(...roleBarData.map((d) => d.value), 1)}
                  height={160}
                  showValues
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">データなし</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ユーザー管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ユーザーアカウントとロールの管理
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>合計: {loading ? '—' : total}名</span>
          <span>|</span>
          <span>有効: {loading ? '—' : activeCount}名</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">名前</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">メール</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">ロール</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">状態</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">登録日</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    ユーザーが見つかりません
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                          {user.full_name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={roleVariant[user.role] ?? 'default'}>
                        {roleLabel[user.role] ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.is_active ? 'success' : 'default'} dot>
                        {user.is_active ? '有効' : '無効'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editUser} onClose={closeEdit} title="ユーザー編集" size="sm">
        {editUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                名前
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-darker dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                メール
              </label>
              <input
                type="email"
                value={editUser.email}
                disabled
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-aegis-border dark:bg-aegis-darker dark:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                ロール
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-darker dark:text-white"
              >
                <option value="admin">管理者</option>
                <option value="operator">オペレーター</option>
                <option value="auditor">監査者</option>
                <option value="readonly">閲覧者</option>
              </select>
            </div>

            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-aegis-border">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-aegis-border dark:text-gray-300 dark:hover:bg-aegis-surface"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="aegis-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
