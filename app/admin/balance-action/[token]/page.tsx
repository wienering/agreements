import type { ReactNode } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { BalanceActionForm } from './BalanceActionForm';
import { balanceActionRefusal } from '@/lib/balanceAction';
import { adminAgreementPath, verifyBalanceActionToken } from '@/lib/balanceActionToken';
import { formatEventDateToronto, resolveAgreementEventDate } from '@/lib/dates';
import { authOptions } from '@/lib/auth';
import { getEmailGreeting } from '@/lib/email/greeting';
import { prisma } from '@/lib/prisma';
import { buildBalanceReminderDraft } from '@/lib/balanceReminderMessage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Balance action | Photobooth Guys',
};

function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-xl px-5 py-10 text-admin-text">{children}</main>;
}

export default async function BalanceActionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const payload = verifyBalanceActionToken(token);
  if (!payload) {
    return (
      <Shell>
        <h1 className="m-0 text-2xl font-semibold">This link is invalid or has expired.</h1>
        <p className="mt-4 mb-0 text-admin-muted">Nothing was changed.</p>
      </Shell>
    );
  }

  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.user?.email?.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!isAdmin) {
    return (
      <Shell>
        <h1 className="m-0 text-2xl font-semibold">Sign in as the admin to use this link.</h1>
        <p className="mt-4 mb-0 text-admin-muted">Nothing was changed.</p>
      </Shell>
    );
  }

  const agreement = await prisma.agreement.findUnique({
    where: { id: payload.agreementId },
    select: {
      id: true,
      status: true,
      archived: true,
      cancelledAt: true,
      paymentStatus: true,
      stripePaymentLink: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          emailGreetingName: true,
          eventDate: true,
        },
      },
      event: {
        select: {
          eventDate: true,
        },
      },
    },
  });

  if (!agreement) {
    return (
      <Shell>
        <h1 className="m-0 text-2xl font-semibold">This agreement could not be found.</h1>
        <p className="mt-4 mb-0 text-admin-muted">Nothing was changed.</p>
      </Shell>
    );
  }

  const clientName = `${agreement.client.firstName} ${agreement.client.lastName}`.trim() || 'Client';
  const eventDate = resolveAgreementEventDate(agreement);
  const eventLabel = eventDate ? formatEventDateToronto(eventDate) : 'No event date';
  const adminHref = adminAgreementPath(agreement.id);
  const refusal = balanceActionRefusal(agreement);

  if (refusal) {
    return (
      <Shell>
        <h1 className="m-0 text-2xl font-semibold">{refusal}</h1>
        <p className="mt-3 mb-0 text-admin-text">{clientName}</p>
        <p className="mt-1 mb-0 text-admin-muted">{eventLabel}</p>
        <p className="mt-4 mb-0">
          <Link href={adminHref} className="text-accent">
            Back to the agreement
          </Link>
        </p>
      </Shell>
    );
  }

  const draft =
    payload.action === 'remind'
      ? buildBalanceReminderDraft({
          firstName: getEmailGreeting(agreement.client),
          eventDate,
          stripePaymentLink: agreement.stripePaymentLink,
        })
      : { subject: '', message: '' };

  return (
    <Shell>
      <BalanceActionForm
        token={token}
        action={payload.action}
        agreementId={agreement.id}
        clientName={clientName}
        eventLabel={eventLabel}
        defaultSubject={draft.subject}
        defaultMessage={draft.message}
      />
    </Shell>
  );
}
