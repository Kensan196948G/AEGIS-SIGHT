'use client';

import { Badge, SearchInput, DonutChart, ProgressBar } from '@/components/ui/design-components';
import { useState } from 'react';

const REMOTE_USERS = [
  { id: 'ru-001', name: '田中 浩',       dept: 'セキュリティ',     device: 'ThinkPad X1', vpn: true,  location: '東京（自宅）',     lastSeen: '2025-01-15 14:30', mfa: true,  risk: 'low'    },
  { id: 'ru-002', name: '山本 健司',     dept: 'エンジニアリング', device: 'MacBook Pro',  vpn: true,  location: '大阪（自宅）',     lastSeen: '2025-01-15 14:15', mfa: true,  risk: 'low'    },
  { id: 'ru-003', name: '伊藤 勝',       dept: 'インフラ',         device: 'ThinkPad E15', vpn: false, location: 'カフェ（公共Wi-Fi）', lastSeen: '2025-01-15 13:45', mfa: true,  risk: 'high'   },
  { id: 'ru-004', name: '鈴木 明',       dept: '営業',             device: 'Surface Pro',  vpn: true,  location: '名古屋（客先）',   lastSeen: '2025-01-15 12:00', mfa: false, risk: 'medium' },
  { id: 'ru-005', name: '渡辺 さくら',   dept: '内部監査',         device: 'ThinkPad X1', vpn: true,  location: '横浜（自宅）',     lastSeen: '2025-01-15 11:30', mfa: true,  risk: 'low'    },
  { id: 'ru-006', name: '高橋 誠一',     dept: '人事',             device: 'VAIO SX14',   vpn: false, location: '不明',             lastSeen: '2025-01-15 09:10', mfa: false, risk: 'high'   },
  { id: 'ru-007', name: '中村 大樹',     dept: '建設現場管理',     device: 'iPad Pro',     vpn: true,  location: '現場（神奈川）',   lastSeen: '2025-01-15 08:45', mfa: true,  risk: 'low'    },
];

const VPN_STATS = [
  { label: '接続中', value: 5,  color: '#10b981' },
  { label: '未接続', value: 2,  color: '#ef4444' },
];

type RiskLevel = 'low' | 'medium' | 'high';
const RISK_CFG: Record<RiskLevel, { l: string; v: 'success' | 'warning' | 'danger' }> = {
  low:    { l: '低',  v: 'success' },
  medium: { l: '中',  v: 'warning' },
  high:   { l: '高',  v: 'danger'  },
};

const vpnCount   = REMOTE_USERS.filter(u => u.vpn).length;
const mfaCount   = REMOTE_USERS.filter(u => u.mfa).length;
const highRiskCount = REMOTE_USERS.filter(u => u.risk === 'high').length;

export default function RemoteWorkPage() {
  const [search, setSearch] = useState('');

  const filtered = REMOTE_USERS.filter(u =>
    !search ||
    u.name.includes(search) ||
    u.dept.includes(search) ||
    u.location.includes(search)
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">リモートワーク管理</h1>
          <p className="page-subtitle">テレワーク中のユーザー接続状況・VPN・セキュリティリスクの監視</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">更新</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">リモート接続中</p><p className="stat-value">{REMOTE_USERS.length}</p></div>
        <div className="card card-center"><p className="stat-label">VPN 接続済</p><p className="stat-value text-green">{vpnCount}</p></div>
        <div className="card card-center"><p className="stat-label">MFA 有効</p><p className="stat-value text-green">{mfaCount}</p></div>
        <div className="card card-center"><p className="stat-label">高リスクユーザー</p><p className="stat-value text-red">{highRiskCount}</p></div>
      </div>

      <div className="card">
        <h2 className="card-title">接続状況サマリー</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">VPN 接続率</p>
            <DonutChart value={Math.round(vpnCount / REMOTE_USERS.length * 100)} max={100} size={130} strokeWidth={13} color="#10b981" />
            <p className="chart-sublabel">{vpnCount}/{REMOTE_USERS.length} 名が VPN 接続中</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label" style={{ marginBottom: 8 }}>セキュリティ指標</p>
            {[
              { label: 'VPN 接続率',  value: Math.round(vpnCount / REMOTE_USERS.length * 100),   color: '#10b981' },
              { label: 'MFA 適用率',  value: Math.round(mfaCount / REMOTE_USERS.length * 100),   color: '#10b981' },
              { label: '高リスク率',  value: Math.round(highRiskCount / REMOTE_USERS.length * 100), color: '#ef4444' },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span className="text-sub" style={{ fontSize: 12 }}>{m.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.value}%</span>
                </div>
                <ProgressBar value={m.value} max={100} color={m.color} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="氏名・部門・接続場所で検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['氏名', '部門', 'デバイス', 'VPN', 'MFA', '接続場所', '最終確認', 'リスク'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(u => {
                const rk = RISK_CFG[u.risk as RiskLevel] ?? RISK_CFG.low;
                return (
                  <tr key={u.id} className="table-row-hover">
                    <td><span className="text-main">{u.name}</span></td>
                    <td className="text-sub">{u.dept}</td>
                    <td className="text-sub">{u.device}</td>
                    <td><Badge variant={u.vpn ? 'success' : 'danger'} dot>{u.vpn ? '接続中' : '未接続'}</Badge></td>
                    <td><Badge variant={u.mfa ? 'success' : 'danger'} dot>{u.mfa ? '有効' : '無効'}</Badge></td>
                    <td className="text-sub">{u.location}</td>
                    <td className="text-sub">{u.lastSeen}</td>
                    <td><Badge variant={rk.v}>{rk.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="table-empty">条件に一致するユーザーが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {REMOTE_USERS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
