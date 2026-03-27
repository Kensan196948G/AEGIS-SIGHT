export default function ProcurementPage() {
  const requests = [
    { id: 'PR-2024-089', title: 'Dell Latitude 5540 x 20台', requester: '田中太郎', dept: 'エンジニアリング', cost: '¥3,200,000', priority: 'high', status: 'approved' },
    { id: 'PR-2024-090', title: 'Adobe CC ライセンス追加 10本', requester: '佐藤花子', dept: 'デザイン', cost: '¥720,000', priority: 'medium', status: 'submitted' },
    { id: 'PR-2024-091', title: 'Cisco Catalyst 9300 スイッチ', requester: '山田次郎', dept: 'インフラ', cost: '¥1,500,000', priority: 'high', status: 'submitted' },
    { id: 'PR-2024-092', title: '27インチ 4Kモニター x 15台', requester: '鈴木一郎', dept: '営業', cost: '¥900,000', priority: 'low', status: 'draft' },
    { id: 'PR-2024-093', title: 'Microsoft 365 E5 アップグレード', requester: '高橋美咲', dept: 'IT管理', cost: '¥2,400,000', priority: 'medium', status: 'ordered' },
  ];

  const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    submitted: 'aegis-badge-info',
    approved: 'aegis-badge-success',
    rejected: 'aegis-badge-danger',
    ordered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'aegis-badge-success',
    completed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const statusLabel: Record<string, string> = {
    draft: '下書き',
    submitted: '申請中',
    approved: '承認済',
    rejected: '却下',
    ordered: '発注済',
    delivered: '納品済',
    completed: '完了',
  };

  const priorityBadge: Record<string, string> = {
    low: 'text-gray-500',
    medium: 'text-amber-600 dark:text-amber-400',
    high: 'text-red-600 dark:text-red-400',
    urgent: 'text-red-700 dark:text-red-300 font-bold',
  };

  const priorityLabel: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">調達管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            IT機器・ソフトウェアの調達申請と承認
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新規申請
        </button>
      </div>

      {/* Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">申請番号</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">タイトル</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">申請者</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">部門</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">見積額</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">優先度</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {requests.map((req) => (
                <tr key={req.id} className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                    {req.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {req.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {req.requester}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {req.dept}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {req.cost}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`text-xs font-semibold ${priorityBadge[req.priority]}`}>
                      {priorityLabel[req.priority]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`aegis-badge ${statusBadge[req.status]}`}>
                      {statusLabel[req.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
