'use client';

import { Badge } from '@/components/ui/design-components';

const EXPIRING_LICENSES = [
  { id: 'lic-005', name: 'Slack Business+',        vendor: 'Slack',   type: 'ユーザー', expiry: '2025-08-31', days: 24,  purchased: 200, cost: 250000 },
  { id: 'lic-004', name: 'Adobe Acrobat Reader DC', vendor: 'Adobe',   type: 'ユーザー', expiry: '2025-09-30', days: 54,  purchased: 100, cost: 150000 },
  { id: 'lic-006', name: 'Zoom Business',           vendor: 'Zoom',    type: 'ユーザー', expiry: '2025-11-30', days: 115, purchased: 150, cost: 300000 },
].sort((a, b) => a.days - b.days);

function urgencyClass(days: number): string {
  if (days <= 30) return 'text-red';
  if (days <= 60) return 'text-amber';
  return 'text-sub';
}

const expiring30 = EXPIRING_LICENSES.filter(l => l.days <= 30).length;
const expiring60 = EXPIRING_LICENSES.filter(l => l.days <= 60).length;

export default function SAMReportsPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">期限切れ予定ライセンス</h1>
          <p className="page-subtitle">今後 90 日以内に期限切れとなるライセンス一覧</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center">
          <p className="stat-label">期限切れ予定（90日）</p>
          <p className="stat-value">{EXPIRING_LICENSES.length}</p>
        </div>
        <div className="card card-center">
          <p className="stat-label">30 日以内</p>
          <p className="stat-value text-red">{expiring30}</p>
        </div>
        <div className="card card-center">
          <p className="stat-label">60 日以内</p>
          <p className="stat-value text-amber">{expiring60}</p>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ソフトウェア', 'ベンダー', '種別', '期限日', '残日数', '購入数', 'コスト合計'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {EXPIRING_LICENSES.length > 0 ? EXPIRING_LICENSES.map(item => (
                <tr key={item.id} className="table-row-hover">
                  <td><span className="text-main" style={{ fontWeight: 500 }}>{item.name}</span></td>
                  <td className="text-sub">{item.vendor}</td>
                  <td><Badge variant="info">{item.type}</Badge></td>
                  <td className="text-sub">{item.expiry}</td>
                  <td className={urgencyClass(item.days)} style={{ fontWeight: 600 }}>{item.days} 日</td>
                  <td className="text-sub">{item.purchased}</td>
                  <td className="mono text-sub">{item.cost.toLocaleString()} 円</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="table-empty">データなし</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {EXPIRING_LICENSES.length} 件表示</span>
        </div>
      </div>
    </div>
  );
}
