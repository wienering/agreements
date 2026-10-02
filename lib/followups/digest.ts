import { adminAgreementPath } from '@/lib/balanceActionToken';
import { formatEventDateToronto, resolveAgreementEventDate } from '@/lib/dates';
import { planFollowups, type FollowupAgreement } from '@/lib/followups/rules';

type DigestAgreement = FollowupAgreement & { client: { firstName: string; lastName: string } };

export type FollowupDigestItem = {
  clientName: string;
  label: string;
  adminUrl: string;
};

export type FollowupDigestSections = {
  /** Emails today's 10am run will send. */
  goingOut: FollowupDigestItem[];
  /** Galleries held because a balance is still owing. Listed every day until resolved. */
  held: FollowupDigestItem[];
};

function name(a: DigestAgreement): string {
  return `${a.client.firstName} ${a.client.lastName}`.trim() || 'Client';
}

function eventLabel(a: DigestAgreement): string {
  const date = resolveAgreementEventDate(a);
  return date ? formatEventDateToronto(date) : 'No event date';
}

/** The digest's follow-up sections, from the same rules the 10am run uses. */
export function buildFollowupDigestSections(
  agreements: DigestAgreement[],
  now: Date,
  launchKey: string,
  baseUrl: string,
): FollowupDigestSections {
  const plan = planFollowups(agreements, now, launchKey);
  const url = (id: string) => `${baseUrl}${adminAgreementPath(id)}`;
  const byName = (x: FollowupDigestItem, y: FollowupDigestItem) => x.clientName.localeCompare(y.clientName);

  const goingOut = [
    ...(plan.galleryEmails as DigestAgreement[]).map((a) => ({
      clientName: name(a),
      label: `Gallery email · event ${eventLabel(a)}`,
      adminUrl: url(a.id),
    })),
    ...(plan.reviewRequests as DigestAgreement[]).map((a) => ({
      clientName: name(a),
      label: 'Review request',
      adminUrl: url(a.id),
    })),
  ].sort(byName);

  const held = plan.held
    .map(({ agreement }) => {
      const a = agreement as DigestAgreement;
      return {
        clientName: name(a),
        label: `Payment: ${a.paymentStatus?.trim() || 'Not set'} · event ${eventLabel(a)}`,
        adminUrl: url(a.id),
      };
    })
    .sort(byName);

  return { goingOut, held };
}

export function hasFollowupDigestItems(sections: FollowupDigestSections): boolean {
  return sections.goingOut.length > 0 || sections.held.length > 0;
}
