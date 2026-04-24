import type { ApiResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
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

// Convenience functions
export async function fetchDashboardStats() {
  return api.get<ApiResponse<import('./types').DashboardStats>>('/api/v1/dashboard/stats');
}

export async function fetchDevices(page = 1, perPage = 20) {
  return api.get<ApiResponse<import('./types').Device[]>>(
    `/api/v1/devices?page=${page}&per_page=${perPage}`
  );
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

export async function fetchAlerts(page = 1, perPage = 20) {
  return api.get<ApiResponse<import('./types').Alert[]>>(
    `/api/v1/alerts?page=${page}&per_page=${perPage}`
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
