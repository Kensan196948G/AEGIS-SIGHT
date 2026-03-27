export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">監視ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          システムとネットワークのリアルタイム監視
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">142</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">正常</p>
        </div>
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">5</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">警告</p>
        </div>
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <div className="h-3 w-3 rounded-full bg-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">2</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">重大</p>
        </div>
        <div className="aegis-card text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">停止中</p>
        </div>
      </div>

      {/* Grafana Embed Placeholder */}
      <div className="aegis-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          システムメトリクス
        </h2>
        <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-aegis-border dark:bg-aegis-dark">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              Grafana ダッシュボード埋め込みエリア
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              GRAFANA_URL 環境変数を設定して接続してください
            </p>
            {/* Uncomment and set the URL to embed Grafana:
            <iframe
              src={process.env.NEXT_PUBLIC_GRAFANA_URL}
              className="h-full w-full rounded-lg"
              frameBorder="0"
            />
            */}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="aegis-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          最近のイベント
        </h2>
        <div className="space-y-3">
          {[
            { time: '14:32', level: 'critical', msg: 'srv-prod-03: CPU使用率が95%を超過' },
            { time: '14:15', level: 'warning', msg: 'db-replica-02: レプリケーション遅延 5秒' },
            { time: '13:58', level: 'info', msg: 'srv-web-01: デプロイ完了 v2.4.1' },
            { time: '13:42', level: 'warning', msg: 'storage-nas-01: ディスク使用率 85%' },
            { time: '13:30', level: 'info', msg: 'fw-edge-01: ファームウェア更新完了' },
          ].map((event, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
              <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                event.level === 'critical' ? 'bg-red-500' :
                event.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-white">{event.msg}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{event.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
