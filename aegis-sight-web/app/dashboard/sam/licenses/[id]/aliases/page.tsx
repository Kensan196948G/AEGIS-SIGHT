'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';

interface SkuAlias {
  id: string;
  skuPartNumber: string;
  createdAt: string;
}

interface LicenseData {
  licenseName: string;
  vendor: string;
  aliases: SkuAlias[];
}

// Mock data — mirrors backend `software_sku_aliases` table.
// Replace with `api.get('/api/v1/sam/licenses/{id}/aliases')` when integrating.
const MOCK_LICENSE_DATA: Record<string, LicenseData> = {
  '1': {
    licenseName: 'Microsoft 365 E3',
    vendor: 'Microsoft',
    aliases: [
      { id: 'a1', skuPartNumber: 'ENTERPRISEPACK',   createdAt: '2026-03-25' },
      { id: 'a2', skuPartNumber: 'SPE_E3',           createdAt: '2026-04-01' },
      { id: 'a3', skuPartNumber: 'MICROSOFT_365_E3', createdAt: '2026-04-10' },
    ],
  },
  '2': { licenseName: 'Adobe Creative Cloud',    vendor: 'Adobe',      aliases: [] },
  '3': { licenseName: 'Slack Business+',         vendor: 'Salesforce', aliases: [] },
  '4': { licenseName: 'AutoCAD LT',              vendor: 'Autodesk',   aliases: [] },
  '5': { licenseName: 'Visual Studio Enterprise',vendor: 'Microsoft',  aliases: [] },
  '6': { licenseName: 'Jira Software Cloud',     vendor: 'Atlassian',  aliases: [] },
  '7': { licenseName: 'Windows Server 2022',     vendor: 'Microsoft',  aliases: [] },
  '8': { licenseName: 'Norton 360',              vendor: 'Gen Digital', aliases: [] },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function SkuAliasesPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const base    = MOCK_LICENSE_DATA[id];
  const notFound = !base;

  const [aliases,          setAliases]          = useState<SkuAlias[]>(base?.aliases ?? []);
  const [showAdd,          setShowAdd]          = useState(false);
  const [showEdit,         setShowEdit]         = useState(false);
  const [showDelete,       setShowDelete]       = useState(false);
  const [selected,         setSelected]         = useState<SkuAlias | null>(null);
  const [inputSku,         setInputSku]         = useState('');
  const [formError,        setFormError]        = useState('');

  function isDuplicate(sku: string, excludeId?: string): boolean {
    return aliases.some(a => a.skuPartNumber === sku.trim() && a.id !== excludeId);
  }

  function openAdd()  { setInputSku(''); setFormError(''); setShowAdd(true); }
  function closeAdd() { setShowAdd(false); }

  function handleAdd() {
    const sku = inputSku.trim();
    if (!sku) { setFormError('SKU Part Number を入力してください'); return; }
    if (isDuplicate(sku)) { setFormError('この SKU は既に登録されています（重複）'); return; }
    setAliases(prev => [
      ...prev,
      { id: `tmp-${Date.now()}`, skuPartNumber: sku, createdAt: new Date().toISOString().slice(0, 10) },
    ]);
    setShowAdd(false);
  }

  function openEdit(alias: SkuAlias) {
    setSelected(alias); setInputSku(alias.skuPartNumber); setFormError(''); setShowEdit(true);
  }
  function closeEdit() { setShowEdit(false); }

  function handleEdit() {
    if (!selected) return;
    const sku = inputSku.trim();
    if (!sku) { setFormError('SKU Part Number を入力してください'); return; }
    if (isDuplicate(sku, selected.id)) { setFormError('この SKU は既に登録されています（重複）'); return; }
    setAliases(prev => prev.map(a => a.id === selected.id ? { ...a, skuPartNumber: sku } : a));
    setShowEdit(false);
  }

  function openDelete(alias: SkuAlias) { setSelected(alias); setShowDelete(true); }

  function handleDelete() {
    if (!selected) return;
    setAliases(prev => prev.filter(a => a.id !== selected.id));
    setShowDelete(false);
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="aegis-btn-secondary text-sm"
        >
          ← 戻る
        </button>
        <div className="aegis-card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">ライセンス ID <code>{id}</code> が見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="戻る"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SKU エイリアス管理</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {base.licenseName} — {base.vendor}
            </p>
          </div>
        </div>
        <button onClick={openAdd} className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          エイリアスを追加
        </button>
      </div>

      {/* Info card */}
      <div className="aegis-card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          SKU エイリアスは M365 Graph API から返される <code>skuPartNumber</code> をライセンス名にマッピングするための対応表です。
          追加した SKU は次回の M365 sync 実行時から即座に有効になります。
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2">
        <Badge variant={aliases.length > 0 ? 'success' : 'warning'} size="sm">
          {aliases.length} 件登録済み
        </Badge>
      </div>

      {/* Alias table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  SKU Part Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  登録日
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {aliases.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    SKU エイリアスが未登録です。「エイリアスを追加」ボタンで追加してください。
                  </td>
                </tr>
              ) : (
                aliases.map(alias => (
                  <tr key={alias.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-gray-900 dark:text-white">
                      {alias.skuPartNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(alias.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(alias)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
                          aria-label="編集"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDelete(alias)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                          aria-label="削除"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {aliases.length} 件登録済み
          </p>
        </div>
      </div>

      {/* Add modal */}
      <Modal isOpen={showAdd} onClose={closeAdd} title="SKU エイリアスを追加" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU Part Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={inputSku}
              onChange={e => { setInputSku(e.target.value); setFormError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="例: ENTERPRISEPACK"
              className="aegis-input font-mono"
              autoFocus
            />
            {formError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              M365 Graph API の <code>skuPartNumber</code> を入力してください。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={closeAdd} className="aegis-btn-secondary">キャンセル</button>
            <button onClick={handleAdd} className="aegis-btn-primary">追加</button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={showEdit} onClose={closeEdit} title="SKU エイリアスを編集" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU Part Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={inputSku}
              onChange={e => { setInputSku(e.target.value); setFormError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleEdit()}
              placeholder="例: ENTERPRISEPACK"
              className="aegis-input font-mono"
              autoFocus
            />
            {formError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={closeEdit} className="aegis-btn-secondary">キャンセル</button>
            <button onClick={handleEdit} className="aegis-btn-primary">保存</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={showDelete}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        title="SKU エイリアスを削除"
        message={`「${selected?.skuPartNumber}」を削除します。次回の M365 sync からこのマッピングが無効になります。`}
        severity="danger"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
      />
    </div>
  );
}
