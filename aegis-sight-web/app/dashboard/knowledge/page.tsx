'use client';

import { useState } from 'react';
import {
  Badge, SearchInput,
} from '@/components/ui/design-components';

const ARTICLES = [
  { id: 'kb-001', title: 'ランサムウェア感染時の初動対応手順',              category: 'インシデント対応', author: 'セキュリティチーム', views: 342, updated: '2025-01-10', status: 'published' },
  { id: 'kb-002', title: 'BitLocker 強制暗号化の展開ガイド',               category: 'エンドポイント',   author: 'ito.masaru',       views: 178, updated: '2024-12-20', status: 'published' },
  { id: 'kb-003', title: 'Windows Update グループポリシー設定手順',         category: 'パッチ管理',       author: 'tanaka.hiroshi',   views: 256, updated: '2024-12-15', status: 'published' },
  { id: 'kb-004', title: 'ISO 27001 A.9 アクセス制御 実装チェックリスト', category: 'コンプライアンス', author: 'セキュリティチーム', views:  98, updated: '2025-01-05', status: 'published' },
  { id: 'kb-005', title: 'USB デバイス制御ポリシーの展開と例外申請フロー', category: 'DLP',             author: 'yamamoto.kenji',    views: 204, updated: '2024-11-30', status: 'published' },
  { id: 'kb-006', title: 'Sophos Intercept X アラート対応ガイド',          category: 'エンドポイント',   author: 'sato.yuki',        views: 145, updated: '2025-01-08', status: 'published' },
  { id: 'kb-007', title: 'リモートアクセス VPN 利用ガイドライン（2025年版）', category: 'ネットワーク',   author: 'インフラチーム',    views:  89, updated: '2025-01-12', status: 'draft'     },
];

type ArtStatus = 'published' | 'draft' | 'archived';
const STATUS_CFG: Record<ArtStatus, { l: string; v: 'success' | 'warning' | 'default' }> = {
  published: { l: '公開中',  v: 'success' },
  draft:     { l: '下書き',  v: 'warning' },
  archived:  { l: 'アーカイブ', v: 'default' },
};
const getStatus = (s: string) => STATUS_CFG[s as ArtStatus] ?? STATUS_CFG.draft;

const CATEGORY_COLORS: Record<string, string> = {
  'インシデント対応': '#ef4444',
  'エンドポイント':   '#3b82f6',
  'パッチ管理':       '#f59e0b',
  'コンプライアンス': '#8b5cf6',
  'DLP':             '#10b981',
  'ネットワーク':     '#6366f1',
};

const totalViews = ARTICLES.reduce((s, a) => s + a.views, 0);

export default function KnowledgePage() {
  const [search, setSearch] = useState('');

  const filtered = ARTICLES.filter(a =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    a.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">ナレッジベース</h1>
          <p className="page-subtitle">セキュリティ手順書・ガイドライン・ベストプラクティス</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary">記事を作成</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">記事数</p><p className="stat-value">{ARTICLES.length}</p></div>
        <div className="card card-center"><p className="stat-label">総閲覧数</p><p className="stat-value text-green">{totalViews.toLocaleString()}</p></div>
        <div className="card card-center"><p className="stat-label">下書き</p><p className="stat-value text-amber">{ARTICLES.filter(a => a.status === 'draft').length}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="タイトル・カテゴリ・著者で検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['タイトル', 'カテゴリ', '著者', '閲覧数', '更新日', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(a => {
                const st = getStatus(a.status);
                const catColor = CATEGORY_COLORS[a.category] ?? '#6b7280';
                return (
                  <tr key={a.id} className="table-row-hover">
                    <td><span className="link-text">{a.title}</span></td>
                    <td>
                      <span style={{ fontSize: 12, color: catColor, fontWeight: 600 }}>{a.category}</span>
                    </td>
                    <td className="text-sub">{a.author}</td>
                    <td className="text-sub">{a.views.toLocaleString()}</td>
                    <td className="text-sub">{a.updated}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="table-empty">条件に一致する記事が見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {ARTICLES.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
