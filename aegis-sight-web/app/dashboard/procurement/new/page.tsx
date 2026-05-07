'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Item {
  name:      string;
  qty:       number;
  unitPrice: number;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1px solid var(--border)', borderRadius: 6,
  background: 'var(--bg-secondary)', color: 'var(--text-main)',
  fontSize: 14, boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6,
};

export default function NewProcurementPage() {
  const [title,     setTitle]     = useState('');
  const [category,  setCategory]  = useState('hardware');
  const [dept,      setDept]      = useState('');
  const [purpose,   setPurpose]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [items,     setItems]     = useState<Item[]>([{ name: '', qty: 1, unitPrice: 0 }]);
  const [submitted, setSubmitted] = useState(false);

  const totalCost = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  function addItem()                                       { setItems(p => [...p, { name: '', qty: 1, unitPrice: 0 }]); }
  function removeItem(i: number)                          { setItems(p => p.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, f: keyof Item, v: string | number) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [f]: v } : it));
  }

  if (submitted) {
    return (
      <div className="page-content">
        <div className="card card-center" style={{ padding: 48 }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>✅</p>
          <h2 className="page-title">申請を受け付けました</h2>
          <p className="text-sub" style={{ marginTop: 8, marginBottom: 24 }}>
            申請番号: <span className="mono" style={{ fontWeight: 600 }}>PRQ-2025-0099</span>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/dashboard/procurement" className="btn-primary" style={{ textDecoration: 'none' }}>
              調達一覧へ戻る
            </Link>
            <button className="btn-secondary" onClick={() => setSubmitted(false)}>新規作成</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-sub" style={{ fontSize: 12, marginBottom: 4 }}>
            <Link href="/dashboard/procurement" style={{ color: 'var(--primary)' }}>調達管理</Link>
            {' / 新規申請'}
          </p>
          <h1 className="page-title">新規調達申請</h1>
          <p className="page-subtitle">IT機器・ソフトウェアの調達を申請します</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 基本情報 */}
        <div className="card">
          <h2 className="card-title">基本情報</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>申請タイトル <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例: Dell Latitude 5540 x 20台" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>カテゴリ</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                <option value="hardware">ハードウェア</option>
                <option value="software">ソフトウェア</option>
                <option value="service">サービス</option>
                <option value="consumable">消耗品</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>申請部門 <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
                <option value="">部門を選択</option>
                <option>エンジニアリング部</option>
                <option>デザイン部</option>
                <option>営業部</option>
                <option>人事部</option>
                <option>経理部</option>
                <option>IT管理部</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>調達目的 <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={3}
                placeholder="調達の目的・背景を記入してください"
                style={{ ...inputStyle, resize: 'none' }} />
            </div>
          </div>
        </div>

        {/* 品目明細 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 className="card-title" style={{ margin: 0 }}>品目明細</h2>
            <button className="btn-secondary" style={{ fontSize: 12 }} onClick={addItem}>+ 品目を追加</button>
          </div>

          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px 100px 32px', gap: 8, alignItems: 'end', marginBottom: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, color: 'var(--text-sub)' }}>品目名</label>
                <input type="text" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Dell Latitude 5540"
                  style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, color: 'var(--text-sub)' }}>数量</label>
                <input type="number" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', parseInt(e.target.value) || 1)}
                  style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, color: 'var(--text-sub)' }}>単価 (円)</label>
                <input type="number" min={0} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseInt(e.target.value) || 0)}
                  style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="text-sub" style={{ fontSize: 11, marginBottom: 6 }}>小計</p>
                <p className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{(item.qty * item.unitPrice).toLocaleString()}円</p>
              </div>
              {items.length > 1 ? (
                <button onClick={() => removeItem(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1, alignSelf: 'center' }}>
                  ×
                </button>
              ) : <div />}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
            <span className="text-sub" style={{ fontSize: 13 }}>合計金額:</span>
            <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{totalCost.toLocaleString()}円</span>
          </div>
        </div>

        {/* 備考 */}
        <div className="card">
          <label style={labelStyle}>備考</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="補足事項があれば記入してください"
            style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Link href="/dashboard/procurement" className="btn-secondary" style={{ textDecoration: 'none' }}>
            キャンセル
          </Link>
          <button className="btn-secondary" onClick={() => setSubmitted(true)}>下書き保存</button>
          <button className="btn-primary" onClick={() => setSubmitted(true)}>申請を提出</button>
        </div>
      </div>
    </div>
  );
}
