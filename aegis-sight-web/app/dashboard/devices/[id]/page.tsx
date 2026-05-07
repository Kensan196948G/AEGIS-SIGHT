'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/design-components';

const DEVICE = {
  hostname:   'DESK-PC-0042',
  os:         'Windows 11 Pro 22H2',
  ip:         '192.168.1.142',
  mac:        'AA:BB:CC:DD:EE:FF',
  domain:     'aegis.local',
  id:         'DEV-0042',
  lastSeen:   '2025-01-15 14:35',
  registered: '2024-04-01',
};

const SOFTWARE = [
  { id: 1, name: 'Microsoft 365 Business Premium', version: '16.0.17328',   publisher: 'Microsoft Corporation', installed: '2024-04-01' },
  { id: 2, name: 'Google Chrome',                  version: '121.0.6167',   publisher: 'Google LLC',            installed: '2024-04-02' },
  { id: 3, name: 'Sophos Intercept X',             version: '2023.1.5',     publisher: 'Sophos',                installed: '2024-04-01' },
  { id: 4, name: 'Adobe Acrobat Reader',           version: '23.008',       publisher: 'Adobe Systems',         installed: '2024-04-05' },
  { id: 5, name: 'Slack',                          version: '4.35.131',     publisher: 'Slack Technologies',    installed: '2024-05-10' },
  { id: 6, name: 'Zoom',                           version: '5.17.5',       publisher: 'Zoom Video',            installed: '2024-06-15' },
  { id: 7, name: '7-Zip',                          version: '23.01',        publisher: 'Igor Pavlov',           installed: '2024-04-03' },
  { id: 8, name: 'Notepad++',                      version: '8.6.2',        publisher: 'Don Ho',                installed: '2024-07-20' },
];

export default function DeviceDetailPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-sub" style={{ fontSize: 12, marginBottom: 4 }}>
            <Link href="/dashboard/devices" style={{ color: 'var(--primary)' }}>デバイス管理</Link>
            {' / '}
            <span>{DEVICE.hostname}</span>
          </p>
          <h1 className="page-title">{DEVICE.hostname}</h1>
          <p className="page-subtitle">{DEVICE.os} / {DEVICE.domain}</p>
        </div>
        <Badge variant="success" dot>アクティブ</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h2 className="card-title">基本情報</h2>
            <div className="detail-grid">
              {([
                ['ホスト名',      DEVICE.hostname],
                ['OS バージョン', DEVICE.os],
                ['IP アドレス',   DEVICE.ip],
                ['MAC アドレス',  DEVICE.mac],
                ['ドメイン',      DEVICE.domain],
                ['デバイス ID',   DEVICE.id],
                ['最終確認',      DEVICE.lastSeen],
                ['登録日',        DEVICE.registered],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="detail-item">
                  <span className="detail-label">{k}</span>
                  <span className="detail-value">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card table-card">
            <h2 className="card-title">
              インストール済みソフトウェア
              <span className="text-sub" style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
                ({SOFTWARE.length} 件)
              </span>
            </h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr>
                  {['ソフトウェア名', 'バージョン', '発行元', 'インストール日'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {SOFTWARE.map(sw => (
                    <tr key={sw.id} className="table-row-hover">
                      <td><span className="text-main" style={{ fontWeight: 500 }}>{sw.name}</span></td>
                      <td className="mono text-sub">{sw.version}</td>
                      <td className="text-sub">{sw.publisher}</td>
                      <td className="text-sub">{sw.installed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <h2 className="card-title">クイックアクション</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['監視詳細を見る', 'パッチ履歴', 'セキュリティスキャン', 'ログ一覧', '関連アラート'].map(action => (
              <button key={action} className="btn-secondary" style={{ textAlign: 'left' }}>{action}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
