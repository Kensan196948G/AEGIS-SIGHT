'use client';

import { useCallback, useEffect, useState } from 'react';
import { DonutChart, BarChart } from '@/components/ui/chart';

interface Department {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  manager_name: string | null;
  budget_yearly: string | null;
  description: string | null;
  children: Department[];
  device_count: number;
}

interface DepartmentForm {
  name: string;
  code: string;
  parent_id: string;
  manager_name: string;
  budget_yearly: string;
  description: string;
}

const emptyForm: DepartmentForm = {
  name: '',
  code: '',
  parent_id: '',
  manager_name: '',
  budget_yearly: '',
  description: '',
};

function TreeNode({ dept, depth = 0, onEdit }: { dept: Department; depth?: number; onEdit: (d: Department) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = dept.children && dept.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        {/* Department icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <svg className="h-4 w-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
          </svg>
        </div>

        {/* Department info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{dept.name}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {dept.code}
            </span>
          </div>
          {dept.manager_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {dept.manager_name}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-white">{dept.device_count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Devices</p>
          </div>
          {dept.budget_yearly && (
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {Number(dept.budget_yearly).toLocaleString('ja-JP')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
            </div>
          )}
        </div>

        {/* Edit button */}
        <button
          onClick={() => onEdit(dept)}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {dept.children.map((child) => (
            <TreeNode key={child.id} dept={child} depth={depth + 1} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentForm>(emptyForm);
  const [flatDepartments, setFlatDepartments] = useState<Department[]>([]);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('aegis_token');
      const res = await fetch('/api/v1/departments?tree=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
      // Also fetch flat list for parent dropdown
      const flatRes = await fetch('/api/v1/departments?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (flatRes.ok) {
        const flatData = await flatRes.json();
        setFlatDepartments(flatData.items || []);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      parent_id: dept.parent_id || '',
      manager_name: dept.manager_name || '',
      budget_yearly: dept.budget_yearly || '',
      description: dept.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('aegis_token');
    const payload: Record<string, unknown> = {
      name: form.name,
      code: form.code,
      manager_name: form.manager_name || null,
      budget_yearly: form.budget_yearly || null,
      description: form.description || null,
    };
    if (form.parent_id) {
      payload.parent_id = form.parent_id;
    }

    const url = editingDept
      ? `/api/v1/departments/${editingDept.id}`
      : '/api/v1/departments';
    const method = editingDept ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        fetchDepartments();
      }
    } catch {
      // Error handled silently
    }
  };

  // Count total departments recursively
  const countAll = (depts: Department[]): number => {
    return depts.reduce((sum, d) => sum + 1 + countAll(d.children || []), 0);
  };

  const totalCount = countAll(departments);

  return (
    <div className="space-y-6">
      {/* 部門概要チャート */}
      {!loading && departments.length > 0 && (() => {
        const totalDevices = departments.reduce((s, d) => s + (d.device_count || 0), 0);
        const withDevices = departments.filter(d => (d.device_count || 0) > 0).length;
        const coverageRate = departments.length > 0 ? Math.round((withDevices / departments.length) * 100) : 0;
        const coverageColor = coverageRate >= 80 ? '#10b981' : coverageRate >= 50 ? '#f59e0b' : '#ef4444';
        const deptBarData = departments
          .filter(d => (d.device_count || 0) > 0)
          .sort((a, b) => (b.device_count || 0) - (a.device_count || 0))
          .slice(0, 6)
          .map((d, i) => ({
            label: d.name.substring(0, 6),
            value: d.device_count || 0,
            color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500'][i] || 'bg-gray-400',
          }));
        return (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-aegis-border dark:bg-aegis-dark">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">部門概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">デバイス配置率</p>
                <DonutChart value={coverageRate} max={100} size={140} strokeWidth={14} color={coverageColor} label={`${totalDevices}台`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {departments.length} 部門中 {withDevices} 部門にデバイス配置
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">部門別デバイス数 Top</p>
                <BarChart data={deptBarData} maxValue={Math.max(...deptBarData.map(d => d.value), 1)} height={160} showValues />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Department Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organizational hierarchy, budgets, and device allocation
          </p>
        </div>
        <button onClick={handleOpenCreate} className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Department
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Departments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Top-Level Units</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {departments.length}
          </p>
        </div>
        <div className="aegis-card">
          <p className="text-sm text-gray-500 dark:text-gray-400">With Sub-Departments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {departments.filter((d) => d.children && d.children.length > 0).length}
          </p>
        </div>
      </div>

      {/* Department Tree */}
      <div className="aegis-card p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Organization Tree
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-aegis-border">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 px-6 py-4">
                <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))
          ) : departments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                No departments yet. Click &quot;Add Department&quot; to get started.
              </p>
            </div>
          ) : (
            departments.map((dept) => (
              <TreeNode key={dept.id} dept={dept} onEdit={handleOpenEdit} />
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-aegis-darker">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingDept ? 'Edit Department' : 'New Department'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="aegis-input mt-1"
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="aegis-input mt-1"
                  placeholder="e.g. ENG"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Parent Department
                </label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="aegis-input mt-1"
                >
                  <option value="">None (top-level)</option>
                  {flatDepartments
                    .filter((d) => d.id !== editingDept?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Manager Name
                </label>
                <input
                  type="text"
                  value={form.manager_name}
                  onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                  className="aegis-input mt-1"
                  placeholder="e.g. Tanaka Taro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Yearly Budget
                </label>
                <input
                  type="number"
                  value={form.budget_yearly}
                  onChange={(e) => setForm({ ...form, budget_yearly: e.target.value })}
                  className="aegis-input mt-1"
                  placeholder="e.g. 50000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="aegis-input mt-1"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="aegis-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="aegis-btn-primary">
                  {editingDept ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
