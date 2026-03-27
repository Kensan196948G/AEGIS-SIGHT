export default function LicensesPage() {
  const licenses = [
    { id: '1', name: 'Microsoft 365 E3', vendor: 'Microsoft', type: 'サブスクリプション', total: 500, used: 487, status: 'compliant' },
    { id: '2', name: 'Adobe Creative Cloud', vendor: 'Adobe', type: 'サブスクリプション', total: 50, used: 58, status: 'over-deployed' },
    { id: '3', name: 'Slack Business+', vendor: 'Salesforce', type: 'サブスクリプション', total: 600, used: 412, status: 'under-utilized' },
    { id: '4', name: 'AutoCAD LT', vendor: 'Autodesk', type: 'サブスクリプション', total: 30, used: 28, status: 'compliant' },
    { id: '5', name: 'Visual Studio Enterprise', vendor: 'Microsoft', type: 'サブスクリプション', total: 20, used: 18, status: 'compliant' },
    { id: '6', name: 'Jira Software Cloud', vendor: 'Atlassian', type: 'サブスクリプション', total: 200, used: 195, status: 'compliant' },
    { id: '7', name: 'Windows Server 2022', vendor: 'Microsoft', type: 'ボリューム', total: 15, used: 14, status: 'compliant' },
    { id: '8', name: 'Norton 360', vendor: 'Gen Digital', type: 'サブスクリプション', total: 600, used: 320, status: 'under-utilized' },
  ];

  const statusBadge: Record<string, string> = {
    compliant: 'aegis-badge-success',
    'over-deployed': 'aegis-badge-danger',
    'under-utilized': 'aegis-badge-warning',
    expired: 'aegis-badge-danger',
  };

  const statusLabel: Record<string, string> = {
    compliant: '準拠',
    'over-deployed': '超過',
    'under-utilized': '低利用',
    expired: '期限切れ',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ライセンス一覧</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ソフトウェアライセンスの管理と遵守状況
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          ライセンスを追加
        </button>
      </div>

      {/* Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ソフトウェア</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ベンダー</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">種別</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">購入数</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">使用数</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">使用率</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {licenses.map((lic) => {
                const usageRate = Math.round((lic.used / lic.total) * 100);
                return (
                  <tr key={lic.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {lic.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {lic.vendor}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {lic.type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {lic.total}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {lic.used}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full ${
                              usageRate > 100 ? 'bg-red-500' : usageRate > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(usageRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {usageRate}%
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={statusBadge[lic.status]}>
                        {statusLabel[lic.status]}
                      </span>
                    </td>
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
