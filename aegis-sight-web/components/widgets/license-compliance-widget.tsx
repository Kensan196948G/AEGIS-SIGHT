'use client';

import { clsx } from 'clsx';

interface OverDeployedLicense {
  name: string;
  total: number;
  used: number;
}

interface ExpiringLicense {
  name: string;
  daysLeft: number;
}

interface LicenseComplianceData {
  complianceRate: number;
  overDeployed: OverDeployedLicense[];
  expiring: ExpiringLicense[];
}

interface LicenseComplianceWidgetProps {
  data?: LicenseComplianceData;
}

const defaultData: LicenseComplianceData = {
  complianceRate: 94.2,
  overDeployed: [
    { name: 'Adobe Creative Cloud', total: 50, used: 58 },
    { name: 'AutoCAD LT', total: 30, used: 33 },
    { name: 'Figma Business', total: 25, used: 27 },
  ],
  expiring: [
    { name: 'Norton 360', daysLeft: 15 },
    { name: 'Jira Software Cloud', daysLeft: 30 },
    { name: 'Windows Server 2022', daysLeft: 45 },
  ],
};

function GaugeBar({ value, max = 100 }: { value: number; max?: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  const color =
    value >= 90
      ? 'bg-emerald-500'
      : value >= 70
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">遵守率</span>
        <span
          className={clsx(
            'text-2xl font-bold',
            value >= 90
              ? 'text-emerald-600 dark:text-emerald-400'
              : value >= 70
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          )}
        >
          {value}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function LicenseComplianceWidget({ data = defaultData }: LicenseComplianceWidgetProps) {
  return (
    <div className="aegis-card">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        ライセンス遵守状況
      </h2>

      {/* Gauge */}
      <GaugeBar value={data.complianceRate} />

      {/* Over-deployed licenses */}
      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          超過ライセンス TOP3
        </h3>
        <div className="space-y-2">
          {data.overDeployed.slice(0, 3).map((lic, i) => {
            const excess = lic.used - lic.total;
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/10"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {lic.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lic.used}/{lic.total}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  +{excess}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expiring licenses */}
      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          期限切れ間近
        </h3>
        <div className="space-y-2">
          {data.expiring.map((lic, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/10"
            >
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {lic.name}
              </p>
              <span
                className={clsx(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                  lic.daysLeft <= 14
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                )}
              >
                残り{lic.daysLeft}日
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
