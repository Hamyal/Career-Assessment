/**
 * STEP 5 — Email automation (admin-only). Manual/fallback send of thank-you email.
 * Secured: requires admin authentication to prevent abuse.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { sendThankYouEmail } from '@/lib/send-thank-you-email';

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const userEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const pdfUrl = typeof body.pdf_url === 'string' ? body.pdf_url : null;

    if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const status = await sendThankYouEmail(userEmail, pdfUrl);

    if (status === 'sent') return NextResponse.json({ ok: true });
    if (status === 'skipped') return NextResponse.json({ ok: true, skipped: true });
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  } catch (e) {
    console.error('Send completion email error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
