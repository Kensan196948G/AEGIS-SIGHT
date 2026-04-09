import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getDeviceStatusDotColor, getDiskBarColor } from '@/app/dashboard/devices/[id]/page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/devices/d001',
  useParams: () => ({ id: 'd001' }),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    <span data-variant={variant}>{children}</span>,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('Device Detail page - heading and basic render', () => {
  it('renders without crashing', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    const { container } = render(<Page />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows PC-TANAKA-001 hostname', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getAllByText('PC-TANAKA-001')[0]).toBeTruthy();
  });

  it('shows breadcrumb with デバイス管理 link', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('デバイス管理')).toBeTruthy();
  });

  it('shows オンライン status badge (online branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('オンライン')).toBeTruthy();
  });

  it('shows Dell OptiPlex manufacturer and model', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    const hasDell = document.body.textContent?.includes('Dell') &&
                    document.body.textContent?.includes('OptiPlex');
    expect(hasDell).toBe(true);
  });

  it('shows エンジニアリング department', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('エンジニアリング')).toBe(true);
  });
});

describe('Device Detail page - action buttons', () => {
  it('shows パッチ適用 button', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('パッチ適用')).toBeTruthy();
  });

  it('shows リモート接続 button', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('リモート接続')).toBeTruthy();
  });

  it('can click パッチ適用 without error', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    fireEvent.click(screen.getByText('パッチ適用'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('can click リモート接続 without error', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    fireEvent.click(screen.getByText('リモート接続'));
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });
});

describe('Device Detail page - basic info section', () => {
  it('shows 基本情報 section heading', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('基本情報')).toBeTruthy();
  });

  it('shows ホスト名 label', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('ホスト名')).toBeTruthy();
  });

  it('shows IP address 192.168.1.101 (mono branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('192.168.1.101')).toBe(true);
  });

  it('shows MAC address (mono branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('00:1A:2B:3C:4D:5E')).toBe(true);
  });

  it('shows 担当ユーザー 田中 一郎', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('田中 一郎')).toBe(true);
  });

  it('shows シリアル番号 SN-2024-001234', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('SN-2024-001234')).toBe(true);
  });

  it('shows 最終パッチ date', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('2026-03-28')).toBe(true);
  });

  it('shows Windows OS version', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Windows')).toBe(true);
  });
});

describe('Device Detail page - hardware section', () => {
  it('shows ハードウェア section heading', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('ハードウェア')).toBeTruthy();
  });

  it('shows CPU info', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    const hasCPU = document.body.textContent?.includes('Intel Core i7') ||
                   document.body.textContent?.includes('CPU');
    expect(hasCPU).toBe(true);
  });

  it('shows memory 16 GB', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('16 GB')).toBe(true);
  });

  it('shows disk usage percentage (54%)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    // diskUsedPct = round((512-234)/512*100) = 54
    expect(document.body.textContent?.includes('54%')).toBe(true);
  });

  it('shows disk total and used GB', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    const hasDisk = document.body.textContent?.includes('512') &&
                    document.body.textContent?.includes('278');
    expect(hasDisk).toBe(true);
  });

  it('shows ディスク使用率 label', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('ディスク使用率')).toBeTruthy();
  });
});

describe('Device Detail page - installed software section', () => {
  it('shows インストール済みソフトウェア heading', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('インストール済みソフトウェア')).toBeTruthy();
  });

  it('shows Microsoft Office 365', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Microsoft Office 365')).toBe(true);
  });

  it('shows Google Chrome', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Google Chrome')).toBe(true);
  });

  it('shows Visual Studio Code', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Visual Studio Code')).toBe(true);
  });

  it('shows Slack', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Slack')).toBe(true);
  });

  it('shows Zoom', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Zoom')).toBe(true);
  });

  it('shows software version numbers', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    const hasVersion = document.body.textContent?.includes('16.0.17425') ||
                       document.body.textContent?.includes('123.0.6312');
    expect(hasVersion).toBe(true);
  });

  it('shows software column headers', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    const hasCols = document.body.textContent?.includes('ソフトウェア名') &&
                    document.body.textContent?.includes('バージョン');
    expect(hasCols).toBe(true);
  });
});

describe('Device Detail page - recent events section', () => {
  it('shows 最近のイベント heading', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('最近のイベント')).toBeTruthy();
  });

  it('shows logon event (ログオン label - green branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('ログオン')).toBe(true);
  });

  it('shows logoff event (ログオフ label - gray branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('ログオフ')).toBe(true);
  });

  it('shows patch event (パッチ label - blue branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('パッチ')).toBe(true);
  });

  it('shows alert event (アラート label - red branch)', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('アラート')).toBe(true);
  });

  it('shows Windows Update patch description', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('Windows Update')).toBe(true);
  });

  it('shows disk alert description', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('ディスク使用率 80%')).toBe(true);
  });

  it('shows event timestamps', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(document.body.textContent?.includes('2026-04-02')).toBe(true);
  });
});

describe('Device Detail page - quick actions section', () => {
  it('shows クイックアクション heading', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('クイックアクション')).toBeTruthy();
  });

  it('shows 監視詳細を見る button', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('監視詳細を見る')).toBeTruthy();
  });

  it('shows パッチ履歴 button', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('パッチ履歴')).toBeTruthy();
  });

  it('shows セキュリティスキャン button', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('セキュリティスキャン')).toBeTruthy();
  });

  it('shows ログ一覧 button', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('ログ一覧')).toBeTruthy();
  });

  it('shows 関連アラート button', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    expect(screen.getByText('関連アラート')).toBeTruthy();
  });

  it('can click quick action buttons without error', async () => {
    const { default: Page } = await import('@/app/dashboard/devices/[id]/page');
    render(<Page />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      fireEvent.click(btn);
    });
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });
});

// ==========================================================================
// Exported helper functions — branch coverage for all arms
// ==========================================================================

describe('DeviceDetailPage - getDeviceStatusDotColor branches', () => {
  it('online → bg-green-500', () => {
    expect(getDeviceStatusDotColor('online')).toBe('bg-green-500');
  });

  it('warning → bg-yellow-500', () => {
    expect(getDeviceStatusDotColor('warning')).toBe('bg-yellow-500');
  });

  it('maintenance → bg-blue-500', () => {
    expect(getDeviceStatusDotColor('maintenance')).toBe('bg-blue-500');
  });

  it('offline/unknown → bg-gray-400 (default branch)', () => {
    expect(getDeviceStatusDotColor('offline')).toBe('bg-gray-400');
    expect(getDeviceStatusDotColor('unknown')).toBe('bg-gray-400');
  });
});

describe('DeviceDetailPage - getDiskBarColor branches', () => {
  it('pct >= 80 → bg-red-500 (high usage)', () => {
    expect(getDiskBarColor(80)).toBe('bg-red-500');
    expect(getDiskBarColor(95)).toBe('bg-red-500');
  });

  it('60 <= pct < 80 → bg-yellow-500 (medium usage)', () => {
    expect(getDiskBarColor(60)).toBe('bg-yellow-500');
    expect(getDiskBarColor(75)).toBe('bg-yellow-500');
  });

  it('pct < 60 → bg-green-500 (low usage)', () => {
    expect(getDiskBarColor(54)).toBe('bg-green-500');
    expect(getDiskBarColor(0)).toBe('bg-green-500');
  });
});
