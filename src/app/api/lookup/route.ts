import { NextResponse } from 'next/server';
import { getSessionByParticipantCode } from '@/lib/db/sessions';
import { getReportSignedUrl } from '@/lib/storage';

/** Mask email for display (e.g. j***@example.com) */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (!local || local.length <= 2) return '***@' + domain;
  return local[0] + '***@' + domain;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code || !code.trim()) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const session = await getSessionByParticipantCode(code.trim());
  if (!session) {
    return NextResponse.json({ error: 'No report found for this code' }, { status: 404 });
  }

  const pdfUrl = await getReportSignedUrl(session.id);

  return NextResponse.json({
    participant_code: session.participant_code,
    pdf_url: pdfUrl,
    email_masked: maskEmail(session.email),
    chat_messages: session.chat_messages ?? null,
    created_at: session.created_at,
  });
}
