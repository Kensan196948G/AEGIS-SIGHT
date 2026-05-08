'use client';

import { Badge, ProgressBar } from '@/components/ui/design-components';

const ENDPOINTS = [
  { name: 'Authentication API',   path: '/api/auth',          status: 'healthy',  latency: 42,  uptime: 99.99, rps: 1240 },
  { name: 'Device Management',    path: '/api/devices',       status: 'healthy',  latency: 87,  uptime: 99.97, rps:  380 },
  { name: 'Alert Service',        path: '/api/alerts',        status: 'healthy',  latency: 65,  uptime: 99.95, rps:  210 },
  { name: 'Compliance Engine',    path: '/api/compliance',    status: 'warning',  latency: 312, uptime: 99.80, rps:   95 },
  { name: 'SIEM Integration',     path: '/api/siem',          status: 'critical', latency: 890, uptime: 97.50, rps:   12 },
  { name: 'License Validator',    path: '/api/licenses',      status: 'healthy',  latency: 54,  uptime: 99.98, rps:  540 },
  { name: 'Patch Management',     path: '/api/patches',       status: 'healthy',  latency: 73,  uptime: 99.96, rps:  160 },
  { name: 'Report Generator',     path: '/api/reports',       status: 'healthy',  latency: 145, uptime: 99.92, rps:   44 },
];

const SERVICES = [
  { name: 'PostgreSQL (Primary)',  status: 'healthy',  detail: 'Read/Write OK'  },
  { name: 'PostgreSQL (Replica)', status: 'healthy',  detail: 'Replication lag: 2ms' },
  { name: 'Redis Cache',          status: 'healthy',  detail: 'HIT rate: 94.2%' },
  { name: 'Celery Worker',        status: 'warning',  detail: 'Queue depth: 1,240' },
  { name: 'MinIO Object Storage', status: 'healthy',  detail: 'Capacity: 42%' },
];

type EpStatus = 'healthy' | 'warning' | 'critical';
const STATUS_CFG: Record<EpStatus, { l: string; v: 'success' | 'warning' | 'danger' }> = {
  healthy:  { l: '正常', v: 'success' },
  warning:  { l: '警告', v: 'warning' },
  critical: { l: '危険', v: 'danger'  },
};

const getLatencyColor = (ms: number) => ms >= 500 ? '#ef4444' : ms >= 200 ? '#f59e0b' : '#10b981';

const healthyCount  = ENDPOINTS.filter(e => e.status === 'healthy').length;
const warningCount  = ENDPOINTS.filter(e => e.status === 'warning').length;
const criticalCount = ENDPOINTS.filter(e => e.status === 'critical').length;
const avgLatency    = Math.round(ENDPOINTS.reduce((s, e) => s + e.latency, 0) / ENDPOINTS.length);

export default function ApiStatusPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">API ステータス</h1>
          <p className="page-subtitle">バックエンド API エンドポイントとインフラサービスの稼働状況</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">更新</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">正常</p><p className="stat-value text-green">{healthyCount}</p></div>
        <div className="card card-center"><p className="stat-label">警告</p><p className="stat-value text-amber">{warningCount}</p></div>
        <div className="card card-center"><p className="stat-label">異常</p><p className="stat-value text-red">{criticalCount}</p></div>
        <div className="card card-center"><p className="stat-label">平均レイテンシ</p><p className="stat-value" style={{ color: getLatencyColor(avgLatency), fontSize: 20 }}>{avgLatency}ms</p></div>
      </div>

      <div className="card table-card">
        <h2 className="card-title">API エンドポイント一覧</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['サービス名', 'パス', 'レイテンシ', '稼働率', 'RPS', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {ENDPOINTS.map(ep => {
                const st = STATUS_CFG[ep.status as EpStatus] ?? STATUS_CFG.healthy;
                return (
                  <tr key={ep.path} className="table-row-hover">
                    <td><span className="text-main" style={{ fontWeight: 500 }}>{ep.name}</span></td>
                    <td className="mono text-sub">{ep.path}</td>
                    <td>
                      <span style={{ color: getLatencyColor(ep.latency), fontWeight: 600, fontSize: 13 }}>
                        {ep.latency}ms
                      </span>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <ProgressBar value={ep.uptime} max={100} color={ep.uptime >= 99.9 ? '#10b981' : ep.uptime >= 99 ? '#f59e0b' : '#ef4444'} size="sm" />
                      <span className="text-sub" style={{ fontSize: 11 }}>{ep.uptime}%</span>
                    </td>
                    <td className="text-sub">{ep.rps.toLocaleString()}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">インフラサービス</h2>
        <div className="activity-list">
          {SERVICES.map(svc => {
            const st = STATUS_CFG[svc.status as EpStatus] ?? STATUS_CFG.healthy;
            return (
              <div key={svc.name} className="activity-item">
                <div className="activity-dot" style={{
                  background: svc.status === 'healthy' ? '#10b981' : svc.status === 'warning' ? '#f59e0b' : '#ef4444',
                }} />
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{svc.name}</strong>
                    <span className="text-sub" style={{ marginLeft: 8 }}>{svc.detail}</span>
                  </p>
                  <div style={{ marginTop: 4 }}>
                    <Badge variant={st.v}>{st.l}</Badge>
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
