'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  fetchKBArticles,
  fetchKBCategories,
  fetchKBPopular,
  BackendKBArticle,
  BackendKBCategory,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Style maps (open-string keys for backend compatibility)
// ---------------------------------------------------------------------------

type BadgeVariant = 'info' | 'warning' | 'danger' | 'success' | 'purple' | 'default';

const CATEGORY_LABEL: Record<string, string> = {
  how_to: 'ハウツー',
  troubleshooting: 'トラブルシューティング',
  policy: 'ポリシー',
  faq: 'FAQ',
  best_practice: 'ベストプラクティス',
};

const CATEGORY_VARIANT: Record<string, BadgeVariant> = {
  how_to: 'info',
  troubleshooting: 'warning',
  policy: 'danger',
  faq: 'success',
  best_practice: 'purple',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  published: '公開中',
  archived: 'アーカイブ',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
};

function getCategoryLabel(cat: string) { return CATEGORY_LABEL[cat] ?? cat; }
function getCategoryVariant(cat: string): BadgeVariant { return CATEGORY_VARIANT[cat] ?? 'default'; }
function getStatusLabel(s: string) { return STATUS_LABEL[s] ?? s; }
function getStatusVariant(s: string): BadgeVariant { return STATUS_VARIANT[s] ?? 'default'; }

// Known enum values for filter dropdowns
const KNOWN_CATEGORIES = Object.keys(CATEGORY_LABEL);
const KNOWN_STATUSES = Object.keys(STATUS_LABEL);

// ---------------------------------------------------------------------------
// Dummy data fallbacks (shown when API returns empty results)
// ---------------------------------------------------------------------------

const DUMMY_CATEGORIES: BackendKBCategory[] = [
  {
    id: 'cat-how-to',
    name: 'ハウツー',
    description: '操作手順や設定方法を解説したガイド記事',
    icon: '📖',
    sort_order: 1,
    parent_id: null,
    article_count: 3,
  },
  {
    id: 'cat-troubleshooting',
    name: 'トラブルシューティング',
    description: 'エラーや障害発生時の調査・解決手順',
    icon: '🔧',
    sort_order: 2,
    parent_id: null,
    article_count: 3,
  },
  {
    id: 'cat-policy',
    name: 'ポリシー',
    description: '社内規程・セキュリティポリシー・コンプライアンス要件',
    icon: '📋',
    sort_order: 3,
    parent_id: null,
    article_count: 2,
  },
  {
    id: 'cat-faq',
    name: 'FAQ',
    description: 'よくある質問と回答集',
    icon: '❓',
    sort_order: 4,
    parent_id: null,
    article_count: 2,
  },
  {
    id: 'cat-best-practice',
    name: 'ベストプラクティス',
    description: '推奨設定・開発標準・セキュリティ強化のベストプラクティス',
    icon: '⭐',
    sort_order: 5,
    parent_id: null,
    article_count: 2,
  },
];

const DUMMY_ARTICLES: BackendKBArticle[] = [
  {
    id: 'art-001',
    title: 'VPN 接続の設定手順（Windows / macOS 共通）',
    category: 'how_to',
    content: `# VPN 接続の設定手順\n\n## 概要\n社内ネットワークへのリモートアクセスには、認定 VPN クライアントを使用してください。\n\n## 手順\n1. 管理者から配布された VPN インストーラーを実行する\n2. サーバーアドレスに \`vpn.example.co.jp\` を入力する\n3. 社員番号とパスワードでログインする\n4. 接続後、社内ポータルへアクセスできることを確認する\n\n接続に失敗する場合はヘルプデスク（内線 4100）へご連絡ください。`,
    tags: ['VPN', 'リモートワーク', 'ネットワーク'],
    status: 'published',
    author_id: 'user-001',
    view_count: 2843,
    helpful_count: 198,
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2026-03-15T14:30:00Z',
  },
  {
    id: 'art-002',
    title: 'Microsoft 365 多要素認証（MFA）の初期設定方法',
    category: 'how_to',
    content: `# Microsoft 365 MFA 初期設定\n\n## 必要なもの\n- スマートフォン（iOS / Android）\n- Microsoft Authenticator アプリ\n\n## 設定手順\n1. App Store または Google Play から Microsoft Authenticator をインストールする\n2. \`aka.ms/mfasetup\` にアクセスしてサインインする\n3. 「認証アプリ」を選択し、QR コードをスキャンする\n4. 6 桁の確認コードを入力して設定を完了する\n\n設定後は 30 日ごとに再認証が求められます。`,
    tags: ['MFA', 'Microsoft 365', 'セキュリティ', '認証'],
    status: 'published',
    author_id: 'user-002',
    view_count: 1956,
    helpful_count: 147,
    created_at: '2025-10-15T10:00:00Z',
    updated_at: '2026-02-20T11:00:00Z',
  },
  {
    id: 'art-003',
    title: '新入社員向け：社内システムアカウント申請手順',
    category: 'how_to',
    content: `# 社内システムアカウント申請\n\n## 申請が必要なシステム\n- 社内ポータル / イントラネット\n- 人事システム（HRIS）\n- 経費精算システム\n- コード管理（GitHub Enterprise）\n\n## 申請方法\n1. 社内ポータル > 申請 > システムアクセス申請 を開く\n2. 必要なシステムにチェックを入れて申請する\n3. 上長承認後、1〜2 営業日でアカウントが発行される\n\n権限に関する問い合わせは情報システム部（it-support@example.co.jp）まで。`,
    tags: ['アカウント', '新入社員', 'オンボーディング'],
    status: 'draft',
    author_id: 'user-003',
    view_count: 512,
    helpful_count: 34,
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 'art-004',
    title: 'メールが送受信できない場合のトラブルシューティング',
    category: 'troubleshooting',
    content: `# メール送受信トラブルシューティング\n\n## 確認手順\n1. インターネット接続が正常か確認する\n2. Outlook / メールクライアントを再起動する\n3. パスワードが変更されていないか確認する（最近 MFA を変更した場合は再認証が必要）\n4. \`https://outlook.office.com\` でウェブ版にアクセスできるか試す\n\n## よくある原因\n- パスワード期限切れ（90 日ごとに更新が必要）\n- MFA 再設定後のキャッシュ残存\n- 受信ボックス容量超過（50 GB 上限）\n\nウェブ版でも接続できない場合はヘルプデスクへご連絡ください。`,
    tags: ['メール', 'Outlook', 'トラブル'],
    status: 'published',
    author_id: 'user-001',
    view_count: 3012,
    helpful_count: 221,
    created_at: '2025-09-20T10:00:00Z',
    updated_at: '2026-01-10T16:00:00Z',
  },
  {
    id: 'art-005',
    title: '社内 Wi-Fi に接続できない場合の対処方法',
    category: 'troubleshooting',
    content: `# 社内 Wi-Fi 接続トラブル\n\n## 基本確認\n1. SSID が \`CORP-WIFI\` または \`CORP-WIFI-5G\` になっているか確認する\n2. Wi-Fi を一度オフにして、再度オンにする\n3. デバイスを再起動する\n\n## 証明書エラーが出る場合\n- 社内ルート証明書がインストールされていない可能性があります\n- 情報システム部から配布された証明書インストーラーを実行してください\n\n## ゲスト Wi-Fi（GUEST-WIFI）について\n- インターネット接続のみ可能です\n- 社内システムへのアクセスはできません\n- VPN を使用することで社内ネットワークに接続できます`,
    tags: ['Wi-Fi', 'ネットワーク', 'トラブル', '証明書'],
    status: 'published',
    author_id: 'user-004',
    view_count: 1487,
    helpful_count: 89,
    created_at: '2025-10-05T11:00:00Z',
    updated_at: '2026-02-14T09:30:00Z',
  },
  {
    id: 'art-006',
    title: 'PC の動作が遅い場合の初期対応手順',
    category: 'troubleshooting',
    content: `# PC 動作遅延のトラブルシューティング\n\n## まず試すこと\n1. 不要なアプリケーションを閉じる\n2. PC を再起動する（シャットダウン後、30 秒待ってから起動）\n3. Windows Update / macOS ソフトウェアアップデートを確認・適用する\n\n## ディスク容量確認\n- C ドライブの空き容量が 10% 未満になると動作が遅くなります\n- 一時ファイルのクリーンアップ: \`ディスク クリーンアップ\` ツールを実行\n\n上記で解決しない場合はヘルプデスクへ PC を持参してください（要予約）。`,
    tags: ['PC', 'パフォーマンス', 'トラブル'],
    status: 'draft',
    author_id: 'user-002',
    view_count: 876,
    helpful_count: 56,
    created_at: '2025-12-01T13:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'art-007',
    title: '情報セキュリティポリシー（2026年度版）',
    category: 'policy',
    content: `# 情報セキュリティポリシー 2026年度版\n\n## 基本方針\n当社は、情報資産を適切に保護し、情報セキュリティの維持・向上に努めます。\n\n## 遵守事項\n- 業務情報の個人デバイスへの保存を禁止する\n- パスワードは 12 文字以上、大小英数字と記号を含めること\n- 不審なメールのリンク・添付ファイルは開かないこと\n- 業務上知り得た情報を社外に漏洩しないこと\n\n## 違反時の対応\n重大な違反は就業規則に基づき懲戒処分の対象となります。\n不明な点はコンプライアンス部（compliance@example.co.jp）にお問い合わせください。`,
    tags: ['セキュリティポリシー', 'コンプライアンス', '2026年度'],
    status: 'published',
    author_id: 'user-005',
    view_count: 2100,
    helpful_count: 143,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'art-008',
    title: 'テレワーク勤務規程（在宅勤務ガイドライン）',
    category: 'policy',
    content: `# テレワーク勤務規程\n\n## 対象者\n- 正社員・契約社員（要上長承認）\n\n## 申請方法\n1. 社内ポータルの「テレワーク申請」から事前申請する（前日 17:00 まで）\n2. 上長承認後に在宅勤務可\n\n## 勤務時の注意事項\n- 必ず VPN 経由で社内システムにアクセスする\n- 公共 Wi-Fi での業務は禁止\n- 勤怠打刻は通常通り行う\n- 緊急連絡先として携帯番号を上長に登録しておくこと\n\n月の在宅勤務上限は 12 日です。`,
    tags: ['テレワーク', '在宅勤務', 'ポリシー'],
    status: 'published',
    author_id: 'user-005',
    view_count: 1650,
    helpful_count: 112,
    created_at: '2025-08-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'art-009',
    title: 'FAQ: パスワードを忘れた場合はどうすればよいですか？',
    category: 'faq',
    content: `# パスワードリセットについて\n\n## セルフサービスリセット（推奨）\n1. \`https://passwordreset.microsoftonline.com\` にアクセスする\n2. 社員番号（メールアドレス）を入力する\n3. 登録済みの携帯電話または Authenticator アプリで本人確認する\n4. 新しいパスワードを設定する\n\n## セルフサービスが使えない場合\n- ヘルプデスク（内線 4100 または helpdesk@example.co.jp）に連絡する\n- 本人確認のため社員証が必要です\n\nパスワードは 90 日ごとに変更が必要です。変更期限が近づくと通知が届きます。`,
    tags: ['パスワード', 'FAQ', 'アカウント'],
    status: 'published',
    author_id: 'user-003',
    view_count: 2567,
    helpful_count: 187,
    created_at: '2025-07-15T09:00:00Z',
    updated_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'art-010',
    title: 'FAQ: 経費精算の締め日と申請方法を教えてください',
    category: 'faq',
    content: `# 経費精算 FAQ\n\n## 締め日\n- 毎月 25 日（25 日が土日祝の場合は前営業日）\n\n## 申請手順\n1. 経費精算システム（SAP Concur）にログインする\n2. 「新規レポート作成」をクリックする\n3. 領収書を撮影・アップロードして金額・用途を入力する\n4. 上長へ承認申請を送信する\n\n## 注意事項\n- 交通費は IC カード利用明細を添付する（現金払いは領収書必須）\n- 飲食費は参加者の氏名・人数・目的を必ず記載する\n- 上限額を超える場合は事前に稟議申請が必要\n\n問い合わせ先: 経理部（keiri@example.co.jp）`,
    tags: ['経費精算', 'FAQ', 'Concur'],
    status: 'published',
    author_id: 'user-006',
    view_count: 1320,
    helpful_count: 98,
    created_at: '2025-09-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'art-011',
    title: 'セキュアなパスワード管理のベストプラクティス',
    category: 'best_practice',
    content: `# パスワード管理ベストプラクティス\n\n## 推奨事項\n- パスワードマネージャー（1Password / Bitwarden）を利用する\n- サービスごとに異なるパスワードを設定する\n- 12 文字以上、大文字・小文字・数字・記号を組み合わせる\n- フィッシング耐性の高い FIDO2 / パスキーを積極活用する\n\n## 避けるべき事項\n- 同じパスワードを複数サービスで使い回さない\n- 誕生日や社員番号など推測されやすい文字列を使わない\n- パスワードをメモに書いてモニターに貼らない\n\n社内承認パスワードマネージャーは IT 申請フォームから申請できます。`,
    tags: ['パスワード', 'セキュリティ', 'ベストプラクティス', 'FIDO2'],
    status: 'published',
    author_id: 'user-004',
    view_count: 1789,
    helpful_count: 134,
    created_at: '2025-11-20T10:00:00Z',
    updated_at: '2026-03-10T11:00:00Z',
  },
  {
    id: 'art-012',
    title: 'クラウドストレージ利用ガイド（OneDrive / SharePoint）',
    category: 'best_practice',
    content: `# クラウドストレージ利用ガイド\n\n## 用途別推奨ストレージ\n- **個人ファイル**: OneDrive（1 TB／人）\n- **チーム共有ファイル**: SharePoint チームサイト\n- **外部共有**: SharePoint の「外部共有リンク」機能を使用\n\n## ベストプラクティス\n1. 機密情報はアクセス権限を最小化して保存する\n2. 外部共有リンクには有効期限（最大 30 日）を設定する\n3. 重要なフォルダはバックアップ設定を有効にする\n4. 不要になった外部共有は速やかに削除する\n\n## 禁止事項\n- 個人の Google Drive / Dropbox など未承認クラウドへの業務データ保存\n- 無期限の外部共有リンクの発行\n\n詳細は情報セキュリティポリシーを参照してください。`,
    tags: ['OneDrive', 'SharePoint', 'クラウド', 'ストレージ'],
    status: 'draft',
    author_id: 'user-002',
    view_count: 654,
    helpful_count: 41,
    created_at: '2026-02-10T14:00:00Z',
    updated_at: '2026-04-25T09:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function SkeletonArticleCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-aegis-border dark:bg-aegis-darker animate-pulse">
      <div className="mb-2 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-aegis-border" />
        <div className="h-5 w-12 rounded-full bg-gray-200 dark:bg-aegis-border" />
      </div>
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-aegis-border" />
      <div className="mt-2 h-3 w-full rounded bg-gray-200 dark:bg-aegis-border" />
      <div className="mt-1 h-3 w-2/3 rounded bg-gray-200 dark:bg-aegis-border" />
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 dark:bg-aegis-border" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'popular' | 'create'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<BackendKBArticle | null>(null);

  // API state
  const [articles, setArticles] = useState<BackendKBArticle[]>([]);
  const [categories, setCategories] = useState<BackendKBCategory[]>([]);
  const [popularArticles, setPopularArticles] = useState<BackendKBArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state (local only — no backend create/edit in scope)
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategory, setEditorCategory] = useState('how_to');
  const [editorTags, setEditorTags] = useState('');
  const [editorStatus, setEditorStatus] = useState('draft');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [articlesData, catsData, popularData] = await Promise.all([
        fetchKBArticles(0, 100),
        fetchKBCategories(),
        fetchKBPopular(10),
      ]);
      setArticles(articlesData.items.length > 0 ? articlesData.items : DUMMY_ARTICLES);
      setCategories(catsData.length > 0 ? catsData : DUMMY_CATEGORIES);
      setPopularArticles(popularData.length > 0 ? popularData : DUMMY_ARTICLES.slice(0, 5).sort((a, b) => b.view_count - a.view_count));
    } catch (err) {
      console.error('Knowledge base data fetch error:', err);
      setArticles(DUMMY_ARTICLES);
      setCategories(DUMMY_CATEGORIES);
      setPopularArticles([...DUMMY_ARTICLES].sort((a, b) => b.view_count - a.view_count).slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------------------------
  // Filtering (client-side after fetch)
  // ---------------------------------------------------------------------------
  const filteredArticles = articles.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleViewArticle = (article: BackendKBArticle) => {
    setSelectedArticle(article);
  };

  const handleHelpful = (articleId: string) => {
    // In production: POST /api/v1/knowledge/articles/{id}/helpful
    alert(`記事 ${articleId} を「役に立った」としてマークしました`);
  };

  const handleEditArticle = (article: BackendKBArticle) => {
    setEditorTitle(article.title);
    setEditorContent(article.content);
    setEditorCategory(article.category);
    setEditorTags(article.tags?.join(', ') ?? '');
    setEditorStatus(article.status);
    setActiveTab('create');
  };

  const handleNewArticle = () => {
    setEditorTitle('');
    setEditorContent('');
    setEditorCategory('how_to');
    setEditorTags('');
    setEditorStatus('draft');
    setActiveTab('create');
  };

  const handleSaveArticle = () => {
    // In production: POST or PATCH /api/v1/knowledge/articles
    alert('記事を保存しました（デモ）');
    setActiveTab('browse');
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderSimpleMarkdown = (md: string) => {
    return md.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h2 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">{line.slice(2)}</h2>;
      if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-semibold mt-3 mb-1 text-gray-800 dark:text-gray-200">{line.slice(3)}</h3>;
      if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-700 dark:text-gray-300">{line.slice(2)}</li>;
      if (/^\d+\. /.test(line)) return <li key={i} className="ml-4 list-decimal text-gray-700 dark:text-gray-300">{line.replace(/^\d+\. /, '')}</li>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-gray-700 dark:text-gray-300">{line}</p>;
    });
  };

  // ---------------------------------------------------------------------------
  // Article detail view
  // ---------------------------------------------------------------------------
  if (selectedArticle) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-1 text-sm text-aegis-accent hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          記事一覧に戻る
        </button>

        {/* Article header */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-aegis-border dark:bg-aegis-darker">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant={getCategoryVariant(selectedArticle.category)}>
              {getCategoryLabel(selectedArticle.category)}
            </Badge>
            <Badge variant={getStatusVariant(selectedArticle.status)}>
              {getStatusLabel(selectedArticle.status)}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedArticle.title}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>閲覧数: {selectedArticle.view_count}</span>
            <span>役に立った: {selectedArticle.helpful_count}</span>
            <span>最終更新: {new Date(selectedArticle.updated_at).toLocaleDateString('ja-JP')}</span>
          </div>
          {selectedArticle.tags && selectedArticle.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {selectedArticle.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-aegis-dark dark:text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Article content */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-aegis-border dark:bg-aegis-darker">
          <div className="prose dark:prose-invert max-w-none">
            {renderSimpleMarkdown(selectedArticle.content)}
          </div>
        </div>

        {/* Helpful & Edit buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleHelpful(selectedArticle.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m7.723-9.752h0" />
            </svg>
            役に立った ({selectedArticle.helpful_count})
          </button>
          <button
            onClick={() => handleEditArticle(selectedArticle)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-aegis-border dark:bg-aegis-dark dark:text-gray-300 dark:hover:bg-aegis-darker"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            編集
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main layout
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ナレッジベース</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            社内ナレッジ記事の検索・閲覧・作成を行います
          </p>
        </div>
        <button
          onClick={handleNewArticle}
          className="inline-flex items-center gap-2 rounded-lg bg-aegis-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新規記事作成
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-aegis-dark">
        {([
          { key: 'browse' as const, label: '記事ブラウザ' },
          { key: 'popular' as const, label: '人気記事' },
          { key: 'create' as const, label: '記事作成/編集' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow dark:bg-aegis-darker dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="記事を検索..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-aegis-accent focus:outline-none focus:ring-1 focus:ring-aegis-accent dark:border-aegis-border dark:bg-aegis-dark dark:text-white"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-dark dark:text-white"
            >
              <option value="all">全カテゴリ</option>
              {KNOWN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-dark dark:text-white"
            >
              <option value="all">全ステータス</option>
              {KNOWN_STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>

          {/* Categories sidebar + articles grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Category sidebar */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-aegis-border dark:bg-aegis-darker lg:col-span-1">
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">カテゴリ</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      selectedCategory === 'all'
                        ? 'bg-aegis-accent/10 font-medium text-aegis-accent'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-aegis-dark'
                    }`}
                  >
                    全カテゴリ
                  </button>
                </li>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="animate-pulse">
                      <div className="mx-3 my-2 h-4 rounded bg-gray-200 dark:bg-aegis-border" />
                    </li>
                  ))
                ) : (
                  categories.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-aegis-dark"
                      >
                        <span>{cat.name}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-aegis-dark dark:text-gray-500">
                          {cat.article_count}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Articles list */}
            <div className="space-y-3 lg:col-span-3">
              {loading ? (
                <>
                  <div className="h-4 w-16 rounded bg-gray-200 dark:bg-aegis-border animate-pulse" />
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonArticleCard key={i} />)}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredArticles.length} 件の記事
                  </p>
                  {filteredArticles.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-aegis-border dark:bg-aegis-darker">
                      <p className="text-gray-500 dark:text-gray-400">データなし</p>
                    </div>
                  ) : (
                    filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition hover:border-aegis-accent/50 hover:shadow-sm dark:border-aegis-border dark:bg-aegis-darker dark:hover:border-aegis-accent/50"
                        onClick={() => handleViewArticle(article)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <Badge variant={getCategoryVariant(article.category)}>
                                {getCategoryLabel(article.category)}
                              </Badge>
                              <Badge variant={getStatusVariant(article.status)}>
                                {getStatusLabel(article.status)}
                              </Badge>
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{article.title}</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {article.content.replace(/[#\-*]/g, '').slice(0, 120)}...
                            </p>
                            {article.tags && article.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {article.tags.map((tag) => (
                                  <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-aegis-dark dark:text-gray-500">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              </svg>
                              {article.view_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m7.723-9.752h0" />
                              </svg>
                              {article.helpful_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popular Tab */}
      {activeTab === 'popular' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">人気記事 TOP 10</h2>
          <div className="rounded-lg border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-darker">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-aegis-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">順位</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">タイトル</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">カテゴリ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">閲覧数</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">役に立った</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                ) : popularArticles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      データなし
                    </td>
                  </tr>
                ) : (
                  popularArticles.map((article, index) => (
                    <tr
                      key={article.id}
                      className="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-aegis-dark"
                      onClick={() => handleViewArticle(article)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          index < 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-500 dark:bg-aegis-dark dark:text-gray-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{article.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getCategoryVariant(article.category)}>
                          {getCategoryLabel(article.category)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{article.view_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{article.helpful_count.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Tab */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            記事を作成/編集
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-aegis-border dark:bg-aegis-darker">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">タイトル</label>
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  placeholder="記事のタイトルを入力..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-aegis-accent focus:outline-none focus:ring-1 focus:ring-aegis-accent dark:border-aegis-border dark:bg-aegis-dark dark:text-white"
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
                  <select
                    value={editorCategory}
                    onChange={(e) => setEditorCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-dark dark:text-white"
                  >
                    {KNOWN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">ステータス</label>
                  <select
                    value={editorStatus}
                    onChange={(e) => setEditorStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-dark dark:text-white"
                  >
                    {KNOWN_STATUSES.map((s) => (
                      <option key={s} value={s}>{getStatusLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">タグ（カンマ区切り）</label>
                  <input
                    type="text"
                    value={editorTags}
                    onChange={(e) => setEditorTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-dark dark:text-white"
                  />
                </div>
              </div>

              {/* Content (markdown editor) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  コンテンツ（マークダウン形式）
                </label>
                <div className="rounded-lg border border-gray-300 dark:border-aegis-border">
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-aegis-border dark:bg-aegis-dark">
                    <button
                      type="button"
                      onClick={() => setEditorContent(editorContent + '\n# ')}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-aegis-darker"
                      title="見出し"
                    >
                      <span className="text-xs font-bold">H1</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorContent(editorContent + '\n## ')}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-aegis-darker"
                      title="小見出し"
                    >
                      <span className="text-xs font-bold">H2</span>
                    </button>
                    <div className="mx-1 h-4 w-px bg-gray-300 dark:bg-aegis-border" />
                    <button
                      type="button"
                      onClick={() => setEditorContent(editorContent + '\n- ')}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-aegis-darker"
                      title="リスト"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorContent(editorContent + '\n1. ')}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-aegis-darker"
                      title="番号付きリスト"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003h12m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H4.99m-1.872 6.005L4.99 12.75m0 0-1.872-.622M4.99 12.75h.375m-2.242 5.999h1.872m-1.872 0 1.872-1.875" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorContent(editorContent + '\n```\n\n```')}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-aegis-darker"
                      title="コードブロック"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    rows={16}
                    placeholder="マークダウン形式で記事を記述してください..."
                    className="w-full rounded-b-lg bg-white px-4 py-3 font-mono text-sm focus:outline-none dark:bg-aegis-dark dark:text-white"
                  />
                </div>
              </div>

              {/* Preview */}
              {editorContent && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">プレビュー</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-aegis-border dark:bg-aegis-dark">
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      {renderSimpleMarkdown(editorContent)}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('browse')}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-aegis-border dark:bg-aegis-dark dark:text-gray-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveArticle}
                  className="rounded-lg bg-aegis-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
