'use client';

import { useState } from 'react';
import { Badge, SearchInput } from '@/components/ui/design-components';

const SESSIONS = [
  { id: 'ss-001', user: '田中 浩',       username: 'tanaka.hiroshi',    role: 'admin',    ip: '192.168.1.101', device: 'Chrome 121 / Windows 11', location: '東京',   started: '2025-01-15 09:02', lastActive: '2025-01-15 14:35', mfa: true,  current: true  },
  { id: 'ss-002', user: '山本 健司',     username: 'yamamoto.kenji',    role: 'operator', ip: '192.168.1.102', device: 'Safari 17 / macOS 14',    location: '大阪',   started: '2025-01-15 08:55', lastActive: '2025-01-15 14:20', mfa: true,  current: false },
  { id: 'ss-003', user: '佐藤 由紀',     username: 'sato.yuki',         role: 'operator', ip: '192.168.1.103', device: 'Edge 121 / Windows 10',   location: '東京',   started: '2025-01-15 10:30', lastActive: '2025-01-15 14:10', mfa: true,  current: false },
  { id: 'ss-004', user: '伊藤 勝',       username: 'ito.masaru',        role: 'operator', ip: '10.0.0.45',     device: 'Chrome 121 / Ubuntu',     location: '名古屋', started: '2025-01-15 11:10', lastActive: '2025-01-15 13:55', mfa: false, current: false },
  { id: 'ss-005', user: '鈴木 明',       username: 'suzuki.akira',      role: 'viewer',   ip: '203.0.113.25',  device: 'Mobile Safari / iOS 17',  location: '不明（外部）', started: '2025-01-15 13:00', lastActive: '2025-01-15 13:45', mfa: false, current: false },
  { id: 'ss-006', user: '渡辺 さくら',   username: 'watanabe.sakura',   role: 'auditor',  ip: '192.168.1.106', device: 'Firefox 122 / Windows 11', location: '東京',  started: '2025-01-15 09:15', lastActive: '2025-01-15 13:30', mfa: true,  current: false },
];

type RoleKey = 'admin' | 'operator' | 'viewer' | 'auditor';
const ROLE_CFG: Record<RoleKey, { l: string; v: 'danger' | 'warning' | 'info' | 'success' }> = {
  admin:    { l: '管理者',       v: 'danger'  },
  operator: { l: 'オペレーター', v: 'warning' },
  viewer:   { l: '閲覧者',       v: 'info'    },
  auditor:  { l: '監査者',       v: 'success' },
};

const totalSessions = SESSIONS.length;
const mfaSessions   = SESSIONS.filter(s => s.mfa).length;
const externalCount = SESSIONS.filter(s => s.location.includes('外部') || s.ip.startsWith('203.')).length;

export default function SessionsPage() {
  const [search, setSearch] = useState('');

  const filtered = SESSIONS.filter(s =>
    !search ||
    s.user.includes(search) ||
    s.username.includes(search) ||
    s.ip.includes(search) ||
    s.device.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">セッション管理</h1>
          <p className="page-subtitle">現在アクティブなユーザーセッションの監視と強制ログアウト</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">更新</button>
          <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }}>全セッション強制終了</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">アクティブセッション</p><p className="stat-value">{totalSessions}</p></div>
        <div className="card card-center"><p className="stat-label">MFA 認証済</p><p className="stat-value text-green">{mfaSessions}</p></div>
        <div className="card card-center"><p className="stat-label">MFA 未認証</p><p className="stat-value text-red">{totalSessions - mfaSessions}</p></div>
        <div className="card card-center"><p className="stat-label">外部アクセス</p><p className="stat-value text-amber">{externalCount}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="ユーザー名・IP アドレス・デバイスで検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ユーザー', 'ロール', 'IP アドレス', 'デバイス', '接続元', 'セッション開始', '最終アクティブ', 'MFA', '操作'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(s => {
                const rl = ROLE_CFG[s.role as RoleKey] ?? ROLE_CFG.viewer;
                return (
                  <tr key={s.id} className="table-row-hover">
                    <td>
                      <span className="text-main">{s.user}</span>
                      {s.current && <span style={{ marginLeft: 6, display: 'inline-block' }}><Badge variant="success" size="sm">現在</Badge></span>}
                    </td>
                    <td><Badge variant={rl.v}>{rl.l}</Badge></td>
                    <td className="mono text-sub">{s.ip}</td>
                    <td className="text-sub" style={{ fontSize: 11 }}>{s.device}</td>
                    <td className="text-sub">{s.location}</td>
                    <td className="text-sub">{s.started}</td>
                    <td className="text-sub">{s.lastActive}</td>
                    <td><Badge variant={s.mfa ? 'success' : 'danger'} dot>{s.mfa ? '有効' : '無効'}</Badge></td>
                    <td>
                      {!s.current && (
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444', borderColor: '#ef4444' }}>
                          強制終了
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={9} className="table-empty">条件に一致するセッションが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {SESSIONS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
