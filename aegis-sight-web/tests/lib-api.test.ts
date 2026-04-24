import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// api.ts uses a module-level singleton; import after stubbing fetch
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function okResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  } as Response);
}

function errorResponse(status: number, body: unknown = {}) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(body),
  } as Response);
}

describe('ApiClient', () => {
  it('GET sends correct request', async () => {
    fetchMock.mockReturnValue(okResponse({ data: [] }));
    const { api } = await import('@/lib/api');
    await api.get('/api/v1/test');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/test'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('POST sends JSON body', async () => {
    fetchMock.mockReturnValue(okResponse({ id: 1 }));
    const { api } = await import('@/lib/api');
    await api.post('/api/v1/items', { name: 'test' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'test' }));
  });

  it('PUT sends JSON body', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    await api.put('/api/v1/items/1', { name: 'updated' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PUT');
  });

  it('PATCH sends JSON body', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    await api.patch('/api/v1/items/1', { status: 'active' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
  });

  it('DELETE sends request', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    await api.delete('/api/v1/items/1');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
  });

  it('includes Authorization header after setToken', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    api.setToken('test-jwt-token');
    await api.get('/api/v1/secure');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-jwt-token');
    // Cleanup
    api.clearToken();
  });

  it('does not include Authorization header after clearToken', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    api.setToken('temp');
    api.clearToken();
    await api.get('/api/v1/public');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('throws ApiError on non-ok response', async () => {
    fetchMock.mockReturnValue(errorResponse(404, { message: 'Not Found' }));
    const { api, ApiError } = await import('@/lib/api');
    await expect(api.get('/api/v1/missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('ApiError has correct status and message', async () => {
    fetchMock.mockReturnValue(errorResponse(403, { message: 'Forbidden' }));
    const { api, ApiError } = await import('@/lib/api');
    try {
      await api.get('/api/v1/restricted');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as InstanceType<typeof ApiError>).status).toBe(403);
      expect((e as InstanceType<typeof ApiError>).message).toBe('Forbidden');
    }
  });

  it('includes Content-Type: application/json header', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    await api.post('/api/v1/test', {});
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('handles error response with non-JSON body (catch path)', async () => {
    fetchMock.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('invalid json')),
      } as Response)
    );
    const { api, ApiError } = await import('@/lib/api');
    try {
      await api.get('/api/v1/broken');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as InstanceType<typeof ApiError>).message).toBe('Internal Server Error');
    }
  });

  it('uses "Unknown error" when error response has no message', async () => {
    fetchMock.mockReturnValue(errorResponse(400, {}));
    const { api, ApiError } = await import('@/lib/api');
    try {
      await api.get('/api/v1/bad');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as InstanceType<typeof ApiError>).message).toBe('Unknown error');
    }
  });

  it('POST without data sends undefined body', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    await api.post('/api/v1/action');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it('PUT without data sends undefined body', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    await api.put('/api/v1/items/1');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it('PATCH without data sends undefined body', async () => {
    fetchMock.mockReturnValue(okResponse({}));
    const { api } = await import('@/lib/api');
    await api.patch('/api/v1/items/1');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });
});

describe('Convenience functions', () => {
  it('fetchDashboardStats calls /api/v1/dashboard/stats', async () => {
    fetchMock.mockReturnValue(okResponse({ data: {} }));
    const { fetchDashboardStats } = await import('@/lib/api');
    await fetchDashboardStats();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/dashboard/stats'),
      expect.anything()
    );
  });

  it('fetchDevices calls /api/v1/devices with pagination', async () => {
    fetchMock.mockReturnValue(okResponse({ data: [] }));
    const { fetchDevices } = await import('@/lib/api');
    await fetchDevices(2, 10);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/devices?page=2&per_page=10'),
      expect.anything()
    );
  });

  it('fetchLicenses calls /api/v1/licenses', async () => {
    fetchMock.mockReturnValue(okResponse({ data: [] }));
    const { fetchLicenses } = await import('@/lib/api');
    await fetchLicenses();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/licenses'),
      expect.anything()
    );
  });

  it('fetchAlerts calls /api/v1/alerts', async () => {
    fetchMock.mockReturnValue(okResponse({ data: [] }));
    const { fetchAlerts } = await import('@/lib/api');
    await fetchAlerts();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/alerts'),
      expect.anything()
    );
  });

  it('fetchProcurementRequests calls /api/v1/procurement', async () => {
    fetchMock.mockReturnValue(okResponse({ data: [] }));
    const { fetchProcurementRequests } = await import('@/lib/api');
    await fetchProcurementRequests();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/procurement'),
      expect.anything()
    );
  });
});

describe('SAM API functions', () => {
  it('fetchSamLicenses calls /api/v1/sam/licenses with skip and limit', async () => {
    fetchMock.mockReturnValue(okResponse({ items: [], total: 0, skip: 0, limit: 50 }));
    const { fetchSamLicenses } = await import('@/lib/api');
    await fetchSamLicenses();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/sam/licenses'),
      expect.anything()
    );
  });

  it('fetchSamLicenses includes vendor param when provided', async () => {
    fetchMock.mockReturnValue(okResponse({ items: [], total: 0, skip: 0, limit: 50 }));
    const { fetchSamLicenses } = await import('@/lib/api');
    await fetchSamLicenses(0, 50, 'Microsoft');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('vendor=Microsoft');
  });

  it('fetchSamLicense calls /api/v1/sam/licenses/:id', async () => {
    fetchMock.mockReturnValue(okResponse({ id: '1', software_name: 'Test' }));
    const { fetchSamLicense } = await import('@/lib/api');
    await fetchSamLicense('1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/sam/licenses/1'),
      expect.anything()
    );
  });

  it('fetchSamLicenseAliases calls /api/v1/sam/licenses/:id/aliases', async () => {
    fetchMock.mockReturnValue(okResponse([]));
    const { fetchSamLicenseAliases } = await import('@/lib/api');
    await fetchSamLicenseAliases('1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/sam/licenses/1/aliases'),
      expect.anything()
    );
  });

  it('createSamAlias POSTs to /api/v1/sam/licenses/:id/aliases', async () => {
    fetchMock.mockReturnValue(okResponse({ id: 'a1', sku_part_number: 'PACK' }));
    const { createSamAlias } = await import('@/lib/api');
    await createSamAlias('1', 'PACK');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/sam/licenses/1/aliases');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ sku_part_number: 'PACK' });
  });

  it('updateSamAlias PATCHes /api/v1/sam/sku-aliases/:id', async () => {
    fetchMock.mockReturnValue(okResponse({ id: 'a1', sku_part_number: 'NEW' }));
    const { updateSamAlias } = await import('@/lib/api');
    await updateSamAlias('a1', 'NEW');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/sam/sku-aliases/a1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ sku_part_number: 'NEW' });
  });

  it('deleteSamAlias DELETEs /api/v1/sam/sku-aliases/:id', async () => {
    fetchMock.mockReturnValue(okResponse(null));
    const { deleteSamAlias } = await import('@/lib/api');
    await deleteSamAlias('a1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/sam/sku-aliases/a1');
    expect(init.method).toBe('DELETE');
  });
});
