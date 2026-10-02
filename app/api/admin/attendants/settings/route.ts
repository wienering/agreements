import { NextRequest, NextResponse } from 'next/server';
import { loadConflictBuffers } from '@/lib/attendants/conflictQuery';
import { CONFLICT_BUFFERS_SETTINGS_KEY, conflictBuffersSchema } from '@/lib/attendants/conflictSettings';
import { handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ buffers: await loadConflictBuffers() });
  } catch (error) {
    return handleApiError(error, 'admin/attendants/settings', request.method);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const buffers = conflictBuffersSchema.parse(await request.json());
    await prisma.settings.upsert({
      where: { key: CONFLICT_BUFFERS_SETTINGS_KEY },
      update: { value: buffers },
      create: { key: CONFLICT_BUFFERS_SETTINGS_KEY, value: buffers },
    });
    return NextResponse.json({ buffers });
  } catch (error) {
    return handleApiError(error, 'admin/attendants/settings', request.method);
  }
}
