import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/requireAdmin';
import { handleApiError } from '@/lib/handleApiError';
import { setLeadStatus } from '@/lib/leads/setStatus';
import { LOST_REASONS } from '@/lib/leads/status';

/**
 * Change a lead's status from the Leads page. Booked here is for leads booked some other way;
 * the Mark booked button (POST /book) is the normal path because it also creates the client and event.
 */
const schema = z.object({
  status: z.enum(['NEW', 'FOLLOWING_UP', 'BOOKED', 'LOST', 'PAUSED']),
  lostReason: z.enum(LOST_REASONS).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const result = await setLeadStatus({
      leadId: id,
      status: input.status,
      lostReason: input.lostReason ?? null,
      note: input.note ?? null,
      source: 'admin',
      syncSheet: true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && /not found/.test(error.message)) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return handleApiError(error, 'leads/status', request.method);
  }
}
