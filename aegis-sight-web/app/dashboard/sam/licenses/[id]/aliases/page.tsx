'use client';

import { useState } from 'react';
import { Badge, Modal } from '@/components/ui/design-components';

interface Alias {
  id:      string;
  sku:     string;
  created: string;
}

const INITIAL_ALIASES: Alias[] = [
  { id: 'a-001', sku: 'SPB',                   created: '2024-04-01' },
  { id: 'a-002', sku: 'O365_BUSINESS_PREMIUM', created: '2024-04-01' },
  { id: 'a-003', sku: 'ENTERPRISEPACK',         created: '2024-06-15' },
];

const SOFTWARE_NAME = 'Microsoft 365 Business Premium';
const VENDOR        = 'Microsoft Corporation';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1px solid var(--border)', borderRadius: 6,
  background: 'var(--bg-secondary)', color: 'var(--text-main)',
  fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace',
};

export default function SkuAliasesPage() {
  const [aliases,    setAliases]    = useState<Alias[]>(INITIAL_ALIASES);
  const [addOpen,    setAddOpen]    = useState(false);
  const [editAlias,  setEditAlias]  = useState<Alias | null>(null);
  const [inputSku,   setInputSku]   = useState('');
  const [formError,  setFormError]  = useState('');

  function openAdd() { setInputSku(''); setFormError(''); setAddOpen(true); }

  function handleAdd() {
    const sku = inputSku.trim().toUpperCase();
    if (!sku) { setFormError('SKU Part Number を入力してください'); return; }
    if (aliases.some(a => a.sku === sku)) { setFormError('この SKU は既に登録されています'); return; }
    setAliases(prev => [...prev, { id: `a-${Date.now()}`, sku, created: new Date().toISOString().slice(0, 10) }]);
    setAddOpen(false);
  }

  function openEdit(alias: Alias) { setInputSku(alias.sku); setFormError(''); setEditAlias(alias); }

  function handleEdit() {
    if (!editAlias) return;
    const sku = inputSku.trim().toUpperCase();
    if (!sku) { setFormError('SKU Part Number を入力してください'); return; }
    if (aliases.some(a => a.sku === sku && a.id !== editAlias.id)) { setFormError('この SKU は既に登録されています'); return; }
    setAliases(prev => prev.map(a => a.id === editAlias.id ? { ...a, sku } : a));
    setEditAlias(null);
  }

  function handleDelete(id: string) {
    if (!confirm('この SKU エイリアスを削除しますか?')) return;
    setAliases(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-sub" style={{ fontSize: 12, marginBottom: 4 }}>
            <a href="/dashboard/sam/licenses" style={{ color: 'var(--primary)' }}>ライセンス管理</a>
            {' / SKU エイリアス'}
          </p>
          <h1 className="page-title">SKU エイリアス管理</h1>
          <p className="page-subtitle">{SOFTWARE_NAME} — {VENDOR}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ marginRight: 4 }}>
            <Badge variant={aliases.length > 0 ? 'success' : 'warning'}>
              {aliases.length} 件登録済み
            </Badge>
          </span>
          <button className="btn-primary" onClick={openAdd}>+ エイリアスを追加</button>
        </div>
      </div>

      {/* Info card */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px' }}>
        <p style={{ fontSize: 13, color: '#1d4ed8', lineHeight: 1.6 }}>
          SKU エイリアスは M365 Graph API から返される <code>skuPartNumber</code> をライセンス名にマッピングするための対応表です。
          追加した SKU は次回の M365 sync 実行時から即座に有効になります。
        </p>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['SKU Part Number', '登録日', '操作'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {aliases.length > 0 ? aliases.map(alias => (
                <tr key={alias.id} className="table-row-hover">
                  <td><span className="text-main mono" style={{ fontWeight: 500 }}>{alias.sku}</span></td>
                  <td className="text-sub">{alias.created}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEdit(alias)}>
                        編集
                      </button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDelete(alias.id)}>
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="table-empty">SKU エイリアスが未登録です。「エイリアスを追加」ボタンで追加してください。</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">{aliases.length} 件登録済み</span>
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="SKU エイリアスを追加">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              SKU Part Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={inputSku}
              onChange={e => { setInputSku(e.target.value); setFormError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="例: ENTERPRISEPACK"
              style={{ ...inputStyle, borderColor: formError ? '#ef4444' : 'var(--border)' }}
              autoFocus
            />
            {formError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{formError}</p>}
            <p className="text-sub" style={{ fontSize: 12, marginTop: 6 }}>
              M365 Graph API の <code>skuPartNumber</code> を入力してください。
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={() => setAddOpen(false)}>キャンセル</button>
            <button className="btn-primary" onClick={handleAdd}>追加</button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editAlias !== null} onClose={() => setEditAlias(null)} title="SKU エイリアスを編集">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              SKU Part Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={inputSku}
              onChange={e => { setInputSku(e.target.value); setFormError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleEdit()}
              placeholder="例: ENTERPRISEPACK"
              style={{ ...inputStyle, borderColor: formError ? '#ef4444' : 'var(--border)' }}
              autoFocus
            />
            {formError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{formError}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={() => setEditAlias(null)}>キャンセル</button>
            <button className="btn-primary" onClick={handleEdit}>保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
