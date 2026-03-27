'use client';

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
      if (!res.ok) throw new Error(`Failed to fetch groups: ${res.status}`);
      const data = await res.json();
      setGroups(data.items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroupDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/device-groups/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch group detail');
      const data: DeviceGroupDetail = await res.json();
      setSelectedGroup(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
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
        const err = await res.json().catch(() => ({ detail: 'Create failed' }));
        throw new Error(err.detail || 'Create failed');
      }
      setShowCreateModal(false);
      setForm(emptyForm);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/device-groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      if (selectedGroup?.id === id) setSelectedGroup(null);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
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
        const err = await res.json().catch(() => ({ detail: 'Add member failed' }));
        throw new Error(err.detail || 'Add member failed');
      }
      setAddDeviceId('');
      fetchGroupDetail(selectedGroup.id);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
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
      if (!res.ok) throw new Error('Remove member failed');
      fetchGroupDetail(selectedGroup.id);
      fetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Device Groups
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organize devices into static or dynamic groups for management and reporting.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Group
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Group List */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-aegis-border dark:bg-aegis-dark">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-aegis-border">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Groups</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
              ) : groups.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No groups yet.</div>
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
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {g.name}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            g.is_dynamic
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {g.is_dynamic ? 'Dynamic' : 'Static'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(g.id);
                      }}
                      className="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="Delete group"
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
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-aegis-border dark:bg-aegis-dark">
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
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedGroup.is_dynamic
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {selectedGroup.is_dynamic ? 'Dynamic' : 'Static'}
                  </span>
                </div>
              </div>

              {selectedGroup.criteria && (
                <div className="border-b border-gray-200 px-4 py-3 dark:border-aegis-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Filter Criteria
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
                    Add Device
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addDeviceId}
                      onChange={(e) => setAddDeviceId(e.target.value)}
                      placeholder="Device UUID"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                    />
                    <button
                      onClick={handleAddMember}
                      className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="px-4 py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Members ({selectedGroup.members.length})
                </h3>
                {selectedGroup.members.length === 0 ? (
                  <p className="text-sm text-gray-500">No members in this group.</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-aegis-border">
                    {selectedGroup.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div>
                          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                            {m.device_id}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            Added {new Date(m.added_at).toLocaleDateString()}
                          </span>
                        </div>
                        {!selectedGroup.is_dynamic && (
                          <button
                            onClick={() => handleRemoveMember(m.device_id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="Remove member"
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a group to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-aegis-dark">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Device Group
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  placeholder="e.g. Windows Laptops"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  rows={2}
                  placeholder="Optional description..."
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
                  Dynamic group (auto-populate via filter criteria)
                </label>
              </div>
              {form.is_dynamic && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filter Criteria (JSON)
                  </label>
                  <textarea
                    value={form.criteria}
                    onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                    rows={4}
                    placeholder='{"os": "Windows 11", "status": "online"}'
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
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-aegis-border dark:text-gray-300 dark:hover:bg-aegis-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
