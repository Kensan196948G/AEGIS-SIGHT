import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-primary-200 border-t-primary-600',
        spinnerSizes[size],
        className
      )}
      role="status"
      aria-label="読み込み中"
    />
  );
}

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={clsx(
            'rounded bg-gray-200 dark:bg-gray-700',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
            className || 'h-4'
          )}
        />
      ))}
    </div>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = '読み込み中...' }: PageLoadingProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="aegis-card overflow-hidden p-0">
      <div className="animate-pulse">
        <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-3 dark:border-aegis-border dark:bg-aegis-dark/50">
          <div className="flex gap-4">
            {[...Array(cols)].map((_, j) => (
              <div key={j} className="h-3 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        </div>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="border-b border-gray-100 px-6 py-4 dark:border-aegis-border">
            <div className="flex gap-4">
              {[...Array(cols)].map((_, j) => (
                <div key={j} className="h-4 flex-1 rounded bg-gray-100 dark:bg-gray-700/50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
