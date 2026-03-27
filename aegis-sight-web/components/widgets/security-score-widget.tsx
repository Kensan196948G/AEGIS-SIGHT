'use client';

import { clsx } from 'clsx';

interface SecurityMetric {
  label: string;
  score: number;
  max: number;
}

interface SecurityScoreData {
  overall: number;
  metrics: SecurityMetric[];
}

interface SecurityScoreWidgetProps {
  data?: SecurityScoreData;
}

const defaultData: SecurityScoreData = {
  overall: 82,
  metrics: [
    { label: 'Defender 有効率', score: 95, max: 100 },
    { label: 'BitLocker 暗号化率', score: 78, max: 100 },
    { label: 'パッチ適用率', score: 72, max: 100 },
    { label: 'ファイアウォール準拠率', score: 88, max: 100 },
  ],
};

function getScoreColor(score: number) {
  if (score >= 90) return { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', ring: 'text-emerald-500' };
  if (score >= 70) return { text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', ring: 'text-amber-500' };
  return { text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500', ring: 'text-red-500' };
}

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={colors.ring}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className={clsx('text-2xl font-bold', colors.text)}>{score}</p>
        <p className="text-[9px] text-gray-500 dark:text-gray-400">/100</p>
      </div>
    </div>
  );
}

export function SecurityScoreWidget({ data = defaultData }: SecurityScoreWidgetProps) {
  return (
    <div className="aegis-card">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        セキュリティスコア
      </h2>

      <div className="flex justify-center mb-4">
        <ScoreRing score={data.overall} size={110} />
      </div>

      <div className="space-y-3">
        {data.metrics.map((metric, i) => {
          const percentage = Math.round((metric.score / metric.max) * 100);
          const colors = getScoreColor(percentage);
          return (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {metric.label}
                </span>
                <span className={clsx('text-xs font-semibold', colors.text)}>
                  {percentage}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={clsx('h-full rounded-full transition-all duration-500', colors.bar)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
