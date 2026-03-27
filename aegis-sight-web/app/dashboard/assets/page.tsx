export default function AssetsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IT資産一覧</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理対象のハードウェア・ソフトウェア資産
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          資産を追加
        </button>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="ホスト名、IPアドレス、シリアル番号で検索..."
              className="aegis-input"
            />
          </div>
          <select className="aegis-input w-auto">
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
            <option value="maintenance">メンテナンス</option>
            <option value="retired">廃棄</option>
          </select>
          <select className="aegis-input w-auto">
            <option value="">すべての部門</option>
            <option value="engineering">エンジニアリング</option>
            <option value="sales">営業</option>
            <option value="hr">人事</option>
            <option value="finance">経理</option>
          </select>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ホスト名
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  IPアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  OS
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  部門
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  最終確認
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {/* Loading skeleton rows */}
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            全 <span className="font-medium">1,284</span> 件中 1-20 件を表示
          </p>
          <div className="flex gap-2">
            <button className="aegis-btn-secondary" disabled>前へ</button>
            <button className="aegis-btn-secondary">次へ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
