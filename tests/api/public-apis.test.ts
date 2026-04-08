/**
 * Public API tests: input validation and safe behavior.
 * - Upload: requires file and type (photo|resume); rejects invalid type.
 * - Chat-transition: accepts POST with questionText/userAnswer; no auth required; returns transition or null.
 * - Send-completion-email: requires valid email.
 */

import { NextRequest } from 'next/server';

// Mock storage so we don't hit Supabase in tests
jest.mock('@/lib/storage', () => ({
  uploadUserFile: jest.fn(() => Promise.resolve('https://example.com/uploaded.pdf')),
}));

// Mock DB for retry-report route (avoids loading Supabase client)
jest.mock('@/lib/db/sessions', () => ({
  getSessionById: jest.fn(),
  updateSessionPdfUrl: jest.fn(),
}));
jest.mock('@/lib/db/responses', () => ({
  getResponsesBySessionId: jest.fn(),
}));

describe('POST /api/upload', () => {
  it('returns 400 when file is missing', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const formData = new FormData();
    formData.set('type', 'resume');
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing|file|type/i);
  });

  it('returns 400 when type is missing', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const formData = new FormData();
    formData.set('file', new Blob(['x']), 'file.pdf');
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when type is not photo or resume', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const formData = new FormData();
    formData.set('file', new Blob(['x']), 'file.pdf');
    formData.set('type', 'invalid');
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/photo|resume/i);
  });

  it('returns 400 when resume file content is not PDF/DOC', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const formData = new FormData();
    formData.set('file', new Blob(['not a pdf']), 'resume.pdf');
    formData.set('type', 'resume');
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid|resume|PDF/i);
  });
});

describe('POST /api/chat-transition', () => {
  it('returns 200 with transition null when questionText is empty', async () => {
    const { POST } = await import('@/app/api/chat-transition/route');
    const req = new Request('http://localhost/api/chat-transition', {
      method: 'POST',
      body: JSON.stringify({ questionText: '', userAnswer: 'yes' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('transition');
    expect(data.transition).toBeNull();
  });

  it('returns 200 and accepts valid JSON body', async () => {
    const { POST } = await import('@/app/api/chat-transition/route');
    const req = new Request('http://localhost/api/chat-transition', {
      method: 'POST',
      body: JSON.stringify({ questionText: 'What is your name?', userAnswer: 'John' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('transition');
    // Without OPENAI_API_KEY, transition is null
    expect(typeof data.transition === 'string' || data.transition === null).toBe(true);
  });
});

describe('POST /api/submit/retry-report', () => {
  it('returns 400 when session_id is missing', async () => {
    const { POST } = await import('@/app/api/submit/retry-report/route');
    const req = new Request('http://localhost/api/submit/retry-report', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/session_id/i);
  });
});

describe('POST /api/send-completion-email', () => {
  it('returns 401 when not authenticated (admin-only)', async () => {
    const { POST } = await import('@/app/api/send-completion-email/route');
    const req = new NextRequest('http://localhost/api/send-completion-email', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', pdf_url: null }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
