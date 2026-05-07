'use client';

import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useState } from 'react';

interface DeviceGroup {
  id: string;
  name: string;
  description: string | null;
  criteria: Record<string, unknown> | null;
  is_dynamic: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
}

interface DeviceGroupMembership {
  id: string;
  group_id: string;
  device_id: string;
  added_at: string;
}

interface DeviceGroupDetail extends DeviceGroup {
  members: DeviceGroupMembership[];
}

interface GroupForm {
  name: string;
  description: string;
  is_dynamic: boolean;
  criteria: string;
}

const emptyForm: GroupForm = {
  name: '',
  description: '',
  is_dynamic: false,
  criteria: '{}',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DeviceGroupsPage() {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroupDetail | null>(null);
  const [addDeviceId, setAddDeviceId] = useState('');
  const [saving, setSaving] = useState(false);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  };

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/device-groups`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`グループの取得に失敗しました: ${res.status}`);
      const data = await res.json();
      setGroups(data.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroupDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/device-groups/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('グループ詳細の取得に失敗しました');
      const data: DeviceGroupDetail = await res.json();
      setSelectedGroup(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      let criteriaObj = null;
      if (form.is_dynamic && form.criteria.trim()) {
        criteriaObj = JSON.parse(form.criteria);
      }
      const res = await fetch(`${API_BASE}/api/v1/device-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          is_dynamic: form.is_dynamic,
          criteria: criteriaObj,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: '作成に失敗しました' }));
        throw new Error(err.detail || '作成に失敗しました');
      }
      setShowCreateModal(false);
      setForm(emptyForm);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このグループを削除しますか？この操作は元に戻せません。')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/device-groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      if (selectedGroup?.id === id) setSelectedGroup(null);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !addDeviceId.trim()) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/device-groups/${selectedGroup.id}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ device_id: addDeviceId.trim() }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'メンバーの追加に失敗しました' }));
        throw new Error(err.detail || 'メンバーの追加に失敗しました');
      }
      setAddDeviceId('');
      fetchGroupDetail(selectedGroup.id);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
    }
  };

  const handleRemoveMember = async (deviceId: string) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/device-groups/${selectedGroup.id}/members/${deviceId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (!res.ok) throw new Error('メンバーの削除に失敗しました');
      fetchGroupDetail(selectedGroup.id);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
    }
  };

  const dynamicCount = groups.filter((g) => g.is_dynamic).length;
  const staticCount = groups.length - dynamicCount;
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            デバイスグループ
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理・レポート用にデバイスを静的・動的グループに編成
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="aegis-btn-primary"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          グループ作成
        </button>
      </div>

      {/* Summary stats */}
      {!loading && groups.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="aegis-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">総グループ数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{groups.length}</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">動的グループ</p>
            <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{dynamicCount}</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">静的グループ</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{staticCount}</p>
          </div>
          <div className="aegis-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">総メンバー数</p>
            <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">{totalMembers}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">閉じる</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Group List */}
        <div className="lg:col-span-1">
          <div className="aegis-card overflow-hidden p-0">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-aegis-border">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">グループ一覧</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <div className="animate-pulse space-y-2 p-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  グループはまだありません
                </div>
              ) : (
                groups.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => fetchGroupDetail(g.id)}
                    className={`flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface ${
                      selectedGroup?.id === g.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {g.name}
                        </span>
                        <Badge variant={g.is_dynamic ? 'info' : 'default'}>
                          {g.is_dynamic ? '動的' : '静的'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {g.member_count} 台
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(g.id);
                      }}
                      className="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="グループを削除"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Group Detail */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="aegis-card overflow-hidden p-0">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-aegis-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedGroup.name}
                    </h2>
                    {selectedGroup.description && (
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {selectedGroup.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={selectedGroup.is_dynamic ? 'info' : 'default'}>
                    {selectedGroup.is_dynamic ? '動的グループ' : '静的グループ'}
                  </Badge>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>メンバー: {selectedGroup.members.length} 台</span>
                  {selectedGroup.created_by && <span>作成者: {selectedGroup.created_by}</span>}
                  <span>作成日: {new Date(selectedGroup.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>

              {selectedGroup.criteria && (
                <div className="border-b border-gray-200 px-4 py-3 dark:border-aegis-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    フィルター条件
                  </h3>
                  <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700 dark:bg-aegis-surface dark:text-gray-300">
                    {JSON.stringify(selectedGroup.criteria, null, 2)}
                  </pre>
                </div>
              )}

              {/* Add member */}
              {!selectedGroup.is_dynamic && (
                <div className="border-b border-gray-200 px-4 py-3 dark:border-aegis-border">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    デバイスを追加
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addDeviceId}
                      onChange={(e) => setAddDeviceId(e.target.value)}
                      placeholder="デバイス UUID"
                      className="aegis-input flex-1"
                    />
                    <button
                      onClick={handleAddMember}
                      className="aegis-btn-primary"
                    >
                      追加
                    </button>
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="px-4 py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  メンバー一覧（{selectedGroup.members.length} 台）
                </h3>
                {selectedGroup.members.length === 0 ? (
                  <div className="flex h-20 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    このグループにメンバーはいません
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-aegis-border">
                    {selectedGroup.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div>
                          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                            {m.device_id}
                          </span>
                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                            追加日: {new Date(m.added_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        {!selectedGroup.is_dynamic && (
                          <button
                            onClick={() => handleRemoveMember(m.device_id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="メンバーを削除"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-aegis-border">
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  左のグループを選択して詳細を表示
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-aegis-dark">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              デバイスグループを作成
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  グループ名
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="aegis-input mt-1 w-full"
                  placeholder="例: Windows ラップトップ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  説明（任意）
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="aegis-input mt-1 w-full"
                  rows={2}
                  placeholder="グループの説明を入力..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_dynamic"
                  checked={form.is_dynamic}
                  onChange={(e) => setForm({ ...form, is_dynamic: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_dynamic" className="text-sm text-gray-700 dark:text-gray-300">
                  動的グループ（フィルター条件で自動追加）
                </label>
              </div>
              {form.is_dynamic && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    フィルター条件（JSON）
                  </label>
                  <textarea
                    value={form.criteria}
                    onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                    className="aegis-input mt-1 w-full font-mono"
                    rows={4}
                    placeholder='{"os": "Windows 11", "status": "active"}'
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setForm(emptyForm);
                }}
                className="aegis-btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="aegis-btn-primary disabled:opacity-50"
              >
                {saving ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
