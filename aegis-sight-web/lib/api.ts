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

export async function fetchProcurementById(id: string): Promise<BackendProcurementResponse> {
  return api.get<BackendProcurementResponse>(`/api/v1/procurement/${id}`);
}

export async function orderProcurementRequest(id: string): Promise<BackendProcurementResponse> {
  return api.post<BackendProcurementResponse>(`/api/v1/procurement/${id}/order`);
}

export async function receiveProcurementRequest(id: string): Promise<BackendProcurementResponse> {
  return api.post<BackendProcurementResponse>(`/api/v1/procurement/${id}/receive`);
}

// ── Security Overview ────────────────────────────────────────────────────────

export interface BackendDefenderSummary {
  enabled_count: number;
  disabled_count: number;
  enabled_percentage: number;
}

export interface BackendBitLockerSummary {
  enabled_count: number;
  disabled_count: number;
  enabled_percentage: number;
}

export interface BackendPatchSummary {
  total_pending: number;
  devices_with_pending: number;
  devices_fully_patched: number;
}

export interface BackendSecurityOverview {
  total_devices_with_status: number;
  defender: BackendDefenderSummary;
  bitlocker: BackendBitLockerSummary;
  patches: BackendPatchSummary;
}

export async function fetchSecurityOverview(): Promise<BackendSecurityOverview> {
  return api.get<BackendSecurityOverview>('/api/v1/security/overview');
}

// ── Users ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'operator' | 'auditor' | 'readonly';

export interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export async function fetchUsers(
  skip = 0,
  limit = 50,
  role?: UserRole,
  isActive?: boolean,
): Promise<PaginatedBackend<BackendUser>> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (role) params.set('role', role);
  if (isActive !== undefined) params.set('is_active', String(isActive));
  return api.get<PaginatedBackend<BackendUser>>(`/api/v1/users?${params}`);
}

export async function updateUser(
  userId: string,
  data: { full_name?: string; role?: UserRole; is_active?: boolean },
): Promise<BackendUser> {
  return api.patch<BackendUser>(`/api/v1/users/${userId}`, data);
}

// ── Audit Logs ───────────────────────────────────────────────────────────────

export interface BackendAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  detail: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export async function fetchAuditLogs(
  offset = 0,
  limit = 50,
  action?: string,
  resourceType?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<PaginatedBackend<BackendAuditLog>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (action) params.set('action', action);
  if (resourceType) params.set('resource_type', resourceType);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  return api.get<PaginatedBackend<BackendAuditLog>>(`/api/v1/audit/logs?${params}`);
}

// ── Compliance ────────────────────────────────────────────────────────────────

export interface BackendISO27001Category {
  name: string;
  score: number;
  max_score: number;
  status: string;
}

export interface BackendISO27001Response {
  overall_score: number;
  categories: BackendISO27001Category[];
  last_assessment: string;
  next_review: string;
}

export interface BackendJSOXControl {
  area: string;
  status: string;
  findings: number;
  remediation_progress: number;
}

export interface BackendJSOXResponse {
  overall_status: string;
  controls: BackendJSOXControl[];
  audit_period: string;
  last_tested: string;
}

export interface BackendNISTFunction {
  function: string;
  tier: number;
  target_tier: number;
  score: number;
  max_score: number;
}

export interface BackendNISTResponse {
  overall_tier: number;
  functions: BackendNISTFunction[];
  last_assessment: string;
}

export interface BackendComplianceIssue {
  id: string;
  framework: string;
  severity: string;
  title: string;
  status: string;
  due_date: string | null;
}

export interface BackendComplianceAuditEvent {
  timestamp: string;
  event_type: string;
  description: string;
  actor: string;
}

export interface BackendComplianceOverview {
  iso27001_score: number;
  jsox_status: string;
  nist_tier: number;
  open_issues: number;
  recent_events: BackendComplianceAuditEvent[];
  issues: BackendComplianceIssue[];
}

export async function fetchComplianceOverview(): Promise<BackendComplianceOverview> {
  return api.get<BackendComplianceOverview>('/api/v1/compliance/overview');
}

export async function fetchComplianceISO27001(): Promise<BackendISO27001Response> {
  return api.get<BackendISO27001Response>('/api/v1/compliance/iso27001');
}

export async function fetchComplianceJSOX(): Promise<BackendJSOXResponse> {
  return api.get<BackendJSOXResponse>('/api/v1/compliance/jsox');
}

export async function fetchComplianceNIST(): Promise<BackendNISTResponse> {
  return api.get<BackendNISTResponse>('/api/v1/compliance/nist');
}

// ── Patches ──────────────────────────────────────────────────────────────────

export interface BackendPatchComplianceSummary {
  total_devices: number;
  total_updates: number;
  fully_patched_devices: number;
  compliance_rate: number;
  critical_missing: number;
  important_missing: number;
  moderate_missing: number;
  low_missing: number;
}

export interface BackendMissingPatchEntry {
  update_id: string;
  kb_number: string;
  title: string;
  severity: string;
  release_date: string;
  missing_device_count: number;
}

export interface BackendVulnerability {
  id: string;
  cve_id: string;
  title: string;
  severity: string;
  cvss_score: number;
  affected_software: Record<string, unknown> | null;
  remediation: string | null;
  published_at: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export async function fetchPatchCompliance(): Promise<BackendPatchComplianceSummary> {
  return api.get<BackendPatchComplianceSummary>('/api/v1/patches/compliance');
}

export async function fetchMissingPatches(limit = 50): Promise<BackendMissingPatchEntry[]> {
  return api.get<BackendMissingPatchEntry[]>(`/api/v1/patches/missing?limit=${limit}`);
}

export async function fetchVulnerabilities(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendVulnerability>> {
  return api.get<PaginatedBackend<BackendVulnerability>>(
    `/api/v1/patches/vulnerabilities?offset=${offset}&limit=${limit}`,
  );
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export interface BackendIncidentStats {
  total: number;
  p1_critical: number;
  p2_high: number;
  p3_medium: number;
  p4_low: number;
  open_incidents: number;
  resolved_incidents: number;
  mttr_hours: number | null;
}

export interface BackendIncidentResponse {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  category: string;
  affected_devices: string[] | null;
  assigned_to: string | null;
  reported_by: string;
  timeline: Record<string, unknown>[] | null;
  root_cause: string | null;
  resolution: string | null;
  lessons_learned: string | null;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
}

export interface BackendThreatIndicator {
  id: string;
  indicator_type: string;
  value: string;
  threat_level: string;
  source: string;
  description: string;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
  related_incidents: string[] | null;
}

export async function fetchIncidentStats(): Promise<BackendIncidentStats> {
  return api.get<BackendIncidentStats>('/api/v1/incidents/stats');
}

export async function fetchIncidents(
  offset = 0,
  limit = 50,
  severity?: string,
  status?: string,
  category?: string,
): Promise<PaginatedBackend<BackendIncidentResponse>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (severity) params.set('severity', severity);
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  return api.get<PaginatedBackend<BackendIncidentResponse>>(`/api/v1/incidents?${params}`);
}

export async function createIncident(data: {
  title: string;
  description: string;
  severity: string;
  category: string;
  affected_devices?: string[];
  detected_at?: string;
}): Promise<BackendIncidentResponse> {
  return api.post<BackendIncidentResponse>('/api/v1/incidents', data);
}

export async function fetchThreatIndicators(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendThreatIndicator>> {
  return api.get<PaginatedBackend<BackendThreatIndicator>>(
    `/api/v1/incidents/threats?offset=${offset}&limit=${limit}`,
  );
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface BackendSessionResponse {
  id: string;
  device_id: string | null;
  user_name: string;
  session_type: string;
  source_ip: string | null;
  source_hostname: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_active: boolean;
}

export interface BackendSessionAnalytics {
  total_sessions: number;
  active_sessions: number;
  by_type: Record<string, number>;
  by_user: { user_name: string; session_count: number; total_minutes: number }[];
  peak_hours: { hour: number; count: number }[];
}

export interface BackendActivityResponse {
  id: string;
  device_id: string | null;
  user_name: string;
  activity_type: string;
  detail: Record<string, unknown> | null;
  occurred_at: string;
}

export async function fetchSessions(
  offset = 0,
  limit = 50,
  isActive?: boolean,
): Promise<PaginatedBackend<BackendSessionResponse>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (isActive !== undefined) params.set('is_active', String(isActive));
  return api.get<PaginatedBackend<BackendSessionResponse>>(`/api/v1/sessions?${params}`);
}

export async function fetchActiveSessions(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendSessionResponse>> {
  return api.get<PaginatedBackend<BackendSessionResponse>>(
    `/api/v1/sessions/active?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchSessionAnalytics(): Promise<BackendSessionAnalytics> {
  return api.get<BackendSessionAnalytics>('/api/v1/sessions/analytics');
}

export async function fetchActivities(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendActivityResponse>> {
  return api.get<PaginatedBackend<BackendActivityResponse>>(
    `/api/v1/sessions/activities?offset=${offset}&limit=${limit}`,
  );
}

// ── DLP ───────────────────────────────────────────────────────────────────────

export interface BackendDLPRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  pattern: string;
  action: string;
  severity: string;
  is_enabled: boolean;
  created_at: string;
}

export interface BackendDLPEvent {
  id: string;
  rule_id: string;
  device_id: string | null;
  user_name: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  action_taken: string;
  matched_pattern: string;
  detected_at: string;
}

export interface BackendDLPEventSummary {
  total_events: number;
  blocked: number;
  alerted: number;
  logged: number;
  by_severity: Record<string, number>;
  by_rule_type: Record<string, number>;
}

export async function fetchDLPEventSummary(): Promise<BackendDLPEventSummary> {
  return api.get<BackendDLPEventSummary>('/api/v1/dlp/events/summary');
}

export async function fetchDLPEvents(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendDLPEvent>> {
  return api.get<PaginatedBackend<BackendDLPEvent>>(
    `/api/v1/dlp/events?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchDLPRules(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendDLPRule>> {
  return api.get<PaginatedBackend<BackendDLPRule>>(
    `/api/v1/dlp/rules?offset=${offset}&limit=${limit}`,
  );
}

export async function createDLPRule(data: {
  name: string;
  rule_type: string;
  pattern: string;
  action: string;
  severity: string;
  description?: string;
  is_enabled?: boolean;
}): Promise<BackendDLPRule> {
  return api.post<BackendDLPRule>('/api/v1/dlp/rules', data);
}

export async function updateDLPRule(
  ruleId: string,
  data: Partial<{ name: string; description: string; pattern: string; action: string; severity: string; is_enabled: boolean }>,
): Promise<BackendDLPRule> {
  return api.patch<BackendDLPRule>(`/api/v1/dlp/rules/${ruleId}`, data);
}

export async function deleteDLPRule(ruleId: string): Promise<void> {
  return api.delete<void>(`/api/v1/dlp/rules/${ruleId}`);
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export interface BackendKBArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[] | null;
  status: string;
  author_id: string | null;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface BackendKBCategory {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  sort_order: number;
  parent_id: string | null;
  article_count: number;
}

export async function fetchKBArticles(
  offset = 0,
  limit = 50,
  category?: string,
  status?: string,
): Promise<PaginatedBackend<BackendKBArticle>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  return api.get<PaginatedBackend<BackendKBArticle>>(`/api/v1/knowledge/articles?${params}`);
}

export async function fetchKBCategories(): Promise<BackendKBCategory[]> {
  return api.get<BackendKBCategory[]>('/api/v1/knowledge/categories');
}

export async function fetchKBPopular(limit = 10): Promise<BackendKBArticle[]> {
  return api.get<BackendKBArticle[]>(`/api/v1/knowledge/popular?limit=${limit}`);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface BackendNotificationChannel {
  id: string;
  name: string;
  channel_type: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendNotificationRule {
  id: string;
  name: string;
  event_type: string;
  channel_id: string;
  conditions: Record<string, unknown> | null;
  is_enabled: boolean;
  created_at: string;
}

export interface BackendNotificationChannelTestResult {
  success: boolean;
  message: string;
}

export async function fetchNotificationChannels(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendNotificationChannel>> {
  return api.get<PaginatedBackend<BackendNotificationChannel>>(
    `/api/v1/notifications/channels?offset=${offset}&limit=${limit}`,
  );
}

export async function createNotificationChannel(data: {
  name: string;
  channel_type: string;
  config: Record<string, unknown>;
  is_enabled?: boolean;
}): Promise<BackendNotificationChannel> {
  return api.post<BackendNotificationChannel>('/api/v1/notifications/channels', data);
}

export async function updateNotificationChannel(
  channelId: string,
  data: Partial<{ name: string; config: Record<string, unknown>; is_enabled: boolean }>,
): Promise<BackendNotificationChannel> {
  return api.patch<BackendNotificationChannel>(`/api/v1/notifications/channels/${channelId}`, data);
}

export async function deleteNotificationChannel(channelId: string): Promise<void> {
  return api.delete<void>(`/api/v1/notifications/channels/${channelId}`);
}

export async function testNotificationChannel(
  channelId: string,
): Promise<BackendNotificationChannelTestResult> {
  return api.post<BackendNotificationChannelTestResult>(
    `/api/v1/notifications/channels/${channelId}/test`,
  );
}

export async function fetchNotificationRules(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendNotificationRule>> {
  return api.get<PaginatedBackend<BackendNotificationRule>>(
    `/api/v1/notifications/rules?offset=${offset}&limit=${limit}`,
  );
}

export async function createNotificationRule(data: {
  name: string;
  event_type: string;
  channel_id: string;
  conditions?: Record<string, unknown>;
  is_enabled?: boolean;
}): Promise<BackendNotificationRule> {
  return api.post<BackendNotificationRule>('/api/v1/notifications/rules', data);
}

export async function deleteNotificationRule(ruleId: string): Promise<void> {
  return api.delete<void>(`/api/v1/notifications/rules/${ruleId}`);
}

// ── Policies ──────────────────────────────────────────────────────────────────

export interface BackendDevicePolicy {
  id: string;
  name: string;
  description: string | null;
  policy_type: string;
  rules: Record<string, unknown> | null;
  target_groups: unknown[] | null;
  is_enabled: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendPolicyViolation {
  id: string;
  policy_id: string;
  device_id: string;
  violation_type: string;
  detail: Record<string, unknown> | null;
  detected_at: string;
  resolved_at: string | null;
  is_resolved: boolean;
}

export interface BackendPolicyComplianceSummary {
  total_policies: number;
  enabled_policies: number;
  total_violations: number;
  unresolved_violations: number;
  compliance_rate: number;
  by_type: Record<string, number>;
}

export async function fetchPolicies(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendDevicePolicy>> {
  return api.get<PaginatedBackend<BackendDevicePolicy>>(
    `/api/v1/policies?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchPolicyViolations(
  offset = 0,
  limit = 50,
  isResolved?: boolean,
): Promise<PaginatedBackend<BackendPolicyViolation>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (isResolved !== undefined) params.set('is_resolved', String(isResolved));
  return api.get<PaginatedBackend<BackendPolicyViolation>>(`/api/v1/policies/violations?${params}`);
}

export async function fetchPolicyCompliance(): Promise<BackendPolicyComplianceSummary> {
  return api.get<BackendPolicyComplianceSummary>('/api/v1/policies/compliance');
}

export async function createPolicy(data: {
  name: string;
  policy_type: string;
  description?: string;
  rules?: Record<string, unknown>;
  is_enabled?: boolean;
  priority?: number;
}): Promise<BackendDevicePolicy> {
  return api.post<BackendDevicePolicy>('/api/v1/policies', data);
}

export async function updatePolicy(
  policyId: string,
  data: Partial<{ name: string; description: string; is_enabled: boolean; priority: number }>,
): Promise<BackendDevicePolicy> {
  return api.patch<BackendDevicePolicy>(`/api/v1/policies/${policyId}`, data);
}

export async function deletePolicy(policyId: string): Promise<void> {
  return api.delete<void>(`/api/v1/policies/${policyId}`);
}

// ── Printing ──────────────────────────────────────────────────────────────────

export interface BackendPrinter {
  id: string;
  name: string;
  location: string;
  ip_address: string | null;
  model: string;
  is_network: boolean;
  is_active: boolean;
  department: string | null;
  created_at: string;
}

export interface BackendPrintJob {
  id: string;
  printer_id: string;
  device_id: string | null;
  user_name: string;
  document_name: string;
  pages: number;
  copies: number;
  color: boolean;
  duplex: boolean;
  paper_size: string;
  status: string;
  printed_at: string;
}

export interface BackendPrintStats {
  total_pages: number;
  total_jobs: number;
  color_ratio: number;
  by_user: { user_name: string; total_pages: number }[];
  by_printer: { printer_id: string; printer_name: string; total_pages: number }[];
  by_department: { department: string; total_pages: number }[];
  monthly_trend: { month: string; total_pages: number }[];
}

export interface BackendPrintPolicy {
  id: string;
  name: string;
  description: string | null;
  max_pages_per_day: number | null;
  max_pages_per_month: number | null;
  allow_color: boolean;
  allow_duplex_only: boolean;
  target_departments: string[] | null;
  is_enabled: boolean;
  created_at: string;
}

export async function fetchPrinters(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendPrinter>> {
  return api.get<PaginatedBackend<BackendPrinter>>(
    `/api/v1/printing/printers?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchPrintJobs(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendPrintJob>> {
  return api.get<PaginatedBackend<BackendPrintJob>>(
    `/api/v1/printing/jobs?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchPrintStats(): Promise<BackendPrintStats> {
  return api.get<BackendPrintStats>('/api/v1/printing/stats');
}

export async function fetchPrintPolicies(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendPrintPolicy>> {
  return api.get<PaginatedBackend<BackendPrintPolicy>>(
    `/api/v1/printing/policies?offset=${offset}&limit=${limit}`,
  );
}

// ── Remote Work ───────────────────────────────────────────────────────────────

export interface BackendVPNConnection {
  id: string;
  device_id: string | null;
  user_name: string;
  vpn_server: string;
  client_ip: string;
  assigned_ip: string;
  protocol: string;
  connected_at: string;
  disconnected_at: string | null;
  duration_minutes: number | null;
  bytes_sent: number | null;
  bytes_received: number | null;
  is_active: boolean;
}

export interface BackendRemoteWorkAnalytics {
  total_connections: number;
  active_connections: number;
  by_protocol: Record<string, number>;
  total_bytes_sent: number;
  total_bytes_received: number;
  peak_hours: { hour: number; count: number }[];
  utilization_rate: number;
  top_users: { user_name: string; connection_count: number; total_minutes: number }[];
}

export interface BackendRemoteAccessPolicy {
  id: string;
  name: string;
  allowed_hours_start: string;
  allowed_hours_end: string;
  allowed_days: string[];
  require_mfa: boolean;
  max_session_hours: number;
  geo_restriction: Record<string, unknown> | null;
  is_enabled: boolean;
  created_at: string;
}

export async function fetchActiveVPN(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendVPNConnection>> {
  return api.get<PaginatedBackend<BackendVPNConnection>>(
    `/api/v1/remote/vpn/active?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchVPNConnections(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendVPNConnection>> {
  return api.get<PaginatedBackend<BackendVPNConnection>>(
    `/api/v1/remote/vpn?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchRemoteWorkAnalytics(): Promise<BackendRemoteWorkAnalytics> {
  return api.get<BackendRemoteWorkAnalytics>('/api/v1/remote/analytics');
}

export async function fetchRemoteAccessPolicies(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendRemoteAccessPolicy>> {
  return api.get<PaginatedBackend<BackendRemoteAccessPolicy>>(
    `/api/v1/remote/policies?offset=${offset}&limit=${limit}`,
  );
}

// ── Network Devices ───────────────────────────────────────────────────────────

export interface BackendNetworkDevice {
  id: string;
  ip_address: string;
  mac_address: string;
  hostname: string | null;
  device_type: string;
  is_managed: boolean;
  first_seen: string;
  last_seen: string;
  device_id: string | null;
}

export async function fetchNetworkDevices(
  offset = 0,
  limit = 50,
  isManaged?: boolean,
): Promise<PaginatedBackend<BackendNetworkDevice>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (isManaged !== undefined) params.set('is_managed', String(isManaged));
  return api.get<PaginatedBackend<BackendNetworkDevice>>(`/api/v1/network/devices?${params}`);
}

// ── Asset Lifecycle ───────────────────────────────────────────────────────────

export interface BackendDisposalRequest {
  id: string;
  device_id: string;
  reason: string;
  method: string;
  requested_by: string | null;
  approved_by: string | null;
  status: string;
  certificate_path: string | null;
  certificate_number: string | null;
  disposal_date: string | null;
  created_at: string;
}

export interface BackendLifecycleSummary {
  procured: number;
  deployed: number;
  maintenance: number;
  disposed: number;
  disposal_pending: number;
  disposal_approved: number;
  total_events: number;
}

export async function fetchDisposalRequests(
  offset = 0,
  limit = 50,
  status?: string,
): Promise<PaginatedBackend<BackendDisposalRequest>> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (status) params.set('status', status);
  return api.get<PaginatedBackend<BackendDisposalRequest>>(`/api/v1/lifecycle/disposals?${params}`);
}

export async function fetchLifecycleSummary(): Promise<BackendLifecycleSummary> {
  return api.get<BackendLifecycleSummary>('/api/v1/lifecycle/summary');
}

export async function createDisposalRequest(data: {
  device_id: string;
  reason: string;
  method: string;
}): Promise<BackendDisposalRequest> {
  return api.post<BackendDisposalRequest>('/api/v1/lifecycle/disposals', data);
}

export async function approveDisposalRequest(id: string): Promise<BackendDisposalRequest> {
  return api.post<BackendDisposalRequest>(`/api/v1/lifecycle/disposals/${id}/approve`);
}

// ── SLA ───────────────────────────────────────────────────────────────────────

export interface BackendSLADefinition {
  id: string;
  name: string;
  description: string | null;
  metric_type: string;
  target_value: number;
  unit: string;
  measurement_period: string;
  warning_threshold: number;
  is_active: boolean;
  created_at: string;
}

export interface BackendSLADashboardItem {
  sla_id: string;
  name: string;
  metric_type: string;
  target_value: number;
  current_value: number | null;
  achievement_rate: number | null;
  is_met: boolean | null;
  measurement_period: string;
  total_measurements: number;
  met_count: number;
  violation_count: number;
}

export interface BackendSLADashboard {
  overall_achievement_rate: number | null;
  total_definitions: number;
  active_definitions: number;
  total_violations: number;
  items: BackendSLADashboardItem[];
}

export interface BackendSLAViolation {
  id: string;
  sla_id: string;
  measured_value: number;
  target_value: number;
  deviation: number;
  period_start: string;
  period_end: string;
  is_acknowledged: boolean;
  created_at: string;
}

export async function fetchSLADashboard(): Promise<BackendSLADashboard> {
  return api.get<BackendSLADashboard>('/api/v1/sla/dashboard');
}

export async function fetchSLADefinitions(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendSLADefinition>> {
  return api.get<PaginatedBackend<BackendSLADefinition>>(
    `/api/v1/sla/definitions?offset=${offset}&limit=${limit}`,
  );
}

export async function fetchSLAViolations(
  offset = 0,
  limit = 50,
): Promise<PaginatedBackend<BackendSLAViolation>> {
  return api.get<PaginatedBackend<BackendSLAViolation>>(
    `/api/v1/sla/violations?offset=${offset}&limit=${limit}`,
  );
}

// ── SAM Compliance & Reports ──────────────────────────────────────────────────

export interface BackendSAMComplianceCheck {
  license_id: string;
  software_name: string;
  purchased_count: number;
  installed_count: number;
  m365_assigned: number;
  total_used: number;
  is_compliant: boolean;
  over_deployed: number;
}

export interface BackendExpiringLicense {
  id: string;
  software_name: string;
  vendor: string;
  license_type: string;
  expiry_date: string;
  days_until_expiry: number;
  purchased_count: number;
  cost_per_unit: number | null;
  currency: string;
  vendor_contract_id: string | null;
}

export async function fetchSAMCompliance(): Promise<BackendSAMComplianceCheck[]> {
  return api.get<BackendSAMComplianceCheck[]>('/api/v1/sam/compliance');
}

export async function fetchExpiringLicenses(daysAhead = 90): Promise<BackendExpiringLicense[]> {
  return api.get<BackendExpiringLicense[]>(
    `/api/v1/sam/licenses/expiring?days_ahead=${daysAhead}`,
  );
}

// ── Reports (CSV download) ────────────────────────────────────────────────────

export async function downloadReport(
  reportType: 'sam' | 'assets' | 'security',
  filename: string,
): Promise<void> {
  let authToken: string | null = null;
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
    if (stored) {
      const parsed = JSON.parse(stored) as { token?: string };
      authToken = parsed.token ?? null;
    }
  } catch {
    // ignore
  }
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE_URL}/api/v1/reports/${reportType}`, { headers });
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
