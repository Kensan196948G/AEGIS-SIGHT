'use client';

import { useState } from 'react';
import {
  Badge, DonutChart, MiniBarChart, ProgressBar,
  SearchInput, Select, Modal, Tooltip,
} from '@/components/ui/design-components';

const DEMO_DEVICES = [
  { id: 'd001', hostname: 'PC-TANAKA-001',     os: 'Windows', osVer: 'Windows 11 Pro 23H2',       ip: '192.168.1.101', dept: 'エンジニアリング', status: 'online',      lastSeen: '2026-05-07 14:30', user: '田中 一郎',   cpu: 45, mem: 62, disk: 38 },
  { id: 'd002', hostname: 'PC-SATO-002',       os: 'Windows', osVer: 'Windows 10 Pro 22H2',       ip: '192.168.1.102', dept: '営業',             status: 'online',      lastSeen: '2026-05-07 14:25', user: '佐藤 花子',   cpu: 32, mem: 55, disk: 71 },
  { id: 'd003', hostname: 'MAC-YAMADA-001',    os: 'macOS',   osVer: 'macOS Sonoma 14.3',          ip: '192.168.1.103', dept: 'デザイン',         status: 'online',      lastSeen: '2026-05-07 14:28', user: '山田 次郎',   cpu: 78, mem: 81, disk: 45 },
  { id: 'd004', hostname: 'SRV-WEB-001',       os: 'Linux',   osVer: 'Ubuntu 22.04 LTS',           ip: '192.168.2.10',  dept: 'インフラ',         status: 'online',      lastSeen: '2026-05-07 14:31', user: '（共有）',    cpu: 65, mem: 72, disk: 55 },
  { id: 'd005', hostname: 'PC-SUZUKI-003',     os: 'Windows', osVer: 'Windows 11 Pro 23H2',       ip: '192.168.1.105', dept: '人事',             status: 'offline',     lastSeen: '2026-05-06 18:10', user: '鈴木 三郎',   cpu: 0,  mem: 0,  disk: 42 },
  { id: 'd006', hostname: 'PC-ITO-004',        os: 'Windows', osVer: 'Windows 10 Pro 22H2',       ip: '192.168.1.106', dept: '経理',             status: 'warning',     lastSeen: '2026-05-07 13:45', user: '伊藤 四郎',   cpu: 92, mem: 88, disk: 85 },
  { id: 'd007', hostname: 'MAC-KOBAYASHI-002', os: 'macOS',   osVer: 'macOS Ventura 13.6',         ip: '192.168.1.107', dept: 'エンジニアリング', status: 'warning',     lastSeen: '2026-05-07 12:00', user: '小林 五郎',   cpu: 55, mem: 90, disk: 78 },
  { id: 'd008', hostname: 'SRV-DB-001',        os: 'Linux',   osVer: 'CentOS Stream 9',            ip: '192.168.2.20',  dept: 'インフラ',         status: 'maintenance', lastSeen: '2026-05-07 10:00', user: '（共有）',    cpu: 12, mem: 35, disk: 62 },
  { id: 'd009', hostname: 'PC-NAKAMURA-005',   os: 'Windows', osVer: 'Windows 11 Pro 23H2',       ip: '192.168.1.109', dept: '営業',             status: 'online',      lastSeen: '2026-05-07 14:15', user: '中村 六郎',   cpu: 28, mem: 48, disk: 35 },
  { id: 'd010', hostname: 'PC-KIMURA-006',     os: 'Windows', osVer: 'Windows 10 Home 22H2',      ip: '192.168.1.110', dept: '総務',             status: 'offline',     lastSeen: '2026-05-04 17:00', user: '木村 七子',   cpu: 0,  mem: 0,  disk: 58 },
  { id: 'd011', hostname: 'PC-FIELD-A01',      os: 'Windows', osVer: 'Windows 11 Pro 23H2',       ip: '10.0.1.50',     dept: '建設現場A',        status: 'online',      lastSeen: '2026-05-07 13:50', user: '高橋 八郎',   cpu: 35, mem: 42, disk: 29 },
  { id: 'd012', hostname: 'PC-FIELD-B01',      os: 'Windows', osVer: 'Windows 11 Pro 23H2',       ip: '10.0.2.51',     dept: '建設現場B',        status: 'online',      lastSeen: '2026-05-07 14:05', user: '渡辺 九子',   cpu: 41, mem: 50, disk: 33 },
];

const DEVICE_STATS = { total: 1284, online: 1102, offline: 128, warning: 54 };

type DeviceStatus = 'online' | 'offline' | 'warning' | 'maintenance';

const STATUS_CFG: Record<DeviceStatus, { l: string; v: 'success' | 'danger' | 'warning' | 'info'; dot: string }> = {
  online:      { l: 'オンライン',     v: 'success', dot: '#10b981' },
  offline:     { l: 'オフライン',     v: 'danger',  dot: '#9ca3af' },
  warning:     { l: '要注意',         v: 'warning', dot: '#f59e0b' },
  maintenance: { l: 'メンテナンス',   v: 'info',    dot: '#3b82f6' },
};

type Device = typeof DEMO_DEVICES[number];

const getStatus = (s: string) => STATUS_CFG[s as DeviceStatus] ?? STATUS_CFG.offline;

export default function DevicesPage() {
  const [search, setSearch]     = useState('');
  const [osF, setOsF]           = useState('all');
  const [statusF, setStatusF]   = useState('all');
  const [deptF, setDeptF]       = useState('all');
  const [selected, setSelected] = useState<Device | null>(null);

  const onlineRate = Math.round((DEVICE_STATS.online / DEVICE_STATS.total) * 100);
  const statusBarData = [
    { label: 'オンライン', value: DEVICE_STATS.online,  color: '#10b981' },
    { label: 'オフライン', value: DEVICE_STATS.offline, color: '#9ca3af' },
    { label: '要注意',     value: DEVICE_STATS.warning, color: '#f59e0b' },
  ];

  const depts = [...new Set(DEMO_DEVICES.map(d => d.dept))].sort();

  const filtered = DEMO_DEVICES.filter(d => {
    if (search && !d.hostname.toLowerCase().includes(search.toLowerCase()) && !d.ip.includes(search) && !d.user.includes(search)) return false;
    if (osF !== 'all' && d.os !== osF) return false;
    if (statusF !== 'all' && d.status !== statusF) return false;
    if (deptF !== 'all' && d.dept !== deptF) return false;
    return true;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">デバイス管理</h1>
          <p className="page-subtitle">管理対象エンドポイントのステータス・詳細情報</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">デバイスを追加</button>
        </div>
      </div>

      {/* Overview */}
      <div className="card">
        <h2 className="card-title">デバイス概要</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">オンライン率</p>
            <DonutChart value={onlineRate} max={100} size={140} strokeWidth={14} color={onlineRate >= 80 ? '#10b981' : '#f59e0b'} />
            <p className="chart-sublabel">全 {DEVICE_STATS.total.toLocaleString()} 台中 {DEVICE_STATS.online.toLocaleString()} 台</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label">ステータス別台数</p>
            <MiniBarChart data={statusBarData} maxValue={DEVICE_STATS.total} height={160} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">合計</p><p className="stat-value">{DEVICE_STATS.total.toLocaleString()}</p></div>
        <div className="card card-center"><p className="stat-label" style={{ color: '#10b981' }}>オンライン</p><p className="stat-value text-green">{DEVICE_STATS.online.toLocaleString()}</p></div>
        <div className="card card-center"><p className="stat-label">オフライン</p><p className="stat-value" style={{ color: '#9ca3af' }}>{DEVICE_STATS.offline.toLocaleString()}</p></div>
        <div className="card card-center"><p className="stat-label" style={{ color: '#f59e0b' }}>要注意</p><p className="stat-value text-amber">{DEVICE_STATS.warning.toLocaleString()}</p></div>
      </div>

      {/* Filters */}
      <div className="card filter-row">
        <SearchInput placeholder="ホスト名・IPアドレス・ユーザー名で検索..." value={search} onChange={setSearch} style={{ flex: 1, minWidth: 200 }} />
        <Select value={osF} onChange={setOsF} options={[{ value: 'all', label: 'すべてのOS' }, { value: 'Windows', label: 'Windows' }, { value: 'macOS', label: 'macOS' }, { value: 'Linux', label: 'Linux' }]} />
        <Select value={statusF} onChange={setStatusF} options={[{ value: 'all', label: 'すべてのステータス' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.l }))]} />
        <Select value={deptF} onChange={setDeptF} options={[{ value: 'all', label: 'すべての部門' }, ...depts.map(d => ({ value: d, label: d }))]} />
      </div>

      {/* Table */}
      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ホスト名', 'OS', 'IPアドレス', '担当ユーザー', '部門', 'ステータス', '最終確認', 'リソース'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(d => {
                const sc = getStatus(d.status);
                return (
                  <tr key={d.id} className="table-row-hover" onClick={() => setSelected(d)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="status-dot" style={{ background: sc.dot }} />
                        <span className="link-text">{d.hostname}</span>
                      </div>
                    </td>
                    <td><div><span className="text-main">{d.os}</span><br /><span className="text-sub">{d.osVer}</span></div></td>
                    <td className="mono">{d.ip}</td>
                    <td>{d.user}</td>
                    <td>{d.dept}</td>
                    <td><Badge variant={sc.v} dot>{sc.l}</Badge></td>
                    <td className="text-sub">{d.lastSeen}</td>
                    <td>
                      {d.status !== 'offline' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Tooltip text={`CPU: ${d.cpu}%`}>
                            <div className="mini-gauge"><div className="mini-gauge-fill" style={{ width: `${d.cpu}%`, background: d.cpu > 80 ? '#ef4444' : d.cpu > 60 ? '#f59e0b' : '#10b981' }} /></div>
                          </Tooltip>
                          <Tooltip text={`MEM: ${d.mem}%`}>
                            <div className="mini-gauge"><div className="mini-gauge-fill" style={{ width: `${d.mem}%`, background: d.mem > 80 ? '#ef4444' : d.mem > 60 ? '#f59e0b' : '#3b82f6' }} /></div>
                          </Tooltip>
                        </div>
                      ) : <span className="text-sub">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {DEVICE_STATS.total.toLocaleString()} 件中 {filtered.length} 件を表示</span>
          <div className="table-pagination">
            <button className="btn-secondary btn-sm" disabled>前へ</button>
            <button className="btn-primary btn-sm">1</button>
            <button className="btn-secondary btn-sm">2</button>
            <button className="btn-secondary btn-sm">次へ</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.hostname ?? 'デバイス詳細'} wide>
        {selected && (
          <div>
            <div className="detail-grid">
              {([['OS', selected.osVer], ['IPアドレス', selected.ip], ['担当ユーザー', selected.user], ['部門', selected.dept], ['ステータス', getStatus(selected.status).l], ['最終確認', selected.lastSeen]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="detail-item"><span className="detail-label">{k}</span><span className="detail-value">{v}</span></div>
              ))}
            </div>
            {selected.status !== 'offline' && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>リソース使用率</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([['CPU', selected.cpu], ['メモリ', selected.mem], ['ディスク', selected.disk]] as [string, number][]).map(([l, v]) => (
                    <div key={l}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="text-sub">{l}</span>
                        <span className="text-main" style={{ fontWeight: 600 }}>{v}%</span>
                      </div>
                      <ProgressBar value={v} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
