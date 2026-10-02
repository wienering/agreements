import { attendantIdFromBackdropUrl } from '@/lib/attendantIdentity';

export type BackfillLink = {
  id: string;
  name: string;
  url: string;
  attendantId: string | null;
};

export type BackfillAttendant = {
  id: string;
  name: string;
  externalId: string;
};

export type AttendantBackfillPlan = {
  /** Attendants to create, one per backdrop-tool ID that has none yet. */
  create: { externalId: string; name: string }[];
  /** Backdrop links to point at the attendant with this backdrop-tool ID. */
  link: { linkId: string; linkName: string; externalId: string }[];
  /** Links already pointing at the right attendant. */
  alreadyLinked: { linkId: string; linkName: string; externalId: string }[];
  /** Links that need a decision by hand; the backfill leaves them alone. */
  problems: { linkId: string; linkName: string; reason: string }[];
};

/**
 * Works out how to give every backdrop link an attendant record, keyed by the
 * backdrop-tool ID in its URL. Pure: safe to run as a dry run and to re-run.
 */
export function planAttendantBackfill(
  links: BackfillLink[],
  existing: BackfillAttendant[],
): AttendantBackfillPlan {
  const plan: AttendantBackfillPlan = { create: [], link: [], alreadyLinked: [], problems: [] };
  const byExternalId = new Map(existing.map((a) => [a.externalId, a]));
  const byId = new Map(existing.map((a) => [a.id, a]));

  const linksByExternalId = new Map<string, BackfillLink[]>();
  for (const link of links) {
    const externalId = attendantIdFromBackdropUrl(link.url);
    if (!externalId) {
      plan.problems.push({ linkId: link.id, linkName: link.name, reason: 'no attendant ID in the URL' });
      continue;
    }
    const group = linksByExternalId.get(externalId) ?? [];
    group.push(link);
    linksByExternalId.set(externalId, group);
  }

  for (const [externalId, group] of linksByExternalId) {
    const names = [...new Set(group.map((l) => l.name.trim()))];
    if (!byExternalId.has(externalId)) {
      if (names.length > 1) {
        for (const l of group) {
          plan.problems.push({
            linkId: l.id,
            linkName: l.name,
            reason: `shares attendant ID ${externalId} with differently named links (${names.join(', ')})`,
          });
        }
        continue;
      }
      plan.create.push({ externalId, name: names[0] });
    }

    for (const l of group) {
      const current = l.attendantId ? byId.get(l.attendantId) : undefined;
      if (current?.externalId === externalId) {
        plan.alreadyLinked.push({ linkId: l.id, linkName: l.name, externalId });
      } else if (l.attendantId && current && current.externalId !== externalId) {
        plan.problems.push({
          linkId: l.id,
          linkName: l.name,
          reason: `already linked to attendant "${current.name}" (${current.externalId}), but its URL has ${externalId}`,
        });
      } else {
        plan.link.push({ linkId: l.id, linkName: l.name, externalId });
      }
    }
  }

  return plan;
}
