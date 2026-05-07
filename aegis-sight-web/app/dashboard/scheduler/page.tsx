'use client';

import { Badge, Select } from '@/components/ui/design-components';
import { useState } from 'react';

const JOBS = [
  { id: 'jb-001', name: 'デバイス情報同期（Sophos）',      schedule: '毎時 0 分',       lastRun: '2025-01-15 14:00', nextRun: '2025-01-15 15:00', duration: '42 秒',  status: 'success', category: '同期'     },
  { id: 'jb-002', name: 'パッチステータス収集',            schedule: '毎日 02:00',      lastRun: '2025-01-15 02:00', nextRun: '2025-01-16 02:00', duration: '8 分',   status: 'success', category: 'パッチ'   },
  { id: 'jb-003', name: 'ライセンス利用量集計',            schedule: '毎日 03:00',      lastRun: '2025-01-15 03:00', nextRun: '2025-01-16 03:00', duration: '3 分',   status: 'success', category: 'SAM'      },
  { id: 'jb-004', name: 'コンプライアンスチェック',        schedule: '毎日 04:00',      lastRun: '2025-01-15 04:00', nextRun: '2025-01-16 04:00', duration: '18 分',  status: 'success', category: 'コンプラ' },
  { id: 'jb-005', name: '週次セキュリティレポート生成',    schedule: '月曜 07:00',      lastRun: '2025-01-13 07:00', nextRun: '2025-01-20 07:00', duration: '12 分',  status: 'success', category: 'レポート' },
  { id: 'jb-006', name: 'SIEM ログフォワード（Splunk）',   schedule: '5 分ごと',        lastRun: '2025-01-15 14:35', nextRun: '2025-01-15 14:40', duration: '8 秒',   status: 'failed',  category: '連携'     },
  { id: 'jb-007', name: 'バックアップ（フルバックアップ）', schedule: '日曜 01:00',     lastRun: '2025-01-12 01:00', nextRun: '2025-01-19 01:00', duration: '2 時間', status: 'success', category: 'バックアップ' },
  { id: 'jb-008', name: 'ライセンス期限アラート送信',      schedule: '毎日 09:00',      lastRun: '2025-01-15 09:00', nextRun: '2025-01-16 09:00', duration: '5 秒',   status: 'success', category: 'SAM'      },
  { id: 'jb-009', name: 'DLP ポリシー評価',               schedule: '30 分ごと',       lastRun: '2025-01-15 14:30', nextRun: '2025-01-15 15:00', duration: '1 分',   status: 'running', category: 'DLP'      },
  { id: 'jb-010', name: 'AD/LDAP ユーザー同期',           schedule: '毎時 30 分',      lastRun: '2025-01-15 14:30', nextRun: '2025-01-15 15:30', duration: '15 秒',  status: 'success', category: '同期'     },
];

const CATEGORY_OPTS = [
  { value: '', label: 'すべてのカテゴリ' },
  { value: '同期',       label: '同期' },
  { value: 'パッチ',     label: 'パッチ' },
  { value: 'SAM',        label: 'SAM' },
  { value: 'コンプラ',   label: 'コンプラ' },
  { value: 'レポート',   label: 'レポート' },
  { value: '連携',       label: '連携' },
  { value: 'バックアップ', label: 'バックアップ' },
  { value: 'DLP',        label: 'DLP' },
];

type JobStatus = 'success' | 'failed' | 'running' | 'disabled';
const STATUS_CFG: Record<JobStatus, { l: string; v: 'success' | 'danger' | 'warning' | 'default' }> = {
  success:  { l: '成功',    v: 'success' },
  failed:   { l: '失敗',    v: 'danger'  },
  running:  { l: '実行中',  v: 'warning' },
  disabled: { l: '無効',    v: 'default' },
};

const successCount = JOBS.filter(j => j.status === 'success').length;
const failedCount  = JOBS.filter(j => j.status === 'failed').length;
const runningCount = JOBS.filter(j => j.status === 'running').length;

export default function SchedulerPage() {
  const [category, setCategory] = useState('');

  const filtered = JOBS.filter(j => !category || j.category === category);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">スケジューラー</h1>
          <p className="page-subtitle">自動化ジョブ・バッチ処理のスケジュール管理と実行ログ</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">更新</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">登録ジョブ数</p><p className="stat-value">{JOBS.length}</p></div>
        <div className="card card-center"><p className="stat-label">成功</p><p className="stat-value text-green">{successCount}</p></div>
        <div className="card card-center"><p className="stat-label">実行中</p><p className="stat-value text-amber">{runningCount}</p></div>
        <div className="card card-center"><p className="stat-label">失敗</p><p className="stat-value text-red">{failedCount}</p></div>
      </div>

      <div className="card filter-row">
        <Select options={CATEGORY_OPTS} value={category} onChange={v => setCategory(v)} style={{ minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <h2 className="card-title">ジョブ一覧</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ジョブ名', 'カテゴリ', 'スケジュール', '最終実行', '次回実行', '所要時間', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(j => {
                const st = STATUS_CFG[j.status as JobStatus] ?? STATUS_CFG.disabled;
                return (
                  <tr key={j.id} className="table-row-hover">
                    <td><span className="text-main" style={{ fontWeight: 500 }}>{j.name}</span></td>
                    <td><Badge variant="default">{j.category}</Badge></td>
                    <td className="text-sub">{j.schedule}</td>
                    <td className="text-sub">{j.lastRun}</td>
                    <td className="text-sub">{j.nextRun}</td>
                    <td className="text-sub">{j.duration}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="table-empty">条件に一致するジョブが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {JOBS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
