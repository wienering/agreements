import { prisma } from '@/lib/prisma';
import { buildAttendantGroupSlug } from '@/app/components/attendant/groupSlug';

export async function uniqueAttendantGroupSlug(name: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = buildAttendantGroupSlug(name);
    const existing = await prisma.attendantGroup.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  throw new Error('Could not generate a unique attendant group slug');
}
