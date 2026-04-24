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

/** Backend paginated list wrapper (matches PaginatedResponse[T] in FastAPI) */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

/** SAM ライセンス種別 (matches LicenseType enum in backend) */
export type SamLicenseType = 'perpetual' | 'subscription' | 'oem' | 'volume' | 'site';

/** SAM ライセンス (matches LicenseResponse in backend) */
export interface SamLicense {
  id: string;                     // UUID
  software_name: string;
  vendor: string;
  license_type: SamLicenseType;
  license_key: string | null;
  purchased_count: number;
  installed_count: number;
  m365_assigned: number;
  cost_per_unit: number | null;   // Decimal serialized as string/number
  currency: string;
  purchase_date: string | null;   // ISO date string
  expiry_date: string | null;     // ISO date string
  vendor_contract_id: string | null;
  notes: string | null;
  created_at: string;             // ISO datetime
  updated_at: string;             // ISO datetime
}

/** SAM SKU エイリアス (matches SkuAliasResponse in backend) */
export interface SamSkuAlias {
  id: string;                     // UUID
  software_license_id: string;    // UUID
  sku_part_number: string;
  created_at: string;             // ISO datetime
  updated_at: string;             // ISO datetime
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
