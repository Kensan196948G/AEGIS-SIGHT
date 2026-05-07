'use client';

import {
  Badge,
} from '@/components/ui/design-components';

const INCIDENTS = [
  { id: 'INC-001', title: 'ランサムウェア感染疑い — MSPC-0042',        priority: 'P1', status: '対応中',   assignee: 'セキュリティチーム', created: '2025-01-15 09:05', sla: '4h',  elapsed: '1h 23m' },
  { id: 'INC-002', title: '特権IDの不正利用疑い',                       priority: 'P1', status: '調査中',   assignee: 'tanaka.hiroshi',     created: '2025-01-14 14:30', sla: '4h',  elapsed: '22h 5m' },
  { id: 'INC-003', title: 'DDoS 攻撃 — 外部公開サービス',              priority: 'P2', status: '対応中',   assignee: 'インフラチーム',     created: '2025-01-15 07:45', sla: '8h',  elapsed: '2h 48m' },
  { id: 'INC-004', title: '個人情報漏洩の可能性 — メール誤送信',       priority: 'P2', status: '承認待ち',  assignee: 'sato.yuki',          created: '2025-01-13 10:20', sla: '24h', elapsed: '43h 10m' },
  { id: 'INC-005', title: 'SSL 証明書失効によるサービス停止',           priority: 'P3', status: '解決済',   assignee: 'ito.masaru',         created: '2025-01-12 08:00', sla: '48h', elapsed: '6h 30m' },
];

type Priority  = 'P1' | 'P2' | 'P3';
type IncStatus = '対応中' | '調査中' | '解決済' | '承認待ち';

const INC_PRIO: Record<Priority, { v: 'danger' | 'warning' | 'info' }> = {
  P1: { v: 'danger'  },
  P2: { v: 'warning' },
  P3: { v: 'info'    },
};

const INC_STATUS: Record<IncStatus, { v: 'warning' | 'info' | 'success' | 'default' }> = {
  '対応中':   { v: 'warning' },
  '調査中':   { v: 'info'    },
  '解決済':   { v: 'success' },
  '承認待ち': { v: 'default' },
};

const getPrio   = (p: string) => INC_PRIO[p as Priority] ?? INC_PRIO.P3;
const getStatus = (s: string) => INC_STATUS[s as IncStatus] ?? INC_STATUS['調査中'];

const p1Count   = INCIDENTS.filter(i => i.priority === 'P1').length;
const openCount = INCIDENTS.filter(i => i.status !== '解決済').length;
const doneCount = INCIDENTS.filter(i => i.status === '解決済').length;

export default function IncidentsPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">インシデント管理</h1>
          <p className="page-subtitle">セキュリティインシデントの追跡・対応・クローズ管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">インシデントを作成</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">総件数</p><p className="stat-value">{INCIDENTS.length}</p></div>
        <div className="card card-center"><p className="stat-label">P1 重大</p><p className="stat-value text-red">{p1Count}</p></div>
        <div className="card card-center"><p className="stat-label">対応中</p><p className="stat-value text-amber">{openCount}</p></div>
        <div className="card card-center"><p className="stat-label">今月解決</p><p className="stat-value text-green">{doneCount}</p></div>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ID', 'タイトル', '優先度', 'ステータス', '担当者', '発生日時', 'SLA', '経過時間'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {INCIDENTS.map(inc => {
                const prio = getPrio(inc.priority);
                const st   = getStatus(inc.status);
                return (
                  <tr key={inc.id} className="table-row-hover">
                    <td className="mono text-sub">{inc.id}</td>
                    <td><span className="link-text">{inc.title}</span></td>
                    <td><Badge variant={prio.v}>{inc.priority}</Badge></td>
                    <td><Badge variant={st.v} dot>{inc.status}</Badge></td>
                    <td className="text-sub">{inc.assignee}</td>
                    <td className="text-sub">{inc.created}</td>
                    <td className="text-sub">{inc.sla}</td>
                    <td className={inc.status !== '解決済' ? 'text-amber' : 'text-sub'}>{inc.elapsed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {INCIDENTS.length} 件</span>
        </div>
      </div>
    </div>
  );
}
