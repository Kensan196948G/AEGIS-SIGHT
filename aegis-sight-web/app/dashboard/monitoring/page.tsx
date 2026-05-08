'use client';

import {
  Badge, ProgressBar, Sparkline,
} from '@/components/ui/design-components';

const SERVERS = [
  { id: 'sv-001', name: 'aegis-ap-01',   role: 'アプリケーション', cpu: 42, mem: 68, disk: 55, status: 'healthy', uptime: '99.98%', cpuHistory: [35,40,38,42,45,40,42] },
  { id: 'sv-002', name: 'aegis-ap-02',   role: 'アプリケーション', cpu: 38, mem: 62, disk: 55, status: 'healthy', uptime: '99.97%', cpuHistory: [30,35,38,36,40,38,38] },
  { id: 'sv-003', name: 'aegis-db-01',   role: 'データベース',     cpu: 71, mem: 85, disk: 78, status: 'warning', uptime: '99.95%', cpuHistory: [50,60,65,70,72,70,71] },
  { id: 'sv-004', name: 'aegis-auth-01', role: '認証サーバー',     cpu: 25, mem: 45, disk: 40, status: 'healthy', uptime: '100%',   cpuHistory: [20,22,25,24,26,25,25] },
  { id: 'sv-005', name: 'aegis-proxy-01', role: 'リバースプロキシ', cpu: 15, mem: 30, disk: 25, status: 'healthy', uptime: '100%',   cpuHistory: [12,14,15,16,15,14,15] },
  { id: 'sv-006', name: 'aegis-siem-01', role: 'SIEM',            cpu: 88, mem: 92, disk: 91, status: 'critical', uptime: '99.50%', cpuHistory: [70,75,80,85,88,90,88] },
];

type SrvStatus = 'healthy' | 'warning' | 'critical' | 'offline';
const STATUS_CFG: Record<SrvStatus, { l: string; v: 'success' | 'warning' | 'danger' | 'default' }> = {
  healthy:  { l: '正常',   v: 'success' },
  warning:  { l: '警告',   v: 'warning' },
  critical: { l: '危険',   v: 'danger'  },
  offline:  { l: 'オフライン', v: 'default' },
};
const getStatus = (s: string) => STATUS_CFG[s as SrvStatus] ?? STATUS_CFG.offline;

const getColor = (v: number) => v >= 80 ? '#ef4444' : v >= 60 ? '#f59e0b' : '#10b981';

const healthyCount  = SERVERS.filter(s => s.status === 'healthy').length;
const warningCount  = SERVERS.filter(s => s.status === 'warning').length;
const criticalCount = SERVERS.filter(s => s.status === 'critical').length;

export default function MonitoringPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">システム監視</h1>
          <p className="page-subtitle">サーバー・インフラの稼働状況とリソース使用率のリアルタイム監視</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">更新</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">正常</p><p className="stat-value text-green">{healthyCount}</p></div>
        <div className="card card-center"><p className="stat-label">警告</p><p className="stat-value text-amber">{warningCount}</p></div>
        <div className="card card-center"><p className="stat-label">危険</p><p className="stat-value text-red">{criticalCount}</p></div>
      </div>

      <div className="card table-card">
        <h2 className="card-title">サーバー一覧</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['サーバー名', 'ロール', 'CPU', 'メモリ', 'ディスク', 'CPU トレンド', '稼働率', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {SERVERS.map(sv => {
                const st = getStatus(sv.status);
                return (
                  <tr key={sv.id} className="table-row-hover">
                    <td><span className="link-text mono">{sv.name}</span></td>
                    <td className="text-sub">{sv.role}</td>
                    <td style={{ minWidth: 100 }}>
                      <ProgressBar value={sv.cpu} max={100} color={getColor(sv.cpu)} size="sm" />
                      <span className="text-sub" style={{ fontSize: 11 }}>{sv.cpu}%</span>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <ProgressBar value={sv.mem} max={100} color={getColor(sv.mem)} size="sm" />
                      <span className="text-sub" style={{ fontSize: 11 }}>{sv.mem}%</span>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <ProgressBar value={sv.disk} max={100} color={getColor(sv.disk)} size="sm" />
                      <span className="text-sub" style={{ fontSize: 11 }}>{sv.disk}%</span>
                    </td>
                    <td>
                      <Sparkline data={sv.cpuHistory} color={getColor(sv.cpu)} width={80} height={28} />
                    </td>
                    <td className="text-sub">{sv.uptime}</td>
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
