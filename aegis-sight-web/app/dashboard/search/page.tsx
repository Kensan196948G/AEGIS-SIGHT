'use client';

import { useState } from 'react';
import { Badge, SearchInput } from '@/components/ui/design-components';

type ResultCategory = 'デバイス' | 'ユーザー' | 'アラート' | 'ライセンス' | 'インシデント';

interface SearchResult {
  id:       string;
  category: ResultCategory;
  title:    string;
  detail:   string;
  time?:    string;
  status?:  string;
  href:     string;
}

const SAMPLE_RESULTS: SearchResult[] = [
  { id: 'r-001', category: 'デバイス',     title: 'DESK-PC-0042',       detail: 'Windows 11 Pro / 田中 浩 / エンジニアリング部',                      status: '正常',    href: '/dashboard/devices' },
  { id: 'r-002', category: 'デバイス',     title: 'LAPTOP-0018',        detail: 'macOS 14 / 山本 健司 / エンジニアリング部',                           status: '正常',    href: '/dashboard/devices' },
  { id: 'r-003', category: 'ユーザー',     title: '田中 浩',            detail: 'tanaka.hiroshi / 管理者 / セキュリティ部',                            status: '有効',    href: '/dashboard/users' },
  { id: 'r-004', category: 'ユーザー',     title: '山本 健司',          detail: 'yamamoto.kenji / オペレーター / エンジニアリング部',                  status: '有効',    href: '/dashboard/users' },
  { id: 'r-005', category: 'アラート',     title: 'ランサムウェア試行', detail: '2025-01-15 14:32 / aegis-siem-01 / 重大',                             time: '14:32',    href: '/dashboard/alerts' },
  { id: 'r-006', category: 'ライセンス',   title: 'Microsoft 365 E3',   detail: 'Adobe Systems / 総数 500 / 使用中 423',                               status: '有効',    href: '/dashboard/sam' },
  { id: 'r-007', category: 'インシデント', title: 'INC-2025-0042',      detail: 'ランサムウェア感染疑い / P1 / 田中 浩 / 対応中',                      time: '2025-01-15', href: '/dashboard/incidents' },
];

const CATEGORY_COLORS: Record<ResultCategory, { v: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  'デバイス':     { v: 'info'    },
  'ユーザー':     { v: 'success' },
  'アラート':     { v: 'danger'  },
  'ライセンス':   { v: 'warning' },
  'インシデント': { v: 'danger'  },
};

const RECENT_SEARCHES = ['ThinkPad X1', 'ランサムウェア', 'MFA 未設定', 'Sophos', '田中'];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const results = query.length >= 2
    ? SAMPLE_RESULTS.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.detail.toLowerCase().includes(query.toLowerCase()) ||
        r.category.includes(query)
      )
    : [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">グローバル検索</h1>
          <p className="page-subtitle">デバイス・ユーザー・アラート・ライセンス・インシデントを横断検索</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px 20px' }}>
        <SearchInput
          placeholder="キーワードを入力してください（例：デバイス名、ユーザー名、アラート種別...）"
          value={query}
          onChange={v => setQuery(v)}
          style={{ width: '100%', fontSize: 15 }}
        />
        {!query && (
          <div style={{ marginTop: 16 }}>
            <p className="text-sub" style={{ fontSize: 12, marginBottom: 8 }}>最近の検索</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RECENT_SEARCHES.map(s => (
                <button
                  key={s}
                  className="btn-secondary"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={() => setQuery(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {query.length >= 2 && (
        <div className="card">
          <h2 className="card-title">
            検索結果
            <span className="text-sub" style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
              「{query}」— {results.length} 件
            </span>
          </h2>
          {results.length > 0 ? (
            <div className="activity-list">
              {results.map(r => {
                const cat = CATEGORY_COLORS[r.category] ?? { v: 'default' as const };
                return (
                  <div key={r.id} className="activity-item" style={{ cursor: 'pointer' }}>
                    <div className="activity-content">
                      <p className="activity-text">
                        <span style={{ marginRight: 8, display: 'inline-block' }}><Badge variant={cat.v}>{r.category}</Badge></span>
                        <strong className="link-text">{r.title}</strong>
                        {r.time && <span className="activity-time" style={{ marginLeft: 8 }}>{r.time}</span>}
                      </p>
                      <p className="text-sub" style={{ fontSize: 12, marginTop: 4 }}>{r.detail}</p>
                    </div>
                    {r.status && (
                      <Badge variant="default">{r.status}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="table-empty">「{query}」に一致する結果が見つかりません</p>
          )}
        </div>
      )}

      {!query && (
        <div className="grid-3">
          {[
            { cat: 'デバイス管理',   count: 1284, icon: '🖥️', href: '/dashboard/devices'  },
            { cat: 'ユーザー',       count:  212, icon: '👤', href: '/dashboard/users'    },
            { cat: 'アラート',       count:   72, icon: '🚨', href: '/dashboard/alerts'   },
            { cat: 'ライセンス',     count:   89, icon: '📋', href: '/dashboard/sam'      },
            { cat: 'インシデント',   count:    5, icon: '🔥', href: '/dashboard/incidents'},
            { cat: 'コンプライアンス', count: 18, icon: '✅', href: '/dashboard/compliance'},
          ].map(c => (
            <div key={c.cat} className="card card-center" style={{ cursor: 'pointer' }}>
              <p style={{ fontSize: 28, margin: 0 }}>{c.icon}</p>
              <p className="stat-label" style={{ marginTop: 8 }}>{c.cat}</p>
              <p className="stat-value" style={{ fontSize: 20 }}>{c.count.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
