'use client';

import { type JSX, useState } from 'react';
import { clsx } from 'clsx';

type EventType = 'alert' | 'deploy' | 'scan' | 'procurement' | 'user';

interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  time: string;
}

interface ActivityFeedWidgetProps {
  events?: ActivityEvent[];
  maxVisible?: number;
}

const defaultEvents: ActivityEvent[] = [
  { id: '1', type: 'alert', title: 'CPU使用率アラート', description: 'srv-prod-03 の CPU 使用率が 95% を超過しました', time: '5分前' },
  { id: '2', type: 'scan', title: '資産スキャン完了', description: '全 1,284 台のスキャンが正常に完了しました', time: '15分前' },
  { id: '3', type: 'deploy', title: 'パッチ適用完了', description: 'Windows Update KB5034441 を 47 台に適用しました', time: '32分前' },
  { id: '4', type: 'procurement', title: '調達申請承認', description: 'Dell Latitude 5540 x20 台の申請が承認されました', time: '1時間前' },
  { id: '5', type: 'user', title: '新規ユーザー登録', description: '管理者アカウント admin@example.com が追加されました', time: '2時間前' },
  { id: '6', type: 'alert', title: 'ディスク容量警告', description: 'storage-nas-01 の使用率が 85% に達しました', time: '2時間前' },
  { id: '7', type: 'scan', title: 'ライセンス監査完了', description: 'SAM スキャンが完了し、超過ライセンスが検出されました', time: '3時間前' },
  { id: '8', type: 'deploy', title: 'アプリケーション更新', description: 'Google Chrome 123.0 を全端末に配布しました', time: '4時間前' },
];

const eventIcons: Record<EventType, { icon: JSX.Element; bg: string }> = {
  alert: {
    bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
  },
  deploy: {
    bg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  scan: {
    bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  procurement: {
    bg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
  user: {
    bg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
};

const filterLabels: Record<EventType | 'all', string> = {
  all: '全て',
  alert: 'アラート',
  deploy: 'デプロイ',
  scan: 'スキャン',
  procurement: '調達',
  user: 'ユーザー',
};

export function ActivityFeedWidget({
  events = defaultEvents,
  maxVisible = 6,
}: ActivityFeedWidgetProps) {
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  const filteredEvents =
    filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <div className="aegis-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          アクティビティ
        </h2>
      </div>

      {/* Filter tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {(Object.keys(filterLabels) as (EventType | 'all')[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={clsx(
              'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
              filter === key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-aegis-surface dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            {filterLabels[key]}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {filteredEvents.slice(0, maxVisible).map((event, i) => {
          const iconConfig = eventIcons[event.type];
          return (
            <div key={event.id} className="relative flex gap-3 pb-4">
              {/* Timeline line */}
              {i < Math.min(filteredEvents.length, maxVisible) - 1 && (
                <div className="absolute left-[15px] top-8 h-full w-px bg-gray-200 dark:bg-gray-700" />
              )}
              {/* Icon */}
              <div
                className={clsx(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  iconConfig.bg
                )}
              >
                {iconConfig.icon}
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.title}
                  </p>
                  <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                    {event.time}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length > maxVisible && (
        <div className="mt-1 text-center">
          <button className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
            さらに表示 ({filteredEvents.length - maxVisible}件)
          </button>
        </div>
      )}

      {filteredEvents.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          該当するイベントはありません
        </p>
      )}
    </div>
  );
}
