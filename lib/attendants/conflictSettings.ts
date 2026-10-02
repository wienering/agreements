import { z } from 'zod';

/** Settings table key for the double-booking buffers. */
export const CONFLICT_BUFFERS_SETTINGS_KEY = 'attendantConflictBuffers';

export type ConflictBuffers = {
  /** Time before the start the attendant needs on site. */
  setupMinutes: number;
  /** Time after the end the attendant needs to pack up. */
  teardownMinutes: number;
  /** Minimum gap between one job's pack-up and the next job's setup. */
  travelMinutes: number;
};

export const DEFAULT_CONFLICT_BUFFERS: ConflictBuffers = {
  setupMinutes: 60,
  teardownMinutes: 30,
  travelMinutes: 60,
};

const minutes = z.number().int().min(0).max(600);

export const conflictBuffersSchema = z.object({
  setupMinutes: minutes,
  teardownMinutes: minutes,
  travelMinutes: minutes,
});

/** Stored settings value to buffers. Anything missing or invalid falls back to the default. */
export function parseConflictBuffers(value: unknown): ConflictBuffers {
  const stored = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const pick = (key: keyof ConflictBuffers) => {
    const parsed = minutes.safeParse(stored[key]);
    return parsed.success ? parsed.data : DEFAULT_CONFLICT_BUFFERS[key];
  };
  return {
    setupMinutes: pick('setupMinutes'),
    teardownMinutes: pick('teardownMinutes'),
    travelMinutes: pick('travelMinutes'),
  };
}
