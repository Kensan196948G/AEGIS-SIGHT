import type { ApiResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTH_STORAGE_KEY = 'aegis-sight-auth';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getAuthToken(): string | null {
    if (this.token) return this.token;
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { token?: string };
        return parsed.token ?? null;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new ApiError(response.status, error.message || 'Unknown error');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = new ApiClient(API_BASE_URL);

// ── Backend response types (snake_case as returned by API) ──────────────────

export interface BackendDashboardStats {
  total_devices: number;
  online_devices: number;
  total_licenses: number;
  compliance_rate: number;
  pending_procurements: number;
  active_alerts: number;
}

export interface BackendAlert {
  id: string;
  device_id: string | null;
  severity: 'critical' | 'warning' | 'info';
  category: 'security' | 'license' | 'hardware' | 'network';
  title: string;
  message: string;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface BackendDevice {
  id: string;
  hostname: string;
  os_version: string | null;
  ip_address: string | null;
  mac_address: string | null;
  domain: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  last_seen: string | null;
  created_at: string;
}

export interface PaginatedBackend<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

// ── Convenience functions ───────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<BackendDashboardStats> {
  return api.get<BackendDashboardStats>('/api/v1/dashboard/stats');
}

export async function fetchRecentAlerts(limit = 5): Promise<PaginatedBackend<BackendAlert>> {
  return api.get<PaginatedBackend<BackendAlert>>(`/api/v1/alerts?limit=${limit}&offset=0`);
}

export async function fetchDevices(
  offset = 0,
  limit = 50,
  status?: string,
): Promise<PaginatedBackend<BackendDevice>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (status) params.set('status', status);
  return api.get<PaginatedBackend<BackendDevice>>(`/api/v1/assets?${params}`);
}

export async function fetchDevice(id: string): Promise<BackendDevice> {
  return api.get<BackendDevice>(`/api/v1/assets/${id}`);
}

export async function fetchLicenses(page = 1, perPage = 20) {
  return api.get<ApiResponse<import('./types').License[]>>(
    `/api/v1/licenses?page=${page}&per_page=${perPage}`
  );
}

export async function fetchProcurementRequests(page = 1, perPage = 20) {
  return api.get<ApiResponse<import('./types').ProcurementRequest[]>>(
    `/api/v1/procurement?page=${page}&per_page=${perPage}`
  );
}

export async function fetchAlerts(
  offset = 0,
  limit = 50,
  severity?: string,
  category?: string,
  isAcknowledged?: boolean,
): Promise<PaginatedBackend<BackendAlert>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (severity) params.set('severity', severity);
  if (category) params.set('category', category);
  if (isAcknowledged !== undefined) params.set('is_acknowledged', String(isAcknowledged));
  return api.get<PaginatedBackend<BackendAlert>>(`/api/v1/alerts?${params}`);
}

export interface BackendAlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unacknowledged: number;
  unresolved: number;
}

export async function fetchAlertStats(): Promise<BackendAlertStats> {
  return api.get<BackendAlertStats>('/api/v1/alerts/stats');
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  return api.post<void>(`/api/v1/alerts/${alertId}/acknowledge`);
}

export async function resolveAlert(alertId: string): Promise<void> {
  return api.post<void>(`/api/v1/alerts/${alertId}/resolve`);
}

// ── Software Inventory ───────────────────────────────────────────────────────

export interface BackendSoftwareInventory {
  id: number;
  device_id: string;
  software_name: string;
  version: string | null;
  publisher: string | null;
  install_date: string | null;
  detected_at: string;
}

export async function fetchDeviceSoftware(
  deviceId: string,
  offset = 0,
  limit = 100,
): Promise<PaginatedBackend<BackendSoftwareInventory>> {
  return api.get<PaginatedBackend<BackendSoftwareInventory>>(
    `/api/v1/software/devices/${deviceId}?offset=${offset}&limit=${limit}`,
  );
}

// ── SAM: Software Asset Management ──────────────────────────────────────────

type SamLicense    = import('./types').SamLicense;
type SamSkuAlias   = import('./types').SamSkuAlias;
type Paginated<T>  = import('./types').PaginatedResponse<T>;

export async function fetchSamLicenses(
  skip = 0,
  limit = 50,
  vendor?: string,
): Promise<Paginated<SamLicense>> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (vendor) params.set('vendor', vendor);
  return api.get<Paginated<SamLicense>>(`/api/v1/sam/licenses?${params}`);
}

export async function fetchSamLicense(licenseId: string): Promise<SamLicense> {
  return api.get<SamLicense>(`/api/v1/sam/licenses/${licenseId}`);
}

export async function fetchSamLicenseAliases(licenseId: string): Promise<SamSkuAlias[]> {
  return api.get<SamSkuAlias[]>(`/api/v1/sam/licenses/${licenseId}/aliases`);
}

export async function createSamAlias(
  licenseId: string,
  skuPartNumber: string,
): Promise<SamSkuAlias> {
  return api.post<SamSkuAlias>(`/api/v1/sam/licenses/${licenseId}/aliases`, {
    sku_part_number: skuPartNumber,
  });
}

export async function updateSamAlias(
  aliasId: string,
  skuPartNumber: string,
): Promise<SamSkuAlias> {
  return api.patch<SamSkuAlias>(`/api/v1/sam/sku-aliases/${aliasId}`, {
    sku_part_number: skuPartNumber,
  });
}

export async function deleteSamAlias(aliasId: string): Promise<void> {
  return api.delete<void>(`/api/v1/sam/sku-aliases/${aliasId}`);
}

// ── Procurement ──────────────────────────────────────────────────────────────

export interface BackendProcurementCreate {
  item_name: string;
  category: 'hardware' | 'software' | 'service' | 'consumable';
  quantity: number;
  unit_price: number;
  department: string;
  purpose: string;
}

export interface BackendProcurementResponse {
  id: string;
  request_number: string;
  item_name: string;
  category: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  requester_id: string;
  department: string;
  purpose: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function createProcurementRequest(
  data: BackendProcurementCreate,
): Promise<BackendProcurementResponse> {
  return api.post<BackendProcurementResponse>('/api/v1/procurement', data);
}

export async function submitProcurementRequest(id: string): Promise<BackendProcurementResponse> {
  return api.post<BackendProcurementResponse>(`/api/v1/procurement/${id}/submit`);
}

export async function fetchProcurementList(
  skip = 0,
  limit = 50,
  status?: string,
  department?: string,
): Promise<PaginatedBackend<BackendProcurementResponse>> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (status) params.set('status', status);
  if (department) params.set('department', department);
  return api.get<PaginatedBackend<BackendProcurementResponse>>(`/api/v1/procurement?${params}`);
}

export async function approveProcurementRequest(id: string): Promise<BackendProcurementResponse> {
  return api.post<BackendProcurementResponse>(`/api/v1/procurement/${id}/approve`);
}

export async function rejectProcurementRequest(id: string): Promise<BackendProcurementResponse> {
  return api.post<BackendProcurementResponse>(`/api/v1/procurement/${id}/reject`);
}
