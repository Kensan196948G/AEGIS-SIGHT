'use client';

import {
  Badge, ProgressBar,
} from '@/components/ui/design-components';

const SUBNETS = [
  { id: 'sn-001', name: 'コアネットワーク',     cidr: '192.168.1.0/24',  vlan: 10,  total: 254, used: 187, gateway: '192.168.1.1',  status: 'normal'  },
  { id: 'sn-002', name: '開発セグメント',         cidr: '192.168.10.0/24', vlan: 20,  total: 254, used:  98, gateway: '192.168.10.1', status: 'normal'  },
  { id: 'sn-003', name: '現場端末セグメント',     cidr: '10.20.0.0/22',    vlan: 30,  total: 1022, used: 210, gateway: '10.20.0.1',   status: 'normal'  },
  { id: 'sn-004', name: 'サーバーセグメント',     cidr: '10.10.0.0/24',    vlan: 100, total: 254, used:  42, gateway: '10.10.0.1',    status: 'normal'  },
  { id: 'sn-005', name: '隔離セグメント',         cidr: '172.16.99.0/24',  vlan: 999, total: 254, used:  47, gateway: '172.16.99.1',  status: 'warning' },
  { id: 'sn-006', name: 'DMZ',                   cidr: '203.0.113.0/28',  vlan: 200, total:  14, used:   6, gateway: '203.0.113.1',  status: 'normal'  },
];

type NetStatus = 'normal' | 'warning' | 'danger';
const STATUS_CFG: Record<NetStatus, { l: string; v: 'success' | 'warning' | 'danger' }> = {
  normal:  { l: '正常', v: 'success' },
  warning: { l: '注意', v: 'warning' },
  danger:  { l: '異常', v: 'danger'  },
};
const getStatus = (s: string) => STATUS_CFG[s as NetStatus] ?? STATUS_CFG.normal;

const totalUsed  = SUBNETS.reduce((s, n) => s + n.used, 0);
const totalAddrs = SUBNETS.reduce((s, n) => s + n.total, 0);
const utilRate   = Math.round((totalUsed / Math.max(totalAddrs, 1)) * 100);

export default function NetworkPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">ネットワーク管理</h1>
          <p className="page-subtitle">サブネット・VLAN・IP アドレス利用状況の可視化</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">サブネットを追加</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">サブネット数</p><p className="stat-value">{SUBNETS.length}</p></div>
        <div className="card card-center"><p className="stat-label">総 IP アドレス</p><p className="stat-value">{totalAddrs.toLocaleString()}</p></div>
        <div className="card card-center"><p className="stat-label">使用中</p><p className="stat-value text-green">{totalUsed.toLocaleString()}</p></div>
        <div className="card card-center">
          <p className="stat-label">IP 利用率</p>
          <p className="stat-value" style={{ color: utilRate >= 90 ? '#ef4444' : utilRate >= 70 ? '#f59e0b' : '#10b981' }}>{utilRate}%</p>
        </div>
      </div>

      <div className="card table-card">
        <h2 className="card-title">サブネット一覧</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['セグメント名', 'CIDR', 'VLAN', 'ゲートウェイ', 'IP 利用率', '使用/総数', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {SUBNETS.map(sn => {
                const st = getStatus(sn.status);
                const rate = Math.round((sn.used / Math.max(sn.total, 1)) * 100);
                return (
                  <tr key={sn.id} className="table-row-hover">
                    <td><span className="link-text">{sn.name}</span></td>
                    <td className="mono text-sub">{sn.cidr}</td>
                    <td className="text-sub">{sn.vlan}</td>
                    <td className="mono text-sub">{sn.gateway}</td>
                    <td style={{ minWidth: 140 }}>
                      <ProgressBar value={sn.used} max={sn.total} color={rate >= 90 ? '#ef4444' : rate >= 70 ? '#f59e0b' : '#10b981'} size="sm" />
                      <span className="text-sub" style={{ fontSize: 11 }}>{rate}%</span>
                    </td>
                    <td className="text-sub">{sn.used} / {sn.total}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
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
