import { NextRequest, NextResponse } from 'next/server';
import { listSessions } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

function escapeCsvCell(value: string | number | boolean | null | undefined | unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const sessions = await listSessions({ email });

    const headers = [
      'id',
      'email',
      'created_at',
      'primary_type',
      'secondary_type',
      'is_blended',
      'decoder',
      'signal',
      'bridge',
      'heartbeat',
      'stress_profile',
      'pdf_url',
    ];

    const rows = sessions.map((s) => {
      const fs = s.final_score as unknown as Record<string, unknown>;
      const scores = (fs?.archetype_scores as Record<string, number>) ?? {};
      const stress = (fs?.stress_profile as Record<string, number>) ?? {};
      const stressStr = Object.keys(stress).length ? JSON.stringify(stress) : '';
      return [
        escapeCsvCell(s.id),
        escapeCsvCell(s.email),
        escapeCsvCell(s.created_at),
        escapeCsvCell(fs?.primary_type),
        escapeCsvCell(fs?.secondary_type),
        escapeCsvCell(fs?.is_blended),
        escapeCsvCell(scores.decoder),
        escapeCsvCell(scores.signal),
        escapeCsvCell(scores.bridge),
        escapeCsvCell(scores.heartbeat),
        escapeCsvCell(stressStr),
        escapeCsvCell(s.pdf_url),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = email
      ? `sessions-${email.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv`
      : `sessions-export-${Date.now()}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      const csv = 'id,email,created_at,primary_type,secondary_type,is_blended,decoder,signal,bridge,heartbeat,stress_profile,pdf_url\n';
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="sessions-export-empty.csv"',
        },
      });
    }
    console.error('Export CSV error:', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
