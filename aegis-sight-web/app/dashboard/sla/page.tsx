'use client';

import {
  Badge,
} from '@/components/ui/design-components';

const SLA_ITEMS = [
  { name: '重大インシデント初動対応',     target: 15,   actual: 12,   unit: '分',   status: 'ok'  },
  { name: '高優先インシデント対応開始',   target: 60,   actual: 48,   unit: '分',   status: 'ok'  },
  { name: 'パッチ適用率（緊急）',         target: 98,   actual: 96.4, unit: '%',    status: 'warn' },
  { name: 'アラート検知から通知',         target: 5,    actual: 3.2,  unit: '分',   status: 'ok'  },
  { name: 'ヘルプデスク応答時間',         target: 30,   actual: 34,   unit: '分',   status: 'ng'  },
  { name: 'バックアップ完了率',           target: 99.9, actual: 100,  unit: '%',    status: 'ok'  },
  { name: 'システム可用性（月次）',       target: 99.5, actual: 99.1, unit: '%',    status: 'ng'  },
];

type SlaStatus = 'ok' | 'warn' | 'ng';
const SLA_STATUS: Record<SlaStatus, { l: string; v: 'success' | 'warning' | 'danger' }> = {
  ok:   { l: '達成',   v: 'success' },
  warn: { l: '注意',   v: 'warning' },
  ng:   { l: '未達',   v: 'danger'  },
};

const getSlaSt = (s: string) => SLA_STATUS[s as SlaStatus] ?? SLA_STATUS.ng;

const okCount   = SLA_ITEMS.filter(i => i.status === 'ok').length;
const ngCount   = SLA_ITEMS.filter(i => i.status === 'ng').length;

const isOver = (item: typeof SLA_ITEMS[0]) => {
  if (item.unit === '%') return item.actual >= item.target;
  if (item.unit === '分') return item.actual <= item.target;
  return item.actual <= item.target;
};

export default function SLAPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">SLA 管理</h1>
          <p className="page-subtitle">サービスレベル合意の達成状況と違反トラッキング</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">PDFエクスポート</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">SLA 指標数</p><p className="stat-value">{SLA_ITEMS.length}</p></div>
        <div className="card card-center"><p className="stat-label">達成</p><p className="stat-value text-green">{okCount}</p></div>
        <div className="card card-center"><p className="stat-label">未達</p><p className="stat-value text-red">{ngCount}</p></div>
      </div>

      <div className="card table-card">
        <h2 className="card-title">SLA 指標一覧</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['SLA 指標', '目標値', '実績値', '単位', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {SLA_ITEMS.map((item, i) => {
                const st = getSlaSt(item.status);
                const achieved = isOver(item);
                return (
                  <tr key={i} className="table-row-hover">
                    <td><span className="text-main">{item.name}</span></td>
                    <td className="text-sub">{item.target}{item.unit}</td>
                    <td style={{ color: achieved ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {item.actual}{item.unit}
                    </td>
                    <td className="text-sub">{item.unit}</td>
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
