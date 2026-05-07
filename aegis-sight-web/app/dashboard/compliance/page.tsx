'use client';

import {
  Badge, DonutChart, MiniBarChart, ProgressBar,
} from '@/components/ui/design-components';

const FRAMEWORKS = [
  { name: 'ISO 27001',   score: 78, controls: 114, passed:  89, failed: 14, pending: 11, color: '#3b82f6' },
  { name: 'J-SOX ITGC',  score: 82, controls:  42, passed:  34, failed:  5, pending:  3, color: '#10b981' },
  { name: 'NIST CSF',    score: 65, controls: 108, passed:  70, failed: 25, pending: 13, color: '#f59e0b' },
  { name: 'CIS Controls', score: 71, controls:  56, passed:  40, failed: 10, pending:  6, color: '#8b5cf6' },
];

const RECENT_FINDINGS = [
  { id: 'CF-001', framework: 'ISO 27001',   control: 'A.9.4.1',    finding: 'アクセスログの定期レビューが未実施',   severity: 'critical', status: 'open'        },
  { id: 'CF-002', framework: 'J-SOX',       control: 'ITGC-12',    finding: '特権IDの管理手順書が旧版のまま',       severity: 'high',     status: 'in_progress' },
  { id: 'CF-003', framework: 'NIST CSF',    control: 'DE.CM-1',    finding: 'ネットワーク監視ツールの設定不備',     severity: 'high',     status: 'open'        },
  { id: 'CF-004', framework: 'CIS Controls', control: 'CIS-1.1',   finding: '未承認デバイスのインベントリ未登録',   severity: 'medium',   status: 'open'        },
];

type Severity = 'critical' | 'high' | 'medium' | 'low';
type FindingStatus = 'open' | 'in_progress' | 'resolved';

const SEV_CFG: Record<Severity, { l: string; v: 'danger' | 'warning' | 'info' | 'success' }> = {
  critical: { l: '緊急', v: 'danger'  },
  high:     { l: '高',   v: 'warning' },
  medium:   { l: '中',   v: 'info'    },
  low:      { l: '低',   v: 'success' },
};

const FSTATUS_CFG: Record<FindingStatus, { l: string; v: 'danger' | 'warning' | 'success' }> = {
  open:        { l: '未対応',  v: 'danger'  },
  in_progress: { l: '対応中',  v: 'warning' },
  resolved:    { l: '解決済',  v: 'success' },
};

const getSev    = (s: string) => SEV_CFG[s as Severity] ?? SEV_CFG.medium;
const getFStatus = (s: string) => FSTATUS_CFG[s as FindingStatus] ?? FSTATUS_CFG.open;

const overallScore = Math.round(FRAMEWORKS.reduce((s, f) => s + f.score, 0) / FRAMEWORKS.length);
const frameworkBarData = FRAMEWORKS.map(f => ({ label: f.name, value: f.score, color: f.color }));

export default function CompliancePage() {
  const compColor = overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">コンプライアンスダッシュボード</h1>
          <p className="page-subtitle">ISO 27001 / J-SOX / NIST CSF 統合コンプライアンス管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">PDFエクスポート</button>
        </div>
      </div>

      {/* Overview chart */}
      <div className="card">
        <h2 className="card-title">コンプライアンス概要</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">総合スコア</p>
            <DonutChart value={overallScore} max={100} size={140} strokeWidth={14} color={compColor} />
            <p className="chart-sublabel">全フレームワーク平均</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label">フレームワーク別スコア</p>
            <MiniBarChart data={frameworkBarData} maxValue={100} height={160} />
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">総合スコア</p><p className="stat-value" style={{ color: compColor }}>{overallScore}%</p></div>
        <div className="card card-center"><p className="stat-label">準拠コントロール数</p><p className="stat-value text-green">{FRAMEWORKS.reduce((s, f) => s + f.passed, 0)}</p></div>
        <div className="card card-center"><p className="stat-label">非準拠</p><p className="stat-value text-red">{FRAMEWORKS.reduce((s, f) => s + f.failed, 0)}</p></div>
        <div className="card card-center"><p className="stat-label">未確認</p><p className="stat-value text-amber">{FRAMEWORKS.reduce((s, f) => s + f.pending, 0)}</p></div>
      </div>

      {/* Framework details */}
      <div className="card">
        <h2 className="card-title">フレームワーク別詳細</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FRAMEWORKS.map(f => (
            <div key={f.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                <span className="text-main" style={{ fontWeight: 600 }}>{f.name}</span>
                <span style={{ fontSize: 13, color: f.score >= 80 ? '#10b981' : f.score >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{f.score}%</span>
              </div>
              <ProgressBar value={f.score} max={100} color={f.score >= 80 ? '#10b981' : f.score >= 60 ? '#f59e0b' : '#ef4444'} />
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>総コントロール: {f.controls}</span>
                <span style={{ color: '#10b981' }}>準拠: {f.passed}</span>
                <span style={{ color: '#ef4444' }}>非準拠: {f.failed}</span>
                <span style={{ color: '#f59e0b' }}>未確認: {f.pending}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent findings */}
      <div className="card table-card">
        <h2 className="card-title">最近の検出事項</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ID', 'フレームワーク', 'コントロール', '検出事項', '重大度', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {RECENT_FINDINGS.map(f => {
                const sc = getSev(f.severity);
                const fs = getFStatus(f.status);
                return (
                  <tr key={f.id} className="table-row-hover">
                    <td className="mono text-sub">{f.id}</td>
                    <td>{f.framework}</td>
                    <td className="mono text-sub">{f.control}</td>
                    <td>{f.finding}</td>
                    <td><Badge variant={sc.v}>{sc.l}</Badge></td>
                    <td><Badge variant={fs.v} dot>{fs.l}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
