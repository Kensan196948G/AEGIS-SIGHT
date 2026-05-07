'use client';

import {
  Badge, DonutChart, ProgressBar,
} from '@/components/ui/design-components';

const SECURITY_METRICS = [
  { name: 'エンドポイント保護率',       value: 98.2, target: 99, unit: '%', color: '#10b981' },
  { name: 'パッチ適用率（緊急）',       value: 96.4, target: 98, unit: '%', color: '#f59e0b' },
  { name: 'MFA 適用率',                value: 78.5, target: 90, unit: '%', color: '#ef4444' },
  { name: '暗号化適用率（BitLocker）',  value: 94.7, target: 98, unit: '%', color: '#f59e0b' },
  { name: 'ライセンスコンプライアンス', value: 70.0, target: 90, unit: '%', color: '#ef4444' },
  { name: 'バックアップ成功率',         value: 100,  target: 99, unit: '%', color: '#10b981' },
];

const THREATS = [
  { id: 'th-001', name: 'ランサムウェア試行',   count:  3, trend: '↑', severity: 'critical' },
  { id: 'th-002', name: '不正アクセス試行',     count: 47, trend: '→', severity: 'high'     },
  { id: 'th-003', name: 'DLP 違反',            count: 21, trend: '↓', severity: 'medium'   },
  { id: 'th-004', name: 'マルウェア検知',       count:  1, trend: '↓', severity: 'critical' },
];

type ThreatSev = 'critical' | 'high' | 'medium' | 'low';
const SEV_CFG: Record<ThreatSev, { l: string; v: 'danger' | 'warning' | 'info' | 'success' }> = {
  critical: { l: '重大', v: 'danger'  },
  high:     { l: '高',   v: 'warning' },
  medium:   { l: '中',   v: 'info'    },
  low:      { l: '低',   v: 'success' },
};
const getSev = (s: string) => SEV_CFG[s as ThreatSev] ?? SEV_CFG.medium;

const overallScore = Math.round(SECURITY_METRICS.reduce((s, m) => s + Math.min(m.value / m.target * 100, 100), 0) / SECURITY_METRICS.length);
const scoreColor = overallScore >= 90 ? '#10b981' : overallScore >= 70 ? '#f59e0b' : '#ef4444';

export default function SecurityPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">セキュリティ概要</h1>
          <p className="page-subtitle">組織全体のセキュリティ態勢と脅威の可視化</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">PDFエクスポート</button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">セキュリティスコア</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">総合スコア</p>
            <DonutChart value={overallScore} max={100} size={140} strokeWidth={14} color={scoreColor} />
            <p className="chart-sublabel">全指標の目標達成度</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label">指標別達成状況</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {SECURITY_METRICS.map(m => {
                const rate = Math.min(Math.round(m.value / m.target * 100), 100);
                return (
                  <div key={m.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span className="text-sub" style={{ fontSize: 12 }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: m.color, fontWeight: 600 }}>{m.value}{m.unit}</span>
                    </div>
                    <ProgressBar value={m.value} max={m.target > m.value ? m.target : m.value} color={m.color} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">総合スコア</p><p className="stat-value" style={{ color: scoreColor }}>{overallScore}%</p></div>
        <div className="card card-center"><p className="stat-label">目標達成指標</p><p className="stat-value text-green">{SECURITY_METRICS.filter(m => m.value >= m.target).length}</p></div>
        <div className="card card-center"><p className="stat-label">未達指標</p><p className="stat-value text-red">{SECURITY_METRICS.filter(m => m.value < m.target).length}</p></div>
        <div className="card card-center"><p className="stat-label">今日の脅威検知</p><p className="stat-value text-red">{THREATS.reduce((s, t) => s + t.count, 0)}</p></div>
      </div>

      <div className="card">
        <h2 className="card-title">脅威サマリー（本日）</h2>
        <div className="activity-list">
          {THREATS.map(t => {
            const sv = getSev(t.severity);
            return (
              <div key={t.id} className="activity-item">
                <div className="activity-dot" style={{ background: sv.v === 'danger' ? '#ef4444' : sv.v === 'warning' ? '#f59e0b' : '#3b82f6' }} />
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{t.name}</strong>
                    <span className="text-sub" style={{ marginLeft: 8 }}>{t.count} 件 {t.trend}</span>
                  </p>
                  <div style={{ marginTop: 4 }}>
                    <Badge variant={sv.v}>{sv.l}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
