/**
 * Number and value formatting utilities for AEGIS-SIGHT
 */

/**
 * Format number with comma separators
 * @example formatNumber(1234567) => '1,234,567'
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ja-JP');
}

/**
 * Format as Japanese Yen currency
 * @example formatCurrency(1234567) => '¥1,234,567'
 */
export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format bytes into human-readable size
 * @example formatBytes(1536) => '1.5 KB'
 * @example formatBytes(1073741824) => '1 GB'
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  // Remove trailing zeros
  const formatted = value.toFixed(decimals).replace(/\.0+$/, '');
  return `${formatted} ${units[i]}`;
}

/**
 * Format as percentage
 * @example formatPercent(0.853) => '85.3%'
 * @example formatPercent(85.3, false) => '85.3%'
 */
export function formatPercent(n: number, isDecimal: boolean = true, decimals: number = 1): string {
  const value = isDecimal ? n * 100 : n;
  return `${value.toFixed(decimals)}%`;
}
