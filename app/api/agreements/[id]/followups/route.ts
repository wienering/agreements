import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAgreementActivity } from '@/lib/activityLog';
import { formatDateToronto } from '@/lib/dates';
import {
  describeFollowupStatus,
  followupsDryRun,
  followupsLaunchDateKey,
  galleryEmailStatus,
  reviewRequestStatus,
  type FollowupAgreement,
} from '@/lib/followups/rules';
import { followupSelect } from '@/lib/followups/run';
import { handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    followUpsPaused: z.boolean().optional(),
    reviewReceived: z.boolean().optional(),
  })
  .refine((data) => data.followUpsPaused !== undefined || data.reviewReceived !== undefined, {
    message: 'Nothing to update',
  });

const formatDay = (d: Date | string) =>
  formatDateToronto(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, 'en-US');

async function followupState(id: string) {
  const record = await prisma.agreement.findUnique({ where: { id }, select: followupSelect });
  if (!record) return null;
  const now = new Date();
  const launchKey = followupsLaunchDateKey();
  const agreement = record as FollowupAgreement;
  const gallery = galleryEmailStatus(agreement, now, launchKey);
  const review = reviewRequestStatus(agreement, now, launchKey);
  return {
    followUpsPaused: record.followUpsPaused,
    reviewReceived: record.reviewReceived,
    galleryEmailSentAt: record.galleryEmailSentAt?.toISOString() ?? null,
    reviewRequestSentAt: record.reviewRequestSentAt?.toISOString() ?? null,
    gallery: { kind: gallery.kind, label: describeFollowupStatus(gallery, formatDay) },
    review: { kind: review.kind, label: describeFollowupStatus(review, formatDay) },
    launchDate: launchKey,
    dryRun: followupsDryRun(),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const state = await followupState(id);
    if (!state) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, 'agreements/[id]/followups', request.method);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const data = patchSchema.parse(await request.json());

    const current = await prisma.agreement.findUnique({
      where: { id },
      select: { followUpsPaused: true, reviewReceived: true },
    });
    if (!current) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });

    await prisma.agreement.update({ where: { id }, data });

    if (data.followUpsPaused !== undefined && data.followUpsPaused !== current.followUpsPaused) {
      await logAgreementActivity(id, data.followUpsPaused ? 'FOLLOWUPS_PAUSED' : 'FOLLOWUPS_RESUMED');
    }
    if (data.reviewReceived === true && !current.reviewReceived) {
      await logAgreementActivity(id, 'REVIEW_REQUEST_SKIPPED', { reason: 'Already reviewed' });
    }

    return NextResponse.json(await followupState(id));
  } catch (error) {
    return handleApiError(error, 'agreements/[id]/followups', request.method);
  }
}
