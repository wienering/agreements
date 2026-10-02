import { z } from 'zod';
import { isValidAttendantCuid } from '@/lib/attendantIdentity';

/** Optional text: trims, and stores empty as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || z.string().email().safeParse(value).success, {
    message: 'Invalid email address',
  });

export const createAttendantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  externalId: z
    .string()
    .trim()
    .refine(isValidAttendantCuid, 'Enter the attendant ID from the backdrop tool (it starts with "c" and is 25 characters)'),
  email: optionalEmail,
  phone: optionalText(40),
  notes: optionalText(2000),
  active: z.boolean().optional(),
});

/** The backdrop-tool ID can't change after creation: hub and backdrop links depend on it. */
export const updateAttendantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120).optional(),
  email: optionalEmail.optional(),
  phone: optionalText(40).optional(),
  notes: optionalText(2000).optional(),
  active: z.boolean().optional(),
});
