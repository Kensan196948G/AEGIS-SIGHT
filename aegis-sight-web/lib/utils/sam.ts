import type { SamLicense } from '@/lib/types';

export type LicenseStatus = 'compliant' | 'over-deployed' | 'under-utilized' | 'expiring-soon' | 'expired';

export function getDaysUntilExpiry(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeStatus(lic: SamLicense): LicenseStatus {
  const used  = lic.installed_count + lic.m365_assigned;
  const total = lic.purchased_count;
  if (!lic.expiry_date) {
    if (used > total) return 'over-deployed';
    if (total > 0 && used / total < 0.5) return 'under-utilized';
    return 'compliant';
  }
  const days = getDaysUntilExpiry(lic.expiry_date);
  if (days < 0)   return 'expired';
  if (days <= 90) return 'expiring-soon';
  if (used > total) return 'over-deployed';
  if (total > 0 && used / total < 0.5) return 'under-utilized';
  return 'compliant';
}

export const statusConfig: Record<LicenseStatus, { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }> = {
  compliant:        { variant: 'success', label: '準拠' },
  'over-deployed':  { variant: 'danger',  label: '超過' },
  'under-utilized': { variant: 'warning', label: '低利用' },
  'expiring-soon':  { variant: 'warning', label: '期限間近' },
  expired:          { variant: 'danger',  label: '期限切れ' },
};

export function getSamDonutColor(rate: number): string {
  return rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
}

export const licenseTypeLabels: Record<string, string> = {
  perpetual:    '永続',
  subscription: 'サブスクリプション',
  oem:          'OEM',
  volume:       'ボリューム',
  site:         'サイト',
};
