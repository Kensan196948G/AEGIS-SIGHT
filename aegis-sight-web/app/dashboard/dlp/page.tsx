'use client';

import {
  Badge, DonutChart, MiniBarChart,
} from '@/components/ui/design-components';

const DLP_POLICIES = [
  { id: 'dp-001', name: '機密ファイル拡張子制限', type: 'ファイル拡張子',         matches: 189, blocked:  87, status: 'active'   },
  { id: 'dp-002', name: 'マイナンバー検知',       type: 'コンテンツキーワード',     matches:  23, blocked:  23, status: 'active'   },
  { id: 'dp-003', name: '個人情報キーワード検知', type: 'コンテンツキーワード',     matches:  64, blocked:   0, status: 'active'   },
  { id: 'dp-004', name: '100MB超えファイル転送制限', type: 'サイズ制限',           matches:  12, blocked:   0, status: 'active'   },
  { id: 'dp-005', name: '実行ファイルブロック',   type: 'ファイル拡張子',           matches:  54, blocked:  54, status: 'active'   },
];

const DLP_INCIDENTS = [
  { user: 'yamamoto.kenji',   action: '機密Excelファイルの外部送信がブロックされました',     time: '08:32', severity: 'critical' },
  { user: 'tanaka.hiroshi',   action: 'マイナンバーを含むドキュメントがブロックされました', time: '09:15', severity: 'critical' },
  { user: 'sato.yuki',        action: '個人情報を含むPDFが検出されアラートを発報しました', time: '09:48', severity: 'high'     },
  { user: 'ito.masaru',       action: '実行ファイルの持ち込みがブロックされました',         time: '10:22', severity: 'high'     },
];

type SevKey = 'critical' | 'high' | 'medium' | 'low';
const SEV_CFG: Record<SevKey, { l: string; v: 'danger' | 'warning' | 'info' | 'success'; dot: string }> = {
  critical: { l: '重大', v: 'danger',  dot: '#ef4444' },
  high:     { l: '高',   v: 'warning', dot: '#f59e0b' },
  medium:   { l: '中',   v: 'info',    dot: '#3b82f6' },
  low:      { l: '低',   v: 'success', dot: '#10b981' },
};
const getSev = (s: string) => SEV_CFG[s as SevKey] ?? SEV_CFG.medium;

const totalMatches = DLP_POLICIES.reduce((s, p) => s + p.matches, 0);
const totalBlocked = DLP_POLICIES.reduce((s, p) => s + p.blocked, 0);
const blockRate    = Math.round((totalBlocked / Math.max(totalMatches, 1)) * 100);

const typeDistData = [
  { label: 'ファイル拡張子',     value: DLP_POLICIES.filter(p => p.type === 'ファイル拡張子').length,         color: '#3b82f6' },
  { label: 'コンテンツキーワード', value: DLP_POLICIES.filter(p => p.type === 'コンテンツキーワード').length,   color: '#8b5cf6' },
  { label: 'サイズ制限',         value: DLP_POLICIES.filter(p => p.type === 'サイズ制限').length,               color: '#f59e0b' },
];

export default function DLPPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">DLP（情報漏洩防止）</h1>
          <p className="page-subtitle">ファイル操作監視ルール管理とDLPイベント追跡</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">ルールを追加</button>
        </div>
      </div>

      {/* Overview */}
      <div className="card">
        <h2 className="card-title">DLP概要</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">ブロック率</p>
            <DonutChart value={blockRate} max={100} size={140} strokeWidth={14}
              color={blockRate >= 50 ? '#ef4444' : blockRate >= 30 ? '#f59e0b' : '#10b981'} />
            <p className="chart-sublabel">全 {totalMatches} 件中 {totalBlocked} 件ブロック</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label">ルール種別分布</p>
            <MiniBarChart data={typeDistData} maxValue={DLP_POLICIES.length} height={160} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">有効ポリシー数</p><p className="stat-value">{DLP_POLICIES.length}</p></div>
        <div className="card card-center"><p className="stat-label">総検知数</p><p className="stat-value text-amber">{totalMatches}</p></div>
        <div className="card card-center"><p className="stat-label">ブロック数</p><p className="stat-value text-red">{totalBlocked}</p></div>
        <div className="card card-center"><p className="stat-label">ブロック率</p><p className="stat-value text-red">{blockRate}%</p></div>
      </div>

      {/* Two-column: policies + incidents */}
      <div className="grid-2">
        {/* Policies table */}
        <div className="card table-card">
          <h2 className="card-title">DLPポリシー一覧</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>
                {['ポリシー名', '種別', '検知数', 'ブロック数', 'ステータス'].map(h => <th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {DLP_POLICIES.map(p => (
                  <tr key={p.id} className="table-row-hover">
                    <td><span className="link-text">{p.name}</span></td>
                    <td className="text-sub">{p.type}</td>
                    <td>{p.matches}</td>
                    <td className={p.blocked > 0 ? 'text-red' : 'text-sub'}>{p.blocked}</td>
                    <td><Badge variant="success" dot>有効</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent incidents */}
        <div className="card">
          <h2 className="card-title">本日のインシデント</h2>
          <div className="activity-list">
            {DLP_INCIDENTS.map((inc, i) => {
              const sc = getSev(inc.severity);
              return (
                <div key={i} className="activity-item">
                  <div className="activity-dot" style={{ background: sc.dot }} />
                  <div className="activity-content">
                    <p className="activity-text">
                      <strong>{inc.user}</strong> — {inc.action}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Badge variant={sc.v}>{sc.l}</Badge>
                      <span className="activity-time">{inc.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
