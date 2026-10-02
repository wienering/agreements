import { prisma } from '@/lib/prisma';

/** Same relations the agreements list returns for each row. */
export const agreementListInclude = {
  client: true,
  template: true,
  event: true,
  backdropLink: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function findAgreementListItem(id: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: agreementListInclude,
  });

  if (!agreement) {
    return null;
  }

  const rows = await prisma.$queryRaw<Array<{ unreadNotesCount: number }>>`
    SELECT COUNT(cn.id)::int AS "unreadNotesCount"
    FROM "Agreement" a
    LEFT JOIN "ClientNote" cn
      ON cn."agreementId" = a.id
      AND (a."notesLastViewedAt" IS NULL OR cn."createdAt" > a."notesLastViewedAt")
    WHERE a.id = ${id}
    GROUP BY a.id
  `;

  return {
    ...agreement,
    unreadNotesCount: rows[0]?.unreadNotesCount ?? 0,
  };
}
