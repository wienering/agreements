import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { handleApiError } from '@/lib/handleApiError';

/** A lead's timeline (GET) and adding a note or a logged call (POST). */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { occurredAt: 'desc' },
      take: 200,
      select: { id: true, kind: true, touchNumber: true, summary: true, source: true, occurredAt: true },
    });
    return NextResponse.json({ activities });
  } catch (error) {
    return handleApiError(error, 'leads/activity', request.method);
  }
}

const noteSchema = z.object({
  kind: z.enum(['NOTE', 'CALL']).default('NOTE'),
  summary: z.string().trim().min(1, 'Write something first').max(4000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const input = noteSchema.parse(await request.json());
    const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const now = new Date();
    const [activity] = await prisma.$transaction([
      prisma.leadActivity.create({
        data: { leadId: id, kind: input.kind, summary: input.summary, source: 'admin', occurredAt: now },
        select: { id: true, kind: true, touchNumber: true, summary: true, source: true, occurredAt: true },
      }),
      ...(input.kind === 'CALL'
        ? [prisma.lead.update({ where: { id }, data: { lastContactedAt: now } })]
        : []),
    ]);
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'leads/activity', request.method);
  }
}
