/**
 * API security tests: admin authentication and protected routes.
 * - requireAdmin returns 401 when no/wrong token; null when valid.
 * - Admin login rejects wrong password; accepts correct and sets cookie.
 * - Protected admin routes (sessions, export-csv) require valid admin_session cookie.
 */

import { NextRequest } from 'next/server';

// Control cookie value per test (mock reads this)
let mockCookieValue: string | undefined;
jest.mock('next/headers', () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      get: (name: string) => (name === 'admin_session' ? { value: mockCookieValue } : undefined),
    })
  ),
}));

// Avoid loading Supabase client when importing admin routes
jest.mock('@/lib/db', () => ({
  listSessions: jest.fn(() => Promise.resolve([])),
}));

describe('requireAdmin', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.ADMIN_SECRET = 'test-admin-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockCookieValue = undefined;
    jest.resetModules();
  });

  it('returns 401 when ADMIN_SECRET is not set', async () => {
    delete process.env.ADMIN_SECRET;
    const { requireAdmin } = await import('@/lib/admin-auth');
    mockCookieValue = 'test-admin-secret';
    const result = await requireAdmin();
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    const json = await result?.json();
    expect(json?.error).toMatch(/admin not configured/i);
    process.env.ADMIN_SECRET = 'test-admin-secret';
  });

  it('returns 401 when no admin_session cookie', async () => {
    mockCookieValue = undefined;
    const { requireAdmin } = await import('@/lib/admin-auth');
    const result = await requireAdmin();
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    const json = await result?.json();
    expect(json?.error).toBe('Unauthorized');
  });

  it('returns 401 when admin_session token does not match secret', async () => {
    mockCookieValue = 'wrong-token';
    const { requireAdmin } = await import('@/lib/admin-auth');
    const result = await requireAdmin();
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    const json = await result?.json();
    expect(json?.error).toBe('Unauthorized');
  });

  it('returns null when admin_session matches ADMIN_SECRET', async () => {
    mockCookieValue = 'test-admin-secret';
    const { requireAdmin } = await import('@/lib/admin-auth');
    const result = await requireAdmin();
    expect(result).toBeNull();
  });
});

describe('POST /api/admin/login', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.ADMIN_SECRET = 'test-admin-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 for wrong password', async () => {
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid password');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 401 for empty password', async () => {
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 and sets httpOnly cookie for correct password', async () => {
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'test-admin-secret' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('admin_session=');
    expect(setCookie?.toLowerCase()).toContain('httponly');
  });
});

describe('GET /api/admin/sessions (protected)', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.ADMIN_SECRET = 'test-admin-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 when not authenticated', async () => {
    mockCookieValue = undefined;
    const { GET } = await import('@/app/api/admin/sessions/route');
    const req = new NextRequest('http://localhost/api/admin/sessions');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is wrong', async () => {
    mockCookieValue = 'wrong';
    const { GET } = await import('@/app/api/admin/sessions/route');
    const req = new NextRequest('http://localhost/api/admin/sessions');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/export-csv (protected)', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.ADMIN_SECRET = 'test-admin-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 when not authenticated', async () => {
    mockCookieValue = undefined;
    const { GET } = await import('@/app/api/admin/export-csv/route');
    const req = new NextRequest('http://localhost/api/admin/export-csv');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
