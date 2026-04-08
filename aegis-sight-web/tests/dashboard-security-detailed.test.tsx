import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/security',
  useParams: () => ({}),
}));

vi.mock('@/components/ui/chart', () => ({
  DonutChart: ({ label }: { label?: string }) => <div data-testid="donut-chart">{label}</div>,
  BarChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="bar-chart">{data?.map((d) => <span key={d.label}>{d.label}</span>)}</div>
  ),
  ProgressBar: ({ value }: { value?: number }) => <div data-testid="progress-bar" data-value={value} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, dot }: { children: React.ReactNode; variant?: string; dot?: boolean }) => (
    <span data-variant={variant} data-dot={dot}>{children}</span>
  ),
}));

afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */
async function renderPage() {
  const { default: Page } = await import('@/app/dashboard/security/page');
  return render(<Page />);
}

/* ================================================================== */
/* 1. Basic rendering                                                  */
/* ================================================================== */
describe('SecurityPage - basic rendering', () => {
  it('renders without crashing', async () => {
    const { container } = await renderPage();
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('shows page heading', async () => {
    await renderPage();
    expect(screen.getByText('セキュリティ概要')).toBeTruthy();
  });

  it('shows subtitle', async () => {
    await renderPage();
    expect(screen.getByText('Defender、BitLocker、パッチ管理の統合ビュー')).toBeTruthy();
  });

  it('shows scan button', async () => {
    await renderPage();
    expect(screen.getByText('フルスキャン実行')).toBeTruthy();
  });
});

/* ================================================================== */
/* 2. Top stat cards                                                   */
/* ================================================================== */
describe('SecurityPage - top stat cards', () => {
  it('renders Microsoft Defender card', async () => {
    await renderPage();
    expect(screen.getByText('Microsoft Defender')).toBeTruthy();
  });

  it('renders BitLocker card', async () => {
    await renderPage();
    expect(screen.getByText('BitLocker暗号化')).toBeTruthy();
  });

  it('renders Patch Status card', async () => {
    await renderPage();
    expect(screen.getByText('パッチ適用状況')).toBeTruthy();
  });

  it('shows Defender active count 1245', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('有効: 1245');
  });

  it('shows Defender outdated count 28', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('定義古い: 28');
  });

  it('shows Defender disabled count 11', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('無効: 11');
  });

  it('shows BitLocker encrypted count 1198', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('暗号化済: 1198');
  });

  it('shows patch upToDate count 1105', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('最新: 1105');
  });

  it('shows patch pending count 132', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('適用待: 132');
  });

  it('shows patch failed count 47', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('失敗: 47');
  });
});

/* ================================================================== */
/* 3. Patch status badge branch: failed > 0 → 'warning'               */
/* ================================================================== */
describe('SecurityPage - patch status badge branch', () => {
  it('renders patch badge with variant warning because failed > 0', async () => {
    await renderPage();
    // patchStatus.failed = 47 > 0, so variant should be 'warning'
    // The badge shows Math.round((1105/1284)*100) = 86%
    const badges = document.querySelectorAll('[data-variant="warning"]');
    const patchBadge = Array.from(badges).find((b) => b.textContent?.includes('86%'));
    expect(patchBadge).toBeTruthy();
    expect(patchBadge?.getAttribute('data-variant')).toBe('warning');
  });

  it('patch badge has dot attribute', async () => {
    await renderPage();
    const badges = document.querySelectorAll('[data-variant="warning"]');
    const patchBadge = Array.from(badges).find((b) => b.textContent?.includes('86%'));
    expect(patchBadge?.getAttribute('data-dot')).toBe('true');
  });
});

/* ================================================================== */
/* 4. Vulnerability severity badge branches                            */
/* ================================================================== */
describe('SecurityPage - vulnerability severity badges', () => {
  it('critical severity renders variant=danger', async () => {
    await renderPage();
    // Two critical vulns should produce badges with variant=danger and text '重大'
    const dangerBadges = document.querySelectorAll('[data-variant="danger"]');
    const criticalLabels = Array.from(dangerBadges).filter((b) => b.textContent === '重大');
    expect(criticalLabels.length).toBe(2);
  });

  it('warning severity renders variant=warning', async () => {
    await renderPage();
    const warningBadges = document.querySelectorAll('[data-variant="warning"]');
    const warnLabels = Array.from(warningBadges).filter((b) => b.textContent === '警告');
    expect(warnLabels.length).toBe(2);
  });

  it('info severity renders variant=info', async () => {
    await renderPage();
    const infoBadges = document.querySelectorAll('[data-variant="info"]');
    const infoLabels = Array.from(infoBadges).filter((b) => b.textContent === '情報');
    expect(infoLabels.length).toBe(1);
  });
});

/* ================================================================== */
/* 5. Vulnerability severity label branches                            */
/* ================================================================== */
describe('SecurityPage - vulnerability severity labels', () => {
  it('critical → 重大 label text', async () => {
    await renderPage();
    const allText = document.body.textContent!;
    // There are 2 critical vulns, so '重大' appears at least twice
    expect(allText.match(/重大/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('warning → 警告 label text', async () => {
    await renderPage();
    const allText = document.body.textContent!;
    expect(allText.match(/警告/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('info → 情報 label text', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('情報');
  });
});

/* ================================================================== */
/* 6. Vulnerability status badge branches                              */
/* ================================================================== */
describe('SecurityPage - vulnerability status badges', () => {
  it('patching → variant=info, label=適用中', async () => {
    await renderPage();
    const infoBadges = document.querySelectorAll('[data-variant="info"]');
    const patchingLabels = Array.from(infoBadges).filter((b) => b.textContent === '適用中');
    // 2 vulns have status=patching
    expect(patchingLabels.length).toBe(2);
  });

  it('scheduled → variant=warning, label=予定', async () => {
    await renderPage();
    const warningBadges = document.querySelectorAll('[data-variant="warning"]');
    const scheduledLabels = Array.from(warningBadges).filter((b) => b.textContent === '予定');
    // 2 vulns have status=scheduled
    expect(scheduledLabels.length).toBe(2);
  });

  it('resolved → variant=success, label=解決済', async () => {
    await renderPage();
    const successBadges = document.querySelectorAll('[data-variant="success"]');
    const resolvedLabels = Array.from(successBadges).filter((b) => b.textContent === '解決済');
    expect(resolvedLabels.length).toBe(1);
  });
});

/* ================================================================== */
/* 7. Vulnerability details                                            */
/* ================================================================== */
describe('SecurityPage - vulnerability details', () => {
  it('shows CVE IDs', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('CVE-2024-21338');
    expect(document.body.textContent).toContain('CVE-2024-21412');
    expect(document.body.textContent).toContain('CVE-2024-21351');
    expect(document.body.textContent).toContain('CVE-2024-20677');
    expect(document.body.textContent).toContain('CVE-2024-20674');
  });

  it('shows affected device counts', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('47台');
    expect(document.body.textContent).toContain('23台');
    expect(document.body.textContent).toContain('156台');
    expect(document.body.textContent).toContain('312台');
    expect(document.body.textContent).toContain('14台');
  });
});

/* ================================================================== */
/* 8. Security events - status badge variants via statusVariants map   */
/* ================================================================== */
describe('SecurityPage - security event status badges', () => {
  it('隔離済 → variant=success', async () => {
    await renderPage();
    const successBadges = document.querySelectorAll('[data-variant="success"]');
    const found = Array.from(successBadges).find((b) => b.textContent === '隔離済');
    expect(found).toBeTruthy();
  });

  it('進行中 → variant=info', async () => {
    await renderPage();
    const infoBadges = document.querySelectorAll('[data-variant="info"]');
    const found = Array.from(infoBadges).find((b) => b.textContent === '進行中');
    expect(found).toBeTruthy();
  });

  it('要対応 → variant=danger', async () => {
    await renderPage();
    const dangerBadges = document.querySelectorAll('[data-variant="danger"]');
    const found = Array.from(dangerBadges).find((b) => b.textContent === '要対応');
    expect(found).toBeTruthy();
  });

  it('ブロック済 → variant=purple', async () => {
    await renderPage();
    const purpleBadges = document.querySelectorAll('[data-variant="purple"]');
    const found = Array.from(purpleBadges).find((b) => b.textContent === 'ブロック済');
    expect(found).toBeTruthy();
  });

  it('完了 → variant=success', async () => {
    await renderPage();
    const successBadges = document.querySelectorAll('[data-variant="success"]');
    const found = Array.from(successBadges).find((b) => b.textContent === '完了');
    expect(found).toBeTruthy();
  });

  it('statusVariants fallback: all events have a known status (no default fallback in data)', async () => {
    await renderPage();
    // All 5 event statuses are in the statusVariants map, so none fall through to 'default'
    const defaultBadges = document.querySelectorAll('[data-variant="default"]');
    expect(defaultBadges.length).toBe(0);
  });
});

/* ================================================================== */
/* 9. Event messages                                                   */
/* ================================================================== */
describe('SecurityPage - security event messages', () => {
  it('shows all event messages', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('マルウェア検出: Trojan:Win32/Emotet - PC-SALES-042');
    expect(document.body.textContent).toContain('BitLocker暗号化開始: PC-HR-015');
    expect(document.body.textContent).toContain('KB5034763 適用失敗: SRV-APP-02');
    expect(document.body.textContent).toContain('ブルートフォース検出: 5回の失敗ログイン - admin_ext');
    expect(document.body.textContent).toContain('月次パッチ適用完了: 1,105台');
  });

  it('shows event times', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('15:42');
    expect(document.body.textContent).toContain('14:18');
    expect(document.body.textContent).toContain('13:55');
    expect(document.body.textContent).toContain('12:30');
    expect(document.body.textContent).toContain('11:15');
  });
});

/* ================================================================== */
/* 10. Security score progress bars                                    */
/* ================================================================== */
describe('SecurityPage - security score section', () => {
  it('renders section heading', async () => {
    await renderPage();
    expect(screen.getByText('セキュリティスコア')).toBeTruthy();
  });

  it('shows last updated text', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('最終更新: 15分前');
  });

  it('shows all 4 metric labels', async () => {
    await renderPage();
    expect(screen.getByText('エンドポイント保護')).toBeTruthy();
    expect(screen.getByText('ディスク暗号化')).toBeTruthy();
    expect(screen.getByText('パッチ適用率')).toBeTruthy();
    expect(screen.getByText('総合スコア')).toBeTruthy();
  });

  it('renders 4 progress bars with correct values', async () => {
    await renderPage();
    const bars = document.querySelectorAll('[data-testid="progress-bar"]');
    expect(bars.length).toBe(4);
    const values = Array.from(bars).map((b) => Number(b.getAttribute('data-value')));
    expect(values).toContain(97);
    expect(values).toContain(93);
    expect(values).toContain(86);
    expect(values).toContain(92);
  });

  it('shows percentage text for each metric', async () => {
    await renderPage();
    expect(document.body.textContent).toContain('97%');
    expect(document.body.textContent).toContain('93%');
    expect(document.body.textContent).toContain('92%');
  });
});

/* ================================================================== */
/* 11. DonutChart labels                                               */
/* ================================================================== */
describe('SecurityPage - DonutChart labels', () => {
  it('renders 3 donut charts', async () => {
    await renderPage();
    const charts = screen.getAllByTestId('donut-chart');
    expect(charts.length).toBe(3);
  });

  it('Defender chart shows label 有効', async () => {
    await renderPage();
    const charts = screen.getAllByTestId('donut-chart');
    expect(charts[0].textContent).toBe('有効');
  });

  it('BitLocker chart shows label 暗号化', async () => {
    await renderPage();
    const charts = screen.getAllByTestId('donut-chart');
    expect(charts[1].textContent).toBe('暗号化');
  });

  it('Patch chart shows label 最新', async () => {
    await renderPage();
    const charts = screen.getAllByTestId('donut-chart');
    expect(charts[2].textContent).toBe('最新');
  });
});

/* ================================================================== */
/* 12. OS distribution bar chart                                       */
/* ================================================================== */
describe('SecurityPage - OS distribution chart', () => {
  it('renders section heading', async () => {
    await renderPage();
    expect(screen.getByText('OS別端末分布')).toBeTruthy();
  });

  it('renders bar chart', async () => {
    await renderPage();
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });

  it('shows all OS labels in chart', async () => {
    await renderPage();
    const chart = screen.getByTestId('bar-chart');
    expect(chart.textContent).toContain('Win 11 23H2');
    expect(chart.textContent).toContain('Win 11 22H2');
    expect(chart.textContent).toContain('Win 10 22H2');
    expect(chart.textContent).toContain('macOS 14');
    expect(chart.textContent).toContain('macOS 13');
    expect(chart.textContent).toContain('Ubuntu 22');
    expect(chart.textContent).toContain('Other');
  });
});

/* ================================================================== */
/* 13. Section headings                                                */
/* ================================================================== */
describe('SecurityPage - section headings', () => {
  it('shows vulnerability list heading', async () => {
    await renderPage();
    expect(screen.getByText('脆弱性一覧')).toBeTruthy();
  });

  it('shows security events heading', async () => {
    await renderPage();
    expect(screen.getByText('セキュリティイベント')).toBeTruthy();
  });
});

/* ================================================================== */
/* 14. Defender & BitLocker badge details                              */
/* ================================================================== */
describe('SecurityPage - Defender and BitLocker badges', () => {
  it('Defender badge shows variant=success with 稼働中', async () => {
    await renderPage();
    const successBadges = document.querySelectorAll('[data-variant="success"]');
    const found = Array.from(successBadges).find((b) => b.textContent === '稼働中');
    expect(found).toBeTruthy();
    expect(found?.getAttribute('data-dot')).toBe('true');
  });

  it('BitLocker badge shows variant=info with 93.3%', async () => {
    await renderPage();
    const infoBadges = document.querySelectorAll('[data-variant="info"]');
    const found = Array.from(infoBadges).find((b) => b.textContent === '93.3%');
    expect(found).toBeTruthy();
    expect(found?.getAttribute('data-dot')).toBe('true');
  });
});
