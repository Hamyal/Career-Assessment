/**
 * Retry report generation for a session that was created but PDF/email failed.
 * Accepts session_id; regenerates narrative, PDF, upload, and sends email.
 * Rate limited per session to prevent abuse.
 */

import { NextResponse } from 'next/server';
import { getSessionById } from '@/lib/db/sessions';
import { getResponsesBySessionId } from '@/lib/db/responses';
import { updateSessionPdfUrl } from '@/lib/db/sessions';
import { getNarrativeForReport } from '@/lib/narrative';
import { generateReportPdf } from '@/lib/pdf/generate-report';
import { uploadReportPdf, getReportSignedUrl } from '@/lib/storage';
import { sendThankYouEmail } from '@/lib/send-thank-you-email';
import type { FinalScoringOutput } from '@/lib/schemas';

const MAX_RETRIES_PER_SESSION = 3;
const RETRY_WINDOW_MS = 10 * 60 * 1000; // 10 min
const retryCounts = new Map<string, { count: number; resetAt: number }>();

function checkRetryRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = retryCounts.get(sessionId);
  if (!entry || now > entry.resetAt) {
    retryCounts.set(sessionId, { count: 1, resetAt: now + RETRY_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_RETRIES_PER_SESSION) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : '';
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    if (!checkRetryRateLimit(sessionId)) {
      return NextResponse.json(
        { error: 'Too many retries for this session. Try again later.' },
        { status: 429 }
      );
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const responses = await getResponsesBySessionId(sessionId);
    if (!responses.length) {
      return NextResponse.json({ error: 'No responses found for this session' }, { status: 404 });
    }

    const finalScore = session.final_score as unknown as FinalScoringOutput;
    const narrative = await getNarrativeForReport(finalScore);
    const participantName = responses.find((r) => r.question_id === 1)?.custom_text?.trim() || null;
    const pdfBytes = await generateReportPdf(finalScore, narrative, { participantName });
    const pdfUrl = await uploadReportPdf(session.id, pdfBytes);
    await updateSessionPdfUrl(session.id, pdfUrl);

    const reportLinkUrl = await getReportSignedUrl(session.id);
    const emailStatus = await sendThankYouEmail(session.email, reportLinkUrl);

    return NextResponse.json({
      pdf_url: reportLinkUrl,
      email_status: emailStatus,
    });
  } catch (err) {
    console.error('Retry report error:', err);
    const message = err instanceof Error ? err.message : 'Retry failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
