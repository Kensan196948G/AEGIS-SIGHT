'use client';

import { useTheme } from '@/lib/theme-context';

const SunIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
    />
  </svg>
);

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    // light -> dark -> system -> light のサイクル
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  };

  const label =
    theme === 'system'
      ? 'システムテーマ（クリックでライトに切替）'
      : theme === 'light'
        ? 'ライトモード（クリックでダークに切替）'
        : 'ダークモード（クリックでシステムに切替）';

  return (
    <button
      onClick={handleToggle}
      className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-aegis-surface"
      aria-label={label}
      title={label}
    >
      {resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
      {theme === 'system' && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary-500 text-[6px] font-bold text-white">
          A
        </span>
      )}
    </button>
  );
}
