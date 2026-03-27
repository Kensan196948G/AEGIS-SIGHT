/** IT資産デバイス */
export interface Device {
  id: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  osName: string;
  osVersion: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  department: string;
  assignedUser: string | null;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

/** ソフトウェアライセンス */
export interface License {
  id: string;
  softwareName: string;
  vendor: string;
  licenseType: 'perpetual' | 'subscription' | 'oem' | 'volume' | 'site';
  licenseKey: string;
  totalQuantity: number;
  usedQuantity: number;
  expirationDate: string | null;
  cost: number;
  currency: string;
  status: 'compliant' | 'over-deployed' | 'under-utilized' | 'expired';
  createdAt: string;
  updatedAt: string;
}

/** 調達申請 */
export interface ProcurementRequest {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  department: string;
  category: 'hardware' | 'software' | 'service' | 'other';
  estimatedCost: number;
  currency: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'completed';
  approverIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** ユーザー */
export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  avatarUrl: string | null;
  lastLogin: string | null;
  createdAt: string;
}

/** アラート */
export interface Alert {
  id: string;
  type: 'security' | 'compliance' | 'performance' | 'inventory';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  acknowledged: boolean;
  createdAt: string;
}

/** APIレスポンス */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

/** ダッシュボード統計 */
export interface DashboardStats {
  totalDevices: number;
  activeAlerts: number;
  licenseComplianceRate: number;
  pendingProcurements: number;
  devicesTrend: number;
  alertsTrend: number;
  complianceTrend: number;
  procurementsTrend: number;
}

/** ページネーション付きレスポンス */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

/** セキュリティ概要 */
export interface SecurityOverview {
  riskScore: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  unpatched: number;
  complianceRate: number;
  lastScanAt: string;
  threats: {
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    detectedAt: string;
    status: 'open' | 'mitigated' | 'resolved';
  }[];
}

/** ログオンイベント */
export interface LogonEvent {
  id: string;
  userId: string;
  userName: string;
  hostname: string;
  ipAddress: string;
  logonType: 'interactive' | 'remote' | 'network' | 'service' | 'unlock';
  status: 'success' | 'failure';
  timestamp: string;
  source: string;
}

/** USBイベント */
export interface UsbEvent {
  id: string;
  deviceName: string;
  deviceType: string;
  serialNumber: string;
  hostname: string;
  userName: string;
  action: 'connected' | 'disconnected' | 'blocked';
  timestamp: string;
}

/** ファイル操作イベント */
export interface FileEvent {
  id: string;
  filePath: string;
  fileName: string;
  operation: 'create' | 'modify' | 'delete' | 'rename' | 'copy' | 'move';
  userName: string;
  hostname: string;
  fileSize: number;
  timestamp: string;
}

/** ログイベント統合型 */
export type LogEvent = LogonEvent | UsbEvent | FileEvent;

/** ソフトウェアインベントリ */
export interface SoftwareInventory {
  id: string;
  name: string;
  vendor: string;
  version: string;
  installedCount: number;
  licensedCount: number | null;
  category: string;
  complianceStatus: 'compliant' | 'over-deployed' | 'unlicensed' | 'unknown';
  lastDetectedAt: string;
}

/** コンプライアンスチェック */
export interface ComplianceCheck {
  id: string;
  softwareName: string;
  vendor: string;
  licensedQuantity: number;
  installedQuantity: number;
  complianceRate: number;
  status: 'compliant' | 'over-deployed' | 'under-utilized';
  lastCheckedAt: string;
  recommendation: string | null;
}

/** ログフィルタ */
export interface LogFilters {
  startDate?: string;
  endDate?: string;
  userName?: string;
  hostname?: string;
  status?: string;
  page?: number;
  perPage?: number;
}
