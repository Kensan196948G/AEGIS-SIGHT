'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Modal } from '@/components/ui/design-components';

const PROCUREMENT = {
  id:         'PRQ-2025-0042',
  item:       'Dell Latitude 5540 ×20 台',
  status:     'approved' as const,
  category:   'ハードウェア',
  dept:       'エンジニアリング部',
  purpose:    '2025年度新入社員向け開発用ノートPC調達。現行機材の老朽化（平均5年超）に伴う更新申請。\nスペック要件: Core i7-13th / 16GB RAM / 512GB SSD / Windows 11 Pro',
  qty:        20,
  unitPrice:  178000,
  totalPrice: 3560000,
  created:    '2025-01-10 09:30',
  updated:    '2025-01-13 15:20',
};

type StatusKey = 'draft' | 'submitted' | 'approved' | 'ordered' | 'delivered' | 'completed';

const STATUS_CFG: Record<StatusKey, { label: string; v: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
  draft:     { label: '下書き', v: 'default'  },
  submitted: { label: '申請中', v: 'info'     },
  approved:  { label: '承認済', v: 'success'  },
  ordered:   { label: '発注済', v: 'warning'  },
  delivered: { label: '納品済', v: 'success'  },
  completed: { label: '完了',   v: 'default'  },
};

const STEPS: StatusKey[] = ['draft', 'submitted', 'approved', 'ordered', 'delivered', 'completed'];
const CURRENT_IDX = STEPS.indexOf(PROCUREMENT.status);

const EVENTS = [
  { label: '申請作成', date: '2025-01-10 09:30' },
  { label: '申請提出', date: '2025-01-10 10:05' },
  { label: '上長承認', date: '2025-01-13 15:20' },
];

export default function ProcurementDetailPage() {
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [actionDone,  setActionDone]  = useState(false);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-sub" style={{ fontSize: 12, marginBottom: 4 }}>
            <Link href="/dashboard/procurement" style={{ color: 'var(--primary)' }}>調達管理</Link>
            {' / '}
            <span>{PROCUREMENT.id}</span>
          </p>
          <h1 className="page-title">{PROCUREMENT.id}</h1>
          <p className="page-subtitle">{PROCUREMENT.item}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge variant={STATUS_CFG[PROCUREMENT.status].v}>{STATUS_CFG[PROCUREMENT.status].label}</Badge>
          {!actionDone && (
            <button className="btn-primary" onClick={() => setModalAction('発注済みにする')}>
              発注済みにする
            </button>
          )}
        </div>
      </div>

      {/* Status stepper */}
      <div className="card">
        <h2 className="card-title">ステータス進捗</h2>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
          {STEPS.map((step, i) => {
            const cfg      = STATUS_CFG[step];
            const past     = i <= CURRENT_IDX;
            const isCurrent = i === CURRENT_IDX;
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: past ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: past ? '#fff' : 'var(--text-sub)',
                    border: isCurrent ? '3px solid var(--primary)' : '2px solid transparent',
                    boxSizing: 'border-box',
                  }}>
                    {past && !isCurrent ? '✓' : i + 1}
                  </div>
                  <span style={{
                    fontSize: 11, marginTop: 4,
                    color: past ? 'var(--primary)' : 'var(--text-sub)',
                    fontWeight: past ? 600 : 400,
                  }}>
                    {cfg.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: i < CURRENT_IDX ? 'var(--primary)' : 'var(--border)',
                    margin: '0 4px', marginBottom: 20,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Purpose */}
          <div className="card">
            <h2 className="card-title">調達目的</h2>
            <p className="text-sub" style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginTop: 8 }}>
              {PROCUREMENT.purpose}
            </p>
          </div>

          {/* Item table */}
          <div className="card table-card">
            <h2 className="card-title">品目明細</h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr>
                  {['品目', '数量', '単価', '小計'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  <tr className="table-row-hover">
                    <td><span className="text-main" style={{ fontWeight: 500 }}>{PROCUREMENT.item}</span></td>
                    <td className="text-sub">{PROCUREMENT.qty}</td>
                    <td className="mono text-sub">{PROCUREMENT.unitPrice.toLocaleString()} 円</td>
                    <td className="mono text-main" style={{ fontWeight: 600 }}>{PROCUREMENT.totalPrice.toLocaleString()} 円</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600 }}>合計</td>
                    <td className="mono" style={{ padding: '10px 16px', fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>
                      {PROCUREMENT.totalPrice.toLocaleString()} 円
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 申請情報 */}
          <div className="card">
            <h2 className="card-title">申請情報</h2>
            <div className="detail-grid">
              {([
                ['申請番号', PROCUREMENT.id],
                ['カテゴリ', PROCUREMENT.category],
                ['申請部門', PROCUREMENT.dept],
                ['作成日時', PROCUREMENT.created],
                ['更新日時', PROCUREMENT.updated],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="detail-item">
                  <span className="detail-label">{k}</span>
                  <span className="detail-value">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="card">
            <h2 className="card-title">イベント</h2>
            <div className="activity-list">
              {EVENTS.map((ev, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" />
                  <div className="activity-content">
                    <p className="activity-text">{ev.label}</p>
                    <p className="activity-time">{ev.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <Modal open={modalAction !== null} onClose={() => setModalAction(null)} title="操作の確認">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="text-sub" style={{ fontSize: 14 }}>
            <strong className="text-main">「{PROCUREMENT.item}」</strong>に対して
            <strong style={{ color: 'var(--primary)', marginLeft: 4 }}>{modalAction}</strong>
            を実行しますか?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={() => setModalAction(null)}>キャンセル</button>
            <button className="btn-primary" onClick={() => { setActionDone(true); setModalAction(null); }}>確定</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
