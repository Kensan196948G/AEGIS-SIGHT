'use client';

import { useState } from 'react';
import {
  Badge, SearchInput, Modal,
} from '@/components/ui/design-components';

const USERS = [
  { id: 'us-001', name: '田中 浩',         username: 'tanaka.hiroshi',  role: 'admin',    dept: 'セキュリティ',     status: 'active',   lastLogin: '2025-01-15 09:02', mfa: true  },
  { id: 'us-002', name: '山本 健司',       username: 'yamamoto.kenji',  role: 'operator', dept: 'エンジニアリング', status: 'active',   lastLogin: '2025-01-15 08:55', mfa: true  },
  { id: 'us-003', name: '佐藤 由紀',       username: 'sato.yuki',       role: 'operator', dept: 'コンプライアンス', status: 'active',   lastLogin: '2025-01-15 10:30', mfa: true  },
  { id: 'us-004', name: '伊藤 勝',         username: 'ito.masaru',      role: 'operator', dept: 'インフラ',         status: 'active',   lastLogin: '2025-01-15 11:10', mfa: false },
  { id: 'us-005', name: '鈴木 明',         username: 'suzuki.akira',    role: 'viewer',   dept: '営業',             status: 'active',   lastLogin: '2025-01-15 13:00', mfa: false },
  { id: 'us-006', name: '渡辺 さくら',     username: 'watanabe.sakura', role: 'auditor',  dept: '内部監査',         status: 'active',   lastLogin: '2025-01-14 16:45', mfa: true  },
  { id: 'us-007', name: '高橋 誠一',       username: 'takahashi.seiichi', role: 'viewer', dept: '人事',             status: 'inactive', lastLogin: '2024-12-20 09:00', mfa: false },
];

type RoleKey   = 'admin' | 'operator' | 'viewer' | 'auditor';
type UserStatus = 'active' | 'inactive' | 'locked';
type User = typeof USERS[number];

const ROLE_CFG: Record<RoleKey, { l: string; v: 'danger' | 'warning' | 'info' | 'success' }> = {
  admin:    { l: '管理者',     v: 'danger'  },
  operator: { l: 'オペレーター', v: 'warning' },
  viewer:   { l: '閲覧者',     v: 'info'    },
  auditor:  { l: '監査者',     v: 'success' },
};

const STATUS_CFG: Record<UserStatus, { l: string; v: 'success' | 'default' | 'danger' }> = {
  active:   { l: '有効',   v: 'success' },
  inactive: { l: '無効',   v: 'default' },
  locked:   { l: 'ロック', v: 'danger'  },
};

const getRole   = (r: string) => ROLE_CFG[r as RoleKey] ?? ROLE_CFG.viewer;
const getStatus = (s: string) => STATUS_CFG[s as UserStatus] ?? STATUS_CFG.inactive;

const activeCount = USERS.filter(u => u.status === 'active').length;
const adminCount  = USERS.filter(u => u.role === 'admin').length;
const mfaCount    = USERS.filter(u => u.mfa).length;

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<User | null>(null);

  const filtered = USERS.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.dept.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">ユーザー管理</h1>
          <p className="page-subtitle">AEGIS-SIGHT 利用ユーザーの権限・アクセス管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">ユーザーを追加</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">総ユーザー数</p><p className="stat-value">{USERS.length}</p></div>
        <div className="card card-center"><p className="stat-label">有効</p><p className="stat-value text-green">{activeCount}</p></div>
        <div className="card card-center"><p className="stat-label">管理者</p><p className="stat-value text-red">{adminCount}</p></div>
        <div className="card card-center"><p className="stat-label">MFA 有効</p><p className="stat-value text-green">{mfaCount}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="氏名・ユーザー名・部門で検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['氏名', 'ユーザー名', 'ロール', '部門', 'MFA', '最終ログイン', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(u => {
                const rl = getRole(u.role);
                const st = getStatus(u.status);
                return (
                  <tr key={u.id} className="table-row-hover" onClick={() => setDetail(u)} style={{ cursor: 'pointer' }}>
                    <td><span className="link-text">{u.name}</span></td>
                    <td className="mono text-sub">{u.username}</td>
                    <td><Badge variant={rl.v}>{rl.l}</Badge></td>
                    <td className="text-sub">{u.dept}</td>
                    <td>
                      <Badge variant={u.mfa ? 'success' : 'danger'} dot>{u.mfa ? '有効' : '無効'}</Badge>
                    </td>
                    <td className="text-sub">{u.lastLogin}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="table-empty">条件に一致するユーザーが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {USERS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'ユーザー詳細'} wide>
        {detail && (
          <div className="detail-grid">
            {([
              ['ユーザー名', detail.username],
              ['ロール',     getRole(detail.role).l],
              ['部門',       detail.dept],
              ['MFA',        detail.mfa ? '有効' : '無効'],
              ['最終ログイン', detail.lastLogin],
              ['ステータス',  getStatus(detail.status).l],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="detail-item">
                <span className="detail-label">{k}</span>
                <span className="detail-value">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
