/**
 * Type guard and schema validation tests for lib/types.ts
 * Ensures all exported interfaces satisfy their structural contracts.
 */
import { describe, it, expect } from 'vitest';
import type {
  Device,
  License,
  ProcurementRequest,
  User,
  Alert,
  ApiResponse,
  DashboardStats,
} from '../lib/types';

// ---------------------------------------------------------------------------
// Helper: creates objects that satisfy each interface (compile-time checked)
// ---------------------------------------------------------------------------

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'dev-001',
    hostname: 'pc-001',
    ipAddress: '192.168.1.1',
    macAddress: '00:1A:2B:3C:4D:5E',
    osName: 'Windows 11',
    osVersion: '22H2',
    manufacturer: 'Dell',
    model: 'Latitude 5520',
    serialNumber: 'SN123456',
    status: 'active',
    department: 'Engineering',
    assignedUser: 'user-001',
    lastSeen: '2026-04-08T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-08T00:00:00Z',
    ...overrides,
  };
}

function makeLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'lic-001',
    softwareName: 'Microsoft Office 365',
    vendor: 'Microsoft',
    licenseType: 'subscription',
    licenseKey: 'XXXX-XXXX-XXXX-XXXX',
    totalQuantity: 100,
    usedQuantity: 80,
    expirationDate: '2027-01-01',
    cost: 1200.0,
    currency: 'JPY',
    status: 'compliant',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-08T00:00:00Z',
    ...overrides,
  };
}

function makeProcurement(overrides: Partial<ProcurementRequest> = {}): ProcurementRequest {
  return {
    id: 'proc-001',
    title: 'New laptops for engineering',
    description: '10 laptops needed for new hires',
    requesterId: 'user-001',
    requesterName: 'Taro Yamada',
    department: 'Engineering',
    category: 'hardware',
    estimatedCost: 1500000,
    currency: 'JPY',
    priority: 'high',
    status: 'submitted',
    approverIds: ['mgr-001', 'mgr-002'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-08T00:00:00Z',
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-001',
    email: 'taro@example.com',
    name: 'Taro Yamada',
    department: 'Engineering',
    role: 'operator',
    avatarUrl: null,
    lastLogin: '2026-04-08T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-001',
    type: 'security',
    severity: 'critical',
    title: 'Unauthorized access attempt',
    message: 'Failed login from unknown IP',
    source: 'firewall',
    acknowledged: false,
    createdAt: '2026-04-08T00:00:00Z',
    ...overrides,
  };
}

function makeDashboardStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    totalDevices: 250,
    activeAlerts: 5,
    licenseComplianceRate: 98.5,
    pendingProcurements: 3,
    devicesTrend: 2,
    alertsTrend: -1,
    complianceTrend: 0.5,
    procurementsTrend: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------
describe('Device type', () => {
  it('accepts all valid status values', () => {
    const statuses: Device['status'][] = ['active', 'inactive', 'maintenance', 'retired'];
    statuses.forEach(status => {
      const d = makeDevice({ status });
      expect(d.status).toBe(status);
    });
  });

  it('allows assignedUser to be null', () => {
    const d = makeDevice({ assignedUser: null });
    expect(d.assignedUser).toBeNull();
  });

  it('has all required string fields', () => {
    const d = makeDevice();
    for (const key of ['id', 'hostname', 'ipAddress', 'macAddress', 'osName', 'osVersion',
      'manufacturer', 'model', 'serialNumber', 'department', 'lastSeen', 'createdAt', 'updatedAt']) {
      expect(typeof d[key as keyof Device]).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------
describe('License type', () => {
  it('accepts all valid licenseType values', () => {
    const types: License['licenseType'][] = ['perpetual', 'subscription', 'oem', 'volume', 'site'];
    types.forEach(licenseType => {
      const l = makeLicense({ licenseType });
      expect(l.licenseType).toBe(licenseType);
    });
  });

  it('accepts all valid status values', () => {
    const statuses: License['status'][] = ['compliant', 'over-deployed', 'under-utilized', 'expired'];
    statuses.forEach(status => {
      const l = makeLicense({ status });
      expect(l.status).toBe(status);
    });
  });

  it('allows expirationDate to be null', () => {
    const l = makeLicense({ expirationDate: null });
    expect(l.expirationDate).toBeNull();
  });

  it('has numeric quantity fields', () => {
    const l = makeLicense({ totalQuantity: 50, usedQuantity: 25 });
    expect(l.totalQuantity).toBe(50);
    expect(l.usedQuantity).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// ProcurementRequest
// ---------------------------------------------------------------------------
describe('ProcurementRequest type', () => {
  it('accepts all valid category values', () => {
    const categories: ProcurementRequest['category'][] = ['hardware', 'software', 'service', 'other'];
    categories.forEach(category => {
      const p = makeProcurement({ category });
      expect(p.category).toBe(category);
    });
  });

  it('accepts all valid priority values', () => {
    const priorities: ProcurementRequest['priority'][] = ['low', 'medium', 'high', 'urgent'];
    priorities.forEach(priority => {
      const p = makeProcurement({ priority });
      expect(p.priority).toBe(priority);
    });
  });

  it('accepts all valid status values', () => {
    const statuses: ProcurementRequest['status'][] = [
      'draft', 'submitted', 'approved', 'rejected', 'ordered', 'delivered', 'completed',
    ];
    statuses.forEach(status => {
      const p = makeProcurement({ status });
      expect(p.status).toBe(status);
    });
  });

  it('accepts multiple approver IDs', () => {
    const p = makeProcurement({ approverIds: ['mgr-001', 'mgr-002', 'mgr-003'] });
    expect(p.approverIds).toHaveLength(3);
  });

  it('accepts empty approver IDs for draft', () => {
    const p = makeProcurement({ approverIds: [], status: 'draft' });
    expect(p.approverIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
describe('User type', () => {
  it('accepts all valid role values', () => {
    const roles: User['role'][] = ['admin', 'manager', 'operator', 'viewer'];
    roles.forEach(role => {
      const u = makeUser({ role });
      expect(u.role).toBe(role);
    });
  });

  it('allows avatarUrl to be null', () => {
    const u = makeUser({ avatarUrl: null });
    expect(u.avatarUrl).toBeNull();
  });

  it('allows lastLogin to be null for new users', () => {
    const u = makeUser({ lastLogin: null });
    expect(u.lastLogin).toBeNull();
  });

  it('stores email as string', () => {
    const u = makeUser({ email: 'admin@aegis.example.com' });
    expect(u.email).toBe('admin@aegis.example.com');
  });
});

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------
describe('Alert type', () => {
  it('accepts all valid type values', () => {
    const types: Alert['type'][] = ['security', 'compliance', 'performance', 'inventory'];
    types.forEach(type => {
      const a = makeAlert({ type });
      expect(a.type).toBe(type);
    });
  });

  it('accepts all valid severity values', () => {
    const severities: Alert['severity'][] = ['critical', 'warning', 'info'];
    severities.forEach(severity => {
      const a = makeAlert({ severity });
      expect(a.severity).toBe(severity);
    });
  });

  it('defaults to unacknowledged', () => {
    const a = makeAlert({ acknowledged: false });
    expect(a.acknowledged).toBe(false);
  });

  it('can be acknowledged', () => {
    const a = makeAlert({ acknowledged: true });
    expect(a.acknowledged).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ApiResponse<T>
// ---------------------------------------------------------------------------
describe('ApiResponse<T> type', () => {
  it('wraps data correctly', () => {
    const response: ApiResponse<Device> = { data: makeDevice() };
    expect(response.data.id).toBe('dev-001');
  });

  it('supports optional meta field', () => {
    const response: ApiResponse<Device[]> = {
      data: [makeDevice()],
      meta: { total: 1, page: 1, perPage: 20, totalPages: 1 },
    };
    expect(response.meta?.total).toBe(1);
    expect(response.meta?.totalPages).toBe(1);
  });

  it('works without meta field', () => {
    const response: ApiResponse<string> = { data: 'hello' };
    expect(response.meta).toBeUndefined();
  });

  it('supports generic list response', () => {
    const devices = [makeDevice({ id: 'dev-001' }), makeDevice({ id: 'dev-002' })];
    const response: ApiResponse<Device[]> = {
      data: devices,
      meta: { total: 2, page: 1, perPage: 20, totalPages: 1 },
    };
    expect(response.data).toHaveLength(2);
    expect(response.data[0].id).toBe('dev-001');
  });
});

// ---------------------------------------------------------------------------
// DashboardStats
// ---------------------------------------------------------------------------
describe('DashboardStats type', () => {
  it('has all required numeric fields', () => {
    const stats = makeDashboardStats();
    for (const key of [
      'totalDevices', 'activeAlerts', 'licenseComplianceRate', 'pendingProcurements',
      'devicesTrend', 'alertsTrend', 'complianceTrend', 'procurementsTrend',
    ]) {
      expect(typeof stats[key as keyof DashboardStats]).toBe('number');
    }
  });

  it('supports zero values', () => {
    const stats = makeDashboardStats({
      activeAlerts: 0,
      pendingProcurements: 0,
    });
    expect(stats.activeAlerts).toBe(0);
    expect(stats.pendingProcurements).toBe(0);
  });

  it('supports negative trend values', () => {
    const stats = makeDashboardStats({ alertsTrend: -5, complianceTrend: -2.5 });
    expect(stats.alertsTrend).toBeLessThan(0);
    expect(stats.complianceTrend).toBeLessThan(0);
  });

  it('complianceRate can be 100 (fully compliant)', () => {
    const stats = makeDashboardStats({ licenseComplianceRate: 100 });
    expect(stats.licenseComplianceRate).toBe(100);
  });
});
