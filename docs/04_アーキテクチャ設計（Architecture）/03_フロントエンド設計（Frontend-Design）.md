# 03. フロントエンド設計（Frontend Design）

## 1. 概要

AEGIS-SIGHTのフロントエンドは、Next.js 14をベースにTypeScript + Tailwind CSSで構築する。PWA（Progressive Web App）として動作し、オフライン環境での現場利用にも対応する。

## 2. 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 14.x | Reactフレームワーク（App Router） |
| TypeScript | 5.x | 型安全な開発 |
| Tailwind CSS | 3.x | ユーティリティファーストCSS |
| PWA (next-pwa) | - | オフライン対応・インストール可能 |
| Zustand | 4.x | 軽量状態管理 |
| TanStack Query | 5.x | サーバーステート管理・キャッシュ |
| React Hook Form | 7.x | フォーム管理 |
| Zod | 3.x | ランタイムバリデーション |
| Recharts | 2.x | グラフ・チャート描画 |
| Lucide React | - | アイコンライブラリ |

## 3. ディレクトリ構成

```
frontend/
├── public/
│   ├── manifest.json          # PWAマニフェスト
│   ├── sw.js                  # Service Worker（自動生成）
│   ├── icons/                 # PWAアイコン
│   └── locales/               # i18nリソース
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # ルートレイアウト
│   │   ├── page.tsx           # ダッシュボード（トップページ）
│   │   ├── login/
│   │   │   └── page.tsx       # ログインページ
│   │   ├── assets/
│   │   │   ├── page.tsx       # 資産一覧
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx   # 資産詳細
│   │   │   └── new/
│   │   │       └── page.tsx   # 資産登録
│   │   ├── sam/
│   │   │   ├── page.tsx       # ライセンス一覧
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx   # ライセンス詳細
│   │   │   └── compliance/
│   │   │       └── page.tsx   # SAMコンプライアンス
│   │   ├── procurement/
│   │   │   ├── page.tsx       # 調達申請一覧
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx   # 調達申請詳細
│   │   │   └── new/
│   │   │       └── page.tsx   # 調達申請作成
│   │   ├── security/
│   │   │   ├── page.tsx       # セキュリティダッシュボード
│   │   │   └── alerts/
│   │   │       └── page.tsx   # アラート一覧
│   │   ├── logs/
│   │   │   └── page.tsx       # 操作ログ
│   │   └── settings/
│   │       └── page.tsx       # 設定
│   ├── components/
│   │   ├── ui/                # 汎用UIコンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/            # レイアウトコンポーネント
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Breadcrumb.tsx
│   │   │   └── Footer.tsx
│   │   ├── assets/            # 資産管理コンポーネント
│   │   │   ├── AssetTable.tsx
│   │   │   ├── AssetForm.tsx
│   │   │   ├── AssetDetail.tsx
│   │   │   └── AssetFilter.tsx
│   │   ├── sam/               # SAMコンポーネント
│   │   │   ├── LicenseTable.tsx
│   │   │   ├── LicenseForm.tsx
│   │   │   ├── ComplianceChart.tsx
│   │   │   └── UsageGraph.tsx
│   │   ├── procurement/       # 調達コンポーネント
│   │   │   ├── RequestTable.tsx
│   │   │   ├── RequestForm.tsx
│   │   │   ├── ApprovalFlow.tsx
│   │   │   └── BudgetSummary.tsx
│   │   ├── dashboard/         # ダッシュボードコンポーネント
│   │   │   ├── StatsCard.tsx
│   │   │   ├── AssetChart.tsx
│   │   │   ├── AlertList.tsx
│   │   │   └── RecentActivity.tsx
│   │   └── charts/            # チャートコンポーネント
│   │       ├── PieChart.tsx
│   │       ├── BarChart.tsx
│   │       └── LineChart.tsx
│   ├── hooks/                 # カスタムフック
│   │   ├── useAuth.ts         # 認証フック
│   │   ├── useAssets.ts       # 資産データフック
│   │   ├── useLicenses.ts     # ライセンスデータフック
│   │   ├── useProcurement.ts  # 調達データフック
│   │   ├── useOffline.ts      # オフライン状態管理
│   │   └── useDebounce.ts     # デバウンスフック
│   ├── lib/
│   │   ├── api.ts             # APIクライアント（fetch wrapper）
│   │   ├── auth.ts            # 認証ユーティリティ
│   │   └── utils.ts           # 汎用ユーティリティ
│   ├── stores/                # Zustandストア
│   │   ├── authStore.ts       # 認証ストア
│   │   ├── uiStore.ts         # UI状態ストア
│   │   └── offlineStore.ts    # オフラインキューストア
│   ├── types/                 # TypeScript型定義
│   │   ├── asset.ts
│   │   ├── license.ts
│   │   ├── procurement.ts
│   │   ├── user.ts
│   │   └── api.ts
│   └── styles/
│       └── globals.css        # グローバルスタイル
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 4. ページ構成

### 4.1 ページ一覧

| パス | ページ名 | 説明 | 必要権限 |
|------|---------|------|---------|
| `/` | ダッシュボード | 資産概況・アラート・KPI表示 | readonly+ |
| `/login` | ログイン | OIDC認証 / ローカル認証 | 公開 |
| `/assets` | 資産一覧 | 全資産のテーブル表示・検索・フィルタ | readonly+ |
| `/assets/[id]` | 資産詳細 | 個別資産の詳細情報・履歴 | readonly+ |
| `/assets/new` | 資産登録 | 新規資産登録フォーム | operator+ |
| `/sam` | ライセンス一覧 | ソフトウェアライセンス一覧 | readonly+ |
| `/sam/[id]` | ライセンス詳細 | ライセンス詳細・割当状況 | readonly+ |
| `/sam/compliance` | SAMコンプライアンス | ライセンス遵守状況レポート | auditor+ |
| `/procurement` | 調達申請一覧 | 調達申請のリスト表示 | readonly+ |
| `/procurement/[id]` | 調達申請詳細 | 申請詳細・承認フロー | readonly+ |
| `/procurement/new` | 調達申請作成 | 新規調達申請フォーム | operator+ |
| `/security` | セキュリティダッシュボード | 脆弱性・コンプライアンス概況 | operator+ |
| `/security/alerts` | アラート一覧 | セキュリティアラート管理 | operator+ |
| `/logs` | 操作ログ | 監査ログ閲覧 | auditor+ |
| `/settings` | 設定 | ユーザー・システム設定 | admin |

### 4.2 レイアウト構成

```
┌─────────────────────────────────────────────────────┐
│  Header (ロゴ, 検索バー, 通知, ユーザーメニュー)       │
├────────────┬────────────────────────────────────────┤
│            │  Breadcrumb                            │
│  Sidebar   ├────────────────────────────────────────┤
│            │                                        │
│  - Dashboard│  Main Content Area                    │
│  - 資産管理 │                                        │
│  - SAM     │                                        │
│  - 調達管理 │                                        │
│  - Security│                                        │
│  - ログ    │                                        │
│  - 設定    │                                        │
│            │                                        │
├────────────┴────────────────────────────────────────┤
│  Footer                                             │
└─────────────────────────────────────────────────────┘
```

## 5. PWA設計

### 5.1 Service Worker戦略

| リソース種別 | キャッシュ戦略 | 説明 |
|-------------|-------------|------|
| 静的アセット（JS/CSS/画像） | Cache First | ビルド時にプリキャッシュ |
| API レスポンス（GET） | Network First | オフライン時はキャッシュから返却 |
| API リクエスト（POST/PUT） | Background Sync | オンライン復帰時に送信 |
| HTMLページ | Stale While Revalidate | キャッシュ優先+バックグラウンド更新 |

### 5.2 オフラインバッファ

```typescript
// オフラインキューの型定義
interface OfflineQueueItem {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// IndexedDBに保存し、オンライン復帰時にFIFOで送信
// 競合検出はサーバー側のupdated_atタイムスタンプで行う
```

### 5.3 PWAマニフェスト

```json
{
  "name": "AEGIS-SIGHT - IT資産管理システム",
  "short_name": "AEGIS-SIGHT",
  "description": "統合IT資産・SAM・調達管理プラットフォーム",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e293b",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## 6. 状態管理

### 6.1 状態管理の方針

| 状態の種類 | 管理方法 | 例 |
|-----------|---------|-----|
| サーバーステート | TanStack Query | 資産一覧、ライセンス情報 |
| UIステート | Zustand | サイドバー開閉、テーマ |
| フォームステート | React Hook Form | 入力フォームの値 |
| 認証ステート | Zustand + Cookie | JWTトークン、ユーザー情報 |
| オフラインステート | Zustand + IndexedDB | オフラインキュー |

### 6.2 APIクライアント

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers,
      },
      ...options,
    });

    if (response.status === 401) {
      // トークンリフレッシュ処理
      await refreshToken();
      return this.request<T>(method, path, options);
    }

    return response.json();
  }

  get<T>(path: string) { return this.request<T>('GET', path); }
  post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, { body: JSON.stringify(body) });
  }
  put<T>(path: string, body: unknown) {
    return this.request<T>('PUT', path, { body: JSON.stringify(body) });
  }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }
}

export const api = new ApiClient();
```

## 7. レスポンシブ対応

| ブレークポイント | 対象デバイス | レイアウト |
|---------------|------------|----------|
| `< 640px` (sm) | スマートフォン | サイドバー非表示、ハンバーガーメニュー |
| `640px - 1024px` (md) | タブレット | サイドバー折りたたみ（アイコンのみ） |
| `> 1024px` (lg) | デスクトップ | サイドバー展開 |

## 8. アクセシビリティ

- WCAG 2.1 Level AA 準拠を目標
- セマンティックHTMLの使用
- キーボードナビゲーション対応
- ARIAラベルの適切な設定
- カラーコントラスト比 4.5:1 以上の確保
- フォーカスインジケーターの視認性確保

## 9. パフォーマンス目標

| 指標 | 目標値 |
|------|-------|
| Largest Contentful Paint (LCP) | < 2.5秒 |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Time to Interactive (TTI) | < 3.5秒 |
| バンドルサイズ（gzip） | < 200KB（初期ロード） |
