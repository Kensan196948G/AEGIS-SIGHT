'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DonutChart, BarChart } from '@/components/ui/chart';

type Role = 'admin' | 'operator' | 'auditor' | 'readonly';

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

const roleVariant: Record<Role, 'danger' | 'warning' | 'info' | 'default'> = {
  admin: 'danger',
  operator: 'warning',
  auditor: 'info',
  readonly: 'default',
};

const roleLabel: Record<Role, string> = {
  admin: '管理者',
  operator: 'オペレーター',
  auditor: '監査者',
  readonly: '閲覧者',
};

// Demo data
const demoUsers: UserItem[] = [
  {
    id: '1',
    email: 'admin@aegis-sight.local',
    full_name: '山田 太郎',
    role: 'admin',
    is_active: true,
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: '2',
    email: 'tanaka@aegis-sight.local',
    full_name: '田中 花子',
    role: 'operator',
    is_active: true,
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: '3',
    email: 'suzuki@aegis-sight.local',
    full_name: '鈴木 一郎',
    role: 'auditor',
    is_active: true,
    created_at: '2026-02-10T11:00:00Z',
  },
  {
    id: '4',
    email: 'sato@aegis-sight.local',
    full_name: '佐藤 美咲',
    role: 'readonly',
    is_active: true,
    created_at: '2026-03-01T08:00:00Z',
  },
  {
    id: '5',
    email: 'watanabe@aegis-sight.local',
    full_name: '渡辺 健',
    role: 'operator',
    is_active: false,
    created_at: '2026-01-20T14:00:00Z',
  },
];

export default function UsersPage() {
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState<Role>('readonly');
  const [editName, setEditName] = useState('');

  const openEdit = (user: UserItem) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditName(user.full_name);
  };

  const closeEdit = () => {
    setEditUser(null);
  };

  return (
    <div className="space-y-6">
      {/* ユーザー概要チャート */}
      {(() => {
        const activeCount = demoUsers.filter(u => u.is_active).length;
        const activeRate = Math.round((activeCount / demoUsers.length) * 100);
        const activeColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';
        const roleCounts: Record<string, number> = {};
        demoUsers.forEach(u => { roleCounts[roleLabel[u.role]] = (roleCounts[roleLabel[u.role]] || 0) + 1; });
        const roleBarData = Object.entries(roleCounts).map(([role, count], i) => ({
          label: role,
          value: count,
          color: ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'][i] || 'bg-gray-400',
        }));
        return (
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ユーザー概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブ率</p>
                <DonutChart value={activeRate} max={100} size={140} strokeWidth={14} color={activeColor} label={`${activeRate}%`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  全 {demoUsers.length} ユーザー中 {activeCount} 名有効
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ロール別ユーザー数</p>
                <BarChart data={roleBarData} maxValue={Math.max(...roleBarData.map(d => d.value))} height={160} showValues />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ユーザー管理
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ユーザーアカウントとロールの管理
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>合計: {demoUsers.length}名</span>
          <span>|</span>
          <span>有効: {demoUsers.filter((u) => u.is_active).length}名</span>
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
              {demoUsers.map((user) => (
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
                    <Badge variant={roleVariant[user.role]}>
                      {roleLabel[user.role]}
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
              ))}
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
                onChange={(e) => setEditRole(e.target.value as Role)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-darker dark:text-white"
              >
                <option value="admin">管理者</option>
                <option value="operator">オペレーター</option>
                <option value="auditor">監査者</option>
                <option value="readonly">閲覧者</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-aegis-border">
              <button
                onClick={closeEdit}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-aegis-border dark:text-gray-300 dark:hover:bg-aegis-surface"
              >
                キャンセル
              </button>
              <button
                onClick={closeEdit}
                className="aegis-btn-primary"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
