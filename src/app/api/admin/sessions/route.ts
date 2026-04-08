import { NextRequest, NextResponse } from 'next/server';
import { listSessions } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const email = request.nextUrl.searchParams.get('email') ?? undefined;
    const limitParam = request.nextUrl.searchParams.get('limit');
    const offsetParam = request.nextUrl.searchParams.get('offset');
    const limit = limitParam ? Math.min(200, Math.max(1, parseInt(limitParam, 10) || 50)) : undefined;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : undefined;
    const sessions = await listSessions({ email, limit, offset });

    const rows = sessions.map((s) => {
      const fs = s.final_score as unknown as Record<string, unknown>;
      const scores = (fs?.archetype_scores as Record<string, number>) ?? {};
      const stress = (fs?.stress_profile as Record<string, number>) ?? {};
      return {
        id: s.id,
        email: s.email,
        created_at: s.created_at,
        participant_code: s.participant_code ?? null,
        primary_type: fs?.primary_type ?? null,
        secondary_type: fs?.secondary_type ?? null,
        is_blended: fs?.is_blended ?? false,
        decoder: scores.decoder ?? null,
        signal: scores.signal ?? null,
        bridge: scores.bridge ?? null,
        heartbeat: scores.heartbeat ?? null,
        stress_profile: Object.keys(stress).length ? stress : null,
        pdf_url: s.pdf_url,
      };
    });

    return NextResponse.json(rows);
  } catch (e) {
    if (e instanceof Error && e.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.' },
        { status: 503 }
      );
    }
    console.error('Admin sessions list error:', e);
    const message =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Failed to load sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
