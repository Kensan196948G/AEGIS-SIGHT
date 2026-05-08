'use client';

import { Badge } from '@/components/ui/design-components';

const VERSIONS = [
  { version: 'v2.4.1', date: '2025-01-15', type: 'patch',  note: 'セキュリティパッチ適用、SLA算出ロジック修正' },
  { version: 'v2.4.0', date: '2025-01-08', type: 'minor',  note: 'コンプライアンス管理モジュール追加、DLP 統合強化' },
  { version: 'v2.3.2', date: '2024-12-20', type: 'patch',  note: 'パフォーマンス改善、ダッシュボード応答速度 40% 向上' },
  { version: 'v2.3.0', date: '2024-12-01', type: 'minor',  note: 'リモートワーク管理機能追加、印刷管理統合' },
  { version: 'v2.2.0', date: '2024-11-15', type: 'minor',  note: 'SAM（ソフトウェア資産管理）モジュール全面刷新' },
  { version: 'v2.0.0', date: '2024-10-01', type: 'major',  note: 'アーキテクチャ刷新、マイクロサービス移行完了' },
];

const TEAM = [
  { name: '田中 浩',     role: 'プロダクトオーナー',   dept: 'セキュリティ',       avatar: 'TH' },
  { name: '山本 健司',   role: 'テックリード',         dept: 'エンジニアリング',   avatar: 'YK' },
  { name: '佐藤 由紀',   role: 'UXデザイナー',         dept: 'コンプライアンス',   avatar: 'SY' },
  { name: '伊藤 勝',     role: 'インフラエンジニア',   dept: 'インフラ',           avatar: 'IM' },
];

const INTEGRATIONS = [
  { name: 'Sophos Central', status: '接続中', version: 'API v2' },
  { name: 'Microsoft 365',  status: '接続中', version: 'Graph API v1.0' },
  { name: 'Splunk SIEM',    status: '未接続', version: 'v8.2' },
  { name: 'GitHub Enterprise', status: '接続中', version: 'API v3' },
  { name: 'LDAP / AD',      status: '接続中', version: 'RFC 4511' },
];

type VerType = 'major' | 'minor' | 'patch';
const VER_CFG: Record<VerType, { l: string; v: 'danger' | 'info' | 'default' }> = {
  major: { l: 'メジャー', v: 'danger'  },
  minor: { l: 'マイナー', v: 'info'    },
  patch: { l: 'パッチ',   v: 'default' },
};

export default function AboutPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">システム情報</h1>
          <p className="page-subtitle">AEGIS-SIGHT のバージョン情報・開発チーム・外部連携の概要</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center">
          <p className="stat-label">現在のバージョン</p>
          <p className="stat-value text-green" style={{ fontSize: 22 }}>v2.4.1</p>
        </div>
        <div className="card card-center">
          <p className="stat-label">最終更新日</p>
          <p className="stat-value" style={{ fontSize: 20 }}>2025-01-15</p>
        </div>
        <div className="card card-center">
          <p className="stat-label">稼働環境</p>
          <p className="stat-value" style={{ fontSize: 18 }}>Production</p>
        </div>
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h2 className="card-title">開発チーム</h2>
          <div className="activity-list">
            {TEAM.map(m => (
              <div key={m.name} className="activity-item">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {m.avatar}
                </div>
                <div className="activity-content">
                  <p className="activity-text"><strong>{m.name}</strong></p>
                  <p className="text-sub" style={{ fontSize: 12 }}>{m.role} — {m.dept}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">外部連携状態</h2>
          <div className="activity-list">
            {INTEGRATIONS.map(i => (
              <div key={i.name} className="activity-item">
                <div className="activity-dot" style={{ background: i.status === '接続中' ? '#10b981' : '#6b7280' }} />
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{i.name}</strong>
                    <span className="text-sub" style={{ marginLeft: 8, fontSize: 11 }}>{i.version}</span>
                  </p>
                  <Badge variant={i.status === '接続中' ? 'success' : 'default'} dot>{i.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card table-card">
        <h2 className="card-title">バージョン履歴</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['バージョン', 'リリース日', '種別', '変更内容'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {VERSIONS.map(v => {
                const cfg = VER_CFG[v.type as VerType] ?? VER_CFG.patch;
                return (
                  <tr key={v.version} className="table-row-hover">
                    <td><span className="link-text mono">{v.version}</span></td>
                    <td className="text-sub">{v.date}</td>
                    <td><Badge variant={cfg.v}>{cfg.l}</Badge></td>
                    <td className="text-sub">{v.note}</td>
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
