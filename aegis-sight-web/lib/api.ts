import type {
  ApiResponse,
  PaginatedResponse,
  DashboardStats,
  Device,
  License,
  ProcurementRequest,
  Alert,
  SecurityOverview,
  LogonEvent,
  UsbEvent,
  FileEvent,
  SoftwareInventory,
  ComplianceCheck,
  LogFilters,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Toast通知用のイベント（アプリ側でリスナーを登録） */
export type ToastEvent = {
  type: 'error' | 'warning' | 'info';
  message: string;
};

const toastListeners: ((event: ToastEvent) => void)[] = [];

export function onToast(listener: (event: ToastEvent) => void) {
  toastListeners.push(listener);
  return () => {
    const idx = toastListeners.indexOf(listener);
    if (idx >= 0) toastListeners.splice(idx, 1);
  };
}

function emitToast(event: ToastEvent) {
  toastListeners.forEach((fn) => fn(event));
}

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

      // 401: 認証エラー -> ログインページへリダイレクト
      if (response.status === 401) {
        this.clearToken();
        if (typeof window !== 'undefined') {
          emitToast({ type: 'warning', message: 'セッションが期限切れです。再ログインしてください。' });
          window.location.href = '/';
        }
        throw new ApiError(401, 'Unauthorized');
      }

      // 403: 権限不足
      if (response.status === 403) {
        emitToast({ type: 'error', message: 'この操作を実行する権限がありません。' });
        throw new ApiError(403, error.message || 'Forbidden');
      }

      // 500+: サーバーエラー -> トースト通知
      if (response.status >= 500) {
        emitToast({ type: 'error', message: 'サーバーエラーが発生しました。しばらく後に再試行してください。' });
        throw new ApiError(response.status, error.message || 'Internal Server Error');
      }

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

// --- クエリパラメータヘルパー ---
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// --- ダッシュボード ---
export async function fetchDashboardStats() {
  return api.get<ApiResponse<DashboardStats>>('/api/v1/dashboard/stats');
}

// --- アラート ---
export async function fetchAlerts(page = 1, perPage = 20) {
  return api.get<PaginatedResponse<Alert>>(
    `/api/v1/alerts${buildQuery({ page, per_page: perPage })}`
  );
}

// --- デバイス ---
export async function fetchDevices(page = 1, perPage = 20, filters?: { search?: string; status?: string; department?: string }) {
  return api.get<PaginatedResponse<Device>>(
    `/api/v1/devices${buildQuery({ page, per_page: perPage, search: filters?.search, status: filters?.status, department: filters?.department })}`
  );
}

export async function fetchDevice(id: string) {
  return api.get<ApiResponse<Device>>(`/api/v1/devices/${encodeURIComponent(id)}`);
}

// --- ライセンス ---
export async function fetchLicenses(page = 1, perPage = 20) {
  return api.get<PaginatedResponse<License>>(
    `/api/v1/licenses${buildQuery({ page, per_page: perPage })}`
  );
}

export async function fetchLicenseCompliance() {
  return api.get<ApiResponse<ComplianceCheck[]>>('/api/v1/licenses/compliance');
}

// --- 調達 ---
export async function fetchProcurements(page = 1, perPage = 20) {
  return api.get<PaginatedResponse<ProcurementRequest>>(
    `/api/v1/procurement${buildQuery({ page, per_page: perPage })}`
  );
}

export async function createProcurement(data: Omit<ProcurementRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
  return api.post<ApiResponse<ProcurementRequest>>('/api/v1/procurement', data);
}

// --- セキュリティ ---
export async function fetchSecurityOverview() {
  return api.get<ApiResponse<SecurityOverview>>('/api/v1/security/overview');
}

// --- ログ ---
export async function fetchLogs(type: 'logon' | 'usb' | 'file', filters?: LogFilters) {
  const params = buildQuery({
    page: filters?.page,
    per_page: filters?.perPage,
    start_date: filters?.startDate,
    end_date: filters?.endDate,
    user_name: filters?.userName,
    hostname: filters?.hostname,
    status: filters?.status,
  });

  switch (type) {
    case 'logon':
      return api.get<PaginatedResponse<LogonEvent>>(`/api/v1/logs/logon${params}`);
    case 'usb':
      return api.get<PaginatedResponse<UsbEvent>>(`/api/v1/logs/usb${params}`);
    case 'file':
      return api.get<PaginatedResponse<FileEvent>>(`/api/v1/logs/file${params}`);
  }
}

// --- ソフトウェア ---
export async function fetchSoftware(page = 1, perPage = 20, search?: string) {
  return api.get<PaginatedResponse<SoftwareInventory>>(
    `/api/v1/software${buildQuery({ page, per_page: perPage, search })}`
  );
}
