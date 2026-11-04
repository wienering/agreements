import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { handleApiError } from '@/lib/handleApiError';
import { syncLeadStatusToSheet } from '@/lib/leads/sheetSync';

/** "Retry sync" on a lead whose Sheet update failed. Writes the current status to its Sheet row. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const result = await syncLeadStatusToSheet(id);
    return NextResponse.json({ ok: result !== 'failed', result });
  } catch (error) {
    return handleApiError(error, 'leads/sync-sheet', request.method);
  }
}
